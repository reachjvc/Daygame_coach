# Better Tests Plan

**Status:** Phase 3 - Mock Test Removal
**Updated:** 31-01-2026 20:15

## Changelog
- 31-01-2026 20:15 - CORRECTION: Mock tests must be deleted, not kept. Quality > quantity.
- 31-01-2026 19:45 - Comprehensive audit of all 36 test files against testing_behavior.md
- 31-01-2026 17:50 - Phase 1 complete: deleted useless component tests
- 31-01-2026 12:30 - Initial plan created

---

## ⚠️ Audit Failure Notice

**Initial audit was too conservative.** I recommended keeping 11 mock-heavy test files because they "provide some value" - this was wrong.

The user's rules are explicit:
> **NO MOCKS - use testcontainers for real dependencies**

Tests that mock dependencies violate this rule and must be deleted. The philosophy is:
> **GOOD tests > many tests**

False confidence from mock tests is worse than no tests. E2E covers real behavior.

---

## Executive Summary

Audited **36 test files** (20 unit, 16 E2E) against `testing_behavior.md` compliance:

| Category | Files | Compliant | Verdict |
|----------|-------|-----------|---------|
| Schema tests | 3 | ✅ Full | **KEEP** - Pure Zod, no mocks |
| QA pure function tests | 3 | ✅ Full | **KEEP** - Pure functions |
| Profile/Articles/Repo helpers | 3 | ✅ Full | **KEEP** - Pure functions |
| Service tests (with mocks) | 3 | ❌ Violates rules | **DELETE** - Mocks deps |
| API route tests | 8 | ❌ Violates rules | **DELETE** - Mocks auth/service |
| E2E tests | 16 | ✅ Full | **KEEP** - Real behavior |

**Current: 36 files, ~701 tests**
**After cleanup: 25 files, ~410 tests**

---

## testing_behavior.md Rules Checklist

| Rule | Description |
|------|-------------|
| ✅ Deterministic | No flaky tests, no Math.random(), seeded data |
| ⚠️ No mocking external services | Testcontainers for DB/Redis (NOT enforced) |
| ✅ AAA pattern | Arrange-Act-Assert with comments |
| ✅ data-testid selectors | E2E uses test IDs exclusively |
| ⚠️ TDD workflow | Tests exist, but not all are integration |

---

## Detailed Audit by Category

### 1. Schema Tests (3 files) - ✅ FULLY COMPLIANT

| File | Tests | Compliance | Notes |
|------|-------|------------|-------|
| `tests/unit/tracking/schemas.test.ts` | 104 | ✅ | Pure Zod validation, boundary testing |
| `tests/unit/qa/schemas.test.ts` | 34 | ✅ | Tests all field constraints |
| `tests/unit/inner-game/schemas.test.ts` | 44 | ✅ | Tests step enums, arrays, edge cases |

**Why compliant:**
- Zero dependencies on external services
- Pure input/output validation
- Deterministic - same input = same output
- Tests real bugs: invalid data slipping through

**Verdict:** Keep as-is. These are the gold standard.

---

### 2. QA Pure Function Tests (3 files) - ✅ FULLY COMPLIANT

| File | Tests | Compliance | Notes |
|------|-------|------------|-------|
| `tests/unit/qa/confidence.test.ts` | 28 | ✅ | Tests `computeConfidence`, `detectPolicyViolations` |
| `tests/unit/qa/prompt.test.ts` | 38 | ✅ | Tests `buildSystemPrompt`, `buildUserPrompt`, `parseResponse` |
| `tests/unit/qa/qaServiceHelpers.test.ts` | 37 | ✅ | Tests `createNoContextResponse`, `chunksToSources`, `createMetaCognition` |

**Why compliant:**
- Pure functions with no side effects
- No mocking required
- Tests business logic (confidence scoring, prompt building)
- Deterministic

**Verdict:** Keep as-is.

---

### 3. Other Pure Function Tests (3 files) - ✅ FULLY COMPLIANT

