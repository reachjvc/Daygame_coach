# Plan: Cross-Browser & Device Compatibility Tests
**Status:** Draft
**Updated:** 06-02-2026

## Changelog
- 06-02-2026 - Rebuilt plan with extensive coverage across all business areas + small AI-implementable steps.

---

## Before Implementation (Prompt User)
Ask the user for these before doing any implementation work:
- Supabase test project URL + anon key + service role key
- Test user credentials for User A and User B (email + password)
- Confirmation of which routes are public vs protected (especially `/articles` and `/qa`)

If the user declines to provide these, stop implementation and keep the plan only.

---

## Guiding Rules (docs/testing_behavior.md)
- Deterministic tests only. No silent returns.
- E2E uses Playwright with **headless = false**.
- Integration tests use testcontainers (no external DB).
- Real dependencies only.
- Each flow must include happy path + relevant edge cases.

---

## Decisions
- Use a **dedicated Supabase test project** for E2E.
- Expand `tests/e2e/smoke.spec.ts` (no new cross-browser file).
- Cover **all UI routes**; protected routes must redirect to login when unauthenticated.

---

## Business Areas & Test Expansion Targets

Public/Home
- Cross-browser layout + overflow + console errors.

Auth
- Cross-browser layout checks.
- E2E login/logout error handling (Chromium).

Dashboard
- Cross-browser layout + redirect checks.

Tracking (Session + Approaches)
- Deterministic session history + detail flow.
- Quick Add + session import sanity (if available).

Field Reports
- Deterministic submit + validation + draft flow.

Weekly Reviews
- Deterministic submit + draft flow.

Settings
- Persistence for sandbox toggles + voice language.

Preferences/Onboarding
- End-to-end completion + persistence.

Inner Game
- Welcome flow + step progression (non-AI).

Scenarios
- Hub renders + cards + phase sections (no AI chat).

QA
- Gated access: preview vs premium redirect.

Articles
- Page renders + basic UI interactions.

System Tables (DB)
- Purchases, scenarios, user_tracking_stats schema integrity.

---

## Phase 0: Environment Alignment (Dedicated Supabase Test Project)

- [ ] E0.1 Create Supabase test project; record URL/keys.
- [ ] E0.2 Add `.env.e2e` with test project values.
- [ ] E0.3 Update Playwright config to load `.env.e2e` before `.env`.
- [ ] E0.4 Create test users in Supabase (User A + User B).
- [ ] E0.5 Update `tests/e2e/.auth` setup to use test credentials.
- [ ] E0.6 Document E2E env usage in `docs/testing_behavior.md`.

---

## Phase 1: Expand `tests/e2e/smoke.spec.ts` (Cross-Browser)

### A) Global Baseline Checks (all cross-browser projects)

Test A1: Home layout sanity
- [ ] A1.1 `page.goto('/')` + `networkidle`.
- [ ] A1.2 Collect console errors.
- [ ] A1.3 Assert header + primary CTA visible.
- [ ] A1.4 Assert no horizontal overflow.

Test A2: Login layout sanity
- [ ] A2.1 `page.goto('/auth/login')`.
- [ ] A2.2 Assert email/password/submit visible.
- [ ] A2.3 Assert no horizontal overflow.

Test A3: Signup layout sanity
- [ ] A3.1 `page.goto('/auth/sign-up')`.
- [ ] A3.2 Assert required inputs visible.
- [ ] A3.3 Assert no horizontal overflow.

Test A4: Test index sanity
- [ ] A4.1 `page.goto('/test')`.
- [ ] A4.2 Assert status 200 + body visible.

### B) Route Coverage (ALL UI routes)

Test B1: Public/preview routes render (200)
- [ ] B1.1 Build `PUBLIC_ROUTES` list from inventory below.
- [ ] B1.2 For each route: `page.goto(route)`.
- [ ] B1.3 Assert status 200 + body visible.
- [ ] B1.4 Assert no horizontal overflow.

Test B2: Protected routes redirect to login
- [ ] B2.1 Build `PROTECTED_ROUTES` list from inventory below.
- [ ] B2.2 For each route: `page.goto(route)`.
- [ ] B2.3 Assert redirect to `/auth/login`.
- [ ] B2.4 Assert login form visible.

### C) Mobile Navigation & Overlays (mobile projects only)

