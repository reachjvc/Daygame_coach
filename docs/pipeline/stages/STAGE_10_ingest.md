# Stage 10: Ingest
**Status:** NEW
**Updated:** 06-02-2026

**Script**: `scripts/training-data/10.ingest.ts`

---

## Overview

Reads chunked and embedded data from Stage 09, inserts into Supabase pgvector.
Performs ONLY database operations - no chunking or embedding.

## Input
- `data/09.chunks/**/*.chunks.json`

## Output
- Supabase `embeddings` table
- `data/.ingest_state.json` (state tracking)

## Usage

```bash
# Run ingest
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts

# Specific source
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --source daily_evolution

# Dry run (preview without DB writes)
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --dry-run

# Verify only (check state)
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --verify

# Force full re-ingest
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --full
```

## Database Operations

For each source:
1. `deleteEmbeddingsBySource(source)` - Remove existing embeddings
2. `storeEmbeddings(rows)` - Insert new embeddings

## Metadata Stored

```json
{
  "channel": "daily_evolution",
  "coach": "daily_evolution",
  "video_title": "...",
  "video_type": "infield",
  "chunkIndex": 0,
  "totalChunks": 5,
  "segmentType": "INTERACTION",
  "isRealExample": true,
  "conversationId": 1,
  "phase": "open",
  "techniques": ["direct_opener"],
  "topics": ["name", "origin"]
}
```

## State Tracking

State file: `data/.ingest_state.json`

```json
{
  "version": 1,
  "sources": {
    "daily_evolution/video.txt": {
      "chunksHash": "sha256...",
      "ingestedCount": 15,
      "ingestedAt": "2026-02-06T..."
    }
  }
}
```

Chunks file changes trigger re-ingest for that source.

## Dependencies

- Supabase credentials in `.env.local`
- `src/db/server.ts` (storeEmbeddings, deleteEmbeddingsBySource)

## Quality Targets

- All chunks ingested successfully
- Embeddings retrievable via RAG queries
- Incremental updates work correctly

---

## Verification Status

| Round | Videos | Status | Notes |
|-------|--------|--------|-------|
| R1 | - | NEW | Initial implementation |
