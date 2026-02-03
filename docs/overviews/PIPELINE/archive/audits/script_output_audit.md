# Pipeline Script Output Audit

**Status:** Archived
**Updated:** 02-02-2026

> **NOTE (02-02-2026)**: This audit is outdated. Speaker identification now uses pyannote diarization.
> The "ORPHAN" labels for speaker_embedding are no longer accurate - embeddings are computed and available.

## Changelog
- 02-02-2026 - Added note: speaker identification now uses pyannote, audit outdated
- 31-01-2026 17:20 - RESOLVED: Video download disabled by default, sidecars removed from 02.transcribe
- 31-01-2026 16:30 - Initial audit of scripts 01-05 for Phase 0.v2 testing

---

## Executive Summary

This audit documents what each pipeline script outputs and whether downstream scripts use those outputs.

### Resolved Issues

| Issue | Resolution | Commit |
|-------|------------|--------|
| **VIDEO download unused** | ✅ FIXED - Disabled by default via `SKIP_VIDEO=1`. Enable with `SKIP_VIDEO=0` | 01.download |
| **Orphan sidecars in 02** | ✅ FIXED - Removed .srt/.vtt/.tsv/.spk.tsv/.words.tsv. Kept only .json + .txt | 02.transcribe |

### Pending Issues (User Decisions Made)

| Issue | Severity | Decision | Status |
|-------|----------|----------|--------|
| **05.tonality parallel path** | MEDIUM | Plan already merges 04+05 (see plan_pipeline.md Phase 6) | DEFERRED to Phase 6 |
| ~~speaker_embedding unused~~ | ~~MEDIUM~~ | **RESOLVED**: pyannote used for speaker ID, embeddings available | DONE |
| **Orphan features in 03** | LOW | Keep for future use (documented) | ACCEPTED |

### Original Findings (for reference)

| Issue | Severity | Action |
|-------|----------|--------|
| **VIDEO download unused** | HIGH | ~~01.download downloads full video - never used by pipeline~~ ✅ FIXED |
| **05.tonality parallel path** | MEDIUM | 04 and 05 both do tone classification, 05 reads from 03 not 04 |
| **Orphan features in 03** | LOW | `pitch.range_hz`, `pitch.direction`, `quality.*` not used by 04 |
| ~~speaker_embedding unused~~ | ~~MEDIUM~~ | ~~256-dim embedding computed but 04 uses pitch~~ ✅ RESOLVED: pyannote used |

---

## 01.download - YouTube Download

**Location:** `scripts/training-data/01.download`

### Files Created

| File | Pattern | Used By | Status |
|------|---------|---------|--------|
| `.audio.webm` | `{title} [{id}].audio.webm` | 02.transcribe (via ffmpeg) | **USED** |
| `.asr.raw16k.wav` | `{title} [{id}].asr.raw16k.wav` | 02.transcribe, 03.audio-features | **USED** |
| `.asr.clean16k.wav` | `{title} [{id}].asr.clean16k.wav` | 02.transcribe (preferred), 03.audio-features | **USED** |
| `.listen.mp3` | `{title} [{id}].listen.mp3` | Human review only | **OPTIONAL** |
| `.info.json` | `{title} [{id}].info.json` | None | **ORPHAN** |
| `.mp4` | `{title} [{id}].mp4` | None | ✅ **RESOLVED** - Disabled by default (`SKIP_VIDEO=1`) |
| Archive files | `.youtube-dl-archive.*.txt` | 01.download (re-download prevention) | **INTERNAL** |
| Log files | `download-*.log`, `audio-asr-build.log` | None | **DEBUG** |

### ✅ RESOLVED: Video Download Disabled by Default

**Solution implemented:** Video download is now disabled by default via `SKIP_VIDEO=1`.

To enable video download for future visual analysis:
```bash
SKIP_VIDEO=0 ./scripts/training-data/01.download "source" "url"
```

**Original problem:** The pipeline only uses audio files (`.wav`). Downloading full video was wasting bandwidth/storage.

### info.json Fields

| Field | Used By | Status |
|-------|---------|--------|
| `id` | None in pipeline | **ORPHAN** |
| `title` | 04.segment-enrich (extracts from path, not file) | **ORPHAN** |
| `duration` | None | **ORPHAN** |
| `upload_date` | None | **ORPHAN** |
| `channel` | None | **ORPHAN** |

**Note:** Video metadata could be useful but currently isn't consumed.

---

## 02.transcribe - Whisper Transcription

