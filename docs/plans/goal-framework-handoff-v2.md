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
- **Editable milestones (freeze-and-flow)**: Each interior milestone dot is click-to-edit — pin its value (nice +/- steppers or direct entry, manual value respected exactly, e.g. 49 stays 49) and/or give it its own checkpoint date. Pinned milestones lock (filled dot + lock icon); the auto-curve regenerates only the *unpinned* milestones in the gaps around them. "Reset to auto" unpins. Endpoints (start/target) are edited via the row stepper + targetDate, not here. Stored in `TargetOverride.milestoneEdits` (keyed by step index; cleared when the milestone *count* changes). Generator support: `MilestoneLadderConfig.pins` → `generateMilestoneLadder` splits the ladder into sub-ladders between pinned anchors.
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

1. **No persistence** — everything is client-side state, nothing saves to DB.
2. **Ramp overrides are local** — edited ramps live in GoalsConfigStep state, not in the parent's `targetOverrides`. If you navigate back and forward, ramp edits are lost.
3. **No calibration flow** — the handoff doc describes "ask current level at adopt-time." Templates with levels are the proxy for this but there's no actual "what can you bench now?" intake.
4. **No regression model** — the debate identified that the framework needs to normalize sawtooth progress. Not implemented.
5. **No phase detection** — beginner vs intermediate feedback loops not differentiated.
6. **Stage/skill targets are read-only** — no way to mark stages as completed or skills as progressed.
7. **Custom pillars/objectives** — the UI supports adding them but they have no targets, templates, or shared drivers.
8. **Dead files** — ObjectiveStep.tsx and TargetStep.tsx should be deleted.
9. **The "daily interface"** — the debate concluded the daily experience should be "what did you do, what did you notice" — this test page only covers the setup flow, not the daily tracking view.

---

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
