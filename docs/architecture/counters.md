# Counters — entities

> **A counter is two facts, not one: a number, and the period that number
> belongs to. Neither may be read without the other.**

Every box below is a real table; every `period key` column is the second half of
some counter's pair. Built 2026-08-27 — see `docs/plans/counters.md`.

## Entities

```mermaid
erDiagram
    PROFILES ||--|| USER_TRACKING_STATS : "one row each"
    PROFILES ||--o{ USER_GOALS : owns
    USER_GOALS ||--o{ DAILY_GOAL_SNAPSHOTS : "one per finished period"
    PROFILES ||--o{ SESSIONS : logs
    PROFILES ||--o{ APPROACHES : logs
    PROFILES ||--o{ FIELD_REPORTS : writes
    SESSIONS ||--o{ APPROACHES : contains

    PROFILES {
        uuid id PK
        text timezone "NOT NULL DEFAULT 'UTC' — every period is computed in it"
        int week_start_day "stored, honoured by nothing. Weeks are Monday."
    }

    USER_TRACKING_STATS {
        uuid user_id PK
        date week_start_date "PERIOD KEY for all five current_week_* counters"
        int current_week_sessions "per week"
        int current_week_approaches "per week"
        int current_week_numbers "per week"
        int current_week_instadates "per week"
        int current_week_field_reports "per week"
        date last_active_week_start "PERIOD KEY for current_week_streak"
        int current_week_streak "per week"
        int longest_week_streak "record — never decays"
        date last_approach_date "PERIOD KEY for current_streak"
        int current_streak "per day"
        int longest_streak "record — never decays"
        date last_review_week_start "PERIOD KEY for current_weekly_streak (NULL = never recorded)"
        int current_weekly_streak "per week"
        int total_approaches "lifetime — no period, never resets"
        int total_sessions "lifetime"
        int total_numbers "lifetime"
        int total_instadates "lifetime"
        int total_field_reports "lifetime"
        int weekly_reviews_completed "lifetime"
        text_array unique_locations "lifetime"
    }

    USER_GOALS {
        uuid id PK
        uuid user_id FK
        text period "daily|weekly|monthly|quarterly|yearly|custom"
        date period_start_date "PERIOD KEY for current_value"
        int current_value "per period"
        int target_value "the goal"
        int current_streak "consecutive periods completed"
        int best_streak "record — never decays"
        int streak_freezes_available "absorbs one missed period"
        text linked_metric "must measure the same span as `period`"
    }

    DAILY_GOAL_SNAPSHOTS {
        uuid id PK
        uuid goal_id FK
        date snapshot_date "the period_start_date of the period that ENDED"
        int current_value "what the counter reached"
        int target_value "what it was aiming at"
        bool was_complete "derived at archive time"
        int current_streak "as it stood"
        text period "the cadence it ran on"
    }

    SESSIONS {
        uuid id PK
        timestamptz started_at "the truth current_week_sessions caches"
    }
    APPROACHES {
        uuid id PK
        timestamptz created_at "the truth current_week_approaches caches"
        text outcome "number|instadate|... — feeds the other three counters"
    }
    FIELD_REPORTS {
        uuid id PK
        timestamptz created_at
        bool is_draft "drafts are not counted"
    }
```

## The three responsibilities, and where each lives

Splitting these is the whole design. Any two of them in one function and the
third goes wrong.

```mermaid
flowchart TD
    subgraph pure["Pure — src/shared/dateUtils.ts, src/tracking/counterRules.ts"]
        PSF["periodStartFor(period, now)<br/>the boundary, in the user's calendar"]
        PPS["previousPeriodStart(period, start)"]
        ISC["isStreakCurrent(period, lastEarned, now)"]
        IPS["isPeriodStale(period, storedStart, now)"]
        IWA["isWeekActive(sessions, approaches)<br/>2+ sessions OR 5+ approaches"]
        SOQ["streakOnQualify(...)"]
        ZWC["zeroedWeeklyCounters()"]
    end

    subgraph roll["1 · ROLL — owns counters"]
        RTC["rollTrackingCounters()<br/>db/trackingRepo"]
        RGP["rollGoalPeriods()<br/>db/goalRepo"]
    end

    subgraph earn["2 · QUALIFY — owns the streak"]
        CAU["checkAndUpdateWeeklyStreak()<br/>tracking/trackingService"]
    end

    subgraph show["3 · GATE — owns decay"]
        GS["gateStreaks()<br/>db/metricsRepo"]
    end

    WRITE["a session ends,<br/>an approach is logged,<br/>a field report is filed"] --> RTC
    RTC --> INC["increment the counter<br/>for THIS week"]
    INC --> CAU
    CAU -->|"week now active,<br/>not yet counted"| STREAKUP["streak + 1<br/>last_active_week_start = this Monday"]

    READ["/dashboard/tracking<br/>/api/tracking/stats<br/>/api/goals"] --> RTC
    READ --> RGP
    RTC --> RWC["repairWeeklyCounters()<br/>recount all five from the rows"]
    RWC --> GS
    GS --> TILE["the tile:<br/>0 unless the last active period<br/>is this one or the one before"]

    RGP -->|"period_start_date is stale"| SNAP["snapshotGoals()<br/>archive the period that ended"]
    SNAP --> ZERO["current_value = 0<br/>period_start_date = the new boundary"]

    PSF -.-> RTC
    PSF -.-> RGP
    IPS -.-> RGP
    IWA -.-> CAU
    SOQ -.-> CAU
    ZWC -.-> RTC
    ISC -.-> GS
    PPS -.-> ISC
    PPS -.-> SOQ
```

