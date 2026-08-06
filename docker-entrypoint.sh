#!/bin/sh
set -e

# Both steps are idempotent: migrate deploy skips what is applied, and the
# seed clears its own rows before inserting.
mkdir -p /app/data
npx prisma migrate deploy
npx tsx prisma/seed.ts

exec npx next start
