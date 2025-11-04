# Graph RAG System Setup Guide

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- Neo4j database (local or cloud)
- ChromaDB (local or cloud)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

The following packages will be installed:
- `neo4j-driver` (v5.14.0) - Neo4j graph database client
- `chromadb` (v1.8.1) - ChromaDB vector database client
- `node-cron` (v4.2.1) - Cron job scheduler (already installed)

### 2. Setup Neo4j

#### Option A: Using Docker

```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:latest
```

#### Option B: Using Neo4j Aura (Cloud)

1. Go to https://neo4j.com/cloud/aura/
2. Create a free account
3. Create a new database
4. Save the connection URI, username, and password

### 3. Setup ChromaDB

#### Option A: Using Docker

```bash
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  chromadb/chroma:latest
```

#### Option B: Using Python (Local)

```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### 4. Configure Environment Variables

Create or update your `.env` file:

```bash
# ==========================================
# GRAPH RAG CONFIGURATION
# ==========================================

# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Neo4j Aura (Cloud) Example:
# NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=your_aura_password

# ChromaDB Connection
CHROMA_URL=http://localhost:8000

# ChromaDB Cloud Example:
# CHROMA_URL=https://your-chromadb-instance.com

# Batch Learning Schedule (optional)
# Default: Every 6 hours (0 */6 * * *)
GRAPH_RAG_CRON_SCHEDULE=0 */6 * * *

# Timezone for cron jobs
TZ=America/New_York
```

### 5. Initialize the System

The Graph RAG system auto-initializes when the server starts:

```bash
npm run dev
```

You should see:
```
✅ All databases connected
✅ Graph RAG system initialized
✅ Graph RAG batch learning cron job started
🚀 Server running on port 3550
```

### 6. Verify Installation

#### Check Neo4j Connection

```bash
curl -X POST http://localhost:3550/api/graph-rag/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Graph RAG system initialized successfully"
}
```

#### Check Statistics

```bash
curl http://localhost:3550/api/graph-rag/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "nodes": {},
    "relationships": {},
    "learningVelocity": {
      "avgPerDay": 0,
      "totalLast30Days": 0
    }
  }
}
```

## Initial Data Import (Optional)

To kickstart the learning system, import historical call data:

### Option 1: Batch Learn from Recent Calls

```bash
curl -X POST http://localhost:3550/api/graph-rag/learn/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-11-04",
    "minQualificationScore": 50
  }'
```

### Option 2: Learn from Individual Calls

```bash
# Get list of calls
curl http://localhost:3550/api/calls \
  -H "Authorization: Bearer YOUR_TOKEN"

# Learn from specific call
curl -X POST http://localhost:3550/api/graph-rag/learn/call/CALL_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring

### View Analytics Dashboard

```bash
curl http://localhost:3550/api/graph-rag/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Knowledge Graph Growth

```bash
# View statistics
curl http://localhost:3550/api/graph-rag/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# View by industry
curl http://localhost:3550/api/graph-rag/insights/industry/SaaS \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitor Cron Job

Check logs for batch learning execution:

```bash
tail -f logs/application.log | grep "Graph RAG"
```

Expected output:
```
[INFO] Running scheduled Graph RAG batch learning...
[INFO] Found 45 calls to learn from
[INFO] Scheduled Graph RAG batch learning completed successfully
```

## Testing the Learning Pipeline

### 1. Make a Test Call

Use the existing call endpoint:

```bash
curl -X POST http://localhost:3550/api/calls/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID",
    "phoneNumber": "+1234567890"
  }'
```

### 2. End the Call

```bash
curl -X POST http://localhost:3550/api/calls/CALL_ID/end \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": {
      "result": "qualified"
    },
    "notes": "Great conversation, ready to proceed"
  }'
```

### 3. Verify Learning

The system should automatically learn from the call. Check:

```bash
# View updated statistics
curl http://localhost:3550/api/graph-rag/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show increased node counts
```

## Neo4j Browser Exploration

### Access Neo4j Browser

1. Open http://localhost:7474
2. Login with credentials
3. Run Cypher queries to explore the graph

### Sample Queries

#### View all node types and counts
```cypher
MATCH (n)
RETURN labels(n)[0] as NodeType, COUNT(n) as Count
ORDER BY Count DESC
```

#### Find top performing industries
```cypher
MATCH (i:Industry)
WHERE i.totalCalls >= 10
RETURN i.name, i.successRate, i.totalCalls
ORDER BY i.successRate DESC
LIMIT 10
```

#### View successful conversation patterns
```cypher
MATCH (p:ConversationPattern)
WHERE p.successRate > 0.7
RETURN p.type, p.successRate, p.totalOccurrences
ORDER BY p.successRate DESC
```

#### Find effective buying signals
```cypher
MATCH (s:BuyingSignal)
WHERE s.totalOccurrences >= 5
RETURN s.name, s.successRate, s.totalOccurrences
ORDER BY s.successRate DESC
```

