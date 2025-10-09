# DEVELOPMENT STORY: JAMES TAYLOR - CRM USER INTERFACE
**BMAD v4 Voice Agent Learning System | Agent: James Taylor - CRM UI Specialist**

## 🎯 **BUSINESS CONTEXT**
CRM user interface for Voice Agent Learning System providing comprehensive lead management, relationship tracking, and Kevin workflow integration.

## 📋 **STORY OVERVIEW**
**As a** CRM UI Specialist  
**I want** comprehensive lead management interface with shadcn/ui components  
**So that** users can effectively manage leads through the qualification process

## 🏗️ **TECHNICAL REQUIREMENTS - CRM INTERFACE**

### **Lead Management Components**
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, Calendar, User, TrendingUp } from 'lucide-react';

export function LeadManagementDashboard() {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    qualificationScore: 'all'
  });
  const [selectedLead, setSelectedLead] = useState(null);
  
  return (
    <div className="space-y-6">
      {/* Lead Filters */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle>Lead Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="hot_transfer">Hot Transfer</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.source} onValueChange={(value) => setFilters({...filters, source: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.qualificationScore} onValueChange={(value) => setFilters({...filters, qualificationScore: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="high">High (80+)</SelectItem>
                <SelectItem value="medium">Medium (50-79)</SelectItem>
                <SelectItem value="low">Low (0-49)</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="magnificent-gradient">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Lead Table */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lead Management</span>
            <Button className="magnificent-gradient">
              Add New Lead
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <Mail className="h-3 w-3" />
                        <span>{lead.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Score:</span>
                        <span className="font-medium">{lead.qualificationScore}/100</span>
                      </div>
                      <Progress value={lead.qualificationScore} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(lead.lastContacted)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                        View
                      </Button>
                      <Button size="sm" className="magnificent-gradient">
                        Call
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

function LeadDetailModal({ lead, onClose }) {
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="magnificent-text-gradient">
            {lead.firstName} {lead.lastName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-medium">{lead.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{lead.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Source</label>
                  <p className="font-medium">{lead.source}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Badge className={getStatusBadgeClass(lead.status)}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Qualification Score</label>
                <div className="mt-2">
                  <Progress value={lead.qualificationScore} className="h-3" />
                  <p className="text-sm mt-1">{lead.qualificationScore}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <CallHistoryList leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="magnificent-gradient">
            <Phone className="h-4 w-4 mr-2" />
            Call Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CallHistoryList({ leadId }) {
  const [callHistory, setCallHistory] = useState([]);
  
  useEffect(() => {
    // Fetch call history for lead
    fetchCallHistory(leadId);
  }, [leadId]);
  
  return (
    <div className="space-y-3">
      {callHistory.map((call) => (
        <div key={call.id} className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{formatDate(call.startTime)}</span>
            <Badge variant={call.outcome === 'hot_transfer' ? 'default' : 'secondary'}>
              {call.outcome}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Duration: {call.duration}s</div>
            <div>Score: {call.engagementScore}/100</div>
          </div>
          {call.notes && (
            <p className="text-sm mt-2">{call.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 🏁 **DEFINITION OF DONE**

✅ Complete CRM interface with lead management  
✅ Lead filtering and search functionality  
✅ Lead detail views and editing forms  
✅ Call history and relationship tracking  
✅ Qualification scoring visualization  
✅ Magnificent Worldwide branding throughout  
✅ Responsive design for all devices  

---

**Agent:** James Taylor - CRM UI Specialist  
**Dependencies:** Michael Park (Frontend), Robert Wilson (CRM Backend)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Lead management interface essential)  
**Technical Focus:** React forms, data tables, modal dialogs, CRM workflows

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - CRM User Interface  
**Story:** CRM Interface - Comprehensive lead management with shadcn/ui components