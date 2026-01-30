# Phase 0: Preparation

Status: In Progress
Updated: 31-01-2026 04:30 - P0.9-P0.12 DEFERRED to post-test-run. Model tested OK. Moving to Phase 1.
Updated: 31-01-2026 04:15 - Step 7 complete. 06b_content.md updated to taxonomy v1.2.0. Test set 5/20.
Updated: 31-01-2026 04:00 - Step 5 complete. label_guidelines.md created with all 62 taxonomy items.
Updated: 31-01-2026 03:30 - Steps 1-4 complete. Environment verified (llama3.1:8B). Ready for Step 5 or 7.
Updated: 31-01-2026 03:00 - Deleted obsolete files. Added schema sync steps. Clarified tone is audio-based.
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)

## Checklist

```
[x] Step 1: Environment verification (Ollama running, llama3.1:8B available, deps OK)
[x] Step 2: Config module plan finalized (documented in this file)
[x] Step 3: Utils/state plan finalized (documented in this file)
[x] Step 4: Schemas synced with taxonomy
    [x] structure.schema.json - updated for 8a.Phases
    [x] segment_enriched.schema.json - tone enum updated to 5 tones + method=audio_threshold
    [x] outcomes.schema.json - DELETED
[x] Step 5: Label guidelines COMPLETE - docs/overviews/label_guidelines.md created
[x] Step 6: Taxonomy file complete - all subgaps 8a-8f resolved
[x] Step 7: Prompt templates COMPLETE
    [x] 04_tone_classification.md - DELETED (tone is audio-based, not LLM)
    [x] 06c_outcomes.md - DELETED
    [x] 06a_structure.md - updated for 8a.Phases
    [x] 04_speaker_labeling.md - reviewed, OK (matches taxonomy)
    [x] 05_video_type.md - reviewed, OK (matches taxonomy)
    [x] 05_segment_type.md - reviewed, OK (matches taxonomy)
    [x] 06b_content.md - UPDATED to v1.1.0 (31 techniques, 22 topics, multi-technique per turn)
[~] Step 8: Test video set PARTIAL (5/20 selected, 15 deferred pending downloads)
[x] Step 9: Validation harness - DEFERRED (design after test run reveals real issues)
[x] Step 10: Model testing - DONE (llama3.1 works, 0.9s response, JSON OK)
[x] Step 11: Pilot protocol - DEFERRED (finalize after test run)
[x] Step 12: Failure protocol - DEFERRED (design after seeing real failures)
[x] Step 13: User approved - Moving to Phase 1
```

**Active work**: Phase 0 COMPLETE. Moving to Phase 1. Validation refinement after test run.

---

## Step 1: Environment Verification

### Requirements
- Ollama running at localhost:11434
- At least one model available: qwen2.5:7b-instruct, qwen2.5:14b-instruct, or mistral:7b
- Python with pydantic, jsonschema installed
- Supabase connection working
- 456 files exist in data/03.audio-features/

### Verification Commands
```bash
curl -s http://localhost:11434/api/tags | jq '.models[].name'
ollama list | grep -E "(qwen|mistral|llama)"
python3 -c "import pydantic, jsonschema; print('OK')"
find data/03.audio-features -name '*.json' | wc -l
```

### Pass Criteria
- All commands succeed
- Model list shows at least one required model
- File count shows ~456

---

## Step 2: Config Module Plan

### Location
`scripts/training-data/config.py`

### Required Contents (Plan Only)

**LLM Settings**:
- OLLAMA_BASE_URL: http://localhost:11434
- OLLAMA_MODEL: (set after model testing)
- OLLAMA_TIMEOUT: 120 seconds
- OLLAMA_TEMPERATURE: 0.3
- OLLAMA_JSON_MODE: True

**Processing Settings**:
- MAX_RETRIES: 3
- RETRY_DELAY_BASE: 5 seconds (exponential backoff)

**Paths**:
- DATA_ROOT: Path("data")
- STATE_ROOT: Path("data/.state")

