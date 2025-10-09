# DEVELOPMENT STORY: DAVID RODRIGUEZ - BACKEND LEAD
**BMAD v4 Voice Agent Learning System | Agent: David Rodriguez - Backend Development Lead**

## 🎯 **BUSINESS CONTEXT**
Express.js backend foundation for Voice Agent Learning System supporting 700-1000 calls/day with real-time Socket.io communication and Graph RAG learning integration.

## 📋 **STORY OVERVIEW**
**As a** Backend Development Lead  
**I want** robust Express.js API framework with Socket.io real-time capabilities  
**So that** the voice agent system can handle concurrent calls and real-time learning updates

## 🏗️ **TECHNICAL REQUIREMENTS - EXPRESS.JS + SOCKET.IO**

### **Express.js API Foundation**
```javascript
// Main Express.js server configuration
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

class VoiceAgentServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
  }
  
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    this.app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      }
    }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }
}

// Express.js application instance
const voiceAgentApp = new VoiceAgentServer();
```

### **API Route Structure**
```javascript
// API route organization for voice agent system
const routes = {
  
  // Lead management routes
  leads: {
    'GET /api/leads': 'Get all leads with pagination and filtering',
    'GET /api/leads/:id': 'Get specific lead details',
    'POST /api/leads': 'Create new lead',
    'PUT /api/leads/:id': 'Update lead information',
    'DELETE /api/leads/:id': 'Delete lead (soft delete)',
    'GET /api/leads/:id/calls': 'Get call history for lead',
    'POST /api/leads/:id/calls': 'Create new call record'
  },
  
  // Call management routes
  calls: {
    'GET /api/calls': 'Get all calls with filtering',
    'GET /api/calls/:id': 'Get specific call details',
    'POST /api/calls': 'Create new call record',
    'PUT /api/calls/:id': 'Update call information',
    'POST /api/calls/:id/transfer': 'Initiate hot transfer to Kevin',
    'GET /api/calls/active': 'Get currently active calls',
    'POST /api/calls/:id/recording': 'Start/stop call recording'
  },
  
  // Voice agent routes
  agent: {
    'POST /api/agent/start-call': 'Start new voice agent call',
    'POST /api/agent/end-call': 'End voice agent call',
    'POST /api/agent/engagement-score': 'Update real-time engagement score',
    'POST /api/agent/phase-transition': 'Record conversation phase transition',
    'GET /api/agent/performance': 'Get agent performance metrics',
    'POST /api/agent/learning-update': 'Update learning algorithms'
  },
  
  // Learning system routes
  learning: {
    'GET /api/learning/insights': 'Get beast mode learning insights',
    'POST /api/learning/correlation': 'Add outcome correlation data',
    'GET /api/learning/patterns': 'Get successful conversation patterns',
    'POST /api/learning/feedback': 'Provide learning feedback',
    'GET /api/learning/progress': 'Get learning progression metrics'
  },
  
  // Kevin availability routes
  kevin: {
    'GET /api/kevin/availability': 'Get Kevin availability status',
    'PUT /api/kevin/availability': 'Update Kevin availability',
    'GET /api/kevin/schedule': 'Get Kevin schedule',
    'PUT /api/kevin/schedule': 'Update Kevin schedule',
    'GET /api/kevin/transfers': 'Get transfer history',
    'POST /api/kevin/transfer-outcome': 'Record transfer outcome'
  },
  
  // Analytics and reporting routes
  analytics: {
    'GET /api/analytics/dashboard': 'Get dashboard metrics',
    'GET /api/analytics/performance': 'Get performance analytics',
    'GET /api/analytics/conversion': 'Get conversion metrics',
    'GET /api/analytics/learning': 'Get learning progression analytics',
    'GET /api/analytics/export': 'Export analytics data'
  }
};
```

