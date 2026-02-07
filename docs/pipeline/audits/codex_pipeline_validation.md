# Codex Pipeline Validation Plan (Supplement)

**Status:** Draft (in progress)
**Updated:** 2026-02-07

This document is intentionally structured to merge cleanly with `docs/pipeline/audits/claude_pipeline_validation.md`.

**What this doc focuses on (Codex):**
- Deterministic validation + evidence bundles ("no silent pass") and how to implement them
- Schema/enum contract alignment across stages 05/06/06b/06c/07
- Output layout consistency (root-mode vs source-mode) and how to make validators robust
- Concrete baseline metrics computed from the current `data/` snapshot, with commands to reproduce

---

## Mission

Produce a thorough, high-quality evaluation + validation plan for the full video pipeline. The plan must prioritize correctness, observability, and repeatability over speed. It must be safe to run on sub-batches (1, 2, or 10 videos) and scale to ~150 batches of 10 videos each without introducing new flags or regressions.

**Objectives:**
- Evaluate quality at each stage and localize where failures/quality loss are introduced
- Prevent "silent passes" by requiring explicit evidence/metrics per stage
- Confidently label each video/batch as RAG-ready (or not) with reasons
- Propose improvements (including entirely new flows if warranted)
- Specify automated detection, validators, and prompt-quality upgrades
- Reduce errors and improve output sharpness

**Constraints:**
- This is a planning and validation document only
- Do not change code during analysis
- Do not optimize for speed
- Make the plan detailed and checklist-driven
- Quality over speed: extra effort for better architecture is worth it

---

## Definitions (Use These Terms Precisely)

- **Validation:** Deterministic correctness checks (schemas, file presence, invariants, thresholds).
- **Evaluation:** Quality measurement (metrics, sampling, model-based checks, spot checks).
- **Gating:** A rule that blocks downstream processing or ingestion.
- **RAG-ready:** Meets minimum thresholds for retrieval usefulness; otherwise assign a non-ready label with reasons.
- **No silent pass:** Every stage must emit explicit status + evidence (report + metrics). Missing/empty/invalid outputs are treated as failures (hard or soft) with a reason.

---

## Agent Metadata

| Field | Value |
|-------|-------|
| Agent | Codex (GPT-5) |
| Date | 2026-02-07 |
| Scope | `scripts/training-data` stages 01-10 + `scripts/training-data/validation/*` + local `data/` outputs |
| Time Spent | Not tracked |

---

## 1) Inputs Reviewed

| Category | Files Reviewed |
|----------|----------------|
| Pipeline docs | `docs/pipeline/ASCII`<br>`docs/pipeline/sources.txt`<br>`docs/pipeline/test_videos.txt`<br>`docs/pipeline/excluded-videos.txt`<br>`docs/pipeline/batches/*` |
| Stage scripts | `scripts/training-data/01.download`<br>`scripts/training-data/02.transcribe`<br>`scripts/training-data/03.align`<br>`scripts/training-data/04.diarize`<br>`scripts/training-data/05.audio-features`<br>`scripts/training-data/06.video-type`<br>`scripts/training-data/06b.verify`<br>`scripts/training-data/06c.patch`<br>`scripts/training-data/07.content`<br>`scripts/training-data/08.taxonomy-validation`<br>`scripts/training-data/09.chunk-embed.ts`<br>`scripts/training-data/10.ingest.ts` |
| Schemas | `scripts/training-data/schemas/audio_features.schema.json`<br>`scripts/training-data/schemas/conversations.schema.json`<br>`scripts/training-data/schemas/verification.schema.json` |
| Validation tooling | `scripts/training-data/validation/verify-02`<br>`scripts/training-data/validation/batch_report.py`<br>`scripts/training-data/validation/validate_cross_stage.py` |

**Files not found or ambiguous references:**
- `STAGE_07_content.md` is referenced in `scripts/training-data/07.content` but not present in-repo.
- Output layout is inconsistent across stages/runs: some artifacts are written to `data/<stage>/*.json` (root-mode) while others are written to `data/<stage>/<source>/<video>/...` (source-mode).

---

## 2) Pipeline Context (As Found)

### 2.1 Stage Inventory

