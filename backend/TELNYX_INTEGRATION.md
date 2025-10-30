# Telnyx Integration Documentation

**Implemented by:** Jennifer Kim - Telnyx Integration Specialist
**Tasks Completed:** T006, T007, T008
**Total Story Points:** 34 points

## Overview

This document describes the complete Telnyx integration for the BMAD V4 Lead Qualification & Management App. The integration provides voice calling capabilities, real-time event streaming, and voice agent connectivity.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BMAD V4 Backend (Port 3550)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌───────────────────┐               │
│  │  Telnyx Service  │◄─────┤  Telnyx Config    │               │
│  │  (API Calls)     │      │  Module           │               │
│  └────────┬─────────┘      └───────────────────┘               │
│           │                                                      │
│           │ initiateCall(), transfer(), etc.                    │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────┐           │
│  │           Telnyx REST API (calls.create)         │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────┐      ┌───────────────────┐               │
│  │ Telnyx WebSocket │◄─────┤  Socket.io        │               │
│  │ Service          │      │  (Frontend WS)    │               │
│  └────────┬─────────┘      └───────────────────┘               │
│           │                          │                          │
│           │ Real-time Events         │ Broadcast                │
│           ▼                          ▼                          │
│  ┌─────────────────────────────────────────────┐               │
│  │    Webhook Controller (Telnyx Events)       │               │
│  └─────────────────┬───────────────────────────┘               │
│                    │                                            │
│                    │ Forward Events                             │
│                    ▼                                            │
│  ┌──────────────────────────────────────────────────┐           │
│  │        Voice Agent Service Client                │           │
│  └────────┬─────────────────────────────────────────┘           │
│           │                                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ HTTP POST (port 3650)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                Voice Agent Service (Port 3650)                   │
│        Handles AI voice interactions via Claude API             │
└─────────────────────────────────────────────────────────────────┘
```

## Components Implemented

### T006: Telnyx API Configuration (13 points) ✅

#### 1. Environment Configuration

**File:** `/backend/.env.example`

All Telnyx credentials and configuration variables are documented in the `.env.example` file. Required variables:

- `TELNYX_API_KEY` - Telnyx API authentication key
- `TELNYX_PUBLIC_KEY` - Public key for webhook signature validation
- `TELNYX_CONNECTION_ID` - Telnyx connection/application ID
- `TELNYX_PHONE_NUMBER` - Outbound caller ID number
- `KEVIN_PHONE_NUMBER` - Phone number for hot transfers
- `API_BASE_URL` - Public URL for webhooks

#### 2. Telnyx Configuration Module

**File:** `/backend/src/config/telnyx.config.js`

Centralized configuration management with:
- Environment variable validation
- Phone number normalization (E.164 format)
- Webhook signature validation
- Configuration getters for different call types
- Connection testing utilities

**Key Methods:**
- `validateWebhookSignature(payload, signature, timestamp)` - HMAC SHA256 validation
- `getCallConfig(phoneNumber, callId, metadata)` - Build call initiation config
- `getWebhookUrl()` - Return full webhook URL
- `isConfigured()` - Check if properly configured
- `testConnection()` - Test Telnyx API connectivity

#### 3. Enhanced Telnyx Service

**File:** `/backend/src/services/telnyx.service.js`

Updated to use centralized configuration with improved:
- Call initiation with metadata tracking
- Conference call creation for hot transfers
- Recording with configuration-based defaults
- Comprehensive logging
- Configuration validation

**Available Methods:**
- `initiateCall(phoneNumber, callId, metadata)` - Start outbound call
- `answerCall(callControlId)` - Answer incoming call
- `hangupCall(callControlId)` - End call
- `createConferenceCall(callControlId, kevinPhone, conferenceName)` - Hot transfer
- `startRecording(callControlId, format, channels)` - Begin recording
- `stopRecording(callControlId)` - Stop recording
- `playAudio(callControlId, audioUrl)` - Play audio file
- `speak(callControlId, text, options)` - Text-to-speech
- `gatherDTMF(callControlId, options)` - Collect DTMF input
- `muteCall(callControlId)` / `unmuteCall(callControlId)` - Audio control
- `blindTransfer(callControlId, toNumber)` - Blind transfer
- `getCallInfo(callControlId)` - Retrieve call details

### T007: Telnyx WebSocket Setup (8 points) ✅

#### 1. Telnyx WebSocket Service

**File:** `/backend/src/websocket/telnyx-websocket.service.js`

Real-time event streaming from Telnyx with:
- Persistent WebSocket connection to Telnyx RTC API
- Automatic reconnection with exponential backoff (3s, 6s, 12s, 24s, 48s)
- Heartbeat ping/pong mechanism
- Event handlers for all call events
- Integration with Socket.io for frontend broadcasting

**Supported Events:**
- `call.initiated` - Call started
- `call.answered` - Call answered
- `call.bridged` - Call connected
- `call.hangup` - Call ended
- `call.dtmf.received` - DTMF digit received
- `call.speak.started` / `call.speak.ended` - TTS events
- `recording.started` / `recording.stopped` - Recording events
- `conference.created` / `conference.ended` - Conference events
- `conference.participant.joined` / `conference.participant.left` - Participant events

**Key Features:**
- Automatic reconnection up to 5 attempts
- Exponential backoff reconnection strategy
- Graceful shutdown handling
- Status monitoring endpoint

#### 2. Server Integration

**File:** `/backend/src/server.js`

WebSocket initialization during server startup with:
- Connection to Telnyx WebSocket API
- Integration with Socket.io instance
- Graceful disconnection on shutdown (SIGTERM, SIGINT)

### T008: Voice Agent Integration (13 points) ✅

#### 1. Voice Agent Service Client

**File:** `/backend/src/services/voice-agent.service.js`

HTTP client for communicating with voice agent service (port 3650):

**Methods:**
- `testConnection()` - Test voice agent health
- `startCall(callData)` - Notify agent of new call
- `sendCallEvent(eventData)` - Forward Telnyx events
- `endCall(callId, reason)` - Notify call end
- `requestTransfer(callId, callControlId, score, leadData)` - Request transfer to Kevin
- `getCallStatus(callId)` - Get call status
- `sendDTMF(callId, digit)` - Forward DTMF input
- `sendTranscription(callId, transcription, isFinal)` - Send transcription data

#### 2. Enhanced Webhook Controller

**File:** `/backend/src/controllers/webhook.controller.js`

Webhook processing with event forwarding:
- Signature validation using Telnyx public key
- Event broadcasting via Socket.io
- Automatic event forwarding to voice agent service
- Client state parsing for call ID extraction

**Call-Related Events Forwarded:**
- call.initiated, call.answered, call.bridged, call.hangup
- call.dtmf.received
- call.speak.started, call.speak.ended
- recording.started, recording.stopped

#### 3. Voice Controller API Endpoints

**File:** `/backend/src/controllers/voice.controller.js`

Enhanced with voice agent integration endpoints.

## API Endpoints

### Telnyx Configuration & Testing

```
GET  /api/voice/test-connection       - Test Telnyx API connectivity
GET  /api/voice/configuration         - Get Telnyx config (masked)
GET  /api/voice/websocket/status      - Get WebSocket connection status
```

### Call Management

```
POST /api/voice/initiate              - Initiate outbound call
POST /api/voice/transfer              - Transfer call (blind or hot)
POST /api/voice/answer                - Answer incoming call
POST /api/voice/hangup                - Hang up call
GET  /api/voice/status/:callControlId - Get call status
```

### Recording Management

```
POST /api/voice/recording/start       - Start call recording
POST /api/voice/recording/stop        - Stop call recording
```

### Voice Agent Integration

```
GET  /api/voice/agent/test            - Test voice agent connectivity
GET  /api/voice/agent/configuration   - Get voice agent config
POST /api/voice/agent/start           - Start call with voice agent
POST /api/voice/agent/transfer        - Request transfer to Kevin
```

### Webhooks

```
POST /api/webhooks/telnyx             - Receive Telnyx events
POST /api/webhooks/telnyx/voice       - Voice-specific events
POST /api/webhooks/telnyx/messaging   - Messaging events
```

## Configuration

### Required Environment Variables

```bash
# Telnyx API Configuration
TELNYX_API_KEY=YOUR_TELNYX_API_KEY_HERE
TELNYX_PUBLIC_KEY=YOUR_TELNYX_PUBLIC_KEY_HERE
TELNYX_CONNECTION_ID=your_connection_id_here
TELNYX_PHONE_NUMBER=+1-323-328-8457
KEVIN_PHONE_NUMBER=+1XXXXXXXXXX

