# Implementation Prompt: Add 06c.patch Pipeline Stage
**Status:** Implemented
**Updated:** 05-02-2026

**Context:** This is a handoff document for Claude to implement the 06c.patch stage. The plan was approved. No code was written yet.

---

## What to build

A new pipeline stage `06c.patch` that sits between `06b.verify` and `07.content`. It reads verification reports from 06b, applies high-confidence role fixes to stage 06 output, and writes patched copies. 07.content then reads from the patched copies instead of raw stage 06 output.

**Key property:** No LLM calls. Pure deterministic JSON patching. Fast and testable.

---

## Approved plan file

Read `/home/jonaswsl/.claude/plans/snuggly-exploring-dahl.md` for the full approved plan with file-by-file details.

---

## 7 files to create/modify

### 1. NEW: `scripts/training-data/06c.patch` (~300 lines)

**Model after:** `scripts/training-data/06b.verify` — copy its CLI structure, state management, path helpers, routing functions (`_run_named_source`, `_run_input`, `_run_manifest`, `_run_sources`, `_run_directory`, `_run_directory_with_files`), and failure budget pattern.

**Critical differences from 06b:**
- No Claude CLI / LLM calls — this is pure JSON transform
- Reads from TWO input directories: `data/06.video-type/` (conversations) AND `data/06b.verify/` (verification reports)
- Writes to `data/06c.patched/` with same `*.conversations.json` filename pattern as stage 06
- Test paths: `data/test/06.video-type/` + `data/test/06b.verify/` → `data/test/06c.patched/`

**Core patching logic (`apply_patches()`):**

For each entry in `verification_data["misattributions"]`:
- Look up segment by `segment_id` in the conversations data
- Validate `current_role` matches actual `speaker_role` (sanity check — if mismatch, log as unfixed flag, don't apply)
- Set `segment["speaker_role"] = suggested_role`
- Record in `fixes_applied`

For each entry in `verification_data["collapse_issues"]`:
- Look up segment by `segment_id`
- Set both `segment["speaker_role"]` and `segment["speaker_role_override"]` to `suggested_override`
- Record in `fixes_applied`

For `boundary_issues` and `other_flags`: do NOT apply. Log as `flags_not_fixed`.

**Verdict routing:**
- `APPROVE`: deep copy original, add `patch_metadata` with empty fixes, write
- `FLAG`: apply fixes via `apply_patches()`, write
- `REJECT`: `raise RuntimeError(...)` — 06b already halts pipeline on REJECT, so this shouldn't happen
- No verification file found: copy original unchanged with note in `patch_metadata`

**Output adds `patch_metadata` key to the JSON:**
```json
{
  "patch_metadata": {
    "patched_at": "2026-02-05T16:30:00Z",
    "pipeline_version": "06c.patch-v1.0",
    "verification_verdict": "FLAG",
    "verification_file": "data/06b.verify/source/file.verification.json",
    "fixes_applied": [
      {"segment_id": 490, "field": "speaker_role", "old": "target", "new": "coach", "source": "misattribution", "evidence": "Says 'Hey, I'm James'..."}
    ],
    "fixes_applied_count": 1,
    "flags_not_fixed": ["boundary_issue [moderate]: Conv 1 — teaser duplication..."],
    "flags_not_fixed_count": 1
  }
}
```

**Key helper — `find_verification_for(conversations_path, s06_root, s06b_root)`:**
Resolves the matching `*.verification.json` for a given `*.conversations.json` by mirroring the relative path from `data/06.video-type/` into `data/06b.verify/` and swapping `.conversations.json` → `.verification.json`. Also try flat lookup as fallback. Return `None` if not found.

**`compute_output_path`:** Strip `.conversations` from stem, re-add it: output is `*.conversations.json` (same pattern as stage 06, so 07's `rglob("*.conversations.json")` works unchanged).

**State file:** `.06c_patch_state.json`

**Imports:** `from pipeline_manifest import load_manifest, load_manifest_sources, manifest_filter_files` (same as 06b)

**Make executable:** `chmod +x scripts/training-data/06c.patch`

---

### 2. MODIFY: `scripts/training-data/final_pipeline`

Three changes:

**a)** Add to `PER_SOURCE_STEPS` array (after 06b.verify, before 07.content):
```bash
  "$REPO_ROOT/scripts/training-data/06c.patch"
```

**b)** Update comment on line 47:
```bash
# Step numbers: 01=0, 02=1, 03=2, 04=3, 05=4, 06=5, 06b=6, 06c=7, 07=8
```

**c)** In `parse_stage_range()`, change bounds check from `8` to `9` and error msg from `"01-08"` to `"01-09"`:
```bash
if [[ $STAGE_MIN -lt 1 || $STAGE_MAX -gt 9 || $STAGE_MIN -gt $STAGE_MAX ]]; then
    cli_error "Invalid --stages range: $range (must be 01-09)"
fi
```

---

### 3. MODIFY: `scripts/training-data/07.content`

**a)** `input_root()` (line 1013-1014): `"06.video-type"` → `"06c.patched"`

