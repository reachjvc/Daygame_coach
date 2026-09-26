# The time tracker on a phone

Written 2026-09-25, after reproducing the owner's three complaints at 390×844
against `localhost:3000`. Everything in "What is actually wrong" was run, not
inferred, except the two items marked **suspect**.

---

## BUILT, 2026-09-25

All five milestones. The owner approved the five rules and answered the four
open questions "all yes"; what that decided is recorded under each question
below. Commits `115f34e0` (M1), `dba3ffc5` (M2), `bffa2f5a` (M3+M5), `2e25e8ba`
(M4).

**Verification.** Unit: 6042 passing, three consecutive clean runs. Browser: the
16-test iPhone 14 / WebKit phone suite, the Pixel 7 suite and the desktop Safari
suite, 48 tests, all green. Every claim in "What is actually wrong" below was
reproduced in a browser before the fix and re-checked after it.

**Three things found while building that this plan did not predict:**

1. **A third copy of the dead-link bug.** Reports' "Share link" had the same
   hard-coded `/test/toggl` path as "Copy start link". Grepping the class found
   it; the plan had named only one.
2. **The More sheet was drawn underneath the tracker's own bottom bar.** I
   introduced it. `BottomSheet` is `z-50`, which clears the app's tab bar at
   `z-40` and nothing else, while the tracker draws its navigation at
   `z-[9500]`. `elementFromPoint` over the bottom row returned the nav: on
   screen, looked right, could not be tapped — the same failure the tracker's
   own panels already carry a comment about. Fixed in the shared component, so
   the next caller with high-z chrome is covered.
3. **A refused edit could delete a project you had just made.** Found by reading
   the fix back, not by running it: the create-then-select path hands `edit` a
   state that already holds the new project, and the early return on violation
   dropped it. Reachable with a workspace that requires a task.

**And one test that passed by doing nothing.** The first version of the test for
(3) started its timer with no task in a workspace that required one, so
`startTimer` refused, no timer ran, and the test passed identically with and
without the fix. Caught by checking that it failed against the old code — which
is the only reason it is now a test rather than a decoration.

**Left undone, deliberately:** the horizontal axis of panel placement still
measures the layout viewport. Only a pinch-zoom moves it, and that could not be
tested here.

## THE SWEEP, 2026-09-26 — commit `b8efb024`

The plan fixed the phone bugs it named. This went after the class behind them:
every control that exists at desktop width and not on a phone, checked one at a
time in a browser rather than inferred from a class name.

**One real dead end.** A favourite could not be removed on a phone — its `×` was
`hidden … sm:flex`, and the only other route is the timer bar's star, which acts
on the draft and so works only while the draft still matches that favourite
exactly. It was a permanent tile whose only behaviour is starting a timer.
Removal is now reachable, 44px, and undoable.

**Everything else in that grep had a phone counterpart** and was left alone: the
Reports filter wall has its sheet, Manage's member table a card list, Projects a
card list, the period arrows are re-rendered in the phone controls, and the
shortcut overlay is keyboard-only by nature.

One more was examined and deliberately left: the **calendar's zoom control**
(`CalendarView`) is hidden below 640px and has no phone equivalent. It is not a
dead end, because the phone does not get the desktop default and then lose the
means to change it — `useIsMobile` forces the tallest step, with the reason in
the code ("at 56px/hour a 20-minute block is 19px"). The control is absent
because the choice is already made, which is the distinction between an absent
control and a dead one. Exposing it would only buy the ability to make blocks
*shorter*; if that is wanted it is a request, not a repair.

**Five controls under this slice's own 44px floor**, none of which looked wrong:
the favourite tile (40px), the sync badge (27px — the control that says "Tap to
try again"), the Reports metrics picker (36px), the day-header "Select" (43×36,
one pixel under on width), and every Settings toggle (44×24, because the button
*was* the track; it now draws the track inside a 44px target and still looks
like a switch).

