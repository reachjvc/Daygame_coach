# Pipeline Plan

Status: Active
Updated: 01-02-2026 21:00 - MAJOR: Consolidated speaker ID in 04. Removed clustering from 03, added global clustering to 04.
Updated: 31-01-2026 22:09 - Added "One Script at a Time" philosophy, extensive gate review process
Updated: 31-01-2026 20:01 - Added GATE + spot-checks for 03.audio-features (every script now has a gate)
Updated: 31-01-2026 19:50 - Added gate validation rules and extended spot-check requirements

---

## How to Use This Document

**This is the single source of truth for the pipeline.**

### For Claude Instances

1. Read this file AND `PIPELINE_STATUS.md` at the start of every session
2. The STATUS file tells you where we are; this file tells you the plan
3. **HARD GATES require user approval** - you cannot proceed without explicit "APPROVED"
4. If you find information that conflicts with this document, **ask the user** before proceeding
5. Update the STATUS file after completing work, not this file (unless user requests changes)

### Conflict Handling

If you encounter conflicting information (in code, other docs, or your own assumptions):
1. Stop and list the conflict
2. Ask user to resolve
3. Update this document with the resolution
4. Proceed only after confirmation

---

## Goal

Transform 456 YouTube videos into structured training data for a daygame coaching app:
- Speaker labels (coach/target/voiceover)
- Tone classification (5 tones via audio thresholds)
- Video type detection (infield/talking_head)
- Interaction extraction with techniques (31), topics (22), phases (4)
- Vector embeddings in Supabase

---

## Pipeline Structure (7 Scripts)

```
01.download       → Raw audio + metadata
02.transcribe     → Whisper → .full.json + .txt
03.audio-features → Pitch, energy, tempo, speaker_embedding (NO clustering)
04.segment-enrich → Speaker ID (global clustering + text patterns) + tone
05.conversations  → Video type + conversation boundaries
06a.structure     → Interaction boundaries + phases
06b.content       → Techniques + topics
07.ingest.ts      → Supabase vector store
```

**Note**: 06c.outcomes was removed (video selection bias makes outcome data unreliable).

### Data Flow

```
01 → 02 → 03 → 04 → 05 → 06a → 06b → 07
```

Each script reads from the previous script's output folder.

---

## Script Details

### 01.download
- **Input**: YouTube URLs from sources.txt
- **Output**: `data/01.download/{source}/{title} [{id}].asr.clean16k.wav`
- **Also creates**: .info.json, .listen.mp3

### 02.transcribe
- **Input**: `data/01.download/**/*.wav`
- **Output**: `data/02.transcribe/{source}/{title}.full.json` + `.txt`
- **Engines**: whisperx (preferred), faster-whisper, openai-whisper

### 03.audio-features
- **Input**: `data/02.transcribe/**/*.full.json`
- **Output**: `data/03.audio-features/{source}/{title}.audio_features.json`
- **Features**: pitch, energy, tempo, spectral, speaker_embedding (256-dim)
- **Note**: No speaker clustering here - embeddings only. Clustering done in 04.

### 04.segment-enrich
- **Input**: `data/03.audio-features/**/*.audio_features.json`
- **Output**: `data/04.segment-enrich/{source}/{title}.segment_enriched.json`
- **Speaker ID**: Global clustering (AgglomerativeClustering on embeddings) + text pattern classification
- **Tone**: Audio thresholds (playful/confident/nervous/energetic/neutral)
- **Note**: Single source of truth for all speaker labeling (coach/target/voiceover/other)

### 05.conversations
- **Input**: `data/04.segment-enrich/**/*.segment_enriched.json`
- **Output**: `data/05.conversations/{source}/{title}.conversations.json`
- **Does**: Video type detection, conversation boundary detection

### 06a.structure
- **Input**: `data/05.conversations/**/*.conversations.json`
- **Output**: `data/06a.structure/{source}/{title}.interactions.jsonl`
- **Does**: Extract interaction boundaries + phases (open/pre_hook/post_hook/close)

