# Your plan after setup: land on Today, see what is due, get one weekly reminder

**Status:** written 2026-11-09. Nothing built. Building starts only when the owner says go.
Decision page (marks and notes): https://claude.ai/artifact/Tbhg3XTAizXkLmutiUaQpp.

The owner asked on 2026-11-08: "It seems kind of weird to open the full plan, dont you think? ... i want
users to go through the full setup once, then possibly be reminded to do things as they should logically
be done, i.e. log work, review a week, create a new season focus and so on".

The goal is to make `/plan` and its details easy to understand, both in the one full setup and in the
months after it.

## What you are agreeing to, in plain words

Only you can decide these. They come first.

1. **Go, or wait for the rewrite question.** This is new work in the current codebase. You have not yet
   decided whether to rebuild the app with Jacob. Each decision below is written as what the user sees,
   so it carries over to a rebuild. Phases 1 to 4 change only screens and text. Phase 5 is the only one
   that touches the database.
2. **Phase 5 changes your live database.** It adds one small table that holds your reminder day and
   time. It also widens the list of notification kinds and adds one clock check. These changes only add
   things. A backup comes first, and every change ships with a file that undoes it. **I ask you once,
   before Phase 5.** Phases 1 to 4 need no database change.
3. **No money.** Phone notifications are free (web push, already in the app). Your phone already gets
   them: one Android phone, installed app, notifications on (read-only check, 2026-11-09).
4. **Nothing is removed.** Three removals are proposed below (R1 to R3). None is built until you say
   yes to that removal by name.
5. **Phase 7 of the rebuild (the deletes) is not touched.** This plan does not depend on it.

## Doubts first

- **The previous recommendation would not have worked for you.** It said "after Commit, open on
  Today". Your plan has never been committed: 0 committed north stars on the live database (read-only,
  2026-11-09). With that rule you would still land on step 1 every time. So the rule here is different:
  `/plan` opens on Today once the plan has **something to do** (at least one goal you are working on, or
  one routine step).
- **You have never written a review.** Live: 2 review rows, 0 with any words in them. One is the copy of
  your September scores, and the other holds only scores. The Review step still says "Last weekly
  review: today" when you only rated an area on Your 10s. A reminder alone will not change that habit.
  It is still the cheapest thing to try, and Stefan says to do exactly this (quote below).
- **"Set up once" is only half true for Stefan.** He reviews the year and sets new goals each New Year.
  He updates his vision "every year or two", not every year. So this plan does not re-walk the whole
  setup each year. It adds a yearly card: the year review, then your north star and values, then new
  goals.
- **Stefan gives no review day.** I checked the transcripts and found none. "Sunday evening" is the
  app's own line ("Any day works. Sunday evening suits most people for the week."). The default here,
  Sunday 19:00, is my pick, not his.
- **Stefan's weekly order differs from the app's.** He re-reads the vision, scores each area 0 to 10,
  then writes magic moments and plans. The app's Review starts with "Earned in…" (celebrate first). This
  plan adds the north star at the top of Review. It keeps the rest of the order (Q3).
- **This is AI-written code you will not be able to read.** It is about 5 phases. Phases 1 to 4 are
  each about a day of an agent's work. Phase 5 is bigger and waits for another plan (B1).

## What I found by using it (test accounts on a local copy, 2026-11-09)

I walked an empty account through setup at phone width, then a filled plan (4 template sets, 12 areas
rated, a season, committed) at desktop width. Pictures are on the decision page.

| # | Found | Evidence |
|---|---|---|
| F1 | `/plan` always opens on step 1, North star. That includes right after "I commit to this" and on a filled, committed plan. | walk: commit, then reopen `/plan`; `app/(app)/plan/page.tsx` passes no step; `NorthStarFlow.tsx:144` defaults to `"star"` |
| F2 | On a phone, the 12 step cards fill the first screen and a half (about 1,250 px) above every step. On Your 10s, the wheel starts below them. | screenshot e04 (phone, Your 10s) |
| F3 | Nothing tells you a review is due or a season has ended. An ended season shows only on the Season step ("This season is over") and on Tracking's band. Today says nothing. A goal past its date shows "7d overdue" only on the Season step. | walk with a season ended 1 Nov and a goal dated 2 Nov |
| F4 | After "I commit to this", nothing points onward. | walk, screenshot e25 |
| F5 | Rating an area on Your 10s during setup makes Review say "Last weekly review: today", though no review was written. | walk; `PeriodReviewTab.tsx:81` uses `lastReviewOf`, which counts a scores-only review |
| F6 | React warns "two children with the same key" every time Review opens. | reproduced twice; `PeriodReviewTab.tsx:151` (`key={reviewIdFor(period)}`) and `:218` (`key={review.id}`) are siblings with the same key |
| F7 | Values are asked three times: the same two lists on step 1 (North star) and on step 7 (Values & identity), and once more per area. Step 1 says "You put them in order later, on the review", but the ordering is on step 7, and "review" is the name of step 12. | `StarTab.tsx:201` and `NorthStarFlow.tsx:1915` render the same `ValuesWork mode="elicit"` |
| F8 | Stale words. Season: "The list of everything you want comes next", though that list was steps 4 and 5. Also "They stay in your plan until the Track step at the end, which is what puts them on your goals and tracking pages", which has been untrue since Q4. Everything says "live on the Where you are tab", but that step is called Your 10s. In the area dialog, "The goals live on the next tab" means the button beside it, and reads like a step. "from elsewhere" is unexplained. | `northStarStart.ts:357,391`; `northStar.ts:1991,2320`; `AreaGoalsDialog.tsx:214`, `AreaDialog.tsx:368` |
| F9 | Quotes are introduced as "His:" and "His way in", and nobody is named. | `northStar.ts:1023-1033` |
| F10 | The footer says "Saved on this device." on a signed-in account before anything has reached the account. | `NorthStarFlow.tsx:2293-2297` |
| F11 | Tracking's band labels the season sentence "The one thing", the old name. The step is now Season. | `SEASON_BAND_COPY.oneThingLabel`, screenshot f21 |
| F12 | The template icons 🔁 🎯 🏁 are explained only on the Season step. | walk, Where to start, ready-made sets |
| F13 | The page heading says "Life Mastery", but the tab is "Your plan". | `NorthStarFlow.tsx:1650` |
| F14 | Today asks you to rate 12 areas a day ("How today went"). Your 10s and Review ask for 0 to 10 too. That is three places for one number. | walk, Today |
| F15 | Two weekly reviews: the plan's Review, and Tracking's "Weekly Reviews" for approaches. | `/tracking`, screenshot f21 |

## Stefan's rhythm (quotes matched against `~/.cache/lm-corpus/text`)

- Weekly, re-read the plan: "this has to be a ritual that you do every week sometimes I'll do it twice a
  week if I'm down" (`8kco2rjijjE`).
- Weekly, score: "I ask myself every week where am I a scale from 0 to 10 in each area of my life"
  (`8kco2rjijjE`).
- Weekly, review before planning: "I'll first reflect on the week before before I go into planning the
  ... week ahead" (`8kco2rjijjE`).
- Daily: "I read over my vision and my goals know what I want from my life" (`eRYjsCUh848`).
- Monthly: "I'm going to read my goals that I committed to myself at the beginning of the year I'm going
  to go through each one of them one by one" (`TRGRznrMSec`).
- Yearly: "before you even decide to set your goals ... you really got to make sure that you reflect on
  the previous year you've got to debrief it" (`2fDYApReHWc`). He also says "I go over the goals that I
  achieved. I go over the goals that I didn't achieve" (`zuEb-1Ll2h8`, New Year's Eve).
- The vision is updated, not redone: "I've done it almost every year or two since" (`Lp_GOrM16Xc`).
- Reminders: "Schedule those times in advance. Put it on a calendar. Have a reminders pop up on your
  phone." (`AuRE42mCwlU`).
- Not found in the corpus: a review day of the week, a 90-day "season" of his own, a daily notification.
  The season is your idea (concept item 24, "denne sæsons fokus"), and your words win over his.

## The decisions: kept, changed, added

| ID | Before (8 Nov) | Now | Why |
|---|---|---|---|
| d1 | After Commit, open on Today | **Changed.** Open on Today once the plan has something to do (one active goal or one routine step). Otherwise open on North star, as now. | You never committed (live check), so the Commit rule would never fire for you. |
| d2 | Grid splits: Today, Track, Journal, Review on top; 8 setup steps folded | **Kept, plus a phone fold.** When the plan is in use, the cards order is Today, Review, Journal, Track, then an "Edit your plan · 8 steps" fold. The fold is closed on a use step and open on a setup step. On a phone the cards always fold into one line, "Step 10 of 12 · Today ▾". | F2: on a phone the cards are a screen and a half above every step. |
| d3 | Due-now cards, at most 3 | **Kept**, on top of Today: season ended, season ending (7 days or less), plan the new year, year, quarter, month, week, goals past their date. | F3. |
| d4 | Push at a picked day and time, default Sunday 19:00; no daily push | **Kept, narrowed.** One push a week, only for the week review, and only while it is unwritten. Off until you turn it on. Other reviews show only on Today. | Stefan: "Have a reminders pop up on your phone". One a week is the least that matches him. |
| d5 | Yearly re-walk of the whole setup with answers prefilled | **Changed.** From 26 Dec to 15 Jan, a "Year review" card. In January, once that review is written, a "Plan the new year" card links to your north star, then values, then goals. No new flow. | Stefan reviews the year, then sets new goals, and updates the vision only "every year or two". The setup steps already hold the answers. |
| d6 | Only the plan's Review gets reminders; Tracking's is left alone | **Kept.** Merging the two is R2, proposed only. | A merge is a removal. |
| d7 | Dashboard untouched | **Kept.** | The push and the Today landing reach you without it. |
| d8 | — | **Added.** Commit points onward: "Open Today →". | F4. |
| d9 | — | **Added.** The words in F5, F8 to F13 corrected, the north star shown at the top of Review, and "How today went" folded. | Walk findings and Stefan's weekly re-read. |
| d10 | — | **Added.** The Review console error fixed. | F6. |

