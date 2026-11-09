# Your plan after setup: land on Today, see what is due, get one weekly reminder

**Status:** written 2026-11-09. Reviewed again the same day by six agents: dry-runs of every phase plus
an independent whole-plan review, and the findings were merged into this version. **Go given** (owner,
2026-11-09). Nothing built yet. Phases run in order: 0, 1, 2, 3, 4, 5.
Decision page (marks and notes): https://claude.ai/artifact/Tbhg3XTAizXkLmutiUaQpp.

The owner asked on 2026-11-08: "It seems kind of weird to open the full plan, dont you think? ... i want
users to go through the full setup once, then possibly be reminded to do things as they should logically
be done, i.e. log work, review a week, create a new season focus and so on".

The goal is to make `/plan` and its details easy to understand, both in the one full setup and in the
months after it.

## The owner's answers (2026-11-09, in chat)

1. **"go".** Build all phases.
2. **The Phase 5 database change: "no need to ask, you can just go ahead with that too".** Phase 5 does
   not stop to ask before its migration. It still makes the backup first and checks that only its own
   migration is pending. This yes covers applying the migration only. Running its rollback file on the
   live database deletes his reminder row and send records, so that does need his yes first.
3. **Values (R1): "keep it as is, and ill look at it after youre fully done".** No phase changes
   anything about values: not the lists, not their help text. Ask him again after Phase 5.
4. **R2 and R3: he did not know what they meant.** They were explained in plain words afterwards. Both
   stay unbuilt in this plan whatever he answers. They would be a separate change.

## What you are agreeing to, in plain words

1. **Go.** Answered: go. This is new work in the current codebase. Each decision below is written as
   what the user sees, so it carries over to a rebuild. Phases 1 to 4 change only screens and text.
   Phase 5 is the only one that touches the database.
2. **Phase 5 changes your live database.** It adds one small table that holds your reminder day and
   time, and two small database functions. It also widens the list of notification kinds and adds one
   clock check. These changes only add things. A backup comes first, and every change ships with a
   file that undoes it. Answered: go ahead without asking.
3. **No money.** Phone notifications are free (web push, already in the app). Your phone already gets
   them: one Android phone, installed app, notifications on (read-only check, 2026-11-09).
4. **Nothing is removed.** R1 to R3 below are not built. Folding things away behind a button is not a
   removal: everything stays one tap away.
5. **Phase 7 of the rebuild (the deletes) is not touched.** This plan does not depend on it.

## Doubts first

- **"In use" starts early.** Picking a ready-made set at step 3 already creates goals, so the plan counts
  as in use from then on and opens on Today. To keep the "full setup once" path, Today shows a "Finish
  your plan" card (next unfinished step) until the plan is committed. Your plan is in use and not
  committed, so you will see that card until you commit, or until you press "Not now" (it comes back the
  next week).
- **You have never written a review.** Live: 2 review rows, 0 with any words in them. The weekly card
  shows only for 3 days from your review day and has a "Not now" button, so it does not sit on Today all
  week. A landing page and a reminder make a review easy to start. They can't make you write one.
- **Stefan gives no review day.** I checked the transcripts and found none. "Sunday evening" is the
  app's own line. The default here, Sunday 19:00, is my pick, not his.
- **Stefan doesn't redo the whole setup every year.** He reviews the year, sets new goals, and updates
  the vision "every year or two". So this plan adds a yearly card and no yearly re-walk.
- **Stefan's weekly order differs from the app's.** He re-reads the vision, scores each area, then writes
  magic moments. The app's Review starts with "Earned in…". This plan adds the north star at the top of
  Review and keeps the rest of the order (Q3).
- **This is AI-written code you will not be able to read.** Six phases, 0 to 5. Phases 1 to 4 are each
  about a day of an agent's work. Phase 5 is the biggest.

## What I found by using it (test accounts on a local copy, 2026-11-09)

I walked an empty account through setup at phone width, then a filled plan (4 template sets, 12 areas
rated, a season, committed) at desktop width. Pictures are on the decision page.

| # | Found | Evidence | In this plan |
|---|---|---|---|
| F1 | `/plan` always opens on step 1, North star. That includes right after "I commit to this" and on a filled, committed plan. | walk; `app/(app)/plan/page.tsx` passes no step; `NorthStarFlow.tsx:144` defaults to `"star"` | Phase 1 |
| F2 | On a phone, the 12 step cards fill a screen and a half (about 1,250 px) above every step. | screenshot, phone, Your 10s | Phase 2 |
| F3 | Nothing tells you a review is due or a season has ended. An ended season shows only on the Season step and on Tracking's band. Today says nothing. A goal past its date shows "7d overdue" only on the Season step. | walk with a season ended 1 Nov and a goal dated 2 Nov | Phase 3 |
| F4 | After "I commit to this", nothing points onward. | walk | Phase 1 |
| F5 | Rating an area on Your 10s during setup makes Review say "Last weekly review: today", though no review was written. | `PeriodReviewTab.tsx:81` uses `lastReviewOf`, which counts a scores-only review | Phase 1 |
| F6 | React warns "two children with the same key" every time Review opens. | `PeriodReviewTab.tsx:151` and `:218` are siblings with the same key | Phase 1 |
| F7 | Values are asked three times: the same two lists on step 1 and on step 7, and once more per area. Step 1 says "You put them in order later, on the review". | `StarTab.tsx:201`, `NorthStarFlow.tsx:1915` | **Deferred by the owner.** No change. |
| F8 | Out-of-date words: "The list of everything you want comes next" (Season); goals "stay in your plan until the Track step … puts them on your goals and tracking pages" (untrue since Q4); "the Where you are tab" (twice, for Your 10s); "The goals live on the next tab" (means the button beside it); "from elsewhere" (unexplained, and wrong for routines that belong to no area). | `northStarStart.ts:357,391`; `northStar.ts:1991,2068,2320,2323`; `AreaGoalsDialog.tsx:214`; `AreaDialog.tsx:368` | Phase 4 |
| F9 | Quotes say "His:", "His way in", "He put fitness above health", "His 10 for his body", and nobody is named. The project's voice policy v2 (`tests/unit/goals/lifeMasteryCopyLint.test.ts`) already bans naming the source coach and calling him he/his. | `northStar.ts:1023,1025,1031,1033,1292,1297,1302,1803,2296` | Phase 4, per the voice policy |
| F10 | The footer says "Saved on this device." on a signed-in account whose plan has not reached the account yet. | `NorthStarFlow.tsx:2293-2297` | Phase 4 |
| F11 | Tracking's band labels the season sentence "The one thing". | `SEASON_BAND_COPY.oneThingLabel` | **No change.** The Season step's own question is "What is the one thing?", so the label matches it. |
| F12 | The template icons 🔁 🎯 🏁 are explained only on the Season step. | walk, Where to start, ready-made sets | Phase 4 (legend once, at the top of the ready-made sets) |
| F13 | The page heading says "Life Mastery", the tab says "Your plan". | `NorthStarFlow.tsx:1650` | Phase 4 |
| F14 | Today asks you to rate 12 areas a day ("How today went"). Your 10s and Review ask for 0 to 10 too. | walk, Today | Phase 4 (folded, nothing removed) |
| F15 | Two weekly reviews: the plan's Review, and Tracking's "Weekly Reviews" for approaches. | `/tracking` | Not changed (R2) |

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
  the previous year you've got to debrief it" (`2fDYApReHWc`). Also: "I go over the goals that I
  achieved. I go over the goals that I didn't achieve" (`zuEb-1Ll2h8`, New Year's Eve).
- The vision is updated, not redone: "I've done it almost every year or two since" (`Lp_GOrM16Xc`).
- Reminders: "Schedule those times in advance. Put it on a calendar. Have a reminders pop up on your
  phone." (`AuRE42mCwlU`).
- Not found in the corpus: a review day of the week, a 90-day "season" of his own, a daily notification.
  The season is the owner's idea (concept item 24, "denne sæsons fokus"), and his words win over Stefan's.

## The decisions: kept, changed, added

| ID | Before (8 Nov) | Now | Why |
|---|---|---|---|
| d1 | After Commit, open on Today | **Changed.** Open on Today once the plan has something to do (one active goal or one routine step). Otherwise open on North star, as now. A link that names a step still opens that step. | The owner never committed (live check), so the Commit rule would never fire for him. |
| d2 | Grid splits: use steps on top, 8 setup steps folded | **Kept, plus a phone fold.** When the plan is in use: Today, Review, Journal, Track, then "Edit your plan · 8 steps". The fold is closed on a use step and open on a setup step. On a phone the cards fold into one line; they start open while the plan is not in use, so a first-time user sees the 12-step overview. | F2. |
| d3 | Due-now cards, at most 3 | **Kept, sharpened.** On top of Today, in this order: finish your plan (until committed), season over, season ending (7 days or less), plan the new year, year review, quarter review, month review, week review, goals past their date. Every card has "Not now", which hides it until its period changes. The week card shows for 3 days from the review day. | F3; and a card that never goes away gets ignored. |
| d4 | Push at a picked day and time, default Sunday 19:00 | **Kept, narrowed.** One push a week, for the week review only, while it is unwritten. Off until switched on. Hours 06:00 to 22:00. | Stefan: "Have a reminders pop up on your phone". |
| d5 | Yearly re-walk of the whole setup | **Changed.** 26 Dec to 15 Jan: a "Year review" card. In January, once that review is written: "Plan the new year" (north star, values, then goals). | Stefan reviews the year, then sets goals, and updates the vision "every year or two". |
| d6 | Only the plan's Review gets reminders | **Kept.** | A merge would be a removal (R2). |
| d7 | Dashboard untouched | **Kept.** Tracking's band link "Open your plan" now opens Everything (the whole plan), because the band already has a Today link and `/plan` itself now opens on Today. | Two links to the same place. |
| d8 | — | **Added.** After "I commit to this": "Open Today →". | F4. |
| d9 | — | **Added.** The words in F8, F9, F10, F12 and F13; the north star at the top of Review; "How today went" folded. | Walk findings, the voice policy, Stefan's weekly re-read. |
| d10 | — | **Added.** The Review console error fixed. | F6. |
| d11 | — | **Added.** Opening Review from the step list opens the week the weekly card is about, while that card shows. | Otherwise a Monday review from the step list writes into the new week and the card for last week stays. |

### Proposed to remove (not built)

- **R1.** The two value lists on step 1. **Deferred by the owner** until after Phase 5.
- **R2.** One weekly review instead of two. Tracking's dating "Weekly Reviews" would fold into the plan's
  Review. Recommendation: not now.
- **R3.** The Journal's "Weekly review" question set (four questions that repeat the Review step's
  boxes). Proposed in `Plans/life-plan-review-reads-back.md`.

## Blockers, each tried once

