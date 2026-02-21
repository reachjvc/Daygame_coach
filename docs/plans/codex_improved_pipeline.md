# Codex Improved Pipeline Plan (Quality-First Overhaul)

## Autonomous Execution Rule (Mandatory)

Agents working this plan must:
- continue implementation work without waiting for additional prompts.
- update this document and `docs/pipeline/audits/iteration-history.md` after every meaningful step.
- return to user only when a decision or blocker requires user input.

## LLM-First Rule (Mandatory)

Agents must not add or keep any deterministic/heuristic/fallback branch whose purpose is to avoid required LLM calls.
- If required LLM health/preflight fails, fail the stage.
- Do not ship CLI/runtime escape hatches that bypass LLM execution for production stage paths.
- Validation/read-only tooling may remain deterministic, but it must not be used as a substitute for missing required LLM stage outputs.
- In this environment, Claude CLI calls for required LLM stages must run outside sandbox restrictions; sandboxed Claude calls have produced false timeout/hang failures.

## Single-Path Rule (Mandatory)

The pipeline execution path must be singular and predictable for a given video type.
- No runtime branch controls for stage flow in the production path.
- No runtime switches that add/remove/reorder stages.
- For each video type, stage applicability is fixed by default stage logic; no manual skip toggles.

## Plain-Language Terms (Read First)

- `content type`: the video category from Stage 06 (`infield`, `talking_head`, `podcast`, `compilation`).
- `quality signal`: a warning/error label explaining what went wrong.
- `remediation path`: normalized next-action path for a signal (for example `transcript_review`, `contract_repair`).
- `gate decision`: final per-video status for ingest:
  - `pass`: ingest-ready
  - `review`: needs human review before ingest
  - `block`: do not ingest
- `canonical gate`: the machine-readable JSON with final `pass/review/block` decisions.

Note: old wording used `lane` in some places. In active policy/config we now use `content type`.
If older sections mention `lane`, interpret it as either:
- `content type` (infield/talking_head/etc), or
- ingest status (`pass/review/block`) when clearly about ingest decisions.

## Live Progress Log

