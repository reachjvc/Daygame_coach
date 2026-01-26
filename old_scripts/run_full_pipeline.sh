#!/usr/bin/env bash
#
# Full Training Data Pipeline with Progress Tracking and Resume Capability
#
# This is the main entry point - it activates the whisper-env and runs the Python script.
#
# Usage:
#   ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield
#   ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --resume
#   ./scripts/run_full_pipeline.sh --file "training-data/raw-audio/.../Video.webm"
#   ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --status-only
#
# See --help for all options.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate the whisper environment (has numpy, librosa, etc.)
source "$SCRIPT_DIR/training_data_env.sh"

# Run the Python implementation
exec python3 "$SCRIPT_DIR/run_full_pipeline_impl.py" "$@"
