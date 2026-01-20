# Training Data Pipeline - Complete Guide

## Current Status (as of Jan 18, 2026)

```
CHANNEL                        | AUDIO  | TRANS  | FEAT   | INT   
-------------------------------------------------------------------
NaturalLifestyles-Infield      | 20     | 0      | 0      | 0     
NaturalLifestyles-InnerGrowth  | 7      | 0      | 0      | 0     
NaturalLifestyles-Students     | 2      | 2      | 0      | 0     
SocialStoic                    | 37     | 74     | 34     | 34    
The Natural Lifestyles         | 24     | 48     | 5      | 5     
-------------------------------------------------------------------
Final: 16,418 lines in training_data.jsonl
```

### Data Quality Assessment

✅ **What's working:**
- Embeddings are being retrieved properly (you see sources in the thought process)
- Ollama can understand the context when it's present
- Answers are significantly better when training data is included
- The vector store search is finding relevant content

⚠️ **Transcription Issues:**
- Whisper sometimes misses words or adds filler text ("um", "uh", "like")
- Overlapping dialogue can confuse the model
- Background noise creates artifacts
- These errors dilute embeddings slightly, but aren't fatal

🔄 **Data Coverage Gap:**
- NaturalLifestyles channels (29 videos) are mostly untranscribed
- Only SocialStoic (37 videos) and some Natural Lifestyles (24 videos) are fully processed
- More raw audio = better training foundation after processing

---

## The Full Pipeline (5 Stages)

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

---

## What Gets Produced (Two Outputs)

### 1) Embeddings for RAG (Used by the App)
- **Input:** `training-data/transcripts/**/*.txt`
- **Chunking:** `transcript-loader.ts` + `transcript-segmenter.ts`
- **Output:** Supabase `embeddings` table (semantic search)
- **Run:** `./scripts/quick_ingest.sh` (incremental) or `./scripts/quick_ingest.sh full`
- **State file:** `training-data/.ingest_state.json` (tracks which sources changed)

### 2) Datasets for Training/Analysis (Audio + Labels)
- **Input:** Whisper `.json` + audio files
- **Output:** `training-data/processed/training_data.jsonl` (segments + tone/features) and `training-data/processed/scenario_training.jsonl` (chat examples)
- **Run:** `./scripts/process_channel.sh "ChannelName"` or `./scripts/full_pipeline.sh`

---

## How To: Continuous Training Data Flow

### Option A: Process One Channel at a Time (Recommended)

Use this for incremental updates without blocking the system.

```bash
# 1. Download new videos for a channel
./scripts/download_channel.sh "ChannelName" "https://www.youtube.com/@ChannelHandle/videos"

# 2. Process the channel completely (includes Whisper transcription)
./scripts/process_channel.sh "ChannelName"

# 3. Ingest to vector store (incremental)
./scripts/quick_ingest.sh
```

### Option B: Fully Automated Pipeline (Batch Mode)

Use the built-in batch scripts:

```bash
# Download everything in training-data/sources.txt
./scripts/download_sources.sh

# Transcribe + process + ingest
./scripts/full_pipeline.sh

# Or: one command to do both
./scripts/refresh_training_data.sh
```

### Option C: Watch Mode (Continuous Monitoring)

Monitor for new files and re-ingest automatically:

```bash
#!/bin/bash
# scripts/watch_and_ingest.sh

set -euo pipefail

LAST_INGEST=$(date +%s)
CHECK_INTERVAL=300  # 5 minutes

echo "👀 Watching training-data/ for changes..."

while true; do
  # Find files modified in the last 5 minutes
  MODIFIED=$(find training-data -type f -mmin -5 2>/dev/null | wc -l)
  
  if [ "$MODIFIED" -gt 0 ]; then
    echo "[$(date)] 🔄 Found $MODIFIED modified files, re-ingesting..."
    ./scripts/quick_ingest.sh
  fi
  
  sleep "$CHECK_INTERVAL"
done
```