| Stage | Script Path | Type | Inputs | Outputs |
|-------|-------------|------|--------|---------|
| 01. Download | `scripts/training-data/01.download` | Deterministic | YouTube URLs | `.audio.asr.raw16k.wav` (and optionally `.audio.asr.clean16k.wav`) |
| 02. Transcribe | `scripts/training-data/02.transcribe` | ML (Whisper) | `.wav` | `.full.json` (+ `.txt`, plus per-source `.flagged.json`) |
| 03. Align | `scripts/training-data/03.align` | ML (WhisperX) | `.full.json` + `.wav` | `.full.json` (+ per-source `.failed.json` / `.flagged.json`) |
| 04. Diarize | `scripts/training-data/04.diarize` | ML (pyannote) | `.full.json` + `.wav` | `.full.json` |
| 05. Audio Features | `scripts/training-data/05.audio-features` | Deterministic | `.full.json` + `.wav` | `.audio_features.json` (clean16k and raw16k variants) |
| 06. Video Type | `scripts/training-data/06.video-type` | LLM (Claude) | `.audio_features.json` | `.conversations.json` + `.conversations.validation.json` |
| 06b. Verify | `scripts/training-data/06b.verify` | LLM (Claude) | `.conversations.json` | `.verification.json` |
| 06c. Patch | `scripts/training-data/06c.patch` | Deterministic | `.verification.json` + `.conversations.json` | patched `.conversations.json` (adds `patch_metadata`) |
| 07. Content | `scripts/training-data/07.content` | LLM (Claude) | patched `.conversations.json` | `.enriched.json` + `.enriched.validation.json` |
| 08. Taxonomy | `scripts/training-data/08.taxonomy-validation` | Deterministic | `.enriched.json` | `data/08.taxonomy-validation/report.json` (gate via exit code) |
| 09. Chunk & Embed | `scripts/training-data/09.chunk-embed.ts` | ML (Ollama) | `.enriched.json` | `data/09.chunks/<source>/*.chunks.json` |
| 10. Ingest | `scripts/training-data/10.ingest.ts` | Deterministic | `.chunks.json` | Supabase rows (+ `data/.ingest_state.json`) |

### 2.2 Directory Layout Reality (Current Snapshot)

In the current `data/` snapshot (2026-02-07), there is a mix of:
- Source-mode: `data/<stage>/<source>/<video_dir>/...`
- Root-mode: `data/<stage>/<video_title [video_id]>.audio.asr.clean16k.*.json`

This breaks cross-stage pairing tools that assume source-mode.

**Immediate requirement for correctness:** validators and batch scripts must either:
- Enforce one layout everywhere, OR
- Support both layouts deterministically (pair by stem/video_id).

#### 2.2.1 Canonical Pairing Key (Stem/Video ID Rules)

To make validators robust to layout differences, standardize on:
- `video_id`: extracted from `[...]` in filenames/dirnames (11-char YouTube id)
- `stem`: basename without the final stage suffix

Examples (conceptual):
- Stage 06 stem: `<title> [VIDEO_ID].audio.asr.clean16k`
  - files: `<stem>.conversations.json`, `<stem>.conversations.validation.json`
- Stage 07 stem: `<title> [VIDEO_ID].audio.asr.clean16k`
  - files: `<stem>.enriched.json`, `<stem>.enriched.validation.json`

**Pairing rule (layout-agnostic):**
- Stage06c `<stem>.conversations.json` pairs with Stage07 `<stem>.enriched.json` by exact `<stem>` match.
- If multiple candidates exist (root + source duplicates), prefer:
  1. Source-mode path whose `<source>` matches the manifest/source being processed
  2. Otherwise, newest `processed_at` / `processed_at` timestamp

#### 2.2.2 "No Silent Pass" vs Partial Writes

Some stages write validation artifacts before writing the primary output.
If a run is interrupted, you can get:
- `<stem>.<output>.validation.json` present
- `<stem>.<output>.json` missing

This must be treated as `FAIL(reason_code=partial_write)` and block downstream processing.

### 2.3 Confidence Thresholds (06c.patch)

| Fix Type | Required Confidence | Notes |
|----------|---------------------|-------|
| Misattributions | >= 0.70 | Segment `speaker_role` patch |
| Collapse issues | >= 0.70 | Segment `speaker_role_override` patch |
| Video type fixes | >= 0.85 | `video_type.type` patch |
| Boundary fixes | >= 0.90 | merge/split/reclassify conv_id |

