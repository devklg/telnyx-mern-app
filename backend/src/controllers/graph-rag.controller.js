/**
 * Graph RAG Controller
 * Handles API endpoints for knowledge retrieval, learning, and analytics
 */

const graphRAGService = require('../services/graph-rag.service');
const CallLog = require('../database/mongodb/schemas/calllog.schema');
const Conversation = require('../database/mongodb/schemas/conversation.schema');
const Lead = require('../database/mongodb/schemas/lead.schema');
const logger = require('../utils/logger');

/**
 * Initialize the Graph RAG system
 */
exports.initialize = async (req, res) => {
  try {
    await graphRAGService.initialize();
    res.json({
      success: true,
      message: 'Graph RAG system initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing Graph RAG system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize Graph RAG system',
      error: error.message
    });
  }
};

/**
 * Manually trigger learning from a specific call
 */
exports.learnFromCall = async (req, res) => {
  try {
    const { callId } = req.params;

    // Fetch call log
    const callLog = await CallLog.findOne({ callId });
    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Fetch conversation
    const conversation = await Conversation.findOne({ _id: callLog.conversationId });

    // Fetch lead
    const lead = await Lead.findById(callLog.leadId);

    // Prepare call data for learning
    const callData = {
      leadId: callLog.leadId.toString(),
      conversationId: callLog.conversationId?.toString() || callId,
      transcript: callLog.transcription?.text || '',
      outcome: callLog.outcome?.result || 'unknown',
      qualificationScore: conversation?.aiAnalysis?.qualification?.score || 0,
      buyingSignals: conversation?.aiAnalysis?.buyingSignals || [],
      objections: conversation?.aiAnalysis?.objections || [],
      duration: callLog.duration?.talking || 0,
      industry: lead?.company?.industry || 'unknown',
      companySize: lead?.company?.size || 'unknown',
      engagementMetrics: {
        talkRatio: callLog.speechAnalytics?.talkRatio || 0.5,
        interruptions: callLog.speechAnalytics?.interruptions || 0,
        avgResponseTime: conversation?.aiAnalysis?.responseTime || 3,
        phases: conversation?.aiAnalysis?.conversationPhases || {}
      }
    };

    // Learn from the call
    const result = await graphRAGService.learnFromCall(callData);

    res.json({
      success: true,
      message: 'Successfully learned from call',
      data: result
    });
  } catch (error) {
    logger.error('Error learning from call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to learn from call',
      error: error.message
    });
  }
};

/**
 * Retrieve knowledge for a lead before calling
 */
exports.getKnowledgeForLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    // Fetch lead details
    const lead = await Lead.findById(leadId)
      .populate('conversationHistory.conversationId');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Prepare lead data
    const leadData = {
      leadId: lead._id.toString(),
      industry: lead.company?.industry || 'unknown',
      companySize: lead.company?.size || 'unknown',
      knownObjections: lead.aiInsights?.objections || [],
      previousInteractions: lead.conversationHistory?.map(ch => ch.summary).filter(Boolean) || []
    };

    // Retrieve knowledge
    const knowledge = await graphRAGService.retrieveKnowledgeForLead(leadData);

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    logger.error('Error retrieving knowledge for lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge for lead',
      error: error.message
    });
  }
};

/**
 * Get analytics and insights from the knowledge graph
 */
exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await graphRAGService.getAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * Batch learn from multiple calls
 */
exports.batchLearn = async (req, res) => {
  try {
    const { startDate, endDate, minQualificationScore } = req.body;

    // Build query
    const query = {
      'outcome.result': { $in: ['qualified', 'not-qualified', 'callback', 'meeting-scheduled'] }
    };

    if (startDate || endDate) {
      query.initiatedAt = {};
      if (startDate) query.initiatedAt.$gte = new Date(startDate);
      if (endDate) query.initiatedAt.$lte = new Date(endDate);
    }

    // Fetch calls
    const calls = await CallLog.find(query).limit(1000);

    const results = {
      total: calls.length,
      processed: 0,
      failed: 0,
      errors: []
    };

    // Process each call
    for (const callLog of calls) {
      try {
        const conversation = await Conversation.findOne({ _id: callLog.conversationId });
        const lead = await Lead.findById(callLog.leadId);

        // Skip if missing data or below qualification threshold
        if (!conversation || !lead) continue;

        const qualScore = conversation.aiAnalysis?.qualification?.score || 0;
        if (minQualificationScore && qualScore < minQualificationScore) continue;

        const callData = {
          leadId: callLog.leadId.toString(),
          conversationId: callLog.conversationId?.toString() || callLog.callId,
          transcript: callLog.transcription?.text || '',
          outcome: callLog.outcome?.result || 'unknown',
          qualificationScore: qualScore,
          buyingSignals: conversation.aiAnalysis?.buyingSignals || [],
          objections: conversation.aiAnalysis?.objections || [],
          duration: callLog.duration?.talking || 0,
          industry: lead.company?.industry || 'unknown',
          companySize: lead.company?.size || 'unknown',
          engagementMetrics: {
            talkRatio: callLog.speechAnalytics?.talkRatio || 0.5,
            interruptions: callLog.speechAnalytics?.interruptions || 0,
            avgResponseTime: conversation.aiAnalysis?.responseTime || 3,
            phases: conversation.aiAnalysis?.conversationPhases || {}
          }
        };

        await graphRAGService.learnFromCall(callData);
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          callId: callLog.callId,
          error: error.message
        });
        logger.error(`Error processing call ${callLog.callId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Batch learning completed`,
      data: results
    });
  } catch (error) {
    logger.error('Error in batch learning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform batch learning',
      error: error.message
    });
  }
};

