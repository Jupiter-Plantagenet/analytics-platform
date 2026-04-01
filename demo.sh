#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "  Analytics Platform — Demo Runner"
echo "========================================="
echo ""

# Check prerequisites
for cmd in docker node npm npx; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "ERROR: '$cmd' not found. Please install it first."
    exit 1
  fi
done

# Ensure .env exists
if [ ! -f ".env" ]; then
  echo "[*] Creating .env from .env.example..."
  cp .env.example .env
  echo "  Created .env — edit if needed."
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo ""
  echo "[1/5] Installing npm dependencies..."
  npm install
else
  echo "[1/5] Dependencies already installed."
fi

# Start PostgreSQL
echo ""
echo "[2/5] Starting PostgreSQL..."
docker compose up postgres -d --wait 2>/dev/null || docker-compose up postgres -d 2>/dev/null
echo "  PostgreSQL is ready."

# Setup database
echo ""
echo "[3/5] Setting up database schema..."
npx prisma generate
npx prisma db push

# Seed data
echo ""
echo "[4/5] Seeding demo data..."
npx tsx prisma/seed.ts

# Start app
echo ""
echo "========================================="
echo "  Demo Credentials"
echo "========================================="
echo ""
echo "  Password: demo-password-123"
echo ""
echo "  Tenants:"
echo "    acme-corp       (Enterprise)"
echo "    startup-labs     (Professional)"
echo "    freelance-studio (Starter)"
echo ""
echo "  Roles:"
echo "    admin@<slug>.com"
echo "    manager@<slug>.com"
echo "    viewer@<slug>.com"
echo ""
echo "  Example: admin@acme-corp.com / demo-password-123"
echo ""
echo "========================================="
echo ""
echo "[5/5] Starting app at http://localhost:3000 ..."
echo ""
npm run dev
