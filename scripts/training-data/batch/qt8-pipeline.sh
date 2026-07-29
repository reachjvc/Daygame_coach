#!/usr/bin/env bash
# QT8 interleaved pipeline — per 20-chunk EXT(02-05) then LLM(06-09), overlapping
# the NEXT chunk's EXT (GPU) with the CURRENT chunk's LLM (API) so quota is spent
# evenly across the whole run instead of one burst at the end.
# Idempotent: EXT skips already-done stages; LLM skips chunks fully at 09.
set -uo pipefail
cd /home/jonaswsl/projects/daygame-coach
unset CLAUDECODE
# Stage 04 diarize needs HF_TOKEN; cron's minimal env lacks it — load from local secret file.
[ -f "$HOME/.daygame-pipeline.env" ] && . "$HOME/.daygame-pipeline.env"
PY=.venv/bin/python
RUNNER=./scripts/training-data/batch/pipeline-runner
EXTLOG=data/QT8.ext.log
LLMLOG=data/QT8.llm.log
LEDGER=data/QT8.settled.txt   # video ids confirmed-quarantined (clean run, not at 09) — never re-run
touch "$LEDGER"
# Only numeric chunk manifests (QT8.<N>.txt) — NOT the QT8.<N>.inflight.txt files this script creates.
CHUNKS=( $(ls docs/pipeline/batches/QT8.*.txt | grep -E '/QT8\.[0-9]+\.txt$' | sed -E 's#.*/QT8\.([0-9]+)\.txt#\1#' | sort -n) )

