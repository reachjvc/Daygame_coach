# Pipeline Restructuring Plan

> **NOTE (02-02-2026)**: Speaker identification approach simplified.
> Now uses pyannote diarization from 02.transcribe (not resemblyzer clustering).

Status: Testing
Updated: 02-02-2026 - Added speaker identification note
Updated: 31-01-2026 18:20 - Pipeline tested on 5 videos. Phases 1-3 working. Ready for full run.
Updated: 31-01-2026 06:15 - Model testing deferred (not skipped) - should test alternatives for quality.
Updated: 31-01-2026 06:00 - Synced docs with reality. Phase 1 script implemented + tested.
Updated: 31-01-2026 04:30 - Phase 0 COMPLETE. P0.9-P0.12 deferred. Starting Phase 1.
Updated: 31-01-2026 04:15 - P0.8 complete. All prompts reviewed. Test set 5/20.

## CURRENT STATUS

```
Phase 0: Preparation     [x] COMPLETE
Phase 1: segment-enrich  [x] TESTED on 5 videos - speaker_id from 03.audio-features
Phase 2: conversations   [x] TESTED on 5 videos - video type detection working
Phase 3: interactions    [x] TESTED on 5 videos - 06a + 06b working
Phase 4: ingest          [ ] Ready - needs Supabase connection
Phase 5: full-run        [ ] Not Started - regenerate 03.audio-features first
Phase 6: cleanup         [ ] Not Started
```

**Next Action**: Regenerate 03.audio-features for all 456 videos (resemblyzer now installed), then run full pipeline.

---

## GOAL

Transform 456 audio-analyzed videos into enriched training data:
- Speaker labels (coach/target/voiceover)
- Tone classification (5 tones)
- Video type detection (infield/talking_head/podcast)
- Interaction extraction with techniques (31), topics (22), phases (4)
- Vector embeddings in Supabase

## QUALITY TARGETS (Confidence-Based)

| Metric | Validation Method |
|--------|-------------------|
| Speaker labels | High confidence (>0.8) + spot-check + distribution sanity |
| Video type detection | High confidence (>0.85) + spot-check |
| Segment classification | High confidence (>0.8) + spot-check |
| Technique extraction | High confidence (>0.7) + taxonomy coverage check |
| Phase boundaries | High confidence (>0.8) + spot-check |
| Topic extraction | High confidence (>0.7) + taxonomy coverage check |
| Data integrity | 100% schema validation + merge success |

**Note**: Instead of mathematical accuracy targets, we use confidence-based review with spot-checks to catch systematic errors.

---

## PIPELINE STRUCTURE

```
03.audio-features (456 files, EXISTS)
        ↓
04.segment-enrich (NEW) → Speaker labels (LLM) + tone (audio thresholds)
        ↓
05.conversations (MIGRATE) → Video type + conversation boundaries
        ↓
06a.structure (NEW) → Interaction boundaries + phases
        ↓
06b.content (NEW) → Techniques + topics
        ↓
07.ingest (MIGRATE) → Supabase vector store
```

**Notes**:
- 06c.outcomes removed (video selection bias)
- Tone classification is **audio-based** (threshold rules), NOT LLM

## PHASE OVERVIEW

| Phase | Purpose | Input | Output | Est. Time |
|-------|---------|-------|--------|-----------|
| [0](../phases/phase_0_preparation.md) | Environment, config, schemas, model testing | - | Config ready | 2-3h |
| [1](../phases/phase_1_segment_enrich.md) | Speaker (LLM) + tone (audio) labeling | 03.audio-features | 04.segment-enrich | 3-4h |
| [2](../phases/phase_2_conversations.md) | Video type + conversation detection | 04.segment-enrich | 05.conversations | 2-3h |
| [3](../phases/phase_3_interactions.md) | Extract + enrich interactions | 05.conversations | 06a/06b | 4-6h |
| [4](../phases/phase_4_ingest.md) | Embeddings to Supabase | 06a/06b | Supabase | 1-2h |
| [5](../phases/phase_5_full_run.md) | Process all 456 files | All | All | 8-10h |
| [6](../phases/phase_6_cleanup.md) | Archive old, final validation | - | Complete | 1h |

