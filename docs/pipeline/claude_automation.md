# Pipeline Automation Plan (Stages 06-08)
**Status:** Active
**Updated:** 05-02-2026

---

## Ground Rules

- **No manual review at scale.** 1500 videos. R1 failures = bugs to fix, not items to flag.
- **No heuristics.** All judgment calls use LLM. No regex for semantic decisions. Claude Max covers the cost.

---

## Pipeline Overview

**Source of truth:** [`docs/pipeline/ASCII`](docs/pipeline/ASCII)

Read that file for the full pipeline diagram (stages 01-08 + post-pipeline, I/O paths, tools used). If you make changes to the pipeline (rename stages, change I/O paths, add/remove stages), update the ASCII file to match.

---

## Verification Principle

> **Read the actual data.** For every R1 verification: open the output files, read them alongside the transcript, and confirm every claim the pipeline made. Don't count files or skim JSON keys — read the words, compare to source, and report every wrong answer you find. If the output says "coach" — is it the coach? If it says "push_pull" — find it in the transcript. Treat the pipeline as guilty until proven innocent.

---

## Remaining Steps

### Stage 06: Video Type + Conversations (R1)
- [ ] R1 test on 5 videos
- [ ] Verify: read each output against full transcript. Confirm video classification is correct, speaker labels are correct, conversation boundaries map to real approaches, diarization fixes didn't break correct assignments
- [ ] User sign-off

### Stage 07: Content Enrichment (R1)
- [ ] R1 test on 5 videos (all infield — talking_head tested in R2)
- [ ] Verify infield: for every approach, confirm techniques exist in transcript, check commentary blocks capture teaching points, confirm turn phases progress correctly
- [ ] Verify unlisted_concepts: review flagged concepts for taxonomy additions
- [ ] User sign-off

### Stage 08: Ingest
- [x] Rewrite `08.ingest.ts` — clean version, no legacy code paths
- [ ] R1 test on 5 videos
- [ ] Verify: confirm row counts include both INTERACTION and COMMENTARY chunks, spot-check metadata (video_type, isRealExample), test vector search returns relevant results, confirm deduplication works
- [ ] User sign-off

### Stage 09: Taxonomy Report (after each batch)
- [ ] Run `./scripts/training-data/09.taxonomy-report` after each production batch
- [ ] Review unlisted concepts with 3+ occurrences
- [ ] If warranted, add concepts to TECHNIQUE_TAXONOMY or TOPIC_TAXONOMY in `07.content`
- [ ] Re-run affected videos after taxonomy updates

### Automation
- [x] Validation layer: jsonschema + invariant checks in 06.video-type; invariant checks in 07.content
- [x] Cross-stage validation: `validate_cross_stage.py` runs between 07→08 in final_pipeline (gates pipeline — prompts user on errors)
- [x] Failure budget: halts batch on 3 consecutive failures or >20% failure rate (sys.exit(1))
- [x] Evidence verification: `fuzzy_evidence_match` checks LLM quotes against transcript (threshold 0.7); >30% mismatch rate blocks output
- [x] Validation output: `*.validation.json` files alongside every pipeline output
- [x] Batch report: `batch_report.py` aggregates statistics + drift detection (advisory — no auto-halt)
- [x] Prompt changelog: `docs/pipeline/prompt_changelog.json` tracks prompt version changes (human reference only — not read by scripts)
- [ ] Rate limit handling (test Opus limits on R1/R2, fall back to Sonnet if needed)

### R2: Stage 02 (Transcription) Evaluation — PENDING VERIFICATION
- [x] Run Stage 02 on 15 R2 videos
- [x] Evaluate transcription quality (02-05-2026):
  - 12/15 clean, 2 minor hallucinations (WARNING), 1 complete failure (CRITICAL)
  - Todd V [PwvM7HhnUEA]: CRITICAL — 0 useful words. Root cause: Stage 01 downloaded opus at 3.6 kbps (should have been m4a at 129 kbps). Audio is noise.
  - Sexual Spark [OteE5cgUSOk]: WARNING — "Humor." x4 at segments 139-142. Rest of 3053-word transcript is good.
  - Fix Rejection [JKWRj2hwbT4]: WARNING — "Hi." x3 at segments 41-43. Possibly real speech. Rest of 818-word transcript is good.
