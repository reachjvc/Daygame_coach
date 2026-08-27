# /test/toggl — mobile plan

Measured on iPhone 14 (390px) and a 360px Android before any changes:

| Screen | Finding |
|---|---|
| all | Header costs ~290px before content: workspace name + badge + running pill + bell + shortcuts wrap onto two rows, then the nav tabs overflow off-screen |
| all | Layout viewport expanded to **559px on Reports** and **458px on Settings** — content wider than the phone forces the browser to zoom out |
| timer | **152 interactive targets under 40px**; entry rows wrap into 2–3 unpredictable lines (checkbox, group badge, description, project, tags, billable, times, duration, play, ⋮) |
| projects | 880px-wide table inside a horizontal scroller |
| manage | 760px-wide team table |
| reports | Filter bar is five stacked rows before any data; tab strip wraps to two rows |
| calendar | Week grid = 7 columns of ~47px; drag-to-create is mouse-only, so touch cannot create entries at all |

## Approach

Breakpoint is Tailwind `sm` (640px). Layout swaps are CSS (`sm:hidden` / `hidden sm:…`) so they are SSR-safe;
only *behavioral* defaults use a `useIsMobile()` matchMedia hook, which is safe here because the lab renders a
loading state until client state exists.

1. **Shell** — one-line header on mobile (workspace + alerts; badge and the `⇧?` button are desktop-only, the
   shortcut list is keyboard-only anyway). The running-timer pill stays in the header **only when you are off the
   Timer screen**, so stopping is always one tap away without duplicating what the timer card already shows.
   Navigation becomes a **bottom tab bar** (6 icons + labels, 56px, `env(safe-area-inset-bottom)`), content gets
   bottom padding, and toasts sit above the bar.
2. **Touch targets** — a shared `touchTarget` class (`size-11 sm:size-8`, i.e. 44px on phones) applied to every
   icon-only control: play, ⋮, delete, archive, favorite, billable, close, calendar paging.
3. **Timer** — description on its own full-width line, a chip row (project · tags · billable · favorite · mode),
   then duration + a full-width Start/Stop. Favorites become a horizontal scroll strip.
4. **Entries** — card rows on mobile: description + duration on line one, project · tags · time range on line two,
   a 44px play button, and the whole row taps through to the detail sheet (inline 52px time inputs are unusable on a
   phone). Checkboxes are hidden until you enter selection mode from the day header; the bulk bar then docks above
   the tab bar.
5. **Calendar** — day view by default on mobile, compact controls, zoom hidden. Drag-to-create/move/resize stays
   desktop-only (it is mouse-driven and would fight page scrolling); mobile taps a block to edit and uses the timer
   to create. Week view remains available and scrolls horizontally.
6. **Reports** — tab strip scrolls on one line; the filter bar collapses to a date row plus a **Filters** sheet
   carrying every control including rounding, export and save; summary tiles go 2-up; Detailed and Profitability
   render as card lists; Workload stays a matrix in its own scroller.
7. **Projects / Manage** — tables become card lists on mobile (project card with estimate bar and a menu; member
   card with role and rates; client and tag rows stack).
8. **Modals** — full-screen sheets on mobile with a sticky header and footer, so long forms (the project editor)
   are usable.
9. **Dropdowns** — panels clamp to `min(20rem, 100vw − 1.5rem)` and their rows are 44px on mobile.

## Out of scope (stated, not hidden)
- Drag-to-create on touch. Tap-to-edit plus the timer covers the same ground; adding pointer-event dragging would
  fight vertical scrolling and needs its own design.
- Swipe gestures (swipe-to-delete, swipe between days).


## Result

Re-measured on iPhone 14 (390px) and 360px Android after the work (measurements taken while the page still
seeded sample data; it now starts empty):

| Metric | Before | After |
|---|---|---|
| Screens that widened the layout viewport | Reports (559px), Settings (458px) | none — every screen fits at 390 and 360 |
| Interactive targets under 40px, Timer screen | 152 | 9 (a text link, a checkbox inside a 36px label, the "Select" toggle) |
| Header height before content | ~290px (two wrapped rows + overflowing tabs) | one 48px row |
| Entry row | 2–3 wrapped lines, unpredictable | two fixed lines: description + duration, then project · tags · time |
| Tables at phone width | 880px (projects) and 760px (team) side-scrollers | card lists; Workload stays a matrix in its own scroller |

What shipped beyond the plan:
- `Segmented` scrolls horizontally instead of forcing the page wider — this was the actual cause of the Settings
  overflow (five options could not fit).
- The donut legend stacks under the chart; `SectionCard` headers wrap; report action selects go full-width and the
  chart's three selects become a 3-column grid.
- The running-entry pill drops its description on phones so the workspace name is not squeezed, and the
  remove-favorite "×" is pointer-only (too easy to hit by accident on a phone).

Verified by `tests/e2e/mobile/mobile-toggl.spec.ts` (8 tests, registered in the `mobile-iphone` project): no
horizontal overflow on any screen, the tab bar is at the bottom and owns its own pixels, entry rows open the detail
sheet, selection mode is opt-in, the filter sheet opens, the calendar defaults to Day, and every tab is at least
44×44.

### Dev-only caveat
`next dev` renders its dev-tools badge in a bottom corner, on top of one tab of the bottom bar. It does not exist in
a production build. Moving it (`devIndicators.position`) only relocates the collision to a different tab, so the
config was left alone; the mobile spec navigates with `dispatchEvent('click')` and asserts the bar's hit-testing
separately.
