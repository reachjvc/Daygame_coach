# Stage 08: Content
**Status:** FRESH START
**Updated:** 04-02-2026

**Script**: `scripts/training-data/08.content`

---

## Changelog
- 04-02-2026: Renumbered from 07 to 08 (speaker correction now stage 07)
- 04-02-2026: Removed speaker correction (moved to dedicated stage 07)
- 04-02-2026: Added single-session processing for efficiency

---

## Overview

Enriches conversations with techniques, topics, and quality metrics using LLM.

**Note:** Speaker correction is handled in Stage 07. This stage assumes clean speaker labels.

## Input
- `data/07.speaker-correction/<source>/<video>/*.corrected.json`

## Output
- `data/08.content/<source>/<video>/`
  - `*.enriched.json` - Enriched conversations

## Enrichment

### Techniques (31 total, 5 categories)

**Openers (5)**:
direct_opener, indirect_opener, situational_opener, observation_opener, gambit

**Attraction (9)**:
push_pull, tease, cold_read, role_play, disqualification, DHV, frame_control, takeaway, false_time_constraint

**Connection (8)**:
qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor, screening, appreciation

**Compliance (1)**:
compliance

**Closing (8)**:
number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, time_bridge, logistics_check

### Topics (22 total, 5 categories)

**Personal (8)**: name, origin, career, education, hobby, travel, living_situation, ambitions

**Appearance (1)**: appearance

**Personality (4)**: personality, age, behavior, values

**Logistics (5)**: plans, contact, logistics, relationship, duration

**Context (4)**: food_drinks, location, humor, flirting

### Quality Metrics
- `hook_point_reached` - Boolean
- `investment_level` - low/medium/high
- `vibe_quality` - awkward/neutral/good/great
- `close_attempted` - Boolean
- `close_success` - Boolean

## Usage
```bash
# Single video
./scripts/training-data/08.content "source_name" "https://..."

# All sources
./scripts/training-data/08.content --sources
```

## Processing Architecture

**Single-session per video** for efficiency:
1. Send ALL interactions for one video in a single Claude CLI call
2. Taxonomy included once (not repeated per interaction)
3. Claude outputs JSONL (one line per interaction)
4. File-level checkpointing for resume capability

**Benefits:**
- 90% fewer API calls (1 per video instead of 1 per interaction)
- No subprocess overhead between interactions
- Context maintained across interactions

## Quality Targets

- Technique extraction accurate
- Topic coverage reasonable
- Quality metrics sensible

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