### Proposed to remove (not built; each needs your yes by name)

- **R1.** The two value lists on step 1 (North star). They are the same block as step 7. In their place,
  step 1 would show one line: "Your values come on step 7." Reason: F7, asked twice on one walk.
- **R2.** One weekly review instead of two. Tracking's dating "Weekly Reviews" would fold into the plan's
  Review. Reason: F15, the same week asked twice. Recommendation: **not now.** Both are live and you
  have used neither yet. Revisit after a month of the reminder.
- **R3.** The Journal's "Weekly review" question set, already proposed in
  `Plans/life-plan-review-reads-back.md`. Its four questions are the Review step's boxes. Still waiting
  for your yes.

## Blockers, each tried once

| ID | What | Tried, and what came back | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | The energy-audit plan is rebuilding the same push clock right now. Its Phases 4 to 7 change `notifications_clock_tick()`, the send kinds and `public/sw.js`. | `app/api/notifications/tick/route.ts` calls only `runTimerAlertClock`. `Plans/energy-audit.md` says Phases 0 to 3 are live and Phase 5 ("The ping") is not built. Migration `20261109110000_energy_audit.sql` is live with the gate on `audit_pings_due`/`audit_ends_due`. | Phase 5 | Start Phase 5 only after energy-audit Phase 5 is live. Phase 5 step 0 says how to check. |
| B2 | Does the owner's phone get push at all? | Live read-only: `push_devices` has 1 row, "Android phone · installed app", enabled. `cron.job` has `notifications-clock`. | nothing | Not a blocker. |
| B3 | A season that has already ended cannot be made in the app ("That day has already been. Pick one that is still ahead of you."). | Tried on the Season step. To get one for the walk, I set `ends_on` in the test database with `docker exec supabase_db_daygame-tests psql`. | tests for d3 | Tests seed the season through `seedLifePlan` with `season.endsOn` in the past. If the PATCH refuses it, the test updates `life_plan_seasons.ends_on` with psql, as the walk did. |
| B4 | The browser-test database is one Docker stack shared by every session. | `node scripts/db/test-stack.mjs env` answered, the stack is up, and the stamp is `b3c611b6…`. | all phases' e2e | Follow the memory "worktree-e2e-servers": set `E2E_STACK_ENV` before Playwright. Never run `vitest.integration.config.ts` while others run e2e. |
| B5 | The owner's go, and the rewrite question. | Not checkable. | all | Asked at the top. |
| B6 | Phase 5's live migration needs the owner's yes. | Not tried. Applying it is the risky act itself. | Phase 5 | Ask once, at the start of Phase 5, with the backup ready. |

## Open questions (each recommendation is taken if you say nothing)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | When should `/plan` open on Today? | When the plan has an active goal or a routine step | After Commit only | With Commit only, you would keep landing on step 1 |
| Q2 | Default review day and time | Sunday 19:00 (the app's existing line, not Stefan's) | Monday morning | One setting to change |
| Q3 | Reorder Review to Stefan's order (scores before "Earned")? | No. Add the north star at the top and keep the rest. | Reorder | A habit built on the old order |
| Q4 | Name the coach in the quotes ("Stefan James:" instead of "His:")? | Yes | Remove the quotes (a removal, needs your yes) | Readers keep guessing who "he" is |
| Q5 | Page heading "Life Mastery" or "Your plan"? | "Your plan", the tab's name | Keep "Life Mastery" | One word |
| Q6 | Should the month, quarter and season also push to the phone? | No, they show on Today only | Push each | More pushes to switch off |
| Q7 | Fold "How today went" on Today? | Yes. Closed by default, with "N of 12 rated" on the fold. | Leave it open | Today stays long |

## Phases

Each phase is one or a few commits. Each leaves `/plan` working, goes live, and ends with screenshots on
the decision page. Write "built" or "live" in this file, never "done".

### Phase 0. Pictures before, and ground truth (no product change)

Depends on: nothing.

1. Read the page marks before you start: ArtifactData `list`, url
   https://claude.ai/artifact/Tbhg3XTAizXkLmutiUaQpp, collection `marks`.
   - Decisions, removals and questions are stored by id (`d1`…`d10`, `r1`…`r3`, `q1`…`q7`) with
     `v` = keep / change / unsure (removals: yes / no / unsure).
   - Notes on any block are in `notes: [{ text, at }]`. Blocks without an id are keyed `n-<block>`.
   - Copy every mark and note into this file under "Marks read", with its date.
   - A removal marked "yes" adds its work to Phase 4. Write the steps first, in the same style.
   - If a decision is marked "change" or "unsure", stop and report it to the owner. Build nothing that
     decision covers until he answers.
2. Make a worktree: `git worktree add --detach <scratch>/wt main`, then
   `ln -s /home/jonaswsl/projects/daygame-coach/node_modules <scratch>/wt/node_modules`.
3. Start the app against the test stack, as in the memory "worktree-e2e-servers". Port 3471,
   `NEXT_DIST_DIR=.next-walk`, `npx next dev --webpack -p 3471`. Take the three Supabase variables from
   `node scripts/db/test-stack.mjs env`, run from the main checkout.
4. Take "before" pictures with
   `TOUR_PLAN=<plan.json> TOUR_DIR=<scratch>/before TOUR_STEPS=star,today,review npx playwright test life-plan-tour --project=desktop`,
   with `E2E_STACK_ENV` and `PW_BASE_URL=http://localhost:3471` set. `<plan.json>` is
   `tests/e2e/helpers/lifePlan.ts`'s `planWithSteps([{ id: "s1", title: "Read my north star", daysPerWeek: 7 }])`
   written to a file with `node -e`. Do not use a backup of the owner's plan: the pictures go on a page.
