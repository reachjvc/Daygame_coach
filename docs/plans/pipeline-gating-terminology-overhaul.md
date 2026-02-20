# Pipeline Quality Signals: Gating & Terminology Overhaul

## Context

The pipeline has terminology inconsistencies (3 severity scales, 3 "status" enums, overlapping quality indicators) and gating gaps where bad data flows through unblocked. This plan unifies terminology, closes gating gaps, adds stage reports to every stage, and defines explicit gate points.

**Corrections from review**:
- 06b FLAG is NOT meaningless — 06c reads the verdict and applies patches for FLAG videos (skips patching for APPROVE). But FLAG loses visibility after 06c.
- 06h already normalizes `transcript_confidence.score` from 1-100 → 0-1 internally via `score / 100.0`.
- Stage 08 already has full quarantine support (`--quarantine-file` arg + filtering logic + orchestrator passes it). No changes needed there.
- 06b conversation-level verdicts: ISSUE ≠ FLAG. ISSUE = clearer error (normalized from REJECT/FAIL/ERROR), FLAG = suspicious but unclear.

---

## Deliverable 1: Quarantine Propagation to All Stages

**Problem**: After 06b REJECT, stages 06c-06h and 09 process the video anyway (wasting LLM calls at 06e + 06g).

**Reference implementation**: `07.LLM.content` (~50 lines of quarantine code: loading + skip logic)

**Note**: Stage 08 already has quarantine support — no changes needed for 08.

### 1a. Add `--quarantine-file` to Python stages 06c-06h

For each of these 6 scripts, copy the pattern from stage 07:

| Script | Language |
|--------|----------|
| `scripts/training-data/06c.DET.patch` | Python |
| `scripts/training-data/06d.DET.sanitize` | Python |
| `scripts/training-data/06e.LLM.quality-check` | Python |
| `scripts/training-data/06f.DET.damage-map` | Python |
| `scripts/training-data/06g.LLM.damage-adjudicator` | Python |
| `scripts/training-data/06h.DET.confidence-propagation` | Python |

**Changes per script** (find argparse section by searching for `add_argument`):

1. Add argparse argument:
   ```python
   parser.add_argument(
       "--quarantine-file",
       help="Optional JSON file listing quarantined video IDs to skip",
   )
   ```

2. Add quarantine loading in `main()` (after args parse, before processing):
   ```python
   quarantine_ids: Set[str] = set()
   if args.quarantine_file:
       quarantine_path = Path(args.quarantine_file)
       if not quarantine_path.is_absolute():
           quarantine_path = repo_root() / quarantine_path
       if not quarantine_path.exists():
           raise SystemExit(f"Quarantine file not found: {quarantine_path}")
       quarantine_ids = load_quarantine_video_ids(quarantine_path)
       print(f"{LOG_PREFIX} Loaded quarantine file: {quarantine_path} ({len(quarantine_ids)} video ids)")
   ```

3. Import shared helpers from `quarantine_helpers.py` (see 1d).

4. Add skip check in the per-file processing loop (before processing each video):
   ```python
   quarantine_reason = get_quarantine_block_reason(input_file, quarantine_ids)
   if quarantine_reason:
       print(f"{LOG_PREFIX} SKIP: {input_file.name} - {quarantine_reason}")
       skipped_quarantine += 1
       continue
   ```

5. Add summary log after loop:
   ```python
   if skipped_quarantine > 0:
       print(f"{LOG_PREFIX} Skipped {skipped_quarantine} video(s) due to quarantine")
   ```

**Special cases**:
- **06c.DET.patch**: Already reads the verification verdict. Quarantine skip should happen BEFORE the verdict check (no point reading verification.json for a quarantined video).
- **06g.LLM.damage-adjudicator**: Uses a different file iteration pattern (`find_input_files()` returns `*.damage-map.json` with id-based filtering). The quarantine check must be adapted to this loop, not the standard `rglob("*.conversations.json")` pattern.

### 1b. Add `--quarantine-file` to TypeScript stage 09

**File**: `scripts/training-data/09.EXT.chunk-embed.ts`

**Important**: This is TypeScript, not Python. Cannot import Python shared helpers. Must implement quarantine logic natively in TypeScript.

The existing arg parser is hand-rolled (no library — uses `Set(argv)` + for-loop). It already handles `--source` and `--manifest` as key-value pairs via `argv[i+1]` lookahead. Add `--quarantine-file` using the same pattern:

```typescript
if (arg === "--quarantine-file" && argv[i + 1]) {
  quarantineFile = argv[++i]
}
if (arg.startsWith("--quarantine-file=")) {
  quarantineFile = arg.split("=", 2)[1]
}
```

Then load and parse quarantine JSON (TypeScript implementation):
```typescript
function loadQuarantineIds(filePath: string): Set<string> {
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  const ids = data.quarantined_video_ids ?? data.video_ids ?? []
  return new Set(ids.filter((id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)))
}
```

### 1c. Update BOTH orchestrators to pass quarantine to all stages

**File 1**: `scripts/training-data/batch/sub-batch-pipeline`

Two blocks need updating (search for `"07" || "$stage" == "08"`):

```bash
# BEFORE:
if [[ "$stage" == "07" || "$stage" == "08" ]]; then

# AFTER (all stages from 06c onward, excluding 08 which already works):
if [[ "$stage" =~ ^(06[c-h]|07|08|09)$ ]]; then
```

**File 2**: `scripts/training-data/batch/pipeline-runner` (**CRITICAL — was missing from original plan**)

This is the parallel/conveyor-belt orchestrator (~490 lines Python). It has its own `build_stage_command()` function that independently decides which stages get `--quarantine-file`. Must apply the same change here — search for the quarantine condition and expand it to include 06c-06h and 09.

### 1d. Extract shared quarantine helpers (Python)

**New file**: `scripts/training-data/batch/quarantine_helpers.py`

Extract from `07.LLM.content`:
- `load_quarantine_video_ids(path: Path) -> Set[str]` (~43 lines)
- `get_quarantine_block_reason(input_path: Path, quarantine_ids: Set[str]) -> Optional[str]` (~7 lines)

Import from this shared module in: 06c, 06d, 06e, 06f, 06g, 06h, 07.

Stage 07 should be refactored to import from shared module instead of having its own copy. Stage 08 already has its own quarantine loading — can optionally refactor later.

**Note**: Stage 09 (TypeScript) cannot import this. It needs its own native implementation (see 1b).

---

## Deliverable 2: Unified Severity Scale

**Problem**: Three different severity scales — `error/warning/info`, `minor/moderate/major`, `high/medium/low`.

**Target**: One canonical scale: `error / warning / info`

### Migration Strategy for Existing Data

**CRITICAL**: Existing data files in `data/06b.LLM.verify/` contain `"severity": "major"` etc. Existing data in `data/06e.LLM.quality-check/` contains `"high"/"medium"/"low"`. These files were produced by LLM prompts with old severity instructions.

**Approach**: Do NOT migrate old files. Instead:
1. Update schemas + prompts for NEW runs only
2. Add normalization code at read-time in downstream consumers (06c, 06f, 06h, 09) that maps old → new:
   ```python
   SEVERITY_NORMALIZE = {
       "major": "error", "moderate": "warning", "minor": "info",
       "high": "error", "medium": "warning", "low": "info",
       "error": "error", "warning": "warning", "info": "info",
   }
   severity = SEVERITY_NORMALIZE.get(raw_severity, raw_severity)
   ```
3. Old cached LLM outputs remain valid — normalization handles them transparently
4. Re-running a stage with new prompts produces new-scale values, which also pass through normalization unchanged

### 2a. Normalize 06b boundary_issues severity

**File**: `scripts/training-data/schemas/verification.schema.json`

```json
// BEFORE:
"severity": { "type": "string", "enum": ["minor", "moderate", "major"] }

// AFTER (accept both old and new):
"severity": { "type": "string", "enum": ["error", "warning", "info", "minor", "moderate", "major"] }
```

**Files to update**:
- `scripts/training-data/schemas/verification.schema.json` — schema enum (accept both)
- `scripts/training-data/06b.LLM.verify` — LLM prompt (update severity instructions for new runs)
- `scripts/training-data/06c.DET.patch` — add normalization when reading boundary severity
- `scripts/training-data/validation/validate_cross_stage.py` — if it reads boundary severity

### 2b. Normalize 06e artifact damage severity

**Files to update**:
- `scripts/training-data/06e.LLM.quality-check` — internal severity mapping (new runs produce error/warning/info)
- `scripts/training-data/06f.DET.damage-map` — add normalization when reading artifact severity
- `scripts/training-data/06h.DET.confidence-propagation` — add normalization if it reads damage severity labels
- `scripts/training-data/09.EXT.chunk-embed.ts` — `worstArtifactSeverity` field: add TS normalization map
- **`scripts/training-data/apply_06e_repairs.py`** — **CRITICAL, was missing**: has `SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3}` (line ~39). Must update to handle both old and new values:
  ```python
  SEVERITY_RANK = {"info": 1, "low": 1, "warning": 2, "medium": 2, "error": 3, "high": 3}
  ```

