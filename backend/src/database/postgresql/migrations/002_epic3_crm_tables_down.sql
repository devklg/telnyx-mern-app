-- ============================================================================
-- Rollback Migration: 002_epic3_crm_tables_down.sql
-- Epic: Epic 3 - AI-Powered CRM & Relationship Intelligence
-- Author: Database Architect
-- Date: 2025-01-05
-- Description: Rollback script for Epic 3 CRM tables
-- ============================================================================

-- Drop all RLS policies first
DROP POLICY IF EXISTS tenant_isolation_policy ON leads;
DROP POLICY IF EXISTS org_dnc_policy ON dnc_list;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_lead_score(UUID);
DROP FUNCTION IF EXISTS is_on_dnc_list(VARCHAR, UUID);
DROP FUNCTION IF EXISTS update_leads_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS lead_score_history CASCADE;
DROP TABLE IF EXISTS lead_assignments CASCADE;
DROP TABLE IF EXISTS budget_transactions CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS lead_sequence_enrollments CASCADE;
DROP TABLE IF EXISTS nurture_sequences CASCADE;
DROP TABLE IF EXISTS lead_source_costs CASCADE;
DROP TABLE IF EXISTS dnc_list CASCADE;
DROP TABLE IF EXISTS lead_status_history CASCADE;
DROP TABLE IF EXISTS lead_audit_log CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Epic 3 Migration Rollback Complete: All tables dropped';
END $$;