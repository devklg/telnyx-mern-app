/**
 * ETL Script: MongoDB to PostgreSQL Analytics
 * Purpose: Sync operational data from MongoDB to PostgreSQL analytics schema
 * Author: Sarah Chen (SIGMA-1) - Database Architect
 * Database: MongoDB (source) → PostgreSQL/Neon (destination)
 */

const mongoose = require('mongoose');
const { Pool } = require('pg');
require('dotenv').config();

// MongoDB Models
const Lead = require('../mongodb/schemas/lead.schema');
const Conversation = require('../mongodb/schemas/conversation.schema');
const CallLog = require('../mongodb/schemas/calllog.schema');

// PostgreSQL Connection
const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

/**
 * ETL Configuration
 */
const ETL_CONFIG = {
  batchSize: 1000,
  fullRefresh: process.env.ETL_FULL_REFRESH === 'true',
  incrementalHours: parseInt(process.env.ETL_INCREMENTAL_HOURS || '24', 10)
};

/**
 * Sync Leads to dim_leads
 */
async function syncLeads() {
  console.log('📊 Syncing leads to dim_leads...');

  const query = ETL_CONFIG.fullRefresh
    ? {}
    : { updatedAt: { $gte: new Date(Date.now() - ETL_CONFIG.incrementalHours * 60 * 60 * 1000) } };

  const leads = await Lead.find(query).lean();
  console.log(`   Found ${leads.length} leads to sync`);

  let syncedCount = 0;
  for (const lead of leads) {
    try {
      await pgPool.query(`
        SELECT analytics.update_dim_lead(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26
        )
      `, [
        lead._id.toString(),                                  // lead_id
        lead.firstName,                                       // first_name
        lead.lastName,                                        // last_name
        lead.email,                                           // email
        lead.phone,                                           // phone
        lead.company?.name,                                   // company_name
        lead.company?.industry,                               // company_industry
        lead.company?.size,                                   // company_size
        lead.company?.title,                                  // job_title
        lead.source,                                          // source
        lead.status,                                          // status
        lead.lifecycleStage || 'lead',                        // lifecycle_stage
        lead.priority || 'medium',                            // priority
        lead.qualificationScore,                              // qualification_score
        lead.qualificationCriteria?.budget || false,          // has_budget
        lead.qualificationCriteria?.authority || false,       // has_authority
        lead.qualificationCriteria?.need || false,            // has_need
        lead.qualificationCriteria?.timeline || false,        // has_timeline
        lead.assignedTo?.toString(),                          // assigned_agent_id
        null,                                                 // assigned_agent_name (populate separately)
        lead.campaignId?.toString(),                          // campaign_id
        null,                                                 // campaign_name (populate separately)
        lead.address?.city,                                   // city
        lead.address?.state,                                  // state
        lead.address?.country || 'US',                        // country
        lead.metadata?.timezone || 'America/New_York'         // timezone
      ]);
      syncedCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing lead ${lead._id}:`, error.message);
    }
  }

  console.log(`   ✅ Synced ${syncedCount} leads successfully`);
  return syncedCount;
}

/**
 * Sync CallLogs to fact_calls
 */
async function syncCalls() {
  console.log('📞 Syncing call logs to fact_calls...');

  const query = ETL_CONFIG.fullRefresh
    ? {}
    : { initiatedAt: { $gte: new Date(Date.now() - ETL_CONFIG.incrementalHours * 60 * 60 * 1000) } };

  const callLogs = await CallLog.find(query).lean();
  console.log(`   Found ${callLogs.length} call logs to sync`);

  let syncedCount = 0;
  for (const call of callLogs) {
    try {
      // Get lead_key from dim_leads
      const leadResult = await pgPool.query(`
        SELECT lead_key FROM analytics.dim_leads
        WHERE lead_id = $1 AND is_current = TRUE
        LIMIT 1
      `, [call.leadId.toString()]);

      if (leadResult.rows.length === 0) {
        console.warn(`   ⚠️  Lead not found for call ${call.callLogId}, skipping...`);
        continue;
      }

      const leadKey = leadResult.rows[0].lead_key;

      // Get time_key from dim_time
      const callDate = new Date(call.initiatedAt).toISOString().split('T')[0];
      const timeResult = await pgPool.query(`
        SELECT time_id FROM analytics.dim_time
        WHERE date_actual = $1
        LIMIT 1
      `, [callDate]);

      if (timeResult.rows.length === 0) {
        console.warn(`   ⚠️  Time dimension not found for date ${callDate}, skipping...`);
        continue;
      }

      const timeKey = timeResult.rows[0].time_id;

      // Insert or update fact_calls
      await pgPool.query(`
        INSERT INTO analytics.fact_calls (
          lead_key, time_key, call_date, call_id, call_log_id, conversation_id,
          telnyx_call_control_id, direction, call_type, status, answer_state, hangup_cause,
          from_number, to_number,
          duration_total, duration_ringing, duration_talking, duration_hold,
          mos_score, packet_loss_percent, jitter_ms, latency_ms, quality_rating, has_quality_issues,
          agent_talk_time_seconds, lead_talk_time_seconds, talk_ratio, silence_duration_seconds,
          interruption_count, agent_speaking_rate_wpm, lead_speaking_rate_wpm,
          sentiment, sentiment_score, qualification_score,
          keywords, intents, topics,
          has_buying_signals, has_objections, objection_count, pain_points_identified,
          outcome_result, was_qualified, appointment_scheduled, callback_requested, transfer_occurred,
          recording_available, recording_duration_seconds, transcription_available, transcription_confidence,
          call_cost_cents, billing_duration_minutes,
          is_successful, needs_review, compliance_reviewed,
          initiated_at, answered_at, ended_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42,
          $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
        )
        ON CONFLICT (call_id) DO UPDATE SET
          status = EXCLUDED.status,
          duration_total = EXCLUDED.duration_total,
          duration_talking = EXCLUDED.duration_talking,
          outcome_result = EXCLUDED.outcome_result,
          ended_at = EXCLUDED.ended_at
      `, [
        leadKey,                                              // $1
        timeKey,                                              // $2
        callDate,                                             // $3
        call.callId?.toString() || call._id.toString(),       // $4
        call.callLogId,                                       // $5
        call.conversationId?.toString(),                      // $6
        call.telnyx?.callControlId,                           // $7
        call.direction,                                       // $8
        call.callType,                                        // $9
        call.status,                                          // $10
        call.answerState,                                     // $11
        call.hangupCause,                                     // $12
        call.from?.number,                                    // $13
        call.to?.number,                                      // $14
        call.duration?.total || 0,                            // $15
        call.duration?.ringing || 0,                          // $16
        call.duration?.talking || 0,                          // $17
        call.duration?.hold || 0,                             // $18
        call.quality?.mos,                                    // $19
        call.quality?.audio?.packetLoss,                      // $20
        call.quality?.audio?.jitter,                          // $21
        call.quality?.audio?.latency,                         // $22
        call.quality?.overallRating,                          // $23
        call.quality?.issues?.length > 0,                     // $24
        call.aiAnalysis?.speech?.agentTalkTime,               // $25
        call.aiAnalysis?.speech?.leadTalkTime,                // $26
        call.aiAnalysis?.speech?.talkRatio,                   // $27
        call.aiAnalysis?.speech?.silenceDuration,             // $28
        (call.aiAnalysis?.speech?.interruptions?.byAgent || 0) +
          (call.aiAnalysis?.speech?.interruptions?.byLead || 0), // $29
        call.aiAnalysis?.speech?.speakingRate?.agent,         // $30
        call.aiAnalysis?.speech?.speakingRate?.lead,          // $31
        call.aiAnalysis?.sentiment?.overall,                  // $32
        call.aiAnalysis?.sentiment?.score,                    // $33
        call.aiAnalysis?.qualification?.score,                // $34
        call.aiAnalysis?.keywords || [],                      // $35
        call.aiAnalysis?.intents || [],                       // $36
        call.aiAnalysis?.topics || [],                        // $37
        (call.aiAnalysis?.qualification?.signals || []).length > 0, // $38
        (call.aiAnalysis?.qualification?.objections || []).length > 0, // $39
        (call.aiAnalysis?.qualification?.objections || []).length, // $40
        (call.aiAnalysis?.qualification?.concerns || []).length, // $41
        call.outcome?.result,                                 // $42
        call.outcome?.result === 'qualified',                 // $43
        call.outcome?.appointmentSet || false,                // $44
        call.outcome?.callbackRequested || false,             // $45
        call.transfer?.wasTransferred || false,               // $46
        call.recording?.enabled || false,                     // $47
        call.recording?.recordingDuration,                    // $48
        call.transcription?.status === 'completed',           // $49
        call.transcription?.confidence,                       // $50
        call.billing?.cost || 0,                              // $51
        call.billing?.billingDuration,                        // $52
        call.status === 'completed' && call.answerState === 'human' &&
          (call.duration?.talking || 0) >= 30,                // $53
        call.compliance?.reviewRequired || false,             // $54
        call.compliance?.reviewedAt != null,                  // $55
        call.initiatedAt,                                     // $56
        call.answeredAt,                                      // $57
        call.endedAt                                          // $58
      ]);
      syncedCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing call ${call.callLogId}:`, error.message);
    }
  }

  console.log(`   ✅ Synced ${syncedCount} call logs successfully`);
  return syncedCount;
}

