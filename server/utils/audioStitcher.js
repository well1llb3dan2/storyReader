const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { AUDIO_DIR } = require('../config');

/**
 * Extracts audio URL from any variation of the api.kie.ai response
 */
function extractAudioUrlFromResponse(data) {
  if (!data) return null;
  const taskData = data.data || data;

  // 1. resultJson field (JSON string or object)
  if (taskData.resultJson) {
    try {
      const parsed = typeof taskData.resultJson === 'string' ? JSON.parse(taskData.resultJson) : taskData.resultJson;
      if (Array.isArray(parsed?.resultUrls) && parsed.resultUrls[0]) return parsed.resultUrls[0];
      if (typeof parsed?.resultUrl === 'string') return parsed.resultUrl;
      if (typeof parsed?.audio_url === 'string') return parsed.audio_url;
      if (typeof parsed?.audioUrl === 'string') return parsed.audioUrl;
      if (typeof parsed?.url === 'string') return parsed.url;
    } catch (e) {}
  }

  // 2. direct resultUrls array
  if (Array.isArray(taskData.resultUrls) && taskData.resultUrls[0]) {
    return taskData.resultUrls[0];
  }
  if (Array.isArray(taskData.results) && taskData.results[0]) {
    const r = taskData.results[0];
    return typeof r === 'string' ? r : (r.url || r.audioUrl || r.resultUrl);
  }

  // 3. direct audio url properties
  if (typeof taskData.audio_url === 'string') return taskData.audio_url;
  if (typeof taskData.audioUrl === 'string') return taskData.audioUrl;
  if (typeof taskData.resultUrl === 'string') return taskData.resultUrl;
  if (typeof taskData.url === 'string' && (taskData.url.includes('.mp3') || taskData.url.includes('audio') || taskData.url.includes('file'))) {
    return taskData.url;
  }

  // 4. scan raw JSON string for any mp3 / wav / audio URL
  const rawStr = JSON.stringify(data);
  const audioMatch = rawStr.match(/https?:\/\/[^"'\s\\]+\.(?:mp3|wav|m4a|aac|ogg)(?:\?[^"'\s\\]*)?/i);
  if (audioMatch && audioMatch[0]) {
    return audioMatch[0].replace(/\\/g, '');
  }

  return null;
}

/**
 * Poll a single TTS taskId on api.kie.ai until it completes
 */
async function pollSingleTtsTask(taskId, apiKey, recordId = null, maxWaitSec = 300) {
  const start = Date.now();
  let pollCount = 0;

  console.log(`[TTS Polling Started] Task ID: ${taskId}${recordId ? ` | Record ID: ${recordId}` : ''}`);

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

      const audioUrl = extractAudioUrlFromResponse(data);

      console.log(`[TTS Poll #${pollCount} (${((Date.now() - start) / 1000).toFixed(1)}s)] Task: ${taskId} | State: ${stateStr || 'pending'} | Audio Ready: ${Boolean(audioUrl)}`);

      if (audioUrl || stateStr === 'success' || stateStr === 'completed' || stateStr === 'finished' || stateStr === 'done') {
        if (audioUrl) {
          console.log(`[TTS Poll SUCCESS] Task ${taskId} -> Audio URL: ${audioUrl}`);
          return { success: true, audioUrl };
        }
      }

      if (stateStr === 'fail' || stateStr === 'failed' || stateStr === 'error' || taskData.failCode) {
        const errorMsg = taskData.failMsg || taskData.failCode || data.msg || 'Task generation failed on api.kie.ai';
        console.error(`[TTS Poll FAILED] Task ${taskId}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (e) {
      console.warn(`[TTS Poll Warning] #${pollCount} for Task ${taskId}:`, e.message);
    }
  }

  console.error(`[TTS Poll TIMEOUT] Task ${taskId} exceeded ${maxWaitSec}s timeout.`);
  return { success: false, error: `Task timed out waiting for audio generation (${maxWaitSec}s)` };
}

/**
 * Download an MP3 from a URL and save to a local file
 */
async function downloadAudioFile(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download audio chunk from ${url} (HTTP ${resp.status})`);
  const arrayBuffer = await resp.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * Concatenate multiple audio segment files into a single MP3 using ffmpeg
 */
function stitchMp3Files(inputPaths, outputPath) {
  return new Promise((resolve, reject) => {
    if (inputPaths.length === 0) return reject(new Error('No audio files to stitch.'));
    if (inputPaths.length === 1) {
      // Re-encode single file directly to MP3
      const singleCmd = `ffmpeg -y -i "${inputPaths[0]}" -c:a libmp3lame -q:a 2 "${outputPath}"`;
      exec(singleCmd, (err) => {
        if (err) return reject(err);
        resolve(outputPath);
      });
      return;
    }

    const listPath = path.join(AUDIO_DIR, `concat_list_${Date.now()}.txt`);
    const listContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent, 'utf8');

    // Re-encode all concatenated segments into clean standard MP3
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -q:a 2 "${outputPath}"`;
    exec(ffmpegCmd, (err) => {
      if (fs.existsSync(listPath)) fs.unlinkSync(listPath);

      if (err) {
        console.error('[FFMPEG stitching error]:', err.message);
        reject(err);
      } else {
        resolve(outputPath);
      }
    });
  });
}

module.exports = {
  extractAudioUrlFromResponse,
  pollSingleTtsTask,
  downloadAudioFile,
  stitchMp3Files
};
