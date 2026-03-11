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
- 2026-03-04: Targeted `07 -> 07b` repair reruns on remaining `stage07b_gate_review` videos:
  - manifests:
    - `data/validation/tmp/P001.4.stage07b-review.txt`
    - `data/validation/tmp/P001.5.stage07b-review.txt`
  - commands:
    - `python3 scripts/training-data/batch/pipeline-runner P001.4 --parallel 2 --from 07 --to 07b --manifest data/validation/tmp/P001.4.stage07b-review.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2 --stage-parallel-cap 07=1`
    - `python3 scripts/training-data/batch/pipeline-runner P001.5 --parallel 1 --from 07 --to 07b --manifest data/validation/tmp/P001.5.stage07b-review.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2 --stage-parallel-cap 07=1`
  - results:
    - `g35sbdbjNXw`: `review(section_coverage_gap)` -> `pass(adequate_evidence_minor_coverage_gap)`
    - `iOSpNACA9VI`: `review(summary_aggregation_contract_violation)` -> `pass(adequate_compilation_enrichment)`
    - `KURlBcRF6-M`: stayed `review`, but sharpened from `technique_misattribution_conv1` to `technique_description_contradiction`
  - downstream effect after validation:
    - `P001.5` moved `READY=2 / REVIEW=5 / BLOCKED=3` -> `READY=3 / REVIEW=4 / BLOCKED=3`
    - ingest-eligible set for `P001.5` is now `g35sbdbjNXw`, `jl5tLCqpTNo`, `l5zEcgIS2Pw`
    - `P001.4` readiness counts did not move because `iOSpNACA9VI` is still held in review by `stage06b_flag`
- 2026-03-04: Began a targeted `06b` stability probe on the remaining `stage06b_flag` set using fresh real-Claude verification:
  - manifests:
    - `data/validation/tmp/P001.4.stage06b-flag.txt`
    - `data/validation/tmp/P001.5.stage06b-flag.txt`
  - commands:
    - `python3 scripts/training-data/batch/pipeline-runner P001.4 --parallel 5 --from 06b --to 06b --manifest data/validation/tmp/P001.4.stage06b-flag.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P001.5 --parallel 1 --from 06b --to 06b --manifest data/validation/tmp/P001.5.stage06b-flag.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
  - critical systems finding:
    - `06b.LLM.verify` currently serializes Claude calls behind a global `/tmp/stage06b_claude.lock`, so runner parallelism does not translate into true Stage `06b` concurrency
  - completed probe results so far:
    - `NBJ0JkyyqR0`: `FLAG -> APPROVE`
    - `SPDOb_IE5YM`: remains `FLAG`
    - `iOSpNACA9VI`: remains `FLAG`
    - `FVNOq-rQ2O0`: remains `FLAG`
  - interpretation:
    - `stage06b_flag` is not stable enough to harden globally on its own
    - at least one previous flag was verifier-variant (`NBJ0JkyyqR0`)
    - some flags persist but with much narrower structural reasons than before (`FVNOq-rQ2O0`, `iOSpNACA9VI`, `SPDOb_IE5YM`)
- 2026-03-04: Replaced coarse `stage06b_flag` readiness truth with class-specific `06b` issues when verification detail exists:
  - patched `scripts/training-data/validation/validate_manifest.py`
  - new behavior:
    - `stage06b_flag` stays as a fallback warning only for old coarse artifacts
    - for `06b.LLM.verify-v3.1` artifacts, coarse `stage06b_flag` downgrades to informational context
    - manifest validation now emits canonical per-class issues such as:
      - `stage06b_video_type_mismatch`
      - `stage06b_misattribution`
      - `stage06b_collapse_issue`
      - `stage06b_boundary_issue`
      - `stage06b_missing_target_coverage`
      - `stage06b_mixed_speaker_segment`
      - `stage06b_video_type_ambiguity`
    - those checks now flow into readiness through existing canonical signal classes instead of a generic `other_quality` bucket
  - measured validation impact:
    - `P001.4` still validates at `READY=1 / REVIEW=6 / BLOCKED=3`, but review reasons are materially sharper:
      - `FVNOq-rQ2O0 -> routing_mismatch`
      - `iOSpNACA9VI -> transcript_quality`
      - `srq1OVqxX0E -> transcript_quality`
    - `P001.5` still validates at `READY=3 / REVIEW=4 / BLOCKED=3`, but `06b`-driven reviews are now canonical structural reasons:
      - `7BfD4URAD1Y -> conversation_structure`
      - `HqQdRyRgPtU -> conversation_structure`
    - Stage 10 dry-run remains:
      - `P001.4`: `1/8` ingest-eligible (`zi8EvOdRQiI`)
      - `P001.5`: `3/10` ingest-eligible (`g35sbdbjNXw`, `jl5tLCqpTNo`, `l5zEcgIS2Pw`)
  - concrete `v3.1` evidence now on disk:
    - `srq1OVqxX0E`: `missing_target_coverage` + `video_type_mismatch`
    - `FVNOq-rQ2O0`: `mixed_speaker_segment` (moderate), `within_segment_boundary_bleed` (minor), `missing_target_coverage` (minor), `video_type_ambiguity` (moderate)
  - operator-path cleanup:
    - fixed validator message rendering so null `speaker_id` values no longer leak as `speaker=None`
- 2026-03-04: Current open systems issue at Stage `06b` is real throughput semantics, not truth semantics:
  - live process inspection still shows one actual `claude` child active at a time under the global `/tmp/stage06b_claude.lock`
  - this means `pipeline-runner --parallel N` does not yet guarantee true Stage `06b` concurrency, even though the new validation truth path is now improved
  - do not remove this lock blindly; validate it with a controlled real-Claude concurrency smoke test first because Stage `07` already showed one real parallel-runtime defect earlier in this iteration
- 2026-03-04: Completed the remaining `06b` `v3.1` sample for `iOSpNACA9VI` and refreshed `P001.4` validation:
  - fresh `06b` result for `iOSpNACA9VI` no longer claims a hard collapse error
  - canonical findings are now:
    - `stage06b_role_ambiguity` on segment `399` (moderate, human ear-check needed)
    - `stage06b_missing_target_coverage` on montage-style conversation `11` (minor)
  - downstream effect:
    - `P001.4` still validates `READY=1 / REVIEW=6 / BLOCKED=3`
    - but `iOSpNACA9VI` moved from generic `transcript_quality` review to the more truthful `conversation_structure`
    - Stage 10 dry-run remains `1/8` ingest-eligible (`zi8EvOdRQiI`)
- 2026-03-04: Ran an A/B readiness calibration against current stage reports instead of changing config blindly:
  - simulated policy:
    - `--block-warning-check stage06b_misattribution`
    - `--block-warning-check stage06b_role_ambiguity`
  - measured fallout:
    - `P001.4` would shift `READY=1 / REVIEW=6 / BLOCKED=3` -> `READY=1 / REVIEW=5 / BLOCKED=4`
    - `iOSpNACA9VI` would become `BLOCKED` only because of one moderate `stage06b_role_ambiguity`
    - `P001.5` would shift `READY=3 / REVIEW=4 / BLOCKED=3` -> `READY=3 / REVIEW=2 / BLOCKED=5`
    - `7BfD4URAD1Y` and `HqQdRyRgPtU` would both become `BLOCKED` only because of `stage06b_misattribution`
  - decision:
    - do **not** globally hard-block `stage06b_misattribution` or `stage06b_role_ambiguity`
    - current data says these are strong review signals, not universal block signals
- 2026-03-04: Controlled lock-off smoke test on Stage `06b` showed the global lock is currently hiding a real runtime failure mode:
  - smoke manifest:
    - `data/validation/tmp/P001.4.stage06b-lock-smoke.txt`
  - command:
    - `STAGE06B_CLAUDE_LOCK=0 python3 scripts/training-data/batch/pipeline-runner P001.4 --parallel 2 --from 06b --to 06b --manifest data/validation/tmp/P001.4.stage06b-lock-smoke.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
  - observed behavior:
    - both workers reached real Claude invocation in parallel
    - both immediately hit repeated `rc=1` transient failures and never progressed
    - captured debug payloads show:
      - `getaddrinfo EAI_AGAIN api.anthropic.com`
      - `EACCES: permission denied, open '/home/jonaswsl/.claude/debug/<session>.txt'`
  - decision:
    - keep the `06b` global lock for now
    - if we want to remove it later, we need a real CLI/runtime fix first, not a config flip
