const mongoose = require('mongoose');

/**
 * Conversation Schema for BMAD V4 Lead Qualification App
 * Represents multi-turn conversations across various channels
 * Supports phone calls, emails, chat, SMS, and other communication methods
 *
 * @author Sarah Chen (SIGMA-1) - Database Architect
 * @database MongoDB
 * @integration ChromaDB for vector embeddings and semantic search
 */

const conversationSchema = new mongoose.Schema({
  // Core Identifiers
  conversationId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  // Participant References
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Channel and Type
  channel: {
    type: String,
    enum: ['phone', 'email', 'sms', 'chat', 'video', 'in-person', 'social', 'other'],
    required: true,
    index: true
  },
  subChannel: {
    type: String,
    enum: ['telnyx-voice', 'telnyx-sms', 'web-chat', 'whatsapp', 'messenger', 'twitter', 'linkedin', ''],
    default: ''
  },

  // Call Reference (if channel is phone)
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    index: true
  },
  callLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },

  // Campaign Reference
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  },

  // Conversation Status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'failed', 'archived', 'escalated'],
    default: 'active',
    required: true,
    index: true
  },

  // Timing Information
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  endedAt: Date,
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Messages/Turns Array
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    sender: {
      type: {
        type: String,
        enum: ['agent', 'lead', 'ai', 'system'],
        required: true
      },
      id: mongoose.Schema.Types.ObjectId,
      name: String
    },
    content: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      enum: ['text', 'audio', 'video', 'image', 'file', 'link'],
      default: 'text'
    },
    mediaUrl: String,
    // For voice conversations
    audioTranscript: String,
    audioConfidence: Number,
    audioDuration: Number,
    // AI Processing
    sentiment: {
      type: String,
      enum: ['very-positive', 'positive', 'neutral', 'negative', 'very-negative', 'mixed'],
      default: 'neutral'
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1
    },
    intent: String,
    entities: [{
      type: String,
      value: String,
      confidence: Number
    }],
    keywords: [String],
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  }],

  // Conversation Summary
  summary: {
    shortSummary: String, // 1-2 sentences
    detailedSummary: String, // Comprehensive summary
    keyPoints: [String],
    actionItems: [String],
    decisions: [String],
    questions: [String],
    concerns: [String],
    generatedAt: Date,
    generatedBy: {
      type: String,
      enum: ['ai', 'agent', 'system'],
      default: 'ai'
    }
  },

  // AI Analysis and Insights
  aiAnalysis: {
    // Overall sentiment
    overallSentiment: {
      type: String,
      enum: ['very-positive', 'positive', 'neutral', 'negative', 'very-negative', 'mixed'],
      default: 'neutral'
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    sentimentTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    },

    // Lead qualification
    qualificationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    qualificationFactors: {
      budget: { detected: Boolean, score: Number },
      authority: { detected: Boolean, score: Number },
      need: { detected: Boolean, score: Number },
      timeline: { detected: Boolean, score: Number }
    },

    // Topics and keywords
    mainTopics: [String],
    keywords: [String],
    mentionedProducts: [String],
    competitors: [String],

    // Behavioral signals
    buyingSignals: [String],
    painPoints: [String],
    objections: [String],
    interests: [String],

    // Engagement metrics
    engagementLevel: {
      type: String,
      enum: ['very-high', 'high', 'moderate', 'low', 'very-low'],
      default: 'moderate'
    },
    responseRate: Number, // Percentage of agent messages that got responses
    avgResponseTime: Number, // Average time to respond in seconds

    // Recommendations
    nextBestAction: String,
    recommendedFollowUpDate: Date,
    escalationRecommended: {
      type: Boolean,
      default: false
    },
    escalationReason: String,

    // Analysis metadata
    lastAnalyzedAt: Date,
    analysisVersion: String,
    modelUsed: String
  },

  // Outcome and Results
  outcome: {
    result: {
      type: String,
      enum: ['qualified', 'not-qualified', 'needs-follow-up', 'not-interested', 'callback-requested', 'meeting-scheduled', 'sale-made', 'no-answer', 'voicemail', 'wrong-number', 'other'],
      index: true
    },
    reason: String,
    notes: String,
    scheduledFollowUp: Date,
    meetingScheduled: {
      scheduled: Boolean,
      scheduledFor: Date,
      meetingType: String,
      attendees: [String]
    },
    dealValue: Number,
    dealStage: String
  },

  // Vector Embeddings for Semantic Search (ChromaDB integration)
  embeddings: {
    conversationEmbedding: [Number], // Vector embedding of entire conversation
    chromaDocId: String, // Document ID in ChromaDB
    lastEmbeddedAt: Date,
    embeddingModel: String
  },

  // Quality Metrics
  quality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    transcriptQuality: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reviewRequired: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String
  },

  // Compliance and Recording
  compliance: {
    recordingConsent: {
      type: Boolean,
      default: false
    },
    consentTimestamp: Date,
    consentMethod: {
      type: String,
      enum: ['verbal', 'written', 'implicit', 'not-required']
    },
    recordingUrl: String,
    recordingDuration: Number,
    recordingTranscript: String,
    gdprCompliant: {
      type: Boolean,
      default: false
    },
    dataRetentionDate: Date,
    canBeUsedForTraining: {
      type: Boolean,
      default: false
    }
  },

  // Tags and Categorization
  tags: {
    type: [String],
    index: true
  },
  categories: [String],

  // Notes and Annotations
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['general', 'important', 'follow-up', 'alert', 'compliance'],
      default: 'general'
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],

  // Integration Data
  integrations: {
    telnyxData: mongoose.Schema.Types.Mixed,
    crmData: mongoose.Schema.Types.Mixed,
    analyticsData: mongoose.Schema.Types.Mixed
  },

  // Custom Fields and Metadata
  customFields: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  // Lifecycle Tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archivedReason: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Query Optimization
