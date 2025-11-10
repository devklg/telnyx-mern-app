-- ============================================================================
-- Migration: 002_epic3_crm_tables.sql
-- Epic: Epic 3 - AI-Powered CRM & Relationship Intelligence
-- Author: Database Architect
-- Date: 2025-01-05
-- Description: Complete CRM schema for lead management, tracking, and intelligence
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- ============================================================================
-- 1. LEADS TABLE (Main CRM Entity)
-- Story 3.1: Lead Data Model and Basic CRUD
-- ============================================================================

-- Drop existing leads table if it exists (old schema)
DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE leads (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User/Owner Reference
    user_id UUID NOT NULL, -- References users table (will add FK after users migration)
    organization_id UUID NOT NULL, -- For multi-tenant isolation

    -- Required Contact Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL, -- E.164 format: +1234567890

    -- Optional Contact Information
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US', -- ISO 3166-1 alpha-2
    time_zone VARCHAR(50), -- IANA timezone: America/New_York

    -- Status and Lifecycle
    status VARCHAR(20) DEFAULT 'new' CHECK (
        status IN ('new', 'contacted', 'qualified', 'nurturing', 'hot', 'cold', 'recruited', 'dnc')
    ),

    -- Scoring and Intelligence
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    lead_score_factors JSONB, -- Breakdown of score calculation

    -- Source and Attribution
    source VARCHAR(100), -- facebook_ads, referral, event, etc.
    sub_source VARCHAR(100), -- Campaign ID or sub-category
    source_metadata JSONB, -- UTM params, ad ID, referrer details

    -- Tags and Categorization
    tags TEXT[], -- Array of freeform tags

    -- Notes and Context
    notes TEXT,

    -- Activity Tracking
    last_contact_date TIMESTAMP,
    interaction_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP, -- Soft delete

    -- Calling Control
    calling_blocked BOOLEAN DEFAULT FALSE,

    -- Row-Level Security Context
    tenant_id UUID NOT NULL -- For RLS policies
);

