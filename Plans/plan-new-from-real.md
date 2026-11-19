# /plan/new, rebuilt from the real tool: everything comes over

Written 2026-11-19, revised the same day after his marks on the decision page. This plan **replaces the screens
of `/plan/new`** (Phases 6–7 of `Plans/plan-in-steps.md`). Phases 1–5 of that plan stay as they are: the
backups, the copy space, the invisible fixes to today's flow, and the save engine. The switch-over (its Phase 9)
still waits for his word.

**Status:**
- **Phase 0 (inventory)** done on 2026-11-19 (Opus). Five private files with about 850 rows (see Part 1).
- **Phase 1 (decision page)** done. His picks and notes were read on 2026-11-19 at 09:40 and are carried into
  this plan ("His picks", below). Q1 (order) and Q8 (lines that move by themselves) are open. He wants to try
  working versions of them in the real tool (Phase 7).
- **Phase 2 (one checklist)** done on 2026-11-19 (Haiku). `inventory/MASTER.md` holds 973 rows (A 170, B 225,
  C 217, D 219, E 142); `inventory/count_check.py` passes (source = MASTER per file). The count includes the
  legend and summary tables, so no row is lost; those rows get "new home: legend/summary" later.
- **Phase 3 (adapter)** built on 2026-11-19:
  - The writers and reads moved out of `NorthStarFlow.tsx` into `usePlanWriters.ts` and `usePlanReads.ts`.
    ErrandRibbon, PlanProgressList and QuickAdd moved into their own files. An Opus review signed off "pure
    move: yes" (`plan-steps/proof/p3-move-review.md`, diffs in `proof/`). One harmless difference: the
    workout read now goes out before the plan read.
  - `plan-new/RealStep.tsx` + `RealStepViews.tsx` host all 12 real steps at `/plan/new/s/<step>`. Dialogs
    are in the query (`?area=` …), `?step=` / `?period=` redirect there, and the timezone comes from the
    layout. Not yet there (Phase 4's Frame): the rail, back link, start over, to-do and read-back blocks.
  - The copy space now copies, saves and empties the role-model council (Opus security review: no
    must-fix). The quit-a-vice records have no table of their own: they are plan rows, and the plan rows
    were already copied.
  - The checks pass: the new e2e `plan-new-real` (a tick survives reload in the hidden account, 50 typed
    characters send fewer than 10 writes, all 12 steps open), route-map and council-route unit tests,
    `plan-sandbox` (its council line now proves the write goes to the copy space), `plan-new`, and the
    `/plan` specs. The typecheck ratchet passes.
  - Open: `life-plan-landing.spec.ts:40` ("Saved to your account." not visible) fails the same way on
    origin/main (d1c98d4b), so we did not cause it. `:22` failed twice here, then passed on both main and
    this branch (flaky).
- **Phase 4 (faithful copy)** built on 2026-11-19 (resumed after a WSL crash):
  - `planSequences.ts` holds V1 (today's 12-step order). `/plan/new/<step>` mounts each real step; build steps sit
    in the real bottom bar ("← previous · Saved to your account. · next →"), daily steps in the real top bar.
  - NorthStarFlow's header, step picker, "Still to fill in", read-back and step bar moved to their own files (pure
    move: 260 of 268 lines verbatim, the rest imports and renamed handlers) and are mounted on `/plan/new` too.
    StarTab, NowTab and FocusTab take an optional `hideNext` (default off), so there is one Next.
  - The first rebuild moved unchanged to `/plan/new/first/…`. Role models run at `/plan/new/role-models` on the
    copy's council. The review reminder shows, switched off. Track reads his training log (GET only).
  - Check 4.4: his backup restored into the local stack under a test account (927 rows, matched). Old/new shot
    pairs at 390 px for all 12 steps and the area sheet (`plan-steps/full-shots/`): each pair differs only by the
    copy-space banner and the step's own "Now …→" button that the bar replaces. MASTER: 31 rows still NOT YET
    (Phases 6.3–6.7, GuidedBuild, save timers for Phase 9, Black Box).
  - Tests: unit 8236 passed; plan e2e set 44 + 17 passed; typecheck and lint ratchets none new.
  - Open:
    - Black Box: links from `/plan/new` still go to the real `/plan/quit-vice`; its record is in browser storage
      shared with the real page, so mounting it would touch his real record.
    - Start over on the copy uses the copy's reset route: sending an empty plan through the store left goal,
      routine and step rows behind although the save answered 200. Save-engine bug, for the `plan-engine` branch.
    - The step bar follows TAB_ORDER; it must follow the sequence once V2/V3 exist (Phase 7).
    - Known failures also on origin/main: `life-plan-landing.spec.ts:22`, `:40`,
      `plan-saves-lose-nothing.spec.ts:82` (several "Health" wedges; fails on 69487bea too).
- **Phase 5 (phone fixes)** next.
- **Backups:** last night's run was killed at 08:36 (TERM: the PC was off at 03:00 and WSL stopped during the
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

His notes on the decision page, the same morning:
- **Order:** *"You can do the quick start, but i think north star needs to go first, it is sort of the way we get
  to know ourselves. But it is fine that we deepen them later."* And: *"when i went through it, i did not
  necessarily want to write my beliefs down or find my values for each north star, for each area, but for some
  of them i did want to do those things. Perhaps it is better done later, but i think it is also nice to prompt
  the user to do it automatically when theyre looking at the area, and thinking 'hmm, i just wrote my north
  star/my area, and this is really important, and i wont get there if i keep doing X'. So i am split."*
- **New words:** *"when you reword stuff, it often becomes quite AI-speak. I guess i can look it over, but in
  order to lessen the amount i need to work, i would like for you to think it through."*
- **The ready-made routines:** *"it does not perhaps have to be entirely X morning routine as we've taken it, but
  just a morning routine that makes sense - the issue is that i dont want you to make the things smaller in
  order to avoid copyright, i more likely want you to make them bigger and more all encompassing."*
- **Lines that move by themselves:** *"I am not sure what this means. The 'experience' or the UI of it all may
  need some changes to become more usable. Part of this exercise we're doing here is to allow me to look at it
  with fresh eyes so i can decide how it should ideally work."*
- **General:** *"Some things will be difficult for you to oneshot. And it is difficult for me to just explain in
  words in an artifact like this. What i would prefer is to see a few different examples of how it could be
  done, in the real (new) tool, and how it would affect the whole sequence of things happening."*
- **On the rebrand before/after page** (2026-11-19 evening, "Your plan"; copied here from
  `Plans/rebrand-round-2.md`): *"probably like the one on the left slightly more, but this also just needs to look
  more interactive and cool"*

---

# PART 1 — in plain words

## What went wrong the first time

- **I checked the wrong thing.** "Nothing gets smaller" was measured as "every question the old flow asks still
  has a place" (171 jobs). That list holds what gets saved, not how it works. Visuals, drawn editors, option
  libraries and automatic help were never on it.
- **I wrote new screens instead of reusing the real ones.**
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

The worst losses:
- the life wheel;
- your "10" in each area, with its examples, and the week and day scores 0–10;
- the ready-made catalogue: 27 goal sets at 3 levels, 171 single goals and 43 practices;
- the drawn curve editor;
- routine building: 24 presets, 79 library steps and the training splits;
- "What is running at what";
- the app reading what you type;
- goal priority order, and deleting a goal;
- putting values in order;
- the full goal card;
- month, quarter and year reviews;
- Track's forward schedule;
- workout ticks;
- phone reminders;
- the real council of role models;
- 12 of 13 ready journal questions;
- the vision question ladder;
- the identity block;
- saving as you type.

Three more facts:
- The guided build (six ways in), the ideal day, the week grid and the five questions are built in the real
  tool, but nothing opens them.
- In the real tool each experience is a goal.
- The first rebuild's weekly check-in shows 0 done for every weekly goal.

## The rules for this rebuild

- **Everything in the real tool comes over:** every screen, control, picture, option list, help text,
  automatic behaviour and piece of data, including the 122 rows the first spec cut.
- **Bigger, never smaller.** Where a part comes back in a new form, the new form does at least everything the
  old one did, and may do more. Nothing is made smaller to put distance from an outside source (his note on
  Q3b).
- **Allowed without asking:**
  - our own words for labels that trace to an outside method, written to the words guide below;
  - phone fixes (things cut off, too wide, wrapping);
  - bug fixes.
- **Where he is unsure, build two or three working versions in the real new tool**, show how each changes the
  whole sequence, and let him try them. Never ask him to choose from a description.
- **Removing:** never done. At most "proposed to remove, because …" on a page, until he says so.
- **Today's `/plan` keeps working, with the same look and words, on his real data.** Nothing on `/plan/new`
  writes to his real account. It runs on the copy space.

## How: reuse the real parts, don't redraw them

Every real step part takes its plan and its save actions from the page around it, and fetches nothing itself
(the one exception is the review reminder). So:
- **One adapter** gives the real parts the plan, the save actions and the account's day inside the new
  step-by-step pages.
- **The save actions move out of the big page file unchanged.** Today's `/plan` uses the very same code, and a
  diff proves it is a pure move.
- **The order of screens is data.** One file lists the screens in order, plus where the optional deeper
  questions appear. Each version he tries is one more list, not more code.
- **First a faithful copy in today's order** (Phase 4). Then his picks (Phase 6). Then the versions for what he
  is unsure about (Phase 7). The words come last, over everything at once (Phase 8).

## His picks (decision page, read 2026-11-19)

| # | Question | His pick | What this plan does |
|---|---|---|---|
| Q1 | Order of screens | No pick. Notes: north star first; deepen later; maybe prompt the deeper questions in place, for the areas that matter | **Three working versions** (Phase 7, V1–V3) |
| Q2 | Split long pages into short topic screens | Split | Phase 6.2 |
| Q3 | The 122 cut parts come back in our words | All | Phases 4 and 8 |
| Q3b | The five ready-made routines that copy a taught practice | Bring back. Note: make them bigger and more complete, not a copy | Phase 8b: our own routines, designed from fresh research |
| Q4 | Keep the plan home, season band, Done summaries, earlier notes | Keep | Phase 6.3, adapted to the real steps |
| Q4b | Locks | No locks | Phase 6.3 |
| Q5 | Bring in the hidden parts as "Plan my week" | In | Phase 6.4 |
| Q6 | Percentages and "still to fill in" chips, counted by one rule | Back | Phase 6.5 |
| Q7 | Each experience is a goal | Goal | Phase 4 (the real behaviour) |
| Q8 | Lines that move between Systems and Experiences by themselves | No pick. Note: not clear what it means; wants to look with fresh eyes | **Three working versions** (Phase 7, S1–S3) |
| Q9 | Drag plus buttons on the phone | Both | Phase 6.6 |
| Q10 | Open on Today once in use | Today | Phase 6.7 |
| Q11 | Keep the first rebuild's screens reachable | Keep | Phase 4.2 (`/plan/new/first/…`) |

## The words guide (Phase 8; his note: no AI-speak, less work for him)

- **Change only what must change:** a label that traces to an outside method (per `plan-steps/labels.md`), or one
  the walk found confusing. A plain old label stays as it is. Fewer changes means less for him to check.
- **Voice:** a straight-talking friend who coaches, talking to one man. "You", present tense, everyday words
  from his life: gym, dates, approaches, money, sleep, work.
- **Length:** a label is at most 4 words, a question at most 12, help text at most 2 short sentences.
- **Banned words:** journey, unlock, empower, elevate, intentional, align, thrive, embrace, transform, holistic,
  mindset shift, level up, game-changer, deep dive, leverage, optimize, best self, show up, lean into, hold
  space, crush it.
- **Banned patterns:** dash asides, "not X, but Y", rhythmic lists of three, colon-then-reveal, exclamation
  marks, rhetorical questions in help text, emoji.
- **Read-aloud test:** would a 25–35-year-old guy say it to a mate at the gym? If not, rewrite it.
- **Every change carries:** the old label, the job, the new label, and one line on why it is ours and not a
  renamed copy.
- **Process:**
  - a writer agent (Opus) gets each screen's shot, the current words, the job, this guide, and a "do not use"
    list of the outside method's own names;
  - a checker agent (Opus) sees `labels.md` and flags anything that is close to an outside name, breaks the
    guide, or loses the meaning;
  - at most two rounds.
  This replaces the first plan's blind writer, whose words read generic.
- **His check:** he sees the new words in place while he walks the tool. The review page lists only the changed
  labels, by step, each next to its screen.

## Where the facts come from

- **Checked on 2026-11-19:**
  - the inventory (code plus walk screenshots);
  - his picks and notes in the decision page's database;
  - the backup log and the systemd journal;
  - `planFacts.ts`: the `start:new:` answer keys, which hold extra facts without a schema change.
- **Checked web sources on setup flows, 2026.** Most are vendor posts; no independent study was found:
  - ask only what blocks first, move the rest to a checklist, and make every step skippable (Kompassify,
    Appcues, Userpilot);
  - grouping by topic is well supported (NN/g);
  - one question per screen is not settled.
- **From memory:** the walk's 1.5–2 hours to fill everything (walk report, 2026-11-18).
- **Not yet researched:** the morning routine content. Phase 8b researches it fresh before designing.

---

# BLOCKERS (each tried once on 2026-11-19)

| ID | What | Tried, and what came back | Blocks | Plan |
|---|---|---|---|---|
| B1 | The save-engine branch `plan-engine` is not merged; another session is fixing it | `git log main..plan-engine`: 6 commits, 40 files. It rewrites `src/goals/planStore/*`, the SaveIndicator in `plan-new/ui.tsx`, id minting in `northStarService.ts`, `planChanges.ts`, `app/api/life-plan/route.ts` and `lifePlanRepo.ts` | Phase 9 only | No other phase edits those files. Phase 9 waits for the merge |
| B2 | The copy space lets through only plan and day requests | Inventory D/E: workout and enrollment reads pass the guard (as on `/plan/sandbox`); reminder, council and quit writes are refused | Parts of Today, Review, role models | Reads as `/plan/sandbox` does. Reminders shown but off on the copy (no pushes). Council rows copied into the copy (3.4) |
| B3 | Words must be ours; this planning session has read the label inventory | — | Phase 8 | A fresh writer agent with the words guide and a do-not-use list, plus a checker that sees `labels.md` |
| B4 | WSL memory: two dev servers plus a typecheck crashed WSL on 2026-11-10 | `tools/load.sh`, named in memory: "No such file or directory" | Speed | One dev server at a time; stop it before the typecheck; e2e with `--workers=1`; check `free -g` first |
| B5 | Deploy rate limit (~60 pushes a day) | Memory, 2026-11-11 | — | One push per phase |
| B6 | His real data for screenshots and walks | `~/dg-backups/nightly/life-plan-2026-11-19.json.gz.gpg` exists. `scripts/restore-life-plan.ts` restores into the local test stack; the passphrase is in `plan-steps/backup-passphrase.txt` | Phases 4, 7, 10 | Restore into the local stack under a test account, never live. Give that account a local `plan_sandboxes` row, then "Copy my real plan in" |
| B7 | The shared checkout's `main` is 40 commits behind `origin/main`, and other sessions use it | `git status -sb` on 2026-11-19: ahead 1, behind 40 | Shipping | Never move the shared checkout. Ship from the worktree: rebase `plan-full` on `origin/main`, then `git push origin plan-full:main` |

# DECISIONS I TOOK (proposed; he can veto any, say the letter)

| # | Decision | Why |
|---|---|---|
| T1 | Reuse the real step parts through one adapter. The save actions move out of `NorthStarFlow.tsx` unchanged into a shared hook | One source of truth; `/plan` keeps its behaviour |
| T2 | The order of screens and the deeper prompts live in one data file (`planSequences.ts`) | Versions to try are cheap; his final pick is a one-line change |
| T3 | The first rebuild's screens move to `/plan/new/first/…`, unchanged (his Q11: keep) | Nothing goes without his knowing |
| T4 | Fixes that stop things being cut off at phone width apply to `/plan` too | No words, order or behaviour change; each fix is listed for him |
| T5 | New words reach only `/plan/new`, through a words layer; `/plan` keeps its words | His rule: today's flow stays as it is |
| T6 | His areas decision stands: eight areas plus the daily "Feeling about life" rating | His pick, 2026-11-18 |
| T7 | Which version he is trying is kept in the copy plan as a `start:new:` answer, and a small switcher on the copy space sets it | No schema change; works on phone and PC |

---

# PHASES

**Models:**
- **Sonnet** (`claude --model sonnet`): the session that runs this plan, building, tests.
- **Haiku** (`model: "haiku"`): mechanical merges and counts.
- **Opus** (`model: "opus"`): reviews, the split map, words, routine design and the audit.

**Where:**
- Work in a worktree at `~/.cache/daygame-research/plan-steps/full-wt` on branch `plan-full`. Never use `/tmp`:
  a crash wipes it.
- Ship per B7.

**One phase per session is fine.** The Status block at the top says where to pick up.

## Phase 0 — Inventory (done, Opus)

The five files above.

## Phase 1 — Decision page (done)

https://claude.ai/artifact/RaASekbpeY8U4e5ogqWxGn (source
`~/.cache/daygame-research/plan-steps/decision-page/plan-rebuild-choices.html`). Its database:
- `pick`: one doc per question id, holding `{choice, at}`;
- `notes`: docs `{item, text, at}`, where `item` is a question id or `general`;
- `likes`.
Everything up to 2026-11-19 08:32 is carried into this plan. Read it again before Phase 6: a newer note
overrides this plan where it conflicts.

