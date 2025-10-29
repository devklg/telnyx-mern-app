const router = require('express').Router();
const leadController = require('../controllers/lead.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, leadController.getAll);
router.get('/:id', auth, leadController.getById);
router.post('/', auth, leadController.create);
router.put('/:id', auth, leadController.update);
router.delete('/:id', auth, leadController.delete);
router.get('/:id/calls', auth, leadController.getCallHistory);
router.post('/:id/notes', auth, leadController.addNote);

module.exports = router;
