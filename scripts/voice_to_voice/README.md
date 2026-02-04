# Voice-to-Voice Features

**Status:** FUTURE FEATURE - Not currently in pipeline
**Updated:** 04-02-2026

---

## Overview

This folder contains experimental/future features related to voice-to-voice coaching capabilities. These scripts are **not part of the current training data pipeline**.

## Contents

### tone-classification

Acoustic tone classification based on audio features (pitch, energy, syllable rate, brightness).

**Why removed from pipeline:**
- Current pipeline focuses on text-based training data
- Tone classification is designed for real-time voice coaching feedback
- Requires voice-to-voice infrastructure that doesn't exist yet

**When to revisit:**
- When implementing real-time voice coaching mode
- When the app needs to give feedback on *how* something was said, not just *what* was said

See [TONE_CLASSIFICATION.md](./TONE_CLASSIFICATION.md) for full documentation.

---

## Future Vision

Voice-to-voice coaching would:
1. Listen to user's approach attempts (live or recorded)
2. Analyze vocal delivery (tone, pace, energy)
3. Provide real-time feedback: "Try more playful energy" or "Slow down, you sound rushed"

This requires:
- [ ] Real-time audio capture
- [ ] Low-latency feature extraction
- [ ] Voice synthesis for coach responses
- [ ] Tone classification (this script)
