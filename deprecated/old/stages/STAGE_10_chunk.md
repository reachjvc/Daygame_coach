# Stage 10: Chunk
**Status:** TO BE CREATED
**Updated:** 04-02-2026

**Script**: `scripts/training-data/10.chunk` (TO BE CREATED)

---

## Changelog
- 04-02-2026: Renumbered from 09 to 10 (speaker correction now stage 07)

---

## Overview

Creates RAG-optimized chunks from structured interactions for vector database ingestion.

## Input
- `data/09.structure/<source>/<video>/*.interactions.jsonl`

## Output
- `data/10.chunk/<source>/<video>/`
  - `*.chunks.json` - RAG-optimized chunks

## Design Considerations

### Chunk Sizing
- Optimal size: 512-2048 tokens for embeddings
- Preserve semantic coherence
- Don't split mid-interaction

### Chunk Types (TBD)
1. **Transcript chunks** - Full transcript segments
2. **Interaction chunks** - Complete interactions
3. **Technique examples** - Specific technique demonstrations
4. **Topic discussions** - Topic-focused excerpts

### Metadata to Include
- Source video info
- Timestamp/position
- Speaker context
- Technique/topic tags
- Phase info

## Schema (TBD)
```json
{
  "chunk_id": "string",
  "chunk_type": "transcript | interaction | technique | topic",
  "content": "string",
  "token_count": number,
  "metadata": {
    "source": "string",
    "video_id": "string",
    "start_time": number,
    "end_time": number,
    "speakers": ["coach", "target"],
    "techniques": ["push_pull", "tease"],
    "topics": ["origin", "career"],
    "phase": "open | pre_hook | post_hook | close"
  }
}
```

## Usage (TBD)
```bash
# Single video
./scripts/training-data/10.chunk "source_name" "https://..."

# All sources
./scripts/training-data/10.chunk --sources
```

## Implementation Notes

This stage needs to be designed and implemented. Key decisions:
1. Chunk size strategy
2. Overlap handling
3. Metadata schema
4. Multiple chunk types or single?

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | Design + implement first |
| R2 | 15 | PENDING | - | - | |
