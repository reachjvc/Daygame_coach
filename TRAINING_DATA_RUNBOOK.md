# Training Data Pipeline (Read This One File)

This is the “human guide” for the training-data scripts: what each step does, which command to run for common tasks, and how to verify it worked.

---

## What You’re Trying To Achieve

You have two related but different outputs:

1) **RAG embeddings (used by the app’s QA answers)**  
   - The app reads transcript text, chunks it, embeds it, and stores it in Supabase for semantic search.
   - This is what makes answers “use your data”.

2) **Processed datasets (for analysis / future training)**  
   - Whisper timestamps + audio → features (pitch/energy/tempo) → labels (speaker + tone) → extracted interactions → JSONL datasets.

Most of the time you want *both*.

---

## The Only Commands You Really Need

### A) One-command “do everything”

```bash
./scripts/refresh_training_data.sh
```

This:
1) Downloads everything listed in `training-data/sources.txt`
2) Transcribes + processes everything (features/labels/interactions + JSONL datasets)
3) Ingests embeddings to Supabase (incremental by default)

### B) Download only

```bash
./scripts/download_sources.sh
```

### C) Process only (no Supabase ingest)

```bash
./scripts/process_channel.sh "ChannelName"
```

### D) Ingest embeddings only (after edits)

```bash
./scripts/quick_ingest.sh
```

Force a full re-ingest (slow, but “reset everything”):

```bash
./scripts/quick_ingest.sh full
```

---

## First-Time Setup (One-Time Prereqs)

### 1) Node + packages

You need `node` + `npm`.

If `npm run ingest` complains about missing `tsx`, install deps:

```bash
npm install
```

### 2) Python “Whisper env”

The pipeline expects a Python virtualenv at `~/whisper-env` by default.

Create it once:

```bash
python3 -m venv ~/whisper-env
source ~/whisper-env/bin/activate
pip install -U openai-whisper numpy librosa
```

You can override the env path:

```bash
WHISPER_ENV=/path/to/your/venv ./scripts/process_channel.sh "SocialStoic"
```

Important: the scripts also force caches into `training-data/.cache/` to avoid permission issues from numba/joblib/etc.

### 3) yt-dlp (YouTube downloader)

You need either `yt-dlp` (preferred) or `youtube-dl`.

```bash
pip install -U yt-dlp
```

### 4) Ollama running (for embeddings + chat)

Ingest needs Ollama running and the embedding model available.

Examples:

```bash
ollama serve
ollama pull nomic-embed-text
```

### 5) Supabase env vars

In `.env.local` you need (minimum):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these, ingest can’t write embeddings.

---

## Where Files Go (So You Can “See What’s Happening”)

Raw downloads:
- `training-data/raw-audio/<ChannelName>/...`

Whisper outputs:
- `training-data/transcripts/<ChannelName>/*.json` (timestamps + segments)
- `training-data/transcripts/<ChannelName>/*.txt` (plain transcript text used for RAG chunking)

Content-classified transcript JSON (used for feature extraction input):
- `training-data/classified/<ChannelName>/*.classified.json`

Audio feature extraction outputs:
- `training-data/features/<ChannelName>/*.features.json`

Extracted interactions:
- `training-data/interactions/<ChannelName>/*.interactions.jsonl`

Final aggregated datasets:
- `training-data/processed/training_data.jsonl`
- `training-data/processed/scenario_training.jsonl`

Logs:
- `training-data/pipeline-<ChannelName>.log`
- `training-data/ingest.log`

---

## Adding YouTube Sources (Channels / Playlists / Single Videos)

### Option 1: One-off download (channel or playlist or single video)

```bash
./scripts/download_channel.sh "MySourceName" "https://youtube.com/..."
```

Yes: you literally paste the YouTube link as the 2nd argument.

Examples:

```bash
./scripts/download_channel.sh "SocialStoic" "https://www.youtube.com/@SocialStoicYouTube"
./scripts/download_channel.sh "MyPlaylist" "https://www.youtube.com/playlist?list=PLxxxx"
./scripts/download_channel.sh "SingleVideo" "https://www.youtube.com/watch?v=xxxx"
```

Then run:

```bash
./scripts/full_pipeline.sh "MySourceName"
```

