-- ============================================================================
-- Seed Data: 002_epic3_seed_data.sql
-- Epic: Epic 3 - AI-Powered CRM & Relationship Intelligence
-- Purpose: Sample data for testing and development
-- ============================================================================

-- NOTE: This seed data is for DEVELOPMENT/TESTING ONLY
-- Do NOT run in production environment

-- ============================================================================
-- Test Users and Organizations (if not already seeded)
-- ============================================================================

-- Create test organization
INSERT INTO organizations (id, name, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Organization', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test users (assuming users table exists)
-- INSERT INTO users (id, username, email, password_hash, role, organization_id, created_at)
-- VALUES
--     ('10000000-0000-0000-0000-000000000001'::uuid, 'partner1', 'partner1@test.com', '$2b$10$hash', 'partner', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
--     ('10000000-0000-0000-0000-000000000002'::uuid, 'partner2', 'partner2@test.com', '$2b$10$hash', 'partner', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
--     ('10000000-0000-0000-0000-000000000003'::uuid, 'admin1', 'admin@test.com', '$2b$10$hash', 'admin', '00000000-0000-0000-0000-000000000001'::uuid, NOW())
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Sample Leads
-- ============================================================================

INSERT INTO leads (
    id, user_id, organization_id, tenant_id,
    first_name, last_name, phone_number, email,
    city, state, zip, country, time_zone,
    status, lead_score, source, sub_source, tags, notes,
    last_contact_date, interaction_count,
    created_at
) VALUES
-- Hot Leads
(
    '20000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'John', 'Smith', '+12125551001', 'john.smith@email.com',
    'New York', 'NY', '10001', 'US', 'America/New_York',
    'hot', 85, 'referral', 'kevin_direct', ARRAY['hot', 'referral', 'executive'],
    'Highly interested in opportunity. Asked detailed questions about compensation.',
    NOW() - INTERVAL '1 day', 5,
    NOW() - INTERVAL '14 days'
),
(
    '20000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Sarah', 'Johnson', '+13105552002', 'sarah.j@email.com',
    'Los Angeles', 'CA', '90001', 'US', 'America/Los_Angeles',
    'hot', 78, 'facebook_ads', 'campaign_jan_2024', ARRAY['hot', 'facebook', 'young_professional'],
    'Responded to Facebook ad. Very enthusiastic about passive income.',
    NOW() - INTERVAL '2 days', 3,
    NOW() - INTERVAL '7 days'
),

-- Qualified Leads
(
    '20000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Michael', 'Davis', '+14155553003', 'mdavis@email.com',
    'San Francisco', 'CA', '94102', 'US', 'America/Los_Angeles',
    'qualified', 65, 'event', 'la_expo_2024', ARRAY['qualified', 'event', 'needs_followup'],
    'Met at LA Expo. Interested but wants to discuss with spouse.',
    NOW() - INTERVAL '5 days', 2,
    NOW() - INTERVAL '21 days'
),
(
    '20000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Emily', 'Wilson', '+13125554004', 'ewilson@email.com',
    'Chicago', 'IL', '60601', 'US', 'America/Chicago',
    'qualified', 70, 'linkedin', NULL, ARRAY['qualified', 'linkedin', 'professional'],
    'LinkedIn connection. Works in sales, good fit for recruiting.',
    NOW() - INTERVAL '3 days', 4,
    NOW() - INTERVAL '10 days'
),

-- Nurturing Leads
(
    '20000000-0000-0000-0000-000000000005'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'David', 'Brown', '+16175555005', 'dbrown@email.com',
    'Boston', 'MA', '02101', 'US', 'America/New_York',
    'nurturing', 55, 'website', NULL, ARRAY['nurturing', 'website', 'warm'],
    'Signed up on website. Opened email twice but no reply yet.',
    NOW() - INTERVAL '7 days', 1,
    NOW() - INTERVAL '30 days'
),
(
    '20000000-0000-0000-0000-000000000006'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Jessica', 'Martinez', '+17135556006', 'jmartinez@email.com',
    'Houston', 'TX', '77001', 'US', 'America/Chicago',
    'nurturing', 48, 'facebook_ads', 'campaign_dec_2023', ARRAY['nurturing', 'facebook'],
    'Initial interest but objection on time commitment. Following up.',
    NOW() - INTERVAL '14 days', 2,
    NOW() - INTERVAL '45 days'
),

-- New/Contacted Leads
(
    '20000000-0000-0000-0000-000000000007'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Robert', 'Anderson', '+14805557007', 'randerson@email.com',
    'Phoenix', 'AZ', '85001', 'US', 'America/Phoenix',
    'contacted', 40, 'purchased_list', 'vendor_a', ARRAY['contacted', 'cold_lead'],
    'First call made. No answer, left voicemail.',
    NOW() - INTERVAL '1 day', 1,
    NOW() - INTERVAL '2 days'
),
(
    '20000000-0000-0000-0000-000000000008'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Amanda', 'Thomas', '+13035558008', 'athomas@email.com',
    'Denver', 'CO', '80201', 'US', 'America/Denver',
    'new', 0, 'referral', 'partner_network', ARRAY['new', 'referral'],
    'Referred by existing partner. Not yet contacted.',
    NULL, 0,
    NOW() - INTERVAL '1 day'
),

-- Cold Lead
(
    '20000000-0000-0000-0000-000000000009'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Christopher', 'Moore', '+15035559009', 'cmoore@email.com',
    'Portland', 'OR', '97201', 'US', 'America/Los_Angeles',
    'cold', 15, 'facebook_ads', 'campaign_nov_2023', ARRAY['cold', 'facebook'],
    'Multiple follow-ups, no response. Moved to cold.',
    NOW() - INTERVAL '60 days', 5,
    NOW() - INTERVAL '90 days'
),

-- DNC Lead
(
    '20000000-0000-0000-0000-000000000010'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Jennifer', 'Taylor', '+12065550010', 'jtaylor@email.com',
    'Seattle', 'WA', '98101', 'US', 'America/Los_Angeles',
    'dnc', 0, 'cold_outreach', NULL, ARRAY['dnc'],
    'Requested to be removed from call list.',
    NOW() - INTERVAL '30 days', 1,
    NOW() - INTERVAL '35 days'
);

-- ============================================================================
-- DNC List Entries
-- ============================================================================

INSERT INTO dnc_list (
    id, phone_number, organization_id, added_by_user_id,
    reason, source, detected_phrase, notes, added_at
) VALUES
(
    '30000000-0000-0000-0000-000000000001'::uuid,
    '+12065550010',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'lead_requested', 'call_transcript',
    'please remove me from your list',
    'AI detected opt-out during call',
    NOW() - INTERVAL '30 days'
),
(
    '30000000-0000-0000-0000-000000000002'::uuid,
    '+18005550011',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    'admin_added', 'manual_entry',
    NULL,
    'Competitor number, do not call',
    NOW() - INTERVAL '60 days'
);

-- ============================================================================
-- Lead Status History (Sample Transitions)
-- ============================================================================

INSERT INTO lead_status_history (
    id, lead_id, from_status, to_status,
    changed_by_user_id, trigger_type, reason, changed_at
) VALUES
-- John Smith progression (Hot Lead)
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    NULL, 'new',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'manual', 'Initial lead creation',
    NOW() - INTERVAL '14 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'new', 'contacted',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'call', 'First call completed',
    NOW() - INTERVAL '13 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'contacted', 'qualified',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'call', 'High qualification score (8/10)',
    NOW() - INTERVAL '10 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'qualified', 'hot',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'ai_recommendation', 'Strong buy signals detected',
    NOW() - INTERVAL '5 days'
),

-- Sarah Johnson progression
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000002'::uuid,
    NULL, 'new',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'automation', 'Facebook lead import',
    NOW() - INTERVAL '7 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000002'::uuid,
    'new', 'contacted',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'call', 'AI call completed',
    NOW() - INTERVAL '6 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000002'::uuid,
    'contacted', 'hot',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'call', 'Extremely positive response',
    NOW() - INTERVAL '4 days'
);

-- ============================================================================
-- Lead Source Costs (ROI Tracking)
-- ============================================================================

INSERT INTO lead_source_costs (
    id, user_id, organization_id, source, sub_source,
    period, cost_usd, notes, created_at
) VALUES
-- Facebook Ads - January 2024
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'facebook_ads', 'campaign_jan_2024',
    '2024-01', 500.00,
    'Facebook lead generation campaign',
    NOW()
),
-- Event - LA Expo
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'event', 'la_expo_2024',
    '2024-01', 1200.00,
    'Booth and materials at LA Business Expo',
    NOW()
),
-- Purchased List
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'purchased_list', 'vendor_a',
    '2024-01', 150.00,
    'Lead list purchase from Vendor A',
    NOW()
);

