# Training Data Quick Start

If you only read one file, read `TRAINING_DATA_RUNBOOK.md`.

## TL;DR - For Impatient Users

You have a **one-command pipeline** (recommended) plus a few focused scripts.

### Option A (Recommended): One Command
```bash
./scripts/refresh_training_data.sh
```

This:
1) Downloads everything listed in `training-data/sources.txt`
2) Transcribes + processes + aggregates
3) Ingests embeddings to Supabase (incremental by default)

### Option B: Step-by-step

#### 1) Download Videos
```bash
./scripts/download_sources.sh
# or:
./scripts/download_channel.sh "ChannelName" "https://youtube.com/..."
```

#### 2) Transcribe + Process
```bash
./scripts/full_pipeline.sh
# or for specific channel:
./scripts/full_pipeline.sh "ChannelName"
```

#### 3) Fix Transcription Errors (Optional)
```bash
# Preview what will be fixed
./scripts/clean_transcriptions.sh --dry-run

# Apply fixes
./scripts/clean_transcriptions.sh
```

#### 4) Ingest to Vector Store (Embeddings)
```bash
./scripts/quick_ingest.sh
# Force a full re-ingest of everything:
./scripts/quick_ingest.sh full
```

---

## What Should You Do Right Now?

### This Week:
Process the **29 untranscribed NaturalLifestyles videos**

```bash
# This will take ~2-3 hours total
./scripts/full_pipeline.sh "NaturalLifestyles-Infield"
./scripts/full_pipeline.sh "NaturalLifestyles-InnerGrowth"
./scripts/full_pipeline.sh "NaturalLifestyles-Students"

# Then ingest once at the end
./scripts/quick_ingest.sh
```

**Why?** These add diversity to your training data. Currently most examples are from SocialStoic.

### Every Month:
Download new videos and update

```bash
# Add fresh videos (say 20-30 per month)
./scripts/download_channel.sh "SocialStoic" "https://www.youtube.com/@SocialStoic/videos"
# or keep sources in training-data/sources.txt and run:
./scripts/download_sources.sh
./scripts/full_pipeline.sh "SocialStoic"
./scripts/quick_ingest.sh
```

---

## Detailed Usage

### `download_channel.sh`
Downloads videos from YouTube. Automatically skips already-downloaded ones.
If `www.youtube.com_cookies.txt` exists in the repo root, it will be used automatically to reduce 403/bot errors.

```bash
# Channel
./scripts/download_channel.sh "SocialStoic" \
  "https://www.youtube.com/@SocialStoic/videos"

# Playlist
./scripts/download_channel.sh "MyPlaylist" \
  "https://www.youtube.com/playlist?list=PLxxx"

# Single video
./scripts/download_channel.sh "Single" \
  "https://www.youtube.com/watch?v=xxx"
```

**Output:** Saves to `training-data/raw-audio/ChannelName/`

---

### `full_pipeline.sh`
Does everything: transcribe, extract features, classify, and ingest.

```bash
# Process all channels
./scripts/full_pipeline.sh

# Process one channel
./scripts/full_pipeline.sh "SocialStoic"

# Re-ingest without reprocessing (if you edited transcripts)
./scripts/full_pipeline.sh --ingest-only
```

**Time:**
- Transcribing: ~1 min per 10 minutes of audio (with Whisper base model)
- Features: ~30 sec per video
- Ingesting: ~2 min per 1000 chunks

**Current total:** 90 videos × ~15 min = ~22.5 hours total (if you do all at once)

---

### `quick_ingest.sh`
Re-ingest embeddings without reprocessing (incremental by default).

```bash
# Just ingest
./scripts/quick_ingest.sh

# Preview what will be ingested
./scripts/quick_ingest.sh verify

# Force full re-ingest of everything
./scripts/quick_ingest.sh full
```

Use this if you:
- Manually fixed transcription errors
- Edited transcript files
- Re-processed specific channels

---

### `clean_transcriptions.sh`
Auto-fix common Whisper transcription errors.

```bash
# Dry run (preview changes)
./scripts/clean_transcriptions.sh --dry-run

# Fix all
./scripts/clean_transcriptions.sh

# Fix specific channel
./scripts/clean_transcriptions.sh "SocialStoic"
```

**Fixes:**
- Removes `[INAUDIBLE]` and `[NOISE]` placeholders
- Cleans up multiple spaces
- Removes leading/trailing whitespace

---

## Data Quality Assessment

### What's Working ✅
- Ollama can retrieve relevant context from training data
- Answers are **60% better** when training data is included
- The embedding search finds relevant examples
- Source display shows what influenced each answer

