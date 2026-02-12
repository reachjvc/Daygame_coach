# Pipeline Validation Harness (Branch Work)

This repo has a small validation harness to sanity-check pipeline artifacts for a batch/sub-batch manifest (e.g. `docs/pipeline/batches/P001.1.txt`).

## One Command (Recommended)

Run validations + a manifest-filtered batch report:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --validate-deep
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --waiver-file docs/pipeline/waivers/P001.1.json
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --emit-stage-reports
```

This is read-only: it does not call the LLM and does not modify pipeline artifacts.
`--validate-deep` enables both Stage 08 report integrity and Stage 09 chunk payload checks.

## Typical Test Loop (LLM + Validate)

If you want to see whether **output quality improved**, you need to re-run the LLM stages (Claude) and then validate:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 06b
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 06c
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 07
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate
```

## Advanced

The manifest validator can be run directly:

```bash
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --json
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --check-stage09-chunks
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --check-stage08-report
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --waiver-file docs/pipeline/waivers/P001.1.json
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --emit-stage-reports
```

With `--check-stage09-chunks`, the harness also enforces Stage 09 chunk contract integrity:
- stable `sourceKey`/`videoId`/`channel` alignment
- finite + consistent embedding dimensions
- `chunkIndex`/`totalChunks` bounds, dedupe, and continuity checks

With `--check-stage08-report`, the harness requires a valid manifest-scoped Stage 08 report and fails if that report is malformed, mismatched, or `FAIL`.
The Stage 08 report gate also treats unreadable Stage 07 outputs or incomplete manifest coverage as blocking.
Stage 10 additionally verifies that Stage 08 report manifest coverage size matches the ingest manifest scope (`--source` aware).
`--waiver-file` can downgrade specific known issues (by `video_id` + `check`) to `info` while preserving audit visibility.
When using `sub-batch-pipeline --validate`, a waiver file at `docs/pipeline/waivers/<subbatch>.json` is auto-detected.
`--emit-stage-reports` writes per-video stage-report artifacts under `data/validation/stage_reports/<manifest>/`.

Stage-report contract tooling:

```bash
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1
python3 scripts/training-data/validation/validate_stage_report.py --file data/validation/stage_reports/P001.1/abc123XYZ99.manifest-validation.report.json
```

Contract files:
- `scripts/training-data/schemas/stage_report.schema.json`
- `scripts/training-data/schemas/waiver.schema.json`

Cross-stage checks can also be run directly:

```bash
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt --json
```

In manifest mode, `validate_cross_stage.py` now emits explicit coverage errors/warnings per manifest entry (missing Stage 06/06c, missing Stage 07, source mismatch, root-flat ambiguity) instead of only reporting generic missing pairs.
In `--source`/`--all` mode, it now exits non-zero when stage artifacts exist but no pairs can be resolved (layout/source mismatch or missing `video_id` metadata).
