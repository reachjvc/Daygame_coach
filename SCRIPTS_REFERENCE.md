# 📚 Complete Training Data Command Reference

## 🚀 Common Workflows

### Workflow 0: One-Command Refresh (Recommended)
```bash
./scripts/refresh_training_data.sh
```

This reads `training-data/sources.txt`, downloads anything new, then transcribes + processes + ingests.

### Workflow 1: Add New Content (Monthly)
```bash
# Step 1: Download
./scripts/download_channel.sh "SocialStoic" \
  "https://www.youtube.com/@SocialStoic/videos"
# or:
./scripts/download_sources.sh

# Step 2: Process
./scripts/full_pipeline.sh "SocialStoic"

# Step 3: Done!
# Answers automatically use new content
```

### Workflow 2: Bulk Process Everything
```bash
# Process all channels, ingest once at the end
./scripts/full_pipeline.sh
```

### Workflow 3: Re-ingest After Manual Edits
```bash
# If you edited transcription files manually:
./scripts/clean_transcriptions.sh    # Optional: auto-fix errors
./scripts/quick_ingest.sh            # Re-ingest without reprocessing
# Force full re-ingest:
./scripts/quick_ingest.sh full
```

### Workflow 4: Single Video
```bash
# Download one video
./scripts/download_channel.sh "MyVideo" \
  "https://www.youtube.com/watch?v=xxx"

# Process it
./scripts/full_pipeline.sh "MyVideo"

# Check progress
python3 scripts/check_progress.py
```

---

## 📊 Monitoring Commands

### Check Processing Progress
```bash
python3 scripts/check_progress.py
```

### Verify Pipeline Outputs (Recommended)
```bash
# Quick structural check
python3 scripts/verify_training_data.py --no-validate-json

# Strict mode (fails on missing artifacts)
python3 scripts/verify_training_data.py --strict

# Verify generated JSONL files (fails on invalid JSON or literal "NaN")
python3 scripts/verify_pipeline.py
```

**Output:**
```
CHANNEL                        | AUDIO  | TRANS  | FEAT   | INT   
─────────────────────────────────────────────────────────────────
SocialStoic                    | 37     | 37     | 34     | 34    
The Natural Lifestyles         | 24     | 24     | 5      | 5     
```

### Analyze Data Quality
```bash
python3 scripts/analyze_training_data.py
```

**Options:**
```bash
python3 scripts/analyze_training_data.py --sample     # Show samples
python3 scripts/analyze_training_data.py --channel "SocialStoic"
```

### View Recent Logs
```bash
# Last processing run
tail -f training-data/pipeline-SocialStoic.log

# Last ingestion
tail -f training-data/ingest.log

# Check for errors
grep -i error training-data/*.log
```

---

## 🔧 Individual Scripts Explained

### `download_channel.sh`
**Downloads videos from YouTube**

```bash
# Full channel (gets all videos)
./scripts/download_channel.sh "ChannelName" \
  "https://www.youtube.com/@ChannelHandle/videos"

# Playlist
./scripts/download_channel.sh "PlaylistName" \
  "https://www.youtube.com/playlist?list=PLxxx"

# Single video
./scripts/download_channel.sh "SingleVideo" \
  "https://www.youtube.com/watch?v=xxx"
```

**Features:**
- Automatically skips already-downloaded videos
- Uses archive file to track downloads
- Uses `www.youtube.com_cookies.txt` automatically (if present) to reduce 403/bot errors
- Creates `training-data/raw-audio/ChannelName/` automatically

---

### `download_sources.sh` (New)
**Download everything in `training-data/sources.txt`**

```bash
./scripts/download_sources.sh
```

---

### `refresh_training_data.sh` (New)
**One command: download → transcribe/process → ingest**

```bash
./scripts/refresh_training_data.sh
./scripts/refresh_training_data.sh --skip-download
./scripts/refresh_training_data.sh --ingest-only
```

---

### `transcribe_channel.sh` (New)
**Transcribe a channel with Whisper (no feature extraction)**

```bash
./scripts/transcribe_channel.sh "SocialStoic"
WHISPER_MODEL=medium ./scripts/transcribe_channel.sh "SocialStoic"
```

---

### `training_data_env.sh` (Internal)
Shared env bootstrap used by pipeline scripts. Override:
- `WHISPER_ENV=/path/to/venv`
- `TRAINING_DATA_CACHE_DIR=/some/writable/dir`

### `process_channel.sh` (Built-in)
**Runs the complete processing pipeline**

```bash
./scripts/process_channel.sh "ChannelName"
```

