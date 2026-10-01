const { OLLAMA_HOST, DEFAULT_MODEL, DEFAULT_PROVIDER } = require('../config');
const { cleanAndParseJSON } = require('../utils/jsonParser');
const {
  requestChat,
  getResponseText,
  getStreamText,
  checkProviderStatus,
  getProviderLabel,
  resetProviderMemory
} = require('./llmService');

function generationOptions({ contextSize, temperature, topP, numPredict } = {}, defaults = {}) {
  const requestedTemperature = Number(temperature);
  const requestedTopP = Number(topP);
  return {
    temperature: Math.max(0, Math.min(2, Number.isFinite(requestedTemperature) ? requestedTemperature : (defaults.temperature || 0.7))),
    top_p: Math.max(0, Math.min(1, Number.isFinite(requestedTopP) ? requestedTopP : 0.9)),
    num_ctx: Math.max(4096, Math.min(131072, parseInt(contextSize, 10) || defaults.contextSize || 16384)),
    num_predict: Math.max(512, Math.min(131072, parseInt(numPredict, 10) || defaults.numPredict || 8192))
  };
}

/**
 * Check Ollama connection status and available models
 */
async function checkOllamaStatus() {
  return checkProviderStatus('ollama');
}

/**
 * Startup Ollama connection test and model sanity check
 */
async function testOllamaStartup(provider = DEFAULT_PROVIDER) {
  const providerLabel = getProviderLabel(provider);
  const providerHost = provider === 'llama.cpp' ? process.env.LLAMA_CPP_HOST || 'http://127.0.0.1:8080' : OLLAMA_HOST;
  console.log(`\n[Startup Test] Checking ${providerLabel} server at ${providerHost}...`);
  const startTime = Date.now();

  try {
    // 1. Test basic connectivity and available models
    const status = await checkProviderStatus(provider);
    if (!status.connected) {
      console.warn(`[Startup Test] ⚠️ ${providerLabel} is unavailable: ${status.error}`);
      return;
    }

    const modelList = status.models;
    console.log(`[Startup Test] ✅ ${providerLabel} is online. Available models:`, modelList.length > 0 ? modelList.join(', ') : '(none)');

    const targetModel = provider === 'llama.cpp' ? status.defaultModel : DEFAULT_MODEL;
    const hasTargetModel = modelList.some(m => m === targetModel || m.startsWith(`${targetModel}:`));

    if (!hasTargetModel) {
      console.warn(`[Startup Test] ⚠️ Model "${targetModel}" was not found in ${providerLabel}.`);
      if (provider === 'ollama') console.warn(`[Startup Test] 💡 To download it, run: ollama pull ${targetModel}`);
      return;
    }

    // 2. Send short test prompt to the model
    const testPrompt = 'Write a one-sentence opening line for a novel.';
    console.log(`[Startup Test] Sending test prompt to "${targetModel}": "${testPrompt}"...`);

    const promptStartTime = Date.now();
    const testResp = await requestChat({
      provider,
      model: targetModel,
      messages: [{ role: 'user', content: testPrompt }],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048
      },
      signal: AbortSignal.timeout(45000)
    });

    if (!testResp.ok) {
      const errBody = await testResp.text();
      console.error(`[Startup Test] ❌ Model test failed (${testResp.status}):`, errBody);
      return;
    }

    const testData = await testResp.json();
    const reply = getResponseText(testData, provider).trim();
    const duration = ((Date.now() - promptStartTime) / 1000).toFixed(2);

    console.log(`[Startup Test] 💬 Model Response (${duration}s):`);
    console.log(`-----------------------------------------------------`);
    console.log(reply || '(Model generated empty text)');
    console.log(`-----------------------------------------------------`);
    console.log(`[Startup Test] 🎉 ${providerLabel} and "${targetModel}" verified successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s.\n`);
  } catch (err) {
    console.error(`[Startup Test] ❌ Could not connect to ${providerLabel}: ${err.message}`);
    if (provider === 'ollama') console.error(`[Startup Test] 💡 Ensure Ollama is running locally: ollama serve\n`);
  }
}

/**
 * Resets Ollama's in-memory KV-cache and context for the specified model
 * ensuring no residual context or previous queries/responses bleed into the next call.
 */
