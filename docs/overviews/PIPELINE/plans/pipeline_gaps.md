# Pipeline Gaps (Pre-Implementation Blockers)

Status: Active
Updated: 31-01-2026 06:15 - Model testing DEFERRED (not skipped) - should test alternatives for quality improvement
Updated: 31-01-2026 06:00 - Synced with reality: Label guidelines COMPLETE, Model selected (no formal test), Tones research COMPLETE
Updated: 31-01-2026 03:30 - Environment verified. Schemas complete. P0.1-P0.4 done.
Updated: 31-01-2026 03:00 - Deleted obsolete files (outcomes schema/prompt, LLM tone prompt). Added P0 steps for schema sync.
Updated: 31-01-2026 01:35 - Resolved 8f.Outcomes: removed entirely (video selection bias)
Updated: 31-01-2026 01:30 - Resolved 8e.Topics: pruned 34 → 22 topics, added name/duration

## SYNC RULE (MANDATORY)

**When ANY gap below is resolved, Claude MUST also update all related files:**

1. Mark the gap as `[x]` in THIS file
2. Update the corresponding step in [phase_0_preparation.md](../phases/phase_0_preparation.md)
3. Update the master checklist in [plan_pipeline.md](plan_pipeline.md)
4. Update any other phase files that reference the resolved item

**Never mark a gap resolved without propagating the change to all relevant docs.**

---

## BLOCKING GAPS

These must be resolved before AI can self-execute the pipeline.

### 1. End-to-End Test Run (After Phase 0)

```
[ ] 20 test videos selected (stratified: infield/talking_head/podcast)
[ ] ALL phases (1→2→3→4) run on test videos (automated validation only)
[ ] Comprehensive validation report generated
[ ] User reviews flagged items + spot-checks
[ ] User approves OR issues traced/fixed and re-run
```

**Approach (End-to-End)**:
1. Run ALL phases on 20 test videos in one go (no user gates between phases)
2. Automated schema validation at each phase (pipeline stops if fails)
3. After Phase 4 completes: generate comprehensive validation report
4. Single user gate: review flagged items, spot-checks, distributions
5. If issues found → trace to root cause phase → fix → re-run ALL phases

**Why this works**:
- User cares about FINAL output, not intermediate stages
- Errors in early phases might be acceptable if they don't affect final output
- Single validation gate = less overhead

**Location**: `data/test/pilot/`

**Related files**:
- [phase_0_preparation.md](../phases/phase_0_preparation.md) Step 8
- [qa_evaluation_plan.md](qa_evaluation_plan.md)

---

### 2. Label Guidelines (P0 Step 5) - COMPLETE

```
[x] Label guidelines document created with definitions + examples
[x] User has reviewed and approved content
```

**Status**: ✅ COMPLETE

**File**: `docs/overviews/label_guidelines.md` (created 31-01-2026 04:00)

**Contents**:
- 4 phases with definitions, markers, transition signals
- 31 techniques with definitions, examples, disambiguation
- 22 topics with definitions
- 5 tones with audio threshold rules
- Speaker labels and video types

---

### 3. Prompt Templates (P1/P2/P3) - COMPLETE

```
[x] prompts/04_speaker_labeling.md - v1.0.0, in use by 04.segment-enrich script
[x] prompts/04_tone_classification.md - DELETED (tone is audio-based, not LLM)
[x] prompts/05_video_type.md - exists, used by 05.conversations
[x] prompts/05_segment_type.md - exists, used by 05.conversations
[x] prompts/06a_structure.md - v1.1.0, updated with 8a.Phases decision
[x] prompts/06b_content.md - exists (to be used in Phase 3)
[x] prompts/06c_outcomes.md - DELETED (outcomes removed)
```

**Status**: ✅ All required prompts exist and are versioned. Scripts are using them.

---

### 4. Validation Harness (P0 Step 9) - CHANGED

```
[ ] Validation harness can flag low-confidence outputs
[ ] Validation harness can generate distribution reports
[ ] Validation harness can sample random items for spot-check
[ ] Validation harness generates markdown review reports
```

**Why blocking**: Need automated tooling to flag uncertain outputs and generate review queues.

**Location needed**: `scripts/training-data/qa/` or `src/qa/`