| ID | What | Tried, and what came back | Blocks | Now |
|---|---|---|---|---|
| B1 | The energy-audit plan was changing the same push clock. | First try: the tick route called only `runTimerAlertClock`. Second look, 2026-11-09 ~09:40: `9206ad99` ("quarter-hour pings") added `runAuditPingClock` to the tick route, and `952fe03f` followed. Neither adds a migration. | Phase 5 | Resolved. Phase 5 step 5.0 still checks the live build. |
| B2 | Does the owner's phone get push? | Live read-only: `push_devices` has 1 row, "Android phone · installed app", enabled. `cron.job` has `notifications-clock`. | — | Not a blocker. |
| B3 | A season that has already ended cannot be made in the app ("That day has already been. Pick one that is still ahead of you."). | Tried on the Season step. The mapper and the table accept a past end (`ends_on >= started_on` is the only check, migration `20261104140000_one_season.sql`). | tests for d3 | Tests seed it through `seedLifePlan`. |
| B4 | The browser-test database is one Docker stack shared by every session. | `node scripts/db/test-stack.mjs env` answered; stack up. | e2e | Follow "Working setup" below. Never run `vitest.integration.config.ts` while another session's e2e or soak runs. |
| B5 | The owner's go. | — | all | Given. |
| B6 | Phase 5's live migration. | — | Phase 5 | Yes given; no ask. |

## Open questions (the recommendation is what gets built)

The owner did not answer these. Each recommendation stands.

| # | Question | Built | Alternative |
|---|---|---|---|
| Q1 | When should `/plan` open on Today? | When the plan has an active goal or a routine step | After Commit only |
| Q2 | Default review day and time | Sunday 19:00 (the app's own line, not Stefan's) | Monday morning |
| Q3 | Reorder Review to Stefan's order (scores before "Earned")? | No. North star on top, rest unchanged. | Reorder |
| Q4 | The "His:" quotes | Reworded without his name or "he/his", per the project's existing voice policy v2 (changed from "name him", which that policy forbids) | Name him |
| Q5 | Page heading | "Your plan", the tab's name | "Life Mastery" |
| Q6 | Push for month, quarter and season too? | No. They show on Today. | Push each |
| Q7 | Fold "How today went" on Today? | Yes, closed, with "N of 12 rated" | Leave it open |

## Marks read

Read 2026-11-09 (Phase 0). No decision, removal or question is marked. One note:

- `n-mock-today`, 2026-11-09 08:23: "i like the look of this".

## Working setup (every phase uses this)

**W1. Folders.**
- `<scratch>` is the scratchpad directory your system prompt names.
- `<keep>` is `~/.cache/daygame-plan-after-setup/` (`mkdir -p` it). It holds what later phases reuse:
  `stack.json`, `tour-plan.json`, `life-plan-tour-phone.spec.ts` and `pictures/`.

**W2. One worktree per phase.** For phase N:

```bash
cd /home/jonaswsl/projects/daygame-coach
git worktree add -b after-setup-p<N> <scratch>/wt-p<N> main
ln -s /home/jonaswsl/projects/daygame-coach/node_modules <scratch>/wt-p<N>/node_modules
```

All edits, tests and the server run inside `<scratch>/wt-p<N>`. Never edit the shared checkout
(`/home/jonaswsl/projects/daygame-coach`) except to fast-forward `main` in W8.

**W3. Test-stack values.** From the shared checkout, once per session:
`node scripts/db/test-stack.mjs env > <keep>/stack.json`. It prints one JSON line (`API_URL`,
`ANON_KEY`, `SERVICE_ROLE_KEY`, `DB_URL`, `MAILPIT_URL`, …). If it says it is rebuilding the stack, let
it finish.

**W4. The app server**, in the background, from the worktree:

```bash
cd <scratch>/wt-p<N>
J=<keep>/stack.json
NEXT_PUBLIC_SUPABASE_URL=$(node -p "require('$J').API_URL") \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(node -p "require('$J').ANON_KEY") \
SUPABASE_SERVICE_ROLE_KEY=$(node -p "require('$J').SERVICE_ROLE_KEY") \
NEXT_DIST_DIR=.next-after npx next dev --webpack -p 3471
```

- Never use `.env.local` values: they point at the live database.
- `--webpack` is required: Turbopack panics on the symlinked `node_modules`.
- Wait until `curl -s -o /dev/null -w "%{http_code}" http://localhost:3471/` prints `200`. The first
  compile can take two minutes.
- If port 3471 is taken, use 3472 and change `PW_BASE_URL` in W5 to match.
- Stop the server at the end of the phase.

**W5. "Run e2e `<files>` on `<project>`"** means:

```bash
cd <scratch>/wt-p<N>
E2E_STACK_ENV="$(cat <keep>/stack.json)" PW_BASE_URL=http://localhost:3471 \
  npx playwright test <files> --project=<project> --output=<scratch>/pw-p<N>-<project>
```

- With `E2E_STACK_ENV` set, `playwright.config.ts` reuses the stack and does not rebuild it.
- `desktop` is Chrome. It ignores `tests/e2e/mobile/`.
- `phone` is an iPhone 14, which is WebKit. It runs `tests/e2e/mobile/` and every test whose title
  contains `@phone` (`playwright.config.ts:92,161-166`).
- If WebKit is missing, run `npx playwright install webkit`. If it still cannot launch because system
  libraries are missing, do not install system packages. Write "phone project could not run: <first
  error line>" in the phase's status line and tell the owner.
- `<files>` are name fragments. `life-mastery` matches every `life-mastery-*.spec.ts`.

**W6. Pictures.**
- Phase 0 creates `<keep>/tour-plan.json` with exactly this content. It is an in-use plan: one routine
  step, no commitment.

  ```json
  {"version":1,"seq":10,"northStar":"A calm, strong life: a fit body, work I own, close friends.","areas":[{"id":"lm_fitness","label":"Fitness","sublabel":"Strength","color":"#0ea5e9","custom":false}],"routines":[{"id":"r1","label":"Morning","blueprintId":"morning","kind":"sequence","areaId":null,"serves":[],"daysPerWeek":7,"splitDays":[],"steps":[{"id":"s1","title":"Read my north star","daysPerWeek":7,"libraryStepId":null,"minutes":5,"dimension":"body","servesGoalIds":[],"days":[],"startMin":420}]}],"goals":[],"priorityIds":[],"updatedAt":"2026-01-01T00:00:00.000Z"}
  ```

- Phase 0 creates `<keep>/life-plan-tour-phone.spec.ts`. Copy `tests/e2e/life-plan-tour.spec.ts` and
  change only:
  - the `test(` title to `"one picture per step, phone width"`;
  - all three `setViewportSize` calls, at lines ~56, ~76 and ~79. Width `1280` becomes `390`. Where the
    height is `900`, it becomes `844`. The middle call keeps its computed height.
- **Desktop pictures:** run e2e `life-plan-tour` on desktop with
  `TOUR_PLAN=<keep>/tour-plan.json TOUR_DIR=<keep>/pictures/p<N>-<before|after> TOUR_STEPS=<list>`.
- **Phone pictures:**
  - Copy `<keep>/life-plan-tour-phone.spec.ts` into `<scratch>/wt-p<N>/tests/e2e/`.
  - Run e2e `life-plan-tour-phone` on desktop with the same variables and a `TOUR_DIR` ending in
    `-phone`.
  - Delete the copy before committing: specs left in `tests/e2e` are scanned by the peers' pre-commit.
- Open one picture with the Read tool and check that it shows `/plan`.

**W7. Checks before shipping (every phase).** All must pass:
- `npx vitest run` (the whole suite);
- `node scripts/typecheck-ratchet.mjs` exits 0;
- `npm run lint:ratchet` exits 0. If it fails only on files this phase did not touch, run
  `npx eslint <your changed files>` instead, and write that down in the status line.
- `npm run build` exits 0.

Never raise a ratchet baseline to get past your own failure. Read `docs/testing_behavior.md` and
`.claude/rules/testing.md` before writing tests.

**W8. Ship.**
1. `next dev` rewrites `tsconfig.json` and creates `AGENTS.md` in the worktree. Run
   `git checkout -- tsconfig.json` and leave `AGENTS.md` uncommitted.
2. Commit in the worktree with `git commit --only <paths>` and the attribution line from your system
   prompt. Never `git add -A`, never `git stash`.
3. `git rebase main` in the worktree (local `main` moves with other sessions), then `npx vitest run` again.
4. In the shared checkout: `git merge --ff-only after-setup-p<N>`, then `git push origin main`.
5. Wait until `curl -s https://daygame-coach.vercel.app/api/healthz` shows a `buildId` equal to your
   commit, or one that contains it (`git merge-base --is-ancestor <yours> <buildId>`).
6. `git worktree remove --force <scratch>/wt-p<N>`, then `git branch -d after-setup-p<N>`.

**W9. Review.** Before W8, run `/code-review` on the phase's changes and fix the findings that hold up.
Phase 5 also gets a security review: an Agent given the diff and the migration, not this plan's
conclusions. `/security-review` cannot run in this checkout.

**W10. Report.**
- After W8, replace the phase's **Status** line with: "Built and live <date>, commit <sha>, buildId
  confirmed", plus anything that differs from the plan. Write "built" or "live", never "done": the owner
  signs off on the page.
- Update the decision page. Read it with the Artifact tool (`action: "read"`). Add one
  `<section class="block" data-note="p<N>-live">` before the `<h2>Phases</h2>` section, holding:
  - an `<h2>` "Phase N is live";
  - two to four plain sentences on what changed for the user;
  - before and after pictures from W6, as `<figure><img src="data:image/jpeg;base64,…"><figcaption>`.
    Resize each to 390 px wide (phone) or 720 px wide (desktop), JPEG quality 68, with Python PIL.

  Change nothing else on the page, and never its `<script>`. Publish to the same URL.
- Commit and push this plan file with `git commit --only Plans/life-plan-after-setup.md`.

## Phases

### Phase 0. Pictures before, and ground truth (no product change)

**Status:** Built 2026-11-09 (no product change, nothing to ship). Marks read; before pictures in
`~/.cache/daygame-plan-after-setup/pictures/p0-before` and `p0-before-phone`, five each.

1. **Marks.** Read the decision page's marks: ArtifactData `list`, url
   https://claude.ai/artifact/Tbhg3XTAizXkLmutiUaQpp, collection `marks`.
   - Decisions, removals and questions are stored by id: `d1`…`d11`, `r1`…`r3`, `q1`…`q7`. `v` is
     keep / change / unsure; for removals, yes / no / unsure.
   - Notes on any block are in `notes: [{ text, at }]`. Blocks without an id are keyed `n-<block>`.
   - Copy every mark and note, with its date, into "## Marks read" above. If there are none, write
     "none on <date>".
   - A decision marked "change" or "unsure": stop work on that decision only, and tell the owner. The
     rest goes ahead.
   - A removal marked "yes" is not built in this plan. Note it for the owner.
2. Do W1, W3 and W6 (create `tour-plan.json` and the phone spec in `<keep>`).
3. `git worktree add --detach <scratch>/wt-p0 main`, then link `node_modules` (W2). Start the server
   (W4).