- 2026-03-04: Fixed a real `06b` contract-normalization bug that was polluting flag summaries:
  - patched `scripts/training-data/06b.LLM.verify`
  - none-like placeholder values such as `suggested_role='None'` or `suggested_override='None'` are now ignored cleanly during normalization
  - this prevents bogus dropped-note artifacts from inflating `other_flags` / `other_unclassified`
  - direct synthetic verification:
    - `normalize_misattributions([{'segment_id':399,'suggested_role':'None','confidence':0.9}]) -> ([], [])`
    - `normalize_collapse_issues([{'speaker_id':'SPEAKER_01','segment_id':58,'suggested_override':'None','confidence':0.9}]) -> ([], [])`
- 2026-03-04: Fixed another real rerun deadlock in `pipeline-runner` quarantine reopening:
  - problem:
    - `manifest_missing_stage07_output` / `missing_stage09_chunks` style checks were not mapped back to their owning stage keys
    - restart filtering also retained synthetic `preexisting_quarantine` rows written by the runner itself
    - result: targeted recovery manifests could remain permanently self-quarantined even when rerunning from the correct stage
  - patched `scripts/training-data/batch/pipeline-runner` to:
    - infer stage keys from embedded patterns like `_stage07_`, `_stage07b_`, `_stage09_`
    - ignore synthetic `preexisting_quarantine` checks during restart filtering
    - stop persisting `preexisting_quarantine` as a new quarantine reason during skip-only runs
    - expose skipped-preexisting videos separately in the runner summary
  - concrete recovery proof:
    - `P001.8` targeted manifest `data/validation/tmp/P001.8.from07-recovery.txt` now reopens instead of instant-skipping
    - active recovery run started:
      - `python3 scripts/training-data/batch/pipeline-runner P001.8 --parallel 3 --from 07 --to 09 --manifest data/validation/tmp/P001.8.from07-recovery.txt --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2 --stage-parallel-cap 07=1`
    - live process state after the fix:
      - `FNpZs1VhwaA` entered real Stage `07` under one active Claude worker
      - `-iCf6UX3ZMg` and `e2dLEB-AwmA` are queued behind the stable `07=1` cap
- 2026-03-04: Fresh baseline on `P001.8` under current truth rules:
  - validation result:
    - `READY=3 / REVIEW=4 / BLOCKED=3`
    - dry-run ingest set: `EscjHJHTuSs`, `QvGtRoklA3A`, `YOEP0380xD4`
  - blocked set is entirely the three missing-Stage-07 videos, not content-truth failures:
    - `-iCf6UX3ZMg`
    - `FNpZs1VhwaA`
    - `e2dLEB-AwmA`
  - review set is current quality-truth:
    - `YpOTPGIZwtk -> policy_review_damaged_chunk_ratio:0.471>0.250`
    - `rMNSFU7TyIg -> policy_review_damaged_chunk_ratio:0.400>0.250`
    - `ndYaBU7K82o -> contamination_risk`
    - `vWr955SeGXs -> contamination_risk`
- 2026-03-04: Fixed stale Stage `08` truth after targeted recovery:
  - `sub-batch-pipeline --validate` now refreshes the canonical manifest-level Stage `08` report before `validate_manifest.py` reads it
  - `08.DET.taxonomy-validation` now excludes only upstream quarantine from coverage checks, so stale Stage `08/09` blocks cannot hide freshly recovered `07` outputs
  - `validate_manifest.py` now rebuilds same-file quarantine emission from current issues instead of perpetuating stale input membership
  - concrete outcome on `P001.8`:
    - Stage `08` moved from stale `FAIL (missing_stage07_enriched x3)` to current `WARNING`
    - quarantine file collapsed from 3 false Stage `08` blocks to `0`
- 2026-03-04: Repaired `P001.8` confidence-trace debt at the actual owning stage:
  - targeted `06h -> 09` rerun on:
    - `-iCf6UX3ZMg`
    - `FNpZs1VhwaA`
    - `e2dLEB-AwmA`
  - result:
    - all three now have fresh `.confidence.trace.json`
    - `validate_confidence_trace.py` now passes `P001.8` at `10/10`
  - current `P001.8` truth after revalidation:
    - `READY=3 / REVIEW=6 / BLOCKED=1`
    - dry-run ingest remains `3/10`: `EscjHJHTuSs`, `QvGtRoklA3A`, `YOEP0380xD4`
    - real non-READY set is now:
      - `-iCf6UX3ZMg -> REVIEW conversation_structure`
      - `FNpZs1VhwaA -> REVIEW conversation_structure`
      - `e2dLEB-AwmA -> BLOCKED policy_warning_class_budget_exceeded:contamination_risk:3>2`
      - `ndYaBU7K82o -> REVIEW contamination_risk`
      - `rMNSFU7TyIg -> REVIEW policy_review_damaged_chunk_ratio:0.400>0.250`
      - `vWr955SeGXs -> REVIEW contamination_risk`
      - `YpOTPGIZwtk -> REVIEW policy_review_damaged_chunk_ratio:0.471>0.250`
- 2026-03-04: Canonicalized confidence-trace repair targeting:
  - `validate_confidence_trace.py` now supports `--out` and writes a reusable JSON report
  - `sub-batch-pipeline validate_sub_batch` now emits `data/validation/confidence_trace/<sub-batch>.report.json`
  - `build_auto_repair_retry_manifest` now consumes that report and schedules `06h` reruns for:
    - `missing_confidence_trace`
    - unreadable/invalid confidence trace payloads
    - schema-level confidence trace row failures
  - stage-group ordering now treats `06h` as a first-class rerun band between `06e` and `07`
- 2026-03-04: Hardened readiness against long-video false leniency by adding absolute `damaged_segment_count` gates:
  - problem:
    - current readiness already used `video_damage_score`, `damaged_chunk_ratio`, and `severe_damage_chunk_ratio`
    - but it did not gate on absolute surviving damage volume
    - this leaves a real blind spot where long videos can carry a large number of damaged segments while staying below ratio-only thresholds
  - patched:
    - `scripts/training-data/validation/validate_stage_report.py`
    - `scripts/training-data/batch/sub-batch-pipeline`
    - `scripts/training-data/batch/pipeline.config.json`
  - new canonical policy:
    - `review_damaged_segment_count = 20`
    - `block_damaged_segment_count = 80`
  - revalidation impact:
    - `P001.4` moved `READY=1 / REVIEW=6 / BLOCKED=3` -> `READY=1 / REVIEW=5 / BLOCKED=4`
    - `iOSpNACA9VI` now blocks for truth: `policy_block_damaged_segment_count:219>80`
    - `SPDOb_IE5YM` now reviews explicitly for surviving damage volume: `policy_review_damaged_segment_count:24>20`
    - `P001.5` stayed `READY=3 / REVIEW=4 / BLOCKED=3`
    - `P001.8` stayed `READY=3 / REVIEW=6 / BLOCKED=1`
  - practical read:
    - this does not blindly trust `READY/REVIEW/BLOCKED`; it tightens the gate where the current policy was under-reading the artifact truth on long damaged videos
    - the remaining READY set across these batches is still only:
      - `P001.4`: `zi8EvOdRQiI`
      - `P001.5`: `g35sbdbjNXw`, `jl5tLCqpTNo`, `l5zEcgIS2Pw`
      - `P001.8`: `EscjHJHTuSs`, `QvGtRoklA3A`, `YOEP0380xD4`
