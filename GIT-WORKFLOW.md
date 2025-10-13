# GIT WORKFLOW & DEVELOPMENT STANDARDS
**BMAD V4 Lead Qualification & Management App**  
**Repository:** https://github.com/devklg/telnyx-mern-app

---

## 🎯 **REPOSITORY INFORMATION**

| Item | Value |
|------|-------|
| **Repository URL** | `https://github.com/devklg/telnyx-mern-app.git` |
| **Owner** | `devklg` |
| **Base Branch** | `main` |
| **Development Model** | Agent-based branches with PR workflow |
| **Project Type** | BMAD V4 - 17-Agent MERN Stack System |

---

## 🌳 **BRANCH STRATEGY**

### **Branch Naming Convention**

```
agent/[first-name]-[last-name]-[role-abbreviation]
```

**Examples:**
- `agent/david-rodriguez-backend`
- `agent/sarah-chen-database`
- `agent/michael-park-frontend`
- `agent/jennifer-kim-telnyx`
- `agent/alex-martinez-devops`

### **Branch Hierarchy**

```
main (production-ready code)
  ├── agent/david-rodriguez-backend
  ├── agent/sarah-chen-database  
  ├── agent/michael-park-frontend
  ├── agent/jennifer-kim-telnyx
  ├── agent/alex-martinez-devops
  ├── agent/lisa-chang-vector
  ├── agent/robert-wilson-crm
  ├── agent/emma-johnson-dashboard
  ├── agent/priya-patel-voice-ui
  ├── agent/james-taylor-crm-ui
  ├── agent/daniel-lee-user-mgmt
  ├── agent/rachel-green-integration
  ├── agent/angela-white-analytics
  ├── agent/marcus-thompson-security
  ├── agent/thomas-garcia-performance
  ├── agent/kevin-brown-qa
  └── agent/nicole-davis-voice-testing
```

### **Branch Protection Rules**

- ✅ `main` branch is protected
- ✅ Requires at least 1 approval before merge
- ✅ Requires status checks to pass
- ✅ Requires branches to be up to date before merging
- ✅ Direct commits to `main` are disabled

---

## 📝 **COMMIT MESSAGE STANDARDS**

### **Conventional Commits Format**

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### **Commit Types**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(backend): add lead qualification API endpoint` |
| `fix` | Bug fix | `fix(telnyx): resolve call drop issue on transfer` |
| `docs` | Documentation | `docs(readme): update installation instructions` |
| `style` | Code style changes | `style(frontend): apply Magnificent branding colors` |
| `refactor` | Code refactoring | `refactor(database): optimize lead query performance` |
| `test` | Adding tests | `test(api): add unit tests for call controller` |
| `chore` | Maintenance tasks | `chore(deps): update express to v4.18.2` |
| `perf` | Performance improvements | `perf(socket): optimize real-time event broadcasting` |
| `ci` | CI/CD changes | `ci(docker): update deployment workflow` |
| `build` | Build system changes | `build(webpack): configure production build` |

### **Commit Message Examples**

**Good ✅**
```bash
git commit -m "feat(backend): implement hot transfer workflow for Kevin availability"
git commit -m "fix(voice-agent): correct phase transition tracking in conversation flow"
git commit -m "docs(api): add Swagger documentation for lead management endpoints"
git commit -m "test(integration): add Telnyx webhook handler tests"
```

**Bad ❌**
```bash
git commit -m "updated stuff"
git commit -m "fixes"
git commit -m "WIP"
git commit -m "temp commit"
```

### **Scope Guidelines**

Use specific scopes that match your assigned area:

**Backend (David Rodriguez):**
- `backend`, `api`, `express`, `routes`, `controllers`, `middleware`

**Database (Sarah Chen):**
- `database`, `postgres`, `mongodb`, `neo4j`, `chroma`, `migrations`, `models`

**Frontend (Michael Park):**
- `frontend`, `react`, `ui`, `components`, `pages`, `hooks`

**Telnyx Integration (Jennifer Kim):**
- `telnyx`, `voice`, `calls`, `webhooks`, `telephony`

**DevOps (Alex Martinez):**
- `devops`, `docker`, `ci-cd`, `deployment`, `infrastructure`

---

