# Pipeline Stage Audit Workflow

Use this when hardening pipeline validation so every stage is checked with both deterministic gates and manual inspection snippets.

## Canary Manifest

`docs/pipeline/batches/CANARY.HARDENING.1.txt`

This manifest is intentionally mixed across sources and video styles for cross-stage contract testing.

## End-to-End Run Order

Run stages in sequence on the same manifest:

```bash
./scripts/training-data/02.transcribe --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/03.align --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/04.diarize --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/05.audio-features --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/06.video-type --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/06b.verify --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/06c.patch --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt --overwrite
./scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt
node --import tsx scripts/training-data/09.chunk-embed.ts --source coach_kyle_how_to_approach_a_girl
node --import tsx scripts/training-data/10.ingest.ts --source coach_kyle_how_to_approach_a_girl --verify
```

Notes:
- Stage 09/10 can also be run without `--source` to process everything currently in `data/07.content`.
- Stage 10 `--verify` mode checks what would be ingested without writing to Supabase.

## Stage Audit Harness

Generate machine-readable results and manual-review excerpts:

```bash
python3 scripts/training-data/validation/pipeline_stage_audit.py \
  --manifest docs/pipeline/batches/CANARY.HARDENING.1.txt \
  --json-out data/validation-audits/canary-hardening-1.json \
  --markdown-out data/validation-audits/canary-hardening-1.md \
  --strict
```

The markdown report includes:
- per-stage PASS/WARN/FAIL counts
- failure reasons per stage/video
- manual review snippets from Stage 02, 04, and 07 outputs

## Cross-Stage Contract Check

Run cross-stage validator after Stage 07:

```bash
python3 scripts/training-data/validation/validate_cross_stage.py --all --json
```

Focus on:
- `phase_segment_missing`
- `phase_conversation_mismatch`
- `phantom_enrichments`

