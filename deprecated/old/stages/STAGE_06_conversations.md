# Stage 06: Conversations
**Status:** PENDING VERIFICATION - R1 processing complete (5/5 videos)
**Updated:** 04-02-2026 16:45

**Method:** Claude Code Direct Processing (subscription-based, no API credits)

---

## Changelog
- 04-02-2026 16:45: Added "Interspersed Commentary Pattern" - critical rule for compilation videos
- 04-02-2026 16:30: R1 test run complete - all 5/5 videos processed via Claude Code Direct. PENDING VERIFICATION.
- 04-02-2026 14:30: Switched to Claude Code Direct processing (subscription-based, no API costs)
- 04-02-2026 14:17: R1 test run started - 1/5 videos processed
- 04-02-2026: Complete rewrite - removed all heuristics, pure Claude LLM approach

---

## Overview

Detects video type, labels speakers, and identifies conversation boundaries using Claude Code direct processing.

**Architecture:** Claude Code processes each video end-to-end using the subscription (Opus 4.5)

```
User Request: "Process stage 06"
        │
        ▼
┌─────────────────────────────────────────┐
│  CLAUDE CODE (subscription)             │
│                                         │
│  For each video:                        │
│  1. Read input file (chunked)           │
│  2. Classify video type                 │
│  3. Label speakers                      │
│  4. Detect conversation boundaries      │
│  5. Write output JSON                   │
│  6. Update state file                   │
└─────────────────────────────────────────┘
        │
        ▼
Output: *.conversations.json
```

**Handoff:** State file tracks progress. Any Claude session can continue.
See `STAGE_06_PROCESSING.md` for detailed classification criteria.

**State File:** `scripts/training-data/06.conversations-state.json`

---

## Three-Pass Processing

**Architecture:** Three-pass system (same as API approach, but Claude Code direct)

```
Input: *.audio_features.json
           │
           ▼
┌─────────────────────────────────────────────┐
│  PASS 1: Video Type Classification          │
│  Input: title + 15 sample segments          │
│  Output: infield | talking_head | podcast   │
└─────────────────────────────────────────────┘
           │
           ▼ (skip if talking_head/podcast)
┌─────────────────────────────────────────────┐
│  PASS 2: Speaker Labeling                   │
│  Input: first 50 segments                   │
│  Output: SPEAKER_XX → coach/target/other    │
└─────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  PASS 3: Conversation Boundaries            │
│  Input: all segments in 30-segment batches  │
│  Output: segment_type + conversation_id     │
└─────────────────────────────────────────────┘
           │
           ▼
Output: *.conversations.json
```

## Input
- `data/05.audio-features/<source>/<video>/*.audio_features.json`

## Output
- `data/06.conversations/<source>/<video>/`
  - `*.conversations.json` - Video type, speaker labels, conversation boundaries

---

## LLM Classification

### Pass 1: Video Types

| Type | Description | LLM Signals |
|------|-------------|-------------|
| `infield` | Real approaches filmed on street | Live interaction, real responses, incomplete thoughts |
| `talking_head` | Coach speaking to camera | Educational tone, "guys/everyone", no second party |
| `podcast` | Interview/discussion format | Back-and-forth about theory, long turns both speakers |
| `compilation` | Mixed content | Shifts between infield and commentary |

### Pass 2: Speaker Roles

| Role | Description | LLM Signals |
|------|-------------|-------------|
| `coach` | Person teaching/demonstrating | Opens conversations, asks questions, gives compliments |
| `target` | Women being approached | Short responses, gives name when asked |
| `voiceover` | Post-production narration | Instructional, disconnected from action |
| `other` | Background voices | Brief interjections |

### Pass 3: Segment Types

| Type | Description | Conversation ID |
|------|-------------|-----------------|
| `approach` | Part of live interaction | Non-zero (grouped by approach) |
| `commentary` | Coach talking to camera | 0 OR same as surrounding approach* |
| `transition` | Brief marker between sections | 0 |

*See "Interspersed Commentary Pattern" below.

**Boundary Detection:**
- New conversation starts: direct address, change from commentary, previous ended
- Same conversation continues: same thread, Q&A flow, no camera break
- Approach ends: number exchange, goodbye, rejection, pivot to camera

### Interspersed Commentary Pattern (CRITICAL)

