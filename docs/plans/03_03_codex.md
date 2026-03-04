# 03_03_codex

Date: 2026-03-03
Operator: Codex

## 1. Mission

Improve the training-data pipeline so that:
- real low-quality / contaminated videos are blocked before ingest
- runtime failures are not mislabeled as content-quality truth
- each video carries forward auditable repair/risk metadata
- sub-batches keep moving through the pipeline without adding alternate or legacy paths

This plan is execution-oriented. It is meant to be followed by an AI agent without waiting for more prompts except where a real product or policy decision is required.

## 2. Non-Negotiable Rules

1. Use the existing pipeline, not side workflows.
- Fix stages, validators, prompts, contracts, or policy.
- Do not add bypass modes, fallback branches, or parallel "temporary" methods.

2. Required LLM stages must use real Claude CLI calls.
- Stages `06`, `06b`, `06e`, `06g`, `07`, and `07b` must run through real Claude CLI.
- In this environment, production LLM runs should execute outside sandbox restrictions when needed so Claude runtime failures are real pipeline evidence, not sandbox noise.

3. No heuristic replacement for a broken LLM stage.
- If a required LLM stage is failing, either fix the stage/runtime or stop and ask the user.
- Do not synthesize missing artifacts.

4. Artifact truth beats metadata.
- Trust order:
  1. `docs/pipeline/batches/*.txt`
  2. stage artifacts under `data/<stage>/...`
  3. `data/validation/stage_reports/...`
  4. `data/validation/gates/...`
  5. `data/validation/quarantine/...`
  6. `data/validation/ingest_quarantine/...`
  7. `data/.ingest_state.json`
  8. `docs/pipeline/batches/*.status.json` only as advisory

5. No new real ingest without explicit user approval.
- Stage 10 dry-run is part of normal evidence gathering.
- Non-dry-run ingest remains a user decision.

6. Replace, do not accumulate.
- If a rule, stage position, or report field is wrong, change the canonical path and remove or retire the old behavior.

## 3. Current Known Problems Entering This Plan

1. Historical false-pass evidence exists.
- `P001.3` contains an ingested video (`D1t_K8hjJzc`) that was later marked as severe `06h` contamination: `514/~550` contaminated segments.

2. Historical gate drift exists.
- `P001.4` was historically ingested for two videos, but current artifacts quarantine them.
- Current `06b` artifacts for those two videos are fail-closed `llm_call_error` rejects, which is infrastructure truth, not content truth.

3. Current warning / block semantics are not yet trustworthy enough.
- Existing warning/error counts do not reliably represent what should actually block.
- A video can carry major damage and still reach ingestable status.

4. Runtime failure and content failure are not cleanly separated.
- A Claude runtime failure can currently collapse into `REJECT`, which pollutes downstream quality truth.

## 4. Success Criteria

This work cycle is successful when all are true:

1. At least one previously suspicious historical ingest decision is explained by artifact evidence.
2. At least one active sub-batch is rerun with real Claude CLI calls through its remaining stages.
3. At least one concrete pipeline bug is fixed in code or config, not just documented.
4. Validation and Stage 10 dry-run after the fix produce a more defensible result than before.
5. Documentation is updated so the next agent can continue from artifacts, not chat memory.

## 5. Work Strategy

Use short loops:

1. Audit truth.
2. Pick the smallest high-signal sub-batch.
3. Run the sub-batch with real Claude stages.
4. Read artifacts, not assumptions.
5. Patch one bounded issue.
6. Rerun from the earliest affected stage.
7. Re-validate and compare.
8. Log the outcome.

Do not batch together unrelated fixes.

## 6. Initial Scope

### 6.1 Retrospective Truth Audit

Audit these first:
- `P001.3`
- `P001.4`

Purpose:
- identify exactly which ingested videos look wrongly accepted
- separate content-quality failures from runtime / artifact drift

### 6.2 Active Execution Targets

Run these next, in this order unless evidence changes:

1. `P001.5`
- Near-complete and likely to expose real downstream gating defects quickly.

2. `P001.8`
- Useful for checking whether `06h -> 07 -> 07b -> 09` is carrying damage truth correctly.

3. `P001.10`
- Useful if `P001.8` shows Stage `07` / `08` interaction problems but not enough variety.

Do not reopen `P001.6` first unless evidence shows a false reject rather than a terminal all-block outcome.

## 7. Step-by-Step Execution Plan

### Step 1. Create Baseline Truth Packets

For each target sub-batch:
- collect readiness summary
- collect canonical gate
- collect quarantine artifact
- collect Stage 10 dry-run report
- collect scorecard
- collect ingest state rows if historical ingest exists

Commands:

```bash
python3 scripts/training-data/validation/pipeline_scorecard.py \
  --manifest docs/pipeline/batches/P001.5.txt \
  --run-id 20260303.P001.5.baseline \
  --out data/validation/runs/20260303.P001.5.baseline/scorecard.json

./scripts/training-data/batch/sub-batch-ops P001.5 --validate

node --import ./node_modules/tsx/dist/loader.mjs \
  scripts/training-data/10.EXT.ingest.ts \
  --manifest docs/pipeline/batches/P001.5.txt \
  --dry-run \
  --quarantine-report-out data/validation/ingest_quarantine/P001.5.20260303.baseline.report.json
```

Repeat for `P001.8` after `P001.5`.

### Step 2. Write a False-Pass / False-Block Table

For each historically ingested target video:
- ingest timestamp
- evidence that supported ingest at the time
- latest contradictory evidence
- classify the contradiction:
  - `content_false_pass`
  - `runtime_false_block`
  - `artifact_drift`
  - `policy_drift`

Initial known rows:
- `D1t_K8hjJzc`
- `XDZbqorwGNk`
- `NBJ0JkyyqR0`
- `zi8EvOdRQiI`

### Step 3. Run a Real Claude Execution Loop on One Active Sub-batch

Use sub-batch-wide conveyor execution, not one-video manual stage stepping.

Default command shape:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.5 --from 06b --parallel 10
```

If baseline artifacts prove upstream truth is already good enough, resume later:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.5 --from 07b --parallel 10
```

Rules:
- use host Claude CLI execution
- keep all videos in the chosen sub-batch moving stage by stage together
- do not manually patch per-video outputs to "get through"

### Step 4. Validate Immediately After the Run

Always run:

```bash
./scripts/training-data/batch/sub-batch-ops P001.5 --validate

node --import ./node_modules/tsx/dist/loader.mjs \
  scripts/training-data/10.EXT.ingest.ts \
  --manifest docs/pipeline/batches/P001.5.txt \
  --dry-run \
  --quarantine-report-out data/validation/ingest_quarantine/P001.5.20260303.postrun.report.json

python3 scripts/training-data/validation/pipeline_scorecard.py \
  --manifest docs/pipeline/batches/P001.5.txt \
  --run-id 20260303.P001.5.postrun \
  --out data/validation/runs/20260303.P001.5.postrun/scorecard.json
```

### Step 5. Identify the Earliest Wrong Stage

When a result is suspicious, ask:

1. Was the damage truth missing upstream?
- likely `06e`, `06f`, `06g`, or `06h`

2. Was the damage truth present but ignored by readiness?
- likely `validate_manifest.py`, `validate_stage_report.py`, or `pipeline.config.json`

3. Was the video blocked for the wrong reason?
- likely stage report normalization or quarantine emission

4. Was the "reject" actually a Claude runtime failure?
- likely stage runtime / Claude integration issue, not content evaluation

Patch the earliest wrong stage or policy point, not a downstream symptom.

### Step 6. Patch Only One Bounded Issue per Iteration

Allowed patch classes:
- prompt/schema fixes for a required LLM stage
- stricter stage contract
- better damage propagation
- readiness / gating policy correction
- clearer stage report semantics
- stage reordering if evidence proves the current order is structurally wrong

