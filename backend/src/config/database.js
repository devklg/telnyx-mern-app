const mongoose = require('mongoose');
const { Pool } = require('pg');
const neo4j = require('neo4j-driver');
const redis = require('redis');

// MongoDB
const connectMongoDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
};

// PostgreSQL
const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

// Neo4j
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

const connectDatabases = async () => {
  await connectMongoDB();
  await pgPool.connect();
  await redisClient.connect();
  console.log('✅ All databases connected');
};

module.exports = {
  mongoose,
  pgPool,
  neo4jDriver,
  redisClient,
  connectDatabases
};
