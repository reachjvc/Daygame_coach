#!/usr/bin/env bash
# THE TEST BACKEND'S SCHEMA, TAKEN FROM PRODUCTION RATHER THAN WRITTEN BY HAND.
#
# supabase/migrations/ cannot build the schema from nothing: the second file
# alters `user_goals`, which no migration creates, and eighteen tables were made
# outside migrations. So the test backend starts from a schema-only dump of the
# linked project (no rows are read), stamped with the newest migration that
# project has applied. scripts/db/test-stack.mjs applies every repo migration
# newer than the stamp on top, so a new migration reaches the tests the day it
# is written.
#
#   scripts/db/baseline.sh          rewrite tests/db/baseline.sql
#   scripts/db/baseline.sh --check  exit 1 if production's schema has drifted
#                                   from the committed baseline (a change made
#                                   in the dashboard instead of a migration)
#
# Needs the Supabase CLI logged in and linked (`supabase projects list` shows
# the linked project). The CLI creates a temporary login role on the project to
# run the dump; it reads schema only.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="tests/db/baseline.sql"

# The newest migration production has applied: the largest version in the
# REMOTE column of `supabase migration list --linked`.
stamp=$(supabase migration list --linked 2>/dev/null \
  | awk -F'|' 'NF >= 3 { r = $2; gsub(/ /, "", r); if (r ~ /^[0-9]+$/) print r }' \
  | sort -n | tail -1)
if [[ -z "$stamp" ]]; then
  echo "Could not read the linked project's applied migrations." >&2
  echo "Run \`supabase migration list --linked\` and fix whatever it says first." >&2
  exit 1
fi

dump=$(mktemp)
trap 'rm -f "$dump"' EXIT
supabase db dump --linked -f "$dump" >/dev/null

if [[ "${1:-}" == "--check" ]]; then
  if diff -q <(tail -n +4 "$OUT") "$dump" >/dev/null; then
    echo "Baseline matches production (stamp $stamp)."
    exit 0
  fi
  echo "Production's schema differs from $OUT." >&2
  echo "If a migration explains it, run scripts/db/baseline.sh to refresh the baseline;" >&2
  echo "if not, somebody changed production outside a migration — find out what first." >&2
  diff <(tail -n +4 "$OUT") "$dump" | head -40 >&2
  exit 1
fi

{
  echo "-- baseline-stamp: $stamp"
  echo "-- Schema only (no rows), dumped from the linked Supabase project by scripts/db/baseline.sh."
  echo "-- Do not edit by hand: write a migration, then re-run the script once production has it."
  cat "$dump"
} > "$OUT"
echo "Wrote $OUT (stamp $stamp, $(grep -c '^CREATE TABLE' "$OUT") tables)."
