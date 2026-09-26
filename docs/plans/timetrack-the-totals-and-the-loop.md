# The reversed time, the totals, the loop, and six smaller things

Written 2026-09-26 after a click-through of `/dashboard/time` on the product
route, signed in, at 390×844 and 1280×800, and then a second pass through the
source around each thing the click-through found. Everything under "The defects"
was reproduced in a browser, measured, or proved at the service with a script —
each item says which. Nothing here is inference alone; where a cause is read
rather than observed, the line says so.

**Stage check:** nobody has paid and nothing is in front of users. So the bar
here is "the numbers are true, tracked time is not lost, and the app does not
misbehave on a phone", not "scales to a thousand customers". Items 0 to 2 are
worth doing before anything else — the first loses time and silently stops the
account saving, the second shows a wrong total, the third hides both behind a
spinner. Items 3 to 8 are an afternoon together. The architecture section
deliberately builds nothing.

---

## The defects, in the order they should be fixed

### 0. One mistyped end time zeroes the entry and stops the account saving — for good

**Found after this plan was first written, while checking a different claim. It
outranks everything below it.**

**Seen, twice, by accident and then on purpose.** On the desktop inline row —
the main editing surface there — I typed `20:00` into the End field of an entry
running 21:36–22:00 and pressed Tab. What happened:

- The entry became `21:36 – 20:00`, **duration 0**. Twenty-four tracked minutes
  gone, no refusal, no toast, no undo. `updateEntry` computes
  `Math.max(0, stop - start)` (`timetrackService.ts:491`), so a reversed interval
  is stored as zero rather than rejected.
- The row on screen then reads `21:36 – 20:00 · 0:00`, which is not a time span
  anyone could have meant, and the app shows it as fact.
- The upload fails: the database has
  `constraint timetrack_entries_stop_after_start check (stopped_at is null or stopped_at >= started_at)`
  (`supabase/migrations/20260903120000_timetrack.sql:203`). The toast says
  "Your work is safe in this browser and will be sent again."
- **It is never sent again.** The queue drains all or nothing, so the bad row
  blocks it. I then created a perfectly good entry: local yes, **server no**,
  queue stuck at three rows, badge "Not saved" — and the retry from item 2
  pounding the endpoint about once a second, forever. Every later edit,
  every timer, on every device, stops reaching the account until somebody
  works out which entry is poisoned. Nothing on screen names it.
- Repaired by hand through the same field (set a sane End): the queue drained
  within seconds, the blocked entry arrived, badge back to "Saved". So the
  recovery exists — it is just invisible.

**Three different rules for the same question exist today:** the detail sheet
refuses `stop <= start` (`EntryList.tsx:951`), the database refuses `stop <
start` but allows equal, and the inline row and its duration box apply no rule
at all (`EntryList.tsx:412-421`). The app itself creates zero-length entries
routinely (the `N` shortcut, a fat-fingered Continue), so the sheet is refusing
something the rest of the app produces.

**Fix, in the one place that owns it:**

1. The rule gets a home. `validateEntry` (`timetrackService.ts:297`) is where
   every other "may this entry be saved" rule already lives — required fields,
   locked dates, approved timesheets — and it does not currently look at `stop`
   at all; its candidate type has no such field. Add `stop` to the candidate and
   the rule beside the others, then `updateEntry` (`:493`), `createManualEntry`
   (`:449`) and `startTimer` (`:373`) inherit it from their existing calls, and
   `updateEntry` stops clamping a reversed interval to zero (`:491`).
   Four call sites, one rule.

   **Checked at the service, without a browser:** `updateEntry` given a stop an
   hour before the start returns **zero violations**, stores the reversed stop
   and reports the entry's duration as **0** — an hour of tracked time, gone,
   with nothing refused. So the test below fails today for the reason stated.

   **A seventh caller gets fixed for free:** the CSV import already collects
   `createManualEntry`'s violations and reports skipped lines with reasons
   (`importExportService.ts:231`), so a Toggl export containing a reversed row —
   which today imports as a 0-duration entry and poisons the queue exactly like
   a mistyped field — starts reporting itself instead.
