# Time tracker: as easy as Toggl on the phone and the PC, and no more bugs between them

**Status (2026-11-04, evening):** Phases 0–6 are live. Phase 7 is built and waits for the owner's yes to its
migration. Phase 8 is done except the owner's phone day (B-PHONE). A five-agent audit the same day found 36
bugs (35 different ones); all are fixed and live. See AUDIT below.
- Phase 1: 284728a3.
- Phase 2: d4cd3b1a and 25d2cad2 (versioned writes, migration 20261103120000), then 4cbd7b46, 9e074a3c
  and 108c2ac0 (Checking…, send on leave, server clock, honest badge, live updates, two tabs), with
  migration 20261104120000. The owner said yes to both migrations, a backup was taken before each, and
  both were applied.
- Phase 3: 5c70dc38. Then 6bbd823f: Time opens on Timer (the remembered section is gone; the address
  keeps the section on reload). 6c316ae7: the app's own "Time" link works from any section.
- Phase 4: ad5f11a7 (with audit bugs A4–A6).
- Phase 5: 13aebeca, 4cf421d9, 60e35816. "Planned" is derived (start after now), so no migration.
- Phase 6: 185c3cae, 3c41736a. The touch stories run on the desktop (touch emulation) and Android lanes;
  Playwright cannot drag a finger in WebKit, so they are skipped on the iPhone lane, listed with the reason.
- Phase 8: two code reviews of 599dfb24..3c41736a (sync and server; screens and time maths). The sync
  review found 4 problems, fixed in ed55a2e7 and 2d1d7a6b; offline edits now have no age limit, so a Stop
  made days ago with no signal still reaches the account. The screens review found 7, fixed in fd23ed88
  and 38659907. Security reviews: see AUDIT. Runbook and map: 3e2bd420.
- Phase 7: built on a branch, not live. Its migration `20261104160000_running_timer_notification.sql`
  (with rollback) must reach the live database BEFORE the code, because device registration reads
  `push_devices.timer_running`. "Alerted" lives in `notification_sends` (one 'timetrack-alert' row per
  entry), not on `timetrack_entries`, so an alert never moves an entry's version (D1). The security
  review's low finding about one account crowding out another's alert is fixed inside the same migration.
  Its other low finding, that the lock screen shows the running entry's description, is kept as Q4
  scenario 11 decided; Android's own lock-screen setting hides it.
- Fixes found by CI's browser tests: 4a9e2b9c (the PC heading), 152e2e8c (the badge said Saved while a
  Stop was still queued).
- Not proven on the live site: the "within seconds" ping. The test database runs without Realtime; only
  a unit test covers it, and the owner's phone day (B-PHONE) is the real check.
- Deferred from Phase 3: the offline `?start=1` link (`public/sw.js`, B-SW).
- Known and harmless, from the Phase 2b review: a row sent twice on a quick leave-and-return is refused
  once as stale and settles by itself.

**Written for** the owner first (Part 1), then for the AI session that builds it (design rules, blockers,
questions, phases, Part 2, and the `/goal` prompts at the end). The executing AI treats this plan as the
"what" and "why"; the "how" in code is its own job, inside the rules written here.

**Where it sits.** The time tracker at `/time` (`src/timetrack/`, about 20,000 lines, a Toggl Track clone).
Since 2026-10-15 it is reached from the More sheet. This plan changes how it is used every day; it adds no
new feature area to the app.

**Who owns what.** This plan owns `src/timetrack/`, `app/(app)/time/`, `app/api/timetrack/`,
`src/db/timetrackRepo.ts` and their tests. Shared files it touches, each named in the step that touches it:
`components/AppFrame.tsx` and `components/navTabs.ts` (the app frame, Phase 3), `public/sw.js` (the offline
worker, which another session has owned; ask before editing, Phase 3), and `src/notifications/` plus the
`/api/notifications/tick` route (built by `Plans/thought.md`, Phase 7).

**The visual board for this plan:** https://claude.ai/artifact/Ua3USMTJtfs75NkogszptP. It is an
interactive page where you can try the three wheel designs on your phone and mark every proposal Yes /
Later / No. The marks live in that page's database (collection `marks`, one document per item id, such as
`q1`, `p4-switched`, with a `decision` field), so the executing session reads them before it starts (Part 2,
rule 1). Source: built from a scratchpad file. A later session republishes by passing the URL, after reading
the page.

---

# PART 1 — In plain words

## What you asked for

Your words, 2026-11-03:

1. "It is often very annoying to input times on my app. Like if I start something, and I forget to turn it
   off, I have to painstakingly calculate the amount of time and change the XX:YY:ZZ format."
2. "It also seems buggy when I use one device and the browser on my PC overlappingly."
3. "The feature where I spin a wheel and sort of write out times for things that will happen / has
   happened, as exists in Toggl, also doesn't exist."
4. "In general, there just seems to be a good amount of bugs with this, also when I come from other parts of
   the web app and click around."

You asked for a plan. Nothing is built until you say so.

## What you are agreeing to

- **Money: none.** Nothing is bought, rented or subscribed to. Phase 7's reminders reuse the notification
  system Thought Frequencies already built, which is free.
- **Your data, on the live database.** Your 105 time entries stay. Nothing is deleted. Before each database
  change, a fresh backup of your time data is taken (the backup was tried today and works). Database changes
  are small and each has a written way back:
  - a rule that stops an old copy from a sleeping phone overwriting a newer change (Phase 2);
  - tag removals being stored (Phase 2);
  - the database telling an open page when the other device changed something (Phase 2);
  - a note of when a "still running?" reminder was last sent (Phase 7).
- **What becomes public: nothing.** Everything stays private to your account.
- **What cannot be undone: nothing.** Every change can be taken back, and every phase goes live on its own,
  so a bad one can be reverted without losing the others.
- **Your phone.** At the end, you use it on your Android phone for a day and say what still annoys you
  (blocker B-PHONE). No test can replace that.

## The short answer

There are four separate problems, and each one has a fix:

1. **Typing times is slow because the app makes you do arithmetic.** It has an end box, but it is hidden
   behind "Change times", and the phone shows the letter keyboard for it. Your own entries show the cost: on
   Nov 2–3 a timer was left running four times. Each time you fixed the old entry hours later and then added
   the next one by hand. Those fixes left two small gaps and three overlaps, the longest almost 4 minutes.
   **The fix is a "Switched at…" button.** You tell it the time you actually switched, by tapping, typing
   or turning the wheel. The old entry ends there and the new one starts there, in one step, with no gap or
   overlap. Also coming: one-tap buttons (−5 / +5 min, "end now", "start where the last one ended"), the
   number keypad, and the drums (Q1) with a day column for anything that crosses midnight or is planned
   for tomorrow.
2. **Your phone and PC can undo each other.** The worst case: a phone that was asleep or offline wakes up and
   sends its old copy, so a timer you stopped on the PC starts running again, or an entry you deleted comes
   back. Removing a tag never reaches the other device. The "Saved" badge stays green while the phone hasn't
   heard from the PC for hours. **These are fixed first among the big pieces**, because they damage your
   real records.
3. **The wheel does not exist.** Toggl's phone app has one: you drag a start handle and an end handle around
   a circle and see the length in the middle. Phase 5 builds it. The board lets you try three designs on your
   phone before anything is built. The phone calendar also comes alive (Phase 6): you long-press and drag to
   lay out a block, in the past or for later. Today the phone calendar cannot be dragged at all.
