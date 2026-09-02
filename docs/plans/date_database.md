# Dates, once and for all

**Status: plan, not built.** Written under `.claude/rules/finished-work.md` —
the risks section was written before the design and sits above it.

---

## The one rule this establishes

> **Every date in this app is a date in the user's timezone. The browser clock
> and the database clock are never asked what day it is.**

An *instant* (`timestamptz`) is absolute and safe. A *date* is a question about
somebody's calendar, and it has no answer without knowing whose calendar.
Today, roughly thirty places in this codebase answer it with whichever clock
happened to be nearest.

## Why now, in numbers rather than opinion

- **24 places** derive a date with `toISOString().split("T")[0]`, which converts
  to UTC first. **4 files** use the timezone-aware helpers.
- **Three separate `todayISO()` functions** exist —
  `src/goals/horizonService.ts:72`, `src/goals/northStarService.ts:143`,
  `src/vice/viceService.ts:98` — none of which can accept a timezone.
- **The test suite already fails outside UTC.** Run today:
  `TZ=America/New_York` → 2 failures. `TZ=Pacific/Auckland` → 8 failures,
  including `getDaysLeftInWeek` returning the wrong day of the week four times.
  This is not a hypothetical class of bug; it is live.
- **One of four accounts has no timezone at all** (`jonas879@gmail.com`,
  onboarding completed). `getUserTimezone` returns `null` and every caller
  silently falls back to UTC — a silent fallback, which `CLAUDE.md` forbids.
- **The week-start setting is a lie.** `GoalTimeSettingsDialog` lets a user pick
  their week start and tells them *"Weekly goals reset to zero at midnight on
  Sunday"*. `resetWeeklyGoals` hardcodes Monday. The setting changes nothing.

## What you will see when it is done

- The day boundary is yours. A count logged at 23:30 in Copenhagen belongs to
  that day, not to the next one because a server in UTC disagreed.
- Your timezone is captured when you sign up, shown in Settings, and changeable
  there. If the browser you are on disagrees with it, the app says so and offers
  to switch — it never switches silently.
- Weekly goals reset on the day the settings screen says they reset on.
- Nothing you have already logged moves.

---

# What could go wrong with this plan

Written before the phases, per the rule.

**R1. Retro-fixing old rows would invent data.** Rows already stored carry dates
derived in UTC. There is no way to know what the user's local date was at the
time. **This plan does not touch historical rows.** Their dates may be off by
one; that is now permanent and is the cost of the original bug. Anything else
would be fabrication.

**R2. A default timezone is a silent fallback wearing a hat.** Making
`profiles.timezone` `not null default 'UTC'` guarantees the column is populated
and guarantees a Copenhagen user silently gets UTC days if detection ever fails.
Handled by DQ1's mismatch banner — the value is never missing, and never wrong
without saying so.

**R3. Phase 2 touches 24 sites across repos and services.** A mechanical
find-and-replace here will break things quietly, because the sites are not all
the same question: some ask "what day is it now", others ask "what local day
does this stored instant fall on". They need different helpers. The inventory in
§Phase 2 classifies each one; do not batch-replace.

**R4. Client components cannot reach the database.** Seven tracking components
compute "today" from the browser clock. They need the timezone passed down, and
the obvious way — each fetching it — adds seven requests. Phase 3 uses one
provider; if that lands badly, the fallback is to pass it as a prop from the
server components that already have it.

**R5. DST makes "90 days" ambiguous.** Adding `90 * 86400` seconds crosses a DST
boundary and lands an hour off, which changes the date at the edges. Every
horizon calculation must add calendar days in the user's zone, never seconds.

**R6. The week-start fix changes existing behaviour.** Users whose setting says
Sunday have been getting Monday resets. Honouring the setting will move their
week boundary once. That is the correct end state and it is still a visible
change; DQ3 covers it.

**R7. This plan cannot prove the absence of the bug, only its absence from the
places it found.** The guard in Phase 5 catches the two known patterns
(`toISOString().split`, bare `new Date()` for a date). A third pattern would
pass. The guard is a floor.

---

# Phases

Each phase is a working, testable state. Execute in order; every deliverable
names its acceptance test.

## Phase 0 — a user always has a timezone

**Capability:** every account has a timezone, and the app can tell the
difference between "chosen" and "never asked".

