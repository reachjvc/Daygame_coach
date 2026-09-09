# Fixing the "shows a number it does not have" class for good

Companion to the 59-instance sweep (`docs/plans/silent-failures.md`, deleted in the documentation cleanup of 2026-09-09 — the training entries are now covered by `docs/plans/training-rebuild.md` Phase 2). This
is how to stop the class rather than the instances.

**Revised 2026-09-08 after an adversarial review.** The first draft was wrong in
seven ways that would have cost real time, and one of its central proposals would
have made a live security fault worse. Everything the review found is folded in
below; the failure list is kept at the bottom rather than quietly dropped.

---

## What changes for the person using the app

Nothing new appears when everything works. The whole of this is about the moment
something does not.

- **A goal card stops saying "0/3" when the app could not count.** It shows the
  last number it actually knew, marked as out of date, and **a streak is never
  broken by a figure the app failed to read.**
- **A tile that cannot be worked out says so**, in amber, instead of "Nothing
  logged for this yet" — which is a sentence about your week, and was false.
- **Your programs, sessions and lift history stop disappearing** when a request
  drops. They stay on screen with a line saying it may be out of date, and a
  "Try again".
- **"New best" is only claimed when the app has actually read your history.**
- **An export that says "every set you have ever logged" contains every set.**
- **Signing in as a different person on the same device cannot show you the
  previous person's numbers.** Latent today rather than live; see the note below.

The one thing a person might dislike: screens that used to look calm and empty
will sometimes carry a warning. That is the point. The calm was a lie.

---

## Read this first: a latent cross-account leak

**Verified by reading the code:**

- Two hooks hold their answers in module-level variables with **no user key**:
  `useTrackingStats.ts:24` (`let statsCache`) and `useEnrollment.ts:28`
  (`const store`).
- **Nothing clears either when the signed-in person changes.** The only
  invalidation is `invalidateTrackingStatsCache`, called after mutations.
- The login page does not turn away somebody who is already signed in, so an
  account switch is possible without leaving the app.

**Verified, and it lowers the severity:** there is no sign-out control anywhere
in the product. `app/actions/auth.ts` exports a `signOut` server action and
nothing imports it; the only "Logout" button is on the separate admin page. So
the obvious way to reach this — sign out, sign in as somebody else — does not
exist yet.

**NOT verified: that it reproduces end to end.** I tried and my harness was
wrong: I navigated with a plain link, which is a full page load and clears module
state by definition. Reaching it needs a soft navigation to the login page, which
means clicking a Next `Link` while signed in. One exists, on the time-tracker
page. I did not get as far as proving the leak through it.

**So, stated honestly:** the unkeyed caches are real and the guard against this
is missing, but the path to trigger it today is narrow. It becomes
straightforward the moment a sign-out button is added — which is an obvious
missing feature somebody will add.

**Why it is Phase 0 regardless.** The plan's central proposal makes what it shows
worse: "keep the last known value when a refresh fails" would render the first
person's data to the second one *with an amber note saying it may be out of
date*. A confident, well-designed lie is worse than a blank screen.

---

## Is this easily done? The honest answer

**The cleanup is long. The fix is short.** Those are different things, and only
the second one is "for good".

Fifty-nine findings sounds like fifty-nine problems. It is not. Counted by where
they live:

| | |
|---|---|
| Components fetching their own data | 24 |
| Hooks fetching their own data | 15 |
| Repository reads and writes | 13 |
| API routes | 2 |
| Ordinary logic bugs, unrelated | 5 |

Thirty-nine of fifty-nine are the same idiom: a component fetches in an effect
and, on failure, leaves a state variable at the empty value it was initialised
with. There is no shared hook for loading data in this codebase, so forty-five
components each wrote their own and most made the same choice.

**But only about sixteen of the thirty-nine are a drop-in replacement.** The
review read a sample, and the rest are not the same job at all: five parallel
fetches behind one cache, a cursor-based sync with an offline queue, a state
machine driven by a GET, a failure that gets *written into a saved review*. Those
eleven come to well over six thousand lines and each needs its own decision.

**What makes it recur is that the wrong thing is easier than the right thing.**
Leaving a state variable at `[]` costs nothing to type. So the fix is not
vigilance; it is making the honest path the short one, and then making the
short-cut fail the build.

**Roughly what it costs:**

| | |
|---|---|
| The user-key fix, before anything else | half a day |
| The two primitives, client and server | one to two days |
| The guard that stops it recurring | half a day |
| The goal "value unknown" state | one day, needs a decision |
| The eight open repository findings | one to two days |
| The sixteen straightforward client sites | one day |
| The eleven that each need a design | four to six days |
| The six ordinary logic bugs | one day |

