# Planning Style Guide
**Updated:** 2026-01-28

This document defines how Claude should structure implementation plans for this project.

---

## Plan Structure

### Phases
- Each plan should have **3-7 phases**
- Each phase represents a logical milestone
- Phases should be completable in 1-3 focused sessions

### Steps Within Phases
- **5-10 steps per phase** (not 50 micro-steps)
- Each step is a "done when" statement
- Steps should be actionable without further breakdown
- Expand into sub-steps only when actively working on that step

### Step Format
```markdown
### Phase N: [Name]
**Goal:** [One sentence describing the outcome]

- [ ] Step 1: [Action] → Done when [condition]
- [ ] Step 2: [Action] → Done when [condition]
```

### Completed Step Format
```markdown
- [x] Step 1: [Action] → Done when [condition]
  **Completed:** 2026-01-28
  **Decision:** [Any decision made during implementation]
  **Artifacts:** [Files created/modified]
```

---

## Plan Types

### Active Plan
- Lives in `docs/plans/PLAN_[FEATURE]_ACTIVE.md`
- Contains only what we're building NOW
- Updated in real-time as work progresses
- Maximum ~200 lines

### Backlog
- Lives in `docs/plans/PLAN_[FEATURE]_BACKLOG.md`
- Parking lot for good ideas not being implemented now
- Each idea has: description, why it's good, when to revisit
- Not a full plan—just enough context to revive later

---

## What NOT to Do

- Don't create 50-step micro-plans
- Don't mix active work with future ideas in one document
- Don't write plans without "done when" conditions
- Don't leave completed steps unmarked
- Don't create new plan files when updating existing ones

---

## Automatic Behaviors

After completing any phase or significant work:
1. Mark steps complete with timestamps
2. Update the relevant log (`docs/log/`)
3. Note any deviations from original plan
4. Move completed phases to "Completed" section (don't delete)

---

## Example Structure

```markdown
# Feature X Active Plan
**Status:** 🟢 ACTIVE
**Updated:** 2026-01-28

## Current State
[2-3 sentences on where we are]

## Phase 1: [Name]
**Goal:** [Outcome]
- [ ] Step 1...
- [ ] Step 2...

## Phase 2: [Name]
**Goal:** [Outcome]
- [ ] Step 1...

---
## Completed

### Phase 0: Planning
**Completed:** 2026-01-28
- [x] Define requirements
- [x] Create plan document
```
