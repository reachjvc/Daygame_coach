---
paths:
  - "Plans/**"
---

# Writing plans

- Plans live in `Plans/<name>.md`. Size the plan to the task: a small job gets a short plan.
- Plain-language part first (what changes, why, what the owner will see); file paths and line numbers underneath.
- Phases are working app states ("M1: user can create a goal"), not layers. Each names its acceptance test and the model that runs it (big model plans and reviews; Sonnet or Haiku builds).
- List blockers and try each one once for real (read-only probes, dry runs); write what came back. Flag destructive steps.
- Open questions each carry a recommendation and the cost if it is wrong.
- Keep the status line at the top current. When a plan is finished, replaced or parked, add it to `Plans/ARCHIVE.md` and delete it.