async function resetOllamaMemory(model = DEFAULT_MODEL, provider = DEFAULT_PROVIDER) {
  await resetProviderMemory(provider, model);
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
  model = DEFAULT_MODEL,
  provider = DEFAULT_PROVIDER,
  contextSize,
  temperature,
  topP,
  numPredict
}) {
  await resetOllamaMemory(model, provider);

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

  const response = await requestChat({
    provider,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Story Title: ${title || 'Untitled'}\nTarget Chapters: ${chapterCount}\nTarget Total Words: ~${totalWords.toLocaleString()} words (~${wordsPerChapter} words/chapter)\nTarget Reading Level: ${readingInfo.levelName}\n\nStory Premise:\n${prompt}\n\nDeliver the complete ${chapterCount}-chapter roadmap and overall story arc now:` }
    ],
    stream: false,
    options: generationOptions({ contextSize, temperature, topP, numPredict }, { contextSize: 16384, temperature: 0.75, numPredict: 8192 })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[API ERROR] Story Outline HTTP ${response.status}:`, errText);
    throw new Error(`Ollama error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = getResponseText(data, provider).trim();

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
  model = DEFAULT_MODEL,
  provider = DEFAULT_PROVIDER,
  contextSize,
  temperature,
  topP,
  numPredict
}) {
  await resetOllamaMemory(model, provider);

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

Use clean JSON formatting. Present the dossier in this exact table structure for EACH character:

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

  const response = await requestChat({
    provider,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    stream: false,
    options: generationOptions({ contextSize, temperature, topP, numPredict }, { contextSize: 16384, temperature: 0.72, numPredict: 8192 })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[API ERROR] Character Designer HTTP ${response.status}:`, errText);
    throw new Error(`Ollama error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = getResponseText(data, provider).trim();
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
    if (Array.isArray(parsedResult.chapterOutline)) return parsedResult.chapterOutline;
    if (parsedResult.chapterNumber || parsedResult.sceneNumber || parsedResult.title) {
      return [parsedResult];
    }
    const nestedObjects = Object.values(parsedResult).filter(
      value => value && typeof value === 'object' && (value.chapterNumber || value.sceneNumber || value.title || value.summary || value.description)
    );
    if (nestedObjects.length > 0) {
      return nestedObjects;
    }
  }
  return [];
}

function extractCharacterRoster(parsedResult) {
  if (!parsedResult) return [];
  const candidates = Array.isArray(parsedResult)
    ? parsedResult
    : (parsedResult.characters || parsedResult.cast || parsedResult.roster || []);

  return candidates
    .filter(character => character && typeof character === 'object')
    .map(character => ({
      name: String(character.name || character.fullName || '').trim(),
      role: String(character.role || character.storyRole || 'Supporting character').trim()
    }))
    .filter(character => character.name)
    .slice(0, 12);
}

function humanizeCharacterKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, character => character.toUpperCase());
}

function formatCharacterValue(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    return value.map(formatCharacterValue).filter(Boolean).join('; ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nestedValue]) => {
        const formattedValue = formatCharacterValue(nestedValue);
        return formattedValue ? `${humanizeCharacterKey(key)}: ${formattedValue}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function characterField(source, ...keys) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      const normalized = formatCharacterValue(value);
      if (normalized.trim()) return normalized.trim();
    }
  }
  return '';
}

function normalizeCharacterDossier(rawCharacter, rosterCharacter, characterNumber) {
  const source = rawCharacter?.character || rawCharacter?.dossier || rawCharacter || {};
  const fallbackName = rosterCharacter?.name || `Character ${characterNumber}`;

  return {
    name: characterField(source, 'name', 'fullName') || fallbackName,
    role: characterField(source, 'role', 'storyRole') || rosterCharacter?.role || 'Supporting character',
    age: characterField(source, 'age'),
    physicalAppearance: characterField(source, 'physicalAppearance', 'appearance'),
    personality: characterField(source, 'personality'),
    background: characterField(source, 'background', 'backgroundHistory', 'history'),
    motivations: characterField(source, 'motivations', 'coreMotivations'),
    flaws: characterField(source, 'flaws', 'flawsAndVulnerabilities', 'vulnerabilities'),
    skills: characterField(source, 'skills', 'skillsAndTalents', 'talents'),
    relationships: characterField(source, 'relationships', 'keyRelationships'),
    characterArc: characterField(source, 'characterArc', 'arc', 'characterArcAndGrowth'),
    signatureLines: characterField(source, 'signatureLines', 'signatureQuotes', 'quotes'),
    additionalNotes: characterField(source, 'additionalNotes', 'notes')
  };
}

