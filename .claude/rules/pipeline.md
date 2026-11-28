---
paths:
  - "scripts/training-data/**"
  - "docs/pipeline/**"
  - "data/**"
---

# Pipeline

- Read `docs/video-pipeline.md` first. The live pipeline is private, in `~/.cache/daygame-research/capture/` and `whole10/`; `scripts/training-data/` is the old pipeline (last run 2026-08-05).
- Old stages: `.venv/bin/python -u scripts/training-data/<stage>`, never system python; LLM runs inside `( unset CLAUDECODE; ... )`. Old pipeline only: its one entrypoint is `batch/batch-pipeline.sh`.
- Fail closed: an empty LLM result is a BLOCK, never a pass. Count from the files on disk by YouTube ID, never from docstrings, logs or "COMPLETE" lines.
- Never delete `~/.cache/daygame-research/capture/prod/PAUSE_CLAUDE` (his pause). Every GPU job goes through `~/.cache/daygame-research/tools/gpu_gate.py`.
