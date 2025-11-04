/**
 * Graph RAG Service
 * Implements Retrieval-Augmented Generation using Neo4j knowledge graph and ChromaDB vector store
 * Provides continuous learning capabilities for lead qualification improvement
 */

const neo4j = require('neo4j-driver');
const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

class GraphRAGService {
  constructor() {
    // Neo4j connection
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );

    // ChromaDB connection
    this.chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });

    this.initialized = false;
  }

  /**
   * Initialize the knowledge graph schema and collections
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.createGraphSchema();
      await this.initializeChromaCollections();
      this.initialized = true;
      logger.info('Graph RAG system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Graph RAG system:', error);
      throw error;
    }
  }

  /**
   * Create Neo4j graph schema with constraints and indexes
   */
  async createGraphSchema() {
    const session = this.neo4jDriver.session();

    try {
      // Create constraints for unique nodes
      await session.run(`
        CREATE CONSTRAINT lead_id IF NOT EXISTS
        FOR (l:Lead) REQUIRE l.leadId IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT pattern_id IF NOT EXISTS
        FOR (p:ConversationPattern) REQUIRE p.patternId IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT signal_name IF NOT EXISTS
        FOR (s:BuyingSignal) REQUIRE s.name IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT objection_type IF NOT EXISTS
        FOR (o:Objection) REQUIRE o.type IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT strategy_id IF NOT EXISTS
        FOR (s:Strategy) REQUIRE s.strategyId IS UNIQUE
      `);

      // Create indexes for faster queries
      await session.run(`
        CREATE INDEX lead_industry IF NOT EXISTS
        FOR (l:Lead) ON (l.industry)
      `);

      await session.run(`
        CREATE INDEX lead_size IF NOT EXISTS
        FOR (l:Lead) ON (l.companySize)
      `);

      await session.run(`
        CREATE INDEX lead_status IF NOT EXISTS
        FOR (l:Lead) ON (l.status)
      `);

      await session.run(`
        CREATE INDEX pattern_success IF NOT EXISTS
        FOR (p:ConversationPattern) ON (p.successRate)
      `);

      await session.run(`
        CREATE INDEX strategy_confidence IF NOT EXISTS
        FOR (s:Strategy) ON (s.confidence)
      `);

      logger.info('Neo4j graph schema created successfully');
    } catch (error) {
      logger.error('Error creating graph schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Initialize ChromaDB collections for semantic search
   */
  async initializeChromaCollections() {
    try {
      // Collection for successful conversation patterns
      this.successfulConversationsCollection = await this.chromaClient.getOrCreateCollection({
        name: 'successful_conversations',
        metadata: { description: 'Embeddings of successful lead qualification conversations' }
      });

      // Collection for objection handling patterns
      this.objectionHandlingCollection = await this.chromaClient.getOrCreateCollection({
        name: 'objection_handling',
        metadata: { description: 'Embeddings of effective objection handling responses' }
      });

      // Collection for industry-specific strategies
      this.industryStrategiesCollection = await this.chromaClient.getOrCreateCollection({
        name: 'industry_strategies',
        metadata: { description: 'Industry-specific qualification strategies' }
      });

      logger.info('ChromaDB collections initialized successfully');
    } catch (error) {
      logger.error('Error initializing ChromaDB collections:', error);
      throw error;
    }
  }

  /**
   * Learn from a completed call and update knowledge graph
   * @param {Object} callData - Call data including lead info, conversation, outcome
   */
  async learnFromCall(callData) {
    const {
      leadId,
      conversationId,
      transcript,
      outcome,
      qualificationScore,
      buyingSignals,
      objections,
      duration,
      industry,
      companySize,
      engagementMetrics
    } = callData;

    const session = this.neo4jDriver.session();

    try {
      const isSuccessful = outcome === 'qualified' || qualificationScore >= 70;

      // 1. Create or update Lead node
      await session.run(`
        MERGE (l:Lead {leadId: $leadId})
        ON CREATE SET
          l.industry = $industry,
          l.companySize = $companySize,
          l.firstSeenAt = datetime(),
          l.totalCalls = 1,
          l.successfulCalls = CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
          l.successRate = CASE WHEN $isSuccessful THEN 1.0 ELSE 0.0 END
        ON MATCH SET
          l.totalCalls = l.totalCalls + 1,
          l.successfulCalls = l.successfulCalls + CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
          l.successRate = toFloat(l.successfulCalls) / toFloat(l.totalCalls),
          l.lastContactedAt = datetime()
      `, { leadId, industry, companySize, isSuccessful });

      // 2. Create Conversation node
      await session.run(`
        CREATE (c:Conversation {
          conversationId: $conversationId,
          leadId: $leadId,
          outcome: $outcome,
          qualificationScore: $qualificationScore,
          duration: $duration,
          timestamp: datetime(),
          isSuccessful: $isSuccessful
        })
      `, { conversationId, leadId, outcome, qualificationScore, duration, isSuccessful });

      // 3. Link Conversation to Lead
      await session.run(`
        MATCH (l:Lead {leadId: $leadId})
        MATCH (c:Conversation {conversationId: $conversationId})
        MERGE (l)-[r:HAD_CONVERSATION]->(c)
        SET r.timestamp = datetime()
      `, { leadId, conversationId });

      // 4. Process buying signals
      if (buyingSignals && buyingSignals.length > 0) {
        for (const signal of buyingSignals) {
          await this.processBuyingSignal(session, conversationId, signal, isSuccessful);
        }
      }

      // 5. Process objections
      if (objections && objections.length > 0) {
        for (const objection of objections) {
          await this.processObjection(session, conversationId, objection, isSuccessful);
        }
      }

      // 6. Extract and store conversation patterns
      const patterns = this.extractConversationPatterns(transcript, engagementMetrics);
      for (const pattern of patterns) {
        await this.storeConversationPattern(session, conversationId, pattern, isSuccessful);
      }

      // 7. Update industry-specific knowledge
      await this.updateIndustryKnowledge(session, industry, companySize, isSuccessful, qualificationScore);

      // 8. Store embeddings in ChromaDB for semantic search
      if (isSuccessful) {
        await this.storeSuccessfulConversationEmbedding(conversationId, transcript, {
          industry,
          companySize,
          qualificationScore,
          buyingSignals,
          duration
        });
      }

      // 9. Generate and store strategies based on this call
      await this.generateStrategies(session, callData);

      logger.info(`Successfully learned from call ${conversationId}`);
      return { success: true, conversationId };
    } catch (error) {
      logger.error(`Error learning from call ${conversationId}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Process a buying signal and update knowledge graph
   */
  async processBuyingSignal(session, conversationId, signal, isSuccessful) {
    const { type, confidence, context } = signal;

    // Create or update BuyingSignal node
    await session.run(`
      MERGE (s:BuyingSignal {name: $type})
      ON CREATE SET
        s.totalOccurrences = 1,
        s.successfulOccurrences = CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        s.successRate = CASE WHEN $isSuccessful THEN 1.0 ELSE 0.0 END,
        s.createdAt = datetime()
      ON MATCH SET
        s.totalOccurrences = s.totalOccurrences + 1,
        s.successfulOccurrences = s.successfulOccurrences + CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        s.successRate = toFloat(s.successfulOccurrences) / toFloat(s.totalOccurrences),
        s.updatedAt = datetime()
    `, { type, isSuccessful });

    // Link signal to conversation
    await session.run(`
      MATCH (c:Conversation {conversationId: $conversationId})
      MATCH (s:BuyingSignal {name: $type})
      MERGE (c)-[r:EXHIBITED_SIGNAL]->(s)
      SET r.confidence = $confidence,
          r.context = $context,
          r.timestamp = datetime()
    `, { conversationId, type, confidence, context });
  }

  /**
   * Process an objection and update knowledge graph
   */
  async processObjection(session, conversationId, objection, isSuccessful) {
    const { type, handlingStrategy, wasOvercome } = objection;

    // Create or update Objection node
    await session.run(`
      MERGE (o:Objection {type: $type})
      ON CREATE SET
        o.totalOccurrences = 1,
        o.overcomeCount = CASE WHEN $wasOvercome THEN 1 ELSE 0 END,
        o.overcomeRate = CASE WHEN $wasOvercome THEN 1.0 ELSE 0.0 END,
        o.createdAt = datetime()
      ON MATCH SET
        o.totalOccurrences = o.totalOccurrences + 1,
        o.overcomeCount = o.overcomeCount + CASE WHEN $wasOvercome THEN 1 ELSE 0 END,
        o.overcomeRate = toFloat(o.overcomeCount) / toFloat(o.totalOccurrences),
        o.updatedAt = datetime()
    `, { type, wasOvercome });

    // Link objection to conversation
    await session.run(`
      MATCH (c:Conversation {conversationId: $conversationId})
      MATCH (o:Objection {type: $type})
      MERGE (c)-[r:HAD_OBJECTION]->(o)
      SET r.handlingStrategy = $handlingStrategy,
          r.wasOvercome = $wasOvercome,
          r.timestamp = datetime()
    `, { conversationId, type, handlingStrategy, wasOvercome });

    // Store effective handling strategy
    if (wasOvercome && handlingStrategy) {
      await session.run(`
        MATCH (o:Objection {type: $type})
        MERGE (s:HandlingStrategy {strategy: $handlingStrategy})
        ON CREATE SET
          s.successCount = 1,
          s.totalUses = 1,
          s.successRate = 1.0,
          s.createdAt = datetime()
        ON MATCH SET
          s.successCount = s.successCount + 1,
          s.totalUses = s.totalUses + 1,
          s.successRate = toFloat(s.successCount) / toFloat(s.totalUses),
          s.updatedAt = datetime()
        MERGE (o)-[r:OVERCOME_BY]->(s)
        ON CREATE SET r.uses = 1
        ON MATCH SET r.uses = r.uses + 1
      `, { type, handlingStrategy });
    }
  }

  /**
   * Store a conversation pattern in the knowledge graph
   */
  async storeConversationPattern(session, conversationId, pattern, isSuccessful) {
    const { patternId, type, features, weight } = pattern;

    await session.run(`
      MERGE (p:ConversationPattern {patternId: $patternId})
      ON CREATE SET
        p.type = $type,
        p.features = $features,
        p.weight = $weight,
        p.totalOccurrences = 1,
        p.successfulOccurrences = CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        p.successRate = CASE WHEN $isSuccessful THEN 1.0 ELSE 0.0 END,
        p.createdAt = datetime()
      ON MATCH SET
        p.totalOccurrences = p.totalOccurrences + 1,
        p.successfulOccurrences = p.successfulOccurrences + CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        p.successRate = toFloat(p.successfulOccurrences) / toFloat(p.totalOccurrences),
        p.updatedAt = datetime()
    `, { patternId, type, features: JSON.stringify(features), weight, isSuccessful });

    // Link pattern to conversation
    await session.run(`
      MATCH (c:Conversation {conversationId: $conversationId})
      MATCH (p:ConversationPattern {patternId: $patternId})
      MERGE (c)-[r:EXHIBITED_PATTERN]->(p)
      SET r.timestamp = datetime()
    `, { conversationId, patternId });
  }

  /**
   * Update industry-specific knowledge
   */
  async updateIndustryKnowledge(session, industry, companySize, isSuccessful, qualificationScore) {
    if (!industry) return;

    // Create or update Industry node
    await session.run(`
      MERGE (i:Industry {name: $industry})
      ON CREATE SET
        i.totalCalls = 1,
        i.successfulCalls = CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        i.successRate = CASE WHEN $isSuccessful THEN 1.0 ELSE 0.0 END,
        i.avgQualificationScore = toFloat($qualificationScore),
        i.createdAt = datetime()
      ON MATCH SET
        i.totalCalls = i.totalCalls + 1,
        i.successfulCalls = i.successfulCalls + CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
        i.successRate = toFloat(i.successfulCalls) / toFloat(i.totalCalls),
        i.avgQualificationScore = (i.avgQualificationScore * (i.totalCalls - 1) + $qualificationScore) / i.totalCalls,
        i.updatedAt = datetime()
    `, { industry, isSuccessful, qualificationScore });

    // Link to CompanySize if available
    if (companySize) {
      await session.run(`
        MERGE (cs:CompanySize {size: $companySize})
        MATCH (i:Industry {name: $industry})
        MERGE (i)-[r:INCLUDES_SIZE]->(cs)
        ON CREATE SET
          r.totalCalls = 1,
          r.successfulCalls = CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
          r.successRate = CASE WHEN $isSuccessful THEN 1.0 ELSE 0.0 END
        ON MATCH SET
          r.totalCalls = r.totalCalls + 1,
          r.successfulCalls = r.successfulCalls + CASE WHEN $isSuccessful THEN 1 ELSE 0 END,
          r.successRate = toFloat(r.successfulCalls) / toFloat(r.totalCalls)
      `, { industry, companySize, isSuccessful });
    }
  }

  /**
   * Extract conversation patterns from transcript and engagement metrics
   */
  extractConversationPatterns(transcript, engagementMetrics) {
    const patterns = [];

    if (!transcript || !engagementMetrics) return patterns;

    // Pattern 1: Talk ratio pattern
    if (engagementMetrics.talkRatio) {
      const ratio = engagementMetrics.talkRatio;
      let patternType = 'balanced-conversation';
      if (ratio > 0.6) patternType = 'agent-dominated';
      else if (ratio < 0.4) patternType = 'lead-dominated';

      patterns.push({
        patternId: `talk-ratio-${patternType}`,
        type: patternType,
        features: { talkRatio: ratio },
        weight: 0.3
      });
    }

    // Pattern 2: Question pattern
    const questionCount = (transcript.match(/\?/g) || []).length;
    if (questionCount > 0) {
      patterns.push({
        patternId: `questions-${questionCount}`,
        type: 'question-engagement',
        features: { questionCount },
        weight: 0.2
      });
    }

    // Pattern 3: Engagement timing pattern
    if (engagementMetrics.phases) {
      patterns.push({
        patternId: `engagement-phases-${Object.keys(engagementMetrics.phases).length}`,
        type: 'multi-phase-engagement',
        features: { phases: engagementMetrics.phases },
        weight: 0.25
      });
    }

    // Pattern 4: Response time pattern
    if (engagementMetrics.avgResponseTime) {
      const responseTime = engagementMetrics.avgResponseTime;
      let patternType = 'normal-response';
      if (responseTime < 2) patternType = 'quick-response';
      else if (responseTime > 5) patternType = 'slow-response';

      patterns.push({
        patternId: `response-time-${patternType}`,
        type: patternType,
        features: { avgResponseTime: responseTime },
        weight: 0.15
      });
    }

    // Pattern 5: Interruption pattern
    if (engagementMetrics.interruptions !== undefined) {
      patterns.push({
        patternId: `interruptions-${engagementMetrics.interruptions}`,
        type: engagementMetrics.interruptions > 3 ? 'high-interruption' : 'low-interruption',
        features: { interruptions: engagementMetrics.interruptions },
        weight: 0.1
      });
    }

    return patterns;
  }

  /**
   * Store successful conversation embedding in ChromaDB
   */
  async storeSuccessfulConversationEmbedding(conversationId, transcript, metadata) {
    try {
      // Store in successful conversations collection
      await this.successfulConversationsCollection.add({
        ids: [conversationId],
        documents: [transcript],
        metadatas: [metadata]
      });

      logger.info(`Stored successful conversation embedding: ${conversationId}`);
    } catch (error) {
      logger.error(`Error storing conversation embedding:`, error);
    }
  }

  /**
   * Generate and store strategies based on call data
   */
  async generateStrategies(session, callData) {
    const { conversationId, industry, companySize, buyingSignals, objections, outcome, qualificationScore } = callData;

    const isSuccessful = outcome === 'qualified' || qualificationScore >= 70;

    if (!isSuccessful) return; // Only generate strategies from successful calls

    // Strategy: Signals that led to success
    if (buyingSignals && buyingSignals.length > 0) {
      const signalTypes = buyingSignals.map(s => s.type).join(',');
      const strategyId = `signals-${industry}-${signalTypes}`.replace(/\s+/g, '-').toLowerCase();

      await session.run(`
        MERGE (s:Strategy {strategyId: $strategyId})
        ON CREATE SET
          s.type = 'buying-signals',
          s.industry = $industry,
          s.companySize = $companySize,
          s.signals = $signalTypes,
          s.successCount = 1,
          s.totalUses = 1,
          s.confidence = 1.0,
          s.avgQualificationScore = toFloat($qualificationScore),
          s.createdAt = datetime()
        ON MATCH SET
          s.successCount = s.successCount + 1,
          s.totalUses = s.totalUses + 1,
          s.confidence = toFloat(s.successCount) / toFloat(s.totalUses),
          s.avgQualificationScore = (s.avgQualificationScore * (s.totalUses - 1) + $qualificationScore) / s.totalUses,
          s.updatedAt = datetime()
      `, { strategyId, industry, companySize, signalTypes, qualificationScore });

      // Link strategy to conversation
      await session.run(`
        MATCH (c:Conversation {conversationId: $conversationId})
        MATCH (s:Strategy {strategyId: $strategyId})
        MERGE (c)-[r:USED_STRATEGY]->(s)
        SET r.timestamp = datetime()
      `, { conversationId, strategyId });
    }

    // Strategy: Objection handling that led to success
    if (objections && objections.length > 0) {
      const overcomeObjections = objections.filter(o => o.wasOvercome);
      if (overcomeObjections.length > 0) {
        const objectionTypes = overcomeObjections.map(o => o.type).join(',');
        const strategyId = `objection-handling-${industry}-${objectionTypes}`.replace(/\s+/g, '-').toLowerCase();

        await session.run(`
          MERGE (s:Strategy {strategyId: $strategyId})
          ON CREATE SET
            s.type = 'objection-handling',
            s.industry = $industry,
            s.objections = $objectionTypes,
            s.successCount = 1,
            s.totalUses = 1,
            s.confidence = 1.0,
            s.createdAt = datetime()
          ON MATCH SET
            s.successCount = s.successCount + 1,
            s.totalUses = s.totalUses + 1,
            s.confidence = toFloat(s.successCount) / toFloat(s.totalUses),
            s.updatedAt = datetime()
        `, { strategyId, industry, objectionTypes });
      }
    }
  }

  /**
   * Retrieve relevant knowledge for a new lead before calling
   * Uses hybrid search combining Neo4j graph traversal and ChromaDB semantic search
   */
  async retrieveKnowledgeForLead(leadData) {
    const { leadId, industry, companySize, knownObjections, previousInteractions } = leadData;

    try {
      const knowledge = {
        similarLeads: [],
        successfulStrategies: [],
        relevantObjections: [],
        industryInsights: {},
        conversationPatterns: [],
        recommendations: []
      };

      const session = this.neo4jDriver.session();

      // 1. Find similar successful leads in the same industry
      const similarLeadsResult = await session.run(`
        MATCH (l:Lead {industry: $industry})
        WHERE l.successRate > 0.5 AND l.totalCalls >= 3
        OPTIONAL MATCH (l)-[:HAD_CONVERSATION]->(c:Conversation {isSuccessful: true})
        WITH l, COUNT(c) as successfulConversations
        ORDER BY l.successRate DESC, successfulConversations DESC
        LIMIT 5
        RETURN l, successfulConversations
      `, { industry });

      knowledge.similarLeads = similarLeadsResult.records.map(record => ({
        leadId: record.get('l').properties.leadId,
        successRate: record.get('l').properties.successRate,
        successfulConversations: record.get('successfulConversations').toNumber()
      }));

      // 2. Get successful strategies for this industry and company size
      const strategiesResult = await session.run(`
        MATCH (s:Strategy)
        WHERE s.industry = $industry
          AND (s.companySize = $companySize OR s.companySize IS NULL)
          AND s.confidence > 0.6
        RETURN s
        ORDER BY s.confidence DESC, s.successCount DESC
        LIMIT 10
      `, { industry, companySize });

      knowledge.successfulStrategies = strategiesResult.records.map(record => {
        const strategy = record.get('s').properties;
        return {
          strategyId: strategy.strategyId,
          type: strategy.type,
          confidence: strategy.confidence,
          successCount: strategy.successCount,
          signals: strategy.signals,
          objections: strategy.objections,
          avgQualificationScore: strategy.avgQualificationScore
        };
      });

      // 3. Get common objections and handling strategies for this industry
      const objectionsResult = await session.run(`
        MATCH (c:Conversation)-[:HAD_OBJECTION]->(o:Objection)
        MATCH (l:Lead {industry: $industry})-[:HAD_CONVERSATION]->(c)
        OPTIONAL MATCH (o)-[r:OVERCOME_BY]->(hs:HandlingStrategy)
        WITH o, hs, r.uses as uses
        ORDER BY o.totalOccurrences DESC, uses DESC
        RETURN o, COLLECT({strategy: hs.strategy, successRate: hs.successRate, uses: uses})[0..3] as handlingStrategies
        LIMIT 5
      `, { industry });

      knowledge.relevantObjections = objectionsResult.records.map(record => {
        const objection = record.get('o').properties;
        const strategies = record.get('handlingStrategies');
        return {
          type: objection.type,
          totalOccurrences: objection.totalOccurrences,
          overcomeRate: objection.overcomeRate,
          handlingStrategies: strategies.filter(s => s.strategy)
        };
      });

      // 4. Get industry insights
      const industryResult = await session.run(`
        MATCH (i:Industry {name: $industry})
        RETURN i
      `, { industry });

      if (industryResult.records.length > 0) {
        const industryNode = industryResult.records[0].get('i').properties;
        knowledge.industryInsights = {
          successRate: industryNode.successRate,
          avgQualificationScore: industryNode.avgQualificationScore,
          totalCalls: industryNode.totalCalls
        };
      }

      // 5. Get successful conversation patterns for this industry
      const patternsResult = await session.run(`
        MATCH (c:Conversation)-[:EXHIBITED_PATTERN]->(p:ConversationPattern)
        MATCH (l:Lead {industry: $industry})-[:HAD_CONVERSATION]->(c)
        WHERE c.isSuccessful = true AND p.successRate > 0.6
        WITH p, COUNT(c) as usageCount
        RETURN p, usageCount
        ORDER BY p.successRate DESC, usageCount DESC
        LIMIT 10
      `, { industry });

      knowledge.conversationPatterns = patternsResult.records.map(record => {
        const pattern = record.get('p').properties;
        return {
          patternId: pattern.patternId,
          type: pattern.type,
          successRate: pattern.successRate,
          features: JSON.parse(pattern.features || '{}'),
          usageCount: record.get('usageCount').toNumber()
        };
      });

      // 6. Get buying signals that are most effective for this industry
      const signalsResult = await session.run(`
        MATCH (c:Conversation)-[:EXHIBITED_SIGNAL]->(s:BuyingSignal)
        MATCH (l:Lead {industry: $industry})-[:HAD_CONVERSATION]->(c)
        WHERE c.isSuccessful = true
        WITH s, COUNT(c) as appearances
        RETURN s, appearances
        ORDER BY s.successRate DESC, appearances DESC
        LIMIT 10
      `, { industry });

      const effectiveSignals = signalsResult.records.map(record => {
        const signal = record.get('s').properties;
        return {
          name: signal.name,
          successRate: signal.successRate,
          appearances: record.get('appearances').toNumber()
        };
      });

      // 7. Query ChromaDB for semantically similar successful conversations
      let semanticResults = [];
      if (previousInteractions && previousInteractions.length > 0) {
        const query = previousInteractions.join(' ');
        try {
          const chromaResults = await this.successfulConversationsCollection.query({
            queryTexts: [query],
            nResults: 5,
            where: { industry }
          });

          if (chromaResults && chromaResults.documents && chromaResults.documents[0]) {
            semanticResults = chromaResults.documents[0].map((doc, idx) => ({
              conversationId: chromaResults.ids[0][idx],
              similarity: chromaResults.distances ? 1 - chromaResults.distances[0][idx] : 0,
              metadata: chromaResults.metadatas[0][idx]
            }));
          }
        } catch (error) {
          logger.warn('ChromaDB query failed, continuing without semantic results:', error);
        }
      }

      await session.close();

      // 8. Generate recommendations based on retrieved knowledge
      knowledge.recommendations = this.generateRecommendations(
        knowledge,
        effectiveSignals,
        semanticResults
      );

      logger.info(`Retrieved knowledge for lead ${leadId}: ${knowledge.recommendations.length} recommendations`);
      return knowledge;
    } catch (error) {
      logger.error(`Error retrieving knowledge for lead:`, error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations based on retrieved knowledge
   */
  generateRecommendations(knowledge, effectiveSignals, semanticResults) {
    const recommendations = [];

    // Recommendation 1: Industry success rate
    if (knowledge.industryInsights.successRate) {
      recommendations.push({
        type: 'industry-insight',
        priority: 'medium',
        message: `Industry success rate: ${(knowledge.industryInsights.successRate * 100).toFixed(1)}%. ` +
                 `Average qualification score: ${knowledge.industryInsights.avgQualificationScore?.toFixed(1) || 'N/A'}`,
        data: knowledge.industryInsights
      });
    }

    // Recommendation 2: Top strategies to use
    if (knowledge.successfulStrategies.length > 0) {
      const topStrategy = knowledge.successfulStrategies[0];
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        message: `Use ${topStrategy.type} strategy with ${(topStrategy.confidence * 100).toFixed(0)}% confidence. ` +
                 `${topStrategy.signals ? 'Focus on signals: ' + topStrategy.signals : ''}`,
        data: topStrategy
      });
    }

    // Recommendation 3: Objection preparation
    if (knowledge.relevantObjections.length > 0) {
      const topObjections = knowledge.relevantObjections.slice(0, 3).map(o => o.type).join(', ');
      recommendations.push({
        type: 'objection-prep',
        priority: 'high',
        message: `Prepare for common objections: ${topObjections}`,
        data: knowledge.relevantObjections
      });
    }

    // Recommendation 4: Conversation patterns to follow
    if (knowledge.conversationPatterns.length > 0) {
      const topPattern = knowledge.conversationPatterns[0];
      recommendations.push({
        type: 'conversation-pattern',
        priority: 'medium',
        message: `Successful pattern: ${topPattern.type} with ${(topPattern.successRate * 100).toFixed(0)}% success rate`,
        data: topPattern
      });
    }

    // Recommendation 5: Buying signals to watch for
    if (effectiveSignals.length > 0) {
      const topSignals = effectiveSignals.slice(0, 3).map(s => s.name).join(', ');
      recommendations.push({
        type: 'buying-signals',
        priority: 'high',
        message: `Watch for these effective buying signals: ${topSignals}`,
        data: effectiveSignals
      });
    }

    // Recommendation 6: Similar conversation insights
    if (semanticResults.length > 0) {
      recommendations.push({
        type: 'similar-conversations',
        priority: 'medium',
        message: `Found ${semanticResults.length} similar successful conversations for reference`,
        data: semanticResults
      });
    }

    return recommendations;
  }

  /**
   * Get analytics and insights from the knowledge graph
   */
  async getAnalytics() {
    const session = this.neo4jDriver.session();

    try {
      const analytics = {};

      // 1. Overall success metrics
      const overallResult = await session.run(`
        MATCH (c:Conversation)
        WITH COUNT(c) as total,
             SUM(CASE WHEN c.isSuccessful THEN 1 ELSE 0 END) as successful
        RETURN total, successful,
               toFloat(successful) / toFloat(total) as successRate
      `);

      if (overallResult.records.length > 0) {
        const record = overallResult.records[0];
        analytics.overall = {
          totalConversations: record.get('total').toNumber(),
          successfulConversations: record.get('successful').toNumber(),
          successRate: record.get('successRate')
        };
      }

      // 2. Industry performance
      const industryResult = await session.run(`
        MATCH (i:Industry)
        RETURN i.name as industry,
               i.successRate as successRate,
               i.totalCalls as totalCalls,
               i.avgQualificationScore as avgScore
        ORDER BY i.successRate DESC
        LIMIT 10
      `);

      analytics.topIndustries = industryResult.records.map(record => ({
        industry: record.get('industry'),
        successRate: record.get('successRate'),
        totalCalls: record.get('totalCalls').toNumber(),
        avgQualificationScore: record.get('avgScore')
      }));

      // 3. Most effective buying signals
      const signalsResult = await session.run(`
        MATCH (s:BuyingSignal)
        WHERE s.totalOccurrences >= 5
        RETURN s.name as signal,
               s.successRate as successRate,
               s.totalOccurrences as occurrences
        ORDER BY s.successRate DESC
        LIMIT 10
      `);

      analytics.topBuyingSignals = signalsResult.records.map(record => ({
        signal: record.get('signal'),
        successRate: record.get('successRate'),
        occurrences: record.get('occurrences').toNumber()
      }));

      // 4. Most effective conversation patterns
      const patternsResult = await session.run(`
        MATCH (p:ConversationPattern)
        WHERE p.totalOccurrences >= 5
        RETURN p.type as pattern,
               p.successRate as successRate,
               p.totalOccurrences as occurrences
        ORDER BY p.successRate DESC
        LIMIT 10
      `);

      analytics.topPatterns = patternsResult.records.map(record => ({
        pattern: record.get('pattern'),
        successRate: record.get('successRate'),
        occurrences: record.get('occurrences').toNumber()
      }));

      // 5. Common objections and handling effectiveness
      const objectionsResult = await session.run(`
        MATCH (o:Objection)
        RETURN o.type as objection,
               o.overcomeRate as overcomeRate,
               o.totalOccurrences as occurrences
        ORDER BY o.totalOccurrences DESC
        LIMIT 10
      `);

      analytics.commonObjections = objectionsResult.records.map(record => ({
        objection: record.get('objection'),
        overcomeRate: record.get('overcomeRate'),
        occurrences: record.get('occurrences').toNumber()
      }));

      // 6. Top performing strategies
      const strategiesResult = await session.run(`
        MATCH (s:Strategy)
        WHERE s.totalUses >= 3
        RETURN s.type as type,
               s.industry as industry,
               s.confidence as confidence,
               s.successCount as successCount
        ORDER BY s.confidence DESC
        LIMIT 15
      `);

      analytics.topStrategies = strategiesResult.records.map(record => ({
        type: record.get('type'),
        industry: record.get('industry'),
        confidence: record.get('confidence'),
        successCount: record.get('successCount').toNumber()
      }));

      // 7. Learning progress over time
      const progressResult = await session.run(`
        MATCH (c:Conversation)
        WITH date(c.timestamp) as date, c.isSuccessful as successful
        WITH date, COUNT(*) as total, SUM(CASE WHEN successful THEN 1 ELSE 0 END) as successful
        RETURN date, total, successful, toFloat(successful)/toFloat(total) as successRate
        ORDER BY date DESC
        LIMIT 30
      `);

      analytics.learningProgress = progressResult.records.map(record => ({
        date: record.get('date').toString(),
        totalCalls: record.get('total').toNumber(),
        successfulCalls: record.get('successful').toNumber(),
        successRate: record.get('successRate')
      }));

      await session.close();
      return analytics;
    } catch (error) {
      logger.error('Error getting analytics:', error);
      await session.close();
      throw error;
    }
  }

  /**
   * Close connections
   */
  async close() {
    await this.neo4jDriver.close();
    logger.info('Graph RAG service connections closed');
  }
}

module.exports = new GraphRAGService();
