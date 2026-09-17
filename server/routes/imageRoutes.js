const express = require('express');
const router = express.Router();
const path = require('path');
const {
  buildDefaultSceneImagePrompt,
  pollSingleImageTask,
  downloadImageFile,
  generateSingleSceneImage
} = require('../services/imageService');
const {
  loadStoryFromDisk,
  saveStoryToDisk,
  ensureStoryDirectories
} = require('../services/storageService');

/**
 * Generate a Seedream 5.0 Pro Image for a single chapter / scene
 */
router.post(['/api/image/generate-chapter-image', '/api/image/generate-scene-image'], async (req, res) => {
  const {
    apiKey,
    storyId,
    chapterNumber,
    sceneNumber,
    prompt,
    aspectRatio = '16:9',
    quality = 'basic',
    outputFormat = 'png'
  } = req.body;

  try {
    const result = await generateSingleSceneImage({
      apiKey,
      storyId,
      chapterNumber: chapterNumber || sceneNumber,
      sceneNumber: chapterNumber || sceneNumber,
      prompt,
      aspectRatio,
      quality,
      outputFormat
    });
    res.json(result);
  } catch (error) {
    console.error(`[Seedream 5.0 ERROR] Chapter ${chapterNumber || sceneNumber}:`, error);
    res.status(error.status || 500).json({
      error: error.message || 'Image generation error',
      details: error.details
    });
  }
});

/**
 * Generate images for all chapters in a story sequentially with SSE streaming progress
 */
router.post('/api/image/generate-all-stream', async (req, res) => {
  const {
    apiKey,
    storyId,
    aspectRatio = '16:9',
    quality = 'basic',
    outputFormat = 'png'
  } = req.body;

  const resolvedApiKey = apiKey || process.env.KIE_API_KEY;
  if (!resolvedApiKey) {
    return res.status(401).json({ error: 'API Key is required. Please provide your api.kie.ai Bearer API Key.' });
  }

  const activeStoryId = storyId;
  const storyData = loadStoryFromDisk(activeStoryId);
  const chaptersList = storyData?.chapters?.length > 0 ? storyData.chapters : (storyData?.scenes || []);
  if (!storyData || chaptersList.length === 0) {
    return res.status(404).json({ error: 'No chapters found for this story ID.' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendSSE = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const totalChapters = chaptersList.length;
  sendSSE({ type: 'start', totalScenes: totalChapters, totalChapters, storyId: activeStoryId });

  const paths = ensureStoryDirectories(activeStoryId);
  let completedCount = 0;

  for (let i = 0; i < totalChapters; i++) {
    const sc = chaptersList[i];
    const num = sc.chapterNumber || sc.sceneNumber || (i + 1);
    const finalPrompt = sc.imagePrompt || buildDefaultSceneImagePrompt(sc, storyData.title, storyData.prompt);

    sendSSE({
      type: 'scene_start',
      current: i + 1,
      total: totalChapters,
      sceneNumber: num,
      chapterNumber: num,
      title: sc.title,
      prompt: finalPrompt
    });

    try {
      const taskPayload = {
        model: 'seedream/5-pro-text-to-image',
        input: {
          prompt: finalPrompt,
          aspect_ratio: aspectRatio,
          quality: quality,
          output_format: outputFormat === 'jpeg' ? 'jpeg' : 'png',
          nsfw_checker: false
        }
      };

      const createTaskResp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolvedApiKey}`
        },
        body: JSON.stringify(taskPayload)
      });

      const taskData = await createTaskResp.json();
      if (!createTaskResp.ok || (taskData.code && taskData.code !== 200)) {
        throw new Error(taskData.msg || 'Failed to dispatch image task');
      }

      const taskId = taskData.data?.taskId;
      const recordId = taskData.data?.recordId;

      const pollResult = await pollSingleImageTask(taskId, resolvedApiKey, recordId);
      if (!pollResult.success || !pollResult.imageUrl) {
        throw new Error(pollResult.error || 'Image polling failed');
      }

      const ext = outputFormat === 'jpeg' ? 'jpg' : 'png';
      const filename = `chapter_${num}.${ext}`;
      const localDestPath = path.join(paths.imagesDir, filename);

      await downloadImageFile(pollResult.imageUrl, localDestPath);

      try {
        fs.copyFileSync(localDestPath, path.join(paths.imagesDir, `scene_${num}.${ext}`));
      } catch (e) {}

      const relativeWebUrl = `/data/stories/${activeStoryId}/images/${filename}`;
      sc.imageUrl = relativeWebUrl;
      sc.imagePrompt = finalPrompt;

      // Save progressive updates to story
      saveStoryToDisk(storyData);
      completedCount++;

      sendSSE({
        type: 'scene_complete',
        current: i + 1,
        total: totalChapters,
        sceneNumber: num,
        chapterNumber: num,
        imageUrl: relativeWebUrl
      });
    } catch (err) {
      console.error(`[Seedream 5.0 Batch Error] Chapter ${num}:`, err.message);
      sendSSE({
        type: 'scene_error',
        current: i + 1,
        total: totalChapters,
        sceneNumber: num,
        chapterNumber: num,
        error: err.message
      });
    }
  }

  sendSSE({
    type: 'finish',
    totalScenes: totalChapters,
    totalChapters,
    completedCount,
    storyId: activeStoryId
  });

  res.end();
});

/**
 * Generate smart cinematic prompt for Seedream 5.0
 */
router.post('/api/image/build-prompt', async (req, res) => {
  const { scene, storyTitle, storyPrompt } = req.body;
  if (!scene) {
    return res.status(400).json({ error: 'Scene / Chapter object is required.' });
  }

  const prompt = buildDefaultSceneImagePrompt(scene, storyTitle, storyPrompt);
  res.json({ prompt });
});

module.exports = router;
