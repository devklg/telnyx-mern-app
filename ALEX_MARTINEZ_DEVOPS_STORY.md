# DEVELOPMENT STORY: ALEX MARTINEZ - DEVOPS INFRASTRUCTURE
**BMAD v4 Voice Agent Learning System | Agent: Alex Martinez - DevOps Lead**

## 🎯 **BUSINESS CONTEXT**
Voice Agent Learning System for Magnificent Worldwide Marketing & Sales Group targeting 700-1000 calls/day with continuous learning capabilities toward "beast mode" expert performance.

## 📋 **STORY OVERVIEW**
**As a** DevOps Infrastructure Lead  
**I want** complete Docker containerization and CI/CD pipeline  
**So that** the voice agent system can scale reliably across multiple environments

## 🏗️ **TECHNICAL REQUIREMENTS - MERN STACK + SHADCN/UI**

### **Docker Infrastructure**
```dockerfile
# Multi-stage production build for MERN stack
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

FROM node:18-alpine AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
COPY --from=frontend-build /app/frontend/build ./public

# Multi-database container orchestration
# - MongoDB for conversation transcripts
# - PostgreSQL (Neon) for operational data
# - Neo4j for knowledge graph
# - ChromaDB for vector embeddings
```

### **CI/CD Pipeline Architecture**
```yaml
# GitHub Actions workflow for MERN deployment
name: Voice Agent MERN Deployment
on:
  push:
    branches: [main, staging, agent/*]
  
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6.0
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

### **Multi-Database Orchestration**
```yaml
# docker-compose.yml for development environment
version: '3.8'
services:
  voice-agent-frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
      - REACT_APP_SOCKET_URL=http://localhost:5001
    depends_on:
      - voice-agent-backend
      
  voice-agent-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
      - "5001:5001"  # Socket.io server
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/voice_agent_transcripts
      - NEON_DATABASE_URL=postgresql://user:pass@neon-db:5432/voice_agent_ops
      - NEO4J_URI=bolt://neo4j:7687
      - CHROMA_URL=http://chroma:8000
      - TELNYX_API_KEY=${TELNYX_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - mongodb
      - neon-postgres
      - neo4j
      - chroma
      
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      
  neon-postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: voice_agent_ops
      POSTGRES_USER: voice_agent
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  neo4j:
    image: neo4j:5.13
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
      
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  mongodb_data:
  postgres_data:
  neo4j_data:
  chroma_data:
```

### **Production Deployment (AWS/Digital Ocean)**
```bash
# Production deployment script
#!/bin/bash
# Deploy voice agent system to production

# Build and tag images
docker build -t voice-agent-frontend:prod ./frontend
docker build -t voice-agent-backend:prod ./backend

# Deploy to container registry
docker tag voice-agent-frontend:prod registry.digitalocean.com/magnificent-worldwide/voice-agent-frontend:latest
docker tag voice-agent-backend:prod registry.digitalocean.com/magnificent-worldwide/voice-agent-backend:latest

# Deploy with zero-downtime rolling updates
kubectl apply -f k8s/voice-agent-deployment.yaml
kubectl rollout status deployment/voice-agent-backend
kubectl rollout status deployment/voice-agent-frontend

# Health checks and monitoring
kubectl get pods -l app=voice-agent
kubectl logs -f deployment/voice-agent-backend
```

### **Environment Configuration**
```bash
# Production environment variables
NODE_ENV=production
PORT=5000
SOCKET_PORT=5001

# Database connections
MONGODB_URI=mongodb+srv://user:pass@voice-agent-prod.mongodb.net/transcripts
NEON_DATABASE_URL=postgresql://user:pass@prod-neon.db/voice_agent_ops
NEO4J_URI=bolt://neo4j-prod:7687
CHROMA_URL=https://chroma-prod.magnificent-worldwide.com

# API Keys (managed through CI/CD secrets)
TELNYX_API_KEY=${TELNYX_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
JWT_SECRET=${JWT_SECRET}

# Magnificent Worldwide branding
BRAND_PRIMARY_COLOR=#3b82f6
BRAND_SECONDARY_COLOR=#facc15
BRAND_DARK_BG=#0f172a
```

## 🎨 **SHADCN/UI + MAGNIFICENT WORLDWIDE BRANDING**

### **React Component Architecture**
```tsx
// Frontend structure with shadcn/ui + Magnificent Worldwide theme
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── voice-agent/ # Voice agent control panels
│   │   ├── dashboard/   # Real-time analytics
│   │   └── magnificent-worldwide/ # Custom branded components
│   ├── lib/
│   │   ├── utils.ts     # shadcn/ui utilities
│   │   └── magnificent-theme.ts # Brand customization
│   ├── pages/
│   │   ├── dashboard/   # Real-time call monitoring
│   │   ├── calls/       # Call history and management
│   │   └── analytics/   # Performance analytics
│   └── styles/
│       ├── globals.css  # Tailwind + custom variables
│       └── magnificent-worldwide.css # Brand-specific styles
```

### **Custom Theme Integration**
```css
/* Magnificent Worldwide brand variables for shadcn/ui */
:root {
  --magnificent-primary: 59 130 246; /* #3b82f6 */
  --magnificent-secondary: 250 204 21; /* #facc15 */
  --magnificent-dark: 15 23 42; /* #0f172a */
  
  /* shadcn/ui variable overrides */
  --primary: var(--magnificent-primary);
  --secondary: var(--magnificent-secondary);
  --background: var(--magnificent-dark);
  --card: 30 41 59; /* Slightly lighter than background */
  --popover: 30 41 59;
  --muted: 51 65 85;
}

/* Magnificent Worldwide gradient backgrounds */
.magnificent-gradient {
  background: linear-gradient(135deg, 
    hsl(var(--magnificent-primary)) 0%, 
    hsl(var(--magnificent-secondary)) 100%);
}
```

## 🚀 **DEPLOYMENT STRATEGY**

### **Phase 1: MVP Development Environment**
- [ ] Local Docker development setup
- [ ] All 4 databases containerized and coordinated
- [ ] Frontend/backend communication established
- [ ] Basic CI/CD pipeline for development branches

### **Phase 2: Staging Environment**
- [ ] Staging deployment with production-like data
- [ ] Integration testing across all agent components
- [ ] Performance testing for 700-1000 call capacity
- [ ] Security testing and vulnerability scanning

### **Phase 3: Production Deployment**
- [ ] Production infrastructure with auto-scaling
- [ ] Monitoring and alerting for all components
- [ ] Backup and disaster recovery procedures
- [ ] Zero-downtime deployment capabilities

## 🧪 **TESTING STRATEGY**

### **Infrastructure Testing**
- [ ] Container orchestration testing
- [ ] Database connection resilience
- [ ] API gateway and load balancing
- [ ] Multi-environment consistency

### **Performance Testing**
- [ ] 1000 concurrent call simulations
- [ ] Database query optimization
- [ ] Real-time socket performance
- [ ] Memory and CPU optimization

## 🔒 **SECURITY & COMPLIANCE**
- [ ] Container security scanning
- [ ] Database encryption at rest and in transit
- [ ] API rate limiting and DDoS protection
- [ ] GDPR compliance for call recordings

## 🏁 **DEFINITION OF DONE**

✅ Complete Docker infrastructure operational across all environments  
✅ CI/CD pipeline deploying all 17 agent components successfully  
✅ Multi-database orchestration handling 700-1000 calls/day load  
✅ shadcn/ui + Magnificent Worldwide theme fully integrated  
✅ Zero-downtime deployment capabilities implemented  
✅ Monitoring and alerting operational for all system components  
✅ Security scanning and compliance measures active  
✅ Complete backup and disaster recovery procedures tested  

---

**Agent:** Alex Martinez - DevOps Infrastructure Lead  
**Dependencies:** All other agents (infrastructure foundation)  
**Estimated Effort:** 5-6 sprints  
**Priority:** CRITICAL (Infrastructure foundation for all development)  
**Technical Focus:** Docker, CI/CD, MERN stack deployment, multi-database orchestration

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Infrastructure Foundation  
**Story:** DevOps Infrastructure - Complete MERN Stack + shadcn/ui deployment platform