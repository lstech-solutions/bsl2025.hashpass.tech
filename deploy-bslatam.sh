#!/usr/bin/env bash
set -euo pipefail

echo "Building web..."
npm run build:web

echo "Applying Supabase migrations..."

MIGRATIONS_DIR="supabase/migrations"

apply_with_psql() {
  echo "Applying migrations using psql..."
  for f in $(ls -1 ${MIGRATIONS_DIR}/*.sql | sort); do
    echo " - Applying $f"
    PGPASSWORD="${SUPABASE_DB_PASSWORD:-}" psql "${EXPO_PUBLIC_SUPABASE_URL}" -v ON_ERROR_STOP=1 -f "$f"
  done
}

apply_with_supabase_cli() {
  echo "Applying migrations using Supabase CLI..."
  # Requires: SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN
  # If already linked, db push will use the linked project; otherwise, try link non-interactively
  if supabase status >/dev/null 2>&1; then
    echo " - Supabase project is linked."
  else
    if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
      echo " - Linking project ${SUPABASE_PROJECT_REF}"
      # Best-effort link (may already be linked); suppress prompt
      supabase link --project-ref "${SUPABASE_PROJECT_REF}" || true
    fi
  fi
  supabase db push || {
    echo "Supabase CLI push failed. Ensure SUPABASE_ACCESS_TOKEN and project link are configured." 1>&2
    exit 1
  }
}

if [[ -n "${SUPABASE_DB_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  apply_with_psql
elif command -v supabase >/dev/null 2>&1; then
  apply_with_supabase_cli
else
  echo "No migration method available. Set SUPABASE_DB_URL and install psql, or install Supabase CLI and set SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF." 1>&2
  exit 1
fi

echo "Seeding speakers..."
node ./scripts/seed-bslatam.mjs ./speakers.json || true

if command -v amplify >/dev/null 2>&1; then
  echo "Deploying to Amplify..."
  amplify publish --yes || {
    echo "Amplify publish failed. Verify AWS credentials and Amplify app configuration." 1>&2
    exit 1
  }
else
  echo "Amplify CLI not found. Please run 'amplify publish' manually with proper AWS credentials configured."
fi

echo "Done."


