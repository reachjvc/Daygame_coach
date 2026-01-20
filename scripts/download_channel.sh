#!/bin/bash
# scripts/download_channel.sh
# Downloads videos from a YouTube channel or playlist
#
# Usage:
#   ./scripts/download_channel.sh "SocialStoic" "https://www.youtube.com/@SocialStoic/videos"
#   ./scripts/download_channel.sh "MyPlaylist" "https://www.youtube.com/playlist?list=PLxxx"
#   ./scripts/download_channel.sh "Single" "https://www.youtube.com/watch?v=xxx"

set -euo pipefail

CHANNEL_NAME="${1:-}"
YOUTUBE_URL="${2:-}"

if [ -z "$CHANNEL_NAME" ] || [ -z "$YOUTUBE_URL" ]; then
  echo "Usage: $0 <channel_name> <youtube_url>"
  echo ""
  echo "Examples:"
  echo "  $0 'SocialStoic' 'https://www.youtube.com/@SocialStoic/videos'"
  echo "  $0 'MyPlaylist' 'https://www.youtube.com/playlist?list=PLxxx'"
  echo "  $0 'Single' 'https://www.youtube.com/watch?v=xxx'"
  exit 1
fi

OUTPUT_DIR="training-data/raw-audio/$CHANNEL_NAME"
ARCHIVE_FILE="$OUTPUT_DIR/.youtube-dl-archive.txt"

mkdir -p "$OUTPUT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Optional cookies to reduce 403s / bot challenges.
COOKIES_FILE="${YOUTUBE_COOKIES_FILE:-"$ROOT_DIR/www.youtube.com_cookies.txt"}"
COOKIES_ARGS=()
if [[ -f "$COOKIES_FILE" ]]; then
  COOKIES_ARGS=(--cookies "$COOKIES_FILE")
fi

# yt-dlp increasingly requires a JavaScript runtime for YouTube extraction.
# Prefer node if available (deno is not installed by default in many environments).
JS_RUNTIME_ARGS=()
if command -v node &> /dev/null; then
  JS_RUNTIME_ARGS=(--js-runtimes "node:$(command -v node)")
fi

echo "📥 Downloading videos for: $CHANNEL_NAME"
echo "   URL: $YOUTUBE_URL"
echo "   Output: $OUTPUT_DIR"
if [[ "${#COOKIES_ARGS[@]}" -gt 0 ]]; then
  echo "   Cookies: $COOKIES_FILE"
fi
if [[ "${#JS_RUNTIME_ARGS[@]}" -gt 0 ]]; then
  echo "   JS runtime: ${JS_RUNTIME_ARGS[*]}"
fi
echo ""

# Use youtube-dl or yt-dlp (whichever is available)
DOWNLOADER="yt-dlp"
if ! command -v yt-dlp &> /dev/null; then
  if command -v youtube-dl &> /dev/null; then
    DOWNLOADER="youtube-dl"
  else
    echo "❌ Error: Neither yt-dlp nor youtube-dl found"
    echo "Install with: pip install yt-dlp"
    exit 1
  fi
fi

echo "Using: $DOWNLOADER"
echo ""

# Download with archive file to avoid re-downloading.
# Some videos may be unavailable (age-restricted, removed, etc). We want to keep
# downloading what we can, and avoid failing the whole run.
set +e
$DOWNLOADER \
  --format "best" \
  --output "$OUTPUT_DIR/%(title)s.%(ext)s" \
  --download-archive "$ARCHIVE_FILE" \
  --no-post-overwrites \
  --ignore-errors \
  --quiet \
  --progress \
  "${COOKIES_ARGS[@]}" \
  "${JS_RUNTIME_ARGS[@]}" \
  "$YOUTUBE_URL"
DL_STATUS=$?
set -e

if [[ "$DL_STATUS" -ne 0 ]]; then
  echo ""
  echo "⚠️  Download finished with errors (exit code $DL_STATUS). Some videos may have been skipped."
  echo "   If this is due to age verification, refresh cookies in: $COOKIES_FILE"
fi

AUDIO_COUNT=$(ls "$OUTPUT_DIR"/*.{opus,mp3,webm,m4a,wav,mkv,mp4} 2>/dev/null | wc -l || echo "0")
echo ""
echo "✅ Download complete!"
echo "   Total audio files: $AUDIO_COUNT"
echo "   Tracking file: $ARCHIVE_FILE (prevents re-downloading)"
echo ""
echo "Next steps:"
echo "  1. ./scripts/process_channel.sh '$CHANNEL_NAME'"
echo "  2. ./scripts/quick_ingest.sh"
echo ""
echo "Tip:"
echo "  To include this source in the default list, add this line to training-data/sources.txt:"
echo "    $CHANNEL_NAME|$YOUTUBE_URL"