### 06b.content
- **Input**: `data/06a.structure/**/*.interactions.jsonl`
- **Output**: `data/06b.content/{source}/{title}.enriched.json`
- **Does**: Extract techniques + topics per interaction

### 07.ingest.ts
- **Input**: `data/06b.content/**/*.enriched.json`
- **Output**: Supabase embeddings table
- **Does**: Generate embeddings, store with metadata

---

## Quality Approach (One Script at a Time)

### Core Principle: Quality Over Speed

**The objective is to make sure each script works correctly, not to get through the pipeline fast.**

Think like a senior developer who has built these pipelines many times and has seen them fail further downstream because earlier steps had subtle bugs that weren't caught. Every bug not caught at step N becomes 10x harder to debug at step N+3.

### One Script at a Time

- **Complete one script fully** before moving to the next
- **Extensive verification** - not just summary tables and "APPROVED?"
- **Understand the data** - read actual segments, verify logic, spot anomalies
- **Question everything** - if something looks off, investigate before proceeding

### Gate Review Philosophy

A gate review is NOT:
- ❌ Two summary tables + "Reply APPROVED"
- ❌ Rushing to the next step
- ❌ Assuming the script worked because it ran without errors

A gate review IS:
- ✅ Deep inspection of actual output data
- ✅ Reading individual segments to verify correctness
- ✅ Comparing expected vs actual behavior
- ✅ Catching edge cases before they propagate downstream
- ✅ User understanding what the data looks like before approving

### Validation Layers

1. **Pre-gate validation**: Automated rules that MUST pass before presenting to user
2. **Distribution review**: At each gate, Claude presents label distributions
3. **Mandatory spot-checks**: Script-specific requirements (not just samples)
4. **Full minority review**: ALL minority labels shown, not sampled
5. **User deep-dive**: User reviews actual data, not just summaries

### Pre-Gate Validation Rules (HARD FAIL)

These rules must pass BEFORE presenting gate report. If any fail, fix the issue first.

**All Scripts:**
- No fallback/heuristic methods used (check `method` field - must be `llm_*` or `audio_threshold`)
- No `"unknown"` values in required classification fields
- Schema validation passes
- All files processed without errors

**03.audio-features specific:**
- `pitch_range_hz[1]` must be 350.0 (NOT 1046.5 - old format)
- `speaker_embedding` must be present for segments >= 0.8s duration
- `processing.embedder` must be "resemblyzer"
- At least 70% of segments must have non-null speaker_embedding

**04.segment-enrich specific:**
- `detected_video_type` must be `infield`, `talking_head`, or `podcast` (NOT `unknown`)
- All speaker labels must use `method: "llm_speaker_id"` (no pitch heuristics)
- If video has <3 "target" segments but type is "infield", flag for review

**05.conversations specific:**
- Each conversation must have at least 2 segments
- Conversation boundaries must not overlap

**06a.structure specific:**
- Each interaction must have at least one phase assigned
- Phases must be in valid order (open → pre_hook → post_hook → close)

**06b.content specific:**
- Each interaction must have at least one technique OR one topic

### Mandatory Spot-Check Requirements

Claude MUST present these items - not samples, but ALL instances:

**03.audio-features:**
1. **Per-video summary table**: segments count, embeddings present, embeddings null, pitch_range used
2. **ALL segments with null embeddings** - show segment index, duration, text (short segments expected)
3. **Speaker ID distribution** per video - how many spk_0, spk_1, unknown
4. **Sample 3 segments per video** with full feature values (pitch, energy, tempo, spectral)

**04.segment-enrich:**
1. **ALL segments labeled as minority speakers** (target, voiceover, other) - show full text
2. **ALL videos with <10% target segments** if type is "infield" - likely mislabeling
3. **Flag suspect labels**: target segments containing coach phrases ("here's what", "you got to", "I'm going to")
4. **Per-video summary**: video_type, speaker distribution, segment counts