#### Explore lead journey
```cypher
MATCH path = (l:Lead {leadId: 'LEAD_ID'})-[:HAD_CONVERSATION]->(c:Conversation)-[*]->()
RETURN path
LIMIT 50
```

## Troubleshooting

### Neo4j Connection Failed

**Error**: `Failed to create driver: Could not connect to Neo4j`

**Solutions**:
1. Check Neo4j is running: `docker ps | grep neo4j`
2. Verify connection URI in `.env`
3. Test connection: `curl http://localhost:7474`
4. Check credentials are correct

### ChromaDB Connection Failed

**Error**: `Failed to connect to ChromaDB`

**Solutions**:
1. Check ChromaDB is running: `docker ps | grep chroma`
2. Verify URL in `.env`
3. Test connection: `curl http://localhost:8000/api/v1/heartbeat`
4. Check firewall settings

### Learning Not Triggering

**Issue**: Calls complete but knowledge graph not updated

**Solutions**:
1. Check call duration (must be 30+ seconds)
2. Verify call status is 'completed'
3. Check logs: `tail -f logs/application.log | grep "auto-learning"`
4. Manually trigger: `POST /api/graph-rag/learn/call/:callId`

### Cron Job Not Running

**Issue**: Batch learning not executing

**Solutions**:
1. Check cron job status in logs
2. Verify `node-cron` is installed
3. Check `GRAPH_RAG_CRON_SCHEDULE` format
4. Manually run: Restart server

### Memory Issues

**Issue**: High memory usage during batch learning

**Solutions**:
1. Reduce batch size in `periodicBatchLearning`
2. Process calls in smaller chunks
3. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
4. Schedule cron job during off-peak hours

## Performance Optimization

### Neo4j Tuning

```bash
# Increase heap size for better performance
docker run -d \
  --name neo4j \
  -e NEO4J_dbms_memory_heap_initial__size=512m \
  -e NEO4J_dbms_memory_heap_max__size=2G \
  -e NEO4J_dbms_memory_pagecache_size=1G \
  neo4j:latest
```

### ChromaDB Tuning

```bash
# Use persistent storage
docker run -d \
  --name chromadb \
  -v $(pwd)/chroma-data:/chroma/data \
  -p 8000:8000 \
  chromadb/chroma:latest
```

### Batch Processing

Update `auto-learning.middleware.js`:

```javascript
// Process in smaller batches
const BATCH_SIZE = 50; // Reduce from 1000
const calls = await CallLog.find(query).limit(BATCH_SIZE);
```

## Upgrading

### Updating Dependencies

```bash
npm update chromadb
npm update neo4j-driver
```

### Schema Migration

If graph schema changes:

```bash
# Backup current data
docker exec neo4j neo4j-admin dump --database=neo4j --to=/backups/backup.dump

# Update schema
curl -X POST http://localhost:3550/api/graph-rag/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security Considerations

### Neo4j Security

1. **Change Default Password**: Never use default neo4j/neo4j
2. **Enable Auth**: Always require authentication
3. **Use TLS**: For production, use `neo4j+s://` or `bolt+s://`
4. **Network Security**: Firewall rules to restrict access

### ChromaDB Security

1. **API Authentication**: Configure API keys if available
2. **Network Security**: Run on private network
3. **Data Encryption**: Use HTTPS for cloud instances

### API Security

1. **Authentication**: All endpoints require valid JWT token
2. **Rate Limiting**: Configured at `/api/` level
3. **Input Validation**: Validate all user inputs
4. **CORS**: Restrict allowed origins

## Production Deployment

### Docker Compose

Create `docker-compose.graph-rag.yml`:

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:latest
    container_name: neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/your_secure_password
      - NEO4J_dbms_memory_heap_max__size=2G
      - NEO4J_dbms_memory_pagecache_size=1G
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
    restart: unless-stopped

  chromadb:
    image: chromadb/chroma:latest
    container_name: chromadb
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/data
    restart: unless-stopped

volumes:
  neo4j-data:
  neo4j-logs:
  chroma-data:
```

Deploy:

```bash
docker-compose -f docker-compose.graph-rag.yml up -d
```

### Health Checks

Add to your monitoring:

```bash
# Neo4j health
curl http://localhost:7474/db/neo4j/tx/commit

# ChromaDB health
curl http://localhost:8000/api/v1/heartbeat

# Graph RAG stats
curl http://localhost:3550/api/graph-rag/statistics
```

## Support

For issues or questions:

1. Check logs: `tail -f logs/application.log`
2. Review documentation: `/docs/GRAPH_RAG_SYSTEM.md`
3. Check statistics: `GET /api/graph-rag/statistics`
4. View analytics: `GET /api/graph-rag/analytics`

## Next Steps

After setup:

1. ✅ Import historical call data
2. ✅ Monitor learning progress
3. ✅ Review analytics dashboard
4. ✅ Test knowledge retrieval
5. ✅ Optimize batch learning schedule
6. ✅ Configure alerts and monitoring

---

**Setup Version**: 1.0.0
**Last Updated**: 2025-11-04
**Maintainer**: AI Development Team
