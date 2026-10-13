---
paths:
  - "src/**/components/**"
  - "app/**"
---

# UI

- Check UI changes in the browser (Playwright MCP) against localhost:3000. Fresh users land on `/preferences`; navigate straight to the target URL after login.
- Walk the whole lifecycle: do it, undo it, empty state, leave and come back.
- Reuse the nearest sibling component and its container width before inventing new ones.
- Ask before reusing an existing icon in a new context. Registry: `src/shared/iconRoles.ts`.
- Screenshots go in `.playwright-mcp/`; delete throwaways.
