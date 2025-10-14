# DEVELOPMENT STORY: EMMA JOHNSON - ANALYTICS DASHBOARD
**BMAD v4 Voice Agent Learning System | Agent: Emma Johnson - Dashboard Specialist**

## 🎯 **BUSINESS CONTEXT**
Real-time analytics dashboard for Voice Agent Learning System providing comprehensive insights into call performance, learning progress, and business metrics.

## 📋 **STORY OVERVIEW**
**As a** Dashboard Specialist  
**I want** comprehensive real-time analytics dashboard with Magnificent Worldwide branding  
**So that** users can monitor voice agent performance and learning progression

## 🏗️ **TECHNICAL REQUIREMENTS - ANALYTICS DASHBOARD**

### **Real-time Dashboard Components**
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Phone, Users, Target, Brain } from 'lucide-react';
import io from 'socket.io-client';

export function RealTimeAnalyticsDashboard() {
  const [metrics, setMetrics] = useState({
    activeCalls: 0,
    dailyTotal: 0,
    conversionRate: 0,
    beastModeProgress: 0,
    kevinAvailable: false
  });
  
  const [callHistory, setCallHistory] = useState([]);
  const [learningMetrics, setLearningMetrics] = useState([]);
  
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    
    socket.on('dashboard:metrics-update', (newMetrics) => {
      setMetrics(newMetrics);
    });
    
    socket.on('dashboard:call-history', (history) => {
      setCallHistory(history);
    });
    
    socket.on('dashboard:learning-update', (learning) => {
      setLearningMetrics(learning);
    });
    
    // Initial data fetch
    fetchDashboardData();
    
    return () => socket.disconnect();
  }, []);
  
  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Active Calls"
          value={metrics.activeCalls}
          icon={Phone}
          trend={+2}
          className="magnificent-gradient-border"
        />
        
        <MetricCard
          title="Daily Total"
          value={metrics.dailyTotal}
          icon={TrendingUp}
          trend={+15}
          className="magnificent-gradient-border"
        />
        
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          icon={Target}
          trend={+3.2}
          className="magnificent-gradient-border"
        />
        
        <MetricCard
          title="Beast Mode"
          value={`${metrics.beastModeProgress}%`}
          icon={Brain}
          trend={+1.5}
          className="magnificent-gradient-border"
        />
        
        <Card className="magnificent-gradient-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Kevin Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={metrics.kevinAvailable ? "bg-green-500" : "bg-red-500"}>
              {metrics.kevinAvailable ? "Available" : "Busy"}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      {/* Call Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="magnificent-gradient-border">
          <CardHeader>
            <CardTitle>Call Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callHistory}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(var(--magnificent-primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--magnificent-primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="transfers" 
                  stroke="hsl(var(--magnificent-secondary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--magnificent-secondary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="magnificent-gradient-border">
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={learningMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar 
                  dataKey="progress" 
                  className="magnificent-gradient" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Beast Mode Progression */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-magnificent-primary" />
            <span>Beast Mode Learning Progression</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BeastModeProgressDisplay progress={metrics.beastModeProgress} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold magnificent-text-gradient">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {' '}from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BeastModeProgressDisplay({ progress }) {
  const stages = [
    { name: 'Beginner', min: 0, max: 25, color: 'bg-red-500' },
    { name: 'Learning', min: 25, max: 50, color: 'bg-yellow-500' },
    { name: 'Improving', min: 50, max: 75, color: 'bg-blue-500' },
    { name: 'Beast Mode', min: 75, max: 100, color: 'magnificent-gradient' }
  ];
  
  const currentStage = stages.find(stage => progress >= stage.min && progress < stage.max) || stages[3];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Current Stage: {currentStage.name}</span>
        <span className="text-2xl font-bold magnificent-text-gradient">{progress}%</span>
      </div>
      
      <Progress value={progress} className="h-3 magnificent-gradient" />
      
      <div className="grid grid-cols-4 gap-2 text-xs">
        {stages.map((stage, index) => (
          <div key={index} className="text-center">
            <div className={`h-2 rounded ${progress >= stage.min ? stage.color : 'bg-muted'}`} />
            <span className="text-muted-foreground">{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🏁 **DEFINITION OF DONE**

✅ Real-time analytics dashboard operational  
✅ KPI metrics and visualization components ready  
✅ Beast mode progression tracking visual  
✅ Call performance charts implemented  
✅ Socket.io real-time updates functional  
✅ Magnificent Worldwide branding throughout  
✅ Responsive design for all screen sizes  

---

**Agent:** Emma Johnson - Dashboard Specialist  
**Dependencies:** Michael Park (Frontend), David Rodriguez (Backend)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Real-time monitoring essential)  
**Technical Focus:** React dashboards, Chart.js/Recharts, real-time updates

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - Real-time Analytics Dashboard  
**Story:** Analytics Dashboard - Comprehensive real-time monitoring with Beast Mode tracking