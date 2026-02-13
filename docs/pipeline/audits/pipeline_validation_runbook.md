# Pipeline Validation Runbook (Handoff + Iteration Loop)

**Branch:** `pipeline-validation-hardening`  
**Worktree (current):** `/tmp/daygame-coach-pipeline-validation-hardening` (temporary location; safe, but `/tmp` can be cleaned)  
**Canary manifest:** `docs/pipeline/batches/CANARY.1.txt`  
**Holdout manifest:** `docs/pipeline/batches/HOLDOUT.1.txt`
**Hardening manifest:** `docs/pipeline/batches/HARDENING.1.txt`

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
- 06b outputs: `data/06b.verify/<source>/<video_dir>/<stem>.verification.json`
- 06c outputs: `data/06c.patched/<source>/<video_dir>/<stem>.conversations.json`
- 07 outputs:  `data/07.content/<source>/<video_dir>/<stem>.enriched.json` and `.enriched.validation.json`
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

## Hardening Set (HARDENING.1)

`HARDENING.1` is a targeted stress set for patch-loop iteration.
Current ranked rationale (from existing 06b/06b.reverify/07 artifacts):
- `iOSpNACA9VI` (Barcelona immersion): high misattribution + boundary pressure.
- `IS2SoUgqDLE` (James Marshall): repeated high misattribution counts.
- `nFjdyAHcTgA` (7 Minute Pull): elevated `other_flags` + Stage 07 warnings.
- `mv2X8Yhg9M0` and `6ImEzB6NhiI`: recurring coach/target attribution ambiguity.
- `e2dLEB-AwmA`: known problematic holdout reference; currently lacks local 06b/07 artifacts and should be run fresh.

Latest hardening experiment snapshot (`2026-02-13`):
- Run ID: `HARDENING.1.r20260213T1041Z`
- Processed end-to-end in run namespace (no overwrite of canonical outputs): `6/6` videos
  - completed: `iOSpNACA9VI`, `IS2SoUgqDLE`, `nFjdyAHcTgA`, `mv2X8Yhg9M0`, `6ImEzB6NhiI`, `e2dLEB-AwmA`
  - Barcelona note: `iOSpNACA9VI` needed isolated Stage 06b retries; `sonnet` completed reliably where `opus` stalled.
- Aggregate outcomes on completed 6:
  - `06b.verify`: `FLAG=6`, `REJECT=0`
  - `06b.reverify`: `FLAG=6`, `REJECT=0`
  - Stage 07 validation: `errors=0`, `warnings=46`
    - `transcript_artifact=23`
    - `technique_on_non_coach_segment=19`
    - `evidence_mismatch=2`
    - `evidence_not_on_referenced_segment=2`
- Verify->reverify deltas across completed 6:
  - total misattributions: `-1`
  - total other_flags: `+5`
  - total boundary issues: `+2`
- Run-specific compatibility note:
  - `IS2SoUgqDLE` legacy Stage 06 artifact lacked top-level `transcript_confidence`; this is now handled by `06c.patch` compatibility normalization (`v1.8`) with automatic backfill.

## Run Naming + History Policy

Use stable manifest IDs for dataset membership, and explicit run IDs for repeated executions:
- Manifest IDs: `CANARY.1`, `HOLDOUT.1` (what videos are in scope)
- Run IDs: `CANARY.1.rYYYYMMDDTHHMMZ` (which execution produced validation/semantic artifacts)

Overwrite policy for stage outputs (`06`/`06b`/`06c`/`07`):
- Default behavior is **skip existing outputs**.
- A real re-run of the same manifest requires `--overwrite` (or you will mostly get skips).
- Because stage outputs live at stable canonical paths under `data/<stage>/...`, re-runs with `--overwrite` replace prior artifacts.

To preserve first-run vs Nth-run history:
- Snapshot stage artifacts before overwrite (recommended): copy `data/06.video-type`, `data/06b.verify`, `data/06b.reverify`, `data/06c.patched`, `data/07.content` to `data/archive/runs/<run_id>/`.
- Emit validation artifacts to run-scoped paths:
  - `--stage-reports-dir data/validation/stage_reports/<run_id>`
  - `--quarantine-out data/validation/quarantine/<run_id>.json`
