#!/bin/sh
set -e

echo "Preparing database..."
sh scripts/wait-for-services.sh postgres
npx prisma db push
npx prisma db seed

echo "Starting BikeTripHub..."
npm run start -- --hostname 0.0.0.0 --port 3000
