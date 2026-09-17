const fs = require('fs');
const path = require('path');
const { STORIES_DIR } = require('../config');

/**
 * Helper: Story filesystem paths for structured multi-folder storage
 */
function getStoryPaths(storyId) {
  const safeId = String(storyId || `story_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const base = path.join(STORIES_DIR, safeId);
  return {
    safeId,
    base,
    storyboardDir: path.join(base, 'storyboard'),
    scenesDir: path.join(base, 'scenes'),
    imagesDir: path.join(base, 'images'),
    audioDir: path.join(base, 'audio'),
    speakersDir: path.join(base, 'speakers'),
    storyJson: path.join(base, 'story.json'),
    storyboardJson: path.join(base, 'storyboard', 'storyboard.json'),
    storyboardMd: path.join(base, 'storyboard', 'storyboard.md'),
    novelMd: path.join(base, 'scenes', 'novel.md'),
    speakersJson: path.join(base, 'speakers', 'cast.json'),
    legacyJson: path.join(STORIES_DIR, `${safeId}.json`)
  };
}

/**
 * Ensures all feature sub-folders exist for a story
 */
function ensureStoryDirectories(storyId) {
  const paths = getStoryPaths(storyId);
  [paths.base, paths.storyboardDir, paths.scenesDir, paths.imagesDir, paths.audioDir, paths.speakersDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  return paths;
}

/**
 * Saves complete story into structured sub-directories:
 * - /story.json (complete master state)
 * - /storyboard/storyboard.json, storyboard.md, characters.md
 * - /chapters/chapter_X.md & novel.md (also /scenes/ for backward compatibility)
 * - /images/ (holds generated chapter artwork)
 * - /audio/ (holds synthesized speech MP3s)
 * - /speakers/cast.json (voice actor profile configs)
 */
function saveStoryToDisk(storyData) {
  const storyId = storyData.id || `story_${Date.now()}`;
  storyData.id = storyId;
  storyData.updatedAt = new Date().toISOString();

  const chaptersList = storyData.chapters || storyData.scenes || [];
  storyData.chapters = chaptersList;
  storyData.scenes = chaptersList; // sync alias

  const paths = ensureStoryDirectories(storyId);

  // 1. Master story JSON
  fs.writeFileSync(paths.storyJson, JSON.stringify(storyData, null, 2), 'utf8');

  // Maintain backward-compatible legacy single-file JSON
  try {
    fs.writeFileSync(paths.legacyJson, JSON.stringify(storyData, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Save Story Warning] Failed to update legacy json:', e.message);
  }

  // 2. Storyboard sub-folder: storyboard.json, storyboard.md, characters.md
  const storyboardData = {
    id: storyId,
    title: storyData.title || 'Untitled Novel',
    prompt: storyData.prompt || '',
    targetChapterCount: storyData.targetChapterCount || storyData.targetSceneCount || chaptersList.length,
    chapterCount: chaptersList.length,
    updatedAt: storyData.updatedAt,
    charactersMarkdown: storyData.charactersMarkdown || '',
    chapters: chaptersList.map(ch => ({
      chapterNumber: ch.chapterNumber || ch.sceneNumber,
      title: ch.title,
      setting: ch.setting,
      characters: ch.characters,
      summary: ch.summary,
      characterActions: ch.characterActions || '',
      suggestedDialogue: ch.suggestedDialogue || '',
      emotionalSubtext: ch.emotionalSubtext || '',
      pacingNotes: ch.pacingNotes || '',
      targetWords: ch.targetWords,
      mood: ch.mood,
      imageUrl: ch.imageUrl || null,
      audioUrl: ch.audioUrl || null
    }))
  };
  fs.writeFileSync(paths.storyboardJson, JSON.stringify(storyboardData, null, 2), 'utf8');

  if (storyData.charactersMarkdown) {
    fs.writeFileSync(path.join(paths.storyboardDir, 'characters.md'), storyData.charactersMarkdown, 'utf8');
  }

  // Human-readable storyboard Markdown
  let sbMd = `# ${storyData.title || 'Untitled Novel'}\n\n`;
  sbMd += `> **Premise:** ${storyData.prompt || 'N/A'}\n\n`;
  sbMd += `**Total Chapters:** ${chaptersList.length} | **Last Updated:** ${storyData.updatedAt}\n\n`;
  sbMd += `---\n\n`;

  chaptersList.forEach(ch => {
    const chNum = ch.chapterNumber || ch.sceneNumber;
    sbMd += `### Chapter ${chNum}: ${ch.title}\n`;
    sbMd += `- **Setting:** ${ch.setting || 'Various'}\n`;
    sbMd += `- **Mood / Atmosphere:** ${ch.mood || 'Dramatic'}\n`;
    sbMd += `- **Characters:** ${Array.isArray(ch.characters) ? ch.characters.join(', ') : ch.characters}\n`;
    sbMd += `- **Summary:** ${ch.summary || ''}\n`;
    if (ch.characterActions) sbMd += `- **Physical Actions:** ${ch.characterActions}\n`;
    if (ch.suggestedDialogue) sbMd += `- **Suggested Dialogue:** ${ch.suggestedDialogue}\n`;
    if (ch.emotionalSubtext) sbMd += `- **Emotional Subtext:** ${ch.emotionalSubtext}\n`;
    if (ch.pacingNotes) sbMd += `- **Pacing:** ${ch.pacingNotes}\n`;
    if (ch.imageUrl) sbMd += `- **Artwork:** [View Artwork](${ch.imageUrl})\n`;
    if (ch.audioUrl) sbMd += `- **Audio:** [Listen Audio](${ch.audioUrl})\n`;
    sbMd += `\n`;
  });
  fs.writeFileSync(paths.storyboardMd, sbMd, 'utf8');

  // 3. Chapters sub-folder: individual chapter markdown & combined novel manuscript
  let fullNovelMd = `# ${storyData.title || 'Untitled Novel'}\n\n*${storyData.prompt || ''}*\n\n---\n\n`;
  let hasAnyContent = false;

  chaptersList.forEach(ch => {
    const chNum = ch.chapterNumber || ch.sceneNumber;
    const chFile = path.join(paths.scenesDir, `scene_${chNum}.md`);
    let chMd = `## Chapter ${chNum}: ${ch.title}\n\n`;
    chMd += `*Setting: ${ch.setting} | Characters: ${Array.isArray(ch.characters) ? ch.characters.join(', ') : ch.characters} | Mood: ${ch.mood}*\n\n`;
    if (ch.imageUrl) {
      chMd += `![Chapter ${chNum} Artwork](${ch.imageUrl})\n\n`;
    }
    if (ch.content && ch.content.trim()) {
      hasAnyContent = true;
      chMd += `${ch.content}\n\n`;
      fullNovelMd += `## Chapter ${chNum}: ${ch.title}\n\n`;
      if (ch.imageUrl) fullNovelMd += `![Chapter ${chNum} Artwork](${ch.imageUrl})\n\n`;
      fullNovelMd += `${ch.content}\n\n---\n\n`;
    } else {
      chMd += `*(Content outline: ${ch.summary || 'Pending generation'})*\n\n`;
    }
    fs.writeFileSync(chFile, chMd, 'utf8');
  });

  if (hasAnyContent) {
    fs.writeFileSync(paths.novelMd, fullNovelMd, 'utf8');
  }

  // 4. Speakers / Voice Cast
  if (storyData.speakers && storyData.speakers.length > 0) {
    fs.writeFileSync(paths.speakersJson, JSON.stringify(storyData.speakers, null, 2), 'utf8');
  }

  return { storyId, paths, storyData };
}

/**
 * Loads story from either structured directory or legacy json file
 */
function loadStoryFromDisk(storyId) {
  const paths = getStoryPaths(storyId);
  if (fs.existsSync(paths.storyJson)) {
    return JSON.parse(fs.readFileSync(paths.storyJson, 'utf8'));
  }
  if (fs.existsSync(paths.legacyJson)) {
    return JSON.parse(fs.readFileSync(paths.legacyJson, 'utf8'));
  }
  return null;
}

/**
 * List all saved stories from disk
 */
function listSavedStories() {
  const entries = fs.readdirSync(STORIES_DIR, { withFileTypes: true });
  const storiesMap = new Map();

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const jsonPath = path.join(STORIES_DIR, entry.name, 'story.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          storiesMap.set(data.id || entry.name, {
            id: data.id || entry.name,
            title: data.title || 'Untitled Story',
            genre: data.genre || 'New Adult Fiction',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            sceneCount: (data.scenes || []).length,
            hasImages: (data.scenes || []).some(s => Boolean(s.imageUrl)),
            hasAudio: (data.scenes || []).some(s => Boolean(s.audioUrl)),
            isFolderStructured: true
          });
        } catch (e) {}
      }
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const fileId = entry.name.replace('.json', '');
      if (!storiesMap.has(fileId)) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(STORIES_DIR, entry.name), 'utf8'));
          storiesMap.set(data.id || fileId, {
            id: data.id || fileId,
            title: data.title || 'Untitled Story',
            genre: data.genre || 'New Adult Fiction',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            sceneCount: (data.scenes || []).length,
            hasImages: (data.scenes || []).some(s => Boolean(s.imageUrl)),
            hasAudio: (data.scenes || []).some(s => Boolean(s.audioUrl)),
            isFolderStructured: false
          });
        } catch (e) {}
      }
    }
  }

  return Array.from(storiesMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  getStoryPaths,
  ensureStoryDirectories,
  saveStoryToDisk,
  loadStoryFromDisk,
  listSavedStories
};
