# Goal Framework Test Page — Handoff v2

**What this is:** A test page at `/test/new-goals` exploring a grammar-based goal framework. Not production code — a design prototype for the goal-setting experience. Everything is self-contained in `src/goals/components/new-goals/` + `src/goals/data/newGoalFramework.ts`.

---

## 1. Architecture

### Flow: 3 steps
```
Focus (pick pillars) → Goals (templates + flat pool) → Summary
```

### Files

| File | Lines | Role |
|------|-------|------|
| `newGoalFramework.ts` | 344 | All types, data, helpers. The grammar lives here. |
| `NewGoalsFlow.tsx` | 209 | Flow container. Step state, navigation, template apply/unapply. |
| `IdentityStep.tsx` | 155 | Step 1: pillar cards with values, click-to-advance, custom input. |
| `GoalsConfigStep.tsx` | 1217 | Step 2: THE main component. Templates, type-bucketed pool, milestone/ramp editors. |
| `SummaryStep.tsx` | 429 | Step 3: Stats, identity, values aggregation, shared foundations, tree view. |
| `ObjectiveStep.tsx` | 504 | **DEAD CODE** — superseded by GoalsConfigStep. Can be deleted. |
| `TargetStep.tsx` | 909 | **DEAD CODE** — superseded by GoalsConfigStep. Can be deleted. |

### Dead code to clean up
`ObjectiveStep.tsx` and `TargetStep.tsx` are from earlier iterations (separate objectives + targets steps). They're no longer imported by `NewGoalsFlow.tsx`. Safe to delete.

---

## 2. The Grammar — 5 Primitives

Every goal target is one of 5 types, with an explicit driver/metric role:

| Primitive | Role default | What it is | Milestone engine |
|-----------|-------------|------------|------------------|
| **Volume** | driver | Input you control: gym sessions, approaches | `milestoneConfig` → `generateMilestoneLadder()` (front-loaded, tension 1.2) |
| **Habit** | driver | Frequency to maintain/ramp: protein days, meditation | `rampSteps` → inline ramp editor |
| **Target** | metric | Number to hit: bench 1RM, net worth | `milestoneConfig` → `generateMilestoneLadder()` (linear, tension 0) |
| **Skill** | metric | Ability progression: lift form, text game | `stageSteps` → read-only chain display |
| **Stage** | metric | Journey milestones: dating funnel, income stages | `stageSteps` → read-only chain display |

### Driver vs Metric axis
- **Drivers** (inputs): what the user DOES. Grouped in "WHAT YOU DO" bucket.
- **Metrics** (outputs): what the user MEASURES. Grouped in "WHAT YOU MEASURE", "JOURNEY MILESTONES", "SKILLS TO BUILD" buckets.

### Shared Drivers
Drivers that power multiple objectives (gym sessions, protein, approaches, meditation, journaling) are stored in `SHARED_DRIVERS[]`. Targets reference them via `sharedDriverId`. Rendered once in the UI with "Powers: Get Strong, Transform Body" badges.

---

## 3. Templates

Templates are presets that auto-select targets at a chosen difficulty level. Stored in `TEMPLATES[]` in the data file.

### How they work
- Each template has `objectiveIds` (which objectives to activate) and `targetOverrides` (which targets to enable).
- Each template has 3 `levels`: Beginner, Intermediate, Advanced — each with `targetValues: Record<targetId, number>` for level-appropriate target values.
- **Click template pill → auto-applies at Beginner**. Click again → unapplies. Level picker row appears when active.

### Current templates (11 total)
- Health: Strength Focus, Body Transformation, Complete Athlete
- Relations: Find The One, Abundance Path, Inner Game First
- Wealth: Hustle Mode, Wealth Builder
- Meaning: Mindful Path, Scholar's Way, Full Meaning

---

## 4. User Decisions (locked in)

| Decision | Choice |
|----------|--------|
| Library scope | Fully general life goals |
| Default targets | Seeds with optional calibration (templates are the calibration) |
| Pillars | Fixed 4: Health, Wealth, Relations, Meaning |
| Shared driver attribution | Simple — counted once, shown under all |