**Must support**:
- Flag outputs below confidence threshold
- Generate distribution summaries (speaker %, video type %, etc.)
- Sample random high-confidence items for spot-check
- Generate markdown reports for user review

**Related files**:
- [phase_0_preparation.md](../phases/phase_0_preparation.md) Step 9
- [qa_evaluation_plan.md](qa_evaluation_plan.md)

---

### 5. Model Selection (P0 Step 10) - DEFERRED

```
[ ] Model testing: qwen2.5:7b vs mistral:7b vs llama3.1:8b - TO BE DONE
[x] Working model selected: llama3.1:8b (pragmatic choice, working)
```

**Status**: llama3.1:8b is in use. Script tested and working. Formal comparative testing DEFERRED (not skipped).

**Current config**: `OLLAMA_MODEL = "llama3.1:latest"` in 04.segment-enrich

**Why test later**: Quality analysis revealed speaker labeling errors in some videos. Root cause is upstream audio clustering (not LLM), but alternative models might still yield better results. Should test qwen2.5:7b and mistral:7b for potential quality improvement.

**Test plan (when ready)**:
1. Select 5-10 diverse test videos
2. Run speaker labeling with each model
3. Compare: label accuracy, confidence scores, edge case handling
4. Document results and select best performer

---

### 6. Taxonomy File (P0 Step 6) - IN PROGRESS

```
[x] Taxonomy JSON created: data/taxonomy/v1.json
[x] Taxonomy versioning strategy documented
[~] User reviewing taxonomy content via subgaps 8a-8f
```

**Status**: ✅ COMPLETE - all subgaps resolved (31-01-2026)

**Progress**:
- 8a.Phases: ✅ RESOLVED (open/pre_hook/post_hook/close)
- 8b.Techniques: ✅ RESOLVED (31 techniques, pruned from 42)
- 8c.Multi-technique: ✅ RESOLVED (array per turn)
- 8d.Tones: ✅ RESOLVED (5 tones: playful, confident, nervous, energetic, neutral)
- 8e.Topics: ✅ RESOLVED (22 topics, pruned from 34)
- 8f.Outcomes: ✅ RESOLVED (removed entirely)

