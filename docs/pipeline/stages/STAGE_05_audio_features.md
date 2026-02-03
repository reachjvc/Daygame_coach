# Stage 05: Audio Features
**Status:** FRESH START
**Updated:** 03-02-2026

**Script**: `scripts/training-data/05.audio-features`

---

## Overview

Extracts acoustic features for tone detection and speaker identification.

## Input
- `data/04.diarize/<source>/<video>/*.full.json`
- `data/01.download/<source>/<video>/*.asr.clean16k.wav` (audio)

## Output
- `data/05.audio-features/<source>/<video>/`
  - `*.features.json` - Audio features per segment

## Features Extracted

| Feature | Description |
|---------|-------------|
| **Pitch** | mean, std, range, direction (slope) |
| **Energy** | dynamics (max - mean dB) |
| **Tempo** | syllable_rate (onset count) |
| **Spectral** | brightness (centroid Hz) |
| **Quality flags** | low_energy, speech_activity_ratio |
| **Speaker embeddings** | 256-dim resemblyzer vectors |

## Usage
```bash
# Single video
./scripts/training-data/05.audio-features "source_name" "https://..."

# Direct input/output
./scripts/training-data/05.audio-features --audio audio.wav --transcript trans.json --out output.json
```

## Quality Targets

- All features extracted for all segments
- Feature values within expected ranges
- Resemblyzer embeddings work correctly

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
