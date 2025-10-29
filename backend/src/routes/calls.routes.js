const router = require('express').Router();
const callController = require('../controllers/call.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, callController.getAll);
router.get('/active', auth, callController.getActiveCalls);
router.get('/:id', auth, callController.getById);
router.post('/start', auth, callController.startCall);
router.post('/:id/end', auth, callController.endCall);
router.post('/:id/engagement', auth, callController.updateEngagementScore);
router.post('/:id/transfer', auth, callController.initiateHotTransfer);
router.get('/:id/recording', auth, callController.getRecording);

module.exports = router;
