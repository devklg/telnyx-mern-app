# 🏗️ Claude Code SDK Integration Architecture
## BMAD V4 Lead Qualification App - Real Agent Orchestration

**Created:** 2025-10-21  
**Version:** 2.0 (Real Claude Code Agents)  
**Purpose:** Transform simulated agents into actual Claude Code instances

---

## 📊 ARCHITECTURAL OVERVIEW

### **Old Architecture (Simulated):**
```
Claude Chat UI
    ↓
Human simulates agent personas
    ↓
Manual code writing & commits
    ↓
GitHub branches
```

### **New Architecture (Real Claude Code Agents):**
```
BMAD Dashboard (Port 3501)
    ↓
Claude Code SDK Orchestrator
    ↓
17 Parallel Claude Code Sessions (Cloud-based)
    ├─ Alex Martinez (DevOps) → agent/alex-martinez-devops
    ├─ Sarah Chen (Database) → agent/sarah-chen-database
    ├─ David Rodriguez (Backend) → agent/david-rodriguez-backend
    ├─ Jennifer Kim (Telnyx) → agent/jennifer-kim-telnyx
    ├─ Robert Wilson (Conversation) → agent/robert-wilson-crm
    ├─ Lisa Chang (AI Integration) → agent/lisa-chang-vector
    ├─ Michael Park (Frontend) → agent/michael-park-frontend
    ├─ Emma Johnson (Monitoring) → agent/emma-johnson-dashboard
    ├─ James Taylor (Lead Mgmt) → agent/james-taylor-crm-ui
    ├─ Priya Patel (Voice Control) → agent/priya-patel-voice-ui
    ├─ Angela White (Analytics) → agent/angela-white-analytics
    ├─ Rachel Green (Integration) → agent/rachel-green-integration
    ├─ Kevin Brown (QA) → agent/kevin-brown-qa
    ├─ Nicole Davis (Testing) → agent/nicole-davis-voice-testing
    ├─ Thomas Garcia (Performance) → agent/thomas-garcia-performance
    ├─ Daniel Lee (User Mgmt) → agent/daniel-lee-user-mgmt
    └─ Marcus Thompson (Security) → agent/marcus-thompson-security
    ↓
Hook Event Streams → Dashboard Real-time Updates
    ↓
GitHub Auto-PRs → Merge to Main
```

---

## 🎯 CORE COMPONENTS

### **1. Claude Code SDK Orchestrator**
**Location:** `dashboard/server/services/claudeCodeOrchestrator.js`

**Responsibilities:**
- Spawn 17 parallel Claude Code sessions
- Manage session lifecycle (start, pause, resume, terminate)
- Route tasks from Neo4j to appropriate agent sessions
- Handle session authentication and credentials
- Monitor health and resource usage

**Key Methods:**
```javascript
class ClaudeCodeOrchestrator {
  async spawnAgent(agentId, branch, config)
  async assignTask(agentId, taskId)
  async pauseAgent(agentId)
  async resumeAgent(agentId)
  async terminateAgent(agentId)
  async broadcastMessage(message, targetAgents)
  getAgentStatus(agentId)
  getAllAgentsStatus()
}
```

---

### **2. Agent Session Manager**
**Location:** `dashboard/server/services/agentSessionManager.js`

**Responsibilities:**
- Track active Claude Code sessions
- Maintain session metadata (start time, task count, status)
- Handle session reconnection on failure
- Manage session rate limits
- Store session logs and metrics

**Session Metadata:**
```javascript
{
  agentId: "agent-alex-martinez",
  sessionId: "cc-session-abc123",
  branch: "agent/alex-martinez-devops",
  status: "ACTIVE" | "PAUSED" | "BLOCKED" | "TERMINATED",
  startTime: "2025-10-21T12:00:00Z",
  currentTask: "TASK-AM-001",
  tasksCompleted: 3,
  tasksTotal: 10,
  lastActivity: "2025-10-21T12:15:00Z",
  hooks: {
    preToolUse: "http://localhost:3551/api/hooks/pre-tool-use",
    postToolUse: "http://localhost:3551/api/hooks/post-tool-use",
    sessionEnd: "http://localhost:3551/api/hooks/session-end"
  }
}
```

---

### **3. Hook Event Processor**
**Location:** `dashboard/server/services/hookEventProcessor.js`

**Responsibilities:**
- Receive hook events from Claude Code sessions
- Parse and validate event payloads
- Update Neo4j agent/task status in real-time
- Broadcast events to dashboard WebSocket
- Store event history in MongoDB

