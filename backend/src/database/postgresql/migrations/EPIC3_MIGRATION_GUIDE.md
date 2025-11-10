# Epic 3 CRM Database Migration Guide

## Overview

This migration creates the complete PostgreSQL schema for Epic 3: AI-Powered CRM & Relationship Intelligence. It includes 12 tables designed to support lead management, tracking, nurture sequences, ROI analysis, and compliance.

## Migration Files

- **002_epic3_crm_tables.sql** - Main migration (UP)
- **002_epic3_crm_tables_down.sql** - Rollback migration (DOWN)

## Tables Created

### 1. **leads** - Main CRM Entity
**Purpose:** Core lead records with contact information, scoring, and lifecycle tracking

**Key Features:**
- UUID primary keys for distributed systems
- E.164 phone number format validation
- PostgreSQL array for tags (efficient segmentation)
- JSONB for flexible metadata and source attribution
- Soft delete support (deleted_at)
- Multi-tenant isolation via organization_id
- Comprehensive indexing for performance

**Story Reference:** 3.1 (Lead CRUD Operations)

**Important Fields:**
- `phone_number` - E.164 format: +1234567890
- `status` - Valid values: new, contacted, qualified, nurturing, hot, cold, recruited, dnc
- `lead_score` - 0-100 AI-calculated quality score
- `tags` - TEXT[] for flexible categorization
- `source_metadata` - JSONB for UTM parameters, campaign details

**Indexes:**
- Unique constraint on (phone_number, organization_id) - prevents duplicates per org
- GIN index on tags for efficient array queries
- Trigram index on name fields for full-text search
- Partial indexes (WHERE deleted_at IS NULL) for performance

### 2. **lead_audit_log** - Complete Change History
**Purpose:** Track every field change for compliance and debugging

**Story Reference:** 3.1 (Lead Updates with Audit Trail)

**Features:**
- Captures old and new values for all changes
- IP address and user agent for security auditing
- Links to user who made the change
- Change reason documentation

### 3. **lead_status_history** - Funnel Analytics
**Purpose:** Track status transitions for conversion funnel analysis

**Story Reference:** 3.9 (Lead Lifecycle Analytics)

**Features:**
- Records every status change with timestamp
- Captures trigger type (call, manual, automation, AI)
- Links to triggering event (call_id, sequence_id)
- Enables time-in-stage calculations
- Powers funnel conversion metrics

**Use Cases:**
- Calculate average time from "new" to "recruited"
- Identify bottleneck stages with high drop-off
- A/B test different qualification approaches

### 4. **dnc_list** - Do Not Call Compliance
**Purpose:** Legal compliance and preference management

**Story Reference:** 3.8 (DNC Compliance Management)

**Features:**
- Organization-wide scope (not user-specific)
- Tracks reason and source of DNC addition
- Optional expiration for 30-day grace periods
- AI-detected opt-out phrases captured
- Helper function: `is_on_dnc_list(phone, org_id)`

**Compliance:**
- TCPA (Telephone Consumer Protection Act) compliance
- CAN-SPAM Act compliance
- Consent withdrawal documentation

### 5. **lead_source_costs** - ROI Tracking
**Purpose:** Track lead acquisition costs for source performance analysis

**Story Reference:** 3.14 (Lead Source Tracking and ROI)

**Features:**
- Monthly cost tracking per source
- Sub-source for campaign-level granularity
- Multi-currency support (defaults to USD)
- Unique constraint prevents duplicate entries

**Calculations Enabled:**
- Cost Per Lead (CPL) = total_cost / total_leads
- Cost Per Recruit (CPR) = total_cost / recruited_count
- ROI = (revenue - cost) / cost

### 6. **nurture_sequences** - Automated Workflows
**Purpose:** Define multi-step nurture sequences (SMS, email, AI calls)

**Story Reference:** 3.5 (Automated Nurture Sequences)

**Features:**
- JSONB array for flexible step definitions
- Support for multiple channels (SMS, email, call)
- Delay timing between steps
- Trigger conditions for auto-enrollment
- Active/inactive status control

**Step Format:**
```json
{
  "step": 1,
  "delay_days": 0,
  "channel": "sms",
  "template_id": "welcome_sms",
  "conditions": {}
}
```

### 7. **lead_sequence_enrollments** - Sequence Progress
**Purpose:** Track lead enrollment and progress through sequences

**Story Reference:** 3.5 (Sequence Execution Tracking)

**Features:**
- Current step tracking
- Status management (active, paused, completed, cancelled)
- Next step scheduling for Bull queue jobs
- Executed steps log (JSONB array)
- Unique constraint prevents duplicate enrollments

**Status Flow:**
- active → paused → resumed → completed
- active → cancelled (lead opts out)
- active → failed (delivery failure)

### 8. **segments** - Saved Filters
**Purpose:** Reusable lead segments for targeting and analytics

