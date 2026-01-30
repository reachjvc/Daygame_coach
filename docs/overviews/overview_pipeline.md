# Pipeline Overview

Status: Draft
Updated: 29-01-2026 21:25 [BY GOD]
Updated: 29-01-2026 21:15

## CRITICAL RULES THAT YOU ALWAYS FOLLOW
You must ALWAYS test if quality meet desired levels. INFORM me ANY DIVERGE.
1) for each of the steps of the pipeline, you must SAMPLE them and check their quality. IF IN DOUBT ask the user how to validate the quality. 


## Goal

Transform raw YouTube videos of daygame coaches into structured training data for an AI coach. The training data will serve these purposes: (a) QA, answered by LLM, on the data [and answer questions such as "what to say when a girl says she studies medicine"], (b) scenarios such as openers, careers, shittests, hooks, vibing etc., where training data will inform LLM about how to evaluate users. (c) general principles we can draw from the training-data for use around the platform.

Extract not just what was said, but how it was said (tone, confidence) and who said it (coach vs target). 

END GOAL: structured training data, where we understand each video. What part of the video was talking head, what part was an actual approach [some videos are only talking head]. 

## Pipeline Steps

```
01.download → 02.transcribe → 03.audio-features → 05.tonality → 06.speakers → 07.LLM-conversations → 08.interactions → 09.enrich → 10.ingest
```

| Step | Input | Output | Purpose |
|------|-------|--------|---------|
| **01.download** | YouTube URL | .wav + metadata | Download audio from videos |
| **02.transcribe** | .wav | .json (Whisper) | Speech-to-text with timestamps |
| **03.audio-features** | 01.wav + 02.json | .audio_features.json | Extract pitch, energy, tempo, spectral features per segment |
| **04.content** | 02.json | .classified.json | Content classification (ORPHANED - not in main flow) |
| **05.tonality** | 03.json | .tonality.json | Classify tone (playful, confident, nervous, etc.) per window |
| **06.speakers** | 05.json | .tonality.json | Label who is speaking: coach, target, or voiceover |
| **07.LLM-conversations** | 06.json | .conversations.json | Detect conversation boundaries, label segments as approach/commentary |
| **08.interactions** | 07.json | .interactions.jsonl | Extract individual interactions |
| **09.enrich** | 08.jsonl | .enriched.json | Add metadata, quality scores |
| **10.ingest** | 02.txt + 09.json | Database | Load into app database |

## Data Accumulation

Each step reads the previous step's output and adds new fields. By step 07, each segment contains:

```json
{
  "start": 0.0,
  "end": 6.7,
  "text": "excuse me, quick question...",
  "features": { "pitch": {...}, "energy": {...}, "spectral": {...} },
  "tone_window_id": 0,
  "speaker": { "label": "coach", "confidence": 0.85 },
  "conversation_id": 1,
  "segment_type": "approach",
  "boundary_detection": { "is_new_conversation": true, "confidence": 0.9 }
}
```

## Current Issues

### 1. Step 04 is orphaned
`04.content` reads directly from step 02 and nothing reads its output. Either dead code or missing integration.

### 2. Step 07 has silent fallback
If step 06 output doesn't exist, step 07 silently falls back to step 03. This masks broken upstream steps.

### 3. No pipeline validation
No checks that each step's output exists before running the next step. Failures can go unnoticed.

### 4. Step 06 reliability unknown
Recently discovered that step 06 may not be working correctly. Needs investigation.

## Running the Pipeline

Single video:
```bash
./scripts/training-data/01.download "source_name" "https://youtube.com/watch?v=..."
./scripts/training-data/02.transcribe "source_name" "https://youtube.com/watch?v=..."
# ... continue for each step
```

Batch from sources file:
```bash
./scripts/training-data/01.download --sources docs/sources.txt
```

## Data Locations

```
data/
├── 01.download/          # Raw audio files
├── 02.transcribe/        # Whisper transcripts
├── 03.audio-features/    # Audio analysis
├── 04.content/           # Content classification (orphaned)
├── 05.tonality/          # Tone windows
├── 06.speakers/          # Speaker labels
├── 07.LLM-conversations/ # Conversation boundaries
├── 08.interactions/      # Extracted interactions
├── 09.enrich/            # Enriched data
└── 10.ingest/            # (writes to database)
```
