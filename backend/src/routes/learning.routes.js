const router = require('express').Router();
const learningController = require('../controllers/learning.controller');
const auth = require('../middleware/auth.middleware');

router.get('/insights', auth, learningController.getInsights);
router.get('/patterns', auth, learningController.getPatterns);

module.exports = router;
