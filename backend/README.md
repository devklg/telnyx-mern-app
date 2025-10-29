# BMAD V4 Backend API

Express.js backend for lead qualification and management system.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp ../.env.example .env

# Run migrations
npm run migrate

# Start server
npm run dev
```

## API Endpoints

### Leads
- GET /api/leads - Get all leads
- GET /api/leads/:id - Get lead by ID
- POST /api/leads - Create new lead
- PUT /api/leads/:id - Update lead
- DELETE /api/leads/:id - Delete lead

### Calls
- GET /api/calls - Get all calls
- GET /api/calls/:id - Get call by ID
- POST /api/calls - Create call record
- GET /api/calls/:id/recording - Get call recording

### Voice
- POST /api/voice/initiate - Initiate outbound call
- POST /api/voice/transfer - Transfer active call
- GET /api/voice/status/:callId - Get call status

### Analytics
- GET /api/analytics/overview - Dashboard overview
- GET /api/analytics/conversion - Conversion metrics
- GET /api/analytics/performance - Performance metrics

## Architecture

- **MongoDB**: Lead and call data
- **PostgreSQL**: Structured data, qualifications
- **Neo4j**: Relationship mapping
- **Redis**: Caching layer
- **Telnyx**: Voice communications
