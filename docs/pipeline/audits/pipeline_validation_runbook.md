# Pipeline Validation Runbook (Handoff + Iteration Loop)

**Branch:** `pipeline-validation-hardening`  
**Worktree (current):** `/tmp/daygame-coach-pipeline-validation-hardening` (temporary location; safe, but `/tmp` can be cleaned)  
**Canary manifest:** `docs/pipeline/batches/CANARY.1.txt`  
**Holdout manifest:** `docs/pipeline/batches/HOLDOUT.1.txt`
**Hardening manifest:** `docs/pipeline/batches/HARDENING.1.txt`

This runbook exists so another agent can pick up work without any chat history.

## Worktree Location (Why `/tmp`?)

The worktree is just a second checkout of the same git repo, pointed at the same `.git` history.
Putting it in `/tmp` is convenient for isolation, but it is not ideal for long-lived work because `/tmp` can be wiped (reboot/cleanup).

Best practice for long-running iteration:
- Keep the branch in git (commit often).
- Put the worktree in a stable directory (outside the repo root), for example next to the repo.

Move the existing worktree (safe if no processes are running in it):

```bash
cd /home/jonaswsl/projects/daygame-coach
git worktree move /tmp/daygame-coach-pipeline-validation-hardening ../daygame-coach-pipeline-validation-hardening
```

If the `/tmp` folder disappears, you can recreate the worktree from the branch:

```bash
cd /home/jonaswsl/projects/daygame-coach
git worktree add ../daygame-coach-pipeline-validation-hardening pipeline-validation-hardening
```

## What “Done” Looks Like

1. A single command that yields a clear PASS/FAIL for a manifest (presence + cross-stage consistency).
2. A lightweight scorecard that tracks Stage 06/07 outputs over time (drift + warnings + normalization).
3. A semantic quality eval loop (small canary + rotating holdout + optional “gold” labels / LLM judge).

## Current Baseline (CANARY.1)

`CANARY.1` is a 7-video diverse canary set meant to be cheap and fast.

Expected right now (after a successful run):
- 06b outputs: `data/06b.verify/<source>/<video_dir>/<stem>.verification.json`
- 06c outputs: `data/06c.patched/<source>/<video_dir>/<stem>.conversations.json`
- 07 outputs:  `data/07.content/<source>/<video_dir>/<stem>.enriched.json` and `.enriched.validation.json`
- 09 outputs:  `data/09.chunks/<source>/*.chunks.json` and `data/09.chunks/.chunk_state.json`
- Harness: `scripts/training-data/validation/validate_manifest.py` returns PASS (may still surface Stage 07 warning summaries)

Observed baseline (as of 2026-02-08, after a Stage 07 `--revalidate` pass):
- 06b verdicts: `APPROVE=2`, `FLAG=5` (no `REJECT`)
- Stage 07 warnings (total=15): `transcript_artifact=8`, `technique_on_non_coach_segment=6`, `evidence_mismatch=1`
- Stage 07 normalization repairs: `13` repairs across `4` videos (best-effort deterministic fixes; see `metadata.normalization_repairs_*`)
- Stage 06 validation now includes deterministic sanity checks for likely fragment conversations and opener-as-target misattributions (reported as warnings in `.conversations.validation.json`).
- NOTE: semantic judge results become **stale** when their `request_fingerprint` no longer matches the current Stage 07 output for that `(video_id, conversation_id)`. `batch_report.py` will report fresh vs stale; rerun `semantic_judge.py` after prompt/normalization changes.

Latest status snapshot (`2026-02-14`, after readiness + gate hardening):
- Manifest validation now passes for all three active manifests under strict cross-stage checks:
  - `CANARY.1`: `validate_manifest.py` PASS (warnings only)
  - `HARDENING.1`: PASS (warnings only)
  - `HOLDOUT.1`: PASS (warnings only)
- The prior hard blocker `stage07_gate_policy_violation` on `6ImEzB6NhiI` was resolved:
  - One-video isolated loop (`06c.patch` -> `06b.reverify` -> `07.content`) produced `06b.reverify verdict=FLAG` (was `REJECT`).
  - Canonical artifacts were promoted to `data/06b.reverify`, `data/06c.patched`, and `data/07.content`.
- Readiness policy implementation was hardened in `validate_stage_report.py`:
  - `stage07_validation_warnings` now expands into per-type counts (for example `transcript_artifact`, `evidence_mismatch`).
  - Contextual warnings (`missing_stage01_audio`, Stage 08 warning wrappers, normalization-repair warnings) are excluded from warning-budget math.
  - Contextual-only warnings do not downgrade `READY` to `REVIEW`.
- Stage 10 dry-run ingest scope after these fixes:
  - READY-only policy:
    - `CANARY.1`: `0/7` ingestable
    - `HARDENING.1`: `1/6` ingestable (`IS2SoUgqDLE`)
    - `HOLDOUT.1`: `1/7` ingestable (`yVbiH29D3Q0`)
  - allow-review policy:
    - `CANARY.1`: `0/7` ingestable
    - `HARDENING.1`: `1/6` ingestable
    - `HOLDOUT.1`: `2/7` ingestable (`yVbiH29D3Q0`, `v31iSEwaGFI`)
- Remaining blockers are now quality-policy driven (not contract/gate bugs):
  - repeated `transcript_artifact` budget exceedances (`transcript_artifact>1`)
  - one `evidence_mismatch>0` blocker (`e2dLEB-AwmA` in hardening/holdout).

## Unseen-Video Findings + Iterative Remediation Plan (2026-02-14)

This section turns the latest unseen-video audits into an explicit implementation queue for future agents.
Use this as the primary loop for improving real quality (not just contract/gate pass rates).

### Latest Unseen Findings (Ground Truth)

From unseen manifests `P018.2` and `P018.3`:
- Stage stability on fresh videos is good under `reverify_patched`:
  - `P018.2` reverify verdicts: `APPROVE=2`, `FLAG=1`
  - `P018.3` reverify verdicts: `APPROVE=2`, `FLAG=1`
- Core quality issues remain:
  1. **Impossible target assignment** in complex clips (example: `KURlBcRF6-M` segment 109, `speaker_id=SPEAKER_00` (coach) but `speaker_role=target`).
  2. **ASR/diarization merge artifacts** (run-on segments, promo splice contamination, mixed-speaker chunks), especially around segments like `27/36/41` (`tyI2OZCVhT8`) and `9/62/116` (`KURlBcRF6-M`).
  3. **Music/lyrics-only transcripts** causing unusable Stage 07 inputs (example: `6TencNrSXcs`, 7/7 `transcript_artifact` warnings; spoken coaching effectively absent).
  4. **Stage 08 taxonomy drift** still blocks ingest in stress runs (for example high-frequency unlisted `first_date_strategy` on `P018.2` and `body_language` on `P018.3`).

### Non-Negotiable Preflight (Before Any Loop)

Run this first. If it fails, do not treat downstream timeouts as pipeline regressions.

```bash
timeout 30 claude -p "Respond exactly: ok" --output-format text --model opus
```

Expected:
- stdout: `ok`
- exit code: `0`

If timeout/non-zero:
- stop the quality loop
- fix execution environment (network/auth/sandbox mode) first

### Loop Policy (One Change Per Iteration)

For each iteration:
1. Apply exactly one logical change set.
2. Re-run the same manifests (`P018.2`, `P018.3`) for comparability.
3. Record deltas in this runbook and commit.
4. Only then stack the next change.

### Iterative Queue (AI-Executable)

#### Iteration A1: Guard impossible coach/target assignments in Stage 06/06c

Objective:
- prevent impossible states like `speaker_role=target` on a high-confidence, non-collapsed coach speaker.

Implementation targets:
- `scripts/training-data/06.video-type`
- `scripts/training-data/06c.patch`
- optionally validator checks in `scripts/training-data/validation/validate_manifest.py`

Required behavior:
- derive `fixed_coach_speaker_ids` from `speaker_labels` where role is `coach` (or equivalent), confidence is high (for example `>=0.85`), and speaker is not marked collapsed/mixed.
- if a segment has `speaker_role=target` and `speaker_id in fixed_coach_speaker_ids`, emit explicit issue code (for example `impossible_target_on_fixed_coach_speaker`).
- for collapsed/mixed speakers, do **not** apply the impossible-role guard; emit a separate ambiguity issue code (for example `collapsed_speaker_role_ambiguity`) when both coach+target roles appear.
- if confidence is high and patch-safe, auto-demote impossible target role to `other` or `unknown` (never keep impossible `target` on fixed coach speaker).
- conversation `target_participation.target_speaker_ids` must not include fixed coach speakers.

