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
- Commit what you wrote in the same turn and ship it (`docs/tech.md` section 1).
- Something he uses every day: walk his everyday tasks at phone and PC size before saying done.
- Then delete only the branches and worktrees you made, once their commits are on main (`git branch -d`, never `-D`; then `git worktree prune`).