-- ============================================================================
-- Nurture Sequences
-- ============================================================================

INSERT INTO nurture_sequences (
    id, created_by_user_id, organization_id,
    name, description, steps, active, created_at
) VALUES
-- Welcome Sequence
(
    '40000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'New Lead Welcome Sequence',
    'Automated welcome sequence for new leads with 3 touchpoints',
    '[
        {
            "step": 1,
            "delay_days": 0,
            "channel": "sms",
            "template_id": "welcome_sms",
            "message": "Hi {{first_name}}! Thanks for your interest in building wealth. I''m {{partner_name}} and I''m excited to share this opportunity with you.",
            "conditions": {}
        },
        {
            "step": 2,
            "delay_days": 2,
            "channel": "email",
            "template_id": "value_email_1",
            "subject": "The 5 Income Streams You Should Know",
            "conditions": {}
        },
        {
            "step": 3,
            "delay_days": 5,
            "channel": "sms",
            "template_id": "followup_sms",
            "message": "{{first_name}}, quick question - what''s your biggest financial goal right now?",
            "conditions": {}
        },
        {
            "step": 4,
            "delay_days": 7,
            "channel": "call",
            "template_id": "ai_followup_call",
            "conditions": {}
        }
    ]'::jsonb,
    true,
    NOW()
),

