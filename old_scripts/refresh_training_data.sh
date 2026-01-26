#!/usr/bin/env bash
# Fully automated training data refresh:
# 1) Download all configured sources
# 2) Transcribe + process + ingest
#
# Usage:
#   ./scripts/refresh_training_data.sh
#
# Flags:
#   --skip-download   Skip downloads (process what's already on disk)
#   --ingest-only     Skip processing (just ingest existing transcripts)

set -euo pipefail

SKIP_DOWNLOAD=false
INGEST_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --skip-download) SKIP_DOWNLOAD=true ;;
    --ingest-only) INGEST_ONLY=true ;;
    *) ;;
  esac
done

if [[ "$SKIP_DOWNLOAD" == "false" ]]; then
  ./scripts/download_sources.sh
fi

if [[ "$INGEST_ONLY" == "true" ]]; then
  ./scripts/full_pipeline.sh --ingest-only
else
  ./scripts/full_pipeline.sh
fi

