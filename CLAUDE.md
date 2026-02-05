# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## ⛔ PRE-RESPONSE CHECKLIST (Complete Before Every Summary)

**STOP. Before summarizing to user, verify:**

| # | Check | If Yes |
|---|-------|--------|
| 1 | Did I write/modify code? | Run `npm test` first |
| 2 | Did tests fail? | Report ALL failures, check `.test-known-failures.json` (Rule 10) |
| 3 | Did I make major code changes? | Run `code-review` subagent (see below) |
| 4 | Am I touching auth, RLS, payments, or permissions? | Follow Security Rules below |
| 5 | Did I run a pipeline stage? | Set status to PENDING, NEVER auto-PASS (Rule 9) |
| 6 | Warn user EVERY TIME if there's security risks. Do not make changes with high risk without verifying that this is correct |

if in doubt, ask user if documents should be updated or not.

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

### 2. Test-Driven Workflow

- **Before writing tests**: Read `docs/testing_behavior.md`
- **Between every step**: Run `npm test`
- **If test fails**: Fix production code, add regression test
- **Never proceed** with failing tests

### 4. No Fallback Mechanisms

Scripts must fail explicitly - no silent fallbacks. Fix the issue or ask the user.

### 5. Quality Over Speed

20 extra hours for better architecture is worth it.

### 7. Security Rules (CRITICAL for Auth/RLS/Payments)

**When touching:** authentication, RLS policies, payments, permissions, or any table in the "system-only" list below.

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

**Rule:** If you're uncertain whether users need a capability, ASK. Don't add dangerous policies "just in case."

---

### 8. Code Review Subagent (AUTOMATED via Stop Hook)

After any medium or major code changes, invoke the code review subagent, BEFORE returning to user

**How to invoke:** Use the Task tool with:
```
subagent_type: "general-purpose"
prompt: "Code review for recent changes. 1) Read docs/testing_behavior.md. 2) Run git diff to find changed files. 3) For each changed file: identify new exports, functions, components, types, and config. 4) Check tests/unit/ and tests/e2e/ for corresponding test coverage. 5) Run npm test to verify existing tests pass. 6) Report: what's tested, what's NOT tested (be specific: function names, edge cases, integration points), code quality notes. Do NOT implement tests - only identify gaps."
```

### 9. Pipeline Stage Verification (NEVER Auto-Pass)

**CRITICAL: Claude must NEVER mark a pipeline stage as PASS without explicit user approval.**

When running pipeline stages (`scripts/training-data/*`):

1. **Run the stage** - Execute the script, report results
2. **Update doc with PENDING** - Set status to "PENDING VERIFICATION" or "RUN COMPLETE"
3. **Report to user** - Show summary of what was processed
4. **WAIT for user verification** - Only the user can change status to PASS.

**Applies to ALL stages in `docs/pipeline/stages/STAGE_*.md`**

### 10. Test Failure Reporting 

**CRITICAL: Claude must NEVER dismiss test failures as "pre-existing" without verification.**

### 11. Risky Code Changes (NEVER Remove Without Investigation)

**CRITICAL: Never delete or remove code without understanding WHY it exists.**

When fixing errors (type errors, lint errors, build failures):

**WRONG approach (what caused the maxTokens bug):**
```
1. See error: "maxTokens does not exist on type"
2. Remove the line  ← DANGEROUS
3. Build passes  ← False confidence
4. Ship broken code that silently loses functionality
```
if unsure, verify with the user.

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

## Documentation

- **Living docs** - Update existing files, don't create new
- **One source** - Specs in `docs/slices/SLICE_*.md`

## Proactive Cleanup (After Major Tasks)

Report unused items:
- Unused scripts (not in pipeline flow)
- Orphan data folders
- Test artifacts (`*-test/`, `*.backup*`, `test-*.py`)
- Old logs (>7 days)