4. **Clicking around breaks things.** The phone's Back button jumps out of the tracker instead of closing
   what is open. On the PC the app's top bar disappears on Time, and "← Dashboard" is the only way out. "Go
   to project" does nothing. Leaving Time within a second of pressing Stop can lose the stop. Keyboard
   shortcuts fire behind open windows. There are twelve of these, and each has a fix in Phase 1 or Phase 3.

**Doubt first, honestly:**

- **The wheel is the riskiest part to get right.** On a 390-pixel-wide phone, a circle covering 12 hours
  gives about one pixel per minute. That is why it snaps to 5 minutes and has ±1 buttons for fine-tuning.
  One Toggl user called Toggl's wheel "useless" and space-hungry. That is why you try the designs first, and
  why typing and the one-tap buttons stay beside the wheel, not replaced by it.
- **The sync fixes change the heart of how your two devices agree.** They are the most valuable part and the
  most likely to break something nearby. This tracker's history has fixes that broke other screens ("My
  night-shift fix broke seven screens"). Every sync fix starts as a test that fails today, and every phase
  runs the whole tracker's test suite and the two-device browser tests before it goes live.
- **A phone that is off or without signal cannot tell the PC anything.** After this plan, the PC finds out
  within seconds once the phone has signal and the app open, and the phone never overwrites newer work
  with old work. "Instantly, always" is not possible on the web, and is not promised.
- **This is a lot of work: eight phases.** Each phase goes live by itself, so you feel the improvement after
  Phase 1, not at the end.

## Words used here

- **Entry**: one line in your list: a description, a project, a start and an end.
- **Running entry / timer**: an entry with no end yet.
- **Sync / check**: your phone and PC each keep a copy, send changes to the server, and ask it what the other
  changed. Today they ask every 60 seconds and when the page comes back into view.
- **Queue**: changes a device has made and not yet sent.
- **Sheet**: the "Time entry details" panel that slides up when you tap an entry.
- **Wheel / dial**: the circle you drag handles around to set a start and an end.

## What exists today (checked 2026-11-03)

**Your own use**, read from the live database (read-only, numbers only):

- 105 entries since 2026-08-25, 30 of them in the first three days of November. You track whole days back
  to back: one entry stops and the next starts seconds later.
- 91 of 105 entries were changed more than a minute after they were made. 39 were created more than five
  minutes after their own start time, meaning they were added or moved back afterwards. In 33, the start
  time was typed rather than taken from the clock.
- Two devices have held your running timer: your Android phone (installed app) and the PC browser.
- On 2026-11-02 and 11-03, four timers were corrected hours later (fixed at 13:29, 09:09, 14:25 and 16:07,
  UTC). Each was followed by a hand-added entry, leaving gaps of 1 min 29 s and 1 min 6 s, and overlaps of
  41 s, 33 s and 3 min 49 s.

**The screens**, tried at phone size and PC size on the signed-out lab copy (`/test/toggl`):

- The big box on the timer bar takes only a duration. Typing an end time works ("18" ends at 18:00), but
  only after "Change times" opens the sheet.
- The start, end and duration boxes have no `inputMode`, so the phone shows the full letter keyboard.
- The calendar's drag-to-create, drag-to-move and resize use mouse events only, and switch off on a phone
  (`CalendarView.tsx:340, :376`). On a phone the calendar is view-only.
- Typing is misread in three ways, each confirmed by running the code:
  - `1h30` is read as 1:00:00, so the 30 minutes disappear.
  - `4p` is read as 04:00 in the morning.
  - With a 10:00 start, an end of `9` makes a 23-hour entry, and `3` or `3p` makes a 17-hour one.
- Manual mode always opens at 09:00–10:00, whatever the time is now.
- The duration box is locked while no timer is running. In Toggl you can type "2h" and log it straight
  away.

**Between the phone and the PC** (code audit, defects confirmed by reading the exact code path; #3 also by a
script):

1. A queued change from a phone that was offline or asleep replaces the whole row on the server. A timer
   the PC stopped starts running again, and an entry the PC deleted comes back (`syncService.ts:213-236`,
   `useTimetrackSync.ts:681-689`, `timetrackMapperService.ts:221`). The rule "my unsent change beats the
   server" was right for two tabs of one browser (fix 3e72d130). On a second device it is wrong, because
   there the unsent change is the oldest thing, not the newest.
2. For the seconds after the phone wakes, it shows the old state without any "checking" sign. A tap on
   Stop or Start in that window wins: a timer the PC stopped at 10:00 is saved as running until 12:00
   (`useTimetrackSync.ts:1134-1137, :895, :1038`). A failed check is dropped silently. Coming back online
   sends the queue but does not check.
3. Removing a tag is never sent, and the tag comes back within a minute (`syncService.ts:68-73, :183`).
4. The "Saved" badge only reflects sending, never checking. An offline phone with nothing to send shows
   "Saved" over a timer the PC stopped hours ago (`TogglLab.tsx:849`).
5. Changes wait 800 ms before sending. Nothing sends when the app is hidden or closed, and leaving `/time`
   cancels the send (`useTimetrackSync.ts:841-842, :531`). Stop then lock the phone, and the PC can show the
   timer running for hours. On Android this usually still sends; when it doesn't, #1 decides what survives.
6. Starts and stops use each device's own clock. A phone 4 minutes fast makes every PC stop 4 minutes short
   (`timetrackService.ts:124, :517-524`).
7. A row written while the other device is mid-check can be missed until a reload, because the checkpoint
   is taken before the read (`timetrackRepo.ts:47, :205, :239`).

**Getting around** (code audit; nothing found for hydration, leaked timers or double-running on load):

