-- BMAD V4 - Scoring PostgreSQL Schema
-- Owner: Sarah Chen (Database Architect)
-- Created: 2025-10-21

CREATE TABLE IF NOT EXISTS lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  total_score INTEGER,
  behavior_score INTEGER,
  engagement_score INTEGER,
  qualification_score INTEGER,
  demographic_score INTEGER,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- TODO: Add more columns
);

CREATE INDEX idx_scores_lead_id ON lead_scores(lead_id);
