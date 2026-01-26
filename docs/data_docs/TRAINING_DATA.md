# Training Data Pipeline

**Last Updated:** 2026-01-22 21:55:23

This document describes how the daygame-coach training data pipeline works: downloading videos, transcribing, segmenting, extracting features, and ingesting into Supabase for RAG-based retrieval.

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
# Download + transcribe + process + ingest a new source
./scripts/run_source.sh "NaturalLifestyles-Infield" "https://youtube.com/playlist?list=..."
```

### Step-by-Step

```bash
# 1. Download videos
./scripts/download_channel.sh "NaturalLifestyles-Infield" "https://youtube.com/..."

# 2. Process the channel (transcribe → classify → features → interactions)
./scripts/process_channel.sh "NaturalLifestyles-Infield"

# 3. Ingest to vector store
./scripts/quick_ingest.sh
```

Notes:
- `./scripts/full_pipeline.sh "<Channel>"` already runs ingestion at the end; running `quick_ingest.sh` right after will usually print “✅ Nothing to ingest.”
- Use `./scripts/run_full_pipeline.sh --channel "<Channel>" --resume` if you want the resumable pipeline + LLM stages (conversation detection + enrichment). It does **not** ingest — run `quick_ingest.sh` after.

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
training-data/
├── sources.txt                     # Source configuration (ChannelName|YouTubeURL)
│
├── raw-audio/<ChannelName>/         # Downloaded audio files (yt-dlp)
│   ├── Video Title.webm
│   └── .youtube-dl-archive.txt
│
├── transcripts/<ChannelName>/       # Whisper outputs
│   ├── Video Title.json             # Timestamps + segments
│   ├── Video Title.txt              # Plain text
│   ├── Video Title.srt              # Subtitles
│   ├── Video Title.vtt              # WebVTT
│   └── Video Title.tsv              # Token-level timestamps
│
├── classified/<ChannelName>/        # Content classification
│   └── Video Title.classified.json
│
├── features/<ChannelName>/          # Extracted audio/text features (in-place updates)
│   └── Video Title.features.json
│
├── interactions/<ChannelName>/      # (legacy) Extracted conversations
│   └── Video Title.interactions.jsonl
│
├── enriched/<ChannelName>/          # LLM-enriched ground truth (optional)
│   └── Video Title.ground_truth.json
│
├── processed/                       # Aggregated outputs (optional / legacy)
│   ├── training_data.jsonl
│   └── scenario_training.jsonl
│
├── validation/                      # Ground truth for testing
│   └── *.ground_truth.json
│
├── pipeline_status.json             # Progress tracking for run_full_pipeline.sh
├── .ingest_state.json               # Incremental ingest state (transcripts mode)
├── .ingest_state.interactions.json  # Incremental ingest state (interactions mode, optional)
│
├── ingest.log
├── pipeline-*.log
└── download-*.log / download-*-issues.tsv
```

Note: The normalized step scripts in `scripts/training-data/` write outputs under `data/` (including `data/08.interactions/...`).

---

## Pipeline Stages

```
┌──────────────────────────────────────────────────────────────────┐
│                         PIPELINE FLOW                             │
└──────────────────────────────────────────────────────────────────┘

1. DOWNLOAD
   └─→ yt-dlp fetches audio from YouTube
   └─→ Output: raw-audio/<ChannelName>/*.(webm|opus|m4a|mp3|wav|mp4|mkv)

2. TRANSCRIBE
   └─→ Whisper converts audio to text with timestamps
   └─→ Output: transcripts/<ChannelName>/*.json + *.txt + *.srt + *.vtt + *.tsv

3. CLASSIFY CONTENT
   └─→ Labels segments: infield, theory, intro/outro, transition
   └─→ Output: classified/<ChannelName>/*.classified.json

4. EXTRACT AUDIO FEATURES
   └─→ Pitch, energy, tempo per segment
   └─→ Output: features/<ChannelName>/*.features.json

5. CLASSIFY SPEAKERS
   └─→ Hybrid: audio features + text patterns + conversation structure
   └─→ Labels: coach, girl, voiceover, unknown
   └─→ Output: features/*.features.json (updated)

6. CLASSIFY TONALITY
   └─→ Playful, confident, warm, nervous, neutral
   └─→ Output: features/*.features.json (updated)

7. DETECT CONVERSATIONS (LLM, optional)
   └─→ LLM identifies conversation boundaries + assigns conversation_id
   └─→ Output: features/<ChannelName>/*.features.json (updated)

8. EXTRACT INTERACTIONS
   └─→ Groups segments into complete approaches
   └─→ Detects outcomes: number, instagram, rejected, etc.
   └─→ Output: data/08.interactions/<ChannelName>/**/*.interactions.jsonl

9. ENRICH GROUND TRUTH (LLM, optional)
    └─→ Uses Ollama to analyze interactions deeply
    └─→ Maps turns to transcript line numbers
    └─→ Detects phases with line-level precision
    └─→ Extracts techniques and topics via LLM
    └─→ Identifies commentary sections
    └─→ Output: enriched/<ChannelName>/*.ground_truth.json

10. AGGREGATE (legacy)
    └─→ Combines all channels into unified dataset
    └─→ Output: processed/training_data.jsonl

11. INGEST TO VECTOR STORE
    └─→ Phase-based chunking
    └─→ Generate embeddings (nomic-embed-text)
    └─→ Store to Supabase
    └─→ Output: Supabase `embeddings` table

Required env (in `.env.local` or exported):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use `./scripts/training-data/final_pipeline "<source_name>" "<youtube_url>"` to run steps 01‑09 for that source, regenerate `training-data/processed/training_data.jsonl`, and then perform the ingest (step 11). Pass `--sources docs/sources.txt` to iterate the entire source list, or drop into `--skip-ingest`, `--ingest-full`, `--ingest-mode`, `--ingest-dry-run`, `--ingest-verify`, and `--ingest-arg` as needed before the ingestion step (implemented by `./scripts/training-data/10.ingest.ts`, alias: `npm run ingest`).
```

