-- ============================================================================
-- BMAD V4 - NEON POSTGRESQL SCHEMA
-- ============================================================================
-- 
-- Database schema for the Voice Agent Learning System operational data
-- Tables for:
-- - Leads (prospects being qualified)
-- - Calls (voice interactions)
-- - Users (system users and agents)
-- - Partner Metrics (revenue tracking)
-- - Agent Performance (AI learning metrics)
--
-- Author: BMAD v4 Development Team
-- Created: October 2025
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
-- Stores all leads in the qualification pipeline

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Contact Information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  
  -- Lead Source & Classification
  source VARCHAR(100),  -- website, referral, cold_outreach, etc.
  interest_level VARCHAR(20) CHECK (interest_level IN ('hot', 'warm', 'cold')),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'dead')),
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_contact_at TIMESTAMP,
  converted_at TIMESTAMP,
  
  -- Notes & Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Indexes
  INDEX idx_leads_status (status),
  INDEX idx_leads_interest (interest_level),
  INDEX idx_leads_phone (phone),
  INDEX idx_leads_email (email),
  INDEX idx_leads_created (created_at DESC)
);

-- ============================================================================
-- CALLS TABLE
-- ============================================================================
-- Records all voice interactions with leads

CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Relationships
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER,  -- Agent who handled the call
  
  -- Call Details
  phone_number VARCHAR(50) NOT NULL,
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'ringing', 'answered', 'in_progress', 
    'completed', 'failed', 'busy', 'no_answer', 'transferred'
  )),
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Outcomes
  outcome VARCHAR(50) CHECK (outcome IN (
    'qualified', 'not_qualified', 'callback_requested', 
    'not_interested', 'converted', 'voicemail'
  )),
  
  -- Telnyx Integration
  telnyx_call_id VARCHAR(255),
  recording_url TEXT,
  
  -- AI Analysis
  sentiment VARCHAR(20),  -- positive, neutral, negative
  conversation_phase INTEGER,  -- Which of the 12 phases reached
  
  -- Notes & Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Indexes
  INDEX idx_calls_lead (lead_id),
  INDEX idx_calls_status (status),
  INDEX idx_calls_outcome (outcome),
  INDEX idx_calls_started (started_at DESC),
  INDEX idx_calls_telnyx (telnyx_call_id)
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- System users including AI agents and human team members

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- Null for AI agents
  
  -- Profile
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'admin', 'agent', 'closer', 'ai_agent', 'viewer'
  )),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_ai_agent BOOLEAN DEFAULT false,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  
  -- Settings
  settings JSONB,
  
  -- Indexes
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
);

-- ============================================================================
-- PARTNER_METRICS TABLE
-- ============================================================================
-- Tracks revenue metrics for LEV/AI SaaS recurring revenue model

CREATE TABLE IF NOT EXISTS partner_metrics (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Relationships
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Partner Information
  partner_name VARCHAR(255) NOT NULL,
  tier VARCHAR(20) CHECK (tier IN ('premium', 'standard')),  -- $99 or $49
  
  -- Revenue Tracking
  mrr DECIMAL(10, 2) NOT NULL,  -- Monthly Recurring Revenue
  acquisition_bonus DECIMAL(10, 2),  -- 50% first month bonus
  commission_rate DECIMAL(5, 4) DEFAULT 0.20,  -- 20%
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
    'active', 'churned', 'paused', 'cancelled'
  )),
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  first_payment_at TIMESTAMP,
  last_payment_at TIMESTAMP,
  churned_at TIMESTAMP,
  
  -- Cumulative Metrics
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  months_active INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Indexes
  INDEX idx_partner_metrics_lead (lead_id),
  INDEX idx_partner_metrics_status (status),
  INDEX idx_partner_metrics_tier (tier),
  INDEX idx_partner_metrics_created (created_at DESC)
);

-- ============================================================================
-- AGENT_PERFORMANCE TABLE
-- ============================================================================
-- Tracks AI agent learning and performance metrics

CREATE TABLE IF NOT EXISTS agent_performance (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Time Period
  date DATE NOT NULL,
  agent_id INTEGER,  -- NULL for system-wide metrics
  
  -- Call Metrics
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  avg_duration_seconds DECIMAL(10, 2),
  
  -- Qualification Metrics
  leads_qualified INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  hot_transfers INTEGER DEFAULT 0,
  
  -- Conversion Rates (stored for quick access)
  qualification_rate DECIMAL(5, 4),  -- qualified / total_calls
  conversion_rate DECIMAL(5, 4),  -- converted / qualified
  
  -- Learning Metrics
  new_insights_learned INTEGER DEFAULT 0,
  patterns_identified INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  UNIQUE (date, agent_id),
  
  -- Indexes
  INDEX idx_agent_performance_date (date DESC),
  INDEX idx_agent_performance_agent (agent_id)
);

-- ============================================================================
-- CONVERSATION_PHASES TABLE
-- ============================================================================
-- Tracks which of the 12 phases of conversation were completed per call

CREATE TABLE IF NOT EXISTS conversation_phases (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
  
  -- Phase tracking (12-phase script)
  phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 12),
  phase_name VARCHAR(100) NOT NULL,
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Quality Metrics
  ai_confidence_score DECIMAL(5, 4),  -- How confident the AI was
  sentiment VARCHAR(20),
  
  -- Notes
  notes TEXT,
  metadata JSONB,
  
  -- Constraints
  UNIQUE (call_id, phase_number),
  
  -- Indexes
  INDEX idx_conversation_phases_call (call_id),
  INDEX idx_conversation_phases_number (phase_number)
);