**Two of those I found by hand; three the new guard found.** That is the point of
it. `no visible control on any screen is too small to tap` walks all six screens
with an entry row present, and caught the `Select` and the toggle that my manual
pass had missed — I had no rows on screen at the time and had not opened the
sheet.

Verified: 18 phone tests on iPhone 14/WebKit, 34 on Pixel 7 and desktop Safari,
6054 unit, ratchets unchanged.

## A SILENT LOSS, 2026-09-26 — commit `1253cbe9`

Found with a thumb rather than by reading, while testing something else. Aiming
at an entry row on a phone I hit **"Continue this entry"** — 8px from the row's
own tap area, 4px from the entry menu. Starting a timer stops the running one,
which is Toggl's rule and the right one, so that mis-tap **ended the thing I was
timing, in silence**. No toast, no undo, no confirmation. It surfaces days later
as a total that is wrong, which is the worst shape a loss can take in a time
tracker.

`startTimer` already knew: it called `stopTimer` and threw away the entry that
came back. That one place is where it is fixed. Every route that starts a timer
now says what it displaced, and the three that a thumb can trigger offer Undo.

**Five routes start a timer, and all five were checked** rather than the one I
tripped over — Start/favorite/shortcut/continue-last, the row's Continue, a
calendar event, a `?start=1` link, and the idle prompt's restart, which stays
silent because it displaces the entry it is trimming and has a toast already.

**A comment of mine was wrong and the grep caught it.** The first draft claimed
every route came through two actions in `useTimetrack`. Three do not. The comment
now names them, because a comment that lies about coverage is worse than none.

The undo is deliberately not a snapshot-and-restore of the workspace: a pull from
another device can land inside the seconds a toast is up, and this slice has
already had a bug where replacing state with an older copy sent deletions for
rows that were never gone.

## THE PRODUCT ROUTE, CHECKED AT LAST, 2026-09-26 — commit `42a55af9`

Blocker 2 above is closed, and not the way it was written. Every browser test in
this slice but one runs against `/test/toggl`; the same components, so everything
that *differs* between the lab and the product was unverified — which is exactly
where the "feels unfinished" complaints lived. I still cannot open
`/dashboard/time` myself, so the assertions went where the session already is:
the signed-in suite now checks, on the real route, that the tab says "Time", the
way out points at `/dashboard` and says "Dashboard", there is exactly **one**
bottom bar, and nothing visible admits to being a test page. Four inferences of
mine are now facts that run in CI.

**A hazard I caused and then diagnosed.** `timetrack-sync` and
`timetrack-sync-phone` cannot run in one invocation locally. CI pins
`workers: 1`; local runs do not, and together they fail two or three tests that
**move between runs** — session expiry, deletion merge — none of which has
anything to do with the race. That misdirection cost two rounds before I noticed
it was mine.

**Giving the phone project its own account did not fix it**, which is worth
recording because it looked like the obvious answer. The failures survived, so the
contention is the single `next dev` process both suites drive, not the rows they
write. The account stays shared; the hazard is documented in
`playwright.config.ts` where somebody is standing when they hit it, with the two
commands to run instead.

Two specs also needed updating for the five-tab bar: `"Not now" is not a one-way
door` reached Settings through the bar, and the cross-device test hard-coded
`user.json` instead of reading its own project's account.

## THE LAST TWO, 2026-09-26

The two things named as not-done at the end of the sweep are done.

**Opening no longer redraws the workspace when there is nothing new.** Adoption
replaced the whole state unconditionally, which is the common case handled the
expensive way — the usual outcome of opening the tracker is that this device is
already up to date. Every object in the state was swapped, so every screen
re-rendered and the entry list was rebuilt *after* first paint, which is the
settle you could see. It now compares with `diffRows` — this slice's own
definition of whether two workspaces differ, not a new one — and skips the
replacement when the answer is nothing. When there IS a difference the old path
runs untouched: the server wins, which is the rule the rest of that file is
built on.