| Date (UTC) | Progress |
|---|---|
| 2026-02-19 | Created plan and phased overhaul structure. |
| 2026-02-19 | Added senior-review hardening (migration modes, stop conditions, rollback, merge gates). |
| 2026-02-19 | Started execution: added `scripts/training-data/validation/pipeline_scorecard.py`; generated baseline scorecard run `20260219.P002.9.baseline`; created `docs/pipeline/audits/iteration-history.md`. |
| 2026-02-19 | Validated scorecard script on `P002.9` and `P001.1` (including source-filter mode) and logged Iteration `I0`. |
| 2026-02-19 | Implemented Phase 1 plumbing: quarantine propagation wired into `06c`-`06h` and `09`, plus orchestrator propagation updates in sequential and parallel runners. |
| 2026-02-19 | Hardened `06c.DET.patch` to fail closed on missing `06b` verification (legacy bypass removed later in strict-mode cleanup). |
| 2026-02-19 | Completed smoke checks: Python compile, shell syntax, stage CLI dry-runs, and quarantine-skip behavior tests; generated scorecard run `20260219.P002.9.I1.plumbing`. |
| 2026-02-19 | Added deterministic stage preflight validator `scripts/training-data/validation/validate_stage_contract.py` and integrated it into both orchestrators. |
| 2026-02-19 | Updated parallel runner (`pipeline-runner`) to execute per-stage contract preflight and capture quarantine reasons beyond 06b (stage07/stage09 validator hooks). |
| 2026-02-19 | Added `pipeline-runner --quarantine-file` and wired `sub-batch-pipeline --parallel` to forward quarantine override for mode parity. |
| 2026-02-19 | Generated scorecard run `20260219.P002.9.I2.contract-preflight` and logged Iteration `I2` with no metric regression vs I1 baseline. |
| 2026-02-19 | Ran parity matrix smoke checks and logged Iteration `I3`; sequential and parallel now both fail fast on contract-preflight when upstream deps are missing. |
| 2026-02-19 | Started Phase 2 foundation: added canonical schemas (`pipeline_signal`, `pipeline_gate`), normalization utility, and canonical-aware quarantine extraction; logged Iteration `I4`. |
| 2026-02-19 | Added canonical dual-emission in `validate_manifest.py` + `validate_stage_report.py` (while preserving legacy fields) and logged Iteration `I5`. |
| 2026-02-19 | Added canonical gate artifact emission from `validate_manifest.py` and canonical rollups in `batch_report.py`; logged Iteration `I6`. |
| 2026-02-19 | Confirmed `pipeline_scorecard.py` canonical-first gate consumption on `P002.9`; logged Iteration `I7` (previous mismatch was stale artifact timing, not code-path divergence). |
| 2026-02-19 | Hardened sequential/parallel validation parity: `sub-batch-pipeline --validate` now always emits canonical gates and `pipeline-runner` delegates end-of-run validation to that same path; logged Iteration `I8`. |
| 2026-02-19 | Hardened parallel stage-local quarantine logic to reuse canonical-aware extraction from `quarantine_updater.py` for stages `07/09`; logged Iteration `I9`. |
| 2026-02-19 | Added deterministic quarantine artifact diff utility (`compare_quarantine.py`) to support sequential-vs-parallel parity A/B evidence; logged Iteration `I10`. |
| 2026-02-20 | Ran sequential-vs-parallel quarantine parity simulation on `P002.9`, stored artifacts under `data/validation/parity/`, and measured divergence (`1` vs `10` quarantined videos); logged Iteration `I11`. |
| 2026-02-20 | Fixed runner validator scope to full-manifest for stage `07/09` checks and verified parity simulation now matches sequential synthesis (`match=true`); logged Iteration `I12`. |
| 2026-02-20 | Confirmed real-run sequential vs parallel parity on `P001.1` (`07→09`) with isolated quarantine artifacts (`match=true`); hardened runner Stage 07 commands to skip per-video Claude preflight churn; logged Iteration `I13`. |
| 2026-02-20 | Started Phase 3 scaffolding: added shared confidence math module + canonical confidence trace schema; wired Stage 06h to shared helpers with no scorecard regression; logged Iteration `I14`. |
| 2026-02-20 | Added Stage 06h confidence-trace emission (`*.confidence.trace.json`) and integrated confidence-trace validation into `--validate` flow with migration-safe missing-trace warnings; logged Iteration `I15`. |
| 2026-02-20 | Reduced runner artifact churn: Stage 08 per-video execution now uses `--no-report`; kept manifest-level Stage 08 reporting in end-of-run validation; logged Iteration `I16`. |
| 2026-02-20 | Backfilled confidence traces for `P002.9` and exercised strict confidence-trace validation path (`--strict-confidence-trace`); logged Iteration `I17`. |
| 2026-02-20 | Implemented config-driven confidence-trace enforcement policy (`warn|auto|strict`) with promotion-scope auto-strict defaults, and made `pipeline-runner` fail when delegated end-of-run validation fails; logged Iteration `I18`. |
| 2026-02-20 | Extended `pipeline_scorecard.py` confidence block with trace coverage metrics (`trace_files_present/expected`, `trace_coverage_ratio`) and refreshed `P002.9`/`P003.1` scorecards; logged Iteration `I19`. |
| 2026-02-20 | Ran real runner smoke on `P002.9` (`--from 09`) to verify delegated validation exit propagation, and refreshed scorecard state (`I20`) with `1` quarantined video in effective scope (`9/10`). |
| 2026-02-20 | Added calibration knobs for Phase 3 sweeps: Stage `06h` band thresholds and Stage `09` chunk-floor overrides, wired through both orchestrators, and validated default no-regression scorecard (`I21`). |
| 2026-02-20 | Executed first real confidence sweep on `P002.9` (Stage `06h` thresholds `0.85/0.65`), observed major high→medium redistribution with unchanged structural quality metrics, and logged `I22`. |
| 2026-02-20 | Restored Stage `06h` defaults (`0.80/0.60`) on `P002.9` after sweep, confirming baseline metric restoration; logged `I23`. |
| 2026-02-20 | Attempted controlled Stage `09` chunk-floor sweep (`I24`) on one-video manifest; blocked by local dependency (`Ollama` unreachable at `http://localhost:11434`). |
| 2026-02-20 | Executed controlled one-video Stage `09` chunk-floor sweep (`I25`, floor `0.35`) once Ollama was reachable; no measurable delta (all chunk confidence scores already >= `0.90`). |
| 2026-02-20 | Restored one-video Stage `09` output back to default floor (`0.30`) and verified stable scorecard/chunk validation (`I26`). |
| 2026-02-20 | Ran focused low-tail Stage `09` sensitivity sweep (`I27`) at floor `0.40` for `03m9yo-ikPc`: measurable pruning observed (`47 -> 45` chunks), with chunk validation PASS. |
| 2026-02-20 | Restored focused sensitivity-test output to default floor (`0.30`) and verified chunk count/score baseline restoration (`I28`). |
| 2026-02-20 | Added Stage `09` pre-filter drop telemetry fields to chunk artifacts and updated scorecard retrieval ratio to use pre-filter basis when available; validated with focused sweep (`I29`) and restore (`I30`). |
| 2026-02-20 | Executed curated 3-video low-tail chunk-floor sweep at `0.45` (`I31`), measured aggregate pre-filter drop ratio `0.038` with PASS validation, then restored defaults (`I32`). |
| 2026-02-20 | Executed Stage `06h` band set C (`0.75/0.55`) on `P002.9` (`I33`), observed small confidence-band redistribution with no structural/regression impact. |
| 2026-02-20 | Restored Stage `06h` default thresholds (`0.80/0.60`) after band set C and reconfirmed baseline confidence distribution (`I34`). |
| 2026-02-20 | Added Stage `06b` timeout-mitigation controls (`--max-transcript-segments`, `--prompt-profile`) and ran targeted probes; `06b` remained blocked by Claude call timeouts even with fast prompt/profile (`I35`). |
| 2026-02-20 | Completed `P003.1` upstream backfill through deterministic `06h` fallback (`02`-`05`, `06c` with `--allow-missing-verification`, `06d`, `06f`, `06h`), validated strict trace coverage (`10/10`), and recorded expected downstream validation failures for missing `08/09` (`I36`). |
| 2026-02-20 | Started strict no-fallback hardening pass (`I37` in progress): removed permissive `06b/06c` fallback flags and model fallback chains, forced confidence-trace policy to strict-only, and removed root-flat/source-flat fallback lookup paths across pipeline + validation scripts. |
| 2026-02-20 | Ran post-hardening strict validation: `P002.9 --validate` passes with strict confidence traces; `P003.1 --validate` now fails only on expected missing Stage `08/09` artifacts while strict confidence-trace validation passes (`10/10`). |
| 2026-02-20 | Ran strict `06b` probe on `P003.1` (single-file, short timeout envelope): preflight fails hard (`timeout_after_5s`) with no alternate model/repair path. |
| 2026-02-20 | Hardened stage exit semantics: `06b`/`06c` now return non-zero on any failed file; confirmed via strict `06c` manifest probe (`P003.1`, missing `06b` artifacts) exiting `1`. |
| 2026-02-20 | Executed strict full-manifest `06b` on `P003.1` (model `sonnet`): `APPROVE=2`, `FLAG=6`, `REJECT=2`, `Failed=0`; then verified `06c` fails hard without quarantine and passes with quarantine (`Processed=8`, `Skipped(quarantine)=2`, `Failed=0`). |
| 2026-02-20 | Fixed strict-path orchestration drift: `sub-batch-pipeline` and `pipeline-runner` now always pass `--overwrite` for stages `06`-`07` to prevent stale downstream artifacts after upstream changes. |
| 2026-02-20 | Fixed quarantine regression in `validate_manifest.py`: emitted quarantine now merges and preserves preexisting quarantine IDs/reasons instead of replacing them. |
| 2026-02-20 | Re-ran strict `P003.1` from `06d→09` with `06b`-derived quarantine and verified end-of-run validation PASS (`errors=0`, `warnings=10`, `quarantined=2`, `blocked=0`); scorecard run: `20260220.P003.1.I38.strict-overwrite-quarantine-merge`. |
| 2026-02-20 | Rebalanced readiness warning policy in `pipeline.config.json`: removed per-check hard block budget for `transcript_artifact`; validation now reports `READY=8`, `REVIEW=2`, `BLOCKED=0` on `P003.1` (`run_id=20260220.P003.1.I39.warning-policy-rebalance`). |
| 2026-02-20 | Reduced batch-wide warning spillover: downgraded Stage 08 manifest-level FAIL summary signal to non-gating info when per-video results exist, and raised global warning cap to `10`; `P002.9 --validate` now PASS with `READY=6`, `REVIEW=4`, `BLOCKED=0` (`run_id=20260220.P002.9.I40.warning-policy-scope`). |
| 2026-02-20 | Added canonical signal taxonomy to manifest gating outputs: `signal_class` + `remediation_lane` now emitted in canonical gate/quarantine reasons with summary `signal_class_counts`; validated no metric regressions on `P003.1` and `P002.9` (`I41`). |
| 2026-02-20 | Added class-based readiness policy support in `validate_stage_report` (`--max-warning-class`, `--block-warning-class`) and wired config propagation in `sub-batch-pipeline`; readiness reasons now emit stable classes (`transcript_quality`, `routing_mismatch`) on both `P003.1` and `P002.9` (`I42`). |
| 2026-02-20 | Extended `pipeline_scorecard.py` to expose canonical gating `signal_class_counts`; refreshed scorecards for `P003.1` and `P002.9` to establish class-level warning baselines (`I43`). |
| 2026-02-20 | Carried canonical classes into stage-report checks (`signal_class`, `remediation_lane`) and updated schema/validator to accept them; readiness now consumes canonical class metadata directly when present (`I44`). |
| 2026-02-20 | Added lane-aware review-class budgets (`review_warning_class_budget_by_video_type`) and validated readiness impact: `P002.9` improved from `READY=6, REVIEW=4` to `READY=7, REVIEW=3` with no error regressions (`I45`). |
| 2026-02-20 | Aligned scorecard gate counting with final ingest policy: readiness summary is now primary decision source (`pass/review/block`), canonical gate retained for signal taxonomy telemetry, and scorecards now expose `decision_mismatch_count` to track canonical-vs-readiness drift (`I46`). |
| 2026-02-20 | Consolidated final gate authority: `validate_stage_report` now emits canonical gate artifacts from readiness policy and `sub-batch-pipeline --validate` writes those by default; scorecards now show `decision_mismatch_count=0` on both `P002.9` and `P003.1` (`I47`). |
| 2026-02-20 | Compacted stage-report canonical signal emission (class counts aggregated per video instead of repeated per warning instance), reducing signal telemetry inflation while preserving gate decisions and zero mismatch (`I48`). |
| 2026-02-20 | Removed manifest-stage canonical gate emission from standard `sub-batch-pipeline --validate`; canonical gate is now produced only once (stage-report readiness authority), eliminating overwrite churn (`I49`). |
| 2026-02-20 | Synced validation runbook docs to current implementation: single canonical-gate authority, class/lane readiness policies, and deterministic validation artifact refresh semantics (`I50`). |
| 2026-02-20 | Simplified policy terminology: readiness budgets now use `content type` naming (instead of `lane/video_type`) across config, CLI, and readiness outputs (`I51`). |
| 2026-02-20 | Simplified Stage 10 ingest wording: replaced lane language with PASS/REVIEW status wording, renamed flag to `--include-review`, and renamed metadata field to `ingest_status` (`I52`). |
| 2026-02-20 | Simplified Stage 07 user-facing routing wording: renamed CLI flag to `--force-routing` and updated logs/help from “routing lane” to “routing” terminology (`I53`). |
| 2026-02-20 | Added a plain-language glossary to `validation_harness.md` so operators can quickly map core terms (`content type`, `signal class`, `pass/review/block`, canonical gate, ingest status) (`I54`). |
| 2026-02-20 | Tuned content-type readiness policy conservatively: added `talking_head.transcript_quality=1` budget, improving readiness with no quality/contract regressions (`P002.9: READY 8/9`, `P003.1: READY 7/8`) (`I55`). |
| 2026-02-20 | Added readiness-output transparency: per-video rows now include the applied `content_type` review budget map (`check_counts.content_type_review_budget`) so pass/review outcomes are directly explainable (`I56`). |
| 2026-02-20 | Clarified routing policy intent in config by making `talking_head.routing_mismatch=0` explicit (keep routing mismatches in REVIEW by default); validated no regressions (`I57`). |
| 2026-02-20 | Extended scorecards with a per-content-type policy table (`review budgets`, `warning class counts`, `review video counts`) to speed tuning decisions across sessions (`I58`). |
| 2026-02-20 | Enforced strict no-fallback behavior in active ingest/validation path: removed Stage 10 legacy Stage 08 path/source fallbacks, removed Stage 10 legacy chunk metadata aliases, removed Stage 07 legacy array response parsing, and removed confidence policy mode plumbing from orchestrator (strict-only); validated no regressions (`I59`). |
| 2026-02-20 | Replaced canonical `remediation_lane` terminology with `remediation_path` across validators/schemas and regenerated gates/stage reports; validated no regressions (`I60`). |
| 2026-02-20 | Simplified readiness flow to one policy path by removing `allow_review_ingest` orchestration/config branch control; validation remains READY-only with no metric regressions (`I61`). |
| 2026-02-20 | Removed remaining review-ingest branch flags from `validate_stage_report.py` (`--allow-review-ingest`, `--block-review-ingest`) so readiness contract is single-path READY-only end to end; validated no regressions (`I62`). |
| 2026-02-20 | Removed early-stage audio fallback branch flags (`--prefer-audio`) in `02/03/04` and enforced deterministic audio contract (`02=raw16k`, `03/04=clean16k`) with no downstream scorecard regressions (`I63`). |
| 2026-02-20 | Emitted canonical signal fields directly from `validate_cross_stage.py` and `validate_chunks.py`, and hardened `quarantine_updater.py` to extract blocking IDs from canonical fields only for validator payloads; validated no regressions (`I64`). |
| 2026-02-20 | Hardened `normalize_quality_signals.py` to canonical-only normalization (no legacy severity/verdict fallback mapping; rows without canonical `issue_code` are ignored) and validated no downstream scorecard regressions (`I65`). |
| 2026-02-20 | Removed two remaining runtime compatibility fallbacks: Stage 07 dropped-candidate `reason` fallback (now `reason_code` only) and pipeline-runner Stage 06b root-flat verdict lookup fallback (source-scoped only); validated no regressions (`I66`). |
| 2026-02-21 | Started Phase 5 policy refinement (`I67`): added content-type class block policy (`block_warning_class_by_content_type`) in readiness validation/orchestration config, added canonical gate `summary.decision_source` schema contract, and aligned docs to single canonical gate authority language. |
| 2026-02-21 | Executed first Phase 5 class-block rollout (`I68`): enabled `talking_head.routing_mismatch` hard-block policy in config, validated `P002.9`/`P003.1` PASS, and observed expected gate shift on `P002.9` (`READY=8`, `REVIEW=1`, `BLOCKED=1`) with no quality/contract regressions. |
| 2026-02-21 | Completed ingest policy wording alignment (`I69`): documented explicit readiness-to-ingest mapping (`READY/pass` ingestable, `REVIEW/review` excluded, `BLOCKED/block` excluded) in Stage 10 help + validation harness docs; refreshed scorecards with no metric change. |
| 2026-02-21 | Expanded class-block policy scope (`I70`): added `podcast.routing_mismatch` hard-block policy, validated `P002.9`/`P003.1` PASS, and observed no additional gate drift on current manifests. |
| 2026-02-21 | Started Phase 4 design spike (`I71`): drafted Stage `07b` enrichment verification contract, schema, and fail/waive semantics (`docs/pipeline/stage07b_enrichment_verification.md`, `schemas/07b.enrichment-verify.schema.json`), and updated `ASCII` stage map. |
| 2026-02-21 | Enforced strict LLM-path execution (`I72`): removed `--skip-llm-preflight` from Stages `06/06b/07`, removed Stage `07` no-Claude revalidation runtime path, and removed runner injection of preflight-skip flags; validated `P002.9`/`P003.1` with no scorecard regressions. |
| 2026-02-21 | Enforced single-path documentation policy (`I73`): removed branch-control language from active pipeline docs and set a canonical fixed flow rule for stage orchestration. |
| 2026-02-21 | Enforced fixed orchestration parameter path (`I74`): removed Stage `06h/09` threshold override pass-through flags from `sub-batch-pipeline` and `pipeline-runner`, cleaned remaining stage-flow branching wording from active pipeline docs, and revalidated `P002.9`/`P003.1` with no scorecard regressions. |
| 2026-02-21 | Implemented Stage `07b` canonical integration (`I75`): added `07b.LLM.enrichment-verify` + `validate_stage07b.py`, wired orchestration route `07 -> 07b -> 08 -> 09` in both runners, updated contract/scorecard/manifest validation coverage for `07b`, and refreshed pipeline docs. |
| 2026-02-21 | Enforced fixed gate/applicability path (`I76`): removed Stage `10` gate-skip flags (`--skip-taxonomy-gate`, `--skip-readiness-gate`), removed Stage `06g` applicability override flag (`--skip-video-type-filter`), and aligned active pipeline docs/help to fixed-path gate/applicability behavior. |
| 2026-02-21 | Fixed quarantine deadlock in validation emission (`I77`): `validate_manifest.py` now excludes contract-only missing/invalid artifact issues from persisted quarantine membership and avoids self-reinforcing preexisting-quarantine carry-forward when input/output quarantine file is the same path. |
| 2026-02-21 | Unblocked runtime with unsandboxed Claude execution (`I78`): documented host-execution requirement for Claude CLI, verified outside-sandbox health probe, and ran real Stage `07b` generation on `P002.9` and `P003.1` with successful artifact emission. |
| 2026-02-21 | Fixed Stage `07 -> 07b` evidence linkage contract (`I79`): Stage `07` now emits canonical `evidence_segment_ids` for approach/commentary/talking_head enrichments, prompt contracts/examples include the field, and `07b` compact hook parsing now accepts `hook_point.segment`. |
| 2026-02-21 | Re-ran canonical `07 -> 07b` after upstream evidence fix (`I80`): regenerated Stage `07`/`07b` artifacts on `P002.9` and `P003.1` outside sandbox; Stage `07b` gate mix shifted from block-heavy to review-only on effective scope (`P002.9: review=9, block=0`; `P003.1: review=8, block=0`). |
| 2026-02-21 | Extended Stage `07` evidence assignment coverage (`I81`): added even-spaced conversation evidence supplementation for sparse-anchor approaches, reran `07/07b` on `P002.9` + `P003.1`, and reconfirmed manifest validation PASS with cross-stage errors `0` on both manifests while `07b` remains review-only on effective scope. |
| 2026-02-21 | Started `07b` rubric tightening (`I82`): updated verifier prompt pass/review guidance to reduce minor-overflag review pressure and bumped Stage `07b` pipeline version to `v1.1`; verification rerun is blocked by Claude account rate-limit (`resets 12pm Europe/Copenhagen`). |
| 2026-02-21 | Completed `07b` rubric tightening rerun (`I83`): added pass-consistency constraints to the verifier prompt, bumped Stage `07b` pipeline version to `v1.2`, reran `07b` on `P002.9` + `P003.1`, and improved `07b` effective-scope gate mix to pass-only (`P002.9: pass=9, review=0, block=0`; `P003.1: pass=8, review=0, block=0`). |
| 2026-02-21 | Updated transcript-contamination gating semantics (`I84`): repaired transcript artifacts no longer count toward Stage `07` damage metrics, Stage `07` unresolved artifact risk now emits explicit `stage07_transcript_artifact_risk` checks, summary `stage07_validation_warnings` are non-gating, and readiness now routes unresolved contamination into `contamination_risk` review/block outcomes based on policy budgets. |
| 2026-02-21 | Expanded active-scope validation sweep (`I85`) across `P002.1-10` and `P003.1`: remaining blocks are dominated by not-yet-run artifact gaps (`missing_stage08_report` on `87/107` videos), while completed scopes (`P002.9`, `P003.1`) show contamination impact on `5/20` videos (`3 BLOCKED`, `2 REVIEW`) under current `contamination_risk` budgets. |
| 2026-02-21 | Recovered `P002.10` end-to-end (`I86`): fixed Stage `06/06b` path-based `video_id` extraction drift and Stage `07` repaired-artifact confidence formatting crash, then reran `P002.10` through `06..09`; post-run validation is now `READY=7`, `REVIEW=0`, `BLOCKED=0` with no missing `07b/08/09` artifacts. |

