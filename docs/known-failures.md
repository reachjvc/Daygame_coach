# Known failures — the end-of-turn check

**Read this before saying done, not before starting.** Every line went wrong here
at least once. Answer each question against the turn you are about to finish.

Loaded while editing code (`.claude/rules/finished-work.md`) and injected at the
end of any turn that changed a file (`.claude/hooks/known_failures.py`). Only copy.

## The project's stage — check this first

**No users. No payments. No AI in front of anyone.** There is no Stripe webhook,
and `has_purchased` is never written by any code, so nobody has ever bought
access. Most of what looks like a live security hole is prototype leftover.

- Did I price advice for a product that has users? *An AI spend cap was raised as
  an urgent hole on a product with none — a production lens on a prototype.*
- Does this matter now, or only after there are users? Say which.

## Claims

- Did I say what the product does without reading `docs/product/map.md`? Having
  code is not being reachable: `/test/*` 404s in production.
- Did I check the thing itself, or a stand-in? Filenames, handles, previews,
  docstrings, green test counts and dashboards are all stand-ins. *381
  testimonials shipped with wrong quotes; every check ran on structure.*
- Is this a field, or a behaviour? "There is somewhere to store it" is not "the
  product does it". *34 concept items were graded Yes on storage; the first one
  traced end to end was stored and never read.*
- Did I deep-check one row of a survey at random? Every row was reached the same
  way, so one falling means the method fell, not the row.
- Which claims did I verify, and which are inference? Separate sentences.

## Reasoning and advice

- Was I told something by someone outside, and did I argue instead of researching
  their case? *Eight turns defending Vercel and Supabase, wrong on every count;
  the objection was against self-hosting, which nobody proposed.*
- Was a claim of mine challenged? Run something, lead with what it found, never
  defend from my own text. *"Nothing points at the north star" was defended that
  way and was false in the code one question later.*
- Did I give an all-clear without checking the parts I cannot see? *A security
  verdict from RLS and auth alone, with no dependency audit.*
- If I am unsure a fix will work, that goes in the first line, not a closing caveat.

## Code

- Whose clock? `new Date()`, `current_date`, `toISOString().split("T")[0]` on the
  server instead of the user's timezone. Three separate bugs so far.
- Two facts that must agree, stored apart — a count and its period, text and its
  date, a value and a cached copy.
- What can be written that shouldn't? Missing bound, missing NOT NULL, a nullable
  meaning both "cleared" and "never set".
- A value that could not be computed is a **third state**, never zero. *59 places
  showed a plausible number when the computation had failed.*
- Did I write a file without reading it? `cat >` replaces silently. *A plan
  said "new file". It existed, and four lists used it.*
- Does this name already mean something else here?
- Did I claim something was impossible — unrepresentable, or merely unlikely?
- Who else can write this? The service-role key bypasses row-level security
  entirely, so every such guarantee is advisory for backend code.
- Is there a test that fails when the next caller forgets?
- Does it build the thing that was agreed? Re-read the requirement and check the
  design against it line by line.
- Does it match the owner's concept? Where `docs/product/<slice>-concept.md`
  exists, grade every numbered item before showing the design — those are the
  reviews the owner otherwise ends up running by hand. Whole-product: 
  `docs/product/vision.md`.

## Deferring, and asking

- **Am I asking the owner to wait for, decide, or supply something I could
  settle myself in five minutes?** "Out of scope", "a follow-up", "revisit
  later", "good enough for now" are one sentence, and none is an answer.
  *"Run a few days on 948 words" was offered for what one test answered in a
  minute.*
- Blocked on a missing account, timezone, device, fixture? **Create it.** A
  blocker never attempted once is a guess.
- When it genuinely cannot be done now, say the whole shape of it in the reply:
  what is wrong, what it takes, what it costs, what breaks if it is left.
- **Did I shorten an instruction file?** Diff it line by line for rules that
  vanished. *Compressing rule 3 deleted the clause above; the failure it
  prevented happened two messages later, and a check of eighteen remembered
  phrases passed because it probed for what I remembered.*

## What I am handing over

- Is the reply the whole answer, or does it send them to a plan, a doc or a diff?
- **Anything the owner is meant to run, I have run** — or I say plainly that I
  could not, and why. *A one-line command was handed over untested because it
  could not be run from here; it failed on the first paste, and nothing in the
  reply warned them it was a guess.*
- Plain language first, file paths second, every jargon term glossed once.
- Did I attack this before showing it, or only write it? "Done", "works",
  "ready", "fixed", "verified" all require the attack pass to have run.
- Blockers: only the always-ask set, numbered, each attempted at least once, each
  with a recommendation. None? Say "No blockers".
- Did I offer a quick version and a durable version as a choice? Build the
  durable one and say what it cost.