**05.conversations:**
1. **ALL single-segment conversations** - likely boundary errors
2. **ALL videos with >10 conversations** - might be over-segmented
3. **Conversation length distribution** per video

**06a.structure / 06b.content:**
1. **ALL interactions with only 1 phase** - might be incomplete
2. **ALL interactions with 0 techniques** - might need review
3. **Sample 3 complete interactions** per video with full content

### Gate Review Process

**⚠️ IMPORTANT: Do not rush to approval. The goal is verification, not speed.**

For EVERY gate:

1. **Run all automated validations** - fix any failures before proceeding
2. **Generate summary tables** - but these are just the starting point
3. **Deep-dive into actual data**:
   - Read 5-10 actual segments from each video
   - Verify labels/classifications make sense
   - Look for patterns that indicate bugs
4. **Present findings to user** including:
   - What you checked
   - What you found
   - Any concerns or anomalies
   - Sample data for user to review
5. **Wait for user to ask questions** - they may want to see more data
6. **Only request approval after user is satisfied**

### What Claude Should Ask During Gate Review

- "Here's segment X - does this label look correct to you?"
- "I noticed pattern Y - is this expected?"
- "Want me to show more examples of Z?"
- "Should I investigate this anomaly further?"

### Gate Report Template

```
## Gate Report: [Script Name]

### ⚠️ Reminder
This gate review is about VERIFYING the script works correctly.
Take time to understand the data before approving.
Bugs caught now save 10x debugging time later.

### Pre-Gate Validation
- [ ] No fallback methods used
- [ ] No "unknown" classifications
- [ ] Schema validation passed
- [ ] [Script-specific checks passed]

### Processing Summary
- Files processed: X
- Errors: X (MUST BE 0)
- Skipped: X

### Data Inspection (Deep-Dive)

#### Per-Video Summary
[Table with key metrics]

#### Actual Data Samples
[Show 3-5 actual segments per video with full context]
[User should be able to verify correctness by reading these]

#### Mandatory Review Items
[ALL items from script-specific requirements]
[Show actual data, not just counts]

#### Anomalies & Concerns
[Anything that looks off, even if it passed validation]
[Better to flag false positives than miss real bugs]

### Questions for User
- [Specific questions about data correctness]
- [Areas where user input would help]

### Next Steps
User options:
1. Ask to see more data
2. Ask questions about specific items
3. Request fixes for issues found
4. APPROVED - only when satisfied with data quality
```

---

## Rollout Phases

### Phase A: 5 Test Videos
Run all scripts (04 → 05 → 06a → 06b → 07) on 5 videos.
**HARD GATE**: User approves final output quality.

### Phase B: 15 Additional Videos
Run full pipeline on 15 more videos.
**HARD GATE**: User approves (catches edge cases).

### Phase C: Remaining 436 Videos
Run full pipeline on all remaining videos.
**HARD GATE**: User approves final dataset.

---

## Master Checklist

### Phase 0: Preparation [COMPLETE]
- [x] Environment verified (Ollama + llama3.1:8b)
- [x] Schemas synced with taxonomy
- [x] Label guidelines created
- [x] Prompt templates ready
- [x] resemblyzer installed for speaker embeddings

### Phase A: 5 Test Videos [IN PROGRESS]
- [ ] 03.audio-features run on 5 videos
- [ ] **GATE: User approves 03 output**
- [ ] 04.segment-enrich run on 5 videos
- [ ] **GATE: User approves 04 output**
- [ ] 05.conversations run on 5 videos
- [ ] **GATE: User approves 05 output**
- [ ] 06a.structure run on 5 videos
- [ ] **GATE: User approves 06a output**
- [ ] 06b.content run on 5 videos
- [ ] **GATE: User approves 06b output**
- [ ] 07.ingest run on 5 videos
- [ ] **GATE: User approves ingested data**

