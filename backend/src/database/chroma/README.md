# ChromaDB Collections

**Owner:** Sarah Chen (Database Architect)  
**Purpose:** Vector database collections for AI-powered features

## 🎯 ChromaDB Collections to Create

### 1. **conversation_embeddings**
**Purpose:** Store conversation transcripts as vector embeddings  
**Use Case:** Semantic search across all conversations

```javascript
const collection = await chromaClient.createCollection({
  name: 'conversation_embeddings',
  metadata: {
    description: 'Call conversation transcripts and summaries',
    embedding_function: 'default' // or 'openai' if using OpenAI
  }
});
```

**Documents to store:**
- Full conversation transcripts
- AI-generated summaries
- Key phrases and objections
- Successful qualification examples

### 2. **lead_profiles**
**Purpose:** Vectorized lead information for similarity matching  
**Use Case:** Find similar leads for targeted outreach

```javascript
const collection = await chromaClient.createCollection({
  name: 'lead_profiles',
  metadata: {
    description: 'Lead profile embeddings for similarity search',
    dimensions: 1536 // if using OpenAI ada-002
  }
});
```

**Documents to store:**
- Company descriptions
- Industry categorizations
- Lead background information
- Qualification summaries

### 3. **objection_handling**
**Purpose:** Library of objection responses and patterns  
**Use Case:** Real-time suggestion of responses to common objections

```javascript
const collection = await chromaClient.createCollection({
  name: 'objection_handling',
  metadata: {
    description: 'Objection patterns and successful responses',
    category: 'training_data'
  }
});
```

**Documents to store:**
- Common objections
- Successful responses
- Context when objection occurred
- Outcome after response

### 4. **qualification_scripts**
**Purpose:** Paul Barrios 12-phase script segments  
**Use Case:** Context-aware script suggestions during calls

```javascript
const collection = await chromaClient.createCollection({
  name: 'qualification_scripts',
  metadata: {
    description: 'Paul Barrios 12-phase qualification methodology',
    phases: 12,
    source: 'Paul Barrios System'
  }
});
```

**Documents to store:**
- Each phase script
- Transition points
- Success indicators
- Alternative approaches

## 📋 Implementation Tasks

### Sprint 1 Priorities:

1. ✅ **init-collections.js** - Create all collections
   ```javascript
   const { ChromaClient } = require('chromadb');
   
   async function initChromaCollections() {
     const client = new ChromaClient({ path: 'http://localhost:8000' });
     
     // Create collections
     await client.createCollection({
       name: 'conversation_embeddings'
     });
     // ... create others
   }
   ```

2. ✅ **embed-conversations.js** - Add conversation to vectors
   ```javascript
   async function embedConversation(conversationId, transcript) {
     const collection = await chromaClient.getCollection(
       'conversation_embeddings'
     );
     
     await collection.add({
       ids: [conversationId],
       documents: [transcript],
       metadatas: [{
         leadId: lead._id,
         outcome: 'qualified',
         timestamp: new Date()
       }]
     });
   }
   ```

3. ✅ **semantic-search.js** - Query utility functions
   ```javascript
   async function findSimilarConversations(query, limit = 5) {
     const collection = await chromaClient.getCollection(
       'conversation_embeddings'
     );
     
     const results = await collection.query({
       queryTexts: [query],
       nResults: limit
     });
     
     return results;
   }
   ```

## 🔍 Query Patterns

### Find Similar Conversations
```javascript
// Find conversations similar to current call
const similar = await findSimilarConversations(
  "customer interested in premium tier but concerned about price",
  3
);
```

### Find Leads Like This One
```javascript
// Find similar qualified leads
const similarLeads = await collection.query({
  queryTexts: [leadProfile],
  where: { "qualification_status": "qualified" },
  nResults: 10
});
```

### Search Objection Library
```javascript
// Find relevant objection handling
const responses = await collection.query({
  queryTexts: ["too expensive"],
  nResults: 3
});
```

## ✅ Checklist

- [ ] Create init-collections.js script
- [ ] Initialize 4 core collections
- [ ] Create embed-conversations.js utility
- [ ] Create semantic-search.js query helpers
- [ ] Add sample embeddings for testing
- [ ] Create collection management UI endpoint
- [ ] Document embedding strategy
- [ ] Test query performance

## 🎪 Integration Points

### Real-time AI Suggestions
```javascript
// During a call, suggest relevant content
const suggestions = await findSimilarConversations(
  currentCallTranscript,
  3
);

// Send to frontend via Socket.io
io.emit('ai-suggestions', suggestions);
```

### Post-call Analysis
```javascript
// After call ends, store embedding
await embedConversation(
  conversation._id,
  conversation.transcript
);

// Find similar successful calls for training
const examples = await findSimilarConversations(
  conversation.transcript,
  5
);
```

## 📊 Performance Tips

- Limit query results (nResults) to 5-10 for speed
- Use metadata filters to narrow search space
- Batch embed operations when possible
- Monitor collection sizes and prune old data
- Use persistent storage for ChromaDB

## 🔄 Embedding Strategy

**When to Embed:**
- After every call (conversation transcript)
- When lead is qualified (lead profile)
- When adding training data (scripts, objections)

**What NOT to Embed:**
- PII data directly (use references)
- Extremely short text (< 50 chars)
- Duplicate content

---
**Connection:** ChromaDB client in `config/database.js`  
**Port:** 8000 (local), configurable via CHROMA_HOST/CHROMA_PORT