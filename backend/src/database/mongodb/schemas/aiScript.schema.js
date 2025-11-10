/**
 * AI Script Schema
 *
 * Stores AI-generated call scripts for leads
 * Used by the AI Recommendation Engine (Story 3.4)
 *
 * @author Claude AI Assistant
 */

const mongoose = require('mongoose');

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
  timestamps: true,
  collection: 'ai_scripts'
});

// Indexes for efficient queries
aiScriptSchema.index({ leadId: 1, generatedAt: -1 });
aiScriptSchema.index({ userId: 1, used: 1 });
aiScriptSchema.index({ used: 1, generatedAt: -1 });

// Virtual for script effectiveness rating
aiScriptSchema.virtual('effectivenessRating').get(function() {
  if (!this.effectiveness) return 'Not rated';
  if (this.effectiveness >= 8) return 'Excellent';
  if (this.effectiveness >= 6) return 'Good';
  if (this.effectiveness >= 4) return 'Fair';
  return 'Needs improvement';
});

// Method to mark as used
aiScriptSchema.methods.markAsUsed = function(effectiveness = null) {
  this.used = true;
  this.usedAt = new Date();
  if (effectiveness !== null) {
    this.effectiveness = effectiveness;
  }
  return this.save();
};

// Static method to get unused scripts for a lead
aiScriptSchema.statics.findUnusedForLead = function(leadId) {
  return this.findOne({
    leadId,
    used: false
  }).sort({ generatedAt: -1 });
};

// Static method to get script history
aiScriptSchema.statics.getHistory = function(leadId, limit = 10) {
  return this.find({ leadId })
    .sort({ generatedAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();
};

// Static method to get effectiveness stats
aiScriptSchema.statics.getEffectivenessStats = async function(userId = null) {
  const query = userId ? { userId, used: true } : { used: true };

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalUsed: { $sum: 1 },
        avgEffectiveness: { $avg: '$effectiveness' },
        totalRated: { $sum: { $cond: [{ $gt: ['$effectiveness', 0] }, 1, 0] } }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : {
    totalUsed: 0,
    avgEffectiveness: 0,
    totalRated: 0
  };
};

const AIScript = mongoose.model('AIScript', aiScriptSchema);

module.exports = AIScript;