# Time Log on a phone: rename and make it pleasant to use

**Written 2026-11-14.** The owner said the time tracker "has become, i fear, more
broken, particularly on my phone in the app", asked for a new name, and asked
for a plan a lesser model can carry out in phases.
**Status: done 2026-11-14, Phases 0–8 live. Phase notes are under each phase.**

## In plain words

On a phone, the tracker works but is full of rough edges. Some of them are real
breakage that writes wrong time:

- adding a past entry with ⊕ and typing a length puts it in the future;
- an accidental hold on the calendar leaves a 30-minute junk entry;
- shortening one entry silently stretches the next one;
- the report page slides sideways;
- the ← in Projects or Settings throws you out of the tracker altogether.

The rest is clumsy or ugly:

- the keyboard covers half the entry sheet, and the project list covers the name you are typing;
- rows are tall and only about five fit on screen;
- buttons are tiny spaced capitals that do not look like buttons, and dates read "11-13";
- the calendar opens at 07:00 instead of now and shows about four hours;
- PC-only things like money, team and billable crowd the screens.

The installed app can also keep running yesterday's code for days.

The plan fixes the breakage first, then the frame around the app, then each
screen, then renames it to **Time Log**. It ends with a hard check on a phone
and a PC. **Nothing changes on the PC except where it makes the PC better or
more like the phone** (the owner's rule for this plan).

## Decisions already made by the owner (2026-11-14)

| ID | Question | Answer |
|---|---|---|
| D1 | New name (10 offered: Timer, Hours, Clock In, Logbook, Punch Card, Stopwatch, Time Log, Hourglass, Ledger, Tally) | **Time Log** |
| D2 | May the phone hide Week view, the Workload/Profitability/My reports tabs, Billable, the bell when no alert exists, the ⋮ on each row (its actions move into the entry's own ⋮), the Team tab, and the "Created with… last updated" footer? The PC keeps all of them. | **Yes, hide all** |
| D3 | Pulling an entry's edge away from its neighbour: stretch the neighbour (today) or leave a gap? | **Leave a gap.** Pushing an edge *into* a neighbour still moves it, with Undo. Applies to PC and phone. |

Nothing in this plan costs money, deletes real data, changes the database or is
irreversible. No owner approval is needed during execution.

## Decisions taken by Claude (veto any of them)

| ID | Decision | Why | Cost if wrong |
|---|---|---|---|
| C1 | Rename only words people see. Code names (`timetrack`, `TogglLab`, `/time`, storage keys) stay. | A code rename touches about 40 files, the sync and tests, for no visible gain. | None visible. |
| C2 | The tab inside the tracker stays "Timer" (Timer · Calendar · Reports). The app is Time Log and the tab is Timer. | Toggl's own words. The tab is the stopwatch screen, and the app is the whole log. | A one-word change later. |
| C3 | Keyboard fix is local to the tracker's sheet (`visualViewport`), not the site-wide `interactive-widget` meta. | The meta changes every page's bottom bars, a site-wide change for a tracker problem. | Other pages keep their own keyboard behaviour. |
| C4 | The installed app keeps opening on Home (`start_url` unchanged), and gains long-press shortcuts "Start timer" and "Calendar". | Adds a 1-tap way in without changing what the owner signed off in the navigation plan. | None. |
| C5 | A new build is loaded only when it is safe: no sheet open and nothing waiting to sync. Otherwise a small "Updated, tap to reload" bar shows. | A reload with unsynced changes could lose a tap. | One extra tap now and then. |
| C6 | Week view is replaced by nothing on the phone (Day view only). | D2. Toggl's phone calendar is a day view with a week strip. | Week view stays on the PC. |

## Blockers (each tried once on 2026-11-13/14)

| ID | What | Attempted, and the result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | The Playwright MCP browser is used by another session | `browser_run_code_unsafe` returned "Browser is already in use for …mcp-chrome-for-testing…" | nothing | Use the plain Playwright helper `~/.cache/daygame-research/time-log-phone/lib.js` (headless, touch, 390×844). |
| B2 | The real Android keyboard and the installed (standalone) mode cannot be emulated | Tried with a 390×480 window as a stand-in keyboard. Standalone display mode and the keyboard's visual viewport are not available headless. | the proof for Phase 2 | Test with the 480-high window. The owner confirms on his phone after Phase 2 ships, as one line in the report. |
| B3 | Swiping the time wheels by touch could not be confirmed | A synthetic CDP flick did not move the wheels; taps on −5/+5 did. | nothing (wheels untouched by this plan) | Do not change the wheels' gesture code. The owner checks the wheels on his phone. |
| B4 | Letter gaps in spaced capitals ("ST OP T IME", "YEST ERDAY") | Seen in every headless shot with Geist and `uppercase tracking-wide`. Not known whether his phone shows it. | nothing | Phase 3 drops spaced capitals from buttons anyway. Ask the owner for one phone screenshot in the final report. |
| B5 | The real signed-in `/time` | Run on the local test stack with a throwaway account (worktree, port 3417). It draws the same screens as the lab `/test/toggl`; Back steps through sections and sheets correctly. | nothing | Work in the lab; run the real route once in Phase 8. |

## Evidence

All screenshots, the seeding helper and seed data are in
`~/.cache/daygame-research/time-log-phone/` (not /tmp, which is wiped on a crash):

- `lib.js` gives `phone({state, w, h})`, `shot(p, name)` and `controls(p)` (every visible control with its position and size).
- `state-seed.json` holds 6 projects, 3 tags, 68 entries over 12 days, one overlap and one running timer, dated around 2026-11-13. Shift the dates if they are stale.
- `before/` holds 96 shots: `01–03` first look, `A-*` list and sheet, `B-*` calendar, reports and settings, `c*` the real route.

Tap counts measured 2026-11-13 (phone, lab):

| Task | Taps |
|---|---|
| Fix a forgotten timer (bar → Stop at… → "1 h ago" → Stop at) | 4 |
| Change the start and end of a finished entry | 8 |
| Rename an entry | 3 |
| Change an entry's project | 4 |
| Delete, then Undo | 2, but the swipe needs 75% of the row width |
| From app launch to a running timer | 2 (Home → Time Log tile → ▶) |

## Ground rules for the executing session

1. **Phone first, PC protected.** The phone layout is below 640px (`sm:`).
   Files under `src/timetrack/components/phone/` and the `phone*Service.ts`
   files are phone-only. Every other file is shared with the PC: `CalendarView`,
   `ReportsView`, `pickers`, `primitives`, `SettingsView`, `ProjectsView`,
   `EntryList`, `TimetrackScreen`, `TogglLab`, `timeFixService`, `MomentPicker`
   and `Drums`. In a shared file, gate each phone change on the existing
   `isMobile` flag or on `sm:` classes. Only D3, the rename, and the items
   marked **PC too** may change the PC.
2. **PC before/after check every phase.** Before a phase, take 1280×800 shots
   of every PC screen whose files the phase touches. Take them again after. Any
   difference not in the phase's list is a regression to fix before shipping.
3. **Work in a git worktree.** Read memory `worktree-e2e-servers`: `next dev
   --webpack`, own port, test-stack env, never `.env.local`. Ship each phase as
   one fast-forward to `main`, which deploys live. Batch commits: about 60
   pushes a day hits the Vercel rate limit. After the push, check the live
   `healthz` buildId.
4. **Never touch the live database.** Browser checks use the lab
   `localhost:<port>/test/toggl`, signed out, with localStorage seeded from
   `state-seed.json`.
5. **Commits.** `git commit --only <paths>`; never `git add -A` or `git
   stash`. Run the typecheck ratchet before every push (memory
   `typecheck-before-push`). Stop dev servers first, because WSL runs out of
   memory. Unit tests must stay green. Change a guard test only on purpose,
   and keep its reason.
6. **A phase is done** only after these four things:
   - every listed item has been walked by hand on a 390×844 and a 360×740 touch screen, and at 390×480 for keyboard items;
   - a screenshot of each item, before and after, is in `shots/phase-N/`;
   - the PC check (rule 2) passes;
   - the tap-count table is re-measured if the phase touched those flows.

   If a common flow got harder, that is a regression even with green tests
   (memory `review-means-feel-look-bugs`).
7. **Do not invent features.** Fix what is listed. If an item turns out wrong
   or impossible, write what you found under the phase and move on. Never
   remove anything not listed in D2 (memory `no-removal-until-owner-says`).

## Phases

Each phase ships alone. File and line numbers were right on 2026-11-13. Search
for the named function if a line has moved.

### Phase 0: Set up and measure (no ship)

1. Make the worktree. Copy `lib.js` and seed into a work folder in
   `~/.cache/daygame-research/time-log-phone/`.
2. Take the PC baseline. At 1280×800, shoot every PC screen:
   - Timer in List view and in Calendar view;
   - Reports;
   - Projects, Clients and Tags;
   - each Settings tab;
   - an open entry box;
   - the Stop at… box.

   Save them to `pc-before/`.
3. Re-run the tap counts above, to confirm today's numbers.
4. Fix a flaky guard first. On 2026-11-14,
   `tests/unit/timetrack/aChangeFromAnOlderPageIsNotLost.test.tsx` ("takes
   the Stop the older tab tells it, and sends it") failed twice in the full
   `npx vitest run` but passed alone. The pre-commit hook runs the full suite
   and blocks every commit, so find why it depends on load or order and make
   it reliable. Keep what it guards; do not skip it.

**Done 2026-11-14.**
- Worktree `~/.cache/daygame-research/time-log-phone/wt` (branch `tlp`), lab on port 3417 against the test stack. `lib.js` now fixes the browser clock at 2026-11-13 21:35 Copenhagen and strips the sync route's `Date` header (the tracker corrects its clock from it, which undid the fixed clock), so shots repeat. It adds `lab()`, `pc()` and a `work/pcall.sh` that shoots 15 PC screens and diffs them against `shots/pc-before/` (`work/pcdiff.py`). The only differences between two runs of unchanged code are the ticking clocks and pulsing badges.
- Differed from the plan: the PC's Stop at… box is opened from the running time box (top bar), and its title reads "Stopped at…" (3.5 PC wording applies).
- Tap counts: not re-run here. The table above (2026-11-13) stays the baseline; Phase 8 measures against it.
- Flaky guard: the test waited 5 s for "Saved", which takes about 5.7 s even alone (built-in retry and check waits), so it failed under load. Waits are 20 s each inside a 70 s limit; what it guards is unchanged. Commit 3dca7d8b, shipped with Phase 1.
- Also seen under load (not fixed, untouched by this plan so far): `aRunningSecondRedrawsOneDayOfThePhoneList` and `aStopClearsTheBar` fail now and then in the full suite and pass alone.

### Phase 1: Things that write wrong time or trap you (broken)

| # | Fix | Where | PC? |
|---|---|---|---|
| 1.1 | ⊕ "add a past entry": typing a length keeps the **end** (now) and moves the start back. Today it keeps the start and pushes the end into the future (21:10 + 1:30 → 22:40, a planned entry). Rule: for a new finished draft whose end is within 1 minute of now, keep the end. | `withDuration`, `src/timetrack/phoneSheetService.ts:292` | phone only |
| 1.2 | Calendar hold-to-create: if the sheet for a block made by a hold is closed with no change, remove that block. Today ✕ keeps a 30-min "(no description)" entry (68 → 69 entries, day total +30 min). | `onCreated`, `CalendarView.tsx:589-609`, phone branch | phone only |
| 1.3 | D3: pulling an edge **away** from a touching neighbour leaves a gap. Pushing **into** a neighbour still moves it, with the Undo toast. Add a unit test for both directions. | `withNeighbours`, `src/timetrack/timeFixService.ts:297`; `neighbourNotice.ts:62` | **PC too** (owner yes) |
| 1.4 | Reports › Details › Summary no longer widens the page to 478px. Add `grid-cols-1` to the grid and `min-w-0` to its items. Check that no page in the tracker scrolls sideways at 360px: `document.documentElement.scrollWidth === innerWidth`. | `ReportsView.tsx:827` | **PC too** (no visible change expected) |
| 1.5 | On the Projects, Clients/Tags, Settings and Import screens, the header ← goes back to the tab you came from and is labelled "← Timer" (or that tab's name). Only on Timer, Calendar and Reports does it say "← Home". The bottom tab you came from stays highlighted. | `TimetrackScreen.tsx:122`, `PhoneTracker.tsx` header | phone only |
| 1.6 | "New project" opens with the Name field visible and focused. Focus with `preventScroll` after the sheet has opened, or set the body's `scrollTop` to 0. | `ProjectsView.tsx:507`, `primitives.tsx:559` | phone only |
| 1.7 | The @ and # lists never cover the field being typed in, nor the sheet header. On a phone, draw the list in the flow of the sheet, right under the name field and pushing the content down, not as a floating portal. Test at 390×480. | `pickers.tsx:748-752` (`panelStyle`) | phone only |

**Done 2026-11-14.** Walked at 390×844 and 360×740 (1.7 also at 390×480); shots in `shots/phase-1/after/`, before shots are `before/A-25-plus`, `B-06/B-07`, `B-27`, `c05`, `B-43/B-44`, `A-29/A-30`.
- 1.1: ⊕, ✎, typed 130 → 20:05–21:35 (end kept at now). `withDuration` takes `{ isNew }`; unit test added.
- 1.2: hold → 69 entries, ✕ → 68 again at both sizes. A held block named and saved stays (new test). The guard that said "closed without a name, the block stays" was changed on purpose.
- 1.3 (PC too): pulling an edge away now leaves a gap; pushing in still moves the neighbour with "Keep … as it was". Ten guard tests that pulled away were changed on purpose to say the gap, each with a pushed-in twin (touchingNeighbours, aNeighbourAlreadyInPlace, anUndoOfTwoChanges, theCalendarFollowsAFinger).
- 1.4: `scrollWidth === innerWidth` on Timer, Calendar, Reports, Details, Projects, Clients and Settings at 390 and 360. Details' own tab strip still scrolls inside itself (fine; Phase 6 trims it).
- 1.5: Projects/Clients/Tags/Settings/Import show "← Calendar" (or Timer/Reports) and the tab stays lit; ← steps back in history when one step away, otherwise goes to the tab.
- 1.6: Name visible and focused at the top (y=105) on open. Differed from the plan: fixed in `ProjectsView` (focus after the frame, `preventScroll`, body scrolled to top), not in `primitives`. The PC behaves as before.
- 1.7: on a phone the @ and # lists are drawn in the sheet under the name field (field 146–190, list 194–386 at 390×480); rows 44px (3.8 done here for this list).
- PC check: `shots/pc-after-1` vs `pc-before`: only clocks and badges differ.

### Phase 2: The installed app's frame

| # | Fix | Where | PC? |
|---|---|---|---|
| 2.1 | While the keyboard is open, the entry sheet sits above it. Read `window.visualViewport` (height and offsetTop) while the sheet is open, and set the sheet's bottom offset and max-height from it. The same helper already exists for the pickers (`usableBand()`, `primitives.tsx:133`): reuse it. | `phone/EntrySheet.tsx:553-556` | phone only |
| 2.2 | New-build check. On `visibilitychange` to visible, fetch `/api/healthz` and compare its buildId with this page's. If they differ and no sheet is open and nothing waits to sync (the sync badge's own count), reload. Otherwise show a slim "Updated · Tap to reload" bar above the run bar. | new small hook in `src/timetrack/hooks/`, used by `TimetrackScreen` | **PC too** (the PC gets fresh code too) |
| 2.3 | Header top safe area: add `pt-[env(safe-area-inset-top)]` to the phone header. | `PhoneTracker.tsx:325` | phone only |
| 2.4 | Status-bar colour matches the tracker header. Add `export const viewport = { themeColor: <the header's background colour> }` to `app/(app)/time/page.tsx`, checking both themes. | `app/(app)/time/page.tsx` | phone only (PC browsers ignore it) |
| 2.5 | `overscroll-behavior-y: contain` on the tracker's root, below `sm` only. | `PhoneTracker.tsx` root | phone only |
| 2.6 | Manifest shortcuts: "Start timer" → `/time`, and "Calendar" → `/time?view=calendar`. Keep the icons from the existing icon set. | `app/manifest.ts` | none |

**Done 2026-11-14.** Shots in `shots/phase-2/after/`; before shot `before/A-28-kbd-existing`.
- 2.1: the sheet reads `visualViewport` and, while the visible part is more than 120px shorter than the page, sits in `usableBand()` (now exported). Tested with a stubbed visual viewport (B2): at 390×844 with a 364px keyboard the sheet spans 0–480 and the name field is at 107–151; at 360×740 with 300px, 0–440. The real keyboard waits for the owner's phone (B2).
- 2.2 (PC too): `hooks/useNewBuild.ts`, used in `TogglLab` (so both `/time` and the lab get it; differed from the plan, which said `TimetrackScreen`). "Something open" is any `role=dialog/alertdialog` on the page; "waiting" is the sync badge's `pendingCount`. Faked healthz: no sheet → reloaded; sheet open → no reload, bar "Updated · Tap to reload" above the run bar. Unit test `aNewBuildLoadsWhenSafe` (4 cases).
- 2.3: `pt-[env(safe-area-inset-top)]` on the phone header (0 in a headless browser; needs the installed app to show).
- 2.4: `viewport.themeColor` `#1f2937` (`--card`, the same in both themes) on `/time`. Checked in Phase 8 on the real route.
- 2.5: `overscroll-behavior-y: contain` on `<html>` while the phone tracker is mounted (`contain` on phone, `auto` on PC). Differed: set on `<html>`, since the page itself scrolls, not the tracker's root.
- 2.6: manifest `shortcuts` "Start timer" → `/time`, "Calendar" → `/time?view=calendar`, with `icon-192.png`.
- PC check `shots/pc-after-2`: clocks only.

### Phase 3: The entry sheet and the pickers

Reference shots: `before/A-05`, `A-06-stopat`, `A-08`, `A-17`, `A-19`,
`A-25-plus`, `A-36-360-running`, `02-workingon-tapped`.

| # | Fix | Where | PC? |
|---|---|---|---|
| 3.1 | Running entry: the Stop / Stop at… / Switched at… row moves right under the name and the project/tag chips, so it is visible at 360×740 without scrolling. | `phone/EntrySheet.tsx` (stop row vs time section around line 794) | phone only |
| 3.2 | One "Start → End" block, the same for new and existing entries. Two boxes. Tapping a box opens the wheels for that box; tapping it again closes them. Remove the mislabelled "Edit duration" heading and the "› Edit duration" link. The length stays editable through the ✎ beside the big clock. On a running entry, the End box reads "now" and is not tappable. | `EntrySheet.tsx:193` (`drumsOpen = !isNew`), lines 794-826 | phone only |
| 3.3 | "Set to last stop time" and "Round stop time" become normal small outlined buttons in sentence case. Hide each when it cannot do anything; today "Round stop time" even shows on a running entry. | `EntrySheet.tsx:801-813` (`textLink`) | phone only |
| 3.4 | The date in the time boxes reads "Today", "Yesterday" or "Thu 12 Nov", never "11-13". Use the existing date-words formatter in `timetrackFormatService.ts`. | the time box component in the sheet | phone only |
| 3.5 | One set of step buttons everywhere on the phone: −15 −5 +5 +15, plus the "5 / 15 / 30 min ago, 1 h ago" chips on Stop at…. One wording: the button says "Stop at…" and the screen title says "Stop at…". | sheet + Stop at… screen | **PC too** for the wording only, if the PC says "Stopped at…" |
| 3.6 | The new-timer sheet's top-right button says **START** while the timer has not started. CREATE stays for ⊕ past entries. | `EntrySheet.tsx:598` | phone only |
| 3.7 | D2: Billable is hidden on the phone, and the "Created with… · last updated…" footer is hidden on the phone. | `EntrySheet.tsx` | phone only |
| 3.8 | Picker rows are at least 44px on a phone (`touchRow`). | `pickers.tsx:766-770` | phone only |
| 3.9 | The tag picker on a phone is a full-width list inside the sheet with search on top. It opens **without** focusing the search box, so the keyboard stays down until the search box is tapped. | `pickers.tsx` around line 306 | phone only |
| 3.10 | "Create a new project" inline: the name box is full width on its own line and the buttons sit under it. Today it is 118px and the hint reads "Name your p". | inline project form in `pickers.tsx` | phone only |
| 3.11 | Uppercase plus `tracking-wide` is used only for small section labels (TODAY, YESTERDAY), never for buttons (DISCARD ENTRY becomes "Discard entry"). | `EntrySheet.tsx:598, 904, 912` | phone only |

**Done 2026-11-14.** Walked at 390×844 and 360×740; shots in `shots/phase-3/after/`.
- 3.1: Stop · Stop at… · Switched at… is one row under the chips: y 283–327 at 360×740, no scrolling.
- 3.2: two boxes (time, date words), a tap opens that box's wheels with a "Type start/end" field above them, a second tap closes them; running End reads "now", not tappable; "Edit duration" heading and link gone. Differed: the wheels start open on an existing entry (end for finished, start for running) as before, so "move the start back and Done" stays 4 taps; a new entry's sheet opens with them folded. Typing a time is now in the open box's panel, not in the box itself.
- 3.3: "Set to last stop time" and "Round stop time" are small outlined sentence-case buttons, hidden when they cannot act (no Round on a running entry).
- 3.4: boxes read "Today", "Yesterday", "Wed, 11 Nov" (`formatDayHeader`).
- 3.5 (PC too, wording): Stop at… on the phone steps −15 −5 +5 +15 with the 5/15/30 min and 1 h ago chips; its title says "Stop at…" on phone and PC (was "Stopped at…"). The PC keeps −5 −1 +1 +5.
- 3.6: the new-timer sheet's button says "Start"; ⊕ still says "Create".
- 3.7: Billable chip and "Created with… · last updated" hidden in the phone sheet.
- 3.8: project picker and task rows 44px on a phone.
- 3.9: tags open as a full-width list in the sheet with "Search or add a tag" on top, nothing focused (keyboard stays down), 44px rows, Done.
- 3.10: "Name your project" is full width (358px at 390), buttons under it.
- 3.11: no uppercase buttons left in the sheet.
- Guard tests changed on purpose: sheet order (Stop row now under the chips, no Billable), the "typeable chip" test became "a box opens its wheels; a second tap closes them", Create → Start for a new timer, and the "Stopped at…" dialog name → "Stop at…".
- PC check `shots/pc-after-3`: only the Stop at… title changed.

### Phase 4: The list, the run bar and the toasts

Reference shots: `before/A-04-list`, `A-16-rowmenu`, `A-20-swipeleft`,
`A-23-continuebtn`, `A-34-360-list`, `A-38-fix`, `A-41-barstop`, `c06`.

| # | Fix | Where | PC? |
|---|---|---|---|
| 4.1 | Compact rows of about 56px, so at least 8 fit at 390×844:<br>• line 1 is the name on the left and the length on the right;<br>• line 2 is the project dot and name with tags on the left, and the time range on the right;<br>• ▶ (continue) is a 44px target at the far right.<br>A grouped row shows its first start and last end. | row face, `phone/PhoneEntryList.tsx` around line 560 | phone only |
| 4.2 | D2: no ⋮ on rows. Every action from the row ⋮ that the sheet's ⋮ lacks moves into the sheet's ⋮. PC-only items (Copy start link, Select) are dropped on the phone. | `PhoneEntryList.tsx`, `EntrySheet.tsx` ⋮ menu | phone only |
| 4.3 | The running entry shows at the top of today as a row reading "Reading · since 19:10" with a live length. The run bar shows the project dot and "since 19:10" under the name. With only a running entry and nothing else, the empty area says what to do next (shot `c06`). | `PhoneEntryList.tsx`, `phone/RunBar.tsx` | phone only |
| 4.4 | Swipe triggers at 40% of the row width or on a fast flick. The coloured "Continue" or "Delete" label fills in as the threshold is passed. | `SWIPE_FRACTION`, `phoneListService.ts:39-43` | phone only |
| 4.5 | One toast style for delete, continue, fix and neighbour moves:<br>• one toast at a time, with the newest replacing the old;<br>• names cut to 30 characters with "…";<br>• sentence case "Undo";<br>• close and Undo targets at least 44px.<br>The toast never covers the run bar. | the tracker's toast/Undo components (find through `useUndo` / `undoContext.ts`) | phone only; **PC too** for the 44px close target only |
| 4.6 | Stopping from the run bar gets the same Undo toast as continue and delete. | `RunBar.tsx` | phone only |

**Done 2026-11-14.** Walked at 390×844 and 360×740; shots in `shots/phase-4/after/`.
- 4.1: rows are 56px, two lines (name · length / project, tags · times), ▶ 44×44 at the far right. 8 rows fit fully at 390×844 (with the running row on top), 6 at 360×740. A grouped row shows its first start and last end (the seed has no groups; covered by code, not seen).
- 4.2: no ⋮ on phone rows. The sheet's ⋮ gained Duplicate, Split in two (finished entries over 10 min), Add/Remove favorite and Go to <project>; Copy start link and Select are gone from the phone (so the phone's bulk select has no way in now, as D2 implies).
- 4.3: the running entry heads today as "Writing script · since 20:55" with its live length; tap opens its sheet. The run bar shows "Content  since 20:55". With only a running entry the list says "Only this timer so far today. Tap ■ below to stop it, or ⊕ above to add time you already worked."
- 4.4: swipe acts at 40% of the row or on a flick (≥48px at ≥0.6px/ms); the label is pale before that and fills in once letting go would act (not armed at 30%, armed at 45%).
- 4.5: on a phone the shell's toasts and the delete Undo are one bar in the bottom block above the run bar (never over it), one at a time, newest replaces; names cut to 30 characters ("Client call about the very lo…"); "Undo" sentence case; Undo and ✕ 44px. PC too: the floating toast's ✕ is 44×44 with no change to the toast's look.
- 4.6: ■ on the run bar now offers "Stopped “…” · Undo"; Undo runs it again from its own start.
- Guard tests changed on purpose: swipe threshold (75% → 40% and flick), "a running-only day shows nothing" became the running row and its hint, "a row's ⋮ holds…" became "no row ⋮; the sheet's ⋮ holds…".
- Tap counts: delete and Undo is 2 taps with a 40% swipe (was 75%).
- PC check `shots/pc-after-4`: clocks only, and the toast ✕ hit area.

### Phase 5: Calendar

Reference shots: `before/B-02-cal`, `B-03-cal-pagescrolled`, `B-11-cal-360`,
`B-12-resize`, `B-15-week`.

| # | Fix | Where | PC? |
|---|---|---|---|
| 5.1 | For today, the calendar opens scrolled so that now sits about one third down, as the PC already does. Remove the `!isMobile` guard for today. | `CalendarView.tsx:325` | phone only (copies the PC) |
| 5.2 | The grid fills the height left between the header and the run bar (`dvh` based). The page itself does not scroll on the Calendar tab. Remove the `max-h-[70vh]` cap on the phone. | `CalendarView.tsx:860` | phone only |
| 5.3 | "Connect calendar" moves to Settings › Integrations on the phone. The two-line hint shows until dismissed once (✕, remembered in localStorage inside try/catch). | `CalendarView.tsx:802-806` | phone only |
| 5.4 | D2: Day\|Week toggle hidden on the phone; Day only. | `CalendarView.tsx` | phone only |
| 5.5 | Block labels 12px on the phone (today 10px). | `CalendarView.tsx:1025` | phone only |
| 5.6 | − / + zoom on the phone, copied from the PC, so the owner can fit a whole working day. | `CalendarView.tsx:820` (`!isMobile`) | phone only (copies the PC) |
| 5.7 | When a block's panel is open, the grid scrolls so the block's bottom resize handle stays above the panel. | phone calendar panel | phone only |
| 5.8 | Keep the drag-to-move and swipe-to-change-day as they are. They work well. | (no change) | — |

**Done 2026-11-14.** Walked at 390×844 and 360×740; shots in `shots/phase-5/after/`.
- 5.1: today opens with now about a third down, as on the PC (at 21:35 the grid is at its end, so now sits lower: there is no more day to show).
- 5.2: the grid is measured and fills down to the bar (`calc(100dvh − its top − --phone-bar − 1rem − 1px)`); the page itself scrolls 0px on the Calendar tab at both sizes. The 70vh cap and PhoneTracker's own cap are gone on the phone.
- 5.3: "Connect calendar" is not on the phone's calendar (Settings › Integrations has it). The how-to line has a ✕ and stays hidden after a reload (`timetrack:calendar-hint-gone`, inside try/catch).
- 5.4: no Day | Week on the phone.
- 5.5: block labels 12px on the phone, 10px on the PC. Found and fixed in passing: putting the size class after `leading-tight` made tailwind-merge drop the line height, which changed the PC blocks; the size now comes first.
- 5.6: − / + zoom (44px) on the phone; two taps on − show 11:00–23:00 (13 hours) at 390×844.
- 5.7: after choosing a block, the grid scrolls so its bottom edge sits above the panel (block bottom 488, grid bottom 594, panel 610).
- 5.8: swipe to the next day and drag still work.
- PC check `shots/pc-after-5`: clocks only.

### Phase 6: Reports, Projects, Settings, header icons, Pomodoro

Reference shots: `before/B-22`, `B-24`, `B-26-*`, `B-31`…`B-44`, `A-37-pomodoro`.

| # | Fix | Where | PC? |
|---|---|---|---|
| 6.1 | D2: Details on the phone shows only Summary and Detailed. The Billable hours and Amount cards hide until any rate exists. The header keeps the Download icon inside Details instead of switching to ⊕. | `ReportsView.tsx`, `phone/PhoneReports.tsx` | phone only |
| 6.2 | Short report:<br>• bars are coloured by project (stacked);<br>• today's bar is marked;<br>• tapping a bar or a project row opens Detailed filtered to that day or project;<br>• the total shows once (drop the donut-centre copy).<br>Keep the date-range sheet as it is. | `phone/PhoneReports.tsx` | phone only |
| 6.3 | Projects list:<br>• compact rows of dot, name and this month's hours;<br>• no "No client" line.<br>Project page on the phone:<br>• default period "This month";<br>• revenue, profit and burn-up hidden when they are empty or zero. | `ProjectsView.tsx`, `projectDashboardService.ts` | phone only |
| 6.4 | Settings on the phone is a list of sections (Profile, Workspace, Automation, Integrations, Data). Each opens its own screen with "←", instead of a tab strip that runs off screen. The title shows "Import and export" in full, wrapping or shortening to "Import/export". | `SettingsView.tsx` | phone only |
| 6.5 | D2: the Team tab is hidden on the phone (Clients and Tags remain). | `ManageView.tsx` | phone only |
| 6.6 | Header icons on the phone:<br>• D2: the bell shows only when an alert has fired;<br>• ⊕ shows only on Timer and Calendar;<br>• the sync dot shows a short word beside it ("Offline", "Saving…", "Not saved") whenever it is not in sync, and nothing when all is saved. | `PhoneTracker.tsx` header | phone only |
| 6.7 | Pomodoro: a clear Start button under "Ready? 0:25:00". Settings for the lengths go under a "Settings" fold. | `phone/PomodoroPanel.tsx` | phone only |

**Done 2026-11-14.** Walked at 390×844 and 360×740; shots in `shots/phase-6/after/`.
- 6.1: phone Details shows Summary and Detailed only; Billable hours and Amount cards hide until any rate exists (workspace, member or project); the header keeps ⬇ inside Details, and it downloads what Details shows (`ReportsView` `downloadRef`).
- 6.2: day bars are stacked by project; today's bar has a ring and an orange label; a bar opens Detailed on that day, a project row opens Detailed filtered to that project; the donut's centre total is gone (the total shows once, above). Date-range sheet unchanged.
- 6.3: Projects list rows are dot · name · this month's hours (53px), with a "This month" heading; the client/template/recurring line shows only when there is one. A non-recurring project's page on the phone shows this month and steps whole months; Revenue/Profit tiles hide while they are zero, the burn-up hides while nothing is tracked in the month. Differed: the project page's header line still says "No client" (only the list was named).
- 6.4: Settings on the phone is a list of five sections with a one-line hint each; a section opens with "‹ Settings" back to the list; ⚙ › Import and export opens that section directly, titled "Import/export" (it was cut to "Import and…").
- 6.5: no Team on the phone (Clients and Tags remain).
- 6.6: the bell shows only once an alert has fired; ⊕ only on Timer and Calendar; ⬇ on Reports; the sync badge shows nothing when synced and its short word ("Offline", "Saving…", "Not saved") otherwise. The lab is "This device only", so its dot stays.
- 6.7: Pomodoro has one big Start (turns Pomodoro on and starts; "Start Pomodoro" while a timer already runs), a line with the lengths, and the settings folded under "Settings".
- Guard tests changed on purpose: Details tabs on a phone; the Swipe actions switch is reached through Settings › Profile.
- PC check `shots/pc-after-6`: clocks only.

### Phase 7: Rename to Time Log (PC and phone)

Replace the visible name "Time" / "Time tracker" with **Time Log**. Leave
"Time & energy audit", unrelated "Time" labels (admin table, session detail)
and code identifiers alone.

Known places (grep again; this list is from 2026-11-14):

- `components/navTabs.ts:171`: `label: "Time Log"`. Short label `"Time Log"` if it fits the phone tile, otherwise `"Log"`. Check at 360px.
- `src/hometab/components/HomeCards.tsx:104`: card title.
- `app/(app)/time/page.tsx:14`: `metadata.title`.
- `src/timetrack/components/TimetrackScreen.tsx:107`, `TrackerLoading.tsx:53`, `TogglLab.tsx:1115`, `phone/PhoneTracker.tsx:349` (sr-only h1), `app/test/toggl/page.tsx:36`.
- `src/timetrack/runningTimerService.ts:116` and `hooks/useTimetrack.ts:803`: notification fallback "Time tracker" becomes "Time Log".
- `src/timetrack/config.ts:243`: check what this label is before changing it.
- `docs/product/map.md`: the `timetrack/` entry and the nav lines that say "Time".
- Tests: update e2e/unit tests that find the tracker by the name "Time". Keep their reasons.

The tab names (Timer · Calendar · Reports) stay (C2).

**Done 2026-11-14.** Checked signed in on the local test stack (throwaway account `tlp-phase7@example.test`) at 390×844, 360×740 and 1280×800; shots in `shots/real-p7/`.
- Renamed: the Home tile and the More/All tools label (`navTabs.ts`, "Time Log" as both label and short: it fits the 360px tile, 54px wide), the Home card title and its "Open Time Log" button, the page title and the tab's idle title, the tracker's heading (PC header, phone sr-only, loading header, logged-out page, lab page), and the notification fallback "Time Log". `config.ts:243` is the chart metric "Time" (unrelated) and stayed. `docs/product/map.md` names Time Log.
- Tests that found the tracker by its heading or title now say "Time Log": 5 unit files, 4 e2e files (the e2e suite was not run here; the change is the heading and title name only).
- Also seen on the real route: `/time` serves `<meta name="theme-color" content="#1f2937">` (2.4), and the phone header shows no sync dot when everything is saved (6.6).
- PC check `shots/pc-after-7`: only the "Time" → "Time Log" title and the clocks.

### Phase 8: Prove it (no new features)

1. Run the real `/time` signed in on the local test stack (finding B5) at 390×844 and 1280×800.
2. Walk the everyday tasks on the phone and re-measure the tap-count table:
   - start a named timer;
   - fix a forgotten timer;
   - change the start and end of a finished entry;
   - rename;
   - change project;
   - add a past entry of 1:30 that ended now;
   - delete and Undo;
   - create, move and resize a calendar block;
   - read this week's report.

   No task may take more taps than before.
3. Repeat the PC check against `pc-before/`. Every difference must be one listed above as **PC too** or the rename.
4. Adversarial audit (memory `prove-fixes-with-adversarial-audit`). Run three fresh agents with no access to this plan's conclusions:
   - **bugs**: break the changed flows;
   - **findability**: can a first-time user find each action on the phone;
   - **PC unchanged**: diff the PC screens.

   Fix what they confirm, then re-walk.
5. Report to the owner in plain words:
   - done or not;
   - the before/after tap table;
   - phone screenshots of the common flows, before and after, on one short artifact page (memory `short-artifacts`).

   Ask him for three things on his phone:
   - the keyboard with the entry sheet (B2);
   - a wheel swipe (B3);
   - one screenshot of the list, to check the letter gaps (B4).
6. Move this plan to `Plans/ARCHIVE.md` per memory `plans-archive`.

**Done 2026-11-14.**
- Real `/time`, signed in on the local test stack, at 390×844, 360×740 and 1280×800: see Phase 7 (`shots/real-p7/`).
- Tap counts, re-measured in the lab (`work/taps.js`, `shots/phase-8/taps/`): start a named timer 2 (idle bar, Start); fix a forgotten timer 4 (= 4); change the start and end of a finished entry 6 (was 8); rename 3 (= 3); change project 4 (= 4); add a 1:30 entry that just ended 3 taps plus typing, giving 20:05–21:35; delete and Undo: a 40% swipe and 1 tap (= 2, was a 75% swipe); this week's report 1; calendar: hold, name, Done, then hold-drag to move and to resize. No task takes more taps than before.
- PC: `shots/pc-after-8` vs `pc-before` shows clocks and the rename only.
- Adversarial audit, three fresh agents (reports in `audit/`):
  - **PC unchanged** (`audit/pc.md`, 44 screens plus 900px): 0 differences outside the allowed list.
  - **Bugs** (`audit/bugs.md`): 7 confirmed, all fixed except where said: (1) a held finger turned the End wheel of the sheet it opened, saving a 24.5 h entry; fixed at the root: the sheet ignores the opening finger's touch click for 400 ms, and a held block's wheels start folded; (2) ⋮ Duplicate, Split and Go to dropped unsaved edits; they now save first; (3) a double tap on ■ or ▶ acted twice; the bar and ▶ take one tap per 700 ms after a change; (4) Back on a held block left a junk entry; now removed as with ✕; (5) a typed Start then Done did nothing the first time, because a shortcut appeared and moved Done; the shortcut's room is kept; (6) Back left the tracker from report Details, a report's day or project, the date sheet, a Settings section and the calendar block panel; each is now a history step (`hooks/useBackCloses.ts`). **Not fixed:** Back from the Stop at… / Switched at… pickers still leaves the tracker; a history step there raced the sheet's own step and closed the picker at once, so it was reverted; (7) the sheet's Stop now offers Undo; End now + Done still does not.
  - **Findability** (`audit/findability.md`): every task found; Projects, create project 4 taps behind ⚙. Fixed: Duplicate and Split now say so in a toast; the tag list's button says "Close" (two "Done" showed); the Reports Projects/Clients switch is 44px. **Left as found, not in this plan:** Pomodoro has no Stop on its own screen; Projects sit only behind ⚙; the phone calendar shows 4–5 hours until zoomed out; a past entry that overlaps the running timer gets no overlap mark and its time counts twice in the day total; the new-timer sheet's clock counts before Start (Toggl's way, D-START); the project page from a report row shows a filter badge, not the project's name.
- Guard tests for the audit fixes: `thePhoneSheetOpensWithOneTap` ("the audit's fixes": ⋮ Duplicate keeps a typed name; a double tap on ■ starts nothing; Stop in the sheet offers Undo).
- Unit suite 7159/7159, type ratchet "88, none new" before the last push. The e2e suite was not run in this plan (its four files changed only the tracker's name).

## Execution prompt for the next session

> Carry out `Plans/time-log-phone.md`, Phases 0 through 8, in order. Read the
> whole plan first, then the memories it names (worktree-e2e-servers,
> typecheck-before-push, review-means-feel-look-bugs,
> prove-fixes-with-adversarial-audit, no-removal-until-owner-says,
> vercel-late-deploy-rollback). The owner's decisions D1–D3 are final; do not
> ask him again. Work in a git worktree, ship each phase as one fast-forward to
> main, and never touch the live database. Use the lab at /test/toggl seeded
> from ~/.cache/daygame-research/time-log-phone/state-seed.json with the
> Playwright helper lib.js there (not the MCP browser). The rule above all
> others: nothing may change on the PC except the items marked "PC too" and
> the rename. Prove that with the before/after PC screenshots every phase.
> A phase is done only when you have walked each item by hand at 390×844 and
> 360×740 (and 390×480 for keyboard items) and looked at the screenshots
> yourself. Under each phase in the plan, write what you did, what you found
> that differed from the plan, and the commit. If an item proves wrong or
> impossible, note it and continue; never stop to ask unless something would
> delete real data or cost money.