- 2026-03-04: Repaired Stage `09` quality truth so damage metadata now matches what the pipeline actually filtered or retained:
  - problem 1:
    - `damage_score` was being derived from full `chunk_confidence_score`
    - that incorrectly treated `phaseConfidence` as transcript damage, so Stage `09` could emit positive damage on otherwise clean commentary chunks
  - problem 2:
    - commentary chunking inferred per-chunk stat ranges from visible lines only
    - masked Stage `07` artifact segments could disappear from `damaged_segment_ids`
  - problem 3:
    - `qualityProfile` was built from retained chunks only
    - if the truly bad chunk fell below the confidence floor and was dropped, the video profile lost the damage window entirely
  - patched:
    - `scripts/training-data/09.EXT.chunk-embed.ts`
    - `scripts/training-data/batch/pipeline-runner`
  - Stage `09` changes:
    - split retrieval downranking from damage truth
    - `damage_score` no longer counts `phaseConfidence`
    - commentary chunks now keep masked artifact segments inside their original segment ranges for stat aggregation
    - video `qualityProfile` now uses pre-filter `normalizedChunks`, so dropped bad chunks still contribute `damaged_segment_ids` and `damage_segment_windows`
  - runner changes:
    - added repeatable `--force-stage`
    - current explicit support is Stage `09`, which removes the need to bypass the runner when a Stage `09` code fix must invalidate its own state cache
  - proof on `P001.8`:
    - forced Stage `09` rebuild:
      - `python3 scripts/training-data/batch/pipeline-runner P001.8 --from 09 --to 09 --parallel 3 --skip-end-validation --force-stage 09`
    - focused smoke test on the old windowless case:
      - `python3 scripts/training-data/batch/pipeline-runner P001.8 --manifest /tmp/P001.8.vwr.txt --from 09 --to 09 --parallel 1 --skip-end-validation --force-stage 09`
    - `vWr955SeGXs` now preserves dropped-chunk truth:
      - `qualityProfile.damaged_segment_ids = [74]`
      - `qualityProfile.damage_segment_windows = [{start_segment_id:73,end_segment_id:75,damaged_segment_count:1}]`
  - final `P001.8` validation after the Stage `09` fixes:
    - `READY=1 / REVIEW=7 / BLOCKED=2`
    - dry-run ingest set reduced to only:
      - `EscjHJHTuSs`
    - scorecard localization truth is now complete:
      - `positive_damage_windowless_ratio = 0.0`
      - `positive_damage_videos_without_localized_windows = 0`
    - repair worklist now has:
      - `localized_windows = 48`
      - `windowless_fallback_tasks = 0`
  - current read:
    - `P001.8` is now much closer to an automatically runnable truth-and-repair pipeline
    - the remaining open policy question is narrower: whether `confidence_tier:medium` should count as canonical damage, or stay retrieval-only unless paired with harder evidence like transcript artifacts, low tier, or contamination
- 2026-03-05: Hardened early gating and resumed full `06+` throughput runs for next subbatches (`P001.6`, `P001.7`, `P001.9`) with real Claude calls:
  - fixed runner truth gap at Stage `06b`:
    - `scripts/training-data/batch/pipeline-runner` now fail-closes on severe `FLAG` outputs (not only `REJECT`)
    - severe triggers now include:
      - high misattribution volume
      - high conversation-flag count
      - major/moderate boundary issue volume
      - repeated `missing_target_coverage`
      - any `major` other-quality flag
  - live proof of newly blocked severe-flag cases:
    - `mv2X8Yhg9M0` quarantined at `06b` (`stage06b_flag_severe`)
    - `5sTASDqe0u8` quarantined at `06b` (`conversation_flags=4`, `missing_target_coverage=2`)
    - `rwlACYYEwUY` quarantined at `06b` (`major_other_flags=3`)
  - uncovered and fixed stage implementation defects (no workaround path kept):
    - `scripts/training-data/06e.LLM.quality-check`:
      - robust Claude binary resolution added (`CLAUDE_BINARY/CLAUDE_BIN`, `shutil.which`, NVM glob fallback)
    - `scripts/training-data/06g.LLM.damage-adjudicator`:
      - same robust Claude binary resolution fix
  - targeted recoveries started to repair false stage failures introduced before the resolver fixes:
    - `P001.9` targeted rerun (`JyjkFxCTg18`, `YEC7tyrT7ag`) from `06e->09` now proceeds cleanly through `06e`
    - `P001.6` targeted rerun (`sxChP6EIJHo`) from `06g->09` started after the `06g` fix
    - `P001.7` targeted full-chain rerun (`X9vElD3W1jw`) from `06->09` started to repair missing stage-06 artifact
  - latest readiness snapshots after these iterations (current truth, not final campaign close):
    - `P001.6.auto.report.json`: `eligible=1`, `blocked_ids=7` (`READY` currently only `3JN-3IJTlEA`)
    - `P001.7.auto.report.json`: `eligible=0`, `blocked_ids=10` (mix of `REVIEW` and `BLOCKED`, with remaining missing-`07b`/quality-policy pressure)
    - `P001.9.auto.report.json`: improved from `blocked_ids=10` to `blocked_ids=8` after `06e` recovery pass
- 2026-03-05: Started the next full `06+` throughput wave on fresh subbatches (`P002.2`, `P002.3`, `P002.4`, `P002.5`) with real Claude calls in parallel:
  - launch profile:
    - `P002.2`/`P002.3`/`P002.4` from `06->09` at `--parallel 3`
    - `P002.5` from `06->09` at `--parallel 2`
  - live progression snapshot while active:
    - `P002.2`: `06=10/10`, `06b` active, first videos already reaching `06e`
    - `P002.3`: `06=10/10`, `06b=1/10`, `06c=1/10`, `06d=1/10`
    - `P002.4`: `06` in-flight with multiple workers, `06b` queue started
    - `P002.5`: entered `06b` after initial `06` completions
  - early `06b` outputs observed:
    - `P002.2`: `JKWRj2hwbT4 -> FLAG` (non-severe under current thresholds)
    - `P002.3`: `GFOcI3Sni6I -> APPROVE`, `TDxv3HxDYHk -> FLAG`
  - cross-batch severe-gate telemetry (latest verification artifact per video) during run:
    - `98` videos audited
    - severe-gate hits: `14` (`10 FLAG`, `4 REJECT`)
    - known severe examples still hit by current runner logic:
      - `5sTASDqe0u8` (`conversation_flags=4`, `missing_target_coverage=2`)
      - `mv2X8Yhg9M0` (`major_other_flags=1`)
      - `rwlACYYEwUY` (`major_other_flags=3`)
- 2026-03-05: Added Stage `06h` quality-overload fail-closed gate + telemetry and reran deterministic segments:
  - code:
    - `scripts/training-data/06h.DET.confidence-propagation`
      - added `video_summary.gate_reason_codes`
      - added `video_summary.gate_inputs`
      - added quality-overload block logic (total/unrepaired low-quality + unresolved artifact thresholds)
      - persisted `quality_gate` in confidence metadata/report
  - deterministic reruns:
    - `P002.2`/`P002.3`/`P002.4`: `06h -> 06h`
    - `P002.5`: reopened from `06f`, rebuilt `06f`, then rebuilt `06h`
  - current post-rerun quarantine truth:
    - `P002.2`: `stage06g_execution_error x2`, `stage06b_flag_severe x1`
    - `P002.3`: `stage06e_execution_error x1`
    - `P002.4`: `stage06b_flag_severe x2`, `stage06b_contract_preflight_fail x1`
    - `P002.5`: `stage06b_reject x3`, `stage06b_flag_severe x2`
  - key effect:
    - non-semantic `P002.5` preflight deadlocks were cleared; remaining blocks are semantic `06b` severe/reject truth.
- 2026-03-07: Fix-first calibration pass during Claude-cap window (no new LLM-wave launches):
  - policy tightening (degree-based, not fail-hard):
    - `scripts/training-data/batch/pipeline.config.json`
      - `review_video_damage_score`: `0.18 -> 0.14`
      - `review_damaged_chunk_ratio`: `0.25 -> 0.22`
      - `review_severe_damage_chunk_ratio`: `0.40 -> 0.35`
    - measured expected impact on current-policy readiness corpus (`87` rows):
      - baseline: `READY=17 / REVIEW=53 / BLOCKED=17`
      - tightened: `READY=13 / REVIEW=57 / BLOCKED=17`
      - net: `4` videos move `READY -> REVIEW`, no added hard blocks
  - calibration tooling added:
    - `scripts/training-data/validation/calibrate_readiness_thresholds.py`
      - evaluates candidate review thresholds against historical readiness summaries
      - emits machine-readable report with exact `READY -> REVIEW` moved IDs
      - latest run output:
        - `data/validation/runs/readiness_threshold_calibration.current.json`
  - LLM stage contribution tooling added:
    - `scripts/training-data/validation/audit_llm_stage_value.py`
      - summarizes quarantine reason checks by stage and LLM-stage exclusivity
      - latest run output:
        - `data/validation/runs/llm_stage_value_audit.latest.json`
      - current snapshot (all quarantine artifacts):
        - LLM-stage exclusive quarantines:
          - `stage06b: 21`
          - `stage07b: 9`
          - `stage06: 8`
          - `stage06g: 1`
          - `stage06e: 1`
  - pipeline correctness hardening completed in this pass:
    - `scripts/training-data/validation/validate_manifest.py`
      - quarantine re-emit now preserves existing stage-derived reasons even when input/output paths are the same (prevents accidental quarantine reason loss)
    - `scripts/training-data/batch/pipeline-runner`
      - new early fail-closed gate: `stage06_speaker_collapse_overload`
      - threshold: `total_segments_affected >= 50` in Stage `06` `speaker_collapse` metadata
      - intent: stop high-collapse transcripts before expensive downstream LLM stages
