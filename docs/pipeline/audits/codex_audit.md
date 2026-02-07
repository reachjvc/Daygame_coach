# Pipeline Audit Template (Audit-Only)

**Purpose:** Produce a reviewable audit of pipeline files, inconsistencies, and cleanup candidates. No code changes. No refactors.

**Agent:** Codex
**Date:** 2026-02-06
**Scope:** Pipeline mapping, orchestration, stage scripts, schemas, prompts, and docs under `docs/pipeline/` and `scripts/training-data/`. Deprecated folders are treated as delete candidates per user instruction.

## 1) Summary
The pipeline is well-defined in `docs/pipeline/ASCII`, but orchestration, documentation, and file hygiene drift from that source of truth. The canonical runners (`scripts/training-data/sub-batch-pipeline` and `scripts/training-data/batches`) currently stop at Stage 07 even though Stages 08–10 are required. `final_pipeline` references a non‑existent `08.ingest.ts`. Verification coverage exists only for Stage 02, leaving downstream stages without standardized checks. `scripts/training-data/` also contains utilities, experiments, and generated files with no clear status markers.

Top 3 risks:
- Runners omit Stages 08–10, so “complete” batches are not actually complete.
- Documentation for Stages 01–07 is missing in `docs/pipeline/stages/`, creating confusion and drift from active code.
- Unclassified scripts and legacy assets in `scripts/training-data/` make it hard to tell what is authoritative.

Highest‑leverage cleanup wins:
- Align `sub-batch-pipeline` and `batches` to include Stages 08–10 and correct status reporting.
- Rebuild stage docs for 01–07 from current scripts.
- Establish verification prompts/checklists for Stages 03–07.
- Classify and prune stale files in `scripts/training-data/`.

## 2) Canonical Pipeline Map (As Found)
Stage 01 Download
- Script: `scripts/training-data/01.download`
- Reads: YouTube URLs and cookies
- Writes: `data/01.download/<source>/<video>/*.wav`

Stage 02 Transcribe
- Script: `scripts/training-data/02.transcribe`
- Reads: `data/01.download/<source>/<video>/*.audio.asr.raw16k.wav`
- Writes: `data/02.transcribe/<source>/<video>/<video>.full.json` (+ `.txt`)

Stage 03 Align
- Script: `scripts/training-data/03.align`
- Reads: `data/02.transcribe/<source>/<video>/<video>.full.json`
- Writes: `data/03.align/<source>/<video>/<video>.full.json`

Stage 04 Diarize
- Script: `scripts/training-data/04.diarize`
- Reads: `data/03.align/<source>/<video>/<video>.full.json`
- Writes: `data/04.diarize/<source>/<video>/<video>.full.json`

Stage 05 Audio Features
- Script: `scripts/training-data/05.audio-features`
- Reads: `data/01.download/<source>/<video>/*.wav` and `data/04.diarize/<source>/<video>/*.full.json`
- Writes: `data/05.audio-features/<source>/<video>/*.audio_features.json`

Stage 06 Video Type + Conversations
- Script: `scripts/training-data/06.video-type`
- Reads: `data/05.audio-features/<source>/<video>/*.audio_features.json`
- Writes: `data/06.video-type/<source>/<video>/*.conversations.json`

Stage 06b Verify
- Script: `scripts/training-data/06b.verify`
- Reads: `data/06.video-type/<source>/<video>/*.conversations.json`
- Writes: `data/06b.verify/<source>/<video>/*.verification.json`

Stage 06c Patch
- Script: `scripts/training-data/06c.patch`
- Reads: `data/06.video-type/<source>/<video>/*.conversations.json` + `data/06b.verify/<source>/<video>/*.verification.json`
- Writes: `data/06c.patched/<source>/<video>/*.conversations.json`

Stage 07 Content
- Script: `scripts/training-data/07.content`
- Reads: `data/06c.patched/<source>/<video>/*.conversations.json`
- Writes: `data/07.content/<source>/<video>/*.enriched.json`

Stage 08 Taxonomy Validation
- Script: `scripts/training-data/08.taxonomy-validation`
- Reads: `data/07.content/**/.enriched.json`
- Writes: `data/08.taxonomy-validation/report.json`

