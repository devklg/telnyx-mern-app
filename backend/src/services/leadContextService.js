/**
 * Lead Context Assembly Service
 *
 * Gathers comprehensive lead context from all data sources:
 * - Lead contact info, status, scores, tags from MongoDB
 * - Call history (dates, outcomes, transcripts) from MongoDB
 * - Qualification scores (BANTI from Ron Maleziis)
 * - Interaction recency calculations
 * - Partner's success patterns from historical data
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const Lead = require('../models/Lead');
const Call = require('../database/mongodb/schemas/call.schema');
const { pgPool } = require('../config/database');

/**
 * Assemble complete context for a single lead
 * @param {String} leadId - MongoDB Lead ID
 * @param {String} userId - Partner/User ID (optional)
 * @returns {Object} Complete lead context object
 */
async function assembleLeadContext(leadId, userId = null) {
  try {
    // 1. Fetch lead basic data from MongoDB
    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // 2. Fetch call history from MongoDB (last 10 calls)
    const callHistory = await Call.find({ leadId })
      .sort({ startedAt: -1 })
      .limit(10)
      .select('startedAt endedAt duration status transcript aiAnalysis recordingUrl')
      .lean();

    // 3. Calculate interaction recency
    const interactionRecency = calculateInteractionRecency(callHistory);

    // 4. Extract qualification scores (BANTI)
    const qualificationScores = {
      businessInterest: lead.businessInterest || 0,
      employmentStatus: lead.employmentStatus || 0,
      incomeCommitment: lead.incomeCommitment || 0,
      personalExperience: lead.personalExperience || 0,
      decisionMaking: lead.decisionMaking || 0,
      total: lead.qualificationScore || 0
    };

    // 5. Get latest call summary
    const latestCallSummary = callHistory.length > 0
      ? extractCallSummary(callHistory[0])
      : null;

    // 6. Extract conversation patterns
    const conversationPatterns = analyzeConversationPatterns(callHistory);

    // 7. Get partner success patterns (if userId provided)
    const partnerPatterns = userId
      ? await getPartnerSuccessPatterns(userId)
      : null;

    // 8. Calculate lead priority signals
    const prioritySignals = calculatePrioritySignals(lead, callHistory, qualificationScores);

    // Assemble complete context
    return {
      leadId: lead._id.toString(),
      contactInfo: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        email: lead.email,
        timezone: lead.timezone || 'America/New_York'
      },
      status: {
        current: lead.status,
        doNotCall: lead.doNotCall || false,
        lastContactedAt: lead.lastContactedAt,
        qualifiedAt: lead.qualifiedAt
      },
      qualificationScores,
      interactionRecency,
      callHistory: callHistory.map(call => ({
        date: call.startedAt,
        duration: call.duration,
        status: call.status,
        outcome: call.aiAnalysis?.summary || 'No summary available',
        qualificationScore: call.aiAnalysis?.qualificationScore,
        transcriptPreview: call.transcript
          ? call.transcript.substring(0, 500) + '...'
          : 'No transcript available'
      })),
      latestCallSummary,
      conversationPatterns,
      partnerPatterns,
      prioritySignals,
      metadata: {
        totalCalls: callHistory.length,
        importedAt: lead.importedAt,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      }
    };
  } catch (error) {
    console.error('Error assembling lead context:', error);
    throw error;
  }
}

/**
 * Calculate days since last interaction
 * @param {Array} callHistory - Array of call records
 * @returns {Object} Recency metrics
 */
function calculateInteractionRecency(callHistory) {
  if (!callHistory || callHistory.length === 0) {
    return {
      daysSinceLastContact: null,
      hasRecentContact: false,
      lastContactDate: null,
      contactFrequency: 'never'
    };
  }

  const lastCall = callHistory[0];
  const lastContactDate = new Date(lastCall.startedAt);
  const now = new Date();
  const daysSinceLastContact = Math.floor((now - lastContactDate) / (1000 * 60 * 60 * 24));

  // Determine contact frequency
  let contactFrequency = 'low';
  if (callHistory.length >= 5) {
    contactFrequency = 'high';
  } else if (callHistory.length >= 3) {
    contactFrequency = 'medium';
  }

  return {
    daysSinceLastContact,
    hasRecentContact: daysSinceLastContact <= 7,
    lastContactDate: lastContactDate.toISOString(),
    contactFrequency,
    totalInteractions: callHistory.length
  };
}

