# MongoDB Schema Documentation - BMAD V4 Lead Qualification App

**Author:** Sarah Chen (SIGMA-1) - Database Architect
**Date:** 2025-10-29
**Version:** 1.0
**Database:** MongoDB (Primary Data Store)

---

## Overview

This document provides comprehensive documentation for the MongoDB schemas designed for the BMAD V4 Lead Qualification Application. The architecture follows a multi-database approach with MongoDB serving as the primary operational database for leads, contacts, conversations, and call logs.

## Architecture Philosophy

### Multi-Database Strategy
- **MongoDB**: Primary operational database for business entities and real-time data
- **PostgreSQL**: Structured analytics, reporting, and aggregated metrics (future)
- **Neo4j**: Graph relationships for call flow analysis and network mapping (future)
- **ChromaDB**: Vector embeddings for semantic search and AI analysis (integrated with Conversation schema)

### MongoDB Design Principles
1. **Denormalization for Performance**: Critical data denormalized for quick access
2. **Embedded Documents**: Related data embedded where it makes sense (1-to-few relationships)
3. **References**: Separate collections for 1-to-many and many-to-many relationships
4. **Comprehensive Indexing**: Strategic indexes for common query patterns
5. **Virtuals and Methods**: Business logic encapsulated in schemas
6. **Middleware**: Automatic field calculations and validations

---

## Schema Relationships

```
┌─────────────────┐
│    Contact      │
│   (All People)  │
└────────┬────────┘
         │
         │ 1:1 (optional)
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│      Lead       │◄───────┤   Conversation   │
│  (Prospects)    │  N:M    │  (All Channels)  │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ 1:N                       │ 1:1
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│      Call       │◄───────┤    CallLog       │
│  (Basic Info)   │  1:1    │ (Detailed Logs)  │
└─────────────────┘         └──────────────────┘
         │
         │ N:1
         │
         ▼
┌─────────────────┐
│    Campaign     │
│  (Marketing)    │
└─────────────────┘
```

---

## Schema Details

### 1. Lead Schema (`lead.schema.js`)

**Purpose**: Represents potential customers in the qualification pipeline.

#### Key Features
- Comprehensive contact information with validation
- BANT qualification criteria (Budget, Authority, Need, Timeline)
- AI-powered insights and recommendations
- Consent and compliance tracking (GDPR, CCPA)
- Lifecycle management from new → converted/disqualified

#### Important Fields

| Field | Type | Description | Index |
|-------|------|-------------|-------|
| `phone` | String | Primary phone (E.164 format, required, unique) | ✓ |
| `email` | String | Email address (unique, sparse) | ✓ |
| `status` | Enum | Lead status: new, contacted, qualified, nurturing, converted, disqualified, lost | ✓ |
| `qualificationScore` | Number | 0-100 score based on BANT criteria | ✓ (desc) |
| `assignedTo` | ObjectId | Reference to User managing this lead | ✓ |
| `campaignId` | ObjectId | Reference to Campaign | ✓ |
| `conversationHistory` | Array | Denormalized conversation summaries for quick access | - |
| `aiInsights` | Object | AI-generated buying signals, pain points, objections | - |
| `consent` | Object | Communication consent flags (call, email, SMS, recording) | - |

#### Indexes
```javascript
// Single field indexes
{ phone: 1 }
{ email: 1 }
{ status: 1, qualificationScore: -1 }  // Compound
{ assignedTo: 1, status: 1 }           // Compound
{ campaignId: 1, status: 1 }           // Compound
{ nextFollowUpAt: 1 }
{ tags: 1 }
{ isActive: 1, status: 1 }             // Compound

// Text index for search
{ firstName: 'text', lastName: 'text', email: 'text', 'company.name': 'text', tags: 'text' }
```

#### Virtual Properties
- `fullName`: Concatenated first and last name
- `totalConversations`: Count of conversation history entries

#### Methods
- `calculateEngagement()`: Returns engagement level based on conversation frequency
- `findReadyForFollowUp()`: Static method to find leads needing follow-up
- `findHighValue()`: Static method to find qualified leads (score ≥ 70)

#### Middleware
- Auto-qualify leads when score reaches 70
- Increment contact attempts on `lastContactedAt` change

---