Stage 09 Chunk & Embed
- Script: `scripts/training-data/09.chunk-embed.ts`
- Reads: `data/07.content/**/.enriched.json`
- Writes: `data/09.chunks/<source>/<video>.chunks.json` + `data/09.chunks/.chunk_state.json`

Stage 10 Ingest
- Script: `scripts/training-data/10.ingest.ts`
- Reads: `data/09.chunks/<source>/<video>.chunks.json`
- Writes: Supabase + `data/.ingest_state.json`

Orchestration entry points
- `scripts/training-data/sub-batch-pipeline` (canonical per user)
- `scripts/training-data/batches` (canonical per user)
- `scripts/training-data/final_pipeline` (out of sync)

## 3) File Inventory (In Scope)
Stage scripts
- `scripts/training-data/01.download`
- `scripts/training-data/02.transcribe`
- `scripts/training-data/03.align`
- `scripts/training-data/04.diarize`
- `scripts/training-data/05.audio-features`
- `scripts/training-data/06.video-type`
- `scripts/training-data/06b.verify`
- `scripts/training-data/06c.patch`
- `scripts/training-data/07.content`
- `scripts/training-data/08.taxonomy-validation`
- `scripts/training-data/09.chunk-embed.ts`
- `scripts/training-data/10.ingest.ts`

Orchestrators
- `scripts/training-data/sub-batch-pipeline`
- `scripts/training-data/batches`
- `scripts/training-data/final_pipeline`

Batching, manifests, and reporting
- `scripts/training-data/batch-create`
- `scripts/training-data/sub-batch-create`
- `scripts/training-data/batch-status`
- `scripts/training-data/batch_report.py`
- `scripts/training-data/pipeline_manifest.py`
- `docs/pipeline/batches/*.txt`
- `docs/pipeline/batches/*.status.json`
- `docs/pipeline/test_videos.txt`
- `docs/excluded-videos.txt`
- `scripts/training-data/sync-exclusions`

Utilities and maintenance scripts
- `scripts/training-data/download-missing-audio.sh`
- `scripts/training-data/redownload-missing-audio.sh`
- `scripts/training-data/download-test-audio.sh`
- `scripts/training-data/convert-audio-to-wav.sh`
- `scripts/training-data/repair_asr_wavs.sh`
- `scripts/training-data/fix-bracket-filenames.py`

Experimental, analysis, and debug
- `scripts/training-data/test/06b.verify-experimental`
- `scripts/training-data/test_intra_segment_detection.py`
- `scripts/training-data/sonnet-test-06.py`
- `scripts/training-data/analysis/` (e.g., tone_feature_analysis)
- `scripts/training-data/debug_06b_failed_response.txt`
- `scripts/training-data/DiariZen/`
- `scripts/training-data/lib/`

Schemas
- `scripts/training-data/schemas/conversations.schema.json`
- `scripts/training-data/schemas/audio_features.schema.json`
- `scripts/training-data/schemas/verification.schema.json`
- `scripts/training-data/schemas/structure.schema.json`
- `scripts/training-data/schemas/segment_enriched.schema.json`

Prompts
- `prompts/04_speaker_labeling.md`
- `prompts/05_segment_type.md`
- `prompts/05_video_type.md`
- `prompts/06a_structure.md`
- `prompts/06b_content.md`

Verification tools and docs
- `scripts/training-data/verify-02`
- `scripts/training-data/validate_cross_stage.py`
- `docs/pipeline/stage_verification.md`

Docs
- `docs/pipeline/ASCII`
- `docs/pipeline/claude_automation.md`
- `docs/pipeline/stages/STAGE_08_taxonomy_validation.md`
- `docs/pipeline/stages/STAGE_09_chunk_embed.md`
- `docs/pipeline/stages/STAGE_10_ingest.md`
- `docs/chunking_plan_now.md`

Generated artifacts (should not be tracked)
- `scripts/training-data/__pycache__/`

