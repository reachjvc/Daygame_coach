# Pipeline Iteration History

This file is the cross-session execution log for pipeline overhaul work.

## Rules

1. Every implementation iteration must add an entry.
2. Every entry must include before/after metrics from `pipeline_scorecard.py`.
3. If a run is reverted, add a rollback entry with trigger and action.
4. Keep entries append-only; do not rewrite prior iteration outcomes.

## Iteration Template

```md
## Iteration <id> - <date>

### Hypothesis
<single bounded hypothesis>

### Changes
- <file path>: <what changed>
- <file path>: <what changed>

### Run Scope
- manifest: <P002.9|P003.1|...>
- stages rerun: <list>
- run_id: <run_id>

### Before vs After (Scorecard)
- missing_required_input_count: <before> -> <after>
- silent_pass_count: <before> -> <after>
- cross_stage_error_rate: <before> -> <after>
- stage07_validation_error_count: <before> -> <after>
- chunk_validation_error_count: <before> -> <after>
- semantic_judge.mean_overall_score: <before> -> <after|n/a>
- semantic_judge.major_error_rate: <before> -> <after|n/a>
- semantic_judge.hallucination_rate: <before> -> <after|n/a>

### Decision
- keep|revert|adjust
- rationale: <short>

### Next Hypothesis
<single bounded hypothesis>
```

## Baseline B0 - 2026-02-19

### Context
- Starting point for codex pipeline overhaul.
- Generated using:
  - `python3 scripts/training-data/validation/pipeline_scorecard.py --manifest docs/pipeline/batches/P002.9.txt --run-id 20260219.P002.9.baseline --out data/validation/runs/20260219.P002.9.baseline/scorecard.json`

### Baseline Snapshot (P002.9)
- run_id: `20260219.P002.9.baseline`
- manifest: `docs/pipeline/batches/P002.9.txt`

Coverage:
- stage06: `10/10`
- stage06b: `10/10`
- stage06c: `10/10`
- stage06d: `10/10`
- stage06e: `10/10`
- stage06f: `7/10`
- stage06g: `0/10`
- stage06h: `0/10`
- stage07: `0/10`
- stage08_reports: `0/1`
- stage09: `0/10`

Quality/gating:
- cross_stage_error_rate: `1.0` (expected while Stage 07 outputs are absent)
- stage07_validation_error_count: `0`
- stage07_validation_warning_count: `0`
- quarantined_videos: `0`
- pass/review/block: `0/0/0` (no readiness summary emitted yet)

Contract health:
- missing_required_input_count: `0`
- silent_pass_count: `0`
- legacy_unmapped_enum_count: `0`
- gate_contract_parse_failures: `0`

### Known Structural Notes
- Quarantine propagation currently incomplete in orchestrators for `06c`-`06h` and `09`.
- `06c.DET.patch` permissive fallback behavior on missing verification remains unresolved in baseline.
- `pipeline-runner`/`sub-batch-pipeline` parity work not yet applied.

### Next Planned Iteration
- I1: Phase 1 plumbing hardening:
  - quarantine propagation end-to-end
  - strict `06b -> 06c` dependency
  - sequential/parallel orchestration parity checks

## Iteration I0 - 2026-02-19

### Hypothesis
Adding deterministic scorecard tooling and a persistent iteration log will reduce handoff ambiguity and enable objective before/after comparisons for all future pipeline changes.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`: added a new read-only scorecard generator for manifest scope.
- `docs/pipeline/audits/iteration-history.md`: created baseline and iteration tracking scaffold.
- `docs/plans/codex_improved_pipeline.md`: updated autonomous execution rule, live progress log, and phase tracker status.

### Run Scope
- manifest: `P002.9`
- stages rerun: none (read-only analysis run)
- run_id: `20260219.P002.9.baseline`

### Before vs After (Scorecard)
- missing_required_input_count: n/a -> `0`
- silent_pass_count: n/a -> `0`
- cross_stage_error_rate: n/a -> `1.0`
- stage07_validation_error_count: n/a -> `0`
- chunk_validation_error_count: n/a -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Decision
- keep
- rationale: baseline measurement and handoff structure are now executable and reproducible.

### Next Hypothesis
Enforcing strict `06b -> 06c` contracts plus full quarantine propagation in both orchestrators will eliminate silent pass-through and reduce ambiguous downstream failures.

## Iteration I1 - 2026-02-19

### Hypothesis
If quarantine propagation is wired end-to-end (`06c`-`06h`,`09`) and `06c` fails closed on missing `06b` verification, downstream ambiguity and silent dependency failures will be reduced without regressing baseline scorecard metrics.

### Changes
- `scripts/training-data/batch/quarantine_helpers.py`: added shared quarantine parsing and video-id matching helpers.
- `scripts/training-data/06c.DET.patch`: added `--quarantine-file`; default fail-closed behavior for missing verification; new explicit opt-out `--allow-missing-verification`.
- `scripts/training-data/06d.DET.sanitize`: added quarantine skip support and summary accounting.
- `scripts/training-data/06e.LLM.quality-check`: added quarantine skip support and summary accounting.
- `scripts/training-data/06f.DET.damage-map`: added quarantine skip support and summary accounting.
- `scripts/training-data/06g.LLM.damage-adjudicator`: added quarantine skip support and summary accounting.
- `scripts/training-data/06h.DET.confidence-propagation`: added quarantine skip support and summary accounting.
- `scripts/training-data/09.EXT.chunk-embed.ts`: added `--quarantine-file` and candidate filtering with skip summary.
- `scripts/training-data/batch/sub-batch-pipeline`: now passes `--quarantine-file` to `06c`-`06h`,`07`,`08`,`09`.
- `scripts/training-data/batch/pipeline-runner`: now passes `--quarantine-file` to the same stage set; pre-skip already quarantined videos.
- `docs/plans/codex_improved_pipeline.md`: updated live progress, status, and backlog markers for I1 completion state.

### Run Scope
- manifest: `P002.9`
- stages rerun: none full-run; targeted smoke checks + scorecard regeneration
- run_id: `20260219.P002.9.I1.plumbing`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `06c` missing verification now fails closed (exit `1`) unless `--allow-missing-verification` is set.
- `06c` and `06h` both skip quarantined videos when `--quarantine-file` is provided.
- `sub-batch-pipeline` dry-run now shows `--quarantine-file` on stage `06c` and stage `09` commands.
- `09.EXT.chunk-embed.ts` dry-run shows quarantined skip count in summary.

### Decision
- keep
- rationale: critical Phase 1 behavior changes are in place and validated; no scorecard regression observed.

### Next Hypothesis
Adding explicit stage contract preflight plus sequential/parallel post-stage parity checks will reduce orchestrator divergence and make gate outcomes deterministic across run modes.

## Iteration I2 - 2026-02-19

### Hypothesis
If both orchestrators enforce deterministic stage dependency preflight before execution, contract violations will fail early and reduce ambiguous downstream failures while preserving current scorecard behavior.

### Changes
- `scripts/training-data/validation/validate_stage_contract.py`: added new deterministic contract validator (`--manifest`, `--stage`, `--quarantine-file`, `--source`, `--json`).
- `scripts/training-data/batch/sub-batch-pipeline`: added pre-stage contract preflight call for every stage.
- `scripts/training-data/batch/pipeline-runner`: added per-stage contract preflight before execution.
- `scripts/training-data/batch/pipeline-runner`: extended quarantine metadata (`quarantine_checks`, `quarantine_reasons`) for non-06b quarantine outcomes.
- `scripts/training-data/batch/pipeline-runner`: added stage07/stage09 validator hooks to mark per-video quarantine on error-severity results.
- `scripts/training-data/batch/pipeline-runner`: added `--quarantine-file` override for parity with sequential orchestration.
- `scripts/training-data/batch/sub-batch-pipeline`: now forwards `--quarantine-file` to `pipeline-runner` in `--parallel` mode.
- `docs/plans/codex_improved_pipeline.md`: updated phase tracker and backlog status for I2 completion state.

### Run Scope
- manifest: `P002.9`
- stages rerun: targeted preflight + orchestrator smoke checks; no full end-to-end rerun yet
- run_id: `20260219.P002.9.I2.contract-preflight`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `validate_stage_contract.py` returns PASS for `P002.9` stage `06c` and FAIL for stage `07` when `06h` inputs are absent.
- `sub-batch-pipeline P002.9 --stage 07` now fails at preflight before stage execution when upstream contract is not met.
- `pipeline-runner P002.9 --from 07 --parallel 1` now fails fast at per-video preflight with explicit missing dependency details.
- All modified scripts pass syntax checks (`py_compile`, `bash -n`).

### Decision
- keep
- rationale: dependency failures are now explicit and early in both orchestrators; no scorecard regression observed.

### Next Hypothesis
Running the full parity matrix and aligning manifest-level post-stage validation behavior between sequential and parallel modes will close remaining orchestration divergence.

## Iteration I3 - 2026-02-19

### Hypothesis
If we execute the parity matrix and align quarantine override flow in parallel mode, sequential and parallel orchestration behavior will become more deterministic and comparable.

### Changes
- `scripts/training-data/batch/pipeline-runner`: added `--quarantine-file` CLI option and wired it through stage execution + end-of-run validation.
- `scripts/training-data/batch/sub-batch-pipeline`: forwards `--quarantine-file` to `pipeline-runner` when `--parallel` is used.
- Ran parity matrix checks across sequential and parallel paths and captured outcome evidence.

### Run Scope
- manifest: `P002.9`
- stages rerun: parity smoke matrix (stage dry-runs + contract-fail path runs), no full success-path rerun
- run_id: `20260219.P002.9.I3.parity-matrix`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Parity Matrix)
- Sequential single-stage dry-run:
  - `sub-batch-pipeline P002.9 --stage 06c --dry-run --quarantine-file ...` includes `--quarantine-file`.
- Parallel dry-run (`sub-batch-pipeline --parallel`):
  - propagated stage commands include `--quarantine-file` for `06c`-`09`.
  - preexisting quarantined video was skipped (`SKIP: already quarantined before run`).
- Sequential stage 07 real run:
  - failed at contract preflight (`Result: FAIL`, `Stage 07: CONTRACT PRECHECK FAILED`).
- Parallel stage 07 real run:
  - each video failed at stage `07` contract preflight with explicit missing `06h` dependency.

### Decision
- keep
- rationale: parity improved for quarantine override propagation and contract-failure behavior; no scorecard regression.

### Next Hypothesis
Closing remaining manifest-level post-stage parity (especially 06b/07/09 quarantine synthesis semantics) will eliminate residual differences between sequential and parallel orchestration outcomes.

## Iteration I4 - 2026-02-19

### Hypothesis
Adding canonical signal/gate scaffolding and making quarantine synthesis consume canonical fields will let Phase 2 terminology migration proceed without breaking existing validators.

### Changes
- `scripts/training-data/schemas/pipeline_signal.schema.json`: added canonical signal schema.
- `scripts/training-data/schemas/pipeline_gate.schema.json`: added canonical gate summary schema.
- `scripts/training-data/validation/normalize_quality_signals.py`: added normalization utility for legacy validation payloads into canonical signals.
- `scripts/training-data/batch/quarantine_updater.py`: added canonical-aware blocking extraction (`gate_decision` / `issue_severity` / `issue_code`) while preserving legacy `severity=error` behavior.

### Run Scope
- manifest: `P002.9`
- stages rerun: no stage reruns; validation utility smoke tests + scorecard refresh
- run_id: `20260219.P002.9.I4.canonical-foundation`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `normalize_quality_signals.py` successfully normalized `validate_cross_stage --json` output into canonical signals.
- `quarantine_updater.py` accepted synthetic canonical blocking payload and quarantined only the expected `gate_decision=block` video.
- Updated scripts passed syntax checks (`py_compile`).

### Decision
- keep
- rationale: canonical migration groundwork is in place and backward-compatible with legacy quarantine behavior.

### Next Hypothesis
Emitting canonical fields directly from `validate_manifest.py` and `validate_stage_report.py` (dual-emit legacy + canonical) will reduce enum ambiguity and allow canonical gate artifacts to become the primary control plane.

## Iteration I5 - 2026-02-19

### Hypothesis
If `validate_manifest.py` and `validate_stage_report.py` dual-emit canonical fields while preserving legacy fields, we can migrate consumers incrementally with no pipeline regression.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - added canonical annotation for each issue (`issue_severity`, `gate_decision`, `scope_type`, `issue_code`, `origin_stage`).
  - added `canonical_summary` section to report output.
  - extended emitted quarantine reasons with canonical fields.
- `scripts/training-data/validation/validate_stage_report.py`:
  - added canonical issue and gate mapping helpers.
  - readiness output now includes per-video `gate_decision` and summary `by_gate_decision`.
  - JSON report now dual-emits canonical issue fields + `canonical_summary`.
- `scripts/training-data/batch/quarantine_updater.py`:
  - now consumes canonical `gate_decision`/`issue_severity` paths in addition to legacy severity.

### Run Scope
- manifest: `P002.9`
- stages rerun: none; validator smoke checks + scorecard refresh
- run_id: `20260219.P002.9.I5.canonical-dual-emit`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `validate_manifest.py --json` now emits canonical fields per issue and `canonical_summary` when checks are enabled.
- `validate_stage_report.py --json` now emits readiness `gate_decision` and `summary.by_gate_decision`.
- Canonical synthetic payload in `quarantine_updater.py` quarantined only `gate_decision=block` video as expected.
- Updated scripts passed syntax checks.

### Decision
- keep
- rationale: canonical dual-emission is functional and backward-compatible; no scorecard regression.

### Next Hypothesis
Adding canonical decision rollups to `batch_report.py` and promoting canonical gate artifacts in downstream consumers will complete Phase 2 transition readiness.

## Iteration I6 - 2026-02-19

### Hypothesis
If we add canonical rollups to validation reporting and emit canonical gate artifacts directly from manifest validation, downstream consumers can migrate to canonical control signals without waiting for full legacy retirement.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - added canonical gate artifact emission (`--emit-canonical-gate`, `--canonical-gate-out`).
  - added default canonical gate path under `data/validation/gates/`.
  - report now includes `canonical_gate` metadata.
- `scripts/training-data/validation/batch_report.py`:
  - added canonical rollups in `stats.validation.canonical` (`gate_decisions`, `issue_severity`).
  - text output now prints canonical validation rollups.
- `scripts/training-data/validation/validate_stage_report.py`:
  - readiness summary now includes canonical `by_gate_decision` in summary.

### Run Scope
- manifest: `P002.9`
- stages rerun: none; validator/reporting smoke tests + scorecard refresh
- run_id: `20260219.P002.9.I6.canonical-rollups`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `validate_manifest.py --emit-canonical-gate` produced gate artifact with expected `pass/review/block` counts and per-video decisions.
- `batch_report.py --json` includes `stats.validation.canonical`.
- `validate_stage_report.py --json` includes `readiness_summary.summary.by_gate_decision`.
- Updated scripts passed syntax checks.

### Decision
- keep
- rationale: canonical control-plane artifacts are now emitted and consumable without regressing existing behavior.

### Next Hypothesis
Aligning `pipeline_scorecard.py` and orchestrator readiness consumption to prefer canonical gate artifacts (with legacy fallback) will complete Phase 2 integration and prepare Phase 3 confidence refactor.

## Iteration I7 - 2026-02-19

### Hypothesis
If canonical gate artifacts are present, `pipeline_scorecard.py` should deterministically consume them first and expose canonical gating counts/source in scorecard outputs.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`: no additional code changes in this iteration; executed verification reruns after canonical gate artifact generation.
- `data/validation/runs/20260219.P002.9.I7.canonical-first/scorecard.json`: regenerated to validate canonical-first gating path.

### Run Scope
- manifest: `P002.9`
- stages rerun: none; scorecard regeneration only
- run_id: `20260219.P002.9.I7.canonical-first`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- Scorecard now reports `inputs.canonical_gate=/home/jonaswsl/projects/daygame-coach/data/validation/gates/P002.9.gate.json`.
- Scorecard now reports `inputs.gating_source=canonical_gate`.
- Gating counts now reflect canonical gate payload (`block=10`).
- Prior `gating_source=none` output was confirmed as stale timing: scorecard was generated before canonical gate artifact existed.

### Decision
- keep
- rationale: canonical-first scorecard consumption behavior is correct and reproducible when canonical gate artifacts are available.

### Next Hypothesis
Using a shared end-of-run validation command path for sequential and parallel orchestration will reduce policy drift and keep canonical gate emission behavior consistent.

## Iteration I8 - 2026-02-19

### Hypothesis
If parallel mode delegates end-of-run validation to `sub-batch-pipeline --validate`, sequential and parallel runs will share exactly the same manifest/readiness/canonical-gate policy path.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`:
  - `validate_sub_batch` now always passes `--emit-canonical-gate`.
  - pipeline summary now prints canonical gate artifact path when present.
- `scripts/training-data/batch/pipeline-runner`:
  - `run_end_of_run_validation` now delegates to `bash scripts/training-data/batch/sub-batch-pipeline <sub_id> --validate` (plus quarantine override when present).
- `docs/plans/codex_improved_pipeline.md`: updated phase tracker, backlog, and immediate next actions.

### Run Scope
- manifest: `P002.9`
- stages rerun: validation path smoke (`--validate` + delegated invocation) and scorecard refresh
- run_id: `20260219.P002.9.I8.validation-parity`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate` now logs `Canonical gate: enabled (...)`.
- Delegated `run_end_of_run_validation('P002.9', Path('data/validation/quarantine/P002.9.json'))` executes the same `--validate` flow and returns its exit code.
- Updated scripts pass `bash -n` and `python3 -m py_compile`.
- Scorecard remains canonical-first (`gating_source=canonical_gate`) with no metric regression.

### Decision
- keep
- rationale: policy parity improved by removing duplicated end-of-run validation logic from parallel mode.

### Next Hypothesis
Aligning stage-local quarantine synthesis (`06b/07/09`) between sequential manifest-level hooks and parallel per-video hooks will close remaining orchestration parity gaps.

## Iteration I9 - 2026-02-19

### Hypothesis
If parallel stage `07/09` quarantine extraction reuses the same canonical-aware logic as `quarantine_updater.py`, stage-local quarantine decisions will be closer to sequential semantics.

### Changes
- `scripts/training-data/batch/pipeline-runner`:
  - imported `extract_from_cross_stage_or_chunks` from `quarantine_updater.py`.
  - replaced runner-local validator parsing with canonical-aware extraction (`gate_decision`/`issue_severity` aware).
  - removed duplicate legacy-only `extract_error_video_ids` parser.
- `docs/plans/codex_improved_pipeline.md`: updated live progress, phase tracker, and immediate next actions for I9.

### Run Scope
- manifest: `P002.9`
- stages rerun: dry-run parity smoke + scorecard refresh
- run_id: `20260219.P002.9.I9.stage-synthesis-parity`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `pipeline-runner` dry-run (`P002.9 --from 07 --parallel 1 --dry-run`) executes successfully with updated imports and stage command wiring.
- Updated scripts pass `python3 -m py_compile` and `bash -n`.
- Scorecard remains canonical-first (`gating_source=canonical_gate`) with no regression in tracked quality/contract metrics.
- Artifact drift observed during this iteration (`06f`/`06g` coverage increased) indicates ongoing upstream processing, but gating/contract metrics remained stable.

