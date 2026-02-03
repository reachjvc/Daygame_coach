# Pipeline Status

Updated: 02-02-2026 19:05 - Added turn-taking corrections to 04.segment-enrich; improved speaker label accuracy
Updated: 02-02-2026 17:30 - Measured actual timing: 0.92x realtime (diarization is bottleneck at 0.71x)
Updated: 02-02-2026 17:15 - Phase B batch test: 230 videos transcribed; alignment timeout on 50+ min files
Updated: 02-02-2026 - Cleaned archive docs, removed stale speaker clustering config from 03.audio-features
Updated: 02-02-2026 15:30 - Updated to use dynamic counts; added transcription time estimate

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

**Method**: large-v3 + whisperx.align + pyannote diarization (GPU)
**Total audio**: ~941 hours

### Measured Benchmark (843s video, CUDA GPU)

| Step | Time | Realtime Factor |
|------|------|-----------------|
| Transcription (large-v3) | 162s | 0.19x |
| Alignment (whisperx.align) | 10s | 0.01x |
| **Diarization (pyannote)** | **600s** | **0.71x** ← bottleneck |
| **Total** | **775s** | **0.92x** |

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
| **Transcription Approach** | **large-v3 only** | Quality testing showed distil-v3 has critical errors; HYBRID not worth 2x cost | 02-02-2026 |
| Diarization Engine | pyannote (via whisperx) | Reliable 2-speaker detection in street audio | 01-02-2026 |
| Text Model | `large-v3` with `condition_on_previous_text=True` | Best accuracy, proper nouns, punctuation | 02-02-2026 |
| Segmentation | `whisperx.align` | Splits large-v3 segments into sentence-level for diarization | 02-02-2026 |
| Speaker ID Location | 02.transcribe (diarization) → 04.segment-enrich (mapping) | Pyannote at transcription, coach/target mapping at enrichment | 02-02-2026 |

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
- 1 ZeroDivisionError failure during alignment (rare edge case)

**Note**: Total video count grows as new sources are added. Run `find data/01.download -mindepth 2 -maxdepth 2 -type d | wc -l` for current count.

---

## Current Gate

**FOCUS**: Proceed to Phase B with locked large-v3 approach

### Architecture (LOCKED)

```
Audio ──► large-v3 (condition_on_previous_text=True)
              │
              ▼
         whisperx.align ──► sentence-level segments
              │
              ▼
         pyannote ──► speaker diarization (SPEAKER_00/01)
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
| 02.transcribe | **VERIFIED** | large-v3 + whisperx.align + pyannote (LOCKED) |
| 03.audio-features | READY | Pyannote_speaker passthrough working |
| 04.segment-enrich | **IMPROVED** | Turn-taking corrections + coach/target pattern matching |
| 05.conversations | PENDING | Ready for Phase B |
| 06a.structure | PENDING | Will run after 05 |
| 06b.content | PENDING | Will run after 06a |
| 07.ingest | NOT STARTED | Will run after 06b |

**Check progress:**
```bash
# Count per step
echo "01.download: $(find data/01.download -mindepth 2 -maxdepth 2 -type d | wc -l) videos"
echo "02.transcribe: $(find data/02.transcribe -name '*.full.json' ! -name '*.*.full.json' | wc -l) done"
echo "03.audio-features: $(find data/03.audio-features -name '*.features.json' | wc -l) done"
echo "04.segment-enrich: $(find data/04.segment-enrich -name '*.enriched.json' | wc -l) done"
```

---

## Test Videos (5)

1. `ALWAYS BE CLOSING [KddKqbIhUwE]` - infield (critical test case)
2. `Critical Daygame Hack [zOc19KfIcFk]` - talking_head
3. `Fixing Mistakes [0B2hALxnzKk]` - talking_head
4. `HOW TO FEEL GOOD [JOhR3sQstIs]` - talking_head
5. `Better Conversations [B5AikkHrzuk]` - talking_head

Test data: `data/02.transcribe-test/`

---

## Next Actions

1. ~~**Run on 5 test videos**~~ ✅ DONE
2. ~~**Verify output quality**~~ ✅ DONE - proper nouns, diarization working
3. ~~**Test HYBRID value**~~ ✅ DONE - large-v3 only wins, HYBRID not worth 2x cost
4. **Phase B** - run 02.transcribe on batch of videos
5. **Continue pipeline** - run 03 → 04 → 05 → 06a → 06b on transcribed videos
6. **Phase C** - run full pipeline on all remaining videos (est. 8-12 days GPU time)

---

## Recent Changes

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
