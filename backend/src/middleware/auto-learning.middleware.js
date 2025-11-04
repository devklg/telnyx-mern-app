/**
 * Auto-Learning Middleware
 * Automatically learns from completed calls to improve the system
 */

const graphRAGService = require('../services/graph-rag.service');
const CallLog = require('../database/mongodb/schemas/calllog.schema');
const Conversation = require('../database/mongodb/schemas/conversation.schema');
const Lead = require('../database/mongodb/schemas/lead.schema');
const logger = require('../utils/logger');

/**
 * Middleware to automatically learn from a call when it ends
 * Attach this to the call completion endpoint
 */
exports.learnFromCompletedCall = async (req, res, next) => {
  try {
    // Continue the response to the user immediately
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Send response to user
      originalJson(data);

      // Then process learning asynchronously
      if (data.success && req.callData) {
        processCallLearning(req.callData).catch(error => {
          logger.error('Background learning failed:', error);
        });
      }
    };

    next();
  } catch (error) {
    logger.error('Error in auto-learning middleware:', error);
    next(); // Don't block the request
  }
};

/**
 * Process call learning asynchronously
 */
async function processCallLearning(callData) {
  try {
    const { callId, leadId, conversationId } = callData;

    // Fetch call log
    const callLog = await CallLog.findOne({ callId });
    if (!callLog) {
      logger.warn(`Call log not found for auto-learning: ${callId}`);
      return;
    }

    // Only learn from completed calls with meaningful duration
    if (callLog.status !== 'completed' || !callLog.duration?.talking || callLog.duration.talking < 30) {
      logger.info(`Skipping learning for call ${callId}: not completed or too short`);
      return;
    }

    // Fetch conversation
    const conversation = await Conversation.findOne({
      _id: conversationId || callLog.conversationId
    });

    // Fetch lead
    const lead = await Lead.findById(leadId || callLog.leadId);

    if (!lead) {
      logger.warn(`Lead not found for auto-learning: ${leadId}`);
      return;
    }

    // Extract buying signals from AI analysis
    const buyingSignals = [];
    if (conversation?.aiAnalysis?.buyingSignals) {
      conversation.aiAnalysis.buyingSignals.forEach(signal => {
        buyingSignals.push({
          type: signal.type || signal,
          confidence: signal.confidence || 0.8,
          context: signal.context || ''
        });
      });
    }

    // Extract objections from AI analysis
    const objections = [];
    if (conversation?.aiAnalysis?.objections) {
      conversation.aiAnalysis.objections.forEach(objection => {
        objections.push({
          type: objection.type || objection,
          handlingStrategy: objection.handlingStrategy || '',
          wasOvercome: objection.wasOvercome || false
        });
      });
    }

    // Prepare comprehensive call data for learning
    const learningData = {
      leadId: (leadId || callLog.leadId).toString(),
      conversationId: (conversationId || callLog.conversationId)?.toString() || callId,
      transcript: callLog.transcription?.text || conversation?.messages?.map(m => m.content).join(' ') || '',
      outcome: callLog.outcome?.result || 'unknown',
      qualificationScore: conversation?.aiAnalysis?.qualification?.score ||
                          callLog.qualificationScore || 0,
      buyingSignals,
      objections,
      duration: callLog.duration.talking,
      industry: lead.company?.industry || 'unknown',
      companySize: lead.company?.size || 'unknown',
      engagementMetrics: {
        talkRatio: callLog.speechAnalytics?.talkRatio || 0.5,
        interruptions: callLog.speechAnalytics?.interruptions || 0,
        avgResponseTime: conversation?.aiAnalysis?.avgResponseTime ||
                        conversation?.aiAnalysis?.responseTime || 3,
        phases: conversation?.aiAnalysis?.conversationPhases ||
                conversation?.aiAnalysis?.phases || {},
        speakingRate: callLog.speechAnalytics?.speakingRate,
        sentiment: conversation?.sentiment?.overall || callLog.sentiment?.overall
      }
    };

    // Learn from the call
    logger.info(`Starting auto-learning from call ${callId}`);
    await graphRAGService.learnFromCall(learningData);
    logger.info(`Successfully learned from call ${callId}`);

  } catch (error) {
    logger.error(`Error in background learning process:`, error);
  }
}

/**
 * Middleware to attach call data to request for learning
 * Use this before the call completion handler
 */
exports.attachCallData = (req, res, next) => {
  const { callId } = req.params;
  const { leadId, conversationId } = req.body;

  req.callData = {
    callId,
    leadId,
    conversationId
  };

  next();
};

/**
 * Enrich voice agent request with knowledge from Graph RAG
 * Use this when initiating a call to provide context to the voice agent
 */
exports.enrichWithKnowledge = async (req, res, next) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return next(); // No lead ID, skip enrichment
    }

    // Fetch lead
    const lead = await Lead.findById(leadId)
      .populate('conversationHistory.conversationId');

    if (!lead) {
      return next(); // Lead not found, skip enrichment
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

    // Attach knowledge to request
    req.graphKnowledge = knowledge;

    // Add knowledge summary to response (optional)
    if (knowledge.recommendations.length > 0) {
      logger.info(`Retrieved ${knowledge.recommendations.length} recommendations for lead ${leadId}`);
    }

    next();
  } catch (error) {
    logger.error('Error enriching with knowledge:', error);
    // Don't block the request if enrichment fails
    next();
  }
};

/**
 * Initialize Graph RAG on server startup
 */
exports.initializeGraphRAG = async () => {
  try {
    logger.info('Initializing Graph RAG system...');
    await graphRAGService.initialize();
    logger.info('Graph RAG system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Graph RAG system:', error);
    // Don't crash the server if initialization fails
  }
};

/**
 * Periodic batch learning job
 * Run this as a cron job to periodically learn from recent calls
 */
exports.periodicBatchLearning = async () => {
  try {
    logger.info('Starting periodic batch learning...');

    // Learn from calls in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentCalls = await CallLog.find({
      initiatedAt: { $gte: yesterday },
      status: 'completed',
      'duration.talking': { $gte: 30 }
    });

    logger.info(`Found ${recentCalls.length} calls to learn from`);

    let processed = 0;
    let failed = 0;

    for (const callLog of recentCalls) {
      try {
        // Check if we've already learned from this call
        // (You could add a field to CallLog to track this)

        const callData = {
          callId: callLog.callId,
          leadId: callLog.leadId?.toString(),
          conversationId: callLog.conversationId?.toString()
        };

        await processCallLearning(callData);
        processed++;
      } catch (error) {
        failed++;
        logger.error(`Failed to learn from call ${callLog.callId}:`, error);
      }
    }

    logger.info(`Periodic batch learning completed: ${processed} processed, ${failed} failed`);
  } catch (error) {
    logger.error('Error in periodic batch learning:', error);
  }
};

module.exports = exports;
