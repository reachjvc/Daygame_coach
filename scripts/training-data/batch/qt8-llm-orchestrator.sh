#!/usr/bin/env bash
# QT8 LLM orchestrator — grinds all QT8.N chunks through 06→09.
# Fresh-sequential launches (proven to clear the flaky preflight); spaced retry on
# preflight-abort; outage-aware resume (--from 06). Banks progress; idempotent to re-run.
set -uo pipefail
cd /home/jonaswsl/projects/daygame-coach
unset CLAUDECODE
LOG=data/QT8.llm.log
RUNNER=./scripts/training-data/batch/pipeline-runner
CHUNKS=$(ls docs/pipeline/batches/QT8.*.txt | sed -E 's#.*/QT8\.([0-9]+)\.txt#\1#' | sort -n)

chunk_all_at_09() {  # returns 0 if every video in chunk N has a stage-09 chunks.json
  local n="$1" id
  while IFS= read -r id; do
    find data/09.EXT.chunks -name "*${id}*.chunks.json" 2>/dev/null | head -1 | grep -q . || return 1
  done < <(grep -v '^#' "docs/pipeline/batches/QT8.$n.txt" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
  return 0
}

clean_outage() {  # drop outage/fail-closed LLM outputs + chunk quarantine so resume is clean
  local n="$1" id f
  rm -f "data/validation/quarantine/QT8.$n.json"
  while IFS= read -r id; do
    while IFS= read -r f; do
      [ -n "$f" ] && grep -lq 'fail_closed\|llm_call_error\|llm_outage\|global_llm_outage' "$f" 2>/dev/null && rm -f "$f"
    done < <(find data/06b.LLM.verify data/06e.LLM.quality-check data/06g.LLM.damage-adjudicator data/07.LLM.content -maxdepth 3 -name "*${id}*" -name '*.json' 2>/dev/null)
  done < <(grep -v '^#' "docs/pipeline/batches/QT8.$n.txt" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
}

for n in $CHUNKS; do
  if chunk_all_at_09 "$n"; then echo "===== QT8.$n already complete, skip $(date) =====" >> "$LOG"; continue; fi
  attempt=0
  while :; do
    attempt=$((attempt+1))
    clean_outage "$n"
    tmp=$(mktemp)
    echo "===== QT8.$n START (attempt $attempt) $(date) =====" >> "$LOG"
    "$RUNNER" "QT8.$n" --from 06 --parallel 5 --skip-end-validation >> "$tmp" 2>&1
    rc=$?
    cat "$tmp" >> "$LOG"
    echo "===== QT8.$n EXIT=$rc (attempt $attempt) $(date) =====" >> "$LOG"
    preflight_abort=$(grep -c 'Aborting before per-video' "$tmp" || true)
    real_limit=$(grep -ciE "hit your limit|out of extra usage|resets [0-9]" "$tmp" || true)
    rm -f "$tmp"
    if [ "$rc" -eq 0 ] || chunk_all_at_09 "$n"; then break; fi
    if [ "$real_limit" -gt 0 ]; then
      echo "===== QT8.$n quota limit — sleeping 30m then retry $(date) =====" >> "$LOG"; sleep 1800; attempt=0; continue
    fi
    if [ "$preflight_abort" -gt 0 ]; then
      [ "$attempt" -ge 10 ] && { echo "===== QT8.$n GAVE UP preflight $(date) =====" >> "$LOG"; break; }
      sleep $(( attempt*30 > 180 ? 180 : attempt*30 )); continue
    fi
    # partial pass (some quarantined for real) with clean exit-3 → done for this chunk
    break
  done
done
echo "===== QT8 LLM ORCHESTRATOR COMPLETE $(date) =====" >> "$LOG"