Primary test clip:
- `KURlBcRF6-M`

Pass criteria:
- no segment with impossible coach/target pairing for fixed coach speakers (example: `KURlBcRF6-M` seg 109 fixed)
- no conversation with fixed coach speaker listed as target
- collapsed-speaker overrides in `tyI2OZCVhT8` remain allowed (no false-positive impossible-role demotions)
- no increase in `06b.reverify REJECT`

#### Iteration A2: Promo-splice boundary hardening

Objective:
- prevent voiceover/promo text from contaminating active approach segments.

Implementation targets:
- `scripts/training-data/06.video-type`
- optional patch fallback in `scripts/training-data/06c.patch`

Required behavior:
- detect promo markers (for example “link in the description”, “check out my coaching”, “watch another interaction”).
- when found inside an approach segment, split/relabel to commentary where deterministic, or mark as explicit artifact for downstream suppression.

Primary test clip:
- `tyI2OZCVhT8` (segment 41 pattern)

Pass criteria:
- promo splice no longer treated as clean approach evidence
- Stage 07 `transcript_artifact` count does not increase

#### Iteration A3: Run-on/mixed-turn segment sentinel

Objective:
- reduce false semantic extraction from incoherent merged ASR chunks.

Implementation targets:
- `scripts/training-data/06.video-type`
- `scripts/training-data/07.content` (consuming low-quality flags)

Required behavior:
- mark run-on/mixed-turn chunks with deterministic low-quality flags (before LLM enrichment).
- Stage 07 should down-weight or skip technique/topic extraction from flagged chunks unless strong corroborating evidence exists.

Primary test clips:
- `tyI2OZCVhT8` (segments around 27/36)
- `KURlBcRF6-M` (segments 62/116)

Pass criteria:
- fewer semantically implausible examples linked to flagged segments
- no regression in overall enrichment coverage on clean conversations

#### Iteration A4: Music/lyrics contamination suppression

Objective:
- prevent Stage 07 from extracting coaching semantics when transcript is predominantly music/lyrics/non-dialogue audio.

Implementation targets:
- `scripts/training-data/06.video-type`
- `scripts/training-data/07.content`

Required behavior:
- detect transcript-level contamination markers (lyrics density, repeated rap-like lines, no conversational turn structure).
- if clip is artifact-dominant, emit explicit classification (for example `audio_content_type=music_or_non_dialogue`) and suppress conversation enrichment extraction.
- ensure Stage 07 outputs no coaching techniques/topics/hook/investment when the evidence source is non-dialogue music.

Primary test clip:
- `6TencNrSXcs`

Pass criteria:
- `6TencNrSXcs` yields no coaching techniques/topics from lyric-only transcript
- Stage 07 warning explains suppression reason deterministically
- no regressions on normal spoken clips in `P018.2`/`P018.3`

#### Iteration B1: Stage 07 artifact-aware evidence constraints

Objective:
- stop technique/topic extraction from artifact-flagged segments unless corroborated by clean neighboring evidence.

Implementation target:
- `scripts/training-data/07.content` normalization/validation logic

Required behavior:
- if a segment is in `transcript_artifacts` or `low_quality_segments`, extraction from that segment must be rejected by default.
- allow extraction only when corroborated by clean segments in a narrow window (define fixed window and threshold in code).
- if evidence contract not met, remove concept and record normalization repair reason.

Primary test clip:
- `tyI2OZCVhT8` and `KURlBcRF6-M`

Pass criteria:
- artifact-linked concepts decrease on audited conversations
- concept coverage on clean segments remains stable

#### Iteration B2: Target-evidence gating for hook/investment

Objective:
- avoid fabricated hook/investment signals when target speech evidence is weak/ambiguous.

Implementation target:
- `scripts/training-data/07.content`

Required behavior:
- if a conversation lacks reliable non-coach target turns, force:
  - `hook_point = null`
  - `investment_level = null`
  - explicit warning/flag reason

Pass criteria:
- no hook/investment claims on conversations with unresolved target evidence

#### Iteration C1: Taxonomy drift triage (alias vs true expansion)

Objective:
- reduce Stage 08 false blocks while preserving signal.

Implementation targets:
- Stage 07 normalization map
- taxonomy config/schema assets used by Stage 07/08

Required behavior:
- classify recurring unlisted concepts into:
  - alias to existing taxonomy entry (deterministic mapping),
  - true new candidate requiring human approval.
- only promote to taxonomy after repeatability threshold + review.

Current likely candidates from unseen stress runs:
- `body_language` (blocking)
- `eye_contact_control`
- `proximity_escalation`
- `first_date_strategy` (blocking on `P018.2`)

Pass criteria:
- Stage 08 blocking frequency drops on `P018.3` without suppressing genuinely novel concepts

### Canonical Evaluation Script (Run After Each Iteration)

Use the same command sequence every loop:

```bash
# 1) Stage execution on unseen sets
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/P018.2.txt --allow-reject-verdicts
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/P018.2.txt --allow-reject
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/P018.2.txt
./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.2.txt --verification-gate-policy reverify_patched

./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/P018.3.txt --allow-reject-verdicts
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/P018.3.txt --allow-reject
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/P018.3.txt
./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.3.txt --verification-gate-policy reverify_patched

# 2) Validation (quality-focused)
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/P018.2.txt \
  --stage07-gate-policy reverify_patched \
  --skip-stage01-presence \
  --emit-stage-reports \
  --stage-reports-dir data/validation/stage_reports/P018.2.iter

python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/P018.3.txt \
  --stage07-gate-policy reverify_patched \
  --skip-stage01-presence \
  --emit-stage-reports \
  --stage-reports-dir data/validation/stage_reports/P018.3.iter

python3 scripts/training-data/validation/validate_stage_report.py \
  --dir data/validation/stage_reports/P018.2.iter \
  --manifest docs/pipeline/batches/P018.2.txt \
  --emit-readiness-summary

python3 scripts/training-data/validation/validate_stage_report.py \
  --dir data/validation/stage_reports/P018.3.iter \
  --manifest docs/pipeline/batches/P018.3.txt \
  --emit-readiness-summary

# 3) Taxonomy drift
python3 scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/P018.2.txt
python3 scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/P018.3.txt
```

### Iteration Exit Criteria (Must All Hold Before Broad Rollout)

1. Zero impossible coach/target assignments in `P018.3`.
2. No `06b.reverify REJECT` regressions on `P018.2` and `P018.3`.
3. Stage 07 `transcript_artifact` warnings are non-increasing on both manifests.
4. Lyrics/non-dialogue clips (for example `6TencNrSXcs`) do not emit coaching techniques/topics/hook/investment.
5. Stage 07 artifact-linked concept extraction decreases on audited conversations without reducing clean-clip coverage.
6. Stage 08 blocking rate improves or stays flat with better precision (not by hiding concepts).

After these pass on unseen sets:
- run the same checks on `CANARY.1`, then `HARDENING.1`, then `HOLDOUT.1`.
- only then promote changes as production defaults.

### Deep-Audit Addendum (P018.4 Replacement + V2 Loop, 2026-02-14)

This addendum is based on a full manual line-by-line audit of:
- `1ok1oovp0K0` (`P018.4`, replacement for lyric-only `6TencNrSXcs`)
- previously audited `tyI2OZCVhT8` and `KURlBcRF6-M`

Use this as the primary implementation plan for real quality fixes.  
If this section conflicts with the earlier A/B/C queue, follow this section.

#### Ground-Truth Defects Confirmed by Manual Audit

1. Teaser duplication leak:
- `1ok1oovp0K0` segments `0-5` duplicate dialogue from `240-247`.
- Duplicate intro snippets are currently retained in the same file and can leak into downstream counting.

2. Mixed-mode segment contamination:
- `1ok1oovp0K0` segment `102` contains both live approach text and commentary narrative in one segment.
- This segment also has inconsistent attribution metadata (`speaker_id` target profile, `speaker_role=coach`, missing override tag).

3. Collapsed-speaker participation leakage:
- `1ok1oovp0K0` has `speaker_labels.SPEAKER_00=collapsed`.
- `conversation.target_participation.target_speaker_ids` includes `SPEAKER_00`, which is not safe as a clean target identity for downstream semantics.

