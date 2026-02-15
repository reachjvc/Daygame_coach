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

## Completed Phases (0–11) — Summary

All phases 0–11 are ✅ DONE.

- **Phase 0:** Goal catalog, fan-out edges, default targets, UX direction
- **Phase 1:** Type system (`goal_nature`, `display_category`, `goal_level`, `template_id`, `goal_type: habit_ramp`), DB migrations
- **Phase 2:** Algorithms (milestone ladder generator, curve engine, ramp date calculator, achievement progress)
- **Phase 3:** Goal graph data files (`goalGraph.ts`)
- **Phase 4:** All UI (catalog picker, fan-out customization, achievement badges, categories, curve/ramp editors, upward prompts)
- **Phase 6:** Gap fixes (persist milestone_config/ramp_steps, manual goal graph fields, daily/strategic views, date projections)
- **Phase 7:** UI/UX polish (cumulative metrics, daily view filter, catalog for existing users, contextual breadcrumbs, dirty dog opt-in, L1/L2 daily hiding)
- **Phase 8:** Bug fixes — dirty dog batch insert `_tempId` fix, cumulative metric migrations, auto-synced goals read-only, sub-goal button hidden on L3 leaves
- **Phase 9:** UX hardening — ActionToast component, error toasts on all goal actions, completion dialog error handling, "(synced)" indicator on collapsed auto-synced goals, daily empty state with clickable actions, life area override warning in GoalFormModal
- **Phase 10:** UX fixes (17 issues) — weekly sync week-boundary validation, `numbers_weekly`/`instadates_weekly` tracking columns, cumulative enum migrations restored, new-user manual creation path, period-aware time labels in Daily view, cumulative metrics in form, optional milestone dates, milestone info in Strategic view, "(synced)" → "auto-tracked", empty summary card hidden, mobile ViewSwitcher labels, sub-goal button flow-based layout, toast queue with stacking, L0 dream goal banner, optimistic UI for increment/setValue/reset
- **Phase 11:** UX polish & edge cases (8 issues) — clear parent on life area change, hide auto-tracked on completed goals, dirty dog double-click guard, achievement badge label fix, milestone "all-time"/"by date" labels, habit ramp schedule in GoalCard, archived goals hint in Daily empty state, empty Strategic view guidance

**Migrations (all on disk, apply in order):**
- `20260213_add_goal_graph_fields.sql` — goal_nature, display_category, goal_level, template_id, goal_type CHECK
- `20260214_add_milestone_ramp_columns.sql` — milestone_config (jsonb), ramp_steps (jsonb)
- `20260214a_add_cumulative_enum.sql` — adds `approaches_cumulative`, `sessions_cumulative`, `numbers_cumulative`, `instadates_cumulative` enum values
- `20260214b_fix_linked_metrics.sql` — updates existing goals to use cumulative metrics
- `20260214c_add_weekly_number_columns.sql` — adds `current_week_numbers`, `current_week_instadates` to `user_tracking_stats`

---

- **Phase 12:** UX audit fixes (9 issues) — auto-switch to Strategic after catalog tree creation, prominent "create your own" button, sticky form footer on mobile, dirty dog preview list, generic streak label, variant-aware toast duration, aria-labels on icon buttons, breadcrumb truncation 20→25 chars, life area override note persists until user acts

---

## Phase 13–14: UX Fixes (Ready to Implement)

Consolidated from code-path audit + live browser testing. All decisions resolved.

---

### 13.1 — Manual goal invisible in Daily view — CRITICAL

**Files:** `goalsService.ts`
**Problem:** `isDailyActionable()` requires `goal_level === 3`. Custom goals (created via "New Goal") have `goal_level === null` → hidden from Daily view. Confirmed live with both daily boolean and weekly counter goals.

