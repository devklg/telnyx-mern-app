# Database Seed Data

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Test data for development and testing

## 📋 Seed Files to Create

### 1. MongoDB Seeds

**seed-mongodb.js** - Populate MongoDB collections
```javascript
const mongoose = require('mongoose');
const Lead = require('../../models/Lead');

// Sample leads data
const sampleLeads = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '+1-555-0101',
    company: 'Acme Corp',
    source: 'fresh',
    status: 'new',
    score: 0
  },
  // ... more leads
];

async function seedLeads() {
  await Lead.deleteMany({}); // Clear existing
  await Lead.insertMany(sampleLeads);
  console.log('✅ Seeded', sampleLeads.length, 'leads');
}
```

### 2. PostgreSQL Seeds

**seed-postgres.js** - Populate PostgreSQL tables
- Qualification scores for test leads
- Sample analytics data
- Historical metrics

### 3. Neo4j Seeds

**seed-neo4j.js** - Create graph relationships
- Lead relationship network
- Sample call chains
- Referral paths

### 4. ChromaDB Seeds

**seed-chroma.js** - Initialize vector collections
- Sample conversation embeddings
- Test document chunks
- AI context examples

## 🎯 Seed Data Strategy

### Test Data Categories:

1. **Fresh Leads** (50 records)
   - Recently acquired contacts
   - Various industries and sizes
   - Mix of qualification scores (0-100)

2. **Aged Leads** (100 records)
   - Older contacts needing revival
   - Historical call attempts
   - Previous qualification data

3. **Conversations** (30 records)
   - Complete transcripts
   - All 12 Paul Barrios phases represented
   - Various outcomes (qualified, not interested, callback)

4. **Users** (5 records)
   - Admin user
   - Sales rep user
   - Manager user
   - Test user
   - API user

## 🔄 Running Seeds

```bash
# Seed all databases
node backend/src/database/seeds/seed-all.js

# Seed specific database
node backend/src/database/seeds/seed-mongodb.js
node backend/src/database/seeds/seed-postgres.js
node backend/src/database/seeds/seed-neo4j.js
node backend/src/database/seeds/seed-chroma.js

# Clear all seed data
node backend/src/database/seeds/clear-all.js
```

## 📊 Seed Data Requirements

### Critical Fields:
- Valid phone numbers (E.164 format)
- Realistic email addresses
- Proper timestamps
- Consistent reference IDs across databases

### Data Relationships:
- Leads → Conversations (1:many)
- Leads → CallLogs (1:many)
- Campaigns → Leads (1:many)
- Users → Activities (1:many)

## ✅ Seed Checklist

- [ ] Create seed-mongodb.js with 150+ leads
- [ ] Create seed-postgres.js with qualification scores
- [ ] Create seed-neo4j.js with relationship graph
- [ ] Create seed-chroma.js with embeddings
- [ ] Create seed-all.js master script
- [ ] Create clear-all.js cleanup script
- [ ] Test seed → clear → seed cycle
- [ ] Document data relationships

## 🎪 Integration with Tests

```javascript
// In your test setup
beforeAll(async () => {
  await seedAll(); // Populate test data
});

afterAll(async () => {
  await clearAll(); // Clean up
});
```

---
**Environment:** Seeds only run in development/test, never production!