### Option 2: Put sources in a file (recommended for “set and forget”)

Edit `training-data/sources.txt` and add lines like:

```
ChannelFolderName|https://youtube.com/...
```

Then:

```bash
./scripts/download_sources.sh
./scripts/full_pipeline.sh
```

Or just:

```bash
./scripts/refresh_training_data.sh
```

### “Are downloads automatically added to the list?”

- **Already-downloaded videos are tracked automatically** via: `training-data/raw-audio/<Channel>/.youtube-dl-archive.txt`  
  So if you re-run `download_channel.sh` with the same channel name, it only fetches *new* videos.
- The **default download list** is `training-data/sources.txt`.  
  Running `download_channel.sh` does **not** auto-add a line to that file — add it yourself if you want it included in `download_sources.sh` / `refresh_training_data.sh`.

### If downloads fail with 403 / bot checks

If you have a cookies export file, put it at repo root:
- `www.youtube.com_cookies.txt`

`download_channel.sh` will automatically use it.  
Or set:

```bash
YOUTUBE_COOKIES_FILE=/path/to/cookies.txt ./scripts/download_channel.sh "Name" "URL"
```

---

## Processing (What Happens When You “Run The Pipeline”)

When you run:

```bash
./scripts/process_channel.sh "ChannelName"
```

It does:
1) **Transcribe** audio → Whisper `.json/.txt/...`
2) **Classify content** (intro/theory/infield/etc.) → `.classified.json`
3) **Extract features** (pitch/energy/tempo/spectral) → `.features.json`
4) **Classify speakers** (coach/target/voiceover/unknown)
5) **Classify tonality** (playful/confident/warm/nervous/neutral)
6) **Extract interactions** → `.interactions.jsonl`
7) **Aggregate** all channels → `training-data/processed/*.jsonl`

If you want better transcription quality (slower):

```bash
WHISPER_MODEL=medium ./scripts/process_channel.sh "ChannelName"
```

---

## Ingesting Embeddings (What Makes the App Use New Data)

Run:

```bash
./scripts/quick_ingest.sh
```

Key idea: ingest is **incremental** now (it can ingest “just the new stuff”).
- It tracks each transcript **source file** (each `.txt` under `training-data/transcripts/`).
- It only re-embeds sources that are **new or changed** since last time.
- It stores tracking in `training-data/.ingest_state.json` (gitignored).

Important: downloading new audio does **nothing** for ingest until you transcribe it (so a new `.txt` exists).

Force full rebuild:

```bash
./scripts/quick_ingest.sh full
```

---

## “Did It Work?” (Tests / Verification)

### Quick checks (fast)

1) Status table:
```bash
python3 scripts/check_progress.py
```

2) On-disk artifact check:
```bash
python3 scripts/verify_training_data.py --no-validate-json
```

3) JSONL safety check (invalid JSON or literal `NaN`):
```bash
python3 scripts/verify_pipeline.py
```

### App-level check (end-to-end)

After ingest completes, ask a question in the QA UI / endpoint and confirm you see sources from your transcripts.

---

## Common “I Changed Something, What Now?”

### “I downloaded new videos”
```bash
./scripts/full_pipeline.sh "ChannelName"
```

### “I edited transcript text (.txt) to fix errors”
```bash
./scripts/clean_transcriptions.sh
./scripts/quick_ingest.sh
```

### “I want to re-run everything from scratch”
```bash
./scripts/full_pipeline.sh
./scripts/quick_ingest.sh full
```

---

## Troubleshooting

### Whisper env errors
- Make sure `~/whisper-env/bin/activate` exists
- Make sure you installed: `openai-whisper numpy librosa`

### Feature extraction crashes (numpy/librosa/numba)
- The scripts set cache dirs into `training-data/.cache/` automatically.
- If you still see cache permission errors, delete cache and retry:
  ```bash
  rm -rf training-data/.cache
  ```

### Ingest errors
- Ensure Ollama is running and the embedding model is installed
- Ensure `.env.local` has Supabase URL + service role key

---

## If You Want It Even Simpler

Tell me your “normal routine” (weekly/monthly) and which sources you care about, and I’ll tailor `training-data/sources.txt` + the scripts so the one command matches exactly how you want to work.
