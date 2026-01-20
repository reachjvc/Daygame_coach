#!/bin/bash
# scripts/full_pipeline.sh
# Automates the entire training data pipeline for one or all channels.
#
# Usage:
#   ./scripts/full_pipeline.sh                    # Process all channels
#   ./scripts/full_pipeline.sh "SocialStoic"      # Process specific channel
#   ./scripts/full_pipeline.sh --ingest-only      # Skip processing, just ingest

set -euo pipefail

DEFAULT_SOURCES_FILE="training-data/sources.txt"
FALLBACK_CHANNELS=("SocialStoic" "The Natural Lifestyles" "NaturalLifestyles-Infield" "NaturalLifestyles-InnerGrowth" "NaturalLifestyles-Students" "TheNaturalLifestyles-FemalePsychology")
CHANNELS=("${FALLBACK_CHANNELS[@]}")
SPECIFIC_CHANNEL="${1:-}"
INGEST_ONLY=false

# Read channel names from a sources file:
#   ChannelName|YouTubeURL
read_channels_from_sources() {
  local sources_file="$1"
  local line channel
  declare -A seen=()
  local -a out=()

  [[ -f "$sources_file" ]] || return 1

  while IFS= read -r line; do
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *"|"* ]] && continue

    channel="${line%%|*}"
    channel="${channel#"${channel%%[![:space:]]*}"}"
    channel="${channel%"${channel##*[![:space:]]}"}"

    [[ -z "$channel" ]] && continue
    if [[ -z "${seen["$channel"]+x}" ]]; then
      seen["$channel"]=1
      out+=("$channel")
    fi
  done < "$sources_file"

  if [[ "${#out[@]}" -eq 0 ]]; then
    return 1
  fi

  CHANNELS=("${out[@]}")
  return 0
}

# Handle flags
if [ "$SPECIFIC_CHANNEL" == "--ingest-only" ]; then
  INGEST_ONLY=true
  SPECIFIC_CHANNEL=""
fi

echo "🚀 Starting training data pipeline..."
echo "   INGEST_ONLY: $INGEST_ONLY"
echo "   SPECIFIC_CHANNEL: ${SPECIFIC_CHANNEL:-all}"
echo "   SOURCES_FILE: ${TRAINING_DATA_SOURCES_FILE:-$DEFAULT_SOURCES_FILE}"
echo ""

# If a specific channel is provided, only process that one
if [ -n "$SPECIFIC_CHANNEL" ]; then
  CHANNELS=("$SPECIFIC_CHANNEL")
else
  read_channels_from_sources "${TRAINING_DATA_SOURCES_FILE:-$DEFAULT_SOURCES_FILE}" || true
fi

if [ "$INGEST_ONLY" = false ]; then
  for CHANNEL in "${CHANNELS[@]}"; do
    AUDIO_DIR="training-data/raw-audio/$CHANNEL"
    
    if [ ! -d "$AUDIO_DIR" ]; then
      echo "⚠️  Skipping $CHANNEL (no raw audio directory)"
      continue
    fi
    
    AUDIO_COUNT=$(
      find "$AUDIO_DIR" -maxdepth 1 -type f \( \
        -iname "*.opus" -o -iname "*.mp3" -o -iname "*.webm" -o -iname "*.m4a" -o -iname "*.wav" -o -iname "*.mkv" -o -iname "*.mp4" \
      \) -print 2>/dev/null | wc -l
    )
    if [ "$AUDIO_COUNT" -eq 0 ]; then
      echo "⚠️  Skipping $CHANNEL (no audio files)"
      continue
    fi
    
    echo "================================"
    echo "Processing: $CHANNEL ($AUDIO_COUNT files)"
    echo "================================"
    
    # Run the processing pipeline
    if ./scripts/process_channel.sh "$CHANNEL" 2>&1 | tee "training-data/pipeline-${CHANNEL}.log"; then
      echo "✅ $CHANNEL processed successfully"
    else
      echo "❌ $CHANNEL processing failed (see log: training-data/pipeline-${CHANNEL}.log)"
    fi
    
    echo ""
  done
else
  echo "⏭️  Skipping processing (--ingest-only mode)"
fi

echo "================================"
echo "🧠 Ingesting to vector store..."
echo "================================"

if npm run ingest 2>&1 | tee "training-data/ingest.log"; then
  echo "✅ Ingestion successful"
else
  echo "❌ Ingestion failed (see log: training-data/ingest.log)"
  exit 1
fi

echo ""
echo "✅ Pipeline complete!"
echo ""

echo "================================"
echo "🔎 Verifying generated datasets..."
echo "================================"
python3 scripts/verify_pipeline.py || true
python3 scripts/check_progress.py || true

echo ""
echo "📊 Stats:"
if npm run check-stats; then
  :
else
  echo "⚠️  npm run check-stats failed (non-fatal)."
fi