### **Lead Management API Implementation**
```javascript
// Lead management controller with MongoDB integration
const Lead = require('../models/Lead');
const Call = require('../models/Call');

class LeadController {
  
  // Get all leads with advanced filtering and pagination
  async getAllLeads(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        source,
        qualificationScore,
        createdAfter,
        createdBefore,
        search
      } = req.query;
      
      const filter = {};
      
      // Build filter object
      if (status) filter.status = status;
      if (source) filter.source = source;
      if (qualificationScore) {
        filter.qualificationScore = { $gte: parseInt(qualificationScore) };
      }
      if (createdAfter || createdBefore) {
        filter.createdAt = {};
        if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
        if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
      }
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: {
          path: 'lastCall',
          select: 'startTime endTime finalStatus engagementScore'
        }
      };
      
      const leads = await Lead.paginate(filter, options);
      
      res.json({
        success: true,
        data: leads.docs,
        pagination: {
          total: leads.totalDocs,
          page: leads.page,
          pages: leads.totalPages,
          limit: leads.limit,
          hasNext: leads.hasNextPage,
          hasPrev: leads.hasPrevPage
        }
      });
      
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leads'
      });
    }
  }
  
  // Create new lead with validation
  async createLead(req, res) {
    try {
      const leadData = {
        ...req.body,
        createdBy: req.user.userId,
        status: 'new',
        qualificationScore: 0
      };
      
      const lead = new Lead(leadData);
      await lead.save();
      
      // Emit socket event for real-time updates
      req.app.get('io').emit('lead:created', {
        leadId: lead._id,
        name: `${lead.firstName} ${lead.lastName}`,
        source: lead.source,
        timestamp: new Date()
      });
      
      res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
      
    } catch (error) {
      console.error('Create lead error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create lead'
      });
    }
  }
  
  // Update lead with tracking
  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user.userId,
        updatedAt: new Date()
      };
      
      const lead = await Lead.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
      
      // Emit socket event for real-time updates
      req.app.get('io').emit('lead:updated', {
        leadId: lead._id,
        changes: updateData,
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        data: lead,
        message: 'Lead updated successfully'
      });
      
    } catch (error) {
      console.error('Update lead error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update lead'
      });
    }
  }
}
```

