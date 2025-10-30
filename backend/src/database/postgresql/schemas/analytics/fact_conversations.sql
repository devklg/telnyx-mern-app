-- ============================================================================
-- Fact Table: fact_conversations
-- Purpose: Conversation fact table for multi-channel conversation analytics
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- Grain: One row per conversation
-- ============================================================================

CREATE TABLE IF NOT EXISTS fact_conversations (
    conversation_fact_id BIGSERIAL PRIMARY KEY,

    -- Foreign Keys to Dimensions
    lead_key INTEGER NOT NULL REFERENCES dim_leads(lead_key),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_id),
    conversation_date DATE NOT NULL,

    -- Business Keys
    conversation_id VARCHAR(50) NOT NULL UNIQUE,
    call_id VARCHAR(50), -- NULL for non-phone conversations

    -- Conversation Attributes
    channel VARCHAR(20) NOT NULL, -- phone, email, sms, chat, video, social
    sub_channel VARCHAR(50),
    status VARCHAR(20) NOT NULL,

    -- Timing
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,

    -- Message Metrics
    total_messages INTEGER DEFAULT 0,
    agent_messages INTEGER DEFAULT 0,
    lead_messages INTEGER DEFAULT 0,
    ai_messages INTEGER DEFAULT 0,
    system_messages INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER,

    -- Engagement Metrics
    engagement_level VARCHAR(20), -- very-high, high, moderate, low, very-low
    response_rate DECIMAL(5, 2), -- Percentage
    participant_count INTEGER DEFAULT 0,

    -- Sentiment Analysis
    overall_sentiment VARCHAR(20), -- positive, neutral, negative, mixed
    sentiment_score DECIMAL(3, 2), -- -1 to 1
    sentiment_trend VARCHAR(20), -- improving, stable, declining
    positive_message_count INTEGER DEFAULT 0,
    neutral_message_count INTEGER DEFAULT 0,
    negative_message_count INTEGER DEFAULT 0,

    -- AI Qualification Analysis
    qualification_score INTEGER CHECK (qualification_score BETWEEN 0 AND 100),

    -- BANT Detection
    budget_detected BOOLEAN DEFAULT FALSE,
    budget_score INTEGER DEFAULT 0,
    authority_detected BOOLEAN DEFAULT FALSE,
    authority_score INTEGER DEFAULT 0,
    need_detected BOOLEAN DEFAULT FALSE,
    need_score INTEGER DEFAULT 0,
    timeline_detected BOOLEAN DEFAULT FALSE,
    timeline_score INTEGER DEFAULT 0,
    bant_completeness INTEGER GENERATED ALWAYS AS (
        (CASE WHEN budget_detected THEN 25 ELSE 0 END) +
        (CASE WHEN authority_detected THEN 25 ELSE 0 END) +
        (CASE WHEN need_detected THEN 25 ELSE 0 END) +
        (CASE WHEN timeline_detected THEN 25 ELSE 0 END)
    ) STORED,

    -- Topics and Keywords
    main_topics TEXT[],
    keywords TEXT[],
    mentioned_products TEXT[],
    competitors_mentioned TEXT[],

    -- Behavioral Signals
    buying_signals_count INTEGER DEFAULT 0,
    pain_points_count INTEGER DEFAULT 0,
    objections_count INTEGER DEFAULT 0,
    interests_count INTEGER DEFAULT 0,

    -- Quality Metrics
    completeness_score INTEGER CHECK (completeness_score BETWEEN 0 AND 100),
    transcript_quality_score INTEGER CHECK (transcript_quality_score BETWEEN 0 AND 100),
    ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

    -- Outcome
    outcome_result VARCHAR(50),
    was_qualified BOOLEAN DEFAULT FALSE,
    not_interested BOOLEAN DEFAULT FALSE,
    needs_follow_up BOOLEAN DEFAULT FALSE,
    callback_requested BOOLEAN DEFAULT FALSE,
    meeting_scheduled BOOLEAN DEFAULT FALSE,
    meeting_scheduled_for TIMESTAMP,
    deal_value_cents INTEGER,

    -- Recording and Compliance
    recording_available BOOLEAN DEFAULT FALSE,
    recording_consent_given BOOLEAN DEFAULT FALSE,
    transcription_available BOOLEAN DEFAULT FALSE,
    summary_generated BOOLEAN DEFAULT FALSE,

    -- Review
    review_required BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP,

    -- Escalation
    escalation_recommended BOOLEAN DEFAULT FALSE,
    was_escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,

    -- Vector Embedding (for semantic search integration)
    embedding_generated BOOLEAN DEFAULT FALSE,
    chroma_doc_id VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fact_conversations_lead_key ON fact_conversations(lead_key);
