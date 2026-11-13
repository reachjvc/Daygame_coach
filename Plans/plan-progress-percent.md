# Your plan: a percentage instead of "Finish your plan"

Written 2026-11-13 from the owner's ask: "Right now it says I am not done and
need to go to my north star. Rather than this, compute a percentage of how much
is done, a total of all the steps."

## In plain words

**Owner-only decisions in this plan: none.** No money, no data deleted, no
database change. Only how the page counts and what it shows changes.

Today, the top of Today shows a "Due now" card: **"Finish your plan — Next:
step 1, North star."** It picks the first step in the list that is not 100 %
done. Your North star step is not 100 % because the seven "who would you have
to become" questions under the paragraph are empty, so the card keeps sending
you there even though you wrote a 1,519-character north star.

After this change:

- That card says **"Your plan is 45 % done"** with a bar, and one line naming
  the step with the most left. Tapping it opens the list of steps.
- Every step in the step list shows its own percentage (a ring that fills,
  plus "3 of 8" style counts), so you can see where the missing part is.
- The total is the **average of the seven steps** that hold something you
  write. Each step counts the same.
- The card goes away at 100 %. "Not now" still hides it for a week.

### What your live plan scores today (read-only check, 2026-11-13)

Measured by loading your real plan from the live database with the app's own
code. Nothing was written.

| Step | What it asks | You have | Step % |
|---|---|---|---|
| 1 North star | the paragraph (half) + 7 ladder questions (half) | paragraph yes, 0 of 7 questions | 50 % |
| 2 Your 10s | 12 areas rated + 12 areas pictured | 12 + 12 | 100 % |
| 4 Systems | every milestone has something running at it | 12 of 43 | 28 % |
| 5 Experiences | every milestone has a why and a date | 0 whys, 43 dates (43 of 86) | 50 % |
| 6 Season | areas, focus area, one-thing sentence, its why/cost/identity/values, a goal serving it | 7 of 8 (no focus area picked) | 88 % |
| 7 Values & identity | at least 3 values in your ranked order | 0 of 3 | 0 % |
| 8 Everything | commitment sentence + its date | 0 of 2 | 0 % |
| **Total** | average of the 7 | | **45 %** |

Steps 3 (Where to start), 9 Track, 10 Today, 11 Journal and 12 Review hold
nothing you write into the plan, so they carry no percentage. That rule
already exists (`SCORED_TABS`) and stays.

## How it is built

One new pure function, `stepProgress(plan, tab, account)`, in
`src/goals/northStarService.ts`, next to `stepState`. It returns:

```ts
interface NsStepProgress {
  /** 0..1. 1 exactly when stepState(...) === "done". */
  fraction: number
  /** The parts, for "3 of 8" and the breakdown. */
  parts: Array<{ label: string; have: number; of: number; weight: number }>
}
```

and `planProgress(plan, account)` returns `{ percent: number (0..100, rounded
down), steps: Record<scored tab, NsStepProgress>, mostLeft: tab | null }`.

Rounded **down**, so 99.6 % shows 99 %, never a false 100 %.

Per-step rules (mirror `stepState` exactly; the weights inside a step add to 1):

| Step (id) | Parts and weights | Edge cases |
|---|---|---|
| star | paragraph written: 1/2. Ladder: rungsAnswered / 7, weight 1/2 | – |
| now | areas rated / areas: 1/2. areas with a 10 written / areas: 1/2 | uses `ratedAreaCount(plan, todayISO())` like `stepState` |
| milestones | milestones with a why / n: 1/2. with a date / n: 1/2 | n = 0: fraction 0, part "Write your first milestone" |
| systems | (n − milestonesWithoutSystems) / n: 1 | n = 0: 1 if any system goal or routine with steps exists, else 0 |
| focus | 8 equal parts: season areas chosen, focus picked, one-thing sentence (`account.hasOneThing`), ONE_ANSWERS why, cost, identity, values, a goal with `servesOneThing` | – |
| values | min(values.length, 3) / 3 | – |
| recap | commitment sentence: 1/2. its date: 1/2, **counted only when the sentence exists** | matches `stepState`, which calls a date with no sentence "empty" |