/**
 * Extract summary from latest call
 * @param {Object} call - Call record
 * @returns {Object} Call summary
 */
function extractCallSummary(call) {
  return {
    date: call.startedAt,
    duration: call.duration,
    outcome: call.status,
    qualificationScore: call.aiAnalysis?.qualificationScore || 0,
    sentiment: call.aiAnalysis?.sentiment || 'neutral',
    keywords: call.aiAnalysis?.keywords || [],
    summary: call.aiAnalysis?.summary || 'No summary available',
    transcriptAvailable: !!call.transcript
  };
}

/**
 * Analyze conversation patterns across all calls
 * @param {Array} callHistory - Array of call records
 * @returns {Object} Conversation patterns
 */
function analyzeConversationPatterns(callHistory) {
  if (!callHistory || callHistory.length === 0) {
    return {
      commonObjections: [],
      positiveSentimentCount: 0,
      negativeSentimentCount: 0,
      averageCallDuration: 0,
      qualificationTrend: 'unknown'
    };
  }

  let totalDuration = 0;
  let positiveSentimentCount = 0;
  let negativeSentimentCount = 0;
  const allKeywords = [];
  const qualificationScores = [];

  callHistory.forEach(call => {
    totalDuration += call.duration || 0;

    const sentiment = call.aiAnalysis?.sentiment?.toLowerCase();
    if (sentiment === 'positive' || sentiment === 'interested') {
      positiveSentimentCount++;
    } else if (sentiment === 'negative' || sentiment === 'not_interested') {
      negativeSentimentCount++;
    }

    if (call.aiAnalysis?.keywords) {
      allKeywords.push(...call.aiAnalysis.keywords);
    }

    if (call.aiAnalysis?.qualificationScore) {
      qualificationScores.push(call.aiAnalysis.qualificationScore);
    }
  });

  // Detect common objections from keywords
  const objectionKeywords = ['expensive', 'cost', 'money', 'time', 'busy', 'think about it', 'not sure'];
  const commonObjections = allKeywords
    .filter(keyword => objectionKeywords.some(obj => keyword.toLowerCase().includes(obj)))
    .slice(0, 5);

  // Determine qualification trend
  let qualificationTrend = 'stable';
  if (qualificationScores.length >= 2) {
    const recent = qualificationScores[0];
    const older = qualificationScores[qualificationScores.length - 1];
    if (recent > older + 10) qualificationTrend = 'improving';
    if (recent < older - 10) qualificationTrend = 'declining';
  }

  return {
    commonObjections,
    positiveSentimentCount,
    negativeSentimentCount,
    averageCallDuration: Math.round(totalDuration / callHistory.length),
    qualificationTrend,
    engagementLevel: positiveSentimentCount > negativeSentimentCount ? 'high' : 'low'
  };
}

/**
 * Get partner's historical success patterns
 * @param {String} userId - Partner/User ID
 * @returns {Object} Success patterns
 */