5. Do it again at phone width. Copy `life-plan-tour.spec.ts` into the worktree as
   `life-plan-tour-phone.spec.ts`, with `setViewportSize({ width: 390, height: 844 })` in place of
   1280. Keep that copy in the worktree only (memory "worktree-e2e-servers": specs in the main
   checkout break peers' pre-commit).

**Acceptance:** `ls <scratch>/before` lists `01-star.jpg 02-today.jpg 03-review.jpg`, and the phone
folder has the same three.

### Phase 1. Land on Today when the plan is in use; Commit points onward; two Review fixes (d1, d8, d10, F5)

Depends on: Phase 0.

**1.1 The landing rule, as a pure function.** New file `src/goals/planLanding.ts`:

```ts
import type { NorthStarTabId } from "@/src/goals/types"
/** Where /plan opens when the address names no step: Today once the plan has something to do. */
export function landingStep(askedStep: string | undefined, inUse: boolean): NorthStarTabId | undefined {
  if (askedStep) return undefined // the caller handles an asked step, valid or not
  return inUse ? "today" : undefined
}
```

Test: new `tests/unit/goals/planLanding.test.ts` with three cases.
- `landingStep(undefined, true)` is `"today"`.
- `landingStep(undefined, false)` is `undefined`.
- `landingStep("review", true)` is `undefined`.

**1.2 "In use", read on the server.** In `src/db/lifePlanRepo.ts` add, after `findLifePlanId`:

```ts
/** True when the plan has something to do: one goal being worked on, or one routine step. Never throws. */
export async function planIsInUse(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    const goals = await supabase.from("life_plan_goals").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "active")
    if (!goals.error && (goals.count ?? 0) > 0) return true
    const steps = await supabase.from("life_plan_routine_steps").select("id", { count: "exact", head: true })
      .eq("user_id", userId)
    return !steps.error && (steps.count ?? 0) > 0
  } catch {
    return false
  }
}
```

Test: add a `describe("planIsInUse")` to `tests/unit/db/lifePlanRepo.test.ts`. Use the file's existing fake
(`tests/helpers/fakeSupabase.ts`, wired at the top of the test file). Read the top 40 lines first to see
how a test puts rows in a table. Write three cases:
- one `life_plan_goals` row with `status: "active"` for the user gives true;
- no goals and one `life_plan_routine_steps` row gives true;
- one goal with `status: "paused"` and no steps gives false.

Do not test the error path: the fake cannot return an error for a head count.

**1.3 The page.** In `app/(app)/plan/page.tsx`:
- Add `import { landingStep } from "@/src/goals/planLanding"` and
  `import { planIsInUse } from "@/src/db/lifePlanRepo"`. The file's other repo import is already of the
  `@/src/db/...` form.
- After `const { step } = await searchParams`, replace the `initialTab` line with:

```ts
const landed = landingStep(step, step ? false : await planIsInUse(user.id))
const initialTab = landed ?? (TAB_ORDER.includes(stepFor(step as NorthStarTabId)) ? (step as NorthStarTabId) : undefined)
```

Keep the existing comment block, and add one line to it: "No step asked: Today once the plan is in use
(Plans/life-plan-after-setup.md, d1)." Do not touch the timezone read or the other `NorthStarFlow` props.

**1.4 Commit points onward (d8).** The commit box lives inside the Everything step (`recap`). The old
Commit step folded into it, and `NorthStarFlow.tsx` around line 2099 renders `<CommitTab` inside the
recap branch.
- In `src/goals/data/northStar.ts`, find the object holding `commit: "I commit to this"` (around line
  2802). Add `openToday: "Open Today →",` after `uncommit`.
- In `src/goals/components/north-star/CommitTab.tsx`, the props are declared inline in the function
  signature. Add `onOpenToday` to the destructured list and `onOpenToday?: () => void` to the inline
  type.
- In the `<div className="flex flex-wrap items-center gap-3 mt-2.5">`, after the existing commit/uncommit
  `<button>` (the one with `ml-auto`), as its last child, add:
  `{committedOn && onOpenToday && <button onClick={onOpenToday} className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors">{COMMIT_COPY.openToday}</button>}`.
- In `NorthStarFlow.tsx`, on that `<CommitTab`, add `onOpenToday={() => setTab("today")}`.

**1.5 "Last weekly review" counts written reviews only (F5).** In `src/goals/reviewService.ts`, after
`isEmptyReview`:

```ts
/** A review someone wrote in: a word in a box, or a verdict on a goal. Scores alone come from rating an area. */
export function isWrittenReview(r: NsReview): boolean {
  return Object.keys(r.verdicts ?? {}).length > 0 || !!(r.magicMoments.trim() || r.lessons.trim() || r.nextOutcomes.trim())
}
```

and, after `lastReviewOf` (keep `lastReviewOf` exported; tests use it):

```ts
/** The written review of this kind written most recently, or null. What "Last weekly review" names. */
export function lastWrittenReviewOf(plan: NsPlan, cadence: NsReviewCadence): NsReview | null {
  return reviewsOf(plan, cadence).filter(isWrittenReview).reduce<NsReview | null>((best, r) => (!best || r.writtenOn > best.writtenOn ? r : best), null)
}
```

In `src/goals/components/north-star/PeriodReviewTab.tsx`, line 81 is
`const last = lastReviewOf(plan, period.cadence)`. Change it to `lastWrittenReviewOf(plan, period.cadence)`.
In the import list (line ~34), replace `lastReviewOf` with `lastWrittenReviewOf`: nothing else in that
file uses it.

Test: in `tests/unit/goals/reviewService.test.ts` (already imports from `@/src/goals/reviewService`), add
three cases. Build the reviews with the file's own helpers: `writeReview` on a plan, as its other cases
do. Read two existing cases first.
- A review with only a score: `isWrittenReview` is false.
- The same review plus `{ verdict: { goalId, value: "behind" } }` (a goal added with `addGoal`): true.
- `lastWrittenReviewOf` skips a newer scores-only week and returns the older week with
  `magicMoments: "x"`.

**1.6 The duplicate key (F6).** In `PeriodReviewTab.tsx`, `<EarnedInPeriod key={reviewIdFor(period)} …>`
(line ~151) and `<RemoveReview key={review.id} …>` (line ~218) are children of the same
`<div className="space-y-6">`, and `review.id === reviewIdFor(period)`. This was checked on 2026-11-09.
Change the `RemoveReview` key to `` key={`remove-${review.id}`} ``.

**1.7 Browser test.** New `tests/e2e/life-plan-landing.spec.ts`. Import `test, expect` from
`./fixtures/test`, `seedLifePlan, planWithSteps` from `./helpers/lifePlan`, and `ROUTES` from
`@/src/shared/routes`, as `life-mastery-reviews.spec.ts` does. The `account` fixture is shared by the
tests of one worker, so every test seeds its own plan first: `seedLifePlan` replaces the whole plan.
Define `const rail = (page) => page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="page"]')`.

Four tests:
- **"a plan with nothing to do opens on North star":** seed `planWithSteps([])` (one routine, no steps,
  no goals). `goto(ROUTES.plan)`, then `expect(rail(page)).toContainText("North star")`.
- **"a plan with a routine step opens on Today":** seed
  `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])`, `goto(ROUTES.plan)`, and the
  current card contains "Today".
- **"an asked step still wins":** same seed, `goto(`${ROUTES.plan}?step=review`)`, and the current card
  contains "Review".
- **"Review opens without a React key warning":**
  - Same seed.
  - Collect `page.on("console", m => m.type() === "error" && errors.push(m.text()))`.
  - `goto(`${ROUTES.plan}?step=review`)`, wait for `getByTestId("review-last")`.
  - Click `getByRole("button", { name: /^Score .+ 4 out of 10/ }).first()`.
  - Wait for "Saved to your account.", then reload and wait for `review-last` again.
  - `expect(errors.filter(e => e.includes("same key"))).toEqual([])`.
  - The worktree server is `next dev`, where React prints this warning, so the test can fail before the
    fix. Confirm that it does, by running it once before 1.6.

**Acceptance (all from the worktree, server as in Ground rules):**
- `npx vitest run tests/unit/goals/planLanding.test.ts tests/unit/goals/reviewService.test.ts tests/unit/db/lifePlanRepo.test.ts`: all pass.
- `npx playwright test life-plan-landing life-mastery mobile-life-mastery blackbox one-thing --project=desktop --output=<scratch>/pw1`: all pass. Several of these open `ROUTES.plan` with no step on a seeded plan, for example `life-mastery-day-persists.spec.ts:94,134,202`, and now land on Today.
  - If one fails because it expected North star there, change its `goto` to `?step=star`.
  - If it fails for another reason, read the failure and fix the code, not the test.
- The Ground rules' every-phase checks (full `npx vitest run`, typecheck ratchet, lint ratchet, build).

**Do not touch:** `decideOnLoad`, `planHalfAfterLoad`, the save effect, `TAB_ORDER`, `MOVED_STEPS`,
anything named on the rebuild plan's Phase 7 list.

**Pictures:** run the tour with the Phase 0 `TOUR_PLAN`, `TOUR_DIR=<scratch>/after1` and
`TOUR_STEPS=today,recap`, at desktop and with the phone copy. Put them on the page next to the Phase 0
"before".

### Phase 2. The step cards: use steps first, setup folded; one line on a phone (d2)

Depends on: Phase 1 (it uses "in use").

**2.1 Data.** In `src/goals/data/northStar.ts`, after `SCORED_TABS`:

```ts
/** The steps used every day and week once the plan is in use, in the order shown then. */
export const USE_STEPS: NorthStarTabId[] = ["today", "review", "journal", "track"]
/** The steps that build the plan: TAB_ORDER without the use steps, in TAB_ORDER's order. */
export const BUILD_STEPS: NorthStarTabId[] = TAB_ORDER.filter((t) => !USE_STEPS.includes(t))
export const RAIL_COPY = {
  editPlan: (n: number) => `Edit your plan · ${n} steps`,
  phoneToggle: (i: number, n: number, label: string) => `Step ${i} of ${n} · ${label}`,
}
```

Unit test: `tests/unit/goals/railSteps.test.ts`.
- `BUILD_STEPS.length + USE_STEPS.length === TAB_ORDER.length`.
- Every id in `TAB_ORDER` is in exactly one of the two.

**2.2 "In use" on the client.** In `src/goals/planLanding.ts` add:

```ts
import { isActive } from "@/src/goals/goalStatus"
import type { NsPlan } from "@/src/goals/types"
export function planInUse(plan: Pick<NsPlan, "goals" | "routines">): boolean {
  return plan.goals.some(isActive) || plan.routines.some((r) => r.steps.length > 0)
}
```

Add two cases to `planLanding.test.ts`: a plan with one active goal is in use, and a plan whose only goal
is `status: "paused"` and that has empty routines is not.

**2.3 The rail.** In `NorthStarFlow.tsx`, the block starting `{/* The rail. Every tab is reachable at any
time. */}` (around line 1699). Steps:
- Pull the button that renders one card out into a local function `card(id: NorthStarTabId)`. Keep the
  numbering `TAB_ORDER.indexOf(id) + 1`, so numbers never change.
- Add state: `const [railOpen, setRailOpen] = useState(false)` (phone) and
  `const [buildOpen, setBuildOpen] = useState(false)` (the fold).
- Compute `const inUse = planInUse(plan)` and
  `const showBuild = !inUse || buildOpen`.
- When the current step changes to a build step, open the fold once:
  `useEffect(() => { if (BUILD_STEPS.includes(tab)) setBuildOpen(true) }, [tab])`. The fold button can
  still close it after that.
- Render, in this order:
  1. A phone-only toggle, outside the nav:
     `<button className="sm:hidden …" aria-expanded={railOpen} onClick={() => setRailOpen(o => !o)}>{RAIL_COPY.phoneToggle(TAB_ORDER.indexOf(tab) + 1, TAB_ORDER.length, TAB_LABELS[tab])} ▾</button>`.
  2. `<nav aria-label="Sections" className={`${railOpen ? "grid" : "hidden"} sm:grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-8`}>`.
  3. Inside the nav, when `inUse`: `USE_STEPS.map(card)`, then (outside the map, still inside the nav)
     a full-width row (`col-span-full`) holding a button `aria-expanded={showBuild}`
     `onClick={() => setBuildOpen(o => !o)}` with `RAIL_COPY.editPlan(BUILD_STEPS.length)`, then
     `{showBuild && BUILD_STEPS.map(card)}`.
  4. When not `inUse`: `TAB_ORDER.map(card)`, exactly as now.
- `setTab` closes the phone rail: inside the `setTab` callback, add `setRailOpen(false)`.

**2.4 Tests.**
- `tests/e2e/life-mastery-folded-steps.spec.ts:28` expects 12 buttons in the nav. Run it first.
  - If its plan is not in use, it stays green: leave it.
  - If it is red because the plan is in use, add a click on `RAIL_COPY.editPlan(8)` before line 28, and
    change the count to 13 (12 steps plus the fold button).
- Add to `life-plan-landing.spec.ts`:
  - "a plan in use shows the use steps first and folds the rest": seed `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])`. The first four
    buttons of the nav read Today, Review, Journal, Track. "North star" is not visible. Clicking "Edit
    your plan · 8 steps" shows it.
  - "on a phone the cards fold into one line": `test.use({ viewport: { width: 390, height: 844 } })`,
    seed `planWithSteps([])` and open `?step=star`. The nav is hidden. The button "Step 1 of 12 · North star" is
    visible. Click it and the nav is visible.
- Other specs click rail cards on plans in use, for example `blackbox.spec.ts:252` (the Systems card).
  Run them all:
  `npx playwright test life-mastery life-plan blackbox one-thing --project=desktop --output=<scratch>/pw2`.
  - For each that fails because a build-step card is folded, add `await openBuildSteps(page)` before the
    click.
  - `openBuildSteps` is a new helper in `tests/e2e/helpers/lifePlan.ts`. It finds the button named
    `/^Edit your plan/` and clicks it only when it exists and has `aria-expanded="false"`.
  - Do not change what those tests assert.

**Acceptance:**
- `npx vitest run tests/unit/goals/railSteps.test.ts tests/unit/goals/planLanding.test.ts`: pass.
- The Playwright command above: all pass.
- `npx playwright test life-plan-landing mobile-life-mastery --project=phone --output=<scratch>/pw2p`: pass.
  - The phone project is an iPhone 14, so it runs WebKit. Run `npx playwright install webkit` once if
    WebKit is missing.
  - Read `playwright.config.ts:161-166` to see which files and tags the phone project picks up. If it
    does not pick up `life-plan-landing`, add `@phone` to that phone test's title, as other phone tests
    do (`grep -rn "@phone" tests/e2e | head -3`).
  - `mobile-life-mastery-day.spec.ts` opens `?step=today` with the nav now hidden. If it clicks a rail
    card, click the "Step … ▾" button first.

**Do not touch:** `TAB_ORDER`, the footer's ← / → buttons (they still walk `TAB_ORDER`),
`SCORED_TABS`, `StepDot`.

### Phase 3. Due now, on top of Today (d3, d5)

Depends on: Phase 1 (`isWrittenReview`, the landing on Today). It does not need Phase 2.

**3.1 Pure service.** New `src/goals/dueNowService.ts`.

Imports:
- `addDays` from `./oneThingService`;
- `daysBetweenDateKeys` and `dateKeyLabel` from `@/src/shared/dateUtils`;
- `periodOf`, `periodLabel`, `reviewFor`, `isWrittenReview` and the type `ReviewPeriod` from
  `./reviewService`;
- `isActive` from `./goalStatus`;
- `NsPlan` and `NorthStarTabId` from `./types`;
- `DUE_COPY` from `./data/northStar`.

Exports:

```ts
export const DEFAULT_REVIEW_DAY = 7 // ISO weekday, 7 = Sunday (Q2; the app's pick, not Stefan's)
export const DUE_MAX = 3
export type DueKind = "season-ended" | "season-ending" | "new-year" | "year" | "quarter" | "month" | "week" | "goals-passed"
export type DueGo = { tab: NorthStarTabId; period?: ReviewPeriod } | { goalId: string }
export interface DueCard { kind: DueKind; title: string; detail: string; go: DueGo }
export function isoWeekday(day: string): number
export function dueWeekPeriod(today: string, reviewDay: number): ReviewPeriod
export function dueNow(plan: NsPlan, today: string, opts: { reviewDay: number; newYearDone: boolean }): DueCard[]
```

Date maths: use exactly these expressions, and write no other date code. `today` is the account's date
key, `YYYY-MM-DD`.
- `isoWeekday(day)`: `const [y, m, d] = day.split("-").map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 ? 7 : w`.
- Day of month: `Number(today.slice(8, 10))`. Month: `Number(today.slice(5, 7))`.
- This period of kind `c`: `periodOf(c, today)`. The one before it: `periodOf(c, addDays(periodOf(c, today).start, -1))`.
- Last day of its period: `periodOf(c, today).end === today`.
- Within the first N days of a quarter: `daysBetweenDateKeys(periodOf("quarter", today).start, today) < N`.
- "Written": `const r = reviewFor(plan, p); r !== null && isWrittenReview(r)`.

The rules, each giving at most one card:
- **week:**
  - `D = addDays(today, -((isoWeekday(today) - reviewDay + 7) % 7))`, the latest review day on or
    before today.
  - `dueWeekPeriod` is `periodOf("week", D)` when `reviewDay === 7`, else
    `periodOf("week", addDays(D, -7))`. Weeks run Monday to Sunday. On a Sunday review day you review the
    week that ends that day. On any other review day you review the last full week before it. This is on
    purpose: do not "fix" it.
  - Card when `p` is not written: `DUE_COPY.week(periodLabel(p))`, go `{ tab: "review", period: p }`.
- **month:**
  - On days 1 to 7 of a month, `p` is the previous month. On the last day of a month, `p` is this month.
  - Card when not written: `DUE_COPY.month(periodLabel(p))`, go `{ tab: "review", period: p }`.
- **quarter:**
  - Within the first 14 days of a quarter, `p` is the previous quarter. On a quarter's last day, `p` is
    this quarter.
  - Card when not written: `DUE_COPY.quarter(periodLabel(p))`, go `{ tab: "review", period: p }`.
- **year:**
  - From 26 to 31 December (month 12, day 26 or more), `p` is this year.
  - From 1 to 15 January (month 1, day 15 or less), `p` is the previous year.
  - Card when not written: `DUE_COPY.year(today in January ? previous year number : this year number)`,
    go `{ tab: "review", period: p }`.
- **new-year:** in January, when the previous year's year period is written and `!opts.newYearDone`.
  `DUE_COPY.newYear`, go `{ tab: "star" }`.
- **season:** `const s = plan.season`. Only when `s !== null`, `s.sentence.trim() !== ""` and
  `s.endsOn !== null`. A season with no end ("until I say so") never gives a card.
  `const left = daysBetweenDateKeys(today, s.endsOn)`.
  - `left < 0`: kind `"season-ended"`, `DUE_COPY.seasonEnded(dateKeyLabel(s.endsOn))`, go
    `{ tab: "focus" }`.
  - `0 <= left <= 7`: kind `"season-ending"`, `DUE_COPY.seasonEnding(left)`, go `{ tab: "focus" }`.
  - Check what `dateKeyLabel`'s second argument does in `src/shared/dateUtils.ts`. Call it with
    `{ day: "numeric", month: "short" }`.
- **goals-passed:** `const passed = plan.goals.filter((g) => isActive(g) && g.targetDate !== null && g.targetDate < today)`.
  When `passed.length > 0`, one card: `DUE_COPY.goalsPassed(passed.length, passed.slice(0, 2).map((g) => g.title))`,
  go `{ goalId: passed[0].id }`.
- **Order, then cut:** season-ended, season-ending, new-year, year, quarter, month, week, goals-passed.
  Then `.slice(0, DUE_MAX)`.

`DUE_COPY` goes in `src/goals/data/northStar.ts`, right after `REVIEW_PERIOD_COPY`. Each entry returns
`{ title: string; detail: string }`:

```ts
export const DUE_COPY = {
  heading: "Due now",
  done: "Done",
  week: (period: string) => ({ title: "Weekly review", detail: `Look back at ${period}.` }),
  month: (period: string) => ({ title: "Monthly review", detail: `Go through ${period}, goal by goal.` }),
  quarter: (period: string) => ({ title: "Quarterly review", detail: `Look back at ${period}, then set the next one.` }),
  year: (year: string) => ({ title: "Year review", detail: `Look back over ${year} before you set next year's goals.` }),
  newYear: { title: "Plan the new year", detail: "Read your north star and values again, then set this year's goals." },
  seasonEnded: (date: string) => ({ title: "Your season is over", detail: `It ran until ${date}. Review it, then write the next one.` }),
  seasonEnding: (days: number) => ({
    title: days === 0 ? "Your season ends today" : days === 1 ? "Your season ends tomorrow" : `Your season ends in ${days} days`,
    detail: "Look back at it and decide the next one before it runs out.",
  }),
  goalsPassed: (n: number, titles: string[]) => ({
    title: `${n} ${n === 1 ? "goal" : "goals"} passed ${n === 1 ? "its" : "their"} date`,
    detail: `${titles.join(", ")}${n > titles.length ? " and more" : ""}. Mark it achieved, move the date, pause or drop it.`,
  }),
}
```

Test: new `tests/unit/goals/dueNowService.test.ts`.
- Build plans with `emptyNsPlan()`, `addGoal(plan, areaId, title, type)` and `updateGoal` from
  `@/src/goals/northStarService`. `tests/unit/goals/countsAndPacing.test.ts:21-31` shows the pattern.
  Use an area id from `emptyNsPlan().areas[0].id`.
- Write reviews with `writeReview(plan, periodOf(...), { magicMoments: "x" }, today)` from
  `@/src/goals/reviewService`.
- Set the season with `{ ...plan, season: { id: "s1", startedOn: "2026-08-01", endsOn: <date>, sentence: "Get fit" } }`.
- Assert the exact list of kinds, in order, for each row.

2026-11-09 is a Monday.

| today | plan | reviewDay | expected kinds |
|---|---|---|---|
| 2026-11-15 (Sun) | empty | 7 | `["week"]`, period 9 – 15 Nov |
| 2026-11-16 (Mon) | empty | 7 | `["week"]`, period 9 – 15 Nov |
| 2026-11-16 | week 9 – 15 Nov written | 7 | `[]` |
| 2026-11-16 | week 9 – 15 Nov with one score only (`{ score: { areaId, value: 4 } }`) | 7 | `["week"]` |
| 2026-11-18 (Wed) | empty | 3 | `["week"]`, period 9 – 15 Nov |
| 2026-11-30 (Mon) | empty | 7 | `["month", "week"]`, month November, week 23 – 29 Nov |
| 2026-12-01 (Tue) | empty | 7 | `["month", "week"]`, month November |
| 2026-12-28 (Mon) | empty | 7 | `["year", "week"]` |
| 2027-01-05 (Tue) | year 2026 written | 7 | `["new-year", "quarter", "month"]` |
| 2027-01-05 | year 2026 written, `newYearDone: true` | 7 | `["quarter", "month", "week"]` |
| 2027-01-05 | season ending 2027-01-01, nothing written | 7 | `["season-ended", "year", "quarter"]` |
| 2026-11-18 | week 9 – 15 Nov written, season ending 2026-11-15 | 7 | `["season-ended"]` |
| 2026-11-18 | week 9 – 15 Nov written, season ending 2026-11-25 | 7 | `["season-ending"]`, title "Your season ends in 7 days" |
| 2026-11-18 | week 9 – 15 Nov written, season with `endsOn: null` | 7 | `[]` |
| 2026-11-18 | week 9 – 15 Nov written; 2 goals with `targetDate: "2026-11-01"`; 1 more with that date and `status: "paused"` | 7 | `["goals-passed"]`, title "2 goals passed their date" |

**3.2 Open the Review on a given period.**
- `reviewService.ts`: add
  `export function parsePeriodParam(s: string | undefined): ReviewPeriod | null`.
  - Match `/^(week|month|quarter|year)-(\d{4}-\d{2}-\d{2})$/` and cast the cadence to
    `OfferedCadence`.
  - Then, inside `try { … } catch { return null }`, compute `p = periodOf(cadence, start)`. `periodOf`
    throws on a day like `2026-02-31`.
  - Return `p` only when `p.start === start`, else `null`.
  - Unit test cases:
    - `"week-2026-11-09"` returns 9 – 15 Nov;
    - `"week-2026-11-10"` is null;
    - `"week-2026-02-31"` is null and does not throw;
    - `"fortnight-2026-11-09"` is null;
    - `undefined` is null.
- `PeriodReviewTab.tsx`: add `initialPeriod?: ReviewPeriod | null` to the props, and change line ~76 to
  `useState<ReviewPeriod>(() => initialPeriod ?? periodOf("week", today))`.
- `NorthStarFlow.tsx`:
  - Add the prop `initialPeriod?: ReviewPeriod | null` next to `initialTab`, and the state
    `const [reviewPeriod, setReviewPeriod] = useState<ReviewPeriod | null>(initialPeriod ?? null)`.
  - On `<PeriodReviewTab`, pass `initialPeriod={reviewPeriod}` and
    `key={reviewPeriod ? reviewIdFor(reviewPeriod) : "now"}`.
  - **A card's period is used once.** In the rail button's `onClick={() => setTab(id)}` and in the
    footer's two `onClick={() => setTab(TAB_ORDER[...])}` buttons, call `setReviewPeriod(null)` first.
    Opening Review from the rail then shows the current week again.
- `app/(app)/plan/page.tsx`:
  - Widen the `searchParams` type to `Promise<{ step?: string; period?: string }>`.
  - Read `const { step, period } = await searchParams`.
  - Pass `initialPeriod={parsePeriodParam(period)}` to `NorthStarFlow`.
  - Links that name a period always also say `step=review`, for example
    `/plan?step=review&period=week-2026-11-09`.
  - An asked step bypasses Phase 1's landing rule.

**3.3 The cards.** New `src/goals/components/north-star/DueNow.tsx`.
- Props: `{ cards: DueCard[]; onGo: (c: DueCard) => void; onNewYearDone: () => void }`. With no cards,
  render `null`.
- Otherwise render
  `<section data-testid="due-now" className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">`
  holding an `h2` with `DUE_COPY.heading` (`text-sm font-semibold text-violet-100`).
