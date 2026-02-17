# Pipeline Validation Harness

Validation runs **automatically** during pipeline execution. Post-stage hooks fire after stages 06b, 07, and 09; end-of-run validation covers manifest integrity, stage reports, and batch statistics.

All thresholds and policies are configured in `scripts/training-data/batch/pipeline.config.json`.

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

End-of-run validation: `validate_manifest.py` + `validate_stage_report.py` + `batch_report.py`

Failing videos are quarantined and skipped in subsequent stages. Pipeline continues with remaining good videos.

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

This is read-only: no LLM calls, no artifact modification. Deep checks (Stage 05 audio, Stage 08 report, Stage 09 chunks), stage reports, and quarantine emission are always on.

## Configuration

All validation thresholds live in `pipeline.config.json`:

```json
{
  "validation": {
    "quarantine_level": "error",
    "readiness": {
      "allow_review_ingest": false,
      "max_warning_checks": 3,
      "max_warning_checks_by_type": {
        "transcript_artifact": 1,
        "evidence_mismatch": 0,
        "evidence_not_on_referenced_segment": 0
      },
      "block_warning_checks": []
    }
  }
}
```

Readiness warning-budget behavior:
- `stage07_validation_warnings` is expanded into per-warning-type counts (e.g. `transcript_artifact`, `evidence_mismatch`)
- Contextual warnings (`missing_stage01_audio`, `stage08_validation_warning`, `stage08_video_warning`, `stage07_normalization_repairs`) are excluded from the generic budget
- Contextual warnings do not downgrade readiness from `READY` to `REVIEW` by themselves
- Contextual checks can still be enforced via `block_warning_checks` in config

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
- `07.LLM.content`: `--input-root`, `--verification-root`

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
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1 --manifest docs/pipeline/batches/P001.1.txt --emit-readiness-summary
```

Key flags: `--allow-review-ingest`, `--max-warning-checks`, `--max-warning-check <check>=<n>`, `--block-warning-check`

### validate_chunks.py

```bash
python3 scripts/training-data/validation/validate_chunks.py --manifest docs/pipeline/batches/P001.1.txt --json
```

### Stage 10 ingest (manual only)

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.EXT.ingest.ts --manifest docs/pipeline/batches/P001.1.txt --dry-run
```

Stage 10 requires explicit user approval. The pipeline never auto-ingests.

Contract files:
- `scripts/training-data/schemas/stage_report.schema.json`
- `scripts/training-data/schemas/waiver.schema.json`