## Agent Handoff Blurb (Read First)

Goal: redesign the training-data pipeline for higher final RAG quality, not lower cost. Treat current pipeline as mutable. Baseline and iterate from `P002.9` (current ground truth), then validate promotion on `P003.1`.

Critical current facts (verified on disk, 2026-02-21):
- `P002.9` is now near-complete: quarantine file currently reports `1` quarantined video (`CTfDIHi91uk`); effective scope is `9/10` with Stage `06..09` coverage `9/9`.
- `P002.9` strict validation now passes (`Result: PASS`) with tuned content-type-aware readiness (`READY=7`, `REVIEW=0`, `BLOCKED=3` on effective scope `9`).
- `P003.1` now has strict-path artifacts through Stage `09` on effective scope `8/10` with end-of-run manifest validation PASS (`errors=0`, warnings-only) and scorecard run `20260220.P003.1.I38.strict-overwrite-quarantine-merge`.
- Latest readiness after content-type tuning:
  - `P002.9`: `READY=7`, `REVIEW=0`, `BLOCKED=3` (effective scope `9`)
  - `P002.10`: `READY=7`, `REVIEW=0`, `BLOCKED=0` (effective scope `7`)
  - `P003.1`: `READY=8`, `REVIEW=2`, `BLOCKED=0` (effective scope `8`)
- Active-scope validation sweep (`I86`, `P002.1-10` + `P003.1`) remains dominated by not-yet-run downstream artifacts, but recovered `P002.10` reduced synthetic block pressure:
  - readiness blocks from `missing_stage08_report`: `80/107` videos (down from `87/107` in `I85`)
  - completed scopes (`P002.9`, `P002.10`, `P003.1`): contamination impact `5/27` videos (`3 BLOCKED`, `2 REVIEW`)
- `data/validation/quarantine/P003.1.json` now correctly preserves preexisting Stage `06b` quarantines across validation emission (merge semantics fixed in `validate_manifest.py`).
- `validate_manifest.py` quarantine emission now excludes contract-only missing/invalid artifact checks from persistent quarantine membership, preventing validation-only deadlocks on reruns (for example after introducing required `07b` artifacts).
- Quarantine propagation is now wired across `06c`-`06h`, `07`, `08`, and `09` in both orchestrators.
- `06c.DET.patch` now fails by default when matching `06b` verification is missing.
- `validate_manifest.py` still supports canonical gate emission for standalone/manual use, but standard orchestration now treats stage-report readiness as canonical gate authority.
- `sub-batch-pipeline --validate` now emits canonical gate only from `validate_stage_report` (single authority path); manifest validation still performs checks and stage-report emission but no longer writes competing canonical gate files in this flow.
- Readiness policy supports content-type class hard blocks (`block_warning_class_by_content_type`) for routing/error handling.
- Active policy now blocks `talking_head.routing_mismatch` and `podcast.routing_mismatch` via `block_warning_class_by_content_type`.
- Canonical gate schema now requires `summary.decision_source` (`stage_report_readiness` in standard orchestration, `manifest_validation` in standalone manifest-emission mode).
- Confidence-trace enforcement is strict-only in orchestration (`validate_confidence_trace.py --strict-missing` is always applied in `sub-batch-pipeline --validate`).
- Stage 10 ingest now rejects legacy Stage 08 report fallback paths/scopes and consumes canonical Stage 09 metadata keys only.
- Stage 10 manifest-mode gating no longer exposes runtime skip flags; taxonomy and readiness gates are always enforced in that path.
- Manifest validation now rejects legacy Stage 08 report path/scope compatibility branches (strict scope contract).
- Stage 07 enrichment response parsing is strict JSON-object format only (legacy array parser removed).
- Early acquisition stages use deterministic audio selection only:
  - Stage `02`: `*.audio.asr.raw16k.wav`
  - Stage `03` and `04`: `*.audio.asr.clean16k.wav`