## Phase 2 — One checklist (Haiku)

2.1 Merge the rows of A–E into `inventory/MASTER.md`. Each row gets:
    - an id (`A12`, `B40`, …);
    - the item and the real file:line;
    - the old status;
    - three empty columns: `new home` (route + file), `proved` (shot pair) and `pick` (which of his picks or
      versions touches it).
2.2 *Check:* a script counts the rows. The count equals the sum of the five files.

## Phase 3 — The adapter (Sonnet builds, Opus reviews)

3.1 `src/goals/components/north-star/usePlanWriters.ts`: move the handler factories (`NorthStarFlow.tsx`
    ~1315–1697) and the inline writers (~2017–2370) **unchanged**. `NorthStarFlow` calls the hook. Re-find the
    line ranges first: the file may have moved.
3.2 `usePlanReads.ts`:
    - the account's today, with its timezone and the 60-second, focus and visibility tick (~526–677);
    - enrollments and their reconcile (~551–650);
    - training ticks (~1493–1526);
    - `useOneThing`.
3.3 `src/goals/components/plan-new/RealStep.tsx`, the host:
    - a day-safe `setPlan`: `store.update(fn)`, then start the day send when the day record changed;
    - a dialog host for AreaDialog, AreaGoalsDialog and the errand ribbon, with its state in the query
      (`?area=`, `?goal=`, `?routine=`);
    - a map from the 12 step ids to `/plan/new` routes, for `onGoToTab`, `onNext` and `goTo`;
    - `PlanBasePathContext` set to `/plan/new`;
    - a `?step=` / `?period=` redirect in `PlanNewRouter.tsx`.
    The timezone comes from `getUserTimezone` in `app/(app)/plan/new/layout.tsx` into `PlanNewContext`.