-- Re-engagement Sequence
(
    '40000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Cold Lead Re-engagement',
    'Re-activate cold leads with new value proposition',
    '[
        {
            "step": 1,
            "delay_days": 0,
            "channel": "email",
            "template_id": "reengagement_email",
            "subject": "{{first_name}}, we''ve added something NEW...",
            "conditions": {}
        },
        {
            "step": 2,
            "delay_days": 3,
            "channel": "sms",
            "template_id": "reengagement_sms",
            "message": "Hey {{first_name}}, saw some updates that might interest you. 2 min to chat?",
            "conditions": {}
        }
    ]'::jsonb,
    true,
    NOW()
);

-- ============================================================================
-- Lead Sequence Enrollments
-- ============================================================================

INSERT INTO lead_sequence_enrollments (
    id, lead_id, sequence_id, current_step, status,
    enrolled_by_user_id, enrolled_at, next_step_scheduled_at,
    executed_steps
) VALUES
-- Sarah Johnson in Welcome Sequence (Active)
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    2, 'active',
    '10000000-0000-0000-0000-000000000001'::uuid,
    NOW() - INTERVAL '6 days',
    NOW() + INTERVAL '1 day',
    '[
        {
            "step": 1,
            "executed_at": "2024-01-01T10:00:00Z",
            "status": "delivered",
            "channel": "sms"
        }
    ]'::jsonb
),

-- David Brown in Welcome Sequence (Paused - replied to SMS)
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    3, 'paused',
    '10000000-0000-0000-0000-000000000001'::uuid,
    NOW() - INTERVAL '30 days',
    NULL,
    '[
        {
            "step": 1,
            "executed_at": "2024-01-01T10:00:00Z",
            "status": "delivered",
            "channel": "sms"
        },
        {
            "step": 2,
            "executed_at": "2024-01-03T10:00:00Z",
            "status": "opened",
            "channel": "email"
        }
    ]'::jsonb
);

-- ============================================================================
-- Segments (Saved Filters)
-- ============================================================================

INSERT INTO segments (
    id, user_id, organization_id, name, description,
    filter, is_public, lead_count, last_calculated_at, created_at
) VALUES
-- Hot Leads Segment
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Hot Leads Ready to Close',
    'Leads with score >70 and status hot or qualified',
    '{
        "status": ["hot", "qualified"],
        "lead_score": {"gte": 70},
        "tags": {"contains_any": ["hot"]}
    }'::jsonb,
    false, 2, NOW(), NOW()
),