4. Before pictures, desktop and phone (W6), with `TOUR_STEPS=star,today,review,recap,focus` and
   `TOUR_DIR=<keep>/pictures/p0-before` (phone: `p0-before-phone`).
5. Stop the server. `git worktree remove --force <scratch>/wt-p0`.

**Acceptance:** `ls <keep>/pictures/p0-before <keep>/pictures/p0-before-phone` lists
`01-star.jpg 02-today.jpg 03-review.jpg 04-recap.jpg 05-focus.jpg` in each.

### Phase 1. Land on Today when the plan is in use; Commit points onward; Review fixes (d1, d7, d8, d10, F5)

**Status:** not started. Depends on: Phase 0.

**1.1 The landing rule, as a pure function.** New file `src/goals/planLanding.ts`:

```ts
import type { NorthStarTabId } from "@/src/goals/types"

/** Where /plan opens when the address names no step: Today once the plan has something to do. */
export function landingStep(askedStep: string | undefined, inUse: boolean): NorthStarTabId | undefined {
  if (askedStep) return undefined // the caller handles an asked step, valid or not
  return inUse ? "today" : undefined
}
```

Test: new `tests/unit/goals/planLanding.test.ts`.
- `landingStep(undefined, true)` is `"today"`.
- `landingStep(undefined, false)` is `undefined`.
- `landingStep("review", true)` is `undefined`.

**1.2 "In use", read on the server.** In `src/db/lifePlanRepo.ts`, after `findLifePlanId`:

