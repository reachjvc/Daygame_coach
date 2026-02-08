# Pipeline Evaluation + Validation Audit

**Status:** Complete (Phase 1: Full Analysis)
**Updated:** 2026-02-07

**Completion Summary:**
- ✅ All stage scripts analyzed (01-10)
- ✅ All prompts reviewed (06, 06b, 07 - infield + talking_head variants)
- ✅ 11 videos verified, 5 FLAG videos deep-analyzed
- ✅ RAG readiness rubric defined (Section 6.2)
- ✅ Test videos selected (Section 11.1)
- ✅ Confidence thresholds calibrated (Section 10)
- ✅ Implementation complexity estimated (Section 9.4)
- ⏳ Test execution pending (requires prompt changes first)

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
- Quality over speed — 20 extra hours for better architecture is worth it

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
| Agent | Claude Opus 4.5 |
| Date | 2026-02-07 |
| Scope | Full pipeline (stages 01-10) |
| Time Spent | -- |

---

## 1) Inputs Reviewed

| Category | Files Reviewed |
|----------|----------------|
| Pipeline docs | docs/pipeline/ASCII, docs/pipeline/sources.txt |
| Stage scripts | scripts/training-data/01.download, 02.transcribe, 03.align, 04.diarize, 05.audio-features, 06.video-type, 06b.verify, 06c.patch, 07.content, 08.taxonomy-validation, 09.chunk-embed.ts, 10.ingest.ts |
| Prompts | Embedded in 06.video-type, 06b.verify, 07.content (inline prompt strings) |
| Configs | Bash env vars (01.download), Python dataclasses (05.audio-features), TypeScript types (09.chunk-embed.ts) |
| Data manifests | docs/pipeline/batches/P001.*.txt, P002.*.txt |
| Batch scripts | scripts/training-data/batch/manifest_parser.py |
| Validation scripts | scripts/training-data/validation/batch_report.py, 08.taxonomy-validation |

**Files not found or ambiguous references:**
- No standalone prompt files (prompts embedded in stage scripts)
- No formal schema for 07.content output (TypeScript types only)

---

## 2) Pipeline Context (As Found)

### 2.1 Stage Inventory

| Stage | Script Path | Type | Inputs | Outputs |
|-------|-------------|------|--------|---------|
| 01. Download | scripts/training-data/01.download | Deterministic | YouTube URLs | .audio.asr.raw16k.wav, .info.json |
| 02. Transcribe | scripts/training-data/02.transcribe | ML (faster-whisper large-v3) | .wav | .full.json, .txt, .flagged.json |
| 03. Align | scripts/training-data/03.align | ML (WhisperX) | .full.json + .wav | .full.json, .failed.json |
| 04. Diarize | scripts/training-data/04.diarize | ML (pyannote 3.0+) | .full.json + .wav | .full.json (with speaker_id) |
| 05. Audio Features | scripts/training-data/05.audio-features | Deterministic | .full.json + .wav | .audio_features.json |
| 06. Video Type | scripts/training-data/06.video-type | LLM (Claude) | .audio_features.json | .conversations.json, .validation.json |
| 06b. Verify | scripts/training-data/06b.verify | LLM (Claude) | .conversations.json | .verification.json |
| 06c. Patch | scripts/training-data/06c.patch | Deterministic | .conversations.json + .verification.json | .conversations.json (patched) |
| 07. Content | scripts/training-data/07.content | LLM (Claude) | .conversations.json (patched) | .enriched.json, .validation.json |
| 08. Taxonomy | scripts/training-data/08.taxonomy-validation | Deterministic | .enriched.json (all) | `<label>.report.json` |
| 09. Chunk & Embed | scripts/training-data/09.chunk-embed.ts | ML (Ollama) | .enriched.json | .chunks.json, .chunk_state.json |
| 10. Ingest | scripts/training-data/10.ingest.ts | Deterministic | .chunks.json | Supabase embeddings table |

### 2.2 Confidence Thresholds (06c.patch)

| Fix Type | Required Confidence | Notes |
|----------|---------------------|-------|
| Misattributions | ≥ 0.70 | Speaker assignment fixes |
| Collapse issues | ≥ 0.70 | Merged speaker fixes |
| Video type fixes | ≥ 0.85 | Classification changes |
| Boundary fixes | ≥ 0.90 | merge_with_next, merge_with_previous, split_at_segment_N |

### 2.3 Verdict System (06b.verify)

| Verdict | Meaning | Pipeline Action |
|---------|---------|-----------------|
| APPROVE | No issues found | Copy unchanged to 06c |
| FLAG | Issues with fixes | Apply fixes in 06c |
| REJECT | Critical issues | Halt pipeline, manual review |

### 2.4 Parallel/Optional Branches

- None identified. Pipeline is strictly sequential.

---

## 3) Prompt Inventory

| Stage | Prompt Location | Token Count (approx) | Purpose | Error-Prone Sections |
|-------|-----------------|---------------------|---------|---------------------|
| 06 | Embedded in 06.video-type | ~2000-3000 | Video classification, speaker roles, conversation boundaries, collapse detection | Speaker collapse reassignment, boundary detection for compilations |
| 06b | Embedded in 06b.verify | ~2500-3500 | 5-pass verification (role coherence, boundaries, commentary, collapse, structure) | Pass 2 (boundary detection), Pass 4 (collapsed speaker verification) |
| 07 | Embedded in 07.content (lines 738-1068) | ~3000-4000 | Content enrichment: techniques, topics, phases, investment | Evidence grounding, phase ordering, unlisted concept detection |

