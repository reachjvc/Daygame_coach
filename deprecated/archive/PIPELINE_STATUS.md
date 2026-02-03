# Pipeline Status

Updated: 03-02-2026 - R2 analysis: 1 PASS, 4 FAIL - hallucinations at 02.transcribe root cause
Updated: 03-02-2026 - Added Video Issues Tracker; KddKqbIhUwE fixed with --no-condition-on-prev
Updated: 03-02-2026 - Clarified flagging as manual remediation (not auto-retry); added remediation playbook
Updated: 03-02-2026 - Added repetition hallucination detection to 02/03; flags videos with 3+ consecutive repeated sentences to `.flagged.json`
Updated: 03-02-2026 - 03.align: filter wordless segments, no fallback, flag failures to `.failed.json`
Updated: 03-02-2026 - Split 02.transcribe into 02/03/04; renumbered pipeline to 9 scripts
Updated: 02-02-2026 17:30 - Measured actual timing: 0.92x realtime (diarization is bottleneck at 0.71x)

---

## Quick Stats (Dynamic)

Run these commands to get current counts:

```bash
# Downloaded videos
find data/01.download -mindepth 2 -maxdepth 2 -type d | wc -l

# Total audio duration (minutes)
find data/01.download -name "*.info.json" -exec cat {} \; | grep -o '"duration": [0-9.]*' | cut -d' ' -f2 | awk '{sum+=$1} END {print int(sum/60) " minutes (" int(sum/3600) " hours)"}'

# Transcribed videos
find data/02.transcribe -name "*.full.json" | wc -l
```

**As of 02-02-2026**: ~966 videos, ~941 hours of audio

---

## Transcription Time Estimate

**Method**: 02.transcribe → 03.align → 04.diarize (3 separate scripts, GPU)
**Total audio**: ~941 hours

### Measured Benchmark (843s video, CUDA GPU)

| Script | Step | Time | Realtime Factor |
|--------|------|------|-----------------|
| 02.transcribe | large-v3 transcription | 162s | 0.19x |
| 03.align | whisperx.align | 10s | 0.01x |
| **04.diarize** | **pyannote diarization** | **600s** | **0.71x** ← bottleneck |
| **Total** | — | **775s** | **0.92x** |

### Full Pipeline Estimate

| Scenario | Processing Time |
|----------|-----------------|
| With diarization (0.92x) | ~866 hours (~36 days) |
| Without diarization (0.2x) | ~188 hours (~8 days) |

**Note**: Diarization is required for speaker identification but is the slowest step.

---

## Locked Decisions (Do Not Change)

| Decision | Value | Rationale | Date |
|----------|-------|-----------|------|
| **Pipeline Split** | **02→03→04** | Separate concerns: transcribe, align, diarize | 03-02-2026 |
| **Transcription Approach** | **large-v3 only** | Quality testing showed distil-v3 has critical errors; HYBRID not worth 2x cost | 02-02-2026 |
| Diarization Engine | pyannote (via whisperx) | Reliable 2-speaker detection in street audio | 01-02-2026 |
| Text Model | `large-v3` with `condition_on_previous_text=True` | Best accuracy, proper nouns, punctuation | 02-02-2026 |
| Segmentation | `whisperx.align` (03.align) | Splits large-v3 segments into sentence-level for diarization | 02-02-2026 |
| Speaker ID Location | 04.diarize (pyannote) → 06.segment-enrich (mapping) | Pyannote labels, then coach/target mapping at enrichment | 03-02-2026 |

### Quality Testing Results (02-02-2026)
Tested distil-v3 vs large-v3 vs HYBRID on 5 videos. **large-v3 wins**:
- distil-v3 had critical errors: "Pennsylvania" instead of "Cincinnati", "food camp" instead of "boot camp"
- distil-v3 wrong on brand names: "Thrivedaygame" instead of "ThriveDayGame"
- HYBRID not worth 2x GPU memory and processing time
- whisperx.align already provides sentence-level segmentation

---

## Current State

```
Phase A: 5 Test Videos    [COMPLETE - VERIFIED]
Phase B: Batch Processing [IN PROGRESS - 230 transcribed]
Phase C: Full Pipeline    [NOT STARTED]
Phase D: Cleanup          [NOT STARTED]
```

**As of 02-02-2026 17:15**: 230/966 videos transcribed (~24%)