### **Call Management API Implementation**
```javascript
// Call management with Telnyx integration
const Telnyx = require('telnyx');
const Conversation = require('../models/Conversation');

class CallController {
  
  constructor() {
    this.telnyx = Telnyx(process.env.TELNYX_API_KEY);
  }
  
  // Start new voice agent call
  async startCall(req, res) {
    try {
      const { leadId, phoneNumber } = req.body;
      
      // Get lead information
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
      
      // Check Kevin availability
      const kevinAvailable = await this.checkKevinAvailability();
      
      // Create call record
      const callData = {
        leadId: lead._id,
        phoneNumber: lead.phone,
        startTime: new Date(),
        kevinAvailable,
        status: 'initiated',
        phases: {
          current: 1,
          completed: 0,
          progression: []
        },
        engagement: {
          score: 0,
          indicators: []
        }
      };
      
      const call = new Call(callData);
      await call.save();
      
      // Initiate Telnyx call
      const telnyxCall = await this.telnyx.calls.create({
        connection_id: process.env.TELNYX_CONNECTION_ID,
        to: phoneNumber,
        from: process.env.TELNYX_PHONE_NUMBER,
        webhook_url: `${process.env.API_BASE_URL}/api/webhooks/telnyx`,
        webhook_url_method: 'POST',
        custom_headers: [{
          name: 'X-Call-ID',
          value: call._id.toString()
        }]
      });
      
      // Update call with Telnyx information
      call.telnyxCallId = telnyxCall.data.id;
      call.telnyxCallControlId = telnyxCall.data.call_control_id;
      await call.save();
      
      // Emit socket event for real-time monitoring
      req.app.get('io').emit('call:started', {
        callId: call._id,
        leadId: lead._id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        phoneNumber,
        kevinAvailable,
        timestamp: new Date()
      });
      
      res.status(201).json({
        success: true,
        data: {
          callId: call._id,
          telnyxCallId: telnyxCall.data.id,
          status: 'initiated',
          kevinAvailable
        },
        message: 'Call initiated successfully'
      });
      
    } catch (error) {
      console.error('Start call error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start call'
      });
    }
  }
  
  // Update real-time engagement score
  async updateEngagementScore(req, res) {
    try {
      const { callId, engagementScore, indicators, phase } = req.body;
      
      const call = await Call.findById(callId);
      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      // Update engagement data
      call.engagement.score = engagementScore;
      call.engagement.indicators.push({
        phase,
        score: engagementScore,
        indicators,
        timestamp: new Date()
      });
      
      await call.save();
      
      // Emit real-time update
      req.app.get('io').emit('call:engagement-update', {
        callId: call._id,
        engagementScore,
        phase,
        indicators,
        timestamp: new Date()
      });
      
      // Check for hot transfer opportunity
      if (engagementScore >= 85 && call.kevinAvailable && !call.transferAttempted) {
        await this.suggestHotTransfer(call, req.app.get('io'));
      }
      
      res.json({
        success: true,
        data: {
          callId: call._id,
          engagementScore,
          suggestTransfer: engagementScore >= 85 && call.kevinAvailable
        }
      });
      
    } catch (error) {
      console.error('Update engagement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update engagement score'
      });
    }
  }
  
  // Initiate hot transfer to Kevin
  async initiateHotTransfer(req, res) {
    try {
      const { callId } = req.params;
      
      const call = await Call.findById(callId);
      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      // Check Kevin availability again
      const kevinAvailable = await this.checkKevinAvailability();
      if (!kevinAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Kevin is not available for transfer'
        });
      }
      
      // Create conference call with Kevin
      const transferResult = await this.createConferenceCall(call);
      
      // Update call record
      call.transferAttempted = true;
      call.transferTime = new Date();
      call.transferSuccess = transferResult.success;
      call.status = transferResult.success ? 'transferred' : 'transfer_failed';
      
      await call.save();
      
      // Emit transfer event
      req.app.get('io').emit('call:transfer', {
        callId: call._id,
        success: transferResult.success,
        kevinJoined: transferResult.success,
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        data: {
          callId: call._id,
          transferSuccess: transferResult.success,
          message: transferResult.success ? 
            'Transfer successful - Kevin joined the call' : 
            'Transfer failed - continuing with agent'
        }
      });
      
    } catch (error) {
      console.error('Hot transfer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate hot transfer'
      });
    }
  }
  
  // Helper methods
  async checkKevinAvailability() {
    // Implementation to check Kevin's availability
    // This would integrate with calendar or availability system
    return true; // Simplified for now
  }
  
  async createConferenceCall(call) {
    try {
      // Create conference bridge with Telnyx
      const conference = await this.telnyx.conferences.create({
        name: `transfer-${call._id}`,
        call_control_id: call.telnyxCallControlId
      });
      
      // Dial Kevin and add to conference
      const kevinCall = await this.telnyx.calls.create({
        connection_id: process.env.TELNYX_CONNECTION_ID,
        to: process.env.KEVIN_PHONE_NUMBER,
        from: process.env.TELNYX_PHONE_NUMBER
      });
      
      // Add Kevin to conference
      await this.telnyx.calls.join_conference(kevinCall.data.call_control_id, {
        conference_name: conference.data.name
      });
      
      return { success: true, conferenceId: conference.data.id };
      
    } catch (error) {
      console.error('Conference creation error:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### **Socket.io Real-time Communication**
```javascript
// Socket.io event handlers for real-time updates
class SocketHandler {
  
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Join rooms based on user role
      socket.on('join-room', (data) => {
        const { room, userId, role } = data;
        socket.join(room);
        socket.userId = userId;
        socket.role = role;
        
        console.log(`User ${userId} joined room: ${room}`);
        
        // Send current system status
        this.sendSystemStatus(socket);
      });
      
      // Handle call monitoring requests
      socket.on('monitor-calls', () => {
        if (socket.role === 'admin' || socket.role === 'operator') {
          socket.join('call-monitoring');
          this.sendActiveCallsUpdate(socket);
        }
      });
      
      // Handle Kevin availability updates
      socket.on('kevin-availability-update', (data) => {
        if (socket.role === 'kevin' || socket.role === 'admin') {
          this.updateKevinAvailability(data);
          this.io.emit('kevin-availability-changed', data);
        }
      });
      
