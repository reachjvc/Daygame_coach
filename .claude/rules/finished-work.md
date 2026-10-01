---
paths:
  - "src/**"
  - "app/**"
  - "docs/plans/**"
  - "supabase/**"
  - "components/**"
---

# The attack pass

The checklist itself lives in **`docs/known-failures.md`** — one copy, read it
there. It is every failure this project actually had, written as questions to
answer before saying done. Two copies of a checklist drift, and the drifted one
is the one somebody reads.

**How to run it.** For a design or schema, the failure list is written before the
design is presented and appears in the same message. For code, run
`/code-review`, plus `security-review` for anything touching RLS, auth, payments
or permissions. Hand-rolling one pass is not a review. For a plan, see
`plans.md`.

# When a plan is done

Set its `**Status:**` to `done <date>`. Delete every branch
`git branch --merged HEAD` lists but `main` and your own, push that, then
`git worktree remove` and `git worktree prune`. `--merged main` trails the
trunk. Never `-D`; `-d` checks the upstream, which deleted `beta` 2026-10-01.

**Why a stand-in never feels like one.** The full account, with six worked
examples, is under "How this plan's author kept being wrong" in
`docs/plans/life-mastery-deployment.md`. The short version: a stand-in never
feels like a stand-in at the time. It feels like checking.
