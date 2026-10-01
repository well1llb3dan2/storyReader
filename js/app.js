/**
 * StoryReader — Client Application Entry Point
 * Orchestrates Complete Novel Generation Pipeline:
 * Premise -> 1. Narrative Architect Plot -> 2. Character Designer Dossiers -> 3. Storyboard Creator -> 4. Novelist Engine -> Complete Novel
 */

import { state } from "./state/store.js";
import { el } from "./modules/domElements.js";
import { fetchOllamaStatus } from "./api/apiClient.js";
import { setupConceptListeners } from "./stages/stageConcept.js";
import {
  setupBaseStoryListeners,
  startBaseStoryStreaming,
  startCharacterStreaming,
  buildStoryboardFromCurrentState,
  renderBaseStoryView,
  renderCharactersView
} from "./stages/stageBaseStory.js";
import { setupStoryboardListeners, renderStoryboard } from "./stages/stageStoryboard.js";
import { setupGeneratingListeners, startNovelGeneration } from "./stages/stageGenerating.js";
import {
  setupReaderListeners,
  prepareAndOpenReader
} from "./stages/stageReader.js";
import { openSavedStoriesModal } from "./modules/storyStorage.js";
import { setupAISettings, applyAvailableModels, getStepAISettings, getAIProvider } from "./modules/aiSettings.js";

// --- STAGE NAVIGATION ---
export function canNavigateToStage(stageKey) {
  if (stageKey === "concept") return true;
  if (stageKey === "outline") return Boolean(state.story.prompt);
  if (stageKey === "characters") return Boolean(state.story.outline);
  if (stageKey === "storyboard") return (state.story.chapters && state.story.chapters.length > 0) || state.story.scenes.length > 0;
  if (stageKey === "generating") return (state.story.chapters && state.story.chapters.length > 0) || state.story.scenes.length > 0;
  if (stageKey === "reader") return (state.story.chapters || state.story.scenes).some(s => s.content);
  return false;
}

