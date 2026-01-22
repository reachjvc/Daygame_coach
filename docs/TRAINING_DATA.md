# Training Data Pipeline

**Last Updated:** 2026-01-21

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
./scripts/run_source.sh "NaturalLifestyles/NewPlaylist" "https://youtube.com/playlist?list=..."
```

### Step-by-Step

```bash
# 1. Download videos
./scripts/download_channel.sh "NaturalLifestyles/Infield" "https://youtube.com/..."

# 2. Run full processing pipeline
./scripts/full_pipeline.sh "NaturalLifestyles/Infield"

# 3. Ingest to vector store
./scripts/quick_ingest.sh
```

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
├── sources.yaml                    # Source configuration (see below)
├── techniques.json                 # Technique taxonomy
├── patterns_to_review.jsonl        # Discovered patterns queue
│
├── NaturalLifestyles/              # Channel
│   ├── Infield/                    # Playlist
│   │   ├── raw/                    # Downloaded audio files
│   │   │   ├── Video Title.opus
│   │   │   └── .youtube-dl-archive.txt
│   │   ├── transcripts/            # Whisper outputs
│   │   │   ├── Video Title.txt     # Plain text
│   │   │   ├── Video Title.json    # Timestamps + segments
│   │   │   └── Video Title.srt     # Subtitles
│   │   ├── features/               # Extracted features
│   │   │   └── Video Title.features.json
│   │   ├── interactions/           # Extracted conversations
│   │   │   └── Video Title.interactions.jsonl
│   │   └── speaker_timelines/      # Speaker-separated timestamps
│   │       └── Video Title.speakers.json
│   │
│   ├── Students/                   # Another playlist
│   │   └── ...
│   └── InnerGrowth/
│       └── ...
│
├── SocialStoic/
│   └── Main/
│       └── ...
│
├── processed/                      # Aggregated outputs
│   ├── training_data.jsonl
│   └── scenario_training.jsonl
│
├── validation/                     # Ground truth for testing
│   └── *.ground_truth.json
│
└── logs/
    ├── pipeline-*.log
    └── ingest.log
```

---

## Pipeline Stages

```
┌──────────────────────────────────────────────────────────────────┐
│                         PIPELINE FLOW                             │
└──────────────────────────────────────────────────────────────────┘

1. DOWNLOAD
   └─→ yt-dlp fetches audio from YouTube
   └─→ Output: raw/*.opus

2. TRANSCRIBE
   └─→ Whisper converts audio to text with timestamps
   └─→ Output: transcripts/*.json, *.txt, *.srt

3. DETECT CONVERSATIONS
   └─→ LLM identifies conversation boundaries
   └─→ Separates approaches from commentary
   └─→ Output: transcripts/*.conversations.json

4. CLASSIFY CONTENT
   └─→ Labels segments: infield, theory, intro/outro, transition
   └─→ Output: transcripts/*.classified.json

5. EXTRACT AUDIO FEATURES
   └─→ Pitch, energy, tempo per segment
   └─→ Output: features/*.features.json

6. CLASSIFY SPEAKERS
   └─→ Hybrid: audio features + text patterns + conversation structure
   └─→ Labels: coach, girl, voiceover, unknown
   └─→ Output: features/*.features.json (updated)

7. CLASSIFY TONALITY
   └─→ Playful, confident, warm, nervous, neutral
   └─→ Output: features/*.features.json (updated)

8. TAG SEMANTICS (LLM)
   └─→ Topics: career, hobby, origin, age, etc.
   └─→ Techniques: push_pull, qualification, cold_read, etc.
   └─→ Phases: opener, hook, vibe, close
   └─→ Output: features/*.features.json (updated)

9. EXTRACT INTERACTIONS
   └─→ Groups segments into complete approaches
   └─→ Detects outcomes: number, instagram, rejected, etc.
   └─→ Output: interactions/*.interactions.jsonl

10. ENRICH GROUND TRUTH (NEW)
    └─→ Uses Ollama to analyze interactions deeply
    └─→ Maps turns to transcript line numbers
    └─→ Detects phases with line-level precision
    └─→ Extracts techniques and topics via LLM
    └─→ Identifies commentary sections
    └─→ Output: enriched/*.ground_truth.json

11. GENERATE SPEAKER TIMELINES
    └─→ Coach-only and girl-only timestamps for voice training
    └─→ Output: speaker_timelines/*.speakers.json

12. AGGREGATE
    └─→ Combines all channels into unified dataset
    └─→ Output: processed/training_data.jsonl

13. INGEST TO VECTOR STORE
    └─→ Phase-based chunking
    └─→ Generate embeddings (nomic-embed-text)
    └─→ Store to Supabase
    └─→ Output: Supabase `embeddings` table
```