**`useTimetrackSync` had no direct test**, which is worth stating plainly: it is
the most dangerous code in the slice, its comments record two bugs that reached
real data, and the sync tests next door only cover the pure rules in
`syncService`. It now has five, driving the hook with a stubbed server:
`replaceState` is not called when nothing differs, is called when something does,
nothing is queued for upload by a device already in step, and — the bug its own
comment records — a timer started while the response is still in the air survives
the answer.

That last test took two attempts, and the first one passed while proving nothing.
It created the timer in the same state the hook first saw, which makes it part of
what the browser held when the page *opened*, and for that the server's copy is
deliberately the winner. The real sequence needs the response held open while the
timer is started, which is what it does now.

**The group-expand chip was 28px** — the only control that reaches the other
entries in a group — and the sweep had missed it, because the chip exists only on
a grouped row and the sweep was tracking a single entry. The sweep now walks a
grouped row, an expanded one and selection mode, and fails on the 28px chip when
it is put back. The nested indent moved with it; they are the same column.

**A test of mine was racy and my own change exposed it.** The product-route test
measured the back control's box straight after the heading appeared.
`boundingBox()` does not auto-wait — it returns null the instant the node it
resolved is replaced — and the header re-renders when the sync status badge
appears. The page in the failure snapshot was perfectly correct. It waits for the
tracker to settle before measuring anything now, and the previously racy suite ran
green three times in a row.

**One Firefox run failed and I cannot say which test.** It aborted a serial
describe at 8 of 17; the passing re-run wiped the artifact before I read it. Four
consecutive clean Firefox runs since, 17 each. Recorded as unidentified rather
than dismissed.

Final state: 6070 unit, 19 on iPhone 14 and Pixel 7, 17 on desktop Safari and
Firefox, 12 on each signed-in project, ratchets unchanged.

## "I DOUBT YOURE ACTUALLY DONE", 2026-09-26 — commits `9f72c555`, `86b7ca2b`

The owner said that on intuition, with no evidence, after I had reported done
twice. An hour of looking found **twenty-nine controls** live on a phone, and the
reason is the thing worth writing down rather than the list.

**My guard was green and my guard was mine.** "No visible control on any screen is
too small to tap" queried `button` — so every `select`, `input`, `a` and
`[role=switch]` was invisible to it *by construction* — and visited each screen's
DEFAULT tab only, so Settings › Automation, Manage › Team and four Reports tabs
were never measured. A green guard is a claim about the guard's reach. I reported
it as a claim about the app.

**And I had already been burned by the second hole an hour earlier.** A 28px
group-expand chip escaped because the chip only exists on a grouped row. I widened
the sweep to grouped/expanded/selecting rows — *the instance* — wrote a commit
message about the blind spot, and never asked "what other states, what other kinds
of element". Rule 3 read backwards: fix the instance, report the class.

What was live the whole time: every `<select>` in the slice at 40px (one component
behind all of them); every text input at 32–36px across twenty call sites, each
overriding an `Input` that is already `h-11 sm:h-9`, including **the project
picker's own search box**, the field this work started from; the running-timer stop
at 36px on five of six screens; seven weekday toggles at 22px; four timesheet
actions at 28px; a 12px select-all; an add button with no accessible name at all;
and a header that overflowed 390px by 28px whenever a timer was running — which
the overflow test could never see, because it stops its timer before it navigates.

**The rule this bought, now in memory:** any claim of the form "every X is Y" must
carry **how X was enumerated**, written out. "Every control" beside
`querySelectorAll('button')` on default tabs makes the gap unmissable. And where
the enumeration is a selector or a route list, that list is the weakest link and
gets checked before the result is reported.

Verified after: 6090 unit; 20 on iPhone 14 and Pixel 7; 17 on desktop Safari and
Firefox; 12 on each signed-in project. An independent walk — separate from the
guard, selector stated — reports clean across 23 places with a timer running.

## "I DONT BELIEVE THIS WILL FIX IT" — commit `136348f4`