- Use run-scoped semantic ids:
  - `semantic_judge.py --batch-id <run_id>` writes to `data/validation_judgements/<run_id>/`
  - `batch_report.py --batch-id <run_id>` reads matching semantic outputs.

Example run ID:

```bash
RUN_ID="CANARY.1.r$(date -u +%Y%m%dT%H%MZ)"
```

For isolated no-overwrite experiments, use run-scoped roots under `data/experiments/<run_id>/`:
- `06c.patch` supports:
  - `--input-root <path>` (Stage 06 root)
  - `--verification-root <path>` (Stage 06b root)
- `07.content` supports:
  - `--input-root <path>` (Stage 06c root)
  - `--verification-root <path>` (Stage 06b root)
  - `--reverify-root <path>` (Stage 06b.reverify root)

Iteration naming convention inside one experiment run:
- Keep each loop immutable with stage suffixes: `06c.patched.pass2`, `06b.reverify.pass2`, `07.content.pass2`, etc.
- Do not reuse a pass directory name; create `pass3`, `pass4`, ... for each additional loop.

One-video strict-gate example (no overwrite of canonical outputs):

```bash
RUN_ID="CANARY.1.6ImEzB6NhiI.r$(date -u +%Y%m%dT%H%MZ)"
RUN_BASE="data/experiments/${RUN_ID}"

# 1) Seed Stage 06 artifact into run namespace (or generate fresh Stage 06 in RUN_BASE).
# 2) Run verification + patch + reverify + enrichment entirely inside RUN_BASE:
./scripts/training-data/06b.verify   --input "${RUN_BASE}/06.video-type/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06.video-type" --output "${RUN_BASE}/06b.verify" --model opus --allow-reject-verdicts
./scripts/training-data/06c.patch    --input "${RUN_BASE}/06.video-type/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06.video-type" --verification-root "${RUN_BASE}/06b.verify" --output "${RUN_BASE}/06c.patched"
./scripts/training-data/06b.reverify --input "${RUN_BASE}/06c.patched/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06c.patched" --output "${RUN_BASE}/06b.reverify" --model opus
./scripts/training-data/07.content   --input "${RUN_BASE}/06c.patched/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06c.patched" --verification-root "${RUN_BASE}/06b.verify" --reverify-root "${RUN_BASE}/06b.reverify" --output "${RUN_BASE}/07.content" --verification-gate-policy reverify_patched --model opus
```

## Where the Plan Lives