# Webhook Configuration
API_BASE_URL=https://your-domain.com
WEBHOOK_SECRET=your_webhook_secret_here

# Voice Agent Configuration
VOICE_AGENT_URL=http://localhost:3650
VOICE_AGENT_API_KEY=your_voice_agent_api_key

# Feature Flags
ENABLE_RECORDING=true
ENABLE_TRANSCRIPTION=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_AUTO_TRANSFER=true
```

### Optional Configuration

```bash
# Call Configuration
CALL_TIMEOUT_MINUTES=15
MAX_CONCURRENT_CALLS=50

# Development
DEBUG=false
MOCK_TELNYX=false
```

## Testing the Integration

### 1. Test Telnyx API Connection

```bash
curl http://localhost:3550/api/voice/test-connection
```

Expected response:
```json
{
  "success": true,
  "message": "Telnyx API connection successful",
  "config": {
    "apiKey": "KEY0199...",
    "phoneNumber": "+13233288457",
    "webhookUrl": "http://localhost:3550/api/webhooks/telnyx"
  }
}
```

### 2. Test WebSocket Status

```bash
curl http://localhost:3550/api/voice/websocket/status
```

### 3. Test Voice Agent Connectivity

```bash
curl http://localhost:3550/api/voice/agent/test
```

### 4. Initiate Test Call

```bash
curl -X POST http://localhost:3550/api/voice/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+15555555555",
    "callId": "test-call-001",
    "metadata": {
      "leadId": "lead-123",
      "campaignId": "campaign-001"
    }
  }'
