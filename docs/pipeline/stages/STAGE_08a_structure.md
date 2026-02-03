# Stage 08a: Structure
**Status:** FRESH START
**Updated:** 03-02-2026

**Script**: `scripts/training-data/08a.structure`

---

## Overview

Extracts interaction objects with turn-level structure and phase detection.

## Input
- `data/07.conversations/<source>/<video>/*.conversations.json`

## Output
- `data/08a.structure/<source>/<video>/`
  - `*.interactions.jsonl` - One interaction per line

## Extraction

### Interaction Phases
```
open → pre_hook → post_hook → close
```

| Phase | Description |
|-------|-------------|
| `open` | Initial approach and first contact |
| `pre_hook` | Coach working to engage her, brief responses |
| `post_hook` | She's invested, mutual exchange |
| `close` | Asking for contact or date |

### Hook Point Marker
- `turn_index` - Which turn hook occurred
- `signal` - What indicated the hook
- `confidence` - How certain

## Usage
```bash
# Single video
./scripts/training-data/08a.structure "source_name" "https://..."

# All sources
./scripts/training-data/08a.structure --sources
```

## Output Format (JSONL)
```json
{
  "id": 1,
  "type": "approach",
  "start_time": 0.0,
  "end_time": 45.5,
  "phases": {
    "opener": {"start_turn": 0, "end_turn": 2},
    "hook": {"turn_index": 5, "signal": "laughing"},
    ...
  },
  "turns": [...]
}
```

## Quality Targets

- Interaction boundaries correct
- Phase transitions make sense
- Hook point detection accurate

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