The owner said that about the remedy above, and was right again. The remedy was a
widened sweep plus a memory note, and widening the sweep had *already failed
twice*: green while twenty-nine controls were short, selector fixed, green again,
and a by-hand re-audit then found twenty more.

**A browser sweep cannot see its own reach.** It measures what it navigates to
and what its selector names, and both are lines its author writes.
`tests/unit/architecture/touchTargetsAtSource.test.ts` reads the source instead —
no navigation, no selector, so every call site is in scope whether or not a test
can reach it. It found ten more in seconds, three of which both the sweep and my
by-hand audit had missed, including **the toast Undo button I added this session**
at 28px and a client-name input inside a `cn()` call that no plain-string pass
could see.

Its own two bugs were found the same way and are now tested rather than described:
it attributed child classNames to the parent (the 24px count chip inside the 44px
expand button), so it reads backwards from each `className` to the nearest `<`;
and it judged checkboxes, whose real target is their label, so it defers those to
the browser sweep. Both limits are in its docstring under **WHAT IT DOES NOT
CATCH** — because the failure that started all this was a claim made without its
enumeration. Its allowlist is empty, and the docstring says why that is the point.

**The general finding, measured across the whole ruleset rather than argued.**
What is always loaded is about 1,850 words — CLAUDE.md 486, the memory index 417,
the end-of-turn checklist 948. That is not too much to act on. But two behaviour
notes are enormous and both are records of one rule failing over and over:

| note | words | re-violations recorded |
|---|---|---|
| `shared-working-tree-no-stash.md` | 2,792 | **8** "Proven" entries in ten days, three sessions — for a rule written in bold as its own rule 3 on 2026-09-17 |
| `stand-in-checking-failure.md` | 2,334 | **12** instances across four dates |

Every other behaviour note is 615 words or fewer and records no repeat. **Length
is the symptom; recurrence is the disease.** The number to watch for a rule is
not how long it is but how many times it has been re-violated — and at eight or
twelve, more prose has a demonstrated zero success rate. Those two need
mechanical enforcement; the rest are working.

---

# The human half

## The headline

**While a timer is running, the timer bar is a dead form.** What you type into
it is shown back to you and then thrown away.

Reproduced end to end. Start a timer, then type a description, pick a project,
add a tag, flip billable. The bar shows all four. The entry receives none of
them. Stop the timer and the row reads `(no description) · No project`.

```
started a timer, then:
  typed "morning pages, take two"  → entry.description stayed ""
  picked project "Writing"         → entry.projectId stayed null
  created + applied tag "deep"     → entry.tagIds stayed []
  toggled billable                 → entry.billable stayed false
saved entry: { description: "", project: null, tags: [], billable: false }
```

The duration box is the only control in the bar that reaches the entry.

This is the whole of the owner's "sometimes it doesn't accept my input". It is
not *sometimes* — it is **every time you fill anything in after pressing
Start**, and it works perfectly if you fill it in before. On a desktop it is
survivable, because the entry list has an inline-editable row where you can
repair the entry afterwards. That row is `hidden sm:grid`. **On a phone it does
not exist**, so there is no repair and no signal that anything was lost.

And the one place a phone *can* repair an entry loses edits too: in the entry
detail sheet, the project, tags and billable commit as you touch them, but the
description and the times are staged behind a button labelled **"Save times"**.
Edit the description, close the sheet, and the edit is gone with no warning.
Also reproduced.

So there are two ways to type a description on a phone and both discard it.

## The second complaint: "if I write 'wri' it should come up"

The project picker's own search is fine — typing `wri` does surface `Writing`.
Three things around it are not:

1. **In the "What are you working on?" box, plain text finds nothing.** You have
   to type `@wri`. Verified: `writing` offers no suggestions, `@wri` offers
   `Writing`.
2. **Nothing on a phone tells you `@` exists.** The convention is documented in
   the keyboard-shortcuts overlay, whose button is `hidden … sm:inline-flex` —
   it is not on the screen at phone width at all.
