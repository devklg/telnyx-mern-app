const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3500',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Routes
app.use('/api/leads', require('./routes/leads.routes'));
app.use('/api/calls', require('./routes/calls.routes'));
app.use('/api/voice', require('./routes/voice.routes'));
app.use('/api/webhooks', require('./routes/webhooks.routes'));
app.use('/api/qualification', require('./routes/qualification.routes'));
app.use('/api/scoring', require('./routes/scoring.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(require('./middleware/error.middleware'));

module.exports = app;
