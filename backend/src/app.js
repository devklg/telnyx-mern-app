const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');

// Middleware imports
const errorMiddleware = require('./middleware/error.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const rateLimitMiddleware = require('./middleware/rate-limit.middleware');

// Route imports
const leadsRoutes = require('./routes/leads.routes');
const callsRoutes = require('./routes/calls.routes');
const voiceRoutes = require('./routes/voice.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const qualificationRoutes = require('./routes/qualification.routes');
const scoringRoutes = require('./routes/scoring.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportsRoutes = require('./routes/reports.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined'));
}
app.use(loggerMiddleware);

// Rate limiting
app.use(rateLimitMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'bmad-v4-backend'
  });
});

// API Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/qualification', qualificationRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

module.exports = app;