/**
 * Get specific insights for an industry
 */
exports.getIndustryInsights = async (req, res) => {
  try {
    const { industry } = req.params;

    const session = graphRAGService.neo4jDriver.session();

    try {
      // Get industry node
      const industryResult = await session.run(`
        MATCH (i:Industry {name: $industry})
        RETURN i
      `, { industry });

      if (industryResult.records.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Industry not found in knowledge graph'
        });
      }

      const industryNode = industryResult.records[0].get('i').properties;

      // Get top strategies for this industry
      const strategiesResult = await session.run(`
        MATCH (s:Strategy {industry: $industry})
        WHERE s.confidence > 0.5
        RETURN s
        ORDER BY s.confidence DESC
        LIMIT 10
      `, { industry });

      const strategies = strategiesResult.records.map(r => r.get('s').properties);

      // Get common objections
      const objectionsResult = await session.run(`
        MATCH (c:Conversation)-[:HAD_OBJECTION]->(o:Objection)
        MATCH (l:Lead {industry: $industry})-[:HAD_CONVERSATION]->(c)
        WITH o, COUNT(c) as frequency
        RETURN o, frequency
        ORDER BY frequency DESC
        LIMIT 10
      `, { industry });

      const objections = objectionsResult.records.map(r => ({
        ...r.get('o').properties,
        frequency: r.get('frequency').toNumber()
      }));

      // Get effective buying signals
      const signalsResult = await session.run(`
        MATCH (c:Conversation)-[:EXHIBITED_SIGNAL]->(s:BuyingSignal)
        MATCH (l:Lead {industry: $industry})-[:HAD_CONVERSATION]->(c)
        WHERE c.isSuccessful = true
        WITH s, COUNT(c) as frequency
        RETURN s, frequency
        ORDER BY s.successRate DESC, frequency DESC
        LIMIT 10
      `, { industry });

      const signals = signalsResult.records.map(r => ({
        ...r.get('s').properties,
        frequency: r.get('frequency').toNumber()
      }));

      const insights = {
        industry: {
          name: industry,
          successRate: industryNode.successRate,
          avgQualificationScore: industryNode.avgQualificationScore,
          totalCalls: industryNode.totalCalls
        },
        topStrategies: strategies,
        commonObjections: objections,
        effectiveSignals: signals
      };

      res.json({
        success: true,
        data: insights
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Error getting industry insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get industry insights',
      error: error.message
    });
  }
};

/**
 * Get recommendations for improving qualification
 */
