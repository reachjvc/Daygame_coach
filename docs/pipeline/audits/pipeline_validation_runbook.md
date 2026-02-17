# Pipeline Validation Runbook (Handoff + Iteration Loop)

This runbook exists so another agent can pick up work without any chat history.

> **Iteration history (D0–D14b):** For implementation details, defect analysis, and test results, see `docs/pipeline/audits/iteration-history.md`.

### Mission

Produce a high-quality evaluation + validation plan for the full video pipeline with correctness, observability, and repeatability prioritized over speed. The pipeline should be safe on sub-batches (1, 2, or 10 videos) and scale to ~150 batches of 10 videos without regressions.

Objectives:
- Evaluate quality at each stage and localize where failures are introduced.
- Prevent silent passes with explicit evidence and deterministic status.
- Label each video/batch as ingest-ready (or not) with clear reasons.
- Improve automated detection, validators, and prompt quality.

Rules:
- Gating: rule that blocks downstream processing or ingestion.
- No silent pass: missing/empty/invalid outputs are explicit failures with reason.
- **Show-don't-summarize:** When reporting flags/warnings/artifacts to user, ALWAYS include the actual segment text + 5 segments before and after for context. Never summarize without showing the raw data first. The user needs to see the text to make judgment calls. Use `>>>` marker on the target segment. Get it right on the first attempt — debug file lookups (bracket escaping, top-level vs nested segments, folder name mismatches across stages) before outputting, not after.

### Work being done
**2026-02-16:** P001.2–P001.10 (86 videos) completed stages 02–05. P001.1 was already at stage 07. All 96 P001 videos now through stage 05; next is stage 06+.
**2026-02-16:** P002.1–P002.10 (97 videos) completed stages 02–05. All P002 sub-batches now through stage 05; next is stage 06+. Note: some sub-batches missing 1-2 downloads (P002.3/4: 8/10, P002.5/6/9: 9/10) — those videos were skipped by the pipeline.

### Old Evaluation and Test Data
Evaluation/test validation data (CANARY.1, P018.3, P018.4, D13b, hardening audit results) was archived — not deleted — to preserve drift comparison baselines:

| Original location | Archived to |
|---|---|
| `data/validation/drift/` | `data/old_testing_validation/old_drift/` |
| `data/validation/ingest_quarantine/` | `data/old_testing_validation/old_ingest_quarantine/` |
| `data/validation/stage_reports/` | `data/old_testing_validation/old_stage_reports/` |
| `data/validation-audits/` | `data/old_testing_validation/old_validation_audits/` |

All archived files are prefixed with `old_` (e.g. `old_P018.3.v2.damage-drift.json`). Internal directory structure is preserved.

**Why this exists:** When re-running batches through the pipeline, compare new validation outputs against these archived baselines to detect quality drift or regressions. For example, compare a fresh `P018.3.v2.damage-drift.json` against `data/old_testing_validation/old_drift/old_P018.3.v2.damage-drift.json`.

## Batch & Manifest Naming

All manifests live in `docs/pipeline/batches/`. Each is a plain text file listing videos to process.

Line format: `source_name | video_folder_name`
Video ID is the 11-char YouTube ID in brackets, e.g. `[iOSpNACA9VI]`.

### Production batches

| Pattern | Example | What it is |
|---------|---------|------------|
| `P<NNN>.txt` | `P001.txt` | Parent batch — all videos for one source group (e.g. 96 videos) |
| `P<NNN>.<N>.txt` | `P001.1.txt` | Sub-batch — a 10-video slice of the parent, used for pipeline runs |
| `P<NNN>.<N>.txt` | `P018.3.txt` | Special small batches (P018.*) used for V2 hardening validation |

There are currently 15 parent batches (P001–P015) with 10 sub-batches each, plus P018.1–P018.4 for hardening.

### Special-purpose manifests

| Manifest | Videos | Purpose |
|----------|--------|---------|
| `CANARY.1.txt` | 7 | Cheap, fast canary — run first to catch regressions |
| `HOLDOUT.1.txt` | 7 | Run less frequently — catches regressions canary misses |
| `HARDENING.1.txt` | 6 | Stress set — high misattribution / boundary pressure videos |

### Shorthand conventions

When the user says **"batch 1.1"**, they mean **P001.1**. More generally, "batch X.Y" maps to `P00X.Y` (zero-padded to 3 digits).

### Handling "run batch X.Y" requests

When the user asks to "run" a batch, **do not assume it hasn't been processed at all.** Before responding:

1. Check `data/` stage directories for that batch's source folder to see how far it has actually progressed (e.g. `data/06.LLM.video-type/` exists but `data/06b.LLM.verify/` doesn't → stages 01–06 are done).
2. Check the `P<NNN>.status.json` file for recorded status.
3. Report the **actual current stage** to the user: "P001.1 is complete through stage 06. Next stage to run is 06b.verify."
4. Confirm with the user which stage(s) to run next — don't re-run completed stages or claim nothing has been done.

### Post-Stage-06 split manifests

After Stage 06, `DET.split-manifest` divides a manifest by video type:
- `<name>.infield.txt` — videos with 1+ approach conversations → full pipeline
- `<name>.non_infield.txt` — videos with 0 approach conversations → simpler path

Example: `CANARY.1.txt` → `CANARY.1.infield.txt` (4 videos) + `CANARY.1.non_infield.txt` (3 videos).

## What "Done" Looks Like

1. A lightweight scorecard that tracks Stage 06/07 outputs over time (drift + warnings + normalization).

## Pipeline 

***run the pipeline in virtual environment. IT has run before so everything should work. Dont try to install new dependencies.

***can also useASCII in /docs/pipeline/* for information on pipeline stages
MUST UPDATE ASCII file when you make changes to the stages!

### Running the pipeline

All LLM stages must be run in parallel of 5.

Use `sub-batch-pipeline` for all pipeline operations.

```bash
# Run full pipeline for a sub-batch (stages 06→09 + auto-validation)
./sub-batch-pipeline P001.1 --run

# Resume from a specific stage
./sub-batch-pipeline P001.1 --run --from 07

# Run all incomplete sub-batches in a batch
./sub-batch-pipeline P001 --run-all
./sub-batch-pipeline P001 --run-all --count 3

# Run a single stage (post-stage validation still fires)
./sub-batch-pipeline P001.1 --stage 06
```

Validation is automatic:
- Post-stage hooks run after 06b (REJECT check), 07 (cross-stage), 09 (chunk integrity)
- End-of-run validation: manifest integrity + stage reports + batch report
- Failing videos are quarantined and skipped in subsequent stages
- Summary report printed at end

Config: `scripts/training-data/batch/pipeline.config.json` (gate policies, warning budgets)

**Never auto-ingest** — stage 10 requires explicit user approval.
**Update status** after batch work: status must reflect what actually completed on disk, not what was attempted. If videos within a sub-batch are at different stages (e.g. some gated, some progressed), record the per-video breakdown. Never update `current_stage` to a target stage that wasn't fully achieved — verify against actual output files before writing.

Legend:
- `[LLM]`: Claude-dependent stage (network/auth required).
- `[DET]`: deterministic local stage (no LLM).
- `[EXT]`: external local/remote service dependency (`ollama`, `supabase`).
- `GATE(HARD)`: blocks downstream processing/ingest for that video/scope.
- `GATE(SOFT)`: does not block alone; emits control metadata consumed by later hard gates.

Stage notes (what each stage is for):
- `00.EXT.reset-embeddings`: utility to inspect/wipe embeddings table before a clean retrieval test.
- `01.download`: fetch raw source media and stage download artifacts.
- `02.EXT.transcribe`: generate transcript JSON from audio.
- `03.EXT.align`: align transcript text to timeline segments.
- `04.EXT.diarize`: assign speaker tracks.
- `05.EXT.audio-features`: compute ASR/audio metadata used by Stage 06.
- `06.LLM.video-type`: infer conversation structure + roles + type from Stage 05.
- `06b.LLM.verify`: independent LLM QA pass over Stage 06 artifacts.
- `06c.DET.patch`: deterministic patch pass from verifier output.
- `06d.DET.sanitize`: deterministic contamination handling and Stage 07 evidence allowlists.
- `06e.LLM.quality-check`: focused transcript quality assessment (ASR artifact detection, damage severity, repair suggestions).
- `06f.DET.damage-map`: normalize segment damage reasons and coverage metrics (reads 06e quality data).
- `06g.LLM.damage-adjudicator`: targeted LLM adjudication only for risky seeded segments.
- `06h.DET.confidence-propagation`: turn damage/adjudication into per-segment/per-conversation confidence.
- `07.LLM.content`: produce enrichments only (no quality assessment); passes through quality fields from 06e.
- `08.DET.taxonomy-validation`: deterministic taxonomy drift gate with per-video quarantine semantics.
- `09.EXT.chunk-embed`: convert enrichments to retrieval chunks + embeddings (Ollama).
- `10.EXT.ingest`: ingest eligible chunks to DB with readiness/taxonomy/semantic gates.
- `11.EXT.retrieval-smoke`: quick end-to-end retrieval check against ingested data.

