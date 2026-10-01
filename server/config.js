const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LLAMA_CPP_HOST = process.env.LLAMA_CPP_HOST || 'http://127.0.0.1:8080';
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || 'ollama';
const DEFAULT_MODEL = 'hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q6_K';

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
  LLAMA_CPP_HOST,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  ROOT_DIR,
  STORIES_DIR,
  AUDIO_DIR
};