**Supported Hook Events:**
```javascript
// PreToolUse - Before Claude executes any tool
{
  eventType: "PreToolUse",
  agentId: "agent-alex-martinez",
  sessionId: "cc-session-abc123",
  toolName: "bash_tool",
  toolParams: { command: "npm install" },
  timestamp: "2025-10-21T12:15:30Z"
}

// PostToolUse - After tool execution completes
{
  eventType: "PostToolUse",
  agentId: "agent-alex-martinez",
  sessionId: "cc-session-abc123",
  toolName: "bash_tool",
  result: "success",
  output: "packages installed successfully",
  executionTimeMs: 2500,
  timestamp: "2025-10-21T12:15:33Z"
}

// SessionEnd - When Claude Code session completes
{
  eventType: "SessionEnd",
  agentId: "agent-alex-martinez",
  sessionId: "cc-session-abc123",
  reason: "task_complete" | "error" | "timeout" | "manual_stop",
  summary: "Completed Docker setup with 3 tasks",
  timestamp: "2025-10-21T12:30:00Z"
}

// UserPromptSubmit - When new task is assigned
{
  eventType: "UserPromptSubmit",
  agentId: "agent-alex-martinez",
  sessionId: "cc-session-abc123",
  taskId: "TASK-AM-002",
  taskDescription: "Set up CI/CD pipeline",
  timestamp: "2025-10-21T12:31:00Z"
}
```

---

### **4. Real-time WebSocket Bridge**
**Location:** `dashboard/server/services/websocketBridge.js`

**Responsibilities:**
- Maintain WebSocket connections with dashboard frontend
- Broadcast agent activity in real-time
- Handle client subscriptions (watch specific agents/tasks)
- Rate limit updates to prevent frontend overload
- Implement event batching for efficiency

**WebSocket Events:**
```javascript
// Agent status update
socket.emit('agent:status', {
  agentId: "agent-alex-martinez",
  status: "ACTIVE",
  currentTask: "TASK-AM-002",
  progress: 40
});

// Tool execution update
socket.emit('agent:tool', {
  agentId: "agent-alex-martinez",
  toolName: "create_file",
  action: "creating docker-compose.yml",
  status: "in_progress"
});

// Task completion
socket.emit('task:complete', {
  agentId: "agent-alex-martinez",
  taskId: "TASK-AM-001",
  branch: "agent/alex-martinez-devops",
  prUrl: "https://github.com/devklg/telnyx-mern-app/pull/45"
});

// Error notification
socket.emit('agent:error', {
  agentId: "agent-alex-martinez",
  errorType: "dependency_missing",
  message: "npm install failed - network timeout",
  timestamp: "2025-10-21T12:16:00Z"
});
```

---

### **5. GitHub Integration Layer**
**Location:** `dashboard/server/services/githubIntegration.js`

**Responsibilities:**
- Monitor PR creation from agent branches
- Auto-merge PRs that pass CI/CD checks
- Track commit history per agent
- Manage merge conflicts automatically
- Send PR notifications to dashboard

**Integration Flow:**
```
Claude Code Agent completes task
    ↓
Pushes code to agent branch
    ↓
Creates PR automatically
    ↓
GitHub Actions runs tests
    ↓
If tests pass → Auto-merge
    ↓
Notify dashboard + dependent agents
```

---

### **6. Analytics Dashboard**
**Location:** `dashboard/client/src/components/ClaudeCodeAnalytics.jsx`

**Displays:**
- Agent productivity metrics (tasks/hour, lines of code)
- Cost tracking per agent (Claude Code API usage)
- Success rate (tasks completed vs failed)
- Average task completion time
- Tool usage frequency
- Collaboration patterns (which agents work together)

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Claude Code SDK Integration:**