### Decision
- keep
- rationale: runner now consumes the same canonical blocking rules as sequential quarantine synthesis inputs, reducing semantic divergence.

### Next Hypothesis
Execute a controlled sequential-vs-parallel A/B on the same manifest snapshot and compare resulting quarantine files (`quarantined_video_ids`, `checks`, `reasons`) to close remaining parity gap evidence.

## Iteration I10 - 2026-02-19

### Hypothesis
A deterministic quarantine diff tool will make sequential-vs-parallel parity checks auditable and repeatable across sessions.

### Changes
- `scripts/training-data/validation/compare_quarantine.py`: added strict quarantine artifact comparator (`video_ids`, per-video `checks`, per-video normalized `reasons`), JSON/text output modes, and exit-code signaling (`0` match, `1` diff).
- `docs/plans/codex_improved_pipeline.md`: updated progress log, phase tracker, backlog, and immediate next actions to use the new diff tool for parity A/B.

### Run Scope
- manifest: `P002.9`
- stages rerun: scorecard refresh + tool smoke
- run_id: `20260219.P002.9.I10.quarantine-diff-tool`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `1.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `python3 scripts/training-data/validation/compare_quarantine.py --left data/validation/quarantine/P002.9.json --right data/validation/quarantine/P002.9.json --json` returns `match=true`.
- New script passes `python3 -m py_compile`.
- Scorecard remains canonical-first (`gating_source=canonical_gate`) with no metric regression.
- Artifact drift continued during this iteration (`stage06g` coverage increased), but gating/contract metrics stayed stable.

### Decision
- keep
- rationale: parity comparison is now mechanized; next iteration can focus on executing and evaluating true sequential-vs-parallel A/B outputs.

### Next Hypothesis
Run a controlled A/B on the same manifest snapshot, capture separate sequential and parallel quarantine artifacts, and use `compare_quarantine.py` to quantify any remaining stage-local parity gaps.

## Iteration I11 - 2026-02-20

### Hypothesis
Running a reproducible sequential-vs-parallel quarantine A/B simulation on the same manifest snapshot will reveal remaining parity gaps at stage-local synthesis boundaries.

### Changes
- `scripts/training-data/validation/simulate_parallel_quarantine.py`:
  - added deterministic per-video simulation of parallel quarantine decisions (`06b` REJECT, `07` and `09` validator-derived blocking extraction).
  - emits a standard quarantine JSON artifact for direct diffing.
- Generated parity artifacts:
  - `data/validation/parity/P002.9.sequential-sim.json`
  - `data/validation/parity/P002.9.parallel-sim.json`
  - `data/validation/parity/P002.9.seq-vs-par.diff.json`
- `docs/plans/codex_improved_pipeline.md`: updated live state and immediate actions with I11 divergence findings.

### Run Scope
- manifest: `P002.9`
- stages rerun: parity simulation + diff + scorecard refresh
- run_id: `20260219.P002.9.I11.parity-ab-sim`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `1.0` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Parity A/B)
- Sequential simulation result: `1` quarantined video (`CTfDIHi91uk`).
- Parallel simulation result: `10` quarantined videos.
- Diff summary (`compare_quarantine.py`):
  - `video_ids_only_left=0`
  - `video_ids_only_right=9`
  - `check_diffs=0`
  - `reason_diffs=0`
- Divergence is concentrated on `manifest_missing_stage07_output` semantics under manifest-scope vs per-video-scope evaluation.

### Decision
- adjust
- rationale: parity evidence exists and identifies a concrete mismatch; next iteration must normalize policy for missing Stage 07 outputs in stage-local synthesis.

### Next Hypothesis
Unifying missing-Stage07 policy (manifest-scope vs per-video scope) across sequential and parallel hooks will eliminate the `1` vs `10` quarantine divergence observed in I11.

## Iteration I12 - 2026-02-20

### Hypothesis
Switching runner stage `07/09` validator checks from per-video temp manifests to the full sub-batch manifest will remove the stage-local parity divergence observed in I11.

### Changes
- `scripts/training-data/batch/pipeline-runner`:
  - `run_video(...)` now receives the full manifest path.
  - stage `07/09` post-stage validation calls now use the full manifest path (while quarantining only the current video when present in blocking IDs).
- `scripts/training-data/validation/simulate_parallel_quarantine.py`:
  - added `--validator-scope` (`full|per-video`, default `full`) to mirror runner semantics.
  - full-scope mode runs validators once and applies per-video membership checks, matching updated runner behavior.
- Generated parity artifacts:
  - `data/validation/parity/P002.9.parallel-sim.full.json`
  - `data/validation/parity/P002.9.seq-vs-par.full.diff.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: parity simulation + scorecard refresh
- run_id: `20260220.P002.9.I12.validator-scope-fix`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Parity A/B)
- Pre-fix simulation (`I11`): sequential `1` vs parallel `10` quarantined videos (`match=false`).
- Post-fix simulation (`I12`, full scope): sequential `1` vs parallel `1` quarantined videos (`match=true`).
- `compare_quarantine.py` full-scope diff reports no ID/check/reason differences.
- Updated scripts pass `python3 -m py_compile`.

### Decision
- keep
- rationale: validator-scope fix eliminates measured parity divergence in simulation without scorecard regression.

### Next Hypothesis
Running an actual `pipeline-runner` execution slice with the new scope behavior will confirm that the parity fix holds in real orchestration flow (not only simulation).

## Iteration I13 - 2026-02-20

### Hypothesis
If runner Stage 07 commands skip per-video Claude preflight and use the I12 full-manifest validator scope behavior, real sequential vs parallel runs should converge on quarantine outcomes for a fully available sub-batch.

### Changes
- `scripts/training-data/batch/pipeline-runner`:
  - Stage 07 command builder now appends `--skip-llm-preflight` in runner mode to avoid per-video preflight churn/failures.
  - retained I12 full-manifest validator-scope behavior for stage `07/09` hook checks.
- Real-run parity artifacts:
  - sequential run: `sub-batch-pipeline P001.1 --run --from 07 --quarantine-file /tmp/P001.1.sequential.real.json`
  - parallel run: `pipeline-runner P001.1 --from 07 --parallel 2 --quarantine-file /tmp/P001.1.parallel.real.json`
  - diff: `data/validation/parity/P001.1.seq-vs-par.real.diff.json`
- Additional scorecard refresh:
  - `data/validation/runs/20260220.P001.1.I13.real-run-parity/scorecard.json`
  - `data/validation/runs/20260220.P002.9.I13.real-run-parity-fix/scorecard.json`

### Run Scope
- manifest: `P001.1` (real-run parity slice) and `P002.9` (no-regression scorecard refresh)
- stages rerun: real `07→09` sequential and parallel on `P001.1`; scorecard refresh on `P002.9`
- run_id: `20260220.P001.1.I13.real-run-parity`, `20260220.P002.9.I13.real-run-parity-fix`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Real-Run Parity)
- Real sequential vs parallel quarantine diff (`P001.1`) reports exact match:
  - `left_video_count=0`, `right_video_count=0`, `check_diffs=0`, `reason_diffs=0`, `match=true`.
- Parallel Stage 07 slice now completes successfully in this environment where per-video preflight had previously timed out.
- `P002.9` scorecard remained stable on tracked contract/gating metrics after the runner change.

### Decision
- keep
- rationale: real-run parity was verified on a complete sub-batch, and the runner no longer fails due redundant per-video Stage 07 preflight.

### Next Hypothesis
Applying the same real-run parity check to `P002.9` once Stage 07 reaches full coverage will confirm end-to-end parity closure on the primary iteration batch.

## Iteration I14 - 2026-02-20

### Hypothesis
Introducing a shared confidence math module and canonical confidence-trace schema (without changing current scoring behavior) will de-risk the Phase 3 refactor by centralizing confidence primitives.

### Changes
- Added `scripts/training-data/validation/confidence_model.py`:
  - deterministic shared helpers (`clamp01`, `band_from_score`, `weighted_mean`, `apply_penalties`, `aggregate_scope_confidence`).
- Added `scripts/training-data/schemas/confidence_trace.schema.json`:
  - canonical schema for segment/conversation/video confidence trace artifacts with scoped penalty traces.
- Updated `scripts/training-data/06h.DET.confidence-propagation`:
  - adopted shared confidence helpers (`band_from_score`, `clamp01`, `weighted_mean`) with behavior-preserving thresholds.
- Updated `docs/plans/codex_improved_pipeline.md` phase status and immediate actions for Phase 3.

### Run Scope
- manifest: `P002.9`
- stages rerun: none; compatibility checks + scorecard refresh
- run_id: `20260220.P002.9.I14.confidence-scaffold`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- Updated scripts pass `python3 -m py_compile`.
- `06h.DET.confidence-propagation --help` executes successfully after helper import changes.
- New confidence-trace schema parses cleanly as JSON.
- Scorecard metrics unchanged on tracked P002.9 quality/contract dimensions.

### Decision
- keep
- rationale: Phase 3 scaffolding is in place with no observed regression, enabling controlled rollout of trace emission in the next iteration.

### Next Hypothesis
Emitting schema-backed confidence traces from Stage 06h and validating them in the pipeline will improve confidence explainability without disrupting current gating behavior.

## Iteration I15 - 2026-02-20

### Hypothesis
If Stage 06h emits schema-aligned confidence trace artifacts and validation includes a migration-safe trace check, confidence explainability can be improved without destabilizing current pipeline gates.

### Changes
- `scripts/training-data/06h.DET.confidence-propagation`:
  - emits per-video `*.confidence.trace.json` alongside existing output/report files.
  - trace payload includes segment/conversation/video confidence summaries aligned to `confidence_trace.schema.json`.
  - report now includes `confidence_trace` metadata.
- Added `scripts/training-data/validation/validate_confidence_trace.py`:
  - validates trace structure, bounds, and video-id alignment for manifest scope.
  - migration mode: missing traces are warnings by default; explicit `--strict-missing` for enforcement.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - integrated confidence trace validation into `validate_sub_batch` flow.
- Generated traces by rerunning Stage 06h on `P001.1` (`--overwrite`) and verified trace validator PASS.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I15.trace-validation-hook/scorecard.json`

### Run Scope
- manifest: `P001.1` (trace generation + validation integration check), `P002.9` (no-regression scorecard)
- stages rerun: Stage 06h on `P001.1`, validation flow checks, scorecard refresh on `P002.9`
- run_id: `20260220.P002.9.I15.trace-validation-hook`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- `06h.DET.confidence-propagation --manifest docs/pipeline/batches/P001.1.txt --overwrite` emitted trace files for all 10 videos.
- `validate_confidence_trace.py --manifest docs/pipeline/batches/P001.1.txt` now reports `traces=10`, `errors=0`, `warnings=0`.
- `sub-batch-pipeline P001.1 --validate` includes `=== Confidence Trace Validation ===` and passes.
- `validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt` currently reports warning-only missing traces (`errors=0`, migration-safe).

### Decision
- keep
- rationale: trace artifacts are now produced and validated in the standard flow while preserving backward compatibility during backfill.

### Next Hypothesis
Backfilling traces on active baseline sub-batches and enabling strict missing-trace enforcement for promotion scopes will make confidence evidence a hard gate instead of a soft warning.

## Iteration I16 - 2026-02-20

### Hypothesis
Disabling per-video Stage 08 report writes in runner mode (while retaining manifest-level Stage 08 reporting in end-of-run validation) will reduce artifact churn without changing pipeline quality/gating outcomes.

### Changes
- `scripts/training-data/batch/pipeline-runner`:
  - Stage 08 command builder now appends `--no-report` for per-video runs.
  - end-of-run delegated validation path remains unchanged, so canonical manifest-level Stage 08 reports are still produced there.
- Verified runner dry-run command output includes:
  - Stage 07: `--skip-llm-preflight`
  - Stage 08: `--no-report`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I16.runner-stage08-no-report/scorecard.json`

### Run Scope
- manifest: `P002.9` (scorecard no-regression)
- stages rerun: none; runner command-shape smoke + scorecard refresh
- run_id: `20260220.P002.9.I16.runner-stage08-no-report`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Smoke)
- Dry-run runner command output now includes `08.DET.taxonomy-validation ... --no-report`.
- Scorecard metrics unchanged on P002.9 tracked dimensions.
- Manifest-level Stage 08 report availability remains intact via end-of-run validation path.

### Decision
- keep
- rationale: reduces runner-generated artifact noise with no observed impact on core quality/gating metrics.

### Next Hypothesis
After trace backfill on active baselines, enabling strict missing-trace enforcement on promotion scopes will strengthen confidence provenance guarantees without increasing false blocks.

## Iteration I17 - 2026-02-20

### Hypothesis
Backfilling confidence traces on `P002.9` and exercising strict trace validation controls will prepare the batch for hard confidence-provenance enforcement.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`:
  - added `--strict-confidence-trace` flag to pass `--strict-missing` to `validate_confidence_trace.py`.
- Trace backfill:
  - reran `06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite`.
  - emitted `*.confidence.trace.json` for manifest videos in active scope.
- Strict path exercise:
  - ran `sub-batch-pipeline P002.9 --validate --strict-confidence-trace`.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I17.trace-backfill/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: Stage 06h backfill + strict validation path + scorecard refresh
- run_id: `20260220.P002.9.I17.trace-backfill`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Backfill + Strict Path)
- `validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt` now reports `traces=10`, `errors=0`, `warnings=0`.
- `--strict-confidence-trace` path executed successfully for trace checks.
- Batch state shifted due overall validation updates:
  - quarantine now contains `1` video (`CTfDIHi91uk`),
  - effective non-quarantined scope is `9` videos.
- Scorecard reflects the new effective scope (`video_count_non_quarantined=9`) with no contract-health regressions.

### Decision
- keep
- rationale: trace coverage is now complete on `P002.9` and strict validation mode is operational; remaining work is rollout policy and promotion-scope adoption.

### Next Hypothesis
Defining strict-trace enforcement policy for promotion scopes (while keeping migration flexibility for older batches) will allow confidence evidence to become a reliable gate with minimal operational churn.

## Iteration I18 - 2026-02-20

### Hypothesis
Making confidence-trace strictness config-driven (with promotion-scope auto enforcement) and propagating delegated validation failures to runner exit codes will harden promotion readiness without regressing current `P002.9` outcomes.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`:
  - added config-driven confidence-trace policy resolution (`warn|auto|strict`) from `pipeline.config.json`.
  - added CLI override `--confidence-trace-mode`.
  - kept `--strict-confidence-trace` as hard override and surfaced resolved policy in validation logs.
- `scripts/training-data/batch/pipeline.config.json`:
  - added `validation.confidence_trace` with default `mode=auto` and strict scopes:
    - `P003.*`, `CANARY.*`, `HOLDOUT.*`, `HARDENING.*`.
- `scripts/training-data/batch/pipeline-runner`:
  - now returns non-zero if delegated end-of-run validation fails.
- Docs updates:
  - `docs/pipeline/validation_harness.md` (new policy + CLI override examples).
  - `docs/pipeline/ASCII` (06h trace artifact path).
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I18.confidence-policy/scorecard.json`
  - precheck scorecard: `data/validation/runs/20260220.P003.1.I18.precheck/scorecard.json`

### Run Scope
- manifest: `P002.9` (no-regression + policy smoke), `P003.1` (promotion-scope policy smoke)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I18.confidence-policy`, `20260220.P003.1.I18.precheck`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Policy)
- `sub-batch-pipeline P002.9 --validate` now reports:
  - `Confidence trace policy: mode=auto strict=false ... reason=auto-scope-miss`
  - `validate-confidence-trace` PASS (`traces=10`, `errors=0`, `warnings=0`).
- `sub-batch-pipeline P003.1 --validate` now reports:
  - `Confidence trace policy: mode=auto strict=true ... reason=auto-scope-match`
  - `validate-confidence-trace` FAIL (`traces=0`, `errors=10`, missing traces for all manifest videos).
- Current `P002.9` quarantine artifact was regenerated during validation and currently reports `quarantined_video_count=0` (state drift from I17).

### Decision
- keep
- rationale: strict policy behavior is now deterministic and promotion-scope-aware, while existing `P002.9` validation remains stable.

### Next Hypothesis
Backfilling `P003.1` through Stage `06h` and rerunning `--validate` under auto policy will convert promotion-scope strict trace failures into actionable readiness signals rather than migration noise.

## Iteration I19 - 2026-02-20

### Hypothesis
Adding confidence trace-coverage metrics directly to scorecards will make strict-trace rollout/calibration measurable per iteration without changing gating behavior.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - extended `confidence` block with:
    - `trace_files_present`
    - `trace_files_expected`
    - `trace_coverage_ratio`
  - computes coverage over non-quarantined effective scope.
