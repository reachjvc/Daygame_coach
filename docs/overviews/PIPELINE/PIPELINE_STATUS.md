# Pipeline Status

Updated: 03-02-2026 07:55 - IMPLEMENTED: HYBRID fusion in 02.transcribe (runs both distil-v3 + large-v3)
Updated: 02-02-2026 22:00 - Cleaned: Removed legacy model references, kept only HYBRID (distil-v3 + large-v3)
Updated: 02-02-2026 21:30 - LOCKED: HYBRID transcription approach (distil-v3 structure + large-v3 text)

---

## Locked Decisions (Do Not Change)

| Decision | Value | Rationale | Date |
|----------|-------|-----------|------|
| **Transcription Approach** | **HYBRID** (distil-v3 + large-v3) | Best of both: distil-v3 for diarization structure, large-v3 for text accuracy | 02-02-2026 |
| Diarization Engine | whisperx + pyannote | Reliable 2-speaker detection in street audio | 01-02-2026 |
| Structure Model | `Systran/faster-distil-whisper-large-v3` | Best turn segmentation, preserves speaker turn boundaries | 02-02-2026 |
| Text Model | `large-v3` | Best transcription accuracy, proper nouns, punctuation | 02-02-2026 |
| Speaker ID Location | 02.transcribe (diarization) → 04.segment-enrich (mapping) | Pyannote at transcription, coach/target mapping at enrichment | 02-02-2026 |

---

## Current State

```
Phase A: 5 Test Videos    [HYBRID IMPLEMENTED - READY TO TEST]
Phase B: 15 More Videos   [NOT STARTED]
Phase C: 436 Remaining    [NOT STARTED]
Phase D: Cleanup          [NOT STARTED]
```

---

## Current Gate

**FOCUS**: Test HYBRID transcription on 5 test videos

### HYBRID Architecture (IMPLEMENTED)

```
Audio ──► distil-v3 ──► SEGMENTS + TIMESTAMPS
              │
              ▼
Audio ──► large-v3 ──► WORD-LEVEL TEXT (with timestamps)
              │
              ▼
         FUSION ──► distil-v3 boundaries + large-v3 words
              │
              ▼
         whisperx.align ──► refined word timestamps
              │
              ▼
         pyannote ──► speaker diarization
```

**Implementation complete:**
- ✅ Both models loaded in WhisperXAlignEngine
- ✅ Fusion logic: maps large-v3 words to distil-v3 segment boundaries
- ✅ CLI: `--faster-model` (structure) + `--text-model` (accuracy)
- ✅ Defaults: distil-v3 for structure, large-v3 for text

### Next Steps:
1. **Test on 5 videos** - run `./02.transcribe --overwrite` on test set
2. **Verify output quality** - check proper nouns, segment boundaries
3. **Proceed to Phase B** - run on 15 more videos

---

## Script Status

| Script | Status | Files | Notes |
|--------|--------|-------|-------|
| 01.download | DONE | 2753 | Audio files ready |
| 02.transcribe | **READY** | 5/456 | HYBRID fusion implemented (distil-v3 structure + large-v3 text) |
| 03.audio-features | READY | 5/456 | Pyannote_speaker passthrough working |
| 04.segment-enrich | READY | 5/456 | Pyannote-based speaker ID working |
| 05.conversations | PENDING | 0 | Will run after 02 hybrid verification |
| 06a.structure | PENDING | 0 | Will run after 05 |
| 06b.content | PENDING | 0 | Will run after 06a |
| 07.ingest | NOT STARTED | 0 | Will run after 06b |

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

1. ~~**Implement hybrid fusion** in 02.transcribe script~~ ✅ DONE
2. **Run hybrid on 5 test videos** - `./02.transcribe --overwrite` on test set
3. **Verify output quality** - check proper nouns, segment boundaries
4. **Proceed to Phase B** - run on 15 more videos (20 total)
5. **Proceed with 05.conversations** after Phase B verification

---

## Recent Changes

### 03-02-2026 07:55 - HYBRID Fusion Implemented

Implemented HYBRID transcription in 02.transcribe:
- WhisperXAlignEngine now loads BOTH models (distil-v3 + large-v3)
- Added `--text-model` CLI parameter (defaults to large-v3)
- Fusion logic: distil-v3 segment boundaries + large-v3 word-level text
- Process: structure → text → fusion → alignment → diarization

### 02-02-2026 22:00 - Documentation Cleanup

Removed legacy model comparison data. Pipeline now uses only:
- **distil-v3** (`Systran/faster-distil-whisper-large-v3`) for structure/diarization
- **large-v3** for text accuracy

### 02-02-2026 21:30 - HYBRID Approach Locked

Decision: HYBRID approach combining two models:
- distil-v3 for segment boundaries + pyannote diarization
- large-v3 for text content
- Fusion: distil-v3 structure + large-v3 text

### 02-02-2026 20:30 - Pyannote Diarization

- Switched from embedding-based clustering to pyannote diarization
- 02.transcribe: Enabled pyannote diarization by default
- 03.audio-features: Added pyannote_speaker passthrough
- 04.segment-enrich: Uses pyannote IDs for speaker mapping

---

## Blocking Issues

None. Ready to implement hybrid approach.

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
- HYBRID approach is LOCKED - do not change without user approval
- Update this file BEFORE summarizing to user
