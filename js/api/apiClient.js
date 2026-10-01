/**
 * API Client for Backend StoryReader Server
 */

export async function fetchOllamaStatus(provider = 'ollama') {
  const resp = await fetch(`/api/status?provider=${encodeURIComponent(provider)}`);
  return await resp.json();
}

export async function requestOutlineGeneration({ prompt, title, targetChapterCount, targetTotalWords, targetWordsPerChapter, readingLevel, model, provider, contextSize, temperature, topP, numPredict }) {
  const resp = await fetch('/api/generate-outline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      targetChapterCount,
      targetTotalWords,
      targetWordsPerChapter,
      readingLevel,
      model,
      provider,
      contextSize,
      temperature,
      topP,
      numPredict,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate story outline');
  }

  return await resp.json();
}

export async function requestCharacterGeneration({ prompt, title, outline, readingLevel, model, provider, contextSize, temperature, topP, numPredict }) {
  const resp = await fetch('/api/generate-characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      outline,
      readingLevel,
      model,
      provider,
      contextSize,
      temperature,
      topP,
      numPredict,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate character dossiers');
  }

  return await resp.json();
}

export async function requestStoryboardGeneration({ prompt, title, outline, targetChapterCount, targetSceneCount, targetTotalWords, targetWordsPerChapter, readingLevel, model, provider, contextSize, temperature, topP, numPredict }) {
  const resp = await fetch('/api/generate-storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      outline,
      targetChapterCount: targetChapterCount || targetSceneCount,
      targetSceneCount: targetChapterCount || targetSceneCount,
      targetTotalWords,
      targetWordsPerChapter,
      readingLevel,
      model,
      provider,
      contextSize,
      temperature,
      topP,
      numPredict
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate storyboard');
  }

  return await resp.json();
}

export async function requestStoryboardGenerationStream({ prompt, title, outline, targetChapterCount, targetSceneCount, targetTotalWords, targetWordsPerChapter, readingLevel, model, provider, contextSize, temperature, topP, numPredict }, { onChapter } = {}) {
  const resp = await fetch('/api/generate-storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      outline,
      targetChapterCount: targetChapterCount || targetSceneCount,
      targetSceneCount: targetChapterCount || targetSceneCount,
      targetTotalWords,
      targetWordsPerChapter,
      readingLevel,
      model,
      provider,
      contextSize,
      temperature,
      topP,
      numPredict,
      stream: true
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Storyboard generation failed (HTTP ${resp.status})`);
  }

  if (!resp.body) {
    throw new Error('Storyboard generation stream is unavailable');
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalData = {};

  const consumeLine = async (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) return;

    const data = JSON.parse(trimmed.slice(6));
    if (data.error) throw new Error(data.error);
    if (data.chapter && typeof onChapter === 'function') {
      await onChapter(data.chapter, data.chapterNumber, data.totalChapters);
    }
    if (data.done) finalData = data;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      await consumeLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    await consumeLine(buffer);
  }

  return finalData;
}

export async function generateNovelistChapterApi({ chapter, scene, storyContext, charactersMarkdown, previousChaptersSummaries, lastChapterExcerpt, model, provider, contextSize, temperature, topP, numPredict }) {
  const resp = await fetch('/api/generate-chapter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapter: chapter || scene,
      storyContext,
      charactersMarkdown,
      previousChaptersSummaries,
      lastChapterExcerpt,
      model,
      provider,
      contextSize,
      temperature,
      topP,
      numPredict,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate chapter');
  }

  return await resp.json();
}

export async function generateChapterImageApi({ apiKey, storyId, chapterNumber, sceneNumber, prompt, aspectRatio = '16:9', quality = 'basic', outputFormat = 'png' }) {
  const resp = await fetch('/api/image/generate-chapter-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      storyId,
      chapterNumber: chapterNumber || sceneNumber,
      sceneNumber: chapterNumber || sceneNumber,
      prompt,
      aspectRatio,
      quality,
      outputFormat
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Image generation failed' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

export async function generateSceneChapterApi(params) {
  return generateNovelistChapterApi(params);
}

export async function saveStoryApi(storyData) {
  const resp = await fetch('/api/save-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(storyData)
  });
  return await resp.json();
}

export async function loadSavedStoriesApi() {
  const resp = await fetch('/api/saved-stories');
  return await resp.json();
}

export async function loadStoryByIdApi(id) {
  const resp = await fetch(`/api/load-story/${id}`);
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to load story');
  }
  return await resp.json();
}

