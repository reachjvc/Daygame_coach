# Training Data Pipeline Validation Plan

**Purpose**: Step-by-step guide to validate and improve the training data pipeline before updating TRAINING_DATA.md.

**For Claude**: This document is designed so a new Claude instance can implement the improvements. Follow each section in order, complete the validation, and document findings before moving to implementation.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Test Video Selection](#2-test-video-selection)
3. [Manual Ground Truth Creation](#3-manual-ground-truth-creation)
4. [Pipeline Execution & Comparison](#4-pipeline-execution--comparison)
5. [Gap Analysis](#5-gap-analysis)
6. [Implementation Plan](#6-implementation-plan)
7. [Validation Criteria](#7-validation-criteria)

---

## 1. Current State Analysis

### 1.1 Known Issues (from preliminary review)

Based on analysis of `SocialStoic/Are You Making THIS Mistake When Approaching Women？ (Infield Examples)`:

| Issue | Description | Impact |
|-------|-------------|--------|
| **Single interaction detected** | Video has 6+ distinct approaches, but pipeline found only 1 interaction spanning 60s-504s | Chunks span multiple unrelated conversations |
| **Poor speaker classification** | Most segments labeled "voiceover" or "unknown" instead of "coach" vs "girl" | Cannot filter coach examples from girl responses |
| **No conversation boundaries** | Pipeline doesn't detect when one approach ends and another begins | RAG retrieves mixed context |
| **Phase detection incomplete** | Only OPENER phase reliably detected; HOOK/VIBE/CLOSE often missed | Cannot retrieve phase-specific examples |

### 1.2 Current Pipeline Flow

```
download_channel.sh → transcribe_channel.sh → classify_content.py →
batch_extract_features.sh → classify_speakers.py → classify_tonality.py →
extract_interactions.py → generate_training_data.py → ingest.ts
```

### 1.3 Files to Examine

Before implementing changes, read and understand:

1. `scripts/extract_interactions.py` - Interaction boundary detection
2. `scripts/classify_speakers.py` - Speaker classification (pitch-based)
3. `scripts/classify_content.py` - Content type classification
4. `scripts/ingest.ts` - Chunking and embedding logic

---

## 2. Test Video Selection

### 2.1 Selected Test Videos

| # | Video | Playlist | Type | Expected Interactions |
|---|-------|----------|------|----------------------|
| 1 | `Are You Making THIS Mistake When Approaching Women？ (Infield Examples).txt` | SocialStoic | Mixed (infield + commentary) | 6+ approaches |
| 2 | `5 Easy, No B.S. Ways To Approach Women In The Street (+ Infield Demonstration).txt` | NaturalLifestyles-Infield | Infield-heavy | 5+ approaches |
| 3 | `10 Things You should know before taking Psychedelic Drugs! Shae Matthews Quality Talk.txt` | NaturalLifestyles-InnerGrowth | Talking-head only | 0 approaches (theory only) |

### 2.2 Why These Videos

- **Video 1**: Multiple approaches with coach commentary interspersed - tests conversation boundary detection
- **Video 2**: Title suggests 5+ approaches - tests multi-interaction extraction
- **Video 3**: Pure talking-head - should correctly classify as THEORY with no interactions

---

## 3. Manual Ground Truth Creation

### 3.1 Instructions for Human Validation

For each test video, Jonas should create a ground truth file documenting:

```
training-data/validation/
├── video1_ground_truth.json
├── video2_ground_truth.json
└── video3_ground_truth.json
```

### 3.2 Ground Truth Schema

```json
{
  "video_title": "Are You Making THIS Mistake...",
  "source_playlist": "SocialStoic",
  "content_type": "mixed",  // "infield", "talking_head", "mixed"

  "interactions": [
    {
      "id": 1,
      "start_time_approx": "0:00",
      "end_time_approx": "0:28",
      "phases": {
        "opener": { "start": "0:00", "end": "0:05" },
        "hook": { "start": "0:05", "end": "0:10" },
        "vibe": { "start": "0:10", "end": "0:25" },
        "close": null
      },
      "outcome": "unknown",
      "notable_moments": [
        { "time": "0:03", "type": "qualification", "description": "Coach asks what she does" }
      ],
      "topics_mentioned": ["flexibility", "rewards/points game"],
      "techniques_used": ["push-pull", "qualification"]
    },
    {
      "id": 2,
      "type": "commentary",
      "start_time_approx": "0:28",
      "end_time_approx": "1:00",
      "description": "Coach explains front stop vs side stop"
    }
  ],

  "speaker_segments": [
    { "start": "0:00", "end": "0:02", "speaker": "coach", "text_preview": "Oh, so you're like super flexible" },
    { "start": "0:02", "end": "0:03", "speaker": "girl", "text_preview": "Kind of, yeah" }
  ]
}
```

### 3.3 Ground Truth for Video 1 (Pre-filled from transcript analysis)

Based on reading the transcript, here's the expected structure:

**Interactions detected in transcript:**

1. **Interaction 1** (lines 1-6): Opening teaser/cold open
   - Coach teases about flexibility, green flag, points game
   - Girl responds positively
   - Techniques: qualification, reward frame

2. **Commentary 1** (lines 7-47): Front stop explanation
   - Adam explains front stop vs side stop
   - Pure talking-head

3. **Interaction 2** (lines 20-28): Redhead approach (within commentary)
   - "Excuse me. Two seconds." opener
   - Compliment on red hair, green eyes
   - No close shown

4. **Interaction 3** (lines 48-66): Drawing girl
   - Vibing about drawing, hands
   - She says she wants humor in a man
   - Techniques: kino (hands), qualification

5. **Interaction 4** (lines 68-166): German girl (longest)
   - Full approach: opener → vibe → instagram → number attempt → instant date attempt
   - Topics: tattoos, gym, height, WhatsApp
   - Outcome: Number close + instant date attempt
   - Techniques: push-pull, cold read (height), qualification

6. **Commentary 2** (lines 168-182): Review of German approach

7. **Interaction 5** (lines 183-198): Failed side stop demos
   - Multiple quick blowouts
   - "No, I don't want to" rejection

8. **Interaction 6** (lines 211-225): Walking offer side stop
   - Girl offers to walk with him
   - He declines (demonstration)

9. **Interaction 7** (lines 248-269): Scandinavian girl
   - Short interaction
   - She confirms front stop is better

10. **Interaction 8** (lines 324-350): Various front stop demos
    - Quick successful stops

11. **Interaction 9** (lines 352-462): Brazilian girl (instant date)
    - Full approach with instant date to coffee
    - Topics: Brazil, Colombia trip, tourism
    - Outcome: Instant date + number
    - Techniques: cold read (age), push-pull

12. **Commentary 3** (lines 466-489): Summary and CTA

**Total: 9+ distinct interactions, 3 commentary sections**

---

## 4. Pipeline Execution & Comparison

### 4.1 Run Current Pipeline on Test Videos

```bash
# Ensure clean state for test videos
rm -f training-data/features/SocialStoic/"Are You Making THIS Mistake"*
rm -f training-data/interactions/SocialStoic/"Are You Making THIS Mistake"*

# Run pipeline on single video (if script supports it)
./scripts/process_channel.sh "SocialStoic"

# Or run individual steps:
python scripts/classify_content.py \
  --input "training-data/transcripts/SocialStoic/Are You Making THIS Mistake When Approaching Women？ (Infield Examples).json" \
  --output "training-data/classified/SocialStoic/"

python scripts/classify_speakers.py \
  --input "training-data/features/SocialStoic" \
  --output "training-data/features/SocialStoic"

python scripts/extract_interactions.py \
  --input "training-data/features/SocialStoic" \
  --output "training-data/interactions/SocialStoic"
```

### 4.2 Compare Pipeline Output to Ground Truth

Create comparison script:

```python
# scripts/validate_extraction.py
"""
Compares pipeline output against ground truth.
Reports: precision, recall, phase accuracy, speaker accuracy.
"""

import json
import argparse
from pathlib import Path

def load_ground_truth(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)

def load_pipeline_output(interactions_path: Path) -> list:
    interactions = []
    with open(interactions_path) as f:
        for line in f:
            if line.strip():
                interactions.append(json.loads(line))
    return interactions

def compare(ground_truth: dict, pipeline_output: list) -> dict:
    gt_interactions = [i for i in ground_truth["interactions"] if i.get("type") != "commentary"]

    return {
        "ground_truth_count": len(gt_interactions),
        "pipeline_count": len(pipeline_output),
        "interaction_recall": len(pipeline_output) / max(len(gt_interactions), 1),
        # Add more metrics...
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ground-truth", required=True)
    parser.add_argument("--pipeline-output", required=True)
    args = parser.parse_args()

    gt = load_ground_truth(Path(args.ground_truth))
    po = load_pipeline_output(Path(args.pipeline_output))

    results = compare(gt, po)
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
```

### 4.3 Expected Comparison Results (Current Pipeline)

| Metric | Ground Truth | Current Pipeline | Gap |
|--------|--------------|------------------|-----|
| Interactions detected | 9+ | 1 | -8 |
| Speaker accuracy | N/A | ~30% (most "unknown") | -70% |
| Phase transitions | 4 per interaction | 1 (opener only) | -3 |
| Commentary correctly excluded | 3 sections | 0 (all merged) | -3 |

---

## 5. Gap Analysis

### 5.1 Root Cause: Interaction Boundary Detection

**Current logic** (`extract_interactions.py` lines 123-136):
- Looks for opener patterns ("excuse me", "I just saw you", etc.)
- Only starts new interaction if there's a "conversation break" (>3s gap or transition segment)

**Problem**:
- Conversation breaks between approaches are often <3 seconds
- Coach commentary isn't reliably detected as "transition"
- Multiple approaches get merged into one giant interaction

**Solution needed**:
- Use LLM to identify conversation boundaries
- Add patterns for "end of approach" (walking away, number exchange, etc.)
- Detect commentary sections by speaker pitch + content patterns

### 5.2 Root Cause: Speaker Classification

**Current logic** (`classify_speakers.py` lines 25-77):
- Uses pitch thresholds: <140Hz = male, >220Hz = female
- Uses brightness, pitch variability as secondary signals

**Problem**:
- Whisper segments don't always have good audio features
- Coach doing "voiceover" commentary has different acoustics than coach doing infield
- Many segments get classified as "unknown" or "voiceover"

**Solution needed**:
- Use text content to help classify (questions → likely coach, short responses → likely girl)
- Use conversation structure (alternating speakers)
- Consider speaker diarization (pyannote-audio) for better audio-based separation

### 5.3 Root Cause: Phase Detection

**Current logic** (`extract_interactions.py` lines 210-232):
- OPENER: detected by opener patterns
- HOOK: when girl gives >5 word response
- VIBE: when girl asks a question or gives >10 word response
- CLOSE: when close patterns detected

**Problem**:
- Phases depend on accurate speaker classification (which fails)
- No detection of qualification, push-pull, or other micro-phases
- No outcome detection refinement

**Solution needed**:
- Use LLM to classify phases based on content
- Add technique detection patterns
- Use semantic understanding for phase transitions

---

## 6. Implementation Plan

### Phase 1: Conversation Boundary Detection (Critical)

**Goal**: Correctly identify where one approach ends and another begins.

**Implementation**:

1. Create `scripts/detect_conversations.py`:
   ```python
   """
   Uses LLM (Ollama) to identify conversation boundaries in transcripts.

   Input: Whisper JSON with segments
   Output: Same JSON with `conversation_id` added to each segment
   """

   PROMPT = """
   Analyze this transcript segment and determine if it's:
   1. Part of an ongoing conversation (approach)
   2. Start of a NEW conversation (new approach)
   3. Commentary/talking-head (coach talking to camera)

   Context: This is a daygame video where a coach approaches women on the street.

   Previous segment: {prev_text}
   Current segment: {curr_text}
   Next segment: {next_text}

   Respond with JSON:
   {
     "segment_type": "approach" | "commentary" | "transition",
     "is_new_conversation": true | false,
     "confidence": 0.0-1.0,
     "reasoning": "brief explanation"
   }
   """
   ```

2. Run conversation detection BEFORE feature extraction

3. Update `extract_interactions.py` to use `conversation_id` instead of heuristics

**Validation**: Re-run on test videos, expect 8+ interactions detected for Video 1.

### Phase 2: Enhanced Speaker Classification

**Goal**: Accurately label coach vs girl in each segment.

**Implementation**:

1. Update `scripts/classify_speakers.py` to use hybrid approach:
   - Audio features (pitch, brightness) - existing
   - Text features (question patterns, response length) - new
   - Conversation structure (alternating speakers) - new

2. Add text-based heuristics:
   ```python
   def classify_by_text(text: str, prev_speaker: str) -> str:
       # Coach patterns
       coach_patterns = [
           r"^(excuse me|hey|two seconds)",  # openers
           r"(what's your name|where are you from|what do you do)",  # questions
           r"(i like|i noticed|you look)",  # statements of intent
           r"(let me|why don't you|we should)",  # leading statements
       ]

       # Girl patterns
       girl_patterns = [
           r"^(yeah|yes|no|maybe|kind of|thank you)",  # short responses
           r"^(i'm|i am|i work|i study)",  # self-descriptions
           r"^(really|oh wow|that's)",  # reactions
       ]

       # Check patterns and use alternation as tiebreaker
   ```

3. Consider adding `pyannote-audio` for diarization:
   ```bash
   pip install pyannote.audio
   ```
   - Requires HuggingFace token (free)
   - Run diarization first, then align with Whisper segments

**Validation**: Expect >80% speaker accuracy on test videos.

### Phase 3: LLM-Based Semantic Tagging

**Goal**: Extract topics, techniques, and semantic metadata from each chunk.

**Implementation**:

1. Create `scripts/tag_semantics.py`:
   ```python
   """
   Uses Ollama to extract semantic tags from transcript chunks.

   Tags extracted:
   - topics: ["career", "hobby", "origin", "relationship_status", ...]
   - topic_values: {"career": "medicine", "origin": "Germany", ...}
   - techniques: ["push_pull", "qualification", "cold_read", ...]
   - phase: "opener" | "hook" | "vibe" | "close"
   """

   PROMPT = """
   Analyze this conversation segment from a daygame approach.

   Segment:
   {text}

   Extract:
   1. Topics discussed (career, hobby, origin, age, relationship, appearance, etc.)
   2. Specific values for topics (e.g., career: medicine, origin: Brazil)
   3. Techniques used by coach (from list: push_pull, qualification, cold_read,
      tease, role_play, statement_of_intent, false_time_constraint, assumptive_close,
      disqualification, kino, reward_frame)
   4. Phase of approach (opener, hook, vibe, close)
   5. Any patterns that seem interesting but don't fit categories (for later review)

   Respond with JSON only.
   """
   ```

2. Run after speaker classification, before chunking

3. Store tags in segment metadata, propagate to chunks during ingest

**Validation**: Spot-check 20 chunks manually for tag accuracy.

### Phase 4: Phase-Based Chunking

**Goal**: Create chunks that respect conversation boundaries and phases.

**Implementation**:

1. Update `scripts/ingest.ts` chunking logic:
   ```typescript
   function chunkByPhase(segments: Segment[]): Chunk[] {
     const chunks: Chunk[] = [];
     let currentChunk: Segment[] = [];
     let currentPhase = segments[0]?.phase || "unknown";
     let currentConversation = segments[0]?.conversation_id || 0;

     for (const segment of segments) {
       const phaseChanged = segment.phase !== currentPhase;
       const conversationChanged = segment.conversation_id !== currentConversation;
       const chunkTooLong = getChunkLength(currentChunk) > MAX_CHUNK_SIZE;

       if (conversationChanged || (phaseChanged && currentChunk.length > 0) || chunkTooLong) {
         // Save current chunk
         chunks.push(createChunk(currentChunk, currentPhase, currentConversation));
         currentChunk = [];
       }

       currentChunk.push(segment);
       currentPhase = segment.phase;
       currentConversation = segment.conversation_id;
     }

     // Don't forget last chunk
     if (currentChunk.length > 0) {
       chunks.push(createChunk(currentChunk, currentPhase, currentConversation));
     }

     return chunks;
   }
   ```

2. Allow variable chunk sizes (respect phase boundaries even if <200 chars)

3. Add chunk metadata:
   - `phase`: opener, hook, vibe, close, commentary
   - `conversation_id`: links chunks from same approach
   - `interaction_outcome`: propagated from interaction extraction

**Validation**: Verify chunks don't span multiple conversations or phases.

### Phase 5: Source Configuration & Folder Restructure

**Goal**: Support playlist-level metadata and nested folder structure.

**Implementation**:

1. Create `training-data/sources.yaml`:
   ```yaml
   NaturalLifestyles:
     Infield:
       url: https://youtube.com/playlist?list=...
       type: coach_infield
       weight: 1.0
       coaches: ["James Marshall", "Liam McRae", "Shae Matthews"]

     Students:
       url: https://youtube.com/playlist?list=...
       type: student_infield
       commentary_by: coach
       weight: 0.7

     InnerGrowth:
       url: https://youtube.com/playlist?list=...
       type: talking_head
       weight: 0.8

   SocialStoic:
     Main:
       url: https://youtube.com/@SocialStoic/videos
       type: mixed
       weight: 1.0
       coaches: ["Adam"]
   ```

2. Update folder structure:
   ```
   training-data/
   ├── NaturalLifestyles/
   │   ├── Infield/
   │   │   ├── raw/
   │   │   ├── transcripts/
   │   │   ├── features/
   │   │   └── interactions/
   │   ├── Students/
   │   │   └── ...
   │   └── InnerGrowth/
   │       └── ...
   └── SocialStoic/
       └── Main/
           └── ...
   ```

3. Update all scripts to read from `sources.yaml` and use nested paths

**Note**: This is a breaking change. Migrate existing data or start fresh.

### Phase 6: Speaker Audio Separation (Voice-to-Voice Prep)

**Goal**: Store timestamps for coach/girl audio for future voice model training.

**Implementation**:

1. After speaker classification, create speaker timeline:
   ```json
   {
     "video": "video_name.opus",
     "speakers": {
       "coach": [
         {"start": 0.0, "end": 2.5},
         {"start": 5.0, "end": 8.2},
         ...
       ],
       "girl": [
         {"start": 2.5, "end": 5.0},
         ...
       ]
     }
   }
   ```

2. Store in `training-data/{channel}/{playlist}/speaker_timelines/{video}.speaker.json`

3. Create extraction script for future use:
   ```bash
   # scripts/extract_speaker_audio.sh
   # Extracts coach-only or girl-only audio clips using ffmpeg
   ffmpeg -i input.opus -af "aselect='..." -output coach_only.opus
   ```

**Validation**: Spot-check 5 videos to verify timeline accuracy.

### Phase 7: Pattern Discovery & Review Queue

**Goal**: Flag interesting patterns for human review and future categorization.

**Implementation**:

1. During semantic tagging, ask LLM to note "uncategorized patterns":
   ```python
   PROMPT += """
   6. Any recurring patterns you notice that don't fit the technique categories:
      - Describe what you observe
      - Note if you've seen similar patterns in other segments
   """
   ```

2. Store in `training-data/patterns_to_review.jsonl`:
   ```json
   {
     "pattern_description": "Coach uses '10 points' reward game",
     "occurrences": [
       {"video": "...", "timestamp": "0:03", "text": "If you get 10 points..."}
     ],
     "suggested_category": "reward_frame",
     "confidence": 0.6,
     "reviewed": false
   }
   ```

3. Create review interface (or just manual JSONL editing for now)

4. Periodically promote reviewed patterns to official techniques list

---

## 7. Validation Criteria

### 7.1 Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Interactions per video (multi-approach) | 1 | 8+ | Compare to ground truth |
| Speaker accuracy | ~30% | >80% | Sample 100 segments |
| Phase accuracy | ~20% | >70% | Compare to ground truth |
| Commentary correctly excluded | 0% | >90% | Count misclassified chunks |
| Chunk boundary quality | N/A | No cross-conversation | Manual review |

### 7.2 Regression Tests

After each phase, verify:

1. **Video 1** (mixed): 8+ interactions detected
2. **Video 2** (infield): 5+ interactions detected
3. **Video 3** (talking-head): 0 interactions, all marked as THEORY

### 7.3 Final Validation

Before updating TRAINING_DATA.md:

1. Run full pipeline on all 3 test videos
2. Compare outputs to ground truth
3. All metrics meet targets
4. Jonas reviews and approves sample outputs

---

## 8. Implementation Order

```
1. Conversation Boundary Detection (blocks everything)
   ↓
2. Enhanced Speaker Classification (parallel with 1)
   ↓
3. LLM Semantic Tagging (after 1 & 2 complete)
   ↓
4. Phase-Based Chunking (after 3)
   ↓
5. Source Config & Folder Restructure (can be parallel)
   ↓
6. Speaker Audio Separation (after 2)
   ↓
7. Pattern Discovery (after 3)
```

---

## 9. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `scripts/detect_conversations.py` | LLM-based conversation boundary detection |
| `scripts/tag_semantics.py` | LLM-based topic/technique extraction |
| `scripts/validate_extraction.py` | Compare pipeline output to ground truth |
| `scripts/extract_speaker_audio.sh` | Extract speaker-separated audio clips |
| `training-data/sources.yaml` | Playlist configuration with metadata |
| `training-data/techniques.json` | Official techniques taxonomy |
| `training-data/patterns_to_review.jsonl` | Uncategorized patterns queue |
| `training-data/validation/*.json` | Ground truth files for test videos |

### Modified Files

| File | Changes |
|------|---------|
| `scripts/classify_speakers.py` | Add text-based classification |
| `scripts/extract_interactions.py` | Use conversation_id from detection |
| `scripts/ingest.ts` | Phase-based chunking |
| `scripts/download_channel.sh` | Support nested folder structure |
| `scripts/process_channel.sh` | Add new pipeline steps |
| `scripts/full_pipeline.sh` | Integrate all new steps |

---

## 10. Next Steps for Claude

When implementing this plan:

1. **Read this entire document first**
2. **Start with Phase 1** (Conversation Boundary Detection) - it's the critical blocker
3. **Create ground truth file** for Video 1 based on Section 3.3
4. **Test incrementally** - run validation after each phase
5. **Document findings** in this file as you go
6. **Update TRAINING_DATA.md** only after all validations pass

---

*Last updated: 2026-01-21*
*Status: Ready for implementation*
