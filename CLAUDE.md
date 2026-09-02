# daygame-coach

Next.js + TypeScript + Supabase. Feature slices in `src/<slice>/`, routes in `app/`, training-data pipeline in `scripts/training-data/`.

## Commands
- `npm test` — Vitest unit + integration. Run after every code change, not just at the end.
- `npm run test:e2e` — Playwright
- `npm run dev` — localhost:3000
- Pipeline stages 02–10 — `.venv/bin/python -u scripts/training-data/<stage> ...`. Never system python; the venv has pinned torch/ctranslate2/pyannote.

## Never
- Never leave a failing test. Fix the production code and add a regression test.
- Never add a silent fallback. Scripts fail loudly or ask the user.
- Never delete code whose purpose you can't explain.
- Never write a `.png` outside `.playwright-mcp/`.
- Never ship a known-wrong edge case as "acceptable for v1" — fix the design before implementing.
- Never call work done, settled or working before a second pass has attacked it — the failure list ships with the work. See `.claude/rules/finished-work.md`.
- Never verify content by a proxy for it. A handle, a filename, a URL, a truncated preview and a passing shape-test are all metadata; the defect lives in the part you didn't open.
- Never call a bulk transform done without reading a random sample of its output in full. Mechanical extraction protects against fabrication, not against wrongness.
- **Never postpone work.** "Out of scope", "a follow-up", "revisit later", "good enough for now" and "the fix is cheap if it ever matters" are all the same sentence, and none of them is an answer. If it is wrong, it gets fixed now.

## Never postpone — do it, or say exactly what it takes

Postponement is how a known fault becomes the user's problem. Two things replace it:

- **Do the work.** Blocked on a missing account, a timezone, a device, a fixture? Create it. Making a throwaway test user to prove a timezone boundary is work, not a blocker.
- **When it genuinely cannot be done now, make it abundantly clear what needs doing** — the whole shape of it, in plain language, in the reply: what is wrong, what it would take, what it costs, what breaks if it is left. Never a code, never a cross-reference, never a hint.

**Get the architecture right before anything is built on it.** A design flaw postponed is a design flaw multiplied by every caller added in the meantime. Widen the fix until it removes the *class* of fault, not the instance: one place that owns each rule, one representation of each fact, and a test that fails when a new caller forgets. "Fixed here, the same bug lives in four other slices" is not fixed.

## Stop and ask first
- Any INSERT/UPDATE/DELETE RLS policy, or anything touching auth, payments, or permissions.
- Reusing an existing icon in a new context (registry: `src/shared/iconRoles.ts`).
- Anything destructive or hard to reverse.

Warn about security risk every time it comes up, even when the user didn't raise it.

## How to answer
- Short. No preamble, no recap, no filler — sacrifice grammar for concision.
- **The user is not a programmer. Write every explanation so a non-programmer understands it, including in plans and docs.** Say what happened and what it means for the app or the user, then the technical detail. A term like *RLS policy*, *race condition*, *migration*, *read-modify-write* gets a plain-language gloss the first time it appears in a reply or a doc — "anyone signed in can add fake achievements to their own account", not "the INSERT policy is permissive". Never leave a blocker, risk, or decision stated only in jargon: if the user has to ask what it means, it was written wrong.
- Plain language first, file paths and line numbers second.
- When the user asks to see text, put it in the reply. Don't route it through a tool.
- Update the affected doc *before* telling the user something is done.
- Ground claims in the code or the data, never in a doc or a dashboard that describes it. Derived artifacts go stale.

## Blockers — say them out loud, every time
- **Every reply that has a blocker lists the blockers in the reply itself.** Never "see the plan", never "details in Part 2". If the user has to open a doc to find out what is stopping the work, this rule was broken. The doc still gets them as well — the reply is not the optional copy.
- **One line each, written as a question the user can answer.** What is stuck, why you cannot unstick it yourself, and the one thing you need back: a yes/no, a pasted output, a decision. Not a description of the problem.
- **Every blocker carries your recommendation**, so "go with your recommendations" is always a valid reply.
- **Say you attempted it and how it failed.** A blocker you never tried once is a guess, not a blocker.
- **No blockers? Say "No blockers" explicitly.** Silence reads as "you forgot", and then the user has to ask.
- Plain language, per *How to answer* above. "I need you to check whether the database creates a profile for a new user automatically — paste the result of this query" beats "verify the handle_new_user trigger". Number them so the user can reply "1 yes, 2 skip".

## Architecture
Enforced by `tests/unit/architecture.test.ts` — run it rather than memorizing it. Business logic lives in `*Service.ts`, DB access only in `src/db/*Repo.ts`, types in each slice's `types.ts`, API routes under 50 lines, multi-file icons registered in `iconRoles.ts`.

## Where the rest lives
- `.claude/rules/` — pipeline, database, UI, testing, plans, finished work. Load automatically when you touch matching files.
- `docs/pipeline/learnings.md` — read before any pipeline work
- `docs/testing_behavior.md` — read before writing tests
- `docs/slices/SLICE_*.md` — slice specs
