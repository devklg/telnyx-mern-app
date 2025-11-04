const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3500',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined'));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/leads', require('./routes/leads.routes'));
app.use('/api/calls', require('./routes/calls.routes'));
app.use('/api/voice', require('./routes/voice.routes'));
app.use('/api/webhooks', require('./routes/webhooks.routes'));
app.use('/api/qualification', require('./routes/qualification.routes'));
app.use('/api/scoring', require('./routes/scoring.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/agent', require('./routes/agent.routes'));
app.use('/api/kevin', require('./routes/kevin.routes'));
app.use('/api/learning', require('./routes/learning.routes'));
app.use('/api/graph-rag', require('./routes/graph-rag.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handling
app.use(require('./middleware/error.middleware'));

module.exports = app;
