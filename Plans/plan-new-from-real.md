# /plan/new, rebuilt from the real tool: everything comes over

Written 2026-11-19. This plan **replaces the screens of `/plan/new`** (Phases 6–7 of `Plans/plan-in-steps.md`).
Phases 1–5 of that plan stay as they are: the backups, the copy space, the invisible fixes to today's flow, and
the save engine. The switch-over (its Phase 9) still waits for his word.

**Status:**
- **Phase 0 (inventory)** done on 2026-11-19 (Opus). Five private files with about 850 rows (see Part 1).
- **Phase 1 (decision page)** published: https://claude.ai/artifact/RaASekbpeY8U4e5ogqWxGn. Its database holds his picks and notes. Waiting
  for his marks. Phase 8 needs them; Phases 2–7 do not.
- **Phase 2 onwards** not started.
- **Backups:** last night's run was killed at 08:36 (TERM, the PC was off at 03:00 and WSL stopped during the
  catch-up). It was rerun by hand at 09:15 and worked: `life-plan-2026-11-19.json.gz.gpg`.

## His words (2026-11-19)

After opening `/plan/new`: *"youve not replicated the plan at all, but made a very simplified version of what i
initially had."*

Then: *"you should try to completely look over the real tool again, and then take everything from it. As per
your own research, it is not exactly that the entire setup comes from [an outside method], just that we used
some of his nomenclature as a starting point. This is fine for us to do, and now we're just changing things
around. Also, on an ethical level, there is nothing wrong with what we've done, but we just want to make sure
it is ours. I like if we're able to make it more simple to use, so you can suggest to me a different order of
screens or something like that, but you must not just remove stuff without my knowing."*

---

# PART 1 — in plain words

## What went wrong the first time

- **I checked the wrong thing.** "Nothing gets smaller" was measured as "every question the old flow asks still
  has a place" (171 jobs). That list holds what gets saved, not how it works. Visuals, drawn editors, option
  libraries and automatic help were never on it.
- **I wrote new screens instead of reusing the real ones.** The real parts were left unused.
- **The spec cut 52 old jobs without asking him.** The reason given was "the old form traces to an outside
  source". In the inventory that comes to 122 rows.
- **I built too fast and checked a stand-in.** Everything went up in one day, from text alone. The tests proved
  that saves work and that his data stayed untouched, but nobody compared old and new screens side by side.

## What the inventory found (Phase 0)

Five read-only agents went through the whole real tool: the code plus the 133 walk screenshots. They compared
every part with `/plan/new`. The private files are in `~/.cache/daygame-research/plan-steps/inventory/`:
`A-star-now.md`, `B-pick-systems-milestones-focus.md`, `C-goalcard-values-recap.md`,
`D-today-track-journal-review.md` and `E-shell-wiring.md`.

| Part of the real tool | Rows | Same | Simpler | Missing | Cut by the spec | Only in the rebuild |
|---|---|---|---|---|---|---|
| North star, areas (steps 1–2) | 151 | 17 | 58 | 19 | 47 | 10 |
| Where to start, systems, experiences, season (3–6) | 218 | 41 | 86 | 63 | 18 | 10 |
| Goal card, values, everything (7–8) | 191 | 43 | 66 | 29 | 40 | 13 |
| Today, track, journal, review, side pages (9–12) | 165 | 30 | 57 | 51 | 17 | 10 |
| The frame around all steps | ~90 | — | — | — | — | — |

The worst losses, in plain words:
- The life wheel.
- Your "10" in each area, with its examples, and the week and day scores 0–10 that fed the wheel, the review
  and "scores over time".
- The ready-made catalogue: 27 goal sets at 3 levels, 171 single goals and 43 practices.
- The drawn curve editor for the steps toward a number.
- Routine building: 24 presets, 79 library steps, the training splits and the week preview.
- "What is running at what".
- The app reading what you type: rate, climb, finish line, numbers, units, area.
- Goal priority order, and deleting a goal.
- Putting values in order, and the evidence behind "you already said this matters".
- The full goal card.
- Month, quarter and year reviews, with their boxes and verdicts.
- Track's forward schedule.
- Workout ticks.
- Phone reminders.
- The real council of role models.
- 12 of 13 ready journal questions.
- The vision question ladder.
- The identity block under the north star.
- Saving as you type.

