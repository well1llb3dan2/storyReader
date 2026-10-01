const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT, OLLAMA_HOST, LLAMA_CPP_HOST, DEFAULT_MODEL, DEFAULT_PROVIDER, ROOT_DIR, AUDIO_DIR } = require("./server/config");
const { testOllamaStartup } = require("./server/services/ollamaService");

// Routers
const systemRoutes = require("./server/routes/systemRoutes");
const storyRoutes = require("./server/routes/storyRoutes");
const imageRoutes = require("./server/routes/imageRoutes");
const ttsRoutes = require("./server/routes/ttsRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(ROOT_DIR));
app.use("/data", express.static(path.join(ROOT_DIR, "data")));
app.use("/audio", express.static(AUDIO_DIR));

// Mount Modular API Routes
app.use(systemRoutes);
app.use(storyRoutes);
app.use(imageRoutes);
app.use(ttsRoutes);

// Server startup
app.listen(PORT, () => {
  console.log("=====================================================");
  console.log("  Story Reader Server running on http://localhost:" + PORT);
  console.log("  Ollama Target Host: " + OLLAMA_HOST);
  console.log("  llama.cpp Target Host: " + LLAMA_CPP_HOST);
  console.log("  Default Provider: " + DEFAULT_PROVIDER);
  console.log("  Default Model: " + DEFAULT_MODEL);
  console.log("=====================================================");

  // Run startup connection sanity check
  testOllamaStartup(DEFAULT_PROVIDER);
});
