# Gmail Lead Import Setup Guide

**Author:** James Taylor - Lead Management Developer
**Purpose:** Automated lead import from dedicated Gmail account
**Status:** ✅ Ready for Configuration

---

## 🎯 Overview

The Gmail Lead Import system automatically fetches lead emails from a dedicated Gmail account every hour, parses them into Sarah Chen's Lead schema, and imports them into MongoDB with duplicate detection.

**Key Features:**
- ✅ Hourly automated imports (configurable)
- ✅ Duplicate detection (by phone and email)
- ✅ E.164 phone format conversion
- ✅ Priority-based queue management
- ✅ Manual import trigger endpoint
- ✅ Bulk import scripts for initial data

---

## 📋 Prerequisites

Kevin, you'll need:

1. **Gmail Account** - Dedicated account for receiving lead emails
2. **Google Cloud Project** - For Gmail API access
3. **Lead Data Files** - Initial 600 fresh + 5000 aged leads
4. **Lead Email Format** - Who sends the leads and what format?

---

## 🔧 Step 1: Google Cloud Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "BMAD-Lead-Import"
3. Enable Gmail API:
   - APIs & Services → Library
   - Search "Gmail API"
   - Click Enable

### 1.2 Create OAuth2 Credentials

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Name: "BMAD Lead Import"
5. Authorized redirect URIs:
   ```
   http://localhost:3550/api/gmail/oauth2callback
   https://your-production-domain.com/api/gmail/oauth2callback
   ```
6. Click Create
7. **Save the Client ID and Client Secret**

### 1.3 Get Refresh Token

Run this Node.js script to get your refresh token:

```javascript
// Run: node scripts/getGmailToken.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';
const REDIRECT_URI = 'http://localhost:3550/api/gmail/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('Authorize this app by visiting:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('Your refresh token:', tokens.refresh_token);
  console.log('\nAdd this to your .env file as GMAIL_REFRESH_TOKEN');
});
```

**Steps:**
1. Save script as `backend/scripts/getGmailToken.js`
2. Update CLIENT_ID and CLIENT_SECRET
3. Run: `node scripts/getGmailToken.js`
4. Visit the URL shown
5. Grant permissions
6. Copy the authorization code
7. Paste into terminal
8. **Save the refresh token**

---

## 🔐 Step 2: Configure Environment Variables

Edit `backend/.env`:

```bash
# Gmail Lead Import Configuration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3550/api/gmail/oauth2callback
GMAIL_REFRESH_TOKEN=your-refresh-token

# Gmail Import Settings
GMAIL_LEAD_EMAIL=leads@yourdomain.com
GMAIL_IMPORT_LABEL=LEADS                    # Optional: Gmail label to filter
GMAIL_IMPORT_CRON=0 * * * *                 # Every hour at :00 minutes
GMAIL_CHECK_FROM_EMAIL=sender@leadprovider.com  # Optional: filter by sender
```

**Cron Schedule Examples:**
- `0 * * * *` - Every hour at :00 minutes
- `*/30 * * * *` - Every 30 minutes
- `0 9-17 * * 1-5` - Every hour 9am-5pm, Monday-Friday

---

## 📧 Step 3: Email Format

Your lead emails should follow this format:

```
LEAD Category:   FRESH TELEPHONE INTERVIEWED LEAD
FIRST NAME:      Rodney
LAST NAME:       Roberson
EMAIL:           rdnyroberson@gmail.com
PHONE:           3363502553
IP ADDRESS:      107.77.249.8
```

**Mapping to Lead Schema:**
- `FIRST NAME` → `firstName`
- `LAST NAME` → `lastName`
- `EMAIL` → `email`
- `PHONE` → `phone` (auto-converted to E.164: +13363502553)
- `IP ADDRESS` → `customFields.ipAddress`
- `LEAD Category` → `customFields.category` + `priority` + `tags`

**Categories:**
- `FRESH` → High priority, tag: `fresh`
- `AGED` → Low priority, tag: `aged`
- `HOT` → Urgent priority
- `WARM` → Medium priority

---

## 🧪 Step 4: Test the Setup

### 4.1 Test Gmail Connection

```bash
cd backend
npm run dev

# In another terminal:
curl -X GET http://localhost:3550/api/leads/import/gmail/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Gmail connection successful",
    "email": "leads@yourdomain.com",
    "messagesTotal": 1234
  }
}
```

### 4.2 Test Email Parser

```bash
node backend/scripts/testGmailImport.js
```