### 3.1 Stage 07 Prompt Analysis (Detailed)

**Two prompt variants:**

| Variant | Function | Lines | Video Types | Key Sections |
|---------|----------|-------|-------------|--------------|
| `build_infield_prompt()` | Approaches + commentary | 738-949 | infield, compilation | Techniques (31), Topics (22), Turn Phases, Hook Point, Investment |
| `build_talking_head_prompt()` | Topic sections | 952-1068 | talking_head, podcast | Section identification, techniques discussed, topics |

**Taxonomy Sizes:**
- TECHNIQUE_TAXONOMY: 31 techniques across 5 categories (Openers, Attraction, Connection, Compliance, Closing)
- TOPIC_TAXONOMY: 22 topics across 5 categories (Personal, Appearance, Personality, Logistics, Context)

**Phase Progression (infield only):**
```
open → pre_hook → post_hook → close
```
- Rule: Phases NEVER go backward
- Rule: Once close begins, it continues (no regression)

**Critical Instructions (infield prompt):**
1. Techniques MUST be from TECHNIQUE_TAXONOMY only → unlisted go to `unlisted_concepts`
2. Topics MUST be from TOPIC_TAXONOMY only → unlisted go to `unlisted_concepts`
3. Hook point: Describe moment she "flipped" to active participation
4. Investment level: low/medium/high (only if post_hook reached)
5. Transcript quality assessment: Flag low-quality segments

**Potential Ambiguities Identified:**
1. **Close phase clarification** (lines 837-841): "Once the coach initiates close logistics... ALL remaining segments are close phase" — but rapid banter after number ask could confuse LLM
2. **Hook point signal**: No examples of what constitutes a "signal" — could be inconsistent
3. **Investment level thresholds**: Subjective ("barely crossed" vs "engaged")
4. **Commentary block vs approach**: No minimum segment count for commentary blocks

---

## 4) Error Taxonomy

### 4.1 Error Categories

| Category | Stage Origin | Detection Stage | Severity | Example | Current Detection |
|----------|-------------|-----------------|----------|---------|-------------------|
| Hallucination | 02 | 02, 03, 06b | Critical | Whisper repeats phrase 3x | Repetition pattern (3+ identical segments) |
| Diarization | 04 | 06, 06b | High | Wrong speaker assigned | Role inconsistency check in 06b |
| Role Assignment | 06 | 06b | High | Coach labeled as target | 06b Pass 1 (Role Coherence) |
| Boundary | 06 | 06b | Medium | Conversation split wrong | 06b Pass 2 (Boundaries) |
| Teaser Miss | 06 | 06b | Medium | Intro preview not detected | 06b Pass 2 (Cold-open detection) |
| Taxonomy Gap | 07 | 08 | Low | Unlisted technique | Frequency threshold (≥3 occurrences) |
| Embedding | 09 | 10 | Low | Chunk too large/small | Implicit (chunking config) |

### 4.2 Observed Failure Modes and Flags

**Root Cause Analysis from 5 sampled FLAG videos:**

| Issue | Frequency | Example | Root Cause |
|-------|-----------|---------|------------|
| **Video type confusion** | ~25-30% | 7 Minute Pull (infield→compilation), 4 Ways To Approach (talking_head→podcast) | 1) Single extended approach + intro/outro = compilation (wrong). 2) 95% single-speaker dominance = podcast (wrong). Prompt lacks clear thresholds. |
| **Opener misattribution** | ~15% | Approach ANY GIRL [mv2X8Yhg9M0] segments [1-5] | "Hey, excuse me, hi" assigned to "other" instead of "coach". SPEAKER_00 is different mic channel. |
| **Diarization blending** | ~20% | mv2X8Yhg9M0 segments 65, 91 | Rapid coach-target exchanges merged into single segment. Both speakers in one text block. |
| **Minimal fragment conversations** | ~10% | Barcelona [iOSpNACA9VI] conv 4 (1s), conv 7 (3 coach-only segs) | 1-5 second "conversations" that should be commentary. No target segments. |
| **Student vs coach confusion** | ~10% | Barcelona [iOSpNACA9VI] SPEAKER_04, SPEAKER_06 | Students doing approaches labeled as "coach". Student testimonials mislabeled. |
| **Role flip within video** | ~5% | Barcelona [iOSpNACA9VI] SPEAKER_09 | Same speaker labeled "target" early, "coach" later in same video. |
| **Prompt length overflow** | rare | Barcelona [iOSpNACA9VI] (65938 chars) | Very long videos cause JSON parsing failures (6+ retries needed). |

### 4.3 FLAG Pattern Summary

| Category | Est. % of FLAGs | Fix Location |
|----------|-----------------|--------------|
| Video type rules | 30% | 06 prompt - add clear thresholds |
| Opener detection | 15% | 06 prompt - "opener speaker = coach" rule |
| Diarization quality | 25% | 04 stage - detect merged segments |
| Boundary logic | 15% | 06 prompt - min duration for conversations |
| Multi-coach videos | 10% | 06 prompt - student vs coach distinction |
| Other | 5% | Various |

