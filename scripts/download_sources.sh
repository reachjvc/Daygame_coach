#!/usr/bin/env bash
# Download all configured training-data sources.
#
# Usage:
#   ./scripts/download_sources.sh
#   ./scripts/download_sources.sh training-data/sources.txt

set -euo pipefail

SOURCES_FILE="${1:-training-data/sources.txt}"

if [[ ! -f "$SOURCES_FILE" ]]; then
  echo "❌ Sources file not found: $SOURCES_FILE" >&2
  exit 1
fi

echo "📥 Downloading sources from: $SOURCES_FILE"
echo ""

while IFS= read -r line; do
  # Skip blanks and comments
  [[ -z "${line//[[:space:]]/}" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  if [[ "$line" != *"|"* ]]; then
    echo "⚠️  Skipping invalid line (missing '|'): $line" >&2
    continue
  fi

  CHANNEL_NAME="${line%%|*}"
  YOUTUBE_URL="${line#*|}"

  if [[ -z "$CHANNEL_NAME" || -z "$YOUTUBE_URL" ]]; then
    echo "⚠️  Skipping invalid line (empty name/url): $line" >&2
    continue
  fi

  echo "================================"
  echo "Downloading: $CHANNEL_NAME"
  echo "================================"
  ./scripts/download_channel.sh "$CHANNEL_NAME" "$YOUTUBE_URL"
  echo ""
done < "$SOURCES_FILE"

echo "✅ All downloads finished."

