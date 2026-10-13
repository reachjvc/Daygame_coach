---
paths:
  - "src/**"
  - "app/**"
  - "docs/plans/**"
  - "supabase/**"
  - "components/**"
---

# Before calling work done

- Code: run `/code-review`; add `/security-review` for RLS, auth, payments or permissions.
- Finished plan: delete branches that `git branch --merged HEAD` lists (except `main` and your own) with `-d`, never `-D`; then `git worktree prune`.