- 2026-03-07: Deterministic follow-through while Claude remained capped:
  - throughput recovery without LLM:
    - ran deterministic resume set from `06c -> 06d`:
      - manifest: `/tmp/RECOVER.06cd.txt`
      - command: `python3 scripts/training-data/batch/pipeline-runner RECOVER.06cd --manifest /tmp/RECOVER.06cd.txt --from 06c --to 06d --parallel 4 --skip-end-validation`
      - outcome: `3/4` passed; `PE0mhxBtRkA` quarantined as expected due upstream `06b REJECT` strict handling in `06c`
  - policy revalidation runs executed under tightened thresholds (no stage rerouting):
    - `./scripts/training-data/batch/sub-batch-ops P003.2 --validate`
    - `./scripts/training-data/batch/sub-batch-ops P003.3 --validate`
    - `./scripts/training-data/batch/sub-batch-ops P003.4 --validate`
    - `./scripts/training-data/batch/sub-batch-ops P003.5 --validate`
    - `./scripts/training-data/batch/sub-batch-ops P001.5 --validate`
    - `./scripts/training-data/batch/sub-batch-ops P001.8 --validate`
  - observed readiness shifts after policy tighten:
    - `P003.2`: `READY=2` (`ngG5D877MO4`, `pRkEJ91TEEY`)
    - `P003.3`: `READY=2` (`GOZo4Z0brDc`, `Yr81ALhye2w`)
    - `P003.4`: `READY=2` (`5n0sxT3JxAQ`, `qZeV9EgBE_c`)
    - `P003.5`: `READY=1` (`CW_VMViZGn0`)
    - `P001.5`: `READY=2` (`jl5tLCqpTNo`, `l5zEcgIS2Pw`)
    - `P001.8`: `READY=0`
  - refreshed calibration baseline after deterministic revalidation:
    - `python3 scripts/training-data/validation/calibrate_readiness_thresholds.py --top-n 10 --out data/validation/runs/readiness_threshold_calibration.current.json`
    - baseline moved from `READY=17` to `READY=12` (with `REVIEW=57`, `BLOCKED=18`) under current-policy corpus
    - next tightening candidate now starts at `review_damaged_chunk_ratio=0.20` (`READY -> REVIEW` for `CW_VMViZGn0`, `pRkEJ91TEEY`)
  - scorecards emitted for post-policy snapshots:
    - `data/validation/runs/20260307.P003.2.postpolicy/scorecard.json`
    - `data/validation/runs/20260307.P003.3.postpolicy/scorecard.json`
    - `data/validation/runs/20260307.P003.4.postpolicy/scorecard.json`
    - `data/validation/runs/20260307.P003.5.postpolicy/scorecard.json`
    - `data/validation/runs/20260307.P001.5.postpolicy/scorecard.json`
    - `data/validation/runs/20260307.P001.8.postpolicy/scorecard.json`
  - additional deterministic audits added for points (3) stage value and (4) transcription quality:
    - `scripts/training-data/validation/audit_llm_stage_value.py`
      - latest report: `data/validation/runs/llm_stage_value_audit.latest.json`
      - current LLM-exclusive quarantine signal counts: `stage06b=21`, `stage07b=9`, `stage06=8`, `stage06g=1`, `stage06e=1`
    - `scripts/training-data/validation/audit_transcript_quality.py`
      - latest report: `data/validation/runs/transcript_quality_audit.latest.json`
      - strong collapse signal:
        - collapse bucket `50+` currently has `0 APPROVE` in latest artifacts (`FLAG/REJECT/MISSING` only)
