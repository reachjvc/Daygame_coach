# Stage 01: Download
**Status:** RETAINED (~966 videos, ~941 hours)
**Updated:** 03-02-2026

**Script**: `scripts/training-data/01.download`

---

## Overview

Downloads audio from YouTube videos using yt-dlp with anti-bot detection measures.

## Input
- YouTube URLs (from `docs/sources.txt` or direct URL)

## Output
- `data/01.download/<source>/<video>/`
  - `*.asr.raw16k.wav` - Raw 16kHz mono audio
  - `*.asr.clean16k.wav` - Cleaned 16kHz mono audio (for ASR)
  - `*.info.json` - Video metadata
  - `*.listen.mp3` - Optional preview file

## Key Features
- Anti-bot detection: randomized user-agents, jitter delays, session limits
- Night hour avoidance
- Bandwidth rate limiting (default: 2M)
- Exponential backoff retry logic (up to 3 attempts)
- Session state tracking

## Usage
```bash
# Single video
./scripts/training-data/01.download "source_name" "https://youtube.com/watch?v=..."

# Batch from sources file
./scripts/training-data/01.download --sources docs/sources.txt
```

## Notes
- This stage is RETAINED - no need to re-run
- ~966 videos already downloaded (~941 hours of audio)

---

## Verification Status

| Round | Videos | Status | Notes |
|-------|--------|--------|-------|
| R1 | - | RETAINED | No verification needed |
| R2 | - | RETAINED | No verification needed |
