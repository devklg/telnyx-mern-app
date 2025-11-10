/**
 * Lead Scoring Triggers Integration
 *
 * Integrates lead scoring calculations with existing system events:
 * - Call completion (webhook handlers)
 * - Lead status updates (lead controller)
 * - Nurture interactions (SMS/email engagement)
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const { queueScoreCalculation, queueCacheInvalidation } = require('../queues/leadScoring.queue');

/**
 * Trigger score recalculation after call completion
 * Called from webhook handler when call ends
 * @param {String} leadId - Lead ID
 * @param {Object} callData - Call data from webhook
 */
async function triggerScoreAfterCall(leadId, callData = {}) {
  try {
    if (!leadId) {
      console.warn('[Lead Scoring Trigger] No leadId provided for call completion');
      return;
    }

    console.log(`[Lead Scoring Trigger] Queuing score recalculation after call for lead: ${leadId}`);

    // Queue score calculation with slight delay to allow call data to be saved
    await queueScoreCalculation(leadId, {
      priority: 6, // Higher priority for post-call scoring
      delay: 5000  // 5 second delay to ensure call data is persisted
    });

    // Invalidate cache
    await queueCacheInvalidation({
      leadId,
      pattern: 'leads:top_scored:*'
    });

  } catch (error) {
    console.error('[Lead Scoring Trigger] Error triggering score after call:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Trigger score recalculation after lead status update
 * Called from lead controller when status changes
 * @param {String} leadId - Lead ID
 * @param {Object} statusChange - Status change data
 */
async function triggerScoreAfterStatusUpdate(leadId, statusChange = {}) {
  try {
    if (!leadId) {
      console.warn('[Lead Scoring Trigger] No leadId provided for status update');
      return;
    }

    console.log(`[Lead Scoring Trigger] Queuing score recalculation after status update for lead: ${leadId}`);

    // Queue score calculation
    await queueScoreCalculation(leadId, {
      priority: 5,
      delay: 2000 // 2 second delay
    });

    // Invalidate cache
    await queueCacheInvalidation({
      leadId,
      pattern: 'leads:top_scored:*'
    });

  } catch (error) {
    console.error('[Lead Scoring Trigger] Error triggering score after status update:', error);
  }
}

/**
 * Trigger score recalculation after nurture interaction
 * Called when lead replies to SMS, opens email, or clicks link
 * @param {String} leadId - Lead ID
 * @param {Object} interactionData - Interaction details
 */
async function triggerScoreAfterNurtureInteraction(leadId, interactionData = {}) {
  try {
    if (!leadId) {
      console.warn('[Lead Scoring Trigger] No leadId provided for nurture interaction');
      return;
    }

    const { type, action } = interactionData;
    console.log(`[Lead Scoring Trigger] Queuing score recalculation after nurture ${action} for lead: ${leadId}`);

    // Queue score calculation with higher priority for positive engagement
    const priority = action === 'reply' || action === 'click' ? 7 : 5;

    await queueScoreCalculation(leadId, {
      priority,
      delay: 1000 // 1 second delay
    });

    // Invalidate cache
    await queueCacheInvalidation({
      leadId,
      pattern: 'leads:top_scored:*'
    });

  } catch (error) {
    console.error('[Lead Scoring Trigger] Error triggering score after nurture interaction:', error);
  }
}

/**
 * Trigger score recalculation after lead data update
 * Called when lead data is manually updated (PATCH /api/leads/:id)
 * @param {String} leadId - Lead ID
 * @param {Object} updateData - Updated fields
 */
async function triggerScoreAfterLeadUpdate(leadId, updateData = {}) {
  try {
    if (!leadId) {
      console.warn('[Lead Scoring Trigger] No leadId provided for lead update');
      return;
    }

    // Check if update affects scoring factors
    const scoringFields = [
      'businessInterest',
      'employmentStatus',
      'incomeCommitment',
      'personalExperience',
      'decisionMaking',
      'status',
      'source',
      'importSource',
      'timezone',
      'notes'
    ];

    const affectsScore = Object.keys(updateData).some(field =>
      scoringFields.includes(field)
    );

    if (!affectsScore) {
      console.log(`[Lead Scoring Trigger] Lead update does not affect score, skipping recalculation`);
      return;
    }

    console.log(`[Lead Scoring Trigger] Queuing score recalculation after lead update for lead: ${leadId}`);

    await queueScoreCalculation(leadId, {
      priority: 5,
      delay: 1000
    });

    // Invalidate cache
    await queueCacheInvalidation({
      leadId,
      pattern: 'leads:top_scored:*'
    });

  } catch (error) {
    console.error('[Lead Scoring Trigger] Error triggering score after lead update:', error);
  }
}

/**
 * Batch trigger for multiple leads
 * Used when bulk operations affect multiple leads
 * @param {Array} leadIds - Array of lead IDs
 * @param {String} reason - Reason for recalculation
 */
async function triggerBatchScoreRecalculation(leadIds, reason = 'bulk_update') {
  try {
    if (!leadIds || leadIds.length === 0) {
      console.warn('[Lead Scoring Trigger] No leadIds provided for batch recalculation');
      return;
    }

    console.log(`[Lead Scoring Trigger] Queuing batch score recalculation for ${leadIds.length} leads (reason: ${reason})`);

    // Queue individual calculations with lower priority
    const promises = leadIds.map(leadId =>
      queueScoreCalculation(leadId, {
        priority: 3,
        delay: Math.random() * 5000 // Random delay 0-5 seconds to spread load
      })
    );

    await Promise.all(promises);

    // Invalidate top-scored cache
    await queueCacheInvalidation({
      pattern: 'leads:top_scored:*'
    });

    console.log(`[Lead Scoring Trigger] Queued ${leadIds.length} score recalculations`);

  } catch (error) {
    console.error('[Lead Scoring Trigger] Error triggering batch score recalculation:', error);
  }
}

/**
 * Initialize scoring triggers
 * Call this on server startup to set up event listeners
 */
function initializeScoringTriggers() {
  console.log('[Lead Scoring Trigger] Initializing scoring triggers...');

  // Can add event emitter listeners here if needed
  // For now, functions are called directly from controllers

  console.log('[Lead Scoring Trigger] Scoring triggers initialized');
}

/**
 * Middleware to trigger scoring after lead update
 * Add this to lead update routes
 */
function scoringTriggerMiddleware(req, res, next) {
  // Store original res.json
  const originalJson = res.json;

  // Override res.json to trigger scoring after response
  res.json = function(data) {
    // Send response first
    originalJson.call(this, data);

    // Then trigger scoring asynchronously (don't wait)
    if (data.success && req.params.id) {
      triggerScoreAfterLeadUpdate(req.params.id, req.body).catch(err => {
        console.error('[Lead Scoring Trigger] Middleware error:', err);
      });
    }
  };

  next();
}

module.exports = {
  triggerScoreAfterCall,
  triggerScoreAfterStatusUpdate,
  triggerScoreAfterNurtureInteraction,
  triggerScoreAfterLeadUpdate,
  triggerBatchScoreRecalculation,
  initializeScoringTriggers,
  scoringTriggerMiddleware
};