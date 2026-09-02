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
9. **Dropdowns** — panels clamp to `min(20rem, 100vw − 1.5rem)` and their rows are 44px on mobile. They are also
   rendered into `<body>` and positioned with `fixed` against their trigger: every card that holds one clips its own
   overflow (the day card's rounded corners, the calendar grid, the report tables, the modal body), so a panel drawn
   inside the card was sliced off at its edge — on the last row of a day the tag picker showed the search box and
   none of your tags.

   What the shared `Dropdown` now owns, because leaving the card cost each of these:
   - **Placement** — below the trigger, flipped above when there is no room below, and pinned to the top of the
     window when neither side has room (a `fixed` panel is outside every scroll container, so running off the edge
     would put it somewhere nothing could scroll it back from). Horizontal position clamps 12px inside
     `documentElement.clientWidth`, which excludes the scrollbar.
   - **Detaching** — an `IntersectionObserver` on the trigger closes the panel once the trigger is scrolled out of
     sight, whether by the window, the modal body or a table's scroller. A hand-rolled viewport check would only
     have caught the first.
   - **Focus** — an unmeasured panel is transparent, not `visibility: hidden`, because a hidden element refuses
     focus and that silently killed every picker's autoFocus. Tab order follows the document, and the panel is now
     at the end of it, so opening moves focus into the panel and closing hands it back to the trigger.
   - **Width** — `matchAnchorWidth` for a select, whose panel is as wide as its trigger; `w-full` would mean the
     whole window once the panel is no longer a child of the trigger.

   Covered by two tests in `tests/e2e/toggl-time-tracker.spec.ts`: `a tag picker on the last row of a day shows the
   tag list, not just the search box`, which checks the option is actually painted where its box says it is (a
   bounding box survives being clipped, so `toBeVisible()` alone would not have caught this), and `opening a picker
   puts the keyboard inside it, and closing gives it back`. Neither fails in jsdom — both need a real browser.

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

## Pointer-layout entry row: one shared column template (follow-up)

The phone row was fixed at two lines, but the pointer row was still a `flex-wrap` row, so each row's project, tag
and time columns started wherever that row's own description and project name happened to end. A row carrying a
group badge (`business (2)`) drifted furthest — the badge, the truncated description and the empty time cell all
shifted the fields after them.

It is now a CSS grid with one template per breakpoint (`ROW_GRID` in `src/timetrack/components/EntryList.tsx`), so
every row — group leads, expanded children, rows with no project — puts the same field at the same x:

| width | description | project | tags | start–end | duration |
|---|---|---|---|---|---|
| 640–767 | ≥150px, grows | ≤200px | ≤140px | hidden (in the detail sheet) | 78px |
| 768–1023 | ≥150px, grows | ≤150px | ≤110px | 120px | 78px |
| ≥1024 | grows | 200px | 140px | 120px | 78px |

Two things this design has to keep true, both of which broke while building it:

- **The description needs a hard `minmax(150px,1fr)`.** A bare `1fr` loses to the fixed tracks and collapses to zero
  width at 700px — the descriptions disappeared entirely.
- **No grid child may be `display:none`.** Auto-placement skips it and every later column shifts one track left, so
  the time cell is always in flow and only its contents are hidden below `md`.

Expanded group children now share the parent's columns; the indent lives inside the description cell instead of on
the `<li>`. The pickers take a `fill` prop that stretches the trigger to its cell rather than hugging its label.

Verified by `every entry row shares one column layout, group badge or not` in `tests/e2e/toggl-time-tracker.spec.ts`:
it asserts one identical column geometry across all rows at 1280 / 900 / 700px, that no description is under 120px,
and that expanding the group keeps the children on the same columns. It fails on the old flex row.

## Phone walkthrough, second pass

Every screen re-read at 390px with real data after the row-grid change. Four defects, all fixed:

- **The detail sheet showed the wrong time and moved the entry when saved.** It fed
  `entry.start.slice(0, 16)` — the *UTC* wall clock — to a `datetime-local` input, which reads its value back as
  local time. In Copenhagen a 12:00 entry displayed as 10:00, and "Save times" wrote 10:00 local, moving it two
  hours earlier on every save. Now `toLocalInputValue` / `fromLocalInputValue` in `timetrackFormatService`, with the
  round trip covered in `tests/unit/timetrack/timetrackFormatService.test.ts` and the sheet itself covered in
  `statefulPickers.test.tsx` (which fails against the old slice). This is the same class as the three date bugs in
  `.claude/rules/finished-work.md` — whose clock.
- **A group could not be expanded on a phone at all.** The count badge was a `<span>` inside the row's tap target,
  so tapping opened the lead entry's sheet and the rest of the group was unreachable. It is now its own 28×44
  button, and the 28px column it occupies is exactly what `pl-7` indents the expanded children by, so phone rows
  line up the same way the pointer rows now do.
- **Two `datetime-local` inputs side by side clipped their own values** ("08/27/2026, 10:" with the time cut off).
  They stack on phones. The empty "Shared with" heading is hidden when the workspace has only you.
- **Short calendar blocks rendered as nameless bars.** Below 22px the title is dropped and a `title` tooltip carries
  it — but a phone has no hover. Phones now open one zoom step taller (88px/hour), so a 15-minute block still shows
  its description; the user's own zoom choice is never overridden.

Smaller: the report date range reads "24–30 Aug" instead of truncating to "2026-08-24 – 202…"
(`formatRangeShort`), and the chart's three selects go two-up so "No stacking" is not cut to "No stackir".

Guarded by `a grouped entry can be expanded on a phone, not just on a desktop` in
`tests/e2e/mobile/mobile-toggl.spec.ts` (9 phone tests) plus the unit tests above.

Known and accepted: `datetime-local` renders in the browser's locale (a 12-hour clock even when the workspace is set
to 24-hour) and drops seconds — that is the native control, not our formatting.
