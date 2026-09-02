# Achievements & tracking — entity diagram

**Read this first:** the tables split into two halves that must never be confused.

- **Written by the user** (through the app): `sessions`, `approaches`, `field_reports`,
  `reviews`. These are the truth. Everything else is an opinion about them.
- **Derived by the server**: `milestones` (badges) and `user_tracking_stats` (counters). Both are
  recomputed from the four tables above on every write. Neither is ever an *input* to anything.

That split is the fix described in `docs/plans/achievement_counters.md`. Badges used to be handed
out at the instant a `+1` counter crossed a threshold, so a missed instant meant a badge lost
forever — and the counters had drifted in both directions.

Columns below are the live production schema, read from `information_schema` on 2026-08-27.

---

## The tables

```mermaid
erDiagram
    profiles ||--o| user_tracking_stats : "one row of counters"
    profiles ||--o{ milestones : "badges earned"
    profiles ||--o{ sessions : logs
    profiles ||--o{ approaches : logs
    profiles ||--o{ field_reports : writes
    profiles ||--o{ reviews : writes

    sessions ||--o{ approaches : "contains (CASCADE)"
    sessions ||--o| field_reports : "written about (SET NULL)"
    sessions ||--o{ milestones : "earned during (SET NULL)"

    profiles {
        uuid id PK
        text timezone "NOT NULL — every day and week boundary is read in this zone"
        smallint week_start_day "NOT NULL"
        text email
    }

    sessions {
        uuid id PK
        uuid user_id FK
        timestamptz started_at "NOT NULL — decides Night Owl / Early Bird"
        timestamptz ended_at "null while running"
        text end_reason "completed | abandoned — only completed ones count"
        boolean goal_met
        integer goal
        integer duration_minutes ">= 120 earns Marathon"
        integer total_approaches "DENORMALISED — never read by the rules"
        text primary_location "5 distinct ones earn Globetrotter"
        boolean with_wingman "drives the Social badges"
        text wingman_name
        jsonb location_data
        boolean is_active
    }

    approaches {
        uuid id PK
        uuid user_id FK
        uuid session_id FK "null when logged outside a session"
        timestamptz timestamp "NOT NULL — the moment everything is dated from"
        text outcome "blowout | short | good | number | instadate — set by a LATER edit"
        text set_type "15 values — drives the Unique Sets badges"
        text_array tags "street, cafe, store, park, transit, mall, bookstore"
        integer quality
        integer mood
        text note
    }

    field_reports {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        boolean is_draft "drafts count for nothing"
        timestamptz reported_at "NOT NULL"
        jsonb fields
        text title
    }

    reviews {
        uuid id PK
        uuid user_id FK
        text review_type "daily | weekly | monthly | quarterly"
        boolean is_draft
        date period_start "which week the review is FOR — keys the review streak"
        date period_end
        timestamptz created_at
        jsonb fields
    }

    milestones {
        uuid id PK
        uuid user_id FK "UNIQUE with milestone_type"
        text milestone_type "one of 103 — MILESTONE_TYPES in trackingEnums.ts"
        timestamptz achieved_at "NOT NULL — when it was really earned, not when it was noticed"
        uuid session_id FK "set only if earned inside that session"
        integer value "unused"
    }

    user_tracking_stats {
        uuid user_id PK
        integer total_approaches "= count of approach rows"
        integer total_sessions "= count of completed sessions"
        integer total_numbers "= approaches with outcome number"
        integer total_instadates
        integer total_field_reports
        integer current_streak "consecutive days, gated on read"
        integer longest_streak
        date last_approach_date "the key current_streak is read against"
        date week_start_date "the Monday the current_week_* counters belong to"
        integer current_week_approaches
        integer current_week_sessions
        integer current_week_numbers
        integer current_week_instadates
        integer current_week_field_reports
        integer current_week_streak "consecutive ACTIVE weeks"
        integer longest_week_streak
        date last_active_week_start "the key current_week_streak is read against"
        integer weekly_reviews_completed
        integer current_weekly_streak "consecutive weeks with a review"
        date last_review_week_start "the key current_weekly_streak is read against"
        boolean monthly_review_unlocked "4+ weekly reviews"
        boolean quarterly_review_unlocked "3+ monthly reviews"
        text_array unique_locations
        text_array favorite_template_ids "USER INPUT — the only column not derived"
    }
```

### Relationships that matter

