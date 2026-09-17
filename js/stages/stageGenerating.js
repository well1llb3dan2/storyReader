/**
 * Stage 4: Sequential Chapter Generation Pipeline
 */
import { state } from '../state/store.js';
import { el } from '../modules/domElements.js';
import { showToast, escapeHtml, countWords, cleanChapterTitle } from '../modules/utils.js';
import { formatNovelProse } from '../modules/textFormatter.js';
import { saveStoryToServer } from '../modules/storyStorage.js';

export function setupGeneratingListeners({ onPrepareAndOpenReader }) {
  if (el.btnPauseGen) el.btnPauseGen.addEventListener('click', togglePauseGeneration);
  if (el.btnStopGen) el.btnStopGen.addEventListener('click', stopGeneration);
  if (el.btnViewReaderNow) el.btnViewReaderNow.addEventListener('click', onPrepareAndOpenReader);
}

export function startNovelGeneration({ onSetStage, onFinishCallback }) {
  const chapters = state.story.chapters && state.story.chapters.length > 0 ? state.story.chapters : state.story.scenes;
  if (!chapters || chapters.length === 0) return;

  state.story.chapters = chapters;
  state.story.scenes = chapters;

  if (typeof onSetStage === 'function') {
    onSetStage('generating');
  }

  state.generation.isRunning = true;
  state.generation.isPaused = false;
  state.generation.currentIndex = 0;
  state.generation.startTime = Date.now();
  state.generation.totalWords = 0;

  chapters.forEach(ch => {
    if (!ch.content) {
      ch.status = 'pending';
    } else {
      ch.status = 'completed';
      state.generation.totalWords += ch.wordCount || countWords(ch.content);
    }
  });

  if (state.generation.timerInterval) clearInterval(state.generation.timerInterval);
  state.generation.timerInterval = setInterval(updateGenerationTimer, 1000);

  renderQueueSidebar();
  processNextSceneInQueue(onFinishCallback);
}

