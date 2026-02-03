# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changelog
- 03-02-2026 - Added code-review subagent rule for major code changes
- 01-02-2026 12:30 - Added tech stack, development commands, test organization, articles slice
- 31-01-2026 19:50 - Restructured for better Claude compliance: pre-response checklist, stronger framing
- 31-01-2026 19:35 - Added doc-before-summary rule with strict order
- 30-01-2026 20:07 - Added rule to read testing_behavior.md before writing tests

---

## Tech Stack

Next.js 16 app with Supabase (PostgreSQL + Auth), AI SDK (Anthropic/OpenAI), Tailwind CSS, Radix UI components, Zod validation, Stripe payments.

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Testing
npm test                 # Unit tests (Vitest) - run after EVERY code change
npm run test:watch       # Unit tests in watch mode
npm run test:integration # Integration tests with testcontainers
npm run test:e2e         # E2E tests (Playwright) - requires dev server
npm run test:all         # Run all test suites

# Run single test file
npx vitest run tests/unit/articles/articlesService.test.ts
npx playwright test tests/e2e/auth-errors.spec.ts

# Run tests matching pattern
npx vitest run -t "should calculate"
```

---

## ⛔ PRE-RESPONSE CHECKLIST (Complete Before Every Summary)

**STOP. Before summarizing to user, verify:**

| # | Check | If Yes |
|---|-------|--------|
| 1 | Did I write/modify code? | Run `npm test` first |
| 2 | Did I complete a task from a doc? | Update that doc NOW (before this message) |
| 3 | Am I about to write new tests? | Read `docs/testing_behavior.md` first |
| 4 | Did I modify any doc? | Add changelog entry with today's date |
| 5 | Did I make major code changes? | Run `code-review` subagent (see below) |

if in doubt, ask user if documents should be updated or not .

**The doc is the source of truth, not your summary.**

---

## Critical Rules

### 1. Doc-Before-Summary (MOST VIOLATED - PAY ATTENTION)

```
WRONG ORDER:
1. Implement feature
2. Tell user "Done!"        ← User sees this
3. (forget to update doc)   ← Doc is now stale

CORRECT ORDER:
1. Implement feature
2. Update doc               ← Do this FIRST
3. Tell user "Done!"        ← Only after doc is updated
```

**Why This Matters (Consequences):**
| When you skip doc updates... | What happens |
|------------------------------|--------------|
| User starts new session | Next Claude has no context, asks same questions again |
| User shares project with teammate | Teammate reads stale docs, makes wrong assumptions |
| User returns after 2 weeks | Forgets what was done, doc doesn't help |
| Pipeline doc not updated | Next pipeline run uses wrong assumptions, fails silently |

**Real cost:** Every skipped doc update = 15-30 min of user's future time wasted.

### 2. Test-Driven Workflow

- **Before writing tests**: Read `docs/testing_behavior.md`
- **Between every step**: Run `npm test`
- **If test fails**: Fix production code, add regression test
- **Never proceed** with failing tests

### 3. Changelog Required

Every doc modification needs a changelog entry at the top:
```
TZ='Europe/Copenhagen' date '+%d-%m-%Y %H:%M'
```
Keep only 5 most recent entries.

### 4. No Fallback Mechanisms

Scripts must fail explicitly - no silent fallbacks. Fix the issue or ask the user.

### 5. Quality Over Speed

20 extra hours for better architecture is worth it.

### 6. Code Review Subagent (After Major Changes)

**When to run:** After completing prompts involving major code changes (new features, refactors, significant bug fixes).

**How to invoke:** Use the Task tool with `subagent_type: "code-review"`

**What it does:**
1. Reads `docs/testing_behavior.md` for testing principles
2. Identifies changed files via `git diff`
3. Checks test coverage for changed code
4. Runs `npm test` to verify tests pass
5. Suggests missing tests (does NOT write them)

**What counts as "major code changes":**
- New service functions or components
- Modified business logic in `*Service.ts`
- New API routes or endpoints
- Database schema or repo changes
- Any change touching 3+ files

**NOT needed for:**
- Doc-only changes
- Config tweaks
- Single-line fixes
- Test-only changes

---

## Architecture (Enforced by tests/unit/architecture.test.ts)

### Slice Structure
```
src/{slice}/
├── types.ts          # All types (enforced)
├── config.ts         # Constants
├── {slice}Service.ts # Business logic (enforced)
├── components/       # Slice UI
└── data/            # Data files
```

### Rules (Automated Enforcement)
| Rule | Enforcement |
|------|-------------|
| Business logic in `*Service.ts` only | Architecture test |
| Database in `src/db/*Repo.ts` only | Architecture test |
| API routes max 50 lines | Architecture test |
| Types in `types.ts` per slice | Architecture test |
| Shared UI in `components/ui/` | Manual review |

### Slices
`src/articles/` · `src/qa/` · `src/inner-game/` · `src/scenarios/` · `src/tracking/` · `src/profile/` · `src/settings/` · `src/db/`

Specs in `docs/slices/SLICE_*.md`

### Compliance Checklist (Before PR)
- [ ] No business logic in `app/api/` routes
- [ ] No direct Supabase calls outside `src/db/`
- [ ] All slice types in `types.ts`
- [ ] Slice UI in `src/{slice}/components/`

---

## Testing

Expect fast failures (<2 seconds). Fail fast, get error codes, iterate by fixing errors and adding regression tests.

Pre-commit hook (`.husky/pre-commit`) runs `npm test` automatically.

### Test File Organization
| Pattern | Runner | Location |
|---------|--------|----------|
| `*.test.ts` | Vitest | `tests/unit/` |
| `*.integration.test.ts` | Vitest | `tests/integration/` |
| `*.spec.ts` | Playwright | `tests/e2e/` |

### Database Layer (`src/db/`)
All database access via `*Repo.ts` files. Direct Supabase imports outside `src/db/` will fail architecture tests.

---

## Documentation

- **Living docs** - Update existing files, don't create new
- **One source** - Specs in `docs/slices/SLICE_*.md`
- **Status headers** - Every doc needs `Status:` and `Updated:`

---

## Proactive Cleanup (After Major Tasks)

Report unused items:
- Unused scripts (not in pipeline flow)
- Orphan data folders
- Test artifacts (`*-test/`, `*.backup*`, `test-*.py`)
- Old logs (>7 days)