Three more things to know:
- **Some parts were already hidden in the real tool.** The guided build (six ways in), the ideal day, the week
  grid and the five questions are built, but nothing on `/plan` opens them today.
- **Experiences work differently.** In the real tool every experience becomes a goal. In the rebuild it is a
  loose list.
- **The rebuild has a bug.** Its weekly check-in shows 0 done for every weekly goal.

## The rule for this rebuild

- **Everything in the real tool comes over:** every screen, control, picture, option list, help text,
  automatic behaviour and piece of data. This includes the 122 rows the first spec cut.
- **Allowed without asking:**
  - our own words for labels (the outside names were a starting point; his own labels stay);
  - phone fixes (things cut off, too wide, wrapping);
  - bug fixes.
- **Needs his yes first** (proposed on the decision page): another order of screens, splitting a page into
  several screens, merging two things, and anything new.
- **Removing:** never done. At most "proposed to remove, because …" on a page, until he says so.
- **Today's `/plan` keeps working, with the same look and words, on his real data.** Nothing on `/plan/new`
  writes to his real account. It still runs on the copy space.

## How: reuse the real parts, don't redraw them

Every real step part takes its plan and its save actions from the page around it, and fetches nothing itself
(the one exception is the review reminder). So the real parts can run inside the new step-by-step pages:
- **One adapter** gives them the plan, the save actions and the account's day.
- **The save actions move out of the big page file unchanged**, so today's `/plan` uses the very same code and
  behaves the same.
- **A fix to a shared part lands in both versions.** Only fixes that stop things being cut off reach `/plan`
  this way. Words differ through a words layer that only `/plan/new` switches on.
- **First a faithful copy, in the real order** (Phase 4). He can click it on his copied data before any
  reorder.
- **Then his order** (Phase 8), from his marks.

## Proposed order of screens (his call: decision page, question 1)

**Option A, recommended: a quick start, then deepen.** Only what Today needs comes first. Everything else stays,
as a list on the plan home that shows what each part gives you and how full it is. The checked research behind
this is listed under "Where the facts come from".

| Quick start (then Today works) | Deepen, any order | Daily and weekly use |
|---|---|---|
| 1 Your areas: the wheel, optional score now | 6 North star: horizon, paragraph with the question ladder, why, cost, identity block, lines, earlier ones | Today |
| 2 This season: the one thing, end date, its areas on the wheel; then why / if not / who you'd be / values | 7 Your 10 per area: the 10 with examples, week and day scores, why, who you are there, what stops you, values, role models | Track |
| 3 How to start: the four doors (ready-made set, build your week, one routine, write freely) | 8 Experiences: area by area, examples, dates, what each needs | Journal |
| 4 Goals for the season: each one in short screens, the full goal card one tap away | 9 Values: gathered values with where you said them, the two lists, order | Review: week, month, quarter, year |
| 5 What you do each week: systems, routines, "what is running at what" | 10 Everything: read it all, change in place, quick-add, closing questions, commit | |

**Option B: keep the real order** (north star, your 10s, where to start, systems, experiences, season, values,
everything, then the daily steps). Each big page is still split into short screens if he says yes to question 2.

## Where the facts come from

- **Checked on 2026-11-19:** the inventory (code plus walk screenshots); the backup log and the systemd journal.
- **Checked web sources on setup flows, 2026.** Most are vendor posts; no independent study of goal-setting
  setups was found:
  - ask only what blocks first, move the rest to a checklist, default everything, make every step skippable,
    and count steps honestly (Kompassify, Appcues, Userpilot);
  - grouping related fields by topic is well supported (NN/g);
  - one question per screen versus grouped sections is not settled by any real study.
- **From memory:** the walk's 1.5–2 hours to fill everything (walk report, 2026-11-18).

---

# BLOCKERS (each tried once on 2026-11-19)

