# Handoff — New-Goals Test Flow (`/test/new-goals`)

> For the next AI/session. Scope of this body of work: the **new goal-creation
> experience built entirely on the test page**. **Hard rule: do NOT touch
> production** — `app/dashboard/goals/*`, `GoalsHubContent.tsx`, the real setup
> page, shared dialogs. They are byte-identical to HEAD and must stay that way
> until a deliberate, user-approved cutover. Verify with:
> `git diff --stat HEAD -- app/dashboard/ src/goals/components/GoalsHubContent.tsx app/api/goals/` → must be empty.

## What this is
`/test/new-goals` is the unified "best-of-both" goals experience: guided creation
→ live tracking, all reusing real components, none modified. It is gated to the
test route; production onboarding still uses the old `GoalSetupWizard`.

## ⚑ FLOW RESTRUCTURED — Plan → Roadmap (current, 2 steps)
The Create flow was rebuilt from the user's diagram into a template-centric journey
(`NewGoalsFlow` `STEPS = ["plan","roadmap"]`). **The matcher + the plan share ONE page** —
matching renders the plan inline immediately (no separate "intake" step / "Build my plan" click).
- **Plan step** renders `<GoalIntake>` (matcher) + `<GoalsConfigStep>` (the plan) together:
- **Matcher** (`GoalIntake`): free-text goal + overall "achieve by" date (`intakeDate`) +
  "Match my goals". On match it calls `onMatched(m, pillarIds)` **immediately** (no Build button)
  → the flow stores the match + the **`resolveIntake` resolution** (passed up whole). `onMatched`
  AUTO-applies only the **clear-winner OBJECTIVES** (`resolution.objectiveIds` — `resolveIntake`'s
  tested per-pillar tie/floor logic: top objective auto-wins iff runner-up `< top*tieRatio`), each
  via `getPrimaryTemplateForObjective`. Ambiguous / weak areas get nothing → they ask on the Plan
  step. (Earlier versions pre-selected ~8 routines, then auto-picked at the coarse template level;
  now it's objective-level, "auto-pick the lone obvious objective, ASK otherwise".)
- **⚠️ Explicit `appliedTemplateIds` (root-cause fix):** routine "selected?" state is tracked as a
  real `Set<string>` of picked template ids in `NewGoalsFlow` (added by `applyTemplate`, removed by
  `unapplyTemplate`, passed to `GoalsConfigStep`). It is **NOT** inferred via `isTemplateActive`
  anymore — that over-matches, because sibling routines in an area SHARE targets, so a narrow
  routine reads "active" when a broad one is applied (this caused 3 routines to show checked from
  one pick, and made every area look "decided" → no questions appeared). Rehydrate reconstructs the
  set from enabled targets (best-effort, may over-mark on returning users — acceptable; fresh-match
  is exact).
- **Question tree (split layout, OBJECTIVE-level — Tier 1+2):** the Plan is a **two-pane grid**
  (`lg:grid-cols-[300px_minmax(0,1fr)]`). **LEFT = "Quick questions"**: for each On area with no
  picked routine, ONE card asks at the **objective** level — the layer the matcher actually scores
  well (each objective has its own `soundsLike` vocab). Options = that area's objectives **ranked by
  match score**, kept to those within `OBJ_BAND` 0.12 of the top (else top few — never a dead-end),
  cap 4. So the prompt AND options vary per area (Health → strength/sleep/active; Wealth →
  earn/business/save). Clicking an option applies `getPrimaryTemplateForObjective(obj.id)` → the
  area resolves; a **"Decided · tap to change"** chip row lists picked areas (tap = `onUnapplyTemplate`
  → reopens). **Tier 2:** [`clarifiers.ts`](../../src/goals/components/new-goals/clarifiers.ts) supplies
  **authored** prompt + per-objective label/sub copy (e.g. relations → "What are you actually after?"
  / "One real relationship") layered over the data-driven option set; areas without an entry fall
  back to a generic prompt + the objective's own label/description. **RIGHT = the live plan**
  (timeline + Kanban). Derivation is stateless (`areaState`/`openQuestions`/`decided` from `matches`
  + `appliedTemplateIds` each render). Replaced the earlier flat template-level "which sounds more
  like you?" question. Guard test: `tests/unit/goals/clarifiers.test.ts` (every objective has a
  primary template, authored keys are real). (`resolveIntake.closePillars` remains unused.)
