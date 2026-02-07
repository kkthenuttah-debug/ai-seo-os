#!/bin/bash
# Seed database with test data (projects, pages, users placeholders).
# Requires migrations to be applied first. Edit supabase/seed.sql to use real auth user IDs.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SEED_FILE="$ROOT_DIR/supabase/seed.sql"

echo "==> Checking seed file..."
if [ ! -f "$SEED_FILE" ]; then
  echo "    Seed file not found: $SEED_FILE"
  exit 1
fi

if command -v supabase &> /dev/null; then
  echo "==> Seeding via Supabase CLI..."
  cd "$ROOT_DIR"
  supabase db execute -f supabase/seed.sql
  echo "    Seed data applied."
else
  echo "==> Supabase CLI not found. To seed manually:"
  echo "    1. Open Supabase Dashboard -> SQL Editor"
  echo "    2. Replace auth_user_uuid_1/2 in supabase/seed.sql with real auth.users id values"
  echo "    3. Run the contents of supabase/seed.sql"
  echo "    Or install Supabase CLI and run: supabase db execute -f supabase/seed.sql"
  exit 1
fi

echo "==> Done."
