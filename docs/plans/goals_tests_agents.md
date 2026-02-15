# Goals Test Coverage Plan

## Context

The goals feature has **zero** integration tests and **zero** E2E tests. Unit tests exist for pure service functions only. User experienced a data consistency bug: deleting all goals still showed a catalog template as "Active." The `user_goals` table isn't even in the integration test schema. This plan adds comprehensive test coverage across all three layers.

## Pre-Requisite for ALL Agents

Every agent MUST read `docs/testing_behavior.md` before writing any test code. Key rules:
- Deterministic tests only (no `Math.random()`, no `Date.now()` without freezing)
- No false passes (never silent `return` to skip logic — use `test.skip()` or throw)
- AAA pattern with explicit `// Arrange`, `// Act`, `// Assert` comments
- Call production functions or real APIs, not raw SQL INSERT/SELECT to validate behavior

## Agent Team Structure (3 builders + 1 reviewer)

| Agent | Role | Starts After |
|-------|------|-------------|
| **infra** | Schema + test helpers (Milestone 1) | Immediately |
| **integration** | Integration tests (Milestone 2) | Milestone 1 verified |
| **e2e** | Data-testid attrs + E2E tests (Milestones 3-4) | Milestone 1 verified (parallel with integration) |
| **reviewer** | Reviews code from all agents | Ongoing |

---

## MILESTONE 1: "Integration test infrastructure supports user_goals"

**DEPENDS ON:** Nothing
**DESTRUCTIVE:** No — only adds to existing files
**AGENT:** infra

### Files

| File | Op | What |
|------|-----|------|
| `tests/integration/schema.sql` | Modify | Add `user_goals` table |
| `tests/integration/setup.ts` | Modify | Update `truncateAllTables()`, add helpers |

**DO NOT TOUCH:** Any `src/` files, any E2E files, any existing test files

### Deliverables

#### 1.1 Add `user_goals` table to schema.sql

Add before the values table section. Schema must match fields in `src/db/goalTypes.ts` (`UserGoalRow`):

```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  tracking_type TEXT NOT NULL DEFAULT 'counter',
  period TEXT NOT NULL DEFAULT 'weekly',
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  period_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  custom_end_date DATE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  linked_metric TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  life_area TEXT NOT NULL DEFAULT 'custom',
  parent_goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  target_date DATE,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'recurring',
  goal_nature TEXT,
  display_category TEXT,
  goal_level INTEGER,
  template_id TEXT,
  milestone_config JSONB,
  ramp_steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_parent ON user_goals(parent_goal_id);
CREATE INDEX idx_user_goals_template ON user_goals(template_id);
```

Key: `parent_goal_id ON DELETE CASCADE` — children auto-delete when parent is deleted.

#### 1.2 Fix stale `user_tracking_stats` columns

Add missing columns to `user_tracking_stats` in schema.sql that `syncLinkedGoals` references:
- `current_week_numbers INTEGER NOT NULL DEFAULT 0`
- `current_week_instadates INTEGER NOT NULL DEFAULT 0`

#### 1.3 Update `truncateAllTables()` in setup.ts

Add `user_goals` to the TRUNCATE list (before `profiles` due to FK):

```
user_goals,
milestones,
sticking_points,
...
```

#### 1.4 Add `createTestGoal()` helper to setup.ts

```typescript
export async function createTestGoal(
  userId: string,
  overrides: Partial<{ title: string; category: string; target_value: number;
    period: string; tracking_type: string; life_area: string;
    parent_goal_id: string | null; template_id: string | null;
    goal_level: number | null; goal_type: string; position: number;
    is_active: boolean; is_archived: boolean; linked_metric: string | null;
    current_value: number; display_category: string | null; goal_nature: string | null }> = {}
): Promise<string>
```

Raw SQL INSERT (consistent with `createTestUser` pattern), returns goal `id`. Defaults: `title='Test Goal'`, `category='custom'`, `target_value=10`, `position=0`.

#### 1.5 Add `createTestGoalTree()` helper

Creates L1 → L2 → L3 hierarchy via 3 `createTestGoal` calls, returns `{ l1Id, l2Id, l3Id }`.

### Acceptance Test
- [ ] `npm run test:integration` — all existing tests pass
- [ ] New helper creates goal, verifiable via raw SELECT
- [ ] Create parent+child, delete parent, child also deleted (CASCADE)
- [ ] `truncateAllTables()` clears `user_goals`

---

