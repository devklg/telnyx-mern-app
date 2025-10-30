/**
 * ChromaDB Collections Initialization
 * Purpose: Create and configure ChromaDB collections for vector storage
 * Author: Sarah Chen (SIGMA-1) - Database Architect
 * Database: ChromaDB
 */

const { ChromaClient } = require('chromadb');
require('dotenv').config();

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/**
 * Collection Configurations
 */
const COLLECTIONS = {
  conversation_embeddings: {
    name: 'conversation_embeddings',
    metadata: {
      description: 'Call conversation transcripts and summaries for semantic search',
      hnsw_space: 'cosine',
      purpose: 'Semantic search across all conversations',
      created_by: 'Sarah Chen (SIGMA-1)'
    }
  },
  lead_profiles: {
    name: 'lead_profiles',
    metadata: {
      description: 'Lead profile embeddings for similarity matching',
      hnsw_space: 'cosine',
      purpose: 'Find similar leads for targeted outreach',
      created_by: 'Sarah Chen (SIGMA-1)'
    }
  },
  objection_handling: {
    name: 'objection_handling',
    metadata: {
      description: 'Objection patterns and successful responses',
      hnsw_space: 'cosine',
      purpose: 'Real-time suggestion of responses to common objections',
      category: 'training_data',
      created_by: 'Sarah Chen (SIGMA-1)'
    }
  },
  qualification_scripts: {
    name: 'qualification_scripts',
    metadata: {
      description: 'Paul Barrios 12-phase qualification methodology scripts',
      hnsw_space: 'cosine',
      purpose: 'Context-aware script suggestions during calls',
      phases: 12,
      source: 'Paul Barrios System',
      created_by: 'Sarah Chen (SIGMA-1)'
    }
  }
};

/**
 * Initialize ChromaDB client
 */
async function getChromaClient() {
  try {
    const client = new ChromaClient({ path: CHROMA_URL });
    await client.heartbeat(); // Test connection
    console.log(`✅ Connected to ChromaDB at ${CHROMA_URL}`);
    return client;
  } catch (error) {
    console.error(`❌ Failed to connect to ChromaDB at ${CHROMA_URL}:`, error.message);
    throw error;
  }
}

/**
 * Create or get a collection
 */
async function createCollection(client, collectionConfig) {
  try {
    // Try to get existing collection
    const collection = await client.getOrCreateCollection({
      name: collectionConfig.name,
      metadata: collectionConfig.metadata
    });

    console.log(`✅ Collection '${collectionConfig.name}' ready`);
    return collection;
  } catch (error) {
    console.error(`❌ Error creating collection '${collectionConfig.name}':`, error.message);
    throw error;
  }
}

/**
 * List all collections
 */
async function listCollections(client) {
  try {
    const collections = await client.listCollections();
    console.log(`\n📚 Existing collections (${collections.length}):`);
    for (const collection of collections) {
      const count = await collection.count();
      console.log(`   - ${collection.name} (${count} documents)`);
    }
    return collections;
  } catch (error) {
    console.error('❌ Error listing collections:', error.message);
    return [];
  }
}

/**
 * Get collection statistics
 */
async function getCollectionStats(client, collectionName) {
  try {
    const collection = await client.getCollection({ name: collectionName });
    const count = await collection.count();
    const peek = await collection.peek({ limit: 5 });

    return {
      name: collectionName,
      count,
      sampleIds: peek.ids,
      metadata: collection.metadata
    };
  } catch (error) {
    console.error(`❌ Error getting stats for '${collectionName}':`, error.message);
    return null;
  }
}

/**
 * Delete a collection
 */