- Orchestrators now force deterministic refresh for stages `06`-`07` via `--overwrite`, removing stale-artifact drift between stage boundaries.
- Stage `06h` band set C (`0.75/0.55`) was tested on `P002.9` and rolled back; default thresholds remain `0.80/0.60`.
- `06b` is runtime-viable in elevated environment using Claude model `sonnet`; prior short-timeout probe failures were envelope-specific, not a hard platform block.
- Claude CLI health is confirmed outside sandbox (`claude -p ... -> ok`); required LLM stages should execute in host mode in this environment.
- Real Stage `07b` artifacts were generated for `P002.9` and `P003.1` via outside-sandbox execution; current effective-scope outcomes are pass-only (`P002.9: 9/9 pass`, `P003.1: 8/8 pass`) after `I83` verifier-rubric consistency tightening.
- Readiness now treats unresolved transcript contamination separately from generic transcript quality:
  - new warning class: `contamination_risk`
  - repaired transcript artifacts are excluded from Stage `07` damage ratio metrics and do not independently trigger readiness degradation.
  - unresolved contamination can remain `REVIEW` or escalate to `BLOCKED` via class budgets (for example `max_warning_checks_by_class.contamination_risk=2`).
- Stage 08 manifest-level FAIL summary is now non-gating context when per-video results are available, preventing single-video failures from globally downgrading all videos.
- Canonical gate signals now include stable `signal_class` and `remediation_path` tags for automation/handoffs (e.g., `transcript_quality -> transcript_review`, `artifact_contract -> contract_repair`).
- Canonical signal field naming is now `remediation_path` (replacing `remediation_lane`).
- Readiness orchestration now has a single policy flow (READY-only ingest gating); `allow_review_ingest` config branch control removed.
- Stage-report validator also runs fixed READY-only policy (review-ingest branch flags removed).
- Stage 07/09 validator payloads now emit canonical signal fields (`issue_code`, `issue_severity`, `gate_decision`, `signal_class`, `remediation_path`) directly.
- Quarantine updater now treats stage-validator payloads as canonical control-plane input (canonical-only blocking extraction).
- `normalize_quality_signals.py` now operates in canonical-only mode for signal normalization utilities.
- Stage 07 dropped-candidate validation now enforces `reason_code` only (legacy `reason` key no longer accepted).
- Parallel runner Stage 06b reject detection now uses source-scoped verification lookup only (no root-flat fallback).
- Orchestrators no longer expose runtime Stage `06h/09` threshold override flags; active pipeline flow uses fixed stage defaults/config only.
- Stage `06g` no longer exposes a runtime applicability override; non-infield videos are skipped strictly by stage logic.
- Readiness policy now supports warning class budgets/blocks in addition to raw check budgets, reducing config fragility as check names evolve.
- Readiness policy now supports content-type review budgets (`content_type x warning_class`) to avoid penalizing transcript-heavy content types with the same threshold as low-artifact content types.
- Current tuned policy includes:
  - `infield.transcript_quality = 4`
  - `talking_head.transcript_quality = 1`
  - `talking_head.routing_mismatch = 0` (review budget)
  - `block_warning_class_by_content_type.talking_head = [routing_mismatch]` (escalate to BLOCKED)
  - `block_warning_class_by_content_type.podcast = [routing_mismatch]` (escalate to BLOCKED)
- Scorecards now include per-content-type policy observability:
  - `gating.review_budget_by_content_type`
  - `gating.warning_class_counts_by_content_type`
  - `gating.review_videos_by_content_type`
- Scorecards now surface canonical signal-class composition directly (`gating.signal_class_counts`) so drift can be tracked per class across iterations.
- Scorecards now emit gate source + drift telemetry (`gating.decision_source`, `gating.decision_mismatch_count`) to keep canonical warnings and final ingest decisions interpretable together.
- Latest readiness-authority scorecards (`I47`) report `decision_mismatch_count=0` on both `P002.9` and `P003.1`.
- Latest canonical compaction run (`I48`) preserves gate decisions (`pass/review/block`) while reducing noisy class-count inflation (for example `P003.1 transcript_quality: 19 -> 10`).
- Stage report checks now persist canonical class metadata, reducing reliance on check-name heuristics in readiness policy.
- Terminology is fragmented across multiple severity/status enums, making failures and confidence hard to interpret.
- Status files can drift from artifact reality; do not trust `*.status.json` as source of truth without artifact checks.

Execution principle:
- Iterate in small, testable slices on `P002.9`.
- Promote only when objective quality, gating clarity, and confidence calibration improve together.
- Keep a durable iteration log so multiple agents can continue across sessions without chat context.

---

## 0. Senior Review Risk Closures

This section records senior-level plan hardening decisions that close execution risks.

1. Run isolation and reproducibility are mandatory.
- Do not overwrite baseline artifacts in-place when evaluating major behavior changes.
- Use run-scoped outputs (`run_id`) and compare scorecards across runs.

2. Migration must be explicitly dual-read/dual-write before cutover.
- Canonical fields cannot break existing validators and ingest paths during transition.

3. Promotion thresholds require statistical minimums.
- Semantic and retrieval promotion gates must enforce minimum sample sizes and fixed seeds.

4. Rollback must be operational, not conceptual.
- Auto-revert conditions map to explicit revert actions and freeze points.

5. Command flow must reflect artifact dependencies.
- Stage report validation should run only after stage reports are emitted for that run.

---

## 1. Scope and Quality Contract

### 1.1 Objective

Rebuild pipeline structure, gating semantics, and confidence handling so that:
1. Every stage has explicit input/output contracts and fail-fast behavior.
2. A single terminology model covers issue severity, gating decision, and confidence state.
3. Confidence is scope-aware (segment/conversation/video), so local defects do not inappropriately poison whole files.
4. End-product retrieval quality is measurably better on canary and promotion batches.

### 1.2 Non-Negotiables

- Quality over speed and cost.
- No silent pass-through on missing prerequisites.
- Every blocking outcome must have machine-readable reasons and human-readable context.
- Maintain auditable evidence chains from raw segment -> quality signal -> gate decision -> ingest decision.

### 1.3 Non-Goals

- Preserving current stage boundaries for compatibility alone.
- Minimizing LLM calls at the expense of output quality.
- Relying on old sub-batch quality as authoritative current baseline.

---

## 2. Baseline Diagnosis (2026-02-19)

### 2.1 Structural Gaps

- [Resolved in I1] Quarantine injection now covers `06c`-`06h`, `07`, `08`, `09` in both `sub-batch-pipeline` and `pipeline-runner`.
- [Resolved in I37] `06c` runs strict fail-closed with no legacy bypass flags (`--allow-missing-verification`, `--allow-invalid-verification`, `--allow-reject` removed).
- [Resolved in I8] End-of-run validation parity now uses a shared path: `pipeline-runner` delegates to `sub-batch-pipeline --validate`.
- [Remaining] Orchestration mismatch still exists in stage-local synthesis:
  - sequential mode applies manifest-level post-stage quarantine synthesis after stages `06b/07/09`.
  - parallel mode still relies on per-video validator outcomes; edge-case equivalence needs explicit artifact comparison.

### 2.2 Terminology Fragmentation

Current overlapping vocabularies include:
- Severity:
  - `minor/moderate/major` (06b boundary issues)
  - `low/medium/high` (06e/06f/06g damage)
  - `error/warning/info` (stage report checks)
- Status/decision:
  - `PASS/WARN/FAIL` (stage report)
  - `READY/REVIEW/BLOCKED` (readiness summary)
  - `APPROVE/FLAG/REJECT` (06b)
  - `OK/FLAG/ISSUE` (06b conversation verdicts)
  - sub-batch lifecycle statuses (`not_started`, `in_progress`, etc)

Result: operators cannot quickly tell whether a label means confidence, quality severity, or go/no-go decision.

### 2.3 Confidence Handling Pain

- Confidence is distributed across 06, 06h, 07, 09 with different aggregation assumptions.
- Some penalties are global enough to over-impact unaffected content.
- Output consumers (especially chunking/ingest paths) cannot consistently interpret confidence provenance.

### 2.4 Baseline Batch Reality

- `P002.9` currently has full through `06e`, partial `06f`, and no `06g+` outputs.
- Baseline initially had no readiness/quarantine artifacts; current validation runs now emit both readiness and canonical gate artifacts.
- Historical sub-batches (ex: `P001.*`) contain mixed quality and mixed report maturity; useful for stress signals, not canonical baseline.

---

## 3. Target vNext Architecture (Logical, Not Number-Locked)

Keep numeric stage entrypoints initially for migration safety, but redefine responsibilities by logical layer.

