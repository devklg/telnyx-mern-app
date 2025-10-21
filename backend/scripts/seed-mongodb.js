// BMAD V4 - MongoDB Seed Script
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:28000/telnyx-mern-app';

const seedData = {
  agents: [
    {
      id: 'agent-001',
      name: 'Alex Martinez',
      role: 'DevOps Lead',
      status: 'active',
      created: new Date()
    }
  ],
  leads: [
    {
      id: 'lead-001',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      email: 'john.doe@example.com',
      status: 'new',
      source: 'fresh_leads',
      created: new Date()
    }
  ],
  call_logs: [],
  conversations: []
};

async function seedMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('telnyx-mern-app');
    
    // Clear existing data
    for (const collection of Object.keys(seedData)) {
      await db.collection(collection).deleteMany({});
      console.log(`🗑️  Cleared ${collection}`);
    }
    
    // Insert seed data
    for (const [collection, data] of Object.entries(seedData)) {
      if (data.length > 0) {
        await db.collection(collection).insertMany(data);
        console.log(`✅ Seeded ${data.length} documents to ${collection}`);
      }
    }
    
    console.log('✅ MongoDB seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding MongoDB:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMongoDB();