3.4 Copy space:
    - never pass `onReminderChange`;
    - workout and enrollment reads work as on `/plan/sandbox`;
    - check whether "Copy my real plan in again" copies the council (`user_role_models`) and the quit records.
      If not, add them, with an Opus security review of that change.
3.5 Do not edit the files listed in B1.
3.6 *Check:*
    - `git diff --color-moved=zebra` on `NorthStarFlow.tsx` shows the writers as moved, not changed. An Opus
      reviewer signs off that the move changes no behaviour;
    - every existing `/plan` e2e spec passes unchanged: `life-plan-*.spec.ts`,
      `life-mastery-north-star-history`, `plan-saves-lose-nothing`, `plan-sandbox`;
    - new tests:
      - a tick made through a real part is in the account after a reload;
      - 50 typed characters do not send 50 requests;
      - the route map has a unit test;
    - the typecheck ratchet passes.

## Phase 4 — Faithful copy at `/plan/new` (Sonnet; depends on 3)

4.1 `src/goals/planSteps/planSequences.ts`: a sequence is an ordered list of screens. Each screen names a real
    component (and later a `section`, Phase 6.2) and may carry optional "go deeper" prompts. Version **V1** is
    today's 12-step order.
4.2 Mount all 12 real steps through V1. Build steps go in the Frame (Back · save · Next); the daily steps run
    full width. Never show two Next buttons: hide the real step's own Next inside the Frame. Move the first
    rebuild's screens to `/plan/new/first/…`, unchanged.