async function getPartnerSuccessPatterns(userId) {
  try {
    // Get successful leads (qualified/transferred) for this partner
    const successfulLeads = await Lead.find({
      assignedTo: userId,
      status: { $in: ['qualified', 'transferred', 'completed'] }
    })
    .limit(20)
    .lean();

    // Get their call history
    const successfulCallIds = successfulLeads.map(lead => lead._id);
    const successfulCalls = await Call.find({
      leadId: { $in: successfulCallIds }
    }).lean();

    // Analyze what makes this partner successful
    const patterns = {
      averageCallsToQualification: 0,
      bestContactTimes: [],
      successfulApproaches: [],
      conversionRate: 0
    };

    if (successfulLeads.length > 0) {
      // Calculate average calls to qualification
      let totalCalls = 0;
      successfulLeads.forEach(lead => {
        totalCalls += lead.calls?.length || 0;
      });
      patterns.averageCallsToQualification = Math.round(totalCalls / successfulLeads.length);

      // Analyze best contact times (hour of day)
      const contactHours = successfulCalls
        .map(call => new Date(call.startedAt).getHours())
        .filter(hour => hour >= 0);

      const hourCounts = {};
      contactHours.forEach(hour => {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      patterns.bestContactTimes = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`);

      // Get total leads for conversion rate
      const totalLeads = await Lead.countDocuments({ assignedTo: userId });
      patterns.conversionRate = totalLeads > 0
        ? ((successfulLeads.length / totalLeads) * 100).toFixed(1)
        : 0;
    }

    return patterns;
  } catch (error) {
    console.error('Error getting partner success patterns:', error);
    return null;
  }
}

/**
 * Calculate priority signals for recommendations
 * @param {Object} lead - Lead record
 * @param {Array} callHistory - Call history
 * @param {Object} qualificationScores - BANTI scores
 * @returns {Object} Priority signals
 */
function calculatePrioritySignals(lead, callHistory, qualificationScores) {
  const signals = {
    isHotLead: false,
    needsImmediateFollowUp: false,
    hasQualificationGaps: false,
    isAtRisk: false,
    priority: 5 // Default medium priority (1-10 scale)
  };

  // High qualification score = hot lead
  if (qualificationScores.total >= 70) {
    signals.isHotLead = true;
    signals.priority = 9;
  }

  // Recently qualified but not transferred
  if (lead.status === 'qualified' && !lead.qualifiedAt) {
    signals.needsImmediateFollowUp = true;
    signals.priority = Math.max(signals.priority, 8);
  }

  // Has gaps in BANTI assessment
  const hasGaps = Object.values(qualificationScores).some(score => score === 0);
  if (hasGaps && callHistory.length > 0) {
    signals.hasQualificationGaps = true;
    signals.priority = Math.max(signals.priority, 6);
  }

  // Lead going cold (no contact in 30+ days)
  const daysSinceContact = callHistory.length > 0
    ? Math.floor((new Date() - new Date(callHistory[0].startedAt)) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSinceContact > 30 && lead.status === 'contacted') {
    signals.isAtRisk = true;
    signals.priority = Math.max(signals.priority, 7);
  }

  // Lead with positive sentiment but no follow-up
  if (callHistory.length > 0) {
    const lastCall = callHistory[0];
    const sentiment = lastCall.aiAnalysis?.sentiment?.toLowerCase();
    if ((sentiment === 'positive' || sentiment === 'interested') && daysSinceContact > 2) {
      signals.needsImmediateFollowUp = true;
      signals.priority = Math.max(signals.priority, 9);
    }
  }

  return signals;
}

/**
 * Assemble contexts for multiple leads (batch processing)
 * @param {Array} leadIds - Array of lead IDs
 * @param {String} userId - Partner/User ID
 * @returns {Array} Array of lead contexts
 */
async function assembleMultipleLeadContexts(leadIds, userId = null) {
  try {
    const contexts = await Promise.all(
      leadIds.map(leadId => assembleLeadContext(leadId, userId).catch(err => {
        console.error(`Error assembling context for lead ${leadId}:`, err);
        return null;
      }))
    );

    return contexts.filter(context => context !== null);
  } catch (error) {
    console.error('Error assembling multiple lead contexts:', error);
    throw error;
  }
}

/**
 * Get lead contexts for a user's entire lead list
 * @param {String} userId - Partner/User ID
 * @param {Object} filters - Optional filters (status, limit, etc.)
 * @returns {Array} Array of lead contexts
 */
async function getUserLeadContexts(userId, filters = {}) {
  try {
    const query = { assignedTo: userId };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Exclude DNC leads
    query.doNotCall = { $ne: true };

    // Get leads
    const leads = await Lead.find(query)
      .limit(filters.limit || 50)
      .sort({ updatedAt: -1 })
      .select('_id')
      .lean();

    const leadIds = leads.map(lead => lead._id.toString());

    return await assembleMultipleLeadContexts(leadIds, userId);
  } catch (error) {
    console.error('Error getting user lead contexts:', error);
    throw error;
  }
}

module.exports = {
  assembleLeadContext,
  assembleMultipleLeadContexts,
  getUserLeadContexts,
  calculateInteractionRecency,
  analyzeConversationPatterns,
  getPartnerSuccessPatterns
};