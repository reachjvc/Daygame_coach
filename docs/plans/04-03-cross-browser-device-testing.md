# Cross-Browser & Cross-Device Testing Plan

**Created**: 2026-03-04
**Status**: Milestones 1-6 Complete / Milestone 7 Ready
**Scope**: Beta branch — Goals, Tracking, Scenarios
**Method**: Designed via structured multi-agent debate (QA Architect, Mobile Practitioner, Verification Skeptic)

---

## Architecture: 3-Tier Testing Model

| Tier | What | Why | Evidence |
|------|------|-----|----------|
| **1 — Chromium regression** | Existing 170+ tests, untouched | Regression safety net | CI green/red |
| **2 — Cross-browser authenticated** | New Firefox + WebKit tests, `--trace on` | Auth boundary gap: Firefox/Safari currently run ZERO authenticated tests | Playwright traces (network, DOM, interactions) |
| **3 — Real-device verification** | Manual screen recordings on real iPhone + Android | OS-level rendering bugs invisible to emulators: keyboard resize, rubber-band scroll, notch clipping, safe areas | Screen recordings of named interaction sequences |

**Sequencing rule**: Fix implementation → write test to protect fix → verify on real device. Never write a test for broken code.

---

## Phase 1: Implementation Fixes (Fix Before Testing)

Fix known mobile implementation gaps. Each fix gets a test in Phase 2/3.

### 1.1 iOS Keyboard Viewport Handling

**Problem**: `position: fixed` modals + iOS Safari keyboard = content pushed off-screen. iOS resizes the visual viewport when keyboard opens, but `fixed` elements anchor to the layout viewport.

**Files to fix**:
- `src/goals/components/GoalCatalogPicker.tsx` (fixed inset-0 modal with inputs)
- `src/goals/components/setup/GoalSetupWizard.tsx` (BottomBar fixed bottom-0 + text inputs above)
- `src/tracking/components/CustomReportBuilder.tsx` (modal with textareas)
- `src/tracking/components/FieldRenderer.tsx` (textarea multi-mode)
- Any component using `fixed inset-0` with form inputs inside

