# Fixing the "shows a number it does not have" class for good

Companion to `docs/plans/silent-failures.md`, which lists the 59 instances. This
is how to stop the class rather than the instances.

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
- **When something fails, you are told which thing and offered a retry** — the
  same amber strip everywhere, rather than each screen inventing its own silence.

The one thing a person might dislike: screens that used to look calm and empty
will sometimes carry a warning. That is the point. The calm was a lie.

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
| Ordinary logic bugs, not this class | 5 |

**Thirty-nine of fifty-nine are one idiom repeated.** A component runs a fetch in
an effect, and on failure assigns a neutral value:

```ts
} catch {
  setSessions([])          // now the screen says "no sessions yet"
}
```

There is no shared hook for loading data in this codebase — 45 components each
wrote their own — so every one of them made this decision separately, and most
made it the same wrong way. That is not forty-five bugs. It is one missing
primitive.

**What makes it recur is that the wrong thing is easier than the right thing.**
Returning `[]` is one word. Distinguishing "nothing yet" from "could not ask",
threading that to a component, and rendering it takes a design decision every
time. So the fix is not vigilance; it is making the honest path the short one,
and then adding a check that fails when somebody takes the short-cut anyway.

**Roughly what it costs:**

| | |
|---|---|
| The two primitives and their tests | half a day |
| The ratchet that stops it recurring | half a day |
| The eight open repository findings | half a day |
| Migrating 39 client sites | two to four days |
| The goal "value unknown" state | one day, needs a decision |
| The five ordinary logic bugs | half a day |

The middle row is the long one and it is mechanical. Everything above it is what
makes the fix permanent, and it is about a day.

---

## The rule this is all built on

> A value that could not be computed is a THIRD state. It is never folded into
> zero, an empty list, `false`, or "nothing logged yet" — because each of those
> is a claim about the person, and when the computation failed the app has no
> grounds for it.

"You have done 0 sessions this week" and "we could not find out how many
sessions you did" are different sentences. Only one of them is ever true when a
query throws, and it is not the one the app was saying.

---

## Phase 0 — one way to load data, one way to say it failed

Nothing else in the plan works until these exist, because every later phase is
"use these".

1. **`src/shared/useResource.ts`** — the missing primitive.

   ```ts
   const sessions = useResource<Session[]>("/api/sessions")
   // sessions.data      last known value, or null
   // sessions.state     "loading" | "ready" | "failed"
   // sessions.stale     true when data is present but the last refresh failed
   // sessions.retry()
   ```

   **It keeps the last known value on failure.** Blanking the screen is the
   second-worst answer after lying about it; the person's programs and sessions
   should stay on screen with a note that they may be out of date. This is the
   behaviour already shipped for the training screen on 2026-09-08.

2. **`src/shared/components/CouldNotLoad.tsx`** — the one way to say so. An
   inline amber strip with the reason and a "Try again" button, lifted from the
   one now in `ProgramsApp.tsx` so there is a single copy. Amber, not red: the
   app is not broken, this panel is out of date.

3. **A skeleton is not a failure.** `state: "loading"` keeps whatever the screen
   does today. Only `failed` is new.

**Acceptance:** both have unit tests; the training screen is migrated to them as
the first caller and its existing tests still pass.

---

## Phase 1 — the ratchet, which is the part that makes it permanent

A cleanup decays. This codebase already knows the answer to that and uses it
three times: `tsc-baseline.json`, `writeCoverage.baseline.json`, and
`MAX_UNASSERTED`. A number that may only fall.

**`tests/unit/honestValues.test.ts` + `tests/support/honestValues.baseline.json`.**

The scanner reuses `tests/support/writePaths.ts` — its `stripNonCode` and
`functionBody` were both hardened on 2026-09-08 and are the only correct source
walkers in the repo. It flags a function whose body:

- catches, then assigns or returns `[]`, `0`, `null`, `{}` or `false`
- destructures `const { data } = await supabase` without taking `error`
- writes `res.ok ? x : <neutral>`
- calls `.catch(() => <neutral>)`

Each hit is keyed `file:functionName`, not by line, so it survives edits. The
baseline marks each as:

- **`honest`** — reviewed, and the neutral value really is the right answer
  (a `catch` around `localStorage`, a parser returning `[]` for empty input)
- **`silent`** — still lying, not fixed yet

**One gap to close before the baseline is taken.** The existing scanner finds
declarations with `/function\s+(\w+)/`, which cannot see a component written as
`export const Thing = () => ...`. Counted across the goals, tracking and lair
components: 247 are written as `function` and 18 as `const`. So it already
reaches most of what matters — but those 18 would be invisible, and invisible is
the exact failure this plan exists to stop. The declaration pattern has to cover
both first, or the baseline is itself a silent failure.

`MAX_SILENT` starts at whatever today's count is and may only fall. A new silent
failure fails `npm test`, and the only way past it is to write the word `silent`
into a file next to your name.

**Acceptance:** the ratchet is green at today's count; deliberately adding a
`catch { setX([]) }` to any component makes it fail.

---

## Phase 2 — the repository layer (8 open findings)

Small, and the highest severity per line changed. Each was re-read before being
listed here; one of them turned out to be milder than the sweep implied, and is
described as it actually is rather than as it was first reported.

