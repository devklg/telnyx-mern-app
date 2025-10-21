-- BMAD V4 - Conversations PostgreSQL Schema
-- Owner: Sarah Chen (Database Architect)
-- Created: 2025-10-21

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  call_id VARCHAR(100),
  transcript JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- TODO: Add more columns
);

CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