Nine to fourteen days in total. The part that makes it permanent is the first
three rows, and that is about two days.

---

## The rule this is all built on

> A value that could not be computed is a THIRD state. It is never folded into
> zero, an empty list, `false`, or "nothing logged yet" — because each of those
> is a claim about the person, and when the computation failed the app has no
> grounds for it.

---

## Phase 0 — stop the leak

Before any of the rest, because the rest amplifies it.

Both module-level stores take the user id as part of their key, and both are
cleared when the signed-in person changes. A cache that cannot say who it belongs
to must not survive a navigation.

**Acceptance:** a browser test that signs in as one account, reads a number,
signs out, signs in as the other, and asserts the first account's number is never
on screen.

---

## Phase 1 — one way to load data, one way to say it failed

Two primitives, not one. The first draft had only the client half, and that was
its biggest gap: two of the worst findings are in server components, which no
client hook can reach.

1. **`src/shared/useResource.ts`** — for the client.
   - Keeps the last known value on failure and marks it stale, rather than
     blanking the screen.
   - **Takes the user id in its key** (Phase 0).
   - **Accepts server-rendered initial data and seeds from it once, not on every
     render.** Eighteen components already take an `initial...` prop and five of
     those also fetch. Seeding on every render is a bug now fixed twice in
     `useEnrollment`.
   - **Deduplicates by key.** Six Lair widgets each fetch `/api/goals` separately
     today.

2. **A server-side `Result<T>`** — for pages. A server component that cannot read
   its data hands the failure down as part of `initial`, with a reason, instead of
   catching and passing an empty array. Today `app/programs/page.tsx` catches,
   logs, and passes `[]`, which the client hook then treats as authoritative — so
   the page states as fact that you have no programs.

3. **`src/shared/components/CouldNotLoad.tsx`** — the one way to say so, lifted
   from the strip now in `ProgramsApp.tsx`. Amber, with a "Try again".

4. **`error.tsx` boundaries.** There are none in the app today. Every "throw
   instead of guessing" change lands on Next's default error page until these
   exist.

**Acceptance:** the first caller is `WeightTracker`, which is genuinely simple.
The training screen comes later, because it needs the shared-store, seed-once and
cross-screen-refresh behaviour that took two bug fixes to get right.

---

## Phase 2 — the guard, which is what makes it permanent

The first draft proposed a regex scanner over function bodies. The review showed
it would have been close to useless: the dominant shape is a `catch` that assigns
nothing at all, which no such rule can see, while the rules that were specified
fire mostly on correct code — around eighty per cent false positives, most of
them `localStorage` and JSON parsers. It also proposed reusing
`tests/support/writePaths.ts`, which only walks `Service.ts` and `Repo.ts` files
and cannot see a single `.tsx`.

**Do it as an architecture rule instead**, where two rules of exactly this shape
already live in `tests/unit/architecture.test.ts`: "no NEW date derived by
converting to UTC first" and "no NEW hand-rolled week boundary", each with an
allowlist that may only shrink.

> **No new component fetches its own data.** A file under `src/**/components/`
> may not call `fetch` unless it is on the allowlist, and the allowlist only
> shrinks.

This is stronger than the scanner and far simpler. It does not try to judge
whether a given failure path lies; it removes the ability to write one by hand,
which is what actually causes the class. Every migrated component comes off the
list, so the work is visible and cannot slide back.

**Acceptance:** green at today's count; adding a `fetch` to any component not on
the list fails `npm test`.

---

## Phase 3 — a goal that does not know its own number

**This must come before the repository work**, which the first draft had
backwards.

A period boundary zeroes every linked goal because the sync straight afterwards is
expected to write the real number back. When that sync fails, the goal sits at the
zero the rollover wrote. Convert the repository reads to throw first and this
fires *more often*: today a broken scenario read is a wrong number that
self-corrects on the next good sync; afterwards it is a goal stuck at zero for a
week, with the streak already broken.

So: `user_goals` gains a boolean for "this number is not known", the rollover
stops zeroing a linked goal it cannot refill, the card shows the last known figure
marked out of date, and **a streak is never broken by a number the app could not
read.**

`user_goals` grants UPDATE on all 41 of its columns, so a new column needs no new
grant. Checked, not assumed.

---

## Phase 4 — the repository layer (8 open findings)

1. **An error is never discarded.** `src/db/scenarioRepo.ts:58` does
   `const { data: rows, count } = await supabase` and never looks at the error, so
   a failed read returns zeros presented as measured facts. It must report
   instead. Only after Phase 3.
2. **`src/db/settingsRepo.ts:162` is a milder case and the first draft described
   it wrongly.** It does check the error and throws on a real one; it falls back
   to UTC only when the profile row or its timezone is missing, and says so to the
   server log. **It must not be made to throw**: it is awaited by the dashboard's
   server component, so throwing takes the whole page down over a wrong week
   boundary. Surface it instead.
