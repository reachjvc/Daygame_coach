---
paths:
  - "src/**/components/**"
  - "app/**"
---

# UI

**Verify in the browser before saying it's done.** Playwright MCP: navigate, click the whole flow, confirm it looks right. App on localhost:3000; test user `test-user-b@daygame-coach-test.local`; fresh users land on `/preferences`, so navigate straight to the target URL after login. Shipping UI the user has to QA by hand costs more than checking it.

**Walk the lifecycle, not the happy path.** Forward action → is the UI still usable afterwards → can it be undone, and if not is it confirmed → what happens when every item is gone → does state survive leaving the page and coming back.

**Reuse before inventing.** Grep first: `max-w-*` from sibling pages for container width, `GoalCategorySection` for collapsibles, `RecentSessionsCard` for expandable lists. Match the nearest sibling component. A mismatched page width is the first thing the user notices.

**Never reuse an existing icon in a new context without asking.** Registry: `src/shared/iconRoles.ts`.

Anything added to the test pages must be reachable from the `/test` dashboard before you hand it back.
Screenshots go in `.playwright-mcp/`; delete the throwaways.
