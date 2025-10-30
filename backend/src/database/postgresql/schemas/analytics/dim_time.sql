-- ============================================================================
-- Dimension Table: dim_time
-- Purpose: Time dimension for temporal analysis
-- Author: Sarah Chen (SIGMA-1) - Database Architect
-- Database: PostgreSQL (Neon)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dim_time (
    time_id SERIAL PRIMARY KEY,
    date_actual DATE NOT NULL UNIQUE,

    -- Date Components
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_name VARCHAR(20) NOT NULL,
    week_of_year INTEGER NOT NULL CHECK (week_of_year BETWEEN 1 AND 53),
    day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    day_of_week_name VARCHAR(20) NOT NULL,
    day_of_year INTEGER NOT NULL CHECK (day_of_year BETWEEN 1 AND 366),

    -- Business Calendar
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    holiday_name VARCHAR(100),

    -- Fiscal Calendar (adjust as needed)
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL CHECK (fiscal_quarter BETWEEN 1 AND 4),
    fiscal_month INTEGER NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),

    -- Relative Periods
    is_current_day BOOLEAN DEFAULT FALSE,
    is_current_week BOOLEAN DEFAULT FALSE,
    is_current_month BOOLEAN DEFAULT FALSE,
    is_current_quarter BOOLEAN DEFAULT FALSE,
    is_current_year BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_dim_time_date ON dim_time(date_actual);
CREATE INDEX idx_dim_time_year_month ON dim_time(year, month);
CREATE INDEX idx_dim_time_year_quarter ON dim_time(year, quarter);
CREATE INDEX idx_dim_time_fiscal ON dim_time(fiscal_year, fiscal_quarter);
CREATE INDEX idx_dim_time_day_of_week ON dim_time(day_of_week);

-- Function to populate time dimension
CREATE OR REPLACE FUNCTION populate_dim_time(
    start_date DATE,
    end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    current_date DATE := start_date;
    rows_inserted INTEGER := 0;
BEGIN
    WHILE current_date <= end_date LOOP
        INSERT INTO dim_time (
            date_actual,
            year,
            quarter,
            month,
            month_name,
            week_of_year,
            day_of_month,
            day_of_week,
            day_of_week_name,
            day_of_year,
            is_weekend,
            fiscal_year,
            fiscal_quarter,
            fiscal_month
        ) VALUES (
            current_date,
            EXTRACT(YEAR FROM current_date)::INTEGER,
            EXTRACT(QUARTER FROM current_date)::INTEGER,
            EXTRACT(MONTH FROM current_date)::INTEGER,
            TO_CHAR(current_date, 'Month'),
            EXTRACT(WEEK FROM current_date)::INTEGER,
            EXTRACT(DAY FROM current_date)::INTEGER,
            EXTRACT(DOW FROM current_date)::INTEGER,
            TO_CHAR(current_date, 'Day'),
            EXTRACT(DOY FROM current_date)::INTEGER,
            EXTRACT(DOW FROM current_date)::INTEGER IN (0, 6),
            -- Fiscal year starts in January (adjust if different)
            EXTRACT(YEAR FROM current_date)::INTEGER,
            EXTRACT(QUARTER FROM current_date)::INTEGER,
            EXTRACT(MONTH FROM current_date)::INTEGER
        ) ON CONFLICT (date_actual) DO NOTHING;

        rows_inserted := rows_inserted + 1;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;

    RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql;

-- Populate time dimension for 2020-2030
SELECT populate_dim_time('2020-01-01'::DATE, '2030-12-31'::DATE);

COMMENT ON TABLE dim_time IS 'Time dimension for temporal analysis and date-based aggregations';
COMMENT ON FUNCTION populate_dim_time IS 'Populates dim_time table with date range';
