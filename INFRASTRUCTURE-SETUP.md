# 🚀 BMAD V4 - Infrastructure Setup Guide

## 📋 Overview
This guide covers the initial infrastructure setup for the BMAD V4 Lead Qualification & Management App.

## 🎯 Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: Latest version (for databases)

### Required Services
- **MongoDB**: Port 28000
- **Neo4j**: Port 7687 (Bolt) / 7474 (HTTP)
- **PostgreSQL/Neon**: Configure in .env

## 🏗️ Project Structure

```
telnyx-mern-app/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # External service integrations
│   │   ├── utils/           # Helper functions
│   │   └── config/          # Configuration files
│   ├── scripts/             # Database & setup scripts
│   ├── tests/               # Test suites
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # API service layer
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── contexts/        # React context providers
│   │   └── assets/          # Static assets
│   ├── public/              # Public static files
│   └── tests/               # Frontend tests
└── setup.sh                 # Automated setup script
```

## 🚀 Quick Start

### 1. Automated Setup (Recommended)
```bash
# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

### 2. Manual Setup

#### Step 1: Start Database Services
```bash
# MongoDB
docker run -d \
  -p 28000:27017 \
  --name bmad-mongo \
  -e MONGO_INITDB_DATABASE=telnyx-mern-app \
  mongo:7

# Neo4j
docker run -d \
  -p 7474:7474 \
  -p 7687:7687 \
  --name bmad-neo4j \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5
```

#### Step 2: Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.example backend/.env

# Edit backend/.env with your credentials
# Required variables:
# - MONGODB_URI
# - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
# - NEON_CONNECTION_STRING (or local PostgreSQL)
# - TELNYX_API_KEY
# - ANTHROPIC_API_KEY
```

#### Step 4: Initialize Databases
```bash
cd backend
npm run init-db
```

#### Step 5: Run Validation Tests
```bash
cd backend
npm test
```

## 🗄️ Database Seed Scripts

### MongoDB Seeding
```bash
cd backend
node scripts/seed-mongodb.js
```

Seeds the following collections:
- `agents` - AI agent records
- `leads` - Lead contact information
- `call_logs` - Call history
- `conversations` - Conversation transcripts

### Neo4j Seeding
```bash
cd backend
node scripts/seed-neo4j.js
```

Creates:
- ProjectContext node
- Sample Agent nodes
- Task relationships

### Initialize All Databases
```bash
cd backend
npm run init-db
```

Runs all seed scripts in sequence.

## ✅ Validation Tests

### Run All Tests
```bash
cd backend
npm test
```

### Test Coverage
```bash
cd backend
npm test -- --coverage
```

### Test Suite Includes:
- ✅ MongoDB connection validation
- ✅ Neo4j connection validation
- ✅ Environment variable checks
- ✅ Required collections existence
- ✅ Project context node verification

## 🔧 Development Commands

### Backend
```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Lint code
npm run lint

# Initialize databases
npm run init-db
```

### Frontend
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## 🐳 Docker Services

### Start All Services
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

## 📊 Database Access

### MongoDB
- **Connection**: `mongodb://localhost:28000/telnyx-mern-app`
- **GUI**: MongoDB Compass or Studio 3T

### Neo4j
- **Browser**: http://localhost:7474
- **Bolt**: bolt://localhost:7687
- **Credentials**: neo4j / password (default)

### PostgreSQL/Neon
- **Connection**: See `.env` configuration
- **GUI**: pgAdmin or DBeaver

## 🔍 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
docker ps | grep bmad-mongo

# Restart MongoDB
docker restart bmad-mongo

# View logs
docker logs bmad-mongo
```

### Neo4j Connection Failed
```bash
# Check if Neo4j is running
docker ps | grep bmad-neo4j

# Restart Neo4j
docker restart bmad-neo4j

# View logs
docker logs bmad-neo4j
```

### Port Already in Use
```bash
# Find process using port 28000 (MongoDB)
lsof -i :28000

# Kill process
kill -9 <PID>
```

## 📝 Next Steps

After successful setup:

1. ✅ Verify all tests pass: `npm test`
2. ✅ Start backend: `cd backend && npm run dev`
3. ✅ Start frontend: `cd frontend && npm run dev`
4. ✅ Access dashboard: http://localhost:3000
5. ✅ Check API health: http://localhost:5000/health

## 📚 Additional Resources

- [Git Workflow](./GIT-WORKFLOW.md)
- [Agent Onboarding](./AGENT-ONBOARDING-CHECKLIST.md)
- [Project Summary](./PROJECT-SUMMARY.md)
- [Development Story](./DEVELOPMENT_STORY.md)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review agent story files for specific roles
3. Consult the Git workflow documentation
4. Create an issue in GitHub repository

---

**Last Updated**: 2025-10-15  
**Version**: 1.0.0  
**Maintained by**: BMAD V4 Development Team (17 Agents)
