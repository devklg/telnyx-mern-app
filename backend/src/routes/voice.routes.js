const router = require('express').Router();
const voiceController = require('../controllers/voice.controller');

// Telnyx Configuration & Testing
router.get('/test-connection', voiceController.testConnection);
router.get('/configuration', voiceController.getConfiguration);
router.get('/websocket/status', voiceController.getWebSocketStatus);

// Call Management
router.post('/initiate', voiceController.initiateCall);
router.post('/transfer', voiceController.transferCall);
router.post('/answer', voiceController.answerCall);
router.post('/hangup', voiceController.hangupCall);
router.get('/status/:callControlId', voiceController.getCallStatus);

// Recording Management
router.post('/recording/start', voiceController.startRecording);
router.post('/recording/stop', voiceController.stopRecording);

// Voice Agent Integration
router.get('/agent/test', voiceController.testVoiceAgent);
router.get('/agent/configuration', voiceController.getVoiceAgentConfig);
router.post('/agent/start', voiceController.startCallWithAgent);
router.post('/agent/transfer', voiceController.requestKevinTransfer);

module.exports = router;
