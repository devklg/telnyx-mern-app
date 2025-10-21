# Database Directory

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Database schemas, migrations, seeds, and initialization scripts

## 🗂️ Directory Structure

```
database/
├── migrations/         # PostgreSQL migration scripts
├── seeds/              # Seed data for all databases
├── neo4j/              # Neo4j Cypher initialization scripts
├── chroma/             # ChromaDB collection configurations
└── README.md           # This file
```

## 🎯 BMAD V4 Database Architecture

### **4-Database Strategy**

#### 1. **MongoDB** (Port: 28000)
- **Purpose:** Primary operational data storage
- **What to store:** Leads, Conversations, Call logs, Users, Campaigns
- **Schema:** Mongoose models in `/models/` directory
- **Why:** Flexible document structure for dynamic lead data

#### 2. **PostgreSQL** (Neon)
- **Purpose:** Structured relational data & analytics
- **What to store:** Qualification scores, Analytics aggregates, Reports
- **Schema:** SQL migrations in `/migrations/` directory
- **Why:** ACID compliance, complex queries, reporting

#### 3. **Neo4j** (Ports: 7687 bolt, 7474 http)
- **Purpose:** Relationship graphs & lead tracking
- **What to store:** Lead relationships, Call chains, Decision paths
- **Schema:** Cypher scripts in `/neo4j/` directory
- **Why:** Graph queries for lead networks and referral chains

#### 4. **ChromaDB** (Port: 8000)
- **Purpose:** Vector embeddings & AI context
- **What to store:** Conversation embeddings, Semantic search
- **Schema:** Collection configs in `/chroma/` directory
- **Why:** AI-powered lead qualification and similarity search

## 📋 Your Priority Tasks (Sprint 1)

### Week 1 Focus:
1. ✅ Create MongoDB models (see `/models/README.md`)
2. ⬜ Create PostgreSQL migration for qualification scoring
3. ⬜ Create Neo4j graph schema for lead relationships
4. ⬜ Create ChromaDB collections for embeddings
5. ⬜ Create seed data scripts for testing

### Critical Dependencies:
- MongoDB connection working ✅
- PostgreSQL connection configured ✅
- Neo4j running locally/cloud ⬜ (verify)
- ChromaDB running ⬜ (verify)

## 🔄 Database Initialization Flow

```javascript
// Recommended initialization order
1. Connect to all databases (database.js handles this)
2. Run PostgreSQL migrations (if needed)
3. Initialize Neo4j constraints and indexes
4. Create ChromaDB collections
5. Seed test data (development only)
6. Verify all connections
```

## 📚 Key Files to Create

- `init-databases.js` - Master initialization script
- `verify-connections.js` - Connection health check
- `backup-strategy.md` - Backup and recovery plan
- `indexing-strategy.md` - Performance optimization guide

## 🎪 Integration Points

- **Backend Services:** Use models/schemas from your controllers
- **Telnyx Integration:** Store call data in MongoDB + Neo4j
- **AI Processing:** Embeddings in ChromaDB from conversations
- **Analytics:** Query PostgreSQL for reports and dashboards

---
**Remember:** Each database serves a specific purpose. Don't duplicate data unnecessarily!