Test C1: Mobile nav open/close
- [ ] C1.1 `page.goto('/')` on iPhone/Android.
- [ ] C1.2 Click mobile nav button.
- [ ] C1.3 Assert dialog visible.
- [ ] C1.4 Assert body scroll locked.
- [ ] C1.5 Close dialog and assert hidden.

### D) Viewport & Safe-Area (mobile projects only)

Test D1: `--app-vh` set
- [ ] D1.1 `page.goto('/')` on iPhone/Android.
- [ ] D1.2 Read `--app-vh` from root.
- [ ] D1.3 Assert non-empty + > 0.

### E) Scroll Containers (all projects)

Test E1: Articles scroll
- [ ] E1.1 `page.goto('/articles')` or fallback `/test/articles`.
- [ ] E1.2 Scroll container or page.
- [ ] E1.3 Assert scrollTop increases.

### F) Console Error Guard (all projects)

Test F1: No console errors on key pages
- [ ] F1.1 Capture `page.on('console')` errors.
- [ ] F1.2 Visit `/`, `/auth/login`, `/auth/sign-up`, `/test`.
- [ ] F1.3 Assert error list empty.

---

## Phase 2: Extensive Authenticated E2E Coverage (Chromium)

### Auth

Test G1: Login happy path (storageState already created)
- [ ] G1.1 Use storageState session.
- [ ] G1.2 Visit `/dashboard`.
- [ ] G1.3 Assert dashboard content visible.

Test G2: Invalid login error
- [ ] G2.1 Visit `/auth/login`.
- [ ] G2.2 Enter invalid creds.
- [ ] G2.3 Assert error message visible.

### Preferences / Onboarding

Test G3: Complete onboarding flow
- [ ] G3.1 Start at `/preferences?step=1`.
- [ ] G3.2 Fill required fields on each step.
- [ ] G3.3 Complete final step.
- [ ] G3.4 Assert redirect or completion message.

Test G4: Onboarding persistence
- [ ] G4.1 Reload `/preferences`.
- [ ] G4.2 Assert previously selected values visible.

### Settings

Test G5: Sandbox toggle persistence
- [ ] G5.1 Visit `/dashboard/settings`.
- [ ] G5.2 Toggle one setting.
- [ ] G5.3 Reload page.
- [ ] G5.4 Assert toggle state persisted.

Test G6: Reset defaults
- [ ] G6.1 Toggle multiple settings.
- [ ] G6.2 Click reset.
- [ ] G6.3 Assert defaults restored.

Test G7: Voice language persistence
- [ ] G7.1 Set voice language.
- [ ] G7.2 Reload.
- [ ] G7.3 Assert selection persists.

### Tracking Dashboard

Test G8: Dashboard stats render
- [ ] G8.1 Visit `/dashboard/tracking`.
- [ ] G8.2 Assert stats cards visible.

Test G9: Quick Add modal opens
- [ ] G9.1 Click quick add button.
- [ ] G9.2 Assert modal visible.

### Session Tracking

Test G10: Create session + end
- [ ] G10.1 Start session.
- [ ] G10.2 Tap approach once.
- [ ] G10.3 End session.
- [ ] G10.4 Assert redirect to tracking dashboard.

Test G11: Session history -> detail
- [ ] G11.1 Visit `/dashboard/tracking/history`.
- [ ] G11.2 Click first session.
- [ ] G11.3 Assert detail page shows metrics.

### Field Reports

Test G12: Template select -> form
- [ ] G12.1 Visit `/dashboard/tracking/report`.
- [ ] G12.2 Select template.
- [ ] G12.3 Assert form visible.

Test G13: Submit field report
- [ ] G13.1 Fill required fields.
- [ ] G13.2 Submit.
- [ ] G13.3 Assert success state.

Test G14: Validation on empty submit
- [ ] G14.1 Submit without required fields.
- [ ] G14.2 Assert validation errors.

Test G15: Save draft with empty fields
- [ ] G15.1 Click save draft with empty fields.
- [ ] G15.2 Assert draft saved state.

### Weekly Reviews

Test G16: Review template select -> form
- [ ] G16.1 Visit `/dashboard/tracking/review`.
- [ ] G16.2 Select template.
- [ ] G16.3 Assert form visible.

Test G17: Submit weekly review
- [ ] G17.1 Fill required fields.
- [ ] G17.2 Submit.
- [ ] G17.3 Assert success state.

