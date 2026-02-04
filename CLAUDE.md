# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changelog
- 04-02-2026 - Added gamification tables to system-only list (milestones, user_tracking_stats, scenarios)
- 04-02-2026 - Added Security Rules section (threat modeling, system-only tables, RLS checklist)
- 04-02-2026 - Added Stop hook to auto-trigger code review (`.claude/hooks/check-code-review.sh`)
- 03-02-2026 - Added idempotent seed scripts rule
- 03-02-2026 - Fixed code-review subagent to use general-purpose (code-review type doesn't exist)

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
| 6 | Am I touching auth, RLS, payments, or permissions? | Follow Security Rules below |

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

### 6. Idempotent Seed Scripts

Seed scripts must be **idempotent**: delete orphans first, then upsert. Running twice = same result.

### 7. Security Rules (CRITICAL for Auth/RLS/Payments)

**When touching:** authentication, RLS policies, payments, permissions, or any table in the "system-only" list below.

#### Threat Modeling Required

Before writing any security-sensitive code, answer these questions:

```
1. TRUST MODEL: Who should be able to perform this action?
   - Only the system/service role?
   - Only the owning user?
   - Any authenticated user?

2. ABUSE CASE: What's the worst a malicious user could do with this capability?
   - Can they grant themselves privileges?
   - Can they access other users' data?
   - Can they create fake records?

3. HEDGE CHECK: Am I adding "just in case" code?
   - If I wrote "if users need to..." → STOP. Ask the user instead.
   - Never add dangerous capabilities speculatively.

4. GAMIFICATION CHECK: Does this table store earned/computed data?
   - Achievements, milestones, badges → System-only
   - Aggregate stats (totals, streaks) → System-only
   - XP, levels, scores → System-only
   - If users could write directly, could they cheat?
```

#### System-Only Tables (NEVER User-Writable)

These tables should ONLY be modified by service role (webhooks, admin scripts, triggers):

| Table | Why System-Only | Allowed User Operations |
|-------|-----------------|------------------------|
| `purchases` | Financial records from Stripe | SELECT only |
| `embeddings` | RAG training data | SELECT only |
| `values` | Reference data | SELECT only |
| `milestones` | Earned achievements - abuse = fake badges | SELECT only |
| `user_tracking_stats` | Computed aggregates - abuse = inflated stats | SELECT only |
| `scenarios` | Contains xp_earned - abuse = XP farming | SELECT only |
| System templates (`is_system=true`) | Curated content | SELECT only |

**Key Principle:** If a table contains data that is *earned* or *computed* from user actions (not directly entered by users), it's system-only.

**If you're tempted to add INSERT/UPDATE/DELETE policies for these tables → STOP and ask the user.**

#### RLS Policy Checklist

When writing RLS policies, verify:

- [ ] Each table classified: user-writable vs system-only
- [ ] No INSERT policy on system-only tables
- [ ] UPDATE policies have both USING and WITH CHECK (prevents user_id mutation)
- [ ] Shared tables use `auth.uid() IS NOT NULL` not `auth.role() = 'authenticated'`
- [ ] Reserved SQL words (like `values`) are quoted
- [ ] Test plan includes: anon blocked, wrong user_id blocked, mutation blocked

#### Anti-Pattern: Speculative Permissions

```
BAD (what caused the purchases bug):
-- Purchases are typically created by Stripe webhooks
-- If users need to create purchases directly:  ← SPECULATIVE HEDGE
CREATE POLICY "purchases_insert_own" ...

GOOD:
-- Purchases created ONLY by Stripe webhooks via service role
-- NO user INSERT policy - this is intentional
CREATE POLICY "purchases_select_own" ...  -- SELECT only
```

**Rule:** If you're uncertain whether users need a capability, ASK. Don't add dangerous policies "just in case."

---

### 8. Code Review Subagent (AUTOMATED via Stop Hook)

**This is now enforced automatically.** A Stop hook (`.claude/hooks/check-code-review.sh`) blocks your response when:
- 3+ non-doc files are modified
- At least one is a code file (`.ts`, `.tsx`, `.js`, `.jsx`)

**When triggered:** The hook injects a blocking message telling you to run the code-review subagent. You MUST run it before responding.

**How to invoke:** Use the Task tool with:
```
subagent_type: "general-purpose"
prompt: "Code review for recent changes. 1) Read docs/testing_behavior.md. 2) Run git diff to find changed files. 3) For each changed file: identify new exports, functions, components, types, and config. 4) Check tests/unit/ and tests/e2e/ for corresponding test coverage. 5) Run npm test to verify existing tests pass. 6) Report: what's tested, what's NOT tested (be specific: function names, edge cases, integration points), code quality notes. Do NOT implement tests - only identify gaps."
```

**What it identifies:**
- New exports/functions without unit tests
- New components without E2E coverage
- Untested edge cases (null handling, boundary values)
- Missing integration points (API payloads, state persistence)
- Code quality issues (magic numbers, missing validation)

**Hook behavior:**
- Blocks once per user message (uses marker file to avoid infinite loop)
- Marker cleared on next user prompt (UserPromptSubmit hook)
- Hook files: `.claude/hooks/check-code-review.sh`, `.claude/hooks/clear-code-review-marker.sh`

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


