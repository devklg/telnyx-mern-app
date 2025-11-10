/**
 * Lead Scoring Service
 *
 * Comprehensive lead scoring system beyond Ron Maleziis scoring to include:
 * - Qualification Score (0-40 points) - Based on Ron Maleziis BANTI
 * - Engagement Score (0-30 points) - Recent activity and interaction frequency
 * - Intent Signals (0-20 points) - AI analysis of transcripts
 * - Demographic Fit (0-10 points) - Location, timezone, source quality
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const Lead = require('../database/mongodb/schemas/lead.schema');
const Call = require('../database/mongodb/schemas/call.schema');
const { pool } = require('../config/database');
const { cache } = require('../config/redis');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Default scoring weights (can be overridden via system_config)
const DEFAULT_WEIGHTS = {
  qualification: 0.4,  // 40 points max
  engagement: 0.3,     // 30 points max
  intent: 0.2,         // 20 points max
  demographic: 0.1     // 10 points max
};

// Score decay rates (per month)
const DECAY_RATES = {
  engagement: 0.20,    // 20% per month
  intent: 0.50         // 50% per month
};

/**
 * Main function to calculate comprehensive lead score
 * @param {String} leadId - MongoDB Lead ID
 * @returns {Object} Score breakdown and total
 */
async function calculateLeadScore(leadId) {
  try {
    // Fetch lead data
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Fetch call history
    const calls = await Call.find({ leadId: leadId }).sort({ startedAt: -1 }).lean();

    // Get scoring weights from config or use defaults
    const weights = await getScoringWeights();

    // Calculate individual score components
    const qualificationPoints = await getQualificationPoints(lead);
    const engagementPoints = await getEngagementPoints(lead, calls);
    const intentPoints = await getIntentPoints(lead, calls);
    const demographicPoints = await getDemographicPoints(lead);

    // Calculate total score (0-100)
    const totalScore = Math.round(
      qualificationPoints +
      engagementPoints +
      intentPoints +
      demographicPoints
    );

    // Determine classification
    const classification = classifyLeadScore(totalScore);

    // Build score breakdown
    const scoreBreakdown = {
      qualification: qualificationPoints,
      engagement: engagementPoints,
      intent: intentPoints,
      demographic: demographicPoints,
      total: totalScore,
      classification,
      calculatedAt: new Date()
    };

    // Update lead with new score
    lead.qualificationScore = totalScore;

    // Auto-update status based on classification
    if (classification === 'hot' && lead.status !== 'transferred' && lead.status !== 'completed') {
      lead.status = 'qualified'; // Change to 'qualified' for hot leads
    } else if (classification === 'cold' &&
               new Date() - new Date(lead.lastContactedAt) > 90 * 24 * 60 * 60 * 1000) {
      lead.status = 'not_interested'; // Change to not_interested for cold leads
    }

    await lead.save();

    // Save to score history (PostgreSQL)
    await saveScoreHistory(leadId, scoreBreakdown);

    // Cache score (1 hour TTL)
    await cache.set(`lead:score:${leadId}`, JSON.stringify(scoreBreakdown), 3600);

    console.log(`Lead ${leadId} scored: ${totalScore} (${classification})`);

    return scoreBreakdown;

  } catch (error) {
    console.error('Error calculating lead score:', error);
    throw error;
  }
}

/**
 * Calculate Qualification Score (0-40 points)
 * Based on Ron Maleziis BANTI framework
 * @param {Object} lead - Lead document
 * @returns {Number} Qualification points
 */
async function getQualificationPoints(lead) {
  // Calculate total BANTI score from lead fields
  const bantiScore =
    (lead.businessInterest || 0) +
    (lead.employmentStatus || 0) +
    (lead.incomeCommitment || 0) +
    (lead.personalExperience || 0) +
    (lead.decisionMaking || 0);

  // Convert to percentage (out of 100)
  const bantiPercentage = bantiScore;

  // Score mapping based on requirements
  if (bantiPercentage >= 70) {
    return 40; // Score ≥ 7/10 (70%)
  } else if (bantiPercentage >= 50) {
    return 25; // Score 5-6.9/10 (50-69%)
  } else if (bantiPercentage >= 30) {
    return 10; // Score 3-4.9/10 (30-49%)
  } else {
    return 0;  // Score < 3/10 (< 30%)
  }
}

/**
 * Calculate Engagement Score (0-30 points)
 * Based on recent activity, interaction frequency, and positive signals
 * @param {Object} lead - Lead document
 * @param {Array} calls - Call history
 * @returns {Number} Engagement points
 */
