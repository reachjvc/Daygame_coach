#!/usr/bin/env bash
# Run Stage A (unified classification) on a single video
# Usage: run_stage_a.sh <audio_features.json> <title> <channel> <output_dir>

set -euo pipefail

AUDIO_FEATURES="$1"
TITLE="$2"
CHANNEL="$3"
OUTPUT_DIR="$4"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$OUTPUT_DIR"

# Generate the filled prompt
PROMPT=$(.venv/bin/python "$SCRIPT_DIR/prepare_input.py" "$AUDIO_FEATURES" "$TITLE" "$CHANNEL")

# Save prompt for debugging
echo "$PROMPT" > "$OUTPUT_DIR/stage_a_prompt.txt"

echo "Prompt generated ($(echo "$PROMPT" | wc -c) bytes, $(echo "$PROMPT" | wc -l) lines)"
echo "Running Claude..."

# Run via Claude CLI
echo "$PROMPT" | claude --output-format json -p - > "$OUTPUT_DIR/stage_a_output.json" 2>"$OUTPUT_DIR/stage_a_stderr.log"

echo "Done. Output saved to $OUTPUT_DIR/stage_a_output.json"
