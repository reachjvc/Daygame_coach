# Onboarding — what is actually left

**Every number here was measured on 2026-09-08, not carried over from a plan.**

`onboarding-hardening.md` is the working record of how this was found and fixed.
It is 1,700 lines, seven appendices deep, and its main body describes a
five-step wizard that no longer exists. Read it for history. Read this for state.

---

## Fixed and verified

Checked in a browser today, not inferred from the code:

| | |
|---|---|
| The five-step signup wizard | Gone. Replaced by a one-screen form that only appears when you click Scenarios — the only feature that reads those answers |
| Submitting a blank profile | Impossible: submit stays disabled with a "still need…" hint, and there are no steps to skip to |
| `?step=abc` → "Step NaN of 5" | Fixed, and now guarded by an automatic junk-URL sweep |
| Editing wiping your other answers | Fixed — `/preferences` is the same one-screen form, prefilled |
| Level 7 with 0 XP | Progression says "Coming soon" in all six places. Nothing writes `level` any more |
| Browser Back jumping to the wrong step | Fixed in the shared hook, so all the app's step-flows got it |
| Scroll trap on a phone | Fixed on both pages that had it |
| 1.4 MB of photos at once | Fixed — all ten are lazy-loaded; zero bytes on first paint |
| Space key doing nothing | Works; `aria-pressed` now announces selection |
| Missing page heading | Fixed |

---

## Needs a decision from you

### 1. Two migrations are written but NOT applied

Both are in `supabase/migrations/`. I did not apply either — one touches
permissions, and this checkout is shared with another agent, so a push could
ship their unfinished work too.

- **`20260101000000_create_profiles.sql`** — the `profiles` table has never had a
  migration; it was made by hand in the dashboard. Until this is applied, a new
  staging environment or a new machine cannot rebuild the app's core table. It
  is written from the live database and every statement is guarded, so running
  it against production changes nothing.
- **`20260908120000_revoke_truncate_from_clients.sql`** — **security.** Signed-in
  users, and anonymous visitors, can currently wipe **64 tables**. `TRUNCATE`
  empties a whole table and is *not* filtered by the per-user rules that protect
  everything else. **It is not reachable today** — I checked; the API offers no
  such command — but it is safe by luck rather than by design. Left over from a
  Supabase default.

### 2. Email goes out through a personal Gmail account

`smtp.gmail.com`, sender `reachjvc@gmail.com`. Google caps relayed mail at
roughly 500 recipients a day, mail from a personal address to strangers lands in
spam far more often, and every signup email shows your own inbox as the sender.
Fine for a beta; a real sending service (Resend, Postmark) before a public
launch.

### 3. Ten minutes on a real phone

Everything above was measured in emulated iPhone and Pixel viewports. That gets
sizes and touch right; it does not reproduce real Safari's cookie handling or
real thumb-scrolling. Sign up, confirm from the phone's mail app, click through
to Scenarios, answer the form. Nothing substitutes for it.

---

## Counted debt — visible, ratcheted, not fixed

These cannot get worse without a test failing. They will not get better on
their own.

- **250 controls smaller than the 44 px minimum**, across 25 pages. 106 of them
  are on `/dashboard/goals/plan` alone. Most are 4 px short because the standard
  button is 40 px tall — one change to the shared button would fix the bulk.
- **196 functions write user data; 136 have no test that even mentions them.**
  Four have a test asserting what they actually save.

---

## Smaller, and honest about being unfixed

- **Three prototype test files fail locally** (`variant-a-v4-smoke`,
  `variant-b-smoke`, `variant-d-smoke`) — click timeouts against
  `/test/goalsv4`. Pre-existing. They used to run in five browser projects at
  once because a test pattern was not anchored; they now run once. Whether they
  fail in CI, where a production build is used, is unverified.
- **The integration test suite never runs in CI.** It is excluded from
  `npm test`, and CI runs only `npm test`. A suite that never runs reads as
  coverage and is not.
- **The preferences form has no `fieldset`/`legend` grouping**, so a screen
  reader reads the questions as loose text above their options. Selection itself
  is announced correctly.
- **The world map is still on the phone layout.** The region list beneath it is
  the working control and is what every test uses; the map is decoration at that
  size (country shapes are ~9 px).

---

## The one thing to know about the guards

Four mechanisms now derive their own scope from the app, so a new page or a new
write path is covered the day it is written rather than when somebody remembers:
`tests/support/appRoutes.ts`, the ratchets on the navigation guards,
`tests/e2e/sweep/`, and `tests/unit/writeCoverage.test.ts`.

Each asserts a floor on what it examined. That matters because the failure they
exist to prevent was not a missing test — it was a guard titled "EVERY SCREEN
HAS A WAY BACK" that examined **2 pages out of 28** and passed.

**The ceilings in those guards go down, never up.** One was raised from 125 to
136 on 2026-09-08, and that was correct: the scanner had a bug that hid 23 write
paths, so fixing it revealed debt rather than adding it, and the reason is
written above the number. That is the only acceptable kind of increase.
