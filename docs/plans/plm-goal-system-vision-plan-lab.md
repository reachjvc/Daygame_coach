# PLM-Style Goal System — Vision-Plan Lab Extension

**Status:** SHIPPED 2026-07-21 (all 6 milestones; lab renamed "Life Mastery" on /test; verified via unit tests + headless Playwright walk incl. old-payload compat) · **Target:** `/test/vision-plan` (localStorage sandbox, no DB/RLS/auth changes) · **Execution:** one-shot, single agent

**Blueprint v2 SHIPPED 2026-07-24** — deep research round 2 (video transcript + whiteboard frame captures of youtube Kz83kMosOWU + canonical course slide): Stefan's real artifact is a PYRAMID (9 bands, Health+Fitness base → Contribution apex, Spirituality = foundation band + dotted circle; frame Vision/What? · Purpose/Why? · Goals/How?), "10 really 12" areas with verbatim sub-labels, weekly 1-10 self-rating vs YOUR ideal, success = 7+ per area. Built: `data/lifeMasteryAreas.ts` (12 canonical areas, validated 12-hue palette), `LifeMasteryWheel` (12-spoke wheel of life, dashed 7+ success ring, amber weak spots, avg hub), `BlueprintPyramid` (Plan mode, plan-coverage lighting via pillar→area map), Weekly Evaluation rewired to all 12 areas (sub-labels, per-area prompts, last-week chips, prefill-from-last-week, focus from 12 areas), `lastRatingsBefore` helper. Old reviews (pillar-keyed) still parse/render.
**Research basis:** Project Life Mastery (Stefan James) verified blueprint — life areas → vision → purpose → timeframed result goals → process goals → daily rituals/RPM planning, with daily/weekly/monthly review loops. PLM ships this as PDFs + willpower; we ship it as software.

---

## Part 1 — Human explanation

### What we already have (do NOT rebuild)
The vision-plan lab already implements most of PLM's core: life-area pillars, vision → intents → LLM goals, per-goal "why" (purpose), result-vs-process split (`milestone_ladder` vs `habit_ramp`), routine library (morning/night/work/workout/social), deterministic balancer, Today checklist, per-goal pace, LifeAreaWheel.

### What PLM has that we don't — the 6 gaps this plan closes
1. **Goal horizons** — every PLM goal gets an explicit timeframe (1/3/5/10/20 yr). We add a horizon chip per goal (reusing the existing `horizonService` buckets: Now / Quarter / Year / Vision) driven by target date; the LLM assigns target dates at generation.
2. **Daily vision surfacing** — PLM's #1 retention trick: read your vision every morning. Track view gets a Vision card at the top with a once-per-day "reviewed" check that counts like a habit.
3. **Morning ritual builder** — an *ordered* ritual checklist (distinct from goal habits), assembled from the routine library, with 15/30/60-minute presets. Shows as its own section on Today with per-item checkboxes.
4. **RPM daily planner** — star up to 5 "must items" from today's due habits/tasks + free-text ad-hoc items; everything else is a could-do list; unfinished ad-hoc items roll to tomorrow automatically.
5. **Weekly Evaluation Ritual** — after each week: rate every life area 1–10, see the week's per-goal adherence, write one note, pick next week's focus area. Ratings overlay on the wheel.
6. **Monthly Goals Report** — deterministic monthly rollup (per-goal adherence + pace, area percents, rating trend) plus optional LLM coach commentary via the existing Claude CLI pattern (fail-closed 502, no fallback).

### What the user will see
Plan mode unchanged except a horizon chip on each goal card. Track mode gains: Vision card (top) → Morning Ritual checklist → Today (with must-item stars + ad-hoc adds) → pace rows; a "Review" tab area with weekly review flow and monthly report.

### Why sandbox-only
Matches the lab's contract ("nothing here reads or writes your real goals"). Promotion to the production goals hub is a separate, later plan.

---

## Part 2 — AI execution section

