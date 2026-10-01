/**
 * Stage 3: Chapter Storyboard Review & Management (Storyboard Creator)
 * Includes Seedream 5.0 Pro text-to-image generation on each chapter card.
 */
import { state, getEffectiveApiKey, saveApiKey } from "../state/store.js";
import { el } from "../modules/domElements.js";
import { escapeHtml, cleanChapterTitle, showToast } from "../modules/utils.js";
import { saveStoryToServer } from "../modules/storyStorage.js";
import { generateChapterImageApi } from "../api/apiClient.js";

export function setupStoryboardListeners({ onStartGeneration, onBackToConcept, onBackToCharacters, onRegenerateStoryboard }) {
  if (el.btnBackToConcept) el.btnBackToConcept.addEventListener("click", onBackToCharacters || onBackToConcept);
  if (el.btnBackToCharacters) el.btnBackToCharacters.addEventListener("click", onBackToCharacters || onBackToConcept);
  if (el.btnRegenStoryboard) el.btnRegenStoryboard.addEventListener("click", onRegenerateStoryboard);
  if (el.btnContinueToGeneration) el.btnContinueToGeneration.addEventListener("click", onStartGeneration);
  if (el.btnContinueToGenerationBottom) el.btnContinueToGenerationBottom.addEventListener("click", onStartGeneration);

  // Set API Key Button
  if (el.btnSetKieApiKey) {
    el.btnSetKieApiKey.addEventListener("click", () => {
      const current = getEffectiveApiKey();
      const input = prompt("Enter your api.kie.ai Bearer API Key for Seedream 5.0 Pro:", current || "");
      if (input !== null) {
        saveApiKey(input.trim());
      }
    });
  }

  // Generate All Chapter Images Button
  if (el.btnGenAllChapterImages) {
    el.btnGenAllChapterImages.addEventListener("click", () => {
      handleGenerateAllChapterImages();
    });
  }
}

function buildDefaultChapterImagePrompt(ch, storyTitle = '', storyPrompt = '') {
  if (ch.imagePrompt && ch.imagePrompt.trim()) return ch.imagePrompt;
  const actionSummary = ch.summary || 'Engaged in pivotal narrative action';
  return `Subject: Key events from "${ch.title || 'Chapter'}" in "${storyTitle || 'Novel'}". ${actionSummary}. Arrangement: Cinematic medium composition with dynamic framing. Camera and Light: 35mm lens, atmospheric volumetric lighting. Palette and Style: Cinematic film still, hyper-photorealistic RAW 8K, Kodak Portra 400 analog film texture, rich environmental details.`;
}

async function ensureKieApiKey() {
  let key = getEffectiveApiKey();
  if (!key) {
    key = prompt("Please enter your api.kie.ai Bearer API Key to generate images with Seedream 5.0 Pro:");
    if (key && key.trim()) {
      saveApiKey(key.trim());
      return key.trim();
    }
    return null;
  }
  return key;
}

export function renderStoryboard() {
  const { title, prompt, chapters, scenes, targetWordsPerChapter } = state.story;
  const currentChapters = chapters && chapters.length > 0 ? chapters : scenes;
  const defaultTarget = targetWordsPerChapter || 2500;

  if (el.sbStoryTitle) el.sbStoryTitle.textContent = title ? `${title} — Storyboard` : "Chapter Storyboard";
  if (el.sbSceneCountBadge) el.sbSceneCountBadge.textContent = `${currentChapters.length} Chapters`;

  const estTotalWords = currentChapters.reduce((sum, ch) => sum + (ch.targetWords || defaultTarget), 0);
  if (el.sbEstimatedWords) el.sbEstimatedWords.textContent = `Est. ~${estTotalWords.toLocaleString()} words`;
  if (el.sbStoryPromptSummary) el.sbStoryPromptSummary.textContent = `Premise: ${prompt}`;

  renderSceneCards(currentChapters);
}