**Location:** `scripts/training-data/02.transcribe`

### Files Created

| File | Pattern | Used By | Status |
|------|---------|---------|--------|
| `.full.json` | `{name}.full.json` | 03.audio-features | **USED** |
| `.full.{engine}.json` | `{name}.full.whisperx.json` etc. | None (backup engines) | **OPTIONAL** |
| `.txt` | `{name}.full.txt` | 10.ingest.ts (embeddings) | **USED** |
| ~~`.srt`~~ | ~~`{name}.full.srt`~~ | ~~None~~ | ✅ **REMOVED** |
| ~~`.vtt`~~ | ~~`{name}.full.vtt`~~ | ~~None~~ | ✅ **REMOVED** |
| ~~`.tsv`~~ | ~~`{name}.full.tsv`~~ | ~~None~~ | ✅ **REMOVED** |
| ~~`.spk.tsv`~~ | ~~`{name}.full.spk.tsv`~~ | ~~None~~ | ✅ **REMOVED** |
| ~~`.words.tsv`~~ | ~~`{name}.full.words.tsv`~~ | ~~None~~ | ✅ **REMOVED** |
| `.log` | `{name}.full.{engine}.log` | None | **DEBUG** |

### JSON Output Fields

| Field | Used By 03 | Status |
|-------|------------|--------|
| `text` | No | **ORPHAN** (03 reconstructs from segments) |
| `segments[].start` | Yes | **USED** |
| `segments[].end` | Yes | **USED** |
| `segments[].text` | Yes | **USED** |
| `segments[].speaker` | No | **ORPHAN** (03 recomputes speaker) |
| `segments[].words[]` | No | **ORPHAN** |

**Finding:** Word-level timestamps (`words[]`) are computed but never used downstream.

---

## 03.audio-features - Feature Extraction

**Location:** `scripts/training-data/03.audio-features`

### Files Created

| File | Pattern | Used By | Status |
|------|---------|---------|--------|
| `.audio_features.json` | `{stem}.audio_features.json` | 04.segment-enrich, 05.tonality | **USED** |

### Output Fields - Pitch

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `pitch.mean_hz` | Yes (speaker clustering) | Speaker ID via pitch | **USED** (but deprecated) |
| `pitch.std_hz` | Yes (tone: playful, confident, nervous) | Pitch variability | **USED** |
| `pitch.range_hz` | No | Future: expressiveness metric | **ORPHAN** |
| `pitch.direction` | No | Future: question vs statement | **ORPHAN** |

### Output Fields - Energy

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `energy.dynamics_db` | Yes (tone: playful, confident, energetic) | Loudness dynamics | **USED** |

### Output Fields - Tempo

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `tempo.syllable_rate` | Yes (tone: confident, nervous) | Speaking speed | **USED** |

### Output Fields - Spectral

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `spectral.brightness_hz` | Yes (tone: energetic) | Spectral centroid | **USED** |

### Output Fields - Quality

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `quality.low_energy` | No | Filter unreliable features | **ORPHAN** |
| `quality.speech_activity_ratio` | No | Filter silence/noise | **ORPHAN** |

### Output Fields - Speaker

| Field | Used By 04 | Purpose | Status |
|-------|------------|---------|--------|
| `pyannote_speaker` | Yes | Speaker ID from 02.transcribe (SPEAKER_00, SPEAKER_01) | **USED** |
| `speaker_embedding.dim` | Yes | Embedding metadata | **AVAILABLE** |
| `speaker_embedding.vector[]` | Yes | 256-dim voice fingerprint | **AVAILABLE** |

**Note:** Speaker identification now uses `pyannote_speaker` from 02.transcribe. Speaker embeddings are also computed and available for potential future use.

### Output Fields - Other

| Field | Used By 04 | Status |
|-------|------------|--------|
| `audio_clip.file` | No | **ORPHAN** |
| `audio_clip.start` | No | **ORPHAN** |
| `audio_clip.end` | No | **ORPHAN** |

---

## 04.segment-enrich - Speaker Labeling + Tone

**Location:** `scripts/training-data/04.segment-enrich`

### Files Created

| File | Pattern | Used By | Status |
|------|---------|---------|--------|
| `.segment_enriched.json` | `{stem}.segment_enriched.json` | Unknown (need to check 06/07) | **TBD** |

### What 04 Reads from 03

