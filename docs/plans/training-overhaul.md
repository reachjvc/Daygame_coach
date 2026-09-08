# Training that works like training — plan

**Status: EXECUTING.** Written 2026-09-06/07, approved 2026-09-07.

| Phase | State |
|---|---|
| **0 — the numbers stop lying** | **DONE 2026-09-07.** |
| **1 — one record per workout** | **DONE 2026-09-07.** |
| 2–8 | not started |

See the execution log at the end for what each phase changed and how it was
verified.


**How it was made.** The whole training slice read in full; every training screen
screenshotted on a 390px phone and a 1280px desktop (`.playwright-mcp/audit-*.png`);
a seven-reader audit (logging flow, Life Mastery follow-through, page and look,
progress tracking, data model and clocks, engine and catalogue, tests and
harness) whose 118 findings were each handed to two independent sceptics — one
checking the cited code, one asking whether a lifter on a phone is actually
hurt — and every finding used below re-read by me at the cited line; four
read-only probes and one edit against the real database; and a market read
(appendix). **Then the plan itself was attacked** by four independent critics
(a non-programmer reading Part 1, an engineer opening every file-and-line
claim in Part 2, a ten-year lifter, and a checker holding the plan against
the request word by word). They found 54 defects, 21 of them must-fix — a
schema rule that would have made "delete a program" impossible, a live workout
that could not be inserted, every dashboard number counting an unfinished
workout, the CI claim being wrong, iPhone Safari having neither vibration nor
page notifications, and a blockers section written as statements instead of
questions. A completeness critic then found three more faults none of the
seven readers had walked. All are fixed below; the list is in "Review pass"
at the end.

**What I already changed** (say if that was wrong): on the shared *test*
account only, I deleted three dashboard workouts through the app's own API —
two were mine from the screenshots, one had been left by the automatic browser
test at 20:47 — and removed the throwaway test files I wrote. The browser test
also removed my screenshot enrollment itself. Nothing on any other account was
touched.

---

# Part 1 — For you (plain language)

## Words used below

- **Migration** — a scripted change to the database's layout, one file, run
  once. This plan has one per phase that needs one.
- **Replay** — how the engine works out today's weights: it re-reads every
  workout you ever logged, from the first, and applies the rules again. So the
  stored workouts are the only truth; anything missing from them is missing
  from your numbers.
- **Permission (row rule)** — the database rule that says a signed-in person
  may read, add, change or delete *only rows that are theirs*. Adding one is a
  security decision, so it is always asked, never assumed.
- **localStorage** — this one browser's private memory. Gone on another phone,
  gone when the browser is cleared, never seen by the server.
- **Reps / sets / AMRAP / RPE / 1RM / training max / e1RM** — repetitions and
  groups of them; "as many reps as possible" (a set with no fixed count); how
  hard a set felt, 1–10; the heaviest you could lift once; the number 5/3/1
  calculates every set from (90% of your 1RM); the 1RM *estimated* from a set
  of several reps.
- **Test account** — a throwaway login every automatic check uses. Not you.

## The one-sentence version

The training feature was built as a **form you fill in after the gym** — one
button, "I did all of this — save it" — when a workout is a thing you do **one
set at a time, over an hour, with the phone locking between sets**. Almost
everything else that is wrong follows from that, plus a history that is stored
twice and disagrees with itself, an engine that scores what you did wrongly in
four separate ways, and templates from Life Mastery that live in one browser
instead of in your account.

## What is wrong, specifically — and how each one was checked

Every item says whether it was **seen** (screenshot), **read** (file and line),
or **proven** (run against the real database). Nothing here is an impression.

### A. Logging a workout

1. **Logging is a form, not a workout.** *Seen* (`audit-01`, `audit-02`). One
   orange button saves the whole session at the end. Until you press it,
   nothing is saved — everything you typed lives in the open tab
   (`TodaySessionWidget.tsx:63-112`). Phone dies at set twelve, iOS drops the
   tab, you tap the wrong link: twelve sets gone. No set can be ticked off; no
   "previous: 60 × 8" beside a set unless you open the lift; the rest timer
   starts only from a tiny grey "rest" button inside an opened lift, and it
   renders at the *top* of the card, hundreds of pixels above the set that
   started it (`:338`, `:437`).

2. **The one-tap save logs the *bottom* of every rep range — so on the three
   bodybuilding programs the weight can never move.** *Read*
   `programsService.ts:196-197` (a 6–8 lift is prescribed as 6),
   `TodaySessionWidget.tsx:100` (the form is seeded with that 6), `:383-389`
   (weight moves only when every set hits the *top*, 8). Press "I did all of
   this" on Push/Pull/Legs, Upper/Lower or PHUL for a year and nothing
   progresses unless you open every lift and type the top number four times.
   **This is the exact mechanism behind the complaint about that button.**

3. **A blank box saves a zero, which crashes the save halfway.** *Read*
   `TodaySessionWidget.tsx:135-136` (an empty box becomes 0; the comment on
   `:130` claims a blank falls back to the plan — it does not); the save
   request accepts 0 reps (`log/route.ts:14`); the dashboard copy refuses it
   (`20260305_create_health_tracking_tables.sql:101`). Order of writes at
   `programRepo.ts:555-557`: weights advanced, session written, *then* the
   copy fails. The screen shows nothing (`:152` has no failure branch).

4. **A retry after that half-failed save logs the session twice**, advancing
   your weights twice. *Read* `programRepo.ts:649` — nothing makes a save
   happen once. (The button itself is disabled while saving; the double comes
   from pressing again after the silent failure in item 3.)

5. **Editing a past session silently does nothing.** *Proven.* I sent a
   correction (9 reps) through the app's own edit request; it returned success,
   and the row still says 6. The sessions table has read / add / delete
   permissions but **no "change" permission**
   (`20260618_create_program_tables.sql:71-77`), so the database quietly
   refuses (`programRepo.ts:591`) and the app never notices. There is also no
   button in the app that edits a session — only delete
   (`ProgressionView.tsx:187-205`). "Fix a mistake" was claimed shipped and is
   not.

6. **Saving is three separate writes with no undo.** *Read*
   `programRepo.ts:555-557`. State, session, copy — if the second or third
   fails, the weights have moved and there is no workout to replay from.

7. **You cannot write down what actually happened.** *Read*
   `types.ts:427-435`. No warm-ups, no per-set notes, no RPE, no "skipped this
   lift", no "swapped for cable row because the rack was taken", no per-side
   for lunges, no real duration, no distance for a run. The request and the
   database already accept several of these (`log/route.ts:20-21`,
   `20260716_add_workout_set_details.sql`) and the screen never sends them.

8. **A program session cannot be dated.** *Read* `log/route.ts:6-22`,
   `programRepo.ts:649`. Yesterday's forgotten session lands on today, on both
   copies.

### B. The maths

9. **A lift you skip is scored as a lift you failed.** *Read*
   `programsService.ts:584` — no entry means "missed every rep". Skip the leg
   press three times because the machine is broken and the engine deloads it
   10%. Skipping a whole 5/3/1 squat day in week 3 counts as missing the top
   set and cuts the training max 10% (`programRepo.ts:521`,
   `programsService.ts:430`).

10. **Lighter sets count as hits, and heavier sets are ignored.** *Read*
    `programsService.ts:585-586`, `:383-389` — only reps are compared. 5×5 at
    60 kg when 80 was prescribed earns +2.5 kg on 80. And the test named "the
    weight actually lifted is what progresses"
    (`tests/unit/programs/builder.test.ts:686-710`) pins that 65 kg lifted at a
    prescribed 60 progresses to 62.5 — less than you just did.

11. **Calisthenics promotes you every time you press the button.** *Read*
    `programsService.ts:497` — the prescription pre-fills the *unlock*
    threshold as the reps, so "as prescribed" always unlocks the next
    variation. Calisthenics and mobility also progress the cursor's day, not
    the day you logged (`:512`, `:556`) — the bug fixed for lifting on
    2026-08-19 still lives in the other two engines.

12. **Deleting a session forgets your skips and resets.** *Read*
    `programRepo.ts:516-523` (a skip writes no record), `:404` (reset),
    `programsService.ts:1099-1119` (replay folds only logged sessions). Delete
    any past session and every skipped session is prescribed again and a reset
    is undone.

13. **"Today" is the server's clock, not yours.** *Read* `programRepo.ts:482`
    — the server (which runs on London's clock, UTC) decides the weekday. For
    a week pinned to weekdays, anyone east of London gets yesterday's session
    after local midnight; anyone west gets tomorrow's from late afternoon. The
    week strip meanwhile uses the phone's clock (`WeekStrip.tsx:83`) — two
    clocks, one screen. The helper that reads the account's timezone exists
    (`settingsRepo.ts:153`) and every other counter in the app uses it.

14. **Rest time is guessed from the set count.** *Read*
    `TodaySessionWidget.tsx:443` — four or more sets means "compound". A 3×5
    squat gets 90 seconds; 4×12 curls get three minutes; a 5/3/1 top single
    gets 90 seconds.

15. **Four cited programs are not what they cite.** *Read*
    `stronglifts5x5.ts:14-26` (deadlift climbs 2.5 kg a session; StrongLifts
    says 5 kg / 10 lb, dropping to 2.5 once 5 stops working);
    `programsService.ts:421-441` (5/3/1 checks a missed top set in week 3
    only, assumes the last logged set is the AMRAP, and prescribes the deload
    week off the just-bumped max); `pushPullLegs.ts:4-10,48` (cites the
    r/Fitness PPL but encodes a generic three-day split with no deadlift and no
    A/B days); `recommendedRoutine.ts:23-38` (cites the r/bodyweightfitness
    routine, which works in 5–8 rep pairs and 8–12 core, but encodes unlock
    targets of 12/12/10/8/5 and has no dip, hinge or row ladders). Each is a
    decision for you (Q7–Q11, Q16) because it changes a cited program's
    numbers.

16. **The exercise library has lifts that cannot progress sensibly.** *Read*
    `exerciseLibrary.ts:322-324,334` (plank, side plank, farmer's carry are
    "3 × 1 rep" lifts that gain 2.5 kg a session), `:277` (assisted pull-up's
    suggested weights *rise* with level — more weight is more help); every
    dumbbell, cable and bodyweight lift gets a barbell plate line ("12 kg
    lateral raise: just the bar", `TodaySessionWidget.tsx:456`) and the
    barbell's 2.5 kg step (`programsService.ts:69`), so "+1 kg" on a lateral
    raise never moves; and there is no bar-weight or smallest-plate setting at
    all (`config.ts:97-99` says "later"), so a gym with only 2.5 kg plates can
    never load 62.5.

### C. The history and the numbers

17. **Your history is stored twice and the copies disagree.** *Read* + *seen*.
    Every program session is copied into the dashboard's workout list with a
    made-up **45 minutes** and **intensity 3** (`config.ts:102-103`; "45min" on
    `audit-04`). Deleting a program session leaves the copy
    (`programRepo.ts:573-640` never touches `workout_logs`); deleting the copy
    on the Workouts tab leaves the program's; editing (item 5) reaches neither.
    So "Total gym sessions", "Training hours", the heatmap, the lift charts and
    the CSV all keep sessions you removed and hours you never trained.

18. **Personal records never fire for a program session.** *Read*
    `WorkoutLogger.tsx:198-200` (the only PR check runs after a free-form
    save), that check looks back **90 days** only (`:108`; the database query
    cuts there, `healthRepo.ts:207-216`), and a rep record at a lighter weight
    is never a PR (`healthService.ts:226-234`).

19. **The week strip says "done" forever.** *Read* `ProgramsApp.tsx:223` —
    the strip is handed every weekday you have *ever* trained on, not this
    week's. After one full week every training day reads "done" for good.

20. **The 1RM tiles match one exact name.** *Read* `healthRepo.ts:472` — a
    self-built program's "Back Squat" never counts toward "Squat 1RM"; "Gym
    sessions" counts runs, yoga and mobility too (`healthRepo.ts:284-293`).

21. **A pounds user sees kilograms.** *Read* `LiftHistory.tsx:105` prints
    `kg` unconditionally; the History fold on the other tab prints the
    program's unit. Same lift, two numbers.

22. **Progress is a list of dates.** *Seen* (`audit-03`), *read*
    `ProgressionView.tsx:222-247`. History is "Upper · cycle 1, week 1 ·
    9/6/2026" with a bin icon — the set-by-set data is loaded and never shown.
    A per-lift line exists behind a fold; "Your lifts over time" exists only on
    the other tab under the free-form form. No PR list, no volume, no "3 of 4
    sessions this week", no calendar of program days, no estimated max, nothing
    per muscle group, no program completion. The Workouts card even promises
    "volume stats" (`WorkoutLogger.tsx:667`) that do not exist.

23. **A Couch to 5K runner's history is 27 identical rows and 0 km.** *Read*
    `TodaySessionWidget.tsx:145`, `programRepo.ts:681-682`. Planned minutes are
    stored as actual, distance is never sent.

24. **The dashboard copy of the widget is a cut-down copy.** *Read*
    `ActiveProgramsPanel.tsx:54-57` hands it only four of the pieces of
    information the full card gets — no "last time", no day picker, no layoff
    notice, and no way to finish a finished program — and then embeds the whole
    thing at the bottom of a 3,396px page (`audit-06`).

### D. Life Mastery → training

25. **The link from the plan to the program is dropped whenever a program has
    no day names.** *Read* `northStarService.ts:1334` and `:1278` — the plan
    is returned unchanged when the day list is empty, *before* the program
    reference is looked at. Every running plan (Couch to 5K, 5K→10K,
    triathlon) and every program started from the goals planner
    (`src/goals/components/new-goals/NewGoalsFlow.tsx:177`, whose enrolment
    happens in `app/api/goals/plan/route.ts:34-49`) records nothing in the
    plan, despite the comment at `WorkoutPrograms.tsx:246-256` saying the
    reference "is always sent".

26. **"Your written week differs" compares against the catalogue, not your
    program, and offers no fix.** *Read* `RunningPrograms.tsx:113-118` —
    `getProgram(e.program_id).schedule`, never your edited copy. A program you
    built yourself is compared with the shell's placeholder day
    (`data/customProgram.ts:38`, "Back Squat"), so the warning fires the moment
    you start your own week, and the only action on offer is starting another
    program.

27. **Starting or ending on the Training page never tells the plan.** *Read*
    `ProgramDetail.tsx:80`, `ProgressionView.tsx:113`, `ProgramsApp.tsx:237` —
    none call `applyProgramReference` / `detachProgramFromRoutines`
    (`northStarService.ts:1302`, which exists and is unused there). The plan
    can point at a dead program forever.

28. **"Reset" on a program you built replaces it with a placeholder squat
    day.** *Read* `EditActiveProgram.tsx:127,146` → `editableSchedule(program,
    null)` (`customize.ts:84`) → the shell's one-day "Back Squat" schedule.

29. **A week you build lives in this browser only** (localStorage key
    `custom-program-v1`, `BuildYourOwn.tsx:19-25`) until you press Start, and
    Start needs an account the page does not assume. After Start the builder
    still says "Start tracking this" (`CustomProgramBuilder.tsx:423`; its
    "done" state is forgotten on the next visit); pressing it again silently
    starts a *second* copy from the builder's starting weights and pauses the
    one you were progressing on (`programRepo.ts:218-224` — the paused one
    keeps its weights, but it is no longer what you train). Weekday pins from
    the builder are dropped on the way into the plan
    (`northStarService.ts:1281-1289` copies names only), so the two screens
    show different weeks.

30. **Two designers for one training week that never meet.** *Read*
    `RoutineCard.tsx:570-618` (the Systems tab lets you name and reorder
    training days) versus `BuildYourOwn.tsx` (the Templates tab lets you fill
    them). Days named on Systems never become a program; a program started on
    Templates overwrites the Systems days.

31. **Three unrelated things are called a template:** an edited catalogue
    program (`custom_schedule`), the build-your-own design
    (`custom-program-v1`), and the free-form logger's saved workouts (table
    `workout_templates`, `WorkoutLogger.tsx:387`). They cannot see each other.

32. **The Training page links to a page that does not exist in production.**
    *Read* `TrainingScreen.tsx:69-72` → `/test/life-mastery`, and
    `app/test/layout.tsx:8-9` returns **404 for every `/test/*` page on the
    deployed app**. So for a real user, "Part of your Life Mastery plan" under
    the page title is a dead link. The live, account-wired Life Mastery is
    `/dashboard/goals/plan` (`app/dashboard/goals/plan/page.tsx`).

33. **With a program running, the Templates tab still offers the whole
    catalogue** with a live Start that replaces without confirming
    (`WorkoutPrograms.tsx:291-345`, `audit-07`), and the tab is **5,489px tall
    on a phone**, the fourteen section tabs rendered as fourteen full-width
    cards before any content. Catalogue edits made there are lost on a
    discipline switch (`WorkoutPrograms.tsx:86-89`) with no warning.

### E. The page and the look

34. **The page leads with chrome.** *Seen* (`audit-01`). Back link, "Training",
    a sentence linking to a dead page, a two-pill switch with no visible
    question, a metadata line, a mostly empty card saying there is no week
    ("Runs in order rather than on set days") — then the first lift.

35. **Two rows of day controls with opposite meanings sit a few pixels
    apart:** week cells *reassign the schedule*, "Logging" chips *pick the
    session* (`WeekStrip.tsx:164`, `TodaySessionWidget.tsx:226`).

36. **An opened lift is unlabeled boxes with "kg ×" wrapping onto two lines**
    (`audit-02`); inputs and the rest / ± set / delete controls are 22–32px
    tall on a phone against the app's own 40–44px (the shared input is 44px on
    phones and `className="h-8"` at `TodaySessionWidget.tsx:417,430` overrides
    it; `:446` for the 22px "rest" button).

