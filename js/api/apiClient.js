/**
 * API Client for Backend StoryReader Server
 */

export async function fetchOllamaStatus() {
  const resp = await fetch('/api/status');
  return await resp.json();
}

export async function requestOutlineGeneration({ prompt, title, targetChapterCount, targetTotalWords, targetWordsPerChapter, readingLevel, model }) {
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
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate story outline');
  }

  return await resp.json();
}

export async function requestCharacterGeneration({ prompt, title, outline, readingLevel, model }) {
  const resp = await fetch('/api/generate-characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      outline,
      readingLevel,
      model,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate character dossiers');
  }

  return await resp.json();
}

export async function requestStoryboardGeneration({ prompt, title, outline, charactersMarkdown, targetChapterCount, targetSceneCount, targetTotalWords, targetWordsPerChapter, readingLevel, model }) {
  const resp = await fetch('/api/generate-storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title,
      outline,
      charactersMarkdown,
      targetChapterCount: targetChapterCount || targetSceneCount,
      targetSceneCount: targetChapterCount || targetSceneCount,
      targetTotalWords,
      targetWordsPerChapter,
      readingLevel,
      model
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Failed to generate storyboard');
  }

  return await resp.json();
}

export async function generateNovelistChapterApi({ chapter, scene, storyContext, charactersMarkdown, previousChaptersSummaries, lastChapterExcerpt, model }) {
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

