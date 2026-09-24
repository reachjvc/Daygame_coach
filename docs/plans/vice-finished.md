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

## The one decision this plan turns on

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

**M4 — It is part of the app.** Life Mastery — and therefore this — is reachable
only by typing the address today. It joins the navigation. The vice module itself
stays exactly where it is, inside Life Mastery, because your item 8 asks for it
in isolation and it has that.
*Acceptance:* a signed-in user can reach the Black Box from the navigation
without typing a URL; the existing route-reachability test covers it.

**M5 — It behaves the same on Safari and Firefox.** Part of this arrived from
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

**M6 — It looks good in a hand and on a desk.** The desktop layout stops being a
stretched phone: the chart gets the width, and the three numbers stop wrapping
two-then-one. The 320px label crowding goes. Then you look at it and say whether
the orange bar reads right.
*Acceptance:* screenshots at 1280, 430, 390 and 320px, put in front of you; the
phone sweep and the overflow sweep still clean on all three engines.

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
| 4 | Partly | Read at the moment the thought arrives | The door works and answers from your own record — but the page cannot be OPENED at that moment without a connection (M1), and has no route to a helpline (M3) |
| 5 | Yes | Both, in combination | One record, one page, one chart carrying both |
| 6 | Behaviour | It has to look genuinely good | The phone is close; the desktop is a stretched phone (M6). No plan answers this — you looking at it does |
| 7 | Behaviour | What is there now is more or less useless | This is the decision above. Road A applies your rule — citation survives, opinion goes; road B keeps it all |
| 8 | Partly | Clicking Vices shows the new work in isolation | True today except for the footer line to `/old`, which M2 removes; and "clicking Vices" still requires typing the Life Mastery address (M4) |
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
