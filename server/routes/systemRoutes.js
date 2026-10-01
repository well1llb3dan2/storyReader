const express = require('express');
const router = express.Router();
const { checkProviderStatus } = require('../services/llmService');

/**
 * Health check & Ollama status
 */
router.get('/api/status', async (req, res) => {
  try {
    const status = await checkProviderStatus(req.query.provider);
    res.json(status);
  } catch (error) {
    res.json({
      connected: false,
      provider: req.query.provider || 'ollama',
      error: error.message || 'Cannot reach Ollama server',
      models: []
    });
  }
});

module.exports = router;
