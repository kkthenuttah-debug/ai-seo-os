#!/bin/bash
# Run database migrations for AI SEO OS
# Uses Supabase CLI if available; otherwise prints manual steps.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

echo "==> Checking migrations directory..."
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "    Migrations dir not found: $MIGRATIONS_DIR"
  exit 1
fi

if command -v supabase &> /dev/null; then
  echo "==> Running migrations via Supabase CLI..."
  cd "$ROOT_DIR"
  supabase db push
  echo "    Migrations applied."
else
  echo "==> Supabase CLI not found. Apply migrations manually:"
  echo "    1. Install: npm install -g supabase"
  echo "    2. Link:    supabase link --project-ref YOUR_REF"
  echo "    3. Push:   supabase db push"
  echo "    Or run the SQL in supabase/migrations/ in the Supabase SQL editor."
  exit 1
fi

echo "==> Done."
