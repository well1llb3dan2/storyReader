/**
 * DOM Elements Cache
 */

/**
 * DOM Elements Cache (Dynamic Proxy for Safe DOM Resolution)
 */

function getEl(id) {
  return document.getElementById(id);
}

export const el = {
  // Stage Views
  stageViews: {
    get concept() { return getEl("stage-concept"); },
    get baseStory() { return getEl("stage-base-story"); },
    get characters() { return getEl("stage-characters"); },
    get storyboard() { return getEl("stage-storyboard"); },
    get generating() { return getEl("stage-generating"); },
    get reader() { return getEl("stage-reader"); }
  },
  stepNavs: {
    get concept() { return getEl("step-nav-1"); },
    get outline() { return getEl("step-nav-2"); },
    get characters() { return getEl("step-nav-characters"); },
    get storyboard() { return getEl("step-nav-3"); },
    get generating() { return getEl("step-nav-4"); },
    get reader() { return getEl("step-nav-5"); }
  },
  // Header Status
  get ollamaStatusBadge() { return getEl("ollamaStatusBadge"); },
  get statusText() { return getEl("statusText"); },
  get btnOpenSavedModal() { return getEl("btnOpenSavedModal"); },

  // Stage 1: Premise
  get promptInput() { return getEl("promptInput"); },
  get titleInput() { return getEl("titleInput"); },
  get sceneCountInput() { return getEl("sceneCountInput"); },
  get sceneCountDisplay() { return getEl("sceneCountDisplay"); },
  get totalWordsInput() { return getEl("totalWordsInput"); },
  get totalWordsDisplay() { return getEl("totalWordsDisplay"); },
  get novelMathBanner() { return getEl("novelMathBanner"); },
  get novelMathFormula() { return getEl("novelMathFormula"); },
  get novelScopeBadge() { return getEl("novelScopeBadge"); },
  get novelDensityBadge() { return getEl("novelDensityBadge"); },
  get novelPacingAdvice() { return getEl("novelPacingAdvice"); },
  get novelPresetContainer() { return getEl("novelPresetContainer"); },
  get readingLevelSelect() { return getEl("readingLevelSelect"); },
  get readingLevelGradeBadge() { return getEl("readingLevelGradeBadge"); },
  get readingLevelDesc() { return getEl("readingLevelDesc"); },
  get modelSelect() { return getEl("modelSelect"); },
  get btnGenerateStoryboard() { return getEl("btnGenerateStoryboard"); },
  get btnRunFullPipeline() { return getEl("btnRunFullPipeline"); },

  // Stage 2: Story Outline (Narrative Architect)
  get baseStoryTitle() { return getEl("baseStoryTitle"); },
  get baseStoryPromptSummary() { return getEl("baseStoryPromptSummary"); },
  get baseStoryScenesBadge() { return getEl("baseStoryScenesBadge"); },
  get baseStoryModelBadge() { return getEl("baseStoryModelBadge"); },
  get btnBackToPremiseFromBase() { return getEl("btnBackToPremiseFromBase"); },
  get btnBackToPremiseFromBaseBottom() { return getEl("btnBackToPremiseFromBaseBottom"); },
  get btnRegenBaseStory() { return getEl("btnRegenBaseStory"); },
  get btnConfirmBaseStory() { return getEl("btnConfirmBaseStory"); },
  get btnConfirmBaseStoryBottom() { return getEl("btnConfirmBaseStoryBottom"); },
  get baseStoryThinkingWrap() { return getEl("baseStoryThinkingWrap"); },
  get thinkingHeader() { return getEl("thinkingHeader"); },
  get thinkingStatusBadge() { return getEl("thinkingStatusBadge"); },
  get btnToggleThinking() { return getEl("btnToggleThinking"); },
  get baseStoryThinkingBody() { return getEl("baseStoryThinkingBody"); },
  get baseStoryThinkingContent() { return getEl("baseStoryThinkingContent"); },
  get baseLiveStreamDot() { return getEl("baseLiveStreamDot"); },
  get baseLiveStreamStatus() { return getEl("baseLiveStreamStatus"); },
  get baseStoryLiveWordCount() { return getEl("baseStoryLiveWordCount"); },
  get baseStoryTextarea() { return getEl("baseStoryTextarea"); },
  get baseStoryLiveContent() { return getEl("baseStoryLiveContent"); },

  // Stage 2.5: Characters (Character Designer)
  get charactersStoryTitle() { return getEl("charactersStoryTitle"); },
  get charactersPromptSummary() { return getEl("charactersPromptSummary"); },
  get charactersCountBadge() { return getEl("charactersCountBadge"); },
  get btnBackToOutlineFromChars() { return getEl("btnBackToOutlineFromChars"); },
  get btnBackToOutlineFromCharsBottom() { return getEl("btnBackToOutlineFromCharsBottom"); },
  get btnRegenCharacters() { return getEl("btnRegenCharacters"); },
  get btnConfirmCharacters() { return getEl("btnConfirmCharacters"); },
  get btnConfirmCharactersBottom() { return getEl("btnConfirmCharactersBottom"); },
  get charactersThinkingWrap() { return getEl("charactersThinkingWrap"); },
  get charactersThinkingHeader() { return getEl("charactersThinkingHeader"); },
  get charactersThinkingStatusBadge() { return getEl("charactersThinkingStatusBadge"); },
  get btnToggleCharactersThinking() { return getEl("btnToggleCharactersThinking"); },
  get charactersThinkingBody() { return getEl("charactersThinkingBody"); },
  get charactersThinkingContent() { return getEl("charactersThinkingContent"); },
  get charactersLiveStreamDot() { return getEl("charactersLiveStreamDot"); },
  get charactersLiveStreamStatus() { return getEl("charactersLiveStreamStatus"); },
  get charactersLiveWordCount() { return getEl("charactersLiveWordCount"); },
  get charactersTextarea() { return getEl("charactersTextarea"); },

  // Stage 3: Storyboard (Storyboard Creator)
  get sbStoryTitle() { return getEl("sbStoryTitle"); },
  get sbSceneCountBadge() { return getEl("sbSceneCountBadge"); },
  get sbEstimatedWords() { return getEl("sbEstimatedWords"); },
  get sbStoryPromptSummary() { return getEl("sbStoryPromptSummary"); },
  get scenesGrid() { return getEl("scenesGrid"); },
  get btnBackToConcept() { return getEl("btnBackToConcept"); },
  get btnBackToCharacters() { return getEl("btnBackToCharacters"); },
  get btnRegenStoryboard() { return getEl("btnRegenStoryboard"); },
  get btnContinueToGeneration() { return getEl("btnContinueToGeneration"); },
  get btnContinueToGenerationBottom() { return getEl("btnContinueToGenerationBottom"); },
  get imgAspectRatioSelect() { return getEl("imgAspectRatioSelect"); },
  get btnGenAllChapterImages() { return getEl("btnGenAllChapterImages"); },
  get btnSetKieApiKey() { return getEl("btnSetKieApiKey"); },

  // Stage 4: Generation
  get genStatusTitle() { return getEl("genStatusTitle"); },
  get genProgressCount() { return getEl("genProgressCount"); },
  get genTotalWords() { return getEl("genTotalWords"); },
  get genTimeElapsed() { return getEl("genTimeElapsed"); },
  get genProgressBar() { return getEl("genProgressBar"); },
  get genSubtext() { return getEl("genSubtext"); },
  get btnPauseGen() { return getEl("btnPauseGen"); },
  get btnStopGen() { return getEl("btnStopGen"); },
  get btnViewReaderNow() { return getEl("btnViewReaderNow"); },
  get currentWritingSceneTitle() { return getEl("currentWritingSceneTitle"); },
  get currentSceneSetting() { return getEl("currentSceneSetting"); },
  get currentSceneMood() { return getEl("currentSceneMood"); },
  get currentSceneCharTags() { return getEl("currentSceneCharTags"); },
  get liveTextViewport() { return getEl("liveTextViewport"); },
  get liveTextContent() { return getEl("liveTextContent"); },
  get timelineCountBadge() { return getEl("timelineCountBadge"); },
  get scenesQueueList() { return getEl("scenesQueueList"); },

  // Stage 5: Reader
  get readerBookTitle() { return getEl("readerBookTitle"); },
  get readerCurrentSceneIndicator() { return getEl("readerCurrentSceneIndicator"); },
  get btnPrevPage() { return getEl("btnPrevPage"); },
  get btnNextPage() { return getEl("btnNextPage"); },
  get readerPageCurrent() { return getEl("readerPageCurrent"); },
  get readerPageTotal() { return getEl("readerPageTotal"); },
  get btnFontDec() { return getEl("btnFontDec"); },
  get btnFontInc() { return getEl("btnFontInc"); },
  get btnExportMenu() { return getEl("btnExportMenu"); },
  get exportDropdown() { return getEl("exportDropdown"); },
  get btnExportMD() { return getEl("btnExportMD"); },
  get btnExportTXT() { return getEl("btnExportTXT"); },
  get btnExportPrint() { return getEl("btnExportPrint"); },
  get btnExportJSON() { return getEl("btnExportJSON"); },
  get btnNewStory() { return getEl("btnNewStory"); },
  get pageLeft() { return getEl("pageLeft"); },
  get pageRight() { return getEl("pageRight"); },
  get pageLeftHeader() { return getEl("pageLeftHeader"); },
  get pageRightHeader() { return getEl("pageRightHeader"); },
  get pageLeftBody() { return getEl("pageLeftBody"); },
  get pageRightBody() { return getEl("pageRightBody"); },
  get pageLeftNum() { return getEl("pageLeftNum"); },
  get pageRightNum() { return getEl("pageRightNum"); },
  get hitboxLeft() { return getEl("hitboxLeft"); },
  get hitboxRight() { return getEl("hitboxRight"); },
  get btnReaderTOC() { return getEl("btnReaderTOC"); },

  // Modals
  get tocModal() { return getEl("tocModal"); },
  get tocList() { return getEl("tocList"); },
  get btnCloseTOC() { return getEl("btnCloseTOC"); },
  get savedModal() { return getEl("savedModal"); },
  get savedStoriesList() { return getEl("savedStoriesList"); },
  get btnCloseSaved() { return getEl("btnCloseSaved"); },
  get toastNotification() { return getEl("toastNotification"); }
};
