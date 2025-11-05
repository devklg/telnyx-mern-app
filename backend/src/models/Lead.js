const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Basic Lead Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  phoneAreaCode: {
    type: String
  },
  
  // Lead Source Information
  leadCategory: {
    type: String,
    enum: ['FRESH TELEPHONE INTERVIEWED LEAD', 'OTHER'],
    default: 'OTHER'
  },
  ipAddress: {
    type: String
  },
  
  // Lead Status & Qualification
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'disqualified', 'callback', 'not_interested', 'transferred', 'completed'],
    default: 'new',
    index: true
  },
  qualificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Qualification Criteria (Ron Maleziis Weights)
  businessInterest: {
    type: Number,
    min: 0,
    max: 25,
    default: 0
  },
  employmentStatus: {
    type: Number,
    min: 0,
    max: 20,
    default: 0
  },
  incomeCommitment: {
    type: Number,
    min: 0,
    max: 25,
    default: 0
  },
  personalExperience: {
    type: Number,
    min: 0,
    max: 15,
    default: 0
  },
  decisionMaking: {
    type: Number,
    min: 0,
    max: 15,
    default: 0
  },
  
  // Call History
  calls: [{
    callId: String,
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    outcome: String,
    recording: String, // URL to recording
    transcript: String,
    notes: String
  }],
  
  // Assignment & Ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  // Communication Preferences
  preferredContactTime: String,
  timezone: String,
  doNotCall: {
    type: Boolean,
    default: false
  },
  
  // Gmail Import Metadata
  gmailMessageId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  gmailThreadId: String,
  importedAt: {
    type: Date,
    default: Date.now
  },
  importSource: {
    type: String,
    default: 'gmail'
  },
  
  // Additional Notes
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Misc Fields from Lead Provider
  gender: String,
  misc1: String,
  misc2: String,
  misc3: String,
  misc4: String,
  misc5: String,
  misc6: String,
  misc7: String,
  misc8: String,
  
  // Timestamps
  lastContactedAt: Date,
  qualifiedAt: Date
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'leads'
});

// Indexes for common queries
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ email: 1, phone: 1 });
leadSchema.index({ importedAt: -1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to calculate total qualification score
leadSchema.methods.calculateQualificationScore = function() {
  this.qualificationScore = 
    (this.businessInterest || 0) +
    (this.employmentStatus || 0) +
    (this.incomeCommitment || 0) +
    (this.personalExperience || 0) +
    (this.decisionMaking || 0);
  return this.qualificationScore;
};

// Method to check if lead is qualified
leadSchema.methods.isQualified = function(threshold = 60) {
  return this.qualificationScore >= threshold;
};

// Static method to find duplicate leads
leadSchema.statics.findDuplicate = async function(email, phone) {
  return this.findOne({
    $or: [
      { email: email.toLowerCase() },
      { phone: phone }
    ]
  });
};

// Pre-save hook to calculate qualification score
leadSchema.pre('save', function(next) {
  if (this.isModified('businessInterest') || 
      this.isModified('employmentStatus') || 
      this.isModified('incomeCommitment') ||
      this.isModified('personalExperience') ||
      this.isModified('decisionMaking')) {
    this.calculateQualificationScore();
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
