# BMAD V4 - Framework Documentation Guide

**Last Updated:** 2025-10-21  
**Version:** 1.0  
**Purpose:** Comprehensive framework documentation for all 17 AI agents

---

## ðŸš¨ CRITICAL INSTRUCTION

**ALWAYS read the appropriate SKILL.md file BEFORE creating any documents!**

Location: `/mnt/skills/public/[skill-name]/SKILL.md`

Available Anthropic Skills:
- **docx** - Word document creation and editing
- **pdf** - PDF generation and manipulation  
- **pptx** - PowerPoint presentation creation
- **xlsx** - Excel spreadsheet creation

---

## ðŸ"Š CHROMA DATABASE COLLECTIONS (64 Total)

### Core Project Collections
1. **bmad_v4_lead_qualification** (58 docs) - Main project context
2. **bmad_project_context** (22 docs) - Historical project data  
3. **bmad_v4_state_snapshots** (14 docs) - State tracking

### Framework Documentation (147 docs)
4. **framework_documentation** - Technical documentation
   - React, Express.js, Node.js guides
   - Database best practices
   - API design patterns

### Telnyx Documentation (31 docs)
5. **telnyx_documentation** - Voice platform guides
   - Voice Agent API
   - Webhook handling
   - Call management

### Docker Documentation (24 docs)  
6. **docker_documentation** - Container orchestration
   - docker-compose patterns
   - Multi-service architecture
   - Port management

### Claude/Anthropic Documentation (11 docs)
7. **claude_anthropic_documentation** - AI integration
   - Claude API usage
   - Anthropic Skills (docx, pdf, pptx, xlsx)
   - Best practices for AI workflows

---

## ðŸ—„ï¸ DATABASE ARCHITECTURE

### MongoDB (Port 27017/27018)
**Purpose:** Primary CRM and operational data

**Collections:**
- `leads` - Lead information and status
- `calls` - Call history and recordings  
- `conversations` - Transcripts and analysis
- `users` - System users and permissions
- `campaigns` - Call campaigns and settings

**Best Practices:**
- Use indexes on frequently queried fields
- Implement data validation schemas
- Regular backups required
- Use aggregation pipeline for analytics

### PostgreSQL (Neon) (Port 5432)
**Purpose:** Structured relational data

**Tables:**
- Lead qualification scores
- User authentication  
- System audit logs
- Performance metrics

**Best Practices:**
- Normalize data appropriately
- Use foreign keys for relationships
- Implement connection pooling
- Monitor query performance

### ChromaDB (Port 8000)
**Purpose:** Vector embeddings and semantic search

**Collections:**
- Conversation embeddings
- Lead similarity matching
- Knowledge base vectors

**Best Practices:**
- Batch embed documents
- Use appropriate distance metrics
- Regular collection optimization
- Monitor collection sizes

### Neo4j (Ports 7474/7687)
**Purpose:** Knowledge graph and relationships

**Structure:**
- Agent nodes and relationships  
- Task dependencies (DEPENDS_ON)
- Project context graph
- Workflow relationships

**Best Practices:**
- Model clear relationships
- Use indexes on frequently queried properties
- Leverage graph algorithms
- Regular backups

---

## ðŸŽ¯ PORT CONFIGURATION

### Application Ports
- **Frontend:** 3000 (React Dashboard)
- **Backend API:** 5000 (Express.js)
- **WebSocket:** 8080 (Real-time updates)  
- **Voice Agent:** 4000 (Telnyx integration)

### Database Ports
- **MongoDB (BMAD):** 27017
- **MongoDB (Dashboard):** 27018
- **PostgreSQL:** 5432
- **Neo4j HTTP:** 7474
- **Neo4j Bolt:** 7687
- **ChromaDB:** 8000

### Monitoring Ports
- **Grafana:** 3001
- **Prometheus:** 9090

---

## ðŸ"§ TECHNOLOGY STACK

