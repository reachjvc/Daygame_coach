---
paths:
  - "docs/plans/**"
---

# Writing plans

- Plain-language section first (what changes, why, what the owner will see); file paths and line numbers underneath.
- Milestones are working app states ("M1: user can create a goal"), not layers.
- Each deliverable names its acceptance test. Flag destructive steps.
- When `docs/product/<slice>-concept.md` exists, include `## Your concept, item by item` with a verdict per item (`tests/unit/docs/planConceptCheck.test.ts` enforces it).
- Put the few design rules up for approval, each with its cost if wrong — not counts.
- Once approved, execute end to end. Mark done with `**Status:** done <date>`.