- Then a `<ul className="mt-3 space-y-2">` with one `<li data-testid={`due-${c.kind}`} className="flex items-center gap-2">` per card. Each `li` holds two sibling buttons, never nested:
  - a `flex-1 text-left` button calling `onGo(c)`, showing `c.title` (`block text-[13px] text-zinc-100`)
    and `c.detail` (`block text-[11.5px] text-zinc-400`);
  - for `c.kind === "new-year"` only, a small button `DUE_COPY.done` calling `onNewYearDone`.

**3.4 Wire it in `NorthStarFlow.tsx`.**
- **Extract the goal opener.** The `tab === "today"` branch passes TodayTab an inline
  `onOpenGoal={(goalId) => { … goTo(…, { label: goal.title, tickId: null, back: "today" }) }}` (around
  line 2010). Move that body into a `const openGoalFromToday = (goalId: string) => { … }` declared just
  before the `return (` of the component. Pass `onOpenGoal={openGoalFromToday}`, with no behaviour
  change.
- **New-year "Done".** Add state `const [newYearDone, setNewYearDone] = useState(false)`, and a new
  effect keyed on `[userId, today]`:
  `if (!today) return; try { setNewYearDone(window.localStorage.getItem(`plan-new-year-done:${userId}:${today.slice(0, 4)}`) === "1") } catch { setNewYearDone(false) }`.