4.3 Words stay as in the real tool in this phase.
4.4 *Check:*
    - every MASTER row has its `new home`;
    - restore the backup locally (B6). Screenshot old `/plan` and new `/plan/new` at 390 px, for every step
      and sheet, in pairs, into `plan-steps/full-shots/`. Same content in each pair;
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
5.2 *Check:*
    - an e2e scan finds no horizontal overflow (`scrollWidth <= clientWidth`) at 360 and 390 px on every step
      of both `/plan` and `/plan/new`;
    - each fix that reached `/plan` is listed (T4).

## Phase 6 — His picks (Opus maps the splits, Sonnet builds; depends on 4)

6.1 Read the decision page again for newer notes.
6.2 **Splits (Q2).** First an Opus subagent writes the split map: for each long part (north star, area sheet,
    goal card, season, values, Everything, review), which sections form one screen, grouped by topic, never one
    question per screen. Each split step keeps "see it all on one page", which is the whole real part. A split
    component takes a `section` prop. Never copy its markup.
6.3 **Q4 / Q4b.** Keep the plan home, Next up, the season band, the Done summaries and the earlier notes, now
    computed over the real steps from the sequence. Remove the locks.
6.4 **Q5.** Mount GuidedBuild, with IdealDay, WeekGrid and the five questions, as "Plan my week" under Deepen.
6.5 **Q6.** One function computes each step's percentage and its "still to fill in" chips, for `/plan/new`
    only. Unit tests cover the walk's contradicting cases (for example north star at 50 % after every box was
    filled), and the numbers must now agree.
