# Better Goals

As for everything else in this project, we're aiming for absolute best quality. No shortcuts are ever necessary. Think of the best possible quality we can create for every feature, and the site as a whole.

> **EDITING RULE:** When cleaning up this doc, consolidate *structure and prose* — never collapse, merge, or remove individual list items (goals, categories, variants). Every brainstormed item stays until explicitly removed by the user.

## Reference Diagrams

![Goal 1 - Career hierarchy](/goal%20pictures/goal%201.jpg)
![Goal 2 - Dating hierarchy (approaches, habits)](/goal%20pictures/goal%202.jpg)
![Goal 2 continued - Instadates, phone numbers, outcomes](/goal%20pictures/goal%203.jpg)

## Objective

Users should EASILY create goal hierarchies. The system does the hard work. Manual creation of 60+ sub-goals is a non-starter.

---

## Architecture: The Goal Graph

Goals aren't a rigid template — they're a **graph of known relationships**. Users can enter at any level. The system helps them fan out downward and optionally connect upward.

### Goal Levels

**Level 0 — Life dream:**
- Get married to my dream girl
- Start a happy and loving family
- Find the love of my life

**Level 1 — Major life goal ("one person" flavor):**
- Get a girlfriend
- Find my dream girl
- Get engaged to my dream girl
- Be in a deeply fulfilling relationship
- Find "the one"

**Level 1 — Major life goal ("abundance" flavor):**
- Build a rotation
- Have an abundant dating life
- Sleep with X women
- Date very attractive women
- Have casual options whenever I want
- Experience variety before settling down

**Level 2 — Transformation / mastery (confidence & inner game):**
- Become the man I want to be
- Become confident with women
- Never fear rejection again
- Overcome approach anxiety permanently
- Feel worthy of love / attractive
- Become socially fearless
- Develop unshakeable self-worth
- Develop masculine frame / leadership

**Level 2 — Transformation / mastery (skill-focused):**
- Master daygame
- Master cold approach
- Become great at talking to women
- Master seduction / attraction
- Become "naturally" attractive (no techniques needed)
- Master dating (being great on dates)
- Master texting game
- Master night game
- Master social circle game
- Master online dating

**Level 2 — Transformation / mastery (lifestyle):**
- Never worry about dating again
- Have total dating freedom
- Be able to attract any woman I want
- Be the guy women approach
- Build an attractive lifestyle
- Maximize physical attractiveness

**Level 2 — Transformation / mastery (meta):**
- Become a daygame coach / mentor
- Document my journey

**Level 3 — Specific skill / metric (input):**
- Approach volume (cumulative: 1 → 5 → 10 → ... → 1000)
- Approach frequency (habit ramp: 10/week → 15/week → 25/week)
- Session frequency (days per week in field)
- Consecutive days approaching
- Hours in field (cumulative)
- Texting conversations initiated
- Dates planned / executed
- Voice notes / field reports recorded

**Level 3 — Specific skill / metric (outcome):**
- Phone numbers collected
- Instadates
- Day2s / dates from cold approach
- Second dates
- Kiss closes
- Sex / lays from daygame
- Women dating simultaneously (rotation size)
- Sustained rotation for X months

**Any level can be a user's entry point.** Someone entering "Master daygame" at Level 2 gets the same downward fan-out as someone whose Level 0 goal cascaded through to it.

### Smart Prompting (two directions)

**Downward:** "To achieve 'Master Daygame', most people work on these areas: [approach volume, frequency, numbers, instadates, ...]. Which do you want to include?"

**Upward:** "Is 'Master Daygame' part of a bigger goal for you? People often connect it to 'Get a Girlfriend' or 'Dating Abundance'."

Every goal knows what it **fans into** (down) and what it **could belong to** (up). Users build in both directions.

### Goal Types

| Type | Example | Reporting |
|------|---------|-----------|
| **Input** (green) | Approaches/week, videos/week | Recurring |
| **Outcome** (red) | Phone numbers, subscribers, instadates | One-time date |
| **Habit Ramp** | 25/week: prove once → 4wk → 8wk → 12wk | Graduated duration |
| **Milestone Ladder** | 1 → 5 → 10 → 25 → ... → 1000 | Progressive targets |

