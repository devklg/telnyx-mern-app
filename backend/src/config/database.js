/**
 * BMAD V4 - Database Connection Manager
 * 
 * @description Manages connections to MongoDB, PostgreSQL, Neo4j, and ChromaDB
 * @owner David Rodriguez (Backend Lead) & Sarah Chen (Database Architect)
 * @created 2025-10-21
 */

const mongoose = require('mongoose');
const { Pool } = require('pg');
const neo4j = require('neo4j-driver');
const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

// Connection instances
let postgresPool = null;
let neo4jDriver = null;
let chromaClient = null;

/**
 * Connect to MongoDB using Mongoose
 */
async function connectMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmad-v4';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Connect to PostgreSQL (Neon)
 */
async function connectPostgreSQL() {
  try {
    postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await postgresPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    logger.info('✅ PostgreSQL connected successfully');
    return postgresPool;
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
}

/**
 * Connect to Neo4j
 */
async function connectNeo4j() {
  try {
    const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USER || 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD;

    neo4jDriver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );

    // Verify connectivity
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();

    logger.info('✅ Neo4j connected successfully');
    return neo4jDriver;
  } catch (error) {
    logger.error('❌ Neo4j connection failed:', error);
    throw error;
  }
}

/**
 * Connect to ChromaDB
 */
async function connectChromaDB() {
  try {
    const chromaHost = process.env.CHROMA_HOST || 'localhost';
    const chromaPort = process.env.CHROMA_PORT || 8000;

    chromaClient = new ChromaClient({
      path: `http://${chromaHost}:${chromaPort}`
    });

    // Test connection by getting heartbeat
    await chromaClient.heartbeat();

    logger.info('✅ ChromaDB connected successfully');
    return chromaClient;
  } catch (error) {
    logger.error('❌ ChromaDB connection failed:', error);
    throw error;
  }
}

/**
 * Connect to all databases
 */
async function connectDatabases() {
  try {
    logger.info('🔌 Connecting to all databases...');
    
    await Promise.all([
      connectMongoDB(),
      connectPostgreSQL(),
      connectNeo4j(),
      connectChromaDB()
    ]);

    logger.info('✅ All database connections established');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from all databases
 */
async function disconnectDatabases() {
  try {
    logger.info('Disconnecting from databases...');

    // Close MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('✅ MongoDB disconnected');
    }

    // Close PostgreSQL
    if (postgresPool) {
      await postgresPool.end();
      logger.info('✅ PostgreSQL disconnected');
    }

    // Close Neo4j
    if (neo4jDriver) {
      await neo4jDriver.close();
      logger.info('✅ Neo4j disconnected');
    }

    logger.info('✅ All databases disconnected');
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
    throw error;
  }
}

// Getters for database clients
function getMongoConnection() {
  return mongoose.connection;
}

function getPostgresPool() {
  if (!postgresPool) {
    throw new Error('PostgreSQL not connected');
  }
  return postgresPool;
}

function getNeo4jDriver() {
  if (!neo4jDriver) {
    throw new Error('Neo4j not connected');
  }
  return neo4jDriver;
}

function getChromaClient() {
  if (!chromaClient) {
    throw new Error('ChromaDB not connected');
  }
  return chromaClient;
}

module.exports = {
  connectDatabases,
  disconnectDatabases,
  getMongoConnection,
  getPostgresPool,
  getNeo4jDriver,
  getChromaClient
};
