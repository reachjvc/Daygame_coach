# Workout Programs — Plan

**Goal:** Hand-encoded, trackable fitness *programs* across 7 disciplines, living inside the app under `health_fitness`. User picks a program + level (or enters their own numbers), gets a "do this today" widget, logs it, engine computes next session.

**Locked decisions**
- Lives inside the app (reuses goals + `src/health/` tracking).
- Hand-encoded programs; specs sourced from authoritative origin & cited at encode time (no guessed numbers).
- Build order = **phased by metric type** (Load → Cardio → Calisthenics/Flexibility → Endurance).
- Triathlon/Ironman = **full periodized multi-sport plans** (build/peak/taper) — last phase, effectively its own module.
- **Scheduling = Hybrid.** Load/calisthenics/flexibility advance **log-driven** (next = next-in-sequence, advances on log). Endurance/periodized advance by **calendar-anchored week index** (enrollment `start_date` + program schedule → date-mapped sessions; taper must land on race week). Engine dispatches scheduling on metric type, same as progression.
- **Fitness-only scope.** `src/programs/` engine is scoped to the 4 fitness metric types now. Not generalized to non-fitness life areas yet (revisit later); keep the metric-type union clean enough to extend, but don't build a generic registry.

---

## STATUS

**ALL SEVEN DISCIPLINES IMPLEMENTED** (slice `src/programs/`). Four metric-type engines + 13 cited programs:
- **Strength** (load): StrongLifts 5×5, Starting Strength (linear), 5/3/1 (%TM).
- **Bodybuilding** (load / double-progression): Push/Pull/Legs, Upper/Lower, PHUL.
- **Cardio** (endurance / week-indexed): Couch to 5K (NHS), 5K→10K.
- **Calisthenics** (skill-tier unlocks): Bodyweight Foundations (r/bwf RR).
- **Flexibility** (hold/range): Splits & Mobility.
- **Triathlon** (endurance / periodized multi-sport): Sprint, Olympic.
- **Ironman** (endurance / periodized): 70.3 Half.

Triathlon/Ironman = periodized swim/bike/run plans (build→peak→taper, 6 sessions/week, generated volume curve, race-week taper). **Now surfaced in the planner too**: added a `obj_triathlon` ("Race a Triathlon") goal objective under Health (objective + 5 targets + `tmpl_triathlete` + clarifier in `newGoalFramework.ts`/`clarifiers.ts`); `OBJECTIVE_DISCIPLINE` maps it to **both** triathlon + ironman, so the plan shows a Triathlon picker (Sprint/Olympic) and an Ironman picker (70.3). All 7 disciplines now reachable from the goals planner AND the catalog.

38 engine unit tests + full suite (1562) green; typecheck clean. **Authed E2E verified** (test-user-b): planner attach (load + non-load) → save → enrollment shows; and catalog enroll of a triathlon plan → swim/bike/run session renders. Catalog browse shows all 7 disciplines / 13 programs.

Engine dispatches on `metricType`: load (linear/percentage_tm/double_progression), endurance (fully-prescribed week plan, log advances cursor), skill_tier (unlock next variation at rep threshold), hold_range (deepen hold on success). Bridge writes per type: weights+sets / running+distance / weights / mobility.

⚠️ **Before testing the live flow:** run migration `supabase/migrations/20260618_create_program_tables.sql`. Enroll/log/today need the tables; they don't exist until you apply it.

⚠️ **RLS to confirm (CLAUDE.md §5):** both new tables use own-row CRUD policies, mirroring `workout_logs` (personal, user-owned training data — no cross-user/earned/leaderboard stake). `exercise_state` is engine-computed but stored in the user's own row. Confirm this is acceptable or tighten.