### 2. Contact Schema (`contact.schema.js`)

**Purpose**: Universal contact management for all people in the system (leads, customers, partners, vendors, staff).

#### Key Features
- Separate from Lead to support broader contact types
- Multiple contact methods (primary, secondary, work emails/phones)
- Detailed company and address information
- Social profile tracking
- Engagement scoring and responsiveness tracking
- Data quality scoring

#### Important Fields

| Field | Type | Description | Index |
|-------|------|-------------|-------|
| `type` | Enum | Contact type: lead, customer, partner, vendor, staff, other | ✓ |
| `email.primary` | String | Primary email (unique, sparse) | ✓ |
| `phone.primary` | String | Primary phone (E.164 format, required, unique) | ✓ |
| `leadId` | ObjectId | Reference to Lead if this contact is a prospect | ✓ |
| `relationshipStatus` | Enum | new, active, engaged, at-risk, churned, inactive | ✓ |
| `lifecycleStage` | Enum | subscriber, lead, mql, sql, opportunity, customer, evangelist | ✓ |
| `accountManager` | ObjectId | Reference to User managing this contact | ✓ |
| `engagement.engagementScore` | Number | 0-100 engagement score | ✓ (desc) |
| `preferences.doNotContact` | Boolean | Master do-not-contact flag | ✓ |
| `dataQuality.score` | Number | Auto-calculated data completeness score | - |

#### Indexes
```javascript
// Single and compound indexes
{ 'phone.primary': 1 }
{ 'email.primary': 1 }
{ type: 1, status: 1 }                                    // Compound
{ type: 1, lifecycleStage: 1, status: 1 }                 // Compound
{ accountManager: 1, relationshipStatus: 1, 'engagement.lastInteractionAt': -1 }  // Compound
{ tags: 1 }

// Text index
{ firstName: 'text', lastName: 'text', 'email.primary': 'text', 'company.name': 'text', tags: 'text' }
```

#### Virtual Properties
- `fullName`: Complete name with prefix/suffix
- `displayName`: Name with company in parentheses
- `primaryContact`: Object with primary email and phone

#### Methods
- `canContact(channel)`: Check if contact can be reached via channel
- `daysSinceLastInteraction()`: Calculate days since last touch
- `findReadyForEngagement()`: Static method for contacts ready to engage
- `findNeedingAttention()`: Static method for contacts with no interaction in 30+ days

#### Middleware
- Auto-calculate data quality score based on field completeness

---

### 3. Conversation Schema (`conversation.schema.js`)

**Purpose**: Track multi-turn conversations across all channels (phone, email, SMS, chat, etc.).

#### Key Features
- Channel-agnostic conversation tracking
- Message-level sentiment analysis
- AI-powered insights and qualification scoring
- ChromaDB integration for vector embeddings
- Comprehensive compliance and recording tracking
- Quality metrics and review workflows

#### Important Fields

| Field | Type | Description | Index |
|-------|------|-------------|-------|
| `conversationId` | String | Unique conversation identifier | ✓ (unique) |
| `leadId` | ObjectId | Reference to Lead (required) | ✓ |
| `contactId` | ObjectId | Reference to Contact | ✓ |
| `channel` | Enum | phone, email, sms, chat, video, in-person, social, other | ✓ |
| `callId` | ObjectId | Reference to Call (if phone conversation) | ✓ |
| `status` | Enum | active, completed, abandoned, failed, archived, escalated | ✓ |
| `messages` | Array | Array of message objects with sender, content, sentiment | - |
| `aiAnalysis.qualificationScore` | Number | AI-calculated qualification score (0-100) | ✓ (desc) |
| `aiAnalysis.overallSentiment` | Enum | very-positive, positive, neutral, negative, very-negative, mixed | ✓ |
| `outcome.result` | Enum | qualified, not-qualified, needs-follow-up, meeting-scheduled, etc. | ✓ |
| `embeddings.chromaDocId` | String | ChromaDB document ID for vector search | - |

#### Message Structure
```javascript
{
  messageId: String,
  timestamp: Date,
  sender: {
    type: 'agent' | 'lead' | 'ai' | 'system',
    id: ObjectId,
    name: String
  },
  content: String,
  contentType: 'text' | 'audio' | 'video' | 'image' | 'file' | 'link',
  sentiment: String,
  intent: String,
  keywords: [String]
}
```

