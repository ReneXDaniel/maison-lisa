#!/usr/bin/env sh
# Start command for a hosted preview (see docs/VORSCHAU.md and render.yaml):
# apply migrations, seed the admin + demo catalogue once, then serve the
# production build. Seeding is idempotent, so restarts keep all data.
set -e
export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"
if [ -z "$APP_URL" ]; then echo "APP_URL is not set" >&2; exit 1; fi
npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts
exec npx next start -p "${PORT:-3000}"
