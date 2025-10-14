# DEVELOPMENT STORY: MARCUS THOMPSON - SECURITY SPECIALIST
**BMAD v4 Voice Agent Learning System | Agent: Marcus Thompson - Security Lead**

## 🎯 **BUSINESS CONTEXT**
Comprehensive security implementation for Voice Agent Learning System handling sensitive prospect data across 700-1000 calls/day with PCI compliance for payment information.

## 📋 **STORY OVERVIEW**
**As a** Security Specialist  
**I want** enterprise-grade security across authentication, data encryption, and API protection  
**So that** prospect and business data remains secure during all operations

## 🏗️ **TECHNICAL REQUIREMENTS - SECURITY IMPLEMENTATION**

### **JWT Authentication System**
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class SecurityService {
  // Generate JWT tokens with role-based claims
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getRolePermissions(user.role)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'magnificent-worldwide',
      audience: 'voice-agent-system'
    });
  }
  
  // Verify and decode JWT tokens
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'magnificent-worldwide',
        audience: 'voice-agent-system'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Hash passwords with bcrypt
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }
  
  // Verify password against hash
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  
  // Get role-based permissions
  getRolePermissions(role) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'view_analytics'],
      operator: ['read', 'write', 'make_calls', 'view_leads'],
      viewer: ['read', 'view_analytics']
    };
    return permissions[role] || [];
  }
}
```

### **Authentication Middleware**
```javascript
// JWT authentication middleware
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = securityService.verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based access control middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Permission-based access control
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};
```

### **Data Encryption**
```javascript
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  // Encrypt sensitive data
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  // Decrypt sensitive data
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Hash sensitive identifiers (one-way)
  hashIdentifier(identifier) {
    return crypto
      .createHash('sha256')
      .update(identifier + process.env.HASH_SALT)
      .digest('hex');
  }
}
```

### **API Security Configuration**
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: 'Too many login attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### **Input Validation**
```javascript
const { body, validationResult } = require('express-validator');

// Lead data validation
const validateLead = [
  body('firstName').trim().isLength({ min: 1, max: 100 }).escape(),
  body('lastName').trim().isLength({ min: 1, max: 100 }).escape(),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('email').optional().isEmail().normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// User registration validation
const validateUserRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('name').trim().isLength({ min: 1, max: 100 }).escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### **Security Audit Logging**
```javascript
class SecurityAuditLogger {
  async logSecurityEvent(event) {
    const auditEntry = {
      timestamp: new Date(),
      eventType: event.type,
      userId: event.userId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      action: event.action,
      resource: event.resource,
      success: event.success,
      metadata: event.metadata
    };
    
    // Log to dedicated security audit table
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, user_id, ip_address, action, resource, success, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditEntry.eventType,
        auditEntry.userId,
        auditEntry.ipAddress,
        auditEntry.action,
        auditEntry.resource,
        auditEntry.success,
        JSON.stringify(auditEntry.metadata)
      ]
    );
    
    // Alert on suspicious activity
    if (this.isSuspicious(event)) {
      await this.sendSecurityAlert(event);
    }
  }
  
  isSuspicious(event) {
    // Multiple failed login attempts
    // Access to unauthorized resources
    // Unusual API usage patterns
    return false; // Implement detection logic
  }
}

// Audit middleware
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      await securityAuditLogger.logSecurityEvent({
        type: 'api_access',
        userId: req.user?.userId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        action,
        resource: req.originalUrl,
        success: res.statusCode < 400,
        metadata: {
          method: req.method,
          statusCode: res.statusCode
        }
      });
    });
    next();
  };
};
```

## 🔒 **PCI COMPLIANCE FOR PAYMENT DATA**

### **Secure Payment Information Handling**
```javascript
// Never store full credit card numbers
// Store only last 4 digits and tokenized reference
class PaymentSecurityService {
  async tokenizePayment(paymentData) {
    // Use third-party payment processor for tokenization
    const token = await paymentProcessor.tokenize({
      cardNumber: paymentData.cardNumber,
      cvv: paymentData.cvv,
      expiryDate: paymentData.expiryDate
    });
    
    // Store only safe reference
    return {
      token: token.id,
      last4: paymentData.cardNumber.slice(-4),
      cardType: this.detectCardType(paymentData.cardNumber),
      expiryMonth: paymentData.expiryDate.month,
      expiryYear: paymentData.expiryDate.year
    };
  }
  
  // PCI-compliant payment processing
  async processPayment(tokenReference, amount) {
    // All payment processing through certified processor
    return await paymentProcessor.charge({
      token: tokenReference,
      amount,
      currency: 'USD'
    });
  }
}
```

## 🧪 **SECURITY TESTING**

### **Penetration Testing Scenarios**
```javascript
describe('Security Testing', () => {
  test('should prevent SQL injection attacks', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .post('/api/leads')
      .send({ firstName: maliciousInput });
    
    expect(response.status).toBe(400);
    // Verify table still exists
    const users = await pool.query('SELECT COUNT(*) FROM users');
    expect(users.rows[0].count).toBeGreaterThan(0);
  });
  
  test('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/api/leads')
      .send({ firstName: xssPayload });
    
    expect(response.status).toBe(400);
  });
  
  test('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() => 
      request(app).get('/api/leads')
    );
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
  
  test('should require valid JWT for protected routes', async () => {
    const response = await request(app)
      .get('/api/calls')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(403);
  });
});
```

## 🏁 **DEFINITION OF DONE**

✅ JWT authentication system implemented with role-based access control  
✅ Data encryption operational for sensitive prospect information  
✅ API security headers and CORS configuration complete  
✅ Rate limiting implemented across all endpoints  
✅ Input validation preventing injection attacks  
✅ Security audit logging tracking all access attempts  
✅ PCI compliance measures for payment handling  
✅ Penetration testing completed with all vulnerabilities addressed  

---

**Agent:** Marcus Thompson - Security Specialist  
**Dependencies:** David Rodriguez Backend API  
**Estimated Effort:** 3-4 sprints  
**Priority:** CRITICAL (Security Foundation)  
**Technical Focus:** Authentication, encryption, API security, PCI compliance

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Enterprise Security Implementation