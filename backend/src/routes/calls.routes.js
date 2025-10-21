const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const callController = require('../controllers/call.controller');

router.use(authMiddleware);

// Call management
router.get('/', callController.getAllCalls);
router.get('/:id', callController.getCallById);
router.post('/initiate', callController.initiateCall);
router.post('/:id/end', callController.endCall);

// Call recordings
router.get('/:id/recording', callController.getCallRecording);
router.get('/:id/transcript', callController.getCallTranscript);

// Call analytics
router.get('/analytics/summary', callController.getCallAnalytics);

module.exports = router;