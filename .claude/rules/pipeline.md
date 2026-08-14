---
paths:
  - "scripts/training-data/**"
  - "docs/pipeline/**"
  - "data/**"
---

# Pipeline

Read `docs/pipeline/learnings.md` before changing a stage, and add to it when you learn something new. Quality > speed > coverage.

**Ground every claim in the script or the data.** Not in a summary, a visualization, or the comment at the top of the file. The recurring failure here is assuming a stage does what its docstring says. Open it. Count the artifacts.

**Count by YouTube ID, not source folder.** Source folders mix batches — `coach_kyle_how_to_approach_a_girl` holds P001 *and* P002 videos. Pull the IDs from the manifest, then `find data/<stage> -name "*<id>*"` per ID. A folder-level count is never a batch-level count.

**One entrypoint.** Fold new automation into the existing top-level command instead of adding a parallel one. A single state file and a single human-readable progress plan, both updated automatically. Before adding a command, ask whether it belongs inside the existing one.

**Fail closed.** A required LLM stage returning nothing is a `BLOCK`, never a pass. No heuristic may stand in for an LLM quality decision. Stage `07b` "Claude returned no output" emits a reason-coded BLOCK artifact so quarantine can act on it.

**The quality signal is 06h confidence, not 06b flag count.** 06b lists individual issues; 06h aggregates them per segment. Few 06b flags alongside 90%-contaminated 06h segments is common. And `quality_gate.blocked=False` is necessary but not sufficient for ingest — the pre-ingest QA screen in `10.EXT.ingest-test.ts` is the real gate.
