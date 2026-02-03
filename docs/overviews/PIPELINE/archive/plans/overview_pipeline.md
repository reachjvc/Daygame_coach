# Pipeline Overview

**ARCHIVED** - Superseded by `docs/overviews/PIPELINE/PIPELINE_PLAN.md`

> **NOTE (02-02-2026)**: Speaker identification approach changed.
> Current: pyannote diarization from 02.transcribe.
> The resemblyzer embedding description below is outdated.

Status: Approved - Option B Restructuring
Updated: 02-02-2026 - Added speaker identification note
Updated: 02-02-2026 14:00 - Cleaned: Updated to large-v3 only (HYBRID rejected after testing)
Updated: 02-02-2026 22:30 - Cleaned: Updated to HYBRID transcription (distil-v3 + large-v3)
Updated: 30-01-2026 16:00 - Added quality targets and expanded taxonomies
Updated: 30-01-2026 14:35 - Cleaned up, removed legacy analysis
Updated: 30-01-2026 13:00 - Comprehensive analysis + restructuring proposal

## CRITICAL RULES
1) ALWAYS test quality. INFORM me of ANY divergence.
2) NEVER defer issues. NEVER use fallbacks. NEVER accept lower quality.
3) The pipeline is ALWAYS run entirely. Only the FINAL output is useful.

---

## QUALITY TARGETS (Production Grade)

| Metric | Target | Test Method |
|--------|--------|-------------|
| Speaker labels | **95%+** | 200 segments across 20 videos |
| Video type detection | **95%+** | 50 videos |
| Segment classification | **90%+** | 200 segments |
| Technique extraction | **90%+ recall** | 30 interactions |
| Phase boundaries | **95%+** | 30 interactions |
| Topic extraction | **85%+ recall** | 30 interactions |
| Data integrity | **100%** | Automated verification |

**See [plan_pipeline.md](plan_pipeline.md) for 100-step implementation plan.**

## Goal

Transform YouTube videos into structured training data:
- **QA**: Answer questions about daygame techniques
- **Scenarios**: Openers, shittests, vibing examples
- **Articles**: Principles extracted from data

**END GOAL**: For each video know: talking head vs infield, tones, topics, techniques, phases.

---

## TARGET PIPELINE (Split, Quality-First)

```
01.download       → Raw audio + metadata
02.transcribe     → Text + timestamps (Whisper)
03.audio-features → Audio features + speaker embeddings
04.segment-enrich → LLM: tone + speaker labels (NEW)
05.conversations  → Video type + conversation boundaries (title + transcript + metadata)
06a.structure     → Interaction boundaries + phases (NEW)
06b.content       → Techniques + topics (taxonomy-only)
06c.outcomes      → Outcomes + quality summary
07.ingest         → Supabase vector store
```

**See [plan_pipeline.md](plan_pipeline.md) for implementation details.**

---

## QUALITY GATES (AI-IMPLEMENTED)

1. After each phase, AI produces a QA report (counts, failures, samples).
2. AI prompts user for explicit approval before continuing.
3. If rejected, AI pauses and proposes specific fixes.
4. Pilot run required before full run for 04, 05, 06a/06b/06c.
5. Final gate requires gold-set metrics at or above targets.

## SCRIPT DESCRIPTIONS

### 01.download
- Downloads via yt-dlp with anti-bot measures
- Random delays (8-25s), user-agent rotation, session limits
- Creates 16kHz mono WAV + .info.json metadata

### 02.transcribe
- **large-v3 only** (LOCKED 02-02-2026):
  - `large-v3` with `condition_on_previous_text=True` for accurate text
  - `whisperx.align` for sentence-level segmentation
  - pyannote for speaker diarization
- Word-level timestamps
- Anti-loop protection
- Note: HYBRID approach (distil-v3 + large-v3) was tested and rejected due to distil-v3 transcription errors