- 2026-03-07: Parallel `06+` throughput wave resumed with real Claude calls on next unresolved subbatches:
  - launched in parallel:
    - `python3 scripts/training-data/batch/pipeline-runner P002.8 --from 06 --to 09 --parallel 3 --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P002.9 --from 06 --to 09 --parallel 3 --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P002.10 --from 06 --to 09 --parallel 2 --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
  - live findings while active:
    - strict fail-closed behavior observed in Stage `06` (`NZk0SPu3HXM` quarantined in-run as `stage06_execution_error`, output write blocked)
    - Stage `06e` timeout pressure is real under `--llm-timeout-seconds 300` (observed repeated `Claude CLI timeout` retries)
  - fixed an ops-truth defect discovered during this run (no fallback/workaround):
    - `scripts/training-data/batch/sub-batch-pipeline` `--view` artifact discovery now searches source-recursive layouts (`source/channel/*.json`) by `video_id`
    - this repaired false pending counts for channel-grouped outputs (example: `P002.10` `06b` now correctly reports `7 files, 0 pending` instead of `1 files, 6 pending`)
- 2026-03-07: Quantified and validated historical `06f` gate debt (leniency backlog):
  - new deterministic audit tool:
    - `scripts/training-data/validation/audit_06f_gate_debt.py`
    - output: `data/validation/runs/06f_gate_debt_audit.latest.json`
  - current corpus snapshot:
    - `scanned_stage06e_files=187`
    - `triggered_by_current_06f_policy=40`
    - `triggered_not_currently_quarantined_by_06f=27`
  - sample proof run (top 10 debt candidates, deterministic `06f` only):
    - manifest: `data/validation/tmp/DEBT06F.top10.manifest.txt`
    - command: `python3 scripts/training-data/batch/pipeline-runner DEBT06F.top10 --manifest data/validation/tmp/DEBT06F.top10.manifest.txt --from 06f --to 06f --parallel 5 --skip-end-validation`
    - result: `10/10` quarantined by `stage06f_low_quality_overload` (no LLM stage dependency)
  - operational interpretation:
    - the current gate logic is capable of blocking high low-quality-load videos
    - a real part of the leniency concern is historical debt (videos passed before current `06f` gate policy) and needs targeted `06f+` reruns, not looser interpretation of current gate truth
- 2026-03-07: Applied `06f` debt closure into canonical sub-batch quarantine truth (not only temporary debt batches):
  - generated per-subbatch manifests for affected videos:
    - `/tmp/debt06f_subbatches/*.txt` (17 affected sub-batches detected)
  - executed deterministic `06f->06f` reruns for 16 sub-batches (skipped `P002.8` due active concurrent full-chain run):
    - `P001.10`, `P001.4`, `P001.5`, `P001.6`, `P001.7`, `P001.8`, `P001.9`
    - `P002.1`, `P002.2`, `P002.3`, `P002.4`, `P002.6`
    - `P003.1`, `P003.5`, `P003.6`
    - `P018.3`
  - deterministic outcomes on these 16 reruns:
    - all selected videos quarantined (`passed=0`, quarantined counts matched selection sizes)
  - owner-subbatch coverage after reruns:
    - `37` debt videos tracked
    - only `3` missing owner-level `06f` checks:
      - `KtmnHDVbmss` in `P002.8` (active full-chain rerun in progress)
      - `jdDdgzdFPfs` in `P002.8` (active full-chain rerun in progress)
      - `x2kk9HoXjnI` in `P001.4` (already blocked by upstream `stage06b_reject`)
- 2026-03-07: Closed a resumed-run gate leak in `pipeline-runner`:
  - issue:
    - fail-closed gates (`06`, `06b`, `06f`, `06h`) were evaluated only when those stages executed in the current invocation
    - reruns starting at `07+` could bypass newly tightened upstream gate truth unless quarantine already contained those checks
  - fix:
    - `scripts/training-data/batch/pipeline-runner` now replays upstream gates at video start whenever `--from` is after the gate stage
    - if any upstream gate triggers, video is immediately quarantined with canonical check key/message before downstream execution
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
    - `python3 tests/unit/pipeline/test_pipeline_runner_stage06_gate.py` (`4` tests passing, includes resume gate-replay coverage)
- 2026-03-07: Re-ran readiness calibration on latest corpus snapshot:
  - command:
    - `python3 scripts/training-data/validation/calibrate_readiness_thresholds.py --top-n 30 --out data/validation/runs/readiness_calibration.latest.json`
  - current baseline:
    - `READY=11 / REVIEW=52 / BLOCKED=30` (`93` deduped latest rows)
  - threshold sensitivity:
    - current `review_damaged_chunk_ratio=0.22` is already strict enough that tested `0.22/0.23/0.25` candidates produce no additional `READY -> REVIEW` moves
    - next meaningful tighten point remains `review_damaged_chunk_ratio=0.20` (moves `CW_VMViZGn0`, `pRkEJ91TEEY` to `REVIEW`)
- 2026-03-07: Added manifest-level `06e` low-quality pressure review gating (degree-based, not fail-hard):
  - problem found:
    - some videos still validated `READY` with high Stage `06e` low-quality burden because readiness primarily consumed downstream damage metrics and not raw `06e` pressure
  - canonical fix:
    - `scripts/training-data/validation/validate_manifest.py`
      - indexes Stage `06e` artifacts and emits warning `stage06e_low_quality_pressure` when:
        - `low_quality_count >= review_stage06e_low_quality_count`
        - OR `low_quality_ratio >= review_stage06e_low_quality_ratio` with `low_quality_count >= review_stage06e_low_quality_ratio_min_count`
      - mapped this check to canonical `contamination_risk` signal class
    - `scripts/training-data/batch/sub-batch-pipeline`
      - passes new `validate_manifest` thresholds from pipeline config
    - `scripts/training-data/batch/pipeline.config.json`
      - `review_stage06e_low_quality_count = 80`
      - `review_stage06e_low_quality_ratio = 0.30`
      - `review_stage06e_low_quality_ratio_min_count = 30`
  - measured outcomes after revalidation:
    - `P002.2`: `READY=1 / REVIEW=3 / BLOCKED=6` -> `READY=0 / REVIEW=4 / BLOCKED=6`
      - `rEFK-4dNPxA` now `REVIEW` (`reason=contamination_risk`)
    - `P002.10`: `READY=1 / REVIEW=3 / BLOCKED=3` (historical) -> `READY=0 / REVIEW=2 / BLOCKED=5` in current artifact state
      - explicit `stage06e_low_quality_pressure` warnings observed on `qR7bHW8EoaE` and `vNrixMbimG0`
  - calibration refresh:
    - `python3 scripts/training-data/validation/calibrate_readiness_thresholds.py --top-n 30 --out data/validation/runs/readiness_calibration.latest.json`
    - baseline shifted from `READY=11 / REVIEW=52 / BLOCKED=30` to `READY=10 / REVIEW=53 / BLOCKED=30`
- 2026-03-07: Launched next `06+` survivor wave with real Claude calls:
  - command:
    - `python3 scripts/training-data/batch/pipeline-runner P003.1 --manifest docs/pipeline/batches/P003.1.post06f.txt --from 06e --to 09 --parallel 2 --skip-end-validation --llm-retries 2`
  - early live behavior (expected under tightened upstream replay):
    - immediate upstream-gate quarantines observed before downstream LLM spend:
      - `zzRdjIz3YLg` (`upstream 06b severe FLAG`)
      - `MS1JrFBtw3g` (`upstream 06 speaker collapse overload`)
- 2026-03-07: Completed first post-hardening survivor runs and validated readiness truth:
  - `P003.1` run completion:
    - pipeline summary: `passed=5/7`, `quarantined=2` (`zzRdjIz3YLg`, `MS1JrFBtw3g`)
    - post-run validate (`./scripts/training-data/batch/sub-batch-ops P003.1 --validate`) produced:
      - readiness: `READY=2 / REVIEW=3 / BLOCKED=5`
      - Stage 10 dry-run ingest scope: `2` videos (`71xUMBrQjnc`, `xcHP6sZHxX0`)
  - `P003.2` run completion:
    - pipeline summary: `passed=9/10`, `quarantined=1` (`tz_Fbn2zoIE`, upstream replayed `06h` block)
    - post-run validate (`./scripts/training-data/batch/sub-batch-ops P003.2 --validate`) produced:
      - readiness: `READY=2 / REVIEW=7 / BLOCKED=1`
      - `REVIEW` drivers are mostly tightened damage policy reasons (`policy_review_damaged_chunk_ratio` / `policy_review_video_damage_score`)
      - Stage 10 dry-run ingest scope: `2` videos (`ngG5D877MO4`, `pRkEJ91TEEY`)
- 2026-03-07: Continued full-chain `06->09` throughput wave with real Claude on next unresolved subbatches:
  - launched:
    - `python3 scripts/training-data/batch/pipeline-runner P003.3 --from 06 --to 09 --parallel 2 --skip-end-validation --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P003.4 --from 06 --to 09 --parallel 2 --skip-end-validation --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P003.5 --from 06 --to 09 --parallel 1 --skip-end-validation --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P003.6 --from 06 --to 09 --parallel 1 --skip-end-validation --llm-retries 2`
  - live findings:
    - upstream contract preflight is actively fail-closed on missing Stage `05` artifacts in these ranges (multiple immediate quarantines with `stage 06 contract preflight failed`)
    - no bypass path observed; downstream stages only execute for surviving videos
- 2026-03-07: Ran a cross-batch leniency audit to test for residual false-pass behavior under current policy:
  - artifact:
    - `data/validation/runs/leniency_audit.latest.json`
  - aggregate snapshot:
    - all readiness rows: `READY=17 / REVIEW=63 / BLOCKED=175` (initial run), then `READY=18 / REVIEW=60 / BLOCKED=177` after P003.1/P003.2 refresh
    - `READY_high_06e_pressure=0` under configured `06e` pressure criteria
    - `READY` outlier by damage threshold appeared only in historical `P002.9` readiness generated under older policy (`review_video_damage_score=0.18`, no `review_damaged_chunk_ratio`)
  - policy-aware check (only summaries containing current damage policy knobs) result:
    - `READY` violations against active thresholds: `0`
    - interpretation: current codepath is enforcing tightened damage thresholds; remaining apparent leniency is stale-summary debt, not active gate logic
- 2026-03-07: Re-ran readiness calibration after latest validations:
  - command:
    - `python3 scripts/training-data/validation/calibrate_readiness_thresholds.py --top-n 30 --out data/validation/runs/readiness_calibration.latest.json`
  - updated baseline:
    - `READY=12 / REVIEW=58 / BLOCKED=46` (`rows=116`)
  - sensitivity:
    - `dcr=0.22` remains stable for current READY set
    - tightening to `dcr=0.21` or `0.20` currently moves one READY video (`CW_VMViZGn0`) to `REVIEW`
- 2026-03-07: Hardened Stage 10 against stale readiness-policy snapshots:
  - issue:
    - Stage 10 readiness gate accepted any syntactically valid `readiness-summary.json`, even if generated under older policy epochs
    - this can reintroduce lenient historical thresholds unless sub-batch validation is rerun first
  - patch:
    - `scripts/training-data/10.EXT.ingest.ts`
      - `checkReadinessGate(...)` now requires readiness policy fields:
        - `review_video_damage_score`
        - `review_damaged_chunk_ratio`
        - `review_severe_damage_chunk_ratio`
      - each must be a finite ratio in `[0,1]`; otherwise ingest exits with a hard error and explicit revalidation instruction
  - validation:
    - `node --import ./node_modules/tsx/dist/loader.mjs scripts/training-data/10.EXT.ingest.ts --help`
    - positive dry-run still passes on current-policy summary:
      - `node --import ./node_modules/tsx/dist/loader.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/P003.2.txt --dry-run`
    - stale-policy guard verified:
      - `node --import ./node_modules/tsx/dist/loader.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/P003.2.txt --readiness-summary data/validation/stage_reports/P002.9/readiness-summary.json --dry-run`
      - exits with: `Readiness summary policy is missing 'review_damaged_chunk_ratio'`
- 2026-03-07: Launched additional full-chain waves (`06->09`) with real Claude calls:
  - commands:
    - `python3 scripts/training-data/batch/pipeline-runner P003.7 --from 06 --to 09 --parallel 1 --skip-end-validation --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P003.8 --from 06 --to 09 --parallel 1 --skip-end-validation --llm-retries 2`
  - early live behavior:
    - both subbatches show immediate Stage `06` contract fail-closed quarantines for videos missing Stage `05` artifacts
    - surviving videos continue through real Claude-driven Stage `06` without fallback path
- 2026-03-07: Fixed operator visibility drift in status inspection (no pipeline path divergence):
  - issue:
    - `./scripts/training-data/batch/sub-batch-ops <batch> --status` relied only on `*.status.json`
    - direct `pipeline-runner` launches were running live but still shown as `not_started`, causing ambiguous operator state
  - patch:
    - `scripts/training-data/batch/sub-batch-pipeline`
      - `show_batch_status()` now overlays live process detection from `ps -eo args` for `pipeline-runner Pxxx.y`
      - displays live rows as `in_progress [live runner]`
      - shows stale status rows as `in_progress [no live runner detected]` when status-file state lags reality
      - `show_sub_batch_progress()` now also overlays live runner detection for the sub-batch `Overall status`
  - validation:
    - `bash -n scripts/training-data/batch/sub-batch-pipeline`
    - `./scripts/training-data/batch/sub-batch-ops P003 --status` now correctly reports live runners for `P003.3`–`P003.8`
- 2026-03-07: Detected mid-wave Claude quota exhaustion as a runtime-truth issue:
  - observed live failure signature during active `P003.3`–`P003.8` waves:
    - `stdout="You've hit your limit · resets 5pm (Europe/Copenhagen)"`
    - downstream symptoms included `06b llm_call_error -> REJECT` and `06e execution failure` (runtime-noise, not content truth)
  - immediate operational response:
    - stopped active old-code runners
    - no active `pipeline-runner` processes left (`pgrep -af "scripts/training-data/batch/pipeline-runner" -> none`)
- 2026-03-07: Hardened `pipeline-runner` runtime/content separation for quota/outage events:
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
      - `run_subprocess()` now detects limit markers while streaming LLM stage output
      - `run_video()` now:
        - aborts as `failed` (non-quarantine) if Claude limit marker is detected
        - on LLM non-zero exits, re-runs global Claude preflight; if unhealthy, aborts as runtime outage (non-quarantine) instead of adding stage execution quarantine
        - honors a shared global outage event so remaining videos stop with `global_llm_outage`
      - run exit code now returns `3` when a global LLM outage is detected mid-run (aligned with startup preflight outage exit)
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
    - `python3 tests/unit/pipeline/test_pipeline_runner_stage06_gate.py`
    - live preflight probe:
      - `python3 scripts/training-data/batch/pipeline-runner P003.9 --from 06 --to 06 --parallel 1 --skip-end-validation --llm-retries 2`
      - result: immediate `exit=3` with `LLM preflight failed: Claude limit exhausted...`, no per-video execution
- 2026-03-07: Current state after quota cap event:
  - `P003.3`–`P003.8` run outputs contain runtime-noise quarantines from old runner instances started before outage hardening
  - these subbatches must be rerun from `06` with the patched runner after quota reset so stale runtime-derived rows are reopened/replaced by real content truth
- 2026-03-07: Classified runtime-noise quarantine impact for post-cap waves (deterministic audit):
  - artifacts:
    - `data/validation/runs/p003_runtime_quarantine_impact.latest.json`
    - `data/validation/runs/p003_runtime_quarantine_classification.latest.json`
  - subbatch impact summary:
    - `P003.3`: `10` quarantined; `8` runtime-polluted (`06b llm_call_error` and `06e execution_error`), `1` upstream-missing, `1` non-runtime `06b` reject
    - `P003.4`: `10` quarantined; `5` runtime stage execution errors, `5` upstream-missing
    - `P003.5`: `0` quarantined
    - `P003.6`: `10` quarantined; `6` runtime-polluted, `4` upstream-missing
    - `P003.7`: `10` quarantined; `7` runtime-polluted, `3` upstream-missing
    - `P003.8`: `10` quarantined; `5` runtime-polluted, `5` upstream-missing
  - rerun implication:
    - prioritize `P003.3`, `P003.6`, `P003.7`, `P003.8`, `P003.4` from `06` after quota reset (patched runner now prevents this runtime contamination pattern from hardening)
- 2026-03-09: Restarted full-chain `06->09` waves with patched runner and real Claude calls:
  - active sub-batches:
    - `P003.3`, `P003.6`, `P003.7`, `P003.8`, `P003.9`, `P003.10`
  - observed behavior:
    - missing-upstream videos fail-closed immediately at Stage `06` contract preflight
    - surviving videos move through `06/06b` and downstream stages without fallback paths
- 2026-03-09: Re-ran gate-debt calibration on current artifacts:
  - `audit_06f_gate_debt.py`:
    - `triggered_by_current_06f_policy=42`
    - `triggered_not_currently_quarantined_by_06f=0`
  - `calibrate_readiness_thresholds.py`:
    - baseline `READY=12 / REVIEW=58 / BLOCKED=46`
    - tightening `review_damaged_chunk_ratio` from `0.22` to `0.20` moves one borderline READY video (`CW_VMViZGn0`) to REVIEW
  - `audit_transcript_quality.py`:
    - transcript score bucket `<=35` had no APPROVE outcomes (`FLAG=3`, `REJECT=3`)
- 2026-03-09: Tightened Stage `06b` fail-closed behavior for severe low-transcript flags:
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
    - new gate: if `06b` verdict is `FLAG` and Stage `06 transcript_confidence.score <= 35`, quarantine with `stage06b_flag_low_transcript_quality`
  - reason:
    - removes a lenient gap where very low transcript-quality FLAG videos could continue as REVIEW despite consistently poor upstream signal quality
  - validation:
    - `python3 tests/unit/pipeline/test_pipeline_runner_stage06_gate.py` passed (`6` tests)
    - includes new unit coverage for both block and non-block `06b FLAG` transcript-score cases
- 2026-03-09: Tightened readiness review threshold slightly (not fail-hard):
  - patch:
    - `scripts/training-data/batch/pipeline.config.json`
  - change:
    - `review_damaged_chunk_ratio: 0.22 -> 0.20`
  - effect target:
    - shifts borderline contamination from READY to REVIEW while preserving existing BLOCK policy and avoiding a global reject surge
- 2026-03-09: Fixed Stage `06/06b/07*` timeout runtime-noise classification in runner:
  - issue observed during active `P003.*` waves:
    - long LLM calls timing out were being quarantined as `stageXX_execution_error`, which pollutes quality truth
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
      - subprocess stream parsing now classifies runtime markers into:
        - `limit`
        - `timeout`
      - on non-zero LLM exit with timeout marker, runner now marks video as:
        - `status=failed`
        - `error_msg=llm_timeout_during_stage:*`
        - progress `FAIL(llm_timeout)`
      - timeout cases are no longer auto-quarantined as canonical content failures
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
    - `python3 tests/unit/pipeline/test_pipeline_runner_stage06_gate.py` (`7` tests passing, including new timeout runtime-failure test)
- 2026-03-09: Aligned canonical signal-class mapping with new 06b low-transcript gate (and legacy 06b severe-flag gate):
  - issue:
    - quarantine checks `stage06b_flag_low_transcript_quality` (new) and `stage06b_flag_severe` (existing) were not explicitly classified by canonical validators
    - this could classify them as `other_quality`, weakening downstream repair/review metadata precision
  - patch:
    - `scripts/training-data/validation/validate_manifest.py`
      - `_canonical_signal_class(...)` now maps:
        - `stage06b_flag_low_transcript_quality` -> `transcript_quality`
        - `stage06b_flag_severe` -> `transcript_quality`
        - `stage06b_contract_preflight_fail` -> `artifact_contract`
    - `scripts/training-data/validation/validate_stage_report.py`
      - `_signal_class_for_readiness_reason(...)` now maps:
        - `stage06b_flag_low_transcript_quality` -> `transcript_quality`
        - `stage06b_flag_severe` -> `transcript_quality`
        - `stage06b_contract_preflight_fail` -> `artifact_contract`
      - `_warning_class_for_check(...)` now maps the same check keys consistently
  - validation:
    - `python3 -m py_compile scripts/training-data/validation/validate_manifest.py scripts/training-data/validation/validate_stage_report.py`
    - `python3 tests/unit/pipeline/test_validate_signal_class_mappings.py` (`5` tests passing)
- 2026-03-09: Current live `P003.*` wave observations after mapping patch:
  - all six runners still active in parallel (`P003.3`, `P003.6`, `P003.7`, `P003.8`, `P003.9`, `P003.10`)
  - observed gate behavior remains strict and deterministic:
    - severe Stage `06` speaker-collapse videos are being quarantined immediately (for example `GvoA2AAHJuk`, `2i4UOYnRXas`)
    - non-gated videos continue through `06b` with real Claude verification and downstream progression (`06e` already active in `P003.9`)
- 2026-03-09: Extended throughput to backlog sub-batches already at `06h`:
  - launched:
    - `python3 scripts/training-data/batch/pipeline-runner P003.2 --from 07 --to 09 --parallel 1 --skip-end-validation --llm-timeout-seconds 360 --llm-retries 2`
    - `python3 scripts/training-data/batch/pipeline-runner P003.1 --from 07 --to 09 --parallel 1 --skip-end-validation --llm-timeout-seconds 360 --llm-retries 2`
  - rationale:
    - `P003.1` and `P003.2` already had full `05..06h` coverage but no `07b/09`; running from `07` avoids redundant upstream reruns
  - quarantine integrity check before launch:
    - `P003.1` preexisting quarantines (`5`) are quality-gate based (`stage06b_reject`, `stage06b_flag_severe`, `stage06_speaker_collapse_overload`, `video_type_mismatch`)
    - `P003.2` preexisting quarantine (`1`) is quality-gate based (`stage06h_video_gate_block`)
    - no runtime-noise-only quarantine reasons found for these two sub-batches
  - live state:
    - both runs passed stage-07 contract preflight on non-quarantined videos and are actively processing Stage `07` with real Claude calls
- 2026-03-11: Completed parallel `P003` execution wave with real Claude calls (`06->09` and `07->09`):
  - completed runs:
    - `P003.1` (`07->09`): `passed=5`, `skipped_preexisting_quarantine=5`
    - `P003.2` (`07->09`): `passed=9`, `skipped_preexisting_quarantine=1`
    - `P003.3` (`06->09`): `passed=8`, `quarantined=2`
    - `P003.6` (`06->09`): `passed=3`, `quarantined=6`, `failed_runtime=1` (`-ivcUSxXCHM`, stage `06` timeout)
    - `P003.7` (`06->09`): `passed=5`, `quarantined=5`
    - `P003.8` (`06->09`): `passed=3`, `quarantined=5`, `failed_runtime=2` (`CfsZbTegOCM` stage `06` timeout, `7d7CNDnvh9w` stage `06e` timeout)
    - `P003.9` (`06->09`): `passed=3`, `quarantined=7`
    - `P003.10` (`06->09`): `passed=2`, `quarantined=8`
  - resulting quarantine mix snapshot:
    - dominant hard blocks are still upstream contract failures (`stage06_contract_preflight_fail`) plus targeted quality gates (`stage06_speaker_collapse_overload`, `stage06b_flag_severe`, `stage06b_reject`, `stage06f_low_quality_overload`)
    - runtime timeouts remained in `failed` (non-quarantine), confirming runtime/content separation is holding
- 2026-03-11: Tightened 06b low-transcript FLAG gate to close observed borderline leakage:
  - evidence from completed wave:
    - non-quarantined Stage `09` survivors with low transcript score were rare (`3/38` at score `55`)
    - two of those survivors had `06b` verdict `FLAG` (`HUaUzRpIfBw`, `L3b4FSMskGQ`) and slipped through because threshold was `<=35`
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
      - `STAGE06B_FLAG_LOW_TRANSCRIPT_SCORE_BLOCK_THRESHOLD: 35.0 -> 55.0`
    - `tests/unit/pipeline/test_pipeline_runner_stage06_gate.py`
      - added boundary test: `test_stage06b_flag_at_threshold_blocks` (score `55`)
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
    - `python3 tests/unit/pipeline/test_pipeline_runner_stage06_gate.py` (`8` tests passing)
- 2026-03-11: Backfill/rerun follow-up after threshold/runtime fixes:
  - runtime-timeout retry manifest:
    - `docs/pipeline/batches/P003.timeout-retry.1.txt`
    - includes: `-ivcUSxXCHM`, `CfsZbTegOCM`, `7d7CNDnvh9w`
    - run started: `P003.timeout-retry.1 --from 06 --to 09 --llm-timeout-seconds 480`
    - early outcome:
      - `-ivcUSxXCHM` completed Stage `06` and is now deterministically quarantined by `stage06_speaker_collapse_overload` (was previously runtime-timeout failed)
      - long chunked rerun for `CfsZbTegOCM` in progress (Stage `06` chunked analysis)
  - threshold backfill checks under original sub-batch IDs:
    - `P003.7` manifest `/tmp/P003.7.threshold55.backfill.txt` (`L3b4FSMskGQ`)
    - `P003.8` manifest `/tmp/P003.8.threshold55.backfill.txt` (`HUaUzRpIfBw`)
    - `P003.7` result:
      - rerun completed, remained non-quarantined
      - observed drift: Stage `06 transcript_confidence.score` moved from prior `55` to `58`, so new `<=55` gate did not trigger
    - `P003.8` result:
      - rerun completed and now quarantined in-place with `stage06b_flag_low_transcript_quality`
      - `P003.8` quarantine membership increased from `5 -> 6` (added `HUaUzRpIfBw`)
- 2026-03-11: Completed `P003.timeout-retry.1` rerun (`--from 06 --to 09 --llm-timeout-seconds 480 --llm-retries 2`):
  - final outcome:
    - `passed=1/3` (`7d7CNDnvh9w`)
    - `quarantined=2/3` (`-ivcUSxXCHM`, `CfsZbTegOCM`)
  - both quarantined videos now carry deterministic Stage `06` content-quality truth:
    - `stage06_speaker_collapse_overload`
    - `-ivcUSxXCHM`: `affected_segments=115`, `transcript_score=32`
    - `CfsZbTegOCM`: `affected_segments=880`, `transcript_score=38`
  - retry-runtime observation:
    - `7d7CNDnvh9w` Stage `06e` required repeated timeout retries before success, then completed `06f->09` cleanly with `07b gate=pass`
    - this is a Stage `06e` runtime reliability hotspot, not a content-failure signal
- 2026-03-11: Verified current `P003` readiness leniency window on latest summaries:
  - command:
    - `python3 scripts/training-data/validation/calibrate_readiness_thresholds.py --readiness-glob 'data/validation/stage_reports/P003.*/readiness-summary.json' --review-video-damage-score-candidates '0.14,0.13,0.12' --review-damaged-chunk-ratio-candidates '0.22,0.20,0.18' --review-severe-damage-chunk-ratio-candidates '0.35,0.30'`
  - result:
    - baseline `READY=9 / REVIEW=26 / BLOCKED=9` (`44` rows)
    - with current `review_damaged_chunk_ratio=0.22`, no additional READY videos move to REVIEW
    - tightening to `0.20` moves `1` READY video (`CW_VMViZGn0`) to REVIEW
    - tightening to `0.18` moves `4` READY videos (`CW_VMViZGn0`, `ngG5D877MO4`, `pRkEJ91TEEY`, `qZeV9EgBE_c`)
