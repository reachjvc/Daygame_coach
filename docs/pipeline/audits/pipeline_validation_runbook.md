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
- **Show-don't-summarize:** When reporting flags/warnings/artifacts to user, ALWAYS include the actual segment text + 5 segments before and after for context. Use `>>>` marker on the target segment. 

### Work being done
**2026-02-18 (verified on-disk, YouTube ID match per stage dir):**

P002 (all): stage 05. P001 mixed:

| Batch | At | Blocked | Gap |
|-------|----|---------|-----|
| 1.1 (10) | **10 (ingested)** | — | done |
| 1.2 (10) | 06h | 07 | 0/10 at 07 |
| 1.3 (10) | 06h | 07 | 0/10 at 07 |
| 1.4 (10) | 06d | 06e | 7/10 at 06e, 0 at 06f |
| 1.5 (10) | 06f | 06g | 9/10 at 06f (1 missing since 06b) |
| 1.6 (10) | 05 | 06 | not started |
| 1.7 (10) | 06h | 07 | 0/10 at 07 |
| 1.8 (10) | 06h | 07 | 7/10 at 07 |
| 1.9 (10) | 06h | 07 | 9/10 06b–06h, 6/10 at 07 |
| 1.10 (6) | 05 | 06 | not started |

**Next:**
1. 1.6, 1.10, P002: `--run` from 06
2. 1.4: fix 3 missing 06e, resume 06e
3. 1.5: fix 1 missing 06b, resume 06g
4. 1.2, 1.3, 1.7: resume 07
5. 1.8, 1.9: investigate blocked 07 videos, re-run


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

Config: `scripts/training-data/batch/pipeline.config.json` (quarantine levels, warning budgets)

**Never auto-ingest** — stage 10 requires explicit user approval.
**Update status** after batch work: status must reflect what actually completed on disk, not what was attempted. If videos within a sub-batch are at different stages (e.g. some quarantined, some progressed), record the per-video breakdown. Never update `current_stage` to a target stage that wasn't fully achieved — verify against actual output files before writing.

Legend:
- `[LLM]`: Claude-dependent stage (network/auth required).
- `[DET]`: deterministic local stage (no LLM).
- `[EXT]`: external local/remote service dependency (`ollama`, `supabase`).
- `QUARANTINE`: blocks downstream processing for that video (REJECT verdicts, cross-stage validation failures).
- `QUALITY METADATA`: informational quality signals consumed by downstream stages (FLAG verdicts, 06e artifacts, 06h confidence).

Stage notes (what each stage is for):
- `00.EXT.reset-embeddings`: utility to inspect/wipe embeddings table before a clean retrieval test.
- `01.download`: fetch raw source media and stage download artifacts.
- `02.EXT.transcribe`: generate transcript JSON from audio.
- `03.EXT.align`: align transcript text to timeline segments.
- `04.EXT.diarize`: assign speaker tracks.
- `05.EXT.audio-features`: compute ASR/audio metadata used by Stage 06.
- `06.LLM.video-type`: infer conversation structure + roles + type from Stage 05.
- `06b.LLM.verify`: independent LLM QA pass over Stage 06 artifacts. Auto-tiered model: `--model auto` (default) uses Haiku when video_type confidence >= 0.85, Opus otherwise.
- `06c.DET.patch`: deterministic patch pass from verifier output.
- `06d.DET.sanitize`: deterministic contamination handling and Stage 07 evidence allowlists.
- `06e.LLM.quality-check`: focused transcript quality assessment (ASR artifact detection, damage severity, repair suggestions).
- `06f.DET.damage-map`: normalize segment damage reasons and coverage metrics (reads 06e quality data).
- `06g.LLM.damage-adjudicator`: targeted LLM adjudication only for risky seeded segments. Batches 5-10 seeds per prompt (~5x fewer calls). Skips non-infield videos automatically (`--skip-video-type-filter` to override).
- `06h.DET.confidence-propagation`: turn damage/adjudication into per-segment/per-conversation confidence.
- `07.LLM.content`: apply 06e transcript repairs + produce enrichments; REJECT videos already quarantined upstream, FLAG/APPROVE both proceed.
- `08.DET.taxonomy-validation`: deterministic taxonomy drift gate with per-video quarantine semantics.
- `09.EXT.chunk-embed`: convert enrichments to retrieval chunks + embeddings (Ollama). Confidence floor (0.3) drops low-quality chunks pre-embed. Mtime-based stale output detection auto-forces re-chunk when input is newer than output.
- `10.EXT.ingest`: ingest eligible chunks to DB with readiness/taxonomy/semantic gates. Mtime-based stale output detection auto-forces re-ingest when chunks are newer than last ingest.
- `11.EXT.retrieval-smoke`: quick end-to-end retrieval check against ingested data.

