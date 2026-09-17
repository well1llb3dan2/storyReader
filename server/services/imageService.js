const fs = require('fs');
const path = require('path');
const { ensureStoryDirectories, loadStoryFromDisk, saveStoryToDisk } = require('./storageService');

/**
 * Build cinematic visual prompt for Seedream 5.0 Pro from chapter outline
 */
function buildDefaultSceneImagePrompt(scene, storyTitle = '', storyPrompt = '') {
  if (scene.imagePrompt && scene.imagePrompt.trim()) {
    return scene.imagePrompt;
  }
  const chars = Array.isArray(scene.characters) ? scene.characters.join(', ') : (scene.characters || 'Main character');
  const actionSummary = scene.summary || 'Engaged in pivotal narrative action';
  const settingLoc = scene.setting || 'Dramatic environment';
  const moodTone = scene.mood || 'Dramatic, atmospheric';

  return `Subject: ${chars} in "${scene.title || 'Chapter'}" from "${storyTitle || 'Novel'}". ${actionSummary}. Setting: ${settingLoc}. Arrangement: Cinematic medium composition with dynamic framing. Camera and Light: 35mm lens, atmospheric volumetric lighting matching ${moodTone} mood. Palette and Style: Cinematic film still, hyper-photorealistic RAW 8K, Kodak Portra 400 analog film texture, rich environmental details.`;
}

/**
 * Poll a single Image generation taskId on api.kie.ai until complete
 */