async function getEngagementPoints(lead, calls) {
  let points = 0;

  // Recent activity scoring
  if (lead.lastContactedAt) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact <= 7) {
      points += 15; // Call within last 7 days
    } else if (daysSinceContact <= 30) {
      points += 10; // Call within last 30 days
    } else if (daysSinceContact <= 90) {
      points += 5;  // Call within last 90 days
    }
    // No points for > 90 days
  }

  // Interaction frequency scoring
  const callCount = calls.length;
  if (callCount >= 5) {
    points += 10; // 5+ calls
  } else if (callCount >= 3) {
    points += 7;  // 3-4 calls
  } else if (callCount >= 1) {
    points += 3;  // 1-2 calls
  }

  // Positive engagement signals (would integrate with nurture system)
  // For now, checking for notes that indicate engagement
  if (lead.notes && lead.notes.length > 0) {
    // Check for positive indicators in notes
    const recentNotes = lead.notes.slice(-5).map(n => (n.content || n.text || '').toLowerCase());

    if (recentNotes.some(note =>
      note.includes('replied') ||
      note.includes('responded') ||
      note.includes('sms reply')
    )) {
      points += 5; // SMS reply
    }

    if (recentNotes.some(note =>
      note.includes('opened email') ||
      note.includes('email open')
    )) {
      points += 3; // Email open
    }

    if (recentNotes.some(note =>
      note.includes('clicked') ||
      note.includes('email click')
    )) {
      points += 5; // Email click
    }
  }

  return Math.min(points, 30); // Cap at 30 points
}

/**
 * Calculate Intent Signals (0-20 points)
 * AI analysis of call transcripts for interest indicators
 * @param {Object} lead - Lead document
 * @param {Array} calls - Call history
 * @returns {Number} Intent points
 */
async function getIntentPoints(lead, calls) {
  let points = 0;

  // Get most recent calls with transcripts
  const recentCallsWithTranscripts = calls
    .filter(call => call.transcript && call.transcript.length > 50)
    .slice(0, 3); // Last 3 calls

  if (recentCallsWithTranscripts.length === 0) {
    return 0; // No transcripts to analyze
  }

  // Analyze transcripts with Claude for intent signals
  for (const call of recentCallsWithTranscripts) {
    const intentAnalysis = await analyzeTranscriptForIntent(call.transcript);

    if (intentAnalysis.explicitInterest) {
      points += 10; // "I'm interested" or "Tell me more"
    }

    if (intentAnalysis.askedQuestions) {
      points += 5; // Asked questions about opportunity
    }

    if (intentAnalysis.requestedCallback) {
      points += 10; // Requested callback or appointment
    }

    if (intentAnalysis.handledObjectionsPositively) {
      points += 5; // Handled objections positively
    }

    if (intentAnalysis.hardObjections) {
      points -= 10; // Hard objections (can go negative)
    }
  }

  return Math.min(Math.max(points, 0), 20); // Cap at 0-20 points
}

/**
 * Analyze transcript for intent signals using Claude
 * @param {String} transcript - Call transcript
 * @returns {Object} Intent analysis
 */
