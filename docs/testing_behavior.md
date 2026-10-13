# Testing Behavior

**Status:** Active
**Updated:** 2026-10-13

## Core Principles

### 1. Deterministic Testing (Non-Negotiable)

**No flaky tests.** Every test must produce the same result on every run.

| Anti-pattern | Solution |
|--------------|----------|
| `Math.random()` | Seed-based generators or fixed test data |
| `Date.now()` | Inject time dependency or freeze time |
| `setTimeout` delays | Explicit waits for conditions |
| Network race conditions | The local test backend, with controlled state |
| Shared mutable state | A fresh user per test (`newUser()`), never a shared account |

### 2. False Pass Anti-Pattern (CRITICAL)

**Never use silent `return` to skip test logic.** This creates false confidence.

```typescript
// ❌ WRONG - Test passes green but tests nothing
if (!response.ok()) {
  console.log('Cannot create data, skipping test')
  return  // Shows as PASSED
}

// ✅ CORRECT - Use proper test.skip() with reason
test.skip(!precondition, 'Reason why test cannot run')

// ✅ CORRECT - Create test data deterministically
const sessionId = await createTestSessionViaAPI(page, 'Test Location')
// If this throws, test fails (good - we know setup failed)
```

**Why this matters:**
- Silent returns show ✅ green in test report
- You think you have security coverage when you don't
- Real security bugs go undetected

**Pattern for E2E tests needing API data:**
1. Create helper functions that throw on failure (see `tests/e2e/helpers/auth.helper.ts`)
2. Use helpers: `createTestSessionViaAPI()`, `createTestApproachViaAPI()`
3. Clean up in `finally` block: `ensureNoActiveSessionViaAPI()`

### 3. A Real Backend, Built From Production's Schema

**No mocking of the database.** Database tests run against a throwaway local
Supabase (`scripts/db/test-stack.mjs`) built from `tests/db/baseline.sql`, a
schema-only dump of production, plus every repo migration production does not
have yet. Never write a schema by hand for tests: the hand-written copy this
replaced drifted far enough to hide a feature that never saved.

- **Isolation comes from users, not truncation.** Every test makes its own user
  with `newUser()` (`tests/db/harness.ts`); nothing is wiped between tests, so
  files run in parallel.
- **The app's own data code runs unchanged.** Mock `@/src/db/supabase` with
  `stackSupabaseModule` and call the repo function; `actAs(user)` decides whose
  session it runs with, through real PostgREST and real row security.
- **Prove isolation, not just green:** `TEST_SHARED_USER=1` puts every test on
  one account; the cross-user tests must go red.
- Refresh the baseline with `scripts/db/baseline.sh` once production has a new
  migration; `--check` reports drift made outside a migration.

### 4. Sensitive Information

**All secrets in `.env`** - never hardcode credentials in test files.

### 5. Don't Test What You Just Created (False Confidence Pattern)

**The problem:** Tests that insert data and then query it back only test that INSERT/SELECT work - not your production code.

| Anti-pattern | What it actually tests |
|--------------|------------------------|
| Raw SQL INSERT → Raw SQL SELECT | PostgreSQL works |
| `if (condition) { insert }` in test | Your test logic, not production logic |
| Test creates data → asserts on same data | Nothing useful |

```typescript
// ❌ WRONG - Tests that PostgreSQL works, not your code
await client.query(`INSERT INTO users (name) VALUES ('test')`)
const result = await client.query(`SELECT * FROM users`)
expect(result.rows).toHaveLength(1)  // Always passes!

// ✅ CORRECT - Tests your actual production function
import { createUser, getUsers } from '@/db/usersRepo'
await createUser({ name: 'test' })
const users = await getUsers()
expect(users).toHaveLength(1)  // Tests real code path
```

**Solution:** Tests should call the **same functions users trigger**. If users call `saveComparison()`, tests should call `saveComparison()`, not `INSERT INTO value_comparisons`.

### 6. Schema Tests vs Function Tests (Know the Difference)

**Schema tests** (raw SQL as `asOwner` / `asUser`):
- Validate constraints, FKs, cascades
- Don't test production code
- Good for catching database drift

**Function tests** (call actual repo/service functions):
- Validate business logic, error handling, row security as the app meets it
- Live in `tests/integration/repos/`; see their headers for the module mock

**If you can't call production functions**, document what the test actually validates. Don't claim it tests the repo when it only tests the schema.

Name every refusal: assert the constraint name or SQLSTATE, never a bare
`.rejects.toThrow()` (`tests/unit/infra/integrationNamesItsRefusals.test.ts`
fails on one).

## Test Structure: Arrange-Act-Assert
Every test follows AAA pattern with explicit comments:

```typescript
test('should increment approach counter when tapping', async ({ page }) => {
  // Arrange: Start a session first
  await startSession(page)
  await expect(page.getByTestId('approach-counter')).toHaveText('0')

  // Act: Tap for approach
  await page.getByTestId('tap-approach-button').click()

  // Assert: Counter should increment to 1
  await expect(page.getByTestId('approach-counter')).toHaveText('1')
})
```

---

## Test Coverage Requirements

### For Each Flow: Happy Path + Edge Cases

| Flow Type | Required Tests |
|-----------|----------------|
| **Happy path** | Standard successful flow |
| **Invalid input** | Empty, malformed, boundary values |
| **Error states** | Network failure, auth failure, timeout |
| **Edge cases** | Empty lists, max values, concurrent actions |

## E2E Testing with Playwright

## Unit/Integration Testing with Vitest

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.spec.ts` (Playwright)

## TDD Workflow (Mandatory)

When a test fails during development:

1. **Do NOT just fix the test** - understand the root cause
2. **Fix the production code** throughout the system
3. **Add a regression test** that would have caught this error
4. **Run all tests** to ensure no regressions