```javascript
// dashboard/server/services/claudeCodeOrchestrator.js

import { ClaudeCodeClient } from '@anthropic-ai/claude-code-sdk';

class ClaudeCodeOrchestrator {
  constructor() {
    this.client = new ClaudeCodeClient({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1/code'
    });
    
    this.activeSessions = new Map(); // agentId -> sessionId
    this.sessionMetadata = new Map(); // sessionId -> metadata
  }

  async spawnAgent(agentConfig) {
    const { agentId, name, role, branch, tasks } = agentConfig;
    
    // Load agent identity card from Neo4j
    const identityCard = await this.loadAgentIdentity(agentId);
    
    // Configure Claude Code session with hooks
    const sessionConfig = {
      repository: 'devklg/telnyx-mern-app',
      branch: branch,
      systemPrompt: this.buildAgentPrompt(identityCard),
      hooks: {
        preToolUse: `http://localhost:3551/api/hooks/pre-tool-use`,
        postToolUse: `http://localhost:3551/api/hooks/post-tool-use`,
        sessionEnd: `http://localhost:3551/api/hooks/session-end`
      },
      maxDuration: '4h',
      autoCommit: true,
      autoPR: true
    };

    // Start Claude Code session
    const session = await this.client.createSession(sessionConfig);
    
    // Store session mapping
    this.activeSessions.set(agentId, session.id);
    this.sessionMetadata.set(session.id, {
      agentId,
      name,
      role,
      branch,
      status: 'ACTIVE',
      startTime: new Date(),
      tasksQueue: [...tasks]
    });

    // Assign first task
    await this.assignNextTask(agentId);
    
    return session;
  }

  buildAgentPrompt(identityCard) {
    return `
# AGENT IDENTITY
You are ${identityCard.name}, callsign ${identityCard.callsign}.
Role: ${identityCard.role}
Specialty: ${identityCard.specialty}

# MISSION
You are working on the BMAD V4 Lead Qualification App.
Your branch: ${identityCard.github_branch}

# PERSONALITY
${identityCard.personality.working_style}
Communication: ${identityCard.personality.communication_style}

# CONTEXT
- Read your story file: ${identityCard.story_file}
- Query Neo4j for your task list: MATCH (a:Agent {id: '${identityCard.id}'})-[:HAS_TASK]->(t:Task) RETURN t
- Use Chroma collection 'bmad_project_context' for project knowledge
- Collaborate with other agents via Neo4j messaging

# WORKFLOW
1. Load assigned task from Neo4j
2. Read task acceptance criteria
3. Execute development work
4. Run tests
5. Commit to your branch
6. Create PR
7. Update task status to COMPLETE
8. Move to next task

CRITICAL: Stay in character. Work only on YOUR assigned tasks. Communicate via Neo4j when you need help from other agents.
`;
  }

  async assignNextTask(agentId) {
    const sessionId = this.activeSessions.get(agentId);
    const metadata = this.sessionMetadata.get(sessionId);
    
    if (metadata.tasksQueue.length === 0) {
      console.log(`✅ ${metadata.name} has completed all tasks!`);
      return;
    }

    const nextTask = metadata.tasksQueue.shift();
    
    // Send task via Claude Code chat
    await this.client.sendMessage(sessionId, {
      role: 'user',
      content: `
# NEW TASK ASSIGNED
Task ID: ${nextTask.id}
Description: ${nextTask.description}
Priority: ${nextTask.priority}
Story Points: ${nextTask.story_points}

Acceptance Criteria:
${nextTask.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Dependencies: ${nextTask.dependencies.length > 0 ? nextTask.dependencies.join(', ') : 'None'}

Please complete this task following the BMAD V4 development workflow.
`
    });
  }

  async loadAgentIdentity(agentId) {
    // Query Neo4j for agent details
    const result = await neo4jDriver.executeQuery(`
      MATCH (a:Agent {id: $agentId})-[:HAS_IDENTITY_CARD]->(ic:AgentIdentityCard)
      RETURN ic
    `, { agentId });
    
    return result.records[0].get('ic').properties;
  }
}
```

---

### **Hook Event Endpoint:**

```javascript
// dashboard/server/routes/hooks.js

router.post('/hooks/pre-tool-use', async (req, res) => {
  const { agentId, sessionId, toolName, toolParams } = req.body;
  
  // Log to MongoDB
  await EventLog.create({
    type: 'PreToolUse',
    agentId,
    sessionId,
    toolName,
    toolParams,
    timestamp: new Date()
  });

  // Update agent status in Neo4j
  await neo4jDriver.executeQuery(`
    MATCH (a:Agent {id: $agentId})
    SET a.last_activity = datetime(),
        a.current_action = $toolName
    RETURN a
  `, { agentId, toolName });

  // Broadcast to dashboard
  io.emit('agent:tool', {
    agentId,
    toolName,
    action: toolParams.description || 'executing',
    status: 'in_progress'
  });

  res.json({ success: true });
});

router.post('/hooks/post-tool-use', async (req, res) => {
  const { agentId, sessionId, toolName, result, executionTimeMs } = req.body;
  
  // Log result
  await EventLog.create({
    type: 'PostToolUse',
    agentId,
    sessionId,
    toolName,
    result,
    executionTimeMs,
    timestamp: new Date()
  });

  // Update metrics
  await AgentMetrics.updateOne(
    { agentId },
    { 
      $inc: { 
        toolExecutions: 1,
        totalExecutionTime: executionTimeMs
      }
    },
    { upsert: true }
  );

  // Broadcast completion
  io.emit('agent:tool', {
    agentId,
    toolName,
    status: result.success ? 'complete' : 'failed',
    output: result.output
  });

  res.json({ success: true });
});

