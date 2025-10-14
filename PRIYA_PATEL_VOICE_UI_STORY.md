# DEVELOPMENT STORY: PRIYA PATEL - VOICE AGENT UI
**BMAD v4 Voice Agent Learning System | Agent: Priya Patel - Voice Agent Interface Specialist**

## 🎯 **BUSINESS CONTEXT**
Voice agent control interface for real-time call monitoring, engagement scoring, and hot transfer management during live conversations.

## 📋 **STORY OVERVIEW**
**As a** Voice Agent Interface Specialist  
**I want** real-time voice agent control interface with live engagement monitoring  
**So that** operators can manage calls and transfers effectively

## 🏗️ **TECHNICAL REQUIREMENTS - VOICE AGENT UI**

### **Real-time Call Control Interface**
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Users, Volume2, Mic } from 'lucide-react';
import io from 'socket.io-client';

export function VoiceAgentControlPanel() {
  const [activeCalls, setActiveCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [kevinAvailable, setKevinAvailable] = useState(false);
  
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    
    socket.on('call:started', (callData) => {
      setActiveCalls(prev => [...prev, callData]);
    });
    
    socket.on('call:engagement-update', (data) => {
      setActiveCalls(prev => 
        prev.map(call => 
          call.callId === data.callId 
            ? { ...call, engagementScore: data.engagementScore, phase: data.phase }
            : call
        )
      );
    });
    
    socket.on('kevin-availability-changed', (status) => {
      setKevinAvailable(status.available);
    });
    
    return () => socket.disconnect();
  }, []);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Calls List */}
      <div className="lg:col-span-2">
        <Card className="magnificent-gradient-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Voice Agent Calls</span>
              <Badge className={kevinAvailable ? "bg-green-500" : "bg-red-500"}>
                Kevin {kevinAvailable ? "Available" : "Busy"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCalls.map((call) => (
                <CallCard 
                  key={call.callId} 
                  call={call} 
                  selected={selectedCall?.callId === call.callId}
                  onSelect={() => setSelectedCall(call)}
                  kevinAvailable={kevinAvailable}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Call Detail Panel */}
      <div>
        {selectedCall ? (
          <CallDetailPanel call={selectedCall} kevinAvailable={kevinAvailable} />
        ) : (
          <Card className="magnificent-gradient-border">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Select a call to view details and controls
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CallCard({ call, selected, onSelect, kevinAvailable }) {
  const getEngagementColor = (score) => {
    if (score >= 85) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };
  
  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        selected ? 'magnificent-gradient-border bg-card/50' : 'border-border'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">{call.leadName}</span>
          </div>
          <Badge variant="outline">Phase {call.phase || 1}</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {formatCallDuration(call.duration)}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Phone:</span>
          <p>{call.phoneNumber}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Engagement:</span>
          <div className="flex items-center space-x-2">
            <Progress value={call.engagementScore || 0} className="flex-1 h-2" />
            <span className={`font-medium ${getEngagementColor(call.engagementScore || 0)}`}>
              {call.engagementScore || 0}%
            </span>
          </div>
        </div>
      </div>
      
      {call.engagementScore >= 85 && kevinAvailable && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <p className="text-sm text-yellow-600 font-medium">
            🔥 Hot Transfer Opportunity Available!
          </p>
        </div>
      )}
    </div>
  );
}

function CallDetailPanel({ call, kevinAvailable }) {
  const [transfering, setTransfering] = useState(false);
  
  const handleTransfer = async () => {
    setTransfering(true);
    try {
      const response = await fetch(`/api/calls/${call.callId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast({ title: "Transfer initiated", description: "Kevin is being added to the call" });
      }
    } catch (error) {
      toast({ title: "Transfer failed", description: error.message, variant: "destructive" });
    } finally {
      setTransfering(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="text-lg">{call.leadName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Call Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge className="ml-2 bg-green-500">Active</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="ml-2 font-medium">{formatCallDuration(call.duration)}</span>
            </div>
          </div>
          
          {/* Engagement Meter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Engagement Score</span>
              <span className="text-lg font-bold magnificent-text-gradient">
                {call.engagementScore || 0}%
              </span>
            </div>
            <Progress value={call.engagementScore || 0} className="h-3 magnificent-gradient" />
          </div>
          
          {/* Conversation Phase */}
          <div>
            <span className="text-sm font-medium">Conversation Phase</span>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline">Phase {call.phase || 1}/12</Badge>
              <span className="text-sm text-muted-foreground">
                {getPhaseDescription(call.phase || 1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Call Controls */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="text-lg">Call Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="magnificent-gradient w-full"
            onClick={handleTransfer}
            disabled={!kevinAvailable || call.engagementScore < 85 || transfering}
          >
            <Users className="h-4 w-4 mr-2" />
            {transfering ? 'Transferring...' : 'Transfer to Kevin'}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <Mic className="h-4 w-4 mr-2" />
              Mute
            </Button>
            <Button variant="outline" size="sm">
              <Volume2 className="h-4 w-4 mr-2" />
              Listen
            </Button>
          </div>
          
          <Button variant="destructive" className="w-full">
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        </CardContent>
      </Card>
      
      {/* Lead Information */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="text-lg">Lead Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Phone:</span>
            <span className="ml-2 font-medium">{call.phoneNumber}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Source:</span>
            <span className="ml-2 font-medium">{call.source || 'Facebook'}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Previous Calls:</span>
            <span className="ml-2 font-medium">{call.previousCalls || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🏁 **DEFINITION OF DONE**

✅ Real-time voice agent control interface operational  
✅ Live engagement scoring and monitoring  
✅ Hot transfer workflow with Kevin integration  
✅ Call phase tracking and visualization  
✅ Socket.io real-time updates functional  
✅ Magnificent Worldwide branding complete  
✅ Responsive design for operator efficiency  

---

**Agent:** Priya Patel - Voice Agent Interface Specialist  
**Dependencies:** Michael Park (Frontend), David Rodriguez (Backend), Jennifer Kim (Telnyx)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Operator interface essential)  
**Technical Focus:** Real-time UI, call controls, engagement monitoring

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Voice Agent Control Interface  
**Story:** Voice Agent UI - Real-time call monitoring and control with hot transfer capabilities