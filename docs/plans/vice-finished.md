# Finishing the vice module

**Written 2026-09-24, for the owner, after driving both halves of the module in a
real browser.** The ask was: finish the vices *completely* — it must look good,
function well, and be built the way a senior programmer would build it, which
means it works across browsers, works as part of the app, works across devices,
and survives being offline.

Serves `docs/product/vision.md` items **9** (nothing can go wrong, not "the happy
path works"), **12** (it works on a phone and in a browser), **13** (tests worth
their keep), **16–17** (Life Mastery operational, wording and UX pass) and **38**
(every page gets another pass until it is actually done).

---

# PART 1 — FOR YOU

## The headline, before anything else

**The Black Box is in good shape. The module around it is not.** The front door
you land on at `/life-mastery/quit-vice` is genuinely well built — it survived
every check I ran, including two devices merging and a close call filed with no
signal. The unfinished part is everything around it.

> **STATE OF THIS SECTION, 2026-09-24.** The first three bullets below are now
> FIXED — M0 and M1 are built, verified and pushed; see "Built so far" further
> down for what that took and what it found. They are left here in their
> original words rather than quietly edited, because the argument the rest of
> this plan makes rests on what the module was actually like, and a plan that
> silently rewrites its own findings is a plan you cannot check. **Still true
> and still open: the helplines, the tap targets, the desktop layout, and the
> decision about the old screens.**

- ~~**22 of 61 browser tests for the old half are failing right now**~~ **FIXED
  (M0) — 61 of 61 green.** They had been red since the addresses moved on
  2026-09-20 — which means **CI went red on every push to this branch for four
  days.** The gate was not missing; its result was unread. `e2e.yml` runs on every push to every branch and runs this
  suite; the hooks that run locally (`npm test`, `.husky/pre-commit`) are
  vitest-only and cannot see it; and no session in this checkout has the `gh`
  CLI, so the only person who can read that result is you, opening GitHub. That
  is worth fixing independently of this plan, and it is the reason nobody caught
  it. A second consequence: while these 22 are red the whole chromium job is red,
  so a genuinely new failure arrives inside an already-red job and reads as more
  of the same.
- ~~**The module cannot be opened without a connection**~~ **FIXED (M1), and
  verified against a production build.** It was the one moment the tool was
  designed for: on screen it worked offline perfectly, and opening it offline
  showed the browser's error page.
- **STILL OPEN. The crisis helpline numbers were last checked 38 days ago**, and
  the page someone opens mid-thought has no route to them at all (M3).
- ~~**The old half is a one-way door**~~ **FIXED (M0).** Every one of its nine
  sub-pages sent you "back" to the Black Box, not to the hub you came from. This
  was the one real fault hiding behind the wrong test addresses.
- **STILL OPEN. 48 controls on seven of its pages are too small to tap on a
  phone** — and whether those pages survive at all is your decision (M2).

## What I actually checked, and how

Every line below was verified by running something, not by reading a note. Where
I only read source, I say so.

| What | How I checked it | Result |
| --- | --- | --- |
| The old half's browser tests | `npx playwright test tests/e2e/quit-vice.spec.ts --project=chromium` | **22 failed, 39 passed** |
| The Black Box's browser tests | same, `blackbox.spec.ts`, the offline and two-device tests | **4 passed** |
| The unit tests | `npx vitest run tests/unit/vice` | **16 files, 317 tests, all pass** |
| Opening it with no connection | Playwright: load it, `setOffline(true)`, reload | **`ERR_INTERNET_DISCONNECTED`, blank screen** |
| Staying on it when signal dies | same session, heading still on screen | **works** |
| Reaching it offline from another open page | `fetch` of its route with the network cut | **throws** |
| Whether any worker could serve it | read `public/sw.js` in full | stores **one** page, `/dashboard/time`, and returns early for every other navigation |
| How it looks | screenshots at 1280px, 430px, 390px and 320px, with a seeded four-run record | see "How it looks" below |
| Where the back links go | read `components/BackLink.tsx` + every `viceStep(...)` call site | no caller passes `?from=`, so all nine fall back to the Black Box |
| Tap targets | `tests/support/sweepDebt.ts`, the app's own measured list | Black Box, `/old`, `/learn` clean; **7 flow routes hold 48 controls under 44px** |
| Helpline freshness | `src/vice/data/help.ts` | `VERIFIED = "2026-08-17"` |
| Whether the front door reaches the help door | read `BlackBoxPage.tsx` imports and every link it draws | **it does not** |
| Cross-browser coverage | `playwright.config.ts` + `.github/workflows/e2e.yml` | the layout sweeps run on WebKit and iPhone; **no vice test runs in Firefox or WebKit** |
| The account half | read the migration, the repo, the API route; ran the two-device tests | owner-scoped in the repo *and* in row-level security; paged reads; tombstones |

Two claims in the repo turned out to be stale, so do not trust them either:
`tests/support/sweepDebt.ts` says "the sweep runs in no CI job" — it does, in
`e2e.yml`; and the Black Box plan's "its 184 tests stay green" is no longer true
of the browser tests.

## How it looks

I seeded a four-run, eight-report record — two and a half years, three relapses,
five close calls — and looked at it.

**On a phone it is close to right.** The numbers, the ribbon, the runs and what
each thought has cost all read cleanly at 390px, and the one thing the earlier
plan left open (the last axis label wrapping) is fixed. Two things are still off:
the three stat tiles wrap two-then-one and leave a hole beside the third, and at
320px the label that sits *on* a long bar crowds its end dot.

**On a desktop it is a phone screenshot in a browser window.** Everything sits in
one 736px column on a 1280px screen; the chart that is the whole point of the
tool gets 700px and the other 550px are empty. That is the half of vision item 12
nobody has done.

**One thing I want your eyes on, not mine.** On "what each thought has cost you",
the orange bar is the second row, not the first. Orange is fixed to the "I felt
fine" family on purpose — it is the research-important one — but the eye reads
orange as "the big one" while the number above it says the grey row cost you 287
days and the orange one 84. I think the accent is right and the ranking is right
and they fight each other on screen. You are the one who knows which reading you
want.

## M2 — DONE, 2026-09-24. RETIRED TO THE ARCHIVE, NOT DELETED.

The owner answered road A with a condition: *"You can retire anything you feel
isnt useful, but keep it in the test archives so i can access it later, and see
if youve destroyed something useful."*

**Where it went.** The nine routes under `/life-mastery/quit-vice/` are gone;
the module is at `/test/archive/quit-vice`, listed on the `/test` dashboard
beside the archived goals hub, which is the precedent. Same components, same six
flows, seven tools, teaching spine and shortlist, **still reading the same
`quit-vice-v1` key in the browser** — so anything the owner ever typed into
those screens is still readable, which is why the export question answered
itself. `tests/e2e/quit-vice.spec.ts` followed it: 61 tests, and they are what
keeps "retired, not deleted" true rather than a sentence in a commit message.
The footer line on the Black Box that pointed at it is gone, which was the last
thing between that page and concept item 8.

**WHAT WAS DESTROYED — the audit the owner asked for.** Checked against the
code, not the plan's own claims.

*Not lost, because the Black Box already does it:* the crisis help door and its
helplines (M3 mounted it on the front page); the lapse debrief, which is the
`ReportForm`, generalised so a close call is filed on the same form; the
medical-withdrawal gate in `AttemptStart`; "what got it going and what kept it
underway", which are `startedBy` and `structure[]` on a run; "what ended it",
which is the report the run ends on; and "what was different the time it
worked", which the whole chart answers from the person's own record rather than
from other people's.

> **BOTH WERE BUILT BACK ON 2026-09-24**, on the owner's "sure". The audit
> below is left in its original words because it is what the decision was made
> on. What landed: **the urge path** is `UrgeNow` on the Black Box — the four
> cited responses, the cue-rich steer, and an outcome that ends on the report
> form, because an urge that passed IS a close call and this page has filed
> both on one form since it was built. The six-stage choreography did not come
> back; item 7's rule says the responses are the citation and the stages are
> taste. **Other people's accounts** are in the thought door, one account under
> your own record and never above it, rotated by report count — not a library,
> because the same research says a library only serves somebody already
> browsing and that engagement volume predicts nothing good.
>
> Both guarded, and both guards proved by planting the fault: remove the
> account and the door test names it; drop what the urge path wrote and the
> handoff test names it. A third planted fault exposed that the cue-rich
> *reordering* was dead code — `RESPOND.options` already ends with watching, so
> the sort never moved anything, and the test written to prove it passed with
> the sort deleted. The sort is gone and `tests/unit/vice/urgeResponses.test.ts`
> asserts the order on the data that actually holds it.

*Genuinely lost from the live product, both with citations behind them:*

1. **The urge tool.** Four responses, reordered by context, teaching "play the
   tape forward" — 10 mentions in the corpus against 4 for urge surfing, which
   has a large failure literature and which a practitioner says to avoid in
   cue-rich rooms. The Black Box's door answers "maybe I could moderate"; it has
   no answer for "I have an urge right now".
2. **Other people's accounts.** 381 testimonials and 196 techniques from the
   15-source corpus. **The Black Box reads none of the corpus** — verified by
   grep, not assumed. Reading others' stories was a recovery community's
   most-valued feature at 80.8%.