**Known issues**:
- whisperx.align timeouts on 50+ min files (need to skip or chunk)
- whisperx.align ZeroDivisionError on some videos (flagged to `.failed.json` for manual review)
- Whisper hallucination loops (same sentence repeated 3+ times) - auto-detected and flagged to `.flagged.json`
  - **Manual remediation**: See "Flagging & Manual Remediation" section below

**Note**: Total video count grows as new sources are added. Run `find data/01.download -mindepth 2 -maxdepth 2 -type d | wc -l` for current count.

---

## Flagging & Manual Remediation

Videos that fail or have quality issues are **flagged for manual review** (not auto-retried).

### View Flagged Videos

```bash
# Hallucination flags (repeated sentences)
find data/ -name ".flagged.json" -exec echo "=== {} ===" \; -exec cat {} \;

# Processing failures (ZeroDivisionError, etc.)
find data/ -name ".failed.json" -exec echo "=== {} ===" \; -exec cat {} \;

# Remediated videos (fixed with --no-condition-on-prev)
find data/ -name ".remediated.json" -exec echo "=== {} ===" \; -exec cat {} \;
```

### Remediation Playbook

| Issue | Flag Location | Remediation |
|-------|---------------|-------------|
| **Hallucination loops** (3+ repeated sentences) | `data/02.transcribe/<source>/.flagged.json` | Re-run 02.transcribe with `--no-condition-on-prev --overwrite`, then re-run 03.align |
| **03.align ZeroDivisionError** | `data/03.align/<source>/.failed.json` | Re-run 02.transcribe with `--no-condition-on-prev --overwrite`, then re-run 03.align. Produces fewer, longer segments that align better. |
| **03.align timeout** (50+ min files) | Process hangs | Skip or chunk audio manually |

**After remediation**: Log the fix to `data/02.transcribe/<source>/.remediated.json` and clear from `.flagged.json`/`.failed.json`.

### Video Issues Tracker (R2 Test Videos)

| Video ID | Source | Issue | Stage | Status | Notes |
|----------|--------|-------|-------|--------|-------|
| KddKqbIhUwE | daily_evolution | — | — | ✅ PASS | Clean through all stages |
| e2dLEB-AwmA | coach_kyle | 29× "Yeah" hallucination | 02.transcribe | ⚠️ PENDING | Needs `--no-condition-on-prev` |
| Sz1f6OiO5Ko | social_stoic | 358× "Thank you" hallucination | 02.transcribe | ⚠️ PENDING | Needs `--no-condition-on-prev` |
| -CZtcqqEDdk | social_stoic | 260× "I'm not looking" | 04.diarize | ⚠️ STALE | 02/03 clean, 04 needs `--overwrite` |
| Lhg-ycvVSro | NICK_KRAUSER | 266× "I'm not a chode" | 02.transcribe | ⚠️ PENDING | Needs `--no-condition-on-prev` |

### Hallucination Remediation Example

```bash
# 1. Find flagged video
cat data/02.transcribe/daily_evolution/.flagged.json

# 2. Re-run with hallucination-resistant settings
./scripts/training-data/02.transcribe --audio data/01.download/daily_evolution/<video>/*.wav \
  --out data/02.transcribe/daily_evolution/<video>/<video>.full.json \
  --no-condition-on-prev --overwrite

# Trade-off: May have minor capitalization inconsistencies on proper nouns
```

---

## Current Gate

**FOCUS**: Proceed to Phase B with locked large-v3 approach

### Architecture (LOCKED)

```
Audio ──► 02.transcribe (large-v3, condition_on_previous_text=True)
              │
              ▼ [segments with word timestamps]
         03.align (whisperx.align) ──► sentence-level segments
              │
              ▼
         04.diarize (pyannote) ──► speaker diarization (SPEAKER_00/01)
```

**Key findings from Phase A:**
- ✅ `condition_on_previous_text=True` required for proper capitalization
- ✅ `whisperx.align` splits long segments for diarization
- ✅ Proper nouns capitalized: Sydney Sweeney, Austin, Texas, etc.
- ✅ Speaker distribution: ~80% coach, ~20% target (reasonable for infield)
- ✅ large-v3 produces correct city names, brand names, and vocabulary

### Next Steps:
1. **Phase B** - run on 15 more videos (20 total)
2. **Phase C** - run on remaining 436 videos
3. **Continue pipeline** - 05.conversations onwards

---

## Script Status

