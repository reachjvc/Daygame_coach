# Time tracker: work like Toggl Track, screen by screen and tap by tap

Written 2026-11-05. Replaces the "Compared with Toggl" part of `Plans/time-tracker-like-toggl.md`, whose
Phases 0–6 are live and whose AUDIT section still holds. Decision page (mark any decision "No"):
**https://claude.ai/artifact/PybynaCaxXTSw7KEZoqjPm** (marks database: collection `marks`, see Part 2).

---

## Only you decide these — your answers

Asked once, on 2026-11-05, at the end of planning. The executing AI uses these answers and asks nothing
else unless a NEW item of this kind comes up.

| # | What | Your answer |
|---|---|---|
| O1 | **Your live database, once, in Phase 0.** The running-timer notification (built, not live) needs one change: a per-device on/off switch, two new notification kinds, and the minute clock learning to ring a 6-hour alert. Nothing is deleted. A backup is taken first and a written undo exists (`supabase/migrations/rollback/20261104160000_running_timer_notification.down.sql`). Also: if a later phase needs another change of the same kind (additions only, backup first, undo ready), it may go ahead. None is expected: new settings fit in the existing settings column. | **Yes to both** (2026-11-05). Apply the notification migration in Phase 0, and any later additive migration with backup and rollback, without asking. |
| O2 | **Your new Toggl account.** Each phase is compared with Toggl in the browser window you signed in to on 2026-11-05. The AI may add and delete test entries in that account. It never upgrades, pays, invites anyone or changes the account. | **Yes** (2026-11-05). |
| O3 | **The advice to rebuild the whole app from scratch** (memory `project-rewrite-with-jacob`). This plan changes the time tracker inside the current app. If you rebuild later, the research, this plan, the decision page and the test list carry over; the code does not. | **Go ahead now** (2026-11-05). |

**Money:** none. Nothing is bought, rented or subscribed to. The Toggl account is on a free 30-day trial
that asked for no card; nobody clicks "Upgrade". **Deleting your data:** none. **Public:** nothing new.
Toggl's pictures and videos stay in `~/.cache/daygame-research/toggl/`, never in this public repo.
**Cannot be undone:** nothing. Each phase is its own push and can be reverted.

---

# PART 1 — In plain words

## What you asked

"A copy of Toggl Track, which I would later change dramatically." Today /time is only Toggl-like. It was
built from Toggl's help-page text by an AI that never saw Toggl. This plan makes it work like Toggl Track,
screen by screen and tap by tap: like the web app on a PC, and like the Android app on a phone. It copies
layout, flows, tap counts, keyboard shortcuts, defaults and the words on controls. It does not copy Toggl's
logo, name, illustrations, icons, colours or marketing text, because this app will be sold.

## What went wrong last time, and the rule each failure sets

| # | What happened (2026-11-03/04) | Rule in this plan |
|---|---|---|
| 1 | Built from a description: layout and tap counts were guessed. In Toggl's Android app one tap on the running timer opens the wheel; here it puts the cursor in the name, and the drums sit in a sheet you could not find. | Every Toggl claim below cites something seen: a frame with its time, a screenshot, a source file, or the live app. |
| 2 | 36 bugs found by auditors, 15 more by reviews, all fixed; nobody asked "is this how Toggl does it?" or "can a user find this?". | Every phase: side-by-side screenshots against Toggl, and a fresh agent that gets only the task and must find the feature. |
| 3 | Reports said what changed, not where. | Every report shows each new thing with a screenshot and the taps to reach it. |
| 4 | Too many round trips: a board to mark, a demo, ten scenarios, a database yes that stalled a finished phase. | Design and technical questions are decided here. Your only answers are O1–O3 above. |
| 5 | You found bugs after every "done". | A six-agent adversarial audit before "done". Until you have used a feature it is "built" or "live", never "works". |

## Doubt first

- **There are now two Toggls.** "Toggl Track" (what you asked for) and a new product called "Toggl"
  (focus.toggl.com, out since October 2025). A sign-up today lands in the new one. Your account is a
  new-product account, and Toggl sends it away from the Track pages. So:
  - **Phone:** copied from Toggl Track's Android app, version 8.4–8.7, seen in Toggl's own help-page
    recordings (made 2025-12-12) and a reviewer's recording from 2026-10-06. Nobody here has touched the
    app itself. You decided on 2026-11-05 not to sign in to anything more, so a phone simulator was dropped.
  - **PC:** Toggl Track's web app as seen in a 2025-10 video, checked live against the new product. The
    timer page of both has the same layout (sidebar, timer bar, week row, Calendar | List view), so the
    live account stands in for Track. Where they differ, Track wins and the page says so.
- **Toggl's current wheel was seen only in pictures, never touched.** How it feels under a finger (speed,
  snapping) comes from Toggl's old public code (last changed 2020-12-24). Your drums replace the wheel
  anyway, so this matters only for the small rules (1-minute steps, a tick per minute).
- **The phone screen changes a lot.** The timer moves from the top to a bar at the bottom, five tabs
  become three, and Projects moves under the gear. That is the point (it is how Toggl is laid out), but
  your hands will look in the old places for a few days.
- **Many browser tests check the old layout**, and they will be rewritten. A rewritten test can hide a
  lost promise. Rule: a test may change where it clicks, never what it promises. The six-agent audit at
  the end is there because of this.
- **The 24-hour two-device test run did not finish.** It stopped at minute 403 of 1,440 because another
  session rebuilt the shared test database. In those 403 minutes it found one new bug: on the phone the
  running bar showed an empty name while the list showed the timer running (minute 253). Phase 0 fixes it
  and reruns the test.

## The short answer: what changes, by screen

**Phone (like Toggl Track for Android):**
1. **Timer tab:** a header "Timer" with ⊕ (add a past entry) and ⚙ (settings). Below: "List view |
   Pomodoro", then your entries by day. At the bottom, above the tabs, a bar: "I'm working on…" with ▶.
   While a timer runs, that bar shows the time, the name and the project, with a round ■ that stops it.
2. **Three tabs:** Timer · Calendar · Reports. Projects, tags, clients and settings move under ⚙.
3. **One tap on the running bar opens the entry with your drums already showing**, where Toggl shows
   its wheel. The same happens when you tap any entry in the list. Above the drums sit the start and end
   ("9:49 am 12-12 → now"). Below them come "Set to last stop time", "Round stop time", −15 −5 +5 +15, a
   big Stop, your "Switched at…", and "Delete time entry" at the bottom. ✕ closes and asks "Discard
   changes?" if you changed something. DONE saves.
4. **Swipe an entry right to continue it, left to delete it** (with Undo for 5 seconds). ▶ on a row
   still continues it in one tap.