Test G18: Save review draft
- [ ] G18.1 Click save draft without required fields.
- [ ] G18.2 Assert draft saved state.

### Inner Game (non-AI)

Test G19: Welcome card start
- [ ] G19.1 Visit `/dashboard/inner-game`.
- [ ] G19.2 Click start.
- [ ] G19.3 Assert first step renders.

### Scenarios (non-AI)

Test G20: Scenarios hub renders
- [ ] G20.1 Visit `/dashboard/scenarios`.
- [ ] G20.2 Assert hub + cards visible.

Test G21: Scenario phases present
- [ ] G21.1 Assert phase sections render.
- [ ] G21.2 Assert at least one scenario card per phase.

### QA (gated)

Test G22: QA page gating
- [ ] G22.1 Visit `/dashboard/qa` as non-premium.
- [ ] G22.2 Assert upgrade CTA or preview message.

### Articles

Test G23: Articles dashboard page renders
- [ ] G23.1 Visit `/dashboard/articles`.
- [ ] G23.2 Assert content visible.

---

## Phase 3: Integration Tests (testcontainers)

New file: `tests/integration/db/systemTables.integration.test.ts`

Test H1: Purchases require user_id + status
- [ ] H1.1 Create profile.
- [ ] H1.2 Insert purchase without user_id or status.
- [ ] H1.3 Assert insert fails.

Test H2: Purchases cascade delete
- [ ] H2.1 Create profile + purchase.
- [ ] H2.2 Delete profile.
- [ ] H2.3 Assert purchase removed.

Test H3: Scenarios JSONB round-trip
- [ ] H3.1 Create profile.
- [ ] H3.2 Insert scenario with JSONB fields.
- [ ] H3.3 Assert JSONB matches.

Test H4: Scenarios allow null evaluation
- [ ] H4.1 Insert scenario with null evaluation.
- [ ] H4.2 Assert insert succeeds.

Test H5: Scenarios cascade delete
- [ ] H5.1 Create profile + scenario.
- [ ] H5.2 Delete profile.
- [ ] H5.3 Assert scenario removed.

Test H6: user_tracking_stats defaults
- [ ] H6.1 Create profile + stats row.
- [ ] H6.2 Assert counters default to 0.
- [ ] H6.3 Assert arrays default empty.

Test H7: user_tracking_stats uniqueness
- [ ] H7.1 Insert stats row.
- [ ] H7.2 Attempt duplicate insert.
- [ ] H7.3 Assert constraint violation.

---

## Phase 4: Config + Docs

- [ ] I1 Set Playwright `headless: false`.
- [ ] I2 Ensure cross-browser smoke runs on Firefox/WebKit/iPhone/Android.
- [ ] I3 Update `docs/testing_behavior.md` with cross-browser suite rules.
- [ ] I4 Update `docs/logging` as each phase is completed.
- [ ] I5 Ensure `scripts/run-tests.sh` includes integration + E2E suites.

---

## Route Inventory (UI)

Public / Preview
- `/`
- `/auth/login`
- `/auth/sign-up`
- `/auth/sign-up-success`
- `/articles` (if public)
- `/qa` (if preview)
- `/test`
- `/test/achievements`
- `/test/articles`
- `/test/key-stats`
- `/test/key-stats-effects`
- `/test/marcus-loop`
- `/test/role-models`
- `/test/ultra-short-reports`
- `/test/values-curation`

Protected (redirect to `/auth/login` when unauthenticated)
- `/dashboard`
- `/dashboard/articles`
- `/dashboard/inner-game`
- `/dashboard/qa`
- `/dashboard/scenarios`
- `/dashboard/settings`
- `/dashboard/tracking`
- `/dashboard/tracking/history`
- `/dashboard/tracking/report`
- `/dashboard/tracking/review`
- `/dashboard/tracking/session`
- `/dashboard/tracking/session/00000000-0000-0000-0000-000000000000`
- `/preferences`
- `/preferences/archetypes`
- `/preferences/secondary-region`

---

## Success Criteria
- Cross-browser smoke passes on Firefox, WebKit, iPhone, Pixel.
- All UI routes either render or redirect correctly.
- No console errors on key public pages.
- Authenticated flows deterministic and stable on Chromium.
- Integration tests validate system tables and cascades.