- **The cards.** In the `tab === "today"` branch, wrap the existing `<TodayTab …/>` as
  `<div className="space-y-5">{today && <DueNow cards={dueNow(plan, today, { reviewDay: DEFAULT_REVIEW_DAY, newYearDone })} onGo={onDueGo} onNewYearDone={onNewYearDone} />}<TodayTab …/></div>`.
  Use `today`, the account's day, and never `ns.todayISO()`, which is the browser's.
- `onDueGo(c)`, declared next to `openGoalFromToday`:
  `if ("goalId" in c.go) { openGoalFromToday(c.go.goalId); return } setReviewPeriod(c.go.period ?? null); setTab(c.go.tab)`.
  `setTab` writes `?step=` to the address and drops `period`. That is intended: the period lives in
  state from here.
- `onNewYearDone`:
  `try { window.localStorage.setItem(`plan-new-year-done:${userId}:${(today ?? "").slice(0, 4)}`, "1") } catch {} setNewYearDone(true)`.

**3.5 Browser test.** New `tests/e2e/life-plan-due-now.spec.ts`.
- Use the `accountTimezone` fixture: `test("…", async ({ page, account, accountTimezone }) => …)`. The
  default is `Europe/Copenhagen`, `tests/e2e/fixtures/test.ts:199`. Compute
  `const today = getTodayInTimezone(accountTimezone)` with `getTodayInTimezone` from
  `@/src/shared/dateUtils`.
- Compute what the page should show with the same functions: `normalizeNsPlan(seed)` from
  `@/src/goals/northStarService`, then `dueNow(normalized, today, { reviewDay: 7, newYearDone: false })`.
  This keeps the test right on any calendar day.