      // Handle real-time engagement scoring
      socket.on('engagement-update', (data) => {
        const { callId, score, phase, indicators } = data;
        
        // Broadcast to call monitoring room
        this.io.to('call-monitoring').emit('call:engagement-update', {
          callId,
          engagementScore: score,
          phase,
          indicators,
          timestamp: new Date()
        });
        
        // Check for transfer opportunity
        if (score >= 85) {
          this.io.to('call-monitoring').emit('transfer-opportunity', {
            callId,
            engagementScore: score,
            suggestTransfer: true
          });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  // Send system status to connected client
  async sendSystemStatus(socket) {
    try {
      const status = {
        activeCalls: await this.getActiveCallsCount(),
        kevinAvailable: await this.getKevinAvailability(),
        systemLoad: await this.getSystemLoad(),
        learningProgress: await this.getLearningProgress()
      };
      
      socket.emit('system-status', status);
    } catch (error) {
      console.error('Send system status error:', error);
    }
  }
  
  // Broadcast active calls update
  async sendActiveCallsUpdate(socket) {
    try {
      const activeCalls = await Call.find({ 
        status: { $in: ['active', 'in-progress'] } 
      })
      .populate('leadId', 'firstName lastName phone')
      .sort({ startTime: -1 });
      
      socket.emit('active-calls-update', activeCalls);
    } catch (error) {
      console.error('Send active calls error:', error);
    }
  }
}
```

## 🎨 **SHADCN/UI BACKEND INTEGRATION**

### **API Response Components**
```tsx
// Backend API integration with shadcn/ui components
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function CallMonitoringDashboard() {
  const [activeCalls, setActiveCalls] = useState([]);
  const [systemStatus, setSystemStatus] = useState({});
  const { toast } = useToast();
  
  useEffect(() => {
    // Connect to Socket.io for real-time updates
    const socket = io(process.env.REACT_APP_API_URL);
    
    socket.emit('join-room', { 
      room: 'call-monitoring', 
      userId: user.id, 
      role: user.role 
    });
    
    socket.on('system-status', (status) => {
      setSystemStatus(status);
    });
    
    socket.on('call:started', (callData) => {
      setActiveCalls(prev => [callData, ...prev]);
      toast({
        title: "New Call Started",
        description: `Call with ${callData.leadName} initiated`,
      });
    });
    
    socket.on('call:engagement-update', (data) => {
      setActiveCalls(prev => 
        prev.map(call => 
          call.callId === data.callId 
            ? { ...call, engagementScore: data.engagementScore }
            : call
        )
      );
    });
    
    return () => socket.disconnect();
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-magnificent-primary">
              {systemStatus.activeCalls}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kevin Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={systemStatus.kevinAvailable ? "default" : "secondary"}>
              {systemStatus.kevinAvailable ? "Available" : "Busy"}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeCalls.map((call) => (
              <div key={call.callId} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{call.leadName}</p>
                  <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    Score: {call.engagementScore || 0}
                  </Badge>
                  {call.engagementScore >= 85 && call.kevinAvailable && (
                    <Button size="sm" className="magnificent-gradient">
                      Transfer to Kevin
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🧪 **TESTING STRATEGY**

### **API Testing Framework**
- [ ] Unit testing for all controllers and services
- [ ] Integration testing for database operations
- [ ] Socket.io real-time communication testing
- [ ] API endpoint security testing
- [ ] Performance testing for concurrent requests
- [ ] Telnyx integration testing with mock calls

### **Load Testing**
- [ ] 1000 concurrent API requests simulation
- [ ] Socket.io connection stress testing
- [ ] Database query performance under load
- [ ] Memory usage optimization testing

## 🏁 **DEFINITION OF DONE**

✅ Express.js API framework operational with all endpoints  
✅ Socket.io real-time communication system functional  
✅ Lead management CRUD operations implemented  
✅ Call management with Telnyx integration operational  
✅ Hot transfer workflow implemented and tested  
✅ Real-time engagement scoring system active  
✅ shadcn/ui frontend integration components ready  
✅ Comprehensive testing completed with 95%+ coverage  

---

**Agent:** David Rodriguez - Backend Development Lead  
**Dependencies:** Alex Martinez (DevOps), Sarah Chen (Database), Marcus Thompson (Security)  
**Estimated Effort:** 4-5 sprints  
**Priority:** CRITICAL (API foundation for all client interactions)  
**Technical Focus:** Express.js, Socket.io, MongoDB integration, Telnyx API

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Express.js Backend Framework  
**Story:** Backend Development - MERN stack API with real-time Socket.io communication