*Lost and no loss, by the owner's own item 7 rule that taste goes:* the six
flows, the three copy versions, the nine-module learn spine, the ten-item
shortlist, the hub grouping and the word budget.

**A side effect worth naming rather than claiming as a win.** The 48 controls
under 44px lived on seven of those routes, and their `TAP_TARGET_DEBT` entries
are deleted because `appRoutes.ts` excludes `app/test/**` from the sweep. **They
were not fixed.** They are no longer in the product and no longer measured,
which is a different thing, and `sweepDebt.test.ts` caught the stale entries the
moment the routes went — the allowlist rule working.

**The debt a guard found — PAID 2026-09-25.** `architecture.test.ts` failed the
first version of this for a good reason: "nothing links to the archived
surfaces" exists because a link from production into the archive must be removed
again the day the archive goes, and a path constant is a link. The address moved
beside the pages; the components stayed in `src/` and imported it, which was
backwards and recorded as such.

**Twenty-four files moved to `app/test/archive/quit-vice/_module/`.** Which
twenty-four was **computed, not listed**: a script walks the import graph from
the live page and everything unreachable is archive-only. A hand-written split
is a second copy of the dependency graph and drifts on the first new import. The
result now reads `31 of 31` — every file left in the slice is reachable from the
Black Box, no orphans — and **`src/` no longer names the archive anywhere.**
Deleting the archive for real is one folder.

*It cost two guards their reach, which is the part worth recording.* Both
`viceComponentCopy` and `researchIsShipped` scan `src/vice/components` from
disk, so after the move they would have kept passing while reading twelve fewer
components — a lint quietly checking less than its name. Both take two roots
now, and `researchIsShipped` asserts it HAS two, so the day the archive is
really deleted that entry fails rather than becoming a free pass. Proved by
planting cheerleading copy in a moved component and watching the lint name the
archive path.

*And one of its assertions had moved with the product:* "puts something in front
of a first-time user mid-urge" read the retired `Tools.tsx`. That was the right
file to ask until 2026-09-24 and the wrong one after — the live answer is
`UrgeNow`. Asking the archive whether the PRODUCT does something is the shape of
every stale check here.

## The one decision this plan turns on — ANSWERED

**Your concept item 7 says "what is there now is more or less useless", and the
Black Box plan already dropped the six flows, the three copy versions, the learn
spine, the shortlist and the hub grouping as "AI's taste, not yours". They were
not deleted — they were moved to `/life-mastery/quit-vice/old` and left there.**

Nine months of that decision's consequences are now the bulk of what is unfinished
in this module: 22 red tests, 48 untappable controls, a one-way back button, two
pages whose top heading is an `h2`, and a storage promise printed on screen —
"Everything you type stays in this browser. Nothing is sent anywhere, and there is
no account" — that flatly contradicts the account the Black Box now writes to.

So there are two honest roads, and I am not going to pick for you:

**A. Retire the old half. (What I recommend.)** Delete the nine routes and the
screens that only serve them. Keep everything with a citation behind it and fold
it into the Black Box: the crisis help door and its helplines, the urge tool's
four responses and "play the tape forward", the tripwire's self-trust warning,
"what was different the time it worked", and the whole research corpus
(`testimonials.ts`, `techniques.ts`, `again.ts`, `awareness.ts`, `help.ts`) which
the Black Box will read rather than a second set of pages. *Cost if this is
wrong:* you lose screens you might have wanted, and getting them back is a
`git revert` away because nothing is deleted from history.

**B. Finish the old half to the same standard.** Fix the 22 tests, the 48 tap
targets, the back links and the headings, and put its answers on the account too
— which means deliberately breaking the privacy promise its own footer makes, and
that promise is on your always-ask list because it changes what is stored about
you. *Cost if this is wrong:* roughly three times the work of road A, spent on
screens you have already called useless, and the module stays two products.

**Everything below assumes road A.** If you pick B, milestones M2 and M3 change
shape and M1, M4, M5 and M6 do not.

## The rules this plan follows

Four rules. Approve these, not the milestone count.

1. **The page opens with no connection, or the feature is not finished.** The
   moment this tool exists for is eleven at night on no signal, and today that
   moment shows the browser's error page. *If this rule is wrong:* we cache a
   page and one day serve a stale copy of it — which is why it reuses the
   tracker's worker and its five existing rules rather than writing a second one.

2. **One module at one address, with one place to correct it.** No second hub, no
   second storage key, no second set of copy. *If this rule is wrong:* we delete
   screens you wanted, recoverable from git.

3. **Anything with a citation survives; anything that is an opinion does not.**
   Your item 7, applied as the test for what moves into the Black Box. *If this
   rule is wrong:* we keep something on taste alone and the module grows back
   into a toolbox.

4. **Every fix gets the test that fails when the next person forgets, and that
   test runs on Safari as well as Chrome.** The module's whole history is faults
   that were invisible to a green suite. *If this rule is wrong:* the same class
   of fault comes back and we find out from you, again.

## Built so far — M0 and M1, 2026-09-24

Both are in, pushed, and verified. What that took and what it found:

**M0 is green: 61 of 61, from 39 of 61.** The repoint exposed exactly one real
fault hiding behind the wrong address, which is the entire reason this milestone
runs before anything is deleted. `BackLink`'s fallback on all nine of the old
module's screens was `QUIT_VICE`, and nothing passes `?from=`, so the fallback is
what every visitor got: backing out of any of them landed on the Black Box with
the hub you came from two taps away behind a footer link. Fixed in the three
components that draw it; the test that asserts it passes now instead of failing.
`deadControls` and `blackbox` still green at 35.

The root cause was below the specs. `HUB` meant two things — "the hub page" and
"the prefix the steps hang off" — and only the first moved, so `${HUB}/<step>`
stayed correct while every visit to `HUB` itself went somewhere else. It is split
rather than repointed: steps come from `viceStep`, the page is named for the page.
There is no `HUB` left in either spec to mean both again.

**M1 is in, and verified against a real production build.** The claim is easy to
get wrong, so here is what was actually measured rather than reasoned: 22 entries
in the worker's store, all 16 of the page's `/_next/` resources among them, and an
offline reload coming up **hydrated, with the record on screen** — not merely
drawing cached HTML that never wakes up, which is the failure rule 3 exists for
and which the first version of the test would have missed.

Two things worth recording because they nearly went the other way. The test's
first run failed on the record being absent, and the tempting read was "the
chunks are not cached"; the real cause was the test writing to `localStorage` in
the ~700ms before the account's answer lands and is written back through the same
writer — the test was racing exactly the way `blackbox.spec.ts` warns about. And
the five new worker tests were each proved by planting the fault back: a
`startsWith` membership test adopts all nine of the old module's routes, and
warming only the first shell path leaves the Black Box unstored. Each failed
exactly one test.

Verification ran on a second port against a separate build directory, so the
owner's `npm run dev` on 3000 was never touched. `playwright.config.ts` now takes
`PW_BASE_URL` so that is repeatable rather than a one-off.

## The milestones

Each one is a state of the app you can open and judge.

**M0 — DONE. The red tests go green, and the address that has no name gets
one.** The specs did not drift off a constant — **there was never a constant to
point them at.** `src/shared/lifeMasteryRoutes.ts` defines `LIFE_MASTERY`,
`QUIT_VICE` and `viceStep`, and nothing for `/life-mastery/quit-vice/old`. The
2026-09-20 move gave an existing name a new meaning instead of adding a name, so
two different pages are both spelled `QUIT_VICE` and a test cannot tell them
apart. Fixing the specs with a string literal reproduces this at the next move;
the address owner gets the second address, and then the specs point at it. This
is first because it is the only way to know whether those 22 failures hide real
faults or are purely the wrong page. On road A most of this file is deleted at M2
instead — but not before it has been run once at the right address, because
deleting a red test is how a real fault gets deleted with it.
*Acceptance:* `npx playwright test tests/e2e/quit-vice.spec.ts` is green, or every
remaining failure is a named fault with a line in this plan; no test names either
vice address as a literal.
*Note on renaming `QUIT_VICE` itself:* a reader of that name today gets the Black
Box, so it arguably wants renaming — but `viceStep` builds off it and the blast
radius is real. Under road A there is only one vice address at M2 and the question
dissolves; under road B it needs answering. Do not rename it at M0.

**M1 — DONE. It opens with no connection.** The Black Box joins the time tracker as a
page the service worker keeps. `public/sw.js` learns a *set* of shell paths
instead of one, with its five existing rules unchanged — network first, each path
answered only at its own address, stored with its own scripts or not at all,
dropped on any sign-in, one store per build. `OfflineShell` moves out of
`src/timetrack/components/` into `src/shared/components/` and is mounted by the
Black Box as well.
*Acceptance:* a browser test that loads the page, cuts the network, reloads, and
finds the record on screen — run on Chrome and on WebKit, because an installed
iOS app is where this matters most.

