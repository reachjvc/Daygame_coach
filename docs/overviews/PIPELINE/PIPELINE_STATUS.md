# Pipeline Status

Updated: 02-02-2026 20:30 - MAJOR: Switched to pyannote diarization. All 5 test videos processed.
Updated: 01-02-2026 21:00 - Redesigned speaker ID. Removed incremental clustering from 03, added global clustering to 04.
Updated: 01-02-2026 19:35 - Fixed 04.segment-enrich mislabeling with turn-taking corrections. 8 segments corrected.
Updated: 31-01-2026 22:09 - Added quality-first approach to plan. Next: thorough 03.audio-features review.

---

## Current State

```
Phase A: 5 Test Videos    [READY FOR REVIEW]
Phase B: 15 More Videos   [NOT STARTED]
Phase C: 436 Remaining    [NOT STARTED]
Phase D: Cleanup          [NOT STARTED]
```

---

## Current Gate

**FOCUS**: Review speaker ID results from pyannote diarization

### Architecture Change (02-02-2026 20:30):

**Problem**: Resemblyzer embeddings couldn't distinguish coach from target in noisy street audio.
Clustering approaches (incremental in 03, global in 04) both failed to separate speakers.

**Solution**: Switched to pyannote diarization at transcription stage:
- 02.transcribe: Pyannote diarization ON by default (outputs SPEAKER_00, SPEAKER_01)
- 03.audio-features: Passes through `pyannote_speaker` field
- 04.segment-enrich: Maps pyannote speakers to coach/target using:
  - Speaking time (majority speaker = coach)
  - Text patterns for refinement

**Key changes**:
1. 02.transcribe: Enabled `--whisperx-diarize` by default, improved overlap algorithm
2. 03.audio-features: Added `pyannote_speaker` passthrough from transcript
3. 04.segment-enrich: Rewrote `identify_speakers_global()` to use pyannote IDs
4. Removed embedding-based clustering (was unreliable for street audio)

### Test Results (5 Videos):

| Video | Type | Segments | Pyannote Speakers | Final Labels |
|-------|------|----------|-------------------|--------------|
| ALWAYS BE CLOSING | infield | 170 | SPEAKER_00: 143, SPEAKER_01: 27 | coach: 110, target: 60 |
| Critical Daygame Hack | talking_head | 140 | (single speaker) | coach: 140 |
| Fixing Mistakes | talking_head | 186 | (single speaker) | coach: 186 |
| HOW TO FEEL GOOD | talking_head | 107 | (single speaker) | coach: 107 |
| Better Conversations | talking_head | 125 | (single speaker) | coach: 125 |

**Infield Details**:
- Pyannote correctly detected 2 speakers (277s vs 27s speaking time)
- Text patterns refined 33 additional segments to "target" (short responses)
- Some mislabeling remains (e.g., coach's opener phrases sometimes flagged as target)

### Next Steps:
1. **User review**: Check sample segments from infield video
2. **Decision needed**: Is current accuracy acceptable for training data?
3. If approved → run 05.conversations on 5 videos

---

## Script Status

| Script | Status | Files | Notes |
|--------|--------|-------|-------|
| 01.download | DONE | 2753 | Audio files ready |
| 02.transcribe | UPDATED | 5/456 | Pyannote diarization ON by default. 5 test videos reprocessed. |
| 03.audio-features | UPDATED | 5/456 | Added pyannote_speaker passthrough. 5 test videos reprocessed. |
| 04.segment-enrich | UPDATED | 5/456 | Pyannote-based speaker ID. 5 test videos processed. |
| 05.conversations | PENDING | 0 | Will run after 04 approval |
| 06a.structure | PENDING | 0 | Will run after 05 |
| 06b.content | PENDING | 0 | Will run after 06a |
| 07.ingest | NOT STARTED | 0 | Will run after 06b |

---

## Test Videos (5)

These videos will be used for Phase A:

1. `Daygame Pickup Infield - ALWAYS BE CLOSING [KddKqbIhUwE]` - infield
2. `Critical Daygame Hack To Get More Girls [zOc19KfIcFk]` - talking_head
3. `Fixing The Mistakes That KILL Your Daygame [0B2hALxnzKk]` - talking_head
4. `HOW TO FEEL GOOD [JOhR3sQstIs]` - talking_head
5. `Better Conversations With Women In 90 Seconds [B5AikkHrzuk]` - talking_head

Source: `data/03.audio-features/daily_evolution/`

---

## Next Actions

1. **User review**: Check speaker labels in infield video - is accuracy acceptable?
2. **Decision point**: Approve current approach or request improvements
3. After approval → run 05.conversations on 5 videos
4. Re-run 02, 03, 04 on remaining 451 videos (optional batch)

---

## Recent Changes

### 02-02-2026 20:30
- **MAJOR**: Switched from embedding-based clustering to pyannote diarization
- 02.transcribe: Enabled pyannote diarization by default, simplified to whisperx-only engine
- 03.audio-features: Added `pyannote_speaker` passthrough field
- 04.segment-enrich: Rewrote speaker ID to use pyannote IDs + text patterns
- Removed all embedding-based clustering code (was unreliable for street audio)
- Processed all 5 test videos successfully

### 01-02-2026 19:35
- Added `apply_turn_taking_corrections()` to 04.segment-enrich script (now superseded by pyannote approach)
- Fixed 8 mislabeled segments in infield video
- Root cause: LLM labels at CLUSTER level, missed segment-level turn-taking patterns

### 31-01-2026 20:00
- Consolidated 14 pipeline docs into 2 files (PIPELINE_PLAN.md + PIPELINE_STATUS.md)
- Resolved 8 documentation conflicts with user
- Confirmed: 06c removed, 7 scripts total, pragmatic quality approach
- Restarting 5-video test from scratch

### Previous Work (for reference)
- resemblyzer installed for speaker embeddings
- 04.segment-enrich script updated to use existing speaker_id from 03
- Scripts 04, 05, 06a, 06b exist and were partially tested

---

## Blocking Issues

None currently. Ready to proceed with 5-video test.

---

## Session Handoff Protocol

### Starting a New Session
1. Read this file first (PIPELINE_STATUS.md) - current state
2. Read `PIPELINE_PLAN.md` if needed - the overall plan
3. Check "Current Gate" section - what's blocking
4. Check "Next Actions" - what to do
5. Check "Blocking Issues" - known problems

### Before Ending a Session
1. Update "Current Gate" with what's blocking
2. Update "Next Actions" with immediate next steps
3. Add entry to "Recent Changes" with today's date
4. If issues found: add to "Blocking Issues"

### Rules
- HARD GATES require explicit user "APPROVED" before proceeding
- One script at a time - complete verification before moving on
- Update this file BEFORE summarizing to user (doc-before-summary rule)
- Never make assumptions - ask user if unclear
