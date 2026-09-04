# Workout Programs — Plan

**Goal:** Hand-encoded, trackable fitness *programs* across 7 disciplines, living inside the app under `health_fitness`. User picks a program + level (or enters their own numbers), gets a "do this today" widget, logs it, engine computes next session.

**Locked decisions**
- Lives inside the app (reuses goals + `src/health/` tracking).
- Hand-encoded programs; specs sourced from authoritative origin & cited at encode time (no guessed numbers).
- Build order = **phased by metric type** (Load → Cardio → Calisthenics/Flexibility → Endurance).
- Triathlon/Ironman = **full periodized multi-sport plans** (build/peak/taper) — last phase, effectively its own module.
- **Scheduling = Hybrid.** Load/calisthenics/flexibility advance **log-driven** (next = next-in-sequence, advances on log). Endurance/periodized advance by **calendar-anchored week index** (enrollment `start_date` + program schedule → date-mapped sessions; taper must land on race week). Engine dispatches scheduling on metric type, same as progression.
- **Fitness-only scope.** `src/programs/` engine is scoped to the 4 fitness metric types now. Not generalized to non-fitness life areas yet (revisit later); keep the metric-type union clean enough to extend, but don't build a generic registry.

**Data model:** `docs/architecture/training-data-model.md` — entity diagram plus what the two foreign-key-less joins cost.

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

---

## PROGRAMS ARE EDITABLE, AND THEY LIVE ON THE LIFE-MASTERY TEMPLATES TAB (2026-08-18)

**The gap this closed.** `/test/life-mastery` could say "four workouts a week" and produce a split of *day names* (Push / Pull / Legs) with nothing underneath them, while the 13 cited programs sat at `/test/programs` where nobody planning their life would find them. And a catalog program could not be changed at all — the rack has no leg press, the shoulder will not overhead press, and the only answers were "follow it anyway" or "don't use the app for training".

**1. Full editing, copy-on-write** — `src/programs/customize.ts`.
- `custom_schedule` is **NULL until the first edit**, so an untouched enrollment keeps picking up catalog corrections. The first edit snapshots the *whole* resolved schedule and the user owns it from then on.
- **Not a diff.** A patch keyed by catalog day/exercise ids has to guess what a renamed or retired id means on the next catalog change, and every answer is a silent guess at read time (CLAUDE.md no-fallback).
- **The engine did not change.** `effectiveProgram(program, customSchedule)` returns the definition with the user's schedule swapped in; `programRepo.programFor()` resolves it once, on the way out of the DB. Every prescription, progression and bridge downstream runs the user's version without knowing customization exists.
- Ops: rename / reorder / add / remove days; swap / add / remove / reorder exercises; edit sets & reps.
- **Swap takes the replacement's own prescription**, never the old slot's — 5×5 carried onto a Lateral Raise, or a %TM wave onto a Face Pull, prescribes something nobody should do.
- **Refused on purpose, visibly:** 5/3/1 main lifts won't take a sets/reps edit (the wave *is* the program); endurance plans aren't editable at all (week 6 only means something because weeks 1–5 happened).
- **No guessed weights.** `seedEnrollment` already throws without a working weight, so any added/swapped lift asks for a starting number, with a library suggestion shown for confirmation. `src/programs/data/exerciseLibrary.ts` = ~55 lifts grouped by movement pattern; swapping offers like-for-like first.
- **Editing mid-program costs no progress.** `seedForAddedExercises` only fills state that is *missing*; surviving lifts keep working weight, TM and fail count, and a removed lift keeps its state so putting it back doesn't reset it.
- **An empty training day is never startable** — `scheduleProblems()` names the day in the UI, and the wire schema enforces `.min(1)` exercises per day independently. An empty day would prescribe a session with nothing in it, advance the cursor and log a workout that didn't happen.

**2. On the Templates tab, as its own top-level section** — `src/goals/components/north-star/WorkoutPrograms.tsx`, mounted in `BuildBoard.tsx` directly under the board header, above the area rows. **It was first put inside the Fitness area card and was effectively invisible**, for three reasons worth not repeating: (a) the board's area filter (`shown = showAll || pictured.length === 0 ? plan.areas : pictured`) hides every area without a "10" written, so any real plan with one 10 elsewhere rendered no Fitness card at all; (b) areas are renameable/removable, so keying on `lm_fitness` could strand a user permanently; (c) it sat under 52 goals and a practices row, ~1700px down. A program is also not the same *kind* of offer as a set/goal/practice — those drop something into the plan, a program IS the training week and starting one writes to the DB. Pick → edit → **Start tracking this** creates a *real DB enrollment*. Needs an account and says so; editing works signed out. Starting also writes the program's days into the plan's workout routine via `ns.applyProgramToWorkoutRoutine`, so the week on screen and the week being tracked can no longer disagree.