---

## MASTER STEP LIST

Current Step: Ready for Phase 5 (full run) - need to regenerate 03.audio-features first

- [x] P0.1 Environment verification (Ollama + llama3.1:8B + deps OK) ([P0](../phases/phase_0_preparation.md#step-1-environment-verification))
- [x] P0.2 Config module plan finalized ([P0](../phases/phase_0_preparation.md#step-2-config-module-plan))
- [x] P0.3 Utils and state plan finalized ([P0](../phases/phase_0_preparation.md#step-3-utils-and-state-plan))
- [x] P0.4 Schemas synced with taxonomy ([P0](../phases/phase_0_preparation.md#step-4-schemas-split-06a06b06c))
  - [x] P0.4a Update segment_enriched.schema.json: tone enum 8→5, method=audio_threshold
  - [x] P0.4b Delete outcomes.schema.json
- [x] P0.5 Label guidelines COMPLETE (docs/overviews/label_guidelines.md) ([P0](../phases/phase_0_preparation.md#step-5-label-guidelines))
- [~] P0.6 Test video set selected (5/20 videos, need 15 more stratified) ([P0](../phases/phase_0_preparation.md#step-6-test-video-selection-changed-from-gold-set))
- [x] P0.7 Taxonomy file COMPLETE, all subgaps 8a-8f resolved (v1.2.0) ([P0](../phases/phase_0_preparation.md#step-7-taxonomy-versioning-plan))
- [x] P0.8 Prompt templates COMPLETE ([P0](../phases/phase_0_preparation.md#step-8-prompt-registry-plan))
  - [x] P0.8a Delete 04_tone_classification.md - DONE
  - [x] P0.8b Delete 06c_outcomes.md - DONE
  - [x] P0.8c Reviewed: 04_speaker OK, 05_video OK, 05_segment OK, 06b updated to v1.1.0
- [~] P0.9 Validation harness - DEFERRED to post-test-run
- [~] P0.10 Model testing - DEFERRED (llama3.1:8b in use, should test qwen2.5:7b/mistral:7b for potential quality improvement)
- [~] P0.11 Pilot protocol - DEFERRED to post-test-run
- [~] P0.12 Failure protocol - DEFERRED to post-test-run
- [x] P0.13 User approved - Moving to Phase 1
- [x] P1.1 Script IMPLEMENTED (04.segment-enrich exists + working) ([P1](../phases/phase_1_segment_enrich.md#script-specification-plan-only))
- [x] P1.2 Prompt v1.1.0 (prompts/04_speaker_labeling.md) ([P1](../phases/phase_1_segment_enrich.md#prompt-templates-plan))
- [x] P1.3 Speaker cluster analysis IMPLEMENTED ([P1](../phases/phase_1_segment_enrich.md#speaker-cluster-analysis-plan))
- [x] P1.4 LLM cluster labeling IMPLEMENTED + fixed (v1.1.0) ([P1](../phases/phase_1_segment_enrich.md#llm-cluster-labeling-plan))
- [x] P1.5 Tone window classification IMPLEMENTED (audio thresholds) ([P1](../phases/phase_1_segment_enrich.md#tone-window-classification-plan))
- [x] P1.6 Edge case handling IMPLEMENTED (video type pre-detection) ([P1](../phases/phase_1_segment_enrich.md#edge-cases-plan))
- [x] P1.7 Test run DONE (5 videos tested, bug fixed) ([P1](../phases/phase_1_segment_enrich.md#quality-gates-confidence-based))
- [~] P1.8-P1.10 Validation - part of end-to-end test
- [~] P1.11 User approved (Phase 1) - pending end-to-end test ([P1](../phases/phase_1_segment_enrich.md#exit-criteria))
- [x] P2.1 Script migration DONE (05.conversations reads from 04.segment-enrich)
- [x] P2.2 Input/output paths UPDATED
- [x] P2.9 Test run DONE (5 videos tested)
- [~] P2.3-P2.8, P2.10-P2.11 Deferred - script working, validation in Phase 5
- [x] P3.1 06a.structure TESTED (extracts interactions from conversations)
- [x] P3.5 06b.content TESTED (enriches with techniques/topics)
- [ ] P3.3 06a test run + confidence validation plan defined ([P3](../phases/phase_3_interactions.md#06astructure-plan))
- [ ] P3.4 Gate A user approval (06a) ([P3](../phases/phase_3_interactions.md#06astructure-plan))
- [ ] P3.5 06b.content plan defined ([P3](../phases/phase_3_interactions.md#06bcontent-plan))
- [ ] P3.6 06b prompt template + taxonomy enforcement plan defined ([P3](../phases/phase_3_interactions.md#06bcontent-plan))
- [ ] P3.7 06b test run + confidence validation plan defined ([P3](../phases/phase_3_interactions.md#06bcontent-plan))
- [ ] P3.8 Edge case handling plan defined ([P3](../phases/phase_3_interactions.md#edge-cases-plan))
- [ ] P3.9 Gate: user approval (06a + 06b) ([P3](../phases/phase_3_interactions.md#exit-criteria))
- [ ] P4.1 Script migration plan defined ([P4](../phases/phase_4_ingest.md#migration-from-10ingestts-plan))
- [ ] P4.2 Input sources updated (06a + 06b) ([P4](../phases/phase_4_ingest.md#migration-from-10ingestts-plan))
- [ ] P4.3 Merge strategy defined ([P4](../phases/phase_4_ingest.md#merge-strategy-plan))
- [ ] P4.4 Lineage metadata plan defined (prompt/model/schema/taxonomy) ([P4](../phases/phase_4_ingest.md#lineage-metadata-plan))
- [ ] P4.5 Validation before insert plan defined ([P4](../phases/phase_4_ingest.md#validation-before-insert-plan))
- [ ] P4.6 Dry-run test plan defined ([P4](../phases/phase_4_ingest.md#testing-plan))
- [ ] P4.7 Small batch test plan defined ([P4](../phases/phase_4_ingest.md#testing-plan))
- [ ] P4.8 Data integrity plan defined ([P4](../phases/phase_4_ingest.md#testing-plan))
- [ ] P4.9 User approved (Phase 4) ([P4](../phases/phase_4_ingest.md#exit-criteria))
- [ ] P5.1 Backup plan defined ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.2 Version freeze plan (prompt/model/schema/taxonomy) ([P5](../phases/phase_5_full_run.md#version-freeze-plan))
- [ ] P5.3 04.segment-enrich full run plan ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.4 05.conversations full run plan ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.5 06a.structure full run plan ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.6 06b.content full run plan ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.7 07.ingest full run plan ([P5](../phases/phase_5_full_run.md#full-run-plan-high-level))
- [ ] P5.9 Full-run QA sampling plan ([P5](../phases/phase_5_full_run.md#qa-sampling-plan-full-run))
- [ ] P5.10 User approved (Phase 5) ([P5](../phases/phase_5_full_run.md#exit-criteria))
- [ ] P6.1 Final quality report plan defined ([P6](../phases/phase_6_cleanup.md#step-1-final-quality-report-plan))
- [ ] P6.2 User final spot-check plan defined ([P6](../phases/phase_6_cleanup.md#step-2-user-final-spot-check-plan))
- [ ] P6.3 Dataset version and data card plan defined ([P6](../phases/phase_6_cleanup.md#step-3-dataset-version-and-data-card-plan))
- [ ] P6.4 Old data folders archive plan defined ([P6](../phases/phase_6_cleanup.md#step-4-archive-old-data-folders-plan))
- [ ] P6.5 Old scripts archive plan defined ([P6](../phases/phase_6_cleanup.md#step-5-archive-old-scripts-plan))
- [ ] P6.6 Documentation update plan defined ([P6](../phases/phase_6_cleanup.md#step-6-update-documentation-plan))
- [ ] P6.7 Temporary files cleanup plan defined ([P6](../phases/phase_6_cleanup.md#step-7-cleanup-plan))
- [ ] P6.8 Pipeline marked complete (plan) ([P6](../phases/phase_6_cleanup.md#step-8-mark-complete-plan))

---

## EXECUTION MODEL

**End-to-End First**: Run ALL phases (1→2→3→4) on 20 test videos, then validate final output.

```
Phase 0: Preparation (setup artifacts)
    ↓
Phases 1-4: Run end-to-end on 20 TEST videos (no user gates between phases)
    ↓
VALIDATION GATE: User reviews final output (flagged items + spot-checks)
    ↓
If issues: trace back → fix → re-run all phases on test videos
    ↓
Once approved: Run Phases 1-4 on ALL 456 files
    ↓
Phase 6: Cleanup
```

**Validation Strategy (Confidence-Based)**:
1. **Automated**: Schema validation at each phase (AI handles, no user gate)
2. **End-to-End Validation**: After Phase 4 completes on test videos:
   - Low-confidence flagging (~10% of outputs)
   - Distribution analysis for all label types
   - Random spot-checks of high-confidence items
3. **Single User Gate**: User reviews final validation report, approves or requests fixes

**No Fallbacks**: Scripts fail hard on errors. Fix issues, don't work around them.

---

## MIGRATION STRATEGY

**Migrate (code works, update paths)**:
- `07.LLM-conversations` → `05.conversations`
- `10.ingest.ts` → `07.ingest.ts`

**Create New**:
- `04.segment-enrich` (replaces rule-based 05.tonality + 06.speakers)
- `06a.structure`, `06b.content`, `06c.outcomes` (replaces 08.interactions + 09.enrich)

**Data Folders**:
- NEW folders created fresh (04, 05, 06a, 06b, 06c)
- OLD folders kept until validation passes
- After approval → archive as `.deprecated`

---

## SHARED INFRASTRUCTURE

### State Management (All Scripts)
Each script maintains `.{script_name}.state.json`:
- Tracks processed files with checksums
- Enables resume after interruption
- Supports `--force` to reprocess all
**Required metadata in state**:
- `prompt_version`
- `model_version`
- `schema_version`
- `taxonomy_version`
- `prompt_registry_version`
- upstream input checksum(s)
- `pipeline_version`

### CLI Flags (All Scripts)
```
--input FILE       Process single file
--sources          Process all sources
--force            Reprocess all (ignore state)
--retry-failed     Only retry failed files
--dry-run          Show what would be processed
```

### Config Location
`scripts/training-data/config.py` - LLM settings, paths, versions

### Schemas Location
`scripts/training-data/schemas/*.schema.json`

### Prompt Templates Location
`prompts/` - one file per task, versioned

### Taxonomy Location
`data/taxonomy/` - versioned taxonomy files

---

## TAXONOMIES

### Phases (4) - ✅ RESOLVED via 8a

`open` → `pre_hook` → `post_hook` → `close`

- **open**: Initial approach and first contact
- **pre_hook**: Coach working to engage her, she responds briefly
- **post_hook**: She's invested, mutual exchange
- **close**: Asking for contact or date

**Additional**: `hook_point` marker with turn_index, signal, confidence

### Techniques (31) - ✅ RESOLVED via 8b

**Openers (5)**: direct_opener, indirect_opener, situational_opener, observation_opener, gambit

**Attraction (9)**: push_pull, tease, cold_read, role_play, disqualification, DHV, frame_control, takeaway, false_time_constraint

**Connection (8)**: qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor, screening, appreciation

**Compliance (1)**: compliance

**Closing (8)**: number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, time_bridge, logistics_check

**Removed**: neg, false_disqualifier, preselection, buying_temperature, IOI_recognition, reframe (→frame_control), compliance_test/ladder (→compliance), kino, proximity, front_stop, side_stop, seated_approach

### Topics (22) - ✅ RESOLVED via 8e

**Personal (8)**: name, origin, career, education, hobby, travel, living_situation, ambitions

**Appearance (1)**: appearance (absorbs style, hair, eyes, height, tattoos, fitness)

**Personality (4)**: personality, age, behavior, values

**Logistics (5)**: plans, contact, logistics, relationship, duration

**Context (4)**: food_drinks, location, humor, flirting

**Removed**: lifestyle, relationship_history, social_circle, style, hair, eyes, height, tattoos, fitness (→appearance), energy, texting, weather, events, pets

### Tones (5) - ✅ RESOLVED via 8d

`playful`, `confident`, `nervous`, `energetic`, `neutral`

**Removed**: warm (→timbre-based), grounded (→overlaps confident), direct (→semantic), flirty (→overlaps playful)

### Outcomes - ✅ REMOVED via 8f

Removed entirely due to video selection bias (~90% successes). Can add back with better data sources.

---

## ROLLBACK

### Full Rollback
```bash
tar -xzf backups/data-backup-YYYYMMDD.tar.gz -C /
git checkout -- scripts/training-data/
```

### Partial Rollback (one phase)
```bash
rm -rf data/0X.folder/
rm -f data/.state/.0X.script.state.json
# Re-run that phase
```

---

## PHASE FILES

- [Phase 0: Preparation](../phases/phase_0_preparation.md)
- [Phase 1: segment-enrich](../phases/phase_1_segment_enrich.md)
- [Phase 2: conversations](../phases/phase_2_conversations.md)
- [Phase 3: interactions](../phases/phase_3_interactions.md)
- [Phase 4: ingest](../phases/phase_4_ingest.md)
- [Phase 5: Full Run](../phases/phase_5_full_run.md)
- [Phase 6: Cleanup](../phases/phase_6_cleanup.md)

---

## ADDED QUALITY-FIRST STEPS (AI-IMPLEMENTABLE)

### Phase 0: Preparation
1. Define label guidelines for tones, techniques, topics, phases (with examples).
2. Define taxonomy versioning + storage plan.
3. Define prompt registry + versioning plan.
4. Select test video set (20 videos, stratified).
5. Implement validation harness (confidence flagging, distributions, spot-check sampling).
6. Add state metadata fields (prompt/model/schema/pipeline/taxonomy versions + checksums).
7. Define failure protocol for systematic errors.
8. Gate: User approves Phase 0 artifacts before test run.

**Planning Docs**:
- QA validation plan: [qa_evaluation_plan.md](qa_evaluation_plan.md)
- Split schema plan: [schemas_06abc.md](schemas_06abc.md)

### Test Run: Phases 1-4 on 20 Videos (End-to-End)
1. Run Phase 1 (segment-enrich) on 20 test videos → automated schema validation only.
2. Run Phase 2 (conversations) on outputs → automated schema validation only.
3. Run Phase 3 (06a→06b→06c) on outputs → automated schema validation only.
4. Run Phase 4 (ingest) on outputs → automated merge/integrity validation.
5. **NO user gates between phases** - AI continues automatically if schema validation passes.

### Validation Gate (After Phase 4 Completes)
1. Generate comprehensive validation report covering ALL phases:
   - Speaker label distributions + flagged items
   - Tone distributions (audio-based classification)
   - Video type distributions + flagged items
   - Technique/topic coverage + flagged items
   - Phase boundary flags
2. User reviews flagged items + spot-checks final output.
3. If systematic errors found → AI traces to root cause phase → fix → re-run ALL phases on test videos.
4. Gate: User approves before full run.

### Full Run: Phases 1-4 on 456 Files
1. Run all phases end-to-end on 456 files.
2. Generate final validation report with distributions.
3. Gate: User approves archive/cleanup.