#### Indexes
```javascript
{ conversationId: 1 }                              // Unique
{ leadId: 1, startedAt: -1 }                       // Compound
{ assignedAgent: 1, status: 1, lastActivityAt: -1 } // Compound
{ channel: 1, 'aiAnalysis.qualificationScore': -1 } // Compound
{ 'outcome.result': 1 }
{ tags: 1 }

// Text index
{ 'summary.shortSummary': 'text', 'aiAnalysis.keywords': 'text', tags: 'text' }
```

#### Virtual Properties
- `messageCount`: Count of non-deleted messages
- `durationMinutes`: Duration in minutes
- `participantCount`: Unique number of participants

#### Methods
- `addMessage(messageData)`: Add a new message to the conversation
- `calculateAvgResponseTime()`: Calculate average lead response time
- `getSentimentBreakdown()`: Get count of messages by sentiment
- `findNeedingReview()`: Static method for conversations flagged for review
- `findHighValue()`: Static method for conversations with qualification score ≥ 70

#### Middleware
- Auto-calculate duration when conversation ends
- Update `lastActivityAt` from latest message timestamp
- Calculate completeness score based on summary, AI analysis, and outcome

---

### 4. CallLog Schema (`calllog.schema.js`)

**Purpose**: Detailed call logging with Telnyx integration, quality metrics, and technical details.

#### Key Features
- Comprehensive Telnyx Voice API integration
- Call quality metrics (MOS, jitter, latency, packet loss)
- Audio transcription with turn-level details
- DTMF input tracking
- Transfer and hold tracking
- Speech analytics (talk time, interruptions, speaking rate)
- Compliance and regulatory tracking
- Cost and billing information

#### Important Fields

| Field | Type | Description | Index |
|-------|------|-------------|-------|
| `callLogId` | String | Unique call log identifier | ✓ (unique) |
| `telnyx.callControlId` | String | Telnyx Call Control ID | ✓ (unique, sparse) |
| `leadId` | ObjectId | Reference to Lead (required) | ✓ |
| `callId` | ObjectId | Reference to Call | ✓ |
| `conversationId` | ObjectId | Reference to Conversation | ✓ |
| `direction` | Enum | inbound, outbound | ✓ |
| `callType` | Enum | cold-call, follow-up, callback, support, qualification, demo, closing | ✓ |
| `status` | Enum | initiated, ringing, answered, active, hangup, completed, busy, no-answer, failed | ✓ |
| `answerState` | Enum | human, machine, voicemail, fax, unknown, no-answer | ✓ |
| `duration.talking` | Number | Actual conversation time in seconds | - |
| `quality.mos` | Number | Mean Opinion Score (1-5, 5 being best) | - |
| `recording.recordingUrl` | String | URL to call recording | - |
| `transcription.fullText` | String | Full call transcription | Text index |
| `aiAnalysis.qualification.score` | Number | Call-specific qualification score | - |
| `outcome.result` | Enum | connected, no-answer, busy, voicemail, qualified, not-interested, etc. | ✓ |

#### Duration Breakdown
```javascript
duration: {
  total: Number,      // Total call duration (seconds)
  ringing: Number,    // Time spent ringing
  talking: Number,    // Time in conversation
  hold: Number,       // Time on hold
  postCall: Number    // Post-call work time
}
```

#### Quality Metrics
```javascript
quality: {
  mos: Number,                    // Mean Opinion Score (1-5)
  audio: {
    codec: String,                // e.g., 'PCMU', 'OPUS'
    packetLoss: Number,           // Percentage
    jitter: Number,               // Milliseconds
    latency: Number               // Milliseconds (RTT)
  },
  issues: [{
    type: 'echo' | 'static' | 'choppy' | 'delay' | ...,
    severity: 'low' | 'medium' | 'high' | 'critical',
    timestamp: Date
  }]
}
```

#### Speech Analytics
```javascript
aiAnalysis.speech: {
  agentTalkTime: Number,          // Seconds
  leadTalkTime: Number,           // Seconds
  talkRatio: Number,              // Agent/Lead ratio
  interruptions: {
    byAgent: Number,
    byLead: Number
  },
  speakingRate: {
    agent: Number,                // Words per minute
    lead: Number
  }
}
```