### Date Derivation

Milestone dates aren't arbitrary — they derive from the habit ramp. If you define the ramp (10/week months 1-3, 15/week months 4-6, 25/week months 7+), cumulative milestones + dates fall out mathematically. Outcome milestones estimated via conversion rates.

---

## Design Decisions (Reference)

### Decision 1: Goal Catalog — DECIDED

Full catalog lives in "Goal Levels" section above.

- Fan-outs are **defaults** — user can toggle any sub-goal on/off
- Keep direct language (phone numbers, instadates, dates, etc.) — no sanitizing
- All L1 goals (both "one person" and "abundance" flavors) share the same default L3 targets for v1
- **v2:** Differentiate sub-goals between "one person" and "abundance" flavors

**Fan-out edges (v1):**

Any L1 goal → these L2 achievements:
- Master Daygame
- Become Confident with Women

Any L2 achievement → all L3 goals below (same set for both achievements in v1):

| Category | L3 Goal | Type | Default Target |
|----------|---------|------|---------------|
| Field Work | Approach Volume | Milestone ladder | 1 → 1000 |
| Field Work | Approach Frequency | Habit ramp | 10/wk → 25/wk |
| Field Work | Session Frequency | Habit ramp | 3 days/wk |
| Field Work | Consecutive Days | Milestone ladder | 1 → 30 |
| Results | Phone Numbers | Milestone ladder | 1 → 25 |
| Results | Instadates | Milestone ladder | 1 → 10 |
| Results | Dates (cold approach) | Milestone ladder | 1 → 15 |
| Results | Second Dates | Milestone ladder | 1 → 10 |
| Dirty Dog | Kiss Closes | Milestone ladder | 1 → 15 |
| Dirty Dog | Lays | Milestone ladder | 1 → 10 |
| Dirty Dog | Rotation Size | Milestone ladder | 1 → 3 |
| Dirty Dog | Sustained Rotation | Habit ramp | 1 → 6 months |

### Decision 2: Goal Display Categories — DECIDED

| Category | Contains | Default |
|----------|----------|---------|
| **Field Work** | Approaches/wk, sessions, hours, consecutive days | Shown |
| **Results** | Phone numbers, instadates, dates, 2nd dates | Shown |
| **Dirty Dog Goals** | Lays, kiss closes, rotation size, sustained rotation | **Opt-in** |

### Decision 3: L2 Goals = Achievements (Badges) — DECIDED

Visual hierarchy:
```
L1: Get a Girlfriend
  🏆 Master Daygame         ██████░░░░  62% of milestones reached
  🏆 Become Confident       ████░░░░░░  40% of milestones reached

  ── Field Work ──────────────────────
  📊 Approaches/week         15/wk → 25
  📊 Sessions/week           3/wk

  ── Results ─────────────────────────
  🎯 Phone numbers           3 / 25
  🎯 Instadates              1 / 10
  🎯 Dates                   0 / 15

  ── Dirty Dog Goals ─── [expand ▾]
```

Achievement weights (v1): Approach Volume = 50%, remaining 50% distributed across other L3 goals. Auto-redistribution when goals removed.

### Decision 4: Milestone Curve Editor — DECIDED

Interactive XY curve editor with semi-logarithmic default. Users drag control points to reshape. Power users edit individual milestone values.

### Decision 5: Default Targets & Milestone Shapes — DECIDED

- No fixed conversion rates — users self-select
- Users pick their own ramp starting point
- Milestone dates derive from user's ramp schedule
- Date derivation based on target date working backward

### Decision 6: UX Flow — DECIDED (v1)

**Option C: "Just get me started":**
1. User picks ONE goal at any level
2. System generates full recommended tree with defaults
3. User customizes after generation

### Decision 7: Daily Loop & Dopamine — DECIDED

**Daily view (action mode):** Weekly targets + current progress, next milestone only, streak counter.

**Strategic view (meaning mode):** Full milestone ladder, achievement progress, date projections, curve editor.

**Celebration cascade:** log approach → subtle tick. Weekly target hit → toast. Milestone hit → confetti. Achievement threshold → epic.