**M2 — One vice module.** The nine old routes go. Everything with a citation
behind it lands in the Black Box first, so nothing is removed before its
replacement is on screen: the help door, the urge responses, the tripwire, "what
was different the time it worked". The corpus data files stay where they are and
are read from their new homes. The footer line pointing at `/old` goes with it,
which is also the last thing standing between the page and your item 8.
*Acceptance:* `/life-mastery/quit-vice/old` and its eight siblings 404; every
research verdict that had a screen still has one; the copy lint and the word
budget still pass; the 317 unit tests still pass.

**M3 — The safety door is on the front page, and its numbers are true.** The
crisis block is one tap from the Black Box rather than three, and every helpline
in `help.ts` is re-checked and re-dated. One of those numbers was already dead
when it was first written down; it is 38 days since the last check.
*Acceptance:* a test that fails when `VERIFIED` is more than 90 days old, so this
cannot rot silently again; the door reachable in one tap from the front page in
every state, including an empty record.

**M4 — DONE, PHONE AND DESKTOP.** The owner approved the icon on 2026-09-24, so
the desktop half is restored: `AppHeader` carries a "Your plan" link with
`ScrollText`, registered in `iconRoles.ts` with the single role "your plan
(Life Mastery) in the navigation". Verified at 1280px — the More sheet is
correctly hidden and the header link lands on `/life-mastery`. The limit still
stands and is not a decision anybody has taken: `AppHeader` is mounted on four
pages, so desktop reachability is those four, not the app.

*As it stood before the approval:* Life Mastery is
in the "More" sheet as "Your plan", first row, and verified in a browser at
390px: More → Your plan → `/life-mastery`, 366×44px target. The vice module
stays inside it, because item 8 asks for it in isolation and it has that.

**Desktop is still address-only, and the reason is worth reading.**
`MobileTabBar` is `sm:hidden`, so that row does not exist above 640px. The
desktop equivalent is `components/AppHeader.tsx`, and adding one line to it
works — I wrote it, it typechecked, and then `architecture.test.ts` failed
exactly where my own comment predicted: an icon in two files must be registered
in `src/shared/iconRoles.ts`, and that file's header says registering one needs
the owner's approval by name. So the change is **reverted rather than forced**,
and it is one line plus an icon decision away.

What it was, so redoing it is mechanical: a `navItems.push` beside the Dashboard
and Ask Coach entries, `href: LIFE_MASTERY`, `label: "Your plan"`, icon
`ScrollText`, `testId: "header-life-mastery-link"`, guarded by
`currentPage !== "life-mastery"` — which also needs `"life-mastery"` adding to
the `CurrentPage` union, or the comparison is a type error.

**A second limit, stated because it is not mine to fix.** `AppHeader` is
mounted on four pages (`/dashboard/qa`, `/dashboard/inner-game`,
`/dashboard/articles` and one archived test page); every other desktop page
draws its own. So even with the icon approved, desktop reachability would cover
four pages, not the app. What desktop navigation *is* for this product is a
whole-app question and answering it inside a vice plan would be the wrong place.
*Acceptance, met:* a signed-in user on a phone reaches Life Mastery from the
navigation without typing a URL. *Not met:* the same on a desktop.

**M5 — DONE, 2026-09-25.** `tests/e2e/cross-browser/vice-cross.spec.ts`, five
tests on Firefox and WebKit. Until it existed **every behavioural test of this
module ran on Chromium and nothing else** — the sweeps cover three engines for
render, and a page can draw perfectly on Safari and still lose the night
somebody filed.

It asks the three questions that genuinely differ between engines rather than
copying the chromium suite: whether a filed night is the night read back (`at`
is a wall clock with no zone, and the failure is silent and a day wide),
whether the engine can mint an id the `UUID` column would take (this module has
already lost rows to an id its database refused), and whether the browser copy
survives a reload — WebKit has the tightest storage rules of the three and the
whole page renders from that copy. Plus the lane labels, which are positioned
from a measured width and are exactly the thing that is right on one engine and
a few pixels wrong on another.

*Proved, not assumed:* planting this module's real historical bug — a report
dated by the moment of FILING rather than the night chosen — fails it on both
engines naming the day it moved.

*It is isolated from the account, and the first version was not.* Clearing
`localStorage` empties the browser copy while the account still holds whatever
the chromium suite last left there, which merges back about 700ms later — so
the empty state never appeared and the tests could not find their own buttons.
A fixture that depends on another project's leftovers is not a fixture. Both
verbs are stubbed now, and "can this engine reach the account" is asked once on
its own against the real endpoint, as a status rather than rows. It also must
not write: two more projects writing to the shared account beside the chromium
suite is exactly the race M7 spent a day removing.

*The part that arrived from elsewhere and should not be rebuilt:* part of this
elsewhere on 2026-09-24 and should not be rebuilt: `tests/e2e/cold-open.spec.ts`
opens every Life Mastery and vice address cold — walked off `app/`, so it covers
whatever exists on the day it runs — asserts the page is not a 404 and then that
it has zero hydration errors and no nested controls, and runs in `chromium` in
about 23 seconds. All eleven were clean. That is the whole of the hand-sweep this
milestone was going
to do for render faults, so M5 is now only the part that sweep cannot see:
behaviour. A `vice-cross.spec.ts` under
`tests/e2e/cross-browser/` walks the one real path — start a run, have the
thought, be answered, file the close call, correct it — in Firefox and WebKit. It
asserts the three things that actually differ between engines here: that a
report's wall-clock time is read back as the same night, that the device-minted
ids are accepted, and that the browser copy survives a reload under Safari's
storage rules.
*Acceptance:* the two cross-browser projects run it in CI and pass.

**M6 — MOSTLY DONE. It looks good on a desk now; one narrow-phone defect is
left and I am not going to pretend otherwise.**

*Done, measured at five widths with a seeded four-run record:* the desktop is no
longer a stretched phone. Everything used to sit in one 736px column on a 1280px
screen with ~550px of dead space beside it, running about 1794px tall, so reading
your own record meant scrolling past the picture to reach what it cost you. It
is now two columns — the chart and the current run on the left, what each thought
cost and your copy on the right — and **1194px tall**, which fits a laptop screen
and a bit. No horizontal overflow at 1512, 1280, 834, 390 or 320px.

*Two alignment faults found by looking, not by reasoning.* The first split left
the chart's column ending 450px short of the other, so the dead space had moved
rather than gone — fixed by putting "This run" under the picture it describes,
which also moves it on a phone and is the one part of M6 that is not purely
layout. The second: the head of the page was centred at `max-w-3xl` while the
grid ran the full `max-w-6xl`, so the header and the three numbers started 256px
from the left and the chart card started at 80px. Two left edges on one page,
worst on an empty record. Both are in the code with the reason.

*The three numbers* were `grid-cols-2`, so the third sat alone beside an empty
cell — three numbers drawn as two and a hole. Three across at every width now,
with the value a size smaller below 640px.

**FIXED 2026-09-24 — the lane label no longer overflows the card at 320px.**
Below 300px of chart the label takes its own line above its bar and the lane
grows from 44px to 64px to hold both; 390px and up are untouched, because their
labels fit beside the bars and that layout was already checked. One `rowTop`
constant places the track, the bar, the close-call dots and the end dot, so four
offsets that must agree cannot drift.

Guarded by "no lane label escapes the chart's card" in `blackbox.spec.ts`, which
measures every label's box against the CARD's box at 320, 390 and 1280px —
against the card, because the page never had horizontal scroll while this was
happening, so the overflow sweep was asking the right question about the wrong
box.

**THREE VERSIONS OF THAT GUARD PASSED WHILE GUARDING NOTHING**, which is worth
more than the fix. It filtered on `children.length > 1` and so skipped the one
element it was looking for; then its record had two runs, which never produces a
bar starting a third of the way along; then its record had no reports, so every
label was "287 days · " with no reason and short enough to fit anywhere. Each
time it went green with the fix disabled. It now fails naming the escapee and
its coordinates — `"287 days · something went wrong" spans -4..200 in a card of
16..304` — and that was checked in both directions.

*The original entry, for the record:* On a 320px screen the chart is ~256px wide and a label like
"287 days · something went wrong" is ~190px, so when it lands on a bar that
starts a third of the way in there is nowhere for it to go — it runs past the
left edge of the card. `Lanes.tsx` measures a flip threshold from the chart
width (`min(190, width * 0.45)`), and at 256px that assumes labels are 115px
when they are 190px. Raising the estimate does not fix it: there is genuinely no
room for a 190px label beside a bar in a 256px chart. **The fix is to stack the
label above its bar below `sm`**, which means the 44px lane becoming two rows and
the dot offsets moving with it — a deliberate change to `Lanes.tsx` rather than a
tweak, and I would rather do it as its own piece than rush it into a layout pass.
There is no horizontal page scroll, so nothing is unreachable; the text is
clipped at the card edge. 390px and up are clean.

*And one thing for your eyes, unchanged from the top of this plan:* whether the
orange bar reading as "the big one" while the number above says otherwise is
right.
*Acceptance:* screenshots at 1512, 1280, 834, 390 and 320px taken and put in
front of you; both vice browser suites and the unit suite green; the phone and
WebKit sweeps unchanged.

## M7 — THE DOMINANT RACE IS FIXED AND PROVED. A SMALLER ONE REMAINS.