async function analyzeTranscriptForIntent(transcript) {
  try {
    // Truncate transcript if too long (max 3000 chars)
    const truncatedTranscript = transcript.substring(0, 3000);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analyze this call transcript for intent signals. Return ONLY a JSON object with these boolean fields:
- explicitInterest: true if prospect says "I'm interested", "tell me more", or similar positive phrases
- askedQuestions: true if prospect asks questions about the opportunity
- requestedCallback: true if prospect requests a callback, appointment, or follow-up
- handledObjectionsPositively: true if prospect had objections but remained engaged
- hardObjections: true if prospect says "not interested", "pyramid scheme", "remove me", etc.

Transcript:
${truncatedTranscript}

Return only valid JSON, no other text.`
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: simple keyword analysis
    return simpleIntentAnalysis(transcript);

  } catch (error) {
    console.error('Error analyzing transcript with Claude:', error);
    // Fallback to simple keyword analysis
    return simpleIntentAnalysis(transcript);
  }
}

/**
 * Simple keyword-based intent analysis (fallback)
 * @param {String} transcript - Call transcript
 * @returns {Object} Intent analysis
 */
function simpleIntentAnalysis(transcript) {
  const lowerTranscript = transcript.toLowerCase();

  return {
    explicitInterest:
      lowerTranscript.includes("i'm interested") ||
      lowerTranscript.includes('tell me more') ||
      lowerTranscript.includes('sounds good'),

    askedQuestions:
      lowerTranscript.includes('how does') ||
      lowerTranscript.includes('what is') ||
      lowerTranscript.includes('can you explain') ||
      (lowerTranscript.match(/\?/g) || []).length >= 2,

    requestedCallback:
      lowerTranscript.includes('call me back') ||
      lowerTranscript.includes('schedule') ||
      lowerTranscript.includes('appointment'),

    handledObjectionsPositively:
      (lowerTranscript.includes('but') || lowerTranscript.includes('however')) &&
      !lowerTranscript.includes('not interested'),

    hardObjections:
      lowerTranscript.includes('not interested') ||
      lowerTranscript.includes('pyramid') ||
      lowerTranscript.includes('scam') ||
      lowerTranscript.includes('remove me') ||
      lowerTranscript.includes('stop calling')
  };
}

/**
 * Calculate Demographic Fit (0-10 points)
 * Based on timezone, location, and source quality
 * @param {Object} lead - Lead document
 * @returns {Number} Demographic points
 */
async function getDemographicPoints(lead) {
  let points = 0;

  // Time zone alignment (if we have system timezone preference)
  // For now, US-based leads get +5
  if (lead.timezone && lead.timezone.includes('America')) {
    points += 5;
  }

  // High-opportunity locations (major metropolitan areas)
  const highOpportunityStates = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'];
  if (lead.phoneAreaCode) {
    // Check if area code indicates high-opportunity state
    // This is a simplified check - could be enhanced with area code mapping
    points += 5;
  }

  // Source quality scoring
  const sourceQuality = getSourceQuality(lead.importSource || lead.source);
  points += sourceQuality;

  return Math.min(points, 10); // Cap at 10 points
}

/**
 * Get source quality score
 * @param {String} source - Lead source
 * @returns {Number} Quality score (0-10)
 */
function getSourceQuality(source) {
  if (!source) return 0;

  const lowerSource = source.toLowerCase();

  if (lowerSource.includes('referral') || lowerSource.includes('refer')) {
    return 10; // Referrals: highest quality
  } else if (lowerSource.includes('facebook') || lowerSource.includes('linkedin')) {
    return 5; // Social media: medium quality
  } else if (lowerSource.includes('purchased') || lowerSource.includes('list')) {
    return 0; // Purchased lists: lowest quality
  } else if (lowerSource.includes('gmail') || lowerSource.includes('email')) {
    return 7; // Email leads: good quality
  } else {
    return 3; // Unknown sources: low-medium quality
  }
}

/**
 * Classify lead score into categories
 * @param {Number} score - Total score (0-100)
 * @returns {String} Classification
 */
function classifyLeadScore(score) {
  if (score >= 80) {
    return 'hot';     // 80-100
  } else if (score >= 60) {
    return 'warm';    // 60-79
  } else if (score >= 40) {
    return 'cool';    // 40-59
  } else {
    return 'cold';    // < 40
  }
}

/**
 * Apply time-based score decay
 * Engagement points decay 20% per month
 * Intent points decay 50% per month
 * @param {String} leadId - Lead ID
 * @returns {Object} Updated score
 */
async function applyScoreDecay(leadId) {
  try {
    // Get latest score from history
    const latestScore = await getLatestScoreFromHistory(leadId);

    if (!latestScore) {
      // No score history, calculate fresh
      return await calculateLeadScore(leadId);
    }

    // Calculate months since last calculation
    const monthsSince = Math.floor(
      (Date.now() - new Date(latestScore.calculated_at)) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsSince < 1) {
      // Less than a month, no decay needed
      return latestScore.factors;
    }

    // Parse factors from JSONB
    const factors = typeof latestScore.factors === 'string'
      ? JSON.parse(latestScore.factors)
      : latestScore.factors;

    // Apply decay
    const decayedEngagement = Math.round(
      factors.engagement * Math.pow(1 - DECAY_RATES.engagement, monthsSince)
    );

    const decayedIntent = Math.round(
      factors.intent * Math.pow(1 - DECAY_RATES.intent, monthsSince)
    );

    // Recalculate total
    const newTotal =
      factors.qualification +
      decayedEngagement +
      decayedIntent +
      factors.demographic;

    const decayedScore = {
      qualification: factors.qualification, // Doesn't decay
      engagement: decayedEngagement,
      intent: decayedIntent,
      demographic: factors.demographic,     // Doesn't decay
      total: newTotal,
      classification: classifyLeadScore(newTotal),
      calculatedAt: new Date(),
      decayApplied: true,
      monthsDecayed: monthsSince
    };

    // Update lead
    const lead = await Lead.findById(leadId);
    if (lead) {
      lead.qualificationScore = newTotal;
      await lead.save();
    }

    // Save to history
    await saveScoreHistory(leadId, decayedScore);

    return decayedScore;

  } catch (error) {
    console.error('Error applying score decay:', error);
    throw error;
  }
}

/**
 * Get scoring weights from configuration
 * @returns {Object} Scoring weights
 */
async function getScoringWeights() {
  try {
    // Try to get from system_config table
    const result = await pool.query(
      `SELECT config_value FROM system_config WHERE config_key = 'lead_scoring_weights' LIMIT 1`
    );

    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].config_value);
    }

    return DEFAULT_WEIGHTS;
  } catch (error) {
    console.warn('Could not fetch scoring weights from config, using defaults:', error);
    return DEFAULT_WEIGHTS;
  }
}

/**
 * Update scoring weights configuration
 * @param {Object} weights - New weights
 * @returns {Boolean} Success
 */
async function updateScoringWeights(weights) {
  try {
    await pool.query(
      `INSERT INTO system_config (config_key, config_value, updated_at)
       VALUES ('lead_scoring_weights', $1, NOW())
       ON CONFLICT (config_key)
       DO UPDATE SET config_value = $1, updated_at = NOW()`,
      [JSON.stringify(weights)]
    );

    return true;
  } catch (error) {
    console.error('Error updating scoring weights:', error);
    throw error;
  }
}

/**
 * Save score to history table (PostgreSQL)
 * @param {String} leadId - Lead ID
 * @param {Object} scoreBreakdown - Score details
 */
async function saveScoreHistory(leadId, scoreBreakdown) {
  try {
    await pool.query(
      `INSERT INTO lead_score_history (lead_id, score, factors, calculated_at)
       VALUES ($1, $2, $3, $4)`,
      [
        leadId,
        scoreBreakdown.total,
        JSON.stringify(scoreBreakdown),
        scoreBreakdown.calculatedAt
      ]
    );
  } catch (error) {
    console.error('Error saving score history:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get score history for a lead
 * @param {String} leadId - Lead ID
 * @param {Number} limit - Number of records to return
 * @returns {Array} Score history
 */
async function getScoreHistory(leadId, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT * FROM lead_score_history
       WHERE lead_id = $1
       ORDER BY calculated_at DESC
       LIMIT $2`,
      [leadId, limit]
    );

    return result.rows.map(row => ({
      ...row,
      factors: typeof row.factors === 'string' ? JSON.parse(row.factors) : row.factors
    }));
  } catch (error) {
    console.error('Error fetching score history:', error);
    return [];
  }
}