`mostLeft` = the scored step with the largest `(1 − fraction)`; ties go to the
earlier step in `TAB_ORDER`.

**The invariant that keeps it honest**, tested over many generated plans:
`fraction === 1` exactly when `stepState === "done"`, and `fraction === 0`
whenever `stepState === "empty"`. (A step can be "started" at 0 %, e.g. star
notes written but no paragraph yet; that is allowed.) If the two ever
disagree, the test fails, so the ring and the percentage can never contradict.

Where it shows:

1. **Due now card** (`src/goals/dueNowService.ts`, `src/goals/data/northStar.ts`
   `DUE_COPY`, `src/goals/components/north-star/DueNow.tsx`). Kind stays
   `"finish-setup"` (so hidden keys and the e2e test id survive). New copy:
   title `Your plan is 45 % done`, detail `Most left: Values & identity,
   0 of 3 values ranked.` A thin bar under it. Tapping goes to
   `mostLeft`'s step. Shown while the total is below 100, **whether or not
   you have committed** (today the card disappears once a commitment date is
   written, even if steps are unfinished; see Q3).
2. **Step list (rail)** in `NorthStarFlow.tsx`: `StepDot` becomes a ring
   filled to the fraction (amber, same colours), with the percentage in its
   `aria-label` and title. Under each step's blurb, a small "3 of 8" line from
   the parts. The "Edit your plan · 8 steps" toggle reads
   `Edit your plan · 8 steps · 45 %`. The phone header `Step 1 of 12 ·
   North star` gets ` · 50 %` on scored steps.
3. **Everything step** (recap): one line at its top, "Your plan is 45 % done",
   with the per-step list (label, bar, %), each row a link to its step. This is
   the "see all of it" view.

`nextSetupStep` is replaced by `planProgress(...).mostLeft` inside the card;
delete `nextSetupStep` and its tests once nothing calls it (check with grep).

```
Phone, Today, top:
┌────────────────────────────────────────┐
│ Due now                                │
│ Your plan is 45 % done          Not now│
│ ███████████░░░░░░░░░░░░░               │
│ Most left: Values & identity, 0 of 3   │
└────────────────────────────────────────┘
```

(Values at 0 % has the most left today: 1 − 0 = 1, tie with Everything,
Values comes first.)

## Blockers

| ID | What | Attempted, result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Reading the owner's real plan to know what he will see | Tried 2026-11-13: scratch vitest under `tests/manual/` with the admin client swapped in, `readLifePlan` + `rowsToPlan` + `stepStates`. Worked, read-only, file deleted after. Figures above. | Nothing | Phase 4 repeats it to check the shipped number |
| B2 | None owner-only | – | – | – |

## Open questions (each answered with a default; the build follows the default unless the owner says otherwise)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Does each step count the same, or each box? | **Each step the same.** With boxes, Systems and Experiences (43 milestones, 129 boxes) would be 75 % of the total and the other five steps would barely move it. | Count every box: you'd be at 50 %, almost all of it decided by the milestones. | One function to change |
| Q2 | Inside North star, is the paragraph worth as much as the 7 ladder questions together? | **Yes, half each** (you are at 50 %). Counting it as 1 box of 8 would put a 1,500-character north star at 13 %. | 1 of 8 boxes | One weight |
| Q3 | Keep showing the card after you have committed (Everything step dated)? | **Yes, until 100 %**, with "Not now" hiding it a week. The point is to see what is left. | Hide after commitment, as today | One condition |
| Q4 | Should adding a new goal lower the percentage? | **Yes.** A goal with no why is unfinished work; the number tells the truth. The card's line says why it moved. | Count only goals that existed at commitment | Would need stored history: not recommended |
| Q5 | Show the percentage on Home too? | **Not now.** You asked for the plan part. One line on Home's "Today's plan" card is an easy later add. | Add it in Phase 3 | Small |

## Phases

### Phase 1: the numbers (no screen changes)
- Add `NsStepProgress`, `stepProgress`, `planProgress` to
  `src/goals/northStarService.ts`, following the rules table above exactly.