1. **Migration** `supabase/migrations/<date>_timezone_not_null.sql`:
   - backfill: `update profiles set timezone = 'UTC' where timezone is null`
   - `alter table profiles alter column timezone set default 'UTC'`
   - `alter table profiles alter column timezone set not null`
   - Same three statements for `week_start_day` if it is nullable — check first.
   - **Destructive?** No. It writes a value only where there is none.
2. **`getUserTimezone` stops returning null.** Signature becomes
   `Promise<string>`. Every `tz: string | null` parameter downstream loses its
   `| null`, which the compiler will find for you.
3. **Signup already detects it** (`OnboardingFlow.tsx:55` →
   `profile/actions.ts:46`). The only change: `profileService.ts:176` currently
   writes the timezone *only if truthy* — make it always write, falling back to
   `'UTC'` explicitly and visibly rather than by omission.

**Acceptance test:** `tests/unit/settings/timezone.test.ts` — a profile created
without a timezone reads back `'UTC'`, and `getUserTimezone` is typed to return
a string (a null return is a compile error, not a runtime surprise).

## Phase 1 — one function, and it cannot be called without a timezone

**Capability:** none visible. This is the foundation the rest stands on.

1. **`src/shared/dateUtils.ts` becomes the only place a date is derived.**
   Add, alongside the existing `getTodayInTimezone` / `getNowInTimezone` /
   `periodStartFor`:

   ```ts
   /** The local calendar date of an instant, in a given zone. YYYY-MM-DD. */
   export function dateInTimezone(instant: Date | string, timezone: string): string

   /** Add calendar days in a zone — never seconds, because of DST. See R5. */
   export function addDaysInTimezone(iso: string, days: number, timezone: string): string

   /** Whole days between two YYYY-MM-DD dates. Zone-free by construction. */
   export function daysBetween(fromISO: string, toISO: string): number
   ```

   Every one of these takes the timezone as a **required** argument. No default.
   A caller that does not have a timezone cannot compute a date — that is the
   point, and it is what makes Phase 2 mechanical rather than judgemental.

2. **Delete the three `todayISO` copies** and re-export one from `dateUtils`:
   - `src/goals/horizonService.ts:72`
   - `src/goals/northStarService.ts:143`
   - `src/vice/viceService.ts:98`

   **The blast radius, measured rather than guessed: 45 call sites.** They are
   not 45 decisions — 23 of them are in `NorthStarFlow.tsx`, and 22 of those are
   the identical fallback `today ?? ns.todayISO()` around a `today` the component
   already holds in state (set once at line 231). So:

   - **1a.** In `NorthStarFlow`, resolve `today` once — from the profile's zone
     when signed in, the browser's when not — guarantee it is non-null, and
     delete the `?? ns.todayISO()` from all 22 sites. Mechanical, one pass.
   - **1b.** The remaining 22 sites, by file:
     `visionPlanService.ts` (5), `northStarService.ts` (4),
     `GoalsConfigStep.tsx` (4), `useViceState.ts` (2),
     `northStarTrackService.ts` (2), `SeasonBand.tsx` (2), `NewGoalsFlow.tsx` (2),
     `viceService.ts` (1). Each takes the resolved date as an argument instead
     of deriving one.
   - **1c.** Where a call site genuinely has no user — the vice module is
     localStorage-only and signed out — pass the browser's zone **explicitly**
     (`Intl.DateTimeFormat().resolvedOptions().timeZone`) so the choice is
     visible in the code rather than implied by a default.

**Acceptance test:** `tests/unit/shared/dateUtils.test.ts` — extend the existing
file. Each new helper is checked under `TZ=UTC`, `America/New_York` and
`Pacific/Auckland`, and `addDaysInTimezone` is checked across a DST transition
in `Europe/Copenhagen` (2026-03-29) and `America/New_York` (2026-03-08).

## Phase 2 — the server asks the user's calendar

**Capability:** every date the server computes is a date in the user's zone.

The 24 sites, classified. **They are not the same question — do not batch.**

