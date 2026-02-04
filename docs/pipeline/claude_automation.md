# Claude Automation Plan for Pipeline Stages 06-12
**Status:** IN PROGRESS - Stage 06 SCRAPPED, redesigning pipeline
**Updated:** 04-02-2026

---

## ⛔ CRITICAL PRINCIPLE: NO MANUAL REVIEW AT SCALE

**There will be 1500 videos. Manual review is NOT an acceptable solution.**

When R1 testing reveals a failure:
1. **DO NOT** mark it as "flagged for review" and move on
2. **DO NOT** accept partial failures as normal
3. **DO** investigate the root cause
4. **DO** fix the bug before proceeding
5. **DO** re-run R1 to verify the fix

R1 testing exists to find and fix bugs, not to speedrun to the next stage.

---

## ⛔ CRITICAL PRINCIPLE: NO HEURISTICS

**All judgment calls must use LLM. Zero exceptions.**

- NO regex pattern matching for semantic decisions
- NO hardcoded rules like "if ends with ? then it's a question"
- NO confidence thresholds based on string matching
- If it requires understanding context → use LLM

Heuristics are:
1. Brittle (break on edge cases)
2. Language-dependent (won't work for Spanish/other languages in transcripts)
3. Unable to understand context

The cost of LLM calls is covered by Claude Max subscription. Speed is not a priority over correctness.

---

## Changelog
- 04-02-2026: **Stage 06 SCRAPPED** - Fundamental design flaw: tried to fix diarization errors BEFORE knowing who speakers are (chicken-and-egg). Merging responsibility into Stage 07 (renamed from 08). New pipeline: 06=video-type, 07=speaker-labeling+diarization-fix+boundaries.
- 04-02-2026: **Stages 06-08 UNVERIFIED** - Investigation found potential issues: (1) Stage 06 naive "swap to other speaker" logic may pick wrong speaker when 3+ speakers, (2) No semantic validation of corrections, (3) Stage 08 amplifies any Stage 06 errors. Re-verification required.
- 04-02-2026: **Stage 08 BUG FIXED** - Root cause: non-deterministic Claude responses. Fix: added retry logic (3 attempts) for JSON parsing failures. All 5 videos now pass.
- 04-02-2026: **Added NO HEURISTICS rule** - All judgment calls must use LLM, no regex patterns
- 04-02-2026: **Stage 08 BUG FOUND** - Speaker labeling failed on 1/5 videos (8 speakers). Investigation required.
- 04-02-2026: **Stage 06/07 Swap + VERIFIED** - Swapped stages: 06=speaker-correction, 07=video-type. Both R1 tests passed and verified.
- 04-02-2026: **Swapped Steps 11/12** - Build automation first (Step 11), then R2 uses automation for its 15-video test run (Step 12)

---

## Executive Summary

Convert pipeline stages 06-12 from AI SDK to Claude Code CLI, then build automation to process 1500 videos without manual intervention.

**Two Phases:**
1. **Phase 1: Prompt & Script Optimization** - Ensure each stage produces correct outputs
2. **Phase 2: Automation Infrastructure** - Build orchestrator with retry/halt logic

---

## Current State Analysis

| Stage | Script | Language | LLM? | Status |
|-------|--------|----------|------|--------|
| 06 | `06.video-type` | Python | Yes (Claude CLI) | ✅ **COMPLETE** |
| 07 | None | - | No (heuristic) | **NEEDS CREATION** |
| 08 | `08.content` | Python | Yes (Claude CLI) | ✓ Working pattern |
| 09 | `09.structure` | Shell | Yes (LLM) | **NEEDS LLM INTEGRATION** |
| 10 | None | - | No | **NEEDS CREATION** (extensive analysis first) |
| 11 | `09.ingest.ts` | TypeScript | No | ✓ Exists (rename needed) |

**Key Finding:** Stage 08 already has working Claude CLI pattern:
```python
subprocess.run(["claude", "-p", prompt, "--output-format", "text"], ...)
```

---

## Phase 1: Prompt & Script Optimization

### Task 1.1: Convert Stage 06 to Claude CLI

**Current:** Uses AI SDK with `generateObject()` and Zod schemas
**Target:** Use `claude -p` subprocess like Stage 08

**Work:**
1. Create `scripts/training-data/06.conversations-cli` (Python, matching Stage 08 pattern)
2. Port three-pass prompts from TypeScript:
   - Pass 1: Video type classification
   - Pass 2: Speaker labeling
   - Pass 3: Conversation boundaries
3. Add JSON extraction from Claude response (regex for code blocks)
4. Add validation layer (contiguity check, segment count check)
5. Keep state file (`06.conversations-state.json`) for resumability

**Prompts to Port (from `06.conversations.ts`):**
- `VIDEO_TYPE_SYSTEM_PROMPT` (lines 149-178)
- `SPEAKER_LABELING_SYSTEM_PROMPT` (lines 180-212)
- `CONVERSATION_BOUNDARY_SYSTEM_PROMPT` (lines 214-251)

**Critical:** Add post-processing validation:
- Verify segment count matches input
- Verify conversation_id contiguity
- Flag low-confidence results for review

### Task 1.2: Create Stage 07 (Speaker Correction)

**Purpose:** Fix pyannote diarization errors where Q&A merges into single speaker

**Approach:** Heuristic (no LLM needed) - faster, free
```
Detection: Same speaker asks AND answers a question
Fix: Split segment, assign answer to next speaker
```

**Work:**
1. Create `scripts/training-data/07.speaker-correction` (Python)
2. Implement Q&A pattern detection:
   - Regex for question patterns
   - Check if same speaker has question followed by answer
3. Add optional `--use-llm` flag for ambiguous cases
4. Output `.corrected.json` with correction log

**Input:** `data/06.conversations/<source>/<video>/*.conversations.json`
**Output:** `data/07.speaker-correction/<source>/<video>/*.corrected.json`

### Task 1.3: Review Stage 08 Prompts

**Status:** Working implementation exists

**Work:**
1. Review technique taxonomy (31 techniques) - confirm comprehensive
2. Review topic taxonomy (22 topics) - confirm comprehensive
3. Test on R1 videos
4. Add confidence thresholds and flagging for uncertain results

**Quality Philosophy:**
- Precision > recall
- Flag uncertain (don't false positive)
- Accept ~5% noise at scale

### Task 1.4: Review Stage 09 (Structure)

**Current:** Shell script exists, unclear implementation
**Decision:** Use LLM (no heuristics)

**Work:**
1. Read and analyze `scripts/training-data/09.structure`
2. Add Claude CLI integration (following Stage 08 pattern)
3. Design prompts for phase detection (open → pre_hook → post_hook → close)
4. Define hook point detection logic
5. Output `.interactions.jsonl` with phase annotations

### Task 1.5: Create Stage 10 (Chunk)

**Purpose:** Create RAG-optimized chunks for vector search

**Work:**
1. **Extensive analysis required** before implementation:
   - Research RAG chunking best practices
   - Analyze sample data to understand content structure
   - Experiment with different chunk sizes
   - Measure retrieval quality with different strategies
2. Create `scripts/training-data/10.chunk` (Python)
3. Implement chunking strategies (TBD based on analysis):
   - Transcript chunks
   - Interaction chunks
   - Technique example chunks
4. Add metadata for each chunk (source, time, speakers, techniques)
5. Output `.chunks.json`

**No LLM needed** - pure data transformation, but strategy requires research

### Task 1.6: Rename Stage 11

**Current:** Named `09.ingest.ts`
**Target:** Rename to `11.ingest.ts` to match documentation

---

## Phase 2: Automation Infrastructure

### Task 2.1: Create Master Orchestrator

**File:** `scripts/training-data/run_pipeline_batch.sh`

**Features:**
- Process all videos through stages 06-11 sequentially
- State persistence across sessions
- Retry logic (2 retries per file)
- Skip and log on failure
- Halt after 10 consecutive failures
- Rate limiting (1 second between Claude calls)
- Progress reporting

**Pseudocode:**
```bash
#!/usr/bin/env bash
MAX_RETRIES=2
MAX_CONSECUTIVE_FAILURES=10
RATE_LIMIT_SEC=1

consecutive_failures=0

for video in $(find_pending_videos); do
    for stage in 06 07 08 09 10 11; do
        if already_complete "$video" "$stage"; then
            continue
        fi

        for attempt in 1 2 3; do
            if run_stage "$video" "$stage"; then
                mark_complete "$video" "$stage"
                consecutive_failures=0
                break
            else
                if [ $attempt -lt $MAX_RETRIES ]; then
                    sleep $((2 ** attempt))
                else
                    log_failure "$video" "$stage"
                    consecutive_failures=$((consecutive_failures + 1))
                fi
            fi
        done

        if [ $consecutive_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
            echo "HALTING: $MAX_CONSECUTIVE_FAILURES consecutive failures"
            exit 1
        fi

        sleep $RATE_LIMIT_SEC
    done
done
```

### Task 2.2: Create State Manager

**File:** `scripts/training-data/lib/state_manager.py`

**State File:** `data/.pipeline_batch_state.json`

**Schema:**
```json
{
  "version": 2,
  "run_id": "batch_YYYYMMDD_HHMMSS",
  "started_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "config": {
    "max_retries": 2,
    "max_consecutive_failures": 10,
    "rate_limit_sec": 1
  },
  "progress": {
    "total_videos": 1479,
    "stages": {
      "06": {"completed": 0, "failed": 0, "pending": 1479},
      "07": {"completed": 0, "failed": 0, "pending": 1479}
    }
  },
  "videos": {
    "VIDEO_ID": {
      "source": "source_name",
      "stages": {
        "06": {"status": "complete", "processed_at": "..."},
        "07": {"status": "pending"}
      }
    }
  },
  "failures": [],
  "review_queue": []
}
```

### Task 2.3: Create Logging Module

**File:** `scripts/training-data/lib/logging_utils.sh`

**Log Directory:** `logs/pipeline/YYYYMMDD_HHMMSS/`

**Files:**
- `summary.json` - Overall progress
- `failures.json` - Failed files with errors
- `review_queue.json` - Low-confidence results
- `stage_06.log`, `stage_08.log` - Per-stage logs

### Task 2.4: Add Review Queue System

**Purpose:** Flag uncertain results for manual review

**Implementation:**
- When confidence < 0.6, add to review queue
- Review queue stored in state file
- Separate script to process review queue

---

## Access & Rate Limits

**Model:** Opus (via Claude Max subscription)
**Cost:** Covered by subscription (no per-token charges)
**Constraint:** Rate limits, not cost

**Rate Limit Strategy:**
- Test Opus limits on R1 (5 videos) and R2 (15 videos)
- Monitor usage carefully during testing
- If hitting limits: add delays, or fall back to Sonnet for high-volume stages
- Max subscription should have generous limits, but verify empirically
- May need to spread processing over multiple days for 1500 videos

---

## Implementation Order

### Step 1: Stage 06 Review ✓
- [x] Exploration complete - understand pipeline structure
- [x] **Review Stage 06** - Critical issues found, fixes applied, reordering proposed

### Step 2: Plan Review ✓
- [x] Review plan for inconsistencies after Stage 06 review
- [x] Restructure to iterative per-stage flow (review → script → R1 → verify → next)

**Inconsistencies found and fixed:**
1. Script naming collision (two `08.*` scripts) → will resolve in reorder
2. R1 test was for OLD all-in-one 06.conversations → marked stale
3. `07.speaker-correction` reads from 06 output → must change to read from 05
4. Critical Files table referenced deleted docs → removed

### Step 3: Implement Stage Reordering ✓
**Status:** COMPLETE (04-02-2026 22:15)

#### New Stage Flow (REVISED 04-02-2026)

**Key Change:** Stage 06 (diarization correction) SCRAPPED. Its responsibility merged into Stage 07.

| Stage | Responsibility | Input | Output | Status |
|-------|----------------|-------|--------|--------|
| ~~06~~ | ~~Diarization correction~~ | - | - | **SCRAPPED** |
| 06 | Video type classification | 05.audio-features | 06.video-type | Pending (was 07) |
| 07 | Speaker labeling + diarization fix + boundaries | 06.video-type | 07.conversations | **REDESIGN** |
| 08 | Content enrichment (techniques, topics) | 07.conversations | 08.enriched | Pending (was 09) |
| 09 | Structure (phases, outcomes) | 08.enriched | 09.structure | Pending (was 10) |
| 10 | Chunk (RAG optimization) | 09.structure | 10.chunks | Pending (was 11) |
| 11 | Ingest (database) | 10.chunks | Supabase | Pending (was 12) |

**Why this is better:**
- Single LLM pass handles speaker identification AND diarization fixes together
- No chicken-and-egg problem (can't fix speakers without knowing who they are)
- No naive heuristics ("most common other speaker")
- Fewer stages = simpler pipeline

#### Detailed Script Mapping (REVISED)

| Current Script | Action | New Script | Changes Required | Status |
|----------------|--------|------------|------------------|--------|
| `06.speaker-correction` | **DELETE** | - | Scrapped - flawed design | ❌ SCRAPPED |
| `07.video-type` | **RENAME** | `06.video-type` | Reads from 05.audio-features, outputs 06.video-type | Pending |
| `08.conversations` | **REDESIGN** | `07.conversations` | Merge diarization fix into speaker labeling (see proposal below) | **REDESIGN** |
| `08.content` | **RENAME** | `08.content` | Update input path: reads from 07.conversations | Pending |
| `10.structure` | **RENAME** | `09.structure` | Update input path: reads from 08.content | Pending |
| *(new)* | **CREATE** | `10.chunk` | New script for RAG chunking | Pending |
| `09.ingest.ts` | **RENAME** | `11.ingest.ts` | Update input path: from 10.chunks | Pending |

#### Input/Output Path Changes (REVISED)

**Stage 06 (Video Type)**
```
Input:  data/05.audio-features/<source>/<video>/*.audio_features.json
Output: data/06.video-type/<source>/<video>/*.video_type.json
```

**Stage 07 (Conversations) - REDESIGNED**
```
Input:  data/06.video-type/<source>/<video>/*.video_type.json
Output: data/07.conversations/<source>/<video>/*.conversations.json

Handles: speaker labeling + diarization fix + conversation boundaries (unified)
```

**Stage 08 (Content Enrichment)**
```
Input:  data/07.conversations/<source>/<video>/*.conversations.json
Output: data/08.content/<source>/<video>/*.enriched.json
```

**Stage 09 (Structure)**
```
Input:  data/08.content/<source>/<video>/*.enriched.json
Output: data/09.structure/<source>/<video>/*.interactions.jsonl
```

**Stage 10 (Chunk)**
```
Input:  data/09.structure/<source>/<video>/*.interactions.jsonl
Output: data/10.chunks/<source>/<video>/*.chunks.json
```

**Stage 11 (Ingest)**
```
Input:  data/10.chunks/<source>/<video>/*.chunks.json
Output: Supabase embeddings table
```

**Directories to delete:**
- `data/06.corrected/` (from scrapped Stage 06)
- `data/test/06.corrected/`

#### Data Transition Plan (REVISED)

**No data loss** - all raw data in `05.audio-features/` is preserved.

**Transition Steps:**
1. Delete `scripts/training-data/06.speaker-correction` (scrapped)
2. Rename `07.video-type` → `06.video-type`, update paths
3. Create new `07.conversations` with unified prompt
4. Rename/update downstream scripts (08-11)
5. Delete old test outputs: `data/test/06.corrected/`, `data/test/07.video-type/`, `data/test/08.conversations/`
6. R1 test new pipeline on 5 videos
7. Compare results (should be BETTER than old pipeline)

#### Tasks Completed
- [x] Create stage mapping document
- [x] Plan script renames/splits
- [x] Verify no data loss in transition

### Step 4: Stage 06 (Diarization Correction) ❌ SCRAPPED

**Status:** SCRAPPED (04-02-2026)

**Why scrapped:** Fundamental design flaw - tried to fix diarization errors BEFORE knowing who the speakers are. Used naive "most common other speaker" heuristic instead of LLM judgment. This violated the "NO HEURISTICS" rule and created a chicken-and-egg problem.

**Resolution:** Responsibility merged into redesigned Stage 07 (see proposal above).

**Script to delete:** `scripts/training-data/06.speaker-correction`
**Data to archive:** `data/test/06.corrected/` (no longer needed)

### Step 5: Stage 06 (Video Type) - RENUMBER
- [ ] Rename `07.video-type` → `06.video-type`
- [ ] Update input path: reads from `05.audio-features` (skip deleted 06.corrected)
- [ ] Update output path: `06.video-type/*.video_type.json`
- [ ] R1 test on 5 videos

**Note:** Video type classification is independent of speaker issues. Just needs path updates.

### Step 6: Stage 07 (Speaker Labeling + Diarization Fix + Boundaries) - REDESIGN
- [ ] Create new `scripts/training-data/07.conversations` with unified prompt (see proposal above)
- [ ] Input: `06.video-type/*.video_type.json`
- [ ] Output: `07.conversations/*.conversations.json`
- [ ] Implement unified LLM pass that handles:
  - Speaker identification (who is SPEAKER_XX?)
  - Diarization fix (correct pyannote errors using semantic understanding)
  - Conversation boundaries (where do approaches start/end?)
- [ ] Delete old `08.conversations` script after new one works
- [ ] R1 test on 5 videos
- [ ] Compare to old results - should be BETTER

**Key improvements over old design:**
- No naive heuristics
- Single LLM pass with full context
- No data corruption between stages
- LLM makes ALL judgment calls

### ⏭️ IMMEDIATE NEXT STEPS: Redesign Stage 07

**Priority Order:**
1. **Rename 07.video-type → 06.video-type** (simple rename)
2. **Redesign 08.conversations → 07.conversations** (merge diarization fix)
3. **Renumber downstream stages** (08→08, 09→09, etc.)
4. **R1 test on redesigned Stage 07**

---

## 🔧 PROPOSED REDESIGN: Stage 07 (Speaker Labeling + Diarization Fix)

### Why Merge?

**Old design (flawed):**
```
Stage 06: Fix diarization errors → but HOW without knowing who speakers are?
          Uses naive "most common other speaker" heuristic
Stage 08: Label speakers → but input already corrupted by Stage 06 mistakes
```

**New design (correct):**
```
Stage 07: Single LLM pass that:
          1. Identifies who each SPEAKER_XX is (coach, target, etc.)
          2. Fixes diarization errors using that knowledge
          3. Detects conversation boundaries
          All in one prompt with full context.
```

### Proposed Prompt Structure

```
You are analyzing a daygame video transcript. Do THREE things:

1. SPEAKER IDENTIFICATION
   For each SPEAKER_XX, determine their role:
   - "coach": Person doing approaches (opens, asks questions, gives compliments)
   - "target": Woman being approached (responds to questions, gives short answers)
   - "voiceover": Post-production narration
   - "other": Background voices, friends

2. DIARIZATION ERROR DETECTION & FIX
   Pyannote sometimes assigns the SAME speaker ID to two different people.

   Example error:
     [5] SPEAKER_00: "What's your name?"
     [6] SPEAKER_00: "Maria"  ← ERROR: Answer should be different speaker

   For each segment, output the CORRECT speaker role, even if pyannote got it wrong.
   Use context to determine who is actually speaking:
   - Questions from coach, answers from target
   - Openers always from coach
   - Short responses typically from target

3. CONVERSATION BOUNDARIES
   Identify where each approach conversation starts and ends.
   - "approach" segments get conversation_id (1, 2, 3...)
   - "commentary" segments (coach talking to camera) get conversation_id: 0

SEGMENTS:
{segments}

OUTPUT: Return JSON with this structure:
{
  "speaker_labels": {
    "SPEAKER_00": {"role": "coach", "confidence": 0.95},
    "SPEAKER_01": {"role": "target", "confidence": 0.90}
  },
  "segments": [
    {
      "id": 0,
      "corrected_role": "coach",      // WHO is actually speaking (fixes diarization)
      "segment_type": "approach",      // approach | commentary | transition
      "conversation_id": 1,
      "diarization_fixed": false       // true if we corrected pyannote's assignment
    },
    ...
  ]
}
```

### Key Differences from Old Design

| Aspect | Old (Stages 06+08) | New (Stage 07) |
|--------|-------------------|----------------|
| Diarization fix | Naive heuristic | LLM with full context |
| Speaker labeling | Separate pass | Same pass |
| Error correction | "Most common other" | Semantic understanding |
| LLM calls | 2 (detect + label) | 1 (unified) |
| Data corruption | Stage 06 errors → Stage 08 | None (single pass) |

### Implementation Steps

1. [ ] Create `scripts/training-data/07.conversations` with new unified prompt
2. [ ] Input: `06.video-type/*.video_type.json`
3. [ ] Output: `07.conversations/*.conversations.json`
4. [ ] Delete old `06.speaker-correction` script
5. [ ] R1 test on 5 videos
6. [ ] Compare results to old pipeline (should be BETTER, not just different)

### Step 6a: Fix Speaker Labeling Bug ✅ FIXED
**Problem:** Video "Rejected like a BOSS" (8 speakers) failed JSON parsing intermittently.

**Root cause:** Claude's response format is non-deterministic. Same prompt/video worked on retry.

**Fix applied:**
- [x] Added debug logging (`--debug` flag, saves failed responses to file)
- [x] Added retry logic (3 attempts) for JSON parsing failures in both `label_speakers()` and `detect_conversations()`
- [x] Changed fallback from silent failure to explicit `RuntimeError`
- [x] Re-ran R1 test - all 5 videos pass

### Step 7: Stage 09 (Content Enrichment)
- [ ] Review: Current `08.content` - update to new numbering
- [ ] Script: Rename to `09.content`, update input path
- [ ] R1 Test: Run on 5 test videos
- [ ] Verify: Check techniques, topics
- [ ] Approval: User sign-off

### Step 8: Stage 10 (Structure) - SCRIPT UPDATED
- [x] Review: Current `08.structure` - update to new numbering
- [x] Script: Rename to `10.structure`, update input path (**DONE** - fixed bug where script read from nonexistent `07.content`, now reads from `09.content`)
- [ ] R1 Test: Run on 5 test videos (blocked until Stage 09 complete)
- [ ] Verify: Check phases, outcomes
- [ ] Approval: User sign-off

### Step 9: Stage 11 (Chunk)
- [ ] Review: Define chunking strategy for RAG
- [ ] Script: Create `11.chunk`
- [ ] R1 Test: Run on 5 test videos
- [ ] Verify: Check chunk quality, metadata
- [ ] Approval: User sign-off

### Step 10: Stage 12 (Ingest)
- [ ] Review: Current `09.ingest.ts` - update to new numbering
- [ ] Script: Rename to `12.ingest.ts`, update input path
- [ ] R1 Test: Run on 5 test videos
- [ ] Verify: Check embeddings in Supabase
- [ ] Approval: User sign-off

### Step 11: Build Automation
- [ ] Create master orchestrator (`run_pipeline_batch.sh`)
- [ ] Create state manager
- [ ] Create logging module
- [ ] Add review queue system
- [ ] Add rate limit handling

### Step 12: R2 Full Pipeline Test (via Automation)
- [ ] Run all stages 06-12 on 15 videos using orchestrator (12 infield + 3 talking head)
- [ ] Verify end-to-end data flow
- [ ] Document edge cases
- [ ] User approval

### Step 13: Talking Head Branch
- [ ] Create simplified path for talking head videos
- [ ] Less detailed analysis (skip technique/topic extraction)
- [ ] Integrate conditional branching

### Step 14: Production Run (batches of 100)
- [ ] Run in 100-video batches
- [ ] Review checkpoints between batches
- [ ] Process review queue
- [ ] Generate quality reports

---

## Stale Items (from OLD structure - do not use)

> **WARNING:** These items were completed for the OLD all-in-one `06.conversations` script.
> After Stage Reordering (Step 3), these need to be re-done for the split stages.

- ~~[x] Convert Stage 06 from AI SDK to CLI~~ (was all-in-one, now being split)
- ~~[x] Run Stage 06 on R1 - 5/5 videos~~ (tested old structure)
- ~~[x] Verify outputs~~ (verified old structure)

---

## Critical Files

| File | Purpose | Status |
|------|---------|--------|
| `scripts/training-data/06.speaker-correction` | ~~Q&A pattern fixer~~ | ❌ DELETE (scrapped) |
| `scripts/training-data/07.video-type` | Video type classification | Rename to `06.video-type` |
| `scripts/training-data/08.conversations` | ~~Speaker labeling + boundaries~~ | Redesign as `07.conversations` |
| `scripts/training-data/07.conversations` | Speaker labeling + diarization fix + boundaries | **CREATE** (new unified design) |
| `scripts/training-data/08.content` | Content enrichment (Claude CLI) | Keep as `08.content` |
| `scripts/training-data/10.structure` | Structure/phases extraction | Rename to `09.structure` |
| *(new)* | RAG chunking | **CREATE** as `10.chunk` |
| `scripts/training-data/09.ingest.ts` | Database ingest | Rename to `11.ingest.ts` |

> **Note:** Stage docs (`docs/pipeline/stages/STAGE_*.md`) were deleted. Stage specs now live in this document.

---

## Verification Plan

### Per-Stage Verification
1. Run stage on R1 (5 test videos)
2. Manually inspect outputs
3. Check for false positives (precision)
4. Check for flagged items (uncertainty handling)
5. User approval before marking PASS

### End-to-End Verification
1. Run full pipeline on R2 (15 videos)
2. Verify each stage output exists and is valid
3. Spot-check enrichment quality
4. Verify state file correctly tracks progress
5. Test failure/resume behavior

### Production Monitoring
1. Track consecutive failures (halt at 10)
2. Monitor review queue size
3. Log processing time per video
4. Generate daily progress reports

---

## Decisions Made

1. **Model:** ✅ **Opus** via Claude Max subscription
   - Highest quality for nuanced analysis
   - Test limits on R1/R2, monitor usage carefully
   - Fall back to Sonnet if rate limits become an issue

2. **Implementation approach:** ✅ **Review all stages first** before implementation
   - Thorough understanding before writing code
   - Identify all dependencies and gaps upfront

3. **Testing phases:**
   - **R1:** 5 infield videos (initial validation)
   - **R2:** 12 infield + 3 talking head videos (broader testing)
   - **Production:** Batches of 100 with review checkpoints (catch drift)

4. **Video type handling:**
   - Stage 06 runs on ALL videos (classifies type)
   - Then conditional branching:
     - **Infield:** Full pipeline (Stages 07-11)
     - **Talking head:** Simplified pipeline (created before production)

5. **Stage 09:** ✅ Use LLM (no heuristics) for structure/phase detection

6. **Stage 10 (Chunk):** ✅ Requires extensive analysis before implementation

## Answered Questions

1. **Stage 09 LLM:** ✅ **Use LLM, no heuristics**
   - Stage 09 (Structure) will use Claude CLI for phase detection

2. **Chunk strategy:** ✅ **Requires extensive analysis**
   - Not a simple recommendation - need to research RAG best practices
   - Experiment with different sizes and measure retrieval quality

3. **Video type branching:** ✅ **Stage 06 on all, then conditional**
   - Stage 06 runs on all videos (classifies type)
   - Stage 07+ has conditional scripts based on video type
   - Infield → full pipeline
   - Talking head → simplified pipeline

---

## Stage 06 Review Findings (04-02-2026)

### Critical Issues Found

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Silent API key failure - fell back to "unknown" instead of failing | CRITICAL | ✅ FIXED in `06.conversations-manual.ts` |
| 2 | Speaker sampling (first 50 segments) missed later content | HIGH | ✅ FIXED - now reads ALL segments |
| 3 | No validation for unknown speakers after LLM attempt | HIGH | ✅ FIXED - added flag for >50% unknown |
| 4 | No validation for 0 conversations in infield/compilation | HIGH | ✅ FIXED - added flag |
| 5 | Stage order wrong - labeling before diarization correction | HIGH | 🔄 PROPOSED - see below |

### What Actually Happened with R1

The speaker labels all show `"role": "unknown", "confidence": 0, "reasoning": "LLM detection failed"`. The API key was missing, script failed silently, all speakers were marked unknown, and 0 conversations were detected.

**What "passed":** Only video type classification worked (compilation 85%). Speaker labeling and boundary detection completely failed but went unnoticed.

### Proposed Stage Reordering

**Current (problematic):**
```
Stage 06: Labels speakers based on pyannote IDs → but IDs are sometimes wrong
Stage 07: Fixes pyannote errors → but labels were already assigned incorrectly
```

**Proposed (fix raw data first):**
```
Stage 06: Video type classification ONLY
Stage 07: Fix diarization errors (Q&A patterns on RAW transcript)
Stage 08: Speaker labeling + conversation boundaries (using corrected speaker IDs)
Stage 09: Content enrichment (techniques, topics)
Stage 10: Structure (phases)
Stage 11: Chunk (RAG optimization)
Stage 12: Ingest (database)
```

**Why swap 06/07:**
- Stage 07's Q&A detection doesn't need speaker labels
- It just finds patterns like: `"Where are you from?" (SPEAKER_01) → "Chile" (SPEAKER_01)` = error
- Fix the raw data first, THEN interpret it

### Implementation Tasks for Stage 06

1. [ ] **Move speaker labeling to new Stage 08** - Stage 06 should ONLY do video type classification
2. [ ] **Update Stage 07 input** - Should take `*.audio_features.json` not `*.conversations.json`
3. [ ] **Improve speaker labeling prompt:**
   - Add instruction for handling pyannote confusion (one ID = two people)
   - Add instruction for multi-language code-switching
   - Add "unknown" as valid option with clear guidance on when to use
4. [ ] **Add post-processing validation in new Stage 08:**
   - Flag if >50% speakers are unknown after LLM attempt
   - Flag if 0 conversations in infield/compilation video
5. [ ] **Convert to Claude CLI** - Replace AI SDK with `claude -p` subprocess pattern

### Speaker Labeling Prompt Improvements

```
ADD TO PROMPT:

HANDLING DIARIZATION CONFUSION:
If one speaker ID shows BOTH coach AND target patterns (opens AND gives short responses),
this indicates pyannote merged two speakers. In this case:
- Label as "mixed_diarization_error" with confidence 0.3
- FLAG for manual review
- Do NOT guess coach or target

MULTI-LANGUAGE HANDLING:
Speakers may code-switch between languages (e.g., English opener, Spanish conversation).
Focus on ROLE patterns (who initiates, who responds) not language.

CRITICAL RULES:
1. The person who delivers approach OPENERS is ALWAYS the coach
2. The person giving SHORT RESPONSES to questions is typically the target
3. If unsure, mark as "unknown" - DO NOT GUESS
```

---

## Resolved

All major questions answered. Ready to proceed with:
- **Opus** model via Claude Max
- **R1/R2** testing to validate limits
- **Stage review first** before any implementation
