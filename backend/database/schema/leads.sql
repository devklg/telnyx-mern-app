-- BMAD V4 - Leads PostgreSQL Schema
-- Owner: Sarah Chen (Database Architect)
-- Created: 2025-10-21
--
-- TODO: Define complete leads table schema

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  company VARCHAR(255),
  source VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- TODO: Add more columns
);

-- Indexes
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