---

## 5. GoalsConfigStep Internals

### State
- `expandedBuckets: Set<string>` — which type buckets are open (all start open)
- `expandedConfigs: Set<string>` — which targets have milestone config panel open
- `expandedRamps: Set<string>` — which targets have ramp editor open
- `rampOverrides: Record<string, RampStep[]>` — locally modified ramp steps (not in parent state)
- `centralDate: string` — central "Achieve by" date that fills all enabled targets
- `editingValue: string | null` — which target value is being directly edited

### Key features
- **Template section**: Click-to-toggle pills + inline level picker when active
- **4 type buckets**: WHAT YOU DO (green), WHAT YOU MEASURE (amber), JOURNEY MILESTONES (pink), SKILLS TO BUILD (purple)
- **Select-all per bucket**: Checkbox on bucket header
- **Editable milestones (freeze-and-flow)**: Every milestone dot except the final target is click-to-edit. **Start dot** (step 0 = current level) → "Starting point (now)" editor → `TargetOverride.startValue` (clamped below target with step headroom). **Interior dots** → pin value (nice +/- steppers or direct entry, manual value respected exactly, e.g. 49 stays 49) and/or set a checkpoint date → `TargetOverride.milestoneEdits` (keyed by step). Pinned milestones lock (filled dot + lock icon); the auto-curve regenerates only the *unpinned* milestones in the gaps around them. "Reset to auto" unpins/clears. The **final target** is edited via the row's prominent stepper + targetDate. Generator support: `MilestoneLadderConfig.pins` → `generateMilestoneLadder` splits the ladder into sub-ladders between pinned anchors; a final safety pass guarantees non-decreasing even on degenerate ranges. The **Summary** step renders the full ladder with pins (lock) + per-milestone dates.
- **Milestone config panel**: Steps slider (3-15), tension presets (Quick wins/Balanced/Ambitious), tension slider (-2 to 2). For volume/target primitives only.
- **Inline ramp editor**: Editable frequency + duration per step, add/remove steps, "keep flat" button, visual ramp bar. For habit/volume-driver primitives only.
- **Shared driver dedup**: `getDeduplicatedTargetsForPillar()` ensures shared drivers appear once
- **Auto-expand buckets**: When template applied, buckets with newly enabled targets expand automatically

### Props flow
```
NewGoalsFlow (state owner)
  → IdentityStep (selectedPillars, onTogglePillar, onNext)
  → GoalsConfigStep (selectedPillars, selectedObjectives, targetOverrides, 
                      onToggleObjective, onApplyTemplate, onUnapplyTemplate, onUpdateTarget)
  → SummaryStep (selectedPillars, selectedObjectives, targetOverrides, customPillars, customObjectives)
```

---

## 6. Data Model (`newGoalFramework.ts`)

### Types
```ts
GoalPrimitive = 'volume' | 'skill' | 'target' | 'habit' | 'stage'
GoalRole = 'driver' | 'metric'

FrameworkTarget { id, objectiveId, label, primitive, role, unit, defaultEnabled,
                  sharedDriverId, milestoneConfig, rampSteps, stageSteps }

SharedDriver { id, label, primitive, unit, rampSteps, milestoneConfig }

Template { id, pillarId, label, description, icon, objectiveIds,
           targetOverrides: Record<string, boolean>, levels: TemplateLevel[] }

TemplateLevel { label, targetValues: Record<string, number> }
```

### Data counts
- 4 pillars, 4 identity aspects, 5 shared drivers
- 10 objectives (3 health, 3 relations, 2 wealth, 2 meaning)
- ~60 targets across all objectives
- 11 templates with 3 levels each
- All targets default to `defaultEnabled: false` — templates are the way to enable

### Helpers
```ts
getObjectivesForPillar(pillarId) → Objective[]
getTargetsForObjective(objectiveId) → FrameworkTarget[]
getDriversForObjective(objectiveId) → FrameworkTarget[]
getMetricsForObjective(objectiveId) → FrameworkTarget[]
getSharedDriver(id) → SharedDriver | undefined
getObjectivesForSharedDriver(driverId) → Objective[]
getTemplatesForPillar(pillarId) → Template[]
```