- `docs/plans/codex_improved_pipeline.md`:
  - updated scorecard spec and phase tracker to include new confidence coverage fields.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I19.trace-coverage-metrics/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I19.trace-coverage-metrics/scorecard.json`

### Run Scope
- manifest: `P002.9`, `P003.1`
- stages rerun: none (read-only scorecard refresh)
- run_id: `20260220.P002.9.I19.trace-coverage-metrics`, `20260220.P003.1.I19.trace-coverage-metrics`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Scorecard Fields)
- `P002.9` confidence block now reports:
  - `trace_files_present=10`
  - `trace_files_expected=10`
  - `trace_coverage_ratio=1.0`
- `P003.1` confidence block now reports trace coverage fields as well (effective scope currently `0` due quarantine state from prior validations).
- Updated script passes `python3 -m py_compile`.

### Decision
- keep
- rationale: provides measurable confidence-provenance coverage signals with no regression in existing contract/quality metrics.

### Next Hypothesis
Running a first bounded confidence calibration sweep (band boundaries + chunk floor) on `P002.9` and comparing trace coverage + quality metrics will identify a better default confidence profile for promotion runs.

## Iteration I20 - 2026-02-20

### Hypothesis
A real `pipeline-runner` slice on `P002.9` will confirm that delegated end-of-run validation failures now propagate as non-zero runner exit status.

### Changes
- `scripts/training-data/batch/pipeline-runner` behavior verification (no code changes in this iteration):
  - executed real runner slice: `./scripts/training-data/batch/pipeline-runner P002.9 --from 09 --parallel 1`.
  - observed delegated validation failure propagation through runner exit code.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I20.runner-validation-exit/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: real runner execution from Stage `09` + delegated end-of-run validation
- run_id: `20260220.P002.9.I20.runner-validation-exit`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Runner Exit Propagation)
- Runner command exited `rc=1`.
- Runner log included: `[pipeline-runner] End-of-run validation failed (exit 1)`.
- Runner summary showed one failed video in this slice (`Passed: 9/10`, `Failed: 1`).
- Post-run scorecard reflects effective-scope state:
  - `quarantined_videos=1`
  - `video_count_non_quarantined=9`
  - confidence trace coverage remains complete on effective scope (`trace_files_present=9`, `trace_files_expected=9`).

### Decision
- keep
- rationale: operationally confirms that runner no longer reports success when delegated validation fails.

### Next Hypothesis
Executing a bounded confidence calibration sweep on `P002.9` (band boundary + chunk floor variants) will improve semantic quality signals while keeping structural error metrics at zero.

## Iteration I21 - 2026-02-20

### Hypothesis
Exposing calibration knobs for Stage `06h` and Stage `09` through both orchestrators will enable controlled confidence sweeps without code edits and without changing default scorecard behavior.

### Changes
- `scripts/training-data/06h.DET.confidence-propagation`:
  - added CLI args:
    - `--confidence-band-high-threshold`
    - `--confidence-band-medium-threshold`
  - tiering now uses configured thresholds (default unchanged: `0.80/0.60`).
  - report/metadata now include active band thresholds.
- `scripts/training-data/09.EXT.chunk-embed.ts`:
  - added CLI arg:
    - `--min-chunk-confidence`
  - chunk floor now uses runtime arg (default unchanged: `0.30`).
- `scripts/training-data/batch/sub-batch-pipeline`:
  - added orchestrator flags with validation and stage pass-through:
    - `--confidence-band-high-threshold`
    - `--confidence-band-medium-threshold`
    - `--min-chunk-confidence`
- `scripts/training-data/batch/pipeline-runner`:
  - added matching args and pass-through in per-video stage command builders.
- Docs:
  - `docs/pipeline/validation_harness.md` updated with calibration knob usage.
  - `docs/pipeline/ASCII` updated to reflect tunable 06h bands and 09 floor.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I21.calibration-knobs/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: dry-run command-shape verification + read-only scorecard refresh
- run_id: `20260220.P002.9.I21.calibration-knobs`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Knob Wiring)
- Sequential dry-run now includes Stage `06h` threshold flags:
  - `...06h.DET.confidence-propagation --confidence-band-high-threshold 0.85 --confidence-band-medium-threshold 0.65 ...`
- Sequential dry-run now includes Stage `09` floor flag:
  - `...09.EXT.chunk-embed.ts --min-chunk-confidence 0.35 ...`
- Parallel dry-run (`sub-batch-pipeline ... --parallel`) shows both overrides forwarded through `pipeline-runner` per-video commands.
- `06h --help`, `pipeline-runner --help`, and `sub-batch-pipeline --help` all list new options.

### Decision
- keep
- rationale: calibration controls are now operationally usable while preserving baseline behavior when defaults are used.

### Next Hypothesis
Running first bounded calibration sweep variants on `P002.9` (A/B/C band cutoffs plus chunk floor sweep) will reveal a profile that improves semantic quality without increasing structural errors.

## Iteration I22 - 2026-02-20

### Hypothesis
Applying stricter Stage `06h` band thresholds (`high>=0.85`, `medium>=0.65`) on `P002.9` will improve confidence discrimination without degrading structural quality metrics.

### Changes
- Executed Stage `06h` sweep variant A on `P002.9`:
  - `./scripts/training-data/06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite --confidence-band-high-threshold 0.85 --confidence-band-medium-threshold 0.65 --quarantine-file data/validation/quarantine/P002.9.json`
- Strict trace check:
  - `validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt --quarantine-file data/validation/quarantine/P002.9.json --strict-missing`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I22.band-sweep-a/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: Stage `06h` overwrite + trace validation + scorecard refresh
- run_id: `20260220.P002.9.I22.band-sweep-a`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Sweep A)
- Trace validation stayed strict-PASS (`effective_videos=9`, `trace_files_processed=9`, `errors=0`).
- Confidence redistribution was substantial:
  - `segment_band_counts.high: 2202 -> 1646`
  - `segment_band_counts.medium: 85 -> 631`
  - `segment_band_counts.low: 82 -> 92`
  - `video_confidence_mean: 0.7984 -> 0.7256`
- Structural quality/retrieval contract metrics remained unchanged.

### Decision
- adjust
- rationale: sweep changed confidence labeling materially but did not improve tracked structural quality metrics; do not promote this threshold set as default.

### Next Hypothesis
Restoring default Stage `06h` thresholds (`0.80/0.60`) should return baseline confidence distribution, after which chunk-floor sweep variants can be tested independently.

## Iteration I23 - 2026-02-20

### Hypothesis
Reapplying default Stage `06h` thresholds after sweep A will restore baseline confidence distribution and keep trace/contract health stable.

### Changes
- Restored Stage `06h` defaults on `P002.9`:
  - `./scripts/training-data/06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite --confidence-band-high-threshold 0.80 --confidence-band-medium-threshold 0.60 --quarantine-file data/validation/quarantine/P002.9.json`
- Strict trace check:
  - `validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt --quarantine-file data/validation/quarantine/P002.9.json --strict-missing`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I23.band-sweep-restore-default/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: Stage `06h` overwrite (restore defaults) + trace validation + scorecard refresh
- run_id: `20260220.P002.9.I23.band-sweep-restore-default`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Trace validation strict-PASS remained stable (`effective_videos=9`, `errors=0`).
- Confidence distribution returned to prior baseline:
  - `segment_band_counts.high: 1646 -> 2202`
  - `segment_band_counts.medium: 631 -> 85`
  - `segment_band_counts.low: 92 -> 82`
  - `video_confidence_mean: 0.7256 -> 0.7984`

### Decision
- keep
- rationale: rollback restored baseline confidence profile exactly and preserved contract/quality stability.

### Next Hypothesis
Running a bounded Stage `09` chunk-floor sweep (`--min-chunk-confidence`) on controlled scope will provide a clearer retrieval-quality signal than band-threshold-only changes.

## Iteration I24 - 2026-02-20

### Hypothesis
A controlled one-video Stage `09` run with elevated chunk floor (`--min-chunk-confidence 0.35`) will provide first empirical signal for chunk-floor calibration with limited cost.

### Changes
- Created temporary one-video manifest:
  - `/tmp/P002.9.I24.one.txt`
- Attempted controlled Stage `09` execution:
  - `node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I24.one.txt --full --min-chunk-confidence 0.35`
- No pipeline artifacts were changed due early preflight failure.

### Run Scope
- manifest: `/tmp/P002.9.I24.one.txt` (single video: `WgPkSUjFsCw`)
- stages rerun: Stage `09` attempted only
- run_id: n/a (run aborted before scorecard-worthy artifact update)

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0` (unchanged from latest stable `P002.9` scorecard)
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Blocker)
- Stage `09` command failed at Ollama preflight with:
  - `Fatal error during chunk-embed: Error: Ollama is not reachable at http://localhost:11434 (fetch failed).`
- This is an environment/runtime dependency blocker, not a calibration-logic failure.

### Decision
- adjust
- rationale: calibration execution path is ready, but chunk-floor experiment is blocked until local embedding service is available.

### Next Hypothesis
Once Ollama is reachable, rerunning the same one-video Stage `09` command will establish the first controlled chunk-floor delta; then expand to bounded multi-video sweep.

## Iteration I25 - 2026-02-20

### Hypothesis
Running the previously blocked one-video Stage `09` chunk-floor sweep (`--min-chunk-confidence 0.35`) after restoring Ollama reachability will produce measurable retrieval-floor deltas.

### Changes
- Created one-video calibration manifest:
  - `/tmp/P002.9.I25.one.txt` (`WgPkSUjFsCw`)
- Captured before metrics:
  - `data/validation/runs/20260220.P002.9.I25.chunk-floor-before/scorecard.json`
  - `validate_chunks.py --manifest /tmp/P002.9.I25.one.txt --json`
- Executed Stage `09` sweep run (escalated execution, reachable Ollama):
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I25.one.txt --full --min-chunk-confidence 0.35`
- Captured after metrics:
  - `data/validation/runs/20260220.P002.9.I25.chunk-floor-after-035/scorecard.json`
  - `validate_chunks.py --manifest /tmp/P002.9.I25.one.txt --json`
- Inspected generated chunk confidences for this video:
  - min score `0.9`, none below `0.35`.

### Run Scope
- manifest: `/tmp/P002.9.I25.one.txt` (single video)
- stages rerun: Stage `09` only
- run_id: `20260220.P002.9.I25.chunk-floor-before`, `20260220.P002.9.I25.chunk-floor-after-035`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Chunk-Floor Sweep)
- Stage `09` run succeeded and wrote `14` chunks.
- Chunk validation remained PASS (`errors=0`, `warnings=0`).
- No effective change from floor increase:
  - all scored chunks already above threshold (`min_score=0.9`),
  - `below_floor_drop_ratio` remained `0.0`.

### Decision
- adjust
- rationale: sweep path now operational, but this single-video scope is floor-insensitive; move to higher-variance scope for meaningful chunk-floor calibration signal.

### Next Hypothesis
Restoring this scoped run to default floor (`0.30`) should preserve stability, after which chunk-floor sweeps should target videos/sub-batches with lower confidence tails.

## Iteration I26 - 2026-02-20

### Hypothesis
Restoring the one-video Stage `09` output to default floor (`0.30`) after `I25` will keep metrics stable and return the scoped artifact to baseline settings.

### Changes
- Restored one-video Stage `09` output with default floor:
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I25.one.txt --full --min-chunk-confidence 0.30`
- Captured restore checkpoint:
  - `data/validation/runs/20260220.P002.9.I26.chunk-floor-restore-default/scorecard.json`
  - `validate_chunks.py --manifest /tmp/P002.9.I25.one.txt --json`

### Run Scope
- manifest: `/tmp/P002.9.I25.one.txt`
- stages rerun: Stage `09` only (restore)
- run_id: `20260220.P002.9.I26.chunk-floor-restore-default`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Stage `09` restore run succeeded; output remains `14` chunks.
- Chunk validation PASS unchanged (`errors=0`, `warnings=0`).
- Scorecard remained stable.

### Decision
- keep
- rationale: restore operation is stable and preserves scoped baseline while sweep capability stays available.

### Next Hypothesis
Running chunk-floor sweeps on broader, lower-confidence-tail scope (not this floor-insensitive single video) will produce measurable retrieval deltas for calibration decisions.

## Iteration I27 - 2026-02-20

### Hypothesis
Raising chunk floor to `0.40` on a known low-tail video (`03m9yo-ikPc`, min score ~`0.36`) will produce measurable chunk pruning while keeping chunk validation clean.

### Changes
- Created focused low-tail manifest:
  - `/tmp/P002.9.I27.one03m9.txt`
- Captured pre-run state:
  - `validate_chunks.py --manifest /tmp/P002.9.I27.one03m9.txt --json` (`chunks=47`)
  - direct chunk stats (`min_score=0.36007`, `lt040=2`)
- Executed Stage `09` sensitivity run (escalated):
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I27.one03m9.txt --full --min-chunk-confidence 0.40`
- Captured post-run state:
  - `validate_chunks.py --manifest /tmp/P002.9.I27.one03m9.txt --json` (`chunks=45`)
  - `data/validation/runs/20260220.P002.9.I27.chunk-floor-040-after/scorecard.json`
  - direct chunk stats (`min_score=0.42361`, `lt040=0`)

### Run Scope
- manifest: `/tmp/P002.9.I27.one03m9.txt`
- stages rerun: Stage `09` only (sensitivity run)
- run_id: `20260220.P002.9.I27.chunk-floor-040-after`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Sensitivity)
- Stage `09` explicitly logged pruning:
  - `Filtered 2 chunk(s) below confidence floor 0.4`
- Chunk count changed as expected:
  - `47 -> 45` chunks
- Chunk validation remained PASS (`errors=0`, `warnings=0`).

### Decision
- keep
- rationale: confirms chunk-floor control is functionally effective on low-tail content with no structural validation regressions.

### Next Hypothesis
Restoring this focused run to default floor (`0.30`) should recover baseline chunk count; next step is multi-video low-tail sweep.

## Iteration I28 - 2026-02-20

### Hypothesis
Resetting the focused low-tail video back to default floor (`0.30`) will restore baseline chunk count and confidence-tail shape.

### Changes
- Restored focused Stage `09` output:
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I27.one03m9.txt --full --min-chunk-confidence 0.30`
- Collected restore evidence:
  - `validate_chunks.py --manifest /tmp/P002.9.I27.one03m9.txt --json` (`chunks=47`)
  - `data/validation/runs/20260220.P002.9.I28.chunk-floor-restore-default/scorecard.json`
  - direct chunk stats (`min_score=0.36007`, `lt040=2`)

### Run Scope
- manifest: `/tmp/P002.9.I27.one03m9.txt`
- stages rerun: Stage `09` only (restore)
- run_id: `20260220.P002.9.I28.chunk-floor-restore-default`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Chunk count restored from `45 -> 47`.
- Low-tail confidence behavior restored (`lt040=2`).
- Chunk validation remained PASS.

### Decision
- keep
- rationale: restore is deterministic and confirms sweep side effects are reversible.

### Next Hypothesis
Running a curated multi-video low-tail chunk-floor sweep will provide aggregate calibration signal and expose whether scorecard retrieval metrics need pre-filter-drop instrumentation.

## Iteration I29 - 2026-02-20

### Hypothesis
If Stage `09` emits explicit pre-filter telemetry and `pipeline_scorecard` consumes it, chunk-floor sweeps can be quantified directly via scorecard retrieval metrics.

### Changes
- `scripts/training-data/09.EXT.chunk-embed.ts`:
  - added chunk artifact telemetry fields:
    - `minChunkConfidence`
    - `preFilterChunkCount`
    - `droppedChunksBelowFloor`
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - retrieval drop-ratio computation now prefers Stage `09` pre-filter telemetry.
  - basis field now reports:
    - `pre_filter_chunks` when telemetry is present
    - `produced_chunks` fallback otherwise
- Verification run (focused low-tail manifest):
  - reran Stage `09` with floor `0.40` on `/tmp/P002.9.I27.one03m9.txt`
  - emitted telemetry: `preFilterChunkCount=47`, `droppedChunksBelowFloor=2`, `minChunkConfidence=0.4`
  - scorecard run:
    - `data/validation/runs/20260220.P002.9.I29.prefilter-telemetry/scorecard.json`

### Run Scope
- manifest: `/tmp/P002.9.I27.one03m9.txt`
- stages rerun: Stage `09` only + scorecard refresh
- run_id: `20260220.P002.9.I29.prefilter-telemetry`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Telemetry)
- Scorecard retrieval now shows:
  - `below_floor_drop_ratio=0.0426` (2 / 47)
  - `below_floor_drop_ratio_basis=pre_filter_chunks`
- Chunk validation remained PASS (`errors=0`, `warnings=0`).

### Decision
- keep
- rationale: retrieval calibration is now measurable in scorecards with accurate pre-filter basis.

### Next Hypothesis
Restoring the same focused manifest to default floor (`0.30`) should produce `below_floor_drop_ratio=0.0` on `pre_filter_chunks` basis.

## Iteration I30 - 2026-02-20

### Hypothesis
Restoring focused Stage `09` output to floor `0.30` after telemetry validation will return retrieval drop telemetry to zero while preserving structural pass status.

### Changes
- Restored focused manifest run:
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I27.one03m9.txt --full --min-chunk-confidence 0.30`
- Restore scorecard:
  - `data/validation/runs/20260220.P002.9.I30.prefilter-telemetry-restore/scorecard.json`
- Confirmed telemetry fields after restore:
  - `minChunkConfidence=0.3`
  - `preFilterChunkCount=47`
  - `droppedChunksBelowFloor=0`

### Run Scope
- manifest: `/tmp/P002.9.I27.one03m9.txt`
- stages rerun: Stage `09` restore + scorecard refresh
- run_id: `20260220.P002.9.I30.prefilter-telemetry-restore`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Scorecard retrieval now reports:
  - `below_floor_drop_ratio=0.0`
  - `below_floor_drop_ratio_basis=pre_filter_chunks`
- Chunk validation remained PASS.

### Decision
- keep
- rationale: telemetry-backed retrieval metric behaves as expected across sweep and restore.

### Next Hypothesis
Running a curated multi-video low-tail manifest sweep will provide aggregate retrieval-drop calibration signal now that telemetry is available in scorecards.

## Iteration I31 - 2026-02-20

### Hypothesis
A curated multi-video low-tail sweep at floor `0.45` will provide aggregate pre-filter drop telemetry and validate whether pruning remains structurally safe beyond single-video tests.

### Changes
- Created curated low-tail manifest:
  - `/tmp/P002.9.I31.lowtail3.txt`
  - videos: `03m9yo-ikPc`, `CAyMs19EYrw`, `863IDsEeHKU`
- Captured baseline:
  - `validate_chunks.py --manifest /tmp/P002.9.I31.lowtail3.txt --json` (`chunks=79`)
  - `data/validation/runs/20260220.P002.9.I31.lowtail3-before/scorecard.json`
- Executed Stage `09` sweep:
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I31.lowtail3.txt --full --min-chunk-confidence 0.45`
- Captured post-sweep:
  - `validate_chunks.py --manifest /tmp/P002.9.I31.lowtail3.txt --json` (`chunks=76`)
  - `data/validation/runs/20260220.P002.9.I31.lowtail3-after-045/scorecard.json`
  - per-video telemetry snapshot:
    - `03m9yo-ikPc`: `pref=47`, `drop=3`, `chunks=44`
    - `CAyMs19EYrw`: `pref=17`, `drop=0`, `chunks=17`
    - `863IDsEeHKU`: `pref=15`, `drop=0`, `chunks=15`

### Run Scope
- manifest: `/tmp/P002.9.I31.lowtail3.txt`
- stages rerun: Stage `09` only (multi-video sweep)
- run_id: `20260220.P002.9.I31.lowtail3-before`, `20260220.P002.9.I31.lowtail3-after-045`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Aggregate Sweep)
- Scorecard retrieval metric captured aggregate drop signal:
  - `below_floor_drop_ratio=0.038` (`3/79`)
  - `below_floor_drop_ratio_basis=pre_filter_chunks`
- Chunk validation remained PASS (`errors=0`, `warnings=0`).
- Pruning localized to one low-tail video, with no structural validation regression.

### Decision
- keep
- rationale: multi-video sweep confirms telemetry-backed pruning measurement and stable structural behavior at higher floor.

### Next Hypothesis
Restoring the curated manifest to default floor (`0.30`) should return aggregate drop ratio to zero and recover baseline chunk counts.

## Iteration I32 - 2026-02-20

### Hypothesis
Restoring the curated low-tail manifest to floor `0.30` after `I31` will recover baseline chunk counts and zero out telemetry drop ratio.

### Changes
- Restored curated manifest:
  - `OLLAMA_API_URL=http://127.0.0.1:11434 node --import ./node_modules/tsx/dist/loader.mjs ./scripts/training-data/09.EXT.chunk-embed.ts --manifest /tmp/P002.9.I31.lowtail3.txt --full --min-chunk-confidence 0.30`
- Captured restore evidence:
  - `validate_chunks.py --manifest /tmp/P002.9.I31.lowtail3.txt --json` (`chunks=79`)
  - `data/validation/runs/20260220.P002.9.I32.lowtail3-restore-default/scorecard.json`
  - per-video telemetry reset:
    - `03m9yo-ikPc`: `pref=47`, `drop=0`, `chunks=47`
    - `CAyMs19EYrw`: `pref=17`, `drop=0`, `chunks=17`
    - `863IDsEeHKU`: `pref=15`, `drop=0`, `chunks=15`