CREATE INDEX idx_fact_conversations_time_key ON fact_conversations(time_key);
CREATE INDEX idx_fact_conversations_conversation_date ON fact_conversations(conversation_date);
CREATE INDEX idx_fact_conversations_channel ON fact_conversations(channel);
CREATE INDEX idx_fact_conversations_status ON fact_conversations(status);
CREATE INDEX idx_fact_conversations_started_at ON fact_conversations(started_at DESC);
CREATE INDEX idx_fact_conversations_was_qualified ON fact_conversations(was_qualified);
CREATE INDEX idx_fact_conversations_outcome ON fact_conversations(outcome_result);
CREATE INDEX idx_fact_conversations_qualification_score ON fact_conversations(qualification_score DESC);
CREATE INDEX idx_fact_conversations_sentiment ON fact_conversations(overall_sentiment);
CREATE INDEX idx_fact_conversations_bant_completeness ON fact_conversations(bant_completeness DESC);
CREATE INDEX idx_fact_conversations_review_required ON fact_conversations(review_required) WHERE review_required = TRUE;

-- Composite indexes for common queries
CREATE INDEX idx_fact_conversations_lead_date ON fact_conversations(lead_key, conversation_date);
CREATE INDEX idx_fact_conversations_date_channel ON fact_conversations(conversation_date, channel);
CREATE INDEX idx_fact_conversations_date_outcome ON fact_conversations(conversation_date, outcome_result);

-- Materialized view for conversation summary statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_conversation_summary_daily AS
SELECT
    fc.conversation_date,
    dt.year,
    dt.month,
    dt.day_of_week_name,
    fc.channel,
    fc.overall_sentiment,
    fc.outcome_result,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE fc.was_qualified) as qualified_conversations,
    COUNT(*) FILTER (WHERE fc.meeting_scheduled) as meetings_scheduled,
    COUNT(*) FILTER (WHERE fc.needs_follow_up) as needs_follow_up,
    AVG(fc.duration_seconds) as avg_duration_seconds,
    AVG(fc.total_messages) as avg_messages,
    AVG(fc.qualification_score) as avg_qualification_score,
    AVG(fc.sentiment_score) as avg_sentiment_score,
    AVG(fc.bant_completeness) as avg_bant_completeness,
    SUM(fc.buying_signals_count) as total_buying_signals,
    SUM(fc.objections_count) as total_objections,
    SUM(fc.deal_value_cents) as total_deal_value_cents
FROM fact_conversations fc
JOIN dim_time dt ON fc.time_key = dt.time_id
GROUP BY
    fc.conversation_date,
    dt.year,
    dt.month,
    dt.day_of_week_name,
    fc.channel,
    fc.overall_sentiment,
    fc.outcome_result;

CREATE UNIQUE INDEX idx_mv_conversation_summary_daily_unique
ON mv_conversation_summary_daily(conversation_date, channel, overall_sentiment, outcome_result);

-- Materialized view for BANT analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bant_analysis AS
SELECT
    dl.lead_id,
    dl.full_name,
    dl.company_name,
    dl.qualification_score as lead_qualification_score,
    COUNT(*) as total_conversations,
    SUM(CASE WHEN fc.budget_detected THEN 1 ELSE 0 END) as conversations_with_budget,
    SUM(CASE WHEN fc.authority_detected THEN 1 ELSE 0 END) as conversations_with_authority,
    SUM(CASE WHEN fc.need_detected THEN 1 ELSE 0 END) as conversations_with_need,
    SUM(CASE WHEN fc.timeline_detected THEN 1 ELSE 0 END) as conversations_with_timeline,
    AVG(fc.budget_score) as avg_budget_score,
    AVG(fc.authority_score) as avg_authority_score,
    AVG(fc.need_score) as avg_need_score,
    AVG(fc.timeline_score) as avg_timeline_score,
    MAX(fc.bant_completeness) as max_bant_completeness,
    AVG(fc.qualification_score) as avg_conversation_qualification_score,
    MAX(fc.started_at) as last_conversation_date
FROM fact_conversations fc
JOIN dim_leads dl ON fc.lead_key = dl.lead_key
WHERE dl.is_current = TRUE
GROUP BY
    dl.lead_id,
    dl.full_name,
    dl.company_name,
    dl.qualification_score;

CREATE UNIQUE INDEX idx_mv_bant_analysis_unique ON mv_bant_analysis(lead_id);

-- Function to refresh conversation materialized views
CREATE OR REPLACE FUNCTION refresh_conversation_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversation_summary_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_bant_analysis;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE fact_conversations IS 'Fact table storing multi-channel conversation metrics for analytics';
COMMENT ON MATERIALIZED VIEW mv_conversation_summary_daily IS 'Daily aggregated conversation statistics';
COMMENT ON MATERIALIZED VIEW mv_bant_analysis IS 'BANT qualification analysis per lead';
COMMENT ON FUNCTION refresh_conversation_views IS 'Refreshes all conversation-related materialized views';