5. **⊕ adds a past entry:** 30 minutes ending now, ready to adjust.
6. **Calendar tab:** day header with the total, a week strip, the hour grid. Tap a block: Delete · Edit ·
   Duplicate · Continue. Long-press empty space to add one; drag the edges.
7. **Reports tab:** date chips, a "Tracked hours" card, bars per day, and a donut by project.

**PC (like Toggl Track on the web):**
8. A left sidebar instead of the tab row. The timer bar runs across the top, and below it: "‹ This week ·
   W45 ›", the week total, and Calendar | List view.
9. **One click on the running time** makes it typeable and opens a small box with Start and Stop. Type
   "90" and the timer started 90 minutes ago.
10. **The list edits in place:** click a name, a start, a stop or a duration and type. ▶ and ⋮ show on
    hover. Delete has no "are you sure" and shows Undo.
11. **Manual mode** with the switch next to Start, or the M key: "What have you done?", start → stop, +.
12. **Calendar:** Week / 5 days / Day, drag on empty space to add (15-minute steps), drag the edges, and a
    box beside the block to edit it.
13. **Shortcuts:** they already match Toggl's (S, N, M, C, 1–9, and Shift+? for the list); T for "today"
    in the calendar is added.

**Both:** Toggl's words on the controls, Toggl's defaults (for example duration shown as 0:47:06), and the
running-timer notification on your phone (built, waiting for O1).

**Your own changes to the copy stay:** the drums instead of the wheel, and planned entries that are
striped and not counted. Each now sits where Toggl puts its counterpart.

---

# RESEARCH — what was looked at

Everything is in `~/.cache/daygame-research/toggl/`; `INDEX.md` there lists every file. Cited below as
`[key]`.

| Key | Source | Date / version | What it shows |
|---|---|---|---|
| H25 | Toggl's help article "Toggl Track Timer for Android": images and screen recordings in it (`evidence/help-android/`, frames in `frames/android2026/help_14`, `help_18`, `help_28`) | Recorded 2025-12-12, About screen "8.4.0 (52256487)" | Running bar, the sheet with the wheel open, the clock picker with ±5/±15, calendar action bar, reports, settings |
| V1 | Reviewer recording "ToThePoint Guide", youtube `w-qcztYYdro` (`frames/android/w-qcztYYdro/`) | Uploaded 2026-10-08 | Timer tab, start sheet, manual sheet, @ projects, continue, calendar tab, reports, settings |
| V2 | "Localization Academy", youtube `em_39ElBT-4` | 2020-09-23 | The old Android wheel up close, swipe to continue, the old edit screen |
| SRC | Toggl's old mobile app code (`toggl/mobileapp`, now 404; fork `moljac/mobileapp`, `source/mobileapp`) | Last upstream commit 2020-12-24 | Wheel mechanics, calendar gestures, defaults, every string |
| ST | Google Play and App Store listings, release notes (`store/`) | Track Android 8.7.0, 2026-10-09 | Timeline of UI changes 2024–2026; Play screenshots are from ≤2023 |
| W25 | Web videos, main one "TOOL" youtube `TUEVT_Sxivc` (`frames/web/`) | 2025-10-15 | Track web timer page, running popover, list, calendar, menus, reports |
| LIVE | The new product's web app, driven in your signed-in browser (`shots/web-*.png`) | 2026-11-05 | Clicks and typing checked for real: running popover, "90", drag-create, inline list, shortcuts |
| HELP | 179 Track help articles (`help/`) | read 2026-11-04 | Wording, shortcuts, typed formats, edge rules only |
| OURS | Our `/test/toggl`, signed out, 1440×900 and 390×844 (`ours/`, `notes/ours-today.md`) | 2026-11-05, main f5b24dea (shared working tree) | Today's screens and tap counts |

**Not seen anywhere:** Track Android's current calendar gestures (layout seen, gestures from SRC and HELP);
what the "Prompt running entry override" setting does; Track web with a live account; the Android
notification itself (only its switches). The page marks each claim that rests on these.

---

# COMPARISON — every daily screen and flow

"Taps" counts from the main screen of that device. The decision column names the decision ID on the page.