**3. Editable after it's running** — `src/programs/components/EditActiveProgram.tsx`, in `ProgramsApp`. Most real edits happen in week three.

**4. A CUSTOMIZE STEP — design a week from scratch (2026-08-18).** Rail tab 6 on `/test/life-mastery`, between Templates and Systems, in a **sky accent** rather than the rail's violet and with **no progress ring** (`WORKSHOP_TABS` in `northStar.ts`): it is a tool, not a section of the plan, and a ring there would score somebody on having designed a training program.

- `src/programs/builder.ts` (authoring ops) + `components/CustomProgramBuilder.tsx` (UI) + `north-star/CustomizeTab.tsx` (the step). **Reuses `customize.ts` for days/lifts** — a day is a day whether the program was cited or invented, and a second copy would mean two sets of rules about empty days and id collisions.
- **Enrolled against a SHELL program** (`data/customProgram.ts`, id `custom`): everything downstream of an enrollment is reached through `requireProgram(program_id)`, so a self-designed week is an ordinary enrollment whose `custom_schedule` is the design. Resolvable via `getProgram`, deliberately absent from `ALL_PROGRAMS` so it never appears in a browse list. **Seeds nothing at any level** → `seedEnrollment` throws unless every lift is given a weight, which is right when there is no cited source to suggest from.
- **Supersets are a flat `supersetGroup` tag on the exercise, not nesting.** Nesting would change the shape the engine, prescription, log and workout_sets bridge all walk, to express "these belong together" — and each lift in a superset is still prescribed, logged and progressed on its own rule, which the tag preserves exactly. Joined by pairing NEIGHBOURS (a superset is back-to-back, so letters-from-a-dropdown would allow pairs five rows apart); labels `A1/A2` renumber on reorder; unpairing releases a survivor left alone, since a group of one is not a superset.
- **Progression is a choice per lift**: add weight each time (linear), add reps then weight (double progression), or **"leave it to me"** — a new `{ kind: "none" }` rule that holds the weight and reports a `hold` change rather than being omitted. It needed a real branch in `applyLog`; the previous `else` assumed percentage-of-TM. `percentage_tm` is deliberately NOT offered — a weekly set table is a program's structure, not one lift's setting.
- Also: straight-sets ↔ rep-range toggle (carries the reps across), per-lift weight step in the user's own unit, per-lift notes (reach the session prescription). **Priority = order**, not a separate field — an "importance" flag with no effect on what gets prescribed would be decoration; the order IS the session, and the first lift is marked `main`.
- Own localStorage key `custom-program-v1`, not part of the plan: "start over" on the plan must not delete somebody's training week. Only the day names cross into the plan, and only once started.

**YOUR OWN LIFTS ARE REMEMBERED, AND THEY ARE ONE LIFT (2026-08-19, reported: "if i add a new exercise, like one arm tricep, it should become auto-filled the next time… since i want to track progress on the individual lifts").**

⚠️ **BUG FIXED: the same lift on two days was two lifts.** `addExercise` ran every add through `freshId`, so Bench Press on Push A and `lib_bench_press_2` on Push B were two entries in `exerciseState` — two working weights for one bar, drifting apart. Ids are how progression is tracked. It now **reuses the id when the lift already exists on another day**, and keeps the suffix only for the same lift twice in ONE day (top set + back-off), where the log has to tell the slots apart.

- **`src/programs/customLifts.ts`** — a per-browser store (`custom-lifts-v1`), separate from the design's storage because a lift you invented outlives the week you invented it in. Deduped on id, newest first, capped at 200, and hostile input loses the list rather than the page.
- **A "Yours (n)" tab** appears in the palette once you have made one, ahead of the body parts, with a per-lift **forget** button (removes it from the palette, never from a program already using it). Searching puts your own lifts above the pool — you named it, so if you are typing that name it is the one you mean.
- **Identity was already deterministic**: `customLibraryEntry` derives the id from the name (`custom_onearmtricep`), so "One Arm Tricep", "one arm tricep" and "  One  Arm  Tricep  " were always one lift. Remembering it is what stops you retyping it; the id is what makes the progress accumulate.
- Only `custom_`-prefixed lifts are remembered — the 153-lift pool does not need a copy of itself in localStorage.

**BROWSE BY BODY PART, SWAP BY MOVEMENT PATTERN (2026-08-19, reported: "they are not all squats in squats… shoulder press isnt there, and dumbell shrug etc").**

Almost nothing was actually missing. Shoulder Press and Dumbbell Shrug were both in the 153-lift pool, filed under **Vertical push** — not a place anyone looks. The palette used `MovementPattern` as its browse index, and that is the wrong index for FINDING a lift:

- `pattern` answers *"what else could go in this slot"* → still drives the swap picker, unchanged.
- **`BodyGroup` (new) answers *"where do I find it"*** → drives the palette tabs: Chest · Back · Shoulders · Arms · Quads · Hams & glutes · Calves · Core.

`group` is **derived** from the pattern via `GROUP_FOR_PATTERN` plus a short `GROUP_OVERRIDES` list, not typed onto 153 rows — a hand-written group per row is 153 chances to file a lift where nobody looks. The overrides are the interesting cases: a Face Pull is a horizontal pull that belongs on a shoulder day. `lunge` folds into Quads because "Single leg" is a category only a coach browses under. Tab names now describe what a lift *trains*, so a Leg Press under **Quads** is no longer a lie the way a Leg Press under "Squat" was.

Also added the machines the pool was genuinely thin on: Hip Abduction/Adduction, Glute Bridge, Frog Pump, Single-Leg Press, Smith Machine Lunge/Shoulder Press, Machine & Cable Shrug, Cable Rear Delt Fly (165 total). `customLibraryEntry` now takes a `BodyGroup`. Findability is locked by `tests/unit/programs/lifts.test.ts`.

✅ **MIGRATION APPLIED (2026-08-19).** `20260818_program_custom_schedule.sql` pushed to remote (`supabase db push --linked`, project `vcjzbmtcgmjrvvklzqaq`) and confirmed — nothing pending. The CLI *is* available and the project *is* linked, contrary to the older note in this doc; `supabase migration list --linked` shows local-vs-remote state and is the way to check what a push would apply before running it.

**`Stepper` VALUES ARE TYPABLE, NOT JUST TAPPABLE (reported: "i still cannot write another rep range, only click it down or up").** −/+ is right for 3→4 and punishing for 8→20. The middle is now a real input: typed text is held locally and committed on blur/Enter (Escape reverts), so typing "1" en route to "12" does not apply a one-rep prescription; stepping while a draft is open steps from what is on screen.

**ADDING YOUR OWN EXERCISE IS A VISIBLE BUTTON (reported: "I also need to be able to add my own exercise").** `customLibraryEntry` already supported it, but the offer only appeared once you had searched for something the 153-lift pool did not have — which nobody does deliberately, so it may as well not have existed. There is now a **+ my own** button in the palette header; the lift is filed under the currently-selected body-part tab and goes into that program only.

**LOGGING WHAT YOU ACTUALLY DID (2026-08-19).**

- ⚠️ **BUG FIXED: `applyLog` progressed the day at the CURSOR, ignoring `log.dayId`.** Harmless while the app chose the session for you; wrong the moment day-picking exists — log Pull and bench went up because you rowed. It now resolves the day from the log (`dayIndexOf`), falls back to the cursor for the skip path (`dayId: ""`), and advances **from the day that was done** so out-of-order logging continues from there.
- **A day picker on the session widget** — every session in the program, with its weekday, so the app's guess (cursor, or today's date) is a default rather than a rule. The alternate day's prescription is recomputed **on the client**: the engine is pure and the program + enrollment are already loaded, so it is a function call, not a round trip. The server still owns what happens on log.
- **Weight per set is an input, not a label.** Only reps were editable; the weight was hardcoded from the prescription. A blank box falls back to the prescribed weight, never to 0 (which would log a barbell lift as bodyweight). Reps + kg per set were already the storage shape and already bridge to `workout_sets`.
- **Rest days are labelled** in the widget rather than presented as today's work.

**FINDABILITY FIXES (same session, both reported).** The disclosure that opened a day was a **fourth chevron** beside move-up/move-down/remove — four identical icon buttons, one of which was the only way to add a lift. Nobody found it. Now: a labelled **Add lifts** button, empty days open themselves and cannot be collapsed, and several days can be open at once. Separately, the rep RANGE was only reachable by opening the per-lift settings and flipping "Prescribed as" — there is now a **→ range / → fixed** switch on the row itself.

**BUILD-YOUR-OWN IS AN OPTION ON THE TEMPLATES STEP, AND THE WEEK HAS WEEKDAYS (2026-08-19).**

