---
paths:
  - "src/**/components/**"
  - "app/**"
---
# UI
- Mobile first: build at phone width, then widen for desktop. Colours, parts and the logo follow `docs/product/look.md`.
- Check UI changes in the headless browser (Playwright MCP). Fresh users land on `/dashboard`; go straight to the target URL after login.
- localhost:3000 is his dev server on the live database. For anything that saves, run your own server on the test stack (`docs/tech.md` section 2).
- Walk the whole lifecycle: do it, undo it, empty state, leave and come back.
- Reuse the nearest sibling component and its container width before inventing new ones.
- Ask before reusing an existing icon in a new context. Registry: `src/shared/iconRoles.ts`.
- Time Log (Claude's way to keep his PC rule, `docs/tech.md` section 6): a phone change in a shared file stays behind `isMobile`/`sm:`, with PC screenshots before and after.
- Screenshots go in `.playwright-mcp/`; delete throwaways.
