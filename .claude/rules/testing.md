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

- Check `.test-known-failures.json` before calling a failure pre-existing.
- Test production functions, not raw SQL. No tests that pass by doing nothing.
- The `training` Playwright project runs real flows at 390×844 on one worker; its specs share one account, so never run them in parallel.

## Ratchets — counts that may only fall

| Ratchet | Baseline | Lower it with |
|---|---|---|
| Lint | `eslint-baseline.json` | `node scripts/lint-ratchet.mjs --update` |
| Typecheck | `tsc-baseline.json` | `node scripts/typecheck-ratchet.mjs --update` |
| Write coverage | `tests/support/writeCoverage.baseline.json` | classify the new write function |

When you fix errors, lower the baseline in the same change. Never raise one to get past a failure you caused.