### Run Scope
- manifest: `/tmp/P002.9.I31.lowtail3.txt`
- stages rerun: Stage `09` restore
- run_id: `20260220.P002.9.I32.lowtail3-restore-default`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0` -> `0.0`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Scorecard retrieval returned to:
  - `below_floor_drop_ratio=0.0`
  - `below_floor_drop_ratio_basis=pre_filter_chunks`
- Chunk validation remained PASS and chunk counts returned to baseline.

### Decision
- keep
- rationale: confirms reversible chunk-floor experimentation at curated scope with consistent telemetry behavior.

### Next Hypothesis
Run alternate Stage `06h` band set (`0.75/0.55`) on controlled scope and compare semantic/structural deltas against baseline + prior sweep A.

## Iteration I33 - 2026-02-20

### Hypothesis
Applying Stage `06h` band set C (`high>=0.75`, `medium>=0.55`) on `P002.9` will increase high-band coverage without introducing structural or contract regressions.

### Changes
- Executed Stage `06h` sweep variant C on `P002.9`:
  - `./scripts/training-data/06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite --confidence-band-high-threshold 0.75 --confidence-band-medium-threshold 0.55 --quarantine-file data/validation/quarantine/P002.9.json`
- Strict trace check:
  - `python3 scripts/training-data/validation/validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt --quarantine-file data/validation/quarantine/P002.9.json --strict-missing --json`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I33.band-sweep-b/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: Stage `06h` overwrite + trace validation + scorecard refresh
- run_id: `20260220.P002.9.I33.band-sweep-b`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Sweep C)
- Trace validation stayed strict-PASS (`effective_videos=9`, `trace_files_processed=9`, `errors=0`).
- Confidence distribution shifted (vs default baseline):
  - `segment_band_counts.high: 2202 -> 2220`
  - `segment_band_counts.medium: 85 -> 70`
  - `segment_band_counts.low: 82 -> 79`
  - `video_confidence_mean: 0.7984 -> 0.8017`
- Retrieval/contract metrics remained stable:
  - `below_floor_drop_ratio=0.0` (`basis=pre_filter_chunks`)
  - `missing_required_input_count=0`
  - `silent_pass_count=0`

### Decision
- adjust
- rationale: threshold set C changes confidence labeling but does not improve tracked structural/readiness outcomes; keep as alternate calibration profile, not default.

### Next Hypothesis
Restoring default Stage `06h` thresholds (`0.80/0.60`) after sweep C will return baseline confidence distribution while preserving trace coverage and contract health.

## Iteration I34 - 2026-02-20

### Hypothesis
Restoring Stage `06h` defaults after `I33` will deterministically recover baseline confidence distribution and maintain zero-regression contract/retrieval metrics.

### Changes
- Restored Stage `06h` defaults on `P002.9`:
  - `./scripts/training-data/06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite --confidence-band-high-threshold 0.80 --confidence-band-medium-threshold 0.60 --quarantine-file data/validation/quarantine/P002.9.json`
- Strict trace check:
  - `python3 scripts/training-data/validation/validate_confidence_trace.py --manifest docs/pipeline/batches/P002.9.txt --quarantine-file data/validation/quarantine/P002.9.json --strict-missing --json`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I34.band-sweep-b-restore-default/scorecard.json`

### Run Scope
- manifest: `P002.9`
- stages rerun: Stage `06h` overwrite (restore defaults) + trace validation + scorecard refresh
- run_id: `20260220.P002.9.I34.band-sweep-b-restore-default`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Restore)
- Trace validation remained strict-PASS (`effective_videos=9`, `errors=0`).
- Confidence distribution restored exactly:
  - `segment_band_counts.high: 2220 -> 2202`
  - `segment_band_counts.medium: 70 -> 85`
  - `segment_band_counts.low: 79 -> 82`
  - `video_confidence_mean: 0.8017 -> 0.7984`
- Retrieval metric and contract health remained stable:
  - `below_floor_drop_ratio=0.0` (`basis=pre_filter_chunks`)
  - `missing_required_input_count=0`
  - `silent_pass_count=0`

### Decision
- keep
- rationale: default thresholds remain the stable baseline and produce reversible calibration behavior.

### Next Hypothesis
Backfilling `P003.1` through Stage `06h` and running policy-driven validation will verify promotion-scope trace strictness and confidence coverage before full promotion runs.

## Iteration I35 - 2026-02-20

### Hypothesis
Adding prompt-budget controls to Stage `06b` verification (transcript sampling + shorter prompt profile) will prevent Claude timeout failures and make `P003.1` verification runtime viable.

### Changes
- `scripts/training-data/06b.LLM.verify`:
  - added `--max-transcript-segments` with timeline sampling for transcript prompt budget.
  - added `--prompt-profile` (`standard|fast`) and new compact `fast` verification prompt template.
  - wired new knobs through single-file/source/manifest execution paths.
  - added runtime logging for prompt-budget/profile activation.
- Diagnostics (single video `M4sX7Xd9lV4`):
  - tested `standard` and `fast` profiles with transcript budget (`24`) and timeouts (`120s`, `300s`).
  - all combinations still timed out in this environment.
- No-regression scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I35.06b-timeout-mitigation/scorecard.json`

### Run Scope
- manifest: `P002.9` (scorecard no-regression), single-file `P003.1` `06b` runtime probes
- stages rerun: none full-run; Stage `06b` diagnostic invocations only + scorecard refresh
- run_id: `20260220.P002.9.I35.06b-timeout-mitigation`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (06b Runtime Blocker)
- `06b` single-file probes timed out under all tested combinations:
  - `--prompt-profile standard --max-transcript-segments 24 --timeout-seconds 120`
  - `--prompt-profile standard --max-transcript-segments 24 --timeout-seconds 300`
  - `--prompt-profile fast --max-transcript-segments 24 --timeout-seconds 120`
  - `--prompt-profile fast --max-transcript-segments 24 --timeout-seconds 300`
- Fast profile reduced prompt size from `~12.6k` to `~5.0k` chars, but timeout persisted.

### Decision
- adjust
- rationale: keep new `06b` runtime-control knobs (useful instrumentation and future flexibility), but treat `06b` as hard-blocked in current Claude runtime envelope.

### Next Hypothesis
A deterministic fallback path (`06c --allow-missing-verification` + `06d` + `06f` + `06h`) can still backfill `P003.1` confidence traces for promotion-scope policy validation while `06b` runtime is unresolved.

## Iteration I36 - 2026-02-20

### Hypothesis
Running `P003.1` through deterministic upstream stages and fallback `06c/06d/06f/06h` will produce strict-valid confidence traces across all 10 videos, enabling promotion-scope confidence-policy validation despite `06b` timeout failures.

### Changes
- Upstream prerequisite backfill completed for `P003.1`:
  - `02.EXT.transcribe --manifest docs/pipeline/batches/P003.1.txt`
  - `03.EXT.align --manifest docs/pipeline/batches/P003.1.txt`
  - `04.EXT.diarize --manifest docs/pipeline/batches/P003.1.txt --device cpu`
    - required elevated execution to access Hugging Face model artifacts.
  - `05.EXT.audio-features --manifest docs/pipeline/batches/P003.1.txt` with `NUMBA_CACHE_DIR=/tmp/numba_cache`.
- Fallback deterministic lane (no `06b/06e/06g`):
  - `06c.DET.patch --allow-missing-verification --manifest docs/pipeline/batches/P003.1.txt --quarantine-file /tmp/P003.1.empty-quarantine.json`
  - `06d.DET.sanitize --manifest docs/pipeline/batches/P003.1.txt --quarantine-file /tmp/P003.1.empty-quarantine.json`
  - `06f.DET.damage-map --manifest docs/pipeline/batches/P003.1.txt --quarantine-file /tmp/P003.1.empty-quarantine.json`
  - `06h.DET.confidence-propagation --manifest docs/pipeline/batches/P003.1.txt --quarantine-file /tmp/P003.1.empty-quarantine.json`
- Strict trace verification:
  - `validate_confidence_trace.py --manifest docs/pipeline/batches/P003.1.txt --quarantine-file /tmp/P003.1.empty-quarantine.json --strict-missing --json`
- Scorecard capture:
  - `data/validation/runs/20260220.P003.1.I35.upstream-backfill-deterministic/scorecard.json`
- Validation path check (auto policy + explicit empty quarantine):
  - `sub-batch-pipeline P003.1 --validate --confidence-trace-mode auto --quarantine-file /tmp/P003.1.empty-quarantine.json`
  - confidence-trace validation passed; overall manifest validation failed on expected missing downstream `08/09` artifacts.

### Run Scope
- manifest: `P003.1`
- stages rerun: `02`, `03`, `04`, `05`, `06c`, `06d`, `06f`, `06h`, validation/scorecard
- run_id: `20260220.P003.1.I35.upstream-backfill-deterministic`

### Before vs After (Scorecard)
- missing_required_input_count: n/a -> `10` (effective scope shifted from stale-quarantine to explicit non-quarantined manifest scope)
- silent_pass_count: n/a -> `10`
- cross_stage_error_rate: n/a -> `1.0`
- stage07_validation_error_count: n/a -> `0`
- chunk_validation_error_count: n/a -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence (Promotion-Scope Trace Coverage)
- Strict confidence-trace validation PASS:
  - `manifest_videos=10`, `effective_videos=10`, `trace_files_processed=10`, `errors=0`.
- Scorecard confidence block confirms:
  - `trace_files_present=10`
  - `trace_files_expected=10`
  - `trace_coverage_ratio=1.0`
- `--validate` run under `confidence-trace-mode auto` reports confidence-trace PASS and expected downstream FAILs:
  - missing Stage `08` manifest report
  - missing Stage `09` chunks for all 10 videos

### Decision
- adjust
- rationale: promotion-scope confidence-trace objective is met for `P003.1`, but full promotion readiness remains blocked by unresolved `06b` LLM runtime and intentionally missing downstream stages.

### Next Hypothesis
Resolve `06b` runtime envelope (provider/model/runtime configuration) and then resume full `P003.1` pipeline (`06b` -> `07` -> `09`) to close promotion readiness and contract-health gaps.

## Iteration I37 - 2026-02-20

### Hypothesis
Removing runtime fallback branches and mode switches from the pipeline will improve gate clarity and prevent silent quality degradation.

### Changes
- Strict no-fallback enforcement in Stage `06b`:
  - removed auto-tier model routing and fallback model chain.
  - removed JSON-conversion/schema-repair retry fallbacks.
  - removed runtime mode flags (`--fallback-model`, `--prompt-profile`, `--max-transcript-segments`, `--allow-reject-verdicts`).
  - removed manifest root-flat discovery fallback.
- Strict no-fallback enforcement in Stage `06c`:
  - removed permissive bypass flags (`--allow-missing-verification`, `--allow-invalid-verification`, `--allow-reject`).
  - missing/invalid/reject verification now always hard-fails.
  - removed non-canonical verification lookup fallbacks.
- Strict exit behavior:
  - `06b` and `06c` now exit non-zero on any failed file (not only failure-rate thresholds).
- Canonical layout-only path resolution across pipeline stages:
  - removed source-flat/root-flat fallback lookup in `06.LLM.video-type`, `06d`, `06e`, `06f`, `06g`, `06h`, `07`.
  - removed root-flat fallback in `DET.split-manifest`.
- Strict no-fallback enforcement in quality/gating utilities:
  - `validate_cross_stage.py` now validates strict `06c -> 07` source-scoped pairs only (no 06 fallback, no root-flat fallback).
  - `validate_chunks.py` no longer derives `videoId` from filename when missing.
  - `pipeline_scorecard.py` no longer falls back from source-scoped stage report paths.
  - `quarantine_updater.py` now requires canonical `gate_decision` / `issue_severity` fields for blocking decisions.
- Orchestrator simplification to one confidence-trace mode:
  - `sub-batch-pipeline` removed `--strict-confidence-trace` and `--confidence-trace-mode`.
  - confidence trace policy is hardcoded strict-only.
  - `pipeline.config.json` set to `validation.confidence_trace.mode = "strict"`.

### Verification Evidence
- Python syntax check passed:
  - `python3 -m py_compile` on all modified Python pipeline/validation scripts.
- Shell syntax check passed:
  - `bash -n scripts/training-data/batch/sub-batch-pipeline`.
- Script-level flag scan confirmed removed fallback switches are no longer referenced under `scripts/`.
- Strict validation smoke:
  - `sub-batch-pipeline P002.9 --validate` exit `0` with strict confidence trace PASS (`10/10`) and unchanged expected warning profile.
  - `sub-batch-pipeline P003.1 --validate` exit `1` on expected missing Stage `08/09` artifacts; strict confidence trace PASS (`10/10`).
- Strict `06b` runtime probe (single `P003.1` file, short envelope):
  - `06b.LLM.verify --timeout-seconds 30 --llm-retries 1 --preflight-timeout-seconds 5 --preflight-retries 1`
  - result: hard fail at preflight (`timeout_after_5s`), with no alternate model/repair path.
- Strict `06c` manifest probe (`P003.1`, empty quarantine, `--overwrite`):
  - result: exits `1` after first strict missing-06b failures (no permissive continue path).

### Decision
- keep (in progress)
- rationale: strict path is now materially simpler and easier to reason about; next step is running strict-path manifests to identify newly surfaced hard failures.

### Next Hypothesis
Run `P002.9`/`P003.1` through strict path only (no legacy artifacts) to quantify which failures are true data-quality defects versus previously masked fallback behavior.

## Iteration I38 - 2026-02-20

### Hypothesis
If strict orchestration always overwrites stages `06`-`07` and validation quarantine emission preserves preexisting quarantines, then `P003.1` can run end-to-end without stale artifact mismatches or quarantine regression.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`: always pass `--overwrite` for stages `06`-`07` to eliminate stale downstream reuse.
- `scripts/training-data/batch/pipeline-runner`: same overwrite policy in per-video command builder for stages `06`-`07`.
- `scripts/training-data/validation/validate_manifest.py`: quarantine emission now merges/preserves preexisting quarantine entries instead of replacing them.
- `docs/plans/codex_improved_pipeline.md`: updated live progress and critical-facts handoff state for strict `P003.1` run.

### Run Scope
- manifest: `P003.1`
- stages rerun:
  - strict `06b` manifest run (`sonnet`) to refresh verification outputs
  - quarantine synthesis from `06b` REJECTs
  - strict `06c` probe without quarantine (expected fail) and with quarantine (expected pass)
  - strict pipeline rerun `06d -> 09` with quarantine
- run_id: `20260220.P003.1.I38.strict-overwrite-quarantine-merge`

### Before vs After (Scorecard)
- missing_required_input_count: `10` -> `0`
- silent_pass_count: `10` -> `0`
- cross_stage_error_rate: `1.0` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `06b` strict manifest run completed (`APPROVE=2`, `FLAG=6`, `REJECT=2`, `Failed=0`).
- `06c` strict behavior confirmed:
  - without quarantine: hard fail on REJECT verdicts.
  - with quarantine: PASS (`Processed=8`, `Skipped(quarantine)=2`, `Failed=0`).
- End-of-run `sub-batch-pipeline P003.1 --run --from 06d ...` now passes manifest validation:
  - `errors=0`, `warnings=10`, `cross-stage validated_pairs=8, errors=0`.
  - taxonomy Stage 08 status `PASS`.
  - quarantine output preserves `06b` REJECT video IDs (`HNnswkVaeEs`, `zNRFeTDJQ5c`).
- Scorecard artifact:
  - `data/validation/runs/20260220.P003.1.I38.strict-overwrite-quarantine-merge/scorecard.json`

### Decision
- keep
- rationale: strict path now runs to completion on `P003.1` with deterministic stage refresh and stable quarantine continuity.

### Next Hypothesis
Reduce warning-heavy review load by splitting warning semantics into actionable classes (ASR artifact vs harmless normalization drift) and tuning readiness policy budgets per warning type without weakening block semantics.

## Iteration I39 - 2026-02-20

### Hypothesis
If `transcript_artifact` warnings are removed from per-check block budgets, readiness will stop hard-blocking otherwise healthy videos while preserving error-level blocking behavior.

### Changes
- `scripts/training-data/batch/pipeline.config.json`: removed `transcript_artifact` from `validation.readiness.max_warning_checks_by_type`.
- Re-ran validation:
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Captured refreshed scorecard:
  - `data/validation/runs/20260220.P003.1.I39.warning-policy-rebalance/scorecard.json`

### Run Scope
- manifest: `P003.1`
- stages rerun: validation-only (`--validate`) + scorecard refresh
- run_id: `20260220.P003.1.I39.warning-policy-rebalance`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.1111` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Manifest validation remains PASS with unchanged error profile (`errors=0`, warnings-only).
- Stage report readiness shifted from hard-block to review posture:
  - before (`I38`): `READY=8`, `REVIEW=1`, `BLOCKED=1`
  - after (`I39`): `READY=8`, `REVIEW=2`, `BLOCKED=0`
- Review set now contains only transcript-artifact cases:
  - `0fXt-cwzDwc`
  - `71xUMBrQjnc`

### Decision
- keep
- rationale: removes over-penalization of transcript warnings without weakening error/contract gates.

### Next Hypothesis
Introduce explicit warning classes and policies in canonical gate output so review reasons are stable, interpretable, and comparable across manifests.

## Iteration I40 - 2026-02-20

### Hypothesis
If manifest-level Stage 08 FAIL summary is non-gating when per-video results exist, and global warning budget is less aggressive, then warning signals remain visible without batch-wide readiness collapse.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - changed `stage08_validation_fail_manifest` from `warning` to `info` when `video_results` are present.
- `scripts/training-data/batch/pipeline.config.json`:
  - raised `validation.readiness.max_warning_checks` from `3` to `10`.
  - removed per-check hard budget for `transcript_artifact`.
- Validation reruns:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecard snapshot:
  - `data/validation/runs/20260220.P002.9.I40.warning-policy-scope/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (policy sanity check)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I40.warning-policy-scope`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9` manifest validation now returns PASS instead of FAIL (`errors=0`).
- `P002.9` stage report readiness moved from blocked-heavy to scoped review:
  - before: `READY=0`, `REVIEW=7`, `BLOCKED=3`
  - after: `READY=6`, `REVIEW=4`, `BLOCKED=0`
- `P003.1` remains PASS with no readiness regressions:
  - `READY=8`, `REVIEW=2`, `BLOCKED=0`

### Decision
- keep
- rationale: preserves visibility of warnings while preventing non-local warning cascades from poisoning whole-manifest readiness.

### Next Hypothesis
Promote warning-policy semantics into explicit canonical signal classes (`repairable_asr`, `taxonomy_coverage`, `routing_mismatch`) so gating and remediation workflows can be automated by class.

## Iteration I41 - 2026-02-20