---

## Deliverable 3: Namespace "status" Fields

**Problem**: Three different enums all called "status".

### Migration Strategy for Existing Data

**CRITICAL**: Existing stage reports in `data/validation/stage_reports/` use `"status": "PASS"` etc. Renaming to `check_status` would invalidate them.

**Approach**: Dual-field support during transition.
1. Schema accepts BOTH `status` and `check_status` (new reports use `check_status`, old remain valid)
2. `validate_stage_report.py` reads `check_status` first, falls back to `status`:
   ```python
   check_status = data.get("check_status") or data.get("status")
   ```
3. `_build_video_stage_report()` in validate_manifest.py outputs BOTH fields during transition
4. Once all old reports are regenerated, remove `status` from schema

### 3a. Stage reports: add `check_status` field

**File**: `scripts/training-data/schemas/stage_report.schema.json`

Add `check_status` alongside `status`. Make `status` optional (remove from `required`), add `check_status` to `required`.

**Files that read stage report status** (~31 references in validate_stage_report.py alone):
- `scripts/training-data/validation/validate_stage_report.py` — add fallback read logic
- `scripts/training-data/validation/validate_manifest.py` — output both fields
- `scripts/training-data/10.EXT.ingest.ts` — may read stage report status

### 3b. Readiness summary: rename to `readiness`

**File**: `scripts/training-data/validation/validate_stage_report.py` — readiness summary output

Change per-video field from `status` to `readiness`. This is a generated output (not stored long-term), so no migration needed.

**Files that read readiness**:
- `scripts/training-data/10.EXT.ingest.ts`
- `scripts/training-data/batch/sub-batch-pipeline`

### 3c. Batch status: rename to `batch_status`

**Files**: `docs/pipeline/batches/*.status.json`

**Note**: At least 6 code blocks in `sub-batch-pipeline` read/write this field (status_symbols dict, update_status function, list/show functions, approve function). All need updating.

Approach: Update code to read `batch_status`, write both `batch_status` and `status` during transition. Migrate existing status.json files with a one-time script.

---

## Deliverable 4: Stage Report Emission for All Stages

**Problem**: Only `validate_manifest.py` emits stage reports. Stages 06b-09 produce none. The readiness system has blind spots.

### 4a. Add a shared stage report builder (Python)

**New file**: `scripts/training-data/batch/stage_report_builder.py`

```python
def build_stage_report(
    stage: str,
    video_id: str,
    source: str,
    stem: str,
    checks: list[dict],        # [{severity, check, message}]
    inputs: list[dict],         # [{path, sha256?, bytes?}]
    outputs: list[dict],        # [{path, sha256?, bytes?}]
    started_at: str,
    finished_at: str,
    elapsed_sec: float,
    pipeline_version: str,
    prompt_version: str | None = None,
    model: str | None = None,
    batch_id: str | None = None,
    manifest_path: str | None = None,
) -> dict:
    ...  # Status determination: errors>0 → FAIL, warnings>0 → WARN, else PASS
    # Uses "check_status" field (new namespaced name)

def write_stage_report(report: dict, reports_dir: Path) -> Path:
    """Write report to data/validation/stage_reports/<batch>/."""
    out_path = reports_dir / f"{report['video_id']}.{report['stage']}.report.json"
    ...
```

**Note**: Stage 09 (TypeScript) cannot import this — needs a TS implementation of the same logic. Create a `stageReportBuilder.ts` utility or inline the builder in 09.

### 4b. Add `--stage-reports-dir` flag to stages 06c-09

Add to each stage:
```python
parser.add_argument(
    "--stage-reports-dir",
    help="Directory for per-video stage reports (enables report emission)",
)
```

Each stage constructs checks based on its own quality signals:

| Stage | Checks to emit |
|-------|---------------|
| 06c | `patch_applied` (info), `reject_verdict_patched` (warning if --allow-reject used) |
| 06d | `contamination_removed` (info), `teaser_detected` (info) |
| 06e | `unrecoverable_segment` (error), `high_severity_artifact` (warning), `repair_applied` (info) |
| 06f | `damage_seeds_found` (warning per seed count) |
| 06g | `damage_confirmed` (warning), `adjudication_skipped` (info for non-infield) |
| 06h | `low_confidence_segment` (warning if conf < 0.3), `confidence_propagated` (info) |
| 07 | `enrichment_complete` (info), already has cross-stage validation |
| 08 | `unlisted_concepts` (warning/error based on frequency), `taxonomy_pass` (info) |
| 09 | `chunks_generated` (info), `low_confidence_chunks_dropped` (warning) |

