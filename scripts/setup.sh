#!/bin/bash
# Setup development environment for AI SEO OS
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Installing root dependencies..."
cd "$ROOT_DIR"
npm install

echo "==> Installing server dependencies..."
cd "$ROOT_DIR/server"
npm install

echo "==> Checking for .env..."
if [ ! -f "$ROOT_DIR/.env" ]; then
  if [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "    Created .env from .env.example. Please edit .env with your keys."
  else
    echo "    No .env found. Copy .env.example to .env and set SUPABASE_*, GEMINI_API_KEY, REDIS_URL, JWT_SECRET."
  fi
else
  echo "    .env already exists."
fi

if [ ! -f "$ROOT_DIR/server/.env" ]; then
  if [ -f "$ROOT_DIR/server/.env.example" ]; then
    cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
    echo "    Created server/.env from server/.env.example."
  fi
fi

echo "==> Setup complete."
echo "    Next steps:"
echo "    1. Edit .env and server/.env with your Supabase, Gemini, Redis, and JWT values."
echo "    2. Start Redis (e.g. redis-server)."
echo "    3. Backend:  cd server && npm run dev"
echo "    4. Frontend: npm run dev"
echo "    5. Workers:  cd server && npm run worker (optional)"