| File | Tests | Compliance | Notes |
|------|-------|------------|-------|
| `tests/unit/profile/profileService.test.ts` | 55 | ✅ | Tests `getInitialLevelFromExperience`, `sanitizeArchetypes`, `validateAgeRange`, `validateRegion` |
| `tests/unit/articles/articlesService.test.ts` | 36 | ✅ | Tests `buildSystemPrompt`, `buildUserPrompt`, `formatFeedbackForPrompt` |
| `tests/unit/db/trackingRepoHelpers.test.ts` | 35 | ✅ | Tests `getISOWeekString`, `areWeeksConsecutive`, `isWeekActive` |

**Why compliant:**
- Pure functions extracted from services
- No database/network dependencies
- Tests real edge cases (year boundaries, duplicate detection)

**Verdict:** Keep as-is.

---

### 4. Service Tests with Mocks (3 files) - ❌ DELETE

| File | Tests | Action |
|------|-------|--------|
| `tests/unit/settings/settingsService.test.ts` | 43 | **DELETE** |
| `tests/unit/scenarios/scenariosService.test.ts` | 21 | **DELETE** |
| `tests/unit/inner-game/innerGameService.test.ts` | 11 | **DELETE** |

**Why delete:**

These tests mock database repos and external APIs. They test what you *told* them to return, not what the code *actually does*.

```typescript
// This test proves nothing - you're testing your own mock
vi.mocked(getProfile).mockResolvedValue({ id: userId, level: 5 })
const result = await someFunction(userId)
expect(getProfile).toHaveBeenCalledWith(userId)  // So what?
```

**What you lose:** Nothing real. E2E tests cover these flows.
**What you gain:** No false confidence, cleaner codebase.

---

### 5. API Route Tests (8 files) - ❌ DELETE

| File | Tests | Action |
|------|-------|--------|
| `tests/unit/api/tracking.test.ts` | 41 | **DELETE** |
| `tests/unit/api/qa.test.ts` | 15 | **DELETE** |
| `tests/unit/api/inner-game.test.ts` | 54 | **DELETE** |
| `tests/unit/api/tracking-stats.test.ts` | 14 | **DELETE** |
| `tests/unit/api/tracking-review.test.ts` | 21 | **DELETE** |
| `tests/unit/api/tracking-session.test.ts` | 26 | **DELETE** |
| `tests/unit/api/tracking-field-report.test.ts` | 22 | **DELETE** |
| `tests/unit/api/scenarios.test.ts` | 23 | **DELETE** |

**Why delete:**

All API tests mock auth and service layers:
```typescript
vi.mock("@/src/db/server")      // Auth is fake
vi.mock("@/src/tracking/trackingService")  // Service is fake
```

These tests verify that routes call mocked functions. They don't verify:
- Real authentication works
- Real database operations succeed
- Real error handling

**E2E already covers these routes.** When you test session tracking E2E, you're testing:
- Real auth (Supabase)
- Real API route
- Real service
- Real database

**What you lose:** Documentation of expected status codes (but OpenAPI/types do this better)
**What you gain:** No false confidence, 291 fewer tests to maintain

---

### 6. E2E Tests (16 files) - ✅ FULLY COMPLIANT

| File | Tests Real Flow |
|------|-----------------|
| `tests/e2e/auth.spec.ts` | Login/logout flow |
| `tests/e2e/onboarding.spec.ts` | New user onboarding |
| `tests/e2e/signup-flow.spec.ts` | Registration flow |
| `tests/e2e/dashboard-navigation.spec.ts` | Dashboard navigation |
| `tests/e2e/session-tracking.spec.ts` | Start session, tap approach, end session |
| `tests/e2e/start-session.spec.ts` | Session start dialog |
| `tests/e2e/approach-logging.spec.ts` | Approach logging flow |
| `tests/e2e/field-report.spec.ts` | Field report creation |
| `tests/e2e/tracking-dashboard.spec.ts` | Stats dashboard |
| `tests/e2e/weekly-review.spec.ts` | Weekly review flow |
| `tests/e2e/qa-chat.spec.ts` | Q&A chat flow |
| `tests/e2e/inner-game-flow.spec.ts` | Inner game steps |
| `tests/e2e/scenarios-hub.spec.ts` | Scenarios navigation |
| `tests/e2e/settings.spec.ts` | Settings page |
| `tests/e2e/preferences.spec.ts` | User preferences |
| `tests/e2e/articles.spec.ts` | Articles page |

**Why fully compliant:**
- Real browser via Playwright
- Real app, real database
- Uses `data-testid` selectors exclusively
- AAA pattern with comments
- Tests actual user flows

