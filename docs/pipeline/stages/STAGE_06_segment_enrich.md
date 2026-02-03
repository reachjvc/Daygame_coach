# Stage 06: Segment Enrich
**Status:** FRESH START
**Updated:** 03-02-2026

**Script**: `scripts/training-data/06.segment-enrich`

---

## Overview

Labels speaker roles and classifies tone using audio features.

## Input
- `data/05.audio-features/<source>/<video>/*.features.json`

## Output
- `data/06.segment-enrich/<source>/<video>/`
  - `*.enriched.json` - Segments with speaker roles and tone

## Enrichment

### Speaker Roles
- `coach` - The instructor/pickup artist
- `target` - The person being approached
- `voiceover` - Commentary/narration
- `other` - Background speakers

### Tone Classification (Audio-based, NOT LLM)
| Tone | Thresholds |
|------|------------|
| `playful` | pitch_std > 22 AND energy_dyn > 13 |
| `confident` | pitch_std < 18 AND energy_dyn 8-13 AND syllable_rate 5-6.5 |
| `nervous` | syllable_rate > 6.8 AND pitch_std < 16 |
| `energetic` | brightness > 1700Hz OR energy_dyn > 15 |
| `neutral` | default (~47% of segments) |

## Usage
```bash
# Single file
./scripts/training-data/06.segment-enrich --input file.json

# All sources
./scripts/training-data/06.segment-enrich --sources
```

## Key Features
- Uses pyannote speaker IDs from stage 04
- Detects video type (infield vs talking_head) from title
- Maps SPEAKER_00/01 to semantic labels
- Turn-taking corrections for rapid exchanges

## Quality Targets

- Speaker role accuracy high
- Tone distribution ~47% neutral
- Turn-taking corrections applied correctly
- Speaker distribution ~80% coach, ~20% target for infield

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
