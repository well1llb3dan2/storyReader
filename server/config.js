const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q6_K_P';

// Root directory
const ROOT_DIR = path.resolve(__dirname, '..');

// Data directories for stories and audio
const STORIES_DIR = path.join(ROOT_DIR, 'data', 'stories');
const AUDIO_DIR = path.join(ROOT_DIR, 'data', 'audio');

// Ensure data directories exist
if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

module.exports = {
  PORT,
  OLLAMA_HOST,
  DEFAULT_MODEL,
  ROOT_DIR,
  STORIES_DIR,
  AUDIO_DIR
};