---

## Source Configuration

### sources.yaml

```yaml
# training-data/sources.yaml
# Defines all video sources with metadata

NaturalLifestyles:
  Infield:
    url: https://youtube.com/playlist?list=PLxxx
    type: coach_infield           # coach_infield, student_infield, talking_head, mixed
    weight: 1.0                   # Retrieval weight (1.0 = normal)
    coaches:
      - James Marshall
      - Liam McRae
      - Shae Matthews
    description: Raw infield footage from coaches

  Students:
    url: https://youtube.com/playlist?list=PLyyy
    type: student_infield
    commentary_by: coach          # Who provides commentary
    weight: 0.7                   # Lower weight for student footage
    coaches:
      - James Marshall
    description: Student pickup footage with coach breakdown

  InnerGrowth:
    url: https://youtube.com/playlist?list=PLzzz
    type: talking_head
    weight: 0.8
    coaches:
      - Shae Matthews
    description: Inner game and psychology content

SocialStoic:
  Main:
    url: https://youtube.com/@SocialStoic/videos
    type: mixed
    weight: 1.0
    coaches:
      - Adam
    description: Infield with commentary interspersed
```

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
  "source": "NaturalLifestyles/Infield/Video Title.txt",
  "embedding": [...],
  "metadata": {
    "channel": "NaturalLifestyles",
    "playlist": "Infield",
    "video_title": "Video Title",
    "coach": "James Marshall",

    "conversation_id": 3,
    "phase": "opener",
    "chunk_index": 0,
    "total_chunks_in_conversation": 4,

    "speakers_present": ["coach", "girl"],
    "tonality": "confident",

    "topics": ["appearance", "walking_style"],
    "topic_values": {},
    "techniques": ["statement_of_intent", "observation_opener"],

    "is_real_example": true,
    "content_type": "infield",
    "source_weight": 1.0
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
  "video": "NaturalLifestyles/Infield/raw/Video.opus",
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

### Primary Scripts

| Script | Purpose |
|--------|---------|
| `run_source.sh` | Full pipeline for new source (download → ingest) |
| `download_channel.sh` | Download videos from YouTube |
| `full_pipeline.sh` | Run all processing steps |
| `quick_ingest.sh` | Ingest to vector store (incremental) |
| `refresh_training_data.sh` | Update all sources from sources.yaml |

### Processing Scripts

| Script | Input | Output |
|--------|-------|--------|
| `transcribe_channel.sh` | raw/*.opus | transcripts/*.json |
| `detect_conversations.py` | transcripts/*.json | transcripts/*.conversations.json |
| `classify_content.py` | transcripts/*.json | transcripts/*.classified.json |
| `batch_extract_features.sh` | raw/*.opus | features/*.features.json |
| `classify_speakers.py` | features/*.features.json | features/*.features.json |
| `classify_tonality.py` | features/*.features.json | features/*.features.json |
| `tag_semantics.py` | features/*.features.json | features/*.features.json |
| `extract_interactions.py` | features/*.features.json | interactions/*.jsonl |
| `enrich_ground_truth.py` | interactions/*.jsonl + transcripts/*.txt | enriched/*.ground_truth.json |
| `generate_training_data.py` | interactions/ | processed/training_data.jsonl |
| `ingest.ts` | transcripts/*.txt | Supabase embeddings |

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
./scripts/download_channel.sh "NaturalLifestyles/NewPlaylist" "https://youtube.com/..."

# Process one playlist only
./scripts/full_pipeline.sh "NaturalLifestyles/NewPlaylist"

# Force full re-ingest (ignore cache)
./scripts/quick_ingest.sh full

# Check what's processed
python3 scripts/check_progress.py

# Validate against ground truth
python3 scripts/validate_extraction.py \
  --ground-truth training-data/validation/video1.ground_truth.json \
  --pipeline-output training-data/interactions/SocialStoic/Main/video1.interactions.jsonl
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
- Check if audio features extracted: `ls features/*.features.json`
- Low quality audio = poor pitch detection
- Run with verbose: `python scripts/classify_speakers.py --verbose`

**"Only 1 interaction detected in multi-approach video"**
- Conversation boundary detection failing
- Check `transcripts/*.conversations.json` exists
- May need to tune LLM prompts in `detect_conversations.py`

### Logs

```bash
# Watch pipeline progress
tail -f training-data/logs/pipeline-*.log

# Check ingest status
tail -f training-data/logs/ingest.log

# Find errors
grep -i error training-data/logs/*.log
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
