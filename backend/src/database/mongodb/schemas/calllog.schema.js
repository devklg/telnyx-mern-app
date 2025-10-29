const mongoose = require('mongoose');

/**
 * CallLog Schema for BMAD V4 Lead Qualification App
 * Detailed call logging with Telnyx integration, quality metrics, and technical details
 * Separate from Call schema to provide granular call tracking and analytics
 *
 * @author Sarah Chen (SIGMA-1) - Database Architect
 * @database MongoDB
 * @integration Telnyx Voice API
 */

const callLogSchema = new mongoose.Schema({
  // Core Identifiers
  callLogId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  // Telnyx Integration
  telnyx: {
    callControlId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    callSessionId: String,
    callLegId: String,
    connectionId: String,
    clientState: String,
    // Telnyx API response data
    apiResponse: mongoose.Schema.Types.Mixed,
    webhookEvents: [{
      eventType: String,
      timestamp: Date,
      payload: mongoose.Schema.Types.Mixed
    }]
  },

  // References
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
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Call Direction and Type
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['cold-call', 'follow-up', 'callback', 'support', 'qualification', 'demo', 'closing', 'other'],
    default: 'other',
    index: true
  },

  // Phone Numbers
  from: {
    number: {
      type: String,
      required: true,
      index: true
    },
    displayName: String,
    country: String,
    formatted: String
  },
  to: {
    number: {
      type: String,
      required: true,
      index: true
    },
    displayName: String,
    country: String,
    formatted: String
  },
  forwardedFrom: String,
  originalTo: String,

  // Call Status and State
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'early-media', 'answered', 'bridged', 'active', 'held', 'hangup', 'completed', 'busy', 'no-answer', 'failed', 'cancelled', 'rejected'],
    required: true,
    default: 'initiated',
    index: true
  },
  answerState: {
    type: String,
    enum: ['human', 'machine', 'voicemail', 'fax', 'unknown', 'no-answer'],
    index: true
  },
  hangupCause: {
    type: String,
    enum: ['normal-clearing', 'user-busy', 'no-answer', 'call-rejected', 'invalid-number', 'network-error', 'timeout', 'originator-cancel', 'system-shutdown', 'other']
  },
  hangupSource: {
    type: String,
    enum: ['caller', 'callee', 'system', 'network', 'error']
  },

  // Timing Information
  initiatedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  ringingAt: Date,
  answeredAt: Date,
  bridgedAt: Date,
  endedAt: Date,

  // Duration Metrics (all in seconds)
  duration: {
    total: { type: Number, default: 0 },          // Total call duration
    ringing: { type: Number, default: 0 },        // Time spent ringing
    talking: { type: Number, default: 0 },        // Time spent in conversation
    hold: { type: Number, default: 0 },           // Time on hold
    postCall: { type: Number, default: 0 }        // Post-call work time
  },

  // Call Quality Metrics
  quality: {
    // MOS: Mean Opinion Score (1-5, 5 being best)
    mos: {
      type: Number,
      min: 1,
      max: 5
    },
    // Audio Quality
    audio: {
      codec: String,                               // e.g., 'PCMU', 'OPUS'
      sampleRate: Number,                          // e.g., 8000, 48000 Hz
      bitrate: Number,                             // kbps
      packetLoss: Number,                          // Percentage
      jitter: Number,                              // Milliseconds
      latency: Number,                             // Milliseconds (RTT)
      averageRtt: Number                           // Average Round Trip Time
    },
    // Network Quality
    network: {
      type: String,                                // e.g., 'wifi', '4G', '5G', 'ethernet'
      signalStrength: Number,                      // Percentage or dBm
      bandwidth: Number,                           // kbps
      packetsReceived: Number,
      packetsSent: Number,
      packetsLost: Number,
      bytesReceived: Number,
      bytesSent: Number
    },
    // Call Quality Issues
    issues: [{
      type: {
        type: String,
        enum: ['echo', 'static', 'choppy', 'one-way-audio', 'delay', 'volume-low', 'volume-high', 'dropped', 'other']
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      timestamp: Date,
      description: String,
      resolved: { type: Boolean, default: false },
      resolvedAt: Date
    }],
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    },
    ratedBy: {
      type: String,
      enum: ['system', 'agent', 'lead']
    },
    ratedAt: Date
  },

  // Recording Information
  recording: {
    enabled: { type: Boolean, default: false },
    consentGiven: { type: Boolean, default: false },
    consentTimestamp: Date,
    consentMethod: {
      type: String,
      enum: ['verbal', 'written', 'implicit', 'not-required']
    },
    recordingUrl: String,
    recordingDuration: Number,
    recordingSize: Number,                         // Bytes
    recordingFormat: String,                       // e.g., 'mp3', 'wav'
    downloadUrl: String,
    expiresAt: Date,
    transcriptionUrl: String,
    status: {
      type: String,
      enum: ['processing', 'available', 'failed', 'expired', 'deleted']
    }
  },

  // Transcription
  transcription: {
    enabled: { type: Boolean, default: false },
    provider: {
      type: String,
      enum: ['telnyx', 'google', 'aws', 'azure', 'deepgram', 'assemblyai', 'other']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    fullText: String,
    confidence: Number,                            // Average confidence score
    language: {
      type: String,
      default: 'en-US'
    },
    turns: [{
      speaker: {
        type: String,
        enum: ['agent', 'lead', 'unknown']
      },
      text: String,
      startTime: Number,                           // Seconds from call start
      endTime: Number,
      confidence: Number
    }],
    keywords: [String],
    entities: [{
      type: String,
      value: String,
      confidence: Number
    }],
    processedAt: Date,
    error: String
  },

  // Call Flow and Events
  events: [{
    eventType: {
      type: String,
      enum: ['initiated', 'ringing', 'answered', 'bridged', 'hold', 'unhold', 'transfer', 'dtmf', 'recording-started', 'recording-stopped', 'mute', 'unmute', 'hangup', 'error', 'other']
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    description: String,
    data: mongoose.Schema.Types.Mixed
  }],

  // DTMF (Touch-tone) Inputs
  dtmfInputs: [{
    digit: String,
    timestamp: Date,
    context: String                                // What was being captured (e.g., 'menu-selection', 'extension')
  }],

  // Transfer Information
  transfer: {
    wasTransferred: { type: Boolean, default: false },
    transferType: {
      type: String,
      enum: ['blind', 'attended', 'warm', 'cold']
    },
    transferredTo: {
      number: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    transferredBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    transferredAt: Date,
    transferReason: String,
    transferSuccessful: Boolean
  },

  // Hold Information
  holds: [{
    startedAt: Date,
    endedAt: Date,
    duration: Number,                              // Seconds
    reason: String
  }],

  // Voicemail
  voicemail: {
    left: { type: Boolean, default: false },
    duration: Number,
    transcription: String,
    audioUrl: String,
    retrievedAt: Date
  },

  // AI Analysis (specific to the call)
  aiAnalysis: {
    sentiment: {
      overall: {
        type: String,
        enum: ['very-positive', 'positive', 'neutral', 'negative', 'very-negative', 'mixed']
      },
      score: Number,
      bySegment: [{
        startTime: Number,
        endTime: Number,
        sentiment: String,
        score: Number
      }]
    },
    // Speech analytics
    speech: {
      agentTalkTime: Number,                       // Seconds
      leadTalkTime: Number,                        // Seconds
      talkRatio: Number,                           // Agent/Lead talk time ratio
      silenceDuration: Number,                     // Total silence in seconds
      interruptions: {
        byAgent: Number,
        byLead: Number
      },
      speakingRate: {
        agent: Number,                             // Words per minute
        lead: Number
      },
      pauseCount: Number,
      longestMonologue: {
        speaker: String,
        duration: Number
      }
    },
    // Detected intents and topics
    intents: [String],
    topics: [String],
    keywords: [String],
    entities: [{
      type: String,
      value: String,
      confidence: Number
    }],
    // Qualification indicators
    qualification: {
      signals: [String],
      concerns: [String],
      objections: [String],
      interests: [String],
      score: Number
    },
    // Compliance
    compliance: {
      scriptFollowed: Boolean,
      requiredDisclosuresMade: [String],
      complianceScore: Number,
      violations: [String]
    },
    processedAt: Date,
    modelVersion: String
  },

  // Cost and Billing
  billing: {
    cost: Number,                                  // In cents
    currency: {
      type: String,
      default: 'USD'
    },
    ratePerMinute: Number,
    billingDuration: Number,                       // Billable minutes
    billingStatus: {
      type: String,
      enum: ['pending', 'billed', 'error']
    }
  },

  // Outcome
  outcome: {
    result: {
      type: String,
      enum: ['connected', 'no-answer', 'busy', 'voicemail', 'wrong-number', 'disconnected', 'failed', 'scheduled-callback', 'qualified', 'not-interested', 'other'],
      index: true
    },
    disposition: String,
    notes: String,
    callbackRequested: Boolean,
    callbackScheduledFor: Date,
    appointmentSet: Boolean,
    appointmentDateTime: Date
  },

  // Tags and Categories
  tags: {
    type: [String],
    index: true
  },
  categories: [String],

  // Notes
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['general', 'quality-issue', 'compliance', 'important', 'follow-up']
    }
  }],

  // Error Tracking
  errors: [{
    errorType: String,
    errorCode: String,
    errorMessage: String,
    timestamp: Date,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    resolved: { type: Boolean, default: false },
    resolution: String
  }],

  // Compliance and Legal
  compliance: {
    doNotCallCheck: Boolean,
    timeOfDayCompliant: Boolean,
    consentRecorded: Boolean,
    disclosuresMade: [String],
    regulatoryFlags: [String],
    reviewRequired: { type: Boolean, default: false },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date
  },

  // Custom Fields and Metadata
  customFields: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  // Lifecycle
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  archivedAt: Date,
  archivedReason: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Query Optimization