| ID | What | Tried, and what came back | Blocks | Plan |
|---|---|---|---|---|
| B1 | The save-engine branch `plan-engine` is not merged; another session is fixing it | `git log main..plan-engine`: 6 commits, 40 files. It rewrites `src/goals/planStore/*`, the SaveIndicator in `plan-new/ui.tsx`, id minting in `northStarService.ts`, `planChanges.ts`, `app/api/life-plan/route.ts` and `lifePlanRepo.ts` | Phase 7 only | Phases 2–6 touch none of those files. Phase 7 waits for the merge |
| B2 | The copy space lets through only plan and day requests | Inventory D/E: workouts and enrollments are reads and pass the guard (as on `/plan/sandbox`). Reminder, council and quit writes are refused | Parts of Today, Review, role models | Reads as `/plan/sandbox` does. Reminders shown but off on the copy (no pushes). Council rows copied into the copy (3.4) |
| B3 | New words must not come from the outside sources; this planning session has read the label inventory | — | Phase 6 | A fresh writer agent that sees only job lines, and a checker that sees `labels.md` |
| B4 | WSL memory: two dev servers plus a typecheck crashed WSL on 2026-11-10 | `tools/load.sh` named in memory: "No such file or directory" | Speed | One dev server at a time; stop it before the typecheck; e2e with `--workers=1`; check `free -g` first |
| B5 | Deploy rate limit (~60 pushes a day) | Memory, 2026-11-11 | — | One push per phase |
| B6 | His real data for side-by-side screenshots | `~/dg-backups/nightly/life-plan-2026-11-19.json.gz.gpg` exists. `scripts/restore-life-plan.ts` restores into the local test stack; the passphrase is in `plan-steps/backup-passphrase.txt` | Phases 4, 8, 9 | Restore into the local stack under a test account, never live |

# DECISIONS I TOOK (proposed; he can veto any, say the letter)

| # | Decision | Why |
|---|---|---|
| T1 | Reuse the real step parts through one adapter. The save actions move out of `NorthStarFlow.tsx` unchanged into a shared hook that both versions use | One source of truth. `/plan` keeps its behaviour, proved by its existing e2e suite |
| T2 | First a faithful copy in the real order (Phase 4), then his order (Phase 8) | He sees the full tool before anything moves. The build does not wait for his marks |
| T3 | The first rebuild's screens move to `/plan/new/first/…`, unchanged, until he says what happens to them | Nothing goes without his knowing, even my own work |
| T4 | Fixes that stop things being cut off at phone width apply to `/plan` too | They change no words, no order, no behaviour. Every such fix is listed in the report to him |
| T5 | New words reach only `/plan/new`, through a words layer. `/plan` keeps its words | His rule: today's flow stays as it is |
| T6 | His February areas decision stands: eight areas plus the daily "Feeling about life" rating | His own pick on the areas page, 2026-11-18 |

# OPEN QUESTIONS (on the decision page, each with a recommendation)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Order of screens | A: quick start, then deepen | B: the real order | Phase 8 is a reorder: a day of work either way |
| Q2 | Split big pages into a few short screens, grouped by topic, each with a "see it all on one page" view | Yes | Keep each page as one long page | Small |
| Q3 | The 122 parts the first spec cut come back with our own words | Yes, all | He names ones to leave out | — |
| Q3b | Five ready-made routines copy a taught practice, not just a name (a fixed long morning ritual, spoken lines with the body, happy/proud/grateful questions, a step that reads a bundle, a feel-it-as-real routine) | Bring back, renamed and reworded as ours | Leave out | Low |
| Q4 | Keep what the first rebuild added: the plan home with "Next up", the season band, Done summaries, earlier notes | Keep | Drop | Low |
| Q4b | Locks (a step opens only after the earlier one). The real tool has none | Drop the locks | Keep | Low |
| Q5 | The parts the real tool hides (guided build, ideal day, week grid, five questions) | Bring them in as "Plan my week" under Deepen | Leave hidden | Medium build |
| Q6 | Percentages and "still to fill in" chips | Bring back, counted by the same rule as the status so the numbers agree | Status words only | Low |
| Q7 | Experiences | Each becomes a goal, as in the real tool | Loose list (rebuild) | Data shape |
| Q8 | The app moves typed lines between Systems and Experiences by itself | Keep, but show "moved to Experiences · undo" | Never move | Low |
| Q9 | Dragging on the phone (curve, value order) | Keep drag, add buttons beside it | Drag only | Low |
| Q10 | Open on Today once the plan is in use | Yes, as now | Open on the plan home | Low |
| Q11 | The first rebuild's screens stay reachable at `/plan/new/first/…` for now (T3) | Keep for now | Remove | Low |