**Goals-hub integration: DONE.** Programs are a first-class item in the new-goals plan builder (`/test/new-goals`): when the **Get Strong** objective is in the plan, a green "HEALTH · Training program" panel appears under Health (StrongLifts 5×5 / 5/3/1, level + units + per-lift overrides / 1RMs). On plan **Save** the user is enrolled idempotently (`programRepo.ensureEnrollment` — no-op if already enrolled, so re-save never wipes progress; only switching programs replaces). Carried via `programSelection` in the plan flow state + `NewGoalsPlanSchema`; GET `/api/goals/plan` rehydrates it from the active strength enrollment. Full authed E2E verified: plan→pick→save→enrollment shows in `/test/programs` My Programs. Picker = `src/programs/components/ProgramPicker.tsx`; gated block in `GoalsConfigStep.tsx`.

What M1 deliberately does NOT do yet: standalone `/programs` route (only `/test/programs` + the goals-hub panel); manual-deload UX (engine auto-deloads); assistance-lift prescriptions for 5/3/1 (main lifts only, cited). Endurance/calisthenics/flexibility programs (M2–M4) — the picker only shows strength today. Catalog expansion (Starting Strength, GZCLP, PPL…) = add data files + list in `catalog.ts`.

---

## HUMAN SECTION (read this to decide)

### What the user gets
1. Browse programs by discipline, filtered/sorted by popularity & level.
2. Pick a program → pick **Beginner / Intermediate / Advanced** starting point → optionally **override every number** (their working weights / current 5K time / pushup max / split depth).
3. A **today's-session widget**: exact prescription ("Squat 5×5 @ 80kg", "Run 20min: 8×[60s jog / 90s walk]", "Hold front-split @ assisted, 3×30s") + one-tap input to log actuals.
4. On log, the **engine advances**: adds weight, drops pace, unlocks next skill tier, deepens the hold, or moves to next periodized week — per that program's real rule.
5. Sessions feed existing linked metrics (`gym_sessions_weekly`, `running_distance_cumulative`, etc.) so existing goals auto-update. Programs are not a parallel silo.

### The spine: four metric types, one engine
Disciplines don't share a progression unit. The schema models a generic **exercise unit** carrying a *metric type* + *progression rule*; one engine dispatches on type:

| Metric type | Disciplines | Logs | Progresses by |
|---|---|---|---|
| **Load** | Strength, Bodybuilding | sets × reps × kg (+RPE/AMRAP) | add weight, % of training-max |
| **Endurance** | Cardio, Triathlon, Ironman | duration / distance / pace / HR, interval blocks | add distance/time, drop pace, periodized week |
| **Skill-tier** | Calisthenics | reps at a progression variant | unlock next harder variation |
| **Hold/Range** | Flexibility | seconds held / ROM / assist level | longer hold, deeper range, less assist |

### Units, rounding, 1RM (must-have correctness)
- **Unit system** stored per enrollment (`kg`/`lb`). Load increments are unit-native: +2.5 kg vs +5 lb (not converted).
- **Plate rounding:** prescribed load rounds to a loadable weight given a barbell + available-plate set (default Olympic kg / standard lb sets; user-overridable later). Never prescribe an unloadable number.
- **1RM/Training-Max:** ask 1RM or estimate via cited **Epley** (1RM = w·(1+reps/30)); 5/3/1 **TM = 90% of 1RM** (Wendler). All formulas cited in code at encode time — no guessed numbers (CLAUDE.md no-guessed-numbers rule).

### Calibration model (two layers)
- **Layer 1 — program selection by level:** in the browse view, a level can *route to a different program* (running Beginner = Couch-to-5K; Advanced = base-build/HM). Each program declares which levels it serves.
- **Layer 2 — in-program calibration:** picking a level seeds per-exercise starting params (loads / paces / tiers / holds). User can override each one. % programs (5/3/1) either estimate a Training Max from level or ask for a 1RM.

### Proposed catalog (popularity-weighted; final list editable)
Specs verified & cited when each is encoded.