3. **`@` costs two extra taps on a phone keyboard** (switch to the symbol layer
   and back), for a feature whose whole point is speed.

Inside the picker, the list is ordered alphabetically by client, not by what you
actually use, and the search matches the project name only — not the task name,
not the client name.

## The third complaint: "something weird with how the app opens"

Seven separate things, all measured:

| What happens | Measured |
|---|---|
| The app's own five-tab bar **disappears** and is replaced by a six-item bar | `/dashboard/time` is in `HIDDEN_ROUTE_PREFIXES` |
| Six tabs at 390px, labels at **10px** | 65px each; the app's own bar sets 12px as its floor, on purpose |
| The only way out is a bare **"←" with no label** | 20×36px — the codebase's own touch-target rule is 44px |
| The page is titled **"My Workspace"** | nothing on the screen says "Time" |
| The browser tab says **"AI Daygame Coach — Practice Social Skills from Home"** | and the code's own fallback title is literally `"Time tracker · /test/toggl"` |
| It always opens on **Timer** | the section is `useState("timer")`, never remembered |
| A bare full-screen **"Loading your time tracker…"** with no header or bar | then, signed in, the whole workspace is swapped again when the server answers |

## The fourth thing: the lab page leaks into the product

This is the direct source of "it feels unfinished".

- Every entry is stamped `daygame-coach /test/toggl` (`CREATED_WITH`), and the
  detail sheet **shows that string to the user**. It is in the database too.
- **"Copy start link" produces a link to `/test/toggl`** — a page that 404s in
  production. Verified in `startLinkFor`.
- The header badge reads "Toggl-style time tracker".

## The fifth thing: it does a second of work every second

`TogglLab`'s bottom-bar measuring effect **has no dependency array**, so it tears
down and rebuilds a `ResizeObserver` on every render — and the shell re-renders
every second from the clock.

```
ResizeObserver instances created while the page sits completely idle: 8 in 6 seconds
```

Two more of the same kind: every entry row renders **both** the phone layout and
the full desktop grid (the hidden one still builds its pickers), and the
one-second clock lives at the top of the tree, so every tick re-renders every
screen.

## Two suspects I could not confirm from here

Both are about a real phone keyboard, which this environment cannot produce.
Flagged rather than asserted.

- **Tapping outside a dropdown may not close it on iPhone.** The dismiss
  listener is `mousedown` only. iOS Safari does not dispatch synthetic mouse
  events for taps on non-interactive elements. `pointerdown` would be immune.
- **A picker may open underneath the keyboard.** Panels are placed against
  `document.documentElement.clientHeight`; `visualViewport` is used nowhere in
  `src/`. On iOS the layout viewport does not shrink when the keyboard appears,
  so the space the panel is placed into can already be covered.

---

## The rules this plan follows

Approval is of these five, not of any count.

1. **While a timer is running, the bar edits that entry directly — there is no
   draft.** *If wrong:* a crash, a closed tab or a second device mid-session
   loses everything typed since Start.
2. **An edit is saved the moment it is made. Nothing waits for a button.** *If
   wrong:* we keep the class of bug that just ate a description, and every field
   added later is a fresh chance to forget.
3. **One function decides what an edit does.** Every control in the timer bar
   routes through it, and it is the only thing that knows whether a timer is
   running. *If wrong:* the next field added re-introduces the bug and no test
   catches it.
4. **The tracker is a page of this app, not a lab page.** No `/test/toggl` in
   anything a user or the database sees. *If wrong:* "copy start link" keeps
   handing out links that 404, and entries keep being stamped with a test path.
5. **A phone control is 44px and says what it does.** *If wrong:* the only exit
   from the tracker stays a 20px arrow.

## Milestones

### M1 — What you enter is what gets saved
The bug above, and its whole class.

- While a timer runs, description, project, task, tags and billable write
  straight to the running entry. Description on a 400ms pause and on blur;
  everything else immediately.
- The detail sheet commits description and times the same way. **"Save times"
  is deleted**, not relabelled.
