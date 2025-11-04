# Graph RAG Lead Learning System

## Overview

The **Graph RAG Lead Learning System** is an advanced AI-powered knowledge management system that continuously learns from lead qualification calls to improve future interactions. It combines **Graph Database (Neo4j)** for relationship-based knowledge and **Vector Database (ChromaDB)** for semantic similarity search, creating a powerful Retrieval-Augmented Generation (RAG) system.

## Key Features

### 🧠 Continuous Learning
- **Automatic Learning**: Every completed call automatically updates the knowledge graph
- **Pattern Recognition**: Identifies successful conversation patterns and strategies
- **Objection Handling**: Learns which objection handling strategies work best
- **Buying Signal Detection**: Tracks which buying signals lead to successful qualifications

### 🔍 Intelligent Knowledge Retrieval
- **Hybrid Search**: Combines graph traversal and semantic similarity
- **Industry-Specific Insights**: Retrieves relevant knowledge based on lead's industry
- **Similar Lead Analysis**: Finds patterns from similar successful leads
- **Real-Time Recommendations**: Provides actionable insights before each call

### 📊 Analytics & Insights
- **Success Pattern Analysis**: Identifies what works across industries
- **Performance Tracking**: Monitors qualification success rates over time
- **Strategy Effectiveness**: Measures confidence levels of different approaches
- **Improvement Recommendations**: Suggests areas for optimization

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    GRAPH RAG SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Neo4j      │      │  ChromaDB    │                    │
│  │  Knowledge   │◄────►│   Vector     │                    │
│  │   Graph      │      │   Store      │                    │
│  └──────────────┘      └──────────────┘                    │
│         ▲                      ▲                            │
│         │                      │                            │
│         └──────────┬───────────┘                            │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │  Graph RAG Service  │                            │
│         └──────────┬──────────┘                            │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │   Learning Pipeline │                            │
│         │   • Pattern Extract │                            │
│         │   • Signal Analysis │                            │
│         │   • Strategy Gen    │                            │
│         └──────────┬──────────┘                            │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Voice Agent Call    │
         │   with AI Context     │
         └───────────────────────┘
```

### Knowledge Graph Schema

#### Node Types

1. **Lead**
   - Properties: leadId, industry, companySize, successRate, totalCalls
   - Tracks: Individual lead performance and patterns

2. **Conversation**
   - Properties: conversationId, outcome, qualificationScore, duration, isSuccessful
   - Tracks: Individual call outcomes and metrics

3. **BuyingSignal**
   - Properties: name, totalOccurrences, successfulOccurrences, successRate
   - Tracks: Effectiveness of different buying signals

4. **Objection**
   - Properties: type, totalOccurrences, overcomeCount, overcomeRate
   - Tracks: Common objections and their handling success

5. **HandlingStrategy**
   - Properties: strategy, successCount, totalUses, successRate
   - Tracks: Objection handling strategies that work

6. **ConversationPattern**
   - Properties: patternId, type, features, successRate
   - Tracks: Successful conversation flow patterns

7. **Industry**
   - Properties: name, successRate, avgQualificationScore, totalCalls
   - Tracks: Industry-specific performance

8. **CompanySize**
   - Properties: size, metrics
   - Tracks: Performance by company size

9. **Strategy**
   - Properties: strategyId, type, confidence, industry, successCount
   - Tracks: Proven strategies for different contexts

#### Relationship Types

- `HAD_CONVERSATION`: Lead → Conversation
- `EXHIBITED_SIGNAL`: Conversation → BuyingSignal
- `HAD_OBJECTION`: Conversation → Objection
- `OVERCOME_BY`: Objection → HandlingStrategy
- `EXHIBITED_PATTERN`: Conversation → ConversationPattern
- `USED_STRATEGY`: Conversation → Strategy
- `INCLUDES_SIZE`: Industry → CompanySize

## How It Works

### 1. Before a Call (Knowledge Retrieval)

When a call is initiated, the system:

1. **Retrieves Similar Leads**: Finds successful leads in the same industry
2. **Gathers Strategies**: Pulls proven strategies with high confidence
3. **Identifies Objections**: Lists common objections and handling approaches
4. **Analyzes Patterns**: Retrieves successful conversation patterns
5. **Semantic Search**: Finds similar successful conversations using ChromaDB
6. **Generates Recommendations**: Creates actionable insights for the agent

Example retrieval:
```javascript
const knowledge = await graphRAGService.retrieveKnowledgeForLead({
  leadId: '123',
  industry: 'SaaS',
  companySize: '50-200',
  previousInteractions: ['Initial contact via email']
});

