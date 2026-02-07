# Pipeline Validation Runbook (Handoff + Iteration Loop)

**Branch:** `pipeline-validation-hardening`  
**Worktree (current):** `/tmp/daygame-coach-pipeline-validation-hardening`  
**Canary manifest:** `docs/pipeline/batches/CANARY.1.txt`

This runbook exists so another agent can pick up work without any chat history.

## What “Done” Looks Like

1. A single command that yields a clear PASS/FAIL for a manifest (presence + cross-stage consistency).
2. A lightweight scorecard that tracks Stage 06/07 outputs over time (drift + warnings + normalization).
3. A semantic quality eval loop (small canary + rotating holdout + optional “gold” labels / LLM judge).

## Current Baseline (CANARY.1)

`CANARY.1` is a 7-video diverse canary set meant to be cheap and fast.

Expected right now (after a successful run):
- 06b outputs: `data/06b.verify/<source>/*.verification.json`
- 06c outputs: `data/06c.patched/<source>/*.conversations.json`
- 07 outputs:  `data/07.content/<source>/*.enriched.json` and `*.enriched.validation.json`
- Harness: `scripts/training-data/validation/validate_manifest.py` returns PASS

## Where the Plan Lives

- Plan docs intended for merging with Claude:
  - `docs/pipeline/audits/claude_pipeline_validation.md`
  - `docs/pipeline/audits/codex_pipeline_validation.md`
  - `docs/pipeline/audits/merging_optimization.md`

This file is the execution loop, not the full design spec.

## Repeatable Canary Loop

### 1) Run LLM stages (writes under `data/`)

Note: `06b.verify` and `07.content` require Claude (network/auth). In the Codex sandbox, these runs may require escalation.

```bash
./scripts/training-data/06b.verify --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/06c.patch  --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --allow-flag
```

### 2) PASS/FAIL harness (read-only)

```bash
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --allow-flag
```

### 3) Scorecard (writes by default, use `--no-write` if you only want stdout)

```bash
python3 scripts/training-data/validation/batch_report.py \
  --all \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --batch-id CANARY.1 \
  --no-write
```

## How to Interpret Failures

### Stage output missing but validation exists

Example: `*.enriched.validation.json` exists but `*.enriched.json` is missing.

Interpretation:
- Stage ran and validation happened, but output write was skipped (hard errors) or interrupted.
- Treat as FAIL (`partial_write`) and block downstream steps for that video until fixed.

### Stage 07 taxonomy drift

If the LLM outputs invalid topics/techniques:
- Preferred: auto-move invalid entries into `unlisted_concepts` and keep the rest valid.
- Track drift frequency; if a concept appears often and is useful, consider promoting it into the taxonomy (human decision).

## Semantic Quality Measurements (Next Layer)

### Proxy metrics (cheap, automatic, ongoing)

These don’t require human labels, but they catch regressions:
- evidence mismatch rates (example strings not found in transcript)
- taxonomy drift (unlisted concepts volume and top offenders)
- normalization repairs count (how often we “fixed” LLM drift)
- phase sanity (regressions, post_hook dependencies, etc.)
- transcript artifact rates (ASR garbage surfaced by Stage 07)

### Real semantic quality (needs a reference)

Pick one (or both):
1. **Gold labels (best):** a small set of approaches where you agree the correct techniques/topics/phases are known.
2. **LLM judge (fast):** a rubric-scoring script that grades Stage 07 output against transcript + taxonomy, with caching.

Goal: keep semantic evaluation small (canary + holdout), and only expand once it’s stable.

## When Human Input Is Needed

1. Deciding whether recurring unlisted concepts should become first-class taxonomy items.
2. Spot-checking a handful of enrichments for “does this feel correct/useful?”
3. Approving what counts as “hard fail” vs “warning” for semantic metrics.

## Handoff Notes (If You Close Codex)

Everything important is in git history on `pipeline-validation-hardening`.

To continue later:
1. `git worktree list` (find the validation worktree)
2. `cd` into that worktree
3. Run the canary loop above

Generated `data/*` artifacts are not committed; they are reproducible from the scripts + manifests.

