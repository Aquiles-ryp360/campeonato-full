#!/bin/bash
set -euo pipefail

###############################################################################
# Production deployment script
# Usage: bash scripts/deploy.sh [environment]
#   environment: staging | production (default: production)
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ENVIRONMENT="${1:-production}"
COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="campeonato-app"
HEALTH_URL="http://localhost:4000/health"
STARTUP_WAIT=5
MAX_RETRIES=12

if [ "$ENVIRONMENT" == "staging" ]; then
  COMPOSE_FILE="docker-compose.staging.yml"
  HEALTH_URL="http://localhost:4001/health"
fi

log_info "Deploying to ${ENVIRONMENT}..."

# ------------------------------------------------------------------
# Pull latest code
# ------------------------------------------------------------------
log_info "Pulling latest code from ${ENVIRONMENT} branch..."
git checkout "$ENVIRONMENT"
git pull origin "$ENVIRONMENT"
log_ok "Code updated to $(git log --oneline -1)"

# ------------------------------------------------------------------
# Build & deploy with Docker
# ------------------------------------------------------------------
log_info "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --pull
log_ok "Images built"

log_info "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm backend npm run prisma:migrate:deploy
log_ok "Migrations applied"

log_info "Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate
log_ok "Services restarted"

# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
log_info "Performing health check..."
sleep "$STARTUP_WAIT"

for i in $(seq 1 "$MAX_RETRIES"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
  if [ "$STATUS" == "200" ]; then
    log_ok "Service is healthy (HTTP ${STATUS})"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    log_error "Health check failed after ${MAX_RETRIES} attempts (HTTP ${STATUS})"
    log_info "Initiating rollback..."
    docker compose -f "$COMPOSE_FILE" down
    git revert HEAD --no-edit
    docker compose -f "$COMPOSE_FILE" up -d --build
    log_warn "Rollback completed — previous version is running"
    exit 1
  fi
  log_info "Waiting for service... attempt ${i}/${MAX_RETRIES}"
  sleep 3
done

# Clean up old images
docker image prune -f --filter "until=24h" > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deploy to ${ENVIRONMENT} successful!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}URL:${NC}   $([ "$ENVIRONMENT" == "staging" ] && echo "https://staging.campeonato.com" || echo "https://campeonato.com")"
echo ""