**Stages 01-05 are excluded** from this deliverable. They are external extraction tools (whisperx, pyannote, etc.) with different failure modes. Adding stage reports to them is a separate effort — for now, readiness should NOT require reports from 01-05. validate_stage_report.py's coverage check should only require reports from stages 06c-09.

### 4c. Update BOTH orchestrators to pass `--stage-reports-dir`

**File 1**: `scripts/training-data/batch/sub-batch-pipeline`

In `run_stage()`, always pass:
```bash
stage_args+=(--stage-reports-dir "$REPO_ROOT/data/validation/stage_reports/$sub_id")
```

**File 2**: `scripts/training-data/batch/pipeline-runner`

Same change in `build_stage_command()`.

### 4d. Update readiness computation

**File**: `scripts/training-data/validation/validate_stage_report.py`

- Expect reports from stages 06c-09 (NOT 01-05)
- Define required stages list: `REQUIRED_STAGES = ["06c", "06d", "06e", "06f", "06g", "06h", "07", "08", "09"]`
- Per-stage coverage check: if a report is missing for a required stage, mark BLOCKED
- Read `check_status` with fallback to `status` (from Deliverable 3a)

**Readiness aggregation for multi-stage reports**: Worst-status-wins.
- If ANY stage report has `check_status: "FAIL"` → readiness = BLOCKED
- If ANY stage report has `check_status: "WARN"` → counts against warning budget (existing pipeline.config.json logic)
- If ALL stage reports have `check_status: "PASS"` → readiness = READY
- Warning budget is computed across ALL stage reports for a video (sum of warnings from all stages)

### 4e. Schema version bump

**File**: `scripts/training-data/schemas/stage_report.schema.json`

Bump `schema_version` to `"2.0.0"` to reflect the `status` → `check_status` rename and new required stages. Add a `"$schema_version"` field at the top level if not present.

`validate_stage_report.py` should accept both schema versions:
- `"1.0.0"`: reads `status` field
- `"2.0.0"`: reads `check_status` field

---

## Deliverable 5: Explicit Gate Points

**Problem**: Pipeline runs continuously — no pause-for-review between stages. FLAG verdict has no halting effect.

### Design Decisions

**Gates vs Quarantine**: Gates are the **primary** enforcement mechanism at the orchestrator level. Quarantine is the **propagation** mechanism that prevents downstream stages from processing rejected videos. They work together:
1. Gate detects problem → triggers quarantine for affected videos
2. Quarantine propagates → downstream stages skip those videos
3. If ALL videos quarantined → pipeline halts early (existing behavior)

**Manual runs bypass gates**: When a stage is run manually outside the orchestrator, gates don't apply. This is intentional — manual runs are for debugging/re-processing. The quarantine file still blocks videos at stages that accept `--quarantine-file`, but gate-level halting only works via the orchestrator.

### 5a. Add gate configuration to pipeline.config.json

**File**: `scripts/training-data/batch/pipeline.config.json`

```json
{
  "validation": { ... existing ... },
  "gates": {
    "post_06b": {
      "enabled": true,
      "halt_on": ["REJECT"],
      "review_on": ["FLAG"],
      "action": "quarantine_and_continue"
    },
    "post_06e": {
      "enabled": true,
      "halt_on_unrecoverable": true,
      "max_unrecoverable_segments": 0,
      "action": "quarantine_and_continue"
    },
    "post_08": {
      "enabled": true,
      "halt_on": ["FAIL"],
      "action": "halt_pipeline"
    },
    "pre_10": {
      "enabled": true,
      "require_readiness": "READY",
      "action": "block_ingest"
    }
  }
}
```

### 5b. Add gate enforcement code to BOTH orchestrators

**File 1**: `scripts/training-data/batch/sub-batch-pipeline`

Add a `load_gate_config()` function that reads `gates` from pipeline.config.json.

Expand `run_post_stage_validation()` with new cases:

**Post-06e gate** (new):
```bash
06e)
  echo "--- Post-stage gate: transcript quality (06e) ---"
  # Read 06e stage reports, check for error-severity checks (unrecoverable segments)
  # If any video has errors → quarantine via quarantine_updater.py --stage-reports-dir
  python3 "$SCRIPT_DIR/quarantine_updater.py" \
    --quarantine-file "$quarantine_file" \
    --stage-reports-dir "$REPO_ROOT/data/validation/stage_reports/$sub_id" \
    --stage 06e 2>&1 || true
  ;;
```

