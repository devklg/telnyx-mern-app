/**
 * Engagement Scoring Service
 * Calculates real-time engagement scores based on conversation indicators
 * Determines hot transfer opportunities
 *
 * @author David Rodriguez - Backend Development Lead
 */

class EngagementService {

  constructor() {
    // Scoring weights for different indicators
    this.weights = {
      positiveLanguage: 15,
      questionsAsked: 10,
      activeListening: 12,
      interestSignals: 18,
      timeInConversation: 10,
      verbalAgreement: 15,
      futureCommitment: 20
    };

    // Transfer threshold
    this.transferThreshold = 85;
  }

  /**
   * Calculate engagement score based on indicators
   */
  calculateScore(indicators) {
    try {
      let score = 0;
      const {
        positiveLanguage = 0,
        questionsAsked = 0,
        activeListening = 0,
        interestSignals = 0,
        conversationDuration = 0,
        verbalAgreement = 0,
        futureCommitment = 0
      } = indicators;

      // Positive language detection (0-100 -> 0-15 points)
      score += (positiveLanguage / 100) * this.weights.positiveLanguage;

      // Questions asked by lead (max 5 questions = full points)
      score += Math.min(questionsAsked / 5, 1) * this.weights.questionsAsked;

      // Active listening indicators (0-100 -> 0-12 points)
      score += (activeListening / 100) * this.weights.activeListening;

      // Interest signals detected (max 3 signals = full points)
      score += Math.min(interestSignals / 3, 1) * this.weights.interestSignals;

      // Time in conversation (minutes, max 10 minutes = full points)
      const minutes = conversationDuration / 60;
      score += Math.min(minutes / 10, 1) * this.weights.timeInConversation;

      // Verbal agreement count (max 5 = full points)
      score += Math.min(verbalAgreement / 5, 1) * this.weights.verbalAgreement;

      // Future commitment indicators (0-100 -> 0-20 points)
      score += (futureCommitment / 100) * this.weights.futureCommitment;

      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, Math.round(score)));

