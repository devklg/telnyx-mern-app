# Gmail Real-Time Webhook Setup (Push Notifications)

## 🚀 Overview

Instead of polling Gmail every hour with a cron job, this setup uses **Gmail Push Notifications** to trigger imports **instantly** when emails arrive!

## ⚡ Comparison

| Method | Latency | Server Load | Complexity |
|--------|---------|-------------|------------|
| **Cron Job** | Up to 1 hour | High (constant polling) | Low |
| **Push Webhook** | Instant (~seconds) | Low (event-driven) | Medium |

## 📋 Prerequisites

1. Google Cloud Project with Gmail API enabled ✅ (you already have this)
2. Public URL for webhook endpoint (ngrok or deployed server)
3. Google Cloud Pub/Sub topic

## 🔧 Setup Instructions

### Option A: Quick Start with Ngrok (Development)

**1. Install ngrok:**
```bash
# Download from https://ngrok.com/download
# Or with Chocolatey on Windows:
choco install ngrok
```

**2. Start your backend:**
```bash
cd backend
npm start
# Backend running on http://localhost:3550
```

**3. Expose with ngrok:**
```bash
ngrok http 3550
```

You'll get a public URL like: `https://abc123.ngrok-free.app`

**4. Update your app.js to add webhook route:**
```javascript
const gmailWebhook = require('./routes/gmailWebhook');
app.use('/api/gmail', gmailWebhook);
```

**5. Setup Gmail Watch (one-time):**
```bash
curl -X POST http://localhost:3550/api/gmail/watch
```

### Option B: Full Production Setup (Google Cloud Pub/Sub)

**1. Create Google Cloud Pub/Sub Topic:**

```bash
# Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create Pub/Sub topic
gcloud pubsub topics create gmail-leads

# Create push subscription to your webhook
gcloud pubsub subscriptions create gmail-leads-sub \
  --topic=gmail-leads \
  --push-endpoint=https://your-domain.com/api/gmail/webhook
```

**2. Add to your `.env`:**
```bash
# Gmail Push Notifications
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-leads
WEBHOOK_BASE_URL=https://your-domain.com
```

**3. Grant Gmail permission to publish:**
```bash
gcloud pubsub topics add-iam-policy-binding gmail-leads \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

**4. Setup Gmail Watch:**
```bash
curl -X POST https://your-domain.com/api/gmail/watch
```

## 🎯 How It Works

### Flow Diagram:
```
1. Email arrives → register@leadpower.com
2. Gmail detects email with "Leads" label
3. Gmail → Pub/Sub Topic → Your Webhook
4. Webhook → Parse Email → Import to MongoDB
5. Total latency: ~2-5 seconds! ⚡
```

### Code Flow:
```javascript
POST /api/gmail/webhook
  ↓
Acknowledge (200 OK) immediately
  ↓
Decode Pub/Sub message
  ↓
Call gmailService.importLeads() async
  ↓
Lead appears in database instantly!
```

## 📝 Configuration

### Update `backend/src/app.js`:

```javascript
// Add webhook route (BEFORE other Gmail routes)
const gmailWebhook = require('./routes/gmailWebhook');
app.use('/api/gmail', gmailWebhook);

// Keep existing Gmail routes
const gmailRoutes = require('./routes/gmail');
app.use('/api/gmail', gmailRoutes);
```

### Watch Duration:

Gmail watch expires after **7 days**. You can:

**Option 1: Manual renewal** (every 7 days):
```bash
curl -X POST http://localhost:3550/api/gmail/watch
```

**Option 2: Auto-renewal with cron** (add to `server.js`):
```javascript
const cron = require('node-cron');

// Renew Gmail watch every 6 days
cron.schedule('0 0 */6 * *', async () => {
  try {
    await gmailService.renewWatch();
    console.log('✅ Gmail watch renewed');
  } catch (error) {
    console.error('❌ Failed to renew watch:', error);
  }
});
```

## 🧪 Testing

### 1. Test webhook endpoint is accessible:
```bash
curl https://your-domain.com/api/gmail/webhook
# Should return: "Gmail webhook endpoint is active"
```

### 2. Send test email:
- Email to: `dev.lamont.202@gmail.com`
- From: `register@leadpower.com`
- Label it "Leads" in Gmail
- Watch your server logs!

Expected output:
```
📨 Gmail notification received: { emailAddress: '...', historyId: '...' }
🔄 Processing notification...
📧 Starting Gmail lead import from label: Leads
✅ Imported lead: Test User (test@example.com)
✅ Webhook-triggered import completed: { processed: 1, imported: 1 }
```

### 3. Verify in database:
```bash
curl http://localhost:3550/api/leads
```

## 🛡️ Security

### Validate Pub/Sub Messages (Optional but Recommended):

Add to `gmailWebhook.js`:
```javascript
const crypto = require('crypto');

function validatePubSubMessage(req) {
  const signature = req.headers['x-goog-signature'];
  const body = JSON.stringify(req.body);
  
  // Verify signature with your service account key
  // Implementation depends on your security requirements
  return true;
}
```

## 🐛 Troubleshooting

### Webhook not receiving notifications?

1. **Check Gmail watch is active:**
```bash
# If this fails, watch expired
curl -X POST http://localhost:3550/api/gmail/watch
```

2. **Verify Pub/Sub topic exists:**
```bash
gcloud pubsub topics list
```

3. **Check webhook is publicly accessible:**
```bash
curl https://your-ngrok-url.com/api/gmail/webhook
```

4. **Check server logs for errors**

### Watch keeps expiring?

Gmail watches expire after 7 days. Set up auto-renewal with the cron job shown above.

### No emails being processed?

1. Verify emails have the "Leads" label
2. Check they're from `register@leadpower.com`
3. Manually trigger import to test parsing:
```bash
curl -X POST http://localhost:3550/api/gmail/import
```

## 🔄 Migration from Cron to Webhook

**Current Setup (Cron):**
```javascript
// In server.js
gmailImportCron.start(); // ❌ Remove this
```

**New Setup (Webhook):**
```javascript
// In app.js
app.use('/api/gmail', require('./routes/gmailWebhook'));

// One-time setup:
// curl -X POST http://localhost:3550/api/gmail/watch
```

**Keep cron as backup** (check every 6 hours in case webhook fails):
```javascript
// Change from hourly to every 6 hours
GMAIL_IMPORT_CRON=0 */6 * * *
```

## 📊 Benefits

✅ **Instant imports** - Leads available within seconds  
✅ **Lower server load** - No constant polling  
✅ **More scalable** - Event-driven architecture  
✅ **Better user experience** - Real-time updates  

## 🎉 Next Steps

1. Choose Option A (ngrok) or Option B (production)
2. Set up webhook endpoint
3. Configure Gmail watch
4. Test with a real email
5. Enjoy instant lead imports! ⚡

---

**Questions?** Test the setup and let me know if you hit any issues!