## 🔄 **DEVELOPMENT WORKFLOW**

### **1. Initial Setup**

```bash
# Clone the repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# Set up your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Checkout your assigned branch
git checkout agent/[your-name-role]

# If your branch doesn't exist, create it
git checkout -b agent/[your-name-role]
git push -u origin agent/[your-name-role]
```

### **2. Daily Development Cycle**

```bash
# Always start by syncing with main
git checkout agent/[your-name-role]
git fetch origin
git merge origin/main

# Create feature branch (optional, for large features)
git checkout -b feature/your-feature-name

# Make your changes
# ... work on your code ...

# Stage and commit changes
git add .
git commit -m "feat(scope): descriptive commit message"

# Push to your branch
git push origin agent/[your-name-role]
# OR if on feature branch:
git push origin feature/your-feature-name
```

### **3. Keeping Your Branch Updated**

```bash
# Regularly sync with main to avoid conflicts
git checkout agent/[your-name-role]
git fetch origin
git merge origin/main

# If there are conflicts, resolve them:
# 1. Open conflicted files
# 2. Resolve conflicts manually
# 3. Stage resolved files: git add <file>
# 4. Complete merge: git commit -m "merge: resolve conflicts with main"
# 5. Push: git push origin agent/[your-name-role]
```

### **4. Creating Pull Requests**

When your work is ready for integration:

**PR Title Format:**
```
[AGENT] Feature/Fix: Brief description
```

**Examples:**
```
[DAVID] Backend: Implement lead qualification API endpoints
[JENNIFER] Telnyx: Add hot transfer workflow with Kevin availability check
[SARAH] Database: Create PostgreSQL schema for lead management
```

**PR Description Template:**
```markdown
## 🎯 Summary
Brief description of what this PR accomplishes

## 📋 Changes
- Change 1
- Change 2
- Change 3

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passed
- [ ] Manual testing completed

## 📸 Screenshots (if applicable)
[Add screenshots for UI changes]

## 🔗 Related Issues
Closes #123
Relates to #456

## ✅ Checklist
- [ ] Code follows project conventions
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] All tests passing
- [ ] Reviewed own code
```

### **5. Code Review Process**

**As PR Author:**
1. Create PR with descriptive title and complete description
2. Request review from relevant team members
3. Address all review comments
4. Mark conversations as resolved when changes made
5. Request re-review after making changes

**As Reviewer:**
1. Review code within 24 hours
2. Test the changes locally if possible
3. Provide constructive feedback
4. Approve if changes look good
5. Request changes if issues found

**Review Criteria:**
- ✅ Code quality and readability
- ✅ Follows project conventions
- ✅ Proper error handling
- ✅ Security considerations
- ✅ Performance implications
- ✅ Test coverage
- ✅ Documentation updates

---

## 🚀 **CONTINUOUS INTEGRATION**

### **Automated Checks**

Every PR triggers automated checks:

1. **Linting:** ESLint for JavaScript/TypeScript
2. **Tests:** Jest unit tests, integration tests
3. **Build:** Webpack production build
4. **Security:** Dependency vulnerability scan
5. **Coverage:** Code coverage report (minimum 80%)

### **Status Checks Required**

- ✅ `lint` - Code style check
- ✅ `test` - Unit tests pass
- ✅ `build` - Build succeeds
- ✅ `security` - No critical vulnerabilities

---

## 📁 **DIRECTORY STRUCTURE & OWNERSHIP**

Each agent works in their designated directories:

```
telnyx-mern-app/
├── backend/                    # David Rodriguez
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── services/
│   └── tests/
├── frontend/                   # Michael Park
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── public/
├── voice-agent/                # Jennifer Kim
│   ├── telnyx-integration/
│   ├── conversation-engine/
│   └── webhooks/
├── databases/                  # Sarah Chen
│   ├── postgres/
│   │   └── migrations/
│   ├── mongodb/
│   │   └── schemas/
│   ├── neo4j/
│   │   └── cypher/
│   └── chroma/
├── docker/                     # Alex Martinez
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── tests/                      # Kevin Brown, Nicole Davis
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── deployment/                 # Alex Martinez
    ├── kubernetes/
    └── ci-cd/
```

---

