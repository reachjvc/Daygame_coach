#!/usr/bin/env bash
#
# Training data pipeline environment bootstrap.
#
# This file is meant to be *sourced* by other scripts:
#   source scripts/training_data_env.sh
#
# It:
# - Activates the Whisper/feature-extraction Python env (default: ~/whisper-env)
# - Forces caches/temp dirs into the repo so tools don't fail on permission issues
#

set -euo pipefail

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "❌ Don't run this file directly."
  echo "   Source it from another script:"
  echo "     source scripts/training_data_env.sh"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) Python environment (Whisper + librosa + numpy)
# You can override with: WHISPER_ENV=/path/to/venv
WHISPER_ENV="${WHISPER_ENV:-"$HOME/whisper-env"}"
if [[ -f "$WHISPER_ENV/bin/activate" ]]; then
  # shellcheck disable=SC1090
  source "$WHISPER_ENV/bin/activate"
else
  cat >&2 <<EOF
❌ Whisper environment not found at: $WHISPER_ENV

Fix:
  1) Create a venv:
     python3 -m venv "$HOME/whisper-env"
  2) Activate it:
     source "$HOME/whisper-env/bin/activate"
  3) Install deps:
     pip install openai-whisper librosa numpy

Or set WHISPER_ENV to your existing venv path.
EOF
  return 1
fi

# 2) Cache dirs (avoid permission issues from numba/joblib/etc.)
CACHE_ROOT="${TRAINING_DATA_CACHE_DIR:-"$ROOT_DIR/training-data/.cache"}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-"$CACHE_ROOT"}"
export NUMBA_CACHE_DIR="${NUMBA_CACHE_DIR:-"$CACHE_ROOT/numba"}"
export MPLCONFIGDIR="${MPLCONFIGDIR:-"$CACHE_ROOT/matplotlib"}"
export JOBLIB_TEMP_FOLDER="${JOBLIB_TEMP_FOLDER:-"$CACHE_ROOT/joblib"}"
export TMPDIR="${TMPDIR:-"$CACHE_ROOT/tmp"}"

mkdir -p \
  "$XDG_CACHE_HOME" \
  "$NUMBA_CACHE_DIR" \
  "$MPLCONFIGDIR" \
  "$JOBLIB_TEMP_FOLDER" \
  "$TMPDIR"
