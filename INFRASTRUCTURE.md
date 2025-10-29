# BMAD V4 - Infrastructure & DevOps Documentation

**Author**: Alex Martinez (ALPHA-1) - DevOps Lead
**Last Updated**: 2025-10-29
**Version**: 1.0.0

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Environment Configuration](#environment-configuration)
6. [Docker Setup](#docker-setup)
7. [Local Development](#local-development)
8. [Production Deployment](#production-deployment)
9. [Database Management](#database-management)
10. [Monitoring & Observability](#monitoring--observability)
11. [Troubleshooting](#troubleshooting)
12. [CI/CD Pipeline](#cicd-pipeline)

---

## Overview

BMAD V4 is a production-ready MERN stack application with advanced multi-database support, Telnyx voice integration, and comprehensive DevOps infrastructure.

### Technology Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js 18
- **Databases**: MongoDB, PostgreSQL, Neo4j, Redis, ChromaDB
- **Telephony**: Telnyx SDK
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana (optional)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BMAD V4 Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │────────▶│   Backend    │                  │
│  │  React+Vite  │         │  Express.js  │                  │
│  │  Port: 3500  │         │  Port: 3550  │                  │
│  └──────────────┘         └───────┬──────┘                  │
│                                    │                          │
│                    ┌───────────────┼───────────────┐         │
│                    │               │               │          │
│              ┌─────▼────┐   ┌─────▼────┐   ┌─────▼────┐    │
│              │ MongoDB  │   │PostgreSQL│   │  Neo4j   │     │
│              │ Port:    │   │ Port:    │   │ Ports:   │     │
│              │ 27017    │   │ 5432     │   │7474,7687 │     │
│              └──────────┘   └──────────┘   └──────────┘     │
│                                                               │
│              ┌──────────┐   ┌──────────┐                     │
│              │  Redis   │   │ ChromaDB │                     │
│              │ Port:    │   │ Port:    │                     │
│              │ 6379     │   │ 8000     │                     │
│              └──────────┘   └──────────┘                     │
│                                                               │
│  ┌──────────────┐                                            │
│  │ Voice Agent  │────────▶ Telnyx API                        │
│  │  Port: 3650  │                                            │
│  └──────────────┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Port(s) | Description |
|---------|---------|-------------|
| Frontend | 3500 | React application (Nginx in production) |
| Backend | 3550 | Express.js API server |
| Voice Agent | 3650 | Telnyx voice integration service |
| MongoDB | 27017 | Document database |
| PostgreSQL | 5432 | Relational database |
| Neo4j | 7474, 7687 | Graph database (HTTP, Bolt) |
| Redis | 6379 | Cache & session store |
| ChromaDB | 8000 | Vector database |
| Prometheus | 9090 | Metrics collection (optional) |
| Grafana | 3000 | Monitoring dashboard (optional) |
| Mongo Express | 8081 | MongoDB admin UI (dev only) |
| pgAdmin | 5050 | PostgreSQL admin UI (dev only) |

---

## Prerequisites

### Required Software
- **Docker**: Version 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Node.js**: Version 18+ (for local development)
- **npm** or **yarn**: Package manager

### Optional Tools
- **Git**: Version control
- **ngrok**: For webhook testing
- **VS Code**: Recommended IDE

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: 10GB free space
- **CPU**: 4 cores recommended

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app
```

### 2. Setup Environment Variables
```bash
# Copy the example environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Edit .env files with your configuration
nano .env
nano frontend/.env
```

### 3. Start Services

**Option A: Full Docker Stack (Production-like)**
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Option B: Development Mode (Databases Only)**
```bash
# Start only databases
docker-compose -f docker-compose.dev.yml up -d

# In separate terminals, run:
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

### 4. Verify Installation
```bash
# Check all containers are running
docker-compose ps

# Test backend health
curl http://localhost:3550/health

# Open frontend
open http://localhost:3500
```

---

## Environment Configuration

### Root `.env` File (Backend)

Complete list of environment variables:

```bash
# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=development          # development | production
PORT=3550                     # Backend server port
FRONTEND_URL=http://localhost:3500

# ===========================================
# DATABASE CONNECTIONS
# ===========================================

# MongoDB
MONGODB_URI=mongodb://localhost:27017/bmad_v4
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=5

# PostgreSQL
POSTGRES_URL=postgresql://postgres:password@localhost:5432/bmad_v4
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_SSL=false

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# Redis
REDIS_URL=redis://localhost:6379
REDIS_DB=0
REDIS_TTL=3600

# ChromaDB
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=bmad_embeddings

# ===========================================
# TELNYX CONFIGURATION
# ===========================================
TELNYX_API_KEY=your_telnyx_api_key
TELNYX_PUBLIC_KEY=your_telnyx_public_key
TELNYX_APP_ID=your_telnyx_app_id
TELNYX_PHONE_NUMBER=+1234567890
TELNYX_WEBHOOK_URL=https://your-domain.com/api/webhooks/telnyx

# ===========================================
# SECURITY
# ===========================================
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your_session_secret_minimum_32_characters

# ===========================================
# CORS & RATE LIMITING
# ===========================================
CORS_ORIGIN=http://localhost:3500
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend `.env` File

```bash
# API Configuration
VITE_API_URL=http://localhost:3550/api
VITE_API_TIMEOUT=30000

# Application
VITE_APP_NAME=BMAD V4 Lead Qualification
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development

# Telnyx
VITE_TELNYX_PUBLIC_KEY=your_telnyx_public_key

# WebSocket
VITE_WS_URL=ws://localhost:3550
```

---

## Docker Setup

### Production Deployment (`docker-compose.yml`)

This is the main production-ready configuration with:
- ✅ Health checks on all services
- ✅ Automatic restart policies
- ✅ Proper dependency management
- ✅ Network isolation
- ✅ Volume persistence
- ✅ Logging configuration
- ✅ Environment variable management

**Usage:**
```bash
# Start all services
docker-compose up -d

# View status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (CAREFUL: deletes data!)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up -d --build

# Scale a service (if needed)
docker-compose up -d --scale backend=3
```

### Development Setup (`docker-compose.dev.yml`)

Optimized for local development:
- 🚀 Only runs database services
- 🚀 Includes admin UIs (Mongo Express, pgAdmin)
- 🚀 Faster startup times
- 🚀 Separate development volumes

**Usage:**
```bash
# Start development databases
docker-compose -f docker-compose.dev.yml up -d

# Access admin UIs
open http://localhost:8081  # Mongo Express
open http://localhost:5050  # pgAdmin

# Stop development stack
docker-compose -f docker-compose.dev.yml down
```

---

## Local Development

### Without Docker (Native Development)

**Prerequisites:**
- Node.js 18+
- MongoDB, PostgreSQL, Redis, Neo4j, ChromaDB installed locally

**Backend Setup:**
```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server (with hot-reload)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

**Frontend Setup:**
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

**Voice Agent Setup:**
```bash
cd voice-agent

# Install dependencies
npm install

# Start voice agent server
npm run dev
```

### With Docker (Recommended)

**Best Practice:**
1. Start databases with Docker
2. Run app services natively for hot-reload

```bash
# Terminal 1: Start databases
docker-compose -f docker-compose.dev.yml up -d

# Terminal 2: Backend
cd backend && npm install && npm run dev

# Terminal 3: Frontend
cd frontend && npm install && npm run dev

# Terminal 4: Voice Agent (if needed)
cd voice-agent && npm install && npm run dev
```

---

## Production Deployment

### Building for Production

```bash
# Build all Docker images
docker-compose build

# Build specific service
docker-compose build backend

# Build with no cache (fresh build)
docker-compose build --no-cache
```

### Environment-Specific Deployment

**Staging:**
```bash
# Use staging environment file
docker-compose --env-file .env.staging up -d
```

**Production:**
```bash
# Use production environment file
docker-compose --env-file .env.production up -d
```

### Production Checklist

Before deploying to production:

- [ ] Change `NODE_ENV=production` in `.env`
- [ ] Set strong `JWT_SECRET` and `SESSION_SECRET`
- [ ] Configure proper `CORS_ORIGIN` with your production domain
- [ ] Update `TELNYX_WEBHOOK_URL` to production URL
- [ ] Set database passwords to secure values
- [ ] Enable `POSTGRES_SSL=true`
- [ ] Set `LOG_LEVEL=warn` or `error`
- [ ] Configure monitoring (Sentry, Prometheus)
- [ ] Setup automated backups
- [ ] Configure SSL certificates
- [ ] Setup proper firewall rules
- [ ] Enable rate limiting
- [ ] Review security headers
- [ ] Test all health checks
- [ ] Configure log rotation

---

## Database Management

### MongoDB

**Connection String:**
```
mongodb://localhost:27017/bmad_v4
```

**Access via Mongo Express (Dev):**
```
http://localhost:8081
Username: admin
Password: admin
```

**Backup:**
```bash
docker-compose exec mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp bmad-mongodb:/data/backup ./mongodb-backup
```

**Restore:**
```bash
docker cp ./mongodb-backup bmad-mongodb:/data/backup
docker-compose exec mongodb mongorestore /data/backup
```

### PostgreSQL

**Connection String:**
```
postgresql://postgres:password@localhost:5432/bmad_v4
```

**Access via pgAdmin (Dev):**
```
http://localhost:5050
Email: admin@bmad.local
Password: admin
```

**Backup:**
```bash
docker-compose exec postgres pg_dump -U postgres bmad_v4 > backup.sql
```

**Restore:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres bmad_v4
```

**Run Migrations:**
```bash
cd backend
npm run migrate
```

### Neo4j

**Access Neo4j Browser:**
```
http://localhost:7474
Username: neo4j
Password: password (or your configured password)
```

**Backup:**
```bash
docker-compose exec neo4j neo4j-admin dump --database=neo4j --to=/data/neo4j-backup.dump
docker cp bmad-neo4j:/data/neo4j-backup.dump ./neo4j-backup.dump
```

### Redis

**Connect via Redis CLI:**
```bash
docker-compose exec redis redis-cli

# Test connection
PING
# Should return: PONG

# View all keys
KEYS *

# Get value
GET key_name
```

**Flush Redis (Clear all data):**
```bash
docker-compose exec redis redis-cli FLUSHALL
```

### ChromaDB

**API Endpoint:**
```
http://localhost:8000
```

**Health Check:**
```bash
curl http://localhost:8000/api/v1/heartbeat
```

---

## Monitoring & Observability

### Health Checks

**Backend Health:**
```bash
curl http://localhost:3550/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T10:00:00.000Z",
  "uptime": 3600,
  "databases": {
    "mongodb": "connected",
    "postgresql": "connected",
    "neo4j": "connected",
    "redis": "connected",
    "chroma": "connected"
  }
}
```

**Container Health:**
```bash
# Check all container status
docker-compose ps

# Check specific container health
docker inspect bmad-backend --format='{{.State.Health.Status}}'
```

### Logs

**View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2025-10-29T10:00:00 backend
```

**Log Files:**
- Backend logs: `./logs/` (mounted volume)
- Container logs: JSON format in Docker

### Prometheus & Grafana (Optional)

To enable monitoring, uncomment the Prometheus and Grafana services in `docker-compose.yml`:

**Start Monitoring Stack:**
```bash
docker-compose up -d prometheus grafana
```

**Access Dashboards:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

**Grafana Setup:**
1. Login to Grafana
2. Add Prometheus data source: `http://prometheus:9090`
3. Import pre-configured dashboard from `infrastructure/monitoring/grafana-dashboard.json`

---

## Troubleshooting

### Common Issues

#### Container Won't Start

**Problem:** Service fails to start
```bash
# Check logs for errors
docker-compose logs service-name

# Check if port is already in use
lsof -i :3550  # for backend
netstat -an | grep 3550

# Kill process using port
kill -9 $(lsof -t -i:3550)
```

#### Database Connection Failed

**Problem:** Backend can't connect to databases

**Solution:**
```bash
# 1. Check if database containers are running
docker-compose ps

# 2. Check if databases are healthy
docker-compose ps | grep healthy

# 3. Restart databases
docker-compose restart mongodb postgres neo4j redis chroma

# 4. Check database logs
docker-compose logs mongodb
```

#### Permission Errors

**Problem:** Permission denied errors in containers

**Solution:**
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./data

# Or rebuild containers
docker-compose down -v
docker-compose up -d --build
```

#### Out of Memory

**Problem:** Containers crashing due to memory

**Solution:**
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory → Increase limit

# Reduce Neo4j memory settings in docker-compose.yml
```

#### Frontend Can't Reach Backend

**Problem:** API requests fail from frontend

**Solution:**
1. Check `VITE_API_URL` in `frontend/.env`
2. Ensure backend is running: `curl http://localhost:3550/health`
3. Check CORS settings in backend `.env`
4. Verify network connectivity: `docker network ls`

### Debugging

**Enter Container Shell:**
```bash
# Backend container
docker-compose exec backend sh

# MongoDB container
docker-compose exec mongodb mongosh

# PostgreSQL container
docker-compose exec postgres psql -U postgres bmad_v4
```

**Inspect Container:**
```bash
docker inspect bmad-backend
```

**Check Environment Variables:**
```bash
docker-compose exec backend env
```

**Network Debugging:**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect bmad-network

# Test connectivity between containers
docker-compose exec backend ping mongodb
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

Located in `.github/workflows/`

#### 1. Continuous Integration (`ci.yml`)

**Triggers:** Push and Pull Request to `main`, `develop`

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run linters
5. Run tests
6. Build Docker images
7. Run security scans

**Usage:**
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

#### 2. Staging Deployment (`deploy-staging.yml`)

**Triggers:** Push to `develop` branch

**Steps:**
1. Build production images
2. Push to container registry
3. Deploy to staging environment
4. Run smoke tests

#### 3. Production Deployment (`deploy-production.yml`)

**Triggers:** Manual workflow dispatch or tags

**Steps:**
1. Build production images
2. Run comprehensive tests
3. Push to production registry
4. Deploy to production
5. Run health checks
6. Notify team

### Manual Deployment

**Build and Tag Images:**
```bash
# Build images
docker-compose build

# Tag for registry
docker tag bmad-backend:latest registry.example.com/bmad-backend:v1.0.0
docker tag bmad-frontend:latest registry.example.com/bmad-frontend:v1.0.0

# Push to registry
docker push registry.example.com/bmad-backend:v1.0.0
docker push registry.example.com/bmad-frontend:v1.0.0
```

**Deploy to Server:**
```bash
# SSH to production server
ssh user@production-server

# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Verify deployment
docker-compose ps
curl http://localhost:3550/health
```

---

## Scripts & Automation

### Setup Script

Located: `infrastructure/scripts/setup.sh`

**Usage:**
```bash
chmod +x infrastructure/scripts/setup.sh
./infrastructure/scripts/setup.sh
```

**What it does:**
- Checks prerequisites
- Copies environment files
- Starts Docker services
- Runs database migrations
- Seeds initial data
- Verifies installation

### Backup Script

Located: `infrastructure/scripts/backup-databases.sh`

**Usage:**
```bash
chmod +x infrastructure/scripts/backup-databases.sh
./infrastructure/scripts/backup-databases.sh
```

**What it does:**
- Backs up all databases
- Creates timestamped archives
- Stores in `./backups/`

**Schedule Daily Backups (Cron):**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/infrastructure/scripts/backup-databases.sh
```

### Health Check Script

Located: `infrastructure/scripts/healthcheck.js`

**Usage:**
```bash
node infrastructure/scripts/healthcheck.js
```

**Returns:**
- Exit code 0: All services healthy
- Exit code 1: One or more services unhealthy

---

## Security Best Practices

### Secrets Management

❌ **DON'T:**
- Commit `.env` files to Git
- Hardcode secrets in code
- Use weak passwords
- Share production credentials

✅ **DO:**
- Use environment variables
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly
- Use strong, unique passwords
- Enable 2FA for production access

### Network Security

```bash
# Restrict database ports (production)
# Only expose backend/frontend ports
# Use Docker networks for inter-service communication
```

### SSL/TLS

```bash
# Use HTTPS in production
# Enable SSL for PostgreSQL
# Use secure WebSocket (wss://)
```

---

## Performance Optimization

### Database Tuning

**MongoDB:**
- Enable connection pooling
- Create indexes for frequent queries
- Use projection to limit returned fields

**PostgreSQL:**
- Enable query caching
- Create indexes
- Use connection pooling
- Tune `max_connections`

**Redis:**
- Set appropriate TTL
- Use pipelining for bulk operations
- Monitor memory usage

### Application Tuning

**Backend:**
- Enable compression middleware
- Use Redis for session storage
- Implement rate limiting
- Use CDN for static assets

**Frontend:**
- Code splitting
- Lazy loading
- Image optimization
- Enable Vite build optimization

---

## Support & Maintenance

### Resources

- **Documentation**: `./docs/`
- **Issue Tracker**: GitHub Issues
- **Style Guide**: https://github.com/devklg/style-guide

### Maintenance Tasks

**Daily:**
- Monitor logs for errors
- Check health checks
- Review security alerts

**Weekly:**
- Review metrics and performance
- Update dependencies
- Backup verification

**Monthly:**
- Security patches
- Dependency updates
- Capacity planning
- Performance review

---

## Contact

**DevOps Lead**: Alex Martinez (ALPHA-1)
**Project**: Magnificent Worldwide Marketing & Sales Group CRM
**Repository**: https://github.com/devklg/telnyx-mern-app

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
