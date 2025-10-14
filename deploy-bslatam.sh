#!/usr/bin/env bash
set -euo pipefail

echo "Building web..."
npm run build:web

echo "Running migrations (manual step via Supabase Studio or CLI)"
echo "Apply migration: supabase/migrations/20251014090000_bslatam_matchmaking.sql"

echo "Seeding speakers..."
TS_NODE_TRANSPILE_ONLY=1 node --loader ts-node/esm ./scripts/seed-bslatam.ts ./speakers.json || true

echo "Amplify deployment: please run 'amplify publish' with proper AWS credentials configured."
echo "If Amplify CLI is not configured, follow instructions in README."

echo "Done."