1. Leaving `/time` within about a second of a change drops the send (the same cause as sync #5).
2. Arriving shows the copy stored on the device with no "checking" sign. Acting on it in that moment
   overwrites newer data (the same cause as sync #2).
3. The sections (Timer, Calendar, Reports, …) and the sheet are not in the address. Android Back leaves the
   tracker instead of closing the sheet or going back a section. A reload on Settings lands on Timer, and no
   link can open Calendar.
4. On the PC, the app's top bar is hidden on `/time` (`AppFrame.tsx:47`), although the reason, two bars
   stacked on a phone, applies only to phones. "← Dashboard" is hard-coded (`TimetrackScreen.tsx:21`), so
   coming from Thoughts it does not go back to Thoughts.
5. "Go to ‹project›" in an entry's ⋮ menu sets `#project-…` in the address, and nothing listens for it
   (`EntryList.tsx:935`).
6. Tapping Time shows nothing until the server's sign-in check returns, because there is no `loading.tsx`.
7. Keyboard shortcuts (`s`, `n`, `c`, `1`–`9`) fire behind open dialogs when focus is on a button
   (`TogglLab.tsx:271-328`).
8. An old settings migration runs again on every load, switches idle detection off and shows a toast about
   it (`useTimetrack.ts:130-135, :169-173`).
9. Leaving and coming back restarts Pomodoro, shows the tracking reminder and the forgotten-timer warning
   again, and wipes a typed but unstarted description and the manual form.
10. The height of the phone's bottom bar is measured before the bar exists, so menus near the bottom open
    downward over it (`TogglLab.tsx:172-193`).
11. Leaving with a timer running may set the next page's tab title to "Time" (`useTimetrack.ts:352-354`;
    plausible, check in a browser).
12. Offline, a `/time?start=1` link shows the browser's error page (`sw.js:228`). `?report=` stays in the
    address, so every reload forces Reports.

**Compared with Toggl** (Toggl help pages for iOS, Android, manual mode, timer mode and the calendar, read
2026-11-03; Toggl's iOS and Android pages, updated 2026-11-02, still describe the wheel):

| Toggl does | This app |
|---|---|
| Phone wheel: drag the start and stop handles around a circle; tap the middle to type the length | none |
| Phone: ±5 min buttons, "round the stop time", "set start to last stop time" | none |
| Phone calendar: long-press to create, drag edges to resize, hold to move | none (PC only) |
| PC calendar: resize from the top edge too | bottom edge only |
| Type a duration with no timer running, then ✓ logs it | locked until a timer runs |
| Manual mode starts near now | always 09:00–10:00 |
| Future entries allowed | allowed in manual mode, hard to reach on a phone |
| Forgotten timer: phone reminders ("timer running") | a warning after 12 h, only while the page is open |

Not documented anywhere Toggl publishes: how the wheel snaps, and how it shows a span past midnight. Those
are this plan's own choices.

## What a day looks like when this is done

- **09:00.** On the phone you type "Deep work" and press Start.
- **11:55.** You switch to email but forget the timer.
- **14:30.** You notice. You type "Email" and tap **Switched at…**. The drums open at now; you flick the
  hour to 11 and the minute to 55 (or tap "−15" a few times). You tap ✓. "Deep work" ends at 11:55, and "Email" started at 11:55
  and is still running. No arithmetic, no gap, no overlap.
- **Same moment, on the PC.** Within a few seconds the PC shows "Email" running. It never shows "Deep work"
  running again.
- **Evening.** You stopped the timer on the PC, and the phone was in your pocket offline. When the phone
  wakes, its screen says "Checking…" until it has heard from the server, and only then lets you press
  Stop or Start. Its old copy cannot restart the timer.
- **Tomorrow's plan.** On the phone calendar you long-press 10:00 tomorrow and drag down to 11:30 for "Gym".
  It shows as planned until 10:00 arrives.
- **All day, on the phone:** while anything runs, the notification shade shows "● Email · since 11:55"
  with a Stop button, wherever the timer was started. A timer past 6 h rings once (never 23:00–07:00).

---

# DESIGN RULES — decided by Claude, each with its cost if wrong

| # | Rule | Why | Cost if wrong |
|---|---|---|---|
| D1 | **No write may replace a row newer than the copy it was based on.** Each queued row carries the server `updated_at` it was based on. If the server's row has changed since, the server keeps its row and returns it. The device then re-applies only the fields it changed itself (three-way: base, server, mine). A stale copy can never clear `stopped_at` or `deleted_at`. | Fixes sync #1 without trusting device clocks. | A field both devices changed goes to the later sender. That is acceptable, and the sheet shows "changed on your other device". |
| D2 | **Until a device's first check after opening or waking lands, its Start, Stop and Switched buttons wait** (a small "Checking…" sign, up to 3 s). After 3 s they work, with "Couldn't reach the server — this might be out of date" shown. | Fixes sync #2 and getting-around #2. | Up to 3 s of waiting when the signal is slow. |
| D3 | **Changes send the moment the app is hidden, closed or left**, using `fetch(…, {keepalive: true})` on `pagehide`, on `visibilitychange` to hidden, and on unmount. In-flight sends are no longer aborted on unmount. | Fixes sync #5 and getting-around #1. | None known; a duplicate send is harmless because writes are idempotent by row id. |
| D4 | **The other device hears about a change through Supabase Realtime**, as a "something changed, check now" ping on `timetrack_entries` (row security applies). Polling stays at 60 s as the fallback. Checks also run on `online`, on `focus` and when the page becomes visible. | Overlapping use needs seconds, not a minute. | One reversible database setting: `alter publication supabase_realtime add table public.timetrack_entries`. Supabase includes Realtime on every plan, the free one too, and one person's pings are far under its limits (the executing AI checks the project's plan page read-only before turning it on). If a limit were ever hit, the 60 s check still works. |
| D5 | **Time comes from the server's clock, corrected per device.** The device learns its offset from the server's `Date` header and stamps starts and stops with the corrected time. | Fixes sync #6. | If the offset is wrong by up to a second, entries are off by that second. |
| D6 | **The badge reports both sending and checking.** It shows "Saved · checked just now", turns amber at "Not checked for 5 min" (or when the last check failed), and checks again when tapped. | Fixes sync #4: the badge must never say more than is true. | None. |
| D7 | **An entry's tags are sent as a full set.** The server removes links not in the set. | Fixes sync #3. | None. |
| D8 | **The section and the open sheet live in the address** (`?view=calendar`, `?entry=<id>`). Opening the sheet adds a history step, so Android Back closes it. | Fixes getting-around #3. | Old links with no `view` still land on Timer. |
| D9 | **On the PC the app's top bar shows on `/time`.** On the phone it stays hidden, as today, because the tracker has its own bottom bar. The back control returns to the page you came from, with Dashboard as the fallback. | Fixes getting-around #4. | The guard test in `navTabs.ts` changes; covered in Phase 3. |
| D10 | **A typed time means the nearest sensible time.** A bare hour from 1 to 12 with no am/pm is whichever of h or h+12 comes first after the start (start 10:00, end "3" means 15:00). `4p` means 16:00, and `1h30` means 1 h 30 min. Any typed value that makes an entry longer than 12 h asks first: "That makes it 23 h. Did you mean 21:00?". Since 2026-11-04 (edits audit B5): it asks only when the value makes the entry longer than it was, and it also asks when a typed value cuts more than 12 h off a finished entry ("That cuts it from 49 hours to 2 hours."). A typed start stays on the start's own day (or the night after, on an entry past midnight). | Fixes the three misreadings and the 23-hour accidents. | One extra tap for a real 13 h entry. |
| D11 | **Phones get the number keypad** (`inputMode="numeric"`) for start and end. "1155" means 11:55 and "930" means 9:30. Duration uses `inputMode="decimal"`, with a hint: "90 = 90 min · 1.30 = 1 h 30 · 1.5 = 1 h 30". Since 2026-11-04 (edits audit B7): a "." or "," followed by exactly two digits under 60 is hours and minutes (1.30 = 1:30, 0,45 = 0:45); one digit is a decimal hour (1.5 = 1:30). | Fixes the letter-keyboard pain. | Typing a colon needs the long-press on Gboard; colons are never needed. |
| D12 | **"Touching" neighbours move together.** When an entry's end changes and the next entry started within 60 s of the old end, the next entry's start moves too. The toast says "Also moved ‘Email’ to start 11:55 · Keep ‘Email’ as it was". The same applies to a start and the entry before it. Limits: only start/end edits (never dragging a whole block), never across days, never shrinking a neighbour below 1 min (then the overlap is marked with Fix instead). | Your data shows gaps and overlaps after every hand fix. Toggl's calendar behaves the same way. | Your Q3 answer can switch this to "ask each time". |
| D13 | **The wheel and the calendar use pointer events** (one code path for mouse, touch and pen), snap to 5 min, tick on each step on Android (`navigator.vibrate(5)`), and have ±1 min buttons for fine-tuning. | One way to drag, everywhere. | None. |
| D14 | **No new npm packages.** The wheel is our own SVG and pointer code. | This checkout's safety layer refuses changes to the dependency list without the owner, and nothing here needs a library. | Somewhat more code to write. |

---

# BLOCKERS — things only a person can do, or that may stop execution

Each was attempted once on 2026-11-03; the result is recorded.

| ID | What | Attempted, and the result | Blocks | Recommendation |
|---|---|---|---|---|
| B-PHONE | You use the finished changes on your phone for a day and report what still annoys you. | Read-only: `push_devices` for your account lists one device, "Android phone · installed app", enabled, last delivery 2026-11-03 18:44 UTC. So the phone is Android, which settles D3 (Android usually sends on hide), D11 (Gboard keypad) and D13 (vibration works). | Phase 8's last check only. | Do it after Phase 6. The executing AI posts a short "what to try" list. |
| B-MIGRATE | Apply the database changes in Phases 2 and 7 to the live database. | `npx supabase migration list --linked` in this checkout: `ProjectRefNotLinkedError`. `npx supabase projects list` from the scratchpad: the CLI is signed in and lists the projects. `Plans/thought.md` linked from a scratch folder and pushed this way. | Phases 2 and 7. | Your yes to this plan covers it (see "What you are agreeing to"). Link from a scratch folder, and run `migration list --linked` right before each push, because another session may have added a migration. |
| B-BACKUP | A backup of your time data before each database change. | `npx tsx scripts/backup-timetrack.ts --user edec2d78-…` wrote `backups/timetrack-2026-11-03-18-50-05.json` (the folder is gitignored, confirmed with `git check-ignore`). | Phases 2 and 7. | Take a new one right before each migration. Copy one off the machine now and then (runbook). |
| B-E2E | The two-device browser tests need throwaway accounts and a running app. | `npx playwright test tests/e2e/timetrack-sync.spec.ts --list` lists 24 tests, including an `[android]` project. The fixtures create throwaway users with the admin key (`tests/e2e/fixtures/test.ts:81`). Not run: WSL memory is limited and other sessions share the checkout. | Acceptance for Phases 2, 3, 5 and 6. | Run one spec file at a time, never the whole suite while another session is building. |
| B-SW | `public/sw.js` (getting-around #12) is shared with the offline work of another session. | `Plans/thought.md` recorded the same rule: ask before editing. | One small item in Phase 3. | Ask in the session; if no answer, leave #12 for later. It is minor. |

---

# OPEN QUESTIONS — for you, each with a recommendation

The board shows these with pictures and working demos. Mark them there; the executing AI reads your marks.

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | **Which wheel?** (a) a clock face: one turn = 12 hours, and the handles point where a clock's hand would; (b) a minute ring: one turn = 1 hour, finer but more spinning; (c) scrolling number drums, like an alarm clock. | **(a) clock face**. "I stopped at 11:55" maps straight onto it, and 3 hours back is one drag. It snaps to 5 min, with ±1 buttons. | (b) if (a) feels coarse in the demo; (c) if circles feel fiddly. | Rebuilding the wheel: one phase of work. That is why the demo comes first. |
| Q2 | **Planned entries** (things that will happen): how should a future entry look and count? | It shows striped, as "planned", until its start time passes, then becomes normal. It is not counted in today's or the week's total before that. | Count it straight away, as Toggl does. | A plan you skip inflates your totals (if counted), or a planned block looks odd (if not). |
| Q3 | **Touching neighbours** (D12): when you change an end, should the next entry's start follow automatically, with Undo? | **Yes, automatically, with Undo.** | Ask every time. | One tap more each time, or an accidental move that you undo. |
| Q4 | **A "still running?" notification on your phone.** | **Yes, after 3 hours, once more at 6 hours, never between 23:00 and 07:00.** Tapping opens the Switched/Stopped picker. | No notification; only the card when you open the app. | Too many pings, or forgotten timers staying forgotten. |
| Q5 | **On the PC, show the app's top bar on Time** (D9)? | **Yes.** Thoughts, Settings and Log Out are one click away again. | Keep it hidden, as today. | A little less height for the calendar. |
| Q6 | **The "you last used the app at…" card**: when you open the app and a timer has run longer than usual, should it offer "Stop at 11:55"? | **Yes.** "Longer than usual" means more than twice your typical length for that project, and at least 90 min. | Show it only after 3 hours. | An unneeded card, dismissed with one tap. |

## DECISIONS — made 2026-11-03, after your marks and your message

Your message after marking the board said:
> "by overlap i meant, i start a timer on pc, then close it on phone once i am done with gym or whatever.
> U can make the other choices i havent chosen on the artifact, but in doing so, try to think about 10
> different scenarios for each before u just decide. For example the 'still running' intuitively, i would
> say that it should always sort of be on my phone that i am actively running something with an icon, is
> that what toggl does or would that be something i just do? i think the 'you last used the app' seems
> weird. ... i am particularly interested in you fixing a bunch of the bugs"

| # | Decision | Who decided |
|---|---|---|
| Q1 | **(c) Scrolling drums**, with a **day drum** on each side: [day][hour][minute]. | You. The day drum answers your note, "think about multiple days what do u do there". Its design was checked against the scenarios below. |
| Q2 | **Planned entries are striped and not counted until their time comes.** | You. |
| Q3 | **Touching neighbours move together automatically**, with a one-tap "Keep ‹B› as it was", within limits. | Claude, after 11 scenarios (below). You wrote "i dunno, what actually makes sense?" |
| Q4 | **Replaced by a running-timer notification on your phone**: always there while something runs, silent, with a Stop button. One alert with sound if a timer passes 6 h, held until 07:00 at night. | Claude, after 12 scenarios (below), from your instinct. **Toggl's Android app does this**: its help page lists a "Running Timer notification", which "shows your currently running Time Entry" (support.toggl.com/toggl-track-timer-for-android, read 2026-11-03). Toggl's notification opens the app when tapped; ours also has a Stop button. |
| Q5 | **Yes, the app's top bar shows on the PC**, and the tracker's own duplicate "← Dashboard · Time" row goes away there, so the calendar keeps its height. | Claude, after 10 scenarios (below). |
| Q6 | **Dropped.** The "you last used the app" card and the matching chip in Switched at… are not built. | You ("seems weird"). The running notification does the same job better: you see the timer every time you look at your phone. |
| Items | **All Yes.** Checked against your 10 everyday scenarios (below): every item is needed by at least one of them. | Claude. |

**Your "overlap" in plain words, and what fixes it.** You start "Gym" on the PC at home, leave, and stop it on
the phone afterwards. Today that path meets four of the faults:
- The phone opens with an old copy that has no timer running, and gives no "checking" sign (sync #2). A
  tap in that moment acts on the old copy.
- In a gym basement with no signal, the phone never hears that Gym is running (sync #2).
- Stop, then lock the phone at once, and the stop may wait (sync #5).
- If the phone's clock differs from the PC's, the length comes out wrong (sync #6).

Phase 2 fixes all four, and Phase 7's notification removes the need to open the app at all: the phone
already shows "● Gym · since 17:05 [Stop]", and the Stop goes straight to the server. This exact story
becomes an e2e test (Phase 2 acceptance) and the first thing on your phone-day list.

### Q1 — the drums across days: 11 scenarios

1. **Today's fix, 09:00 → 11:55.** Both day drums read "Today"; only hour and minute move.
2. **Overnight timer, 22:30 yesterday → 01:15 today.** The start day drum says "Yesterday", the end says
   "Today", and the length reads 2:45.
3. **Planning tomorrow, 10:00 → 11:30.** Both day drums say "Tomorrow", and the entry is saved as planned
   (striped).
4. **Fixing last Thursday.** The day drum runs from 14 days back to 14 days ahead, labelled "Thu 30 Oct".
   Anything older uses the date box that is already in the sheet.
5. **A timer forgotten over a weekend (over 24 h).** The end day drum is independent, so Friday → Sunday
   works. The over-12-hours question from D10 still asks first.
6. **An end set before the start** (both "Today", 14:00 → 13:00). This is not silently turned into
   tomorrow, because the day drums are explicit. It shows "Ends before it starts", with a one-tap "End
   tomorrow". ✓ is disabled until it is fixed.
7. **A running entry.** The end drums are hidden. "Stop at…" shows them, and anything after now is greyed.
8. **Precision.** The minute drum steps 1 minute (0–59), so 11:57 is reachable without the ± buttons.
   The ±5 buttons stay for quick nudges.
9. **12-hour mode** (a setting the app has). The hour drum follows it and adds an AM/PM drum.
10. **Seconds.** Drums set :00. An exact time like 07:59:47 can still be typed in the box beside them.
11. **A one-handed flick on a phone.** The drums use the browser's own scroll snapping (no library), and
    each step ticks the vibration on Android.

### Q3 — touching neighbours: 11 scenarios

"Touching" means the next entry started within 60 s of this one's end (or the previous one ended within
60 s of this one's start).

1. **Forgot to switch.** A ran 09:00 → 14:30 and B started at 14:30. You set A's end to 11:55, so B's start
   follows to 11:55. That is right: B is what you were doing from 11:55. Without this, there is a gap you
   fix by hand.
2. **A lunch gap.** A ended 12:00, nothing was tracked, and B started 12:30. A's end changes to 12:10, and B
   does not move, because they were not touching. Right.
3. **A ran longer than recorded.** You move A's end 10 minutes later, so B's start moves 10 minutes later.
   Without this they would overlap.
4. **Moving A's end past B's whole length** (B was a 5-minute slip). B would shrink to nothing. So B is not
   moved; the overlap is marked with a "Fix" button instead. **Never delete or zero a neighbour.**
5. **B is running.** It follows the same rule. Its start moves, it keeps running, and its running time
   changes by the same amount.
6. **A's start moves earlier**, and Z, before A, ended where A started. Z's end follows, so Z gets
   shorter. Usually right, for the same reason as 1.
7. **Dragging a whole block in the calendar.** Neighbours do not follow. Moving a block is a different
   intent, and Toggl's calendar leaves others alone too. **Only start and end edits move neighbours.**
8. **Two devices.** The phone stopped A at 17:05:12 and the PC started B at 17:05:40. That is within 60 s,
   so they count as touching. Right.
9. **Entries on different days, or duration-only entries.** Never linked.
10. **You didn't want B moved.** The toast says "Also moved ‘B’ to start 11:55 · Keep ‘B’ as it was". One
    tap puts B back, and A keeps your change.
11. **Sync.** Two rows change, and both go through D1 (stale copies refused), so the other device cannot
    half-apply it.

Verdict: automatic. In 8 of 11 it is what you want with no tap; in the rest, the limits (4, 7, 9) and the
one-tap undo (10) cover it. "Ask every time" would add a question to the most common fix you make.

### Q4 — the running-timer notification: 12 scenarios

1. **Your gym handoff.** You start on the PC. A push puts "● Gym · since 17:05" on the phone with a
   **Stop** button. After the gym, you pull down the shade and tap Stop. You never open the app.
2. **Starting on the phone itself.** The same notification appears.
3. **Switching 12 times a day** (you track back to back). The notification is **replaced silently**: same
   tag, no sound, no vibration. Twelve buzzes a day would be unbearable.
4. **You stop it anywhere.** It is replaced by a quiet "Stopped · Gym 1:12" that you swipe away.
   Browsers require every push to show something, which rules out deleting it in silence, and Toggl does
   the same: its "Stopped Timer" notification.
5. **Forgotten overnight.** The notification sits in the shade all night. Its one alert with sound comes at
   6 h, and between 23:00 and 07:00 it is held until 07:00. Why 6 h: none of your 105 entries ran past
   6 h, and 3 ran 3–6 h. A 3-hour alert would ring during real work. Forgotten timers on Nov 2–3 were
   noticed after about 2–3 h, which an alert could not beat. **The always-there notification does that
   job.**
6. **No signal in the gym basement.** You tap Stop, and the worker saves the stop with the time you tapped.
   The phone's background sync (Chrome on Android has it) sends it when the signal returns, so the stop
   time is when you tapped, not when the signal came back.
7. **You stopped it on the PC an hour ago and forgot.** Tapping Stop on the phone does nothing harmful. The
   server stops only a timer still running, and the notification says "Already stopped at 18:00".
8. **You swipe it away.** It stays away until the next start or stop. The app does not fight you.
9. **The PC.** Notifications go only to devices that turned them on. The PC has none, and a setting per
   device ("Show the running timer on this device") defaults to on for the installed phone app.
10. **Thought Frequencies reminders.** They use a different tag, so neither replaces the other.
11. **The lock screen.** It shows the entry's description, as Toggl's does. If that is ever private,
    Android's own lock-screen setting can hide notification contents. The plan says so in Settings.
12. **Limits of the web.** A web notification cannot tick like a stopwatch, so it shows "since 17:05", not
    a live 1:12:33. Android also lets you swipe it away, which a native app could prevent. Most Android
    launchers still put a dot on the app's icon while it is there.

### Q5 — the app's top bar on the PC: 10 scenarios

1. **At the PC in Time, you want to log a thought.** With the bar it is one click; today it is Dashboard,
   then More, then Thoughts.
2. **Log out from Time.** Today there is no way; with the bar it is one click.
3. **The calendar on a 768-pixel-tall laptop.** The bar costs about 56 px. Removing the tracker's
   duplicate "← Dashboard · Time" row on the PC gives it back.
4. **Two bars stacked looking cluttered.** That is the reason the duplicate row goes. The tracker's
   section tabs (Timer, Calendar, …) stay under the app bar.
5. **A narrow PC window (under 640 px).** It behaves like a phone: no app bar, the tracker's bottom bar.
6. **A tablet in portrait.** It gets the bar; plenty of height.
7. **Keyboard shortcuts.** The bar has links only, no shortcuts, so nothing collides.
8. **Every other signed-in page has the bar on the PC** (`docs/product/map.md`: "one frame on every
   signed-in page"). Time was the exception.
9. **Distraction-free tracking.** The bar is one thin row, so little is lost.
10. **The guard test** that checks every page either shows the bar or says why not. It changes to "hidden
    on phones only", in the same commit.

### The items — your 10 everyday scenarios, and which items each needs

| # | Scenario | Items it needs |
|---|---|---|
| S1 | Start Gym on the PC, stop it on the phone afterwards | p2-stale, p2-checking, p2-send, p2-live, p2-clock, running notification |
| S2 | Forgot to switch: working on X, really switched at 11:55, notice at 14:30 | p4-switched, p4-onetap, p1-parse, p1-keypad, drums, Q3 |
| S3 | Timer ran overnight; fix it on the phone in the morning | p4-stopped, p4-stopat, drums (day), p1-keypad, running notification |
| S4 | No signal in a basement; open the app, stop the timer | p2-checking, p2-badge, p2-send, running notification (stop offline) |
| S5 | PC tab open all day; start and stop things on the phone in between | p2-live, p2-stale, p2-badge |
| S6 | Plan "Gym tomorrow 10:00–11:30" on the phone | p6-drag, drums (day), Q2, p1-manual |
| S7 | Walked 40 min without a timer; log it afterwards | p1-logdur, p1-manual, p1-parse, p6-drag |
| S8 | Fix yesterday's 22:30–01:15 entry | drums (day), p1-parse (end before start), p4-onetap |
| S9 | From Thoughts into Time, Calendar, Back, Reports, Back out | p3-back, p3-return, p3-loading, p3-survive, p1-small, p6-swipe |
| S10 | At the PC: change an end time, remove a tag | p1-parse, Q3, p4-marks, p2-tags |

Every item appears at least once, so every item stays Yes.

---

# PHASES

Each phase goes live on its own (push to `main`). Each starts with tests that fail today and ends with
the acceptance checks listed. Size: S under half a day, M about a day, L several days, for an AI session.

## Phase 0 — Ground truth (no product change) · S

1. Read the board's marks (`ArtifactData list marks`). Where a question is unmarked, use the recommendation
   and say so in the phase report.
2. Take a backup (B-BACKUP).
3. Write the failing tests that pin each defect named in "What exists today", one file per defect, next to
   the existing `tests/unit/timetrack/` files. Use names that say the promise
   (e.g. `aSleepingPhoneCannotRestartAStoppedTimer.test.tsx`). Each must fail on today's `main` for the
   stated reason.
   - **Sync:** #1 (stop and delete), #2, #3, #4, #6, #7.
   - **Getting around:** #1, #3, #5, #7, #8, #10.
   - **Parsing:** `1h30`, `4p`, and an end before the start's clock time.
4. Write one new two-device e2e test in `tests/e2e/timetrack-sync.spec.ts`. Phone context goes offline,
   edits the running entry; PC context stops it; phone comes back online. Expect: still stopped on both.
   It must fail today.
5. Check getting-around #11 (the tab title) and the "edits lost on Back" doubt in a real browser on
   `/test/toggl`, and record what was seen.

**Acceptance:** every new test fails on `main` for the reason its name gives; each failure message is
recorded in the phase report.

## Phase 1 — Quick wins you feel the same day · S

1. Parsing (D10): `1h30`, `4p`/`3p`, nearest-sensible end, a question for anything over 12 h.
2. Number keypad (D11) on start, end and duration in the timer bar, the sheet, list rows and manual mode.
3. "Go to ‹project›" opens Projects focused on that project (getting-around #5).
4. Shortcuts do nothing while a dialog is open (getting-around #7).
5. The idle migration runs once (getting-around #8).
6. Typing a duration with no timer running logs a finished entry that ends now, as in Toggl.
7. Manual mode opens at "last entry's end → now" (or "30 min ago → now" if nothing is tracked today).

**Acceptance:** the Phase 0 tests for these pass; the whole `tests/unit/timetrack/` folder passes;
typecheck passes (`typecheck-ratchet`). On `/test/toggl` at 390 px, the keypad attribute is present on all
time boxes (checked in the DOM). Then push.

## Phase 2 — Phone and PC stop undoing each other · L

1. D1, the conditional write. A database function (or an `updated_at` check in the repo inside one
   statement) applies a row only if `updated_at` equals the base the device sent. Otherwise it returns the
   current row. Migration plus rollback file. The client keeps the base per queued row (it already holds
   `serverRows`) and does the three-way re-apply. Never send `deleted_at: null` or `stopped_at: null` over a
   server value that is set, unless this device made that exact change itself.
2. D2, "Checking…" on open and on wake. Start, Stop and Switched wait for it, for 3 s at most.
3. D3, send on hide, close and leave, with `keepalive`.
4. D4, the Realtime ping on `timetrack_entries`. Migration: add the table to `supabase_realtime`
   (rollback: drop it). Subscribe while `/time` is open, check on each ping, and keep the 60 s check as the
   fallback. Also check on `online` and `focus`, and retry the first read on `online`.
5. D5, the clock offset from the `Date` header.
6. D6, the badge.
7. D7, tags as a full set.
8. Checkpoint overlap: check from `since − 5 s` (sync #7).

**Acceptance:**
- All Phase 0 sync tests pass, including the two-device e2e.
- `tests/e2e/timetrack-sync.spec.ts` passes in full, one file run alone, including `@timing`.
- After the migrations: `migration list --linked` shows none pending, and a read-only check shows the
  publication holds `timetrack_entries`.
- A two-browser check by the AI with a throwaway account (not your account): stop in browser A, see it
  stopped in browser B within 5 s.
- **The owner's own story as an e2e test:** start "Gym" in a desktop context; open a phone context
  (`[android]`) that last saw the account before the start, so it holds an old copy. Expect: the phone
  shows "Checking…" and then Gym running; Stop there; the desktop shows it stopped within 5 s, with the
  phone's stop time.
- Your 105 entries are unchanged: a read-only count and checksum before and after.
- Then push.

## Phase 3 — Getting around without surprises · M

1. D8: the section and sheet in the address, so Back steps through them (getting-around #3).
2. D9: the top bar on the PC, and a back control that returns where you came from (getting-around #4).
   Update `HIDDEN_ROUTE_PREFIXES` and its guard test so that the rule is "hidden on phones".
3. `app/(app)/time/loading.tsx`, drawing the same header the page draws (getting-around #6). Read
   `node_modules/next/dist/docs/` on `loading.tsx` first.
4. State that survives leaving: Pomodoro's end time, the last reminder time and "forgotten-timer warned for
   entry X" saved with the workspace; an unstarted draft and the manual form kept in `sessionStorage`
   (getting-around #9).
5. Bottom-bar height measured when the bar appears (#10). The title is not written on leave (#11, if
   Phase 0 confirmed it). `?report=` removed after use (#12, second half). The `?start=1` offline fix only
   with the shared-worker owner's yes (B-SW).

**Acceptance:**
- Phase 0 tests for #3, #10 pass.
- On `/test/toggl` at 390 px in the Playwright browser: open Calendar, open an entry, press Back (closes
  the sheet), press Back (Timer), reload on Calendar (stays on Calendar).
- At 1366 px: the app's top bar is visible on `/time` in a production-like run.
- Then push.

## Phase 4 — Fixing times without arithmetic · M

1. **Switched at…** on the running timer bar, shown when a description for the next thing is typed (or
   from the ⋮ menu). It opens the time picker. In Phase 4 that is the typed box, the chips and the ±
   buttons; Phase 5 adds the drums. The chips are "5 min ago", "15 min ago", "30 min ago", "1 h ago" and
   "When the last entry ended" (for a gap). (No "last used the app" chip: Q6 was dropped.) Confirming ends the running entry at T and starts the new one at T, as one
   undoable change.
2. **Stopped at…**: the same picker, with no new entry.
3. ~~The "last used the app" card~~ dropped (Q6, the owner: "seems weird").
4. **One-tap buttons** in the sheet: −5 / +5 on start and end, "End now", "Start where the last one
   ended", "End where the next one starts".
5. **Touching neighbours** (D12) in the sheet, the list rows and the calendar, with Undo.
6. **Overlap and gap marks** in the list: a thin red mark between two entries that overlap, with "Fix",
   which ends the earlier one where the later one starts. Gaps under 5 minutes get "Close gap".
7. The end box moves out from behind "Change times": the running timer bar shows "Started 09:00 · Stop at…".

**Acceptance:**
- New tests cover each item, including a replay of 2026-11-03 morning: entry started at 06:17, forgotten,
  switched at 07:00 — one entry ends at 07:00:00 and the next starts at 07:00:00, no overlap.
- The whole timetrack unit suite passes.
- Browser walk on `/test/toggl` at 390 px of the "What a day looks like" story, with screenshots in the
  phase report.
- Then push.

## Phase 5 — The drums · L

The owner picked (c), scrolling drums, and asked what happens across days. The design is the "Q1 — the drums
across days" scenarios in DECISIONS.

1. **Three drums per side: [day][hour][minute].**
   - The day drum runs from 14 days back to 14 days ahead: "Yesterday", "Today", "Tomorrow", then "Thu 30
     Oct".
   - The hour drum follows the 12/24-hour setting, with an AM/PM drum in 12-hour mode.
   - The minute drum steps 1 minute.
   - It sits in the sheet above the start, end and duration boxes, and in the Switched at… / Stopped at…
     picker. Typing, the chips and the ± buttons stay beside it.
2. **A running entry** shows only the start drums. "Stop at…" shows the end drums, with times after now
   greyed and refused.
3. **End before start** shows "Ends before it starts" with a one-tap "End next day", and ✓ is disabled. It
   is never rolled to the next day silently, because the day drums are explicit.
4. **The length** reads live under the drums: "2:45 · ends next day" when it crosses midnight.
5. **An end after now on a stopped entry** makes it planned (Q2): striped, not counted until it starts.
6. **Built with the browser's own scroll snapping**, no library (D14). Each step ticks the vibration on
   Android. Each drum is a listbox with arrow-key support and its value read aloud.

**Acceptance:**
- Pure functions are unit tested: drum values to a time and back, across midnight, across DST (the last
  Sunday of October and March), 12-hour mode, and end before start.
- A component test scrolls each drum.
- In the Playwright browser at 390 px with touch emulation, these three stories work:
  - fix a running entry to have ended 2 h ago;
  - set yesterday 22:30 → today 01:15 and see 2:45;
  - plan tomorrow 10:00–11:30 and see it striped.
- Screenshots in the report.
- Then push.

## Phase 6 — The calendar on the phone · M

1. Drag on the calendar uses pointer events everywhere (D13). The `isMobile` switch-offs go. Long-press
   (400 ms) on empty space starts a create; dragging sets the length.
2. Hold an entry to move it; drag its top or bottom edge to resize (top-edge resize also on the PC).
3. Each drag step vibrates on Android. Scrolling still works: a drag starts only after the long-press.
4. **Planned entries** (Q2) are drawn striped until their start passes.
5. Swipe left or right on the day view changes the day.

**Acceptance:**
- Component tests for create, move, resize-top and resize-bottom with touch pointers.
- In the browser at 390 px with touch emulation: create a block tomorrow 10:00–11:30, see it striped, and
  see it absent from today's total.
- `tests/e2e/toggl-time-tracker.spec.ts` passes.
- Then push.

## Phase 7 — The running timer in your phone's notification shade · M

What Toggl's Android app calls its "Running Timer notification", plus a Stop button. The design is the
"Q4 — the running-timer notification" scenarios in DECISIONS.

1. **When a timer starts or stops on any device, the server pushes to every device that has the running
   timer switched on.**
   - The sync route sees a running entry appear or end, and sends through `src/notifications/pushService.ts`
     with kind `timetrack-running` and tag `timer-running`.
   - The text: "● Gym · since 17:05", silent, not renotifying, with one action, Stop.
   - When stopped, the push replaces it with a silent "Stopped · Gym 1:12". Every push must show
     something (`public/sw.js` rule 1).
2. **The worker** (`public/sw.js`, the notification half, built by `Plans/thought.md`) learns `silent` and
   `renotify` from the payload, and a `stop` action.
   - The action POSTs to a new `/api/timetrack/stop` with `{entryId, at}`, where `at` is the time of the
     tap.
   - The server stops that entry only if it is still running (D1), and answers "already stopped at 18:00"
     otherwise.
   - Offline, the worker stores the stop and sends it with Background Sync, falling back to the next app
     open, still with the tap time.
3. **One alert with sound at 6 h.**
   - The existing minute clock (`thoughts-clock` calls `/api/notifications/tick`) also finds running entries
     past 6 h that have not been alerted and re-posts the notification once, with `renotify`.
   - Between 23:00 and 07:00 in the owner's zone, the alert is held until 07:00.
   - A migration adds `timetrack_entries.alerted_at` (with rollback).
4. **A setting per device:** "Show the running timer on this device", on by default for the installed phone
   app and off for desktop browsers. It lives on the Settings screen beside the existing notification
   switch, with one line about Android's lock-screen privacy setting.
5. **Tap the notification body** to open `/time?view=timer`. While the timer runs, that view shows "Stop at…".

**Acceptance:**
- Unit tests:
  - which state changes send a push (start, stop, switch; not an edit of the description);
  - the 6 h rule and the 23:00–07:00 hold;
  - the stop route's "only if still running" rule;
  - the payload never carrying a description when the device setting is off.
- The worker's push and click handling are tested with the existing worker test set-up, or a new one if
  there is none.
- After deploy, a throwaway account with a test device (never the owner's) gets a `timetrack-running`
  row in `notification_sends` on start and on stop.
- The notifications runbook gains a section; B-PHONE's list starts with the gym handoff.
- Then push.

## Phase 8 — Proof, papers, and your phone day · S

1. Full `tests/unit/timetrack/` run, the three timetrack e2e files one at a time, the `[android]` project
   included, and typecheck.
2. `/code-review` on the plan's whole diff. `/security-review` too, because Phases 2 and 7 touch row-level
   data and a server route (use a subagent; see the shared-checkout memory).
3. Update `docs/runbooks/timetrack.md`. It still says `/dashboard/time` and "until the sync work lands"; it
   gains the Realtime switch, how to roll it back, and how D1 refuses stale rows. Update the Time line in
   `docs/product/map.md`.
4. Post the "what to try on your phone" list for B-PHONE: Switched at…, Stopped at…, the wheel, the phone
   calendar, a stop on the PC with the phone asleep, and Back through sections.
5. Read your answers and turn each annoyance into a fix or a line in this plan.

**Acceptance:** all of the above green; your phone day done, and what you found is recorded in this file.

---

# AUDIT — 2026-11-04: five agents, 36 bugs

The owner, after Phases 0–3: "can you run some audit, lets say you spend 5 agents, that run the time app
in various ways for 24 hours and find bugs? ... i doubt you have fixed the bugs at all".

**How.** A frozen copy of main (599dfb24) ran on its own server against the local test database, with
throwaway accounts only. Four agents each lived a day in compressed time:
- a PC and a phone on one account;
- forgotten timers and every way to type a time;
- getting around the app, and two people on one browser;
- a heavy user (1,791 entries over 92 days, 40 projects, 30 tags).
The fifth built a real-time soak with two to three devices, random actions and invariant checks. Its
24-hour run started 2026-11-04 14:49 UTC against main 30ef12c0 (seed 978856110; logs in that session's
scratchpad). A bug counted only when reproduced twice. Each has a browser spec that reproduces it, and a
unit test that failed before its fix.

| Area | Bugs | The worst | Fixed in |
|---|---|---|---|
| Two devices (A1–A6) | 6 | A Stop made on a phone opened with no signal was lost if the app reopened before the signal came back. A reconciliation stop was never sent, so the account kept two timers running. A stale Stop moved the end later. | e0fa5d6b (A1–A3), ad5f11a7 (A4–A6) |
| Typing and fixing times (B1–B10) | 10 | A zero-length end was stored milliseconds before its start, so the account refused it and the timer kept running there. A plain click on a PC calendar block changed its end. A running start could be set in the future. "1.30" became 1:18. | 1e4ed2af |
| Getting around and accounts (C1–C6) | 6 | **Privacy:** Log Out left the tracker in the browser. The next person saw the previous person's entries, and could have them uploaded into their own account. A slow open undid a Stop. | e0fa5d6b, 0f55f4da, 8b83d0e9, 6c316ae7 |
| A heavy user (D1–D13) | 13 (D8 = B8) | Bulk edit changed locked entries. A CSV export and re-import lost data. CSV cells could carry spreadsheet formulas (the workout export too). Typing took 1.7 s per key on a phone, now 25 ms. | ed023648, 1e4ed2af (D4, D8) |
| The soak (E3) | 1 new | Adding an entry in manual mode emptied the running bar. Its other two findings were A3 and A4. | a25e740c |

Security reviews ran on the sync and privacy fixes (2 medium and 2 low findings, all fixed in 8b83d0e9)
and on Phase 7 (2 low; see Status).

**Left open, on purpose or out of reach:**
- Two narrow privacy cases that matter only once a second person uses the same browser:
  - a copy left by someone who logged out before 2026-11-04, with nothing unsent, is still shown to the
    next account (it is never uploaded);
  - signing in through an emailed link does not empty the stored offline pages.
- Logging out with changes not yet sent now tries to send them, then asks before losing them.
- Start takes 2–5 s on the development server. The profile puts it in React's development-only code; a
  production build was not measured.
- A tag or project created under the same name on two devices before either checks becomes two.
- Realtime cannot be tested in the test database.
- From the code reviews, small and left for now:
  - Stop has no lock check, so a timer running since before the lock date can still be stopped.
  - A keyboard nudge of a calendar block moves real minutes across the clock-change night.
  - "Fix" is not offered when an entry sits inside another; the sheet fixes it.
  - On a phone, the "from the day before" row cuts the project name short.

---

# NOT IN THIS PLAN

Recorded so nobody wonders. Each item can be its own small plan later:
- Pomodoro extras: a longer break after N rounds, and breaks saved as entries.
- A "suggestions" list of recent and most-used entries.
- Idle detection's "add the idle time as a new entry".
- Swipe on a row to continue it.
- Reports.

None was part of the four complaints.

---

# PART 2 — Ground rules for the executing session

1. **Read the board's marks first.** A mark of No drops that item, and Later moves it to "Not in this
   plan". Unmarked items follow the recommendation.
2. **The owner decides money, deleting real data, and anything that cannot be undone, beforehand.** This
   plan does none of the three. If a step starts to need one, stop and ask in plain words.
3. **Never test on the owner's account.** For browser checks, use `/test/toggl` signed out (cookies and
   localStorage cleared; the 401s on `/api/timetrack/sync` are expected there) or the e2e throwaway
   accounts. Reads of the owner's data are read-only and print numbers, not descriptions.
4. **Backup before every migration**, and run `supabase migration list --linked` right before pushing one.
   Each migration has a rollback file in `supabase/migrations/rollback/`.
5. **Every fix starts as a failing test** that names the promise, and the phase report quotes the failure
   message from before the fix.
6. **Commit with `git commit --only <paths>`**, never `git add -A` or `git stash` (other sessions share the
   tree). Run typecheck before each push. Push each phase to `main` when its acceptance is green.
7. **No new npm packages** (D14). If one turns out to be truly needed, ask the owner. The checkout's
   safety layer refuses dependency changes anyway.
8. **Next.js here is not the one in your training data.** Read `node_modules/next/dist/docs/` before
   `loading.tsx`, routing or navigation work.
9. **Run e2e one file at a time**, never the full suite while another session is active. WSL memory is
   limited; check `df /mnt/c` before large writes.
10. **Report to the owner in plain words, doubt first**, with screenshots from the phone-size browser for
    anything he will see.

---

# /goal PROMPTS

Run them in order; each assumes the previous one is live.

**Phase 0**
`/goal Execute Phase 0 of Plans/time-tracker-like-toggl.md: read the board's marks, take a backup, write every failing test it lists (unit + the two-device e2e), confirm each fails on main for its stated reason, and check getting-around #11 and the Back-edit doubt in the browser. No product code. Commit the tests as skipped-with-reason (it.fails or test.fail) so the pre-commit hook passes, and record the failures in the plan.`

**Phase 1**
`/goal Execute Phase 1 of Plans/time-tracker-like-toggl.md (quick wins: parsing D10, keypad D11, Go to project, shortcuts behind dialogs, idle migration once, typed duration with no timer, manual-mode defaults). Turn the Phase 0 tests for these into passing tests, run the timetrack unit suite and typecheck, push to main, report in plain words.`

**Phase 2**
`/goal Execute Phase 2 of Plans/time-tracker-like-toggl.md (D1–D7 and the checkpoint overlap). Backup first, migrations with rollback files, apply via a scratch-folder supabase link after migration list --linked. Acceptance as written, including the two-browser check on a throwaway account and the before/after checksum of the owner's entries. Push, report.`

**Phase 3**
`/goal Execute Phase 3 of Plans/time-tracker-like-toggl.md (address-driven sections and sheet, PC top bar, back to where you came from, loading.tsx, state that survives leaving, the small fixes). Ask before touching public/sw.js. Acceptance as written. Push, report.`

**Phase 4**
`/goal Execute Phase 4 of Plans/time-tracker-like-toggl.md (Switched at…, Stopped at…, the last-used card, one-tap buttons, touching neighbours, overlap and gap marks, Stop at… on the timer bar). Include the 2026-11-03 replay test. Browser walk at 390px with screenshots. Push, report.`

**Phase 5**
`/goal Execute Phase 5 of Plans/time-tracker-like-toggl.md: build the drums ([day][hour][minute], the owner's pick), no new packages, unit tests for the time maths including DST, touch-emulated browser check of the three stories. Push, report with screenshots.`

**Phase 6**
`/goal Execute Phase 6 of Plans/time-tracker-like-toggl.md: pointer-event calendar on the phone (long-press create, hold to move, both-edge resize, planned entries striped, day swipe). Acceptance as written. Push, report.`

**Phase 7**
`/goal Execute Phase 7 of Plans/time-tracker-like-toggl.md: the running-timer notification with a Stop button (push on start/stop, silent, the stop route, the 6 h alert held 23:00–07:00, per-device setting). Ask before editing public/sw.js only if its owner session is active. Backup, migration with rollback, test on a throwaway account only. Push, report.`

**Phase 8**
`/goal Execute Phase 8 of Plans/time-tracker-like-toggl.md: full verification, /code-review and /security-review on the plan's diff, runbook and map updates, then post the phone-day list for the owner.`
