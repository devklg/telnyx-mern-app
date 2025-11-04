/**
 * Graph RAG Routes
 * API endpoints for knowledge graph and learning system
 */

const express = require('express');
const router = express.Router();
const graphRAGController = require('../controllers/graph-rag.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/graph-rag/initialize
 * @desc    Initialize the Graph RAG system
 * @access  Private (Admin only)
 */
router.post('/initialize', authenticate, graphRAGController.initialize);

/**
 * @route   POST /api/graph-rag/learn/call/:callId
 * @desc    Manually trigger learning from a specific call
 * @access  Private
 */
router.post('/learn/call/:callId', authenticate, graphRAGController.learnFromCall);

/**
 * @route   POST /api/graph-rag/learn/batch
 * @desc    Batch learn from multiple calls
 * @access  Private (Admin only)
 * @body    { startDate, endDate, minQualificationScore }
 */
router.post('/learn/batch', authenticate, graphRAGController.batchLearn);

/**
 * @route   GET /api/graph-rag/knowledge/lead/:leadId
 * @desc    Retrieve knowledge for a lead before calling
 * @access  Private
 */
router.get('/knowledge/lead/:leadId', authenticate, graphRAGController.getKnowledgeForLead);

/**
 * @route   GET /api/graph-rag/analytics
 * @desc    Get analytics and insights from the knowledge graph
 * @access  Private
 */
router.get('/analytics', authenticate, graphRAGController.getAnalytics);

/**
 * @route   GET /api/graph-rag/insights/industry/:industry
 * @desc    Get specific insights for an industry
 * @access  Private
 */
router.get('/insights/industry/:industry', authenticate, graphRAGController.getIndustryInsights);

/**
 * @route   GET /api/graph-rag/recommendations
 * @desc    Get recommendations for improving qualification
 * @access  Private
 */
router.get('/recommendations', authenticate, graphRAGController.getImprovementRecommendations);

/**
 * @route   POST /api/graph-rag/search/conversations
 * @desc    Search for similar successful conversations
 * @access  Private
 * @body    { query, industry, minQualificationScore, limit }
 */
router.post('/search/conversations', authenticate, graphRAGController.searchSimilarConversations);

/**
 * @route   GET /api/graph-rag/statistics
 * @desc    Get knowledge graph statistics
 * @access  Private
 */
router.get('/statistics', authenticate, graphRAGController.getStatistics);

module.exports = router;
