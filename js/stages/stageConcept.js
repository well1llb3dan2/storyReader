/**
 * Stage 1: Story Premise & Concept Initiation
 */
import { state } from "../state/store.js";
import { el } from "../modules/domElements.js";
import { showToast, generateFallbackTitle } from "../modules/utils.js";
import { getNovelRecommendation, getReadingLevelById } from "../config/novelScaleConfig.js";
import { aiSettings } from "../modules/aiSettings.js";

let currentSelectedGenreId = null;

export function setupConceptListeners({ onPremiseSubmitted, onAutoRunRequested }) {
  // Initial sync of math banner & recommendations
  updateNovelScaleUI();

  // Reading Level selector listener
  if (el.readingLevelSelect) {
    el.readingLevelSelect.addEventListener("change", (e) => {
      const lvl = getReadingLevelById(e.target.value);
      if (el.readingLevelGradeBadge) el.readingLevelGradeBadge.textContent = lvl.grade;
      if (el.readingLevelDesc) el.readingLevelDesc.textContent = lvl.description;
      state.story.readingLevel = lvl.id;
    });
  }

  // Chapter count slider (3 to 144)
  if (el.sceneCountInput) {
    el.sceneCountInput.addEventListener("input", () => {
      currentSelectedGenreId = null;
      document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
      updateNovelScaleUI();
    });
  }

  // Total word count slider (1,000 to 400,000)
  if (el.totalWordsInput) {
    el.totalWordsInput.addEventListener("input", () => {
      currentSelectedGenreId = null;
      document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
      updateNovelScaleUI();
    });
  }

  // Preset quick-select buttons
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const chapters = parseInt(e.currentTarget.dataset.chapters, 10);
      const words = parseInt(e.currentTarget.dataset.words, 10);
      const genreId = e.currentTarget.dataset.genre || null;
      currentSelectedGenreId = genreId;

      if (el.sceneCountInput && chapters) el.sceneCountInput.value = chapters;
      if (el.totalWordsInput && words) el.totalWordsInput.value = words;

      document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      updateNovelScaleUI();
    });
  });

  // Prompt suggestion chip buttons
  document.querySelectorAll(".prompt-suggestions .btn-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      if (el.promptInput) el.promptInput.value = btn.dataset.prompt;
    });
  });

  // Step-by-Step Mode
  if (el.btnGenerateStoryboard) {
    el.btnGenerateStoryboard.addEventListener("click", () => {
      handlePremiseSubmit(onPremiseSubmitted);
    });
  }

  // Auto-Run Full End-to-End Pipeline
  if (el.btnRunFullPipeline) {
    el.btnRunFullPipeline.addEventListener("click", () => {
      handlePremiseSubmit(onAutoRunRequested || onPremiseSubmitted);
    });
  }
}

/**
 * Recalculates words per chapter and updates recommendation banner & badges
 */
export function updateNovelScaleUI() {
  const chapters = (el.sceneCountInput && parseInt(el.sceneCountInput.value, 10)) || 20;
  const totalWords = (el.totalWordsInput && parseInt(el.totalWordsInput.value, 10)) || 50000;

  const rec = getNovelRecommendation(chapters, totalWords, currentSelectedGenreId);

  if (el.sceneCountDisplay) {
    el.sceneCountDisplay.textContent = `${rec.chapters} Chapters`;
  }
  if (el.totalWordsDisplay) {
    el.totalWordsDisplay.textContent = `${rec.totalWords.toLocaleString()} Words`;
  }
  if (el.novelMathFormula) {
    el.novelMathFormula.textContent = `📊 ${rec.mathBanner.formulaText}`;
  }
  if (el.novelScopeBadge) {
    el.novelScopeBadge.textContent = `📖 ${rec.matchedGenre ? rec.matchedGenre.genre : rec.scopeCategory}`;
  }
  if (el.novelDensityBadge) {
    el.novelDensityBadge.textContent = `⚡ ${rec.densityLabel} (~${rec.wordsPerChapter.toLocaleString()}w/ch)`;
  }
  if (el.novelPacingAdvice) {
    el.novelPacingAdvice.textContent = rec.helperText;
  }
}

export function handlePremiseSubmit(onPremiseSubmitted) {
  const prompt = el.promptInput ? el.promptInput.value.trim() : "";
  if (!prompt) {
    showToast("Please enter a story premise to begin.", "warning");
    if (el.promptInput) el.promptInput.focus();
    return;
  }

  const title = (el.titleInput && el.titleInput.value.trim()) || generateFallbackTitle(prompt);
  const targetChapterCount = (el.sceneCountInput && parseInt(el.sceneCountInput.value, 10)) || 20;
  const targetTotalWords = (el.totalWordsInput && parseInt(el.totalWordsInput.value, 10)) || 50000;
  const targetWordsPerChapter = Math.round(targetTotalWords / targetChapterCount);
  const readingLevel = (el.readingLevelSelect && el.readingLevelSelect.value) || "general_commercial";
  const model = aiSettings.models.outline;

  state.story = {
    id: `story_${Date.now()}`,
    title,
    prompt,
    outline: "",
    initialWriting: "",
    charactersMarkdown: "",
    characters: [],
    targetChapterCount,
    targetSceneCount: targetChapterCount,
    targetTotalWords,
    targetWordsPerChapter,
    readingLevel,
    genreId: currentSelectedGenreId,
    model,
    aiSettings: JSON.parse(JSON.stringify(aiSettings)),
    createdAt: new Date().toISOString(),
    chapters: [],
    scenes: []
  };

  if (typeof onPremiseSubmitted === "function") {
    onPremiseSubmitted();
  }
}
