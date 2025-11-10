# Lead Scoring System Documentation

## Overview

The Enhanced Lead Scoring System provides comprehensive scoring beyond Ron Maleziis's BANTI framework, incorporating engagement metrics, intent signals, and demographic fit to help partners prioritize their recruiting efforts.

**Story:** 3.7 - Enhanced Lead Scoring System
**Author:** Claude AI Assistant
**Date:** 2025-11-05

---

## Architecture

### Components

1. **Service Layer** (`leadScoringService.js`)
   - Core scoring logic and calculations
   - AI-powered intent analysis using Claude
   - Score history tracking
   - Configuration management

2. **Controller Layer** (`leadScoring.controller.js`)
   - REST API endpoints
   - Request validation
   - Response formatting

3. **Routes** (`leadScoring.routes.js`)
   - API route definitions
   - Authentication middleware
   - Admin permission checks

4. **Queue System** (`leadScoring.queue.js`)
   - Asynchronous score calculations
   - Batch processing
   - Score decay jobs

5. **Cron Jobs** (`leadScoreDecay.cron.js`)
   - Daily automated score decay
   - Statistics tracking
   - Health monitoring

6. **Triggers** (`leadScoringTriggers.js`)
   - Integration with existing system
   - Automatic score updates
   - Event-driven recalculation

---

## Scoring Algorithm

### Total Score: 0-100 Points

#### 1. Qualification Score (0-40 points)
Based on Ron Maleziis BANTI framework:
- **≥70%**: 40 points
- **50-69%**: 25 points
- **30-49%**: 10 points
- **<30%**: 0 points

BANTI Fields:
- Business Interest (0-25)
- Employment Status (0-20)
- Income/Commitment (0-25)
- Personal Experience (0-15)
- Decision Making (0-15)

#### 2. Engagement Score (0-30 points)

**Recent Activity:**
- Call within 7 days: +15 points
- Call within 30 days: +10 points
- Call within 90 days: +5 points
- No calls in 90+ days: 0 points

**Interaction Frequency:**
- 5+ calls: +10 points
- 3-4 calls: +7 points
- 1-2 calls: +3 points

**Positive Signals:**
- SMS reply: +5 points
- Email open: +3 points
- Email click: +5 points

#### 3. Intent Signals (0-20 points)

AI analysis of call transcripts detects:
- Explicit interest ("I'm interested"): +10 points
- Asked questions: +5 points
- Requested callback: +10 points
- Handled objections positively: +5 points
- Hard objections: -10 points

#### 4. Demographic Fit (0-10 points)

- Timezone alignment (US-based): +5 points
- High-opportunity location: +5 points
- Source quality:
  - Referrals: +10 points
  - Facebook/LinkedIn: +5 points
  - Purchased lists: 0 points

---

## Score Classification

| Classification | Score Range | Auto Status Update |
|---------------|-------------|-------------------|
| Hot | 80-100 | Sets status to "qualified" |
| Warm | 60-79 | Status "nurturing" or "contacted" |
| Cool | 40-59 | Status "new" or "contacted" |
| Cold | <40 | Sets to "not_interested" if no activity 90+ days |

---

## Score Decay

Scores naturally decay over time to reflect lead freshness:

- **Engagement Points**: Decay 20% per month
- **Intent Points**: Decay 50% per month
- **Qualification Points**: No decay (remains stable)
- **Demographic Points**: No decay

**Example:**
```
Initial: Engagement = 30, Intent = 20
After 1 month: Engagement = 24 (-20%), Intent = 10 (-50%)
After 2 months: Engagement = 19 (-20% again), Intent = 5 (-50% again)
```

---

## API Endpoints

### Lead-Specific Endpoints

#### Calculate Score
```http
POST /api/leads/:lead_id/calculate-score?async=true
```

**Query Parameters:**
- `async` (optional): If true, queues for async processing

**Response:**
```json
{
  "success": true,
  "data": {
    "qualification": 40,
    "engagement": 25,
    "intent": 10,
    "demographic": 10,
    "total": 85,
    "classification": "hot",
    "calculatedAt": "2025-11-05T10:00:00Z"
  }
}
```

#### Get Score History
```http
GET /api/leads/:lead_id/score-history?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "score": 85,
        "factors": {...},
        "calculated_at": "2025-11-05T10:00:00Z"
      }
    ],
    "trend": "increasing",
    "count": 10
  }
}
```

#### Get Score Breakdown
```http
GET /api/leads/:lead_id/score-breakdown
```

Returns detailed breakdown of all scoring factors.

#### Get Score Comparison
```http
GET /api/leads/:lead_id/score-comparison?periods=3
```

Compare scores across time periods with change analysis.

### General Endpoints

#### Get Top Scored Leads
```http
GET /api/leads/top-scored?limit=50&minScore=80
```

Returns hot leads list sorted by score.

### Admin Endpoints

#### Get Configuration
```http
GET /api/admin/lead-scoring/config
```

Returns current scoring weights and settings.

#### Update Configuration (Master Admin Only)
```http
PATCH /api/admin/lead-scoring/config
```

**Body:**
```json
{
  "weights": {
    "qualification": 0.4,
    "engagement": 0.3,
    "intent": 0.2,
    "demographic": 0.1
  }
}
```

Weights must sum to 1.0.

#### Get Statistics
```http
GET /api/admin/lead-scoring/stats
```

Returns score distribution across all leads.