### 03.audio-features
- Per-segment: pitch, energy, tempo, spectral features
- Passes through `pyannote_speaker` from 02.transcribe (SPEAKER_00, SPEAKER_01)
- Also computes speaker embeddings via resemblyzer (256-dim) for potential future use

### 04.segment-enrich (NEW)
- LLM labels speaker clusters as coach/target/voiceover
- LLM classifies tone per 30s window (8 tones)
- Replaces rule-based 05.tonality + heuristic 06.speakers

### 05.conversations (renamed from 07)
- Video type detection: title + transcript + metadata → infield/talking_head/podcast
- Segment classification: approach/commentary/transition
- Assigns `conversation_id` per distinct approach

### 06a.structure (NEW)
- Groups segments by `conversation_id`
- Extracts interaction boundaries + phases only

### 06b.content (NEW)
- Extracts techniques + topics per phase
- Enforces taxonomy-only outputs and normalizes unknowns

### 06c.outcomes (NEW)
- Extracts outcomes + quality summary
- Consistency checks with phases

### 07.ingest (renamed from 10)
- Supabase vector store
- Phase-based chunking
- Incremental state tracking

---

## DATA LOCATIONS

```
data/
├── 01.download/          # Raw audio
├── 02.transcribe/        # Transcripts
├── 03.audio-features/    # Audio analysis
├── 04.segment-enrich/    # Tone + speaker (NEW)
├── 05.conversations/     # Conversation boundaries
├── 06a.structure/        # Interaction boundaries + phases
├── 06b.content/          # Techniques + topics
├── 06c.outcomes/         # Outcomes + quality summary
└── .ingest_state.json    # Tracking
```

## SCRIPT LOCATIONS

```
scripts/training-data/
├── 01.download           # Bash
├── 02.transcribe         # Python
├── 03.audio-features     # Python
├── 04.segment-enrich     # Python (NEW)
├── 05.conversations      # Python (renamed)
├── 06a.structure         # Python (NEW)
├── 06b.content           # Python (NEW)
├── 06c.outcomes          # Python (NEW)
└── 07.ingest.ts          # TypeScript (renamed)
```

---

## CURRENT DATA COUNTS

```
01.download:          2753 files
02.transcribe:        2303 files
03.audio-features:     456 files
04.segment-enrich:       0 files (NEW)
05.conversations:      455 files (legacy output, needs re-run after 04)
06a.structure:           0 files (NEW)
06b.content:             0 files (NEW)
06c.outcomes:            0 files (NEW)
```

**Next**: Run 04.segment-enrich on a pilot subset, validate, then re-run 05 → 06a → 06b → 06c → 07.

---

## TAXONOMIES (Expanded)

### Techniques (37) - was 26

**Openers** (5):
direct_opener, indirect_opener, situational_opener, observation_opener, `gambit` (NEW)

**Attraction** (14):
push_pull, tease, cold_read, role_play, disqualification, neg, DHV, preselection,
`frame_control` (NEW), `buying_temperature` (NEW), `IOI_recognition` (NEW), `takeaway` (NEW), `reframe` (NEW), `false_disqualifier` (NEW)

**Connection** (8):
qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor,
`screening` (NEW), `appreciation` (NEW)

**Physical** (5):
kino, proximity, false_time_constraint, compliance_test, `compliance_ladder` (NEW)

**Closing** (7):
number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, `time_bridge` (NEW)

**Mechanics** (3):
front_stop, side_stop, seated_approach

### Topics (28) - was 18

**Personal** (9):
origin, career, education, hobby, travel, living_situation,
`lifestyle` (NEW), `relationship_history` (NEW), `ambitions` (NEW), `social_circle` (NEW)

**Appearance** (7):
appearance, style, hair, eyes, height, tattoos, fitness

**Personality** (6):
personality, energy, age, `behavior` (NEW), `values` (NEW)

**Logistics** (5):
plans, contact, logistics, relationship, `texting` (NEW)

**Context** (6):
food_drinks, location, weather, events, `humor` (NEW), `flirting` (NEW), `pets` (NEW)
