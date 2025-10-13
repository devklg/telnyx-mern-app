# AGENT WORKFLOW INSTRUCTIONS

## 🚀 **QUICK START**

### **1. Read the comprehensive Git Workflow documentation:**
📖 **[GIT-WORKFLOW.md](./GIT-WORKFLOW.md)** - Complete guide with:
- Repository information
- Branch strategy
- Commit standards
- PR process
- CI/CD integration
- Emergency procedures

### **2. Clone & Setup**
```bash
# Clone the repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# Checkout your assigned branch
git checkout agent/[your-name-role]

# If your branch doesn't exist yet:
git checkout -b agent/[your-name-role]
git push -u origin agent/[your-name-role]
```

### **3. Understand Your Assignment**
Read your agent story file:
- `[YOUR-NAME]_[ROLE]_STORY.md`
- Contains your technical requirements
- Includes definition of done
- Lists dependencies with other agents

### **4. Work in Your Assigned Directories**
Follow the project structure:
- `frontend/` (React app - Michael Park)
- `backend/` (Express.js - David Rodriguez)
- `voice-agent/` (Telnyx integration - Jennifer Kim)
- `databases/` (DB configs - Sarah Chen)
- `docker/` (Containerization - Alex Martinez)
- `tests/` (Testing - Kevin Brown, Nicole Davis)
- `deployment/` (CI/CD - Alex Martinez)

### **5. Daily Development Cycle**
```bash
# Sync with main daily
git checkout agent/[your-name-role]
git fetch origin
git merge origin/main

# Make changes
# ... work on your code ...

# Commit with conventional commits
git add .
git commit -m "feat(scope): descriptive message"

# Push regularly
git push origin agent/[your-name-role]
```

### **6. Create Pull Request When Ready**
- Use PR template in GIT-WORKFLOW.md
- Request reviews from relevant agents
- Address all review comments
- Merge only after approvals

---

## 📚 **ESSENTIAL DOCUMENTS**

| Document | Purpose |
|----------|---------|
| [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) | **Complete Git & branch workflow** |
| [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) | High-level project overview |
| [AGENT'S-ASSIGNMENTS.md](./AGENT'S-ASSIGNMENTS.md) | All agent assignments & dependencies |
| [DEVELOPMENT_STORY.md](./DEVELOPMENT_STORY.md) | Overall development narrative |
| `[YOUR-NAME]_[ROLE]_STORY.md` | Your specific technical story |

---

## ⚠️ **CRITICAL REMINDERS**

1. **Always sync with main before starting work**
2. **Use conventional commit format** (see GIT-WORKFLOW.md)
3. **Never commit secrets or API keys**
4. **Work only in your assigned directories**
5. **Request reviews from dependent agents**
6. **Report blockers within 24 hours**

---

## 🆘 **NEED HELP?**

1. Check [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) first
2. Review your agent story file
3. Ask in team chat
4. Contact Scrum Master
5. Open GitHub Discussion

---

## 🎯 **REPOSITORY INFO**

**URL:** https://github.com/devklg/telnyx-mern-app  
**Owner:** devklg  
**Project:** BMAD V4 Lead Qualification & Management App  
**Client:** Magnificent Worldwide Marketing & Sales Group

---

**For complete workflow details, branch strategy, commit standards, and PR process:**  
👉 **[Read GIT-WORKFLOW.md](./GIT-WORKFLOW.md)**