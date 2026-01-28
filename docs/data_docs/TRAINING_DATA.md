# Training Data Reference
**Status:** ⚠️ PARTIALLY OUTDATED - Pipeline v2 in progress
**Updated:** 2026-01-28 06:34 CET

> **Note:** Pipeline architecture is moving to 6-stage v2. See [PIPELINE.md](../data/PIPELINE.md) for current status and plan. This file remains as reference for data formats and legacy scripts until migration is complete.
> **Note:** This repo’s active scripts live in `scripts/training-data/` and write outputs under `data/`. Legacy shell scripts referenced below (e.g., `run_source.sh`, `run_full_pipeline.sh`, `quick_ingest.sh`) are not present here.

This document describes the training data formats, sources, and processing scripts.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Folder Structure](#folder-structure)
4. [Pipeline Stages](#pipeline-stages)
5. [Source Configuration](#source-configuration)
6. [Segmentation & Classification](#segmentation--classification)
7. [Chunking Strategy](#chunking-strategy)
8. [Retrieval & Ranking](#retrieval--ranking)
9. [Voice-to-Voice Preparation](#voice-to-voice-preparation)
10. [Scripts Reference](#scripts-reference)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### What This Pipeline Does

1. **Downloads** YouTube videos (channels, playlists, single videos)
2. **Transcribes** audio using Whisper (with timestamps)
3. **Segments** transcripts into conversations and phases
4. **Classifies** speakers (Coach vs Girl) and content types
5. **Extracts** features: tonality, topics, techniques used
6. **Chunks** content respecting conversation boundaries
7. **Ingests** to Supabase with embeddings for semantic search

### Why It Matters

The training data powers three features:
- **Q&A**: Users ask questions, AI retrieves relevant coach examples
- **Scenarios**: Practice specific situations (career response, opener, etc.)
- **Cold Approach**: Full approach practice with AI playing the girl

The AI needs to retrieve the RIGHT information—not just keyword matches, but semantically relevant coach responses to similar situations.

### Key Principles

1. **Conversations are sacred**: Chunks never span multiple approaches
2. **Speaker clarity**: Every line should be labeled Coach or Girl
3. **Phase awareness**: Know if it's opener, vibe, close, or commentary
4. **Semantic richness**: Topics and techniques are tagged for retrieval
5. **Best practice over shortcuts**: We optimize for quality, not speed

---

## Quick Start

### One-Command Full Pipeline

```bash
# Download + transcribe + process + enrich + ingest a new source
./scripts/training-data/final_pipeline "NaturalLifestyles-Infield" "https://youtube.com/playlist?list=..."

# Batch mode (reads docs/sources.txt)
./scripts/training-data/final_pipeline --sources docs/sources.txt
```

### Step-by-Step

```bash
# 1. Download videos
./scripts/training-data/01.download "NaturalLifestyles-Infield" "https://youtube.com/..."

# 2. Transcribe
./scripts/training-data/02.transcribe "NaturalLifestyles-Infield" "https://youtube.com/..."

# 3. Continue steps 03-09 (see “Training-data Step Scripts” table below)
./scripts/training-data/03.audio-features "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/04.content "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/05.tonality "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/06.speakers "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/07.LLM-conversations "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/08.interactions "NaturalLifestyles-Infield" "https://youtube.com/..."
./scripts/training-data/09.enrich "NaturalLifestyles-Infield" "https://youtube.com/..."

# 4. Ingest to vector store
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts
```

Notes:
- Use `./scripts/training-data/final_pipeline --skip-ingest` to stop before ingestion.
- `--ingest-full`, `--ingest-dry-run`, and `--ingest-verify` are forwarded to `./scripts/training-data/10.ingest.ts`.

### First-Time Setup

```bash
# Node packages
npm install

# Python environment (Whisper + audio processing)
python3 -m venv ~/whisper-env
source ~/whisper-env/bin/activate
pip install -U openai-whisper numpy librosa pyannote.audio

# yt-dlp for downloads
pip install -U yt-dlp

# Ollama for embeddings and semantic tagging
ollama serve
ollama pull nomic-embed-text
ollama pull llama3.1:8b  # For semantic tagging

# Supabase credentials in .env.local
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Folder Structure

```
data/
├── 01.download/<ChannelName>/<Video>/*.(webm|opus|m4a|mp3|wav|mp4|mkv)
├── 02.transcribe/<ChannelName>/<Video>/*.{json,txt,srt,vtt,tsv}
├── 02b.clean-transcribed/<ChannelName>/<Video>/*.{consensus.json,consensus.txt,scores.json,qc_report.json}
├── 03.audio-features/<ChannelName>/<Video>/*.audio_features.json
├── 04.content/<ChannelName>/<Video>/*.classified.json
├── 05.tonality/<ChannelName>/<Video>/*.tonality.json
├── 06.speakers/<ChannelName>/<Video>/*.tonality.json
├── 07.LLM-conversations/<ChannelName>/<Video>/*.conversations.json
├── 08.interactions/<ChannelName>/<Video>/*.interactions.jsonl
├── 09.enrich/<ChannelName>/<Video>/*.enriched.json
├── .ingest_state.json
└── .ingest_state.interactions.json

docs/
└── sources.txt

training-data/  # legacy / optional local cache (ignored by git)
```

Note: The normalized step scripts in `scripts/training-data/` write outputs under `data/`.

---

## Pipeline Stages (Normalized Scripts)

1. **Download (01.download)**
   - Output: `data/01.download/<ChannelName>/<Video>/*.(webm|opus|m4a|mp3|wav|mp4|mkv)`
2. **Transcribe (02.transcribe)**
   - Output: `data/02.transcribe/<ChannelName>/<Video>/*.{json,txt,srt,vtt,tsv}`
3. **Clean transcripts (02b.clean-transcribed, optional)**
   - Output: `data/02b.clean-transcribed/<ChannelName>/<Video>/*.{consensus.json,consensus.txt,scores.json,qc_report.json}`
4. **Audio features (03.audio-features)**
   - Output: `data/03.audio-features/<ChannelName>/<Video>/*.audio_features.json`
5. **Content classification (04.content)**
   - Output: `data/04.content/<ChannelName>/<Video>/*.classified.json`
6. **Tonality (05.tonality)**
   - Output: `data/05.tonality/<ChannelName>/<Video>/*.tonality.json`
7. **Speaker labels (06.speakers)**
   - Output: `data/06.speakers/<ChannelName>/<Video>/*.tonality.json`
8. **Conversation detection (07.LLM-conversations)**
   - Output: `data/07.LLM-conversations/<ChannelName>/<Video>/*.conversations.json`
9. **Interactions (08.interactions)**
   - Output: `data/08.interactions/<ChannelName>/<Video>/*.interactions.jsonl`
10. **Enrichment (09.enrich)**
    - Output: `data/09.enrich/<ChannelName>/<Video>/*.enriched.json`
11. **Ingest (10.ingest.ts)**
    - Output: Supabase `embeddings` table + `data/.ingest_state*.json`

## Source Configuration

### sources.txt

```text
# docs/sources.txt
# Format (one per line):
#   ChannelName|YouTubeURL
#
# Notes:
# - ChannelName becomes the folder name under data/<step>/ outputs
# - YouTubeURL can be a channel, playlist, or single video URL
# - Lines starting with # are ignored

SocialStoic|https://www.youtube.com/@SocialStoicYouTube
NaturalLifestyles-Infield|https://www.youtube.com/playlist?list=PLxxx
NaturalLifestyles-InnerGrowth|https://www.youtube.com/playlist?list=PLyyy
```

The normalized step scripts and `scripts/training-data/final_pipeline` default to this file via `--sources`.

### Source Types

| Type | Description | Has Interactions | Weight Default |
|------|-------------|------------------|----------------|
| `coach_infield` | Coach approaching women on camera | Yes | 1.0 |
| `student_infield` | Student approaching with coach commentary | Yes | 0.7 |
| `talking_head` | Coach explaining principles to camera | No | 0.8 |
| `mixed` | Combination of infield and talking head | Yes | 1.0 |

---

## Segmentation & Classification

### Conversation Detection

The pipeline identifies distinct conversations (approaches) within videos:

1. **Opener detection**: "Excuse me", "Hey two seconds", etc.
2. **Gap analysis**: Silence >3 seconds often indicates new conversation
3. **Content change**: Switch from dialogue to commentary
4. **LLM verification**: Confirms boundaries using context

Each segment gets a `conversation_id` linking it to its approach.

### Speaker Classification

Hybrid approach combining:

1. **Audio features**:
   - Pitch: <140Hz likely male (coach), >220Hz likely female (girl)
   - Brightness: Higher = more feminine voice
   - Dynamics: Voiceover has less variation

2. **Text patterns**:
   - Coach: Questions, statements of intent, leading phrases
   - Girl: Short responses, self-descriptions, reactions

3. **Conversation structure**:
   - Alternating speakers within an interaction
   - Coach typically initiates, girl responds

Labels: `coach`, `girl`, `voiceover`, `ambiguous`, `unknown`

### Phase Classification

Each segment within an interaction is labeled with its phase:

| Phase | Description | Typical Patterns |
|-------|-------------|------------------|
| `opener` | Initial approach and compliment | "Excuse me", "I noticed you" |
| `hook` | Girl shows initial interest | She responds positively, asks a question |
| `vibe` | Extended conversation, building connection | Banter, stories, qualification |
| `close` | Attempting to get contact/date | "Can I get your number", "Let's grab coffee" |

Sub-events (tracked but not separate phases):
- `qualification`: Coach asks about her
- `push_pull`: Tease followed by compliment
- `kino`: Physical touch mentioned
- etc.

### Content Type Classification

| Type | Description | Include in RAG |
|------|-------------|----------------|
| `infield` | Live approach footage | Yes (high priority) |
| `theory` | Principles and explanations | Yes |
| `breakdown` | Coach reviewing footage | Yes |
| `intro` | Video intro, channel plugs | No |
| `outro` | Subscribe reminders, CTAs | No |
| `transition` | "Let's look at the next one" | No |

---

## Chunking Strategy

### Principles

1. **Never split conversations**: A chunk belongs to exactly one approach
2. **Respect phase boundaries**: Prefer chunks that map to phases
3. **Variable length OK**: A 150-char opener is better than half an opener
4. **Speaker continuity**: Don't cut mid-sentence

### Chunk Metadata

```json
{
  "content": "Coach: You look very feminine walking there...",
  "source": "NaturalLifestyles-Infield/Video Title.txt",
  "embedding": [...],
  "metadata": {
    "channel": "NaturalLifestyles-Infield",
    "coach": "NaturalLifestyles-Infield",
    "video_title": "Video Title",

    "conversationId": 3,
    "phase": "opener",
    "chunkIndex": 0,
    "totalChunks": 12,
    "segmentType": "INTERACTION",
    "isRealExample": true,

    "topics": ["appearance", "origin"],
    "techniques": ["direct_opener", "cold_read"]
  }
}
```

### Retrieval Example

When a user asks: "What should I say when a girl says she studies medicine?"

1. **Semantic search** finds chunks where:
   - `topics` includes `career`
   - Content mentions medicine, medical, doctor, etc.
   - `is_real_example` is true (prefer real conversations)

2. **Ranking considers**:
   - Topic match (career > location)
   - Source weight (coach > student footage)
   - Phase relevance (vibe phase for career response)

3. **Retrieved chunks** show actual coach responses to similar situations

---

## Ground Truth Enrichment

### Purpose

The basic pipeline extracts interactions but misses nuance. The enrichment step uses Ollama to create rich ground-truth-style JSON files that include:

- **Line-number mapping**: Each interaction links back to exact transcript lines
- **Phase segmentation**: Precise opener/hook/vibe/close boundaries
- **Technique detection**: LLM identifies specific techniques used (push_pull, cold_read, etc.)
- **Topic extraction**: What subjects were discussed (career, origin, appearance, etc.)
- **Commentary detection**: Separates coach talking to camera from actual approaches

### Output Format

```json
{
  "video_title": "Are You Making THIS Mistake...",
  "source": "SocialStoic",
  "source_file": "data/08.interactions/SocialStoic/Video.interactions.jsonl",
  "content_type": "mixed",
  "interactions": [
    {
      "id": 1,
      "type": "approach",
      "description": "Redhead approach - front stop demonstration",
      "outcome": "unknown",
      "topics_discussed": ["appearance", "hair", "eyes"],
      "techniques_used": ["direct_opener", "front_stop", "observation"]
    },
    {
      "id": 2,
      "type": "commentary",
      "description": "Coach explains front stop vs side stop"
    }
  ],
  "summary": {
    "total_interactions": 13,
    "total_commentary_sections": 8,
    "outcomes": { "number": 1, "instant_date": 1, "blowout": 2 },
    "techniques_demonstrated": ["front_stop", "push_pull", "cold_read"]
  },
  "enrichment_metadata": {
    "model": "llama3.1",
    "timestamp": "2026-01-28 06:34:00"
  }
}
```

### Running Enrichment

```bash
# Single source (video / playlist / channel)
./scripts/training-data/09.enrich "SocialStoic" "https://www.youtube.com/watch?v=utuuVOXJunM"

# Batch from sources file
./scripts/training-data/09.enrich --sources
./scripts/training-data/09.enrich --sources docs/sources.txt
```

### Verifying Scripts Are Working

When running enrichment, confirm outputs under `data/09.enrich`:

**1. Watch the terminal output** - Each script will print progress like:
```
[09.enrich] Found 5 interactions to enrich
[09.enrich] Saved: data/09.enrich/SocialStoic/Video.enriched.json
```

**2. Check the output directory** - New `.enriched.json` files appear as each video completes:
```bash
ls -lt data/09.enrich/*/ | head -20
find data/09.enrich -name "*.enriched.json" | wc -l
```

**3. Monitor in real-time** - Use watch to see files appear:
```bash
watch -n 5 'find data/09.enrich -name "*.enriched.json" -mmin -1'
```

**4. Check file contents** - Verify a generated file looks correct:
```bash
cat data/09.enrich/SocialStoic/*.enriched.json | head -100
```

**5. If nothing is happening** - Check for errors:
- Ollama must be running: `ollama serve` (in a separate terminal)
- Verify interactions exist: `ls data/08.interactions/*/`
- Check for Python errors in the terminal output

### Validation

Validation helpers are not currently in this repo. If needed, compare `data/09.enrich` outputs against `data/08.interactions` inputs and add a dedicated validation script.

## Retrieval & Ranking

### Query-Time Weighting

The LLM determines what matters most for each query:

```
User: "What to say when she mentions her career?"
→ Priority: topic:career > is_real_example > phase:vibe

User: "Best openers in parks?"
→ Priority: phase:opener > location:park > is_real_example

User: "How to handle rejection gracefully?"
→ Priority: topic:rejection > phase:close > content_type:theory
```

### Hierarchy of Relevance

1. **Topic match**: Career, hobby, origin, etc. (most important)
2. **Technique match**: If asking about specific techniques
3. **Phase match**: Opener vs vibe vs close
4. **Real example**: Prefer infield over theory
5. **Context match**: Location, time of day, etc. (least important)

### Future: Learned Ranking

When user feedback is available (thumbs up/down):
- Track which chunks were retrieved for good answers
- Adjust chunk relevance scores based on feedback
- Periodically retrain ranking weights

---

## Voice-to-Voice Preparation

### Purpose

Future feature: Users speak to AI, AI responds with coach-like voice and content.

### Data Requirements

1. **Speaker-separated timestamps**: Know exactly when coach vs girl speaks
2. **Aligned transcripts**: Text matched to audio timestamps
3. **Tonality features**: Pitch contours, energy, tempo
4. **Semantic context**: What phase, what girl just said

### Speaker Timeline Format

```json
{
  "video": "data/01.download/NaturalLifestyles-Infield/Video.webm",
  "duration_sec": 542.5,
  "speakers": {
    "coach": [
      {"start": 0.0, "end": 2.5, "text": "Excuse me, two seconds..."},
      {"start": 5.2, "end": 8.1, "text": "I noticed you walking..."},
      ...
    ],
    "girl": [
      {"start": 2.5, "end": 5.0, "text": "Oh, hi..."},
      ...
    ],
    "voiceover": [
      {"start": 120.0, "end": 145.0, "text": "So what I did there was..."}
    ]
  }
}
```

### Future Use

1. **Voice cloning**: Train TTS on coach audio segments
2. **Response timing**: Learn natural conversation rhythm
3. **Tone matching**: Match coach tonality to situation

---

## Scripts Reference

### Main Pipeline Script (Recommended)

Use the normalized pipeline entrypoint:

```bash
./scripts/training-data/final_pipeline "NaturalLifestyles-Infield" "https://youtube.com/playlist?list=..."
./scripts/training-data/final_pipeline --sources docs/sources.txt
```

Options (forwarded to ingest as needed):
- `--skip-ingest`
- `--ingest-full`
- `--ingest-dry-run`
- `--ingest-verify`

### Legacy Scripts (Not in repo)

The following legacy scripts are referenced in older docs but are not present in this repo:
- `run_source.sh`
- `download_channel.sh`
- `process_channel.sh`
- `run_full_pipeline.sh`
- `full_pipeline.sh`
- `quick_ingest.sh`
- `transcribe_channel.sh`

### Processing Scripts

#### Training-data Step Scripts (Normalized)

These scripts live in `scripts/training-data/` and write outputs under `data/`:

| Step | Script | Reads | Writes |
|------|--------|-------|--------|
| 01 | `01.download` | YouTube URL(s) | `data/01.download/<source>/<video>/*` |
| 02 | `02.transcribe` | `data/01.download/<source>/<video>/*.wav` | `data/02.transcribe/<source>/<video>/*.{json,txt,srt,vtt,tsv}` |
| 03 | `03.audio-features` | `data/01.download` + `data/02.transcribe` | `data/03.audio-features/<source>/<video>/*.audio_features.json` |
| 04 | `04.content` | `data/02.transcribe/<source>/<video>/*.json` | `data/04.content/<source>/<video>/*.classified.json` |
| 05 | `05.tonality` | `data/03.audio-features/<source>/**/*.audio_features.json` | `data/05.tonality/<source>/**/*.tonality.json` |
| 06 | `06.speakers` | `data/05.tonality/<source>/**/*.tonality.json` | `data/06.speakers/<source>/**/*.tonality.json` |
| 07 | `07.LLM-conversations` | `data/06.speakers/<source>/**/*.json` | `data/07.LLM-conversations/<source>/**/*.conversations.json` |
| 08 | `08.interactions` | `data/07.LLM-conversations/<source>/**/*.conversations.json` | `data/08.interactions/<source>/<video>/*.interactions.jsonl` |
| 09 | `09.enrich` | `data/08.interactions/<source>/<video>/*.interactions.jsonl` | `data/09.enrich/<source>/<video>/*.enriched.json` |

#### Final Pipeline Entry Point

`./scripts/training-data/final_pipeline` runs steps 01‑09 for a single video/playlist/channel or for every entry listed in `docs/sources.txt`, then runs `./scripts/training-data/10.ingest.ts` (step 11, alias: `npm run ingest`). Pass `--skip-ingest` to stop before embeddings are written, `--ingest-full` to force a full reingest, `--ingest-mode interactions` to target interaction chunks, or `--ingest-dry-run`/`--ingest-verify` for dry-run checks; any flag you pass with `--ingest-arg` is forwarded verbatim to `./scripts/training-data/10.ingest.ts`.

### Utility Scripts (Current)

| Script | Purpose |
|--------|---------|
| `scripts/training-data/final_pipeline` | Run steps 01–09 + ingest |
| `scripts/training-data/10.ingest.ts` | Ingest transcripts/enriched interactions |
| `scripts/generate_training_data.py` | Legacy aggregator (expects `*.features.json`; may need updates) |

### Usage Examples

```bash
# Run the full pipeline for a single source
./scripts/training-data/final_pipeline "NaturalLifestyles-NewPlaylist" "https://youtube.com/..."

# Batch run without ingestion
./scripts/training-data/final_pipeline --sources docs/sources.txt --skip-ingest

# Verify ingest inputs without writing to Supabase
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --verify
```

---

## Troubleshooting

### Common Issues

**"yt-dlp 403 error"**
- Use yt-dlp with cookies (e.g. `--cookies www.youtube.com_cookies.txt`) and ensure the export is current.

**"Whisper out of memory"**
```bash
WHISPER_MODEL=base ./scripts/training-data/02.transcribe "Channel" "https://youtube.com/..."
```

**"Speaker classification mostly 'unknown'"**
- Check audio features output: `ls data/03.audio-features/<ChannelName>/*.audio_features.json`
- Ensure tonality output exists: `ls data/05.tonality/<ChannelName>/*.tonality.json`

**"Only 1 interaction detected in multi-approach video"**
- Check conversation outputs under `data/07.LLM-conversations/<ChannelName>/...`
- May need to tune prompts in `scripts/training-data/07.LLM-conversations`

### Logs

- Normalized scripts log progress to stdout; redirect to files if needed.
- Ingest state files: `data/.ingest_state.json`, `data/.ingest_state.interactions.json`.

## Future Enhancements

### Learned Ranking
- Track user feedback (thumbs up/down)
- Adjust retrieval weights based on what worked
- A/B test different ranking strategies

### Pattern Discovery
- LLM flags interesting patterns during tagging
- Queue patterns for human review
- Promote reviewed patterns to technique taxonomy
- Continuously expand technique list

### Multi-Language Support
- Whisper already supports multiple languages
- Need translation pipeline for non-English content
- Or separate embeddings per language

### Articles & Books
- Extend pipeline to handle text sources (not just video)
- PDF ingestion for classic daygame books
- Blog post scraping for additional theory content

### Real-Time Processing
- Live transcription during user practice sessions
- Compare user's approach to training data in real-time
- Immediate feedback on technique usage

---

## Appendix: Technique Taxonomy

```json
{
  "techniques": {
    "openers": [
      "direct_opener",
      "observation_opener",
      "opinion_opener",
      "situational_opener"
    ],
    "attraction": [
      "push_pull",
      "tease",
      "cold_read",
      "role_play",
      "disqualification",
      "false_time_constraint"
    ],
    "connection": [
      "qualification",
      "statement_of_intent",
      "vulnerability",
      "storytelling"
    ],
    "physical": [
      "kino_escalation",
      "proximity",
      "eye_contact"
    ],
    "closing": [
      "assumptive_close",
      "number_close",
      "instant_date",
      "bounce"
    ]
  }
}
```

---

*See [TRAINING_TEST.md](./TRAINING_TEST.md) for validation plan and implementation details.*
