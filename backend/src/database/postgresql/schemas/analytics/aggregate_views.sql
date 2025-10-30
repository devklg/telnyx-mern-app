-- ============================================================================
-- Aggregate Views and Reports
-- Purpose: Pre-built aggregate views for common reporting queries
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- ============================================================================

-- ============================================================================
-- Lead Performance Dashboard
-- ============================================================================
CREATE OR REPLACE VIEW vw_lead_performance_dashboard AS
SELECT
    dl.lead_id,
    dl.full_name,
    dl.email,
    dl.phone,
    dl.company_name,
    dl.company_industry,
    dl.status,
    dl.qualification_score,
    dl.qualification_tier,
    dl.bant_score,
    dl.assigned_agent_name,
    dl.campaign_name,

    -- Call Metrics
    COUNT(DISTINCT fc.call_fact_id) as total_calls,
    COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.is_successful) as successful_calls,
    SUM(fc.duration_talking) as total_talk_time_seconds,
    AVG(fc.qualification_score) as avg_call_qualification_score,
    MAX(fc.initiated_at) as last_call_date,

    -- Conversation Metrics
    COUNT(DISTINCT fco.conversation_fact_id) as total_conversations,
    COUNT(DISTINCT fco.conversation_fact_id) FILTER (WHERE fco.was_qualified) as qualified_conversations,
    AVG(fco.qualification_score) as avg_conversation_qualification_score,
    AVG(fco.sentiment_score) as avg_sentiment_score,
    MAX(fco.started_at) as last_conversation_date,

    -- Outcome Metrics
    BOOL_OR(fco.meeting_scheduled) as has_meeting_scheduled,
    MAX(fco.meeting_scheduled_for) as next_meeting_date,
    SUM(fco.deal_value_cents) as total_pipeline_value_cents

FROM dim_leads dl
LEFT JOIN fact_calls fc ON dl.lead_key = fc.lead_key
LEFT JOIN fact_conversations fco ON dl.lead_key = fco.lead_key
WHERE dl.is_current = TRUE
GROUP BY
    dl.lead_id, dl.full_name, dl.email, dl.phone,
    dl.company_name, dl.company_industry, dl.status,
    dl.qualification_score, dl.qualification_tier, dl.bant_score,
    dl.assigned_agent_name, dl.campaign_name;

-- ============================================================================
-- Agent Performance Report
-- ============================================================================
CREATE OR REPLACE VIEW vw_agent_performance AS
SELECT
    dl.assigned_agent_id,
    dl.assigned_agent_name,
    dt.year,
    dt.month,
    dt.month_name,

    -- Lead Metrics
    COUNT(DISTINCT dl.lead_id) as total_leads_assigned,
    COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'qualified') as qualified_leads,
    AVG(dl.qualification_score) as avg_lead_score,

    -- Call Activity
    COUNT(DISTINCT fc.call_fact_id) as total_calls_made,
    COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.is_successful) as successful_calls,
    SUM(fc.duration_talking) / 60.0 as total_talk_time_minutes,
    AVG(fc.duration_talking) as avg_call_duration_seconds,
    COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.was_qualified) as calls_with_qualification,

    -- Quality Metrics
    AVG(fc.mos_score) as avg_call_quality,
    AVG(fc.sentiment_score) as avg_sentiment_score,
    AVG(fc.qualification_score) as avg_qualification_score,

    -- Conversation Metrics
    COUNT(DISTINCT fco.conversation_fact_id) as total_conversations,
    AVG(fco.total_messages) as avg_messages_per_conversation,
    AVG(fco.response_rate) as avg_response_rate,

    -- Outcome Metrics
    COUNT(DISTINCT fco.conversation_fact_id) FILTER (WHERE fco.meeting_scheduled) as meetings_scheduled,
    SUM(fco.deal_value_cents) as total_pipeline_value_cents,

    -- Cost Efficiency
    SUM(fc.call_cost_cents) as total_call_cost_cents,
    CASE
        WHEN COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.was_qualified) > 0
        THEN SUM(fc.call_cost_cents)::DECIMAL / COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.was_qualified)
        ELSE NULL
    END as cost_per_qualification_cents

FROM dim_leads dl
JOIN dim_time dt ON dt.date_actual = CURRENT_DATE
LEFT JOIN fact_calls fc ON dl.lead_key = fc.lead_key AND fc.call_date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN fact_conversations fco ON dl.lead_key = fco.lead_key AND fco.conversation_date >= DATE_TRUNC('month', CURRENT_DATE)
WHERE
    dl.is_current = TRUE
    AND dl.assigned_agent_id IS NOT NULL
GROUP BY
    dl.assigned_agent_id,
    dl.assigned_agent_name,
    dt.year,
    dt.month,
    dt.month_name;

