# MongoDB Models Directory

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Mongoose schemas for MongoDB collections

## 📋 Your Tasks (Sprint 1 - Priority: CRITICAL)

### Core Models to Create:

1. **Lead.js** - Lead document schema
   - Contact information (name, email, phone, company)
   - Lead source (fresh/aged, batch_id, cost)
   - Status tracking (status, stage, tags)
   - Qualification data (score, interest_level, decision_maker)
   - Timestamps and audit trail

2. **Conversation.js** - Call conversation schema
   - Reference to Lead (leadId)
   - Call details (call_id, duration, recording_url)
   - Transcript data (full_transcript, ai_summary)
   - Phase tracking (Paul Barrios 12-phase system)
   - Sentiment analysis results

3. **CallLog.js** - Call history schema
   - Reference to Lead and Conversation
   - Call metadata (start_time, end_time, status)
   - Telnyx details (call_control_id, connection_id)
   - Transfer information (transferred_to, transfer_time)
   - Outcome tracking (result, next_action)

4. **User.js** - System users schema
   - Authentication data (email, password_hash)
   - Profile (name, role, permissions)
   - Activity tracking (last_login, sessions)

5. **Campaign.js** - Lead campaign schema
   - Campaign details (name, description, start_date)
   - Lead batch associations
   - Performance metrics (calls_made, qualified_leads)
   - Budget tracking

## 🎯 Schema Design Guidelines

```javascript
// Example structure
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // Fields here
}, {
  timestamps: true, // Auto-creates createdAt, updatedAt
  collection: 'leads'
});

// Indexes for performance
LeadSchema.index({ phone: 1 }, { unique: true });
LeadSchema.index({ status: 1, score: -1 });
LeadSchema.index({ createdAt: -1 });

// Virtuals for computed fields
LeadSchema.virtual('isQualified').get(function() {
  return this.score >= 70;
});

module.exports = mongoose.model('Lead', LeadSchema);
```

## ✅ Checklist

- [ ] Lead.js with all required fields
- [ ] Conversation.js with transcript support
- [ ] CallLog.js with Telnyx integration fields
- [ ] User.js with authentication support
- [ ] Campaign.js with metrics tracking
- [ ] Proper indexes on all models
- [ ] Validation rules for required fields
- [ ] Virtual fields for computed properties
- [ ] Timestamps enabled on all schemas

## 🔗 Dependencies

- Database connection: `../config/database.js`
- MongoDB runs on: `localhost:28000` (local) or `MONGODB_URI` (production)
- Use Mongoose v7+ features

## 📚 References

- Mongoose Docs: https://mongoosejs.com/docs/guide.html
- Project docs: `/docs/DATABASE-SCHEMA.md` (create this!)
- Business logic: Paul Barrios 12-phase qualification script

---
**Next Step:** Create these 5 model files and test with seed data!