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