export function renderSceneCards(chaptersToRender) {
  if (!el.scenesGrid) return;
  el.scenesGrid.innerHTML = "";
  const defaultTarget = state.story.targetWordsPerChapter || 2500;

  chaptersToRender.forEach((ch, idx) => {
    const card = document.createElement("div");
    card.className = "scene-card";
    const chNum = ch.chapterNumber || ch.sceneNumber || idx + 1;
    card.dataset.sceneNum = chNum;

    const cleanTitle = cleanChapterTitle(ch.title, chNum);
    ch.title = cleanTitle;
    const defaultVisualPrompt = buildDefaultChapterImagePrompt(ch, state.story.title, state.story.prompt);

    card.innerHTML = `
      <div class="scene-card-header">
        <div class="scene-title-group">
          <span class="scene-num-badge">Chapter ${chNum}</span>
          <h4 class="scene-title-text" contenteditable="true" title="Click to edit chapter title">${escapeHtml(cleanTitle)}</h4>
        </div>
        <div class="scene-badges">
          <span class="meta-pill">${ch.targetWords || defaultTarget} words</span>
        </div>
      </div>

      <!-- IMAGE AREA (Seedream 5.0 Pro) -->
      <div class="scene-card-image-wrap" id="imgWrap_${chNum}">
        ${ch.imageUrl ? `
          <img class="scene-card-image" src="${escapeHtml(ch.imageUrl)}" alt="Chapter ${chNum} Artwork" loading="lazy">
          <div class="scene-image-overlay-actions">
            <button type="button" class="btn-img-action btn-regen-img" title="Regenerate with Seedream 5.0 Pro">🔄 Regen</button>
            <button type="button" class="btn-img-action btn-prompt-toggle" title="View / Edit Visual Prompt">📝 Prompt</button>
            <a href="${escapeHtml(ch.imageUrl)}" target="_blank" class="btn-img-action" title="Open Full Size">🔍 View</a>
          </div>
        ` : `
          <div class="scene-card-image-placeholder">
            <span class="placeholder-icon">🎨</span>
            <button type="button" class="btn-gen-card-img"><span class="btn-icon">✨</span> Generate Image (Seedream 5.0 Pro)</button>
            <button type="button" class="btn-text-prompt-toggle" style="background:none; border:none; color:var(--accent-gold-light); font-size:11px; cursor:pointer; text-decoration:underline;">Custom Visual Prompt ▾</button>
          </div>
        `}
        <div class="scene-card-image-loading" style="display:none;">
          <div class="spinner"></div>
          <span>Generating with Seedream 5.0 Pro...</span>
        </div>
      </div>

      <!-- COLLAPSIBLE PROMPT DRAWER -->
      <div class="scene-card-prompt-drawer" style="display:none;" id="promptDrawer_${chNum}">
        <div class="prompt-drawer-header">
          <span>🎨 Visual Prompt (Seedream 5.0 Pro)</span>
          <button type="button" class="btn-close-drawer" style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:14px;">&times;</button>
        </div>
        <textarea class="prompt-drawer-textarea" rows="3" placeholder="Enter custom visual prompt for Seedream 5.0 Pro...">${escapeHtml(ch.imagePrompt || defaultVisualPrompt)}</textarea>
        <div class="prompt-drawer-actions">
          <button type="button" class="btn-secondary btn-sm btn-reset-prompt">Reset Prompt</button>
          <button type="button" class="btn-primary btn-sm btn-gen-from-drawer">✨ Generate with this Prompt</button>
        </div>
      </div>

      <div class="scene-summary-box">
        <label>Chapter Outline:</label>
        <textarea class="scene-summary-textarea" rows="8" placeholder="Describe what happens in this chapter...">${escapeHtml(ch.summary || "")}</textarea>
      </div>
    `;

    // Hook up Card Title & Summary edits
    const titleEl = card.querySelector(".scene-title-text");
    if (titleEl) {
      titleEl.addEventListener("blur", () => {
        ch.title = cleanChapterTitle(titleEl.textContent.trim(), chNum);
        titleEl.textContent = ch.title;
        saveStoryToServer();
      });
    }

    const summaryTextarea = card.querySelector(".scene-summary-textarea");
    if (summaryTextarea) {
      summaryTextarea.addEventListener("input", (e) => {
        ch.summary = e.target.value;
      });
      summaryTextarea.addEventListener("blur", () => {
        saveStoryToServer();
      });
    }

    // Hook up Image Generation Listeners
    setupCardImageListeners(card, ch, chNum);

    el.scenesGrid.appendChild(card);
  });
}