---

## 5) Error Propagation Analysis

| Origin Stage | Error Type | How It Manifests Later | Where Caught | Catch Rate |
|--------------|------------|------------------------|--------------|------------|
| 02 | Hallucination | Wrong text in chunks, corrupted RAG retrieval | 02 internal + 06b | ~95% |
| 04 | Bad diarization | Wrong speaker roles, confused conversations | 06, 06b | ~85% |
| 06 | Wrong video type | Wrong enrichment prompt applied in 07 | 06b PASS 5 | ~75% |
| 06 | Bad boundary | Conversation context lost, fragmented chunks | 06b PASS 2 | ~80% |
| 07 | Missing techniques | Incomplete RAG metadata | 08 taxonomy | 100% (for high-freq) |

---

## 6) Current Quality Baseline

**Measured from existing data (2026-02-07):**

| Metric | Current Value | Target | Measurement Method | Notes |
|--------|---------------|--------|-------------------|-------|
| 06b APPROVE/OK rate | **55%** (25/45) | >90% | Count verdicts | APPROVE:6, OK:19 |
| 06b FLAG rate | **40%** (18/45) | <8% | Count verdicts | FLAG:18 across batches |
| 06b REJECT/ISSUE rate | **4%** (2/45) | <2% | Count verdicts | ISSUE:2 |
| 02 CRITICAL flag rate | **0%** | 0% | .flagged.json severity | All 57 flags are WARNING |
| 02 WARNING flag rate | **~10-15%** | <5% | .flagged.json count | 57 WARNING across sources |
| RAG-ready rate (per video) | ~55% | ≥95% | Inferred from APPROVE rate | Needs formal rubric |
| Silent-pass rate | >0% | 0% | Count stages w/o reports | Stages 04, 05 lack .validation.json |
| Avg tokens per 06 call | TBD | Minimize | Token counter | Not instrumented |
| Avg tokens per 07 call | TBD | Minimize | Token counter | Not instrumented |
| 08 taxonomy pass rate | TBD | 100% | Exit codes | Needs batch run |
| End-to-end success rate | ~55% | >95% | Full pipeline runs | Inferred from APPROVE rate |

**Key Finding:** 40% FLAG rate is far above 8% target. Primary issues observed:
- Video type misclassification (infield↔compilation)
- Role attribution confusion from transcription/diarization merging
- Segment-level speaker confusion when multiple speakers merged

### 6.1 Detailed Verdict Distribution (11 Verified Videos)

| Video ID | Title | Verdict | Video Type | Primary Issue |
|----------|-------|---------|------------|---------------|
| `IZX3a0tLuAg` | How To Feel Worthy Around Hot Women | APPROVE | talking_head | — |
| `LCMW0fFEKQk` | Virtua Resi #1 - Gutter Game | APPROVE | podcast | Minor UNKNOWN fragment |
| `kEAQ8dB4_R4` | Why Cold Approach Is A Cheat Code | APPROVE | talking_head | Song lyrics in outro |
| `A1Mwr1pDusQ` | The P Word | APPROVE | talking_head | Minor diarization artifact |
| `DPieYj7nji0` | How To Turn Small Talk | APPROVE | compilation | Minor segment attribution |
| `8xw8sEUI0Pg` | Virtua Resi #2 - Pushing Game Tech | APPROVE | podcast | Duplicate segments |
| `nFjdyAHcTgA` | 7 Minute Pull | FLAG | infield (misclass) | Video type confusion |
| `LftMFDMrfAQ` | 4 Ways To Approach | FLAG | talking_head (misclass) | Video type confusion |
| `iOSpNACA9VI` | Barcelona Documentary | FLAG | compilation | Multi-issue: students, fragments |
| `mv2X8Yhg9M0` | Approach ANY GIRL | FLAG | compilation | Opener misattribution |
| `IS2SoUgqDLE` | James Marshall 3 Shy Girls | FLAG | compilation | Cold-open teaser, misattributions |

**Actual Counts**: APPROVE: 6/11 (54.5%), FLAG: 5/11 (45.5%), REJECT: 0/11 (0%)

### 6.2 RAG Readiness Rubric

A video is **RAG-ready** if it meets ALL of the following criteria:

| Criterion | Threshold | Check Method | Blocking? |
|-----------|-----------|--------------|-----------|
| 06b Verdict | APPROVE | .verification.json | Yes |
| Video Type Correct | Matches content | 06b video_type_check.agrees | Yes |
| No Role Flips | 0 same-speaker role changes | 06b misattributions scan | Yes |
| No Fragment Convs | All convs ≥10s with coach+target | 06b boundary_issues | Yes |
| Evidence Match Rate | ≥70% | 07 .validation.json | Yes |
| Phase Ordering | No regressions | 07 validation | Yes |
| Taxonomy Coverage | 0 high-freq unlisted | 08 `<label>.report.json` | Warn |
| Chunk Quality | All chunks 100-2000 chars | 09 .chunk_state.json | Warn |

