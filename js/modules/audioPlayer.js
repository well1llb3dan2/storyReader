/**
 * Reader Embedded Audio Player Controls
 */
import { el } from './domElements.js';
import { formatAudioTime } from './utils.js';

export function setupAudioPlayerListeners({ onAudioPlayRequested }) {
  el.btnAudioPlayPause.addEventListener('click', () => {
    toggleAudioPlayPause(onAudioPlayRequested);
  });

  el.novelAudioElement.addEventListener('timeupdate', () => {
    const cur = el.novelAudioElement.currentTime;
    const dur = el.novelAudioElement.duration || 0;
    el.audioCurrentTime.textContent = formatAudioTime(cur);
    el.audioDuration.textContent = formatAudioTime(dur);
    if (dur > 0) {
      el.audioSeekBar.value = (cur / dur) * 100;
    }
  });

  el.audioSeekBar.addEventListener('input', (e) => {
    const dur = el.novelAudioElement.duration || 0;
    if (dur > 0) {
      el.novelAudioElement.currentTime = (e.target.value / 100) * dur;
    }
  });

  el.novelAudioElement.addEventListener('ended', () => {
    el.btnAudioPlayPause.textContent = '▶';
  });

  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const speed = parseFloat(e.currentTarget.dataset.speed) || 1;
      el.novelAudioElement.playbackRate = speed;
    });
  });
}

export function toggleAudioPlayPause(onAudioPlayRequested) {
  if (
    !el.novelAudioElement.src ||
    el.novelAudioElement.src.endsWith('/null') ||
    el.novelAudioElement.src === window.location.href
  ) {
    if (typeof onAudioPlayRequested === 'function') {
      onAudioPlayRequested();
    }
    return;
  }

  if (el.novelAudioElement.paused) {
    el.novelAudioElement.play();
    el.btnAudioPlayPause.textContent = '⏸';
  } else {
    el.novelAudioElement.pause();
    el.btnAudioPlayPause.textContent = '▶';
  }
}
