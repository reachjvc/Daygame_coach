# Pipeline Validation Harness (Branch Work)

This repo has a small validation harness to sanity-check pipeline artifacts for a batch/sub-batch manifest (e.g. `docs/pipeline/batches/P001.1.txt`).
Stage 06b verification payload shape is checked by default (verdict/ID/confidence contract sanity).

## One Command (Recommended)

Run validations + a manifest-filtered batch report:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --validate-deep
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --check-stage05-audio
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --source coach_kyle_how_to_approach_a_girl
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --stage07-gate-policy allow_flag
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --emit-quarantine
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --quarantine-file data/validation/quarantine/P001.1.json
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --waiver-file docs/pipeline/waivers/P001.1.json
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate --emit-stage-reports
```

This is read-only: it does not call the LLM and does not modify pipeline artifacts.
`--validate-deep` enables Stage 05 audio_features, Stage 08 report, and Stage 09 chunk payload checks.
With `--emit-stage-reports`, the orchestrator now also validates emitted stage-report contract coverage for the manifest and writes a readiness summary.

## Typical Test Loop (LLM + Validate)

If you want to see whether **output quality improved**, you need to re-run the LLM stages (Claude) and then validate:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 06b
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 06c
./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 07
# Optional: skip quarantined videos while running Stage 07
# ./scripts/training-data/batch/sub-batch-pipeline P001.1 --stage 07 --quarantine-file data/validation/quarantine/P001.1.json
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate
```

## Advanced

The manifest validator can be run directly:

```bash
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --json
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --source coach_kyle_how_to_approach_a_girl
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --stage07-gate-policy allow_flag
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --emit-quarantine
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --emit-quarantine --quarantine-level warning
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --quarantine-file data/validation/quarantine/P001.1.json
python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/P001.1.txt --check-stage05-audio
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
When `--source` is also set, the expected Stage 08 report path is source-scoped (`<manifest>.<source>.report.json`) and scope metadata is validated.
The Stage 08 report gate also treats unreadable Stage 07 outputs or incomplete manifest coverage as blocking.
Stage 10 additionally verifies that Stage 08 report manifest coverage size matches the ingest manifest scope (`--source` aware).
Stage 10 now also requires a manifest-scoped readiness summary (`data/validation/stage_reports/<manifest>/readiness-summary.json`) and blocks ingest when any scope video is `BLOCKED`.
When readiness `scope` metadata is present, Stage 10 also verifies manifest/source scope alignment.
Stage 07 gate policy is explicit via `--stage07-gate-policy` (`approve_only` default, `allow_flag` alternative); validator policy violations are reported as errors.
`--emit-quarantine` writes `data/validation/quarantine/<manifest>[.<source>].json` (post-waiver) and can be consumed by Stage 07 via `--quarantine-file`.
`--quarantine-file` applies an existing quarantine list during validation (downgrades matching video issues to `info` and removes them from completeness gates).
`--waiver-file` can downgrade specific known issues (by `video_id` + `check`) to `info` while preserving audit visibility.
Waivers with `expires_at` in the past are ignored automatically (and reported as expired).
When using `sub-batch-pipeline --validate`, a waiver file at `docs/pipeline/waivers/<subbatch>.json` is auto-detected.
`--emit-stage-reports` writes per-video stage-report artifacts under `data/validation/stage_reports/<manifest>/`.

Stage-report contract tooling:

```bash
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1
python3 scripts/training-data/validation/validate_stage_report.py --file data/validation/stage_reports/P001.1/abc123XYZ99.manifest-validation.report.json
python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/P001.1 --manifest docs/pipeline/batches/P001.1.txt --emit-readiness-summary
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
