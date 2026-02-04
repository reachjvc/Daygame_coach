# Pipeline Status

**Updated**: 04-02-2026 - Added Stage 07 speaker-correction, renumbered 07→11
**Status**: Phase 5 - Stage 06 Complete, Ready for Stage 07

---

## Quick Reference

| Stage | Script | Status | R1 | R2 |
|-------|--------|--------|----|----|
| 01.download | `01.download` | RETAINED (~966 videos) | - | - |
| 02.transcribe | `02.transcribe` | R1 APPROVED | [x] | [ ] |
| 03.align | `03.align` | R1 APPROVED | [x] | [ ] |
| 04.diarize | `04.diarize` | R1 COMPLETE | [x] | [ ] |
| 05.audio-features | `05.audio-features` | R1 APPROVED | [x] | [ ] |
| 06.conversations | `06.conversations.ts` | R1 IN PROGRESS | [ ] | [ ] |
| 07.speaker-correction | `07.speaker-correction` | FRESH START | [ ] | [ ] |
| 08.content | `08.content` | FRESH START | [ ] | [ ] |
| 09.structure | `09.structure` | FRESH START | [ ] | [ ] |
| 10.chunk | `10.chunk` | TO BE CREATED | [ ] | [ ] |
| 11.ingest | `11.ingest.ts` | FRESH START | [ ] | [ ] |

**Note:** Stage 07 (speaker correction) added as dedicated stage. Old 07-10 shifted to 08-11.

---

## Critical Rules (MUST BE FOLLOWED)

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **User verifies quality before moving on** | Each stage requires explicit user approval before proceeding |
| 2 | **Quality over speed** | Simple scripts, minimal heuristics/fallbacks. 20 hours extra for better quality is worth it |
| 3 | **Alternative scripts for failures** | Created case-by-case when failures occur (not proactively) |
| 4 | **Document all failures** | Every failure logged to `.failed.json` or `.flagged.json` with root cause |
| 5 | **Deep quality review before presenting** | Claude must analyze output deeply before showing results to user |
| 6 | **Split stages where possible** | Prefer multiple simple stages over one complex stage |
| 7 | **Clean up old scripts** | Use old scripts as starting point but refactor to best practices |
| 8 | **Ask questions when uncertain** | Never assume - ask user for clarification |
| 9 | **NEVER mark R1/R2 complete before user says "approved"** | Claude MUST wait for explicit user confirmation. Status stays PENDING until user explicitly approves. |
| 10 | **Run thorough quality checks before presenting results** | MANDATORY: gap analysis, repetition detection, timing validation, word density, content coherence, suspicious patterns. Be critical and skeptical. |
| 11 | **Use quality-review subagent before presenting R1/R2 results** | MANDATORY: Spawn a skeptical subagent to verify the stage's STATED PURPOSE is achieved, not just technical metrics. See "Quality Review Subagent" section below. |

---

## Current Phase: 5 - Stage 06 Conversations (Claude Code Direct)

### Phase 5 Tasks
- [x] Create handoff document: `docs/pipeline/stages/STAGE_06_PROCESSING.md`
- [x] Create state file: `scripts/training-data/06.conversations-state.json`
- [x] Update stage documentation with Claude Code Direct approach
- [ ] **R1: Process 5 test videos using Claude Code Direct**
  - Uses Claude Code (subscription) instead of API calls
  - Opus 4.5 model (higher quality than Haiku)
  - State file tracks progress for handoff
- [ ] User verifies R1 outputs
- [ ] R2: Process 15 additional videos

### Phase 0 Tasks (COMPLETE)
- [x] Create `/docs/pipeline/` folder structure
- [x] Create `PIPELINE_STATUS.md` as single source of truth
- [x] Create stage documentation files (11 files in `stages/`)
- [x] Create FAILURES.md and REMEDIATION.md
- [x] Select 5 fresh test videos for R1

### Phase 1 Tasks
- [x] Fix R1 video downloads (4/5 had missing audio - yt-dlp updated to 2026.1.31)
- [x] Run Stage 02 transcription on R1 videos
- [x] Deep quality review of outputs
- [x] **FIX-001: Changed script defaults** (raw audio + condition_on_prev=False)
- [x] Re-run R1 with new defaults (0 hallucinations, all 5 clean)
- [x] User approval of R1 results (APPROVED 03-02-2026)