- One `applyToCurrent(patch)` owns the running-vs-draft decision.

*Acceptance:* new e2e — start a timer, fill in all four fields, stop, assert the
saved entry carries all four. New unit test asserting `applyToCurrent` targets
the entry when one is running and the draft when none is. Both fail against
today's code.

### M2 — Your project comes up when you type its name
- The description box matches projects on plain text, not only after `@`.
- The picker lists most-recently-used first, and searches task and client names.
- The `@ project · # tag` hint is visible at phone width.

*Acceptance:* e2e at 390px — type `wri` into the description box with a
`Writing` project present, assert it is offered and selectable.

### M3 — The pickers work with a thumb
- `pointerdown` instead of `mousedown` for dismissal.
- Panels measured against `visualViewport`, and the keyboard opening repositions
  rather than closes them.
- The back control becomes 44px and says "Dashboard".
- The section bar goes to five items with 12px labels; Manage and Settings move
  behind "More".

*Acceptance:* the existing `mobile-toggl` overflow and touch-target assertions,
extended to the back control and the section bar.

### M4 — Opening Time looks like opening part of this app
- `<h1>` reads "Time"; the workspace name moves to a subtitle.
- Document title becomes "Time · <clock>" and stops naming `/test/toggl`.
- The last section is remembered.
- The loading state renders inside the app's chrome instead of a blank screen.
- `CREATED_WITH` and `startLinkFor` stop naming `/test/toggl`. **`SEED_CREATED_WITH`
  must not change** — `removeDemoData` identifies old demo rows by that exact
  string.

*Acceptance:* e2e asserting `startLinkFor` resolves to a page that is not a 404
in production, and that no user-visible string contains `/test/`.

### M5 — It stops doing a second of work every second
- Dependency array on the bottom-bar effect.
- The clock is read where it is used, not threaded from the root.
- One row layout is rendered per viewport, not both.

*Acceptance:* a test asserting zero new `ResizeObserver` instances over five
idle seconds.

---

## Manual blockers

Each attempted at least once; result recorded.

1. **Reproducing the keyboard behaviour on a real phone** — *STILL OPEN, and the
   one thing worth the owner's thirty seconds.* Both suspects were fixed blind
   on the owner's instruction, and both are strictly better on every engine, so
   nothing is riding on the answer — but neither has been seen working on a real
   iPhone. *Original note:* Shrinking
   the layout viewport to 390×420 in Chromium did **not** close an open picker,
   so Android's shrink-on-keyboard is probably safe. iOS Safari's keyboard and
   its synthetic-mouse-event rules cannot be emulated here at all. **Needs the
   owner on their actual phone**, or an accepted risk. The
   `toggl-iphone-safari` / `toggl-android` Playwright projects would still not
   have a real soft keyboard.
2. **Watching `/dashboard/time` open while signed in** — **CLOSED 2026-09-26, by
   test rather than by eye.** The signed-in suite now asserts the product
   route's own chrome; see the section above. *Original note (kept, because the
   reasoning for closing it was wrong — the route's chrome DID need checking,
   just not by me watching it):* closed, not needed.
   The owner answered that the signed-out shell is enough; the only untested
   difference is the server swapping the workspace after first paint, which is
   plain in `useTimetrackSync`. *Original note:* not possible from
   here.* Reading `tests/e2e/.auth/user.json` was refused by the sandbox
   (credential materialisation). Verified the signed-out shell at `/test/toggl`,
   which is the same component, and read the signed-in step out of
   `useTimetrackSync`. **Needs either the owner's confirmation or permission to
   use the e2e auth state.**
3. **Whether entries already in the owner's account carry the `/test/toggl`
   stamp** — *moot.* The owner chose to leave history alone, so the answer does
   not change anything. New entries are stamped `daygame-coach`.

4. **One unit run in ~six failed two tests that four other runs did not** —
   *unresolved, reported rather than explained.* It happened while the lint and
   typecheck ratchets were running against the same checkout, and the reporter
   output did not name them. Three consecutive clean runs since. Recorded here
   rather than called a flake with confidence I do not have.