**Example from session-tracking.spec.ts:**
```typescript
test('should increment approach counter when tapping', async ({ page }) => {
  // Arrange: Start a session first
  await startButton.click()
  await confirmButton.click()
  await expect(counter).toHaveText('0')

  // Act: Tap for approach
  await tapButton.click()

  // Assert: Counter should increment to 1
  await expect(counter).toHaveText('1')
})
```

**Verdict:** KEEP ALL. These are the source of truth for behavior.

---

## Gap Analysis

### What We Have
- ✅ Schema validation (edge cases, boundaries)
- ✅ Pure business logic (confidence, prompts, helpers)
- ✅ Route-level validation (auth, input parsing)
- ✅ Full E2E flows (real user journeys)

### What We're Missing (Per testing_behavior.md)

| Gap | Severity | Fix |
|-----|----------|-----|
| Testcontainer DB integration tests | Medium | Would catch repo bugs |
| Real Stripe integration tests | Low | Manual testing sufficient |
| Error state E2E | Low | Happy paths covered |

---

## Action Plan

### Phase 3: Delete Mock Tests (PENDING)

**Files to delete (11 files, ~291 tests):**

```bash
# Service tests with mocks
rm tests/unit/settings/settingsService.test.ts
rm tests/unit/scenarios/scenariosService.test.ts
rm tests/unit/inner-game/innerGameService.test.ts

# API route tests with mocks
rm tests/unit/api/tracking.test.ts
rm tests/unit/api/qa.test.ts
rm tests/unit/api/inner-game.test.ts
rm tests/unit/api/tracking-stats.test.ts
rm tests/unit/api/tracking-review.test.ts
rm tests/unit/api/tracking-session.test.ts
rm tests/unit/api/tracking-field-report.test.ts
rm tests/unit/api/scenarios.test.ts
```

**After deletion:**
1. Run `npm test` to verify remaining tests pass
2. Run E2E to confirm real behavior still tested
3. Update test count in documentation

### Phase 4: Future Improvements (Optional)

**If gaps are found after deletion:**

Add testcontainer integration tests for critical repos:

```typescript
// tests/integration/trackingRepo.integration.test.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'

describe('trackingRepo', () => {
  let container: StartedPostgreSqlContainer

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start()
    // Setup schema and client
  })

  test('createSession should insert row', async () => {
    const session = await createSession({ user_id: 'user-123' })
    // Query real DB to verify
  })
})
```

---

## Summary

| Category | Decision | Reason |
|----------|----------|--------|
| Schema tests (3) | ✅ Keep | Pure Zod, no mocks |
| Pure function tests (9) | ✅ Keep | No mocks, real logic |
| Service tests (3) | ❌ **DELETE** | Violates no-mock rule |
| API route tests (8) | ❌ **DELETE** | Violates no-mock rule |
| E2E tests (16) | ✅ Keep | Gold standard |
| Component tests | ❌ Already deleted | Phase 1 |

**Before:** 36 test files, ~700 tests
**After:** 25 test files, ~410 tests (all compliant)

**Philosophy:**
> GOOD tests > many tests. False confidence is worse than no tests.

---

## Handover Notes

### What was done
1. Phase 1: Deleted component unit tests (duplicate of E2E)
2. Phase 2: Audited all 36 test files against testing_behavior.md
3. Identified 11 files that violate "NO MOCKS" rule

### What needs to be done
1. **Phase 3:** Delete the 11 mock-heavy test files listed above
2. Run `npm test` and `npm run test:e2e` to verify suite still works
3. Verify no real coverage gaps exist (E2E should cover everything)

### Files to keep (25 total)
- `tests/unit/tracking/schemas.test.ts`
- `tests/unit/qa/schemas.test.ts`
- `tests/unit/qa/confidence.test.ts`
- `tests/unit/qa/prompt.test.ts`
- `tests/unit/qa/qaServiceHelpers.test.ts`
- `tests/unit/inner-game/schemas.test.ts`
- `tests/unit/profile/profileService.test.ts`
- `tests/unit/articles/articlesService.test.ts`
- `tests/unit/db/trackingRepoHelpers.test.ts`
- All 16 E2E spec files in `tests/e2e/`
