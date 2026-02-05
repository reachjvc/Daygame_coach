#!/usr/bin/env bash
# scripts/training-data/download-missing-audio.sh
#
# Downloads audio for videos that have info.json but no audio files.
# Uses yt-dlp with cookies for authentication.
#
# Usage:
#   ./scripts/training-data/download-missing-audio.sh [--dry-run] [--limit N]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$ROOT_DIR/data/01.download"
LOG_FILE="$DATA_DIR/download-missing.log"
COOKIES_FILE="$ROOT_DIR/docs/data_docs/www.youtube.com_cookies.txt"

# Pacing to avoid bot detection
SLEEP_MIN_SEC="${SLEEP_MIN_SEC:-30}"
SLEEP_MAX_SEC="${SLEEP_MAX_SEC:-90}"

DRY_RUN=0
LIMIT=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ $DRY_RUN -eq 1 ]]; then
    echo -e "${YELLOW}DRY RUN MODE - no downloads will be performed${NC}"
fi

# Check dependencies
check_deps() {
    local missing=0
    for cmd in yt-dlp python3; do
        if ! command -v "$cmd" &>/dev/null; then
            echo -e "${RED}ERROR: $cmd not found${NC}"
            missing=1
        fi
    done
    if [[ ! -f "$COOKIES_FILE" ]]; then
        echo -e "${RED}ERROR: Cookies file not found: $COOKIES_FILE${NC}"
        missing=1
    fi
    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

# Find directories with info.json but no audio
find_missing_audio() {
    local info_dirs audio_dirs result

    # Get dirs with info.json (exclude playlist folders [PL...])
    info_dirs=$(find "$DATA_DIR" -type f -name "*.info.json" | grep -v '\[PL' | sed 's|/[^/]*$||' | sort -u)

    # Get dirs with audio files (any format)
    audio_dirs=$(find "$DATA_DIR" -type f \( -name "*.audio.webm" -o -name "*.audio.m4a" -o -name "*.audio.opus" -o -name "*.audio.mp3" -o -name "*.webm" -o -name "*.m4a" -o -name "*.opus" -o -name "*.mp3" \) | sed 's|/[^/]*$||' | sort -u)

    # Find dirs in info_dirs but not in audio_dirs
    result=$(comm -23 <(echo "$info_dirs") <(echo "$audio_dirs"))

    # Filter out excluded videos
    local exclude_ids="$ROOT_DIR/data/.excluded-video-ids.txt"
    if [[ -f "$exclude_ids" ]]; then
        while IFS= read -r vid; do
            [[ -z "$vid" ]] && continue
            result=$(echo "$result" | grep -v "\[$vid\]" || true)
        done < "$exclude_ids"
    fi

    echo "$result"
}

# Extract YouTube URL from info.json
get_video_url() {
    local info_json="$1"
    python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
    url = data.get('webpage_url') or data.get('url') or f\"https://www.youtube.com/watch?v={data.get('id', '')}\"
    print(url)
" "$info_json"
}

# Download audio for a single video
download_audio() {
    local dir="$1"
    local info_json

    info_json=$(find "$dir" -name "*.info.json" -type f | head -1)
    if [[ -z "$info_json" ]]; then
        echo -e "${RED}ERROR: No info.json found in $dir${NC}"
        return 1
    fi

    local url
    url=$(get_video_url "$info_json")
    if [[ -z "$url" || "$url" == "https://www.youtube.com/watch?v=" ]]; then
        echo -e "${RED}ERROR: Could not extract URL from $info_json${NC}"
        return 1
    fi

    local title
    title=$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
    print(data.get('title', 'unknown')[:80])
" "$info_json")

    echo -e "${GREEN}Downloading: $title${NC}"
    echo "  URL: $url"
    echo "  Dir: $dir"

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  [DRY RUN - skipping download]"
        return 0
    fi

    local output_template="$dir/%(title)s [%(id)s].audio"

    local dl_status=1

    # Attempt 1: without cookies (avoids n-challenge issue with authenticated APIs)
    echo -e "${CYAN}  Trying without cookies...${NC}"
    yt-dlp \
        -f "bestaudio/best" \
        --no-playlist \
        --output "$output_template.%(ext)s" \
        --no-overwrites \
        --retries 3 \
        --fragment-retries 3 \
        --socket-timeout 30 \
        --extractor-retries 3 \
        "$url" 2>&1 | tee -a "$LOG_FILE"
    dl_status=${PIPESTATUS[0]}

    # Attempt 2: with cookies (needed for age-restricted / member-only)
    if [[ $dl_status -ne 0 ]]; then
        echo -e "${YELLOW}  No-cookie attempt failed, retrying with cookies...${NC}"
        yt-dlp \
            --cookies "$COOKIES_FILE" \
            -f "bestaudio/best" \
            --no-playlist \
            --output "$output_template.%(ext)s" \
            --no-overwrites \
            --retries 3 \
            --fragment-retries 3 \
            --socket-timeout 30 \
            --extractor-retries 3 \
            "$url" 2>&1 | tee -a "$LOG_FILE"
        dl_status=${PIPESTATUS[0]}
    fi

    if [[ $dl_status -ne 0 ]]; then
        echo -e "${RED}DOWNLOAD FAILED for: $title${NC}"
        echo "FAILED: $dir - $url" >> "$LOG_FILE"
        return 1
    fi

    echo -e "${GREEN}  SUCCESS${NC}"
    return 0
}

random_sleep() {
    local sleep_sec=$((RANDOM % (SLEEP_MAX_SEC - SLEEP_MIN_SEC + 1) + SLEEP_MIN_SEC))
    echo "  Sleeping ${sleep_sec}s before next download..."
    sleep "$sleep_sec"
}

# Main
main() {
    check_deps

    echo "========================================"
    echo "Download Missing Audio"
    echo "========================================"
    echo "Data dir: $DATA_DIR"
    echo "Log file: $LOG_FILE"
    echo "Cookies: $COOKIES_FILE"
    echo ""

    # Verify cookies file is valid format
    if ! head -1 "$COOKIES_FILE" | grep -qE '^#|^\.youtube\.com|^youtube\.com'; then
        echo -e "${YELLOW}WARNING: Cookies file may not be in Netscape format${NC}"
        echo "First line: $(head -1 "$COOKIES_FILE")"
    fi

    echo "=== Download started: $(date) ===" >> "$LOG_FILE"

    echo "Finding videos with missing audio..."
    local missing_dirs
    missing_dirs=$(find_missing_audio)

    local total
    total=$(echo "$missing_dirs" | grep -c . || true)

    if [[ $total -eq 0 ]]; then
        echo -e "${GREEN}No missing audio found. All videos have audio files.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Found $total videos with missing audio${NC}"

    if [[ $LIMIT -gt 0 ]]; then
        echo -e "${CYAN}Limiting to first $LIMIT videos${NC}"
        missing_dirs=$(echo "$missing_dirs" | head -n "$LIMIT")
        total=$LIMIT
    fi
    echo ""

    local count=0
    local failed=0
    local succeeded=0

    while IFS= read -r dir; do
        [[ -z "$dir" ]] && continue

        count=$((count + 1))
        echo ""
        echo "========================================"
        echo "[$count/$total] Processing..."
        echo "========================================"

        if download_audio "$dir"; then
            succeeded=$((succeeded + 1))
        else
            failed=$((failed + 1))
            echo -e "${YELLOW}Warning: Download failed, continuing...${NC}"
        fi

        if [[ $count -lt $total && $DRY_RUN -eq 0 ]]; then
            random_sleep
        fi

    done <<< "$missing_dirs"

    echo ""
    echo -e "${GREEN}========================================"
    echo "COMPLETE!"
    echo "========================================"
    echo "Total: $total"
    echo "Succeeded: $succeeded"
    echo "Failed: $failed"
    echo -e "========================================${NC}"
}

main "$@"
