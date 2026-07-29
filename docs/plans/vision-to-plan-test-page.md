# Vision → Full Goal System — Test Page Plan

**Status: ✅ DONE (all milestones M0–M7 shipped and verified, 2026-07-17).**

---

## Part 1 — Human summary (read this, skip the rest)

**What this builds:** a test page at `/test/vision-plan` where you type a big fuzzy life vision ("wake up happy with my life, build a business, be in love") and the system builds an entire goal system around it: it splits the vision into life areas, turns each part into concrete typed goals, generates habits + tasks + milestones per goal, balances the daily load across all goals so you don't get 12 habits on day 1, and drops you into a track view with a daily action list and progress rollup. Everything sandbox/localStorage — no DB writes, no migrations, no RLS.

**Why we believe it's a gap:** July 2026 competitor research (memory: `goals-competitor-research.md`) showed no app does free-text multi-domain vision → prioritized multi-goal system. We steal the best mechanic from each competitor:

| From | Mechanic |
|---|---|
| Us | free-text intake with live per-clause highlighting + embedding match into our pillar/objective framework |
| Dreamfora | per goal, generate habits (recurring, scheduled) AND tasks (one-shot) AND milestones together |
| Strides | every goal typed (habit / target / milestone) + live pace line (ahead/behind today) |
| ClickUp | task/habit completion auto-rolls up to goal % → life-area % → vision % |
| Fabulous | drip dosing — plan phases in over weeks, not dumped on day 1 |
| Remente | life-area wheel re-score that shows where attention is needed |
| Lifetick | mandatory WHY captured per goal |

**Shape of the flow (4 screens):** Vision intake → Generated plan board (review/edit) → Confirm → Track view. Built from our existing `NewGoalsFlow` wizard shell, `GoalsConfigStep` board patterns, `LabGoalEditor`, and `NewGoalsLab` sandbox machinery.

**What you'll be asked to decide (Milestone 0):** which LLM does the decomposition (local Ollama llama3.1 = free/lower quality; Claude Code CLI headless = existing beta pattern in scenarios; Anthropic API = cost), and how much the generator must stay inside our framework vs invent custom goals.

**Effort:** 7 milestones, each a self-contained session-sized chunk ending in a working, testable state.

---

## Part 2 — Execution protocol (AI: read before every session)

1. **One milestone per session maximum.** Finish it fully (acceptance test green, visual verify done, STATE updated) or hand off cleanly with STATE notes.
2. **Start of every session:** read this file top to bottom, read the STATE block, read the "Read first" files of the current milestone. Do not re-read the whole codebase.
3. **End of every step:** `npm test` must be green. End of every milestone: Playwright visual verify of the page (login as test-user-b, navigate direct — see MEMORY.md for creds), THEN update STATE block, THEN report.
4. **Sandbox only.** No Supabase writes, no migrations, no RLS, no `/api/goals/plan` POST. Persistence = localStorage (`visionPlanSandbox_v1`). This keeps us out of security-rule territory entirely.
5. **Architecture rules apply:** logic in `src/goals/visionPlanService.ts`, types in `src/goals/types.ts`, API route ≤50 lines, no Supabase outside `src/db/`, UI in `src/goals/components/vision-plan/`.
6. **No fallbacks:** if the LLM call fails or returns unparseable output, the UI shows an explicit error state. Never silently degrade to a canned plan.
7. **Don't invent UI.** Reuse `components/ui/*` primitives, `bg-background` token theme, wizard/board/editor patterns listed per milestone. New icons need user approval (iconRoles.ts).
8. If a decision isn't covered here and changes user-visible behavior → AskUserQuestion, don't guess.

### STATE (update after every milestone — the only mutable section)

