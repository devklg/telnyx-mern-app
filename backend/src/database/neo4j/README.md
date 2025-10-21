# Neo4j Graph Schema

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Cypher scripts for graph database initialization

## 🕸️ Graph Schema Design

### Node Types:

1. **Lead** - Contact/prospect nodes
   ```cypher
   (:Lead {
     leadId: String,        // MongoDB reference
     name: String,
     company: String,
     status: String,
     score: Integer,
     createdAt: DateTime
   })
   ```

2. **Call** - Call event nodes
   ```cypher
   (:Call {
     callId: String,
     duration: Integer,
     outcome: String,
     timestamp: DateTime
   })
   ```

3. **Campaign** - Lead batch nodes
   ```cypher
   (:Campaign {
     campaignId: String,
     name: String,
     startDate: DateTime
   })
   ```

4. **User** - System user nodes
   ```cypher
   (:User {
     userId: String,
     name: String,
     role: String
   })
   ```

### Relationship Types:

- `(Lead)-[:REFERRED_BY]->(Lead)` - Lead referrals
- `(Lead)-[:WORKS_AT]->(Company)` - Employment
- `(Lead)-[:RECEIVED_CALL]->(Call)` - Call history
- `(Call)-[:HANDLED_BY]->(User)` - User assignments
- `(Lead)-[:BELONGS_TO]->(Campaign)` - Campaign membership
- `(Lead)-[:KNOWS]->(Lead)` - Professional network

## 📋 Cypher Scripts to Create

### 1. **init-schema.cypher** - Create constraints and indexes
```cypher
// Unique constraints
CREATE CONSTRAINT lead_id IF NOT EXISTS
FOR (l:Lead) REQUIRE l.leadId IS UNIQUE;

CREATE CONSTRAINT call_id IF NOT EXISTS
FOR (c:Call) REQUIRE c.callId IS UNIQUE;

// Indexes for performance
CREATE INDEX lead_status IF NOT EXISTS
FOR (l:Lead) ON (l.status);

CREATE INDEX lead_score IF NOT EXISTS
FOR (l:Lead) ON (l.score);

CREATE INDEX call_timestamp IF NOT EXISTS
FOR (c:Call) ON (c.timestamp);
```

### 2. **create-lead-graph.cypher** - Build relationship network
```cypher
// Create leads
MERGE (l:Lead {leadId: 'lead-123'})
SET l.name = 'John Smith',
    l.company = 'Acme Corp',
    l.status = 'qualified',
    l.score = 85;

// Create relationships
MATCH (l1:Lead {leadId: 'lead-123'})
MATCH (l2:Lead {leadId: 'lead-456'})
MERGE (l1)-[:REFERRED_BY]->(l2);
```

### 3. **query-patterns.cypher** - Common query patterns
```cypher
// Find lead network (referral chain)
MATCH path = (l:Lead)-[:REFERRED_BY*1..3]->(referrer:Lead)
WHERE l.leadId = 'lead-123'
RETURN path;

// Find highly qualified leads in network
MATCH (l:Lead)-[:REFERRED_BY]->(referrer:Lead)
WHERE referrer.score >= 80
RETURN l, referrer
ORDER BY l.score DESC;

// Call history for lead
MATCH (l:Lead)-[:RECEIVED_CALL]->(c:Call)
WHERE l.leadId = 'lead-123'
RETURN c
ORDER BY c.timestamp DESC;
```

## 🎯 Use Cases

### 1. **Referral Tracking**
- Find who referred a qualified lead
- Track referral chains
- Identify top referrers

### 2. **Network Analysis**
- Discover lead clusters
- Find influencers in network
- Identify warm introduction paths

### 3. **Call Analytics**
- Track call patterns
- Analyze conversion paths
- Monitor follow-up sequences

## ✅ Implementation Checklist

- [ ] Create init-schema.cypher with constraints
- [ ] Create create-lead-graph.cypher
- [ ] Create query-patterns.cypher
- [ ] Add indexes for performance
- [ ] Document relationship meanings
- [ ] Create sync script (MongoDB → Neo4j)
- [ ] Test graph queries
- [ ] Optimize for common patterns

## 🔄 Keeping MongoDB & Neo4j in Sync

```javascript
// When creating a lead in MongoDB
const lead = await Lead.create(leadData);

// Also create node in Neo4j
await neo4jSession.run(
  `MERGE (l:Lead {leadId: $leadId})
   SET l.name = $name,
       l.status = $status,
       l.score = $score`,
  { leadId: lead._id.toString(), ...leadData }
);
```

## 📊 Performance Tips

- Use MERGE instead of CREATE for idempotency
- Add indexes on frequently queried properties
- Limit path depth in graph traversals
- Use parameters in queries (never string interpolation)
- Profile queries with EXPLAIN and PROFILE

---
**Connection:** Neo4j driver configured in `config/database.js`  
**Ports:** Bolt: 7687, HTTP: 7474