37. **Four accent colours for "selected" and nine type sizes on one page**,
    against the kit's own four-size rule (`ui.tsx:13`, `WeekStrip.tsx:168`,
    `TodaySessionWidget.tsx:238`); the lift rows, the day chips, the small
    buttons and the orange save button are four button styles; the running
    program editor on `/programs` is styled in Life Mastery's dark classes
    (`EditActiveProgram.tsx:99-166`); level and unit toggles are drawn three
    different ways across `ProgramDetail`, `ProgramPicker` and the builder.

38. **Two "Change this program" buttons in two styles** (`ProgressionView.tsx:268`,
    `EditActiveProgram.tsx:103`), the second one left behind after Cancel.

39. **No way back that names where you came from.** The back link always says
    "Dashboard" whichever of five entrances you came from; `/programs` pads
    for a bottom tab bar it does not render (`TrainingScreen.tsx:61`) and is
    narrower than the dashboard it came from (`max-w-4xl` vs `max-w-6xl`).
    Polish, per the sceptics — but polish you see on every visit.

40. **Copy written by the engine:** "Session 3", "Cycle 1 · Week 1", "Today —
    Pull" on a day you picked yourself, "Rest day — Upper", "Logging",
    "Anything else", "asked for 5", "Logged — next session updated", and a
    save button that changes its own name three ways
    (`TodaySessionWidget.tsx:203-212,382,513-519`).

41. **With two programs running the page becomes a menu with no "today"**, and
    it arrives blank and fills in instead of arriving drawn
    (`ProgramsApp.tsx:45`, `app/programs/page.tsx:44`).

42. **Supersets are never shown in the session** — the pairing reaches the
    prescription and no screen draws it (`types.ts:365`).

### F. Tests and proof

43. **Every real gym flow above the pure engine is untested.** No test renders
    the session widget; the one phone test never reads back what it saved
    (`mobile-training.spec.ts:113-119`); in CI (the automatic test run on every
    code change) that spec runs on iPhone only, under the `mobile-iphone`
    project (`playwright.config.ts:332-342`) — the named `training-*` projects
    for Android and Firefox never run (`.github/workflows/e2e.yml:71`); run
    locally, four copies of the same test wipe the shared test account at the
    same moment and trip each other.

44. **Two tests pin wrong behaviour.** The test meant to prove a correction
    changes the result compares half of its result with itself
    (`engine.test.ts:1051-1053`, so that half can never fail); the builder
    test in item 10.

45. **The rule that decides whether today is a training day sits where no
    automatic test can reach it** (`programRepo.ts:475-509`, the database
    layer), so nobody can prove it right without a live database.

### G. Found by the completeness pass (the flows the seven readers did not walk)

46. **Deleting or correcting any past session throws away the starting
    weights you typed.** *Read* `programRepo.ts:599-613` — the replay
    re-seeds the program from the **catalogue's level defaults**
    (`seedEnrollment(program, level, unit)` with no typed weights or maxes),
    not from what you entered at enrolment. Started StrongLifts at your real
    100 kg squat, reached 125, delete one mistyped session: your next squat is
    prescribed from the catalogue's 60. On a self-built program or 5/3/1 there
    are no defaults to seed from, so the delete goes through and *then*
    errors.

47. **The Training page can say "No active program" right after you started
    one.** *Read* `useEnrollment.ts:63` (once the shared list has loaded, a
    later mount never re-fetches) and `:93` (a fresh server-provided list is
    ignored when the store already holds anything). Press "Start tracking
    this" in Life Mastery, tap "Go to today's session": the page shows the
    stale list — no program, or the one just replaced.

48. **There is no way to lower a working weight once a program is running.**
    *Read* `EditActiveProgram.tsx:65` (asks weights only for lifts that are
    *new*), `customize.ts:477` (the save skips any lift that already has
    state). Attach StrongLifts in the goals planner without typing weights and
    session one prescribes a 60 kg squat you cannot do, permanently, short of
    ending the program.

49. **Two of the three ways to start a program still pause a self-built one
    without a word.** *Read* `programRepo.ts:266` (`ensureEnrollment` discards
    the `displaced` list), `ProgramDetail.tsx:79` (reads only `enrollment`).
    The notice exists on the Life Mastery path only.

50. **The goals planner is a one-way door.** *Read* `app/api/goals/plan/route.ts`
    (only ever enrols), `programRepo.ts:265` (typed weights for a running
    program are discarded), `ProgramPicker.tsx:69` ("Will enroll you on save"
    shown either way); with a self-built program running, the picker shows a
    phantom "Back Squat" box from the shell (`GoalsConfigStep.tsx:2131`).

51. **A brand-new user is never shown where to start a program.** *Read*
    `TrainingScreen.tsx:57` — with no program the page opens on the free-form
    logger under "What are you logging?"; the dashboard entrance says "Log a
    Workout"; the goals-page embed renders nothing by design.

52. **Text a phone cannot read, toggles a screen reader cannot hear.**
    *Measured:* 10px `zinc-600` on the Templates tab is 2.4:1 contrast, 11px
    `zinc-500` is 3.9:1 (the minimum is 4.5:1); eight choosers in
    `ProgramPicker` / `WorkoutPrograms` show their state by colour only, with
    no `aria-pressed`; the week strip's "done" is absent from its spoken label
    (`WeekStrip.tsx:165`). A refused permanent delete is silent
    (`PastPrograms.tsx:107`).

## What you will be able to do, phase by phase

Each phase leaves the app working. Later phases build on earlier ones; the order
is the order they must ship in.

| Phase | What changes for the person using it |
|---|---|
| **0** | The numbers stop lying. Skipping is not failing; lighter sets do not earn weight; a heavier set counts; calisthenics stop auto-promoting; "today" is your today; rest time is decided by the lift; a blank box is a blank box; the four cited programs match their sources (per your answers). **Two things you will see:** a lift with a rep range (6–8) now asks you for the number instead of assuming 6; and once the corrected rules re-read your history, the next weight a lift prescribes could go up or down — before that is saved you get a table (each lift, today's number, the corrected number) and you approve it. |
| **1** | Nothing new to tap yet; underneath, one history instead of two. Deleting a workout removes it from every count and chart; a retry can no longer log twice; the edit that silently failed now works (the button to use it arrives in Phase 4); a workout can be dated (the form arrives in Phase 3). **What you will see:** the made-up "45min" disappears from your history, replaced by the real number you enter. |
| **2** | **Train set by set.** Start a workout, tick each set as you do it (pre-filled from the plan and last time), rest timer starts itself where your thumb is, phone can lock, app can be killed, you come back to where you were. Finish gets a summary: time, volume, PRs, what the program will ask next time. Warm-ups, notes, RPE, skip a lift, swap a lift, reorder, add a set, "didn't finish, don't count it", each side — all in the moment. |
| **3** | The same live screen for a workout that is not on a program, and a dated "log a past workout" form. "Templates" become one thing: a training week you own, in your account, startable from anywhere. A year of realistic training can be seeded on the test account so every later phase is checked against real-looking data. |
| **4** | History you can read set by set and correct in place, each row showing the lifts and their top set. A Progress tab: this week's adherence, PRs (all-time, weight, reps and estimated max), each lift over time in your unit, estimated maxes that recognise your lift names, weekly volume, sets per muscle group, a calendar. |
| **5** | Life Mastery flows through, in both directions and on every device. A week you build there is saved to your account and shows on the Training page; a program started or ended anywhere updates the plan the next time it opens; the Systems tab shows what is running instead of a second week; the Templates tab shows the program and a way to change it — not the catalogue again — and fits a phone. |
| **6** | The dashboard shows a small training card — "Workout in progress · 23 min · Resume", or "Today: Upper · 6 lifts · Start" — plus this week's dots and your last PR. |
| **7** | One look and one voice: every control on every training screen uses the same kit, the copy is written for a person in a gym, a real way back, and the text passes contrast and touch-target checks. |
| **8** | It is proven: the live flow runs on iPhone Safari, Android Chrome and Firefox in CI without tripping over itself, including with no signal; the two wrong tests are fixed; the whole thing is attacked before it is called done. |

## What is in the real database right now

Counted read-only on 2026-09-07 after my cleanup:

| Rows | Count | Whose |
|---|---|---|
| Program sessions | 2 | one account, not the test account — most likely yours |
| Dashboard workouts | 2 | the copies of those two sessions |
| Sets | 38 | in those two workouts |
| Saved free-form templates | 2 | |
| Program enrollments | 5 (all active) | three accounts, one of them the test account's leftover from the browser test |
| Duplicate set slots (would break the new unique rule) | 0 | |
| Sessions whose copy lacks its sets (would lose data in the merge) | 0 | |

Both "would break" checks are the migration's own pre-conditions, already
passing.

## The two decisions everything is built on

**One record per workout.** Today a program session is written into two tables
that do not know about each other (`program_session_logs` for the engine,
`workout_logs` + `workout_sets` for the dashboard). The plan keeps **only the
second**: `workout_logs` gains the program context (which enrollment, which
day, which cycle and week, what you skipped or swapped) and `workout_sets`
gains the program's exercise id and a library id, so the engine reads the same
rows the dashboard reads. `program_session_logs` is folded in and dropped. This
is the fix for items 4, 5, 6, 12, 17 and 18 at once, and it is the moment to do
it: two real sessions exist. Next year it is a migration nobody wants to run.

**Templates live in your account.** A training week you build is a row in a
new `program_drafts` table, not a key in one browser's memory. Starting it
makes an enrollment as today; the draft stays as the thing you can start again
or copy. The free-form logger's saved workouts migrate into the same table (a
saved workout is a one-day program that does not progress), so there is one
word, "template", and it means one thing everywhere. The Systems tab's day list
becomes a *view* of the running program, not a second place to design one.

## Decisions already taken — say if you disagree

These could all be done and the plan does them, so they are not questions.

- An in-progress workout lives **on the server** (one per account) **and** the
  browser keeps a queue of anything that failed to send — including the
  "start" itself — so a gym with no signal still lets you start, tick sets,
  and finish once signal returns.
- Warm-ups: **StrongLifts' own scheme for StrongLifts** (credited); everywhere
  else a ramp labelled "our suggestion", off by default, one tap to add. Never
  counted toward progression or PRs.
- The Life Mastery link goes to **`/dashboard/goals/plan`** (the live page) and
  shows whenever the account has an active program, on every device.
- The dashboard's full session widget is **replaced** by a small training card.
- The Life Mastery section tabs become a **sideways scroller on phone-width
  screens**.
- The after-the-fact form stays, demoted to **"Log a past workout"**, with a
  date and time.
- A workout left open is **finished or discarded by you**, never auto-closed;
  the finish screen lets you set when it really ended (default: your last set).
- **Bar weight and smallest plate** become settings on your account (with a
  per-program override); the engine snaps every prescription to what your gym
  can load, and says so when a program's increment is smaller than your plates.
- In a superset, the rest timer starts after the **last** exercise of the pair,
  not after the first.
- Rest per exercise is **editable from the live screen** in two taps, and 5/3/1
  carries shorter rest before its light sets and longer before the top set.
- **Estimated-max PRs** count (85 × 8 beating a previous 90 × 3 is a PR).
- Tapping a lift's name opens its **history sheet**: the last three sessions,
  all sets, its PRs, last note.
- **Your written Life Mastery plan itself still lives in each browser**; only
  the training week (the draft) and the program are in your account. Moving
  the plan is Q17.

## What this deliberately does NOT do

- **Does not change any cited program's numbers without your answer** (Q7–Q11,
  Q16). Warm-up suggestions and rest defaults are ours and labelled ours; where
  the source specifies them (StrongLifts warm-ups *and* rest) the source is
  used and credited.
- **Does not buzz an iPhone that is locked.** A web page on an iPhone cannot
  vibrate or send a notification while the phone is locked; you see the
  countdown, correct to the second, the moment you wake it. On Android and
  desktop the app can notify. A real buzz on iPhone needs the app installed to
  the home screen plus a push from the server — the time tracker's service
  worker (`public/sw.js`) is the starting point, and it is about one extra
  phase of work; say if you want it queued after this plan.
- **Does not add a new visual style.** It removes two of the three that exist.
- **Does not move your Life Mastery plan into your account** (Q17). Until that
  is done, the plan is still lost on a new phone; the training week and the
  program are not.

## Manual blockers — ANSWERED 2026-09-07: yes to all eight, and "go with your recommendations" on every open question

Recorded here so whoever executes this does not have to ask again. Blocker 1
was answered yes *and* queried ("I don't get why that is necessary"), so its
full reasoning is written out below; if that reasoning changes your mind, the
fallback is in its last paragraph and nothing else in the plan moves.

Each was one question you could answer "yes", "no" or with a decision; each
says what I tried and what I recommended.

**1. May I let a signed-in person create, change and delete their own saved
training weeks in the database, and change three new settings on their own
profile (weight unit, bar weight, smallest plate)?** **Answered: yes.**

*Why this has to be asked at all.* The database is not hidden behind the app.
The key the website uses to talk to it is public: it is shipped to every
visitor's browser, and anyone can read it out
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `src/db/supabase.ts:14`). So the database
cannot assume "only my app is calling"; it has to decide for itself who may
see and change each row. That decision is the row rule. `scripts/audit-rls.ts`
says it in its own header: *"anyone can read it out of their browser. So the
database itself has to decide who may see and change what; it cannot trust the
app to ask nicely."*

*Why a new table cannot work without one.* With the rules switched on and none
written, the answer to every request is no — including yours to your own row.
That is the safe default and it is why this is not optional plumbing: without
the four rules, "save my training week" fails for everybody, silently, the
same way the edit bug in item 5 fails today (that bug **is** a missing rule).

*Why it is a security decision and not a formality.* The rule is one line, and
the line is exactly what separates "your rows" from "everyone's rows".
`auth.uid() = user_id` means only yours. Written wrong, or written as "always
allow", it means anybody signed in can read and edit anybody else's. That is
the whole reason `CLAUDE.md` says never to write one without asking, and why
the audit script runs before it ships.

*What is actually being asked for, and the precedent.* Four rules on one new
table (`program_drafts`), all of the form "only your own rows": read, add,
change, delete. Your saved free-form workouts already have exactly these four
(`20260715_create_workout_templates.sql:26-35`), and a saved training week is
the same kind of thing — text you typed, about yourself, that nobody else has
a stake in. Nothing cross-user, nothing earned or computed, no change to the
service key.

*Why the three profile settings need a separate line.* On 2026-08-28 a real
paywall bypass was found and fixed here: a signed-in person could change *any*
column of their own profile row, including `has_purchased`, and grant
themselves premium. A row rule cannot fix that, because a row rule only sees
which row you touched, never which column. So the blanket permission was
revoked and an explicit list of safe columns was granted back
(`20260828140001_profiles_rls_hardening.sql:35-46`). The consequence: **any
new profile column is unwritable until it is added to that list.** Weight unit,
bar weight and smallest plate are three names on that line. Skip it and the
settings toggle fails silently, which is the exact class of bug this plan
exists to remove.

*The second, smaller risk, stated plainly.* Once the engine reads from the
dashboard's tables, a signed-in person could hand-edit *their own* workout's
program fields through the raw database and confuse *their own* numbers.
Nobody else's. The one case that would not be self-only — pointing a workout
at somebody else's program — is refused by a database trigger (Phase 1),
because that rule has to hold for every caller, not just the app.

