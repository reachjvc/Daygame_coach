#!/usr/bin/env bash
# Cron guard: relaunch the QT8 EXT/LLM drivers if they've died (machine reboot, kill, etc.)
# and they haven't reported completion. Idempotent — safe to run every few minutes.
cd /home/jonaswsl/projects/daygame-coach || exit 0
GL=data/QT8.guard.log
if ! pgrep -f 'qt8-pipeline.sh ext' >/dev/null 2>&1 && ! grep -q 'EXT-ALL COMPLETE' data/QT8.ext.log 2>/dev/null; then
  echo "[guard $(date)] relaunching EXT-all" >> "$GL"
  nohup bash scripts/training-data/batch/qt8-pipeline.sh ext >> "$GL" 2>&1 &
fi
if ! pgrep -f 'qt8-pipeline.sh llm' >/dev/null 2>&1 && ! grep -q 'LLM-ALL COMPLETE' data/QT8.llm.log 2>/dev/null; then
  echo "[guard $(date)] relaunching LLM-all" >> "$GL"
  nohup bash scripts/training-data/batch/qt8-pipeline.sh llm >> "$GL" 2>&1 &
fi
