#!/bin/bash
set -euo pipefail

###############################################################################
# Setup script for local development
# Usage: bash scripts/setup.sh [--seed]
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

SEED=false
if [[ "${1:-}" == "--seed" ]]; then
  SEED=true
fi

# ------------------------------------------------------------------
# Prerequisites
# ------------------------------------------------------------------
log_info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
command -v npm   >/dev/null 2>&1 || { log_error "npm is required but not installed.";   exit 1; }
command -v docker >/dev/null 2>&1 || log_warn "Docker is not installed — container features will be unavailable."

NODE_VERSION=$(node -v)
log_ok "Node.js $NODE_VERSION"
log_ok "npm $(npm -v)"

# ------------------------------------------------------------------
# Environment file
# ------------------------------------------------------------------
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    log_ok "Created .env from .env.example"
  else
    log_error ".env.example not found — create one before re-running."
    exit 1
  fi
else
  log_info ".env already exists, skipping"
fi

# ------------------------------------------------------------------
# Backend dependencies
# ------------------------------------------------------------------
log_info "Installing backend dependencies..."
if [ -d backend ]; then
  npm --prefix backend install
  log_ok "Backend dependencies installed"
else
  log_warn "backend/ directory not found, skipping"
fi

# ------------------------------------------------------------------
# Frontend dependencies
# ------------------------------------------------------------------
log_info "Installing frontend dependencies..."
if [ -d frontend ]; then
  npm --prefix frontend install
  log_ok "Frontend dependencies installed"
else
  log_warn "frontend/ directory not found, skipping"
fi

# ------------------------------------------------------------------
# Prisma client & migrations
# ------------------------------------------------------------------
if [ -d backend ]; then
  log_info "Generating Prisma client..."
  npm --prefix backend run prisma:generate 2>/dev/null || npx --prefix backend prisma generate
  log_ok "Prisma client generated"

  log_info "Running Prisma migrations..."
  npm --prefix backend run prisma:migrate 2>/dev/null || npx --prefix backend prisma migrate dev
  log_ok "Migrations applied"
else
  log_warn "backend/ directory not found, skipping Prisma steps"
fi

# ------------------------------------------------------------------
# Seed database
# ------------------------------------------------------------------
if [ "$SEED" = true ]; then
  if [ -f scripts/seed.ts ]; then
    log_info "Seeding database..."
    npm --prefix backend run prisma:seed 2>/dev/null || npx --prefix backend ts-node scripts/seed.ts
    log_ok "Database seeded"
  else
    log_warn "scripts/seed.ts not found, skipping seed"
  fi
else
  log_info "Skipping seed (pass --seed to run it)"
fi

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}API URL:${NC}      http://localhost:4000/api/v1"
echo -e "  ${CYAN}Frontend URL:${NC} http://localhost:3000"
echo -e "  ${CYAN}Database URL:${NC} postgresql://postgres:postgres@localhost:5432/campeonato"
echo ""