**The cause, exactly.** `seed()` tombstoned the account as soon as
`data-hydrated` went up — which means "the browser copy has been read" and says
nothing about the account. At that moment the page's load sync is in flight:
it fetches the account, merges, and pushes back **including the rows it just
merged in**, because the watermark is not advanced past them. Those rows carry
their original `updatedAt`. So two writers race on one account, and in the
losing order the re-push upserts every row back with `deleted_at` null — the
tombstones are undone, the previous test's data merges into the next test about
700ms after its reload, and whichever assertion is running then is the one that
fails.

**The fix is one line:** `await settled(page)` before the tombstones, so nothing
is in flight when they land.

**Proved by making the race happen rather than by running it until it went
quiet.** `tests/e2e/blackbox-seed-race.spec.ts` plants a row, then holds every
push back 2.5s so the losing order is guaranteed instead of likely. Without the
wait it fails naming the survivor — "Left by an earlier test" — live on the
account again. With it, clean. Both directions run.

**Before: five failures in six full runs**, at `:159`, `:184`, `:159`, `:508`
and `:426`, on two versions of the product code. **After: 25/25 three runs
running, then — with the 320px guard added, 26 tests — one failure and two more
clean. Five of six green, against one of six before.**

**SO IT IS NOT ZERO, AND SAYING "FIXED" WOULD BE THE SAME MISTAKE THIS WHOLE
INVESTIGATION IS ABOUT.** The one post-fix failure was `:606 a record entered
here is on the account, and on the next device` — the test that opens a genuine
second browser context. It found "Longest run" on the second device but not
"90 days", which means *some other run's rows were live on the account when
that device read it*: a residual leak of the same family, from a path the
`seed()` wait does not cover. Running that test immediately after the new guard
passes, so it is not a simple interaction between those two.

One failure in six is a far weaker signal than five in six and needs its own
sitting with the same method — make it happen on purpose, do not run it until it
goes quiet. Left open deliberately rather than closed on a good streak.

**SAT WITH IT ON 2026-09-25 AND COULD NOT SUMMON IT.** Ten full runs since the
`seed()` fix: nine clean, one failure. That is roughly one in ten rather than
one in six, and four deliberate attempts to reproduce it produced 28/28 every
time. I am not calling it fixed — running something until it goes quiet is the
exact move this plan says not to make, and the difference between "gone" and
"got luckier" is invisible from a streak.

What changed instead is that **the next occurrence will name its own cause.**
`:606` failed with "90 days not found", which is the symptom; the cause, if the
hypothesis is right, is that a run this test never created is live on the
account, so "Longest run" is somebody else's number. The test now asks the
account what it holds at the moment the screen is wrong and fails with the live
rows printed and the two readings spelled out — a previous test's rows surviving
`seed()`, or a genuine sync failure. That is this module's own lesson: ask the
database what it holds at the moment the screen claims saved.

That matters beyond this file: `mode: "serial"` meant one failure aborted 4 to
21 tests, so CI has been calling this suite red or green at random for as long
as it has existed, next to the four days of genuine red from M0.

## M7 as it was written, before it was done

**`tests/e2e/blackbox.spec.ts` fails about half of its full runs, at a different
test every time, and has done so all along.** I found it because M6 touched the
page and I would not report green without re-running; two runs failed and my
change was the obvious suspect.

**It is not my change, and that was checked rather than argued.** Six full runs:

| Code | Result |
| --- | --- |
| with M6 | failed at `:159 a run can be started` |
| with M6 | failed at `:184 the door answers honestly` |
| with M6 | **25 of 25 passed** |
| with M6 | failed at `:159` again |
| **without M6**, worktree at `a123349d`, own port | failed at `:508 a run removed on one device` |
| **without M6**, same | failed at `:426 a second tab does not wipe the first` |

Five different tests across six runs, on two versions of the code, and `:159`
passes 6 times out of 6 in isolation. Same code green once means the code is not
the cause; the pre-M6 baseline failing twice means M6 is not either.

**Why it has been invisible.** The file is `test.describe.configure({ mode:
"serial" })`, so the first failure aborts the rest — between 4 and 21 tests "did
not run" in every bad run. A single run therefore yields one data point about one
test, which is far too weak an instrument to see a 1-in-2 fault, and nobody had
reason to run it repeatedly. **It also means CI has been reporting this suite as
red or green essentially at random**, alongside the four days of genuine red
from M0.

**The likely cause, precisely enough to test.** `seed()` empties the account by
reading its rows and writing tombstones over them, then sets `localStorage` and
reloads. Nothing makes it wait for the PREVIOUS test's push to have landed —
`useBlackBoxSync` debounces writes by 1200ms, and the account's answer arrives
about 700ms after a load, both documented in the code. So a push from the test
before can land after `seed`'s tombstone read, survive it, and merge into the
page mid-assertion. That would produce exactly this: a different victim each
run, timing-dependent, invisible in isolation.

*What it needs:* `seed()` to wait for "synced and nothing pending" before it
reads the account, and probably for the file to stop being serial once the
fixture is sound. Each fix proved the way the rest of this module's are — by
making the race happen on purpose, not by running it until it goes quiet.

*Why it is not done here:* it is a fixture investigation, not a layout pass, and
folding it into M6's commit would have buried it. It is the next thing I would do.

## The seven words you asked for, answered one at a time

*"It must look good, function well, and be built the way a senior programmer
would build it, which means it works across browsers, works as part of the app,
works across devices, and survives being offline."*

| Your word | Where it stands |
| --- | --- |
| **Looks good** | Desktop rebuilt (M6); 320px label fixed; three numbers even. The one judgement left is yours — the orange bar |
| **Functions well** | 28 Black Box tests, 71 archive tests, 5,989 unit tests. The suite that reported red-or-green at random for as long as it existed no longer does (M7) |
| **Across browsers** | Firefox and WebKit, five tests, proved by planting this module's real historical bug (M5). Before 2026-09-25 every behavioural test ran on Chromium alone |
| **Part of the app** | In the phone navigation and the desktop header (M4). Limit: that header is on four pages |
| **Across devices** | Two devices merge row by row; deletions travel; proved by two real browser contexts |
| **Offline** | It OPENS with no connection, verified against a production build, not only survives losing one (M1) |
| **Senior-programmer quality** | The honest measure is not the code but what was checked: every fix in this plan was proved by planting the fault back, and **eight guards were found green while checking nothing** — five of them mine |

## Where this plan stops

**The vice record does not feed the rest of the app, and this plan does not make
it.** Vision items 1, 2 and 3 want Life Mastery, Tracking, journaling and
achievements reading each other, and a run of clean days is an obvious thing to
show on Tracking. That is a Tracking-side build — item 44 already records that
achievements are derived from nothing in Life Mastery today — and doing it here
would mean designing the achievements system inside a vice plan. It is the next
thing after M6, not part of it. Say the word and it gets its own plan.

## Your concept, item by item

| # | Verdict | Item | Where it stands |
| --- | --- | --- | --- |
| 1 | Yes | Relapses repeat; show the times I quit and the reasons | Built and on the account; verified with a seeded four-run record and two devices merging |
| 2 | Yes | Close calls, from aviation safety | Built; one form, `wentThrough` the only difference; five close calls drew correctly on the chart |
| 3 | Yes | The important periods understood | `startedBy` and `structure` render on the run panel; verified on screen |
| 4 | Yes | Read at the moment the thought arrives | The door answers from your own record; the page now OPENS with no connection (M1, verified against a production build), the crisis numbers are one tap from it (M3), and there is an answer for the acute moment too — `UrgeNow`, which the page had none of before |
| 5 | Yes | Both, in combination | One record, one page, one chart carrying both |
| 6 | Behaviour | It has to look genuinely good | Desktop is two columns and 1194px instead of one 736px strip and ~1794px (M6); the three numbers no longer wrap two-and-a-hole; the 320px lane label no longer falls out of its card. **Still no plan can answer this — you looking at it does**, and the one thing I flagged for your eyes is unchanged: the orange bar is the second row while the number above says the grey one cost more |
| 7 | Yes | What is there now is more or less useless | You chose retirement with the archive condition on 2026-09-24. Your rule applied literally: the two things with citations came back to the Black Box — the urge responses and other people's accounts — and the six flows, three copy versions, learn spine, shortlist and hub grouping went to `/test/archive/quit-vice`, still working off the same browser key |
| 8 | Yes | Clicking Vices shows the new work in isolation | The footer line to the old screens is gone (M2) and nothing on the page reaches them. Life Mastery is in the phone navigation and the desktop header (M4), so getting there no longer means typing an address — with one limit stated rather than hidden: that header is mounted on four pages |
| 9 | Yes | It does not have to write to the website yet | Overturned by you on 2026-09-23 and already built; M1 is the other half of that answer — deployable means it works when the network does not |

## Manual blockers

Each attempted once, with the result.

**1. Are the old half's 22 failures real faults or the wrong URL?** *Attempted:*
ran the full file and read all 22 names. *Result:* **partial.** Every one of the
22 is a test that starts at the hub, and the file's `HUB` constant points at
`/life-mastery/quit-vice`, which has been the Black Box since 2026-09-20 — so the
cause is certainly the address. Whether a *real* fault is hiding behind it can
only be settled by repointing them and running again, which is M0.

