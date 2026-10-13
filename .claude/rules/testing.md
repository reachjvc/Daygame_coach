---
paths:
  - "tests/**"
---

# Testing

Read `docs/testing_behavior.md` before writing tests.

| Pattern | Runner | Location |
|---|---|---|
| `*.test.ts` | Vitest | `tests/unit/` |
| `*.integration.test.ts` | Vitest | `tests/integration/` |
| `*.spec.ts` | Playwright | `tests/e2e/` |

- Test production functions, not raw SQL. No tests that pass by doing nothing.
- Every spec imports `test` from `tests/e2e/fixtures/test.ts`: each worker gets a fresh account in the local test backend, so specs run in parallel. Lanes in `playwright.config.ts` pick extra devices by tag: `@phone`, `@engine`, `@timing`.

## Ratchets — counts that may only fall

| Ratchet | Baseline | Lower it with |
|---|---|---|
| Lint | `eslint-baseline.json` | `node scripts/lint-ratchet.mjs --update` |
| Typecheck | `tsc-baseline.json` | `node scripts/typecheck-ratchet.mjs --update` |
| Write coverage | `tests/support/writeCoverage.baseline.json` | classify the new write function |

When you fix errors, lower the baseline in the same change. Never raise one to get past a failure you caused.