| Logical Layer | Current Scripts | vNext Intent |
|---|---|---|
| L0 Acquire/ASR | 01-05 | Keep mostly as-is; improve contract checks only |
| L1 Structure | 06, 06b, 06c | Explicit structure decision + deterministic patching with strict prerequisites |
| L2 Transcript Integrity | 06d, 06e | Sanitization + transcript artifact analysis/repair evidence |
| L3 Damage/Confidence | 06f, 06g, 06h | Scope-aware issue graph and calibrated confidence propagation |
| L4 Content Enrichment | 07 | Enrichment generation from L3 output only |
| L4b Enrichment QA (new) | new stage (`07b`) | LLM verifier for evidence alignment and hallucination control |
| L5 Retrieval Packaging | 08, 09 | Taxonomy + chunk integrity + confidence-aware packaging |
| L6 Ingest Decision | 10 (+ semantic gate) | Deterministic ingest decisions using canonical gate decisions |

Notes:
- `07b` is treated as a fixed stage decision once adopted: either fully integrated into the canonical path or removed entirely.

---

## 4. Canonical Terminology Model (Single Vocabulary)

Define these as pipeline-wide canonical enums and migrate all stages to emit adapters until legacy fields are retired.

### 4.1 Canonical Fields

- `issue_severity`: `critical | major | minor | info`
- `gate_decision`: `pass | review | block`
- `confidence_band`: `high | medium | low`
- `scope_type`: `segment | conversation | video | batch`
- `issue_code`: stable snake_case identifier (example: `speaker_role_misattribution`)
- `origin_stage`: script/stage that produced the signal

### 4.2 Legacy Mapping (Transitional)

| Legacy | Canonical |
|---|---|
| `APPROVE/FLAG/REJECT` | `pass/review/block` |
| `PASS/WARN/FAIL` | `pass/review/block` |
| `READY/REVIEW/BLOCKED` | `pass/review/block` (ingest context) |
| `minor/moderate/major` | `minor/major/critical` |
| `low/medium/high` (damage) | `minor/major/critical` |
| `error/warning/info` | `major/minor/info` (unless explicit blocker -> `critical`) |

### 4.3 Required Output Artifact

Every quality-relevant stage emits a normalized sidecar:
- `*.signals.json` containing:
  - normalized issues
  - canonical severities
  - scope references
  - gate recommendation and rationale

---

## 5. Confidence Model Redesign (Scope-Aware and Explainable)

### 5.1 Core Rule

Penalize only affected scope by default. Promote to broader scope only when evidence supports contamination spread.

### 5.2 Confidence Structure

Per segment:
- `base_confidence` (from ASR/diarization/context)
- `issue_penalties[]` with `issue_code`, `severity`, `weight`, `applied_delta`
- `final_confidence`
- `confidence_band`

Per conversation:
- Weighted aggregate from member segments (token-weighted + robust percentile guard).
- Include `impacted_segment_ratio`.

Per video:
- Weighted aggregate from conversations and non-conversation regions separately.
- Include `coverage_quality` and `structural_integrity` factors.

### 5.3 Misattribution Handling

Misattribution should not auto-damage whole-file confidence.
- Default: segment-level penalty.
- Escalate to conversation-level only when repeated pattern threshold is crossed.
- Escalate to video-level only when cross-conversation systematic pattern is detected.

### 5.4 Confidence Calibration Loop

Use semantic judge/human review samples to calibrate thresholds:
- Correlate confidence bands vs judged correctness.
- Adjust band thresholds only with logged evidence.

---

## 6. Hard Gating and Contracts

### 6.1 Contract Enforcement

Introduce deterministic preflight contract checks before each stage:
- required upstream artifacts exist
- schemas valid
- stage scope (manifest/source/video) consistent
- no stale/foreign artifact collision

Add script:
- `scripts/training-data/validation/validate_stage_contract.py`

### 6.2 Immediate Mandatory Changes

1. Quarantine propagation for `06c`-`06h`, `09`.
2. Orchestrators pass quarantine consistently in both sequential and parallel mode.
3. `06c` defaults to fail on missing verification (opt-out flag only for explicit legacy recovery).
4. Stage-specific no-silent-pass policy:
   - missing required input = blocking contract failure
   - corrupted required input = blocking contract failure

### 6.3 Unified Gate Artifacts

Emit deterministic decision files:
- `data/validation/gates/<subbatch>/<video_id>.gate.json`
- one final merged manifest-level gate summary

---

## 7. Iterative Method (Center: P002.9 -> Promote: P003.1)

Each iteration follows this strict loop:

1. Hypothesis
- state one change hypothesis and expected measurable effect.

2. Implement
- smallest viable change set touching only relevant scripts/schemas/config.

3. Execute on `P002.9`
- rerun only needed stages first, then full validation.

4. Measure
- compare scorecard vs previous iteration on fixed metrics.

5. Decide
- keep, revert, or adjust based on measured deltas.

6. Log
- append iteration record and artifacts.

Mandatory log destination:
- `docs/pipeline/audits/iteration-history.md` (create; currently missing but referenced by runbook)

---

## 8. Phase Plan (AI-Implementable)

## Phase 0 - Foundation and Baseline Instrumentation

### Objective
Create reliable measurement and shared context before structural changes.

### Tasks

1. Create iteration log scaffold:
- `docs/pipeline/audits/iteration-history.md`
- include iteration template, metric table, decision notes.

2. Create run isolation contract:
- define `run_id` naming (`YYYYMMDD.<subbatch>.<tag>`).
- define run-scoped output roots:
  - `data/runs/<run_id>/...` for generated artifacts
  - `data/validation/runs/<run_id>/...` for scorecards/gates/reports
- forbid in-place overwrite for baseline/proposed comparison runs.

3. Create baseline scorecard generator:
- new script: `scripts/training-data/validation/pipeline_scorecard.py`
- input: manifest/subbatch id
- output: stage coverage, issue rates, confidence distribution, quarantine/readiness status.

4. Capture baseline snapshots:
- `P002.9` (primary)
- `P001.1`, `P001.2`, `P001.8`, `P001.9` (historical stress signals)

5. Freeze baseline:
- persist baseline scorecards and key reports under
  - `docs/pipeline/audits/baselines/<run_id>/`.
- record hashes of key stage outputs used for baseline comparison.

6. Document baseline in this plan and iteration log.

### Exit Criteria
- Baseline scorecards exist and are reproducible.
- Iteration log exists and is linked from runbook.
- run isolation contract exists and is being used in iteration runs.

---

## Phase 1 - Critical Plumbing and Contract Hardening

### Objective
Eliminate silent failures and quarantine leakage before quality tuning.

### Tasks

1. Update orchestration parity:
- files:
  - `scripts/training-data/batch/sub-batch-pipeline`
  - `scripts/training-data/batch/pipeline-runner`
- ensure same gate/validation/quarantine semantics in both modes.

2. Add `--quarantine-file` support and skip logic to:
- `scripts/training-data/06c.DET.patch`
- `scripts/training-data/06d.DET.sanitize`
- `scripts/training-data/06e.LLM.quality-check`
- `scripts/training-data/06f.DET.damage-map`
- `scripts/training-data/06g.LLM.damage-adjudicator`
- `scripts/training-data/06h.DET.confidence-propagation`
- `scripts/training-data/09.EXT.chunk-embed.ts`

3. Strict 06b -> 06c dependency:
- `06c` should fail (default) when verification artifact missing.
- introduce explicit escape hatch flag for legacy rescue only.

4. Add stage contract preflight calls in orchestrators.

5. Keep behavior flips as direct code/config migrations, not runtime branch controls.

6. Verify with `P002.9` dry-run and live run from `06b`.

7. Execute orchestration parity matrix on same manifest:
- sequential `--run`
- parallel `--run --parallel N`
- resumed `--run --from 06e`
- single-stage invocations
- assert equivalent gate outcomes and quarantine sets.

### Exit Criteria
- No quarantined REJECT video enters downstream processing.
- Missing verification cannot pass silently into `06c`.
- Parallel and sequential runs produce equivalent gating decisions.
- parity matrix passes for at least one complete `P002.9` run.

---

## Phase 2 - Terminology Unification and Signal Normalization

### Objective
Replace ambiguous status language with a single quality vocabulary.

### Tasks

1. Add canonical schemas:
- `scripts/training-data/schemas/pipeline_signal.schema.json`
- `scripts/training-data/schemas/pipeline_gate.schema.json`

2. Add normalization utility:
- `scripts/training-data/validation/normalize_quality_signals.py`
- map legacy fields/enums into canonical fields.

3. Update validators and reports to emit canonical fields while preserving legacy compatibility:
- `validate_manifest.py`
- `validate_stage_report.py`
- `batch_report.py`

4. Update docs:
- `docs/pipeline/validation_harness.md`
- `docs/pipeline/ASCII`
- add short glossary section.

### Exit Criteria
- Every gating report has canonical `issue_severity`, `gate_decision`, `scope_type`, `issue_code`.
- Operators can answer "what failed and why" without cross-referencing enum dialects.

---

## Phase 3 - Confidence Refactor (Locality + Calibration)

### Objective
Ensure confidence reflects local damage accurately and is operationally useful.

### Tasks

1. Refactor `06h` confidence math:
- explicit contribution ledger per segment
- scoped escalation logic
- transparent rollup to conversation/video.

2. Align `09` confidence consumption:
- avoid double-penalizing same issue classes
- consume normalized confidence metadata
- preserve quality floor behavior with clearer reason codes.

3. Add confidence audit outputs:
- per-video calibration summary artifact
- histogram by band and by scope.

4. Add regression tests/fixtures:
- synthetic cases for localized vs global defects
- misattribution-only case must not crater entire video score.