**When:** A compilation shows ONE approach in clips with narrator commentary explaining each step.

**Rule:** All segments from first infield clip to last share the SAME `conversation_id`. Use `segment_type` to distinguish infield (`approach`) from narrator (`commentary`).

**Why:** The commentary IS part of the approach context. This maintains contiguity while allowing downstream filtering by `segment_type=approach`.

**Example (video 4x9bvKaVWBc):**
```
seg 14: conv_id=1, type=approach    ← First infield clip
seg 15: conv_id=1, type=approach
seg 16: conv_id=1, type=commentary  ← Narrator explaining
seg 17: conv_id=1, type=commentary
...
seg 58: conv_id=1, type=approach    ← Another infield clip
...
seg 154: conv_id=1, type=approach   ← Last infield clip
seg 155: conv_id=0, type=commentary ← Back to intro/outro
```

**DO NOT** mark each infield clip as a separate conversation - this fragments the approach.

---

## Usage

```bash
# Single source
npx tsx scripts/training-data/06.conversations.ts "source_name"

# Specific file
npx tsx scripts/training-data/06.conversations.ts --input path/to/file.audio_features.json

# All sources
npx tsx scripts/training-data/06.conversations.ts --sources

# Options
npx tsx scripts/training-data/06.conversations.ts --overwrite  # Overwrite existing
npx tsx scripts/training-data/06.conversations.ts --dry-run    # Preview without writing
```

---

## Output Schema

```json
{
  "video_id": "string",
  "source_file": "string",
  "processed_at": "ISO timestamp",

  "video_type": {
    "type": "infield | talking_head | podcast | compilation",
    "confidence": 0.0-1.0,
    "method": "claude_llm",
    "reasoning": "string"
  },

  "speaker_labels": {
    "SPEAKER_00": { "role": "coach", "confidence": 0.9 },
    "SPEAKER_01": { "role": "target", "confidence": 0.8 }
  },

  "segments": [{
    "id": 0,
    "start": 0.0,
    "end": 2.5,
    "text": "string",
    "speaker_id": "SPEAKER_00",
    "speaker_role": "coach",
    "segment_type": "approach | commentary | transition",
    "conversation_id": 1,
    "is_conversation_start": true
  }],

  "conversations": [{
    "conversation_id": 1,
    "segment_ids": [5, 6, 7, 8],
    "start_time": 45.2,
    "end_time": 120.5,
    "opener_type": "compliment"
  }],

  "metadata": {
    "pipeline_version": "string",
    "prompt_version": "string",
    "model_version": "claude-3-5-haiku-20241022",
    "schema_version": "2.0.0",
    "llm_calls": 8,
    "total_input_tokens": 15000,
    "total_output_tokens": 3000
  }
}
```

---

## Cost Estimates

| Video Type | LLM Calls | Est. Cost |
|------------|-----------|-----------|
| talking_head/podcast | 1 | $0.0002 |
| infield (10 min, ~150 segs) | ~8 | $0.01 |
| infield (30 min, ~400 segs) | ~18 | $0.025 |
| **Full pipeline (~966 videos)** | - | **~$9 total** |

---

## Quality Targets

- Video type detection accuracy 95%+
- Speaker labeling accuracy 90%+
- Conversation boundary detection accurate
- Non-infield should have 0 conversations detected (guaranteed by Pass 1)

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Low confidence (<0.6) video type | Default to "compilation" (processes boundaries) |
| Low confidence speaker label | Mark as "other" |
| Low confidence segment type | Default to "commentary" (safer) |
| LLM failure | Retry 3x with exponential backoff |

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING VERIFICATION | - | - | All 5 videos processed. User verification needed. Outputs at `data/test/06.conversations/` |
| R2 | 15 | PENDING | - | - | |

### R1 Results Summary

| Video ID | Title | Type | Conversations |
|----------|-------|------|---------------|
| H3_8iPikhDw | A Basic Daygame Approach | compilation | 1 |
| G2sWa8X0EjA | How To Approach Groups | compilation | 1 |
| 4x9bvKaVWBc | Approach with friends | compilation | 1 |
| WSFSpbFCPZo | Rejected like a BOSS | infield | 5 |
| dz8w8XUBDXU | Purpose/Masculinity | talking_head | 0 |
