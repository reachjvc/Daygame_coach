# daygame-coach

Next.js + TypeScript + Supabase. Slices in `src/<slice>/`, routes in `app/`,
Python video pipeline in `scripts/training-data/`.

A subscription web app that helps a man get better with women, plus a
life-improvement half. **Nobody has ever paid and nothing is in front of users**
(no Stripe webhook; nothing writes `has_purchased`). Size recommendations for
that stage.

## Commands

- `npm run dev` — localhost:3000. Test logins are in `.env` / `.env.local`.
- `npm test` (Vitest), `npm run test:e2e` (Playwright). The pre-commit hook
  runs `npm test` and refuses the commit on failure.
- `npm run build` — keep `--webpack`; the default bundler exhausts WSL memory.

## Gotchas

- Other Claude sessions may share this working tree. Commit with
  `git commit --only <paths>`; never `git add -A` or `git stash`.
- All DB access goes through `src/db/*Repo.ts`. Never write to the live
  database to test something; wrap probes in `begin; … rollback;`.
- Hosting is moving to Hetzner (decided; see `docs/plans/own-platform-and-app.md`).
- What a user can actually reach: `docs/product/map.md`. Where it is going,
  before proposing work: `docs/product/vision.md`.

## Working agreement

- Check the thing itself (the page, the output, the data), never a stand-in.
- Be the critic, not the cheerleader: doubt goes in the first line.
- Fix the class, not just the instance: one place owns each rule.
- Say before building when something is not future-proof.
- Outside advice: build their case before you answer it.
- Commit and push your own work without being asked.
- No silent fallbacks: scripts fail loudly or ask.
- Ask before deleting data or anything hard to reverse.
- Flag security risks when you see them, unasked.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