**What it does:**
1. Transcribes audio with Whisper (creates `.json` + `.txt` + `.srt` + `.vtt` + `.tsv`)
2. Classifies content (infield, theory, intro)
3. Extracts audio features (pitch, energy, tempo)
4. Classifies speakers (coach vs target)
5. Classifies tonality (playful, confident, etc.)
6. Extracts interactions (complete conversations)
7. Aggregates everything into `training_data.jsonl`
8. Generates `scenario_training.jsonl` (chat-format examples)

**Time:** 30 min per 20 videos (depending on computer)

---

### `full_pipeline.sh` (New)
**Combines everything: process + ingest**

```bash
# Process everything
./scripts/full_pipeline.sh

# Process one channel
./scripts/full_pipeline.sh "SocialStoic"

# Just ingest (if you already processed)
./scripts/full_pipeline.sh --ingest-only
```

**What's new:**
- Handles errors gracefully
- Creates detailed logs
- Shows progress
- Automatically calls `npm run ingest`

---

### `quick_ingest.sh` (New)
**Re-ingest embeddings without reprocessing (incremental)**

```bash
# Just ingest
./scripts/quick_ingest.sh

# Preview first
./scripts/quick_ingest.sh verify

# Force full re-ingest
./scripts/quick_ingest.sh full
```

**Use when:**
- You manually edited transcript files
- Fixed transcription errors
- Need to update embeddings without reprocessing

**Time:** 2-5 minutes

---

### `clean_transcriptions.sh` (New)
**Auto-fix common Whisper transcription errors**

```bash
# Dry run (show what would change)
./scripts/clean_transcriptions.sh --dry-run

# Apply fixes
./scripts/clean_transcriptions.sh

# Fix specific channel
./scripts/clean_transcriptions.sh "SocialStoic"
```

**What it fixes:**
- Removes `[INAUDIBLE]` placeholders
- Removes `[NOISE]` markers
- Cleans multiple spaces
- Removes extra whitespace

---

## 📈 Performance Metrics

### Time Per Video

| Stage | Time | Notes |
|-------|------|-------|
| Download | 2-10 min | Depends on file size & internet |
| Transcribe | 2-5 min | Base model; medium model = 5-10 min |
| Features | 30 sec | Pitch, energy, tempo extraction |
| Classify | 30 sec | Speaker, tonality, content type |
| Ingest | 10 sec | Generate embedding + store |
| **Total** | **6-17 min** | Per video |

### Batch Processing

| Size | Total Time | Output |
|------|-----------|--------|
| 10 videos | 1-3 hrs | +200-300 chunks |
| 20 videos | 2-6 hrs | +400-600 chunks |
| 90 videos | 9-25 hrs | +1800-2700 chunks |

---

## 🔍 Data Organization

### Directory Structure
```
training-data/
├── raw-audio/                          # Downloaded videos
│   ├── SocialStoic/
│   │   ├── Video1.opus
│   │   ├── Video2.webm
│   │   └── .youtube-dl-archive.txt    # Prevents re-downloading
│   └── The Natural Lifestyles/
│
├── transcripts/                        # Whisper outputs
│   ├── SocialStoic/
│   │   ├── Video1.txt                 # Plain text (used for chunks)
│   │   ├── Video1.json                # Whisper JSON (timestamps)
│   │   └── Video1.classified.json     # Content type classification
│   └── ...
│
├── features/                           # Analyzed audio data
│   ├── SocialStoic/
│   │   └── Video1.features.json       # Pitch, energy, tempo, etc.
│   └── ...
│
├── interactions/                       # Extracted conversations
│   ├── SocialStoic/
│   │   └── Video1.interactions.jsonl  # Parsed interactions
│   └── ...
│
└── processed/                          # Final aggregated data
    ├── training_data.jsonl            # All chunks (16,418 lines)
    ├── scenario_training.jsonl        # Chat format
    ├── pipeline-*.log                 # Processing logs
    └── ingest.log                     # Embedding logs
```

---

## 🐛 Troubleshooting

### "Command not found: youtube-dl"
```bash
pip install yt-dlp
# or
pip install youtube-dl
```

### "Whisper model not found"
```bash
source ~/whisper-env/bin/activate
pip install openai-whisper
```

### "Ollama connection refused"
```bash
# Start Ollama
ollama serve

# In another terminal, ensure models are ready
ollama pull llama2
ollama pull nomic-embed-text
```

### "Permission denied" on script
```bash
chmod +x scripts/*.sh
```

