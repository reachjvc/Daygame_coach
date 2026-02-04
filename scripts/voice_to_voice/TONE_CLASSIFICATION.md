# Tone Classification (Voice-to-Voice Feature)

**Status:** FUTURE FEATURE - Not currently in pipeline
**Updated:** 04-02-2026 13:00

**Script**: `scripts/voice_to_voice/tone-classification`

## Changelog
- 04-02-2026 13:00: Removed from training data pipeline. Moved to `scripts/voice_to_voice/` as future feature for real-time voice coaching.
- 04-02-2026 12:30: Removed speaker labeling and video type detection. Tone classification only.

---

## Overview

Acoustic tone classification based on audio features. **This is NOT part of the current training data pipeline.**

**Purpose:** Real-time feedback on vocal delivery during voice-to-voice coaching sessions.

**Why removed from pipeline:**
- Current pipeline focuses on text-based training data for RAG
- Tone classification requires voice input/output infrastructure that doesn't exist yet
- The "nervous" classifier had false positives on short segments (needs refinement)

**When to revisit:**
- When implementing real-time voice coaching mode
- When the app needs to give feedback on *how* something was said, not just *what* was said

**What it does:**
- Per-segment tone classification (playful, confident, nervous, energetic, neutral)
- 30-second tone windows with 10-second hop for macro-level analysis

## Input
- `data/05.audio-features/<source>/<video>/*.audio_features.json`

## Output
- `data/06.segment-enrich/<source>/<video>/`
  - `*.segment_enriched.json` - Segments with tone classification

### Output Schema (v2.0.0)

```json
{
  "video_id": "Video Title [abc123]",
  "source_file": "/path/to/input.audio_features.json",
  "processed_at": "2026-02-04T12:30:00Z",
  "segments": [
    {
      "id": 0,
      "start": 6.46,
      "end": 8.92,
      "text": "Welcome back to another video.",
      "tone": {
        "primary": "neutral",
        "confidence": 0.7,
        "method": "audio_threshold"
      },
      "pyannote_speaker": "SPEAKER_00"
    }
  ],
  "tone_windows": [
    {
      "id": 0,
      "start": 0,
      "end": 30,
      "tone": {
        "primary": "neutral",
        "confidence": 0.7,
        "method": "audio_threshold"
      }
    }
  ],
  "metadata": {
    "pipeline_version": "2026-02-04",
    "schema_version": "2.0.0",
    "input_checksum": "abc123..."
  }
}
```

## Tone Classification (Audio-based)

| Tone | Thresholds | Description |
|------|------------|-------------|
| `playful` | pitch_std > 22 AND energy_dyn > 13 | Animated, dynamic delivery |
| `confident` | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 | Measured, steady delivery |
| `nervous` | syl_rate > 6.8 AND pitch_std < 16 | Fast, monotone delivery |
| `energetic` | brightness > 1700Hz OR energy_dyn > 15 | High vocal effort/arousal |
| `neutral` | default (~47% of segments) | Modal baseline |

**Expected Distribution:**
- neutral: ~47%
- playful: ~13%
- confident: ~14%
- nervous: ~14%
- energetic: ~12%

## Usage

```bash
# Single file
./scripts/voice_to_voice/tone-classification --input file.json

# All sources (reads from data/05.audio-features/)
./scripts/voice_to_voice/tone-classification --sources

# Force reprocess
./scripts/voice_to_voice/tone-classification --sources --force
```

## Quality Filtering

Segments are marked as `unreliable_features` and get neutral tone (confidence 0.5) if:
- `pitch.mean_hz == 0` - pyin couldn't detect pitch (9.7% of R1 segments)
- `pitch.std_hz < 5` - insufficient pitch variation (10.4% of R1 segments)

**Rationale:** Based on Stage 05 R1 critical analysis:
- Short segments (<0.3s) have 38% pitch failure rate
- Segments with std=0 have only 1-2 voiced frames detected
- Low std segments can't reliably distinguish tones

**Result:** ~20% of segments get low-confidence neutral, 80% have reliable tone classification.

## Quality Targets

| Metric | Target |
|--------|--------|
| Tone coverage | 100% of segments get a tone |
| Reliable features | ≥70% of segments |
| Neutral distribution | ~47% (±10%) |
| Processing success | 100% of files |

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | PENDING | - | - | |
| R2 | 15 | PENDING | - | - | |
