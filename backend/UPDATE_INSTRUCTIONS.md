# Story 3.4: Final Integration Steps

## Remaining Manual Updates

### 1. Register Recommendation Routes in app.js

Add this line after the graph-rag routes in `src/app.js`:

```javascript
app.use('/api/recommendations', require('./routes/recommendation.routes'));
```

Full context:
```javascript
app.use('/api/learning', require('./routes/learning.routes'));
app.use('/api/graph-rag', require('./routes/graph-rag.routes'));
app.use('/api/recommendations', require('./routes/recommendation.routes'));  // ADD THIS LINE

// Health check
app.get('/health', (req, res) => {
```

### 2. Start Recommendation Cron Job in server.js

Add this code after the Gmail cron job initialization in `src/server.js`:

```javascript
// Initialize Recommendation Regeneration Cron Job (Story 3.4)
const recommendationCron = require('./cron/recommendation-regeneration.cron');
recommendationCron.start();
console.log('✅ Recommendation regeneration cron job started');
```

Full context (add after line 66):
```javascript
} else {
  console.log('⚠️  Gmail Lead Import not configured (set GMAIL_* env variables)');
}

// Initialize Recommendation Regeneration Cron Job (Story 3.4)
const recommendationCron = require('./cron/recommendation-regeneration.cron');
recommendationCron.start();
console.log('✅ Recommendation regeneration cron job started');

// Start server
server.listen(PORT, () => {
```

### 3. Add Cron Job Cleanup in Shutdown Handler

Add this to the SIGTERM handler in `src/server.js`:

```javascript
// Stop Recommendation cron job
const recommendationCron = require('./cron/recommendation-regeneration.cron');
recommendationCron.stop();
console.log('Recommendation cron job stopped');
```

Full context (add after line 88):
```javascript
gmailImportCron.stop();
console.log('Gmail cron job stopped');
}

// Stop Recommendation cron job
const recommendationCron = require('./cron/recommendation-regeneration.cron');
recommendationCron.stop();
console.log('Recommendation cron job stopped');

// Disconnect Telnyx WebSocket
telnyxWebSocket.disconnect();
```

### 4. Optional: Add Cache Invalidation Middleware to Lead Routes

In `src/routes/leads.routes.js`, add cache invalidation to lead update endpoints:

```javascript
const { invalidateCacheOnLeadUpdate } = require('../middleware/recommendation-invalidation.middleware');

// Add middleware to update routes
router.patch('/:id', invalidateCacheOnLeadUpdate, leadController.update);
router.put('/:id/status', invalidateCacheOnLeadUpdate, leadController.updateStatus);
```

### 5. Optional: Add Cache Invalidation to Call Webhooks

In the call completion webhook handler, add:

```javascript
const { invalidateCacheOnCallComplete } = require('../middleware/recommendation-invalidation.middleware');

// Add to call completion route
router.post('/call/completed', invalidateCacheOnCallComplete, webhookController.handleCallCompleted);
```

## Testing After Integration

1. **Start the server:**
```bash
cd backend
npm install
npm run dev
```

2. **Test health check:**
```bash
curl http://localhost:3550/health
```

3. **Test recommendation endpoint:**
```bash
curl "http://localhost:3550/api/recommendations?user_id=YOUR_USER_ID"
```

4. **Verify cron job is running:**
Check console output for: `✅ Recommendation regeneration cron job started`

5. **Check Redis connection:**
Console should show: `✅ Redis connected`

6. **Verify Bull queue:**
```bash
# In Node REPL or test script
const { getQueueStats } = require('./src/queues/recommendation.queue');
getQueueStats().then(console.log);
```

## Environment Variables Checklist

Ensure these are set in `.env`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
MONGODB_URI=mongodb://localhost:27017/your-db
REDIS_URL=redis://localhost:6379

# Optional (for Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Other existing vars
PORT=3550
NODE_ENV=development
```

## Troubleshooting

### Routes not found (404)
- Check that recommendation routes are registered in `app.js`
- Restart the server

### Recommendations not generating
- Verify ANTHROPIC_API_KEY is set
- Check MongoDB has leads with `assignedTo` field
- Check Redis is connected

### Cron job not running
- Verify cron job is started in `server.js`
- Check console for initialization messages
- Test manual run: `recommendationCron.runManual()`

### Cache not working
- Verify Redis connection
- Check cache TTL (default 1 hour)
- Try force_refresh parameter

## Done!

Once these manual steps are complete, Story 3.4 will be fully integrated and operational.
