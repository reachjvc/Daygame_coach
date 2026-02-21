# Stage 07b Enrichment Verification

Status: implemented in canonical orchestration path (`07 -> 07b -> 08 -> 09`).

Policy constraint:
- Stage `07b` must not include deterministic/heuristic/fallback execution branches that bypass required LLM verification calls.
- If LLM preflight/call fails, Stage `07b` should fail closed for that run scope.
- In this environment, required Claude LLM calls for Stage `07b` must run outside sandbox restrictions.
- Stage routing is fixed-path in canonical orchestration (`07 -> 07b -> 08 -> 09`); no runtime skip toggles.

## Purpose

Stage `07b` is an LLM quality-first verifier that runs after Stage `07` enrichment and before `08/09`.

Goal:
- reduce enrichment hallucinations and weak evidence claims before chunking/ingest.
- produce machine-readable block/review/pass reasons that plug into existing canonical gate flow.

## Inputs

- Stage `07` enriched artifact:
  - `data/07.LLM.content/<source>/<video>/*.enriched.json`
  - contract note: each enrichment row should provide `evidence_segment_ids` populated from upstream Stage `07` segment anchors.
- Stage `06c` conversations artifact:
  - `data/06c.DET.patched/<source>/<video>/*.conversations.json`
- Stage `06e` quality-check artifact (required in canonical path):
  - `data/06e.LLM.quality-check/<source>/<video>/*.quality-check.json`
- Waivers:
  - `docs/pipeline/waivers/<manifest>.json`

## Output Artifact

Output path:
- `data/07b.LLM.enrichment-verify/<source>/<video>/*.enrichment-verify.json`

Schema:
- `scripts/training-data/schemas/07b.enrichment-verify.schema.json`

Core fields:
- `status`: `PASS|WARN|FAIL`
- `gate_decision`: `pass|review|block`
- `reason_code`: stable machine reason for final status
- `checks[]`: deterministic check rows
- `issues[]`: canonical issue rows (`issue_code`, `issue_severity`, `gate_decision`, `signal_class`, `remediation_path`)

## Check Set

Current check set:
- `evidence_alignment_mismatch`:
  - enriched claim references segment(s) that do not support the claim.
- `phase_coherence_violation`:
  - impossible or contradictory phase transition sequence.
- `hallucinated_concept_claim`:
  - claimed concept/technique has no traceable evidence in source transcript/evidence windows.
- `unsafe_repair_overreach`:
  - normalized/repair text materially changes semantic intent beyond allowed bounds.
- `low_support_density`:
  - too many high-impact claims relative to explicit evidence anchors.

## Fail / Waive Semantics

Default policy:
- `FAIL` (`gate_decision=block`):
  - any unwaived `error` check.
  - or contract violations (missing required inputs, unreadable JSON).
- `WARN` (`gate_decision=review`):
  - warning-level quality risk without blocking contract failures.
- `PASS` (`gate_decision=pass`):
  - no blocking/review-triggering checks.

Waivers:
- Waiver may downgrade specific checks from `block/review` to informational context.
- Waivers must be explicit by check code and traceable in:
  - `waivers_applied[]`
  - `issues[].waived=true` + `waiver_note`
- No implicit waivers. Missing waiver files must not silently relax checks.

## Orchestration Integration

Canonical wiring:
1. Stage script:
   - `scripts/training-data/07b.LLM.enrichment-verify`
2. Orchestrator stage slot:
   - `scripts/training-data/batch/sub-batch-pipeline`
   - `scripts/training-data/batch/pipeline-runner`
3. Route:
   - `07 -> 07b -> 08 -> 09`
4. Stage-local validation + quarantine feed:
   - `scripts/training-data/validation/validate_stage07b.py`
   - `scripts/training-data/batch/quarantine_updater.py --stage 07b`

## Evaluation Strategy

`07b` now runs in canonical flow. Ongoing evaluation compares quality outcomes against prior `I73`/`I74` baselines on `P002.9` and promotion scope `P003.1`.

## Operational Criteria

- Output shape validates against `07b` schema.
- Stage-local validator emits canonical issue rows for quarantine extraction.
- Block decisions quarantine videos before Stage `08/09`.
- Validation + scorecard runs remain regression-free on `P002.9` and `P003.1`.