```ts
/**
 * True when the plan has something to do: one goal being worked on, or one routine step.
 * Never throws: on any error the page opens as it did before (North star). That is deliberate.
 */
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

Test: add `describe("planIsInUse")` to `tests/unit/db/lifePlanRepo.test.ts`. It uses the file's
existing fake (`tests/helpers/fakeSupabase.ts`, wired at the top of the file). Read the top 40 lines to
see how a test puts rows in a table. Three cases:
- one `life_plan_goals` row with `status: "active"` gives true;
- no goals and one `life_plan_routine_steps` row gives true;
- one goal with `status: "paused"` and no steps gives false.

Do not test the error path: the fake cannot return an error for a head count.

**1.3 The page.** In `app/(app)/plan/page.tsx`:
- Add `import { landingStep } from "@/src/goals/planLanding"` and
  `import { planIsInUse } from "@/src/db/lifePlanRepo"`.
- After `const { step } = await searchParams`, replace the `initialTab` line with:

  ```ts
  const inUse = await planIsInUse(user.id)
  const landed = landingStep(step, inUse)
  const initialTab = landed ?? (TAB_ORDER.includes(stepFor(step as NorthStarTabId)) ? (step as NorthStarTabId) : undefined)
  ```

  `inUse` is read on every visit, because Phase 2 passes it to the flow.
- Keep the existing comment block. Add one line to it: "No step asked: Today once the plan is in use
  (Plans/life-plan-after-setup.md, d1)."
- Do not touch the timezone read or the `NorthStarFlow` props.

**1.4 Commit points onward (d8).** The commit box lives inside the Everything step (`recap`):
`NorthStarFlow.tsx` around line 2099 renders `<CommitTab` in the recap branch.
- `src/goals/data/northStar.ts`, the object holding `commit: "I commit to this"` (around line 2802):
  add `openToday: "Open Today →",` after `uncommit`.
- `src/goals/components/north-star/CommitTab.tsx`. The props are declared inline in the signature.
  - Add `onOpenToday` to the destructured list, and `onOpenToday?: () => void` to the inline type.
  - In the `<div className="flex flex-wrap items-center gap-3 mt-2.5">`, after the existing
    commit/uncommit `<button>` (the one with `ml-auto`), as its last child, add:
    `{committedOn && onOpenToday && <button type="button" onClick={onOpenToday} className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors">{COMMIT_COPY.openToday}</button>}`.
- `NorthStarFlow.tsx`, on that `<CommitTab`: add `onOpenToday={() => setTab("today")}`.

**1.5 "Last weekly review" counts written reviews only (F5).** In `src/goals/reviewService.ts`, after
`isEmptyReview`:

```ts
/** A review someone wrote in: a word in a box, or a verdict on a goal. Scores alone come from rating an area. */
export function isWrittenReview(r: Pick<NsReview, "magicMoments" | "lessons" | "nextOutcomes" | "verdicts">): boolean {
  return Object.keys(r.verdicts ?? {}).length > 0 || !!(r.magicMoments.trim() || r.lessons.trim() || r.nextOutcomes.trim())
}
```

and after `lastReviewOf` (keep `lastReviewOf` exported; tests use it):

```ts
/** The written review of this kind written most recently, or null. What "Last weekly review" names. */
export function lastWrittenReviewOf(plan: NsPlan, cadence: NsReviewCadence): NsReview | null {
  return reviewsOf(plan, cadence).filter(isWrittenReview).reduce<NsReview | null>((best, r) => (!best || r.writtenOn > best.writtenOn ? r : best), null)
}
```

- `src/goals/components/north-star/PeriodReviewTab.tsx` line 81: change
  `const last = lastReviewOf(plan, period.cadence)` to `lastWrittenReviewOf(plan, period.cadence)`.
- In its import list (line ~34), replace `lastReviewOf` with `lastWrittenReviewOf`. Nothing else in
  that file uses it.
- A copied "two weeks" review holds scores only, so its view now says "No two weeks review yet". That
  is intended.
- Test, in `tests/unit/goals/reviewService.test.ts`. Build reviews with `writeReview` on a plan, as the
  file's other cases do; read two of them first.
  - A review with only a score: `isWrittenReview` is false.
  - The same plus `{ verdict: { goalId, value: "behind" } }` on a goal added with `addGoal`: true.
  - `lastWrittenReviewOf` skips a newer scores-only week and returns the older week with
    `magicMoments: "x"`.

**1.6 The duplicate key (F6).** In `PeriodReviewTab.tsx`, `<EarnedInPeriod key={reviewIdFor(period)} …>`
(line ~151) and `<RemoveReview key={review.id} …>` (line ~218) are children of the same
`<div className="space-y-6">`, and `review.id === reviewIdFor(period)` (checked 2026-11-09). Change the
`RemoveReview` key to `` key={`remove-${review.id}`} ``.

**1.7 Tracking's band (d7).** `src/goals/components/north-star/SeasonBand.tsx`, the `<Link` whose text
is `{SEASON_BAND_COPY.openPlan}` (line ~239): change `href={withReturn(PLAN_PATH, HERE)}` to
``href={withReturn(`${PLAN_PATH}?step=recap`, HERE)}``. Leave the other links (`build` at ~122, Today at
~229) alone.

**1.8 The product map.** In `docs/product/map.md`, in the paragraph about `/plan` (Life Mastery; find it
with `grep -n "/plan" docs/product/map.md`), add one sentence: "Since 2026-11 `/plan` opens on Today once
the plan has an active goal or a routine step; a link naming a step still opens that step."

**1.9 Browser test.** New `tests/e2e/life-plan-landing.spec.ts`.
- Import `test, expect` from `./fixtures/test`, `seedLifePlan, planWithSteps` from
  `./helpers/lifePlan`, and `ROUTES` from `@/src/shared/routes`, as `life-mastery-reviews.spec.ts` does.
- The `account` fixture is shared by the tests of one worker, so every test seeds its own plan first;
  `seedLifePlan` replaces the whole plan.
- Define `const current = (page) => page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="page"]')`.

Tests:
- **"a plan with nothing to do opens on North star":** seed `planWithSteps([])` (one routine, no
  steps, no goals). `goto(ROUTES.plan)`, then `expect(current(page)).toContainText("North star")`.
- **"a plan with a routine step opens on Today":** seed
  `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])`, `goto(ROUTES.plan)`. The current
  card contains "Today".
- **"an asked step still wins":** same seed, `goto(`${ROUTES.plan}?step=review`)`. The current card
  contains "Review".
- **"Review opens without a React key warning":**
  - Same seed. Collect `page.on("console", m => { if (m.type() === "error") errors.push(m.text()) })`.
  - `goto(`${ROUTES.plan}?step=review`)` and wait for `getByTestId("review-last")`.
  - Click `getByRole("button", { name: /^Score .+ 4 out of 10/ }).first()`. Wait for "Saved to your
    account.". Reload and wait for `review-last` again.
  - `expect(errors.filter(e => e.includes("same key"))).toEqual([])`.
  - Run this test once before making change 1.6, and see it fail: the dev server prints this warning.

**Acceptance:**
- `npx vitest run tests/unit/goals/planLanding.test.ts tests/unit/goals/reviewService.test.ts tests/unit/db/lifePlanRepo.test.ts`: pass.
- Run e2e on desktop: every spec that opens the plan. List them with `grep -rln "ROUTES.plan" tests/e2e`,
  and run those plus `life-plan-landing life-mastery blackbox one-thing`. All pass.
  - Some of them, for example `life-mastery-day-persists.spec.ts:94,134,202`, open `ROUTES.plan` on a
    seeded plan and now land on Today. If one fails because it expected North star there, change its
    `goto` to `?step=star`.
  - If one fails for any other reason, fix the code, not the test.
- Run e2e `mobile-life-mastery` on phone: pass.
- W7.

**Do not touch:** `decideOnLoad`, `planHalfAfterLoad`, the save effect, `TAB_ORDER`, `MOVED_STEPS`,
anything on the rebuild plan's Phase 7 list, anything about values.

**Pictures:** W6 after, with `TOUR_STEPS=today,recap`, desktop and phone.

### Phase 2. The step cards: use steps first, setup folded; one line on a phone (d2)

**Status:** not started. Depends on: Phase 1.

**2.1 Data.** In `src/goals/data/northStar.ts`, after `SCORED_TABS` (line ~873):

```ts
/** The steps used every day and week once the plan is in use, in the order shown then. */
export const USE_STEPS: NorthStarTabId[] = ["today", "review", "journal", "track"]
/** The steps that build the plan: TAB_ORDER without the use steps, in TAB_ORDER's order. */
export const BUILD_STEPS: NorthStarTabId[] = TAB_ORDER.filter((t) => !USE_STEPS.includes(t))
export const RAIL_COPY = {
  editPlan: (n: number) => `Edit your plan · ${n} steps`,
  phoneStep: (i: number, n: number, label: string) => `Step ${i} of ${n} · ${label}`,
  phoneUse: (label: string) => `${label} · all steps`,
}
```

The cards keep their `TAB_ORDER` numbers, so the use cards read 10, 12, 11, 9. That is on purpose: a
number always names the same step.

Unit test, new `tests/unit/goals/railSteps.test.ts`:
- `BUILD_STEPS.length + USE_STEPS.length === TAB_ORDER.length`;
- every id in `TAB_ORDER` is in exactly one of the two lists.

**2.2 "In use" on the client.** In `src/goals/planLanding.ts`, merge `NsPlan` into the existing
`import type` line from `@/src/goals/types`, then add:

```ts
import { isActive } from "@/src/goals/goalStatus"

/** The same rule as planIsInUse on the server: one active goal, or one routine step. */
export function planInUse(plan: Pick<NsPlan, "goals" | "routines">): boolean {
  return plan.goals.some(isActive) || plan.routines.some((r) => r.steps.length > 0)
}
```

Add two cases to `planLanding.test.ts`:
- a plan with one active goal is in use;
- a plan whose only goal has `status: "paused"` and whose routines have no steps is not.

**2.3 The rail.** In `src/goals/components/north-star/NorthStarFlow.tsx`:
1. **Prop.** Add `initialInUse?: boolean` to the props (default `false`). In `app/(app)/plan/page.tsx`,
   pass `initialInUse={inUse}`.
2. **State.** Declare these above the `setTab` callback (line ~193), because `setTab` uses them:
   - `const [railOpen, setRailOpen] = useState(!initialInUse)`: the phone rail starts open while the
     plan is not in use;
   - `const [buildOpen, setBuildOpen] = useState(BUILD_STEPS.includes(stepFor(initialTab)))`.
3. **`setTab`.** Inside the callback, after `setTabState(next)`, add `setRailOpen(false)`.
4. **The fold follows the step.** Add
   `useEffect(() => { setBuildOpen(BUILD_STEPS.includes(tab)) }, [tab])`. Arriving on a setup step
   opens it, and arriving on a use step closes it. The fold button can still toggle it in between.
5. **In use.** `const inUse = decision === null ? initialInUse : planInUse(plan)`. Before the
   account's plan has loaded, the server's answer is used, so the cards do not jump. Then
   `const showBuild = !inUse || buildOpen`.
6. **Toggle ref.** Add `const railToggleRef = useRef<HTMLButtonElement>(null)`.
7. **The card.** In the block starting `{/* The rail. Every tab is reachable at any time. */}`
   (line ~1699), pull the `<button>` that renders one card into a local function
   `const card = (id: NorthStarTabId) => (…)`.
   - Keep everything in the button, `key={id}` included. Number it `TAB_ORDER.indexOf(id) + 1`.
   - Its onClick becomes:
     `() => { setTab(id); if (window.matchMedia("(max-width: 639px)").matches) railToggleRef.current?.focus() }`.
     On a phone the rail hides under the finger, so focus moves to the toggle.
8. **Render, in this order:**
   1. A phone-only toggle, outside the nav:
      `<button ref={railToggleRef} type="button" className="sm:hidden w-full mb-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-sm text-zinc-200" aria-expanded={railOpen} aria-controls="plan-sections" onClick={() => setRailOpen((o) => !o)}>{inUse && USE_STEPS.includes(tab) ? RAIL_COPY.phoneUse(TAB_LABELS[tab]) : RAIL_COPY.phoneStep(TAB_ORDER.indexOf(tab) + 1, TAB_ORDER.length, TAB_LABELS[tab])} <span aria-hidden>▾</span></button>`.
   2. `<nav id="plan-sections" aria-label="Sections" className={`${railOpen ? "grid" : "hidden"} sm:grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-8`}>`.
   3. Inside the nav, when `inUse`:
      - `USE_STEPS.map(card)`;
      - then, still inside the nav, `<div className="col-span-full">` holding
        `<button type="button" aria-expanded={showBuild} onClick={() => setBuildOpen((o) => !o)} className="text-[12px] text-zinc-400 hover:text-zinc-100 py-1">{RAIL_COPY.editPlan(BUILD_STEPS.length)} <span aria-hidden>{showBuild ? "▴" : "▾"}</span></button>`;
      - then `{showBuild && BUILD_STEPS.map(card)}`.
   4. When not `inUse`: `TAB_ORDER.map(card)`, exactly as now.

**2.4 Tests.**
- `tests/unit/goals/northStarSteps.test.ts:236-239` counts 12 rail buttons on an empty plan. An empty
  plan is not in use, so it stays green. Run it.
- `tests/e2e/life-mastery-folded-steps.spec.ts:28` expects 12 buttons. Its plan holds only a north
  star, so it is not in use and stays green. Run it.
- New helper in `tests/e2e/helpers/lifePlan.ts`:

  ```ts
  /** Opens "Edit your plan" when the plan is in use and the setup steps are folded. */
  export async function openBuildSteps(page: Page): Promise<void> {
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    const fold = page.getByRole("button", { name: /^Edit your plan/ })
    if ((await fold.count()) > 0 && (await fold.getAttribute("aria-expanded")) === "false") await fold.click()
  }
  ```

- Add to `life-plan-landing.spec.ts`:
  - **"a plan in use shows the use steps first and folds the rest":**
    - Seed `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])` and `goto(ROUTES.plan)`.
    - In the nav, button 0 matches `/^\d+\s*Today/`, button 1 `/^\d+\s*Review/`, button 2
      `/^\d+\s*Journal/` and button 3 `/^\d+\s*Track/`.
    - `getByRole("button", { name: /^\d+\s*North star/ })` has count 0.
    - Call `openBuildSteps(page)`, and the North star card has count 1.
  - **A `test.describe("@phone", …)` block** holding one test, "on a phone the step list folds into one
    line", with `test.use({ viewport: { width: 390, height: 844 } })` inside the describe:
    - Seed `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])` (in use) and
      `goto(ROUTES.plan)`.
    - The nav is hidden. The button named `/^Today · all steps/` is visible.
    - Click it, and the nav is visible.
- Other specs click setup cards on plans that are now in use, for example `blackbox.spec.ts:252` (the
  Systems card, inside a `toPass` loop at 251-256). Run e2e on desktop for every file listed by
  `grep -rln "ROUTES.plan\|/plan?step" tests/e2e`.
  - For each that fails because a setup card is folded, call `await openBuildSteps(page)` right before
    the click. Inside a `toPass` loop, put it inside the loop.
  - Do not change what those tests assert.

**Acceptance:**
- `npx vitest run tests/unit/goals/railSteps.test.ts tests/unit/goals/planLanding.test.ts tests/unit/goals/northStarSteps.test.ts`: pass.
- The desktop e2e run above passes.
- Run e2e `life-plan-landing mobile-life-mastery` on phone. It passes, and its list of tests includes
  the `@phone` test.
- W7.

**Do not touch:** `TAB_ORDER`, the footer's ← / → buttons (they still walk `TAB_ORDER`),
`SCORED_TABS`, `StepDot`.

**Pictures:** W6 after, with `TOUR_STEPS=today,star`, desktop and phone.

### Phase 3. Due now, on top of Today (d3, d5, d11)

**Status:** not started. Depends on: Phases 1 and 2 (`isWrittenReview`, `BUILD_STEPS`).

**3.1 Pure service.** New `src/goals/dueNowService.ts`.

Imports:
- `addDays` from `./oneThingService`;
- `daysBetweenDateKeys` and `dateKeyLabel` from `@/src/shared/dateUtils`. `daysBetweenDateKeys(a, b)`
  is b minus a, in days;
- `periodOf`, `periodLabel`, `reviewFor`, `isWrittenReview` and the type `ReviewPeriod` from
  `./reviewService`;
- `isActive` from `./goalStatus`;
- the types `NsPlan` and `NorthStarTabId` from `./types`, and `NsStepState` from `./northStarService`;
- `DUE_COPY`, `BUILD_STEPS`, `SCORED_TABS` and `TAB_LABELS` from `./data/northStar`.

Exports:

```ts
export const DEFAULT_REVIEW_DAY = 7 // ISO weekday, 7 = Sunday (Q2: the app's pick, not Stefan's)
export const DUE_MAX = 3
export type DueKind = "finish-setup" | "season-ended" | "season-ending" | "new-year" | "year" | "quarter" | "month" | "week" | "goals-passed"
export type DueGo = { tab: NorthStarTabId; period?: ReviewPeriod } | { goalId: string }
/** `key` names this card for this period; "Not now" hides that key, and the next period has a new one. */
export interface DueCard { kind: DueKind; key: string; title: string; detail: string; go: DueGo }
export interface DueOptions { reviewDay: number; hidden: ReadonlySet<string>; nextStep: NorthStarTabId | null }
export function isoWeekday(day: string): number
export function dueWeekPeriod(today: string, reviewDay: number): ReviewPeriod
export function nextSetupStep(committed: boolean, states: Partial<Record<NorthStarTabId, NsStepState>>): NorthStarTabId | null
export function dueNow(plan: NsPlan, today: string, opts: DueOptions): DueCard[]
```

Date maths: use exactly these expressions and write no other date code. `today` is the account's date
key, `YYYY-MM-DD`.
- `isoWeekday(day)`:
  `const [y, m, d] = day.split("-").map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 ? 7 : w`.
- Day of month: `Number(today.slice(8, 10))`. Month: `Number(today.slice(5, 7))`.
- The period of kind `c` holding today: `periodOf(c, today)`. The one before it:
  `periodOf(c, addDays(periodOf(c, today).start, -1))`.
- Today is the last day of its period: `periodOf(c, today).end === today`.
- Within the first N days of a quarter: `daysBetweenDateKeys(periodOf("quarter", today).start, today) < N`.
- "Written": `const r = reviewFor(plan, p); r !== null && isWrittenReview(r)`.
- `weekKey = periodOf("week", today).start`, used in keys below.

The rules. Each gives at most one card. All titles and details come from `DUE_COPY`.
- **`nextSetupStep(committed, states)`:**
  - `committed` → `null`.
  - Otherwise, the first id in `BUILD_STEPS` that is in `SCORED_TABS` and whose `states[id] !== "done"`.
  - If there is none, `"recap"`: commit lives there.
- **finish-setup:** when `opts.nextStep !== null`.
  - Key `finish-setup:${weekKey}`.
  - `DUE_COPY.finishSetup(TAB_ORDER.indexOf(next) + 1, TAB_LABELS[next])`; import `TAB_ORDER` too.
  - Go `{ tab: next }`.
- **week:**
  - `const since = (isoWeekday(today) - reviewDay + 7) % 7` is days since the latest review day, and
    `D = addDays(today, -since)`.
  - `dueWeekPeriod(today, reviewDay)`: when `reviewDay >= 5` (Fri, Sat, Sun), `periodOf("week", D)`, the
    week ending around that day. Otherwise `periodOf("week", addDays(D, -7))`, the last full week. Weeks
    run Monday to Sunday.
  - Card only when `since <= 2` and that period is not written.
  - Key `week:${p.start}`. `DUE_COPY.week(periodLabel(p))`, go `{ tab: "review", period: p }`.
- **month:**
  - On days 1 to 7 of a month, `p` is the previous month. On the last day of a month, `p` is this month.
  - Card when not written: key `month:${p.start}`, `DUE_COPY.month(periodLabel(p))`, go
    `{ tab: "review", period: p }`.
- **quarter:**
  - Within the first 14 days of a quarter, `p` is the previous quarter. On a quarter's last day, `p` is
    this quarter.
  - Card when not written: key `quarter:${p.start}`, `DUE_COPY.quarter(periodLabel(p))`, go to review.
- **year:**
  - In month 12 from day 26, `p` is this year. In month 1 up to day 15, `p` is the previous year.
  - Card when not written: key `year:${p.start}`, `DUE_COPY.year(periodLabel(p))`. `periodLabel` of a
    year is the year as a string. Go to review.
- **new-year:**
  - In month 1, when the previous year's year period is written.
  - Key `new-year:${today.slice(0, 4)}`, `DUE_COPY.newYear`, go `{ tab: "star" }`.
- **season:** `const s = plan.season`. Only when `s !== null && s.sentence.trim() !== "" && s.endsOn !== null`.
  A season "until I say so" (`endsOn` null) never gives a card.
  `const left = daysBetweenDateKeys(today, s.endsOn)`.
  - `left < 0`: kind `"season-ended"`, key `season:${s.id}:${weekKey}`,
    `DUE_COPY.seasonEnded(dateKeyLabel(s.endsOn, { day: "numeric", month: "short" }))`, go
    `{ tab: "focus" }`.
  - `0 <= left <= 7`: kind `"season-ending"`, same key, `DUE_COPY.seasonEnding(left)`, go
    `{ tab: "focus" }`.
- **goals-passed:**
  `const passed = plan.goals.filter((g) => isActive(g) && g.targetDate !== null && g.targetDate < today)`.
  When `passed.length > 0`: key `goals-passed:${weekKey}`,
  `DUE_COPY.goalsPassed(passed.length, passed.slice(0, 2).map((g) => g.title))`, go
  `{ goalId: passed[0].id }`.
- **Order, filter, cut:**
  - Order: finish-setup, season-ended, season-ending, new-year, year, quarter, month, week,
    goals-passed.
  - Then `.filter((c) => !opts.hidden.has(c.key))`.
  - Then `.slice(0, DUE_MAX)`.

`DUE_COPY` goes in `src/goals/data/northStar.ts`, right after `REVIEW_PERIOD_COPY`:

```ts
export const DUE_COPY = {
  heading: "Due now",
  notNow: "Not now",
  done: "Done",
  finishSetup: (n: number, label: string) => ({ title: "Finish your plan", detail: `Next: step ${n}, ${label}.` }),
  week: (period: string) => ({ title: "Weekly review", detail: `Look back at ${period}.` }),
  month: (period: string) => ({ title: "Monthly review", detail: `Go through ${period}, goal by goal.` }),
  quarter: (period: string) => ({ title: "Quarterly review", detail: `Look back at ${period}, then set the next one.` }),
  year: (year: string) => ({ title: "Year review", detail: `Look back over ${year} before you set next year's goals.` }),
  newYear: { title: "Plan the new year", detail: "Read your north star (step 1) and your values (step 7) again, then set this year's goals (step 4)." },
  seasonEnded: (date: string) => ({ title: "Your season is over", detail: `It ran until ${date}. Look back at it on the Season step, then write the next one.` }),
  seasonEnding: (days: number) => ({
    title: days === 0 ? "Your season ends today" : days === 1 ? "Your season ends tomorrow" : `Your season ends in ${days} days`,
    detail: "Look back at it on the Season step and decide the next one before it runs out.",
  }),
  goalsPassed: (n: number, titles: string[]) => ({
    title: `${n} ${n === 1 ? "goal" : "goals"} passed ${n === 1 ? "its" : "their"} date`,
    detail: `${titles.join(", ")}${n > titles.length ? " and more" : ""}. ${n === 1 ? "Mark it achieved, move the date, pause or drop it." : "For each: mark it achieved, move the date, pause or drop it."}`,
  }),
}
```

**Unit test,** new `tests/unit/goals/dueNowService.test.ts`.
- Build plans with `emptyNsPlan()`, `addGoal(plan, areaId, title, type)` and `updateGoal` from
  `@/src/goals/northStarService`; `tests/unit/goals/countsAndPacing.test.ts:21-31` shows the pattern.
  Use `emptyNsPlan().areas[0].id` as the area.
- Write reviews with `writeReview(plan, periodOf(...), { magicMoments: "x" }, today)` from
  `@/src/goals/reviewService`.
- Set the season with
  `{ ...plan, season: { id: "s1", startedOn: "2026-08-01", endsOn: <date>, sentence: "Get fit" } }`.
- Unless the row says otherwise, use `opts = { reviewDay: 7, hidden: new Set(), nextStep: null }`.
- Assert the exact list of kinds, in order. 2026-11-09 is a Monday.

| today | plan | opts change | expected kinds |
|---|---|---|---|
| 2026-11-15 (Sun) | empty | — | `["week"]`, period 9 – 15 Nov |
| 2026-11-16 (Mon) | empty | — | `["week"]`, period 9 – 15 Nov |
| 2026-11-16 | week 9 – 15 Nov written | — | `[]` |
| 2026-11-16 | week 9 – 15 Nov with one score only (`{ score: { areaId, value: 4 } }`) | — | `["week"]` |
| 2026-11-18 (Wed) | empty | — | `[]` (3 days after Sunday: outside the window) |
| 2026-11-18 (Wed) | empty | `reviewDay: 3` | `["week"]`, period 9 – 15 Nov |
| 2026-11-20 (Fri) | empty | `reviewDay: 5` | `["week"]`, period 16 – 22 Nov |
| 2026-11-16 | empty | `hidden: new Set(["week:2026-11-09"])` | `[]` |
| 2026-11-30 (Mon) | empty | — | `["month", "week"]`, month November 2026, week 23 – 29 Nov |
| 2026-12-01 (Tue) | empty | — | `["month", "week"]` |
| 2026-12-28 (Mon) | empty | — | `["year", "week"]` |
| 2027-01-05 (Tue) | year 2026 written | — | `["new-year", "quarter", "month"]` |
| 2027-01-05 | year 2026 written | `hidden: new Set(["new-year:2027"])` | `["quarter", "month", "week"]` |
| 2027-01-05 | season ending 2027-01-01, nothing written | — | `["season-ended", "year", "quarter"]` |
| 2026-11-18 | season ending 2026-11-15 | — | `["season-ended"]` |
| 2026-11-18 | season ending 2026-11-25 | — | `["season-ending"]`, title "Your season ends in 7 days" |
| 2026-11-18 | season with `endsOn: null` | — | `[]` |
| 2026-11-18 | 2 goals with `targetDate: "2026-11-01"`; 1 more with that date and `status: "paused"` | — | `["goals-passed"]`, title "2 goals passed their date" |
| 2026-11-18 | empty | `nextStep: "now"` | `["finish-setup"]`, detail "Next: step 2, Your 10s." |

Plus `nextSetupStep` cases:
- `(true, {})` is `null`;
- `(false, { star: "done", now: "started" })` is `"now"`;
- `(false, <every scored setup step "done">)` is `"recap"` if `recap` is not done, else `null`.
  Build the record from `BUILD_STEPS.filter((t) => SCORED_TABS.includes(t))`.

Also `parsePeriodParam` (3.2) cases.

**3.2 Open the Review on a given period.**
- `reviewService.ts`: add
  `export function parsePeriodParam(s: string | undefined): ReviewPeriod | null`.
  - Match `/^(week|month|quarter|year)-(\d{4}-\d{2}-\d{2})$/`, and cast the cadence to
    `OfferedCadence`.
  - Then inside `try { … } catch { return null }`, compute `p = periodOf(cadence, start)`. `periodOf`
    throws on a day like `2026-02-31`.
  - Return `p` only when `p.start === start`, else `null`.
  - Cases:
    - `"week-2026-11-09"` returns 9 – 15 Nov;
    - `"week-2026-11-10"` is null;
    - `"week-2026-02-31"` is null and does not throw;
    - `"fortnight-2026-11-09"` is null;
    - `undefined` is null.
- `PeriodReviewTab.tsx`: add the prop `initialPeriod?: ReviewPeriod | null`. Change line ~76 to
  `useState<ReviewPeriod>(() => initialPeriod ?? periodOf("week", today))`. The prop is read once, when
  the tab mounts.
- `app/(app)/plan/page.tsx`:
  - Widen the `searchParams` type to `Promise<{ step?: string; period?: string }>`.
  - `const { step, period } = await searchParams`.
  - Pass `initialPeriod={parsePeriodParam(period)}`.
  - A link that names a period always also says `step=review`, for example
    `/plan?step=review&period=week-2026-11-09`.
- `NorthStarFlow.tsx`:
  - Prop `initialPeriod?: ReviewPeriod | null`.
  - State `const [reviewPeriod, setReviewPeriod] = useState<ReviewPeriod | null>(initialPeriod ?? null)`,
    declared above the `setTab` callback.
  - Inside `setTab`, after `setTabState(next)`, add `setReviewPeriod(null)`. Every way into a step (rail,
    footer, `goTo`, `endErrand`, links) then forgets a card's period. A card sets it again after
    `setTab` (3.4).

**3.3 The cards.** New `src/goals/components/north-star/DueNow.tsx`.
- Props: `{ cards: DueCard[]; onGo: (c: DueCard) => void; onHide: (c: DueCard) => void }`. With no
  cards, render `null`.
- Otherwise render
  `<section data-testid="due-now" className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">`
  with an `h2` showing `DUE_COPY.heading` (`text-sm font-semibold text-violet-100`).
