/**
 * AI Script Generation Service
 *
 * Generates personalized call scripts using Claude based on:
 * - Previous conversation summaries from transcripts
 * - Objections raised in past calls
 * - Qualification gaps (which BANTI dimensions need assessment)
 * - Partner's successful call patterns
 *
 * Script format: Opening, Discovery Questions, Objection Responses, Close
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const Anthropic = require('@anthropic-ai/sdk');
const { assembleLeadContext } = require('./leadContextService');
const mongoose = require('mongoose');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// AI Scripts Schema (will be created separately)
const aiScriptSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  scriptType: {
    type: String,
    enum: ['initial_call', 'follow_up', 'objection_handling', 'qualification', 'closing'],
    default: 'follow_up'
  },
  scriptText: {
    type: String,
    required: true
  },
  structuredScript: {
    opening: String,
    discoveryQuestions: [String],
    objectionResponses: [{
      objection: String,
      response: String
    }],
    qualificationQuestions: [String],
    closingStatement: String
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  effectiveness: {
    type: Number,
    min: 0,
    max: 10
  },
  feedback: String
}, {
  timestamps: true
});

const AIScript = mongoose.model('AIScript', aiScriptSchema);

/**
 * Generate personalized call script for a lead
 * @param {String} leadId - Lead ID
 * @param {String} userId - Partner/User ID
 * @param {String} scriptType - Type of script to generate
 * @returns {Object} Generated script
 */
async function generateCallScript(leadId, userId, scriptType = 'follow_up') {
  try {
    // 1. Assemble lead context
    const context = await assembleLeadContext(leadId, userId);

    // 2. Build script generation prompt
    const prompt = buildScriptPrompt(context, scriptType);

    // 3. Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      temperature: 0.8,
      system: getScriptSystemPrompt(),
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // 4. Parse Claude's response
    const script = parseScriptResponse(message.content[0].text);

    // 5. Save script to MongoDB
    const aiScript = new AIScript({
      leadId,
      userId,
      scriptType,
      scriptText: script.fullScript,
      structuredScript: {
        opening: script.opening,
        discoveryQuestions: script.discoveryQuestions,
        objectionResponses: script.objectionResponses,
        qualificationQuestions: script.qualificationQuestions,
        closingStatement: script.closingStatement
      }
    });

    await aiScript.save();

    return {
      scriptId: aiScript._id,
      leadName: context.contactInfo.fullName,
      scriptType,
      script: script.fullScript,
      structured: script,
      generatedAt: aiScript.generatedAt
    };
  } catch (error) {
    console.error('Error generating call script:', error);
    throw error;
  }
}

/**
 * Build prompt for script generation
 * @param {Object} context - Lead context
 * @param {String} scriptType - Type of script
 * @returns {String} Prompt
 */
