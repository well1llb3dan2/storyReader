const express = require('express');
const router = express.Router();
const { checkOllamaStatus } = require('../services/ollamaService');

/**
 * Health check & Ollama status
 */
router.get('/api/status', async (req, res) => {
  try {
    const status = await checkOllamaStatus();
    res.json(status);
  } catch (error) {
    res.json({
      connected: false,
      error: error.message || 'Cannot reach Ollama server',
      models: []
    });
  }
});

module.exports = router;