## Open questions

Each with a recommendation.

1. **Six sections on a phone, or five?** → **Five. Built.** Timer, Calendar, Reports,
   Projects, More (Manage + Settings). Buys 78px per tab and 12px labels,
   matching the app's own bar. Manage is Clients/Tags/Team — two thirds of it is
   for teams that do not exist here.
2. **The `/test/toggl` stamp on entries already saved.** → **Left alone. Built.** It is a cosmetic provenance string, and
   rewriting stored rows is in the owner's always-ask set for a reason.
3. **Description: commit on every keystroke, or on a pause?** → **400ms pause,
   plus blur and unmount. Built** — unmount rather than Stop, because unmount is
   what makes closing the detail sheet safe, and tapping Stop blurs the field
   first anyway. Every keystroke would push a sync row per character.
4. **Does `/test/toggl` stay?** → **Yes. Kept.** It is the signed-out lab the phone
   suite runs against, and the suite depends on getting an empty workspace.
5. **M3's two suspects: fix blind, or wait for the owner's phone?** → **Fixed
   blind.** `pointerdown` and `visualViewport` are strictly better on every
   engine and cost nothing if the suspicion was wrong.

---

# The AI half

## Where each thing lives

| Symptom | File |
|---|---|
| Running entry never updated | `src/timetrack/components/TimerBar.tsx` — every `onChange` calls `setDraft`; nothing calls `updateEntry`. Only `setRunningElapsed` (line 90) commits. |
| One-way mirror | `src/timetrack/components/TogglLab.tsx` — `useEffect` keyed on `running?.id` copies running → draft, never back |
| "Save times" | `src/timetrack/components/EntryList.tsx:838-863, 937-941` — `description`/`start`/`stop` in local state, committed only by `save()` |
| `@`-only matching | `src/timetrack/components/pickers.tsx` `DescriptionField`; token grammar in `timetrackService.ts:681` `activeToken` |
| Shortcut hint hidden on phones | `TogglLab.tsx` — the `⇧?` button is `hidden … sm:inline-flex` |
| Picker ordering | `pickers.tsx` `ProjectPicker` — `grouped` sorts by client name, filters on `p.name` only |
| Bar hidden app-wide | `components/navTabs.ts` `HIDDEN_ROUTE_PREFIXES` |
| 10px labels / six tabs | `TogglLab.tsx` bottom `<nav aria-label="Sections">` |
| 20×36 back control | `TogglLab.tsx` header `<Link>`; label is `hidden sm:inline` |
| Title | `src/timetrack/hooks/useTimetrack.ts` — `const base = "Time tracker · /test/toggl"` |
| Stamp + start link | `src/timetrack/config.ts:20` `CREATED_WITH`; `timetrackService.ts:1229` `startLinkFor` |
| ResizeObserver churn | `TogglLab.tsx` — the bottom-bar `useEffect` ends `})`, no deps |
| Both row layouts rendered | `EntryList.tsx:432` (`sm:hidden`) and `:492` (`hidden sm:grid`) |
| `mousedown` dismissal | `src/timetrack/components/primitives.tsx` `useClickOutside` |
| Layout-viewport measurement | `primitives.tsx` `usePanelPosition` → `document.documentElement.clientHeight` |

## Order

M1 alone is worth shipping; it is the bug. M5 is a one-character fix plus two
small ones and can ride with any milestone. M2–M4 are independent of each other.

## Do not break

- `SEED_CREATED_WITH` is a load-bearing string (`demoDataService.removeDemoData`).
- `tests/e2e/mobile/mobile-toggl.spec.ts` runs **signed out** on purpose and
  asserts an empty workspace; it names tabs by label, so M3's bar change edits it.
- `--panel-bottom-inset` is published by the effect M5 fixes — the deps array
  must not stop it publishing.
- Ids are minted on the device (`idService`); nothing here may start minting
  them server-side.
