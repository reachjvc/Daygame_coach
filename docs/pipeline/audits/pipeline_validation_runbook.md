# Pipeline Validation Runbook (Handoff + Iteration Loop)

**Branch:** `pipeline-validation-hardening`  
**Worktree (current):** `/tmp/daygame-coach-pipeline-validation-hardening` (temporary location; safe, but `/tmp` can be cleaned)  
**Canary manifest:** `docs/pipeline/batches/CANARY.1.txt`  
**Holdout manifest:** `docs/pipeline/batches/HOLDOUT.1.txt`

This runbook exists so another agent can pick up work without any chat history.

## Worktree Location (Why `/tmp`?)

The worktree is just a second checkout of the same git repo, pointed at the same `.git` history.
Putting it in `/tmp` is convenient for isolation, but it is not ideal for long-lived work because `/tmp` can be wiped (reboot/cleanup).

Best practice for long-running iteration:
- Keep the branch in git (commit often).
- Put the worktree in a stable directory (outside the repo root), for example next to the repo.

Move the existing worktree (safe if no processes are running in it):

```bash
cd /home/jonaswsl/projects/daygame-coach
git worktree move /tmp/daygame-coach-pipeline-validation-hardening ../daygame-coach-pipeline-validation-hardening
```

If the `/tmp` folder disappears, you can recreate the worktree from the branch:

```bash
cd /home/jonaswsl/projects/daygame-coach
git worktree add ../daygame-coach-pipeline-validation-hardening pipeline-validation-hardening
```

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
- 09 outputs:  `data/09.chunks/<source>/*.chunks.json` and `data/09.chunks/.chunk_state.json`
- Harness: `scripts/training-data/validation/validate_manifest.py` returns PASS (may still surface Stage 07 warning summaries)

Observed baseline (as of 2026-02-08, after a Stage 07 `--revalidate` pass):
- 06b verdicts: `APPROVE=2`, `FLAG=5` (no `REJECT`)
- Stage 07 warnings (total=15): `transcript_artifact=8`, `technique_on_non_coach_segment=6`, `evidence_mismatch=1`
- Stage 07 normalization repairs: `13` repairs across `4` videos (best-effort deterministic fixes; see `metadata.normalization_repairs_*`)
- Stage 06 validation now includes deterministic sanity checks for likely fragment conversations and opener-as-target misattributions (reported as warnings in `.conversations.validation.json`).
- NOTE: semantic judge results become **stale** when their `request_fingerprint` no longer matches the current Stage 07 output for that `(video_id, conversation_id)`. `batch_report.py` will report fresh vs stale; rerun `semantic_judge.py` after prompt/normalization changes.

## Holdout Set (HOLDOUT.1)

`HOLDOUT.1` is a second manifest intended to be run less frequently.
Use it to catch regressions that might not appear in `CANARY.1` and to reduce overfitting.

## Where the Plan Lives

- Plan docs intended for merging with Claude:
  - `docs/pipeline/audits/claude_pipeline_validation.md`
  - `docs/pipeline/audits/codex_pipeline_validation.md`
  - `docs/pipeline/audits/merging_optimization.md`

This file is the execution loop, not the full design spec.

## Repeatable Canary Loop

### 0) Optional: reset embeddings table (DB destructive)