- **Plan** (`GoalsConfigStep`): **KANBAN** — each life area is a **draggable column** in a
  horizontal row (`DndContext`/`SortableContext` `horizontalListSortingStrategy`, `SortableColumn`
  render-prop wrapper, grip in the header). **Dragging a column left↔right IS the priority**
  (`onColumnDragEnd` → `onReorderPillars` → `pillarOrder` → `position`); the #N badge follows.
  The old separate priority sidebar (`SortablePriorityList`) is GONE. Off areas show as **"+ Add
  an area" chips** below. KeyboardSensor uses `sortableKeyboardCoordinates` (needed for horizontal).
  A **timeline figure** (`PlanTimeline.tsx`) sits above the columns: a clean Gantt — a left label
  gutter, each area a lane, a **solid gradient bar to its furthest dated goal** (date label at the
  end), **faded diagonal-striped "ongoing" bars** for areas with no date yet, a flagged
  **"★ Goal · {date}"** end line, and a date axis (start → mid → end). Editing "Achieve by" moves
  the goal flag. Each column header has an
  **on/off toggle** (`onToggleArea`) + collapse. Matched areas start On (rank order). The date
  row leads with **"Achieve by" (the target/intake date, now editable here via `onChangeIntakeDate`
  → drives the timeline marker)**; **start date is a small secondary "starting" control**.
  **Under each On area**, its column shows **only the picked routine(s)** (or the single top
  suggestion when none is picked yet); the rest tuck behind **"Show N more"** so a column isn't a
  wall of 8. Each routine = select toggle + **time-horizon presets** (90 days / 1 year /
  Vision=intakeDate / Ongoing) + **[expand]** → that template's goals editable inline (reuses
  `BucketSection`/`TargetRow`). Horizon → dates the template's goals + objective tier (cascade).
  The whole plan (timeline + Kanban) lives in the **right pane** of the split; the flow container
  is now **`max-w-7xl`** (the matcher + Roadmap stay centered at a narrower width). So the page is:
  **questions (left) → areas → routines (optionality) → priority (drag columns)**.
- **Roadmap** (`SummaryStep` with `defaultView="roadmap"`): the staggered dated cascade → Save.
- Save → `onSaved` → auto-switch to **Track** (the dashboard), unchanged.
- **UX polish:** matcher **collapses to a slim "✨ {goal} · ✓ N areas · Edit" bar** after match
  (`editing` state). Area header **click collapses/expands** its suggestions (`collapsedAreas`)
  — it NO LONGER toggles the area off (that was an accidental-nuke hazard); the **On/Off pill**
  is the deliberate include/exclude (stopPropagation). Off-area header click turns it on.
  Template **row click PICKS the routine** if unselected (`onApplyTemplate` + expand to reveal
  its goals) or toggles expand if already selected — the checkbox/horizon/chevron stopPropagation.
  (Was click-to-expand-only, which felt like "clicking a routine does nothing / doesn't fill in".)
  Each area shows only the **top `AREA_VISIBLE` (4)** suggestions + a **"Show N more / Show fewer"**
  toggle (`showAllAreas`); selected suggestions are always shown. Priority drag is **easier** —
  the whole chip body (grip+rank+label) is the drag handle (`SortablePriorityList`). **Layout:**
  Plan is two columns — area sections on the **left** (`flex-1`), the **priority box pinned on the
  right** (`<aside>` sticky, `hidden md:block`).