- Then a `<ul className="mt-3 space-y-2">` with one `<li data-testid={`due-${c.kind}`} className="flex items-center gap-2">`
  per card. Each `li` holds two sibling buttons, never one inside the other:
  - a `type="button" className="flex-1 min-w-0 text-left"` button calling `onGo(c)`, showing `c.title`
    (`block text-[13px] text-zinc-100`) and `c.detail` (`block text-[11.5px] text-zinc-400`);
  - a `type="button" className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200"` button calling
    `onHide(c)`, showing `DUE_COPY.done` for `new-year` and `DUE_COPY.notNow` for every other kind.

**3.4 Wire it in `NorthStarFlow.tsx`.**
- **Hidden cards.**
  - Add `const [hiddenDue, setHiddenDue] = useState<ReadonlySet<string>>(new Set())`.
  - Add an effect keyed on `[userId]`:
    `try { const raw = window.localStorage.getItem(`plan-due-hidden:${userId}`); setHiddenDue(new Set(raw ? (JSON.parse(raw) as string[]) : [])) } catch { /* storage refused: nothing hidden */ }`.
  - `onHideDue(c)`: build `const next = [...hiddenDue, c.key].slice(-60)`, then
    `setHiddenDue(new Set(next))`, then
    `try { window.localStorage.setItem(`plan-due-hidden:${userId}`, JSON.stringify(next)) } catch { /* storage refused: hidden until reload */ }`.
- **The goal opener.** The `tab === "today"` branch passes TodayTab an inline
  `onOpenGoal={(goalId) => { … goTo(…, { label: goal.title, tickId: null, back: "today" }) }}` (line
  ~2010). Move its body into `const openGoalFromToday = (goalId: string) => { … }`, declared just before
  the component's `return (` (line ~1613). Pass `onOpenGoal={openGoalFromToday}`. There is no
  behaviour change.
