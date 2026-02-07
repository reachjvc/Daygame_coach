# Plan: Goals Widget Improvements

**Status:** READY FOR IMPLEMENTATION
**Updated:** 2026-02-07
**Priority:** High → Medium → Nice-to-have

---

## Context

Goals widget was just implemented with:
- Database: `user_goals` table with RLS
- API: `/api/goals/*` CRUD endpoints
- Widgets: GoalProgressWidget, TodayGoalsWidget, GoalsListWidget, GoalStreaksWidget
- Modal: GoalFormModal for add/edit

This plan covers improvements identified in code review.

---

## Task 1: Unit Tests for Pure Functions (HIGH)

### 1.1 Create `tests/unit/lair/lairService.test.ts`

Test these functions from `src/lair/lairService.ts`:

```typescript
// validateLayout
- returns null for valid layout
- returns error for empty tabs array
- returns error for > MAX_TABS
- returns error for missing activeTabId
- returns error for invalid widget ID in tab
- returns error for > MAX_WIDGETS_PER_TAB

// addTab
- adds tab with generated ID
- adds tab at end of tabs array
- respects MAX_TABS limit

// removeTab
- removes tab by ID
- switches activeTabId if removed tab was active
- prevents removing last tab (MIN_TABS)

// renameTab
- renames tab by ID
- returns unchanged if tab not found

// reorderTabs
- moves tab from index A to B
- handles edge cases (same index, out of bounds)

// addWidget
- adds widget to specified tab
- assigns correct position
- prevents duplicate widget in same tab
- respects MAX_WIDGETS_PER_TAB

// removeWidget
- removes widget from tab
- reindexes remaining widget positions

// toggleWidgetCollapsed
- toggles collapsed boolean

// reorderWidgets
- moves widget within tab
- updates positions correctly
```

### 1.2 Create `tests/unit/db/goalTypes.test.ts`

Test `computeGoalProgress` from `src/db/goalTypes.ts`:

```typescript
// progress_percentage
- 0% when current_value is 0
- 50% when current is half of target
- 100% when current equals target
- caps at 100% when current exceeds target
- handles target_value of 0 (edge case)

// is_complete
- false when current < target
- true when current >= target

// days_remaining
- null when no custom_end_date
- positive number for future date
- 0 for today
- negative for past date
```

### 1.3 Create `tests/unit/lair/goalCategories.test.ts`

Test `getCategoryConfig` from `src/lair/data/goalCategories.ts`:

```typescript
- returns config for known category (fitness, eating, etc.)
- returns default config for custom category
- custom category name is capitalized
```

---

## Task 2: Auto-Increment from Tracking Data (HIGH)

Goals like "10 approaches/week" should auto-sync with session data.

### 2.1 Add `linked_metric` field to goals

Update `src/db/goalTypes.ts`:
```typescript
export type LinkedMetric =
  | "approaches_weekly"
  | "sessions_weekly"
  | "numbers_weekly"
  | "instadates_weekly"
  | null

// Add to UserGoalRow and UserGoalInsert
linked_metric: LinkedMetric
```

Migration (new file `supabase/migrations/20260208_001_goal_linked_metrics.sql`):
```sql
CREATE TYPE linked_metric AS ENUM (
  'approaches_weekly',
  'sessions_weekly',
  'numbers_weekly',
  'instadates_weekly'
);

ALTER TABLE user_goals ADD COLUMN linked_metric linked_metric;
```

### 2.2 Create sync function in `src/db/goalRepo.ts`

```typescript
export async function syncLinkedGoals(userId: string): Promise<void> {
  // 1. Get user's tracking stats for current week
  // 2. Find goals with linked_metric set
  // 3. Update current_value based on metric
}
```

### 2.3 Call sync on tracking stats fetch

In `src/tracking/hooks/useTrackingStats.ts`, after fetching stats, call sync endpoint.

Or create trigger/webhook when approaches are logged.

### 2.4 Update GoalFormModal

Add "Link to tracking" dropdown for daygame category goals.

---

## Task 3: Default Goals in Lair Layout (HIGH)

### 3.1 Update `src/lair/config.ts`

Find the Goals tab in `DEFAULT_LAIR_LAYOUT` and add widgets:

```typescript
{
  id: "goals",
  name: "Goals",
  widgets: [
    { widgetId: "goal-progress", position: 0, collapsed: false },
    { widgetId: "today-goals", position: 1, collapsed: false },
    { widgetId: "goal-streaks", position: 2, collapsed: false },
  ],
}
```

