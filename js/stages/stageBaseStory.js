/**
 * Stage 2: Story Plot & Chapter Roadmap (Narrative Architect)
 * & Stage 2.5: Character Dossiers (Character Designer)
 */
import { state } from "../state/store.js";
import { el } from "../modules/domElements.js";
import { showToast, countWords, escapeHtml, cleanChapterTitle } from "../modules/utils.js";
import { requestStoryboardGenerationStream } from "../api/apiClient.js";
import { saveStoryToServer } from "../modules/storyStorage.js";
import { getStepAISettings } from "../modules/aiSettings.js";

let isThinkingCollapsed = false;
let isCharsThinkingCollapsed = false;

export function setupBaseStoryListeners({
  onProceedToCharacters,
  onBackToPremise,
  onRegenerateOutline,
  onProceedToStoryboard,
  onBackToOutline,
  onStoryboardChapter
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
        model: getStepAISettings("characters").model,
        onFinish: () => {}
      });
    });
  }

  if (el.btnConfirmCharacters) {
    el.btnConfirmCharacters.addEventListener("click", () => {
      handleConfirmCharacters(onProceedToStoryboard, onStoryboardChapter);
    });
  }
  if (el.btnConfirmCharactersBottom) {
    el.btnConfirmCharactersBottom.addEventListener("click", () => {
      handleConfirmCharacters(onProceedToStoryboard, onStoryboardChapter);
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
  const text = el.charactersTextarea ? el.charactersTextarea.value : buildCharactersMarkdown(state.story.characters || []);
  const words = countWords(text);
  if (el.charactersLiveWordCount) {
    el.charactersLiveWordCount.textContent = `${words.toLocaleString()} Words`;
  }
}

const characterCardFields = [
  ["Age", "age"],
  ["Physical Appearance", "physicalAppearance"],
  ["Personality", "personality"],
  ["Background & History", "background"],
  ["Core Motivations", "motivations"],
  ["Flaws & Vulnerabilities", "flaws"],
  ["Skills, Powers & Talents", "skills"],
  ["Key Relationships", "relationships"],
  ["Character Arc & Growth", "characterArc"],
  ["Signature Lines / Quotes", "signatureLines"],
  ["Additional Notes", "additionalNotes"]
];

function formatCharacterValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(formatCharacterValue).filter(Boolean).join("; ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nestedValue]) => {
        const formattedValue = formatCharacterValue(nestedValue);
        const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase());
        return formattedValue ? `${label}: ${formattedValue}` : "";
      })
      .filter(Boolean)
      .join("; ");
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function buildCharactersMarkdown(characters) {
  return characters.map(character => {
    const rows = [
      ["Full Name", character.name],
      ["Role in the Story", character.role],
      ...characterCardFields
        .filter(([, field]) => field !== "age" || character[field])
        .map(([label, field]) => [label, character[field]])
    ].map(([label, value]) => `| ${label} | ${formatCharacterValue(value).replace(/\|/g, "\\|")} |`).join("\n");

    return `### Character Dossier: ${character.name}\n\n| Aspect | Details |\n|---|---|\n${rows}`;
  }).join("\n\n");
}

