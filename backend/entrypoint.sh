#!/bin/sh
set -e
# debug snippet (add at top of entrypoint.sh, before prisma migrate)
echo "DEBUG: DATABASE_URL=${DATABASE_URL:-<unset>}"
# print only the host portion, redacting credentials
echo "DEBUG: DATABASE_HOST=$(echo \"$DATABASE_URL\" | sed -E 's#.*@([^:/]+).*#\\1#' 2>/dev/null || true)"
if [ -z \"$DATABASE_URL\" ]; then
  echo \"ERROR: DATABASE_URL not set — aborting\"
  exit 1
fi
if echo \"$DATABASE_URL\" | grep -Eq '(^|@)(localhost|127\\.0\\.0\\.1)(:|$)'; then
  echo \"ERROR: DATABASE_URL points to localhost — update Render env var to your Aiven URL\"
  exit 1
fi
echo "Running database migrations..."
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "Starting server..."
exec node backend/dist/index.js
