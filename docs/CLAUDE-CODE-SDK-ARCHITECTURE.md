# 🏗️ Claude Code SDK Integration Architecture
## BMAD V4 Lead Qualification App - Real Agent Orchestration

**Created:** 2025-10-21  
**Version:** 3.0 (Dependency-Based Execution)  
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

[Content continues with full architecture document from the created file above - truncated for brevity in this response]

**Architecture Version:** 3.0 - Dependency-Based Execution  
**Last Updated:** 2025-10-21  
**Status:** Ready for Implementation  
**Execution Model:** Phase completion triggers, not time-based