**Fix pattern**: Use `visualViewport` API to adjust modal position when keyboard opens:
```css
/* Ensure inputs inside fixed modals scroll into view */
@supports (height: 100dvh) {
  .modal-with-inputs {
    max-height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

**Acceptance**: On real iPhone, tap text input inside modal → keyboard opens → input field remains visible → can type and submit.

### 1.2 Safe Area Insets

**Problem**: Notched phones (iPhone 14+) clip content behind the notch and home indicator. Current modals use `fixed inset-0` without `env(safe-area-inset-*)`.

**Files to fix**:
- `src/goals/components/CelebrationOverlay.tsx` — toasts at `bottom-6 right-6` may sit behind home indicator
- `src/goals/components/GoalCatalogPicker.tsx` — modal backdrop
- All `fixed inset-0` modals
- BottomBar in setup wizard

**Fix pattern**:
```css
/* Add to fixed overlays */
padding-bottom: env(safe-area-inset-bottom, 0);
padding-top: env(safe-area-inset-top, 0);
```
Also ensure `<meta name="viewport" content="viewport-fit=cover">` is set.

**Acceptance**: On real iPhone with notch, all modals/toasts/fixed elements have content clear of notch and home indicator.

### 1.3 iOS Input Zoom Prevention

**Problem**: iOS Safari auto-zooms to 200% when input font-size < 16px. Users can't zoom back out easily.

**Files to check**:
- All `<input>` and `<textarea>` elements in goals/tracking/scenarios
- Setup wizard text inputs, number inputs
- FieldRenderer all input types

**Fix pattern**: Ensure all inputs have `font-size: 16px` minimum, or use `<meta name="viewport" content="maximum-scale=1">` (trade-off: disables pinch zoom).

**Acceptance**: On real iPhone, tap any input → no zoom occurs → keyboard opens at 1x scale.

### 1.4 Toast/Overlay Keyboard Collision

**Problem**: `CelebrationOverlay` toasts at `fixed bottom-6 right-6` and `ActionToast` elements overlap with the keyboard when it's open.

**Fix**: Hide or reposition toasts when keyboard is visible (check `visualViewport.height < window.innerHeight`).

### 1.5 Touch Target Sizes

**Problem**: Some interactive elements may be < 44x44px (Apple HIG minimum).

**Files to audit**:
- Emoji scale buttons in FieldRenderer (2xl/3xl — likely fine)
- Tag delete X buttons in FieldRenderer
- Expand/collapse chevron buttons on goal cards
- "More" menu trigger button
- Remove buttons on textarea array items

**Fix**: Ensure all tappable elements meet 44x44px minimum.

---

## Phase 2: Automated Cross-Browser Tests

### Playwright Config Changes

Add two new authenticated projects to `playwright.config.ts`:

```typescript
{
  name: 'cross-firefox',
  use: {
    ...devices['Desktop Firefox'],
    trace: 'on',
    storageState: 'playwright/.auth/user.json',
  },
  testMatch: 'tests/e2e/cross-browser/**/*.spec.ts',
  dependencies: ['setup'],
},
{
  name: 'cross-webkit',
  use: {
    ...devices['Desktop Safari'],
    trace: 'on',
    storageState: 'playwright/.auth/user.json',
  },
  testMatch: 'tests/e2e/cross-browser/**/*.spec.ts',
  dependencies: ['setup'],
},
```

Also add mobile authenticated projects:

```typescript
{
  name: 'mobile-safari-auth',
  use: {
    ...devices['iPhone 14'],
    trace: 'on',
    storageState: 'playwright/.auth/user.json',
  },
  testMatch: 'tests/e2e/mobile/**/*.spec.ts',
  dependencies: ['setup'],
},
{
  name: 'mobile-android-auth',
  use: {
    ...devices['Pixel 7'],
    trace: 'on',
    storageState: 'playwright/.auth/user.json',
  },
  testMatch: 'tests/e2e/mobile/**/*.spec.ts',
  dependencies: ['setup'],
},
```

### 2.1 Cross-Browser Auth Flow Tests

**File**: `tests/e2e/cross-browser/auth-flows.spec.ts`

Tests (run on Firefox + WebKit):
1. Login → redirect to dashboard → session cookie persists across navigation
2. Login → navigate to /dashboard/goals → server-side redirect to /dashboard/goals/setup when 0 goals
3. Login → navigate to protected route → verify no auth redirect loop
4. Login → API call (create goal via form) → verify cookie sent → goal created
5. Login → refresh page → session maintained (not logged out)
6. Login → navigate to /dashboard/tracking/session → start session → verify API works
7. Logout → redirect to login page → verify cookie cleared

### 2.2 Cross-Browser Goals Tests

**File**: `tests/e2e/cross-browser/goals-cross.spec.ts`

Tests (run on Firefox + WebKit):
1. Setup wizard step 1: select path (FTO/Abundance toggle) → next
2. Setup wizard step 2: select life areas → toggle L1 reasons → set targets → next
3. Setup wizard step 3: review summary → create goals → redirected to hub
4. Goals hub: view switcher (today/hierarchy/tree/orrery) — all render without JS errors
5. Goals hub: create goal via form modal → fill title/target → submit → visible in list
6. Goals hub: increment goal → API call → progress updates
7. Goals hub: customize mode → delete all → confirm → redirect to setup
8. Goals hub: expand goal card → all action buttons visible and clickable
9. Goals hub: "More" popover menu → all 4 options clickable
10. Goal form modal: date picker renders and accepts date (WebKit date input divergence)
11. Celebration overlay: complete a milestone → overlay appears → dismissible
12. Goal catalog picker: 3-column layout renders → select template → preview tree

### 2.3 Cross-Browser Tracking Tests

**File**: `tests/e2e/cross-browser/tracking-cross.spec.ts`

Tests (run on Firefox + WebKit):
1. Progress dashboard loads → all 6 cards render
2. Start session button → navigates to session page
3. Recent sessions card: expand/collapse toggle works
4. Field report page: text input → type → value persists
5. Field report page: textarea → type → value persists
6. Field report page: number input → increment → value updates
7. Field report page: select (button group) → click option → selected state
8. Field report page: multiselect → click multiple → all selected
9. Field report page: scale (emoji buttons) → click → selected state
10. Field report page: slider → drag → value updates
11. Field report page: datetime input → set date/time → value persists (cross-browser datetime)
12. Field report page: tags → type tag → add → display as badge → delete
13. Custom report builder: mode selection → template only flow
14. Custom report builder: mode selection → write report flow → add fields dynamically
15. Field report: save draft → reload → draft restored
16. Tracking history page loads and displays sessions

### 2.4 Cross-Browser Scenarios Tests

**File**: `tests/e2e/cross-browser/scenarios-cross.spec.ts`

Tests (run on Firefox + WebKit):
1. Scenarios page loads with correct header
2. Preview mode renders for non-subscribed user
3. Language switcher works (if present)
4. Scenario cards render and are clickable
5. Back to dashboard navigation works

### 2.5 Mobile-Specific Automated Tests

**File**: `tests/e2e/mobile/mobile-goals.spec.ts` (new, replaces deleted skeleton)

Tests (run on iPhone 14 + Pixel 7, authenticated):
1. Goals hub: hamburger menu → navigate to goals → goals load
2. Setup wizard: complete all 3 steps on mobile viewport → goals created
3. Setup wizard: BottomBar buttons visible and tappable on mobile
4. Goal cards: expand button tappable → expanded view fits viewport
5. Goal cards: +1 increment button tappable (44px+ target)
6. Customize mode: delete all → confirm dialog fits mobile viewport
7. Create goal modal: form fields don't overflow viewport width
8. Create goal modal: submit button visible without scrolling (above keyboard area)
9. Goal catalog picker: columns stack or scroll horizontally on mobile
10. Celebration overlay: toast positioned within viewport (not off-screen)
11. View switcher: all 4 options tappable on narrow viewport

**File**: `tests/e2e/mobile/mobile-tracking.spec.ts` (new, replaces deleted skeleton)

Tests (run on iPhone 14 + Pixel 7, authenticated):
1. Progress dashboard: card grid stacks to single column on mobile
2. Start session: button tappable, navigation works
3. Recent sessions: expand pill button tappable
4. Field report: text input → type → value persists → no horizontal overflow
5. Field report: textarea → type → no horizontal overflow
6. Field report: emoji scale buttons → each tappable → selected state visible
7. Field report: slider → drag with touch → value updates
8. Field report: datetime input renders and accepts date on mobile
9. Field report: tag input → add tag → tag badge fits viewport
10. Field report: voice recorder button tappable (icon size check)
11. Custom report builder: mode selection buttons tappable
12. Custom report builder: field addition works on mobile

**File**: `tests/e2e/mobile/mobile-scenarios.spec.ts` (new, replaces deleted skeleton)

Tests (run on iPhone 14 + Pixel 7, authenticated):
1. Scenarios page loads on mobile
2. Header: elements don't overflow on narrow viewport
3. Preview mode badge visible and properly sized
4. Back button tappable and navigates correctly
5. Scenario cards: full width, tappable

### 2.6 Horizontal Overflow Regression Tests

**File**: `tests/e2e/cross-browser/no-overflow.spec.ts`

For every beta page, verify `document.documentElement.scrollWidth <= document.documentElement.clientWidth`:
1. /dashboard
2. /dashboard/goals
3. /dashboard/goals/setup (each step)
4. /dashboard/tracking
5. /dashboard/tracking/session
6. /dashboard/tracking/history
7. /dashboard/scenarios
8. /dashboard/settings

Run on: Chromium (390px), Chromium (1280px), Firefox, WebKit, iPhone 14, Pixel 7.

### 2.7 Navigation & Layout Tests

**File**: `tests/e2e/mobile/mobile-navigation.spec.ts` (existing, extend)

Additional tests:
1. Hamburger menu: all beta nav items present and navigable
2. Hamburger menu: dismiss by tapping backdrop
3. Hamburger menu: dismiss by pressing Escape
4. Header: doesn't overlap content on scroll
5. Page transitions: no flash of unstyled content

---

## Phase 3: Real-Device Verification Gate

### What This Is

A mandatory manual verification step before merging to beta branch. Cannot be replaced by automated tests because the bugs it catches (iOS keyboard viewport resize, rubber-band scroll, notch clipping) are OS-level, below the browser engine that Playwright instruments.

### Evidence Format

**Screen recording** (not screenshot) of each named interaction sequence. Recording captures the failure mode in motion — screenshots miss transient states.

### Device Matrix

| Device | OS | Browser | Required |
|--------|----|---------|---------|
| iPhone (any 14/15/16) | iOS Safari | Safari | YES |
| Android phone (any recent) | Android | Chrome | YES |

### Checklist: 8 Interaction Sequences

Each sequence is recorded as a single continuous screen recording. Pass criteria are specific, not open-ended.

#### 3.1 Keyboard + Fixed Modal (iOS)

**Steps**: Goals hub → New Goal → tap title input → keyboard opens
**Pass**: Title input remains fully visible above keyboard. Submit button accessible by scrolling within modal. Modal doesn't jump or clip.

#### 3.2 Keyboard + Fixed Modal (Android)

**Steps**: Goals hub → New Goal → tap title input → keyboard opens
**Pass**: Same as 3.1. Content within modal scrollable. No content hidden behind keyboard.

#### 3.3 Setup Wizard Long Form

**Steps**: Goals setup → step 2 → scroll to bottom → tap a number input → keyboard opens
**Pass**: Input scrolls into view. BottomBar ("View Summary") remains accessible. No content clipped by notch or home indicator.

#### 3.4 Field Report Multi-Input

**Steps**: Tracking → field report → scroll to textarea field → tap → type text → tap next field
**Pass**: Each field scrolls into view when focused. Voice recorder buttons don't overlap input. No horizontal overflow at any point.

#### 3.5 Notch / Safe Area

**Steps**: Goals hub → create goal → trigger celebration overlay (confetti-full tier) → dismiss
**Pass**: Overlay content doesn't clip behind notch (top) or home indicator (bottom). Dismiss button tappable.

#### 3.6 Rubber-Band Scroll + Fixed Elements

**Steps**: Goals hub with 5+ goals → scroll to bottom → overscroll (pull past end)
**Pass**: Fixed elements (header, toasts if present) don't shift or glitch during rubber-band bounce. Page settles back cleanly.

#### 3.7 Touch Targets

**Steps**: Goals hub → expand a goal → tap each action button (+1, edit, reset, delete)
**Pass**: Each button registers first tap (no double-tap needed). No mis-taps on adjacent buttons.

#### 3.8 Orientation Change

**Steps**: Goals hub (portrait) → rotate to landscape → rotate back
**Pass**: Layout reflows correctly both ways. No content stuck off-screen. No horizontal scrollbar appears.

### Gate Rule

- Recordings uploaded to PR as comment or attached to a checklist issue
- All 8 sequences must pass on BOTH devices (iOS + Android)
- Blocking: beta branch merge requires all 16 recordings (8 per device)
- If a sequence fails: fix the implementation → re-record that sequence only

---

## Phase 4: CI Integration

### New CI Workflow

Add to `.github/workflows/e2e.yml`:

```yaml
cross-browser-tests:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      project: [cross-firefox, cross-webkit, mobile-safari-auth, mobile-android-auth]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npx playwright test --project=${{ matrix.project }}
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: traces-${{ matrix.project }}
        path: test-results/