- Primary long-form plan: `docs/pipeline/audits/codex_pipeline_validation.md`
- Merge/decision summary: `docs/pipeline/audits/merging_optimization.md`

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
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy allow_flag
# Optional: skip known-bad videos from a quarantine file
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy allow_flag --quarantine-file data/validation/quarantine/CANARY.1.json
# Strict reverify gate (recommended for production hardening):
# ./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/CANARY.1.txt
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy reverify_patched
```

Note: Stage 06b now drops low-confidence (<0.70) misattribution/collapse auto-fix suggestions from structured fix arrays and records those drops in `other_flags`.
If 06b returns parseable-but-schema-invalid JSON, it now performs bounded schema-repair retries before failing the video.
Stage 06/06b/06c/07 now default to source-video artifact writes (`data/<stage>/<source>/<video_dir>/<stem>.*`) while still reading legacy source-flat/root-flat artifacts for compatibility.

**Claude model strategy:**
- `06.video-type`, `06b.verify`, and `07.content` default to `--model opus`.
- Keep `opus` for both canary and holdout so quality behavior is stable across runs.

Examples:

```bash
./scripts/training-data/06.video-type --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy reverify_patched --model opus
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/HOLDOUT.1.txt --model opus
./scripts/training-data/07.content --manifest docs/pipeline/batches/HOLDOUT.1.txt --verification-gate-policy reverify_patched --model opus
# Hardening stress set:
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/HARDENING.1.txt --model opus
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/HARDENING.1.txt --allow-reject
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/HARDENING.1.txt --model opus
./scripts/training-data/07.content   --manifest docs/pipeline/batches/HARDENING.1.txt --verification-gate-policy reverify_patched --model opus
```

Notes:
- `06c.patch` defaults to refusing to patch when 06b returns `REJECT`. For iteration/salvage (when 06b suggests high-confidence deterministic fixes), you can opt in:

```bash
./scripts/training-data/06c.patch --manifest docs/pipeline/batches/HOLDOUT.1.txt --overwrite --allow-reject
```

- `06c.patch` now treats most `other_flags` as log-only by default.
  Experimental heuristic for mixed-speaker run-on flags is opt-in:

```bash
./scripts/training-data/06c.patch --input ... --apply-mixed-speaker-other-flags
```

Use that flag only for controlled experiments (it can regress quality; keep outputs in pass-scoped directories).

- `07.content` blocks `REJECT` by default (unless `--verification-gate-policy allow_flag` and patch-clean salvage applies). For debugging/evaluation you can bypass the 06b gate:

```bash
./scripts/training-data/07.content --input data/06c.patched/<source>/<video_dir>/<stem>.conversations.json --skip-verification --overwrite --model opus
```

If a `REJECT` video was patched cleanly by `06c.patch` (fixes applied, `flags_not_fixed_count=0`), Stage 07 will allow it under the same explicit waiver as `FLAG` by passing `--verification-gate-policy allow_flag` (or the legacy alias `--allow-flag`).
For stricter production gating, run `06b.reverify` on `06c.patched` outputs and use `--verification-gate-policy reverify_patched` so Stage 07 only proceeds when baseline `06b.verify` exists and reverify is `APPROVE`/`FLAG`.
When run via `sub-batch-pipeline --stage 07 --verification-gate-policy reverify_patched`, the orchestrator now auto-synthesizes `data/validation/quarantine/<subbatch>.json` from reverify `REJECT` verdicts when no quarantine file is present.

### 1b) Revalidate Stage 07 (no Claude; deterministic)

Use this after changing Stage 07 normalization/validators, to refresh outputs without rerunning the LLM:

```bash
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --revalidate
# Strict gate-friendly revalidate (recommended when using reverify_patched):
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --revalidate --verification-gate-policy reverify_patched --quarantine-file data/validation/quarantine/CANARY.1.json
```

### 2) PASS/FAIL harness (read-only)

This includes:
- artifact presence checks (06b/06c/07)
- Stage 06b verification payload contract sanity checks
- cross-stage consistency (06/06c vs 07)
- Stage 07 per-file validation summary (warnings/errors) and partial-write detection
- Optional Stage 01 artifact integrity check (`--skip-stage01-presence` when validating archived outputs that no longer retain Stage 01 `.wav` files)

```bash
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --stage07-gate-policy reverify_patched
```

To also require Stage 05 audio_features artifacts/payload integrity in the same harness run, add `--check-stage05-audio`.
To also require Stage 09 chunk artifacts/payload integrity in the same harness run, add `--check-stage09-chunks`.
That check now enforces stable `sourceKey`/`videoId`/`channel` alignment plus `chunkIndex`/`totalChunks` consistency and continuity.
To also enforce Stage 08 report integrity in the same harness run, add `--check-stage08-report`.
When `--source` is also set, Stage 08 report names are source-scoped (`<manifest>.<source>.report.json`) and scope metadata is validated.
If you run via `sub-batch-pipeline`, use:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep`
(`--validate-deep` now expands to `--check-stage05-audio --check-stage08-report --check-stage09-chunks`.)
To use permissive Stage 07 gating in validation (`FLAG` and patched-clean `REJECT` allowed), add:
`--stage07-gate-policy allow_flag` (or `--allow-flag` alias in the orchestrator).
To require strict reverify gating in validation, use:
`--stage07-gate-policy reverify_patched` (requires `data/06b.reverify/*` artifacts for the manifest scope).
To scope validation to a single source within the manifest:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --source <source_name>`
Optional waivers: `--waiver-file docs/pipeline/waivers/CANARY.1.json` to downgrade explicit known checks (video/check scoped) to `info`.
If a waiver includes `expires_at` and that timestamp is in the past, it is ignored automatically.
The same waiver file can be passed through the orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep --waiver-file docs/pipeline/waivers/CANARY.1.json`
If `docs/pipeline/waivers/CANARY.1.json` exists, `sub-batch-pipeline CANARY.1 --validate` auto-detects and applies it.
Optional stage-report emission:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --emit-stage-reports`
This writes per-video reports to `data/validation/stage_reports/CANARY.1/`.
Optional quarantine emission:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --emit-quarantine`
This writes `data/validation/quarantine/CANARY.1.json` (or `.../<manifest>.<source>.json` with `--source`).
To apply an existing quarantine list during validation:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --quarantine-file data/validation/quarantine/CANARY.1.json`
Validate emitted reports with:
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary`
Optional readiness hardening during summary generation:
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary --block-review-ingest`
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary --block-warning-check transcript_artifact --max-warning-checks 3`
The same can be triggered from the orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports`
(`sub-batch-pipeline` now runs this contract+coverage check automatically and writes `readiness-summary.json` under the stage-reports directory.)
With orchestrator readiness policy controls:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports --block-review-ingest`
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports --block-warning-check transcript_artifact --max-warning-checks 3`
Optional semantic-quality gate in the same `--validate` run (requires semantic_judge outputs):
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`
Strict one-flag profile:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --quality-gate`
(`--quality-gate` expands to deep checks + stage reports + READY-only readiness + warning policy + semantic defaults.)
To also run Stage 10 ingest gates in dry-run mode (no DB writes) at the end of validation:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --quality-gate --check-stage10`
Or emit quarantine from orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-quarantine`
Then Stage 07 can auto-consume `data/validation/quarantine/CANARY.1.json` when run via:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --stage 07`
In `reverify_patched` mode, Stage 07 also auto-generates that quarantine file from 06b.reverify verdicts if it is missing.

