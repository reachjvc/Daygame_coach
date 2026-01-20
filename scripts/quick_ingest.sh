#!/bin/bash
# scripts/quick_ingest.sh
# Quick way to re-ingest training data without reprocessing
# Use this after you've fixed transcription files or made manual edits
#
# Usage:
#   ./scripts/quick_ingest.sh           # Just ingest, no processing
#   ./scripts/quick_ingest.sh verify    # Check what will be ingested first
#   ./scripts/quick_ingest.sh full      # Force re-ingest everything

set -euo pipefail

MODE="${1:-}"

echo "🚀 Quick Ingest Pipeline"
echo ""

if [ "$MODE" == "verify" ]; then
  echo "Checking training data structure..."
  npm run check-stats
  echo ""
  echo "Would ingest with current state. Run without 'verify' to proceed."
  exit 0
fi

echo "📊 Current training data:"
npm run check-stats

echo ""
echo "🧠 Ingesting to vector store..."
echo "(Incremental: only new/changed transcript sources are re-embedded)"
echo ""

if [ "$MODE" == "full" ] || [ "$MODE" == "--full" ]; then
  echo "⚠️  Full mode: forcing re-ingest of all sources"
  npm run ingest -- --full
else
  npm run ingest
fi

echo ""
echo "✅ Ingest complete!"
