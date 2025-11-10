# Epic 3 Database Schema Reference

## Quick Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EPIC 3 CRM TABLES                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     LEADS        │ ◄──────────────┐
│  (Main Entity)   │                │
├──────────────────┤                │
│ id (UUID) PK     │                │
│ user_id          │                │
│ organization_id  │                │
│ first_name       │                │
│ last_name        │                │
│ phone_number ◄───┼─── Unique      │
│ email            │     per Org    │
│ status           │                │
│ lead_score       │                │
│ tags[]           │                │
│ source           │                │
│ created_at       │                │
└──────────────────┘                │
         │                          │
         │ FK                       │
         ├──────────────────────────┼───────────────┐
         │                          │               │
         ▼                          │               ▼
┌──────────────────┐       ┌──────────────────┐   ┌──────────────────┐
│ LEAD_AUDIT_LOG   │       │LEAD_STATUS_HISTORY│   │LEAD_SCORE_HISTORY│
├──────────────────┤       ├──────────────────┤   ├──────────────────┤
│ id PK            │       │ id PK            │   │ id PK            │
│ lead_id FK       │       │ lead_id FK       │   │ lead_id FK       │
│ field_name       │       │ from_status      │   │ score            │
│ old_value        │       │ to_status        │   │ factors (JSONB)  │
│ new_value        │       │ trigger_type     │   │ calculated_at    │
│ changed_at       │       │ changed_at       │   └──────────────────┘
└──────────────────┘       └──────────────────┘
  (Audit Trail)              (Funnel Analytics)     (Score Trends)

         │
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│LEAD_ASSIGNMENTS  │       │     DNC_LIST     │
├──────────────────┤       ├──────────────────┤
│ id PK            │       │ id PK            │
│ lead_id FK       │       │ phone_number ◄───┼─── Unique
│ from_user_id     │       │ organization_id  │     (Org-wide)
│ to_user_id       │       │ reason           │
│ strategy         │       │ source           │
│ assigned_at      │       │ added_at         │
└──────────────────┘       └──────────────────┘
  (Distribution)             (Compliance)


┌──────────────────┐       ┌──────────────────┐
│NURTURE_SEQUENCES │       │LEAD_SEQUENCE_    │
├──────────────────┤       │  ENROLLMENTS     │
│ id PK            │◄──────│ id PK            │
│ name             │   FK  │ lead_id FK       │
│ description      │       │ sequence_id FK   │
│ steps (JSONB[])  │       │ current_step     │
│ active           │       │ status           │
│ created_at       │       │ enrolled_at      │
└──────────────────┘       └──────────────────┘
  (Sequence Defs)            (Progress Tracking)


┌──────────────────┐       ┌──────────────────┐
│LEAD_SOURCE_COSTS │       │    SEGMENTS      │
├──────────────────┤       ├──────────────────┤
│ id PK            │       │ id PK            │
│ user_id          │       │ user_id          │
│ source           │       │ name             │
│ period (YYYY-MM) │       │ filter (JSONB)   │
│ cost_usd         │       │ lead_count       │
└──────────────────┘       └──────────────────┘
  (ROI Tracking)             (Saved Filters)


┌──────────────────┐       ┌──────────────────┐
│BUDGET_TRANSACTIONS│      │  SYSTEM_CONFIG   │
├──────────────────┤       ├──────────────────┤
│ id PK            │       │ id PK            │
│ user_id          │       │ organization_id  │
│ transaction_type │       │ config_key       │
│ amount_usd       │       │ config_value     │
│ balance_after_usd│       │ updated_at       │
└──────────────────┘       └──────────────────┘
  (Financial Ledger)         (Org Settings)