#### Indexes
```javascript
{ callLogId: 1 }                               // Unique
{ 'telnyx.callControlId': 1 }                  // Unique, sparse
{ leadId: 1, initiatedAt: -1 }                 // Compound
{ direction: 1, answerState: 1, initiatedAt: -1 }  // Compound
{ campaignId: 1, 'outcome.result': 1, initiatedAt: -1 }  // Compound
{ 'outcome.result': 1 }
{ tags: 1 }

// Text index
{ 'transcription.fullText': 'text', 'aiAnalysis.keywords': 'text', tags: 'text' }
```

#### Virtual Properties
- `totalDurationMinutes`: Total duration in minutes
- `billableDurationMinutes`: Billable duration in minutes
- `answerTimeSeconds`: Time from ring to answer
- `qualitySummary`: Human-readable quality rating (Excellent, Good, Fair, Poor)

#### Methods
- `isSuccessful()`: Determine if call was successful (human answer, 30+ seconds talk time)
- `getSummary()`: Get concise call summary object
- `findByQuality(minRating)`: Static method to find calls by quality rating
- `findNeedingComplianceReview()`: Static method for calls flagged for compliance review

#### Middleware
- Auto-calculate duration metrics from timestamps
- Calculate talk time minus hold time

---

## Relationships and Data Flow

### Lead → Contact Relationship
- Contact is the universal entity for all people
- Lead is specifically for prospects in the sales pipeline
- When a lead is created, optionally create/link a Contact record
- Contact.leadId references the Lead document

### Lead → Conversation → CallLog Flow
```
1. Outbound call initiated → Create CallLog with status='initiated'
2. Call answered → Update CallLog status='answered', create Conversation
3. Multi-turn conversation → Add messages to Conversation.messages[]
4. Call ends → Update CallLog with end time and metrics
5. AI analysis runs → Update both Conversation.aiAnalysis and CallLog.aiAnalysis
6. Summary created → Update Conversation.summary
7. Lead updated → Add entry to Lead.conversationHistory (denormalized)
```

### Conversation Channels
- **Phone**: Conversation.callId → Call, Conversation.callLogId → CallLog
- **Email/SMS/Chat**: Conversation exists independently, no call references
- All channels feed into Lead.conversationHistory for unified view

---

## Indexing Strategy

### Query Patterns Optimized For

1. **Lead Management**
   - Find leads by status and qualification score
   - Find leads assigned to a specific agent
   - Find leads needing follow-up
   - Search leads by name, email, company

2. **Contact Management**
   - Find contacts by type and lifecycle stage
   - Find contacts needing engagement
   - Find high-value contacts by engagement score
   - Search contacts by name, email, company

3. **Conversation Analytics**
   - Find conversations by lead and date range
   - Find high-quality conversations (qualification score ≥ 70)
   - Find conversations by channel and outcome
   - Search conversations by keywords and summary

4. **Call Analytics**
   - Find calls by lead and date range
   - Find calls by quality rating
   - Find calls by outcome and disposition
   - Find calls needing compliance review
   - Search call transcripts

### Index Maintenance
- MongoDB automatically maintains indexes
- Consider periodic `reIndex()` for heavily updated collections
- Monitor index usage with `db.collection.stats()` and `$indexStats`

---

## Data Validation

### Phone Number Format
All phone numbers must follow **E.164 format**:
- Format: `+[country code][number]`
- Example: `+14155551234`
- Regex: `/^\+?[1-9]\d{1,14}$/`

### Email Validation
- Case-insensitive (auto-converted to lowercase)
- Format: `user@domain.tld`
- Regex: `/^\S+@\S+\.\S+$/`

### Enum Validations
All enum fields are strictly validated. Invalid values will throw validation errors.

---

## Middleware and Business Logic

### Pre-save Middleware

**Lead Schema:**
```javascript
- Auto-qualify when qualificationScore >= 70 and status === 'contacted'
- Increment contactAttempts when lastContactedAt changes
```

**Contact Schema:**
```javascript
- Auto-calculate dataQuality.score based on field completeness
```

**Conversation Schema:**
```javascript
- Calculate duration from start/end timestamps
- Update lastActivityAt from latest message
- Calculate quality.completeness score
```

