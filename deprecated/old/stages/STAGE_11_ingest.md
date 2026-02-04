# Stage 11: Ingest
**Status:** FRESH START
**Updated:** 04-02-2026

**Script**: `scripts/training-data/11.ingest.ts`

---

## Changelog
- 04-02-2026: Renumbered from 10 to 11 (speaker correction now stage 07)

---

## Overview

Ingests processed data into Supabase vector store for RAG/QA system.

## Input
- `data/10.chunk/<source>/<video>/*.chunks.json`
- (Legacy modes also support 04.diarize transcripts and 08.content interactions)

## Output
- Supabase `embeddings` table

## Modes

| Mode | Input | Description |
|------|-------|-------------|
| `transcripts` | 04.diarize/*.txt | Full transcript embeddings |
| `interactions` | 08.content/*.enriched.json | Interaction-level embeddings |
| `chunks` | 10.chunk/*.chunks.json | RAG-optimized chunks (NEW) |

## Usage
```bash
# Default (interactions mode)
node tsx scripts/training-data/11.ingest.ts

# Specific mode
node tsx scripts/training-data/11.ingest.ts --mode transcripts
node tsx scripts/training-data/11.ingest.ts --mode chunks

# Options
node tsx scripts/training-data/11.ingest.ts --dry-run   # Preview without writing
node tsx scripts/training-data/11.ingest.ts --verify    # Check existing state
node tsx scripts/training-data/11.ingest.ts --full      # Force full reprocessing
```

## State Tracking
- `.ingest_state.json` - Transcript processing state
- `.ingest_state.interactions.json` - Interaction processing state
- `.ingest_state.chunks.json` - Chunk processing state (NEW)

## Supabase Schema

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  content TEXT,
  source TEXT,
  embedding VECTOR(1536),
  metadata JSONB
);
```

## Quality Targets

- All chunks ingested successfully
- Embeddings created correctly
- Retrieval works for sample queries

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 20 | PENDING | - | - | Full test set |
