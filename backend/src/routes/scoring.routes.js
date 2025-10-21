const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const scoringController = require('../controllers/scoring.controller');

router.use(authMiddleware);

// Ron Maleziis scoring system
router.post('/calculate/:leadId', scoringController.calculateScore);
router.get('/:leadId/score', scoringController.getLeadScore);
router.get('/:leadId/breakdown', scoringController.getScoreBreakdown);

// Scoring configuration
router.get('/weights', scoringController.getScoringWeights);
router.put('/weights', scoringController.updateScoringWeights);

module.exports = router;