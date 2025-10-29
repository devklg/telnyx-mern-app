CREATE TABLE IF NOT EXISTS qualifications (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    call_id INTEGER REFERENCES calls(id),
    is_qualified BOOLEAN,
    qualification_data JSONB,
    agent_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_qualifications_lead_id ON qualifications(lead_id);