function buildScriptPrompt(context, scriptType) {
  const qualificationGaps = identifyQualificationGaps(context.qualificationScores);
  const recentObjections = context.conversationPatterns.commonObjections.join(', ') || 'None';

  return `Generate a personalized ${scriptType} call script for this lead.

LEAD INFORMATION:
- Name: ${context.contactInfo.fullName}
- Status: ${context.status.current}
- Qualification Score: ${context.qualificationScores.total}/100

QUALIFICATION GAPS (Need to Assess):
${qualificationGaps.length > 0 ? qualificationGaps.map(gap => `- ${gap.dimension}: Currently ${gap.score}/${gap.max} - ${gap.whatToAssess}`).join('\n') : 'No major gaps - lead is well qualified'}

PREVIOUS CONVERSATION SUMMARY:
${context.latestCallSummary ? `
- Last Call: ${new Date(context.latestCallSummary.date).toLocaleDateString()}
- Outcome: ${context.latestCallSummary.summary}
- Sentiment: ${context.latestCallSummary.sentiment}
` : 'This is the first call'}

KNOWN OBJECTIONS:
${recentObjections || 'None identified yet'}

CONVERSATION PATTERNS:
- Engagement Level: ${context.conversationPatterns.engagementLevel}
- Qualification Trend: ${context.conversationPatterns.qualificationTrend}

${context.partnerPatterns ? `
PARTNER'S SUCCESS PATTERNS:
- This partner typically needs ${context.partnerPatterns.averageCallsToQualification} calls to qualify a lead
- Best results when calling at: ${context.partnerPatterns.bestContactTimes.join(', ')}
` : ''}

Generate a structured call script with the following sections:

1. OPENING (Warm greeting that references past conversation if applicable)
2. DISCOVERY QUESTIONS (3-5 questions to assess ${qualificationGaps.length > 0 ? 'missing BANTI dimensions: ' + qualificationGaps.map(g => g.dimension).join(', ') : 'interest and readiness'})
3. OBJECTION RESPONSES (Prepare responses for these objections: ${recentObjections || 'common objections like time, money, skepticism'})
4. QUALIFICATION QUESTIONS (Specific BANTI assessment questions for gaps)
5. CLOSING STATEMENT (Clear call-to-action - schedule meeting, transfer to upline, or schedule callback)

IMPORTANT GUIDELINES:
- Keep tone conversational and authentic, not salesy
- Reference specific details from past conversations if available
- Focus on value and opportunity, not pressure
- Ask permission before diving into questions
- Use Ron Maleziis BANTI framework for qualification
- Include objection responses that address concerns with empathy
- End with clear next steps

Respond in this JSON format:
{
  "opening": "Opening statement text",
  "discoveryQuestions": ["Question 1", "Question 2", ...],
  "objectionResponses": [
    {"objection": "Objection text", "response": "Response text"},
    ...
  ],
  "qualificationQuestions": ["BANTI question 1", "BANTI question 2", ...],
  "closingStatement": "Closing text",
  "fullScript": "Complete script in paragraph format"
}`;
}

/**
 * Identify which BANTI dimensions need assessment
 * @param {Object} scores - Qualification scores
 * @returns {Array} Gaps to address
 */
function identifyQualificationGaps(scores) {
  const gaps = [];

  if (scores.businessInterest < 15) {
    gaps.push({
      dimension: 'Business Interest',
      score: scores.businessInterest,
      max: 25,
      whatToAssess: 'Why they\'re interested in this opportunity, what appeals to them'
    });
  }

  if (scores.employmentStatus < 10) {
    gaps.push({
      dimension: 'Employment/Authority',
      score: scores.employmentStatus,
      max: 20,
      whatToAssess: 'Current employment situation, ability to make decisions independently'
    });
  }

  if (scores.incomeCommitment < 15) {
    gaps.push({
      dimension: 'Income/Budget',
      score: scores.incomeCommitment,
      max: 25,
      whatToAssess: 'Financial capacity, willingness to invest in themselves'
    });
  }

  if (scores.personalExperience < 8) {
    gaps.push({
      dimension: 'Need/Experience',
      score: scores.personalExperience,
      max: 15,
      whatToAssess: 'Past experience with network marketing, understanding of opportunity'
    });
  }

  if (scores.decisionMaking < 8) {
    gaps.push({
      dimension: 'Timing/Decision Making',
      score: scores.decisionMaking,
      max: 15,
      whatToAssess: 'Timeline for getting started, readiness to take action'
    });
  }

  return gaps;
}

/**
 * System prompt for script generation
 * @returns {String} System prompt
 */
function getScriptSystemPrompt() {
  return `You are an expert sales script writer specializing in network marketing recruitment for Magnificent Worldwide.

Your scripts are:
- Natural and conversational (not robotic)
- Focused on building rapport and trust
- Guided by the BANTI qualification framework (Budget, Authority, Need, Timing, Interest)
- Empathetic to objections and concerns
- Clear about next steps and expectations

You understand that recruiting is about finding the right fit, not convincing everyone.
Your scripts help partners identify qualified prospects while respecting those who aren't interested.

Key principles:
1. Listen more than you talk
2. Ask permission before pitching
3. Address objections with empathy and data
4. Focus on transformation and opportunity
5. Always have a clear call-to-action`;
}