### 2.4 Verdict System (06b.verify)

| Verdict | Meaning | Pipeline Action |
|---------|---------|-----------------|
| APPROVE | No issues found | Copy unchanged to 06c |
| FLAG | Issues with fixes | Apply fixes in 06c |
| REJECT | Critical issues | Halt pipeline |

---

## 3) Prompt Inventory (Where It Lives + Contract Issues)

Prompts are embedded in code (not external files):
- Stage 06: `scripts/training-data/06.video-type` (`ANALYZE_VIDEO_PROMPT`)
- Stage 06b: `scripts/training-data/06b.verify` (`VERIFY_PROMPT`, plus a conversion prompt)
- Stage 07: `scripts/training-data/07.content` (two `prompt = f"""..."""` blocks)

**High-risk contract mismatch to fix (plan item):**
- Stage 06b prompt demands strict enums for patching (e.g., `suggested_override` must be `coach|target|other`), but:
  - `scripts/training-data/schemas/verification.schema.json` does not enforce these enums (fields are free-form strings).
  - `scripts/training-data/06c.patch` currently accepts values (`mixed`) that violate `scripts/training-data/schemas/conversations.schema.json` (`speaker_role` enum does not include `mixed`).

### 3.1 Schema + Enum Contract Alignment (Must-Fix Before Scaling)

The patch flow is effectively an API contract:

Stage 06b output (producer) -> Stage 06c patcher (consumer) -> Stage 06c conversations output (must satisfy `conversations.schema.json`) -> Stage 07 enrichment (consumer).

**Current ground truth enums (from `scripts/training-data/schemas/conversations.schema.json`):**
- `segments[].segment_type`: `approach|commentary|transition`
- `segments[].speaker_role`: `coach|target|voiceover|other|unknown`
- `segments[].speaker_role_override`: `coach|target|voiceover|other|unknown`

**Observed contract drift (current code + data):**
- 06b emits values like `mixed` / `mixed/unclear` in patch fields.
- 06c accepts `mixed` as patchable and can write it into `speaker_role`/`speaker_role_override`, producing schema-invalid conversations.
- `scripts/training-data/schemas/verification.schema.json` is outdated and too permissive:
  - It does not restrict suggested enums.
  - It does not model `suggested_fix` and `confidence` fields used by the patcher contract.

**Plan decision required (recommended path):**
- Do NOT add `mixed` to the conversations schema.
- Treat "mixed speaker" findings as non-patchable artifacts:
  - encode as `other_flags[]` (06b), and/or a dedicated `transcript_artifacts[]` section in a future schema.
  - keep `speaker_role` in the schema-safe enum set and quarantine those segments/videos for upstream remediation.

**Concrete plan tasks:**
- Update `verification.schema.json` to match the actual patch contract (enums + suggested_fix + confidence).
- Update stage 06b prompt to forbid any value outside the schema-safe enum sets.
- Tighten 06c patcher validation:
  - reject/skip patches that would violate conversations schema enums
  - run post-patch conversations schema validation and gate stage 07 on it

---

## 4) Error Taxonomy (Codex Additions)

### 4.1 Critical "Pipeline Correctness" Error Classes

These are errors that can silently degrade downstream output unless explicitly gated:

1. **Layout/pairing errors**
   - Symptom: cross-stage validator finds no pairs even though artifacts exist.
   - Root cause: root-mode vs source-mode outputs.

2. **Schema contract drift**
   - Symptom: 06b emits patch instructions that 06c skips or applies into invalid schema.
   - Root cause: mismatch between 06b prompt, verification schema, patcher allowed values, and conversations schema.

3. **Partial writes**
   - Symptom: stage validation exists but stage output missing (interrupted run).
   - Root cause: stage writes validation then writes output; interruption between steps.

### 4.2 Observed Failure Modes (From `data/` Snapshot, 2026-02-07)

