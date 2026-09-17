const fs = require('fs');
const path = require('path');
const { AUDIO_DIR, OLLAMA_HOST, DEFAULT_MODEL } = require('../config');
const { cleanAndParseJSON } = require('../utils/jsonParser');
const {
  pollSingleTtsTask,
  downloadAudioFile,
  stitchMp3Files
} = require('../utils/audioStitcher');
const { ensureStoryDirectories, loadStoryFromDisk, saveStoryToDisk } = require('./storageService');

const TTS_ALLOWED_VOICES = [
  'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Charon', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux',
  'Iapetus', 'Kore', 'Laomedeia', 'Leda', 'Orus', 'Puck', 'Pulcherrima',
  'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel',
  'Vindemiatrix', 'Zephyr', 'Zubenelgenubi'
];

const TTS_ALLOWED_ACCENTS = [
  'Neutral', 'American (Gen)', 'American (Valley)', 'American (South)',
  'British (RP)', 'British (Brixton)', 'Transatlantic', 'Australian'
];

const TTS_ALLOWED_STYLES = [
  'Vocal Smile', 'Newscaster', 'Whisper', 'Empathetic', 'Promo/Hype', 'Deadpan'
];

const TTS_ALLOWED_PACES = [
  'Natural', 'Rapid Fire', 'The Drift', 'Staccato'
];

const RECOGNIZED_TONE_TAGS = new Set([
  'whisper', 'whispers', 'whispering', 'shouting', 'shout', 'urgency', 'urgent',
  'pensive', 'seductive', 'tender', 'gasping', 'amused', 'cautious', 'breathless',
  'trembling', 'defiant', 'deadpan', 'vocal smile', 'determination', 'hesitant',
  'softly', 'tearful', 'playful', 'angry', 'mocking', 'excited', 'gentle',
  'tired', 'sensory', 'atmospheric', 'observational', 'intimate', 'focused',
  'tension', 'physical', 'climax', 'internal', 'action', 'pacing', 'building',
  'resolution', 'fade out', 'pause', 'dynamic', 'vulnerable', 'loud', 'dismissive',
  'escalating', 'narrative detail', 'internal monologue'
]);

function normalizeSpeakerName(rawName) {
  if (!rawName) return 'Narrator';
  let clean = rawName.replace(/^[\[\(]+|[\]\)]+$/g, '').replace(/\(.*?\)/g, '').trim();
  const lower = clean.toLowerCase();
  if (lower === 'narrator' || RECOGNIZED_TONE_TAGS.has(lower)) {
    return 'Narrator';
  }
  return clean || 'Narrator';
}

/**
 * Parses scene prose into individual line segments
 */