function setupCardImageListeners(card, ch, chNum) {
  const promptDrawer = card.querySelector(`#promptDrawer_${chNum}`);
  const promptTextarea = card.querySelector(`.prompt-drawer-textarea`);

  // Toggle Prompt Drawer
  card.querySelectorAll(".btn-prompt-toggle, .btn-text-prompt-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (promptDrawer) {
        const isHidden = promptDrawer.style.display === "none";
        promptDrawer.style.display = isHidden ? "flex" : "none";
      }
    });
  });

  // Close Drawer
  const btnCloseDrawer = card.querySelector(".btn-close-drawer");
  if (btnCloseDrawer && promptDrawer) {
    btnCloseDrawer.addEventListener("click", () => {
      promptDrawer.style.display = "none";
    });
  }

  // Reset Prompt
  const btnResetPrompt = card.querySelector(".btn-reset-prompt");
  if (btnResetPrompt && promptTextarea) {
    btnResetPrompt.addEventListener("click", () => {
      const defPrompt = buildDefaultChapterImagePrompt(ch, state.story.title, state.story.prompt);
      promptTextarea.value = defPrompt;
      ch.imagePrompt = defPrompt;
    });
  }

  // Generate Image Buttons
  card.querySelectorAll(".btn-gen-card-img, .btn-regen-img").forEach(btn => {
    btn.addEventListener("click", async () => {
      const customPrompt = promptTextarea ? promptTextarea.value.trim() : null;
      await handleGenerateSingleChapterImage(ch, card, chNum, customPrompt);
    });
  });

  const btnGenFromDrawer = card.querySelector(".btn-gen-from-drawer");
  if (btnGenFromDrawer) {
    btnGenFromDrawer.addEventListener("click", async () => {
      const customPrompt = promptTextarea ? promptTextarea.value.trim() : null;
      if (promptDrawer) promptDrawer.style.display = "none";
      await handleGenerateSingleChapterImage(ch, card, chNum, customPrompt);
    });
  }
}

async function handleGenerateSingleChapterImage(ch, card, chNum, customPrompt) {
  const apiKey = await ensureKieApiKey();
  if (!apiKey) {
    showToast("api.kie.ai API Key is required to generate images.", "warning");
    return;
  }

  const loadingOverlay = card.querySelector(".scene-card-image-loading");
  const imgWrap = card.querySelector(`#imgWrap_${chNum}`);
  const aspectRatio = (el.imgAspectRatioSelect && el.imgAspectRatioSelect.value) || "16:9";

  if (loadingOverlay) loadingOverlay.style.display = "flex";

  try {
    const finalPrompt = customPrompt || ch.imagePrompt || buildDefaultChapterImagePrompt(ch, state.story.title, state.story.prompt);
    ch.imagePrompt = finalPrompt;

    const result = await generateChapterImageApi({
      apiKey,
      storyId: state.story.id,
      chapterNumber: chNum,
      sceneNumber: chNum,
      prompt: finalPrompt,
      aspectRatio,
      quality: "basic",
      outputFormat: "png"
    });

    if (result.imageUrl) {
      ch.imageUrl = result.imageUrl;
      await saveStoryToServer();

      // Refresh image container HTML
      if (imgWrap) {
        imgWrap.innerHTML = `
          <img class="scene-card-image" src="${escapeHtml(result.imageUrl)}" alt="Chapter ${chNum} Artwork" loading="lazy">
          <div class="scene-image-overlay-actions">
            <button type="button" class="btn-img-action btn-regen-img" title="Regenerate with Seedream 5.0 Pro">🔄 Regen</button>
            <button type="button" class="btn-img-action btn-prompt-toggle" title="View / Edit Visual Prompt">📝 Prompt</button>
            <a href="${escapeHtml(result.imageUrl)}" target="_blank" class="btn-img-action" title="Open Full Size">🔍 View</a>
          </div>
          <div class="scene-card-image-loading" style="display:none;">
            <div class="spinner"></div>
            <span>Generating with Seedream 5.0 Pro...</span>
          </div>
        `;
        setupCardImageListeners(card, ch, chNum);
      }

      showToast(`Chapter ${chNum} image generated with Seedream 5.0 Pro!`, "success");
    }
  } catch (err) {
    console.error(`Chapter ${chNum} image error:`, err);
    showToast(`Image generation error on Chapter ${chNum}: ${err.message}`, "error");
  } finally {
    const overlay = card.querySelector(".scene-card-image-loading");
    if (overlay) overlay.style.display = "none";
  }
}

