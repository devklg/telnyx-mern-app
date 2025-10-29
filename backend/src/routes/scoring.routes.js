const router = require('express').Router();
const scoringController = require('../controllers/scoring.controller');
const auth = require('../middleware/auth.middleware');

router.post('/calculate/:leadId', auth, scoringController.calculateScore);
router.get('/lead/:leadId', auth, scoringController.getScore);
router.put('/update/:leadId', auth, scoringController.updateScore);

module.exports = router;