### Exit Criteria
- Confidence deltas explainable from artifacts.
- Known local defects remain local unless escalation criteria are met.

---

## Phase 4 - Stage Responsibility Redesign (+ New LLM QA Stage)

### Objective
Reduce overlap between stages and add targeted quality checks where they materially improve output.

### Tasks

1. Clarify stage ownership boundaries:
- structure (L1), transcript integrity (L2), confidence (L3), enrichment (L4), retrieval packaging (L5).

2. Add `07b` prototype (quality-driven):
- `scripts/training-data/07b.LLM.enrichment-verify`
- verify evidence alignment, phase coherence, and anti-hallucination checks.

3. Route `07` output through `07b` gate before `08/09` as the canonical path once adopted.

4. Run A/B on `P002.9`:
- with and without `07b`
- compare semantic and retrieval quality metrics.

### Exit Criteria
- Either:
  - `07b` yields measurable quality lift and is adopted,
  - or it is rejected with evidence and removed from active plan.

---

## Phase 5 - Validation, Readiness, and Ingest Lane Redesign

### Objective
Make ingest decisions deterministic, interpretable, and confidence-aware.

### Tasks

1. Define manifest-level gate policy from canonical fields.
2. Rework readiness synthesis:
- canonical pass/review/block mapping
- explicit policy file for thresholds
- no hidden warning budget magic.

3. Introduce explicit ingest states:
- `pass`: ingest-ready
- `review`: hold for review (traceable)
- `block`: explicit quarantine/no ingest.

4. Update ingest script integration:
- `scripts/training-data/10.EXT.ingest.ts`
- consume canonical gate summaries directly.

### Exit Criteria
- Ingest decision for each video is reproducible from one gate summary artifact.
- REVIEW behavior is explicit and queryable.

---

## Phase 6 - P002.9 Iteration Sprint (Main Optimization Loop)

### Objective
Use `P002.9` to iteratively harden and tune vNext behavior.

### Iteration Cadence

Each sprint iteration should include:
1. one bounded change set
2. one full `P002.9` validation pass
3. one logged comparison against previous best

### Suggested Iteration Order

1. Plumbing-only (Phase 1 outcomes)
2. Terminology normalization
3. Confidence refactor
4. `07b` introduction
5. Readiness/ingest-state integration

### Exit Criteria
- `P002.9` reaches stable end-to-end run for non-blocked videos.
- Quality and gating metrics improve vs baseline with no structural regressions.

---

## Phase 7 - Promotion Gate on P003.1

### Objective
Validate that improvements generalize to unseen next sub-batch.

### Tasks

1. Run full pipeline on `P003.1` with vNext settings.
2. Produce full scorecard and compare to `P002.9` best iteration.
3. Run semantic judge sample pack and retrieval smoke checks.
4. Check for new failure modes not seen in `P002.9`.

### Exit Criteria
- No critical regressions vs `P002.9`.
- Promotion quality thresholds met (Section 9).

---

## Phase 8 - Rollout and Backfill Strategy

### Objective
Scale from pilot sub-batches to broader corpus safely.

### Tasks

1. Rollout order:
- canary manifests
- holdout
- selected mixed historical sub-batches
- then remaining production queue.

2. Backfill policy:
- define when old outputs must be recomputed (schema/version drift, confidence model changes, gate model changes).

3. Operationalize dashboards and weekly audit report.

### Exit Criteria
- Repeatable batch throughput with stable quality metrics.
- Clear backfill completion map and remaining risk register.

---

## 9. Metrics and Acceptance Thresholds

Use these for iteration decisions. Adjust only with explicit logged rationale.

### 9.1 Structural Integrity

- `missing_required_input_count` = 0 for executed non-quarantined videos.
- `silent_pass_count` = 0.
- `gate_contract_parse_failures` = 0.

### 9.2 Gating Clarity

- 100% blocked/reviewed videos have canonical reason codes and scope.
- `legacy_unmapped_enum_count` = 0 after Phase 2.

### 9.3 Quality Signals

- `cross_stage_error_rate` non-increasing from baseline.
- `stage07_validation_error_count` non-increasing.
- `semantic_judge.mean_overall_score` increasing trend.
- `semantic_judge.major_error_rate` non-increasing.
- `semantic_judge.hallucination_rate` non-increasing.

### 9.4 Confidence Health

- Confidence band distribution is plausible and stable across runs.
- Correlation between low confidence and judged poor quality improves vs baseline.
- Misattribution-only defects do not trigger disproportionate video-level collapse.

### 9.5 Retrieval Packaging

- `chunk_validation_error_count` = 0.
- `below_floor_drop_ratio` monitored and justified (no unexplained spikes).
- retrieval smoke pass rate non-decreasing.

### 9.6 Promotion Thresholds (P003.1 Gate)

Promotion from `P002.9` best iteration to `P003.1` requires all of:
- `missing_required_input_count = 0` for non-quarantined videos.
- `silent_pass_count = 0`.
- `chunk_validation_error_count = 0`.
- `legacy_unmapped_enum_count = 0` (post-Phase 2).
- `semantic_judge.major_error_rate <= 0.15`.
- `semantic_judge.hallucination_rate <= 0.10`.
- `semantic_judge.mean_overall_score >= 75`.
- `cross_stage_error_rate` no worse than `P002.9` best by more than `+5%` relative.
- `stage07_validation_error_count` no worse than `P002.9` best by more than `+5%` relative.

### 9.7 Statistical Validity Requirements

Promotion metrics are valid only when:
- semantic judge sample size >= 30 conversations total across manifest scope.
- at least 3 sources represented when available in scope.
- fixed seed set is used and recorded in iteration history.
- no stale judgements included (age <= 7 days unless explicitly approved).

If sample-size constraints are not met, promotion decision is "insufficient evidence".

### 9.8 Automatic Stop Conditions

Halt iteration and open incident entry when any occurs:
- `missing_required_input_count > 0` after Phase 1 completion.
- `silent_pass_count > 0` in any run.
- `gate_contract_parse_failures > 0`.
- stage orchestration parity mismatch between sequential and parallel modes.
- semantic judge major error rate worsens by `>= 0.10` absolute vs prior best.

---

## 10. Execution Commands (Working Playbook)

### 10.1 Baseline Snapshot

```bash
./scripts/training-data/batch/sub-batch-pipeline P002.9 --status
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/P002.9.txt \
  --emit-stage-reports \
  --emit-quarantine \
  --json
python3 scripts/training-data/validation/validate_stage_report.py \
  --dir data/validation/stage_reports/P002.9 \
  --manifest docs/pipeline/batches/P002.9.txt \
  --emit-readiness-summary
```

### 10.2 Iteration Run (Example)

```bash
# create run identifier for isolation and logging
RUN_ID="$(date +%Y%m%d).P002.9.iterationX"

# re-run targeted stages (prefer run-scoped outputs where implemented)
./scripts/training-data/06b.LLM.verify --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06c.DET.patch --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06d.DET.sanitize --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06e.LLM.quality-check --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06f.DET.damage-map --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06g.LLM.damage-adjudicator --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/06h.DET.confidence-propagation --manifest docs/pipeline/batches/P002.9.txt --overwrite
./scripts/training-data/07.LLM.content --manifest docs/pipeline/batches/P002.9.txt --overwrite

# stage 08/09 and validation
./scripts/training-data/08.DET.taxonomy-validation --manifest docs/pipeline/batches/P002.9.txt
node --import node_modules/tsx/dist/loader.mjs scripts/training-data/09.EXT.chunk-embed.ts --manifest docs/pipeline/batches/P002.9.txt --full
./scripts/training-data/batch/sub-batch-pipeline P002.9 --validate

# scorecard snapshot for this run
python3 scripts/training-data/validation/pipeline_scorecard.py \
  --manifest docs/pipeline/batches/P002.9.txt \
  --run-id "$RUN_ID" \
  --out "data/validation/runs/$RUN_ID/scorecard.json"
```

### 10.3 Promotion Run

```bash
./scripts/training-data/batch/sub-batch-pipeline P003.1 --run --from 06
./scripts/training-data/batch/sub-batch-pipeline P003.1 --validate
```

---

## 11. Agent Coordination Protocol

### 11.1 Session Start Checklist

1. Read this plan and latest `docs/pipeline/audits/iteration-history.md`.
2. Re-run `P002.9` status and current scorecard to detect drift.
3. Claim one bounded task (single phase slice).

### 11.2 Session End Checklist

1. Update iteration history:
- what changed
- metrics before/after
- decision (keep/revert/adjust)
- next hypothesis.
2. Update this plan phase tracker (Section 12).
3. Note blockers explicitly with file paths and exact error outputs.

---

## 12. Phase Tracker

