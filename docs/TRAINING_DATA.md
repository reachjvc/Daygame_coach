# Training Data Documentation

**Last Updated:** 2026-01-21 (auto-generated timestamp)

This is the single source of truth for the training data pipeline. All scripts, workflows, and troubleshooting information are documented here.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Commands Reference](#commands-reference)
3. [Pipeline Overview](#pipeline-overview)
4. [File Structure](#file-structure)
5. [Adding New Content](#adding-new-content)
6. [Troubleshooting](#troubleshooting)
7. [Clean & Re-ingest](#clean--re-ingest)
8. [Future Roadmap](#future-roadmap)
9. [Appendix: Historical Data Quality Report](#appendix-historical-data-quality-report)

---

## Quick Start

### One-Command Refresh (Recommended)

```bash
./scripts/refresh_training_data.sh
```

This downloads everything in `training-data/sources.txt`, transcribes, processes, and ingests to Supabase.

### Step-by-Step Alternative

```bash
# 1. Download videos
./scripts/download_sources.sh
# or for a specific channel:
./scripts/download_channel.sh "ChannelName" "https://youtube.com/..."

# 2. Process (transcribe + features + classification)
./scripts/full_pipeline.sh
# or for a specific channel:
./scripts/full_pipeline.sh "ChannelName"

# 3. Ingest to vector store (embeddings)
./scripts/quick_ingest.sh
```

### First-Time Setup

Before running the pipeline, ensure these prerequisites are met:

**1. Node + packages**
```bash
npm install
```

**2. Python Whisper environment**
```bash
python3 -m venv ~/whisper-env
source ~/whisper-env/bin/activate
pip install -U openai-whisper numpy librosa
```

Override the env path if needed:
```bash
WHISPER_ENV=/path/to/your/venv ./scripts/process_channel.sh "ChannelName"
```

**3. yt-dlp (YouTube downloader)**
```bash
pip install -U yt-dlp
```

**4. Ollama (for embeddings)**
```bash
ollama serve
ollama pull nomic-embed-text
```

**5. Supabase credentials**

In `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Commands Reference

### Primary Commands

| Command | Purpose | Time |
|---------|---------|------|
| `./scripts/refresh_training_data.sh` | Full refresh: download + process + ingest | Varies |
| `./scripts/download_channel.sh "Name" "URL"` | Download videos from YouTube | 15-60 min |
| `./scripts/download_sources.sh` | Download all sources in sources.txt | Varies |
| `./scripts/full_pipeline.sh` | Process all channels | 10-20 hrs |
| `./scripts/full_pipeline.sh "Name"` | Process one channel | 1-2 hrs |
| `./scripts/quick_ingest.sh` | Re-ingest embeddings (incremental) | 2-5 min |
| `./scripts/quick_ingest.sh full` | Force full re-ingest | 20-40 min |
| `./scripts/clean_transcriptions.sh` | Auto-fix transcription errors | 1 min |

### Monitoring Commands

| Command | Purpose |
|---------|---------|
| `python3 scripts/check_progress.py` | See processing status |
| `python3 scripts/verify_training_data.py --no-validate-json` | Quick structural check |
| `python3 scripts/verify_pipeline.py` | Verify JSONL validity |
| `python3 scripts/analyze_training_data.py` | Quality report |

### Workflow Examples

**Monthly content update:**
```bash
./scripts/download_channel.sh "SocialStoic" "https://www.youtube.com/@SocialStoic/videos"
./scripts/full_pipeline.sh "SocialStoic"
./scripts/quick_ingest.sh
```

**After editing transcripts manually:**
```bash
./scripts/clean_transcriptions.sh
./scripts/quick_ingest.sh
```

**Process a single video:**
```bash
./scripts/download_channel.sh "MyVideo" "https://www.youtube.com/watch?v=xxx"
./scripts/full_pipeline.sh "MyVideo"
```

---

## Pipeline Overview

### Two Outputs

The pipeline produces two distinct outputs:

**1. RAG Embeddings (used by the app)**
- Input: `training-data/transcripts/**/*.txt`
- Output: Supabase `embeddings` table
- Run: `./scripts/quick_ingest.sh`

**2. Processed Datasets (for analysis/training)**
- Input: Whisper `.json` + audio files
- Output: `training-data/processed/*.jsonl`
- Run: `./scripts/full_pipeline.sh`

### Pipeline Stages

```
┌─────────────────────┐
│ 1. DOWNLOAD VIDEO   │ (YouTube → raw-audio/)
├─────────────────────┤
│ 2. TRANSCRIBE       │ (Audio → Whisper JSON → TXT)
├─────────────────────┤
│ 3. EXTRACT FEATURES │ (TXT → Pitch/Energy/Tempo)
├─────────────────────┤
│ 4. CLASSIFY         │ (Features → Speaker/Tonality/Content)
├─────────────────────┤
│ 5. AGGREGATE        │ (All channels → training_data.jsonl)
├─────────────────────┤
│ 6. INGEST TO VEC    │ (JSONL → Embeddings → Supabase)
└─────────────────────┘
```

### What `process_channel.sh` Does

1. Transcribes audio with Whisper (creates `.json`, `.txt`, `.srt`, `.vtt`, `.tsv`)
2. Classifies content (infield, theory, intro)
3. Extracts audio features (pitch, energy, tempo)
4. Classifies speakers (coach vs target)
5. Classifies tonality (playful, confident, etc.)
6. Extracts interactions (complete conversations)
7. Aggregates into `training_data.jsonl`

### How RAG Works

When you ask a question:
1. Embedding generated for your question (nomic-embed-text)
2. Vector store searched for similar chunks
3. Top 5 chunks retrieved with source metadata
4. Chunks included in system prompt
5. LLM generates answer grounded in real examples

---

## File Structure

```
training-data/
├── raw-audio/                          # Downloaded videos
│   ├── SocialStoic/
│   │   ├── Video1.opus
│   │   └── .youtube-dl-archive.txt     # Prevents re-downloading
│   └── ...
│
├── transcripts/                        # Whisper outputs
│   ├── SocialStoic/
│   │   ├── Video1.txt                  # Plain text (used for RAG)
│   │   ├── Video1.json                 # Whisper JSON (timestamps)
│   │   └── Video1.classified.json      # Content type labels
│   └── ...
│
├── features/                           # Analyzed audio data
│   └── SocialStoic/
│       └── Video1.features.json        # Pitch, energy, tempo
│
├── interactions/                       # Extracted conversations
│   └── SocialStoic/
│       └── Video1.interactions.jsonl
│
├── processed/                          # Final aggregated data
│   ├── training_data.jsonl             # All chunks
│   └── scenario_training.jsonl         # Chat format
│
├── sources.txt                         # YouTube sources list
├── .ingest_state.json                  # Tracks ingested files (gitignored)
├── pipeline-*.log                      # Processing logs
└── ingest.log                          # Embedding logs
```

---

## Adding New Content

### Option 1: One-off Download

```bash
# Channel
./scripts/download_channel.sh "ChannelName" "https://www.youtube.com/@Channel/videos"

# Playlist
./scripts/download_channel.sh "PlaylistName" "https://www.youtube.com/playlist?list=PLxxx"

# Single video
./scripts/download_channel.sh "VideoName" "https://www.youtube.com/watch?v=xxx"
```

Then process:
```bash
./scripts/full_pipeline.sh "ChannelName"
```

### Option 2: Add to Sources File

Edit `training-data/sources.txt`:
```
ChannelFolderName|https://youtube.com/...
```

Then run:
```bash
./scripts/refresh_training_data.sh
```

### Handling 403/Bot Errors

If downloads fail, create a cookies file:
1. Export cookies from browser to `www.youtube.com_cookies.txt` in repo root
2. The download scripts will use it automatically

Or set explicitly:
```bash
YOUTUBE_COOKIES_FILE=/path/to/cookies.txt ./scripts/download_channel.sh "Name" "URL"
```

---

## Troubleshooting

### "Command not found: youtube-dl"
```bash
pip install yt-dlp
```

### "Whisper model not found"
```bash
source ~/whisper-env/bin/activate
pip install openai-whisper
```

### "Ollama connection refused"
```bash
ollama serve
ollama pull nomic-embed-text
```

### "Permission denied" on script
```bash
chmod +x scripts/*.sh
```

### "Transcription quality is bad"
Use medium model (slower, better):
```bash
WHISPER_MODEL=medium ./scripts/process_channel.sh "ChannelName"
```

### "Ingest failed halfway"
Safe to re-run—database rejects duplicates:
```bash
./scripts/quick_ingest.sh
```

### Feature extraction crashes (numpy/librosa/numba)
Delete cache and retry:
```bash
rm -rf training-data/.cache
```

### Check logs for errors
```bash
tail -f training-data/pipeline-*.log
tail -f training-data/ingest.log
grep -i error training-data/*.log
```

---

## Clean & Re-ingest

Use this when you need to rebuild embeddings from scratch with improved chunking.

### What It Does

1. Clears all old embeddings from Supabase
2. Re-loads transcripts with sentence-boundary chunking
3. Generates fresh embeddings
4. Stores clean embeddings to Supabase

### How to Run

**Option 1: API Endpoint (easiest)**
```bash
curl -X POST http://localhost:3000/api/admin/clean-and-reingest
```

**Option 2: Node Script**
```bash
node scripts/clean_and_reingest.mjs
```

**Option 3: Bash Script**
```bash
./scripts/clean_and_reingest.sh
```

### Timeline
- Clearing embeddings: ~5 seconds
- Loading & chunking: ~10 seconds
- Generating embeddings: ~20-40 minutes
- Storing to Supabase: ~30 seconds

### Troubleshooting Clean & Re-ingest

**"Ollama embedding failed"**
- Check Ollama: `curl http://localhost:11434/api/tags`
- Verify model: `ollama list | grep nomic`
- Script retries automatically

**"Missing SUPABASE_URL"**
- Use the API endpoint (auto-loads env vars)
- Or ensure `.env.local` is in project root

**Script crashes mid-way**
- Safe to run again—clears old data first
- No partial data left in Supabase

---

## Future Roadmap

### Data Quality Improvements

**1. Standardize Metadata Schema**

Every chunk should have:
- `schemaVersion`
- `channel`, `coach`, `video_title`
- `source` (relative transcript path)
- `chunkIndex`, `totalChunks`
- `contentType` (infield, breakdown, theory, intro/outro)
- `segmentType` (INTERACTION, EXPLANATION)
- `chunkHash`, `embeddingModel`, `chunkerVersion`

**2. Deduplication**
- Store `chunkHash` during ingest
- Prevent exact duplicates
- Prefer canonical chunks when duplicates exist

**3. Transcript Normalization**
- Remove sponsor plugs, CTAs, housekeeping
- Normalize punctuation and whitespace
- Align chunks to conversational turns when timestamps exist

### Retrieval Improvements

**1. Two-Stage Retrieval**
- Recall stage: retrieve 50-200 candidates with low threshold
- Precision stage: rerank with keyword overlap, metadata match, diversity

**2. Hybrid Search**
- Add Postgres full-text search (BM25)
- Combine: `w_vec * similarity + w_lex * bm25 + bonuses`

**3. Intent-Aware Retrieval**
- Script intent ("what should I say"): 3-4 infield + 1-2 principle chunks
- Principle intent ("why/how"): 3-4 principle + 1-2 infield chunks

### Evaluation

**Golden Queries Set**
Create `training-data/evals/golden_queries.json`:
- Query text
- Expected source patterns
- Expected content type mix
- Tags (topic, intent)

**Metrics to Track**
- Retrieval recall@k
- MRR (mean reciprocal rank)
- % queries returning 0 chunks
- Metadata completeness
- Duplication rate

---

## Appendix: Historical Data Quality Report

*Snapshot from January 18, 2026*

### Coverage at Time of Report

```
SocialStoic:                37 videos (fully processed)
The Natural Lifestyles:     24 videos (5 processed)
NaturalLifestyles-Infield:  20 videos (not transcribed)
NaturalLifestyles-Students:  2 videos (1 processed)
NaturalLifestyles-InnerGrowth: 7 videos (not transcribed)
─────────────────────────────────────────────────────
TOTAL: 90 videos (63 transcribed, 27 untranscribed)
```

### Data Size

- Transcripts: 1.45M characters (274K words)
- Chunks: 16,418 (average 88 chars each)
- Average video: ~23K characters

### Filler Words in Transcriptions

- "like": 3,050 instances
- "you know": 910 instances
- "uh": 110 instances

These add authenticity to the training data.

### Known Issue: Retrieval Ranking

The "medicine" question test revealed that while relevant data exists in the database, retrieval sometimes returns less relevant chunks. This is a retrieval/ranking issue, not a data availability issue.

---

## Performance Reference

### Time Per Video

| Stage | Time |
|-------|------|
| Download | 2-10 min |
| Transcribe (base) | 2-5 min |
| Transcribe (medium) | 5-10 min |
| Features | 30 sec |
| Classify | 30 sec |
| Ingest | 10 sec |

### Batch Processing

| Size | Total Time |
|------|-----------|
| 10 videos | 1-3 hrs |
| 20 videos | 2-6 hrs |
| 90 videos | 9-25 hrs |

### Data Size Reference

- 1 hour of audio: ~2000-3000 Whisper tokens
- 1 video transcript: ~2000-5000 chunks (with overlap)
- Embeddings: ~40 bytes per float, 768 floats per embedding
