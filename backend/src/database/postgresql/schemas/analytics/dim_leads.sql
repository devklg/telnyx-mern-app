-- ============================================================================
-- Dimension Table: dim_leads
-- Purpose: Lead dimension for analytical queries (Type 2 Slowly Changing Dimension)
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dim_leads (
    lead_key SERIAL PRIMARY KEY,

    -- Business Key (from MongoDB)
    lead_id VARCHAR(50) NOT NULL,

    -- Lead Attributes
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,

    -- Company Information
    company_name VARCHAR(255),
    company_industry VARCHAR(100),
    company_size VARCHAR(50),
    job_title VARCHAR(150),

    -- Lead Classification
    source VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    lifecycle_stage VARCHAR(50),
    priority VARCHAR(20),

    -- Qualification
    qualification_score INTEGER CHECK (qualification_score BETWEEN 0 AND 100),
    qualification_tier VARCHAR(20) GENERATED ALWAYS AS (
        CASE
            WHEN qualification_score >= 80 THEN 'Hot'
            WHEN qualification_score >= 60 THEN 'Warm'
            WHEN qualification_score >= 40 THEN 'Cool'
            ELSE 'Cold'
        END
    ) STORED,

    -- BANT Qualification
    has_budget BOOLEAN DEFAULT FALSE,
    has_authority BOOLEAN DEFAULT FALSE,
    has_need BOOLEAN DEFAULT FALSE,
    has_timeline BOOLEAN DEFAULT FALSE,
    bant_score INTEGER GENERATED ALWAYS AS (
        (CASE WHEN has_budget THEN 1 ELSE 0 END) +
        (CASE WHEN has_authority THEN 1 ELSE 0 END) +
        (CASE WHEN has_need THEN 1 ELSE 0 END) +
        (CASE WHEN has_timeline THEN 1 ELSE 0 END)
    ) STORED,

    -- Assignment
    assigned_agent_id VARCHAR(50),
    assigned_agent_name VARCHAR(200),
    campaign_id VARCHAR(50),
    campaign_name VARCHAR(255),

    -- Geography
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'US',
    timezone VARCHAR(50),

    -- Consent and Compliance
    can_call BOOLEAN DEFAULT TRUE,
    can_email BOOLEAN DEFAULT TRUE,
    can_sms BOOLEAN DEFAULT TRUE,
    gdpr_consent BOOLEAN DEFAULT FALSE,

    -- SCD Type 2 Fields
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE DEFAULT '9999-12-31',
    is_current BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_dim_leads_lead_id ON dim_leads(lead_id);
CREATE INDEX idx_dim_leads_is_current ON dim_leads(is_current);
CREATE INDEX idx_dim_leads_lead_id_current ON dim_leads(lead_id, is_current);
CREATE INDEX idx_dim_leads_status ON dim_leads(status);
CREATE INDEX idx_dim_leads_qualification_score ON dim_leads(qualification_score DESC);
CREATE INDEX idx_dim_leads_qualification_tier ON dim_leads(qualification_tier);
CREATE INDEX idx_dim_leads_source ON dim_leads(source);
CREATE INDEX idx_dim_leads_industry ON dim_leads(company_industry);
CREATE INDEX idx_dim_leads_assigned_agent ON dim_leads(assigned_agent_id);
CREATE INDEX idx_dim_leads_campaign ON dim_leads(campaign_id);
CREATE INDEX idx_dim_leads_effective_date ON dim_leads(effective_date);

-- Unique constraint on current records
CREATE UNIQUE INDEX idx_dim_leads_unique_current
ON dim_leads(lead_id, is_current)
WHERE is_current = TRUE;

-- Function to update SCD Type 2
CREATE OR REPLACE FUNCTION update_dim_lead(
    p_lead_id VARCHAR(50),
    p_first_name VARCHAR(100),
    p_last_name VARCHAR(100),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_company_name VARCHAR(255),
    p_company_industry VARCHAR(100),
    p_company_size VARCHAR(50),
    p_job_title VARCHAR(150),
    p_source VARCHAR(50),
    p_status VARCHAR(20),
    p_lifecycle_stage VARCHAR(50),
    p_priority VARCHAR(20),
    p_qualification_score INTEGER,
    p_has_budget BOOLEAN,
    p_has_authority BOOLEAN,
    p_has_need BOOLEAN,
    p_has_timeline BOOLEAN,
    p_assigned_agent_id VARCHAR(50),
    p_assigned_agent_name VARCHAR(200),
    p_campaign_id VARCHAR(50),
    p_campaign_name VARCHAR(255),
    p_city VARCHAR(100),
    p_state VARCHAR(50),
    p_country VARCHAR(50),
    p_timezone VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    v_lead_key INTEGER;
    v_version INTEGER;
    v_changed BOOLEAN := FALSE;
BEGIN
    -- Check if lead exists and has changed
    SELECT
        lead_key,
        version,
        (
            COALESCE(first_name, '') != COALESCE(p_first_name, '') OR
            COALESCE(last_name, '') != COALESCE(p_last_name, '') OR
            COALESCE(status, '') != COALESCE(p_status, '') OR
            COALESCE(qualification_score, 0) != COALESCE(p_qualification_score, 0) OR
            COALESCE(assigned_agent_id, '') != COALESCE(p_assigned_agent_id, '')
        ) as has_changed
    INTO v_lead_key, v_version, v_changed
    FROM dim_leads
    WHERE lead_id = p_lead_id AND is_current = TRUE;

    -- If lead exists and has changed, expire current record and insert new
    IF FOUND AND v_changed THEN
        -- Expire current record
        UPDATE dim_leads
        SET
            expiration_date = CURRENT_DATE - INTERVAL '1 day',
            is_current = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = p_lead_id AND is_current = TRUE;

        -- Insert new version
        INSERT INTO dim_leads (
            lead_id, first_name, last_name, full_name, email, phone,
            company_name, company_industry, company_size, job_title,
            source, status, lifecycle_stage, priority,
            qualification_score,
            has_budget, has_authority, has_need, has_timeline,
            assigned_agent_id, assigned_agent_name,
            campaign_id, campaign_name,
            city, state, country, timezone,
            effective_date, is_current, version
        ) VALUES (
            p_lead_id, p_first_name, p_last_name,
            CONCAT(p_first_name, ' ', p_last_name),
            p_email, p_phone,
            p_company_name, p_company_industry, p_company_size, p_job_title,
            p_source, p_status, p_lifecycle_stage, p_priority,
            p_qualification_score,
            p_has_budget, p_has_authority, p_has_need, p_has_timeline,
            p_assigned_agent_id, p_assigned_agent_name,
            p_campaign_id, p_campaign_name,
            p_city, p_state, p_country, p_timezone,
            CURRENT_DATE, TRUE, v_version + 1
        ) RETURNING lead_key INTO v_lead_key;

    -- If lead doesn't exist, insert new record
    ELSIF NOT FOUND THEN
        INSERT INTO dim_leads (
            lead_id, first_name, last_name, full_name, email, phone,
            company_name, company_industry, company_size, job_title,
            source, status, lifecycle_stage, priority,
            qualification_score,
            has_budget, has_authority, has_need, has_timeline,
            assigned_agent_id, assigned_agent_name,
            campaign_id, campaign_name,
            city, state, country, timezone,
            effective_date, is_current, version
        ) VALUES (
            p_lead_id, p_first_name, p_last_name,
            CONCAT(p_first_name, ' ', p_last_name),
            p_email, p_phone,
            p_company_name, p_company_industry, p_company_size, p_job_title,
            p_source, p_status, p_lifecycle_stage, p_priority,
            p_qualification_score,
            p_has_budget, p_has_authority, p_has_need, p_has_timeline,
            p_assigned_agent_id, p_assigned_agent_name,
            p_campaign_id, p_campaign_name,
            p_city, p_state, p_country, p_timezone,
            CURRENT_DATE, TRUE, 1
        ) RETURNING lead_key INTO v_lead_key;
    END IF;

    RETURN v_lead_key;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE dim_leads IS 'Lead dimension table with Type 2 Slowly Changing Dimension support for historical tracking';
COMMENT ON FUNCTION update_dim_lead IS 'Updates lead dimension with SCD Type 2 logic - creates new version if attributes changed';