Disallowed patch classes:
- fallback output generation
- "temporary" alternate thresholds outside canonical config
- manual status-file reconciliation as a substitute for artifact fixes

### Step 7. Rerun From Earliest Affected Stage

Examples:
- if `06h` damage truth changed, rerun from `06h`
- if only readiness policy changed, rerun validation + Stage 10 dry-run
- if `07b` contract changed, rerun from `07b`

Prefer the smallest restart point that still preserves single-path truth.

### Step 8. Record Before/After Evidence

For each iteration, update:
- `docs/pipeline/audits/iteration-history.md`
- this plan document

Minimum fields:
- hypothesis
- exact files changed
- run scope
- before/after scorecard
- decision: keep / revert / adjust
- next hypothesis

## 8. What Must Be Preserved in Video Metadata

As videos move through the pipeline, the final auditable record must retain:
- stage verdicts
- repairs applied
- unresolved transcript / contamination risk
- damage profile
- quarantine reasons
- canonical gate decision
- ingest eligibility basis

If those facts are currently lost between stages, patch the reporting/validation path so they survive to the end.

## 9. Questions the Agent Must Keep Asking

For each suspicious video:

1. What is the first stage that knew this video was bad?
2. If a stage knew, why did that truth not survive downstream?
3. If no stage knew, is the wrong stage responsible, or is a missing stage needed?
4. Is the current order of `06e -> 06f -> 06g -> 06h -> 07 -> 07b -> 08 -> 09` actually serving truth?
5. Is a given stage adding signal, or only artifact churn?

Do not reorder or remove stages casually. Do it only when the evidence shows the current order is structurally wrong.

## 10. Stop Conditions Requiring User Input

Stop and ask the user if any of these become necessary:

1. A proposed fix would require reopening or purging already ingested DB data.
2. A proposed stage reorder would invalidate a large body of existing artifacts and needs an explicit migration decision.
3. Claude host execution fails for environmental reasons that cannot be fixed from repo code.
4. A product decision is required about whether a class of videos should be categorically excluded.

## 11. Immediate Next Actions

1. Write this plan.
2. Build the retrospective truth table for `P001.3` and `P001.4`.
3. Create baseline scorecards / validation packets for `P001.5`.
4. Run `P001.5` with real Claude CLI at sub-batch scope.
5. Patch the first clearly bounded truth bug that the run exposes.
6. Rerun and compare.

## 12. Live Execution Log

- 2026-03-03: Plan created.
- 2026-03-03: Baseline packet created for `P001.5`:
  - `./scripts/training-data/batch/sub-batch-ops P001.5 --validate`
  - `python3 scripts/training-data/validation/pipeline_scorecard.py --manifest docs/pipeline/batches/P001.5.txt --run-id 20260303.P001.5.baseline --out data/validation/runs/20260303.P001.5.baseline/scorecard.json`
- 2026-03-03: Confirmed `P001.5` was falsely frozen behind runtime-derived `07b` quarantine, not content truth:
  - all `10/10` `07b` artifacts were fail-closed `llm_no_output`
  - restarting `P001.5` from `07b` initially skipped all videos as "already quarantined before run"
- 2026-03-03: Patched canonical rerun semantics in `scripts/training-data/batch/pipeline-runner`:
  - restart from stage `S` now ignores same-stage and downstream quarantine reasons when deciding pre-run skips
  - upstream quarantine reasons are still retained and written back into the canonical quarantine artifact
- 2026-03-03: Reran `P001.5` from `07b` with real Claude CLI calls at sub-batch scope:
  - command: `./scripts/training-data/batch/sub-batch-pipeline P001.5 --from 07b --parallel 10`
  - result after validation: `READY=4`, `REVIEW=4`, `BLOCKED=2`
  - Stage 10 dry-run result after rerun: `8/10` ingest-eligible under current policy, blocked IDs `d8C0t7FS3qM`, `d8H9RlGpS0g`