```

## Table Relationships

### Primary Relationships
- **leads** → lead_audit_log (1:N) - All field changes
- **leads** → lead_status_history (1:N) - Status transitions
- **leads** → lead_score_history (1:N) - Score evolution
- **leads** → lead_assignments (1:N) - Ownership changes
- **leads** → lead_sequence_enrollments (1:N) - Nurture tracking

### Lookup Tables
- **dnc_list** - Independent lookup by phone_number
- **lead_source_costs** - Aggregation by source + period
- **segments** - Dynamic filter definitions

### Configuration
- **nurture_sequences** - Master sequence definitions
- **system_config** - Organization-wide settings

## Key Data Types

### UUID Fields
All IDs use UUID v4 for distributed systems compatibility:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

### Phone Numbers
E.164 format enforced:
```sql
phone_number VARCHAR(20) -- Example: +12125551234
```

### Arrays
PostgreSQL native arrays for tags:
```sql
tags TEXT[] -- Example: ARRAY['hot', 'referral', 'executive']
```

### JSONB
Flexible structured data:
```sql
-- Lead scoring factors
lead_score_factors JSONB
{
  "qualification": 40,
  "engagement": 25,
  "intent": 15,
  "demographic": 5,
  "total": 85
}

-- Nurture sequence steps
steps JSONB
[
  {
    "step": 1,
    "delay_days": 0,
    "channel": "sms",
    "template_id": "welcome_sms"
  }
]
```

## Index Strategy

### B-Tree Indexes (Standard Lookups)
```sql
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_phone_number ON leads(phone_number);
```

### GIN Indexes (Array & Full-Text)
```sql
-- Array operations
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- Full-text search
CREATE INDEX idx_leads_search_name ON leads
  USING gin((first_name || ' ' || last_name) gin_trgm_ops);
```

### Partial Indexes (Performance)
```sql
-- Only index non-deleted records
CREATE INDEX idx_leads_user_id ON leads(user_id)
  WHERE deleted_at IS NULL;

-- Only index active enrollments
CREATE INDEX idx_enrollments_next_step ON lead_sequence_enrollments(next_step_scheduled_at)
  WHERE status = 'active';
```

### Unique Indexes (Constraints)
```sql
-- Prevent duplicate phone numbers per organization
CREATE UNIQUE INDEX idx_leads_phone_unique
  ON leads(phone_number, organization_id)
  WHERE deleted_at IS NULL;

-- Prevent duplicate DNC entries
CREATE UNIQUE INDEX ON dnc_list(phone_number);
```

## Common Query Patterns

### Find Leads by Tags (Any)
```sql
SELECT * FROM leads
WHERE tags && ARRAY['facebook', 'linkedin']
AND deleted_at IS NULL;
```

### Find Leads by Tags (All)
```sql
SELECT * FROM leads
WHERE tags @> ARRAY['hot', 'referral']
AND deleted_at IS NULL;
```

### Check DNC Before Calling
```sql
SELECT is_on_dnc_list('+12125551234', 'org-uuid');
```

### Calculate Funnel Conversion
```sql
WITH funnel AS (
  SELECT
    to_status,
    COUNT(*) as count,
    LAG(COUNT(*)) OVER (ORDER BY stage_order) as prev_count
  FROM lead_status_history
  WHERE changed_at > NOW() - INTERVAL '30 days'
  GROUP BY to_status
)
SELECT
  to_status,
  count,
  count::float / NULLIF(prev_count, 0) as conversion_rate
FROM funnel;
```

### Calculate Lead ROI by Source
```sql
WITH source_metrics AS (
  SELECT
    l.source,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN status = 'recruited' THEN 1 END) as recruited,
    COALESCE(SUM(c.cost_usd), 0) as total_cost
  FROM leads l
  LEFT JOIN lead_source_costs c
    ON l.source = c.source
    AND l.user_id = c.user_id
  WHERE l.user_id = $1
  GROUP BY l.source
)
SELECT
  source,
  total_leads,
  recruited,
  total_cost,
  total_cost / NULLIF(total_leads, 0) as cost_per_lead,
  recruited::float / NULLIF(total_leads, 0) as conversion_rate,
  total_cost / NULLIF(recruited, 0) as cost_per_recruit
FROM source_metrics;
```

### Get Lead Activity Timeline
```sql
-- Recent status changes
SELECT
  'status_change' as type,
  to_status as summary,
  changed_at as timestamp
