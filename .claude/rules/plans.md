---
paths:
  - "docs/plans/**"
---

# Writing plans

**Human section first, AI section second.** The user decides whether to execute based on the plain-language part — what changes, why, what they'll see. File paths and line numbers go underneath, for execution. They shouldn't have to read the AI section to understand what's happening.

**Organize by user capability, not by layer.** Each milestone is a working, testable app state:

> M1: User can create a goal with a life area
> M2: User can see the goal hierarchy tree
> M3: GoalsTab becomes a portal to the hub

Not "add types" → "add API" → "add UI".

Every deliverable names its acceptance test. Destructive steps are flagged and gated explicitly.

**Agent-team plans** (`/build-with-agent-team`): name the files each agent owns — no two agents edit the same file. State ordering constraints ("B doesn't start until A's milestone is verified") and shared dependencies ("both need `life_areas`; A writes the migration, B waits"). Every plan item must appear verbatim in some agent's prompt or it will not get built. Agents also report "done" for work they didn't do — verify by reading the code, not the report.

Execute an approved plan end to end. No per-milestone approval checkpoints.
