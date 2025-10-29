const mongoose = require('mongoose');

/**
 * Contact Schema for BMAD V4 Lead Qualification App
 * Represents all contacts in the system (leads, customers, partners, etc.)
 * Separate from Lead model to handle broader contact management
 *
 * @author Sarah Chen (SIGMA-1) - Database Architect
 * @database MongoDB
 */

const contactSchema = new mongoose.Schema({
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
  middleName: {
    type: String,
    trim: true
  },
  prefix: {
    type: String,
    enum: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', ''],
    default: ''
  },
  suffix: {
    type: String,
    trim: true
  },

  // Contact Type
  type: {
    type: String,
    enum: ['lead', 'customer', 'partner', 'vendor', 'staff', 'other'],
    default: 'lead',
    required: true,
    index: true
  },
  subType: {
    type: String,
    enum: ['prospect', 'active', 'inactive', 'vip', 'referral', ''],
    default: ''
  },

  // Contact Information
  email: {
    primary: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    secondary: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    work: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    }
  },
  phone: {
    primary: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
    },
    work: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
    },
    home: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format']
    }
  },

  // Address Information
  address: {
    street1: String,
    street2: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'US'
    },
    type: {
      type: String,
      enum: ['home', 'work', 'billing', 'shipping', 'other'],
      default: 'work'
    }
  },

  // Company/Organization Information
  company: {
    name: String,
    title: String,
    department: String,
    industry: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+', 'unknown'],
      default: 'unknown'
    },
    revenue: {
      type: String,
      enum: ['<1M', '1M-10M', '10M-50M', '50M-100M', '100M-500M', '500M+', 'unknown'],
      default: 'unknown'
    },
    website: String,
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    }
  },

  // Social and Online Presence
  socialProfiles: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String,
    github: String
  },

  // Lead Reference (if this contact is also a lead)
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    index: true
  },

  // Relationship Management
  relationshipStatus: {
    type: String,
    enum: ['new', 'active', 'engaged', 'at-risk', 'churned', 'inactive'],
    default: 'new',
    index: true
  },
  accountManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Communication Preferences
  preferences: {
    preferredChannel: {
      type: String,
      enum: ['phone', 'email', 'sms', 'chat', 'none'],
      default: 'email'
    },
    preferredTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any'],
      default: 'any'
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    language: {
      type: String,
      default: 'en'
    },
    doNotContact: {
      type: Boolean,
      default: false,
      index: true
    }
  },

  // Consent and Compliance
  consent: {
    canCall: { type: Boolean, default: true },
    canEmail: { type: Boolean, default: true },
    canSMS: { type: Boolean, default: true },
    recordCalls: { type: Boolean, default: true },
    gdprConsent: { type: Boolean, default: false },
    ccpaOptOut: { type: Boolean, default: false },
    consentDate: Date,
    consentSource: String,
    privacyPolicyAccepted: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false }
  },

  // Engagement Tracking
  engagement: {
    totalInteractions: { type: Number, default: 0 },
    lastInteractionAt: Date,
    lastInteractionType: {
      type: String,
      enum: ['call', 'email', 'sms', 'meeting', 'chat', 'other']
    },
    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    responsiveness: {
      type: String,
      enum: ['very-responsive', 'responsive', 'moderate', 'slow', 'unresponsive'],
      default: 'moderate'
    }
  },

  // Tags and Categorization
  tags: {
    type: [String],
    index: true
  },
  categories: [String],

  // Notes and Comments
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['general', 'call', 'email', 'meeting', 'task', 'alert'],
      default: 'general'
    },
    isPrivate: { type: Boolean, default: false }
  }],

  // Lifecycle and Status
  lifecycleStage: {
    type: String,
    enum: ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'other'],
    default: 'lead',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'archived'],
    default: 'active',
    index: true
  },

  // Source and Attribution
  source: {
    type: String,
    enum: ['website', 'referral', 'cold-call', 'linkedin', 'event', 'partner', 'advertisement', 'import', 'api', 'other'],
    default: 'other'
  },
  sourceDetails: String,
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },

  // Campaign Tracking
  campaigns: [{
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    joinedAt: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'opted-out', 'bounced']
    }
  }],

  // Custom Fields and Metadata
  customFields: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  // Important Dates
  birthdate: Date,
  anniversary: Date,

  // Data Quality
  dataQuality: {
    score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    lastVerifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    }
  },

  // Archive and Deletion
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
  archivedReason: String,
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Query Optimization
contactSchema.index({ 'phone.primary': 1 });
contactSchema.index({ 'email.primary': 1 });
contactSchema.index({ type: 1, status: 1 });
contactSchema.index({ leadId: 1 });
contactSchema.index({ accountManager: 1, status: 1 });
contactSchema.index({ relationshipStatus: 1 });
contactSchema.index({ lifecycleStage: 1 });
contactSchema.index({ 'company.name': 1 });
contactSchema.index({ 'company.industry': 1 });
contactSchema.index({ 'engagement.lastInteractionAt': -1 });
contactSchema.index({ 'engagement.engagementScore': -1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ isActive: 1, status: 1 });
contactSchema.index({ 'preferences.doNotContact': 1 });
contactSchema.index({ tags: 1 });