### Hypothesis
If canonical gate signals emit explicit `signal_class` and `remediation_lane`, review reasons become stable/machine-actionable without changing existing gate outcomes.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - added canonical signal classification (`signal_class`) and remediation routing (`remediation_lane`) derived from issue checks/codes.
  - emitted the new fields into canonical gate signal payloads.
  - emitted the new fields into quarantine reason payloads (including merged preexisting entries).
  - added `summary.signal_class_counts` to canonical gate artifact for aggregate diagnostics.
- `scripts/training-data/schemas/pipeline_signal.schema.json`:
  - documented `signal_class` and `remediation_lane` fields with controlled enums.
- Validation/scorecards:
  - `P003.1 --validate` (PASS)
  - `P002.9 --validate` (PASS)
  - scorecards:
    - `data/validation/runs/20260220.P003.1.I41.signal-class-canonicalization/scorecard.json`
    - `data/validation/runs/20260220.P002.9.I41.signal-class-canonicalization/scorecard.json`

### Run Scope
- manifest: `P003.1` (primary), `P002.9` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P003.1.I41.signal-class-canonicalization`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.1111` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P003.1` remained stable:
  - manifest validate PASS
  - readiness unchanged (`READY=8`, `REVIEW=2`, `BLOCKED=0`)
- `P002.9` remained stable:
  - manifest validate PASS
  - readiness unchanged (`READY=6`, `REVIEW=4`, `BLOCKED=0`)
- Canonical gate now includes classed signals:
  - example summary: `signal_class_counts={'transcript_quality': 10, 'artifact_contract': 2}` on `P003.1`.

### Decision
- keep
- rationale: improves interpretability/automation surface while preserving all measured contract, quality, and confidence metrics.

### Next Hypothesis
Use `signal_class` to drive policy-specific readiness budgets (per class, not per raw check), reducing config brittleness and terminology drift.

## Iteration I42 - 2026-02-20

### Hypothesis
If readiness policy supports warning-class budgets/blocks (not only raw check names), review/block behavior will stay stable as warning checks evolve and reason codes will be more interpretable.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - added warning-class mapping (`transcript_quality`, `routing_mismatch`, `taxonomy_coverage`, etc.).
  - added policy inputs: `--max-warning-class <class>=<n>` and `--block-warning-class <class>`.
  - added class-level counters to readiness output (`warning_classes`, `policy_warning_classes`).
  - readiness REVIEW reason now prefers dominant warning class.
  - policy escalation order now includes class-level blocks/budgets.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - config loader now reads `max_warning_checks_by_class` and `block_warning_classes`.
  - forwards those values to `validate_stage_report.py`.
- `scripts/training-data/batch/pipeline.config.json`:
  - added class-level policy defaults:
    - `max_warning_checks_by_class.transcript_quality = 12`
    - `max_warning_checks_by_class.routing_mismatch = 2`
- Validation/scorecards:
  - `P003.1 --validate` PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`; review reasons now class-based).
  - `P002.9 --validate` PASS (`READY=6`, `REVIEW=4`, `BLOCKED=0`; reasons `transcript_quality`/`routing_mismatch`).
  - scorecards:
    - `data/validation/runs/20260220.P003.1.I42.class-policy-budgets/scorecard.json`
    - `data/validation/runs/20260220.P002.9.I42.class-policy-budgets/scorecard.json`

### Run Scope
- manifest: `P003.1` (primary), `P002.9` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P003.1.I42.class-policy-budgets`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.1111` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Contract/quality metrics remained unchanged on both manifests.
- `P003.1` readiness reasons now stable class labels:
  - `REVIEW` videos reason=`transcript_quality`.
- `P002.9` readiness reasons now stable class labels:
  - `REVIEW` videos reasons in `{transcript_quality, routing_mismatch}`.

### Decision
- keep
- rationale: policy intent is now expressed at semantic class level with no metric regressions.

### Next Hypothesis
Apply class-aware readiness tuning per pipeline lane (infield vs talking_head) so transcript-heavy lanes can be reviewed without penalizing low-artifact lanes.

## Iteration I43 - 2026-02-20

### Hypothesis
If scorecards include canonical warning composition by signal class, class-level policy tuning can be measured without custom gate-file parsing.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - added `gating.signal_class_counts` derived from canonical gate `signals` scoped to non-quarantined manifest videos.
- Generated updated scorecards:
  - `data/validation/runs/20260220.P003.1.I43.scorecard-signal-classes/scorecard.json`
  - `data/validation/runs/20260220.P002.9.I43.scorecard-signal-classes/scorecard.json`
- `docs/plans/codex_improved_pipeline.md`:
  - updated live progress and current facts to include scorecard signal-class telemetry.

### Run Scope
- manifest: `P003.1` (primary), `P002.9` (baseline parity)
- stages rerun: scorecard-only
- run_id: `20260220.P003.1.I43.scorecard-signal-classes`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.1111` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- No contract/quality regression in scorecard core metrics.
- New telemetry now visible in scorecards:
  - `P003.1`: `signal_class_counts={'transcript_quality': 10}`
  - `P002.9`: `signal_class_counts={'taxonomy_coverage': 10, 'transcript_quality': 15, 'routing_mismatch': 1}`

### Decision
- keep
- rationale: adds measurable class-level observability with zero behavior change.

### Next Hypothesis
Tune class budgets per lane (infield vs talking_head) and measure resulting `signal_class_counts` + readiness transitions for controlled reduction of noisy REVIEW volume.

## Iteration I44 - 2026-02-20

### Hypothesis
If stage-report checks carry canonical class metadata, readiness can consume stable classes directly instead of inferring from raw check names.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - stage-report check emission now includes `signal_class` and `remediation_lane` when available.
- `scripts/training-data/schemas/stage_report.schema.json`:
  - checks schema extended with canonical fields (`signal_class`, `remediation_lane`).
- `scripts/training-data/validation/validate_stage_report.py`:
  - validator accepts/validates the new canonical check fields.
  - readiness warning classification prefers provided `signal_class` and falls back to heuristic mapping only when absent.
- Validation + scorecards:
  - `P003.1 --validate` PASS
  - `P002.9 --validate` PASS
  - scorecards:
    - `data/validation/runs/20260220.P003.1.I44.stage-report-class-carryover/scorecard.json`
    - `data/validation/runs/20260220.P002.9.I44.stage-report-class-carryover/scorecard.json`

### Run Scope
- manifest: `P003.1` (primary), `P002.9` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P003.1.I44.stage-report-class-carryover`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.1111` -> `0.1111`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Stage reports now contain canonical fields in checks, e.g.:
  - `{'check': 'stage07_validation_warnings', ..., 'signal_class': 'transcript_quality', 'remediation_lane': 'transcript_review'}`
- Readiness outcomes stayed stable:
  - `P003.1`: `READY=8`, `REVIEW=2`, `BLOCKED=0`
  - `P002.9`: `READY=6`, `REVIEW=4`, `BLOCKED=0`

### Decision
- keep
- rationale: canonical metadata now flows end-to-end into readiness with no quality/contract regressions.

### Next Hypothesis
Use lane-aware class budgets (infield vs talking_head) to lower noisy REVIEW rates while preserving transcript-artifact visibility.

## Iteration I45 - 2026-02-20

### Hypothesis
If readiness policy supports lane-aware review budgets by `video_type x warning_class`, transcript-heavy lanes can be reviewed more precisely without broad policy regressions.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - added `--review-warning-class-budget-by-video-type <video_type>:<class>=<max>`.
  - resolved per-video `video_type` from Stage 06/06c artifacts and applied lane-specific review budgets.
  - surfaced per-video `review_warning_class_excess` in readiness output.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - loaded `review_warning_class_budget_by_video_type` from config and forwarded policy args to readiness validation.
- `scripts/training-data/batch/pipeline.config.json`:
  - added lane policy: `infield.transcript_quality = 4`.
- Generated scorecards:
  - `data/validation/runs/20260220.P002.9.I45.lane-aware-review-budgets/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I45.lane-aware-review-budgets/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I45.lane-aware-review-budgets`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Scorecard core metrics remained unchanged (no contract/quality regression).
- Readiness (policy output) improved on `P002.9`:
  - before: `READY=6`, `REVIEW=4`, `BLOCKED=0`
  - after: `READY=7`, `REVIEW=3`, `BLOCKED=0`
- `P003.1` remained stable after policy addition:
  - `READY=8`, `REVIEW=2`, `BLOCKED=0`

### Decision
- keep
- rationale: lane-aware review budgets reduced noisy review volume on the target batch while preserving strict error/contract behavior.

### Next Hypothesis
Align scorecard gate counts with readiness policy outputs so `pass/review/block` reflects final ingest decisions instead of canonical warning rollups.

## Iteration I46 - 2026-02-20

### Hypothesis
If scorecards use readiness summary as the primary decision source, gating metrics will reflect final ingest policy while canonical gate remains available for taxonomy telemetry and drift diagnostics.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - made readiness summary the primary source for `pass/review/block` counts when available.
  - preserved canonical signal telemetry and added:
    - `gating.readiness_decision_counts`
    - `gating.canonical_decision_counts`
    - `gating.decision_mismatch_count`
    - `gating.decision_source`
- Generated scorecards:
  - `data/validation/runs/20260220.P002.9.I46.readiness-primary-scorecard/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I46.readiness-primary-scorecard/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard-only
- run_id: `20260220.P002.9.I46.readiness-primary-scorecard`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9` gating counts now reflect readiness policy:
  - before (`I45`): `pass/review/block = 0/9/0` (canonical-only view)
  - after (`I46`): `pass/review/block = 6/3/0` (readiness-primary view)
- `P003.1` gating counts now reflect readiness policy:
  - before (`I45`): `0/8/0`
  - after (`I46`): `6/2/0`
- Drift telemetry now exposed on both manifests:
  - `decision_mismatch_count = 6` (canonical warning rollup vs readiness policy decisions)

### Decision
- keep
- rationale: resolves decision-source ambiguity without changing contract/quality metrics and surfaces mismatch quantitatively for follow-up alignment.

### Next Hypothesis
Reduce canonical-vs-readiness decision mismatch by teaching canonical gate emission to consume readiness class budgets or by consolidating into one final gate authority.

## Iteration I47 - 2026-02-20

### Hypothesis
If canonical gates are emitted directly from stage-report readiness policy, canonical decisions and final ingest decisions will converge to a single gate authority.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - added canonical gate emission from readiness (`--emit-canonical-gate`, `--canonical-gate-out`).
  - emits `data/validation/gates/<manifest>.gate.json` by default when `--manifest` is provided.
  - maps readiness status/reason + warning classes into canonical `signals` with `signal_class` and `remediation_lane`.
  - includes canonical gate summary details in validator output payload.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - stage report validation step now always passes `--emit-canonical-gate` during `--validate`.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I47.readiness-gate-authority/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I47.readiness-gate-authority/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I47.readiness-gate-authority`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `validate_stage_report` now reports canonical gate emission after readiness:
  - `P002.9`: `pass=7`, `review=3`, `block=0`
  - `P003.1`: `pass=8`, `review=2`, `block=0`
- Scorecards confirm canonical/readiness convergence on effective scope:
  - `P002.9`: `canonical_decision_counts = readiness_decision_counts = {pass: 6, review: 3, block: 0}`
  - `P003.1`: `canonical_decision_counts = readiness_decision_counts = {pass: 6, review: 2, block: 0}`
- Decision drift resolved:
  - `decision_mismatch_count`: `6` -> `0` on both manifests.

### Decision
- keep
- rationale: establishes one gate authority path without quality/contract regressions and removes canonical/readiness ambiguity.

### Next Hypothesis
Trim duplicated warning signal inflation in stage-report canonical emission (class-signal multiplicity) while preserving class coverage and gating clarity.

## Iteration I48 - 2026-02-20

### Hypothesis
If stage-report canonical gate signals are compacted to one class signal per video (with count metadata), telemetry will be less noisy while gate decisions remain unchanged.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - compacted readiness-derived canonical signal emission:
    - removed per-warning-instance repeated class signals.
    - emit one class signal per `warning_class` with `legacy.count`.
    - suppress redundant `readiness_ok` primary signal for clean READY videos.
  - preserved canonical gate decision mapping and readiness authority behavior.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I48.stage-report-signal-compaction/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I48.stage-report-signal-compaction/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I48.stage-report-signal-compaction`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Gate outcomes stayed stable on effective scope:
  - `P002.9`: `pass/review/block = 6/3/0`
  - `P003.1`: `pass/review/block = 6/2/0`
- Canonical/readiness convergence preserved:
  - `decision_mismatch_count = 0` on both manifests.
- Signal telemetry noise reduced:
  - `P002.9`: `transcript_quality 28 -> 11`
  - `P003.1`: `transcript_quality 19 -> 10`

### Decision
- keep
- rationale: improves interpretability of class telemetry without affecting quality/contract metrics or gate decisions.

### Next Hypothesis
Unify canonical gate production to one code path (stage-report authority only) and stop manifest-stage canonical overwrite churn during validation runs.

## Iteration I49 - 2026-02-20

### Hypothesis
If manifest validation stops emitting canonical gates in the standard `sub-batch-pipeline --validate` path, canonical gate files will have one producer (stage-report readiness authority) with no behavior regression.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`:
  - removed `--emit-canonical-gate` from `validate_manifest.py` invocation.
  - retained stage-report canonical gate emission (`validate_stage_report.py --emit-canonical-gate`) as the sole writer in this flow.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I49.single-canonical-authority/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I49.single-canonical-authority/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I49.single-canonical-authority`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `manifest-validate` no longer logs canonical gate emission in this flow.
- `validate-stage-report` remains canonical writer:
  - `P002.9`: `pass=7`, `review=3`, `block=0`
  - `P003.1`: `pass=8`, `review=2`, `block=0`
- Effective-scope scorecards remained stable:
  - `P002.9`: `pass/review/block = 6/3/0`, `decision_mismatch_count=0`
  - `P003.1`: `pass/review/block = 6/2/0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: removes duplicate writer churn and preserves all quality/contract/gate metrics.

### Next Hypothesis
Codify this single-authority gate contract in docs/schema comments and remove now-obsolete canonical-gate language that still implies dual emitters.

## Iteration I50 - 2026-02-20

### Hypothesis
If the validation harness docs explicitly state the single canonical-gate authority and current readiness policy knobs, operator confusion and handoff ambiguity will drop.

### Changes
- `docs/pipeline/validation_harness.md`:
  - documented canonical gate authority (`validate_stage_report` as final gate writer in `--validate` flow).
  - updated readiness policy config example to current class/lane-aware settings.
  - clarified that validation mode is deterministic (no LLM calls) but does refresh validation artifacts.
  - expanded `validate_stage_report.py` flag docs with class/lane policy options and canonical gate emission.

### Run Scope
- manifest: `P002.9` / `P003.1` (no new execution; docs sync only)
- stages rerun: none
- run_id: n/a (docs-only)

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- No runtime/code-path changes in this iteration.
- Metrics and gate state remain as established in `I49`.

### Decision
- keep
- rationale: docs now match implemented behavior and reduce operational ambiguity for future agents.

### Next Hypothesis
Clean up remaining legacy references to dual canonical emitters in plan text and phase-status notes so project documentation reflects single-authority state consistently.

## Iteration I51 - 2026-02-20

### Hypothesis
If readiness policy terminology uses one plain term (`content_type`) instead of mixed `lane`/`video_type` wording, operator understanding improves without changing behavior.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - renamed readiness budget terminology from `video_type` to `content_type`.
  - renamed CLI flag to `--review-warning-class-budget-by-content-type`.
  - readiness summary now emits `content_type` field and policy key `review_warning_class_budget_by_content_type`.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - reads config key `review_warning_class_budget_by_content_type`.
  - forwards `--review-warning-class-budget-by-content-type` to stage-report validator.
- `scripts/training-data/batch/pipeline.config.json`:
  - renamed readiness policy key to `review_warning_class_budget_by_content_type`.
- `docs/pipeline/validation_harness.md`:
  - updated config/flag examples to `content_type` wording.
- `docs/plans/codex_improved_pipeline.md`:
  - added plain-language glossary and updated active wording.
- Validation + scorecards:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
  - `data/validation/runs/20260220.P002.9.I51.content-type-terminology/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I51.content-type-terminology/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I51.content-type-terminology`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9 --validate`: PASS (`READY=7`, `REVIEW=3`, `BLOCKED=0`).
- `P003.1 --validate`: PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`).
- Scorecards unchanged on quality/contract metrics and still show canonical/readiness convergence:
  - `decision_mismatch_count=0` on both manifests.

### Decision
- keep
- rationale: improves clarity and keeps the same strict behavior and metrics.

### Next Hypothesis
Apply the same plain-language cleanup to remaining user-facing docs and logs that still say `lane` where they really mean `content type`.

## Iteration I52 - 2026-02-20

### Hypothesis
If Stage 10 ingest CLI and logs use PASS/REVIEW terminology instead of lane wording, operator understanding improves without changing ingest behavior.

### Changes
- `scripts/training-data/10.EXT.ingest.ts`:
  - renamed CLI flag `--ingest-review-lane` -> `--include-review`.
  - updated help text to describe PASS vs REVIEW split explicitly.
  - renamed runtime boolean `ingestReviewLane` -> `includeReview`.
  - renamed metadata field `ingest_lane` -> `ingest_status`.
  - updated logs/messages from lane wording to status wording:
    - `Pass threshold`
    - `Include review chunks`
    - `Status split: pass=..., review=...`
  - retained `#review` source suffix behavior unchanged.
- Verified CLI help output:
  - `node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --help`
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I52.ingest-terminology-cleanup/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I52.ingest-terminology-cleanup/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh only (Stage 10 wording change does not affect Stage 06–09 artifacts)
- run_id: `20260220.P002.9.I52.ingest-terminology-cleanup`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Stage 10 help now reflects new flag/wording (`--include-review`, PASS/REVIEW split text).
- Pipeline scorecards unchanged on contract/gating/quality metrics:
  - `P002.9`: `pass/review/block = 6/3/0`, `decision_mismatch_count=0`
  - `P003.1`: `pass/review/block = 6/2/0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: user-facing terminology is clearer and behavior remains unchanged.

### Next Hypothesis
Apply the same plain-language cleanup to Stage 07 user-facing logs/flags (`routing lane`) so all major operator touchpoints use consistent terminology.

## Iteration I53 - 2026-02-20

### Hypothesis
If Stage 07 CLI/help/logs use `routing` wording instead of `routing lane`, operator-facing behavior becomes clearer without changing enrichment logic.

### Changes
- `scripts/training-data/07.LLM.content`:
  - renamed user-facing CLI flag `--force-lane` -> `--force-routing` (kept internal destination as `force_lane` to avoid logic churn).
  - updated help text to “routing mode”.
  - updated runtime logs from `Routing lane` / `lane=...` to `Routing` / `routing=...`.
  - updated nearby comments/docstrings to use “routing” terminology.
- Validation of script interface:
  - `./scripts/training-data/07.LLM.content --help` confirms new flag name.
- Scorecard refresh:
  - `data/validation/runs/20260220.P002.9.I53.stage07-routing-terminology/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I53.stage07-routing-terminology/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh only (Stage 07 terminology-only changes)
