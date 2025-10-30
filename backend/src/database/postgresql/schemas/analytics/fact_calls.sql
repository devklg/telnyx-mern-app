-- ============================================================================
-- Fact Table: fact_calls
-- Purpose: Call fact table for call analytics and reporting
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- Grain: One row per call
-- ============================================================================

CREATE TABLE IF NOT EXISTS fact_calls (
    call_fact_id BIGSERIAL PRIMARY KEY,

    -- Foreign Keys to Dimensions
    lead_key INTEGER NOT NULL REFERENCES dim_leads(lead_key),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_id),
    call_date DATE NOT NULL,

    -- Business Keys
    call_id VARCHAR(50) NOT NULL UNIQUE,
    call_log_id VARCHAR(50),
    conversation_id VARCHAR(50),
    telnyx_call_control_id VARCHAR(100),

    -- Call Attributes
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    call_type VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    answer_state VARCHAR(20), -- human, machine, voicemail, no-answer
    hangup_cause VARCHAR(50),

    -- Phone Numbers
    from_number VARCHAR(20),
    to_number VARCHAR(20),

    -- Duration Metrics (in seconds)
    duration_total INTEGER DEFAULT 0,
    duration_ringing INTEGER DEFAULT 0,
    duration_talking INTEGER DEFAULT 0,
    duration_hold INTEGER DEFAULT 0,

    -- Call Quality Metrics
    mos_score DECIMAL(3, 2), -- Mean Opinion Score (1.0-5.0)
    packet_loss_percent DECIMAL(5, 2),
    jitter_ms INTEGER,
    latency_ms INTEGER,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    has_quality_issues BOOLEAN DEFAULT FALSE,

    -- Speech Analytics
    agent_talk_time_seconds INTEGER DEFAULT 0,
    lead_talk_time_seconds INTEGER DEFAULT 0,
    talk_ratio DECIMAL(5, 2), -- agent/lead talk time ratio
    silence_duration_seconds INTEGER DEFAULT 0,
    interruption_count INTEGER DEFAULT 0,
    agent_speaking_rate_wpm INTEGER, -- words per minute
    lead_speaking_rate_wpm INTEGER,

    -- AI Analysis
    sentiment VARCHAR(20), -- positive, neutral, negative, mixed
    sentiment_score DECIMAL(3, 2), -- -1 to 1
    qualification_score INTEGER CHECK (qualification_score BETWEEN 0 AND 100),
    keywords TEXT[], -- Array of detected keywords
    intents TEXT[], -- Array of detected intents
    topics TEXT[], -- Array of discussed topics

    -- Qualification Signals
    has_buying_signals BOOLEAN DEFAULT FALSE,
    has_objections BOOLEAN DEFAULT FALSE,
    objection_count INTEGER DEFAULT 0,
    pain_points_identified INTEGER DEFAULT 0,

    -- Outcome
    outcome_result VARCHAR(50),
    was_qualified BOOLEAN DEFAULT FALSE,
    appointment_scheduled BOOLEAN DEFAULT FALSE,
    callback_requested BOOLEAN DEFAULT FALSE,
    transfer_occurred BOOLEAN DEFAULT FALSE,

    -- Recording
    recording_available BOOLEAN DEFAULT FALSE,
    recording_duration_seconds INTEGER,
    transcription_available BOOLEAN DEFAULT FALSE,
    transcription_confidence DECIMAL(5, 2),

    -- Cost
    call_cost_cents INTEGER DEFAULT 0,
    billing_duration_minutes DECIMAL(10, 2),

    -- Flags
    is_successful BOOLEAN DEFAULT FALSE, -- answered by human, 30+ seconds
    needs_review BOOLEAN DEFAULT FALSE,
    compliance_reviewed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    initiated_at TIMESTAMP NOT NULL,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fact_calls_lead_key ON fact_calls(lead_key);
CREATE INDEX idx_fact_calls_time_key ON fact_calls(time_key);
CREATE INDEX idx_fact_calls_call_date ON fact_calls(call_date);
CREATE INDEX idx_fact_calls_direction ON fact_calls(direction);
CREATE INDEX idx_fact_calls_status ON fact_calls(status);
CREATE INDEX idx_fact_calls_answer_state ON fact_calls(answer_state);
CREATE INDEX idx_fact_calls_outcome ON fact_calls(outcome_result);
CREATE INDEX idx_fact_calls_initiated_at ON fact_calls(initiated_at DESC);
CREATE INDEX idx_fact_calls_is_successful ON fact_calls(is_successful);
CREATE INDEX idx_fact_calls_was_qualified ON fact_calls(was_qualified);
CREATE INDEX idx_fact_calls_sentiment ON fact_calls(sentiment);
CREATE INDEX idx_fact_calls_qualification_score ON fact_calls(qualification_score DESC);

-- Composite indexes for common queries
CREATE INDEX idx_fact_calls_lead_date ON fact_calls(lead_key, call_date);
CREATE INDEX idx_fact_calls_date_direction ON fact_calls(call_date, direction);
CREATE INDEX idx_fact_calls_date_outcome ON fact_calls(call_date, outcome_result);

-- Partitioning by date (optional, for large datasets)
-- ALTER TABLE fact_calls PARTITION BY RANGE (call_date);

-- Materialized view for call summary statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_call_summary_daily AS
SELECT
    fc.call_date,
    dt.year,
    dt.month,
    dt.day_of_week_name,
    fc.direction,
    fc.answer_state,
    fc.outcome_result,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE fc.is_successful) as successful_calls,
    COUNT(*) FILTER (WHERE fc.was_qualified) as qualified_calls,
    COUNT(*) FILTER (WHERE fc.appointment_scheduled) as appointments_set,
    AVG(fc.duration_talking) as avg_talk_time_seconds,
    AVG(fc.qualification_score) as avg_qualification_score,
    AVG(fc.mos_score) as avg_quality_score,
    SUM(fc.call_cost_cents) as total_cost_cents,
    AVG(fc.sentiment_score) as avg_sentiment_score
FROM fact_calls fc
JOIN dim_time dt ON fc.time_key = dt.time_id
GROUP BY
    fc.call_date,
    dt.year,
    dt.month,
    dt.day_of_week_name,
    fc.direction,
    fc.answer_state,
    fc.outcome_result;

CREATE UNIQUE INDEX idx_mv_call_summary_daily_unique
ON mv_call_summary_daily(call_date, direction, answer_state, outcome_result);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_call_summary_daily()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_call_summary_daily;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-call-summary', '0 1 * * *', 'SELECT refresh_call_summary_daily()');

COMMENT ON TABLE fact_calls IS 'Fact table storing call metrics and measurements for analytics';
COMMENT ON MATERIALIZED VIEW mv_call_summary_daily IS 'Daily aggregated call statistics for fast reporting';
COMMENT ON FUNCTION refresh_call_summary_daily IS 'Refreshes the daily call summary materialized view';
