# Pipeline Waivers

Use this folder for explicit, auditable validation waivers consumed by:

- `scripts/training-data/validation/validate_manifest.py --waiver-file ...`
- `scripts/training-data/batch/sub-batch-pipeline <manifest> --validate --waiver-file ...`

Default auto-detect path in orchestrator mode:

- `docs/pipeline/waivers/<subbatch>.json` (for example `docs/pipeline/waivers/CANARY.1.json`)

Schema:

- `scripts/training-data/schemas/waiver.schema.json`

Minimal shape:

```json
{
  "waivers": [
    {
      "video_id": "6ImEzB6NhiI",
      "check": "transcript_artifact",
      "note": "Known ASR noise in intro, accepted for this run only",
      "expires_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

Rules:

- `video_id` can be a concrete 11-char id or `"*"` for all videos.
- `check` must match the validator check name you are waiving.
- expired waivers are ignored automatically and reported as expired.
- keep waivers narrowly scoped and time-bounded.
