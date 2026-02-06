# Plan: Cross-Browser & Device Compatibility Tests
**Status:** Draft
**Updated:** 06-02-2026

## Changelog
- 06-02-2026 - Initial plan drafted to expand cross-browser/device compatibility coverage.

---

## Problem
We have cross-browser smoke projects in Playwright, but the actual smoke suite is minimal. We need a focused, deterministic compatibility test plan that validates layout, navigation, and core UX affordances across desktop and mobile devices.

## Goals
- Ensure key public pages render correctly on Firefox, WebKit, iPhone, and Android.
- Catch layout breakages specific to viewport, safe-area, and scroll behaviors.
- Validate modal and navigation behavior on mobile form factors.
- Keep tests deterministic and unauthenticated for cross-browser runs.

## Non-Goals
- Testing AI-dependent or premium-only flows across browsers.
- Full regression suite for authenticated flows on non-Chromium browsers.
- Exhaustive visual regression of every page.

## Target Matrix
| Project | Device | Purpose |
| --- | --- | --- |
| `smoke-firefox` | Desktop Firefox | Engine differences (Gecko) |
| `smoke-webkit` | Desktop Safari | WebKit quirks |
| `smoke-iphone` | iPhone 14 | Mobile Safari layout/safe-area |
| `smoke-android` | Pixel 7 | Mobile Chromium layout |

## Strategy
- Keep cross-browser tests unauthenticated to avoid storageState complexity and rate limits.
- Use a single large spec file for compatibility checks.
- Add targeted `data-testid` attributes for stability where missing.
- Prefer CSS/DOM assertions over pixel-perfect expectations.
- Add optional visual snapshots only for stable, low-noise pages.

---

## Proposed Test File
- **Primary:** `tests/e2e/compatibility.spec.ts` (single large file)
- Update `playwright.config.ts` cross-browser smoke projects to include this file:
  - Change `testMatch: /smoke\.spec\.ts/` to `testMatch: /(smoke|compatibility)\.spec\.ts/`

## Helper Utilities
Create `tests/e2e/helpers/compatibility.helper.ts` for shared checks:
- `expectNoHorizontalScroll(page)`
- `expectHeaderVisible(page)`
- `expectMobileNavOpens(page)`
- `expectSafeAreaPadding(page, selector)`
- `expectViewportVarSet(page)`
- `expectNoConsoleErrors(page)`

---

## Test Coverage Plan

### 1) Global Layout Sanity (all devices)
Pages: `/`, `/auth/login`, `/auth/sign-up`, `/articles`, `/test`
Checks:
- Page loads without console errors.
- Header is visible and not overlapping content.
- No horizontal scroll.
- Key CTA/buttons are visible.

### 2) Mobile Navigation & Overlays (mobile devices)
Pages: `/`, `/articles`
Checks:
- Mobile nav button visible.
- Mobile nav dialog opens and closes.
- Body scroll lock while nav open.
- Focus trap or keyboard navigation does not break.

### 3) Viewport & Safe-Area Behavior (mobile devices)
Pages: `/`, `/test`
Checks:
- `--app-vh` CSS variable is set (from `ViewportHeightUpdater`).
- Containers using `--app-vh` resolve to reasonable heights.
- Safe-area padding applied to fixed header/overlays.

### 4) Forms & Inputs (all devices)
Pages: `/auth/login`, `/auth/sign-up`
Checks:
- Inputs visible, focusable, and not clipped by viewport.
- Submit buttons visible without scroll on common mobile viewports.

### 5) Scroll Containers (mobile devices)
Pages: `/articles` or `/test`
Checks:
- Scrollable content area allows touch scroll.
- Scrollbars hidden but content still scrollable.

### 6) Feature Fallbacks (engine-specific)
Pages: `/dashboard/tracking` redirect to login (smoke), `/test` (if includes feature toggles)
Checks:
- Voice recording controls are hidden or disabled if unsupported.
- No runtime errors when unsupported APIs are missing.

---

## Required `data-testid` Additions
If missing, add the following to stabilize tests:
- Header: mobile nav button, header container
- MobileNav: dialog container, close button
- Home page: primary CTA
- Articles page: header or main content container

---

## Implementation Phases

### Phase 1: Test Harness
1. Add `tests/e2e/compatibility.spec.ts` with baseline checks.
2. Add `tests/e2e/helpers/compatibility.helper.ts`.
3. Update `playwright.config.ts` cross-browser smoke matchers.

### Phase 2: Layout & Navigation Coverage
1. Implement Global Layout Sanity tests for core public pages.
2. Add Mobile Navigation & Overlays tests.
3. Add Viewport & Safe-Area checks for mobile devices.

### Phase 3: Inputs & Scroll
1. Add Forms & Inputs tests for auth pages.
2. Add Scroll Container tests for content-heavy pages.

### Phase 4: Feature Fallbacks (Optional)
1. Add API fallback checks for voice recording and other gated features.
2. Add console error monitoring for unsupported API usage.

---

## Success Criteria
- Compatibility suite passes on all smoke projects without flakiness.
- No horizontal overflow regressions on mobile.
- Mobile nav and overlays work consistently across devices.
- No console errors on key public pages in Firefox/WebKit.

---

## Open Questions
- Which public pages are most important beyond `/`, `/auth/*`, `/articles`, `/test`?
- Do we want visual snapshots for any pages, or keep assertions DOM-only?
- Should we allow a minimal authenticated smoke flow on desktop WebKit?
