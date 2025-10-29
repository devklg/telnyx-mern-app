CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    telnyx_call_id VARCHAR(255) UNIQUE,
    direction VARCHAR(10),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    status VARCHAR(20),
    duration INTEGER,
    recording_url TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_status ON calls(status);