async function handleGenerateAllChapterImages() {
  const apiKey = await ensureKieApiKey();
  if (!apiKey) {
    showToast("api.kie.ai API Key is required to generate images.", "warning");
    return;
  }

  const chapters = state.story.chapters && state.story.chapters.length > 0 ? state.story.chapters : state.story.scenes;
  if (!chapters || chapters.length === 0) {
    showToast("No chapters found to generate images for.", "warning");
    return;
  }

  if (el.btnGenAllChapterImages) {
    el.btnGenAllChapterImages.disabled = true;
    el.btnGenAllChapterImages.innerHTML = `<span class="spinner"></span> Generating All Images...`;
  }

  showToast(`Generating images for all ${chapters.length} chapters with Seedream 5.0 Pro...`, "info");

  let successCount = 0;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chNum = ch.chapterNumber || ch.sceneNumber || (i + 1);
    const card = el.scenesGrid ? el.scenesGrid.querySelector(`.scene-card[data-scene-num="${chNum}"]`) : null;

    if (card) {
      const loadingOverlay = card.querySelector(".scene-card-image-loading");
      if (loadingOverlay) loadingOverlay.style.display = "flex";
    }

    try {
      const aspectRatio = (el.imgAspectRatioSelect && el.imgAspectRatioSelect.value) || "16:9";
      const finalPrompt = ch.imagePrompt || buildDefaultChapterImagePrompt(ch, state.story.title, state.story.prompt);
      ch.imagePrompt = finalPrompt;

      const result = await generateChapterImageApi({
        apiKey,
        storyId: state.story.id,
        chapterNumber: chNum,
        sceneNumber: chNum,
        prompt: finalPrompt,
        aspectRatio,
        quality: "basic",
        outputFormat: "png"
      });

      if (result.imageUrl) {
        ch.imageUrl = result.imageUrl;
        successCount++;
        if (card) {
          const imgWrap = card.querySelector(`#imgWrap_${chNum}`);
          if (imgWrap) {
            imgWrap.innerHTML = `
              <img class="scene-card-image" src="${escapeHtml(result.imageUrl)}" alt="Chapter ${chNum} Artwork" loading="lazy">
              <div class="scene-image-overlay-actions">
                <button type="button" class="btn-img-action btn-regen-img" title="Regenerate with Seedream 5.0 Pro">🔄 Regen</button>
                <button type="button" class="btn-img-action btn-prompt-toggle" title="View / Edit Visual Prompt">📝 Prompt</button>
                <a href="${escapeHtml(result.imageUrl)}" target="_blank" class="btn-img-action" title="Open Full Size">🔍 View</a>
              </div>
              <div class="scene-card-image-loading" style="display:none;">
                <div class="spinner"></div>
                <span>Generating with Seedream 5.0 Pro...</span>
              </div>
            `;
            setupCardImageListeners(card, ch, chNum);
          }
        }
      }
    } catch (err) {
      console.warn(`Error generating image for Chapter ${chNum}:`, err.message);
    } finally {
      if (card) {
        const overlay = card.querySelector(".scene-card-image-loading");
        if (overlay) overlay.style.display = "none";
      }
    }
  }

  await saveStoryToServer();

  if (el.btnGenAllChapterImages) {
    el.btnGenAllChapterImages.disabled = false;
    el.btnGenAllChapterImages.innerHTML = `✨ Generate All Images`;
  }

  showToast(`Completed! ${successCount}/${chapters.length} chapter images generated with Seedream 5.0 Pro.`, "success");
}
