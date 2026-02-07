# Chunking Plan (Stage 09)

Created: 2024-02-06
Updated: 2026-02-06
Status: COMPLETE - All decisions (1-8) decided and implemented.

> **FOR NEW CLAUDE**:
> - All decisions (1-8) are DECIDED and IMPLEMENTED
> - Ready to run Stage 09 on data
> - Keep ASCII updated with any Stage 09 changes

---

## Context for New Claude Session

**Project**: Daygame coaching app with RAG-based Q&A. Users ask questions, system retrieves relevant chunks from training videos, LLM answers using retrieved context.

**Pipeline Overview** (scripts/training-data/):
```
01.download → 02.transcribe → 03.align → 04.diarize → 05.audio-features
    → 06.video-type (LLM: speaker roles, video type, conversation boundaries)
    → 06b.verify → 06c.patch
    → 07.content (LLM: enriches with techniques, topics, phases)
    → 08.taxonomy-validation
    → 09.chunk-embed (THIS STAGE - chunk and embed for RAG)
    → 10.ingest (to Supabase)
```

**Key Data Structure** (from Stage 07 enriched files):
- `video_type`: infield/talking_head/podcast/compilation + confidence
- `transcript_confidence`: 1-100 score (NEW - just added)
- `speaker_labels`: {SPEAKER_XX: {role, confidence}}
- `segments`: [{text, speaker_role, conversation_id, phase, ...}]
- `enrichments`: [{techniques_used, topics_discussed, turn_phases, hook_point, investment_level}]

**Current Retrieval** (src/qa/retrieval.ts):
- Vector similarity search with topK=8
- Lexical overlap reranking
- `isRealExample` bonus (real interactions score higher)
- Diversity caps per source/coach

**Goal of Stage 09**: Create high-quality chunks with confidence metadata so retrieval can weight results appropriately.

**Instructions**: Continue asking the user about pending decisions (2-8) sequentially. After each answer, update this doc. When all decisions made, implement Stage 09.

---

## Summary of Changes Made

### Stage 06 Updated (transcript_confidence)
- Added 4th task to LLM prompt: "Assess transcript quality"
- Prompt version: 3.1.0 → 3.2.0
- Schema version: 3.1.0 → 3.2.0
- New output field: `transcript_confidence: { score: 1-100, reasoning: "..." }`
- Files modified:
  - `scripts/training-data/06.video-type`
  - `scripts/training-data/schemas/conversations.schema.json`

### Stage 09 Updated (parent references + hybrid chunking)
- Added deterministic `videoId` generation (MD5 of channel/videoStem, 12 chars)
- Added parent reference fields to ChunkMetadata: `videoId`, `videoType`, `channel`
- Enables sibling chunk retrieval for "give me full conversation" queries
- Files modified:
  - `scripts/training-data/09.chunk-embed.ts`
  - `docs/pipeline/ASCII`

### Stage 09 Updated (problematicReason flagging - Decision 5)
- Added `SpeakerLabel`, `SpeakerLabels` types
- Added `problematicReason?: string[]` to `ChunkMetadata`
- Added `assessSegmentsForProblems()` function
- Flags: `speaker_role` in [collapsed, mixed/unclear, unknown], or `confidence < 0.7`
- Updated `chunkInteractionByPhase()` to assess per-chunk segments
- Updated `chunkCommentaryText()` to assess source segments
- Files modified: `scripts/training-data/09.chunk-embed.ts`

### Stage 06 Updated (teaser detection - Decision 7)
- Added 5th LLM task to prompt: "Identify teaser/preview segments"
- Version bump: 3.2.0 → 3.3.0
- New segment fields: `is_teaser`, `teaser_of_conversation_id`
- Files modified: `scripts/training-data/06.video-type`, `scripts/training-data/schemas/conversations.schema.json`

### Stage 09 Updated (teaser skipping - Decision 7)
- Added `is_teaser`, `teaser_of_conversation_id` to ContentSegment type
- Filter out teaser segments before chunking
- Logs skipped teaser count
- Files modified: `scripts/training-data/09.chunk-embed.ts`

