const router = require('express').Router();
const callController = require('../controllers/call.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, callController.getAll);
router.get('/:id', auth, callController.getById);
router.post('/', auth, callController.create);
router.get('/:id/recording', auth, callController.getRecording);

module.exports = router;
