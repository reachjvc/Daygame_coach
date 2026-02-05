#!/usr/bin/env bash
# scripts/training-data/convert-audio-to-wav.sh
#
# Converts downloaded audio files (m4a/webm/opus) to ASR-ready WAV format.
# Creates both raw and clean 16kHz mono WAV files.
#
# Usage:
#   ./scripts/training-data/convert-audio-to-wav.sh [--dry-run] [--limit N]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$ROOT_DIR/data/01.download"
LOG_FILE="$DATA_DIR/convert-audio.log"

# Audio processing settings (same as redownload script)
ASR_SAMPLE_RATE=16000
ASR_CLEAN_FILTERS="highpass=f=80,lowpass=f=8000,afftdn=nf=-25,alimiter=limit=0.97"
ASR_RESYNC_FILTER="aresample=async=1:first_pts=0"

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
    echo -e "${YELLOW}DRY RUN MODE - no conversions will be performed${NC}"
fi

# Check dependencies
check_deps() {
    if ! command -v ffmpeg &>/dev/null; then
        echo -e "${RED}ERROR: ffmpeg not found${NC}"
        exit 1
    fi
}

# Find audio files that need conversion (one per video directory)
# Has source audio (m4a/webm/opus) but no raw16k.wav
# Picks best source: m4a > opus > webm (m4a is typically higher quality)
find_unconverted() {
    local -A seen_dirs

    # Get all source audio files, prefer m4a > opus > webm
    local source_files
    source_files=$(find "$DATA_DIR" -type f \( -name "*.audio.m4a" -o -name "*.audio.webm" -o -name "*.audio.opus" \) 2>/dev/null | sort)

    while IFS= read -r src; do
        [[ -z "$src" ]] && continue

        local stem="${src%.*}"  # Remove extension (e.g., .m4a)
        local raw_wav="${stem}.asr.raw16k.wav"

        # Already has WAV - skip
        [[ -f "$raw_wav" ]] && continue

        local dir
        dir=$(dirname "$src")

        # Already picked a source for this dir - only replace if better format
        if [[ -n "${seen_dirs[$dir]:-}" ]]; then
            local prev_ext="${seen_dirs[$dir]##*.}"
            local cur_ext="${src##*.}"
            # Prefer m4a > opus > webm
            if [[ "$cur_ext" == "m4a" && "$prev_ext" != "m4a" ]]; then
                seen_dirs[$dir]="$src"
            elif [[ "$cur_ext" == "opus" && "$prev_ext" == "webm" ]]; then
                seen_dirs[$dir]="$src"
            fi
        else
            seen_dirs[$dir]="$src"
        fi
    done <<< "$source_files"

    # Output one file per directory
    for src in "${seen_dirs[@]}"; do
        echo "$src"
    done | sort
}

# Convert a single audio file
convert_audio() {
    local audio_file="$1"

    local stem="${audio_file%.*}"  # Remove extension
    local raw_out="${stem}.asr.raw16k.wav"
    local clean_out="${stem}.asr.clean16k.wav"

    local filename
    filename=$(basename "$audio_file")

    echo -e "${GREEN}Converting: $filename${NC}"

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  Would create: $(basename "$raw_out")"
        echo "  Would create: $(basename "$clean_out")"
        echo "  [DRY RUN - skipping]"
        return 0
    fi

    # Create raw WAV (16kHz mono)
    if ! ffmpeg -nostdin -hide_banner -loglevel warning -y \
        -i "$audio_file" \
        -map 0:a:0? -vn -sn -dn \
        -ac 1 -ar "$ASR_SAMPLE_RATE" -c:a pcm_s16le \
        -af "$ASR_RESYNC_FILTER" \
        "$raw_out" 2>&1; then
        echo -e "${RED}  ERROR: Failed to create raw WAV${NC}"
        return 1
    fi

    if [[ ! -f "$raw_out" ]]; then
        echo -e "${RED}  ERROR: Raw WAV not created${NC}"
        return 1
    fi

    # Create clean WAV (filtered for ASR)
    if ! ffmpeg -nostdin -hide_banner -loglevel warning -y \
        -i "$audio_file" \
        -map 0:a:0? -vn -sn -dn \
        -ac 1 -ar "$ASR_SAMPLE_RATE" -c:a pcm_s16le \
        -af "$ASR_CLEAN_FILTERS,$ASR_RESYNC_FILTER" \
        "$clean_out" 2>&1; then
        echo -e "${RED}  ERROR: Failed to create clean WAV${NC}"
        return 1
    fi

    if [[ ! -f "$clean_out" ]]; then
        echo -e "${RED}  ERROR: Clean WAV not created${NC}"
        return 1
    fi

    echo -e "${GREEN}  Created: $(basename "$raw_out")${NC}"
    echo -e "${GREEN}  Created: $(basename "$clean_out")${NC}"
    return 0
}

# Main
main() {
    check_deps

    echo "========================================"
    echo "Convert Audio to WAV"
    echo "========================================"
    echo "Data dir: $DATA_DIR"
    echo "Log file: $LOG_FILE"
    echo ""

    echo "=== Conversion started: $(date) ===" >> "$LOG_FILE"

    echo "Finding audio files that need conversion..."
    local unconverted
    unconverted=$(find_unconverted)

    local total
    total=$(echo "$unconverted" | grep -c . || echo 0)

    if [[ $total -eq 0 ]]; then
        echo -e "${GREEN}All audio files already converted to WAV.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Found $total audio files needing conversion${NC}"

    if [[ $LIMIT -gt 0 ]]; then
        echo -e "${CYAN}Limiting to first $LIMIT files${NC}"
        unconverted=$(echo "$unconverted" | head -n "$LIMIT")
        total=$LIMIT
    fi
    echo ""

    local count=0
    local failed=0
    local succeeded=0

    while IFS= read -r audio_file; do
        [[ -z "$audio_file" ]] && continue

        count=$((count + 1))
        echo ""
        echo "[$count/$total] Processing..."

        if convert_audio "$audio_file"; then
            succeeded=$((succeeded + 1))
            echo "SUCCESS: $audio_file" >> "$LOG_FILE"
        else
            failed=$((failed + 1))
            echo "FAILED: $audio_file" >> "$LOG_FILE"
        fi

    done <<< "$unconverted"

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
