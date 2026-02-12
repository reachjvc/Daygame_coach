# Pipeline Validation Harness (Branch Work)

This repo has a small validation harness to sanity-check pipeline artifacts for a batch/sub-batch manifest (e.g. `docs/pipeline/batches/P001.1.txt`).

## One Command (Recommended)

Run validations + a manifest-filtered batch report:

```bash
./scripts/training-data/batch/sub-batch-pipeline P001.1 --validate
```

This is read-only: it does not call the LLM and does not modify pipeline artifacts.

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
```

Cross-stage checks can also be run directly:

```bash
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt
python3 scripts/training-data/validation/validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt --json
```

In manifest mode, `validate_cross_stage.py` now emits explicit coverage errors/warnings per manifest entry (missing Stage 06/06c, missing Stage 07, source mismatch, root-flat ambiguity) instead of only reporting generic missing pairs.