---

## 7. Existing milestone engine (reused, not modified)

`src/goals/milestoneService.ts` → `generateMilestoneLadder(config)` — pure function, takes `{ start, target, steps, curveTension, pins? }`, returns `GeneratedMilestone[]`. Used for volume and target primitives. The pool-based selection with log-space curve bias and increment smoothness lives in the extracted `generateLadderSegment` helper (one segment = legacy behaviour); the public fn orchestrates pinned anchors over it. Bench-flat clamp reserves 1 unit of headroom per remaining step so a gap can always hold its milestones.

**Bug fixed in this pass:** templated targets used to show only a single endpoint dot — `applyTemplate` wrote `steps: 0` into the override and `buildEffectiveConfig` did `override.steps ?? config.steps` (`0 ?? 7 = 0` → `steps<2` → 1 milestone). Fixed by (a) `applyTemplate` now inherits the target's authored `steps`/`curveTension` defaults, and (b) `buildEffectiveConfig` uses `|| config.steps` (0 = unset).

---

## 8. What's NOT done (known gaps)

1. ~~No persistence~~ **DONE** — the flow now saves into the real `user_goals` table. See §11.
2. ~~Ramp overrides are local~~ **FIXED** — ramp edits now live in `TargetOverride.rampSteps` (parent state), so they survive navigation.
3. **Calibration: partial** — the *start* value (current level) is now directly editable per target (click the first milestone dot → "Starting point (now)"), clamped to stay below target with step headroom. There's still no dedicated up-front "what can you bench now?" intake step; the per-target start edit is the in-place version of it.
4. **No regression model** — the debate identified that the framework needs to normalize sawtooth progress. Not implemented.
5. **No phase detection** — beginner vs intermediate feedback loops not differentiated.
6. **Stage/skill targets are read-only** — no way to mark stages as completed or skills as progressed.
7. **Custom pillars** — addable in the Focus step but have no framework targets and aren't persisted. (Custom *goals* under a real pillar ARE supported + persisted — see §11.)
8. **Dead files** — ObjectiveStep.tsx and TargetStep.tsx should be deleted.
9. **The "daily interface"** — the debate concluded the daily experience should be "what did you do, what did you notice" — this test page only covers the setup flow, not the daily tracking view.

---

## 12. Smarter preset numbers (start scales with target)

Templates used to set only the *target* per level — the *start* stayed frozen at `milestoneConfig.start`, so non-beginner ladders were nonsense (bench Advanced `40→140`, marathon `1→42`, 5k `35→20`).

**Every** milestone target now declares a `metricKind` (`strength`/`reps`/`distance`/`bodymass`/`bodyfat`/`pace`/`income`/`rate`/`cumulative`), and `deriveStartValue(kind, target)` (in `newGoalFramework.ts`) computes a sensible "where you are now" that scales with the chosen target. `applyTemplate` seeds `startValue` from it (cumulative metrics keep their ~0 baseline, no scaling), and caps step count to the span so tiny ranges don't repeat dots. Authored `milestoneConfig.start` values were corrected to match.

Results, e.g.: bench Beg `40→60` · Int `70→100` · Adv `100→140`; pull-ups `3→5` / `9→15` / `15→25`; body-fat `25→18` / `21→14` / `17→10`; marathon `21→42`. **Relations/meaning**: cumulative metrics (lifetime counts) correctly stay at their baseline — kiss closes `1→5`…`1→30`, books `1→52`; the one rate metric, dates/month, now scales (`2→3` / `3→6` / `5→10`, was `1→3` / `1→6` / `1→10`). The span cap also cleans small-target cumulative ladders (kiss closes Beginner is now `1→2→3→4→5`, not four 1s). Verified by `tests/unit/goals/presetStartScaling.test.ts` (prints every scaling ladder + asserts direction/monotonicity + dates-vs-cumulative).

