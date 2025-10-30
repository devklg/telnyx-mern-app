-- ============================================================================
-- Migration: 002_analytics_schema.sql
-- Purpose: Create complete analytics schema for OLAP/reporting
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- Dependencies: 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Analytics Schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS analytics;
SET search_path TO analytics, public;

-- ============================================================================
-- STEP 2: Create Dimension Tables
-- ============================================================================

-- Time Dimension
\i backend/src/database/postgresql/schemas/analytics/dim_time.sql

-- Lead Dimension
\i backend/src/database/postgresql/schemas/analytics/dim_leads.sql

-- ============================================================================
-- STEP 3: Create Fact Tables
-- ============================================================================

-- Call Facts
\i backend/src/database/postgresql/schemas/analytics/fact_calls.sql

-- Conversation Facts
\i backend/src/database/postgresql/schemas/analytics/fact_conversations.sql

-- ============================================================================
-- STEP 4: Create Aggregate Views and Reports
-- ============================================================================

\i backend/src/database/postgresql/schemas/analytics/aggregate_views.sql

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant read access to analytics schema
GRANT USAGE ON SCHEMA analytics TO neondb_owner;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO neondb_owner;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA analytics TO neondb_owner;

-- Grant write access for ETL processes
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO neondb_owner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO neondb_owner;

-- ============================================================================
-- STEP 6: Create Maintenance Jobs (Optional - requires pg_cron)
-- ============================================================================

-- Uncomment if pg_cron extension is available:
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh materialized views daily at 1 AM
SELECT cron.schedule('refresh-call-summary', '0 1 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_call_summary_daily'
);

SELECT cron.schedule('refresh-conversation-views', '0 2 * * *',
    'SELECT analytics.refresh_conversation_views()'
);
*/

-- ============================================================================
-- STEP 7: Create Monitoring View
-- ============================================================================

CREATE OR REPLACE VIEW analytics.vw_schema_health AS
SELECT
    'dim_time' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('analytics.dim_time')) as table_size,
    (SELECT MAX(date_actual) FROM analytics.dim_time) as latest_date
UNION ALL
SELECT
    'dim_leads',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('analytics.dim_leads')),
    (SELECT MAX(created_at)::date FROM analytics.dim_leads)
FROM analytics.dim_leads
UNION ALL
SELECT
    'fact_calls',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('analytics.fact_calls')),
    (SELECT MAX(call_date) FROM analytics.fact_calls)
FROM analytics.fact_calls
UNION ALL
SELECT
    'fact_conversations',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('analytics.fact_conversations')),
    (SELECT MAX(conversation_date) FROM analytics.fact_conversations)
FROM analytics.fact_conversations;

-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT 'Analytics schema migration completed successfully!' as status;
SELECT * FROM analytics.vw_schema_health;

COMMENT ON SCHEMA analytics IS 'Analytics schema for OLAP/reporting - contains dimension tables, fact tables, and aggregate views';