- run_id: `20260220.P002.9.I53.stage07-routing-terminology`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Stage 07 `--help` now shows `--force-routing {infield,non_infield}`.
- Scorecard metrics unchanged on both manifests:
  - `P002.9`: `pass/review/block = 6/3/0`, `decision_mismatch_count=0`
  - `P003.1`: `pass/review/block = 6/2/0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: user-facing wording is clearer and no quality/contract regression was introduced.

### Next Hypothesis
Sweep remaining plan/runbook text for outdated “lane” wording and tighten a short operator glossary so status words stay consistent (`content type`, `pass/review/block`, `signal class`).

## Iteration I54 - 2026-02-20

### Hypothesis
If the validation runbook has a compact glossary for the core terms, handoff friction decreases and terminology stays consistent across sessions.

### Changes
- `docs/pipeline/validation_harness.md`:
  - added a `Plain Terms` section with direct definitions for:
    - `content type`
    - `signal class`
    - `gate decision` (`pass/review/block`)
    - `canonical gate`
    - Stage 10 `ingest status`

### Run Scope
- manifest: `P002.9` / `P003.1` (no new execution; docs sync only)
- stages rerun: none
- run_id: n/a (docs-only)

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- No code-path or policy changes in this iteration.
- Runtime metrics remain as established in `I53`.

### Decision
- keep
- rationale: adds operational clarity with zero behavior change.

### Next Hypothesis
Collapse or archive remaining legacy “lane” phrasing in long-form plan sections that are not part of immutable history logs.

## Iteration I55 - 2026-02-20

### Hypothesis
Adding a conservative `talking_head` transcript-quality review budget will reduce noisy REVIEW outcomes while preserving quality gates and routing mismatch visibility.

### Changes
- `scripts/training-data/batch/pipeline.config.json`:
  - updated `validation.readiness.review_warning_class_budget_by_content_type`:
    - added `talking_head.transcript_quality = 1`
    - retained `infield.transcript_quality = 4`
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I55.content-type-budget-tuning/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I55.content-type-budget-tuning/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I55.content-type-budget-tuning`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9` readiness improved:
  - before: `READY=7`, `REVIEW=3`, `BLOCKED=0`
  - after: `READY=8`, `REVIEW=2`, `BLOCKED=0`
  - remaining REVIEW reasons: `{transcript_quality: 1, routing_mismatch: 1}`
- `P003.1` readiness improved:
  - before: `READY=8`, `REVIEW=2`, `BLOCKED=0`
  - after: `READY=9`, `REVIEW=1`, `BLOCKED=0`
  - remaining REVIEW reason: `{transcript_quality: 1}`
- Canonical/readiness convergence preserved:
  - `decision_mismatch_count = 0` on both manifests.

### Decision
- keep
- rationale: reduces noisy review volume while retaining strict contract/error controls and preserving routing mismatch visibility.

### Next Hypothesis
Add per-content-type budget for `routing_mismatch` (default `0`) and evaluate whether talking-head false-positive routing warnings can be reduced without allowing prompt-variant drift.

## Iteration I56 - 2026-02-20

### Hypothesis
If readiness-summary rows expose the applied content-type budget map, REVIEW/PASS outcomes become directly explainable without re-reading policy config.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - added `check_counts.content_type_review_budget` to per-video readiness output.
  - field contains the exact budget map applied for that video's `content_type`.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I56.readiness-budget-visibility/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I56.readiness-budget-visibility/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I56.readiness-budget-visibility`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9` readiness-summary REVIEW rows now show applied budget:
  - `V63ND9N6gvk`: `content_type=talking_head`, `content_type_review_budget={'transcript_quality': 1}`
  - `eCWdmkvNrO0`: `content_type=talking_head`, `content_type_review_budget={'transcript_quality': 1}`
- `P003.1` validation remains PASS with tuned readiness (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecard quality/contract metrics unchanged; `decision_mismatch_count=0` remains on both manifests.

### Decision
- keep
- rationale: improves interpretability without policy or quality regression.

### Next Hypothesis
Evaluate whether one `routing_mismatch` warning class should remain always REVIEW (current behavior) or receive content-type-specific treatment backed by false-positive analysis.

## Iteration I57 - 2026-02-20

### Hypothesis
Making `routing_mismatch` policy explicit per content type (`talking_head.routing_mismatch=0`) will improve operator clarity while preserving current quality behavior.

### Changes
- `scripts/training-data/batch/pipeline.config.json`:
  - added explicit budget entry:
    - `validation.readiness.review_warning_class_budget_by_content_type.talking_head.routing_mismatch = 0`
- `docs/pipeline/validation_harness.md`:
  - updated config example to include explicit `routing_mismatch: 0` for `talking_head`.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I57.routing-mismatch-policy-clarity/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I57.routing-mismatch-policy-clarity/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I57.routing-mismatch-policy-clarity`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- No readiness behavior change vs `I56`:
  - `P002.9`: `READY=8`, `REVIEW=2`, `BLOCKED=0`
  - `P003.1`: `READY=9`, `REVIEW=1`, `BLOCKED=0`
- Routing mismatch still preserved as REVIEW when present (`eCWdmkvNrO0` on `P002.9`).
- Scorecard metrics unchanged and `decision_mismatch_count=0` remains on both manifests.

### Decision
- keep
- rationale: policy is now explicit/documented without affecting measured quality behavior.

### Next Hypothesis
Add a short per-class policy table artifact (effective budgets by content type + observed counts) to make tuning decisions faster across sessions.

## Iteration I58 - 2026-02-20

### Hypothesis
If scorecards expose an explicit per-content-type policy table (budgets + observed warning counts + review counts), policy tuning will be faster and less error-prone across sessions.

### Changes
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - added `gating.review_budget_by_content_type`.
  - added `gating.warning_class_counts_by_content_type`.
  - added `gating.review_videos_by_content_type`.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I58.policy-table-scorecard/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I58.policy-table-scorecard/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh only
- run_id: `20260220.P002.9.I58.policy-table-scorecard`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Policy table now visible directly in scorecards:
  - `review_budget_by_content_type`
  - `warning_class_counts_by_content_type`
  - `review_videos_by_content_type`
- No quality/contract metric changes and `decision_mismatch_count=0` remains on both manifests.

### Decision
- keep
- rationale: improves policy observability without changing gate outcomes.

### Next Hypothesis
Removing remaining active-path fallback branches will reduce ambiguity and enforce a single strict execution path.

## Iteration I59 - 2026-02-20

### Hypothesis
If we remove remaining active-path fallbacks in Stage 07/10, manifest validation, and orchestrator confidence policy plumbing, pipeline behavior becomes stricter and easier to reason about without reducing measured quality.

### Changes
- `scripts/training-data/10.EXT.ingest.ts`:
  - removed Stage 08 legacy report-path fallback and legacy source-scope fallback.
  - removed chunk metadata alias fallbacks (`chunkConfidenceScore`, `chunkConfidence`, `damagedSegmentIds`, `containsRepairedText`).
- `scripts/training-data/validation/validate_manifest.py`:
  - removed Stage 08 legacy fallback path/scope branches.
  - Stage 08 missing `scope` is now error-level.
- `scripts/training-data/07.LLM.content`:
  - removed legacy array response parser path; enforce JSON-object response shape only.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - removed confidence-trace mode plumbing and resolver helper.
  - validation now logs and runs strict-only confidence-trace policy.
- `scripts/training-data/batch/pipeline.config.json`:
  - removed `validation.confidence_trace.mode`.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I59.strict-no-fallback-pass/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I59.strict-no-fallback-pass/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I59.strict-no-fallback-pass`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9 --validate`: PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`).
- `P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards remain stable with no contract regressions and `decision_mismatch_count=0` on both manifests.

### Decision
- keep
- rationale: strictness increased while quality/contract metrics stayed stable.

### Next Hypothesis
Renaming residual canonical `lane` terminology to plain terms will reduce operator confusion with no behavior change.

## Iteration I60 - 2026-02-20

### Hypothesis
If canonical signal payloads use `remediation_path` instead of `remediation_lane`, terminology becomes clearer without affecting gate decisions.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - renamed canonical check field handling to `remediation_path`.
  - renamed validation enum constant and error check label accordingly.
- `scripts/training-data/validation/validate_manifest.py`:
  - renamed canonical emission fields from `remediation_lane` to `remediation_path` for issues, quarantine reasons, stage checks, and canonical gate signals.
- Schemas:
  - `scripts/training-data/schemas/pipeline_signal.schema.json`: `remediation_path`.
  - `scripts/training-data/schemas/stage_report.schema.json`: `remediation_path`.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I60.remediation-path-rename/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I60.remediation-path-rename/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I60.remediation-path-rename`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9 --validate`: PASS.
- `P003.1 --validate`: PASS.
- Canonical/readiness decision alignment preserved (`decision_mismatch_count=0` on both).

### Decision
- keep
- rationale: clearer canonical terminology with zero observed behavior change.

### Next Hypothesis
Remove remaining orchestration-level policy branch controls so validation flow has one fixed decision path.

## Iteration I61 - 2026-02-20

### Hypothesis
If `allow_review_ingest` is removed from orchestration/config, the validation flow will have one fixed READY-only policy path with less operator ambiguity and no metric regressions.

### Changes
- `scripts/training-data/batch/sub-batch-pipeline`:
  - removed `allow_review_ingest` config handling and `--allow-review-ingest` forwarding.
- `scripts/training-data/batch/pipeline.config.json`:
  - removed `validation.readiness.allow_review_ingest`.
- `docs/pipeline/validation_harness.md`:
  - synced config examples and policy text to strict single-flow behavior.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I61.single-readiness-flow/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I61.single-readiness-flow/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I61.single-readiness-flow`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9 --validate`: PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`).
- `P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards unchanged on quality/contract metrics and still show `decision_mismatch_count=0`.

### Decision
- keep
- rationale: removed a policy branch control and kept stable outcomes.

### Next Hypothesis
Continue strictness cleanup by removing non-essential legacy/compatibility branches from early-stage scripts (`02-04`) and validation utilities, then re-measure drift on `P002.9` and `P003.1`.

## Iteration I62 - 2026-02-20

### Hypothesis
If `validate_stage_report.py` removes `--allow-review-ingest` / `--block-review-ingest`, readiness validation will be truly single-path READY-only end-to-end with no behavior regression.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - removed CLI flags `--allow-review-ingest` and `--block-review-ingest`.
  - removed internal mode branching; `allow_ingest_statuses` is now fixed to `READY`.
- Scorecards:
  - refreshed `P002.9` and `P003.1` I62 scorecards (stored under `data/validation/runs/`).

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `I62`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9 --validate`: PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`).
- `P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards unchanged on quality/contract metrics and `decision_mismatch_count=0` remains on both manifests.

### Decision
- keep
- rationale: removed last review-ingest mode switch from readiness validation without altering outcomes.

### Next Hypothesis
Continue strict cleanup by removing non-essential legacy compatibility branches in early acquisition stages (`02-04`) and helper validators, then re-measure any drift/regression on `P002.9` and `P003.1`.

## Iteration I63 - 2026-02-20

### Hypothesis
If early acquisition stages (`02/03/04`) remove `--prefer-audio` and legacy/raw fallback branches, upstream data contract clarity improves without affecting downstream validation metrics.

### Changes
- `scripts/training-data/02.EXT.transcribe`:
  - removed `--prefer-audio`.
  - `batch_for_source` no longer accepts audio preference.
  - audio selection is strict `*.audio.asr.raw16k.wav` only.
- `scripts/training-data/03.EXT.align`:
  - removed `--prefer-audio`.
  - `batch_for_source` no longer accepts audio preference.
  - audio selection is strict `*.audio.asr.clean16k.wav` only.
- `scripts/training-data/04.EXT.diarize`:
  - removed `--prefer-audio`.
  - `batch_for_source` no longer accepts audio preference.
  - audio selection is strict `*.audio.asr.clean16k.wav` only.
- Verification:
  - `python3 -m py_compile` for `02/03/04` scripts.
  - `--help` checks for `02/03/04` confirm `--prefer-audio` removed.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I63.early-stage-audio-strict/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I63.early-stage-audio-strict/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh + script compile/help checks
- run_id: `20260220.P002.9.I63.early-stage-audio-strict`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `02/03/04 --help` output no longer includes `--prefer-audio`.
- Downstream scorecards unchanged on quality/contract/gating metrics.

### Decision
- keep
- rationale: reduced upstream mode complexity and fallback behavior with no downstream regressions.

### Next Hypothesis
Tighten remaining legacy compatibility paths in validation utilities (`normalize_quality_signals.py`, `quarantine_updater.py`) so canonical payload fields are the only accepted control-plane schema.

## Iteration I64 - 2026-02-20

### Hypothesis
If Stage `07/09` validators emit canonical signal fields directly and `quarantine_updater.py` consumes canonical fields only, quarantine routing becomes unambiguous without changing gate outcomes.

### Changes
- `scripts/training-data/validation/validate_cross_stage.py`:
  - `ValidationResult.to_dict()` now emits canonical fields per issue:
    - `issue_code`, `issue_severity`, `gate_decision`, `scope_type`, `origin_stage`, `signal_class`, `remediation_path`.
- `scripts/training-data/validation/validate_chunks.py`:
  - `Issue.to_dict()` now emits the same canonical signal fields.
- `scripts/training-data/batch/quarantine_updater.py`:
  - `extract_from_cross_stage_or_chunks()` updated to canonical-only extraction for validator payload rows.
  - rows lacking canonical fields are ignored in this path.
- Verification:
  - `py_compile` pass for modified scripts.
  - direct pipe test confirms canonical cross-stage payload quarantines expected video (`CTfDIHi91uk`).
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I64.canonical-validator-signals/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I64.canonical-validator-signals/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I64.canonical-validator-signals`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `validate_cross_stage.py --json` now includes canonical fields in `results[]`.
- `quarantine_updater.py` canonical extraction test produced expected quarantine output from canonical payload.
- `P002.9` and `P003.1` full validation remain PASS with unchanged readiness and contract metrics.

### Decision
- keep
- rationale: canonical control-plane semantics are now explicit in stage validators with no metric regression.

### Next Hypothesis
Remove remaining non-essential legacy labeling in validation utilities (e.g., legacy wrappers/notes) where they do not serve compatibility-critical audit traces.

## Iteration I65 - 2026-02-20

### Hypothesis
If `normalize_quality_signals.py` is canonical-only (no legacy severity/verdict fallback mapping), control-plane normalization semantics become stricter and less ambiguous without affecting pipeline quality metrics.

### Changes
- `scripts/training-data/validation/normalize_quality_signals.py`:
  - updated to canonical-first normalization behavior.
  - removed legacy fallback mapping from `severity`/`verdict`/`status` fields.
  - rows without canonical `issue_code` are ignored.
  - removed `legacy` passthrough field from normalized signal output.
  - updated CLI description/documentation strings to canonical wording.
- Verification:
  - `py_compile` pass.
  - smoke test: `validate_cross_stage --json | normalize_quality_signals.py` now produces canonical-only normalized signals.
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I65.canonical-normalizer-strict/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I65.canonical-normalizer-strict/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh + normalization smoke check
- run_id: `20260220.P002.9.I65.canonical-normalizer-strict`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- normalization smoke output from current canonical cross-stage payload produced expected signal counts (`block=1`, `review=11`) without legacy fallbacks.
- scorecards unchanged on quality/contract/gating metrics.

### Decision
- keep
- rationale: normalization utility is now aligned with canonical control-plane semantics and introduces no regressions.

### Next Hypothesis
Continue strict cleanup by removing remaining compatibility-only naming/trace fields in non-critical utility scripts where canonical data is already guaranteed.

## Iteration I66 - 2026-02-20

### Hypothesis
If we remove two remaining runtime compatibility fallbacks (`07` dropped-candidate `reason` alias and pipeline-runner `06b` root-flat verdict lookup), runtime behavior will become stricter without changing measured pipeline quality.

### Changes
- `scripts/training-data/07.LLM.content`:
  - dropped-candidate contract check now accepts `reason_code` only.
  - removed legacy fallback to `reason`.
- `scripts/training-data/batch/pipeline-runner`:
  - `check_06b_verdict()` now uses source-scoped `data/06b.LLM.verify/<source>/` only.
  - removed root-flat fallback lookup for reject verdict checks.