**Story Reference:** 3.11 (Lead Segmentation)

**Features:**
- Complex filter criteria stored as JSONB
- Public/private segment sharing
- Cached lead count for performance
- Dynamic evaluation (not snapshot)

**Filter Example:**
```json
{
  "status": ["new", "contacted"],
  "lead_score": {"gte": 70},
  "tags": {"contains_any": ["facebook", "hot"]},
  "last_contact": {"lte": "2024-01-01"}
}
```

### 9. **budget_transactions** - Financial Ledger
**Purpose:** Immutable ledger of all budget transactions

**Story Reference:** 2.8 (Call Budget Tracking)

**Features:**
- Double-entry bookkeeping (balance before/after)
- Links to calls, SMS, top-ups
- Transaction types: debit, credit, refund, adjustment
- Audit trail for financial compliance

**Transaction Flow:**
- Call placed → debit transaction created
- Balance updated atomically
- Failed call → refund transaction issued

### 10. **lead_assignments** - Distribution Audit
**Purpose:** Track lead ownership changes and distribution

**Story Reference:** 3.3 (Lead Distribution)

**Features:**
- Complete assignment history
- Distribution strategy tracking (round-robin, capacity, geographic, skill-based)
- Metadata for distribution context (capacity levels, territory match)
- From/to user tracking

**Distribution Strategies:**
- manual - Admin assigns specific lead
- round_robin - Even distribution across team
- capacity - Assign to users with lowest lead count
- geographic - Territory-based matching
- skill_based - Top performers get hot leads

## Additional Tables

### 11. **lead_score_history**
Track lead score changes over time for trend analysis

### 12. **system_config**
Organization-specific configuration (scoring weights, limits)

## Security Features

### Row-Level Security (RLS)
All tables have RLS enabled for multi-tenant isolation:

```sql
-- Set current tenant before queries
SET app.current_tenant_id = 'uuid-here';
SET app.current_org_id = 'uuid-here';
```

**Policies:**
- `tenant_isolation_policy` - Users only see their tenant's data
- `org_dnc_policy` - DNC list is organization-wide

### Data Encryption
- Uses pgcrypto extension for sensitive data encryption
- Phone numbers stored in plain text for lookup (consider encryption at rest at infrastructure level)
- Audit logs capture IP addresses for security

## Performance Optimizations

### Indexes
- **B-tree indexes** - Standard lookups (user_id, status, phone_number)
- **GIN indexes** - Array operations (tags), full-text search (names)
- **Partial indexes** - Exclude soft-deleted rows (WHERE deleted_at IS NULL)
- **Unique indexes** - Prevent duplicates (phone + org)

### Query Patterns
```sql
-- Find leads by tag (uses GIN index)
SELECT * FROM leads WHERE tags @> ARRAY['hot', 'referral'];

-- Find leads by tag (any match)
SELECT * FROM leads WHERE tags && ARRAY['facebook', 'linkedin'];

-- Full-text name search (uses trigram index)
SELECT * FROM leads WHERE (first_name || ' ' || last_name) ILIKE '%john%';

-- Check DNC before calling
SELECT is_on_dnc_list('+12345678901', 'org-uuid');
```

### Trigger Functions
- `update_leads_updated_at()` - Auto-update updated_at timestamp
- Attached to leads table on UPDATE

## Helper Functions

### calculate_lead_score(lead_id UUID)
Placeholder for lead scoring logic (Story 3.7). Will calculate score based on:
- Qualification scores (BANTI framework)
- Engagement metrics (call frequency, nurture responses)
- Intent signals (transcript analysis)
- Demographic fit (territory, source quality)

### is_on_dnc_list(phone_number VARCHAR, org_id UUID)
Returns TRUE if phone number is on organization DNC list and not expired.

**Usage:**
```sql
-- Before initiating call
IF is_on_dnc_list(lead.phone_number, lead.organization_id) THEN
    RAISE EXCEPTION 'Lead on Do Not Call list';
END IF;
```

## Data Validation

### Check Constraints
- Lead status must be valid enum value
- Lead score must be 0-100
- Cost amounts must be non-negative
- Enrollment status must be valid

### Foreign Key Constraints
- Cascade deletes for related records (audit logs, status history)
- Prevents orphaned records
- Maintains referential integrity

## Running the Migration

### Apply Migration
```bash
# Using psql
psql $POSTGRES_URL -f backend/src/database/postgresql/migrations/002_epic3_crm_tables.sql

# Using Node.js migration runner (if available)
node backend/src/database/run-migrations.js up
```

### Rollback Migration
```bash
# Using psql
psql $POSTGRES_URL -f backend/src/database/postgresql/migrations/002_epic3_crm_tables_down.sql

# Using Node.js migration runner
node backend/src/database/run-migrations.js down
```