---

## Stage-by-Stage Details

### Stage 1: Download Videos

**Tools:** youtube-dl or yt-dlp

```bash
# Download entire channel
youtube-dl -f best \
  -o "training-data/raw-audio/ChannelName/%(title)s.%(ext)s" \
  "https://www.youtube.com/@ChannelHandle/videos"

# Download specific playlist
youtube-dl -f best \
  -o "training-data/raw-audio/ChannelName/%(title)s.%(ext)s" \
  "https://www.youtube.com/playlist?list=PLxxxxxxx"

# Download last 10 videos from a channel
youtube-dl -f best \
  -o "training-data/raw-audio/ChannelName/%(title)s.%(ext)s" \
  --max-downloads 10 \
  "https://www.youtube.com/@ChannelHandle/videos"
```

**Output:** `.opus`, `.mp3`, `.webm` files in `training-data/raw-audio/ChannelName/`

---

### Stage 2: Transcribe with Whisper

**Run automatically by `process_channel.sh`**

```bash
# If running manually:
./scripts/transcribe_channel.sh "SocialStoic"

# Better accuracy (slower):
WHISPER_MODEL=medium ./scripts/transcribe_channel.sh "SocialStoic"
```

**Output:** `.json` (with timestamps), `.txt` (plain text) in `training-data/transcripts/ChannelName/`

**Quality Tips:**
- Use `--model medium` for better accuracy (slower)
- Use `--model base` for speed
- Whisper sometimes hallucinates on silence—clean up manually if needed

---

### Stage 3: Extract Audio Features

**Run automatically by `process_channel.sh`**

```bash
# Extract pitch, energy, tempo, spectral features
./scripts/batch_extract_features.sh "ChannelName"
```

**Creates:** `.features.json` files with:
- `pitch`: mean_hz, range_hz, std_hz, direction
- `energy`: mean_db, rms_db, peak_db
- `tempo`: syllable_rate, pause_duration
- `spectral`: brightness, centroid, rolloff

---

### Stage 4: Classification (Speaker, Tonality, Content)

**Run automatically by `process_channel.sh`**

The pipeline adds metadata:

```python
# Speaker Classification
{
  "speaker": "coach",  # or "target", "voiceover", "unknown"
  "confidence": 0.95,
  "reasons": ["low_pitch", "confident_energy"]
}

# Tonality Classification
{
  "tone": "playful",   # or "confident", "warm", "nervous", "neutral"
  "confidence": 0.87,
  "scores": {
    "playful": 8,
    "confident": 4,
    "warm": 2,
    "nervous": 0,
    "neutral": 1
  }
}

# Content Classification
{
  "content_type": "infield",  # or "theory", "intro", "outro"
  "confidence": 0.92
}
```

---

### Stage 5: Aggregate & Ingest

Aggregation happens at the end of `process_channel.sh`. Embedding ingestion is run via `full_pipeline.sh` or `quick_ingest.sh` (incremental by default).

```bash
# Manually aggregate all processed data
python scripts/generate_training_data.py \
  --input "training-data/features" \
  --output "training-data/processed/training_data.jsonl"

# Then ingest to Supabase with embeddings
./scripts/quick_ingest.sh
# Force full re-ingest:
./scripts/quick_ingest.sh full
```

---

## Recommended Flow for Continuous Updates

### Weekly Update Cycle

```bash
# Monday: Download new videos
./scripts/download_channel.sh "NewChannel" "https://www.youtube.com/@NewChannelHandle/videos"

# Tuesday-Wednesday: Process
./scripts/process_channel.sh "NewChannel"

# Thursday: Ingest to vector store
./scripts/quick_ingest.sh

# Friday: Test and verify
# Ask QA page questions to see if new data is being used
```

### Better Alternative: Run Monthly Batch

