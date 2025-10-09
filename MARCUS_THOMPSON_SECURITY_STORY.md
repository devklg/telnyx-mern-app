# DEVELOPMENT STORY: MARCUS THOMPSON - SECURITY SPECIALIST
**BMAD v4 Voice Agent Learning System | Agent: Marcus Thompson - Security Lead**

## 🎯 **BUSINESS CONTEXT**
Comprehensive security framework for Voice Agent Learning System handling sensitive lead qualification data, call recordings, and personal information for 700-1000 calls/day.

## 📋 **STORY OVERVIEW**
**As a** Security Specialist  
**I want** enterprise-grade security across all system components  
**So that** lead data, call recordings, and learning algorithms are protected against threats

## 🏗️ **TECHNICAL REQUIREMENTS - MERN STACK SECURITY**

### **Authentication & Authorization Framework**
```javascript
// JWT-based authentication with role-based access control
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');

// User authentication schema (MongoDB)
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: { 
    type: String, 
    required: true,
    minlength: 60 // bcrypt hash length
  },
  role: { 
    type: String, 
    enum: ['admin', 'operator', 'analyst', 'kevin'],
    default: 'operator'
  },
  permissions: [{
    resource: String,
    actions: [String] // ['read', 'write', 'delete', 'admin']
  }],
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: String,
    backupCodes: [String]
  },
  security: {
    lastLogin: Date,
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    ipWhitelist: [String],
    sessionTimeout: { type: Number, default: 3600 } // 1 hour
  },
  apiKeys: [{
    keyId: String,
    hashedKey: String,
    permissions: [String],
    lastUsed: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

// Security middleware for Express.js
const securityMiddleware = {
  
  // JWT authentication with security headers
  authenticateToken: (req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Log security event
        await logSecurityEvent({
          type: 'INVALID_TOKEN',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      // Check if user is locked
      const user = await User.findById(decoded.userId);
      if (user.security.lockedUntil && user.security.lockedUntil > Date.now()) {
        return res.status(423).json({ error: 'Account temporarily locked' });
      }
      
      req.user = decoded;
      next();
    });
  },
  
  // Role-based access control
  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        await logSecurityEvent({
          type: 'UNAUTHORIZED_ACCESS',
          userId: req.user?.userId,
          requiredRoles: roles,
          actualRole: req.user?.role,
          ip: req.ip,
          path: req.path
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  },
  
  // Rate limiting for API endpoints
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      await logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip: req.ip,
        path: req.path,
        timestamp: new Date()
      });
      res.status(429).json({ error: 'Rate limit exceeded' });
    }
  })
};
```

### **Data Encryption & Privacy Protection**
```javascript
// Encryption utilities for sensitive data
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

class DataEncryption {
  
  // Encrypt sensitive lead data
  static encryptSensitiveData(text) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  // Decrypt sensitive lead data
  static decryptSensitiveData(encryptedData) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Hash passwords with salt
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  // Generate secure API keys
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// MongoDB field-level encryption for sensitive data
const encryptedLeadSchema = new mongoose.Schema({
  // Encrypted fields
  firstName: {
    type: String,
    set: (value) => DataEncryption.encryptSensitiveData(value),
    get: (value) => DataEncryption.decryptSensitiveData(value)
  },
  lastName: {
    type: String,
    set: (value) => DataEncryption.encryptSensitiveData(value),
    get: (value) => DataEncryption.decryptSensitiveData(value)
  },
  email: {
    type: String,
    set: (value) => DataEncryption.encryptSensitiveData(value),
    get: (value) => DataEncryption.decryptSensitiveData(value)
  },
  phone: {
    type: String,
    set: (value) => DataEncryption.encryptSensitiveData(value),
    get: (value) => DataEncryption.decryptSensitiveData(value)
  }
});
```

### **API Security & Input Validation**
```javascript
// Comprehensive input validation and sanitization
const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// Input validation middleware
const leadValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('phone')
    .isMobilePhone('any')
    .withMessage('Must be a valid phone number'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .customSanitizer(value => xss(value)),
    
  // Check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// API security configuration
const apiSecurity = {
  
  // CORS configuration
  corsOptions: {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  },
  
  // MongoDB injection prevention
  mongoSanitizeOptions: {
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logSecurityEvent({
        type: 'MONGO_INJECTION_ATTEMPT',
        ip: req.ip,
        key,
        value: req.body[key],
        timestamp: new Date()
      });
    }
  },
  
  // Request size limiting
  requestLimits: {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb', extended: true }
  }
};
```

### **Security Monitoring & Incident Response**
```javascript
// Security event logging and monitoring
const securityLogger = {
  
  async logSecurityEvent(event) {
    const securityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      severity: this.calculateSeverity(event.type),
      metadata: {
        userAgent: event.userAgent,
        ip: event.ip,
        sessionId: event.sessionId
      }
    };
    
    // Store in MongoDB for analysis
    await SecurityEvent.create(securityEvent);
    
    // Alert for high-severity events
    if (securityEvent.severity >= 8) {
      await this.sendSecurityAlert(securityEvent);
    }
    
    // Update threat intelligence
    await this.updateThreatIntelligence(securityEvent);
  },
  
  calculateSeverity(eventType) {
    const severityMap = {
      'LOGIN_SUCCESS': 2,
      'LOGIN_FAILURE': 4,
      'INVALID_TOKEN': 6,
      'UNAUTHORIZED_ACCESS': 8,
      'RATE_LIMIT_EXCEEDED': 6,
      'MONGO_INJECTION_ATTEMPT': 9,
      'XSS_ATTEMPT': 9,
      'BRUTE_FORCE_ATTEMPT': 8,
      'SUSPICIOUS_ACTIVITY': 7
    };
    return severityMap[eventType] || 5;
  },
  
  async detectBruteForce(userId, ip) {
    const attempts = await SecurityEvent.countDocuments({
      type: 'LOGIN_FAILURE',
      'metadata.ip': ip,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 minutes
    });
    
    if (attempts >= 5) {
      await this.logSecurityEvent({
        type: 'BRUTE_FORCE_ATTEMPT',
        userId,
        ip,
        attemptCount: attempts
      });
      
      // Lock the account
      await User.findByIdAndUpdate(userId, {
        'security.lockedUntil': new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });
    }
  }
};
```