| Relationship | On delete | Why it matters |
|---|---|---|
| `approaches.session_id → sessions.id` | **CASCADE** | Deleting a session really deletes the approaches inside it, so the counters must go down. Nothing tells the stats row that rows disappeared — which is why it is recomputed rather than adjusted. |
| `milestones.session_id → sessions.id` | SET NULL | A deleted session must never take a badge with it. Badges are insert-only. |
| `field_reports.session_id → sessions.id` | SET NULL | The report survives its session. |
| `milestones (user_id, milestone_type)` | UNIQUE | This is what makes awarding safe to repeat on every write: a second award is a no-op and `achieved_at` is never rewritten. |

---

## How a badge is decided

```mermaid
flowchart TD
    subgraph truth["Written by the user — the only source of truth"]
        A[approaches]
        S[sessions]
        F[field_reports]
        R[reviews]
    end

    TZ[profiles.timezone]

    A --> BF
    S --> BF
    F --> BF
    R --> BF
    TZ --> BF

    subgraph pure["achievementsService.ts — pure, no database, no clock"]
        BF["buildFacts()<br/>sorted lists of when things happened,<br/>in the user's own timezone"]
        DE["deriveEarnedMilestones()<br/>103 rules, one per badge"]
        PS["projectTrackingStats()<br/>every counter, computed whole"]
        BF --> DE
        BF -.same rows.-> PS
    end

    subgraph writer["achievementsSyncService.ts — the only writer"]
        RC["reconcileUserProgress()"]
    end

    DE --> RC
    PS --> RC
    RC -->|"insert only, ignore duplicates"| M[(milestones)]
    RC -->|"whole-row overwrite, never +1"| U[(user_tracking_stats)]

    M --> UI[Achievements screen]
    U --> UI2[Dashboard tiles & goals]

    style truth fill:#0f172a,stroke:#334155,color:#e2e8f0
    style pure fill:#1e293b,stroke:#475569,color:#e2e8f0
    style writer fill:#1e293b,stroke:#475569,color:#e2e8f0
```

**Every arrow points away from the source rows.** There is no arrow back into `buildFacts` from
either derived table — that absence is the guarantee. A rule that read a counter could inherit its
drift; none can, because the counters are not in scope.

---

## What calls the writer

Every mutation in `src/tracking/trackingService.ts` ends in the same call, and nothing else awards
a badge (enforced by `tests/unit/architecture.test.ts`):

| Function | Why it reconciles |
|---|---|
| `createApproach` | a new approach can cross any approach threshold |
| `updateApproach` | **the outcome is set here, one tap after the approach is saved** — this is why the Numbers badges were unreachable before |
| `endSession` | session totals, per-session badges, week streaks |
| `updateSession` | the location, goal and duration a session is judged on can all be edited afterwards |
| `deleteSession` | approaches cascade away; counters go down, badges stay |
| `createFieldReport` / `updateFieldReport` / `deleteFieldReport` | a draft becoming a real report counts, and un-writing one un-counts |
| `createReview` / `updateReview` | weekly and monthly review counts, and the two unlocks |

### Which session a badge belongs to

`milestones.session_id` is **derived, not passed in**: a badge is stamped with the session whose
window (`started_at` → `ended_at`, or still open) contains its `achieved_at`. Most badges are won
mid-session by an approach, so making the caller supply the session meant every approach path had to
remember to — and none of them did, which left every volume badge unattached and session cards
showing no achievements at all.

A badge earned outside any session — a quick-added approach, a field report, a review — correctly
gets `null`.

## Where each thing lives

| Concern | File |
|---|---|
| Which badges exist | `src/db/trackingEnums.ts` → `MILESTONE_TYPES` (103) |
| What each badge is called | `src/tracking/data/milestones.ts` → `ALL_MILESTONES` |
| How each badge is earned | `src/tracking/data/milestoneRules.ts` → `MILESTONE_RULES` |
| Facts and counters, computed | `src/tracking/achievementsService.ts` |
| Writing them back | `src/tracking/achievementsSyncService.ts` |
| Reading and writing rows | `src/db/trackingRepo.ts` |
| Hiding a streak that has gone stale | `src/db/metricsRepo.ts` → `gateStreaks` |
| Checking a live account | `scripts/tracking/audit-achievements.ts` |

All three badge lists are typed against the same union, so a badge missing from any of them fails
the build — and fails `tests/unit/architecture.test.ts` too, because deploys skip type checking.