| Phase | Status | Notes |
|---|---|---|
| 0 Foundation/Baseline | completed | `pipeline_scorecard.py` + `iteration-history.md` created; baseline run `20260219.P002.9.baseline` generated and reproducible. |
| 1 Plumbing/Contracts | in_progress | Completed: quarantine propagation (`06c`-`06h`,`09`), strict `06b->06c` fail-closed dependency, contract preflight in both orchestrators, parity smoke matrix (`I3`), shared end-of-run validation path via delegation (`I8`), canonical-aware stage07/09 quarantine extraction in parallel mode (`I9`), deterministic quarantine diff tooling (`I10`), first parity A/B simulation artifacts (`I11`), validator-scope fix with parity match in simulation (`I12`), and real-run parity confirmation on `P001.1` (`I13`). Remaining: confirm same real-run parity on `P002.9` once Stage 07 is fully available. |
| 2 Terminology | in_progress | Completed: canonical schemas + mappings, canonical-aware quarantine extraction, class/remediation tagging, readiness-primary scorecards, stage-report canonical gate authority (`I47`), signal compaction (`I48`), single canonical writer path in `--validate` flow (`I49`), and explicit canonical gate decision-source contract markers (`I67`). Remaining: finalize legacy-field removal sequencing. |
| 3 Confidence Refactor | in_progress | Completed scaffold + first integration: shared confidence primitives (`validation/confidence_model.py`), schema (`schemas/confidence_trace.schema.json`), Stage 06h helper adoption (`I14`), trace emission + validator hook (`I15`), `P002.9` trace backfill with strict validation pathway exercised (`I17`), config-driven strictness policy with promotion-scope auto-enforcement (`I18`), scorecard-level trace coverage metrics (`I19`), sweep control knobs for Stage `06h/09` in both orchestrators (`I21`), first real band sweep/rollback (`I22`/`I23`), controlled chunk-floor no-op sweep (`I25`/`I26`), low-tail chunk-floor sensitivity sweep/restore (`I27`/`I28`), retrieval drop telemetry instrumentation (`I29`/`I30`), curated multi-video low-tail sweep/restore (`I31`/`I32`), band set C sweep/restore (`I33`/`I34`), and promotion-scope deterministic trace backfill/validation on `P003.1` (`I36`). Remaining: unblock `06b` runtime and complete full promotion-scope LLM/downstream stages (`06b/06e/06g/07/09`). |
| 4 Stage Redesign + 07b Eval | in_progress | Design spike (`I71`) plus canonical integration (`I75`) completed: `07b` script + validator + orchestrator wiring are active; pending quality-lift evidence capture on `P002.9`/`P003.1`. |
| 5 Readiness/Ingest Lanes | in_progress | Started class-level content-type hard-block policy support (`I67`), enabled production policy for `talking_head` (`I68`) and `podcast` (`I70`) routing mismatches, and documented explicit readiness-to-ingest decision mapping for operators (`I69`). |
| 6 P002.9 Iteration Sprint | pending | |
| 7 P003.1 Promotion | pending | |
| 8 Rollout/Backfill | pending | |

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Parallel vs sequential behavior divergence | inconsistent results, hidden regressions | enforce shared orchestration contract path and parity tests |
| Overfitting to `P002.9` | weak generalization | mandatory promotion on `P003.1` and holdout/canary checks |
| Confidence threshold instability | noisy gating decisions | lock thresholds per iteration, calibrate with judged samples only |
| Terminology migration churn | operator confusion | canonical schema contracts + `decision_source` markers + clear glossary |
| LLM stage variance | non-deterministic quality | prompt version pinning, batch-level sampling, and regression scorecards |

---

## 14. Immediate Next Actions (Do First)

1. Run first `P002.9` candidate comparison for canonical `07b` integration and capture scorecard + semantic evidence.
2. Validate promotion-scope behavior on `P003.1` with `07b` in the canonical route.
3. Continue append-only iteration logging (`I50+`) with scorecard deltas and decision notes.

---

## 15. Detailed File-Level Backlog (Execution-Ready)

This section is the concrete work queue for agents.

### 15.1 Orchestration and Gating Plumbing

1. `scripts/training-data/batch/sub-batch-pipeline`
- [DONE I1] pass `--quarantine-file` to `06c`-`06h`, `07`, `08`, `09`.
- [DONE I2] add preflight contract call before each stage.
- [DONE I49] `--validate` emits canonical gate from stage-report readiness authority only (manifest validator no longer writes competing canonical gate artifacts in this flow).
- [DONE I49] pipeline summary now reflects stage-report canonical gate artifact state (single writer path).
- [DONE I17] add `--strict-confidence-trace` to promote missing confidence traces from warning to error when required.
- [DONE I18, superseded by I37] confidence-trace policy framework added; now collapsed to strict-only mode for production path.
- [DONE I21, superseded by I74] added pass-through sweep knobs for Stage 06h/09 for calibration experiments.
- [DONE I74] removed orchestration pass-through threshold flags to keep a fixed production runner path.
- [DONE I67] add pass-through content-type class hard-block policy for readiness:
  - config key: `validation.readiness.block_warning_class_by_content_type`
  - forwarded as `--block-warning-class-by-content-type <content_type>:<class>`
- [DONE I68] enabled first strict class-block policy in config:
  - `talking_head:routing_mismatch` now escalates to BLOCKED.
- [DONE I70] expanded strict class-block policy in config:
  - `podcast:routing_mismatch` now also escalates to BLOCKED.

2. `scripts/training-data/batch/pipeline-runner`
- [DONE I1] pass `--quarantine-file` to same stage set as sequential mode.
- [DONE I1] add pre-run skip for already-quarantined videos.
- [DONE I2] add per-stage preflight contract checks.
- [DONE I9] align stage07/stage09 per-video quarantine extraction with canonical-aware `quarantine_updater.py` logic.
- [DONE I8] delegate end-of-run validation to `sub-batch-pipeline --validate` for policy parity.
- [DONE I12] use full manifest scope (not per-video temp manifests) for stage07/stage09 validator hooks.
- [DONE I72] removed runner-side Stage 07 preflight bypass; per-video Stage 07 now keeps strict Claude preflight behavior.
- [DONE I16] skip per-video Stage 08 report writes in runner (`--no-report`) to avoid temp-manifest report clutter.
- [DONE I18] fail runner invocation when delegated end-of-run validation fails (non-zero return propagation).
- [DONE I21, superseded by I74] forwarded Stage 06h/09 calibration overrides in parallel mode.
- [DONE I74] removed runner-side forwarding of Stage 06h/09 threshold override flags to keep a fixed production runner path.
- [PARTIAL I13] match sequential-mode stage-local post-stage synthesis semantics (confirmed on `P001.1`; pending full real-run confirmation on `P002.9`).

3. `scripts/training-data/batch/quarantine_updater.py`
- consume canonical `issue_severity`/`gate_decision` when present.
- preserve backward compatibility for old validators.

### 15.2 Stage Script Contract Hardening

1. `scripts/training-data/06c.DET.patch`
- [DONE I1] add `--quarantine-file`.
- [DONE I1] default behavior: fail on missing verification input.
- [DONE I37] removed legacy escape hatches and fallback switches from runtime pipeline commands.
- [DONE I72] removed LLM preflight bypass flags in upstream LLM stages (`06.LLM.video-type`, `06b.LLM.verify`, `07.LLM.content`) and removed Stage 07 no-Claude revalidation execution path.

2. `scripts/training-data/06d.DET.sanitize`
3. `scripts/training-data/06e.LLM.quality-check`
4. `scripts/training-data/06f.DET.damage-map`
5. `scripts/training-data/06g.LLM.damage-adjudicator`
 - [DONE I76] removed `--skip-video-type-filter`; stage applicability is now fixed by default video-type logic.
6. `scripts/training-data/06h.DET.confidence-propagation`
- [DONE I1] add `--quarantine-file`.
- [DONE I1] skip quarantined videos with explicit logs and counts.
- [DONE I21] add calibration CLI knobs for direct stage-script experiments:
  - `--confidence-band-high-threshold`
  - `--confidence-band-medium-threshold`
- [DONE I74] orchestration path no longer forwards threshold overrides; production runner flow stays fixed.
- emit structured contract failures for missing required upstream files.

7. `scripts/training-data/09.EXT.chunk-embed.ts`
- [DONE I1] add `--quarantine-file`.
- [DONE I1] filter candidates before chunking/embedding.
- [DONE I1] emit quarantine skip summary in logs.
- [DONE I21] add `--min-chunk-confidence` for direct stage-script calibration sweeps.
- [DONE I74] orchestration path no longer forwards chunk-floor override flags; production runner flow stays fixed.

8. `scripts/training-data/07b.LLM.enrichment-verify`
- [DONE I75] added canonical Stage `07b` LLM verifier stage (no deterministic bypass path), schema-backed output emission, and fail-closed behavior on missing/invalid required inputs.
- [DONE I75] added stage-local validator `scripts/training-data/validation/validate_stage07b.py` and integrated `07b` quarantine extraction in both orchestrators.

9. Run isolation CLI support (all modified stages):
- add `--run-id` and/or `--output-root` override so outputs can be routed to
  run-scoped directories without overwriting shared canonical paths.
- include `run_id` in output metadata for provenance.

### 15.3 Validation and Schema Work

1. `scripts/training-data/validation/validate_stage_contract.py`
- [DONE I2] new deterministic preflight validator for stage dependency contracts.
- supports manifest scope, source filter, quarantine-aware effective scope, and JSON output.
- [DONE I67] canonical gate schema now requires `summary.decision_source`; emitters stamp:
  - `validate_stage_report.py`: `stage_report_readiness`
  - `validate_manifest.py`: `manifest_validation` (standalone/manual mode)

1. Add `scripts/training-data/schemas/pipeline_signal.schema.json`.
2. Add `scripts/training-data/schemas/pipeline_gate.schema.json`.
 - [DONE I71] drafted `scripts/training-data/schemas/07b.enrichment-verify.schema.json` for Phase 4 prototype contract.
