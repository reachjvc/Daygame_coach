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

## Completed Phases (0–7) — Summary

All phases 0–7 are ✅ DONE (code complete; Phase 7 has migration/runtime bugs fixed in Phase 8).
- **Phase 0:** Goal catalog, fan-out edges, default targets, UX direction
- **Phase 1:** Type system (`goal_nature`, `display_category`, `goal_level`, `template_id`, `goal_type: habit_ramp`), DB migrations
- **Phase 2:** Algorithms (milestone ladder generator, curve engine, ramp date calculator, achievement progress)
- **Phase 3:** Goal graph data files (`goalGraph.ts`)
- **Phase 4:** All UI (catalog picker, fan-out customization, achievement badges, categories, curve/ramp editors, upward prompts)
- **Phase 6:** Gap fixes (persist milestone_config/ramp_steps, manual goal graph fields, daily/strategic views, date projections)
- **Phase 7:** UI/UX polish (cumulative metrics, daily view filter, catalog for existing users, contextual breadcrumbs, dirty dog opt-in, L1/L2 daily hiding)

**Migrations applied:**
- `20260213_add_goal_graph_fields.sql` — goal_nature, display_category, goal_level, template_id, goal_type CHECK
- `20260214_add_milestone_ramp_columns.sql` — milestone_config (jsonb), ramp_steps (jsonb)

**Migrations NOT YET applied (see Phase 8.2):**
- Cumulative enum values (`approaches_cumulative`, etc.) + 3 UPDATE statements for existing goals

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

## Phase 7: UI/UX Polish — ✅ DONE

Code for 7.1–7.6 implemented. Key deliverables:
- **7.1:** Cumulative metric types (`approaches_cumulative`, etc.) in goalTypes, goalRepo, goalGraph. Code correct.
- **7.2:** `isDailyActionable()` filter, per-goal weekly summaries in DailyActionView, `deriveTimeHorizon` fix for milestones.
- **7.3:** "Browse Catalog" modal for existing users, "Active"/"Already tracking" badges, parent remapping.
- **7.4:** `breadcrumbMode` prop on GoalCard — "none" in categories, "parent-only" in daily.
- **7.5:** Dirty Dog placeholder with opt-in in strategic view, `generateDirtyDogInserts`.
- **7.6:** Merged into 7.2 — L0/L1/L2 excluded from daily via `goal_level === 3` check.

**Known issues from Phase 7 (fixed in Phase 8 below):**
- 7.1 migration was incomplete (missing 2 of 3 UPDATE statements)
- 7.5 dirty dog opt-in crashes at runtime (batch API rejects inserts without `_tempId`)
- Auto-synced goals misleadingly show manual increment buttons

---

## Phase 8: Bug Fixes & UX Hardening

Bugs and UX gaps found during post-Phase-7 audit. Three bugs (one blocker, one data, one UX) plus one minor cleanup.

**Dependency graph:**
```
8.1 (dirty dog batch fix) — independent
8.2 (migration file) — independent
8.3 (auto-sync read-only) — independent
8.4 (sub-goal button cleanup) — independent
```

All four are independent and parallelizable.

---

### MILESTONE 8.1: "Dirty Dog opt-in actually works"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — fixes existing broken code path.
**PRIORITY:** P0 BLOCKER — clicking "Add Goals" in dirty dog placeholder returns 400 error.

**Problem:** `generateDirtyDogInserts()` (goalsService.ts:410) returns `UserGoalInsert[]` without `_tempId`. The batch API (`app/api/goals/batch/route.ts:17`) requires `_tempId` on every insert:
```ts
if (!g.title || !g._tempId) {
  return NextResponse.json({ error: "Each goal needs title and _tempId" }, { status: 400 })
}
```
Every call to "Add Goals" fails silently (the error is caught but just sets error state).

**Root cause:** `generateDirtyDogInserts` was designed to return plain `UserGoalInsert[]` but the only batch endpoint requires `BatchGoalInsert` format (with `_tempId` and `_tempParentId`).

