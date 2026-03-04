# Codex 27.02 Pipeline Recovery Plan

Date: 2026-02-27  
Operator: Codex

## 1. Goal

Put pipeline data into a consistent, machine-verifiable state, then drive `P001.4` to a decision-ready state for manual ingest approval.

This plan is AI-implementable end-to-end:
- explicit truth sources
- explicit commands
- explicit branch handling
- explicit done criteria

## 2. Ground Truth Rules

Use this source priority:

1. Manifest files: `docs/pipeline/batches/P*.txt`
2. Stage artifacts under `data/<stage>/...`
3. Validation outputs:
   - `data/validation/stage_reports/<sub-batch>/readiness-summary.json`
   - `data/validation/gates/<sub-batch>.gate.json`
   - `data/validation/quarantine/<sub-batch>.json`
   - `data/validation/ingest_quarantine/<sub-batch>*.report.json`
4. Ingest state: `data/.ingest_state.json`
5. Status metadata: `docs/pipeline/batches/P*.status.json` (advisory, can drift)

## 3. Recovery Strategy (All Sub-batches)

## 3.1 Classification Buckets

Classify each sub-batch into one of:
- `legacy_completed_ingested`: accepted legacy ingest exists, do not auto-rerun
- `active_recovery`: has partial artifacts and needs staged completion
- `not_started`: no meaningful stage coverage

## 3.2 Execution Order

Run in this order:
1. Finish near-complete in-progress slices (`P001.4`, `P001.5`, `P001.8`, `P001.10`, `P002.9`, `P002.10`, `P003.1`).
2. Recover upstream stalls (`P001.6`, `P002.1`, then other partially-started sub-batches).
3. Run untouched backlog (`P001.7`, `P001.9`, `P002.2+`, then `P003+`).

Stage order is fixed:
`06 -> 06b -> 06c -> 06d -> 06e -> 06f -> 06g -> 06h -> 07 -> 07b -> 08 -> 09`

## 4. P001.4 Execution Plan

Current known state before execution:
- `P001.4` status: in progress at stage `08`
- quarantine: 6 videos blocked by `stage07b_enrichment_verify_error`
- remaining 4 videos blocked at readiness due `missing_stage09_chunks`
- ingest eligible: `0`

## 4.1 Target End State ("P001.4 done")

`P001.4` is considered done for this session when all are true:
1. Full rerun attempt has been performed from the correct restart stage.
2. Fresh validation exists:
   - `data/validation/stage_reports/P001.4/readiness-summary.json`
   - `data/validation/gates/P001.4.gate.json`
   - `data/validation/quarantine/P001.4.json`
3. Fresh Stage 10 dry-run ingest report exists:
   - `data/validation/ingest_quarantine/P001.4*.report.json`
4. `docs/pipeline/batches/P001.status.json` reflects actual achieved state.
5. Decision packet is ready for manual operator review (ingest yes/no).

This does not require every video to become ingest-eligible; it requires decision-ready evidence.

## 4.2 Command Sequence

Run from repo root (`/home/jonaswsl/projects/daygame-coach`).

1. Snapshot pre-run state

```bash
./scripts/training-data/batch/sub-batch-ops P001.4 --status
```

2. Primary rerun for blocked non-quarantined path (use parallel LLM calls = 5)

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.4 --run --from 07 --parallel 5
```

3. If step 2 fails due preflight/runtime but leaves partial artifacts, force stage-specific completion:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.4 --stage 07
./scripts/training-data/batch/sub-batch-pipeline P001.4 --stage 07b
./scripts/training-data/batch/sub-batch-pipeline P001.4 --stage 08
./scripts/training-data/batch/sub-batch-pipeline P001.4 --stage 09
```

4. Always run full validation refresh

```bash
./scripts/training-data/batch/sub-batch-ops P001.4 --validate
```

5. Generate explicit Stage 10 decision report (dry run only)