-- Facebook Leads Needing Follow-up
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Facebook Leads - Follow Up Required',
    'Facebook leads contacted but not yet qualified',
    '{
        "source": "facebook_ads",
        "status": ["contacted", "nurturing"],
        "last_contact": {"gte": "2024-01-01"}
    }'::jsonb,
    false, 1, NOW(), NOW()
);

-- ============================================================================
-- Budget Transactions (Sample)
-- ============================================================================

INSERT INTO budget_transactions (
    id, user_id, organization_id,
    transaction_type, amount_usd, balance_before_usd, balance_after_usd,
    description, reference_type, created_at
) VALUES
-- Initial Top-up
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'credit', 100.00, 0.00, 100.00,
    'Initial budget top-up',
    'top_up',
    NOW() - INTERVAL '30 days'
),

-- Call Debit
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'debit', -0.75, 100.00, 99.25,
    'AI call to John Smith (5 min)',
    'call',
    NOW() - INTERVAL '14 days'
),

-- SMS Debit
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'debit', -0.02, 99.25, 99.23,
    'Welcome SMS to Sarah Johnson',
    'sms',
    NOW() - INTERVAL '6 days'
);

-- ============================================================================
-- Lead Assignments (Distribution History)
-- ============================================================================

INSERT INTO lead_assignments (
    id, lead_id, from_user_id, to_user_id, assigned_by_user_id,
    strategy, reason, assigned_at
) VALUES
-- Initial assignment
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000004'::uuid,
    NULL,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    'round_robin',
    'Automatic distribution to Partner 2',
    NOW() - INTERVAL '10 days'
),

-- Reassignment
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    'manual',
    'Reassigned to Partner 1 due to geographic fit',
    NOW() - INTERVAL '20 days'
);

-- ============================================================================
-- Lead Score History (Sample)
-- ============================================================================

INSERT INTO lead_score_history (
    id, lead_id, score, factors, calculated_at
) VALUES
-- John Smith score progression
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    40,
    '{
        "qualification": 20,
        "engagement": 10,
        "intent": 5,
        "demographic": 5,
        "total": 40
    }'::jsonb,
    NOW() - INTERVAL '13 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    70,
    '{
        "qualification": 35,
        "engagement": 20,
        "intent": 10,
        "demographic": 5,
        "total": 70
    }'::jsonb,
    NOW() - INTERVAL '10 days'
),
(
    gen_random_uuid(),
    '20000000-0000-0000-0000-000000000001'::uuid,
    85,
    '{
        "qualification": 40,
        "engagement": 25,
        "intent": 15,
        "demographic": 5,
        "total": 85
    }'::jsonb,
    NOW() - INTERVAL '5 days'
);

-- ============================================================================
-- System Config (Default Settings)
-- ============================================================================

INSERT INTO system_config (
    id, organization_id, config_key, config_value, updated_at
) VALUES
-- Lead Scoring Weights
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'lead_scoring_weights',
    '{
        "qualification_weight": 0.40,
        "engagement_weight": 0.30,
        "intent_weight": 0.20,
        "demographic_weight": 0.10
    }'::jsonb,
    NOW()
),

-- Lead Limits
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'lead_limits',
    '{
        "max_leads_per_partner": 100,
        "max_active_leads_per_partner": 50,
        "max_imports_per_day": 5
    }'::jsonb,
    NOW()
),

-- Nurture Settings
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'nurture_settings',
    '{
        "max_sms_per_day": 100,
        "max_emails_per_day": 100,
        "auto_pause_on_reply": true,
        "respect_dnc": true
    }'::jsonb,
    NOW()
);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    lead_count INTEGER;
    dnc_count INTEGER;
    sequence_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO lead_count FROM leads WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO dnc_count FROM dnc_list;
    SELECT COUNT(*) INTO sequence_count FROM nurture_sequences;

    RAISE NOTICE 'Seed Data Complete:';
    RAISE NOTICE '  - % leads created', lead_count;
    RAISE NOTICE '  - % DNC entries', dnc_count;
    RAISE NOTICE '  - % nurture sequences', sequence_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Test Users:';
    RAISE NOTICE '  - Partner 1: 10000000-0000-0000-0000-000000000001';
    RAISE NOTICE '  - Partner 2: 10000000-0000-0000-0000-000000000002';
    RAISE NOTICE '  - Admin: 10000000-0000-0000-0000-000000000003';
END $$;