---
paths:
  - "src/**"
  - "app/**"
  - "Plans/**"
  - "supabase/**"
  - "components/**"
---
# Before calling work done
- Code: run `/code-review`. Add a security review for RLS, auth, payments or permissions (`/security-review` fails here: run it through a subagent on `<start>..HEAD`).
- Commit what you wrote in the same turn. Ship only with `node scripts/ship.mjs`.
- Something he uses every day: walk his everyday tasks at phone and PC size before saying done.
- Finished plan: delete it and put 1-3 lines in the matching area doc (see `.claude/rules/plans.md`).
- Then delete the branches `git branch --merged HEAD` lists (except `main` and your own) with `-d`, never `-D`; then `git worktree prune`.
- More: `docs/tech.md`.
