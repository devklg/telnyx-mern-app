# Backend Setup Instructions
**David Rodriguez - Backend Development Lead**

## ✅ Configuration Complete!

Your `.env` file has been created with:
- ✅ Telnyx API credentials configured
- ✅ Secure JWT secrets generated (cryptographically random)
- ✅ MongoDB configured for port 28000
- ✅ All backend settings optimized

---

## 🚀 Next Steps to Start the Server

### 1. Start MongoDB on Port 28000

You have **three options**:

#### **Option A: Use Docker (Recommended)**
```bash
# Start MongoDB on port 28000
docker run -d \
  --name bmad-mongodb \
  -p 28000:27017 \
  -e MONGO_INITDB_DATABASE=bmad_v4 \
  -v bmad_mongodb_data:/data/db \
  mongo:latest

# Verify it's running
docker ps | grep bmad-mongodb
```

#### **Option B: Change to Standard Port 27017**
If you already have MongoDB on port 27017:
1. Edit `.env` and change:
   ```
   MONGODB_URI=mongodb://localhost:27017/bmad_v4
   ```
2. Start MongoDB:
   ```bash
   mongod --dbpath /data/db
   ```

#### **Option C: Install MongoDB Locally on Port 28000**
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install -y mongodb

# Start MongoDB on custom port
mongod --port 28000 --dbpath /data/db
```

---

### 2. Verify MongoDB is Running

```bash
# Check if MongoDB is accessible
nc -zv localhost 28000

# Or connect with mongo shell
mongo --port 28000
```

---

### 3. Install Backend Dependencies (if not done)

```bash
cd /home/user/telnyx-mern-app/backend
npm install
```

---

### 4. Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

You should see:
```
✅ All databases connected
✅ Socket.io initialized
🚀 Server running on port 3550
📍 HTTP: http://localhost:3550
📡 WebSocket: ws://localhost:3550
🎯 Environment: development
```

---

### 5. Test the Server

#### **Health Check**
```bash
curl http://localhost:3550/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T...",
  "uptime": 42.5,
  "environment": "development"
}
```

#### **API Endpoints**
```bash
# List all available endpoints
curl http://localhost:3550/api

# Test authentication (should fail without token - expected)
curl http://localhost:3550/api/leads
```

---

## 📋 Environment Variables Summary

### ✅ Configured:
- `PORT=3550` - Backend API server
- `MONGODB_URI=mongodb://localhost:28000/bmad_v4`
- `TELNYX_API_KEY` - Your Telnyx credentials
- `TELNYX_PHONE_NUMBER=+13233288457`
- `JWT_SECRET` - Secure 256-bit random secret
- `ANTHROPIC_API_KEY` - Claude API for voice agent

### ⚠️ Still Need:
- `TELNYX_CONNECTION_ID` - Get this from your Telnyx dashboard
- `KEVIN_PHONE_NUMBER` - Update with Kevin's real phone number for transfers

---

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Error:** "MongoNetworkError: connect ECONNREFUSED localhost:28000"

**Solutions:**
1. Verify MongoDB is running: `nc -zv localhost 28000`
2. Check MongoDB logs
3. Try standard port: Change `.env` to port 27017

### Port Already in Use

**Error:** "EADDRINUSE: address already in use :::3550"

**Solution:**
```bash
# Find what's using port 3550
lsof -i :3550

# Kill the process
kill -9 <PID>
```

### Telnyx Connection Issues

**Error:** "Telnyx client not initialized"

**Solution:**
1. Check `.env` has valid `TELNYX_API_KEY`
2. Get `TELNYX_CONNECTION_ID` from Telnyx Portal → Connections
3. Restart the server after updating `.env`

---

## 📚 API Documentation

Once the server is running, visit:
- **Swagger Docs:** http://localhost:3550/api-docs (if enabled)
- **Health Check:** http://localhost:3550/health

---

## 🎯 Quick Start Commands

```bash
# 1. Start MongoDB (Docker)
docker run -d --name bmad-mongodb -p 28000:27017 mongo:latest

# 2. Navigate to backend
cd /home/user/telnyx-mern-app/backend

# 3. Install dependencies (if needed)
npm install

# 4. Start the server
npm run dev
```

---

## 🔐 Security Notes

- ✅ `.env` is in `.gitignore` - never commit it
- ✅ JWT secrets are cryptographically secure (256-bit)
- ✅ All sensitive data is environment-specific
- ⚠️ Change `WEBHOOK_SECRET` before production
- ⚠️ Update admin password from default

---

## 📞 Need Help?

**MongoDB not working?**
- Check if port 28000 is available: `lsof -i :28000`
- Try standard port 27017 instead

**Server won't start?**
- Check `.env` file exists in `/backend/` directory
- Verify all required dependencies: `npm install`
- Check logs: `tail -f logs/error.log`

**Telnyx calls not working?**
- Verify `TELNYX_API_KEY` is correct
- Add `TELNYX_CONNECTION_ID` (required for calls)
- Check webhook URL is accessible

---

**Status:** Ready to start! 🚀
**Next:** Start MongoDB, then run `npm run dev`