// Returns:
// {
//   similarLeads: [...],
//   successfulStrategies: [...],
//   relevantObjections: [...],
//   conversationPatterns: [...],
//   recommendations: [
//     {
//       type: 'strategy',
//       priority: 'high',
//       message: 'Use buying-signals strategy with 85% confidence...'
//     }
//   ]
// }
```

### 2. During a Call (Real-Time Context)

The voice agent receives enriched context including:
- Recommended strategies
- Common objections to prepare for
- Effective buying signals to watch for
- Conversation patterns that work
- Industry-specific insights

### 3. After a Call (Learning Phase)

The system automatically:

1. **Extracts Patterns**:
   - Talk ratio (agent vs lead)
   - Question engagement
   - Response timing
   - Interruption patterns

2. **Analyzes Signals**:
   - Buying signals detected
   - Confidence levels
   - Context of each signal

3. **Processes Objections**:
   - Types of objections raised
   - Handling strategies used
   - Whether objections were overcome

4. **Updates Knowledge Graph**:
   - Creates/updates nodes
   - Strengthens successful relationships
   - Adjusts confidence scores
   - Tracks success rates

5. **Stores Embeddings**:
   - Successful conversations → ChromaDB
   - Enables semantic similarity search

## API Endpoints

### Initialize System
```http
POST /api/graph-rag/initialize
Authorization: Bearer <token>
```

### Get Knowledge for Lead
```http
GET /api/graph-rag/knowledge/lead/:leadId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "similarLeads": [...],
    "successfulStrategies": [...],
    "relevantObjections": [...],
    "recommendations": [...]
  }
}
```

### Learn from Call
```http
POST /api/graph-rag/learn/call/:callId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "conversationId": "conv_123"
}
```

### Batch Learning
```http
POST /api/graph-rag/learn/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "minQualificationScore": 70
}

Response:
{
  "success": true,
  "data": {
    "total": 150,
    "processed": 145,
    "failed": 5
  }
}
```

### Get Analytics
```http
GET /api/graph-rag/analytics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "overall": {
      "totalConversations": 1500,
      "successfulConversations": 750,
      "successRate": 0.5
    },
    "topIndustries": [...],
    "topBuyingSignals": [...],
    "topPatterns": [...],
    "learningProgress": [...]
  }
}
```

### Get Industry Insights
```http
GET /api/graph-rag/insights/industry/:industry
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "industry": {
      "name": "SaaS",
      "successRate": 0.65,
      "avgQualificationScore": 72
    },
    "topStrategies": [...],
    "commonObjections": [...],
    "effectiveSignals": [...]
  }
}
```

### Get Improvement Recommendations
```http
GET /api/graph-rag/recommendations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "underperforming-industries",
        "priority": "high",
        "industries": [...],
        "message": "These industries have low success rates..."
      }
    ]
  }
}
```

### Search Similar Conversations
```http
POST /api/graph-rag/search/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "interested in pricing but concerned about budget",
  "industry": "SaaS",
  "minQualificationScore": 70,
  "limit": 5
}

Response:
{
  "success": true,
  "data": {
    "conversations": [
      {
        "conversationId": "conv_123",
        "similarity": 0.87,
        "metadata": {...}
      }
    ]
  }
}
```

### Get Statistics
```http
GET /api/graph-rag/statistics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "nodes": {
      "Lead": 1000,
      "Conversation": 5000,
      "BuyingSignal": 50,
      "Objection": 30,
      "Strategy": 75
    },
    "relationships": {
      "HAD_CONVERSATION": 5000,
      "EXHIBITED_SIGNAL": 8000,
      "HAD_OBJECTION": 3000
    },
    "learningVelocity": {
      "avgPerDay": 45,
      "totalLast30Days": 1350
    }
  }
}
```

## Automatic Learning

### Call End Hook

When a call ends, the system automatically:

1. **Triggers Learning**: Via `learnFromCompletedCall` middleware
2. **Processes Asynchronously**: Doesn't block the API response
3. **Extracts Insights**: From transcripts and metrics
4. **Updates Graph**: Adds new knowledge and patterns

### Batch Learning Cron Job

Runs every 6 hours to catch any missed calls:

- **Schedule**: `0 */6 * * *` (00:00, 06:00, 12:00, 18:00)
- **Scope**: Last 24 hours of calls
- **Filter**: Completed calls with 30+ seconds talk time
- **Safety**: Graceful error handling per call

## Benefits

### For Sales Teams

1. **Faster Ramp-Up**: New agents benefit from collective knowledge
2. **Better Objection Handling**: Learn from successful strategies
3. **Industry Expertise**: Instant access to industry-specific insights
4. **Continuous Improvement**: System gets smarter with every call

### For Managers

1. **Data-Driven Coaching**: Identify what works and what doesn't
2. **Performance Tracking**: Monitor success rates across industries
3. **Strategy Validation**: Measure effectiveness of different approaches
4. **Predictive Insights**: Anticipate common objections

### For the Business

1. **Higher Conversion Rates**: Proven strategies applied consistently
2. **Reduced Training Time**: Knowledge automatically captured and shared
3. **Scalable Excellence**: Best practices replicated across team
4. **Competitive Advantage**: Continuous learning creates compound gains

## Learning Metrics

The system tracks and learns from:

### Conversation Metrics
- Talk ratio (agent vs lead)
- Number of questions asked
- Response time
- Interruption patterns
- Call duration phases

### Engagement Indicators
- Positive language usage
- Active listening signals
- Interest expressions
- Commitment language
- Future-oriented questions

### Outcome Correlation
- Qualification score vs patterns
- Success rate by industry
- Effective signal combinations
- Objection handling success
- Transfer correlation

## Configuration

### Environment Variables

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# ChromaDB Configuration
CHROMA_URL=http://localhost:8000

# Batch Learning Schedule (optional)
GRAPH_RAG_CRON_SCHEDULE=0 */6 * * *
TZ=America/New_York
```

