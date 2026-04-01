#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push

echo "Seeding demo data..."
npx tsx prisma/seed.ts

echo "Building Next.js..."
npm run build

echo "Build complete!"