**Skills-to-build chains** were rewritten to consistent, concrete 4-stage progressions (e.g. Open Cleanly: first cold approach → push through the nerves → open 3+ per outing → open anyone, anytime). All 10 skill targets in `newGoalFramework.ts`.

## 11. Persistence (flow ⇄ user_goals)

The flow now saves to the **real `user_goals` table** — no new tables, no migration, no RLS (the table has none; auth is app-level).

**Mapping** (`src/goals/goalsService.ts` — `buildFrameworkPlanInserts` / `parseFrameworkPlan`):
- pillar → `goal_level 0` container, `template_id "fw:pillar:<id>"`, `aligned_values` = pillar values
- objective → `goal_level 1`, parent = pillar, `template_id "fw:obj:<id>"`
- target → `goal_level 2`, parent = objective, `template_id "fw:tgt:<id>"`
  - volume/target primitive → `goal_type milestone`, `target_value` = target, `current_value` = start, `milestone_config` = `{start,target,steps,curveTension,milestoneEdits}`
  - habit / volume-driver → `goal_type habit_ramp`, `ramp_steps`
  - skill/stage → `goal_type recurring`, `target_value` = #stages, `milestone_config null`
  - `goal_nature` = driver→`input`, metric→`outcome`; `target_date` = the target's date

The framework linkage lives entirely in `template_id` (`fw:%`); override data reconstructs from real columns + `milestone_config` (only populated for real ladders, so existing milestone UI never reads a config lacking start/target). Enabling a target auto-includes its objective + pillar.

**Repo** (`src/db/goalRepo.ts`): `saveFrameworkPlan` archives prior `fw:%` goals then `createGoalBatch` (so re-save **replaces**); `getFrameworkPlanGoals` loads them. `createGoalBatch` now also persists `current_value`/`aligned_values` when supplied (existing callers unaffected).

**Route** `app/api/goals/plan` — `GET` (load → parsed flow state) + `POST` (save), Zod-validated (`NewGoalsPlanSchema`), ≤50 lines.

**UI**: `SummaryStep` has a **Save my plan** button (idle/saving/saved/error); `NewGoalsFlow` GETs on mount to rehydrate selections + overrides.

**Editable titles + custom goals** (added on top of persistence):
- Every pillar / objective / target title is click-to-edit (`EditableTitle` component) in the Goals step (pillar header + target rows) and the Summary tree (all three). Renames live in flow state `labels` (keyed by framework/custom id) and persist as the goal row `title`; reload restores only titles that differ from the framework default.
- "**Add your own goal to <pillar>**" button per pillar creates a custom numeric target (`makeCustomFrameworkTarget`) — rename + set value/start/date/pins with the same milestone editor; trash icon removes it. Persisted as `fw:custom:<id>` rows under a synthetic per-pillar `fw:obj:custom:<pillar>` container (pillar + unit stashed in `milestone_config.customPillar`/`customUnit`). Reload rebuilds `customTargets` + their overrides; the synthetic container is skipped (not exposed as a user objective).

**Verified**: 14 mapper unit tests + two end-to-end runs (16-check persistence + 18-check rename/add-goal: UI rename → add custom → save → DB rows → reload rehydration).

**Limitations**: custom pillars (no framework id) aren't persisted; `linked_metric` isn't set (so no auto-sync from tracking yet); descending goals store `current_value > target_value` so the existing progress % is cosmetically off (framework UI renders them correctly via `milestone_config`).

## 9. Design documents

| Doc | Location |
|-----|----------|
| Original handoff (grammar + funnel model) | `docs/plans/goal-framework-handoff.md` |
| This handoff (implementation state) | `docs/plans/goal-framework-handoff-v2.md` |
| Debate transcript | Ran as a workflow, not persisted to file |
| Plan file (latest iteration) | `.claude/plans/precious-stargazing-goose.md` |

---

## 10. One-line summary

A test page at `/test/new-goals` implementing a 5-primitive grammar (Volume/Skill/Target/Habit/Stage) with driver/metric roles, shared deduped drivers, click-to-apply templates with difficulty levels, type-bucketed flat pool with inline milestone + ramp editors, and a central date picker — all client-side, no DB, 3-step flow.
