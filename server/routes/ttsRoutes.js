const express = require('express');
const router = express.Router();
const path = require('fs');
const fs = require('fs');
const nodePath = require('path');
const { AUDIO_DIR, DEFAULT_MODEL, DEFAULT_PROVIDER } = require('../config');
const {
  parseSceneToSingleSpeakerSegments,
  generateSpeakerProfilesWithLLM
} = require('../services/ttsService');
const {
  pollSingleTtsTask,
  downloadAudioFile,
  stitchMp3Files
} = require('../utils/audioStitcher');
const {
  ensureStoryDirectories,
  loadStoryFromDisk,
  saveStoryToDisk
} = require('../services/storageService');

/**
 * AI Generation of Speaker / Character Audio Profiles using the Text-to-Text Model (Ollama)
 */
router.post('/api/generate-speaker-profiles', async (req, res) => {
  const {
    title = 'Untitled Story',
    prompt = '',
    scenes = [],
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER
  } = req.body;

  try {
    const sanitizedSpeakers = await generateSpeakerProfilesWithLLM({
      title,
      prompt,
      scenes,
      model,
      provider
    });

    res.json({
      success: true,
      speakers: sanitizedSpeakers
    });
  } catch (error) {
    console.error('[API ERROR] Failed to generate speaker profiles:', error);
    res.status(500).json({ error: error.message || 'Failed to generate speaker profiles' });
  }
});

/**
 * Preview / parse scene into individual 1-speaker line segments
 */
router.post('/api/tts/parse-scene', (req, res) => {
  try {
    const { sceneContent, customSpeakers = [], sceneContext = {} } = req.body;
    const segments = parseSceneToSingleSpeakerSegments(sceneContent, customSpeakers, sceneContext);

    // Collect distinct speakers used
    const distinctSpeakers = [...new Set(segments.map(s => s.speakerName))];

    res.json({
      success: true,
      totalSegments: segments.length,
      distinctSpeakers,
      segments: segments.map(s => ({
        segmentIndex: s.segmentIndex,
        speakerName: s.speakerName,
        voiceName: s.speakerConfig.voice_name,
        accent: s.speakerConfig.accent,
        style: s.speakerConfig.style,
        text: s.text,
        payload: s.taskPayload
      }))
    });
  } catch (error) {
    console.error('TTS Parse error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse TTS payload' });
  }
});

/**
 * Sequential line-by-line TTS generation and multi-speaker stitching pipeline
 * Streams live SSE progress for every single line of dialogue generated.
 */