async function deleteCollection(client, collectionName) {
  try {
    await client.deleteCollection({ name: collectionName });
    console.log(`✅ Deleted collection '${collectionName}'`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting collection '${collectionName}':`, error.message);
    return false;
  }
}

/**
 * Reset all collections (useful for development)
 */
async function resetAllCollections(client) {
  console.log('\n⚠️  Resetting all collections...');

  for (const collectionConfig of Object.values(COLLECTIONS)) {
    await deleteCollection(client, collectionConfig.name);
  }

  console.log('✅ All collections reset');
}

/**
 * Initialize all collections
 */
async function initializeAllCollections(reset = false) {
  console.log('🚀 ChromaDB Collections Initialization');
  console.log(`   URL: ${CHROMA_URL}`);
  console.log(`   Reset: ${reset}`);
  console.log('');

  try {
    const client = await getChromaClient();

    // List existing collections
    await listCollections(client);

    // Reset if requested
    if (reset) {
      await resetAllCollections(client);
    }

    // Create all collections
    console.log('\n📦 Creating collections...');
    const createdCollections = {};

    for (const [key, config] of Object.entries(COLLECTIONS)) {
      createdCollections[key] = await createCollection(client, config);
    }

    // Get statistics
    console.log('\n📊 Collection Statistics:');
    for (const collectionName of Object.keys(COLLECTIONS)) {
      const stats = await getCollectionStats(client, collectionName);
      if (stats) {
        console.log(`   ${stats.name}:`);
        console.log(`      Documents: ${stats.count}`);
        console.log(`      Purpose: ${stats.metadata.purpose}`);
      }
    }

    console.log('\n✅ ChromaDB initialization completed successfully!');
    return createdCollections;

  } catch (error) {
    console.error('\n❌ ChromaDB initialization failed:', error);
    throw error;
  }
}

/**
 * Seed sample objection handling data
 */
async function seedObjectionHandling(client) {
  console.log('\n🌱 Seeding objection handling collection...');

  const collection = await client.getCollection({ name: 'objection_handling' });

  const sampleObjections = [
    {
      id: 'obj-price-1',
      document: "Objection: 'Your price is too high.' Response: 'I understand cost is a concern. Let me show you how our solution actually saves you money in the long run by reducing operational costs by 30%.' Outcome: Customer agreed to demo.",
      metadata: {
        objection_type: 'price',
        success_rate: 0.75,
        industry: 'technology',
        avg_deal_size: 50000
      }
    },
    {
      id: 'obj-timing-1',
      document: "Objection: 'Now is not the right time.' Response: 'I appreciate that timing is important. What specific factors would make this the right time for you? Perhaps we can address those concerns today.' Outcome: Scheduled follow-up for next quarter.",
      metadata: {
        objection_type: 'timing',
        success_rate: 0.60,
        industry: 'general',
        avg_deal_size: 30000
      }
    },
    {
      id: 'obj-competitor-1',
      document: "Objection: 'We're already using a competitor's solution.' Response: 'That's great that you're already invested in this area. What's one thing you wish your current solution did better? Our platform excels at [specific differentiator].' Outcome: Customer interested in comparison.",
      metadata: {
        objection_type: 'competitor',
        success_rate: 0.65,
        industry: 'saas',
        avg_deal_size: 75000
      }
    },
    {
      id: 'obj-authority-1',
      document: "Objection: 'I need to check with my boss/team.' Response: 'Absolutely, this is an important decision. To make sure we're all on the same page, would it be helpful if I joined that conversation to answer any questions directly?' Outcome: Multi-stakeholder meeting scheduled.",
      metadata: {
        objection_type: 'authority',
        success_rate: 0.70,
        industry: 'enterprise',
        avg_deal_size: 100000
      }
    },
    {
      id: 'obj-interest-1',
      document: "Objection: 'I'm not interested right now.' Response: 'I completely understand. Just out of curiosity, what would need to change in your business for this to become a priority?' Outcome: Identified pain point, scheduled callback.",
      metadata: {
        objection_type: 'interest',
        success_rate: 0.45,
        industry: 'general',
        avg_deal_size: 20000
      }
    }
  ];

  try {
    await collection.add({
      ids: sampleObjections.map(o => o.id),
      documents: sampleObjections.map(o => o.document),
      metadatas: sampleObjections.map(o => o.metadata)
    });

    console.log(`✅ Seeded ${sampleObjections.length} objection handling examples`);
  } catch (error) {
    console.error('❌ Error seeding objection handling:', error.message);
  }
}

/**
 * CLI Interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const seed = args.includes('--seed');

  initializeAllCollections(reset)
    .then(async (collections) => {
      if (seed) {
        const client = await getChromaClient();
        await seedObjectionHandling(client);
      }
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = {
  getChromaClient,
  initializeAllCollections,
  createCollection,
  deleteCollection,
  listCollections,
  getCollectionStats,
  seedObjectionHandling,
  COLLECTIONS
};
