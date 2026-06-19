#!/bin/sh
set -e

echo "Preparing database..."
npx prisma db push
npx prisma db seed

echo "Starting BikeTripHub..."
npm run start -- --hostname 0.0.0.0 --port 3000