```
Current milestone: — (COMPLETE, incl. M8 feedback round + M9 area-board redesign + M10 routine library + M11 workout designer)
Done: M0, M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11
M11 notes (2026-07-19, user feedback: "don't get ramps, don't see milestones, want more suggestions/pick/add own, ++ design workouts: chest day A/B or full routine, days+order, shown to user"):
- Milestone rungs now VISIBLE: chip row via generateMilestoneLadder(measureToLadderConfig) under the measure editor (60→70→80→90→100 kg).
- Ramps renamed "Ease-in schedule" + rampSummary() plain sentence ("Starts gentle: 3×/wk for the first 4w, then … — your daily list only asks for the current phase"); numbers still editable.
- Routine library grown 5→8 items per category (all 6 categories).
- Workout designer (data src/goals/data/visionWorkoutSplits.ts, 6 split templates): habit.routine {days[]} typed in types.ts; applyWorkoutSplit / routineDayForDate / routineWeekPreview in service. Mapping = weekly-fixed: slot k of the balanced weekdays runs days[k % len] (stable "Mon Push · Wed Pull · Fri Legs"; cycles when freq>days; ramp weeks run only the first days). Designer surfaces on health-pillar + routine-workout goals: split picker → numbered day chips (EditableTitle rename, up/down reorder, add/remove, remove split) + honest week preview. Track checklist shows "Strength session — Push".
- Bugfix found via screenshot: single-area wheel drew an invisible 360° arc → capped at 359.9°.
- Gotcha for tests: applying a split ADOPTS its recommended frequency (PPL → 3×/wk) which re-levels weekdays — a Sunday e2e run then has no due workout; step frequency up if the test needs today scheduled.
- Final: 1666 unit + 6 e2e green; designer + track screenshots eyeballed.
M9 notes (2026-07-18, user feedback): intent-card grid replaced by a horizontal DRAGGABLE life-area board (dnd-kit rectSortingStrategy; drag = area priority, click/check = include-exclude). Each card carries the area definition (pillar tagline) + the vision clauses that mapped to it (objective + tier). "Turn these into goals" button removed — goals auto-draft via effect the moment a fresh reading lands (fires only from goalPhase idle; errors keep an explicit retry, no loop). Deselecting an area HIDES its goals (filter, never delete — priorityIds still covers all goals, parse invariant intact) and re-balances weeks live. Area drag regroups goal priority via orderGoalIdsByArea (stable sort, service + unit-tested). New optional persisted fields areaOrder/deselectedAreas (old blobs hydrate fine). Layout widened to max-w-6xl, goals grid 2-col, intake card capped 3xl. e2e spec updated (no button; toggle covered). 1654 unit + 5 e2e green.
M9b: board adopts COACH-ADDED areas — when the LLM re-routes a weak intent (live probe: "wake up happy" arrived as health/Sleep&Recover, drafted as meaning/Find Your Purpose), the goal's pillar gets its own card (Wand2 + "Added during goal design", cites goal titles instead of clauses) via extendAreaOrder at hydrate + goal-arrival (+ render-time safety append for refine pillar changes). Board caption now "N life areas in your plan" (e2e regex updated). Probe learning: nested `claude --print` inside a Claude Code session times out the 180s wrapper — run with `env -u CLAUDECODE` outside, or via the site.
M10: routine LIBRARY under the goals — 6 activity categories (morning/night/work/workouts/social/mind, data `src/goals/data/visionRoutineLibrary.ts`, 5 items each: meditation, nightly cleanup, one-important-task, …). Collapsible category rows show pillar-relation chips; unfold → clickable items (Plus/Check, default ×/wk). Picks fold into ONE goal per category (`routine-<cat>` id, primary pillar owns it, habit_ramp w/ no-cap 7/wk×4w phase) via pure `addRoutineHabit`/`removeRoutineHabit` in visionPlanService (unit-tested: dedupe, last-habit-drops-goal, non-routine goals never emptied, state round-trip). Component keeps priorityIds/areaOrder/deselected in sync (adding to a left-out area re-includes it; goal card auto-expands). Extra-area board card wording generalized to "Added beyond your vision text:" (covers LLM re-routes AND user picks). 1660 unit + 5 e2e green; scripted browser audit 27/27.
M8 notes: shipped same day from user feedback. Slow-first-load hardening (stall watchdog 45s → explicit retryable error; failed model load no longer poisons the singleton; ~50MB hint). Prompt grounded in curated TARGETS (targetSummary/frameworkMenu) — live result: 9/9 habits cited framework targets. Provenance validated fail-closed (unknown basedOnTargetId → 502). Ramps REAL: rampFrequencyForWeek caps due-days/expected per phase; ramp phases editable. Steppers: habit daysPerWeek, measure target+steps. Per-goal targetDate. Refine route /api/goals/vision-plan/refine (id stable, habit/task ids re-seeded). Gotcha: ramp frequencyPerWeek schema cap must be ≥ framework drivers (Approaches ramps to 20/wk) — capped at 30, scheduling min()s against daysPerWeek. Final: 1639 unit + 5 e2e green.
M7 notes: e2e spec tests/e2e/vision-plan.spec.ts (LLM route mocked; serial mode + unrouteAll required by e2e-isolation.test.ts). Error paths covered: LLM 502 → explicit error + retry (e2e), unparseable/invalid LLM output → throw (unit), nonsense vision → empty state (e2e), corrupt localStorage → fresh start (unit). Throwaway verify script deleted (superseded by the spec). Final state: 1632 unit tests + 4 e2e green.
M6 notes: VisionProgress {startDate, completions, tasksDone} persisted inside VisionPlanState; all track math pure + date-parameterized (dayNumber/calWeekday 0=Mon, expectedToDate EXCLUDES today so mornings are on-pace, goalRollup 70/30 habit/task blend, areaRollups mean, visionPercent mean of areas). Wheel: SVG donut, WHEEL_ORDER keeps yellow/orange apart, 6° gaps + legend labels = required secondary encoding (pillar palette CVD worst 6.2 orange↔green, validated with dataviz script). Pace badges icon+word never color-alone.
M5 notes: single lossless VisionPlanState in localStorage (visionPlanSandbox_v1), zod-gated hydration (parseVisionPlanState rejects corrupt/incomplete blobs incl. priorityIds↔goals mismatch). Edits: EditableTitle rename, habit add/delete (last habit undeletable), task delete. Confirm → create/track tabs; reset is two-step. Track tab is a placeholder for M6.
M4 notes: balancePlan in visionPlanService (rampedCap linear over rampWeeks=4, weekday leveling via least-loaded-day, overflow flagged never dropped, tasks shift by goal activation week). UI reuses SortablePriorityList; budget stepper 1-8; weekday meter + phase timeline. Verified live incl. drag re-balance + budget-1 overflow.
M3 notes: decomposition rides in the SAME LLM call as M2 (one round-trip). VisionHabit/VisionTask/VisionMeasure types; cross-field validation fail-closed (ladder needs measure, ramp needs rampSteps, every goal ≥1 habit); measureToLadderConfig feeds the real generateMilestoneLadder. Cards auto-expand. Verify-script gotcha: waitForFunction(fn, ARG, opts) — options are the 3rd param.
Decisions taken: (1) LLM = Claude Code CLI headless (pattern: src/scenarios/keepitgoing/claudeCode.ts); (2) framework-grounded generation; (3) full track view scope.
Notes for next session:
- M1 shipped: /test/vision-plan (VisionPlanLab), deriveIntents in visionPlanService.ts, VisionIntent types in types.ts, card on /test dashboard (Telescope icon, unused elsewhere). Unit tests + gated real-embedder acceptance test (RUN_EMBEDDER_TESTS=1) green. Visual verify script: tests/e2e/_verify-vision-plan.ts (login route is /auth/login, NOT /login).
- M2 shipped: buildGoalGenPrompt/parseGoalGenResponse (+ zod schemas) in visionPlanService.ts; async Claude CLI wrapper src/goals/visionPlanClaude.ts (execFile, 180s timeout, fail-closed); route app/api/goals/vision-plan (27 lines); goal cards w/ editable WHY in VisionPlanLab. Verified live: LLM correctly merged the spurious "I want to wake up" intent into a Meaning goal. Wand2 icon OK (registered role "AI enhancement").
- M1 quirk (clause splitter over-splits on "and") is confirmed handled by the M2 prompt's merge/discard instruction.
```

