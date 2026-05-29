#!/usr/bin/env bash
# Repair script: convert audio files that are missing ASR WAV outputs.
# Uses the same FFmpeg params as 01.EXT.download (lines 514-520).
set -euo pipefail

ASR_SAMPLE_RATE="${ASR_SAMPLE_RATE:-16000}"
ASR_RESYNC_FILTER="${ASR_RESYNC_FILTER:-aresample=async=1:first_pts=0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOWNLOAD_DIR="$ROOT_DIR/data/01.download"

converted=0
failed=0
skipped=0

# Build a list of files needing conversion into a temp file (avoids pipe corruption with long paths)
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

find "$DOWNLOAD_DIR" -type f \( \
    -iname "*.audio.webm" -o \
    -iname "*.audio.m4a"  -o \
    -iname "*.audio.mp3"  -o \
    -iname "*.audio.mp4"  -o \
    -iname "*.audio.mkv"  -o \
    -iname "*.audio.opus" -o \
    -iname "*.audio.mka" \
  \) -print0 > "$tmpfile"

while IFS= read -r -d '' in_audio; do
  stem="${in_audio%.*}"
  raw_out="${stem}.asr.raw16k.wav"
  if [[ -f "$raw_out" ]]; then
    skipped=$((skipped + 1))
    continue
  fi
  echo "Converting: $in_audio"
  if ffmpeg -hide_banner -loglevel warning -y \
    -i "$in_audio" \
    -map 0:a:0? -vn -sn -dn \
    -ac 1 -ar "$ASR_SAMPLE_RATE" -c:a pcm_s16le \
    -af "$ASR_RESYNC_FILTER" \
    "$raw_out" </dev/null 2>&1; then
    echo "  OK"
    converted=$((converted + 1))
  else
    echo "  FAILED"
    failed=$((failed + 1))
    rm -f "$raw_out"  # clean up partial output
  fi
done < "$tmpfile"

echo ""
echo "=== REPAIR SUMMARY ==="
echo "Converted: $converted"
echo "Failed:    $failed"
echo "Skipped:   $skipped (already had WAV)"