- [x] Hardened `02.transcribe` with quality classification (CRITICAL/WARNING/OK), empty-transcript detection, and output gating (CRITICAL failures skip output write)
- [x] Full dataset audit (02-05-2026): scanned all 2,587 audio files with ffprobe. Only 3 files affected (all Todd V "How To Talk To A Girl" series: wv-U9drRpAo, M2TWuTgx1SM, PwvM7HhnUEA). All other downloads healthy (94-158 kbps).
- [x] Fixed `01.download` format string: `"bestaudio/best"` → `"bestaudio[abr>50]/bestaudio/best"` (adds 50 kbps bitrate floor to prevent selecting garbage opus streams)
- [x] Cleaned up broken files: deleted 3 bad `.audio.webm` + derived WAVs, removed from yt-dlp archive
- [x] Re-download attempted: m4a at 129 kbps downloaded successfully, but YouTube serves silent audio (-91 dB) for these age-restricted videos. Audio-only streams are blanked by YouTube.
- [x] 3 Todd V videos permanently excluded: added to `docs/excluded-videos.txt`, synced to archives. All downloaded files removed.
- [x] PwvM7HhnUEA removed from R2 (age-restricted, silent audio — CRITICAL). A1Mwr1pDusQ and kEAQ8dB4_R4 (Todd V, working audio) kept. JKWRj2hwbT4 and OteE5cgUSOk are WARNING-severity (minor hallucination in otherwise good transcripts) — allowed through after `_load_flagged_videos` fix to only skip CRITICAL. R2 batch: 14 videos (13 infield + 1 talking head; 12 clean, 2 warnings).
- [ ] User sign-off on Stage 02

### R2: Full Pipeline Test (Stages 06-08)
- [ ] Run stages 06-08 on 14 videos (13 infield + 1 talking head)
- [ ] Verify end-to-end data flow
- [ ] Run `batch_report.py --all --batch-id R2 --compare` — compare against R1
- [ ] Run `09.taxonomy-report` on R2 output
- [ ] User approval

### Production Run (Batch Processing)

**Batch workflow (manifest-based):**
```bash
# 1. Generate a batch manifest (auto-selects next unprocessed infield-first videos)
./scripts/training-data/batch-create --size 100 --phase 1 --batch-id P001

# 2. Run audio processing stages (02-05)
./scripts/training-data/final_pipeline --manifest docs/pipeline/batches/P001.txt --stages 02-05 --skip-ingest

# 3. Check progress
./scripts/training-data/batch-status docs/pipeline/batches/P001.txt

# 4. Run LLM stages (06-07)
./scripts/training-data/final_pipeline --manifest docs/pipeline/batches/P001.txt --stages 06-07 --skip-ingest

# 5. Run full pipeline (all stages, including ingest)
./scripts/training-data/final_pipeline --manifest docs/pipeline/batches/P001.txt
```

**Source classification:** `docs/source-classification.txt` — source-level infield/talking_head estimates for batch ordering.
**Manifests:** `docs/pipeline/batches/P001.txt` — lists videos per batch (source_name | folder_name).

**Production checklist per batch:**
- [ ] Run in 100-video batches with review checkpoints
- [ ] Run `batch_report.py --all --batch-id PXXX --compare` after each batch
- [ ] Run `09.taxonomy-report` after each batch — review unlisted concepts
- [ ] 10% random sample review + all validation-flagged videos
- [ ] Process review queue between batches

---

## Key Decisions (already made)

- **Model:** Opus via Claude Max. Fall back to Sonnet if rate-limited.
- **Testing phases:** R1 = 5 videos, R2 = 12 videos, Production = batches of 100.
- **Video type + conversations merged:** Stage 06 reads all segments in a single pass — classifies video type, assigns speaker roles, and detects conversation boundaries. Downstream stages filter on video_type.
- **Structure folded into Content (Stage 07):** Phase-per-turn labeling is done by the same LLM call that detects techniques/topics/quality. No separate structure stage — the LLM labels phases more accurately than regex heuristics, at zero extra cost.
- **Commentary enrichment in Stage 07:** Infield videos get commentary blocks interleaved with approaches. Talking_head videos get LLM-identified topic sections. Both get unlisted_concepts for taxonomy gap detection.
- **Chunking in Stage 08:** Approach conversations use phase-based chunking (segmentType=INTERACTION, isRealExample=true). Commentary and talking_head sections use simple text chunking (segmentType=COMMENTARY, isRealExample=false). All chunks carry video_type metadata.
- **Stages renumbered:** Old 09/10 are now 08/09. No stage gap. Pipeline is 01–07 (per-source) + 08 (ingest) + 09 (taxonomy report, post-pipeline).
- **Taxonomy report (Stage 09):** Runs post-pipeline (not between stages). Pure aggregation, no LLM. Reports unlisted concept frequency to identify taxonomy gaps.
- **4-layer quality system:** (1) Runtime schema + invariant validation per video, (2) Cross-stage consistency checks, (3) Batch statistics + drift detection, (4) Stratified human review.
- **Prompt refinement loop:** Errors found in batch N → categorize → add negative examples to prompts → increment prompt_version → record in prompt_changelog.json. Minor changes: don't reprocess. Major changes: reprocess all prior batches.
- **Failure budget:** 3 consecutive failures → halt batch. >20% failure rate → halt (sys.exit(1)). >30% evidence mismatch → block output. >50% warnings → flag for full review (not yet automated — manual check).