- **The cards.** Right after `const states = ns.stepStates(plan, account)` (line ~1090):

  ```ts
  const committed = answerOf(plan, COMMIT_DATE_KEY).trim() !== ""
  const dueCards = decision !== null && today
    ? dueNow(plan, today, { reviewDay: DEFAULT_REVIEW_DAY, hidden: hiddenDue, nextStep: nextSetupStep(committed, states) })
    : []
  const dueWeek = dueCards.find((c) => c.kind === "week")
  ```

  `answerOf` is `ns.answerOf`. `COMMIT_DATE_KEY` comes from `@/src/goals/data/northStarStart`; check
  how `RecapTab.tsx:50,399` imports and reads it.
- `onDueGo(c)`, declared next to `openGoalFromToday`:
  - when `"goalId" in c.go`, call `openGoalFromToday(c.go.goalId)` and stop;
  - otherwise call `goTo({ tab: c.go.tab }, { label: c.title, tickId: null, back: "today" })`, then, when
    `c.go.period`, `setReviewPeriod(c.go.period)`.
  - `goTo` calls `setTab`, which clears the period. Setting it after `goTo` wins, because React applies
    the updates in order. The errand ribbon then offers the way back to Today.
- In the `tab === "today"` branch, wrap the existing `<TodayTab …/>` as
  `<div className="space-y-5"><DueNow cards={dueCards} onGo={onDueGo} onHide={onHideDue} /><TodayTab …/></div>`.
- **Review opens on the due week (d11).** On `<PeriodReviewTab`:
  - pass `initialPeriod={reviewPeriod ?? (dueWeek && "period" in dueWeek.go ? dueWeek.go.period ?? null : null)}`;
  - pass `key={reviewPeriod ? reviewIdFor(reviewPeriod) : "now"}`.
  - The key depends only on `reviewPeriod`. When the week card goes away because the review was just
    written, the tab does not remount mid-typing.

**3.5 Browser test.** New `tests/e2e/life-plan-due-now.spec.ts`.
- Use `test("…", async ({ page, account, accountTimezone }) => …)`. `accountTimezone` defaults to
  `Europe/Copenhagen` (`tests/e2e/fixtures/test.ts:199`).
- `const today = getTodayInTimezone(accountTimezone)` from `@/src/shared/dateUtils`.
- `addDays` from `@/src/goals/oneThingService`.

Tests:
- **"an unfinished plan shows Finish your plan first, and Not now hides it":**
  - Seed `planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])`: in use, no north star, not
    committed. `goto(ROUTES.plan)`.
  - The first `li` in `getByTestId("due-now")` has test id `due-finish-setup` and contains
    "step 1, North star".
  - Click its title button, and the current rail card contains "North star".
  - `goto(ROUTES.plan)` again. Click "Not now" on `due-finish-setup` and reload: `due-finish-setup` has
    count 0.
- **"an ended season shows":**
  - Seed the same plan plus
    `season: { id: "s1", startedOn: addDays(today, -40), endsOn: addDays(today, -3), sentence: "Get fit" }`.
  - `goto(ROUTES.plan)`, and `due-season-ended` is visible. It is second at most, behind finish-setup.
- **"a review link opens that week":**
  - Seed the plain plan.
  - `const p = dueWeekPeriod(today, 7)` and
    `goto(`${ROUTES.plan}?step=review&period=${reviewIdFor(p)}`)`.
  - `getByTestId("review-period")` has text `periodLabel(p)`.

**Acceptance:**
- `npx vitest run tests/unit/goals/dueNowService.test.ts tests/unit/goals/reviewService.test.ts`: pass.
- Run e2e on desktop: `life-plan life-mastery blackbox one-thing`. Pass.
  - The cards now sit above Today, so a spec's text match may find two elements. If it does, scope that
    locator to the Today section:
    `page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) / }) })`.
  - Do not change what the spec asserts.
- Run e2e `life-plan-landing mobile-life-mastery` on phone: pass.
- W7.

**Do not touch:** `TodayTab.tsx` (the cards sit above it, in `NorthStarFlow`), Tracking's weekly
reviews, the Dashboard, anything about values.

**Pictures:** W6 after, with `TOUR_STEPS=today,review`, desktop and phone.

### Phase 4. Words, the north star in Review, Today's ratings folded (d9)

**Status:** not started. Depends on: Phase 3.

Copy changes. Each row is an exact replacement of the whole quoted text. First run
`grep -rn "<a distinctive part of the old text>" src tests` for each row. On 2026-11-09 no test asserted
any of these strings.

| Where | Old | New |
|---|---|---|
| `src/goals/data/northStarStart.ts:357` (`ONE_COPY.intro`, shown on the Season step) | "One step, one sentence. The list of everything you want comes next, and it goes better once this is decided — a plan that is a list of everything is a plan nobody runs." | "One step, one sentence. A plan that is a list of everything is a plan nobody runs, so say first what this season is for." |
| `northStarStart.ts:391` | "One line each. These are not notes — each becomes a real goal, filed in the area it belongs to. They stay in your plan until the Track step at the end, which is what puts them on your goals and tracking pages." | "One line each. These are not notes — each becomes a real goal, filed in the area it belongs to." |
| `src/goals/data/northStar.ts:1991` (`REVIEW_INTRO.dailyNote`) | "The ratings and the 10s live on the Where you are tab. This tab reads them back beside the goals in that area." | "The ratings and the 10s live on the Your 10s step. This step reads them back beside the goals in that area." |
| `northStar.ts:2320` (`toGoalsHelp`, beside the "Write the goals for …" button) | "The goals live on the next tab. This one is the picture they are aimed at." | "Write the goals with the button beside this. This is the picture they are aimed at." |
| `northStar.ts:2323` (`fromGoalsEmpty`) | "No 10 written for this area yet. Write it first, on Where you are, and the goals have something to aim at." | "No 10 written for this area yet. Write it first, on Your 10s, and the goals have something to aim at." |
| `northStar.ts:2068` | "Nothing from elsewhere reaches this area yet." | "Nothing else runs in this area yet." |
| `northStar.ts:1023` | "… His way in: if you looked your own name up in the dictionary, what would it say about you?" | "… One way in: if you looked your own name up in the dictionary, what would it say about you?" (only those two words change) |
| `northStar.ts:1025` | `"His: “I'm an extraordinarily loving man…` | `"For example: “I'm an extraordinarily loving man…` (only the first word changes) |
| `northStar.ts:1031` | "… His own list is short and every line starts with to be." | "… Keep the list short, and start every line with to be." |
| `northStar.ts:1033` | `"His: “to be fun, playful, outrageous.…` | `"For example: “to be fun, playful, outrageous.…` |
| `northStar.ts:1292` | "… He lived that way for years and says it is the thing he would change first." | "… One coach lived that way for years and calls it the first thing to change." |
| `northStar.ts:1297` | "He put fitness above health for a while, did two fitness competitions, and was the most ripped and the least healthy he has ever been. …" | "One coach put fitness above health for a while and did two fitness competitions: the leanest body and the worst health, at the same time. …" (the rest of the string stays) |
| `northStar.ts:1302` | "… His version of this: if you check email …" | "… One example: if you check email …" |
| `northStar.ts:1803` | `note: "His own default. Past a year a goal gets hard to measure."` | `note: "A good default. Past a year a goal gets hard to measure."` |
| `northStar.ts:2296` | "Your 10 is yours. His 10 for his body is 170 pounds at 6 percent body fat and six hours of sleep. …" | "Your 10 is yours. One person's 10 for their body is 170 pounds at 6 percent body fat and six hours of sleep. …" (the rest stays) |
| `NorthStarFlow.tsx:1650` | `<h1 className="text-2xl font-semibold">Life Mastery</h1>` | `<h1 className="text-2xl font-semibold">Your plan</h1>` |

**4.1 "from elsewhere" (F8).** In `src/goals/components/north-star/AreaGoalsDialog.tsx:214` and
`AreaDialog.tsx:368`, replace `{r.areaId !== area.id && " · from elsewhere"}` with
`{r.areaId === null ? " · for every area" : r.areaId !== area.id ? " · from another area" : ""}`.
Routines like Morning belong to no area (`areaId` null).

**4.2 The footer (F10).** In `NorthStarFlow.tsx` (~2293-2297), the expression is
`!plan.updatedAt && !unsent ? "Nothing written yet" : serverState === "saved" && !unsent ? "Saved to your account." : "Saved on this device."`.
- Insert one branch before the last:
  `: loaded && serverState === "unknown" && !unsent ? "Saves to your account as you write."`.
- `"unknown"` is a `SyncState` member (`lifePlanSync.ts:287`). Only a plan that has never been saved
  to the account is in that state after loading.
- Read `tests/unit/goals/footerTellsTheTruth.test.ts` and `tests/unit/goals/northStarFlowSaves.test.tsx`
  first. If one asserts "Saved on this device." for that state, change that assertion to the new text
  and nothing else.

**4.3 The icons (F12).**
- In `src/goals/data/northStarBuild.ts`, in the object holding `goalsLabel: "Goal sets"`, add
  `kindsLegend: "🔁 practice · 🎯 target · 🏁 finish line"`.
- In `BuildBoard.tsx`, right after `<p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{BOARD_COPY.help}</p>`
  (line ~157), add `<p className="text-[10.5px] text-zinc-500 mt-1">{BOARD_COPY.kindsLegend}</p>`.
- It appears once, at the top of the ready-made sets. Other screens with these icons are left as they
  are.

**4.4 The north star at the top of Review.**
- In `PeriodReviewTab.tsx`, inside the first card (the `<div>` holding `{COPY.title}` at ~90 and the
  `review-last` paragraph at ~93), after `review-last`, render when `plan.northStar.trim() !== ""`:
  `<blockquote data-testid="review-north-star" className="mt-3 border-l-2 border-violet-400/40 pl-3 text-[12.5px] text-zinc-300 whitespace-pre-wrap">{plan.northStar.trim()}</blockquote>`
  followed by `<p className="text-[11px] text-zinc-500 mt-1">{COPY.readStarFirst}</p>`.
- Add `readStarFirst: "Read it once before you look back."` to `REVIEW_PERIOD_COPY`
  (`northStar.ts:611`).

**4.5 Fold "How today went" (Q7, F14).** In `TodayTab.tsx`:
- Add `const [feltOpen, setFeltOpen] = useState(false)` next to the component's other hooks (they run
  from ~852). All early returns come after them (~1110), so the hook order stays fixed.
