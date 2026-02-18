#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "Starting server..."
exec node backend/dist/index.js
