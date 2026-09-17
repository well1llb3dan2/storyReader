/**
 * Central State Store & API Key Management
 */
import { el } from '../modules/domElements.js';
import { showToast } from '../modules/utils.js';

export const state = {
  stage: 'concept', // 'concept' | 'outline' | 'characters' | 'storyboard' | 'generating' | 'reader'
  story: {
    id: null,
    title: 'Untitled Novel',
    prompt: '',
    outline: '',
    initialWriting: '',
    charactersMarkdown: '',
    characters: [],
    targetChapterCount: 20,
    targetSceneCount: 20,
    targetTotalWords: 50000,
    targetWordsPerChapter: 2500,
    readingLevel: 'general_commercial',
    genreId: null,
    model: 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P',
    createdAt: null,
    chapters: [],
    scenes: [] // Synced alias
  },
  generation: {
    isRunning: false,
    isPaused: false,
    currentIndex: 0,
    startTime: null,
    timerInterval: null,
    abortController: null,
    totalWords: 0
  },
  reader: {
    currentSpreadIndex: 0,
    pages: [],
    fontSize: 17,
    theme: 'theme-parchment',
    showSpeakerTags: false
  },
  ollamaStatus: {
    connected: false,
    models: []
  },
  apiKey: localStorage.getItem('kie_api_key') || '',
  tts: {
    apiKey: localStorage.getItem('kie_api_key') || ''
  }
};

export function syncApiKeyAcrossUI(key) {
  const trimmed = (key || '').trim();
  state.apiKey = trimmed;
  if (!state.tts) state.tts = {};
  state.tts.apiKey = trimmed;
  if (el.kieApiKeyInput) el.kieApiKeyInput.value = trimmed;
  if (el.conceptKieApiKeyInput) el.conceptKieApiKeyInput.value = trimmed;

  if (trimmed) {
    if (el.conceptKeySavedBadge) el.conceptKeySavedBadge.style.display = 'inline-block';
    if (el.headerApiKeyLabel) el.headerApiKeyLabel.textContent = 'Key Active ✓';
  } else {
    if (el.conceptKeySavedBadge) el.conceptKeySavedBadge.style.display = 'none';
    if (el.headerApiKeyLabel) el.headerApiKeyLabel.textContent = 'kie.ai Key';
  }
}

export function getEffectiveApiKey() {
  return (
    state.apiKey ||
    (state.tts && state.tts.apiKey) ||
    localStorage.getItem('kie_api_key') ||
    (el.kieApiKeyInput && el.kieApiKeyInput.value.trim()) ||
    (el.conceptKieApiKeyInput && el.conceptKieApiKeyInput.value.trim()) ||
    ''
  );
}

export function saveApiKey(key) {
  const trimmed = (key || '').trim();
  syncApiKeyAcrossUI(trimmed);
  if (trimmed) {
    localStorage.setItem('kie_api_key', trimmed);
    showToast('kie.ai API Key saved and persistent across refreshes!', 'success');
  } else {
    localStorage.removeItem('kie_api_key');
    showToast('kie.ai API Key cleared from storage.', 'info');
  }
}