Note: This only affects NEW users. Existing users keep their layout.

---

## Task 4: Goal Sorting (MEDIUM)

### 4.1 Add sort state to GoalsListWidget

```typescript
type SortOption = "newest" | "progress" | "streak" | "category"
const [sortBy, setSortBy] = useState<SortOption>("newest")
```

### 4.2 Add sort dropdown UI

Use existing Select component. Place next to filter badges.

### 4.3 Implement sort logic

```typescript
const sortedGoals = useMemo(() => {
  return [...filteredGoals].sort((a, b) => {
    switch (sortBy) {
      case "progress": return b.progress_percentage - a.progress_percentage
      case "streak": return b.current_streak - a.current_streak
      case "category": return a.category.localeCompare(b.category)
      default: return 0 // already sorted by created_at desc from API
    }
  })
}, [filteredGoals, sortBy])
```

---

## Task 5: Bulk Reset Daily Goals (MEDIUM)

### 5.1 Add API endpoint `POST /api/goals/reset-daily`

```typescript
// app/api/goals/reset-daily/route.ts
export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  await resetDailyGoals(auth.userId)
  return NextResponse.json({ success: true })
}
```

### 5.2 Add repo function in `src/db/goalRepo.ts`

```typescript
export async function resetDailyGoals(userId: string): Promise<void> {
  // Reset all daily goals where period = 'daily' and is_active = true
  // Update streak based on completion status
}
```

### 5.3 Add button to TodayGoalsWidget

"Reset All" button in header, calls the endpoint and refetches.

---

## Task 6: Goal Templates / Quick-Add (MEDIUM)

### 6.1 Update GoalFormModal

When user clicks a suggestion badge, instead of just setting title:
- Set title
- Set sensible default target based on suggestion
- Auto-select tracking type

### 6.2 Add suggestion metadata

Update `src/lair/data/goalCategories.ts`:

```typescript
interface GoalSuggestion {
  title: string
  defaultTarget: number
  defaultPeriod: GoalPeriod
}

// Change suggestions from string[] to GoalSuggestion[]
suggestions: [
  { title: "Go to gym 4x per week", defaultTarget: 4, defaultPeriod: "weekly" },
  // ...
]
```

---

## Task 7: Goal History / Calendar View (NICE-TO-HAVE)

### 7.1 Create `goal_completions` table

```sql
CREATE TABLE goal_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value INTEGER NOT NULL,
  achieved_value INTEGER NOT NULL,
  completed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Log completion on period reset

When `resetGoalPeriod` is called, insert row into `goal_completions`.

### 7.3 Create history widget

New widget showing calendar heatmap of completions.

---

## Task 8: Goal Reminders (NICE-TO-HAVE)

Requires push notification infrastructure. Skip for now.

---

## Task 9: Goal Import/Export (NICE-TO-HAVE)

### 9.1 Export endpoint

`GET /api/goals/export` returns JSON of all goals.

### 9.2 Import endpoint

`POST /api/goals/import` accepts JSON array, creates goals.

### 9.3 UI buttons in GoalsListWidget

Export/Import buttons in widget header.

---

## Implementation Order

1. **Task 3** - Quick win, update default layout (5 min)
2. **Task 1** - Unit tests, required for quality (1-2 hours)
3. **Task 6** - Better suggestion UX (30 min)
4. **Task 4** - Sorting (30 min)
5. **Task 5** - Bulk reset (30 min)
6. **Task 2** - Linked metrics, most complex (2-3 hours)
7. **Task 7-9** - Nice-to-haves, do later

---

## Verification

After each task:
- [ ] Run `npm test` - all tests pass
- [ ] Manual test in browser
- [ ] No TypeScript errors
- [ ] Update this doc with completion status

---

## Files Reference

| Purpose | File |
|---------|------|
| Service functions | `src/lair/lairService.ts` |
| Goal types | `src/db/goalTypes.ts` |
| Goal repo | `src/db/goalRepo.ts` |
| Category config | `src/lair/data/goalCategories.ts` |
| Default layout | `src/lair/config.ts` |
| Progress widget | `src/lair/components/widgets/GoalProgressWidget.tsx` |
| Today widget | `src/lair/components/widgets/TodayGoalsWidget.tsx` |
| List widget | `src/lair/components/widgets/GoalsListWidget.tsx` |
| Streaks widget | `src/lair/components/widgets/GoalStreaksWidget.tsx` |
| Form modal | `src/lair/components/GoalFormModal.tsx` |
| Goals API | `app/api/goals/` |
