---
name: review-until-clean
description: This skill should be used when the user asks to review something "until nothing is found", "until it converges", "until a new agent finds nothing", "keep going until clean", "round after round", or asks for successive/repeated critical review of a plan, design, spec or diff. Runs adversarial review ROUNDS in succession and only stops when a fresh reviewer finds nothing significant. Use it whenever the user's stopping condition is a RESULT ("until nothing new") rather than a count ("review it once").
---

# Review until clean

Adversarial review in successive rounds, with a **result-based stopping condition**.
The user does not want *a* review. They want the last round to be boring.

## Arguments

- **Target**: `$ARGUMENTS[0]` — file path, or "the current diff", or "the branch".
- **Lenses**: `$ARGUMENTS[1]` — optional, comma-separated focus areas. If omitted,
  choose them from the target (for a migration plan: security/data-loss,
  execution-order/operability, cost/scope; for a diff: correctness, tests, altitude).

## Why this skill exists

On 2026-09-26 the owner asked for a critical pass "and then have another agent do
the same thing". One agent ran, its findings were folded in, and the work stopped.
The owner's actual condition was convergence, and his words for it afterwards were:
*"you didnt do what i said. I asked you to keep going, until a new agent didnt find
anything to append."*

**The lesson is not "run more agents". It is that "review it" and "review it until
it is clean" are different instructions, and the second one has no natural end, so
it must be written down as a loop or it will be performed as a task.**

What made the loop worth it, that round: round 1 (mine) found 7 things and got its
own headline number wrong; round 2 (an agent) caught that error — "12 of 26 repo
files have a real-database test" was actually **0 of 26**; round 3 (a peer) caught a
recommendation of mine being unworkable. **Every round found something the previous
round missed, and two of three found an error introduced by the previous round.**
Three rounds in, it had not converged. That is the whole argument.

## The loop

1. **Read the target in full yourself first.** Not a grep, not a summary. You cannot
   judge a reviewer's finding against a document you have not read.
2. **Spawn the round.** 1–3 fresh agents, each with a different lens, in parallel
   within a round. Sequential *between* rounds, because round N+1 must be told what
   round N found.
3. **Every prompt carries the full "already found" list.** Paste the actual findings
   from all previous rounds, not a pointer to them. A reviewer that cannot see the
   previous findings will re-report them, and re-reported findings look like
   convergence when they are noise. This list grows every round; do not trim it.
4. **Verify each finding yourself before folding it in.** Reviewers over-refute, and
   a wrong finding in an amended plan is worse than no finding. Run the command, read
   the file:line. State in the amendment that you verified it.
5. **Amend the target.** Number the revision. Say what changed and why, including
   anything the round proved *you* got wrong in an earlier round — that is the most
   valuable line in the document.
6. **Repeat from 2** with the grown list.
7. **Stop when a whole round returns nothing significant** — nothing that would
   change what gets built. "Significant" is the user's bar, not the reviewer's: a
   typo is not a finding, a wrong number a decision rests on is.

## Stopping, honestly

- **Stop on convergence**, and say how many rounds it took and what the last round
  looked at to reach "nothing". A clean round with no stated enumeration is not
  evidence of anything.
- **Hard ceiling of 6 rounds.** If it has not converged by then, stop and say so
  plainly: a target still producing findings in round 6 has a structural problem
  that more review will not fix, and the user needs to know that rather than get
  round 7.
- **Never claim convergence you did not observe.** If the user interrupts, or a
  round fails, say which round you reached.
- **Report per round**: what it found, what you verified, what you rejected and why.
  The count of rounds and the *trend* in findings per round is the answer to "is this
  done" — three, then five, then one, then zero is convergence; three, then five,
  then four is not.

## Project constraints (daygame-coach)

- This checkout is shared with other Claude sessions. Reviewers are **read-only**:
  say so in every prompt — no edits, no `git add`, no stash, no commits, no
  `npm run test:integration` (containers may be in use), no dev server.
- Fan-out limits apply; prefer 2 agents per round over 5. See the owner's note on
  workflow session limits.
- Only the orchestrator writes. Commit with `git commit --only <paths>`.
