# Plan: Mobile Visual Testing & Fixing — Beta Features

## Context

Beta branch (goals, tracking, scenarios) ready for launch. Nobody has verified if these look good or work on mobile. Code audit + review agent found: CSS padding issues, data-testid mismatches that break goals tests at ANY viewport, E2E specs that click desktop-only nav elements, and textarea font-size triggering iOS zoom.

**Goal**: Fix known bugs → visually verify every beta page on mobile → fix what's broken → make E2E mobile projects pass — without breaking desktop.

---

## Phase 0: Fix Data-TestID Mismatches (BLOCKER — breaks goals tests at ALL viewports)

These mismatches break 6/9 goals-hub tests regardless of viewport. Must fix first.

**Production** (`src/goals/components/GoalsHubContent.tsx`):
- `data-testid="goals-new-goal"` → `"goals-new-goal-button"`
- `data-testid="goals-customize-toggle"` → `"goals-customize-button"`

**Tests** (`tests/e2e/goals-hub.spec.ts`):
- `viewOption('strategic')` → `viewOption('hierarchy')`
- `viewOption('daily')` → `viewOption('today')`

---

## Phase 1: Visual Audit (Playwright MCP)

Resize browser to 390x844 (iPhone 14). Login. Screenshot every beta page + key interactive states:

### Static pages
| # | URL | Check for |
|---|-----|-----------|
| 1 | `/dashboard` | `px-8` wasted space, card grid, module links |
| 2 | `/dashboard/goals` | Header buttons wrapping, ViewSwitcher, goal cards |
| 3 | `/dashboard/scenarios` | `px-8` overflow, phase headers wrapping |
| 4 | `/dashboard/tracking` | Title+button overlap, QuickStats grid |
| 5 | `/dashboard/tracking/session` | Start button, tap zone sizing |
| 6 | `/dashboard/tracking/report` | Template cards width |
| 7 | `/dashboard/tracking/review` | Form layout |
| 8 | `/dashboard/tracking/history` | History cards width |

### Interactive states (critical mobile flows)
| # | Flow | Check for |
|---|------|-----------|
| 9 | Goal Setup Wizard steps (direction → goals → summary) | `pb-28` cutoff, expandable sections scroll, BottomBar |
| 10 | Field Report form (click a template) | Input iOS zoom, form layout, mood picker |
| 11 | Scenario ChatWindow (click a scenario card) | Chat bubbles width, input bar vs keyboard, fixed positioning |
| 12 | Hamburger menu open state | Dialog covers screen, nav items visible |

Also take landscape (844x390) for Goal Setup to check `pb-28`.

Document all visual issues found. Check for horizontal overflow: `document.documentElement.scrollWidth > document.documentElement.clientWidth` on each page.

---

## Phase 2: Fix Production CSS

Minimal Tailwind responsive prefix changes. No redesign.

### 2A: ScenariosPage padding (HIGH)
**File**: `src/scenarios/components/ScenariosPage.tsx`
- `px-8` → `px-4 sm:px-8` (8 instances across 4 layout branches)
- `py-12` → `py-8 sm:py-12` on main containers

### 2B: DashboardContent padding (HIGH)
**File**: `src/dashboard/components/DashboardContent.tsx`
- `px-8 py-24` → `px-4 sm:px-8 py-12 sm:py-24`
- `text-4xl` → `text-3xl sm:text-4xl`
- `mb-16` → `mb-8 sm:mb-16`
- `gap-8` → `gap-4 md:gap-8` on the cards grid
- Card `p-8` → `p-5 sm:p-8`

### 2C: ProgressDashboard header (HIGH)
**File**: `src/tracking/components/ProgressDashboard.tsx`
- Container: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center justify-between gap-4`
- Title: `text-3xl` → `text-2xl sm:text-3xl`
- "Start Session" button: `size="lg"` → responsive (default on mobile, lg on desktop) or wrap in `w-full sm:w-auto`

### 2D: FieldRenderer textarea iOS zoom fix (HIGH)
**File**: `src/tracking/components/FieldRenderer.tsx`
- Both `<textarea>` elements use `text-sm` (~14px) → change to `text-base md:text-sm` (16px on mobile = no iOS zoom, matches Input component pattern)

### 2E: GoalSetupWizard bottom padding (LOW)
**File**: `src/goals/components/setup/GoalSetupWizard.tsx`
- `pb-28` → `pb-20 sm:pb-28`

### Conditional (only if screenshots show issues):
- **2F**: ScenariosHub phase headers — `shrink-0` on right-side badges
- **2G**: AppHeader logo — responsive text or truncation

---

## Phase 3: Fix E2E Specs for Mobile Viewport

### 3A: isMobileViewport helper
**New file**: `tests/e2e/helpers/viewport.helper.ts`
```typescript
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize()
  return !!viewport && viewport.width < 640
}
```

### 3B: Fix `dashboard-navigation.spec.ts`
"Navigate to settings from header" clicks `header.settingsLink` which is `hidden sm:flex`. On mobile: open hamburger → click settings in dialog.

Note: Module link tests (scenarios, tracking, etc.) click dashboard BODY links (`dashboard-scenarios-link`, etc.), not header nav. These will pass at mobile viewport — no changes needed.

### 3C: Add field-report.spec.ts to mobile projects
**File**: `playwright.config.ts`
Add `/field-report\.spec\.ts/` to both `mobile-iphone` and `mobile-pixel` testMatch arrays. Field report is a primary beta flow with form inputs — must verify on mobile.

---

## Phase 4: Verify

### 4A: Visual re-check
Re-screenshot all pages at 390px after CSS fixes. Also 1280px desktop — no regression.

### 4B: Horizontal overflow check
On each page: `page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)` must be `false`.

### 4C: Run E2E
```bash
npx playwright test --project=mobile-iphone
npx playwright test --project=mobile-nav
npx playwright test --project=chromium
npx playwright test --project=goals-1
npm test
```

### 4D: Fix stragglers
Any remaining failures → diagnose and fix.

---

## Execution Order

1. **Phase 0** — Fix data-testid mismatches (blocker)
2. **Phase 1** — Visual audit (screenshots + interactive states)
3. **Phase 2** — Fix CSS issues (known + discovered)
4. **Phase 3** — Fix E2E specs for mobile
5. **Phase 4** — Verify both viewports + run E2E

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/goals/components/GoalsHubContent.tsx` | Fix 2 data-testid values | 0 |
| `tests/e2e/goals-hub.spec.ts` | Fix view option names | 0 |
| `src/scenarios/components/ScenariosPage.tsx` | Responsive padding (8 instances) | 2A |
| `src/dashboard/components/DashboardContent.tsx` | Responsive padding + typography + card spacing | 2B |
| `src/tracking/components/ProgressDashboard.tsx` | Responsive header + button sizing | 2C |
| `src/tracking/components/FieldRenderer.tsx` | textarea text-sm → text-base md:text-sm | 2D |
| `src/goals/components/setup/GoalSetupWizard.tsx` | Bottom padding | 2E |
| `tests/e2e/helpers/viewport.helper.ts` | Create: isMobileViewport helper | 3A |
| `tests/e2e/dashboard-navigation.spec.ts` | Mobile-aware settings nav | 3B |
| `playwright.config.ts` | Add field-report to mobile projects | 3C |