4. Fragmented conversation runs:
- `1ok1oovp0K0` conversation 1 is represented as many non-contiguous runs because commentary is interleaved.
- Current representation works syntactically but increases semantic contamination risk.

5. Residual transcript artifacts in close sequence:
- `1ok1oovp0K0` segments `121` and `276` remain incoherent artifacts.

#### Decision Lock (Approved Defaults)

These decisions are locked unless explicitly overridden by a human reviewer:

1. Mixed-mode contamination handling (for example segment `102`):
- default to strict exclusion from Stage 07 evidence first.
- do not attempt auto-splitting unless deterministic boundary confidence is high and auditable.

2. Teaser duplicates (for example segments `0-5`):
- treat as metadata-only context.
- never allow teaser duplicate segments to contribute Stage 07 evidence.

3. Commentary-only unlisted concepts in Stage 08:
- route to a non-blocking commentary bucket by default.
- keep them visible for taxonomy review, but do not fail ingest solely on commentary-only concept drift.

#### ELI5 Context For The Locked Decisions

Use this when a reviewer asks "why are we doing this?":

1. Mixed-mode segment `102` (`1ok1oovp0K0`):
- this single segment contains two different things at once:
  - live interaction text: "did you study art or graphic design..."
  - commentary narrator text: "so rather than me then spending more time..."
- because the line is blended, we cannot trust it as clean evidence for techniques.
- default action: keep it for human context, exclude it from Stage 07 evidence.

2. Teaser duplicates `0-5` (`1ok1oovp0K0`):
- these early lines are trailer-style repeats of later real interaction lines (`240-245`).
- if both copies are counted as evidence, Stage 07 can double-count the same behavior.
- default action: keep teaser copy as metadata/context only, never technique evidence.

3. Commentary-only non-blocking bucket (Stage 08):
- some unlisted concepts only appear in coach explanation blocks, not in actual approach evidence.
- example commentary-only concepts seen in `1ok1oovp0K0`:
  - `approach_pacing` (block 2)
  - `vibe_matching` (block 3)
  - `comfort_with_silence` (block 8)
  - `daygame_philosophy` topic (block 16)
- these should be visible for taxonomy review, but should not fail ingest by themselves.

#### Critical Diagnosis (Why Current Pipeline Still Misses)

1. Stage 06/06c focuses on role and boundary correctness but does not enforce content hygiene across:
- duplicate teaser content
- mixed commentary/live utterances
- collapsed-speaker target identity confidence

2. Stage 07 prompt still receives contaminated segments and can legally derive semantics from them.

3. Verification catches many issues (`FLAG`) but patching is not yet turning those flags into deterministic sanitized structures consumable by Stage 07.

#### Required Architecture Change (New Stage)

Introduce a new deterministic stage:
- `scripts/training-data/06d.sanitize`

Pipeline placement:
- `06.video-type` -> `06b.verify` -> `06c.patch` -> `06d.sanitize` -> `06e.reverify` -> `07.content`

Where:
- `06e.reverify` is a thin wrapper around `06b.verify` using `--input-root data/06d.sanitized --output data/06e.reverify`.

`06d.sanitize` required outputs:
1. `data/06d.sanitized/<source>/<video>/*.conversations.json`
2. `data/06d.sanitized/<source>/<video>/*.sanitize.report.json`

`06d.sanitize` required deterministic passes:
1. Teaser dedupe pass:
- detect repeated dialogue windows (normalized text matching) where an early window reappears later.
- mark early duplicate segments with `segment_flags: ["teaser_duplicate"]`.
- enforce `conversation_id=0` and `segment_type="commentary"` for teaser duplicates.
- add `exclude_from_stage07_evidence=true`.

2. Mixed-mode contamination pass:
- detect segments containing both live-approach and commentary markers.
- if deterministic split boundary exists, split into synthetic child segments with deterministic IDs and provenance.
- if split is not deterministic, mark `segment_flags: ["mixed_mode"]` and `exclude_from_stage07_evidence=true`.

3. Collapsed-target hygiene pass:
- derive `fixed_coach_speaker_ids` from high-confidence non-collapsed coach labels.
- ensure `target_participation.target_speaker_ids` excludes fixed coach speakers.
- when speaker is collapsed, require `target_participation.target_speaker_ids_confident` (clean subset) for Stage 07.

4. Conversation run normalization pass:
- persist explicit conversation runs, for example `conversation_runs: [{start_segment_id,end_segment_id}]`.
- preserve original segment IDs but add run metadata so Stage 07 can reason over coherent sub-ranges.

5. Evidence allowlist pass:
- output explicit `stage07_evidence_segment_ids` per conversation (exclude teaser_duplicate, mixed_mode, transcript_artifact seeds).

#### Required Prompt Rewrite (Stage 07 V2)

Major prompt contract update in `scripts/training-data/07.content`:
1. Input contract:
- consume `06d.sanitized` artifacts, not raw `06c.patched`.
- only use `stage07_evidence_segment_ids` for technique/topic/hook/investment inference.

2. Evidence contract:
- every extracted technique must cite at least one allowed evidence segment.
- high-impact techniques (`number_close`, `instant_date`) require two-part evidence:
  - intent segment
  - compliance/confirmation segment
- reject any extraction if evidence segment is flagged (`teaser_duplicate`, `mixed_mode`, `transcript_artifact`).

3. Commentary/approach separation:
- conversation-level techniques/topics must come from approach evidence only.
- commentary analysis must stay commentary-only (no approach outcome inference from commentary blocks).

4. Output contract:
- include `dropped_candidates` with deterministic reasons (`flagged_evidence_segment`, `insufficient_close_evidence`, etc.) for auditability.

#### Iterative V2 Queue (AI-Implementable)

##### Iteration D0: Baseline Lock + Metric Harness

Objective:
- freeze before/after metrics for `P018.3` + `P018.4`.

Implementation targets:
- `scripts/training-data/validation` (new helper script allowed)
- runbook metric table in this section

Required metrics per video:
- `teaser_duplicate_segments`
- `mixed_mode_segments`
- `flagged_segments_used_as_stage07_evidence`
- `target_speaker_ids_including_fixed_coach`
- `stage07_transcript_artifact_warnings`
- `stage08_status`

Pass criteria:
- reproducible baseline snapshot checked into runbook.

##### Iteration D1: Build `06d.sanitize` (Flag-Only)

Objective:
- create sanitization stage without structural splitting yet.

Implementation targets:
- new `scripts/training-data/06d.sanitize`
- schema updates under `scripts/training-data/schemas/`

Required behavior:
- detect and mark teaser duplicates and mixed-mode segments.
- generate `sanitize.report.json` with per-rule counts.
- do not change segment IDs yet.

Pass criteria:
- `1ok1oovp0K0` flags `0-5` as teaser duplicates.
- `1ok1oovp0K0` flags `102` as mixed-mode.

##### Iteration D2: Enforce Stage 07 Evidence Allowlist

Objective:
- prevent contaminated segments from being used by Stage 07.

Implementation targets:
- `scripts/training-data/07.content`

Required behavior:
- hard-filter evidence to `stage07_evidence_segment_ids`.
- log dropped candidate concepts with reason codes.

Pass criteria:
- no Stage 07 technique evidence references `0-5`, `102`, `121`, `276` on `1ok1oovp0K0`.

Implementation status (`2026-02-14`, current hardening worktree):
- implemented:
  - Stage 07 now consumes `stage07_evidence_segment_ids` allowlists from sanitized input.
  - Stage 07 hard-filters approach evidence and writes `dropped_candidates` with reason codes.
  - Stage 07 validation now errors if a technique still cites invalid evidence segments.
- observed results after rerun:
  - `P018.4` (`1ok1oovp0K0`): zero technique evidence leaks to `0-5`, `102`, `121`, `276`; Stage 07 validation `errors=0`.
  - `P018.3` (`KURlBcRF6-M`, `tyI2OZCVhT8`, `5gfclo7crNI`): zero technique evidence leaks outside allowlists; Stage 07 validation `errors=0`.
  - Stage 08 status on both manifests is `WARNING` (no `FAIL`), with unlisted concepts still visible for taxonomy review.

##### Iteration D3: Collapsed-Speaker Target Participation Hygiene

Objective:
- stop polluted target identities from driving hook/investment logic.

