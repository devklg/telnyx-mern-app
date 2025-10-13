// ============================================================================
// BMAD V4 - DATABASE MANAGER
// ============================================================================
// 
// Unified database connection manager for the Voice Agent Learning System
// Manages connections to:
// - Neo4j (Knowledge Graph & Agent Learning)
// - Neon PostgreSQL (Operational Data)
// - MongoDB (Transcripts & Documents)
// - ChromaDB (Vector Embeddings & Semantic Search)
//
// Author: BMAD v4 Development Team
// Created: October 2025
// ============================================================================

const neo4j = require('neo4j-driver');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const { ChromaClient } = require('chromadb');

class DatabaseManager {
  constructor() {
    this.neo4jDriver = null;
    this.pgPool = null;
    this.mongoClient = null;
    this.chromaClient = null;
    this.connected = {
      neo4j: false,
      postgres: false,
      mongodb: false,
      chroma: false
    };
  }

  // ========================================================================
  // NEO4J CONNECTION
  // ========================================================================
  
  async connectNeo4j() {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const user = process.env.NEO4J_USER || 'neo4j';
      const password = process.env.NEO4J_PASSWORD || 'password';

      this.neo4jDriver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000,
          maxTransactionRetryTime: 30000
        }
      );

      // Verify connection
      await this.neo4jDriver.verifyConnectivity();
      this.connected.neo4j = true;
      
      console.log('✅ Neo4j connected successfully');
      
      // Initialize agent nodes
      await this.initializeAgentNodes();
      
      return true;
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error.message);
      this.connected.neo4j = false;
      throw error;
    }
  }

  async initializeAgentNodes() {
    const session = this.neo4jDriver.session();
    try {
      // Create 17 agent nodes
      const agents = [
        { id: 1, name: 'DatabaseArchitect', role: 'Data Architecture' },
        { id: 2, name: 'APIFramework', role: 'API Development' },
        { id: 3, name: 'LeadCRUD', role: 'Lead Management' },
        { id: 4, name: 'ConversationEngine', role: 'Voice Interaction' },
        { id: 5, name: 'EngagementScoring', role: 'Scoring System' },
        { id: 6, name: 'HotTransfer', role: 'Transfer Logic' },
        { id: 7, name: 'KnowledgeGraph', role: 'Graph Management' },
        { id: 8, name: 'VectorSearch', role: 'Semantic Search' },
        { id: 9, name: 'LearningPipeline', role: 'ML & Analytics' },
        { id: 10, name: 'GrafanaDashboard', role: 'Visualization' },
        { id: 11, name: 'LeadManagementUI', role: 'Frontend UI' },
        { id: 12, name: 'MonitoringDashboard', role: 'Real-time Monitoring' },
        { id: 13, name: 'TelnyxIntegration', role: 'Telephony' },
        { id: 14, name: 'ReportingEngine', role: 'Analytics & Reports' },
        { id: 15, name: 'ExportCapabilities', role: 'Data Export' },
        { id: 16, name: 'QualityAssurance', role: 'Testing' },
        { id: 17, name: 'DeploymentOps', role: 'Infrastructure' }
      ];

      for (const agent of agents) {
        await session.run(
          `MERGE (a:Agent {agentId: $agentId})
           SET a.name = $name,
               a.role = $role,
               a.status = 'active',
               a.createdAt = datetime(),
               a.totalInteractions = 0,
               a.successRate = 0.0,
               a.learningScore = 0.0`,
          agent
        );
      }

      console.log('✅ Initialized 17 agent nodes in Neo4j');
    } finally {
      await session.close();
    }
  }

  async runNeo4jQuery(query, params = {}) {
    if (!this.connected.neo4j) {
      throw new Error('Neo4j not connected');
    }

    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  // ========================================================================
  // POSTGRESQL CONNECTION (NEON)
  // ========================================================================

  async connectPostgres() {
    try {
      this.pgPool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pgPool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      this.connected.postgres = true;
      console.log('✅ PostgreSQL (Neon) connected successfully');
      
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      this.connected.postgres = false;
      throw error;
    }
  }

  async runPostgresQuery(query, params = []) {
    if (!this.connected.postgres) {
      throw new Error('PostgreSQL not connected');
    }

    try {
      const result = await this.pgPool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    }
  }

  async runPostgresTransaction(queries) {
    const client = await this.pgPool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================================================
  // MONGODB CONNECTION
  // ========================================================================

  async connectMongoDB() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DATABASE || 'voice_agent_system';

      this.mongoClient = new MongoClient(uri, {
        maxPoolSize: 50,
        minPoolSize: 10,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      await this.mongoClient.connect();
      
      // Test connection
      await this.mongoClient.db(dbName).command({ ping: 1 });
      
      this.connected.mongodb = true;
      console.log('✅ MongoDB connected successfully');
      
      // Create indexes
      await this.createMongoDBIndexes(dbName);
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.connected.mongodb = false;
      throw error;
    }
  }

  async createMongoDBIndexes(dbName) {
    const db = this.mongoClient.db(dbName);
    
    // Transcripts indexes
    await db.collection('transcripts').createIndex({ call_id: 1 });
    await db.collection('transcripts').createIndex({ created_at: -1 });
    await db.collection('transcripts').createIndex({ 'metadata.lead_id': 1 });
    
    // Learning documents indexes
    await db.collection('learning_documents').createIndex({ type: 1 });
    await db.collection('learning_documents').createIndex({ agent_id: 1 });
    await db.collection('learning_documents').createIndex({ created_at: -1 });
    
    console.log('✅ MongoDB indexes created');
  }

  getMongoCollection(collectionName) {
    if (!this.connected.mongodb) {
      throw new Error('MongoDB not connected');
    }
    
    const dbName = process.env.MONGODB_DATABASE || 'voice_agent_system';
    return this.mongoClient.db(dbName).collection(collectionName);
  }

  // ========================================================================
  // CHROMADB CONNECTION
  // ========================================================================

  async connectChroma() {
    try {
      const host = process.env.CHROMA_HOST || 'localhost';
      const port = process.env.CHROMA_PORT || 8000;

      this.chromaClient = new ChromaClient({
        path: `http://${host}:${port}`
      });

      // Test connection by listing collections
      await this.chromaClient.heartbeat();
      
      this.connected.chroma = true;
      console.log('✅ ChromaDB connected successfully');
      
      // Initialize collections
      await this.initializeChromaCollections();
      
      return true;
    } catch (error) {
      console.error('❌ ChromaDB connection failed:', error.message);
      this.connected.chroma = false;
      throw error;
    }
  }

  async initializeChromaCollections() {
    try {
      // Conversation patterns collection
      await this.chromaClient.getOrCreateCollection({
        name: 'conversation_patterns',
        metadata: { description: 'Successful conversation patterns and techniques' }
      });

      // Objection handling collection
      await this.chromaClient.getOrCreateCollection({
        name: 'objection_handling',
        metadata: { description: 'Effective responses to common objections' }
      });

      // Qualification insights collection
      await this.chromaClient.getOrCreateCollection({
        name: 'qualification_insights',
        metadata: { description: 'Patterns from successful qualifications' }
      });

      console.log('✅ ChromaDB collections initialized');
    } catch (error) {
      console.error('Error initializing ChromaDB collections:', error);
    }
  }

  async getChromaCollection(collectionName) {
    if (!this.connected.chroma) {
      throw new Error('ChromaDB not connected');
    }

    return await this.chromaClient.getCollection({ name: collectionName });
  }

  async queryChroma(collectionName, queryTexts, nResults = 5, where = null) {
    const collection = await this.getChromaCollection(collectionName);
    
    const queryParams = {
      queryTexts,
      nResults
    };

    if (where) {
      queryParams.where = where;
    }

    return await collection.query(queryParams);
  }

  async addToChroma(collectionName, documents, metadatas, ids) {
    const collection = await this.getChromaCollection(collectionName);
    
    return await collection.add({
      documents,
      metadatas,
      ids
    });
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  async connectAll() {
    console.log('🔌 Connecting to all databases...');
    
    const connections = await Promise.allSettled([
      this.connectNeo4j(),
      this.connectPostgres(),
      this.connectMongoDB(),
      this.connectChroma()
    ]);

    const summary = {
      neo4j: connections[0].status === 'fulfilled',
      postgres: connections[1].status === 'fulfilled',
      mongodb: connections[2].status === 'fulfilled',
      chroma: connections[3].status === 'fulfilled'
    };

    console.log('\n📊 Connection Summary:');
    console.log(`Neo4j: ${summary.neo4j ? '✅' : '❌'}`);
    console.log(`PostgreSQL: ${summary.postgres ? '✅' : '❌'}`);
    console.log(`MongoDB: ${summary.mongodb ? '✅' : '❌'}`);
    console.log(`ChromaDB: ${summary.chroma ? '✅' : '❌'}\n`);

    return summary;
  }

  async disconnectAll() {
    console.log('🔌 Disconnecting from all databases...');

    const disconnections = [];

    if (this.neo4jDriver) {
      disconnections.push(
        this.neo4jDriver.close().then(() => {
          this.connected.neo4j = false;
          console.log('✅ Neo4j disconnected');
        })
      );
    }

    if (this.pgPool) {
      disconnections.push(
        this.pgPool.end().then(() => {
          this.connected.postgres = false;
          console.log('✅ PostgreSQL disconnected');
        })
      );
    }

    if (this.mongoClient) {
      disconnections.push(
        this.mongoClient.close().then(() => {
          this.connected.mongodb = false;
          console.log('✅ MongoDB disconnected');
        })
      );
    }

    // ChromaDB client doesn't need explicit disconnect
    if (this.connected.chroma) {
      this.connected.chroma = false;
      console.log('✅ ChromaDB disconnected');
    }

    await Promise.all(disconnections);
    console.log('✅ All databases disconnected');
  }

  getConnectionStatus() {
    return {
      neo4j: this.connected.neo4j,
      postgres: this.connected.postgres,
      mongodb: this.connected.mongodb,
      chroma: this.connected.chroma,
      allConnected: Object.values(this.connected).every(status => status)
    };
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheck() {
    const health = {
      neo4j: { status: 'unknown', latency: null, error: null },
      postgres: { status: 'unknown', latency: null, error: null },
      mongodb: { status: 'unknown', latency: null, error: null },
      chroma: { status: 'unknown', latency: null, error: null }
    };

    // Neo4j health check
    if (this.connected.neo4j) {
      const start = Date.now();
      try {
        await this.runNeo4jQuery('RETURN 1 as result');
        health.neo4j.status = 'healthy';
        health.neo4j.latency = Date.now() - start;
      } catch (error) {
        health.neo4j.status = 'unhealthy';
        health.neo4j.error = error.message;
      }
    } else {
      health.neo4j.status = 'disconnected';
    }

    // PostgreSQL health check
    if (this.connected.postgres) {
      const start = Date.now();
      try {
        await this.runPostgresQuery('SELECT 1');
        health.postgres.status = 'healthy';
        health.postgres.latency = Date.now() - start;
      } catch (error) {
        health.postgres.status = 'unhealthy';
        health.postgres.error = error.message;
      }
    } else {
      health.postgres.status = 'disconnected';
    }

    // MongoDB health check
    if (this.connected.mongodb) {
      const start = Date.now();
      try {
        const dbName = process.env.MONGODB_DATABASE || 'voice_agent_system';
        await this.mongoClient.db(dbName).command({ ping: 1 });
        health.mongodb.status = 'healthy';
        health.mongodb.latency = Date.now() - start;
      } catch (error) {
        health.mongodb.status = 'unhealthy';
        health.mongodb.error = error.message;
      }
    } else {
      health.mongodb.status = 'disconnected';
    }

    // ChromaDB health check
    if (this.connected.chroma) {
      const start = Date.now();
      try {
        await this.chromaClient.heartbeat();
        health.chroma.status = 'healthy';
        health.chroma.latency = Date.now() - start;
      } catch (error) {
        health.chroma.status = 'unhealthy';
        health.chroma.error = error.message;
      }
    } else {
      health.chroma.status = 'disconnected';
    }

    return health;
  }

  // ========================================================================
  // BUSINESS LOGIC HELPERS
  // ========================================================================

  async recordCallInteraction(callData) {
    try {
      // 1. Store in PostgreSQL (operational data)
      const pgQuery = `
        INSERT INTO calls (
          lead_id, agent_id, call_sid, direction, status,
          duration, recording_url, engagement_score,
          qualification_score, transferred_to_kevin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING call_id
      `;
      
      const pgResult = await this.runPostgresQuery(pgQuery, [
        callData.lead_id,
        callData.agent_id,
        callData.call_sid,
        callData.direction,
        callData.status,
        callData.duration,
        callData.recording_url,
        callData.engagement_score,
        callData.qualification_score,
        callData.transferred_to_kevin
      ]);

      const callId = pgResult[0].call_id;

      // 2. Store transcript in MongoDB
      if (callData.transcript) {
        await this.getMongoCollection('transcripts').insertOne({
          call_id: callId,
          lead_id: callData.lead_id,
          agent_id: callData.agent_id,
          transcript: callData.transcript,
          metadata: {
            duration: callData.duration,
            engagement_score: callData.engagement_score,
            qualification_score: callData.qualification_score
          },
          created_at: new Date()
        });
      }

      // 3. Update Neo4j relationships
      await this.runNeo4jQuery(
        `MATCH (a:Agent {agentId: $agentId})
         MERGE (l:Lead {leadId: $leadId})
         MERGE (c:Call {callId: $callId})
         SET c.duration = $duration,
             c.engagementScore = $engagementScore,
             c.qualificationScore = $qualificationScore,
             c.timestamp = datetime()
         MERGE (a)-[:HANDLED]->(c)
         MERGE (c)-[:WITH_LEAD]->(l)`,
        {
          agentId: callData.agent_id,
          leadId: callData.lead_id,
          callId: callId,
          duration: callData.duration,
          engagementScore: callData.engagement_score,
          qualificationScore: callData.qualification_score
        }
      );

      // 4. Add conversation patterns to ChromaDB (if successful)
      if (callData.qualification_score >= 7 && callData.transcript) {
        await this.addToChroma(
          'conversation_patterns',
          [callData.transcript],
          [{
            call_id: callId,
            engagement_score: callData.engagement_score,
            qualification_score: callData.qualification_score,
            agent_id: callData.agent_id
          }],
          [`call_${callId}`]
        );
      }

      return { success: true, call_id: callId };
    } catch (error) {
      console.error('Error recording call interaction:', error);
      throw error;
    }
  }

  async getLearningInsights(agentId, queryText) {
    try {
      // Query ChromaDB for similar successful patterns
      const patterns = await this.queryChroma(
        'conversation_patterns',
        [queryText],
        5,
        { agent_id: { $eq: agentId } }
      );

      // Get agent performance from Neo4j
      const agentStats = await this.runNeo4jQuery(
        `MATCH (a:Agent {agentId: $agentId})-[:HANDLED]->(c:Call)
         RETURN 
           count(c) as totalCalls,
           avg(c.engagementScore) as avgEngagement,
           avg(c.qualificationScore) as avgQualification`,
        { agentId }
      );

      return {
        similarPatterns: patterns,
        agentPerformance: agentStats[0] || {}
      };
    } catch (error) {
      console.error('Error getting learning insights:', error);
      throw error;
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