**Steps:**
1. In `goalsService.ts`, change `isDailyActionable` (line ~203):
   ```typescript
   export function isDailyActionable(goal: GoalWithProgress): boolean {
     if (goal.goal_level !== null && goal.goal_level !== 3) return false
     return goal.goal_type === "habit_ramp" || goal.goal_type === "recurring"
   }
   ```
2. Update existing unit test for `isDailyActionable` in `tests/unit/goals/goalsService.test.ts` — add cases for `goal_level: null` with recurring and habit_ramp types returning `true`.
3. Run `npm test`.

**Verify:** Create a standalone recurring goal (no parent). Switch to Daily view. Goal must appear.

---

### 13.2 — L3 milestone goals hidden in Daily view — HIGH

**Files:** `DailyActionView.tsx`, `goalsService.ts`
**Problem:** Daily view only shows habit_ramp/recurring goals. The 8+ milestone goals (Approach Volume, Phone Numbers, etc.) are invisible in Daily. User sees 2-3 cards when they have 10+ goals.
**Decision:** Add read-only "Milestones" summary section below actionable goals.

**Steps:**
1. In `goalsService.ts`, add a new export function:
   ```typescript
   export function isDailyMilestone(goal: GoalWithProgress): boolean {
     return (goal.goal_level === 3 || goal.goal_level === null)
       && goal.goal_type === "milestone"
       && !goal.is_archived
   }
   ```
2. In `DailyActionView.tsx`:
   - Import `isDailyMilestone` and `getNextMilestoneInfo`
   - In the `useMemo`, compute `milestoneGoals = goals.filter(isDailyMilestone)`
   - After the actionable goals `<div>`, render a "Milestones" section (only if `milestoneGoals.length > 0`):
     ```tsx
     {milestoneGoals.length > 0 && (
       <div className="space-y-2">
         <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
           Milestones
         </h2>
         <div className="rounded-lg border border-border bg-card p-3 space-y-2">
           {milestoneGoals.map((g) => {
             const info = getNextMilestoneInfo(g)
             return (
               <div key={g.id} className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">{g.title}</span>
                 <span className="font-medium">
                   {g.current_value}/{g.target_value}
                   {info && <span className="text-xs text-emerald-400 ml-2">next: {info.nextValue}</span>}
                 </span>
               </div>
             )
           })}
         </div>
       </div>
     )}
     ```
   - Also show this section even when `actionableGoals.length === 0` (replaces the old empty state partially — user sees milestones instead of "nothing here")
3. Add unit test for `isDailyMilestone`.
4. Run `npm test`.

**Verify:** User with catalog-generated tree sees habit goals as cards + milestone goals in compact summary below.

---

### 13.4 — Catalog modal auto-switches returning user to Strategic — MEDIUM

**Files:** `GoalsHubContent.tsx`
**Problem:** Returning user on Daily view clicks "Browse Catalog" → adds tree → gets yanked to Strategic. Disorienting.

**Steps:**
1. In `GoalsHubContent.tsx` line ~349, change the modal catalog `onTreeCreated` callback:
   ```tsx
   onTreeCreated={() => {
     setShowCatalog(false)
     setIsLoading(true)
     fetchGoals()
   }}
   ```
   (Remove `setViewMode("strategic")` — only the new-user inline catalog at line ~288 should auto-switch.)
2. Run `npm test`.

**Verify:** On Daily view, open Browse Catalog, create a tree. Should stay on Daily view after creation.

---

### 13.5 — Achievement badges render at 0% with no L3 children — MEDIUM

**Files:** `GoalHierarchyView.tsx`
**Problem:** L2 badges render even with 0 L3 children. Shows confusing 0% progress.
**Decision:** Filter out achievements with 0 children.

**Steps:**
1. In `GoalHierarchyView.tsx`, inside the `sections.map` callback (line ~81), after computing `sectionL3s`, filter achievements:
   ```typescript
   const achievementsWithChildren = section.achievements.filter((ach) =>
     sectionL3s.some((g) => g.parent_goal_id === ach.id)
   )
   ```