## 🔐 **SECRETS MANAGEMENT**

**NEVER commit sensitive data to Git!**

### **Environment Variables**

Use `.env` files (already in `.gitignore`):

```bash
# .env.example (committed to Git)
TELNYX_API_KEY=your_api_key_here
POSTGRES_CONNECTION_STRING=your_connection_string
ANTHROPIC_API_KEY=your_api_key_here

# .env (NOT committed, personal copy)
TELNYX_API_KEY=actual_key_value
POSTGRES_CONNECTION_STRING=actual_connection
ANTHROPIC_API_KEY=actual_key
```

### **Pre-commit Checks**

Before committing, verify:
```bash
# Check for secrets
git diff --staged | grep -i "api_key\|password\|secret"

# If you find secrets, remove them before committing!
```

---

## 🆘 **COMMON GIT COMMANDS**

### **Quick Reference**

```bash
# Check current status
git status

# View commit history
git log --oneline --graph

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - CAREFUL!
git reset --hard HEAD~1

# Stash changes temporarily
git stash
git stash pop  # Apply stashed changes

# Create new branch from current location
git checkout -b feature/new-feature

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# View all branches
git branch -a

# Update local list of remote branches
git fetch --prune
```

### **Emergency: Accidentally Committed to Main**

```bash
# If you haven't pushed yet:
git checkout main
git reset --hard origin/main
git checkout agent/[your-name-role]
git cherry-pick <commit-hash>  # Re-apply your commit to your branch

# If you already pushed (contact Scrum Master immediately!)
```

---

## 📊 **MERGE STRATEGY**

### **Merging to Main**

Only through Pull Requests with approvals.

**Merge Methods:**
- **Squash and merge** (preferred for feature branches)
  - Creates single commit on main
  - Keeps main history clean
- **Merge commit** (for agent branches with multiple features)
  - Preserves full commit history
- **Rebase and merge** (for small changes)
  - Linear history

---

## 🎓 **TRAINING & RESOURCES**

### **Git Learning Resources**
- Git Official Documentation: https://git-scm.com/doc
- GitHub Flow: https://guides.github.com/introduction/flow/
- Conventional Commits: https://www.conventionalcommits.org/

### **Project-Specific Resources**
- Project Summary: `PROJECT-SUMMARY.md`
- Agent Assignments: `AGENT'S-ASSIGNMENTS.md`
- Development Story: `DEVELOPMENT_STORY.md`
- Your Agent Story: `[YOUR-NAME]_[ROLE]_STORY.md`

---

## 🤝 **GETTING HELP**

**Issues with Git?**
1. Check this document first
2. Ask in team chat
3. Contact Scrum Master
4. Open GitHub Discussion

**Blocked on Dependencies?**
1. Check `AGENT'S-ASSIGNMENTS.md` for dependencies
2. Reach out to dependent agent
3. Report blocker in daily standup
4. Escalate to Scrum Master if not resolved in 24 hours

---

## ✅ **PRE-PUSH CHECKLIST**

Before pushing code, verify:

- [ ] Code compiles/runs without errors
- [ ] All tests pass locally
- [ ] No console.log() or debug code left in
- [ ] No hardcoded credentials or API keys
- [ ] Code follows project style guide
- [ ] Commit messages follow conventions
- [ ] Changes are on correct branch
- [ ] Branch is synced with latest main

---

**Last Updated:** 2025-10-13  
**Maintained By:** Scrum Master  
**Questions?** Open a GitHub Discussion or contact the Scrum Master

---

## 🎯 **QUICK START FOR NEW AGENTS**

```bash
# 1. Clone
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# 2. Setup
git checkout -b agent/[your-name-role]
git push -u origin agent/[your-name-role]

# 3. Read your story
cat [YOUR-NAME]_[ROLE]_STORY.md

# 4. Start coding!
# ... make changes ...

# 5. Commit
git add .
git commit -m "feat(scope): your changes"
git push origin agent/[your-name-role]

# 6. Create PR when ready
# Go to GitHub and create Pull Request
```

---

**Repository:** https://github.com/devklg/telnyx-mern-app  
**Project:** BMAD V4 Lead Qualification & Management App  
**Client:** Magnificent Worldwide Marketing & Sales Group