If you want a clean slate for retrieval testing, wipe the `embeddings` table first:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/00.reset-embeddings.ts --count
node node_modules/tsx/dist/cli.mjs scripts/training-data/00.reset-embeddings.ts --wipe-all --yes
```

### 1) Run LLM stages (writes under `data/`)

Note: `06b.verify` and `07.content` require Claude (network/auth). In the Codex sandbox, these runs may require escalation.

```bash
./scripts/training-data/06b.verify --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/06c.patch  --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --allow-flag
```

Note: Stage 06b now drops low-confidence (<0.70) misattribution/collapse auto-fix suggestions from structured fix arrays and records those drops in `other_flags`.

**Claude model strategy (quota control):**
- Use `--model sonnet` for iteration/canary loops (cheaper).
- Re-run `CANARY.1` and `HOLDOUT.1` with `--model opus` only for sign-off on major changes (or on specific “problem videos”).

Examples:

```bash
./scripts/training-data/06.video-type --manifest docs/pipeline/batches/CANARY.1.txt --model sonnet
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/CANARY.1.txt --model sonnet
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --allow-flag --model sonnet
./scripts/training-data/07.content --manifest docs/pipeline/batches/HOLDOUT.1.txt --allow-flag --model opus
```

Notes:
- `06c.patch` defaults to refusing to patch when 06b returns `REJECT`. For iteration/salvage (when 06b suggests high-confidence deterministic fixes), you can opt in:

```bash
./scripts/training-data/06c.patch --manifest docs/pipeline/batches/HOLDOUT.1.txt --overwrite --allow-reject
```

- `07.content` blocks `REJECT` by default (even with `--allow-flag`). For debugging/evaluation you can bypass the 06b gate:

```bash
./scripts/training-data/07.content --input data/06c.patched/<source>/<video>.conversations.json --skip-verification --overwrite --model sonnet
```

If a `REJECT` video was patched cleanly by `06c.patch` (fixes applied, `flags_not_fixed_count=0`), Stage 07 will allow it under the same explicit waiver as `FLAG` by passing `--allow-flag`.

### 1b) Revalidate Stage 07 (no Claude; deterministic)

Use this after changing Stage 07 normalization/validators, to refresh outputs without rerunning the LLM:

```bash
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --revalidate
```

### 2) PASS/FAIL harness (read-only)

This includes:
- artifact presence checks (06b/06c/07)
- cross-stage consistency (06/06c vs 07)
- Stage 07 per-file validation summary (warnings/errors) and partial-write detection
- Optional Stage 01 artifact integrity check (`--skip-stage01-presence` when validating archived outputs that no longer retain Stage 01 `.wav` files)

```bash
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --allow-flag
```

To also require Stage 09 chunk artifacts/payload integrity in the same harness run, add `--check-stage09-chunks`.
That check now enforces stable `sourceKey`/`videoId`/`channel` alignment plus `chunkIndex`/`totalChunks` consistency and continuity.
To also enforce Stage 08 report integrity in the same harness run, add `--check-stage08-report`.
If you run via `sub-batch-pipeline`, use:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep`
Optional waivers: `--waiver-file docs/pipeline/waivers/CANARY.1.json` to downgrade explicit known checks (video/check scoped) to `info`.
The same waiver file can be passed through the orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep --waiver-file docs/pipeline/waivers/CANARY.1.json`
If `docs/pipeline/waivers/CANARY.1.json` exists, `sub-batch-pipeline CANARY.1 --validate` auto-detects and applies it.

### 3) Scorecard (writes by default, use `--no-write` if you only want stdout)

```bash
python3 scripts/training-data/validation/batch_report.py \
  --all \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --batch-id CANARY.1 \
  --no-write
```

Note: if `data/validation_judgements/<batch_id>/` exists (from `semantic_judge.py`), the batch report will include a semantic-score summary.

### 4) Taxonomy Gate (Stage 08; deterministic)

This is a taxonomy drift detector, not a truth detector.
It reports which concepts the LLM placed into `unlisted_concepts` and how often they recur.

By default it only **fails** on high-frequency unlisted concepts (topics threshold is stricter than techniques).

```bash
python3 scripts/training-data/08.taxonomy-validation \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 5) Chunk + embed (Stage 09; Ollama)

This stage calls Ollama at `QA_CONFIG.ollama.baseUrl` (default `http://localhost:11434`) and requires the embedding model to exist.

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 6) Validate chunk files (read-only)

```bash
python3 scripts/training-data/validation/validate_chunks.py \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 7) Ingest (Stage 10; DB writes)

Start with a dry run on the canary:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts \
  --dry-run \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

Only run a real ingest when you explicitly want to update Supabase. Stage 10 is idempotent with `sourceKey`,
but it still performs DB writes and should be treated as “production-impacting”.

Note: when running with `--manifest`, Stage 10 requires a valid Stage 08 manifest-scoped report and will refuse ingest if:
- the report is malformed or has an unexpected scope/source label
- the report indicates unreadable Stage 07 outputs or incomplete manifest coverage
- the report manifest scope size does not match the ingest manifest scope (or `--source` subset)
- the report status is `FAIL`
Use `--skip-taxonomy-gate` only when you intentionally bypass this gate.
It also refuses manifest ingest when chunk files cannot derive a stable video-id-based `sourceKey` (to avoid idempotency drift).
For legacy artifacts only, override with `--allow-unstable-source-key`.
Stage 10 now performs chunk preflight validation (non-empty content, consistent numeric embedding length, stable chunk indices/total counts, required metadata fields) and refuses manifest ingest if chunk payloads are invalid.

### 8) Retrieval smoke test (end-to-end)

This calls Ollama + Supabase retrieval and prints the top matches:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/11.retrieval-smoke.ts \
  "approach a girl in public"
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
- speaker-role drift: how often the pipeline labels a `student` speaker (should stay rare globally; track via `batch_report.py`)

### Real semantic quality (needs a reference)

Pick one (or both):
1. **Gold labels (best):** a small set of approaches where you agree the correct techniques/topics/phases are known.
2. **LLM judge (fast):** a rubric-scoring script that grades Stage 07 output against transcript + taxonomy, with caching:
   - `python3 scripts/training-data/validation/semantic_judge.py --manifest docs/pipeline/batches/CANARY.1.txt --n 5 --seed 1 --model sonnet`

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