FROM lead_status_history
WHERE lead_id = $1
ORDER BY changed_at DESC
LIMIT 10;
```

### Find Hot Leads (Segment)
```sql
SELECT * FROM leads
WHERE status IN ('hot', 'qualified')
AND lead_score >= 70
AND deleted_at IS NULL
ORDER BY lead_score DESC, last_contact_date DESC
LIMIT 10;
```

## Trigger Functions

### Auto-Update Timestamps
```sql
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();
```

## Row-Level Security (RLS)

### Tenant Isolation
```sql
-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users only see their tenant's data
CREATE POLICY tenant_isolation_policy ON leads
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Set tenant before queries
SET app.current_tenant_id = 'user-tenant-uuid';
```

### Organization-Wide DNC
```sql
CREATE POLICY org_dnc_policy ON dnc_list
    USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);
```

## Data Validation

### Check Constraints
```sql
-- Lead status enum
status VARCHAR(20) CHECK (
    status IN ('new', 'contacted', 'qualified', 'nurturing', 'hot', 'cold', 'recruited', 'dnc')
)

-- Lead score range
lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100)

-- Non-negative costs
cost_usd DECIMAL(10,2) CHECK (cost_usd >= 0)
```

### Foreign Key Constraints
```sql
-- Cascade delete related records
lead_id UUID REFERENCES leads(id) ON DELETE CASCADE

-- Prevent deletion if referenced
sequence_id UUID REFERENCES nurture_sequences(id) ON DELETE CASCADE
```

## Performance Tips

### Use Partial Indexes
```sql
-- Index only active records
WHERE deleted_at IS NULL
WHERE status = 'active'
```

### Avoid N+1 Queries
```sql
-- Bad: Separate queries per lead
SELECT * FROM leads;
-- Then for each lead:
SELECT * FROM lead_status_history WHERE lead_id = ?;

-- Good: Join in single query
SELECT l.*,
       json_agg(h.*) as status_history
FROM leads l
LEFT JOIN lead_status_history h ON l.id = h.lead_id
GROUP BY l.id;
```

### Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM leads
WHERE status = 'hot'
AND lead_score > 70;
```

### Vacuum Regularly
```sql
-- Manual vacuum (development)
VACUUM ANALYZE leads;

-- Enable autovacuum (production - default)
-- Configured at database level
```

## Migration Commands

### Apply Migration
```bash
psql $POSTGRES_URL -f backend/src/database/postgresql/migrations/002_epic3_crm_tables.sql
```

### Rollback Migration
```bash
psql $POSTGRES_URL -f backend/src/database/postgresql/migrations/002_epic3_crm_tables_down.sql
```

### Load Seed Data
```bash
psql $POSTGRES_URL -f backend/src/database/seeds/002_epic3_seed_data.sql
```

### Verify Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'lead%';
```

## Epic 3 Story Coverage

- ✅ **Story 3.1** - leads, lead_audit_log (Lead CRUD)
- ✅ **Story 3.2** - Import tracking (via seeds)
- ✅ **Story 3.3** - lead_assignments (Distribution)
- ✅ **Story 3.4** - AI recommendations (cached in Redis)
- ✅ **Story 3.5** - nurture_sequences, lead_sequence_enrollments (Nurture)
- ✅ **Story 3.6** - Neo4j integration (separate graph DB)
- ✅ **Story 3.7** - lead_score_history (Scoring)
- ✅ **Story 3.8** - dnc_list (Compliance)
- ✅ **Story 3.9** - lead_status_history (Funnel Analytics)
- ✅ **Story 3.10** - Coaching analytics (queries on existing data)
- ✅ **Story 3.11** - segments (Segmentation)
- ✅ **Story 3.12** - CRM integration (via API, not schema)
- ✅ **Story 3.13** - Timeline (MongoDB + PostgreSQL union)
- ✅ **Story 3.14** - lead_source_costs (ROI)

## Additional Resources

- **Epic 3 Stories:** `docs/epic3_stories.md`
- **Migration Guide:** `EPIC3_MIGRATION_GUIDE.md`
- **Seed Data:** `002_epic3_seed_data.sql`
- **Database Config:** `backend/src/config/database.js`