### **Database Security Configuration**
```javascript
// Secure database connection configuration
const databaseSecurity = {
  
  // MongoDB security settings
  mongoConfig: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: 'admin',
    ssl: true,
    sslValidate: true,
    sslCA: process.env.MONGO_SSL_CA,
    retryWrites: true,
    w: 'majority',
    readPreference: 'secondaryPreferred',
    
    // Connection encryption
    authMechanism: 'SCRAM-SHA-256',
    
    // Connection limits
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    
    // Security options
    compressors: 'zstd,zlib,snappy'
  },
  
  // PostgreSQL security (Neon)
  postgresConfig: {
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.NEON_SSL_CA
    },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20, // Maximum connections
    
    // Query timeout
    statement_timeout: 30000,
    
    // Security settings
    application_name: 'voice_agent_secure',
    sslmode: 'require'
  },
  
  // Neo4j security settings
  neo4jConfig: {
    encrypted: 'ENCRYPTION_ON',
    trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES',
    connectionTimeout: 20000,
    maxConnectionLifetime: 3600000, // 1 hour
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 60000
  }
};
```

## 🎨 **SHADCN/UI SECURITY DASHBOARD**

### **Security Monitoring Dashboard**
```tsx
// Security dashboard with shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, Lock, Eye } from "lucide-react"

export function SecurityDashboard() {
  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="magnificent-gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-magnificent-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Secure</div>
            <Badge variant="secondary" className="mt-2">
              All systems operational
            </Badge>
          </CardContent>
        </Card>
        
        <Card className="magnificent-gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Eye className="h-4 w-4 text-magnificent-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-magnificent-secondary">
              {securityMetrics.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics.newSessions} new this hour
            </p>
          </CardContent>
        </Card>
        
        <Card className="magnificent-gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {securityMetrics.eventsToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics.highSeverity} high severity
            </p>
          </CardContent>
        </Card>
        
        <Card className="magnificent-gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Encryption</CardTitle>
            <Lock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">100%</div>
            <p className="text-xs text-muted-foreground">
              All data encrypted
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Security Alerts */}
      {securityAlerts.map((alert) => (
        <Alert key={alert.id} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

## 🔒 **COMPLIANCE & AUDIT FRAMEWORK**

### **GDPR Compliance**
```javascript
// GDPR data handling compliance
const gdprCompliance = {
  
  // Data subject rights implementation
  async handleDataSubjectRequest(type, userId, email) {
    switch (type) {
      case 'DATA_ACCESS':
        return await this.exportUserData(userId);
      
      case 'DATA_DELETION':
        return await this.deleteUserData(userId);
      
      case 'DATA_PORTABILITY':
        return await this.exportPortableData(userId);
      
      case 'DATA_CORRECTION':
        return await this.facilitateDataCorrection(userId);
    }
  },
  
  // Audit trail for data processing
  async logDataProcessing(activity) {
    await DataProcessingLog.create({
      userId: activity.userId,
      dataType: activity.dataType,
      processingType: activity.processingType,
      legalBasis: activity.legalBasis,
      purpose: activity.purpose,
      timestamp: new Date(),
      retention: activity.retentionPeriod
    });
  }
};
```

## 🧪 **SECURITY TESTING STRATEGY**

### **Penetration Testing Framework**
- [ ] SQL/NoSQL injection testing across all databases
- [ ] XSS vulnerability scanning for React components
- [ ] Authentication bypass attempt testing
- [ ] Authorization escalation testing
- [ ] API rate limiting validation
- [ ] Input validation boundary testing

### **Security Automation**
- [ ] Automated vulnerability scanning in CI/CD
- [ ] Dependency security monitoring
- [ ] Container security scanning
- [ ] Code security analysis (SAST/DAST)
- [ ] Security regression testing

## 🏁 **DEFINITION OF DONE**

✅ Complete authentication and authorization system implemented  
✅ Data encryption operational for all sensitive information  
✅ API security measures protecting all endpoints  
✅ Security monitoring and incident response system active  
✅ GDPR compliance framework implemented  
✅ shadcn/ui security dashboard operational  
✅ Penetration testing completed with all issues resolved  
✅ Security documentation and training materials complete  

---

**Agent:** Marcus Thompson - Security Specialist  
**Dependencies:** Alex Martinez (DevOps), Sarah Chen (Database)  
**Estimated Effort:** 4-5 sprints  
**Priority:** CRITICAL (Security foundation required before deployment)  
**Technical Focus:** JWT authentication, data encryption, API security, compliance

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Enterprise Security Framework  
**Story:** Security Implementation - Comprehensive MERN stack security with compliance