# Single Command Pipeline Runner

Use one command to execute and track a sub-batch campaign:

```bash
./scripts/training-data/batch/run-campaign
```

Defaults:
- start: `P001.4`
- end: `P003.10`
- parallel: `3`
- max iterations: `20`

Artifacts (auto-updated, stable per range):
- JSON state: `data/validation/campaigns/<campaign-id>.json`
- Human plan: `docs/plans/<campaign-id>.md`

Behavior:
- Re-running the same range resumes and updates the same state/plan files.
- A per-campaign lock prevents accidental concurrent runs for the same range.
- Non-zero sub-batch exits are recorded as `blocking_failure=true` with captured failure signature and failed video IDs when available.

Useful examples:

```bash
# Restrict to one sub-batch
./scripts/training-data/batch/run-campaign --start P001.5 --end P001.5

# Resume work pattern (same range, one sweep)
./scripts/training-data/batch/run-campaign --start P001.4 --end P003.10 --max-iterations 1

# Force rerun from a specific stage for all targeted sub-batches
./scripts/training-data/batch/run-campaign --from-stage 07b

# Reset state for a range and start fresh
./scripts/training-data/batch/run-campaign --start P001.4 --end P003.10 --reset
```