- **No separate Customize tab.** "Take a ready-made one" / "Build my own" is a `Segmented` at the top of the Templates program section — two answers to one question, behind one switch. The tab briefly in the rail asked people to choose between them before seeing either. `CustomizeTab.tsx` → `BuildYourOwn.tsx`; `customize` removed from `NorthStarTabId`/`TAB_ORDER`/`WORKSHOP_TABS`.
- **`DayTemplate.weekday`** (ISO 1=Mon…7=Sun, `WEEKDAYS`/`isoWeekday` in `config.ts`). Weekday chips are always visible on the day card, not behind the disclosure — the week is the thing being designed. **One day per weekday**: assigning a taken weekday takes it off the other day and says so, rather than refusing the move.
- **Two scheduling modes, decided by the program not a setting.** `isWeekdayAnchored` is ALL-OR-NOTHING; a half-assigned week is reported by `designProblems`, never interpreted. Anchored → `getTodaySession` picks the day matching today's date. Unanchored (every cited program, unchanged) → the cursor walks the list, so missing Tuesday does not skip Workout B.
- **Rest days are real.** On an anchored week with nothing today, the prescription carries the *next* session flagged `restDay: true` + `scheduledWeekday`, so a 3-day week cannot silently become a 7-day one.
- **Superset and drop sets moved onto the lift row** from behind the settings icon — same mistake as burying the lift picker: something you are asked about in the gym should not need a disclosure.

**CLICKING IS THE WAY IN; WRITING IS A DRAWER (2026-08-18, after "i cant add lifts like a normal person… I didnt want to write in coding language using symbols, but just wanting to pick and click easily").**

I misread the previous complaint. "Not humanlike to separate with a comma" meant *the picking should be easy*, not *let me type it*. Shipping a `3x8 @60` syntax as the primary input was the wrong fix — it is still typing, and now it is typing syntax.

- **`ExercisePalette` is always open** inside a day. Every lift on screen, tabbed by body part, **one click adds** and the palette stays put so the next one is also one click. The old flow — "add a lift" → type → click a result — was three actions per lift with a blank box that told you nothing about what existed.
- **`Stepper` for sets and reps**: −/+ taps rather than select-all-and-retype. Still typable underneath for 8→20.
- **The written form moved behind "Paste or write it instead"**, shut by default. The parser and its 37 tests stay — pasting a program you already have is genuinely faster — it is just no longer the way in.
- Preserves the concurrently-added pool work it sits on: `searchLibrary` (hyphen-insensitive, prefix-ranked) powers the filter, and `customLibraryEntry` still offers "add X as your own" when the 153-lift pool genuinely has nothing.

**THE OLD PRIMARY, NOW THE DRAWER: WRITING THE PROGRAM OUT (2026-08-18, after "how i write the lifts makes no sense at all").** The first builder made you click "add a lift" → search → click a chip, once per lift per day. Nobody writes five training days that way. `src/programs/programText.ts` parses a whole week typed the way you would write it on paper:

```
Mon Push
Bench Press 3x8 @60
Overhead Press 3x8 @40
+ Lateral Raise 3x12-20 @6

Tue Pull
Deadlift 1x5 @100
```

Rules, deliberately few: blank line starts a day · the first line of a block is its name · `3x8` sets×reps, `3x8-12` a rep range · `@60` starting weight, `@bw` bodyweight · a leading `+`/`&` supersets with the line above. Also handles `3 x 8`, `3×8`, decimals, and unit suffixes.

- **NOTHING IS SILENTLY DROPPED.** An unreadable line returns in `problems` with its line number and reason and is shown under the box — the failure mode being avoided is pasting five days, keeping four, and finding out in the gym.
- **UNKNOWN LIFTS ARE KEPT** under the name you wrote ("Zercher Squat"), as `loadStyle: "free"`. A recognised name gets the library's canonical spelling (so the `workout_sets` bridge matches) and its defaults; catalog aliases resolve ("Squat" → Back Squat).
- **Round-trips.** `formatProgramText` regenerates the box from the design, so reordering a day with the arrows below flows back up rather than leaving two versions of the truth. `carryAuthoredSettings` preserves progression rules and notes (which have no written form) across a re-apply, matched on id AND name so a replaced lift never inherits the old one's settings.
- The structured editor stays, demoted to "adjust afterwards".

⚠️ **SECOND BUG FIXED — bodyweight was impossible to enrol.** `@bw` is weight 0, and every gate demanded `> 0`: the UI's "needs a starting weight", the wire schema's `.positive()`, and `seedForAddedExercises`. Push-ups, dips and unweighted pull-ups could not be started at all. Now 0 is a legitimate answer everywhere and only absent-or-negative is missing. The trap this walked into — `Number("") === 0`, which would turn every blank box into a deliberate bodyweight entry — is why `numericWeights`/`hasWeight` (in `builder.ts`) check the RAW STRING first; use them rather than parsing weight boxes inline.

⚠️ **BUG FIXED WHILE BUILDING THIS — `roundToLoadable` floored EVERY weight at the barbell** (20 kg / 45 lb), so a 6 kg lateral raise was prescribed at 20 kg and a bodyweight push-up at 20 kg. It barely showed while the app held only barbell programs; a self-designed week is mostly accessories and it showed immediately. Now takes a `loadStyle` (`"barbell"` default | `"free"`); `LoadExercise.loadStyle` is **absent on every catalog program**, so their rounding is byte-identical to before. `LibraryExercise.barbell` says which is which — distinct from `compound` (a dip is compound with no bar under it).

