# Handoff: Pipeline Implementation

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
Phase 1: segment-enrich  [x] SCRIPT IMPLEMENTED (04.segment-enrich exists)
Phase 2: conversations   [ ] IN PROGRESS - script reorganized, needs testing
Phase 3: interactions    [ ] IN PROGRESS - scripts reorganized (06a + 06b)
Phase 4: ingest          [ ] IN PROGRESS - script reorganized (07.ingest.ts)
Phase 5: full-run        [ ] Not Started
Phase 6: cleanup         [ ] Not Started
```

---

## Pipeline Structure (7 Scripts - CONFIRMED)

```
scripts/training-data/
├── 01.download        → Audio files
├── 02.transcribe      → Whisper → .full.json + .txt
├── 03.audio-features  → pitch, energy, tempo, speaker_embedding
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

1. **Run the scripts on test data** to verify the reorganized I/O paths work
2. **Update 04.segment-enrich** to use `speaker_embedding` instead of pitch-based clustering
3. **Test transcript engines** (whisperx vs faster vs whisper) - user wants quality comparison before picking default

---

## Key Documents

| File | Purpose |
|------|---------|
| `docs/overviews/PIPELINE/plans/plan_pipeline.md` | **MASTER PLAN** - read this first |
| `docs/overviews/PIPELINE/phases/phase_*.md` | Detailed steps for each phase |
| `scripts/training-data/schemas/` | JSON schemas for pipeline outputs |

---

## User Decisions Already Made

- **Transcript engines:** Run quality comparison test BEFORE picking default
- **Old scripts:** Moved to `old/` folder, retrieve if needed
- **Speaker clustering:** Use speaker_embedding, not pitch-based

---

## Rules (from CLAUDE.md)

1. Read `docs/testing_behavior.md` before writing any tests
2. Run `npm test` between every implementation step
3. Add changelog entry to any doc modified
4. No fallback mechanisms - fix issues, don't work around them