**Version Registry**:
- pipeline_version (e.g., 2026-01-30)
- prompt_version per task (04 speaker, 05 video_type, 05 segment_type, 06a structure, 06b content)
- schema_version per schema
- taxonomy_version
- tone_threshold_version (audio-based tone classification)

---

## Step 3: Utils/State Plan

### Location
`scripts/training-data/utils.py`

### Required Functions (Plan Only)

**load_state(script_name: str) -> dict**
- Load state file from STATE_ROOT
- Create empty state if doesn't exist
- State structure includes:
  - pipeline_version
  - prompt_version
  - model_version
  - schema_version
  - taxonomy_version
  - prompt_registry_version
  - input_checksum
  - processed_files, failed_files, stats

**save_state(script_name: str, state: dict)**
- Save state atomically (write to temp, then rename)

**file_checksum(path: Path) -> str**
- SHA256 checksum (first 16 chars)

**should_process(...) -> tuple[bool, str]**
- Check: force flag, output exists, in state, version changed, input modified, previous failure

**update_state_success(state, input_path, output_path)**
- Record successful processing with timestamps

**update_state_failure(state, input_path, error)**
- Record failure with error message

---

## Step 4: Schemas - DONE

### Location
`scripts/training-data/schemas/`

### Status
4 JSON schema files (outcomes deleted):
- `segment_enriched.schema.json` (04) - ✅ tone enum updated to 5 tones, method=audio_threshold
- `conversations.schema.json` (05) - OK (no taxonomy-dependent fields)
- `structure.schema.json` (06a) - ✅ updated for 8a.Phases
- `content.schema.json` (06b) - ✅ structure supports technique arrays (no enum enforcement, validates against taxonomy at runtime)
- ~~`outcomes.schema.json` (06c)~~ - **DELETED**

### Completed
- [x] Updated `segment_enriched.schema.json`: tone enum now `["playful", "confident", "nervous", "energetic", "neutral"]`
- [x] Added `method: audio_threshold` to tone object
- [x] Deleted outcomes schema

### Schema: segment_enriched.schema.json (04)
**Required Fields**:
- video_id: string
- segments: array of segment objects
- tone_windows: array of window objects
- speaker_cluster_labels: object mapping speaker_id to label

**Segment Object**:
- id: integer
- start: number
- end: number
- text: string
- speaker: object with label (enum: coach/target/voiceover/other), confidence (0-1), method

**Tone Window Object**:
- id: integer
- start: number
- end: number
- tone: object with primary (enum: 8 tones), confidence

### Schema: conversations.schema.json (05)
**Required Fields**:
- video_id: string
- video_type: enum (infield/talking_head/podcast/compilation)
- segments: array with id, conversation_id, segment_type

**Segment Types**: approach, commentary, transition, intro, outro

### Schema: structure.schema.json (06a)
**Required Fields**:
- video_id: string
- interactions: array
- summary: object with counts

**Interaction Object**:
- interaction_id: integer
- conversation_id: integer
- segment_ids: array of segment ids
- turns: array of {index, speaker, text}
- phases: open/pre_hook/post_hook/close with start_turn/end_turn (updated per 8a decision)

### Schema: content.schema.json (06b)
**Required Fields**:
- video_id: string
- interactions: array
- summary: object with counts

**Interaction Object**:
- interaction_id: integer
- conversation_id: integer
- techniques_used: array of {technique, turn_index, evidence}
- topics_discussed: array of {topic, turn_index, evidence}
- taxonomy_version: string

### ~~Schema: outcomes.schema.json (06c)~~ - DELETED