**5. A SHARED SET OF SHAPES — `src/programs/components/ui.tsx` (2026-08-18, after "the layout looks like a 10 year old made it").** The first builder used **seven font sizes in one component** and **three button languages in a single row** — lowercase text links ("close", "edit", "set up", "swap") next to bare icon buttons next to loose bordered chips. Each was a defensible local choice; together they read as unfinished. The fix was having a set to choose from, not making better one-off decisions.

- **Four type sizes, no others on these screens:** `TYPE.label` 10px uppercase · `TYPE.meta`/`hint` 11px · `TYPE.body` 12.5px · `TYPE.title` 13px. Every program surface is now 10/11/12.5 only.
- **Two button languages:** `IconButton` (reversible row manipulation — move, remove, expand; 44px touch target, 28px with a mouse, aria-label required) and `Segmented` (a choice between named alternatives). Anything else is an `Action` with a border and a label. The lowercase text links are gone.
- **`Segmented` replaces loose chips** for kg/lb, straight-sets/rep-range and progression: one bordered group with dividers, because loose chips do not say the options belong to each other — which is exactly why "kg lb" read as two unrelated buttons.
- **`Field` puts the label above the box and the unit inside it.** The row used to read "sets 3 reps 8 start at 60 kg" — a broken sentence rather than a form, saying the unit again after every number.
- Watch for the flex trap: `Segmented`/`Field` sit inside `flex flex-col` groups and stretched full-width until given `w-fit self-start`.

**6. Real route** — `app/programs/page.tsx`, **now reachable (2026-09-03)**. It shipped linked from nowhere: thirteen cited programs, a working engine, session logging that fed the tracking dashboard's own numbers, and the only way to open it was to type the URL. Everything about it passed — the route existed, the component rendered, the API worked. Existing is not the same as being reachable.

Three ways in now, all verified in the browser against the live database:
- **Tracking dashboard → Quick Actions → "Log a Workout"** (`QuickActionsCard`, `data-testid="training-link"`). Chosen over a fifth tab: a logged session already feeds this dashboard's numbers, and the mobile bar is full at four.
- **Life Mastery, after starting a program** — both the catalogue path (`WorkoutPrograms`) and build-your-own (`CustomProgramBuilder`) ended on "your first session is waiting" and named no destination. Both now show **Go to today's session** → `/programs`.
- **`ActiveProgramsPanel`'s "Manage" link**, which pointed at the `/test/programs` prototype from inside product code.

**Both ways to record a workout now live on this one page.** `ProgramsApp` for the prescribed session; `WorkoutLogger` (lazy-loaded, below a `Log any workout` divider) for anything done off-program. The free-form logger was previously mounted only inside `HealthTrackingPanel` on the archived goals hub, so a workout outside a program had nowhere to go. Both write `workout_logs`/`workout_sets`, so either route counts the same.

**Today's session also renders inline on the tracking dashboard** — the same `ActiveProgramsPanel`, lazy-loaded in `ProgressDashboard`, which renders NOTHING without an active enrollment. Verified live: enrolled, the panel appeared, logged the session from the dashboard itself. **The `gym_sessions_weekly` tile was confirmed too** — added to the tile row, it read **1** after that session, which is the bridge working end to end rather than inferred from the code.

**The free-form logger now warns before a second log on the same day** — `workoutsOnDate` in `healthService.ts` + a notice in `WorkoutLogger`'s add form. Two facts stored apart: a program session bridges into `workout_logs` and the free-form logger writes there too, with nothing linking them, so one gym session written up both ways counts twice on the week total, the streak, the heatmap and any linked goal. Not forbidden — people do train twice a day — so it is said out loud rather than blocked, and the warning names what is already there. Four tests in `healthService.test.ts`, including the 23:30-local case that a naive `toISOString().split("T")[0]` files a day late.

**THE SESSION WAS UNREADABLE, and the fix was mostly deletion (2026-09-03, user: "this implementation is shit").** Every set rendered as its own row of two number boxes, so an upper/lower day was twenty-four rows of `40 kg × 6 / 6–8 reps` — a sentence that is neither the prescription nor what you did, repeated until it filled the screen. Now each lift is **one line**: `describeSets()` in `programsService.ts` (pure, tested) writes `4 × 6–8 reps @ 40 kg`, and you open only the lift that went differently. Zero inputs on screen at rest; the edited lift is marked `changed`; the button reads **"Log session as prescribed"** until something actually differs.

