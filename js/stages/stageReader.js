/**
 * Stage 5: Complete Novel Reader & Book Engine
 */
import { state } from "../state/store.js";
import { el } from "../modules/domElements.js";
import {
  paginateNovel,
  renderCurrentSpread,
  prevPageSpread,
  nextPageSpread,
  getCurrentlyViewingSceneNum,
  renderTOC
} from "../modules/paginationEngine.js";
import { exportNovel } from "../modules/novelExporter.js";

export function setupReaderListeners({ onNewStoryRequested, onOpenSavedModal }) {
  // Navigation
  if (el.btnPrevPage) el.btnPrevPage.addEventListener("click", () => prevPageSpread());
  if (el.btnNextPage) el.btnNextPage.addEventListener("click", () => nextPageSpread());
  if (el.hitboxLeft) el.hitboxLeft.addEventListener("click", () => prevPageSpread());
  if (el.hitboxRight) el.hitboxRight.addEventListener("click", () => nextPageSpread());

  // Keyboard Arrow navigation for book reading
  document.addEventListener("keydown", (e) => {
    if (state.stage !== "reader") return;
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      prevPageSpread();
    } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      nextPageSpread();
    }
  });

  // Font Sizing
  if (el.btnFontDec) {
    el.btnFontDec.addEventListener("click", () => {
      if (state.reader.fontSize > 13) {
        const curScene = getCurrentlyViewingSceneNum();
        state.reader.fontSize -= 1;
        document.documentElement.style.setProperty("--novel-font-size", `${state.reader.fontSize}px`);
        paginateNovel();
        const pageIndex = state.reader.pages.findIndex(p => p.sceneNum === curScene);
        if (pageIndex !== -1) {
          state.reader.currentSpreadIndex = Math.min(
            Math.floor(pageIndex / 2),
            Math.max(0, Math.ceil(state.reader.pages.length / 2) - 1)
          );
        }
        renderCurrentSpread();
      }
    });
  }

  if (el.btnFontInc) {
    el.btnFontInc.addEventListener("click", () => {
      if (state.reader.fontSize < 24) {
        const curScene = getCurrentlyViewingSceneNum();
        state.reader.fontSize += 1;
        document.documentElement.style.setProperty("--novel-font-size", `${state.reader.fontSize}px`);
        paginateNovel();
        const pageIndex = state.reader.pages.findIndex(p => p.sceneNum === curScene);
        if (pageIndex !== -1) {
          state.reader.currentSpreadIndex = Math.min(
            Math.floor(pageIndex / 2),
            Math.max(0, Math.ceil(state.reader.pages.length / 2) - 1)
          );
        }
        renderCurrentSpread();
      }
    });
  }

  // Responsive Resize
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    if (state.stage !== "reader") return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const curScene = getCurrentlyViewingSceneNum();
      paginateNovel();
      const pageIndex = state.reader.pages.findIndex(p => p.sceneNum === curScene);
      if (pageIndex !== -1) {
        state.reader.currentSpreadIndex = Math.min(
          Math.floor(pageIndex / 2),
          Math.max(0, Math.ceil(state.reader.pages.length / 2) - 1)
        );
      }
      renderCurrentSpread();
    }, 150);
  });

  // Theme Switcher
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      const theme = e.currentTarget.dataset.theme;
      e.currentTarget.classList.add("active");
      document.body.className = theme;
      state.reader.theme = theme;
    });
  });

  // Export Dropdown
  if (el.btnExportMenu) {
    el.btnExportMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.exportDropdown) el.exportDropdown.classList.toggle("show");
    });
  }

  document.addEventListener("click", () => {
    if (el.exportDropdown) el.exportDropdown.classList.remove("show");
  });

  if (el.btnExportMD) el.btnExportMD.addEventListener("click", () => exportNovel("markdown"));
  if (el.btnExportTXT) el.btnExportTXT.addEventListener("click", () => exportNovel("txt"));
  if (el.btnExportPrint) el.btnExportPrint.addEventListener("click", () => window.print());
  if (el.btnExportJSON) el.btnExportJSON.addEventListener("click", () => exportNovel("json"));

  if (el.btnNewStory) {
    el.btnNewStory.addEventListener("click", () => {
      if (confirm("Start a new story premise? (Any saved stories remain in your library)")) {
        if (typeof onNewStoryRequested === "function") {
          onNewStoryRequested();
        }
      }
    });
  }

  // Table of Contents Drawer
  if (el.btnReaderTOC) {
    el.btnReaderTOC.addEventListener("click", () => {
      renderTOC();
      if (el.tocModal) el.tocModal.classList.add("show");
    });
  }
  if (el.btnCloseTOC) el.btnCloseTOC.addEventListener("click", () => el.tocModal.classList.remove("show"));
  if (el.tocModal) {
    el.tocModal.addEventListener("click", (e) => {
      if (e.target === el.tocModal) el.tocModal.classList.remove("show");
    });
  }

  // Saved Stories Modal Trigger
  if (el.btnOpenSavedModal) el.btnOpenSavedModal.addEventListener("click", onOpenSavedModal);
  if (el.btnCloseSaved) el.btnCloseSaved.addEventListener("click", () => el.savedModal.classList.remove("show"));
  if (el.savedModal) {
    el.savedModal.addEventListener("click", (e) => {
      if (e.target === el.savedModal) el.savedModal.classList.remove("show");
    });
  }
}

export function prepareAndOpenReader({ onSetStage }) {
  if (typeof onSetStage === "function") {
    onSetStage("reader");
  }
  paginateNovel();
  state.reader.currentSpreadIndex = 0;
  renderCurrentSpread();
}
