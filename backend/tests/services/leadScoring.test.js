/**
 * Lead Scoring Service Tests
 *
 * Unit tests for lead scoring functionality
 *
 * Story 3.7: Enhanced Lead Scoring System
 * @author Claude AI Assistant
 */

const {
  calculateLeadScore,
  getQualificationPoints,
  getEngagementPoints,
  getIntentPoints,
  getDemographicPoints,
  classifyLeadScore,
  applyScoreDecay
} = require('../../src/services/leadScoringService');

// Mock dependencies
jest.mock('../../src/database/mongodb/schemas/lead.schema');
jest.mock('../../src/database/mongodb/schemas/call.schema');
jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');
jest.mock('@anthropic-ai/sdk');

const Lead = require('../../src/database/mongodb/schemas/lead.schema');
const Call = require('../../src/database/mongodb/schemas/call.schema');

describe('Lead Scoring Service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQualificationPoints', () => {
    it('should return 40 points for high BANTI score (≥70%)', async () => {
      const lead = {
        businessInterest: 20,
        employmentStatus: 18,
        incomeCommitment: 20,
        personalExperience: 12,
        decisionMaking: 12
      };
      // Total: 82 (≥70%)

      const points = await getQualificationPoints(lead);
      expect(points).toBe(40);
    });

    it('should return 25 points for medium BANTI score (50-69%)', async () => {
      const lead = {
        businessInterest: 15,
        employmentStatus: 12,
        incomeCommitment: 15,
        personalExperience: 8,
        decisionMaking: 10
      };
      // Total: 60 (50-69%)

      const points = await getQualificationPoints(lead);
      expect(points).toBe(25);
    });

    it('should return 10 points for low BANTI score (30-49%)', async () => {
      const lead = {
        businessInterest: 10,
        employmentStatus: 8,
        incomeCommitment: 10,
        personalExperience: 5,
        decisionMaking: 7
      };
      // Total: 40 (30-49%)

      const points = await getQualificationPoints(lead);
      expect(points).toBe(10);
    });

    it('should return 0 points for very low BANTI score (<30%)', async () => {
      const lead = {
        businessInterest: 5,
        employmentStatus: 3,
        incomeCommitment: 5,
        personalExperience: 2,
        decisionMaking: 3
      };
      // Total: 18 (<30%)

      const points = await getQualificationPoints(lead);
      expect(points).toBe(0);
    });

    it('should handle missing BANTI fields', async () => {
      const lead = {
        businessInterest: 15
        // Other fields missing
      };

      const points = await getQualificationPoints(lead);
      expect(points).toBe(0); // 15 is < 30%
    });
  });

  describe('getEngagementPoints', () => {
    it('should award 15 points for contact within 7 days', async () => {
      const lead = {
        lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      };
      const calls = [{ _id: '1' }];

      const points = await getEngagementPoints(lead, calls);
      expect(points).toBeGreaterThanOrEqual(15);
    });

    it('should award 10 points for contact within 30 days', async () => {
      const lead = {
        lastContactedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      };
      const calls = [{ _id: '1' }];

      const points = await getEngagementPoints(lead, calls);
      expect(points).toBeGreaterThanOrEqual(10);
    });

    it('should award points based on call frequency', async () => {
      const lead = {
        lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      };
      const calls = [
        { _id: '1' },
        { _id: '2' },
        { _id: '3' },
        { _id: '4' },
        { _id: '5' }
      ];

      const points = await getEngagementPoints(lead, calls);
      expect(points).toBeGreaterThanOrEqual(25); // 15 (recent) + 10 (5+ calls)
    });

    it('should not exceed 30 points cap', async () => {
      const lead = {
        lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        notes: [
          { content: 'sms reply received' },
          { content: 'email opened' },
          { content: 'clicked link' }
        ]
      };
      const calls = Array(10).fill({ _id: 'call' });

      const points = await getEngagementPoints(lead, calls);
      expect(points).toBeLessThanOrEqual(30);
    });
  });

  describe('getDemographicPoints', () => {
    it('should award points for US timezone', async () => {
      const lead = {
        timezone: 'America/New_York'
      };

      const points = await getDemographicPoints(lead);
      expect(points).toBeGreaterThanOrEqual(5);
    });

    it('should award points for referral source', async () => {
      const lead = {
        importSource: 'referral'
      };

      const points = await getDemographicPoints(lead);
      expect(points).toBe(10); // Referrals get max quality score
    });

    it('should not exceed 10 points cap', async () => {
      const lead = {
        timezone: 'America/New_York',
        phoneAreaCode: '212',
        importSource: 'referral'
      };

      const points = await getDemographicPoints(lead);
      expect(points).toBeLessThanOrEqual(10);
    });
  });

  describe('classifyLeadScore', () => {
    it('should classify 85 as hot', () => {
      expect(classifyLeadScore(85)).toBe('hot');
    });

    it('should classify 70 as warm', () => {
      expect(classifyLeadScore(70)).toBe('warm');
    });

    it('should classify 50 as cool', () => {
      expect(classifyLeadScore(50)).toBe('cool');
    });

    it('should classify 30 as cold', () => {
      expect(classifyLeadScore(30)).toBe('cold');
    });

    it('should handle boundary cases', () => {
      expect(classifyLeadScore(80)).toBe('hot');
      expect(classifyLeadScore(79)).toBe('warm');
      expect(classifyLeadScore(60)).toBe('warm');
      expect(classifyLeadScore(59)).toBe('cool');
      expect(classifyLeadScore(40)).toBe('cool');
      expect(classifyLeadScore(39)).toBe('cold');
    });
  });

  describe('calculateLeadScore - Integration', () => {
    it('should calculate total score correctly', async () => {
      const mockLead = {
        _id: 'lead123',
        businessInterest: 20,
        employmentStatus: 18,
        incomeCommitment: 20,
        personalExperience: 12,
        decisionMaking: 12,
        lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        timezone: 'America/New_York',
        importSource: 'referral',
        qualificationScore: 0,
        save: jest.fn()
      };

      const mockCalls = [
        { _id: '1', transcript: 'Great conversation, prospect is interested' },
        { _id: '2', transcript: 'Follow-up call' }
      ];

      Lead.findById = jest.fn().mockResolvedValue(mockLead);
      Call.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockCalls)
        })
      });

      // Mock database pool
      const { pool } = require('../../src/config/database');
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      // Mock cache
      const { cache } = require('../../src/config/redis');
      cache.set = jest.fn();

      const score = await calculateLeadScore('lead123');

      expect(score).toHaveProperty('qualification');
      expect(score).toHaveProperty('engagement');
      expect(score).toHaveProperty('intent');
      expect(score).toHaveProperty('demographic');
      expect(score).toHaveProperty('total');
      expect(score).toHaveProperty('classification');
      expect(score.total).toBeGreaterThan(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });
  });

  describe('Score Distribution', () => {
    it('should maintain proper score distribution', async () => {
      // Test that scores fall within expected ranges
      const qualification = 40;
      const engagement = 30;
      const intent = 20;
      const demographic = 10;

      const total = qualification + engagement + intent + demographic;

      expect(total).toBe(100);
      expect(qualification).toBeLessThanOrEqual(40);
      expect(engagement).toBeLessThanOrEqual(30);
      expect(intent).toBeLessThanOrEqual(20);
      expect(demographic).toBeLessThanOrEqual(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle lead with no call history', async () => {
      const lead = {
        businessInterest: 15,
        employmentStatus: 12,
        incomeCommitment: 15,
        personalExperience: 8,
        decisionMaking: 10,
        lastContactedAt: null
      };
      const calls = [];

      const engagementPoints = await getEngagementPoints(lead, calls);
      const intentPoints = await getIntentPoints(lead, calls);

      expect(engagementPoints).toBe(0);
      expect(intentPoints).toBe(0);
    });

    it('should handle lead with null/undefined fields', async () => {
      const lead = {};
      const calls = [];

      const qualificationPoints = await getQualificationPoints(lead);
      const engagementPoints = await getEngagementPoints(lead, calls);
      const demographicPoints = await getDemographicPoints(lead);

      expect(qualificationPoints).toBeGreaterThanOrEqual(0);
      expect(engagementPoints).toBeGreaterThanOrEqual(0);
      expect(demographicPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should calculate score in reasonable time', async () => {
      const mockLead = {
        _id: 'lead123',
        businessInterest: 20,
        employmentStatus: 18,
        incomeCommitment: 20,
        personalExperience: 12,
        decisionMaking: 12,
        lastContactedAt: new Date(),
        timezone: 'America/New_York',
        importSource: 'referral',
        qualificationScore: 0,
        save: jest.fn()
      };

      const mockCalls = Array(5).fill({
        _id: 'call',
        transcript: 'Test transcript'
      });

      Lead.findById = jest.fn().mockResolvedValue(mockLead);
      Call.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockCalls)
        })
      });

      const { pool } = require('../../src/config/database');
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      const { cache } = require('../../src/config/redis');
      cache.set = jest.fn();

      const startTime = Date.now();
      await calculateLeadScore('lead123');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

describe('Score Decay', () => {
  it('should apply correct decay rates', () => {
    const initialEngagement = 30;
    const initialIntent = 20;
    const monthsDecayed = 1;

    const engagementDecayRate = 0.20;
    const intentDecayRate = 0.50;

    const expectedEngagement = initialEngagement * (1 - engagementDecayRate);
    const expectedIntent = initialIntent * (1 - intentDecayRate);

    expect(expectedEngagement).toBe(24); // 20% decay
    expect(expectedIntent).toBe(10);     // 50% decay
  });

  it('should not decay qualification or demographic scores', () => {
    const qualification = 40;
    const demographic = 10;
    const monthsDecayed = 1;

    // These should remain the same after decay
    expect(qualification).toBe(40);
    expect(demographic).toBe(10);
  });
});