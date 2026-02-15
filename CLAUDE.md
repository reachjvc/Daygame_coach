# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

If you enter planmode and give user a summary, keep it conscise. Sacrifice grammar for conscisiveness.


## ⛔ PRE-RESPONSE CHECKLIST (Complete Before Every Summary)

**STOP. Before summarizing to user, verify:**

| # | Check | If Yes |
|---|-------|--------|
| 1 | Did I write/modify code? | Run `npm test` first |
| 2 | Did tests fail? | Report ALL failures, check `.test-known-failures.json` (Rule 10) |
| 3 | Am I touching auth, RLS, payments, or permissions? | Follow Security Rules below |
| 4 | Did I run a pipeline stage? | Set status to PENDING, NEVER auto-PASS (Rule 9) |
| 5 | Warn user EVERY TIME if there's security risks. Do not make changes with high risk without verifying that this is correct |

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

### 12. Plan Implementation Completeness (NEVER Skip Plan Items)

**CRITICAL: When implementing from a plan doc, every single item must be tracked and delivered.**

**Before writing any code:**
1. Read the plan doc line by line
2. Create a TaskList with one task per deliverable (every route, component, function, milestone, etc.)
3. Do NOT start coding until the full TaskList exists

**During implementation:**
- Mark each task in_progress before starting, completed only after code + test
- If a subagent/team is used, each agent must reference the TaskList and only mark tasks they fully completed
- Never summarize "done" with open tasks remaining

**After implementation (mandatory audit — CANNOT be skipped):**

"Files exist + tests pass" is NOT verification. That catches regressions, not missing features.

1. Re-read the plan doc line by line
2. For EVERY acceptance test step: trace the code path and confirm it works
   - "Side-by-side mode on desktop" → grep for it, read the component, confirm it renders
   - "Toast shows X" → find the toast call in the code
   - "Clicking X does Y" → find the onClick handler, confirm it calls Y
3. For EVERY deliverable list item: `Read` the actual file and confirm the feature exists in the code (not just that the file exists)
4. Report any gaps to the user BEFORE saying "done"
5. If anything is missing, list it explicitly — never say "mostly complete"

**Agent team builds have extra failure modes:**
- Agents self-report "done" without building everything → Lead MUST verify by reading code, not trusting reports
- Lead checks file existence via Glob → proves nothing about contents. Use `Read` + `Grep` to verify features
- "827 tests pass" → means old tests pass, says nothing about new functionality. Check if new unit tests were added for new pure functions (services, helpers)
- Plan says "X feature" but no agent was explicitly told to build it → it won't exist. Cross-reference every plan item against what was in each agent's prompt

**Applies to:** All plan docs in `docs/plans/`, all multi-phase features, all agent team work.

### 13. Plan Writing for Agent Execution (CRITICAL for /build-with-agent-team)

**Plans are agent instructions, not product specs.** A plan that reads well to a human PM will fail when given to Claude agents. Every plan in `docs/plans/` must follow these rules:

#### Milestones = working app states, not architecture layers

```
WRONG (organized by layer):
  Phase 1: Data model (types, repo, migrations)
  Phase 2: API routes
  Phase 3: UI components
  → Agent builds all backend, half-builds UI, declares victory

RIGHT (organized by user capability):
  Milestone 1: "User can create a goal with life area"
  Milestone 2: "User can see goal hierarchy tree"
  Milestone 3: "GoalsTab becomes portal to hub"
  → Each milestone is a testable, working app state
```

#### Every deliverable needs an acceptance test

```
WRONG:
  - GoalsHubPage: Header with "New Goal" button and view switcher

RIGHT:
  - GoalsHubPage: "New Goal" button opens GoalFormModal, user fills form,
    submits, goal appears in list.
    VERIFY: click New Goal → fill form → submit → goal visible in list
```

#### Destructive changes must be flagged and gated

Any item that removes or rewrites existing working functionality:

```
DESTRUCTIVE: Rewrites GoalsTab — removes existing goal creation UI
DEPENDS ON: Milestone 1 verified (GoalsHubPage goal creation works)
SAFE BECAUSE: Goal creation moved to GoalsHubPage
DO NOT START until dependency is confirmed working
```

**Rule: Never remove working functionality until its replacement is verified working.**

#### Agent team coordination

When a plan targets `/build-with-agent-team`:
- Specify which files each agent owns (no two agents edit the same file)
- Mark ordering constraints explicitly ("Agent B must not start until Agent A's milestone is verified")
- Flag shared dependencies ("both agents need life_areas table — Agent A creates migration, Agent B waits")

#### Plan template

Every plan should use this structure per milestone:

```
MILESTONE N: "[User-facing capability in plain English]"
  DEPENDS ON: Milestone X verified
  DESTRUCTIVE: yes/no (if yes, explain what gets removed and why it's safe)
  FILES TO CREATE: [list]
  FILES TO MODIFY: [list]
  FILES TO NOT TOUCH: [list — prevents premature refactoring]
  ACCEPTANCE TEST: [exact click path or API call to verify]
  DONE WHEN: [concrete observable outcome]
```

### 14. Use Project Styling for ALL UI Elements (NEVER Browser Defaults)

**CRITICAL: Never use browser-default controls. Always use project-styled components.**

- `<input type="number">` spinners are hidden globally — use custom increment buttons or the `Set` pattern
- All inputs, buttons, and form controls must use `components/ui/*` (Button, Input, etc.)
- Colors must use CSS variables (`--primary`, `--border`, `--card`, etc.) or Tailwind theme classes — never hardcoded colors that don't match the theme
- When adding any new interactive element, visually verify it matches the dark theme (charcoal bg, slate cards, orange accent)
- If a native HTML element has visible browser-default styling (scrollbars, spinners, checkboxes, selects), override it in `globals.css` or use a styled component

**Test:** Does this element look like it belongs in the app? If it looks like raw browser chrome, fix it.

### 15. Match Existing UI Patterns (NEVER Invent New Styles)

**Before creating ANY new UI element, grep for how similar elements are already built in the codebase.**

```
WRONG:
1. Need a collapsible section
2. Design it from scratch with custom styling
3. Ship something that looks different from the rest of the page

RIGHT:
1. Need a collapsible section
2. Grep: "collapsed|ChevronDown|accordion" in src/
3. Find GoalCategorySection uses chevron + uppercase label + count + divider line
4. Copy that exact pattern
```

- Collapsible sections, cards, list items, badges, form layouts — all have existing patterns
- Match the **nearest sibling** component's style (same page > same slice > other slices)
- If no existing pattern fits, flag it to the user before inventing a new one

### 16. Icon Reuse Governance (NEVER Reuse Without Approval)

**CRITICAL: Claude must NEVER use an icon in a new context without checking and getting user approval.**

Before using any lucide-react icon in a component:
1. Grep for where that icon is already imported
2. If it's already used in another file:
   - Check `src/shared/iconRoles.ts` — if it's a `UTILITY_ICON`, proceed freely
   - If it's a `SEMANTIC_ICON_ROLES` entry, verify your usage fits an existing approved role
   - If it's NOT registered or your context is a new role → **ASK the user** before proceeding
3. **Never add an icon to the semantic registry or expand its roles without explicit user approval**
4. The architecture test enforces this — icons appearing in 2+ files that aren't in the registry will fail tests

See: `src/shared/iconRoles.ts` for the full registry.

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

## Documentation

- **Living docs** - Update existing files, don't create new
- **One source** - Specs in `docs/slices/SLICE_*.md`

## Proactive Cleanup (After Major Tasks)

Report unused items:
- Unused scripts (not in pipeline flow)
- Orphan data folders
- Test artifacts (`*-test/`, `*.backup*`, `test-*.py`)
- Old logs (>7 days)