### "Transcription is bad"
Use medium model (slower, better quality):
```bash
source ~/whisper-env/bin/activate
for f in training-data/raw-audio/SocialStoic/*.opus; do
  whisper "$f" --model medium --output_format txt
done
```

### "Ingest failed halfway"
```bash
# Safe to re-run—database rejects duplicates
./scripts/quick_ingest.sh
```

### "Too slow, taking forever"
```bash
# Use medium-quality Whisper + background CPU
# Or process one channel at a time:
./scripts/full_pipeline.sh "SocialStoic"
# ... wait for completion ...
./scripts/full_pipeline.sh "The Natural Lifestyles"
```

---

## 💾 Backup & Recovery

### Backup Training Data
```bash
# Backup everything
tar -czf training-data-backup-$(date +%Y%m%d).tar.gz training-data/

# Backup just embeddings (small)
sqlite3 supabase.db ".backup supabase-backup-$(date +%Y%m%d).db"
```

### If Ingest Failed
```bash
# Safe to retry—no duplicates:
./scripts/quick_ingest.sh

# If still broken, check logs:
tail training-data/ingest.log
```

### If Transcriptions Corrupted
```bash
# Whisper cache is in: ~/.cache/whisper
rm -rf ~/.cache/whisper

# Re-process:
./scripts/full_pipeline.sh "ChannelName"
```

---

## 📅 Maintenance Schedule

### Daily (During Development)
```bash
python3 scripts/check_progress.py          # Check status
```

### Weekly
```bash
python3 scripts/analyze_training_data.py   # Quality report
```

### Monthly
```bash
./scripts/download_channel.sh ...          # Get new videos
./scripts/full_pipeline.sh "ChannelName"   # Process
python3 scripts/check_progress.py          # Verify
```

### Quarterly
```bash
python3 scripts/analyze_training_data.py   # Full analysis
tar -czf training-data-backup.tar.gz training-data/  # Backup
```

---

## 📝 Manual Editing

### Fix Specific Transcript
```bash
# Open transcript file
nano training-data/transcripts/SocialStoic/Video1.txt

# Make edits, save with Ctrl+X then Y

# Re-ingest
./scripts/quick_ingest.sh
```

### Remove Bad Video from Training Data
```bash
# Edit training_data.jsonl to remove lines from that video
grep -v "video-name-to-remove" training-data/processed/training_data.jsonl > temp.jsonl
mv temp.jsonl training-data/processed/training_data.jsonl

# Re-ingest
./scripts/quick_ingest.sh
```

---

## 🎯 Performance Optimization

### If Ingest is Slow
```bash
# Reduce chunk size (less data to embed)
# Edit config.ts:
# QA_CONFIG.rag.chunkSize = 512  # Smaller = faster, but less context

./scripts/quick_ingest.sh
```

### If Whisper is Slow
```bash
# Use base model (faster):
source ~/whisper-env/bin/activate
whisper audio.opus --model base --output_format txt

# For high accuracy (slower):
whisper audio.opus --model medium --output_format txt
```

### If Running Out of Disk Space
```bash
# Remove raw audio after processing
find training-data/raw-audio -name "*.opus" -delete

# Keep transcripts and processed data
ls training-data/processed/training_data.jsonl  # This is what matters
```

---

## 🔗 Related Files

- [TRAINING_DATA_PIPELINE.md](TRAINING_DATA_PIPELINE.md) - Detailed pipeline documentation
- [TRAINING_DATA_QUICKSTART.md](TRAINING_DATA_QUICKSTART.md) - Quick start guide
- [DATA_QUALITY_REPORT.md](DATA_QUALITY_REPORT.md) - Current data analysis
- [app/api/qa/route.ts](app/api/qa/route.ts) - The QA API (now using training data!)
- [config.ts](config.ts) - RAG configuration (chunk size, overlap, etc.)

---

## ✅ Quick Copy-Paste Commands

### Just give me the commands:
```bash
# Download this month's videos
./scripts/download_channel.sh "SocialStoic" "https://www.youtube.com/@SocialStoic/videos"

# Process everything
./scripts/full_pipeline.sh

# Check progress
python3 scripts/check_progress.py

# View quality report
python3 scripts/analyze_training_data.py
```

---

## 📞 Getting Help

**Not sure what to do?** Start here:
```bash
# See what's been processed
python3 scripts/check_progress.py

# Run full pipeline
./scripts/full_pipeline.sh

# Check quality
python3 scripts/analyze_training_data.py
```

**Still stuck?** Check the logs:
```bash
tail training-data/pipeline-*.log
tail training-data/ingest.log
```