---

## Source Configuration

### sources.txt

```text
# docs/sources.txt
# Format (one per line):
#   ChannelName|YouTubeURL
#
# Notes:
# - ChannelName becomes the folder name under data/<step>/ and legacy training-data/<stage>/ outputs
# - YouTubeURL can be a channel, playlist, or single video URL
# - Lines starting with # are ignored

SocialStoic|https://www.youtube.com/@SocialStoicYouTube
NaturalLifestyles-Infield|https://www.youtube.com/playlist?list=PLxxx
NaturalLifestyles-InnerGrowth|https://www.youtube.com/playlist?list=PLyyy
```

The current pipeline reads this file directly (see `scripts/full_pipeline.sh`). The normalized step scripts also default to it via `--sources`.

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
  "source_playlist": "SocialStoic",
  "content_type": "mixed",
  "transcript_file": "training-data/transcripts/SocialStoic/Video.txt",

  "interactions": [
    {
      "id": 1,
      "type": "approach",
      "description": "Redhead approach - front stop demonstration",
      "start_line": 20,
      "end_line": 28,
      "start_time_approx": "1:00",
      "end_time_approx": "1:28",
      "phases": {
        "opener": { "start_line": 20, "end_line": 23 },
        "hook": { "start_line": 24, "end_line": 28 },
        "vibe": null,
        "close": null
      },
      "outcome": "unknown",
      "topics_mentioned": ["appearance", "hair", "eyes"],
      "techniques_used": ["direct_opener", "front_stop", "observation"]
    },
    {
      "id": 2,
      "type": "commentary",
      "description": "Coach explains front stop vs side stop",
      "start_line": 29,
      "end_line": 47
    }
  ],

  "summary": {
    "total_interactions": 13,
    "total_commentary_sections": 8,
    "approaches_with_outcome": { "number": 1, "instant_date": 1, "blowout": 2 },
    "techniques_demonstrated": ["front_stop", "push_pull", "cold_read", ...]
  }
}
```

### Running Enrichment

```bash
# Single video
python3 scripts/enrich_ground_truth.py \
  --interactions training-data/interactions/SocialStoic/Video.interactions.jsonl \
  --transcript training-data/transcripts/SocialStoic/Video.txt

# All videos in a channel (recommended: use 1-2 workers to avoid rate limits)
python3 scripts/enrich_ground_truth.py --channel SocialStoic --workers 2

# All channels (run in separate terminals for parallelism)
python3 scripts/enrich_ground_truth.py --channel SocialStoic --workers 1
python3 scripts/enrich_ground_truth.py --channel NaturalLifestyles-Infield --workers 1
# etc.

# Or process everything sequentially
python3 scripts/enrich_ground_truth.py --all --workers 1
```

### Verifying Scripts Are Working

When running enrichment scripts in parallel across multiple terminals, here's how to confirm they're generating data:

**1. Watch the terminal output** - Each script will print progress like:
```
Processing video 1/15: "Video Title Here"
  → Found 5 interactions
  → Enriching with Ollama...
  → Saved to training-data/enriched/SocialStoic/Video.ground_truth.json
