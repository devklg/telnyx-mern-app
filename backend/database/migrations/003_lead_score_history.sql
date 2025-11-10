-- Migration: Lead Score History Table
-- Story 3.7: Enhanced Lead Scoring System
-- Purpose: Track lead score changes over time for trend analysis

-- Create lead_score_history table
CREATE TABLE IF NOT EXISTS lead_score_history (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,  -- MongoDB Lead ID
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    factors JSONB NOT NULL,  -- Detailed score breakdown
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_lead_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX idx_lead_score_history_calculated_at ON lead_score_history(calculated_at DESC);
CREATE INDEX idx_lead_score_history_score ON lead_score_history(score DESC);
CREATE INDEX idx_lead_score_history_lead_date ON lead_score_history(lead_id, calculated_at DESC);

-- Create system_config table if it doesn't exist
-- Used to store lead scoring weights and configuration
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_config_key ON system_config(config_key);

-- Insert default lead scoring weights
INSERT INTO system_config (config_key, config_value, description)
VALUES (
    'lead_scoring_weights',
    '{
        "qualification": 0.4,
        "engagement": 0.3,
        "intent": 0.2,
        "demographic": 0.1
    }'::jsonb,
    'Default weights for lead scoring algorithm. Total must sum to 1.0.'
)
ON CONFLICT (config_key) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for system_config table
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to tables and columns
COMMENT ON TABLE lead_score_history IS 'Tracks historical lead scores for trend analysis and performance monitoring';
COMMENT ON COLUMN lead_score_history.lead_id IS 'MongoDB Lead ID reference';
COMMENT ON COLUMN lead_score_history.score IS 'Total lead score (0-100)';
COMMENT ON COLUMN lead_score_history.factors IS 'JSON breakdown of score components: qualification, engagement, intent, demographic';
COMMENT ON COLUMN lead_score_history.calculated_at IS 'When the score was calculated';

COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON COLUMN system_config.config_key IS 'Unique configuration key identifier';
COMMENT ON COLUMN system_config.config_value IS 'JSON configuration value';

-- Sample query to get score trends for a lead
-- SELECT lead_id, score, calculated_at, factors->>'classification' as classification
-- FROM lead_score_history
-- WHERE lead_id = 'YOUR_LEAD_ID'
-- ORDER BY calculated_at DESC
-- LIMIT 10;

-- Sample query to get score distribution
-- SELECT
--     factors->>'classification' as classification,
--     COUNT(*) as count,
--     AVG(score) as avg_score
-- FROM (
--     SELECT DISTINCT ON (lead_id) lead_id, score, factors
--     FROM lead_score_history
--     ORDER BY lead_id, calculated_at DESC
-- ) latest_scores
-- GROUP BY factors->>'classification';