# StoryReader — AI Novel Studio & Open Book Reader

A local Node.js web application that interfaces directly with your locally running **Ollama** server (using `hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q6_K`) for complete long-form novel generation from a premise.

---

## 🌟 Key Features

1. **Structured Storyboard Architecture (5–35 Scenes)**:
   - Takes your story premise, title, and scene count.
   - Generates a complete narrative outline and storyboard divided into 5 to 35 sequential chapters with settings, active character rosters, target lengths, and atmospheric mood.
   - Interactive storyboard card grid with inline editable summaries.

2. **Sequential One-by-One Novel Generation**:
   - Feeds each scene sequentially into `hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q6_K` as the previous finishes.
   - Preserves narrative context, preceding summaries, and continuity excerpts.
   - Standard dialogue quotation marks and immersive narrative prose.
   - Live stream preview, progress bar, word counter, and scene queue sidebar.

3. **Per-Story Multi-Folder Directory Architecture**:
   - Each story generated creates a dedicated directory under `data/stories/<story_id>/`:
     - `storyboard/`: Contains `storyboard.json` and human-readable `storyboard.md`.
     - `scenes/`: Contains individual scene markdown files (`scene_1.md`, `scene_2.md`, ...) and the full manuscript (`novel.md`).
     - `story.json`: Master project state.

4. **Realistic Open Book Novel Reader**:
   - Formatted physical 3D open novel spread (Left & Right pages) with page curl/turn animations.
   - Novel typography with chapter headings, drop caps, and reader controls.
   - Keyboard arrow (`←` / `→`) and margin click page flipping.
   - Table of Contents drawer to jump to any chapter.
   - Theme switchers: **Antique Parchment**, **Classic Paper**, **Warm Sepia**, **Dark Velvet**.
   - Export options: Markdown (`.md`), Plain Text (`.txt`), Print/PDF, and JSON project.

---

## 🚀 Quick Start

### 1. Ensure Ollama is Running
Make sure your local Ollama instance is running and has the model pulled:
```bash
ollama run hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q6_K
```

### 2. Start the Server
In this project folder:
```bash
npm start
```

### 3. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 📁 File Structure

- [server.js](server.js) — Node.js Express server entry point mounting modular route handlers and static assets.
- [server/](server/) — Backend library modules:
  - `config.js` — Environment, port, paths, and model configuration.
  - `utils/jsonParser.js` — Robust LLM JSON recovery and cleanup parser.
  - `utils/audioStitcher.js` — FFmpeg concatenation and audio task polling.
  - `services/storageService.js` — Multi-folder story persistence and retrieval.
  - `services/ollamaService.js` — Ollama health checks, storyboards, and streaming.
  - `services/imageService.js` — Seedream 5.0 Pro prompt construction and polling.
  - `services/ttsService.js` — Gemini 3.1 Flash TTS multi-speaker segmentation.
  - `routes/systemRoutes.js` — Health check & Ollama status endpoints.
  - `routes/storyRoutes.js` — Storyboard generation, scene writing, save & load endpoints.
  - `routes/imageRoutes.js` — Seedream 5.0 image generation endpoints.
  - `routes/ttsRoutes.js` — Multi-speaker TTS parsing, generation, and task polling endpoints.
- [index.html](index.html) — HTML interface containing Concept, Storyboard, Generation, and Open Book Reader stages.
- [styles.css](styles.css) — Stylesheet featuring open book layout, typography, themes, animations, and speaker badges.
- [js/](js/) — Frontend ES library modules:
  - `config/constants.js` — Voice lists, accents, styles, paces, and tone tags.
  - `state/store.js` — Central reactive state and API key persistence.
  - `api/apiClient.js` — Centralized fetch wrappers for backend API endpoints.
  - `modules/domElements.js` — Cached DOM element references.
  - `modules/utils.js` — Shared helpers, toast notifications, string formatters.
  - `modules/textFormatter.js` — Prose speaker and tone tag parser.
  - `modules/paginationEngine.js` — Two-page open book pagination and TOC engine.
  - `modules/audioPlayer.js` — Embedded HTML5 audiobook player controls.
  - `modules/storyStorage.js` — Story auto-save and library loader.
  - `modules/novelExporter.js` — Markdown, TXT, JSON, and print exports.
  - `stages/stageConcept.js` — Stage 1 prompt and outline initiation.
  - `stages/stageStoryboard.js` — Stage 2 scene review and Seedream 5.0 artwork generator.
  - `stages/stageGenerating.js` — Stage 3 live scene-by-scene generation engine.
  - `stages/stageReader.js` — Stage 4 open book reader and TTS Voice Studio.
  - `app.js` — Main application bootstrap and lifecycle controller.
- [package.json](package.json) — Node.js project configuration and scripts.