| Script | Status | Notes |
|--------|--------|-------|
| 01.download | DONE | ~966 videos downloaded (~941 hours audio) |
| 02.transcribe | **MODIFIED** | large-v3 only (no align/diarize) |
| 03.align | **NEW** | whisperx.align for sentence-level segments |
| 04.diarize | **NEW** | pyannote speaker diarization |
| 05.audio-features | READY | Pyannote_speaker passthrough working |
| 06.segment-enrich | **IMPROVED** | Turn-taking corrections + coach/target pattern matching |
| 07.conversations | PENDING | Ready for Phase B |
| 08a.structure | PENDING | Will run after 07 |
| 08b.content | PENDING | Will run after 08a |
| 09.ingest | NOT STARTED | Will run after 08b |

**Check progress:**
```bash
# Count per step
echo "01.download: $(find data/01.download -mindepth 2 -maxdepth 2 -type d | wc -l) videos"
echo "02.transcribe: $(find data/02.transcribe -name '*.full.json' ! -name '*.*.full.json' | wc -l) done"
echo "03.align: $(find data/03.align -name '*.full.json' ! -name '*.*.full.json' | wc -l) done"
echo "04.diarize: $(find data/04.diarize -name '*.full.json' ! -name '*.*.full.json' | wc -l) done"
echo "05.audio-features: $(find data/05.audio-features -name '*.features.json' | wc -l) done"
echo "06.segment-enrich: $(find data/06.segment-enrich -name '*.enriched.json' | wc -l) done"
```

---

## Test Round Naming Convention

| Round | Purpose | Videos | Status |
|-------|---------|--------|--------|
| `pilot` | Original 20-video expansion (historical) | 20 mixed | ARCHIVED |
| `r1` | Phase A: Initial 5-video pipeline verification | 5 (daily_evolution only) | COMPLETE |
| `r2` | 5-video infield test with problematic cases | 5 infield | **CURRENT** |

**Data locations:**
- `data/test/pilot/` - Historical manifest (archived)
- `data/test/r1/` - Phase A test data + transcripts
- `data/test/r2/` - Current test round (symlinks to main data)

---

## Test Round r2 (Current)

**Purpose**: Test refactored 9-script pipeline (02→03→04 split) on infield videos only.

**Status**: 1 PASS, 4 FAIL (hallucinations at 02.transcribe)

**Videos**:
| # | Video ID | Source | 02 | 03 | 04 | Issue |
|---|----------|--------|----|----|----|----|
| 1 | KddKqbIhUwE | daily_evolution | ✓ | ✓ | ✓ | **PASS** - 79→89 segments, clean |
| 2 | e2dLEB-AwmA | coach_kyle | ✗ | ✗ | ✗ | **FAIL @ 02** - 29× "Yeah" hallucination |
| 3 | Sz1f6OiO5Ko | social_stoic | ✗ | ✗ | ✗ | **FAIL @ 02** - 358× "Thank you" hallucination |
| 4 | -CZtcqqEDdk | social_stoic | ✓ | ✓ | ✗ | **FAIL @ 04** - 02/03 fixed, 04 stale (260× "I'm not looking") |
| 5 | Lhg-ycvVSro | NICK_KRAUSER | ✗ | ✗ | ✗ | **FAIL @ 02** - 266× "I'm not a chode" hallucination |

**Root Cause**: Whisper `condition_on_previous_text=True` causes hallucination loops on noisy infield audio

**Remediation Required**:
| Video ID | Action |
|----------|--------|
| e2dLEB-AwmA | `./02.transcribe --no-condition-on-prev --overwrite` then re-run 03, 04 |
| Sz1f6OiO5Ko | `./02.transcribe --no-condition-on-prev --overwrite` then re-run 03, 04 |
| -CZtcqqEDdk | `./04.diarize --overwrite` only (02/03 already clean) |
| Lhg-ycvVSro | `./02.transcribe --no-condition-on-prev --overwrite` then re-run 03, 04 |

**Data Location**: `data/{02,03,04}.{transcribe,align,diarize}/` (main pipeline folders)

---

## Next Actions

1. ~~**Run on 5 test videos**~~ ✅ DONE
2. ~~**Verify output quality**~~ ✅ DONE - proper nouns, diarization working
3. ~~**Test HYBRID value**~~ ✅ DONE - large-v3 only wins, HYBRID not worth 2x cost
4. ~~**Split pipeline**~~ ✅ DONE - 02.transcribe split into 02/03/04
5. **Phase B** - run 02→03→04 pipeline on batch of videos
6. **Continue pipeline** - run 05 → 06 → 07 → 08a → 08b on diarized videos
7. **Phase C** - run full pipeline on all remaining videos (est. 8-12 days GPU time)