-- Indexes for Performance
CREATE INDEX idx_leads_user_id ON leads(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_organization_id ON leads(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_phone_number ON leads(phone_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_leads_phone_unique ON leads(phone_number, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON leads(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_last_contact ON leads(last_contact_date DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tags ON leads USING GIN(tags); -- GIN index for array operations
CREATE INDEX idx_leads_source ON leads(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_search_name ON leads USING gin((first_name || ' ' || last_name) gin_trgm_ops); -- Full-text search

-- Trigger for updated_at
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

COMMENT ON TABLE leads IS 'Main CRM lead records with contact info, scoring, and lifecycle tracking';
COMMENT ON COLUMN leads.phone_number IS 'E.164 format phone number (+1234567890)';
COMMENT ON COLUMN leads.lead_score IS 'AI-calculated lead quality score (0-100)';
COMMENT ON COLUMN leads.tags IS 'Freeform text tags for segmentation';

-- ============================================================================
-- 2. LEAD_AUDIT_LOG (Story 3.1: Track all lead changes)
-- ============================================================================

CREATE TABLE lead_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- User who made the change

    -- Change Details
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,

    -- Context
    change_reason VARCHAR(255),
    ip_address INET,
    user_agent TEXT,

    changed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_lead_id ON lead_audit_log(lead_id);
CREATE INDEX idx_audit_changed_at ON lead_audit_log(changed_at DESC);
CREATE INDEX idx_audit_user_id ON lead_audit_log(user_id);

COMMENT ON TABLE lead_audit_log IS 'Complete audit trail of all lead field changes';

-- ============================================================================
-- 3. LEAD_STATUS_HISTORY (Story 3.9: Funnel Analytics)
-- ============================================================================

CREATE TABLE lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    -- Status Transition
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,

    -- Context
    changed_by_user_id UUID NOT NULL,
    trigger_type VARCHAR(50), -- 'call', 'manual', 'automation', 'nurture', 'ai_recommendation'
    trigger_id UUID, -- ID of call, sequence, or action that triggered change
    reason TEXT,

    changed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX idx_status_history_changed_at ON lead_status_history(changed_at DESC);
CREATE INDEX idx_status_history_to_status ON lead_status_history(to_status);

COMMENT ON TABLE lead_status_history IS 'Status transitions for funnel analytics and time-in-stage calculations';

-- ============================================================================
-- 4. DNC_LIST (Story 3.8: Do Not Call Compliance)
-- ============================================================================

-- Drop existing DNC table
DROP TABLE IF EXISTS dnc_list CASCADE;

CREATE TABLE dnc_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Phone Number
    phone_number VARCHAR(20) NOT NULL UNIQUE, -- E.164 format

    -- Context
    organization_id UUID NOT NULL, -- DNC scope (organization-wide)
    added_by_user_id UUID NOT NULL,

    -- Reason and Source
    reason VARCHAR(100) NOT NULL, -- 'lead_requested', 'legal_requirement', 'admin_added', 'manual'
    source VARCHAR(100), -- 'call_transcript', 'manual_entry', 'complaint', 'automated'
    detected_phrase TEXT, -- For AI-detected opt-outs

    -- Notes
    notes TEXT,

    -- Timestamps
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP, -- Optional expiration (30-day grace period)

    -- Compliance
    consent_withdrawal_documented BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_dnc_phone_number ON dnc_list(phone_number);
CREATE INDEX idx_dnc_organization ON dnc_list(organization_id);
CREATE INDEX idx_dnc_added_at ON dnc_list(added_at DESC);

COMMENT ON TABLE dnc_list IS 'Do Not Call compliance list (organization-wide scope)';
COMMENT ON COLUMN dnc_list.expires_at IS 'Optional expiration for temporary DNC entries';

-- ============================================================================
-- 5. LEAD_SOURCE_COSTS (Story 3.14: ROI Tracking)
-- ============================================================================

CREATE TABLE lead_source_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Attribution
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    source VARCHAR(100) NOT NULL,
    sub_source VARCHAR(100), -- Optional campaign/sub-category

    -- Cost Data
    period VARCHAR(7) NOT NULL, -- YYYY-MM format (2024-01)
    cost_usd DECIMAL(10,2) NOT NULL CHECK (cost_usd >= 0),

    -- Context
    notes TEXT,
    currency VARCHAR(3) DEFAULT 'USD',

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_source_costs_user_id ON lead_source_costs(user_id);
CREATE INDEX idx_source_costs_source ON lead_source_costs(source);
CREATE INDEX idx_source_costs_period ON lead_source_costs(period);
CREATE UNIQUE INDEX idx_source_costs_unique ON lead_source_costs(user_id, source, period);

COMMENT ON TABLE lead_source_costs IS 'Track lead acquisition costs for ROI analysis';
COMMENT ON COLUMN lead_source_costs.period IS 'Month period in YYYY-MM format';

-- ============================================================================
-- 6. NURTURE_SEQUENCES (Story 3.5: Automated Sequences)
-- ============================================================================

CREATE TABLE nurture_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Ownership
    created_by_user_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    -- Sequence Definition
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Steps (JSONB array)
    steps JSONB NOT NULL, -- Array of step objects
    -- Example: [
    --   {
    --     "step": 1,
    --     "delay_days": 0,
    --     "channel": "sms",
    --     "template_id": "welcome_sms",
    --     "conditions": {}
    --   }
    -- ]

    -- Trigger Conditions
    trigger_conditions JSONB, -- When to auto-enroll leads

    -- Status
    active BOOLEAN DEFAULT TRUE,

    -- Analytics
    total_enrollments INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2), -- Percentage

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_nurture_sequences_user ON nurture_sequences(created_by_user_id);
CREATE INDEX idx_nurture_sequences_active ON nurture_sequences(active) WHERE active = TRUE;
CREATE INDEX idx_nurture_sequences_org ON nurture_sequences(organization_id);

COMMENT ON TABLE nurture_sequences IS 'Automated nurture sequence definitions with multi-step workflows';
COMMENT ON COLUMN nurture_sequences.steps IS 'JSONB array of sequence steps with channel, delay, and template';

-- ============================================================================
-- 7. LEAD_SEQUENCE_ENROLLMENTS (Story 3.5: Sequence Tracking)
-- ============================================================================

CREATE TABLE lead_sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,

    -- Enrollment State
    current_step INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'paused', 'completed', 'cancelled', 'failed')
    ),

    -- Tracking
    enrolled_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP,
    next_step_scheduled_at TIMESTAMP,

    -- Context
    enrolled_by_user_id UUID NOT NULL,
    pause_reason TEXT,

    -- Step Execution Log
    executed_steps JSONB, -- Array of completed steps with timestamps

    UNIQUE(lead_id, sequence_id, status) -- Prevent duplicate active enrollments
);

CREATE INDEX idx_enrollments_lead_id ON lead_sequence_enrollments(lead_id);
CREATE INDEX idx_enrollments_sequence_id ON lead_sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_status ON lead_sequence_enrollments(status);
CREATE INDEX idx_enrollments_next_step ON lead_sequence_enrollments(next_step_scheduled_at)
    WHERE status = 'active' AND next_step_scheduled_at IS NOT NULL;

COMMENT ON TABLE lead_sequence_enrollments IS 'Track lead enrollment and progress through nurture sequences';

-- ============================================================================
-- 8. SEGMENTS (Story 3.11: Saved Segments)
-- ============================================================================

CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Ownership
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    -- Segment Definition
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Filter Criteria (JSONB)
    filter JSONB NOT NULL,
    -- Example: {
    --   "status": ["new", "contacted"],
    --   "lead_score": {"gte": 70},
    --   "tags": {"contains_any": ["facebook", "hot"]},
    --   "last_contact": {"lte": "2024-01-01"}
    -- }

    -- Visibility
    is_public BOOLEAN DEFAULT FALSE, -- Share with team

    -- Analytics Cache
    lead_count INTEGER, -- Cached count
    last_calculated_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_segments_user_id ON segments(user_id);
CREATE INDEX idx_segments_org_id ON segments(organization_id);
CREATE INDEX idx_segments_public ON segments(is_public) WHERE is_public = TRUE;

COMMENT ON TABLE segments IS 'Saved lead segments with complex filter criteria';
COMMENT ON COLUMN segments.filter IS 'JSONB filter criteria for dynamic lead matching';

-- ============================================================================
-- 9. BUDGET_TRANSACTIONS (Story 2.8: Call Budget Tracking)
-- ============================================================================

CREATE TABLE budget_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User/Account
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL, -- 'debit', 'credit', 'refund', 'adjustment'
    amount_usd DECIMAL(10,2) NOT NULL,

    -- Balance Tracking
    balance_before_usd DECIMAL(10,2) NOT NULL,
    balance_after_usd DECIMAL(10,2) NOT NULL,

    -- Context
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'call', 'sms', 'top_up', 'admin_adjustment'
    reference_id UUID, -- ID of related call, SMS, or transaction

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,

    -- Audit
    created_by_user_id UUID
);

CREATE INDEX idx_budget_user_id ON budget_transactions(user_id);
CREATE INDEX idx_budget_created_at ON budget_transactions(created_at DESC);
CREATE INDEX idx_budget_type ON budget_transactions(transaction_type);
CREATE INDEX idx_budget_reference ON budget_transactions(reference_type, reference_id)
    WHERE reference_id IS NOT NULL;

COMMENT ON TABLE budget_transactions IS 'Immutable ledger of all budget transactions (calls, SMS, top-ups)';
COMMENT ON COLUMN budget_transactions.balance_after_usd IS 'Calculated balance after transaction for audit trail';

-- ============================================================================
-- 10. LEAD_ASSIGNMENTS (Story 3.3: Assignment Audit Trail)
-- ============================================================================

CREATE TABLE lead_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Lead Reference
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    -- Assignment Details
    from_user_id UUID, -- NULL if unassigned
    to_user_id UUID NOT NULL,
    assigned_by_user_id UUID NOT NULL,

    -- Distribution Strategy
    strategy VARCHAR(50), -- 'manual', 'round_robin', 'capacity', 'geographic', 'skill_based'
    reason TEXT,

    -- Context
    metadata JSONB, -- Additional context (capacity levels, territory match, etc.)

    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX idx_assignments_to_user ON lead_assignments(to_user_id);
CREATE INDEX idx_assignments_from_user ON lead_assignments(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_assignments_assigned_at ON lead_assignments(assigned_at DESC);

COMMENT ON TABLE lead_assignments IS 'Complete audit trail of lead ownership changes and distribution';

-- ============================================================================
-- ADDITIONAL UTILITY TABLES
-- ============================================================================

-- Lead Score History (for trend analysis)
CREATE TABLE lead_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    factors JSONB, -- Breakdown: qualification, engagement, intent, demographic

    calculated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX idx_score_history_calculated_at ON lead_score_history(calculated_at DESC);

COMMENT ON TABLE lead_score_history IS 'Historical lead scores for trend analysis';

-- System Configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,

    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,

    updated_by_user_id UUID,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    UNIQUE(organization_id, config_key)
);

CREATE INDEX idx_config_org_key ON system_config(organization_id, config_key);

COMMENT ON TABLE system_config IS 'Organization-specific configuration (scoring weights, limits, etc.)';

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_source_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy for leads (tenant isolation)
CREATE POLICY tenant_isolation_policy ON leads
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Example RLS Policy for dnc_list (organization-wide)
CREATE POLICY org_dnc_policy ON dnc_list
    USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

COMMENT ON POLICY tenant_isolation_policy ON leads IS 'Ensure users only see leads in their tenant';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_factors JSONB;
BEGIN
    -- This is a placeholder - actual scoring logic in Story 3.7
    -- Will integrate with call qualification scores, engagement metrics, etc.

    SELECT lead_score INTO v_score FROM leads WHERE id = p_lead_id;

    RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_lead_score IS 'Calculate lead score based on qualification, engagement, intent (Story 3.7)';

-- Function to check DNC status
CREATE OR REPLACE FUNCTION is_on_dnc_list(p_phone_number VARCHAR, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM dnc_list
        WHERE phone_number = p_phone_number
        AND organization_id = p_org_id
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_on_dnc_list IS 'Check if phone number is on organization DNC list';

-- ============================================================================
-- INITIAL DATA / DEFAULTS
-- ============================================================================

-- Insert default nurture sequence templates (can be customized by master admin)
-- (Placeholder - actual templates would be inserted via seed script)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table creation
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'leads', 'lead_audit_log', 'lead_status_history', 'dnc_list',
        'lead_source_costs', 'nurture_sequences', 'lead_sequence_enrollments',
        'segments', 'budget_transactions', 'lead_assignments', 'lead_score_history',
        'system_config'
    );

    RAISE NOTICE 'Epic 3 Migration Complete: % tables created', table_count;
END $$;