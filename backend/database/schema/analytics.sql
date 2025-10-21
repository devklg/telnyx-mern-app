-- BMAD V4 - Analytics PostgreSQL Schema
-- Owner: Sarah Chen (Database Architect)
-- Created: 2025-10-21

CREATE TABLE IF NOT EXISTS analytics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_calls INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  converted_leads INTEGER DEFAULT 0,
  metrics JSONB
  -- TODO: Add more columns
);

CREATE INDEX idx_analytics_date ON analytics_daily(date);
