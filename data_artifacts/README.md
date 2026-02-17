# Pipeline Data Artifacts Snapshot

This folder contains a checked-in snapshot of local pipeline run outputs that are normally git-ignored under `data/`.

Snapshot source:
- copied from `data/` on `2026-02-15` (local workspace state)
- intended to preserve runbook evidence during branch integration

Included stage folders:
- `06.LLM.video-type/`
- `06b.LLM.verify/`
- `06c.DET.patched/`
- `07.LLM.content/`
- `08.DET.taxonomy-validation/`
- `09.EXT.chunks/`
- `validation-audits/`

Not currently present in this snapshot:
- `06d.DET.sanitized/`
- `06e.LLM.quality-check/`
- `06f.DET.damage-map/`
- `06g.LLM.damage-adjudicator/`
- `06h.DET.confidence-propagation/`

Refresh procedure:

```bash
for d in 06.LLM.video-type 06b.LLM.verify 06c.DET.patched 07.LLM.content 08.DET.taxonomy-validation 09.EXT.chunks validation-audits; do
  rsync -a "data/$d/" "data_artifacts/$d/"
done
```