- 2026-03-03: Confirmed one historical false-pass root shape:
  - `D1t_K8hjJzc` was ingested via `P001.3-clean`
  - later `P001.3` quarantine marked it severe `06h` contamination (`514/~550` contaminated segments)
  - older readiness artifact for `P001.3-clean` had no damage-profile-based gating, so this was a real validator-truth gap, not only an operator miss
- 2026-03-03: Confirmed a current policy-drift candidate for next iteration:
  - docs/history describe READY-only ingest gating
  - committed config `scripts/training-data/batch/pipeline.config.json` currently sets `allow_ingest_statuses = [READY, REVIEW]`
  - this must be resolved explicitly after current auto-repair evidence is collected
- 2026-03-03: Auto-repair attempt 1 on `P001.5` completed with a real improvement:
  - target scope: 6 videos
  - improved: 1, regressed: 0, unchanged: 5
  - `Y9D7p8KMZek` moved `REVIEW -> READY` and damage score dropped `0.235395 -> 0.060907`
- 2026-03-03: Confirmed a second earlier truth-loss bug:
  - `g35sbdbjNXw` had a real Stage `07b` artifact with `gate_decision=review` and `reason_code=section_coverage_gap`
  - end-of-run manifest/stage-report validation was ignoring `07b` review truth and still marking the video `READY`
- 2026-03-03: Patched `scripts/training-data/validation/validate_manifest.py` so Stage `07b` decisions survive into canonical manifest reports:
  - `07b` is no longer presence-only at end-of-run validation
  - `stage07b_gate_review` / `stage07b_gate_block` now become canonical report issues
  - `P001.5` readiness shifted from `READY=5 / REVIEW=3 / BLOCKED=2` to `READY=4 / REVIEW=4 / BLOCKED=2`
- 2026-03-03: Restored single-path READY-only ingest gating:
  - removed review-ingest override flow from `validate_stage_report.py`
  - removed override wiring from `sub-batch-pipeline`
  - removed `allow_ingest_statuses` override from `pipeline.config.json`
  - `P001.5` dry-run ingest scope dropped from `8/10` to `4/10`
  - current dry-run eligible set: `jl5tLCqpTNo`, `l5zEcgIS2Pw`, `LftMFDMrfAQ`, `Y9D7p8KMZek`
- 2026-03-03: Cleaned Stage 10 repair metadata under READY-only gating:
  - `10.EXT.ingest.ts` now deduplicates `segment_repair_candidates` by video/window/reason
  - `P001.5` repair worklist dropped from `46` duplicate rows to `26` unique windows
  - non-ingest-eligible review videos now appear once per window as `REVIEW`, not as duplicate `REVIEW` + `BLOCKED`
- 2026-03-03: Began `P001.4` live rerun from `06b` with real Claude CLI:
  - command: `./scripts/training-data/batch/sub-batch-pipeline P001.4 --from 06b --parallel 10`
  - rerun semantics correctly reopened the full batch by ignoring stale same-stage/downstream quarantine
- 2026-03-03: Confirmed `P001.4` main rerun truth before auto-repair:
  - pre-auto-repair readiness was `READY=1`, `REVIEW=7`, `BLOCKED=2`
  - `iOSpNACA9VI` and `n0smMRCqVmc` were both healthy `REVIEW` videos at that point, not quarantined
- 2026-03-03: Found a second orchestrator bug during targeted rerun work:
  - `pipeline-runner` restart filtering was rewriting the entire sub-batch quarantine file, even for videos outside the current retry manifest
  - patched `scripts/training-data/batch/pipeline-runner` so same-stage/downstream quarantine removal is scoped only to the active manifest video IDs
- 2026-03-03: Isolated the current `P001.4` stale-quarantine problem to auto-repair `07` runtime behavior:
  - direct isolated `07.LLM.content` rerun for `n0smMRCqVmc` succeeds cleanly against current `06h` inputs
  - targeted `07 -> 07b` rerun of `iOSpNACA9VI` + `n0smMRCqVmc` under real Claude shows `n0smMRCqVmc` hitting a `07` timeout retry only when run in parallel with the larger `iOSpNACA9VI`
  - this is evidence of Stage `07` Claude runtime contention under parallel load, not a content-truth reject
