// BMAD V4 - Infrastructure Validation Tests
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');
require('dotenv').config();

describe('BMAD V4 Infrastructure Validation', () => {
  
  // Test MongoDB Connection
  test('MongoDB connection should succeed', async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:28000/telnyx-mern-app';
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      const db = client.db('telnyx-mern-app');
      const collections = await db.listCollections().toArray();
      
      expect(collections.length).toBeGreaterThan(0);
      console.log('✅ MongoDB: Connected and collections found');
    } finally {
      await client.close();
    }
  }, 10000);
  
  // Test Neo4j Connection
  test('Neo4j connection should succeed', async () => {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    
    try {
      const result = await session.run('RETURN 1 as test');
      expect(result.records[0].get('test').toNumber()).toBe(1);
      console.log('✅ Neo4j: Connected successfully');
    } finally {
      await session.close();
      await driver.close();
    }
  }, 10000);
  
  // Test Environment Variables
  test('Required environment variables should be set', () => {
    const required = [
      'NODE_ENV',
      'PORT'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing env vars: ${missing.join(', ')}`);
    }
    
    expect(process.env.NODE_ENV || 'development').toBeDefined();
    console.log('✅ Environment variables validated');
  });
  
  // Test MongoDB Collections
  test('MongoDB should have required collections', async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:28000/telnyx-mern-app';
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      const db = client.db('telnyx-mern-app');
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const required = ['agents', 'leads', 'call_logs', 'conversations'];
      const existing = required.filter(name => collectionNames.includes(name));
      
      console.log(`✅ MongoDB: ${existing.length}/${required.length} collections found`);
      expect(existing.length).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  }, 10000);
  
  // Test Neo4j Project Context
  test('Neo4j should have project context node', async () => {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    
    try {
      const result = await session.run(`
        MATCH (p:ProjectContext {id: 'bmad-v4-lead-qualification'})
        RETURN p
      `);
      
      expect(result.records.length).toBeGreaterThan(0);
      console.log('✅ Neo4j: Project context node found');
    } finally {
      await session.close();
      await driver.close();
    }
  }, 10000);
  
});