- Tests in `tests/unit/goals/northStarSteps.test.ts` (or a new
  `planProgress.test.ts` beside it):
  - each rule with a hand-built plan (empty plan = 0 %, full plan = 100 %, each
    edge case in the table);
  - the invariant over at least 200 generated plans (random mixes of filled
    and empty boxes, built with the existing helpers in the test files):
    `fraction===1 ⇔ stepState==="done"`, `stepState==="empty" ⇒ fraction===0`;
  - rounding: 0.996 shows 99.
- Acceptance: `npm test` green; `node scripts/typecheck-ratchet.mjs` passes.

### Phase 2: Today's card
Depends on 1.
- `dueNowService.ts`: `DueOptions.nextStep` becomes `progress:
  { percent, mostLeft, mostLeftDetail } | null`; card shown when `percent < 100`.
  Key stays `finish-setup:${weekKey}`.
- `DUE_COPY.finishSetup(percent, label, detail)`.
- `DueNow.tsx`: a bar under the finish-setup row only (`role="progressbar"`,
  `aria-valuenow`).
- Update `tests/unit/goals/dueNowService.test.ts` and
  `tests/e2e/life-plan-due-now.spec.ts` (title text now `Your plan is … % done`).
- Remove `nextSetupStep` if unused.
- Acceptance: unit + that e2e spec green; on a phone-size (390 px) screenshot
  of Today with a half-filled test account, the card reads right and nothing
  overflows.

### Phase 3: the step list and Everything
Depends on 1.
- `StepDot` to a filled ring by fraction; "n of m" line per scored step; the
  `RAIL_COPY.editPlan` and `phoneStep` copy gain the percentage.
- Everything step: total line + per-step rows linking to each step.
- Acceptance: screenshots at 390 px and 1280 px of the rail open and of
  Everything, for an empty, a half and a full test plan; the ring, the "n of
  m" and the card agree for each.

### Phase 4: check the real thing, ship
- Repeat the B1 probe against the live plan: expect 45 % (or the figure his
  plan has by then) and the same per-step numbers as the screen.
- `npm test`, `node scripts/typecheck-ratchet.mjs`, the due-now e2e spec.
- Commit with `git commit --only <paths>`, push to `main`, then confirm the
  live build: `https://daygame-coach.vercel.app/api/healthz` `buildId` equals
  the pushed commit.
- Report to the owner in plain words: live or not, his percentage, and the
  screenshots.

## Ground rules for the executing session

- Other sessions share this working tree: never `git add -A`, never
  `git stash`; commit with `git commit --only <paths>`. Build in a worktree if
  the tree is busy, ship by fast-forward to `main`.
- `main` is the live site; push without asking, batch commits (the deploy rate
  limit is about 60 pushes a day).
- The live database holds the owner's real plan. Only read it. The probe uses
  a file under `tests/manual/` that is deleted after; it never writes.
- The repo is public: no plan contents (his north star text, goals) in
  commits, tests or the report. Numbers only.
- Read `node_modules/next/dist/docs/` before touching Next.js APIs (this plan
  should not need any).

## Execution prompt (for a smaller model, one phase per run)

```
Read Plans/plan-progress-percent.md and CLAUDE.md in full before anything else.
Execute Phase <N> only, exactly as written; the rules tables are the spec.
Where the code disagrees with the plan, the code's stepState wins: stop and
note the difference in the plan under the phase rather than guessing.

Rules:
- Shared working tree. Never `git add -A` or `git stash`. Commit only your
  files with `git commit --only <paths>`. Pre-commit runs `npm test`.
- Before pushing: `node scripts/typecheck-ratchet.mjs` must pass.
- Push to main when the phase's acceptance checks pass (main is the live
  site; that is wanted). After pushing, check
  https://daygame-coach.vercel.app/api/healthz shows your commit as buildId.
- Live database: read only. Never write to it. Never put the owner's plan
  text (north star, goal titles) in code, tests, commits or reports. The repo
  is public.
- Screenshots: headless Playwright only, never on the owner's screen.
- Do not change stepState's rules. Do not touch SCORED_TABS.
- When done, tick the phase in the plan ("Done <date>, commit <sha>") and
  report in plain words: is it done and live, what is left, any doubt.
```

Run it four times, `<N>` = 1, 2, 3, 4. Phases 2 and 3 both depend only on
Phase 1 and may run in either order, but not at the same time (both edit
`NorthStarFlow.tsx`).