---

## Part 3 — Milestones

### M0 — Decisions checkpoint (no code)

Ask the user (AskUserQuestion), record answers in STATE under "Decisions taken":

1. **LLM for decomposition** — options: (a) local Ollama `llama3.1` (pattern: `src/qa/providers/`, `src/qa/config.ts`; free, weakest quality, needs Ollama running), (b) Claude Code CLI headless (pattern: `src/scenarios/keepitgoing/claudeCode.ts`; Max-subscription, marked beta-only), (c) Anthropic API (new dependency, per-call cost). Recommend (b) for quality in a test page.
2. **Framework-grounded vs free generation** — (a) LLM must map every goal onto existing `newGoalFramework.ts` pillars/objectives/targets, inventing only `fw:custom:` goals when nothing matches (recommended — keeps output editable by existing board machinery), or (b) LLM generates freely.
3. **Scope of track view** — full (pace line + wheel + rollup, M6) or minimal (daily list + rollup only). Affects M6 size.

Acceptance: STATE updated with all three decisions. Nothing built.

### M1 — User can type a vision and see it split into life-area-tagged intents

**Capability:** on `/test/vision-plan`, type a multi-domain vision; see it split into distinct intents, each tagged with matched pillar/objective and confidence, with per-clause color highlighting like `GoalIntake`.