6.6 **Q9.** Drag stays. Add up/down buttons to the value order and preset shapes to the curve editor, beside the
    drag.
6.7 **Q10.** Once the plan is in use, `/plan/new` opens on Today.
6.8 *Check:*
    - every MASTER row is reachable;
    - the shot pairs are redone;
    - the counts are unchanged.

## Phase 7 — Versions to try (Sonnet builds; depends on 6)

He wants to see how each choice changes the whole sequence, not read about it. Every version keeps every part.

**Order (Q1):**
- **V1, today's order:** the faithful copy, with splits.
- **V2, north star first, then a quick start:**
  - north star (paragraph and why; the rest of it later) → areas on the wheel (optional score now) → this
    season → how to start (the four doors) → goals for the season → what you do each week. Today works from
    there;
  - then a Deepen list on the plan home: your 10 per area, the rest of the north star, experiences, values,
    Everything, Plan my week.
- **V3, like V2, plus deeper questions in place:**
  - short, skippable prompts at the moment they matter, only for the areas that are in the season or that he
    marks as important, never for all eight in a row;
  - after an area's 10: "Go deeper on Dating? Why it matters · what stops you · values";
  - after a goal: "What could stop you?";
  - after the north star paragraph: "What happens if you never get there?";
  - everything stays on the Deepen list too.