router.post('/hooks/session-end', async (req, res) => {
  const { agentId, sessionId, reason, summary } = req.body;
  
  // Update agent status to IDLE
  await neo4jDriver.executeQuery(`
    MATCH (a:Agent {id: $agentId})
    SET a.status = 'IDLE',
        a.last_session_end = datetime()
    RETURN a
  `, { agentId });

  // Notify dashboard
  io.emit('agent:session_end', {
    agentId,
    reason,
    summary
  });

  res.json({ success: true });
});
```

---

## 💰 COST MANAGEMENT

### **Claude Code Pricing:**
- **Pro Plan:** $20/month (shared rate limits)
- **Max Plan:** $100-200/month (higher rate limits, priority access)

### **Estimated Costs for 17 Agents:**
- **Recommended:** Max plan ($200/month) for parallel agent execution
- **Usage:** All agents share rate limits
- **Optimization:** Pause idle agents, batch task assignments

### **Cost Tracking:**
```javascript
// Track API usage per agent
await AgentMetrics.updateOne(
  { agentId },
  { 
    $inc: { 
      apiCalls: 1,
      tokensUsed: response.usage.total_tokens,
      estimatedCost: response.usage.total_tokens * 0.00001 // example rate
    }
  }
);
```

---

## 🎯 DASHBOARD UI INTEGRATION

### **Agent Grid View:**
```jsx
// Show all 17 agents with real-time status
<AgentGrid>
  {agents.map(agent => (
    <AgentCard key={agent.id}>
      <AgentAvatar status={agent.status} />
      <AgentName>{agent.name}</AgentName>
      <AgentRole>{agent.role}</AgentRole>
      <CurrentTask>{agent.currentTask}</CurrentTask>
      <ProgressBar value={agent.progress} />
      <LiveActivityFeed events={agent.recentEvents} />
    </AgentCard>
  ))}
</AgentGrid>
```

### **Task Timeline View:**
```jsx
// Show tasks flowing through agent pipeline
<TaskTimeline>
  {tasks.map(task => (
    <TaskNode 
      task={task}
      assignedAgent={task.agent}
      status={task.status}
      startTime={task.startTime}
      estimatedCompletion={task.eta}
    />
  ))}
</TaskTimeline>
```

---

## 🚀 DEPLOYMENT STRATEGY

### **Phase 1: Proof of Concept (1 week)**
- Spawn 3 agents: Alex, Sarah, David
- Verify hook integration works
- Test real-time dashboard updates
- Validate GitHub PR automation

### **Phase 2: Scale to 10 Agents (1 week)**
- Add 7 more agents
- Monitor rate limits and performance
- Optimize cost tracking
- Test agent collaboration (Neo4j messaging)

### **Phase 3: Full 17-Agent Deployment (1 week)**
- Launch all agents in parallel
- Stress test dashboard WebSocket
- Validate Sprint 1 completion
- Measure velocity and productivity

---

## 📈 SUCCESS METRICS

1. **Agent Productivity:** Tasks completed per hour per agent
2. **Code Quality:** PR merge success rate
3. **Collaboration:** Inter-agent message frequency
4. **Cost Efficiency:** $ per task completed
5. **Sprint Velocity:** Story points completed per sprint

---

## ⚠️ RISK MITIGATION

### **Rate Limiting:**
- Implement queue system for task assignment
- Stagger agent starts (2-3 per minute)
- Monitor Claude Code API rate limit headers

### **Session Failures:**
- Auto-reconnect on timeout
- Checkpoint task progress in Neo4j
- Manual restart capability from dashboard

### **Cost Overruns:**
- Set spending alerts ($50/day threshold)
- Auto-pause agents if budget exceeded
- Daily cost reports to Kevin

---

## 🎓 NEXT STEPS

1. **Install Claude Code SDK:** `npm install @anthropic-ai/claude-code-sdk`
2. **Configure API Keys:** Add to `.env` file
3. **Deploy Hook Endpoints:** Update dashboard server
4. **Test with 1 Agent:** Run Alex Martinez on demo task
5. **Scale Gradually:** Add agents as confidence grows

---

**Architecture Version:** 2.0 - Real Claude Code Integration  
**Last Updated:** 2025-10-21  
**Status:** Ready for Implementation