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

Report every failure — check `.test-known-failures.json` before calling one pre-existing, and never proceed past a new one.

Test production functions, not raw SQL. Arrange-Act-Assert, deterministic, no silent returns that pass by doing nothing.

Mobile and cross-browser coverage (`tests/e2e/mobile/`) is loads and touch targets for most slices. **Training is the exception and the pattern to copy** — see below.

**Training is the exception**, and it is the pattern to copy. The `training`
project (`playwright.config.ts`) runs the real flows at 390 × 844 on one worker:
a set survives a reload, the rest clock survives a backgrounded tab, a pounds
lifter's weights stay in pounds, sets ticked with no connection arrive when it
returns, a correction moves the weights it prescribed. It has its own project
because those specs share one account and each wipes it clean — run beside each
other they delete each other's rows mid-assertion.