---

# PHASES

Models: build and checks run on **Sonnet** (`claude --model sonnet`); mechanical merges on **Haiku**; reviews,
words and the audit on **Opus** subagents (`model: "opus"`). Work in a worktree under
`~/.cache/daygame-research/plan-steps/full-wt` on branch `plan-full` (never `/tmp`: a crash wipes it). Ship by
fast-forward to `main`.

## Phase 0 — Inventory (done, Opus)

The five files above.

## Phase 1 — Decision page (done, Opus; waits for his marks)

https://claude.ai/artifact/RaASekbpeY8U4e5ogqWxGn (source
`~/.cache/daygame-research/plan-steps/decision-page/plan-rebuild-choices.html`). Its database:
- `pick`: one doc per question id (`q1` … `q11`, `q3b`, `q4b`), holding `{choice, at}`. Choice values are in the
  page source (Q1 `A`/`B`, Q2 `split`/`keep`, and so on);
- `notes`: docs `{item, text, at}`, where `item` is a question id or `general`. A note is appended, never replaced;
- `likes`: one doc per question id, holding `{liked}`.
Read them with ArtifactData `list` (url = the page).

## Phase 2 — One checklist (Haiku)

2.1 Merge the rows of A–E into `inventory/MASTER.md`. Each row gets an id (`A12`, `B40`, …), the item, the real
    file:line, the old status, and two empty columns: `new home` (route + file) and `proved` (shot pair name).
2.2 *Check:* the row count equals the sum of the five files. No row is dropped (a script counts them).

## Phase 3 — The adapter (Sonnet builds, Opus reviews)

3.1 `src/goals/components/north-star/usePlanWriters.ts`: move the handler factories (`NorthStarFlow.tsx`
    ~1315–1697) and the inline writers (~2017–2370) **unchanged**. `NorthStarFlow` calls the hook. Verify the
    line ranges first: the file may have moved.
3.2 `usePlanReads.ts`:
    - the account's today, with its timezone and the 60-second, focus and visibility tick (~526–677);
    - enrollments and their reconcile (~551–650);
    - training ticks (~1493–1526);
    - `useOneThing`.
3.3 `src/goals/components/plan-new/RealStep.tsx`, the host:
    - a day-safe `setPlan`: `store.update(fn)`, then start the day send when the day record changed. Test that
      a tick made through a real part is in the account after a reload;
    - a dialog host for AreaDialog, AreaGoalsDialog and the errand ribbon, with its state in the query
      (`?area=`, `?goal=`, `?routine=`);
    - a map from the 12 step ids to `/plan/new` routes, for `onGoToTab`, `onNext` and `goTo`;
    - `PlanBasePathContext` set to `/plan/new`;
    - a `?step=` / `?period=` redirect in `PlanNewRouter.tsx`.
    The timezone comes from `getUserTimezone` in `app/(app)/plan/new/layout.tsx` into `PlanNewContext`.
    Typing must not send one request per keystroke: test 50 typed characters against the request count.
3.4 Copy space:
    - never pass `onReminderChange`;
    - workout and enrollment reads work as on `/plan/sandbox`;
    - check whether "Copy my real plan in again" copies the council (`user_role_models`) and the quit records.
      If not, add them to the copy, with an Opus security review of that change.
3.5 Do not edit the files listed in B1.
3.6 *Check:*
    - every existing `/plan` e2e spec passes unchanged: `life-plan-*.spec.ts`,
      `life-mastery-north-star-history`, `plan-saves-lose-nothing`, `plan-sandbox`;
    - unit tests cover the route map and the day-safe `setPlan`;
    - the typecheck ratchet passes.

