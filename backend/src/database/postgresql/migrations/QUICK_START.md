# Epic 3 CRM Migration - Quick Start Guide

## TL;DR - Get Running in 5 Minutes

### 1. Prerequisites Check
```bash
# Ensure PostgreSQL 12+ with required extensions
psql $POSTGRES_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql $POSTGRES_URL -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
psql $POSTGRES_URL -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

### 2. Apply Migration
```bash
cd backend/src/database/postgresql/migrations
psql $POSTGRES_URL -f 002_epic3_crm_tables.sql
```

Expected output:
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
...
NOTICE:  Epic 3 Migration Complete: 12 tables created
```

### 3. Verify Tables
```bash
psql $POSTGRES_URL -c "\dt lead*"
```

Should show:
- leads
- lead_audit_log
- lead_status_history
- lead_assignments
- lead_score_history
- lead_sequence_enrollments
- lead_source_costs

### 4. Load Seed Data (Optional - Development Only)
```bash
cd backend/src/database/seeds
psql $POSTGRES_URL -f 002_epic3_seed_data.sql
```

### 5. Test Query
```bash
psql $POSTGRES_URL -c "SELECT id, first_name, last_name, status, lead_score FROM leads LIMIT 5;"
```

## What Was Created?

### 12 PostgreSQL Tables
✅ **leads** - Main CRM records
✅ **lead_audit_log** - Change tracking
✅ **lead_status_history** - Funnel analytics
✅ **dnc_list** - Do Not Call compliance
✅ **lead_source_costs** - ROI tracking
✅ **nurture_sequences** - Workflow definitions
✅ **lead_sequence_enrollments** - Progress tracking
✅ **segments** - Saved filters
✅ **budget_transactions** - Financial ledger
✅ **lead_assignments** - Distribution audit
✅ **lead_score_history** - Score trends
✅ **system_config** - Organization settings

### Key Features
- UUID primary keys
- E.164 phone validation
- PostgreSQL arrays for tags
- JSONB for flexible metadata
- Row-level security (RLS)
- Soft delete support
- Comprehensive indexing
- Trigger functions

## Common Operations

### Create a Lead
```sql
INSERT INTO leads (
    user_id, organization_id, tenant_id,
    first_name, last_name, phone_number, email,
    status, source, tags
) VALUES (
    'user-uuid'::uuid,
    'org-uuid'::uuid,
    'tenant-uuid'::uuid,
    'John', 'Doe', '+12125551234', 'john@example.com',
    'new', 'referral', ARRAY['hot', 'referral']
);
```

### Find Hot Leads
```sql
SELECT * FROM leads
WHERE status = 'hot'
AND lead_score >= 70
AND deleted_at IS NULL
ORDER BY lead_score DESC;
```

### Check DNC Before Calling
```sql
SELECT is_on_dnc_list('+12125551234', 'org-uuid'::uuid);
```

### Add to DNC List
```sql
INSERT INTO dnc_list (phone_number, organization_id, added_by_user_id, reason, source)
VALUES ('+12125551234', 'org-uuid'::uuid, 'user-uuid'::uuid, 'lead_requested', 'call_transcript');
```

### Track Status Change
```sql
-- Update lead status
UPDATE leads SET status = 'qualified' WHERE id = 'lead-uuid'::uuid;

-- Log status transition
INSERT INTO lead_status_history (lead_id, from_status, to_status, changed_by_user_id, trigger_type)
VALUES ('lead-uuid'::uuid, 'contacted', 'qualified', 'user-uuid'::uuid, 'call');
```

### Create Nurture Sequence
```sql
INSERT INTO nurture_sequences (created_by_user_id, organization_id, name, steps, active)
VALUES (
    'user-uuid'::uuid,
    'org-uuid'::uuid,
    'Welcome Sequence',
    '[
        {"step": 1, "delay_days": 0, "channel": "sms", "template_id": "welcome"},
        {"step": 2, "delay_days": 2, "channel": "email", "template_id": "followup"}
    ]'::jsonb,
    true
);
```

## Rollback (If Needed)

```bash
psql $POSTGRES_URL -f 002_epic3_crm_tables_down.sql
```

