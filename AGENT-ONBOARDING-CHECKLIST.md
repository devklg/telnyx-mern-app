# AGENT ONBOARDING CHECKLIST
**BMAD V4 Lead Qualification & Management App**  
**Complete Setup Guide for All 17 Agents**

---

## 🎯 **QUICK START - 5 MINUTES TO FIRST COMMIT**

### **Step 1: Read Your Story** (2 min)
Find and read your agent story file:

| Agent | Story File | Branch Name |
|-------|-----------|-------------|
| **David Rodriguez** - Backend | `DAVID_RODRIGUEZ_BACKEND_STORY.md` | `agent/david-rodriguez-backend` |
| **Sarah Chen** - Database | `SARAH_CHEN_DATABASE_STORY.md` | `agent/sarah-chen-database` |
| **Michael Park** - Frontend | `MICHAEL_PARK_FRONTEND_STORY.md` | `agent/michael-park-frontend` |
| **Jennifer Kim** - Telnyx | `JENNIFER_KIM_TELNYX_STORY.md` | `agent/jennifer-kim-telnyx` |
| **Alex Martinez** - DevOps | `ALEX_MARTINEZ_DEVOPS_STORY.md` | `agent/alex-martinez-devops` |
| **Lisa Chang** - Vector DB | `LISA_CHANG_VECTOR_STORY.md` | `agent/lisa-chang-vector` |
| **Robert Wilson** - CRM | `ROBERT_WILSON_CRM_STORY.md` | `agent/robert-wilson-crm` |
| **Emma Johnson** - Dashboard | `EMMA_JOHNSON_DASHBOARD_STORY.md` | `agent/emma-johnson-dashboard` |
| **Priya Patel** - Voice UI | `PRIYA_PATEL_VOICE_UI_STORY.md` | `agent/priya-patel-voice-ui` |
| **James Taylor** - CRM UI | `JAMES_TAYLOR_CRM_UI_STORY.md` | `agent/james-taylor-crm-ui` |
| **Daniel Lee** - User Mgmt | `DANIEL_LEE_USER_MGMT_STORY.md` | `agent/daniel-lee-user-mgmt` |
| **Rachel Green** - Integration | `RACHEL_GREEN_INTEGRATION_STORY.md` | `agent/rachel-green-integration` |
| **Angela White** - Analytics | `ANGELA_WHITE_ANALYTICS_STORY.md` | `agent/angela-white-analytics` |
| **Marcus Thompson** - Security | `MARCUS_THOMPSON_SECURITY_STORY.md` | `agent/marcus-thompson-security` |
| **Thomas Garcia** - Performance | `THOMAS_GARCIA_PERFORMANCE_STORY.md` | `agent/thomas-garcia-performance` |
| **Kevin Brown** - QA | `KEVIN_BROWN_QA_STORY.md` | `agent/kevin-brown-qa` |
| **Nicole Davis** - Voice Testing | `NICOLE_DAVIS_VOICE_TESTING_STORY.md` | `agent/nicole-davis-voice-testing` |

### **Step 2: Setup Git** (2 min)
```bash
# Clone repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# Checkout YOUR branch (use your branch name from table above)
git checkout agent/[your-name-role]

# If your branch doesn't exist yet, create it:
git checkout -b agent/[your-name-role]
git push -u origin agent/[your-name-role]
```

### **Step 3: Read Git Workflow** (1 min)
📖 **[Open GIT-WORKFLOW.md](./GIT-WORKFLOW.md)** - Comprehensive guide with:
- Branch strategy
- Commit standards
- PR process
- CI/CD integration

---

## 🔧 **DAILY WORKFLOW**

### **Morning Routine**
```bash
# 1. Sync with main branch
git checkout agent/[your-name-role]
git fetch origin
git merge origin/main

# 2. Pull latest changes from your branch
git pull origin agent/[your-name-role]

# 3. Check for conflicts
git status
```

### **During Development**
```bash
# Make changes to your assigned directories
# ... edit files ...

# Stage changes
git add .

# Commit with conventional format
git commit -m "feat(scope): description of change"

# Push to your branch
git push origin agent/[your-name-role]
```

### **Common Commit Scopes by Role**