**Lines that move by themselves (Q8).** Today, a line typed on Systems that reads like a one-off ("Two dates a
month") is moved to Experiences without a word:
- **S1:** as today, it moves silently;
- **S2:** it moves and says "Moved to Experiences · Undo";
- **S3:** it asks first: "Something you do every week, or something you want to happen?", with two buttons.

7.1 Add V2, V3 and S1–S3 to `planSequences.ts` and the sorter. Add a small switcher, visible on the copy space
    only (T7).
7.2 For each version, a scripted new-user walk at 390 px on the restored data records:
    - every screen in order (a filmstrip);
    - the screens and estimated minutes until Today works;
    - the total screens.
    Time estimate: about 60 s per long text box, 15 s per short line, 3 s per tap; state the basis.
7.3 *Check:* each version can be walked end to end as a new user and with his copied data. The counts are
    unchanged.

## Phase 8 — Words (Opus writer and checker, Sonnet applies; depends on 6 and 7)

8.1 List every visible string in `/plan/new`, the new screens' titles and the V3 prompts included, with its
    trace from `labels.md`. Apply the words guide (Part 1).
8.2 Apply the words through `usePlanCopy(base, key)`: it returns today's words unless `/plan/new` provides
    others (T5).
8.3 *Check:*
    - a scan of `/plan/new`'s rendered text finds no flagged old label and no banned word;
    - `/plan`'s visible text is byte-equal before and after (snapshot test).

## Phase 8b — The ready-made routines, made bigger (Opus researches and designs, Sonnet builds; beside 8)

8b.1 **Research fresh, and say what was checked.** Find what a complete morning routine covers today: recent
     practitioner videos and posts (2025–2026), sleep and circadian research (light, water, movement), habit
     research, and how people use AI with routines. Keep a private source list in
     `~/.cache/daygame-research/plan-steps/routines/`.
8b.2 **Design our own five, each at least as complete as the old one and broader:**
     - a full morning routine;
     - lines said out loud with posture and voice;
     - morning questions (more than three);
     - reading your plan (north star, season, today's three);
     - seeing it done (the goal reached, and the steps to it).
     Each step gets a why, minutes, and a short and a full version. Visible text names no outside method.
8b.3 Build them into the routine library as presets.

## Phase 9 — Store fix after the save engine merges (Sonnet, Opus reviews; depends on B1)

9.1 Move the day-send start from the adapter into `createPlanStore.update`, and remove the workaround.
9.2 *Check:* `plan-saves-lose-nothing` passes, plus the tick-survives-reload test from 3.6. If `plan-engine` is
    still unmerged, skip this phase and say so.

## Phase 10 — Prove it (Opus, 4–5 adversarial agents; Sonnet fixes)

10.1 One agent per inventory file. Each checks every row: the old and new shot, and a data round trip (make it,
     reload, see it). Each also hunts bugs, and walks V1–V3 and S1–S3.
10.2 Sonnet fixes. Repeat until no must-fix item is left.
10.3 Phone walk on the emulator (`~/.cache/daygame-research/alpha/phone.sh`), then `phone.sh stop`.

## Phase 11 — His look (Sonnet builds the page)

One page, short, built to the review-board pattern: a 👍 per item, and notes that save as he types with a green
Saved badge and earlier notes listed.
1. **The versions:** V1–V3 side by side, each with its filmstrip, screens and minutes until Today, a "Try it"
   link (with his copied data or as a new user), and a pick. Then S1–S3, each with a "Try it" link and a pick.
2. **New words:** only the changed labels, by step, each next to its screen.
3. **The five routines:** each step with its why and minutes.
4. **Anything else:** one note box per step of the tool, for what he sees with fresh eyes.
Status says "built / live", never "done", until he says it is.

## Phase 12 — Switch-over (his word only)

As `Plans/plan-in-steps.md` Phase 9, with his picked versions. Old links (`?step=`, `?period=`, push
notifications) map to the new routes.

---

# PART 2 — rules for the executing session

- Read `CLAUDE.md`, this plan and the five inventory files first. MASTER.md is the scoreboard.
- Never write to his real account. Live test writes go inside `begin; … rollback;`. Recount his rows before and
  after each deploy.
- Never move the shared checkout (B7). Commit in the worktree; WIP commits on `plan-full` may skip hooks; the
  shipped commits pass hooks and the typecheck ratchet. Never `git add -A` or `git stash`.
- Keep this plan's Status current after each phase, and commit it.
- Report to him in plain words. Open with done / live / not yet, and say what is left.
- When long work ends, send a PushNotification.

---

# EXECUTION PROMPT (paste into a new session started on Sonnet: `claude --model sonnet` or `/model sonnet`)

```
You are executing Plans/plan-new-from-real.md in /home/jonaswsl/projects/daygame-coach. The same prompt
is used for every session until the plan is finished.

Start of every session:
1. Read CLAUDE.md, then the plan in full. Its Status block says which phase is next.
2. Read the five inventory files in ~/.cache/daygame-research/plan-steps/inventory/ and MASTER.md (once it
   exists).
3. Read the decision page's database (ArtifactData list on
   https://claude.ai/artifact/RaASekbpeY8U4e5ogqWxGn: pick, notes, likes). The plan already carries
   everything up to 2026-11-19 08:32. A newer note overrides the plan where they conflict.
4. Continue at the first unfinished phase. Finish phases in order: 2, 3, 4, 5, 6, 7, then 8 and 8b, 9 (only
   once branch plan-engine is merged into origin/main), 10, 11. Never Phase 12. When a phase is done and
   your context is getting full, update Status, commit, report, and stop. The next session picks up from
   there.

Goal: /plan/new becomes the real life-plan tool (NorthStarFlow and all its parts), complete, on the copy
space, by reusing the real components through one adapter. Then come his picks, three working versions for
each open question, words that are ours, and a review page for him.

Hard rules:
- Never write to the owner's real account. /plan/new runs only on the copy space. Before and after every
  deploy, run ~/.cache/daygame-research/plan-steps/live/counts.py and compare. If your work caused a change,
  stop and report it.
- Today's /plan must look and read exactly as now, and its e2e specs must pass unchanged after every phase.
  The only allowed /plan changes are the pure move of the writers and reads into hooks (proved with git diff
  --color-moved and an Opus review) and the Phase 5 phone fixes (list each one).
- Reuse the real components; never redraw one. If a part cannot be mounted, write why in Status as "open"
  and carry on. Every MASTER.md row ends with a new home and a proved shot pair; never drop a row.
- Bigger, never smaller: a part that comes back in a new form does at least everything the old one did.
- Removing anything needs his yes. Where he is unsure, build working versions he can try; never ask him to
  choose from a description.
- Design work goes to Opus subagents (model "opus"): the split map, words, routine research and design,
  reviews, the audit. Building goes to you or Sonnet subagents; counts and merges to Haiku. Keep your own
  context lean: give heavy reading and building to subagents with exact briefs (files, acceptance checks).
- Words follow the plan's words guide. No AI-speak: banned words and patterns, the read-aloud test, change
  only what must change.
- Do not edit the files plan-engine owns (blocker B1).
- Git: work in the worktree ~/.cache/daygame-research/plan-steps/full-wt on branch plan-full, never in
  /tmp. Never move the shared checkout's HEAD. Ship with: git fetch; rebase plan-full on origin/main; tests
  and the typecheck ratchet pass; git push origin plan-full:main. One push per phase. Never git add -A or git
  stash.
- One dev server at a time (--webpack, its own port, test-stack env; memory: worktree-e2e-servers). Stop it
  before the typecheck. Run e2e with --workers=1. Check free -g before heavy runs. Stop the Android emulator
  after use.
- The repo is public: no outside source names and none of his private data in commits. Private material
  stays in ~/.cache/daygame-research.
- Report to the owner in plain words; he is not a programmer. Open with done / live / not yet, and say what
  is left. Anything for him to look at goes on an artifact page, never a local path. Write "built" or
  "live", never "done", until he says so. When a session's work ends, send a PushNotification.
```
