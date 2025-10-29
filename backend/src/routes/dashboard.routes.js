const router = require('express').Router();
const auth = require('../middleware/auth.middleware');

router.get('/stats', auth, async (req, res) => {
  // Dashboard statistics
  res.json({ totalLeads: 0, qualifiedLeads: 0, callsMade: 0 });
});

module.exports = router;
