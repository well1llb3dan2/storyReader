/**
 * Open Book Novel Reader & 2-Page Spread Pagination Engine
 */
import { state } from '../state/store.js';
import { el } from './domElements.js';
import { escapeHtml, cleanChapterTitle } from './utils.js';
import { formatProseWithSpeakerTags } from './textFormatter.js';

/**
 * Tokenizes an HTML paragraph into tags, non-whitespace words, and spaces.
 */
export function tokenizeHtmlParagraph(html) {
  const tokens = [];
  const tagRegex = /<(\/?)([\w-]+)([^>]*)>|([^\s<]+)|(\s+)/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    if (match[2]) {
      const isClosing = match[1] === '/';
      const tagName = match[2].toLowerCase();
      const rawTag = match[0];
      const isSelfClosing = rawTag.endsWith('/>') || ['br', 'img', 'hr', 'input'].includes(tagName);
      tokens.push({
        type: 'tag',
        isClosing,
        tagName,
        rawTag,
        isSelfClosing
      });
    } else if (match[4]) {
      tokens.push({
        type: 'word',
        text: match[4]
      });
    } else if (match[5]) {
      tokens.push({
        type: 'space',
        text: match[5]
      });
    }
  }
  return tokens;
}

/**
 * Counts the number of word tokens.
 */
export function countWords(tokens) {
  let count = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'word') count++;
  }
  return count;
}

/**
 * Splits tokenized HTML at word index k (1-based count of words for part1).
 * Closes unclosed formatting tags on part1, and reopens them on part2 with <p class="no-indent">.
 */
export function splitTokensAtWord(tokens, k) {
  const totalWords = countWords(tokens);
  if (k <= 0) {
    return {
      part1: '',
      part2: tokens.map(t => (t.type === 'tag' ? t.rawTag : t.text)).join('')
    };
  }
  if (k >= totalWords) {
    return {
      part1: tokens.map(t => (t.type === 'tag' ? t.rawTag : t.text)).join(''),
      part2: ''
    };
  }

  let wordsCount = 0;
  let part1Html = '';
  const openStack = [];
  let splitTokenIndex = tokens.length;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'tag') {
      if (token.isClosing) {
        for (let s = openStack.length - 1; s >= 0; s--) {
          if (openStack[s].tagName === token.tagName) {
            openStack.splice(s, 1);
            break;
          }
        }
        part1Html += token.rawTag;
      } else {
        if (!token.isSelfClosing) {
          openStack.push({ tagName: token.tagName, rawTag: token.rawTag });
        }
        part1Html += token.rawTag;
      }
    } else if (token.type === 'word') {
      wordsCount++;
      part1Html += token.text;
      if (wordsCount === k) {
        splitTokenIndex = i + 1;
        break;
      }
    } else if (token.type === 'space') {
      part1Html += token.text;
    }
  }

  // Close any tags left unclosed in part1 in reverse order
  const unclosedTags = [...openStack];
  for (let i = unclosedTags.length - 1; i >= 0; i--) {
    part1Html += `</${unclosedTags[i].tagName}>`;
  }

  // Build part 2 (continuation paragraph)
  let part2Html = '<p class="no-indent">';
  const part2OpenStack = [];

  // Reopen any nested formatting tags (excluding 'p' and dropcap span)
  for (const tagInfo of unclosedTags) {
    if (tagInfo.tagName !== 'p' && !tagInfo.rawTag.includes('dropcap')) {
      part2Html += tagInfo.rawTag;
      part2OpenStack.push({ tagName: tagInfo.tagName, rawTag: tagInfo.rawTag });
    }
  }

  let hasWordsInPart2 = false;
  for (let i = splitTokenIndex; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'tag') {
      if (token.tagName === 'p' && token.isClosing) {
        continue;
      }
      if (token.isClosing) {
        let found = false;
        for (let s = part2OpenStack.length - 1; s >= 0; s--) {
          if (part2OpenStack[s].tagName === token.tagName) {
            part2OpenStack.splice(s, 1);
            found = true;
            break;
          }
        }
        if (found) {
          part2Html += token.rawTag;
        }
      } else {
        if (!token.isSelfClosing) {
          part2OpenStack.push({ tagName: token.tagName, rawTag: token.rawTag });
        }
        part2Html += token.rawTag;
      }
    } else if (token.type === 'word') {
      hasWordsInPart2 = true;
      part2Html += token.text;
    } else if (token.type === 'space') {
      if (hasWordsInPart2) {
        part2Html += token.text;
      }
    }
  }

  for (let i = part2OpenStack.length - 1; i >= 0; i--) {
    part2Html += `</${part2OpenStack[i].tagName}>`;
  }
  part2Html += '</p>';

  // Clean any empty formatting tags
  part1Html = part1Html.replace(/<(em|strong|span|code|b|i)[^>]*><\/\1>/g, '');
  part2Html = part2Html.replace(/<(em|strong|span|code|b|i)[^>]*><\/\1>/g, '');

  return {
    part1: part1Html,
    part2: hasWordsInPart2 ? part2Html : ''
  };
}

