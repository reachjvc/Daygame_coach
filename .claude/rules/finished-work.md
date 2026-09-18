---
paths:
  - "src/**"
  - "app/**"
  - "docs/plans/**"
  - "supabase/**"
  - "components/**"
---

# The attack pass: what to check

Rule 2 in `CLAUDE.md` says to attack your own work before showing it. This is
the checklist, drawn from defects that actually shipped **here**, not from a
generic list.

- **Whose clock?** Any date or time taken from the server instead of the user —
  `current_date`, `new Date()`, `toISOString().split("T")[0]`. Three separate
  bugs so far.
- **Two facts that must agree, stored apart.** A count and its period. Text and
  its date. A value and a cached copy. If nothing forces them to be read
  together, they will disagree.
- **What can be written that shouldn't be.** Missing upper bound, missing NOT
  NULL, a nullable that means two different things: "cleared" versus "never set".
- **Who else can write this?** The service-role key bypasses RLS entirely, so
  every guarantee is advisory for backend code.
- **Does it build the thing that was agreed?** Re-read the requirement and check
  the design against it line by line.
- **Does this name already mean something else here?** Check before minting it.
- **What did I claim was impossible?** Actually unrepresentable, or merely
  unlikely? Say which.

**How to run it.** For a design or schema, the failure list is written before the
design is presented and appears in the same message. For code, run `/code-review`,
plus `security-review` for anything touching RLS, auth, payments or permissions.
Hand-rolling one pass is not a review. For a plan, see `plans.md`.

- **Does it match the owner's concept?** When `docs/product/<slice>-concept.md`
  exists, grade every numbered item before showing the design (`plans.md`). The
  reviews that miss this are the ones the owner ends up running by hand.