## MILESTONE 2: "Integration tests cover schema constraints and data consistency"

**DEPENDS ON:** Milestone 1 verified
**DESTRUCTIVE:** No
**AGENT:** integration

### Files

| File | Op |
|------|-----|
| `tests/integration/db/goalRepo.integration.test.ts` | Create |

**DO NOT TOUCH:** `schema.sql`, `setup.ts` (infra owns), any `src/` files, any E2E files

### Deliverables

File header must document these are **schema tests** (raw SQL against testcontainers), matching pattern in `trackingRepo.integration.test.ts`. Use `beforeEach(truncateAllTables)`.

#### 2.1 Schema constraint tests — `describe("user_goals schema constraints")`

| Test | What it validates |
|------|-------------------|
| 2.1a | `title NOT NULL` — INSERT without title throws |
| 2.1b | `category NOT NULL` — INSERT without category throws |
| 2.1c | Default values correct — new row has `current_value=0, is_active=true, is_archived=false, tracking_type='counter', period='weekly'` |
| 2.1d | `user_id FK` — INSERT with non-existent user_id throws |
| 2.1e | `parent_goal_id` self-ref FK — valid parent works, non-existent parent throws |

#### 2.2 CASCADE behavior tests — `describe("cascade and delete behavior")` — CORE BUG AREA

| Test | What it validates |
|------|-------------------|
| 2.2a | Delete profile → all user goals deleted |
| 2.2b | Delete parent goal → child goals deleted (CASCADE) |
| 2.2c | `DELETE FROM user_goals WHERE user_id=$1` removes everything, count=0 |
| 2.2d | Create L1→L2→L3, delete all, zero rows remain (no orphans) |
| 2.2e | Delete parent with 2 children → both children gone |
| 2.2f | Delete one child → parent and sibling preserved |

#### 2.3 Template ID consistency — `describe("template_id data consistency")` — THE BUG SCENARIO

| Test | What it validates |
|------|-------------------|
| 2.3a | template_id stored and retrievable |
| 2.3b | Delete all clears ALL template_ids — `SELECT template_id WHERE user_id=$1` returns 0 rows |
| 2.3c | Recreate after delete-all — same template_id, only 1 row exists |
| 2.3d | Multi-user isolation — delete User A's goals, User B's goals unaffected |

#### 2.4 Archive/active state — `describe("archive and active state")`

| Test | What it validates |
|------|-------------------|
| 2.4a | Default state: `is_active=true, is_archived=false` |
| 2.4b | Archive sets `is_archived=true, is_active=false` |
| 2.4c | `deleteAll` (no filter) removes both active AND archived goals |

#### 2.5 Position and ordering — `describe("goal position and ordering")`

| Test | What it validates |
|------|-------------------|
| 2.5a | 3 goals with positions 0,1,2 → SELECT ORDER BY position returns correct order |
| 2.5b | Position update changes order |

#### 2.6 Linked metric columns — `describe("linked metrics")`

| Test | What it validates |
|------|-------------------|
| 2.6a | `linked_metric` nullable — NULL is valid |
| 2.6b | `current_week_numbers` and `current_week_instadates` columns exist in `user_tracking_stats` |

### Acceptance Test
- [ ] `npm run test:integration` — all ~20 new tests + all existing tests pass
- [ ] "Delete all clears all template_ids" test passes (reproduces bug at schema level)
- [ ] CASCADE tests all pass

---

## MILESTONE 3: "E2E infrastructure: data-testid attributes + helpers + selectors"

**DEPENDS ON:** Nothing for file creation (parallel with Milestone 2). But dev server must be running for E2E.
**DESTRUCTIVE:** Yes — modifies goal component files (data-testid attributes only)
**AGENT:** e2e

### Files

| File | Op | What |
|------|-----|------|
| `tests/e2e/helpers/selectors.ts` | Modify | Add `goals` section |
| `tests/e2e/helpers/goals.helper.ts` | Create | API helpers |
| `tests/e2e/helpers/navigation.helper.ts` | Modify | Add `goToGoals()` |
| `src/goals/components/GoalsHubContent.tsx` | Modify | data-testid only |
| `src/goals/components/GoalCatalogPicker.tsx` | Modify | data-testid only |
| `src/goals/components/GoalCard.tsx` | Modify | data-testid only |
| `src/goals/components/GoalFormModal.tsx` | Modify | data-testid only |
| `src/goals/components/ConfirmDeleteAllDialog.tsx` | Modify | data-testid only |
| `src/goals/components/DailyActionView.tsx` | Modify | data-testid only |
| `src/goals/components/GoalHierarchyView.tsx` | Modify | data-testid only |
| `src/goals/components/views/ViewSwitcher.tsx` | Modify | data-testid only |