function buildCharactersMarkdown(characters) {
  const fields = [
    ['Full Name', 'name'],
    ['Role in the Story', 'role'],
    ['Age', 'age'],
    ['Physical Appearance', 'physicalAppearance'],
    ['Personality', 'personality'],
    ['Background & History', 'background'],
    ['Core Motivations', 'motivations'],
    ['Flaws & Vulnerabilities', 'flaws'],
    ['Skills, Powers & Talents', 'skills'],
    ['Key Relationships', 'relationships'],
    ['Character Arc & Growth', 'characterArc'],
    ['Signature Lines / Quotes', 'signatureLines'],
    ['Additional Notes', 'additionalNotes']
  ];

  return characters.map(character => {
    const rows = fields.map(([label, key]) => `| ${label} | ${character[key] || ''} |`).join('\n');
    return `### Character Dossier: ${character.name}\n\n| Aspect | Details |\n|---|---|\n${rows}`;
  }).join('\n\n');
}

async function requestStructuredCharacterJSON({ model, provider, messages, generation }) {
  await resetOllamaMemory(model, provider);

  try {
    const response = await requestChat({
      provider,
      model,
      messages,
      json: true,
      stream: false,
      options: {
        ...generationOptions(generation, { contextSize: 16384, temperature: 0.35, numPredict: 4096 }),
        repeat_penalty: 1.15
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return cleanAndParseJSON(getResponseText(data, provider));
  } finally {
    await resetOllamaMemory(model, provider);
  }
}

async function generateCharacterCards({
  prompt,
  title = 'Untitled Story',
  outline = '',
  readingLevel = 'general_commercial',
  model = DEFAULT_MODEL,
  provider = DEFAULT_PROVIDER,
  contextSize,
  temperature,
  topP,
  numPredict,
  onCharacter
}) {
  const readingInfo = getReadingLevelInstructions(readingLevel);
  const generation = { contextSize, temperature, topP, numPredict };
  const rosterMessages = [
    {
      role: 'system',
      content: `You are a story cast planner. Identify the essential cast for the provided story and plot roadmap. Return JSON only with a "characters" array containing 1 to 8 objects. Each object must contain only "name" and "role". Do not write dossiers, biographies, tables, or prose.`
    },
    {
      role: 'user',
      content: `Story Title: ${title}\nReading Level: ${readingInfo.levelName}\nStory Premise:\n${prompt}\n\nStory Roadmap:\n${outline}\n\nReturn the essential protagonist, antagonist, and supporting characters needed by this story.`
    }
  ];

  let roster = [];
  try {
    roster = extractCharacterRoster(await requestStructuredCharacterJSON({ model, provider, messages: rosterMessages, generation }));
  } catch (error) {
    console.warn(`[CHARACTER ROSTER] ${error.message}`);
  }

  if (roster.length === 0) {
    roster = [{ name: 'Protagonist', role: 'Protagonist' }];
  }

  const characters = [];
  for (let index = 0; index < roster.length; index++) {
    const rosterCharacter = roster[index];
    let character = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3 && !character; attempt++) {
      const dossierMessages = [
        {
          role: 'system',
          content: `You are a professional character designer. Generate exactly one structured character dossier for ${rosterCharacter.name}. Return JSON only with these keys: name, role, age, physicalAppearance, personality, background, motivations, flaws, skills, relationships, characterArc, signatureLines, additionalNotes. Keep every detail faithful to the story premise and roadmap. Do not output Markdown, tables, multiple characters, dialogue scenes, or commentary.`
        },
        {
          role: 'user',
          content: `Story Title: ${title}\nTarget Reading Level: ${readingInfo.levelName}\nStory Premise:\n${prompt}\n\nStory Roadmap:\n${outline}\n\nComplete Cast Plan:\n${roster.map(item => `- ${item.name}: ${item.role}`).join('\n')}\n\nCreate the dossier for this character only:\nName: ${rosterCharacter.name}\nRole: ${rosterCharacter.role}${attempt > 1 ? '\nRetry with valid JSON only.' : ''}`
        }
      ];

      try {
        const parsed = await requestStructuredCharacterJSON({ model, provider, messages: dossierMessages, generation });
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid or empty character JSON response');
        }
        character = normalizeCharacterDossier(parsed, rosterCharacter, index + 1);
      } catch (error) {
        lastError = error;
        console.warn(`[CHARACTER ${index + 1} ATTEMPT ${attempt}] ${error.message}`);
      }
    }

    if (!character) {
      console.warn(`[CHARACTER WARNING] Using fallback for ${rosterCharacter.name}: ${lastError?.message || 'generation failed'}`);
      character = normalizeCharacterDossier({}, rosterCharacter, index + 1);
    }

    characters.push(character);
    console.log(`[CHARACTER ${index + 1}] Generated ${character.name}. Total: ${characters.length}/${roster.length}`);
    if (typeof onCharacter === 'function') {
      await onCharacter(character, index + 1, roster.length);
    }
  }

  return {
    characters,
    charactersMarkdown: buildCharactersMarkdown(characters)
  };
}

function generateNarrativeFallbackChapter(chapterNum, totalChapters, previousChapter, title, prompt, wordsPerChapter = 2500) {
  const fraction = chapterNum / totalChapters;
  let defaultTitle = 'Rising Tension';
  let defaultSummary = 'Tensions build as new obstacles emerge and stakes increase.';

  if (fraction <= 0.25) {
    defaultTitle = 'First Crucible';
    defaultSummary = 'The initial momentum meets its first unexpected resistance, requiring an adjustment in strategy.';
  } else if (fraction <= 0.45) {
    defaultTitle = 'The Deepening Divide';
    defaultSummary = 'Stakes escalate as personal motivations collide with mounting external pressures and complications.';
  } else if (fraction <= 0.65) {
    defaultTitle = 'Midpoint Reckoning';
    defaultSummary = 'A pivotal turning point forces a difficult choice from which there is no turning back.';
  } else if (fraction <= 0.82) {
    defaultTitle = 'The Gathering Storm';
    defaultSummary = 'Previous assumptions crumble under intense pressure, leading toward an inevitable confrontation.';
  } else if (fraction <= 0.94) {
    defaultTitle = 'The Climax';
    defaultSummary = 'The central conflict reaches its fever pitch as characters put everything on the line.';
  } else {
    defaultTitle = 'Echoes and Horizons';
    defaultSummary = 'The dust settles in the aftermath, revealing the lasting changes wrought by the journey.';
  }

  return {
    chapterNumber: chapterNum,
    sceneNumber: chapterNum,
    title: defaultTitle,
    summary: defaultSummary,
    targetWords: wordsPerChapter
  };
}

/**
 * Step 3: Storyboard Creator (storyboard-creator.md)
 * Converts the plot roadmap into N chapter outline cards.
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
  model = DEFAULT_MODEL,
  provider = DEFAULT_PROVIDER,
  contextSize,
  temperature,
  topP,
  numPredict,
  onChapter
}) {
  const chapterCount = Math.max(3, Math.min(144, parseInt(targetChapterCount || targetSceneCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(targetTotalWords, 10) || (chapterCount * 2500)));
  const wordsPerChapter = targetWordsPerChapter || Math.round(totalWords / chapterCount);
  const readingInfo = getReadingLevelInstructions(readingLevel);
  const storyboardNumPredict = Math.max(4096, parseInt(numPredict, 10) || 0);

  console.log(`\n================ [STEP 3: STORYBOARD CREATOR CHAPTER CARDS] ================`);
  console.log(`Title: "${title}" | Target Chapters: ${chapterCount} | Target Words: ~${totalWords.toLocaleString()} (~${wordsPerChapter}w/ch) | Reading Level: ${readingInfo.levelName} | Model: ${model}`);

  let normalizedChapters = [];
  const maxAttemptsPerChapter = 3;

  for (let chapterIndex = 1; chapterIndex <= chapterCount; chapterIndex++) {
    let chapter = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttemptsPerChapter && !chapter; attempt++) {
      await resetOllamaMemory(model, provider);

      const previousContext = normalizedChapters.slice(-3).map(
        c => `Chapter ${c.chapterNumber} ("${c.title}"): ${c.summary}`
      ).join('\n');

      const systemPrompt = `You are a professional Chapter Outline Creator who transforms a high-level story roadmap into one clear, coherent chapter outline.

  You focus only on the major narrative progression of each chapter. Do not create character dossiers, character lists, dialogue, scene breakdowns, physical actions, emotional subtext, or visual direction.

TARGET AUDIENCE & READING LEVEL:
- Target Level: ${readingInfo.levelName}
- Style & Tone Guidance: ${readingInfo.proseGuidance}

CRITICAL INSTRUCTIONS:
- Generate exactly one storyboard card for Chapter ${chapterIndex} of ${chapterCount} total chapters.
- Target chapter word budget: approximately ${wordsPerChapter} words each.
- Provide only:
  * "chapterNumber": Integer (${chapterIndex})
  * "title": A distinct, compelling chapter title (do NOT prefix with "Chapter X:" or "Scene X:")
  * "summary": A detailed chapter outline of approximately 400-700 words and 8-12 substantial sentences. Cover the chapter's opening situation, sequential plot developments, important conflicts, turning points, consequences, thematic movement, and the transition into the next chapter. Do not write prose scenes or dialogue.
  * "targetWords": Target word count (${wordsPerChapter})

OUTPUT FORMAT (JSON only; do not reason, explain, or repeat any characters):
{
  "chapters": [
    {
      "chapterNumber": ${chapterIndex},
      "title": "Title Without Chapter Prefix",
      "summary": "Detailed chapter outline covering the opening situation, sequential plot developments, conflicts, turning points, consequences, thematic movement, and transition to the next chapter...",
      "targetWords": ${wordsPerChapter}
    }
  ]
}`;

      let userMessage = `Novel Title: ${title}\nStory Premise:\n${prompt}\nOverall Target: ${chapterCount} Chapters, ~${totalWords.toLocaleString()} Words (~${wordsPerChapter} words/chapter)\nTarget Reading Level: ${readingInfo.levelName}`;

      if (outline) {
        userMessage += `\n\nSTORY ROADMAP & CHAPTER OVERVIEW:\n${outline}`;
      }
      if (previousContext) {
        userMessage += `\n\nPREVIOUSLY ESTABLISHED CHAPTERS:\n${previousContext}`;
      }
      if (attempt > 1) {
        userMessage += `\n\nRETRY: Return only one valid JSON object with a "chapters" array containing exactly one chapter card for Chapter ${chapterIndex}. Do not include thinking tags, markdown, commentary, or any text before or after the JSON.`;
      }

      userMessage += `\n\nGenerate only the JSON chapter card for Chapter ${chapterIndex}.`;

      try {
        const response = await requestChat({
          provider,
          model,
          json: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          think: false,
          stream: false,
          options: {
            ...generationOptions({ contextSize, temperature, topP, numPredict: storyboardNumPredict }, { contextSize: 16384, temperature: 0.2, numPredict: 4096 }),
            repeat_penalty: 1.15
          }
        })

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Ollama returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const rawContent = getResponseText(data, provider);
        const parsed = cleanAndParseJSON(rawContent);
        const generatedChapter = extractChaptersFromParsedJSON(parsed)[0];

        if (!generatedChapter) {
          throw new Error('Invalid or empty JSON response');
        }

        chapter = {
          chapterNumber: chapterIndex,
          sceneNumber: chapterIndex,
          title: cleanChapterTitle(generatedChapter.title, chapterIndex),
          summary: generatedChapter.summary || generatedChapter.description || 'Chapter narrative progression.',
          targetWords: generatedChapter.targetWords || wordsPerChapter
        };
      } catch (err) {
        lastError = err;
        console.warn(`[STORYBOARD CHAPTER ${chapterIndex} ATTEMPT ${attempt}] ${err.message}`);
      } finally {
        await resetOllamaMemory(model, provider);
      }
    }

    if (!chapter) {
      console.warn(`[STORYBOARD WARNING] Using fallback for Chapter ${chapterIndex}: ${lastError?.message || 'generation failed'}`);
      chapter = generateNarrativeFallbackChapter(
        chapterIndex,
        chapterCount,
        normalizedChapters[normalizedChapters.length - 1],
        title,
        prompt,
        wordsPerChapter
      );
    }

    normalizedChapters.push(chapter);
    console.log(`[STORYBOARD CHAPTER ${chapterIndex}] Generated 1 chapter. Total: ${normalizedChapters.length}/${chapterCount}`);
    if (typeof onChapter === 'function') {
      await onChapter(chapter, chapterIndex, chapterCount);
    }
  }

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
  generateCharacterCards,
  generateStoryboardOutline,
  cleanChapterTitle,
  getReadingLevelInstructions
};