| Role | Your Commit Scopes |
|------|-------------------|
| **Backend** | `backend`, `api`, `express`, `routes`, `controllers` |
| **Database** | `database`, `postgres`, `mongodb`, `neo4j`, `chroma`, `migrations` |
| **Frontend** | `frontend`, `react`, `ui`, `components`, `pages` |
| **Telnyx** | `telnyx`, `voice`, `calls`, `webhooks`, `telephony` |
| **DevOps** | `devops`, `docker`, `ci-cd`, `deployment`, `infrastructure` |
| **Vector** | `vector`, `chroma`, `embeddings`, `rag`, `search` |
| **CRM** | `crm`, `contacts`, `pipelines`, `integrations` |
| **Dashboard** | `dashboard`, `metrics`, `visualization`, `grafana` |
| **Voice UI** | `voice-ui`, `telnyx-ui`, `call-controls`, `ivr` |
| **CRM UI** | `crm-ui`, `leads`, `contacts-ui`, `prospects` |
| **User Mgmt** | `users`, `auth`, `permissions`, `roles` |
| **Integration** | `integration`, `api-sync`, `webhooks`, `events` |
| **Analytics** | `analytics`, `reporting`, `metrics`, `insights` |
| **Security** | `security`, `auth`, `encryption`, `compliance` |
| **Performance** | `performance`, `optimization`, `caching`, `load` |
| **QA** | `test`, `qa`, `e2e`, `integration-tests` |
| **Voice Testing** | `voice-test`, `conversation-test`, `call-qa` |

---

## 📂 **YOUR WORKING DIRECTORIES**

| Role | Assigned Directories |
|------|---------------------|
| **Backend** | `backend/`, `backend/routes/`, `backend/controllers/`, `backend/middleware/` |
| **Database** | `databases/`, `backend/models/`, `migrations/` |
| **Frontend** | `frontend/`, `frontend/src/`, `frontend/components/` |
| **Telnyx** | `voice-agent/`, `backend/services/telnyx/` |
| **DevOps** | `docker/`, `deployment/`, `.github/workflows/`, `infrastructure/` |
| **Vector** | `backend/services/vector/`, `databases/chroma-config/` |
| **CRM** | `backend/services/crm/`, `backend/models/crm/` |
| **Dashboard** | `frontend/dashboard/`, `grafana-config/` |
| **Voice UI** | `frontend/voice-interface/`, `frontend/components/voice/` |
| **CRM UI** | `frontend/crm-interface/`, `frontend/components/crm/` |
| **User Mgmt** | `backend/services/auth/`, `backend/models/user/` |
| **Integration** | `backend/services/integrations/`, `backend/webhooks/` |
| **Analytics** | `backend/analytics/`, `grafana-dashboards/` |
| **Security** | `backend/security/`, `backend/middleware/auth/` |
| **Performance** | `backend/performance/`, `monitoring/` |
| **QA** | `tests/`, `tests/integration/`, `tests/e2e/` |
| **Voice Testing** | `tests/voice/`, `tests/conversation/` |

---

## ✅ **PRE-COMMIT CHECKLIST**

Before every `git commit`:

- [ ] **Code compiles** without errors
- [ ] **Tests pass** locally (run test command for your area)
- [ ] **No console.log()** or debug code left in
- [ ] **No hardcoded** credentials, API keys, or secrets
- [ ] **Code follows** project style guide
- [ ] **Commit message** uses conventional format
- [ ] **Changes are** on correct branch
- [ ] **Branch is synced** with latest main

---

## 🚀 **CREATING YOUR FIRST PULL REQUEST**

### **When to Create PR**
Create a PR when you've completed a:
- ✅ Feature milestone from your story
- ✅ Bug fix that's ready for review
- ✅ Significant refactor or optimization
- ✅ Documentation update

### **PR Process**
```bash
# 1. Ensure branch is up to date
git fetch origin
git merge origin/main

# 2. Push your latest changes
git push origin agent/[your-name-role]

# 3. Go to GitHub and create Pull Request
# Title format: [AGENT] Feature/Fix: Description
# Example: [BACKEND] feat: implement lead qualification API endpoints
```

### **PR Template** (Copy this into your PR description)
```markdown
## Summary
[Brief description of changes]

## Changes Made
- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots here]

## Dependencies
Depends on/Blocks: #[issue number]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No hardcoded secrets
- [ ] Ready for review
```

---

## 🆘 **GETTING HELP**

### **Stuck on Something?**