**Stage coverage counts (not a baseline, just current snapshot):**
- Stage 01: `*.audio.asr.raw16k.wav` count: 2127
- Stage 02: `*.full.json` count: 224
- Stage 03: `*.full.json` count: 97
- Stage 04: `*.full.json` count: 97
- Stage 05: unique videos: 96 (192 audio_features files = clean+raw each)
- Stage 06: `*.conversations.json` count: 83 (mostly clean16k)
- Stage 06 validation: 101 files (96 unique stems, 5 duplicates across root/source modes)
- Stage 06b: 13 verification reports
- Stage 06c: 13 patched conversations
- Stage 07: 12 enriched outputs
- Stage 08/09/10: not yet run in snapshot (`data/08.taxonomy-validation` and `data/09.chunks` absent)

**Stage 06 validation errors (blocking output writes):**
- `video_type_segment_mismatch`: 15
- `schema_invalid`: 1 (example: invalid `segment_type="other"` at `segments.117.segment_type`)

**Stage 06 validation warnings (non-blocking, but quality-significant):**
- `conversation_not_contiguous`: 26
- `no_target_in_infield`: 2
- `zero_conversations_in_infield`: 1
- `high_conversation_rate`: 1

**Stage 06b schema/enum violations observed:**
- `misattributions[].suggested_role = "mixed/unclear"` appears in at least one report.
- `collapse_issues[].suggested_override = "mixed"` appears in at least one report.
- Both values are incompatible with the conversations schema enums and can lead to skipped patches or invalid patched outputs.

---

## 5) Error Propagation Analysis (Codex Additions)

| Origin Stage | Error Type | How It Manifests Later | Where It *Must* Be Caught | What Evidence Proves It |
|--------------|------------|------------------------|----------------------------|--------------------------|
| 02 | repetition / long-word artifacts | 06 boundary errors, 07 transcript_artifacts, garbage examples | 02 deterministic report + gate; 07 should only *surface* residuals | per-video `02.report.json` + `07.transcript_artifacts` |
| 04 | diarization collapse | 06/06b role confusion; 06c patches attempt repair | 06b + post-06c schema/invariants | `speaker_collapse` stats + 06b segment-level evidence |
| 06b/06c | schema drift in patch instructions | patches skipped or output becomes invalid | deterministic schema validator on 06b + 06c | `06b.validation.json` + `06c.validation.json` |
| layout | missing pairs | cross-stage checks never run | deterministic discovery + report | cross-stage report listing discovered pairs |

---

## 6) Current Quality Baseline (Reproducible Snapshot Metrics)

Use this command to generate the snapshot report:

```bash
python scripts/training-data/validation/batch_report.py --all --batch-id SNAPSHOT --json
```

From `data/batch_reports/batch_SNAPSHOT.json`:

**Stage 06:**
- videos processed: 83
- video type distribution: podcast=8, compilation=39, talking_head=30, infield=6
- mean conversations per infield/compilation: 4.98
- unknown speaker rate: 5.3%

**Validation totals (06 + 07 validations):**
- total validations: 113
- total errors: 16
- total warnings: 38

Top error types:
- `video_type_segment_mismatch`: 15
- `schema_invalid`: 1

Top warning types:
- `conversation_not_contiguous`: 26
- `transcript_artifact`: 6
- `evidence_mismatch`: 2

**Stage 02 flags:**
- entries in `data/02.transcribe/*/.flagged.json`: 57 (all WARNING)
- reasons distribution: `intra_segment_repetition`=39, `repetition_hallucination`=18

---

## 7) Validation Strategy (Overall)

### 7.1 Gating Philosophy

Gates should be based on deterministic evidence and be localized:
- If a later stage detects an upstream artifact, it should *report* it but not silently compensate.
- Stages should produce machine-readable reports; batch rollups should be computed from these.

### 7.2 Evidence Bundle Contract (No Silent Pass)

Define a standard per-video report schema used by *every* stage.

**Proposed report path:**
- `data/<stage>/<source>/<video_dir>/<stem>.<stage>.report.json`

**Minimum schema fields (all stages):**
- `stage`, `status` (`PASS|WARN|FAIL`), `reason_code`
- `video_id`, `source`, `stem`
- `inputs[]` and `outputs[]`: `path`, `sha256`, `bytes`
- `metrics`: stage-specific
- `timestamps`: `started_at`, `finished_at`, `elapsed_sec`
- `versions`: script `pipeline_version`, prompt/model versions, major deps

**Batch-level rollups (optional but recommended):**
- `data/<stage>/<source>/<batch_id>.<stage>.batch_report.json`