**b)** `test_input_root()` (line 1021-1022): `"test" / "06.video-type"` → `"test" / "06c.patched"`

**c)** Docstring (line 9): `data/06.video-type/` → `data/06c.patched/`

**d)** Example usage in docstring (line 36): `data/test/06.video-type/` → `data/test/06c.patched/`

**e)** `--test` help text (line 1074): update path

**f)** Skip messages (lines 1156, 1187): `"no 06.video-type output"` → `"no 06c.patched output"`

**g)** Add positional args for pipeline compatibility (pre-existing bug fix — final_pipeline calls `"$script" "$source" "$url"` but 07.content doesn't accept positional args). Add to `main()` argparser:
```python
parser.add_argument("name", nargs="?", help="Source name (folder under data/06c.patched/)")
parser.add_argument("youtube_url", nargs="?", help="YouTube URL (unused, accepted for pipeline compatibility)")
```

Add `_run_named_source()` function (copy pattern from 06b.verify lines 892-900) and add routing in main's elif chain:
```python
elif args.name:
    _run_named_source(args)
```

---

### 4. MODIFY: `docs/pipeline/ASCII`

Insert between line 79 (`data/06b.verify/...`) and line 81 (the 07 block):

```
+--------------------------+
|  06c. PATCH              |    No LLM — pure JSON
|                          |    transform
|  Auto-applies from 06b:  |
|   - Misattributions      |    APPROVE: copy unchanged
|   - Collapse issues      |    FLAG: apply fixes
|                          |    REJECT: halt (blocked
|  Flags but won't fix:    |      by 06b already)
|   - Boundary issues      |
|   - Other flags          |    Adds patch_metadata
+--------------------------+
             |
             |  data/06c.patched/.../*.conversations.json
             v
```

Remove the old data flow line between 06b and 07 (currently says `data/06b.verify/.../*.verification.json` flowing into 07).

---

### 5. MODIFY: `docs/pipeline/claude_automation.md`

**a)** Add after the `### Stage 06b: Verify` section (line 38):
```markdown
### Stage 06c: Patch
- [ ] Verify 06c.patch correctly applies misattribution/collapse fixes from 06b reports
- [ ] Verify APPROVE videos are copied unchanged with patch_metadata
- [ ] Verify FLAG videos get fixes applied and flags logged
- [ ] User sign-off
```

**b)** Update production workflow (line 104-105):
```bash
# 4. Run LLM stages (06, 06b, 06c, 07)
./scripts/training-data/final_pipeline --manifest docs/pipeline/batches/P001.txt --stages 06-09 --skip-ingest
```

**c)** Update "Stages renumbered" key decision (line 131) to mention 06b/06c.

**d)** Add key decision:
```
- **06c.patch between 06b and 07:** Auto-applies high-confidence role fixes (misattributions, collapse issues) from 06b verification before content enrichment. Boundary issues and other flags logged but not auto-fixed.
```

**e)** Update R2 full pipeline section (line 85): `"stages 06-08"` → `"stages 06-09"` and mention 06c.

---

### 6. MODIFY: `scripts/training-data/batch-status`

Add two entries to `STAGES` list (line 50-58), between `06.video-type` and `07.content`:
```python
("06b.verify", "verify", "*.verification.json"),
("06c.patched", "patched", "*.conversations.json"),
```

---

### 7. MODIFY: `scripts/training-data/validate_cross_stage.py`

Update `find_video_pairs()` line 192 to prefer patched data:
```python
s06_root = repo_root() / "data" / "06c.patched"
if not s06_root.exists():
    s06_root = repo_root() / "data" / "06.video-type"
```

Also update the docstring (lines 3-8) and help text to mention 06c.patched.

---

## Existing test data for manual verification

- **Stage 06 input:** `data/06.video-type/James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE].audio.asr.raw16k.conversations.json`
- **Stage 06b report:** `data/06b.verify/James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE].audio.asr.raw16k.verification.json`

The verification report has verdict=FLAG with 6 misattributions and 4 collapse_issues. After patching, the output in `data/06c.patched/` should have those segment roles changed and boundary_issues + other_flags logged as unfixed.

Note: these files are NOT in a source subdirectory — they're flat at the root of their respective data dirs. The `find_verification_for()` function needs to handle both flat and source-subdir layouts.

---

## Verification steps after implementation

1. `npm test` — architecture tests pass
2. Run `./scripts/training-data/06c.patch --dry-run --input "data/06.video-type/James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE].audio.asr.raw16k.conversations.json"` — should show 6 misattributions + 4 collapse fixes it would apply
3. Run without `--dry-run` — verify output in `data/06c.patched/` has fixes applied and `patch_metadata` present
4. Verify 07.content's `input_root()` points to `06c.patched`

---

## Important codebase rules (from CLAUDE.md)

- Run `npm test` after writing code
- No silent fallbacks — fail explicitly
- Follow architecture: business logic in `*Service.ts`, DB in `*Repo.ts`, types in `types.ts`
- Update docs before reporting done
- Run code review subagent after major changes (use Task tool with general-purpose subagent)
