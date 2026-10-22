# Any program, picked or built: the gym becomes a program builder

**Status:** written 2026-10-18 by session daygame-coach-c2. Phases 0–5 done 2026-10-22 (session daygame-coach-fc); Phase 6 is next (it opens with B-DESIGN).

**Written for** the owner first (Part 1), then for the AI session that executes it (blockers, questions,
phases, Part 2, and the `/goal` prompts at the end).

**Where it sits.** Delivers vision items 28 ("being rebuilt now") and 30 ("more workout templates may be
needed") in `docs/product/vision.md`, and replaces the gym half of `docs/product/map.md`'s `programs/`
entry. It builds on `docs/plans/training-three-doors.md` (all eleven phases executed 2026-09-23); it does
not redo that plan's screens, only the model under them and the editors on top of them.

**Who owns what.** The gym slice (`src/programs/`, `app/(app)/training/`, `app/api/programs/`,
`app/api/workouts/`, their tests) is this plan's for its whole run. One peer session existed when it was
written (`daygame-coach-63`, idle). Anything outside the slice that this plan touches is listed in the
step that touches it.

---

# PART 1 — In plain words

## Words used here

| Word | Meaning |
|---|---|
| Program | A training plan: which days, which lifts, how many sets and reps, how heavy, how it changes over weeks. |
| Top set | One heavy set done first, e.g. "1 set of 2–5 reps". |
| Backoff sets | Lighter sets after the top set, e.g. "3–5 sets at 70–80% of the top set's weight". |
| RPE | How hard a set felt, 1–10. RPE 8.5 means "one or two reps left in the tank". RIR ("reps in reserve") says the same thing the other way round. |
| 1RM / training max | Your one-rep max, and a slightly lower number (often 85–90% of it) that some programs calculate from. |
| AMRAP, "5+" | As many reps as possible; "5+" means at least 5, then as many as you can. |
| Rotation | Days done in order regardless of weekday (A, B, A, B…), as opposed to "Monday is bench day". |
| Progression rule | What the program does with your weights after a workout: add 2.5 kg, hold, drop 10%, and so on. |
| Built-in program | One of the ready-made programs every user can pick. There are 13 today. |
| Starscream | The program in your Google Sheet (see the correction below). |

## A correction first: your sheet's program is called Starscream, not Dark Horse

On the earlier page I called your program "Dark Horse", because the sheet has a tab with that name. That was
wrong, and you were right to ask why we would need it. The program in your sheet is **Starscream**, a free
12-week, 5-day hypertrophy program by u/BenchPauper on Reddit (Lift Vault lists it as "Starscream: 12 Week
Hypertrophy Program"). The "Dark Horse" tab in your sheet is empty, and "Dark Horse" is also the name of an
unrelated program by a different author. Nothing needs installing. The fit check page has been corrected.

## What you are agreeing to

- **Money:** none. Nothing in this plan buys, rents or subscribes to anything.
- **Your data:**
  - **Already done today (you said yes):** your Upper/Lower program is stopped. Its two finished workouts
    (4 and 6 Sep) are kept. One empty, never-finished workout that someone opened on 23 Sep (0 sets) was
    thrown away, because the site refuses to stop a program while a workout is open on it. Both rows were
    backed up first.
  - **Waiting for your yes (Q18):** you said you never used Upper/Lower, but those two finished workouts
    (38 sets) are on your account and show in your History and your best lifts. They were probably made by
    an automated test or an earlier Claude session. My recommendation is to delete them, with a backup.
- **The live database (you said yes today).** These changes are made to the real site's database. None of
  them deletes anything, and each one comes with a written way back:
  1. RPE can be saved in half steps (8.5), not only whole numbers.
  2. A new table for programs people build themselves.
  3. Each running program keeps its own copy of its rules, so editing a program later does not rewrite
     the past.
  4. The numbers the app calculates (your working weights, which week you are in) can only be changed by
     the app's own calculations, not written straight into the database by a user. Today they can be;
     see "Security" below.
- **What becomes public:** Starscream appears in the program list for every user, credited to
  u/BenchPauper, with the explanations written in our own words. Other free programs may join it (Q2).
- **What cannot be undone:** nothing in this plan, apart from the deletion in Q18 if you say yes.

## The short answer

Yes, this can be built, and it is the right next step for the gym. Today a user can pick one of 13 programs
and change its sets, reps and starting weights, or type a simple week into a text box. **Nobody can build a
program with real rules**: "the backoff is 70–80% of today's top set", "week 12 is heavier", "add weight when
you hit the top of the range", "5/3/1 percentage waves". So your sheet cannot be made in the app, and neither
can most popular programs. You are right that this makes the gym not really functional for anyone who
arrives with their own program.

The fix has two layers:

1. **One general way to write down any program** (the "program format"). Researched against 32 real
   programs; it covers 29 of them exactly and the other 3 closely (details below).
2. **A builder people can actually use**: pick a ready program, change anything in it, or start from
   nothing, using plain-word presets ("top set + backoffs", "add weight when you hit the reps", "percent of
   your max, changing each week") instead of a programming language.

Your Starscream program is the acceptance test: it must be buildable **by hand in the builder**, on a phone,
and run exactly like your sheet. It also ships as a ready-made program for every user.

**Size, honestly:** this is the biggest change to the gym since it was built. About ten phases; several
days of AI work, not hours. Your sheet keeps working in the meantime, so start on it tomorrow as planned.

## What exists today (checked in the code and the live database on 2026-10-18)

- The gym lives at `/training`: Today, History, Progress, a set-by-set live workout screen with a rest clock
  and plate maths, 13 built-in programs, and a text box (`?view=build`) for typing a simple week.
- Program rules the engine knows: fixed sets×reps, an all-out last set, 5/3/1-style percentage weeks, and
  rep ranges. Progression: none, add weight, percentage cycles, double progression. *(Corrected
  2026-10-22: it also knows calisthenics ladders — move to a harder variation at 8 reps — and timed holds
  that grow, used by Bodyweight Foundations and the splits program; running plans have their own engine.)*
- **What nobody can do:** set-count ranges ("3–5 sets"), RPE targets, half-step RPE (8.5 is refused by the
  database), weight from a set done earlier the same day, different rules in different weeks (except 5/3/1's
  table), weeks that follow the calendar, a program that ends, choose-on-the-day lifts ("back or front
  squat"), pyramids, rules on failure other than "drop 10%".
- **Editors:** the program editor changes day names and order, and per lift its sets, reps, range,
  starting weight, swap, move and remove. Progression rules, supersets, notes, weeks and rest cannot be
  edited anywhere. There is no way to build a program from scratch except the text box. *(Corrected
  2026-10-22: the editor can also add and remove days and lifts and pin days to weekdays; a rest time
  changed on the live screen can be kept into the program; supersets can be typed in the text box with
  "+". Progression rules, notes and weeks still cannot be edited anywhere.)*
- **The text box misreads silently.** "Bench Press 3-5x5-10" is saved as a lift called "Bench Press 3"
  doing 5×5-10; "Dips 5*10" is saved as a lift called "Dips 5*10" at the default 3×8. No warning.
  *(Fixed 2026-10-22 in Phase 0: the first is refused with a sentence, the second reads as 5 × 10.)*
- **A real bug:** your bar and smallest-plate settings never reach the weight calculation. Every
  prescription uses a 20 kg bar and 1.25 kg plates whatever you set. Fixed in Phase 2.
- **Live data is tiny:** 13 started programs (12 belong to test accounts), 0 edited programs, 2 saved weeks
  (both yours, named "2" and "12", from July), 146 workouts (144 from test accounts). Moving to a new format
  is therefore safe.

## What "any program" means: the research

32 widely used programs were broken down rule by rule (StrongLifts, Starting Strength, GZCLP, nSuns, 5/3/1
in two versions, Texas Method, Madcow, Reddit PPL, PHUL, PHAT, Greyskull, Ivysaur, Candito, Sheiko, Calgary
Barbell, Juggernaut, RP-style hypertrophy, Lyle GBR, Nippard, Starscream, Bullmastiff, Jacked & Tan,
Building the Monolith, Smolov Jr, the bodyweight Recommended Routine, Barbell Medicine/RTS, Rippler, wave
loading, SBS RTF, DC). Of those 32 programs:

- 31 need fixed sets×reps, 16 need "N+" or AMRAP sets, 13 a rep range, 9 different reps or % per set
  (pyramids), 6 a top set with backoffs, 4 a set-count range.
- Weight comes from: plate rounding (≈20), an absolute weight (9), % of 1RM (7), % of a training max (7),
  % of another set or day (7), RPE (6), your own choice (6), bodyweight (5), % of another rep max (3),
  RIR (2).
- 14 change something week to week from a table, 7 have a test week, 6 a planned deload, 4 an RPE/RIR ramp.
- Progression: add weight on success (9), double progression (8), drop after N misses (8), retest and
  recompute (7), RPE-driven (6), AMRAP reps decide the jump (5), a fixed bump per cycle (4), a change of
  scheme on failure (2).
- Supersets (6), giant sets (2), "pick an accessory" (8), either/or lifts (4).

**How other apps handle building:** Liftosaur can express almost anything, but through a programming
language users call hard to learn. Boostcamp has a form and a spreadsheet-style web creator with RPE and %
of 1RM, but no training max and paid-only progression. Hevy and Strong have no %, no RPE targets and no
multi-week programs, so users fall back to Google Sheets, which is exactly what happened to you. The
patterns worth copying: presets with a few numbers to fill in, a week table that shows only what changes,
"duplicate this week", a maxes panel with a rounding step, and a preview of what week N will look like.
What users complain about: rules hidden in free-text notes, unreliable week copying, building being painful
on a phone, and progression locked behind a paywall.

## How the finished builder works

1. **Pick.** The program list gains filters (goal, days per week, level, equipment, length) and every
   program can be opened, read week by week, and started as it is.
2. **Customize.** "Customize" on any program makes it yours: every day, lift, set, rule and week can be
   changed, before you start or while it runs. Changes apply from the next workout; your history keeps
   the version you trained on.
3. **Build from nothing.** Name it, choose "fixed weekdays" or "in order", choose how many weeks and what
   happens at the end (finish, or start again), add days, add lifts. For each lift you pick a **set
   pattern** from presets and fill in numbers:
   - straight sets ("3 × 8"), rep range ("3 × 8–12"), "N+" last set,
   - top set + backoffs ("1 × 2–5 at RPE 8.5, then 3–5 × 5–10 at 70–80% of the top set"),
   - percent of a max with a week table (5/3/1, nSuns), pyramids, timed holds,
   - or "custom" to edit the set groups directly.

   Then a **progression rule** from presets: hold, add weight when the reps are hit, double progression,
   AMRAP reps decide the jump (a small table), change of scheme on failure (GZCLP), a bump per cycle, RPE
   decides the weight, add a set per week, or a ladder of harder exercises.
4. **Weeks that differ** are set in a week table showing only what changes: "Weeks 1–11 top set 1 × 2–5 at
   RPE 8.5; week 12 1 × 1–5 at RPE 9". Weeks can be duplicated, marked as deload or test weeks.
5. **Maxes panel:** your 1RMs or training maxes per lift, the plate step, kg or lb, and lifts whose max
   is derived from another one ("front squat = 70% of back squat").
6. **Preview** shows any week exactly as the live screen will, with your numbers.
7. **For power users:** the text box remains, with a clearer notation and no silent misreads. It is a
   shortcut, never the only way.
8. **At the gym:** the live screen shows target RPE, "3–5 sets" with an add-set button, and the backoff
   range filled in the moment you tick your top set. It works on the phone with no signal and sends the
   sets when signal returns.

## Security, stated plainly and unasked

- **Users can write their program's calculated numbers directly.** Checked on the live database today:
  any signed-in user may update every column of their own started programs, including the working
  weights and week counter the app calculates. `docs/plans/training-three-doors.md` says this was locked
  in September; it is not. The damage is limited to a user's own numbers (the database still refuses
  writing another user's rows). Phase 3 locks it.
- **What Phase 3's lock does not close (found 2026-10-22).** The app works out the new numbers on its own
  server and then hands them to six database functions (finishing a workout, correcting or deleting one,
  starting or resuming a program). A signed-in user can call those functions directly with numbers they
  made up. The lock stops the simple route (writing the table); this one stays open. It is limited to
  the user's own program, exactly like today. Closing it means letting only the server call those
  functions, with a key ordinary users never hold — a bigger change than this plan, so it is recorded for
  the Phase 10 security review rather than done here.
- **The workout kept for opening with no signal, on a shared phone (found 2026-10-22, Phase 5).** The
  phone keeps the open workout's page and its last saved state so it opens in a basement. Log Out clears
  both, and so does finishing or throwing the workout away. A session that ends any OTHER way — it
  expires, or is signed out from another device, or cookies are cleared — leaves them until the next
  sign-in page, so someone else opening that page on that phone with no signal would see that workout.
  The time tracker and the Black Box already work this way. Recorded for the Phase 10 security review
  (the fix: clear them whenever the server answers "not signed in").
- **Programs written by users are data from strangers.** Every program is checked against the format on
  the server, size-limited, and never run as code. There is no scripting language, so there is nothing to
  inject. Program text is shown as text, never as page markup.
- **Sharing programs between users is not in this plan** (Q6). It brings moderation and privacy questions
  of its own.
- **Copyright:** Starscream's sets and reps are a training method and free to use; the sheet's notes are
  u/BenchPauper's own writing, so the app uses its own words and credits him. Paid programs (Nippard,
  Calgary Barbell, Juggernaut, RP, newer Candito) are never shipped as ready-made programs. Liftosaur's code
  is under a licence (AGPL) that would force this app's code public if copied: ideas only, no code.

---

# BLOCKERS — things only a person can do, or that may stop execution

Each was attempted on 2026-10-18. The result is what happened.

| ID | What | Attempted, and what happened | Blocks | Recommendation |
|---|---|---|---|---|
| B-DEADLIFT | Your real deadlift numbers | Read your sheet: deadlift max 70 kg (Master C6), but week 1's heavy deadlift top set is typed as 110 kg (H12), so the sheet prescribes backoffs of 77.5–87.5 kg, above your listed max. One number is wrong. | Your starting values in Phase 9 only. Not the build. | Tell me which. Until then, clear H12 in the sheet and type the top set you actually lift. |
| B-OLD-WORKOUTS | Delete the two September workouts on your account that you did not do | Read only: 4 Sep (20 sets) and 6 Sep (18 sets), both with the pre-filled "45 min, effort 3", both on Upper/Lower. Backed up the Upper/Lower row today; these two not yet deleted. | Nothing; only your History and bests stay polluted | Q18: delete, with a backup first |
| B-OWNER-ACCOUNT | Start Starscream on your account without your password | Probe in a rolled-back transaction: the database can act as your account (`auth.uid()` = your id, 1 program row visible), so the app's own `start_enrollment` function can be called as you. | Nothing | Phase 9 does it this way; no password is ever needed or asked for |
| B-LIVE-DB | Apply schema changes to the live database | `supabase migration list --linked`: all 61 (62 on 2026-10-22) migrations in the repo are applied to production; none pending, so a push applies only this plan's. You authorised schema changes on 2026-10-18. | Phase 3 | Check the list again right before each push; another session may have added one |
| B-DESIGN | Your eyes on the builder before it is built | Cannot be attempted in advance | The start of Phase 6 | Phase 6 opens with a clickable mock-up page you mark Yes/Maybe/No per screen, like the naming board; building waits for your marks, all other phases continue meanwhile |
| B-PEER-TREE | Another session's unfinished change turns the pre-commit tests red | ListAgents: one peer, `daygame-coach-63`, idle | Committing, while it lasts | Message that session with the failing test names; continue with work that needs no commit; never edit its files |
| B-CI | Reading CI results | `gh auth status`: logged in as reachjvc | Nothing | — |
| B-MAIN | Pushing to the live site | Your standing rule: push without asking. `training-rebuild` is 8 commits ahead of `main` today, 0 behind. | Phase 10 | Fast-forward only, after the `checks` job is green on the same commit and no CI run is in flight |
| B-LICENCE | Permission from u/BenchPauper | Not attempted: contacting him needs your Reddit account | Nothing (own words + credit are enough) | Optional: send him a message saying the program is credited in the app |
| B-DISK | Disk space for builds and browser tests | `df -h /mnt/c`: 1017 GB free | Nothing | Check again before Phase 9's browser runs |

---

# OPEN QUESTIONS — each decided, with the cost if the decision is wrong

Q2, Q16, Q18 and Q19 are yours; the rest are technical defaults you do not need to judge.

| # | Question | Decision (recommendation) | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Name in the catalogue | **"Starscream (12-week hypertrophy)"**, credited "by u/BenchPauper", explanations in our words | Leave the name out | None |
| Q2 | Which other programs join the catalogue | **Starscream now, plus free programs that each prove a different rule:** GZCLP (scheme change on failure), nSuns 5-day (AMRAP table), Reddit PPL (N+ sets + double progression), Greyskull LP (double jump), Texas Method (% of another day), Madcow 5×5 (ramps from the top set), 5/3/1 Boring But Big. Each credited; each one's terms checked in Phase 8. | Starscream only | Each extra program costs a data file and its tests; none can break another |
| Q3 | Lifting only, or running and mobility too? | **Lifting** (strength, bodybuilding, calisthenics with weights or reps). Running, triathlon and mobility keep their current engine unchanged. | All at once | A running builder later is its own plan; the format leaves room for it |
| Q4 | A text notation? | **Yes, as a shortcut:** one line per lift, e.g. `Bench Press 1x2-5 @rpe8.5, 3-5x5-10 @70-80% top`. Our own grammar, parsed, never executed. | Forms only | None; forms remain the main path |
| Q5 | Import a Google Sheet? | **No automatic import of sheets with formulas.** A CSV paste of a week table (Phase 7) covers simple sheets. | Formula import | Formulas are arbitrary programs; reading them reliably is a project of its own |
| Q6 | Share programs between users? | **Not in this plan.** Programs are private to their owner. | Share links now | Moderation, privacy and copyright arrive with sharing |
| Q7 | Built-in programs: keep as code files? | **Yes, rewritten in the new format** (one format everywhere), reviewed and tested like code. | Store them in the database | A database copy could drift from its tests |
| Q8 | How weeks are counted | **By the calendar from the start date for fixed-weekday programs; by completed workouts for "in order" programs.** The user can switch either way. | Always by completed workouts (today) | Skipping a Friday no longer freezes the week |
| Q9 | What happens after the last week | **The author chooses "finish" or "start again"; at finish the app offers: repeat, retest your maxes, or pick another program.** | Always loop (today) | None |
| Q10 | How RPE is stored | **Numbers 1–10 in half steps** (`numeric(3,1)`, checked). RIR is shown as 10 − RPE when the program is written in RIR. | Store RIR separately | One conversion to keep correct |
| Q11 | How a max is estimated from a set | **RTS's reps × RPE table** when RPE was logged; Epley when it was not | One formula | Suggestions off by a few percent; shown as suggestions, never forced |
| Q12 | Where the backoff range is worked out | **On the phone**, from the sets already on screen, so it works with no signal; the server re-checks it at finish. One shared function does both. | On the server per set | Offline gyms would see no range |
| Q13 | Monday's bench and Friday's bench: one history or two? | **Two "last time" columns (per slot), one set of personal records (per lift).** | One shared | Mixing a heavy top set with Friday's volume sets made "last time" meaningless |
| Q14 | Editing a running program | **Applies from the next workout; the history keeps the version you trained on** (each program change is a stored version) | Rewrite the past | — |
| Q15 | Phone or desktop builder | **Phone first**, wider layout on desktop | Desktop first | Most users build on the phone they train with |
| Q16 | Your start date on the site | **Monday 19 Oct**, the same as your sheet, so the site's week number matches. At switch-over I copy the top sets you logged in the sheet into the site's History. | Start week 1 the Monday after release | You would be on two different week numbers |
| Q17 | Locking the calculated numbers | **Yes:** a database rule lets only the app's own program functions change them | Leave it | Low risk either way; it closes the gap the September plan claimed to have closed |
| Q18 | Delete the two September workouts you did not do | **Delete, after a backup** | Keep them | Your History shows two workouts you never did, and your "bests" start from them |
| Q19 | Your deadlift: 70 or 110 kg? | You decide (B-DEADLIFT) | — | Wrong starting weights in your first week on the site |
| Q20 | The old text box | **Kept, with the new notation and errors for anything it cannot read** | Remove it | — |
| Q21 | Offline opening of the gym | **Yes:** `/training/live` opens with no signal, like `/time` does now | Leave it | Opening the workout in a basement gym shows an error page |
| Q22 | Units | kg and lb per program as today; rounding step from the maxes panel, defaulting to your plate settings (with the Phase 2 bug fixed) | — | — |

---

# THE PROGRAM FORMAT (design, binding on Phases 1–8)

One format for every lifting program, built-in or user-made. It is data, validated on read and write, with a
version number.

```ts
interface ProgramSpec {
  specVersion: 2
  name: string; blurb?: string; credit?: string
  unit: "kg" | "lb"
  calendar: {
    days: "weekdays" | "in-order"          // Mon…Sun pinned, or A/B/C rotation
    weekCounting: "calendar" | "completed" // Q8
    lengthWeeks: number | null             // null = open-ended
    atEnd: "finish" | "repeat"             // Q9
    phases?: { label: string; weeks: WeekSet }[]   // "Base", "Peak"; labels only
    deloadWeeks?: WeekSet; testWeeks?: WeekSet
  }
  maxes?: { lift: LiftRef; kind: "1rm" | "tm" | "rm"; reps?: number;    // 5RM, 2RM
            tmPct?: number; derivedFrom?: { lift: LiftRef; pct: number } }[]
  rounding?: { stepKg?: number; stepLb?: number }   // else the account's plates
  days: DaySpec[]
}
interface DaySpec { id: string; label: string; weekday?: 1|2|3|4|5|6|7; slots: SlotSpec[] }
interface SlotSpec {
  id: string                      // stable: keys state, logs and "last time"
  lift: LiftRef                   // library id, or { custom name, loadStyle }
  choices?: LiftRef[]             // "back OR front squat", "[delt work]": picked on the day
  group?: string                  // same tag = superset; 3+ = giant set / circuit
  note?: string; restSec?: number; perSide?: boolean
  sets: SetGroup[]                // in order, e.g. [top, backoff]
  weeks?: WeekOverride[]          // "week 12: top = 1x1-5 @9"
  progression: ProgressionRule
  stateKey?: string               // share one working weight across slots when wanted
}
interface SetGroup {
  id: string
  kind: "warmup" | "top" | "working" | "backoff" | "amrap" | "drop" | "restpause"
  count: number | Range
  reps: number | Range | { atLeast: number } | { seconds: number | Range } | { total: number }  // "N+", holds, rep totals
  options?: { count: number; reps: number }[]  // "3x10 up to 10x3"
  load: LoadSpec
  effort?: { rpe?: number | Range; rir?: number | Range; lastSetOnly?: boolean; cap?: boolean }
  perSet?: { reps?: number | Range; pct?: number }[]   // pyramids, ramps, waves
  restSec?: number; note?: string
}
type LoadSpec =
  | { from: "working" }                                   // the lift's working weight
  | { from: "max"; max: "1rm" | "tm" | "rm"; pct: number | Range }
  | { from: "set"; group: string; slot?: string; pct: number | Range }  // earlier set today
  | { from: "effort" }                                    // pick by feel; app suggests from e1RM
  | { from: "bodyweight"; plusKg?: number }
  | { from: "choose" }
type ProgressionRule =
  | { kind: "hold" }
  | { kind: "add-on-success"; inc; failsBeforeDrop; dropPct; afterStallInc? }        // linear
  | { kind: "double"; inc; dropAfterFails?; dropPct? }                               // rep range
  | { kind: "amrap-table"; group: string; table: { minReps: number; inc }[]; target: "working" | "max" }
  | { kind: "per-extra-rep"; group: string; perRep; capReps? }                      // Juggernaut, Bullmastiff
  | { kind: "stages"; stages: SetGroup[][]; onFailLast: { retest?: boolean; resetPct?: number } } // GZCLP
  | { kind: "cycle-bump"; inc; onlyIfAllDone?: boolean }                             // 5/3/1
  | { kind: "by-effort" }                                                            // RPE decides; e1RM kept
  | { kind: "add-set-per-week"; maxSets: number }
  | { kind: "ladder"; lifts: LiftRef[]; advanceAt: { reps?: number; seconds?: number } }
```

**Starscream in this format**, Monday's bench as the example: slot `bench` with
`sets = [ {id:"top", kind:"top", count:1, reps:{2,5}, load:{from:"effort"}, effort:{rpe:8.5}},
{id:"back", kind:"backoff", count:{3,5}, reps:{5,10}, load:{from:"set", group:"top", pct:{0.70,0.80}}} ]`,
`weeks = [{ weeks:"12", set:"top", reps:{1,5}, effort:{rpe:9} }]`, `group:"A"` with the chin-up/row slot,
`progression: by-effort`. Squat's slot has `choices: [back squat, front squat]` and backoff `pct {0.70,0.90}`,
`options` 3×10 … 10×3. Friday's bench is `count {4,6} × reps {5,6}` with `effort {rpe 9, lastSetOnly, cap}`.
Leg press is `load: choose` with the note "pyramid: add weight each set". `[Delt work]` is a slot whose lift is
chosen from `choices`. Calendar: weekdays, calendar weeks, 12 weeks, finish.

**Coverage test.** Every free program in the research corpus is encoded as a test fixture
(`tests/fixtures/programs/`). Each fixture asserts week 1 and one later week against the source's own
numbers. The format is done when all of them pass. Paid programs are fixtures only where their rules are
public; none ships.

---

# PHASES

Each phase ends green (`npm test`, `node scripts/typecheck-ratchet.mjs`, `npm run lint:ratchet`), committed
with `git commit --only`, and pushed to `training-rebuild`. Evidence goes under the phase's heading as it is
done.

## Phase 0 — Ground truth and a safety net
**Depends on:** nothing.
1. Re-read every claim in Part 1 against the code; correct this plan where it is wrong.
2. Golden snapshots: for each of the 13 built-ins, run today's engine through 30 sessions with scripted
   outcomes (all hit, one miss, three misses, AMRAP high and low) and save every prescription and state
   change as JSON under `tests/fixtures/programs/golden-v1/`. These are the equivalence target for Phase 2.
3. Record the live schema of the gym tables (`supabase db query --linked`, read only) into the plan.
4. Fix the text box's silent misreads now (they mislead users today): anything the parser cannot read
   becomes an error on that line. Tests for each misread found on 2026-10-18.
**Acceptance:** golden files committed; text-box tests green; Part 1 corrected where needed.

### Phase 0 evidence (2026-10-22, session daygame-coach-fc)

**0.1 Part 1 checked against the code and the live database.** Confirmed: 13 built-ins
(`ALL_PROGRAMS`, `src/programs/data/catalog.ts`); the engine's rule list; RPE is whole numbers only
(`workout_sets.rpe` and `workout_logs.rpe` are `smallint` with `CHECK 1–10`; every request schema in
`src/programs/schemas.ts` is `z.number().int()`); both text-box misreads (reproduced before the fix); the
plate bug (`toDomain` builds `plates` from the enrollment's own bar override only,
`src/db/programRepo.ts:93`; the account's bar and plate reach only the plate-maths hint,
`src/db/workoutRepo.ts:1556`, never `computePrescription`); live counts (13 enrollments, 1 active, 0 with
a custom schedule, 2 drafts named "12" and "2", 146 workouts; the owner has 2 workouts, 4 Sep 20 sets and
6 Sep 18 sets, both "45 min, effort 3", on Upper/Lower; owner settings kg, bar 20, plate 1.25,
Europe/Copenhagen; 0 sets and 0 workouts carry an RPE, so widening the column moves no data); the security
gap (`authenticated` holds UPDATE on all 15 columns of `program_enrollments`; the update policy is
`auth.uid() = user_id`). Corrected in Part 1: the engine's calisthenics and hold rules, what the editor
can do, the migration count, and one new security finding (the six program write functions take the
calculated numbers as arguments; see "Security").

**Blast radius for Phase 4** — every reader of the old engine or the old program shape:
- Engine calls: `src/db/programRepo.ts` (computePrescription ×6, applyLog ×2, replayEnrollment ×2,
  seedEnrollment, repairUneventfulEdit), `src/db/workoutRepo.ts` (computePrescription ×5, applyLog),
  `src/programs/components/ProgramsApp.tsx` (computePrescription), and `programsService.ts` itself.
- Old program shape (`ProgramSchedule`, `LoadExercise`, `DayTemplate`, `customSchedule`):
  `app/(app)/training/live/page.tsx`, `app/api/programs/drafts/route.ts`, `…/drafts/[id]/route.ts`,
  `…/enrollments/[id]/schedule/route.ts`, `src/db/{programDraftRepo,programRepo,trainingDoorRepo,workoutRepo}.ts`,
  `src/programs/{builder,customize,programText,programWeekService,programsService,schemas,types}.ts`,
  `src/programs/hooks/useEnrollment.ts`, the eight program data files and `customProgram.ts`, and the
  components `BuildYourWeek, DayAssignment, EditActiveProgram, LogPastWorkoutDialog, ProgramDetail,
  ProgramEditor, ProgramSheet, ProgramsApp, ProgressionView, TrainingScreen`.
- Prescription shape (`SessionPrescription`, `PrescribedExercise`, `PrescribedSet`):
  `app/(app)/training/live/page.tsx`, `src/db/programRepo.ts`, `SessionNotices`, `TodayCard`,
  `live/LiftMenu`, `live/LiveWorkoutScreen`.
- Outside the gym slice, importing from it: `src/goals/components/{HealthTrackingPanel,
  new-goals/GoalsConfigStep, new-goals/NewGoalsFlow, north-star/BuildBoard, north-star/NorthStarFlow,
  north-star/WorkoutPrograms}.tsx`, `src/health/{healthService,schemas}.ts`, `src/db/healthRepo.ts`,
  `src/settings/components/{SettingsPage,TrainingSettingsCard}.tsx`,
  `src/tracking/components/ProgressDashboard.tsx`, `app/api/health/workout/route.ts`,
  `app/test/programs/page.tsx`.

**0.2 Golden snapshots.** `tests/fixtures/programs/golden-v1/` — 13 files, 2.1 MB, written once by
`GOLDEN_WRITE=1 npx vitest run tests/unit/programs/golden` and never rewritten. The runner
(`tests/unit/programs/golden/goldenRun.ts`) takes the engine as a parameter (`GoldenEngine`); today's
engine sits behind it in `legacyEngine.ts`, so Phase 2 plugs the new one in beside it. Eight scripted
lifters, 30 sessions each: the plan's five (every rep, one miss, three misses in a row, all-out sets high
and low) plus a session taken 10% lighter, a lift skipped, and every rep in pounds. Running plans have
nothing to vary and run "every rep" only. Each session keeps the prescription (day, cycle, week, every
set's reps, range top, all-out flag, weight in the unit and in kg, notes, superset, rest, per side), every
change with its sentence, and the state it changed; each run keeps its seed and final state and a replay
of its whole history, which `golden.test.ts` checks rebuilds the same state (27 tests). A lifter whose
run is identical to "every rep" is stored as `sameAs`. Spot checks: StrongLifts "three misses" deloads the
squat 25 → 22.5 on its third miss; 5/3/1 "all-out low" cuts every training max at each cycle's end.

**0.3 Live schema of the gym tables** (read only, `npx supabase db query --linked`, 2026-10-22):
- `program_enrollments`: id uuid pk, user_id uuid → auth.users cascade, program_id text, level text
  (beginner|intermediate|advanced), unit_system text (kg|lb), exercise_state jsonb `{}`, cursor jsonb,
  is_active bool `true`, started_at timestamptz `now()`, created_at timestamptz `now()`, custom_schedule
  jsonb null, initial_exercise_state jsonb null, replay_events jsonb `[]`, bar_weight_kg numeric(5,2) null
  (0–50), label text null (1–60). Unique `(user_id, program_id) where is_active`. Trigger
  `program_busy_while_workout_open` (before update → `refuse_to_pause_a_busy_program`). Policies: own row
  for select, insert (check), update (using only), delete.
- `workout_logs`: id, user_id, session_type (weights|cardio|mobility|yoga|running), duration_min int
  (1–599), intensity smallint (1–5), logged_at, created_at, distance_km numeric(6,2) (0–1000), started_at,
  ended_at, enrollment_id → program_enrollments set null, program_day_id text, program_cycle int (1–1000),
  program_week int (1–52), adjustments jsonb `{}`, **rpe smallint (1–10)**, notes text (≤1000), client_key
  text, progression_changes jsonb, personal_records jsonb. Checks `workout_logs_lifecycle`,
  `logged_is_start`, `ended_after_start`, `program_context`. One live workout per user; unique
  `(user_id, client_key)`. Trigger `workout_logs_enrollment_is_own_trg`. Policies: own row, all four.
- `workout_sets`: id, log_id → workout_logs cascade, exercise text, weight_kg numeric(5,2) (0–999.99),
  reps int (0–1000), set_number int (>0), notes, exercise_notes (≤500 each), exercise_id text, library_id
  text, set_kind text `working` (warmup|working|amrap|backoff|drop), prescribed_index smallint,
  completed_at timestamptz, **rpe smallint (1–10)**, side text (left|right). Unique slot `(log_id,
  coalesce(exercise_id, exercise), set_kind, set_number, coalesce(side,''))`. Policies through the
  owning log, all four.
- `program_drafts`: id, user_id → auth.users cascade, name text (1–60, unique per user), discipline,
  unit_system, schedule jsonb (object with a `days` array and `kind`), working_weights jsonb object,
  source (built|catalog|saved_workout), source_program_id text (1–80), created_at, updated_at (trigger).
- `profiles` (training columns): weight_unit text `kg`, bar_weight_kg numeric(5,2) `20`,
  smallest_plate_kg numeric(5,2) `1.25`, timezone text `UTC`, timezone_source.
- Grants: `anon` and `authenticated` hold select/insert/update/delete on all four tables (row security
  decides). Functions, all SECURITY INVOKER and executable by `authenticated`: `start_enrollment(p_row,
  p_displace)`, `end_enrollment(p_id)`, `resume_enrollment(p_id, p_displace)`,
  `log_session_and_advance(p_workout, p_sets, p_exercise_state, p_cursor, p_expected_session_count)`,
  `finish_program_workout(p_workout_id, p_ended_at, p_duration_min, p_intensity, p_rpe smallint, p_notes,
  p_exercise_state, p_cursor, p_replay_events, p_expected_session_count, p_changes, p_records,
  p_started_at, p_session_type, p_distance_km)`, `replace_sets_and_replay(p_log_id, p_sets,
  p_enrollment_id, p_exercise_state, p_cursor, p_replay_events, p_expected_session_count)`,
  `remove_session_and_replay(p_log_id, p_enrollment_id, p_exercise_state, p_cursor, p_replay_events,
  p_expected_session_count)`; triggers `refuse_to_pause_a_busy_program`, `workout_logs_enrollment_is_own`.
  The app also writes `program_enrollments` directly in four places (`src/db/programRepo.ts`: reset, the
  schedule edit, the unit change, `persistState`), which Migration B has to route through functions.
- `supabase migration list --linked`: 62 local, 62 remote, none pending.

**0.4 The text box.** `src/programs/programText.ts`: `*` now reads as ×; a set range ("3-5x5-10") is
refused with "a range of sets (3-5) cannot be written here yet — pick one number, like 5x5-10"; any digit,
`@` or `%` left in a name after parsing (no library lift has one) is refused with "… could not be read".
Tests: `tests/unit/programs/programText.test.ts` › "nothing the parser cannot read is saved as a lift"
(both measured misreads, four stray-notation lines, and hyphenated names that must still read).

## Phase 1 — The program format
**Depends on:** 0.
1. `src/programs/spec/` holds the types above, a zod schema (strict: unknown keys are errors, not dropped),
   size limits (≤ 14 days, ≤ 30 slots a day, ≤ 52 weeks, ≤ 64 KB of JSON) and plain-word error messages
   ("Week 12 changes a set group 'top' that bench does not have").
2. `specVersion` on every stored spec; a reader that refuses unknown versions loudly.
3. A converter from today's format to the new one, so old rows and the 13 built-ins load unchanged.
4. Coverage fixtures: Starscream and every free corpus program, each validating.
**Acceptance:** all 13 built-ins and all fixtures convert and validate; schema tests cover every field.

### Phase 1 evidence (2026-10-22, session daygame-coach-fc)

**Doubt first.** (1) "All 13 built-ins convert": 7 do — the lifting ones (StrongLifts, 5/3/1, Starting
Strength, PPL, Upper/Lower, PHUL, Bodyweight Foundations). The other 6 (Couch to 5K, 5K to 10K, the three
triathlons, Splits) are running and mobility programs, which Q3 keeps on their own engine; the converter
answers `{ kept }` for them rather than a half-made program, and their golden files keep checking them on
the old engine. (2) Part 1 says the research found the format "covers 29 programs exactly and 3 closely".
Encoding them for real says otherwise: of 30 fixtures, **2 are exact** (Starscream, Sheiko #29) and **28
are close** — every number the sources give for week 1 and a later week comes out right (Phase 2), but
most programs also have a rule the format can only carry as a note (a rep total as a range, a stage that
fails on total reps, a training-max bump that waits for next week, a ladder rung with its own target…).
The full list of additions the fixture authors asked for is below, for Phases 6–8 to weigh.

**1.1–1.2 The format.** `src/programs/spec/`: `types.ts` (the plan's sketch, plus what the 13 built-ins
and the corpus needed: a named `LiftRef`, `Increment {kg, lb}`, `Range {min, max}`, week sets as text
"1-11,12", `perSet` with any rep target, `of`/`plus` on loads, a `dropSets` modifier, `roundMax`,
`direction`, rounding `mode`), `schema.ts` (zod, strict — an unknown key is an error; bounds on every
number; cross-references checked after the shape; every problem as a sentence that names the day and the
lift, e.g. `Week 12 changes a set group "heavy" that lib_bench_press does not have.`; limits 14 days,
30 lifts a day, 52 weeks, 64 KB, plus 10 set groups, 30 sets a group, 60 week changes; a draft mode that
allows an empty day, as the old drafts did), `weeks.ts`, `read.ts` (`readSpec` refuses a missing or
unknown `specVersion` with `SpecVersionError` — "saved in format 3 by a newer version of the app" — and a
broken one with `SpecInvalidError` listing every problem).

**1.3 The converter.** `fromLegacy.ts`: ids stay ids; the same lift on a second day becomes its own slot
sharing the first one's numbers (`stateKey`); "4×5, 1×5+" is two set groups numbered 1–5 straight
through; a 5/3/1 wave is one set group listed set by set with weeks 2–4 as week changes and a training
max at 90%; a calisthenics ladder is a `ladder`. Old rows: 0 enrollments on production have an edited
schedule; both saved weeks on production convert (week "2" as a draft — it has an empty day).

**1.4 Fixtures.** `tests/fixtures/programs/corpus/` — 30 programs, each a valid program
(`tests/unit/programs/spec/fixtures.test.ts`), each with week 1 and a later week from its source and the
place in the source each number comes from. Written by six research agents from the authors' own pages,
sheets and PDFs (reddit.com was unreachable; archived copies were used), Starscream by hand from the
owner's sheet. 23 free, 7 "paid, rules public" (Starting Strength, Greyskull, 5/3/1 BBB, Building the
Monolith, Juggernaut 2.0, Bullmastiff, RP-style), and none of those seven ships (Part 2 rule 8). Of the
research corpus's 32, three are not encoded: Calgary Barbell, Nippard and SBS RTF are paid and their
rules are not public enough to check.

| Fixture | Terms | Coverage |
|---|---|---|
| starscream, sheiko-29-32 | free | exact |
| corpus-stronglifts-5x5, gzclp, gzcl-rippler, jacked-and-tan-2, nsuns-5day, wendler-531-beginners, texas-method, madcow-5x5, metallicadpa-ppl, phul-source, phat, lyle-gbr, phrak-gslp, ivysaur-4-4-8, candito-6-week, smolov-jr, bwf-recommended-routine, barbell-medicine-bridge, rts-generalized-intermediate, poliquin-wave-loading, dc-training | free | close |
| corpus-starting-strength, greyskull-lp, wendler-531-bbb, wendler-building-the-monolith, juggernaut-2, bullmastiff, rp-style-hypertrophy | paid, rules public | close |

**Tests.** `tests/unit/programs/spec/schema.test.ts` — one program using every field passes; 40 shape
rules and 23 reference rules each broken on their own and refused with the right sentence; week sets;
drafts. `fromLegacy.test.ts` — the 7/6 split, every mapping above, edited weeks (supersets, drops,
weekdays, timed lifts, assistance, the one-unit stall jump), refusals by name, and the version reader.

**Format additions the fixture authors asked for** (not built; each would turn "close" into "exact"):
ranges in rep totals and increments; `stages.judge: "total-reps"`; a max bump that applies next week, or
after named weeks, or from a test week's best single; `amrap-table` reading total reps across sets; a
per-cycle override (5/3/1 BBB's 50→60→70%); a per-wave reset and a per-wave standard for
`per-extra-rep`; ladder rungs with their own target, step and starting rung; `SetGroup.until` (sets until
an RPE or a fatigue %); "only if the previous group was made"; optional lifts and "pick 2 of these";
days trained only in some weeks; a percentage-growth increment (Madcow); "carry this set's weight
forward" (Madcow's triple); bigger jumps for the first sessions (Starting Strength); a drop-on-miss for a
max; `rounding.mode: "up"`; an effort condition on double progression.

## Phase 2 — The engine, rebuilt on the format (pure functions only)
**Depends on:** 1.
1. Calendar: weekdays or in order; week number by calendar or by completed workouts; length; finish or
   repeat; phases, deload and test weeks.
2. Prescription: set groups, ranges, options, per-set pyramids, week overrides, every load source, effort
   targets and caps, derived maxes, rounding from the account's plates (**the plate bug fixed here**).
3. Same-day sets: `deriveFromEarlierSets(prescription, setsDone)` fills ranges from the sets already
   ticked, so the phone and the server compute the same numbers.
4. Progression: every rule in the format, and e1RM from reps × RPE (Q11).
5. Replay over the new engine; **golden equivalence**: every Phase 0 snapshot reproduces exactly, except
   differences caused by the plate fix, each listed and explained in the evidence.
6. Simulation: `simulate(spec, weeks, outcomes)` for the builder's preview and for the fixtures.
**Acceptance:** golden equivalence green; every fixture's week-1 and later-week numbers match its source.

### Phase 2 evidence (2026-10-22, session daygame-coach-fc)

**Doubt first.** The plate fix is only half here. The engine now takes the gym's bar and plates (and a
program's own rounding step) through one `RoundingContext`, so it CAN round to the account's plates; the
repo still hands it the old `plates` (the enrollment's bar only). Handing it the account's plates means
touching every place a prescription is made, and Phase 4 rewrites each of those places anyway — so the
wiring is done there, with its own test, instead of twice.

**The engine.** `src/programs/engine/` — pure functions, no clock, no database:
`calendar.ts` (in order or by weekday, rest days naming the next session; weeks by workouts completed or
by the calendar from the start Monday; finish or repeat; phases, deload and test weeks), `prescribe.ts`
(set groups, ranges of sets, options, per-set pyramids, week changes, every load source, effort targets on
the right sets, caps, derived maxes through `of`, rounding), `sameDay.ts` (`deriveFromEarlierSets`: the
heaviest top set done today fills the back-off range, the one function phone and server both run),
`progress.ts` (every rule; the four old ones and the ladder ported line for line, sentences included),
`e1rm.ts` (RTS chart when an RPE was logged, Epley otherwise — Q11), `seed.ts`, `replay.ts`,
`simulate.ts`, `describe.ts`.

**2.5 Golden equivalence: green, with no differences to list.** `tests/unit/programs/golden/goldenSpec.test.ts`
runs the 7 lifting built-ins, converted, through the new engine under all 8 scripted lifters for 30
sessions each, and every prescription, every change with its sentence, every state and every replay
equals `golden-v1` exactly. A mutated program (StrongLifts' bench deloading after 2 misses instead of 3)
was checked to fail the comparison, so the test is not passing by comparing nothing. The other 6
built-ins stay on the old engine and still match their golden files (`golden.test.ts`).

**Fixtures through the engine.** `tests/unit/programs/engine/fixtures.test.ts` simulates each fixture
from its starting numbers and compares each expected line with what the engine prescribes. All 30
fixtures, all 222 expected lines, match their sources. Starscream: week 1 Monday
`1x2-5@? rpe8.5, 3-5x5-10@70-80` for a 100 kg top set, week 12 Monday `1x1-5@? rpe9, …`, Tuesday's speed
deadlifts `4-10x3@77.5-87.5` from the sheet's own 110 kg (`mround(110×0.7…0.8, 2.5)`).

**Engine bugs the fixture authors found, all fixed, each now covered by a fixture or a test:** a
once-a-cycle bump fired after every session of the lift in the last week (5/3/1 for Beginners trains squat
twice a week); it also looked for the lift's last day without skipping days on which the lift had no sets
that week (Ivysaur); a percentage-per-extra-rep rule took the percentage of the working weight instead of
the max (Bullmastiff); a repeating program's calendar weeks did not wrap in `simulate`; a rule judged a
week in which its set group was skipped (Lyle's run-up weeks); and the old 5/3/1 rounded its training
max at every bump, which Wendler does not — kept for the converted built-in only (`roundMax`).

**Tests.** `tests/unit/programs/engine/engine.test.ts` (29): calendar weeks and weekday rest days,
Starscream finishing after week 12, ranges of sets, effort on the last set only, week changes and skips,
pyramids, `of` and `plus`, bodyweight and timed holds, rounding (sheet-style, plate-style, a 15 kg bar),
back-offs before and after the top set, across lifts, the new rules (AMRAP table, per extra rep, stages
with both resets and a retest, by effort with the RTS chart, a set per week, all-sets-done bumps, skipped
groups), seeding refusals, replay across a change of program, and a 12-week Starscream simulation.

**Gates (2026-10-22):** `npm test` 376 files, 5298 passed, 1 skipped; engine + golden 423 passed;
`typecheck-ratchet` 88, none new; `lint:ratchet` 290, none new.

## Phase 3 — Database (live)
**Depends on:** 1. Can run beside Phase 2.
1. Migration A (additive): `workout_sets.rpe` and `workout_logs.rpe` to `numeric(3,1)` checked 1–10 in
   half steps; the same in `finish_program_workout`'s parameter; `workout_sets.slot_id`, `set_group_id`;
   `program_enrollments.spec jsonb`, `spec_version int`, `started_on date`, `maxes jsonb`;
   `program_versions` (enrollment_id, version, spec, created_at) for Q14; `user_programs` (id, user_id,
   name, spec, spec_version, source_program_id, timestamps) with a size `CHECK`, own-row policies, and the
   existing two saved weeks copied into it (the old `program_drafts` rows stay until Phase 10).
2. Migration B: calculated columns (`exercise_state`, `cursor`, `replay_events`, `initial_exercise_state`,
   `user_id`) can change only inside the program functions (Q17), by a trigger the functions switch off for
   their own statement.
3. Each migration has a written way back in `supabase/migrations/rollback/`.
4. `supabase migration list --linked` → nothing pending but these → `supabase db push` → read the live
   columns back and record them.
**Acceptance:** integration tests green on the test stack built from the new baseline; the live columns
match; a direct update of `exercise_state` by an ordinary user is refused (tested on the test stack).

### Phase 3 evidence (2026-10-22, session daygame-coach-fc)

**Doubt first.** (1) The lock shuts the direct route only; the program functions still take the numbers
the app worked out as arguments, so a signed-in user who calls them by hand can still put made-up numbers
into their OWN program (see "Security"; for Phase 10's review). (2) The lock went live minutes before the
code that uses `save_program_state` reached the site: `supabase db push` at about 06:50 UTC, `main`
fast-forwarded to `9d1f2591` right after (its CI `checks` green first, no run in flight), and the live
site deployed it at 06:55 UTC (Vercel production deployment 7245824937). For those minutes a reset,
skip, program edit or unit change on the live site would have been refused; nobody was on a program
(the owner's Upper/Lower was stopped on 2026-10-18, the one active program is a test account's).
(3) `program_drafts` is not dropped (Phase 10); `user_programs` holds copies.

**3.1 Migration A** — `supabase/migrations/20261022100000_program_format_columns.sql`, additive:
`workout_sets.rpe` and `workout_logs.rpe` NUMERIC(3,1), 1–10 in half steps (0 rows held an RPE, so only
the type changed); `workout_sets.slot_id`, `set_group_id`, and set kinds `top`, `restpause`;
`program_enrollments.spec`, `spec_version`, `started_on`, `maxes` with shape and 64 KB checks;
`program_versions` (append-only: read and insert own rows, no update or delete policy, cascades with its
enrollment); `user_programs` (own-row CRUD, unique name per person, 64 KB check, `starting_weights`,
`updated_at` trigger) with the two saved weeks copied in as converted specs, keyed by draft id so any
other database inserts nothing.

**3.2 Migration B** — `20261022110000_program_numbers_only_by_the_app.sql`: trigger
`program_numbers_only_by_the_app` refuses (SQLSTATE 42501) a client INSERT, or an UPDATE of
`exercise_state`, `cursor`, `replay_events`, `initial_exercise_state` or `user_id`, unless a program
function set `app.program_engine` for its own transaction; the owner role (scripts, migrations, the test
harness) is not guarded. Every program function sets it; `finish_program_workout` takes `p_rpe NUMERIC`;
the set-writing functions keep `slot_id`/`set_group_id`; `start_enrollment` writes the new columns and
version 1 of a spec; new `save_program_state(p_id, p_fields, p_expect)` replaces the four direct writes
the app made (reset, schedule edit, unit change, skip — `src/db/programRepo.ts`), records the next
version when the spec changes, answers null when `p_expect.unit_system` no longer holds (the double-tap
guard) and refuses a stale `sessionCount` (55000).

**3.3 The way back** — `supabase/migrations/rollback/*.down.sql` (B first, then A; run by hand; A's
refuses to turn a stored 8.5 into a 9 and says what to back up before it drops anything).

**3.4 Live.** `supabase migration list --linked`: 64 local, pending exactly `20261022100000` and
`20261022110000`, nothing remote-only → `supabase db push`. Read back: `workout_sets.rpe`,
`workout_logs.rpe` numeric(3,1) with the half-step checks; `workout_sets.slot_id`, `set_group_id` text and
the seven kinds; `program_enrollments.spec` jsonb, `spec_version` integer, `started_on` date, `maxes` jsonb;
`program_versions` (7 columns, 2 policies), `user_programs` (9 columns, 4 policies, trigger), trigger
`program_numbers_only_by_the_app`, `save_program_state(p_id uuid, p_fields jsonb, p_expect jsonb)`,
`finish_program_workout(…, p_rpe numeric, …)`; `user_programs` holds "12" (1 lift, incline 12 kg) and "2"
(empty day). **Lock on live**, as the most recent program's owner with role `authenticated`, inside
`begin … rollback`: `LOCK HOLDS (42501): A program's numbers are worked out by the app and cannot be
written directly.`

**Tests.** `tests/integration/db/programFormat.integration.test.ts` (14, real Postgres): direct writes of
each guarded column refused, a hand-made insert refused, label and ending still allowed; skip, reset and a
double-tapped unit change through the app's own repo functions land under the lock; stale session count
refused; somebody else's program unreachable; version 1 at start and version 2 on a new spec; versions
append-only and private; 64 KB refused by the database; user programs private and uniquely named; RPE 8.5
kept, 8.3 and 11 refused by name; slot and group kept; a top set kind; a half-step session RPE through
`finish_program_workout`. Unit fakes play `save_program_state` against their tables
(`tests/helpers/fakeSupabase.ts`). Baseline refreshed from production (`scripts/db/baseline.sh`, stamp
20261022110000, `--check` matches). **Integration suite on the new baseline: 35 files, 191 passed.**
CI `checks` on `9d1f2591`: success.

## Phase 4 — Switch the app onto the new engine
**Depends on:** 2, 3.
1. Every reader of the old types goes through the new format (the blast-radius list in the Phase 0
   evidence); the old engine is deleted once nothing calls it.
2. Logging keeps each set's kind, slot, set group and half-step RPE end to end (sets, finish, replay,
   History, Progress); "last time" per slot, records per lift (Q13).
3. Starting a program stores its spec copy and version; editing a running program writes a new version.
**Acceptance:** all unit, integration and browser tests green; a started built-in program behaves exactly
as before (golden).

### Phase 4 evidence (2026-10-22, session daygame-coach-fc)

**Doubt first.** (1) "Every reader of the old types goes through the new format" is true of the ENGINE:
every prescription, progression, seed, advance and replay now runs through `src/programs/runtime.ts`.
The old program SHAPE is still read for display and by the old editors (day names, weekdays, the
editor's lifts) — on purpose: Phase 6 replaces the editors and Phase 8 rewrites the catalogue natively.
A program stored only in the new format is described in that shape by `definitionFromSpec` (lossy,
display only), and the old editor refuses to save one (it would flatten its rules). (2) The old engine's
own tests — about 300 — now run against the new engine by changing only their import; three asserted the
old refusal sentences and were updated to the new ones (they name the lift: "Bench Press needs a starting
weight."); none asserted a different number.

**4.1 The switch.** `src/programs/runtime.ts` decides once which engine runs a program: the stored spec
when an enrollment has one, else the lifting catalogue program (with the person's own week in place)
converted on read, else — running plans and the splits — the old engine. It exports the old engine's
names (`computePrescription`, `applyLog`, `seedEnrollment`, `replayEnrollment`, `advanceCursor`) so
`programRepo`, `workoutRepo`, `ProgramsApp` and every test switched by import path. The lifting half of
the old engine — linear, double progression, the 5/3/1 wave, the ladder, their seeding and cursor walk,
about 700 lines of `programsService.ts` — is deleted; what remains there runs running plans and hold
routines only (`isRunOrHold`, `prescribeRunOrHold`, `applyRunOrHoldLog`, `advanceRunOrHold`,
`seedRunOrHold`, `replayRunOrHold`). Weekday and calendar programs pick their day and week from the
account's clock inside the engine. **The plate bug is fixed here:** `gymPlates` (the enrollment's bar,
else the account's, and the account's smallest plate) now feeds every prescription, progression, seed,
replay and unit change, and the live screen's plate maths uses the same object; before, only the plate
maths saw the account's settings. The owner's account is on the defaults (20 / 1.25), so nothing of his
changes.

**4.2 Logging.** A set carries its kind (now also `top`, `restpause`), its slot and set group and a
half-step RPE from the tick (`CompleteSetSchema`, `RpeSchema`, `SetKindSchema`) through the live
workout, the offline queue, the stored row, a correction (`ReviseWorkoutSchema`, `WorkoutCorrection`,
`replace_sets_and_replay`), the finish (`p_rpe` NUMERIC) and every replay (`entriesFromSets` keeps RPE and
set group; top and rest-pause sets count as work). "Last time" is per slot (Q13): `pickLastSets` takes
the slot's own sets and older sets with no slot, never another slot's — Monday's heavy bench and
Friday's volume bench are two histories of one lift; personal records stay per lift (by name). A row
the program calls a top set or a back-off is written under that kind and has a PREVIOUS value.

**4.3 Copies and versions.** `enrollInProgram` stores a lifting program's spec (the converted catalogue
program, or a spec handed in — checked in full by `checkSpec`), `spec_version` 2, `started_on` (today on
the account's calendar, or a chosen first day — Q16) and the maxes; `start_enrollment` records version
1. `updateEnrollmentSchedule` on a program with its own copy writes the edited week as the next version
through `save_program_state`. Replays read `program_versions` and start from version 1. A workout may be
dated back to the program's chosen first day.

**Golden.** `golden.test.ts` now runs all 13 built-ins through the app's own entry points (the runtime)
against golden-v1: equal. `goldenSpec.test.ts` adds the started case: each lifting built-in with its
stored copy in place, run through the runtime, equals golden-v1.

**Tests.** `tests/integration/routes/programFormatRoutes.integration.test.ts` (7, real Postgres, real
handlers): a started built-in keeps its copy as version 1; an edit records version 2; the account's
2.5 kg plates turn a 22.5 kg squat into 25 (it used to be prescribed as 22.5); Starscream starts as
written under its own name, prescribes Monday week 1 (top set picked by feel at RPE 8.5, three back-offs
worked out from it) and Monday week 12 (1–5 @ RPE 9) by the calendar; a top set at RPE 8.5 is stored
with kind `top`, slot and set group, and moves the bench's estimated max to 117.6 (RTS: 4 @ 8.5 =
85.0%); the old editor refuses it; a broken program is refused with the format's sentence.

**Gates (2026-10-22):** `npm test` 376 files, 5305 passed, 1 skipped; integration 36 files, 198 passed
(test stack on the production baseline); browser, desktop and phone projects, all specs: 279 passed,
1 skipped, and two sign-in/e-mail specs that failed under load and passed when re-run alone
(`auth.spec.ts:26`, `password-reset.spec.ts:123` — neither touches the gym); `typecheck-ratchet` 88,
none new; `lint:ratchet` 290, none new.

## Phase 5 — The live workout screen
**Depends on:** 4.
1. Shows target RPE/RIR, "3–5 sets" with an add-set button, options ("3×10 … 10×3"), choice slots, caps on
   the last set, the week ("Week 3 of 12", phase name), deload and test weeks, the finish screen (Q9).
2. The backoff range fills in the moment the top set is ticked, offline included.
3. RPE slider in half steps.
4. `/training/live` opens with no signal (Q21), with the same care `/time` takes about whose page is stored.
**Acceptance:** browser tests for each item on a phone viewport, including offline.

### Phase 5 evidence (2026-10-22, session daygame-coach-fc)

**Doubt first.** (1) **"Retest your maxes" (Q9) is a sentence, not a door.** Entering new maxes needs
the builder's maxes panel (Phase 6); the finish screen offers Run it again and Pick another program, and
says what running again starts from ("week 1, from the numbers this run finished on"). For a program
that reads its maxes from effort (Starscream's top sets) the numbers follow the lifter anyway; for one
on fixed maxes they stay where they were until Phase 6. (2) **Opening offline is proven on Chromium, not
on an iPhone.** Playwright's WebKit fails every navigation made while offline is emulated, service
worker or not — the Black Box's shipped offline test fails the same way there (checked today) — so the
two offline-open tests skip on the iPhone lane with that reason (listed in `e2eSkipsAreListed`) and run
on Chromium: the desktop lane at a phone's size and the Pixel 7 lane. A real iPhone is Phase 9's job.
Under `next dev` they skip too (no worker in development, by design); they were run for real against a
production build on the test backend, and CI runs them on the desktop lane (a production build) for
pull requests into and pushes to main. (3) **A choice of lift changes the name, not the numbers.** "Back
or Front Squat" done as Front Squat is logged as Front Squat on the slot's own weights and history; a
program that wants different numbers per choice needs two slots. (4) Once a set of a lift is ticked its
scheme option is kept for the day (the buttons lock and say so): switching would renumber the rows under
the sets already done. (5) My Phase 4 evidence edit had swallowed this phase's heading; it is restored.

**5.1 What the screen says.** `src/programs/liveFormat.ts` (pure, 7 unit tests): `effortText` ("RPE
8.5", "RPE 8–9", "RIR 2", "≤ RPE 9"), `weekLine` ("Week 3 of 12 · Base · deload week", "… · test
week"), `describeLift` ("1 × 2–5 by feel, RPE 8.5 · 3–5 × 5–10 at 70–80% of the top set"; a lift with
plain groups — every converted built-in — is described by the old `describeSets`, word for word),
`withOption` and `addSetLimit`. On the live screen: the week line under the header; each set row's hint
("by feel · RPE 8.5", "after the top set", "70–80 kg", the cap "≤ RPE 9" on the last set only); a row of
buttons for a slot's choices and one for a set group's options, each pick kept on the workout
(`adjustments.chosen`, `adjustments.options`), so a reload comes back with it; "+ Add a set (up to 5)"
until the range is full, then "All 5 sets are on the list." Built-ins show none of these (no ranges, no
options, no choices, no targets) and add sets without limit, as before. Today's card and the program
preview use `describeLift` and the program's own weekdays. **The finish screen** (Q9): Run it again,
Pick another program (to the program list), and the line in doubt (1). Two bugs found on the way: Run
it again on a calendar program rewound the counter but not the calendar, so a finished twelve-week
program stayed finished (`resetEnrollment` now restarts its first day today); and the card stayed on
"finished" with no Start button until a reload (`router.refresh()` after the restart).

**5.2 Back-offs from the top set, on the phone.** The screen runs `deriveFromEarlierSets` (the engine's
same-day function, the one the server runs at finish) over the sets on screen, so ticking a 105 kg top
set fills the back-offs with 72.5–85 kg at once, with or without signal, rounded on the program's step
and the account's plates.

**5.3 RPE in half steps.** The set menu's slider moves by 0.5; 8.5 is stored as 8.5 (Phase 3's column).

**5.4 Opening with no signal (Q21).** `/training/live` joins the worker's short list of stored pages
(`public/sw.js`, with `routeList.test.ts` holding the list), under the same rules as `/time`: network
first; stored with its scripts; emptied on any sign-in page; never stored when signed out. Three things
the live page needed that `/time` does not, because it holds one workout rather than a browser-side
workspace: (a) sets ticked with no signal are put back on screen from the queue (`withQueuedSets`);
(b) sets saved WITH signal after the page was stored are not lost — the phone keeps the server's last
answer (`live-workout-copy-v1`) and a stored page older than it gives way to it (`newerCopyOf`); (c) a
workout that is over is not kept: finishing or throwing it away clears the kept answer and the stored
page on that phone, and the worker deletes a stored page whenever the server answers it with a redirect
(finished elsewhere, or signed out); (d) signing out forgets them — Log Out is a server action that lands
on the front page, which the worker never sees, so both Log Out buttons first empty the worker's store
and the kept answer and rest clock (`src/shared/offlineCopies.ts`); the queue of unsent sets stays,
because deleting it would lose sets. The kept answer is stamped with the SERVER's clock (the reply's
`Date` header, end of that second) and compared with the server's time of drawing the page — not the
phone's clock, which can be minutes out; the first build of this used the phone's and a review caught
it, and the production-build test caught the second-sized tie. The screen sends and counts only its own
workout's waiting sets: one left by a workout thrown away elsewhere, or by the last person signed in on
the phone, used to come back "workout gone", clear the screen and hold Finish (security review, fixed). Also fixed: with no signal the retry loop
threw an unhandled error every twenty seconds; it now waits quietly for the next pass. The live screen
marks itself `data-hydrated` once React runs it, so tests stop typing into stored HTML that React then
replaces.

**Tests.** Browser, `tests/e2e/programs-live-format.spec.ts`, a seven-day program in the format started
through the app's route, phone viewport (iPhone 14): week, phase and deload line; test week; back-offs
filled offline the moment the top set is ticked, then sent once with slot and set group; add-set up to
the range, then "All 5 sets"; options (10 × 3 replaces 3 × 10, kept over a reload); a choice logged as
Front Squat; the cap on the last set only; RPE 8.5 in half steps, stored as 8.5; the finish screen, Run
it again to week 1 today. Offline open (Chromium, phone size, production build): reopens with no signal
showing the top set saved with signal, its back-offs worked out, and the back-off ticked with no signal,
which then lands exactly once; a workout thrown away elsewhere has its stored page dropped. The options
test also checks the scheme locks once a set of the lift is done. Production
build run: `programs-live-format`, `programs-offline`, `vice-offline` on phone, desktop and Pixel 7 —
35 passed, 2 skipped (the WebKit pair). Unit: `liveFormat.test.ts` (7), `liveOffline.test.tsx` (15);
integration: a finished calendar program run again starts week 1 today.

**Review.** A code review found three risks (the phone's clock deciding which copy wins; sign-out
leaving the stored workout; a scheme switch after sets were ticked renumbering their rows) and a security
review two low ones on a shared phone (another workout's waiting sets clearing the screen; a session
ending other than by Log Out). All fixed above except the last, which is recorded under Security for
Phase 10.

**Gates (2026-10-22):** `npm test` 378 files, 5327 passed, 1 skipped; integration 36 files, 199 passed;
browser, desktop and phone projects, all specs: 295 passed, 5 skipped, and three that failed under load
and passed when re-run alone (`auth.spec.ts:26`, `session-tracking.spec.ts:87`, `settings.spec.ts:21` —
none touches the gym); after the last change, every `programs-*` spec on desktop and phone: 83 passed,
4 skipped (the offline-open pair, no worker under `next dev`); production build on the test backend,
`programs-live-format` + `programs-offline` + `vice-offline` on phone, desktop and Pixel 7: 35 passed,
2 skipped (the WebKit pair); `typecheck-ratchet` 88, none new; `lint:ratchet` 290, none new.

## Phase 6 — The builder
**Depends on:** 4. **Opens with B-DESIGN.**
1. A clickable mock-up page of every builder screen, published for the owner to mark; build waits for the
   marks.
2. Then build, replacing `ProgramEditor`, `BuildYourWeek` and `EditActiveProgram`'s editing:
   start from a catalogue program, from blank or from text; days; slots; set-pattern presets with "custom";
   progression presets; week table (repeating or changing by week, duplicate week, deload and test
   markers); maxes panel; supersets; choices; calendar settings; live preview of any week; save; start;
   edit while running.
3. Every preset shows, in a sentence, what it will do ("Adds 2.5 kg when you hit 5 reps on all 3 sets;
   drops 10% after 3 misses").
**Acceptance:** a browser test builds Starscream by hand on a 390-px phone viewport and its preview of
week 1 Monday and week 12 Monday matches the sheet; the owner's marks are met.

## Phase 7 — Text notation and CSV
**Depends on:** 6.
1. One line per slot in the notation of Q4, round-tripping with the builder (anything built can be shown as
   text, and the text rebuilds it).
2. Paste a CSV week table into a slot's week overrides.
**Acceptance:** every coverage fixture round-trips through the text form.

## Phase 8 — The catalogue
**Depends on:** 4.
1. The 13 built-ins rewritten natively in the new format (the converter stays only for old rows).
2. Starscream added (Q1); the Q2 programs added after each one's terms are checked and recorded.
3. Filters: goal, days per week, level, equipment, length. "Customize" on every program.
**Acceptance:** catalogue tests; each new program's fixture test; screenshots of the list on a phone.

## Phase 9 — Acceptance on the real thing, and your account
**Depends on:** 5, 6, 8; Q16, Q18, Q19.
1. Run the Phase 6 hand-build test against the real site after release candidates deploy to staging.
2. Your account: start Starscream as you (B-OWNER-ACCOUNT), start date per Q16, starting values from your
   sheet (Q19); copy the top sets you logged in the sheet into History; delete the two September workouts
   if Q18 is yes.
3. Screenshots of your Today, a live workout with the backoff range, and week 12, on a phone.
**Acceptance:** your Today page shows the right Starscream day for the date.

## Phase 10 — Release
**Depends on:** all.
1. `/code-review` of the whole branch range; a security review through a subagent (RLS, the new table, the
   lock, user-supplied JSON).
2. CI green; fast-forward `main` (B-MAIN); check the live site.
3. Drop `program_drafts` only after the copy is verified and no code reads it (its own migration, with the
   rows backed up first).
4. Update `docs/product/map.md`'s `programs/` entry and vision items 28 and 30.
**Acceptance:** live site shows the builder; this plan's status line says done, with evidence.

---

# PART 2 — Ground rules for the executing session

1. Read `CLAUDE.md`, `.claude/rules/database.md`, and this plan's Part 1 first.
2. Other sessions share the tree: `git commit --only <paths>`, never `git add -A` or `git stash`.
3. Live database: reads freely; writes only through migrations (Phase 3) or the app's own functions acting
   as the owner (Phase 9). Back up before any deletion. Never delete without the owner's yes (Q18).
4. No money, no accounts, no passwords. The owner's account is reached only as in B-OWNER-ACCOUNT.
5. Run `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet` before every push.
6. Golden equivalence is not optional: a changed built-in prescription is a bug until it is listed and
   explained in the Phase 2 evidence.
7. Comments in this codebase are often stale. Check claims in code before relying on them.
8. Never copy Liftosaur code (AGPL). Never ship a paid program.
9. Report to the owner in plain words, doubt first; show work on a page he can look at.

---

# `/goal` prompts

### Phases 0–5. Paste after `/goal`.

> Execute Plans/program-builder.md Phases 0 to 5 in order, following its Part 2 ground rules. Record evidence
> under each phase heading as you go, commit with `git commit --only` and push to training-rebuild at the end
> of each phase. Stop and report in plain words if a phase's acceptance cannot be met.

### Phases 6–8, after the owner's marks on the builder mock-up. Paste after `/goal`.

> Execute Plans/program-builder.md Phases 6 to 8, starting with the mock-up in 6.1 and waiting for the
> owner's marks before building 6.2. Same rules and evidence as before.

### Phases 9–10, after Q16, Q18 and Q19 are answered. Paste after `/goal`.

> Execute Plans/program-builder.md Phases 9 and 10: put the owner on Starscream as the plan says, release to
> main, and report with screenshots.
