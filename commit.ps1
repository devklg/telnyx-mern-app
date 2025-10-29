Write-Host "BMAD V4 - Committing Changes" -ForegroundColor Cyan

Set-Location D:\telnyx-mern-app

Write-Host "Staging all changes..."
git add -A

Write-Host "Creating commit..."
git commit -m "feat: Apply backend scaffolding with port corrections" -m "Updated ports to 3550 (backend) and 3500 (frontend). Applied complete backend scaffolding with controllers, middleware, routes, services, and database configurations. Added security modules and frontend Vite structure."

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "SUCCESS - Changes pushed to GitHub" -ForegroundColor Green
