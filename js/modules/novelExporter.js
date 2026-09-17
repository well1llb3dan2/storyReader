/**
 * Novel Exporter Module (Markdown, TXT, JSON, Print)
 */
import { state } from '../state/store.js';
import { showToast, cleanChapterTitle } from './utils.js';

export function exportNovel(format) {
  const { title, prompt, chapters, scenes } = state.story;
  const currentChapters = (chapters && chapters.length > 0) ? chapters : scenes;
  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';

  if (format === 'markdown') {
    mimeType = 'text/markdown';
    extension = 'md';
    content = `# ${title}\n\n*Original Concept: ${prompt}*\n\n---\n\n`;

    currentChapters.forEach((ch, idx) => {
      const chNum = ch.chapterNumber || ch.sceneNumber || (idx + 1);
      const cleanTitle = cleanChapterTitle(ch.title, chNum);
      content += `## Chapter ${chNum}: ${cleanTitle}\n\n`;
      content += `*Setting: ${ch.setting} | Characters: ${(ch.characters || []).join(', ')}*\n\n`;
      content += `${ch.content || ''}\n\n---\n\n`;
    });
  } else if (format === 'txt') {
    mimeType = 'text/plain';
    extension = 'txt';
    content = `${title.toUpperCase()}\n\n=========================================\n\n`;

    currentChapters.forEach((ch, idx) => {
      const chNum = ch.chapterNumber || ch.sceneNumber || (idx + 1);
      const cleanTitle = cleanChapterTitle(ch.title, chNum);
      content += `CHAPTER ${chNum}: ${cleanTitle.toUpperCase()}\n`;
      content += `Setting: ${ch.setting}\n\n`;
      let cleanContent = (ch.content || '')
        .replace(/\\times/g, '×')
        .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1')
        .replace(/\$([^$]+)\$/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/\[([A-Za-z0-9\s'\-\.]+)\]\s*/g, '');
      content += `${cleanContent}\n\n-----------------------------------------\n\n`;
    });
  } else if (format === 'json') {
    mimeType = 'application/json';
    extension = 'json';
    content = JSON.stringify(state.story, null, 2);
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported as .${extension}`, 'success');
}