Two tests:
- **"the cards are the service's, and a review card goes once written":**
  - Seed `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])`. `goto(ROUTES.plan)`, which
    lands on Today (Phase 1).
  - Expect `getByTestId("due-now").locator("li")` test ids to equal the expected kinds, prefixed
    `due-`.
  - Take the first expected card whose `go` has a `period`. Click its title button.
  - Expect `getByTestId("review-period")` to have text `periodLabel(card.go.period)`.
  - Fill `page.getByLabel("Magic moments")` with "a good week". This is the label
    `life-mastery-reviews.spec.ts:56` uses. Press Tab and wait for "Saved to your account.".
  - `goto(`${ROUTES.plan}?step=today`)` and expect `due-${card.kind}` to have count 0.
- **"an ended season comes first":**
  - Seed the same plan plus
    `season: { id: "s1", startedOn: addDays(today, -40), endsOn: addDays(today, -3), sentence: "Get fit" }`
    (`addDays` from `@/src/goals/oneThingService`). The mapper and the table accept a past end:
    `ends_on >= started_on` is the only check, in migration `20261104140000_one_season.sql`.
  - `goto(ROUTES.plan)` and expect the first `li` in `due-now` to have test id `due-season-ended`.

**Acceptance:**
- `npx vitest run tests/unit/goals/dueNowService.test.ts tests/unit/goals/reviewService.test.ts`: pass.
- `npx playwright test life-plan life-mastery mobile-life-mastery --project=desktop --output=<scratch>/pw3`: pass. The cards now sit above Today for every spec that opens Today.
  - If a spec fails because a text match such as "Review" now finds two elements, scope its locator to
    the Today section: `page.locator("section", { hasText: <the date heading> })`.
  - Do not change what it asserts.
- The Ground rules' every-phase checks.

**Do not touch:** `TodayTab.tsx` (the cards sit above it, in `NorthStarFlow`), `SeasonBand.tsx`,
Tracking, the Dashboard (d6, d7).

### Phase 4. Words, the north star in Review, and Today's ratings folded (d9)

Depends on: Phase 1. Copy changes only, plus two small blocks. Each line below is an exact replacement.
Run `grep -rn "<old text>" src tests` first, and change every test that asserts the old text.

| Where | Old | New |
|---|---|---|
| `src/goals/data/northStarStart.ts:357` (`ONE_COPY.intro`, now shown on the Season step) | "One step, one sentence. The list of everything you want comes next, and it goes better once this is decided — a plan that is a list of everything is a plan nobody runs." | "One step, one sentence. A plan that is a list of everything is a plan nobody runs, so say first what this season is for." |
| `src/goals/data/northStarStart.ts:391` | "One line each. These are not notes — each becomes a real goal, filed in the area it belongs to. They stay in your plan until the Track step at the end, which is what puts them on your goals and tracking pages." | "One line each. These are not notes — each becomes a real goal, filed in the area it belongs to, and Today shows it." |
| `src/goals/data/northStar.ts:1070` (`VALUES_INTRO.help`, shown on step 1 and step 7) | "…You put them in order later, on the review, once you have seen where you stand." | "…You put them in order in the Values & identity step, after you have rated your areas." |
| `src/goals/data/northStar.ts:1991` | "The ratings and the 10s live on the Where you are tab." | "The ratings and the 10s live on the Your 10s step." |
| `src/goals/data/northStar.ts:2320` (`AREA_REVIEW_COPY.toGoalsHelp`, beside the "Write the goals for …" button) | "The goals live on the next tab. This one is the picture they are aimed at." | "Write the goals with the button beside this. This is the picture they are aimed at." |
| `src/goals/components/north-star/AreaGoalsDialog.tsx:214` and `AreaDialog.tsx:368` | `" · from elsewhere"` | `" · from another area"` (both) |
| `src/goals/data/northStar.ts:2068` | "Nothing from elsewhere reaches this area yet." | "Nothing from another area reaches this area yet." |
| `src/goals/data/northStar.ts:1023` | "His way in:" | "Stefan James's way in:" (Q4) |
| `src/goals/data/northStar.ts:1025,1033` | "His: “" | "Stefan James: “" (Q4) |
| `src/goals/data/northStar.ts:1031` | "His own list is short" | "Stefan James's own list is short" (Q4) |
| `src/goals/data/northStar.ts`, `SEASON_BAND_COPY.oneThingLabel` | "The one thing" | "Your season" |
| `NorthStarFlow.tsx:1650` | `Life Mastery` (the h1) | `Your plan` (Q5) |

**4.1 The footer (F10).** In `NorthStarFlow.tsx`, in the expression ending
`: "Saved on this device."` (around line 2297), add one branch before the last one:
`: serverState === "unknown" && !unsent ? "Saves to your account as you write."`. Find how
`serverState` is typed (`grep -n "useState<.*SyncState\|serverState" NorthStarFlow.tsx | head`). Use the
literal `"unknown"` only if it is one of that type's members. If it is not, use the member that
`decision.kind === "start-empty"` sets (line ~788: `setServerState("unknown")`).

**4.2 The icons (F12).**
- In `src/goals/data/northStarBuild.ts`, in the object holding `goalsLabel: "Goal sets"`, add
  `kindsLegend: "🔁 practice · 🎯 target · 🏁 finish line"`.
- In `BuildBoard.tsx:313`, right after the `<p>` that renders `{BOARD_COPY.goalsLabel}`, add
  `<p className="text-[10.5px] text-zinc-500 mt-0.5">{BOARD_COPY.kindsLegend}</p>`.

**4.3 The north star at the top of Review.**
- In `PeriodReviewTab.tsx`, inside the first card (the one holding `COPY.title`), after the
  `review-last` paragraph, render this when `plan.northStar.trim()` is not empty:
  `<blockquote data-testid="review-north-star" className="mt-3 border-l-2 border-violet-400/40 pl-3 text-[12.5px] text-zinc-300 whitespace-pre-wrap">{plan.northStar.trim()}</blockquote>`.
- Under it, add `<p className="text-[11px] text-zinc-500 mt-1">{COPY.readStarFirst}</p>`.
- Add `readStarFirst: "Read it once before you look back."` to `REVIEW_PERIOD_COPY` (`northStar.ts:611`).

**4.4 Fold "How today went" (Q7, F14).**
- In `TodayTab.tsx`, the section whose `h2` is `{TODAY_COPY.feltTitle}` (around line 1470): add
  `const [feltOpen, setFeltOpen] = useState(false)` at the top of `TodayTab`.
- Turn the `h2` row into a button with `aria-expanded={feltOpen}`. It shows `TODAY_COPY.feltTitle` and
  `TODAY_COPY.feltCount(rated, plan.areas.length)`, where `rated` counts the areas that have a score for
  `today`. Read how `ScoreRow` gets its current value in that section and count the same way.
- Render the help line and the score grid only when `feltOpen`.
- Add `feltCount: (n: number, of: number) => `${n} of ${of} rated`` to `TODAY_COPY`.
- Nothing is removed: the rows stay, closed.

**Tests:**
- Update every unit or e2e assertion on the old strings (the grep above).
- Add to `life-plan-landing.spec.ts`: "Review shows the north star". Seed a plan with
  `northStar: "A calm, strong life."`, open `?step=review`, and expect `review-north-star` to contain
  "A calm, strong life."
- Add: "How today went starts folded". Open Today on the seeded plan. The button "How today went"
  shows `aria-expanded="false"`, and no button named `/today: \d+ out of 10/` is visible. Today's rating
  buttons are labelled `` `${label} today: ${n} out of 10` `` (`TodayTab.tsx` ~1480); check the label
  before writing the regex.
- Existing e2e that rate on Today get a click on "How today went" first. Find them with
  `grep -rn "today: \|How today went" tests/e2e`. Known: `life-mastery-track.spec.ts:213,223`.

**Acceptance:**
- `npx vitest run tests/unit/goals`: pass.
- `npx playwright test life-mastery life-plan blackbox --project=desktop --output=<scratch>/pw4`: pass.
- The Ground rules' every-phase checks.

**Do not touch:** R1, R2 and R3. The value lists on step 1, the Journal's weekly set and Tracking's
weekly reviews all stay.

### Phase 5. One weekly reminder on the phone (d4)

Depends on: Phases 1 to 3 live (`isWrittenReview`, `dueWeekPeriod` in `src/goals/dueNowService.ts`,
`parsePeriodParam` and `?step=review&period=`). Energy-audit Phase 5 must also be live (B1). Needs the
owner's yes for the live database (B6).

**Decided here: one device switch.** `push_devices.enabled` is the device's switch for reminders
(`notificationsRepo.ts`: "Reminders and tests go to devices with reminders on"). The audit's pings and
this weekly reminder share it. A person who switches a device off gets neither. This phase adds no
second device switch. Its own on/off lives in `life_plan_reminders.push_on`.

**5.0 Check B1.**
- Run `grep -n "runAuditPingClock" app/api/notifications/tick/route.ts`. With no hit, stop, and write
  "Phase 5 waiting for energy-audit Phase 5" in this file's status line.
- With a hit, check that the live database has the audit's functions: from the linked scratch folder
  (memory "live-db-backup-method"), run
  `supabase db query --linked "select count(*) from pg_proc where proname in ('audit_pings_due','audit_ends_due')"`.
  The answer must be 2. If it is not, stop as above.
- Then read `src/audit/pingService.ts` for three things only:
  - how it wraps each row in try/catch;
  - which `PushPayload` fields it sets;
  - how the tick route calls it and names its key in the response.

  Copy those three. Copy nothing else, and none of its `actions` or `promptId`.