**Post-06b gate enhancement** (expand existing):
```bash
06b)
  echo "--- Post-stage gate: structural quality (06b) ---"
  # Existing: quarantine REJECTs
  python3 "$SCRIPT_DIR/quarantine_updater.py" ...

  # NEW: count FLAG verdicts and print summary
  # If gates.post_06b.review_on includes FLAG AND halt is configured, exit 3
  ;;
```

**File 2**: `scripts/training-data/batch/pipeline-runner`

Add equivalent gate logic in the parallel orchestrator's post-stage hooks.

### 5c. Update quarantine_updater.py

**File**: `scripts/training-data/batch/quarantine_updater.py`

Add `--stage-reports-dir` + `--stage` input mode (third mode alongside existing stdin and --stage08-report):

```python
parser.add_argument(
    "--stage-reports-dir",
    help="Directory of stage reports — quarantine videos with error-severity checks",
)
```

New extraction function:
```python
def extract_from_stage_reports(reports_dir: Path, stage: str) -> tuple[Set[str], List[dict]]:
    """Extract video IDs with error-severity checks from stage reports."""
    new_ids: Set[str] = set()
    new_videos: List[dict] = []
    for report_file in reports_dir.glob(f"*.{stage}.report.json"):
        data = json.loads(report_file.read_text(encoding="utf-8"))
        # Support both old and new field names
        check_status = data.get("check_status") or data.get("status")
        errors = [c for c in data.get("checks", []) if c.get("severity") == "error"]
        if errors:
            vid = data.get("video_id", "")
            if vid and VIDEO_ID_RE.fullmatch(vid):
                new_ids.add(vid)
                new_videos.append({
                    "video_id": vid,
                    "checks": [f"stage{stage}_error"],
                    "reasons": [{"severity": "error", "check": e["check"], "message": e["message"][:300]} for e in errors],
                })
    return new_ids, new_videos
```

Update `main()` to handle the new mode:
```python
elif args.stage_reports_dir and args.stage:
    ids, vids = extract_from_stage_reports(Path(args.stage_reports_dir), args.stage)
    new_ids |= ids
    new_videos.extend(vids)
```

Handle edge case: if `--stage-reports-dir` doesn't exist or has no matching files, log a warning and return cleanly (don't error).

---

## Deliverable 6: 06b FLAG Visibility Beyond 06c

**Problem**: FLAG triggers patching in 06c but is invisible afterward.

### 6a. Propagate FLAG status into stage report

When 06c processes a FLAG video and emits its stage report (Deliverable 4b), include:
```python
{"severity": "warning", "check": "06b_flag_verdict", "message": "Video had FLAG verdict in 06b verification"}
```

This flows into readiness — FLAGged videos accumulate a warning against the warning budget.

### 6b. Add `--flag-review` mode to orchestrator

**File**: `scripts/training-data/batch/sub-batch-pipeline`

When `gates.post_06b.review_on` includes "FLAG", the post-06b hook:
1. Counts FLAG verdicts
2. Prints summary: `"Post-06b: N video(s) flagged for review"`
3. If configured, halts with exit code 3 (distinct from failure) for human review
4. Human can `--approve-flags` to continue, or manually quarantine specific videos

---

## Deliverable 7: Confidence Scale Documentation

**Problem**: `transcript_confidence.score` is 1-100, everything else is 0-1.

No code change needed — 06h already normalizes via `float(score) / 100.0`.

**File**: `scripts/training-data/schemas/conversations.schema.json`

Update description to clarify:
```json
"score": {
  "type": "integer",
  "minimum": 1,
  "maximum": 100,
  "description": "Transcript quality score (1-100). Normalized to 0.0-1.0 by stage 06h. 90-100=excellent, 70-89=good, 50-69=fair, 30-49=poor, 1-29=unusable"
}
```

---

## Implementation Order

Dependencies between deliverables:

1. **Deliverable 1d** (shared quarantine helpers) — other deliverables import this
2. **Deliverable 1a-1c** (quarantine propagation to stages + both orchestrators) — uses shared helpers
3. **Deliverable 4a** (shared stage report builder) — other deliverables import this
4. **Deliverable 4b-4e** (stage report emission + readiness update + schema version) — uses shared builder
5. **Deliverable 2** (unified severity with read-time normalization) — affects report checks and schema
6. **Deliverable 3** (namespace status with dual-field transition) — affects schema + all readers
7. **Deliverable 5** (gate points + quarantine_updater extension) — reads stage reports, needs both orchestrators
8. **Deliverable 6** (FLAG visibility) — depends on stage reports + gate config
9. **Deliverable 7** (confidence docs) — standalone, no dependencies