#### 7.2.1 Reason Codes (Machine-Readable Failure Localization)

Define a small, fixed enum of `reason_code` values so downstream automation can react deterministically.

Recommended starting set:
- `missing_input`
- `missing_output`
- `partial_write`
- `schema_invalid`
- `invariant_violation`
- `quality_critical`
- `quality_warning`
- `llm_output_invalid`
- `llm_schema_violation`
- `patch_skipped_invalid_value`
- `cross_stage_mismatch`
- `taxonomy_gate_fail`
- `embedding_failed`
- `ingest_failed`
- `ingest_verify_mismatch`

Each `reason_code` should be paired with `details` referencing:
- check id(s)
- file paths
- counts/thresholds

#### 7.2.2 Quarantine + Waivers (Avoid Reprocessing Bad Data)

Quarantine is a first-class mechanism:
- When a video fails a hard gate, move or copy its reports (and optionally artifacts) to:
  - `data/quarantine/<video_id>/...`
- Maintain a machine-readable index:
  - `data/quarantine/index.jsonl` (append-only; includes video_id, stage, reason_code, timestamp, source, stem)

Waivers must be explicit and auditable:
- `data/waivers/<batch_id>.json` listing:
  - video_id
  - stage
  - reason_code waived
  - justification
  - who approved + date

### 7.3 RAG-Ready Rubric (Proposed Deterministic Labeling)

RAG-ready should be computed from reports, not hand-waved.

**Minimum for `RAG_READY`:**
- Stage 02: status `PASS|WARN` (WARN allowed only if below thresholds for repetition/gaps)
- Stage 06: validation passed (no errors) and output exists
- Stage 06b: verdict != `REJECT` AND 06b report schema-valid
- Stage 06c: patched output schema-valid (post-patch validation required)
- Stage 07: validation passed (no errors)
- Stage 08: taxonomy gate PASS for the batch containing the video
- Stage 09: chunks file schema-valid; embeddings present; chunk sizes within bounds
- Stage 10: ingest verify count matches expected chunks

**Non-ready labels (examples):**
- `NOT_READY_TRANSCRIPT_CRITICAL`
- `NOT_READY_STAGE06_SCHEMA`
- `NOT_READY_VERIFY_SCHEMA`
- `NOT_READY_PATCH_INVALID`
- `NOT_READY_ENRICHMENT_INVALID`
- `NOT_READY_TAXONOMY_GATE`
- `NOT_READY_CHUNK_EMBED_FAIL`
- `NOT_READY_INGEST_VERIFY_FAIL`

Each label must include `reasons[]` pointing to specific report checks.

---

## 8) Stage-by-Stage Validation Plan (Expanded)

This is the concrete checklist spec (what to validate + what evidence to emit).

### 8.1 Stage 01 (Download)

Deterministic validation (per video):
- audio file exists, readable, non-zero bytes
- duration >= 30s
- RMS/loudness above silence threshold (catch age-restricted silent streams)
- sample rate matches expected (16k for ASR standard)
- optional: clipping ratio below threshold

Evidence bundle:
- `01.download.report.json` with audio duration, loudness, sample rate, downloader version, cookies used or not.

Gate:
- FAIL on silent/too-short audio.

### 8.2 Stage 02 (Transcribe)

Deterministic validation:
- structure: top-level `text` and `segments[]` non-empty
- segments monotonic timestamps
- WPM in [80, 300] (warn outside, fail extreme)
- detect repetition loops (existing logic), intra-segment long-word artifacts (existing logic)
- coverage: last_end / audio_duration >= 0.90 (warn), <0.70 (fail)

Evidence bundle:
- integrate `scripts/training-data/validation/verify-02` output into the report schema
- stop using only aggregated `.flagged.json` as primary evidence

Gate:
- FAIL on CRITICAL severity.

### 8.3 Stage 03 (Align)

Deterministic validation:
- alignment preserves segment count within tolerance (warn if large drift)
- timestamps monotonic; no negative times; end > start
- word boundaries plausible (word durations <= threshold)

Evidence:
- per-video `03.align.report.json` includes alignment coverage + alignment tool version.

### 8.4 Stage 04 (Diarize)

Deterministic validation:
- diarization produced speaker labels for a minimum duration (warn if single-speaker)
- overlap ratio below threshold (warn if extreme)
- speaker turn count and turn duration distributions

