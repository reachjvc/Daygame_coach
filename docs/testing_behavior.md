# Testing Behavior

**Status:** Active
**Updated:** 02-02-2026

## Core Principles

### 1. Deterministic Testing (Non-Negotiable)

**No flaky tests.** Every test must produce the same result on every run.

| Anti-pattern | Solution |
|--------------|----------|
| `Math.random()` | Seed-based generators or fixed test data |
| `Date.now()` | Inject time dependency or freeze time |
| `setTimeout` delays | Explicit waits for conditions |
| Network race conditions | Testcontainers with controlled state |
| Shared mutable state | Isolated test setup/teardown |

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

### 3. Real Dependencies via Testcontainers

**No mocking of external services.** Use testcontainers for:
- Database (PostgreSQL/Supabase)
- Redis/cache layers

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

**Schema tests** (raw SQL against testcontainers):
- Validate constraints, FKs, cascades
- Don't test production code
- Good for catching database drift

**Function tests** (call actual repo/service functions):
- Validate business logic, error handling
- Require solving dependency injection for Supabase client
- Better coverage but harder to set up

**If you can't call production functions**, document what the test actually validates. Don't claim it tests the repo when it only tests the schema.

See `tests/integration/db/*.integration.test.ts` headers for examples of proper documentation.

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

## Test Script Requirements

The test script (`scripts/run-tests.sh`) must:
1. Run ALL tests (unit, integration, e2e)
2. Fail fast on first error
3. Exit with non-zero code if any test fails
4. Be updated whenever new test types are added
