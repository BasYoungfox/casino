#!/bin/bash
set -e

echo "Running Prisma migrations..."
npx prisma db push

echo "Seeding admin user if needed..."
npx tsx prisma/seed.ts

echo "Building Next.js..."
npm run build
