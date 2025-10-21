#!/bin/bash

echo "🚀 BMAD V4 - Lead Qualification App Setup"
echo "=========================================="

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check required services
echo ""
echo "🔍 Checking required services..."

# MongoDB
if nc -z localhost 28000 2>/dev/null; then
    echo "✅ MongoDB running on port 28000"
else
    echo "⚠️  MongoDB not detected on port 28000"
    echo "   Run: docker run -d -p 28000:27017 --name bmad-mongo mongo:7"
fi

# Neo4j
if nc -z localhost 7687 2>/dev/null; then
    echo "✅ Neo4j running on port 7687"
else
    echo "⚠️  Neo4j not detected on port 7687"
    echo "   Run: docker run -d -p 7474:7474 -p 7687:7687 --name bmad-neo4j neo4j:5"
fi

# PostgreSQL (Neon or local)
echo "ℹ️  PostgreSQL: Configure in .env (Neon or local)"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    npm install
else
    echo "⚠️  Frontend package.json not found - run: npm create vite@latest frontend -- --template react"
fi
cd ..

# Setup environment files
echo ""
echo "📝 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    cp .env.example backend/.env
    echo "✅ Created backend/.env from template"
    echo "⚠️  IMPORTANT: Update backend/.env with your credentials"
else
    echo "✅ backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
    echo "VITE_API_URL=http://localhost:5000" > frontend/.env
    echo "✅ Created frontend/.env"
fi

# Initialize databases
echo ""
echo "🗄️  Initializing databases..."
cd backend
npm run init-db 2>/dev/null || echo "⚠️  Database initialization skipped (run manually)"
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Update backend/.env with your API keys"
echo "   2. Start backend: cd backend && npm run dev"
echo "   3. Start frontend: cd frontend && npm run dev"
echo "   4. Run tests: npm test"
echo ""
