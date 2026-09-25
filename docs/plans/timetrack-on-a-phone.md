# The time tracker on a phone

Written 2026-09-25, after reproducing the owner's three complaints at 390×844
against `localhost:3000`. Everything in "What is actually wrong" was run, not
inferred, except the two items marked **suspect**.

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

1. **Reproducing the keyboard behaviour on a real phone** — *partial.* Shrinking
   the layout viewport to 390×420 in Chromium did **not** close an open picker,
   so Android's shrink-on-keyboard is probably safe. iOS Safari's keyboard and
   its synthetic-mouse-event rules cannot be emulated here at all. **Needs the
   owner on their actual phone**, or an accepted risk. The
   `toggl-iphone-safari` / `toggl-android` Playwright projects would still not
   have a real soft keyboard.
2. **Watching `/dashboard/time` open while signed in** — *not possible from
   here.* Reading `tests/e2e/.auth/user.json` was refused by the sandbox
   (credential materialisation). Verified the signed-out shell at `/test/toggl`,
   which is the same component, and read the signed-in step out of
   `useTimetrackSync`. **Needs either the owner's confirmation or permission to
   use the e2e auth state.**
3. **Whether entries already in the owner's account carry the `/test/toggl`
   stamp** — *not attempted*; it needs a read of the owner's rows. **Needs the
   owner, or approval for a read-only query.**

## Open questions

Each with a recommendation.

1. **Six sections on a phone, or five?** → *Five.* Timer, Calendar, Reports,
   Projects, More (Manage + Settings). Buys 78px per tab and 12px labels,
   matching the app's own bar. Manage is Clients/Tags/Team — two thirds of it is
   for teams that do not exist here.
2. **The `/test/toggl` stamp on entries already saved.** → *Leave history
   alone; change only new entries.* It is a cosmetic provenance string, and
   rewriting stored rows is in the owner's always-ask set for a reason.
3. **Description: commit on every keystroke, or on a pause?** → *400ms pause,
   plus blur and Stop.* Every keystroke would push a sync row per character.
4. **Does `/test/toggl` stay?** → *Yes.* It is the signed-out lab the phone
   suite runs against, and the suite depends on getting an empty workspace.
5. **M3's two suspects: fix blind, or wait for the owner's phone?** → *Fix
   blind.* `pointerdown` and `visualViewport` are strictly better on every
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