**5.1 Migration** `supabase/migrations/<yyyymmddhhmmss>_plan_review_reminder.sql`, plus
`supabase/migrations/rollback/<same>_plan_review_reminder.down.sql`.

```sql
create table if not exists public.life_plan_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_on boolean not null default false,
  review_day smallint not null default 7 check (review_day between 1 and 7),
  review_hour smallint not null default 19 check (review_hour between 0 and 23),
  updated_at timestamptz not null default now()
);
alter table public.life_plan_reminders enable row level security;
create policy "own reminder row" on public.life_plan_reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_plan_reminders from anon;
revoke truncate on public.life_plan_reminders from authenticated;

-- The kind list: re-read the newest definition first
-- (grep -ln "notification_sends_kind_check" supabase/migrations/*.sql | sort | tail -1).
-- On 2026-11-09 it was ('test','timetrack-running','timetrack-alert','audit-ping','audit-end').
-- Use that newest list plus 'plan-review'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end', 'plan-review'));
create unique index if not exists notification_sends_one_plan_review
  on public.notification_sends (entry_id) where kind = 'plan-review';

-- Weekly reminders due at p_now: the person's chosen weekday and hour, in their zone, first 20 minutes.
create or replace function public.plan_reviews_due(p_limit integer, p_now timestamptz default now())
returns table (user_id uuid, local_day date, review_day smallint)
language sql stable security definer set search_path = ''
as $$
  select r.user_id, (p_now at time zone z.tz)::date, r.review_day
    from public.life_plan_reminders as r
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
   where r.push_on
     and extract(isodow from p_now at time zone z.tz) = r.review_day
     and extract(hour from p_now at time zone z.tz) = r.review_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'plan-review'
          and s.entry_id = 'plan-review:' || r.user_id::text || ':' || ((p_now at time zone z.tz)::date)::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.plan_reviews_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_reviews_due(integer, timestamptz) to service_role;
```

Then redefine `public.notifications_clock_tick()`.
- Paste the newest definition whole. Find it with
  `grep -iln "function public.notifications_clock_tick" supabase/migrations/*.sql | sort | tail -1`;
  use `-i`, because one older file writes it in capitals.
- Change only its gate line: add `and not exists (select 1 from public.plan_reviews_due(1))` inside the
  same `if not exists … then return null; end if;`.
- Keep its `revoke` line.
- End the migration with `notify pgrst, 'reload schema';`.

The rollback file. Its header, in capitals: "DELETES REMINDER SETTINGS AND THEIR SEND RECORDS". Then,
in this order:
1. The previous `notifications_clock_tick()` definition, pasted whole, with its revoke.
2. `drop function if exists public.plan_reviews_due(integer, timestamptz);`
3. `drop index if exists public.notification_sends_one_plan_review;`
4. `delete from public.notification_sends where kind = 'plan-review';`
5. Drop and re-add `notification_sends_kind_check` with the previous list, written out literally.
6. `drop table if exists public.life_plan_reminders;`
7. `notify pgrst, 'reload schema';`

Run the migration, then the rollback, then the migration again, on the local test database:
`docker exec -i supabase_db_daygame-tests psql -U postgres < <file>`. Do this only when no other
session's e2e is running (B4). Each must finish without error.

**5.2 Server.**
- In `src/goals/reviewService.ts`, change `isWrittenReview`'s parameter type to
  `Pick<NsReview, "magicMoments" | "lessons" | "nextOutcomes" | "verdicts">`, so rows from the database
  can be judged by the same rule. Do not copy the rule anywhere.
- In `src/db/notificationsRepo.ts`:
  - add `"plan-review"` to `SendKind`;
  - add it to the first `openSend` overload's `Exclude<…>`;
  - add it to the `23505` branch, so a duplicate answers null.
- `src/notifications/pushService.ts` needs no change. Its private `topicOf(kind)` returns the kind
  itself for every non-timer kind, so `"plan-review"` gets its own topic and never replaces an audit
  ping.
- New `src/db/lifePlanRemindersRepo.ts`:
  - `readReminder(userId)` uses `createServerSupabaseClient()`, the signed-in client, so row security
    guards it. It returns `{ pushOn, reviewDay, reviewHour }` from the row, or the defaults
    `{ pushOn: false, reviewDay: 7, reviewHour: 19 }`.
  - `writeReminder(userId, patch: { pushOn?: boolean; reviewDay?: number; reviewHour?: number })` uses
    the signed-in client. It upserts `{ user_id: userId, push_on, review_day, review_hour, updated_at: new Date().toISOString() }`
    with `onConflict: "user_id"`. It takes only those three fields and never a `user_id` from a body.
  - `remindersDueAsServer(limit)` uses `createAdminSupabaseClient()` and
    `.rpc("plan_reviews_due", { p_limit: limit })`, as `timerAlertsDueAsServer` does.
  - `weekReviewWrittenAsServer(userId, periodStart)` uses the admin client:
    - `select id, magic_moments, lessons, next_outcomes from life_plan_reviews where user_id = … and cadence = 'week' and period_start = …`,
      as a list, never `.single()`;
    - then `select review_id from life_plan_review_goals where review_id in (…ids)`;
    - it returns true when any row passes `isWrittenReview({ magicMoments, lessons, nextOutcomes, verdicts })`,
      with `verdicts` built from that row's goal rows.
  - Classify each new write function in the write-coverage ratchet (`tests/support/writeCoverage.baseline.json`,
    `.claude/rules/testing.md`).
- New `app/api/life-plan/reminders/route.ts`:
  - `GET` and `PUT`. Both start with `requireAuth()`, as `app/api/timetrack/stop/route.ts` does.
  - PUT copies that file's `fromAnotherSite` check, gives 403 when it is true, and gives 415 when the
    body is not JSON.
  - PUT accepts only `pushOn` (boolean), `reviewDay` (integer 1–7) and `reviewHour` (integer 0–23).
    Any other key, or a wrong type, is a 400.
  - Both answer with `Cache-Control: no-store`.
  - Run `tests/unit/**/routeList*.test.ts` (`grep -rln "routeList" tests/unit`) and add the new route
    where that test lists API routes.
- New `src/goals/reviewReminderService.ts`, `export async function runPlanReviewClock(now = new Date())`.
  For each row of `remindersDueAsServer(200)`, inside its own try/catch (log the user id only):
  1. `const p = dueWeekPeriod(row.local_day, row.review_day)`.
  2. `const entryId = `plan-review:${row.user_id}:${row.local_day}``. It must equal the SQL's id,
     character for character.
  3. If `await weekReviewWrittenAsServer(row.user_id, p.start)`:
     - `const id = await openSend(row.user_id, "plan-review", now, entryId)`;
     - if `id` is not null, `await closeSend(id, { devices: 0, delivered: 0, removed: 0 })`;
     - if `id` is null, another tick won the race, and there is nothing to do.
     This records "written, nothing to send", so the clock stops asking this week.
  4. Else call only
     `await sendToPerson(row.user_id, "plan-review", () => payload, now, { entryId })`.
     **Never call `openSend` first:** `sendToPerson` opens the record itself (`pushService.ts:148-149`),
     and a second record with the same `entryId` is refused, so nothing would be sent. A delivery that
     fails is not retried that week. That is accepted.
  5. The payload:

     ```ts
     { title: "Weekly review", body: `Look back at ${periodLabel(p)}: score, magic moments, next week.`,
       url: `/plan?step=review&period=${reviewIdFor(p)}`, tag: "plan-review", renotify: false }
     ```

     Set no `actions`, `kind`, `promptId`, `slotAt` or `sendId`. The tag is required: without it the
     worker (`public/sw.js`, the `showNotification` call around lines 283–290) shows it under
     `audit-ping` with the audit's title. The body holds no text the user wrote.
  6. Return `{ sent, skipped, failed }` counts.
- Wire it in `app/api/notifications/tick/route.ts` next to the audit's call, with its own `.catch`, under
  the response key `planReviews`.

**5.3 Screen.**
- New `src/goals/components/north-star/ReviewReminder.tsx`. Render it in `PeriodReviewTab.tsx` right
  after the first card, the `<div>` holding `{COPY.title}` and `review-last`.
- Its content:
  - a heading, "Remind me on my phone";
  - a switch, a `<button role="switch" aria-checked>`;
  - a weekday `<select>` with options Monday to Sunday, values 1 to 7;
  - an hour `<select>`, 06:00 to 22:00, values 6 to 22.
- Behaviour:
  - It loads with GET and saves each change with PUT.
  - Its status line reads "Saved to your account." after a 200. On failure it shows
    "Not saved. Try again." and keeps the choice on screen.
  - All words go in a `REVIEW_REMINDER_COPY` object in `src/goals/data/northStar.ts`, next to
    `REVIEW_PERIOD_COPY`.
