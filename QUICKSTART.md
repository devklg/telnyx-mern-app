# BMAD V4 - Quick Start Guide

Get up and running in 5 minutes! 🚀

---

## Prerequisites

✅ Docker & Docker Compose installed
✅ Node.js 18+ (for local development)
✅ 8GB RAM minimum

---

## Option 1: Full Docker Stack (Easiest)

Perfect for testing the complete application.

```bash
# 1. Clone repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# 2. Setup environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Start everything
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. Open application
open http://localhost:3500
```

**Ports:**
- Frontend: http://localhost:3500
- Backend API: http://localhost:3550
- Voice Agent: http://localhost:3650

**Stop services:**
```bash
docker-compose down
```

---

## Option 2: Development Mode (Recommended)

Best for active development with hot-reload.

```bash
# 1. Clone repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# 2. Setup environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Start databases only
docker-compose -f docker-compose.dev.yml up -d

# 4. Install & run backend (Terminal 1)
cd backend
npm install
npm run dev

# 5. Install & run frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

**Access Points:**
- Frontend: http://localhost:3500
- Backend: http://localhost:3550
- Mongo Express: http://localhost:8081 (admin/admin)
- pgAdmin: http://localhost:5050 (admin@bmad.local/admin)

---

## Verify Installation

```bash
# Check backend health
curl http://localhost:3550/health

# Should return:
# {"status":"ok","timestamp":"...","databases":{...}}
```

---

## Default Credentials

### Development Databases

**MongoDB:**
- Host: localhost:27017
- Database: bmad_v4_dev

**PostgreSQL:**
- Host: localhost:5432
- Database: bmad_v4_dev
- User: postgres
- Password: devpassword

**Neo4j:**
- Host: localhost:7474 (Browser)
- Bolt: localhost:7687
- User: neo4j
- Password: devpassword

**Redis:**
- Host: localhost:6379

**ChromaDB:**
- Host: localhost:8000

---

## Next Steps

1. **Configure Telnyx** - Add your Telnyx API keys to `.env`
2. **Explore API** - Check http://localhost:3550/api-docs (if Swagger enabled)
3. **Read Docs** - See `INFRASTRUCTURE.md` for detailed documentation
4. **Start Developing** - Checkout your agent branch and start coding!

---

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Remove all data (CAREFUL!)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

---

## Troubleshooting

**Port already in use?**
```bash
# Check what's using the port
lsof -i :3550

# Kill the process
kill -9 <PID>
```

**Database connection failed?**
```bash
# Restart databases
docker-compose restart mongodb postgres redis

# Check if databases are healthy
docker-compose ps
```

**Can't access frontend?**
- Check if backend is running: `curl http://localhost:3550/health`
- Verify VITE_API_URL in `frontend/.env`

---

## Need Help?

- 📖 Full Documentation: `INFRASTRUCTURE.md`
- 🐛 Report Issues: GitHub Issues
- 💬 Contact: DevOps Lead - Alex Martinez

---

**Quick Links:**
- Repository: https://github.com/devklg/telnyx-mern-app
- Style Guide: https://github.com/devklg/style-guide
