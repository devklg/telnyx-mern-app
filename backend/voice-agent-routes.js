// ============================================================================
// BMAD V4 - VOICE AGENT API ROUTES
// ============================================================================
// 
// Complete REST API for the Voice Agent Learning System
// Endpoints for:
// - Lead management
// - Call operations
// - Agent learning
// - Revenue metrics
// - Hot transfers
//
// Author: BMAD v4 Development Team
// Created: October 2025
// ============================================================================

const express = require('express');
const router = express.Router();

// ============================================================================
// LEAD MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/leads
 * Create a new lead in the system
 * 
 * Body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "+15551234567",
 *   "source": "website",
 *   "interest_level": "hot"
 * }
 */
router.post('/leads', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    const { name, email, phone, source, interest_level } = req.body;
    
    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }
    
    // Insert into Neon PostgreSQL
    const leadResult = await dbManager.pgPool.query(
      `INSERT INTO leads (name, email, phone, source, interest_level, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'new', NOW())
       RETURNING *`,
      [name, email, phone, source, interest_level || 'warm']
    );
    
    const lead = leadResult.rows[0];
    
    // Create lead node in Neo4j knowledge graph
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run(
        `CREATE (l:Lead {
          id: $id,
          name: $name,
          phone: $phone,
          email: $email,
          source: $source,
          interest_level: $interest_level,
          created_at: datetime()
        })`,
        {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          interest_level: lead.interest_level
        }
      );
    } finally {
      await session.close();
    }
    
    res.status(201).json({
      success: true,
      lead: lead
    });
    
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leads
 * List all leads with optional filtering
 * 
 * Query params:
 * - status: Filter by status (new, contacted, qualified, converted)
 * - interest_level: Filter by interest (hot, warm, cold)
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 */
router.get('/leads', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    const { status, interest_level, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (interest_level) {
      query += ` AND interest_level = $${paramIndex}`;
      params.push(interest_level);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await dbManager.pgPool.query(query, params);
    
    res.json({
      success: true,
      leads: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leads/:id
 * Get a specific lead with complete history
 */
router.get('/leads/:id', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  const leadId = req.params.id;
  
  try {
    // Get lead from PostgreSQL
    const leadResult = await dbManager.pgPool.query(
      'SELECT * FROM leads WHERE id = $1',
      [leadId]
    );
    
    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    const lead = leadResult.rows[0];
    
    // Get call history
    const callsResult = await dbManager.pgPool.query(
      'SELECT * FROM calls WHERE lead_id = $1 ORDER BY started_at DESC',
      [leadId]
    );
    
    // Get learning insights from Neo4j
    const session = dbManager.neo4jDriver.session();
    let learningInsights = [];
    
    try {
      const result = await session.run(
        `MATCH (l:Lead {id: $leadId})-[r:HAD_CALL]->(c:Call)
         OPTIONAL MATCH (c)-[:LEARNED]->(i:Insight)
         RETURN c, i
         ORDER BY c.timestamp DESC
         LIMIT 10`,
        { leadId: leadId }
      );
      
      learningInsights = result.records.map(record => ({
        call: record.get('c').properties,
        insight: record.get('i') ? record.get('i').properties : null
      }));
    } finally {
      await session.close();
    }
    
    res.json({
      success: true,
      lead: lead,
      calls: callsResult.rows,
      learning_insights: learningInsights
    });
    
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CALL OPERATIONS ROUTES
// ============================================================================

/**
 * POST /api/calls/initiate
 * Initiate an outbound call using Telnyx
 * 
 * Body:
 * {
 *   "lead_id": 123,
 *   "phone_number": "+15551234567",
 *   "agent_id": 1
 * }
 */
router.post('/calls/initiate', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    const { lead_id, phone_number, agent_id } = req.body;
    
    if (!lead_id || !phone_number) {
      return res.status(400).json({
        success: false,
        error: 'lead_id and phone_number are required'
      });
    }
    
    // Create call record
    const callResult = await dbManager.pgPool.query(
      `INSERT INTO calls (lead_id, user_id, phone_number, direction, status, started_at)
       VALUES ($1, $2, $3, 'outbound', 'initiated', NOW())
       RETURNING *`,
      [lead_id, agent_id || null, phone_number]
    );
    
    const call = callResult.rows[0];
    
    // TODO: Integrate with Telnyx API to actually initiate call
    // This would involve:
    // 1. Creating a Telnyx call
    // 2. Configuring webhooks for call events
    // 3. Setting up call recording
    
    // Create call node in Neo4j
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run(
        `MATCH (l:Lead {id: $leadId})
         CREATE (c:Call {
           id: $callId,
           phone_number: $phone,
           direction: 'outbound',
           status: 'initiated',
           timestamp: datetime()
         })
         CREATE (l)-[:HAD_CALL]->(c)`,
        {
          leadId: lead_id,
          callId: call.id,
          phone: phone_number
        }
      );
    } finally {
      await session.close();
    }
    
    res.status(201).json({
      success: true,
      call: call,
      message: 'Call initiated successfully'
    });
    
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/calls/:id/hot-transfer
 * Initiate a hot transfer to Kevin (human closer)
 * 
 * Body:
 * {
 *   "target_phone": "+15559876543",
 *   "reason": "Qualified lead ready to close"
 * }
 */
router.post('/calls/:id/hot-transfer', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  const callId = req.params.id;
  
  try {
    const { target_phone, reason } = req.body;
    
    if (!target_phone) {
      return res.status(400).json({
        success: false,
        error: 'target_phone is required'
      });
    }
    
    // Update call record
    await dbManager.pgPool.query(
      `UPDATE calls 
       SET status = 'transferred', 
           notes = CONCAT(COALESCE(notes, ''), 'Hot transferred: ', $1, '. ')
       WHERE id = $2`,
      [reason || 'Qualified lead', callId]
    );
    
    // TODO: Integrate with Telnyx to perform actual hot transfer
    
    // Record transfer in Neo4j
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run(
        `MATCH (c:Call {id: $callId})
         CREATE (t:Transfer {
           to: $targetPhone,
           reason: $reason,
           timestamp: datetime()
         })
         CREATE (c)-[:HOT_TRANSFERRED_TO]->(t)`,
        {
          callId: parseInt(callId),
          targetPhone: target_phone,
          reason: reason || 'Qualified lead'
        }
      );
    } finally {
      await session.close();
    }
    
    res.json({
      success: true,
      message: 'Hot transfer initiated',
      target: target_phone
    });
    
  } catch (error) {
    console.error('Error initiating hot transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/calls/:id/complete
 * Mark a call as complete and store transcript
 * 
 * Body:
 * {
 *   "duration_seconds": 180,
 *   "outcome": "qualified",
 *   "transcript": "Full conversation transcript...",
 *   "sentiment": "positive"
 * }
 */
router.post('/calls/:id/complete', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  const callId = req.params.id;
  
  try {
    const { duration_seconds, outcome, transcript, sentiment } = req.body;
    
    // Update call in PostgreSQL
    await dbManager.pgPool.query(
      `UPDATE calls 
       SET status = 'completed',
           ended_at = NOW(),
           duration_seconds = $1,
           outcome = $2
       WHERE id = $3`,
      [duration_seconds, outcome, callId]
    );
    
    // Store transcript in MongoDB
    if (transcript) {
      const transcriptDoc = {
        call_id: parseInt(callId),
        transcript: transcript,
        sentiment: sentiment || 'neutral',
        created_at: new Date()
      };
      
      await dbManager.mongoDb.collection('transcripts').insertOne(transcriptDoc);
      
      // Generate embeddings and store in ChromaDB
      // TODO: Implement embedding generation with Anthropic or OpenAI
      // For now, we'll create a placeholder
      try {
        const collection = await dbManager.chromaClient.getOrCreateCollection({
          name: 'call_transcripts'
        });
        
        await collection.add({
          ids: [callId.toString()],
          documents: [transcript],
          metadatas: [{
            call_id: parseInt(callId),
            outcome: outcome,
            sentiment: sentiment
          }]
        });
      } catch (chromaError) {
        console.error('Error storing in ChromaDB:', chromaError);
        // Don't fail the whole request if ChromaDB fails
      }
    }
    
    // Update Neo4j with learning insights
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run(
        `MATCH (c:Call {id: $callId})
         SET c.completed = true,
             c.duration = $duration,
             c.outcome = $outcome,
             c.sentiment = $sentiment`,
        {
          callId: parseInt(callId),
          duration: duration_seconds,
          outcome: outcome,
          sentiment: sentiment
        }
      );
      
      // Create insight node if outcome was successful
      if (outcome === 'qualified' || outcome === 'converted') {
        await session.run(
          `MATCH (c:Call {id: $callId})
           CREATE (i:Insight {
             type: 'successful_outcome',
             outcome: $outcome,
             timestamp: datetime()
           })
           CREATE (c)-[:LEARNED]->(i)`,
          {
            callId: parseInt(callId),
            outcome: outcome
          }
        );
      }
    } finally {
      await session.close();
    }
    
    res.json({
      success: true,
      message: 'Call completed and transcript stored'
    });
    
  } catch (error) {
    console.error('Error completing call:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// AGENT LEARNING ROUTES
// ============================================================================

/**
 * GET /api/learning/patterns
 * Get AI learning patterns and insights from the knowledge graph
 */
router.get('/learning/patterns', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    const session = dbManager.neo4jDriver.session();
    
    try {
      // Get successful conversation patterns
      const patternsResult = await session.run(
        `MATCH (c:Call {outcome: 'qualified'})-[:LEARNED]->(i:Insight)
         WITH count(i) as qualified_insights
         MATCH (c2:Call {outcome: 'converted'})-[:LEARNED]->(i2:Insight)
         WITH qualified_insights, count(i2) as converted_insights
         MATCH (c3:Call)-[:LEARNED]->(i3:Insight)
         RETURN qualified_insights, converted_insights, count(i3) as total_insights`
      );
      
      // Get top performing phrases
      const phrasesResult = await session.run(
        `MATCH (c:Call {outcome: 'qualified'})-[:USED_PHRASE]->(p:Phrase)
         RETURN p.text as phrase, count(c) as usage_count
         ORDER BY usage_count DESC
         LIMIT 10`
      );
      
      // Get optimal call timing
      const timingResult = await session.run(
        `MATCH (c:Call {outcome: 'qualified'})
         RETURN avg(c.duration) as avg_duration,
                min(c.duration) as min_duration,
                max(c.duration) as max_duration`
      );
      
      const patterns = {
        total_insights: patternsResult.records[0]?.get('total_insights').toNumber() || 0,
        qualified_insights: patternsResult.records[0]?.get('qualified_insights').toNumber() || 0,
        converted_insights: patternsResult.records[0]?.get('converted_insights').toNumber() || 0,
        top_phrases: phrasesResult.records.map(record => ({
          phrase: record.get('phrase'),
          usage_count: record.get('usage_count').toNumber()
        })),
        optimal_timing: timingResult.records[0] ? {
          avg_duration: timingResult.records[0].get('avg_duration'),
          min_duration: timingResult.records[0].get('min_duration'),
          max_duration: timingResult.records[0].get('max_duration')
        } : null
      };
      
      res.json({
        success: true,
        patterns: patterns
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error) {
    console.error('Error fetching learning patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/learning/feedback
 * Submit feedback to improve AI learning
 * 
 * Body:
 * {
 *   "call_id": 123,
 *   "feedback_type": "positive",
 *   "notes": "Great qualification approach"
 * }
 */
router.post('/learning/feedback', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    const { call_id, feedback_type, notes } = req.body;
    
    if (!call_id || !feedback_type) {
      return res.status(400).json({
        success: false,
        error: 'call_id and feedback_type are required'
      });
    }
    
    // Store feedback in Neo4j
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run(
        `MATCH (c:Call {id: $callId})
         CREATE (f:Feedback {
           type: $feedbackType,
           notes: $notes,
           timestamp: datetime()
         })
         CREATE (c)-[:RECEIVED_FEEDBACK]->(f)`,
        {
          callId: call_id,
          feedbackType: feedback_type,
          notes: notes || ''
        }
      );
    } finally {
      await session.close();
    }
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
    
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// METRICS & ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/metrics/revenue
 * Get revenue projections and actual metrics
 */
router.get('/metrics/revenue', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    // Get actual metrics from PostgreSQL
    const metricsResult = await dbManager.pgPool.query(
      `SELECT 
         COUNT(DISTINCT lead_id) FILTER (WHERE status = 'converted') as total_partners,
         SUM(mrr) as total_mrr,
         AVG(acquisition_bonus) as avg_acquisition_bonus,
         MAX(created_at) as last_update
       FROM partner_metrics`
    );
    
    const actualMetrics = metricsResult.rows[0];
    
    // Revenue projection model
    const targetPartnersPerMonth = 50;
    const premiumTierPercentage = 0.80;
    const standardTierPercentage = 0.20;
    const premiumPrice = 99;
    const standardPrice = 49;
    const commissionRate = 0.20;
    
    // Calculate weighted average
    const avgMRR = (premiumTierPercentage * premiumPrice) + (standardTierPercentage * standardPrice);
    const commissionPerPartner = avgMRR * commissionRate;
    const monthlyRecurringPer50 = targetPartnersPerMonth * commissionPerPartner;
    
    // 12-month projection
    const projections = [];
    let cumulativePartners = actualMetrics.total_partners || 0;
    let cumulativeRevenue = parseFloat(actualMetrics.total_mrr) || 0;
    
    for (let month = 1; month <= 12; month++) {
      cumulativePartners += targetPartnersPerMonth;
      const monthlyRevenue = cumulativePartners * commissionPerPartner;
      cumulativeRevenue = monthlyRevenue;
      
      projections.push({
        month: month,
        partners: cumulativePartners,
        monthly_recurring: monthlyRevenue,
        annual_recurring: monthlyRevenue * 12
      });
    }
    
    res.json({
      success: true,
      current: {
        partners: actualMetrics.total_partners,
        mrr: parseFloat(actualMetrics.total_mrr) || 0,
        last_update: actualMetrics.last_update
      },
      model: {
        target_partners_per_month: targetPartnersPerMonth,
        commission_per_partner: commissionPerPartner,
        monthly_recurring_per_50: monthlyRecurringPer50
      },
      projections: projections
    });
    
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/performance
 * Get AI agent performance metrics
 */
router.get('/metrics/performance', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  
  try {
    // Get call metrics
    const callMetrics = await dbManager.pgPool.query(
      `SELECT 
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE outcome = 'qualified') as qualified_calls,
         COUNT(*) FILTER (WHERE outcome = 'converted') as converted_calls,
         COUNT(*) FILTER (WHERE status = 'transferred') as hot_transfers,
         AVG(duration_seconds) as avg_duration,
         AVG(duration_seconds) FILTER (WHERE outcome = 'qualified') as avg_qualified_duration
       FROM calls
       WHERE started_at >= NOW() - INTERVAL '30 days'`
    );
    
    const metrics = callMetrics.rows[0];
    
    // Calculate conversion rates
    const qualificationRate = metrics.total_calls > 0 
      ? (metrics.qualified_calls / metrics.total_calls * 100).toFixed(2)
      : 0;
    
    const conversionRate = metrics.qualified_calls > 0
      ? (metrics.converted_calls / metrics.qualified_calls * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      period: 'Last 30 days',
      metrics: {
        total_calls: parseInt(metrics.total_calls),
        qualified_calls: parseInt(metrics.qualified_calls),
        converted_calls: parseInt(metrics.converted_calls),
        hot_transfers: parseInt(metrics.hot_transfers),
        qualification_rate: `${qualificationRate}%`,
        conversion_rate: `${conversionRate}%`,
        avg_call_duration: Math.round(metrics.avg_duration),
        avg_qualified_duration: Math.round(metrics.avg_qualified_duration)
      }
    });
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

/**
 * GET /api/health
 * Check health status of all database connections
 */
router.get('/health', async (req, res) => {
  const dbManager = req.app.locals.dbManager;
  const health = {
    neo4j: false,
    postgresql: false,
    mongodb: false,
    chromadb: false
  };
  
  // Check Neo4j
  try {
    const session = dbManager.neo4jDriver.session();
    try {
      await session.run('RETURN 1');
      health.neo4j = true;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Neo4j health check failed:', error.message);
  }
  
  // Check PostgreSQL
  try {
    await dbManager.pgPool.query('SELECT 1');
    health.postgresql = true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error.message);
  }
  
  // Check MongoDB
  try {
    await dbManager.mongoClient.db().admin().ping();
    health.mongodb = true;
  } catch (error) {
    console.error('MongoDB health check failed:', error.message);
  }
  
  // Check ChromaDB
  try {
    await dbManager.chromaClient.heartbeat();
    health.chromadb = true;
  } catch (error) {
    console.error('ChromaDB health check failed:', error.message);
  }
  
  const allHealthy = Object.values(health).every(status => status === true);
  
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    services: health,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;