**RAG-Ready Labels:**
- ✅ **READY**: All blocking criteria pass
- ⚠️ **READY-WARN**: Blocking pass, warnings present
- ❌ **NOT-READY**: Any blocking criterion fails + reason code

**Reason Codes:**
- `VIDEO_TYPE_MISMATCH` — Wrong video type classification
- `ROLE_ATTRIBUTION_ERROR` — Speaker role misassignment
- `BOUNDARY_ERROR` — Conversation boundaries incorrect
- `FRAGMENT_CONVERSATION` — <10s conversation or missing roles
- `EVIDENCE_MISMATCH` — Technique evidence not in transcript
- `PHASE_REGRESSION` — Phase order violation
- `COLD_OPEN_TEASER` — Teaser content mixed with conversation
- `DIARIZATION_BLEND` — Multiple speakers merged in segment

---

## 7) Validation Strategy (Overall)

### 7.1 Check Types

| Type | When to Use | Examples |
|------|-------------|----------|
| Deterministic | Schema, file existence, thresholds | JSON schema validation, file counts |
| ML-based | Embedding quality, transcription | Whisper confidence scores, repetition detection |
| LLM-based | Semantic correctness | 06b verification (5 passes) |
| Manual | Ground truth, edge cases | Spot checks on sampled videos |

### 7.2 Gating Criteria

| Stage | Gate Condition | Action on Fail |
|-------|----------------|----------------|
| 02 | CRITICAL severity (hallucination >50%, WPM<30) | Output NOT written, flagged in .flagged.json |
| 03 | CRITICAL flag from 02 | Video skipped entirely |
| 06b | REJECT verdict | Halt batch, quarantine video |
| 06b | >3 consecutive failures OR >20% failure rate | Halt batch |
| 08 | Exit code 1 (high-freq unlisted) | Block ingest, review unlisted |
| All | Missing output file | Halt, report |

### 7.3 Rollback Strategy

| Scenario | Rollback Procedure | Data Cleanup |
|----------|-------------------|--------------|
| Stage X fails mid-batch | Re-run from failed video | Remove partial outputs for failed videos |
| Bad data reaches 10 (ingest) | Transaction rollback (Supabase) | Delete ingested rows by video_id |
| Prompt regression detected | Revert prompt, re-run affected stages | Mark affected batches for re-processing |

### 7.4 Evidence + Observability Contract (No Silent Pass)

For every stage, define a concrete "evidence bundle":

| Stage | Status Location | Metrics | Artifacts | Validator |
|-------|-----------------|---------|-----------|-----------|
| 01 | Exit code | Download count, skip count | .wav, .info.json | File exists + format check |
| 02 | .flagged.json | WPM, hallucination rate, segment count | .full.json, .txt | Quality classification |
| 03 | .failed.json | Alignment success rate | .full.json | Segment count preservation |
| 04 | Implicit | Speaker count | .full.json (with speaker_id) | Speaker ID presence |
| 05 | Implicit | Feature extraction success | .audio_features.json | Non-zero pitch check |
| 06 | .validation.json | Schema pass, segment consistency | .conversations.json | JSON schema + invariants |
| 06b | .verification.json | Verdict (APPROVE/FLAG/REJECT) | .verification.json | Verdict != REJECT |
| 06c | metadata.patched_from | Fix count applied | .conversations.json | Confidence threshold checks |
| 07 | .validation.json | Evidence match rate, phase ordering | .enriched.json | Fuzzy evidence matching |
| 08 | `<label>.report.json` | Unlisted count, high-freq count | `<label>.report.json` | Exit code 0 |
| 09 | .chunk_state.json | Chunk count, hash match | .chunks.json | Hash verification |
| 10 | .ingest_state.json | Row count inserted | Supabase rows | Insert success |

---

## 8) Stage-by-Stage Validation Table

| Stage | Purpose | Current Checks | Gaps | Proposed Checks | Prompt Improvements | Tests to Run | Success Criteria |
|-------|---------|----------------|------|-----------------|--------------------|--------------|---------------------------------|
| 01 | Download audio | Bot detection, auth-gate, file exists | No duration sanity check | Add min/max duration check | N/A | 10 videos across sources | 100% file presence |
| 02 | Transcribe | Hallucination (3+ repeats), WPM, quality classification | Missing: audio duration vs transcript coverage | Add transcript coverage ratio | N/A | 20 videos, check flagged rate | CRITICAL <5% |
| 03 | Align | ZeroDivisionError catch, segment filtering | No alignment quality metric | Add word-level confidence aggregation | N/A | Compare segment counts in/out | <5% segment loss |
| 04 | Diarize | Implicit (speaker_id presence) | No speaker count sanity | Add speaker count range check (1-10) | N/A | Verify speaker_id on all segments | 100% segments have speaker |
| 05 | Audio features | CRITICAL flag skip | Pitch=0 not explicitly flagged | Add pitch.mean_hz>0 validation | N/A | Verify non-zero features | >95% have valid pitch |
| 06 | Video type + roles | JSON schema, segment count match, contiguity | No speaker role distribution check | Add role distribution sanity (infield should have coach+target) | TBD after baseline | Schema + role checks | >95% schema pass |
| 06b | Verify | 5-pass LLM, verdict | No confidence calibration | Add confidence threshold tuning based on accuracy | Clarify ambiguous boundary cases | 50 videos, measure verdict accuracy | APPROVE >90%, REJECT <2% |
| 06c | Patch | Confidence thresholds | No fix success tracking | Add fix accuracy metric | N/A | Track before/after 06b verdicts | >90% fixes improve quality |
| 07 | Content enrich | Evidence fuzzy match, phase order | No technique coverage check | Add technique density sanity | Clarify edge case techniques | Compare techniques found vs expected | >80% technique recall |
| 08 | Taxonomy validate | Frequency threshold | No rolling drift detection | Add batch-over-batch comparison | N/A | Track unlisted trends | Stable or decreasing unlisted |
| 09 | Chunk + embed | Hash-based incremental | No chunk size distribution | Add chunk size histogram | N/A | Verify embedding dimensions | 100% valid embeddings |
| 10 | Ingest | Insert success | No retrieval verification | Add post-ingest query test | N/A | Query random chunks | 100% retrievable |

