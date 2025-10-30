const router = require('express').Router();
const leadController = require('../controllers/lead.controller');
const auth = require('../middleware/auth.middleware');

// ============================================
// BASIC LEAD CRUD (David Rodriguez)
// ============================================
router.get('/', auth, leadController.getAll);
router.get('/:id', auth, leadController.getById);
router.post('/', auth, leadController.create);
router.put('/:id', auth, leadController.update);
router.delete('/:id', auth, leadController.delete);
router.get('/:id/calls', auth, leadController.getCallHistory);
router.post('/:id/notes', auth, leadController.addNote);

// ============================================
// LEAD QUEUE MANAGEMENT (James Taylor)
// ============================================
router.get('/queue/next', auth, leadController.getNextLead);
router.get('/queue/status', auth, leadController.getQueueStatus);
router.get('/queue/health', auth, leadController.getQueueHealth);
router.post('/:id/release', auth, leadController.releaseLead);

// ============================================
// LEAD LIFECYCLE MANAGEMENT (James Taylor)
// ============================================
router.put('/:id/status', auth, leadController.updateStatus);
router.post('/:id/follow-up', auth, leadController.scheduleFollowUp);
router.post('/:id/dnc', auth, leadController.addToDoNotCall);
router.get('/follow-ups/today', auth, leadController.getTodayFollowUps);
router.get('/follow-ups/overdue', auth, leadController.getOverdueFollowUps);
router.get('/stats/lifecycle', auth, leadController.getLifecycleStats);

// ============================================
// GMAIL IMPORT MANAGEMENT (James Taylor)
// ============================================
router.post('/import/gmail/trigger', auth, leadController.triggerGmailImport);
router.get('/import/gmail/stats', auth, leadController.getGmailImportStats);
router.get('/import/gmail/test', auth, leadController.testGmailConnection);

module.exports = router;