This will:
1. ✅ Test Gmail connection
2. ✅ Test email parser
3. ✅ Show unread emails (doesn't import)

### 4.3 Test Full Import (Dry Run)

```bash
node backend/scripts/testGmailImport.js --import --dry-run
```

### 4.4 Test Actual Import

```bash
node backend/scripts/testGmailImport.js --import
```

This will import unread emails and mark them as read.

---

## 📦 Step 5: Bulk Import Initial Leads

### 5.1 Prepare Lead Files

**Text Format** (recommended for email format):
```
LEAD Category:   FRESH TELEPHONE INTERVIEWED LEAD
FIRST NAME:      John
LAST NAME:       Doe
EMAIL:           john@example.com
PHONE:           5551234567
IP ADDRESS:      192.168.1.1

LEAD Category:   AGED LEAD
FIRST NAME:      Jane
LAST NAME:       Smith
EMAIL:           jane@example.com
PHONE:           5559876543
IP ADDRESS:      192.168.1.2
```

**CSV Format:**
```csv
first_name,last_name,email,phone,ip_address,category
John,Doe,john@example.com,5551234567,192.168.1.1,fresh
Jane,Smith,jane@example.com,5559876543,192.168.1.2,aged
```

**JSON Format:**
```json
[
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "5551234567",
    "ipAddress": "192.168.1.1",
    "category": "fresh"
  }
]
```

### 5.2 Import Fresh Leads

```bash
node backend/scripts/importBulkLeads.js leads-fresh-600.txt \
  --format=text \
  --category=fresh
```

### 5.3 Import Aged Leads

```bash
node backend/scripts/importBulkLeads.js leads-aged-5000.txt \
  --format=text \
  --category=aged
```

**Expected Output:**
```
========================================
BULK IMPORT COMPLETE
========================================
Total:      600
Imported:   595 ✓
Duplicates: 5
Errors:     0
Duration:   12.34s
========================================
```

---

## 🚀 Step 6: Start Automated Import

Once configured, the cron job starts automatically with the server:

```bash
cd backend
npm run dev
```

**Console Output:**
```
✅ All databases connected
✅ Socket.io initialized
✅ Telnyx WebSocket initialized
✅ Gmail Lead Import cron job started
🚀 Server running on port 3550
```

---

## 📊 API Endpoints

### Manual Trigger Import

```bash
POST /api/leads/import/gmail/trigger
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 5,
    "duplicates": 2,
    "errors": 0
  }
}
```

### Get Import Statistics

```bash
GET /api/leads/import/gmail/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRuns": 48,
    "totalImported": 1250,
    "totalDuplicates": 150,
    "totalErrors": 5,
    "lastRunDate": "2024-01-15T10:00:00Z"
  }
}
```

### Get Queue Status

```bash
GET /api/leads/queue/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overdueFollowUps": 12,
    "freshHighPriority": 95,
    "freshMediumPriority": 200,
    "agedLeads": 4500,
    "totalInQueue": 4807
  }
}
```

### Get Next Lead to Call

```bash
GET /api/leads/queue/next
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "Rodney",
    "lastName": "Roberson",
    "phone": "+13363502553",
    "email": "rdnyroberson@gmail.com",
    "priority": "high",
    "status": "new"
  }
}
```

---

## 🔍 Monitoring

### Check Gmail Import Health

```bash
GET /api/leads/queue/health
Authorization: Bearer YOUR_JWT_TOKEN
```

### View Logs

```bash
# Backend logs
tail -f backend/logs/combined.log

# Gmail import specific
grep "Gmail Import" backend/logs/combined.log
```

---

## 🐛 Troubleshooting

### Gmail Connection Failed

**Error:** `Gmail API not configured`

**Fix:**
1. Check `.env` has all GMAIL_* variables
2. Run test script: `node scripts/testGmailImport.js`
3. Verify refresh token is valid

### No Emails Found

**Error:** `No unread lead emails found`

**Possible Causes:**
1. No unread emails in account
2. GMAIL_IMPORT_LABEL filter too restrictive
3. GMAIL_CHECK_FROM_EMAIL filter incorrect

**Fix:**
- Check Gmail inbox manually
- Remove filters temporarily (set to empty in .env)
- Send test email to account

### Parser Errors

**Error:** `Validation failed: firstName is required`

**Fix:**
- Check email format matches expected format
- Ensure field names have colons: `FIRST NAME:`
- Verify spacing and capitalization

### Duplicate Detection

**Expected:** Duplicates are skipped automatically

**Check:**
```bash
# View duplicates in import stats
curl -X GET http://localhost:3550/api/leads/import/gmail/stats
```

---

## 📝 Next Steps

After setup:

1. ✅ Import initial 600 + 5000 leads
2. ✅ Verify queue status shows all leads
3. ✅ Test manual import trigger
4. ✅ Monitor first few hourly runs
5. ✅ Configure Jennifer Kim's integration to call `GET /api/leads/queue/next`

---

## 🆘 Need Help?

Contact James Taylor (Lead Management Developer):
- **Email:** [Your contact]
- **Documentation:** This file + code comments
- **Test Scripts:** `backend/scripts/testGmailImport.js`

---

**Remember:** This is the revenue source. Without leads, there are no calls! 🔥