```bash
#!/bin/bash
# scripts/monthly_refresh.sh

# Update all channels in one go
CHANNELS=("SocialStoic" "The Natural Lifestyles" "NaturalLifestyles-Infield")

for CHANNEL in "${CHANNELS[@]}"; do
  echo "Processing $CHANNEL..."
  ./scripts/process_channel.sh "$CHANNEL"
done

echo "Ingesting everything to vector store..."
./scripts/quick_ingest.sh

echo "✅ Monthly refresh complete!"
```

Run with: `bash scripts/monthly_refresh.sh`

---

## Troubleshooting

### Issue: Transcriptions are inaccurate
**Solution:**
- Use `--model medium` (slower but more accurate)
- Manually edit `.txt` files if needed—ingest will use them
- Whisper's base model struggles with:
  - Multiple speakers overlapping
  - Heavy accents
  - Low audio quality
  - Background noise

### Issue: Some videos didn't download
**Solution:**
```bash
# Check which are missing
ls training-data/raw-audio/ChannelName | wc -l
# Compare with YouTube channel video count

# Re-download just missing ones
youtube-dl --download-archive archive.txt \
  -f best \
  -o "training-data/raw-audio/ChannelName/%(title)s.%(ext)s" \
  "https://www.youtube.com/@ChannelHandle/videos"
```

### Issue: Embeddings took too long/failed
**Solution:**
- Make sure Ollama is running: `ollama serve`
- Check model is loaded: `ollama list | grep nomic-embed-text`
- If crashed mid-ingest, the database will reject duplicates (safe)
- Restart and re-run: `npm run ingest`

---

## What Ollama Sees (Why Answers Are Better Now)

When you ask a question, the QA API now:

1. **Embeds your question** with nomic-embed-text
2. **Searches the vector store** for the 5 most similar chunks
3. **Includes actual transcript text** in the system prompt

Example of what reaches Ollama:

```
You are the DayGame QA coach. Answer questions based on real transcripts...

TRAINING DATA CONTEXT:
SOURCE: SocialStoic/Video1.txt
CONTENT: "When she says she studies medicine, don't ask about her studies. 
Instead, assume she's doing it for status and tease her about it. 
This shows you're not interviewing her..."

SOURCE: The Natural Lifestyles/Video5.txt
CONTENT: "Medical students are often high-achievers. They're usually down 
for things if you can create a vibe where they're not in interview mode..."

User question: what should i say when a girl says she studies medicine?
```

This is why answers are much better—Ollama has real examples to reference.

---

## Next Steps

### Short term (this week):
1. ✅ Fix QA API to use training data (DONE)
2. Process remaining NaturalLifestyles videos (20 more audio files)
3. Test if answers improve with more data

### Medium term (next month):
1. Monthly refresh workflow (batch process all channels)
2. Manual cleanup of transcription errors in key videos
3. Add more channels if available

### Long term (next quarter):
1. Fine-tune embedding model for daygame-specific terms
2. Consider dedicated model training if data grows large enough
3. Extract "best practices" as structured prompts

---

## Commands Reference

```bash
# Check progress
python3 scripts/check_progress.py

# Process one channel completely
./scripts/process_channel.sh "ChannelName"

# Ingest to vector store
npm run ingest

# Check vector store (from root)
npx ts-node -O '{"module":"esnext"}' -e "
  import { searchSimilarChunks } from './vector-store.ts';
  import { generateEmbedding } from './ollama-client.ts';
  
  const emb = await generateEmbedding('what should i say');
  const results = await searchSimilarChunks(emb, 3);
  console.log(JSON.stringify(results, null, 2));
"
```

---

## Data Size Reference

- 1 hour of audio ≈ 2000-3000 Whisper tokens
- 1 video transcript ≈ 2000-5000 chunks at overlap=100
- Current: 16,418 chunks in training_data.jsonl
- Embeddings: ~66 MB in Supabase (each is 768 floats)

You have room for 2-3x more data before needing optimization.
