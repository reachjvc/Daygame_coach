# Pipeline Validation Harness

Validation runs **automatically** during pipeline execution. Post-stage hooks fire after stages 06b, 07, and 09; end-of-run validation covers manifest integrity, stage reports, and batch statistics.

All thresholds and policies are configured in `scripts/training-data/batch/pipeline.config.json`.

## Plain Terms

- `content type`: Stage 06 category (`infield`, `talking_head`, `podcast`, `compilation`).
- `signal class`: normalized warning/error class (for example `transcript_quality`, `routing_mismatch`).
- `remediation path`: normalized next-action path for a signal (for example `transcript_review`, `contract_repair`).
- `gate decision`: final per-video status:
  - `pass`: ingest-ready
  - `review`: hold for review
  - `block`: do not ingest
- `canonical gate`: machine-readable file with final per-video gate decisions (`data/validation/gates/<subbatch>.gate.json`).
- `ingest status` (Stage 10 metadata): per-chunk split (`pass` or `review`) driven by chunk confidence threshold.

## Running the Pipeline (Validation Included)

```bash
# Full pipeline (stages 06→09) with automatic validation + summary
./sub-batch-pipeline P001.1 --run

# Resume from a specific stage
./sub-batch-pipeline P001.1 --run --from 07

# Run all incomplete sub-batches in a batch
./sub-batch-pipeline P001 --run-all
./sub-batch-pipeline P001 --run-all --count 3

# Run a single stage (post-stage validation still fires)
./sub-batch-pipeline P001.1 --stage 06
```

Post-stage validation hooks:
| After stage | What runs | Quarantine on |
|-------------|-----------|---------------|
| 06b | Check verification verdicts | REJECT verdict |
| 07 | `validate_cross_stage.py` | error-severity issues |
| 09 | `validate_chunks.py` | error-severity issues |

Stage 07/09 validator JSON now emits canonical signal fields per issue:
- `issue_code`, `issue_severity`, `gate_decision`, `signal_class`, `remediation_path`
- quarantine extraction for validator payloads is canonical-field driven.

End-of-run validation: `validate_manifest.py` + `validate_confidence_trace.py` + `validate_stage_report.py` + `batch_report.py`

Canonical gate authority in this flow:
- `validate_manifest.py`: emits stage reports + quarantine context.
- `validate_stage_report.py`: emits readiness summary and the final canonical gate (`data/validation/gates/<subbatch>.gate.json`).

Failing videos are quarantined and skipped in subsequent stages. Pipeline continues with remaining good videos.
In parallel runner mode, delegated end-of-run validation failures now propagate as non-zero runner exit status.

## Standalone Validation

```bash
# Run validation-only (no stage execution)
./sub-batch-pipeline P001.1 --validate

# Validate one source only
./sub-batch-pipeline P001.1 --validate --source coach_kyle_how_to_approach_a_girl

# With explicit quarantine/waiver files (auto-detected by default)
./sub-batch-pipeline P001.1 --validate --quarantine-file data/validation/quarantine/P001.1.json
./sub-batch-pipeline P001.1 --validate --waiver-file docs/pipeline/waivers/P001.1.json

```

This is deterministic validation only: no LLM calls. Validation artifacts are refreshed (`stage_reports`, `readiness-summary`, `quarantine`, canonical gate).
Deep checks (Stage 05 audio, Stage 08 report, Stage 09 chunks), stage reports, and quarantine emission are always on.
Stage 08 contract checks are strict-only: no legacy path/scope fallback is accepted.

## Configuration

All validation thresholds live in `pipeline.config.json`:

```json
{
  "validation": {
    "quarantine_level": "error",
    "readiness": {
      "max_warning_checks": 10,
      "max_warning_checks_by_type": {
        "evidence_mismatch": 0,
        "evidence_not_on_referenced_segment": 0
      },
      "block_warning_checks": [],
      "max_warning_checks_by_class": {
        "transcript_quality": 12,
        "routing_mismatch": 2
      },
      "review_warning_class_budget_by_content_type": {
        "infield": {
          "transcript_quality": 4
        },
        "talking_head": {
          "transcript_quality": 1,
          "routing_mismatch": 0
        }
      },
      "block_warning_classes": []
    }
  }
}
```

