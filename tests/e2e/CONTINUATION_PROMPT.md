# E2E Test Fix - Continuation Prompt

**Copy this into the next Claude session:**

---

## Context

I'm fixing E2E test failures caused by Supabase auth rate limiting. The main fix was implementing Playwright's `storageState` pattern — login once in setup projects, save cookies, reuse across all tests.

## What's Done

1. **`.gitignore`** — Added `tests/e2e/.auth/`
2. **`tests/e2e/auth.setup.ts`** — Created. Logs in User A, saves state to `.auth/user.json`
3. **`tests/e2e/auth-user-b.setup.ts`** — Created. Logs in User B, saves state to `.auth/user-b.json`
4. **`playwright.config.ts`** — Rewritten with 5 projects: `setup`, `setup-user-b`, `no-auth`, `chromium`, `security-multi-user`
5. **~20 spec files** — Removed `login(page)` from `beforeEach` hooks
6. **`security-rls.spec.ts` & `security-idor.spec.ts`** — Updated to use `storageState` in `browser.newContext()` instead of `login()`/`loginAsUserB()`
7. **`session-tracking.spec.ts` & `start-session.spec.ts`** — Added `ensureNoActiveSessionViaAPI` in `afterEach`

## Results So Far

- Before: **71 failures**, 98 passed
- After: **29 failures**, 160 passed (from 198 total)

## Remaining 29 Failures (need investigation)

### Category 1: `protected-routes.spec.ts` and `scenarios-hub.spec.ts` "Preview Mode" tests
These tests check UNAUTHENTICATED behavior (clear cookies, test redirects). They're currently in the `chromium` project which pre-loads `storageState`. The `clearCookies()` call removes HTTP cookies but `storageState` also restores `localStorage` which may contain Supabase auth tokens.

**Fix options:**
- Move these specific tests to the `no-auth` project in `playwright.config.ts`
- OR add `page.evaluate(() => localStorage.clear())` after `clearCookies()`

### Category 2: `auth.spec.ts` tests 3-4 (logout, navigate to settings)
These are in the `no-auth` project and call `login(page)` explicitly in test bodies. They may be hitting rate limits if running concurrently with the setup projects. Consider running `no-auth` tests with `dependencies: ['setup']` but without `storageState`, just to serialize them after setup completes.

### Category 3: `dashboard-navigation.spec.ts` (ALL 8 tests failing)
Authenticated tests that should work with `storageState`. Need to check if the page is redirecting to login (expired/invalid storageState) or showing unexpected content. Run with `--debug` to investigate.

### Category 4: `scenarios-hub.spec.ts` authenticated tests (5 failures)
May show "Complete Your Profile First" — test user profile may need onboarding completed.

### Category 5: Session-related failures
- `data-persistence.spec.ts` — session conflicts between parallel tests
- `start-session.spec.ts` — similar
- `session-tracking.spec.ts` — zombie session test (pre-existing flaky test)

### Category 6: `security-idor.spec.ts` — 1 failure
"User B cannot DELETE User A approach by ID" — investigate the specific error

### Category 7: Field report, QA chat failures
Some tests may have pre-existing issues unrelated to auth.

## Key Files

- `playwright.config.ts` — project configuration
- `tests/e2e/auth.setup.ts` — User A setup
- `tests/e2e/auth-user-b.setup.ts` — User B setup
- `tests/e2e/helpers/auth.helper.ts` — login/logout/session helpers (unchanged)
- `tests/e2e/helpers/selectors.ts` — data-testid selectors (unchanged)

## Next Steps

1. Run `npx playwright test --project=chromium tests/e2e/dashboard-navigation.spec.ts --debug` to see why authenticated tests fail
2. Fix the `protected-routes.spec.ts` and `scenarios-hub.spec.ts` preview mode tests (move to `no-auth` or clear localStorage)
3. Investigate each remaining failure category
4. Run full suite again: `npx playwright test`
5. Per CLAUDE.md rules: run `npm test` after changes, never auto-pass

---