**See**: [Taxonomy Subgaps](#8-taxonomy-subgaps-active) below for detailed breakdown.

**Related files**:
- [phase_0_preparation.md](../phases/phase_0_preparation.md) Step 7
- [phase_3_interactions.md](../phases/phase_3_interactions.md) 06b section
- [plan_pipeline.md](plan_pipeline.md) TAXONOMIES section

---

### 7. Schema JSON Files (P0 Step 4) - DONE

```
[x] scripts/training-data/schemas/segment_enriched.schema.json - updated: 5 tones, method=audio_threshold
[x] scripts/training-data/schemas/conversations.schema.json - OK (no taxonomy fields)
[x] scripts/training-data/schemas/structure.schema.json - updated with 8a.Phases decision
[x] scripts/training-data/schemas/content.schema.json - OK (supports technique arrays, validates against taxonomy at runtime)
[x] scripts/training-data/schemas/outcomes.schema.json - DELETED
```

**Status**: ✅ Complete. All schemas synced with taxonomy v1.2.0.

---

---

### 8. Taxonomy Subgaps (ACTIVE)

User requested detailed review of taxonomy created by previous Claude. Split into subgaps for systematic resolution.

#### 8a. Phases - RESOLVED

```
[x] Decide phase model: 4-phase street daygame model
[x] Validate detectability from transcripts
[x] Update taxonomy, schemas, prompts
[ ] Update label guidelines (blocked by other taxonomy subgaps)
```

**Decision (30-01-2026)**: 4-phase street daygame model adopted:
- `open` → Initial approach and first contact
- `pre_hook` → Coach working to engage her, she responds briefly
- `post_hook` → She's invested, mutual exchange
- `close` → Asking for contact or date

**Additional**:
- `hook_point` added as a marker (turn index + signal + confidence)
- `logistics_check` added as a technique (not a phase)
- Scoped to street daygame only

**Files updated**:
- `data/taxonomy/v1.json` - phases array
- `scripts/training-data/schemas/structure.schema.json` - phase definitions + hook_point
- `prompts/06a_structure.md` - prompt updated to v1.1.0

---

#### 8b. Techniques - RESOLVED

```
[x] Prune to transcript-detectable only (remove visual/physical)
[x] Merge overlapping techniques
[x] Update taxonomy
[ ] Update content.schema.json (after 8c multi-technique decision)
[ ] Update 06b prompt (after label guidelines)
```

**Decision (31-01-2026)**: Pruned from 42 → 31 techniques.

**Removed (11)**:
- `neg` (overlap with tease)
- `false_disqualifier` (fold into disqualification)
- `preselection`, `buying_temperature`, `IOI_recognition` (not transcript-detectable)
- `reframe` (merged into frame_control)
- `compliance_test`, `compliance_ladder` (merged into compliance)
- `kino`, `proximity` (physical/visual only)
- `front_stop`, `side_stop`, `seated_approach` (mechanics/visual only)

**Merged**:
- `reframe` + `frame_control` → `frame_control`
- `compliance_test` + `compliance_ladder` → `compliance`

**Final categories**:
- **Openers (5)**: direct_opener, indirect_opener, situational_opener, observation_opener, gambit
- **Attraction (9)**: push_pull, tease, cold_read, role_play, disqualification, DHV, frame_control, takeaway, false_time_constraint
- **Connection (8)**: qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor, screening, appreciation
- **Compliance (1)**: compliance
- **Closing (8)**: number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, time_bridge, logistics_check

**Label Guidelines notes** (for Step 5):
- `disqualification`: Includes playful/fake disqualifications like "minus 10 points to Gryffindor" - this is a distinct pattern within disqualification that should be detected
- `DHV`: Keep despite detection difficulty - sometimes explicit ("I just got back from Paris")

**Files updated**:
- `data/taxonomy/v1.json` - techniques pruned, version bumped to 1.1.0

---

#### 8c. Multi-technique Detection - RESOLVED

```
[x] Decide approach: array per turn vs co_techniques field
[ ] Update content.schema.json (after 8d-8f resolved)
[ ] Update 06b prompt (after label guidelines)
[ ] Update validation harness (after 8d-8f resolved)
```

**Decision (30-01-2026)**: Allow array of techniques per turn.

**Rationale**:
- Reality: push_pull often combines with frame_control, tease combines with cold_read
- Array approach is cleaner than a separate co_techniques field
- Schema will use `techniques: [{technique, confidence, evidence}]` per turn
- Simpler to query and analyze than co-occurrence tracking

**Schema change needed**:
- `content.schema.json`: Change `technique: string` to `techniques: array`
- Each technique entry includes: technique name, confidence, evidence snippet

**Files to update** (after taxonomy finalized):
- `scripts/training-data/schemas/content.schema.json`
- `prompts/06b_content.md`

---

#### 8d. Tones - RESOLVED

```
[x] Phase 1: Literature review (SER research) - Steps 1-15
[x] Phase 2: Feature analysis (multi-k clustering) - Steps 16-30
[x] Phase 3: Cluster analysis - Steps 31-40
[~] Phase 4: Distinguishability testing - Steps 41-45 SKIPPED (thresholds derived from clustering)
[~] Phase 5: Validation design - Steps 46-50 SKIPPED (validation deferred)
[x] Taxonomy updated: 8 → 5 tones
[x] LLM tone prompt DELETED (tone is audio-based algorithmic classification)
[x] Update segment_enriched.schema.json (5 tones enum) - DONE
[x] Thresholds implemented in 04.segment-enrich script - DONE
[x] Update label guidelines - DONE
```

**IMPORTANT**: Tone classification uses audio feature thresholds, NOT LLM. Thresholds derived from cluster analysis (Steps 37-38).

**Status**: ✅ COMPLETE - Research outcome achieved. Threshold rules are implemented and working in 04.segment-enrich.

**Final 5 Tones**:
| Tone | % of Data | Threshold Rules |
|------|-----------|-----------------|
| **playful** | 13% | pitch_std > 22 AND energy_dyn > 13 |
| **confident** | 14% | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 |
| **nervous** | 14% | syl_rate > 6.8 AND pitch_std < 16 |
| **energetic** | 12% | brightness > 1700 OR energy_dyn > 15 |
| **neutral** | 47% | Default (none of above) |

**Removed tones**: warm, grounded, direct, flirty

**Research Files** (can be archived):
- [tones_gap.md](tones_gap.md) - Research plan (Steps 41-50 skipped, outcome achieved)
- [TONES_RESEARCH_SUMMARY.md](../research/tones/TONES_RESEARCH_SUMMARY.md) - Consolidated findings

---

#### 8e. Topics - RESOLVED

```
[x] Analyze actual transcripts for topic coverage
[x] Add missing common topics (name, duration)
[x] Remove rarely-used topics
[x] Update taxonomy
[ ] Update content.schema.json (after 8f resolved)
[ ] Update 06b prompt (after label guidelines)
```

**Decision (31-01-2026)**: Pruned from 34 → 22 topics based on transcript analysis.

**Removed (14):**
- `lifestyle`, `relationship_history`, `social_circle` (rarely explicit topics)
- `style`, `hair`, `eyes`, `height`, `tattoos`, `fitness` (folded into `appearance`)
- `energy` (too abstract for detection)
- `texting` (never a topic)
- `weather`, `events`, `pets` (never appear)

**Added (2):**
- `name` - Name exchange happens in every interaction
- `duration` - "How long have you been here?" very common

**Final 22 topics in 5 categories:**
- **personal (8)**: name, origin, career, education, hobby, travel, living_situation, ambitions
- **appearance (1)**: appearance (absorbs style, hair, eyes, height, tattoos, fitness)
- **personality (4)**: personality, age, behavior, values
- **logistics (5)**: plans, contact, logistics, relationship, duration
- **context (4)**: food_drinks, location, humor, flirting

**Files updated:**
- `data/taxonomy/v1.json` - topics pruned, version bumped to 1.2.0

---

#### 8f. Outcomes - RESOLVED

```
[x] Decision: remove entirely
[x] Remove from taxonomy
[x] Delete outcomes.schema.json - DONE
[x] Delete 06c_outcomes.md prompt - DONE
```

**Decision (31-01-2026)**: Removed entirely.

**Rationale**: Video selection bias means ~90% of published infields are successes. Skewed distribution provides no useful training signal. Can add back later with better data sources (e.g., student recordings with natural variance).

**Files updated:**
- `data/taxonomy/v1.json` - outcomes array removed

**Files deleted (31-01-2026 03:00):**
- `scripts/training-data/schemas/outcomes.schema.json` ✓
- `prompts/06c_outcomes.md` ✓

---

## RESOLUTION ORDER

Recommended sequence to unblock AI implementation:

1. **Taxonomy file** - Quick, content already defined in plan_pipeline.md
2. **Schema JSON files** - Convert specs from schemas_06abc.md
3. **Label guidelines** - AI can draft, user reviews
4. **Prompt templates** - Depends on label guidelines + taxonomy
5. **Model selection** - Run tests on sample data
6. **Validation harness** - Build confidence flagging + distribution reports
7. **Test pipeline run** - Run 20 videos end-to-end, user reviews flagged items

**Key change**: Test pipeline run is now LAST, not blocked by manual labeling.

---

## PROGRESS TRACKING

| Gap | Owner | Status | Date Resolved |
|-----|-------|--------|---------------|
| Taxonomy file | User+Claude | **Complete** | 31-01-2026 |
| Schema JSON files | User+Claude | **Complete** | 31-01-2026 |
| Label guidelines | User+Claude | **Complete** | 31-01-2026 |
| Prompt templates | User+Claude | **Complete** | 31-01-2026 |
| Test pipeline run | - | Deferred (after full implementation) | - |
| Model selection | - | DEFERRED (llama3.1:8b in use, test alternatives later) | - |
| Validation harness | - | Deferred (after test run) | - |

### Taxonomy Subgap Progress

| Subgap | Status | Notes |
|--------|--------|-------|
| 8a. Phases | **✅ Resolved** | 4-phase model: open/pre_hook/post_hook/close |
| 8b. Techniques | **✅ Resolved** | 31 techniques (pruned from 42) |
| 8c. Multi-technique | **✅ Resolved** | Array per turn (schema update after taxonomy) |
| 8d. Tones | **✅ Resolved** | 5 tones: playful, confident, nervous, energetic, neutral |
| 8e. Topics | **✅ Resolved** | 22 topics (pruned from 34, added name/duration) |
| 8f. Outcomes | **✅ Resolved** | Removed entirely (video selection bias) |
