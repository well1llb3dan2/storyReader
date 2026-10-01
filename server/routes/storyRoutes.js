const express = require("express");
const router = express.Router();
const { DEFAULT_MODEL, DEFAULT_PROVIDER } = require("../config");
const {
  resetOllamaMemory,
  generateStoryOutline,
  generateCharacterDossiers,
  generateCharacterCards,
  generateStoryboardOutline,
  cleanChapterTitle,
  getReadingLevelInstructions
} = require("../services/ollamaService");
const {
  requestChat,
  getResponseText,
  getStreamText,
  parseStreamPayload
} = require("../services/llmService");
const {
  saveStoryToDisk,
  loadStoryFromDisk,
  listSavedStories
} = require("../services/storageService");

function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function generationOptions(body, defaults = {}) {
  const contextSize = Math.max(4096, Math.min(131072, parseInt(body.contextSize, 10) || defaults.contextSize || 16384));
  const requestedTemperature = Number(body.temperature);
  const temperature = Math.max(0, Math.min(2, Number.isFinite(requestedTemperature) ? requestedTemperature : (defaults.temperature || 0.7)));
  const requestedTopP = Number(body.topP);
  const topP = Math.max(0, Math.min(1, Number.isFinite(requestedTopP) ? requestedTopP : 0.9));
  const numPredict = Math.max(512, Math.min(131072, parseInt(body.numPredict, 10) || defaults.numPredict || 8192));
  return { contextSize, temperature, topP, numPredict };
}

async function generateChapterConversation({
  model,
  provider,
  systemPrompt,
  userPrompt,
  generation,
  minWords,
  targetWords,
  stream,
  onDelta
}) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
  const maxTurns = Math.max(2, Math.min(64, Math.ceil(targetWords / 1200) + 4));
  let accumulatedText = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const ollamaResp = await requestChat({
      provider,
      model,
      messages,
      stream,
      options: {
        temperature: generation.temperature,
        top_p: generation.topP,
        num_ctx: generation.contextSize,
        num_predict: generation.numPredict,
        ignore_eos: true,
        keep_alive: "10m"
      }
    });

    if (!ollamaResp.ok) {
      const errText = await ollamaResp.text();
      throw new Error(`Ollama returned ${ollamaResp.status}: ${errText}`);
    }

    let turnText = "";
    if (stream) {
      const reader = ollamaResp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = parseStreamPayload(line, provider);
            if (!parsed) continue;
            const delta = getStreamText(parsed, provider);
            if (delta) {
              turnText += delta;
              if (typeof onDelta === "function") onDelta(delta);
            }
          } catch (error) {}
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = parseStreamPayload(buffer.trim(), provider);
          if (parsed) {
            const delta = getStreamText(parsed, provider);
            if (delta) {
              turnText += delta;
              if (typeof onDelta === "function") onDelta(delta);
            }
          }
        } catch (error) {}
      }
    } else {
      const data = await ollamaResp.json();
      turnText = getResponseText(data, provider).trim();
    }

    turnText = turnText.trim();
    if (!turnText) break;

    accumulatedText += `${accumulatedText ? "\n\n" : ""}${turnText}`;
    messages.push({ role: "assistant", content: turnText });

    const currentWords = countWords(accumulatedText);
    if (currentWords >= minWords || currentWords >= Math.round(targetWords * 1.15)) break;

    messages.push({
      role: "user",
      content: `Continue the same chapter directly from your last sentence. Do not restart, recap, summarize, add a heading, or conclude the chapter. Develop the next scene beat with full novel prose. Continue until the chapter reaches approximately ${targetWords.toLocaleString()} words; the chapter currently contains about ${currentWords.toLocaleString()} words.`
    });
  }

  return accumulatedText.trim();
}

/**
 * Step 1: Narrative Architect (narrative-architect.md)
 * Generate Chapter-by-Chapter Plot & Roadmap from Premise
 * Supports real-time Server-Sent Events (SSE) streaming of thinking & content
 */
