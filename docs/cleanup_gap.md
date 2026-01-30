# Cleanup Gaps
**Updated:** 29-01-2026 21:28

## Deferred (Do When Touching)

| Item | File | Issue |
|------|------|-------|
| Generator refactor | `src/scenarios/openers/generator.ts` | 4501 lines - extract activity data (~2300 lines) to `data/activities.ts` |
| Zod/TS enum sync | `src/tracking/schemas.ts` + `trackingTypes.ts` | `ApproachOutcome`, `SetType` defined twice |

## Doc Consolidation (Optional)

| Keep | Archive |
|------|---------|
| `docs/slices/SLICE_TRACKING.md` | `docs/brainstorm/PROGRESS_TRACKING_*.md` (2 files) |

## Placeholder Prompts (Feature Work)

`src/scenarios/shared/prompts.ts` and `archetypes.ts` have `⚠️ TODO` markers for missing examples/criteria.

## Deprecated Folder

Delete after 7 days:
- `deprecated/2026-01-28/*` → 2026-02-04
- `deprecated/2026-01-29/*` → 2026-02-05
