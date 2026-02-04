# Stage 07: Speaker Correction
**Status:** TO BE CREATED
**Updated:** 04-02-2026

**Script**: `scripts/training-data/07.speaker-correction`

---

## Changelog
- 04-02-2026: Created as dedicated stage (extracted from content enrichment)

---

## Overview

Fixes pyannote diarization errors where rapid Q&A exchanges are incorrectly merged into one speaker.

**Why a separate stage:**
- Single responsibility principle
- Easier to verify and test independently
- Content enrichment (Stage 08) can assume clean speaker labels

## Input
- `data/06.conversations/<source>/<video>/*.conversations.json`

## Output
- `data/07.speaker-correction/<source>/<video>/`
  - `*.corrected.json` - Conversations with fixed speaker labels

## Detection Logic

### Q&A Pattern Detection

Pyannote diarization has ~1.5% error rate where rapid Q&A exchanges get merged into one speaker. See [STAGE_04_diarize.md](STAGE_04_diarize.md#known-limitations) for details.

**Detection pattern:** Same speaker appears to ask AND answer a direct question:
```
SPEAKER_01: "Where are you from?"
SPEAKER_01: "Chile"              ← Should be SPEAKER_02
```

### Question Types to Detect

1. **Direct questions** (high confidence):
   - "what's your name"
   - "where are you from"
   - "how old are you"
   - "what do you do"

2. **Binary questions** (medium confidence):
   - "do you speak/like/have..."
   - "are you from..."
   - "have you been..."

3. **General questions** (lower confidence):
   - Any segment ending in `?` followed by short answer (<30 chars)

### Correction Rules

1. If same speaker asks AND answers a direct question:
   - Swap answer segment's speaker label to the other speaker

2. Multi-turn corrections:
   - Check for cascading errors (Q&A → Q&A → Q&A)
   - Correct the entire chain

## Output Format

```json
{
  "metadata": {
    "source_file": "original.conversations.json",
    "corrections_applied": 3,
    "correction_rate": 0.015
  },
  "speaker_corrections": [
    {
      "segment_idx": 42,
      "original_time": 78.2,
      "original_speaker": "SPEAKER_01",
      "corrected_speaker": "SPEAKER_02",
      "reason": "Q&A pattern: 'Where are you from?' → 'Chile'",
      "confidence": 0.95
    }
  ],
  "conversations": [
    // Same structure as input, with corrected speaker labels
  ]
}
```

## Usage

```bash
# Single video
./scripts/training-data/07.speaker-correction "source_name" "https://..."

# All sources
./scripts/training-data/07.speaker-correction --sources

# Options
./scripts/training-data/07.speaker-correction --sources --dry-run  # Preview corrections
```

## Processing Approach

**Options:**

1. **Heuristic (fast, no API calls):**
   - Regex pattern matching for question detection
   - Simple speaker label swapping
   - ~0ms per video

2. **LLM-assisted (more accurate):**
   - Use Claude to identify Q&A patterns
   - Higher accuracy for ambiguous cases
   - ~5-10s per video

**Recommendation:** Start with heuristic approach. If accuracy is insufficient, add LLM as optional `--use-llm` flag.

## Quality Targets

- Detection precision: >90% (few false positives)
- Detection recall: >80% (catch most errors)
- Expected correction rate: ~1-2% of dialogue segments in infield videos

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