#### Batch Recalculate (Master Admin Only)
```http
POST /api/admin/lead-scoring/recalculate-all
```

**Body:**
```json
{
  "batchSize": 100,
  "async": true
}
```

---

## Database Schema

### PostgreSQL: lead_score_history

```sql
CREATE TABLE lead_score_history (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    factors JSONB NOT NULL,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_lead_score_history_lead_id`
- `idx_lead_score_history_calculated_at`
- `idx_lead_score_history_score`
- `idx_lead_score_history_lead_date`

### PostgreSQL: system_config

```sql
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Caching Strategy

### Redis Cache Keys

- `lead:score:{leadId}` - Individual lead score (TTL: 1 hour)
- `leads:top_scored:{minScore}:{limit}` - Top scored lists (TTL: 30 minutes)

**Cache Invalidation:**
Automatic on:
- Score recalculation
- Lead status update
- Call completion
- Nurture interaction

---

## Integration Points

### 1. Call Completion (Webhook Handler)

Add to `webhook.controller.js`:

```javascript
const { triggerScoreAfterCall } = require('../integrations/leadScoringTriggers');

// After call.hangup event processing
if (eventType === 'call.hangup' && leadId) {
  await triggerScoreAfterCall(leadId, payload);
}
```

### 2. Lead Status Update (Lead Controller)

Add to `lead.controller.js`:

```javascript
const { triggerScoreAfterStatusUpdate } = require('../integrations/leadScoringTriggers');

// After successful status update
await triggerScoreAfterStatusUpdate(leadId, { status: newStatus });
```

### 3. Manual Lead Update

Use middleware in routes:

```javascript
const { scoringTriggerMiddleware } = require('../integrations/leadScoringTriggers');

router.patch('/leads/:id', authenticate, scoringTriggerMiddleware, leadController.update);
```

---

## Bull Queue Jobs

### Job Types

1. **calculate-score**: Single lead score calculation
2. **batch-recalculation**: Bulk score recalculation
3. **apply-decay**: Single lead decay
4. **batch-decay**: Bulk decay (daily cron)
5. **invalidate-cache**: Cache invalidation

### Job Priorities

- **10**: Cache invalidation (highest)
- **7**: Post-nurture interaction
- **6**: Post-call completion
- **5**: Status/data updates
- **4**: Score decay
- **3**: Batch operations (lowest)

### Queue Monitoring

```javascript
const { getQueueStats } = require('./queues/leadScoring.queue');

const stats = await getQueueStats();
// Returns: { waiting, active, completed, failed, delayed, total }
```

---

## Cron Job Configuration

### Schedule

Default: Daily at 2 AM (configurable via env)

```bash
LEAD_DECAY_CRON="0 2 * * *"  # Daily at 2 AM
TZ="America/New_York"        # Timezone
```

### Manual Trigger

```javascript
const { runManualDecay } = require('./cron/leadScoreDecay.cron');

const result = await runManualDecay();
```

### Health Check

```javascript
const { healthCheck } = require('./cron/leadScoreDecay.cron');

const health = healthCheck();
// Returns: { healthy, lastRun, hoursSinceLastRun, message }
```

---

## Environment Variables

```bash
# Claude API for intent analysis
ANTHROPIC_API_KEY=your_api_key_here

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# PostgreSQL connection
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cron configuration
LEAD_DECAY_CRON="0 2 * * *"
TZ="America/New_York"
```

---

## Testing

Run unit tests:

```bash
npm test tests/services/leadScoring.test.js
```

Test coverage includes:
- Individual scoring components
- Score classification
- Edge cases
- Performance benchmarks
- Integration tests

---

## Performance Considerations

1. **Async Processing**: All score calculations can be queued for async processing
2. **Caching**: Aggressive caching with 1-hour TTL reduces database load
3. **Batch Operations**: Process 100 leads per batch to prevent overload
4. **AI Rate Limiting**: Intent analysis limited to 3 most recent calls
5. **Transcript Truncation**: Max 3000 characters per transcript analyzed

### Expected Performance

- Single score calculation: <2 seconds
- Batch of 100 leads: <5 minutes
- Daily decay job (1000 leads): <30 minutes

---

## Troubleshooting

### Score Not Updating

1. Check Bull queue status: `GET /api/admin/lead-scoring/stats`
2. Verify Redis connection
3. Check PostgreSQL connection
4. Review error logs

### Intent Analysis Failing

1. Verify `ANTHROPIC_API_KEY` is set
2. Check Claude API quota
3. Review transcript format
4. Falls back to keyword analysis on failure

### Cron Job Not Running

1. Check cron schedule: `LEAD_DECAY_CRON` env variable
2. Verify timezone: `TZ` env variable
3. Check health: `healthCheck()` function
4. Review cron logs

---

## Future Enhancements

1. **Machine Learning**: Train model to predict conversion probability
2. **A/B Testing**: Compare different scoring algorithms
3. **Predictive Scoring**: Forecast future lead quality
4. **Behavioral Patterns**: Detect patterns in successful conversions
5. **Custom Weights**: Per-user scoring weight configurations

---

## Support

For questions or issues:
- Review this documentation
- Check test files for examples
- Review service code comments
- Contact development team

---

## Changelog

### Version 1.0.0 (2025-11-05)
- Initial implementation
- Four-factor scoring system
- AI-powered intent analysis
- Automatic decay
- Queue-based processing
- Admin configuration
- Comprehensive testing