-- ============================================================================
-- LEARNING_EVENTS TABLE
-- ============================================================================
-- Records significant learning events for the AI system

CREATE TABLE IF NOT EXISTS learning_events (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL,  -- pattern_identified, phrase_successful, etc.
  event_data JSONB NOT NULL,
  
  -- Context
  call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Impact
  impact_score DECIMAL(5, 4),  -- How significant was this learning
  applied_count INTEGER DEFAULT 0,  -- How many times this learning was applied
  
  -- Timing
  learned_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_learning_events_type (event_type),
  INDEX idx_learning_events_call (call_id),
  INDEX idx_learning_events_learned (learned_at DESC)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update leads.updated_at on any change
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Trigger to update lead status when converted
CREATE OR REPLACE FUNCTION update_lead_on_conversion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.outcome = 'converted' AND OLD.outcome != 'converted' THEN
    UPDATE leads 
    SET status = 'converted', 
        converted_at = NOW() 
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_on_conversion
  AFTER UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_on_conversion();

-- Trigger to update partner metrics monthly
CREATE OR REPLACE FUNCTION update_partner_lifetime_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    NEW.months_active = EXTRACT(MONTH FROM AGE(NOW(), NEW.created_at));
    NEW.lifetime_value = (NEW.mrr * NEW.commission_rate * NEW.months_active) + COALESCE(NEW.acquisition_bonus, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_lifetime_value
  BEFORE UPDATE ON partner_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_lifetime_value();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active Leads Pipeline
CREATE OR REPLACE VIEW active_leads_pipeline AS
SELECT 
  l.id,
  l.name,
  l.email,
  l.phone,
  l.status,
  l.interest_level,
  COUNT(c.id) as total_calls,
  MAX(c.started_at) as last_call_at,
  l.created_at,
  EXTRACT(DAY FROM AGE(NOW(), l.created_at)) as days_in_pipeline
FROM leads l
LEFT JOIN calls c ON l.id = c.lead_id
WHERE l.status IN ('new', 'contacted', 'qualified')
GROUP BY l.id
ORDER BY l.created_at DESC;

-- View: Revenue Dashboard
CREATE OR REPLACE VIEW revenue_dashboard AS
SELECT 
  COUNT(*) as total_partners,
  COUNT(*) FILTER (WHERE tier = 'premium') as premium_partners,
  COUNT(*) FILTER (WHERE tier = 'standard') as standard_partners,
  COUNT(*) FILTER (WHERE status = 'active') as active_partners,
  SUM(mrr * commission_rate) FILTER (WHERE status = 'active') as monthly_recurring_revenue,
  SUM(lifetime_value) as total_lifetime_value,
  AVG(months_active) FILTER (WHERE status = 'active') as avg_partner_tenure
FROM partner_metrics;

-- View: Agent Performance Summary
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_id,
  SUM(total_calls) as total_calls,
  SUM(successful_calls) as successful_calls,
  SUM(leads_qualified) as leads_qualified,
  SUM(leads_converted) as leads_converted,
  AVG(qualification_rate) as avg_qualification_rate,
  AVG(conversion_rate) as avg_conversion_rate,
  MIN(date) as first_active_date,
  MAX(date) as last_active_date
FROM agent_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY agent_id
ORDER BY leads_converted DESC;

-- View: Conversation Phase Completion
CREATE OR REPLACE VIEW phase_completion_stats AS
SELECT 
  cp.phase_number,
  cp.phase_name,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE cp.completed = true) as completed_count,
  ROUND(AVG(cp.duration_seconds), 2) as avg_duration_seconds,
  ROUND(AVG(cp.ai_confidence_score), 4) as avg_confidence_score
FROM conversation_phases cp
JOIN calls c ON cp.call_id = c.id
WHERE c.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cp.phase_number, cp.phase_name
ORDER BY cp.phase_number;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert system AI agent user
INSERT INTO users (email, name, role, is_active, is_ai_agent) VALUES
  ('ai-agent@bmad.ai', 'BMAD AI Agent', 'ai_agent', true, true),
  ('kevin@magnificentworldwide.com', 'Kevin Gardner', 'closer', true, false)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_lead_started ON calls(lead_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_outcome_started ON calls(outcome, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_metrics_status_created ON partner_metrics(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date_agent ON agent_performance(date DESC, agent_id);

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin ON leads USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_calls_metadata_gin ON calls USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_partner_metrics_metadata_gin ON partner_metrics USING GIN (metadata);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE leads IS 'Stores all leads in the qualification pipeline';
COMMENT ON TABLE calls IS 'Records all voice interactions with leads';
COMMENT ON TABLE users IS 'System users including AI agents and human team members';
COMMENT ON TABLE partner_metrics IS 'Tracks revenue metrics for LEV/AI SaaS model';
COMMENT ON TABLE agent_performance IS 'AI agent learning and performance tracking';
COMMENT ON TABLE conversation_phases IS 'Tracks 12-phase conversation script completion';
COMMENT ON TABLE learning_events IS 'Records AI system learning events';

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(20) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES
  ('1.0.0', 'Initial BMAD v4 schema with leads, calls, metrics, and learning tables')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS (Adjust based on your Neon setup)
-- ============================================================================

-- Example: Grant necessary permissions to your application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================