/**
 * Semantic Search Utility
 * Purpose: Query ChromaDB collections for semantic similarity search
 * Author: Sarah Chen (SIGMA-1) - Database Architect
 * Database: ChromaDB
 */

const { getChromaClient, COLLECTIONS } = require('./init-collections');

/**
 * Search Configuration
 */
const SEARCH_CONFIG = {
  default_limit: 5,
  max_limit: 50,
  similarity_threshold: 0.7 // Cosine similarity threshold (0-1)
};

/**
 * Find similar conversations
 */
async function findSimilarConversations(queryText, options = {}) {
  const {
    limit = SEARCH_CONFIG.default_limit,
    where = {},
    whereDocument = {},
    includeMetadata = true,
    includeDocuments = true
  } = options;

  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.conversation_embeddings.name
    });

    const results = await collection.query({
      queryTexts: [queryText],
      nResults: Math.min(limit, SEARCH_CONFIG.max_limit),
      where,
      whereDocument,
      include: buildIncludeArray(includeMetadata, includeDocuments)
    });

    return formatResults(results);
  } catch (error) {
    console.error('❌ Error searching conversations:', error.message);
    throw error;
  }
}

/**
 * Find similar qualified conversations
 */
async function findSimilarQualifiedConversations(queryText, limit = 5) {
  return findSimilarConversations(queryText, {
    limit,
    where: {
      was_qualified: true,
      qualification_score: { $gte: 70 }
    }
  });
}

/**
 * Find conversations with positive sentiment
 */
async function findPositiveConversations(queryText, limit = 5) {
  return findSimilarConversations(queryText, {
    limit,
    where: {
      sentiment: { $in: ['positive', 'very-positive'] },
      sentiment_score: { $gt: 0.3 }
    }
  });
}

/**
 * Find conversations by channel
 */
async function findConversationsByChannel(queryText, channel, limit = 5) {
  return findSimilarConversations(queryText, {
    limit,
    where: { channel }
  });
}

/**
 * Find similar lead profiles
 */
async function findSimilarLeads(queryText, options = {}) {
  const {
    limit = SEARCH_CONFIG.default_limit,
    where = {},
    includeMetadata = true,
    includeDocuments = true
  } = options;

  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.lead_profiles.name
    });

    const results = await collection.query({
      queryTexts: [queryText],
      nResults: Math.min(limit, SEARCH_CONFIG.max_limit),
      where,
      include: buildIncludeArray(includeMetadata, includeDocuments)
    });

    return formatResults(results);
  } catch (error) {
    console.error('❌ Error searching lead profiles:', error.message);
    throw error;
  }
}

/**
 * Find relevant objection handling responses
 */
async function findObjectionResponses(objectionText, options = {}) {
  const {
    limit = 3,
    objectionType = null,
    minSuccessRate = 0.5,
    industry = null
  } = options;

  const where = {};
  if (objectionType) {
    where.objection_type = objectionType;
  }
  if (minSuccessRate) {
    where.success_rate = { $gte: minSuccessRate };
  }
  if (industry) {
    where.industry = industry;
  }

  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.objection_handling.name
    });

    const results = await collection.query({
      queryTexts: [objectionText],
      nResults: Math.min(limit, 10),
      where,
      include: ['documents', 'metadatas', 'distances']
    });

    return formatObjectionResults(results);
  } catch (error) {
    console.error('❌ Error searching objection responses:', error.message);
    throw error;
  }
}

/**
 * Find relevant qualification script segments
 */
async function findQualificationScripts(context, options = {}) {
  const {
    limit = 3,
    phase = null,
    situation = null
  } = options;

  const where = {};
  if (phase) {
    where.phase = phase;
  }
  if (situation) {
    where.situation = situation;
  }

  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.qualification_scripts.name
    });

    const results = await collection.query({
      queryTexts: [context],
      nResults: Math.min(limit, 10),
      where,
      include: ['documents', 'metadatas', 'distances']
    });

    return formatResults(results);
  } catch (error) {
    console.error('❌ Error searching qualification scripts:', error.message);
    throw error;
  }
}

/**
 * Search across all collections
 */
async function searchAll(queryText, limit = 3) {
  console.log(`🔍 Searching all collections for: "${queryText}"`);

  const results = {};

  try {
    results.conversations = await findSimilarConversations(queryText, { limit });
    results.leads = await findSimilarLeads(queryText, { limit }).catch(() => []);
    results.objections = await findObjectionResponses(queryText, { limit }).catch(() => []);
    results.scripts = await findQualificationScripts(queryText, { limit }).catch(() => []);

    return results;
  } catch (error) {
    console.error('❌ Error in searchAll:', error.message);
    throw error;
  }
}

/**
 * Get conversation by ID
 */
