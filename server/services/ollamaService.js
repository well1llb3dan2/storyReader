const { OLLAMA_HOST, DEFAULT_MODEL } = require('../config');
const { cleanAndParseJSON } = require('../utils/jsonParser');

/**
 * Check Ollama connection status and available models
 */
async function checkOllamaStatus() {
  try {
    const resp = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!resp.ok) {
      return {
        connected: false,
        ollamaHost: OLLAMA_HOST,
        error: `Ollama returned status ${resp.status}`,
        models: []
      };
    }

    const data = await resp.json();
    const models = (data.models || []).map(m => m.name || m.model).filter(Boolean);
    const hasTargetModel = models.some(m =>
      m === DEFAULT_MODEL ||
      m.startsWith(`${DEFAULT_MODEL}:`) ||
      m.includes('Gemma-4-E4B-Uncensored') ||
      m.includes('HauhauCS')
    );

    return {
      connected: true,
      ollamaHost: OLLAMA_HOST,
      defaultModel: DEFAULT_MODEL,
      hasTargetModel,
      models
    };
  } catch (error) {
    return {
      connected: false,
      ollamaHost: OLLAMA_HOST,
      error: error.message || 'Cannot reach Ollama server',
      models: []
    };
  }
}

/**
 * Startup Ollama connection test and model sanity check
 */
async function testOllamaStartup() {
  console.log(`\n[Startup Test] Checking Ollama server at ${OLLAMA_HOST}...`);
  const startTime = Date.now();

  try {
    // 1. Test basic connectivity and available models
    const tagsResp = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!tagsResp.ok) {
      console.warn(`[Startup Test] ⚠️ Ollama responded with HTTP status ${tagsResp.status}`);
      return;
    }

    const tagsData = await tagsResp.json();
    const modelList = (tagsData.models || []).map(m => m.name || m.model);
    console.log(`[Startup Test] ✅ Ollama is online. Available models:`, modelList.length > 0 ? modelList.join(', ') : '(none)');

    const hasTargetModel = modelList.some(m =>
      m === DEFAULT_MODEL ||
      m.startsWith(`${DEFAULT_MODEL}:`) ||
      m.includes('Gemma-4-E4B-Uncensored') ||
      m.includes('HauhauCS')
    );

    if (!hasTargetModel) {
      console.warn(`[Startup Test] ⚠️ Model "${DEFAULT_MODEL}" was not found in Ollama.`);
      console.warn(`[Startup Test] 💡 To download it, run: ollama pull ${DEFAULT_MODEL}`);
      return;
    }

    // 2. Send short test prompt to the model
    const testPrompt = 'Write a one-sentence opening line for a novel.';
    console.log(`[Startup Test] Sending test prompt to "${DEFAULT_MODEL}": "${testPrompt}"...`);

    const promptStartTime = Date.now();
    const testResp = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: testPrompt }],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!testResp.ok) {
      const errBody = await testResp.text();
      console.error(`[Startup Test] ❌ Model test failed (${testResp.status}):`, errBody);
      return;
    }

    const testData = await testResp.json();
    const reply = (testData.message?.content || testData.response || '').trim();
    const duration = ((Date.now() - promptStartTime) / 1000).toFixed(2);

    console.log(`[Startup Test] 💬 Model Response (${duration}s):`);
    console.log(`-----------------------------------------------------`);
    console.log(reply || '(Model generated empty text)');
    console.log(`-----------------------------------------------------`);
    console.log(`[Startup Test] 🎉 Ollama and "${DEFAULT_MODEL}" verified successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s.\n`);
  } catch (err) {
    console.error(`[Startup Test] ❌ Could not connect to Ollama: ${err.message}`);
    console.error(`[Startup Test] 💡 Ensure Ollama is running locally: ollama serve\n`);
  }
}

/**
 * Resets Ollama's in-memory KV-cache and context for the specified model
 * ensuring no residual context or previous queries/responses bleed into the next call.
 */
