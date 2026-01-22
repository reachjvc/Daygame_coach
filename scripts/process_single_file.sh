#!/bin/bash
#
# Process a single infield video through the remaining pipeline stages
#
# Usage: ./scripts/process_single_file.sh <channel> <video_name>
#
# Example:
#   ./scripts/process_single_file.sh "NaturalLifestyles-Infield" "Hate Clubs"
#
# This script assumes stages 1-4 are already complete (raw audio, transcript, classified, features)
# It runs:
#   - detect_conversations.py (adds conversation_id, segment_type)
#   - extract_interactions.py (creates .interactions.jsonl)
#   - enrich_ground_truth.py (optional, creates .ground_truth.json)
#

set -e

CHANNEL="${1:?Usage: $0 <channel> <video_name_pattern>}"
PATTERN="${2:?Usage: $0 <channel> <video_name_pattern>}"

# Find the features file matching the pattern
FEATURES_DIR="training-data/features/${CHANNEL}"
FEATURES_FILE=$(find "$FEATURES_DIR" -name "*.features.json" -name "*${PATTERN}*" | head -1)

if [ -z "$FEATURES_FILE" ]; then
    echo "ERROR: No features file found matching pattern '$PATTERN' in $FEATURES_DIR"
    exit 1
fi

# Extract base name (without .features.json)
BASENAME=$(basename "$FEATURES_FILE" .features.json)
echo "========================================"
echo "Processing: $BASENAME"
echo "========================================"
echo ""

# Paths
INTERACTIONS_DIR="training-data/interactions/${CHANNEL}"
ENRICHED_DIR="training-data/enriched/${CHANNEL}"
TRANSCRIPT_FILE="training-data/transcripts/${CHANNEL}/${BASENAME}.txt"

mkdir -p "$INTERACTIONS_DIR" "$ENRICHED_DIR"

# Step 1: Detect conversations (adds conversation_id and segment_type)
echo "[1/3] Detecting conversations..."
echo "     Input:  $FEATURES_FILE"
echo "     Output: (modifies features file in place with .conversations.json)"
echo ""

python3 scripts/detect_conversations.py \
    --input "$FEATURES_FILE" \
    --output "${FEATURES_DIR}/${BASENAME}.features.conversations.json"

# Replace original features file with the conversation-enriched one
if [ -f "${FEATURES_DIR}/${BASENAME}.features.conversations.json" ]; then
    mv "${FEATURES_DIR}/${BASENAME}.features.conversations.json" "$FEATURES_FILE"
    echo "     ✓ Conversation detection complete"
else
    echo "     ✗ ERROR: Conversation detection failed"
    exit 1
fi
echo ""

# Step 2: Extract interactions
echo "[2/3] Extracting interactions..."
INTERACTIONS_FILE="${INTERACTIONS_DIR}/${BASENAME}.interactions.jsonl"
echo "     Input:  $FEATURES_FILE"
echo "     Output: $INTERACTIONS_FILE"
echo ""

python3 scripts/extract_interactions.py \
    --input "$FEATURES_FILE" \
    --output "$INTERACTIONS_FILE"

if [ -s "$INTERACTIONS_FILE" ]; then
    INTERACTION_COUNT=$(wc -l < "$INTERACTIONS_FILE")
    echo "     ✓ Extracted $INTERACTION_COUNT interactions"
else
    echo "     ⚠ Warning: No interactions extracted (file empty)"
fi
echo ""

# Step 3: Enrich ground truth (optional - uses LLM)
echo "[3/3] Enriching ground truth..."
ENRICHED_FILE="${ENRICHED_DIR}/${BASENAME}.ground_truth.json"
echo "     Input:  $INTERACTIONS_FILE + $TRANSCRIPT_FILE"
echo "     Output: $ENRICHED_FILE"
echo ""

if [ -f "$TRANSCRIPT_FILE" ] && [ -s "$INTERACTIONS_FILE" ]; then
    python3 scripts/enrich_ground_truth.py \
        --interactions "$INTERACTIONS_FILE" \
        --transcript "$TRANSCRIPT_FILE" \
        --output "$ENRICHED_FILE" || {
            echo "     ⚠ Ground truth enrichment failed (non-fatal)"
        }

    if [ -f "$ENRICHED_FILE" ]; then
        echo "     ✓ Ground truth enrichment complete"
    fi
else
    echo "     ⚠ Skipping: missing transcript or empty interactions"
fi

echo ""
echo "========================================"
echo "COMPLETE!"
echo "========================================"
echo ""
echo "Output files:"
echo "  - Features (updated): $FEATURES_FILE"
echo "  - Interactions:       $INTERACTIONS_FILE"
[ -f "$ENRICHED_FILE" ] && echo "  - Ground truth:       $ENRICHED_FILE"
echo ""
echo "To inspect the results:"
echo "  # Check conversation detection:"
echo "  python3 -c \"import json; d=json.load(open('$FEATURES_FILE')); print('Conversations:', d.get('conversation_summary', {}))\""
echo ""
echo "  # View interactions:"
echo "  head -1 '$INTERACTIONS_FILE' | python3 -m json.tool"
