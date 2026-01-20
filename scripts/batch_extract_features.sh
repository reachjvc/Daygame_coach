#!/usr/bin/env bash
# Batch extract audio features for all files in a channel.
# Usage: ./scripts/batch_extract_features.sh SocialStoic [--embed]

set -euo pipefail

CHANNEL_NAME="${1:-SocialStoic}"
EMBED_FLAG=""
if [[ "${2:-}" == "--embed" ]]; then
  EMBED_FLAG="--embed"
fi

AUDIO_DIR="training-data/raw-audio/$CHANNEL_NAME"
TRANSCRIPT_DIR="training-data/transcripts/$CHANNEL_NAME"
CLASSIFIED_DIR="training-data/classified/$CHANNEL_NAME"
OUTPUT_DIR="training-data/features/$CHANNEL_NAME"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/training_data_env.sh"

mkdir -p "$OUTPUT_DIR"

shopt -s nullglob
for audio_file in \
  "$AUDIO_DIR"/*.opus \
  "$AUDIO_DIR"/*.mp3 \
  "$AUDIO_DIR"/*.wav \
  "$AUDIO_DIR"/*.m4a \
  "$AUDIO_DIR"/*.webm \
  "$AUDIO_DIR"/*.mkv \
  "$AUDIO_DIR"/*.mp4; do
  [ -e "$audio_file" ] || continue
  filename=$(basename "$audio_file")
  stem="${filename%.*}"
  # Prefer classified transcripts if present, otherwise fall back to raw Whisper JSON.
  if [ -f "$CLASSIFIED_DIR/${stem}.classified.json" ]; then
    timestamps_file="$CLASSIFIED_DIR/${stem}.classified.json"
  elif [ -f "$TRANSCRIPT_DIR/${stem}.classified.json" ]; then
    timestamps_file="$TRANSCRIPT_DIR/${stem}.classified.json"
  else
    timestamps_file="$TRANSCRIPT_DIR/${stem}.json"
  fi
  output_file="$OUTPUT_DIR/${stem}.features.json"

  if [ -f "$output_file" ]; then
    continue
  fi

  if [ -f "$timestamps_file" ]; then
    echo "[batch features] $stem"
    python scripts/extract_audio_features.py \
      --audio "$audio_file" \
      --timestamps "$timestamps_file" \
      --output "$output_file" \
      $EMBED_FLAG
  else
    echo "WARNING: No timestamps found for $stem" >&2
  fi
done

echo "Feature extraction complete for channel: $CHANNEL_NAME"