## Phase 4 — Faithful copy at `/plan/new` (Sonnet; depends on 3)

4.1 Mount all 12 real steps in the real order. Build steps go in the Frame (Back · save · Next); the daily steps
    run full width. The plan home lists the real steps. The rebuild's additions (Next up, season band, Read it
    all, Done summaries, earlier notes) stay until Q4 is answered.
4.2 Move the first rebuild's module screens to `/plan/new/first/…`, unchanged (T3).
4.3 Words stay as in the real tool in this phase.
4.4 *Check:*
    - every MASTER row has its `new home`;
    - restore the 2026-11-19 backup into the local stack (B6) and screenshot old `/plan` and new `/plan/new` at
      390 px for every step and sheet, in pairs, into `plan-steps/full-shots/`. Same content in each pair;
    - his real-account counts are unchanged after the deploy (`plan-steps/live/counts.py`).

## Phase 5 — Phone fixes in the real parts (Sonnet, Opus reviews; depends on 4)

5.1 Fix the walk's "looks broken" list and the inventories' width risks:
    - GoalCard is 462 px in a 356 px sheet;
    - wheel labels are about 10 px and cut off;
    - the 0–10 row wraps;
    - the AreaDialog bottom bar overlaps the page;
    - experience and season rows are cut off;
    - the footer wraps;
    - the Track grid scrolls sideways;
    - Today's inputs have `min-w-[14rem]`;
    - the ValuesSoFar column is a fixed `w-[104px]`;
    - review units are parsed wrongly ("k on", "pull").
5.2 *Check:* an e2e scan with no horizontal overflow (`scrollWidth <= clientWidth`) at 360 and 390 px on every
    step of both `/plan` and `/plan/new`. List each fix that reached `/plan` (T4).

## Phase 6 — Words (Opus writer and checker, Sonnet applies; can run beside 5)

6.1 List every visible string in the reused parts, with its trace from `plan-steps/labels.md` (private). Strings
    that trace to an outside method get new words. His own labels stay: North star, Season, Systems, Track,
    Today, Journal, Review. Reuse `plan-steps/spec/words.md` where it already covers the job.
6.2 A fresh writer agent gets job lines only: no repo, no cache, no old labels. A checker agent that sees
    `labels.md` flags anything close. At most two rounds.
6.3 Apply through `usePlanWords()`. Its default returns today's words, and only `/plan/new` provides the new
    ones (T5).
6.4 *Check:*
    - a scan of `/plan/new`'s rendered text shows no flagged old label;
    - `/plan`'s visible text is byte-equal before and after (snapshot test).

## Phase 7 — Store fix after the save engine merges (Sonnet, Opus reviews; depends on B1)

7.1 Move the day-send start from the adapter into `createPlanStore.update`, and remove the adapter's
    workaround.
7.2 *Check:* `plan-saves-lose-nothing` passes, plus the tick-survives-reload test from 3.3.

## Phase 8 — His order and splits (Sonnet; depends on 4 and his marks)

8.1 Read the decision page's database first (`pick`, `notes`). Apply each yes. A "no" or no answer keeps the
    real way. A note is a fix to what it points at, not a new rule.
8.2 Splits (if Q2 is yes):
    - screens are grouped by topic, not one question per screen;
    - each split step keeps its whole real part as "see it all on one page";
    - a split component takes a `section` prop. Never copy its markup.
8.3 *Check:*
    - every MASTER row is reachable in the new order;
    - redo the shot pairs;
    - check the counts again.

## Phase 9 — Prove it (Opus, 4–5 adversarial agents; Sonnet fixes)

9.1 One agent per inventory file. Each checks every row: old and new shot, and a data round trip (make, reload,
    see it). It also hunts for bugs.
9.2 Sonnet fixes. Repeat until no must-fix item is left.
9.3 Phone walk on the emulator (`~/.cache/daygame-research/alpha/phone.sh`). Run `phone.sh stop` after.

## Phase 10 — His look (Sonnet builds the page)

A review page with side-by-side shots per step, a 👍 per step, and notes that save as he types (green Saved
badge, earlier notes listed). Status says "built / live", never "done", until he says it is.

## Phase 11 — Switch-over (his word only)