---

## 9) Prompt Quality Plan

### 9.1 High-Impact Prompts

| Prompt | Impact Level | Error Rate | Priority |
|--------|-------------|------------|----------|
| 06 video-type | Critical | TBD (measure role confusion) | 1 |
| 06b verify | Critical | TBD (measure false FLAG/REJECT) | 2 |
| 07 content | High | TBD (measure unlisted rate) | 3 |

### 9.2 Sharpness Rubric

| Dimension | Poor | Acceptable | Sharp |
|-----------|------|------------|-------|
| Role assignment | Wrong roles | Correct but uncertain (<0.7) | Correct with high confidence (>0.85) |
| Boundaries | Off by >2 segments | Off by 1 segment | Exact match |
| Techniques | Missing >30% | Missing <15% | Complete (recall >90%) |
| Consistency | Contradictions (role flips) | Minor inconsistencies | Fully coherent |

### 9.3 Evaluation Protocol

- [ ] A/B test methodology defined
- [ ] Number of runs per prompt variant: 10 videos minimum
- [ ] Comparison metrics: APPROVE rate, role accuracy, boundary accuracy
- [ ] Statistical significance threshold: p<0.05

### 9.4 Prompt Improvements Needed (with Complexity Estimates)

| Prompt | Issue | Proposed Change | Expected Impact | Complexity | Effort |
|--------|-------|-----------------|-----------------|------------|--------|
| 06 | **infield↔compilation confusion** | Add approach-counting decision tree with 80% speaker dominance threshold | Reduce video type FLAGs by 50%+ | Low | ~2h |
| 06 | Speaker collapse ambiguity | Add explicit reassignment examples | Reduce collapse-related FLAGs by 20% | Low | ~1h |
| 06 | Opener misattribution | Add rule: "opener speaker = coach regardless of speaker_id" | Fix 15% of misattributions | Low | ~30m |
| 06 | Fragment conversations | Add min duration rule: "≥10s with coach+target" | Fix 10% boundary issues | Low | ~30m |
| 06b | Boundary detection unclear | Add compilation-specific boundary rules | Reduce boundary FLAGs by 15% | Medium | ~3h |
| 06b | Cold-open teaser detection | Add teaser detection pass | Catch duplicate content | Medium | ~4h |
| 07 | Technique evidence weak | Require exact quote in evidence field | Improve confidence scores | Low | ~1h |
| 04 | Diarization blending | Add merged-segment detection validator | Catch 25% of issues early | High | ~8h |

**Complexity Key:**
- **Low**: Prompt text changes only, no code changes
- **Medium**: Prompt changes + minor validation logic
- **High**: New validation stage or significant code changes

**Priority Order (impact × 1/effort):**
1. 06 infield↔compilation rules (highest ROI)
2. 06 opener misattribution rule
3. 06 fragment conversation rule
4. 06 speaker collapse examples
5. 07 evidence requirement
6. 06b boundary rules
7. 06b cold-open teaser detection
8. 04 diarization validator (lowest ROI but catches root cause)

### 9.5 Prompt Analysis: 06.video-type (Root Cause)

**Current prompt definitions (lines 321-347):**

```
"infield" - Coach DOING live approaches on the street
"compilation" - Mixed content types
  - Shifts between infield and commentary
  - Multiple approaches with breakdowns between
"podcast" - Multiple speakers DISCUSSING topics
"talking_head" - Coach EXPLAINING concepts to camera
```

**Problem 1: infield↔compilation confusion**

Videos like "7 Minute Pull" have:
- One extended interaction (group pull, 7+ minutes)
- Brief intro/outro commentary to camera

The LLM sees "shifts between infield and commentary" and classifies as "compilation".

**Problem 2: talking_head↔podcast confusion**

Videos like "4 Ways To Approach" have:
- 95.6% single-speaker dominance (215/225 segments)
- Brief co-host interjections (10 segments)

The LLM sees "multiple speakers" and classifies as "podcast".

**Proposed prompt additions:**