**CallLog Schema:**
```javascript
- Calculate all duration metrics (ringing, talking, hold, total)
- Calculate talking time minus hold time
```

---

## Best Practices

### 1. Creating a New Lead
```javascript
const lead = new Lead({
  firstName: 'John',
  lastName: 'Doe',
  phone: '+14155551234',
  email: 'john.doe@example.com',
  source: 'website',
  assignedTo: userId,
  campaignId: campaignId,
  consent: {
    canCall: true,
    canEmail: true,
    recordCalls: true
  }
});
await lead.save();
```

### 2. Creating a Conversation with Messages
```javascript
const conversation = new Conversation({
  conversationId: uuidv4(),
  leadId: lead._id,
  channel: 'phone',
  callId: call._id,
  assignedAgent: agentId,
  messages: [
    {
      messageId: uuidv4(),
      timestamp: new Date(),
      sender: { type: 'agent', id: agentId, name: 'Agent Smith' },
      content: 'Hello, is this John?',
      sentiment: 'neutral'
    },
    {
      messageId: uuidv4(),
      timestamp: new Date(),
      sender: { type: 'lead', id: lead._id, name: 'John Doe' },
      content: 'Yes, this is John.',
      sentiment: 'neutral'
    }
  ]
});
await conversation.save();
```

### 3. Adding Messages to Existing Conversation
```javascript
const message = conversation.addMessage({
  sender: { type: 'agent', id: agentId, name: 'Agent Smith' },
  content: 'I wanted to discuss our product...',
  sentiment: 'positive'
});
await conversation.save();
```

### 4. Querying High-Value Leads
```javascript
const highValueLeads = await Lead.findHighValue()
  .populate('assignedTo', 'firstName lastName email')
  .populate('campaignId', 'name')
  .limit(50);
```

### 5. Finding Calls with Quality Issues
```javascript
const poorQualityCalls = await CallLog.find({
  'quality.overallRating': { $lt: 3 },
  initiatedAt: { $gte: startOfDay, $lte: endOfDay }
}).sort({ initiatedAt: -1 });
```

---

## Performance Considerations

### Denormalization Strategy
- **Lead.conversationHistory**: Denormalized for dashboard quick view
- **Conversation.messages**: Embedded for atomic operations
- **CallLog.events**: Embedded for chronological tracking

### When to Use Population
- **Dashboard views**: Don't populate, use denormalized data
- **Detail views**: Populate related documents (User, Campaign)
- **Reports**: Use aggregation pipelines instead of population

### Aggregation Examples

**Lead qualification funnel:**
```javascript
Lead.aggregate([
  { $match: { isActive: true, campaignId: campaignId } },
  { $group: {
    _id: '$status',
    count: { $sum: 1 },
    avgScore: { $avg: '$qualificationScore' }
  }},
  { $sort: { count: -1 } }
]);
```

**Call outcome distribution:**
```javascript
CallLog.aggregate([
  { $match: { initiatedAt: { $gte: startDate, $lte: endDate } } },
  { $group: {
    _id: '$outcome.result',
    count: { $sum: 1 },
    avgDuration: { $avg: '$duration.talking' }
  }},
  { $sort: { count: -1 } }
]);
```

---

## Integration Points

### Telnyx Voice API
**Schema:** CallLog
**Fields:**
- `telnyx.callControlId`: Telnyx call identifier
- `telnyx.webhookEvents`: Webhook event log
- `recording.recordingUrl`: Telnyx recording URL
- `transcription.provider`: Set to 'telnyx' when using Telnyx transcription

### ChromaDB Vector Database
**Schema:** Conversation
**Fields:**
- `embeddings.conversationEmbedding`: Vector representation
- `embeddings.chromaDocId`: ChromaDB document reference
- Used for semantic search and similar conversation matching

### PostgreSQL (Future)
- Aggregate metrics from MongoDB collections
- Time-series analytics
- Historical reporting

### Neo4j (Future)
- Call flow patterns
- Lead relationship networks
- Conversation path analysis

---

## Compliance and Data Retention

### GDPR Compliance
- **Lead.consent.gdprConsent**: GDPR consent flag
- **Contact.consent.gdprConsent**: GDPR consent flag
- **Conversation.compliance.gdprCompliant**: Conversation compliance flag