- When the switch is on and `usePushDevice()` (`src/notifications/hooks/usePushDevice.ts`) shows no
  enabled device on this phone, render `PushDeviceCard` (`src/notifications/components/PushDeviceCard.tsx`).
  - Pass `push` = the hook's state, `featureOn` = true, `silent` = false.
  - Pass `words` = a new `REVIEW_REMINDER_PUSH_WORDS` object. It fills every `PushDeviceWords` field in
    plain words about "notifications", never "audit" or "pings".
  - Wire `onTurnOn` and `onOpenSettings` to the hook the way energy-audit Phase 5 does on `/audit`. Find
    it with `grep -rn "PushDeviceCard" app src`. If it is still unused anywhere, follow
    `RunningTimerSetting.tsx` (its use of `usePushDevice`, around line 53).
- In `NorthStarFlow.tsx`, fetch the setting once after `decision` is set (GET), and keep
  `reviewDay` in state. Pass `reviewDay` to `dueNow(...)` in place of `DEFAULT_REVIEW_DAY`. While it
  loads, and on failure, use `DEFAULT_REVIEW_DAY`.

**5.4 Tests.**
- **Integration**, `tests/integration/repos/lifePlanReminders.integration.test.ts`. Use the helpers the
  other files in `tests/integration/repos/` use: read `pushPlumbing.integration.test.ts` for the fake
  vault keys and the fake `web-push`. Run it only when no other session's e2e or soak is using the test
  database (B4). Cases:
  - another account cannot read or write a row (signed-in client), and `anon` cannot read;
  - `plan_reviews_due(10, <instant>)` returns the person at their weekday and hour in their zone. Use a
    fixed `p_now` per case, and filter the result to the test's own user ids, because other tests'
    rows exist;
  - it does not return the person one hour later, at minute 20, with `push_on` false, or with no
    enabled device;
  - two `runPlanReviewClock` calls at the same instant send once;
  - a written week sends nothing and leaves one `plan-review` row with `devices = 0`;
  - a payload, built while the review holds the marker `ZZMARK` in all three texts and in a goal
    title, does not contain `ZZMARK` (`JSON.stringify` of what the fake `web-push` received).
- **Unit**, `tests/unit/goals/remindersRoute.test.ts`: 400 for each bad body, 403 from another site,
  415 for a non-JSON body. Mock the repo the way other route unit tests in `tests/unit` do
  (`grep -rln "requireAuth" tests/unit | head -3`).
- **Unit**, add one case to `tests/unit/shared/serviceWorkerPush.test.ts`: a payload with
  `tag: "plan-review"` and `title: "Weekly review"` is shown with that tag and title.
- **Playwright**, add to `life-plan-landing.spec.ts`: switch the reminder on, pick Monday 08:00,
  reload, and expect the same values.
- **Worker**, the way energy-audit Phase 5 step 6 does it:
  - a production build in the worktree against the test stack;
  - open `/plan?step=review` with the `notifications` permission granted;
  - deliver the payload through CDP, then check `registration.getNotifications()` for the title and
    tag.
  - If headless Chromium refuses, record "not proven".

**5.5 Live.** Before step 4, a security review by a subagent on the explicit commit range of this
phase. Give it the diff and the migration, not this plan's conclusions. Then, in this order:
1. The owner's yes, asked once, in plain words: "one small table for your reminder time, one clock
   check, backup first".
2. Back up the owner's `push_devices` and `notification_sends` rows (memory "live-db-backup-method",
   `json_agg`) to `~/dg-backups/`, `chmod 600`. They hold device keys. Never put them in the repo.
3. `supabase migration list --linked`: only this migration is pending. If energy-audit's migration is
   also pending, stop and ask that session.
4. `supabase db push --linked --yes`.
5. Push the code. The order is safe, because `push_on` defaults to false: nothing is sent until the
   owner switches it on in the new build. To roll back: the code first, then the down file.
6. Check, read-only: `select count(*) from pg_proc where proname = 'plan_reviews_due'` is 1. The cron
   job `notifications-clock` still shows `succeeded` in `cron.job_run_details` for its last runs.

**Do not touch:** the audit's and the timer's functions, apart from pasting the clock function whole
with one line changed; `public/sw.js`; the device switch's meaning.

## Ground rules for the session that builds it

- Build in a worktree on a branch (`git worktree add -b after-setup-p<N> <scratch>/wt main`, symlink
  `node_modules`). Ship by rebasing onto local `main` in a detached "ship" worktree, then
  `npx vitest run`, then `git merge --ff-only <sha>` in the shared checkout and `git push origin main`.
- Commit with `git commit --only <paths>`. Never `git add -A`, never `git stash`. `next dev` rewrites
  `tsconfig.json` and adds `AGENTS.md`: revert both before committing.
- Before each push, run `node scripts/typecheck-ratchet.mjs`, `npm run lint:ratchet` and
  `npm run build` (keep `--webpack`). Lint changed files directly if the ratchet trips on other
  worktrees.
- **Every phase's acceptance also includes:**
  - the full `npx vitest run` (the pre-commit runs it too);
  - `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet`, both exit 0;
  - `npm run build` exits 0.
  Never raise a ratchet baseline to get past your own failure. Read `docs/testing_behavior.md` before
  writing tests. A new database write function must be classified in
  `tests/support/writeCoverage.baseline.json`'s ratchet (see `.claude/rules/testing.md`).
- **Running the app and Playwright from the worktree:**
  1. From the main checkout, run `node scripts/db/test-stack.mjs env` once. Keep the JSON it prints.
  2. Start the server in the worktree:
     `NEXT_PUBLIC_SUPABASE_URL=<API_URL> NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> NEXT_DIST_DIR=.next-after npx next dev --webpack -p 3471`.
     Never with `.env.local`. Turbopack panics on the symlinked `node_modules`.
  3. Run Playwright with `E2E_STACK_ENV='<that JSON>' PW_BASE_URL=http://localhost:3471` and an own
     `--output=<scratch>/pw<N>`.
  4. Never run `vitest.integration.config.ts` while another session's e2e or soak is using the test
     database: it resets it.
  5. If a test acts as if a new column is missing, check it with
     `docker exec supabase_db_daygame-tests psql -U postgres -tAc "…"`.
- Click through with test accounts on the local test stack only. Never the owner's account.
- Before any database change: a backup, a rollback file beside every migration, row security on every
  new table, and a test that another account cannot read it.
- Write "built" or "live" in this file, never "done". The owner signs off on the page.
- Run `/code-review` on each phase. Phase 5 also gets a security review through a subagent on the
  explicit commit range, before its database push (step 5.5), because `/security-review` cannot run in
  this checkout.
- After each phase, update the decision page (pictures before and after) and the status line at the top
  of this file.

## How this survives a rebuild

If the app is rebuilt, these are the behaviours to carry over, whatever the code looks like:

1. Opening the plan with no step asked lands on Today once the plan has an active goal or a routine
   step. Otherwise it lands on the first setup step.
2. When the plan is in use, the daily and weekly screens come first: Today, Review, Journal, Track. The
   8 setup steps sit behind "Edit your plan". On a phone the step list is one line until opened.
3. Today starts with at most 3 "Due now" cards, in this order: season over or ending (7 days), plan the
   new year, year review (26 Dec – 15 Jan), quarter review (first 14 days), month review (first 7 days or
   the last day), week review (from the chosen day until written), goals past their date.
4. A review counts as done only when something is written in it or a goal has a verdict. Scores alone do
   not count.
5. One phone notification a week, on a day and hour the person picks (default Sunday 19:00), only while
   that week's review is unwritten. Its text never contains what the person wrote.
6. Committing points to Today. The Review starts with the north star.

## /goal prompts, one per phase

- **Phase 0:** `/goal Carry out Phase 0 of Plans/life-plan-after-setup.md exactly: read the page marks and notes, set up the worktree and test-stack app, take the before pictures at desktop and phone width, record them in the plan. Stop and report if any decision is marked change or unsure.`
- **Phase 1:** `/goal Build Phase 1 of Plans/life-plan-after-setup.md exactly as its steps say (landing rule, planIsInUse, Open Today button, written-review rule, duplicate key), with the named tests, in a worktree; pass every acceptance command; /code-review; ship by ff-merge and push; put after-pictures on the decision page; mark the phase "live" in the plan.`
- **Phase 2:** `/goal Build Phase 2 of Plans/life-plan-after-setup.md exactly (USE_STEPS/BUILD_STEPS, rail fold, phone toggle, test helper openBuildSteps), pass its acceptance commands at desktop and phone, /code-review, ship, pictures on the page, mark it "live".`
- **Phase 3:** `/goal Build Phase 3 of Plans/life-plan-after-setup.md exactly (dueNowService with the listed test table, parsePeriodParam, DueNow cards above Today, review opens on the asked period), pass its acceptance commands, /code-review, ship, pictures on the page, mark it "live".`
- **Phase 4:** `/goal Build Phase 4 of Plans/life-plan-after-setup.md exactly (the copy table, footer branch, icon legend, north star in Review, How today went folded), update tests that assert old text, pass its acceptance commands, /code-review, ship, pictures on the page, mark it "live". Remove nothing.`
- **Phase 5:** `/goal Build Phase 5 of Plans/life-plan-after-setup.md only if step 5.0 finds energy-audit Phase 5 live; ask the owner once for the live migration; migration with rollback and row security, reminders repo, route, clock, Review setting, tests including the cross-account one; /code-review and a security review by subagent; backup, apply, ship, live checks; mark it "live".`
