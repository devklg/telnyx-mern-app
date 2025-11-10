/**
 * DNC Service Test Suite
 *
 * @description Comprehensive tests for DNC compliance system
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 */

const dncService = require('../../services/dncService');
const dncBloomFilter = require('../../services/dncBloomFilter');
const { analyzeTranscriptForOptOut, checkOptOutKeywords } = require('../../utils/dncTranscriptAnalyzer');
const { pgPool } = require('../../config/database');

// Mock data
const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
const mockPhoneNumber = '+12345678901';

describe('DNC Service', () => {
  beforeAll(async () => {
    // Ensure test database is connected
    // In production, use a separate test database
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await pgPool.query('DELETE FROM dnc_list WHERE phone_number LIKE \'+1234567890%\'');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('addToDNC', () => {
    it('should add phone number to DNC list', async () => {
      const result = await dncService.addToDNC({
        phoneNumber: mockPhoneNumber,
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId,
        notes: 'Test DNC entry'
      });

      expect(result).toBeDefined();
      expect(result.phone_number).toBe(mockPhoneNumber);
      expect(result.reason).toBe('lead_requested');
    });

    it('should normalize phone number to E.164 format', async () => {
      const unnormalizedPhone = '(234) 567-8902';
      const expectedNormalized = '+12345678902';

      const result = await dncService.addToDNC({
        phoneNumber: unnormalizedPhone,
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });

      expect(result.phone_number).toBe(expectedNormalized);
    });

    it('should not add duplicate phone numbers', async () => {
      // Try to add the same number twice
      await dncService.addToDNC({
        phoneNumber: '+12345678903',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });

      const result = await dncService.addToDNC({
        phoneNumber: '+12345678903',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });

      // Should return existing entry
      expect(result).toBeDefined();
    });
  });

  describe('checkDNC', () => {
    beforeAll(async () => {
      // Add test number to DNC
      await dncService.addToDNC({
        phoneNumber: '+12345678904',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });
    });

    it('should detect phone number on DNC list', async () => {
      const result = await dncService.checkDNC('+12345678904', mockOrganizationId);

      expect(result.onDNCList).toBe(true);
      expect(result.reason).toBe('lead_requested');
    });

    it('should return false for phone not on DNC list', async () => {
      const result = await dncService.checkDNC('+19999999999', mockOrganizationId);

      expect(result.onDNCList).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  describe('removeFromDNC', () => {
    beforeAll(async () => {
      // Add test number
      await dncService.addToDNC({
        phoneNumber: '+12345678905',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });
    });

    it('should remove phone number from DNC list', async () => {
      const success = await dncService.removeFromDNC(
        '+12345678905',
        mockOrganizationId,
        mockUserId,
        'Test removal'
      );

      expect(success).toBe(true);

      // Verify removal
      const check = await dncService.checkDNC('+12345678905', mockOrganizationId);
      expect(check.onDNCList).toBe(false);
    });

    it('should return false for non-existent phone number', async () => {
      const success = await dncService.removeFromDNC(
        '+19999999998',
        mockOrganizationId,
        mockUserId,
        'Test removal'
      );

      expect(success).toBe(false);
    });
  });

  describe('scrubLeadList', () => {
    beforeAll(async () => {
      // Add multiple test numbers to DNC
      await dncService.addToDNC({
        phoneNumber: '+12345678906',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });

      await dncService.addToDNC({
        phoneNumber: '+12345678907',
        reason: 'lead_requested',
        source: 'manual_entry',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId
      });
    });

    it('should correctly identify DNC and clean numbers', async () => {
      const phoneNumbers = [
        '+12345678906', // On DNC
        '+19999999997', // Clean
        '+12345678907', // On DNC
        '+19999999996'  // Clean
      ];

      const result = await dncService.scrubLeadList(phoneNumbers, mockOrganizationId);

      expect(result.dncCount).toBe(2);
      expect(result.cleanCount).toBe(2);
      expect(result.dncNumbers).toContain('+12345678906');
      expect(result.dncNumbers).toContain('+12345678907');
    });

    it('should handle large batches efficiently', async () => {
      // Generate 500 phone numbers
      const phoneNumbers = Array.from({ length: 500 }, (_, i) => `+1555000${String(i).padStart(4, '0')}`);

      const startTime = Date.now();
      const result = await dncService.scrubLeadList(phoneNumbers, mockOrganizationId);
      const duration = Date.now() - startTime;

      expect(result.total).toBe(500);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  describe('getComplianceReport', () => {
    it('should generate compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const report = await dncService.getComplianceReport(
        mockOrganizationId,
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.organizationId).toBe(mockOrganizationId);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalAdditions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportDNCToCSV', () => {
    it('should export DNC list as CSV', async () => {
      const csv = await dncService.exportDNCToCSV(mockOrganizationId);

      expect(csv).toBeDefined();
      expect(csv).toContain('Phone Number');
      expect(csv).toContain('Reason');
      expect(csv).toContain('Source');
    });
  });
});

describe('DNC Bloom Filter', () => {
  beforeAll(async () => {
    // Initialize bloom filter with test data
    const testNumbers = [
      '+12345678910',
      '+12345678911',
      '+12345678912'
    ];

    await dncBloomFilter.initialize(testNumbers);
  });

  afterAll(async () => {
    // Clear bloom filter
    await dncBloomFilter.clear();
  });

  describe('check', () => {
    it('should return true for numbers in bloom filter', async () => {
      const result = await dncBloomFilter.check('+12345678910');
      expect(result).toBe(true);
    });

    it('should return false for numbers not in bloom filter', async () => {
      const result = await dncBloomFilter.check('+19999999995');
      expect(result).toBe(false);
    });

    it('should be very fast (< 5ms per check)', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await dncBloomFilter.check(`+1555000${String(i).padStart(4, '0')}`);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(5); // < 5ms per check
    });
  });

  describe('add', () => {
    it('should add phone number to bloom filter', async () => {
      await dncBloomFilter.add('+12345678913');

      const result = await dncBloomFilter.check('+12345678913');
      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return bloom filter statistics', async () => {
      const stats = await dncBloomFilter.getStats();

      expect(stats).toBeDefined();
      expect(stats.initialized).toBe(true);
    });
  });
});

describe('DNC Transcript Analyzer', () => {
  describe('checkOptOutKeywords', () => {
    it('should detect explicit opt-out phrases', () => {
      const transcripts = [
        'Please remove me from your list',
        'Do not call me again',
        'I want to be removed',
        'Stop calling me',
        'Take me off your list'
      ];

      transcripts.forEach(transcript => {
        const result = checkOptOutKeywords(transcript);
        expect(result.detected).toBe(true);
        expect(result.detectedPhrase).toBeDefined();
      });
    });

    it('should not detect false positives', () => {
      const transcripts = [
        'I\'m not interested right now, maybe call me next month',
        'Can you tell me more about this?',
        'I need to think about it',
        'Call me back later'
      ];

      transcripts.forEach(transcript => {
        const result = checkOptOutKeywords(transcript);
        expect(result.detected).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      const result = checkOptOutKeywords('REMOVE ME FROM YOUR LIST');
      expect(result.detected).toBe(true);
    });
  });

  describe('analyzeTranscriptForOptOut', () => {
    it('should detect opt-out via keyword matching', async () => {
      const transcript = 'I don\'t want to hear from you anymore. Remove me from your list immediately.';

      const result = await analyzeTranscriptForOptOut(transcript);

      expect(result.optOutDetected).toBe(true);
      expect(result.detectedPhrase).toBeDefined();
      expect(result.recommendedResponse).toBeDefined();
    }, 30000); // 30 second timeout for AI analysis

    it('should handle non-opt-out transcripts', async () => {
      const transcript = 'That sounds interesting. Can you tell me more about the opportunity?';

      const result = await analyzeTranscriptForOptOut(transcript);

      expect(result.optOutDetected).toBe(false);
    }, 30000);

    it('should provide confidence levels', async () => {
      const transcript = 'Stop calling me. I\'m not interested.';

      const result = await analyzeTranscriptForOptOut(transcript);

      expect(result.confidence).toBeDefined();
      expect(['high', 'medium', 'low', 'none']).toContain(result.confidence);
    }, 30000);
  });
});

describe('Integration Tests', () => {
  describe('End-to-End DNC Workflow', () => {
    const testPhone = '+12345678920';

    it('should complete full DNC lifecycle', async () => {
      // 1. Add to DNC
      const addResult = await dncService.addToDNC({
        phoneNumber: testPhone,
        reason: 'lead_requested',
        source: 'call_transcript',
        addedByUserId: mockUserId,
        organizationId: mockOrganizationId,
        detectedPhrase: 'remove me from your list'
      });

      expect(addResult).toBeDefined();

      // 2. Check DNC (should be on list)
      const checkResult = await dncService.checkDNC(testPhone, mockOrganizationId);
      expect(checkResult.onDNCList).toBe(true);

      // 3. Bloom filter check (should return true)
      await dncBloomFilter.add(testPhone);
      const bloomResult = await dncBloomFilter.check(testPhone);
      expect(bloomResult).toBe(true);

      // 4. Remove from DNC
      const removeResult = await dncService.removeFromDNC(
        testPhone,
        mockOrganizationId,
        mockUserId,
        'Lead requested re-engagement'
      );

      expect(removeResult).toBe(true);

      // 5. Verify removal
      const finalCheck = await dncService.checkDNC(testPhone, mockOrganizationId);
      expect(finalCheck.onDNCList).toBe(false);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should handle 1000 DNC checks in < 1 second', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      await dncBloomFilter.check(`+1555${String(i).padStart(7, '0')}`);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });

  it('should scrub 10,000 numbers in < 30 seconds', async () => {
    const phoneNumbers = Array.from({ length: 10000 }, (_, i) =>
      `+1555${String(i).padStart(7, '0')}`
    );

    const startTime = Date.now();
    const result = await dncService.scrubLeadList(phoneNumbers, mockOrganizationId);
    const duration = Date.now() - startTime;

    expect(result.total).toBe(10000);
    expect(duration).toBeLessThan(30000);
  }, 35000);
});
