# Lead Scoring System - Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Run Database Migration
```bash
psql -U your_user -d your_database -f backend/database/migrations/003_lead_score_history.sql
```

### 2. Add Environment Variables
```bash
# Add to .env file
ANTHROPIC_API_KEY=your_claude_api_key_here
LEAD_DECAY_CRON="0 2 * * *"  # Optional: defaults to 2 AM daily
TZ="America/New_York"         # Optional: defaults to UTC
```

### 3. Mount Routes in server.js
```javascript
// Add to backend/src/server.js
const leadScoringRoutes = require('./routes/leadScoring.routes');
const { scheduleDecayCron } = require('./cron/leadScoreDecay.cron');
const { initializeScoringTriggers } = require('./integrations/leadScoringTriggers');

// After other routes
app.use('/api/leads', leadScoringRoutes);

// Initialize on startup
initializeScoringTriggers();
scheduleDecayCron();
```

---

## 🔗 Integration Points

### Webhook Handler (webhook.controller.js)
```javascript
const { triggerScoreAfterCall } = require('../integrations/leadScoringTriggers');

// Add after call.hangup event processing
if (eventType === 'call.hangup' && leadId) {
  await triggerScoreAfterCall(leadId, payload);
}
```

### Lead Controller (lead.controller.js)
```javascript
const {
  triggerScoreAfterStatusUpdate,
  triggerScoreAfterLeadUpdate
} = require('../integrations/leadScoringTriggers');

// In updateStatus function
await triggerScoreAfterStatusUpdate(leadId, { status: newStatus });

// In update function
await triggerScoreAfterLeadUpdate(leadId, req.body);
```

### Lead Routes (leads.routes.js)
```javascript
const { scoringTriggerMiddleware } = require('../integrations/leadScoringTriggers');

// Add middleware to update route
router.patch('/:id', authenticate, scoringTriggerMiddleware, leadController.update);
```

---

## 📊 Key API Endpoints

### Calculate Score
```bash
POST /api/leads/:lead_id/calculate-score
```

### Get Hot Leads
```bash
GET /api/leads/top-scored?limit=50&minScore=80
```

### View Score History
```bash
GET /api/leads/:lead_id/score-history
```

### Admin Config
```bash
GET /api/admin/lead-scoring/config
PATCH /api/admin/lead-scoring/config
```

---

## 🧪 Quick Test

```javascript
// Test score calculation
const { calculateLeadScore } = require('./services/leadScoringService');
const score = await calculateLeadScore('your_lead_id');
console.log(score); // { total: 85, classification: "hot", ... }

// Test cron job
const { runManualDecay } = require('./cron/leadScoreDecay.cron');
const result = await runManualDecay();
console.log(result); // { processed: 50, failed: 0, ... }
```

---

## 📈 Scoring Breakdown

| Component | Max Points | Description |
|-----------|------------|-------------|
| Qualification | 40 | Ron Maleziis BANTI |
| Engagement | 30 | Call activity + nurture |
| Intent | 20 | AI transcript analysis |
| Demographic | 10 | Location + source |
| **TOTAL** | **100** | **Classification** |

**Classifications:**
- 80-100: Hot 🔥
- 60-79: Warm 🌡️
- 40-59: Cool ❄️
- 0-39: Cold 🧊

---

## 🎯 Common Use Cases

### Recalculate All Scores
```bash
POST /api/admin/lead-scoring/recalculate-all
Body: { "batchSize": 100, "async": true }
```

### Get Score Breakdown
```bash
GET /api/leads/:lead_id/score-breakdown
```

### Apply Decay Manually
```bash
POST /api/leads/:lead_id/apply-decay
```

### View Statistics
```bash
GET /api/admin/lead-scoring/stats
```

---

## 🔍 Monitoring

### Check Queue Status
```javascript
const { getQueueStats } = require('./queues/leadScoring.queue');
const stats = await getQueueStats();
console.log(stats); // { waiting: 5, active: 2, completed: 100, ... }
```

### Check Cron Health
```javascript
const { healthCheck, getStats } = require('./cron/leadScoreDecay.cron');
const health = healthCheck();
const stats = getStats();
```

---

## ⚡ Performance Tips

1. **Use Async Mode**: Add `?async=true` to score calculations
2. **Cache Results**: Scores cached for 1 hour automatically
3. **Batch Operations**: Process 100+ leads via batch endpoint
4. **Schedule Off-Peak**: Cron runs at 2 AM by default

---

## 🐛 Troubleshooting

### Scores Not Updating?
- Check Bull queue: `getQueueStats()`
- Verify Redis connection
- Check error logs

### AI Intent Analysis Failing?
- Verify `ANTHROPIC_API_KEY`
- Falls back to keyword analysis automatically

### Cron Not Running?
- Check `LEAD_DECAY_CRON` env variable
- Verify timezone setting
- Call `healthCheck()`

---

## 📚 Full Documentation

See: `backend/src/services/README_LEAD_SCORING.md`

---

## ✅ Quick Checklist

- [ ] Database migration run
- [ ] Environment variables set
- [ ] Routes mounted in server.js
- [ ] Cron job initialized
- [ ] Webhook integration added
- [ ] Lead controller integration added
- [ ] Routes middleware added
- [ ] Test endpoints working
- [ ] Queue processing verified
- [ ] Cron schedule confirmed

---

**Questions?** Check the full documentation or review test files for examples.