- Validation runs:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Scorecards:
  - `data/validation/runs/20260220.P002.9.I66.remove-runtime-legacy-fallbacks/scorecard.json`
  - `data/validation/runs/20260220.P003.1.I66.remove-runtime-legacy-fallbacks/scorecard.json`

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260220.P002.9.I66.remove-runtime-legacy-fallbacks`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `P002.9` and `P003.1` validation remain PASS with unchanged readiness outcomes.
- scorecards unchanged on quality/contract metrics and `decision_mismatch_count=0` remains on both manifests.

### Decision
- keep
- rationale: strictness increased in runtime code paths with no observed regression.

### Next Hypothesis
Continue pruning compatibility-only branches in non-runtime helper code while preserving audit traceability and canonical gate behavior.

## Iteration I67 - 2026-02-21

### Hypothesis
If readiness policy adds content-type class blocking controls and canonical gate schema requires explicit `decision_source`, policy tuning and gate-source interpretation will become clearer without changing current quality outcomes.

### Changes
- `scripts/training-data/validation/validate_stage_report.py`:
  - added `--block-warning-class-by-content-type <content_type>:<class>` policy control.
  - readiness now supports content-type class hard blocks via reason code `policy_block_warning_class_by_content_type:<content_type>:<class>`.
  - readiness output now includes `check_counts.content_type_block_warning_classes`.
  - readiness policy payload now includes `block_warning_class_by_content_type`.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - added config loading + flag forwarding for `block_warning_class_by_content_type`.
- `scripts/training-data/batch/pipeline.config.json`:
  - added `validation.readiness.block_warning_class_by_content_type` (default `{}`).
- `scripts/training-data/schemas/pipeline_gate.schema.json`:
  - canonical gate summary now requires `decision_source` with enum:
    - `stage_report_readiness`
    - `manifest_validation`
  - schema description updated to note standard orchestration source.
- `scripts/training-data/validation/validate_manifest.py`:
  - canonical gate summary now emits `decision_source=manifest_validation` for standalone/manual canonical gate emission mode.
- `scripts/training-data/validation/pipeline_scorecard.py`:
  - now records `gating.canonical_decision_source` from canonical gate summary when present.
- Docs updates:
  - `docs/pipeline/validation_harness.md`
  - `docs/pipeline/ASCII`
  - `docs/plans/codex_improved_pipeline.md`
  - aligned wording to single canonical gate authority in standard orchestration and documented new policy knob.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260221.P002.9.I67.content-type-class-block-policy`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`: PASS (`READY=8`, `REVIEW=2`, `BLOCKED=0`).
- `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I67.content-type-class-block-policy/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I67.content-type-class-block-policy/scorecard.json`
- Canonical gate summaries now carry explicit source markers and scorecards expose:
  - `gating.canonical_decision_source=stage_report_readiness`
- Policy probe (no config change, CLI-only):
  - `validate_stage_report.py --block-warning-class-by-content-type talking_head:routing_mismatch` on `P002.9`
  - produced deterministic block reason `policy_block_warning_class_by_content_type:talking_head:routing_mismatch` for `eCWdmkvNrO0`.

### Decision
- keep
- rationale: policy and gate-source semantics are clearer and configurable with no observed regression.

### Next Hypothesis
Apply targeted content-type class block settings (for example stricter `routing_mismatch` treatment) on `P002.9` and evaluate readiness impact before promotion policy updates.

## Iteration I68 - 2026-02-21

### Hypothesis
If `talking_head:routing_mismatch` is enabled as an active class-block policy in orchestration config, routing mismatches move from REVIEW to BLOCKED deterministically without regressing core quality/contract metrics.

### Changes
- `scripts/training-data/batch/pipeline.config.json`:
  - enabled `validation.readiness.block_warning_class_by_content_type` with:
    - `talking_head: ["routing_mismatch"]`
- `docs/pipeline/validation_harness.md`:
  - updated config example and policy notes to reflect active `talking_head.routing_mismatch` block behavior.
- `docs/plans/codex_improved_pipeline.md`:
  - updated live progress log, handoff facts, phase tracker notes, and next actions for `I68`.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260221.P002.9.I68.block-routing-mismatch-talking-head`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`: PASS (`READY=8`, `REVIEW=1`, `BLOCKED=1`).
  - blocked video reason: `policy_block_warning_class_by_content_type:talking_head:routing_mismatch` (`eCWdmkvNrO0`).
- `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I68.block-routing-mismatch-talking-head/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I68.block-routing-mismatch-talking-head/scorecard.json`
- Decision parity remains stable (`decision_mismatch_count=0`) and canonical source marker remains `stage_report_readiness`.

### Decision
- keep
- rationale: policy behaves as intended, tightens routing mismatch handling for talking-head content, and preserves quality/contract stability.

### Next Hypothesis
Define and test explicit ingest/operator handling for pass/review/block semantics in Stage 10 docs and decide whether additional content types should adopt class-level hard blocks.

## Iteration I69 - 2026-02-21

### Hypothesis
If Stage 10/operator docs explicitly map readiness statuses to pass/review/block ingest semantics, operator execution becomes less ambiguous without changing pipeline quality outcomes.

### Changes
- `scripts/training-data/10.EXT.ingest.ts`:
  - clarified default readiness gate mapping in top-level notes and CLI help text:
    - `READY -> pass -> ingest-eligible`
    - `REVIEW -> review -> excluded by default readiness gate`
    - `BLOCKED -> block -> excluded`
- `docs/pipeline/validation_harness.md`:
  - added explicit readiness-to-ingest mapping section.
  - clarified canonical gate alignment (`decision_source=stage_report_readiness`) and gate bypass caveat (`--skip-readiness-gate`).
- `docs/plans/codex_improved_pipeline.md`:
  - updated live progress and backlog notes for ingest mapping completion.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh (read-only)
- run_id: `20260221.P002.9.I69.ingest-mapping-docs`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I69.ingest-mapping-docs/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I69.ingest-mapping-docs/scorecard.json`
- Gating and contract metrics unchanged vs `I68`:
  - `P002.9`: `pass=7`, `review=1`, `block=1`, `decision_mismatch_count=0`
  - `P003.1`: `pass=7`, `review=1`, `block=0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: improved operator clarity with zero pipeline metric impact.

### Next Hypothesis
Evaluate whether `podcast.routing_mismatch` should be added to content-type class-block policy, then measure readiness drift on `P002.9`/`P003.1`.

## Iteration I70 - 2026-02-21

### Hypothesis
If `podcast:routing_mismatch` is added to content-type class-block policy, routing prompt mismatches in podcast content will be prevented by default without regressing current quality/contract metrics.

### Changes
- `scripts/training-data/batch/pipeline.config.json`:
  - added `podcast: ["routing_mismatch"]` under `validation.readiness.block_warning_class_by_content_type`.
- `docs/pipeline/validation_harness.md`:
  - updated config example and active-policy note to include podcast routing mismatch blocking.
- `docs/plans/codex_improved_pipeline.md`:
  - updated live progress, handoff facts, phase tracker, and next actions for I70 status.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + scorecard refresh
- run_id: `20260221.P002.9.I70.block-routing-mismatch-podcast`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Probe before config change:
  - direct `validate_stage_report.py` A/B test with vs without `--block-warning-class-by-content-type podcast:routing_mismatch` on `P003.1` produced identical readiness (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Full orchestrator validation after config update:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`: PASS (`READY=8`, `REVIEW=1`, `BLOCKED=1`).
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`: PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`).
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I70.block-routing-mismatch-podcast/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I70.block-routing-mismatch-podcast/scorecard.json`
- Gate parity remains stable: `decision_mismatch_count=0` on both manifests.

### Decision
- keep
- rationale: policy broadening is active with no measured regressions and maintains deterministic strictness for routing mismatches.

### Next Hypothesis
Proceed to Phase 4 by drafting Stage `07b` enrichment verification contract/schema and defining fail/waive semantics for post-07 quality assurance.

## Iteration I71 - 2026-02-21

### Hypothesis
If we define Stage `07b` contract and schema before runtime wiring, implementation risk drops because fail/review/waive semantics and artifact shape are explicit and testable upfront.

### Changes
- Added Stage `07b` schema draft:
  - `scripts/training-data/schemas/07b.enrichment-verify.schema.json`
- Added Stage `07b` design contract doc:
  - `docs/pipeline/stage07b_enrichment_verification.md`
  - defines scope, inputs/outputs, proposed checks, fail/waive semantics, and canonical rollout plan.
- Updated stage map:
  - `docs/pipeline/ASCII` now shows proposed `07b` quality gate between `07` and `08`.
- Updated plan tracking:
  - `docs/plans/codex_improved_pipeline.md` marks Phase 4 as in progress (`I71`) with design-spike completion.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh (read-only)
- run_id: `20260221.P002.9.I71.stage07b-design-spike`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Schema JSON parses cleanly (`python3 -m json.tool`).
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I71.stage07b-design-spike/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I71.stage07b-design-spike/scorecard.json`
- No drift in gating/contract metrics from `I70`.

### Decision
- keep
- rationale: design spike adds implementation-ready contract clarity without changing runtime behavior.

### Next Hypothesis
Implement a `07b` prototype script and orchestration path, then run first `P002.9` A/B (`with` vs `without` `07b`) to measure quality lift.

## Iteration I72 - 2026-02-21

### Hypothesis
Removing LLM-bypass runtime paths (preflight skip + no-Claude Stage 07 revalidation path) will enforce strict LLM execution without regressing current readiness/quality metrics.

### Changes
- `scripts/training-data/06.LLM.video-type`:
  - removed `--skip-llm-preflight`; Stage 06 now always runs Claude preflight for non-dry-run execution.
- `scripts/training-data/06b.LLM.verify`:
  - removed `--skip-llm-preflight`; Stage 06b now always runs Claude preflight for non-dry-run execution.
- `scripts/training-data/07.LLM.content`:
  - removed `--skip-llm-preflight`.
  - removed CLI/runtime no-Claude revalidation path (`--revalidate` and associated execution branch).
  - Stage 07 now always runs Claude preflight for non-dry-run execution.
- `scripts/training-data/batch/pipeline-runner`:
  - removed Stage 07 command injection of `--skip-llm-preflight`.
- Documentation hardening:
  - `docs/plans/codex_improved_pipeline.md`
  - `docs/pipeline/validation_harness.md`
  - `docs/pipeline/stage07b_enrichment_verification.md`
  - added explicit LLM-first rule: no deterministic/heuristic/fallback branches to bypass required LLM calls.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + dry-run orchestration command checks + scorecard refresh
- run_id: `20260221.P002.9.I72.remove-llm-bypass`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Syntax/CLI checks:
  - `python3 -m py_compile scripts/training-data/06.LLM.video-type scripts/training-data/06b.LLM.verify scripts/training-data/07.LLM.content scripts/training-data/batch/pipeline-runner` (PASS)
  - `--help` scans confirm `--skip-llm-preflight` and `--revalidate` are removed from Stage `06/06b/07` CLIs.
- Orchestrator dry-run checks:
  - `pipeline-runner P002.9 --dry-run --from 07 --parallel 1` no longer emits `--skip-llm-preflight` in Stage 07 commands.
  - `sub-batch-pipeline P002.9 --run --from 07 --parallel 1 --dry-run` same result through delegated runner path.
- Validation PASS:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate` (`READY=8`, `REVIEW=1`, `BLOCKED=1`)
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate` (`READY=9`, `REVIEW=1`, `BLOCKED=0`)
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I72.remove-llm-bypass/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I72.remove-llm-bypass/scorecard.json`

### Decision
- keep
- rationale: strict LLM execution is now enforced for Stage `06/06b/07` runtime paths with no observed quality/contract regressions.

### Next Hypothesis
Implement Stage `07b` as LLM-only QA (no deterministic shortcut path), then run `P002.9` A/B evidence capture.

## Iteration I73 - 2026-02-21

### Hypothesis
If active pipeline docs enforce a single canonical flow rule (no stage-flow branch controls), execution intent becomes clearer and less error-prone without changing current quality metrics.

### Changes
- `docs/plans/codex_improved_pipeline.md`:
  - added `Single-Path Rule (Mandatory)`.
  - removed active branch-control wording for stage-flow decisions.
  - updated Phase 4/next-actions language to canonical-flow integration wording.
- `docs/pipeline/validation_harness.md`:
  - added explicit `Canonical Flow Rule` section.
- `docs/pipeline/stage07b_enrichment_verification.md`:
  - removed runtime branch rollout language and replaced with canonical adopt-or-reject path.
- `docs/pipeline/ASCII`:
  - updated `07b` labeling from branch wording to canonical QA gate wording.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: scorecard refresh (read-only)
- run_id: `20260221.P002.9.I73.single-path-rule`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I73.single-path-rule/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I73.single-path-rule/scorecard.json`
- No gating/contract drift vs `I72`:
  - `P002.9`: `pass=7`, `review=1`, `block=1`, `decision_mismatch_count=0`
  - `P003.1`: `pass=7`, `review=1`, `block=0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: canonical fixed-flow policy is now explicit in active docs with no metric impact.

### Next Hypothesis
Implement `07b` in a canonical orchestration path and evaluate quality impact before adoption.

## Iteration I74 - 2026-02-21

### Hypothesis
If orchestration-level threshold override flags are removed and pipeline docs enforce fixed-flow wording everywhere, execution clarity improves with no gating/quality regression.

### Changes
- `scripts/training-data/batch/pipeline-runner`:
  - removed CLI flags `--confidence-band-high-threshold`, `--confidence-band-medium-threshold`, `--min-chunk-confidence`.
  - removed Stage `06h/09` command wiring for those override parameters.
- `scripts/training-data/batch/sub-batch-pipeline`:
  - removed the same threshold flags from help, parser, and runner forwarding.
  - removed now-unused threshold parsing helper `require_probability_01`.
- Pipeline docs cleanup (fixed-flow wording):
  - `docs/plans/codex_improved_pipeline.md`
  - `docs/pipeline/validation_harness.md`
  - `docs/pipeline/stage07b_enrichment_verification.md`
  - removed remaining active stage-flow branch phrasing and aligned wording to one fixed canonical path.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages rerun: validation-only + dry-run CLI checks + scorecard refresh
- run_id: `20260221.P002.9.I74.single-path-remove-overrides`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476`
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Syntax/CLI checks:
  - `python3 -m py_compile scripts/training-data/batch/pipeline-runner` (PASS)
  - `bash -n scripts/training-data/batch/sub-batch-pipeline` (PASS)
  - `--help` scan on both orchestrators confirms removed threshold flags are absent.
- Dry-run orchestration checks:
  - `pipeline-runner P002.9 --dry-run --from 07 --parallel 1` shows no removed override flags.
  - `sub-batch-pipeline P002.9 --run --from 07 --parallel 1 --dry-run` shows no removed override flags.
- Validation PASS:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate` (`READY=8`, `REVIEW=1`, `BLOCKED=1`)
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate` (`READY=9`, `REVIEW=1`, `BLOCKED=0`)
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I74.single-path-remove-overrides/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I74.single-path-remove-overrides/scorecard.json`
- No gating drift vs `I73`:
  - `P002.9`: `pass=7`, `review=1`, `block=1`, `decision_mismatch_count=0`
  - `P003.1`: `pass=7`, `review=1`, `block=0`, `decision_mismatch_count=0`

### Decision
- keep
- rationale: orchestration path is now simpler/fixed, and measured quality/gating metrics remain stable.

### Next Hypothesis
Implement `07b` in the canonical orchestration path and measure quality impact before adoption.

## Iteration I75 - 2026-02-21

### Hypothesis
If Stage `07b` is integrated as a fixed canonical gate (`07 -> 07b -> 08 -> 09`) with strict LLM-first behavior, enrichment quality gating will become explicit and machine-readable without introducing stage-flow branch controls.

### Changes
- Added `scripts/training-data/07b.LLM.enrichment-verify` (new canonical LLM stage).
- Added `scripts/training-data/prompts/07b.enrichment-verify.prompt.md`.
- Added `scripts/training-data/validation/validate_stage07b.py` and wired stage-local quarantine extraction.
- Updated orchestrators (`pipeline-runner`, `sub-batch-pipeline`) to route canonical flow through `07b`.
- Updated validation coverage (`validate_stage_contract.py`, `validate_manifest.py`, `pipeline_scorecard.py`) for required `07b` artifacts.
- Updated active pipeline docs to mark `07b` as implemented canonical path.

### Run Scope
- manifest: `P002.9` (primary), `P003.1` (sanity)
- stages exercised: dry-run orchestration + validation-path wiring checks
- run_id: `20260221.P002.9.I75.stage07b-canonical-integration`

### Validation Evidence
- CLI/syntax checks PASS for new scripts and orchestrators.
- Dry-run checks show canonical route `07 -> 07b -> 08 -> 09` in both runners.
- Real `07b` execution is currently blocked by Claude runtime preflight timeouts in this environment (non-dry-run).

### Decision
- keep
- rationale: canonical `07b` wiring is complete and strict-path compatible; quality-lift evidence capture is pending runtime availability.

### Next Hypothesis
Remove remaining runtime bypass flags from active gate/applicability paths so production execution remains fixed-path end-to-end.

## Iteration I76 - 2026-02-21

### Hypothesis
If ingest and applicability gate-skip overrides are removed from active scripts/docs, pipeline behavior becomes simpler and less ambiguous: gate/applicability policy is enforced by default logic every run.

### Changes
- `scripts/training-data/10.EXT.ingest.ts`:
  - removed `--skip-taxonomy-gate` and `--skip-readiness-gate` CLI/runtime paths.
  - manifest-mode taxonomy/readiness gates are now always enforced.
  - updated help/examples and gate messaging to fixed-path wording.
- `scripts/training-data/06g.LLM.damage-adjudicator`:
  - removed `--skip-video-type-filter` runtime override.
  - non-infield skip is now strict stage applicability logic.
- Docs updated to match:
  - `docs/pipeline/validation_harness.md`
  - `docs/pipeline/ASCII`
  - `docs/pipeline/audits/pipeline_validation_runbook.md`

### Run Scope
- scope: CLI contract + syntax checks (no data rewrite required)
- run_id: `20260221.P002.9.I76.remove-gate-skip-bypasses`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/06g.LLM.damage-adjudicator` PASS.
- `node ... 10.EXT.ingest.ts --help` no longer lists skip-gate flags.
- `node ... 10.EXT.ingest.ts --skip-readiness-gate` now fails: `Unknown option`.
- `node ... 10.EXT.ingest.ts --skip-taxonomy-gate` now fails: `Unknown option`.
- `06g.LLM.damage-adjudicator --help` no longer lists `--skip-video-type-filter`.

### Decision
- keep
- rationale: active runtime now has fewer branch controls and enforces fixed gate/applicability policy by default.

### Next Hypothesis
Once Claude runtime health is restored, run real `P002.9`/`P003.1` `07 -> 07b -> 09` executions and capture scorecard + semantic evidence for `07b` quality impact.

## Iteration I77 - 2026-02-21

### Hypothesis
If validation quarantine emission excludes contract-only missing/invalid artifact issues and avoids self-reinforcing carry-forward from the same quarantine file, rerun recovery will stay possible after schema/stage contract changes.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - added `_is_contract_only_issue()` helper to classify missing/invalid artifact contract checks.
  - excluded contract-only issues from persisted quarantine emission.
  - filtered contract-only reasons/checks while loading existing quarantine entries.
  - added self-merge guard: when `--quarantine-file` and quarantine output path resolve to the same file, do not force-add `preexisting_quarantine` entries.
  - pruned self-merge persistence of `preexisting_quarantine` reasons/checks.

### Run Scope
- manifest: `P002.9`
- stages rerun: validation-only + orchestration dry-run
- run_id: `20260221.P002.9.I77.quarantine-self-merge-deadlock-fix`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/validation/validate_manifest.py` PASS.
- `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`:
  - quarantine output reduced from all-manifest deadlock state to `videos=1` (`CTfDIHi91uk`),
  - missing `07b` artifacts remain visible as INFO under applied quarantine input and no longer persist as new quarantine membership.
- `./scripts/training-data/batch/pipeline-runner P002.9 --dry-run --from 07 --parallel 1`:
  - effective scope recovered to `9/10` (no longer `0/10`),
  - canonical route remains `07 -> 07b -> 08 -> 09`.

### Decision
- keep
- rationale: validation remains strict while recovery runs are no longer blocked by persistent contract-only quarantine expansion.

### Next Hypothesis
With deadlock fixed, run real `07 -> 07b -> 09` candidate executions once Claude runtime preflight is healthy, then capture scorecard + semantic evidence for `07b` quality impact.

## Iteration I78 - 2026-02-21

### Hypothesis
If Claude-required LLM stages are executed outside sandbox restrictions in this environment, runtime false timeouts/hangs are removed and canonical `07b` evidence can be generated on real manifests.

### Changes
- Documentation hardening:
  - `docs/plans/codex_improved_pipeline.md`: added explicit host-execution rule for Claude CLI in LLM-first section.
  - `docs/pipeline/validation_harness.md`: added operator note that required LLM stages should run outside sandbox restrictions in this environment.
- Runtime execution:
  - outside-sandbox Claude probe: `claude -p "Respond exactly: ok" --output-format text --model sonnet`.
  - executed Stage `07b` outside sandbox for:
    - `P002.9`
    - `P003.1`

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages rerun: `07b` generation + validation
- run_id: `20260221.P002.9.I78.outside-sandbox-claude-07b`

### Validation Evidence
- Outside-sandbox Claude health probe returned `ok`.
- `07b` run results:
  - `P002.9`: processed manifest sources successfully with no runtime failures; emitted `07b` artifacts for effective scope videos.
  - `P003.1`: processed 8 effective videos successfully with no runtime failures.
- Post-run validation:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate` PASS (`READY=8`, `REVIEW=1`, `BLOCKED=1`), with `missing_stage07b` reduced to quarantined-only scope.
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate` PASS (`READY=9`, `REVIEW=1`, `BLOCKED=0`), with `missing_stage07b` confined to pre-quarantined videos.
- Direct `07b` validator snapshots show strong block pressure:
  - `P002.9`: 9 `stage07b_gate_block`, 1 `stage07b_gate_review` issue rows.
  - `P003.1`: 10 `stage07b_gate_block` issue rows.

### Decision
- keep
- rationale: runtime unblock is confirmed and canonical `07b` generation is operational outside sandbox; quality findings are now data-driven and actionable.

### Next Hypothesis
Use the new `07b` block reasons to drive targeted Stage `07` evidence-alignment fixes, then re-run `07 -> 07b` and compare block/review rates on `P002.9` before promotion.

## Iteration I79 - 2026-02-21

### Hypothesis
If Stage `07` emits canonical `evidence_segment_ids` upstream for every enrichment type, Stage `07b` receives stable segment support context and evidence-related false blocks decrease.

### Changes
- `scripts/training-data/07.LLM.content`:
  - added upstream evidence-ID assignment pass (`assign_evidence_segment_ids`) for `approach`, `commentary`, and `talking_head_section` enrichments.
  - approach fallback now uses conversation span when explicit anchors are absent.
  - added validation warnings for missing/invalid/empty `evidence_segment_ids`.
  - updated prompt contracts/examples to require `evidence_segment_ids`.
  - bumped versions (`PROMPT_VERSION=1.9.0`, `PIPELINE_VERSION=07.LLM.content-v1.16`).
- `scripts/training-data/07b.LLM.enrichment-verify`:
  - hook segment compaction now accepts both `hook_point.segment_id` and `hook_point.segment`.
- `docs/pipeline/stage07b_enrichment_verification.md`:
  - documented Stage `07` upstream contract expectation for `evidence_segment_ids`.
- `docs/plans/codex_improved_pipeline.md`:
  - logged progress row `I79`.

### Run Scope
- manifest: targeted artifact checks (no full manifest rerun yet)
- stages rerun: none (code + contract smoke checks only)
- run_id: `20260221.I79.stage07-evidence-contract-upstream`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/07.LLM.content scripts/training-data/07b.LLM.enrichment-verify` PASS.
- Local contract smoke (function-level) on existing Stage `07` artifacts:
  - talking-head sample `sDdJ1Fi6iXY`: `repairs=5`, `with_evidence=5/5`.
  - infield sample `H3_8iPikhDw`: `repairs=3`, `with_evidence=3/3` after conversation-span fallback.

