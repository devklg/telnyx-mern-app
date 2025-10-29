#!/bin/bash
echo "Setting up BMAD V4..."
docker-compose up -d
sleep 10
docker-compose exec backend npm run migrate
echo "Setup complete!"
