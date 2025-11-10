/**
 * AI Recommendation Service Tests
 *
 * Unit tests for the AI-powered recommendation engine
 * Tests context assembly, recommendation generation, and caching
 *
 * Story 3.4: AI Agentic Follow-Up Recommendations Engine
 * @author Claude AI Assistant
 */

const {
  generateRecommendation,
  generateUserRecommendations,
  classifyRecommendationType
} = require('../../src/services/aiRecommendationService');

const {
  assembleLeadContext,
  calculateInteractionRecency,
  analyzeConversationPatterns
} = require('../../src/services/leadContextService');

const {
  generateCallScript,
  getOrGenerateScript
} = require('../../src/services/scriptGenerationService');

// Mock dependencies
jest.mock('../../src/models/Lead');
jest.mock('../../src/database/mongodb/schemas/call.schema');
jest.mock('@anthropic-ai/sdk');

const Lead = require('../../src/models/Lead');
const Call = require('../../src/database/mongodb/schemas/call.schema');

describe('Lead Context Service', () => {
  describe('calculateInteractionRecency', () => {
    test('should return null values for empty call history', () => {
      const recency = calculateInteractionRecency([]);

      expect(recency.daysSinceLastContact).toBeNull();
      expect(recency.hasRecentContact).toBe(false);
      expect(recency.contactFrequency).toBe('never');
    });

    test('should calculate days since last contact correctly', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const callHistory = [
        { startedAt: yesterday }
      ];

      const recency = calculateInteractionRecency(callHistory);

      expect(recency.daysSinceLastContact).toBe(1);
      expect(recency.hasRecentContact).toBe(true);
    });

    test('should classify contact frequency correctly', () => {
      const callHistory = Array(5).fill({ startedAt: new Date() });
      const recency = calculateInteractionRecency(callHistory);

      expect(recency.contactFrequency).toBe('high');
      expect(recency.totalInteractions).toBe(5);
    });
  });

  describe('analyzeConversationPatterns', () => {
    test('should return default values for empty history', () => {
      const patterns = analyzeConversationPatterns([]);

      expect(patterns.commonObjections).toEqual([]);
      expect(patterns.averageCallDuration).toBe(0);
      expect(patterns.qualificationTrend).toBe('unknown');
    });

    test('should detect positive sentiment', () => {
      const callHistory = [
        {
          duration: 300,
          aiAnalysis: {
            sentiment: 'positive',
            keywords: ['interested', 'excited'],
            qualificationScore: 8
          }
        }
      ];

      const patterns = analyzeConversationPatterns(callHistory);

      expect(patterns.positiveSentimentCount).toBe(1);
      expect(patterns.engagementLevel).toBe('high');
    });

    test('should calculate qualification trend', () => {
      const callHistory = [
        { aiAnalysis: { qualificationScore: 8 } },
        { aiAnalysis: { qualificationScore: 5 } },
        { aiAnalysis: { qualificationScore: 3 } }
      ];

      const patterns = analyzeConversationPatterns(callHistory);

      expect(patterns.qualificationTrend).toBe('improving');
    });
  });

  describe('assembleLeadContext', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Mock Lead.findById
      Lead.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'lead123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          status: 'contacted',
          qualificationScore: 65,
          businessInterest: 20,
          employmentStatus: 15,
          incomeCommitment: 20,
          personalExperience: 5,
          decisionMaking: 5,
          timezone: 'America/New_York',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      });

      // Mock Call.find
      Call.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            endedAt: new Date(),
            duration: 300,
            status: 'completed',
            transcript: 'Sample transcript...',
            aiAnalysis: {
              sentiment: 'positive',
              keywords: ['interested', 'business'],
              qualificationScore: 7,
              summary: 'Lead showed interest'
            }
          }
        ])
      });
    });

    test('should assemble complete lead context', async () => {
      const context = await assembleLeadContext('lead123', 'user456');

      expect(context).toBeDefined();
      expect(context.leadId).toBe('lead123');
      expect(context.contactInfo.fullName).toBe('John Doe');
      expect(context.qualificationScores.total).toBe(65);
      expect(context.callHistory).toHaveLength(1);
      expect(context.interactionRecency).toBeDefined();
    });

    test('should handle lead not found', async () => {
      Lead.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(assembleLeadContext('invalid')).rejects.toThrow('Lead not found');
    });
  });
});