Implementation targets:
- `06d.sanitize`
- `07.content`

Required behavior:
- populate `target_speaker_ids_confident` using non-collapsed or override-supported target turns only.
- Stage 07 uses confident target IDs for hook/investment gating.

Pass criteria:
- `1ok1oovp0K0` no longer treats collapsed coach speaker identity as confident target identity.

Implementation status (`2026-02-14`, current hardening worktree):
- implemented in `06d.sanitize`:
  - populate `target_participation.target_speaker_ids_confident`.
  - populate `target_participation.fixed_coach_speaker_ids`.
  - preserve raw `target_speaker_ids` but remove any fixed-coach IDs from that raw list.
- implemented in `07.content`:
  - post-hook/investment gating now uses confident target IDs when available.
  - if `post_hook` lacks confident target-speaker support, normalization downgrades to `pre_hook`/`open`.
  - validation now errors on `post_hook` claims without confident target support.
- observed results after rerun:
  - `1ok1oovp0K0`: confident targets reduced to `['SPEAKER_02']` (collapsed `SPEAKER_00` no longer trusted as target identity).
  - `tyI2OZCVhT8`: confident targets reduced to `['SPEAKER_02']` (collapsed `SPEAKER_01` removed from confident subset).
  - `P018.3` + `P018.4` revalidation: `errors=0`; warnings remain transcript-artifact only.

##### Iteration D4: Materialized Mixed-Mode Splitter

Objective:
- recover usable live evidence from mixed segments while isolating commentary contamination.

Implementation targets:
- `06d.sanitize` splitter module
- `07.content` synthetic segment handling

Required behavior:
- deterministic split when commentary boundary marker is clear.
- keep parent segment ID as interaction child (trimmed text + timing).
- create synthetic commentary child with new segment ID and explicit synthetic provenance.
- keep provenance (`mixed_mode_split`, `parent_segment_id`, boundary marker, original text/timing).

Pass criteria:
- `1ok1oovp0K0` segment `102` parent is usable Stage 07 interaction evidence.
- synthetic commentary child from `102` is excluded from Stage 07 evidence.
- no synthetic-only segment is surfaced as transcript artifact in Stage 07 validation.

Implementation status (`2026-02-15`, current hardening worktree):
- implemented in `06d.sanitize`:
  - detects robust mixed-mode boundary markers.
  - materializes split:
    - parent segment `102` now stores interaction text (`did you study art or graphic design or something`) and remains in conversation `1`.
    - synthetic child segment (new ID) stores commentary tail and is marked:
      - `segment_type=commentary`, `conversation_id=0`
      - `synthetic_segment=true`, `synthetic_type=mixed_mode_commentary_tail`
      - `exclude_from_stage07_evidence=true`
  - report fields now include:
    - `mixed_mode_split_materialized_segments`
    - `mixed_mode_synthetic_child_segments`
    - split parent/child ID lists.
- implemented in `07.content`:
  - synthetic segments are marked in prompt context and filtered from artifact/low-quality candidate reporting.
- observed behavior:
  - `1ok1oovp0K0` Stage 06 segment count: `326 -> 327` (expected due materialized child).
  - Stage 07 now reports transcript-artifact warnings on genuinely problematic segments (`98`, `276`), not on synthetic child output.

##### Iteration D5: Reverify Against Sanitized Output (`06e.reverify`)

Objective:
- ensure sanitization changes reduce verification flags instead of hiding defects.

Implementation targets:
- new `scripts/training-data/06e.reverify` wrapper

Pass criteria:
- no `REJECT` on `P018.3` and `P018.4`.
- non-increasing misattribution + boundary issue counts versus D0 baseline.

Implementation status (`2026-02-14`, current hardening worktree):
- `06e.reverify` wrapper is implemented and supports `--timeout-seconds <N>` (or env `REVERIFY_TIMEOUT_SECONDS`) to prevent indefinite stalls.
- recommended default in this runbook loop is `--timeout-seconds 600`.
- observed behavior in this environment:
  - short timeouts (for example `120s`) can expire without a verifier result artifact; this is expected fail-fast behavior, not silent hanging.
  - rerun with a longer timeout when a fresh reverify artifact is required.

##### Iteration D6: Taxonomy Precision Pass

Objective:
- keep Stage 08 strict but reduce preventable drift from commentary-heavy clips.

Implementation targets:
- `07.content` normalization map
- taxonomy config used by Stage 08

Required behavior:
- classify unlisted concepts into:
  - deterministic alias
  - commentary-only concept (non-blocking bucket)
  - true candidate for taxonomy expansion

Pass criteria:
- no Stage 08 `FAIL` on `P018.4`.
- no precision regression on `P018.3`.

Implementation status (`2026-02-14`, current hardening worktree):
- implemented in `08.taxonomy-validation`:
  - classify unlisted concepts by enrichment context (`approach`, `commentary`, `talking_head_section`).
  - mark `commentary_only=true` when a concept appears only in commentary-like contexts.
  - exclude commentary-only concepts from high-frequency blocking logic by default.
  - keep commentary-only concepts visible in report output and JSON (`commentary_only_bucket`).
- observed behavior:
  - `P018.3` and `P018.4` remain `WARNING` (no `FAIL`), with commentary-only concepts explicitly labeled in report output.
  - high-frequency commentary-only concepts are now non-blocking by default.
  - stress check: `--source coach_kyle_infield --threshold 1` returns `WARNING` (not `FAIL`) with reason `Only commentary-only unlisted concepts detected (non-blocking bucket)`.

##### Iteration D7: Damage Map Contract (New `06f.damage-map`)

Objective:
- make every known transcript/speaker/boundary defect explicit and machine-readable before Stage 07.

Why:
- dropping one label is too shallow; we need a concrete map of where damage starts and where it might spill.

Implementation targets:
- new `scripts/training-data/06f.damage-map`
- consumes `06d.sanitize` + `07.content` warnings (for reruns) when available.

Required behavior:
- output a deterministic per-segment damage map with:
  - `damage_types`: `transcript_artifact`, `low_quality`, `mixed_mode`, `speaker_ambiguity`, `boundary_uncertain`.
  - `severity`: `low|medium|high`
  - `seed_confidence` and deterministic reason codes.
  - initial `contamination_window` suggestion (for example `seed-1 .. seed+2`).
- emit per-conversation summary:
  - `damaged_segment_ratio`
  - `damaged_token_ratio`
  - `high_severity_seed_count`.

Pass criteria:
- on `P018.3` and `P018.4`, every dropped candidate in Stage 07 can be traced back to a `06f` damage record.
- no segment is dropped by downstream logic without a `damage_reason_code`.

AI-implementable steps:
1. Add schema + writer for `data/06f.damage-map/<source>/<video>.damage-map.json`.
2. Seed map from deterministic flags already present in Stage 06/07 artifacts.
3. Normalize reason codes to a stable enum.
4. Add summary metrics for conversation-level damage coverage.
5. Add validator check: fail if downstream drop references unknown reason.

##### Iteration D8: LLM Damage Adjudicator (New `06g.damage-adjudicator`)

Objective:
- use targeted LLM adjudication to decide what is recoverable, what is unreliable, and how far contamination spreads.

Implementation targets:
- new `scripts/training-data/06g.damage-adjudicator`
- prompt + schema in `scripts/training-data/prompts/`.

Required behavior:
- run only on seeded risky segments from `06f` (bounded cost at scale).
- evaluate a local context window (recommended `-4/+8` segments, same conversation).
- strict JSON output per seed:
  - `transcript_confidence`, `speaker_confidence`, `phase_confidence` (`0..1`)
  - `repair_possible` (`true|false`)
  - `repaired_text` (only when confidence >= threshold)
  - `contamination_start_segment_id`, `contamination_end_segment_id`
  - `confidence_rationale` (short, schema-limited)
- require explicit uncertainty instead of guessing when evidence is weak.

Pass criteria:
- adjudicator never emits free-form fields outside schema.
- re-run determinism checks pass on same input (`n=2` identical normalized outputs).

AI-implementable steps:
1. Build deterministic input packer from `06f` seed rows.
2. Implement strict JSON extraction + schema validation/retry.
3. Enforce confidence thresholds:
   - `repair_accept_threshold` (for example `>=0.90`)
   - `anchor_allow_threshold` (for example `>=0.80`).