- **Strength (Load, ~5):** StrongLifts 5×5 (B), Starting Strength (B), GZCLP (B–I, tiered), 5/3/1 (I, %TM/waved/AMRAP), Madcow 5×5 (I, weekly ramp).
- **Bodybuilding (Load, ~5):** PPL/Metallicadpa (B–I), Upper/Lower 4-day (B–I), PHUL (I), PHAT (A), Arnold Split (A).
- **Calisthenics (Skill-tier, ~2):** r/bwf Recommended Routine (B–I); Skill-progression ladders (push/pull/legs/core variations → one-arm pushup, muscle-up, pistol) — level = entry tier.
- **Cardio/Running (Endurance, ~3):** Couch-to-5K–style (B), 5K→10K progression (I), Base-build / "increase running" / HM (A). Optional generic bike/row.
- **Flexibility (Hold/Range, ~3):** Daily full-body mobility (B), Front/Side-splits progression (I–A), Yoga-flow flexibility (B–I, maps `yoga_sessions_weekly`).
- **Triathlon (Endurance/periodized, ~2):** Sprint (B), Olympic (I).
- **Ironman (Endurance/periodized, ~2):** 70.3 Half (I), Full Ironman (A).

### Phasing (each milestone = working, testable app state)
- **M1 — Load programs.** Engine + schema + units/rounding/1RM + lifecycle flows. **Cap catalog at 2–3 verified programs** (e.g. StrongLifts 5×5, 5/3/1) to prove the engine before scaling encoding — "all popular programs" is open-ended content work, not engine work. *User can enroll, set level/enter maxes, see today's session in their unit with loadable weight, log it, get the correct next session; can deload/reset/unenroll.*
- **M2 — Cardio/running.** Endurance metric type incl. C25K-style intervals & pace progression.
- **M3 — Calisthenics + Flexibility.** Skill-tier + Hold/Range types; tier unlocks & hold/ROM progression.
- **M4 — Triathlon + Ironman.** Full periodized multi-sport (swim/bike/run, build/peak/taper, week-indexed prescriptions).