### Phase B: 15 Additional Videos [NOT STARTED]
- [ ] Full pipeline on 15 videos
- [ ] **GATE: User approves Phase B**

### Phase C: 436 Remaining Videos [NOT STARTED]
- [ ] Full pipeline on 436 videos
- [ ] **GATE: User approves final dataset**

### Phase D: Cleanup [NOT STARTED]
- [ ] Archive old data folders (05.tonality, 06.speakers, 07.LLM-conversations, etc.)
- [ ] Archive old scripts
- [ ] Update documentation
- [ ] **GATE: User confirms pipeline complete**

---

## Taxonomies

### Phases (4)
| Phase | Description |
|-------|-------------|
| `open` | Initial approach and first contact |
| `pre_hook` | Coach working to engage her, she responds briefly |
| `post_hook` | She's invested, mutual exchange |
| `close` | Asking for contact or date |

### Techniques (31)

**Openers (5)**: direct_opener, indirect_opener, situational_opener, observation_opener, gambit

**Attraction (9)**: push_pull, tease, cold_read, role_play, disqualification, DHV, frame_control, takeaway, false_time_constraint

**Connection (8)**: qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor, screening, appreciation

**Compliance (1)**: compliance

**Closing (8)**: number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, time_bridge, logistics_check

### Topics (22)

**Personal (8)**: name, origin, career, education, hobby, travel, living_situation, ambitions

**Appearance (1)**: appearance

**Personality (4)**: personality, age, behavior, values

**Logistics (5)**: plans, contact, logistics, relationship, duration

**Context (4)**: food_drinks, location, humor, flirting

### Tones (5)
| Tone | Threshold Rules |
|------|-----------------|
| `playful` | pitch_std > 22 AND energy_dyn > 13 |
| `confident` | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 |
| `nervous` | syl_rate > 6.8 AND pitch_std < 16 |
| `energetic` | brightness > 1700 OR energy_dyn > 15 |
| `neutral` | Default (none of above) |

### Speaker Labels
- `coach` - The daygame coach
- `target` - The woman being approached
- `voiceover` - Commentary/narration (same voice as coach, different context)
- `other` - Bystanders, friends

### Video Types
- `infield` - Actual approach footage
- `talking_head` - Coach speaking to camera
- `podcast` - Interview/discussion format

---

## Key Locations

| Type | Path |
|------|------|
| Scripts | `scripts/training-data/` |
| Data | `data/` |
| Schemas | `scripts/training-data/schemas/` |
| Prompts | `prompts/` |
| Taxonomy | `data/taxonomy/v1.json` |
| This plan | `docs/overviews/PIPELINE/PIPELINE_PLAN.md` |
| Current status | `docs/overviews/PIPELINE/PIPELINE_STATUS.md` |

---

## Rules

1. **HARD GATES require explicit user approval** - Never proceed without "APPROVED"
2. **No fallbacks** - Scripts fail hard on errors; fix issues, don't work around them
3. **Pre-gate validation MUST pass** - Run all validation rules before presenting gate report
4. **Full minority review** - Show ALL minority labels (target/voiceover/other), never sample
5. **Sequential completion** - Each script must be validated before the next runs
6. **Document reality** - If code differs from docs, update docs (after user confirms)
7. **Ask on conflicts** - If information conflicts, stop and ask user

---

## Archived Documentation

The following files were consolidated into this document and moved to `archive/`:
- plan_pipeline.md (original master plan)
- overview_pipeline.md
- pipeline_gaps.md
- qa_evaluation_plan.md
- phase_0_preparation.md
- phase_1_segment_enrich.md
- phase_2_conversations.md
- phase_3_interactions.md
- phase_4_ingest.md
- phase_5_full_run.md
- phase_6_cleanup.md
- handoff_pipeline_planning.md
- script_output_audit.md
