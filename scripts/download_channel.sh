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
COOKIES_FROM_BROWSER="${YOUTUBE_COOKIES_FROM_BROWSER:-}"
COOKIES_ARGS=()
COOKIES_NOTE=""
if [[ -n "$COOKIES_FROM_BROWSER" ]]; then
  COOKIES_ARGS=(--cookies-from-browser "$COOKIES_FROM_BROWSER")
  COOKIES_NOTE="(from browser)"
elif [[ -f "$COOKIES_FILE" ]]; then
  COOKIES_ARGS=(--cookies "$COOKIES_FILE")

  # yt-dlp treats YouTube cookies as authenticated only when LOGIN_INFO exists.
  # Without it, public videos will download but age-restricted / private videos will fail.
  if ! head -n 1 "$COOKIES_FILE" 2>/dev/null | grep -q "Netscape HTTP Cookie File"; then
    COOKIES_NOTE="(unexpected format; expected Netscape cookies.txt)"
  elif grep -q $'\tLOGIN_INFO\t' "$COOKIES_FILE"; then
    COOKIES_NOTE="(account cookies: OK)"
  else
    COOKIES_NOTE="(not detected as logged-in; missing LOGIN_INFO; age-restricted/private may fail)"

    # Best-effort fallback: if the user didn't explicitly choose cookies, try pulling them
    # directly from a local browser profile (Linux). This can restore age-restricted access
    # after a cookie export or browser rotation.
    detected_browser=""
    if [[ -d "$HOME/.config/google-chrome" ]]; then
      detected_browser="chrome"
    elif [[ -d "$HOME/.config/chromium" ]]; then
      detected_browser="chromium"
    elif [[ -d "$HOME/.config/BraveSoftware/Brave-Browser" ]]; then
      detected_browser="brave"
    elif [[ -d "$HOME/.mozilla/firefox" ]]; then
      detected_browser="firefox"
    fi

    if [[ -n "$detected_browser" ]]; then
      COOKIES_ARGS=(--cookies-from-browser "$detected_browser")
      COOKIES_NOTE="(auto from browser: $detected_browser)"
    fi
  fi
elif [[ -n "${YOUTUBE_COOKIES_FILE:-}" ]]; then
  COOKIES_NOTE="(missing file: $COOKIES_FILE)"
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
  if [[ -n "$COOKIES_FROM_BROWSER" ]]; then
    echo "   Cookies: $COOKIES_FROM_BROWSER $COOKIES_NOTE"
  else
    echo "   Cookies: $COOKIES_FILE $COOKIES_NOTE"
  fi
elif [[ -n "$COOKIES_NOTE" ]]; then
  echo "   Cookies: $COOKIES_NOTE"
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

SAFE_CHANNEL_NAME="$(echo "$CHANNEL_NAME" | tr -cs 'A-Za-z0-9._-' '_' | sed 's/^_\\+//;s/_\\+$//')"
LOG_FILE="training-data/download-${SAFE_CHANNEL_NAME}.log"
ISSUES_FILE="training-data/download-${SAFE_CHANNEL_NAME}-issues.tsv"

# Download with archive file to avoid re-downloading.
# Some videos may be unavailable (age-restricted, removed, etc). We want to keep
# downloading what we can, and avoid failing the whole run.
set +e
$DOWNLOADER \
  --format "bestaudio/best" \
  --output "$OUTPUT_DIR/%(title)s.%(ext)s" \
  --download-archive "$ARCHIVE_FILE" \
  --no-post-overwrites \
  --ignore-errors \
  --quiet \
  --progress \
  --newline \
  "${COOKIES_ARGS[@]}" \
  "${JS_RUNTIME_ARGS[@]}" \
  "$YOUTUBE_URL" 2>&1 | tee "$LOG_FILE"
DL_STATUS=${PIPESTATUS[0]}
set -e

{
  echo -e "video_id\treason"
  grep -E "ERROR: \\[youtube\\] [A-Za-z0-9_-]{6,}:|WARNING: \\[youtube:tab\\] YouTube said: INFO - [0-9]+ unavailable videos are hidden|WARNING: \\[youtube\\] The provided YouTube account cookies are no longer valid" "$LOG_FILE" \
    | awk -F': ' '
      BEGIN { OFS="\t" }
      /^ERROR: \\[youtube\\] / {
        id=$2
        sub(/^\\[youtube\\][[:space:]]+/, "", id)
        reason=$3
        sub(/[[:space:]]+$/, "", reason)
        print id, reason
        next
      }
      /^WARNING: \\[youtube:tab\\] YouTube said: INFO - / {
        print "-", $3
        next
      }
      /^WARNING: \\[youtube\\] The provided YouTube account cookies are no longer valid/ {
        print "-", "cookies rotated/invalid per yt-dlp (re-export while logged in)"
        next
      }
    '
} > "$ISSUES_FILE"

ISSUE_COUNT="$(tail -n +2 "$ISSUES_FILE" | wc -l | tr -d ' ')"

if [[ "$DL_STATUS" -ne 0 ]]; then
  echo ""
  echo "⚠️  Download finished with errors (exit code $DL_STATUS). Some videos may have been skipped."
  echo "   Common causes: age-restricted videos, private/deleted videos, or missing/unauthenticated cookies."
  if [[ -z "$COOKIES_FROM_BROWSER" && -f "$COOKIES_FILE" ]] && ! grep -q $'\tLOGIN_INFO\t' "$COOKIES_FILE"; then
    echo "   Your cookie file was not detected as a logged-in YouTube export (missing LOGIN_INFO)."
    echo "   Fix: re-export cookies while logged in, or set YOUTUBE_COOKIES_FROM_BROWSER (e.g. chrome/firefox)."
  fi
fi

AUDIO_COUNT="$(find "$OUTPUT_DIR" -maxdepth 1 -type f \( \
  -iname '*.opus' -o -iname '*.mp3' -o -iname '*.webm' -o -iname '*.m4a' -o -iname '*.wav' -o -iname '*.mkv' -o -iname '*.mp4' \
\) -print | wc -l | tr -d ' ')"
echo ""
echo "✅ Download complete!"
echo "   Total audio files: $AUDIO_COUNT"
echo "   Download log: $LOG_FILE"
echo "   Issues (TSV):  $ISSUES_FILE ($ISSUE_COUNT)"
echo "   Tracking file: $ARCHIVE_FILE (prevents re-downloading)"
echo ""
echo "Next steps:"
echo "  1. ./scripts/process_channel.sh '$CHANNEL_NAME'"
echo "  2. ./scripts/quick_ingest.sh"
echo ""
echo "Tip:"
echo "  To include this source in the default list, add this line to training-data/sources.txt:"
echo "    $CHANNEL_NAME|$YOUTUBE_URL"