exports.getImprovementRecommendations = async (req, res) => {
  try {
    const session = graphRAGService.neo4jDriver.session();

    try {
      const recommendations = [];

      // 1. Find underperforming industries
      const underperformingResult = await session.run(`
        MATCH (i:Industry)
        WHERE i.totalCalls >= 10 AND i.successRate < 0.3
        RETURN i
        ORDER BY i.successRate ASC
        LIMIT 5
      `);

      if (underperformingResult.records.length > 0) {
        recommendations.push({
          type: 'underperforming-industries',
          priority: 'high',
          industries: underperformingResult.records.map(r => {
            const i = r.get('i').properties;
            return {
              name: i.name,
              successRate: i.successRate,
              totalCalls: i.totalCalls
            };
          }),
          message: 'These industries have low success rates and need strategy improvement'
        });
      }

      // 2. Find frequently unovercome objections
      const difficultObjectionsResult = await session.run(`
        MATCH (o:Objection)
        WHERE o.totalOccurrences >= 5 AND o.overcomeRate < 0.5
        RETURN o
        ORDER BY o.totalOccurrences DESC
        LIMIT 5
      `);

      if (difficultObjectionsResult.records.length > 0) {
        recommendations.push({
          type: 'difficult-objections',
          priority: 'high',
          objections: difficultObjectionsResult.records.map(r => {
            const o = r.get('o').properties;
            return {
              type: o.type,
              overcomeRate: o.overcomeRate,
              totalOccurrences: o.totalOccurrences
            };
          }),
          message: 'These objections are frequently encountered but rarely overcome. Develop better handling strategies.'
        });
      }

      // 3. Find low-confidence strategies
      const lowConfidenceResult = await session.run(`
        MATCH (s:Strategy)
        WHERE s.totalUses >= 5 AND s.confidence < 0.5
        RETURN s
        ORDER BY s.totalUses DESC
        LIMIT 5
      `);

      if (lowConfidenceResult.records.length > 0) {
        recommendations.push({
          type: 'low-confidence-strategies',
          priority: 'medium',
          strategies: lowConfidenceResult.records.map(r => {
            const s = r.get('s').properties;
            return {
              strategyId: s.strategyId,
              type: s.type,
              confidence: s.confidence,
              industry: s.industry
            };
          }),
          message: 'These strategies have low success rates. Consider retiring or refining them.'
        });
      }

      // 4. Find successful patterns to replicate
      const successfulPatternsResult = await session.run(`
        MATCH (p:ConversationPattern)
        WHERE p.totalOccurrences >= 10 AND p.successRate > 0.7
        RETURN p
        ORDER BY p.successRate DESC
        LIMIT 5
      `);

      if (successfulPatternsResult.records.length > 0) {
        recommendations.push({
          type: 'successful-patterns',
          priority: 'medium',
          patterns: successfulPatternsResult.records.map(r => {
            const p = r.get('p').properties;
            return {
              type: p.type,
              successRate: p.successRate,
              occurrences: p.totalOccurrences
            };
          }),
          message: 'These conversation patterns have high success rates. Train agents to use them more.'
        });
      }

      res.json({
        success: true,
        data: {
          recommendations,
          generatedAt: new Date()
        }
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Error getting improvement recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get improvement recommendations',
      error: error.message
    });
  }
};

/**
 * Search for similar successful conversations
 */
exports.searchSimilarConversations = async (req, res) => {
  try {
    const { query, industry, minQualificationScore, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query text is required'
      });
    }

    const whereClause = {};
    if (industry) whereClause.industry = industry;

    const results = await graphRAGService.successfulConversationsCollection.query({
      queryTexts: [query],
      nResults: limit || 10,
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined
    });

    const conversations = [];
    if (results && results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        const metadata = results.metadatas[0][i];

        // Filter by qualification score if specified
        if (minQualificationScore && metadata.qualificationScore < minQualificationScore) {
          continue;
        }

        conversations.push({
          conversationId: results.ids[0][i],
          text: results.documents[0][i],
          similarity: results.distances ? 1 - results.distances[0][i] : 0,
          metadata
        });
      }
    }

    res.json({
      success: true,
      data: {
        query,
        conversations,
        count: conversations.length
      }
    });
  } catch (error) {
    logger.error('Error searching similar conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search similar conversations',
      error: error.message
    });
  }
};

/**
 * Get knowledge graph statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const session = graphRAGService.neo4jDriver.session();

    try {
      // Get node counts
      const nodeCountsResult = await session.run(`
        MATCH (n)
        RETURN labels(n)[0] as label, COUNT(n) as count
        ORDER BY count DESC
      `);

      const nodeCounts = {};
      nodeCountsResult.records.forEach(r => {
        nodeCounts[r.get('label')] = r.get('count').toNumber();
      });

      // Get relationship counts
      const relCountsResult = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as type, COUNT(r) as count
        ORDER BY count DESC
      `);

      const relationshipCounts = {};
      relCountsResult.records.forEach(r => {
        relationshipCounts[r.get('type')] = r.get('count').toNumber();
      });

      // Get learning velocity (conversations per day in last 30 days)
      const velocityResult = await session.run(`
        MATCH (c:Conversation)
        WHERE c.timestamp >= datetime() - duration({days: 30})
        WITH date(c.timestamp) as date, COUNT(c) as count
        RETURN AVG(count) as avgPerDay, SUM(count) as total
      `);

      let learningVelocity = { avgPerDay: 0, totalLast30Days: 0 };
      if (velocityResult.records.length > 0) {
        learningVelocity = {
          avgPerDay: velocityResult.records[0].get('avgPerDay'),
          totalLast30Days: velocityResult.records[0].get('total').toNumber()
        };
      }

      res.json({
        success: true,
        data: {
          nodes: nodeCounts,
          relationships: relationshipCounts,
          learningVelocity,
          timestamp: new Date()
        }
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

module.exports = exports;
