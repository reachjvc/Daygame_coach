# Life Mastery moved off the test pages — 2026-09-09

## Why

Everything under `/test` answers 404 in production on purpose
(`app/test/layout.tsx`), and the app is deployed. Life Mastery lived at
`/test/life-mastery`, so the copy people were sent to did not exist for them.
The Training screen's own subtitle — "Part of your **Life Mastery plan**" —
pointed straight at it.

It also had a second, live copy at `/dashboard/goals/plan`, behind a purchase,
three levels inside the goals dashboard. Two copies of one flow.

## Where it is now

| | |
|---|---|
| The flow | `/life-mastery` |
| Quit-a-vice, which the flow links into | `/life-mastery/quit-vice/*` (9 routes) |
| The old live address | `/dashboard/goals/plan` → redirects, keeps `?step=` |
| Who can open it | signed in; **no purchase**, which the old live copy required |
| The gate | one layout, `app/life-mastery/layout.tsx`, covering all ten routes |

**Nobody's plan moved.** The flow keeps its plan in browser storage, which
belongs to the site rather than to any one address.

## Built to move again, because it will

The address is one constant: `LIFE_MASTERY`, `QUIT_VICE` and `viceStep(id)` in
`src/shared/lifeMasteryRoutes.ts`. A move is two edits — rename the folder under
`app/`, change the constant. Three guards keep it that way:

- `tests/unit/navigation/lifeMasteryRoutes.test.ts` fails the build if the path
  is written out by hand in any of the three quote styles. Checked by planting
  one of each and watching it go red.
- `routeReachability.test.ts` resolves the constants, so writing links as symbols
  does not blind the orphan check. It also reads the vice flow ids out of
  `ViceFlowId`, so a dynamic `viceStep(flow.id)` resolves to exactly the
  destinations that type allows.
- The same file now refuses any link from a live page to a `/test` page at all.

## What the move exposed, and what was done

Making a bench page into a product page applies the product's rules to it for
the first time. Every one of these was found by a guard or by an adversarial
pass, not by inspection:

1. **63 browser tests still drove the deleted addresses.** `quit-vice.spec.ts`
   (55), `deadControls.spec.ts` (4), `life-mastery-track.spec.ts` (4), all in CI.
   Repointed at the constants; 70 pass at the live address. This was the whole
   browser coverage the vice module had, and for a few minutes it tested nothing.
2. **The vice hub's back link said "Test pages"** while pointing at Life Mastery.
3. **Nine pages had no way back the app recognises.** They had hand-rolled back
   rows; they now use the shared `BackLink`, which also gives them the
   return-to-where-you-came-from behaviour and names its destination.
4. **A link that could render as `.../undefined`.** The old string-template form
   hid it; the constant is typed, so the compiler said so. Both call sites now
   fall back to the hub, which is the one destination that cannot be wrong.
5. **An AI button that could never work in production — now removed entirely.**
   The flow's "suggest goals" called `/api/test/north-star-generate`, which
   refuses in production on purpose: it spends money per press and was limited to
   one account. It was hidden first; the user's answer was to take it out. Gone:
   the panel (`Generate.tsx`), all four places that rendered it, the endpoint,
   `northStarGenerateService.ts`, its test, and the copy written for the button.
   Two allowlists in `architecture.test.ts` shrank by one entry each as a result,
   which is the ratchet noticing a file stopped existing. **There is no model
   call left in this flow.** Recoverable from git if it is ever wanted back.
6. **The tap-target budget guarded the wrong page.** It sat on
   `/dashboard/goals/plan`, which is now a redirect with no controls, while the
   real page was measured against zero. Moved with the page.
7. **The default way out of the flow was `/test`, labelled "Test pages".** The
   only page rendering it passes a real address, so the default was never used —
   but it was a `/test` link sitting in a product component. Now `/dashboard`.

## Left undone, deliberately

**The vice module's controls are half the size a finger needs.** Measured at
390px: flow rows 19px tall, "start over" 48×16, the back link 80×18, against a
44px standard. Between 2 and 14 undersized controls per page, recorded route by
route in `TAP_TARGET_DEBT` in `tests/e2e/sweep/route-sweep.spec.ts`, where the
numbers can only go down.

This is not new and the move did not cause it. It was invisible because the
sweep does not examine `/test`. The shape of the fix: give the flow rows, the
"start over" control and the step chips a 44px minimum height without making
every page a screen longer. That is a design pass on a module whose choices are
research verdicts, so it is not something to restyle in passing.

## The two auth fixes, done 2026-09-09 on the user's say-so

**1. The open redirect in the login flow is closed.** `safeNextPath` rejected
`//evil.com` and `/\evil.com` but waved through `/⇥/evil.com`. Browsers delete
tab, newline and carriage return from a URL and then read what is left, so a
value this approved as a same-origin path became `//evil.com` — another site,
reached from our own login page, which is the classic phishing setup. The whole
control-character range is now refused before any other check, since no
legitimate destination contains one, and percent-encoded forms arrive here
already decoded so they are caught by the same line. Six new cases in
`tests/unit/shared/safeRedirect.test.ts`, including a NUL and two that must still
be ACCEPTED (a space, an accented character) so the fix cannot quietly become
"reject anything unusual". Proven by removing the guard and watching them fail.

**2. Signing in returns you to the page you asked for — everywhere, not just
here.** The gate was a layout, and a layout is not told which page was requested,
so all ten routes collapsed to the flow's front page. Life Mastery is now in
`proxy.ts` (which also means its session is refreshed on the way past, like every
other protected area), and the return address carries `pathname + search` instead
of `pathname`. That second half was wrong for the whole app: `?step=today` on the
plan and `?tab=week` on tracking were both being thrown away. Measured after:

    /life-mastery/quit-vice/where  -> next=%2Flife-mastery%2Fquit-vice%2Fwhere
    /life-mastery?step=today       -> next=%2Flife-mastery%3Fstep%3Dtoday
    /dashboard/tracking?tab=week   -> next=%2Fdashboard%2Ftracking%3Ftab%3Dweek

The layout keeps its own check as a second line of defence. `proxy.ts`'s matcher
must be a literal — Next reads it at build time and cannot evaluate an import —
so a test asserts that literal still agrees with `LIFE_MASTERY`. Without it, a
future move would leave every page under here open to anyone not signed in, and
nothing would say so.