**Read first:** `src/goals/components/new-goals/GoalIntake.tsx` (browser embedder, lines ~22–77), `src/goals/intakeService.ts` (matchTaxonomy, resolveIntake, span helpers), `app/test/page.tsx` (testPages array, lines 7–140), `app/test/new-goals/page.tsx`.

**Build:**
- `app/test/vision-plan/page.tsx` → renders `src/goals/components/vision-plan/VisionPlanLab.tsx` (copy `NewGoalsLab` shell pattern: mode state, localStorage, no API).
- Register card in `app/test/page.tsx` `testPages` (rule: test pages must be reachable from /test dashboard).
- Intent splitting in `visionPlanService.ts`: split vision into clauses (reuse `splitSpans`/`tailSpans` approach), embed each clause with the existing browser embedder, match each via `matchTaxonomy`. Multi-intent = multiple high-scoring distinct pillars. Pure logic in service; embedding stays in the component (established pattern).
- UI: textarea (reuse `GoalIntake` card styling) + "Build my plan" button + intent chips showing area, matched objective, confidence, unmatched-remainder flag.

**Acceptance test:** `tests/unit/goals/visionPlanService.test.ts` — given precomputed embeddings (pattern: memory `intake-matcher-verification.md`, `@vitest-environment node` with real embedder), the example vision yields ≥3 distinct pillar-tagged intents. Visual verify: type example vision, see ≥3 colored intents.

### M2 — Each intent becomes a typed goal card with a WHY

**Capability:** intents become goal cards: title, life area, type (`habit_ramp` | `milestone_ladder`), matched framework target(s) or custom, and an editable generated WHY (Lifetick). This is the first LLM step.

**Read first:** the M0-chosen LLM pattern file; `src/goals/data/newGoalFramework.ts` (Template/TargetOverride shapes, `makeCustomFrameworkTarget`); `src/goals/types.ts` (`GoalTemplateType`, `NewGoalsFlowState`).