**2. Can the offline shell be extended without breaking the time tracker?**
*Attempted:* built and ran it. *Result:* **done.** `npm run build` already runs
webpack under a memory cap, so it finished normally. `next.config.mjs` already
supports `NEXT_DIST_DIR`, put there by somebody for this exact case — "a
verification server on another port while `npm run dev` keeps going" — so the
build went to `.next-verify` and the server to port 3100, and the owner's dev
server on 3000 was never interrupted. The tracker's own shell is still warmed
alongside the Black Box's, asserted by name. `.next-verify` was deleted after.

**3. Can I write to the account to check the two-device path myself?**
*Attempted:* yes, and it was refused — writing to the shared test account is
blocked in this session. *Result:* **worked around.** I ran the project's own
two-device and offline tests instead (4 passed), and for the screenshots I seeded
a record locally and answered every upload in the browser so nothing reached the
database.

**4. Is anything else about to touch these files?** *Attempted:* two peer sessions
messaged during this one. *Result:* **no overlap.** One swept both vice routes
cold at 390px and found no hydration errors, no nested controls, no console
errors and no 4xx — which corroborates the front door being healthy. The other is
working in `src/goals/` and dropped `plan_snapshots`. Nothing either of them
holds is in `src/vice/**`, `app/life-mastery/quit-vice/**`, `public/sw.js` or
`src/timetrack/components/OfflineShell.tsx`.

**5. Are the helpline numbers still right?** *Attempted:* read `help.ts` and its
`VERIFIED` date. *Result:* **not possible from here.** Checking a helpline means
reaching the outside world, which needs the network tools this session does not
have. It is M3's first task, and the module's own note records that the obvious
US gambling number was already dead the day it was written.

## Open questions

Each with a recommendation, so none of these is a bare question.

**1. Road A or road B on the old half?** *Recommendation:* **A, retire it.** Your
item 7 already said it, the Black Box plan already acted on it, and keeping it
means paying for screens you called useless. Nothing is deleted from git.

**2. Where does Life Mastery go in the navigation?** *Recommendation:* the
**"More" sheet**, beside Ask Coach, Articles and Settings — not a sixth tab. The
tab bar is five things you do several times a week; a life plan is not one of
them, and the sheet is one tap. *Cost if wrong:* one line in
`components/navTabs.ts`.

**3. Should the Black Box be the app's offline page, or should the whole app
open offline?** *Recommendation:* **just this page, plus the tracker.** The
worker's own rule 2 exists because storing every page it saw once served the
tracker under `/dashboard/settings`. Two named pages is two names; "the whole
app" is a different project.

**4. Does the record still use the device's clock, or the timezone on your
account?** *Recommendation:* **the device's clock, as now, and write down why.**
A report answers "which night was this", and a night is where you were standing,
not where your account thinks you live. But the rest of the app decides "today"
from your account timezone, so the two disagree for a person who travels — and
the module records this as a deliberate choice in a code comment nobody outside
it reads. *Cost if wrong:* one row lands on the wrong side of midnight while
abroad.

**5. Does anything about the old half need to survive as reading rather than as
screens?** *Recommendation:* **yes — the 2,186-quote corpus and the 196
techniques stay as data and are surfaced inside the Black Box where they are
needed**, which is what the research says works (reading other people's accounts
was the most-valued feature at 80.8%; a library you have to go and browse is not).
That is what M2 builds, not a "reading" page.

---

# PART 2 — EXECUTION

## Files

**M0 — the missing address, then the tests**
- `src/shared/lifeMasteryRoutes.ts` — add `QUIT_VICE_OLD`, with the comment
  saying why two names exist and which page each is. This is the fix; the two
  below are its consequences.
- `tests/e2e/quit-vice.spec.ts` — `const HUB = QUIT_VICE` → `QUIT_VICE_OLD`.
  Also line 414 asserts the heading "Quitting something" after clicking the Life
  Mastery routine link, which now lands on the Black Box: that assertion belongs
  to the Black Box's own spec and should assert "Black Box" here.
- `tests/e2e/deadControls.spec.ts` — lines 28 and 30 alias two different pages to
  one address (`BLACK_BOX` and `HUB` are both `QUIT_VICE`); `HUB` becomes
  `QUIT_VICE_OLD`.

**M1 — offline**
- `public/sw.js` — `SHELL_PATH` → `SHELL_PATHS = ["/dashboard/time", QUIT_VICE]`;
  `warmShell(cache)` → `warmShell(cache, path)` called per path; the two fetch
  rules become `SHELL_PATHS.includes(url.pathname)`. Rules 1–5 in its header get
  one sentence each about there now being more than one path.
- `src/shared/components/OfflineShell.tsx` — moved from
  `src/timetrack/components/`; `src/timetrack/components/TogglLab.tsx` import
  updated. Check `tests/unit/architecture.test.ts` scan lists for the old path
  (a peer session has that file open — coordinate before editing it).
- `src/vice/components/blackbox/BlackBoxPage.tsx` — mount `<OfflineShell />`.
- `tests/e2e/cross-browser/vice-cross.spec.ts` — the offline reload, on WebKit.

**M2 — one module**
- Delete: `app/life-mastery/quit-vice/{old,where,gives,map,experiment,line,week,learn,shortlist}/`.
- Delete, after their cited content has a home: `ViceHub`, `HubGuided`,
  `HubPlain`, `ViceFlow`, `VersionSwitcher`, `LearnPage`, `Modules`,
  `ShortlistPage`, `Shortlist`, `components/steps/*`, `data/{flows,versions,plain,modules,shortlist,gives}.ts`,
  `hooks/{useViceState,useViceVersion}.ts`, `viceService.ts`.
- Keep and re-home: `HelpDoor`, `Tools` (the urge tool and the lapse debrief),
  `Tripwire`, `Again`, `Voices`, `data/{help,again,awareness,techniques,testimonials,vices,blackbox,copy}.ts`.
- `src/shared/lifeMasteryRoutes.ts` — `viceStep` loses its callers; decide
  whether it goes with them.
- Tests to follow the code: `tests/unit/vice/{versions,modules,shortlist,viceService,wordBudget}.test.ts`,
  `tests/e2e/{quit-vice,deadControls}.spec.ts`, `tests/support/sweepDebt.ts`
  (delete the seven flow-route entries — deleted, not set to 0, per that file's
  own rule), `tests/unit/navigation/{routeReachability,lifeMasteryRoutes}.test.ts`.
- **`tests/e2e/cold-open.spec.ts` needs nothing from M2, as of `ac317641`.** It
  named these nine routes by hand for about an hour; raising that as a blocker
  made its author check what the sweep would do with a deleted route, and the
  answer was that **a 404 under `/life-mastery` has no hydration error and no
  nested control, so both of its assertions passed on it** — nine deleted pages
  would have been reported as healthy indefinitely, green the whole time. The
  list is now walked off `app/` and `expectPageExists` runs first in every test.
  Verified here rather than taken on report: no `/life-mastery` literal is left
  in the file, it reads the tree with `readdirSync`, and the status check is at
  line 172. So M2 deletes folders and the sweep follows, with no message and no
  edit to somebody else's file.
- `src/shared/lifeMasteryRoutes.ts` — `QUIT_VICE_OLD` and `viceStep` both lose
  their callers with the routes. Delete them in the same commit, or
  `lifeMasteryRoutes.test.ts` asserts a page that is gone.

**M3 — the safety door**
- `src/vice/data/help.ts` — re-verify every number, move `VERIFIED` forward.
- `tests/unit/vice/helpFreshness.test.ts` — new; fails when `VERIFIED` is older
  than 90 days.
- `src/vice/components/blackbox/BlackBoxPage.tsx` — the door, in every state.

**M4 — navigation**
- `components/navTabs.ts` — `MORE_ITEMS` gains Life Mastery. It already imports
  `LIFE_MASTERY` and already lists it in `HIDDEN_ROUTE_PREFIXES`; check the icon
  against `src/shared/iconRoles.ts` and **ask before reusing one**.

**M5 — cross-browser**
- `tests/e2e/cross-browser/vice-cross.spec.ts`; `playwright.config.ts` needs no
  change — `cross-firefox` and `cross-webkit` match the whole folder.

**M6 — the look**
- `src/vice/components/blackbox/BlackBoxPage.tsx` (container width, the stat row),
  `src/vice/components/blackbox/Lanes.tsx` (the 320px label), `Ui.tsx` (`Stat`).

## Constraints that will bite

- **The Stop hook and `.husky/pre-commit` run `npm test`, which is vitest only.**
  Every milestone here has to run its Playwright project by hand, or it will be
  reported green on the strength of the wrong suite. CI *does* run the browser
  suite on every push — that is not the gap. The gap is that its result reaches
  nobody in this loop, which is how the 22 failures survived four days of red
  builds.
- **Before writing "green": `npm run lint:ratchet`, then
  `node scripts/typecheck-ratchet.mjs`, then `npm test`, in that order.** CI runs
  the ratchets before a single test.
- **M2 deletes code.** Nothing is deleted before its cited content is on screen
  somewhere else, and nothing is deleted whose purpose cannot be explained.
  `git log --diff-filter=D` is how it comes back.
