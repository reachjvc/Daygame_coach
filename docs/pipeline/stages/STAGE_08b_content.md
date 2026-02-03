# Stage 08b: Content
**Status:** FRESH START
**Updated:** 03-02-2026

**Script**: `scripts/training-data/08b.content`

---

## Overview

Enriches interactions with techniques, topics, and quality metrics using LLM.

## Input
- `data/08a.structure/<source>/<video>/*.interactions.jsonl`

## Output
- `data/08b.content/<source>/<video>/`
  - `*.enriched.json` - Enriched interactions

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
./scripts/training-data/08b.content "source_name" "https://..."

# All sources
./scripts/training-data/08b.content --sources
```

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