**Group A — "what day is it now" (needs the user's tz):**
```
src/db/goalRepo.ts:312, 933, 980
src/db/trackingRepo.ts:1421
src/db/healthRepo.ts:414, 426, 728, 739
src/goals/goalsService.ts:583, 586, 756
src/tracking/trackingService.ts:879, 888
src/health/healthService.ts:119, 228, 461
src/exercising/exercisingService.ts:361
app/api/goals/weekly-review-data/route.ts:22
```
Replace with `getTodayInTimezone(tz)` / `periodStartFor(period, getNowInTimezone(tz))`.
Where the function has no `tz` parameter, add one — it is required, so the
compiler lists every caller that must supply it.

**Group B — "what local day does this stored instant fall on":**
```
src/health/components/CorrelationPanel.tsx:41, 54
src/goals/components/WeeklyReviewDialog.tsx:94
src/goals/components/DailyActionView.tsx:168, 169
src/goals/hooks/usePeriodStats.ts:19
```
Replace with `dateInTimezone(instant, tz)`. These are client components — they
get their `tz` from Phase 3.

**Not a site:** `src/shared/dateUtils.ts:71` is the doc comment warning against
the pattern.

**Acceptance test:** the whole unit suite passes under all three zones (see
Phase 6). Specifically, these eight currently fail under `Pacific/Auckland` and
must pass:
```
goalsService.test.ts       getDaysLeftInWeek x4
goalsService.test.ts       getWeeklyRhythm > identifies peak bracket
goalsService.test.ts       deduplicates same-day snapshots
changeYourLifeService.test.ts  defaults the end date to 90 days out
goalsService.test.ts       returns 0 for goal updated today
```

## Phase 3 — the browser stops deciding the day

**Capability:** a user in Copenhagen on a laptop set to UTC still sees
Copenhagen days.

1. **`src/shared/TimezoneProvider.tsx`** — a client context holding the user's
   timezone, and a `useTimezone()` hook.
2. **Populated once, server-side**, in `app/dashboard/tracking/layout.tsx`
   (which already loads the profile for voice language) and in the dashboard
   layout. One fetch, not seven.
3. **The seven client components** stop calling `new Date()` for a day:
   `DailyReviewPage`, `WeeklyReviewPage`, `FieldReportPage`, `DatePicker`,
   `QuickAddModal`, `CustomReportBuilder`, `SessionTrackerPage`.
4. **Mismatch banner** (DQ1): where the provider mounts, compare the stored zone
   with `Intl.DateTimeFormat().resolvedOptions().timeZone`. If they differ, show
   a one-line prompt offering to switch. Never switch silently.

**Acceptance test:** `tests/e2e/timezone.spec.ts` — Playwright supports
`timezoneId` per context. Log a session with the browser set to
`America/New_York` while the profile says `Europe/Copenhagen`, at an hour where
the two disagree about the date, and assert the entry lands on the Copenhagen
day and the banner appears.

## Phase 4 — the database stops guessing

**Capability:** none visible; closes the last back door.

1. `user_goals.period_start_date` is `DATE NOT NULL DEFAULT CURRENT_DATE`
   (`schema.sql:409`) — `CURRENT_DATE` is UTC. Migration: **drop the default.**
   The app already supplies this value on every write after this morning's fix;
   dropping the default turns "nobody supplied one" from a silent UTC guess into
   a loud error.
2. Audit for any other `DEFAULT CURRENT_DATE` or `DEFAULT NOW()` feeding a
   `date` column. `timestamptz DEFAULT NOW()` is fine and stays — an instant has
   no timezone.

**Acceptance test:** `tests/integration/db/dateDefaults.integration.test.ts` —
inserting a `user_goals` row without `period_start_date` fails rather than
silently dating itself in UTC.

## Phase 5 — it cannot come back

**Capability:** the next person to write `toISOString().split` is stopped.

`tests/unit/architecture.test.ts` gains one rule, with the current violations
listed as grandfathered and the list emptied by Phase 2:

- no `toISOString().split("T")` outside `src/shared/dateUtils.ts`
- no `new Date().getFullYear()`-style date assembly outside `dateUtils`
- `getTodayInTimezone`, `dateInTimezone`, `addDaysInTimezone` are never called
  with a literal `"UTC"` outside tests — that is how a silent fallback sneaks
  back in

**Acceptance test:** the rule itself. Verify it by adding the pattern to a file,
watching it fail, and removing it.

## Phase 6 — verification across three clocks

```
TZ=UTC              npm test
TZ=America/New_York npm test
TZ=Pacific/Auckland npm test
```

All three must pass. Add the three-zone run to CI — one line in the workflow —
otherwise Phase 5's guard is the only thing standing and it only catches
patterns, not behaviour.

---

# Open questions, each with a recommendation

**DQ1. What happens when the browser's zone disagrees with the setting?** A
traveller, or a laptop set to UTC.
**Recommendation: the setting always wins, and the app says so.** A one-line
banner — *"Your timezone is set to Europe/Copenhagen but this device says
America/New_York. Switch?"* — with a button. Never switch silently: somebody on
a two-week trip does not want their week boundary moving twice.

**DQ2. Should `profiles.timezone` default to `'UTC'` or be `not null` with no
default?**
**Recommendation: default `'UTC'`.** No-default means any insert path that
forgets it fails, including ones we have not written yet, and the failure lands
on a user mid-signup. The default plus DQ1's banner gives the same safety without
the cliff. R2 is the honest cost.

**DQ3. The week-start setting currently does nothing. Honour it or remove it?**
**Recommendation: honour it.** The dialog already promises it, users can already
set it, and one of the four live accounts is set to Sunday today while its goals
reset on Monday (B5). `periodStartFor` takes a `weekStartsOn` argument (0–6, defaulting
to Monday), and `resetWeeklyGoals` passes the user's. Expect one visible boundary
shift for anyone whose setting says Sunday — worth announcing. Removing the
control instead is cheaper but means deleting a feature people may already use.

**DQ4. How is "90 days" counted across a DST change?**
**Recommendation: calendar days in the user's zone**, via
`addDaysInTimezone`. Never `+ 90 * 86400 * 1000`. See R5.

**DQ5. Do we fix the dates already stored?**
**Recommendation: no.** See R1 — the information needed does not exist. Say so
plainly if a user ever asks why an old entry looks a day off.

**DQ6. Where does the vice module get a timezone, given it is signed out?**
**Recommendation: the browser's zone, passed explicitly** at the call site so
the choice is visible. When quit-vice gets a real route and an account, it moves
to the profile's zone with the rest.

**DQ7. Should the Life Mastery flow use the profile's zone or the browser's?** It
runs signed out for twelve of thirteen steps.
**Recommendation: the browser's while signed out, the profile's once signed in**,
resolved in one place (`NorthStarFlow`) and passed down — not decided per
component.

---

# Manual blockers

Each attempted once; the result is recorded.

**B1. How many accounts have no timezone?** ✅ Attempted, answered. Queried the
live database with the service-role key: **3 of 4 profiles have a timezone**
(`Europe/Copenhagen`), one does not — `jonas879@gmail.com`, with
`onboarding_completed = true`, so the gap is real and reachable through the
normal signup path, not a test artefact.

**B2. Does the suite actually fail outside UTC?** ✅ Attempted, answered. Run
today across `tests/unit/{goals,shared,tracking}`:
`TZ=America/New_York` → **2 failed**, 2428 passed. `TZ=Pacific/Auckland` →
**8 failed**, 2422 passed. The eight are named in Phase 2.

**B3. Applying the migrations.** ⚠️ Blocked on you. Phase 0 and Phase 4 alter
`profiles` and `user_goals`. `CLAUDE.md` requires explicit approval for schema
and policy changes, and someone has to run them against Supabase. Not attempted.

**B4. Verifying in a browser whose timezone differs from the profile.** ⚠️ Not
possible from here. The Playwright MCP browser does not expose `timezoneId`, so
the Phase 3 check has to run through the e2e suite
(`test.use({ timezoneId: "America/New_York" })`), which needs the dev server and
the auth setup project. **For you to run:** `npm run test:e2e -- timezone`.

**B5. What is actually in `week_start_day`?** ✅ Attempted, answered, and it
changed Q3. Queried the live database: the column exists and is populated on all
four profiles — **three are `1` (Monday), one is `0` (Sunday)**. So a real
account is set to Sunday today, and its weekly goals reset on Monday, because
`resetWeeklyGoals` hardcodes Monday. The setting is not merely unwired in
theory; it is wrong for a live row right now. Nullability in the live database
is still unconfirmed (PostgREST does not expose `information_schema`), so Phase
0 should run its backfill defensively: `update profiles set week_start_day = 1
where week_start_day is null` before any `set not null`.

**B6. Announcing the week-boundary shift to existing users.** Yours. If Q3 is
accepted, anyone whose setting says Sunday sees their week move once.

---

# Order of execution

```
Phase 0   timezone is never missing          migration + getUserTimezone: string
Phase 1   one helper, timezone required      dateUtils + delete 3 todayISO copies
Phase 2   server sites, Group A then B       24 sites, classified above
Phase 3   the browser stops deciding         provider + 7 components + banner
Phase 4   drop DEFAULT CURRENT_DATE          migration
Phase 5   the guard                          architecture.test.ts rule
Phase 6   three-clock verification           TZ=UTC / New_York / Auckland + CI
```

Phases 0 and 4 are gated on B3. Everything else can proceed without them, and
Phase 1 alone makes Phase 2 mechanical.