Readiness warning-budget behavior:
- `stage07_validation_warnings` is expanded into per-warning-type counts (e.g. `transcript_artifact`, `evidence_mismatch`)
- Class-level policies are supported (`max_warning_checks_by_class`, `block_warning_classes`)
- Content-type review budgets are supported (`review_warning_class_budget_by_content_type`)
- Readiness output now includes applied budget context per video:
  - `videos[].check_counts.content_type_review_budget`
- Contextual warnings (`missing_stage01_audio`, `stage08_validation_warning`, `stage08_video_warning`, `stage07_normalization_repairs`) are excluded from the generic budget
- Contextual warnings do not downgrade readiness from `READY` to `REVIEW` by themselves
- Contextual checks can still be enforced via `block_warning_checks` in config

Confidence-trace policy behavior:
- strict-only: missing `*.confidence.trace.json` is a hard error.

## Re-run Loop (LLM + Validate)

Stage scripts skip existing outputs unless `--overwrite` is supplied. To re-run LLM stages and validate:

```bash
./sub-batch-pipeline P001.1 --stage 06b
./sub-batch-pipeline P001.1 --stage 06c
./sub-batch-pipeline P001.1 --stage 07
./sub-batch-pipeline P001.1 --validate
```

For isolated experiment runs, root overrides are available on the stage scripts directly:
- `06c.DET.patch`: `--input-root`, `--verification-root`
- `07.LLM.content`: `--input-root`

Calibration sweep knobs (orchestrator pass-through):
- Stage `06h` confidence banding:
  - `--confidence-band-high-threshold <0..1>`
  - `--confidence-band-medium-threshold <0..1>`
- Stage `09` chunk confidence floor:
  - `--min-chunk-confidence <0..1>`

Example:

```bash
./sub-batch-pipeline P002.9 --run --from 06h \
  --confidence-band-high-threshold 0.85 \
  --confidence-band-medium-threshold 0.65 \
  --min-chunk-confidence 0.35
```

Stage `09` chunks now include floor telemetry for auditability:
- `minChunkConfidence`
- `preFilterChunkCount`
- `droppedChunksBelowFloor`

`pipeline_scorecard.py` uses this telemetry for `retrieval.below_floor_drop_ratio` when present (`below_floor_drop_ratio_basis = pre_filter_chunks`).

## Advanced: Direct Script Usage

The underlying validation scripts accept their own flags for manual debugging. In normal use, `sub-batch-pipeline` calls these automatically with config-driven arguments.

### validate_manifest.py

```bash
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --json
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --source <name>
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --check-stage05-audio --check-stage08-report --check-stage09-chunks
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --emit-quarantine --emit-stage-reports
```

Key flags: `--quarantine-level`, `--quarantine-file`, `--waiver-file`, `--skip-stage01-presence`

### validate_cross_stage.py

```bash
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt --json
```

### validate_stage_report.py

```bash
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1 --manifest docs/pipeline/batches/P001.1.txt --emit-readiness-summary --emit-canonical-gate
```

Key flags: `--max-warning-checks`, `--max-warning-check <check>=<n>`, `--max-warning-class <class>=<n>`, `--review-warning-class-budget-by-content-type <content_type>:<class>=<n>`, `--block-warning-check`, `--block-warning-class`, `--emit-canonical-gate`

### validate_chunks.py

```bash
python3 scripts/training-data/validation/validate_chunks.py --manifest docs/pipeline/batches/P001.1.txt --json
```

### Stage 10 ingest (manual only)

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/P001.1.txt --dry-run
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/P001.1.txt --include-review
```

Stage 10 requires explicit user approval. The pipeline never auto-ingests.
Stage 10 ingest expects canonical Stage 09 metadata keys (`chunk_confidence_score`, `damaged_segment_ids`, `contains_repaired_text`) and strict Stage 08 scope metadata.

Contract files:
- `scripts/training-data/schemas/stage_report.schema.json`
- `scripts/training-data/schemas/waiver.schema.json`