2. Replace `section.achievements` with `achievementsWithChildren` in the grid render (line ~106).
3. Run `npm test`.

**Verify:** L2 achievement with 0 L3 children no longer renders a badge. Achievement with 1+ children still shows.

---

### 13.7 — Uncategorized L3 goals render without label — LOW

**Files:** `GoalHierarchyView.tsx`
**Problem:** L3 goals without `display_category` render in an unlabeled section.

**Steps:**
1. In `GoalHierarchyView.tsx` line ~197, add a heading before the uncategorized goals map:
   ```tsx
   {section.uncategorized.length > 0 && (
     <div className="space-y-2">
       <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
         Other Goals
       </h3>
       {section.uncategorized.map((goal) => (
   ```
2. Run `npm test`.

**Verify:** Uncategorized goals now appear under "Other Goals" heading.

---

### 13.8 — GoalCard meta row can overflow on mobile — LOW

**Files:** `GoalCard.tsx`
**Problem:** Meta row (streak, days remaining, period, milestone, projected date, auto-synced) in one `flex` row with no wrapping.

**Steps:**
1. In `GoalCard.tsx` line ~172, add `flex-wrap`:
   ```tsx
   <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
   ```
2. Run `npm test`.

**Verify:** On narrow viewport, meta items wrap instead of overflowing.

---

### 13.9 — Two edit entry points on GoalCard — LOW

**Files:** `GoalCard.tsx`
**Problem:** Title click (undiscoverable) AND explicit Edit button both open edit form. Title click competes with expand expectation.
**Decision:** Remove title click-to-edit, keep only explicit Edit button.

**Steps:**
1. In `GoalCard.tsx` line ~133-136, remove the `onClick` and `cursor-pointer` from the title:
   ```tsx
   <h3 className="font-medium text-sm truncate">
     {goal.title}
   </h3>
   ```
2. Run `npm test`.

**Verify:** Clicking title does nothing. Edit button in expanded section still works.

---

### 13.11 — "Add & Continue" success message too brief — LOW

**Files:** `GoalFormModal.tsx`
**Problem:** Success toast shows 2 seconds, easy to miss.

**Steps:**
1. In `GoalFormModal.tsx` line ~354, change `2000` to `3000`:
   ```typescript
   setTimeout(() => setSuccessMessage(null), 3000)
   ```
2. Run `npm test`.

**Verify:** "Add & Continue" success message stays visible for 3 seconds.

---

### 14.4 — Mobile header layout is cramped — MEDIUM

**Files:** `GoalsHubContent.tsx`
**Problem:** On mobile (375px), title+subtitle and 5 buttons compete in one row. Subtitle wraps excessively.

**Steps:**
1. In `GoalsHubContent.tsx` line ~250, change the header container to stack on mobile:
   ```tsx
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
   ```
