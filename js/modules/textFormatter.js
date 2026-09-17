/**
 * Novel Prose, Typography, Markdown & LaTeX Cleaning Formatter
 */
import { KNOWN_TONE_TAGS } from '../config/constants.js';
import { escapeHtml } from './utils.js';

/**
 * Cleans raw LaTeX equations, math code artifacts, and converts markdown styling
 * (*italics*, **bold**, etc.) into clean, beautiful typography.
 */
export function cleanLaTeXAndMarkdown(text) {
  if (!text) return '';
  let s = text;

  // 1. Common LaTeX math symbols & operators to Unicode
  s = s.replace(/\\times/g, '×')
       .replace(/\\cdot/g, '·')
       .replace(/\\pm/g, '±')
       .replace(/\\approx/g, '≈')
       .replace(/\\neq/g, '≠')
       .replace(/\\leq/g, '≤')
       .replace(/\\geq/g, '≥')
       .replace(/\\le(?![a-zA-Z])/g, '≤')
       .replace(/\\ge(?![a-zA-Z])/g, '≥')
       .replace(/\\circ/g, '°')
       .replace(/\\infty/g, '∞')
       .replace(/\\alpha/g, 'α')
       .replace(/\\beta/g, 'β')
       .replace(/\\gamma/g, 'γ')
       .replace(/\\delta/g, 'δ')
       .replace(/\\epsilon/g, 'ε')
       .replace(/\\theta/g, 'θ')
       .replace(/\\lambda/g, 'λ')
       .replace(/\\mu/g, 'µ')
       .replace(/\\pi/g, 'π')
       .replace(/\\sigma/g, 'σ')
       .replace(/\\omega/g, 'ω')
       .replace(/\\Delta/g, 'Δ')
       .replace(/\\Omega/g, 'Ω');

  // 2. Unpack LaTeX text commands: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
  s = s.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
  s = s.replace(/\\textit\{([^}]*)\}/g, '*$1*');
  s = s.replace(/\\mathit\{([^}]*)\}/g, '*$1*');
  s = s.replace(/\\mathbf\{([^}]*)\}/g, '**$1**');
  s = s.replace(/\\(?:text|mathrm|operatorname|textnormal|textrm)\{([^}]*)\}/g, '$1');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');

  // 3. Exponents and Superscripts (e.g. 10^{-11} -> 10⁻¹¹ / 10^-11, ^2 -> ², ^3 -> ³)
  s = s.replace(/\^2(?!\d)/g, '²');
  s = s.replace(/\^3(?!\d)/g, '³');
  s = s.replace(/\^\{(-?\d+)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^(-?\d+)/g, '<sup>$1</sup>');

  // 4. Handle LaTeX math blocks ($$...$$ and $...$)
  s = s.replace(/\$\$([^$]+)\$\$/g, '$1');
  s = s.replace(/\$([^$]+)\$/g, (match, inner) => {
    const clean = inner.trim();
    // If single letter variable (e.g., $c$, $G$, $e$), convert to italic
    if (/^[a-zA-Z]$/.test(clean)) {
      return `*${clean}*`;
    }
    return clean;
  });

  // Remove stray LaTeX backslashes before plain words (e.g. \text, \quad)
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  // 5. Convert Markdown bold & italic to HTML tags
  // Triple asterisks / underscores: ***text*** -> <strong><em>text</em></strong>
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');

  // Double asterisks / underscores: **text** -> <strong>text</strong>
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Single asterisk: *text* (e.g., *Chronos*, *italic*) -> <em>text</em>
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // Single underscore: _text_ -> <em>text</em>
  s = s.replace(/(?<=\s|^|>|\()_([^_]+)_(?=\s|[.,;:!?\')>]|$)/g, '<em>$1</em>');

  // Inline code: `code` -> <code>code</code>
  s = s.replace(/`([^`]+)`/g, '<code class="novel-code">$1</code>');

  // Strikethrough: ~~text~~ -> <del>text</del>
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Clean Markdown headers that sometimes appear inside prose (e.g., ### Chapter 1)
  s = s.replace(/^###+\s*/gm, '');

  return s;
}

/**
 * Formats novel prose for typography, markdown, speaker badges, and tone tags
 */
export function formatProseWithSpeakerTags(text) {
  if (!text) return '';

  // 1. Pre-clean LaTeX and markdown syntax
  const cleaned = cleanLaTeXAndMarkdown(text);

  // 2. Handle optional speaker tags and tone tags
  const withTags = cleaned.replace(/\[([A-Za-z0-9\s'\-\.]+)\]/g, (match, inner) => {
    const lower = inner.trim().toLowerCase();
    if (KNOWN_TONE_TAGS.has(lower)) {
      return `<span class="tone-tag">${inner}</span>`;
    }
    return `<span class="speaker-tag">${inner}</span>`;
  });

  return withTags;
}

export function formatNovelProse(text) {
  return formatProseWithSpeakerTags(text);
}
