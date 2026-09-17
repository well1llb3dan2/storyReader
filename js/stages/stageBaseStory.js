/**
 * Stage 2: Story Plot & Chapter Roadmap (Narrative Architect)
 * & Stage 2.5: Character Dossiers (Character Designer)
 */
import { state } from "../state/store.js";
import { el } from "../modules/domElements.js";
import { showToast, countWords, escapeHtml, cleanChapterTitle } from "../modules/utils.js";
import { requestStoryboardGeneration } from "../api/apiClient.js";
import { saveStoryToServer } from "../modules/storyStorage.js";

let isThinkingCollapsed = false;
let isCharsThinkingCollapsed = false;

export function setupBaseStoryListeners({
  onProceedToCharacters,
  onBackToPremise,
  onRegenerateOutline,
  onProceedToStoryboard,
  onBackToOutline
}) {
  // Plot / Roadmap stage listeners
  if (el.btnBackToPremiseFromBase) el.btnBackToPremiseFromBase.addEventListener("click", onBackToPremise);
  if (el.btnBackToPremiseFromBaseBottom) el.btnBackToPremiseFromBaseBottom.addEventListener("click", onBackToPremise);

  if (el.btnRegenBaseStory) {
    el.btnRegenBaseStory.addEventListener("click", () => {
      handleRegenerateOutline(onRegenerateOutline);
    });
  }

  if (el.btnConfirmBaseStory) {
    el.btnConfirmBaseStory.addEventListener("click", () => {
      handleConfirmPlot(onProceedToCharacters);
    });
  }
  if (el.btnConfirmBaseStoryBottom) {
    el.btnConfirmBaseStoryBottom.addEventListener("click", () => {
      handleConfirmPlot(onProceedToCharacters);
    });
  }

  if (el.baseStoryTextarea) {
    el.baseStoryTextarea.addEventListener("input", (e) => {
      state.story.outline = e.target.value;
      state.story.initialWriting = e.target.value;
      updateLiveWordCount();
    });
  }

  if (el.btnToggleThinking) {
    el.btnToggleThinking.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleThinkingVisibility();
    });
  }

  // Character Dossiers stage listeners
  if (el.btnBackToOutlineFromChars) el.btnBackToOutlineFromChars.addEventListener("click", onBackToOutline);
  if (el.btnBackToOutlineFromCharsBottom) el.btnBackToOutlineFromCharsBottom.addEventListener("click", onBackToOutline);

  if (el.btnRegenCharacters) {
    el.btnRegenCharacters.addEventListener("click", () => {
      startCharacterStreaming({
        prompt: state.story.prompt,
        title: state.story.title,
        outline: state.story.outline,
        model: state.story.model,
        onFinish: () => {}
      });
    });
  }

  if (el.btnConfirmCharacters) {
    el.btnConfirmCharacters.addEventListener("click", () => {
      handleConfirmCharacters(onProceedToStoryboard);
    });
  }
  if (el.btnConfirmCharactersBottom) {
    el.btnConfirmCharactersBottom.addEventListener("click", () => {
      handleConfirmCharacters(onProceedToStoryboard);
    });
  }

  if (el.charactersTextarea) {
    el.charactersTextarea.addEventListener("input", (e) => {
      state.story.charactersMarkdown = e.target.value;
      updateCharsLiveWordCount();
    });
  }

  if (el.btnToggleCharactersThinking) {
    el.btnToggleCharactersThinking.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCharactersThinkingVisibility();
    });
  }
}

export function toggleThinkingVisibility() {
  isThinkingCollapsed = !isThinkingCollapsed;
  if (el.baseStoryThinkingBody) {
    el.baseStoryThinkingBody.style.display = isThinkingCollapsed ? "none" : "block";
  }
  if (el.btnToggleThinking) {
    el.btnToggleThinking.textContent = isThinkingCollapsed ? "▶ Expand" : "▼ Collapse";
  }
}

export function toggleCharactersThinkingVisibility() {
  isCharsThinkingCollapsed = !isCharsThinkingCollapsed;
  if (el.charactersThinkingBody) {
    el.charactersThinkingBody.style.display = isCharsThinkingCollapsed ? "none" : "block";
  }
  if (el.btnToggleCharactersThinking) {
    el.btnToggleCharactersThinking.textContent = isCharsThinkingCollapsed ? "▶ Expand" : "▼ Collapse";
  }
}

export function updateLiveWordCount() {
  const text = el.baseStoryTextarea ? el.baseStoryTextarea.value : (state.story.outline || "");
  const words = countWords(text);
  if (el.baseStoryLiveWordCount) {
    el.baseStoryLiveWordCount.textContent = `${words.toLocaleString()} Words`;
  }
}