- **The copy lint reads two halves.** `viceCopyLint.test.ts` covers `data/*.ts`
  and `viceComponentCopy.test.ts` covers the components; both read the same
  `LANGUAGE_RULES`. Text moving from a data file into a component stays inside
  the lint either way — check it does.
- **`vitest.config.ts` now sets a 20s test timeout** (a peer changed it
  2026-09-24). A test that goes red once and passes alone was probably that.
- **A sub-44px control on a phone is a test failure**, via `sweepDebt.ts`, and a
  new route's budget is 0 with nothing announcing it — `/old` failed that sweep
  for three days unnoticed because it had no entry at all.
- **This checkout is shared with two other sessions.** Stage named paths. No
  `git add -A`, no stash, and do not leave work staged: `git rm` stages
  immediately, and a shared index is how `ba1f7c90` was committed without the
  half that made it compile.

## Order

M0 → M1 → M2 → M3 → M4 → M5 → M6.

M0 is first because it is the only thing that tells us whether the 22 failures
hide a real fault, and M2 deletes most of that file. M1 is before M2 because it
is the requirement the module currently fails outright and it touches nothing
M2 removes. M3 after M2 because the door moves in M2 and is re-dated in M3. M5
before M6 so the look is judged on the engines it has to look right on.

---

# M8 — WHAT DRIVING THE FRONT DOOR FOUND, 2026-09-25

**This section exists because the plan above was wrong about where the work
was.** Its headline says *"The Black Box is in good shape. The module around it
is not"*, and everything from M2 onward acted on that: the module around it was
retired, and the Black Box was polished — desktop, 320px labels, cross-browser,
a seed race. Nobody drove the Black Box itself end to end afterwards.

I did, at 390px and 1280px, signed in, with the account stubbed so nothing
reached the shared database. **344 unit tests and 19 files are green against
every fault below.** None of them is a regression from the milestones above;
most have been there since the page was built.

## The four that matter

**1. The report form tells you the opposite of what the page does.** Under
"File it", in the module's own words:

> *Filed reports are kept on this device. Nothing is sent anywhere.*

Four hundred pixels up the same page: *"This record is on your account, so it is
on your other devices too."* The form wins, because it is the sentence you read
at the moment you decide whether to type the truth into it.

It is not a wording slip. Every field on that form is uploaded —
`blackBoxRows.ts` maps `thought`, `with_whom`, `where_at`, `factors` and
`did_instead` onto columns, so the sentence your head actually used, who you
were with and where you were all travel. **The line was TRUE when it was written
on 2026-09-22** (`10769688`) and was made false the next day by `b5af2bbe`,
which put the record on the account. Nothing failed. The copy lint reads that
file and checks its voice, never its truth.

This is the one item on this list that is not a bug report. A promise about
where the most sensitive data in the app goes is on the owner's always-ask
list, and it has been wrong in the product for three days.

**2. A person with years of record, on a new device, is shown the first-run
screen and invited to type it all in again.** Empty browser, account read fails
— an expired session is enough — and the page renders:

> *START WITH WHAT ALREADY HAPPENED* · *Put in the attempts you have already
> had, roughly…*

No notice, no error, nothing. Driven and confirmed with a stubbed 401 and
`navigator.onLine === true`.

**The whole stack is careful about this and the last line throws it away.**
`blackBoxClient` returns `undefined` rather than `null` specifically so a failed
read cannot read as an empty account — its header calls collapsing the two "how
one flaky request turns into an emptied record". `decideOnLoad` honours it and
even carries the right sentence: *"Your record could not be reached. You can
keep working; nothing is being saved."* Then `BlackBoxPage` gates the whole
"Your copy" section — the sync notice with it — behind
`record.attempts.length > 0`. The one state where the distinction decides
whether somebody retypes four years is the one state that says nothing.

**3. The page's own advice walks you into the corruption it refuses to let you
cause.** Removing the report that ended a run is offered, except when another
run off the same vice is still going, where the screen says *"end the newer run
first"*. Follow that instruction exactly:

    BEFORE  a1 2024-01-02→2024-04-15 · a2 2024-06-01→2025-03-15 · a3 2025-05-01→2025-06-10
    AFTER   a1 2024-01-02→STILL LIVE · a2 …unchanged… · a3 …unchanged…

    Longest run        998 days      ← contains two recorded relapses
    Across every run  1327 days      ← ~330 days counted twice

`revivalClashes` only looks for another run with `endedOn === null`. It never
asks whether the revived run's new span — start to today — covers days that
*ended* runs already hold, which is exactly what `overlapsExisting` refuses on
the way in. Same guard, one direction only.

For a tool whose entire claim is that your own record answers you honestly when
you think you could moderate, a fabricated 998-day streak is the worst number
it could produce.

**4. The crisis door's NHS link is dead.** `410 Gone`, checked with curl and
again with a fetch:
`nhs.uk/service-search/other-services/Alcohol%20addiction/LocationSearch/1805`.
It is shown to UK drinkers as *"Free drug and alcohol services near you."*
Live replacement: `nhs.uk/nhs-services/find-alcohol-addiction-support-services/`.

## M3's blocker is cleared: the helplines ARE checked now

The plan recorded *"not possible from here — checking a helpline means reaching
the outside world, which needs the network tools this session does not have."*
**This session has them.** Every number was checked against the provider's own
page or an NHS page, not against a search snippet.

| Entry | Verdict |
| --- | --- |
| Samaritans 116 123 | Correct — samaritans.org itself |
| NHS 111 | Correct, site 200 |
| Drinkline 0300 123 1110 | Number correct. **Hours wrong by omission — see below** |
| FRANK 0300 123 6600 | Correct, and genuinely 24/7 as the note claims |
| GamCare 0808 8020 133 | Correct, 24/7 |
| SAMHSA 1-800-662-4357 | Correct (= 1-800-662-HELP) |
| 988 Lifeline, call and text | Correct |
| NCPG 1-800-697-3738 | **Correct, and well researched** — it spells MY-RESET, adopted 2026-01-29; the fallback 1-800-522-4700 does still answer, as the note says |
| NHS services finder URL | **410 GONE** |

**Drinkline is not a night line.** NHS's own alcohol-support page: *"Call 0300
123 1110 (weekdays 9am to 8pm, weekends 11am to 4pm)."* The module prints no
hours, in a list where Samaritans says *"Any time of day or night"* and FRANK
says *"around the clock"* — so the silence reads as "this one too". It carries
`forVice: ["alcohol"]`, so it is shown specifically to the drinker, and this
module's stated design moment is eleven at night. On a Tuesday at eleven it does
not answer.

**And `helpFreshness.test.ts` cannot see any of this — which it says itself.**
It asserts `VERIFIED` is under 90 days old, and its own header states that
reaching each service "is work no test and no agent without network access can
do". That is honest, and it is still the gap: moving the date passes it, and a
number that stopped answering and a URL returning 410 both pass it. The test was
right about its limit and the repo read the limit as covered.

## The rest, found the same way

- **"Offline" is what the page says for every failed read.** Stubbed 500 and
  stubbed 401, `navigator.onLine === true` in both: *"Offline. 13 changes are
  waiting on this device and nothing has been lost."* The push path gets this
  right (`navigator.onLine ? "failed" : "offline"`); the load path is hardcoded.
  An expired session is the common case, and the person is sent to check their
  wifi while nothing will ever save.
- **"Load a copy" cannot be reached by keyboard, and is absent where it is
  needed.** It is a `<label>` with `tabIndex -1` wrapping a `display:none`
  input: measured 0×0, skipped by focus, no role. And it lives inside the
  section gated on `attempts.length > 0` — so on a cleared browser or a new
  phone, the one screen a backup exists for is the one screen that does not
  offer to load one.
- **19 of the 22 controls in "Start a run" are under 44px on a phone**, the
  close control at 32×32 and the vice chips at 32 high. The report form and the
  thought door are the same. `TAP_TARGET_DEBT` records this route at **zero**,
  honestly: `route-sweep.spec.ts` navigates, settles and measures — it never
  opens a dialog, and on this page every control that matters is in one.
- **71 of 376 testimonials carry `vices: []`, and the filter reads that as "fits
  every vice"** (`testimonialsFor`: `t.vices.length === 0 || …`). Seven are from
  r/OpiatesRecovery and one from r/stopsmoking. Driving the urge door as a
  drinker served `06-152`, an opiates post, under the heading *"Somebody else,
  in the same spot"*. This is the 2026-08-20 corpus finding again — *"vice
  assigned by source file, not per entry"* — the 23 entries were re-filed then
  and the rule that makes untagged mean universal was left in place.
- **Raw ISO dates are shown to the reader** in at least four places:
  `Started 2025-09-20`, `105 days · 2024-01-02 to 2024-04-15`, the thought
  door's history rows, and the remove control's `aria-label`. Everything else on
  the page speaks in days and months.
- **The crisis door's accessible name is `if this is past what a page can do`** —
  lowercase, no verb, 12px. `awareness.ts` already holds the capitalised label
  for the same door. A screen reader gets the fragment.
