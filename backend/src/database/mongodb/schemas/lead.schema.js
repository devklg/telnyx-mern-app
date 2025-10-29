const mongoose = require('mongoose');

/**
 * Lead Schema for BMAD V4 Lead Qualification App
 * Represents potential customers in the qualification pipeline
 *
 * @author Sarah Chen (SIGMA-1) - Database Architect
 * @database MongoDB
 */

const leadSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
  },
  alternatePhone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
  },

  // Company Information
  company: {
    name: String,
    title: String,
    industry: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']
    },
    website: String,
    linkedinUrl: String
  },

  // Lead Management
  source: {
    type: String,
    enum: ['website', 'referral', 'cold-call', 'linkedin', 'event', 'partner', 'advertisement', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'disqualified', 'lost'],
    default: 'new',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Qualification Data
  qualificationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  qualificationCriteria: {
    budget: { type: Boolean, default: false },
    authority: { type: Boolean, default: false },
    need: { type: Boolean, default: false },
    timeline: { type: Boolean, default: false }
  },
  qualifiedAt: Date,
  disqualificationReason: String,

  // Assignment and Ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  },

  // Communication Tracking
  lastContactedAt: Date,
  lastContactMethod: {
    type: String,
    enum: ['phone', 'email', 'sms', 'chat', 'other']
  },
  nextFollowUpAt: Date,
  contactAttempts: { type: Number, default: 0 },

  // Notes and Activities
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['general', 'call', 'email', 'meeting', 'task'],
      default: 'general'
    }
  }],

  // Conversation History (Denormalized for quick access)
  conversationHistory: [{
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call'
    },
    timestamp: Date,
    channel: String,
    summary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed']
    },
    keyPoints: [String]
  }],

  // AI Analysis & Insights
  aiInsights: {
    buyingSignals: [String],
    painPoints: [String],
    objections: [String],
    interests: [String],
    recommendedActions: [String],
    lastAnalyzedAt: Date
  },

  // Tags and Categorization
  tags: [String],

  // Custom Fields and Metadata
  customFields: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  // Consent and Compliance
  consent: {
    canCall: { type: Boolean, default: true },
    canEmail: { type: Boolean, default: true },
    canSMS: { type: Boolean, default: true },
    recordCalls: { type: Boolean, default: true },
    gdprConsent: { type: Boolean, default: false },
    consentDate: Date
  },

  // Conversion Tracking
  convertedAt: Date,
  conversionValue: Number,

  // Lifecycle Tracking
  isActive: { type: Boolean, default: true, index: true },
  archivedAt: Date,
  archivedReason: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Query Optimization
leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, qualificationScore: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ campaignId: 1, status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ lastContactedAt: -1 });
leadSchema.index({ nextFollowUpAt: 1 });
leadSchema.index({ qualificationScore: -1 });
leadSchema.index({ tags: 1 });
leadSchema.index({ 'company.industry': 1 });
leadSchema.index({ isActive: 1, status: 1 });

// Compound indexes for common queries
leadSchema.index({ assignedTo: 1, status: 1, nextFollowUpAt: 1 });
leadSchema.index({ campaignId: 1, qualificationScore: -1, status: 1 });

// Text index for search functionality
leadSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  'company.name': 'text',
  tags: 'text'
});

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for total conversations
leadSchema.virtual('totalConversations').get(function() {
  return this.conversationHistory ? this.conversationHistory.length : 0;
});

// Pre-save middleware to update qualification status
leadSchema.pre('save', function(next) {
  // Auto-qualify based on score threshold
  if (this.qualificationScore >= 70 && this.status === 'contacted') {
    this.status = 'qualified';
    this.qualifiedAt = new Date();
  }

  // Increment contact attempts if lastContactedAt changed
  if (this.isModified('lastContactedAt')) {
    this.contactAttempts += 1;
  }

  next();
});

// Static method to find leads ready for follow-up
leadSchema.statics.findReadyForFollowUp = function() {
  return this.find({
    nextFollowUpAt: { $lte: new Date() },
    status: { $in: ['contacted', 'qualified', 'nurturing'] },
    isActive: true
  }).sort({ priority: -1, nextFollowUpAt: 1 });
};

// Static method to find high-value leads
leadSchema.statics.findHighValue = function() {
  return this.find({
    qualificationScore: { $gte: 70 },
    status: { $in: ['qualified', 'nurturing'] },
    isActive: true
  }).sort({ qualificationScore: -1 });
};

// Instance method to calculate engagement level
leadSchema.methods.calculateEngagement = function() {
  const totalConversations = this.conversationHistory.length;
  const daysSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated === 0) return 0;

  return Math.min(100, Math.round((totalConversations / daysSinceCreated) * 10));
};

module.exports = mongoose.model('Lead', leadSchema);
