#!/usr/bin/env bash
# Automates the full analysis pipeline for a specific channel.
# Usage: ./scripts/process_channel.sh "The Natural Lifestyles"

set -euo pipefail

CHANNEL_NAME="$1"

if [ -z "$CHANNEL_NAME" ]; then
  echo "Usage: $0 <channel_name>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/training_data_env.sh"

echo "🚀 Starting pipeline for: $CHANNEL_NAME"

# 0. Whisper Transcription (Audio -> JSON/TXT)
echo "Step 0: Transcribing with Whisper..."
"$SCRIPT_DIR/transcribe_channel.sh" "$CHANNEL_NAME"

# 1. Content Classification (Intro/Infield/Theory)
echo "Step 1: Classifying Content..."
python scripts/classify_content.py \
  --input "training-data/transcripts/$CHANNEL_NAME" \
  --output "training-data/classified/$CHANNEL_NAME"

# 2. Audio Features (Pitch, Energy, etc.)
echo "Step 2: Extracting Audio Features..."
./scripts/batch_extract_features.sh "$CHANNEL_NAME"

# 3. Speaker Classification (Coach vs Target)
echo "Step 3: Classifying Speakers..."
python scripts/classify_speakers.py \
  --input "training-data/features/$CHANNEL_NAME" \
  --output "training-data/features/$CHANNEL_NAME"

# 4. Tonality Classification (Playful, Serious, etc.)
echo "Step 4: Classifying Tonality..."
python scripts/classify_tonality.py \
  --input "training-data/features/$CHANNEL_NAME" \
  --output "training-data/features/$CHANNEL_NAME"

# 5. Interaction Extraction (Conversations)
echo "Step 5: Extracting Interactions..."
python scripts/extract_interactions.py \
  --input "training-data/features/$CHANNEL_NAME" \
  --output "training-data/interactions/$CHANNEL_NAME"

# 6. Update Global Training Data
echo "Step 6: Updating Training Data..."
# This aggregates ALL processed features from all channels into the final file
python scripts/generate_training_data.py \
  --input "training-data/features" \
  --output "training-data/processed/training_data.jsonl"

# 7. Generate Scenario Data (Chat format)
echo "Step 7: Generating Scenario Data..."
if [ -f "scripts/generate_scenario_data.py" ]; then
  python scripts/generate_scenario_data.py \
    "training-data/interactions" \
    "training-data/processed/scenario_training.jsonl"
else
  echo "⚠️  scripts/generate_scenario_data.py not found, skipping."
fi

echo "✅ Pipeline complete for $CHANNEL_NAME!"