### Frontend
- **React 18+** - UI framework
- **Material-UI** - Component library
- **Socket.io-client** - Real-time updates
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **Express.js** - API server
- **Socket.io** - WebSocket server
- **Mongoose** - MongoDB ODM
- **Prisma** - PostgreSQL ORM
- **JWT** - Authentication

### Voice Platform
- **Telnyx Voice Agent API** - Voice operations
- **Telnyx MCP Server** - Integration layer
- **Claude API** - AI conversation

### DevOps
- **Docker** - Containerization
- **docker-compose** - Multi-container orchestration  
- **GitHub Actions** - CI/CD
- **Grafana** - Monitoring dashboards
- **Prometheus** - Metrics collection

---

## ðŸš€ AGENT-SPECIFIC DOCUMENTATION PRIORITIES

### Infrastructure Agents (Alex, Sarah, Marcus)
**Priority Collections:**
- docker_documentation
- neo4j_chroma_integration_docs
- framework_documentation

**Key Skills:**
- Docker multi-service setup
- Database configuration
- Security best practices

### Backend Agents (David, Jennifer, Robert, Lisa)
**Priority Collections:**
- telnyx_documentation
- framework_documentation  
- claude_anthropic_documentation
- langchain_documentation

**Key Skills:**
- Express.js API design
- Telnyx integration
- Claude API usage
- WebSocket implementation

### Frontend Agents (Michael, Emma, James, Priya, Angela)
**Priority Collections:**
- framework_documentation
- python_standard_docs

**Key Skills:**
- React best practices
- Material-UI components
- Real-time UI updates
- Data visualization

### Quality Agents (Rachel, Kevin, Nicole)
**Priority Collections:**
- framework_documentation
- agent_testing_scripts

**Key Skills:**
- Integration testing
- Voice flow testing
- Performance testing

### Performance Agents (Thomas, Daniel)
**Priority Collections:**
- framework_documentation
- grafana_documentation

**Key Skills:**
- Performance optimization
- Monitoring setup
- Analytics implementation

---

## ðŸ"š EXTERNAL RESOURCES

### Official Documentation
- **Telnyx:** https://developers.telnyx.com/
- **Claude API:** https://docs.anthropic.com/
- **React:** https://react.dev/
- **Express.js:** https://expressjs.com/
- **MongoDB:** https://www.mongodb.com/docs/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Neo4j:** https://neo4j.com/docs/
- **ChromaDB:** https://docs.trychroma.com/

### Best Practice Guides
- **REST API Design:** https://restfulapi.net/
- **WebSocket Patterns:** https://socket.io/docs/
- **Docker Compose:** https://docs.docker.com/compose/
- **React Patterns:** https://react.dev/learn

---

## âœ… QUICK START CHECKLIST

### For ALL Agents
1. â˜ Read this FRAMEWORK-DOCUMENTATION.md
2. â˜ Read your agent's story file (*_STORY.md)
3. â˜ Review AGENT-ONBOARDING-CHECKLIST.md
4. â˜ Check GIT-WORKFLOW.md for Git procedures
5. â˜ Query Neo4j for your task dependencies
6. â˜ Review relevant ChromaDB collections

### Before Creating Documents
1. â˜ Identify required format (docx/pdf/pptx/xlsx)
2. â˜ Read `/mnt/skills/public/[format]/SKILL.md`
3. â˜ Follow skill guidelines for best results
4. â˜ Test with small examples first

### Before Writing Code
1. â˜ Review framework documentation in ChromaDB
2. â˜ Check dependency tasks in Neo4j
3. â˜ Review existing code patterns in repo
4. â˜ Follow established conventions

---

## ðŸ"ž SUPPORT & RESOURCES

### Internal Resources
- **Neo4j Dashboard:** http://localhost:7474
- **Grafana Dashboard:** http://localhost:3001
- **ChromaDB API:** http://localhost:8000

### Getting Help
1. Query `bmad_v4_lead_qualification` collection in Chroma
2. Check Neo4j graph for related context
3. Review similar agent implementations
4. Consult framework documentation

---

**Remember:** This is a dependency-driven project. Always check task dependencies in Neo4j before starting work!