This will drop all tables, functions, and triggers created by the migration.

## Environment Variables

Ensure these are set in your `.env`:

```env
# PostgreSQL (Neon or local)
POSTGRES_URL=postgresql://user:password@host:5432/database

# Or individual components
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=voice_agent_crm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
```

## Troubleshooting

### Error: "extension does not exist"
```bash
# Connect as superuser and enable extensions
psql $POSTGRES_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Error: "permission denied"
```bash
# Ensure user has CREATE privileges
psql $POSTGRES_URL -c "GRANT ALL ON SCHEMA public TO your_user;"
```

### Error: "relation already exists"
```bash
# Tables already exist - either rollback first or skip
psql $POSTGRES_URL -f 002_epic3_crm_tables_down.sql
# Then reapply
psql $POSTGRES_URL -f 002_epic3_crm_tables.sql
```

### Verify Migration Status
```sql
-- Check table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'lead%';
-- Should return 7

-- Check indexes
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'lead%';
-- Should return 30+

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%lead%';
-- Should include calculate_lead_score, is_on_dnc_list
```

## Next Steps

### Backend Integration
1. Create Lead model/service
2. Implement CRUD API endpoints
3. Add DNC check to call initiation
4. Build nurture sequence processor
5. Implement scoring calculator

### Frontend Integration
1. Lead list table with filters
2. Lead detail view
3. Lead creation/edit forms
4. DNC management
5. Segment builder
6. Analytics dashboards

## Documentation

- **Full Guide:** `EPIC3_MIGRATION_GUIDE.md`
- **Schema Reference:** `EPIC3_SCHEMA_REFERENCE.md`
- **Summary:** `EPIC3_SUMMARY.md`
- **Epic Requirements:** `docs/epic3_stories.md`

## Sample Queries

### Funnel Analytics
```sql
SELECT
    to_status as stage,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (changed_at - LAG(changed_at) OVER (PARTITION BY lead_id ORDER BY changed_at)))) / 86400 as avg_days_in_stage
FROM lead_status_history
WHERE changed_at > NOW() - INTERVAL '30 days'
GROUP BY to_status
ORDER BY MIN(changed_at);
```

### ROI by Source
```sql
SELECT
    l.source,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN status = 'recruited' THEN 1 END) as recruited,
    COALESCE(SUM(c.cost_usd), 0) as total_cost,
    COALESCE(SUM(c.cost_usd), 0) / NULLIF(COUNT(*), 0) as cost_per_lead,
    COUNT(CASE WHEN status = 'recruited' THEN 1 END)::float / NULLIF(COUNT(*), 0) as conversion_rate
FROM leads l
LEFT JOIN lead_source_costs c ON l.source = c.source AND l.user_id = c.user_id
WHERE l.deleted_at IS NULL
GROUP BY l.source;
```

### Active Nurture Enrollments
```sql
SELECT
    l.first_name || ' ' || l.last_name as lead_name,
    ns.name as sequence_name,
    lse.current_step,
    lse.next_step_scheduled_at
FROM lead_sequence_enrollments lse
JOIN leads l ON lse.lead_id = l.id
JOIN nurture_sequences ns ON lse.sequence_id = ns.id
WHERE lse.status = 'active'
AND lse.next_step_scheduled_at IS NOT NULL
ORDER BY lse.next_step_scheduled_at;
```

## Migration Files Reference

| File | Purpose | Size |
|------|---------|------|
| `002_epic3_crm_tables.sql` | Main migration (UP) | 22 KB |
| `002_epic3_crm_tables_down.sql` | Rollback (DOWN) | 1.5 KB |
| `../../seeds/002_epic3_seed_data.sql` | Sample data | 23 KB |
| `EPIC3_MIGRATION_GUIDE.md` | Detailed guide | 15 KB |
| `EPIC3_SCHEMA_REFERENCE.md` | Quick reference | 15 KB |
| `EPIC3_SUMMARY.md` | Executive summary | 12 KB |
| `QUICK_START.md` | This file | 6 KB |

---

**Ready to Go?** Run the migration and start building Epic 3 features! 🚀