### Data Retention
- **Conversation.compliance.dataRetentionDate**: Auto-delete after this date
- **CallLog.recording.expiresAt**: Recording expiration date
- Implement TTL indexes for auto-deletion:
```javascript
conversationSchema.index(
  { 'compliance.dataRetentionDate': 1 },
  { expireAfterSeconds: 0 }
);
```

### Do Not Contact
- **Lead.consent.canCall/canEmail/canSMS**: Granular consent
- **Contact.preferences.doNotContact**: Master opt-out flag
- Always check before initiating contact

---

## Migration and Seeding

### Creating Seed Data
See `/backend/src/database/mongodb/seeds/` directory for seed scripts:
- `seedLeads.js`: Sample leads with various statuses
- `seedContacts.js`: Sample contacts across all types
- `seedConversations.js`: Sample conversations with AI analysis
- `seedCallLogs.js`: Sample call logs with quality metrics

### Running Migrations
```bash
# Run all seeds
npm run seed:all

# Run specific seed
npm run seed:leads
npm run seed:contacts
npm run seed:conversations
npm run seed:calllogs
```

---

## Monitoring and Optimization

### Key Metrics to Monitor
1. **Index Usage**: Use `db.collection.aggregate([{ $indexStats: {} }])`
2. **Query Performance**: Enable profiling with `db.setProfilingLevel(1, { slowms: 100 })`
3. **Collection Size**: Monitor with `db.collection.stats()`
4. **Connection Pool**: Monitor MongoDB connection pool usage

### Optimization Checklist
- [ ] All frequently queried fields have indexes
- [ ] Compound indexes cover multi-field queries
- [ ] Text indexes support search functionality
- [ ] No unused indexes (remove to improve write performance)
- [ ] Large arrays (messages, events) don't exceed 16MB document limit
- [ ] Aggregation pipelines use indexes where possible

---

## Troubleshooting

### Common Issues

**Issue:** Duplicate key error on phone/email
**Solution:** Phone and email have unique indexes. Check for existing records before insert.

**Issue:** Validation error on phone format
**Solution:** Ensure phone numbers follow E.164 format (+[country][number])

**Issue:** Document exceeds 16MB limit
**Solution:** Consider moving large arrays (messages, events) to separate collection with references

**Issue:** Slow queries on conversation search
**Solution:** Ensure text index is created and use `$text` operator for full-text search

---

## Future Enhancements

### Planned Features
1. **Sharding Strategy**: Shard by leadId for horizontal scaling
2. **Read Replicas**: Configure read preference for analytics queries
3. **Change Streams**: Real-time updates using MongoDB change streams
4. **GraphQL Integration**: Expose schemas via GraphQL API
5. **Multi-tenancy**: Add organizationId to all schemas for SaaS support

### Schema Evolution
- Use schema versioning field for migrations
- Implement `schemaVersion` field in all schemas
- Create migration scripts in `/backend/src/database/migrations/`

---

## Questions and Support

### Coordination
- **Alex Martinez (ALPHA-1)**: Database connection configurations and environment setup
- **David Rodriguez (BRAVO-1)**: API endpoints and controller integration
- **Marcus Thompson (DELTA-1)**: Authentication and security middleware

### Schema Owner
**Sarah Chen (SIGMA-1)** - Database Architect
For questions about schema design, indexing, or optimization.

---

## Appendix: Field Reference

### Common Field Patterns

**Timestamps** (auto-managed by Mongoose):
```javascript
{ timestamps: true }  // Adds createdAt, updatedAt
```

**Soft Delete Pattern**:
```javascript
{
  isActive: { type: Boolean, default: true, index: true },
  archivedAt: Date,
  archivedBy: { type: ObjectId, ref: 'User' },
  archivedReason: String
}
```

**Notes Pattern**:
```javascript
notes: [{
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: ObjectId, ref: 'User' },
  type: { type: String, enum: [...] }
}]
```

**Custom Fields Pattern**:
```javascript
{
  customFields: mongoose.Schema.Types.Mixed,  // User-defined fields
  metadata: mongoose.Schema.Types.Mixed       // System metadata
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Next Review:** Sprint 2 Planning
