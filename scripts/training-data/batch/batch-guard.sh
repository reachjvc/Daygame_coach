#!/usr/bin/env bash
# Cron guard: relaunch a batch's EXT/LLM drivers if they've died (machine reboot, kill, etc.)
# and they haven't reported completion. Idempotent — safe to run every few minutes.
#   batch-guard.sh <BATCH>     e.g. batch-guard.sh QT9
cd /home/jonaswsl/projects/daygame-coach || exit 0
BATCH="${1:-QT8}"
GL="data/$BATCH.guard.log"
DRIVER=scripts/training-data/batch/batch-pipeline.sh
if ! pgrep -f "batch-pipeline.sh $BATCH ext" >/dev/null 2>&1 && ! grep -q "$BATCH EXT-ALL COMPLETE" "data/$BATCH.ext.log" 2>/dev/null; then
  echo "[guard $(date)] relaunching $BATCH EXT-all" >> "$GL"
  nohup bash "$DRIVER" "$BATCH" ext >> "$GL" 2>&1 &
fi
if ! pgrep -f "batch-pipeline.sh $BATCH llm" >/dev/null 2>&1 && ! grep -q "$BATCH LLM-ALL COMPLETE" "data/$BATCH.llm.log" 2>/dev/null; then
  echo "[guard $(date)] relaunching $BATCH LLM-all" >> "$GL"
  nohup bash "$DRIVER" "$BATCH" llm >> "$GL" 2>&1 &
fi
