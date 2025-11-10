/**
 * DNC Transcript Analyzer
 *
 * @description Analyzes call transcripts in real-time to detect opt-out requests
 *              Uses Claude AI to understand intent and context
 * @story Story 3.8: Complete DNC Compliance System
 * @author System Architect
 * @created 2025-01-05
 *
 * Key Features:
 * - Real-time opt-out detection during calls
 * - Context-aware analysis (not just keyword matching)
 * - Multi-language support
 * - False positive prevention
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Common opt-out phrases to detect
 */
const OPT_OUT_PHRASES = [
  'remove me from your list',
  'do not call me again',
  'do not call me',
  'don\'t call me again',
  'don\'t call me',
  'I want to be removed',
  'stop calling me',
  'take me off your list',
  'unsubscribe',
  'remove my number',
  'delete my number',
  'no more calls',
  'stop these calls',
  'I\'m not interested',
  'leave me alone',
  'never call again',
  'take me off',
  'remove me',
  'opt out',
  'I opt out'
];

/**
 * Analyze transcript for opt-out intent
 * @param {string} transcript - Call transcript text
 * @param {Object} context - Additional context (speaker, call metadata)
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeTranscriptForOptOut(transcript, context = {}) {
  try {
    logger.debug('Analyzing transcript for opt-out', {
      transcriptLength: transcript.length,
      context
    });

    // Quick keyword check first (fast path)
    const keywordResult = checkOptOutKeywords(transcript);

    if (keywordResult.detected) {
      logger.info('Opt-out detected via keyword matching', {
        phrase: keywordResult.detectedPhrase
      });

      // Still run AI analysis for confirmation and context
      const aiResult = await analyzeWithClaude(transcript, context);

      return {
        optOutDetected: true,
        confidence: 'high',
        detectedPhrase: keywordResult.detectedPhrase,
        method: 'keyword_and_ai',
        aiAnalysis: aiResult,
        recommendedResponse: generateOptOutResponse(aiResult)
      };
    }

    // No keywords found - run AI analysis to check for implicit opt-out
    const aiResult = await analyzeWithClaude(transcript, context);

    if (aiResult.optOut) {
      logger.info('Opt-out detected via AI analysis', {
        confidence: aiResult.confidence
      });

      return {
        optOutDetected: true,
        confidence: aiResult.confidence,
        detectedPhrase: aiResult.indicativePhrase,
        method: 'ai_only',
        aiAnalysis: aiResult,
        recommendedResponse: generateOptOutResponse(aiResult)
      };
    }

    // No opt-out detected
    return {
      optOutDetected: false,
      confidence: 'none',
      detectedPhrase: null,
      method: 'none',
      aiAnalysis: null
    };

  } catch (error) {
    logger.error('Error analyzing transcript for opt-out:', error);

    // On error, do keyword-only check (fail-safe)
    const keywordResult = checkOptOutKeywords(transcript);

    return {
      optOutDetected: keywordResult.detected,
      confidence: keywordResult.detected ? 'medium' : 'none',
      detectedPhrase: keywordResult.detectedPhrase,
      method: 'keyword_only',
      error: error.message
    };
  }
}

/**
 * Check for opt-out keywords in transcript (fast path)
 * @param {string} transcript - Transcript text
 * @returns {Object} { detected: boolean, detectedPhrase: string }
 */
function checkOptOutKeywords(transcript) {
  const lowerTranscript = transcript.toLowerCase();

  for (const phrase of OPT_OUT_PHRASES) {
    if (lowerTranscript.includes(phrase.toLowerCase())) {
      return {
        detected: true,
        detectedPhrase: phrase
      };
    }
  }

  return {
    detected: false,
    detectedPhrase: null
  };
}

/**
 * Analyze transcript using Claude AI
 * @param {string} transcript - Call transcript
 * @param {Object} context - Call context
 * @returns {Promise<Object>} AI analysis result
 */
