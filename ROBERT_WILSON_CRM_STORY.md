# DEVELOPMENT STORY: ROBERT WILSON - CRM BACKEND SPECIALIST
**BMAD v4 Voice Agent Learning System | Agent: Robert Wilson - CRM Lead**

## 🎯 **BUSINESS CONTEXT**
CRM backend system for Voice Agent Learning System managing lead qualification, relationship tracking, and Kevin workflow integration.

## 📋 **STORY OVERVIEW**
**As a** CRM Backend Specialist  
**I want** comprehensive lead management and relationship tracking system  
**So that** the voice agent can effectively manage leads through the qualification process

## 🏗️ **TECHNICAL REQUIREMENTS - CRM BACKEND**

### **Lead Lifecycle Management**
```javascript
// Lead progression through qualification stages
const leadLifecycle = {
  stages: [
    'new',
    'contacted', 
    'qualified',
    'hot_transfer',
    'video_sent',
    'zoom_scheduled',
    'closed',
    'disqualified'
  ],
  
  async progressLead(leadId, newStage, metadata = {}) {
    const lead = await Lead.findById(leadId);
    const previousStage = lead.status;
    
    // Validate stage transition
    if (!this.isValidTransition(previousStage, newStage)) {
      throw new Error(`Invalid transition from ${previousStage} to ${newStage}`);
    }
    
    // Update lead with stage progression
    const updatedLead = await Lead.findByIdAndUpdate(leadId, {
      status: newStage,
      stageHistory: {
        ...lead.stageHistory,
        [newStage]: {
          timestamp: new Date(),
          metadata,
          previousStage
        }
      },
      lastModified: new Date()
    }, { new: true });
    
    // Trigger stage-specific actions
    await this.handleStageActions(updatedLead, newStage, metadata);
    
    return updatedLead;
  }
};
```

### **Lead Scoring & Qualification**
```javascript
// Advanced lead scoring algorithm
class LeadScoringEngine {
  
  calculateQualificationScore(lead, callData = null) {
    let score = 0;
    
    // Demographic scoring (0-25 points)
    score += this.scoreDemographics(lead);
    
    // Engagement scoring (0-35 points)
    if (callData) {
      score += this.scoreEngagement(callData);
    }
    
    // Behavioral scoring (0-25 points)
    score += this.scoreBehavior(lead);
    
    // Timing/availability scoring (0-15 points)
    score += this.scoreAvailability(lead);
    
    return Math.min(100, Math.max(0, score));
  }
  
  scoreDemographics(lead) {
    let score = 0;
    
    // Income range scoring
    const incomeRanges = {
      'under_25k': 5,
      '25k_50k': 15,
      '50k_75k': 25,
      '75k_plus': 20
    };
    score += incomeRanges[lead.currentIncomeRange] || 0;
    
    // Experience level
    const experienceScores = {
      'beginner': 25,
      'some_experience': 20,
      'experienced': 15,
      'expert': 10
    };
    score += experienceScores[lead.experienceLevel] || 0;
    
    return score;
  }
  
  scoreEngagement(callData) {
    let score = 0;
    
    // Conversation engagement
    score += Math.min(20, callData.engagementScore * 0.2);
    
    // Question asking behavior
    score += Math.min(10, callData.questionsAsked * 2);
    
    // Objection handling
    if (callData.objectionsHandled && callData.objectionsHandled.length > 0) {
      score += 5;
    }
    
    return score;
  }
}
```

## 🎨 **SHADCN/UI CRM COMPONENTS**

### **Lead Management Dashboard**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function LeadCard({ lead }) {
  const getStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-500',
      'contacted': 'bg-yellow-500', 
      'qualified': 'bg-green-500',
      'hot_transfer': 'bg-orange-500',
      'closed': 'bg-emerald-500',
      'disqualified': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };
  
  return (
    <Card className="magnificent-gradient-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {lead.firstName} {lead.lastName}
          </CardTitle>
          <Badge className={getStatusColor(lead.status)}>
            {lead.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <p className="font-medium">{lead.phone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>
            <p className="font-medium">{lead.email}</p>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Qualification Score</span>
            <span className="text-sm font-medium">{lead.qualificationScore}/100</span>
          </div>
          <Progress value={lead.qualificationScore} className="h-2" />
        </div>
        
        <div className="flex space-x-2">
          <Button size="sm" className="magnificent-gradient flex-1">
            Call Lead
          </Button>
          <Button size="sm" variant="outline">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🏁 **DEFINITION OF DONE**

✅ Complete CRM backend system operational  
✅ Lead lifecycle management implemented  
✅ Qualification scoring system functional  
✅ Relationship tracking comprehensive  
✅ Kevin workflow integration complete  
✅ shadcn/ui CRM components ready  
✅ Performance optimized for 1000+ leads  

---

**Agent:** Robert Wilson - CRM Backend Specialist  
**Dependencies:** Sarah Chen (Database), David Rodriguez (Backend)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Lead management core functionality)  
**Technical Focus:** Lead lifecycle, qualification scoring, relationship tracking

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - CRM Backend Management  
**Story:** CRM Backend - Comprehensive lead management and qualification system