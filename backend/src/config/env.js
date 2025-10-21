require('dotenv').config();

module.exports = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bmad-v4',
  
  // PostgreSQL (Neon)
  postgresUri: process.env.DATABASE_URL || 'postgresql://localhost:5432/bmad_v4',
  
  // Neo4j
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
  
  // ChromaDB
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Telnyx
  telnyxApiKey: process.env.TELNYX_API_KEY,
  telnyxPublicKey: process.env.TELNYX_PUBLIC_KEY,
  telnyxAppId: process.env.TELNYX_APP_ID,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  
  // Anthropic Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  
  // Rate Limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
};