conversationSchema.index({ conversationId: 1 });
conversationSchema.index({ leadId: 1, startedAt: -1 });
conversationSchema.index({ contactId: 1, startedAt: -1 });
conversationSchema.index({ assignedAgent: 1, status: 1 });
conversationSchema.index({ channel: 1, status: 1 });
conversationSchema.index({ callId: 1 });
conversationSchema.index({ campaignId: 1, startedAt: -1 });
conversationSchema.index({ status: 1, lastActivityAt: -1 });
conversationSchema.index({ startedAt: -1 });
conversationSchema.index({ endedAt: -1 });
conversationSchema.index({ 'outcome.result': 1 });
conversationSchema.index({ 'aiAnalysis.qualificationScore': -1 });
conversationSchema.index({ 'aiAnalysis.overallSentiment': 1 });
conversationSchema.index({ isActive: 1, status: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ 'quality.reviewRequired': 1 });

// Compound indexes for common queries
conversationSchema.index({ leadId: 1, channel: 1, startedAt: -1 });
conversationSchema.index({ assignedAgent: 1, status: 1, lastActivityAt: -1 });
conversationSchema.index({ campaignId: 1, 'outcome.result': 1, startedAt: -1 });
conversationSchema.index({ channel: 1, 'aiAnalysis.qualificationScore': -1 });

// Text index for search functionality
conversationSchema.index({
  'summary.shortSummary': 'text',
  'summary.detailedSummary': 'text',
  'summary.keyPoints': 'text',
  'aiAnalysis.keywords': 'text',
  tags: 'text'
});

// Virtual for message count
conversationSchema.virtual('messageCount').get(function() {
  return this.messages ? this.messages.filter(m => !m.isDeleted).length : 0;
});

// Virtual for active duration (in minutes)
conversationSchema.virtual('durationMinutes').get(function() {
  return this.duration ? Math.round(this.duration / 60) : 0;
});

// Virtual for participant count
conversationSchema.virtual('participantCount').get(function() {
  if (!this.messages) return 0;
  const uniqueSenders = new Set(this.messages.map(m => m.sender.id?.toString()).filter(Boolean));
  return uniqueSenders.size;
});

// Pre-save middleware to update metrics
conversationSchema.pre('save', function(next) {
  // Update duration if conversation ended
  if (this.endedAt && this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }

  // Update last activity time
  if (this.messages && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.lastActivityAt = lastMessage.timestamp;
  }

  // Calculate completeness score
  let completeness = 0;
  if (this.summary?.shortSummary) completeness += 20;
  if (this.summary?.keyPoints && this.summary.keyPoints.length > 0) completeness += 15;
  if (this.aiAnalysis?.qualificationScore > 0) completeness += 20;
  if (this.outcome?.result) completeness += 25;
  if (this.messages && this.messages.length >= 3) completeness += 20;

  this.quality.completeness = completeness;

  next();
});

// Static method to find conversations needing review
conversationSchema.statics.findNeedingReview = function() {
  return this.find({
    'quality.reviewRequired': true,
    'quality.reviewedAt': { $exists: false },
    isActive: true
  }).sort({ startedAt: -1 });
};

// Static method to find high-value conversations
conversationSchema.statics.findHighValue = function() {
  return this.find({
    'aiAnalysis.qualificationScore': { $gte: 70 },
    status: 'completed',
    isActive: true
  }).sort({ 'aiAnalysis.qualificationScore': -1 });
};

// Static method to find conversations by date range
conversationSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    startedAt: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ startedAt: -1 });
};

// Static method to get conversations by channel
conversationSchema.statics.findByChannel = function(channel) {
  return this.find({
    channel,
    isActive: true
  }).sort({ startedAt: -1 });
};

// Instance method to add message
conversationSchema.methods.addMessage = function(messageData) {
  const message = {
    messageId: new mongoose.Types.ObjectId().toString(),
    timestamp: new Date(),
    ...messageData
  };
  this.messages.push(message);
  this.lastActivityAt = message.timestamp;
  return message;
};

// Instance method to calculate average response time
conversationSchema.methods.calculateAvgResponseTime = function() {
  if (!this.messages || this.messages.length < 2) return 0;

  let totalResponseTime = 0;
  let responseCount = 0;

  for (let i = 1; i < this.messages.length; i++) {
    const currentMsg = this.messages[i];
    const previousMsg = this.messages[i - 1];

    if (currentMsg.sender.type === 'lead' && previousMsg.sender.type === 'agent') {
      const responseTime = (currentMsg.timestamp - previousMsg.timestamp) / 1000;
      totalResponseTime += responseTime;
      responseCount++;
    }
  }

  return responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
};

// Instance method to get sentiment breakdown
conversationSchema.methods.getSentimentBreakdown = function() {
  if (!this.messages || this.messages.length === 0) {
    return { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  }

  const breakdown = {
    'very-positive': 0,
    'positive': 0,
    'neutral': 0,
    'negative': 0,
    'very-negative': 0,
    'mixed': 0
  };

  this.messages.forEach(msg => {
    if (msg.sentiment) {
      breakdown[msg.sentiment]++;
    }
  });

  return breakdown;
};

module.exports = mongoose.model('Conversation', conversationSchema);