```

**2. Check the output directory** - New `.ground_truth.json` files appear as each video completes:
```bash
# Watch for new files being created
ls -lt training-data/enriched/*/  | head -20

# Count total enriched files per channel
find training-data/enriched -name "*.ground_truth.json" | wc -l
```

**3. Monitor in real-time** - Use watch to see files appear:
```bash
watch -n 5 'find training-data/enriched -name "*.ground_truth.json" -mmin -1'
```

**4. Check file contents** - Verify a generated file looks correct:
```bash
# Pretty-print the latest generated file
cat training-data/enriched/SocialStoic/*.ground_truth.json | head -100
```

**5. If nothing is happening** - Check for errors:
- Ollama must be running: `ollama serve` (in a separate terminal)
- Verify interactions exist: `ls training-data/interactions/*/`
- Check for Python errors in the terminal output

### Validation

Compare enriched output against manually created ground truth:

```bash
python3 scripts/validate_extraction.py \
  --ground-truth training-data/validation/video1_ground_truth.json \
  --pipeline-output training-data/enriched/SocialStoic/Video.ground_truth.json
```

---

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
  "video": "training-data/raw-audio/NaturalLifestyles-Infield/Video.webm",
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

The recommended way to process training data is the new unified pipeline script with progress tracking and resume capability:

```bash
# Process all files in a channel (with progress tracking)
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield

# Process a single file (for testing)
./scripts/run_full_pipeline.sh --file "training-data/raw-audio/Channel/Video.webm"

# Resume from where you left off (skips completed stages)
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --resume

# Skip LLM steps for faster testing (conversations, enrichment)
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --no-llm

# Re-run from a specific stage
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --from-stage conversations

# Show progress status only
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --status-only

