const router = require('express').Router();
const voiceController = require('../controllers/voice.controller');

router.post('/initiate', voiceController.initiateCall);
router.post('/transfer', voiceController.transferCall);
router.get('/status/:callId', voiceController.getCallStatus);

module.exports = router;