- 2026-03-11: Started next-wave `P004` execution and found upstream contract gap immediately:
  - initial `P004.1` and `P004.2` runs from `06->09` quarantined `10/10` each on:
    - `stage06_contract_preflight_fail` (`missing Stage 05` artifacts)
  - root-cause audit:
    - Stage `05` missing because Stage `04` outputs were missing
    - Stage `04` missing because Stage `03` outputs were missing
    - Stage `03` missing because Stage `02` transcripts were missing for most videos
  - corrective action (canonical path, no bypass):
    - launched Stage `02` backfill on full sub-batch manifests:
      - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.1.txt --overwrite`
      - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.2.txt --overwrite`
    - launched iterative Stage `03` progress on completed subsets while long Stage `02` files continue:
      - `/tmp/P004.1.stage02ready.partial.txt` (`5` video IDs)
      - `/tmp/P004.2.stage02ready.partial.txt` (`5` video IDs)
      - `./scripts/training-data/03.EXT.align --manifest /tmp/P004.1.stage02ready.partial.txt --overwrite`
      - `./scripts/training-data/03.EXT.align --manifest /tmp/P004.2.stage02ready.partial.txt --overwrite`
  - notable upstream quality signal during Stage `02`:
    - `sQz_-9BuNpw` produced near-empty transcript (`4 words / 54s`) and was fail-closed (`output NOT written`)
    - this provides deterministic upstream unusable-audio evidence rather than downstream ingestion noise
