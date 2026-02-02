# Handoff: Pipeline Implementation

**ARCHIVED** - Superseded by `docs/overviews/PIPELINE/PIPELINE_STATUS.md`

**Updated:** 02-02-2026 22:30 - Cleaned: Updated to HYBRID transcription (distil-v3 + large-v3)
**Updated:** 31-01-2026 18:20 - Pipeline tested on 5 videos, speaker embeddings working
**Updated:** 31-01-2026 17:40 - Clarified next steps
**Updated:** 31-01-2026 17:35 - Script reorganization COMPLETE

---

## What You're Doing

You are implementing the **pipeline phases** defined in `docs/overviews/PIPELINE/plans/plan_pipeline.md`.

**READ THAT FILE FIRST.** It has the master step list (P0.x through P6.x) with checkboxes showing what's done.

---

## Current Status

```
Phase 0: Preparation     [x] COMPLETE
Phase 1: segment-enrich  [x] TESTED on 5 videos - using speaker_id from 03.audio-features
Phase 2: conversations   [x] TESTED on 5 videos - video type detection working
Phase 3: interactions    [x] TESTED on 5 videos - 06a + 06b working
Phase 4: ingest          [ ] Ready - needs Supabase connection
Phase 5: full-run        [ ] Not Started - needs all 456 videos
Phase 6: cleanup         [ ] Not Started
```

---

## Test Results (5 Pilot Videos)

| Video | Type | Segments | Clusters | Interactions | Approaches |
|-------|------|----------|----------|--------------|------------|
| ALWAYS BE CLOSING | infield | 170 | 3 | 27 | 19 |
| Critical Daygame Hack | talking_head | 140 | 1 | 1 | 1 |
| Fixing Mistakes | talking_head | 186 | 1 | 0 | 0 |
| HOW TO FEEL GOOD | talking_head | 107 | 1 | 0 | 0 |
| Better Conversations | talking_head | 125 | 2 | 0 | 0 |

- Infield video correctly extracts approaches
- Talking head videos correctly have 0/few interactions

---

## Key Changes Made (31-01-2026)

1. **resemblyzer installed** → Speaker embeddings now generated in 03.audio-features
2. **04.segment-enrich updated** → Uses existing `speaker_id` from audio-features (not re-clustering)
3. **LLM prompt improved** → Focus on utterance content, not pitch-based gender
4. **Pipeline tested end-to-end** → 04 → 05 → 06a → 06b all working

---

## Pipeline Structure (7 Scripts - CONFIRMED)

```
scripts/training-data/
├── 01.download        → Audio files
├── 02.transcribe      → HYBRID (distil-v3 + large-v3) → .full.json + .txt
├── 03.audio-features  → pitch, energy, tempo, speaker_embedding (resemblyzer)
├── 04.segment-enrich  → Speaker labels (LLM) + tone (audio thresholds)
├── 05.conversations   → Video type + conversation boundaries
├── 06a.structure      → Interaction boundaries + phases
├── 06b.content        → Techniques + topics
├── 07.ingest.ts       → Supabase vector store
└── old/               → Archived scripts (05.tonality, 06.speakers, etc.)
```

Data flows: `01 → 02 → 03 → 04 → 05 → 06a → 06b → 07`

---

## Immediate Next Steps

1. **Regenerate 03.audio-features for all 456 videos** (resemblyzer is now installed)
2. **Run full pipeline on all 456 videos** (Phases 1-4)
3. **Test 07.ingest.ts** with Supabase connection
4. ~~**Test transcript engines**~~ - RESOLVED: **HYBRID approach locked** (distil-v3 + large-v3) - see PIPELINE_PLAN.md

---

## Key Documents

| File | Purpose |
|------|---------|
| `docs/overviews/PIPELINE/plans/plan_pipeline.md` | **MASTER PLAN** - read this first |
| `docs/overviews/PIPELINE/phases/phase_*.md` | Detailed steps for each phase |
| `scripts/training-data/schemas/` | JSON schemas for pipeline outputs |

---

## User Decisions Already Made

- **Transcription:** HYBRID approach locked (distil-v3 for structure + large-v3 for text) - see PIPELINE_PLAN.md
- **Old scripts:** Moved to `old/` folder, retrieve if needed
- **Speaker clustering:** Use existing `speaker_id` from 03.audio-features

---

## Rules (from CLAUDE.md)

1. Read `docs/testing_behavior.md` before writing any tests
2. Run `npm test` between every implementation step
3. Add changelog entry to any doc modified
4. No fallback mechanisms - fix issues, don't work around them
