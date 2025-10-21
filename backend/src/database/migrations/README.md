# PostgreSQL Migrations

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Version-controlled PostgreSQL schema changes

## 📋 Sprint 1 Migrations to Create

### Priority Migrations:

1. **001_create_qualification_scores.sql**
   ```sql
   CREATE TABLE qualification_scores (
     id SERIAL PRIMARY KEY,
     lead_id VARCHAR(255) UNIQUE NOT NULL, -- References MongoDB Lead
     score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
     factors JSONB, -- Scoring breakdown
     confidence DECIMAL(3,2),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE INDEX idx_scores_lead ON qualification_scores(lead_id);
   CREATE INDEX idx_scores_value ON qualification_scores(score DESC);
   ```

2. **002_create_call_analytics.sql**
   - Aggregated call metrics by date/campaign
   - Performance statistics
   - Conversion funnel data

3. **003_create_lead_history.sql**
   - Audit trail for lead changes
   - Status change history
   - Touch point tracking

## 🏗️ Migration Naming Convention

```
{sequence}_{action}_{table_name}.sql

Examples:
001_create_qualification_scores.sql
002_add_email_to_contacts.sql
003_create_analytics_summary.sql
```

## 🔄 Migration Strategy

### Up Migration (Apply)
```sql
-- migrations/001_create_qualification_scores.sql
CREATE TABLE qualification_scores (
  -- schema here
);
```

### Down Migration (Rollback)
```sql
-- migrations/001_create_qualification_scores_down.sql
DROP TABLE IF EXISTS qualification_scores;
```

## ✅ Migration Checklist

- [ ] Use sequential numbering (001, 002, 003...)
- [ ] Include both UP and DOWN migrations
- [ ] Add proper indexes for performance
- [ ] Use constraints for data integrity
- [ ] Document foreign key relationships
- [ ] Test rollback before committing
- [ ] Update schema documentation

## 🛠️ Running Migrations

```bash
# Apply migrations
node backend/src/database/run-migrations.js up

# Rollback last migration
node backend/src/database/run-migrations.js down

# Check migration status
node backend/src/database/run-migrations.js status
```

## 📊 PostgreSQL Schema Design

### Best Practices:
- Use SERIAL for auto-increment IDs
- Always add indexes on foreign keys
- Use JSONB for flexible data (not JSON)
- Add CHECK constraints for data validation
- Use TIMESTAMP for date fields (not DATE)
- Create indexes on frequently queried fields

### Performance Tips:
- Index columns used in WHERE clauses
- Index columns used in JOINs
- Index columns used in ORDER BY
- Monitor query performance with EXPLAIN

---
**Connection:** PostgreSQL connection configured in `config/database.js`  
**Environment:** Use `DATABASE_URL` from `.env`