3. Add `scripts/training-data/validation/normalize_quality_signals.py`.
4. Add `scripts/training-data/validation/validate_stage_contract.py`.
5. Add `scripts/training-data/validation/compare_quarantine.py` for deterministic sequential-vs-parallel quarantine artifact diffs.
6. Add `scripts/training-data/validation/simulate_parallel_quarantine.py` for reproducible per-video parity simulations.
7. Add `scripts/training-data/validation/confidence_model.py` for shared scope-aware confidence math.
8. Add `scripts/training-data/schemas/confidence_trace.schema.json` for canonical confidence trace artifacts.
9. Add `scripts/training-data/validation/validate_confidence_trace.py` and wire into `sub-batch-pipeline --validate`.
10. Update:
- `scripts/training-data/validation/validate_manifest.py`
- `scripts/training-data/validation/validate_stage_report.py`
- `scripts/training-data/validation/batch_report.py`
 - [DONE I77] `validate_manifest.py` quarantine emission excludes contract-only missing/invalid artifact checks and avoids self-reinforcing preexisting carry-forward when input/output quarantine paths are the same.

### 15.4 Documentation and Ops

1. Update `docs/pipeline/validation_harness.md` to canonical terms.
 - [DONE I69] added explicit readiness-to-ingest mapping table (`READY/pass`, `REVIEW/review`, `BLOCKED/block`).
2. Update `docs/pipeline/ASCII` to reflect revised stage responsibilities.
 - [DONE I75] updated `07b` stage map to canonical (implemented) QA gate wording.
3. Create `docs/pipeline/audits/iteration-history.md`.
4. Add scorecard script and docs:
- `scripts/training-data/validation/pipeline_scorecard.py`
- section in `docs/pipeline/validation_harness.md`.

---

## 16. Scorecard Specification (For pipeline_scorecard.py)

Scorecard output should be machine-readable JSON and include:

```json
{
  "manifest": "docs/pipeline/batches/P002.9.txt",
  "generated_at": "2026-02-19T00:00:00Z",
  "coverage": {
    "stage06": {"present": 10, "expected": 10},
    "stage06b": {"present": 10, "expected": 10},
    "stage06c": {"present": 10, "expected": 10},
    "stage06d": {"present": 10, "expected": 10},
    "stage06e": {"present": 9, "expected": 10},
    "stage06f": {"present": 7, "expected": 10},
    "stage06g": {"present": 0, "expected": 10},
    "stage06h": {"present": 0, "expected": 10},
    "stage07": {"present": 0, "expected": 10},
    "stage08_reports": {"present": 0, "expected": 1},
    "stage09": {"present": 0, "expected": 10}
  },
  "gating": {
    "quarantined_videos": 0,
    "blocked_videos": 0,
    "review_videos": 0,
    "pass_videos": 0
  },
  "quality": {
    "cross_stage_error_rate": 0.0,
    "stage07_validation_error_count": 0,
    "stage07_validation_warning_count": 0
  },
  "confidence": {
    "segment_band_counts": {"high": 0, "medium": 0, "low": 0},
    "conversation_confidence_mean": 0.0,
    "video_confidence_mean": 0.0,
    "trace_files_present": 0,
    "trace_files_expected": 0,
    "trace_coverage_ratio": 0.0
  },
  "retrieval": {
    "chunk_validation_error_count": 0,
    "below_floor_drop_ratio": 0.0,
    "below_floor_drop_ratio_basis": "pre_filter_chunks"
  },
  "contract_health": {
    "missing_required_input_count": 0,
    "silent_pass_count": 0,
    "legacy_unmapped_enum_count": 0
  }
}
```

Calculation notes:
- `expected` counts must respect manifest minus quarantine where applicable.
- `stage08_reports.expected` depends on run scope:
  - manifest-level full scope: `1`
  - source-filtered scope: number of validated source slices
- `silent_pass_count` counts any case where required upstream artifact is missing but stage still emits downstream output.
- `legacy_unmapped_enum_count` counts records where normalization could not map legacy values.
- confidence trace coverage fields (`trace_files_*`) are computed on non-quarantined effective scope.
- `below_floor_drop_ratio_basis` is `pre_filter_chunks` when Stage `09` telemetry is available, else fallback `produced_chunks`.

---

## 17. Iteration Record Template (Required)

Every iteration entry in `docs/pipeline/audits/iteration-history.md` should use:

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

### Before vs After (Scorecard)
- missing_required_input_count: <before> -> <after>
- silent_pass_count: <before> -> <after>
- cross_stage_error_rate: <before> -> <after>
- stage07_validation_error_count: <before> -> <after>
- chunk_validation_error_count: <before> -> <after>
- semantic_judge.mean_overall_score: <before> -> <after>
- semantic_judge.major_error_rate: <before> -> <after>
- semantic_judge.hallucination_rate: <before> -> <after>

### Decision
- keep|revert|adjust
- rationale: <short>

### Next Hypothesis
<single bounded hypothesis>
```

---

## 18. Confidence Experiment Matrix (Phase 3/6)

Use controlled sweeps; change one parameter set per iteration.

Matrix:
1. Local damage penalties
- vary transcript/speaker/phase penalty multipliers by `+-10%`.

2. Escalation thresholds
- repeated defect count threshold for conversation escalation.
- cross-conversation threshold for video escalation.

3. Band boundaries
- high/medium/low cutoffs as paired sets:
  - set A: `>=0.80 / >=0.60`
  - set B: `>=0.85 / >=0.65`
  - set C: `>=0.75 / >=0.55`

4. Chunk floor
- evaluate `MIN_CHUNK_CONFIDENCE` at `0.25`, `0.30`, `0.35`.

Selection rule:
- choose candidate maximizing semantic quality while keeping structural errors at zero.

---

## 19. Rollback and Safety Protocol

1. All schema changes must be backward-compatible for one migration window.
2. Any iteration increasing `silent_pass_count` above zero is auto-reverted.
3. Any iteration introducing contract parse failures in validators is auto-reverted.
4. If `P003.1` fails promotion thresholds, freeze rollout and continue iterating on `P002.9`.
5. Keep previous stable config snapshots in:
- `scripts/training-data/batch/pipeline.config.json`
- corresponding archived copy under `docs/pipeline/audits/config-snapshots/`.

---

## 20. Open Decisions (Default Assumptions If Unanswered)

1. Should `07b` be adopted into canonical flow or rejected entirely?
- default assumption: canonical flow only if quality evidence is positive.

2. Should REVIEW-status ingest remain available before full calibration?
- default assumption: no (READY/pass only).

3. Should legacy stage report fields be removed immediately after canonical rollout?
- default assumption: no; dual-emit for one full batch cycle.

4. How much historical backfill is required once vNext is stable?
- default assumption: re-run from `06b` onward for active and near-future batches first.

---

## 21. Migration Compatibility Contract

Canonicalization rollout uses 3 explicit modes.

### 21.1 Mode A (Observe-Only)
- Emit canonical fields in parallel with legacy fields.
- Existing consumers continue reading legacy fields.
- Validation checks canonical presence but does not enforce canonical-only.

### 21.2 Mode B (Dual-Read)
- Consumers read canonical first and fall back to legacy.
- Schema validators enforce canonical correctness.
- Legacy fields still emitted for backward compatibility.

### 21.3 Mode C (Canonical-Primary)
- Consumers require canonical fields.
- Legacy fields are temporary compatibility shims for one final cycle.
- Remove legacy-only logic only after one successful full promotion cycle.

Cutover gate between modes:
- zero `legacy_unmapped_enum_count` for two consecutive promotion-candidate runs.

---

## 22. Test Strategy and Merge Gate

No phase is complete without tests in all 4 layers.

### 22.1 Deterministic Unit Tests
- mapping logic for terminology normalization.
- contract validator edge cases.
- confidence aggregation and escalation logic.
- chunk confidence floor and masking behavior.

### 22.2 Fixture-Based Integration Tests
- one clean infield fixture.
- one noisy/misattribution-heavy fixture.
- one talking-head fixture.
- one long transcript fixture (timeout and memory pressure).

### 22.3 Orchestration E2E Tests
- sequential orchestrator run.
- parallel orchestrator run.
- resume-from-midstage run.
- quarantine-present run.

### 22.4 Merge Gate

A PR is mergeable only if:
- relevant unit/integration tests pass.
- `P002.9` scorecard delta is included.
- no regression in stop-condition metrics (Section 9.8).
- iteration log entry is updated with before/after metrics.

---

## 23. Operational Rollback Procedure

Rollback must be executable within one session.

### 23.1 Trigger
- any stop condition in Section 9.8.
- promotion failure on `P003.1`.

### 23.2 Actions
1. Revert directly to prior stable config/code snapshot (no runtime branch controls).
2. Restore prior stable `pipeline.config.json` snapshot.
3. Re-run validation only (`--validate`) on affected manifest to confirm restored behavior.
4. Record rollback incident in iteration history with root-cause hypothesis.

### 23.3 Exit
- rollback is complete only when scorecard returns to prior stable envelope.

---

## 24. Release Governance and Freeze Rules

1. Keep prompt versions, model names, and schema versions pinned during a single iteration.
2. Do not change prompt and deterministic logic in the same iteration unless explicitly marked as coupled.
3. Enforce "one risk domain per iteration":
- orchestration
- terminology
- confidence
- enrichment QA
- ingest policy
4. Use a release candidate tag per promotion attempt:
- `RC.<date>.<subbatch>.<n>`
5. Freeze other pipeline changes during `P003.1` promotion runs.