*Attempted:* confirmed every existing rule by reading all migrations, and by
the live probe in item 5. **If you change your mind:** templates stay in one
browser, Phase 5 shrinks to the plan link, the disagreement fix and the
Templates-tab cleanup, and Phase 4 keeps kilograms for everyone. Nothing else
in the plan depends on it.

**2. May I apply the database changes myself, one file per phase, the way you
approved before?** **Answered: yes.** That is: check nothing of the other session's is waiting;
if nothing is, push mine; if something is, run only my file and mark it
applied. One of them (Phase 6) adds a value to a fixed list that Postgres
cannot remove again. *Attempted:* the check today shows all 32 changes applied
and nothing waiting, including the other session's error-reporting change.
**Recommendation: yes**, re-checking before every file.

**3. May I rewrite the two real training records into the new single history
now, while there are only two?** **Answered: yes.** I read each row first, the script stops
itself if a copy is missing or a set would be lost (both checks already pass,
table above), and I read every result back and paste it in the completion
note. **Recommendation: yes.**

**4. After Phase 2, will you do one real workout on your phone — and lock the
phone during a rest on an iPhone — and paste anything that reads wrong?** **Answered: yes.** That
is the one check nobody else can run. **Recommendation: yes.**

**5. Does the live site's address start with `https://` (a padlock in the
browser bar)?** **Answered: yes.** Notifications on Android and desktop need that. *Attempted:*
the address is in no non-secret file in the repo and I did not open the
secrets file. On iPhone the answer does not matter — see "does NOT do".
**Recommendation: reply yes/no**; I ask for the notification permission the
first time a set is ticked, never on page load.

**6. Do you use `/test/life-mastery` day to day?** **Answered: go with the
recommendation — link only the live page.** *Attempted:* compared the
two pages. The test page is the bare flow with no sign-in check; the live page
(`/dashboard/goals/plan`) is the same flow plus the sign-in and purchase
checks, a `?step=` link and a faster Today step. Nothing on the test page is
missing from the live one. **Recommendation: no** — link only the live page
(the test page is a 404 on the deployed app), and never link `/test/` from a
live page again (Phase 5 adds a test for it, scoped so the quit-a-vice pages
that legitimately still live under `/test/` are not caught until they move).

**7. Another Claude session is editing this same folder. May I make the one
small edit I need to its browser-test settings file (`playwright.config.ts`,
Phase 8) without waiting for it to finish?** **Answered: yes.** *Attempted:* `git status` — its
files are error reporting, the app shell and the time tracker; none are
training files. **Recommendation: yes.**

**8. May I remove the leftover StrongLifts enrollment the browser test left on
the test account?** **Answered: yes.** It is not yours or mine, and the next test run recreates
one anyway. **Recommendation: yes.**

**No other blockers.** The integration harness starts its own PostgreSQL
(verified: 11 tests, 4.8s), all three browser engines are installed, and the
unit suite is green (4,354 passing, 1 skipped, run 2026-09-06 19:11).

## Open questions — ANSWERED 2026-09-07: "go with your recommendations", all seventeen

Every recommendation below is therefore the decision. They are kept in
question form because each one records *why* the answer is what it is, and
Q7–Q11 and Q16 still require the source page to be checked before the data
change ships.

Only questions where the answer changes a cited program's numbers, or where
the two options genuinely cannot both be done.

**Q1. Merge the program-session table into the workout table, or keep both
and link them?** Linking (a pointer from each record to its twin, plus code
keeping both in step on every edit, plus the missing "change" permission)
leaves two copies of every set forever, which is the class of bug items 5, 6,
12 and 17 are. **Recommendation: merge, now, while there are two rows.**
Phase 1 is written for the merge; the linked alternative is one paragraph at
the end of Phase 1.

**Q2. Should the free-form logger's saved workouts become templates in the new
sense?** Two rows exist. **Recommendation: yes** — migrate them as one-day
templates with the builder's "Leave it to me" option (the weight never changes
on its own) and delete the separate feature.

**Q3. What should the engine do with the weight you actually lifted?** Today
it ignores it both ways (item 10). **Recommendation — three outcomes, for
every lifting program:** every rep at the prescribed weight or above → the
program's increment on top of the heaviest weight at which you completed *all*
the prescribed sets (so 80,80,80,80 + one set at 85 → next 82.5, not 87.5);
every rep, but below the prescribed weight → hold, fail counter untouched,
"you lifted 60 of 80"; reps missed at the prescribed weight → a fail, as
today. When your plates cannot make the prescribed number, the nearest
loadable weight counts as prescribed. Before anything is saved, you get the
table of each lift's today-vs-corrected weight and say yes.

**Q4. Permanently deleting an ended program: erase its workouts too, or keep
them without the program?** **Recommendation: keep them** — that you trained
is not the program's fact to erase — and say so in the confirm.

**Q5. Rest defaults when the program does not say?** **Recommendation: 3
minutes for barbell compounds, 90 seconds for everything else, decided by the
exercise, editable per lift from the live screen, always labelled "our
default"** — and StrongLifts' own rule (1.5 min easy, 3 min hard, 5 min after
a fail) where StrongLifts is the program.

**Q6. What counts as "planned sessions this week" for adherence when a program
is not pinned to weekdays?** **Recommendation: the program's days per cycle,
capped at 7, or the Life Mastery routine's days-per-week when it carries one**
— and the card says which it used.

**Q7. StrongLifts deadlift: +5 kg / 10 lb per session, dropping to 2.5 / 5
once 5 stops working, as the source says?** **Recommendation: yes**, with a
one-line note in the session for anyone mid-program. (Verify the wording on
stronglifts.com before the data change ships.)

**Q8. 5/3/1: check the missed top set every week (not week 3 only), judge the
set that was *marked* AMRAP rather than the last one logged, and prescribe the
deload week off the *old* max?** **Recommendation: all three** — they match
Wendler and each is a few lines.

**Q9. Push/Pull/Legs: encode the r/Fitness program it cites, or keep the
current generic split and change the citation?** The cited program is six
*different* days — Pull A (deadlift 1×5+, then rows), Pull B (row 4×5 + 1×5+),
Push A (bench 4×5 + 1×5+, then press 3×8–12), Push B (press 4×5 + 1×5+, then
bench), Legs (squat 2×5 + 1×5+, Romanian deadlift, leg press, curls, calves),
with face pulls 5×15–20 and triceps work supersetted with lateral raises —
progressing +2.5 kg on the 5+ lifts (+5 on deadlift). **Recommendation:
encode it** (it needs a "straight sets with an AMRAP last set" scheme, which
also gives custom programs a real "5+"), verified against the source page
before it ships; if any part cannot be verified, change the citation to
"inspired by" rather than ship a second mismatch.

**Q10. Starting Strength: encode the book's "halve the jump after the first
stall" for press and bench (1.25 kg / 2.5 lb microplates)?** Squat and
deadlift already carry their smaller later increments. **Recommendation:
yes**; two numbers in the plate list.

**Q11. 5/3/1 assistance work: ship Boring But Big (5/3/1's standard extra
sets) by default with a one-tap "main lifts only", or leave main lifts only?**
**Recommendation: BBB by default** — a ten-minute session is not the program
people sign up for.

**Q12. One display unit for the whole app, or keep the per-program unit?**
*Checked:* there is no account-level unit today — only a per-call type used by
the weight tracker (`src/health/types.ts:9`, and it spells it "lbs" while
programs spell it "lb"). **Recommendation: add one setting on your account —
kg or lb — with a switch on the settings screen, pre-set from your current
program; every training screen reads it, and the app settles on one spelling.**
(Technically one column on your profile; its permission line is in blocker 1.)

**Q13. What does 0 reps mean?** Today it crashes (item 3). **Recommendation: a
set row exists only if attempted; 0 reps = attempted and failed; a set not
attempted has no row.**

**Q14. Keep allowing two programs in different disciplines at once (strength +
running), or force one?** **Recommendation: keep it**, render each program's
own Today card, and surface "never trained, started 14+ days ago" on
`/programs` so leftovers get ended.

**Q15. "Gym sessions" tile: weights only, or every session type?**
**Recommendation: weights only** — the tile is called Gym Sessions and the
linked goal is "Go to gym 4× per week"; runs get their own tile already.

**Q16. Bodyweight Foundations: encode the r/bodyweightfitness routine it
cites?** That routine is three strength *pairs* (pull-up with squat, dip with
hinge, row with push-up) at 3 × 5–8 moving on at 3 × 8, plus a core triplet at
3 × 8–12 moving on at 12, with 90 s rest inside a pair and 3 min between
pairs; the data has push, pull, legs and core only, with invented unlock
targets. **Recommendation: encode the pairs and rests** (adding dip, hinge and
row ladders), verified against the source before shipping; otherwise change
the citation to "inspired by".

**Q17. Should this plan also move your Life Mastery plan into your account, so
it survives a new phone?** Today it lives in one browser (the anonymous
"plan snapshots" copy that exists is for the people building the app, keyed by
a random browser id, and cannot restore a plan). **Recommendation: not in this
plan** — it is a Life Mastery change of its own size, touching every step of
that flow. Until it is done, the training week and the program follow your
account (Phase 5 makes every device agree on those), and the written plan
does not; the app says so on screen.

---

# Part 2 — Execution

## Conventions for whoever runs this

- **`npm test` after every phase** (unit + integration; the integration set
  starts its own PostgreSQL). A phase is not done with a red suite. Baseline
  today: 4,354 passing, 1 skipped.
- **Migrations are deliverables.** Write the file, run
  `npx supabase migration list --linked </dev/null`, confirm nothing pending
  but yours, then `npx supabase db push --linked </dev/null`. If anything of
  the other session's is pending, apply only your file through
  `supabase db query --linked` and `supabase migration repair --status applied
  <version>` (the method approved 2026-08-27). Never `git stash`.
- **Reuse before inventing.** The kit is `src/programs/components/ui.tsx`
  (`TYPE`, `IconButton`, `Segmented`, `Field`, `Stepper`, `Panel`, `Action`,
  `GroupLabel`) plus `components/ui/*` (`card`, `button`, `input`, `dialog`,
  `tabs`, `badge`, `select`, `slider`, `textarea`). Pure logic in
  `*Service.ts`, database access only in `src/db/*Repo.ts`, types in each
  slice's `types.ts`, API routes under 50 lines — `tests/unit/architecture.test.ts`
  enforces all of it.
- **Whose clock.** Never `new Date()` on the server to decide a day. Use
  `getUserTimezone` + `getTodayInTimezone` / `periodStartFor` from
  `src/shared/dateUtils.ts` and `loggedAtForEntry` / `entryWhenFields` from
  `src/health/`. The architecture test's UTC allowlist may only shrink.
- **Every phase is checked at 390 × 844 as well as desktop**, with a
  screenshot under `.playwright-mcp/`, and the screenshots are read by someone
  who did not build it before the phase is called done.
- **Icons.** New concepts need a registry entry in `src/shared/iconRoles.ts`;
  do not reuse `Dumbbell`, `Timer` or `History` in a new role without asking.
- **Names.** "Session" belongs to the daygame tracker. New training code says
  "workout": the new repo is `src/db/workoutRepo.ts`, the API is
  `/api/workouts`.
- **The integration harness is raw SQL** against a plain PostgreSQL container
  (`tests/integration/db/programRepo.integration.test.ts:23-24`); it never
  calls a repo function. Schema rules (constraints, indexes, cascades,
  functions under `SET ROLE authenticated`) are tested there; repo behaviour is
  tested through the API in Phase 8's browser tests and in unit tests with a
  mocked client.

## Phase 0 — The numbers stop lying (engine fixes + one additive column)

**Why first.** Everything after this replays the engine over stored workouts.
An engine that scores a skipped lift as a failure, a lighter set as a hit and
the bottom of a range as the target would bake those errors into every replay.

### Steps

1. **Skipped is not failed.** `types.ts`: `LoggedExercise.skipped?: boolean`.
   `programsService.ts` `applyLog`: when `entry?.skipped` or `entry` is absent,
   carry state through unchanged with `{ kind: "hold", reason: "Skipped —
   weight unchanged" }` for every progression kind, and do not touch
   `consecutiveFails`. The `if (!entry) return false` at `:584` goes.
2. **Three outcomes, every load engine (Q3).** `didHitLinear` (`:579`) and the
   double-progression check (`:383-389`) become `judgeLoadEntry(prescribed,
   entry, plates) → "advance" | "hold_lighter" | "fail"`: a set *counts* when
   `reps ≥ target` and `weight ≥ prescribedLoadable − LOAD_TOLERANCE`
   (`config.ts`, `0.05` display units, documented as the kg↔lb round-trip),
   where `prescribedLoadable` is the prescription snapped to the account's
   plates (step 11); **achieved weight** = the N-th highest weight among
   counted sets, N = prescribed set count; advance →
   `roundToLoadable(max(stored, achieved) + increment, …)`; `hold_lighter` →
   weight and fails untouched, reason "you lifted 60 of 80 — kept at 80", with
   a "make 60 my weight" action through the existing schedule editor; `fail`
   → today's fail path. The 5/3/1 AMRAP judgement (`:428-430`) reads the set
   whose `set_kind` is `amrap` (Phase 1), falling back to the prescribed AMRAP
   index until then.
3. **Rep ranges log what you did, not the floor (item 2).** `needsInput`
   (`programsService.ts:711`) returns true for a `repRangeMax` lift, so it
   cannot be logged closed; Phase 2's set rows then pre-fill from last time.
   One line plus the test that a rep-range lift is never logged without a
   number.
4. **Calisthenics and mobility (item 11, Q16).** `SkillTier` gains `workReps`;
   `computeSkillPrescription` (`:497`) prescribes `workReps` and shows "unlock
   at N"; per Q16, `recommendedRoutine.ts` is re-encoded as the source's pairs
   (`supersetGroup`), 5–8 / unlock 8 for strength, 8–12 / unlock 12 for core,
   with the source's rests as `restSec`. `applySkillLog` and `applyHoldLog`
   resolve the day with `dayIndexOf(program, log.dayId)` like the load engine
   (`:280-282`).
5. **Your today (item 13).** `programRepo.ts` `getTodaySession` (`:482`) uses
   the account's weekday: add `isoWeekdayInTimezone(now, tz)` to
   `src/shared/dateUtils.ts` (derived from `getTodayInTimezone`, never from UTC
   parts) and `getUserTimezone`. Move the today / rest-day / next-scheduled
   rule (`:488-509`) into a pure `pickTodaysDay(schedule, todayWeekday)` in
   `programsService.ts` so it can be unit-tested (item 45); the repo calls it.
   Put `todayWeekday` on `SessionPrescription`; `WeekStrip.tsx:83` reads it.
6. **Rest decided by the lift (item 14, Q5).** Pure `restSecondsFor(exercise,
   setSpec, library)`: `LoadExercise.restSec?` (user-set) wins; else a
   per-set `restSec` on percentage specs (5/3/1: 90 s after the sub-max sets,
   180 s before the AMRAP); else barbell compound → `REST_SECONDS.compound`,
   else `accessory`; warm-up sets → `REST_SECONDS.warmup` (45 s).
   `schemas.ts`: `restSec` `int().min(15).max(600).optional()` on exercises
   and set specs. Delete the `sets.length >= 4` rule at
   `TodaySessionWidget.tsx:443`. StrongLifts carries its source's rule as
   `restSec` with `restAfterFailSec: 300`, credited.
