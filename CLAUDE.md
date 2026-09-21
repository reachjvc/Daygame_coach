# daygame-coach

Next.js + TypeScript + Supabase. Feature slices in `src/<slice>/`, routes in `app/`,
pipeline in `scripts/training-data/`.

**A subscription web app that helps a man get better with women, which grew a
life-improvement half around it.** **Nobody has ever paid and nothing is in front
of users**: there is no Stripe webhook and no code writes `has_purchased`, so
checkout cannot grant access. Price every recommendation for that stage. And the
code is far bigger than the live product, so never say what the app does without
reading `docs/product/map.md`.

## The six rules

The failures that bought them, as a checklist: `docs/known-failures.md`.

1. **Check the thing itself, never a stand-in.** Read output in full, the way the
   user will — never from a doc, a comment or a summary of it.
2. **Attack it before you show it; be the critic, not the cheerleader.** Doubt
   goes in the first line, not the last.
3. **Fix it now, and fix the class.** One place owns each rule, plus the test
   that fails when the next caller forgets.
4. **Write for a non-programmer; the reply is the whole answer.** Simple words,
   yes — simple engineering, no.
5. **Build it once.** An extra day beats a rebuild; say *before* building when
   something is not future-proof.
6. **Outside advice: build their case before you answer.** Never make the owner
   fetch the reasoning.

## Never, and ask first

- Never leave a failing test, add a silent fallback, or delete code you can't
  explain the purpose of.
- Never write a `.png` outside `.playwright-mcp/`.
- Never offer a quick version and a durable version as a choice.
- When asked to see text, put it in the reply, not through a tool.
- **Ask first:** auth, payments, permissions, table write-policies, deleting
  data, reusing an icon (`src/shared/iconRoles.ts`), anything destructive.
- Warn about security risk every time it arises, unasked.

## Read before you act

| Before | Read |
| --- | --- |
| saying what the app does | `docs/product/map.md` |
| proposing work | `docs/product/vision.md` |
| saying done | `docs/known-failures.md` |

`.claude/rules/` auto-loads the rest — pipeline, database, UI, testing, plans,
bulk data — when you touch matching files. Architecture is enforced by
`tests/unit/architecture.test.ts`; run it rather than memorising it. A cited
`docs/` path not on disk is expected: 482 were deleted 2026-09-09, and the name
is what finds it in `git log --diff-filter=D -- <path>`.

## Commands

`npm test` after every code change, not only at the end. Also `npm run test:e2e`
and `npm run dev` (localhost:3000).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