### Ground rules
- All new logic = pure functions in `src/goals/visionPlanService.ts`; all new types in `src/goals/types.ts` (vision block, lines 570–810); UI in `src/goals/components/vision-plan/VisionPlanLab.tsx`. No new slices, no DB, no migrations, no RLS. No API changes except M6's optional report route.
- **State compat:** every new `VisionPlanState` field is optional in `VisionPlanStateSchema` (visionPlanService.ts:557) so existing `visionPlanSandbox_v1` localStorage payloads still parse. `parseVisionPlanState` (571) must not throw on old payloads — add unit test.
- Run `npm test` after every milestone. New unit tests in `tests/unit/goals/visionPlanService.test.ts`. Icons: reuse only icons already used in the lab or get user approval (CLAUDE.md rule 10) — prefer text/chevron/existing check circles; NO new icon roles.
- Follow existing collapsible pattern (`GoalCategorySection` style: chevron + uppercase label + count) for new Track sections.

### Milestone 1 — User can see and edit a horizon on every goal
- Types: add `targetDate` already exists on `VisionGoalDraft` (types.ts:809). No new field.
- Wire `src/goals/horizonService.ts` (`classifyHorizon` L47, `HORIZON_META` L20, `suggestedTargetDate` L96) into the lab: goal card shows horizon chip derived from `targetDate` (fallback: derive from type — `habit_ramp` → now, `milestone_ladder` with no date → quarter).
- LLM: extend `buildGoalGenPrompt` (visionPlanService.ts:241) with one rule — assign `targetDate` (ISO) per goal sized to ambition; extend `LlmGoalGenSchema` (209) + `parseGoalGenResponse` (288) to accept optional `targetDate` (validate parseable ISO, else fail-closed).
- Card editor: date input sets `targetDate`; chip updates live.
- **Acceptance:** unit tests — classify mapping for each bucket boundary; parser accepts/rejects targetDate; e2e-light: chip renders per goal.

### Milestone 2 — User can review their vision daily
- Types: `VisionProgress` (types.ts:608) gains optional `visionReviews?: string[]` (ISO dates).
- Service: `markVisionReviewed(progress, date)`, `visionReviewedOn(progress, date)` pure helpers.
- UI: Track mode, above Today: Vision card showing `state.vision` text + per-area purpose (goal `why` lines grouped by pillar, collapsed) + "I've read my vision today" check circle → pushes today into `visionReviews`.
- **Acceptance:** unit tests for idempotent mark + date scoping; card check persists across reload (localStorage).

### Milestone 3 — User can build and complete an ordered morning ritual
- Types: `VisionRitualItem { id; title; minutes }`, `VisionRitual { items: VisionRitualItem[]; preset: 15|30|60|null }`; `VisionPlanState.ritual?: VisionRitual`; `VisionProgress.ritualCompletions?: Record<string /*date*/, string[] /*itemIds*/>`.
- Data: extend `src/goals/data/visionRoutineLibrary.ts` morning category items with default `minutes`; add 3 preset compositions (15/30/60-min) as exported constants.
- Service: `applyRitualPreset`, `moveRitualItem` (reorder), `toggleRitualItem(progress, date, itemId)`, `ritualAdherence(progress, ritual, startDate, endDate)`.
- UI: Plan mode gains a "Morning Ritual" builder panel (pick from library, reorder up/down buttons, preset buttons); Track/Today shows ordered ritual checklist section above goal habits.
- Ritual items are NOT goal habits — do not feed `balancePlan` (visionPlanService.ts:439); they have their own completion store.
- **Acceptance:** unit tests — preset apply, reorder, toggle idempotence, adherence math; reload persistence.

### Milestone 4 — User can plan their day RPM-style (3–5 must items + rollover)
- Types: `VisionDayPlan { mustIds: string[]; adhoc: { id; title; done: boolean }[] }`; `VisionProgress.dayPlans?: Record<string /*date*/, VisionDayPlan>`.
- Service: `toggleMustItem(progress, date, id)` — cap 5, starring a 6th rejected (return unchanged); `addAdhocItem`, `toggleAdhocItem`; `rolloverAdhoc(progress, fromDate, toDate)` — copies undone ad-hoc items forward exactly once (no dupes on repeat calls); call on Track mount for yesterday→today.
- UI: Today section — star toggle on each due habit/task row; starred items float to a "Must (n/5)" block at top; unstarred remain as could-do list below; text input to add ad-hoc items; rolled-over items marked subtly ("from yesterday").
- **Acceptance:** unit tests — 5-cap, rollover idempotence, rollover skips done items; must block renders starred first.

