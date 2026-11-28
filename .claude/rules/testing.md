---
paths:
  - "tests/**"
---
# Tests
The one home of the test rules. Test database and dev-server traps: `docs/tech.md` section 2.
- `*.test.ts`: Vitest, `tests/unit/`. `*.integration.test.ts`: Vitest, `tests/integration/`. `*.spec.ts`: Playwright, `tests/e2e/`.
- One clear thing per test. Its name says what it proves.
- Same result on every run: no random data, no real clock (freeze it), no fixed sleeps (wait for a condition).
- Not brittle: check what the user sees or what the data says, not class names or exact layout.
- Call the code users trigger (the repo or service function), not raw SQL. Insert-then-read-back tests Postgres, not us.
- Never pass by doing nothing. No silent `return`: use `test.skip(condition, reason)`. Setup helpers throw when setup fails.
- A refused write names its constraint or SQLSTATE, never a bare `.rejects.toThrow()`.
- Never write to the live database. Database tests run on the local test stack (`scripts/db/test-stack.mjs`).
- Each test makes its own user (`newUser()`, `tests/db/harness.ts`). Nothing is wiped, so files run in parallel. With `TEST_SHARED_USER=1` the cross-user tests must go red.
- Every e2e spec imports `test` from `tests/e2e/fixtures/test.ts` (a fresh test account per worker). Tags in `playwright.config.ts` add devices: `@phone`, `@engine`, `@timing`.
- Every `spawnSync` in a test gets `NODE_ENV: "test"` in its env.
- A bug gets a test that fails before the fix and passes after it. A failing test: fix the cause in the code, not the test.
- Ratchets only fall: `eslint-baseline.json` (`node scripts/lint-ratchet.mjs --update`), `tsc-baseline.json` (`node scripts/typecheck-ratchet.mjs --update`), `tests/support/writeCoverage.baseline.json` (classify the new write function). Lower a baseline in the same change as the fix. Never raise one to get past a failure you caused.
- Time Log guard tests and photos have their own rules: `docs/tech.md` section 6.
