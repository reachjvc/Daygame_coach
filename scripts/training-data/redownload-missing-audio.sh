#!/usr/bin/env bash
# scripts/training-data/redownload-missing-audio.sh
#
# Re-downloads audio for videos that have info.json but no audio files.
# Fails immediately on error and notifies user.
#
# Usage:
#   ./scripts/training-data/redownload-missing-audio.sh [--dry-run]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$ROOT_DIR/data/01.download"
LOG_FILE="$DATA_DIR/redownload-missing.log"
COOKIES_FILE="$ROOT_DIR/docs/data_docs/www.youtube.com_cookies.txt"

# Pacing to avoid bot detection
SLEEP_MIN_SEC="${SLEEP_MIN_SEC:-30}"
SLEEP_MAX_SEC="${SLEEP_MAX_SEC:-90}"

# Audio processing settings
ASR_SAMPLE_RATE=16000
ASR_CLEAN_FILTERS="highpass=f=80,lowpass=f=8000,afftdn=nf=-25,alimiter=limit=0.97"
ASR_RESYNC_FILTER="aresample=async=1:first_pts=0"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=1
    echo -e "${YELLOW}DRY RUN MODE - no downloads will be performed${NC}"
fi

# Check dependencies
check_deps() {
    local missing=0
    for cmd in yt-dlp ffmpeg python3; do
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
    local info_dirs audio_dirs

    # Get dirs with info.json (exclude playlist folders [PL...])
    info_dirs=$(find "$DATA_DIR" -type f -name "*.info.json" | grep -v '\[PL' | sed 's|/[^/]*$||' | sort -u)

    # Get dirs with audio files
    audio_dirs=$(find "$DATA_DIR" -type f \( -name "*.webm" -o -name "*.m4a" -o -name "*.wav" -o -name "*.mp3" -o -name "*.opus" \) | sed 's|/[^/]*$||' | sort -u)

    # Find dirs in info_dirs but not in audio_dirs
    comm -23 <(echo "$info_dirs") <(echo "$audio_dirs")
}

# Extract YouTube URL from info.json
get_video_url() {
    local info_json="$1"
    python3 -c "
import json
import sys
with open('$info_json') as f:
    data = json.load(f)
    url = data.get('webpage_url') or data.get('url') or f\"https://www.youtube.com/watch?v={data.get('id', '')}\"
    print(url)
"
}

# Download audio for a single video
download_audio() {
    local dir="$1"
    local info_json

    # Find the info.json file
    info_json=$(find "$dir" -name "*.info.json" -type f | head -1)
    if [[ -z "$info_json" ]]; then
        echo -e "${RED}ERROR: No info.json found in $dir${NC}"
        return 1
    fi

    # Get video URL
    local url
    url=$(get_video_url "$info_json")
    if [[ -z "$url" || "$url" == "https://www.youtube.com/watch?v=" ]]; then
        echo -e "${RED}ERROR: Could not extract URL from $info_json${NC}"
        return 1
    fi

    # Get video title for output naming
    local title
    title=$(python3 -c "
import json
with open('$info_json') as f:
    data = json.load(f)
    print(data.get('title', 'unknown')[:80])
")

    echo -e "${GREEN}Downloading: $title${NC}"
    echo "  URL: $url"
    echo "  Dir: $dir"

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  [DRY RUN - skipping download]"
        return 0
    fi

    # Download audio using yt-dlp
    local output_template="$dir/%(title)s [%(id)s].audio"

    yt-dlp \
        --cookies "$COOKIES_FILE" \
        --extract-audio \
        --audio-format best \
        --audio-quality 0 \
        --no-playlist \
        --output "$output_template.%(ext)s" \
        --write-info-json \
        --no-overwrites \
        --retries 3 \
        --fragment-retries 3 \
        "$url" 2>&1 | tee -a "$LOG_FILE"

    local dl_status=${PIPESTATUS[0]}
    if [[ $dl_status -ne 0 ]]; then
        echo -e "${RED}DOWNLOAD FAILED for: $title${NC}"
        echo "FAILED: $dir - $url" >> "$LOG_FILE"
        return 1
    fi

    # Convert to ASR format
    echo "  Converting to ASR format..."
    local audio_file
    audio_file=$(find "$dir" -type f \( -name "*.audio.webm" -o -name "*.audio.m4a" -o -name "*.audio.opus" \) | head -1)

    if [[ -z "$audio_file" ]]; then
        echo -e "${RED}ERROR: No audio file found after download in $dir${NC}"
        return 1
    fi

    local stem="${audio_file%.*}"
    local raw_out="${stem}.asr.raw16k.wav"
    local clean_out="${stem}.asr.clean16k.wav"

    # Create raw WAV
    ffmpeg -nostdin -hide_banner -loglevel warning -y \
        -i "$audio_file" \
        -map 0:a:0? -vn -sn -dn \
        -ac 1 -ar "$ASR_SAMPLE_RATE" -c:a pcm_s16le \
        -af "$ASR_RESYNC_FILTER" \
        "$raw_out"

    if [[ ! -f "$raw_out" ]]; then
        echo -e "${RED}ERROR: Failed to create raw WAV: $raw_out${NC}"
        return 1
    fi

    # Create clean WAV
    ffmpeg -nostdin -hide_banner -loglevel warning -y \
        -i "$audio_file" \
        -map 0:a:0? -vn -sn -dn \
        -ac 1 -ar "$ASR_SAMPLE_RATE" -c:a pcm_s16le \
        -af "$ASR_CLEAN_FILTERS,$ASR_RESYNC_FILTER" \
        "$clean_out"

    if [[ ! -f "$clean_out" ]]; then
        echo -e "${RED}ERROR: Failed to create clean WAV: $clean_out${NC}"
        return 1
    fi

    echo -e "${GREEN}  SUCCESS: Created $raw_out and $clean_out${NC}"
    return 0
}

# Random sleep between downloads
random_sleep() {
    local sleep_sec=$((RANDOM % (SLEEP_MAX_SEC - SLEEP_MIN_SEC + 1) + SLEEP_MIN_SEC))
    echo "  Sleeping ${sleep_sec}s before next download..."
    sleep "$sleep_sec"
}

# Main
main() {
    check_deps

    echo "========================================"
    echo "Re-download Missing Audio"
    echo "========================================"
    echo "Data dir: $DATA_DIR"
    echo "Log file: $LOG_FILE"
    echo ""

    # Initialize log
    echo "=== Redownload started: $(date) ===" >> "$LOG_FILE"

    # Find missing audio directories
    echo "Finding videos with missing audio..."
    local missing_dirs
    missing_dirs=$(find_missing_audio)

    local total
    total=$(echo "$missing_dirs" | grep -c . || echo 0)

    if [[ $total -eq 0 ]]; then
        echo -e "${GREEN}No missing audio found. All videos have audio files.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Found $total videos with missing audio${NC}"
    echo ""

    # Process each directory
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

            # FAIL FAST: Stop on first error
            echo ""
            echo -e "${RED}========================================"
            echo "STOPPING: Download failed!"
            echo "========================================"
            echo "Completed: $succeeded"
            echo "Failed: $failed"
            echo "Remaining: $((total - count))"
            echo ""
            echo "Check log: $LOG_FILE"
            echo -e "========================================${NC}"

            # Send notification (bell character)
            echo -e "\a"

            exit 1
        fi

        # Sleep between downloads (except for last one)
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

    # Send notification
    echo -e "\a"
}

main "$@"
