---
paths:
  - "Plans/**"
---
# Writing plans
- A plan for a big job lives in `Plans/<name>.md` only while the job runs. When it is done, delete it and put 1-3 lines in the matching area doc (for example `docs/tech.md`). A parked or replaced plan is deleted too; `Plans/ARCHIVE.md` names the commit to read it.
- Small job, short plan. Plain words first (what changes, why, what he will see); file paths underneath.
- Say whose a pick or limit is: Claude's own picks read as Claude's, never as facts.
- Be critical of your own plan: what it costs, what can be cut, what simpler way exists.
- Phases are working app states, each with its acceptance test and model (big model plans and reviews; Sonnet builds; Haiku only for mechanical checks).
- Try each blocker once for real (read-only probes, dry runs) and write what came back. Flag destructive steps. Say what is checked and what is from memory.
- Open questions: one line each, with a recommendation and the cost if wrong. Mark anything that costs money.
- Keep the status line at the top current.
