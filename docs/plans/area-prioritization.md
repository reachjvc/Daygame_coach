# Area prioritization — one ranking, two tiers

## Context

He recommends working **1-3 areas at a time** and explicitly accepts the rest sliding — *"one or two or three core areas that I'm really focusing on at a time"* (`Kz83kMosOWU`), and dropping an area 7/10 → 5/10 on purpose during a push. The product tolerates this but doesn't express it: the wheel rewards evenness and there is no *order* among areas, only a flat set of ≤3.

**The problem is sprawl, not absence.** Five priority-ish fields already exist:

| field | level | meaning |
|---|---|---|
| `priorityIds` | goals | goal phase-in order — genuinely distinct, **keep** |
| `areaOrder` | pillars | drag order of the 5 pillars — legacy axis, **leave alone** |
| `deselectedAreas` | pillars | pillars hidden — legacy axis, **leave alone** |
| `focusAreaIds` | areas | the ≤3 "domino" set |
| `areaScope` | areas | deep / sketched / later (added v17) |

The last two are the same idea at the same level: "how much does this area matter right now". Adding a ranking beside them would make three.

## The model

**`areaRank: string[]`** — every area id in the user's priority order for this season. One source of truth.

Two tiers derive from it, no extra state:
- **Focus** — the top N (N = 1-3). Goals expected, schedule priority, review attention.
- **Maintenance** — everything below. No goals demanded; a floor instead (`areaPlans[id].maintenance`, which already exists). Not "parked", not "later" — consented drift with a contract.

`areaScope` is **deleted** (mine, one release old, never shipped). `focusAreaIds` stays as a maintained projection — `areaRank.slice(0, n)` — because 32 call sites read it and the invariant is cheap to enforce in one setter and one load-time reconcile. Rank is authoritative; the projection is never written by hand.

## Build

**Service** (`visionPlanService.ts`, pure + tested):
- `deriveAreaRank(state)` — migration: existing `focusAreaIds` first (order preserved), then old `areaScope` deep → sketched, then remaining canonical areas. Idempotent.
- `setAreaPriority(rank, focusCount)` → `{ areaRank, focusAreaIds }` — the ONLY writer of both. Fail-closed on unknown ids, focusCount outside 1-3, duplicates.
- `areaTier(areaRank, focusCount, areaId)` → `"focus" | "maintenance"`.
- `nextLevelTarget(rating)` → rating + 1 capped at 10 — the **+1 rule**: *"how can I bring myself to a three next week"* (`Kz83kMosOWU`), never "get to 10".

**Schema**: `areaRank?: string[]` (max 24, ids unique). Keep `focusAreaIds` (≤3) for back-compat.

**UI** (`VisionPlanLab.tsx`): replace `ScopePicker` with **`SeasonPriority`** — the ordered list, move up/down, a focus/maintenance divider you can drag the line of, maintenance floors inline for the tier below. Copy states the doctrine plainly instead of implying balance. Wheel reads tiers from rank: focus areas ringed, maintenance dimmed but never dashed-out.

**Weak-area nudge**: where a focus area sits below 7, offer `nextLevelTarget` — "bring it to 5 next week", not "get to 10".

## Acceptance

- Rank 12 areas, set focus = 2 → top 2 are focus, other 10 maintenance, wheel matches, survives reload.
- An old sandbox with `focusAreaIds` + `areaScope` migrates to a sensible rank with no data loss.
- `focusAreaIds` always equals the top N of `areaRank` — asserted by test.
- `npm test` green; `scripts/vision-plan-flow-audit.mjs` green.

---

## SHIPPED 2026-07-29

**Service** (`visionPlanService.ts`): `MAX_FOCUS_AREAS = 3`, `AreaTier`, `areaTier()`, `setAreaPriority()` (the only writer of rank + its focus projection; fail-closed on duplicates / unknown ids / focusCount outside 1-3), `deriveAreaRank()` (migration, idempotent), `nextLevelTarget()` (+1 rule, null at 10).

**Schema**: `areaRank` (≤24, optional). `areaScope` retained in the schema **read-only for migration** and never written again.

**UI**: `ScopePicker` → `SeasonPriority` — ordered list, ↑/↓ reorder, a 1/2/3 focus-count selector, a "maintenance — a floor, not a goal" divider, inline floor inputs for the tier below, and `rating → rating+1` shown on focus areas below 7.

**Consolidation achieved**: 5 priority notions → 4. `areaScope` deleted; `focusAreaIds` kept as a maintained projection of `areaRank` (32 read sites untouched), invariant asserted by test.

### Two things the build surfaced
1. **A fresh plan has no ranking, so every area rendered as "on a maintenance floor"** — presuming a choice the user hadn't made. Added an explicit `"unset"` room scope: before any priority is set, nothing looks parked. Caught by the flow audit, not by me.
2. **`WeeklyReviewForm` said "push each area toward 8-9-10"** — the exact evenness framing this change exists to remove. Rewritten to "aim for one level up in the areas you're working; the rest hold their floor". Maintenance wedges are now dimmed rather than dashed, because dashed reads as excluded.

Verified: **1867 unit tests** (10 new), **flow audit 31/31** (2 new v19 checks), typecheck clean, and walked in the browser — an old `focusAreaIds` + `areaScope` sandbox migrates to ranks 1-2 = focus, `deep` → 3, `sketched` → 4, `later` → 5, rest canonical, with the Health maintenance floor preserved; reorder and focus-count changes keep the projection invariant and survive reload.