- 2026-03-03: Hardened canonical Claude CLI invocation across pipeline LLM stages:
  - updated `06.LLM.video-type`, `06b.LLM.verify`, `06e.LLM.quality-check`, `06g.LLM.damage-adjudicator`, `07.LLM.content`, and `07b.LLM.enrichment-verify`
  - real Claude CLI is still used, but now with `--tools "" --strict-mcp-config --no-session-persistence`
  - local verification succeeded with `claude -p` using those flags
- 2026-03-04: Fixed the remaining `P001.4` stale Stage `07` execution failure at the source:
  - measured `n0smMRCqVmc` single-call infield prompt at `24772` chars, which was too close to the old fixed `300s` timeout boundary
  - updated `scripts/training-data/07.LLM.content` to:
    - compute adaptive Claude timeouts from prompt size and segment count
    - switch oversized single-call infield runs onto prompt-budget windowing
    - retune the budget to `17500` chars with `window_size=20` / `overlap=5` minima so large compilations split more aggressively
  - isolated rerun command:
    - `python3 scripts/training-data/batch/pipeline-runner P001.4 --parallel 1 --from 07 --to 07b --manifest /tmp/p0014_n0sm_only.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
  - result:
    - `n0smMRCqVmc` no longer hits `stage07_execution_error`
    - Stage `07` completed as `5` windows / `585.2s` total
    - Stage `07b` returned `gate=pass reason=adequate_enrichment_noisy_compilation`
- 2026-03-04: Promoted `damaged_chunk_ratio` into canonical readiness gating:
  - evidence:
    - `P001.5` still had `READY` videos with `damaged_chunk_ratio=0.351` (`LftMFDMrfAQ`) and `0.280` (`Y9D7p8KMZek`) under the old policy because only `video_damage_score` and `severe_damage_chunk_ratio` were enforced
  - patched:
    - `scripts/training-data/validation/validate_stage_report.py`
    - `scripts/training-data/batch/sub-batch-pipeline`
    - `scripts/training-data/batch/pipeline.config.json`
  - new thresholds:
    - `review_damaged_chunk_ratio = 0.25`
    - `block_damaged_chunk_ratio = 0.6`
  - measured validation result after rerun:
    - `P001.4`: `READY=1 / REVIEW=6 / BLOCKED=3`
    - `n0smMRCqVmc` is now blocked for truth, not runtime noise: `policy_block_damaged_chunk_ratio:0.711>0.600`
    - `P001.5`: `READY=2 / REVIEW=5 / BLOCKED=3`
    - `LftMFDMrfAQ` and `Y9D7p8KMZek` moved `READY -> REVIEW`
    - `6ImEzB6NhiI` moved `REVIEW -> BLOCKED` on `damaged_chunk_ratio:0.659>0.600`
    - remaining READY set across `P001.4/P001.5` is now only zero-damage videos: `zi8EvOdRQiI`, `jl5tLCqpTNo`, `l5zEcgIS2Pw`
- 2026-03-04: Refined review reason codes so repair metadata preserves the actionable underlying check:
  - patched `scripts/training-data/validation/validate_stage_report.py`
  - when a review is driven by the `other_quality` class, the canonical `reason_code` now preserves the dominant contributing check instead of collapsing to `other_quality`
  - measured outcomes after `P001.4` / `P001.5` revalidation:
    - `KURlBcRF6-M` now reports `stage07b_gate_review`
    - `g35sbdbjNXw` now reports `stage07b_gate_review`
    - `FVNOq-rQ2O0`, `NBJ0JkyyqR0`, `SPDOb_IE5YM`, `srq1OVqxX0E`, `7BfD4URAD1Y` now report `stage06b_flag`
    - Stage 10 repair worklists now carry those reasons through into localized windows and repair manifests
