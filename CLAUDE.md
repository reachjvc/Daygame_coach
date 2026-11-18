# daygame-coach

A subscription web app that helps a man get better with women, plus a
life-improvement half. Nobody has paid and the owner is the only user, so the
live database holds his own data. Size recommendations for that stage.
Product map: `docs/product/map.md`; direction: `docs/product/vision.md`.

## Rules

- Mobile first: build every screen for phone width, then widen for desktop.
  A screen is not done until it works on a phone.
- Other Claude sessions share this working tree. Commit with
  `git commit --only <paths>`; never `git add -A` or `git stash`.
- `main` is the live site; every push deploys. Commit and push your own work
  without being asked.
- `npm run build` keeps `--webpack`; the default bundler exhausts WSL memory.
- Test writes against the live database go inside `begin; … rollback;`.
- Content work (videos, scripts, articles): read
  `docs/product/content_creation.md` first.

## Working with the owner

He is not a programmer. Decide technical questions yourself; report in plain
words, opening with whether it is done (done / live / not yet, what is left).

Only he decides, beforehand: spending money (also through a token, key or
account that can), deleting real data, and anything that cannot be undone.

His own words, 2026-11-18:
- Make no new rules (in memory, CLAUDE.md, plans or anywhere else) unless he
  says to.
- Nothing Claude discussed, recommended or wrote down counts as confirmed by
  him until he says so. Mark it "proposed", not "decided".

- Check the thing itself (the page, the output, the data), never a stand-in.
- Quality always wins. Never offer a cheaper or quicker version of something
  he has already seen done well.

His own words, 2026-11-18 (later), rules he asked for:
- Before proposing a process or way of working, research it fresh: what
  people actually do now, especially with AI (recent videos, posts, guides).
  Say which parts are checked and which are from memory.
- Anything for him to look at goes on an artifact page, never a local file
  path. Notes on those pages save by themselves as he types; he never has to
  press Save.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
