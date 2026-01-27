#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/home/jonaswsl/projects/daygame-coach/data/01.download}"

ASR_SR="${ASR_SR:-16000}"
RESYNC="${RESYNC:-aresample=async=1:first_pts=0}"
CLEAN="${CLEAN:-highpass=f=80,lowpass=f=8000,afftdn=nf=-25,alimiter=limit=0.97}"

while IFS= read -r -d '' f; do
  stem="${f%.*}"
  raw="${stem}.asr.raw16k.wav"
  clean="${stem}.asr.clean16k.wav"

  if [[ ! -f "$raw" ]]; then
    echo "RAW  -> $raw"
    ffmpeg -nostdin -hide_banner -loglevel warning -y \
      -i "$f" -map 0:a:0? -vn -sn -dn \
      -ac 1 -ar "$ASR_SR" -c:a pcm_s16le \
      -af "$RESYNC" \
      "$raw" </dev/null || echo "FAILED raw: $f"
  fi

  if [[ ! -f "$clean" ]]; then
    echo "CLEAN-> $clean"
    ffmpeg -nostdin -hide_banner -loglevel warning -y \
      -i "$f" -map 0:a:0? -vn -sn -dn \
      -ac 1 -ar "$ASR_SR" -c:a pcm_s16le \
      -af "$CLEAN,$RESYNC" \
      "$clean" </dev/null || echo "FAILED clean: $f"
  fi
done < <(
  find "$ROOT" -type f \( \
    -iname "*.audio.webm" -o -iname "*.audio.m4a" -o -iname "*.audio.mp3" -o \
    -iname "*.audio.mp4"  -o -iname "*.audio.mkv" -o -iname "*.audio.opus" -o \
    -iname "*.audio.mka" \
  \) -print0
)
