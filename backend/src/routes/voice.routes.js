const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const voiceController = require('../controllers/voice.controller');

router.use(authMiddleware);

// Voice agent controls
router.post('/start', voiceController.startVoiceAgent);
router.post('/stop', voiceController.stopVoiceAgent);
router.get('/status', voiceController.getVoiceAgentStatus);

// Voice agent configuration
router.get('/config', voiceController.getVoiceConfig);
router.put('/config', voiceController.updateVoiceConfig);

module.exports = router;