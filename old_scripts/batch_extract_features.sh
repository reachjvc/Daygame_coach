#!/usr/bin/env bash
# Batch extract audio features for all files in a channel.
#
# Note:
#   This is a legacy helper for the older `training-data/` pipeline layout.
#   For the normalized `data/` layout, use:
#     ./scripts/training-data/03.audio-features "<source_name>" "<youtube_url>"
#
# Usage:
#   ./scripts/batch_extract_features.sh "SocialStoic"
#
# Output:
#   training-data/features/<ChannelName>/*.features.json

set -euo pipefail

CHANNEL_NAME="${1:-}"
if [[ -z "$CHANNEL_NAME" ]]; then
  echo "Usage: $0 <channel_name>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Env lives one folder up now:
# scripts/training-data/training_data_env.sh
# shellcheck disable=SC1090
source "$SCRIPT_DIR/../training_data_env.sh"

AUDIO_DIR="training-data/raw-audio/$CHANNEL_NAME"
TRANSCRIPT_DIR="training-data/transcripts/$CHANNEL_NAME"
OUTPUT_DIR="training-data/features/$CHANNEL_NAME"

PY_SCRIPT="$SCRIPT_DIR/extract_audio_features.py"

if [[ ! -d "$AUDIO_DIR" ]]; then
  echo "⚠️  No audio dir found: $AUDIO_DIR" >&2
  exit 0
fi

if [[ ! -d "$TRANSCRIPT_DIR" ]]; then
  echo "⚠️  No transcript dir found: $TRANSCRIPT_DIR" >&2
  exit 0
fi

if [[ ! -f "$PY_SCRIPT" ]]; then
  echo "❌ Missing extractor: $PY_SCRIPT" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

shopt -s nullglob
audio_files=(
  "$AUDIO_DIR"/*.opus
  "$AUDIO_DIR"/*.mp3
  "$AUDIO_DIR"/*.wav
  "$AUDIO_DIR"/*.m4a
  "$AUDIO_DIR"/*.webm
  "$AUDIO_DIR"/*.mkv
  "$AUDIO_DIR"/*.mp4
)

if [[ "${#audio_files[@]}" -eq 0 ]]; then
  echo "⚠️  No audio files found in: $AUDIO_DIR"
  exit 0
fi

for audio_file in "${audio_files[@]}"; do
  filename="$(basename "$audio_file")"
  stem="${filename%.*}"

  # Always use raw Whisper timestamps
  timestamps_file="$TRANSCRIPT_DIR/${stem}.json"
  output_file="$OUTPUT_DIR/${stem}.features.json"

  if [[ -f "$output_file" ]]; then
    continue
  fi

  if [[ ! -f "$timestamps_file" ]]; then
    echo "WARNING: No Whisper timestamps found for $stem ($timestamps_file)" >&2
    continue
  fi

  echo "[batch features] $stem"
  python "$PY_SCRIPT" \
    --audio "$audio_file" \
    --timestamps "$timestamps_file" \
    --output "$output_file"
done

echo "✅ Feature extraction complete for channel: $CHANNEL_NAME"