As `Plans/plan-in-steps.md` Phase 9. Old links (`?step=`, `?period=`, push notifications) map to the new routes.

---

# PART 2 — rules for the executing session

- Read `CLAUDE.md`, this plan and the five inventory files first. The inventory is the checklist; MASTER.md is
  the scoreboard.
- Never write to his real account. Live test writes go inside `begin; … rollback;`. Recount his rows before and
  after each deploy.
- Commit with `git commit --only <paths>`; never `git add -A` or `git stash`. Push without asking, one push per
  phase. Run the typecheck ratchet before each push.
- Keep this plan's Status at the top current after each phase.
- Report to him in plain words. Open with done / live / not yet, and say what is left.
- When long work ends, send a PushNotification.

---

# EXECUTION PROMPT (paste into a new session started on Sonnet: `claude --model sonnet` or `/model sonnet`)

```
You are executing Plans/plan-new-from-real.md in /home/jonaswsl/projects/daygame-coach.
Read CLAUDE.md, then that plan in full, then the Status block of Plans/plan-in-steps.md, then the five
inventory files in ~/.cache/daygame-research/plan-steps/inventory/. The plan decides everything. Where it leaves
a technical choice open, choose yourself and note it in the plan's Status.

Goal: /plan/new becomes the real life-plan tool (NorthStarFlow and all its parts), complete, running on the copy
space, built by reusing the real components through one adapter. Nothing in the real tool is left out, and
nothing is removed without the owner's yes.

Order:
1. Phase 2 (Haiku subagent): MASTER.md.
2. Phase 3, then Phase 4, then Phases 5 and 6 (6 may run beside 5). Phase 7 only once branch plan-engine is
   merged into main (check git log main). If it is not merged, skip Phase 7 and note it in Status.
3. Phase 8 only after reading the decision page's database: ArtifactData list on
   https://claude.ai/artifact/RaASekbpeY8U4e5ogqWxGn, collections pick, notes, likes. If he has not picked
   yet, skip Phase 8, run Phase 9 on the faithful copy, and say so.
4. Phase 9, then Phase 10. Never Phase 11.

Hard rules:
- Never write to the owner's real account. /plan/new runs only on the copy space. Before and after every
  deploy, run ~/.cache/daygame-research/plan-steps/live/counts.py and compare with the run before. If a
  change comes from your work, stop and report it.
- Today's /plan must look and read exactly as now. Its e2e specs must pass unchanged after every phase.
  The only allowed /plan changes are moving the writers and reads into hooks (no behaviour change) and the
  Phase 5 phone fixes. List each fix.
- Do not edit the files plan-engine owns (plan, blocker B1).
- Reuse the real components. Never redraw one. If a real part cannot be mounted, stop on that part, write why
  in Status, and carry on with the rest.
- Every MASTER.md row ends with a new home and a proved shot pair. A row you cannot place is written in
  Status as "open". Never drop a row.
- Words (Phase 6): the writer is a fresh Opus subagent that gets job lines only (no repo, no cache, no
  labels.md). The checker is a second Opus subagent that does see labels.md.
- Work in a git worktree at ~/.cache/daygame-research/plan-steps/full-wt on branch plan-full, never in /tmp.
  Commit work in progress often. Ship by fast-forward to main with git commit --only. Never git add -A or
  git stash. Run the typecheck ratchet before each push. One push per phase.
- One dev server at a time: --webpack, its own port, the test-stack env (memory: worktree-e2e-servers).
  Stop it before the typecheck. Run e2e with --workers=1. Stop the Android emulator after use. Check free -g
  before heavy runs.
- Subagents: model "sonnet" for building, "haiku" for mechanical checks, "opus" for reviews, words and the
  audit.
- The repo is public: no outside source names and none of his private data in commits. Private material
  stays in ~/.cache/daygame-research.
- Update the plan's Status after each phase and commit it.
- Report to the owner in plain words; he is not a programmer. Open with done / live / not yet and say what is
  left. Anything for him to look at goes on an artifact page, never a local path. Write "built" or "live",
  never "done", until he says so. When the work ends, send a PushNotification.
```
