# Stage 06: Processing Instructions (Handoff Document)
**Status:** DEPRECATED - See claude_automation.md for updated plan
**Updated:** 04-02-2026

**Purpose:** Enable any Claude session to process Stage 06 (Conversations) using Claude Code direct.

---

## Quick Start

1. Read this document to understand classification criteria
2. Check state file: `scripts/training-data/06.conversations-state.json`
3. Process pending videos following the protocol below
4. Update state file after each video

---

## State File Location

```
scripts/training-data/06.conversations-state.json
```

Check `summary.pending` to see how many videos need processing.

---

## Input/Output Locations

| Mode | Input Directory | Output Directory |
|------|-----------------|------------------|
| test | `data/test/05.audio-features/` | `data/test/06.conversations/` |
| full | `data/05.audio-features/<source>/` | `data/06.conversations/<source>/` |

---

## Processing Protocol

For each pending video:

### Step 1: Read Input File

Read the `*.audio_features.json` file. For large files (>25k tokens), read in chunks:
- First 200 lines for Pass 1 (structure + samples)
- Lines 1-400 for Pass 2 (first 50 segments)
- Full file in 100-segment chunks for Pass 3

Extract from input:
- Video title (from filename, before `[video_id]`)
- Video ID (from filename, inside brackets)
- Total segment count
- Unique speaker IDs (SPEAKER_00, SPEAKER_01, etc.)

### Step 2: Classify Video Type (Pass 1)

Sample 15 segments: first 5, middle 5, last 5.

**Classification Criteria:**

| Type | Signals | Action |
|------|---------|--------|
| `infield` | Live approaches, street environment, real responses from women, nervous energy, interruptions | Continue to Pass 2 & 3 |
| `talking_head` | Single speaker, educational tone, "guys/everyone", no second party responding | Skip Pass 2 & 3, all segments = commentary |
| `podcast` | Multiple speakers discussing topics, interview style, both speakers have long turns | Skip Pass 2 & 3, all segments = commentary |
| `compilation` | Mix of infield + commentary, "as you saw..." breakdowns | Continue to Pass 2 & 3 |

**Decision Format:**
```json
{
  "type": "infield | talking_head | podcast | compilation",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation (max 50 words)"
}
```

**Low Confidence Handling:** If confidence < 0.6, default to `compilation` (safer, processes boundaries).

### Step 3: Label Speakers (Pass 2)

*Skip if video_type is `talking_head` or `podcast`.*

Read first 50 segments. For each unique SPEAKER_XX, determine role:

| Role | Signals |
|------|---------|
| `coach` | Opens conversations ("excuse me", "quick question"), asks personal questions (name, origin), gives compliments, longer confident statements, references teaching ("guys", "as you can see") |
| `target` | Responds to questions with short answers, gives name when asked, laughs/hesitation, typically shorter turns than coach |
| `voiceover` | Perfect sentences, instructional tone disconnected from action, "Notice how...", "Watch what happens..." |
| `other` | Background voices, brief interjections, not involved in approach |

**Decision Format:**
```json
{
  "SPEAKER_00": { "role": "coach", "confidence": 0.95 },
  "SPEAKER_01": { "role": "target", "confidence": 0.8 }
}
```

**Rules:**
- Coach usually has most dialogue
- In typical infield: 1 coach + multiple targets (different women per approach)
- If uncertain, default to `other` with confidence 0.5

### Step 4: Detect Conversation Boundaries (Pass 3)

*Skip if video_type is `talking_head` or `podcast`.*

For each segment, determine:

| Field | Values | Description |
|-------|--------|-------------|
| `segment_type` | `approach` / `commentary` / `transition` | What kind of content |
| `conversation_id` | 0 or 1+ | 0 = non-approach, 1+ = approach number |
| `is_conversation_start` | boolean | True for first segment of new approach |

**Boundary Rules:**

**NEW CONVERSATION STARTS when:**
- Direct address to new person ("excuse me", "sorry", "quick question")
- Change from commentary to interpersonal dialogue
- Location/context shift implied
- Previous approach clearly ended

**SAME CONVERSATION CONTINUES when:**
- Same conversational thread
- Questions followed by relevant answers
- Continuous interaction without camera break

**APPROACH ENDS when:**
- Number exchange ("text you", "send you a message")
- Explicit goodbye
- Rejection ("I have a boyfriend", walking away)
- Coach pivots to camera commentary

**Critical Constraint:** Segments with same conversation_id must be CONTIGUOUS (no gaps).

---

### IMPORTANT: Compilation with Interspersed Commentary Pattern

**Scenario:** A compilation video shows ONE approach in clips, with narrator commentary between each clip explaining what's happening.

**Example:** Video `4x9bvKaVWBc` - narrator (SPEAKER_01) explains each step while infield clips (SPEAKER_02) play.