Outcomes removed due to video selection bias. See [pipeline_gaps.md](../plans/pipeline_gaps.md#8f-outcomes---resolved).

### Validation Utility
Create `scripts/training-data/validate.py` (plan only):
- validate_file(path, schema_name) -> (valid, errors)
- validate_directory(dir_path, schema_name) -> {valid, invalid, errors}

---

## Step 5: Label Guidelines - COMPLETE

### Purpose
Define clear inclusion/exclusion rules so AI + humans label consistently.

### Status
**COMPLETE** - File created at `docs/overviews/label_guidelines.md` (31-01-2026 04:00)

### Contents
- Phases (4): definitions, typical turns, markers, boundary rules
- Techniques (31): definitions, examples, disambiguation tables
- Topics (22): definitions, example phrases, exclusions
- Tones (5): audio threshold rules from clustering analysis
- Speaker labels (4), Video types (4), Segment types (5)

### User Review Required
- [ ] Review definitions for accuracy (do they match your understanding?)
- [ ] Add/modify examples based on domain knowledge
- [ ] Approve before prompts reference the guidelines

---

## Step 6: Test Video Selection (Changed from Gold Set)

### Purpose
Select a representative test set for confidence-based validation.

### Approach
Instead of manual labeling (50+ hours), we use **confidence-based review**:
1. Run full pipeline on 20 test videos
2. AI flags ~10% low-confidence outputs for user review
3. User spot-checks 3-5 random high-confidence items per label type
4. AI reports distributions for sanity check

### Requirements
- 20 videos total (stratified selection)
- Mix of: infield, talking_head, podcast, edge cases
- Various lengths and complexity levels

### Process (Plan)
1. Select 20 videos across video types and edge cases.
2. Document selection criteria and video list.
3. Store test video list in `data/test/pilot/video_list.json`.

---

## Step 7: Taxonomy Versioning Plan - IN PROGRESS

### Purpose
Ensure taxonomy changes are tracked and trigger reprocessing when needed.

### Status
- **Taxonomy file created**: `data/taxonomy/v1.json` (v1.2.0)
- **All subgaps RESOLVED** (31-01-2026):
  - 8a.Phases: ✅ 4 phases (open/pre_hook/post_hook/close)
  - 8b.Techniques: ✅ 31 techniques (pruned from 42)
  - 8c.Multi-technique: ✅ Array per turn
  - 8d.Tones: ✅ 5 tones (playful/confident/nervous/energetic/neutral)
  - 8e.Topics: ✅ 22 topics (pruned from 34)
  - 8f.Outcomes: ✅ Removed entirely (video selection bias)

### Plan
1. [x] Store taxonomy in a versioned file (`data/taxonomy/v1.json`)
2. [x] Finalize taxonomy content via subgaps 8a-8f
3. [x] Update taxonomy_version when finalized (v1.2.0)
4. [ ] Require full re-run of 06b if taxonomy_version changes

---

## Step 8: Prompt Registry Plan - IN PROGRESS

### Purpose
Track prompt changes and prevent mixed outputs across versions.

### Status
**Prompt templates in `prompts/`:**
- `04_speaker_labeling.md` - needs review
- ~~`04_tone_classification.md`~~ - **DELETED** (tone is audio-based, not LLM)
- `05_video_type.md` - needs review
- `05_segment_type.md` - needs review
- `06a_structure.md` - ✅ UPDATED with 8a.Phases (v1.1.0)
- `06b_content.md` - needs update (31 techniques, 22 topics)
- ~~`06c_outcomes.md`~~ - **DELETED** (outcomes removed)

### AI Actions (user spot-checks)
- [ ] Review `04_speaker_labeling.md` - verify speaker labels match taxonomy
- [ ] Review `05_video_type.md` - verify video types match taxonomy
- [ ] Review `05_segment_type.md` - verify segment types match taxonomy
- [ ] Update `06b_content.md` - add 31 techniques + 22 topics from taxonomy v1.2.0

### User Review Required
- Spot-check prompt quality after AI updates
- Verify examples are realistic
- Approve version bump before implementation

### Plan
1. [x] Store prompts in `prompts/` (one file per task)
2. [x] Delete obsolete prompts (tone LLM, outcomes)
3. [ ] Review and update prompts with taxonomy values
4. [ ] Assign final prompt_version per task
5. [ ] Record prompt_version in state + output metadata
---

## Step 9: Validation Harness Plan (Changed from Evaluation Harness)

### Purpose
Automate confidence-based flagging and distribution analysis.

### Core Functions
1. **Low-confidence flagging**: Flag outputs below threshold for user review
2. **Distribution reports**: Show % breakdown of labels (speaker types, video types, etc.)
3. **Random sampling**: Select high-confidence items for spot-check
4. **Report generation**: Markdown reports for user review

### Confidence Thresholds (Initial)
- Speaker labels: < 0.8 → flag for review
- Tone classification: < 0.7 → flag for review
- Video type: < 0.85 → flag for review
- Phase boundaries: < 0.8 → flag for review
- Techniques/topics: < 0.7 → flag for review

### Reporting
- Distribution summary (does 70% coach / 30% target make sense?)
- Low-confidence items with context
- Random spot-check samples (5 per label type)
- Taxonomy coverage (which techniques/topics never appear?)

### Storage
- `data/test/reports/phase_X_validation.json`
- `data/test/reports/phase_X_validation.md`
- `data/test/reports/phase_X_flagged_items.json`

---

## Step 10: Model Testing Plan (Updated)

### Models to Test
1. qwen2.5:7b-instruct
2. qwen2.5:14b-instruct
3. mistral:7b-instruct-v0.3

### Prompting Strategies
1. Zero-shot: instructions only
2. Few-shot: 2-3 examples
3. JSON mode: format="json"

### Tasks to Test
- 04 speaker cluster labeling
- 04 tone classification
- 05 video type classification
- 06a phase boundaries
- 06b technique/topic extraction
- 06c outcome/quality extraction

### Output
- `data/test/model_test_results.json`
- Decision documented per task: model + strategy

---

## Step 11: Pilot Protocol (Confidence-Based)

### Purpose
Validate pipeline quality before full run using confidence-based review.

### Plan
1. Run full pipeline on 20 test videos.
2. Generate validation report with:
   - Distribution summaries
   - Low-confidence flagged items (~10%)
   - Random high-confidence samples for spot-check
3. User reviews flagged items + spot-check samples.
4. If systematic errors found → fix prompts/config → re-run.
5. User approval gate before full run on 456 files.

---

## Step 12: Failure Protocol

### Purpose
Define what happens when validation reveals problems.

### Triggers
- User finds systematic errors in spot-check samples
- Distribution looks unreasonable (e.g., 95% coach, 5% target)
- Too many low-confidence flags (> 20%)
- Schema validation failures

### Plan
1. Identify the pattern (which label type, which videos).
2. Diagnose root cause (prompt, taxonomy, schema, data quality).
3. Adjust prompt/model/taxonomy as needed.
4. Re-run pipeline on test videos.
5. Only proceed to full run when user approves.

---

## Step 13: User Approval

### Validation Report Format

```markdown
## Phase 0 Validation Report

### Environment
- Ollama: [running/not running]
- Models available: [list]
- Input files: [count]

### Planning Artifacts
- label_guidelines.md: [created/missing]
- test video set: [selected/missing] (20 videos)
- validation harness plan: [documented/missing]
- schema definitions: [count] schemas
- taxonomy file: [created/missing]
- prompt templates: [count] prompts

### Model Testing
- Selected model: [model name]
- JSON mode: [working/not working]

### Ready for Test Pipeline Run?
User approval required before proceeding.
```

---

## Exit Criteria

Before proceeding to Phase 1:
- [ ] Environment verified
- [ ] Config plan completed
- [ ] Utils/state plan completed
- [ ] Schemas for 04/05/06a/06b/06c defined
- [ ] Label guidelines drafted and tone target decided
- [ ] Taxonomy file created and versioned
- [ ] Prompt templates created
- [ ] Test video set selected (20 videos)
- [ ] Validation harness plan documented
- [ ] Model testing completed
- [ ] Pilot protocol defined (confidence-based review)
- [ ] Failure protocol defined
- [ ] User has approved Phase 0 completion