/**
 * Sync Conversations to fact_conversations
 */
async function syncConversations() {
  console.log('💬 Syncing conversations to fact_conversations...');

  const query = ETL_CONFIG.fullRefresh
    ? {}
    : { startedAt: { $gte: new Date(Date.now() - ETL_CONFIG.incrementalHours * 60 * 60 * 1000) } };

  const conversations = await Conversation.find(query).lean();
  console.log(`   Found ${conversations.length} conversations to sync`);

  let syncedCount = 0;
  for (const conv of conversations) {
    try {
      // Get lead_key
      const leadResult = await pgPool.query(`
        SELECT lead_key FROM analytics.dim_leads
        WHERE lead_id = $1 AND is_current = TRUE
        LIMIT 1
      `, [conv.leadId.toString()]);

      if (leadResult.rows.length === 0) {
        console.warn(`   ⚠️  Lead not found for conversation ${conv.conversationId}, skipping...`);
        continue;
      }

      const leadKey = leadResult.rows[0].lead_key;

      // Get time_key
      const convDate = new Date(conv.startedAt).toISOString().split('T')[0];
      const timeResult = await pgPool.query(`
        SELECT time_id FROM analytics.dim_time
        WHERE date_actual = $1
        LIMIT 1
      `, [convDate]);

      if (timeResult.rows.length === 0) {
        console.warn(`   ⚠️  Time dimension not found for date ${convDate}, skipping...`);
        continue;
      }

      const timeKey = timeResult.rows[0].time_id;

      // Calculate message counts by sender type
      const messages = conv.messages || [];
      const agentMessages = messages.filter(m => m.sender?.type === 'agent').length;
      const leadMessages = messages.filter(m => m.sender?.type === 'lead').length;
      const aiMessages = messages.filter(m => m.sender?.type === 'ai').length;
      const systemMessages = messages.filter(m => m.sender?.type === 'system').length;

      // Sentiment distribution
      const positiveCount = messages.filter(m =>
        ['very-positive', 'positive'].includes(m.sentiment)
      ).length;
      const neutralCount = messages.filter(m => m.sentiment === 'neutral').length;
      const negativeCount = messages.filter(m =>
        ['negative', 'very-negative'].includes(m.sentiment)
      ).length;

      // Insert or update fact_conversations
      await pgPool.query(`
        INSERT INTO analytics.fact_conversations (
          lead_key, time_key, conversation_date, conversation_id, call_id,
          channel, sub_channel, status,
          started_at, ended_at, duration_seconds, last_activity_at,
          total_messages, agent_messages, lead_messages, ai_messages, system_messages,
          avg_response_time_seconds, engagement_level, response_rate, participant_count,
          overall_sentiment, sentiment_score, sentiment_trend,
          positive_message_count, neutral_message_count, negative_message_count,
          qualification_score,
          budget_detected, budget_score, authority_detected, authority_score,
          need_detected, need_score, timeline_detected, timeline_score,
          main_topics, keywords, mentioned_products, competitors_mentioned,
          buying_signals_count, pain_points_count, objections_count, interests_count,
          completeness_score, transcript_quality_score, ai_confidence_score,
          outcome_result, was_qualified, not_interested, needs_follow_up,
          callback_requested, meeting_scheduled, meeting_scheduled_for, deal_value_cents,
          recording_available, recording_consent_given, transcription_available, summary_generated,
          review_required, reviewed, reviewed_at,
          escalation_recommended, was_escalated, escalated_at,
          embedding_generated, chroma_doc_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47,
          $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60
        )
        ON CONFLICT (conversation_id) DO UPDATE SET
          status = EXCLUDED.status,
          ended_at = EXCLUDED.ended_at,
          duration_seconds = EXCLUDED.duration_seconds,
          total_messages = EXCLUDED.total_messages,
          qualification_score = EXCLUDED.qualification_score,
          outcome_result = EXCLUDED.outcome_result
      `, [
        leadKey,                                              // $1
        timeKey,                                              // $2
        convDate,                                             // $3
        conv.conversationId,                                  // $4
        conv.callId?.toString(),                              // $5
        conv.channel,                                         // $6
        conv.subChannel,                                      // $7
        conv.status,                                          // $8
        conv.startedAt,                                       // $9
        conv.endedAt,                                         // $10
        conv.duration,                                        // $11
        conv.lastActivityAt,                                  // $12
        messages.length,                                      // $13
        agentMessages,                                        // $14
        leadMessages,                                         // $15
        aiMessages,                                           // $16
        systemMessages,                                       // $17
        conv.aiAnalysis?.avgResponseTime,                     // $18
        conv.aiAnalysis?.engagementLevel,                     // $19
        conv.aiAnalysis?.responseRate,                        // $20
        conv.participantCount || 0,                           // $21
        conv.aiAnalysis?.overallSentiment,                    // $22
        conv.aiAnalysis?.sentimentScore,                      // $23
        conv.aiAnalysis?.sentimentTrend,                      // $24
        positiveCount,                                        // $25
        neutralCount,                                         // $26
        negativeCount,                                        // $27
        conv.aiAnalysis?.qualificationScore,                  // $28
        conv.aiAnalysis?.qualificationFactors?.budget?.detected, // $29
        conv.aiAnalysis?.qualificationFactors?.budget?.score,    // $30
        conv.aiAnalysis?.qualificationFactors?.authority?.detected, // $31
        conv.aiAnalysis?.qualificationFactors?.authority?.score,    // $32
        conv.aiAnalysis?.qualificationFactors?.need?.detected,      // $33
        conv.aiAnalysis?.qualificationFactors?.need?.score,         // $34
        conv.aiAnalysis?.qualificationFactors?.timeline?.detected,  // $35
        conv.aiAnalysis?.qualificationFactors?.timeline?.score,     // $36
        conv.aiAnalysis?.mainTopics || [],                    // $37
        conv.aiAnalysis?.keywords || [],                      // $38
        conv.aiAnalysis?.mentionedProducts || [],             // $39
        conv.aiAnalysis?.competitors || [],                   // $40
        (conv.aiAnalysis?.buyingSignals || []).length,        // $41
        (conv.aiAnalysis?.painPoints || []).length,           // $42
        (conv.aiAnalysis?.objections || []).length,           // $43
        (conv.aiAnalysis?.interests || []).length,            // $44
        conv.quality?.completeness,                           // $45
        conv.quality?.transcriptQuality,                      // $46
        conv.quality?.aiConfidence,                           // $47
        conv.outcome?.result,                                 // $48
        conv.outcome?.result === 'qualified',                 // $49
        conv.outcome?.result === 'not-interested',            // $50
        conv.outcome?.result === 'needs-follow-up',           // $51
        conv.outcome?.scheduledFollowUp != null,              // $52
        conv.outcome?.meetingScheduled?.scheduled || false,   // $53
        conv.outcome?.meetingScheduled?.scheduledFor,         // $54
        conv.outcome?.dealValue,                              // $55
        conv.compliance?.recordingUrl != null,                // $56
        conv.compliance?.recordingConsent || false,           // $57
        conv.compliance?.recordingTranscript != null,         // $58
        conv.summary?.shortSummary != null,                   // $59
        conv.quality?.reviewRequired || false,                // $60
        conv.quality?.reviewedAt != null,                     // $61
        conv.quality?.reviewedAt,                             // $62
        conv.aiAnalysis?.escalationRecommended || false,      // $63
        conv.status === 'escalated',                          // $64
        conv.status === 'escalated' ? conv.lastActivityAt : null, // $65
        conv.embeddings?.chromaDocId != null,                 // $66
        conv.embeddings?.chromaDocId                          // $67
      ]);
      syncedCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing conversation ${conv.conversationId}:`, error.message);
    }
  }

  console.log(`   ✅ Synced ${syncedCount} conversations successfully`);
  return syncedCount;
}

/**
 * Refresh materialized views
 */
async function refreshMaterializedViews() {
  console.log('🔄 Refreshing materialized views...');

  try {
    await pgPool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_call_summary_daily');
    console.log('   ✅ Refreshed mv_call_summary_daily');
  } catch (error) {
    console.error('   ❌ Error refreshing mv_call_summary_daily:', error.message);
  }

  try {
    await pgPool.query('SELECT analytics.refresh_conversation_views()');
    console.log('   ✅ Refreshed conversation views');
  } catch (error) {
    console.error('   ❌ Error refreshing conversation views:', error.message);
  }
}

/**
 * Main ETL Process
 */
async function runETL() {
  console.log('🚀 Starting ETL: MongoDB → PostgreSQL Analytics');
  console.log(`   Mode: ${ETL_CONFIG.fullRefresh ? 'FULL REFRESH' : `INCREMENTAL (last ${ETL_CONFIG.incrementalHours} hours)`}`);
  console.log(`   Batch Size: ${ETL_CONFIG.batchSize}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Sync data
    const leadCount = await syncLeads();
    const callCount = await syncCalls();
    const convCount = await syncConversations();

    // Refresh materialized views
    await refreshMaterializedViews();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('✅ ETL completed successfully!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Leads synced: ${leadCount}`);
    console.log(`   Calls synced: ${callCount}`);
    console.log(`   Conversations synced: ${convCount}`);

  } catch (error) {
    console.error('❌ ETL failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    await pgPool.end();
    console.log('🔌 Connections closed');
  }
}

// Run if called directly
if (require.main === module) {
  runETL()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runETL, syncLeads, syncCalls, syncConversations };