| Flow | Toggl Track does (source) | /time today (OURS) | Gap | Change (phase) |
|---|---|---|---|---|
| **Phone: Timer tab** | Header "Timer" ⊕ ▢ ⚙; tabs "List view \| Pomodoro"; day headers "TODAY 0:30:04"; rows: name, ● project • client, $ duration, ▶; "+ Add favorite"; bottom bar "I'm working on…" + round ▶; tabs Timer · Calendar · Reports [V1 0:05, 4:33; H25 #02, #03] | "← Dashboard · Time" header; the timer card first (name, Project, Tags, $, duration, ☆, ✎, Start); "Started at… · Stop at… · Switched to something else?" under it; "This week · Group similar entries"; day cards; five tabs Timer · Calendar · Reports · Projects · More | Timer at top vs bottom; 5 tabs vs 3; settings in More vs ⚙ | D-PHONE-SHELL (P1) |
| **Phone: stop** | Round red ■ at the right of the bottom bar, 1 tap [V1 4:33; H25 help_14] | Stop in the top card, 1 tap | Position | D-PHONE-SHELL (P1) |
| **Phone: tap the running timer** | 1 tap anywhere on the bar except ■ opens the entry sheet **with the wheel showing** [H25 help_14 f001→f010] | Puts the cursor in the name; the drums need ✎ then the sheet | Drums 2+ taps away and hidden | D-SHEET (P2) |
| **Phone: the entry sheet** | ✕ … DONE; big "0:00:11 ✎"; "I'm working on…"; chips project ×, "# Add tags", "✓ Billable"; "⏱ Edit Duration": "9:49 am · 12-12 → 9:49 am"; the wheel; running: big ■ "Stop"; "DELETE TIME ENTRY" at the bottom [H25 help_14, help_18] | "Time entry details": name, Project, Tags, $; drums for Start; "End: Still running · Stop at…"; date stepper; Start / End / Duration boxes; −5 +5; "Start where the last one ended"; "End now"; a hint; "Duration only" | Order; no DONE/✕ pattern; drums not under the times; Toggl wording | D-SHEET, D-DRUMS (P2) |
| **Phone: fix a time by typing** | Tap a time → Android clock dial with "-15 min · -5 min · +5 min · +15 min", Cancel / OK [H25 help_18]; tap ✎ by the big duration to type it; tap the wheel's centre to type digits that fill from the right (130 = 1:30) [SRC] | Start / End / Duration boxes with a number keypad; −5 +5 | ±15 missing; digits-from-the-right missing | D-DRUMS (P2) |
| **Phone: set start to the last stop** | "SET TO LAST STOP TIME" under the start, "ROUND STOP TIME" under the stop (back since 2026-01-15) [V1 1:53; ST] | "Start where the last one ended" | Wording, place | D-SHEET (P2) |
| **Phone: start** | Tap "I'm working on…" → sheet (✕, CREATE, "0:00:00 ✎" already counting, "@ Add a project", "# Add tags", "$ Billable"); @ and # list projects and tags inline; CREATE → running. ▶ on an empty bar starts at once [V1 1:37–2:02; V3 9:58 (2021)] | Tap the name in the top card, type, Start (2+ taps); @ and # suggest | Sheet vs inline card | D-START (P3) |
| **Phone: continue / switch** | ▶ on a row continues it, 1 tap, the running one stops [V1 1:24–1:25]; swipe right = Continue, swipe left = Delete + Undo 5 s; setting "Cell swipe actions" on by default [V2 3:55; H25 #33; HELP] | ▶ on a row, 1 tap; "Switched to something else?" field; no swipe | Swipes missing | D-SWIPE (P3) |
| **Phone: add a past entry** | ⊕ in the header → sheet "0:30:00", "I've worked on…", start = now − 30 min, stop = now, CREATE; 2 taps [V1 0:14, 2:52, 5:45; H25 "Manual Mode" image] | The pencil/clock icon in the timer card switches it to start – end boxes; 5 taps (icon, name, start, end, Add); no confirmation or Undo after Add [OURS G-phone-01..03] | 5 taps vs 2; no feedback | D-MANUAL (P3) |
| **Phone: calendar** | "Calendar" ⚙; "WEDNESDAY, DEC 10 · 7:05:00"; week strip, today circled; hour grid; now line; bottom bar. Tap a block → panel: name, project, "12:25 am – 6:15 am", Delete · Edit · Duplicate · Continue, Cancel. Long-press empty = 30-min entry; drag handles; snaps to 15 min or a neighbour's edge; pinch zoom; swipe days [V1 2:14; H25 #21; SRC; HELP] | Long-press create, hold to move, both edges, day swipe, planned striped (Phase 6 of the last plan) | Header, week strip, action panel, neighbour-edge snap | D-PHONE-CAL (P4) |
| **Phone: reports** | "Reports" ⬇ ⚙; activity heat-map; chips "This week · Team · Projects · Clients · Billable"; date sheet "Today · Yesterday · This week · Last week · This month · Last month" + month grid; "TRACKED HOURS" total / billable % / amount; bars per day; "GROUP BY Projects \| Clients" donut [H25 help_28; V1 2:18–2:30] | The PC's reports squeezed onto the phone (see the next row) | Order and parts | D-PHONE-REPORTS (P4) |
| **PC: page layout** | Left sidebar (TRACK Timer; ANALYZE Reports; MANAGE Projects, Clients, Tags…; ADMIN Settings); timer bar on top; row: "‹ This week · W37 ›", WEEK TOTAL, "Week view ▾", Calendar \| List view \| Timesheet, ⚙; Calendar is the default view [W25 9:44; LIVE web-02] | Horizontal tabs Timer · Calendar · Reports · Projects · Manage · Settings; timer bar; "This week · Group similar entries"; list | Sidebar; views on the Timer page | D-PC-SHELL (P5) |
| **PC: start / stop** | Type the name, Enter starts; red ■ "Stop timer S"; sidebar "Timer" becomes a live clock with ✎ [LIVE web-05; W25 13:22] | Type, Enter or Start; Stop | Sidebar clock | D-PC-SHELL (P5) |
| **PC: fix a forgotten timer** | 1 click on the running time → editable, plus a box START (editable) · STOP (greyed) · date; "90" + Enter → started 90 min ago [LIVE web-06, web-07; W25 13:03 "Adjust duration"] | Typing a duration works; start/stop via "Started at… / Stop at…" row or the sheet with drums | The box, 1 click | D-PC-RUNNING (P5) |
| **PC: list** | Name, project, tags, $, start, stop, duration each edit in place on 1 click; ▶ ⋮ on hover; group badge "2" with ›; day header "Today Thu, Nov 5 +" with total; ⋮: Split, Pin as favorite, Go to project, Copy description, Copy start link, Duplicate, Delete [LIVE web-11, web-12; W25 13:54, 15:31] | Day cards; each cell already edits in place; a row click opens nothing; ⋮: Duplicate, Split in two, Add to favorites, Copy start link, Edit details…, Go to ‹project›, Delete. A new start typed in a row moves the whole entry; typed in the sheet it keeps the end [OURS F-pc-*] | Menu order and words; two rules for one action | D-PC-LIST (P5) |
| **PC: manual mode** | Switch beside ▶, or M: "What have you done?", "8:09 PM Today → 8:09 PM", "+" "Add time entry" [W25 GPAST 0:45–1:26; LIVE web-13] | The pencil/clock icon or M switches the bar to start – end boxes, date, "Add"; 5 clicks; typing a length while idle logs it in 2 [OURS G-pc-01..05] | Place of the switch, words | D-PC-MANUAL (P5) |
| **PC: shortcuts** | S stop, N new, M manual, C continue, 1–9 favourite, T today; Shift+? shows the list; only with no field focused [HELP; LIVE web-03 (new product: S starts too)] | S, N, M, C, 1–9, @, #, and a "Keyboard shortcuts" list on Shift+? [OURS L-pc-01] | T missing | D-PC-KEYS (P5) |
| **PC: calendar** | Week / 5 days / Day; − + zoom; drag on empty = new entry in 15-min steps with a box "Add description · project · tags · $ · date · start → end · duration"; drag edges; drag to move; click a block → box beside it; now line [LIVE web-14, web-08; W25 10:48, 12:14, 12:28] | Drag create, move, both edges (last plan's Phase 6) | Box beside the block; views | D-PC-CAL (P6) |
| **PC: reports** | Summary · Detailed · Workload; "This week"; cards Total / Billable / Amount / Average daily; bars per day; project donut; breakdown table [W25 19:52; LIVE web-15] | Summary · Detailed · Workload · Profitability · My reports; Toggl's four cards; "Tracked over time"; Breakdown donut; Grouping [OURS J-pc-01] | Already close; words only | D-PC-REPORTS (P7) |
| **Phone: reports today** | (see Phone: reports) | The PC's reports squeezed onto the phone: Summary · Detailed · Workload · Profitability tabs, four cards, a bar chart [OURS J-phone-01] | Toggl's phone reports are a different, shorter screen | D-PHONE-REPORTS (P4) |
| **Projects and tags** | @ in the name lists projects ("No Project", by client, "+ Create project"); # lists tags; PC pickers "Search by project, task or client" + "+ Create a new project", tags "Add/filter tags" + Create, Ctrl+Enter [V1 0:32; W25 11:07, 11:28; HELP] | @ and # suggest; Project and Tags buttons | Wording, create row | D-PICKERS (P6) |
| **Delete and undo** | No question; toast "The time entry was deleted. UNDO" (web), "Time entry was deleted" + UNDO 5 s (Android) [W25 GDEL 1:06; SRC] | ⋮ → Delete, 2 taps, no question, Undo in a toast; no swipe on the phone; edits (sheet, list cell, calendar move or resize) give no Undo [OURS M-*] | Wording; swipe | D-WORDS (P7), D-SWIPE (P3) |
| **Settings and defaults** | Duration "Improved (0:47:06)"; date format; 24-hour clock; first day of week; group similar entries on; "Cell swipe actions" on; "First tab"; "Haptic feedback"; notifications "Running timer", "Stopped timer" [V1 3:17–3:26; H25 #33, #41, #43] | Settings section (More on phone) | Place, a few switches | D-SETTINGS (P7) |
| **Running timer in the notification shade** | Switches "Running timer" and "Stopped timer" [H25 #41]; off in a fresh account [V1 3:26]; help names no buttons, old code has none [HELP; SRC]; the notification itself never seen | Built (Phase 7 of the last plan), not live: on for the installed phone app, silent, with Stop | Ours does more: your change | D-NOTIFY (P0, P7) |

---

# DECISIONS — taken, each with its reason and the alternative

The page shows each one with pictures. Marking one "No" makes the executing AI do the alternative.

| ID | Decision | Reason | Alternative (if you mark No) |
|---|---|---|---|
| D-SCOPE | Copy **Toggl Track** (Android 8.4–8.7, web as of 2025–26). Use the new product only where it shows Track's own layout. | You asked for Track; the new app has 84 reviews at 2.9 stars against Track's 26,239 at 4.6 [ST]. | Copy the new product. |
| D-LOOK | Copy layout, order, taps, shortcuts, defaults and control words. Keep our colours, icons and fonts. **The word "Toggl" leaves every text a user sees** (today it is in the shortcut list, Integrations and Webhooks [OURS L]); code names like `TogglLab` may stay. | The app will be sold; Toggl's name, look and pink are its brand. | — |
| D-PHONE-SHELL | Phone Timer tab in Toggl's order, with the bottom bar and **three tabs**. Projects, Manage and Settings move under ⚙ as rows (nothing removed). "← Dashboard" becomes a small ← left of "Timer". The week total moves into the "YOUR ACTIVITY" line; "Group similar entries" moves to Settings. | Toggl's bar sits where the thumb is; three tabs is Toggl's count. | Keep five tabs and the top card. |
| D-SHEET | **One tap on the running bar, or on any entry, opens one sheet** laid out like Toggl's: ✕ · DONE; big duration with ✎; name; chips; the start chip → end chip; the drums; Toggl's buttons; Stop; "Delete time entry". New entries use the same sheet with CREATE. | This is exactly where you could not find things. Seen in Toggl's own recording [H25 help_14, help_18]. | Keep "Time entry details" as it is and add a shortcut to it. |
| D-DRUMS | **Your drums stay** and sit where Toggl's wheel sits, **open at once**, under the times. Tapping the start chip shows the start drums, the end chip the end drums. Default: start on a running entry, end on a finished one. They copy the wheel's rules: 1-minute steps, a tick per minute, a running start cannot pass now, an end not before its start, 999 hours at most. Toggl's −15 −5 +5 +15 move from its clock dial to under the drums (one tap fewer). Tapping the big duration lets you type digits that fill from the right (130 = 1:30). | Your pick (2026-11-03). The day drum handles midnight, which Toggl's wheel ignores [SRC]. | Build Toggl's wheel (a ring, one turn = 60 minutes, 1-minute steps) in the same place. |
| D-START | Tapping "I'm working on…" opens the sheet with CREATE, already counting, as Toggl does. ▶ on an empty bar starts at once. @ and # list projects and tags inline. | Seen [V1 1:37–2:02]. Counting from the tap matches Toggl. | Start counting on CREATE. |
| D-SWIPE | Swipe right continues; swipe left deletes with "Time entry was deleted · UNDO" for 5 s; a Settings switch "Swipe actions", on. | Toggl's default [H25 #33; HELP; SRC]. | No swipes. |
| D-MANUAL | ⊕ opens the sheet with 30 minutes ending now and CREATE. | Seen three times [V1]; Toggl's help shows ⊕ [H25]. | Keep today's manual path. |
| D-SWITCHED | **Your "Switched at…" and "Stop at…" stay** (built by the last plan; Toggl has neither). They move from the main screen into the running sheet, beside Stop, and into the PC running box. | They do the job Toggl leaves to arithmetic; on the main screen they are not where Toggl's layout has room. | Keep them on the main screen as well. |
| D-PHONE-CAL | Toggl's calendar header, week strip, and Delete · Edit · Duplicate · Continue panel; drags snap to 15 minutes or a neighbour's edge, whichever is closer. Planned entries stay striped. | [V1; H25 #21; SRC]. | Keep today's calendar chrome. |
| D-PHONE-REPORTS | Toggl's short phone screen: date chips, Tracked hours card, bars per day, donut by project or client. Team and Amount show only when used. Toggl's "DETAILS" link opens today's full reports (all four tabs stay). | [H25 help_28; V1 2:30 "DETAILED REPORTS"]. One person, no team. | Keep today's reports as the phone's Reports tab. |
| D-PC-SHELL | A left sidebar in Toggl's order. The Timer page has Calendar \| List view below the bar, with "‹ This week · W45 ›". The default view stays List view for you (Toggl's is Calendar). The app's own top bar stays on the PC (decided 2026-11-03). | Toggl's layout [W25 9:44]. List as your default because you edit 91 of 105 entries in lists. | Calendar as the default view, like Toggl. |
| D-PC-RUNNING | One click on the running time: it becomes typeable, and a box opens with START, STOP (greyed), the date, "Stop at…" and "Switched at…", and a drum icon that opens your drums. | [LIVE web-06/07]. Toggl's web has no wheel; the drums stay one click away. | Drums open in the box at once. |
| D-PC-LIST | Keep in-place editing; the ⋮ menu in Toggl's order and words; ▶ and ⋮ on hover. **One rule for a typed start everywhere: it keeps the end and changes the length**, as dragging Toggl's start handle does. | [LIVE web-11; W25 15:31; SRC wheel]. Today a row and the sheet disagree [OURS F]. | A typed start moves the whole entry everywhere. |
| D-PC-MANUAL | Toggl Track's manual bar: "What have you done?", start → stop with a date, "+" "Add time entry"; M toggles. | Track's version [W25 GPAST]; the new product shows only a duration. | The new product's duration-only bar. |
| D-PC-KEYS | Add T (jump to today in the calendar) and list it; keep S, N, M, C, 1–9 and the Shift+? list; nothing fires while a field or a dialog has focus. | [HELP]; the rest already matches [OURS L-pc-01]. | — |
| D-PC-CAL | Week / 5 days / Day; drag-create in 15-minute steps; a box beside the block (Toggl's), with Save. | [LIVE web-14; W25 12:14]. | Keep today's sheet. |
| D-PC-REPORTS | **Keep today's PC reports**: they already copy Toggl's web layout (Summary · Detailed · Workload · Profitability · My reports, four cards, bars, breakdown donut, grouping) [OURS J-pc-01]. Only the words and the default range ("This week") are checked in Phase 7. Timesheet is not built. | Already parity; nothing to gain from moving things. | Build Toggl's Timesheet view too. |
| D-PICKERS | Toggl's picker wording and a "+ Create" row pinned at the bottom; Ctrl+Enter creates. | [W25 11:07; ST 2025-07 "Create project pinned at the bottom"]. | — |
| D-WORDS | Every control we share with Toggl uses Toggl's words, per platform ("I'm working on…" on the phone, "What are you working on?" on the PC). The word list is in Phase 7. | You asked for the wording too. | — |
| D-SETTINGS | ⚙ opens Settings with Toggl's sections; new switches "Swipe actions", "Haptic feedback", "First tab", "Running timer". Your current values are kept. Duration shows as 0:47:06 unless you already chose otherwise. | [V1; H25]. Settings are stored per person; nothing of yours is reset. | — |
| D-NOTIFY | Ship the parked notification (Phase 0, after O1). Its switch is "Running timer" under Settings › Notifications. | Your instinct on 2026-11-03: "it should always sort of be on my phone that i am actively running something". | Leave it parked. |
| D-PLANNED | **Your planned entries stay striped and uncounted.** Like Toggl's future entries, they show in the calendar and not in the list until they start. | Toggl hides future entries from the Timer list [HELP]. | Show them in the list as well. |
| D-NEIGHBOURS | **Kept: touching neighbours move together** (the last plan's choice, not yours). | It fixes the gaps and overlaps your data showed. | Toggl's way: no moving, only snapping to the edge. |
| D-BUGS | Fix the five bugs found during research first (Phase 0 items 2–3), each with a failing test. | They hurt daily use now and would muddy every side-by-side. | — |
| D-KEEP | **Keep the engine, rebuild the phone screens, reshape the PC screens.** See "Keep or rebuild" below. | The gaps are all in screens; the 51 fixes and 1,096 unit tests are mostly in the engine. | Rebuild the whole tracker. |

**Earlier decisions that rested on wrong information** (kept anyway, flagged on the page):
- **The notification (D-NOTIFY).** The last plan said "Toggl's Android app does this". Toggl has the
  switch, but it is off in a fresh account [V1 3:26], and its old code shows no buttons [SRC]. Ours is on
  by default for your phone and has a Stop button. That makes it your change, not a copy.
- **The wheel options (D-DRUMS).** On the 2026-11-03 board, option (b), the minute ring (one turn = one
  hour), was Toggl's real wheel [SRC; V2 5:13]. The plan recommended (a), the clock face, and quoted one user
  calling Toggl's wheel "useless". You tried the demos and picked the drums, so the pick stands.
- **Touching neighbours (D-NEIGHBOURS).** The last plan said "Toggl's calendar behaves the same way". It
  does not. Toggl's calendar snaps a dragged edge to a neighbour's edge, and the neighbour does not move
  [SRC].

## Keep or rebuild — the evidence

- **Where the gaps are:** every row of the comparison is about screens. It touches `TogglLab.tsx` (the
  shell, 1,209 lines), `TimerBar.tsx` (1,042), `EntryList.tsx` (2,003), `CalendarView.tsx` (966),
  `ReportsView.tsx` (1,532), `SettingsView.tsx`, `ProjectsView.tsx`, `pickers.tsx`, `Drums.tsx` and
  `MomentPicker.tsx`. None needs a new kind of data.
- **What the 51 fixes protect:** of the eight audit fix commits, the engine files
  (`useTimetrackSync.ts`, `useTimetrack.ts`, `timetrackService.ts`, `syncService.ts`,
  `syncVersionService.ts`, `timeFixService.ts`, `browserOwner.ts`, `serverClock.ts`,
  `timetrackFormatService.ts`) hold the sync and privacy fixes. The screens hold the rest: `TogglLab.tsx`
  was touched by 6 of the 8, mostly for leaving, logging out and the history steps.
- **Tests:** 129 unit test files with 1,096 cases under `tests/unit/timetrack/`, and 56 browser tests in
  three timetrack spec files.
- **So:** keep the engine as it is. Build the phone Timer tab, the bottom bar and the sheet as new
  components on the same hooks. Reshape the PC screens in place, because they are already close to
  Toggl's. Keep `TogglLab.tsx`'s leaving, logout and history-step logic and move it as it is, not
  rewritten. Its tests (`TogglLab*`, `sheetBack*`, `leave*` and the like) must pass unchanged before and
  after.

---

# BLOCKERS — each tried once

| ID | What | Tried, and the result | Blocks | What happens |
|---|---|---|---|---|
| B-ANDROID | Use Toggl's real Android app | 2026-11-05: an emulator needs KVM; `/dev/kvm` is `crw-rw---- kvm`, the user is not in group kvm, `sudo -n true` → "a password is required". The owner was asked to run `sudo chmod 666 /dev/kvm`, then said "lets drop logging in to toggl. it is too difficult here". | Touch-level checks of Toggl's phone app | Use H25, V1, SRC. Phone side-by-sides use those frames. |
| B-TRACK-WEB | Live Toggl **Track** web | The owner's new account goes to focus.toggl.com; `track.toggl.com/timer` redirected there. A second sign-up at `accounts.toggl.com/track/signup/` was offered; declined (same message). | Live Track-only details | Use W25 frames; the live new product for interactions; differences flagged. |
| B-MIGRATE | Apply the notification migration | `git rev-list` says `time-phase7-notification` is 2 commits ahead of main and 12 behind: it needs a rebase. The migration adds, removes nothing, has its rollback file. Method: memory `live-db-backup-method`. | Phase 0's deploy | O1. |
| B-SOAK | A full 24-hour two-device run | Folder `/tmp/claude-1000/-home-jonaswsl-projects-daygame-coach/a3c235a3-2d50-4389-a79f-18e11fb94647/scratchpad/audit/soak/run-2026-11-04T14-49-35-seed978856110-1440m/` (copied on 2026-11-05 to `~/.cache/daygame-research/time-audit/soak-2026-11-04/`, because /tmp is cleared on reboot). The run stopped at 403.16 of 1,440 min: "the soak's account no longer exists in the test database … another session rebuilt the test stack". 1 violation: `timer-bar-shows-old-name` at 253 min. | Proof of sync under time | Phase 0 makes the soak survive a rebuild; Phase 8 reruns it. |
| B-TOGGL-SESSION | The Toggl browser session may expire | Profile `~/.cache/daygame-research/toggl/profile` keeps the cookie; untested over days. | Live side-by-sides | If signed out, use saved frames and say so; never ask the owner to sign in again. |
| B-PHONE | Your day on your phone | Never happened after the last plan. | The "works" claim | After Phase 8 you get a "try these" list. |
| B-PEERS | Other sessions share this checkout (life-plan work is uncommitted in it now) | `git status` on 2026-11-05 shows their files modified. | Commits, pre-commit | `git commit --only <paths>`; never `git add -A` or `git stash`. |

---

# PHASES

Every phase ends with **the loop** in Part 2 (tests, side-by-sides, findability check, push, live check,
report). A phase is not finished until the loop is.

## Phase 0 — Ship what is parked, and make the checks reusable · M

1. **The notification.** Rebase `time-phase7-notification` onto main and resolve conflicts. Run its unit
   tests and the timetrack suite. If O1 is yes: back up your time data (json_agg per table), run
   `migration list --linked`, then `db push --linked --yes` with only this migration pending. Push to
   main and check `buildId`. If O1 is no: leave it parked and say so.
2. **The soak's bug.** On the phone the bar showed an empty name while "walk [74]" ran
   (`shots/0075-timer-bar-shows-old-name-1.png` in the 2026-11-04 soak folder named in B-SOAK, minute
   253). Write the failing test first, from the soak's seed 978856110 if it replays, otherwise from its
   event log `events.jsonl`. Then fix.
3. **Bugs found while capturing today's screens** (`notes/ours-today.md`, 2026-11-05; each gets a failing
   test first; reproduce twice before fixing):
   - Picking a project with @ or a tag with # leaves "@Gy" in the name and keeps the list open; Enter
     picks again and never starts; the entry saves as "Call @Gy #adm" (on both sizes). The capture agent's
     guess: the second state update overwrites the first.
   - After Stop, the bar keeps the old name, project and tags, so the next Start repeats them. Toggl
     clears the bar.
   - Zero-length entries are kept and briefly show as "planned".
   - Projects › "Tracked (current period)" seems to count today only (Gym 0:00 with 2:20 this week).
   The screen-level findings (Cancel only undoes drum turns, "Started at…" looks clickable but is not,
   toasts stacking over the list, icons without words) are fixed by Phases 1–3, and checked there.
4. **The soak survives a rebuild.** When the test database restarts, it re-creates its account, logs the
   gap, and carries on. Downtime is counted apart from violations.
5. **The regression base.** Copy `~/.cache/daygame-research/time-audit/` scripts (two devices, offline,
   account switching, heavy history, soak) into `~/.cache/daygame-research/time-audit/regression/` with
   one runner, `run.sh <frozen-worktree> <port>`, that runs each for a short time and prints a pass/fail
   line per theme. The scripts stay out of the repo (they hold no secrets, but they are throwaway).
6. **The parity kit** (in `~/.cache/daygame-research/toggl/kit/`):
   - `refs.json`: per flow ID (the comparison's rows), the Toggl reference images and their citation.
   - `side-by-side.mjs <flow> <phone|pc>`: shoots ours at 390×844 (touch) or 1440×900 at
     `/test/toggl` signed out, and writes `kit/out/<phase>/<flow>.png` with Toggl left, ours right, and the
     citation under them.
   - `findability.md`: the prompt for the fresh agent (below).
   - Reuse `~/.cache/daygame-research/toggl/scripts/ours_lib.mjs` and the `ours_*.mjs` flow scripts: they
     already drive `/test/toggl` through every flow at both sizes.

**Acceptance:** the notification is live (or parked, per O1); the soak bug's test and the four item-3
tests failed before and pass after; `run.sh` prints five theme lines; one side-by-side image exists per
flow, showing today's state.
That set is the "before" for every later phase.

## Phase 1 — Phone: the Timer tab and the bottom bar · L

1. A new phone shell for the tracker: header "Timer" with ← (to where you came from), sync dot, ⊕, ⚙.
   Tabs "List view | Pomodoro" (Pomodoro moves here from wherever it sits now).
2. The list: "YOUR ACTIVITY · this week 14:35", day headers ("TODAY", "YESTERDAY", then "WED, 10 DEC")
   with totals, and rows: name or "+ Add description", ● project • client, $ and duration, ▶.
3. The bottom bar, idle: "I'm working on…" and a round ▶. Running: the time, the name, ● project •
   client, $, and a round ■. It sits above the tabs on every tab (Toggl shows it on Calendar too).
4. Three tabs: Timer · Calendar · Reports. ⚙ opens a screen with rows: Projects, Clients, Tags,
   Settings, Import and export (today's Projects, Manage and Settings, unchanged inside).
5. "Started at… / Stop at… / Switched to something else?" leave the main screen and go to the sheet
   (Phase 2). Until Phase 2 is live, ▶/■ and the bar keep today's behaviour, so nothing is lost between
   phases. Push Phase 1 and Phase 2 together if the sheet is not ready.
6. The PC is unchanged in this phase.

**Acceptance:** side-by-side `phone-timer`, `phone-runbar` match Toggl's order; findability tasks "stop the
timer", "open your projects", "change a setting" pass; the address-driven sections (`?view=`) and Android
Back work as before (their tests unchanged).

## Phase 2 — Phone: one sheet, with the drums where Toggl's wheel is · L

1. One tap on the running bar (not on ■) or on a row opens the sheet. A tap on a group row opens the group's
   entries, as today. Order, top to bottom:
   - ✕ (left) · DONE (right). CREATE instead of DONE for a new entry.
   - The big duration "1:30:00 ✎". ✎ (or a tap on the number) types a duration with digits that fill from
     the right; the hint "90 = 90 min · 1.30 = 1 h 30" shows while typing.
   - The name: "I'm working on…" (running or new), "I've worked on…" (manual).
   - Chips: project (× to clear) or "@ Add a project", "# Add tags", "$ Billable".
   - "Edit duration" card: start chip "9:49 am · 12-12" → end chip ("9:49 am · 12-12", or "now" while running).
     Under the start: "Set to last stop time". Under the end: "Round stop time".
   - The drums for the selected chip, open, [day][hour][minute]; −15 −5 +5 +15 under them.
   - Running only: a big round ■ "Stop", with "Stop at…" and "Switched at…" beside it. A running entry's
     end chip shows "now" with no date, as Toggl's does.
   - "Delete time entry" at the bottom (red). No "Continue" here: Toggl has none in this sheet; continuing
     is ▶ or a swipe in the list.
2. ✕ with changes asks "Discard changes?" with "Keep editing" and "Discard". Android Back acts as ✕.
3. Today's extras keep a place: "End now" and "Duration only" go in the sheet's ⋮ menu (top right, left of
   DONE). The date stepper is replaced by the day drum and the dates in the chips.
4. Toggl's toasts for impossible times: "Start time must be before Stop time!", "Stop time must be after
   Start time!", "Start time must be before current time!", "Duration can't exceed 999 hours!" [SRC]. The
   drums refuse silently as Toggl's wheel does; the toasts are for typed values.
5. The PC sheet is untouched here (PC gets its box in Phase 5).

**Acceptance:** the three stories from the last plan's Phase 5 still pass (fix a running entry to have
ended 2 h ago; yesterday 22:30 → today 01:15 = 2:45; plan tomorrow 10:00–11:30, striped). New: "tap the
running bar, move the start 6 minutes back, DONE" in 4 actions; side-by-side `phone-sheet` against H25
help_14 f010 and help_18 f004; findability tasks "change when this entry started, the way you would in
Toggl" and "you forgot to stop the timer an hour ago; fix it" pass.

## Phase 3 — Phone: start, continue, swipe, add a past entry · M

1. Tapping "I'm working on…" opens the sheet in "new" mode (CREATE, counting from the tap). Here, and in
   the ⊕ sheet, the drums are folded behind "Edit duration ›", as in Toggl's start and manual sheets
   [V1 1:53, 0:14]; the time chips and "Set to last stop time" stay visible. ▶ on an empty bar starts at
   once with no name.
2. @ and # in the name list projects and tags inline ("No Project", by client, "+ Create project").
3. Swipe right on a row: Continue (the running one stops). Swipe left: delete, toast "Time entry was
   deleted" with UNDO for 5 s. Both trigger at 75% of the row width, as in Toggl [SRC]. Settings switch
   "Swipe actions", on.
4. ⊕: the sheet in manual mode, 30 minutes ending now, CREATE.

**Acceptance:** tap counts equal Toggl's (start with a name: bar, type, CREATE; continue: 1; manual: ⊕,
CREATE); a swipe does not fire on a vertical scroll (touch-emulated test); findability tasks "continue
yesterday's 'Email' entry", "delete an entry and get it back", "add an hour you forgot this morning".

## Phase 4 — Phone: Calendar and Reports tabs · M

1. Calendar: "Calendar" header with ⚙; "WEDNESDAY, DEC 10 · 7:05:00"; a week strip with today circled
   (tap a day to go there); the hour grid and now line; the bottom bar.
2. Tap a block: it is selected (handles top and bottom), and a panel shows name, project, "12:25 am –
   6:15 am" and Delete · Edit · Duplicate · Continue, plus Cancel. On a running block: Discard · Edit ·
   Stop [SRC]. Edit opens the Phase 2 sheet.
3. Long-press empty space: a 30-minute entry, or one that fills a gap of 2 hours or less [SRC]. Drags snap
   to 15 minutes or a neighbour's edge, whichever is closer. Planned entries stay striped.
4. Reports: "Reports" with ⬇ and ⚙; date chips and a date sheet ("Today · Yesterday · This week · Last week
   · This month · Last month" and a month grid); "Tracked hours" card (total; billable and amount only
   when used); bars per day; "Group by Projects | Clients" donut with a list (name, %, time); a "Details"
   link to today's full reports, which keep all their tabs. The heat-map comes last and only if cheap (it
   is Toggl's, but nothing you asked for).

**Acceptance:** side-by-side `phone-calendar`, `phone-reports`; findability tasks "move yesterday's gym
block 15 minutes later", "how many hours did you track last week?".

## Phase 5 — PC: the Timer page · L

1. A left sidebar: Timer (a live clock with ✎ while running); Reports; Projects, Clients, Tags; Settings.
   The app's own top bar stays above it.
2. Below the timer bar: "‹ This week · W45 ›", the week total, and Calendar | List view (List view is your
   default; the choice is remembered).
3. One click on the running time: editable, plus the box (START editable, STOP greyed, date, "Stop at…",
   "Switched at…", a drum icon). "90" + Enter means started 90 minutes ago. Esc closes.
4. The list edits in place: name, start, stop and duration each on one click (typed rules D10/D11 of the
   last plan stay). A typed start keeps the end and changes the length, in the list, the box and the sheet
   alike (D-PC-LIST). ▶ and ⋮ show on hover. The ⋮ menu in Toggl's order: Split, Pin as favorite, Go to
   project, Copy description, Duplicate, Delete. Delete asks nothing and toasts "The time entry was
   deleted. UNDO".
5. Manual mode: the switch beside ▶ and the M key. The bar reads "What have you done?", start → stop with a
   date, "+" (tooltip "Add time entry").
6. Shortcuts: add T (today, in the calendar) to the existing S, N, M, C, 1–9 and the Shift+? list. Nothing
   fires while a field or dialog has focus.

**Acceptance:** side-by-side `pc-layout`, `pc-running`, `pc-list`, `pc-manual`, `pc-keys` against LIVE and
W25; findability tasks "you forgot to stop the timer 90 minutes ago; fix it", "rename yesterday's entry",
"log 45 minutes you did this morning", "find the keyboard shortcuts".

## Phase 6 — PC: calendar, reports, pickers · M

1. Calendar: "Week view ▾" with Week / 5 days / Day; − + zoom; drag on empty space creates in 15-minute
   steps and opens the box beside the block ("Add description", project, tags, $, date, start → end,
   duration, "Add time entry"); click a block opens the same box with ▶, Duplicate, ⋮, ✕ and Save; T jumps
   to today.
2. Reports: no layout change (D-PC-REPORTS). Check that it opens on Summary with "This week".
3. Pickers: "Search by project, task or client", grouped by client, "+ Create a new project" pinned at the
   bottom; tags "Add/filter tags" with checkboxes and "Create ‹x›"; Ctrl+Enter creates.

**Acceptance:** side-by-side `pc-calendar`, `pc-reports`, `pickers`; findability tasks "add a meeting from
14:00 to 15:30 yesterday in the calendar", "create a new project while starting a timer".

## Phase 7 — Words, defaults, settings · S

1. One pass over every label against `notes/mobileapp-strings.txt` (phone) and `source/translations/`
   (web). The table of changed labels goes into this file under Phase 7, old → new. In the same pass,
   remove "Toggl" from every user-visible text (D-LOOK); a unit test greps the rendered labels for it.
2. Settings in Toggl's sections: Date and time (date format, 24-hour clock, duration format, first day of
   week); Timer defaults (group similar entries, swipe actions, first tab, haptic feedback); Notifications
   ("Running timer", which is the parked notification's switch). Toggl's "Stopped timer" is not built, so
   it is not shown: only switches that do something appear.
3. Defaults for a new person: duration 0:47:06, group similar entries on, swipe actions on. Your own
   saved values are not changed.

**Acceptance:** the wording table is in this file; a unit test pins the phone and PC labels the
comparison names; your settings row before and after is identical (read-only check of the live row, numbers
and keys only).

## Phase 8 — Proof, then the report · M

1. **Adversarial audit, at least six independent agents** on a frozen worktree with throwaway accounts:
   two devices; offline; account switching; heavy history; **Toggl parity** (compare every flow with the
   reference images and the live new-product app); **findability** (a fresh agent per task, no code, no
   plan). Each bug counts only when reproduced twice, with a spec. Fix, then a code review and a security
   review of the fixes (security through a subagent on the explicit range; see the shared-checkout memory).
2. Rerun the 24-hour soak; report the minute it reached.
3. Update `docs/runbooks/timetrack.md` and the Time line in `docs/product/map.md`.
4. The report to you (format in Part 2), with the "try these on your phone" list.

**Acceptance:** audit counts reported, every confirmed bug fixed or written down with why not; reviews done;
soak result stated with its last minute; report sent.

---

# PART 2 — Ground rules for the executing session

1. **Read first:** this file, CLAUDE.md, your memory index, `~/.cache/daygame-research/toggl/INDEX.md`,
   and the page's marks (`ArtifactData list` on https://claude.ai/artifact/PybynaCaxXTSw7KEZoqjPm, collection `marks`; each document's
   id is a decision ID such as `D-SHEET`, with `decision` = `no` or `ok` and an optional `note`). Read the
   marks again at the start of every phase. A "No" means: do the alternative in the DECISIONS table, and
   write one line under that phase saying so. No mark means the decision stands.
2. **Ask the owner nothing** except a NEW item of the O1–O3 kind (money, deleting real data, anything that
   cannot be undone, a live database change not covered by O1). His answers to O1–O3 are at the top.
3. **Never test on the owner's account.** Use `/test/toggl` signed out (memory
   `timetrack-safe-browser-check`) or throwaway e2e accounts, in a worktree with its own server (memory
   `worktree-e2e-servers`). Reads of the owner's data are read-only and print numbers only.
4. **The loop, every phase:**
   1. Build. Every fix starts as a failing test.
   2. `npx vitest run tests/unit/timetrack` and the whole `npm test`; the three timetrack e2e files one
      at a time at phone size (`[android]` project) and PC size; `node scripts/typecheck-ratchet.mjs` and
      `npm run lint:ratchet`. A test may change where it clicks; it may not drop what it promises. List
      every rewritten test with its promise in the phase report.
   3. Side-by-sides: `kit/side-by-side.mjs` for each flow the phase touches. Look at each image. Where ours
      differs from Toggl in layout, order, taps or words, fix it or write why (a decision ID).
   4. Findability: a fresh agent (Agent tool, no fork) gets only `kit/findability.md` plus one task per
      flow the phase touches, the URL of a worktree server, and the device size. It may not read code or
      plans. Record taps used, where it looked first, and whether it found it. A miss is a bug.
   5. Run `~/.cache/daygame-research/time-audit/regression/run.sh` for the sync themes if the phase touched the engine or the
      shell.
   6. `git commit --only <paths>` (peers share the tree), push to main, wait for Vercel, and check
      `https://daygame-coach.vercel.app/api/healthz` shows the pushed commit as `buildId`.
   7. Add a short "Done, live <commit>" note under the phase in this file.
5. **Do not stop between phases for status updates.** Go from Phase 0 to Phase 8 in one run. Stop only
   for a new owner-only item, or a red you cannot fix, and then say exactly what is red.
6. **Report to the owner, at the end, in plain words, doubt first:**
   - what changed, per screen;
   - where it is: a screenshot plus the taps to reach it (for example "Timer tab → tap the bar at the
     bottom → the drums are under the times");
   - what is not proven yet (anything only tests have seen; the soak's last minute; Toggl claims that rest
     on old code);
   - the list of things to try on his phone (B-PHONE).
   Say "built" or "live", never "works", until he has used it.
7. **Next.js here is not the one you know.** Read `node_modules/next/dist/docs/` before routing or
   navigation work. Keep `--webpack` for builds.
8. **No new npm packages.** The checkout's safety layer refuses dependency changes; none is needed.
9. **The repo is public.** Toggl images, frames and notes never go into it. The plan cites them by path in
   `~/.cache/daygame-research/toggl/`.

**The findability prompt** (`kit/findability.md`, also given here so the kit can be rebuilt):
> You are a new user of a time-tracking app open at <URL>, on a <phone 390×844 touch | PC 1440×900>. Do
> this task as a person would, by looking at the screen and tapping: "<task>". Do not read any code, page
> source or plan. After each tap, say what you expected to happen and what happened. Stop after 15 taps.
> Report: found it yes/no, taps used, where you looked first, anything confusing.

---

# EXECUTION PROMPT

Paste this into a new session:

```
/goal Execute Plans/toggl-parity.md from Phase 0 to Phase 8 in one run.
First read: that plan (the owner's answers to O1–O3 are at its top; use them), CLAUDE.md, your memory
index, ~/.cache/daygame-research/toggl/INDEX.md, and the decision page's marks (ArtifactData list,
collection "marks", on https://claude.ai/artifact/PybynaCaxXTSw7KEZoqjPm). Re-read the marks at the start of each phase; a "No"
means do that decision's alternative and note it in the plan.
Ask the owner nothing, unless a NEW owner-only item comes up (money, deleting real data, anything that
cannot be undone, a live database change not covered by O1).
In every phase run the plan's loop: build with failing tests first; run unit tests, the timetrack e2e
files one at a time at phone and PC sizes, the typecheck ratchet and the lint ratchet; make side-by-side
screenshots against Toggl with the kit and look at them; run the findability check with a fresh agent
that gets only the task; then commit with --only, push to main, and confirm the live buildId at
https://daygame-coach.vercel.app/api/healthz.
After Phase 8's fixes, run the adversarial audit with at least six independent agents (two devices,
offline, account switching, heavy history, Toggl parity, findability), then a code review and a security
review of the fixes, before saying done.
Do not stop between phases for status updates.
At the end, report to the owner in plain words, doubt first: what changed, where it is (a screenshot plus
the taps to reach it), what is not proven yet, and the list of things to try on his phone. Say "built" or
"live", never "works".
```
