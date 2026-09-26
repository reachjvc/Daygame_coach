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
3. A rejected edit restores the field and says why, in the same sentence for
   every surface.
4. **Defence in depth, because rule 1 only covers the rows we can foresee:** a
   POST that fails with a 4xx that is not 401 is not a "try again later"
   failure. The queue must stop treating it as one — quarantine that batch,
   keep sending the rest, and tell the user *which entry* the server refused.
   That needs `pushTimetrackRows` to return the offending row ids rather than a
   bare message (`app/api/timetrack/sync/route.ts`,
   `src/db/timetrackRepo.ts`).

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
| `useTimetrack.ts:428` | pressed `C` to continue the last entry |
| `useTimetrack.ts:365, 367` | answered the idle prompt |

Drag-to-*create* shows the message (`CalendarView.tsx:170`); drag-to-move and
drag-to-resize do not. **Checked at the service, without a browser:** in a
workspace with "project required" turned on, `updateEntry` refuses a move with
`"Project is required in this workspace"` and returns the state untouched — so
today that block slides under the cursor, snaps back, and the app says nothing.
The same is true for `lockEntriesBefore`, which returns
`"Time entries on or before <date> are locked"`. Both are settings a user can
turn on in Settings › Workspace.

**The worst of the twelve is the idle prompt.** `useTimetrack.ts:365` trims the
idle tail with `.state`, then `:367` restarts the timer on that state, and then
`:381` toasts `"Dropped 25m and stopped the timer"` — a confirmation written
before anyone checked whether the trim happened. If the trim is refused, the
message is simply untrue.

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
  return Math.max(0, to - from)
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
- an entry from 23:50 to 00:20 gives 600s to the first day and 1200s to the
  second;
- a running entry counts to `nowSec` and no further;
- **the mechanical one:** for fifty randomly generated same-day entries,
  `dayColumnSeconds` equals the plain sum of `stop - start`. That is the check
  that fails for the next person who reaches for `entryInterval` to add
  something up.

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
- change-watcher additionally does **not** schedule its 800ms flush while a
  retry is already armed (`if (retryAt.current) return` after queueing) — the
  backoff owns sending until it succeeds. Typing offline then queues silently
  instead of firing a request per word.
- recovery paths stay as they are and are the reason this is safe: the `online`
  event and `visibilitychange` both call `flush()` (`:455`), and both should
  clear `retryAt` and reset `retryDelay` first so a reconnect sends at once
  rather than waiting out a 60s backoff.

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
and commit it only on blur: `EntryList.tsx:573` (inline description), `:628`,
`:640` (inline start/end), `:655` (inline duration), `:995`, `:999` (sheet
times), and `TimerBar.tsx:260` (the running duration box). One of them is
verified lossy; the others share the shape and differ only in whether an unmount
without blur is reachable. Rather than patch the one:

- extend `useDebouncedCommit` (or add `useStagedEdit` beside it) so a staged
  value has one way to be committed: on blur, and on unmount;
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

Measured, not guessed. Numbers are from this machine (a phone is several times
slower) using the real modules:

| entries | `stateToRows` + `diffRows` | payload |
|---|---|---|
| 700 (today) | 12ms | 0.31 MB |
| 3,650 (a year at 10/day) | 54ms | 1.62 MB |
| 10,000 | 145ms | 4.44 MB |

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
the owner says so): seven `CHECK-*` entries, two blank entries, project
"Writing", tag "deep", one favourite, one AutoTracker rule "podcast".