export function renderCharacterCards(characters = state.story.characters || []) {
  if (!el.charactersGrid) return;
  el.charactersGrid.innerHTML = "";

  if (characters.length === 0) {
    el.charactersGrid.innerHTML = '<p class="empty-state">Character cards will appear here as they are generated.</p>';
    return;
  }

  characters.forEach((character, index) => {
    const card = document.createElement("article");
    card.className = "character-card";
    card.innerHTML = `
      <div class="character-card-header">
        <div>
          <span class="character-card-number">Character ${index + 1}</span>
          <h3 class="character-card-name">${escapeHtml(character.name || `Character ${index + 1}`)}</h3>
        </div>
        <span class="character-card-role">${escapeHtml(character.role || "Supporting character")}</span>
      </div>
      <div class="character-card-fields">
        ${characterCardFields.map(([label, field]) => `
          <div class="character-card-field">
            <span class="character-card-label">${label}</span>
            <div class="character-card-value" contenteditable="true" data-character-field="${field}">${escapeHtml(formatCharacterValue(character[field]))}</div>
          </div>
        `).join("")}
      </div>
    `;

    card.querySelectorAll("[data-character-field]").forEach(fieldElement => {
      fieldElement.addEventListener("input", event => {
        character[event.currentTarget.dataset.characterField] = event.currentTarget.textContent.trim();
        state.story.charactersMarkdown = buildCharactersMarkdown(state.story.characters || []);
        updateCharsLiveWordCount();
      });
      fieldElement.addEventListener("blur", () => {
        saveStoryToServer();
      });
    });

    el.charactersGrid.appendChild(card);
  });
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
  const { title, prompt, targetChapterCount, targetTotalWords } = state.story;
  const totalChapters = targetChapterCount || 20;
  const totalWords = targetTotalWords || 50000;
  if (Array.isArray(state.story.characters) && state.story.characters.length > 0) {
    state.story.charactersMarkdown = buildCharactersMarkdown(state.story.characters);
  }
  if (el.charactersStoryTitle) el.charactersStoryTitle.textContent = `${title} — Character Dossiers`;
  if (el.charactersPromptSummary) el.charactersPromptSummary.textContent = `Premise: ${prompt}`;
  if (el.charactersCountBadge) {
    const characterCount = (state.story.characters || []).length;
    el.charactersCountBadge.textContent = characterCount > 0
      ? `${characterCount} Characters`
      : "Building Cast...";
  }
  renderCharacterCards(state.story.characters || []);
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
    const outlineAI = getStepAISettings("outline");

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
        model: outlineAI.model,
        provider: outlineAI.provider,
        contextSize: outlineAI.contextSize,
        temperature: outlineAI.temperature,
        topP: outlineAI.topP,
        numPredict: outlineAI.numPredict,
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
  state.story.characters = [];
  state.story.charactersMarkdown = "";
  renderCharactersView();

  if (el.charactersThinkingWrap) el.charactersThinkingWrap.style.display = "none";
  if (el.charactersThinkingContent) el.charactersThinkingContent.textContent = "";
  if (el.charactersThinkingStatusBadge) el.charactersThinkingStatusBadge.textContent = "Thinking...";
  if (el.charactersLiveStreamDot) el.charactersLiveStreamDot.style.display = "inline-block";
  if (el.charactersLiveStreamStatus) el.charactersLiveStreamStatus.textContent = `Character Designer crafting dossiers with ${model}...`;
  if (el.charactersTextarea) el.charactersTextarea.value = "";

  const actionBtns = [el.btnRegenCharacters, el.btnConfirmCharacters, el.btnConfirmCharactersBottom].filter(Boolean);
  actionBtns.forEach(b => { b.disabled = true; });

  try {
    const readingLevel = state.story.readingLevel || "general_commercial";
    const characterAI = getStepAISettings("characters");
    const resp = await fetch("/api/generate-character-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || state.story.prompt,
        title: title || state.story.title || "Untitled",
        outline: outline || state.story.outline,
        readingLevel,
        model: characterAI.model,
        provider: characterAI.provider,
        contextSize: characterAI.contextSize,
        temperature: characterAI.temperature,
        topP: characterAI.topP,
        numPredict: characterAI.numPredict,
        stream: true
      })
    });

    if (!resp.ok) {
      throw new Error(`Server returned HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleEvent = async line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) return;

      const data = JSON.parse(trimmed.slice(6));
      if (data.error) throw new Error(data.error);

      if (data.character) {
        state.story.characters.push(data.character);
        state.story.charactersMarkdown = buildCharactersMarkdown(state.story.characters);
        renderCharacterCards(state.story.characters);
        updateCharsLiveWordCount();
        if (el.charactersLiveStreamStatus) {
          el.charactersLiveStreamStatus.textContent = `Character ${data.characterNumber || state.story.characters.length} generated...`;
        }
        await saveStoryToServer();
      }

      if (data.done) {
        if (Array.isArray(data.characters)) state.story.characters = data.characters;
        if (data.charactersMarkdown) state.story.charactersMarkdown = data.charactersMarkdown;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        await handleEvent(line);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) await handleEvent(buffer);

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
  const model = getStepAISettings("outline").model;
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
    const characterAI = getStepAISettings("characters");
    startCharacterStreaming({
      prompt: state.story.prompt,
      model: characterAI.model,
      title: state.story.title,
      outline: state.story.outline,
      onFinish: () => {}
    });
  } else {
    renderCharactersView();
  }
}

export async function buildStoryboardFromCurrentState({ onChapter } = {}) {
  const currentChars = el.charactersTextarea ? el.charactersTextarea.value.trim() : (state.story.charactersMarkdown || "").trim();
  state.story.charactersMarkdown = currentChars;

  const totalChapters = state.story.targetChapterCount || state.story.targetSceneCount || 20;
  const totalWords = state.story.targetTotalWords || 50000;
  const wordsPerChapter = state.story.targetWordsPerChapter || Math.round(totalWords / totalChapters);
  const readingLevel = state.story.readingLevel || "general_commercial";
  const storyboardAI = getStepAISettings("storyboard");

  state.story.chapters = [];
  state.story.scenes = [];

  const appendChapter = async (ch, chapterNumber) => {
    const chapterIndex = chapterNumber || state.story.chapters.length + 1;
    const formattedChapter = {
      chapterNumber: ch.chapterNumber || ch.sceneNumber || chapterIndex,
      sceneNumber: ch.chapterNumber || ch.sceneNumber || chapterIndex,
      title: cleanChapterTitle(ch.title, chapterIndex),
      summary: ch.summary || "Chapter narrative progression.",
      targetWords: ch.targetWords || wordsPerChapter || 2500,
      content: "",
      status: "pending",
      wordCount: 0
    };

    state.story.chapters.push(formattedChapter);
    state.story.scenes = state.story.chapters;

    if (typeof onChapter === "function") {
      await onChapter(formattedChapter, state.story.chapters);
    }

    await saveStoryToServer();
  };

  await requestStoryboardGenerationStream({
    prompt: state.story.prompt,
    title: state.story.title,
    targetChapterCount: totalChapters,
    targetSceneCount: totalChapters,
    targetTotalWords: totalWords,
    targetWordsPerChapter: wordsPerChapter,
    readingLevel,
    outline: state.story.outline,
    model: storyboardAI.model,
    provider: storyboardAI.provider,
    contextSize: storyboardAI.contextSize,
    temperature: storyboardAI.temperature,
    topP: storyboardAI.topP,
    numPredict: storyboardAI.numPredict
  }, {
    onChapter: appendChapter
  });

  await saveStoryToServer();
  return state.story.chapters;
}

export async function handleConfirmCharacters(onProceedToStoryboard, onStoryboardChapter) {
  const btns = [el.btnConfirmCharacters, el.btnConfirmCharactersBottom].filter(Boolean);
  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = `<span class="spinner"></span> Storyboard Creator Building Chapters...`;
  });

  try {
    state.story.chapters = [];
    state.story.scenes = [];

    if (typeof onProceedToStoryboard === "function") {
      onProceedToStoryboard();
    }

    await buildStoryboardFromCurrentState({ onChapter: onStoryboardChapter });

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
