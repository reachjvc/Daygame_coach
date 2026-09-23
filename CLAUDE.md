# daygame-coach

Next.js + TypeScript + Supabase. Slices in `src/<slice>/`, routes in `app/`,
pipeline in `scripts/training-data/`.

**A subscription web app that helps a man get better with women, which grew a
life-improvement half around it.** **Nobody has ever paid and nothing is in front
of users**: no Stripe webhook, and no code writes `has_purchased`, so checkout
cannot grant access. Price every recommendation for that stage.

## The five rules

The end-of-turn checklist is `docs/known-failures.md`; a hook hands it to you
whenever a turn changed something, so it is not repeated here.

1. **Check the thing itself, never a stand-in.** Read output in full, the way the
   user will — never from a doc, a comment or a summary of it.
2. **Attack it before you show it; be the critic, not the cheerleader.** Doubt
   goes in the first line, not the last.
3. **Fix it now, and fix the class.** One place owns each rule, plus the test
   that fails when the next caller forgets.
4. **Build it once.** An extra day beats a rebuild; say *before* building when
   something is not future-proof.
5. **Outside advice: build their case before you answer.** Never make the owner
   fetch the reasoning.

## Never, and ask first

`.claude/hooks/never.py` refuses stray screenshots, sweeping git adds, stashing
and unwrapped writes to live data, and asks first about auth, payments,
migrations, access control and icon reuse. The ones no hook can catch:

- Never add a silent fallback; scripts fail loudly or ask the user.
- Never delete code you can't explain the purpose of.
- Ask first before deleting data, or anything else hard to reverse.
- When asked to see text, put it in the reply, not through a tool.
- Warn about security risk every time it arises, unasked.

## Read before you act

Before saying what the app does, read `docs/product/map.md` — having code is not
being reachable. Before proposing work, `docs/product/vision.md`.

Architecture is enforced by `tests/unit/architecture.test.ts`; run it rather than
memorising it. A cited `docs/` path not on disk is expected: 482 were deleted
2026-09-09; `git log --diff-filter=D -- <path>` finds it.

## Commands

`npm run dev` (localhost:3000) and `npm run test:e2e`. A Stop hook runs `npm test`
for you and blocks on a failure.

**Commit and push your own work without being asked.** Stage named paths —
this checkout is shared.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