### 3) Scorecard (writes by default, use `--no-write` if you only want stdout)

```bash
python3 scripts/training-data/validation/batch_report.py \
  --all \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --batch-id CANARY.1 \
  --no-write
```

Note: if `data/validation_judgements/<batch_id>/` exists (from `semantic_judge.py`), the batch report will include a semantic-score summary.
You can enforce semantic thresholds directly in `batch_report.py` (non-zero exit on gate failure), e.g.:
`python3 scripts/training-data/validation/batch_report.py --all --manifest docs/pipeline/batches/CANARY.1.txt --batch-id CANARY.1 --no-write --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`

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
Stage 10 also requires a readiness summary at `data/validation/stage_reports/<manifest>/readiness-summary.json` (or `<manifest>.<source>/` for `--source` runs) and will refuse ingest if:
- the summary is missing/invalid
- the summary does not cover the ingest manifest scope
- the summary scope metadata (when present) does not match ingest manifest/source
- any ingest-scope video is not ingest-ready (`BLOCKED` or `ready_for_ingest=false`; default policy keeps REVIEW ingest-allowed)
To enforce READY-only ingest, generate readiness summaries with `--block-review-ingest`.
Stage 10 can optionally run a semantic-quality gate for the same manifest scope when `--semantic-*` flags are provided (native gate logic aligned with `batch_report.py`).
Example:
`node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --dry-run --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`
Shortcut:
`node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --dry-run --quality-gate`
If semantic judgements use a different directory label than the manifest stem, pass `--semantic-batch-id <id>`.
Stage 10 writes a semantic gate report to `data/validation/semantic_gate/<manifest>[.<source>].<batch_id>.report.json` by default (override with `--semantic-report-out <path>`).
Use `--skip-taxonomy-gate` only when you intentionally bypass this gate.
Use `--skip-readiness-gate` only when you intentionally bypass readiness gating.
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
