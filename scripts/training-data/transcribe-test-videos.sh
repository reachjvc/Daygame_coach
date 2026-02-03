#!/bin/bash
# transcribe-test-videos.sh
#
# Transcribes the test videos that don't have transcriptions yet.
# Uses 02.transcribe with --audio and --out flags.
#
# Usage: ./scripts/training-data/transcribe-test-videos.sh
#
# Requirements:
#   - GPU with CUDA
#   - HF_TOKEN env var for pyannote diarization
#   - Python environment with whisperx, pyannote, etc.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_INPUT="$REPO_ROOT/data/test/01.download"
TEST_OUTPUT="$REPO_ROOT/data/test/02.transcribe"
TRANSCRIBE_SCRIPT="$SCRIPT_DIR/02.transcribe"
PYTHON="$REPO_ROOT/.venv/bin/python"

echo "=============================================="
echo "Test Video Transcription"
echo "=============================================="
echo "Input:  $TEST_INPUT"
echo "Output: $TEST_OUTPUT"
echo "Script: $TRANSCRIBE_SCRIPT"
echo ""

# Check HF_TOKEN
if [ -z "$HF_TOKEN" ]; then
    echo "WARNING: HF_TOKEN not set. Diarization may fail."
    echo "Set it with: export HF_TOKEN=your_huggingface_token"
    echo ""
fi

TOTAL=0
PROCESSED=0
SKIPPED=0
FAILED=0

# Find all video folders and process them
for channel_dir in "$TEST_INPUT"/*/; do
    channel=$(basename "$channel_dir")

    for video_dir in "$channel_dir"*/; do
        [ -d "$video_dir" ] || continue

        video_name=$(basename "$video_dir")
        TOTAL=$((TOTAL+1))

        echo "----------------------------------------------"
        echo "[$TOTAL] $channel/$video_name"

        # Find audio file (handle naming inconsistency)
        audio_file=$(find "$video_dir" -name "*.clean16k.wav" -type f | head -1)

        if [ -z "$audio_file" ]; then
            echo "  ERROR: No clean16k.wav found"
            FAILED=$((FAILED+1))
            continue
        fi

        # Output directory and file
        out_dir="$TEST_OUTPUT/$channel/$video_name"
        out_file="$out_dir/$video_name.full.json"

        # Check if already transcribed
        if [ -f "$out_file" ]; then
            echo "  SKIP: Already transcribed"
            SKIPPED=$((SKIPPED+1))
            continue
        fi

        # Also check for any .full.json in output dir
        if [ -d "$out_dir" ] && [ -n "$(find "$out_dir" -name '*.full.json' -type f 2>/dev/null | head -1)" ]; then
            echo "  SKIP: Transcription exists"
            SKIPPED=$((SKIPPED+1))
            continue
        fi

        # Create output directory
        mkdir -p "$out_dir"

        echo "  Audio: $(basename "$audio_file")"
        echo "  Output: $out_file"
        echo "  Running transcription..."

        # Run transcription
        if "$PYTHON" "$TRANSCRIBE_SCRIPT" --audio "$audio_file" --out "$out_file"; then
            echo "  SUCCESS"
            PROCESSED=$((PROCESSED+1))
        else
            echo "  FAILED"
            FAILED=$((FAILED+1))
        fi

        echo ""
    done
done

echo "=============================================="
echo "Complete!"
echo "  Total: $TOTAL"
echo "  Processed: $PROCESSED"
echo "  Skipped: $SKIPPED"
echo "  Failed: $FAILED"
echo "=============================================="