- The section whose `h2` is `{TODAY_COPY.feltTitle}` (~1470): replace that `h2` with
  `<h2 className="text-sm font-semibold text-zinc-200"><button type="button" aria-expanded={feltOpen} onClick={() => setFeltOpen((o) => !o)} className="text-left">{TODAY_COPY.feltTitle} <span className="text-[11px] font-normal text-zinc-500">{TODAY_COPY.feltCount(rated, plan.areas.length)}</span></button></h2>`,
  where `const rated = plan.areas.filter((a) => dailyRating(plan, today, a.id) != null).length`.
  `dailyRating` is what `ScoreRow` reads at ~1477.
- Render the `feltHelp` paragraph and the score grid only when `feltOpen`. The note box under them
  ("Anything worth remembering about today", ~1485-1497) and everything after it stay visible.
- Add `feltCount: (n: number, of: number) => `${n} of ${of} rated`` to `TODAY_COPY`.

**Tests:**
- In `life-plan-landing.spec.ts`:
  - **"Review shows the north star":** seed `{ ...planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }]), northStar: "A calm, strong life." }`.
    Open `?step=review`, and `review-north-star` contains "A calm, strong life.".
  - **"How today went starts folded":** open `?step=today` on the same seed. The button named
    `/^How today went/` has `aria-expanded="false"`, and the button named `/today: 4 out of 10/` has
    count 0. The labels are `` `${area.label} today: ${n} out of 10` `` (`TodayTab.tsx` ~1482).
- `life-mastery-track.spec.ts` rates on Today at lines 213 and 223, with a reload at 220. Click "How
  today went" before 213, and again after the reload, before 223.
- Find any other spec that rates on Today with `grep -rn "today: " tests/e2e`, and give it the same
  click.

**Acceptance:**
- `npx vitest run tests/unit/goals`: pass.
- `grep -nE "\b(His|He) " src/goals/data/northStar.ts` prints no line among 1023, 1025, 1031, 1033,
  1292, 1297, 1302, 1803 and 2296.
- Run e2e on desktop: `life-plan life-mastery blackbox one-thing`. Pass.
- Run e2e on phone: `life-plan-landing mobile-life-mastery`. Pass.
- W7.

**Do not touch:** anything about values (`VALUES_INTRO`, `ValuesWork`, the value lists), the Journal's
weekly set, Tracking's weekly reviews, `SEASON_BAND_COPY`.

**Pictures:** W6 after, with `TOUR_STEPS=today,review,pick`, desktop and phone.

### Phase 5. One weekly reminder on the phone (d4)

**Status:** not started. Depends on: Phases 1 to 4 live. The owner's yes for the migration is already
given: do not ask.

**One device switch (decided).** `push_devices.enabled` is a device's switch for reminders:
`notificationsRepo.ts` says "Reminders and tests go to devices with reminders on". The audit's pings and
this weekly reminder share it, so a device switched off gets neither. This phase adds no second device
switch. Its own on/off is `life_plan_reminders.push_on`.

**5.0 Check the live build.**
- `curl -s https://daygame-coach.vercel.app/api/healthz` gives a `buildId`. Run
  `git merge-base --is-ancestor 9206ad99 <buildId>`. It must exit 0: the live site has the audit's
  pings, which changed the same files.
- If it does not, wait 10 minutes and retry once. If it still fails, write "waiting for the audit's
  pings to be live" in the status line and stop.
- Read `src/audit/pingService.ts` for three things only:
  - how it wraps each row in try/catch;
  - which `PushPayload` fields it sets;
  - how `app/api/notifications/tick/route.ts` calls it and names its key.

  Copy none of its `actions`, `promptId`, `slotAt` or `sendId`.

**5.1 Migration** `supabase/migrations/<yyyymmddhhmmss>_plan_review_reminder.sql`, with
`supabase/migrations/rollback/<same>_plan_review_reminder.down.sql`.

```sql
create table if not exists public.life_plan_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_on boolean not null default false,
  review_day smallint not null default 7 check (review_day between 1 and 7),
  review_hour smallint not null default 19 check (review_hour between 6 and 22),
  updated_at timestamptz not null default now()
);
alter table public.life_plan_reminders enable row level security;
drop policy if exists "own reminder row" on public.life_plan_reminders;
create policy "own reminder row" on public.life_plan_reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_plan_reminders from anon;
revoke truncate on public.life_plan_reminders from authenticated;

-- The kind list. Re-read the newest definition first:
--   grep -ln "notification_sends_kind_check" supabase/migrations/*.sql | sort | tail -1
-- On 2026-11-09 it was ('test','timetrack-running','timetrack-alert','audit-ping','audit-end').
-- Write that newest list plus 'plan-review'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end', 'plan-review'));
create unique index if not exists notification_sends_one_plan_review
  on public.notification_sends (entry_id) where kind = 'plan-review';

-- Weekly reminders due at p_now: the person's weekday and hour, in their zone, first 20 minutes.
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

-- Whether a week review holds anything written. Answers a yes/no only, so no review text leaves the database.
create or replace function public.plan_week_review_written(p_user uuid, p_start date)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.life_plan_reviews as v
     where v.user_id = p_user and v.cadence = 'week' and v.period_start = p_start
       and (btrim(coalesce(v.magic_moments, '')) <> '' or btrim(coalesce(v.lessons, '')) <> ''
            or btrim(coalesce(v.next_outcomes, '')) <> ''
            or exists (select 1 from public.life_plan_review_goals as g where g.review_id = v.id))
  )
$$;
revoke all on function public.plan_week_review_written(uuid, date) from public, anon, authenticated;
grant execute on function public.plan_week_review_written(uuid, date) to service_role;
```

Then redefine `public.notifications_clock_tick()`:
- Paste the newest definition whole. Find it with
  `grep -iln "function public.notifications_clock_tick" supabase/migrations/*.sql | sort | tail -1`.
  On 2026-11-09 that was `20261109110000_energy_audit.sql`. Use `-i`: one older file writes it in
  capitals.
- Change only its gate line. It reads `if not exists (…) and not exists (…) and not public.timetrack_alert_due() then`.
  Add `and not exists (select 1 from public.plan_reviews_due(1))` before `then`.
- Keep its `revoke` line, and end the migration with `notify pgrst, 'reload schema';`.

The rollback file starts with a header in capitals: "DELETES REMINDER SETTINGS AND THEIR SEND RECORDS".
Then, in this order:
1. The previous `notifications_clock_tick()` definition, pasted whole, with its revoke.
2. `drop function if exists public.plan_week_review_written(uuid, date);`
3. `drop function if exists public.plan_reviews_due(integer, timestamptz);`
4. `drop index if exists public.notification_sends_one_plan_review;`
5. `delete from public.notification_sends where kind = 'plan-review';`
6. Drop and re-add `notification_sends_kind_check` with the previous list, written out literally.
7. `drop table if exists public.life_plan_reminders;`
8. `notify pgrst, 'reload schema';`

Rehearse on the local test database, only when no other session's e2e is running (B4). Apply the
migration, then the rollback, then the migration again, each with
`docker exec -i supabase_db_daygame-tests psql -U postgres -v ON_ERROR_STOP=1 < <file>`. Each must end
without error.

**5.2 Server.**
- `src/db/notificationsRepo.ts`:
  - add `"plan-review"` to `SendKind`;
  - add it to the first `openSend` overload's `Exclude<…>`;
  - add it to the `23505` branch (`kind === "timetrack-alert" || …`), so a duplicate answers null.
- `src/notifications/pushService.ts` needs no change. Its private `topicOf` returns the kind itself for
  non-timer kinds, so `"plan-review"` gets its own topic.
- New `src/db/lifePlanRemindersRepo.ts`:
  - `export interface Reminder { pushOn: boolean; reviewDay: number; reviewHour: number }`.
  - `readReminder(userId)` uses `await createServerSupabaseClient()` (signed-in; row security guards
    it). It returns the row mapped to `Reminder`, or `{ pushOn: false, reviewDay: 7, reviewHour: 19 }`.
  - `writeReminder(userId, patch: Partial<Reminder>)` uses the signed-in client. It builds the row only
    from keys present in `patch`, plus `user_id: userId` and `updated_at: new Date().toISOString()`,
    and upserts with `{ onConflict: "user_id" }`. A missing field keeps its stored value, or the table
    default on a new row. It never takes `user_id` from a request body.
  - `remindersDueAsServer(limit: number, now: Date)` uses `createAdminSupabaseClient()` and
    `.rpc("plan_reviews_due", { p_limit: limit, p_now: now.toISOString() })`.
  - `weekReviewWrittenAsServer(userId: string, periodStart: string)` uses the admin client:
    `.rpc("plan_week_review_written", { p_user: userId, p_start: periodStart })`. It returns the boolean
    and throws on error.
- New `src/goals/reviewReminderService.ts`:
  - `export function reminderPayload(p: ReviewPeriod): PushPayload`, pure. It returns
    `{ title: "Weekly review", body: `Look back at ${periodLabel(p)}: score, magic moments, next week.`, url: `/plan?step=review&period=${reviewIdFor(p)}`, tag: "plan-review", renotify: false }`
    and nothing else. If `PushPayload` requires a field this leaves out, fill it the way
    `pingService.ts` does for a field of the same name. Never add `actions`. The tag is required:
    without it the worker shows the reminder under the audit's tag and title.
  - `export async function runPlanReviewClock(now = new Date()): Promise<{ sent: number; skipped: number; failed: number }>`.
    For each row of `remindersDueAsServer(200, now)`, inside its own try/catch, logging only the user
    id and the error message:
    1. `const p = dueWeekPeriod(row.local_day, row.review_day)` from `./dueNowService`.
    2. `const entryId = `plan-review:${row.user_id}:${row.local_day}``. This matches the SQL character for
       character: PostgREST returns a `date` as `YYYY-MM-DD`.
    3. If `await weekReviewWrittenAsServer(row.user_id, p.start)`:
       - `const id = await openSend(row.user_id, "plan-review", now, entryId)`;
       - if `id !== null`, `await closeSend(id, { devices: 0, delivered: 0, removed: 0 })`;
       - count it as `skipped`. This records "written, nothing to send", so the clock stops asking this
         week. A null `id` means another tick got there first.
    4. Else call only
       `await sendToPerson(row.user_id, "plan-review", () => reminderPayload(p), now, { entryId })`, and
       count `sent`. Never call `openSend` first: `sendToPerson` opens the record itself
       (`pushService.ts:148-149`), and a second record with the same `entryId` is refused, so nothing
       would be sent.
    5. A thrown error counts as `failed`. A delivery that fails is not retried that week. When the
       server has no push keys, `sendToPerson` throws before any record exists, so the clock calls again
       each minute for 20 minutes and fails each time. Both are accepted.
- `app/api/notifications/tick/route.ts`: call `runPlanReviewClock()` next to the other two, with its own
  `.catch`, and add its result to the response under the key `planReviews`.