Three things it refuses to do:
- **A wave never collapses.** 5/3/1 prints `35 kg × 5, 42.5 kg × 5, 47.5 kg × 5+` — saying "3 × 5" would be a lie about the program.
- **An AMRAP lift opens itself** and cannot be closed (`needsInput()`), because "as prescribed" would log the bottom of the range as your top set and progress you off a number you never lifted. The button drops "as prescribed" too.
- **No synthetic note.** The rep-range branch defaulted `note` to `"6–8 reps"`, which the new line rendered as `… @ 40 kg · 6–8 reps`. Removed, and asserted across the WHOLE catalogue in `engine.test.ts` — the default lived in the engine, so one program's test would not have caught it.

**Moved below Quick Actions, above Weekly Reviews** on the tracking dashboard. A five-lift day pushed everything else off the screen; a card you open the page for once a day should not outrank the ones you open it for every time.

**TWO ANSWERS TO "WHAT AM I TRAINING", AND NO WAY TO HEAR THEM DISAGREE (same session, user: "this isnt the workout program i picked in the project life mastery flow").** Two independent facts claimed it:
- the Life Mastery plan, which copied a program's **day names** into localStorage on start and stored **no program id at all** — so it could say Upper/Lower forever while the account was on something else, or on nothing;
- `program_enrollments`, which is what actually gets prescribed — and which only ever deactivates **within a discipline**, so a bodybuilding program from months ago keeps running after you start a strength one, through any of the **three** enrollment entry points (LM Templates, build-your-own, and the goals planner's `ensureEnrollment`).

`src/programs/components/RunningPrograms.tsx` is the fix: it reads the enrollments and states them — name, level, **started date**, and an End button — on the LM Templates tab and on `/programs`. It adds no third opinion; it shows the database's answer, which is the only one that decides what gets prescribed, and **names the disagreement** when the plan's written week matches none of them rather than silently overwriting either. `ProgramsApp` also now names the running program in the session header (it said `Today — Upper · Cycle 1 · Week 1` and never once which program that was) and opens straight to the session when there is only one, instead of a menu of one.

**AND THE STRUCTURAL FIX LANDED (same day).** `NsRoutine.program` — a `NsRoutineProgram` holding `programId`, `enrollmentId`, `label`, `startedAt` — so the plan REFERENCES the enrollment instead of copying its day names. Threaded through `applyProgramDays` → `applyProgramToWorkoutRoutine` → `NorthStarFlow` → `BuildBoard` → `WorkoutPrograms`/`BuildYourOwn`/`CustomProgramBuilder`; both start paths read the enrollment out of the POST response, which had been carrying it all along with nobody reading it.

`detachProgramFromRoutines()` closes the other end: ending a program from the band **keeps the written week and nulls only the claim that something tracks it**. Deleting the week instead would throw away one decision because a different one was reversed. Proven in the browser, start and end in one session:

```
AFTER START  { days: ["Workout A","Workout B"], program: { enrollmentId: "303d1965-…", … } }
AFTER END    { days: ["Workout A","Workout B"], program: null }
```

`label` is the one deliberate duplication: the plan renders signed out with no database to ask, and a blank there is worse than a possibly-stale name. Nothing that *decides* anything reads it.

**Ghost enrollments are now identifiable.** `listActiveEnrollments` derives `lastLoggedAt` from `program_session_logs` in ONE extra query (not N+1 — this list is read on three surfaces, one of them opened daily), and the band prints either `last logged <date>` or **"never logged — you may have started this and forgotten it"**. Not stored on the enrollment: a cached copy of a fact that lives elsewhere is the exact bug this area was being dug out of. `started in April` reads identically for a program trained weekly and one abandoned on day one; this is the line that tells them apart.

**WHAT A YEAR OF THIS LOOKED LIKE (2026-09-04, user: "not functional at all… imagine being a user using this for a year").** Seeded 150 real sessions against StrongLifts and opened the page. Four defects, one of them destructive:

1. **"End program" permanently deleted every session you had ever logged.** `unenroll()` was a hard `DELETE` on `program_enrollments`, and `program_session_logs.enrollment_id` is `ON DELETE CASCADE`. A year of training — 150 sessions — gone on one click, and the confirm() said "your logged sessions will be removed", which described the bug and was treated as a feature. **An enrollment is not scratch state; it is the record of what somebody did.** Now sets `is_active = false`, exactly as `enrollInProgram` already did when making way for a program in the same discipline. The partial unique index (`… WHERE is_active`) was already written for this. Proven live: after ending, 0 active enrollments and **150 sessions still on record**. The band's End button, which I had shipped with NO confirmation at all, now has one.
2. **The log could not be read.** History showed `logs.slice(0, 12)` as `ohp-day · C1 W1` — twelve rows of internal identifiers, no way to the other 138, and no answer to the only question a training log exists for. `summariseProgression()` (pure, 7 tests) now reports **first → latest, best, and session count per lift**, sorted by what moved most: `Deadlift 41.5 → 239.5 kg +198`. First/latest/best are three numbers on purpose — latest below best is a deload, latest equal to first after thirty sessions is a stall, and one "progress" figure hides both. Day ids are resolved to labels; all sessions are reachable.
3. **`Cycle 76 · Week 1`.** Engine bookkeeping on screen: a linear program has no cycles and its week never advances, so one number climbed meaninglessly beside one that never moved. `SessionPrescription.periodised` now comes from the schedule kind — 5/3/1 and couch-to-5k show cycle and week because they have them; StrongLifts shows **"Session 151"**.
4. **`20.4375 kg`.** Progression arithmetic divides; the panel printed the result raw. `formatLoad()` rounds to the finest increment a barbell actually has. Named `formatLoad`, not `formatWeight`, because `healthService.formatWeight(kg, unit)` already exists.

**Also fixed: cardio programs never reached the plan at all.** The Life Mastery start handler wrote to the plan only `if (schedule && isCustomizable(program))`, and `isCustomizable` is false for every endurance plan — so starting Couch to 5K enrolled you for real and told the plan nothing. That is literally "it isn't linked to what I chose". The reference is now always sent; day names are sent when the program has an editable day list.

**And `src/health/healthService.ts` is off the UTC-date allowlist.** `detectPersonalRecords` stamped PRs with `new Date().toISOString().split("T")[0]`, filing a 23:30 personal record on tomorrow — the class this codebase has now hit four times. Two more sites went with it, including `addDays`, which parsed a date string as UTC and then shifted it with local getters, so every correlation window came out a day short west of UTC.

**THE REST OF THE YEAR (2026-09-04, "do everything").** Simulated three more shapes of year — a clean 35-session run, a messy one with stalls and misses, and an abandoned program — and built what each exposed:

- **The shape between start and current.** `summariseProgression` now returns `points`, downsampled to 40 while always keeping the true first and last so the ends match the numbers printed beside them. `Sparkline.tsx` draws it: **one series, so no legend, no axes, and `currentColor` rather than a palette hue** — a single series has no identity to encode, and inheriting the row's ink is correct in both themes without a second set of values to keep in step. Hover is a native `<title>`, which a screen reader also reads. A flat run sits on the mid-line, not the floor: a stall is a real thing to see, and drawing it at zero would read as a collapse.
- **The 395 kg squat, asked about rather than capped.** A ceiling would be editing somebody else's cited program with a number we invented. `unbrokenRun()` counts back to the last missed rep; past `UNBROKEN_RUN_QUESTION_AT` (30) the panel says so and explains the mechanism — *missing reps is what tells the program to back the weight off*. **My first recommendation for this was wrong** and I said so: comparing prescribed weight to logged history catches nothing, because linear progression makes prescribed always track logged. The signal is the unbroken run itself, since these programs are *premised* on stalling.
- **Coming back after time off.** `daysSinceLastSession()` + `LAYOFF_DAYS` (21). No cited program has a rule for detraining, so the notice states the fact and leaves the decision. Whole days from wall-clock dates, so last night reads as "yesterday".
- **Programs you have finished.** Archiving kept the data but nothing read it, so a year of StrongLifts vanished the moment you switched. `listPastEnrollments` + `PastPrograms.tsx` — name, level, started, session count, last trained.
- **And the gap archiving itself created.** "Archived forever, no way out" is its own fault. `deleteEnrollmentPermanently` erases a finished program and its sessions, offered ONLY in the finished list, behind a confirmation that says the session count out loud, and **the repo refuses it on a running program** — verified live: `400 Only a program you have already ended can be deleted permanently`, and the program was still active afterwards. Two buttons far apart: the everyday one is reversible, the destructive one has to be asked for by name.

**Guarded by `tests/unit/navigation/routeReachability.test.ts`** — the sibling of `backNavigation.test.ts`, from the other end: that one asks whether you can get out of a screen, this one whether you can get in. Reachability is computed over each page's **component tree**, so a link in a component nothing renders counts for nothing, and it is **transitive** — a breadth-first walk from the doors into the app, so a link from a page that is itself an orphan counts for nothing either. Doors are all derived: home, tab destinations, exact redirect targets, redirect shims, `/auth/*`, dynamic routes, and a page that gates itself behind `ADMIN_SECRET_KEY` (a property of the page, not of the `/admin` path, so a future admin page without that gate is not excused). It deliberately does not count `ROUTE_LABELS` in `navTabs.ts`, which named `/programs` the entire time it was unreachable. **Verified by breaking it:** muting the `/programs` hrefs in all four linking components makes the walk report `/programs reached: false`.

A gate exempts EXACTLY its own route, never its children. The first draft matched by prefix, and since something redirects to `/dashboard`, every page under it was excused and the test checked almost nothing.

⚠️ **This test is currently RED, on purpose.** It found a second orphan on its first run: `/preferences/secondary-region` is a working page nothing links to and nothing redirects into, while the same setting is already changed inline on the Settings screen (`updateSecondaryRegionDirect` in `UserPreferences.tsx`, which links to `/preferences/archetypes` but never to this page). Kept rather than deleted or linked, on the user's explicit instruction (2026-09-03); recorded in `.test-known-failures.json` with the reason. Removing the page, or giving it a real way in, makes it green.

⚠️ **MIGRATION REQUIRED: `supabase/migrations/20260818_program_custom_schedule.sql`** (one `ADD COLUMN IF NOT EXISTS custom_schedule JSONB`). The enroll INSERT now writes this column, so **enrollment breaks entirely until it is applied** — not just customized enrollment. No new RLS policy: `program_enrollments` already carries own-row CRUD, and this is the user's own training plan sitting beside `exercise_state`.

Wire validation: `src/programs/schemas.ts` — a custom schedule is the only free-form JSON in this slice that the engine then executes, so every numeric field is bounded (set/rep counts, increments, percentages), not just typed. Tests: `customize.test.ts` (43) + `builder.test.ts` (47) + `programText.test.ts` (37) + 8 in `northStarService.test.ts`. Full suite green (3458).

---

What M1 deliberately does NOT do yet: manual-deload UX (engine auto-deloads); assistance-lift prescriptions for 5/3/1 (main lifts only, cited); today's prescribed session shown *inline* on the tracking dashboard rather than one click away. Catalog expansion (Starting Strength, GZCLP, PPL…) = add data files + list in `catalog.ts`.

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

## The lift pool, your own lifts, and drop sets

**The pool went from 55 lifts to 153.** Fifty-five is enough to swap a lift in a
cited program and not enough to design a week from scratch, which is what the
Customize step asks people to do. Every movement pattern in `PATTERN_ORDER` got
filled out — box squats and belt squats, good mornings and rack pulls, T-bar and
seal rows, weighted and neutral-grip pull-ups, the cable and machine variants of
every raise, planks and carries. Original entries still lead their group in the
picker; the additions sit under them, because the common lift should be the
first thing you see.

**Search was punctuation-sensitive and that was the reported bug**: "we have
assisted pull up, but not an actual pull up". Both were in the pool. Neither
could be found, because the names carry hyphens — Pull-up, Chin-up, Push-up,
T-Bar Row — and nobody types the hyphen, so a raw `includes` matched nothing and
the picker answered "nothing called that" about a lift it was holding.
`searchLibrary` now squashes everything that is not a letter or a digit, ranks a
name that STARTS with the query above one that merely contains it, and carries a
small alias table for the words people use that are not the canonical name
("military press", "press up", "rfess"). Matches on an alias sort last.

**You can write your own lift.** `customLibraryEntry(name, pattern)` builds a
library-shaped entry that goes straight into the day being edited. It does NOT
join `EXERCISE_LIBRARY`: that pool is what everyone's editor offers and what
every catalog program is checked against, and growing it from user input would
make one person's "Cable Thing" everybody's and make `patternForName` answer
differently depending on who asked. The pattern is asked for rather than
guessed, because it decides what the swap picker offers in that slot later. It
arrives free-loaded with no starting weight: guessing barbell floors a 6 kg
movement at the 20 kg bar, and a made-up suggestion under a made-up lift is a
number pretending to be advice.

**Drop sets are a modifier, exactly like supersets.** `dropSets?: number` on
`LoadExercise`, 1–4, set from a `Segmented` on the lift row and cleared by the
same control. **Nothing in `applyLog` reads it.** Drops are extra work at a
weight you did not choose; counted as sets they would tell the engine the
working weight had collapsed and deload a lift that is going fine. It rides
through `carried()` into the prescription so the person training on Tuesday is
told, and no further.

It also round-trips through the written form. `formatProgramText` writes
`Bench Press 3x8 @60 +2 drops` and `parseProgramText` reads it back — it had to,
because the parser's last rule is "whatever is left is the name", so an unread
suffix would come back as a lift called "Bench Press +2 drops", matching nothing
in the library and nothing in `workout_sets`. The trailing marker cannot be
confused with the leading superset `+`, which is anchored to the start of a line.

Covered by `tests/unit/programs/lifts.test.ts` (21): the hyphen spellings, the
ranking, no duplicate ids or names, every pattern populated, every entry
resolving to its own pattern, the custom entry staying out of the shared pool,
and drops leaving scheme and progression untouched while surviving the text.