### Decision 8: Non-Dating Domains — DEFERRED

Daygame/dating first. Future: book writing, YouTube channel, financial independence, fitness, etc.

---

## Completed Phases (0–6) — Summary

All phases 0–6 are ✅ DONE. Key deliverables:
- **Phase 0:** Goal catalog, fan-out edges, default targets, UX direction
- **Phase 1:** Type system (`goal_nature`, `display_category`, `goal_level`, `template_id`, `goal_type: habit_ramp`), DB migrations
- **Phase 2:** Algorithms (milestone ladder generator, curve engine, ramp date calculator, achievement progress)
- **Phase 3:** Goal graph data files (`goalGraph.ts`)
- **Phase 4:** All UI (catalog picker, fan-out customization, achievement badges, categories, curve/ramp editors, upward prompts)
- **Phase 6:** Gap fixes (persist milestone_config/ramp_steps, manual goal graph fields, daily/strategic views, date projections)

**Migrations applied:**
- `20260213_add_goal_graph_fields.sql` — goal_nature, display_category, goal_level, template_id, goal_type CHECK
- `20260214_add_milestone_ramp_columns.sql` — milestone_config (jsonb), ramp_steps (jsonb)

---

## Future (DEFERRED)

- Non-dating domain templates
- AI-assisted decomposition for unknown goal types
- Advanced UX flows (wizard, interactive tree builder)
- Time commitment reality-checker
- **More L3 goals:** Hours in Field, Voice Notes / Field Reports, Texting Conversations, Dates Planned
- **Differentiate L1 flavors:** "One person" vs "abundance" get different default sub-goals and targets
- **Differentiate achievement weights:** "Master Daygame" weights results higher, "Become Confident" weights exposure/consistency higher
- Celebration cascade: trigger by event type not time horizon

---

## Phase 7: UI/UX Polish (AI)

Bugs and UX gaps discovered during live testing with a real user account. Six milestones, each produces a working app state improvement.

**Dependency graph:**
```
7.1 (metric sync fix) ───┐
7.6 (L2 daily hiding) ───┼──→ 7.2 (daily view redesign) ──→ 7.4 (breadcrumb cleanup)
                          │
7.3 (catalog for existing users) — independent
7.5 (dirty dog opt-in) — independent
```

7.1, 7.3, 7.5, 7.6 are independent (parallelizable). 7.2 depends on 7.1 + 7.6. 7.4 depends on 7.2.

---

### MILESTONE 7.1: "Auto-sync uses correct metric type (cumulative vs weekly)"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — extends LinkedMetric type and fixes data mappings.

**Problem:** `Approach Volume` (milestone_ladder, target 1000) and `Approach Frequency` (habit_ramp, target 10/wk) both link to `approaches_weekly`. The sync function puts `current_week_approaches` (e.g. 12) into both goals. Approach Volume should show **cumulative total** approaches (from `total_approaches` in tracking stats), not this week's count. Same issue for Phone Numbers and Instadates — milestone goals linking to weekly metrics that return 0.

**Root cause:** `goalGraph.ts` assigns `linkedMetric: "approaches_weekly"` to `l3_approach_volume`, but that goal is cumulative. The `LinkedMetric` type only has weekly variants. No cumulative metric types exist.

**FILES TO MODIFY:**

- `src/db/goalTypes.ts` — extend `LinkedMetric` union with:
  - `"approaches_cumulative"`
  - `"sessions_cumulative"`
  - `"numbers_cumulative"`
  - `"instadates_cumulative"`