### Milestone 5 — User can run a Weekly Evaluation Ritual
- Types: `VisionWeeklyReview { weekStart: string; areaRatings: Record<pillarId, number /*1-10*/>; note: string; focusPillarId: string | null }`; `VisionProgress.weeklyReviews?: VisionWeeklyReview[]`.
- Service: `weekWindow(startDate, offset)` → {start,end}; `rollupForRange(goals, balanced, progress, start, end)` — per-goal done/expected within range (generalize `goalRollup` visionPlanService.ts:782 / `expectedToDate` 765 to accept a range; keep existing signatures working); `saveWeeklyReview` (upsert by weekStart); `latestReviewDue(progress, today)` — true when a completed week has no review.
- UI: Track mode banner when review due → inline review flow: (1) week adherence per goal (from rollupForRange), (2) 1–10 slider per active life area, (3) one note textarea, (4) pick focus area → save. Past reviews listed collapsed. Wheel: when latest review exists, render rating ticks on each area arc (small marker at rating/10 of arc radius — extend `LifeAreaWheel` VisionPlanLab.tsx:368).
- **Acceptance:** unit tests — weekWindow boundaries, range rollup vs full rollup consistency, upsert-by-weekStart, due detection (no review until a full week has elapsed).

### Milestone 6 — User can read a Monthly Goals Report
- Service: `monthlyReport(state, balanced, progress, monthStart)` → `{ perGoal: {goalId, adherence, pace, tasksDone/Total}[]; areas: VisionAreaRollup[]; ritualAdherence; visionReviewRate; ratingTrend: {weekStart, avg}[] }` — pure, reuses M5 range rollup.
- UI: "Report" section in Track mode, month picker (only months since `progress.startDate`), renders the deterministic report.
- Optional LLM commentary: new route `app/api/goals/vision-plan/report/route.ts` (≤50 lines, mirror `refine/route.ts` — `requireAuth`, zod request schema, `queryVisionClaude`, fail-closed 502). Prompt builder `buildReportCommentaryPrompt(report)` + `parseReportCommentary` (plain text, non-empty, length-capped) in visionPlanService.ts. Button "Coach commentary" → shows returned text; error → visible error state, never fake content (CLAUDE.md rule 15 spirit).
- **Acceptance:** unit tests — report math on fixture progress (known adherence), month picker bounds; route test not required (matches existing vision-plan route coverage level); architecture test must pass (route ≤50 lines, no business logic).

### Sequencing & ownership
Single agent, milestones strictly in order (M5 depends on M4's date-keyed progress patterns; M6 depends on M5's range rollup). All edits confined to: `types.ts`, `visionPlanService.ts`, `VisionPlanLab.tsx`, `visionRoutineLibrary.ts`, new `report/route.ts`, tests. `/test` dashboard entry already exists ("Vision → Plan") — no registry change needed.

### Verification (before reporting done)
1. `npm test` green (or failures matched against `.test-known-failures.json`).
2. Playwright walk: fresh sandbox → vision → generate → confirm → check ritual item, star 2 musts, add ad-hoc → simulate review-due (set startDate back 8 days via localStorage) → complete weekly review → open monthly report. Screenshots to `.playwright-mcp/`.
3. Old-payload compat: seed `visionPlanSandbox_v1` with a pre-plan-shaped payload → lab loads without reset.

### Explicitly out of scope
- No production goals-hub integration, no DB persistence, no `user_goals` writes, no RLS.
- No changes to `balancePlan`, embeddings/intake, or the goal-gen contract beyond optional `targetDate`.
- No 1/3/5/10/20-yr custom buckets — reuse existing `horizonService` taxonomy (revisit at promotion time).