      return score;
    } catch (error) {
      console.error('[Engagement Service] Calculate score error:', error);
      return 0;
    }
  }

  /**
   * Check if engagement score qualifies for hot transfer
   */
  shouldTransfer(score, kevinAvailable = true) {
    return score >= this.transferThreshold && kevinAvailable;
  }

  /**
   * Analyze conversation phase and return engagement metrics
   */
  analyzePhase(phase, conversationData) {
    try {
      const phaseScoring = {
        1: { // Introduction
          baseScore: 20,
          indicators: ['greeting_acknowledged', 'name_provided', 'polite_tone']
        },
        2: { // Qualification
          baseScore: 40,
          indicators: ['questions_answered', 'budget_discussed', 'authority_confirmed']
        },
        3: { // Value Proposition
          baseScore: 60,
          indicators: ['interest_expressed', 'objections_handled', 'benefits_acknowledged']
        },
        4: { // Closing/Transfer
          baseScore: 80,
          indicators: ['commitment_signals', 'next_steps_discussed', 'transfer_requested']
        }
      };

      const phaseData = phaseScoring[phase] || { baseScore: 0, indicators: [] };

      return {
        phase,
        baseScore: phaseData.baseScore,
        expectedIndicators: phaseData.indicators,
        message: this.getPhaseMessage(phase)
      };
    } catch (error) {
      console.error('[Engagement Service] Analyze phase error:', error);
      return {
        phase,
        baseScore: 0,
        expectedIndicators: [],
        message: 'Unknown phase'
      };
    }
  }

  /**
   * Get phase message
   */
  getPhaseMessage(phase) {
    const messages = {
      1: 'Introduction - Building rapport',
      2: 'Qualification - Assessing fit',
      3: 'Value Proposition - Presenting solution',
      4: 'Closing - Securing commitment'
    };

    return messages[phase] || 'Unknown phase';
  }

  /**
   * Detect buying signals from conversation
   */
  detectBuyingSignals(text) {
    const buyingSignals = [
      { pattern: /how much|what.*cost|pricing|price/i, signal: 'price_inquiry', weight: 15 },
      { pattern: /when can.*start|timeline|how soon/i, signal: 'timeline_interest', weight: 18 },
      { pattern: /yes|sounds good|interested|tell me more/i, signal: 'positive_response', weight: 10 },
      { pattern: /contract|agreement|sign up|get started/i, signal: 'commitment_language', weight: 20 },
      { pattern: /next step|what happens next|how do we proceed/i, signal: 'next_steps', weight: 17 },
      { pattern: /can you|would you|will you/i, signal: 'request_for_action', weight: 12 },
      { pattern: /my team|my company|we need|we want/i, signal: 'organizational_interest', weight: 14 }
    ];

    const detectedSignals = [];
    let signalScore = 0;

    for (const { pattern, signal, weight } of buyingSignals) {
      if (pattern.test(text)) {
        detectedSignals.push(signal);
        signalScore += weight;
      }
    }

    return {
      signals: detectedSignals,
      count: detectedSignals.length,
      score: Math.min(signalScore, 100)
    };
  }

  /**
   * Analyze sentiment from conversation text
   */
  analyzeSentiment(text) {
    const positiveWords = [
      'yes', 'great', 'excellent', 'perfect', 'good', 'interested', 'love',
      'amazing', 'wonderful', 'fantastic', 'appreciate', 'thank'
    ];

    const negativeWords = [
      'no', 'not', 'never', 'bad', 'poor', 'terrible', 'expensive',
      'difficult', 'problem', 'issue', 'concern', 'worried'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return { sentiment: 'neutral', score: 50, positive: 0, negative: 0 };
    }

    const sentimentScore = Math.round((positiveCount / totalSentimentWords) * 100);
    let sentiment = 'neutral';

    if (sentimentScore >= 70) sentiment = 'positive';
    else if (sentimentScore >= 40) sentiment = 'neutral';
    else sentiment = 'negative';

    return {
      sentiment,
      score: sentimentScore,
      positive: positiveCount,
      negative: negativeCount
    };
  }

  /**
   * Generate engagement report
   */
  generateReport(engagementData) {
    try {
      const {
        score,
        phase,
        indicators,
        buyingSignals = [],
        sentiment,
        conversationDuration,
        kevinAvailable
      } = engagementData;

      const shouldTransfer = this.shouldTransfer(score, kevinAvailable);
      const scoreLevel = this.getScoreLevel(score);

      return {
        score,
        scoreLevel,
        phase,
        shouldTransfer,
        kevinAvailable,
        indicators: {
          count: Object.keys(indicators).length,
          details: indicators
        },
        buyingSignals: {
          count: buyingSignals.length,
          signals: buyingSignals
        },
        sentiment,
        conversationDuration,
        recommendation: this.getRecommendation(score, shouldTransfer),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[Engagement Service] Generate report error:', error);
      return null;
    }
  }

  /**
   * Get score level description
   */
  getScoreLevel(score) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'moderate';
    if (score >= 30) return 'low';
    return 'very_low';
  }

  /**
   * Get recommendation based on score
   */
  getRecommendation(score, shouldTransfer) {
    if (shouldTransfer) {
      return 'HIGH ENGAGEMENT - Initiate hot transfer to Kevin immediately';
    }

    if (score >= 70) {
      return 'Good engagement - Continue conversation and build value';
    }

    if (score >= 50) {
      return 'Moderate engagement - Focus on identifying pain points';
    }

    if (score >= 30) {
      return 'Low engagement - Reassess qualification and interest level';
    }

    return 'Very low engagement - Consider polite disengagement';
  }

  /**
   * Update scoring weights (for dynamic tuning)
   */
  updateWeights(newWeights) {
    try {
      this.weights = {
        ...this.weights,
        ...newWeights
      };

      console.log('[Engagement Service] Scoring weights updated');

      return {
        success: true,
        weights: this.weights
      };
    } catch (error) {
      console.error('[Engagement Service] Update weights error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current scoring configuration
   */
  getConfiguration() {
    return {
      weights: this.weights,
      transferThreshold: this.transferThreshold
    };
  }
}

// Export singleton instance
module.exports = new EngagementService();