- `src/db/goalRepo.ts` — in `getMetricValue()` (~line 405):
  - Add cases for cumulative types: `"approaches_cumulative"` → `stats.total_approaches`, `"sessions_cumulative"` → `stats.total_sessions`
  - For `numbers_cumulative` and `instadates_cumulative`: return 0 (tracking doesn't count these yet — add TODO)
  - Widen `stats` param type to include `total_approaches` and `total_sessions` (already returned by `getUserTrackingStats`)

- `src/goals/data/goalGraph.ts` — change linked metrics on milestone goals:
  - `l3_approach_volume`: `"approaches_weekly"` → `"approaches_cumulative"`
  - `l3_phone_numbers`: `"numbers_weekly"` → `"numbers_cumulative"`
  - `l3_instadates`: `"instadates_weekly"` → `"instadates_cumulative"`
  - Keep `l3_approach_frequency` as `"approaches_weekly"` (correct)
  - Keep `l3_session_frequency` as `"sessions_weekly"` (correct)

**FILES TO NOT TOUCH:**
- `src/goals/components/GoalCard.tsx`
- `src/goals/milestoneService.ts`

**MIGRATION SQL** (fix existing goals in DB):
```sql
-- Fix cumulative milestone goals incorrectly linked to weekly metrics
UPDATE user_goals SET linked_metric = 'approaches_cumulative'
  WHERE template_id = 'l3_approach_volume' AND linked_metric = 'approaches_weekly';
UPDATE user_goals SET linked_metric = 'numbers_cumulative'
  WHERE template_id = 'l3_phone_numbers' AND linked_metric = 'numbers_weekly';
UPDATE user_goals SET linked_metric = 'instadates_cumulative'
  WHERE template_id = 'l3_instadates' AND linked_metric = 'instadates_weekly';
```

**TESTS TO ADD:**
- Unit test: `getMetricValue` returns `total_approaches` for `"approaches_cumulative"` and `current_week_approaches` for `"approaches_weekly"`
- `treeGenerationService.test.ts`: verify `l3_approach_volume` insert has `linked_metric: "approaches_cumulative"`, `l3_approach_frequency` has `"approaches_weekly"`

**ACCEPTANCE TEST:**
1. Sync runs → Approach Volume shows cumulative total (e.g., 363/1000)
2. Approach Frequency shows this week only (e.g., 12/10)
3. Session Frequency shows this week only

**DONE WHEN:** Milestone goals display cumulative metrics. Habit ramp goals display weekly metrics.

---

### MILESTONE 7.2: "Daily view shows only actionable goals, with meaningful summary"

**DEPENDS ON:** 7.1 (correct metrics), 7.6 (L2 exclusion logic)
**DESTRUCTIVE:** Yes — rewrites DailyActionView filtering and summary.
**SAFE BECAUSE:** Only changes DailyActionView.tsx and goalsService.ts. Strategic view untouched.

**Problem (two bugs):**

**Bug A — All goals appear in Daily view:** `deriveTimeHorizon()` (goalsService.ts:149) for milestone goals without `target_date` falls through to the `period` switch (line 176). Since all generated goals have `period: "weekly"`, every goal — including "Get a girlfriend" (L1), "Approach Volume" (cumulative milestone), "Phone Numbers" (cumulative milestone) — gets classified as "This Week" and shows in Daily view.

**Bug B — Summary is meaningless:** Weekly progress header sums ALL goal targets: `363/1093 this week`. This sums Approach Volume target (1000) + Frequency (10) + Sessions (3) + Days (30) + Numbers (25) + etc. — different units, different horizons, nonsensical total.

**FILES TO MODIFY:**

- `src/goals/goalsService.ts`:
  - Fix `deriveTimeHorizon()`: milestone goals without `target_date` → return `"Long-term"` instead of falling through to period switch. Only `recurring` and `habit_ramp` use period-based logic.
  - Add `isDailyActionable(goal: GoalWithProgress): boolean`:
    - Returns `true` ONLY for L3 goals (`goal_level === 3`) with `goal_type === "habit_ramp"` or `goal_type === "recurring"`
    - Returns `false` for milestone goals, L0/L1/L2 goals, goals without `goal_level`

- `src/goals/components/DailyActionView.tsx`:
  - Replace `deriveTimeHorizon` filtering with `isDailyActionable(goal)` filter
  - Summary header: instead of summing all targets, show per-goal lines:
    - "Approaches: 12/15 this week" (from approach frequency goal)
    - "Sessions: 2/3 this week" (from session frequency goal)
  - Remove broken aggregate `totalCurrent/totalTarget`

**FILES TO NOT TOUCH:**
- `src/goals/components/GoalHierarchyView.tsx`
- `src/goals/components/GoalCard.tsx`
- `src/db/goalRepo.ts`

**TESTS TO ADD:**
- `isDailyActionable`: true for L3 habit_ramp weekly, true for L3 recurring weekly, false for L3 milestone, false for L1/L2, false for null level
- `deriveTimeHorizon`: returns `"Long-term"` for milestone without target_date

**ACCEPTANCE TEST:**
1. Daily view shows ONLY habit ramp + recurring L3 goals (Approach Frequency, Session Frequency)
2. Milestone goals (Approach Volume, Phone Numbers, etc.) do NOT appear
3. L1/L2 goals do NOT appear
4. Summary shows per-goal weekly progress, not broken aggregate
5. Strategic view unchanged — all goals visible

**DONE WHEN:** Daily view is a focused action dashboard with only this-week habits.

---

### MILESTONE 7.3: "Existing users can add new goal trees from catalog"

**DEPENDS ON:** Nothing (independent)
**DESTRUCTIVE:** No — adds UI paths, removes nothing.

**Problem:** `GoalCatalogPicker` only renders when `goals.length === 0` (`GoalsHubContent.tsx:202`). Once a user creates goals, they can never access the catalog again. If a user has "Get a girlfriend" and wants to add "Build a rotation", they must create every sub-goal manually — defeating the system's purpose.

**UX design:**
- "Browse Catalog" button next to "New Goal" in hub header (visible when goals exist)
- Opens catalog picker in modal/overlay (not replacing hub view)
- Already-created L0/L1 goals shown with "Active" badge, not selectable
- Tree preview marks sub-goals user already has (via `template_id` match) as "Already tracking" and pre-unchecks them
- "Create N Goals" only creates NEW goals, skipping duplicates
- New goals wire parent references to existing parents (e.g., new L3 goals under existing "Master Daygame")

**FILES TO MODIFY:**

- `src/goals/components/GoalsHubContent.tsx`:
  - Add `showCatalog` state
  - Add "Browse Catalog" button (Sparkles icon) next to "New Goal"
  - Render `GoalCatalogPicker` in modal when `showCatalog && goals.length > 0`
  - Pass `existingGoals={goals}` to picker

- `src/goals/components/GoalCatalogPicker.tsx`:
  - Accept optional `existingGoals?: GoalWithProgress[]` prop
  - When provided:
    - Gray out L0/L1 cards whose `template_id` matches existing goal, add "Active" badge
    - In tree preview: pre-uncheck goals matching existing `template_id`, label "Already tracking"
    - Wire `parent_goal_id` for new L3 goals to existing L2 parents (find by `template_id`)
  - Support modal mode (close button, backdrop overlay)

- `src/goals/goalsService.ts`:
  - Add `findExistingByTemplate(goals, templateId): GoalWithProgress | null`

**FILES TO NOT TOUCH:**
- `src/goals/treeGenerationService.ts`
- `src/goals/data/goalGraph.ts`
- `app/api/goals/batch/route.ts`

**TESTS TO ADD:**
- `findExistingByTemplate` returns match or null

**ACCEPTANCE TEST:**
1. User has 11 goals from "Get a girlfriend"
2. Click "Browse Catalog" → catalog opens in overlay
3. "Get a girlfriend" grayed out with "Active" badge
4. Click "Build a rotation" → preview shows sub-goals
5. Shared sub-goals (Approach Volume etc.) pre-unchecked, labeled "Already tracking"
6. "Create N Goals" creates only new ones
7. New L3 goals under shared L2 parent wire correctly

**DONE WHEN:** Existing users add goal trees without duplicates. Shared sub-goals detected and skipped.

---

### MILESTONE 7.4: "Breadcrumbs are contextual, not redundant"

**DEPENDS ON:** 7.2 (daily view affects breadcrumb needs)
**DESTRUCTIVE:** No — modifies display logic only.

**Problem:** Every GoalCard shows full ancestor breadcrumb "Daygame > Get a girlfriend > Master Daygame" even when all sibling cards share the same parent. In "FIELD WORK" section containing only children of "Master Daygame", the full breadcrumb repeated 4x is visual noise.

**Design rule:** Show breadcrumb only when it adds info:
- **Category sections** (strategic view): hide breadcrumbs — section header provides context
- **Daily view:** show parent name only, not full chain
- **Standalone contexts:** full breadcrumb

**FILES TO MODIFY:**

- `src/goals/components/GoalCard.tsx`:
  - Add `breadcrumbMode?: "full" | "parent-only" | "none"` prop (default: `"full"`)

- `src/goals/components/GoalCategorySection.tsx`:
  - Pass `breadcrumbMode="none"` to GoalCard children

- `src/goals/components/DailyActionView.tsx`:
  - Pass `breadcrumbMode="parent-only"` to GoalCard children

- `src/goals/components/GoalHierarchyView.tsx`:
  - Uncategorized goals keep `breadcrumbMode="full"`

**FILES TO NOT TOUCH:**
- `src/goals/components/GoalHierarchyBreadcrumb.tsx`

**ACCEPTANCE TEST:**
1. Strategic FIELD WORK section: no breadcrumbs on cards
2. Daily view: cards show just "Master Daygame" not full chain
3. Uncategorized goals still show full breadcrumb

**DONE WHEN:** Breadcrumbs appear only when they add context.

---

### MILESTONE 7.5: "Dirty Dog section visible as collapsed opt-in in strategic view"

**DEPENDS ON:** Nothing (independent)
**DESTRUCTIVE:** No — adds UI section.

**Problem:** If user didn't opt into Dirty Dog goals during catalog creation, strategic view shows no Dirty Dog section. User has no way to discover or opt into these goals later.

**FILES TO MODIFY:**

- `src/goals/components/GoalHierarchyView.tsx`:
  - After existing category sections, if `dirty_dog` category has 0 goals: render placeholder section
  - Placeholder: "DIRTY DOG GOALS" header, opt-in copy ("These track intimate outcomes. Opt in if relevant to your goals."), "Add Goals" button
  - Wire button to `onAddDirtyDogGoals` callback

- `src/goals/components/GoalsHubContent.tsx`:
  - Handle `onAddDirtyDogGoals`: create 4 dirty dog goals via batch API with correct parent refs

- `src/goals/goalsService.ts`:
  - Add `generateDirtyDogInserts(existingGoals): UserGoalInsert[]` — returns 4 dirty dog template goals parented to existing L2

**TESTS TO ADD:**
- `generateDirtyDogInserts` returns 4 goals with correct template_ids

**ACCEPTANCE TEST:**
1. No dirty dog goals → strategic view shows collapsed placeholder with opt-in copy
2. Click "Add Goals" → 4 goals created
3. Section shows goals normally after opt-in

**DONE WHEN:** Strategic view always shows dirty dog section — either with goals or as opt-in.

---

### MILESTONE 7.6: "L1/L2 goals hidden from Daily view"

**DEPENDS ON:** Nothing (but do before 7.2)
**DESTRUCTIVE:** No — filtering only.

**Problem:** L1 ("Get a girlfriend" 0/1) and L2 ("Master Daygame" 0/1) appear as cards in Daily view. These are structural/aspirational, not daily action items. They clutter the dashboard with misleading "0/1" progress bars.

**Design:** L0/L1/L2 goals appear ONLY in Strategic view. Daily view is exclusively for L3 work goals.

**Implementation:** Handled by `isDailyActionable(goal)` in 7.2 — checks `goal_level >= 3`. This milestone documents the design decision; implementation is merged into 7.2.

**DONE WHEN:** L0/L1/L2 goals never appear in Daily view.

---

### Phase 7 Work Summary

| Milestone | What | Priority | Status |
|-----------|------|----------|--------|
| **7.1** | Fix linked metric sync (cumulative vs weekly) | P0 | DONE |
| **7.2** | Daily view: only actionable L3 goals + meaningful summary | P0 | DONE |
| **7.3** | Existing users add goal trees from catalog | P0 | DONE |
| **7.4** | Breadcrumbs contextual, not redundant | P1 | DONE |
| **7.5** | Dirty Dog section opt-in placeholder in strategic view | P1 | DONE |
| **7.6** | L1/L2 goals hidden from Daily view (merged into 7.2) | P0 | DONE |

**Recommended build order:** 7.1 → 7.6 → 7.2 → 7.4 (serial). 7.3 and 7.5 parallel with anything.
