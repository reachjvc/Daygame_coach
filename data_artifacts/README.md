# Pipeline Data Artifacts Snapshot

This folder contains a checked-in snapshot of local pipeline run outputs that are normally git-ignored under `data/`.

Snapshot source:
- copied from `data/` on `2026-02-15` (local workspace state)
- intended to preserve runbook evidence during branch integration

Included stage folders:
- `06.video-type/`
- `06b.verify/`
- `06b.reverify/`
- `06c.patched/`
- `07.content/`
- `08.taxonomy-validation/`
- `09.chunks/`
- `validation-audits/`

Not currently present in this snapshot:
- `06d.sanitize/`
- `06e.reverify/`
- `06f.damage-map/`
- `06g.damage-adjudicator/`
- `06h.confidence-propagation/`

Refresh procedure:

```bash
for d in 06.video-type 06b.verify 06b.reverify 06c.patched 07.content 08.taxonomy-validation 09.chunks validation-audits; do
  rsync -a "data/$d/" "data_artifacts/$d/"
done
```