### R1 Issues Found
| Video | Issue | Remediation |
|-------|-------|-------------|
| social_stoic/G2sWa8X0EjA | "I'm holding them" x104 repeats | Fixed via script defaults change |
| natural_lifestyles_meetingGirlsIRL/WSFSpbFCPZo | "I don't know" x68 repeats | Fixed via script defaults change |
| austen_summers_meets_girls/H3_8iPikhDw | "Sí" x3 (false positive) | No action - real Spanish speech |

---

## Failures & Fixes

### FIX-001: Whisper Hallucination Loops (03-02-2026)

**Problem:** 2/5 R1 videos had severe hallucination loops where Whisper repeated the same phrase 40-100+ times.

**Root Cause Analysis:**
1. `condition_on_previous_text=True` (old default) creates a feedback loop - once Whisper hallucinates, it keeps repeating
2. The denoised "clean" audio was filtering out quieter voices (women's responses in infield footage), leaving gaps that Whisper filled with hallucinations

**Testing Results:**
| Config | social_stoic | natural_lifestyles |
|--------|--------------|-------------------|
| clean + cond=True (old) | ❌ 104 repeats | ❌ 68 repeats |
| clean + cond=False | ✓ 0 repeats | ✓ 0 repeats |
| raw + cond=False | ✓ 0 repeats | ✓ 0 repeats |

**Additional Finding:** Raw audio captured 36% more segments in natural_lifestyles because it preserved women's quieter responses that the denoiser removed.

**Fix Applied:** Changed `02.transcribe` defaults:
- `--prefer-audio` changed from `clean` → `raw`
- `--condition-on-prev` now opt-in (was opt-out via `--no-condition-on-prev`)

**Trade-off:** Minor capitalization inconsistencies on proper nouns (acceptable for training data).

---

### FINDING-002: Stage 03 Alignment Misconception (03-02-2026)

**Problem:** Stage 03 was documented as "sentence-level alignment" but whisperx.align() only does word-level forced alignment. 49% of segments still end mid-sentence.

**What Stage 03 actually does:**
- ✓ Refines word-level timestamps via forced alignment (aligns to actual audio waveform)
- ✓ Splits some segments (but arbitrarily, not at sentence boundaries)
- ✗ Does NOT create sentence-level boundaries

**Results:**
| Video | Clean Sentence Endings | Mid-Sentence |
|-------|------------------------|--------------|
| H3_8iPikhDw | 76% | 24% |
| G2sWa8X0EjA | 35% | 65% |
| 4x9bvKaVWBc | 20% | 80% |
| WSFSpbFCPZo | 77% | 23% |
| dz8w8XUBDXU | 19% | 81% |

**Decision:** Keep Stage 03 for word timestamp refinement (helps diarization). Sentence segmentation will be handled in Stage 08c (chunking) using NLP.

**Lesson learned:** Initial quality review checked technical metrics but missed verifying the stated purpose. Added Rule #11 to enforce purpose verification via subagent.

---

## Quality Review Subagent (Rule #11)

**When:** MANDATORY before presenting R1/R2 results to user.

**How to invoke:**
```
Task tool with:
  subagent_type: "general-purpose"
  prompt: |
    SKEPTICAL QUALITY REVIEW for Stage XX

    You are a skeptical reviewer. Your job is to find problems, not confirm success.

    1. Read the stage documentation: docs/pipeline/stages/STAGE_XX_*.md
    2. Identify the STATED PURPOSE of this stage
    3. Read 2-3 sample output files from data/test/XX.*/
    4. Answer these questions:
       - Does the output achieve the STATED PURPOSE? (not just "does it run")
       - What would a downstream stage expect? Does this output meet those expectations?
       - What's the WORST sample? Show specific examples of problems.
       - What percentage of outputs have issues?
    5. Be specific: quote actual text, show actual numbers
    6. Conclude: PASS (purpose achieved) or FAIL (purpose not achieved) or PARTIAL (technical success but purpose unclear)
```

**Why this exists:** On Stage 03, the main agent reported "100% text preserved, word timestamps present, no hallucinations" but missed that 49% of segments end mid-sentence—which defeats the stated purpose of "sentence-level alignment". A skeptical subagent would have caught this.

---

## Cross-Stage Integration Rules

Later stages must READ data from earlier stages rather than re-compute it. Override only when evidence clearly contradicts earlier stage output.

### Stage 06 (Conversations) → Speaker Labeling & Video Type

**Inputs:**
- `pyannote_speaker` from Stage 05 audio-features
- Text content for pattern analysis

**Outputs:**
- `detected_video_type`: infield, talking_head, podcast, compilation
- `speaker_labels`: mapping of SPEAKER_XX to coach/target/other
- Per-segment speaker assignment
- Conversation boundaries for infield videos

### Stage 07 (Speaker Correction) → Fix Diarization Errors

**Behavior:**
- Detects Q&A patterns where same speaker asks AND answers
- Swaps speaker labels on detected errors
- Tracks corrections in metadata

### Stage 08 (Content) → LLM Enrichment

**Behavior:**
- Text-based sentiment and intent analysis
- Technique and topic classification (31 techniques, 22 topics)
- Quality metrics
- Single Claude CLI call per video (efficient)

### Stage 09 (Structure) → Interaction Extraction

**Behavior:**
- Extracts interaction objects from enriched conversations
- Phase detection (open → pre_hook → post_hook → close)
- Hook point identification

### Integration Summary

| Stage | Reads From | Adds |
|-------|------------|------|
| 06 | 05.audio-features | speaker_labels, video_type, conversation_boundaries |
| 07 | 06.conversations | speaker corrections (Q&A error fixes) |
| 08 | 07.speaker-correction | techniques, topics, quality metrics |
| 09 | 08.content | interaction structure (phases), hook points |

---

## Pipeline Structure (ASCII) - 11 Stages

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DAYGAME COACH TRAINING DATA PIPELINE                    │
│                              (11 Stages, Sequential)                            │
│                                                                                 │
│   Starting Fresh: Only 01.download retained, all else re-verified              │
└─────────────────────────────────────────────────────────────────────────────────┘

  YouTube URL
       │
       ▼
┌──────────────────┐
│  01.download     │  Bash script with anti-bot detection
│  ✓ RETAINED      │  Output: data/01.download/<source>/<video>/
│  ~966 videos     │  Files: *.asr.raw16k.wav, *.info.json
│  ~941 hours      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  02.transcribe   │  Python (faster-whisper large-v3)
│  R1 APPROVED     │  Output: data/02.transcribe/<source>/<video>/
│                  │  Files: *.full.json (text + word timestamps), *.txt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  03.align        │  Python (whisperx)
│  R1 APPROVED     │  Output: data/03.align/<source>/<video>/
│                  │  Files: *.full.json (word-level alignment), *.txt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  04.diarize      │  Python (pyannote)
│  R1 COMPLETE     │  Output: data/04.diarize/<source>/<video>/
│                  │  Files: *.full.json (SPEAKER_00, SPEAKER_01 labels)
│  SLOW: 0.71x RT  │  ~600s processing per 843s video (pipeline bottleneck)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  05.audio-feat.  │  Python (librosa)
│  R1 APPROVED     │  Output: data/05.audio-features/<source>/<video>/
│                  │  Files: *.audio_features.json
│                  │  Features: pitch, energy, tempo, spectral
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  06.conversations│  TypeScript (Claude CLI)
│  IN PROGRESS     │  Output: data/06.conversations/<source>/<video>/
│                  │  Files: *.conversations.json
│                  │  Video types: infield, talking_head, podcast, compilation
│                  │  Speaker labels, conversation boundaries
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  07.speaker-corr │  Python (heuristic)
│  FRESH START     │  Output: data/07.speaker-correction/<source>/<video>/
│                  │  Files: *.corrected.json
│                  │  Fixes Q&A pattern diarization errors
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  08.content      │  Python (Claude CLI)
│  FRESH START     │  Output: data/08.content/<source>/<video>/
│                  │  Files: *.enriched.json
│                  │  31 techniques, 22 topics, quality metrics
│                  │  Single CLI call per video (efficient)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  09.structure    │  Python
│  FRESH START     │  Output: data/09.structure/<source>/<video>/
│                  │  Files: *.interactions.jsonl
│                  │  Phases: open → pre_hook → post_hook → close
│                  │  Extracts interaction objects with turn-level structure
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  10.chunk        │  Python
│  TO BE CREATED   │  Output: data/10.chunk/<source>/<video>/
│                  │  Files: *.chunks.json
│                  │  RAG-optimized chunks with metadata
│                  │  Optimal chunk sizes for embedding + retrieval
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  11.ingest       │  TypeScript/Node.js
│  FRESH START     │  Output: Supabase embeddings table
│                  │  Modes: transcripts | interactions | chunks
│                  │  Vector store for RAG/QA system
└──────────────────┘


                    ┌─────────────────────────────────┐
                    │     FINAL DATABASE OUTPUT       │
                    ├─────────────────────────────────┤
                    │  Supabase embeddings table:     │
                    │  - Transcript chunks            │
                    │  - Interaction chunks           │
                    │  - Technique examples           │
                    │  - Topic discussions            │
                    │                                 │
                    │  Used for:                      │
                    │  - AI QA feature (RAG)          │
                    │  - User scenario evaluation     │
                    │  - Training data retrieval      │
                    └─────────────────────────────────┘
```

---

## Testing Methodology

### Two-Round Testing Per Stage

Each stage goes through **2 verification rounds** before proceeding:

```
ROUND 1: 5 Videos
    ├─ Run stage script on 5 diverse videos
    ├─ Claude: Deep quality review of ALL outputs
    ├─ Document any failures to .failed.json
    ├─ Present results with quality assessment
    ├─ User verifies and approves quality
    └─ If issues: fix script → re-run R1

ROUND 2: 15 Videos (expand to 20 total)
    ├─ Run stage script on 15 additional videos
    ├─ Claude: Deep quality review (focus on edge cases)
    ├─ Document any failures
    ├─ Present results with failure analysis
    ├─ User verifies and approves quality
    └─ If issues: fix OR create remediation script (case-by-case)

STAGE VERIFIED → Move to next stage
```

### Verification Criteria

| Criterion | Requirement |
|-----------|-------------|
| R1 Success | 0 critical failures on 5 videos |
| R2 Success | <10% failure rate on 15 additional videos |
| Documentation | All failures logged with root cause |
| User Approval | User has explicitly approved quality |
| Schema | Output matches schema 100% |

---

## Phase Overview

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Foundation & Cleanup | COMPLETE |
| 1 | Stage 02 - Transcription | COMPLETE (R1 APPROVED) |
| 2 | Stage 03 - Alignment | COMPLETE (R1 APPROVED) |
| 3 | Stage 04 - Diarization | COMPLETE (R1 COMPLETE) |
| 4 | Stage 05 - Audio Features | COMPLETE (R1 APPROVED) |
| 5 | Stage 06 - Conversations | PENDING |
| 6 | Stage 07 - Content | PENDING |
| 7 | Stage 08 - Structure | PENDING |
| 8 | Stage 09 - Chunking | PENDING |
| 9 | Stage 10 - Ingest | PENDING |
| 10 | Full Pipeline Run | PENDING |

---

## Test Videos

**Location**: `data/test/` (isolated from main dataset)

```
data/test/
├── 01.download/      # R1 audio files (171MB)
├── 02.transcribe/    # R1 transcripts (1.2MB)
├── 03.align/
├── 04.diarize/
├── 05.audio-features/
├── 06.conversations/
├── 07.content/
├── 08.structure/
├── 09.chunk/
└── 10.ingest/
```

### R1 Videos (5)

| # | Video ID | Duration | Title |
|---|----------|----------|-------|
| 1 | dz8w8XUBDXU | 9 min | Purpose \| Masculinity \| Fitness \| Pickup |
| 2 | 4x9bvKaVWBc | 12 min | How to approach a woman when she's with her friends |
| 3 | G2sWa8X0EjA | 10 min | How To Approach Groups Of Girls |
| 4 | H3_8iPikhDw | 7 min | A Basic Daygame Approach Anyone Can Do |
| 5 | WSFSpbFCPZo | 15 min | How to get Rejected like a BOSS - James Marshall Infield |

**Total R1 duration**: ~53 minutes

### R2 Videos (15 additional)
*To be selected after R1 passes*

---

## Failure Documentation

### Failure Logs Location
```
data/<stage>/<source>/.failed.json    # Processing failures
data/<stage>/<source>/.flagged.json   # Quality issues (hallucinations)
data/<stage>/<source>/.remediated.json # Successfully fixed videos
```

### Consolidated Logs
- [FAILURES.md](FAILURES.md) - All failures across stages
- [REMEDIATION.md](REMEDIATION.md) - Remediation procedures

---

## Stage Documentation

- [Stage 01: Download](stages/STAGE_01_download.md)
- [Stage 02: Transcribe](stages/STAGE_02_transcribe.md)
- [Stage 03: Align](stages/STAGE_03_align.md)
- [Stage 04: Diarize](stages/STAGE_04_diarize.md)
- [Stage 05: Audio Features](stages/STAGE_05_audio_features.md)
- [Stage 06: Conversations](stages/STAGE_06_conversations.md)
- [Stage 07: Speaker Correction](stages/STAGE_07_speaker_correction.md)
- [Stage 08: Content](stages/STAGE_08_content.md)
- [Stage 09: Structure](stages/STAGE_09_structure.md)
- [Stage 10: Chunk](stages/STAGE_10_chunk.md)
- [Stage 11: Ingest](stages/STAGE_11_ingest.md)

**Future Features (not in pipeline):**
- [Voice-to-Voice: Tone Classification](../../scripts/voice_to_voice/TONE_CLASSIFICATION.md)

---

## Changelog

- 04-02-2026 - **RESTRUCTURE**: Added Stage 07 (speaker-correction) as dedicated stage. Old 07→08, 08→09, 09→10, 10→11. Total stages: 11.
- 04-02-2026 14:30 - **Stage 06**: Switched to Claude Code Direct processing. Uses subscription (Opus 4.5) instead of API credits. Created handoff doc + state file for session continuity.
- 04-02-2026 - **SWAPPED** stages 07 and 08. Content (was 08) is now 07, Structure (was 07) is now 08. New order: 06.conversations → 07.content → 08.structure. Content enrichment happens first, then structure extraction uses enriched data.
- 04-02-2026 13:00 - **REMOVED** Stage 06 (tone classification) from pipeline. Moved to `scripts/voice_to_voice/` as future feature. Stages renumbered: 07→06, 08a→07, 08b→08, 08c→09, 09→10. Tone classification is for voice-to-voice coaching, not text-based training data.
- 04-02-2026 11:00 - **R1 APPROVED** for Stage 05 audio-features. Usable segments: 58-98% (short infield segments expected to fail pitch detection)
- 04-02-2026 - Added JSON schema for Stage 05 audio_features output
- 04-02-2026 - Stage 05 speaker embeddings disabled by default (saves storage)
- 03-02-2026 19:30 - **R1 APPROVED** for Stage 03 align. Added Rule #11 (quality-review subagent). Documented FINDING-002 (stage does word alignment, not sentence alignment as claimed)
- 03-02-2026 17:15 - **R1 APPROVED** for Stage 02 transcribe (user verified austen_summers gap is correct)
- 03-02-2026 17:05 - Created data/test/ folder with R1 videos isolated (5 videos, each stage has subfolder)
- 03-02-2026 17:00 - Added rules 9-10: NEVER mark complete before user approval, thorough quality checks mandatory
- 03-02-2026 16:15 - R1 transcription re-run complete: 5/5 videos clean, 0 hallucinations with new defaults
- 03-02-2026 15:45 - Removed clean audio entirely (deleted 825 files, 216MB). Only raw16k.wav used now
- 03-02-2026 15:30 - FIX-001: Changed 02.transcribe defaults to prevent hallucinations (raw audio, condition_on_prev=False)
- 03-02-2026 14:15 - Phase 1 R1 failed: 2/5 videos with severe hallucinations, remediation required
- 03-02-2026 13:00 - Phase 1 started: fixed yt-dlp (2026.1.31), downloaded 4 missing R1 videos
- 03-02-2026 - Phase 0 complete: created docs structure, selected 5 R1 test videos
- 03-02-2026 - Initial creation from approved plan
