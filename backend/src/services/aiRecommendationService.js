/**
 * AI Recommendation Service
 *
 * Uses Claude API to generate intelligent follow-up recommendations
 * based on comprehensive lead context and partner history.
 *
 * Generates:
 * - Action type (call_now, send_sms, schedule_callback, nurture_email, drop_lead)
 * - Priority (1-10)
 * - Reasoning (why this action now)
 * - Recommended script (talking points)
 * - Optimal contact time
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const Anthropic = require('@anthropic-ai/sdk');
const { assembleLeadContext } = require('./leadContextService');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generate recommendation for a single lead using Claude
 * @param {String} leadId - Lead ID
 * @param {String} userId - Partner/User ID
 * @returns {Object} AI-generated recommendation
 */
async function generateRecommendation(leadId, userId = null) {
  try {
    // 1. Assemble comprehensive lead context
    const context = await assembleLeadContext(leadId, userId);

    // 2. Build Claude prompt
    const prompt = buildRecommendationPrompt(context);

    // 3. Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.7,
      system: getSystemPrompt(),
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // 4. Parse Claude's response
    const recommendation = parseClaudeResponse(message.content[0].text);

    // 5. Enhance with context-specific data
    recommendation.leadId = leadId;
    recommendation.leadName = context.contactInfo.fullName;
    recommendation.generatedAt = new Date().toISOString();
    recommendation.context = {
      currentStatus: context.status.current,
      qualificationScore: context.qualificationScores.total,
      daysSinceLastContact: context.interactionRecency.daysSinceLastContact
    };

    return recommendation;
  } catch (error) {
    console.error('Error generating recommendation:', error);
    throw error;
  }
}

/**
 * Generate recommendations for multiple leads (batch)
 * @param {Array} leadIds - Array of lead IDs
 * @param {String} userId - Partner/User ID
 * @param {Number} limit - Max number of recommendations to return
 * @returns {Array} Array of recommendations
 */