export function updateCharsLiveWordCount() {
  const text = el.charactersTextarea ? el.charactersTextarea.value : (state.story.charactersMarkdown || "");
  const words = countWords(text);
  if (el.charactersLiveWordCount) {
    el.charactersLiveWordCount.textContent = `${words.toLocaleString()} Words`;
  }
}

export function renderBaseStoryView() {
  const { title, prompt, outline, initialWriting, targetChapterCount, targetSceneCount, targetTotalWords, model } = state.story;
  const currentOutline = outline || initialWriting || "";
  const totalChapters = targetChapterCount || targetSceneCount || 20;
  const totalWords = targetTotalWords || 50000;

  if (el.baseStoryTitle) el.baseStoryTitle.textContent = title || "Story Plot & Chapter Roadmap";
  if (el.baseStoryPromptSummary) el.baseStoryPromptSummary.textContent = `Premise: ${prompt}`;
  if (el.baseStoryScenesBadge) el.baseStoryScenesBadge.textContent = `${totalChapters} Chapters • ~${totalWords.toLocaleString()} Words`;
  if (el.baseStoryModelBadge) el.baseStoryModelBadge.textContent = model || "Ollama Model";

  if (el.baseStoryTextarea) {
    el.baseStoryTextarea.value = currentOutline;
  }

  updateLiveWordCount();
}

export function renderCharactersView() {
  const { title, prompt, charactersMarkdown, targetChapterCount, targetTotalWords } = state.story;
  const totalChapters = targetChapterCount || 20;
  const totalWords = targetTotalWords || 50000;
  if (el.charactersStoryTitle) el.charactersStoryTitle.textContent = `${title} — Character Dossiers`;
  if (el.charactersPromptSummary) el.charactersPromptSummary.textContent = `Premise: ${prompt}`;
  if (el.charactersCountBadge) el.charactersCountBadge.textContent = `${totalChapters} Chapters • ~${totalWords.toLocaleString()} Words`;
  if (el.charactersTextarea) el.charactersTextarea.value = charactersMarkdown || "";
  updateCharsLiveWordCount();
}

/**
 * Initiates live Server-Sent Events (SSE) streaming of the roadmap using Narrative Architect
 */