3. **A refused write is not a success.** `src/db/goalRepo.ts:902` discards the
   error from a goal update; `:794` counts a failed rollover write as done.
4. **A capped read says it was capped.** `src/db/healthRepo.ts:250-262` has no
   `.limit()` at all — the cap is PostgREST's server-side default, so a CSV export
   offering "every set you have ever logged" silently loses most of a long
   history. Proving it needs a fixture of more than a thousand set rows, and
   paginating risks the URL length limit. **Half a day on its own.**
   `scenarioRepo.ts:60` and `goalRepo.ts:966` are the same shape.

---

## Phase 5 — the client sites

**The sixteen straightforward ones** are a drop-in: the weight, sleep and
nutrition cards, the workout logger, the lift history, the daily review card, the
season band, the script builder, the goals summary, and the six Lair widgets.

**The eleven that are not** each need their own design and their own line item.
The tracking stats hook has five parallel fetches behind a thirty-second cache
with 487 dependents; the time-tracker sync is a cursor-based delta with an offline
queue; the weekly review page writes its failure into a saved review, so no read
primitive can fix it; the field report page loops POSTs after a save.

---

## Phase 6 — the six that are not this class

Found by the same sweep, unrelated to it:

- **The milestone monthly delta shows the lifetime total** when there is no
  baseline row. A pure function fabricating a number, not a fetch bug, and the
  first draft wrongly filed it under "mechanical".
- **The week strip marks a weekday done if it was ever trained, in any week** —
  `sessionLogsFor` applies no date filter. This was in no phase at all.
- **"Protein target hit" counts meals, not days.**
- **"Sleep debt this week" is the last 7 entries, not the last 7 days.**
- **Badges the app does not recognise are dropped from the count.**
- **"Week streak" cannot exceed 13** because only 90 days of workouts are loaded,
  and **"New PR" is judged against those 90 days** rather than the history.

---

## Phase 7 — proving it

**A browser test that breaks the server on purpose**, then asserts that no number,
streak or empty-state sentence appears that would be a claim about the person.

**The catch the first draft missed:** Playwright's route interception only sees
requests the browser makes. The tracking dashboard's tiles and the training
screen's programs are resolved in server components and arrive inside the initial
HTML, so intercepting the API never touches them — the acceptance test would have
passed on the two screens that produced the worst findings while proving nothing.
The server path needs fault injection behind a test-only flag.

**And the test account must be seeded first.** "No empty-state sentence appears"
is indistinguishable from a legitimately empty account otherwise, and the shared
Playwright account is cleaned out by several specs.

---

## Open questions — each with a recommendation

1. **When a refresh fails, keep the last known data or blank it?**
   *Recommendation:* keep it and mark it stale, **after** Phase 0, never before.
2. **What does a goal card show when its metric is unknown?** *Recommendation:*
   the last known number, marked, and the streak untouched.
3. **The export capped at a thousand rows: paginate, or say so?**
   *Recommendation:* paginate. It is an export; completeness is the point.
4. **Should the guard fail the build?** *Recommendation:* yes, like the two
   allowlist rules it sits beside.
5. **All fifty remaining, or the eighteen wrong-number ones first?**
   *Recommendation:* wrong-number first.
6. **Do the eleven hard client sites belong in this plan at all?**
   *Recommendation:* no. List them, cost them, and take them one at a time as
   their own pieces of work. Folding six thousand lines of unrelated redesign into
   a plan about honesty is how a plan stops being executable.

---

## What the review found wrong with the first draft

Kept deliberately, because the plan is more trustworthy with it than without it.

1. **The proposal amplified a live security fault.** "Keep the last known value"
   on top of unkeyed module caches would have shown one person's data to another
   with a confident note attached. Now Phase 0.
2. **The guard would not have worked.** Its rules missed the dominant shape
   entirely and fired mostly on correct code, and the scanner it proposed to reuse
   cannot see `.tsx` files. Replaced with an architecture rule.
3. **The phase order was backwards.** Making repository reads throw before the
   goal "unknown" state exists converts a self-correcting wrong number into a goal
   stuck at zero for a week.
4. **The cost was roughly half of what it should be.** Sixteen of thirty-nine
   client sites are drop-ins, not all thirty-nine.
5. **Two shapes were missing:** server components, which no client hook reaches,
   and the absence of any `error.tsx` boundary.
6. **The acceptance test could not test the two worst screens**, because their
   data never crosses the network the test intercepts.
7. **Two findings were misfiled:** the milestone delta is a logic bug, not a fetch
   bug, and the week strip was in no phase.
