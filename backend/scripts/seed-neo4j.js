// BMAD V4 - Neo4j Seed Script
const neo4j = require('neo4j-driver');
require('dotenv').config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function seedNeo4j() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();
  
  try {
    console.log('✅ Connected to Neo4j');
    
    // Clear existing project data
    await session.run('MATCH (n) WHERE n.project_id = "bmad-v4-lead-qualification" DETACH DELETE n');
    console.log('🗑️  Cleared existing project data');
    
    // Create project context node
    await session.run(`
      CREATE (p:ProjectContext {
        id: 'bmad-v4-lead-qualification',
        name: 'BMAD V4 Lead Qualification App',
        created: datetime(),
        status: 'active'
      })
    `);
    console.log('✅ Created ProjectContext node');
    
    // Create sample agent
    await session.run(`
      MATCH (p:ProjectContext {id: 'bmad-v4-lead-qualification'})
      CREATE (a:Agent {
        id: 'agent-alex-martinez',
        name: 'Alex Martinez',
        role: 'DevOps Lead',
        status: 'active',
        project_id: 'bmad-v4-lead-qualification'
      })
      CREATE (p)-[:HAS_AGENT]->(a)
    `);
    console.log('✅ Created sample Agent node');
    
    console.log('✅ Neo4j seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding Neo4j:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seedNeo4j();