/**
 * Parse Claude's script response
 * @param {String} responseText - Claude's response
 * @returns {Object} Parsed script
 */
function parseScriptResponse(responseText) {
  try {
    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const script = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const required = ['opening', 'discoveryQuestions', 'objectionResponses', 'qualificationQuestions', 'closingStatement', 'fullScript'];
    for (const field of required) {
      if (!script[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return script;
  } catch (error) {
    console.error('Error parsing script response:', error);

    // Fallback script
    return {
      opening: 'Hi [Name], it\'s great to connect with you!',
      discoveryQuestions: [
        'What interested you most about this opportunity?',
        'What are your current goals?',
        'What\'s your timeline for getting started?'
      ],
      objectionResponses: [
        { objection: 'I need to think about it', response: 'I completely understand. What specific concerns would you like to think through?' }
      ],
      qualificationQuestions: [
        'Are you currently working or looking for opportunities?',
        'Have you been involved in network marketing before?',
        'What would success look like for you?'
      ],
      closingStatement: 'Based on our conversation, I think this could be a great fit. Would you like to schedule a time to learn more?',
      fullScript: 'Script generation encountered an error. Please review the lead manually.',
      error: error.message
    };
  }
}

/**
 * Get script for a lead (retrieve existing or generate new)
 * @param {String} leadId - Lead ID
 * @param {String} userId - User ID
 * @param {Boolean} forceRegenerate - Force new script generation
 * @returns {Object} Script
 */
async function getOrGenerateScript(leadId, userId, forceRegenerate = false) {
  try {
    if (!forceRegenerate) {
      // Check for existing unused script
      const existingScript = await AIScript.findOne({
        leadId,
        used: false
      }).sort({ generatedAt: -1 });

      if (existingScript) {
        return {
          scriptId: existingScript._id,
          scriptType: existingScript.scriptType,
          script: existingScript.scriptText,
          structured: existingScript.structuredScript,
          generatedAt: existingScript.generatedAt,
          cached: true
        };
      }
    }

    // Generate new script
    return await generateCallScript(leadId, userId, 'follow_up');
  } catch (error) {
    console.error('Error getting/generating script:', error);
    throw error;
  }
}

/**
 * Mark script as used
 * @param {String} scriptId - Script ID
 * @param {Number} effectiveness - Rating 0-10 (optional)
 * @returns {Object} Updated script
 */
async function markScriptAsUsed(scriptId, effectiveness = null) {
  try {
    const update = {
      used: true,
      usedAt: new Date()
    };

    if (effectiveness !== null) {
      update.effectiveness = effectiveness;
    }

    const script = await AIScript.findByIdAndUpdate(
      scriptId,
      update,
      { new: true }
    );

    return script;
  } catch (error) {
    console.error('Error marking script as used:', error);
    throw error;
  }
}

/**
 * Get script history for a lead
 * @param {String} leadId - Lead ID
 * @param {Number} limit - Max scripts to return
 * @returns {Array} Script history
 */
async function getScriptHistory(leadId, limit = 10) {
  try {
    const scripts = await AIScript.find({ leadId })
      .sort({ generatedAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    return scripts;
  } catch (error) {
    console.error('Error getting script history:', error);
    throw error;
  }
}

/**
 * Provide feedback on a script
 * @param {String} scriptId - Script ID
 * @param {String} feedback - Feedback text
 * @param {Number} rating - Rating 0-10
 * @returns {Object} Updated script
 */
async function provideScriptFeedback(scriptId, feedback, rating) {
  try {
    const script = await AIScript.findByIdAndUpdate(
      scriptId,
      {
        feedback,
        effectiveness: rating
      },
      { new: true }
    );

    return script;
  } catch (error) {
    console.error('Error providing script feedback:', error);
    throw error;
  }
}

module.exports = {
  generateCallScript,
  getOrGenerateScript,
  markScriptAsUsed,
  getScriptHistory,
  provideScriptFeedback,
  AIScript // Export model for use in other modules
};