4. Emit adjudication artifact + stage report metrics (`seeds_total`, `repairs_accepted`, `contamination_spans`).
5. Add timeout/retry budget controls for batch scale.

##### Iteration D9: Confidence Propagation Merge (New `06h.confidence-propagation`)

Objective:
- convert local damage judgments into stable per-segment and per-conversation confidence used by all downstream stages.

Implementation targets:
- new `scripts/training-data/06h.confidence-propagation`
- updates sanitized payload for Stage 07/09 consumption.

Required behavior:
- merge deterministic `06f` seeds + LLM `06g` adjudication into:
  - `segment_confidence` (`transcript`, `speaker`, `phase`, `overall`)
  - `confidence_tier`: `high|medium|low`
  - `contamination_sources`: seed IDs affecting this segment.
- propagate contamination forward/backward within adjudicated span.
- derive conversation-level confidence:
  - `conversation_confidence_score`
  - `confidence_block_reason` when below threshold.

Pass criteria:
- every Stage 07 evidence anchor cites `confidence_tier=high`.
- low-confidence segments remain visible in artifacts but cannot silently become anchors.

AI-implementable steps:
1. Define merge formula and deterministic tie-break rules.
2. Attach per-segment confidence metadata to Stage 06h output.
3. Emit conversation-level confidence summary and thresholds hit.
4. Add validator checks for missing confidence fields and illegal anchor use.

##### Iteration D10: Confidence-Aware Stage 07/09/10 (Behavioral Integration)

Objective:
- prevent damaged text from polluting retrieval while preserving observability.

Implementation targets:
- `07.content`, `09.chunk-embed.ts`, `10.ingest.ts`

Required behavior:
- Stage 07:
  - only high-confidence segments can anchor techniques/phases.
  - medium/low confidence can appear as context but are tagged.
- Stage 09:
  - exclude low-confidence contaminated lines from primary interaction chunk text.
  - attach chunk-level metadata:
    - `chunk_confidence_score`
    - `damaged_segment_ids`
    - `contains_repaired_text`.
- Stage 10:
  - dual-lane ingest policy:
    - primary index: `chunk_confidence_score >= threshold`
    - review index (or skip): below threshold.

Pass criteria:
- retrieval eval on canary set shows non-regressing precision with reduced noisy recalls.
- no chunk reaches primary index without explicit confidence metadata.

##### Iteration D11: Recurrence Prevention Rails (1500-Video Safety)

Objective:
- stop this defect class from silently returning as scale grows.

Required behavior:
- hard quality budgets in validation:
  - max damaged-token ratio per conversation/video.
  - max dropped-anchor ratio per conversation/video.
  - auto-`REVIEW`/`BLOCKED` when thresholds exceeded.
- drift monitors:
  - daily/manifest histograms for `damage_types`, `contamination_span_length`, `anchor_drop_reasons`.
- explicit sampling policy:
  - fixed random sample + worst-case sample per 100 videos for human audit.
- no silent suppression:
  - every exclusion must carry `reason_code`, `source_stage`, `timestamp`.

Pass criteria:
- pipeline fails fast on threshold breaches instead of silently degrading output quality.
- runbook checklist remains green across at least one 100+ video batch before full 1500 rollout.

#### Canonical V2 Evaluation Loop

```bash
# Stage execution
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/P018.3.txt --allow-reject-verdicts
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/P018.3.txt --allow-reject
./scripts/training-data/06d.sanitize --manifest docs/pipeline/batches/P018.3.txt --overwrite
./scripts/training-data/06e.reverify --manifest docs/pipeline/batches/P018.3.txt --timeout-seconds 600
./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.3.txt --verification-gate-policy reverify_patched --input-root data/06d.sanitized --reverify-root data/06e.reverify

./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/P018.4.txt --allow-reject-verdicts
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/P018.4.txt --allow-reject
./scripts/training-data/06d.sanitize --manifest docs/pipeline/batches/P018.4.txt --overwrite
./scripts/training-data/06e.reverify --manifest docs/pipeline/batches/P018.4.txt --timeout-seconds 600
./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.4.txt --verification-gate-policy reverify_patched --input-root data/06d.sanitized --reverify-root data/06e.reverify

# D7-D10 path (enable once implemented)
# ./scripts/training-data/06f.damage-map          --manifest docs/pipeline/batches/P018.3.txt --input-root data/06d.sanitized
# ./scripts/training-data/06g.damage-adjudicator  --manifest docs/pipeline/batches/P018.3.txt --input-root data/06f.damage-map --timeout-seconds 600
# ./scripts/training-data/06h.confidence-propagation --manifest docs/pipeline/batches/P018.3.txt --damage-root data/06f.damage-map --adjudication-root data/06g.damage-adjudicator
# ./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.3.txt --input-root data/06h.confidence-propagation --verification-gate-policy reverify_patched --reverify-root data/06e.reverify

# ./scripts/training-data/06f.damage-map          --manifest docs/pipeline/batches/P018.4.txt --input-root data/06d.sanitized
# ./scripts/training-data/06g.damage-adjudicator  --manifest docs/pipeline/batches/P018.4.txt --input-root data/06f.damage-map --timeout-seconds 600
# ./scripts/training-data/06h.confidence-propagation --manifest docs/pipeline/batches/P018.4.txt --damage-root data/06f.damage-map --adjudication-root data/06g.damage-adjudicator
# ./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.4.txt --input-root data/06h.confidence-propagation --verification-gate-policy reverify_patched --reverify-root data/06e.reverify

# Optional sentinel set for music/lyrics contamination checks only
./scripts/training-data/07.content   --manifest docs/pipeline/batches/P018.2.txt --verification-gate-policy reverify_patched

# Validation + readiness
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/P018.3.txt \
  --stage07-gate-policy reverify_patched \
  --skip-stage01-presence \
  --emit-stage-reports \
  --stage-reports-dir data/validation/stage_reports/P018.3.v2

python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/P018.4.txt \
  --stage07-gate-policy reverify_patched \
  --skip-stage01-presence \
  --emit-stage-reports \
  --stage-reports-dir data/validation/stage_reports/P018.4.v2

python3 scripts/training-data/validation/validate_stage_report.py \
  --dir data/validation/stage_reports/P018.3.v2 \
  --manifest docs/pipeline/batches/P018.3.txt \
  --emit-readiness-summary

python3 scripts/training-data/validation/validate_stage_report.py \
  --dir data/validation/stage_reports/P018.4.v2 \
  --manifest docs/pipeline/batches/P018.4.txt \
  --emit-readiness-summary

# Taxonomy validation
python3 scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/P018.3.txt
python3 scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/P018.4.txt

# Optional D6 sanity check (commentary-only bucket should stay non-blocking)
python3 scripts/training-data/08.taxonomy-validation --source coach_kyle_infield --threshold 1
```

#### V2 Exit Criteria (Before Expanding Rollout)

1. `1ok1oovp0K0` teaser duplicates (`0-5`) are excluded from Stage 07 evidence.
2. `1ok1oovp0K0` mixed segment `102` is either split cleanly or excluded from evidence.
3. Zero usage of flagged segments as technique evidence on `P018.3` and `P018.4`.
4. No `REJECT` in `06e.reverify` on `P018.3` and `P018.4`.
5. Stage 07 artifact warnings non-increasing on `P018.3` and reduced or stable on `P018.4`.
6. Stage 08 status non-regressing on `P018.3` and no `FAIL` on `P018.4`.
7. (When D7-D10 land) Every Stage 07 dropped anchor has a traceable `06f`/`06g` reason code.
8. (When D7-D10 land) No low-confidence contaminated chunk reaches primary ingest lane.
9. (When D7-D10 land) Confidence/drift dashboards stay within configured warning/error budgets.

## Holdout Set (HOLDOUT.1)

`HOLDOUT.1` is a second manifest intended to be run less frequently.
Use it to catch regressions that might not appear in `CANARY.1` and to reduce overfitting.

## Hardening Set (HARDENING.1)

`HARDENING.1` is a targeted stress set for patch-loop iteration.
Current ranked rationale (from existing 06b/06b.reverify/07 artifacts):
- `iOSpNACA9VI` (Barcelona immersion): high misattribution + boundary pressure.
- `IS2SoUgqDLE` (James Marshall): repeated high misattribution counts.
- `nFjdyAHcTgA` (7 Minute Pull): elevated `other_flags` + Stage 07 warnings.
- `mv2X8Yhg9M0` and `6ImEzB6NhiI`: recurring coach/target attribution ambiguity.
- `e2dLEB-AwmA`: known problematic holdout reference; currently lacks local 06b/07 artifacts and should be run fresh.