/**
 * Get latest score from history
 * @param {String} leadId - Lead ID
 * @returns {Object} Latest score or null
 */
async function getLatestScoreFromHistory(leadId) {
  try {
    const result = await pool.query(
      `SELECT * FROM lead_score_history
       WHERE lead_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [leadId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching latest score:', error);
    return null;
  }
}

/**
 * Get top-scored leads
 * @param {Number} limit - Number of leads to return
 * @param {Number} minScore - Minimum score threshold
 * @returns {Array} Top scored leads
 */
async function getTopScoredLeads(limit = 50, minScore = 80) {
  try {
    const leads = await Lead.find({
      qualificationScore: { $gte: minScore },
      doNotCall: { $ne: true },
      status: { $nin: ['completed', 'not_interested'] }
    })
    .sort({ qualificationScore: -1 })
    .limit(limit)
    .lean();

    return leads;
  } catch (error) {
    console.error('Error fetching top scored leads:', error);
    throw error;
  }
}

/**
 * Recalculate scores for all leads (batch operation)
 * @param {Number} batchSize - Leads per batch
 * @returns {Object} Results
 */
async function recalculateAllScores(batchSize = 100) {
  try {
    const totalLeads = await Lead.countDocuments({
      doNotCall: { $ne: true },
      status: { $nin: ['completed', 'not_interested'] }
    });

    let processed = 0;
    let errors = 0;

    console.log(`Starting batch recalculation for ${totalLeads} leads...`);

    // Process in batches
    for (let skip = 0; skip < totalLeads; skip += batchSize) {
      const leads = await Lead.find({
        doNotCall: { $ne: true },
        status: { $nin: ['completed', 'not_interested'] }
      })
      .select('_id')
      .skip(skip)
      .limit(batchSize)
      .lean();

      for (const lead of leads) {
        try {
          await calculateLeadScore(lead._id);
          processed++;
        } catch (error) {
          console.error(`Error scoring lead ${lead._id}:`, error.message);
          errors++;
        }
      }

      console.log(`Progress: ${processed}/${totalLeads} (${errors} errors)`);
    }

    return {
      total: totalLeads,
      processed,
      errors,
      successRate: ((processed / totalLeads) * 100).toFixed(2)
    };

  } catch (error) {
    console.error('Error in batch recalculation:', error);
    throw error;
  }
}

module.exports = {
  calculateLeadScore,
  getQualificationPoints,
  getEngagementPoints,
  getIntentPoints,
  getDemographicPoints,
  applyScoreDecay,
  getScoringWeights,
  updateScoringWeights,
  getScoreHistory,
  getTopScoredLeads,
  recalculateAllScores,
  classifyLeadScore
};