## 4) Inconsistencies and Drift
- `scripts/training-data/sub-batch-pipeline` and `scripts/training-data/batches` stop at Stage 07, but stages 08–10 are required by `docs/pipeline/ASCII`.
- `scripts/training-data/batch-status` also only reports through Stage 07.
- `scripts/training-data/final_pipeline` references `08.ingest.ts` (non‑existent) and omits Stages 08–09.
- `docs/pipeline/stages/` only contains docs for 08–10; stages 01–07 are missing from current doc tree.
- `docs/pipeline/stage_verification.md` includes Stage 02 only; other stages are placeholders.
- `prompts/*.md` are not referenced by current scripts (likely legacy or manual).
- `scripts/training-data/schemas/verification.schema.json` exists but is only used by the experimental verifier, not by `06b.verify`.
- `scripts/training-data/schemas/audio_features.schema.json` and other schema files are not referenced in active stages.
- `scripts/training-data/05.audio-features` comments reference removed tone‑classification usage, which could mislead maintenance.
- `scripts/training-data/DiariZen/` exists but is only mentioned in deprecated docs (likely unused).
- Generated `__pycache__` files are present in repo.

## 5) Stale/Orphaned Files (Proposed)
Keep
- Active stage scripts 01–10
- `scripts/training-data/sub-batch-pipeline`
- `scripts/training-data/batches`
- `scripts/training-data/pipeline_manifest.py`
- `scripts/training-data/batch-create`
- `scripts/training-data/sub-batch-create`
- `scripts/training-data/batch-status`
- `scripts/training-data/batch_report.py`
- `docs/pipeline/ASCII`
- `docs/pipeline/claude_automation.md`
- `docs/pipeline/stages/*`

Delete
- `scripts/training-data/__pycache__/`
- `scripts/training-data/old/*` (per user: deprecated)
- `scripts/deprecated/*` and `deprecated/**` (per user: deprecated)

Needs review
- `scripts/training-data/final_pipeline` (update or formally deprecate)
- `scripts/training-data/DiariZen/` (likely unused)
- `scripts/training-data/lib/` (unclear usage)
- `scripts/training-data/analysis/` (research only?)
- `scripts/training-data/test/` (experimental only?)
- `scripts/training-data/sonnet-test-06.py` (experiment)
- `scripts/training-data/test_intra_segment_detection.py` (experiment)
- `scripts/training-data/debug_06b_failed_response.txt` (debug artifact)
- `prompts/*.md` (wire into code or archive)
- `scripts/training-data/schemas/*` except `conversations.schema.json` (use or archive)
- `docs/chunking_plan_now.md` (still relevant vs outdated)
- `scripts/training-data/download-missing-audio.sh` and `redownload-missing-audio.sh` (possible overlap)
- `scripts/training-data/download-test-audio.sh` (test utility)
- `scripts/training-data/convert-audio-to-wav.sh` and `repair_asr_wavs.sh` (utility)
- `scripts/training-data/fix-bracket-filenames.py` (utility)

## 6) Verification Coverage Gaps
- Only Stage 02 has a verification script and a full LLM prompt.
- Stages 03–05 have no deterministic verification script or LLM prompt.
- Stage 06 has in‑script validation but no standardized batch‑level verification prompt.
- Stage 07 has cross‑stage validation via `validate_cross_stage.py`, but no standard per‑stage LLM review.
- Stages 08–10 lack any verification checklist or scripted checks.

## 7) Cleanup Recommendations (Ordered)
1. Align `sub-batch-pipeline`, `batches`, and `batch-status` to include Stages 08–10 with correct outputs and status tracking.
2. Decide fate of `final_pipeline`: update to match canonical flow or mark deprecated and remove from docs.
3. Create stage docs for 01–07 under `docs/pipeline/stages/` using current scripts as source of truth.
4. Add verification checklists for 03–07 in `docs/pipeline/stage_verification.md`, starting with deterministic checks.
5. Classify all non‑stage scripts in `scripts/training-data/` into keep, utility, or archive, and move/rename accordingly.
6. Formalize or archive `prompts/*.md` and unused schemas; document what remains authoritative.
7. Remove generated and deprecated files from repo; enforce `.gitignore` to prevent `__pycache__`.

## 8) Open Questions
- Should `final_pipeline` remain supported, or be fully deprecated in favor of `sub-batch-pipeline` + `batches`?
- Do you want `prompts/*.md` wired back into LLM stages, or archived as legacy?
- Is `06b.verify-experimental` intended to replace the current verifier or remain an experiment?
- Should Stage 08–10 verification be automated (scripts) or LLM‑reviewed first?
- Do you want a dedicated `scripts/training-data/utils/` folder to hold non‑stage maintenance scripts?
