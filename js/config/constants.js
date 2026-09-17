/**
 * TTS & Novel Studio Constants
 */

export const TTS_VOICES = [
  'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Charon', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux',
  'Iapetus', 'Kore', 'Laomedeia', 'Leda', 'Orus', 'Puck', 'Pulcherrima',
  'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel',
  'Vindemiatrix', 'Zephyr', 'Zubenelgenubi'
];

export const TTS_ACCENTS = [
  'Neutral', 'American (Gen)', 'American (Valley)', 'American (South)',
  'British (RP)', 'British (Brixton)', 'Transatlantic', 'Australian'
];

export const TTS_STYLES = [
  'Vocal Smile', 'Newscaster', 'Whisper', 'Empathetic', 'Promo/Hype', 'Deadpan'
];

export const TTS_PACES = [
  'Natural', 'Rapid Fire', 'The Drift', 'Staccato'
];

export const KNOWN_TONE_TAGS = new Set([
  'whisper', 'whispers', 'whispering', 'shouting', 'shout', 'urgency', 'urgent',
  'pensive', 'seductive', 'tender', 'gasping', 'amused', 'cautious', 'breathless',
  'trembling', 'defiant', 'deadpan', 'vocal smile', 'determination', 'hesitant',
  'softly', 'tearful', 'playful', 'angry', 'mocking', 'excited', 'gentle',
  'tired', 'sensory', 'atmospheric', 'observational', 'intimate', 'focused',
  'tension', 'physical', 'climax', 'internal', 'action', 'pacing', 'building',
  'resolution', 'fade out', 'pause', 'dynamic', 'vulnerable', 'loud', 'dismissive',
  'escalating', 'narrative detail', 'internal monologue'
]);