function parseSceneToSingleSpeakerSegments(content, customSpeakers = [], sceneContext = {}) {
  const speakerConfigMap = new Map();
  for (const s of customSpeakers) {
    if (s.name) {
      const cleanKey = normalizeSpeakerName(s.name).toLowerCase();
      speakerConfigMap.set(cleanKey, s);
      speakerConfigMap.set(s.name.trim().toLowerCase(), s);
    }
  }

  const defaultNarrator = speakerConfigMap.get('narrator') || {
    name: 'Narrator',
    voice_name: 'Zephyr',
    audio_profile: 'A warm and soothing novel narrator with immersive pacing',
    accent: 'British (RP)',
    style: 'Empathetic',
    pace: 'Natural'
  };

  function getSpeakerConfig(name) {
    const cleanName = normalizeSpeakerName(name);
    const key = cleanName.toLowerCase();
    if (key === 'narrator' || !key) return defaultNarrator;
    if (speakerConfigMap.has(key)) return speakerConfigMap.get(key);

    for (const [k, v] of speakerConfigMap.entries()) {
      if (k.includes(key) || key.includes(k)) return v;
    }

    return {
      name: cleanName,
      voice_name: 'Puck',
      audio_profile: `Character dialogue voice for ${cleanName}`,
      accent: 'American (Gen)',
      style: 'Vocal Smile',
      pace: 'Natural'
    };
  }

  const rawSegments = [];
  const paragraphs = (content || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  for (const para of paragraphs) {
    const tokens = para.split(/(\[[A-Za-z0-9\s'\-\.]{2,40}\])/g).map(t => t.trim()).filter(Boolean);
    let activeCharacter = 'Narrator';
    let activeTone = '';

    for (const token of tokens) {
      if (token.startsWith('[') && token.endsWith(']')) {
        const tagInner = token.slice(1, -1).trim();
        const tagLower = tagInner.toLowerCase();

        if (RECOGNIZED_TONE_TAGS.has(tagLower)) {
          activeTone = `[${tagLower}]`;
        } else {
          const norm = normalizeSpeakerName(tagInner);
          if (norm.toLowerCase() !== 'narrator') {
            activeCharacter = norm;
          } else {
            activeCharacter = 'Narrator';
          }
        }
      } else {
        const quoteParts = token.split(/([“"'][^”"']+?[”"'])/g).map(p => p.trim()).filter(Boolean);

        for (const part of quoteParts) {
          const isQuote = (part.startsWith('"') && part.endsWith('"')) ||
                          (part.startsWith('“') && part.endsWith('”')) ||
                          (part.startsWith('«') && part.endsWith('»')) ||
                          (part.startsWith("'") && part.endsWith("'") && part.length > 3);

          if (isQuote) {
            const speakerName = activeCharacter.toLowerCase() !== 'narrator'
              ? activeCharacter
              : (customSpeakers.find(s => s.name.toLowerCase() !== 'narrator')?.name || 'Character');

            let finalText = part;
            if (activeTone) {
              finalText = `${activeTone} ${finalText}`;
              activeTone = '';
            }

            rawSegments.push({
              speakerName: speakerName,
              text: finalText,
              isDialogue: true,
              speakerConfig: getSpeakerConfig(speakerName)
            });
          } else {
            let finalText = part;
            if (activeTone) {
              finalText = `${activeTone} ${finalText}`;
              activeTone = '';
            }

            finalText = finalText.trim();
            if (finalText.length > 0 && !/^["'“”«»]+$/.test(finalText)) {
              rawSegments.push({
                speakerName: 'Narrator',
                text: finalText,
                isDialogue: false,
                speakerConfig: defaultNarrator
              });
            }
          }
        }
      }
    }
  }

  // Merge adjacent non-dialogue narrator segments if neither has a distinct tone tag
  const mergedSegments = [];
  for (const seg of rawSegments) {
    if (
      mergedSegments.length > 0 &&
      mergedSegments[mergedSegments.length - 1].speakerName === seg.speakerName &&
      !seg.text.startsWith('[') &&
      !seg.isDialogue &&
      !mergedSegments[mergedSegments.length - 1].isDialogue
    ) {
      mergedSegments[mergedSegments.length - 1].text += ' ' + seg.text;
    } else {
      mergedSegments.push({ ...seg });
    }
  }

  if (mergedSegments.length === 0 && (content || '').trim()) {
    mergedSegments.push({
      speakerName: 'Narrator',
      text: content.trim(),
      speakerConfig: defaultNarrator
    });
  }

  // Build exact 1-speaker task payloads for each segment
  return mergedSegments.map((seg, idx) => ({
    segmentIndex: idx + 1,
    totalSegments: mergedSegments.length,
    speakerName: seg.speakerName,
    text: seg.text,
    speakerConfig: seg.speakerConfig,
    taskPayload: {
      model: 'google/gemini-3-1-flash-tts',
      input: {
        temperature: 1,
        scene: sceneContext.setting || 'Novel dramatic scene',
        sample_context: sceneContext.mood ? `Audiobook style narration. Mood is ${sceneContext.mood}.` : 'Audiobook style narration.',
        speakers: [
          {
            speaker_id: 'Speaker 1',
            voice_name: seg.speakerConfig.voice_name || 'Zephyr',
            audio_profile: seg.speakerConfig.audio_profile || `Audio profile for ${seg.speakerName}`,
            accent: seg.speakerConfig.accent || 'American (Gen)',
            style: seg.speakerConfig.style || 'Empathetic',
            pace: seg.speakerConfig.pace || 'Natural'
          }
        ],
        dialogue_turns: [
          {
            speaker_id: 'Speaker 1',
            text: seg.text
          }
        ]
      }
    }
  }));
}

/**
 * Generate Speaker Profiles with LLM (Ollama)
 */
async function generateSpeakerProfilesWithLLM({ title = 'Untitled Story', prompt = '', scenes = [], model = DEFAULT_MODEL }) {
  const characterSet = new Set();
  scenes.forEach(sc => {
    (sc.characters || []).forEach(c => {
      const clean = c.replace(/\(.*?\)/g, '').trim();
      if (clean && clean.toLowerCase() !== 'narrator') {
        characterSet.add(clean);
      }
    });
  });

  const charactersList = Array.from(characterSet);

  const systemPrompt = `You are a master audio drama casting director and novel producer.
Your job is to analyze the story's characters and narrative world, and generate a bespoke, personalized voice profile for EACH character in the story, plus the primary [Narrator].

You must assign:
1. "voice_name" ONLY from this allowed list of Gemini 3.1 Flash TTS voices:
   ${JSON.stringify(TTS_ALLOWED_VOICES)}
2. "accent" ONLY from this allowed list:
   ${JSON.stringify(TTS_ALLOWED_ACCENTS)}
3. "style" ONLY from this allowed list:
   ${JSON.stringify(TTS_ALLOWED_STYLES)}
4. "pace" ONLY from this allowed list:
   ${JSON.stringify(TTS_ALLOWED_PACES)}
5. "audio_profile": A rich, evocative 1-2 sentence description of their vocal texture, emotional resonance, age/demeanor, and vocal personality.

Output MUST be a single valid JSON object formatted as:
{
  "speakers": [
    {
      "name": "Narrator",
      "voice_name": "Zephyr",
      "accent": "British (RP)",
      "style": "Empathetic",
      "pace": "Natural",
      "audio_profile": "A rich, evocative novel narrator with warm storytelling cadence and emotional depth."
    },
    {
      "name": "CharacterName",
      "voice_name": "SelectedVoice",
      "accent": "SelectedAccent",
      "style": "SelectedStyle",
      "pace": "SelectedPace",
      "audio_profile": "Vivid description of character's vocal qualities and demeanor."
    }
  ]
}`;

  const userMessage = `Novel Title: ${title}
Core Premise: ${prompt}
Story Characters: ${charactersList.length > 0 ? charactersList.join(', ') : 'Protagonist, Antagonist, Supporting Character'}

Generate the complete JSON "speakers" list containing "Narrator" and all characters with tailored voices and descriptive audio profiles.`;

  console.log(`\n================ [GENERATING AI SPEAKER PROFILES] ================`);
  console.log(`Characters: Narrator, ${charactersList.join(', ')} | Model: ${model}`);

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
        num_ctx: 8192,
        num_predict: 4096
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[API ERROR] Speaker profiles HTTP ${response.status}:`, errText);
    throw new Error(`Ollama error: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.message?.content || '';
  console.log(`\n---------------- [AI SPEAKER PROFILES RAW RESPONSE] ----------------`);
  console.log(rawContent);
  console.log(`--------------------------------------------------------------------\n`);

  let parsed = cleanAndParseJSON(rawContent);
  let rawSpeakers = [];

  if (Array.isArray(parsed)) {
    rawSpeakers = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.speakers)) rawSpeakers = parsed.speakers;
    else if (Array.isArray(parsed.characters)) rawSpeakers = parsed.characters;
    else if (Array.isArray(parsed.voice_cast)) rawSpeakers = parsed.voice_cast;
    else rawSpeakers = Object.values(parsed).filter(v => v && typeof v === 'object' && v.name);
  }

  // Ensure Narrator exists
  const hasNarrator = rawSpeakers.some(s => (s.name || '').toLowerCase() === 'narrator');
  if (!hasNarrator) {
    rawSpeakers.unshift({
      name: 'Narrator',
      voice_name: 'Zephyr',
      accent: 'British (RP)',
      style: 'Empathetic',
      pace: 'Natural',
      audio_profile: 'A warm, resonant novel narrator with evocative storytelling cadence and emotional depth.'
    });
  }

  // Sanitize and ensure valid enums
  const validVoicesSet = new Set(TTS_ALLOWED_VOICES);
  const validAccentsSet = new Set(TTS_ALLOWED_ACCENTS);
  const validStylesSet = new Set(TTS_ALLOWED_STYLES);
  const validPacesSet = new Set(TTS_ALLOWED_PACES);

  const sanitizedSpeakers = rawSpeakers.map((s, idx) => ({
    speaker_id: `Speaker ${idx + 1}`,
    name: s.name || `Speaker ${idx + 1}`,
    voice_name: validVoicesSet.has(s.voice_name) ? s.voice_name : 'Puck',
    accent: validAccentsSet.has(s.accent) ? s.accent : 'American (Gen)',
    style: validStylesSet.has(s.style) ? s.style : 'Vocal Smile',
    pace: validPacesSet.has(s.pace) ? s.pace : 'Natural',
    audio_profile: s.audio_profile || `Distinct character dialogue voice for ${s.name}`
  }));

  console.log(`[SPEAKER PROFILES SUCCESS] Generated ${sanitizedSpeakers.length} speaker audio profiles.`);
  return sanitizedSpeakers;
}

module.exports = {
  TTS_ALLOWED_VOICES,
  TTS_ALLOWED_ACCENTS,
  TTS_ALLOWED_STYLES,
  TTS_ALLOWED_PACES,
  RECOGNIZED_TONE_TAGS,
  normalizeSpeakerName,
  parseSceneToSingleSpeakerSegments,
  generateSpeakerProfilesWithLLM
};