export async function startBaseStoryStreaming({ prompt, model, title, onFinish }) {
  renderBaseStoryView();

  if (el.baseStoryThinkingWrap) el.baseStoryThinkingWrap.style.display = "none";
  if (el.baseStoryThinkingContent) el.baseStoryThinkingContent.textContent = "";
  if (el.thinkingStatusBadge) el.thinkingStatusBadge.textContent = "Thinking...";
  if (el.baseLiveStreamDot) el.baseLiveStreamDot.style.display = "inline-block";
  if (el.baseLiveStreamStatus) el.baseLiveStreamStatus.textContent = `Narrative Architect mapping chapters with ${model}...`;
  if (el.baseStoryTextarea) el.baseStoryTextarea.value = "";

  const actionBtns = [el.btnRegenBaseStory, el.btnConfirmBaseStory, el.btnConfirmBaseStoryBottom].filter(Boolean);
  actionBtns.forEach(b => { b.disabled = true; });

  let accumulatedText = "";
  let accumulatedThinking = "";

  try {
    const totalChapters = state.story.targetChapterCount || state.story.targetSceneCount || 20;
    const totalWords = state.story.targetTotalWords || 50000;
    const wordsPerChapter = state.story.targetWordsPerChapter || Math.round(totalWords / totalChapters);
    const readingLevel = state.story.readingLevel || "general_commercial";

    const resp = await fetch("/api/generate-outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        title: title || state.story.title || "Untitled",
        targetChapterCount: totalChapters,
        targetSceneCount: totalChapters,
        targetTotalWords: totalWords,
        targetWordsPerChapter: wordsPerChapter,
        readingLevel,
        model,
        stream: true
      })
    });

    if (!resp.ok) {
      throw new Error(`Server returned HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.thinkingDelta) {
              if (el.baseStoryThinkingWrap && el.baseStoryThinkingWrap.style.display === "none") {
                el.baseStoryThinkingWrap.style.display = "block";
              }
              accumulatedThinking += data.thinkingDelta;
              if (el.baseStoryThinkingContent) {
                el.baseStoryThinkingContent.textContent = accumulatedThinking;
              }
              if (el.baseStoryThinkingBody) {
                el.baseStoryThinkingBody.scrollTop = el.baseStoryThinkingBody.scrollHeight;
              }
            }

            if (data.delta) {
              accumulatedText += data.delta;
              if (el.baseStoryTextarea) {
                el.baseStoryTextarea.value = accumulatedText;
                el.baseStoryTextarea.scrollTop = el.baseStoryTextarea.scrollHeight;
              }
              updateLiveWordCount();
            }

            if (data.done) {
              if (data.fullText) accumulatedText = data.fullText;
              if (data.fullThinking) accumulatedThinking = data.fullThinking;
            }
          } catch (err) {}
        }
      }
    }

    state.story.outline = accumulatedText.trim();
    state.story.initialWriting = accumulatedText.trim();
    if (el.baseStoryTextarea) el.baseStoryTextarea.value = state.story.outline;
    if (el.baseLiveStreamDot) el.baseLiveStreamDot.style.display = "none";
    if (el.baseLiveStreamStatus) el.baseLiveStreamStatus.textContent = "Plot & Chapter Roadmap Ready ✓";
    if (el.thinkingStatusBadge) el.thinkingStatusBadge.textContent = "Architect reasoning complete ✓";

    updateLiveWordCount();
    await saveStoryToServer();

    showToast("Narrative roadmap generated! Review the chapters before designing character dossiers.", "success");

    if (typeof onFinish === "function") {
      onFinish();
    }
  } catch (error) {
    console.error("Outline stream error:", error);
    showToast(`Streaming error: ${error.message}`, "error");
    if (el.baseLiveStreamStatus) el.baseLiveStreamStatus.textContent = `Error: ${error.message}`;
  } finally {
    actionBtns.forEach(b => { b.disabled = false; });
  }
}

/**
 * Initiates live Server-Sent Events (SSE) streaming of Character Dossiers
 */
export async function startCharacterStreaming({ prompt, model, title, outline, onFinish }) {
  renderCharactersView();

  if (el.charactersThinkingWrap) el.charactersThinkingWrap.style.display = "none";
  if (el.charactersThinkingContent) el.charactersThinkingContent.textContent = "";
  if (el.charactersThinkingStatusBadge) el.charactersThinkingStatusBadge.textContent = "Thinking...";
  if (el.charactersLiveStreamDot) el.charactersLiveStreamDot.style.display = "inline-block";
  if (el.charactersLiveStreamStatus) el.charactersLiveStreamStatus.textContent = `Character Designer crafting dossiers with ${model}...`;
  if (el.charactersTextarea) el.charactersTextarea.value = "";

  const actionBtns = [el.btnRegenCharacters, el.btnConfirmCharacters, el.btnConfirmCharactersBottom].filter(Boolean);
  actionBtns.forEach(b => { b.disabled = true; });

  let accumulatedText = "";
  let accumulatedThinking = "";

  try {
    const readingLevel = state.story.readingLevel || "general_commercial";
    const resp = await fetch("/api/generate-characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || state.story.prompt,
        title: title || state.story.title || "Untitled",
        outline: outline || state.story.outline,
        readingLevel,
        model: model || state.story.model,
        stream: true
      })
    });

    if (!resp.ok) {
      throw new Error(`Server returned HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.thinkingDelta) {
              if (el.charactersThinkingWrap && el.charactersThinkingWrap.style.display === "none") {
                el.charactersThinkingWrap.style.display = "block";
              }
              accumulatedThinking += data.thinkingDelta;
              if (el.charactersThinkingContent) {
                el.charactersThinkingContent.textContent = accumulatedThinking;
              }
              if (el.charactersThinkingBody) {
                el.charactersThinkingBody.scrollTop = el.charactersThinkingBody.scrollHeight;
              }
            }

            if (data.delta) {
              accumulatedText += data.delta;
              if (el.charactersTextarea) {
                el.charactersTextarea.value = accumulatedText;
                el.charactersTextarea.scrollTop = el.charactersTextarea.scrollHeight;
              }
              updateCharsLiveWordCount();
            }

            if (data.done) {
              if (data.fullText) accumulatedText = data.fullText;
              if (data.fullThinking) accumulatedThinking = data.fullThinking;
            }
          } catch (err) {}
        }
      }
    }

    state.story.charactersMarkdown = accumulatedText.trim();
    if (el.charactersTextarea) el.charactersTextarea.value = state.story.charactersMarkdown;
    if (el.charactersLiveStreamDot) el.charactersLiveStreamDot.style.display = "none";
    if (el.charactersLiveStreamStatus) el.charactersLiveStreamStatus.textContent = "Character Dossiers Generated ✓";
    if (el.charactersThinkingStatusBadge) el.charactersThinkingStatusBadge.textContent = "Character Designer complete ✓";

    updateCharsLiveWordCount();
    await saveStoryToServer();

    showToast("Character dossiers generated! You can review traits and synergies before building the storyboard.", "success");

    if (typeof onFinish === "function") {
      onFinish();
    }
  } catch (error) {
    console.error("Characters stream error:", error);
    showToast(`Streaming error: ${error.message}`, "error");
    if (el.charactersLiveStreamStatus) el.charactersLiveStreamStatus.textContent = `Error: ${error.message}`;
  } finally {
    actionBtns.forEach(b => { b.disabled = false; });
  }
}