### Stage 09 Updated (metadata prefix + investmentLevel - Decision 4)
- Added `buildMetadataPrefix(phase, techniques, topics)` function
- Prepends `[PHASE: ...] [TECH: ...] [TOPIC: ...]` prefix to chunk content before embedding
- Added `investmentLevel` to ChunkMetadata (extracted from enrichment's `investment_level`)
- Files modified: `scripts/training-data/09.chunk-embed.ts`

---

## Decision 1: Confidence Handling

**Choice**: LLM-assessed transcript confidence (1-100) at video level, propagated to chunks

**Rationale**:
- Whisper confidence measures acoustic certainty, not semantic coherence
- Stage 06 LLM already reads full transcript to assign speaker roles
- LLM can assess if transcript "makes sense" as a conversation
- Catches issues Whisper misses: hallucination loops, nonsense, garbled text

**Implementation**:
- Stage 06 now outputs `transcript_confidence.score` (1-100)
- Stage 09 will compute per-chunk confidence by aggregating:
  - `transcript_confidence.score` (video-level transcript quality)
  - `speaker_labels[X].confidence` (per-speaker role confidence)
  - `video_type.confidence` (video classification confidence)
  - `verification_verdict` penalty (FLAG=-10, REJECT=skip entirely)
  - Presence of `speaker_role_override` or `collapsed` speakers

**Chunk confidence formula** (to implement in Stage 09):
```python
def compute_chunk_confidence(chunk_segments, video_data):
    # Base: transcript quality (most important)
    base = video_data["transcript_confidence"]["score"]

    # Speaker confidence for segments in this chunk
    speaker_confs = []
    for seg in chunk_segments:
        speaker_id = seg["speaker_id"]
        speaker_conf = video_data["speaker_labels"].get(speaker_id, {}).get("confidence", 0.5)
        speaker_confs.append(speaker_conf)
    avg_speaker_conf = mean(speaker_confs) * 100  # Scale to 0-100

    # Penalties
    video_type_penalty = (1 - video_data["video_type"]["confidence"]) * 10

    verdict = video_data.get("metadata", {}).get("upstream_verification_verdict", "APPROVE")
    verdict_penalty = {"APPROVE": 0, "FLAG": 10, "REJECT": 999}[verdict]

    # Count problematic segments (collapsed, mixed/unclear)
    problematic = sum(1 for seg in chunk_segments
                      if seg.get("speaker_role") in ["collapsed", "mixed/unclear", "unknown"])
    problematic_penalty = (problematic / len(chunk_segments)) * 20

    # Combined score
    chunk_conf = base * 0.6 + avg_speaker_conf * 0.4 - video_type_penalty - verdict_penalty - problematic_penalty
    return max(1, min(100, round(chunk_conf)))
```

**Exception**: Videos with `verification_verdict = "REJECT"` are not embedded at all.

---

## Decision 2: IMPLEMENTED - Chunking Strategy for Interactions

**Choice**: Option C (Hybrid) with parent references

**Strategy**:
- Phase-primary chunking (preserves semantic meaning)
- Merge tiny phases (<100 chars) with adjacent
- Split huge phases (>2000 chars) on turn boundaries
- Add parent references for sibling retrieval

**Parent References** (implemented in Stage 09):
```typescript
metadata: {
  videoId: string      // MD5(channel/videoStem).slice(0,12)
  videoType: string    // infield/talking_head/etc
  channel: string      // Source channel
  conversationId?: number  // Approach number within video
}
```

**Enables**: Retrieval can fetch sibling chunks via `videoId + conversationId` for full conversation context when Claude needs it.

**Files modified**: `scripts/training-data/09.chunk-embed.ts`, `docs/pipeline/ASCII`

---

## Decision 3: DECIDED - Chunk Size Parameters

**Choice**: Keep current `chunkSize=1500`, `chunkOverlap=150`

**Rationale**:
- nomic-embed-text has 8192 token context - 1500 chars (~375 tokens) well within limits
- Leaves room for metadata prefix (Decision 4)
- Phase-based chunks naturally average 800-2000 chars
- 10% overlap catches boundary context without bloating storage
- No evidence of retrieval problems with current size

**Revisit if**: Testing shows retrieval missing context (→ increase) or returning irrelevant matches (→ decrease)

---

## Decision 4: IMPLEMENTED - Text Format in Chunks

**Choice**: Option B - Metadata prefix

**Prefix format:**
```
[PHASE: pre_hook] [TECH: cold_read, qualification] [TOPIC: career, ambition]
Coach: You look like you study something creative...
Girl: Haha no, medicine actually
```

**In prefix (semantic matching):**
- `phase` - helps "opening examples" queries
- `techniques` - helps "cold reading examples" queries
- `topics` - helps "what if she studies medicine" queries

**Add to ChunkMetadata (filtering only, NOT prefix):**
- `investmentLevel` - from Stage 07's `investment_level`

**NOT in prefix:**
- videoType, channel, videoId, confidence - use for filtering/ranking, not semantic matching

**Note**: `outcome` (number_close, instant_date, etc.) would be useful but is NOT generated in current Stage 07. Would require Stage 07 prompt changes - out of scope for now.

**Implementation**:
- Added `buildMetadataPrefix(phase, techniques, topics)` function
- Prefix prepended to chunk content before embedding
- Added `investmentLevel` to ChunkMetadata (extracted from enrichment's `investment_level`)
- Files modified: `scripts/training-data/09.chunk-embed.ts`

---

## Decision 5: IMPLEMENTED - Metadata Schema & Quality Flagging

**Choice**: Add `problematicReason` field to flag chunks with quality issues.

**Rationale**: User wanted to "eat around the rotten part" - use good chunks but flag problematic ones so retrieval can filter/deprioritize.

**Implementation**:
- Added `problematicReason?: string[]` to `ChunkMetadata`
- Chunks containing segments with issues get flagged with specific reasons
- Retrieval can filter or deprioritize flagged chunks

**What triggers flagging** (per-segment, propagated to chunk):
| Condition | Flag format |
|-----------|-------------|
| `speaker_role` in [collapsed, mixed/unclear, unknown] | `speaker_role:collapsed` |
| `speaker_labels[id].confidence < 0.7` | `low_speaker_conf:SPEAKER_01:0.45` |

**Contamination handling**: Only flag chunks that directly contain problematic segments (not adjacent chunks from overlap).

**Current metadata** (all decisions implemented):
```typescript
{
  segmentType: "INTERACTION" | "COMMENTARY"
  isRealExample: boolean
  chunkIndex: number
  totalChunks: number
  conversationId?: number
  phase?: string
  techniques?: string[]
  topics?: string[]
  investmentLevel?: string    // from Decision 4
  videoId: string             // from Decision 2
  videoType: string           // from Decision 2
  channel: string             // from Decision 2
  problematicReason?: string[]  // from Decision 5
}
```

**Files modified**: `scripts/training-data/09.chunk-embed.ts`

---

## Decision 6: DECIDED - Quality Filtering

**Choice**: Embed all, filter at retrieval

**Rationale**: More flexibility - can adjust filtering thresholds without re-embedding. Storage cost is acceptable.

**Exception**: Videos with `verification_verdict = "REJECT"` are still skipped entirely (from Decision 1).

**Implementation**: No code changes needed for Stage 09. Retrieval (src/qa/retrieval.ts) will use `problematicReason` to filter/deprioritize.

---

## Decision 7: IMPLEMENTED - Deduplication (Teaser Detection)

**Choice**: Stage 06 LLM detects teasers, Stage 09 skips them.

**Implementation**:

**Stage 06 changes** (v3.2 → v3.3):
- Added 5th LLM task: "Identify teaser/preview segments"
- New segment fields: `is_teaser`, `teaser_of_conversation_id`
- Updated schema to v3.3.0

**Stage 09 changes**:
- Filters out `is_teaser: true` segments before chunking
- Logs count of skipped teaser segments

**What qualifies as teaser**:
- Short clip in first 60s showing later content
- Coach voiceover on top ("Watch what happens...")
- Same dialogue appears in full later in video

**Cross-video duplicates**: Still handled by retrieval diversity caps (acceptable).

**Files modified**:
- `scripts/training-data/06.video-type`
- `scripts/training-data/schemas/conversations.schema.json`
- `scripts/training-data/09.chunk-embed.ts`
- `docs/pipeline/ASCII`

---

## Decision 8: DECIDED - Embedding Model

**Choice**: Keep nomic-embed-text (768 dims, 8192 token context, local Ollama)

**Rationale**:
- 8192 token context easily fits 1500 char chunks + metadata prefix
- Simpler architecture (no sibling-fetch needed for context)
- Can re-evaluate later if retrieval precision is poor
- mxbai-embed-large (512 token context) would require smaller chunks + sibling retrieval logic

**Alternative considered**: Smaller chunks + mxbai for higher precision, reconstruct context via `videoId + conversationId`. Decided to start simple.

**Note**: Can always re-embed later if needed.

---

## Next Steps

1. User answers remaining questions (Decisions 2-8)
2. Implement Stage 09 with all decisions
3. Rerun Stage 06 to get transcript_confidence for existing videos
4. Run Stage 09 to create chunks with confidence scores
5. Verify retrieval quality with new metadata

---

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `scripts/training-data/09.chunk-embed.ts` | Implement all decisions |
| `src/qa/retrieval.ts` | Use confidence in ranking (optional) |
| `src/db/types.ts` | Update EmbeddingMetadata type |

---

## Commands to Run After Decisions

```bash
# 1. Rerun Stage 06 for all videos to get transcript_confidence
./scripts/training-data/06.video-type --sources

# 2. Rerun Stage 06b/06c to propagate
./scripts/training-data/06b.verify --sources
./scripts/training-data/06c.patch --sources

# 3. Run new Stage 09
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --full

# 4. Run Stage 10 to ingest
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --full
```