2. The client's rule is made **the same rule as the database's**: `stop >=
   start`, equal allowed. The sheet's stricter check goes, because it refuses
   entries the app creates on its own.

   **And an empty End is part of the same rule.** Clearing the End field in the
   sheet today sets `stop: null`, which downstream means *running*: a finished
   24-minute entry starts counting again, and the field is then
   `disabled={isRunning(entry)}` so it cannot be undone where it was done
   (reproduced; see the critic's pass, F1). An End that is cleared on a stopped
   entry is a refusal with a message, not a resurrection. Restarting a stopped
   entry has its own button, and that is where it should stay.

   **A third caller with the same shape:** the inline End parses against
   `dateKey(entry.start)` (`EntryList.tsx:413`), so on an overnight entry a
   sensible End lands on the wrong day and produces `stop < start` — the same
   zero-duration row, from a field nobody mistyped.
3. A rejected edit restores the field and says why, in the same sentence for
   every surface.
4. **Defence in depth — and this codebase has already been here once.**
   `src/db/timetrackRepo.ts:106-119` carries this comment, about a different
   row: *"the database rejects the row — which fails the whole batch, and a
   queue that drains all or nothing then never drains. Verified against the live
   database."* That was a bad `workspace_id`, and it was fixed by rewriting the
   pointer server-side — the instance, not the class. The reversed interval
   walks into the same trap by a different door, and so will the next constraint
   anybody adds.

   The mechanics, read rather than assumed: `pushTimetrackRows` upserts each
   table as one array (`:141`) and throws on the first error, so a single
   invalid entry blocks **every row in that batch** — up to 400 — and every
   table ordered after `timetrack_entries` is never written at all.

   So: a POST that fails 4xx (not 401) is not a "try again later" failure and
   the queue must stop treating it as one. Quarantine that batch, keep sending
   the rest, stop the retry, and name the entry the server refused — which needs
   `pushTimetrackRows` to return the offending ids instead of a bare message
   (`src/db/timetrackRepo.ts:142`, `app/api/timetrack/sync/route.ts:29`).

**And the reason a rule in the service is not enough on its own.**

*How this was enumerated, because a list like this is only worth its method:*
every function in `timetrackService.ts` whose return type contains
`violations: SaveViolation[]` — `startTimer:368`, `continueEntry:428`,
`createManualEntry:444`, `updateEntry:479`, `applyDraftPatch:529` — then every
call site of those five anywhere in `src/`, which is 26, then each one read to
see whether the violations are looked at.

**Twelve of the twenty-six take `.state` and throw the message away:**

| where | what the user did |
|---|---|
| `CalendarView.tsx:177` | dragged a block to a new time |
| `CalendarView.tsx:188` | dragged its edge to resize it |
| `EntryList.tsx:597` | made a project from the inline row |
| `EntryList.tsx:613` | set tags on the inline row |
| `EntryList.tsx:979` | set the project in the detail sheet |
| `EntryList.tsx:985` | set tags in the detail sheet |
| `EntryList.tsx:989` | flipped billable in the detail sheet |
| `EntryList.tsx:1007` | ticked "duration only" |
| `EntryList.tsx:1025` | shared the entry with a member |
| `useTimetrack.ts:428` | let Pomodoro auto-continue the entry after a break |
| `useTimetrack.ts:365, 367` | answered the idle prompt |

Drag-to-*create* shows the message (`CalendarView.tsx:170`); drag-to-move and
drag-to-resize do not. **Checked at the service, without a browser:** in a
workspace with "project required" turned on, `updateEntry` refuses a move with
`"Project is required in this workspace"` and returns the state untouched — so
today that block slides under the cursor, snaps back, and the app says nothing.
The same is true for `lockEntriesBefore`, which returns
`"Time entries on or before <date> are locked"`. Both are settings a user can
turn on in Settings › Workspace.

The `C` shortcut and the row's Continue button are **not** among them — they
check violations and toast the message (`useTimetrack.ts:567`,
`EntryList.tsx:436`). So the same action is handled correctly by hand and
incorrectly when a timer does it for you.

**The worst of the twelve is the idle prompt.** `useTimetrack.ts:365` trims the
idle tail with `.state`, then `:367` restarts the timer on that state, and then
`:381` toasts `"Dropped 25m and stopped the timer"` — a confirmation written
before anyone checked whether the trim happened. If the trim is refused, the
message is simply untrue. Pomodoro's break-end does the same thing one line
later: it continues the entry with `.state` and then notifies "Continued your
last time entry" whether or not it did.

So the rule and the plumbing land together, and the plumbing is a type, not a
convention: the six service functions that today return
`{ state, violations }` (`timetrackService.ts:372, 432, 448, 484, 534`) return a
discriminated union instead — `{ ok: true, state, … } | { ok: false, violations }`
— so `.state` does not exist on the failure branch and the compiler, not a
reviewer, finds every caller that assumed success. That is a day's work across
~44 call sites, most of them one line. The cheap version (patch the eight, add a
source-level lint) is available and is not what I am recommending: the standing
answer here is the durable road, and this is the difference between a rule that
holds and a rule that holds until the next caller.

**The tests that fail first:**
- `updateEntry` with `stop` one second before `start` returns a violation and
  leaves the state untouched — fails today (it returns a 0-duration entry);
- the same values through `commitTime` in the inline row leave the entry alone
  and raise a message — fails today;
- a unit test that asserts the client's rule and the string in the migration
  agree, naming `timetrack_entries_stop_after_start`, so the next person to
  change one is told about the other;
- a sync test where one row is rejected by the server with a 400: the other rows
  still arrive, the retry stops, and the status names the entry — fails today in
  three different ways.

**Cost:** ~3 hours for the rule, the messages and the queue quarantine, plus
a day for the union across the callers. **Risk:** medium — 1 to 3
are small and covered by existing tests; 4 touches the upload path and must be
done with item 2, not separately.

---

### 1. The calendar's day totals are inflated

**Seen:** Today's column header read **12:02** while the entry list, the Reports
summary and the CSV export all said **6:41**. Week view: Thu 24 Sep **11:38**
against Reports' **7:19**.

**Cause (read, then confirmed by reimplementation):**
`entryInterval` ends with `endMin: Math.max(startMin + 1, endMin)`
(`src/timetrack/calendarService.ts:533`) — a one-minute floor so a short block is
still drawable. `dayColumnSeconds` (`:559`) then sums *those drawing rectangles*
as duration. Every entry under a minute is counted as sixty seconds. Running
that formula over the account's own rows in the page produced the string
"12:02" — character for character what was on screen.

**"But that account has hundreds of junk rows."** It does, and the effect does
not depend on them. Run against the real function with three ordinary entries —
an hour of work and two short ones of 45s and 30s — the calendar reports
**3,720 seconds where the truth is 3,675**: forty-five seconds invented from two
entries. Two ten-second entries alone report **120 seconds instead of 20**. The
junk rows only made it large enough to notice.

**Fix:** the total sums real seconds, clamped to the day; the floor stays where
it belongs, in layout.

```ts
/** Real tracked seconds of `entry` that fall inside `day`. */
export function entryDaySeconds(entry: TimeEntry, day: IsoDate, nowSec: number): number {
  const from = Math.max(epochSeconds(startOfDayIso(day)), epochSeconds(entry.start))
  const to = Math.min(
    epochSeconds(startOfDayIso(addDays(day, 1))),   // the next local midnight, not 23:59:59.999
    entry.stop ? epochSeconds(entry.stop) : nowSec,
  )
  // a running entry may not be counted past what it has actually run:
  // `isRunning` is `duration < 0 || stop === null`, so a row with no stop but a
  // non-negative duration would otherwise be counted from start to now.
  const visible = Math.max(0, to - from)
  return isRunning(entry) ? Math.min(visible, entrySeconds(entry, nowSec)) : visible
}

export function dayColumnSeconds(entries: TimeEntry[], day: IsoDate, nowSec: number): number {
  return entriesForDay(entries, day, nowSec).reduce((sum, e) => sum + entryDaySeconds(e, day, nowSec), 0)
}
```

`entryInterval` keeps its floor and gains a docstring saying it is geometry, not
arithmetic, and that nothing may total from it.

**Two details that decide whether this is right or merely closer.** The upper
bound is the *next day's local midnight*, not `endOfDayIso` — that returns
23:59:59.999, and with `epochSeconds` flooring, an entry running to midnight
would come up a second short and look exactly like the bug being fixed. And
both bounds come from `dateKeyToDate`, which builds local midnight, so the 23-
and 25-hour days at a clock change total correctly; anything built on
`start + 86400` would not.

**The test that fails first.** `tests/unit/timetrack/calendarService.test.ts:334`
passes today because every fixture in it is half an hour long — it cannot see
this bug. Add:
- two ten-second entries on one day total twenty seconds, not two minutes;
- an entry from 23:50 to 00:20: **the two days sum to exactly its duration.**
  (Asserting "600 and 1200" would pass today — `entryInterval` already clips at
  0 and 1440 — and would *fail* against a bound of `endOfDayIso`, which is a
  second short. The sum is the assertion that means something.)
- a running entry counts to `nowSec` and no further;
- **the mechanical one, and it ties the screens together:** the entry list and
  Reports both total with `entrySeconds` (`timetrackService.ts:89`,
  `reportsService.ts:323`) — the calendar is the only screen in the slice that
  invented its own arithmetic. So the test is not "the new sum looks right", it
  is: for fifty randomly generated entries that start and end inside one day,
  `dayColumnSeconds` **equals the sum of `entrySeconds`**, the same function the
  other two screens use. That fails today, and it fails again for the next
  person who reaches for `entryInterval` to add something up.

**How far the class reaches: one place.** Grepping the slice for minute-based
arithmetic (`* 60` outside millisecond and settings maths) finds two uses of an
interval — `calendarService.ts:562`, the total this fixes, and
`CalendarView.tsx:444`, the label under the cursor while you drag, which is
geometry describing geometry and is correct. So this is a one-instance class,
and the docstring plus the test is what keeps it one.

**Two callers where this floor is not displayed but *written*, found in the
critic's pass and folded in here because they are the same arithmetic:**
dragging a block to move it takes its duration from `block.heightMinutes` —
`Math.max(1, …)` again — and writes `stop = start + that`
(`CalendarView.tsx:335, :180`), so a drag rounds every entry to whole minutes and
promotes a short one to a full minute *in the data*. And because both `start`
and `stop` are written with the dragged fragment's own day, dragging the
second-day half of an overnight entry rewrites the whole entry onto day two and
destroys the first half. Read in the source, not yet reproduced: one drag in a
browser settles it, and that goes first.

**Known residue, stated not hidden:** the entry list files an overnight entry
wholly under its start day while the calendar splits it at midnight. After this
fix the two screens will still differ for entries crossing midnight — correctly,
because they are answering different questions. Not changing that here; if the
owner wants them identical, that is a separate decision about which day owns a
night shift.

**Cost:** ~1 hour with the tests. **Risk:** low, one function, no callers outside
`CalendarView`.

---

### 2. The sync retries about once a second, for as long as it cannot reach the server

**Measured twice, two ways.** Offline with a change queued: **25 POSTs in 20.0s**,
gaps 850–865ms, flat, no growth (Playwright route interception, POSTs only).
With the server answering 401: **23 POSTs in 20s**. Idle and online: **0 requests
in 15s**, so nothing polls needlessly — it is specifically the failure path.

**Cause:** the change-watcher effect (`useTimetrackSync.ts:392`) ends with
`setTimeout(() => void flush(), 800)` and depends on `[state, status, savePending, flush]`.
Every flush sets `status` to "saving" and then to "offline"/"error"/"signed-out",
so the effect tears down and re-arms its 800ms timer on every attempt. The
exponential backoff at `:205` (2s doubling to 60s) is therefore never the thing
that schedules the next try, and the explicit "retrying is pointless, stop"
for a 401 at `:189` is defeated the same way. The status badge visibly flickers
"Saving 1…" / "Offline · 1 waiting" as it goes round, which is the same loop
seen from the front.

**Two more consequences of the same root, found while reading it:**
- The pull effect (`:447`) also depends on raw `status`, so its 60-second
  interval is cleared and recreated on every status flip. **Measured, after this
  plan was first written:** 75 seconds untouched produced **1 pull**; 80 seconds
  with one real persisted change every 5 seconds produced **0 pulls**. So while
  you are working — the only time it matters — this device stops asking what the
  others did. A change every five seconds is ordinary use, not a stress test.
- The signed-out recheck effect (`:427`) adds `visibilitychange` with one inline
  arrow and removes a *different* inline arrow in its cleanup, so the listener
  is never removed and a new one accumulates on every re-run. Its `recheck()`
  also `fetch`es with no catch, so every 15s offline produces an unhandled
  rejection.

**Fix — one root, one shape.** No effect that *sets* `status` may *depend* on
`status`. Derive the coarse signals and depend on those:

```ts
const syncActive = status !== "local-only" && status !== "starting" && status !== "signed-out"
const signedOut = status === "signed-out"
```

- change-watcher: deps `[state, syncActive, savePending, flush]`; read
  `statusRef.current` for the `local-only` early return.
- pull effect: deps `[syncActive, pull, flush]`.
- recheck effect: deps `[signedOut, flush]`, with a named handler for both
  `addEventListener` and `removeEventListener`, and a `try/catch` inside
  `recheck`.
- change-watcher additionally **queues and returns without re-arming** whenever
  sending is pointless: a retry already armed, or the session signed out.
  Typing offline then queues silently instead of firing a request per word, and
  the 401 loop — which the `syncActive` change alone does **not** stop, because
  `syncActive` flips on the very `saving ↔ signed-out` edge — stops here.

  **This is only safe once `retryAt.current` is nulled.** Today it never is:
  `:192` and `:208` clear the timeout but leave the handle, `:209` overwrites
  it, and success never touches it — so after one failed send it is truthy for
  the life of the page, and a guard that reads it would mute the flush forever.
  `retryAt.current = null` goes at both clears and at the top of the success
  path, and the test is "fail once, succeed, then a **new** edit still arrives".
- recovery paths stay as they are and are the reason this is safe: the `online`
  event and `visibilitychange` both call `flush()` (`:455`), and both should
  clear `retryAt` and reset `retryDelay` first so a reconnect sends at once
  rather than waiting out a 60s backoff.

**A hole that is open today, found by predicting it in this plan and then
watching it happen.** I wrote here that removing the status dependency would
break the rescue of a change made *while a request is in flight*. Then I delayed
one POST by four seconds in the browser, made a second change during it, and
touched nothing: **the queue sat at 21 rows for sixteen seconds with no requests
at all**, badge reading "Saving 21…". A later, unrelated change drained
everything in one go. So the rescue is not reliable now — it is a coincidence
that usually holds.

The mechanism is readable, and it is one line. `flush` returns immediately when
another flush is running (`:161`), so a change made mid-request is queued and
unsent. When that request finishes, the last thing it does is
`setStatus(countRows(pending.current) > 0 ? "saving" : "synced")` (`:205`) —
**and if the status is already `"saving"`, setting it to `"saving"` changes
nothing, React does not re-render, the change-watcher does not re-run, and the
800ms timer that would have sent the rest is never armed.** The code computes
"there is more to send" on that very line and then does not act on it.

So the loop's accidental work has to become deliberate work:

- a `flushAgain` ref, set when `flush` is entered while one is already running;
- in `flush`'s `finally`, if `flushAgain` is set or `countRows(pending.current) > 0`,
  schedule one more flush directly rather than hoping a status change does it;
- **and a timeout on the request.** `fetch` at `:180` has no `AbortController`
  and no deadline, so a connection that accepts and never answers — a captive
  portal, a dead tunnel — holds `flushing.current` true for as long as the
  platform takes, and every later flush returns at the first line. Nothing in
  the file can recover from that; only a reload can. A 20-second abort turns it
  into an ordinary failure that the backoff already knows how to handle.

The test for this one is the important one, because it fails **today**: start a
request, change something while it is in the air, let the request succeed, then
touch nothing and assert the second change reaches the server.

**The tests that fail first.** The harness exists: `syncAdoption.test.tsx`
renders a component around the hook and stubs `fetch` with `vi.stubGlobal`.
A new `syncRetry.test.tsx` uses it with fake timers — and must advance with
`vi.advanceTimersByTimeAsync`, not `advanceTimersByTime`, or the stubbed fetch
promise never resolves, no retry is ever scheduled, and the test passes while
proving nothing. This project has shipped that kind of test before:
- a server that always rejects produces **at most 4 sends in 15 simulated
  seconds**, and the gaps double;
- a 401 produces **exactly one** send, and no more until a recheck succeeds;
- a state change while a retry is armed queues the row but sends nothing;
- the `online` event sends immediately and resets the delay;
- the pull interval survives ten status flips (it is not recreated).

**Cost:** ~2–3 hours, most of it tests. **Risk: this is the most dangerous file
in the slice** — its comments record two bugs that reached real data. Every
change here is dependency arrays and scheduling, not merge logic; the merge,
adoption and `safeToSend` paths must not be touched. Run the existing sync
suites plus `timetrack-sync` and `timetrack-sync-phone` **separately** (they
cannot share one local invocation, per `playwright.config.ts`).

---

### 3. A time edited in the entry sheet is lost if you leave with Escape

**Seen:** open the sheet on a phone, set End to a valid new time, press Escape.
The sheet closes, the entry keeps its old time, nothing is said. The
**description in the same sheet survives the same gesture**, because it commits
through `useDebouncedCommit`, which flushes on unmount. The times commit only in
`onBlur` (`EntryList.tsx:995,999`), and React does not fire blur on unmount.

Also seen, same place: when a value **is** refused — End before Start — the toast
says so, but the box keeps showing the refused value while the entry keeps the
old one, because the `stop <= start` branch returns without restoring the field
(`EntryList.tsx:951`), unlike the two branches above it. Close the sheet from
there and there is no second warning.

**Fix, and the class.** Six places in this slice stage an edit in component state
and commit it only on blur — **two of them verified lossy, four reachable only
by crossing the 640px breakpoint mid-edit** (`EntryList.tsx:676` mounts
`isMobile ? phoneRow : pointerRow`, one or the other, never both), which a
tablet rotation does: `EntryList.tsx:573` (inline description), `:628`,
`:640` (inline start/end), `:655` (inline duration), `:995`, `:999` (sheet
times), and `TimerBar.tsx:260` (the running duration box). One of them is
verified lossy; the others share the shape and differ only in whether an unmount
without blur is reachable. Rather than patch the one:

- add `useStagedEdit` beside `useDebouncedCommit`: blur and unmount, **and no
  timer**. A debounce must not be used for the time fields — a `datetime-local`
  reads `""` while a segment is half-typed, an empty stop means "running"
  downstream, and a 400ms timer would fire exactly there and convert the entry
  into a running timer mid-edit (which is F1 in the critic's pass, reached by
  another door);
- route all six through it;
- every rejection path restores the field from the stored value, so the screen
  and the data never disagree.

**The test that fails first:** a jsdom test that mounts the sheet, types a new
End, unmounts without blurring, and asserts the entry moved — it fails today.
Plus one per remaining site, and a source-level check in
`tests/unit/architecture/` that `onBlur={` in `src/timetrack/**` only ever
references a `flush` from that hook. (The slice already reads its own source in
`touchTargetsAtSource.test.ts`, so this is a pattern that exists here, not a new
idea.)

**Cost:** ~2 hours. **Risk:** medium-low — six call sites, all covered by the
existing entry-editing tests.

---

### 4. The app's "Time" tab opens on Settings

**Seen twice**, including the first load of the session: tapping **Time** in the
product's bottom bar landed on Settings › Profile, because
`rememberedScreen()` (`TogglLab.tsx:97`) restores the last screen forever,
Settings and Manage included.

**Fix:** remember only the four screens where work happens — timer, calendar,
reports, projects — and never the configuration ones. A settings screen is
somewhere you go on purpose; it is not where a tracker should open.

**Test:** unit test of `rememberedScreen` for each stored value, including the
two that must be ignored.

**Cost:** 15 minutes. **Risk:** none. **Decision for the owner:** the alternative
is "always open on Timer". I recommend the narrower rule, because returning to
Reports where you left it is genuinely useful.

---

### 5. An orphan period arrow in the phone Filters sheet

**Seen:** the sheet shows a lone ">" under the date field. `Previous period` is
`hidden sm:inline-flex` (`ReportsView.tsx:300`); `Next period` (`:346`) carries
no such guard, so the shared desktop controls leak one arrow into the phone
sheet — which already has both arrows in the row above it.

**Fix:** guard the pair the same way. **Test:** an assertion in the phone browser
suite that opening Filters shows no period arrows inside the sheet — a class
name cannot be trusted here, which is how the first one was missed.

**Cost:** 15 minutes.

---

### 6. Four places ignore the user's own date and time format

Profile offers Date format and Time format; the entry sheet prints "last updated
9/26/2026, 9:39:19 PM" from a raw `toLocaleString()` (`EntryList.tsx:1050`), and
`SettingsView.tsx:574,763,994` do the same. The slice has `formatDate` and
`formatTimeOfDay` that take those settings.

**Fix:** use them. **Test:** an architecture test banning `toLocale*` in
`src/timetrack/**` outside `timetrackFormatService.ts`. Scoped to this slice
deliberately — there are 131 such calls across the repo and the rest have no
user-facing format setting to contradict.

**Not fixable here, worth knowing:** the `datetime-local` inputs themselves
render in the browser's locale whatever the app says. Replacing them with custom
pickers is not worth it now; the label beside them will at least agree.

**Cost:** 45 minutes.

---

### 7. "1 projects · 1 tags · 1 members"

`SettingsView.tsx:1127-1134`. Fix with one `plural(n, "project")` helper and use
it for all eight counts. **Cost:** 15 minutes.

---

### 8. The dev-tools bubble sits on the Timer tab at 390px

`elementFromPoint` on the tab's centre returns the Next.js overlay, not the
button. Production is unaffected — but the owner's product *is* localhost:3000,
so on their phone the primary tab is unclickable.

Every corner collides with something at 390px (top-left: "← Dashboard";
top-right: the bell and sync badge; bottom: the tab bar). So the honest options
are `devIndicators: false` in `next.config.mjs` — compile and runtime errors
still surface, only the route-type bubble goes — or leaving it and living with
it. **Recommendation: turn it off.** **Cost:** 5 minutes. **Owner's call.**

---

## The architecture: what this plan deliberately does not build

Measured, not guessed — but read the caveat under the table. Numbers are from
this machine, in Node, calling the real modules:

| entries | `stateToRows` + `diffRows` | payload |
|---|---|---|
| 700 (today) | 12ms | 0.31 MB |
| 3,650 (a year at 10/day) | 54ms | 1.62 MB |
| 10,000 | 145ms | 4.44 MB |

**The one thing here that is not measured** is the phone. These are Node numbers
on a desktop; the usual assumption is that a mid-range phone is three to five
times slower, which would put a year of data at 150–250ms of main-thread work
per sync cycle. That multiplier is an assumption, not a measurement, and if it
ever matters it should be measured on the owner's actual phone rather than
argued about.

- The whole account lives in one localStorage key at **496 bytes per entry**, so
  **~10,500 entries fills the 5MB origin budget** — which this slice shares with
  the other slices' keys. At twenty entries a day that is under eighteen months.
  The failure is handled honestly (a toast telling you to export a backup), but
  "handled" means local persistence stops.
- Every change re-derives and re-diffs the entire account on the main thread,
  behind an 800ms debounce.
- Every cold open downloads every row. No paging, no windowing.

**Do none of it now.** There is one user, 700 entries and 12ms. Rebuilding the
sync model before anyone pays is the expensive mistake this codebase's fourth
rule exists to prevent.

**Instead, one tripwire, ten minutes:** on adoption, when `state.entries.length`
crosses **4,000**, report it once through the existing error-reporting channel
(not a toast — it is not the user's problem yet). That number is a third of the
way to the storage wall and the point where the diff passes ~50ms on a phone.
When it fires, the redesign is worth its day: entries paged by month, the diff
moved off the main thread, and the cold open fetching a window rather than a
history. Writing that down now is what makes it a decision later instead of an
emergency.

**The bigger question, once, then dropped:** this slice is 15,660 lines — the
largest in the app — cloning a product that is free for one person, in an app
whose subject is coaching. It is the best-built thing here and the furthest from
anything anyone would pay for. That is the owner's call, not a defect, and this
plan assumes the answer is "keep it".

---

## Order, and what "done" means

0. The reversed-time chain (it loses tracked time **and** silently stops the
   account saving; everything else is cosmetic beside it).
1. Calendar totals (a wrong number is the next worst thing a tracker can show).
2. The retry loop, with the two effects that share its root — do item 0's
   quarantine in the same sitting, they touch the same path.
3. The staged-edit class, sheet times first.
4. Then 4–8, which are an afternoon together.

**Before saying done:** `npm test`; the phone browser projects
(`toggl-iphone-safari`, `toggl-android`); `timetrack-sync` and
`timetrack-sync-phone` in **separate** invocations; and a by-hand walk of the
same route this plan came from — open Time from the product's tab bar, run and
stop a timer, edit it in the sheet, compare the day total on three screens, pull
the network out and put it back.

**Test data left behind by the walkthrough** (test account, to be removed once
the owner says so): ten entries named `CHECK-*`, `INFLIGHT-*` or `WEDGE-PROBE-*`,
two blank entries, project "Writing", tag "deep", one favourite, one AutoTracker
rule "podcast". The account is otherwise left healthy — badge "Saved", queue
empty, no reversed rows, and local and server both hold 710 entries. Two rows
*were* damaged during the walkthrough (the reversed-time finding) and both were
repaired through the UI; the repair is what proved the recovery path works.

---

# The critic's pass, 2026-09-26

A second agent was asked to attack this plan and to verify every claim in it
against the source rather than trust the prose. Its report is not reproduced
here; what follows is what survived checking. **Nothing below was accepted
because it was asserted confidently** — each line says how it was settled, and
three of its findings were checked in the browser or with a script before being
written in.

## What it got right, and what that changes

**1. My `if (retryAt.current) return` guard was a landmine. Accepted, and it is
the most important catch in the pass.** `retryAt.current` is **never set to
`null`** — `useTimetrackSync.ts:192` and `:208` only `clearTimeout` it, `:209`
overwrites it, and the success path never touches it. So after the first failed
send of a page's life the handle stays truthy forever, and the guard I proposed
would have permanently disabled the 800ms flush — every later edit queued and
never sent until a tab switch. That is a new data-delivery bug of exactly the
kind this file's comments already record, introduced by the fix for another one.
**Amendment:** `retryAt.current = null` at every clear and at the top of the
success path, and the test is *"fail once, succeed, then a NEW edit still
arrives"* — not just "a retry stops".

**2. `syncActive` does not close the 401 loop I measured. Accepted.**
`syncActive` excludes `signed-out`, so it flips on the `saving ↔ signed-out`
edge — which *is* the 401 cycle. Half my evidence (the offline case) is
addressed by the dependency change; the other half (23 POSTs in 20s against a
401) survives it. **Amendment:** the change-watcher must **queue and return,
never re-arm**, whenever sending is pointless — signed out, or a retry already
armed — and that is what the 401 test pins.

**3. My named cause for the starved pull was only half of it. Accepted.**
`pull`'s deps are `[replaceState]`, and `replaceState` comes from a `useMemo`
whose deps include **`state`** (`useTimetrack.ts:583`), so `pull`'s identity
changes on every committed change and the 60-second interval is torn down
whatever the status does. My measurement (1 pull in 75s idle, 0 in 80s of
changes) stands; my explanation was one of two causes and the smaller one.
**Amendment:** a `pullRef`, the pattern this file already uses for `flushRef`,
and the test asserts the interval survives ten **state changes**, not ten status
flips.

**4. My replacement for `dayColumnSeconds` dropped a guard. Accepted.**
`isRunning` is `duration < 0 || stop === null` (`timetrackService.ts:84`), and
today's line clamps a running entry with `Math.min(clamped, entrySeconds(...))`.
My `entry.stop ? … : nowSec` would count start→now for a row that has no stop
but a non-negative duration. Keep the `Math.min`.

**5. Two of my proposed tests could not fail. Accepted.** The overnight
600s/1200s test passes today (`entryInterval` already clips at 0 and 1440), and
the running-entry test passes today (the clamp above). Rewrite the first as
"the two days sum to exactly the entry's duration" and keep the second only as a
labelled regression guard. This matters more than it sounds: a plan that ships
two tests which pass either way is the failure this repo has already recorded.

**6. The `onBlur` source scan is a spelling test. Accepted, dropped.** It can
only check that the attribute text ends in `.flush`; renaming a function defeats
it. Replaced with one jsdom test per lossy site — mount, type, unmount without
blur, assert the store moved.

**7. "Six lossy call sites" was over-counted. Partly accepted.** Four of the six
are in `pointerRow`, and `EntryList.tsx:676` renders `isMobile ? phoneRow :
pointerRow`, so only one row is mounted at a time and those four already reset
their drafts on rejection. They are still reachable — crossing 640px mid-edit,
which a tablet rotation does — but they are not verified-lossy the way the
sheet's times are. **Two verified, four theoretical.** The hook still covers all
of them; the claim in the plan was wrong and is corrected.

**8. A debounced commit on a `datetime-local` would be a new bug. Accepted, and
it led to the worst finding of the pass — see below.** A `datetime-local`
reports `""` mid-typing, and an empty stop means "running" downstream. So the
times get a **no-timer** staged edit — blur and unmount only, never a timer.

**9. Smaller ones, all checked and accepted:** item 4 must filter on the
**write** (`TogglLab.tsx:184`) as well as the read, or visiting Settings
overwrites the remembered screen anyway; `formatDate` takes an `IsoDate`, so
`EntryList.tsx:1050` needs `dateKey(entry.at)`; item 7's counts are a `<ul>`,
not a "·"-joined line; the toast stack has no cap or dedupe
(`TogglLab.tsx:718`), so any repeated failure paints the phone red — three lines
to cap it, and worth doing with item 2; a calendar drag shorter than five
minutes creates nothing and says nothing (`CalendarView.tsx:159`), which is a
silent no-op this project's own rules forbid.

## What it got wrong, with the numbers

**Its headline amendment was "measure item 1 before fixing it, because the
stated cause cannot produce 5h21m — that would need 321 sub-minute entries."**
Fair challenge, wrong conclusion: I ran its own three measurements against the
live account.

| what it asked for | what the account says |
|---|---|
| sub-minute entries on that day | **354** (it calculated ≥321 were needed) |
| entries started earlier that bleed into the column | **0** |
| rows where stored `duration` disagrees with `stop − start` | **0** |
| stopped rows with a NULL `duration_seconds` on the server | **0** |

So the floor accounts for the whole gap, the overnight-attribution difference it
called "the dominant term" contributes nothing here, and its suspicion that
`entry.duration` might be the corrupt oracle is not supported: computing the
day's total the two ways independently — from stored durations and from
`stop − start` — gives **the same number**. Its point that the list, Reports and
the CSV share one oracle is a good one in principle and worth keeping in mind;
it is simply not what is happening.

**It also flagged an off-by-one in my `entryDaySeconds` (599s instead of 600s at
a midnight boundary).** Correct about the original draft; it had already been
fixed to clamp against the next local midnight before the pass arrived.

## What it found that I had missed entirely

**F1 — clearing the End field turns a finished entry into a running timer, and
locks the door behind it. Reproduced in the browser, twice.** Open the detail
sheet on a finished 24-minute entry, clear End, blur: `stop` becomes `null`,
`duration` becomes the negative-epoch "running" encoding, and the app starts
counting — the page title read `1:06:59 · CHECK-A…` a minute later. Stopping it
then records **68 minutes** where 24 were tracked.

And the way back is shut: the End field is `disabled={isRunning(entry)}`
(`EntryList.tsx:999`), so the field that broke it cannot mend it, and the inline
row's is disabled too. Recovery is stop-the-timer-then-edit, which no user would
guess. **This is the same root as item 0** — nothing anywhere refuses an entry
whose `stop` is missing or reversed — so it joins item 0's fix: an empty End
must mean "refuse and say so", never "this is running again".

**F3 — dragging a block in the calendar rewrites its duration from the layout.**
`CalendarView.tsx:335` passes `durationMinutes: block.heightMinutes`, which is
`Math.max(1, endMin - startMin)` from `layoutBlocks` (`calendarService.ts:510`),
and `:180` writes `stop = start + that`. So the one-minute floor does not only
misreport a short entry — **drag it and the floor is written into the data**, and
every entry's seconds are zeroed on any move. This is a better instance of item
1's class than the docstring I proposed, and it is the reason the class is worth
stating at all.

**F4 — dragging the second-day half of an overnight entry destroys the first
half.** `CalendarView.tsx:172-183` writes *both* `start` and `stop` with
`isoAtMinutes(day, …)` where `day` is the column the fragment is in. Drag the
00:00–01:00 piece of a 23:00→01:00 entry and it becomes a one-hour entry on day
two: the 23:00–00:00 hour is gone. `resize` (`:185`) has the same shape. Read,
not yet reproduced — the browser check is one drag and should be done before the
fix, so the fix is written against the real behaviour.

**F2 — the inline End field parses against the entry's START day**
(`EntryList.tsx:413`), so on an overnight entry a perfectly sensible End produces
`stop < start` and a zero duration. Same fix as item 0, one more caller.

## What this does to the order and the cost

- **Item 2 moves ahead of item 1**, as the critic argued: a wrong number needs
  you to go and look, while the loop misbehaves with no user action at all, and
  with a 500 rather than an offline error it also paints an uncapped toast stack
  over the phone. Item 0 stays first.
- **Item 0 grows** by F1, F2 and the empty-End rule; still one rule in
  `validateEntry` plus its plumbing.
- **Item 1 grows** by F3 and F4, which are data-writing, not display. Its
  estimate moves from "~1 hour" to half a day.
- **Item 2 moves from 2–3 hours to 4–5**: it is three fixes (`retryAt` nulling,
  the queue-and-return guard, `pullRef`), not one, plus the in-flight remainder
  and the request timeout.
- **Item 3 shrinks**: two verified sites, a no-timer staged edit, and the
  `onBlur` source scan dropped.

**The one thing the pass did not change:** every defect in this plan was
reproduced before it was written down, and the two the critic disputed were
re-measured rather than defended. That is the only reason its good catches could
be told apart from its confident ones.

---

## One more, from a peer session, checked before it was written down

A session working on the platform move pointed out that this slice's backup and
restore scripts reach the database directly and will stop working when Postgres
moves behind a private network. Checked rather than taken on trust, and it is
worse than the sentence suggests:

- `scripts/backup-timetrack.ts` → `exportTimetrack` → **`createAdminSupabaseClient()`**
  (`src/db/timetrackBackupRepo.ts:15,44`) — the **service-role key**, which
  bypasses row-level security entirely, read from `.env.local` on whatever
  machine runs it.
- **Nothing schedules it.** `grep -rl backup-timetrack .github/ scripts/ package.json`
  finds the script itself and one plan document. No npm script, no workflow, no
  cron. The repo's only scheduled job is the nightly e2e run
  (`.github/workflows/e2e.yml:36`).

So the disaster recovery for nineteen tables of somebody's tracked time is *a
human remembering to run a script*, and the credential it needs is the one that
can read and overwrite every user's rows. That is fine for a product with one
user and no payments — it is not fine the moment there is a second person's time
in there, and the platform move is when it breaks anyway.

**Not in scope for these fixes, and deliberately not renamed as a milestone
here.** It belongs to whoever owns the move. Recorded because this plan is the
timetrack slice's, and "the backup works" is a claim this slice cannot currently
make: it has never been run on a schedule, and no test asserts that a restore
reproduces what was exported.