**DO NOT TOUCH:** Integration test files, `schema.sql`, `setup.ts`, `src/db/`, API routes

### Deliverables

#### 3.1 Add `goals` section to selectors.ts

```typescript
goals: {
  page: 'goals-page',
  loading: 'goals-loading',
  emptyState: 'goals-empty-state',
  // Header
  newGoalButton: 'goals-new-goal-button',
  catalogButton: 'goals-browse-catalog',
  customizeButton: 'goals-customize-button',
  viewSwitcher: 'goals-view-switcher',
  viewOption: (view: string) => `goals-view-${view}`,
  // Catalog
  catalogPicker: 'goal-catalog-picker',
  catalogCard: (templateId: string) => `catalog-card-${templateId}`,
  catalogActiveBadge: (templateId: string) => `catalog-active-${templateId}`,
  catalogConfirm: 'catalog-confirm-button',
  catalogBack: 'catalog-back-button',
  // Goal cards
  goalCard: (goalId: string) => `goal-card-${goalId}`,
  goalTitle: (goalId: string) => `goal-title-${goalId}`,
  goalProgress: (goalId: string) => `goal-progress-${goalId}`,
  goalIncrement: (goalId: string) => `goal-increment-${goalId}`,
  goalEdit: (goalId: string) => `goal-edit-${goalId}`,
  goalDelete: (goalId: string) => `goal-delete-${goalId}`,
  goalToggle: (goalId: string) => `goal-toggle-${goalId}`,
  // Form modal
  formModal: 'goal-form-modal',
  formTitle: 'goal-form-title-input',
  formCategory: 'goal-form-category',
  formTarget: 'goal-form-target-input',
  formSubmit: 'goal-form-submit',
  formCancel: 'goal-form-cancel',
  // Customize
  deleteAllButton: 'goals-delete-all-button',
  deleteAllConfirm: 'goals-delete-all-confirm',
  deleteAllConfirmYes: 'goals-delete-all-confirm-yes',
  deleteAllCancel: 'goals-delete-all-cancel',
},
```

#### 3.2 Add data-testid attributes to goal components

Each component gets `data-testid` on interactive/assertable elements matching the selectors above. **Only add attributes — do not change any logic or styling.**

Key mappings:
- `GoalsHubContent.tsx`: outer div → `goals-page`, loading → `goals-loading`, empty state branch → `goals-empty-state`, buttons → matching selectors
- `GoalCatalogPicker.tsx`: wrapper → `goal-catalog-picker`, each GoalPickCard → `catalog-card-{template.id}`, Active badge → `catalog-active-{template.id}`
- `GoalCard.tsx`: card wrapper → `goal-card-{goal.id}`, increment/edit buttons
- `ConfirmDeleteAllDialog.tsx`: dialog → `goals-delete-all-confirm`, confirm/cancel buttons
- `GoalFormModal.tsx`: modal → `goal-form-modal`, title input, submit button
- `ViewSwitcher.tsx`: container → `goals-view-switcher`, each button → `goals-view-{mode}`

#### 3.3 Create `tests/e2e/helpers/goals.helper.ts`

Pattern: follow `auth.helper.ts` — throw on failure, never silent return.

```typescript
export async function createGoalViaAPI(page, goal: {...}): Promise<string>
export async function deleteAllGoalsViaAPI(page): Promise<number>
export async function getGoalsViaAPI(page): Promise<Array<{id, template_id, title}>>
export async function ensureNoGoals(page): Promise<void>  // delete all + verify
```

#### 3.4 Add `goToGoals()` to navigation.helper.ts

```typescript
export async function goToGoals(page: Page): Promise<void> {
  await page.goto('/dashboard/goals', { timeout: ACTION_TIMEOUT })
}
```