- 2026-03-11: Resolved stale-contract rerun for `P004.2` single-video scope (`yubzvrH3kLU`) through full chain `06->09`:
  - run:
    - `python3 -u scripts/training-data/batch/pipeline-runner P004.2 --manifest /tmp/P004.2.yubz.only.txt --from 06 --to 09 --parallel 1 --skip-end-validation --llm-timeout-seconds 360 --llm-retries 2`
  - outcome:
    - `passed=1/1`
    - stage sequence completed with real Claude calls at `06/06b/06e/06g/07/07b`
    - `06b verdict=FLAG` was repaired by `06c` (`3` deterministic misattribution fixes)
    - `07b gate=pass`, `09` chunk output written (`9` chunks)
- 2026-03-11: Hardened runner startup preflight against transient Claude saturation (no bypass path):
  - issue:
    - concurrent lane launch for full `P004.2` was aborting at single-shot preflight timeout (`25s`) during active Claude load
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
      - added bounded retry loop for global Claude preflight:
        - `CLAUDE_PREFLIGHT_MAX_ATTEMPTS=3`
        - linear retry backoff
      - limit-marker detection still fail-closes immediately (no retry masking quota exhaustion)
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
- 2026-03-11: Started iterative `P004.1` refresh lanes (real runs + upstream prep):
  - active `06->09` partial lane (`/tmp/P004.1.stage02ready.partial.txt`) produced mixed truth:
    - `MF3GUEB03-o`: runtime timeout at Stage `06` (failed, non-quarantine)
    - `KuiM4A2P5fA`: deterministic quality quarantine `stage06b_flag_low_transcript_quality` (`FLAG` + score boundary)
    - `WbMjgv4XcwE`: progressed through `09` with `07b gate=pass`
    - remaining lane videos continued in-flight
  - parallel upstream prep for the other half of `P004.1`:
    - `03/04/05` completed for `1FHmVCWuPhU`, `yjfSA5SpqCY`, `ZQoGfv-wH4k`, `-ymOG7QMrBA`
    - blocker persists for `wrxnZi--o9g` at Stage `03`