- New `app/api/life-plan/reminders/route.ts`:
  - `GET` and `PUT`. Both start with `requireAuth()` from `@/src/db/auth`, as
    `app/api/timetrack/stop/route.ts` does. No `proxy.ts` change: the API is outside its matcher, and
    the handler checks the user itself.
  - `GET` returns `{ ...await readReminder(id), hasEnabledDevice: (await listDevices(id)).some((d) => d.enabled) }`,
    with `listDevices` from `@/src/db/notificationsRepo`.
  - `PUT`:
    - copy `stop/route.ts`'s `fromAnotherSite` check (403) and its JSON content-type check (415);
    - accept only the keys `pushOn` (boolean), `reviewDay` (integer 1–7) and `reviewHour` (integer
      6–22). Any other key or type is a 400;
    - call `writeReminder` and return the new `readReminder`.
  - Both answer with `Cache-Control: no-store`.
- `tests/unit/notifications/textStaysPrivate.test.ts`: add `"src/goals/reviewReminderService.ts"`,
  `"src/db/lifePlanRemindersRepo.ts"` and `"app/api/life-plan/reminders"` to `SERVER_CODE`.
- **Write-coverage ratchet.** `tests/unit/writeCoverage.test.ts` scans `src/db/*Repo.ts` and
  `src/**/*Service.ts`, and its unasserted ceiling must not rise.
  - Each new write function (`writeReminder`, `runPlanReviewClock`) must be named in a test that checks
    what it wrote. See 5.4.
  - Classify each as "asserted" in `tests/support/writeCoverage.baseline.json`, the way the audit's
    writes are.

**5.3 Screen.**
- **State, in `NorthStarFlow.tsx`.**
  - `const [reminder, setReminder] = useState<(Reminder & { hasEnabledDevice: boolean }) | null>(null)`.
  - An effect keyed on `[decision !== null]` that, once `decision !== null`, runs
    `fetch("/api/life-plan/reminders")`. On `ok`, it stores the JSON; on any failure it leaves `null`.
  - In the `dueNow(...)` call from 3.4, use `reviewDay: reminder?.reviewDay ?? DEFAULT_REVIEW_DAY`.
- **New `src/goals/components/north-star/ReviewReminder.tsx`.**
  - Props: `{ reminder: (Reminder & { hasEnabledDevice: boolean }) | null; onChange: (next: Reminder & { hasEnabledDevice: boolean }) => void }`.
  - Render nothing while `reminder` is `null`.
  - Contents:
    - a heading, "Remind me on my phone";
    - a `<button type="button" role="switch" aria-checked={reminder.pushOn}>` switch;
    - a weekday `<select>` with options Monday to Sunday, values 1 to 7;
    - an hour `<select>` from 06:00 to 22:00, values 6 to 22.
  - Each change sends `PUT /api/life-plan/reminders` with only the changed key. On 200, it calls
    `onChange({ ...result, hasEnabledDevice: reminder.hasEnabledDevice })` and shows "Saved to your
    account.". On failure it shows "Not saved. Try again." and keeps the old values.
  - **Device block,** shown when `reminder.pushOn && !reminder.hasEnabledDevice`. It uses
    `usePushDevice()` from `@/src/notifications/hooks/usePushDevice` and shows, in this order of checks:
    - `push.support === "unsupported" || push.support === "dev"`: "This browser can't show
      notifications. Open the app on your phone to switch them on."
    - `push.support === "needs-install"`: "On an iPhone, add this site to your home screen first, then
      open it from there."
    - `push.permission === "denied"`: "Notifications are blocked for this site. Allow them in your
      phone's settings, then come back."
    - otherwise a `<button type="button" disabled={push.busy}>` "Turn on notifications on this phone",
      calling `void push.turnOn().then((ok) => { if (ok) onChange({ ...reminder, hasEnabledDevice: true }) })`.
  - All words go in a `REVIEW_REMINDER_COPY` object in `src/goals/data/northStar.ts`, after `DUE_COPY`.
- **Placement.** In `PeriodReviewTab.tsx`:
  - add the props `reminder` and `onReminderChange`;
  - render `<ReviewReminder reminder={reminder} onChange={onReminderChange} />` right after the first
    card (the `<div>` holding `{COPY.title}` and `review-last`), only when `period.cadence === "week"`;
  - `NorthStarFlow` passes `reminder={reminder}` and `onReminderChange={setReminder}`.

**5.4 Tests.**
- **Integration,** new `tests/integration/repos/lifePlanReminders.integration.test.ts`.
  - Use the helpers the other files in `tests/integration/repos/` use. Read
    `pushPlumbing.integration.test.ts` for the fake push keys and the fake `web-push`.
  - Run it only when no other session's e2e or soak is using the test database (B4).
  - Filter every result of `plan_reviews_due` to this test's own user ids: other tests' rows exist.
  - Cases:
    - Another account cannot read or write a row through the signed-in client, and `anon` cannot read.
    - `writeReminder(id, { reviewHour: 8 })` after `{ pushOn: true }` keeps `pushOn: true`. This is the
      assertion for the write-coverage ratchet.
    - `remindersDueAsServer(10, <instant>)` returns the person at their weekday and hour in their zone.
      It returns nobody one hour later, at minute 20, with `push_on` false, or with no enabled device.
    - Two `runPlanReviewClock(<same instant>)` calls send once: the fake `web-push` saw one delivery,
      and `notification_sends` has one `plan-review` row.
    - A written week sends nothing and leaves one `plan-review` row with `devices = 0`.
    - `plan_week_review_written` is false for a scores-only review and true for a review with one
      verdict.
- **Unit,** `tests/unit/goals/reviewReminderService.test.ts`:
  `reminderPayload(periodOf("week", "2026-11-09"))` equals exactly
  `{ title: "Weekly review", body: "Look back at 9 – 15 Nov 2026: score, magic moments, next week.", url: "/plan?step=review&period=week-2026-11-09", tag: "plan-review", renotify: false }`,
  plus whatever field 5.2 had to add. No review text can reach it: it takes only a period.
- **Unit,** `tests/unit/goals/remindersRoute.test.ts`: 400 for each bad body (unknown key, `reviewHour: 5`,
  `reviewHour: 23`, `reviewDay: 0`, `pushOn: "yes"`), 403 from another site, 415 for a non-JSON body.
  Mock the repo the way other route unit tests do: `grep -rln "requireAuth" tests/unit | head -3`.
- **Unit,** one case in `tests/unit/shared/serviceWorkerPush.test.ts`. Show `reminderPayload(...)` and
  check that the notification has tag `plan-review`, title "Weekly review" and `renotify: false`, and
  that its data url ends with `/plan?step=review&period=week-2026-11-09`. This is a regression guard: it
  passes against today's worker.
- **Playwright,** in `life-plan-landing.spec.ts`: open `?step=review`, switch the reminder on, pick
  Monday and 08:00, reload, and expect the same values.
- **The worker, end to end:** do it the way energy-audit Phase 5 step 6 did (read that step in
  `Plans/energy-audit.md`):
  - a production build in the worktree against the test stack;
  - `/plan?step=review` opened with the `notifications` permission granted;
  - the payload delivered through CDP;
  - `registration.getNotifications()` checked for the title and tag.
  - If headless Chromium refuses, write "not proven" in the status line.

**5.5 Live.**
1. The security review (W9) is done and its real findings are fixed.
2. Back up the owner's `push_devices` and `notification_sends` rows (`json_agg`, one query per table)
   to `~/dg-backups/life-plan-reminders-<date>.json`, then `chmod 600` it. Use the linked scratch folder
   and `supabase db query --linked "<select …>"`, SELECTs only. The rows hold device keys: never put them
   in the repo.
3. `supabase migration list --linked`: only this migration is pending. If another is pending, stop and
   say which.
4. `supabase db push --linked --yes`. The owner's yes is already given.
5. Ship the code (W8). This order is safe because `push_on` defaults to false: nothing is sent until the
   owner switches it on in the new build.
6. Check read-only with `supabase db query --linked`:
   - `select count(*) from pg_proc where proname in ('plan_reviews_due','plan_week_review_written')` is
     2;
   - `select status from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'notifications-clock') order by start_time desc limit 5`
     shows `succeeded`.
7. **To undo:** roll back the code alone (revert the commit and push). That is enough, because nothing
   sends while `push_on` is false. Running the down file on the live database deletes the owner's
   reminder row and send records, so ask him first.

**Do not touch:** the audit's and the timer's functions (apart from pasting the clock function with one
line changed), `public/sw.js`, what the device switch means.

**Pictures:** W6 after, with `TOUR_STEPS=review`, desktop and phone. Also take a phone picture of the
review step with the reminder switched on.

**After Phase 5:** ask the owner about values (R1), as he asked.

## How this survives a rebuild

These behaviours carry over whatever the code looks like:

1. Opening the plan with no step asked lands on Today once the plan has an active goal or a routine
   step. Otherwise it lands on the first setup step.
2. When the plan is in use, the daily and weekly screens come first: Today, Review, Journal, Track. The
   8 setup steps sit behind "Edit your plan". On a phone the step list is one line, open at first while
   the plan is not in use.
3. Today starts with at most 3 "Due now" cards, each with "Not now", in this order:
   - finish your plan (until committed);
   - season over or ending (within 7 days);
   - plan the new year;
   - year review (26 Dec – 15 Jan);
   - quarter review (the first 14 days, or the last day);
   - month review (the first 7 days, or the last day);
   - week review (3 days from the chosen day);
   - goals past their date.
4. A review counts as done only when something is written in it or a goal has a verdict. Scores alone
   do not count.
5. One phone notification a week, at a day and hour the person picks (default Sunday 19:00, hours 6–22),
   only while that week's review is unwritten. Its text never contains what the person wrote.
6. Committing points to Today. The Review starts with the north star. Opening Review from the step list
   opens the week the card is about.

## The executor prompt

Give this to the model that builds it, one phase per session, or all phases in one session if it has
room:

> Build `Plans/life-plan-after-setup.md` in the daygame-coach repo
> (`/home/jonaswsl/projects/daygame-coach`), one phase at a time, in order: 0, 1, 2, 3, 4, 5.
> The owner has said go, and has said yes to Phase 5's database change without being asked again.
> Read the whole plan first, then for each phase:
> 1. Find the first phase whose **Status** line is not "Built and live". Do only that phase, unless
>    you have room to continue to the next.
> 2. Follow its steps exactly, and the "Working setup" section (W1–W10) for worktree, server, tests,
>    checks, shipping, review and reporting. Do not redesign anything. Where the plan gives a file,
>    function, string or command, use it as written. Where the code differs from the plan (a line
>    moved, a name changed), find the same place by its content and carry on. Write the difference in
>    the status line.
> 3. Stop and tell the owner in plain words if:
>    - a test fails in a way the plan does not cover;
>    - the plan would make you delete or remove anything;
>    - anything would cost money;
>    - the live database shows more than the plan's own migration pending.
>    Never run a rollback file on the live database without asking him.
> 4. Use test accounts on the local test stack only, never the owner's account. Write "built" or
>    "live", never "done".
> 5. At the end of each phase: `/code-review`, the checks in W7, ship (W8), update the status line and
>    the decision page (W10). Then report to the owner in a few plain lines: what changed for him, what
>    you could not prove, and the page link.