1. **Check Documentation First**
   - Your agent story file
   - [GIT-WORKFLOW.md](./GIT-WORKFLOW.md)
   - [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)
   - [DEVELOPMENT_STORY.md](./DEVELOPMENT_STORY.md)

2. **Check Dependencies**
   - Review `AGENT'S-ASSIGNMENTS.md`
   - Reach out to dependent agents
   - Check if blockers are documented

3. **Ask in Team Chat**
   - Post your question
   - Tag relevant agents
   - Include context

4. **Contact Scrum Master**
   - Report blockers
   - Request clarification
   - Escalate urgent issues

5. **Open GitHub Discussion**
   - For technical design questions
   - For architectural decisions
   - For cross-agent coordination

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| **Merge conflicts** | Run `git merge origin/main` and resolve conflicts locally |
| **Can't push to main** | Never push to main directly - use your agent branch |
| **Tests failing** | Check your agent story for test requirements |
| **Missing dependencies** | Check `AGENT'S-ASSIGNMENTS.md` for required integrations |
| **Branch doesn't exist** | Create it: `git checkout -b agent/[your-name-role]` |
| **Forgotten commit format** | See GIT-WORKFLOW.md for examples |

---

## 📋 **ESSENTIAL READING ORDER**

**Day 1 - Setup** (30 minutes)
1. ✅ This file (AGENT-ONBOARDING-CHECKLIST.md) - 10 min
2. ✅ [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) - 10 min
3. ✅ Your agent story file - 10 min

**Day 1 - Context** (30 minutes)
4. ✅ [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) - 10 min
5. ✅ [AGENT'S-ASSIGNMENTS.md](./AGENT'S-ASSIGNMENTS.md) - 10 min
6. ✅ [DEVELOPMENT_STORY.md](./DEVELOPMENT_STORY.md) - 10 min

**Day 1 - Start Coding** (Rest of day)
7. ✅ Clone repo and create your branch
8. ✅ Make first commit
9. ✅ Create your first PR (even if small)

---

## 🎯 **SUCCESS METRICS**

You're successfully onboarded when you:
- ✅ Have your agent branch created
- ✅ Made your first commit
- ✅ Created your first PR
- ✅ Know where your working directories are
- ✅ Understand the PR review process
- ✅ Know how to get help when blocked

---

## 🚨 **CRITICAL REMINDERS**

1. **NEVER commit to `main` directly** - Always use your agent branch
2. **NEVER commit secrets or API keys** - Use environment variables
3. **ALWAYS sync with main daily** - Run `git merge origin/main`
4. **ALWAYS use conventional commits** - See GIT-WORKFLOW.md
5. **ALWAYS test locally first** - Before pushing code
6. **ALWAYS document your changes** - In PR descriptions
7. **ALWAYS work in assigned directories** - Don't modify other agents' code without coordination

---

## 📊 **PROJECT CONTEXT**

### **What We're Building**
**BMAD V4 Lead Qualification & Management App**
- Automates DIALING & QUALIFYING leads
- Multi-channel: Voice + SMS + Email  
- Hot transfers qualified prospects to Kevin
- Target: 700-1000 calls/day capacity

### **Business Model**
- **Target:** 50 partners/month
- **Revenue:** $890/month recurring (compounds to $10,680 by month 12)
- **Investment:** $385 (600 fresh + 5,000 aged leads)
- **Month 1 ROI:** 8X

### **Your Role**
You're part of a **17-agent MERN stack development team** building:
- React frontend with shadcn/ui (Magnificent Worldwide branding)
- Express.js backend with Socket.io real-time
- Multi-database architecture (PostgreSQL, MongoDB, Neo4j, Chroma)
- Telnyx voice integration
- Grafana analytics

---

## 🎉 **WELCOME TO THE TEAM!**

Remember:
- 📖 **Read documentation first** before asking
- 🤝 **Collaborate with other agents** - you're not alone
- 🐛 **Report blockers early** - don't wait until daily standup
- 💬 **Over-communicate** - it's better than under-communicating
- ✅ **Ship small, ship often** - don't wait for perfection

**Questions?** Check [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) or ask the Scrum Master!

---

**Repository:** https://github.com/devklg/telnyx-mern-app  
**Client:** Magnificent Worldwide Marketing & Sales Group  
**Project:** BMAD V4 Lead Qualification & Management App  
**Your Success = Project Success** 🚀

---

**Last Updated:** 2025-10-13  
**Maintained By:** Scrum Master  
**Version:** 1.0