**Fix approach:** Change `generateDirtyDogInserts` to return `BatchGoalInsert[]`. These inserts already have real `parent_goal_id` (the L2 parent's UUID), so `_tempParentId` should be `null`. Each insert needs a unique `_tempId` (e.g., `"__temp_" + tmpl.id`).

**FILES TO MODIFY:**

- `src/goals/goalsService.ts` — `generateDirtyDogInserts()`:
  - Change return type from `UserGoalInsert[]` to `BatchGoalInsert[]`
  - Import `BatchGoalInsert` from `treeGenerationService`
  - Add `_tempId: "__temp_" + tmpl.id` and `_tempParentId: null` to each insert
  - Keep existing `parent_goal_id: l2Parent.id` (real UUID, not temp)

- `src/goals/components/GoalsHubContent.tsx` — `handleAddDirtyDogGoals`:
  - No change needed — it already sends `{ goals: inserts }` to batch endpoint
  - The batch endpoint's `createGoalBatch` handles `_tempParentId: null` correctly (uses `parent_goal_id` as-is)

**FILES TO NOT TOUCH:**
- `app/api/goals/batch/route.ts` — validation is correct, inserts need to conform to it
- `src/db/goalRepo.ts`

**TESTS TO ADD:**
- `goalsService.test.ts`: `generateDirtyDogInserts` returns objects with `_tempId` and `_tempParentId: null`
- `goalsService.test.ts`: each returned insert has `_tempId` starting with `"__temp_"`
- `goalsService.test.ts`: each returned insert has `parent_goal_id` set to the L2 parent's ID (real UUID)

**ACCEPTANCE TEST:**
1. User has goals, no dirty dog category
2. Strategic view → dirty dog placeholder visible
3. Click "Add Goals" → API returns 201 (not 400)
4. 4 dirty dog goals appear in dirty dog section
5. Goals have correct parent (first L2 achievement)

**DONE WHEN:** Dirty dog opt-in creates goals without errors.

---

### MILESTONE 8.2: "Complete cumulative metric migration"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — only adds enum values and fixes existing data.
**PRIORITY:** P0 DATA — Phone Numbers and Instadates goals show 0 progress for existing users.

**Problem:** The Phase 7.1 code changes are correct (goalGraph, goalTypes, goalRepo all handle cumulative metrics). But the DB migration was never created on disk, and the draft only contained 1 of 3 required UPDATE statements. Existing goals in the DB still have `linked_metric = 'numbers_weekly'` and `linked_metric = 'instadates_weekly'`, so sync returns 0 for them.

**FILES TO CREATE:**

- `supabase/migrations/20260214_fix_cumulative_linked_metrics.sql`:
```sql
-- Step 1: Add cumulative values to the linked_metric enum type
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approaches_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'numbers_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'instadates_cumulative';

-- Step 2: Fix existing milestone goals incorrectly linked to weekly metrics
-- (Must run in a separate transaction from ALTER TYPE — Supabase runs each
--  migration as one transaction, so run Step 1 first as its own migration
--  if this fails. Or run Step 2 manually in SQL editor after Step 1 commits.)
UPDATE user_goals SET linked_metric = 'approaches_cumulative'
  WHERE template_id = 'l3_approach_volume' AND linked_metric = 'approaches_weekly';
UPDATE user_goals SET linked_metric = 'numbers_cumulative'
  WHERE template_id = 'l3_phone_numbers' AND linked_metric = 'numbers_weekly';
UPDATE user_goals SET linked_metric = 'instadates_cumulative'
  WHERE template_id = 'l3_instadates' AND linked_metric = 'instadates_weekly';
```

**FILES TO NOT TOUCH:** All application code — 7.1 code is correct, only the migration is missing.

**IMPORTANT:** `ALTER TYPE ... ADD VALUE` cannot run inside a transaction in PostgreSQL. Supabase wraps each migration file in a transaction. Two options:
1. Split into two migration files: `20260214a_add_cumulative_enum.sql` (ALTER TYPE only) and `20260214b_fix_linked_metrics.sql` (UPDATE only)
2. Run the ALTER TYPE statements manually in the Supabase SQL editor first, then apply only the UPDATE migration

Option 1 (two files) is cleaner and automated. Use that approach.

**ACCEPTANCE TEST:**
1. Run migrations against Supabase
2. Query: `SELECT id, template_id, linked_metric FROM user_goals WHERE template_id IN ('l3_approach_volume', 'l3_phone_numbers', 'l3_instadates')` → all show cumulative metrics
3. Visit goals page → sync runs → Phone Numbers shows cumulative total (not 0)
4. Instadates shows cumulative total (not 0)
5. Approach Volume shows cumulative total

**DONE WHEN:** All three cumulative goals show real data from tracking stats after sync. Migration files exist on disk and are ready to apply.

---

### MILESTONE 8.3: "Auto-synced goals don't show manual increment buttons"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — hides buttons, doesn't remove functionality.
**PRIORITY:** P1 UX — confusing but not data-breaking.

**Problem:** Goals with `linked_metric` (Approach Frequency, Session Frequency, Approach Volume, etc.) show +1/+5 increment buttons and direct-entry inputs in both Daily and Strategic views. But every page load calls `syncLinkedGoals` which overwrites `current_value` with tracking data. So: user increments → sees change → refreshes → value reverts to synced data. The "Auto-synced" badge is visible but buried in the meta row.

**Design:** Auto-synced goals should show read-only progress, not editable inputs. The GoalCard already shows an "Auto-synced" badge with a Link icon. Expand this to replace the input widget.

**FILES TO MODIFY:**

- `src/goals/components/GoalCard.tsx`:
  - In the expanded actions section (~line 229), before rendering `GoalInputWidget`, check `goal.linked_metric`:
    - If `linked_metric` is set: render a read-only message instead of the input widget
    - Message: "Progress synced automatically from your session data" (small, muted text)
    - Still show Edit button (user can change linked_metric via form)
  - Keep the "Auto-synced" badge in the meta row as-is

- `src/goals/components/DailyActionView.tsx`:
  - No change needed — it passes `onIncrement` to GoalCard, and GoalCard will now gate it

**FILES TO NOT TOUCH:**
- `src/goals/components/GoalInputWidget.tsx` — the widget itself is fine, GoalCard just won't render it for synced goals
- `src/goals/goalsService.ts`
- `src/db/goalRepo.ts`

**ACCEPTANCE TEST:**
1. Daily view → Approach Frequency card (auto-synced) → expand → no +1/+5 buttons, shows "synced automatically" message
2. Session Frequency card → same behavior
3. Strategic view → Approach Volume card → expand → no direct-entry input, shows sync message
4. Manual (non-synced) goals → still show increment buttons normally
5. Edit button still works on synced goals → can change linked_metric to null → increment buttons reappear

**DONE WHEN:** Auto-synced goals show read-only progress. Manual goals unchanged.

---

### MILESTONE 8.4: "Sub-goal button only on L1/L2 goals"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — hides a button on leaf goals.
**PRIORITY:** P2 MINOR — cosmetic, no functional impact.

**Problem:** GoalCard shows a "Sub-goal" button on all milestone-type goals, including L3 leaf goals (Approach Volume, Phone Numbers, etc.). Creating a child of an L3 has no meaning in the goal graph — L3 is the lowest level. The button just adds visual noise to leaf cards.

**FILES TO MODIFY:**

- `src/goals/components/GoalCard.tsx` — line 101:
  - Current: `const showAddChild = onAddChild && (goal.goal_type === "milestone" || childCount > 0)`
  - Change to: `const showAddChild = onAddChild && (goal.goal_type === "milestone" || childCount > 0) && (goal.goal_level === null || goal.goal_level < 3)`
  - This hides the button on L3 goals. Goals without `goal_level` (legacy/custom) keep existing behavior.

**FILES TO NOT TOUCH:** Everything else.

**ACCEPTANCE TEST:**
1. Strategic view → Approach Volume (L3 milestone) → no "Sub-goal" button
2. Phone Numbers (L3 milestone) → no "Sub-goal" button
3. Get a Girlfriend (L1 milestone) → "Sub-goal" button still shows
4. Master Daygame (L2 milestone) → "Sub-goal" button still shows
5. Custom goal without goal_level → existing behavior preserved

**DONE WHEN:** "Sub-goal" button only appears on L0/L1/L2 goals.

---

### Phase 8 Work Summary

| Milestone | What | Priority | Status |
|-----------|------|----------|--------|
| **8.1** | Fix dirty dog batch insert (add `_tempId`) | P0 BLOCKER | ✅ DONE |
| **8.2** | Complete cumulative metric migration (3 UPDATEs + enum) | P0 DATA | ✅ DONE |
| **8.3** | Auto-synced goals read-only (hide increment buttons) | P1 UX | ✅ DONE |
| **8.4** | Sub-goal button only on L1/L2 (not L3 leaves) | P2 MINOR | ✅ DONE |

All four are independent — can be done in any order or in parallel.
