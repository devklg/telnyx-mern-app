# DEVELOPMENT STORY: JENNIFER KIM - TELNYX INTEGRATION SPECIALIST
**BMAD v4 Voice Agent Learning System | Agent: Jennifer Kim - Telnyx Lead**

## 🎯 **BUSINESS CONTEXT**
Telnyx voice integration for Voice Agent Learning System supporting 700-1000 calls/day with hot transfer capabilities and comprehensive call recording.

## 📋 **STORY OVERVIEW**
**As a** Telnyx Integration Specialist  
**I want** complete Telnyx telephony integration with voice agent capabilities  
**So that** the system can make calls, handle transfers, and record conversations

## 🏗️ **TECHNICAL REQUIREMENTS - TELNYX INTEGRATION**

### **Telnyx SDK Integration**
```javascript
// Telnyx SDK configuration and call management
const Telnyx = require('telnyx');

class TelnyxIntegration {
  constructor() {
    this.telnyx = Telnyx(process.env.TELNYX_API_KEY);
    this.connectionId = process.env.TELNYX_CONNECTION_ID;
    this.phoneNumber = process.env.TELNYX_PHONE_NUMBER;
    this.webhookUrl = `${process.env.API_BASE_URL}/api/webhooks/telnyx`;
  }
  
  // Make outbound call to lead
  async makeCall(leadPhone, callId) {
    try {
      const call = await this.telnyx.calls.create({
        connection_id: this.connectionId,
        to: leadPhone,
        from: this.phoneNumber,
        webhook_url: this.webhookUrl,
        webhook_url_method: 'POST',
        timeout_secs: 30,
        custom_headers: [{
          name: 'X-Call-ID',
          value: callId
        }],
        answering_machine_detection: 'premium'
      });
      
      return {
        success: true,
        telnyxCallId: call.data.id,
        callControlId: call.data.call_control_id,
        status: call.data.call_state
      };
      
    } catch (error) {
      console.error('Telnyx call creation error:', error);
      throw error;
    }
  }
  
  // Start call recording
  async startRecording(callControlId) {
    try {
      const recording = await this.telnyx.calls.record(callControlId, {
        format: 'mp3',
        channels: 'dual',
        play_beep: false
      });
      
      return {
        success: true,
        recordingId: recording.data.recording_id
      };
    } catch (error) {
      console.error('Recording start error:', error);
      throw error;
    }
  }
  
  // Create conference for hot transfer
  async createConference(callControlId, kevinPhone) {
    try {
      const conferenceName = `transfer-${Date.now()}`;
      
      // Join current call to conference
      await this.telnyx.calls.join_conference(callControlId, {
        conference_name: conferenceName
      });
      
      // Call Kevin and add to conference
      const kevinCall = await this.telnyx.calls.create({
        connection_id: this.connectionId,
        to: kevinPhone,
        from: this.phoneNumber,
        webhook_url: this.webhookUrl
      });
      
      // Join Kevin to conference once answered
      setTimeout(async () => {
        await this.telnyx.calls.join_conference(kevinCall.data.call_control_id, {
          conference_name: conferenceName
        });
      }, 2000);
      
      return {
        success: true,
        conferenceName,
        kevinCallId: kevinCall.data.id
      };
      
    } catch (error) {
      console.error('Conference creation error:', error);
      throw error;
    }
  }
}
```

### **Webhook Handler for Call Events**
```javascript
// Express.js webhook handler for Telnyx events
const TelnyxWebhookHandler = {
  
  async handleWebhook(req, res) {
    try {
      const event = req.body.data;
      const eventType = event.event_type;
      
      console.log(`Telnyx webhook received: ${eventType}`);
      
      switch (eventType) {
        case 'call.initiated':
          await this.handleCallInitiated(event);
          break;
          
        case 'call.answered':
          await this.handleCallAnswered(event);
          break;
          
        case 'call.hangup':
          await this.handleCallHangup(event);
          break;
          
        case 'call.recording.saved':
          await this.handleRecordingSaved(event);
          break;
          
        case 'call.machine.detection.ended':
          await this.handleMachineDetection(event);
          break;
          
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
      
      res.status(200).json({ received: true });
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
  
  async handleCallAnswered(event) {
    const callId = event.payload.custom_headers?.['X-Call-ID'];
    if (!callId) return;
    
    // Update call status in database
    await Call.findByIdAndUpdate(callId, {
      status: 'connected',
      connectedAt: new Date(),
      telnyxStatus: event.payload.call_state
    });
    
    // Start recording
    const telnyx = new TelnyxIntegration();
    await telnyx.startRecording(event.payload.call_control_id);
    
    // Emit socket event for real-time updates
    io.emit('call:connected', {
      callId,
      timestamp: new Date()
    });
  },
  
  async handleRecordingSaved(event) {
    const recording = event.payload;
    
    // Save recording URL to database
    await Call.findOneAndUpdate(
      { telnyxCallId: recording.call_leg_id },
      {
        recordingUrl: recording.recording_urls.mp3,
        recordingDuration: recording.duration_millis,
        recordingId: recording.recording_id
      }
    );
  }
};
```

## 🎨 **SHADCN/UI TELNYX INTEGRATION**

### **Call Control Dashboard**
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, PhoneOff, Users } from "lucide-react"

export function TelnyxCallControls({ callId, status }) {
  const handleTransfer = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast({ title: "Transfer initiated", description: "Kevin is being added to the call" });
      }
    } catch (error) {
      toast({ title: "Transfer failed", description: error.message, variant: "destructive" });
    }
  };
  
  return (
    <Card className="magnificent-gradient-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="h-4 w-4" />
          <span>Call Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
            {status}
          </Badge>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleTransfer}
            className="magnificent-gradient flex-1"
            disabled={status !== 'connected'}
          >
            <Users className="h-4 w-4 mr-2" />
            Transfer to Kevin
          </Button>
          
          <Button 
            variant="destructive"
            onClick={() => handleHangup(callId)}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🧪 **TESTING STRATEGY**

### **Telnyx Integration Testing**
- [ ] Outbound call creation and management
- [ ] Call recording functionality
- [ ] Hot transfer and conference capabilities
- [ ] Webhook event handling
- [ ] Error handling and retry logic

## 🏁 **DEFINITION OF DONE**

✅ Complete Telnyx SDK integration operational  
✅ Outbound calling system functional  
✅ Call recording implemented and tested  
✅ Hot transfer workflow operational  
✅ Webhook event handling comprehensive  
✅ shadcn/ui call control components ready  
✅ Error handling and monitoring implemented  

---

**Agent:** Jennifer Kim - Telnyx Integration Specialist  
**Dependencies:** David Rodriguez (Backend API)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Core telephony functionality)  
**Technical Focus:** Telnyx SDK, call management, recording, conferencing

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Telnyx Telephony Integration  
**Story:** Telnyx Integration - Complete telephony solution with hot transfers