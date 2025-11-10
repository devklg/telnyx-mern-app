/**
 * Recommendation Cache Invalidation Middleware
 *
 * Automatically invalidates recommendation cache when leads are updated
 * or new calls are made. Ensures recommendations stay fresh.
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const { queueCacheInvalidation } = require('../queues/recommendation.queue');

/**
 * Middleware to invalidate cache after lead updates
 * Add this to lead update routes
 */
async function invalidateCacheOnLeadUpdate(req, res, next) {
  // Store original send function
  const originalSend = res.json;

  // Override res.json to trigger cache invalidation after successful response
  res.json = function (data) {
    // Only invalidate on successful updates
    if (data.success && req.params.id) {
      const leadId = req.params.id;
      const userId = req.body.assignedTo || req.user?.userId;

      // Queue cache invalidation (async - don't block response)
      queueCacheInvalidation({ leadId, userId }).catch(err => {
        console.error('Error queuing cache invalidation:', err);
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to invalidate cache after call completion
 * Add this to call webhook handlers
 */
async function invalidateCacheOnCallComplete(req, res, next) {
  const originalSend = res.json;

  res.json = function (data) {
    if (data.success && req.body.leadId) {
      const leadId = req.body.leadId;
      const userId = req.body.userId;

      queueCacheInvalidation({ leadId, userId }).catch(err => {
        console.error('Error queuing cache invalidation:', err);
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Manually invalidate cache for a user
 */
async function invalidateUserCache(userId) {
  try {
    await queueCacheInvalidation({ userId });
    console.log(`Cache invalidation queued for user ${userId}`);
  } catch (error) {
    console.error('Error invalidating user cache:', error);
    throw error;
  }
}

/**
 * Manually invalidate cache for a lead
 */
async function invalidateLeadCache(leadId) {
  try {
    await queueCacheInvalidation({ leadId });
    console.log(`Cache invalidation queued for lead ${leadId}`);
  } catch (error) {
    console.error('Error invalidating lead cache:', error);
    throw error;
  }
}

module.exports = {
  invalidateCacheOnLeadUpdate,
  invalidateCacheOnCallComplete,
  invalidateUserCache,
  invalidateLeadCache
};
