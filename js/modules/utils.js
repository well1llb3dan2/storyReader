/**
 * Shared Utilities
 */
import { el } from './domElements.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export function showToast(message, type = 'info') {
  if (!el.toastNotification) return;
  el.toastNotification.textContent = message;
  el.toastNotification.className = `toast-notification show ${type}`;
  setTimeout(() => {
    el.toastNotification.classList.remove('show');
  }, 4000);
}

export function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getActForScene(sceneNum, totalScenes) {
  const fraction = sceneNum / totalScenes;
  if (fraction <= 0.25) return 'I';
  if (fraction <= 0.50) return 'II-A';
  if (fraction <= 0.75) return 'II-B';
  return 'III';
}

export function cleanChapterTitle(title, sceneNumber = 1) {
  if (!title) return `Scene ${sceneNumber}`;
  let clean = String(title).trim();
  while (/^(?:chapter|scene)\s*\d+[:\s\-\.]*\s*/i.test(clean) || /^\d+[:\s\-\.]+\s*/.test(clean)) {
    clean = clean.replace(/^(?:chapter|scene)\s*\d+[:\s\-\.]*\s*/i, '');
    clean = clean.replace(/^\d+[:\s\-\.]+\s*/, '');
    clean = clean.trim();
  }
  return clean || `Scene ${sceneNumber}`;
}

export function generateFallbackTitle(prompt) {
  const words = prompt.split(/\s+/).slice(0, 4).join(' ');
  return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : 'The Untold Story';
}
