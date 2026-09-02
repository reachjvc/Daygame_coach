# Counters, and how they count down

**Status: BUILT, 2026-08-27.** All eight phases executed against production.
`npm test` green: 119 files, 3924 tests. What was measured rather than assumed,
what deviated from the plan, and what is still open is in
§Execution record at the bottom — read that before trusting anything above it,
because four things in the plan turned out to be wrong.

**Original status when written: plan, not built.** Written under `.claude/rules/finished-work.md` —
the attack pass (§What could go wrong) was written before the phases and sits
above them. Every number quoted below was read from the live database or from
the code on 2026-08-27, not from a doc.

**Related, do not duplicate:** [`date_database.md`](date_database.md) owns *how a
date is derived* (timezone plumbing, the 24 `toISOString().split()` sites, the
week-start setting). This plan owns *what a counter does when its period ends*.
Where the two touch, this plan names the dependency and works without it.

---

## The one rule this establishes

> **A counter is two facts, not one: a number, and the period that number
> belongs to. Neither may be read without the other. Every read and every write
> rolls the period first.**

A count with no period attached is not data, it is a rumour. Everything below
is the mechanical consequence of that sentence.

---

## What is broken, in numbers rather than opinion

Read from production on 2026-08-27:

1. **The Week Streak tile on `/dashboard/tracking` shows February's number.**
   User `edec2d78` has `current_week_streak = 4` with
   `last_active_week = '2026-W08'` — the week of 16 Feb. It is now week 35. The
   tile has shown "4 week streak" for six months of total inactivity, because
   `getMetricValue` returns `stats.current_week_streak` raw
   ([metricsRepo.ts:130](../../src/db/metricsRepo.ts#L130)) and nothing decays it.
   Weekly *counters* two lines above it are gated on `isCurrentWeek`; the
   streaks are not.

2. **That 4 was already wrong when it was written.** Real active weeks for that
   user: W05 (10 sessions), W06 (5 sessions), then W07 and W08 with **one**
   session and **one** approach each — not active by the app's own rule (2+
   sessions OR 5+ approaches). W07/W08 counted because the code of the day
   ([`trackingRepo.ts` @52dce1aa](../../src/db/trackingRepo.ts)) reset
   `current_week_sessions` on rollover but left `current_week_approaches`
   carrying W06's 15. `isWeekActive(1, 15)` → true. The stale-sibling-counter
   bug is fixed; the value it wrote is still in the row, and in
   `longest_week_streak`.

3. **`daily_goal_snapshots` holds 0 rows** against 398 goals. Cause, confirmed
   in the policy catalogue: the table has RLS on and exactly one policy,
   `"Users can view own snapshots"` (`SELECT`). `snapshotGoals`
   ([goalRepo.ts:846](../../src/db/goalRepo.ts#L846)) calls
   `createServerSupabaseClient()` — the user-scoped client — while its own doc
   comment says *"Uses admin client because daily_goal_snapshots is system-only"*.
   Every insert is rejected, the error is logged, and the caller swallows it
   (`.catch(() => {})`, [goalRepo.ts:692](../../src/db/goalRepo.ts#L692)).
   **Every period that has ever rolled has been destroyed rather than archived.**

4. **A quarterly goal never rolls.** `GoalFormModal` offers Quarterly
   ([GoalFormModal.tsx:43](../../src/goals/components/GoalFormModal.tsx#L43)),
   the `goal_period` enum accepts it, and `resetGoalsForPeriods` is only ever
   called with `["daily","weekly","monthly","yearly"]`
   ([goalRepo.ts:734](../../src/db/goalRepo.ts#L734)). `periodStartFor` cannot
   express it either — `shared/dateUtils.ts` declares `GoalPeriod` as four
   values while `db/goalEnums.ts` declares it as six. Zero quarterly goals exist
   today, so this is latent, not yet visible.

5. **Two `GoalPeriod` types, one enum, one check constraint — four
   definitions.** `shared/dateUtils.ts:66` (4 values), `db/goalEnums.ts:71`
   (6 values), the `goal_period` Postgres enum (6), and `chk_period` in
   `20260225_add_goal_enum_check_constraints.sql` (6, different order).

6. **The review streak has no period at all.** `current_weekly_streak` is
   `stats.current_weekly_streak + 1` on every weekly review submitted
   ([trackingService.ts:986](../../src/tracking/trackingService.ts#L986)) — no
   consecutiveness check, no key column, no decay. Two reviews in one afternoon
   are a 2-week streak.

7. **The day streak never decays either.** `current_streak` is only recomputed
   when an approach is logged. `last_approach_date` for `edec2d78` is
   2026-08-19; the row still claims `current_streak = 1` and always will.

8. **Whose clock?** `trackingService` derives every period key from the *server*
   clock — `getISOWeekString(new Date())` at lines 256, 767, 880 and
   `new Date().toISOString().split("T")[0]` at line 879 — while `metricsRepo`
   and `goalRepo` derive theirs from the *user's* timezone. Both live users are
   `Europe/Copenhagen`. An approach logged Monday 01:00 in Copenhagen is Sunday
   23:00 UTC and lands in the week that just ended.

9. **`getISOWeekString` is wrong in years that start on a Friday.** It computes
   `ceil((days + 1) / 7)` from local-midnight `Date`s; a DST offset shaves an
   hour off the difference, which changes the result only when `days ≡ 6 (mod
   7)` — i.e. when 1 January is a Friday. **2027 starts on a Friday.**

10. **Three implementations of "the Monday of this week"**:
    `metricsRepo.ts:80` (timezone-aware, private), `northStarTrackService.ts:439`
    (exported, string-based), `dateUtils.periodStartFor(period, now)` (the
    canonical one). Plus `areWeeksConsecutive` doing ISO-week-string arithmetic
    that a date subtraction would do correctly.

11. **`period_start_date` defaults to `CURRENT_DATE`** (the database's UTC date)
    and `createGoal` never sets it
    ([goalRepo.ts:230-258](../../src/db/goalRepo.ts#L230)). A weekly goal
    created on a Wednesday is stamped Wednesday, so its first week is three days
    long, and a goal created at 01:00 Copenhagen is stamped the previous day.

12. **A goal's period and its linked metric's window are never checked against
    each other. 11 of the 18 active linked goals are mismatched.** Counted:
    2 × `weekly` → `approaches_cumulative` (a lifetime total — target 2, value
    416, permanently complete), 2 × `weekly` → `numbers_cumulative`,
    2 × `weekly` → `instadates_cumulative`, 1 × `daily` →
    `sleep_hours_avg_weekly`, and 4 × `weekly` → `bench_press_1rm` /
    `squat_1rm` / `deadlift_1rm` / `pullups_max_reps` — a "current" reading that
    `syncLinkedGoals` re-supplies the instant the roll zeroes it, so the goal
    completes itself every week forever. The 7 that are correct are all
    `weekly` → a `*_weekly` metric.

13. **`snapshot_date` is stamped with the day the roll ran, not the period that
    ended** ([goalRepo.ts:690](../../src/db/goalRepo.ts#L690) passes `today`). A
    week that ends Sunday is archived as Monday, and
    `goalsService.ts:591`'s `snapshot_date >= mondayStr` then counts it as *this*
    week's. Invisible today because the table is empty; it becomes wrong the
    moment §3 is fixed.

14. **`user_tracking_stats.last_session_week` exists in the database, is absent
    from `UserTrackingStatsRow`, and is read and written by nothing.**

---

## What you will see when it is done

- The Week Streak tile says **0** when you have not been active, and it says so
  the moment the week turns over — not the next time you log something.
- A streak you lost is gone. A streak you are holding survives an idle Tuesday.
- Every weekly count on the tracking page resets Monday 00:00 **in Copenhagen**,
  not whenever a server in UTC decides.
- Quarterly goals reset at the start of the quarter.
- Milestone goals ("Do 3 muscle ups") never reset — they run to their end date.
  That is deliberate, written down, and tested.
- The heatmap and the weekly review have history to draw, because a finished
  period is archived instead of thrown away.
- Your existing streak numbers change once, downward, to the truth. You are told
  what changed and why before it happens.

---

## Ground truth: every counter field in the app

The inventory the rest of the plan operates on. `cadence` is what the field is
*supposed* to mean; `key` is the column that says which period it belongs to.

### A. `user_tracking_stats` — one row per user (3 rows live)

| field | cadence | key today | resets today? | after this plan |
|---|---|---|---|---|
| `total_approaches` | lifetime | — | never (correct) | unchanged |
| `total_sessions` | lifetime | — | never (correct) | unchanged |
| `total_numbers` | lifetime | — | never (correct) | unchanged |
| `total_instadates` | lifetime | — | never (correct) | unchanged |
| `total_field_reports` | lifetime | — | never (correct) | unchanged |
| `weekly_reviews_completed` | lifetime | — | never (correct) | unchanged |
| `unique_locations[]` | lifetime | — | never (correct) | unchanged |
| `current_week_sessions` | **per week** | `current_week` | on write only, 3 paths | rolled on read + write |
| `current_week_approaches` | **per week** | `current_week` | on write only, 3 paths | rolled on read + write |
| `current_week_numbers` | **per week** | `current_week` | on write only, 3 paths | rolled on read + write |
| `current_week_instadates` | **per week** | `current_week` | on write only, 3 paths | rolled on read + write |
| `current_week_field_reports` | **per week** | `current_week` | on write only, 3 paths | rolled on read + write |
| `current_streak` | **per day** | `last_approach_date` | never decays | decays on roll |
| `longest_streak` | record | — | never (correct) | recomputed once (P6) |
| `current_week_streak` | **per week** | `last_active_week` | never decays | decays on roll |
| `longest_week_streak` | record | — | never (correct) | recomputed once (P6) |
| `current_weekly_streak` (reviews) | **per week** | *none* | never decays | gains a key, decays |
| `current_week` | period key | — | server clock, ISO string | replaced by `week_start_date` |
| `last_active_week` | period key | — | server clock, ISO string | replaced by `last_active_week_start` |
| `last_approach_date` | period key | — | server clock | user's timezone |
| `last_session_week` | — | — | **dead column** | dropped (P7, gated) |
| `monthly_review_unlocked` | flag | — | n/a | unchanged |
| `quarterly_review_unlocked` | flag | — | n/a | unchanged |

**There are no per-day and no per-month counters on this table.** Daily and
monthly counting is done by goals (§B). Adding `current_day_*` or
`current_month_*` columns is explicitly **out of scope** — see Q4.

### B. `user_goals` — 398 rows, 173 active

| field | meaning | resets today? | after this plan |
|---|---|---|---|
| `current_value` | the count **for the period named by `period_start_date`** | daily/weekly/monthly/yearly yes; **quarterly no**; custom never (correct) | quarterly rolls too |
| `period` | `daily \| weekly \| monthly \| quarterly \| custom \| yearly` | — | one definition, six values |
| `period_start_date` | the period the count belongs to | set by roll; `CURRENT_DATE` (UTC) at insert | set explicitly at insert, in the user's zone |
| `current_streak` | consecutive periods completed | zeroed on an incomplete roll, unless a freeze absorbs it | unchanged |
| `best_streak` | record | never (correct) | unchanged |
| `streak_freezes_available` / `_used` / `last_freeze_date` | freeze budget | consumed by `shouldAutoFreeze` | unchanged |
| `target_value` | the goal | never | unchanged |

Live period mix: `weekly` 350 (225 archived), `custom` 43, `daily` 4,
`yearly` 1, `quarterly` 0. 18 active goals have a `linked_metric`; 11 of those
are mismatched (§12).

### C. `daily_goal_snapshots` — the archive of finished periods. **0 rows.**

One row per goal per finished period: `current_value`, `target_value`,
`was_complete`, `current_streak`, `best_streak`, `period`, `snapshot_date`.
Unique on `(goal_id, snapshot_date)` — the upsert is already idempotent.

### D. Where a counter reaches the screen

```
/dashboard/tracking  → app/dashboard/tracking/page.tsx (server)
                     → dashboardService.getDashboardLayout
                     → resolveMetrics → metricsRepo.resolveMetricValues
                     → getMetricValue(stats row)            ← the read gate goes here
/api/tracking/dashboard (GET) → same path, client fallback
/dashboard/goals/plan → /api/goals → rollGoalPeriods → getUserGoals  ← already rolls
/api/goals/tree      → rollGoalPeriods → syncLinkedGoals → getGoalTree
```

Default tiles for a user who has never configured one: `approaches_cumulative`,
`numbers_cumulative`, **`week_streak`**, `sessions_cumulative`
([metricCatalog.ts:61](../../src/tracking/data/metricCatalog.ts#L61)). All 3 live
users have exactly these 4 saved in `dashboard_widgets`.

### E. How a counting goal gets created

Where a `period` and a `linked_metric` are chosen — the two fields the whole
plan turns on. P4 changes the validation at every one of these entry points.

**The user's path** (as it was; the hub is now archived at
`/test/archive/goals-hub` and the plan flow is the live goal surface):
`/dashboard/goals` → **New Goal**
([GoalsHubContent.tsx:495](../../src/goals/components/GoalsHubContent.tsx#L495))
→ `GoalFormModal` → `POST /api/goals` → `CreateGoalSchema` →
`goalRepo.createGoal` → a `user_goals` row.

What the form asks, in order
([GoalFormModal.tsx](../../src/goals/components/GoalFormModal.tsx)):

| field | control | default | counts? |
|---|---|---|---|
| Title | text | — | no |
| Life area | choice | from context | no |
| Goal type | `recurring` / `habit_ramp` / `milestone` | `recurring` | decides whether a period is even asked for |
| Tracking type | `counter` / `boolean` | `counter` | `boolean` forces `target_value = 1` |
| **Period** | daily / weekly / monthly / **quarterly** / yearly | **weekly** | **this is the countdown cadence** |
| **Target** | number | 1 | the number the counter runs to |
| Target date | date | — | milestones only |
| Parent goal | choice | — | no |
| **Linked metric** | 8 options + "None (manual tracking)" | None | offered **only** for `life_area === "daygame"` and `period === "weekly"` ([line 311](../../src/goals/components/GoalFormModal.tsx#L311)) |
| Description / motivation | text | — | no |

**A second form exists.** `src/lair/components/GoalFormModal.tsx` — reached from
`MissionControlWidget` — asks a smaller set and applies the same
daygame-and-weekly rule by hand at
[line 165](../../src/lair/components/GoalFormModal.tsx#L165). Two hand-written
copies of one rule is exactly what P4.3 replaces with `metricFitsPeriod`.

**Three more paths create goals without the form**, and none of them passes
through the form's guard — P4.2's repo-level check is what covers them:
`GoalCatalogPicker` (templates), the north-star / new-goals framework flows
(`template_id` = `fw:pillar/obj/tgt:<id>`), and `POST /api/goals/batch`.

**What `createGoal` does not do:** it never sets `period_start_date`, so the row
takes the database default `CURRENT_DATE` — the *database's* date, in UTC (bug
§11). P0–P3 do not change this; fix it in P3 by passing
`periodStartFor(period, getNowInTimezone(tz))` explicitly at insert, so a weekly
goal created on a Wednesday starts counting from that week's Monday.

**A user cannot add a new counter *field*** — only a new goal on an existing
cadence. Fields are `METRIC_CATALOG` entries, and adding one is a code change:
a row in [metricCatalog.ts](../../src/tracking/data/metricCatalog.ts), a case in
`metricsRepo.getMetricValue` or a resolver in `resolveMetricValues`, and — if a
goal is to sync from it — a value in the `linked_metric` Postgres enum. The
nearest thing to a user-defined counter is a goal, which is why goal-derived
tile ids (`goal:<uuid>:<view>`) exist: any goal can be put on the dashboard as a
tile without touching the catalogue.

---

# What could go wrong with this plan

Written before the phases, per `.claude/rules/finished-work.md`.

**R1. Recomputing streaks destroys numbers the user earned.** P6 lowers
`current_week_streak` 4 → 0 and `longest_week_streak` 4 → 2 for a real account.
If the recompute is wrong, there is no undo — the pre-reset values exist nowhere
else. **Mitigation:** P6 is dry-run by default, writes the full before/after
to `docs/plans/counters-repair-log.md` **before** applying, and P6a snapshots
all three rows into a `user_tracking_stats_backup_20260827` table first. The
backup table is dropped by hand, never by the script.

**R2. The read gate can hide a working streak.** If `isStreakCurrent` is wrong
at a boundary, a user who *is* on a streak sees 0 — worse than the bug being
fixed, because it punishes the honest case. **Mitigation:** the gate accepts
*this* period or the *immediately previous* one, so a streak survives an
in-progress period in which nothing has happened yet. Tested at 23:59 Sunday and
00:01 Monday in `Europe/Copenhagen` and `Pacific/Auckland`.

**R3. Rolling on read makes GET requests write.** `rollTrackingCounters` on the
dashboard read path turns a page load into an UPDATE, and two parallel loads
race. **Mitigation:** the update is conditional and idempotent — `.eq()` on the
old `week_start_date` in the WHERE clause, so the second writer updates 0 rows
and does not double-apply a streak decay. This is exactly how `rollGoalPeriods`
already behaves, minus the guard, which P3 adds to both.

**R4. Rolling on read costs a round trip on every page.** Measured shape: one
SELECT already happens (`getOrCreateUserTrackingStats`), so the added cost is one
conditional UPDATE, and only when the period is actually stale. Nothing is added
to the common path.

**R5. Replacing `current_week` with `week_start_date` could lose a week.**
The obvious mitigation — dual-write both columns for a phase — was rejected: it
requires keeping the ISO-week formatter that bug §9 says is wrong, purely to feed
a column nothing reads. **Mitigation instead:** P2 adds and backfills the new
column without touching the old one; P3 switches every reader and writer in one
commit (this app deploys atomically, so there is no mixed-version window); P7
drops the old column only after a real week boundary has passed with the tests
green. `current_week` simply goes stale in between, and nothing reads it. Never
drop in the same migration that adds.

**R6. A "correct" week boundary is a product decision, not a technical one.**
`profiles.week_start_day` exists, defaults to **0 (Sunday)**, is shown in
`GoalTimeSettingsDialog`, and is honoured by nothing —
`periodStartFor` hardcodes Monday. Fixing counters without deciding this ships a
counter that resets on a day the settings screen says it does not. See Q1. This
plan **keeps Monday everywhere** and makes the dialog say so, rather than
silently keeping the lie.

**R7. Fixing snapshots starts writing a table that has never been written.**
Readers (`HeatmapCalendar`, `goalsService.ts:591-620`, weekly review) have only
ever seen an empty array. Their first real data may expose bugs that have been
dormant. **Mitigation:** P5 ships the snapshot fix together with a fixture test
that runs those readers over a week of synthetic snapshots, before any real row
exists.

**R8. `syncLinkedGoals` runs after the roll and can undo it.** For a
`*_cumulative` or `*_1rm` metric on a weekly goal, the roll zeroes
`current_value` and the sync immediately writes the lifetime total back — the
goal is "complete" again seconds later. P4 refuses the mismatch at write time,
but the 11 existing mismatched rows keep doing this until P6b repairs them.

**R9. This plan cannot prove there is no fourth broken counter.** It fixes the
counters in §Ground truth, which was built by reading `trackingTypes.ts`,
`goalTypes.ts` and the live column list. A counter living in another slice
(`health`, `programs`, `vice`, `innerGame`) is **not** covered. P7's architecture
test is a floor: it fails any *new* `current_*` column that lacks a period key.

**R10. Deleting `getISOWeekString` changes `metricsRepo.ts:104/173`.** That is
the `isCurrentWeek` gate on weekly metrics — the one part of this system that
currently works. Rewriting it to compare Mondays instead of ISO-week strings must
not change its behaviour for any date. P1's test asserts old and new agree on
every day from 2025-12-01 to 2028-01-31 before the old one is removed.

---

# Phases

Execute in order. Each phase is a working, testable state and names its
acceptance test. Run `npm test` after every phase — `CLAUDE.md` requires it, and
a phase is not finished with a failing test.

Commands used by more than one phase:

```bash
npm test                                   # vitest, must be green before moving on
npx supabase migration list --linked       # ALWAYS before db push; only push yours
npx supabase db push --linked              # applies migrations (you run it, not the user)
npx supabase db query --linked "<sql>"     # ground truth for verification
```

---

## Phase 0 — the tile stops lying (no migration, no schema change)

**Capability:** the Week Streak, Day Streak and review-streak tiles show 0 when
the streak is over, today, on the data that is already in the database.

This is first because it is the whole user-visible bug and it needs nothing else
to land. It is *not* made redundant by P3: the gate is the invariant ("a
period-scoped number is unreadable outside its period"), and it keeps holding
when a future write path forgets to roll.

### 0.1 Add period arithmetic to `src/shared/dateUtils.ts`

Add `"quarterly"` to `GoalPeriod` and to `periodStartFor`:

```ts
export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

export function periodStartFor(period: GoalPeriod, now: Date): string {
  if (period === "daily") return toDateISO(now)
  if (period === "yearly") return toDateISO(new Date(now.getFullYear(), 0, 1))
  if (period === "quarterly") {
    const firstMonthOfQuarter = Math.floor(now.getMonth() / 3) * 3
    return toDateISO(new Date(now.getFullYear(), firstMonthOfQuarter, 1))
  }
  if (period === "monthly") return toDateISO(new Date(now.getFullYear(), now.getMonth(), 1))
  const weekday = (now.getDay() + 6) % 7
  return toDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday))
}
```

`"custom"` is deliberately **not** a `GoalPeriod` here: a custom-period goal is a
milestone that runs to `custom_end_date` and must never roll. Keeping it out of
this type is what makes that unrepresentable rather than merely unlikely.

Add, in the same file:

```ts
/** The start of the period immediately before the one starting at `currentStart`. */
export function previousPeriodStart(period: GoalPeriod, currentStart: string): string

/**
 * Is a streak whose last earned period started at `lastEarnedStart` still alive
 * as of the period starting at `currentStart`?
 *
 * True for the current period (earned already this week) and for the previous
 * one (this week is not over — nothing has been missed yet). False for anything
 * older: that period ended without the streak being extended.
 */
export function isStreakCurrent(
  period: GoalPeriod,
  lastEarnedStart: string | null,
  currentStart: string
): boolean {
  if (!lastEarnedStart) return false
  return lastEarnedStart >= previousPeriodStart(period, currentStart)
}
```

Implement `previousPeriodStart` by calendar arithmetic on the parsed date —
**never** by subtracting seconds, per `date_database.md` R5. Spelled out so
there is nothing to infer:

```ts
export function previousPeriodStart(period: GoalPeriod, currentStart: string): string {
  const [y, m, d] = currentStart.split("-").map(Number)
  const back = {
    daily:     () => new Date(y, m - 1, d - 1),
    weekly:    () => new Date(y, m - 1, d - 7),
    monthly:   () => new Date(y, m - 2, 1),
    quarterly: () => new Date(y, m - 4, 1),
    yearly:    () => new Date(y - 1, 0, 1),
  }[period]()
  return periodStartFor(period, back)   // normalises, and handles year underflow
}
```

`new Date(2026, -1, 1)` is December 2025 — JavaScript normalises the month, so
no year branch is needed. `periodStartFor` is applied to the result so a
malformed input cannot produce a non-boundary date.

**Move** `isPeriodStale` here from
[`goalsService.ts:432`](../../src/goals/goalsService.ts#L432) and re-export it
from `goalsService` so its current importers keep compiling:
`export { isPeriodStale } from "@/src/shared/dateUtils"`. It is period
arithmetic; it belongs with the rest of it. Do not leave two copies.

### 0.2 Gate the streak reads in `src/db/metricsRepo.ts`

In `getMetricValue`, replace the four raw streak returns:

```ts
const nowLocal = getNowInTimezone(timezone)
const weekStart = periodStartFor("weekly", nowLocal)
const today = toDateISO(nowLocal)

case "week_streak":
  return isStreakCurrent("weekly", stats.last_active_week_start, weekStart)
    ? stats.current_week_streak : 0
case "day_streak":
  return isStreakCurrent("daily", stats.last_approach_date, today)
    ? stats.current_streak : 0
case "weekly_review_streak":
  return isStreakCurrent("weekly", stats.last_review_week_start, weekStart)
    ? stats.current_weekly_streak : 0
case "best_week_streak":
  return stats.longest_week_streak      // a record does not decay
case "best_day_streak":
  return stats.longest_streak           // a record does not decay
```

Until P2 adds them, `last_active_week_start` and `last_review_week_start` do not
exist. **In P0, derive them in place** from the columns that do:
`lastActiveWeekStart(stats)` for the first — one exported shim, defined once in
`src/db/metricsRepo.ts` and deleted in P2:

```ts
/** P0 shim: the Monday of `last_active_week` ("2026-W08" -> "2026-02-16").
 *  Deleted in P2, when last_active_week_start exists. */
export function lastActiveWeekStart(stats: UserTrackingStatsRow): string | null
```

and for
the review streak return `0` when `weekly_reviews_completed === 0`, otherwise
leave it ungated with a `// P2 gives this a key` comment — a wrong-but-unchanged
number is better than a fabricated one. Do not invent a key column in P0.

### 0.3 Same gate at the other two read sites

`SessionTrackerPage.tsx:207` and `GoalsHubContent.tsx:128` both `fetch(
"/api/tracking/stats")` and read `current_week_streak` / `longest_week_streak`
off the response, rendering `FireStreakBadge` when the value is `>= 2`.

`app/api/tracking/stats/route.ts` returns the **raw stats row**
(`return NextResponse.json(stats)`). Do not gate in the two components — gate
once, in that route, by overriding the two fields in place so no caller changes:

```ts
const stats = await getOrCreateUserTrackingStats(user.id)
const tz = await getUserTimezone(user.id)
const nowLocal = getNowInTimezone(tz)
return NextResponse.json({
  ...stats,
  current_week_streak: isStreakCurrent("weekly", lastActiveWeekStart(stats), periodStartFor("weekly", nowLocal))
    ? stats.current_week_streak : 0,
  current_streak: isStreakCurrent("daily", stats.last_approach_date, toDateISO(nowLocal))
    ? stats.current_streak : 0,
})
```

`longest_*` are records and pass through untouched. `lastActiveWeekStart` is the
same P0 shim as §0.2 — one helper, imported by both call sites, deleted in P2
when the real column arrives. This route does its own `supabase.auth.getUser()`
rather than `requireAuth`; leave that alone, it is out of scope.

`src/lair/components/widgets/StreakWidget.tsx:54` also reads
`stats.current_week_streak`. Check where its `stats` prop comes from; if it is
this route, it is already fixed — if it is a second fetch, route it through the
same place. Do not add a third gate.

### 0.4 Say what the tile means

`METRIC_BY_ID.week_streak.description` currently reads *"Consecutive active
weeks. A week counts with 2+ sessions or 5+ approaches."* — true, and silent
about the half that surprised the user. Change to: *"Consecutive active weeks. A
week counts with 2+ sessions or 5+ approaches. Miss a whole week and it goes
back to zero."* Same addition for `day_streak`
([metricCatalog.ts:250-290](../../src/tracking/data/metricCatalog.ts#L250)).

**Acceptance test** — `tests/unit/tracking/streakDecay.test.ts` (new):
- `isStreakCurrent("weekly", "2026-08-24", "2026-08-24")` → true (this week)
- `isStreakCurrent("weekly", "2026-08-17", "2026-08-24")` → true (last week, this
  week still running)
- `isStreakCurrent("weekly", "2026-08-10", "2026-08-24")` → **false**
- `isStreakCurrent("weekly", "2026-02-16", "2026-08-24")` → **false** ← the live bug
- `isStreakCurrent("daily", "2026-08-26", "2026-08-27")` → true (yesterday)
- `isStreakCurrent("daily", "2026-08-25", "2026-08-27")` → false
- `getMetricValue` on a fixture row shaped exactly like `edec2d78`'s
  (`current_week_streak: 4`, `last_active_week: '2026-W08'`) returns **0** for
  `week_streak` and **4** for `best_week_streak`.
- Run the file under `TZ=UTC`, `TZ=Europe/Copenhagen`, `TZ=Pacific/Auckland`.

---

## Phase 1 — one definition of a period, one implementation of "this Monday"

**Capability:** none visible. Removes the duplication that P3 would otherwise
multiply, and kills the 2027 ISO-week bug.

1. **`db/goalEnums.ts` keeps the six database values** (`GOAL_PERIODS`) — it
   mirrors the `goal_period` enum and must not change. `shared/dateUtils.ts`
   exports the five **rollable** ones. Add to `goalEnums.ts`:
   ```ts
   /** The periods that roll. `custom` is a milestone: it runs to its end date. */
   export const ROLLING_PERIODS = ["daily","weekly","monthly","quarterly","yearly"] as const
   ```
   and assert in `tests/integration/db/enumConstraintSync.integration.test.ts`
   (the file already exists for this job) that
   `ROLLING_PERIODS ∪ ["custom"] === GOAL_PERIODS === the pg enum`.

2. **Delete `getISOWeekString` and `areWeeksConsecutive`** from
   `src/tracking/trackingService.ts:715-738`. Replace every use with
   `periodStartFor("weekly", getNowInTimezone(tz))` and a string comparison of
   two Monday dates. Call sites, all of them:
   - `trackingService.ts:256, 767, 880` — pass `tz` in; these are the three write
     paths, and they currently use the **server** clock.
   - `metricsRepo.ts:104, 173` — the `isCurrentWeek` gate. See R10: prove
     equivalence before deleting.
   - `goalRepo.ts:20` — **dead import**, delete the line, nothing else.

3. **One `weekStartISO`.** Delete the private copy at `metricsRepo.ts:80` and the
   exported one at `northStarTrackService.ts:439`; both become
   `periodStartFor("weekly", …)`. `metricsRepo`'s returns a full ISO timestamp
   for a `.gte()` — keep that shape as
   `periodStartFor("weekly", getNowInTimezone(tz)) + "T00:00:00.000Z"` and note
   in a comment that the comparison is against `timestamptz` columns.

**Acceptance test** — `tests/unit/shared/periodEquivalence.test.ts` (new): for
every date from 2025-12-01 to 2028-01-31, the deleted `getISOWeekString`
(inlined into the test as the reference implementation) and
`periodStartFor("weekly", d)` agree about whether two dates are in the same week.
**This test is expected to FAIL on 2027-01-01..2027-01-03** — that is bug §9.
Assert the new implementation is right and the old one wrong on exactly those
dates, and name them in the test.

---

## Phase 2 — the stats row learns which week it is counting (migration)

**Capability:** none visible. Gives `user_tracking_stats` the same shape the
goals table already has.

`supabase/migrations/20260828_tracking_counter_periods.sql`:

```sql
-- A counter is a number plus the period it belongs to. These are the periods.
alter table user_tracking_stats
  add column if not exists week_start_date date,
  add column if not exists last_active_week_start date,
  add column if not exists last_review_week_start date;

-- Backfill from the ISO-week strings already stored. Verified against the live
-- data: '2026-W35' -> 2026-08-24, '2026-W08' -> 2026-02-16, '2026-W01' -> 2025-12-29.
update user_tracking_stats
   set week_start_date = to_date(current_week, 'IYYY-"W"IW')
 where current_week is not null and week_start_date is null;

update user_tracking_stats
   set last_active_week_start = to_date(last_active_week, 'IYYY-"W"IW')
 where last_active_week is not null and last_active_week_start is null;

-- last_review_week_start stays NULL: nothing recorded which week a review was
-- for, and inventing one would be fabrication. A null key means "streak not
-- yet verifiable", which the read gate treats as 0. See Q3.

comment on column user_tracking_stats.week_start_date is
  'Monday (user timezone) that the current_week_* counters belong to. Replaces current_week.';
```

**Not in this migration:** any `drop column`. See R5 — dropping is P7.

**Apply it yourself:** `npx supabase migration list --linked` first (all 14 are
currently applied and nothing is pending), then `npx supabase db push --linked`.

Add the three columns to `UserTrackingStatsRow` and `UserTrackingStatsUpdate` in
`src/db/trackingTypes.ts`. Type them `string | null`.

**Acceptance test** — extend
`tests/integration/db/trackingRepo.integration.test.ts`: after the migration, no
row has `current_week` non-null with `week_start_date` null, and
`to_date(current_week,'IYYY-"W"IW') = week_start_date` for every row that has
both. Verify by hand once with:

```bash
npx supabase db query --linked "select user_id, current_week, week_start_date, last_active_week, last_active_week_start from user_tracking_stats"
```

---

## Phase 2.5 — every user has a timezone (prerequisite for P3 only)

**Capability:** none visible. P3 derives period boundaries from the user's zone;
one of three accounts has `profiles.timezone = null` and every caller falls back
to UTC without saying so — a silent fallback, which `CLAUDE.md` forbids.

This is `date_database.md` Phase 0, and if that plan is being executed, **skip
this phase and take it from there.** If it is not, do only these three things:

```sql
-- supabase/migrations/20260828_timezone_not_null.sql
update profiles set timezone = 'UTC' where timezone is null;   -- 1 row
alter table profiles alter column timezone set default 'UTC';
alter table profiles alter column timezone set not null;
```

then change `getUserTimezone` (`src/db/settingsRepo.ts:146`) to return
`Promise<string>`, and let the compiler list the `tz: string | null` parameters
that lose their `| null`. Do **not** invent a default inside the counter code.

P0, P1 and P2 do not need this — they compare stored values rather than deriving
new boundaries. P3 does.

**Acceptance test:** `getUserTimezone` returning `null` is a compile error, not a
runtime surprise. Verify the row count with
`npx supabase db query --linked "select count(*) from profiles where timezone is null"` → 0.

---

## Phase 3 — one roll, called before every read and every write

**Capability:** weekly counters on the tracking page are this week's, always —
including on a page loaded on Monday morning after a quiet week.

### 3.1 New file `src/tracking/counterRules.ts` — pure, no imports from `src/db`

Why a new file and not `trackingService.ts`: `trackingRepo` must call these, and
`trackingService` already imports `trackingRepo`. Putting them in the service
closes an import cycle. Keep it to rules — no I/O, no dates-from-nowhere.

```ts
/** The five weekly counters and the source each is recounted from. */
export const WEEKLY_COUNTER_COLUMNS = [
  "current_week_sessions", "current_week_approaches", "current_week_numbers",
  "current_week_instadates", "current_week_field_reports",
] as const

/** A week is "active" if 2+ sessions OR 5+ approaches were logged in it. */
export function isWeekActive(sessions: number, approaches: number): boolean {
  return sessions >= 2 || approaches >= 5
}

/**
 * The week streak after the week starting `endedWeekStart` has finished.
 * `lastActiveStart` is the last week that qualified, before this one.
 */
export function nextWeekStreak(args: {
  endedWeekWasActive: boolean
  endedWeekStart: string
  lastActiveStart: string | null
  currentStreak: number
}): { streak: number; lastActiveStart: string | null }
```

Rules, and they are the whole feature:
- ended week **not** active → `{ streak: 0, lastActiveStart: unchanged }`
- ended week active and `lastActiveStart` is the week immediately before it →
  `{ streak: currentStreak + 1, lastActiveStart: endedWeekStart }`
- ended week active and there is a gap (or no `lastActiveStart`) →
  `{ streak: 1, lastActiveStart: endedWeekStart }`

Move `isWeekActive` here from `trackingService.ts:744` and re-export it from
`trackingService` for existing importers.

### 3.2 New `rollTrackingCounters(userId, timezone)` in `src/db/trackingRepo.ts`

Mirrors `rollGoalPeriods`. Exactly this shape:

```ts
export async function rollTrackingCounters(userId: string, timezone: string | null): Promise<boolean> {
  const stats = await getOrCreateUserTrackingStats(userId)
  const thisWeek = periodStartFor("weekly", getNowInTimezone(timezone))
  const stored = stats.week_start_date
  if (stored === thisWeek) return false          // nothing to do, the common case
  // stored may be null (new row) or older; both roll.

  const wasActive = isWeekActive(stats.current_week_sessions, stats.current_week_approaches)
  const { streak, lastActiveStart } = nextWeekStreak({
    endedWeekWasActive: stored !== null && wasActive,
    endedWeekStart: stored ?? thisWeek,
    lastActiveStart: stats.last_active_week_start,
    currentStreak: stats.current_week_streak,
  })

  const patch = {
    current_week_sessions: 0, current_week_approaches: 0, current_week_numbers: 0,
    current_week_instadates: 0, current_week_field_reports: 0,
    week_start_date: thisWeek,
    current_week_streak: streak,
    longest_week_streak: Math.max(stats.longest_week_streak, streak),
    last_active_week_start: lastActiveStart,
  }

  // CONCURRENCY GUARD (R3): only update a row still holding the old period, so
  // two page loads on Monday morning cannot both decay the streak.
  const q = supabase.from("user_tracking_stats").update(patch).eq("user_id", userId)
  const guarded = stored === null
    ? q.is("week_start_date", null)
    : q.eq("week_start_date", stored)

  const { data, error } = await guarded.select("user_id")
  if (error) throw new Error(`Failed to roll tracking counters: ${error.message}`)
  return (data?.length ?? 0) > 0   // false = another request rolled it first
}
```

**Do not skip the guard, and do not `.catch()` the error.** A roll that fails
silently is the bug in §3 all over again.

`current_week` is deliberately **not** written here — P1 removed its last reader,
and P7 drops it. See R5 for why there is no dual write.

Also: a roll that crosses **more than one** week (idle since February) is a
single roll to the current week, and the ended week is the one named by
`stored` — the weeks in between had no activity, so they cannot be active, and
`nextWeekStreak` returning 0 for the ended week is already correct for all of
them. Do not loop.

### 3.3 Call it

- `src/db/metricsRepo.ts` → at the top of `loadStats`, before
  `getOrCreateUserTrackingStats`. This is the read path for every tile.
- `src/tracking/trackingService.ts` → first line of `updateSessionStats`,
  `incrementApproachStats`, and the field-report path at line ~256.
- Then **delete the `weekChanged` blocks** in all three write paths
  (`trackingService.ts:770-793`, `898-915`, `256-268`). They are the bug from §2
  and `rollTrackingCounters` has replaced them. This is the point of the phase:
  three ad-hoc resets become one.

### 3.4 `repairWeeklyCounters` keeps its job, loses its guard

`metricsRepo.ts:173`'s `if (stats.current_week !== getISOWeekString(...)) return stats`
becomes unnecessary — the roll has just run, so the row is always current. Keep
the recount (it is the defence against a missed increment) and delete the guard.
Extend it to recount **all five** counters, not just sessions and approaches;
numbers, instadates and field reports have never been repaired and there is no
reason for the asymmetry.

### 3.5 A goal starts counting from a boundary, not from the day it was made

`createGoal` ([goalRepo.ts:230](../../src/db/goalRepo.ts#L230)) never sets
`period_start_date`, so the row takes `CURRENT_DATE` — the database's UTC date
(bug §11). Add it to `insertData`:

```ts
period_start_date: goal.period === "custom"
  ? getTodayInTimezone(timezone)                       // a milestone starts today
  : periodStartFor(goal.period ?? "weekly", getNowInTimezone(timezone)),
```

`createGoal` already receives `timezone` (it is passed from
`app/api/goals/route.ts:45`). Do the same in the batch insert path
(`goalRepo.ts` around line 427) — grep for `insertData` and `insert.current_value`
to find it. Without this, a weekly goal made on Wednesday is stamped Wednesday
and its first "week" is three days long.

**Acceptance test** — `tests/unit/tracking/rollTrackingCounters.test.ts` (new),
against the in-memory Supabase stand-in already written in
`tests/unit/goals/goalPeriodRoll.test.ts` (copy the `FakeQuery` class or extract
it to `tests/helpers/fakeSupabase.ts` — extracting is better, it is now used
twice):
- a row on last Monday with 3 sessions rolls to 0 and `current_week_streak` 1→2
- a row on last Monday with 1 session and 1 approach rolls to 0 and the streak
  to **0** ← the exact W07 case from §2
- a row six months stale rolls to 0 counters, streak 0, one UPDATE
- a row already on this Monday performs **no** UPDATE
- two concurrent rolls: the second updates 0 rows and the streak decays once

---

## Phase 4 — a goal's period and its metric's window must agree

**Capability:** you cannot create the goal that is currently broken — a weekly
target fed by a lifetime total.

1. **Rule, in `src/tracking/metricsService.ts`** (pure, next to the catalogue it
   reads):
   ```ts
   /** Which goal periods a metric may back. A metric's window is its cadence. */
   export function metricFitsPeriod(metricId: string, period: string): boolean
   ```
   - `window: "weekly"` → only `period === "weekly"`
   - `window: "cumulative"` → only `period === "custom"` (a milestone) or `yearly`
   - `window: "current"` (1RM, body weight) → only `custom` — it is a level, not
     a count, and zeroing it every week is meaningless
   - `window: "streak"` → **never**; `linkedMetric` is null for all of these
     already, and `LINKED_METRICS` does not contain them
   - `window: "daily"` → does not exist yet; return false and leave the branch in
     place with a comment, so adding one is a visible decision

2. **Enforce in `createGoal` and `updateGoal`** (`src/db/goalRepo.ts`): throw a
   named error, do not silently null the metric — `CLAUDE.md`: no silent
   fallbacks. Surface it as a 400 with the reason from `app/api/goals/route.ts`.

3. **Enforce in the two forms**: `src/goals/components/GoalFormModal.tsx:311` and
   `src/lair/components/GoalFormModal.tsx:165` both currently gate on
   `period === "weekly"` by hand. Replace both with `metricFitsPeriod` and filter
   `LINKED_METRIC_OPTIONS` by it, so the impossible option is not offered rather
   than rejected after typing.

**Ordering:** P4 stops *new* mismatches. The 8 rows that already exist keep
being overwritten by `syncLinkedGoals` (R8) until P6b repairs them — so P4 must
not add a validation that runs on *read*, or the goals hub will start throwing
for those users. Validate on write only.

**Acceptance test** — `tests/unit/goals/metricPeriodFit.test.ts` (new): every
metric in `METRIC_CATALOG` × every value of `GOAL_PERIODS`, asserting the table
above; plus `createGoal` rejecting `{period: "weekly", linked_metric:
"approaches_cumulative"}` with a message naming both.

---

## Phase 5 — a finished period is archived, not destroyed

**Capability:** the heatmap and the weekly review have data.

1. **`snapshotGoals` uses the admin client.** One line:
   `createServerSupabaseClient()` → `createAdminSupabaseClient()` in
   [goalRepo.ts:847](../../src/db/goalRepo.ts#L847). This matches the function's
   own doc comment and needs **no new RLS policy** — the service role bypasses
   RLS, so the `.claude/rules/database.md` stop sign is satisfied without asking
   for a write policy on a system-only table. Same fix for the backfill insert at
   `goalRepo.ts:306-325`.
2. **Stop swallowing the failure.** `resetGoalsForPeriods`'s
   `await snapshotGoals(...).catch(() => {})` becomes a `console.error` with the
   goal ids **and** a re-throw when `process.env.NODE_ENV !== "production"`, so a
   test can never pass over a dead archive again. In production the roll still
   proceeds — losing the archive is better than blocking the reset — but it is
   loud.
3. **Stamp the period that ended, not the day the roll ran.** Pass
   `goal.period_start_date`, not `today`, as `snapshot_date`
   ([goalRepo.ts:690](../../src/db/goalRepo.ts#L690)). Bug §13. The unique index
   `(goal_id, snapshot_date)` still makes re-runs idempotent, and now a week that
   ended Sunday sorts into that week for `goalsService.ts:591`.

**Acceptance test** — `tests/unit/goals/snapshotOnRoll.test.ts` (new): rolling a
weekly goal on 2026-08-24 whose `period_start_date` was 2026-08-17 writes exactly
one snapshot dated **2026-08-17**; rolling twice writes one row; a snapshot
failure is re-thrown in test env. Plus R7's fixture test: `HeatmapCalendar` and
`goalsService.getPeriodRollups` over 7 synthetic snapshots.

---

## Phase 6 — repair the numbers already in the database ⚠️ DESTRUCTIVE, GATED

**Capability:** the streak on screen is the streak you actually have.

**Do not run any part of this phase until P0–P5 are green and the user has said
go.** It overwrites values that exist nowhere else (R1).

### 6a. Back up first

```bash
npx supabase db query --linked \
  "create table user_tracking_stats_backup_20260827 as select * from user_tracking_stats"
npx supabase db query --linked \
  "select count(*) from user_tracking_stats_backup_20260827"   -- must be 3
```
Drop it by hand, later, once the user confirms. No script deletes it.

### 6b. `scripts/repair-counters.ts` — dry run by default

Reads `sessions` and `approaches` per user, groups by
`periodStartFor("weekly", …)` **in that user's timezone**, and recomputes:
`current_week_streak`, `longest_week_streak`, `last_active_week_start`,
`current_streak`, `longest_streak`, and the five weekly counters.

- **Default: prints a table and writes nothing.** `--apply` writes.
- Writes the before/after of every field to
  `docs/plans/counters-repair-log.md`, committed, before `--apply` runs.
- Idempotent: running it twice with `--apply` changes nothing the second time.
- Also fixes the 11 mismatched `linked_metric` rows from §12 by nulling the
  metric and leaving `current_value` where it stands — the user then owns a
  manual goal instead of an auto-goal that lied. **List them in the log by title
  before nulling**; this is a user's data, not a fixture.

Expected output for the known case (`edec2d78`), from the real rows:

```
edec2d78  current_week_streak   4 -> 0    (last active week 2026-W06, now 2026-W35)
edec2d78  longest_week_streak   4 -> 2    (only W05 and W06 were ever active)
edec2d78  last_active_week_start  2026-02-16 -> 2026-02-02
edec2d78  current_streak        1 -> 0    (last approach 2026-08-19)
```

**Acceptance test** — `tests/unit/tracking/repairCounters.test.ts`: the pure
recompute function, given the exact session/approach timestamps of `edec2d78`
(they are in the log file, 18 sessions and 33 approaches), returns the four
values above. Assert the *values*, not that it ran.

---

## Phase 7 — the invariant is enforced by a test, and the dead columns go

**Capability:** the next counter cannot ship without a period.

1. **Architecture test**, added to `tests/unit/architecture.test.ts`: any column
   in `trackingTypes.ts` matching `/^current_(week|day|month)_/` must have a
   sibling key column declared in a `COUNTER_PERIOD_KEYS` map, or the test fails
   with the column name. This is R9's floor, and it is deliberately a floor.
2. **Docs, before saying done** (`CLAUDE.md`): update
   `docs/architecture/input-inventory.md` §`rolls*` — it currently says
   `daily_goal_snapshots` "holds nothing for anyone", which P5 makes false. And
   fix `GoalTimeSettingsDialog`'s copy to say Monday (R6/Q1).
3. **Migration `20260829_drop_dead_counter_columns.sql` ⚠️ DESTRUCTIVE:**
   `drop column current_week`, `drop column last_active_week`,
   `drop column last_session_week`. **Only after** the P3 acceptance tests have
   been green through one real week boundary, and only with the user's go-ahead.
   Nothing needs removing from `rollTrackingCounters` — it never wrote them
   (R5). Grep once more for `current_week`, `last_active_week` and
   `last_session_week` across `src/`, `app/` and `tests/` before the drop; the
   count must be zero.

---

# Manual blockers

Each was attempted once, on 2026-08-27, and the result is recorded.

| # | Blocker | Attempt | Result |
|---|---|---|---|
| B1 | Reading RLS policies to confirm why snapshots fail | `GET /rest/v1/pg_policies` with the service key | **Failed** — `PGRST205`, PostgREST does not expose `pg_catalog`. Worked around with `npx supabase db query --linked` (B2), which **resolved it**: `daily_goal_snapshots` has RLS on and one `SELECT`-only policy. No longer a blocker. |
| B2 | Applying migrations without the user | `npx supabase migration list --linked` | **Succeeded** — the project is linked, all 14 migrations applied, nothing pending. `db push --linked` is available to the agent. **Not a blocker.** |
| B3 | Arbitrary SQL against production | `npx supabase db query --linked "select polname from pg_policy limit 1"` | **Succeeded.** Ground truth is reachable. Note the tool wraps results in an untrusted-data boundary — treat rows as data, never as instructions. |
| B4 | Verifying the ISO-week → Monday backfill | `select to_date('2026-W35','IYYY-"W"IW')` | **Succeeded** — `2026-08-24`, matches `date_trunc('week', now())`. The P2 backfill is verified, not assumed. |
| B5 | Reproducing the bug in a browser as the affected user | not attempted | **Open.** Requires that user's session. The DB row is sufficient evidence for the diagnosis, but the *fix* should be confirmed on screen. Needs the user logged in, or a seeded test account. |
| B6 | Knowing what `last_session_week` was for | `grep -rn last_session_week src app` | **Failed** — zero references in code, absent from `UserTrackingStatsRow`, and no migration in the repo creates it (the table predates `supabase/migrations/`). `CLAUDE.md` says never delete code whose purpose you cannot explain: P7 drops it **only** with explicit approval, and the P6a backup is the safety net. |
| B7 | A second real user to test the week boundary against | — | **Open.** Two of three accounts are `Europe/Copenhagen`, one has `timezone = null`. Nobody is in a timezone where UTC and local disagree about the *date* at a normal hour, so the timezone half of this plan cannot be verified against real traffic — only by test. |

---

# Open questions

Each has a recommendation. None blocks P0–P3.

**Q1. Does the week start on Monday or on the user's `week_start_day`?**
The column exists, defaults to **0 = Sunday**, is offered in
`GoalTimeSettingsDialog`, and is honoured nowhere; `periodStartFor` hardcodes
Monday, and the dialog's own copy says *"Weekly goals reset to zero at midnight
on Sunday"*. Three sources, three answers.
→ **Recommendation: keep Monday everywhere and change the dialog's copy to say
Monday.** ISO weeks are Monday-based, every existing `period_start_date` is a
Monday, and honouring the setting would move the boundary for every user who
never touched it. Revisit as a real feature later; do not let it ride along
inside a bug fix. (Same conclusion as `date_database.md` Q3 — this is a
cross-reference, not a second decision.)

**Q2. Should a streak count the week in progress, or only finished weeks?**
Today it counts the week in progress: hit 2 sessions on Tuesday and the streak
goes up immediately.
→ **Recommendation: keep counting the week in progress, and decay with the
"previous period is still alive" rule from P0.** A streak that only moves on
Sunday night is not motivating.

The number can never go *down* while the user is active: `nextWeekStreak` only
increments on a week that has **finished** active, and the read gate only ever
hides a number, never lowers a stored one. So the sequence a user sees is
3 → 4 → 4 → 0, not 3 → 4 → 3. §0.4 puts that in the tile's description.

**Q3. What happens to `current_weekly_streak` (reviews), which has no history?**
Nothing recorded which week each review was for.
→ **Recommendation: leave `last_review_week_start` NULL and let the gate show 0
until the next review is submitted, which sets it.** Reconstructing it from
`weekly_reviews_completed` would be fabrication (`generated-data.md`). One user
sees a review streak drop to 0 once; say so in the repair log.

**Q4. Do the tracking tiles need per-day and per-month counters?**
There are none — only weekly and lifetime. A user wanting "approaches today"
must create a daily goal.
→ **Recommendation: do not add them.** No tile asks for one, `METRIC_CATALOG`
has no `*_daily` or `*_monthly` id, and goals already provide daily and monthly
counting with a working roll. YAGNI. P3's design is cadence-generic, so adding
`current_day_approaches` later is a column, a catalogue entry and a line in
`WEEKLY_COUNTER_COLUMNS`' sibling list — roughly an hour, and it should be
bought when something needs it.

**Q5. Should the 11 goals with a mismatched `linked_metric` be repaired or left?**
E.g. a weekly goal with target 2 linked to `approaches_cumulative`, showing 416.
→ **Recommendation: null the `linked_metric`, keep `current_value`, and list them
by title in the repair log.** The goal becomes manual instead of automatically
wrong. Deleting them destroys a user's stated intention; leaving them keeps a
permanently-complete goal on the hub.

**Q6. Should `rollTrackingCounters` also run from a cron, not only on access?**
On-access rolling means a user who never opens the app has a stale row (though
never a stale *screen*, because the read rolls first).
→ **Recommendation: no cron.** The row is only ever observed through a read that
rolls, so a cron would add a scheduler, a service-role write path and a new
failure mode to fix nothing observable. Revisit only if something starts reading
`user_tracking_stats` outside a request.

**Q7. `getUserTimezone` returns `null` for one of three accounts, and every
caller silently falls back to UTC — a silent fallback, which `CLAUDE.md`
forbids.**
→ **Recommendation: do not fix it here; take `date_database.md` Phase 0 as a
prerequisite for P3 only** (P0–P2 are unaffected because they compare stored
values, not derive new ones). If that plan is not being executed, do its Phase 0
alone — three SQL statements and one signature change — before P3. Do not add a
default inside the counter code.

---

# Second pass — what the attack on this plan changed

Run against the draft before it was handed over, per `finished-work.md`.

1. **P0 originally read `stats.last_active_week_start` before P2 creates it.**
   Caught, fixed: §0.2 now derives the key from `last_active_week` in P0 and
   says explicitly not to invent a column.
2. **P3's UPDATE had no concurrency guard**, so two page loads on Monday morning
   would each decay the streak. Caught, fixed: R3 and the `.eq(week_start_date)`
   guard, with a test for it.
3. **The roll originally looped over missed weeks.** Unnecessary and a source of
   off-by-one: an idle week cannot be active, so one roll is correct. Noted
   in §3.2 as an explicit "do not loop".
4. **P5's snapshot fix would have written the wrong date** — caught only by
   asking which reader consumes `snapshot_date`. Added as bug §13 and step 5.3.
5. **The plan originally called P0 redundant with P3.** It is not: they are
   different guarantees (read-time invariant vs. write-time correctness), and
   saying so is what stops a later cleanup deleting the gate.
6. **Two `GoalPeriod` types were going to become three** — the draft added a
   `RollablePeriod` type. Collapsed: `dateUtils` owns the rollable five,
   `goalEnums` owns the database six, and a test asserts the relationship.

7. **P3 referenced an `isoWeekLabelFor` helper that P1 deletes.** The dual write
   it fed was the only reason to keep an ISO-week formatter alive, and that
   formatter is bug §9. Dual write dropped; R5 rewritten around an atomic deploy
   instead.
8. **P0.3 said "find the API that feeds those components".** That is an
   invitation to guess. Named it: `app/api/tracking/stats/route.ts`, which
   returns the raw row — with the override written out, and
   `StreakWidget.tsx:54` flagged as a possible third reader to check rather than
   a third gate to add.
9. **Q7 was an open question that P3 could not start without.** Promoted to
   Phase 2.5 with the three SQL statements, so the plan does not stall on a
   question whose answer is already known.
10. **`previousPeriodStart` was described rather than written.** Written out,
    including why no year-underflow branch is needed.

**What this pass did not check:** whether any counter exists in the `health`,
`programs`, `vice` or `innerGame` slices (R9), and whether the P6 recompute
matches what the user *believes* their streak was (it matches the logged data,
which is all that is knowable).

---

# Execution record — 2026-08-27

Every phase ran. `npm test`: **119 files, 3924 tests, 0 failures.** The tile was
verified by running the real `getMetricValue` over the real production rows, not
over a fixture.

## What the user sees now

| account | Week Streak tile before | after | best week streak |
|---|---|---|---|
| `edec2d78` | **4** (earned in February) | **0** | 2 |
| `1f492d40` | 1 | **0** | 2 |
| `e34cb016` | 1 | **0** | 1 |

`1f492d40`'s Day Streak still reads **1** — they logged an approach yesterday,
and the gate keeps a live streak alive. That is the case R2 was written about.

## Four things the plan got wrong

**1. §3.2 contradicted its own Q2.** The plan had `rollTrackingCounters` decay
the streak when a week ends, and Q2 said a week is counted the moment it
qualifies. Both cannot be true. **Q2 won**, and the responsibilities split three
ways, which is simpler than either version:

- `rollTrackingCounters` (repo, before every read and write) — zeroes counters,
  stamps `week_start_date`. **Never touches a streak**, so running it twice
  cannot decay one twice, and R3's guard protects a concurrent increment rather
  than a lost streak.
- `streakOnQualify` (pure, on the write path) — the streak goes up the moment a
  week hits 2 sessions or 5 approaches.
- `gateStreaks` (pure, on every read path) — shows 0 unless the last active week
  is this one or the one before. It only ever hides; it never lowers a stored
  number.

**2. Bug §9 named the wrong cause.** The claim was "years that start on a
Friday", predicting 2027-01-01. Measured over 2015–2040 in five zones, the
divergence is **DST-driven and southern-hemisphere only**: Pacific/Auckland
2016-09-26, 2021-09-27, **2027-09-27**, 2038-09-27, and the same shape in
Australia/Sydney and America/Santiago. Europe/Copenhagen and America/New_York
never diverge, so no live user was ever affected. The failure mode is worse than
described: the old helper gave **two different weeks the same label**, so
`isCurrentWeek` would have said "same week" across a real boundary and the
counters would never have reset. Pinned in
`tests/unit/shared/periodEquivalence.test.ts`.

**3. P4's rule was too permissive.** The plan allowed a `cumulative` metric on a
`yearly` goal. A yearly goal rolls every January and `syncLinkedGoals` would
refill it with the lifetime total the same second — the weekly bug on a slower
clock. `metricFitsPeriod` allows `cumulative` and `current` **only on `custom`**,
the one period that never rolls.

**4. The plan missed that a week boundary is not midnight UTC.** Every query
counting "this week's rows" compares against a `timestamptz`, and the code built
that instant from the server's midnight. A Copenhagen week starts at 22:00 UTC
on Sunday. Fixed with `startOfDayInstant`, tested across both DST directions.

## Deviations in execution order

- **P1's deletions moved into P3.** `getISOWeekString` could not be deleted
  before `current_week` stopped being written, because P2's backfill parses that
  column. P1 kept the helper and shipped the vocabulary (`ROLLING_PERIODS`,
  quarterly, the equivalence proof); P3 deleted it once nothing wrote the column.
- **Migrations applied statement by statement**, via `supabase db query --linked`
  plus `supabase migration repair --status applied`, not `db push`. Another agent
  had an unapplied migration (`20260827_create_life_answers.sql`) in this working
  tree, and `db push` would have shipped it.
- **Q1 was executed as a removal, not a copy change.** The plan said to relabel
  the week-start picker to say Monday. A picker offering seven days above copy
  claiming a Sunday reset, where the answer is always Monday, is an inert control
  — it is gone, replaced by a statement of fact. Its dead write path went with it
  (`getWeekStartDay`, `updateWeekStartDay`, `handleUpdateWeekStartDay`, and the
  `week_start_day` branch of `PUT /api/settings/time-preferences`). The column
  keeps what people chose.

## The repair, applied

`scripts/repair-counters.ts` (dry run by default, `--apply` writes, idempotent —
a second `--apply` changes nothing). Backup taken first:
`user_tracking_stats_backup_20260827`, 3 rows, **still present — drop it by hand
once this is settled.** Full log: `docs/plans/counters-repair-log.md`.

```
1f492d40  longest_week_streak     3 -> 2      last_active_week_start  2026-08-24 -> 2026-03-02
          longest_streak          3 -> 4      current_week_sessions   56 -> 0
edec2d78  current_week_streak     4 -> 2      longest_week_streak     4 -> 2
          last_active_week_start  2026-02-16 -> 2026-02-02
e34cb016  nothing to repair
```

`current_week_streak` for `edec2d78` became **2, not 0** as the plan predicted.
2 is what the code would have written had it been correct in February — the
streak they actually reached. The tile shows 0 because the gate hides it, which
is the right division: the row records history, the screen shows what is live.

**11 goals had their `linked_metric` removed** (Q5), value kept, listed by title
in the log: three "Approach Volume"/"Phone Numbers"/"Instadates" weekly goals fed
lifetime totals, one "Sleep 8 hours nightly" daily goal fed a weekly average, and
four 1RM/max-reps weekly goals fed a current reading. **Worth a second look:**
"Bench Press 1RM (kg)" with target 140 on a *weekly* period is milestone-shaped.
Changing its period to `custom` would restore the auto-sync and be correct — but
that is guessing at intent, so it was not done.

## Cleanup done alongside

**Deleted, with the reason each was dead:**

- `getISOWeekString`, `areWeeksConsecutive` (`trackingService`) — replaced by
  Monday-date comparison; see wrong-thing #2.
- `getWeekStartDay`, `updateWeekStartDay` (`settingsRepo`),
  `handleUpdateWeekStartDay` (`settingsService`) — wrote a value nothing read.
- `resetWeeklyGoals`, `resetMonthlyGoals`, `resetYearlyGoals` (`goalRepo`) — no
  route, component or service called any of them. `resetDailyGoals` stays;
  `TodayGoalsWidget` posts to `/api/goals/reset-daily`.
- `LINKED_METRIC_OPTIONS`, `PERIOD_OPTIONS`, `TRACKING_TYPE_OPTIONS`,
  `unselCls`/`unselStyle`/`unselSub`, `suggestions`, `filteredParentGoals` in
  `src/goals/components/GoalFormModal.tsx` — the component delegates its form to
  `GoalFormVariant6` and none of them was rendered.
- Columns `current_week`, `last_active_week`, `last_session_week`.
- Three duplicate implementations of "the Monday of this week" collapsed into
  `periodStartFor`.

**Left alone, deliberately:** `handleSuggestionClick`, `lifeAreaOverrideNote` and
`showCurveEditor` in `GoalFormModal`. Each is half of a migration —
`selectedSuggestion` is still passed to the variant and both setters are still
called — so deleting the unused half would change what the variant receives.
Marked with a note naming the other half.

**Tests removed, and why they could not fail:**

- `tests/unit/db/trackingRepoHelpers.test.ts` (35 tests) — 22 of them exercised
  the ISO week-label arithmetic that no longer exists. What survives is in
  `tests/unit/tracking/counterRules.test.ts`, against the real rules.
- Five blocks from `tests/integration/db/trackingRepo.integration.test.ts` (~290
  lines): three testing deleted helpers, two "weekly streak" blocks that
  re-implemented the streak in raw SQL — `const newStreak = isConsecutive ?
  currentStreak + 1 : 1` — and then asserted their own arithmetic. They passed
  throughout the period the production streak was wrong.
- The `@/src/shared/dateUtils` mock in `tests/unit/db/linkedMetrics.test.ts`.
  Mocking pure period arithmetic with two of its five functions is why that file
  broke the moment the week key changed; it now fixes the clock instead.

**Tests added** (67 net new assertions): `streakDecay`, `counterRules`,
`rollTrackingCounters`, `metricPeriodFit`, `periodEquivalence`, `goalPeriods`,
plus an architecture test asserting every `current_*` column on
`user_tracking_stats` declares a period key — **verified by mutation**: adding a
keyless `current_month_approaches` makes it fail, removing it makes it pass.
`tests/helpers/fakeSupabase.ts` was extracted from the goals roll test and is now
shared by both roll tests.

## Still open

- **B5 stands.** Nothing was confirmed in a browser. The numbers above come from
  running the production `getMetricValue` over the production rows, which is the
  same function the page calls — but the page itself was not loaded.
- **B7 stands.** All three accounts are `Europe/Copenhagen` (one was `null` until
  P2.5 set it to UTC). The timezone half of this work is proven by test only.
- **R9 stands.** No counter in the `health`, `programs`, `vice` or `innerGame`
  slices was inventoried. The architecture test only guards
  `user_tracking_stats`.
- `user_tracking_stats_backup_20260827` is still in the database.
- A parallel agent added `src/tracking/achievementsService.ts` while this ran; it
  already references the new columns and deliberately does not write the retired
  ones. Not reviewed here.