export async function processNextSceneInQueue(onFinishCallback) {
  if (!state.generation.isRunning) return;

  const chapters = state.story.chapters && state.story.chapters.length > 0 ? state.story.chapters : state.story.scenes;
  const pendingIndex = chapters.findIndex(s => s.status === 'pending');

  if (pendingIndex === -1) {
    finishAllGenerations(onFinishCallback);
    return;
  }

  state.generation.currentIndex = pendingIndex;
  const currentChapter = chapters[pendingIndex];
  const chNum = currentChapter.chapterNumber || currentChapter.sceneNumber || (pendingIndex + 1);
  currentChapter.status = 'generating';

  updateGenerationProgressUI(currentChapter);
  renderQueueSidebar();

  const previousChaptersSummaries = chapters
    .slice(0, pendingIndex)
    .map(s => ({
      chapterNumber: s.chapterNumber || s.sceneNumber,
      title: s.title,
      summary: s.summary
    }));

  const lastChapterExcerpt = pendingIndex > 0 ? chapters[pendingIndex - 1].content || '' : '';

  try {
    if (el.liveTextContent) {
      el.liveTextContent.innerHTML = '<div class="waiting-placeholder"><div class="spinner"></div><p>Novelist Engine connecting to Ollama model <code>' + escapeHtml(state.story.model || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P') + '</code>...</p></div>';
    }
    currentChapter.content = '';

    const total = chapters.length;
    const targetWords = parseInt(String(currentChapter.targetWords).replace(/[^0-9]/g, ''), 10) || state.story.targetWordsPerChapter || 2500;
    const cleanTitle = cleanChapterTitle(currentChapter.title, chNum);

    if (el.genSubtext) {
      el.genSubtext.innerHTML = `✍️ <strong>Novelist Writing Chapter ${chNum} of ${total}:</strong> "${escapeHtml(cleanTitle)}" (~${targetWords.toLocaleString()}w target)`;
    }

    const resp = await fetch('/api/generate-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter: currentChapter,
        storyContext: {
          title: state.story.title,
          prompt: state.story.prompt,
          outline: state.story.outline || state.story.initialWriting || '',
          charactersMarkdown: state.story.charactersMarkdown || '',
          totalChapters: total,
          targetTotalWords: state.story.targetTotalWords || (total * targetWords),
          readingLevel: state.story.readingLevel || 'general_commercial'
        },
        charactersMarkdown: state.story.charactersMarkdown || '',
        readingLevel: state.story.readingLevel || 'general_commercial',
        previousChaptersSummaries,
        lastChapterExcerpt,
        model: state.story.model || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P',
        stream: true
      })
    });

    if (!resp.ok) {
      throw new Error(`Ollama returned HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;

    while (true) {
      if (!state.generation.isRunning) {
        reader.cancel();
        break;
      }

      while (state.generation.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.delta) {
              if (isFirstChunk) {
                if (el.liveTextContent) el.liveTextContent.innerHTML = '';
                isFirstChunk = false;
              }
              currentChapter.content += data.delta;
              const liveWords = countWords(currentChapter.content);
              if (el.liveTextContent) {
                el.liveTextContent.innerHTML = formatNovelProse(currentChapter.content).replace(/\n/g, '<br><br>') + '<span class="streaming-cursor"></span>';
              }
              if (el.liveTextViewport) {
                el.liveTextViewport.scrollTop = el.liveTextViewport.scrollHeight;
              }

              // Live Word Count & Progress
              if (el.genTotalWords) el.genTotalWords.textContent = (state.generation.totalWords + liveWords).toLocaleString();
              const currentFraction = Math.min(0.95, liveWords / targetWords);
              const livePercent = Math.min(99, Math.round(((pendingIndex + currentFraction) / total) * 100));
              if (el.genProgressBar) el.genProgressBar.style.width = `${livePercent}%`;
              if (el.genSubtext) {
                el.genSubtext.innerHTML = `✍️ <strong>Novelist Live Writing:</strong> Chapter ${chNum} of ${total} &bull; ${liveWords} words &bull; ${livePercent}% overall`;
              }
            }
            if (data.done && data.fullText) {
              currentChapter.content = data.fullText;
            }
          } catch (err) {}
        }
      }
    }

    currentChapter.status = 'completed';
    currentChapter.wordCount = countWords(currentChapter.content);
    state.generation.totalWords += currentChapter.wordCount;

    if (el.liveTextContent) {
      el.liveTextContent.innerHTML = formatNovelProse(currentChapter.content).replace(/\n/g, '<br><br>');
    }
    renderQueueSidebar();

    await saveStoryToServer();

    const completedCount = chapters.filter(s => s.status === 'completed').length;
    const completedPercent = Math.round((completedCount / total) * 100);
    if (el.genProgressBar) el.genProgressBar.style.width = `${completedPercent}%`;
    if (el.genProgressCount) el.genProgressCount.textContent = `${completedCount} / ${total}`;
    if (el.genSubtext) {
      el.genSubtext.innerHTML = `💾 <strong>Saved Chapter ${chNum}:</strong> (${completedCount}/${total} chapters complete &bull; ${completedPercent}%). Proceeding to next chapter...`;
    }

    if (state.generation.isRunning) {
      setTimeout(() => processNextSceneInQueue(onFinishCallback), 600);
    }
  } catch (error) {
    console.error(`Error generating chapter ${chNum}:`, error);
    currentChapter.status = 'error';
    showToast(`Error on Chapter ${chNum}: ${error.message}`, 'error');
    renderQueueSidebar();
  }
}

export function updateGenerationProgressUI(currentScene) {
  const total = state.story.scenes.length;
  const completed = state.story.scenes.filter(s => s.status === 'completed').length;
  const percent = Math.round((completed / total) * 100);
  const cleanTitle = cleanChapterTitle(currentScene.title, currentScene.sceneNumber);

  if (el.genStatusTitle) el.genStatusTitle.textContent = `Writing Chapter ${currentScene.sceneNumber} of ${total}: "${cleanTitle}"`;
  if (el.genProgressCount) el.genProgressCount.textContent = `${completed} / ${total}`;
  if (el.genProgressBar) el.genProgressBar.style.width = `${percent}%`;
  if (el.genTotalWords) el.genTotalWords.textContent = state.generation.totalWords.toLocaleString();

  if (el.currentWritingSceneTitle) el.currentWritingSceneTitle.textContent = `Chapter ${currentScene.sceneNumber}: ${cleanTitle}`;
  if (el.currentSceneSetting) el.currentSceneSetting.textContent = `📍 ${currentScene.setting}`;
  if (el.currentSceneMood) el.currentSceneMood.textContent = `🎭 ${currentScene.mood}`;

  if (el.currentSceneCharTags) {
    el.currentSceneCharTags.innerHTML = (currentScene.characters || [])
      .map(c => `<span class="speaker-tag">${escapeHtml(c)}</span>`)
      .join('');
  }
}

export function renderQueueSidebar() {
  if (!el.scenesQueueList) return;
  const chapters = state.story.chapters && state.story.chapters.length > 0 ? state.story.chapters : state.story.scenes;
  const total = chapters.length;
  const completed = chapters.filter(s => s.status === 'completed').length;
  if (el.timelineCountBadge) el.timelineCountBadge.textContent = `${completed}/${total} Complete`;

  el.scenesQueueList.innerHTML = '';
  chapters.forEach((sc, idx) => {
    const chNum = sc.chapterNumber || sc.sceneNumber || (idx + 1);
    const cleanTitle = cleanChapterTitle(sc.title, chNum);
    const item = document.createElement('div');
    item.className = `queue-item ${sc.status === 'generating' ? 'current' : ''} ${sc.status === 'completed' ? 'completed' : ''}`;

    let icon = '⏳';
    if (sc.status === 'generating') icon = '✍️';
    else if (sc.status === 'completed') icon = '✅';
    else if (sc.status === 'error') icon = '⚠️';

    item.innerHTML = `
      <div class="queue-left">
        <span class="queue-status-icon">${icon}</span>
        <span class="queue-title">Chapter ${chNum}: ${escapeHtml(cleanTitle)}</span>
      </div>
      <span class="queue-words">${sc.wordCount ? sc.wordCount + 'w' : '~' + sc.targetWords + 'w'}</span>
    `;

    item.addEventListener('click', () => {
      if (sc.content) {
        if (el.currentWritingSceneTitle) el.currentWritingSceneTitle.textContent = `Chapter ${chNum}: ${cleanTitle}`;
        if (el.liveTextContent) el.liveTextContent.innerHTML = formatNovelProse(sc.content).replace(/\n/g, '<br><br>');
      }
    });

    el.scenesQueueList.appendChild(item);
  });
}

export function updateGenerationTimer() {
  if (!state.generation.startTime || state.generation.isPaused || !el.genTimeElapsed) return;
  const elapsedSec = Math.floor((Date.now() - state.generation.startTime) / 1000);
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  el.genTimeElapsed.textContent = `${mins}:${secs}`;
}

export function togglePauseGeneration() {
  state.generation.isPaused = !state.generation.isPaused;
  if (el.btnPauseGen) el.btnPauseGen.textContent = state.generation.isPaused ? '▶ Resume' : '⏸ Pause';
  if (el.genSubtext) {
    el.genSubtext.textContent = state.generation.isPaused
      ? 'Generation paused.'
      : `Writing chapters with ${state.story.model || 'Ollama'}...`;
  }
}

export function stopGeneration() {
  if (confirm('Stop sequential chapter generation? Any completed chapters will be saved.')) {
    state.generation.isRunning = false;
    if (state.generation.timerInterval) clearInterval(state.generation.timerInterval);
    if (el.btnViewReaderNow) el.btnViewReaderNow.style.display = 'inline-flex';
    showToast('Generation halted.', 'info');
  }
}

export function finishAllGenerations(onFinishCallback) {
  state.generation.isRunning = false;
  if (state.generation.timerInterval) clearInterval(state.generation.timerInterval);

  if (el.genProgressBar) el.genProgressBar.style.width = '100%';
  if (el.genStatusTitle) el.genStatusTitle.textContent = `🎉 Complete Novel Finished! (${state.story.scenes.length} Chapters)`;
  if (el.genSubtext) {
    el.genSubtext.textContent = 'All chapters have been written and assembled into the complete novel!';
  }

  if (el.btnViewReaderNow) el.btnViewReaderNow.style.display = 'inline-flex';

  saveStoryToServer();

  if (typeof onFinishCallback === 'function') {
    onFinishCallback();
  }

  showToast('Novel generation complete! Opening the book reader...', 'success');
}