export function setStage(newStage) {
  state.stage = newStage;

  // Map view keys
  const viewMap = {
    concept: el.stageViews.concept,
    outline: el.stageViews.baseStory,
    characters: el.stageViews.characters,
    storyboard: el.stageViews.storyboard,
    generating: el.stageViews.generating,
    reader: el.stageViews.reader,
    settings: el.stageViews.settings
  };

  Object.keys(viewMap).forEach(key => {
    if (viewMap[key]) {
      viewMap[key].classList.toggle("active", key === newStage);
    }
  });

  if (el.stepNavs) {
    Object.keys(el.stepNavs).forEach(key => {
      if (el.stepNavs[key]) {
        el.stepNavs[key].classList.toggle("active", key === newStage);
      }
    });
  }

  const chapters = state.story.chapters && state.story.chapters.length > 0 ? state.story.chapters : state.story.scenes;

  if (state.story.prompt) el.stepNavs.concept?.classList.add("completed");
  if (state.story.outline) el.stepNavs.outline?.classList.add("completed");
  if (state.story.charactersMarkdown) el.stepNavs.characters?.classList.add("completed");
  if (chapters.length > 0) el.stepNavs.storyboard?.classList.add("completed");
  if (chapters.length > 0 && chapters.every(s => s.status === "completed" && s.content)) {
    el.stepNavs.generating?.classList.add("completed");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- OLLAMA HEALTH CHECK ---
export async function checkOllamaStatus(provider = getAIProvider()) {
  try {
    const data = await fetchOllamaStatus(provider);
    state.ollamaStatus = data;
    applyAvailableModels(data.models, data.defaultModel);

    if (data.connected) {
      if (data.hasTargetModel) {
        el.ollamaStatusBadge.innerHTML = `<span class="status-dot dot-connected"></span><span class="status-text">${data.providerLabel}: ${data.defaultModel} Ready</span>`;
      } else {
        el.ollamaStatusBadge.innerHTML = `<span class="status-dot dot-warning"></span><span class="status-text">${data.providerLabel} Connected (${data.defaultModel} recommended)</span>`;
      }
    } else {
      el.ollamaStatusBadge.innerHTML = `<span class="status-dot dot-disconnected"></span><span class="status-text">${data.providerLabel || provider} Offline (${data.host || data.ollamaHost})</span>`;
    }
  } catch (e) {
    el.ollamaStatusBadge.innerHTML = `<span class="status-dot dot-disconnected"></span><span class="status-text">Server Offline</span>`;
  }
}

// --- FULL AUTOMATED END-TO-END PIPELINE ---
export async function runFullEndToEndPipeline() {
  const prompt = state.story.prompt;
  const title = state.story.title || "Untitled";

  // Step 1: Narrative Architect (Plot & Chapter Roadmap)
  setStage("outline");
  await new Promise((resolve) => {
    startBaseStoryStreaming({
      prompt,
      model: getStepAISettings("outline").model,
      title,
      onFinish: resolve
    });
  });

  // Step 2: Character Designer (Dossiers)
  setStage("characters");
  await new Promise((resolve) => {
    startCharacterStreaming({
      prompt,
      model: getStepAISettings("characters").model,
      title,
      outline: state.story.outline,
      onFinish: resolve
    });
  });

  // Step 3: Storyboard Creator (Build Chapter Storyboard)
  setStage("storyboard");
  state.story.chapters = [];
  state.story.scenes = [];
  renderStoryboard();
  await buildStoryboardFromCurrentState({
    onChapter: () => renderStoryboard()
  });

  // Step 4: Novelist Engine (Sequential Chapter Prose) & Reader
  startNovelGeneration({
    onSetStage: setStage,
    onFinishCallback: () => {
      prepareAndOpenReader({ onSetStage: setStage });
    }
  });
}

// --- INITIALIZATION ---
function init() {
  setupAISettings({
    onNavigateHome: () => setStage("concept"),
    onProviderChange: provider => checkOllamaStatus(provider)
  });
  if (el.btnOpenSettings) el.btnOpenSettings.addEventListener("click", () => setStage("settings"));

  // Step Navigation Click Listeners
  Object.keys(el.stepNavs).forEach(key => {
    if (el.stepNavs[key]) {
      el.stepNavs[key].addEventListener("click", () => {
        if (canNavigateToStage(key)) {
          if (key === "reader") {
            prepareAndOpenReader({ onSetStage: setStage });
          } else {
            setStage(key);
          }
        }
      });
    }
  });

  // Stage 1: Premise listeners
  setupConceptListeners({
    onPremiseSubmitted: () => {
      setStage("outline");
      startBaseStoryStreaming({
        prompt: state.story.prompt,
        model: getStepAISettings("outline").model,
        title: state.story.title,
        onFinish: () => {}
      });
    },
    onAutoRunRequested: () => {
      runFullEndToEndPipeline();
    }
  });

  // Stage 2 & 2.5: Plot & Character Dossier listeners
  setupBaseStoryListeners({
    onProceedToCharacters: () => {
      setStage("characters");
    },
    onBackToPremise: () => setStage("concept"),
    onBackToOutline: () => setStage("outline"),
    onRegenerateOutline: () => {},
    onProceedToStoryboard: () => {
      renderStoryboard();
      setStage("storyboard");
    },
    onStoryboardChapter: () => {
      renderStoryboard();
    }
  });

  // Stage 3: Storyboard listeners
  setupStoryboardListeners({
    onStartGeneration: () => {
      startNovelGeneration({
        onSetStage: setStage,
        onFinishCallback: () => {
          prepareAndOpenReader({ onSetStage: setStage });
        }
      });
    },
    onBackToConcept: () => setStage("characters"),
    onBackToCharacters: () => setStage("characters"),
    onRegenerateStoryboard: () => {
      renderCharactersView();
      setStage("characters");
    }
  });

  // Stage 4: Generation listeners
  setupGeneratingListeners({
    onPrepareAndOpenReader: () => {
      prepareAndOpenReader({ onSetStage: setStage });
    }
  });

  // Stage 5/6: Novel Reader listeners
  setupReaderListeners({
    onNewStoryRequested: () => setStage("concept"),
    onOpenSavedModal: () => {
      openSavedStoriesModal({
        onStoryLoaded: (storyData) => {
          const chapters = storyData.chapters || storyData.scenes || [];
          state.story.chapters = chapters;
          state.story.scenes = chapters;
          renderStoryboard();
          if (chapters.length > 0 && chapters.some(s => s.content)) {
            prepareAndOpenReader({ onSetStage: setStage });
          } else {
            setStage("storyboard");
          }
        }
      });
    }
  });

  // Ollama Check
  checkOllamaStatus();
  setInterval(checkOllamaStatus, 15000);
}

// Bootstrap on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
