#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups

# Backup MongoDB
docker-compose exec -T mongodb mongodump --out=/tmp/backup
docker cp $(docker-compose ps -q mongodb):/tmp/backup ./backups/mongodb_$DATE

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U postgres bmad_v4 > ./backups/postgres_$DATE.sql

echo "Backup completed: $DATE"
