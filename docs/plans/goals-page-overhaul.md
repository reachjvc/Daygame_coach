# Goals Page Overhaul — Implementation Plan

## Problem
The production goals page hardcodes a single hierarchy view. Meanwhile, 6+ fully-built view components sit as dead code. The DailyActionView (the "open app, do stuff, close app" view) is never rendered. The orrery/planetary visualization from setup is one-time-only. The header is cluttered with admin tools while missing daily-use features.

## Milestone 1: Wire Up View Switching + Daily Default

**Goal:** User lands on a focused daily view by default, can switch between 4 views.

### Views to wire (all components already exist):
| View | Component | Purpose |
|------|-----------|---------|
| **Today** (default) | `DailyActionView` + `TodaysPulse` | "What do I do right now?" — recurring goals, progress ring, milestones summary |
| **Hierarchy** | `GoalHierarchyView` | Current production view — L1→L2→L3 with categories, achievements, heatmap |
| **Tree** | `TreeView` | Compact scannable tree with inline quick-actions (+1, reset on hover) |
| **Orrery** | New `OrreryView` (Milestone 2) | Planetary big-picture visualization |

### Changes:

**`GoalsHubContent.tsx`:**
- Add `viewMode` state (`"today" | "hierarchy" | "tree" | "orrery"`, default `"today"`)
- Persist to `localStorage` key `"goals-view-mode"`
- Render `ViewSwitcher` in header
- Render correct view component based on `viewMode`
- Pass tree data to `DailyActionView` (it already accepts `GoalWithProgress[]`)
- Pass `onSwitchView` callback so Daily can link to strategic views
- Thread all handlers (increment, complete, reset, edit, addChild, toggle, delete, reorder) to each view

**`ViewSwitcher.tsx`:**
- Expand from 2 options to 4: Today (Sun), Hierarchy (Layers), Tree (GitFork), Orrery (Orbit)
- Use icons: `Sun`, `Layers`, `GitFork`, `Orbit` from lucide

**`DailyActionView.tsx`:**
- Already fully built. No changes needed for basic wiring.
- Currently not imported in production — just add the import and render path.

**`TreeView.tsx`:**
- Already fully built. Needs `onSetValue`, `onComplete`, `onAddChild` props added to match GoalsHubContent handler set (currently only has increment/reset/edit).

### Acceptance test:
- User opens /dashboard/goals → sees Today view with progress ring + daily/weekly goals
- Can switch to Hierarchy (the current view), Tree, or Orrery
- View preference persists across page loads
- All actions (increment, complete, reset, edit) work in each view

---

## Milestone 2: Extract Orrery as Standalone View

**Goal:** The planetary visualization from the setup wizard becomes a real-time view of your goal system, driven by actual goals data instead of wizard selections.

### Create `src/goals/components/views/OrreryView.tsx`:

**Data derivation (from `goals: GoalWithProgress[]`):**
- Count goals per life area → planet goal counts
- Compute average progress per life area → planet "glow intensity" or progress ring
- All user's selected life areas = active planets (areas with ≥1 goal)
- L2 achievements from goal tree → badges grid below orrery (with real tier/progress)

**Adapt from `AuroraOrreryStep`:**
- Remove: `onCreateGoals` button, `isCreating` state, "This will create N goals" text
- Remove: `selectedGoals`/`selectedAreas`/`path` props — derive from goals array
- Keep: All SVG animation (aurora ribbons, solar wind, planets orbiting, magnetic fields)
- Keep: Badge grid, but show real `BadgeTier` progress (not all "locked")
- Keep: Hover tooltips on planets showing goal count
- Add: Per-planet progress indicator (small progress arc around planet body)
- Add: Overall stats line: "42 goals · 6 life areas · 73% weekly completion"
- Keep: `AuroraBackground` canvas — render it behind the orrery

**Props:**
```ts
interface OrreryViewProps {
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
}
```

### Acceptance test:
- Switch to Orrery view → animated planetary system renders
- Each life area with goals = active planet (glowing, on aurora orbit)
- Life areas with no goals = dimmed/breathing planets
- Hover planet → tooltip: "N goals active"
- Badges below show real achievement progress from user's L2 goals
- Aurora background animates behind

---

## Milestone 3: Restructure Header

**Goal:** Daily-use tools prominent, admin tools tucked away.

### New header layout:

```
Left:    [Aperture icon]  Goals
                          Track progress across all areas of your life

Right:   [ViewSwitcher: Today | Hierarchy | Tree | Orrery]   [+ New Goal]   [⋮ More]
```

**"More" dropdown (DropdownMenu)** contains:
- Search goals (opens inline search)
- Weekly Review
- Browse Catalog
- Setup Wizard
- Time Settings
- Customize Mode (toggle)

### Changes:

**`GoalsHubContent.tsx`:**
- Replace 5 individual header buttons with:
  1. `ViewSwitcher` component
  2. `+ New Goal` button (opens `GoalFormModal` in create mode — currently missing!)
  3. `DropdownMenu` ("More") with the admin/config actions
- The "Customize" toggle moves into the dropdown but still toggles `isCustomizeMode`
- When `isCustomizeMode` is active, show a subtle banner below header: "Customizing — drag to reorder, toggle visibility" with a "Done" button

### Acceptance test:
- Header shows view switcher + New Goal + More menu
- "More" menu contains: Review, Browse Catalog, Wizard, Time, Customize
- Customize mode shows banner with Done button
- "+ New Goal" opens form modal for creating a new goal

---

## Milestone 4: Quick-Increment on Collapsed GoalCard

**Goal:** The most frequent action (incrementing a recurring goal) should not require expanding the card.

### Changes to `GoalCard.tsx`:

**For counter goals (`tracking_type: "counter"`):**
- Add a compact `+1` button at the right edge of the header row (next to expand chevron)
- Only shown when: not complete, not linked_metric, not in customize mode
- On click: calls `onIncrement(goal.id, 1)` directly
- Shows brief loading state (spinner replacing +1 for 300ms)

**For boolean goals (`tracking_type: "boolean"`):**
- Add a checkbox/circle-check button at the right edge
- On click: calls `onComplete(goal)` or `onIncrement(goal.id, 1)`

**Layout adjustment:**
- Current: `[icon] [title+progress] [chevron]`
- New:     `[icon] [title+progress] [+1 btn] [chevron]`
- The +1 button is small (h-7 w-7), ghost variant, lives between progress area and chevron

### Acceptance test:
- Collapsed goal card shows small +1 button for counter goals
- Clicking +1 increments without expanding the card
- Boolean goals show circle-check instead
- Linked metric goals don't show the button (auto-synced)
- Complete goals don't show the button

---

## File Ownership Summary

| File | Changes |
|------|---------|
| `GoalsHubContent.tsx` | View state, view switching, header restructure, + New Goal |
| `ViewSwitcher.tsx` | Expand to 4 views, new icons |
| `GoalCard.tsx` | Quick-increment button on collapsed card |
| `TreeView.tsx` | Add missing handler props (setValue, complete, addChild) |
| **New:** `OrreryView.tsx` | Standalone planetary view extracted from AuroraOrreryStep |

## Ordering
Milestones 1-4 are sequential. Each milestone produces a working, testable state.