async function getConversationById(conversationId) {
  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.conversation_embeddings.name
    });

    const results = await collection.get({
      ids: [conversationId],
      include: ['documents', 'metadatas']
    });

    if (results.ids.length === 0) {
      return null;
    }

    return {
      id: results.ids[0],
      document: results.documents[0],
      metadata: results.metadatas[0]
    };
  } catch (error) {
    console.error(`❌ Error getting conversation ${conversationId}:`, error.message);
    return null;
  }
}

/**
 * Delete conversation from ChromaDB
 */
async function deleteConversation(conversationId) {
  try {
    const client = await getChromaClient();
    const collection = await client.getCollection({
      name: COLLECTIONS.conversation_embeddings.name
    });

    await collection.delete({ ids: [conversationId] });
    console.log(`✅ Deleted conversation ${conversationId} from ChromaDB`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting conversation ${conversationId}:`, error.message);
    return false;
  }
}

/**
 * Helper: Build include array for query
 */
function buildIncludeArray(includeMetadata, includeDocuments) {
  const include = ['distances'];
  if (includeMetadata) include.push('metadatas');
  if (includeDocuments) include.push('documents');
  return include;
}

/**
 * Helper: Format query results
 */
function formatResults(results) {
  if (!results.ids || results.ids.length === 0 || !results.ids[0]) {
    return [];
  }

  const items = [];
  const resultCount = results.ids[0].length;

  for (let i = 0; i < resultCount; i++) {
    const item = {
      id: results.ids[0][i],
      distance: results.distances ? results.distances[0][i] : null,
      similarity: results.distances ? (1 - results.distances[0][i]) : null
    };

    if (results.documents && results.documents[0]) {
      item.document = results.documents[0][i];
    }

    if (results.metadatas && results.metadatas[0]) {
      item.metadata = results.metadatas[0][i];
    }

    items.push(item);
  }

  return items;
}

/**
 * Helper: Format objection results with success metrics
 */
function formatObjectionResults(results) {
  const formatted = formatResults(results);

  return formatted.map(item => ({
    ...item,
    recommendation_score: calculateRecommendationScore(item),
    success_rate: item.metadata?.success_rate || 0,
    objection_type: item.metadata?.objection_type || 'unknown'
  })).sort((a, b) => b.recommendation_score - a.recommendation_score);
}

/**
 * Helper: Calculate recommendation score
 */
function calculateRecommendationScore(item) {
  const similarityWeight = 0.6;
  const successRateWeight = 0.4;

  const similarity = item.similarity || 0;
  const successRate = item.metadata?.success_rate || 0;

  return (similarity * similarityWeight) + (successRate * successRateWeight);
}

/**
 * CLI Interface for testing
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node semantic-search.js <query> [collection] [limit]');
    console.log('');
    console.log('Collections:');
    console.log('  conversations  - Search conversation transcripts');
    console.log('  leads          - Search lead profiles');
    console.log('  objections     - Search objection responses');
    console.log('  scripts        - Search qualification scripts');
    console.log('  all            - Search all collections');
    console.log('');
    console.log('Examples:');
    console.log('  node semantic-search.js "customer wants discount" objections 3');
    console.log('  node semantic-search.js "interested in premium tier" conversations 5');
    console.log('  node semantic-search.js "price concerns" all');
    process.exit(0);
  }

  const query = args[0];
  const collection = args[1] || 'conversations';
  const limit = parseInt(args[2] || '5', 10);

  console.log(`🔍 Semantic Search`);
  console.log(`   Query: "${query}"`);
  console.log(`   Collection: ${collection}`);
  console.log(`   Limit: ${limit}`);
  console.log('');

  let searchOperation;
  switch (collection.toLowerCase()) {
    case 'conversations':
      searchOperation = findSimilarConversations(query, { limit });
      break;
    case 'leads':
      searchOperation = findSimilarLeads(query, { limit });
      break;
    case 'objections':
      searchOperation = findObjectionResponses(query, { limit });
      break;
    case 'scripts':
      searchOperation = findQualificationScripts(query, { limit });
      break;
    case 'all':
      searchOperation = searchAll(query, limit);
      break;
    default:
      console.error(`❌ Unknown collection: ${collection}`);
      process.exit(1);
  }

  searchOperation
    .then(results => {
      console.log('📊 Results:');
      console.log(JSON.stringify(results, null, 2));
      console.log(`\n✅ Found ${Array.isArray(results) ? results.length : Object.keys(results).reduce((sum, key) => sum + results[key].length, 0)} results`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Search failed:', error);
      process.exit(1);
    });
}

module.exports = {
  findSimilarConversations,
  findSimilarQualifiedConversations,
  findPositiveConversations,
  findConversationsByChannel,
  findSimilarLeads,
  findObjectionResponses,
  findQualificationScripts,
  searchAll,
  getConversationById,
  deleteConversation
};