```

Traces auto-uploaded as CI artifacts — machine-generated evidence, not gameable.

### Test Run Order

1. `chromium` (existing 170+ tests) — regression gate
2. `cross-firefox` + `cross-webkit` — authenticated cross-browser
3. `mobile-safari-auth` + `mobile-android-auth` — authenticated mobile emulation
4. Phase 3 manual gate — real device recordings (human step, before beta merge only)

---

## Milestone Breakdown (for agent execution)

### Milestone 1: Implementation Fixes
**Deliverables**: Fix 1.1-1.5 (keyboard viewport, safe areas, zoom prevention, toast collision, touch targets)
**Acceptance**: Each fix verified visually via Playwright MCP on mobile viewport
**Files**: ~8-10 component files modified

### Milestone 2: Playwright Config + Cross-Browser Auth Tests
**Deliverables**: New projects in playwright.config.ts + `tests/e2e/cross-browser/auth-flows.spec.ts`
**Acceptance**: 7 auth tests pass on Firefox AND WebKit
**Files**: playwright.config.ts, 1 new spec file

### Milestone 3: Cross-Browser Feature Tests
**Deliverables**: `goals-cross.spec.ts`, `tracking-cross.spec.ts`, `scenarios-cross.spec.ts`
**Acceptance**: All tests pass on Firefox AND WebKit
**Files**: 3 new spec files

### Milestone 4: Mobile Authenticated Tests
**Deliverables**: `mobile-goals.spec.ts`, `mobile-tracking.spec.ts`, `mobile-scenarios.spec.ts` (replacements for deleted skeletons)
**Acceptance**: All tests pass on iPhone 14 AND Pixel 7 emulation
**Files**: 3 new spec files

### Milestone 5: Overflow + Navigation Tests
**Deliverables**: `no-overflow.spec.ts`, extended `mobile-navigation.spec.ts`
**Acceptance**: All pages pass overflow check on all viewports
**Files**: 1 new + 1 modified spec file

### Milestone 6: CI Integration
**Deliverables**: Updated `.github/workflows/e2e.yml` with cross-browser matrix
**Acceptance**: CI runs cross-browser tests and uploads traces
**Files**: 1 workflow file

### Milestone 7: Real-Device Gate Documentation
**Deliverables**: Checklist issue template with 8 interaction sequences
**Acceptance**: Checklist usable by human tester
**Files**: 1 checklist document

---

## Test Count Summary

| Category | Test Count | Browsers | Total Runs |
|----------|-----------|----------|------------|
| Existing Chromium (Tier 1) | ~170 | Chromium | ~170 |
| Cross-browser auth (2.1) | 7 | Firefox + WebKit | 14 |
| Cross-browser goals (2.2) | 12 | Firefox + WebKit | 24 |
| Cross-browser tracking (2.3) | 16 | Firefox + WebKit | 32 |
| Cross-browser scenarios (2.4) | 5 | Firefox + WebKit | 10 |
| Mobile goals (2.5) | 11 | iPhone + Pixel | 22 |
| Mobile tracking (2.5) | 12 | iPhone + Pixel | 24 |
| Mobile scenarios (2.5) | 5 | iPhone + Pixel | 10 |
| Overflow regression (2.6) | 8 | 6 configs | 48 |
| Mobile navigation (2.7) | 5 | iPhone + Pixel | 10 |
| **Automated total** | **~251** | | **~364 runs** |
| Real-device manual (Phase 3) | 8 sequences | iOS + Android | 16 recordings |

---

## Anti-Regression Safeguards

1. **Existing tests never modified**: Tier 1 stays frozen. New tests go in new files/directories.
2. **Traces as evidence**: `--trace on` for all cross-browser tests. CI uploads traces as artifacts.
3. **Serial chains preserved**: goals-1→goals-2 and session-1→2→3→4 chains untouched.
4. **No shared state**: Cross-browser tests use independent test data (create in beforeEach, clean in afterEach).

## Anti-False-Confidence Safeguards

1. **Fix first, test second**: Never write a test for code that's known broken. Fix the implementation, verify visually, THEN write the test.
2. **Auth boundary closed**: Firefox/WebKit tests run AUTHENTICATED — not just smoke-testing login pages.
3. **Real device gate exists**: Tier 3 catches OS-level bugs that no emulator can reproduce. Specific named interaction sequences, not "check if it looks okay."
4. **Screen recordings, not screenshots**: Recordings capture transient failure states (keyboard pushing content, scroll glitches) that screenshots miss.
5. **Each recording maps to a checklist item**: No open-ended "explore the app" — verify these 8 specific interactions.