2. Hide subtitle on mobile (it's not essential):
   ```tsx
   <p className="text-sm text-muted-foreground hidden sm:block">
     Track progress across all areas of your life
   </p>
   ```
3. Wrap the button row to allow wrapping on mobile:
   ```tsx
   <div className="flex items-center gap-2 flex-wrap">
   ```
4. Run `npm test`.

**Verify:** On 375px viewport: title shows, subtitle hidden, buttons wrap neatly below.

---

### 14.5 — Expanded milestone card shows less info than collapsed — LOW

**Files:** `GoalCard.tsx`
**Problem:** Expanding an auto-tracked milestone card shows only "Progress synced automatically" — less info than collapsed state.
**Decision:** Show milestone ladder with checkmarks and next target.

**Steps:**
1. In `GoalCard.tsx`, in the expanded section (line ~222), add a milestone ladder render for milestone-type goals with `milestone_config`:
   ```tsx
   {goal.goal_type === "milestone" && goal.milestone_config && (
     <div className="text-xs text-muted-foreground space-y-1">
       <p className="font-medium">Milestone ladder:</p>
       <div className="flex flex-wrap gap-2">
         {(goal.milestone_config as { milestones: number[] }).milestones.map((m: number) => {
           const reached = goal.current_value >= m
           return (
             <span key={m} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${reached ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}`}>
               {reached ? "✓" : "○"} {m}
             </span>
           )
         })}
       </div>
       {nextMilestone && (
         <p className="text-emerald-400 mt-1">Next: {nextMilestone.nextValue} ({nextMilestone.remaining} more)</p>
       )}
     </div>
   )}
   ```
   Place this BEFORE the existing `goal.linked_metric` auto-sync message so both show.
2. Confirm `milestone_config` shape — check `GoalWithProgress` type has `milestone_config` field. If not, add it to the type.
3. Run `npm test`.

**Verify:** Expand an "Approach Volume" card → see milestone steps with checkmarks, "Next: 5 (5 more)".

---

### 14.6 — Goal type button labels truncated on mobile form — LOW

**Files:** `GoalFormModal.tsx`
**Problem:** "Resets each period" and "Gradual increase" truncate on mobile.

**Steps:**
1. In `GoalFormModal.tsx` line ~391-393, shorten the descriptions:
   ```typescript
   { type: "recurring" as GoalType, label: "Recurring", desc: "Resets per period" },
   { type: "habit_ramp" as GoalType, label: "Habit Ramp", desc: "Ramps up over time" },
   ```
2. If still truncating, add `truncate` class to the desc element or switch to responsive hidden text on `sm:`.
3. Run `npm test`.

**Verify:** On 375px viewport, goal type labels fully visible without truncation.

---

### 14.3 — Catalog confusing for returning users with existing trees — MEDIUM

**Files:** `GoalCatalogPicker.tsx`
**Problem:** Returning user picks a new L1 → customize screen shows all L3 as "Already tracking" with gray toggles. Dead-end: "Create 1 Goal" would only make an orphan L1 parent with no children. User doesn't understand why they'd do this.

**Steps:**
1. In `GoalCatalogPicker.tsx`, in the customize/preview step, detect when ALL toggleable sub-goals are already tracked:
   ```typescript
   const allAlreadyTracked = previewInserts !== null
     && previewInserts.filter(g => g.goal_level === 3).length === 0
   ```
   (If `generateGoalTreeInserts` already excludes existing-template goals from inserts, check if all L3 inserts were filtered out.)
2. When `allAlreadyTracked`, show a contextual message above the create button:
   ```tsx
   {allAlreadyTracked && (
     <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
       All sub-goals are already active in another tree. Creating this adds a top-level goal only — you can add custom sub-goals to it afterward via "New Goal".
     </div>
   )}
   ```
3. Run `npm test`.

**Verify:** Returning user with full tree opens catalog → picks new L1 → sees the amber message explaining the situation.

---

### DEFERRED to Future

- **13.10** — Reset confirmation ESC-dismissable (inline confirmation is standard, not worth the complexity)
- **14.2** — "Build a rotation" empty shell (needs design for how multiple L1 trees share L3 goals — data model question, not a quick fix)

### VERIFIED WORKING (Phase 14 browser testing)

- Catalog tree creation flow: pick L1 → customize toggles → create → tree appears
- Suggestion chips: "10 approaches per week" auto-fills name + target + auto-sync metric
- Milestone curve editor: interactive, visually excellent
- Optimistic UI: +1 increment updates counter instantly with green progress bar
- Delete flow: inline confirmation → goal removed → list re-renders
- Achievement badges with progress bars render correctly
- Category sections (Field Work / Results / Dirty Dog) with counts and collapse
- Auto-synced labeling clear and non-intrusive
- Zero console errors throughout entire session
- Mobile layout generally solid (cards stack, modal sticky footer works)
- Edit modal fully functional with all fields pre-populated

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