Latest hardening experiment snapshot (`2026-02-13`):
- Run ID: `HARDENING.1.r20260213T1041Z`
- Processed end-to-end in run namespace (no overwrite of canonical outputs): `6/6` videos
  - completed: `iOSpNACA9VI`, `IS2SoUgqDLE`, `nFjdyAHcTgA`, `mv2X8Yhg9M0`, `6ImEzB6NhiI`, `e2dLEB-AwmA`
  - Barcelona note: `iOSpNACA9VI` needed isolated Stage 06b retries; `sonnet` completed reliably where `opus` stalled.
- Aggregate outcomes on completed 6:
  - `06b.verify`: `FLAG=6`, `REJECT=0`
  - `06b.reverify`: `FLAG=6`, `REJECT=0`
  - Stage 07 validation: `errors=0`, `warnings=46`
    - `transcript_artifact=23`
    - `technique_on_non_coach_segment=19`
    - `evidence_mismatch=2`
    - `evidence_not_on_referenced_segment=2`
- Verify->reverify deltas across completed 6:
  - total misattributions: `-1`
  - total other_flags: `+5`
  - total boundary issues: `+2`
- Run-specific compatibility note:
  - `IS2SoUgqDLE` legacy Stage 06 artifact lacked top-level `transcript_confidence`; this is now handled by `06c.patch` compatibility normalization (`v1.8`) with automatic backfill.

## Run Naming + History Policy

Use stable manifest IDs for dataset membership, and explicit run IDs for repeated executions:
- Manifest IDs: `CANARY.1`, `HOLDOUT.1` (what videos are in scope)
- Run IDs: `CANARY.1.rYYYYMMDDTHHMMZ` (which execution produced validation/semantic artifacts)

Overwrite policy for stage outputs (`06`/`06b`/`06c`/`07`):
- Default behavior is **skip existing outputs**.
- A real re-run of the same manifest requires `--overwrite` (or you will mostly get skips).
- Because stage outputs live at stable canonical paths under `data/<stage>/...`, re-runs with `--overwrite` replace prior artifacts.

To preserve first-run vs Nth-run history:
- Snapshot stage artifacts before overwrite (recommended): copy `data/06.video-type`, `data/06b.verify`, `data/06b.reverify`, `data/06c.patched`, `data/07.content` to `data/archive/runs/<run_id>/`.
- Emit validation artifacts to run-scoped paths:
  - `--stage-reports-dir data/validation/stage_reports/<run_id>`
  - `--quarantine-out data/validation/quarantine/<run_id>.json`
- Use run-scoped semantic ids:
  - `semantic_judge.py --batch-id <run_id>` writes to `data/validation_judgements/<run_id>/`
  - `batch_report.py --batch-id <run_id>` reads matching semantic outputs.

Example run ID:

```bash
RUN_ID="CANARY.1.r$(date -u +%Y%m%dT%H%MZ)"
```

For isolated no-overwrite experiments, use run-scoped roots under `data/experiments/<run_id>/`:
- `06c.patch` supports:
  - `--input-root <path>` (Stage 06 root)
  - `--verification-root <path>` (Stage 06b root)
- `07.content` supports:
  - `--input-root <path>` (Stage 06c root)
  - `--verification-root <path>` (Stage 06b root)
  - `--reverify-root <path>` (Stage 06b.reverify root)

Iteration naming convention inside one experiment run:
- Keep each loop immutable with stage suffixes: `06c.patched.pass2`, `06b.reverify.pass2`, `07.content.pass2`, etc.
- Do not reuse a pass directory name; create `pass3`, `pass4`, ... for each additional loop.

One-video strict-gate example (no overwrite of canonical outputs):

```bash
RUN_ID="CANARY.1.6ImEzB6NhiI.r$(date -u +%Y%m%dT%H%MZ)"
RUN_BASE="data/experiments/${RUN_ID}"

# 1) Seed Stage 06 artifact into run namespace (or generate fresh Stage 06 in RUN_BASE).
# 2) Run verification + patch + reverify + enrichment entirely inside RUN_BASE:
./scripts/training-data/06b.verify   --input "${RUN_BASE}/06.video-type/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06.video-type" --output "${RUN_BASE}/06b.verify" --model opus --allow-reject-verdicts
./scripts/training-data/06c.patch    --input "${RUN_BASE}/06.video-type/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06.video-type" --verification-root "${RUN_BASE}/06b.verify" --output "${RUN_BASE}/06c.patched"
./scripts/training-data/06b.reverify --input "${RUN_BASE}/06c.patched/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06c.patched" --output "${RUN_BASE}/06b.reverify" --model opus
./scripts/training-data/07.content   --input "${RUN_BASE}/06c.patched/<source>/<video_dir>/<stem>.conversations.json" --input-root "${RUN_BASE}/06c.patched" --verification-root "${RUN_BASE}/06b.verify" --reverify-root "${RUN_BASE}/06b.reverify" --output "${RUN_BASE}/07.content" --verification-gate-policy reverify_patched --model opus
```

## Plan Source (Consolidated)

- Primary planning + execution source of truth: `docs/pipeline/audits/pipeline_validation_runbook.md` (this file).
- Historical long-form reference (archival): `docs/pipeline/audits/codex_pipeline_validation.md`.
- Merge/decision summary: `docs/pipeline/audits/merging_optimization.md`.

## Strategic Plan Snapshot (Merged From Audit)

### Mission

Produce a high-quality evaluation + validation plan for the full video pipeline with correctness, observability, and repeatability prioritized over speed. The pipeline should be safe on sub-batches (1, 2, or 10 videos) and scale to ~150 batches of 10 videos without regressions.

Objectives:
- Evaluate quality at each stage and localize where failures are introduced.
- Prevent silent passes with explicit evidence and deterministic status.
- Label each video/batch as ingest-ready (or not) with clear reasons.
- Improve automated detection, validators, and prompt quality.

### Definitions

- Validation: deterministic correctness checks (schema, presence, invariants, thresholds).
- Evaluation: quality measurement (metrics, sampling, model-based checks).
- Gating: rule that blocks downstream processing or ingestion.
- No silent pass: missing/empty/invalid outputs are explicit failures with reason.

### Locked Decisions

1. Canonical layout target is source-video for stages 01-07 (`data/<stage>/<source>/<video_dir>/<stem>.*`) with compatibility reads during migration.
2. No `mixed` speaker role in conversations schema. Keep enum strict; represent uncertainty via warnings/artifacts.
3. Stage 07 production gate policy is `reverify_patched` (with `allow_flag` as explicit override).
4. Stage 08 report naming is manifest/scope-specific (no single overwrite-prone report path).
5. Stage 08 gate scope is per-video quarantine, not full-manifest hard fail when per-video details are available.
6. Stage 10 default ingest policy is READY-only; REVIEW requires explicit override via readiness policy.
7. Stage 10 idempotency keys are stable `<channel>/<video_id>.txt`.

### Execution Checklist

- [x] Confirm canonical artifact layout policy and migration guardrails.
- [x] Complete source-video default write migration for 06/06b/06c/07 (with compatibility reads).
- [ ] Approve final stage report contract + reason-code enum as stable.
- [x] Lock 06b verification contract direction for mixed-speaker handling.
- [x] Lock and wire Stage 07 gate policy (`reverify_patched`).
- [x] Lock Stage 08 report naming + per-video gating scope.
- [x] Finalize readiness warning policy thresholds (`--max-warning-check` budgets).
- [x] Adopt quarantine + waiver mechanism to prevent silent reprocessing.
- [x] Add Stage 10 manifest quarantine decision reporting (`data/validation/ingest_quarantine/...`).

### Open Questions

1. Turn-phase segment indexing contract:
   - Keep global `segment_id` only and align Stage 09, or emit both `segment_id` and conversation-local `segment_index`.
2. Layout migration cutoff:
   - Define date/criterion to stop supporting legacy root-flat/source-flat writes for 06/06b/06c/07.

## Repeatable Canary Loop

### 0) Optional: reset embeddings table (DB destructive)

