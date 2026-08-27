---
paths:
  - "src/**"
  - "app/**"
  - "docs/plans/**"
  - "supabase/**"
  - "components/**"
---

# Finished work

**Nothing is presented as done, settled, ready or working until a second pass
has attacked it, and the output of that pass is handed over with the work.**

## The failure this exists to prevent

A schema for one text field was designed, explained clearly, and called
"settled". One question later — *"find faults with it as a professional"* —
produced seven real defects in ten minutes, including a timezone bug identical
to one fixed in the same codebase that morning. No new information arrived in
between. The only variable was being asked to attack it.

Writing and attacking are different jobs. Writing optimises for a coherent
explanation, and a confident explanation is exactly what hides a gap. The
attack pass has to be a separate, deliberate act, and it must happen **before**
the work is shown — otherwise the user is the one running it.

## The rule

1. **Write it.**
2. **Attack it** — as someone paid to find what is wrong with it.
3. **Show both**, together. The failure list ships with the work.

For a **design or schema**, the failure list is written before the design is
presented, and appears in the same message.

For **code**, run the adversarial pass before handing it over: `/code-review`,
and `security-review` for anything touching RLS, auth, payments or permissions.
Hand-rolling one pass is not a review.

For a **plan**, see `plans.md`: blockers attempted at least once, open questions
each with a recommendation.

## What the attack pass must check

Drawn from defects that actually shipped here, not from a generic list:

- **Whose clock?** Any date or time from the server instead of the user —
  `current_date`, `new Date()`, `toISOString().split("T")[0]`. This class has
  now caused three separate bugs.
- **Two facts that must agree, stored apart.** A count and its period. Text and
  its date. A value and a cached copy of it. If nothing forces them to be read
  together, they will disagree.
- **What can be written that shouldn't be.** Missing upper bound, missing NOT
  NULL, a nullable that means two different things ("cleared" versus "never
  set").
- **Who else can write this?** The service-role key bypasses RLS entirely, so
  every guarantee is advisory for backend code.
- **Does it build the thing that was agreed?** Re-read the requirement and
  check the design against it line by line. A design that cannot build an
  approved feature is not a design.
- **Does this name already mean something else here?** Check before minting it.
- **What did I claim was impossible?** Is it actually unrepresentable, or merely
  unlikely? Say which.

## Words that require the second pass to have run

"Settled", "done", "works", "ready", "complete", "verified", "fixed".

Settled means *the failure modes were enumerated by someone trying to break it*.
It does not mean nobody objected in conversation.

## Report verified separately from assumed

Say which claims were checked and how, and which are inference. "The tests pass"
and "I read the page in a browser" are different evidence from "the route exists,
so the feature works" — the last one is a proxy, and
`.claude/rules/generated-data.md` exists because of it.
