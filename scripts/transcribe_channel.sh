#!/usr/bin/env bash
# Transcribe all audio files for a channel with Whisper.
#
# Usage:
#   ./scripts/transcribe_channel.sh "SocialStoic"
#   WHISPER_MODEL=medium ./scripts/transcribe_channel.sh "SocialStoic"
#
# Output:
#   training-data/transcripts/<Channel>/*.json + *.txt + *.srt + *.vtt + *.tsv

set -euo pipefail

CHANNEL_NAME="${1:-}"
if [[ -z "$CHANNEL_NAME" ]]; then
  echo "Usage: $0 <channel_name>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/training_data_env.sh"

MODEL="${WHISPER_MODEL:-base}"
LANGUAGE="${WHISPER_LANGUAGE:-en}"

AUDIO_DIR="training-data/raw-audio/$CHANNEL_NAME"
OUT_DIR="training-data/transcripts/$CHANNEL_NAME"

if [[ ! -d "$AUDIO_DIR" ]]; then
  echo "⚠️  No audio dir: $AUDIO_DIR (skipping)"
  exit 0
fi

mkdir -p "$OUT_DIR"

if ! command -v whisper >/dev/null 2>&1; then
  echo "❌ 'whisper' CLI not found in the active environment." >&2
  echo "   Install it inside your Whisper env:" >&2
  echo "     pip install -U openai-whisper" >&2
  exit 1
fi

echo "📝 Transcribing channel: $CHANNEL_NAME"
echo "   Model: $MODEL"
echo "   Language: $LANGUAGE"
echo "   Audio: $AUDIO_DIR"
echo "   Output: $OUT_DIR"
echo ""

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

transcribed=0
skipped=0

for audio_file in "${audio_files[@]}"; do
  filename="$(basename "$audio_file")"
  stem="${filename%.*}"
  json_out="$OUT_DIR/${stem}.json"

  if [[ -f "$json_out" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "[whisper] $stem"
  whisper "$audio_file" \
    --model "$MODEL" \
    --task transcribe \
    --output_format all \
    --output_dir "$OUT_DIR" \
    --language "$LANGUAGE"

  transcribed=$((transcribed + 1))
done

echo ""
echo "✅ Transcription complete for $CHANNEL_NAME"
echo "   Transcribed: $transcribed"
echo "   Skipped:     $skipped"

