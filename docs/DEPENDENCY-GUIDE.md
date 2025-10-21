# BMAD V4 - Dependency-Driven Development Guide

**Purpose:** Guide agents through dependency-aware task execution  
**Last Updated:** 2025-10-21

---

## ðŸ§  DEPENDENCY PHILOSOPHY

BMAD V4 uses **dependency-driven development** where:
- Tasks are organized by their dependencies
- High-dependency tasks are prioritized
- Agents work on tasks only when dependencies are met
- Neo4j tracks all dependency relationships

---

## ðŸ"Š DEPENDENCY STATISTICS

Based on Neo4j analysis:

### Highest Dependency Tasks (288 tasks depend on these)
1. **TASK-DL-001:** Build User Authentication System
2. **TASK-KB-001:** Setup Testing Infrastructure & CI/CD

### High Dependency Tasks (96 tasks depend on these)
3. **TASK-RG-003:** Implement Voice-Backend Integration

### Medium Dependency Tasks (48 tasks depend on these)
4. **TASK-RG-002:** Build Frontend-Backend Integration Layer

### Foundation Tasks (4 tasks depend on these)
5. **TASK-LC-001:** Setup ChromaDB Vector Database
6. **TASK-LC-001:** Integrate Claude API  
7. **TASK-RW-001:** Implement Paul Barrios 12-Phase Script
8. **TASK-DR-011:** Build Database Connection Layer

---

## ðŸš¦ EXECUTION WAVES

### Wave 0: Infrastructure Foundation
**Status:** IN PROGRESS  
**Agents:** Alex Martinez (DevOps), Sarah Chen (Database)

**Tasks:**
- TASK-AM-001: Setup Docker Infrastructure
- TASK-DR-011: Build Database Connection Layer
- TASK-SC-001: Design MongoDB Schema
- TASK-SC-002: Setup Neo4j Graph Database

**Dependencies:** None (foundational)

**Documentation Needed:**
- Docker setup guide
- Database connection patterns
- Environment configuration

---

### Wave 1: Authentication & Security
**Status:** BLOCKED (waiting on Wave 0)
**Agents:** Daniel Lee (User Mgmt), Marcus Thompson (Security)

**Tasks:**
- TASK-DL-001: Build User Authentication System ⚠️ (288 dependencies)
- TASK-DL-002: Implement RBAC
- TASK-MT-001: Setup Security Infrastructure

**Dependencies:**
- Database Connection Layer (TASK-DR-011)
- Docker Infrastructure (TASK-AM-001)

**Documentation Needed:**
- Authentication flow diagrams
- Security best practices
- JWT implementation guide

---

### Wave 2: Core Backend APIs
**Status:** BLOCKED (waiting on Wave 1)
**Agents:** David Rodriguez (Backend Lead)

**Tasks:**
- TASK-DR-001: Setup Express.js Server Foundation
- TASK-DR-003: Build Lead Management API ⚠️ (2 dependencies)
- TASK-DR-004: Build Call Queue Management

**Dependencies:**
- User Authentication (TASK-DL-001)
- Database Layer (TASK-DR-011)

**Documentation Needed:**
- API endpoint specifications
- Request/response schemas
- Error handling patterns

---

### Wave 3: Voice Integration
**Status:** BLOCKED (waiting on Wave 2)
**Agents:** Jennifer Kim (Telnyx), Robert Wilson (Conversation)

**Tasks:**
- TASK-JK-001: Integrate Telnyx MCP Server
- TASK-RW-001: Implement Paul Barrios Script ⚠️ (4 dependencies)
- TASK-JK-002: Setup Voice Event Webhooks

**Dependencies:**
- Backend APIs (TASK-DR-001, TASK-DR-003)
- Call Queue System (TASK-DR-004)

**Documentation Needed:**
- Telnyx integration guide
- Conversation flow documentation
- Webhook event handling

---

### Wave 4: AI & Vector Systems
**Status:** BLOCKED (waiting on Wave 3)
**Agents:** Lisa Chang (AI/Vector)

**Tasks:**
- TASK-LC-001: Setup ChromaDB ⚠️ (4 dependencies)
- TASK-LC-002: Integrate Claude API ⚠️ (4 dependencies)
- TASK-LC-003: Build Conversation Intelligence

**Dependencies:**
- Voice Integration (TASK-JK-001)
- Conversation Script (TASK-RW-001)

**Documentation Needed:**
- ChromaDB setup guide
- Claude API integration
- Embedding strategies

---

### Wave 5: Frontend Foundation
**Status:** BLOCKED (waiting on Wave 2)
**Agents:** Michael Park (Frontend Lead)

**Tasks:**
- TASK-MP-001: Setup React Application
- TASK-MP-002: Build Dashboard Framework
- TASK-MP-003: Implement Authentication UI

**Dependencies:**
- Backend APIs (TASK-DR-001, TASK-DR-003)
- Authentication System (TASK-DL-001)

**Documentation Needed:**
- React component patterns
- State management guide
- UI/UX specifications

---

### Wave 6: Real-time Monitoring
**Status:** BLOCKED (waiting on Waves 4 & 5)
**Agents:** Emma Johnson (Dashboard), Priya Patel (Voice UI)

