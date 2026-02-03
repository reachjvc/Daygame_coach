# Stage 07: Conversations
**Status:** FRESH START
**Updated:** 03-02-2026

**Script**: `scripts/training-data/07.conversations`

---

## Overview

Detects video type and conversation boundaries within videos.

## Input
- `data/06.segment-enrich/<source>/<video>/*.enriched.json`

## Output
- `data/07.conversations/<source>/<video>/`
  - `*.conversations.json` - Video type + conversation boundaries

## Detection

### Video Types
| Type | Description |
|------|-------------|
| `infield` | Real approaches filmed on street |
| `talking_head` | Coach speaking to camera |
| `podcast` | Interview/discussion format |
| `compilation` | Mixed content |

### Conversation Detection (Infield Only)
- Identifies approach openers (excuse me, I like your style, etc.)
- Marks conversation IDs and boundaries
- Uses 10-segment windows with 3-segment overlap

## Usage
```bash
# Single video
./scripts/training-data/07.conversations "source_name" "https://..."

# All sources
./scripts/training-data/07.conversations --sources
```

## Key Features
- Heuristic video type detection from keywords
- LLM fallback if heuristic uncertain
- Non-infield handling: forces all segments to commentary

## Quality Targets

- Video type detection accuracy 95%+
- Conversation boundary detection accurate
- Non-infield should have 0 conversations detected

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