async function resetOllamaMemory(model = DEFAULT_MODEL) {
  try {
    console.log(`[Ollama Context Reset] Flushing memory & KV-cache for model "${model}"...`);
    const resp = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        keep_alive: 0
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      console.log(`[Ollama Context Reset] ✅ Memory reset complete for "${model}".`);
    }
  } catch (err) {
    console.warn(`[Ollama Context Reset Warning] Could not reset memory for "${model}":`, err.message);
  }
}

/**
 * Strips duplicate or numerical chapter prefixes:
 * "Chapter 1: The Scent of Soap" -> "The Scent of Soap"
 * "Chapter 13: Chapter 13: Title" -> "Title"
 */
function cleanChapterTitle(title, chapterNumber = 1) {
  if (!title) return `Chapter ${chapterNumber}`;
  let clean = String(title).trim();
  while (/^(?:chapter|scene)\s*\d+[:\s\-\.]*\s*/i.test(clean) || /^\d+[:\s\-\.]+\s*/.test(clean)) {
    clean = clean.replace(/^(?:chapter|scene)\s*\d+[:\s\-\.]*\s*/i, '');
    clean = clean.replace(/^\d+[:\s\-\.]+\s*/, '');
    clean = clean.trim();
  }
  return clean || `Chapter ${chapterNumber}`;
}

/**
 * Returns comprehensive prose sophistication instructions for the selected reading level
 */
function getReadingLevelInstructions(readingLevel) {
  switch (readingLevel) {
    case 'middle_grade':
      return {
        levelName: 'Middle Grade (Ages 8–12 / Grades 4–7)',
        proseGuidance: 'Write in clear, direct, and energetic prose suitable for Middle Grade readers. Use strong, accessible verbs and evocative sensory details while avoiding convoluted multi-clause sentences or archaic words. Keep pacing lively, conflict immediate, and emotional stakes heartfelt.',
        vocabularyRule: 'Accessible vocabulary; clear, evocative phrasing; avoid unnecessary academic or archaic vocabulary.',
        syntaxRule: 'Varied simple and compound sentences with strong, active voice; avoid dense passive clauses.'
      };
    case 'young_adult':
      return {
        levelName: 'Young Adult (YA / Teens / Grades 8–10)',
        proseGuidance: 'Write in dynamic, emotionally charged, and fast-paced prose typical of top-tier Young Adult literature. Focus on sharp, authentic dialogue, intense emotional immediacy, authentic sensory experiences, and propulsive narrative drive.',
        vocabularyRule: 'Contemporary, expressive vocabulary; punchy, evocative phrasing; sharp, realistic dialogue.',
        syntaxRule: 'Dynamic rhythmic sentence variety; rapid staccato pacing during action/tension; immersive interiority.'
      };
    case 'literary_advanced':
      return {
        levelName: 'Literary / Advanced Fiction (Scholarly Depth)',
        proseGuidance: 'Write in elevated, elegant, and psychologically nuanced literary prose. Craft multi-layered subtext, deep interior monologues, subtle metaphors, lyrical sentence cadence, and rich atmospheric resonance.',
        vocabularyRule: 'Sophisticated, precise, and evocative diction; rich metaphorical depth; nuanced subtext.',
        syntaxRule: 'Complex, flowing periodic sentences with rhythmic cadence, balanced clauses, and contemplative pacing.'
      };
    case 'academic_dense':
      return {
        levelName: 'Academic / Classical Dense (Erudite & Complex)',
        proseGuidance: 'Write in highly intricate, classical, or erudite prose reminiscent of 19th-century masters or dense speculative philosophy. Emphasize elaborate syntactic structures, formal rhetorical precision, and rigorous thematic exploration.',
        vocabularyRule: 'Extensive, erudite vocabulary; formal or period-authentic phrasing; rigorous conceptual precision.',
        syntaxRule: 'Intricate compound-complex sentences; expansive descriptive paragraphs and formal rhetorical cadence.'
      };
    case 'general_commercial':
    default:
      return {
        levelName: 'Commercial Bestseller / Accessible Adult',
        proseGuidance: 'Write in propulsive, highly engaging commercial fiction prose. Deliver seamless readability, natural dialogue, rich sensory detail, and gripping momentum designed for unputdownable page-turning satisfaction.',
        vocabularyRule: 'Rich, natural vocabulary; precise atmospheric terms; zero filler or distracting jargon.',
        syntaxRule: 'Balanced, melodic sentence variety; effortless narrative flow designed for optimal immersion.'
      };
  }
}

