---

## 🔧 **GIT WORKFLOW & REPOSITORY INFORMATION**

### **Repository Details**
- **URL:** `https://github.com/devklg/telnyx-mern-app`
- **Your Branch:** `agent/alex-martinez-devops`
- **Base Branch:** `main`

### **Complete Workflow Documentation**
📖 **[Read GIT-WORKFLOW.md](./GIT-WORKFLOW.md)** for comprehensive guide including:
- Branch naming conventions
- Commit message standards
- Pull request process
- Code review requirements
- CI/CD integration
- Directory structure

### **Quick Start**
```bash
# Clone repository
git clone https://github.com/devklg/telnyx-mern-app.git
cd telnyx-mern-app

# Checkout your branch
git checkout agent/alex-martinez-devops

# Daily workflow
git fetch origin
git merge origin/main
# ... make changes ...
git commit -m "feat(devops): description"
git push origin agent/alex-martinez-devops
```

### **Your Working Directories**
- `docker/` - Docker containers and compose files
- `deployment/` - CI/CD pipelines and deployment scripts  
- `.github/workflows/` - GitHub Actions
- Infrastructure as Code files

### **Commit Message Scopes for Your Work**
- `devops` - General DevOps work
- `docker` - Docker-related changes
- `ci-cd` - CI/CD pipeline updates
- `deployment` - Deployment configuration
- `infrastructure` - Infrastructure changes

### **Required Before Creating PR**
- [ ] All containers build successfully
- [ ] Docker compose up works
- [ ] No hardcoded secrets in configs
- [ ] Follows commit conventions
- [ ] Branch synced with main
- [ ] Documentation updated

---