Evidence:
- per-video `04.diarize.report.json` includes turn stats + model identifier.

### 8.5 Stage 05 (Audio Features)

Deterministic validation:
- validate against `scripts/training-data/schemas/audio_features.schema.json`
- ensure embedding dimensions correct (if present)
- ensure per-segment features exist where expected; pitch stats in plausible ranges

Evidence:
- per-video `05.audio_features.report.json` + schema validation result list.

### 8.6 Stage 06 (Video Type + Conversations)

Deterministic validation (already partially exists):
- validate against `scripts/training-data/schemas/conversations.schema.json`
- invariants: segment_type enums; video_type <-> segment_type compatibility; conversation id sanity
- "no silent pass": if validation passes but output missing, treat as FAIL (partial write)

Invariant review (plan item; currently a top source of hard failures):
- Re-evaluate the "talking_head/podcast must be all commentary" rule:
  - Allow `segment_type="transition"` with `conversation_id=0` for talking_head/podcast.
  - Keep the hard gate: `conversation_id` must remain 0 for non-infield types (unless the pipeline explicitly supports conversational structure for podcasts).
- Exclude teaser segments (`is_teaser=true`) from conversation contiguity warnings (or track contiguity in two modes: with and without teasers).

Evaluation (non-deterministic):
- monitor drift: video type distribution, unknown speaker rate, conversations per minute

Required improvement (plan):
- add a deterministic re-ask loop: if schema invalid or invariant violated, re-ask LLM with a constrained "return corrected JSON only" prompt.
- record token usage + model identifier into output `metadata` (schema already has slots for this).

### 8.7 Stage 06b (Verify)

Deterministic validation needed:
- create/upgrade `verification.schema.json` to match the patcher contract:
  - enforce enums for `suggested_role`, `suggested_fix`, `suggested_override`
  - enforce presence of `confidence` fields
- re-ask loop on schema violation (no free-form strings)

Critical contract decision:
- remove `mixed` from patchable roles unless conversations schema expands to include it.
- if "mixed speaker" is detected, encode it as `other_flags[]` + a `transcript_artifact`-like signal, and do not auto-patch.

### 8.8 Stage 06c (Patch)

Deterministic validation needed (currently missing):
- post-patch validation against `conversations.schema.json`
- if patcher applies an invalid value, that must be treated as FAIL (block 07)

Evidence:
- `06c.patch.report.json` with:
  - fixes attempted/applied/skipped + reasons
  - post-patch validation results

### 8.9 Stage 07 (Content Enrichment)

Deterministic validation (already exists):
- taxonomy enforcement (techniques/topics)
- evidence grounding checks (fuzzy match)
- phase ordering checks
- cross-reference conversation ids against upstream segments

Missing:
- a JSON schema for `.enriched.json` (at least structural)
- automatic cross-stage validation run (see next)

### 8.10 Cross-Stage (06/06c <-> 07)

Fix pairing discovery:
- support both root-mode and source-mode artifacts
- pair by file stem or by `metadata.source_file` inside stage 07 outputs

Evidence:
- `cross_stage.report.json` per video and a batch rollup.

### 8.11 Stage 08 (Taxonomy Gate)

Deterministic:
- run per batch, write `data/08.taxonomy-validation/report.json`
- include threshold, strict flag, file count scanned, top concepts with examples and video ids

Gate:
- FAIL blocks stage 09/10.

### 8.12 Stage 09 (Chunk + Embed)

Deterministic validation to add:
- chunks file schema validation
- chunk size bounds (min/max chars)
- embeddings present, correct vector length
- metadata fields present and consistent with upstream (video type, conversation id)

Evidence:
- `09.chunk_embed.report.json` per source + per video.

### 8.13 Stage 10 (Ingest)

Deterministic validation to add:
- verify-only mode should compare expected chunk count to actual rows inserted (by `sourceKey`)
- write ingest report with counts and failures

Gate:
- FAIL prevents marking as RAG-ready.

---

## 9) Prompt Quality Plan (Codex Additions)

### 9.1 Contract-First Prompts

For stage 06 and 06b, treat prompts as API contracts:
- print the allowed enums directly in the prompt
- include a "self-check" instruction: if any enum is violated, output should be replaced with `null` + add an `other_flags` entry rather than inventing a new value
- always output JSON inside a `json` code fence with no trailing commentary