**Build:**
- `app/api/goals/vision-plan/route.ts` (≤50 lines) → `visionPlanService.generateGoals(intents, frameworkContext)`. Server-side LLM call. Prompt receives: vision text, matched intents, and the candidate objectives/targets from M1 matching (grounding — decision M0.2). Output schema (zod-validated): `{ goals: [{ intentIdx, title, pillarId, objectiveId?, targetKeys?[], custom?, type, why }] }`. Unparseable → explicit 502, UI error state (no fallback).
- Goal cards UI in `VisionPlanLab` — card styling from `GoalsConfigStep` selectable cards; WHY inline-editable (`EditableTitle` pattern).

**Acceptance test:** service unit test with mocked LLM response validates schema mapping into framework structures; route stays ≤50 lines (architecture test enforces). Visual verify: vision → cards with WHYs.

### M3 — Full per-goal decomposition (Dreamfora shape)

**Capability:** each goal expands to habits (recurring, weekday-scheduled), one-shot tasks, and milestones with dates toward a target date per life area.

**Read first:** `src/goals/types.ts` (`MilestoneLadderConfig`, `GeneratedMilestone`, `HabitRampStep`), `goalsService.ts` `buildLocalPlanGoals` (line ~1673), `AreaDateButton.tsx` (per-area dates).

**Build:**
- Extend `generateGoals` (or second LLM pass `decomposeGoal`) to emit per goal: `habits: [{title, daysPerWeek, schedule}]`, `tasks: [{title, dueOffsetDays}]`, `milestones` compatible with `MilestoneLadderConfig` so `MilestoneCurveEditor` can edit them later. New types in `types.ts` (`VisionPlanGoal`, `VisionPlanState`).
- Map into `NewGoalsFlowState` + custom extensions so `buildLocalPlanGoals` can materialize sandbox `GoalWithProgress[]`.
- UI: expandable goal card (chevron pattern: `GoalCategorySection`) showing habits/tasks/milestones.