/**
 * Creates or retrieves the off-screen DOM measurement container.
 */
function getMeasurementContainer() {
  let measurer = document.getElementById('pagination-measurer');
  if (!measurer) {
    measurer = document.createElement('div');
    measurer.id = 'pagination-measurer';
    measurer.className = 'page-inner-body';
    measurer.style.position = 'absolute';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.top = '-9999px';
    measurer.style.left = '-9999px';
    measurer.style.margin = '0';
    measurer.style.padding = '0';
    measurer.style.overflow = 'visible';
    measurer.style.height = 'auto';
    measurer.style.maxHeight = 'none';
    document.body.appendChild(measurer);
  }

  // Get current width and height of reader page body
  let targetWidth = 480;
  let targetHeight = 520;

  if (el.pageLeftBody) {
    const w = el.pageLeftBody.clientWidth;
    const h = el.pageLeftBody.clientHeight;
    if (w > 100) targetWidth = w;
    if (h > 100) targetHeight = h;
  }

  measurer.style.width = `${targetWidth}px`;
  measurer.style.fontSize = `${state.reader.fontSize}px`;

  return { measurer, maxHeight: targetHeight - 2 };
}

export function paginateNovel() {
  const pages = [];
  const chapters = (state.story.chapters && state.story.chapters.length > 0)
    ? state.story.chapters.filter(s => s.content && s.content.trim().length > 0)
    : state.story.scenes.filter(s => s.content && s.content.trim().length > 0);

  if (chapters.length === 0) {
    pages.push({
      pageNum: 1,
      chapterNum: 1,
      sceneNum: 1,
      chapterTitle: 'Opening',
      sceneTitle: 'Opening',
      html: `<p style="text-align:center; padding-top:100px; color:var(--book-subtext);">No chapters written yet. Please generate chapters to begin reading.</p>`
    });
    state.reader.pages = pages;
    return;
  }

  const { measurer, maxHeight } = getMeasurementContainer();
  let globalPageNum = 1;

  chapters.forEach((ch, idx) => {
    const chNum = ch.chapterNumber || ch.sceneNumber || (idx + 1);
    const chapterTitle = cleanChapterTitle(ch.title, chNum);
    const paragraphs = ch.content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    let isFirstPageOfChapter = true;
    let currentPageHtml = '';

    const chapterOpenerHtml = `
      <div class="chapter-opener">
        <div class="chapter-number-label">Chapter ${chNum}</div>
        <h2 class="chapter-title-label">${escapeHtml(chapterTitle)}</h2>
        ${ch.imageUrl ? `<div class="reader-scene-illustration"><img src="${escapeHtml(ch.imageUrl)}" alt="${escapeHtml(chapterTitle)}"></div>` : `<div class="chapter-ornament">❦  ❦  ❦</div>`}
      </div>
    `;

    currentPageHtml = chapterOpenerHtml;

    paragraphs.forEach((pText, pIdx) => {
      const formattedP = formatProseWithSpeakerTags(pText);

      let renderedP = '';
      if (isFirstPageOfChapter && pIdx === 0 && !pText.startsWith('<') && !pText.startsWith('[')) {
        // Find first alphabetic character for dropcap
        const match = pText.match(/^([“"']?)([A-Za-z])/);
        if (match) {
          const quote = match[1] || '';
          const letter = match[2];
          const strippedP = formattedP.replace(/^[“"']?[A-Za-z]/, '');
          renderedP = `<p class="has-dropcap">${quote}<span class="dropcap">${letter}</span>${strippedP}</p>`;
        } else {
          renderedP = `<p>${formattedP}</p>`;
        }
      } else {
        renderedP = `<p>${formattedP}</p>`;
      }

      // Fill current page and wrap line-by-line across subsequent pages
      while (renderedP && renderedP.trim().length > 0) {
        measurer.innerHTML = currentPageHtml + renderedP;

        if (measurer.scrollHeight <= maxHeight) {
          currentPageHtml += renderedP;
          renderedP = '';
          break;
        }

        // Paragraph does not fit entirely. Find exact word count that fits.
        const tokens = tokenizeHtmlParagraph(renderedP);
        const totalWords = countWords(tokens);

        if (totalWords === 0) {
          currentPageHtml += renderedP;
          renderedP = '';
          break;
        }

        let low = 0;
        let high = totalWords;
        let bestK = 0;
        let bestPart1 = '';
        let bestPart2 = renderedP;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (mid === 0) {
            low = mid + 1;
            continue;
          }

          const { part1, part2 } = splitTokensAtWord(tokens, mid);
          measurer.innerHTML = currentPageHtml + part1;

          if (measurer.scrollHeight <= maxHeight) {
            bestK = mid;
            bestPart1 = part1;
            bestPart2 = part2;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (bestK > 0) {
          currentPageHtml += bestPart1;
          pages.push({
            pageNum: globalPageNum++,
            chapterNum: chNum,
            sceneNum: chNum,
            chapterTitle: chapterTitle,
            sceneTitle: chapterTitle,
            html: currentPageHtml
          });

          currentPageHtml = '';
          renderedP = bestPart2;
          isFirstPageOfChapter = false;
        } else {
          // If not even 1 word fits on current page, flush the current page
          if (currentPageHtml.trim().length > 0) {
            pages.push({
              pageNum: globalPageNum++,
              chapterNum: chNum,
              sceneNum: chNum,
              chapterTitle: chapterTitle,
              sceneTitle: chapterTitle,
              html: currentPageHtml
            });
            currentPageHtml = '';
            isFirstPageOfChapter = false;
          } else {
            // Fresh page cannot fit 1 word: force 1 word to prevent infinite loop
            const forced = splitTokensAtWord(tokens, 1);
            currentPageHtml = forced.part1;
            pages.push({
              pageNum: globalPageNum++,
              chapterNum: chNum,
              sceneNum: chNum,
              chapterTitle: chapterTitle,
              sceneTitle: chapterTitle,
              html: currentPageHtml
            });
            currentPageHtml = '';
            renderedP = forced.part2;
            isFirstPageOfChapter = false;
          }
        }
      }
    });

    if (currentPageHtml.trim().length > 0) {
      pages.push({
        pageNum: globalPageNum++,
        chapterNum: chNum,
        sceneNum: chNum,
        chapterTitle: chapterTitle,
        sceneTitle: chapterTitle,
        html: currentPageHtml
      });
      currentPageHtml = '';
    }
  });

  state.reader.pages = pages;
}

export function renderCurrentSpread(updateAudioBarCallback) {
  const pages = state.reader.pages;
  const totalPages = pages.length;
  const spreadIndex = state.reader.currentSpreadIndex;

  const leftPageIndex = spreadIndex * 2;
  const rightPageIndex = spreadIndex * 2 + 1;

  const leftPageData = pages[leftPageIndex];
  const rightPageData = pages[rightPageIndex];

  if (leftPageData) {
    el.pageLeftHeader.textContent = state.story.title || 'Novel';
    el.pageLeftBody.innerHTML = leftPageData.html;
    el.pageLeftNum.textContent = leftPageData.pageNum;
    el.pageLeft.style.visibility = 'visible';
  } else {
    el.pageLeft.style.visibility = 'hidden';
  }

  if (rightPageData) {
    const chNum = rightPageData.chapterNum || rightPageData.sceneNum;
    const chTitle = rightPageData.chapterTitle || rightPageData.sceneTitle;
    el.pageRightHeader.textContent = `Chapter ${chNum}: ${chTitle}`;
    el.pageRightBody.innerHTML = rightPageData.html;
    el.pageRightNum.textContent = rightPageData.pageNum;
    el.pageRight.style.visibility = 'visible';
  } else {
    el.pageRightHeader.textContent = '';
    el.pageRightBody.innerHTML =
      '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--book-subtext); font-family:var(--font-title); font-size:14px; letter-spacing:2px;">— THE END —</div>';
    el.pageRightNum.textContent = '';
    el.pageRight.style.visibility = 'visible';
  }

  const activePageNum = leftPageData ? leftPageData.pageNum : 1;
  el.readerPageCurrent.textContent = activePageNum;
  el.readerPageTotal.textContent = totalPages;
  el.readerBookTitle.textContent = state.story.title;

  const activeChapter = leftPageData || rightPageData;
  if (activeChapter) {
    const chNum = activeChapter.chapterNum || activeChapter.sceneNum;
    const chTitle = activeChapter.chapterTitle || activeChapter.sceneTitle;
    el.readerCurrentSceneIndicator.textContent = `Chapter ${chNum}: ${chTitle}`;
  }

  el.btnPrevPage.disabled = spreadIndex === 0;
  const maxSpread = Math.ceil(totalPages / 2) - 1;
  el.btnNextPage.disabled = spreadIndex >= maxSpread;

  if (typeof updateAudioBarCallback === 'function') {
    updateAudioBarCallback();
  }
}

export function prevPageSpread(updateAudioBarCallback) {
  if (state.reader.currentSpreadIndex > 0) {
    state.reader.currentSpreadIndex -= 1;
    animatePageTurn('prev');
    renderCurrentSpread(updateAudioBarCallback);
  }
}

export function nextPageSpread(updateAudioBarCallback) {
  const maxSpread = Math.ceil(state.reader.pages.length / 2) - 1;
  if (state.reader.currentSpreadIndex < maxSpread) {
    state.reader.currentSpreadIndex += 1;
    animatePageTurn('next');
    renderCurrentSpread(updateAudioBarCallback);
  }
}

export function animatePageTurn(direction) {
  const spread = document.getElementById('bookSpread');
  if (!spread) return;
  spread.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
  spread.style.transform = direction === 'next' ? 'scale(0.99) rotateY(-1deg)' : 'scale(0.99) rotateY(1deg)';
  setTimeout(() => {
    spread.style.transform = 'none';
  }, 150);
}

export function getCurrentlyViewingSceneNum() {
  const pages = state.reader.pages;
  const spreadIndex = state.reader.currentSpreadIndex;
  const leftPage = pages[spreadIndex * 2];
  const rightPage = pages[spreadIndex * 2 + 1];
  return leftPage ? (leftPage.chapterNum || leftPage.sceneNum) : rightPage ? (rightPage.chapterNum || rightPage.sceneNum) : 1;
}

export function renderTOC(updateAudioBarCallback) {
  el.tocList.innerHTML = '';
  const chapters = (state.story.chapters && state.story.chapters.length > 0)
    ? state.story.chapters.filter(s => s.content)
    : state.story.scenes.filter(s => s.content);

  chapters.forEach((ch, idx) => {
    const chNum = ch.chapterNumber || ch.sceneNumber || (idx + 1);
    const pageIndex = state.reader.pages.findIndex(p => (p.chapterNum === chNum || p.sceneNum === chNum));
    const pageNum = pageIndex !== -1 ? state.reader.pages[pageIndex].pageNum : 1;
    const cleanTitle = cleanChapterTitle(ch.title, chNum);

    const item = document.createElement('div');
    item.className = 'toc-item';
    item.innerHTML = `
      <span class="toc-item-title">Chapter ${chNum}: ${escapeHtml(cleanTitle)}</span>
      <span class="toc-item-page">Page ${pageNum}</span>
    `;

    item.addEventListener('click', () => {
      el.tocModal.classList.remove('show');
      const targetSpread = Math.floor(pageIndex / 2);
      state.reader.currentSpreadIndex = Math.max(0, targetSpread);
      renderCurrentSpread(updateAudioBarCallback);
    });

    el.tocList.appendChild(item);
  });
}