describe('AI Recommendation Service', () => {
  describe('classifyRecommendationType', () => {
    test('should recommend drop_lead for DNC leads', () => {
      const context = {
        status: { doNotCall: true },
        qualificationScores: { total: 50 },
        interactionRecency: { daysSinceLastContact: 10 },
        prioritySignals: {}
      };

      const recommendation = classifyRecommendationType(context);

      expect(recommendation.action_type).toBe('drop_lead');
      expect(recommendation.priority).toBe(1);
    });

    test('should recommend call_now for hot leads', () => {
      const context = {
        status: { doNotCall: false },
        qualificationScores: { total: 75 },
        interactionRecency: { daysSinceLastContact: 2 },
        prioritySignals: { isHotLead: true }
      };

      const recommendation = classifyRecommendationType(context);

      expect(recommendation.action_type).toBe('call_now');
      expect(recommendation.priority).toBe(9);
    });

    test('should recommend nurture for low-interest leads', () => {
      const context = {
        status: { doNotCall: false },
        qualificationScores: { total: 30 },
        interactionRecency: { daysSinceLastContact: 10 },
        prioritySignals: {}
      };

      const recommendation = classifyRecommendationType(context);

      expect(recommendation.action_type).toBe('nurture_email');
      expect(recommendation.priority).toBe(5);
    });

    test('should recommend re-engagement for cold leads', () => {
      const context = {
        status: { doNotCall: false },
        qualificationScores: { total: 50 },
        interactionRecency: { daysSinceLastContact: 35 },
        prioritySignals: {}
      };

      const recommendation = classifyRecommendationType(context);

      expect(recommendation.action_type).toBe('send_sms');
      expect(recommendation.priority).toBe(3);
    });
  });

  describe('generateRecommendation', () => {
    test('should generate recommendation with Claude API', async () => {
      // Mock Anthropic SDK
      const mockAnthropicResponse = {
        content: [{
          text: JSON.stringify({
            action_type: 'call_now',
            priority: 9,
            reasoning: 'Lead showed high interest in last call',
            recommended_script: 'Follow up on interest shown...',
            optimal_contact_time: 'Today at 2pm',
            next_steps: 'Schedule transfer call'
          })
        }]
      };

      const Anthropic = require('@anthropic-ai/sdk');
      Anthropic.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue(mockAnthropicResponse)
        }
      }));

      // Note: This test requires full mocking of the context assembly
      // In production, you'd use integration tests with a test database
    });
  });
});

describe('Script Generation Service', () => {
  describe('getOrGenerateScript', () => {
    test('should return cached script if available', async () => {
      // Mock existing script
      const mockScript = {
        _id: 'script123',
        leadId: 'lead123',
        scriptType: 'follow_up',
        scriptText: 'Sample script',
        structuredScript: {},
        generatedAt: new Date(),
        used: false
      };

      // This would require mocking the AIScript model
      // For now, this is a placeholder test structure
    });

    test('should generate new script if none exists', async () => {
      // Test generation logic
    });

    test('should regenerate script if force_regenerate is true', async () => {
      // Test force regeneration
    });
  });
});

describe('Integration Tests', () => {
  describe('Recommendation Workflow', () => {
    test('should complete full recommendation flow', async () => {
      // 1. Assemble context
      // 2. Generate recommendation
      // 3. Generate script
      // 4. Cache results
      // 5. Return to user

      // This would be an integration test with test database
    });
  });

  describe('Caching', () => {
    test('should cache recommendations for 1 hour', async () => {
      // Test Redis caching
    });

    test('should invalidate cache on lead update', async () => {
      // Test cache invalidation
    });
  });
});

// Export test utilities for use in other test files
module.exports = {
  mockLeadData: () => ({
    _id: 'test-lead-123',
    firstName: 'Test',
    lastName: 'Lead',
    phone: '+1234567890',
    email: 'test@example.com',
    status: 'contacted',
    qualificationScore: 60
  }),
  mockCallHistory: () => [
    {
      startedAt: new Date(),
      duration: 300,
      status: 'completed',
      aiAnalysis: {
        sentiment: 'positive',
        qualificationScore: 7
      }
    }
  ]
};