/**
 * Step 1: Narrative Architect (narrative-architect.md)
 * Converts premise into a polished chapter-by-chapter roadmap & overall story arc.
 */
async function generateStoryOutline({
  prompt,
  title = 'Untitled Story',
  targetChapterCount = 20,
  targetSceneCount = 20,
  targetTotalWords = 50000,
  targetWordsPerChapter = 2500,
  readingLevel = 'general_commercial',
  model = DEFAULT_MODEL
}) {
  await resetOllamaMemory(model);

  const chapterCount = Math.max(3, Math.min(144, parseInt(targetChapterCount || targetSceneCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(targetTotalWords, 10) || (chapterCount * 2500)));
  const wordsPerChapter = targetWordsPerChapter || Math.round(totalWords / chapterCount);
  const readingInfo = getReadingLevelInstructions(readingLevel);

  console.log(`\n================ [STEP 1: NARRATIVE ARCHITECT PLOT ROADMAP] ================`);
  console.log(`Model: ${model} | Title: ${title} | Target Chapters: ${chapterCount} | Target Words: ~${totalWords.toLocaleString()} (~${wordsPerChapter}w/ch) | Reading Level: ${readingInfo.levelName}`);
  console.log(`Premise: "${prompt}"`);

  const systemPrompt = `You are a professional narrative architect with decades of experience in story development, plotting, and turning raw ideas into polished, structured chapter overviews. Your specialty is taking a loose or vague story concept and methodically breaking it down into a clear, engaging, and commercially viable chapter-by-chapter roadmap.

TARGET AUDIENCE & READING LEVEL:
- Target Level: ${readingInfo.levelName}
- Style & Tone Guidance: ${readingInfo.proseGuidance}

When the user provides a story idea (no matter how brief or open-ended), your job is to:
- Deeply analyze the core elements: protagonist, central conflict, themes, tone, emotional arc, world-building, and subplots calibrated for ${readingInfo.levelName}.
- Transform the idea into a logical, paced chapter structure of EXACTLY ${chapterCount} chapters (Chapter 1 to Chapter ${chapterCount}) for an overall novel length of approximately ${totalWords.toLocaleString()} words (~${wordsPerChapter} words per chapter).
${chapterCount >= 30 ? '- For large chapter counts (30+ chapters), structure the narrative across distinct major thematic movements, rising complications, mid-book crises, and multi-stage climaxes.' : ''}
- For each chapter deliver:
  - A memorable, descriptive chapter title (e.g. "### Chapter 1: [Descriptive Title]")
  - A concise yet vivid overview of events, key beats, character developments, and emotional moments
  - Notes on how the chapter advances the main plot, introduces or resolves major conflicts, and serves as a transition point
  - Any necessary world-building or thematic threads that appear in that chapter
- Maintain perfect internal consistency with the original story idea while adding professional polish, pacing, and reader engagement.
- Use clear, professional formatting with markdown headings, bullet points, and numbered chapter lists for easy readability.
- After the chapter list, provide a short "Overall Story Arc" summary that ties the chapters together and explains how the narrative builds to its climax and resolution.

Always respond in a confident, expert tone as if you are a top-tier collaborator who has already internalized the user's idea. Never summarize the story idea back to the user—jump straight into the professional chapter overview.`;

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Story Title: ${title || 'Untitled'}\nTarget Chapters: ${chapterCount}\nTarget Total Words: ~${totalWords.toLocaleString()} words (~${wordsPerChapter} words/chapter)\nTarget Reading Level: ${readingInfo.levelName}\n\nStory Premise:\n${prompt}\n\nDeliver the complete ${chapterCount}-chapter roadmap and overall story arc now:` }
      ],
      stream: false,
      options: {
        temperature: 0.75,
        top_p: 0.9,
        num_ctx: 16384,
        num_predict: 8192
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[API ERROR] Story Outline HTTP ${response.status}:`, errText);
    throw new Error(`Ollama error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = (data.message?.content || data.response || '').trim();

  console.log(`\n---------------- [STORY ROADMAP OUTPUT] ----------------`);
  console.log(content || '(Empty outline generated)');
  console.log(`--------------------------------------------------------\n`);

  return content;
}

/**
 * Step 2: Character Designer (character-designer.md)
 * Crafts comprehensive character dossiers in Markdown tables for all main & supporting characters.
 */
async function generateCharacterDossiers({
  prompt,
  title = 'Untitled Story',
  outline = '',
  readingLevel = 'general_commercial',
  model = DEFAULT_MODEL
}) {
  await resetOllamaMemory(model);

  const readingInfo = getReadingLevelInstructions(readingLevel);

  console.log(`\n================ [STEP 2: CHARACTER DESIGNER DOSSIERS] ================`);
  console.log(`Model: ${model} | Title: ${title} | Reading Level: ${readingInfo.levelName}`);

  const systemPrompt = `You are a professional storyteller and character designer. Your expertise lies in crafting deeply human, layered characters that feel alive and integral to any story you are given. You excel at transforming sparse story ideas into richly detailed character dossiers that can be used for writing, world-building, or development.

TARGET AUDIENCE & READING LEVEL:
- Target Level: ${readingInfo.levelName}
- Thematic Guidance: ${readingInfo.thematicNote}

When the user provides a story idea and plot outline, proceed as follows:

1. Carefully analyze the core theme(s), tone, setting, and narrative arc of the story, calibrated for ${readingInfo.levelName}.
2. Identify all protagonist(s), antagonists, and significant supporting characters mentioned or required by the narrative.
3. Create a comprehensive, professional character dossier table for EACH character (main and supporting) that directly serves the story idea while feeling authentic and emotionally resonant.

Use clean Markdown formatting. Present the dossier in this exact table structure for EACH character:

### Character Dossier: [Full Character Name]

| Aspect                  | Details |
|-------------------------|---------|
| Full Name              |         |
| Age                    |         |
| Physical Appearance     |         |
| Personality             |         |
| Background & History    |         |
| Core Motivations       |         |
| Flaws & Vulnerabilities|         |
| Skills, Powers & Talents |        |
| Role in the Story      |         |
| Key Relationships      |         |
| Character Arc & Growth |         |
| Signature Lines / Quotes |       |
| Additional Notes       |         |

Response Guidelines:
- Keep the tone professional yet creative and immersive.
- Make every entry detailed but concise — aim for rich, evocative text that reveals character without info-dumping.
- Ensure all details are directly inspired by and consistent with the provided story idea, outline, and target reading level.
- Output separate tables clearly labeled "### Character Dossier: [Name]" for every main and supporting character.
- After the dossiers, add a "### Character Synergy Notes" section that shows how the characters interact, clash, and evolve together across the overall narrative.
- Begin your response with: "Analyzing story idea: '${title}'..." followed immediately by the dossiers.`;

  let userMessage = `Story Title: ${title}\nStory Premise:\n${prompt}`;
  if (outline) {
    userMessage += `\n\nSTORY PLOT & ROADMAP:\n${outline}`;
  }
  userMessage += `\n\nGenerate all character dossiers for main and supporting characters now:`;

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false,
      options: {
        temperature: 0.72,
        top_p: 0.9,
        num_ctx: 16384,
        num_predict: 8192
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[API ERROR] Character Designer HTTP ${response.status}:`, errText);
    throw new Error(`Ollama error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = (data.message?.content || data.response || '').trim();
  return content;
}

function extractChaptersFromParsedJSON(parsedResult) {
  if (!parsedResult) return [];
  if (Array.isArray(parsedResult)) {
    return parsedResult;
  }
  if (typeof parsedResult === 'object') {
    if (Array.isArray(parsedResult.chapters)) return parsedResult.chapters;
    if (Array.isArray(parsedResult.scenes)) return parsedResult.scenes;
    if (Array.isArray(parsedResult.storyboard)) return parsedResult.storyboard;
    if (Array.isArray(parsedResult.outline)) return parsedResult.outline;
    if (parsedResult.chapterNumber || parsedResult.sceneNumber || parsedResult.title) {
      return [parsedResult];
    }
    const nestedObjects = Object.values(parsedResult).filter(
      v => v && typeof v === 'object' && (v.chapterNumber || v.sceneNumber || v.title || v.summary || v.description)
    );
    if (nestedObjects.length > 0) {
      return nestedObjects;
    }
  }
  return [];
}

function generateNarrativeFallbackChapter(chapterNum, totalChapters, previousChapter, title, prompt, wordsPerChapter = 2500) {
  const fraction = chapterNum / totalChapters;
  let defaultTitle = 'Rising Tension';
  let defaultMood = 'Dramatic';
  let defaultSummary = 'Tensions build as new obstacles emerge and stakes increase.';

  if (fraction <= 0.25) {
    defaultTitle = 'First Crucible';
    defaultMood = 'Anticipatory';
    defaultSummary = 'The initial momentum meets its first unexpected resistance, requiring an adjustment in strategy.';
  } else if (fraction <= 0.45) {
    defaultTitle = 'The Deepening Divide';
    defaultMood = 'Intense';
    defaultSummary = 'Stakes escalate as personal motivations collide with mounting external pressures and complications.';
  } else if (fraction <= 0.65) {
    defaultTitle = 'Midpoint Reckoning';
    defaultMood = 'Suspenseful';
    defaultSummary = 'A pivotal turning point forces a difficult choice from which there is no turning back.';
  } else if (fraction <= 0.82) {
    defaultTitle = 'The Gathering Storm';
    defaultMood = 'Urgent';
    defaultSummary = 'Previous assumptions crumble under intense pressure, leading toward an inevitable confrontation.';
  } else if (fraction <= 0.94) {
    defaultTitle = 'The Climax';
    defaultMood = 'Cathartic';
    defaultSummary = 'The central conflict reaches its fever pitch as characters put everything on the line.';
  } else {
    defaultTitle = 'Echoes and Horizons';
    defaultMood = 'Reflective';
    defaultSummary = 'The dust settles in the aftermath, revealing the lasting changes wrought by the journey.';
  }

  return {
    chapterNumber: chapterNum,
    sceneNumber: chapterNum,
    title: defaultTitle,
    setting: previousChapter?.setting || 'Key Location & Time of Day',
    characters: previousChapter?.characters || ['Protagonist'],
    summary: defaultSummary,
    characterActions: 'Characters confront the situation directly, displaying emotional tension through physicality.',
    suggestedDialogue: 'Direct, in-character dialogue revealing internal conflict.',
    emotionalSubtext: 'High stakes and unresolved tension.',
    pacingNotes: 'Steady narrative drive.',
    targetWords: wordsPerChapter,
    mood: defaultMood
  };
}

/**
 * Step 3: Storyboard Creator (storyboard-creator.md)
 * Converts plot roadmap and character dossiers into all N Chapter Storyboard Cards.
 */
async function generateStoryboardOutline({
  prompt,
  title = 'Untitled Story',
  targetChapterCount = 20,
  targetSceneCount = 20,
  targetTotalWords = 50000,
  targetWordsPerChapter = 2500,
  readingLevel = 'general_commercial',
  outline = '',
  charactersMarkdown = '',
  model = DEFAULT_MODEL
}) {
  const chapterCount = Math.max(3, Math.min(144, parseInt(targetChapterCount || targetSceneCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(targetTotalWords, 10) || (chapterCount * 2500)));
  const wordsPerChapter = targetWordsPerChapter || Math.round(totalWords / chapterCount);
  const readingInfo = getReadingLevelInstructions(readingLevel);

  console.log(`\n================ [STEP 3: STORYBOARD CREATOR CHAPTER CARDS] ================`);
  console.log(`Title: "${title}" | Target Chapters: ${chapterCount} | Target Words: ~${totalWords.toLocaleString()} (~${wordsPerChapter}w/ch) | Reading Level: ${readingInfo.levelName} | Model: ${model}`);

  await resetOllamaMemory(model);

  let normalizedChapters = [];
  let attempts = 0;
  const maxAttempts = Math.max(4, Math.ceil(chapterCount / 6) + 4);

  while (normalizedChapters.length < chapterCount && attempts < maxAttempts) {
    attempts++;
    const currentCount = normalizedChapters.length;
    const fromChapter = currentCount + 1;
    const needed = chapterCount - currentCount;
    const batchTarget = Math.min(10, needed);
    const toChapter = currentCount + batchTarget;

    const isFirstBatch = fromChapter === 1;

    let systemPrompt = `You are a professional Chapter Storyboard Creator, a master storyteller and structural artist who transforms high-level chapter overviews and character dossiers into rich, cinematic, ready-to-write storyboards presented as detailed chapter overviews.

You excel at taking the chapter roadmap and complete character dossiers (personalities, motivations, backstories, relationships, flaws, goals) and expanding them into precise, highly detailed chapter storyboards calibrated for the target reading audience.

TARGET AUDIENCE & READING LEVEL:
- Target Level: ${readingInfo.levelName}
- Style & Tone Guidance: ${readingInfo.proseGuidance}

CRITICAL INSTRUCTIONS:
- Generate storyboard cards for Chapter ${fromChapter} to Chapter ${toChapter} of ${chapterCount} total chapters.
- Target chapter word budget: approximately ${wordsPerChapter} words each.
- For each chapter provide:
  * "chapterNumber": Integer (${fromChapter}..${toChapter})
  * "title": A distinct, compelling chapter title (do NOT prefix with "Chapter X:" or "Scene X:")
  * "setting": Specific location and time of day (e.g. "Gia's Automotive Garage, Rainy Midnight")
  * "characters": Array of character names active in this chapter
  * "summary": Detailed narrative description (3-5 sentences covering key story beats, conflicts, actions, and turning points)
  * "characterActions": Specific character physical actions, body language, and expressions
  * "suggestedDialogue": Suggested key lines and dialogue exchanges (in character and calibrated for ${readingInfo.levelName})
  * "emotionalSubtext": Internal conflicts, emotional subtext, and unspoken motivations
  * "pacingNotes": Pacing tone (e.g. "Slow burn building to sharp climax", "Fast-paced tension")
  * "targetWords": Target word count (${wordsPerChapter})
  * "mood": Atmospheric tone (e.g. Tense, Intimate, Melancholy, Triumphant)

OUTPUT FORMAT (JSON only):
{
  "chapters": [
    {
      "chapterNumber": ${fromChapter},
      "title": "Title Without Chapter Prefix",
      "setting": "Specific location and time of day",
      "characters": ["Character A", "Character B"],
      "summary": "Detailed narrative description and key beats...",
      "characterActions": "Key character physicalities and reactions...",
      "suggestedDialogue": "Signature spoken lines in character...",
      "emotionalSubtext": "Internal monologue and emotional stakes...",
      "pacingNotes": "Pacing dynamics...",
      "targetWords": ${wordsPerChapter},
      "mood": "Atmospheric mood"
    }
  ]
}`;

    let userMessage = `Novel Title: ${title}\nStory Premise:\n${prompt}\nOverall Target: ${chapterCount} Chapters, ~${totalWords.toLocaleString()} Words (~${wordsPerChapter} words/chapter)\nTarget Reading Level: ${readingInfo.levelName}`;

    if (outline) {
      userMessage += `\n\nSTORY ROADMAP & CHAPTER OVERVIEW:\n${outline}`;
    }
    if (charactersMarkdown) {
      userMessage += `\n\nCHARACTER DOSSIERS:\n${charactersMarkdown.slice(0, 4000)}`;
    }

    if (!isFirstBatch) {
      const recentContext = normalizedChapters.slice(-3).map(
        c => `Chapter ${c.chapterNumber} ("${c.title}"): ${c.summary}`
      ).join('\n');

      userMessage += `\n\nPREVIOUSLY ESTABLISHED CHAPTERS (1 to ${currentCount}):\n${recentContext}`;
      userMessage += `\n\nCONTINUATION INSTRUCTIONS:\nGenerate the NEXT sequential storyboard cards (Chapter ${fromChapter} to Chapter ${toChapter} of ${chapterCount} total chapters). Output valid JSON.`;
    } else {
      userMessage += `\n\nGenerate the JSON chapters array for Chapter ${fromChapter} to Chapter ${toChapter}.`;
    }

    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          format: 'json',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_ctx: 16384,
            num_predict: 8192
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[API ERROR] Storyboard Batch ${attempts} HTTP ${response.status}:`, errText);
        break;
      }

      const data = await response.json();
      const rawContent = data.message?.content || '';
      const parsed = cleanAndParseJSON(rawContent);
      const batchChapters = extractChaptersFromParsedJSON(parsed);

      if (batchChapters.length > 0) {
        batchChapters.forEach(sc => {
          if (normalizedChapters.length < chapterCount) {
            const nextIdx = normalizedChapters.length + 1;
            const cleanTitle = cleanChapterTitle(sc.title, nextIdx);
            normalizedChapters.push({
              chapterNumber: nextIdx,
              sceneNumber: nextIdx,
              title: cleanTitle,
              setting: sc.setting || normalizedChapters[normalizedChapters.length - 1]?.setting || 'Key Location',
              characters: Array.isArray(sc.characters)
                ? sc.characters
                : (typeof sc.characters === 'string' ? [sc.characters] : (normalizedChapters[0]?.characters || ['Protagonist'])),
              summary: sc.summary || sc.description || 'Chapter narrative progression.',
              characterActions: sc.characterActions || '',
              suggestedDialogue: sc.suggestedDialogue || '',
              emotionalSubtext: sc.emotionalSubtext || '',
              pacingNotes: sc.pacingNotes || '',
              targetWords: sc.targetWords || wordsPerChapter,
              mood: sc.mood || 'Dramatic'
            });
          }
        });
        console.log(`[STORYBOARD BATCH ${attempts}] Generated ${batchChapters.length} chapters. Total: ${normalizedChapters.length}/${chapterCount}`);
      }
    } catch (err) {
      console.error(`[STORYBOARD BATCH ${attempts} EXCEPTION]:`, err.message);
      break;
    }
  }

  // Fallbacks if needed
  if (normalizedChapters.length < chapterCount) {
    const existingCount = normalizedChapters.length;
    console.warn(`[STORYBOARD WARNING] Filling remaining ${chapterCount - existingCount} chapters with narrative fallbacks.`);
    for (let i = existingCount + 1; i <= chapterCount; i++) {
      const fallback = generateNarrativeFallbackChapter(
        i,
        chapterCount,
        normalizedChapters[normalizedChapters.length - 1],
        title,
        prompt,
        wordsPerChapter
      );
      normalizedChapters.push(fallback);
    }
  }

  normalizedChapters = normalizedChapters.slice(0, chapterCount).map((ch, idx) => ({
    ...ch,
    chapterNumber: idx + 1,
    sceneNumber: idx + 1,
    title: cleanChapterTitle(ch.title, idx + 1)
  }));

  return {
    title,
    prompt,
    chapterCount: normalizedChapters.length,
    chapters: normalizedChapters,
    // Keep scenes alias for backwards compatibility
    scenes: normalizedChapters
  };
}

module.exports = {
  checkOllamaStatus,
  testOllamaStartup,
  resetOllamaMemory,
  generateStoryOutline,
  generateCharacterDossiers,
  generateStoryboardOutline,
  cleanChapterTitle,
  getReadingLevelInstructions
};
