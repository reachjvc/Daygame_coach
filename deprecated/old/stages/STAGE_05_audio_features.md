# Stage 05: Audio Features
**Status:** R1 APPROVED
**Updated:** 04-02-2026 11:00

**Script**: `scripts/training-data/05.audio-features`

## Changelog
- 04-02-2026 11:00: **R1 APPROVED** - User accepted 58-98% usable segments for tone classification (short infield segments naturally have lower pitch detection)
- 04-02-2026 10:15: R1 re-run complete - pitch detection improved from ~61% to 79-100% across 5 videos
- 04-02-2026: Removed quality flags (low_energy, speech_activity_ratio) - trust pyin's native output instead
- 04-02-2026: Removed pyin_voiced_prob_threshold - use pyin's voiced_flag directly
- 04-02-2026: R1 analysis revealed 39% pitch detection failures; simplified to test raw pyin output
- 04-02-2026: Disabled speaker embeddings by default (unused by Stage 06, saves ~1KB/segment)

---

## Overview

Extracts acoustic features for tone detection and speaker identification.

## Input
- `data/04.diarize/<source>/<video>/*.full.json`
- `data/01.download/<source>/<video>/*.asr.clean16k.wav` (audio)

## Output
- `data/05.audio-features/<source>/<video>/`
  - `*.audio_features.json` - Audio features per segment

## Features Extracted

| Feature | Description |
|---------|-------------|
| **Pitch** | mean, std, range, direction (slope). Returns 0 if pyin can't detect. |
| **Energy** | dynamics (max - mean dB) |
| **Tempo** | syllable_rate (onset count) |
| **Spectral** | brightness (centroid Hz) |
| **Speaker embeddings** | 256-dim resemblyzer vectors (disabled by default) |

**Note:** If `pitch.mean_hz == 0`, pyin couldn't confidently detect pitch. Stage 06 filters these segments from tone classification.

**Quality thresholds for Stage 06:**
- `pitch.mean_hz == 0` → Skip tone classification (9.7% of R1 segments)
- `pitch.std_hz < 5` → Skip tone classification (10.4% of R1 segments - insufficient variation)

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
| `pitch_method` | pyin | Uses native voiced_flag for detection |

## Quality Targets

- All features extracted for all segments
- Feature values within expected ranges
- Resemblyzer embeddings work correctly
- Pitch data valid for both male (85-180Hz) and female (165-300Hz+) voices

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | **APPROVED** | 5 | 0 | Usable for tone: 58-98% (short infield segments expected to fail) |
| R2 | 15 | PENDING | - | - | |

### R1 Results (04-02-2026)

| Video | Segments | Pitch OK | Pitch % | Avg Hz | Avg Std | Dynamics |
|-------|----------|----------|---------|--------|---------|----------|
| H3_8iPikhDw | 139 | 125 | 89.9% | 144.7 | 19.3 | 9.5 dB |
| G2sWa8X0EjA | 162 | 157 | 96.9% | 140.6 | 19.8 | 11.3 dB |
| 4x9bvKaVWBc | 187 | 183 | 97.9% | 134.4 | 20.2 | 8.4 dB |
| WSFSpbFCPZo | 328 | 260 | 79.3% | 131.6 | 16.0 | 9.8 dB |
| dz8w8XUBDXU | 118 | 118 | 100% | 147.5 | 20.7 | 15.1 dB |

**Summary:**
- Pitch detection improved significantly from previous R1 (~61% success → now 79-100%)
- All pitch values in expected male voice range (130-148 Hz)
- Std values (16-21 Hz) suitable for tone classification
- Energy dynamics present for all segments