# Limit number of files to process
./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --limit 5
```

**Pipeline Stages:**
1. `transcription` - Whisper audio-to-text
2. `classification` - Content type labeling (intro/infield/theory/outro)
3. `features` - Audio feature extraction (pitch, energy, tempo)
4. `speakers` - Speaker classification (coach vs girl)
5. `tonality` - Tonality classification (playful, confident, etc.)
6. `conversations` - Conversation boundary detection (LLM - Ollama)
7. `interactions` - Group segments into complete approaches
8. `enrichment` - Deep analysis with techniques/topics (LLM - Ollama)

**Progress Tracking:**
- Status saved to `training-data/pipeline_status.json`
- Ctrl+C safely interrupts and saves progress
- Resume later with `--resume` flag
- View progress anytime with `--status-only`

**Time Estimates (with local Ollama):**
- Small file (50 segments): 2-3 minutes
- Medium file (500 segments): 15-30 minutes
- Full channel (50 files): 5-15 hours
- 500 files: 2-5 days

### Legacy Primary Scripts

| Script | Purpose |
|--------|---------|
| `run_source.sh` | Full pipeline for new source (download → ingest) |
| `download_channel.sh` | Download videos from YouTube |
| `full_pipeline.sh` | Run all processing steps (legacy, use run_full_pipeline.sh instead) |
| `quick_ingest.sh` | Ingest to vector store (incremental) |
| `refresh_training_data.sh` | Update all sources from `docs/sources.txt` |

### Processing Scripts

#### Training-data Step Scripts (Normalized)

These scripts live in `scripts/training-data/` and write outputs under `data/`:

| Step | Script | Reads | Writes |
|------|--------|-------|--------|
| 01 | `01.download` | YouTube URL(s) | `data/01.download/<source>/<video>/*` |
| 02 | `02.transcribe` | `data/01.download/<source>/<video>/*.wav` | `data/02.transcribe/<source>/<video>/*.{json,txt,srt,vtt,tsv}` |
| 03 | `03.audio-features` | `data/01.download` + `data/02.transcribe` | `data/03.audio-features/<source>/<video>/*.features.json` |
| 04 | `04.content` | `data/02.transcribe/<source>/<video>/*.json` | `data/04.content/<source>/<video>/*.classified.json` |
| 05 | `05.tonality` | `data/03.audio-features/<source>/**/*.features.json` | `data/05.tonality/<source>/**/*.tonality.json` |
| 06 | `06.speakers` | `data/05.tonality/<source>/**/*.tonality.json` | `data/06.speakers/<source>/**/*.tonality.json` |
| 07 | `07.LLM-conversations` | `data/06.speakers/<source>/**/*.json` | `data/07.LLM-conversations/<source>/**/*.conversations.json` |
| 08 | `08.interactions` | `data/07.LLM-conversations/<source>/**/*.conversations.json` | `data/08.interactions/<source>/<video>/*.interactions.jsonl` |
| 09 | `09.enrich` | `data/08.interactions/<source>/<video>/*.interactions.jsonl` | `data/09.enrich/<source>/<video>/*.enriched.json` |

#### Final Pipeline Entry Point

`./scripts/training-data/final_pipeline` runs steps 01‑09 for a single video/playlist/channel or for every entry listed in `docs/sources.txt`. After the processing steps finish it regenerates `training-data/processed/training_data.jsonl` and then runs `./scripts/training-data/10.ingest.ts` (step 11, alias: `npm run ingest`). Pass `--skip-ingest` to stop before embeddings are written, `--ingest-full` to force a full reingest, `--ingest-mode interactions` to target interaction chunks, or `--ingest-dry-run`/`--ingest-verify` for dry-run checks; any flag you pass with `--ingest-arg` is forwarded verbatim to `./scripts/training-data/10.ingest.ts`.

| Script | Input | Output |
|--------|-------|--------|
| `transcribe_channel.sh` | `raw-audio/<ChannelName>/*` | `transcripts/<ChannelName>/*.{json,txt,srt,vtt,tsv}` |
| `classify_content.py` | `transcripts/<ChannelName>/*.json` | `classified/<ChannelName>/*.classified.json` |
| `batch_extract_features.sh` | `raw-audio/<ChannelName>/*` + timestamps | `features/<ChannelName>/*.features.json` |
| `classify_speakers.py` | features/*.features.json | features/*.features.json |
| `classify_tonality.py` | features/*.features.json | features/*.features.json |
| `07.LLM-conversations` | `data/06.speakers/<ChannelName>/*.json` | `data/07.LLM-conversations/<ChannelName>/*.conversations.json` |
| `tag_semantics.py` | `features/<ChannelName>/*.features.json` | `features/<ChannelName>/*.features.json` (updated) |
| `08.interactions` | `data/07.LLM-conversations/<ChannelName>/**/*.conversations.json` | `data/08.interactions/<ChannelName>/**/*.interactions.jsonl` |
| `enrich_ground_truth.py` | `interactions/<ChannelName>/*.interactions.jsonl` + `transcripts/<ChannelName>/*.txt` | `enriched/<ChannelName>/*.ground_truth.json` |
| `generate_training_data.py` | `features/` | `processed/training_data.jsonl` |
| `10.ingest.ts` | `transcripts/` or `interactions/` | Supabase `embeddings` table |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `validate_extraction.py` | Compare pipeline output to ground truth |
| `check_progress.py` | Show processing status |
| `verify_pipeline.py` | Verify JSONL validity |
| `check_youtube_cookies.sh` | Verify YouTube cookie authentication |
| `clean_transcriptions.sh` | Auto-fix common transcription errors |

### Usage Examples

```bash
# Download a specific playlist
./scripts/download_channel.sh "NaturalLifestyles-NewPlaylist" "https://youtube.com/..."

# Process one playlist only
./scripts/full_pipeline.sh "NaturalLifestyles-NewPlaylist"

# Force full re-ingest (ignore cache)
./scripts/quick_ingest.sh full

# Check what's processed
python3 scripts/check_progress.py

# Validate against ground truth
python3 scripts/validate_extraction.py \
  --ground-truth training-data/validation/video1.ground_truth.json \
  --pipeline-output "training-data/interactions/SocialStoic/video1.interactions.jsonl"
```

---

## Troubleshooting

### Common Issues

**"yt-dlp 403 error"**
```bash
# Check cookie authentication
./scripts/check_youtube_cookies.sh ./www.youtube.com_cookies.txt "VIDEO_URL"

# Re-export cookies from browser while logged in
# Cookie file needs LOGIN_INFO to access age-restricted content
```

**"Whisper out of memory"**
```bash
# Use smaller model
WHISPER_MODEL=base ./scripts/transcribe_channel.sh "Channel"

# Or process fewer files at once
```

**"Ollama connection refused"**
```bash
ollama serve
ollama list  # Verify models are pulled
```

**"Speaker classification mostly 'unknown'"**
- Check if audio features extracted: `ls training-data/features/<ChannelName>/*.features.json`
- Low quality audio = poor pitch detection
- Run with verbose: `python scripts/classify_speakers.py --verbose`

**"Only 1 interaction detected in multi-approach video"**
- Conversation boundary detection failing
- Check that conversation detection has run (LLM stage) and updated the features JSON (e.g. `conversation_summary` / `conversation_id` fields)
- May need to tune LLM prompts in `scripts/training-data/07.LLM-conversations`

### Logs

```bash
# Watch pipeline progress
tail -f training-data/pipeline-*.log

# Check ingest status
tail -f training-data/ingest.log

# Find errors
grep -i error training-data/*.log
```

---

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