### Decision
- keep
- rationale: upstream contract gap is closed in Stage `07` write path and verified on representative infield/talking-head artifacts without introducing LLM bypass behavior.

### Next Hypothesis
Re-run full `07 -> 07b` on `P002.9` and measure whether `07b` block/review mix improves for evidence-related issues.

## Iteration I80 - 2026-02-21

### Hypothesis
If Stage `07` is fully regenerated with upstream `evidence_segment_ids` and Stage `07b` is rerun on canonical manifests, evidence-driven false blocks should collapse from `block` to `review` without contract regressions.

### Changes
- Runtime executions (outside sandbox):
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --stage 07`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --stage 07b`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --stage 07`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --stage 07b`
- Validation/scorecards:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
  - refreshed scorecards:
    - `data/validation/runs/20260221.P002.9.I79.stage07-upstream-evidence-rerun/scorecard.json`
    - `data/validation/runs/20260221.P003.1.I79.stage07-upstream-evidence-rerun/scorecard.json`

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages rerun: `07`, `07b`, validation
- run_id: `20260221.I80.stage07-stage07b-rerun-after-evidence-fix`

### Before vs After (Scorecard)
- missing_required_input_count: `0` -> `0`
- silent_pass_count: `0` -> `0`
- cross_stage_error_rate: `0.0476` -> `0.0476` (`P002.9`)
- stage07_validation_error_count: `0` -> `0`
- chunk_validation_error_count: `0` -> `0`
- semantic_judge.mean_overall_score: n/a -> n/a
- semantic_judge.major_error_rate: n/a -> n/a
- semantic_judge.hallucination_rate: n/a -> n/a

### Validation Evidence
- Stage `07b` gate mix after rerun:
  - `P002.9` effective scope (`9`): `pass=0`, `review=9`, `block=0`, `missing=0`.
  - `P003.1` effective scope (`8`): `pass=0`, `review=8`, `block=0`, `missing=0`.
- Prior baseline for comparison (`I78`):
  - `P002.9`: `9 block`, `1 review`.
  - `P003.1`: `10 block`.
- End-of-run validation remains PASS:
  - `P002.9`: `READY=8`, `REVIEW=1`, `BLOCKED=1`.
  - `P003.1`: `READY=9`, `REVIEW=1`, `BLOCKED=0`.
- No contract regressions observed in scorecard contract-health block.

### Decision
- keep
- rationale: upstream evidence linkage fix materially reduced `07b` hard blocks while preserving strict contract and readiness stability.

### Next Hypothesis
Use `07b` review reasons to tighten Stage `07` technique/topic evidence quality and convert a subset of review outcomes to pass without reintroducing bypass logic.

## Iteration I81 - 2026-02-21

### Hypothesis
If Stage `07` enrichments with sparse explicit anchors are supplemented with evenly spaced conversation evidence IDs, `07b` evidence support alignment should improve without adding non-LLM shortcuts.

### Changes
- `scripts/training-data/07.LLM.content`:
  - added `_evenly_spaced_segment_ids(...)`.
  - updated approach evidence assignment to supplement sparse-anchor outputs up to a minimum evidence target using conversation-spaced IDs.
- Runtime executions (outside sandbox):
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --stage 07`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --stage 07`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --stage 07b`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --stage 07b`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages rerun: `07`, `07b`, validation
- run_id: `20260221.I81.stage07-sparse-anchor-evidence-supplement`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/07.LLM.content` PASS.
- End-of-run validation:
  - `P002.9 --validate`: PASS, cross-stage `errors=0`, readiness `READY=8`, `REVIEW=1`, `BLOCKED=1`.
  - `P003.1 --validate`: PASS, cross-stage `errors=0`, readiness `READY=9`, `REVIEW=1`, `BLOCKED=0`.
- `07b` gate mix remains review-only on effective scope:
  - `P002.9`: `pass=0`, `review=9`, `block=0`
  - `P003.1`: `pass=0`, `review=8`, `block=0`

### Decision
- keep
- rationale: upstream evidence coverage improved and cross-stage contract errors were eliminated, with no regressions in readiness or contract health.

### Next Hypothesis
Tighten Stage `07b` verifier rubric so minor non-contradictory support caveats remain informational and do not dominate `review` outcomes.

## Iteration I82 - 2026-02-21

### Hypothesis
If Stage `07b` prompt guidance is stricter about when to emit warning/review decisions, some current review-only outcomes can convert to pass while preserving strict hallucination controls.

### Changes
- `scripts/training-data/prompts/07b.enrichment-verify.prompt.md`:
  - clarified that partial-but-plausible support should not be flagged as alignment mismatch by default.
  - constrained hallucination checks to clear unsupported assertions (not missing exact keyword matches).
  - clarified that low-impact talking-head/testimonial support density alone should not force review.
  - added explicit pass guidance and duplicate-issue suppression guidance.
- `scripts/training-data/07b.LLM.enrichment-verify`:
  - bumped `PIPELINE_VERSION` to `07b.LLM.enrichment-verify-v1.1`.

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages attempted: `07b`
- run_id: `20260221.I82.stage07b-rubric-tightening`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/07b.LLM.enrichment-verify` PASS.
- Direct Claude probe now fails in current environment:
  - `claude -p "Respond exactly: ok" --output-format text --model opus`
  - response: `You've hit your limit · resets 12pm (Europe/Copenhagen)`
- `07b` rerun attempts therefore fail closed at preflight:
  - `P002.9 --stage 07b`: failed preflight (`non_zero_exit=1`).
  - `P003.1 --stage 07b`: failed preflight (`non_zero_exit=1`).

### Decision
- keep
- rationale: rubric improvements are in place and versioned; runtime validation is blocked by external Claude rate limit, not by pipeline contract failures.

### Next Hypothesis
Re-run `P002.9`/`P003.1` Stage `07b` after quota reset and compare pass/review/block deltas against `I81` baseline.

## Iteration I83 - 2026-02-21

### Hypothesis
If Stage `07b` prompt guidance enforces internal pass-consistency (no warning-driven review when all issues are pass-level), residual review outcomes can collapse to pass without bypassing required LLM verification.

### Changes
- `scripts/training-data/prompts/07b.enrichment-verify.prompt.md`:
  - added pass-consistency constraints:
    - when all issue rows are `gate_decision=pass`, overall gate must be `pass`.
    - for `gate_decision=pass`, checks should remain informational unless a concrete actionable risk exists.
  - added stricter duplicate suppression guidance and explicit handling note that `hook_rate_zero` alone is not review-worthy for talking-head/testimonial or noisy infield transcripts.
- `scripts/training-data/07b.LLM.enrichment-verify`:
  - bumped `PIPELINE_VERSION` to `07b.LLM.enrichment-verify-v1.2`.
- Runtime executions (outside sandbox):
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --stage 07b`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --stage 07b`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages rerun: `07b`, validation
- run_ids:
  - `20260221.P002.9.I83.stage07b-pass-consistency-tightening`
  - `20260221.P003.1.I83.stage07b-pass-consistency-tightening`

### Validation Evidence
- `python3 -m py_compile scripts/training-data/07b.LLM.enrichment-verify` PASS.
- `07b` gate mix after rerun:
  - `P002.9` effective scope (`9`): `pass=9`, `review=0`, `block=0`.
  - `P003.1` effective scope (`8`): `pass=8`, `review=0`, `block=0`.
- `07b` validator summaries now report `warnings=0` on both manifests.
- End-of-run validation remains PASS with no contract regressions:
  - `P002.9`: PASS, readiness `READY=8`, `REVIEW=1`, `BLOCKED=1` (routing policy/transcript quality unchanged).
  - `P003.1`: PASS, readiness `READY=9`, `REVIEW=1`, `BLOCKED=0`.
- Scorecards refreshed:
  - `data/validation/runs/20260221.P002.9.I83.stage07b-pass-consistency-tightening/scorecard.json`
  - `data/validation/runs/20260221.P003.1.I83.stage07b-pass-consistency-tightening/scorecard.json`

### Decision
- keep
- rationale: `07b` now produces stable pass outcomes on effective scope while preserving strict LLM-first execution and unchanged manifest/readiness contract health.

### Next Hypothesis
Evaluate whether remaining readiness reviews (outside `07b`, primarily transcript-quality and routing policy) should be addressed via upstream transcript-quality improvements or policy calibration.

## Iteration I84 - 2026-02-21

### Hypothesis
If repaired transcript issues are treated as non-gating context while unresolved transcript artifacts are risk-scored by type/severity, readiness outcomes will better represent contamination risk instead of generic warning volume.

### Changes
- `scripts/training-data/validation/validate_manifest.py`:
  - Stage `07` damage metrics now exclude `transcript_artifacts[].repaired=true` from damaged-segment accounting.
  - added `_compute_stage07_transcript_artifact_risk(...)`.
  - emits `stage07_transcript_artifact_risk` issues with severity based on unresolved-risk profile:
    - `warning` when unresolved risk is meaningful (e.g., high-severity present or high risk score).
    - `info` for low-risk unresolved artifacts.
  - canonical mapping now tags this signal as `contamination_risk` (remediation `transcript_review`).
- `scripts/training-data/validation/validate_stage_report.py`:
  - added `contamination_risk` to allowed signal classes.
  - `stage07_validation_warnings` remains visible but is excluded from policy-budget accounting.
  - added parent-check exclusion handling for expanded warning breakdowns.
  - maps `stage07_transcript_artifact_risk` and `transcript_artifact_*` breakdown keys to `contamination_risk`.
- Schemas:
  - `scripts/training-data/schemas/stage_report.schema.json`: added `contamination_risk`.
  - `scripts/training-data/schemas/pipeline_signal.schema.json`: added `contamination_risk`.
- Policy config clarity:
  - `scripts/training-data/batch/pipeline.config.json` now explicitly sets:
    - `review_warning_class_budget_by_content_type.*.contamination_risk = 0`
    - `max_warning_checks_by_class.contamination_risk = 2`

### Run Scope
- manifests: `P002.9`, `P003.1`
- stages rerun: validation-only (`--validate`)
- run_id: `20260221.I84.contamination-risk-gating-refactor`

### Validation Evidence
- compile/schema checks:
  - `python3 -m py_compile validate_manifest.py validate_stage_report.py` PASS.
  - JSON schema parse checks PASS for updated schema files.
- `P002.9 --validate`:
  - PASS; readiness shifted to `READY=7`, `REVIEW=0`, `BLOCKED=3`.
  - contamination-driven blocks:
    - `03m9yo-ikPc` -> `policy_warning_class_budget_exceeded:contamination_risk:4>2`
    - `V63ND9N6gvk` -> `policy_warning_class_budget_exceeded:contamination_risk:3>2`
  - routing-policy block unchanged:
    - `eCWdmkvNrO0` -> `policy_block_warning_class_by_content_type:talking_head:routing_mismatch`
- `P003.1 --validate`:
  - PASS; readiness shifted to `READY=8`, `REVIEW=2`, `BLOCKED=0`.
  - review reasons now explicit: `0fXt-cwzDwc`, `71xUMBrQjnc` -> `contamination_risk`.
- Summary warning checks (`stage07_validation_warnings`) remain in manifest output for observability but no longer drive readiness policy directly.

### Decision
- keep
- rationale: gating semantics now align with contamination risk intent: repaired artifacts are non-gating, unresolved contamination can deterministically review/block based on explicit policy budgets.

### Next Hypothesis
Tune unresolved artifact risk thresholds (high/medium score cutoffs) against a larger manifest slice to calibrate sensitivity before promotion.

## Iteration I85 - 2026-02-21

### Hypothesis
A broader active-scope validation sweep will show whether current contamination-risk budgets are over-triggering, or whether most remaining failures are simply missing downstream artifacts on not-yet-run sub-batches.

### Changes
- Validation sweep only (no code-path changes):
  - `./scripts/training-data/batch/sub-batch-pipeline P002.1 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.2 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.3 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.4 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.5 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.6 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.7 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.8 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P002.10 --validate`
  - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Added run summary artifact:
  - `data/validation/runs/20260221.I85.validation-slice-baseline/summary.json`

### Run Scope
- manifests: `P002.1-10`, `P003.1`
- stages rerun: validation-only (`--validate`)
- run_id: `20260221.I85.validation-slice-baseline`

### Validation Evidence
- Aggregate (run scope `107` videos):
  - readiness: `READY=15`, `REVIEW=2`, `BLOCKED=90`
  - dominant blocked reason: `missing_stage08_report=87`
  - contamination-impacted videos: `5` (`REVIEW=2`, `BLOCKED=3`)
- Completed scopes only (no `missing_stage08_report`; `P002.9` + `P003.1`, `20` videos):
  - readiness: `READY=15`, `REVIEW=2`, `BLOCKED=3`
  - contamination-impacted videos: `5` (`REVIEW=2`, `BLOCKED=3`)
- Per-manifest highlights:
  - `P002.1-8` + `P002.10`: FAIL due missing `07b`/`08`/`09` artifacts and missing confidence traces; readiness blocked by `missing_stage08_report`.
  - `P002.9`: PASS; `READY=7`, `REVIEW=0`, `BLOCKED=3` (two contamination-budget blocks, one talking-head routing block).
  - `P003.1`: PASS; `READY=8`, `REVIEW=2`, `BLOCKED=0` (both review reasons `contamination_risk`).

### Decision
- keep
- rationale: current contamination budgets are not the dominant source of active-scope failures; most blocks come from missing downstream artifacts in not-yet-run sub-batches.

### Next Hypothesis
Run additional `P002` sub-batches through full `07 -> 07b -> 08 -> 09` so contamination-threshold calibration is based on completed scopes instead of missing-artifact blockers.

## Iteration I86 - 2026-02-21

### Hypothesis
If we fix path-derived `video_id` drift in early LLM stages and harden Stage `07` repaired-artifact formatting, `P002.10` can run end-to-end and convert synthetic missing-artifact blocks into real readiness outcomes.

### Changes
- `scripts/training-data/06.LLM.video-type`:
  - `extract_video_id(...)` now reads bracket IDs from basename only (not full path), and prefers canonical 11-char IDs.
- `scripts/training-data/06b.LLM.verify`:
  - `extract_video_id(...)` aligned to the same basename-only, 11-char-preferred behavior.
- `scripts/training-data/07.LLM.content`:
  - repaired-artifact reporting now handles missing/non-numeric `repair_confidence` safely (`conf=n/a` fallback) instead of formatting crash.
- Runtime executions:
  - `./scripts/training-data/batch/sub-batch-pipeline P002.10 --run` (initial run exposed Stage `06b` path-ID schema failure).
  - `./scripts/training-data/batch/sub-batch-pipeline P002.10 --run --from 06` (after `06/06b` fix; exposed Stage `07` `repair_confidence=None` crash).
  - `./scripts/training-data/batch/sub-batch-pipeline P002.10 --run --from 07` (after Stage `07` fix; completed through `09`).
  - active-scope revalidation sweep:
    - `for b in P002.1 P002.2 ... P002.10; do ./scripts/training-data/batch/sub-batch-pipeline "$b" --validate; done`
    - `./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate`
- Added post-recovery summary artifact:
  - `data/validation/runs/20260221.I86.p00210-recovery/summary.json`

### Run Scope
- manifests:
  - full-pipeline recovery: `P002.10`
  - post-recovery sweep: `P002.1-10`, `P003.1`
- stages rerun:
  - recovery: `06..09`
  - sweep: validation-only (`--validate`)
- run_id: `20260221.I86.p00210-recovery`

### Validation Evidence
- `P002.10` recovery result:
  - manifest validation: PASS (`errors=0`, warnings context-only)
  - confidence trace: PASS (`7/7`)
  - readiness: `READY=7`, `REVIEW=0`, `BLOCKED=0`
  - presence checks now clean: missing `07b/08/09` artifacts all `0`.
- `07b` on `P002.10` effective scope:
  - pass-only (`pass=7`, `review=0`, `block=0` in manifest scope; source run processed 15 files with `Gate PASS=15`).
- Active-scope aggregate after recovery (`107` videos):
  - readiness: `READY=22`, `REVIEW=2`, `BLOCKED=83`
  - blocked reason mix:
    - `missing_stage08_report=80` (down from `87` in `I85`)
    - contamination/routing policy blocks unchanged on `P002.9` (`3` total)
  - completed scopes (`P002.9`, `P002.10`, `P003.1`; `27` videos): contamination-impacted `5` (`3 BLOCKED`, `2 REVIEW`).

### Decision
- keep
- rationale: two concrete runtime blockers were removed, `P002.10` now runs end-to-end, and active-scope synthetic missing-artifact pressure is reduced without weakening contamination policy semantics.

### Next Hypothesis
Continue full-path recovery on remaining `P002` sub-batches and then retune contamination-risk thresholds using completed-scope evidence only.
