const mongoose = require('mongoose');
const { Pool } = require('pg');
const neo4j = require('neo4j-driver');
const config = require('./env');
const logger = require('../utils/logger');

// MongoDB Connection
let mongoConnection = null;

const connectMongoDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongoConnection = mongoose.connection;
    logger.info('✅ MongoDB connected successfully');
    return mongoConnection;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// PostgreSQL Connection Pool
const pgPool = new Pool({
  connectionString: config.postgresUri,
  ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
});

pgPool.on('connect', () => {
  logger.info('✅ PostgreSQL connected successfully');
});

pgPool.on('error', (err) => {
  logger.error('❌ PostgreSQL pool error:', err);
});

// Neo4j Connection
const neo4jDriver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);

const testNeo4jConnection = async () => {
  const session = neo4jDriver.session();
  try {
    await session.run('RETURN 1');
    logger.info('✅ Neo4j connected successfully');
  } catch (error) {
    logger.error('❌ Neo4j connection error:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Connect to all databases
const connectDatabases = async () => {
  await Promise.all([
    connectMongoDB(),
    pgPool.query('SELECT NOW()'),
    testNeo4jConnection(),
  ]);
  logger.info('✅ All databases connected');
};

// Graceful shutdown
const closeDatabases = async () => {
  await mongoose.connection.close();
  await pgPool.end();
  await neo4jDriver.close();
  logger.info('All database connections closed');
};

module.exports = {
  connectDatabases,
  closeDatabases,
  mongoose,
  pgPool,
  neo4jDriver,
};