export async function handleRegenerateOutline(onOutlineReady) {
  const prompt = state.story.prompt;
  const model = state.story.model || "hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P";
  const title = state.story.title || "Untitled";

  if (!prompt) {
    showToast("No premise found to generate outline.", "warning");
    return;
  }

  await startBaseStoryStreaming({
    prompt,
    model,
    title,
    onFinish: onOutlineReady
  });
}

export async function handleConfirmPlot(onProceedToCharacters) {
  const currentText = el.baseStoryTextarea ? el.baseStoryTextarea.value.trim() : (state.story.outline || "").trim();
  if (!currentText) {
    showToast("Plot roadmap cannot be empty. Please enter or generate an outline.", "warning");
    return;
  }

  state.story.outline = currentText;
  state.story.initialWriting = currentText;
  await saveStoryToServer();

  if (typeof onProceedToCharacters === "function") {
    onProceedToCharacters();
  }

  if (!state.story.charactersMarkdown) {
    startCharacterStreaming({
      prompt: state.story.prompt,
      model: state.story.model,
      title: state.story.title,
      outline: state.story.outline,
      onFinish: () => {}
    });
  } else {
    renderCharactersView();
  }
}

export async function buildStoryboardFromCurrentState() {
  const currentChars = el.charactersTextarea ? el.charactersTextarea.value.trim() : (state.story.charactersMarkdown || "").trim();
  state.story.charactersMarkdown = currentChars;

  const totalChapters = state.story.targetChapterCount || state.story.targetSceneCount || 20;
  const totalWords = state.story.targetTotalWords || 50000;
  const wordsPerChapter = state.story.targetWordsPerChapter || Math.round(totalWords / totalChapters);
  const readingLevel = state.story.readingLevel || "general_commercial";

  const data = await requestStoryboardGeneration({
    prompt: state.story.prompt,
    title: state.story.title,
    targetChapterCount: totalChapters,
    targetSceneCount: totalChapters,
    targetTotalWords: totalWords,
    targetWordsPerChapter: wordsPerChapter,
    readingLevel,
    outline: state.story.outline,
    charactersMarkdown: state.story.charactersMarkdown,
    model: state.story.model || "hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P"
  });

  const rawChapters = data.chapters || data.scenes || [];
  const formattedChapters = rawChapters.map((ch, idx) => ({
    chapterNumber: ch.chapterNumber || ch.sceneNumber || idx + 1,
    sceneNumber: ch.chapterNumber || ch.sceneNumber || idx + 1,
    title: cleanChapterTitle(ch.title, ch.chapterNumber || idx + 1),
    setting: ch.setting || "Key Location",
    characters: Array.isArray(ch.characters) ? ch.characters : ["Main Characters"],
    summary: ch.summary || "Chapter narrative progression.",
    characterActions: ch.characterActions || "",
    suggestedDialogue: ch.suggestedDialogue || "",
    emotionalSubtext: ch.emotionalSubtext || "",
    pacingNotes: ch.pacingNotes || "",
    targetWords: ch.targetWords || wordsPerChapter || 2500,
    mood: ch.mood || "Dramatic",
    content: "",
    status: "pending",
    wordCount: 0
  }));

  state.story.chapters = formattedChapters;
  state.story.scenes = formattedChapters;

  await saveStoryToServer();
  return formattedChapters;
}

export async function handleConfirmCharacters(onProceedToStoryboard) {
  const btns = [el.btnConfirmCharacters, el.btnConfirmCharactersBottom].filter(Boolean);
  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = `<span class="spinner"></span> Storyboard Creator Building Chapters...`;
  });

  try {
    await buildStoryboardFromCurrentState();

    if (typeof onProceedToStoryboard === "function") {
      onProceedToStoryboard();
    }

    showToast(`Storyboard created with ${state.story.chapters.length} chapters!`, "success");
  } catch (error) {
    console.error("Confirm characters to storyboard error:", error);
    showToast(`Error: ${error.message}`, "error");
  } finally {
    btns.forEach(b => {
      b.disabled = false;
      b.innerHTML = `<span class="btn-icon">🎬</span> Step 3: Build Chapter Storyboard →`;
    });
  }
}