### Initialization

The system auto-initializes on server startup:

```javascript
// In server.js
const { initializeGraphRAG } = require('./middleware/auto-learning.middleware');
await initializeGraphRAG();
```

### Manual Initialization

```javascript
const graphRAGService = require('./services/graph-rag.service');
await graphRAGService.initialize();
```

## Best Practices

### 1. Data Quality

- Ensure accurate transcriptions
- Complete call metadata
- Proper qualification scoring
- Consistent industry tags

### 2. Regular Monitoring

- Check analytics dashboard weekly
- Review improvement recommendations
- Validate learning patterns
- Monitor knowledge graph growth

### 3. Strategy Refinement

- Test new approaches based on recommendations
- Retire low-confidence strategies
- Amplify high-success patterns
- Update industry-specific tactics

### 4. Feedback Loop

- Review auto-learned patterns
- Validate buying signal detection
- Confirm objection categorization
- Adjust confidence thresholds

## Troubleshooting

### Neo4j Connection Issues

```bash
# Check Neo4j status
docker ps | grep neo4j

# Verify connection
curl http://localhost:7474

# Check credentials
echo $NEO4J_PASSWORD
```

### ChromaDB Issues

```bash
# Check ChromaDB status
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
docker restart chromadb
```

### Learning Not Triggering

1. Check call duration (must be 30+ seconds)
2. Verify call status is 'completed'
3. Check logs for errors
4. Ensure middleware is attached to route

### Low Quality Insights

1. Increase minimum qualification score
2. Filter by call duration
3. Review transcription quality
4. Check industry tagging accuracy

## Performance Optimization

### Graph Queries

- Indexes created automatically on:
  - Lead.industry
  - Lead.companySize
  - Pattern.successRate
  - Strategy.confidence

### Batch Processing

- Process in chunks of 100 calls
- Use connection pooling
- Implement retry logic
- Monitor memory usage

### Caching

- Cache frequently accessed insights
- Pre-compute industry statistics
- Cache similar lead queries
- TTL: 15 minutes for hot data

## Future Enhancements

### Planned Features

1. **Real-Time Learning**: Update graph during calls
2. **A/B Testing**: Test strategy variations
3. **Predictive Scoring**: Predict qualification likelihood
4. **Auto-Generated Scripts**: Create dynamic talk tracks
5. **Multi-Language Support**: Learn from international calls
6. **Team Collaboration**: Share successful patterns
7. **Export Knowledge**: Generate training materials

### Advanced Analytics

1. **Cohort Analysis**: Compare team performance
2. **Time-Series Insights**: Identify trending patterns
3. **Causal Analysis**: Understand cause-effect relationships
4. **Anomaly Detection**: Flag unusual patterns
5. **ROI Tracking**: Measure learning impact on revenue

## Support

For questions or issues:

1. Check logs: `tail -f logs/graph-rag.log`
2. Review analytics: `GET /api/graph-rag/analytics`
3. Check statistics: `GET /api/graph-rag/statistics`
4. Contact: [Your Support Channel]

## License

[Your License]

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
**Maintainer**: AI Development Team
