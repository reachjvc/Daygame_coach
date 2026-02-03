# Stage 04: Diarize
**Status:** UPDATED
**Updated:** 03-02-2026

**Script**: `scripts/training-data/04.diarize`

---

## Changelog
- 03-02-2026: Switched from pyannote to DiariZen (faster, no HF token required)

---

## Overview

Performs speaker diarization using DiariZen to identify different speakers.

## Input
- `data/03.align/<source>/<video>/*.full.json`
- `data/01.download/<source>/<video>/*.asr.clean16k.wav` (audio)

## Output
- `data/04.diarize/<source>/<video>/`
  - `*.full.json` - Segments with speaker labels (SPEAKER_00, SPEAKER_01)
  - `*.txt` - Plain text

## Key Features
- **No HuggingFace token required** (DiariZen is fully open)
- Uses model: `BUT-FIT/diarizen-wavlm-large-s80-md`
- Outputs speaker labels: SPEAKER_00, SPEAKER_01, etc.
- Turn merging: collapses adjacent same-speaker turns
- Smart speaker assignment for overlapping segments

## Usage
```bash
# Single video
./scripts/training-data/04.diarize "source_name" "https://..."

# Overwrite existing
./scripts/training-data/04.diarize "source_name" "https://..." --overwrite

# Custom model
./scripts/training-data/04.diarize "source_name" "https://..." --model "BUT-FIT/diarizen-wavlm-large-s80-md"
```

## Installation

DiariZen requires separate installation:

```bash
# Create conda environment
conda create --name diarizen python=3.10
conda activate diarizen

# Install PyTorch
conda install pytorch==2.1.1 torchvision==0.16.1 torchaudio==2.1.1 pytorch-cuda=12.1 -c pytorch -c nvidia

# Clone and install DiariZen
git clone https://github.com/BUTSpeechFIT/DiariZen.git
cd DiariZen
pip install -r requirements.txt && pip install -e .
```

## Performance

DiariZen is significantly faster than pyannote while maintaining similar accuracy:
- DER (Diarization Error Rate): ~13.3% (vs pyannote's ~10%)
- Speed: Much faster than pyannote's 0.71x realtime

## Quality Targets

- 2 speakers detected for infield videos
- Speaker boundaries accurate
- Consistent SPEAKER_00/SPEAKER_01 assignment

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
