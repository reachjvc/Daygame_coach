# Phase 0: Preparation

Status: In Progress
Updated: 30-01-2026 12:00 - Resolved 8c.Multi-technique: array per turn
Updated: 31-01-2026 00:45 - Resolved 8b.Techniques: 31 techniques (pruned from 42)
Updated: 31-01-2026 00:15 - Reverted incorrect DONE marks; only 8a.Phases resolved
Updated: 30-01-2026 23:15 - Taxonomy under user review; split into 6 subgaps
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)

## Checklist

```
[ ] Step 1: Environment verification
[ ] Step 2: Config module plan finalized
[ ] Step 3: Utils/state plan finalized
[~] Step 4: Schemas exist - need review after taxonomy (only structure.schema.json updated for 8a)
[ ] Step 5: Label guidelines - NOT STARTED (file doesn't exist, blocked by taxonomy)
[~] Step 6: Taxonomy file exists - reviewing via subgaps 8a-8f (only 8a resolved)
[~] Step 7: Prompt templates exist - need review after taxonomy (only 06a_structure.md updated)
[ ] Step 8: Test video set selected (20 videos, stratified)
[ ] Step 9: Validation harness plan documented
[ ] Step 10: Model testing plan executed
[ ] Step 11: Pilot protocol defined (confidence-based review)
[ ] Step 12: Failure protocol documented (what happens on miss)
[ ] Step 13: User approved
```

**Active work**: Taxonomy subgaps 8a.Phases + 8b.Techniques + 8c.Multi-technique RESOLVED. Next: 8d-8f. See [pipeline_gaps.md](../plans/pipeline_gaps.md#8-taxonomy-subgaps-active).

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
- prompt_version per task (04 speaker, 04 tone, 05 type, 05 segment, 06a, 06b, 06c)
- schema_version per schema
- taxonomy_version
- prompt_registry_version

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

## Step 4: Schemas (Split 06a/06b/06c) - DONE

### Location
`scripts/training-data/schemas/`

### Status
All 5 JSON schema files created:
- `segment_enriched.schema.json` (04)
- `conversations.schema.json` (05)
- `structure.schema.json` (06a)
- `content.schema.json` (06b)
- `outcomes.schema.json` (06c)

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

### Schema: outcomes.schema.json (06c)
**Required Fields**:
- video_id: string
- interactions: array
- summary: object with counts

**Interaction Object**:
- interaction_id: integer
- conversation_id: integer
- outcome: enum (number/instagram/instant_date/rejection/flake/unknown)
- interaction_quality: {overall_score, strengths, areas_for_improvement}
- outcome_confidence: 0-1

### Validation Utility
Create `scripts/training-data/validate.py` (plan only):
- validate_file(path, schema_name) -> (valid, errors)
- validate_directory(dir_path, schema_name) -> {valid, invalid, errors}

---

## Step 5: Label Guidelines - NOT STARTED

### Purpose
Define clear inclusion/exclusion rules so AI + humans label consistently.

### Status
**NOT CREATED** - Previous Claude claimed this was done but file `docs/overviews/label_guidelines.md` does NOT exist.

**Blocked by**: Taxonomy subgaps 8b-8f must be resolved first.

### Required Outputs (Plan)
- [ ] Tones: definitions + 2 positive + 2 negative examples each (after 8d resolved)
- [ ] Techniques: definition + boundary cases + disambiguation vs similar techniques (after 8b resolved)
- [ ] Topics: definition + example phrases + exclusions (after 8e resolved)
- [x] Phases: definition + typical transitions + edge cases (8a RESOLVED: open/pre_hook/post_hook/close)
- [ ] Decide tone target: enforce accuracy target or report-only

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
- **Taxonomy file created**: `data/taxonomy/v1.json`
- **Content under review** via subgaps 8a-8f:
  - 8a.Phases: ✅ RESOLVED (open/pre_hook/post_hook/close)
  - 8b.Techniques: ✅ RESOLVED (31 techniques, pruned from 42)
  - 8c.Multi-technique: ✅ RESOLVED (array per turn)
  - 8d.Tones: ⏳ PENDING
  - 8e.Topics: ⏳ PENDING
  - 8f.Outcomes: ⏳ PENDING

### Plan
1. [x] Store taxonomy in a versioned file (`data/taxonomy/v1.json`)
2. [ ] Finalize taxonomy content via subgaps 8a-8f
3. [ ] Update taxonomy_version when finalized
4. [ ] Require full re-run of 06b if taxonomy_version changes

---

## Step 8: Prompt Registry Plan - IN PROGRESS

### Purpose
Track prompt changes and prevent mixed outputs across versions.

### Status
**7 prompt template files exist in `prompts/` - need review after taxonomy finalized:**
- `04_speaker_labeling.md` - needs review
- `04_tone_classification.md` - needs review (blocked by 8d.Tones)
- `05_video_type.md` - needs review
- `05_segment_type.md` - needs review
- `06a_structure.md` - ✅ UPDATED with 8a.Phases (v1.1.0)
- `06b_content.md` - needs review (blocked by 8b.Techniques, 8e.Topics)
- `06c_outcomes.md` - needs review (blocked by 8f.Outcomes)

**Note**: Previous Claude created these without user approval. Only 06a_structure.md has been properly updated.

### Plan
1. [x] Store prompts in `prompts/` (one file per task)
2. [ ] Review and update prompts after taxonomy subgaps resolved
3. [ ] Assign final prompt_version per task
4. [ ] Record prompt_version in state + output metadata
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