callLogSchema.index({ callLogId: 1 });
callLogSchema.index({ 'telnyx.callControlId': 1 });
callLogSchema.index({ leadId: 1, initiatedAt: -1 });
callLogSchema.index({ contactId: 1, initiatedAt: -1 });
callLogSchema.index({ callId: 1 });
callLogSchema.index({ conversationId: 1 });
callLogSchema.index({ campaignId: 1, initiatedAt: -1 });
callLogSchema.index({ assignedAgent: 1, status: 1 });
callLogSchema.index({ direction: 1, status: 1 });
callLogSchema.index({ callType: 1, initiatedAt: -1 });
callLogSchema.index({ status: 1, initiatedAt: -1 });
callLogSchema.index({ answerState: 1 });
callLogSchema.index({ 'from.number': 1 });
callLogSchema.index({ 'to.number': 1 });
callLogSchema.index({ 'outcome.result': 1 });
callLogSchema.index({ 'quality.overallRating': 1 });
callLogSchema.index({ initiatedAt: -1 });
callLogSchema.index({ answeredAt: -1 });
callLogSchema.index({ endedAt: -1 });
callLogSchema.index({ isActive: 1, status: 1 });
callLogSchema.index({ tags: 1 });

// Compound indexes for common queries
callLogSchema.index({ leadId: 1, direction: 1, initiatedAt: -1 });
callLogSchema.index({ assignedAgent: 1, status: 1, initiatedAt: -1 });
callLogSchema.index({ campaignId: 1, 'outcome.result': 1, initiatedAt: -1 });
callLogSchema.index({ direction: 1, answerState: 1, initiatedAt: -1 });
callLogSchema.index({ callType: 1, status: 1, 'quality.overallRating': -1 });