// Compound indexes for common queries
contactSchema.index({ type: 1, lifecycleStage: 1, status: 1 });
contactSchema.index({ accountManager: 1, relationshipStatus: 1, 'engagement.lastInteractionAt': -1 });
contactSchema.index({ 'company.industry': 1, lifecycleStage: 1 });

// Text index for search functionality
contactSchema.index({
  firstName: 'text',
  lastName: 'text',
  'email.primary': 'text',
  'company.name': 'text',
  'company.title': 'text',
  tags: 'text'
});

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  let name = '';
  if (this.prefix) name += this.prefix + ' ';
  name += `${this.firstName}`;
  if (this.middleName) name += ` ${this.middleName}`;
  name += ` ${this.lastName}`;
  if (this.suffix) name += `, ${this.suffix}`;
  return name.trim();
});

// Virtual for display name
contactSchema.virtual('displayName').get(function() {
  let name = `${this.firstName} ${this.lastName}`;
  if (this.company && this.company.name) {
    name += ` (${this.company.name})`;
  }
  return name;
});

// Virtual for primary contact method
contactSchema.virtual('primaryContact').get(function() {
  return {
    email: this.email?.primary || '',
    phone: this.phone?.primary || ''
  };
});

// Pre-save middleware to update engagement metrics
contactSchema.pre('save', function(next) {
  // Update data quality score
  let qualityScore = 0;
  if (this.firstName && this.lastName) qualityScore += 20;
  if (this.email?.primary) qualityScore += 20;
  if (this.phone?.primary) qualityScore += 20;
  if (this.company?.name) qualityScore += 15;
  if (this.address?.city && this.address?.state) qualityScore += 15;
  if (this.socialProfiles?.linkedin) qualityScore += 10;

  this.dataQuality.score = qualityScore;

  next();
});

// Static method to find contacts ready for engagement
contactSchema.statics.findReadyForEngagement = function() {
  return this.find({
    status: 'active',
    'preferences.doNotContact': false,
    'consent.canCall': true,
    isActive: true
  }).sort({ 'engagement.engagementScore': -1 });
};

// Static method to find high-value contacts
contactSchema.statics.findHighValue = function() {
  return this.find({
    lifecycleStage: { $in: ['opportunity', 'customer', 'evangelist'] },
    status: 'active',
    isActive: true
  }).sort({ 'engagement.engagementScore': -1 });
};

// Static method to find contacts needing attention
contactSchema.statics.findNeedingAttention = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    relationshipStatus: { $in: ['active', 'at-risk'] },
    'engagement.lastInteractionAt': { $lt: thirtyDaysAgo },
    'preferences.doNotContact': false,
    isActive: true
  }).sort({ 'engagement.lastInteractionAt': 1 });
};

// Instance method to calculate days since last interaction
contactSchema.methods.daysSinceLastInteraction = function() {
  if (!this.engagement.lastInteractionAt) return null;
  return Math.floor((Date.now() - this.engagement.lastInteractionAt) / (1000 * 60 * 60 * 24));
};

// Instance method to check if contact can be contacted
contactSchema.methods.canContact = function(channel = 'phone') {
  if (this.preferences.doNotContact) return false;
  if (this.status !== 'active') return false;
  if (!this.isActive) return false;

  switch (channel) {
    case 'phone':
      return this.consent.canCall;
    case 'email':
      return this.consent.canEmail;
    case 'sms':
      return this.consent.canSMS;
    default:
      return false;
  }
};

module.exports = mongoose.model('Contact', contactSchema);