---

## Files Modified (Complete List)

| File | Deliverables |
|------|-------------|
| `scripts/training-data/06c.DET.patch` | 1a, 2a, 4b, 6a |
| `scripts/training-data/06d.DET.sanitize` | 1a, 4b |
| `scripts/training-data/06e.LLM.quality-check` | 1a, 2b, 4b |
| `scripts/training-data/06f.DET.damage-map` | 1a, 2b, 4b |
| `scripts/training-data/06g.LLM.damage-adjudicator` | 1a, 4b |
| `scripts/training-data/06h.DET.confidence-propagation` | 1a, 2b, 4b |
| `scripts/training-data/07.LLM.content` | 1d (refactor to shared helpers), 4b |
| `scripts/training-data/08.DET.taxonomy-validation` | 4b |
| `scripts/training-data/09.EXT.chunk-embed.ts` | 1b, 2b, 4b (TS-native implementations) |
| `scripts/training-data/batch/sub-batch-pipeline` | 1c, 4c, 5b, 6b |
| `scripts/training-data/batch/pipeline-runner` | 1c, 4c, 5b (**was missing from original plan**) |
| `scripts/training-data/batch/quarantine_updater.py` | 5c |
| `scripts/training-data/batch/pipeline.config.json` | 5a |
| `scripts/training-data/schemas/stage_report.schema.json` | 3a, 4e |
| `scripts/training-data/schemas/verification.schema.json` | 2a |
| `scripts/training-data/schemas/conversations.schema.json` | 7a |
| `scripts/training-data/schemas/06e.quality-check.schema.json` | 2b (if severity exposed) |
| `scripts/training-data/06b.LLM.verify` | 2a (prompt update) |
| `scripts/training-data/validation/validate_stage_report.py` | 3a, 3b, 4d |
| `scripts/training-data/validation/validate_manifest.py` | 3a |
| `scripts/training-data/10.EXT.ingest.ts` | 3a, 3b |
| `scripts/training-data/apply_06e_repairs.py` | 2b (**was missing from original plan**) |
| `docs/pipeline/batches/*.status.json` | 3c (migration) |

## New Files

| File | Purpose |
|------|---------|
| `scripts/training-data/batch/quarantine_helpers.py` | Shared quarantine load + skip helpers (Python) |
| `scripts/training-data/batch/stage_report_builder.py` | Shared stage report construction (Python) |

**Note**: Stage 09 (TypeScript) needs TS-native implementations of quarantine loading and stage report building. These can be inline in 09.EXT.chunk-embed.ts or extracted to a utility file. They CANNOT import from the Python shared modules.

---

## Verification

After implementation, verify with a test sub-batch:

1. **Quarantine propagation (sequential)**: REJECT a video via 06b → run `sub-batch-pipeline P001.X --run` → verify SKIP logs at every stage (06c-09)
2. **Quarantine propagation (parallel)**: Same test but via `sub-batch-pipeline P001.X --run --parallel 10` → verify pipeline-runner also skips quarantined videos
3. **Stage reports**: Run pipeline → check `data/validation/stage_reports/<batch>/` has reports from stages 06c-09 for every video
4. **Readiness**: Run `validate_stage_report.py` → verify videos with 06e unrecoverable segments show BLOCKED
5. **Severity normalization**: Process a video that has OLD cached 06b output (with "major"/"minor") → verify 06c reads it correctly via normalization map
6. **Severity new output**: Re-run 06b on a video → verify new output uses "error"/"warning"/"info"
7. **Dual-field status**: Create a stage report with `check_status` → verify validate_stage_report.py reads it. Then test an old report with `status` → verify fallback works.
8. **Gate points**: Configure `post_06e.halt_on_unrecoverable: true` → run pipeline with a known-bad transcript → verify pipeline quarantines video after 06e and skips it in 06f+
9. **FLAG visibility**: FLAG a video → run through pipeline → check readiness summary shows warning from `06b_flag_verdict`
10. **apply_06e_repairs**: Run repairs on data with OLD severity values (high/medium/low) → verify SEVERITY_RANK handles them. Then run on NEW values (error/warning/info) → verify same.