```bash
node --import node_modules/tsx/dist/loader.mjs \
  scripts/training-data/10.EXT.ingest.ts \
  --manifest docs/pipeline/batches/P001.4.txt \
  --dry-run \
  --quarantine-report-out data/validation/ingest_quarantine/P001.4.manual.report.json
```

6. Re-check status and coverage

```bash
./scripts/training-data/batch/sub-batch-ops P001.4 --status
```

## 4.3 Branch Conditions

- If command fails with sandbox-related Claude runtime issue, rerun that command outside sandbox (escalated execution).
- If `readiness-summary` still blocks on `missing_stage09_chunks`, inspect per-video stage 07/07b/09 artifacts and rerun from earliest failing stage for affected videos.
- If only quarantined videos remain blocked and non-quarantined set is complete, treat as done (decision-ready).

## 4.4 Manual Review Packet (for user decision)

After execution, report:
- readiness summary counts (`READY/REVIEW/BLOCKED`)
- gate summary (`pass/review/block`)
- quarantine count and IDs
- ingest dry-run: eligible IDs vs blocked IDs with reasons
- top blocking reason classes

## 5. Session Execution Log

## 5.1 Baseline (before rerun)

- `P001.4` quarantine: 6 video IDs (`stage07b_enrichment_verify_error`)
- non-quarantined videos blocked at readiness due missing stage 09 chunks: `KURlBcRF6-M`, `NBJ0JkyyqR0`, `wHQW1s5FzkY`, `zi8EvOdRQiI`
- ingest dry-run eligible videos: `0`

## 5.2 Implementation Status

- [x] Plan written to `docs/plans/codex_27_02.md`
- [x] P001.4 rerun executed
- [x] P001.4 validation refreshed
- [x] P001.4 ingest dry-run refreshed
- [x] P001.4 status metadata reconciled
- [x] Manual review packet produced

## 5.3 Final P001.4 Outcome (2026-02-27)

- Primary rerun executed from stage `07` with auto-repair path enabled.
- Post-repair readiness: `READY=2`, `REVIEW=0`, `BLOCKED=8`.
- Canonical gate summary: `pass=2`, `review=0`, `block=8`.
- Quarantine set increased from `6` to `8` after revalidation.
- Dry-run ingest eligible IDs:
  - `NBJ0JkyyqR0`
  - `zi8EvOdRQiI`
- Dry-run ingest blocked IDs:
  - `FVNOq-rQ2O0`
  - `KURlBcRF6-M`
  - `SPDOb_IE5YM`
  - `iOSpNACA9VI`
  - `n0smMRCqVmc`
  - `srq1OVqxX0E`
  - `wHQW1s5FzkY`
  - `x2kk9HoXjnI`
- Primary block class: `preexisting_quarantine` (root trigger: `stage07b_enrichment_verify_error`).
- Real ingest executed (non-dry-run) for eligible IDs:
  - `NBJ0JkyyqR0` ingested chunks=`35` at `2026-02-27T07:23:32.535Z`
  - `zi8EvOdRQiI` ingested chunks=`7` at `2026-02-27T07:23:32.925Z`

## 6. P001.5 Kickoff Snapshot (2026-02-27)

- Stage coverage: `06..07b=10/10`, `09=10/10`.
- Validation-derived readiness:
  - `READY=4` (`LftMFDMrfAQ`, `g35sbdbjNXw`, `jl5tLCqpTNo`, `l5zEcgIS2Pw`)
  - `REVIEW=4` (`6ImEzB6NhiI`, `7BfD4URAD1Y`, `HqQdRyRgPtU`, `Y9D7p8KMZek`)
  - `BLOCKED=2` (`d8C0t7FS3qM`, `d8H9RlGpS0g`)
- Canonical gate summary: `pass=4`, `review=4`, `block=2`.
- Stage 10 dry-run ingest scope: `8/10` eligible, `2/10` blocked by contamination-risk policy budget.
