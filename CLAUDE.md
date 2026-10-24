# daygame-coach

Next.js + TypeScript + Supabase. Slices in `src/<slice>/`, routes in `app/`,
Python video pipeline in `scripts/training-data/`.

A subscription web app that helps a man get better with women, plus a
life-improvement half. **Nobody has paid and the owner is the only user**, so
the live database holds the owner's own data. Size recommendations for that
stage. What a user can reach: `docs/product/map.md`; where it is going:
`docs/product/vision.md`.

## Commands

- `npm run dev` — localhost:3000.
- `npm test` (Vitest), `npm run test:e2e` (Playwright). The pre-commit hook
  runs `npm test` and refuses the commit on failure.
- `npm run build` — keep `--webpack`; the default bundler exhausts WSL memory.

## Gotchas

- Other Claude sessions share this working tree. Commit with
  `git commit --only <paths>`; never `git add -A` or `git stash`.
- One branch: `main`, which is the live site, so every push deploys.
  `training-rebuild` was retired on 2026-10-24; a plan that says to push
  there means `main`.
- DB access goes through `src/db/*Repo.ts`. Test writes against the live
  database go inside `begin; … rollback;`.

## Working with the owner

The owner is not a programmer. Decide technical questions yourself; report in
plain words, doubt first.

Only the owner decides, beforehand: spending money (also through a token, key
or account that can), deleting real data, and anything that cannot be undone.
This overrides any plan. A plan opens with these items, in plain words.

- Check the thing itself (the page, the output, the data), never a stand-in.
- Commit and push your own work without being asked.
- Flag security risks when you see them, unasked.
- Show, don't only tell. The owner likes seeing work on a visual page he can
  act on, like the naming board he marks Yes/Maybe/No
  (https://claude.ai/artifact/DSD8J1PJt4533EPytGD9v4). For choices,
  comparisons and plans, try different visual forms, not only chat text.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
