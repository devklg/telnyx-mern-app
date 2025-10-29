# MongoDB Schemas - BMAD V4 Lead Qualification App

**Database Architect:** Sarah Chen (SIGMA-1)
**Sprint:** Sprint 1
**Date:** 2025-10-29

## Quick Start

### Available Schemas

Located in `/backend/src/database/mongodb/schemas/`:

1. **lead.schema.js** - Lead management and qualification tracking
2. **contact.schema.js** - Universal contact management (NEW)
3. **conversation.schema.js** - Multi-channel conversation tracking (NEW)
4. **calllog.schema.js** - Detailed call logging with Telnyx integration (NEW)
5. **call.schema.js** - Basic call information (existing)
6. **campaign.schema.js** - Campaign management (existing)

### Import Schemas

```javascript
const Lead = require('./schemas/lead.schema');
const Contact = require('./schemas/contact.schema');
const Conversation = require('./schemas/conversation.schema');
const CallLog = require('./schemas/calllog.schema');
const Call = require('./schemas/call.schema');
const Campaign = require('./schemas/campaign.schema');
```

## Schema Relationships

```
Contact (all people)
    ↓
  Lead (prospects) ← Conversation (all channels) → CallLog (detailed logs)
    ↓                      ↓                            ↓
  Call (basic info) ←──────┘                            ↓
    ↓                                                    ↓
Campaign (marketing)                               Call Quality Metrics
```

## Key Features by Schema

### Lead Schema
- ✅ Enhanced BANT qualification criteria
- ✅ AI-powered insights (buying signals, pain points, objections)
- ✅ GDPR/CCPA compliance fields
- ✅ Comprehensive indexing for performance
- ✅ Auto-qualification at score ≥ 70
- ✅ Virtual properties (fullName, totalConversations)
- ✅ Static methods (findReadyForFollowUp, findHighValue)

### Contact Schema (NEW)
- ✅ Universal contact type support (lead, customer, partner, vendor, staff)
- ✅ Multiple contact methods (primary, secondary, work)
- ✅ Engagement scoring and tracking
- ✅ Data quality auto-scoring
- ✅ Relationship status tracking
- ✅ Social profile integration
- ✅ Communication preferences and consent

### Conversation Schema (NEW)
- ✅ Multi-channel support (phone, email, SMS, chat, video, social)
- ✅ Message-level sentiment analysis
- ✅ ChromaDB vector embedding integration
- ✅ AI-powered qualification scoring
- ✅ BANT factor detection
- ✅ Speech analytics
- ✅ Compliance and recording tracking
- ✅ Quality metrics and review workflows

### CallLog Schema (NEW)
- ✅ Comprehensive Telnyx Voice API integration
- ✅ Call quality metrics (MOS, jitter, latency, packet loss)
- ✅ Audio transcription with turn-by-turn details
- ✅ DTMF input tracking
- ✅ Transfer and hold tracking
- ✅ Speech analytics (talk time, interruptions, speaking rate)
- ✅ Cost and billing information
- ✅ Compliance tracking

## Quick Reference

### Creating a Lead
```javascript
const lead = new Lead({
  firstName: 'John',
  lastName: 'Doe',
  phone: '+14155551234',  // E.164 format required
  email: 'john.doe@example.com',
  source: 'website',
  assignedTo: userId,
  consent: { canCall: true, canEmail: true }
});
await lead.save();
```

### Creating a Conversation
```javascript
const conversation = new Conversation({
  conversationId: uuidv4(),
  leadId: lead._id,
  channel: 'phone',
  assignedAgent: agentId,
  messages: [...]
});
await conversation.save();
```

### Finding High-Value Leads
```javascript
const leads = await Lead.findHighValue()
  .populate('assignedTo')
  .limit(50);
```

### Finding Leads Needing Follow-Up
```javascript
const leads = await Lead.findReadyForFollowUp();
```

## Indexes

All schemas include comprehensive indexing:
- Single field indexes for frequently queried fields
- Compound indexes for common multi-field queries
- Text indexes for full-text search
- Sparse unique indexes for optional unique fields

See `SCHEMA_DOCUMENTATION.md` for complete index details.

## Validation

### Phone Numbers
- **Format:** E.164 (`+[country][number]`)
- **Example:** `+14155551234`
- **Regex:** `/^\+?[1-9]\d{1,14}$/`

### Emails
- **Format:** `user@domain.tld`
- **Auto-converted:** lowercase
- **Regex:** `/^\S+@\S+\.\S+$/`

### Enums
All enum fields are strictly validated. See individual schemas for allowed values.

## Performance Tips

1. **Use static methods** for common queries (already indexed)
2. **Limit population** to detail views only
3. **Use aggregation** for reports and analytics
4. **Leverage text indexes** for search with `$text` operator
5. **Monitor query performance** with MongoDB profiler

## Documentation

📖 **Full Documentation:** `/backend/src/database/mongodb/SCHEMA_DOCUMENTATION.md`

Includes:
- Complete field reference
- Relationship diagrams
- Indexing strategy
- Best practices
- Performance optimization
- Compliance guidelines
- Troubleshooting guide

## Database Connection

Connection configured in `/backend/src/config/database.js`:

```javascript
const { connectDatabases } = require('./config/database');
await connectDatabases();
```

## Next Steps

### For Sprint 2:
- [ ] Create seed scripts for sample data
- [ ] Implement aggregation pipelines for analytics
- [ ] Add GraphQL resolvers
- [ ] Configure read replicas for analytics
- [ ] Implement change streams for real-time updates

### Integration Tasks:
- **Alex Martinez (ALPHA-1)**: Database connection and environment config
- **David Rodriguez (BRAVO-1)**: API controllers and routes
- **Marcus Thompson (DELTA-1)**: Authentication middleware integration
- **Emily Watson (CHARLIE-1)**: Telnyx Voice API integration with CallLog

## Questions?

Contact **Sarah Chen (SIGMA-1)** - Database Architect

---

**Version:** 1.0
**Last Updated:** 2025-10-29