chunk_all_at_05() {  # 0 if every video in chunk N has stage-05 audio-features
  local n="$1" id
  while IFS= read -r id; do
    find data/05.EXT.audio-features -maxdepth 3 -name "*${id}*audio_features.json" 2>/dev/null | head -1 | grep -q . || return 1
  done < <(grep -v '^#' "docs/pipeline/batches/QT8.$n.txt" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
  return 0
}

ext_chunk() {  # EXT 02-05 for chunk N; each stage skips videos already done (no --overwrite)
  local n="$1"; local m="docs/pipeline/batches/QT8.$n.txt"
  chunk_all_at_05 "$n" && { echo "===== EXT QT8.$n all at 05, skip $(date) =====" >> "$EXTLOG"; return; }
  local stages=("02 02.EXT.transcribe" "03 03.EXT.align" "04 04.EXT.diarize" "05 05.EXT.audio-features")
  for s in "${stages[@]}"; do
    set -- $s
    echo "===== EXT QT8.$n STAGE $1 $(date) =====" >> "$EXTLOG"
    $PY -u "scripts/training-data/$2" --manifest "$m" >> "$EXTLOG" 2>&1 || true
  done
}

chunk_done() {  # 0 if every video in chunk N has a stage-09 output
  local n="$1" id
  while IFS= read -r id; do
    find data/09.EXT.chunks -name "*${id}*.chunks.json" 2>/dev/null | head -1 | grep -q . || return 1
  done < <(grep -v '^#' "docs/pipeline/batches/QT8.$n.txt" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
  return 0
}

clean_outage() {
  local n="$1" id f
  rm -f "data/validation/quarantine/QT8.$n.json" "data/validation/quarantine/QT8.$n.inflight.json"
  while IFS= read -r id; do
    while IFS= read -r f; do
      [ -n "$f" ] && grep -lq 'fail_closed\|llm_call_error\|llm_outage\|global_llm_outage' "$f" 2>/dev/null && rm -f "$f"
    done < <(find data/06b.LLM.verify data/06e.LLM.quality-check data/06g.LLM.damage-adjudicator data/07.LLM.content -maxdepth 3 -name "*${id}*" -name '*.json' 2>/dev/null)
  done < <(grep -v '^#' "docs/pipeline/batches/QT8.$n.txt" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
}

inflight_manifest() {  # write LLM-ready not-at-09 videos of chunk N to a .inflight manifest; echo its path (empty if none)
  local n="$1"; local src="docs/pipeline/batches/QT8.$n.txt"; local out="docs/pipeline/batches/QT8.$n.inflight.txt"; local id line cnt=0
  : > "$out"
  while IFS= read -r line; do
    id=$(printf '%s' "$line" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
    [ -z "$id" ] && continue
    grep -qxF -- "$id" "$LEDGER" 2>/dev/null && continue   # confirmed-quarantined, don't re-run
    # only LLM-ready videos (stage 05 present) — a stage-02 reject never reaching 05 must not block its chunk-mates
    find data/05.EXT.audio-features -maxdepth 3 -name "*${id}*audio_features.json" 2>/dev/null | head -1 | grep -q . || continue
    if ! find data/09.EXT.chunks -name "*${id}*.chunks.json" 2>/dev/null | head -1 | grep -q .; then
      printf '%s\n' "$line" >> "$out"; cnt=$((cnt+1))
    fi
  done < <(grep -v '^#' "$src")
  [ "$cnt" -gt 0 ] && echo "$out"
}

mark_settled() {  # record not-at-09 videos of manifest $1 as confirmed-quarantined
  local mf="$1" id line
  while IFS= read -r line; do
    id=$(printf '%s' "$line" | grep -oE '\[[A-Za-z0-9_-]+\]$' | tr -d '[]')
    [ -z "$id" ] && continue
    find data/09.EXT.chunks -name "*${id}*.chunks.json" 2>/dev/null | head -1 | grep -q . && continue
    grep -qxF -- "$id" "$LEDGER" 2>/dev/null || echo "$id" >> "$LEDGER"
  done < <(grep -v '^#' "$mf")
}

llm_chunk() {  # LLM 06-09 for chunk N (only not-at-09 videos) with preflight-retry + outage-sleep
  local n="$1" attempt=0 tmp rc pf lim mf sub
  while :; do
    mf=$(inflight_manifest "$n")
    [ -z "$mf" ] && { echo "===== LLM QT8.$n all settled at 09, skip $(date) =====" >> "$LLMLOG"; return; }
    sub="QT8.$n.inflight"
    attempt=$((attempt+1))
    clean_outage "$n"
    tmp=$(mktemp)
    echo "===== LLM QT8.$n START (attempt $attempt, $(grep -vc '^#' "$mf" 2>/dev/null||echo '?') in-flight) $(date) =====" >> "$LLMLOG"
    "$RUNNER" "$sub" --manifest "$mf" --from 06 --parallel 5 --skip-end-validation >> "$tmp" 2>&1
    rc=$?
    cat "$tmp" >> "$LLMLOG"
    echo "===== LLM QT8.$n EXIT=$rc (attempt $attempt) $(date) =====" >> "$LLMLOG"
    pf=$(grep -c 'Aborting before per-video' "$tmp" || true)
    lim=$(grep -ciE 'hit your limit|out of extra usage|resets [0-9]' "$tmp" || true)
    rm -f "$tmp"
    { [ "$rc" -eq 0 ] || chunk_done "$n"; } && { mark_settled "$mf"; break; }
    if [ "$lim" -gt 0 ]; then echo "===== LLM QT8.$n quota limit, sleep 30m $(date) =====" >> "$LLMLOG"; sleep 1800; attempt=0; continue; fi
    if [ "$pf" -gt 0 ]; then [ "$attempt" -ge 10 ] && { echo "===== LLM QT8.$n GAVE UP preflight $(date) =====" >> "$LLMLOG"; break; }; sleep $(( attempt*30>180?180:attempt*30 )); continue; fi
    mark_settled "$mf"; break  # clean exit-3 = real quarantines → record as settled, don't re-run
  done
}

# Two decoupled drivers so an LLM quota-stall never blocks GPU EXT progress.
#   ext : run EXT 02-05 for every chunk not yet at stage 05 (GPU only, no quota).
#   llm : repeatedly sweep chunks; run LLM only on chunks whose EXT is done and that
#         still have unsettled/not-at-09 videos; stop when a full sweep finds no work.
# Run both concurrently — LLM processes each chunk as soon as its EXT lands, so quota
# flows evenly from the start (not a burst at the end).
MODE="${1:-both}"

run_ext_all() {
  for n in "${CHUNKS[@]}"; do ext_chunk "$n"; done
  echo "===== QT8 EXT-ALL COMPLETE $(date) =====" >> "$EXTLOG"
}

run_llm_all() {
  local pass=0 worked
  while :; do
    pass=$((pass+1)); worked=0
    for n in "${CHUNKS[@]}"; do
      [ -z "$(inflight_manifest "$n")" ] && continue   # no LLM-ready, not-at-09, unsettled videos
      worked=1
      llm_chunk "$n"
    done
    if [ "$worked" -eq 0 ]; then
      # No LLM-ready work left. If EXT has finished, we're truly done; else wait for more stage-05 output.
      grep -q 'EXT-ALL COMPLETE' "$EXTLOG" 2>/dev/null && break
      echo "===== LLM sweep $pass idle, waiting 5m for EXT $(date) =====" >> "$LLMLOG"; sleep 300
    fi
  done
  echo "===== QT8 LLM-ALL COMPLETE $(date) =====" >> "$LLMLOG"
}

case "$MODE" in
  ext) run_ext_all ;;
  llm) run_llm_all ;;
  both) run_ext_all & run_llm_all & wait ;;
esac
