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

Mobile and cross-browser coverage (`tests/e2e/mobile/`) is currently a skeleton — loads and touch targets only. Expanding it to real flows is substantial work, not a quick task.