router.post('/api/tts/generate-scene-audio', async (req, res) => {
  const {
    apiKey,
    storyId,
    sceneNumber = 1,
    sceneContent,
    customSpeakers = [],
    sceneContext = {},
    temperature = 1
  } = req.body;

  const resolvedApiKey = apiKey || process.env.KIE_API_KEY;
  if (!resolvedApiKey) {
    return res.status(401).json({ error: 'API Key is required. Please provide your api.kie.ai Bearer API Key.' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendSSE = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    const segments = parseSceneToSingleSpeakerSegments(sceneContent, customSpeakers, sceneContext);
    console.log(`\n================ [MULTI-SPEAKER TTS PIPELINE: SCENE ${sceneNumber}] ================`);
    console.log(`Total Dialog/Narrator Lines: ${segments.length}`);
    sendSSE({ type: 'start', totalSegments: segments.length, sceneNumber });

    const tempChunkFiles = [];
    const segmentAudioUrls = [];

    // Process each line of dialog one by one with its 1-speaker prompt
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      seg.taskPayload.input.temperature = Math.max(0, Math.min(2, Number(temperature) || 1));

      console.log(`\n[TTS Line ${i + 1}/${segments.length}] Speaker: ${seg.speakerName} (${seg.speakerConfig.voice_name}) -> "${seg.text.slice(0, 60)}..."`);
      sendSSE({
        type: 'line_start',
        current: i + 1,
        total: segments.length,
        speakerName: seg.speakerName,
        voiceName: seg.speakerConfig.voice_name,
        text: seg.text
      });

      // 1. Submit single-speaker task to api.kie.ai
      const createTaskResp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolvedApiKey}`
        },
        body: JSON.stringify(seg.taskPayload)
      });

      const taskData = await createTaskResp.json();
      if (!createTaskResp.ok || (taskData.code && taskData.code !== 200)) {
        console.error(`[TTS CREATE TASK ERROR Line ${i + 1}]:`, taskData);
        throw new Error(`api.kie.ai createTask error for line ${i + 1}: ${taskData.msg || 'Failed to dispatch task'}`);
      }

      const taskId = taskData.data?.taskId;
      const recordId = taskData.data?.recordId;

      // 2. Poll until this line's audio is ready
      const pollResult = await pollSingleTtsTask(taskId, resolvedApiKey, recordId);
      if (!pollResult.success || !pollResult.audioUrl) {
        throw new Error(`Line ${i + 1} generation failed: ${pollResult.error}`);
      }

      // 3. Download the chunk MP3
      const chunkPath = nodePath.join(AUDIO_DIR, `temp_scene_${sceneNumber}_seg_${i}_${Date.now()}.mp3`);
      await downloadAudioFile(pollResult.audioUrl, chunkPath);
      tempChunkFiles.push(chunkPath);
      segmentAudioUrls.push({ lineIndex: i + 1, speaker: seg.speakerName, url: pollResult.audioUrl });

      sendSSE({
        type: 'line_complete',
        current: i + 1,
        total: segments.length,
        speakerName: seg.speakerName,
        audioUrl: pollResult.audioUrl
      });
    }

    // 4. Stitch all audio segments together into a single unified scene MP3
    console.log(`\n[TTS STITCHING] Stitching ${tempChunkFiles.length} MP3 segments for Scene ${sceneNumber}...`);
    sendSSE({ type: 'stitching', totalSegments: segments.length });

    const finalMp3Filename = `scene_${sceneNumber}_complete_${Date.now()}.mp3`;
    const finalMp3Path = nodePath.join(AUDIO_DIR, finalMp3Filename);

    await stitchMp3Files(tempChunkFiles, finalMp3Path);

    // Clean up temp chunks
    for (const f of tempChunkFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    const publicAudioUrl = `/audio/${finalMp3Filename}`;

    // If storyId is present, also copy audio to story audio/ folder and update story state
    if (storyId) {
      try {
        const storyPaths = ensureStoryDirectories(storyId);
        const storyAudioPath = nodePath.join(storyPaths.audioDir, `scene_${sceneNumber}.mp3`);
        fs.copyFileSync(finalMp3Path, storyAudioPath);

        const storyData = loadStoryFromDisk(storyId);
        if (storyData && storyData.scenes) {
          const sc = storyData.scenes.find(s => s.sceneNumber === parseInt(sceneNumber, 10));
          if (sc) {
            sc.audioUrl = `/data/stories/${storyId}/audio/scene_${sceneNumber}.mp3`;
            saveStoryToDisk(storyData);
          }
        }
      } catch (e) {
        console.warn('[TTS Audio Copy Warning]:', e.message);
      }
    }

    console.log(`[TTS COMPLETE] Scene ${sceneNumber} multi-speaker audio stitched: ${publicAudioUrl}\n`);

    sendSSE({
      type: 'complete',
      sceneNumber,
      audioUrl: publicAudioUrl,
      totalSegments: segments.length,
      segments: segmentAudioUrls
    });

    res.end();
  } catch (error) {
    console.error(`[TTS PIPELINE ERROR] Scene ${sceneNumber}:`, error.message);
    sendSSE({ type: 'error', error: error.message });
    res.end();
  }
});

/**
 * Push story scene to google/gemini-3-1-flash-tts (api.kie.ai createTask)
 */
router.post('/api/tts/create-task', async (req, res) => {
  const {
    apiKey,
    sceneContent,
    customSpeakers = [],
    sceneContext = {},
    callBackUrl,
    temperature = 1
  } = req.body;

  const resolvedApiKey = apiKey || process.env.KIE_API_KEY;
  if (!resolvedApiKey) {
    console.error('[TTS ERROR] API Key missing for /api/tts/create-task');
    return res.status(401).json({
      error: 'API Key is required. Please provide your api.kie.ai Bearer API Key.'
    });
  }

  try {
    const segments = parseSceneToSingleSpeakerSegments(sceneContent, customSpeakers, sceneContext);
    const firstPayload = segments[0]?.taskPayload || {
      model: 'google/gemini-3-1-flash-tts',
      input: {
        temperature: 1,
        scene: sceneContext.setting || 'Scene',
        sample_context: 'Audiobook narration',
        speakers: [{ speaker_id: 'Speaker 1', voice_name: 'Zephyr', audio_profile: 'Narrator', accent: 'British (RP)', style: 'Empathetic', pace: 'Natural' }],
        dialogue_turns: [{ speaker_id: 'Speaker 1', text: sceneContent || 'Speech' }]
      }
    };

    firstPayload.input.temperature = Math.max(0, Math.min(2, Number(temperature) || 1));
    if (callBackUrl) firstPayload.callBackUrl = callBackUrl;

    console.log(`\n================ [KIE.AI TTS TASK CREATION] ================`);
    console.log(`Single-speaker Payload Dispatched: Speaker 1 (${firstPayload.input.speakers[0].voice_name})`);

    const kieResp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedApiKey}`
      },
      body: JSON.stringify(firstPayload)
    });

    const kieData = await kieResp.json();

    if (!kieResp.ok || (kieData.code && kieData.code !== 200)) {
      console.error('[TTS API ERROR] api.kie.ai createTask response:', kieData);
      return res.status(kieResp.status || 400).json({
        error: kieData.msg || 'TTS task creation failed on api.kie.ai',
        details: kieData
      });
    }

    console.log(`[TTS TASK SUCCESS] Task ID created: ${kieData.data?.taskId}`);

    res.json({
      success: true,
      taskId: kieData.data?.taskId,
      recordId: kieData.data?.recordId,
      code: kieData.code,
      msg: kieData.msg,
      payloadSummary: {
        turnCount: firstPayload.input.dialogue_turns.length,
        speakers: firstPayload.input.speakers
      }
    });
  } catch (error) {
    console.error('[TTS API ERROR] Exception creating TTS task:', error);
    res.status(500).json({ error: error.message || 'Failed to communicate with TTS endpoint' });
  }
});

/**
 * Query TTS task detail & get audio URLs from api.kie.ai
 */
router.get('/api/tts/task-detail/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const apiKey = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.apiKey || process.env.KIE_API_KEY;

  if (!apiKey) {
    console.error('[TTS ERROR] API Key missing for /api/tts/task-detail');
    return res.status(401).json({ error: 'Authorization Bearer token or apiKey is required.' });
  }

  try {
    const resp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await resp.json();
    if (!resp.ok || (data.code && data.code !== 200)) {
      console.error(`[TTS API ERROR] Polling Task ${taskId}:`, data);
    }
    res.json(data);
  } catch (error) {
    console.error(`[TTS API ERROR] Exception polling task ${taskId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to query task status' });
  }
});

module.exports = router;