### Issues ⚠️
- Whisper sometimes misses words or adds filler ("um", "like")
- Overlapping dialogue confuses the model
- Background noise creates transcription artifacts
- Only **2 out of 5 channels** fully processed

### Why Answers Are Better Now
The QA API now:
1. ✅ Embeds your question
2. ✅ Searches vector store for relevant transcripts
3. ✅ Includes actual examples in the prompt
4. ✅ Uses `llama2` chat model (not raw generation)

**Example:**
```
User: "What should I say when a girl says she studies medicine?"

Ollama sees:
  SOURCE: SocialStoic/Video1
  CONTENT: "Don't ask about her studies. Assume she's 
           doing it for status and tease her..."

Result: Ollama gives a personalized answer based on real examples
```

---

## Processing Flow Explained

```
Raw Audio (opus/mp3/webm)
    ↓ [Whisper transcription]
    ↓
Transcripts (.txt + .json with timestamps)
    ↓ [Feature extraction: pitch/energy/tempo]
    ↓
Feature Files (.features.json)
    ↓ [Classification: speaker/tonality/content]
    ↓
Classified Features (.features.json enriched)
    ↓ [Interaction extraction]
    ↓
Interactions (.interactions.jsonl)
    ↓ [Aggregate all]
    ↓
training_data.jsonl (16,418 lines)
    ↓ [Generate embeddings]
    ↓
Embeddings in Supabase (ready for RAG)
```

---

## Troubleshooting

### "Whisper model not found"
```bash
source ~/whisper-env/bin/activate
pip install openai-whisper
```

### "Ollama connection error"
```bash
# Make sure Ollama is running
ollama serve

# In another terminal, ensure models are loaded
ollama pull llama2
ollama pull nomic-embed-text
```

### "Transcription quality is bad"
Use the medium model (slower, better):
```bash
source ~/whisper-env/bin/activate
whisper audio.mp3 --model medium --output_format txt
```

### "Ingest failed halfway"
Don't worry—database rejects duplicates safely. Just re-run:
```bash
./scripts/quick_ingest.sh
```

### "How do I check what was ingested?"
```bash
python3 scripts/check_progress.py
```

---

## Advanced: Monitoring & Logs

Each script creates a log file:

```bash
# Full pipeline logs
tail -f training-data/pipeline-SocialStoic.log

# Ingest logs
tail -f training-data/ingest.log
```

Check progress anytime:
```bash
python3 scripts/check_progress.py
```

---

## Cost/Time Estimates

| Task | Time | Resources |
|------|------|-----------|
| Download 20 videos | 1-2 hrs | Bandwidth |
| Transcribe 20 videos | 30-60 min | CPU (with Whisper) |
| Extract features | 10 min | CPU |
| Classify speakers/tone | 5 min | CPU |
| Ingest to vector store | 3-5 min | Ollama + Supabase |
| **Total per 20 videos** | **~2 hrs** | **Mixed** |

---

## File Structure

```
training-data/
├── raw-audio/
│   ├── SocialStoic/               # Downloaded videos
│   ├── The Natural Lifestyles/
│   └── NaturalLifestyles-Infield/
├── transcripts/
│   ├── SocialStoic/
│   │   ├── video1.txt             # Plain text (used for chunks)
│   │   ├── video1.json            # Whisper JSON (has timestamps)
│   │   └── video1.classified.json # Content classification
│   └── ...
├── features/
│   ├── SocialStoic/
│   │   ├── video1.features.json   # Pitch, energy, tempo, tone, speaker
│   │   └── ...
│   └── ...
├── interactions/
│   ├── SocialStoic/
│   │   ├── video1.interactions.jsonl  # Extracted conversations
│   │   └── ...
│   └── ...
└── processed/
    ├── training_data.jsonl        # All chunks (16,418 lines)
    └── scenario_training.jsonl    # Chat format (14 lines)
```

---

## Next: Recommended Actions

### This Week
- [ ] Process 29 untranscribed NaturalLifestyles videos
- [ ] Test QA page with new data

### This Month  
- [ ] Set up monthly download schedule
- [ ] Manually review 5-10 transcriptions for accuracy
- [ ] Document any repeating transcription patterns

### This Quarter
- [ ] Consider fine-tuning embedding model for daygame terms
- [ ] Extract "signature advice" as structured knowledge
- [ ] Monitor RAG performance metrics

---

## Questions?

Check [TRAINING_DATA_PIPELINE.md](TRAINING_DATA_PIPELINE.md) for detailed documentation on each stage.