- 2026-03-11: Identified unresolved Stage `03` alignment blocker on `wrxnZi--o9g`:
  - failure:
    - `IndexError: tensors used as indices must be long, int, byte or bool tensors`
  - attempted structural fix:
    - `scripts/training-data/03.EXT.align`
      - added deterministic large-input alignment batching (`ALIGN_BATCH_SEGMENTS=200`)
      - introduced explicit batch-level progress logging (`Align batch: start-end/total`)
  - result:
    - failure persists on this video even after batched alignment, indicating a deeper whisperx/segment-path defect
    - video remains an explicit upstream technical blocker (not silently bypassed)
- 2026-03-11: `P004.2` upstream prep completed to Stage `05` on all currently recoverable IDs:
  - Stage `02` backfill completed (`processed=10`, `flagged=4`)
  - Stage `03/04/05` executed on stage-ready scope:
    - dynamic manifest: `/tmp/P004.2.stage05ready.dynamic.txt`
    - ready coverage: `9/10` IDs with canonical Stage `05` artifacts
    - missing-only ID: `sQz_-9BuNpw` (upstream fail-closed transcript in Stage `02`)
  - `bNaZftBdb0Y` was run separately through `03/04/05` and is now included in ready scope
- 2026-03-11: Prepared `P004.1` consolidated stage-ready scope after mixed partial reruns:
  - dynamic manifest: `/tmp/P004.1.stage05ready.dynamic.txt`
  - ready coverage: `9/10` IDs with Stage `05` artifacts
  - missing-only ID: `wrxnZi--o9g` (persistent Stage `03` technical failure)
- 2026-03-11: Runner preflight was still false-blocking launches under high Claude latency after retry patch:
  - observed:
    - repeated `pipeline-runner` startup aborts with:
      - `LLM preflight failed: Claude CLI preflight timed out ...`
    - direct Claude probes intermittently exceeded 25s and even 120s during this window
  - patch:
    - `scripts/training-data/batch/pipeline-runner`
      - increased preflight budget:
        - `CLAUDE_PREFLIGHT_TIMEOUT_SECONDS: 25 -> 120`
        - `CLAUDE_PREFLIGHT_MAX_ATTEMPTS: 3 -> 2`
        - `CLAUDE_PREFLIGHT_RETRY_DELAY_SECONDS: 3 -> 5`
  - validation:
    - `python3 -m py_compile scripts/training-data/batch/pipeline-runner`
  - operational note:
    - even with increased preflight budget, this session’s Claude health probes still timed out (`timeout 20 ... -> RC:124`), so `06+` wave relaunches remain blocked by real LLM availability, not by stage-contract readiness
- 2026-03-11: Tightened hard quality-overload blocking in canonical Stage `06h`/`06f` gating path (no side policy):
  - patched constants:
    - `scripts/training-data/06h.DET.confidence-propagation`
    - `scripts/training-data/batch/pipeline-runner`
    - `scripts/training-data/validation/audit_06f_gate_debt.py`
  - threshold changes:
    - `lq_total_abs: 140 -> 130`
    - `lq_total_ratio: 0.34 -> 0.33` (`min_count=60` unchanged)
    - `lq_total_ratio_extreme: 0.50 -> 0.48` (`min_count=25` unchanged)
  - deterministic impact check (historical artifacts):
    - report: `data/validation/tmp/06h_threshold_impact.latest.json`
    - `reports_considered=204`
    - `old_blocked=33 -> new_blocked=35` (`+2`)
    - newly blocked statuses: `BLOCKED=1`, `REVIEW=1`, `READY=0`
- 2026-03-11: Tightened soft Stage `06e` low-quality pressure trigger for short high-ratio videos:
  - patched:
    - `scripts/training-data/batch/pipeline.config.json`
  - threshold change:
    - `review_stage06e_low_quality_ratio_min_count: 30 -> 20`
  - deterministic impact check (historical artifacts):
    - report: `data/validation/tmp/stage06e_low_quality_ratio_min_count_impact.latest.json`
    - `rows_considered=188`
    - `baseline_triggered=62 -> new_triggered=70` (`+8`)
    - newly triggered statuses: `READY=2`, `REVIEW=3`, `BLOCKED=3`
    - newly covered READY IDs: `5n0sxT3JxAQ`, `ngG5D877MO4`
- 2026-03-11: Began upstream prep for next untouched sub-batches in parallel while Claude remains rate-limited:
  - launched:
    - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.3.txt`
    - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.4.txt`
  - mode:
    - parallel execution (two live sessions) to unblock `03/04/05` readiness for upcoming `06+` runs
- 2026-03-11: Switched to rolling partial-upstream conveyor for `P004.3` / `P004.4` (no waiting for full Stage `02` completion):
  - method:
    - repeatedly build dynamic `stage03/04/05` todo manifests from currently finished artifacts
    - immediately run `03 -> 04 -> 05` on each newly-ready subset while long `02` jobs continue
  - cumulative progress snapshot during this pass:
    - `P004.3`: `02=2/10`, `03=2/10`, `04=2/10`, `05=1+/10` (one Stage `05` output currently lands under the source-level folder layout)
    - `P004.4`: `02=6/10` observed in-flight, with `03/04/05` continuously catching up on completed transcripts
- 2026-03-11: Completed full upstream catch-up for `P004.3` and `P004.4` through Stage `05`:
  - deterministic coverage check after rolling runs:
    - `P004.3`: `02=10/10`, `03=10/10`, `04=10/10`, `05=10/10`
    - `P004.4`: `02=10/10`, `03=10/10`, `04=10/10`, `05=10/10`
  - ready manifests created:
    - `/tmp/P004.3.stage05ready.dynamic.txt` (`10` IDs)
    - `/tmp/P004.4.stage05ready.dynamic.txt` (`10` IDs)
  - operational blocker unchanged:
    - live Claude CLI probe still timing out (`timeout 20 claude -p "reply with ok" -> RC:124`), so `06+` reruns remain gated by real LLM availability window
- 2026-03-11: First `06+` launch attempt on new `P004.3` ready scope failed closed at global LLM preflight:
  - command:
    - `python3 scripts/training-data/batch/pipeline-runner P004.3 --manifest /tmp/P004.3.stage05ready.dynamic.txt --from 06 --to 09 --parallel 4 --skip-end-validation --llm-timeout-seconds 300 --llm-retries 2`
  - result:
    - runner aborted before per-video execution with Claude preflight `authentication_error` (`401 invalid authentication credentials`) on retry window
  - implication:
    - this is a real runtime/auth blocker, not a content-quality gate outcome
- 2026-03-11: Continued throughput push despite `06+` auth blocker by expanding upstream prep:
  - launched in parallel:
    - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.5.txt`
    - `./scripts/training-data/02.EXT.transcribe --manifest docs/pipeline/batches/P004.6.txt`
