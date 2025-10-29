const router = require('express').Router();
const agentController = require('../controllers/agent.controller');
const auth = require('../middleware/auth.middleware');

router.post('/phase-transition', auth, agentController.recordPhaseTransition);
router.get('/performance', auth, agentController.getPerformanceMetrics);

module.exports = router;