**CORRECT Approach:**
1. Mark ALL segments from first infield clip to last as the SAME `conversation_id`
2. Use `segment_type` to distinguish:
   - `approach` = actual infield clips (coach talking to women)
   - `commentary` = narrator explaining what's happening
3. This maintains contiguity while preserving semantic meaning

```
Segment 12: conv_id=0, type=commentary  "Let's get..."
Segment 13: conv_id=0, type=commentary  "into it..."
Segment 14: conv_id=1, type=approach    "hey excuse me..." [FIRST INFIELD CLIP]
Segment 15: conv_id=1, type=approach    "was really cute..."
Segment 16: conv_id=1, type=commentary  "to point out is I actually go up..."
Segment 17: conv_id=1, type=commentary  "a way where like I could..."
...
Segment 58: conv_id=1, type=approach    "for tonight or what..." [ANOTHER INFIELD CLIP]
...
Segment 154: conv_id=1, type=approach   "yeah that's why..." [LAST INFIELD CLIP]
Segment 155: conv_id=0, type=commentary "fortunately enough..."
```

**Why this works:**
- The commentary segments ARE part of the approach context - they're explaining the same interaction
- Downstream processing can filter by `segment_type=approach` to get just infield clips
- The `conversation_id` groups all related content together
- Maintains contiguity constraint (no gaps in conv_id sequence)

**WRONG Approach (DO NOT DO):**
- Marking each infield clip as a separate conversation (fragments the approach)
- Marking commentary as conv_id=0 within the approach context (violates contiguity)

---

### Step 5: Assemble Output

Create `*.conversations.json` with this structure:

```json
{
  "video_id": "H3_8iPikhDw",
  "source_file": "path/to/input.audio_features.json",
  "processed_at": "2026-02-04T14:30:00Z",

  "video_type": {
    "type": "compilation",
    "confidence": 0.85,
    "method": "claude_code_direct",
    "reasoning": "Educational intro + infield approaches + coaching outro"
  },

  "speaker_labels": {
    "SPEAKER_00": { "role": "coach", "confidence": 0.95 },
    "SPEAKER_01": { "role": "target", "confidence": 0.8 }
  },

  "segments": [
    {
      "id": 0,
      "start": 6.46,
      "end": 8.918,
      "text": "Welcome back to another natural game video.",
      "speaker_id": "SPEAKER_00",
      "speaker_role": "coach",
      "segment_type": "commentary",
      "conversation_id": 0,
      "is_conversation_start": false
    }
  ],

  "conversations": [
    {
      "conversation_id": 1,
      "segment_ids": [15, 16, 17, 18, 19],
      "start_time": 45.2,
      "end_time": 120.5
    }
  ],

  "metadata": {
    "pipeline_version": "06.conversations-v2-claude-direct",
    "prompt_version": "1.0.0",
    "model_version": "claude_code_direct",
    "schema_version": "2.0.0",
    "input_checksum": "computed_from_input",
    "llm_calls": 0,
    "total_input_tokens": 0,
    "total_output_tokens": 0
  }
}
```

### Step 6: Update State File

After writing output, update state file:
- Set video status to `complete`
- Set `processed_at` timestamp
- Update summary counts

---

## Quality Targets

- Video type detection: 95%+ accuracy
- Speaker labeling: 90%+ accuracy
- Conversation boundaries: Accurately grouped
- Non-infield videos: 0 conversations (guaranteed by Pass 1)

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Can't determine video type | Default to `compilation`, note uncertainty |
| Unknown speaker pattern | Assign `other` role |
| Ambiguous segment | Default to `commentary` (safer) |
| File read error | Mark as `failed` in state, continue to next |

---

## Verification Checklist

Before marking a video complete, verify:
- [ ] All segments have classification (no nulls)
- [ ] Conversation IDs are sequential (1, 2, 3...)
- [ ] Segments in same conversation are contiguous
- [ ] Non-infield videos have 0 conversations
- [ ] Output file is valid JSON
- [ ] State file updated

---

## Example: Processing a Video

```
User: Process video H3_8iPikhDw

Claude:
1. Reads data/test/05.audio-features/A Basic Daygame... [H3_8iPikhDw].audio_features.json
2. Extracts: 139 segments, speakers SPEAKER_00, SPEAKER_01, UNKNOWN
3. Samples 15 segments, classifies as "compilation" (0.85)
4. Labels speakers: SPEAKER_00=coach, SPEAKER_01=target, UNKNOWN=other
5. Processes all 139 segments for boundaries
6. Writes data/test/06.conversations/A Basic Daygame... [H3_8iPikhDw].conversations.json
7. Updates state file: H3_8iPikhDw status=complete
```

---

## Changelog

- 04-02-2026 16:45: Added "Compilation with Interspersed Commentary" pattern - critical for preventing drift
- 04-02-2026: Created handoff document for Claude Code direct processing
