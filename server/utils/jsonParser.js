/**
 * Utility to extract and parse JSON from LLM text responses with automatic repair
 */
function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText.trim();

  // Try extracting from ```json ... ``` blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 1. Direct standard JSON parse
  try {
    const directParsed = JSON.parse(cleaned);
    return directParsed;
  } catch (e) {
    // Continue to extractor/repairers
  }

  // 2. Find the first JSON array '[' or object '{'
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    // Array format
    let arrayContent = cleaned.substring(firstBracket);
    const lastBracket = arrayContent.lastIndexOf(']');
    if (lastBracket !== -1) {
      arrayContent = arrayContent.substring(0, lastBracket + 1);
    }

    try {
      return JSON.parse(arrayContent);
    } catch (e) {
      try {
        const fixed = arrayContent
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'");
        return JSON.parse(fixed);
      } catch (e2) {
        const lastValidBrace = arrayContent.lastIndexOf('}');
        if (lastValidBrace !== -1) {
          const repaired = arrayContent.substring(0, lastValidBrace + 1)
            .replace(/,\s*$/, '') + ']';
          try {
            return JSON.parse(repaired);
          } catch (e3) {
            // Fall through to regex block recovery
          }
        }
      }
    }
  } else if (firstBrace !== -1) {
    // Single object format
    let objContent = cleaned.substring(firstBrace);
    const lastBrace = objContent.lastIndexOf('}');
    if (lastBrace !== -1) {
      objContent = objContent.substring(0, lastBrace + 1);
    }
    try {
      return JSON.parse(objContent);
    } catch (e) {
      try {
        const fixed = objContent
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'");
        return JSON.parse(fixed);
      } catch (e2) {
        // Fall through
      }
    }
  }

  // 3. Fallback: Regex extraction of individual scene blocks even if truncated
  const sceneBlocks = cleaned.split(/\{\s*"sceneNumber"/i).slice(1);
  if (sceneBlocks.length > 0) {
    const recoveredScenes = [];
    for (let i = 0; i < sceneBlocks.length; i++) {
      const block = '{"sceneNumber"' + sceneBlocks[i];
      const sceneNumMatch = block.match(/"sceneNumber"\s*:\s*(\d+)/i);
      const titleMatch = block.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/i);
      const settingMatch = block.match(/"setting"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/i);
      const summaryMatch = block.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/i);
      const moodMatch = block.match(/"mood"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/i);
      const charsMatch = block.match(/"characters"\s*:\s*\[([\s\S]*?)\]/i);

      let chars = [];
      if (charsMatch && charsMatch[1]) {
        chars = (charsMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) || []).map(c => c.replace(/^"|"$/g, ''));
      }

      if (sceneNumMatch || titleMatch) {
        const charList = chars.length > 0 ? chars.join(' and ') : 'Main Character';
        recoveredScenes.push({
          sceneNumber: sceneNumMatch ? parseInt(sceneNumMatch[1], 10) : i + 1,
          title: titleMatch ? titleMatch[1] : `Scene ${i + 1}`,
          setting: settingMatch ? settingMatch[1] : 'Various',
          characters: chars.length > 0 ? chars : ['Main Characters'],
          summary: summaryMatch ? summaryMatch[1] : `Subject: ${charList} in Scene ${i + 1}. Key narrative progression. Arrangement: Medium shot with balanced composition. Camera and Light: 35mm lens, soft atmospheric lighting. Palette and Style: Cinematic film still. Extra Detail: Detailed textures and atmospheric depth.`,
          targetWords: 600,
          mood: moodMatch ? moodMatch[1] : 'Dramatic'
        });
      }
    }
    if (recoveredScenes.length > 0) return recoveredScenes;
  }

  console.error('JSON parsing failed. Raw response snippet:', rawText.substring(0, 300));
  return null;
}

module.exports = {
  cleanAndParseJSON
};
