---
paths:
  - "tests/**"
---
# Testing
- Read `docs/tech.md`, section "Tests", before writing tests.
- `*.test.ts`: Vitest, `tests/unit/`. `*.integration.test.ts`: Vitest, `tests/integration/`. `*.spec.ts`: Playwright, `tests/e2e/`.
- One clear thing per test. Same result every run: no random data, no real clock, no fixed sleeps.
- Test production functions, not raw SQL. No tests that pass by doing nothing: no silent `return`, use `test.skip(condition, reason)`.
- Never write to the live database. Each test makes its own user (`newUser()`, `tests/db/harness.ts`) on the local test stack.
- Every spec imports `test` from `tests/e2e/fixtures/test.ts`. Tags in `playwright.config.ts` add devices: `@phone`, `@engine`, `@timing`.
- A failing test: fix the cause in the code, not the test.
- Ratchets only fall: `eslint-baseline.json` (`node scripts/lint-ratchet.mjs --update`), `tsc-baseline.json` (`node scripts/typecheck-ratchet.mjs --update`), `tests/support/writeCoverage.baseline.json` (classify the new write function).
- Lower a baseline in the same change as the fix. Never raise one to get past a failure you caused.