If you want a clean slate for retrieval testing, wipe the `embeddings` table first:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/00.reset-embeddings.ts --count
node node_modules/tsx/dist/cli.mjs scripts/training-data/00.reset-embeddings.ts --wipe-all --yes
```

### 1) Run LLM stages (writes under `data/`)

Note: `06b.verify` and `07.content` require Claude (network/auth). In the Codex sandbox, these runs may require escalation.

```bash
./scripts/training-data/06b.verify --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/06c.patch  --manifest docs/pipeline/batches/CANARY.1.txt
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy allow_flag
# Optional: skip known-bad videos from a quarantine file
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy allow_flag --quarantine-file data/validation/quarantine/CANARY.1.json
# Strict reverify gate (recommended for production hardening):
# ./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/CANARY.1.txt
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy reverify_patched
```

Note: Stage 06b now drops low-confidence (<0.70) misattribution/collapse auto-fix suggestions from structured fix arrays and records those drops in `other_flags`.
If 06b returns parseable-but-schema-invalid JSON, it now performs bounded schema-repair retries before failing the video.
Stage 06/06b/06c/07 now default to source-video artifact writes (`data/<stage>/<source>/<video_dir>/<stem>.*`) while still reading legacy source-flat/root-flat artifacts for compatibility.

**Claude model strategy:**
- `06.video-type`, `06b.verify`, and `07.content` default to `--model opus`.
- `06b.verify` now supports timeout fallback via `--fallback-model` (default `sonnet`), used only when the primary model times out.
- Keep `opus` for both canary and holdout so quality behavior is stable across runs.

Examples:

```bash
./scripts/training-data/06.video-type --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/CANARY.1.txt --model opus
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --verification-gate-policy reverify_patched --model opus
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/HOLDOUT.1.txt --model opus
./scripts/training-data/07.content --manifest docs/pipeline/batches/HOLDOUT.1.txt --verification-gate-policy reverify_patched --model opus
# Hardening stress set:
./scripts/training-data/06b.verify   --manifest docs/pipeline/batches/HARDENING.1.txt --model opus
./scripts/training-data/06c.patch    --manifest docs/pipeline/batches/HARDENING.1.txt --allow-reject
./scripts/training-data/06b.reverify --manifest docs/pipeline/batches/HARDENING.1.txt --model opus
./scripts/training-data/07.content   --manifest docs/pipeline/batches/HARDENING.1.txt --verification-gate-policy reverify_patched --model opus
```

Notes:
- `06c.patch` defaults to refusing to patch when 06b returns `REJECT`. For iteration/salvage (when 06b suggests high-confidence deterministic fixes), you can opt in:

```bash
./scripts/training-data/06c.patch --manifest docs/pipeline/batches/HOLDOUT.1.txt --overwrite --allow-reject
```

- `06c.patch` now treats most `other_flags` as log-only by default.
  Experimental heuristic for mixed-speaker run-on flags is opt-in:

```bash
./scripts/training-data/06c.patch --input ... --apply-mixed-speaker-other-flags
```

Use that flag only for controlled experiments (it can regress quality; keep outputs in pass-scoped directories).

- `07.content` blocks `REJECT` by default (unless `--verification-gate-policy allow_flag` and patch-clean salvage applies). For debugging/evaluation you can bypass the 06b gate:

```bash
./scripts/training-data/07.content --input data/06c.patched/<source>/<video_dir>/<stem>.conversations.json --skip-verification --overwrite --model opus
```

If a `REJECT` video was patched cleanly by `06c.patch` (fixes applied, `flags_not_fixed_count=0`), Stage 07 will allow it under the same explicit waiver as `FLAG` by passing `--verification-gate-policy allow_flag` (or the legacy alias `--allow-flag`).
For stricter production gating, run `06b.reverify` on `06c.patched` outputs and use `--verification-gate-policy reverify_patched` so Stage 07 only proceeds when baseline `06b.verify` exists and reverify is `APPROVE`/`FLAG`.
When run via `sub-batch-pipeline --stage 07 --verification-gate-policy reverify_patched`, the orchestrator now auto-synthesizes `data/validation/quarantine/<subbatch>.json` from reverify `REJECT` verdicts when no quarantine file is present.

### 1b) Revalidate Stage 07 (no Claude; deterministic)

Use this after changing Stage 07 normalization/validators, to refresh outputs without rerunning the LLM:

```bash
./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --revalidate
# Strict gate-friendly revalidate (recommended when using reverify_patched):
# ./scripts/training-data/07.content --manifest docs/pipeline/batches/CANARY.1.txt --revalidate --verification-gate-policy reverify_patched --quarantine-file data/validation/quarantine/CANARY.1.json
```

### 2) PASS/FAIL harness (read-only)

This includes:
- artifact presence checks (06b/06c/07)
- Stage 06b verification payload contract sanity checks
- cross-stage consistency (06/06c vs 07)
- Stage 07 per-file validation summary (warnings/errors) and partial-write detection
- Stage 02+ correctness checks by default (transcript/conversation/enrichment/chunk path)
- Optional Stage 01 artifact presence check only (`--skip-stage01-presence` recommended for correctness validation runs where Stage 01 media retention is not guaranteed)

```bash
python3 scripts/training-data/validation/validate_manifest.py \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --skip-stage01-presence \
  --stage07-gate-policy reverify_patched
```

Policy note:
- Treat Stage 01 as media-retention/integrity metadata, not a correctness blocker for Stage 02+ pipeline behavior.
- For correctness hardening loops, run validation with `--skip-stage01-presence`.
- Only enforce Stage 01 presence when specifically auditing download/media retention.

To also require Stage 05 audio_features artifacts/payload integrity in the same harness run, add `--check-stage05-audio`.
To also require Stage 09 chunk artifacts/payload integrity in the same harness run, add `--check-stage09-chunks`.
That check now enforces stable `sourceKey`/`videoId`/`channel` alignment plus `chunkIndex`/`totalChunks` consistency and continuity.
To also enforce Stage 08 report integrity in the same harness run, add `--check-stage08-report`.
When `--source` is also set, Stage 08 report names are source-scoped (`<manifest>.<source>.report.json`) and scope metadata is validated.
If you run via `sub-batch-pipeline`, use:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep`
(`--validate-deep` now expands to `--check-stage05-audio --check-stage08-report --check-stage09-chunks`.)
To use permissive Stage 07 gating in validation (`FLAG` and patched-clean `REJECT` allowed), add:
`--stage07-gate-policy allow_flag` (or `--allow-flag` alias in the orchestrator).
To require strict reverify gating in validation, use:
`--stage07-gate-policy reverify_patched` (requires `data/06b.reverify/*` artifacts for the manifest scope).
To scope validation to a single source within the manifest:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --source <source_name>`
Optional waivers: `--waiver-file docs/pipeline/waivers/CANARY.1.json` to downgrade explicit known checks (video/check scoped) to `info`.
If a waiver includes `expires_at` and that timestamp is in the past, it is ignored automatically.
The same waiver file can be passed through the orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --validate-deep --waiver-file docs/pipeline/waivers/CANARY.1.json`
If `docs/pipeline/waivers/CANARY.1.json` exists, `sub-batch-pipeline CANARY.1 --validate` auto-detects and applies it.
Optional stage-report emission:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --emit-stage-reports`
This writes per-video reports to `data/validation/stage_reports/CANARY.1/`.
Optional quarantine emission:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --emit-quarantine`
This writes `data/validation/quarantine/CANARY.1.json` (or `.../<manifest>.<source>.json` with `--source`).
To apply an existing quarantine list during validation:
`python3 scripts/training-data/validation/validate_manifest.py --manifest docs/pipeline/batches/CANARY.1.txt --quarantine-file data/validation/quarantine/CANARY.1.json`
Validate emitted reports with:
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary`
Optional readiness hardening during summary generation:
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary --allow-review-ingest`
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary --block-warning-check transcript_artifact --max-warning-checks 3`
`python3 scripts/training-data/validation/validate_stage_report.py --dir data/validation/stage_reports/CANARY.1 --manifest docs/pipeline/batches/CANARY.1.txt --emit-readiness-summary --max-warning-check transcript_artifact=1 --max-warning-check evidence_mismatch=0`
Readiness warning-budget behavior:
- `stage07_validation_warnings` is expanded into per-warning-type counts (for example `transcript_artifact`, `evidence_mismatch`).
- contextual warnings (`missing_stage01_audio`, `stage08_validation_warning`, `stage08_video_warning`, `stage07_normalization_repairs`) are excluded from generic `max_warning_checks`.
- those contextual warnings also do not downgrade readiness from `READY` to `REVIEW` by themselves.
- contextual checks can still be forced via explicit `--block-warning-check` or `--max-warning-check <check>=<n>`.
The same can be triggered from the orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports`
(`sub-batch-pipeline` now runs this contract+coverage check automatically and writes `readiness-summary.json` under the stage-reports directory.)
With orchestrator readiness policy controls:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports --allow-review-ingest`
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports --block-warning-check transcript_artifact --max-warning-checks 3`
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-stage-reports --max-warning-check transcript_artifact=1 --max-warning-check evidence_mismatch=0`
Optional semantic-quality gate in the same `--validate` run (requires semantic_judge outputs):
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`
Strict one-flag profile:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --quality-gate`
(`--quality-gate` expands to deep checks + stage reports + READY-only readiness + warning policy defaults: `max_warning_checks=3`, `transcript_artifact<=1`, `evidence_mismatch=0`, `evidence_not_on_referenced_segment=0` + semantic defaults.)
To also run Stage 10 ingest gates in dry-run mode (no DB writes) at the end of validation:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --quality-gate --check-stage10`
Or emit quarantine from orchestrator:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --validate --emit-quarantine`
Then Stage 07 can auto-consume `data/validation/quarantine/CANARY.1.json` when run via:
`./scripts/training-data/batch/sub-batch-pipeline CANARY.1 --stage 07`
In `reverify_patched` mode, Stage 07 also auto-generates that quarantine file from 06b.reverify verdicts if it is missing.

### 3) Scorecard (writes by default, use `--no-write` if you only want stdout)

```bash
python3 scripts/training-data/validation/batch_report.py \
  --all \
  --manifest docs/pipeline/batches/CANARY.1.txt \
  --batch-id CANARY.1 \
  --no-write