```

## Socket.io Events

### Events Emitted to Frontend

```javascript
// Telnyx connection status
socket.on('telnyx:connection', (data) => {
  // { status: 'connected|disconnected', timestamp }
});

// Telnyx error
socket.on('telnyx:error', (data) => {
  // { error: string, timestamp }
});

// Telnyx events
socket.on('telnyx:event', (data) => {
  // { type: string, data: object, timestamp }
});

// Call-specific events
socket.on('call:initiated', (data) => { /* ... */ });
socket.on('call:answered', (data) => { /* ... */ });
socket.on('call:hangup', (data) => { /* ... */ });
socket.on('recording:started', (data) => { /* ... */ });
socket.on('recording:stopped', (data) => { /* ... */ });
```

## Inter-Service Communication

### Backend → Voice Agent Flow

1. **Call Initiated:**
   ```
   Backend receives Telnyx call.initiated webhook
   → Webhook controller forwards to voice agent
   → Voice agent starts AI conversation
   ```

2. **Call Events:**
   ```
   Telnyx sends event to webhook
   → Event validated and parsed
   → Forwarded to voice agent via HTTP POST
   → Voice agent processes event
   ```

3. **Transfer Request:**
   ```
   Voice agent determines lead is qualified
   → POST /api/voice/agent/transfer
   → Backend creates conference call
   → Calls Kevin's number
   → Both parties joined to conference
   ```

## Error Handling

### WebSocket Reconnection

- Automatic reconnection with exponential backoff
- Maximum 5 reconnection attempts
- Intervals: 3s, 6s, 12s, 24s, 48s
- Manual reconnection via server restart

### API Error Responses

All API endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* additional context */ }
}
```

## Security

### Webhook Signature Validation

All Telnyx webhooks are validated using HMAC SHA256:

```javascript
const signature = req.headers['telnyx-signature'];
const timestamp = req.headers['telnyx-timestamp'];
const isValid = telnyxService.validateWebhookSignature(
  req.body,
  signature,
  timestamp
);
```

### API Key Protection

- API keys are never exposed in logs or responses
- Configuration endpoints return masked credentials
- Environment variables are required for production

## Deployment Notes

### Webhook Configuration

1. Configure your Telnyx application with webhook URL:
   ```
   https://your-domain.com/api/webhooks/telnyx
   ```

2. Ensure webhook URL is publicly accessible

3. Set webhook signing secret in Telnyx portal

### Voice Agent Service

- Voice agent service must be running on configured port (default: 3650)
- Backend will forward events even if voice agent is unavailable
- Test connectivity with `/api/voice/agent/test` endpoint

## Dependencies Added

```json
{
  "ws": "^8.18.3"  // WebSocket client for Telnyx
}
```

## Files Created/Modified

### Created:
- `/backend/.env.example` - Environment template
- `/backend/src/config/telnyx.config.js` - Telnyx configuration
- `/backend/src/websocket/telnyx-websocket.service.js` - WebSocket service
- `/backend/src/services/voice-agent.service.js` - Voice agent client
- `/backend/TELNYX_INTEGRATION.md` - This documentation

### Modified:
- `/backend/src/services/telnyx.service.js` - Enhanced with config module
- `/backend/src/controllers/voice.controller.js` - Added voice agent endpoints
- `/backend/src/controllers/webhook.controller.js` - Added event forwarding
- `/backend/src/routes/voice.routes.js` - Added new routes
- `/backend/src/server.js` - Integrated WebSocket service
- `/backend/package.json` - Added ws dependency

## Next Steps

1. **Set up voice agent service** (port 3650) with matching API endpoints
2. **Configure Telnyx webhook URL** in Telnyx portal
3. **Obtain Kevin's phone number** for transfer configuration
4. **Set up public URL** for webhook reception
5. **Test end-to-end call flow** with real phone numbers

## Support & Troubleshooting

### Common Issues

**WebSocket not connecting:**
- Check TELNYX_API_KEY is valid
- Verify network connectivity to wss://rtc.telnyx.com
- Check logs for connection errors

**Webhooks not received:**
- Verify API_BASE_URL is publicly accessible
- Check Telnyx portal webhook configuration
- Test webhook signature validation

**Voice agent not responding:**
- Verify VOICE_AGENT_URL is correct
- Test with `/api/voice/agent/test`
- Check voice agent service logs

---

**Integration Status:** ✅ Complete
**Implementation Date:** 2025-10-30
**Story Points Delivered:** 34 (T006: 13, T007: 8, T008: 13)