async function pollSingleImageTask(taskId, apiKey, recordId = null, maxWaitSec = 300) {
  const start = Date.now();
  let pollCount = 0;

  console.log(`[Seedream 5.0 Polling] Task ID: ${taskId}${recordId ? ` | Record ID: ${recordId}` : ''}`);

  while (Date.now() - start < maxWaitSec * 1000) {
    await new Promise(r => setTimeout(r, 2500));
    pollCount++;

    try {
      let queryUrl = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
      let resp = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if ((!resp.ok || resp.status === 404) && recordId) {
        queryUrl = `https://api.kie.ai/api/v1/jobs/recordInfo?recordId=${encodeURIComponent(recordId)}`;
        resp = await fetch(queryUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
      }

      const data = await resp.json();
      const taskData = data.data || data;
      const stateStr = String(taskData.state || taskData.status || data.msg || '').toLowerCase();

      // Extract image URL
      let imageUrl = null;
      if (taskData.resultJson) {
        try {
          const parsed = typeof taskData.resultJson === 'string' ? JSON.parse(taskData.resultJson) : taskData.resultJson;
          if (Array.isArray(parsed?.resultUrls) && parsed.resultUrls[0]) imageUrl = parsed.resultUrls[0];
          else if (typeof parsed?.resultUrl === 'string') imageUrl = parsed.resultUrl;
          else if (typeof parsed?.url === 'string') imageUrl = parsed.url;
        } catch (e) {}
      }
      if (!imageUrl && Array.isArray(taskData.resultUrls) && taskData.resultUrls[0]) {
        imageUrl = taskData.resultUrls[0];
      }
      if (!imageUrl && typeof taskData.resultUrl === 'string') {
        imageUrl = taskData.resultUrl;
      }
      if (!imageUrl && typeof taskData.url === 'string') {
        imageUrl = taskData.url;
      }

      console.log(`[Seedream 5.0 Poll #${pollCount} (${((Date.now() - start) / 1000).toFixed(1)}s)] Task: ${taskId} | State: ${stateStr || 'pending'} | Image Ready: ${Boolean(imageUrl)}`);

      if (imageUrl || stateStr === 'success' || stateStr === 'completed' || stateStr === 'finished' || stateStr === 'done') {
        if (imageUrl) {
          console.log(`[Seedream 5.0 SUCCESS] Task ${taskId} -> Image URL: ${imageUrl}`);
          return { success: true, imageUrl };
        }
      }

      if (stateStr === 'fail' || stateStr === 'failed' || stateStr === 'error' || taskData.failCode) {
        const errorMsg = taskData.failMsg || taskData.failCode || data.msg || 'Image generation failed on api.kie.ai';
        console.error(`[Seedream 5.0 FAILED] Task ${taskId}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (e) {
      console.warn(`[Seedream 5.0 Poll Warning] #${pollCount} for Task ${taskId}:`, e.message);
    }
  }

  console.error(`[Seedream 5.0 TIMEOUT] Task ${taskId} exceeded ${maxWaitSec}s timeout.`);
  return { success: false, error: `Task timed out waiting for image generation (${maxWaitSec}s)` };
}

/**
 * Download an Image from URL and save to a local file
 */
async function downloadImageFile(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download image from ${url} (HTTP ${resp.status})`);
  const arrayBuffer = await resp.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * Generate a single chapter image with Seedream 5.0 Pro
 */
async function generateSingleSceneImage({
  apiKey,
  storyId,
  chapterNumber,
  sceneNumber,
  prompt,
  aspectRatio = '16:9',
  quality = 'basic',
  outputFormat = 'png'
}) {
  const resolvedApiKey = apiKey || process.env.KIE_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('API Key is required. Please provide your api.kie.ai Bearer API Key.');
  }

  const num = parseInt(chapterNumber || sceneNumber, 10);
  if (!num) {
    throw new Error('A valid chapterNumber is required.');
  }

  const activeStoryId = storyId || `story_${Date.now()}`;
  let storyData = loadStoryFromDisk(activeStoryId);
  if (!storyData) {
    storyData = {
      id: activeStoryId,
      title: 'Untitled Novel',
      prompt: '',
      chapters: [],
      scenes: []
    };
  }

  if (!storyData.chapters) storyData.chapters = storyData.scenes || [];
  if (!storyData.scenes) storyData.scenes = storyData.chapters || [];

  let sceneObj = (storyData.chapters || []).find(s => (s.chapterNumber === num || s.sceneNumber === num))
    || (storyData.scenes || []).find(s => (s.chapterNumber === num || s.sceneNumber === num));

  if (!sceneObj) {
    sceneObj = {
      chapterNumber: num,
      sceneNumber: num,
      title: `Chapter ${num}`,
      setting: 'Key Location',
      characters: ['Main Characters'],
      summary: 'Chapter visualization',
      mood: 'Dramatic'
    };
    storyData.chapters.push(sceneObj);
    storyData.scenes.push(sceneObj);
  }

  const finalPrompt = (prompt && prompt.trim()) || buildDefaultSceneImagePrompt(sceneObj, storyData.title, storyData.prompt);
  const paths = ensureStoryDirectories(activeStoryId);

  console.log(`\n================ [SEEDREAM 5.0 PRO: CHAPTER ${num} IMAGE GENERATION] ================`);
  console.log(`Story ID: ${activeStoryId} | Aspect Ratio: ${aspectRatio} | Quality: ${quality}`);
  console.log(`Prompt: "${finalPrompt}"`);

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

  // 1. Submit task to api.kie.ai
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
    console.error('[Seedream 5.0 CREATE ERROR]:', taskData);
    const err = new Error(taskData.msg || 'Image task creation failed on api.kie.ai');
    err.status = createTaskResp.status || 400;
    err.details = taskData;
    throw err;
  }

  const taskId = taskData.data?.taskId;
  const recordId = taskData.data?.recordId;
  console.log(`[Seedream 5.0 Task Dispatched] Task ID: ${taskId}`);

  // 2. Poll until image is ready
  const pollResult = await pollSingleImageTask(taskId, resolvedApiKey, recordId);
  if (!pollResult.success || !pollResult.imageUrl) {
    const err = new Error(pollResult.error || 'Image generation failed during polling.');
    err.status = 502;
    throw err;
  }

  // 3. Download image to story's images/ sub-folder
  const ext = outputFormat === 'jpeg' ? 'jpg' : 'png';
  const filename = `chapter_${num}.${ext}`;
  const localDestPath = path.join(paths.imagesDir, filename);

  await downloadImageFile(pollResult.imageUrl, localDestPath);

  // Maintain backward-compatible scene_X file copy
  try {
    fs.copyFileSync(localDestPath, path.join(paths.imagesDir, `scene_${num}.${ext}`));
  } catch (e) {}

  // Save image metadata
  const metaPath = path.join(paths.imagesDir, `chapter_${num}_meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify({
    chapterNumber: num,
    sceneNumber: num,
    prompt: finalPrompt,
    aspectRatio,
    quality,
    outputFormat: ext,
    taskId,
    recordId,
    remoteUrl: pollResult.imageUrl,
    createdAt: new Date().toISOString()
  }, null, 2), 'utf8');

  // 4. Update story model & persist to disk
  const relativeWebUrl = `/data/stories/${activeStoryId}/images/${filename}`;
  sceneObj.imageUrl = relativeWebUrl;
  sceneObj.imagePrompt = finalPrompt;

  (storyData.chapters || []).forEach(ch => {
    if (ch.chapterNumber === num || ch.sceneNumber === num) {
      ch.imageUrl = relativeWebUrl;
      ch.imagePrompt = finalPrompt;
    }
  });
  (storyData.scenes || []).forEach(sc => {
    if (sc.chapterNumber === num || sc.sceneNumber === num) {
      sc.imageUrl = relativeWebUrl;
      sc.imagePrompt = finalPrompt;
    }
  });

  saveStoryToDisk(storyData);

  console.log(`[Seedream 5.0 SUCCESS] Chapter ${num} image saved to: ${localDestPath}`);
  console.log(`Web URL: ${relativeWebUrl}\n`);

  return {
    success: true,
    storyId: activeStoryId,
    chapterNumber: num,
    sceneNumber: num,
    imageUrl: relativeWebUrl,
    remoteUrl: pollResult.imageUrl,
    prompt: finalPrompt,
    taskId
  };
}

module.exports = {
  buildDefaultSceneImagePrompt,
  pollSingleImageTask,
  downloadImageFile,
  generateSingleSceneImage
};
