# Stage 09: Chunk & Embed
**Status:** NEW
**Updated:** 06-02-2026

**Script**: `scripts/training-data/09.chunk-embed.ts`

---

## Overview

Transforms enriched content into embedded chunks. Outputs intermediate JSON files.
Does NOT write to database - prepares data for Stage 10 ingestion.

## Input
- `data/07.content/**/*.enriched.json`

## Output
- `data/09.chunks/<source>/<video>.chunks.json`
- `data/09.chunks/.chunk_state.json` (state tracking)

## Usage

```bash
# Run chunk-embed
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts

# Specific source
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --source daily_evolution

# Dry run
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --dry-run

# Force full re-process
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts --full
```

## Chunking Strategy

### Interactions (INTERACTION)
- Phase-based chunking (open → pre_hook → post_hook → close)
- `segmentType: "INTERACTION"`
- `isRealExample: true`
- Preserves conversationId, phase, techniques, topics

### Commentary (COMMENTARY)
- Simple text chunking with overlap
- `segmentType: "COMMENTARY"`
- `isRealExample: false`

### Teaser Skipping
- Segments with `is_teaser: true` are filtered out before chunking
- Prevents duplicate content from intro previews
- Logs count of skipped teaser segments

### Quality Flagging
- Chunks containing problematic segments get `problematicReason` array
- Triggers: `speaker_role` in [collapsed, mixed/unclear, unknown], or `speaker_confidence < 0.7`
- Per-chunk assessment (not contaminated by overlap)

## Output Format

```json
{
  "version": 1,
  "sourceFile": "data/07.content/.../video.enriched.json",
  "sourceHash": "sha256...",
  "embeddingModel": "nomic-embed-text",
  "chunkSize": 1500,
  "chunkOverlap": 150,
  "videoType": "infield",
  "channel": "daily_evolution",
  "videoTitle": "...",
  "generatedAt": "2026-02-06T...",
  "chunks": [{
    "content": "Coach: Hey...\nGirl: Hi...",
    "embedding": [0.1, 0.2, ...],
    "metadata": {
      "segmentType": "INTERACTION",
      "isRealExample": true,
      "chunkIndex": 0,
      "totalChunks": 5,
      "conversationId": 1,
      "phase": "open",
      "techniques": ["direct_opener"],
      "topics": ["name", "origin"],
      "videoId": "a1b2c3d4e5f6",
      "videoType": "infield",
      "channel": "daily_evolution",
      "problematicReason": ["speaker_role:unknown"]
    }
  }]
}
```

## State Tracking

State file: `data/09.chunks/.chunk_state.json`

```json
{
  "version": 1,
  "embeddingModel": "nomic-embed-text",
  "chunkSize": 1500,
  "chunkOverlap": 150,
  "sources": {
    "daily_evolution/video.txt": {
      "enrichedHash": "sha256...",
      "chunkCount": 15,
      "updatedAt": "2026-02-06T..."
    }
  }
}
```

Settings changes trigger full re-process.

## Dependencies

- Ollama running with embedding model (nomic-embed-text)
- `src/qa/config.ts` for chunk settings

## Quality Targets

- All enriched files chunked
- Embeddings generated successfully
- Intermediate files inspectable for debugging

---

## Verification Status

| Round | Videos | Status | Notes |
|-------|--------|--------|-------|
| R1 | - | NEW | Initial implementation |
