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

**Check the plan against the owner's concept before asking for approval.** When
`docs/product/<slice>-concept.md` exists, the plan carries a section
`## Your concept, item by item`: one table row per numbered item, verdict `Yes`,
`Partly`, `No` or `Behaviour` (the data design does not answer it; the structure
must only hold the result), and where it lives or what is missing.
`tests/unit/docs/planConceptCheck.test.ts` fails when a `docs/plans/<slice>-*.md`
plan skips or invents an item. The attack pass runs against the concept file as a
third lens beside the code and the engineering principles; a design is converged
only when all three produce no change. Why: the Life Mastery deployment plan went
through 13 review agents and still changed on the owner's first question, because
the owner's concept had never been written down, so no review could check it. The
owner ended up running that review by hand, one question at a time.

**The owner approves rules and costs, never counts.** State the three to five
design rules the plan follows, in plain language, each with what it costs if it is
wrong. Approval is of those. A table count, file count or phase count is an output
and is never put to the owner as a decision. A later change that leaves the rules
intact gets one line in the reply, no re-approval; one that changes a rule gets one
question.

**When the owner challenges a claim, check first and answer second.** Run the code
or data check before replying, and lead with what it found. A claim that cannot be
checked is answered as belief and marked as such. Never defend a design from the
plan's own text. Why: "nothing points at the north star" was defended from the plan
text and found false in the code one question later; the defence cost a round and
trust.