1. **An error is never discarded.** `src/db/scenarioRepo.ts:58` does
   `const { data: rows, count } = await supabase` and never looks at the error,
   so a failed read returns zeros that are presented as measured facts — "you
   have never practised" to somebody with 34 practice runs, and a 0 written over
   their goal. It must throw or report instead.

   `src/db/settingsRepo.ts:162` is a different and milder case, and the plan
   originally described it wrongly: it DOES check the error and throws on a real
   one. It falls back to UTC only when the profile row or its timezone is
   missing, and says so — to the server log. The fault is that a person whose
   weekly counters have quietly moved onto UTC weeks is never told, so a Sunday
   evening session lands in the wrong week with no explanation. Lower severity,
   and the fix is to surface it rather than to add error handling.
2. **A refused write is not a success.** `src/db/goalRepo.ts:902` discards the
   error from a goal update, and `:794` counts a failed rollover write as done,
   leaving last period's number on screen as if it were this period's.
3. **A capped read says it was capped.** `src/db/healthRepo.ts:256` caps the sets
   query at 1000 rows, so a CSV export offering "every set you have ever logged"
   silently loses most of a long training history. `src/db/scenarioRepo.ts:60`
   computes counts from a capped page while the total uses the real count, so the
   two disagree. `src/db/goalRepo.ts:966` drops a period's archive and zeroes the
   counter anyway, under-counting the year.

**Acceptance:** an integration test per finding, each checked by reverting the
fix and confirming it fails.

---

## Phase 3 — the 39 client sites, in severity order

Mechanical once Phase 0 exists: delete the hand-rolled effect, call
`useResource`, render `CouldNotLoad` for the failed state.

Order by what it costs the person to be lied to:

1. **wrong-number (18)** — they act on a false figure. The achievements screen
   saying "0 of 43 unlocked" to somebody with 23 badges; a milestone's monthly
   gain showing the lifetime total; the weekly review printing "0 completed".
2. **missing (29)** — something silently absent, usually as "you have nothing
   here yet". Your One Thing replaced by an invitation to write one; the whole
   lift history and its export vanishing; the weight, sleep and nutrition cards
   all saying "No data yet" together.
3. **stale (12)** — out of date without saying so.

Every migrated site is flipped from `silent` to `honest` in the baseline and
`MAX_SILENT` comes down, so the work is visible and cannot slide back.

---

## Phase 4 — a goal that does not know its own number

The one finding that needs a schema change, and the one still open from the
2026-09-08 fixes.

A period boundary zeroes every linked goal because the sync immediately after is
expected to write the real number back. When that sync fails, the goal sits at
the zero the rollover wrote, and "0/3 · auto-tracked" is indistinguishable from a
week off. The guard added on 2026-09-08 cannot help: leaving the value "as it
was" means leaving it at that zero.

**What it takes.** `user_goals` needs to be able to hold "this number is not
known" as distinct from zero — one boolean column. Then the rollover does not
zero a linked goal it cannot refill, the card shows the last known figure marked
as out of date, and **a streak is never broken by a number the app could not
read**. That last part is the one that actually matters to a person: a
three-week streak erased by a dropped connection.

`user_goals` grants UPDATE on all 41 columns to signed-in users, so a new column
is writable without a new grant — checked, not assumed. Nothing about permissions
changes.

---

## Phase 5 — the five that are not this class

Found by the same sweep, unrelated to it, and worth fixing while the files are
open:

- **"Protein target hit" counts meals, not days**, so a day well over target can
  score zero.
- **"Sleep debt this week" is the last 7 entries, not the last 7 days** — miss
  three nights and it silently reaches back a fortnight.
- **Badges the app does not recognise are dropped from the count** with only a
  console warning, so an older account's total quietly shrinks.
- **"Week streak" can never exceed 13** because only 90 days of workouts are
  loaded, and **"New PR" is judged against those 90 days** rather than the
  history.

---

## Phase 6 — proving it, rather than believing it

The acceptance test for the whole plan, and the only one that tests the rule
rather than an instance:

**A browser test that breaks the server on purpose.** Playwright intercepts a
route, fails it, and walks the screen. The assertion is not "an error appears" —
it is that **no number, streak or empty-state sentence appears that would be a
claim about the person.** Run it once per major screen: dashboard, goals,
training, health.

That test is what "for good" means in practice. The ratchet stops new silent
failures being written; this stops them being rendered.

---

## Open questions — each with a recommendation

1. **What should a panel that cannot load look like?** *Recommendation:* the
   inline amber strip with "Try again" already shipped on the training screen,
   extracted and reused. It is unobtrusive, it names the problem, and it offers
   the one useful action.
2. **Keep the last known data on screen when a refresh fails, or blank it?**
   *Recommendation:* keep it and mark it stale. Blanking loses information the
   person had a second ago.
3. **What does a goal card show when its metric is unknown?** *Recommendation:*
   the last known number, greyed with a small note, and the streak untouched.
4. **The CSV export capped at 1000 rows: paginate, or cap and say so?**
   *Recommendation:* paginate. It is an export and completeness is its entire
   purpose.
5. **Should the ratchet fail `npm test`, or only warn?** *Recommendation:* fail,
   like the three ratchets already in this repo. A warning is a thing people
   stop reading.
6. **All 50 remaining, or the 18 wrong-number ones first?** *Recommendation:*
   wrong-number first, then reassess. They are the ones a person acts on.
7. **Do the five unrelated logic bugs belong in this plan?** *Recommendation:*
   yes, as their own phase. They were found here and they are cheap.
