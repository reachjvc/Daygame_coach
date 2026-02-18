# CLAUDE.md
If you enter planmode and give user a summary, keep it conscise. Sacrifice grammar for conscisiveness.


## ⛔ PRE-RESPONSE CHECKLIST (Complete Before Every Summary)

**STOP. Before summarizing to user, verify:**

| # | Check | If Yes |
|---|-------|--------|
| 1 | Did I write/modify code? | Run `npm test` first |
| 2 | Did tests fail? | Report ALL failures, check `.test-known-failures.json`|
| 3 | Am I touching auth, RLS, payments, or permissions? | Follow Security Rules below |
| 4 | Warn user EVERY TIME if there's security risks. Do not make changes with high risk without verifying that this is correct |

if in doubt, ask user if documents should be updated or not.

## Critical Rules

### 1. Working on the pipeline
Any work on the pipeline requires thorough understanding of all the steps. User will commonly ask about how the pipeline stages work in relation to eachother, but claude has multiple times made the mistake of not thoroughly enough understanding what is actually happening, by not looking at data (and instead looking at a visualization or .md file explaining current state) or by not actually figuring out what a script or stage does, and by instead assuming it works as intended or as it says in the top lines.

When answering questions or working on improving the pipeline it is paramount that you make sure your recommendation and communication is grounded in the current facts of the data or what the script does, and that these are thoroughly investigated each and every time, instead of relying on summaries or assumptions etc.


### 2. Test-Driven Workflow

- **Before writing tests**: Read `docs/testing_behavior.md`
- **Between every step**: Run `npm test`
- **If test fails**: Fix production code, add regression test
- **Never proceed** with failing tests

### Test File Organization
| Pattern | Runner | Location |
|---------|--------|----------|
| `*.test.ts` | Vitest | `tests/unit/` |
| `*.integration.test.ts` | Vitest | `tests/integration/` |
| `*.spec.ts` | Playwright | `tests/e2e/` |

### Database Layer (`src/db/`)
All database access via `*Repo.ts` files. Direct Supabase imports outside `src/db/` will fail architecture tests.


### 3. No Fallback Mechanisms Scripts must fail explicitly - no silent fallbacks. Fix the issue or ask the user.

### 4. Quality Over Speed 20 extra hours for better architecture is worth it.

### 5. Security Rules (CRITICAL for Auth/RLS/Payments)

**When touching:** authentication, RLS policies, payments, permissions, or if a table contains data that is *earned* or *computed* from user actions (not directly entered by users), it's system-only.

**If you're tempted to add INSERT/UPDATE/DELETE policies for these→ STOP and ask the user.**

**Rule:** If you're uncertain whether users need a capability, ASK. Don't add dangerous policies "just in case."

### 6. Risky Code Changes (NEVER Remove Without Investigation)

**CRITICAL: Never delete or remove code without understanding WHY it exists.**

### 7. Agent team builds have extra failure modes:**
- Agents self-report "done" without building everything → Lead MUST verify by reading code, not trusting reports
- Plan says "X feature" but no agent was explicitly told to build it → it won't exist. Cross-reference every plan item against what was in each agent's prompt

### 8. Plan Writing 

**Plans are agent instructions, not product specs.** A plan that reads well to a human PM will fail when given to Claude agents. Every plan in `docs/plans/` must follow these rules:

RIGHT (organized by user capability):
  Milestone 1: "User can create a goal with life area"
  Milestone 2: "User can see goal hierarchy tree"
  Milestone 3: "GoalsTab becomes portal to hub"
  → Each milestone is a testable, working app state
```

#### Every deliverable needs an acceptance test

#### Destructive changes must be flagged and gated

#### Agent team coordination

When a plan targets `/build-with-agent-team`:
- Specify which files each agent owns (no two agents edit the same file)
- Mark ordering constraints explicitly ("Agent B must not start until Agent A's milestone is verified")
- Flag shared dependencies ("both agents need life_areas table — Agent A creates migration, Agent B waits")

### 9. Use Project Styling for ALL UI Elements 

Before choosing defaults, see if the projects already uses UI elements elsewhere, that are appropriate for the project. Use these, or atleast inform the user.

### 10. Icon Reuse Governance (NEVER Reuse Without Approval)

**CRITICAL: Claude must NEVER use an existing icon in a new context without checking and getting user approval.**

See: `src/shared/iconRoles.ts` for the full registry.

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

### 11. Doc-Before-Summary 

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