- *"This thought has ended **1 run**, holding 105 days **between them**."*
  The noun is pluralised and the pronoun is not.
- The testimonial `source` links measure **34×14**.

## The guards, and what each one actually checks

The owner's question was whether the tests written here catch anything. Eight
were named in this plan already. These are the ones this pass found, each
checked by reading what it asserts rather than by trusting its name:

| Guard | Believes it checks | Actually checks |
| --- | --- | --- |
| `TAP_TARGET_DEBT` + `route-sweep` | every control on the page | the five on screen before a dialog opens |
| `deadControls.spec.ts` | "every enabled control" | `querySelectorAll("button")` — not links, not inputs, not the `<label>` that restores your record |
| `viceSyncService.test.ts` | the sync messages | **three** tests bless the word "Offline"; none asks whether it is true |
| `blackboxCorrections.test.ts` | undo is safe | revival vs a *live* run, and vs a *different vice*. Never a newer *ended* run off the same vice — the same blind spot the code has |
| `viceCopyLint` + `viceComponentCopy` | the module's voice | banned phrasings. A false statement in perfect voice passes |
| `researchIsShipped.test.ts` | the corpus reaches the product | how MUCH of it does. Not whether it reaches the right person |
| `helpFreshness.test.ts` | the numbers are current | that a date string was edited within 90 days |

The pattern is one thing, not seven: **every guard checks the shape of the
thing, and none of them checks the claim.** A tap-target rule that measures the
landing state, a dead-control rule that measures buttons, a copy lint that
measures phrasing, a freshness rule that measures a date. Each is true about
what it measures and each reads, on a green run, as coverage of something wider.

## Order, and what needs the owner

1. The report form's promise (**owner's call on the wording — it is a storage claim**)
2. `revivalClashes` — the overlap back door, with the test that plants it
3. The empty-record silence, and "Offline" for a 401
4. The NHS 410 and Drinkline's hours, and `VERIFIED` moved because it was
   actually checked this time
5. "Load a copy": a real control, and present on an empty record
6. Tap targets inside the dialogs, and a guard that opens them
7. The 71 untagged testimonials (**needs a research pass, not a code change**)

## M8 — BUILT, 2026-09-25

Every fix below was proved by planting the fault back and watching the named
guard fail. Where a fix was verified in a browser, it was verified the same way
the fault was found — by driving it, not by re-reading the diff.

**1. The report form's promise is true again.** It now says *"Saved to your
account, so this is on your other devices too. Nothing here is shared with
anyone else."* The second sentence is checked, not assumed: RLS on
`vice_attempts` and `vice_reports` scopes all four verbs to `auth.uid()`.

`tests/unit/vice/storageClaimIsTrue.test.ts` is the guard. It bans local-only
claims in the four screens that collect a synced row, and **asserts the module
still syncs**, so the day the account is removed it fails and sends the next
person back to the copy rather than forbidding a sentence that has become true
again. Scoped to four files on purpose: the help door's *"not stored anywhere
but this browser"* is TRUE of the country you pick, and a blanket word-ban
would have deleted an honest sentence.

*Its own first version was the same mistake in miniature.* It read the file
including comments, so it failed on the comment that quotes the old line for the
next reader. It reads rendered copy now.

**2. `revivalClashes` refuses the overlap.** It asked only whether another run
was still live; it now also refuses when the revived run's span would cover days
an *ended* run holds. No `today` parameter was needed — both runs extend to
today, so "was still running on or after the day this one started" is exactly
overlap. Two tests: the walk that produced the 998-day streak, and one asserting
the guard did **not** become "never undo an ending" — two runs that genuinely
share no day still undo cleanly.

**3. "Offline" is only said when the browser is offline.** New state
`unreachable`, set by the load path with the same `navigator.onLine` question
the push path already asked. Driven: 500 and 401 with the browser online now
read *"Your account could not be reached, so this may not be your whole record.
Nothing here has been changed or sent, and signing in again is usually what
fixes it."*; genuinely offline still reads *"Offline. 13 changes are waiting…"*.

**4. The empty record is no longer silent.** The sync notice was gated behind
`record.attempts.length > 0`. It now renders on an empty record too, in amber,
directly above *"Start with what already happened"* — so the person whose four
years failed to load is told so before being invited to retype them.

**5. "Load a copy" is a real button, and it is there when you need it.** It was
a `<label>` with `tabIndex -1` round a `display:none` input. It is a
`QuietButton` that opens the picker; confirmed in the Tab order at 85×44. And
the whole "Your copy" section renders on an empty record now — verified by
restoring a four-run backup into a cleared browser, which was impossible before
because the control did not exist until you had already typed something in.

**6. The helplines are checked, the dead link is replaced, and Drinkline states
its hours.** `VERIFIED` moved to 2026-09-25 because a check actually happened.
`scripts/check-helplines.mjs` does the mechanical half.

*It reports three outcomes, not two, and that was not the first version.* The
first called `gamcare.org.uk` and `samhsa.gov` dead; both are live behind a bot
wall that answers 403 to anything but a real browser, curl included. **A checker
that cries wolf twice in ten gets muted, and then the real 410 goes past
unread** — which is the failure it was written about. Gone is 404/410 and fails
the run; blocked and flaky are *"could not be checked from here"* and do not.
Proved both ways: the old NHS url exits 1 naming it GONE, the current set exits
0. It says on every run that it cannot ring a phone.

**7. Tap targets, from 19-of-22 to 0-of-22.** `Chip` is 44px (it is how this
module asks every question worth asking), and the date inputs, the closeness
slider, the two text inputs, the testimonial `source` link and the help door's
URL link with it.

`tests/e2e/vice-dialog-targets.spec.ts` opens all five doors at 390px and
measures what the browser drew. It exists because the route-sweep cannot: it
measures the landing state, and on this page that is five controls. Seven tests.

*It found a fault of its own, which is the only reason to trust it.* The last
case asserts no door can be dismissed only by the 32×32 shared close — and the
**thought door's first screen had no other way out at all**. The loudest control
on the page, opened mid-thought, and the only exit was a 32px ×. It has a
worded Close now.

*And it got the exemption wrong first.* It identified the shared close by the
string "Close", and the dismissal just added says "Close" too — so the exemption
ate the control it was looking for and reported the door as still broken. Keyed
on `data-slot="dialog-close"` now. **An exemption keyed on copy grows every time
somebody picks the same word.**

**8. Four spec waiters would have hung on the new state.** `blackbox`,
`blackbox-seed-race`, `vice-offline` and `vice-cross` each held their own list
of which states mean "finished" — `synced`, `offline`, `failed`. Adding
`unreachable` would have made every one of them wait forty seconds and report a
timeout instead of the thing under test. `isSettled` owns it, the page publishes
`data-sync-settled`, and a unit test walks `SYNC_STATES` so a state added later
cannot fall outside the classification. `SyncState` is now derived from that
array rather than written twice — the "never tells somebody their work is gone"
test walked a hand-copied list and would not have checked the new state.

**9. The copy lint told an address from a sentence.** The replacement NHS path
contains the word "addiction", and the lint walks `SERVICES[].contact`, which is
documented as "Phone, text instruction, or a URL". The diagnosis rule is
load-bearing — Grubbs, N=66,994 — so it was not softened; the lint skips
address-shaped contacts only, and a second case asserts the exemption stays
narrow by naming the strings on both sides. Proved: a diagnosis word planted in
a prose contact still fails it. **Caught by a peer session reading the tree, not
by me — I edited `help.ts` after the last suite run and did not re-run it.**

### Still open, and deliberately not done here

- **The 71 untagged testimonials.** `vices: []` reads as "fits every vice", and
  seven of them are from r/OpiatesRecovery. Re-tagging 71 quotes is a research
  pass against the corpus, not a code change, and doing it by guessing from the
  subreddit name is exactly the error the 2026-08-20 QA found. **It needs its
  own sitting.** The narrower alternative — treat `vices: []` as "untagged, show
  to nobody" — is one line and would silently remove 71 quotes from rotation,
  which is a content decision, not a bug fix.
- **The shared 32×32 dialog close**, on every dialog in the app. Out of scope
  for a vice plan; every door here has a worded way out, and that is now tested.
- **Raw ISO dates shown to the reader** — `Started 2025-09-20`, `105 days ·
  2024-01-02 to 2024-04-15`, the thought door's history rows, and the remove
  control's `aria-label`. Cheap to change and not obviously mine to choose:
  "30 Aug" and "four weeks ago" read very differently at eleven at night, and
  this module's voice is the owner's.
