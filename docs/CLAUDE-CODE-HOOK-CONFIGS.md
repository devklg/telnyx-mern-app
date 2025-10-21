# 🎣 Claude Code Hook Configurations
## BMAD V4 - Real-Time Agent Monitoring System

**Created:** 2025-10-21  
**Purpose:** Configure hooks for all 17 Claude Code agents to enable real-time monitoring

---

## 📋 HOOK TYPES OVERVIEW

Claude Code supports 3 types of hooks:

1. **PreToolUse** - Fires BEFORE Claude executes any tool
2. **PostToolUse** - Fires AFTER tool execution completes  
3. **SessionEnd** - Fires when Claude Code session ends

---

## 🔧 GLOBAL HOOK CONFIGURATION

### **Base Webhook URLs:**
```json
{
  "baseURL": "http://localhost:3551/api/hooks",
  "endpoints": {
    "preToolUse": "/pre-tool-use",
    "postToolUse": "/post-tool-use",
    "sessionEnd": "/session-end",
    "userPromptSubmit": "/user-prompt-submit"
  }
}
```

### **Authentication:**
```json
{
  "authType": "bearer",
  "token": "${DASHBOARD_WEBHOOK_SECRET}",
  "header": "Authorization: Bearer ${token}"
}
```

### **Retry Policy:**
```json
{
  "maxRetries": 3,
  "retryDelayMs": 1000,
  "backoffMultiplier": 2,
  "timeoutMs": 5000
}
```

---

## 🎭 AGENT-SPECIFIC CONFIGURATIONS

See full document for detailed configurations for all 17 agents including:
- Alex Martinez (DevOps Lead)
- Sarah Chen (Database Architect)
- David Rodriguez (Backend Lead)
- Marcus Thompson (Security Specialist)
- Jennifer Kim (Telnyx Integration)
- And 12 more agents

---

## 📊 HOOK EVENT PAYLOAD SCHEMAS

### **PreToolUse Event:**
```typescript
interface PreToolUseEvent {
  agentId: string;
  agentName: string;
  callsign: string;
  eventType: "PreToolUse";
  sessionId: string;
  toolName: string;
  toolParams: object;
  timestamp: string;
  branch: string;
}
```

### **PostToolUse Event:**
```typescript
interface PostToolUseEvent {
  agentId: string;
  agentName: string;
  callsign: string;
  eventType: "PostToolUse";
  sessionId: string;
  toolName: string;
  result: {
    success: boolean;
    output: string;
    error?: string;
  };
  executionTimeMs: number;
  timestamp: string;
  branch: string;
}
```

### **SessionEnd Event:**
```typescript
interface SessionEndEvent {
  agentId: string;
  agentName: string;
  callsign: string;
  eventType: "SessionEnd";
  sessionId: string;
  reason: "task_complete" | "error" | "timeout" | "manual_stop";
  summary: string;
  tasksCompleted: number;
  totalExecutionTimeMs: number;
  timestamp: string;
}
```

---

## 🔔 ALERT CONFIGURATION

### **Alert Rules:**
```json
{
  "alertRules": [
    {
      "id": "security-critical",
      "condition": "agentId === 'agent-marcus-thompson' && eventType === 'PostToolUse' && result.error",
      "action": "sendEmail",
      "recipients": ["kevin@magnificentworldwide.com"],
      "priority": "CRITICAL"
    },
    {
      "id": "deployment-failure",
      "condition": "agentId === 'agent-alex-martinez' && toolName === 'bash_tool' && result.error",
      "action": "pauseAgent",
      "notifyDashboard": true
    },
    {
      "id": "database-migration-error",
      "condition": "agentId === 'agent-sarah-chen' && toolName.startsWith('neo4j:') && result.error",
      "action": "notifyAgent",
      "targetAgent": "agent-alex-martinez"
    },
    {
      "id": "test-failure",
      "condition": "agentId === 'agent-kevin-brown' && result.output.includes('FAIL')",
      "action": "createGitHubIssue",
      "assignTo": "taskOwner"
    }
  ]
}
```

---

## 🚀 IMPLEMENTATION STEPS

### **1. Deploy Hook Endpoints:**
```bash
cd dashboard/server
npm install express body-parser
# Hook endpoints already created in routes/hooks.js
npm run dev  # Start server on port 3551
```

### **2. Configure Agent Hooks:**
```javascript
// When spawning Claude Code agent
const session = await claudeCodeClient.createSession({
  repository: 'devklg/telnyx-mern-app',
  branch: 'agent/alex-martinez-devops',
  hooks: {
    preToolUse: 'http://localhost:3551/api/hooks/pre-tool-use',
    postToolUse: 'http://localhost:3551/api/hooks/post-tool-use',
    sessionEnd: 'http://localhost:3551/api/hooks/session-end'
  }
});
```

---

**Configuration Version:** 1.0  
**Last Updated:** 2025-10-21  
**Status:** Ready for Deployment  
**Total Agents Configured:** 17