⚠️ **Dead code to clean up (next session):** the reshape left now-unused helpers in
`GoalsConfigStep` — `TemplateSection`, `RelationsPathChooser`, `autoExpandBuckets` +
`prevOverridesRef` effect, `pillarData`, `expandedBuckets`/`toggleBucket`, and unused
destructured props (`selectedObjectives`, `onToggleObjective`) + a couple imports. Inert
(tsc/SWC/vitest don't error) but should be removed. `IdentityStep` is also no longer used by
the flow. (`SortablePriorityList` IS used again — it powers the Plan-step priority drag list.)

### Older layout (pre-restructure, for reference)
- **Create flow:** `NewGoalsFlow` (Focus → Goals → Summary), state lives here
  (pillars/objectives/targetOverrides/labels/customTargets/startDate).
  - **Focus:** `IdentityStep` — pillar grid + `GoalIntake` (free-text intake).
  - **Goals:** `GoalsConfigStep` — templates, type-bucketed targets, milestone/ramp
    editing, `RelationsPathChooser` (FTO/Abundance harvest), Start date + "Suggest dates".
  - **Summary:** `SummaryStep` — stats, identity/values, Shared Foundations,
    "Achievements You'll Unlock", **By area ⇄ By time** toggle, per-goal horizon
    badge + countdown, "Starting <date>".
- **Track mode (in `NewGoalsLab`):** reuses REAL `DailyActionView` (renders
  `TodaysPulse` + GoalCards), `WeeklyReviewDialog`, plus test-only `AchievementsPanel`
  (earned Bronze/Silver/Gold) and `LabGoalEditor` (real `MilestoneCurveEditor` +
  interior pins + **Re-pace** button). Handlers lifted from GoalsHubContent (not imported).
- **Matching:** `src/goals/intakeService.ts` (pure: taxonomy build, cosine,
  `matchTaxonomy`, `effectivePillarScores` = pillar inherits best objective,
  `pickSuggestions`, `resolveIntake` = clarifying questions). Embedder is in
  `GoalIntake.tsx`: client-side `@huggingface/transformers`
  (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`), model cached in browser,
  taxonomy vectors in localStorage. **$0/call, on-device, multilingual.**
- **Horizons/dates:** `src/goals/horizonService.ts` (`classifyHorizon`,
  `formatCountdown`, `suggestedTargetDate`, `addDaysISO`/`todayISO` — LOCAL time).
- **Framework data:** `src/goals/data/newGoalFramework.ts` — PILLARS (incl. `vices`),
  OBJECTIVES, TARGETS, TEMPLATES; `getPrimaryTemplateForObjective`, `getAchievementTiers`.
- **Persistence (real `user_goals`):** `goalsService.ts` `buildFrameworkPlanInserts`/
  `parseFrameworkPlan`; `goalRepo.ts` `saveFrameworkPlan`; route `/api/goals/plan`.
  Framework goals tagged `fw:pillar|obj|tgt|custom:<id>`.

## Production-safe data-layer fixes already merged (inert for existing goals)
- Framework targets persist at `goal_level: 3` (so they show on Today, not as badges).
- `fw:*` excluded from `getOrphanedGoalIds` (else the hub's `/api/goals/tree` sweep
  auto-archives the whole plan on load).
- `linked_metric` wired (`sd_gym→gym_sessions_weekly`, `sd_approaches→approaches_weekly`);
  shared-driver dedup at persistence.

## How to verify (no MCP browser needed — it's often locked)
Self-contained Playwright node script:
`NODE_PATH="$(pwd)/node_modules" node /tmp/x.js` (chromium headless). Login:
`test-user-b@daygame-coach-test.local` / `TestUserB_SecurePass123!`. Seed plans
via `POST /api/goals/plan` (the flow rehydrates them). First intake run downloads
~100MB model (give 180s). `npm test` = vitest (1504 passing). Always screenshot +
re-confirm production diff empty before reporting done.

## Gotchas (real, verified)
- **Cross-namespace metric merge:** a framework goal carrying a `linked_metric`
  that the account already has (e.g. an existing goalGraph gym goal) is deduped by
  `createGoalBatch` into the existing row — so the `fw:tgt:` row may not appear.
  Correct behavior; just confuses verification on seeded accounts.
- `saveFrameworkPlan` **archives all `fw:%` then recreates** → re-saving resets
  `current_value`/streaks (new goal_ids). Diff-reconcile is a future item.
- `daily_goal_snapshots` is earned/computed data; `snapshotGoals` writes it with the
  user-bound client (comment claims admin) — **verify live RLS before building
  re-save logic; do not add user write policies.**
- transformers.js client use relies on `next.config.mjs` aliasing `onnxruntime-node`→web (already present).
- `startDate` is currently flow-state only (threaded NewGoalsFlow→config/summary),
  NOT a persisted column. Suggested *target* dates DO persist (`target_date`).

## Outstanding orders of business (priority order)
1. ✅ **DONE — Ranked priority + tiered dated cascade** (areas + objectives scope). See
   "Next build — SHIPPED" below for what landed + the corrected persistence decision.
2. **Start-date / tier-date persistence — BLOCKED (no prod-safe home); curve-anchoring DONE.**
   - ✅ **Curve pacing anchored to `startDate`:** roadmap milestone checkpoints now show
     *projected* dates (`horizonService.interpolateDateISO`) paced from `startDate` to the
     target's effective end (own date, else inherited objective/area date — the cascade
     flows down). Dimmed/italic vs manual dates. Flow-only, prod-safe.
   - ⛔ **Persistence stays flow-state only.** Verified there is NO prod-safe home: `target_date`
     regresses the hub (countdowns/Destinations on L1); `period_start_date` is owned by the
     period-reset crons + progress logic; and **`milestone_config` is presence-gated** —
     `GoalCard.tsx:298/322` render milestone UI when `milestone_config` is merely truthy, so
     stashing on L0/L1 (currently null) would make pillar/objective rows render milestone
     blocks in the real hub. Persisting tier dates needs a **new dedicated column** (a real
     migration) or a hub-render guard (a prod change) — both out of scope for the test-only
     build. Anchoring the *editable* milestone curve to `startDate` (LabGoalEditor) still TODO.
3. ✅ **DONE — Guided template funnel (path chooser).** Intake no longer silently auto-picks a
   template. The funnel is now: areas (keep/drop) → **close-pillar disambiguation**
   (`resolveIntake.closePillars`, margin 0.06) → **per-area "which path fits?"** card listing
   that area's templates (`getTemplatesForPillar`), default-selected to the primary template of
   the best-matched objective, with **level pills** + an **optional "Achieve by" date per goal
   group**. "Use these" → `applyIntake(IntakePathSelection[])` applies each chosen template at
   its level (enables targets + appends objectives in rank order) and writes the optional date
   to that path's objective group (`objectiveDates`, flow-state → drives the roadmap cascade +
   shows on the Goals per-objective date input). Browser-verified end-to-end (pick Body
   Transformation/Intermediate/2026-12-01 → Goals shows "Body Transformation (Intermediate)" +
   objective date set). All test-only (`GoalIntake`/`IdentityStep`/`applyIntake`); 1516 tests green.
   **⚑ DASHBOARD = TRACK PAGE (user decision):** for now everything "real" targets the
   **Track mode of `/test/new-goals`** (NewGoalsLab) as the eventual dashboard — NOT the real
   `/dashboard/`. So #4/#5/#6 are built there (test-only), and persistence/RLS are not a
   concern ("no need to worry about saving data right here"). The HARD no-touch rule on
   `app/dashboard/`/`GoalsHubContent`/`app/api/goals/` still holds.
4. ✅ **DONE (as Track handoff) — Create → Track loop.** Saving a plan now auto-switches to
   Track (`NewGoalsFlow` `onSaved` → `NewGoalsLab` `setMode("track")+fetch`, after a 900ms
   "✓ Saved" beat). Real `/dashboard/goals/setup` cutover (count-gate, hub "Edit plan",
   dev-chrome removal, existing-user handling, FTO/Abundance port) still deferred until a
   deliberate production cutover.
5. ✅ **DONE (in Track) — Real badges.** `AchievementsPanel` renders earned Bronze/Silver/Gold
   per `fw:tgt:` goal from template levels + actual value. Fixed: **descending metrics**
   (weight/body-fat/waist — lower is better) no longer false-"Maxed Gold" (direction-aware
   earn + progress paced from `milestone_config.start`); **archived rows filtered** (the tree
   fetch uses `includeArchived=true`, so re-saved/archived `fw:tgt` copies were double-counting).
   The L2-node/`BadgeConfig` approach is only needed for a real-hub cutover — not for Track.
6. ⏭️ **Moot for now — Diff-vs-archive re-save.** Per "no need to worry about saving data",
   the simple archive-recreate stands. Revisit only at real-hub cutover (still RLS-gated then).
7. Aurora theming of the flow; the deferred "why/feeling" per-goal field. (Both still parked:
   locked "minimal theme" + "why-field skipped".)

## Next build — SHIPPED (ranked priority + tiered dated cascade)

**Status: built + browser-verified on test-user-b (rank persists via `position`; round-trip
confirmed through `GET /api/goals/plan`). 1512 unit tests green; production diff empty.**

What landed (scope = areas + objectives ranking; per-individual-goal drag deferred):
- **Rank state:** `NewGoalsFlow` flow-state changed from `Set`s to ordered `string[]`
  (`pillarOrder`/`objectiveOrder`) as source of truth; children still get derived `Set`s.
  Seeded from the match (`GoalIntake` now emits pillars/objectives in descending score).
- **Persistence (no schema/route/protected change):** `buildFrameworkPlanInserts` iterates
  `state.pillars`/`state.objectives` in order → `createGoalBatch` sequential `position` →
  rank. `parseFrameworkPlan` reads back via the existing `goal_level,position` fetch order.
  Unranked (target-implied) areas/objectives append in canonical order.
- **Drag UI:** reusable `SortablePriorityList.tsx` (dnd-kit, #1…N badges, GripVertical).
  Areas ranked in `IdentityStep`; objectives ranked per-area in `GoalsConfigStep`. Areas now
  render in rank order in Focus/Goals/Summary.
- **Tier dates (FLOW-STATE ONLY):** per-area + per-objective date inputs in `GoalsConfigStep`,
  nested via `horizonService.clampDateWithin` (soft amber ⚠ when child > parent / < start).
- **Roadmap view:** 3rd "By roadmap" toggle in `SummaryStep` — nested dated cascade
  Area(date+countdown) → Objective(date+countdown) → Target(reuses `renderTargetRow`).

⚠️ **Corrected decision (handoff was wrong):** the original plan to persist tier dates into
`target_date` is a **prod-hub regression** — dating an L1 objective row makes the real
dashboard render countdown/Destinations badges (`DailyActionView`/`GoalCard`/TreeView…), and
that code is under the no-touch rule. So tier dates are **flow-state only** (target/L3 dates
still persist as before). To persist later, stash in `milestone_config` (hub-ignored), not
`target_date`.

⚠️ **Behavior change:** `IdentityStep` no longer auto-advances on area select (it must show
multiple selected areas to rank them) — user clicks "Next".

---

### Original design (for reference) — ranked priority + tiered dated cascade

**Why:** a 20–30-goal plan is overwhelming. Capture *importance* (ranked) and show the
*big→small dated cascade* during creation, so a later **dashboard** can surface the
vital few. **Scope = creation only** (dashboard focus surfacing is OUT). Mostly reuse;
⚠️ = genuinely new. Resolved decisions: within-area goal ranking first; roadmap = a 3rd
Summary toggle; **defer** custom-goal auto-decompose; tier dates persist into `target_date`.

**Grounding (verified):** `position` is the per-user order field (set sequentially by
emit order in `createGoalBatch`; updated by `reorderGoals`; hub views `.order("position")`).
`NewGoalsFlowState.pillars/objectives` are already `string[]` (ordered) but the component
uses `Set`s and loses order. Pillars/objectives carry **no date** today (only targets, via
`TargetOverride.targetDate`). Within-goal dated checkpoints already exist:
`generateMilestoneLadder` (values) + `milestoneEdits[step].date` (manual) +
`computeRampMilestoneDates`/`computeProjectedDate` (auto for ramps). Hierarchy via
`parent_goal_id`/`goal_level` (0/1/3).

### Part A — Ranked priority (drag 1…N)
- **State:** make order the source of truth in `NewGoalsFlow` — keep ordered arrays for
  pillars + objectives (array index = rank); keep passing `new Set(...)` to children so
  `IdentityStep`/`GoalsConfigStep`/`SummaryStep` membership checks (`.has`) don't change.
  Update `togglePillar`/`toggleObjective`/`applyTemplate`/`applyIntake` to append/remove
  from the order arrays. **Seed order from the match** — `resolveIntake` already returns
  `pillarIds` in score order; objective order from scores.
- **Persist via `position` (reuse):** change `buildFrameworkPlanInserts` (goalsService.ts
  ~1541/1559) to **iterate `state.pillars`/`state.objectives` in order** (not the static
  `PILLARS`/`OBJECTIVES` arrays) so emit order = rank → `position` encodes priority within
  each sibling tier. `parseFrameworkPlan` reads order back from `position` (sort fetched
  rows by position). No new column.
- **UI:** drag-to-reorder selected areas with #1…N badges (reuse `@dnd-kit` —
  `@dnd-kit/core|sortable|utilities` installed; pattern in `SortableGoalCard.tsx`). Per-goal
  rank v1 = drag within the area's bucket in `GoalsConfigStep`.

### Part B — Tiered dated cascade
- ⚠️ **Per-tier dates:** add per-pillar + per-objective date to flow state (e.g.
  `pillarMeta`/`objectiveMeta: Record<id,{date?}>`); persist into the pillar/objective
  rows' `target_date` in `buildFrameworkPlanInserts` (currently unset); read back in
  `parseFrameworkPlan`. ⚠️ Verify no hub logic mis-reads a dated L0/L1 (they're
  `goal_type:"milestone"`, not daily-actionable — low risk).
- **Finest tier = reuse** the milestone ladder's dated checkpoints.
- ⚠️ **Date nesting (small, new):** add a `horizonService` helper — a parent date
  constrains/suggests children within `[start, parentDate]` (reuse `suggestedTargetDate`/
  `addDaysISO`); validate child ≤ parent (soft warning).
- **Roadmap view:** add **"By roadmap"** to SummaryStep's `By area / By time` toggle —
  nested dated timeline Vision(date) → Objective(date) → Target(date + checkpoint dots) →
  drivers(Now). Reuse `renderTargetRow` + the horizon badge/countdown already built.
- ⚠️ **Deferred:** matcher auto-decomposing a free-text custom numeric goal into a dated
  ladder (reuse `generateMilestoneLadder` for the value split + `suggestedTargetDate`).

### Verify
Unit: seed-order-from-match; rank→emit-order round-trips via `position` through
`parseFrameworkPlan`; date-nesting helper. Browser (test-user-b): drag-reorder areas →
save → `/api/goals/tree` positions reflect rank; set Vision/Objective date → children
suggested within it; "By roadmap" shows the nested dated cascade. Keep `npm test` green
(1504) + production diff empty.

## Locked user decisions
Test-only build; keep badges + a `vices` pillar (alcohol split Get-Sober/Drink-Less);
simple archive-recreate re-save for now; minimal theme; local embeddings (no tiered/LLM);
why-field skipped; clarifying-questions = yes; dates = auto-suggest + start date.