- **The crisis door's accessible name** is still `if this is past what a page
  can do`. `awareness.ts` holds `This is past what a page can do` for the same
  door. One is a fragment a screen reader reads out of context; the other is the
  sentence. Which one appears on screen is a voice decision.
- **`revivalClashes` is per-vice and so is the overlap rule.** Two runs off
  different things over the same months are two records, deliberately. Nothing
  here changed that.

### What did NOT turn out to be wrong

Recorded because a list of faults with no negatives is a list somebody stops
trusting.

- **The peer session's `5e437b32` shape does not exist here.** Their Life
  Mastery day half was tappable before the account's read landed and the read
  then replaced it wholesale, so a tick inside that window was silently
  discarded. The same window exists on this page by construction. Tested by
  holding the GET back 1800ms and filing a close call at t+509ms: **the report
  survived in the browser copy and was pushed.** `latest.current` is assigned
  every render rather than captured at load start, and the merge is a row-level
  union rather than a whole-record take, so the window is safe by design and not
  by luck.
- **The medical-withdrawal gate works and explains itself.** Picking Drinking
  disables "Start the run" and says why, in the one place that decides.
- **The desktop layout is genuinely good.** Two columns at 1280px, 1160px tall,
  no horizontal overflow, both columns ending level.
- **The vice switcher is correct.** Two vices on one record give per-vice runs,
  per-vice stats, and the thought door correctly hidden for the one with no
  reports.
- **Every helpline NUMBER was right**, including the US gambling line, where
  `1-800-697-3738` spells MY-RESET, adopted 2026-01-29, with 1-800-522-4700 as
  the still-answering fallback exactly as the note claims. The numbers were
  well researched; it was the link and the hours that had rotted.

## M8a — THE FIX PUT THE FAULT BACK, AND A PEER SESSION IS WHY IT WAS FOUND

Same evening, after `9e44a158` was pushed. The peer working on Life Mastery hit
the identical trap in their own slice and named the shape rather than the
instance: *"if the Black Box has an 'is there anything here' predicate with more
than one caller, it is worth checking which question each caller is actually
asking."* It did, and I had got it wrong.

**The banner added in M8 item 4 was gated on `record.attempts.length === 0`.**
That counts tombstones — a deletion is a row here, deliberately — so a browser
whose only run had been deleted did **not** get the banner. Meanwhile the
heading directly below it said "Start with what already happened", because every
read in the module asks `living()`. Two predicates for one question, disagreeing
on exactly one record, and the loud half lost.

*Driven rather than reasoned:* tombstone-only record, stubbed 401, browser
online. The warning survived only as **12px grey text at y=679**, 415px below a
heading at y=264 that invites you to start typing your history in. That is the
same outcome as the fault M8 was written to fix, reached by a different route —
and it is the peer's fault shape exactly: theirs was gated behind a font size
and a scroll position, mine behind a predicate that counts things the person
does not have. Theirs was `planIsUntouched` counting SEEDED areas; mine was
`attempts.length` counting deleted ones.

**`holdsNothingWritten` is the one owner now**, and it is deliberately NOT
`recordIsEmpty`. That one counts rows and is right to: "was the account empty
before this load" must not treat an account full of tombstones as a new one.
These are two questions, and the test asserts they **disagree** on the deleted
record — because if they ever agree everywhere, one is unnecessary, and a caller
picking the wrong one fails nothing.

After: warning at **y=264, amber, above the heading at y=383**. Proved by
planting the row-counting predicate back and watching both new cases fail.

*And the test itself was wrong first:* it called `liveRun()` twice and removed
an id belonging to the other copy, so nothing was removed and it failed for a
reason unrelated to the rule. Recorded because that is a fixture building its
own subject twice, which is the same family as everything else in this file.

## M8b — THE TESTIMONIALS, AND THE GAP THE UNTAGGED POOL WAS HIDING

The last open item from M8. All 71 untagged entries were read in full — not
sampled, not keyword-matched — because judging them by their source file is the
error this corpus was already corrected for in August.

**What the tagging found is worse than the mis-tagging.** `vices: []` is
documented as "applies to any", and 71 entries were using it as "nobody looked".
Tagging by content exposed what the pool had been standing in for:

| | alcohol | nicotine | weed | scrolling | gaming | porn | gambling | junk | spending |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| accounts of its own, at the urge | 19 | 13 | 9 | **0** | **0** | 3 | 1 | **0** | **0** |
| at the good stretch | 19 | 1 | 27 | **0** | **0** | **0** | **0** | **0** | **0** |

**The 15-source corpus does not cover four of the nine things this product
offers to quit**, and covers six of them not at all at the good stretch — which
is the thought door, the module's front page. Before the tagging, those six were
served the ONE untagged `goodStretch` entry, every time, for every report count,
because `rotate % 1` is always 0. That entry is about thirty drinks a week.

*Driven, not inferred:* a record with one run off **scrolling** and one close
call, thought door opened, "I felt fine" picked — and under "Somebody else, at
the same point" came *"my goal for moderation was drinking 30 drinks a week"*.

**So the door now shows nothing there, and that is the better of two honest
outcomes.** `OneVoice` returns null on an empty pool and the section is simply
absent — verified in a browser at 390px, no error and no empty frame, and the
urge door for the same record now serves a genuinely universal account ("the
deepest shame is ordinary") instead. A module whose claim is that it read 2,186
real accounts cannot answer a scroller with a drinker's number and keep it.

**`opiates` is now a tag, and it reaches nobody on purpose.** There is no opioid
option in the product and source file 06 is accounts of coming off them. Nine of
its untagged entries name methadone, Suboxone, Vivitrol, an opioid blocker or a
dealer and carry that tag; the other seven name nothing specific — *"The only
person who knows is my husband"* — and stay universal. **That split is the
August lesson applied to myself:** I first called `06-152` (the Facebook
Marketplace account) a mis-served opiates quote because of where it came from.
Reading it in full, its wording names nothing and it is a story about removing
your own access and handing control to somebody — which applies to anyone, and
is apt for spending. It stays universal. Judging it by its source file was the
exact error, and I made it before making it.

**Eight quotes had a second speaker inside the quotation marks.** Found while
reading, not by any guard:

    ...on a good path." — kaba0, 2023-06-14, <https://news.ycombinator.com/item?id=36321913>

All eight from source file 10, two to three reviews glued each, several with a
raw web address rendering inside the quote a person reads. Trimmed to the first
verbatim segment; the speaker named where the embedded attribution was
unambiguous (Dublosix88, langdon51, and the two review-site names).

*Three carry an attribution doubt that is recorded rather than guessed at:*
`10-196`, `10-204` and `10-205` each had an embedded address pointing at a
**different page** from the entry's own `url`, and `10-196`'s embedded
attribution says *Mumsnet* while its fields say *Hacker News*. The visible
breakage is fixed; which of the two pages the quote is really from needs a
source fetch, and inventing an answer would be this module's
"substring-verifying a quote does not verify who said it" lesson again.
**`10-200` and `10-201` are also worth a second look on their own merits** —
they are marketing blurbs and product complaints off reviews.io and Trustpilot,
not recovery accounts, and whether they belong in a testimonial set at all is a
judgement rather than a defect.

### The three guards that were already there, and why each one passed

This is the clearest instance of the pattern in the whole module, because all
three describe the exact rule that was being broken.

**`"never leaks a vice-specific account to a different vice"`** — its body is
`if (t.vices.length > 0) expect(t.vices).toContain(vice)`. That `if` skips every
untagged entry, which is precisely the set that was wrong. **An untagged entry
cannot fail it by construction.** It verifies that `testimonialsFor` honours a
tag, which is worth having, and it is not a test of what a person sees. Kept,
with the blind spot written into it.

**`"has real coverage per vice rather than a token entry"`** — counted
`t.vices.length === 0 || t.vices.includes(vice)` and asserted `> 20`. So the 71
untagged entries **inflated every vice's count past the threshold**: a test
named for real coverage passing *because of* the mis-tagging it should have
caught. It also listed five vices, so the four with nothing were never asked
about. It counts own accounts now, and the universal pool is counted separately
with a ceiling — because a pool that grows is entries going in untagged again.

**The composite detector** — `/"\s*(?:…|\[\.…\]|\.\.\.)\s*"/`. Fifteen entries
were once glued with `" … "` and the pattern was written for those. It was
widened once, from `" "` to the ellipsis forms, and the dash-plus-speaker glue
was never considered. Two more patterns now, plus a raw-address check.

*Each repaired guard was proved by planting the original fault back:* the
untagged opioid quote fails naming `06-141` and the word "methadone"; the glued
attribution fails naming `10-204`.

### The new guard, and why it flags instead of tagging

`tests/unit/vice/testimonialVices.test.ts`. A term list is a **tripwire, not a
classifier**: it says "somebody read this and it names something specific, so a
person must decide what". Auto-assigning from keywords would be the August error
a third time — and the corpus proves why in one video, `pGoeG5aY3S0`, whose two
entries are "free from cigarettes" and "my relationship with weed". Any
per-video or per-keyword rule gets one of them wrong.

Seven cases: unknown tags (a typo silently hides a quote), the tripwire itself,
a breadth check so the fix cannot be "tag everything" (the shared vocabulary of
recovery — clean, sober, withdrawal, relapse — must stay eligible for anyone),
corpus-only tags reaching nobody, and the coverage debt with the companion
assertion this repo requires: **a vice on the uncovered list that has gained
accounts fails**, so the list shrinks when the research is done and cannot rot
into a permanent excuse.

### Still open after this

- **The corpus has nothing for scrolling, gaming, junk or spending.** That is a
  research pass against four vices, and it is the largest remaining gap in this
  module. The door is honest without it; it is also empty.
- **Attribution on `10-196`, `10-204`, `10-205`**, and whether `10-200` and
  `10-201` belong at all.