### 9.2 Token + Version Telemetry

Stage 06 schema has fields for:
- `metadata.total_input_tokens`
- `metadata.total_output_tokens`

But stage 06 outputs in snapshot do not reliably populate them.

Plan item:
- capture token usage at the CLI boundary (Claude CLI response metadata if available) and store in stage outputs + stage reports.

---

## 10) Confidence Threshold Calibration (Codex Proposal)

Calibration must be data-driven:
- collect a labeled set of 100 patch suggestions (misattr/collapse/video_type/boundary)
- measure precision at each confidence bin (0.70-0.79, 0.80-0.89, 0.90+)
- adjust thresholds to target precision >= 95% for auto-applied patches

---

## 11) Batch Testing Plan (Concrete Runs)

Use `docs/pipeline/test_videos.txt` as the canonical curated test set.

Required runs:
1. `--manifest` run with 1 video (repeat 5x) to validate determinism.
2. `--manifest` run with 2 videos (repeat 3x) to validate sub-batch boundaries.
3. `--manifest` run with 10 videos (repeat 2x) to validate scaled behavior.

Track:
- stage gates triggered
- warning counts by check type
- drift metrics from `batch_report.py`

---

## 12) Automation and Detection Improvements (Prioritized Roadmap)

P0 (blocks scale):
1. Unify output layout or make validators layout-agnostic (pairing by stem/video_id).
2. Align schema/enums across 06b prompt, verification schema, 06c patcher, and conversations schema.
3. Add post-06c schema validation and fail-fast behavior.
4. Implement per-stage evidence bundle schema + "no silent pass" enforcement.

P1 (quality and iteration speed):
5. Add deterministic re-ask loops for 06 and 06b on schema violations.
6. Add stage 05 schema validation (audio_features.schema.json).
7. Add chunk/embed and ingest validators (stages 09/10).

P2 (drift + regression):
8. CI job that runs the pipeline on a small manifest and asserts thresholds.
9. Drift detection gates using `data/batch_reports/*` comparisons.

---

## 13) Detailed Implementation Plan (Merge-Friendly)

This section is intentionally written as a dependency graph so it can be merged with Claude's recommendations.

1. Decide canonical artifact layout strategy:
   - enforce source-mode everywhere OR
   - support both layouts in validators and batch tooling
2. Define `stage_report.schema.json` and implement writers in each stage
3. Fix schema contracts:
   - update `verification.schema.json` to reflect actual patch contract
   - ensure 06c never writes values outside conversations schema enums
4. Add post-06c validation and cross-stage validator execution
5. Implement RAG-ready rubric computation from reports

---

## 14) Execution Checklist (Next Work)

- [ ] Expand this doc with a concrete JSON schema proposal for stage reports
- [ ] Define the exact enum sets for every patchable field and confirm with downstream schema
- [ ] Add explicit "quarantine" flow for failed videos (folder + index file)
- [ ] Specify the minimal metrics set per stage (fields + thresholds)

---

## 15) Open Questions (Needs Decision)

1. Should the pipeline allow a "mixed" role at all?
   - If yes: expand `conversations.schema.json` and update downstream chunking/ingest to handle it.
   - If no: treat mixed-speaker segments as `unknown` + artifact flag, and never auto-patch into "mixed".

2. Canonical output layout:
   - source-mode only (recommended), or dual support indefinitely?

3. RAG-ready acceptance:
   - Are WARNING-level transcript artifacts allowed for ingestion, or do they require quarantine?

---

## 16) Summary (Codex)

Top blockers to scaling to 150x10 batches:
1. Output layout inconsistency prevents reliable cross-stage validation and evidence gathering.
2. Schema/enum contract drift between 06b -> 06c -> conversations schema can silently skip fixes or create invalid outputs.
3. Stages 08/09/10 validators are not yet exercised in the current snapshot; RAG-ready cannot be computed end-to-end.

Quick wins:
1. Upgrade and enforce 06b schema (and enums) + add a re-ask loop on violations.
2. Add post-06c conversations schema validation and block 07 on invalid patches.
3. Make cross-stage pairing layout-agnostic (pair by stem/video_id) and run it by default after 07.