-- ============================================================================
-- Campaign Performance Report
-- ============================================================================
CREATE OR REPLACE VIEW vw_campaign_performance AS
SELECT
    dl.campaign_id,
    dl.campaign_name,

    -- Lead Funnel
    COUNT(DISTINCT dl.lead_id) as total_leads,
    COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'contacted') as contacted_leads,
    COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'qualified') as qualified_leads,
    COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'converted') as converted_leads,

    -- Conversion Rates
    ROUND(100.0 * COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'contacted') / NULLIF(COUNT(DISTINCT dl.lead_id), 0), 2) as contact_rate_percent,
    ROUND(100.0 * COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'qualified') / NULLIF(COUNT(DISTINCT dl.lead_id), 0), 2) as qualification_rate_percent,
    ROUND(100.0 * COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'converted') / NULLIF(COUNT(DISTINCT dl.lead_id), 0), 2) as conversion_rate_percent,

    -- Qualification Scores
    AVG(dl.qualification_score) as avg_qualification_score,
    AVG(dl.qualification_score) FILTER (WHERE dl.status = 'qualified') as avg_qualified_lead_score,

    -- Call Activity
    COUNT(DISTINCT fc.call_fact_id) as total_calls,
    COUNT(DISTINCT fc.call_fact_id) FILTER (WHERE fc.is_successful) as successful_calls,
    AVG(fc.duration_talking) as avg_talk_time_seconds,

    -- Conversation Activity
    COUNT(DISTINCT fco.conversation_fact_id) as total_conversations,
    COUNT(DISTINCT fco.conversation_fact_id) FILTER (WHERE fco.was_qualified) as qualified_conversations,
    AVG(fco.sentiment_score) as avg_sentiment_score,
    SUM(fco.deal_value_cents) as total_pipeline_value_cents,

    -- Cost Analysis
    SUM(fc.call_cost_cents) as total_cost_cents,
    CASE
        WHEN COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'qualified') > 0
        THEN SUM(fc.call_cost_cents)::DECIMAL / COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'qualified')
        ELSE NULL
    END as cost_per_qualified_lead_cents,
    CASE
        WHEN COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'converted') > 0
        THEN SUM(fc.call_cost_cents)::DECIMAL / COUNT(DISTINCT dl.lead_id) FILTER (WHERE dl.status = 'converted')
        ELSE NULL
    END as cost_per_conversion_cents

FROM dim_leads dl
LEFT JOIN fact_calls fc ON dl.lead_key = fc.lead_key
LEFT JOIN fact_conversations fco ON dl.lead_key = fco.lead_key
WHERE
    dl.is_current = TRUE
    AND dl.campaign_id IS NOT NULL
GROUP BY
    dl.campaign_id,
    dl.campaign_name;

-- ============================================================================
-- Call Quality Analysis
-- ============================================================================
CREATE OR REPLACE VIEW vw_call_quality_analysis AS
SELECT
    dt.date_actual,
    dt.day_of_week_name,
    fc.direction,
    fc.answer_state,

    -- Volume Metrics
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE fc.mos_score IS NOT NULL) as calls_with_quality_data,

    -- Quality Metrics
    AVG(fc.mos_score) as avg_mos_score,
    AVG(fc.packet_loss_percent) as avg_packet_loss_percent,
    AVG(fc.jitter_ms) as avg_jitter_ms,
    AVG(fc.latency_ms) as avg_latency_ms,
    AVG(fc.quality_rating) as avg_quality_rating,

    -- Quality Distribution
    COUNT(*) FILTER (WHERE fc.mos_score >= 4.0) as excellent_quality_calls,
    COUNT(*) FILTER (WHERE fc.mos_score >= 3.5 AND fc.mos_score < 4.0) as good_quality_calls,
    COUNT(*) FILTER (WHERE fc.mos_score >= 2.5 AND fc.mos_score < 3.5) as fair_quality_calls,
    COUNT(*) FILTER (WHERE fc.mos_score < 2.5) as poor_quality_calls,

    -- Issue Metrics
    COUNT(*) FILTER (WHERE fc.has_quality_issues) as calls_with_issues,
    ROUND(100.0 * COUNT(*) FILTER (WHERE fc.has_quality_issues) / NULLIF(COUNT(*), 0), 2) as issue_rate_percent

FROM fact_calls fc
JOIN dim_time dt ON fc.time_key = dt.time_id
WHERE fc.call_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY
    dt.date_actual,
    dt.day_of_week_name,
    fc.direction,
    fc.answer_state
ORDER BY dt.date_actual DESC;