7. **A blank box is a blank box, and the widget tells the truth until it is
   replaced (item 3).** `TodaySessionWidget.tsx:129-137` uses `hasWeight` /
   `numericWeights` from `builder.ts` (written for exactly this and unused
   here); reps likewise; every non-OK response is shown (the free-form
   logger's `readApiError` pattern, `WorkoutLogger.tsx:56-70`). The widget
   gains a **duration** `Field`, an **intensity** `Segmented` and a **date**
   (`entryWhenFields`), all required by `LogSchema` (the route is 33 lines;
   stays under 50). The widget lives on as "Log a past workout" until Phase 3
   replaces it.
8. **Skips, resets and weight changes are replayable, from what you typed
   (items 12, 46, 48).** Migration `20260907090000_replay_from_seed.sql`:
   `program_enrollments.initial_exercise_state JSONB` (the exact state
   `seedEnrollment` produced at enrolment, including typed weights and maxes —
   written by `enrollInProgram`; the five existing rows are backfilled by hand
   from each one's first logged session or current state, read and pasted into
   the completion note) and `replay_events JSONB NOT NULL DEFAULT '[]'` —
   `[{ at, kind: "skip" }]`, `[{ at, kind: "reset", cursor: true, weights:
   false }]` (a reset today rewinds the cursor and keeps the weights,
   `programRepo.ts:400-410`; the event says exactly that), or `[{ at, kind:
   "weight", exerciseId, to }]` (a manual change from the editor in step 13).
   Validated in `schemas.ts`, written by `skipSession`, `resetEnrollment` and
   the weight editor; `replayEnrollment` starts from `initial_exercise_state`
   (never the catalogue) and folds workouts and events in time order. No
   policy change — both columns inherit the enrollment's own-row UPDATE. Row
   type and `toDomain` in `programRepo.ts` / `types.ts`;
   `tests/integration/schema.sql` gains the columns.
9. **Cited programs (Q7–Q11, only where you say yes).** `stronglifts5x5.ts`
   deadlift `incrementKg: 5, incrementLb: 10, stallIncrementKg: 2.5,
   stallIncrementLb: 5` (new optional field on `linear_load`: used after the
   first deload); `startingStrength.ts` press and bench get `stallIncrement`
   1.25 / 2.5 and the plate list gains 1.25 kg / 2.5 lb; `programsService.ts:421-441`
   checks the AMRAP every week, judges the marked AMRAP set, deloads from the
   pre-bump max; `pushPullLegs.ts` re-encoded as six days per Q9 with a new
   `LoadScheme` `{ kind: "straight_amrap", sets, reps }` (all sets fixed, last
   set AMRAP; advance when the fixed sets and ≥ `reps` on the AMRAP are hit)
   and `supersetGroup` on the triceps/lateral pairs; `wendler531.ts` gains BBB
   assistance days with a "main lifts only" toggle stored on the enrollment's
   `custom_schedule`. Each ships with the session note for anyone mid-program
   and a source check recorded in the completion note.
10. **Library (item 16).** `exerciseLibrary.ts`: plank and side plank become
    `repUnit: "sec"` timed lifts; carries keep load progression (`FREE_STEP`)
    at a fixed time; assisted pull-up gets `direction: "down"` on `linear_load`
    (less help is progress); `FREE_STEP = { kg: 2, lb: 5 }` in `config.ts` used
    by `roundToLoadable` when `loadStyle === "free"`; `loadStyle:
    "bodyweight"` (logged weight = added load, negative for assisted; volume
    uses the latest body-weight entry × reps, labelled); `perSide?: boolean` on
    `LoadExercise` rendered "each side".
11. **Plates the gym actually has.** `roundToLoadable(weight, unit, style,
    plates)` takes a `PlateSetup { barKg, smallestPlateKg }` (default: today's
    constants) and snaps barbell lifts to `bar + 2 × k × smallestPlate`; when
    a program's increment is smaller than the loadable step, prescribe the
    same weight this session and `+step` next, with the reason saying so
    (StrongLifts' own "no fractional plates" guidance); when a deload would go
    below the bar, hold at the bar and say "you are at the bar — pick a lighter
    bar in settings or hold". Phase 1 stores the setup on the profile with a
    per-enrollment override (`program_enrollments.bar_weight_kg`, chosen at
    enrolment, editable after); until then the default is used.
12. **The list of running programs is always the server's (item 47).**
    `useEnrollment.ts`: a server-provided `initial` overwrites the store
    unconditionally; with no `initial`, fetch on every mount (the early return
    at `:63` goes, the in-flight join stays); export `refreshEnrollments()`
    and call it from every enrol / end / resume site (`WorkoutPrograms.start`,
    `CustomProgramBuilder.start`, `ProgramDetail.enroll`, `RunningPrograms.end`,
    `PastPrograms.resume`, the drafts' start in Phase 3). Unit test: a stale
    store plus a fresh `initial` shows the fresh list.
13. **One honest weight editor (item 48).** `EditActiveProgram` shows every
    load lift with its current working weight (or training max) as an
    editable box; `updateEnrollmentSchedule` / `seedForAddedExercises` apply
    supplied overrides to *existing* keys, reset that lift's fail counter, and
    write a `weight` replay event so the progress line explains the step. The
    same box is what "make 60 my weight" (step 2) opens.
14. **Tests.** `tests/unit/programs/engine.test.ts`: skipped holds and leaves
    fails alone (linear, double, percentage, skill, hold); 80×4 + 85×1 → 82.5;
    85 on all five → 87.5; 85,85,85,80,80 → 82.5; three sessions at 60 of 80
    → still 80, no deload; rep-range lift needs input; skill prescribes work
    reps and unlocks only at the threshold; skill/hold advance from
    `log.dayId`; AMRAP judged by kind; `pickTodaysDay` on a rest day, a
    training day, an unanchored program; `restSecondsFor` squat vs curl vs
    5/3/1 light set vs warm-up; replay with a skip and a reset in the middle
    (reset keeps weights, restarts the cursor); assisted pull-up progresses
    down; a 2.5 kg-plate gym on StrongLifts goes 60 → 60 → 65 and never holds
    forever or doubles the rate; `straight_amrap` advances only on the AMRAP.
    Fix `builder.test.ts:686-710` to assert the new rule and
    `engine.test.ts:1051-1053` to compare corrected against uncorrected.
    Replay tests: a typed 100 kg squat survives deleting a session (seeded
    from `initial_exercise_state`, never the catalogue); a self-built program
    and a 5/3/1 enrolment can delete a session without erroring; a manual
    weight change replays as a step and resets fails. `tests/unit/shared/`:
    `isoWeekdayInTimezone` at 23:30 Pacific vs 00:30 Tokyo on one instant.
    Replay the two real sessions read-only and print the today-vs-corrected
    table for the completion note.

**Acceptance:** every new test fails before and passes after; `npm test`
green; the UTC allowlist unchanged or smaller; the replay table pasted into
the completion note and approved before anything is persisted.

**Files:** the migration, `src/programs/programsService.ts`, `types.ts`,
`config.ts`, `schemas.ts`, `customize.ts`, `data/strength/*.ts`,
`data/bodybuilding/pushPullLegs.ts`, `data/calisthenics/recommendedRoutine.ts`,
`data/exerciseLibrary.ts`, `src/db/programRepo.ts`, `src/shared/dateUtils.ts`,
`src/programs/hooks/useEnrollment.ts`,
`src/programs/components/{WeekStrip,TodaySessionWidget,EditActiveProgram,ProgramDetail,PastPrograms,RunningPrograms,CustomProgramBuilder}.tsx`,
`src/goals/components/north-star/WorkoutPrograms.tsx`,
`app/api/programs/enrollments/[id]/log/route.ts`, `tests/integration/schema.sql`,
`tests/unit/programs/{engine,builder,enrollmentStore}.test.ts`.

## Phase 1 — One record per workout (schema + migration + repo)

**Why.** Items 3–6, 8, 12, 17, 18. Two tables, no key between them, and the
one edit path that exists cannot write. Two rows in production.

### The schema, exactly

Migration `supabase/migrations/20260907100000_one_workout_record.sql`:

```sql
-- workout_logs: the one record of "a workout happened" — live or after the fact,
-- on a program or not.
ALTER TABLE workout_logs
  ADD COLUMN started_at TIMESTAMPTZ,      -- NULL = written up after the fact
  ADD COLUMN ended_at   TIMESTAMPTZ,      -- NULL while a live workout is in progress
  ADD COLUMN enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN program_day_id TEXT,
  ADD COLUMN program_cycle  INTEGER CHECK (program_cycle IS NULL OR program_cycle BETWEEN 1 AND 1000),
  ADD COLUMN program_week   INTEGER CHECK (program_week IS NULL OR program_week BETWEEN 1 AND 52),
  -- mid-workout changes: {"skipped":[id],"incomplete":[id],"swapped":{id:{name,libraryId}},"added":[{exerciseId,name,libraryId}],"order":[id]}
  ADD COLUMN adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN rpe SMALLINT CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  ADD COLUMN notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD COLUMN client_key TEXT,             -- the browser's id for this workout; makes "start" idempotent
  ALTER COLUMN duration_min DROP NOT NULL,
  ALTER COLUMN intensity DROP NOT NULL;

-- Exactly three states; the columns that must agree are forced to.
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_lifecycle CHECK (
     (started_at IS NULL     AND ended_at IS NULL     AND duration_min IS NOT NULL AND intensity IS NOT NULL) -- after the fact
  OR (started_at IS NOT NULL AND ended_at IS NULL     AND duration_min IS NULL     AND intensity IS NULL)     -- live, running
  OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND duration_min IS NOT NULL AND intensity IS NOT NULL) -- live, finished
);
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_ended_after_start CHECK (ended_at IS NULL OR ended_at >= started_at);
-- A live workout belongs to the day it started.
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_logged_is_start CHECK (started_at IS NULL OR logged_at = started_at);
-- Program context: a linked workout must be complete; a detached one keeps its context (Q4).
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_program_context CHECK (
  enrollment_id IS NULL OR (program_day_id IS NOT NULL AND program_cycle IS NOT NULL AND program_week IS NOT NULL)
);
CREATE UNIQUE INDEX uq_workout_logs_live ON workout_logs(user_id) WHERE ended_at IS NULL AND started_at IS NOT NULL;
CREATE UNIQUE INDEX uq_workout_logs_client_key ON workout_logs(user_id, client_key) WHERE client_key IS NOT NULL;
CREATE INDEX idx_workout_logs_enrollment ON workout_logs(enrollment_id, logged_at DESC) WHERE enrollment_id IS NOT NULL;
-- The one cross-row fact a row rule cannot express: a workout may only point at the owner's own program.
CREATE FUNCTION workout_logs_enrollment_owner() RETURNS trigger … -- same shape as 20260827_life_answers_no_update.sql;
-- raises unless NEW.enrollment_id IS NULL or the enrollment's user_id = NEW.user_id.

ALTER TABLE workout_sets
  ADD COLUMN exercise_id  TEXT,          -- the program's id for this lift; NULL = not from a program
  ADD COLUMN library_id   TEXT,          -- the lift's identity across programs (exerciseLibrary id); NULL = unknown lift
  ADD COLUMN set_kind TEXT NOT NULL DEFAULT 'working' CHECK (set_kind IN ('warmup','working','amrap','backoff','drop')),
  ADD COLUMN prescribed_index SMALLINT,  -- which prescribed set this was; NULL for an added set
  ADD COLUMN completed_at TIMESTAMPTZ,   -- NULL = written up after the fact
  ADD COLUMN rpe SMALLINT CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  ADD COLUMN side TEXT CHECK (side IS NULL OR side IN ('left','right'));
UPDATE workout_sets SET set_kind = 'warmup' WHERE is_warmup;
ALTER TABLE workout_sets DROP COLUMN is_warmup;                       -- one fact, one column
ALTER TABLE workout_sets DROP CONSTRAINT workout_sets_reps_check;      -- the auto-named inline CHECK from 20260305
ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_reps_check CHECK (reps >= 0 AND reps <= 1000),  -- 0 = attempted and failed (Q13)
  ADD CONSTRAINT workout_sets_weight_max CHECK (weight_kg <= 1000);
-- set_number restarts per (lift, kind): W1..Wn warm-ups, 1..N working sets.
CREATE UNIQUE INDEX uq_workout_sets_slot
  ON workout_sets(log_id, COALESCE(exercise_id, exercise), set_kind, set_number, COALESCE(side, ''));

ALTER TABLE program_enrollments
  ADD COLUMN label TEXT CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 60),
  ADD COLUMN bar_weight_kg NUMERIC(5,2) CHECK (bar_weight_kg IS NULL OR bar_weight_kg BETWEEN 0 AND 50); -- NULL = the profile's default

-- Account settings the engine reads (Q12, Decisions). Column grants: blocker 1.
ALTER TABLE profiles
  ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg','lb')),
  ADD COLUMN bar_weight_kg NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (bar_weight_kg BETWEEN 0 AND 50),
  ADD COLUMN smallest_plate_kg NUMERIC(5,2) NOT NULL DEFAULT 1.25 CHECK (smallest_plate_kg BETWEEN 0.25 AND 25);
GRANT UPDATE (weight_unit, bar_weight_kg, smallest_plate_kg) ON public.profiles TO authenticated;
```

Then the **data step**, written against the real rows read first (blocker 3):
for each `program_session_logs` row, find its copy (same `user_id`, `logged_at`
within 10 s, `session_type` per the bridge rules at `programRepo.ts:667-716`),
copy `enrollment_id`, `day_id`, `cycle`, `week`, `rpe`, `notes` onto it, set
`workout_sets.exercise_id` and `library_id` from the program's name→id map
(both real sessions are on known programs; the map is a `CASE`, not a guess),
and **insert sets from `entries` for any copy that has none** (calisthenics,
mobility and endurance sessions were mirrored with no set rows —
`programRepo.ts:685-693`). A `DO $$ … $$` block **raises** if any session has
no copy, or any session with entries has a copy with zero sets afterwards, or
the unique index would collide (all three already pass on today's rows — the
table in Part 1). Last statement: `DROP TABLE program_session_logs`.

**Policies.** Every new column inherits the own-row rules its table already
has; `profiles` needs the column grant above (blocker 1); the trigger is the
one cross-row rule. (Q1's alternative — keep the table and add
`workout_log_id UUID NOT NULL UNIQUE REFERENCES workout_logs(id)` plus an
own-row UPDATE policy — is one migration of similar size, but leaves two copies
of every set to keep in step forever. Do the merge.)

### Repo and engine

1. **`src/db/programRepo.ts`** loses `insertSessionLog` and
   `bridgeToWorkoutLogs`. `getSessionLogs` reads `workout_logs` with
   `enrollment_id` plus their sets, returning the shape the components use
   with `entries` **derived** by a pure `entriesFromSets(sets, adjustments,
   unit)` in `programsService.ts` (working / amrap / backoff sets only,
   grouped by `exercise_id`, ordered by `set_number`, kg converted to the
   enrollment's unit, skipped and incomplete lifts carried as `{ skipped: true }`,
   added lifts kept on the workout but not fed to the engine).
2. **Every reader of `workout_logs` reads finished workouts only.** One
   helper `finishedWorkouts(query)` in `src/db/healthRepo.ts` appends
   `.or("ended_at.not.is.null,started_at.is.null")`; every read in
   `healthRepo` (`getWorkoutLogs`, `getWorkoutLogsWithSets`,
   `getWorkoutWeeklyCount`, `getWorkoutCumulativeCount`,
   `getTrainingHoursCumulative`, `getExerciseMax`, streaks, per-type counts),
   `metricsRepo` and `programRepo` uses it, and a unit test greps every
   `.from("workout_logs")` read for the helper so a new reader cannot forget.
   `getTrainingHoursCumulative` sums only non-null durations.
3. **Saving is one Postgres function** — there is no client-side transaction
   in supabase-js, so the "one repo function" alternative does not exist.
   `finish_program_workout(p_workout_id uuid, p_ended_at timestamptz,
   p_duration_min int, p_intensity int, p_rpe int, p_notes text,
   p_exercise_state jsonb, p_cursor jsonb, p_expected_session_count int)`,
   `SECURITY INVOKER` (row rules still apply), `REVOKE EXECUTE FROM public;
   GRANT EXECUTE TO authenticated`: locks the workout row `FOR UPDATE` where
   `ended_at IS NULL` (zero rows → `RAISE 'already finished'`), locks the
   enrollment where `cursor->>'sessionCount' = p_expected_session_count` (zero
   rows → `RAISE 'state moved'` — the double-finish guard), then the two
   updates. A sibling `save_past_workout(...)` takes the sets as jsonb for the
   after-the-fact path. Precedent for functions in the integration schema:
   `tests/integration/schema.sql:567-596`.
4. **`reviseSessionLog`** edits `workout_sets` rows (which have an UPDATE
   policy) and re-reads them (`.select("id")`, throws on zero rows — no silent
   no-op ever again) or deletes the `workout_logs` row (cascade removes sets),
   then replays with `replay_events`. Item 5 cannot recur because the table it
   wrote to is gone.
5. **`logProgramSession`** (after the fact, kept) writes through
   `save_past_workout` with `started_at NULL`, `logged_at` from
   `loggedAtForEntry` in the account's timezone (item 8), duration, intensity
   and sets with `exercise_id` / `library_id`; the fixed 45 / 3 constants are
   deleted from `config.ts`. A `client_key` makes a retried save a no-op
   (item 4).
6. **`deleteEnrollmentPermanently`** leaves the workouts (Q4): the FK is
   `ON DELETE SET NULL` and the context columns stay, so History still says
   "Upper · cycle 3"; the confirm names the count and says they stay.
7. **`lastLoggedAt` / `sessionsLogged`** on enrollments read `workout_logs`.
8. **Settings:** `settingsRepo` gains `getTrainingSettings(userId) → { unit,
   barKg, smallestPlateKg }`; `programRepo.programFor` hands the plate setup to
   the engine; `enrollInProgram` seeds `unit_system` from the profile; a
   settings-screen section with the unit `Segmented` and two `Field`s;
   `healthService.convertWeight` / `formatWeight` accept `"lb"` and the health
   `WeightUnit` type becomes `"kg" | "lb"` at that one boundary (the "lbs"
   spelling goes), with a test that the three agree.
9. **`docs/architecture/training-data-model.md`** is rewritten: one diagram,
   the three lifecycle states, and the lines that no longer exist.

### Tests

- `tests/integration/schema.sql`: add `workout_logs`, `workout_sets` and
  `workout_templates` verbatim from `20260305` / `20260715` / `20260716`
  (they are absent today), then every new column, constraint, index, trigger
  and function verbatim; drop `program_session_logs`; `GRANT` to
  `authenticated` so denial tests can `SET ROLE authenticated`.
- `tests/integration/db/workoutSchema.integration.test.ts` (SQL-level):
  every lifecycle state the CHECK forbids is refused; a second live workout
  for the same user is refused; a repeated `client_key` is refused; a set
  slot collision is refused; a workout pointing at another user's enrollment
  is refused by the trigger; permanent delete of an enrollment **with
  workouts** leaves them with `enrollment_id NULL` and their context intact
  (this is the case the first draft of this plan would have failed);
  `finish_program_workout` under `SET ROLE authenticated` with `auth.uid()`
  stubbed finishes once and raises the second time; the cascade from a
  workout to its sets.
- `tests/unit/programs/engine.test.ts`: `entriesFromSets` — warm-ups
  excluded, kg→lb round trip within tolerance, skipped and incomplete carried,
  an added lift ignored by the engine, per-side sets merged for the rep
  count, `amrap` kind judged.
- Repo behaviour (log → one row with N sets; edit a set → replay changes the
  working weight; delete → history and dashboard count shrink) is asserted
  through the API in Phase 8's browser tests, and in unit tests of
  `workoutRepo` with a mocked client.

**Acceptance:** migration applied on remote with the list re-checked first;
every migrated row read back in full and pasted into the completion note;
`npm test` green; the edit probe from item 5 now changes the row; the
dashboard's gym-sessions tile, heatmap and CSV agree with History on the same
two sessions.

**Files:** the migration, `src/db/programRepo.ts`, `src/db/healthRepo.ts`,
`src/db/metricsRepo.ts`, `src/db/settingsRepo.ts`,
`src/programs/programsService.ts`, `src/programs/types.ts`,
`src/health/types.ts`, `src/health/healthService.ts`, `src/programs/config.ts`,
`app/api/programs/enrollments/[id]/log/route.ts`,
`app/api/programs/enrollments/[id]/log/[logId]/route.ts`,
the settings screen component, `tests/integration/schema.sql`,
`tests/integration/db/{programRepo,workoutSchema}.integration.test.ts`,
`tests/unit/db/workoutLogsReaders.test.ts` (the grep test),
`docs/architecture/training-data-model.md`.

## Phase 2 — Train set by set

**Why.** Items 1, 2, 7, 24, 42. This is the feature.

### What the screen is

`/programs/live` — a server component that loads the account's live workout
(or redirects to `/programs`). Full-height, one column, phone-first:

- **Sticky header:** program · day ("Upper / Lower — Upper"), elapsed time
  counting from `started_at` (derived from the instant, never a counter — the
  `RestTimer` rule), a **Finish** button.
- **One card per exercise**, in program order (or `adjustments.order`),
  supersets grouped under one card with A1/A2 labels (`supersetGroup` flows
  through the prescription and is finally read). Header: name (tap → the
  **history sheet**: last three sessions of this lift, all sets, its PRs, its
  last note), prescription line (`describeSets`), last time's exercise note
  in `TYPE.meta`, "each side" where set, rest shown and editable ("Rest 3:00"
  → saved to the enrollment's `custom_schedule` through the existing PUT), a
  menu (notes · swap · skip · didn't finish — don't count it · move up / down
  · add warm-up).
- **One row per set:** `Set 1 · last 60 kg × 8 · [ 62.5 ] kg · [ 8 ] reps · ✓`.
  Warm-ups are their own rows, numbered W1…, above the working sets. Weight
  pre-fills from the prescription snapped to your plates; reps pre-fill from
  **last time** for a rep-range lift and from the target for a fixed one
  (item 2); tapping the "last" value copies it into the row (the leaders'
  gesture); a range shows "6–8" beside the box; AMRAP shows "as many as you
  can" and needs a number; an optional effort column (one stored number, shown
  as RPE or reps-in-reserve by a setting, hidden until turned on); the plate
  line (barbell lifts only) uses your bar and plates. Tapping ✓ **saves that set** (one request, carrying `set_kind`
  and `prescribed_index`), turns the row green, starts the rest bar — unless
  the lift is in a superset and is not its last exercise, in which case a
  short "move to A2" bar runs instead — and moves focus to the next set.
  Tapping a saved set edits it; the row menu removes it. `+ set` at the foot
  of the card. Timed lifts show seconds; per-side lifts show L / R rows.
- **Rest bar** pinned above the bottom edge, where your thumb is (item 1):
  `1:42 / 3:00`, −30 s, +30 s, skip; an audible cue while the screen is on,
  vibration and a notification where the browser supports them (Android,
  desktop), and on iPhone the correct remaining time the moment the screen
  wakes — the bar says so the first time. Evolves `RestTimer.tsx`; keeps its
  instant-based clock.
- **Bottom of page:** `+ Add exercise` (the palette from
  `CustomProgramBuilder.tsx`, extracted to `ExercisePalette.tsx`), and
  **Discard workout** behind a confirm.
- **Finish** opens a sheet (`components/ui/dialog`): **Started / Ended**
  (ended defaults to the last set's `completed_at`, never "now"; when the
  workout started more than four hours ago the sheet says "This started
  Tuesday 18:05 — when did it end?"; anything over 300 min needs an explicit
  confirm), duration derived from those two, sets done, volume, PRs
  (`detectPersonalRecords` over *all* prior sets — item 18 — with rep records
  at the same weight and **estimated-max records**), every lift with unticked
  sets and the engine's verdict ("Squat 3 of 5 sets → counts as a miss · don't
  count it?"), "next time" (the engine's `changes`, in words), optional overall
  RPE (`slider`) and note (`textarea`), intensity (`Segmented`, defaults from
  the program), and — when you swapped, added, removed or reordered anything —
  **"Update my program with these changes / Just this once"** (the update
  writes `custom_schedule` through the existing PUT; the leaders all ask this
  at finish), then **Save**. Saving is idempotent: a second Finish returns the
  same summary (the function's `FOR UPDATE` guard).

### Steps

1. **Repo: `src/db/workoutRepo.ts`** (new; `healthRepo` is 775 lines and
   owns after-the-fact reads/writes). `startWorkout(userId, { enrollmentId?,
   dayId?, clientKey })` (sets `logged_at = started_at`; refuses a second live
   workout — the index also refuses — and returns the existing row for a
   repeated `clientKey`), `getLiveWorkout(userId)`, `completeSet`, `updateSet`,
   `deleteSet`, `adjustWorkout` (skip / incomplete / swap / add / order /
   notes), `finishWorkout` (validates `started_at ≤ endedAt ≤ now`, builds
   entries via `entriesFromSets`, runs `applyLog`, detects PRs, calls
   `finish_program_workout`; returns the summary; a second call returns the
   stored one), `discardWorkout`, `liftHistorySheet(userId, libraryId)`.
   Every write checks `user_id`.
2. **API** (each route under 50 lines): `POST /api/workouts` (start),
   `GET /api/workouts/live`, `POST|PATCH|DELETE /api/workouts/[id]/sets[/setId]`,
   `PATCH /api/workouts/[id]` (adjustments, notes), `POST /api/workouts/[id]/finish`,
   `DELETE /api/workouts/[id]` (discard, live only), `GET /api/workouts/lifts/[libraryId]`.
   Zod schemas in `src/programs/schemas.ts`; `adjustments` validated there
   (the database only knows it is JSON); malformed stored `adjustments` are
   an error shown on the History screen, never an empty object.
3. **Client state: `src/programs/hooks/useLiveWorkout.ts`.** Server rows are
   the truth; the hook holds an optimistic copy and a **send queue** persisted
   in localStorage under `live-workout-queue-v1` for anything that failed to
   send — **including the start** (the workout's client-generated id is its
   `client_key`; sets queue behind it; the screen renders from the
   prescription meanwhile). On mount it re-reads the live workout and flushes
   the queue in order; each queued set carries a client id so a retry cannot
   double-insert. Queued items show "not saved yet"; Finish is disabled while
   anything is queued, with "Waiting for signal — N sets not saved yet".
4. **Components** in `src/programs/components/live/`: `LiveWorkout.tsx`,
   `ExerciseCard.tsx`, `SetRow.tsx`, `RestBar.tsx`, `FinishSheet.tsx`,
   `SwapSheet.tsx` (candidates from `customize.ts`'s like-for-like pool — a
   workout adjustment, never a `custom_schedule` write), `LiftSheet.tsx`
   (history), `WarmupSuggestion.tsx` (StrongLifts' scheme credited; else "our
   suggestion", off by default). All from `ui.tsx` + `components/ui`. Inputs
   are `inputMode="decimal"`, `min-h-11`, labelled.
5. **Today card on `/programs`** replaces `TodaySessionWidget` as the way to
   log today: program and day in `TYPE.title`, the lifts as a read-only list
   (name + `describeSets`), the day picker (the only day control on the page
   — item 35), layoff/stale notices, and one button: **Start workout** (or
   **Resume · 23 min** when a live workout exists, or **Finish or discard
   Tuesday's workout** when one is stale). One card per running program
   (Q14, item 41), and the server pre-load resolves all of them. **With no
   program at all (item 51)** the page opens on one card — **Pick a program**
   (the catalogue), **Build my own** (the builder, which already exists), and
   a secondary **Just log a workout** — instead of a blank free-form form.
   `TodaySessionWidget` stays mounted below a fold as **Log a past workout**
   (with the Phase 0 date, duration and intensity fields) until Phase 3
   replaces it; `ActiveProgramsPanel.tsx` renders the Today card until Phase 6
   replaces it. Starting from the catalogue here shows the same "this pauses
   X" sentence Life Mastery shows (item 49), extracted into one component.
6. **Endurance, skill and hold** use the same screen: an endurance workout is
   one card of blocks with a "done" per block, a distance box and the elapsed
   clock (item 23); skill/hold sets log reps or seconds with the same row.
7. **Tests.** Unit: `entriesFromSets`, summary maths (volume = Σ working
   weight × reps, timed sets excluded, bodyweight per step 10), the superset
   timer rule (A1 ✓ → no rest bar; A2 ✓ → rest bar), the queue reducer (flush
   order, duplicate suppression, start queued before sets), PR detection with
   rep and e1RM records (85×8 after 90×3 is an e1RM PR and not a weight PR),
   finish-time validation (started Tue 18:00, last set 18:52, finished Thu →
   52 min). Integration (SQL): covered in Phase 1. Browser (Phase 8 locks
   it): start, tick two sets, reload, both still ticked, finish, history shows
   them; offline start.

**Acceptance:** at 390 × 844 the live screen shows the first exercise's first
set and the ✓ without scrolling; a set ticked, the tab killed and reopened, is
still ticked; the rest bar keeps time across a 10-second background; the
finish sheet names the PR when one was set; `npm test` green.

**Files:** as listed; plus `app/programs/live/page.tsx`, `app/api/workouts/**`,
`src/programs/components/ExercisePalette.tsx` (extracted),
`src/programs/components/{ProgramsApp,ActiveProgramsPanel,RestTimer}.tsx`,
`src/programs/hooks/useLiveWorkout.ts`, `src/health/healthService.ts`
(PR records).

## Phase 3 — The same screen for anything, one meaning of "template", and a year of data

### Steps

1. **`program_drafts`** — migration `20260908100000_program_drafts.sql`
   (blocker 1): `id, user_id, name (1–60), discipline, unit_system, schedule
   JSONB (validated by CustomScheduleSchema at the API), working_weights JSONB,
   source TEXT CHECK IN ('built','catalog','saved_workout'), source_program_id
   TEXT, created_at, updated_at`, `UNIQUE (user_id, name)`, own-row CRUD
   policies. Data step: each `workout_templates` row becomes a one-day draft
   (`source = 'saved_workout'`, every lift `progression: { kind: "none" }`,
   `loadStyle: "free"`), verified by count in a `DO` block, then
   `DROP TABLE workout_templates`.
2. **Repo `src/db/programDraftRepo.ts`** + `app/api/programs/drafts[/id]`
   (list / create / update / delete / start). `start` = `enrollInProgram` with
   `programId: "custom"`, the draft's schedule, weights and weekday pins, **the
   draft's name as the enrollment `label`**; the hard-coded "Your program" and
   level "intermediate" at `CustomProgramBuilder.tsx:221,248` go, and
   `RunningPrograms` / the Today card show the label.
3. **Start an empty workout** on `/programs`: `startWorkout` with no
   enrollment; add exercises from the palette; finish writes a plain
   `workout_logs` row. **Save as template** on the finish sheet creates a draft
   from what was done.
4. **`WorkoutLogger.tsx`** loses its template panel, its "repeat last" and its
   stats; it becomes **Log a past workout**: date/time in the account's
   timezone (`entryWhenFields`), optional program day (so a forgotten program
   session can be logged dated — item 8), then the same `SetRow` list (two
   cards for the same lift merge into one numbering on save), then
   duration/intensity — saved through `save_past_workout`. Its heatmap and
   streak move to the Progress tab (Phase 4). **`TodaySessionWidget.tsx` is
   deleted here.** The templates route, the three `healthRepo` template
   functions and the `WorkoutTemplate*` types go with the table.
5. **Tests.** Integration (SQL): the template migration preserves every set
   of both real rows (read back, pasted into the completion note); the
   drafts' policies deny another user under `SET ROLE`. Unit: draft-from-
   workout builder; past-workout date lands on the chosen day at 23:30 in a
   non-UTC timezone; two cards for the same lift save as sets 1..6. Browser
   (Phase 8): a draft round-trips through the API unchanged and starts with
   its label and weekdays; an empty workout finishes as one row.
6. **Seed a year** — `scripts/dev/seed-training-year.ts` drives the app's own
   API (never the database) on the test account using the dated past-workout
   route from step 4: 150 workouts over 12 months with a layoff, a deload, two
   PRs and one program switch; idempotent by run tag (`--wipe` removes only
   its own rows). **Acceptance of its own:** 150 workouts read back through
   `GET /api/workouts`, counts match the run tag. Every later phase's
   screenshots and checks run on this data.

**Acceptance:** build a week on `/programs`, sign out, sign in on another
browser, it is there; start it; log yesterday's session dated yesterday and
see it on yesterday in the calendar; the seed script's own acceptance;
`npm test` green.

**Files:** the migration, `src/db/programDraftRepo.ts`, `src/db/healthRepo.ts`
(template functions removed), `app/api/programs/drafts/**`,
`app/api/health/workout/templates/route.ts` (deleted),
`src/health/components/WorkoutLogger.tsx`, `src/health/types.ts`,
`src/programs/components/{CustomProgramBuilder,TodaySessionWidget(deleted),ProgramsApp,RunningPrograms}.tsx`,
`src/programs/schemas.ts`, `scripts/dev/seed-training-year.ts`,
`tests/integration/schema.sql`, `tests/unit/navigation/routeReachability.test.ts`
(route list).

## Phase 4 — History you can read and fix; progress you can see

`/programs` becomes four tabs (`components/ui/tabs`): **Today · History ·
Progress · Programs**. The server component resolves each tab's data.

### History

- A list of workouts newest first: weekday and date, name (program day or
  "Workout"), then **each lift's top working set** ("Squat 100×5 · Bench
  80×5"), a PR badge, with duration and volume as the second line. Tap →
  set-by-set detail (grouped by exercise, warm-ups marked, notes shown, swaps
  and skips named) with **Edit** (same `SetRow`, saves through
  `reviseSessionLog`, says "your weights from here on are recalculated" before
  saving) and **Delete**. `ProgressionView.tsx`'s session list and
  delete-only control are replaced; the "cycle 1, week 1" caption appears only
  on periodised programs (item 40).
- Program controls (Change this program · Skip session · Reset · End) move to
  the **Programs** tab under the running program — one "Change this program",
  in the kit (item 38), which is the Phase 0 weight editor; a refused
  permanent delete shows the server's reason instead of silently reloading
  (item 52, shared `requestOrAlert` with the resume button).

### Progress (all pure functions, all tested)

- **This week:** planned vs done as seven dots — `adherenceThisWeek()` in
  `healthService.ts` (Q6); the week strip's "done" marks come from **this
  week's** workouts only (item 19).
- **PRs:** best weight, best reps-at-weight and best estimated max per lift
  with dates, all-time (`estimateOneRepMax` capped at 10 reps — Epley over 10
  inflates).
- **Each lift over time:** `LiftHistory.tsx` moves here (it is the only
  cross-program view and it is hidden on the other tab), keyed on
  `library_id` so a lift survives a program switch, gains an e1RM line under
  the weight line (same `Sparkline`), and prints the account's unit (item 21).
- **Weekly volume** (Σ weight × reps, working sets, timed sets excluded,
  bodyweight per Phase 0 step 10) and **sets per muscle group per week** —
  `weeklyVolume()`, `setsPerBodyGroup()` mapping sets to the library's
  `BodyGroup` via `library_id`, with `searchLibrary` for free-text names;
  unmatched shown as "other", never dropped.
- **1RM tiles recognise your lifts** (item 20): `getExerciseMax` matches on
  `library_id` → movement pattern, with a short synonym list for free-form
  names; the same key drives the muscle grouping.
- **Calendar:** `buildWorkoutHeatmapWeeks` (exists) with program days marked;
  the fetch window matches the grid (it is 90 days for a 96-day grid today).
- **Program progression:** `summariseProgression` + the unbroken-run notice,
  per running program; bodyweight lifts show reps, not "0 kg · held".
- **Export CSV** stays, gains duration, set kind, unit and program columns.
- **"Gym sessions" counts weights only** (Q15, `healthRepo.ts:284-293`).

**Acceptance:** with the seeded year (Phase 3 step 6) every Progress panel
shows data; a workout edited on History changes the Progress numbers and the
dashboard tile; at 390px each tab is under 1,800px with folds closed;
`npm test` green.

**Files:** `src/programs/components/TrainingScreen.tsx`, `ProgramsApp.tsx`,
`ProgressionView.tsx` (replaced), `LiftHistory.tsx`, new `history/` and
`progress/` folders, `src/health/healthService.ts`, `src/db/healthRepo.ts`,
`src/programs/programsService.ts`, `tests/unit/health/healthService.test.ts`,
`tests/unit/programs/engine.test.ts`.

## Phase 5 — Life Mastery flows through, both ways, on every device

### Steps

1. **The reference is never dropped (item 25).** `applyProgramToWorkoutRoutine`
   (`northStarService.ts:1334`) and `applyProgramDays` (`:1278`) write the
   `program` reference even when `dayNames` is empty, leaving `splitDays`
   untouched in that case. Unit test: an endurance start and a goals-planner
   save with `programSelections` (dayNames empty) both leave
   `NsRoutine.program` set.
2. **Every start and end tells the plan, and the plan catches up on load
   (item 27, and across devices).** `ProgramDetail.tsx:80`,
   `ProgramsApp.tsx:237`, the Programs tab's End, `RunningPrograms.tsx`,
   `NewGoalsFlow.tsx:177` and the drafts' `start` all call
   `applyProgramReference` / `detachProgramFromRoutines` (the one write path
   into the stored plan, `northStarStorage.ts`). On load `NorthStarFlow`
   fetches the active enrollments and reconciles **both ways**: a reference
   whose enrollment is no longer active is shown as "no longer running" with
   one tap to clear; an active enrollment the plan does not know is written in
   (the enrollment is the server's fact and "the enrollment wins" is already
   the rule — no confirm). An architecture-style test greps every file that
   calls `enrollInProgram`, `unenroll`, `resumeEnrollment` or the drafts'
   start and requires the plan write beside it.
2b. **The goals planner tells the truth (items 49, 50).** `ensureEnrollment`
   returns `displaced` and the goals-plan route includes it; `ProgramPicker`
   renders a selection that matches a running enrollment — including a
   self-built one — as "Running since <date> — manage on Training" with the
   weight boxes hidden and no "Will enroll you on save"; un-ticking a running
   program says "To stop it, end it on the Training page" (the route stays
   enrol-only — ending from a plan save would be a hidden side effect). Unit
   test on the route handler for `displaced`; rendered test for the running
   state.
3. **The disagreement compares the right thing and is fixable (item 26).**
   `RunningPrograms.tsx:113-118` uses `effectiveProgram(program,
   customSchedule)`; the notice gains **Use the program's days** (calls
   `applyProgramToWorkoutRoutine` with weekday pins carried — item 29). Never
   automatic.
4. **One designer (item 30).** `RoutineCard.tsx:570-640`: when the routine
   carries a `program`, the day list is read-only ("Upper · Mon, Lower · Tue …
   from Upper / Lower — **Change it**") and Change opens the one editor; when
   it carries none, "Design this week" opens the builder on the Templates tab
   with these day names pre-filled. `NsSplitDay` gains `weekday?` so the plan's
   week and the program's week are the same week.
5. **Build-your-own saves to the account (item 29).** `BuildYourOwn.tsx`
   writes a draft when signed in (debounced), keeps `custom-program-v1` only
   for signed-out editing, and on sign-in offers — never merges — an existing
   local design: "You built a week on this device before signing in. Save it
   to your account?" After Start the builder shows **Running · Change it**,
   not "Start tracking this"; starting a second copy asks first.
6. **"Reset" cannot erase your program (item 28).** `EditActiveProgram`'s
   reset offers "back to the catalogue version" only for catalogue programs;
   for a draft-based program it offers "back to the saved template".
7. **The Templates tab with a program running (item 33)** shows: the running
   band, today's workout summary, **Change it** (`EditActiveProgram`, in the
   kit), **Your templates** (drafts: start / edit / copy), and **Start
   something else** as a *collapsed* section holding the catalogue whose Start
   confirms what it will pause. Catalogue edits survive a discipline switch
   (`WorkoutPrograms.tsx:86-89` asks before discarding).
8. **The right address (item 32).** `TrainingScreen.tsx:69` links to
   `/dashboard/goals/plan` whenever the account has an active program. Add to
   `routeReachability.test.ts`: no file reachable from a non-`/test` route
   links to `/test/`, **excluding `src/vice/` and the two Life Mastery links to
   `/test/quit-vice`** (`northStarStart.ts:179`, `RoutineCard.tsx:208`) until
   quit-a-vice has a live route — listed in the test as the allowlist that may
   only shrink.
9. **The rail on a phone.** `NorthStarFlow.tsx:723-770`: below `sm` the
   fourteen tabs are one horizontally scrolling row of chips with the active
   one scrolled into view; the grid stays at `sm` and up.
10. **The program section uses the kit (item 37).** Discipline chips, program
    cards and level/unit toggles in `WorkoutPrograms.tsx:298-400` become
    `Segmented` and `Panel`; 10px `text-zinc-600` copy goes to `TYPE.meta`;
    `EditActiveProgram.tsx:99-166` loses its zinc classes and takes `tone`
    like `RunningPrograms`.

**Acceptance:** build a week on Life Mastery in browser A, start it, open
`/programs` in browser B: same week, same weekdays, today's workout prescribed
from it; start a program on `/programs` in browser A and open
`/dashboard/goals/plan` in browser B: the Systems tab shows it running; end it
on `/programs`, both tabs stop claiming it on next open; start Couch to 5K from
the goals planner and the plan references it; the Templates tab on 390px is
under 2,500px with the catalogue collapsed.

**Files:** `src/goals/northStarService.ts`, `src/goals/types.ts`,
`src/goals/northStarStorage.ts`,
`src/goals/components/north-star/{WorkoutPrograms,BuildYourOwn,NorthStarFlow,RoutineCard}.tsx`,
`src/goals/components/new-goals/NewGoalsFlow.tsx`,
`src/programs/components/{RunningPrograms,EditActiveProgram,CustomProgramBuilder,ProgramDetail,ProgramsApp,TrainingScreen}.tsx`,
`tests/unit/goals/northStarService.test.ts`,
`tests/unit/navigation/{routeReachability,planReferenceCallers}.test.ts`.

## Phase 6 — Dashboard and navigation

1. **`TrainingCard.tsx`** replaces `ActiveProgramsPanel` on
   `ProgressDashboard.tsx:137` and `HealthTrackingPanel.tsx:70` (item 24). A
   pure `trainingCardState(liveWorkout, enrollments, today)` in
   `programsService.ts` picks one of four states — live ("Workout in progress
   · 23 min · **Resume**"), stale ("Finish or discard Tuesday's workout"),
   today ("Today: Upper · 6 lifts · **Start**"), rest ("Rest day · next:
   Lower") — plus seven adherence dots and the last PR with date.
   Server-resolved like the rest of the dashboard.
2. **Quick Actions:** "Log a Workout" → **Training** (`QuickActionsCard.tsx:60-66`).
3. **Adherence as a metric** — migration `20260910100000_program_adherence_weekly.sql`:
   `alter type linked_metric add value if not exists 'program_adherence_weekly';`
   (cannot be undone — blocker 2), the value added to
   `src/db/goalEnums.ts` `LINKED_METRICS` and to `tests/integration/schema.sql:436`,
   the entry in `src/tracking/data/metricCatalog.ts`, the resolver in
   `metricsRepo.ts` + `healthRepo.ts` (done ÷ planned, Q6), so it can be a
   tile and a goal's linked metric; the test that every goal resolves to a
   tracker and the enum-sync integration test keep passing.

**Acceptance:** unit tests for all four card states; dashboard at 390px shows
the card within one screen of scrolling from Quick Actions; its numbers match
the Progress tab.

**Files:** the migration, `src/programs/components/TrainingCard.tsx`,
`src/programs/programsService.ts`,
`src/tracking/components/{ProgressDashboard,dashboard/QuickActionsCard}.tsx`,
`src/goals/components/HealthTrackingPanel.tsx`, `src/tracking/data/metricCatalog.ts`,
`src/db/{metricsRepo,healthRepo,goalEnums}.ts`, `tests/integration/schema.sql`,
`tests/unit/programs/engine.test.ts`.

## Phase 7 — One look, one voice

1. **Inventory, then remove (item 37).** Grep every training component for
   hand-rolled button classes (`WorkoutPrograms.tsx`, `WeekStrip.tsx:118-200`,
   `RunningPrograms.tsx`, `ProgramPicker.tsx`, `ProgramDetail.tsx`) and
   replace each with `Action` / `IconButton` / `Segmented` /
   `components/ui/button`. Level and unit toggles rendered three ways become
   one `Segmented`. No zinc classes inside `src/programs/`.
2. **Copy pass (item 40)**, as a table in the completion note (before →
   after), at least: "Anything else" → "Log a past workout"; "Session 3" →
   "3rd workout"; "Logging" → "Which day"; "Today — Pull" on a picked day →
   "Pull (you picked this)"; "Rest day — Upper" → "Rest day · next: Upper";
   "I did all of this — save it" (gone); "Logged — next session updated" →
   "Saved. Next time:"; "Runs in order rather than on set days" card → one
   line "Pin days to the week"; every 10px `text-zinc-600` line → 11px minimum
   at 4.5:1 contrast.
3. **A way back (item 39).** Every entrance passes a return address through
   the existing `withReturn` / `readReturn` (`src/shared/returnTo.ts:28,42`)
   and `BackLink`, so the back link names where you came from; `/programs`
   drops the tab-bar padding it does not use and takes `max-w-6xl` like the
   dashboard.
4. **Touch, labels, contrast (items 36, 52).** Every input has a visible
   label or `aria-label`; every tappable thing is ≥ 44px; `SetRow` is a fixed
   grid so "kg ×" cannot wrap; no body text under 12px or below
   `muted-foreground` (5.8:1 on card); every chooser is `Segmented` (which
   sets `aria-pressed`); the week strip's spoken label includes "done" / "not
   yet". A unit test greps `src/programs` and
   `src/goals/components/north-star` for `text-[10px]` and `text-zinc-600` and
   fails on any hit.
5. **Whole read.** Regenerate every screenshot on the seeded year (Phase 3
   step 6) and have a context-free reader walk all of them as a first-time
   user; their findings are the phase's punch list, fixed before the phase is
   called done.

**Acceptance:** zero hand-rolled button classes under `src/programs/` (a grep
in `tests/unit/architecture.test.ts`), the reader's list closed.

**Files:** the inventory's list (at least `WorkoutPrograms`, `WeekStrip`,
`RunningPrograms`, `ProgramPicker`, `ProgramDetail`, `EditActiveProgram`,
`TrainingScreen`, `ProgramsApp`), `src/shared/returnTo.ts` callers,
`tests/unit/architecture.test.ts`.

## Phase 8 — Proven

1. **E2E `tests/e2e/mobile/mobile-training.spec.ts`** (serial, shared
   account, cleans up by id): start → tick two sets → `page.reload()` → both
   ticked → background 10 s (`page.clock`, Playwright 1.58) → rest bar
   advanced → finish → History shows the sets **read back through the API**
   (item 43) → dashboard card shows "done"; and `context.setOffline(true)` →
   start → two sets → `setOffline(false)` → exactly one workout with two sets
   read back. **CI fix:** remove `/mobile\/mobile-training\.spec\.ts/` from
   `mobile-iphone`'s `testMatch` (`playwright.config.ts:342`), chain
   `training-android` after `training-iphone-safari` and `training-firefox`
   after that via `dependencies`, add `--project='training-*'` to the
   cross-browser job (`e2e.yml:71`), and a unit test that no two Playwright
   projects without a dependency edge share the spec (blocker 7: one
   coordinated edit). Height ceilings per tab, measured on the *largest*
   program.
2. **Attack pass:** `/code-review` on the diff and `security-review` (Phases
   1, 3 and 6 touch permissions); every finding fixed or listed in the
   completion note.
3. **Integration by breaking:** each constraint, index, trigger and function
   from Phase 1 verified by reverting it once and watching its test fail —
   including permanent delete of an enrollment with workouts, and the
   double-finish raise.
4. **Docs:** `.claude/rules/testing.md` stops calling the mobile suite a
   skeleton; the spec header names the projects that actually run it.

**Acceptance:** all three training projects green in CI; `npm test` green;
the completion note lists what the tests constrain, not the number that
passed.

---

## Review pass — what attacking this plan found, and what changed

Four independent critics read the previous draft. Their must-fix list, and
the fix, so the failure list ships with the work:

- **The schema would have made "delete a program permanently" impossible** —
  the foreign key cleared the enrollment while a CHECK demanded all four
  context columns clear together. → The CHECK is one-directional; a detached
  workout keeps its day, cycle and week (Q4), and the integration test deletes
  an enrollment that has workouts.
- **A live workout could not be inserted** — `intensity` is NOT NULL and the
  plan never relaxed it, so "start" would have had to invent a 3, the exact
  constant being deleted. → `intensity` nullable while running, forced present
  once finished.
- **Every existing dashboard reader would have counted an unfinished workout
  the moment you pressed Start**, and training hours would have become NaN on
  its null duration. → One `finishedWorkouts` helper used by every reader,
  with a grep test so a new reader cannot forget; `logged_at = started_at` by
  CHECK so the calendar has one date.
- **The profile's unit setting would not have been editable** — that table
  only allows a fixed list of columns to be changed. → The grant is in the
  migration and in blocker 1; and the app had two spellings of the unit.
- **Five of Phase 1's tests could not run** — the container harness has no
  workout tables and never calls a repo. → Tables added to the harness schema;
  schema rules tested there, repo behaviour through the API and unit tests.
- **Phase 6's metric needed an enum migration** it did not have, and an enum
  value cannot be removed. → Migration added; blocker 2 says so.
- **The CI claim was wrong** — the iPhone project already runs the training
  spec; adding the chain would have run two copies at once. → Item 43 and
  Phase 8 corrected.
- **"Phone can lock between sets" shipped without its alert on iPhone** —
  Safari has no vibration and no page notifications. → Said plainly in "does
  NOT do"; audible cue and correct time on wake; a real buzz costed as one
  extra phase.
- **"Both directions" was false on a second device** — the plan reference
  lives in one browser. → Phase 5 reconciles both ways from the server's
  enrollments on load; acceptance tests it across two browsers; the plan says
  what still does not travel (Q17).
- **A workout finished two days late would have logged 2,880 minutes** (and
  the 600-minute CHECK would have refused it, so "finish or discard" collapsed
  to discard). → Ended defaults to the last set's time, editable, validated.
- **Phases 4 and 7 depended on a seed script scheduled in Phase 8.** →
  Moved to Phase 3 with its own acceptance.
- **The "next weight" rule would have ratcheted from a single heavier set**
  (80,80,80,80,85 → 87.5). → The N-th highest counted weight.
- **A gym with only 2.5 kg plates could never progress a 2.5 kg program** and
  no bar/plate setting existed ("later"). → Settings added; the engine snaps
  and says so.
- **5/3/1's AMRAP judgement had nothing to read once a set was added** — no
  set role was stored. → `set_kind` and `prescribed_index` on every set.
- **A superset would have started the rest timer after A1.** → Timer after
  the group's last exercise.
- **The blockers were statements, not questions, in database jargon, and one
  asked permission for a method you had forbidden.** → Rewritten as eight
  yes/no questions with the approved method spelled out; glossary added; the
  record counts stated once, in a table.
- **Seven "open questions" were both-able and already decided.** → Moved to
  "Decisions already taken — say if you disagree".
- **Citations that would have sent the executor to the wrong file** (`:711`
  is in the service, not the widget; `customProgram.ts:38`; `:383-389`) and
  a new repo named "session". → Corrected; `workoutRepo.ts`.
- **Product files already link to `/test/quit-vice`**, so the reachability
  rule as written would have gone red on files this plan does not touch. →
  Scoped with a shrink-only allowlist.
- **Dropping `workout_templates` left a live route and three repo functions
  pointing at nothing.** → Phase 3 Files names every caller to delete.

And the completeness critic, run last over all seven reports, found three
things none of them had walked — all verified at the line and now in the plan:
**deleting a past session re-seeds from the catalogue and loses your typed
weights** (item 46 → `initial_exercise_state`), **the running-programs cache
never re-reads, so "Go to today's session" can show no program** (item 47 →
server list always wins), and **no weight can be lowered once running** (item
48 → one weight editor with a replayable event). Plus the goals planner's
one-way door, the missing "this pauses X" notice on two of three start paths,
the new-user dead end, and measured contrast failures (items 49–52).

**Still assumed, and said so:** the production address is HTTPS (blocker 5);
the r/Fitness PPL, StrongLifts and r/bodyweightfitness rules are as the lifter
critic and I recall them and are checked against the source page before the
data change ships (Q7, Q9, Q16). Nothing else in this plan rests on a claim
that was not opened in the repo.

## Destructive steps — flagged and gated

- **Phase 1 drops `program_session_logs`** after copying it, drops
  `is_warmup` after folding it into `set_kind`, and creates a unique index
  over existing sets. Gated on: the rows read by hand first, the migration's
  three self-checks (unmatched copy, lost sets, index collision — all pass
  today), and reading every migrated row back. Two real sessions.
- **Phase 3 drops `workout_templates`** after migrating two rows the same way.
- **Phase 6 adds an enum value** that cannot be removed.
- **Phase 0 changes how past sessions score** (Q3, Q7–Q11, Q16). Reported as a
  table and approved before persisted.
- **Phase 5 rewrites the plan's `splitDays`** only on the user's tap.
- **No phase touches another agent's files** except the one coordinated
  `playwright.config.ts` edit in Phase 8 (blocker 7).

## Appendix — what the leading trackers do

What "how people actually do workouts" means, concretely, in the apps lifters
recommend to each other. Read from the vendors' own feature pages and a 2026
digest of 200+ Reddit threads; nothing here is from memory.

- **A workout is started, not filled in.** Strong: pick a template (or an
  empty workout), the log screen opens with the exercises and sets, "hit
  Finish in the top right" when done, and "you don't need to complete all the
  exercises" ([Strong — my first workout](https://help.strongapp.io/article/229-my-first-workout)).
  Hevy: each set has a weight and reps, and you *mark the set complete*;
  marking it complete is what starts the rest timer
  ([Hevy — track workouts](https://www.hevyapp.com/features/track-workouts/)).
  Phase 2's ✓ per set is this.
- **The rest timer starts itself and tells you when it is done.** Strong's
  default is 2:00 for every exercise, "triggers immediately after a set is
  completed", is changed per exercise from the exercise menu, and expands to a
  full-screen view with skip ([Strong — rest timer](https://help.strongapp.io/article/231-rest-timer));
  Hevy notifies at zero ([Hevy — rest timer](https://www.hevyapp.com/features/workout-rest-timer/));
  newer apps put the countdown on the lock screen
  ([SettoTrack](https://apps.apple.com/app/settotrack-workout-tracker/id6758917667)).
  Phase 2's rest bar is the floor; a lock-screen countdown needs a native
  iPhone app, which a web page cannot be.
- **Set tags, not separate forms.** Strong: tap the set number to tag it
  Warm-up, Drop Set or Failure; "warm-up sets will not be included in charts
  or metrics" ([Strong — set tags](https://help.strongapp.io/article/166-set-tags)).
  Phase 1's `set_kind` is this.
- **Finish asks what to do with your changes.** Strong offers "Update
  Template", "Update Template and Values" or keep the template as it was
  ([Strong — update template](https://help.strongapp.io/article/177-update-template));
  Hevy's finish sheet lets you edit the duration and date before saving
  ([Hevy — workout log](https://www.hevyapp.com/features/workout-log/)). Phase
  2's finish sheet does both.
- **Bodyweight comes in three kinds** — bodyweight, assisted, weighted — and
  assisted volume is body weight minus assistance
  ([Hevy — bodyweight exercises](https://help.hevyapp.com/hc/en-us/articles/38386262243223-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted)).
  Phase 0 step 10's `loadStyle: "bodyweight"` and `direction: "down"` are
  this.
- **What lifters complain about, in the leaders' own reviews:** losing
  months of data to a sync; the app freezing exactly when the rest timer
  fires; no way back into an interrupted session; needing signal in a gym
  that has none ([Strong reviews](https://mwm.ai/apps/strong-workout-tracker-gym-log/464254577),
  [JEFIT review](https://etechshout.com/jefit-app-review/),
  [RP Hypertrophy reviews](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554?see-all=reviews&platform=iphone)).
  Phase 1's single record, Phase 2's server-side live workout with a browser
  queue, and the instant-based timer are the answers to exactly those four.
- **Last time sits beside this time.** A "PREVIOUS" column on every set, and
  a repeated exercise is pre-filled with last time's sets, weight and reps,
  editable ([Hevy — previous values](https://www.hevyapp.com/features/track-exercises/)).
  Phase 2's `SetRow` shows "last 60 kg × 8" and pre-fills reps from last time
  (item 2).
- **Warm-up and plate calculators, supersets, CSV export** are standard on the
  leaders ([Strong](https://www.strong.app/),
  [Hevy settings](https://help.hevyapp.com/hc/en-us/articles/33882110558743-Workout-Settings-Preferences-Timer-Warm-up-calculator-Plate-Calculator-Smart-Superset-Scrolling)).
  Plates and CSV exist here already; supersets are finally rendered in Phase 2;
  warm-ups are a decision taken above.
- **Which app lifters recommend, and why:** Strong for the fastest logging,
  Hevy for the best free tier and for following programs, FitNotes on Android,
  Boostcamp for coach-written programs
  ([Setgraph's Reddit digest, May 2026](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit),
  [Cora's 200-thread analysis](https://www.corahealth.app/blog/best-workout-tracker-reddit)).
  The recurring complaint is **lost data** — years of history gone with a
  phone change or a missing export — which is why Phase 1's single record,
  Phase 2's server-side live workout and the existing CSV matter more than any
  chart.
- **What none of them do that this app can:** tie the workout to a life plan
  and a cited progression engine. That is the reason to fix this rather than
  point people at Hevy — but only once the basics above are true.


---

# Execution log

## Phase 0 — DONE 2026-09-07

**Suite:** 4,465 unit + integration tests passing, 1 skipped (from 4,354 at the
start). Type errors 105, unchanged — the repo's typecheck ratchet
(`scripts/typecheck-ratchet.mjs`) reports none new.

**Migration applied:** `20260907090000_replay_from_seed.sql`. The pending list
was re-checked immediately before the push and held only this file. All five
enrollment rows were read back afterwards: every one has
`initial_exercise_state` set and equal to its current state, `replay_events`
empty, `bar_weight_kg` null.

**The replay report blocker 3 promised.** The corrected rules were run over the
two real logged sessions before anything was persisted. **No weight changes at
all** — all eleven lifts land on exactly the weights already stored, and the
cursor matches the database (cycle 2, two sessions). Nothing needed approving.
The reason is itself the bug: both sessions had logged the *bottom* of every rep
range, so nothing had ever progressed.

**What changed, and what pins it.** New file
`tests/unit/programs/enginePhase0.test.ts`, 25 tests, each failing on the code
as it was:

- **Skipping is not failing.** An absent or skipped lift holds its weight and
  does not touch the fail counter. Three skipped sessions no longer deload
  every lift by ten per cent.
- **The weight counts, both ways.** `judgeLoadEntry` returns advance /
  hold-lighter / fail. The next weight ratchets from the heaviest weight at
  which *all* the prescribed sets were made, so four sets at 80 plus one heavy
  single gives 82.5 and not 87.5. Every rep at a lighter weight holds and says
  so instead of counting as a miss.
- **The working weight is exact; the prescription is loadable.** This was found
  by a test, not by reading: with only 2.5 kg plates the old rounding made a
  2.5 kg program climb *five* kilos a session, twice its own rate, and rounding
  the other way would have frozen it for ever. Bar weight and smallest plate
  are now per-account with a per-enrollment override, and a program whose
  increment is finer than your plates keeps the same weight for one session and
  says why.
- **Rep ranges cannot be logged closed.** "6–8" was seeded as 6 and adding
  weight needs 8 on every set, so the three rep-range programs could never
  progress from the one-tap save. This is the mechanism behind the complaint
  about that button.
- **Calisthenics stops auto-promoting.** The session asked for the *unlock*
  threshold, so pressing save always cleared it. `SkillTier.workReps` is the
  ask; the unlock is separate.
- **Both other engines progress the day you logged**, not the day the cursor
  was on — the fix made for lifting in August, finally made for calisthenics
  and mobility.
- **Whose today.** `isoWeekdayInTimezone` plus `pickTodaysDay`, which moved out
  of the database layer into the engine where a unit test can reach it. One
  clock: the prescription carries `todayWeekday` and the week strip reads it.
- **Rest is decided by the lift**, not by how many sets it happens to have, and
  says whether the number is ours or the author's.
- **A blank box is blank.** `Number("")` is 0, so a cleared box logged a
  barbell lift as bodyweight and a cleared rep box logged zero reps, which the
  history refuses — the save failed halfway, after the weights had moved, and
  the screen said nothing. It now uses the guard written for exactly this, and
  every failed save is shown.
- **The real session is recorded.** Duration, intensity and the day you trained
  are asked for; the fixed "45 minutes at effort 3" is on its way out.
- **A weight can be lowered.** `applyWeightOverrides` plus an editor listing
  every lift's current weight. There was no way to correct a wrong starting
  weight short of ending the program.
- **The enrollment list always trusts the server.** The shared store never
  re-fetched once loaded, which is why starting a program in Life Mastery and
  tapping through could land on "No active program".
- **A catalogue program that gains a lift no longer bricks the people on it** —
  it seeds from the level or names the lift and says what to do.

**Cited programs corrected, each verified at the source on 2026-09-07 before
the data changed:**

- **StrongLifts deadlift** now 5 kg / 10 lb a session, dropping to 2.5 / 5 once
  that stalls — confirmed on stronglifts.com/5x5/progress/, which also gives no
  rest intervals, so the app's rest stays labelled as ours.
- **5/3/1** judges the set marked AMRAP every week, and moves the training max
  when the cycle ends, so the deload week is computed off the old max.
- **Push/Pull/Legs** re-encoded as the six-day r/Fitness template it cites —
  Pull A/B, Push A/B, Legs A/B, main lifts as straight sets with an all-out
  last set, arms supersetted with laterals. Nobody was enrolled on it, checked
  before the change.
- **Bodyweight Foundations** re-encoded as the r/bodyweightfitness routine's
  three pairs plus a core triplet, 3 × 5–8 moving on at 8.
- **Starting Strength** halves the press and bench jump after the first stall.

**Corrections to the plan, found while executing it:**

1. The plan said to snap free weights to a 2 kg rack step. That is wrong: it
   moves a weight the person typed (25 becomes 26) and still breaks a 1 kg
   increment. Free weights are rounded to a sensible precision instead and the
   increment decides the step. Two tests that asserted a 6 kg dumbbell becomes
   5 kg were pinning the bug and now pin the fix.
2. Fourteen catalogue lifts were being priced like barbells. Rather than
   hand-typing a flag on each, `loadStyleOf` derives it from the library, so a
   future program cannot get it wrong by omission.
3. The plan put the "holds and moves next session" message in as a patch. The
   real fix is the exact-weight/loadable-prescription split above, which
   removes the class rather than reporting it.


## Phase 1 — DONE 2026-09-07

**Suite:** 4,466 unit tests and 238 integration tests passing (integration is a
separate config — `npm test` excludes it, despite what `CLAUDE.md` says; both
were run). Type errors 105, none new.

**Migration applied:** `20260907100000_one_workout_record.sql`, after the
pending list was re-checked and held only this file.

**It failed twice before it applied, and the failures were the point.** Both
times the whole migration rolled back, so the database was never left half
changed:

1. The backfill matched a stored set to its program lift on the exercise NAME
   — and the session JSON has no name in it, only an id. The condition read
   `name = name`, so every set matched every entry and all eleven lifts in a
   workout were stamped with whichever id came first. **The unique index caught
   it**, which is the argument for putting the index in the same migration as
   the backfill rather than a later one. Replaced with an explicit
   name-to-id map, checked against the data first, plus a guard that raises if
   any set on a program workout is left unmatched.
2. Postgres will not let an UPDATE target be referenced from a JOIN condition.
   Moved to the WHERE clause.

**Every migrated row read back in full**, as blocker 3 promised:

| | |
|---|---|
| Workouts | 2, both linked to their program with day, cycle and week |
| Sets | 38, every one stamped with its program's lift id |
| Sessions left unmatched | 0 |
| Sessions that would have lost their sets | 0 |
| `program_session_logs` | dropped |

**Proved end to end against the real database** (throwaway spec, since deleted).
Enrolled, logged a session with one lift skipped, then edited and deleted it:

- **One record.** One session produced exactly one workout row, where it used
  to produce two rows in two tables that nothing joined.
- **The real duration.** 63 minutes at effort 4, as entered — not the invented
  "45 minutes at intensity 3" that every session used to be recorded as.
- **Skipping holds.** The skipped bench held; the other two lifts advanced.
- **The engine reads the same rows.** Three entries derived from the stored
  sets, the skip preserved.
- **Editing actually edits.** The correction applied (5 reps → 8). The same
  request returned 200 and changed nothing on 2026-09-06, because the table it
  wrote to had no update permission.
- **Deleting removes it everywhere.** Dashboard count and engine history both
  went to zero. A delete used to leave a ghost in every count, chart and export.

**What changed.** `program_session_logs` is gone. `workout_logs` carries the
program context, the three lifecycle states (written up after the fact /
running / finished), `adjustments` for what changed mid-workout, and a
`client_key` so a retry cannot log the same session twice. `workout_sets`
carries the program's lift id, a `library_id` for identity across programs,
`set_kind` (which replaced `is_warmup` — a boolean could not tell an all-out
top set from a back-off, and judging "the last set logged" as the AMRAP is what
made a back-off single read as a missed top set), `prescribed_index`,
`completed_at`, `rpe` and `side`. Zero reps is now a legal answer, which is
what made a cleared box crash the save after the weights had already moved.

**Constraints, not conventions.** Twenty new integration tests in
`tests/integration/db/workoutSchema.integration.test.ts` prove the database
itself refuses: a workout that is both running and finished; a running workout
claiming a duration it cannot know; a second workout started while one is
running; a retry with the same browser key; a workout ending before it started;
a live workout dated to a different day from the one it started; a workout
attached to somebody else's program (a trigger, because a row policy sees the
row you wrote and never the row you point at); a set slot written twice. And
**erasing a program now keeps the workouts**, detached, with their day and
cycle intact — the sibling test that used to prove the opposite (a cascade that
destroyed a year of training) now proves the new guarantee and says why it
changed.

**One helper, one rule:** `finishedWorkouts` wraps all sixteen reads of the
workouts table, because a workout in progress is a row in that table and every
existing counter, streak, heatmap, personal record and export would otherwise
count it the moment somebody pressed Start.

**Also fixed while here:** two shipped migrations had never reached the
integration schema (`high_quality_approaches_weekly` added, `percentage` and
`streak` tracking types removed), so the test database had silently drifted
from production. Both corrected.

**Correction to the plan:** it said the backfill map could be written as a
`CASE` from the program ids. It could not be derived from the session JSON at
all, because the JSON does not carry names — the map has to be explicit and
verified against the data, which is what it now is.

## Phase 2 — DONE 2026-09-07

**Suite:** 4,474 unit tests, 238 integration tests and 14 browser tests passing.
Type errors 105, none new.

**What shipped.** The form is gone. A workout is now a screen you stand in front
of for an hour: one row per set reading `20 kg × 5`, a ✓ that writes that set the
moment you tap it, a rest clock that starts itself at the bottom of the screen
where your thumb already is, and what you lifted last time sitting under the
boxes so tapping it copies it in. The old orange "I did all of this — save it"
button, the thing the request called out by name, no longer exists.

**Five defects found by attacking it, not by writing it.** Each is fixed, and
each has a test that fails without the fix.

1. **The summary was destroyed by the thing that produced it.** Saving clears
   the live workout, and the screen checked "no workout → say it is finished"
   before it rendered the sheet. So the reward for an hour — the minutes, the
   volume, the new best, what the program will ask for next time — was replaced
   in the same frame it arrived. Nobody would ever have seen it.
2. **A set could be lost by ending the workout normally.** Finishing was blocked
   only while a write had already FAILED. A write still on the wire counted as
   saved, so tapping the last ✓ and going straight to Finish let the finish
   request overtake the set request. The summary said nothing was lifted, and
   worse, the progression engine judged the lift as missed and held the weight
   back for a set that had in fact been done. Tapping quickly is how everybody
   ends a workout; this was not an edge case. In-flight writes are now counted,
   the rule lives in the hook rather than in whichever screen calls it, and the
   button says "Saving your last set…" while it waits.
3. **A new best was announced once per set.** Three sets of five at a new weight
   said "New best" three times, for the same lift, on the same numbers. The
   running best was built from the history and then never raised as the session
   was read. Now the best set of the session is the record, and it is one line.
4. **"Missed reps (1/3)" was wrong twice in four words.** It was printed for a
   session where somebody did one clean set of five and then had to leave — they
   missed no reps at all, the sets ran out. And the "(1/3)", meant as "the first
   of three misses before the weight drops", reads as one rep out of three. The
   judge now returns WHAT fell short (sets, reps, or both) and the line says it
   in words: "Only 1 of 5 sets → same weight next time. 2 more like this and the
   weight comes down."
5. **Two things a phone hid.** The set row read `20 kg 5` with nothing saying the
   5 was reps; the × is back. And the rest bar's caption was squeezed into about
   sixty pixels between the progress bar and the −30s/+30s buttons, so it
   rendered as "resting — 3:00 is…" — the half cut off being the half that says
   the number is ours and not the program author's. It now has the full width.

**Also fixed:** the elapsed-time clock started its interval inside a `useMemo`,
which returns a value rather than a cleanup, so it leaked an interval per mount
and cleared none. And the per-set "not saved yet" indicator existed but was
never passed a value, so a failed write named no set; it is now driven by the
optimistic id the row still carries until the server confirms it.

**Verified in a browser at 390 × 844**, not inferred from routes:

| | |
|---|---|
| First set and its ✓ without scrolling | yes |
| Sideways scroll anywhere on the screen | none |
| A ticked set after a reload | still ticked |
| Rest clock after 10 s in a background tab | correct to the second |
| Summary after saving | shown, and stays |
| Personal best in the summary | named once, `Squat 185 kg × 5` |

**Coverage kept, not thrown away.** The two throwaway specs became
`tests/e2e/programs-live-workout.spec.ts`, the first permanent browser test this
slice has ever had: five tests covering the set-by-set flow, the summary, the
backgrounded rest clock, and the API rules (a retried start returns the same
workout, a second workout is refused, re-ticking corrects rather than duplicates,
finishing twice is refused). The file runs serially because the suite is
`fullyParallel` and these share one account — in parallel they delete each
other's workout and fail for reasons that have nothing to do with the code.

**Correction to the plan:** the acceptance criterion "the finish sheet names the
PR when one was set" cannot be tested by logging the prescribed weight, because
the shared test account keeps history between runs and 20 kg had been lifted
before. The test now types a weight beyond any history, which also pins a second
rule worth pinning: the number saved is the number typed, not one the app
rounded to a plate on the way past.

## Phase 2 — SECOND PASS, 2026-09-07: twelve more defects, all fixed

The first pass was written; this one was an adversarial read of the same code by
somebody told to break it. It found twelve real faults, three of them capable of
losing or corrupting a lifter's data. This is why the failure list ships with the
work rather than after it.

**The three that lost or corrupted data.**

1. **Everything a pounds user did was rewritten into kilograms.** The database
   stores kilograms; the live screen was handed that raw number and printed it
   beside a label reading "lb". A 135 lb bench came back on screen as "61.23 lb",
   and tapping it again saved 61 lb. At the end the program compared 61 to 135,
   decided the lifter had gone light, and stalled the weight. The summary was
   worse: "kg lifted" and "185 kg × 5" hard-coded on a screen otherwise entirely
   in pounds. The live workout now carries its own unit, every set carries the
   number the lifter typed alongside the kilograms used for totals, and nothing
   on screen guesses.
2. **A set could be erased by the retry that was meant to save it.** The offline
   queue was copied, sent over several seconds of bad signal, and then written
   back over storage — so anything ticked during those seconds was wiped. The ✓
   stayed green, the "not saved yet" count went to zero, Finish unlocked, and the
   set never reached the server. Flaky gym wifi is exactly when a flush runs. The
   flush now removes only what it actually sent.
3. **"Don't count it" did nothing.** The button is offered precisely for a lift
   that was started and cut short, and the skip was only applied to a lift with
   no sets at all. Two of three squat sets, tapped "Don't count it": the warning
   disappeared, the person believed it was handled, and the engine still scored a
   miss and stepped towards a ten per cent deload off a weight that was never
   failed. That is the exact bug the engine's own comment was written to kill,
   reintroduced by the screen above it. The sets now stay on the record — they
   were done, and they count towards volume and records — and only the judgement
   is withheld.

**The rest.**

4. **The retry protection for Start had never once worked.** The browser key was
   minted fresh inside each request, so no two attempts ever matched and the
   column, its unique index and every comment about idempotency were inert. Lose
   the reply on a first tap and the second was refused as "a workout is already
   in progress" — for the workout just started, reachable only by a manual
   reload. The key is now kept in the browser until a start succeeds.
5. **Undo did nothing on a set that had not reached the server yet.** It sent the
   placeholder id to a route expecting a real one, the database refused the cast,
   and the failure was swallowed — so offline, the ✓ would not come off, tap
   after tap, with no message, and the queued write later saved the very set
   being undone. Undo is now local for a set the server has never seen.
6. **A set the server permanently refused stayed on screen as done.** Now it is
   removed and named.
7. **A slow reply could un-tick a set.** Every response replaced the whole
   workout, so a delayed one carrying an older snapshot erased a newer tick. The
   finish sheet is computed from that copy, so it then reported a completed lift
   as short. Responses older than one already applied are ignored.
8. **Errors were rendered only inside the finish sheet.** "One set could not be
   saved and has been dropped" — a permanently lost set — was announced to
   nobody until an hour later, if at all. Errors now appear on the workout
   screen, and the three calls that could reject offline no longer throw into
   nothing.
9. **The queue was only ever retried on page load or an `online` event.** A
   captive-portal gym wifi never takes the browser offline, so a single failure
   left Finish disabled for the rest of the session with a page reload the only
   escape. It now also retries on a timer and when the tab comes back.
10. **A workout left open could not be finished at all.** Started Tuesday,
    closed Thursday, the duration came out at 2,220 minutes and the server
    refused it with "Could not finish that workout" — and since only one workout
    may be open, that left the person unable to start any workout, with nothing
    saying the end time was the way out. The sheet now says so before saving.
11. **Records were dated by the server's clock.** A Berlin lifter finishing at
    00:30 Tuesday had the record filed on Monday. The lifter's timezone and the
    workout's own start now decide the day. (Nothing renders this value yet, so
    it was a wrong number nobody saw — it would have become visible the moment
    anything showed it.)
12. **The personal-best baseline read every workout ever, unordered.** Past the
    hosted row cap that becomes an arbitrary slice of history, and the app would
    announce a "New best" for a lift beaten years earlier. Bounded to the most
    recent 400 workouts.

**Also corrected:** the elapsed clock started its interval inside a `useMemo`,
which returns a value and not a cleanup, so it leaked one per mount; the set row
read `20 kg 5` with nothing saying the 5 was reps; and the rest bar's caption was
squeezed into about sixty pixels, rendering as "resting — 3:00 is…" where the
half cut off was the half saying the number is ours and not the program author's.

**Nine regression tests** on the hook and the engine, each checked by reverting
the fix and confirming it fails: four fail without the queue, sequence, undo and
rollback fixes; four pin the skip behaviour; one pins the record date.

**Authorization was checked and found sound.** Every workout route authenticates
first and passes the session's own user id; a foreign workout id fails before any
write; the finish is a locking function that refuses a second call. Reported for
completeness rather than as a finding.

## Phase 3 — IN PROGRESS 2026-09-07 (blocked on applying the migration)

**Done and verified.**

- **`20260908100000_program_drafts.sql` is written and was dry-run against the
  real database inside a transaction that was rolled back.** Both live templates
  converted correctly: the three "incline 12 kg × 8" rows became ONE lift asking
  for three sets of eight with a working weight of 12 kg, and the empty template
  became an empty day. The dry run also caught two real SQL faults before they
  could touch anything — a `GROUP BY` that could not see the column it was
  grouping, and lifts keyed by name rather than by slug, which would have failed
  on a duplicate key for two spellings of one exercise.
- **A draft is allowed to be unfinished.** `DraftScheduleSchema` permits a day
  with nothing in it yet, because building a week over two sittings is the
  ordinary case and refusing to save one is how the builder lost everything when
  a tab was closed. `CustomScheduleSchema` still requires a lift per day, and
  starting a draft validates against it and names the day that is still empty.
- **Repo and API**: `src/db/programDraftRepo.ts` plus list/create/update/delete
  and start. Starting carries the draft's own NAME onto the enrollment; the
  hard-coded "Your program" is gone.
- **The old template path is removed**: the route, the three repo functions, the
  types, and the logger's template panel and "repeat last". The screen is now
  "Log a past workout" and was checked in a browser: it renders, mentions no
  templates, and throws nothing.
- **Thirteen integration tests** against real Postgres, including the security
  property under `SET ROLE`.

**A trap worth recording.** The first version of those security tests passed
while proving nothing: `getClient()` opens a NEW connection per call, so the
`SET ROLE` ran on one connection and the query on another, and every denial test
sailed through against a session that was still the table owner. Fixed by running
each block on one connection — after which five of them failed until the policies
were actually reached. Any future policy test in this repo must do the same.

**A claim corrected.** The migration's comment said an explicit `WITH CHECK` was
what stopped somebody handing their draft to another account. It is not:
Postgres uses an UPDATE policy's `USING` clause as its `WITH CHECK` when none is
given, verified here by removing the clause and re-running — the give-away was
still refused. The clause is kept as documentation, and the comment now says
what is actually true.

**Migration APPLIED 2026-09-08**, after the pending list was re-checked and held
only this file. Verified against the live database rather than assumed:

| | |
|---|---|
| Templates before | 2 |
| Drafts after, `source = 'saved_workout'` | 2 |
| `workout_templates` | dropped |
| Row security on `program_drafts` | on, 4 policies, 1 trigger |
| `scripts/audit-rls.ts` | 63 tables checked, none left open |

Both rows were read back **in full**, not counted. The three "incline 12 kg × 8"
rows became ONE lift asking for three sets of eight with a working weight of
12 kg; the empty template became an empty day; both kept their original dates.

**And proved through the app's own routes, in a browser** — now a permanent
spec, `tests/e2e/programs-drafts.spec.ts`:

- **Another account's drafts are not listed.** The two migrated drafts belong to
  the owner's account; the test account signs in as somebody else and sees none
  of them. That is the row rule working through the real app, not only in a
  harness.
- **A half-built week saves as it is** — one day with a lift, one day with
  nothing yet.
- **And is refused a start, by name**: 422, *"Add at least one lift to Pull
  before starting this."*
- **A duplicate name is refused in words**, not as a database error.
- **A rename does not empty the week.** Sending only `{name}` keeps the days and
  the weights, which is the difference between a patch and a replace.
- **Filled in, it starts under its own name** — the enrollment is labelled
  "E2E Week Renamed", not "Your program".

**Still to do in this phase:** the builder saving and loading drafts, the saved-
weeks list on screen, starting an empty workout with lifts added on the day, the
past-workout logger taking an optional program day, deleting
`TodaySessionWidget`, and the seed-a-year script.

## Phase 1 fallout — three live regressions from my own migration, 2026-09-08

Found by mapping the code the rest of Phase 3 touches, not by anything failing.
The 20260907100000 migration replaced the `is_warmup` boolean with `set_kind`
and dropped the column; three places were still reading it, and against the real
database all three were broken from the moment that migration was applied.

1. **Every strength goal read an error instead of a number.** The estimated
   one-rep max for the bench, squat, deadlift and overhead press, and the
   maximum pull-ups, are all computed by two queries that filtered on the
   dropped column. Both threw. They are also called behind a `.catch()` that
   only writes to the console, which is exactly why nobody saw it.
2. **The warm-up switch on the written-up workout form did nothing.** The form
   sent `set_kind`, the validator still listed `is_warmup`, and a validator
   deletes fields it was not told about. So every warm-up single was stored as
   ordinary work: counted in the volume total, and eligible to be announced as a
   personal best.
3. **A refused set left an empty workout behind.** The workout row is written
   first and the sets after, with no rollback — so a set the database refused
   left a session that counts towards the streak, the heatmap and the totals
   while recording nothing that happened. The person sees an error, tries again,
   and now has two.

**Also corrected while here:** the set schema allowed a weight of 1000 kg while
the column is `NUMERIC(5,2)`, whose ceiling is 999.99 — so the app said yes and
Postgres then failed with a numeric-overflow message nobody could act on.

**Proved against the real database, now `tests/e2e/health-past-workout.spec.ts`:**
a workout written up with a warm-up and a working set saves, and the warm-up
comes back as a warm-up; a workout whose sets the database refuses is rejected
and leaves nothing behind. Both were checked by reverting the fix and confirming
the test fails — without the rollback the account gains an empty session.

**Seven unit tests** on the schema, five of which fail without the fix.

**One thing NOT verified end to end, and why.** The one-rep-max queries are only
reachable through `syncLinkedGoals`, which runs when a tracking session ends and
whose two call sites swallow the error. I fixed the queries, checked the filter
against the live data in SQL, and used the `.in()` builder form that five other
repo reads already use — but I did not drive a tracking session to completion to
watch the number appear on a goal. That the errors are swallowed is worth a
decision of its own: a metric can break and nothing will say so.

## 2026-09-08 — "if something is broken it should be shown"

The migration was applied and verified (above). Acting on the instruction that
followed, five readers swept the app for one specific fault: a number shown to a
person when the code that produced it had failed. Every finding was then handed
to a second agent told to refute it.

**59 findings, written up in `docs/plans/silent-failures.md`** with the file,
what a person sees, and how to reproduce each. Nine were fixed the same day —
the ones in this slice, the ones I had introduced, and the metric layer they all
run through. The rest are described rather than fixed, and the doc says so.

**The three worst, all in code from this plan:**

- A failed history read made **every set of an ordinary session a personal
  best**, because a discarded error came back as an empty history.
- A failed profile read **silently switched a pounds lifter into kilograms**,
  because the error was discarded and the default was "kg". There is no safe
  guess for a unit, so it now refuses.
- A failed programs fetch **said "No active program"** to somebody three weeks
  into one, and offered them the catalogue.

**And the guard that was supposed to catch this kind of thing was itself
blind.** The write-coverage scanner took a function body to start at the first
`{`, so any function returning `Promise<{ ... }>` had its return type read as its
body — 23 write paths were invisible, 11 with no test asserting what they save.
Fixing it uncovered a second fault in the same tool: it read a COMMENT containing
the words "this function is expected to write" as a function named `is`, and
because it propagates by name, every Supabase read filtering with `.is(...)`
looked like a write. Comments and strings are blanked before scanning now.

