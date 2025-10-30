/**
 * Conversation Embedding Utility
 * Purpose: Add conversation transcripts to ChromaDB for semantic search
 * Author: Sarah Chen (SIGMA-1) - Database Architect
 * Database: MongoDB (source) → ChromaDB (vector storage)
 */

const { getChromaClient } = require('./init-collections');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Model
const Conversation = require('../mongodb/schemas/conversation.schema');

/**
 * Embedding Configuration
 */
const EMBEDDING_CONFIG = {
  collection_name: 'conversation_embeddings',
  batch_size: 50,
  min_transcript_length: 50, // Minimum characters for meaningful embedding
  include_summary: true
};

/**
 * Prepare conversation document for embedding
 */
function prepareConversationDocument(conversation) {
  const parts = [];

  // Add summary if available
  if (EMBEDDING_CONFIG.include_summary && conversation.summary?.shortSummary) {
    parts.push(`Summary: ${conversation.summary.shortSummary}`);
  }

  if (conversation.summary?.keyPoints && conversation.summary.keyPoints.length > 0) {
    parts.push(`Key Points: ${conversation.summary.keyPoints.join('; ')}`);
  }

  // Add full transcript from messages
  if (conversation.messages && conversation.messages.length > 0) {
    const transcript = conversation.messages
      .filter(m => !m.isDeleted && m.content)
      .map(m => {
        const speaker = m.sender?.type || 'unknown';
        return `[${speaker}]: ${m.content}`;
      })
      .join('\n');

    if (transcript.length >= EMBEDDING_CONFIG.min_transcript_length) {
      parts.push(`\nTranscript:\n${transcript}`);
    }
  }

  // Add AI analysis keywords and topics
  if (conversation.aiAnalysis) {
    if (conversation.aiAnalysis.keywords && conversation.aiAnalysis.keywords.length > 0) {
      parts.push(`Keywords: ${conversation.aiAnalysis.keywords.join(', ')}`);
    }
    if (conversation.aiAnalysis.mainTopics && conversation.aiAnalysis.mainTopics.length > 0) {
      parts.push(`Topics: ${conversation.aiAnalysis.mainTopics.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Prepare metadata for conversation
 */
function prepareConversationMetadata(conversation) {
  return {
    conversation_id: conversation.conversationId,
    lead_id: conversation.leadId.toString(),
    channel: conversation.channel,
    status: conversation.status,
    sentiment: conversation.aiAnalysis?.overallSentiment || 'unknown',
    sentiment_score: conversation.aiAnalysis?.sentimentScore || 0,
    qualification_score: conversation.aiAnalysis?.qualificationScore || 0,
    outcome: conversation.outcome?.result || 'unknown',
    was_qualified: conversation.outcome?.result === 'qualified',
    message_count: conversation.messages?.length || 0,
    duration_minutes: Math.round((conversation.duration || 0) / 60),
    has_buying_signals: (conversation.aiAnalysis?.buyingSignals || []).length > 0,
    has_objections: (conversation.aiAnalysis?.objections || []).length > 0,
    started_at: conversation.startedAt.toISOString(),
    indexed_at: new Date().toISOString()
  };
}

/**
 * Embed a single conversation
 */
async function embedConversation(collection, conversation) {
  try {
    const document = prepareConversationDocument(conversation);

    if (document.length < EMBEDDING_CONFIG.min_transcript_length) {
      console.warn(`⚠️  Skipping conversation ${conversation.conversationId}: transcript too short`);
      return false;
    }

    const metadata = prepareConversationMetadata(conversation);

    await collection.add({
      ids: [conversation.conversationId],
      documents: [document],
      metadatas: [metadata]
    });

    // Update MongoDB with embedding status
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          'embeddings.chromaDocId': conversation.conversationId,
          'embeddings.lastEmbeddedAt': new Date(),
          'embeddings.embeddingModel': 'default'
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`❌ Error embedding conversation ${conversation.conversationId}:`, error.message);
    return false;
  }
}

/**
 * Embed conversations in batch
 */
async function embedConversationBatch(query = {}, limit = null) {
  console.log('🔄 Embedding conversations to ChromaDB...');
  console.log(`   Batch Size: ${EMBEDDING_CONFIG.batch_size}`);
  console.log(`   Min Length: ${EMBEDDING_CONFIG.min_transcript_length} chars`);
  console.log('');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Connect to ChromaDB
    const client = await getChromaClient();
    const collection = await client.getCollection({ name: EMBEDDING_CONFIG.collection_name });
    console.log(`✅ Connected to collection '${EMBEDDING_CONFIG.collection_name}'`);
    console.log('');

    // Find conversations to embed
    let conversationQuery = Conversation.find(query);
    if (limit) {
      conversationQuery = conversationQuery.limit(limit);
    }

    const conversations = await conversationQuery
      .sort({ startedAt: -1 })
      .lean();

    console.log(`📊 Found ${conversations.length} conversations to process`);

    const stats = {
      total: conversations.length,
      embedded: 0,
      skipped: 0,
      errors: 0
    };

    // Process in batches
    for (let i = 0; i < conversations.length; i += EMBEDDING_CONFIG.batch_size) {
      const batch = conversations.slice(i, i + EMBEDDING_CONFIG.batch_size);
      console.log(`   Processing batch ${Math.floor(i / EMBEDDING_CONFIG.batch_size) + 1}...`);

      for (const conv of batch) {
        const success = await embedConversation(collection, conv);
        if (success) {
          stats.embedded++;
        } else {
          stats.skipped++;
        }
      }
    }

    console.log('');
    console.log('✅ Embedding completed!');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Embedded: ${stats.embedded}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);

    return stats;

  } catch (error) {
    console.error('❌ Embedding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

/**
 * Embed only conversations that don't have embeddings yet
 */
async function embedNewConversations(limit = 100) {
  console.log('🆕 Embedding new conversations (without existing embeddings)...');

  const query = {
    $or: [
      { 'embeddings.chromaDocId': { $exists: false } },
      { 'embeddings.chromaDocId': null }
    ],
    status: { $in: ['completed', 'archived'] },
    messages: { $exists: true, $ne: [] }
  };

  return embedConversationBatch(query, limit);
}

/**
 * Re-embed conversations (useful after schema changes)
 */
async function reembedAllConversations() {
  console.log('🔄 Re-embedding all conversations...');

  const query = {
    status: { $in: ['completed', 'archived'] },
    messages: { $exists: true, $ne: [] }
  };

  return embedConversationBatch(query);
}

/**
 * Embed qualified conversations only
 */
async function embedQualifiedConversations(limit = 50) {
  console.log('⭐ Embedding qualified conversations...');

  const query = {
    'outcome.result': 'qualified',
    'aiAnalysis.qualificationScore': { $gte: 70 },
    messages: { $exists: true, $ne: [] }
  };

  return embedConversationBatch(query, limit);
}

/**
 * CLI Interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'new';

  let operation;
  switch (command) {
    case 'new':
      const limit = parseInt(args[1] || '100', 10);
      operation = embedNewConversations(limit);
      break;
    case 'all':
      operation = reembedAllConversations();
      break;
    case 'qualified':
      const qualLimit = parseInt(args[1] || '50', 10);
      operation = embedQualifiedConversations(qualLimit);
      break;
    default:
      console.log('Usage: node embed-conversations.js <command> [limit]');
      console.log('');
      console.log('Commands:');
      console.log('  new [limit]       - Embed conversations without embeddings (default: 100)');
      console.log('  all               - Re-embed all conversations');
      console.log('  qualified [limit] - Embed only qualified conversations (default: 50)');
      console.log('');
      console.log('Examples:');
      console.log('  node embed-conversations.js new 200');
      console.log('  node embed-conversations.js all');
      console.log('  node embed-conversations.js qualified 100');
      process.exit(0);
  }

  operation
    .then(stats => {
      console.log('\n✅ Operation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Operation failed:', error);
      process.exit(1);
    });
}

module.exports = {
  embedConversation,
  embedConversationBatch,
  embedNewConversations,
  reembedAllConversations,
  embedQualifiedConversations,
  prepareConversationDocument,
  prepareConversationMetadata
};