```

Note: if `data/validation_judgements/<batch_id>/` exists (from `semantic_judge.py`), the batch report will include a semantic-score summary.
You can enforce semantic thresholds directly in `batch_report.py` (non-zero exit on gate failure), e.g.:
`python3 scripts/training-data/validation/batch_report.py --all --manifest docs/pipeline/batches/CANARY.1.txt --batch-id CANARY.1 --no-write --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`

### 4) Taxonomy Gate (Stage 08; deterministic)

This is a taxonomy drift detector, not a truth detector.
It reports which concepts the LLM placed into `unlisted_concepts` and how often they recur.

By default it only **fails** on high-frequency unlisted concepts (topics threshold is stricter than techniques).

```bash
python3 scripts/training-data/08.taxonomy-validation \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 5) Chunk + embed (Stage 09; Ollama)

This stage calls Ollama at `QA_CONFIG.ollama.baseUrl` (default `http://localhost:11434`) and requires the embedding model to exist.

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/09.chunk-embed.ts \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 6) Validate chunk files (read-only)

```bash
python3 scripts/training-data/validation/validate_chunks.py \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

### 7) Ingest (Stage 10; DB writes)

Start with a dry run on the canary:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts \
  --dry-run \
  --manifest docs/pipeline/batches/CANARY.1.txt
```

Only run a real ingest when you explicitly want to update Supabase. Stage 10 is idempotent with `sourceKey`,
but it still performs DB writes and should be treated as “production-impacting”.

Note: when running with `--manifest`, Stage 10 requires a valid Stage 08 manifest-scoped report and will refuse ingest if:
- the report is malformed or has an unexpected scope/source label
- the report indicates unreadable Stage 07 outputs or incomplete manifest coverage
- the report manifest scope size does not match the ingest manifest scope (or `--source` subset)
- the report status is `FAIL` and no per-video failure details are available for safe quarantine
When per-video Stage 08 failures are present in the report, Stage 10 now quarantines those videos and continues ingest for the remaining eligible scope.
Stage 10 also requires a readiness summary at `data/validation/stage_reports/<manifest>/readiness-summary.json` (or `<manifest>.<source>/` for `--source` runs) and will refuse ingest if:
- the summary is missing/invalid
- the summary does not cover the ingest-eligible scope
- the summary scope metadata (when present) does not match ingest manifest/source
- all ingest-scope videos are non-ingest-ready (`BLOCKED`/`REVIEW` under READY-only policy)
By default readiness policy is READY-only. To allow REVIEW ingest, generate readiness summaries with `--allow-review-ingest`.
Stage 10 can optionally run a semantic-quality gate for the same manifest scope when `--semantic-*` flags are provided (native gate logic aligned with `batch_report.py`).
Example:
`node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --dry-run --semantic-min-fresh 5 --semantic-min-mean-overall 75 --semantic-max-major-error-rate 0.20 --semantic-fail-on-stale`
Shortcut:
`node node_modules/tsx/dist/cli.mjs scripts/training-data/10.ingest.ts --manifest docs/pipeline/batches/CANARY.1.txt --dry-run --quality-gate`
If semantic judgements use a different directory label than the manifest stem, pass `--semantic-batch-id <id>`.
Stage 10 writes a semantic gate report to `data/validation/semantic_gate/<manifest>[.<source>].<batch_id>.report.json` by default (override with `--semantic-report-out <path>`).
Stage 10 also writes a manifest quarantine decision report to `data/validation/ingest_quarantine/<manifest>[.<source>].<run>.report.json` (override with `--quarantine-report-out <path>`).
Use `--skip-taxonomy-gate` only when you intentionally bypass this gate.
Use `--skip-readiness-gate` only when you intentionally bypass readiness gating.
It also refuses manifest ingest when chunk files cannot derive a stable video-id-based `sourceKey` (to avoid idempotency drift).
For legacy artifacts only, override with `--allow-unstable-source-key`.
Stage 10 now performs chunk preflight validation (non-empty content, consistent numeric embedding length, stable chunk indices/total counts, required metadata fields) and refuses manifest ingest if chunk payloads are invalid.

### 8) Retrieval smoke test (end-to-end)

This calls Ollama + Supabase retrieval and prints the top matches:

```bash
node node_modules/tsx/dist/cli.mjs scripts/training-data/11.retrieval-smoke.ts \
  "approach a girl in public"
```

## How to Interpret Failures

### Stage output missing but validation exists

Example: `*.enriched.validation.json` exists but `*.enriched.json` is missing.

Interpretation:
- Stage ran and validation happened, but output write was skipped (hard errors) or interrupted.
- Treat as FAIL (`partial_write`) and block downstream steps for that video until fixed.

### Stage 07 taxonomy drift

If the LLM outputs invalid topics/techniques:
- Preferred: auto-move invalid entries into `unlisted_concepts` and keep the rest valid.
- Track drift frequency; if a concept appears often and is useful, consider promoting it into the taxonomy (human decision).

## Semantic Quality Measurements (Next Layer)

### Proxy metrics (cheap, automatic, ongoing)

These don’t require human labels, but they catch regressions:
- evidence mismatch rates (example strings not found in transcript)
- taxonomy drift (unlisted concepts volume and top offenders)
- normalization repairs count (how often we “fixed” LLM drift)
- phase sanity (regressions, post_hook dependencies, etc.)
- transcript artifact rates (ASR garbage surfaced by Stage 07)
- speaker-role drift: how often the pipeline labels a `student` speaker (should stay rare globally; track via `batch_report.py`)

### Real semantic quality (needs a reference)

Pick one (or both):
1. **Gold labels (best):** a small set of approaches where you agree the correct techniques/topics/phases are known.
2. **LLM judge (fast):** a rubric-scoring script that grades Stage 07 output against transcript + taxonomy, with caching:
   - `python3 scripts/training-data/validation/semantic_judge.py --manifest docs/pipeline/batches/CANARY.1.txt --n 5 --seed 1 --model sonnet`

Goal: keep semantic evaluation small (canary + holdout), and only expand once it’s stable.

## When Human Input Is Needed

1. Deciding whether recurring unlisted concepts should become first-class taxonomy items.
2. Spot-checking a handful of enrichments for “does this feel correct/useful?”
3. Approving what counts as “hard fail” vs “warning” for semantic metrics.

## Handoff Notes (If You Close Codex)

Everything important is in git history on `pipeline-validation-hardening`.

To continue later:
1. `git worktree list` (find the validation worktree)
2. `cd` into that worktree
3. Run the canary loop above

Generated `data/*` artifacts are not committed; they are reproducible from the scripts + manifests.