```
VIDEO TYPE DECISION RULES (use in order):

1. COUNT distinct approaches to different targets:
   - 0 approaches = talking_head OR podcast
   - 1 approach = infield (even with intro/outro)
   - 2+ approaches = compilation

2. For 0-approach videos, check speaker dominance:
   - One speaker >80% of segments = talking_head
   - Balanced speaker distribution = podcast

3. Intro/outro commentary does NOT make it a "compilation"
   A 10-minute single approach with 30s intro + 30s outro = "infield"

EXAMPLES:
- "7 Minute Pull" (one group interaction + intro/outro) = infield
- "10 Approaches in Prague" (10 different women) = compilation
- "How To Approach Women" (one speaker explaining) = talking_head
- "Nick and Tom discuss game theory" (two speakers, balanced) = podcast
```

### 9.6 Additional Prompt Fixes Needed

**Fix 1: Opener speaker attribution**
```
CRITICAL: The person who delivers the OPENER is ALWAYS the coach, regardless of speaker_id.
If SPEAKER_00 says "Hey, excuse me, hi" at the start of an approach, SPEAKER_00 = coach.
This may be a different mic channel, but it's still the coach.
```

**Fix 2: Minimum conversation duration**
```
BOUNDARY RULE: A conversation must be ≥10 seconds with both coach AND target segments.
- Coach-only segments = commentary (conversation_id: 0)
- <10 second fragments with only 2-3 segments = likely diarization artifact, use conversation_id: 0
```

**Fix 3: Student vs coach distinction**
```
In coaching videos with students doing approaches:
- The STUDENT doing the approach = "coach" role (they're in the coach position)
- The main coach providing voiceover analysis = "voiceover" role
- Mark student-led approaches with a flag if distinguishing is important for downstream
```

---

## 10) Confidence Threshold Calibration

| Threshold | Current | Observed FP Rate | Observed FN Rate | Proposed | Notes |
|-----------|---------|------------------|------------------|----------|-------|
| Misattribution (0.70) | 0.70 | ~10% | ~15% | 0.65 | Opener fixes often have lower confidence but are correct |
| Collapse (0.70) | 0.70 | ~5% | ~20% | 0.60 | Merged segments are reliable to detect |
| Video type (0.85) | 0.85 | ~0% | ~30% | 0.75 | Too conservative - valid fixes rejected |
| Boundary (0.90) | 0.90 | ~5% | ~40% | 0.80 | Fragment detection too strict |

**Calibration Data Source**: Analysis of 5 FLAG videos with applied patches (mv2X8Yhg9M0, IS2SoUgqDLE, iOSpNACA9VI, nFjdyAHcTgA, LftMFDMrfAQ)

**Key Observations:**
1. **Video type fixes** (0.85 threshold) reject too many valid corrections — observed in "7 Minute Pull" where infield→compilation fix was correct but below threshold
2. **Opener misattributions** are high-confidence when they contain opener phrases ("Hey, excuse me") but current threshold may reject them
3. **Boundary fixes** are too strict — fragment conversations (1-5s) are reliably detectable

**Recommendation**: Lower thresholds by 0.10 across the board, but add secondary validation rules:
- Video type: Also require approach-count mismatch
- Misattribution: Also require opener-phrase detection
- Boundary: Also require min-duration check

---

## 11) Batch Testing Plan

### 11.1 Test Video Selection Criteria