async function analyzeWithClaude(transcript, context = {}) {
  try {
    const prompt = `You are analyzing a phone call transcript to detect if the prospect is requesting to be removed from the calling list (opt-out/DNC request).

TRANSCRIPT:
"""
${transcript}
"""

CONTEXT:
- Call Type: ${context.callType || 'Outbound recruiting call'}
- Duration: ${context.duration || 'Unknown'}
- Previous Interactions: ${context.previousInteractions || 'None'}

ANALYSIS TASK:
Determine if the prospect is explicitly or implicitly requesting to:
1. Be removed from the calling list
2. Stop receiving calls
3. Opt-out of future contact
4. Be added to Do Not Call list

Consider:
- Explicit requests ("remove me from your list", "don't call again")
- Implicit requests ("I'm not interested, never contact me again")
- Temporary objections vs. permanent opt-outs
- Emotional context (frustrated, angry, polite decline)

DO NOT consider these as opt-outs:
- Simple "not interested right now" (without permanent language)
- "Call me back later"
- "Maybe in the future"
- Asking questions or engaging in conversation

Respond in JSON format:
{
  "optOut": boolean,
  "confidence": "high" | "medium" | "low",
  "indicativePhrase": "exact phrase from transcript",
  "reasoning": "why you determined this is/isn't an opt-out",
  "sentiment": "angry" | "polite" | "neutral" | "engaged",
  "isPermanent": boolean,
  "suggestedResponse": "how the AI should respond to end the call gracefully"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.3, // Low temperature for consistent, analytical responses
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse Claude's response
    const responseText = message.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
    }

    if (!jsonMatch) {
      throw new Error('Could not parse Claude response as JSON');
    }

    const analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    logger.debug('Claude analysis complete', {
      optOut: analysis.optOut,
      confidence: analysis.confidence
    });

    return analysis;

  } catch (error) {
    logger.error('Error in Claude analysis:', error);
    throw error;
  }
}

/**
 * Generate appropriate opt-out response based on analysis
 * @param {Object} aiAnalysis - Claude AI analysis result
 * @returns {string} Response text for AI agent
 */
function generateOptOutResponse(aiAnalysis) {
  if (!aiAnalysis || !aiAnalysis.suggestedResponse) {
    // Default professional response
    return "I understand and apologize for any inconvenience. I'll remove your number from our list immediately. You will not receive any more calls from us. Thank you for your time.";
  }

  // Use Claude's suggested response
  return aiAnalysis.suggestedResponse;
}

/**
 * Analyze transcript segment in real-time (for streaming transcripts)
 * @param {string} transcriptSegment - Latest transcript segment
 * @param {string} fullTranscript - Full transcript so far
 * @param {Object} context - Call context
 * @returns {Promise<Object>} Quick analysis result
 */
async function analyzeTranscriptSegment(transcriptSegment, fullTranscript, context = {}) {
  try {
    // For real-time analysis, prioritize speed with keyword check
    const keywordResult = checkOptOutKeywords(transcriptSegment);

    if (keywordResult.detected) {
      logger.info('Real-time opt-out detected', {
        phrase: keywordResult.detectedPhrase
      });

      // Trigger async full analysis but return immediately
      analyzeWithClaude(fullTranscript, context)
        .then(aiResult => {
          logger.info('Async AI analysis complete', { aiResult });
        })
        .catch(err => {
          logger.error('Async AI analysis failed:', err);
        });

      return {
        optOutDetected: true,
        confidence: 'high',
        detectedPhrase: keywordResult.detectedPhrase,
        immediate: true,
        fullAnalysisPending: true
      };
    }

    return {
      optOutDetected: false,
      immediate: true
    };

  } catch (error) {
    logger.error('Error in real-time transcript analysis:', error);
    return {
      optOutDetected: false,
      error: error.message
    };
  }
}

/**
 * Batch analyze multiple transcripts for opt-outs
 * @param {Array} transcripts - Array of { id, transcript, context }
 * @returns {Promise<Array>} Analysis results
 */
async function batchAnalyzeTranscripts(transcripts) {
  try {
    logger.info(`Batch analyzing ${transcripts.length} transcripts`);

    const results = await Promise.allSettled(
      transcripts.map(({ id, transcript, context }) =>
        analyzeTranscriptForOptOut(transcript, context)
          .then(result => ({ id, ...result }))
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(`Batch analysis failed for transcript ${transcripts[index].id}:`, result.reason);
        return {
          id: transcripts[index].id,
          optOutDetected: false,
          error: result.reason.message
        };
      }
    });

  } catch (error) {
    logger.error('Error in batch transcript analysis:', error);
    throw error;
  }
}

/**
 * Validate if an opt-out detection is a false positive
 * @param {string} transcript - Full transcript
 * @param {string} detectedPhrase - Phrase that triggered detection
 * @returns {Promise<boolean>} True if false positive
 */
async function validateOptOut(transcript, detectedPhrase) {
  try {
    // Use Claude to validate if the context suggests false positive
    const prompt = `A DNC opt-out phrase was detected: "${detectedPhrase}"

Full transcript:
"""
${transcript}
"""

Is this a FALSE POSITIVE? Consider:
- Was the phrase used in a question? ("Should I remove you?")
- Was it part of the AI agent's speech? (not the prospect)
- Is there context suggesting the prospect wants to continue? (asking questions, engaged)

Respond with JSON:
{
  "isFalsePositive": boolean,
  "reasoning": "explanation"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const validation = JSON.parse(jsonMatch[0]);
      return validation.isFalsePositive;
    }

    return false;

  } catch (error) {
    logger.error('Error validating opt-out:', error);
    // Fail-safe: assume it's NOT a false positive (better to be cautious)
    return false;
  }
}

module.exports = {
  analyzeTranscriptForOptOut,
  analyzeTranscriptSegment,
  batchAnalyzeTranscripts,
  checkOptOutKeywords,
  validateOptOut,
  OPT_OUT_PHRASES
};