// Text index for search
callLogSchema.index({
  'transcription.fullText': 'text',
  'aiAnalysis.keywords': 'text',
  'outcome.notes': 'text',
  tags: 'text'
});

// Virtual for total duration in minutes
callLogSchema.virtual('totalDurationMinutes').get(function() {
  return this.duration.total ? Math.round(this.duration.total / 60) : 0;
});

// Virtual for billable duration in minutes
callLogSchema.virtual('billableDurationMinutes').get(function() {
  return this.billing?.billingDuration || 0;
});

// Virtual for answer time
callLogSchema.virtual('answerTimeSeconds').get(function() {
  if (!this.answeredAt || !this.ringingAt) return null;
  return Math.floor((this.answeredAt - this.ringingAt) / 1000);
});

// Virtual for call quality summary
callLogSchema.virtual('qualitySummary').get(function() {
  if (!this.quality?.overallRating) return 'Not rated';
  const rating = this.quality.overallRating;
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 3.5) return 'Good';
  if (rating >= 2.5) return 'Fair';
  if (rating >= 1.5) return 'Poor';
  return 'Very Poor';
});

// Pre-save middleware to calculate durations
callLogSchema.pre('save', function(next) {
  // Calculate ringing duration
  if (this.ringingAt && this.answeredAt) {
    this.duration.ringing = Math.floor((this.answeredAt - this.ringingAt) / 1000);
  }

  // Calculate total duration
  if (this.initiatedAt && this.endedAt) {
    this.duration.total = Math.floor((this.endedAt - this.initiatedAt) / 1000);
  }

  // Calculate talking duration
  if (this.answeredAt && this.endedAt) {
    const talkTime = Math.floor((this.endedAt - this.answeredAt) / 1000);
    const holdTime = this.duration.hold || 0;
    this.duration.talking = Math.max(0, talkTime - holdTime);
  }

  // Calculate hold duration from holds array
  if (this.holds && this.holds.length > 0) {
    this.duration.hold = this.holds.reduce((total, hold) => total + (hold.duration || 0), 0);
  }

  next();
});

// Static method to find calls by quality rating
callLogSchema.statics.findByQuality = function(minRating) {
  return this.find({
    'quality.overallRating': { $gte: minRating },
    status: 'completed',
    isActive: true
  }).sort({ 'quality.overallRating': -1 });
};

// Static method to find answered calls
callLogSchema.statics.findAnswered = function(startDate, endDate) {
  return this.find({
    answeredAt: { $gte: startDate, $lte: endDate },
    answerState: 'human',
    isActive: true
  }).sort({ answeredAt: -1 });
};

// Static method to get calls needing compliance review
callLogSchema.statics.findNeedingComplianceReview = function() {
  return this.find({
    'compliance.reviewRequired': true,
    'compliance.reviewedAt': { $exists: false },
    isActive: true
  }).sort({ initiatedAt: -1 });
};

// Instance method to calculate call success
callLogSchema.methods.isSuccessful = function() {
  return this.answerState === 'human' &&
         this.duration.talking >= 30 &&
         this.status === 'completed';
};

// Instance method to get call summary
callLogSchema.methods.getSummary = function() {
  return {
    id: this.callLogId,
    direction: this.direction,
    from: this.from.number,
    to: this.to.number,
    status: this.status,
    duration: this.totalDurationMinutes,
    quality: this.qualitySummary,
    outcome: this.outcome?.result,
    timestamp: this.initiatedAt
  };
};

module.exports = mongoose.model('CallLog', callLogSchema);
