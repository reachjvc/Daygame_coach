# Pipeline Status

Updated: 31-01-2026 19:50 - 04.segment-enrich completed on 5 videos. Awaiting gate approval.
Updated: 31-01-2026 20:00 - Fresh start after consolidation. Restarting 5-video test.

---

## Current State

```
Phase A: 5 Test Videos    [RESTARTING]
Phase B: 15 More Videos   [NOT STARTED]
Phase C: 436 Remaining    [NOT STARTED]
Phase D: Cleanup          [NOT STARTED]
```

---

## Current Gate

**AWAITING APPROVAL**: 04.segment-enrich completed on 5 test videos

Gate report presented with:
- Pre-gate validation: PASSED (no unknown types, no heuristics)
- All 35 target segments shown for review
- Video 5 keyword fix applied (added "conversations" to TALKING_HEAD_KEYWORDS)

---

## Script Status

| Script | Status | Files | Notes |
|--------|--------|-------|-------|
| 01.download | DONE | 2753 | Audio files ready |
| 02.transcribe | DONE | 2303 | Transcripts ready |
| 03.audio-features | DONE | 456 | speaker_embedding confirmed present |
| 04.segment-enrich | GATE PENDING | 5 | Awaiting user approval |
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

1. **Check 03.audio-features** - Verify if speaker_embedding exists or needs regeneration
2. **Run 04.segment-enrich** on 5 test videos
3. **Present gate report** for user approval
4. Continue pipeline sequentially with gates

---

## Recent Changes

### 31-01-2026 20:00
- Consolidated 14 pipeline docs into 2 files (PIPELINE_PLAN.md + PIPELINE_STATUS.md)
- Resolved 8 documentation conflicts with user
- Confirmed: 06c removed, 7 scripts total, pragmatic quality approach
- Restarting 5-video test from scratch

### Previous Work (for reference)
- resemblyzer installed for speaker embeddings
- 04.segment-enrich script updated to use existing speaker_id from 03
- Scripts 04, 05, 06a, 06b exist and were partially tested
- Old test data exists but is incomplete

---

## Blocking Issues

None currently. Ready to proceed with 5-video test.

---

## Session Handoff Instructions

When starting a new session:

1. Read `PIPELINE_PLAN.md` first (the plan)
2. Read this file (current status)
3. Check "Current Gate" section above
4. Continue from "Next Actions"
5. Update this file after completing work

**Remember**: HARD GATES require explicit user "APPROVED" before proceeding.
