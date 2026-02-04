# Stage 05: Audio Features
**Status:** FRESH START
**Updated:** 04-02-2026

**Script**: `scripts/training-data/05.audio-features`

## Changelog
- 04-02-2026: Removed dead code (octave correction, unused voiced_ratio, cosine_sim)
- 04-02-2026: Fixed pitch range (350Hz → 500Hz) to capture excited female voices
- 04-02-2026: Disabled octave correction (was incorrectly halving female pitch data)

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

## Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `pitch_fmin_hz` | 65 Hz | Male voice lower bound |
| `pitch_fmax_hz` | 500 Hz | Female excited speech upper bound |
| `pitch_method` | pyin | More robust than yin, provides voiced probability |

### Known Issue: Quality Flags Unused

Stage 05 extracts `quality.low_energy` and `quality.speech_activity_ratio` flags to indicate unreliable segments. However, **Stage 06 does not currently use these flags** - it processes all segments regardless of quality. This could cause tone misclassification on noisy/quiet segments.

**TODO for Stage 06**: Filter segments where `quality.low_energy=true` or `quality.speech_activity_ratio < 0.3` before tone classification.

## Quality Targets

- All features extracted for all segments
- Feature values within expected ranges
- Resemblyzer embeddings work correctly
- Pitch data valid for both male (85-180Hz) and female (165-300Hz+) voices

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