### Acceptance Test
- [ ] `npm test` — unit + architecture tests pass (data-testids don't break anything)
- [ ] data-testid attributes visible in DOM when browsing `/dashboard/goals`
- [ ] `createGoalViaAPI` creates a goal, `deleteAllGoalsViaAPI` removes all

---

## MILESTONE 4: "E2E tests cover goal flows + delete-all data consistency bug"

**DEPENDS ON:** Milestone 3 verified
**DESTRUCTIVE:** No
**AGENT:** e2e

### Files

| File | Op |
|------|-----|
| `tests/e2e/goals-hub.spec.ts` | Create |
| `tests/e2e/goals-data-consistency.spec.ts` | Create |

**DO NOT TOUCH:** Integration tests, source code, other spec files, playwright.config.ts

### Deliverables

Both files use `test.beforeEach` calling `ensureNoGoals(page)` for clean slate. Use `AUTH_TIMEOUT=15000`, `ACTION_TIMEOUT=2000`. Use `page.waitForLoadState('networkidle')` after navigation.

#### 4.1 `goals-hub.spec.ts` — Core UI flows

| Test | Flow |
|------|------|
| 4.1a | Empty state shows catalog picker (no goals → `goal-catalog-picker` visible) |
| 4.1b | Create goal via form modal (click New Goal → fill form → submit → card appears) |
| 4.1c | Create goals from catalog (click template → preview → confirm → goals load) |
| 4.1d | Switch daily/strategic views (setup goals via API → toggle views → verify layout change) |
| 4.1e | Increment goal progress (setup goal via API target=5 → click increment → progress updates 0→1) |
| 4.1f | Edit goal via modal (setup goal → click edit → change title → submit → updated title visible) |
| 4.1g | Customize mode toggle (setup goals → click Customize → controls appear → click Done → controls gone) |

#### 4.2 `goals-data-consistency.spec.ts` — The bug + data integrity

| Test | Flow |
|------|------|
| **4.2a THE BUG** | Create goals from catalog → verify via API → enter customize → Delete All → confirm → catalog re-appears → **the previously-used template is clickable (NO "Active" badge)** → verify via API: 0 goals |
| 4.2b | Delete individual goal → open catalog → template available again (no "Active") |
| 4.2c | Archive goal (toggle off) → open catalog → template still shows "Active" (archived != deleted) |
| 4.2d | Create → delete all → create again from same template → no ghost/duplicate data (API returns correct count) |
| 4.2e | User isolation — create goals as User A → login as User B → User B sees own empty state, not User A's goals |

### Acceptance Test
- [ ] `npx playwright test tests/e2e/goals-hub.spec.ts` — all pass
- [ ] `npx playwright test tests/e2e/goals-data-consistency.spec.ts` — all pass
- [ ] Test 4.2a specifically: after delete-all, no template shows "Active" badge
- [ ] `npx playwright test` — full suite, no regressions

---

## Agent File Ownership (no overlaps)

| File | Owner |
|------|-------|
| `tests/integration/schema.sql` | infra |
| `tests/integration/setup.ts` | infra |
| `tests/integration/db/goalRepo.integration.test.ts` | integration |
| `tests/e2e/helpers/selectors.ts` | e2e |
| `tests/e2e/helpers/goals.helper.ts` | e2e |
| `tests/e2e/helpers/navigation.helper.ts` | e2e |
| `tests/e2e/goals-hub.spec.ts` | e2e |
| `tests/e2e/goals-data-consistency.spec.ts` | e2e |
| `src/goals/components/*.tsx` (data-testid only) | e2e |

## Ordering Constraints

```
infra (M1) ──► integration (M2)
           └──► e2e (M3) ──► e2e (M4)
reviewer: ongoing, reviews all agents' output
```

## Risks & Mitigations

1. **Goals page requires `has_purchased=true`** — Test users need this flag. Verify in `goals.helper.ts` setup, or skip with documented reason.
2. **Existing goals for test user** — `ensureNoGoals()` in `beforeEach` handles this.
3. **Template IDs are static** — E2E tests should use known IDs from `src/goals/data/goalGraph.ts` (e.g., `l1_girlfriend`), not DOM order.
4. **`ON DELETE CASCADE` on `parent_goal_id`** — If production uses `SET NULL` instead, integration tests would give false confidence. Check actual Supabase schema. `deleteAllGoals()` does `DELETE WHERE user_id=$1` which removes everything regardless, but individual `deleteGoal()` behavior differs.

## Validation (Lead runs after all agents complete)

1. `npm test` — all unit tests pass
2. `npm run test:integration` — all integration tests pass (existing + ~20 new)
3. `npx playwright test tests/e2e/goals-*.spec.ts` — all E2E tests pass
4. `npx playwright test` — full suite, no regressions
5. Manually verify: the delete-all bug scenario is covered by test 4.2a