---

## Recent Changes

### 03-02-2026 - Pipeline Refactored (7 → 9 Scripts)

Split `02.transcribe` into three separate scripts for better modularity:

| Old | New | Description |
|-----|-----|-------------|
| 02.transcribe (all-in-one) | 02.transcribe | large-v3 transcription only |
| — | 03.align | whisperx.align for sentence segments |
| — | 04.diarize | pyannote speaker diarization |

Renumbered downstream scripts:
- 03.audio-features → 05.audio-features
- 04.segment-enrich → 06.segment-enrich
- 05.conversations → 07.conversations
- 06a.structure → 08a.structure
- 06b.content → 08b.content
- 07.ingest.ts → 09.ingest.ts

Deleted: `02b.clean-transcribed` (obsolete consensus merge script)

### 02-02-2026 19:05 - Turn-Taking Corrections in 04.segment-enrich

Added post-processing to fix pyannote speaker label flips:

**New Features:**
- `apply_turn_taking_corrections()` - corrects speaker labels using conversational context
- Coach question patterns - overrides target labels for questions like "How's your day going?"
- Improved "I'm [Name]" detection - distinguishes coach intro from target responses
- 3+ speaker handling - labels secondary speakers as "embedded_clip" in talking_head videos

**Test Results (KddKqbIhUwE infield video):**
- Turn-taking corrections applied: 9 segments
- Key fixes: "How's your day going?" → coach, "It's good." → target, "Alyssa." → target
- Final distribution: 118 coach, 52 target (from 170 segments)

### 02-02-2026 17:15 - Phase B Batch Test

Ran 02.transcribe on 14 randomly selected videos with audio ready:
- **6 newly transcribed**: 5ngoDVsOJz0, RjX3I4CRK8Y, Ug3XudWT_8A, BNPJSzy8x9A, kbecyT-9bJE, TcUKm5LAWYU
- **4 skipped**: Already had transcriptions from earlier runs
- **1 failed**: Wd8HhkKxa0g - ZeroDivisionError in whisperx.align
- **1 timeout**: UftblvPgTDs (51-min podcast) - whisperx.align stuck >17 min
- **2 not reached**: Process killed due to timeout

**Finding**: Very long files (50+ min) can cause whisperx.align to hang.

### 02-02-2026 14:00 - LOCKED: large-v3 Only (HYBRID Rejected)

Quality testing completed on 5 videos comparing distil-v3 vs large-v3 vs HYBRID:
- **distil-v3 errors**: "Pennsylvania" (should be Cincinnati), "food camp" (should be boot camp)
- **distil-v3 brand errors**: "Thrivedaygame" (should be ThriveDayGame)
- **large-v3**: Correct on all proper nouns, cities, brand names
- **HYBRID verdict**: NOT worth implementing - 2x GPU memory, 2x time, no benefit
- **Decision**: Use large-v3 + condition_on_previous_text=True + whisperx.align + pyannote

### 03-02-2026 10:25 - Phase A Complete

Tested 02.transcribe on 5 test videos with verified quality:
- Fixed capitalization issue: `condition_on_previous_text=True` required
- whisperx.align splits long segments for better diarization
- All proper nouns correctly capitalized (Sydney Sweeney, Austin, Texas, etc.)
- Speaker diarization working (~80% coach, ~20% target for infield videos)

### 02-02-2026 20:30 - Pyannote Diarization

- Switched from embedding-based clustering to pyannote diarization
- 02.transcribe: Enabled pyannote diarization by default
- 03.audio-features: Added pyannote_speaker passthrough
- 04.segment-enrich: Uses pyannote IDs for speaker mapping

---

## Blocking Issues

None. Transcription approach is LOCKED (large-v3 only). Ready to proceed with Phase B.

---

## Session Handoff Protocol

### Starting a New Session
1. Read this file first (PIPELINE_STATUS.md)
2. Read `PIPELINE_PLAN.md` for overall architecture
3. Check "Current Gate" - what's blocking
4. Check "Next Actions" - immediate tasks

### Before Ending a Session
1. Update "Current Gate" with progress
2. Update "Next Actions" with remaining work
3. Add entry to "Recent Changes"

### Rules
- Transcription approach is LOCKED - large-v3 only (do not change without user approval)
- Update this file BEFORE summarizing to user
