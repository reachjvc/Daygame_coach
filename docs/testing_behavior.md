# Testing Behavior

**Status:** Active
**Updated:** 30-01-2026 21:15

## Changelog
- 31-01-2026 19:46 - Added architecture compliance tests and husky pre-commit hooks section
- 30-01-2026 21:15 - Comprehensive rewrite: deterministic testing, testcontainers, TDD workflow, edge cases

---

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

### 2. Real Dependencies via Testcontainers

**No mocking of external services.** Use testcontainers for:
- Database (PostgreSQL/Supabase)
- Redis/cache layers

### 3. Sensitive Information

**All secrets in `.env`** - never hardcode credentials in test files.

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

### Configuration (headless=false required)
playwright.config.ts always use 

### Selector Strategy

Use `data-testid` exclusively - no CSS classes or text content:

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

## Production Code Testability

### Design for Testability

| Pattern | Why |
|---------|-----|
| Dependency injection | Swap real deps for test containers |
| Explicit error types | Test specific error conditions |

## Architecture Compliance Tests

`tests/unit/architecture.test.ts` enforces CLAUDE.md rules automatically:

| Check | Rule Enforced |
|-------|---------------|
| API route length | Max 50 lines (CLAUDE.md says 30, buffer added) |
| No Supabase outside db/ | Database access only via `src/db/` |
| Slice types in types.ts | Types centralized per slice |
| Doc headers | Status/Updated required in docs |

**Allowlists**: Existing violations are grandfathered in `ALLOWED_LONG_ROUTES` and `ALLOWED_TYPE_EXPORTS` sets. Remove items as violations get fixed.

## Pre-Commit Hooks (Husky)

`.husky/pre-commit` runs automatically on `git commit`:

1. **Runs `npm test`** - all unit tests including architecture compliance
2. **Checks changelog entries** - warns if modified docs are missing today's date

Install hooks after cloning: `npm install` (runs `husky` via prepare script)

## Pre-Commit Requirement

**All tests must pass before returning to user.** Claude must run `npm test` and see green before completing any task. 