### Verify Migration
```sql
-- Check table creation
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'lead%' OR table_name IN ('dnc_list', 'segments', 'budget_transactions', 'nurture_sequences');

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

## Integration with Other Systems

### MongoDB (Call History)
- Lead IDs referenced in MongoDB `calls` collection
- Call outcomes trigger status changes in PostgreSQL
- Transcript analysis updates lead scoring

### Neo4j (Relationships)
- Lead UUID synced to Neo4j Lead nodes
- Relationship data (REFERRED_BY, KNOWS) stored in graph
- Network analysis informs lead scoring

### Redis (Caching)
- Lead scores cached: `lead:score:{lead_id}` (TTL: 1 hour)
- Recommendation cache: `lead_recommendations:{user_id}` (TTL: 1 hour)
- DNC bloom filter for ultra-fast lookups

### ChromaDB (Embeddings)
- Call transcripts embedded for semantic search
- Lead context embedded for similarity matching
- Relationship intelligence from graph + embeddings

## Data Migration (Existing Leads)

If migrating from old leads table schema:

```sql
-- Migrate existing leads to new schema
INSERT INTO leads (
    id, user_id, organization_id, first_name, last_name,
    phone_number, email, status, lead_score, notes,
    created_at, updated_at, tenant_id
)
SELECT
    gen_random_uuid(), -- Generate new UUIDs
    COALESCE(assigned_to::uuid, 'default-user-uuid'), -- Map old user IDs
    'default-org-uuid', -- Set default org
    first_name, last_name,
    phone, email, status,
    COALESCE(qualification_score, 0),
    notes,
    created_at, updated_at,
    'default-tenant-uuid'
FROM old_leads_table
WHERE NOT EXISTS (SELECT 1 FROM leads WHERE phone_number = old_leads_table.phone);
```

## Best Practices

### Lead Creation
1. Validate phone number format (E.164)
2. Check DNC list before creating
3. Normalize phone number with libphonenumber-js
4. Set source and source_metadata for attribution
5. Calculate initial lead score

### Status Transitions
1. Always log to lead_status_history
2. Capture trigger type and ID
3. Update last_contact_date on call completion
4. Recalculate lead score on status change

### Nurture Sequences
1. Check DNC before sending SMS/email
2. Respect engagement signals (pause on reply)
3. Track delivery status in MongoDB
4. Schedule next step with Bull queue

### Budget Tracking
1. Use transactions for atomic balance updates
2. Never delete budget_transactions (append-only)
3. Verify balance before allowing calls
4. Reconcile with Telnyx billing monthly

## Monitoring and Maintenance

### Daily Tasks
- Monitor lead score calculation performance
- Check for stuck nurture sequences
- Review DNC additions (AI-detected)
- Verify segment lead counts

### Weekly Tasks
- Analyze funnel conversion rates
- Review lead source ROI
- Check for orphaned records
- Vacuum and analyze tables

### Monthly Tasks
- Archive old audit logs (>1 year)
- Review and optimize slow queries
- Update lead score algorithm weights
- Reconcile budget transactions with billing

## Troubleshooting

### Common Issues

**Issue:** Duplicate phone number error
```sql
-- Find duplicates
SELECT phone_number, COUNT(*) FROM leads
WHERE deleted_at IS NULL
GROUP BY phone_number HAVING COUNT(*) > 1;

-- Soft delete duplicates (keep oldest)
UPDATE leads SET deleted_at = NOW()
WHERE id NOT IN (
    SELECT MIN(id) FROM leads
    GROUP BY phone_number, organization_id
);
```

**Issue:** Lead score not updating
```sql
-- Manually recalculate
UPDATE leads SET lead_score = calculate_lead_score(id)
WHERE updated_at > NOW() - INTERVAL '1 hour';
```

**Issue:** Slow segment queries
```sql
-- Add missing indexes
CREATE INDEX idx_custom ON leads(field_name) WHERE condition;

-- Refresh segment lead count
UPDATE segments
SET lead_count = (
    SELECT COUNT(*) FROM leads
    WHERE filter_matches(filter, leads.*)
);
```

## Future Enhancements

### Machine Learning Integration
- Train model on historical conversion data
- Predict lead score using ML (replace rule-based scoring)
- Churn prediction for "nurturing" leads
- Optimal contact time prediction per lead

### Advanced Analytics
- Cohort analysis tables
- Lead velocity tracking
- Multi-touch attribution
- LTV (Lifetime Value) calculations

### Compliance Extensions
- GDPR right-to-erasure automation
- Data retention policies
- Consent management tracking
- Privacy preference center

## Support

**Created by:** Database Architect
**Epic:** Epic 3 - AI-Powered CRM & Relationship Intelligence
**Stories Covered:** 3.1, 3.3, 3.5, 3.8, 3.9, 3.11, 3.14

For questions or issues, refer to Epic 3 documentation in `docs/epic3_stories.md`.