**Acceptance test:** mocked-LLM service test — decomposition maps to valid `MilestoneLadderConfig`/habit shapes; every habit has a schedule (Dreamfora's auto-schedule lesson). Visual verify: expand all cards.

### M4 — Cross-goal balancing + drip dosing (the market gap — the novel part)

**Capability:** the plan respects a daily load budget (default: ≤4 habit-instances/day week 1) and phases in: each goal's habits start staggered over weeks by priority (Fabulous dosing). User can reorder goal priority (drag) and change the budget; plan re-balances deterministically — no LLM here, pure service logic.

**Read first:** `SortablePriorityList.tsx`, `PlanTimeline.tsx`.

**Build:**
- `visionPlanService.balancePlan(goals, {dailyBudget, startDate})`: assigns each habit a `startWeek` by goal priority + load; tasks spread across weeks; deterministic and unit-testable.
- UI: load meter per weekday (bar showing habit count vs budget), priority drag list (reuse `SortablePriorityList`), phase-in timeline (reuse `PlanTimeline` lane pattern).

**Acceptance test:** pure unit tests — no week exceeds budget; reordering priority changes stagger; edge cases (1 goal, 10 goals, budget 1). This milestone is the differentiator — test it hardest. Visual verify: drag priority, watch timeline re-balance.

### M5 — Review, edit, confirm → sandbox save

**Capability:** user edits anything (titles, WHYs, dates via `AreaDateButton` pattern, milestones via `LabGoalEditor`, delete/add habits+tasks), confirms, plan persists to `localStorage` key `visionPlanSandbox_v1`, survives reload.

**Read first:** `LabGoalEditor.tsx` (`onSaveLocal` sandbox save), `NewGoalsLab.tsx` (localStorage round-trip), `NewGoalsFlow.tsx` `sandbox`/`onSandboxSave` props.

**Build:** wire edit affordances into cards; confirm button materializes via `buildLocalPlanGoals`-style builder into `GoalWithProgress[]`; save/load/reset sandbox controls (reset = destructive → confirm dialog).

**Acceptance test:** round-trip unit test (state → localStorage JSON → state, lossless). Visual verify per memory `verify-interactions-exhaustively.md`: edit, reload, edit again, reset, re-generate.

### M6 — Track view: daily list, pace line, rollup, wheel

**Capability (scope per M0.3):** post-confirm track mode — today's habit/task checklist; checking items rolls up goal % → life-area % → one vision % (ClickUp); per-goal pace indicator ahead/behind vs plan (Strides); life-area wheel colored by progress + load (Remente).

**Read first:** `DailyActionView` usage in `NewGoalsLab.tsx`, `GoalWithProgress` computed fields, dataviz skill (load BEFORE building wheel/pace charts).

**Build:** track mode in `VisionPlanLab`: reuse `DailyActionView` for the checklist; `visionPlanService.paceStatus(goal, today)` (expected-vs-actual from balanced schedule); rollup pure functions; wheel as inline SVG per dataviz skill.

**Acceptance test:** unit tests for paceStatus + rollup math (boundaries: day 0, past target date, zero-habit goal). Visual verify: check items, watch %s move, confirm pace flips ahead/behind.

### M8 — Tweakability & timing (user feedback 2026-07-17)

User feedback after first real use: "tweaks are not easy … what if I want to workout a little more, or a little different … it doesn't grasp onto timings or templates … didn't include habit ramps, or me choosing the amount of milestones."

**Build:**
- Habit frequency stepper (daysPerWeek ± on each habit row).
- Measure editing: target value input + milestone-rung count stepper (2-12).
- Ramps become REAL: `rampFrequencyForWeek` caps each habit's effective weekly frequency by the goal's current ramp phase; due-today + expected counts use it (early weeks lighter — Fabulous dosing at the day level). Ramp phases editable (freq/duration inputs, add/remove phase).
- Per-goal "refine with AI": free-text instruction → single-goal LLM call via `/api/goals/vision-plan/refine` (goal id stable, habit/task ids re-seeded so completions can't misattach).
- Generation + refine prompts enriched with the framework's curated TARGETS (units, ladders, shared-driver ramps) and told to prefer them.
- Per-goal target date input (fed to refine prompt).
- Provenance per habit (user: "who is saying that 'wake up happy' = gratitude journal 5 min?"): LLM must set `basedOnTargetId` when a curated framework target fits (validated against TARGETS, badge "framework · <label>") else the habit is badged as an AI suggestion; prompt forbids generic self-help filler without a causal link to the user's words.

**Acceptance:** unit tests for ramp math + refine parse + provenance validation; e2e mocked-refine test; live refine verified in browser.

### M7 — Hardening + docs

- E2E spec `tests/e2e/vision-plan.spec.ts`: full journey (type vision → generate → rebalance → confirm → track → check off) with LLM route mocked at network layer.
- Error/empty/loading states audit (LLM down, Ollama not running, zero intents matched, absurd input like "asdf").
- Update this file's STATE to DONE, add page to any test-page docs.
- Final `npm test` + full Playwright pass before reporting done.

---

## Part 4 — Known risks (resolve before/at the milestone, not after)

- **LLM output drift:** all LLM output zod-validated; invalid → explicit error (fail-closed, no fallback plans).
- **Embedder in tests:** browser embedder works headlessly via node-env vitest (proven — memory `intake-matcher-verification.md`).
- **`GoalsConfigStep` is 94k:** do NOT import it wholesale; copy only the card/board patterns needed. Reuse leaf components (`SortablePriorityList`, `AreaDateButton`, `PlanTimeline`, `LabGoalEditor`) directly.
- **Scope creep in M4:** balancing is deterministic service logic. If tempted to LLM it — don't; testability is the point.
- **Claude CLI headless latency (if chosen):** generation can take 30s+; UI needs a real progress state, not a spinner lie — show per-goal streaming/staged completion if feasible, else staged status text.