-- ============================================================================
-- Sentiment Trend Analysis
-- ============================================================================
CREATE OR REPLACE VIEW vw_sentiment_trends AS
SELECT
    dt.date_actual,
    dt.year,
    dt.month,
    dt.week_of_year,
    fco.channel,

    -- Overall Sentiment Distribution
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE fco.overall_sentiment = 'very-positive') as very_positive_count,
    COUNT(*) FILTER (WHERE fco.overall_sentiment = 'positive') as positive_count,
    COUNT(*) FILTER (WHERE fco.overall_sentiment = 'neutral') as neutral_count,
    COUNT(*) FILTER (WHERE fco.overall_sentiment = 'negative') as negative_count,
    COUNT(*) FILTER (WHERE fco.overall_sentiment = 'very-negative') as very_negative_count,

    -- Sentiment Percentages
    ROUND(100.0 * COUNT(*) FILTER (WHERE fco.sentiment_score > 0.3) / NULLIF(COUNT(*), 0), 2) as positive_percent,
    ROUND(100.0 * COUNT(*) FILTER (WHERE fco.sentiment_score BETWEEN -0.3 AND 0.3) / NULLIF(COUNT(*), 0), 2) as neutral_percent,
    ROUND(100.0 * COUNT(*) FILTER (WHERE fco.sentiment_score < -0.3) / NULLIF(COUNT(*), 0), 2) as negative_percent,

    -- Average Scores
    AVG(fco.sentiment_score) as avg_sentiment_score,
    AVG(fco.qualification_score) as avg_qualification_score,

    -- Trend Indicators
    AVG(fco.sentiment_score) - LAG(AVG(fco.sentiment_score)) OVER (
        PARTITION BY fco.channel
        ORDER BY dt.date_actual
    ) as sentiment_change_from_previous_day

FROM fact_conversations fco
JOIN dim_time dt ON fco.time_key = dt.time_id
WHERE fco.conversation_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY
    dt.date_actual,
    dt.year,
    dt.month,
    dt.week_of_year,
    fco.channel
ORDER BY dt.date_actual DESC, fco.channel;

-- ============================================================================
-- Top Performing Leads (High-Value Pipeline)
-- ============================================================================
CREATE OR REPLACE VIEW vw_top_performing_leads AS
SELECT
    dl.lead_id,
    dl.full_name,
    dl.email,
    dl.phone,
    dl.company_name,
    dl.company_industry,
    dl.status,
    dl.qualification_score,
    dl.qualification_tier,
    dl.bant_score,

    -- Engagement Metrics
    COUNT(DISTINCT fco.conversation_fact_id) as conversation_count,
    MAX(fco.started_at) as last_conversation_date,
    AVG(fco.sentiment_score) as avg_sentiment,
    MAX(fco.qualification_score) as max_qualification_score,

    -- Pipeline Value
    SUM(fco.deal_value_cents) as total_pipeline_value_cents,
    MAX(fco.bant_completeness) as bant_completeness,

    -- Signals
    SUM(fco.buying_signals_count) as total_buying_signals,
    SUM(fco.pain_points_count) as total_pain_points,
    SUM(fco.objections_count) as total_objections,

    -- Next Actions
    BOOL_OR(fco.needs_follow_up) as needs_follow_up,
    BOOL_OR(fco.meeting_scheduled) as has_meeting_scheduled,
    MAX(fco.meeting_scheduled_for) as next_meeting_date

FROM dim_leads dl
JOIN fact_conversations fco ON dl.lead_key = fco.lead_key
WHERE
    dl.is_current = TRUE
    AND dl.status IN ('qualified', 'nurturing')
    AND fco.conversation_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY
    dl.lead_id, dl.full_name, dl.email, dl.phone,
    dl.company_name, dl.company_industry, dl.status,
    dl.qualification_score, dl.qualification_tier, dl.bant_score
HAVING
    SUM(fco.deal_value_cents) > 0
    OR MAX(fco.qualification_score) >= 70
ORDER BY
    SUM(fco.deal_value_cents) DESC NULLS LAST,
    MAX(fco.qualification_score) DESC
LIMIT 100;

COMMENT ON VIEW vw_lead_performance_dashboard IS 'Lead performance dashboard with call and conversation metrics';
COMMENT ON VIEW vw_agent_performance IS 'Agent performance metrics for current month';
COMMENT ON VIEW vw_campaign_performance IS 'Campaign-level performance and ROI metrics';
COMMENT ON VIEW vw_call_quality_analysis IS 'Call quality analysis for last 30 days';
COMMENT ON VIEW vw_sentiment_trends IS 'Sentiment trend analysis across channels for last 90 days';
COMMENT ON VIEW vw_top_performing_leads IS 'Top 100 high-value leads in pipeline';
