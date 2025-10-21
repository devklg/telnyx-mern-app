-- BMAD V4 - Call Events PostgreSQL Schema
-- Owner: Sarah Chen (Database Architect)
-- Created: 2025-10-21

CREATE TABLE IF NOT EXISTS call_events (
  id SERIAL PRIMARY KEY,
  call_id VARCHAR(100),
  event_type VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- TODO: Add more columns
);

CREATE INDEX idx_call_events_call_id ON call_events(call_id);
