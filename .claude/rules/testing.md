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

## Fixing is half of it: lower the baseline

Three checks in this repo are **ratchets** — they hold a count that may fall and
never rise:

| Ratchet | Baseline | Lower it with |
|---|---|---|
| Lint | `eslint-baseline.json` | `node scripts/lint-ratchet.mjs --update` |
| Typecheck | `tsc-baseline.json` | `node scripts/typecheck-ratchet.mjs --update` |
| Write coverage | `tests/support/writeCoverage.baseline.json` | classify the new write function in the file |

**Fixing the errors does not hold the gain. Lowering the baseline does.** Clear
four lint errors and leave the baseline where it was and the repo now carries
four errors of headroom — a regression slides back in and every check still
passes, which is the exact drift the ratchet exists to stop. The tool says so
when it is owed: *"338 (baseline 341). 3 fewer — lower the baseline"*. Run the
command it prints, in the same sitting, and re-run to confirm it reads
*"none new"*.

Raising a baseline is a separate, deliberate act (`--accept-new`), and it is not
how you get past a failure you caused.

**The check is not "does the ratchet pass". It is "does it still pass at one
lower."** A ratchet with headroom passes and protects nothing, and that is the
failure mode that hides best — everything is green while the slack sits there
waiting for a regression to fill it. For a generated baseline, `--update` makes
it exact by construction. For a hand-written ceiling, lower it by one and watch
it fail; if it does not, the real number is lower and that is the number.

The same applies to every **allowlist of grandfathered violations**. An entry
whose file has since been fixed, or deleted, is a free pass waiting for the
violation to come back. Seven of the allowlists in
`tests/unit/architecture.test.ts` carry a companion assertion — *"These are
fixed or gone — remove them from X"* — and **all ten do now**: the three that did
not (`ALLOWED_LONG_ROUTES`, `ALLOWED_TYPE_EXPORTS`, `HAND_ROLLED_WEEK_ALLOWED`)
got theirs on 2026-09-18. Copy the pattern whenever a new allowlist is added, and
assert it **off the same scan** the enforcement half already does rather than
re-scanning — two scans mean two copies of the rule for what counts as a
violation, and they drift.

*2026-09-18, the same afternoon: the write-coverage ceiling stood at 136 with a
real count of 132 — four untested write paths of headroom, green the whole time.
Proved exact by lowering it to 131 and watching it fail. `ALLOWED_LONG_ROUTES`
still listed `app/api/articles/alternatives/route.ts`, deleted in the September
cleanup, so a route recreated at that path would have been excused for free. Both
fixed the same evening, and each new assertion was proved by planting a stale
entry and watching it go red.*

*2026-09-18: four lint errors were fixed and the baseline was left at 341, in the
same hour a broken ignore pattern had made the lint ratchet silently unable to
report anything at all. Both halves were invisible; another session caught both.*
