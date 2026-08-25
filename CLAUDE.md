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
- Never verify content by a proxy for it. A handle, a filename, a URL, a truncated preview and a passing shape-test are all metadata; the defect lives in the part you didn't open.
- Never call a bulk transform done without reading a random sample of its output in full. Mechanical extraction protects against fabrication, not against wrongness.

## Stop and ask first
- Any INSERT/UPDATE/DELETE RLS policy, or anything touching auth, payments, or permissions.
- Reusing an existing icon in a new context (registry: `src/shared/iconRoles.ts`).
- Anything destructive or hard to reverse.

Warn about security risk every time it comes up, even when the user didn't raise it.

## How to answer
- Short. No preamble, no recap, no filler — sacrifice grammar for concision.
- Plain language first, file paths and line numbers second.
- When the user asks to see text, put it in the reply. Don't route it through a tool.
- Update the affected doc *before* telling the user something is done.
- Ground claims in the code or the data, never in a doc or a dashboard that describes it. Derived artifacts go stale.

## Architecture
Enforced by `tests/unit/architecture.test.ts` — run it rather than memorizing it. Business logic lives in `*Service.ts`, DB access only in `src/db/*Repo.ts`, types in each slice's `types.ts`, API routes under 50 lines, multi-file icons registered in `iconRoles.ts`.

## Where the rest lives
- `.claude/rules/` — pipeline, database, UI, testing, plans. Load automatically when you touch matching files.
- `docs/pipeline/learnings.md` — read before any pipeline work
- `docs/testing_behavior.md` — read before writing tests
- `docs/slices/SLICE_*.md` — slice specs