async function generateMultipleRecommendations(leadIds, userId, limit = 10) {
  try {
    const recommendations = [];

    // Process leads in parallel (batches of 5 to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      const batchPromises = batch.map(leadId =>
        generateRecommendation(leadId, userId).catch(err => {
          console.error(`Error generating recommendation for lead ${leadId}:`, err);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      recommendations.push(...batchResults.filter(rec => rec !== null));

      // Stop if we've reached the limit
      if (recommendations.length >= limit) break;
    }

    // Sort by priority (highest first) and return top N
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  } catch (error) {
    console.error('Error generating multiple recommendations:', error);
    throw error;
  }
}

/**
 * Build Claude prompt from lead context
 * @param {Object} context - Lead context object
 * @returns {String} Formatted prompt
 */
function buildRecommendationPrompt(context) {
  return `Analyze this lead and recommend the next best action for the partner to take.

LEAD INFORMATION:
- Name: ${context.contactInfo.fullName}
- Phone: ${context.contactInfo.phone}
- Current Status: ${context.status.current}
- Do Not Call: ${context.status.doNotCall ? 'YES' : 'NO'}

QUALIFICATION SCORES (BANTI Framework):
- Business Interest: ${context.qualificationScores.businessInterest}/25
- Employment Status: ${context.qualificationScores.employmentStatus}/20
- Income Commitment: ${context.qualificationScores.incomeCommitment}/25
- Personal Experience: ${context.qualificationScores.personalExperience}/15
- Decision Making: ${context.qualificationScores.decisionMaking}/15
- Total Score: ${context.qualificationScores.total}/100

INTERACTION HISTORY:
- Days Since Last Contact: ${context.interactionRecency.daysSinceLastContact || 'Never contacted'}
- Total Calls: ${context.metadata.totalCalls}
- Contact Frequency: ${context.interactionRecency.contactFrequency}
${context.latestCallSummary ? `
- Latest Call Summary: ${context.latestCallSummary.summary}
- Latest Call Sentiment: ${context.latestCallSummary.sentiment}
- Latest Call Score: ${context.latestCallSummary.qualificationScore}/10
` : ''}

CONVERSATION PATTERNS:
- Common Objections: ${context.conversationPatterns.commonObjections.join(', ') || 'None detected'}
- Engagement Level: ${context.conversationPatterns.engagementLevel}
- Qualification Trend: ${context.conversationPatterns.qualificationTrend}
- Positive Sentiment Count: ${context.conversationPatterns.positiveSentimentCount}
- Negative Sentiment Count: ${context.conversationPatterns.negativeSentimentCount}

PRIORITY SIGNALS:
- Is Hot Lead: ${context.prioritySignals.isHotLead}
- Needs Immediate Follow-Up: ${context.prioritySignals.needsImmediateFollowUp}
- Has Qualification Gaps: ${context.prioritySignals.hasQualificationGaps}
- Is At Risk: ${context.prioritySignals.isAtRisk}

${context.partnerPatterns ? `
PARTNER SUCCESS PATTERNS:
- Average Calls to Qualification: ${context.partnerPatterns.averageCallsToQualification}
- Best Contact Times: ${context.partnerPatterns.bestContactTimes.join(', ')}
- Conversion Rate: ${context.partnerPatterns.conversionRate}%
` : ''}

Based on this analysis, provide a recommendation in the following JSON format:
{
  "action_type": "call_now" | "send_sms" | "schedule_callback" | "nurture_email" | "drop_lead",
  "priority": 1-10 (10 = highest urgency),
  "reasoning": "Detailed explanation of why this action should be taken now",
  "recommended_script": "Key talking points for the next interaction (3-5 bullet points)",
  "optimal_contact_time": "Best time to contact (format: 'YYYY-MM-DD HH:mm' or 'Today at 2pm' or 'Tomorrow morning')",
  "next_steps": "Specific action items for the partner"
}

IMPORTANT GUIDELINES:
1. If Do Not Call = YES, always recommend "drop_lead"
2. Hot leads (score ≥70) or recent positive sentiment should get "call_now" with priority 9-10
3. Leads with qualification gaps need "call_now" to assess missing BANTI dimensions
4. Leads going cold (30+ days no contact) need "call_now" for re-engagement with priority 7-8
5. Low-interest leads (score <40) should get "send_sms" or "nurture_email" with priority 4-6
6. Leads with 5+ failed attempts should recommend "drop_lead" with priority 1-2
7. Consider the lead's timezone (${context.contactInfo.timezone}) when suggesting contact times
8. Reference specific conversation details in your reasoning

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * System prompt for Claude
 * @returns {String} System prompt
 */
function getSystemPrompt() {
  return `You are an expert sales and recruiting strategist specializing in network marketing for Magnificent Worldwide.
Your role is to analyze lead data and provide actionable follow-up recommendations that maximize conversion rates.

You understand the BANTI qualification framework (Budget, Authority, Need, Timing, Interest) developed by Ron Maleziis.
You consider conversation history, sentiment analysis, objection patterns, and partner success patterns.

Your recommendations should be:
- Data-driven and specific
- Actionable with clear next steps
- Optimized for timing and context
- Personalized to the lead's situation
- Aligned with best practices in recruiting

Always prioritize leads showing genuine interest, high qualification scores, or time-sensitive opportunities.
Be realistic about leads that should be dropped (DNC requests, repeated hard objections, no engagement).`;
}

/**
 * Parse Claude's JSON response
 * @param {String} responseText - Claude's text response
 * @returns {Object} Parsed recommendation
 */
function parseClaudeResponse(responseText) {
  try {
    // Extract JSON from response (in case Claude adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const requiredFields = ['action_type', 'priority', 'reasoning', 'recommended_script', 'optimal_contact_time'];
    for (const field of requiredFields) {
      if (!recommendation[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate action_type
    const validActionTypes = ['call_now', 'send_sms', 'schedule_callback', 'nurture_email', 'drop_lead'];
    if (!validActionTypes.includes(recommendation.action_type)) {
      throw new Error(`Invalid action_type: ${recommendation.action_type}`);
    }

    // Validate priority range
    if (recommendation.priority < 1 || recommendation.priority > 10) {
      throw new Error(`Priority must be between 1-10, got: ${recommendation.priority}`);
    }

    return recommendation;
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    console.error('Raw response:', responseText);

    // Return fallback recommendation
    return {
      action_type: 'schedule_callback',
      priority: 5,
      reasoning: 'Unable to generate AI recommendation. Manual review needed.',
      recommended_script: 'Review lead history and determine appropriate next action.',
      optimal_contact_time: 'Within next 48 hours',
      next_steps: 'Manual analysis required',
      error: error.message
    };
  }
}

/**
 * Generate recommendations for all active leads of a user
 * @param {String} userId - Partner/User ID
 * @param {Object} options - Options (limit, status filter, etc.)
 * @returns {Array} Top recommended actions
 */
async function generateUserRecommendations(userId, options = {}) {
  try {
    const Lead = require('../models/Lead');

    // Build query
    const query = {
      assignedTo: userId,
      doNotCall: { $ne: true }
    };

    // Status filter
    if (options.status) {
      query.status = options.status;
    } else {
      // Default: exclude completed/DNC leads
      query.status = { $nin: ['completed', 'not_interested'] };
    }

    // Get leads sorted by priority
    const leads = await Lead.find(query)
      .sort({ qualificationScore: -1, updatedAt: -1 })
      .limit(options.limit || 50)
      .select('_id')
      .lean();

    const leadIds = leads.map(lead => lead._id.toString());

    // Generate recommendations
    return await generateMultipleRecommendations(leadIds, userId, options.limit || 10);
  } catch (error) {
    console.error('Error generating user recommendations:', error);
    throw error;
  }
}

/**
 * Classify recommendation type based on lead context (rule-based fallback)
 * @param {Object} context - Lead context
 * @returns {Object} Basic recommendation
 */
function classifyRecommendationType(context) {
  const { status, qualificationScores, interactionRecency, prioritySignals } = context;

  // DNC leads
  if (status.doNotCall) {
    return {
      action_type: 'drop_lead',
      priority: 1,
      reasoning: 'Lead is on Do Not Call list'
    };
  }

  // Hot leads (Call Now - Priority 9-10)
  if (qualificationScores.total >= 70 || prioritySignals.isHotLead) {
    return {
      action_type: 'call_now',
      priority: 9,
      reasoning: 'High qualification score - lead is hot and ready for transfer'
    };
  }

  // Follow-up needed (Priority 7-8)
  if (prioritySignals.needsImmediateFollowUp || (interactionRecency.daysSinceLastContact >= 2 && interactionRecency.daysSinceLastContact <= 5)) {
    return {
      action_type: 'call_now',
      priority: 8,
      reasoning: 'Lead needs timely follow-up to maintain momentum'
    };
  }

  // Nurture sequence (Priority 4-6)
  if (qualificationScores.total < 50 && interactionRecency.daysSinceLastContact >= 7) {
    return {
      action_type: 'nurture_email',
      priority: 5,
      reasoning: 'Lead needs nurturing with educational content'
    };
  }

  // Re-engagement (Priority 2-3)
  if (interactionRecency.daysSinceLastContact > 30) {
    return {
      action_type: 'send_sms',
      priority: 3,
      reasoning: 'Lead has gone cold - attempt re-engagement via SMS'
    };
  }

  // Default callback
  return {
    action_type: 'schedule_callback',
    priority: 5,
    reasoning: 'Standard follow-up needed'
  };
}

module.exports = {
  generateRecommendation,
  generateMultipleRecommendations,
  generateUserRecommendations,
  classifyRecommendationType
};