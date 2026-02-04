# Stage 08b: Content
**Status:** FRESH START
**Updated:** 04-02-2026

**Script**: `scripts/training-data/08b.content`

---

## Changelog
- 04-02-2026: Added speaker correction requirement (fixes pyannote merge errors)

---

## Overview

Enriches interactions with techniques, topics, and quality metrics using LLM.

**IMPORTANT:** This stage MUST also perform speaker correction as a preprocessing step (see below).

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
- Speaker corrections applied where needed

---

## Speaker Correction (Preprocessing)

**Why needed:** Pyannote diarization has ~1.5% error rate where rapid Q&A exchanges get merged into one speaker. See [STAGE_04_diarize.md](STAGE_04_diarize.md#known-limitations) for details.

**Detection pattern:** Same speaker appears to ask AND answer a direct question:
```
SPEAKER_01: "Where are you from?"
SPEAKER_01: "Chile"              ← LLM should detect this is wrong
```

**LLM prompt requirements:**
1. Before enrichment, scan conversation for Q&A speaker merge errors
2. Direct questions to look for:
   - "what's your name", "where are you from", "how old are you"
   - "do you speak/like/have", "are you from", "what do you do"
   - Any segment ending in `?` followed by short answer (<30 chars)
3. If same speaker asks AND answers → swap answer's speaker label
4. Track corrections in output metadata

**Output format:**
```json
{
  "speaker_corrections": [
    {
      "segment_idx": 42,
      "original_time": 78.2,
      "original_speaker": "SPEAKER_01",
      "corrected_speaker": "SPEAKER_02",
      "reason": "Q&A pattern: 'Where are you from?' → 'Chile'"
    }
  ],
  "interactions": [...]
}
```

**Expected correction rate:** ~1-2% of dialogue segments in infield videos.

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
