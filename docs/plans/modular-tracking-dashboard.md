# Modular tracking dashboard — configurable metric tiles

## What changes, in plain language

Today the four boxes at the top of `/dashboard/tracking` (Total Approaches,
Numbers, Week Streak, Sessions) are welded into the page. They are the same four
for everybody, forever, and they only know about daygame.

After this, that row is a **layout the user owns**. A gear button opens a manage
dialog: reorder by dragging, remove a tile, add a tile (2–8 of them). "Add"
opens a browser of everything the app can currently count, organised by life
area — Dating & Daygame, Health & Appearance, Career & Finances, Personal
Growth, Vices — with search.

The part that matters more than the boxes: **every goal the user has resolves to
at least one thing that can track it.**

- A goal built from a template already carries a `linked_metric` (e.g. "10
  approaches per week" → `approaches_weekly`). The picker shows that metric
  first, badged *Tracks your goal*.
- A goal the user typed themselves has no backend anywhere in the app. So the
  goal becomes its own data source: every goal exposes five tile views off its
  own logged value — **this period**, **streak**, **% of target**, **lifetime
  total**, **best streak**. "Deep work 4h daily" therefore gets a daily tile and
  an accumulated tile with no new table, which is exactly the daily-vs-
  accumulated split asked for.

This is enforced, not hoped for: a unit test walks every goal shape and fails if
any of them resolves to an empty list of trackers.

Nothing moves on first load. A user who has never opened the dialog sees the
same four boxes in the same order — that is just the default layout.

### Why a table and not a column

The choice was "future-proof and real, not prototype". So the layout lives in a
`dashboard_widgets` table keyed by `(user_id, dashboard_key, position)` with a
`widget_type` and a `config` blob — not a `tile_ids TEXT[]` column on
`user_tracking_stats`. The four boxes are the first widget type on the first
dashboard; making the rest of the tracking page modular later (and then the
goals page, and the home page) is rows in this table, not another migration.

The catalogue of *what can be tracked* stays in code (`metricCatalog.ts`),
typed and versioned with the resolver that reads it. Only the user's **choices**
are data.

### Security

`dashboard_widgets` gets own-row CRUD RLS (`auth.uid() = user_id` on SELECT /
INSERT / UPDATE / DELETE) — approved, because a row here is a preference the
user types in by hand, not a value earned or computed from their activity. Blast
radius of a bug is a user rearranging their own dashboard. No cross-user read
path exists: every policy is equality against `auth.uid()`.

One thing to be aware of: goal-derived tile ids embed a goal UUID
(`goal:<uuid>:period`). The resolver must re-check goal ownership server-side
rather than trusting the id in the row — otherwise a hand-edited layout row
would be a read primitive for another user's goal titles. That check is in
`metricsService.resolveMetrics` and has a test.

### What this does *not* do

No new logging surfaces. A metric appears in the picker only if something in the
app already produces it. Deep work gets goal-derived tiles, not a deep-work
timer — wiring the timetrack slice (currently localStorage-only, `/test`-level)
into real metrics is its own piece of work and is out of scope here.

Tiles never invent a zero. A metric whose source has no data yet renders "—" and
"No data yet", not `0`.

## Status — built and applied, 2026-08-26

All four milestones are in. The migration is applied to the linked project
(`dashboard_widgets`, own-row CRUD RLS verified in the remote schema dump), and
the flow was walked in the browser: add, drag-reorder, remove to the floor,
cancel, reload.

Two things changed shape during the build, both because the first version was
wrong in front of real data:

- **The picker is grouped by area and collapsed.** The first cut listed every
  goal's five readings flat: a real account here has 82 goals, which rendered
  410 rows before the first catalogue metric. Goals now sit inside their life
  area, one row each, with the other four readings behind an expander, and areas
  collapse with a count (`24 goals · 22 metrics`).
- **Readings now depend on the goal's shape.** The first cut gave all five to
  every goal, which produced nonsense in a real account: "Get a girlfriend (best
  streak) — the longest run of weeks you have hit this goal" for a one-off
  outcome. A milestone now offers progress and % of target only — no streak, and
  no separate total, because `current_value` is already the running figure and
  adding period history would double-count it.
- **Container goals are not offered.** L1/L2 outcomes ("Get a girlfriend",
  "Approach Legend") sit above the goals you log against; nothing writes their
  `current_value`, so a tile on one reads 0 forever. The picker now uses the same
  line the app already draws in `goalsService.isDailyActionable` — L3 and
  standalone goals — and says why the others are absent.
- **Tile labels are unambiguous.** Five catalogue pairs rendered identically
  ("Sessions" showing 2 next to "Sessions" showing 1,700). A test now fails on
  any two metrics sharing a tile label.
- **"Accumulated" no longer reports "no data" when a goal has no history.** Zero
  completed periods is not missing data — it means the goal has only had one
  period, and its lifetime total is what it has logged so far. The tile also
  carries the view in its label (`Deep work (total)`), because two tiles from one
  goal were otherwise indistinguishable.

## Load time — measured, 2026-08-27

The tiles were fetched client-side after hydration, so the dashboard showed a
skeleton for **2.7s** on every visit. Three separate costs, all now removed:

| | before | after |
|---|---|---|
| `/api/tracking/dashboard` | 795–1295ms | 403–467ms |
| tracking page, tiles painted | 2676ms | 561ms |
| `plan?step=today`, total | 2140ms | 1368ms, no client fetch |

1. **Sources ran one after another.** Each metric source is a round-trip to
   Postgres, and `resolveMetricValues` awaited them in sequence. They now run in
   one `Promise.all`, so the slowest source sets the floor instead of the sum.
2. **`repairWeeklyCounters` ran on every read** — two COUNT queries to fix
   *weekly* counters, paid even by the default layout, which is entirely
   lifetime totals and streaks. It now runs only when a weekly metric is asked
   for.
3. **The tiles were client-fetched.** `app/dashboard/tracking/page.tsx` is a
   server component, so it resolves the layout there and hands it to
   `StatTileGrid` as its opening state. The page also no longer hides behind
   `DashboardSkeleton` as a whole: header, season band and tiles render at once,
   and only the cards below wait on the five tracking fetches.

For the **Today** step the fix is different, because that flow reads its plan
from localStorage — no amount of server work can put its rows in the first HTML.
Its `/api/goals` call could not even *start* until the page's JS had mounted. The
page now starts that query at request time and hands the **promise** to the
flow, unawaited: awaiting it cost ~440ms of TTFB for nothing, while streaming it
keeps TTFB at ~325ms (identical to a step that needs no goals) and the goals
land while the browser is still reading localStorage.

Still outstanding on Today: the flow statically imports all twenty tab
components, so `?step=today` downloads **10.6MB decoded JS across 41 files** in
dev to render one tab. Splitting those behind `next/dynamic` is the next win and
was left out of this pass — it is a structural change to a file another agent
has uncommitted work in.

Note for anyone re-measuring: the duplicate `/api/goals` and
`/api/tracking/review/daily` calls visible in devtools are React StrictMode
double-invoking effects in development. They do not happen in production.

## Milestones

**M1 — the row is data.** `dashboard_widgets` table + repo + `GET/PUT
/api/tracking/dashboard`. Default layout = today's four tiles. Page renders from
the table.
*Acceptance:* `tests/unit/tracking/dashboardService.test.ts`; existing e2e
`tracking-dashboard.spec.ts` still passes unchanged (legacy testids preserved).

**M2 — one resolver for tiles and goals.** `metricsRepo.resolveLinkedMetrics`
extracted out of `syncLinkedGoals`; both call it. Tile values and goal progress
can no longer disagree.
*Acceptance:* `tests/unit/tracking/metricsService.test.ts` +
`tests/integration/db/*` still green; a test asserts the two paths return the
same number for the same metric.

**M3 — user can change a tile.** Manage dialog (dnd-kit sortable, add/remove,
2–8) + metric picker grouped by life area with search.
*Acceptance:* e2e `tests/e2e/tracking-tiles.spec.ts` — swap a tile, reload, it
persists; remove down to 2; add up to 8 and the 9th is refused.

**M4 — goals are trackable.** Goal-derived metric ids, the *Tracks your goal*
section at the top of the picker, ownership check.
*Acceptance:* `metricsForGoal()` returns ≥1 for every goal shape (table-driven
test over template goals, linked goals and free-text goals).

## Execution notes

### Files

| File | Role |
|---|---|
| `supabase/migrations/20260826_create_dashboard_widgets.sql` | table, indexes, RLS |
| `src/db/dashboardRepo.ts` | `getWidgets`, `replaceWidgets` |
| `src/db/metricsRepo.ts` | `resolveLinkedMetrics(userId, metrics, tz)` — the single fetch path, extracted from `goalRepo.syncLinkedGoals` |
| `src/tracking/types.ts` | `MetricDef`, `MetricValue`, `DashboardWidget`, windows/formats (slice rule: types only here) |
| `src/tracking/data/metricCatalog.ts` | the catalogue — one entry per `LINKED_METRICS` value plus stats-derived tile-only metrics |
| `src/tracking/metricsService.ts` | id parse/build, catalogue lookup, `resolveMetrics`, `metricsForGoal` |
| `src/tracking/dashboardService.ts` | default layout, validation (2–8), ordering |
| `app/api/tracking/dashboard/route.ts` | GET layout+values, PUT layout (<50 lines) |
| `src/tracking/components/dashboard/StatTileGrid.tsx` | replaces `QuickStatsGrid` |
| `src/tracking/components/dashboard/StatTile.tsx` | one box |
| `src/tracking/components/dashboard/DashboardTilesDialog.tsx` | manage/reorder |
| `src/tracking/components/dashboard/MetricPickerDialog.tsx` | browse by area |

`QuickStatsGrid.tsx` is deleted: its whole purpose — render the four stat boxes —
is taken over by `StatTileGrid`, and its four testids move with it.

### Ordering

M1 → M2 before any UI. M3 and M4 both depend on M2's resolver.

### Migration

`supabase migration list --linked` was clean at time of writing (remote in sync
through `20260818`), so `supabase db push --linked` applies only this one.