```python
# From cluster_speakers_by_pitch() - lines 196-206
pitch = seg.get("features", {}).get("pitch", {})
mean_hz = pitch.get("mean_hz", 0)  # Used for speaker clustering

# From classify_tone_window() - lines 400-413
pitch_std = pitch.get("std_hz", 0)
energy_dyn = energy.get("dynamics_db", 0)
syl_rate = tempo.get("syllable_rate", 0)
brightness = spectral.get("brightness_hz", 0)
```

### Output Fields

| Field | Purpose | Consumed By |
|-------|---------|-------------|
| `segments[].speaker.label` | coach/target/voiceover/other | **TBD** |
| `segments[].speaker.confidence` | LLM confidence | **TBD** |
| `tone_windows[].tone.primary` | playful/confident/nervous/energetic/neutral | **TBD** |
| `detected_video_type` | talking_head/infield/unknown | **TBD** |

### Known Issues in 04

1. **Pitch-based clustering is deprecated** - Comment says to use speaker_embedding but code still uses pitch
2. **Tone thresholds are hardcoded** - No way to tune without code changes
3. **LLM dependency** - Requires Ollama running locally

---

## 05.tonality - Tone Classification (Parallel Path)

**Location:** `scripts/training-data/05.tonality`

### Critical Finding: Parallel Data Flow

```
Pipeline Flow:
                    ┌─→ 04.segment-enrich ──→ ?
03.audio-features ──┤
                    └─→ 05.tonality ────────→ ?
```

**Problem:** Scripts 04 and 05 both:
- Read from 03.audio-features
- Compute tone classification
- Have overlapping but different tone logic

| Aspect | 04.segment-enrich | 05.tonality |
|--------|-------------------|-------------|
| **Tones** | playful, confident, nervous, energetic, neutral | playful, confident, warm, nervous, grounded, direct, flirty, neutral |
| **Speaker labeling** | Yes (LLM) | No |
| **Window-based** | Yes | Yes |
| **Input** | 03.audio-features | 03.audio-features |

**Recommendation:** Clarify which script is canonical for tone classification. Current duplication is confusing.

### Files Created by 05

| File | Pattern | Used By | Status |
|------|---------|---------|--------|
| `.tonality.json` | `{stem}.tonality.json` | Unknown | **TBD** |

---

## Summary: Orphan Outputs

### High Priority (Remove or Document)

| Script | Output | Recommendation |
|--------|--------|----------------|
| 01.download | `.mp4` video files | Remove download unless needed |
| 03.audio-features | `speaker_embedding.vector[]` | Use in 04 instead of pitch |

### Medium Priority (Consider Removing)

| Script | Output | Recommendation |
|--------|--------|----------------|
| 01.download | `.info.json` | Keep if metadata needed later |
| 02.transcribe | `words[]` timestamps | Remove unless needed for alignment |
| 02.transcribe | `.txt`, `.vtt`, `.tsv`, `.words.tsv`, `.spk.tsv` | Remove or make optional |

### Low Priority (Future Features)

| Script | Output | Recommendation |
|--------|--------|----------------|
| 03.audio-features | `pitch.range_hz`, `pitch.direction` | Document as "future use" |
| 03.audio-features | `quality.*` flags | Use in 04 for filtering |
| 03.audio-features | `audio_clip.*` | Remove if not needed |

---

## Data Flow Diagram

```
01.download
├── .audio.webm ─────────────┐
├── .asr.raw16k.wav ─────────┼──→ 02.transcribe
├── .asr.clean16k.wav ───────┘         │
├── .mp4 ────────────────────────────→ UNUSED
├── .info.json ──────────────────────→ UNUSED
└── .listen.mp3 ─────────────────────→ HUMAN REVIEW

02.transcribe
├── .full.json ──────────────────────→ 03.audio-features
├── .srt ────────────────────────────→ HUMAN REVIEW
└── other sidecars ──────────────────→ UNUSED

03.audio-features
└── .audio_features.json ────────────┬→ 04.segment-enrich
                                     └→ 05.tonality (PARALLEL PATH)

04.segment-enrich
└── .segment_enriched.json ──────────→ TBD (06/07?)

05.tonality
└── .tonality.json ──────────────────→ TBD
```

---

## Next Steps

1. **Confirm video download requirement** - Is `.mp4` needed? If not, remove
2. **Unify 04/05 tone logic** - Pick one, deprecate the other
3. **Use speaker_embedding in 04** - Replace pitch-based clustering
4. **Add tests for orphan detection** - `tests/pipeline/output-audit.test.ts`