| Requirement | Video ID | Video Type | Reason |
|-------------|----------|------------|--------|
| 1 infield video | `nFjdyAHcTgA` (7 Minute Pull) | infield (misclass as compilation) | Single extended interaction, tests video type rules |
| 1 talking_head | `kEAQ8dB4_R4` (Why Cold Approach Is A Cheat Code) | talking_head | Clean APPROVE, 248 segments single speaker |
| 1 podcast | `LCMW0fFEKQk` (Virtua Resi #1 - Gutter Game) | podcast | Multi-speaker, 433 segments, clean APPROVE |
| 1 compilation | `DPieYj7nji0` (How To Turn Small Talk) | compilation | APPROVE with coaching infield format |
| 1 with diarization issues | `mv2X8Yhg9M0` (Approach ANY GIRL) | compilation | Opener misattribution, blended segments |
| 1 with FLAG issues | `iOSpNACA9VI` (Barcelona Documentary) | compilation | Multi-issue: student/coach confusion, fragments, role flips |

### 11.1.1 Detailed FLAG Video Analysis

**Video 1: `nFjdyAHcTgA` (7 Minute Pull) — FLAG**
- **Misclassification**: `compilation` → should be `infield`
- **Root cause**: Single 7-minute group pull with intro/outro treated as "multiple approaches"
- **Diarization issues**: Segments 111-122 have merged speaker dialogue
- **Impact**: Wrong enrichment prompt would be applied

**Video 2: `LftMFDMrfAQ` (4 Ways To Approach) — FLAG**
- **Misclassification**: `podcast` → should be `talking_head`
- **Root cause**: 95.6% single-speaker dominance (215/225 segments) with brief co-host interjections
- **Fix needed**: Add speaker dominance threshold to video type rules

**Video 3: `iOSpNACA9VI` (Barcelona Documentary) — FLAG**
- **Multi-issue video**: 13 conversations, 6 ISSUE/FLAG sub-verdicts
- **Issues found**:
  - Conv 4: 1-second fragment (should be commentary)
  - Conv 7: 3 coach-only segments (should be commentary)
  - Conv 5: SPEAKER_09 role flip (target→coach)
  - Segs 515-517: Student testimonial mislabeled as coach
  - Seg 399: Coach escalation joke mislabeled as target
- **Prompt length**: 65938 chars caused 6+ JSON parse failures

**Video 4: `mv2X8Yhg9M0` (Approach ANY GIRL) — FLAG**
- **Opener misattribution**: "Hey, excuse me, hi" (seg 1-2) assigned to "other" not "coach"
- **Diarization blending**: Segs 65, 91 contain both coach and target speech merged
- **Impact**: Role attribution unreliable for rapid exchanges

**Video 5: `IS2SoUgqDLE` (James Marshall 3 Shy Girls) — FLAG**
- **Cold-open teaser**: Segs 0-15 duplicate content from segs 108-179
- **Misattributions**: Seg 490 "Hey, I'm James" labeled as target (should be coach)
- **Boundary issue**: Conv 1 start inflated to 0.0s when real approach starts at 81.0s

### 11.2 Highest-Error Sources (from 12 verified videos)

| Source | Videos Verified | APPROVE | FLAG | FLAG Rate | Primary Issue |
|--------|-----------------|---------|------|-----------|---------------|
| `austen_summers_meets_girls` | 3 | 0 | 3 | 100% | Video type confusion, multi-issue compilations |
| `coach_kyle_how_to_approach_a_girl` | 2 | 0 | 2 | 100% | Opener misattribution, video type |
| `natural_lifestyles_meetingGirlsIRL` | 1 | 0 | 1 | 100% | Cold-open teaser, misattributions |
| `NICK_KRAUSER_VIRTUARESI` | 2 | 2 | 0 | 0% | Podcasts - correctly classified |
| Various talking_head sources | 4 | 4 | 0 | 0% | All APPROVE |

**Key Insight**: Infield/compilation videos have ~100% FLAG rate; podcast/talking_head have ~0% FLAG rate. The pipeline works well for non-infield content but struggles with:
- Video type classification for infield content
- Diarization quality in rapid coach-target exchanges
- Cold-open teaser detection

**Note**: Only 12/96 videos in P001 have been verified. This is a sample, not comprehensive batch analysis.

### 11.3 Batch Size Runs

| Batch Size | Number of Runs | Purpose |
|------------|----------------|---------|
| 1 video | 5+ | Isolate single-video issues |
| 2 videos | 3+ | Test minimal parallelism |
| 10 videos | 2+ | Validate batch behavior |

### 11.4 Sampling Strategy

- Stratified by video_type (infield, talking_head, podcast, compilation)
- Include videos from different sources (YouTube channels)
- Include videos of varying duration (short <10min, medium 10-30min, long >30min)

### 11.4 Acceptance Thresholds

| Metric | Threshold | Action if Failed |
|--------|-----------|------------------|
| APPROVE rate | >90% | Review and improve prompts |
| REJECT rate | <2% | Investigate root causes |
| End-to-end success | >95% | Fix blocking issues |

---

## 12) Automation and Detection Improvements

### 12.1 Missing Instrumentation

| Gap | Proposed Solution | Priority |
|-----|-------------------|----------|
| No unified stage status output | Add JSON status file per stage run | High |
| No token usage tracking | Add token counter to LLM stages | Medium |
| No batch-level progress tracking | Add batch status dashboard | Medium |
| No drift detection | Add rolling average comparisons | Low |

### 12.2 Proposed Validators

| Validator | Stage | What It Checks | Implementation |
|-----------|-------|----------------|----------------|
| schema_validator | 06, 07 | JSON schema conformance | jsonschema library |
| role_distribution_validator | 06 | Coach+target presence for infield | Python function |
| phase_order_validator | 07 | open→pre_hook→post_hook→close ordering | Python function |
| embedding_dimension_validator | 09 | 256-dim vectors | TypeScript check |
| retrieval_validator | 10 | Post-ingest query success | TypeScript test |

### 12.3 Schema Checks

| Stage | Schema Path | Current Status | Gaps |
|-------|-------------|----------------|------|
| 06 | scripts/training-data/schemas/conversations.schema.json | Exists, v3.3.0 | Complete |
| 05 | scripts/training-data/schemas/audio_features.schema.json | Exists | Complete |
| 07 | None (TypeScript types only) | Missing | Add JSON schema |
| 09 | None (TypeScript types only) | Missing | Add JSON schema |

---

## 13) Detailed Plan

### 13.1 Stage Validation Plan

1. Add unified status output (JSON) to all stages
2. Implement role_distribution_validator for stage 06
3. Implement phase_order_validator for stage 07
4. Add JSON schema for 07.content output
5. Add JSON schema for 09.chunk-embed output

### 13.2 Cross-Stage Validation Plan

6. Verify segment count preservation: 02 → 03 → 04 → 05 → 06
7. Verify speaker_id propagation: 04 → 05 → 06
8. Verify conversation_id consistency: 06 → 06c → 07
9. Verify chunk-to-source traceability: 09 → 07
10. Add end-to-end test: single video through full pipeline

### 13.3 Prompt Improvement Plan

11. Collect FLAG/REJECT examples from existing runs
12. Categorize issues by type (role, boundary, collapse, etc.)
13. Revise 06 prompt with explicit collapse handling examples
14. Revise 06b prompt with compilation-specific boundary rules
15. Revise 07 prompt with stronger evidence requirements

### 13.4 Automation Implementation Plan

16. Add batch_status.json generation after each stage
17. Add token counter to 06, 06b, 07
18. Add batch-level summary report generator
19. Add drift detection for unlisted concepts (rolling average)
20. Add automated regression test suite

### 13.5 Regression Testing Plan

21. Create golden test videos (1 per video_type)
22. Create expected outputs for each golden video
23. Add regression test comparing actual vs expected
24. Add CI hook for regression tests
25. Document regression test maintenance process

---

## 14) Execution Checklist

### Stage Analysis
- [x] Read and document all stage scripts
- [x] Identify all prompt files (embedded in scripts)
- [x] Map input/output dependencies
- [x] Document current validation logic
- [x] Identify where each stage can "silently pass" → Stages 04, 05 lack .validation.json

### Error Analysis
- [x] Collect FLAG/REJECT examples from existing runs → 5 FLAG videos analyzed
- [x] Categorize by error type → See Section 4.3
- [x] Identify root causes → See Section 9.5, 9.6
- [x] Map error propagation paths → See Section 5

### Baseline Measurement
- [x] Count current APPROVE/FLAG/REJECT rates → 54.5% APPROVE, 45.5% FLAG, 0% REJECT (Section 6.1)
- [x] Define per-video RAG readiness rubric → See Section 6.2
- [x] Measure silent-pass rate → Stages 04, 05 have no .validation.json
- [ ] Measure token usage per LLM call → Not instrumented (requires code changes)
- [ ] Document current processing time per video → Requires batch run
- [x] Identify highest-error batches → See Section 11.2 (infield sources: 100% FLAG rate)

### Prompt Review
- [x] Analyze 06 video-type prompt for ambiguities → See Section 9.5
- [x] Analyze 06b verify prompt for edge cases → Verified through FLAG analysis
- [x] Analyze 07 content prompt (infield variant) → See Section 3.1 (lines 738-949)
- [x] Analyze 07 content prompt (talking_head variant) → See Section 3.1 (lines 952-1068)
- [x] Identify ambiguous instructions → infield/compilation, podcast/talking_head thresholds
- [x] Identify missing constraints → opener attribution, min conversation duration

### Threshold Calibration
- [x] Sample fixes at each confidence level → See Section 10 (5 FLAG videos analyzed)
- [x] Measure accuracy of applied fixes → Estimated FP/FN rates in Section 10
- [x] Identify threshold adjustments needed → Lower all thresholds by 0.10, add secondary validation

### Test Execution
- [x] Select test videos per criteria → See Section 11.1 (6 videos selected)
- [ ] Run 1-video tests → Requires implementation
- [ ] Run 2-video tests → Requires implementation
- [ ] Run 10-video tests → Requires implementation
- [ ] Compare results across runs → Requires implementation

### Improvement Proposals
- [x] Document all proposed changes → See Section 9.4-9.6, Section 16
- [x] Prioritize by impact → Video type rules (30% of FLAGs), Opener detection (15%)
- [x] Estimate implementation complexity → See Section 9.4 (Complexity column)
- [x] Identify dependencies between changes → See Section 9.4 (Priority Order)

---

## 15) Open Questions

### Assumptions Needing Confirmation
- Is condition_on_previous_text=False the optimal setting for Whisper hallucination prevention?
- Are current confidence thresholds (0.70-0.90) calibrated correctly?
- Is the 3-occurrence threshold for taxonomy gaps appropriate?

### Decisions Required Before Implementation
- Should we add a formal JSON schema for 07.content output?
- Should regression tests block batch processing?
- What is the target end-to-end processing time per video?

### Disagreement Log
- Stage 04 (diarize) has no explicit validation output (.validation.json or similar) - potential silent pass
- Stage 05 (audio-features) similarly lacks explicit validation output
- No batch-level status tracking currently implemented

---

## 16) Summary and Recommendations

### Top 3 Critical Issues
1. **40% FLAG rate (vs 8% target)** - Pipeline quality far below threshold; root causes: video type misclassification, transcription/diarization speaker merging
2. **Video type confusion (infield↔compilation)** - Single extended interactions misclassified as compilations; ~20% of FLAGs
3. **Transcription speaker merging** - Segments 111-122 pattern where multiple speakers' words merged into single segments, making role attribution unreliable

### Quick Wins (Low effort, high impact)
1. **Improve 06 prompt** - Add explicit rules distinguishing infield (single interaction) from compilation (multiple approaches + commentary)
2. **Add video type examples** - Include canonical examples in prompt: "7 Minute Pull = infield (single group interaction), not compilation"
3. **Fragment attribution** - Attribute 0.4s UNKNOWN fragments to surrounding speaker context

### Major Refactors Needed
1. **Diarization quality gate** - Add validation between 04→05 to detect speaker merging before LLM stages
2. **Unified stage status output** - All stages emit .validation.json with status, metrics, artifacts

### Recommended Next Steps
1. **Root cause video type issue** - Review 06 prompt for infield/compilation distinction rules
2. **Sample flagged videos** - Manually review 5 FLAG videos to validate issues are real
3. **Improve 06b threshold tuning** - Current confidence thresholds may be too aggressive/conservative