**Tasks:**
- TASK-EJ-001: Build Live Call Dashboard ⚠️ (1 dependency)
- TASK-EJ-002: Real-time Transcription Display
- TASK-PP-001: Build Voice Control Interface

**Dependencies:**
- Frontend Framework (TASK-MP-001, TASK-MP-002)
- Voice Integration (TASK-JK-001)
- Claude API (TASK-LC-002)

**Documentation Needed:**
- WebSocket implementation
- Real-time UI patterns
- Voice control specifications

---

### Wave 7: Lead Management UI
**Status:** BLOCKED (waiting on Wave 5)
**Agents:** James Taylor (CRM UI)

**Tasks:**
- TASK-JT-001: Build Lead List Dashboard ⚠️ (2 dependencies)
- TASK-JT-002: Lead Qualification Pipeline
- TASK-JT-003: Follow-up Management

**Dependencies:**
- Frontend Framework (TASK-MP-001)
- Lead Management API (TASK-DR-003)

**Documentation Needed:**
- Lead scoring visualization
- Pipeline workflow
- CRM UI patterns

---

### Wave 8: Analytics & Reporting
**Status:** BLOCKED (waiting on Wave 7)
**Agents:** Angela White (Analytics)

**Tasks:**
- TASK-AW-001: Setup Analytics Pipeline
- TASK-AW-002: Build Call Metrics Dashboard
- TASK-AW-003: Lead Conversion Tracking

**Dependencies:**
- Lead Management UI (TASK-JT-001)
- Call Data (TASK-DR-004)

**Documentation Needed:**
- Analytics data models
- Dashboard specifications
- Metrics calculations

---

### Wave 9: Integration & Testing
**Status:** BLOCKED (waiting on all previous waves)
**Agents:** Rachel Green (Integration), Kevin Brown (QA), Nicole Davis (Voice Testing)

**Tasks:**
- TASK-RG-002: Frontend-Backend Integration ⚠️ (48 dependencies)
- TASK-RG-003: Voice-Backend Integration ⚠️ (96 dependencies)
- TASK-KB-001: Testing Infrastructure ⚠️ (288 dependencies)

**Dependencies:**
- ALL previous waves must be complete

**Documentation Needed:**
- Integration testing guide
- Voice testing procedures
- QA checklists

---

### Wave 10: Performance & Optimization
**Status:** BLOCKED (waiting on Wave 9)
**Agents:** Thomas Garcia (Performance)

**Tasks:**
- TASK-TG-001: Performance Optimization
- TASK-TG-002: Caching Implementation
- TASK-TG-003: Load Testing

**Dependencies:**
- Integration Complete (TASK-RG-002, TASK-RG-003)
- Testing Infrastructure (TASK-KB-001)

**Documentation Needed:**
- Performance benchmarks
- Optimization strategies
- Monitoring setup

---

## ðŸ"§ HOW TO USE THIS GUIDE

### For Agents Starting Work

1. **Check Your Wave Status**
   ```cypher
   MATCH (a:Agent {name: "Your Name"})-[:HAS_TASK]->(t:Task)
   RETURN t.id, t.title, t.status
   ```

2. **Check Task Dependencies**
   ```cypher
   MATCH (t:Task {id: "TASK-XX-001"})-[:DEPENDS_ON]->(dep:Task)
   RETURN dep.id, dep.title, dep.status
   ```

3. **Verify All Dependencies Complete**
   - All dependency tasks must have `status: 'complete'`
   - If any dependency is incomplete, wait or escalate

4. **Review Documentation Requirements**
   - Check this guide for your wave's documentation needs
   - Create/update documentation as you complete tasks

### For Project Manager

1. **Monitor Wave Progress**
   ```cypher
   MATCH (t:Task)
   WHERE t.status = 'complete'
   RETURN COUNT(t) as completed
   ```

2. **Identify Blockers**
   ```cypher
   MATCH (t:Task)-[:DEPENDS_ON]->(dep:Task)
   WHERE t.status = 'not_started' AND dep.status <> 'complete'
   RETURN t.id, t.title, dep.id as blocker, dep.status
   ```

3. **Unblock Next Wave**
   - Ensure Wave N is 100% complete before starting Wave N+1
   - Update task statuses in Neo4j
   - Notify agents when their wave is unblocked

---

## âš ï¸ CRITICAL DEPENDENCY RULES

1. **Never start a task with incomplete dependencies**
2. **Always update task status in Neo4j when complete**
3. **Document decisions that affect dependent tasks**
4. **Communicate blockers immediately**
5. **Review dependencies before starting each task**

---

## ðŸ"Š DEPENDENCY VISUALIZATION

Use Neo4j Browser to visualize:

```cypher
// View all dependencies for a task
MATCH path = (t:Task {id: "TASK-XX-001"})-[:DEPENDS_ON*]->(dep:Task)
RETURN path

// View entire dependency graph
MATCH (t:Task)-[r:DEPENDS_ON]->(dep:Task)
RETURN t, r, dep
LIMIT 100
```

---

**Remember:** Dependencies exist for a reason. Following them ensures quality, stability, and successful integration!