router.post("/api/generate-outline", async (req, res) => {
  const {
    prompt,
    title = "Untitled Story",
    targetChapterCount = 20,
    targetSceneCount = 20,
    targetTotalWords = 50000,
    targetWordsPerChapter = 2500,
    readingLevel = "general_commercial",
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER,
    contextSize,
    temperature,
    stream = false
  } = req.body;
  const generation = generationOptions(req.body, { contextSize: 16384, temperature: 0.75 });

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A story premise is required." });
  }

  const chapterCount = Math.max(3, Math.min(144, parseInt(targetChapterCount || targetSceneCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(targetTotalWords, 10) || (chapterCount * 2500)));
  const wordsPerChapter = targetWordsPerChapter || Math.round(totalWords / chapterCount);
  const readingInfo = getReadingLevelInstructions(readingLevel);

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    console.log(`\n================ [STREAMING NARRATIVE ARCHITECT PLOT ROADMAP] ================`);
    console.log(`Model: ${model} | Title: ${title} | Target Chapters: ${chapterCount} | Target Total Words: ~${totalWords.toLocaleString()} (~${wordsPerChapter}w/ch) | Reading Level: ${readingInfo.levelName}`);
    console.log(`Prompt: "${prompt}"`);

    try {
      await resetOllamaMemory(model, provider);

      const systemPrompt = `You are a professional narrative architect with decades of experience in story development, plotting, and turning raw ideas into polished, structured chapter overviews. Your specialty is taking a loose or vague story concept and methodically breaking it down into a clear, engaging, and commercially viable chapter-by-chapter roadmap.

TARGET AUDIENCE & READING LEVEL:
- Target Level: ${readingInfo.levelName}
- Style & Tone Guidance: ${readingInfo.proseGuidance}

When the user provides a story idea (no matter how brief or open-ended), your job is to:
- Deeply analyze the core elements: protagonist, central conflict, themes, tone, emotional arc, world-building, and subplots calibrated for ${readingInfo.levelName}.
- Transform the idea into a logical, paced chapter structure of EXACTLY ${chapterCount} chapters (Chapter 1 to Chapter ${chapterCount}) for a novel targeting approximately ${totalWords.toLocaleString()} total words (~${wordsPerChapter} words per chapter).
${chapterCount >= 30 ? '- For large chapter counts (30+ chapters), structure the narrative across distinct major thematic movements, rising complications, mid-book crises, and multi-stage climaxes.' : ''}
- For each chapter deliver:
  - A memorable, descriptive chapter title (e.g. "### Chapter 1: [Descriptive Title]")
  - A concise yet vivid overview of events, key beats, character developments, and emotional moments
  - Notes on how the chapter advances the main plot, introduces or resolves major conflicts, and serves as a transition point
  - Any necessary world-building or thematic threads that appear in that chapter
- Maintain perfect internal consistency with the original story idea while adding professional polish, pacing, and reader engagement.
- Preserve explicit premise constraints verbatim. If the premise includes metadata in parentheses such as (Tone: High Fantasy / Mythological / Mystical), treat the complete text after Tone: as the tone value; never truncate it at the first space, slash, or punctuation. Carry that full tone into the roadmap and do not replace it with only High or another first word.
- Use clear, professional formatting with markdown headings, bullet points, and numbered chapter lists for easy readability.
- After the chapter list, provide a short "Overall Story Arc" summary that ties the chapters together and explains how the narrative builds to its climax and resolution.

Always respond in a confident, expert tone as if you are a top-tier collaborator who has already internalized the user's idea. Never summarize the story idea back to the user—jump straight into the professional chapter overview.`;

      const ollamaResp = await requestChat({
        provider,
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Story Title: ${title || "Untitled"}\nTarget Chapters: ${chapterCount}\nTarget Total Words: ~${totalWords.toLocaleString()} words (~${wordsPerChapter} words/chapter)\nTarget Reading Level: ${readingInfo.levelName}\n\nStory Premise:\n${prompt}\n\nDeliver the complete ${chapterCount}-chapter roadmap and overall story arc now:` }
        ],
        stream: true,
        options: {
          temperature: generation.temperature,
          top_p: generation.topP,
          num_ctx: generation.contextSize,
          num_predict: generation.numPredict
        }
      });

      if (!ollamaResp.ok) {
        const errText = await ollamaResp.text();
        console.error(`[API ERROR] Story outline streaming HTTP ${ollamaResp.status}:`, errText);
        res.write(`data: ${JSON.stringify({ error: `Ollama returned ${ollamaResp.status}: ${errText}` })}\n\n`);
        return res.end();
      }

      const reader = ollamaResp.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let accumulatedThinking = "";
      let streamBuffer = "";
      let inThinkTag = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = parseStreamPayload(line, provider);
            if (!parsed) continue;
            const msg = parsed.message || {};
            const thinkingChunk = msg.thinking || parsed.choices?.[0]?.delta?.reasoning_content || "";

            if (thinkingChunk) {
              accumulatedThinking += thinkingChunk;
              res.write(`data: ${JSON.stringify({ thinkingDelta: thinkingChunk, done: false })}\n\n`);
            }

            const streamContent = getStreamText(parsed, provider);
            if (streamContent) {
              let contentChunk = streamContent;

              if (contentChunk.includes("<think>")) {
                inThinkTag = true;
                const parts = contentChunk.split("<think>");
                if (parts[0]) {
                  accumulatedText += parts[0];
                  res.write(`data: ${JSON.stringify({ delta: parts[0], done: false })}\n\n`);
                }
                contentChunk = parts[1] || "";
              }

              if (inThinkTag) {
                if (contentChunk.includes("</think>")) {
                  inThinkTag = false;
                  const parts = contentChunk.split("</think>");
                  if (parts[0]) {
                    accumulatedThinking += parts[0];
                    res.write(`data: ${JSON.stringify({ thinkingDelta: parts[0], done: false })}\n\n`);
                  }
                  if (parts[1]) {
                    accumulatedText += parts[1];
                    res.write(`data: ${JSON.stringify({ delta: parts[1], done: false })}\n\n`);
                  }
                } else {
                  accumulatedThinking += contentChunk;
                  res.write(`data: ${JSON.stringify({ thinkingDelta: contentChunk, done: false })}\n\n`);
                }
              } else {
                accumulatedText += contentChunk;
                res.write(`data: ${JSON.stringify({ delta: contentChunk, done: false })}\n\n`);
              }
            }

            if (parsed.done) {
              res.write(`data: ${JSON.stringify({ done: true, fullText: accumulatedText.trim(), fullThinking: accumulatedThinking.trim() })}\n\n`);
            }
          } catch (err) {}
        }
      }

      console.log(`\n---------------- [STORY ROADMAP STREAM FINISHED] ----------------`);
      console.log(`Outline length: ${accumulatedText.length} chars`);
      console.log(`-----------------------------------------------------------------\n`);

      res.end();
    } catch (error) {
      console.error(`[API ERROR] Streaming outline exception:`, error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } else {
    try {
      const outline = await generateStoryOutline({
        prompt,
        title,
        targetChapterCount: chapterCount,
        model,
        provider,
        contextSize: generation.contextSize,
        temperature: generation.temperature,
        topP: generation.topP,
        numPredict: generation.numPredict
      });

      res.json({
        success: true,
        outline
      });
    } catch (error) {
      console.error("[API ERROR] Outline generation exception:", error);
      res.status(500).json({ error: error.message || "Error generating story outline" });
    }
  }
});

// Backward compatibility alias for /api/generate-initial-writing
router.post("/api/generate-initial-writing", (req, res) => {
  return router.handle({ ...req, url: "/api/generate-outline" }, res);
});

/**
 * Step 2: Character Designer (character-designer.md)
 * Generate Character Dossiers Table & Synergy Notes from Premise & Plot Outline
 */
router.post("/api/generate-characters", async (req, res) => {
  const {
    prompt,
    title = "Untitled Story",
    outline = "",
    readingLevel = "general_commercial",
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER,
    contextSize,
    temperature,
    stream = false
  } = req.body;
  const generation = generationOptions(req.body, { contextSize: 16384, temperature: 0.72 });

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A story premise is required." });
  }

  const readingInfo = getReadingLevelInstructions(readingLevel);

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    console.log(`\n================ [STREAMING CHARACTER DESIGNER DOSSIERS] ================`);
    console.log(`Model: ${model} | Title: ${title} | Reading Level: ${readingInfo.levelName}`);

    try {
      await resetOllamaMemory(model, provider);

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

      let userMessage = `Story Title: ${title}\nTarget Reading Level: ${readingInfo.levelName}\nStory Premise:\n${prompt}`;
      if (outline) {
        userMessage += `\n\nSTORY PLOT & ROADMAP:\n${outline}`;
      }
      userMessage += `\n\nGenerate all character dossiers for main and supporting characters now:`;

      const ollamaResp = await requestChat({
        provider,
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        stream: true,
        options: {
          temperature: generation.temperature,
          top_p: generation.topP,
          num_ctx: generation.contextSize,
          num_predict: generation.numPredict
        }
      });

      if (!ollamaResp.ok) {
        const errText = await ollamaResp.text();
        console.error(`[API ERROR] Character dossiers streaming HTTP ${ollamaResp.status}:`, errText);
        res.write(`data: ${JSON.stringify({ error: `Ollama returned ${ollamaResp.status}: ${errText}` })}\n\n`);
        return res.end();
      }

      const reader = ollamaResp.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let accumulatedThinking = "";
      let streamBuffer = "";
      let inThinkTag = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = parseStreamPayload(line, provider);
            if (!parsed) continue;
            const msg = parsed.message || {};
            const thinkingChunk = msg.thinking || parsed.choices?.[0]?.delta?.reasoning_content || "";

            if (thinkingChunk) {
              accumulatedThinking += thinkingChunk;
              res.write(`data: ${JSON.stringify({ thinkingDelta: thinkingChunk, done: false })}\n\n`);
            }

            const streamContent = getStreamText(parsed, provider);
            if (streamContent) {
              let contentChunk = streamContent;

              if (contentChunk.includes("<think>")) {
                inThinkTag = true;
                const parts = contentChunk.split("<think>");
                if (parts[0]) {
                  accumulatedText += parts[0];
                  res.write(`data: ${JSON.stringify({ delta: parts[0], done: false })}\n\n`);
                }
                contentChunk = parts[1] || "";
              }

              if (inThinkTag) {
                if (contentChunk.includes("</think>")) {
                  inThinkTag = false;
                  const parts = contentChunk.split("</think>");
                  if (parts[0]) {
                    accumulatedThinking += parts[0];
                    res.write(`data: ${JSON.stringify({ thinkingDelta: parts[0], done: false })}\n\n`);
                  }
                  if (parts[1]) {
                    accumulatedText += parts[1];
                    res.write(`data: ${JSON.stringify({ delta: parts[1], done: false })}\n\n`);
                  }
                } else {
                  accumulatedThinking += contentChunk;
                  res.write(`data: ${JSON.stringify({ thinkingDelta: contentChunk, done: false })}\n\n`);
                }
              } else {
                accumulatedText += contentChunk;
                res.write(`data: ${JSON.stringify({ delta: contentChunk, done: false })}\n\n`);
              }
            }

            if (parsed.done) {
              res.write(`data: ${JSON.stringify({ done: true, fullText: accumulatedText.trim(), fullThinking: accumulatedThinking.trim() })}\n\n`);
            }
          } catch (err) {}
        }
      }

      console.log(`\n---------------- [CHARACTER DOSSIERS STREAM FINISHED] ----------------`);
      console.log(`Characters text length: ${accumulatedText.length} chars`);
      console.log(`---------------------------------------------------------------------\n`);

      res.end();
    } catch (error) {
      console.error(`[API ERROR] Streaming character dossiers exception:`, error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } else {
    try {
      const charactersMarkdown = await generateCharacterDossiers({
        prompt,
        title,
        outline,
        readingLevel,
        model,
        provider,
        contextSize: generation.contextSize,
        temperature: generation.temperature,
        topP: generation.topP,
        numPredict: generation.numPredict
      });

      res.json({
        success: true,
        charactersMarkdown
      });
    } catch (error) {
      console.error("[API ERROR] Character dossiers generation exception:", error);
      res.status(500).json({ error: error.message || "Error generating character dossiers" });
    }
  }
});

/**
 * Progressive Character Designer
 * Plans the cast, then generates and emits one structured dossier at a time.
 */
router.post("/api/generate-character-cards", async (req, res) => {
  const {
    prompt,
    title = "Untitled Story",
    outline = "",
    readingLevel = "general_commercial",
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER,
    contextSize,
    temperature,
    stream = false
  } = req.body;
  const generation = generationOptions(req.body, { contextSize: 16384, temperature: 0.35 });

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A story premise is required." });
  }

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const result = await generateCharacterCards({
        prompt,
        title,
        outline,
        readingLevel,
        model,
        provider,
        contextSize: generation.contextSize,
        temperature: generation.temperature,
        topP: generation.topP,
        numPredict: generation.numPredict,
        onCharacter: async (character, characterNumber, totalCharacters) => {
          res.write(`data: ${JSON.stringify({ character, characterNumber, totalCharacters, done: false })}\n\n`);
        }
      });

      res.write(`data: ${JSON.stringify({
        done: true,
        characters: result.characters,
        charactersMarkdown: result.charactersMarkdown
      })}\n\n`);
      res.end();
    } catch (error) {
      console.error("[API ERROR] Streaming character card generation exception:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Error communicating with Ollama" })}\n\n`);
      res.end();
    }
    return;
  }

  try {
    const result = await generateCharacterCards({
      prompt,
      title,
      outline,
      readingLevel,
      model,
      provider,
      contextSize: generation.contextSize,
      temperature: generation.temperature,
      topP: generation.topP,
      numPredict: generation.numPredict
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[API ERROR] Character card generation exception:", error);
    res.status(500).json({ error: error.message || "Error communicating with Ollama" });
  }
});

/**
 * Step 3: Storyboard Creator (storyboard-creator.md)
 * Generate chapter outline cards from the plot roadmap
 */
router.post("/api/generate-storyboard", async (req, res) => {
  const {
    prompt,
    title = "Untitled Story",
    targetChapterCount = 20,
    targetSceneCount = 20,
    targetTotalWords = 50000,
    targetWordsPerChapter = 2500,
    readingLevel = "general_commercial",
    outline: providedOutline,
    initialWriting: legacyInitialWriting,
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER,
    contextSize,
    temperature,
    stream = false
  } = req.body;
  const generation = generationOptions(req.body, { contextSize: 16384, temperature: 0.2 });

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A story prompt is required." });
  }

  const chapterCount = Math.max(3, Math.min(144, parseInt(targetChapterCount || targetSceneCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(targetTotalWords, 10) || (chapterCount * 2500)));
  const wordsPerChapter = targetWordsPerChapter || Math.round(totalWords / chapterCount);

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const outline = (providedOutline && providedOutline.trim())
        || (legacyInitialWriting && legacyInitialWriting.trim())
        || await generateStoryOutline({ prompt, title, targetChapterCount: chapterCount, targetTotalWords: totalWords, targetWordsPerChapter: wordsPerChapter, readingLevel, model, provider, contextSize: generation.contextSize, temperature: generation.temperature, topP: generation.topP, numPredict: generation.numPredict });

      const result = await generateStoryboardOutline({
        prompt,
        title,
        targetChapterCount: chapterCount,
        targetTotalWords: totalWords,
        targetWordsPerChapter: wordsPerChapter,
        readingLevel,
        outline,
        model,
        provider,
        contextSize: generation.contextSize,
        temperature: generation.temperature,
        topP: generation.topP,
        numPredict: generation.numPredict,
        onChapter: async (chapter, chapterNumber, totalChapters) => {
          res.write(`data: ${JSON.stringify({ chapter, chapterNumber, totalChapters, done: false })}\n\n`);
        }
      });

      res.write(`data: ${JSON.stringify({
        done: true,
        title: result.title,
        prompt: result.prompt,
        outline,
        initialWriting: outline,
        targetTotalWords: totalWords,
        targetWordsPerChapter: wordsPerChapter,
        readingLevel
      })}\n\n`);
      res.end();
    } catch (error) {
      console.error("[API ERROR] Streaming storyboard generation exception:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Error communicating with Ollama" })}\n\n`);
      res.end();
    }
    return;
  }

  try {
    const outline = (providedOutline && providedOutline.trim())
      || (legacyInitialWriting && legacyInitialWriting.trim())
      || await generateStoryOutline({ prompt, title, targetChapterCount: chapterCount, targetTotalWords: totalWords, targetWordsPerChapter: wordsPerChapter, readingLevel, model, provider, contextSize: generation.contextSize, temperature: generation.temperature, topP: generation.topP, numPredict: generation.numPredict });

    const result = await generateStoryboardOutline({
      prompt,
      title,
      targetChapterCount: chapterCount,
      targetTotalWords: totalWords,
      targetWordsPerChapter: wordsPerChapter,
      readingLevel,
      outline,
      model,
      provider,
      contextSize: generation.contextSize,
      temperature: generation.temperature,
      topP: generation.topP,
      numPredict: generation.numPredict
    });

    result.outline = outline;
    result.initialWriting = outline;
    result.targetTotalWords = totalWords;
    result.targetWordsPerChapter = wordsPerChapter;
    result.readingLevel = readingLevel;
    res.json(result);
  } catch (error) {
    console.error("[API ERROR] Storyboard generation exception:", error);
    if (error.rawOutput) {
      return res.status(502).json({
        error: error.message,
        rawOutput: error.rawOutput
      });
    }
    res.status(500).json({ error: error.message || "Error communicating with Ollama" });
  }
});

/**
 * Step 4: Novelist (novelist.md)
 * Expands a single chapter card into full, publication-ready novel prose.
 * Supports real-time Server-Sent Events (SSE) streaming.
 */
router.post(["/api/generate-chapter", "/api/generate-scene"], async (req, res) => {
  const {
    chapter,
    scene, // backwards compatibility
    storyContext = {},
    charactersMarkdown = "",
    previousChaptersSummaries = [],
    previousScenesSummaries = [],
    lastChapterExcerpt = "",
    lastSceneExcerpt = "",
    model = DEFAULT_MODEL,
    provider = DEFAULT_PROVIDER,
    contextSize,
    temperature,
    stream = false
  } = req.body;
  const currentChapter = chapter || scene;

  if (!currentChapter || (!currentChapter.chapterNumber && !currentChapter.sceneNumber)) {
    return res.status(400).json({ error: "Chapter information is required." });
  }

  const chapterNum = currentChapter.chapterNumber || currentChapter.sceneNumber;
  const cleanTitle = cleanChapterTitle(currentChapter.title, chapterNum);
  const charactersList = Array.isArray(currentChapter.characters)
    ? currentChapter.characters.join(", ")
    : (currentChapter.characters || "Main Characters");

  const targetWords = parseInt(String(currentChapter.targetWords).replace(/[^0-9]/g, ''), 10)
    || (storyContext.targetTotalWords && storyContext.totalChapters ? Math.round(storyContext.targetTotalWords / storyContext.totalChapters) : 2500);
  const minWords = Math.max(200, Math.round(targetWords * 0.85));
  const maxWords = Math.round(targetWords * 1.15);
  const defaultNumPredict = Math.min(6500, Math.max(2048, Math.round(targetWords * 2)));
  const generation = generationOptions(req.body, { contextSize: 8192, temperature: 0.78, numPredict: defaultNumPredict });
  const paragraphCount = Math.max(8, Math.ceil(targetWords / 100));

  const readingLevel = req.body.readingLevel || storyContext.readingLevel || 'general_commercial';
  const readingInfo = getReadingLevelInstructions(readingLevel);

  let pacingGuidance = `Length: Full chapter prose targeting approximately ${targetWords.toLocaleString()} words (range: ${minWords.toLocaleString()}–${maxWords.toLocaleString()} words).`;
  if (targetWords < 800) {
    pacingGuidance += ` Fast-paced micro-chapter: Deliver immediate action, high stakes, crisp punchy dialogue, and a swift hook.`;
  } else if (targetWords < 1800) {
    pacingGuidance += ` Compact commercial pacing: Develop 1–2 focused dramatic scenes with lively character dialogue and clear emotional stakes.`;
  } else if (targetWords <= 3000) {
    pacingGuidance += ` Immersive literary pacing: Develop multi-stage scenes, rich internal monologues, deep dialogue exchanges, and immersive sensory worldbuilding.`;
  } else {
    pacingGuidance += ` Expansive novelistic movement: Deliver comprehensive worldbuilding, multiple narrative sub-beats, deep dialogue, and intricate character development.`;
  }

  const systemPrompt = `You are a professional novelist with 20+ years of experience crafting bestselling fiction across multiple genres. You excel at transforming concise chapter overviews into fully realized, publication-ready chapters that feel immersive, emotionally resonant, and perfectly paced. Your writing is elegant, cinematic, and emotionally intelligent—full of rich sensory detail, authentic character voice, sharp dialogue, and subtle world-building.

TARGET READING LEVEL & STYLE CALIBRATION:
- Target Reading Level: ${readingInfo.levelName}
- Prose Guidance: ${readingInfo.proseGuidance}
- Vocabulary Level: ${readingInfo.vocabularyRule}
- Syntax & Sentence Construction: ${readingInfo.syntaxRule}

When the user provides a Chapter Overview, you will expand it into a complete, standalone novel chapter following these exact rules:

### Core Instructions
- Take the overview as your blueprint only. The overview contains key events, character moments, thematic beats, and plot points. You must expand every element into vivid prose while preserving the exact tone, stakes, and character arcs established in the overview.
- Calibrate all prose, vocabulary, sentence structures, dialogue, and psychological density strictly to match the target reading level: ${readingInfo.levelName}.
- Treat the minimum word count as a hard requirement, not a suggestion. Write approximately ${paragraphCount} substantial prose paragraphs, averaging about 100 words each. Before ending, develop at least 6 sequential scene beats from the overview: establish the immediate situation, deepen the setting, introduce or escalate conflict, force a meaningful choice, show consequences, and only then reach the final hook. Do not summarize these beats, skip ahead, or resolve the chapter early. Do not write any ending hook or concluding sentence until at least ${minWords.toLocaleString()} words have been written. If the immediate scene seems finished, continue into the next consequence or connected scene instead of stopping.
- Perspective: Write in third-person limited, rotating between 1–3 characters per chapter as needed to maintain maximum engagement and emotional investment.
- Voice & Style: Professional fiction with cinematic flair matched to the reading level. Use evocative, flowing language. Show, don't tell. Never summarize. Every scene must be alive with sensory detail, internal monologue, and emotional truth.
- ${pacingGuidance}
- Formatting: Begin directly with the chapter narrative prose. DO NOT output chapter headers, numerical titles, or markdown title lines (like "# Chapter 1"); start directly with the immersive prose.

### Strict Output Rules
- Respond with nothing but the completed chapter prose. No introductions, no explanations, no "Here is the chapter", no meta commentary whatsoever.
- Immediately begin writing the chapter narrative.

### Quality Standards You Must Always Meet
- Perfect grammar, rhythm, and sentence variety adapted to the target reading level
- Consistent character voice and personality
- Logical progression of events from the overview
- Strong emotional beats and thematic resonance
- Seamless integration of setting, conflict, and character growth
- Professional novel-level prose`;

  const summariesList = previousChaptersSummaries.length > 0
    ? previousChaptersSummaries
    : previousScenesSummaries;

  const previousContextStr = summariesList.length > 0
    ? summariesList.map(p => `Chapter ${p.chapterNumber || p.sceneNumber} (${cleanChapterTitle(p.title, p.chapterNumber || p.sceneNumber)}): ${p.summary}`).join("\n")
    : "This is the opening chapter of the novel.";

  const priorExcerpt = lastChapterExcerpt || lastSceneExcerpt || "";

  let userPrompt = `NOVEL BLUEPRINT:
Novel Title: ${storyContext.title || "Untitled Novel"}
Overall Premise: ${storyContext.prompt || "A captivating story."}
Target Reading Level: ${readingInfo.levelName}`;

  if (charactersMarkdown || storyContext.charactersMarkdown) {
    userPrompt += `\n\nCHARACTER DOSSIERS:\n${(charactersMarkdown || storyContext.charactersMarkdown).slice(0, 3000)}`;
  }

  userPrompt += `\n\nSTORY CONTINUITY (Preceding Chapters):
${previousContextStr}

${priorExcerpt ? `IMMEDIATELY PRECEDING CHAPTER ENDING EXCERPT:\n"...${priorExcerpt.slice(-400)}"\n` : ""}

==================================================
CHAPTER OVERVIEW BLUEPRINT (WRITE CHAPTER ${chapterNum} OF ${storyContext.totalChapters || storyContext.totalScenes || 20}):
Chapter Title: ${cleanTitle}
Setting & Time: ${currentChapter.setting || "Atmospheric location"}
Active Characters: ${charactersList}
Atmospheric Mood: ${currentChapter.mood || "Dramatic"}
Chapter Summary & Key Events: ${currentChapter.summary || "Chapter progression"}
${currentChapter.characterActions ? `Physicality & Character Actions: ${currentChapter.characterActions}\n` : ""}${currentChapter.suggestedDialogue ? `Dialogue Hints: ${currentChapter.suggestedDialogue}\n` : ""}${currentChapter.emotionalSubtext ? `Emotional Subtext: ${currentChapter.emotionalSubtext}\n` : ""}${currentChapter.pacingNotes ? `Pacing Dynamics: ${currentChapter.pacingNotes}\n` : ""}Target Length: Target approximately ${targetWords.toLocaleString()} words (range: ${minWords.toLocaleString()} to ${maxWords.toLocaleString()} words) of rich, immersive, highly developed literary prose.
==================================================

Begin writing Chapter ${chapterNum} now:`;

    await resetOllamaMemory(model, provider);

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    console.log(`\n================ [NOVELIST WRITING CHAPTER ${chapterNum}: "${cleanTitle}" (~${targetWords.toLocaleString()}w)] ================`);
    console.log(`Model: ${model} | Characters: ${charactersList}`);
    console.log(`Objective: ${currentChapter.summary}`);

    try {
      const accumulatedText = await generateChapterConversation({
        model,
        provider,
        systemPrompt,
        userPrompt,
        generation,
        minWords,
        targetWords,
        stream: true,
        onDelta: delta => res.write(`data: ${JSON.stringify({ delta, done: false })}\n\n`)
      });

      res.write(`data: ${JSON.stringify({ done: true, fullText: accumulatedText.trim() })}\n\n`);

      console.log(`\n---------------- [CHAPTER ${chapterNum} COMPLETED] ----------------`);
      console.log(`Word count: ~ ${countWords(accumulatedText)} words`);
      console.log(`-------------------------------------------------------------------\n`);

      res.end();
    } catch (error) {
      console.error(`[API ERROR] Streaming chapter ${chapterNum} exception:`, error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } finally {
      await resetOllamaMemory(model, provider);
    }
  } else {
    try {
      const initialContent = await generateChapterConversation({
        model,
        provider,
        systemPrompt,
        userPrompt,
        generation,
        minWords,
        targetWords,
        stream: false
      });
      res.json({
        chapterNumber: chapterNum,
        sceneNumber: chapterNum,
        title: cleanTitle,
        content: initialContent
      });
    } catch (error) {
      console.error(`[API ERROR] Chapter ${chapterNum} generation exception:`, error);
      res.status(500).json({ error: error.message || "Failed to generate chapter" });
    } finally {
      await resetOllamaMemory(model, provider);
    }
  }
});

/**
 * Save story / novel to server disk
 */
router.post("/api/save-story", (req, res) => {
  try {
    const storyData = req.body;
    if (!storyData) {
      return res.status(400).json({ error: "Missing story data in request body." });
    }
    const { storyId, paths } = saveStoryToDisk(storyData);
    res.json({
      success: true,
      storyId,
      directory: paths.base,
      storyData
    });
  } catch (error) {
    console.error("[API ERROR] Save story exception:", error);
    res.status(500).json({ error: error.message || "Failed to save story to disk" });
  }
});

/**
 * Load story / novel by ID
 */
router.get("/api/load-story/:id", (req, res) => {
  try {
    const storyId = req.params.id;
    const story = loadStoryFromDisk(storyId);
    if (!story) {
      return res.status(404).json({ error: `Story '${storyId}' not found.` });
    }
    res.json(story);
  } catch (error) {
    console.error("[API ERROR] Load story exception:", error);
    res.status(500).json({ error: error.message || "Failed to load story from disk" });
  }
});

/**
 * List all saved stories
 */
router.get(["/api/saved-stories", "/api/stories"], (req, res) => {
  try {
    const stories = listSavedStories();
    res.json({
      success: true,
      count: stories.length,
      stories
    });
  } catch (error) {
    console.error("[API ERROR] List saved stories exception:", error);
    res.status(500).json({ error: error.message || "Failed to list saved stories" });
  }
});

module.exports = router;