**Why three and not one.** Rolling touches counters only, so running it twice
cannot decay a streak twice — two page loads on a Monday are safe. Qualifying
only ever raises a number, so it cannot punish anyone. The gate only ever hides,
so a recovered user gets their streak back without anything writing to the row.
The previous design had all three tangled in three separate `weekChanged` blocks
and produced a streak of 4 from two active weeks.

## What a period is, per cadence

| period | boundary | rolls? |
|---|---|---|
| `daily` | midnight, user's timezone | yes |
| `weekly` | **Monday 00:00**, user's timezone. Sunday night is still last week's. | yes |
| `monthly` | the 1st | yes |
| `quarterly` | 1 Jan / 1 Apr / 1 Jul / 1 Oct | yes — it did not until 2026-08-27 |
| `yearly` | 1 January | yes |
| `custom` | none — a milestone runs to `custom_end_date` | **never** |

`custom` is absent from `shared/dateUtils.GoalPeriod` on purpose: a milestone
cannot be passed to period arithmetic, which makes "zeroing a milestone"
unrepresentable rather than merely unlikely.

## The rule that keeps a linked metric honest

`metricFitsPeriod(metricId, period)` — a metric's **window is its cadence**:

| metric window | may back a goal whose period is | because |
|---|---|---|
| `weekly` | `weekly` | same span |
| `cumulative` | `custom` only | a lifetime total refills any goal that rolls |
| `current` (1RM, body weight) | `custom` only | a level is not a count |
| `streak` | nothing | display-only; not in `LINKED_METRICS` |
| `daily`, `monthly` | nothing yet | no metric has these windows |

Enforced in `createGoal`, `createGoalBatch` and `updateGoal` (throws
`GoalMetricPeriodError` → HTTP 400), and both goal forms filter their pickers by
the same function.

## Health counters

Computed fresh from `workout_logs`, `nutrition_logs` and `sleep_logs` on every
read, and stored nowhere — deliberately. They are already derived from the rows,
which is the property the daygame counters spent two rewrites buying; storing
them would add a cache to keep in sync.

| metric | window | dated by |
|---|---|---|
| `gym_sessions_weekly`, `cardio_sessions_weekly`, `running_sessions_weekly`, `mobility_sessions_weekly`, `yoga_sessions_weekly` | this week | `workout_logs.logged_at` |
| `protein_days_hit_weekly`, `calorie_days_hit_weekly` | this week, **per day** | `nutrition_logs.logged_at`, summed within each of the user's days |
| `nutrition_quality_avg_weekly`, `sleep_hours_avg_weekly` | this week | `logged_at` |
| `consecutive_training_weeks`, `consecutive_cardio_weeks` | streak | weeks containing a `logged_at` |
| `*_cumulative`, `*_1rm`, `body_weight_current`, `longest_run_km` | no period | — |

Every one of the period-scoped eleven takes the account holder's timezone as a
required argument. Until 2026-08-28 none of them did — the file did not contain
the word — and the two streaks could only ever return 0.

## The six questions, asked of each counter family

From `.claude/rules/finished-work.md`. A blank cell is work, not a tidy table.

| | daygame counters | goal counters | health counters |
|---|---|---|---|
| **Whose clock?** | the user's, from `profiles.timezone` (NOT NULL) | the user's | the user's, since 2026-08-28 |
| **Which two facts must agree?** | count ↔ `week_start_date`; streak ↔ `last_active_week_start` | `current_value` ↔ `period_start_date` | none stored — recomputed from rows each read |
| **What can be written that shouldn't?** | nothing: the row is overwritten by a projection, never incremented | a `linked_metric` whose window ≠ the goal's period — refused on write | n/a |
| **Who else can write it?** | the service-role key bypasses RLS, so every guarantee here is advisory for backend code | same | same |
| **Does the name mean something else here?** | `current_streak` is **days**, `current_week_streak` is weeks, `current_weekly_streak` is **reviews**. Three streaks, three meanings, similar names. **This is a real trap and it is not fixed.** | `current_value` is this period only; lifetime is in `daily_goal_snapshots` | — |
| **What did I claim was impossible?** | zeroing a milestone: `custom` is not in `GoalPeriod`, so it cannot be passed to period arithmetic | same | a streak that decays on write: `streakRun` has no clock |

## Invariants a test now enforces

- Every `current_*` column on `user_tracking_stats` declares a period key —
  `tests/unit/architecture.test.ts`, verified by mutation.
- `ROLLING_PERIODS ∪ {custom}` equals the `goal_period` Postgres enum, and
  `dateUtils.GoalPeriod` equals `ROLLING_PERIODS` — `tests/unit/db/goalPeriods.test.ts`.
- A week is identified by its Monday, and two different weeks never share an
  identity — `tests/unit/shared/periodEquivalence.test.ts`.
- No metric fits more than one cadence — `tests/unit/goals/metricPeriodFit.test.ts`.
- No new hand-rolled week boundary, and no new date derived by converting to UTC
  first — `tests/unit/architecture.test.ts`, both verified by mutation, both with
  allowlists that can only shrink.
- Counters keep their shape as the clock moves: totals never fall, a weekly count
  resets only when the week does, a shown streak never returns from zero on its
  own — `tests/unit/tracking/counterShapes.test.ts`, 45 days at 6-hour steps
  through both DST switches.
