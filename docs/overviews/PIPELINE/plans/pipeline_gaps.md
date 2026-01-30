# Pipeline Gaps (Pre-Implementation Blockers)

Status: Active
Updated: 30-01-2026 12:00 - Resolved 8c.Multi-technique: array per turn, schema update needed
Updated: 31-01-2026 00:45 - Resolved 8b.Techniques: pruned to 31 transcript-detectable techniques
Updated: 31-01-2026 00:15 - Reverted incorrect RESOLVED marks; only 8a.Phases is truly resolved
Updated: 30-01-2026 23:45 - Resolved 8a.Phases: 4-phase street daygame model adopted

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

### 2. Label Guidelines (P0 Step 5) - NOT STARTED

```
[ ] Label guidelines document created with definitions + examples
[ ] User has reviewed and approved content
```

**Status**: Not Started

**Note**: Previous Claude claimed this was created but the file `docs/overviews/label_guidelines.md` does NOT exist.

**Blocked by**: Taxonomy subgaps (8b-8f must be resolved first)

**Required content** (when created):
- Tones with definitions, examples, edge cases
- Techniques with definitions and disambiguation
- Topics with definitions
- Phases with transition signals (use 8a decision: open/pre_hook/post_hook/close)

---

### 3. Prompt Templates (P1/P2/P3) - NEEDS USER REVIEW

```
[~] prompts/04_speaker_labeling.md - exists, needs review
[~] prompts/04_tone_classification.md - exists, needs review (blocked by 8d.Tones)
[~] prompts/05_video_type.md - exists, needs review
[~] prompts/05_segment_type.md - exists, needs review
[x] prompts/06a_structure.md - updated with 8a.Phases decision
[~] prompts/06b_content.md - exists, needs review (blocked by 8b.Techniques, 8e.Topics)
[~] prompts/06c_outcomes.md - exists, needs review (blocked by 8f.Outcomes)
```

**Status**: Files exist but created without user input. Need review after taxonomy subgaps resolved.

**Note**: Previous Claude created these without approval. Only 06a_structure.md has been properly updated (8a.Phases).

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

### 5. Model Selection (P0 Step 10)

```
[ ] Model testing completed: qwen2.5:7b vs qwen2.5:14b vs mistral:7b
[ ] Best model documented per task
```

**Why blocking**: Config references `OLLAMA_MODEL` but value is "(set after model testing)".

**Related files**:
- [phase_0_preparation.md](../phases/phase_0_preparation.md) Step 10
- Config plan in Step 2

---

### 6. Taxonomy File (P0 Step 6) - IN PROGRESS

```
[x] Taxonomy JSON created: data/taxonomy/v1.json
[x] Taxonomy versioning strategy documented
[~] User reviewing taxonomy content via subgaps 8a-8f
```

**Status**: In Progress - reviewing with user via subgaps

**Progress**:
- 8a.Phases: ✅ RESOLVED (open/pre_hook/post_hook/close)
- 8b.Techniques: ✅ RESOLVED (31 techniques, pruned from 42)
- 8c.Multi-technique: ✅ RESOLVED (array per turn)
- 8d.Tones: ⏳ PENDING
- 8e.Topics: ⏳ PENDING
- 8f.Outcomes: ⏳ PENDING

**See**: [Taxonomy Subgaps](#8-taxonomy-subgaps-active) below for detailed breakdown.

**Related files**:
- [phase_0_preparation.md](../phases/phase_0_preparation.md) Step 7
- [phase_3_interactions.md](../phases/phase_3_interactions.md) 06b section
- [plan_pipeline.md](plan_pipeline.md) TAXONOMIES section

---

### 7. Schema JSON Files (P0 Step 4) - NEEDS USER REVIEW

```
[~] scripts/training-data/schemas/segment_enriched.schema.json - exists, needs review (blocked by 8d.Tones)
[~] scripts/training-data/schemas/conversations.schema.json - exists, needs review
[x] scripts/training-data/schemas/structure.schema.json - updated with 8a.Phases decision
[~] scripts/training-data/schemas/content.schema.json - exists, needs review (blocked by 8b, 8c, 8e)
[~] scripts/training-data/schemas/outcomes.schema.json - exists, needs review (blocked by 8f)
```

**Status**: Files exist but created without user input. Need review after taxonomy subgaps resolved.

**Note**: Previous Claude created these without approval. Only structure.schema.json has been properly updated (8a.Phases).

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

#### 8d. Tones - IN PROGRESS

```
[ ] Phase 1: Literature review (SER research)
[ ] Phase 2: Feature analysis on existing data
[ ] Phase 3: Distinguishability testing
[ ] Phase 4: Validation design
[ ] Update taxonomy, schemas, prompts, label guidelines
```

**Research Plan**: [tones_gap.md](tones_gap.md)

**Current Hypothesis** (pre-research):
- Reduce 8 → 5 tones: playful (+flirty), confident (+grounded, direct), warm, nervous, neutral
- Rationale: Audio feature overlap makes 8 indistinguishable

**Issues identified**:
- 8 tones may be too many to distinguish from audio alone
- warm vs confident, flirty vs playful have similar audio signatures
- Audio features available: pitch (mean/std/range), energy (mean/dynamics), tempo (syllable_rate), spectral (brightness)

---

#### 8e. Topics - PENDING

```
[ ] Analyze actual transcripts for topic coverage
[ ] Add missing common topics
[ ] Remove rarely-used topics
[ ] Update taxonomy, schemas, prompts, label guidelines
```

**Current state**: 34 topics. Need validation against real data.

---

#### 8f. Outcomes - PENDING

```
[ ] Decision: remove entirely OR make optional metadata
[ ] Update taxonomy, schemas if keeping
[ ] Remove 06c.outcomes if dropping
```

**Rationale for removal**: Video selection bias means ~90% success. Not useful for training data variance.

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
| Taxonomy file | User+Claude | In progress (subgaps) | - |
| Schema JSON files | User+Claude | Needs review after taxonomy | - |
| Label guidelines | User+Claude | Not started (blocked by taxonomy) | - |
| Prompt templates | User+Claude | Needs review after taxonomy | - |
| Test pipeline run | - | Not started | - |
| Model selection | - | Not started | - |
| Validation harness | - | Not started | - |

### Taxonomy Subgap Progress

| Subgap | Status | Notes |
|--------|--------|-------|
| 8a. Phases | **✅ Resolved** | 4-phase model: open/pre_hook/post_hook/close |
| 8b. Techniques | **✅ Resolved** | 31 techniques (pruned from 42) |
| 8c. Multi-technique | **✅ Resolved** | Array per turn (schema update after taxonomy) |
| 8d. Tones | 🔬 In Progress | Research plan created, 4 phases |
| 8e. Topics | ⏳ Pending | Transcript analysis needed |
| 8f. Outcomes | ⏳ Pending | Decision: remove or keep |