### Lifecycle & concurrency (UX flows — don't skip)
- **One active program per discipline** (e.g. not two load programs at once; strength + flexibility together is fine). Enrolling in a second program of the same discipline prompts replace/deactivate.
- Flows to build: switch program mid-cycle, unenroll, reset to week 1, **manual deload**, and **missed-session catch-up** (log-driven: resume at next sequential; calendar-anchored: skip to today's date-mapped session, flag the gap). Per CLAUDE.md UI-lifecycle: forward → resulting state → undo → empty/edge → re-entry all verified.
- Out of scope (state explicitly): rest timers, push reminders/notifications.

### Flags
- **DB migrations required** (new tables) — deliverable, not context. User runs migrations before testing each phase.
- **Licensing:** structure/method re-implemented as data (fine); branded text/files not copied; trademark-risky names genericized ("5K Starter — couch-to-5K style").
- Existing `workout_sets` is **load-only** → program sessions need a richer log (below). Existing load logging still feeds `workout_logs`/PR metrics.

---

## AI EXECUTION SECTION

### New module: `src/programs/`
```
src/programs/
  types.ts            # ProgramDefinition, ExerciseUnit, ProgressionRule (union), Level,
                      # ProgramEnrollment, ProgramSessionLog, MetricType
  config.ts           # discipline list, level labels, metric-type registry
  programsService.ts  # progression ENGINE (pure): (rule, lastLog, params) -> nextPrescription
  data/
    strength/*.ts     # one file per program; verified+cited specs
    bodybuilding/*.ts
    cardio/*.ts
    calisthenics/*.ts
    flexibility/*.ts
    endurance/*.ts    # triathlon/ironman periodized
    catalog.ts        # aggregates + discipline/level index
  components/
    ProgramCatalog.tsx      # browse by discipline/level/popularity
    ProgramDetail.tsx       # overview + level picker + per-exercise override form
    TodaySessionWidget.tsx  # prescription + per-metric-type input
    ProgressionView.tsx     # history / next-up / PRs
  hooks/useEnrollment.ts, useTodaySession.ts
```

### Schema (`src/programs/types.ts`)
- `MetricType = "load" | "endurance" | "skill_tier" | "hold_range"`.
- `ExerciseUnit { id, name, metricType, prescription, progressionRule }` — `prescription` & `progressionRule` are discriminated on `metricType`:
  - load: sets, reps|repScheme, load (abs kg | %TM | RPE), amrapLastSet?
  - endurance: blocks[{ kind: warmup|interval|steady|cooldown, duration|distance, targetPace|HR }], or week-indexed for periodized
  - skill_tier: tier ref + reps; `tiers[]` ordered easy→hard with unlock criteria
  - hold_range: holdSec | romTarget | assistLevel
- `ProgramDefinition { id, discipline, name, sourceCitation, popularityRank, levels: Level[], cycle: { weeks, days, structure }, units | weekPlan }`.
- `Level { id: beginner|intermediate|advanced, seedParams, structuralVariantOf? }` (supports level-routes-to-different-program).
- `ProgramEnrollment { id, user_id, program_id, level, userParams (per-unit overrides), current: {week, day, cycle}, is_active }`.
- `ProgramSessionLog { id, enrollment_id, date, week, day, entries: MetricEntry[] (typed per metricType), rpe?, notes?, deload? }`.

### Engine (`programsService.ts`, pure & unit-tested)
`computeNextPrescription(program, enrollment, lastLog)`:
- load: hit-all → +increment; fail N → deload %. %TM → recompute from TM; AMRAP → adjust.
- endurance: advance interval scheme / drop pace / step periodized week (taper aware).
- skill_tier: meet reps at tier → unlock next tier.
- hold_range: meet hold → +sec / deeper / less assist.
**Scheduling (dispatched on metric type, hybrid):** load/skill/hold → sequential next-in-cycle; endurance/periodized → `weekIndex = f(start_date, today, schedule)`, date-mapped, taper-aware. Load engine applies unit-native increment then plate-rounds.
Read-side reuses `getLastWorkoutSets` pattern; engine takes data in, returns prescription out (no I/O).

### DB (`src/db/programRepo.ts` + `supabase/migrations/`)
New tables: `program_enrollments`, `program_session_logs` (typed-entry JSON or child `program_session_entries`). System-computed progression fields → no user INSERT/UPDATE policies on derived columns; **confirm RLS with user before writing policies** (CLAUDE.md §5). Migration file per phase; tell user to run before testing.
Bridge: on load-session log, also write `workout_logs`/`workout_sets` so existing PR/linked-metric sync (`gym_sessions_weekly`, etc.) fires unchanged. Add linked metrics only if a gap is found (running/yoga/flexibility already exist).

### API routes (`app/api/programs/*`, each ≤50 lines, no business logic)
Mirror existing `app/api/health/*` pattern. Endpoints: `POST /enroll`, `GET /today` (current prescription via engine), `POST /log` (writes session log + bridges to `workout_logs`/`workout_sets`, then advances), `POST /advance|deload|reset`, `DELETE /enroll`. All logic in `programsService.ts`; all DB in `programRepo.ts`.

### Entry point
Surface from `health_fitness` in the goals hub (reuse `GoalsHubContent` patterns) + a `/programs` route. Add to `/test` dashboard (static array in `app/test/page.tsx`) per CLAUDE.md §12 during build. Note: `src/health/` has **no `config.ts`** — don't assume one; new `src/programs/config.ts` is fine.

### Per-phase acceptance tests
- **M1:** enroll StrongLifts 5×5 @ Intermediate, enter starting squat, log all-reps-hit → next session squat = +2.5kg; log 3rd fail → 10% deload. Unit tests on engine for each rule.
- **M2:** enroll C25K-style @ Beginner → week-1 interval prescription correct; complete week → week-2 advances. Pace program drops target pace on hit.
- **M3:** calisthenics tier unlock at rep threshold; flexibility hold increments. 
- **M4:** Olympic-tri plan renders correct week-N swim/bike/run incl. taper week; periodized advance across build→peak→taper.

### Open / to-confirm at build time
- Final program list per discipline (above is proposed; M1 capped at 2–3).
- RLS policy shape for new tables (ask before writing).
- Whether periodized endurance logs reuse `ProgramSessionLog` or need a per-sport extension.
- Default available-plate sets (kg/lb) for rounding — confirm at M1.

*Resolved:* scheduling = **hybrid**; scope = **fitness-only** (engine kept extensible but no generic non-fitness registry now).
