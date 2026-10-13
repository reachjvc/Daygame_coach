---
paths:
  - "scripts/training-data/**"
  - "docs/pipeline/**"
  - "data/**"
---

# Pipeline

- Read `docs/pipeline/learnings.md` before changing a stage; add to it when you learn something.
- Run stages with `.venv/bin/python -u scripts/training-data/<stage>`. Never system python.
- Open a stage and count its artifacts; don't trust its docstring.
- Count by YouTube ID from the manifest, not by source folder — folders mix batches.
- One entrypoint: fold new automation into the existing top-level command.
- Fail closed: an empty LLM stage result is a BLOCK, never a pass.
- The quality signal is 06h confidence, not 06b flag count. The real ingest gate is the pre-ingest QA in `10.EXT.ingest-test.ts`.
