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
signal. The unfinished part is everything around it:

- **22 of 61 browser tests for the old half are failing right now**, and have
  been since the addresses moved on 2026-09-20. Nobody noticed because the
  end-of-turn test hook runs the unit tests, not the browser ones.
- **The module cannot be opened without a connection** — the one moment it was
  designed for. Once it is on screen it works offline perfectly. Opening it
  offline shows the browser's error page.
- **The crisis helpline numbers were last checked 38 days ago**, and the page
  someone opens mid-thought has no route to them at all.
- **The old half is a one-way door**: every one of its nine sub-pages sends you
  "back" to the Black Box, not to the hub you came from.
- **48 controls on seven of its pages are too small to tap on a phone.**

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

## The milestones

Each one is a state of the app you can open and judge.

**M0 — The red tests go green or go away.** Point the old half's browser tests at
the address the old half actually lives at, and watch what that exposes. This is
first because it is the only way to know whether those 22 failures are hiding
real faults or are purely the wrong URL. On road A most of this file is deleted at
M2 instead — but not before it has been run once at the right address, because
deleting a red test is how a real fault gets deleted with it.
*Acceptance:* `npx playwright test tests/e2e/quit-vice.spec.ts` is green, or every
remaining failure is a named fault with a line in this plan.

**M1 — It opens with no connection.** The Black Box joins the time tracker as a
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

**M5 — It behaves the same on Safari and Firefox.** A `vice-cross.spec.ts` under
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
*Attempted:* read `public/sw.js` and `OfflineShell.tsx` in full; confirmed in a
browser that no worker is registered in development (0 registrations, no
controller) so a dev-mode test cannot prove production behaviour. *Result:*
**partial.** The change is a one-path constant becoming a set, and the worker's
rule 2 already answers each stored page only at its own address. It needs a
production build to verify, and `npm run build` freezes this machine — the memory
note says `--webpack` works. Needs one production build run.

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

**M0 — repoint the old tests**
- `tests/e2e/quit-vice.spec.ts` — `const HUB = QUIT_VICE` → `` `${QUIT_VICE}/old` ``.
  Also line 414 asserts the heading "Quitting something" after clicking the Life
  Mastery routine link, which now lands on the Black Box: that assertion belongs
  to the Black Box's own spec and should assert "Black Box" here.
- `tests/e2e/deadControls.spec.ts` — `BLACK_BOX` and `HUB` are both `QUIT_VICE`;
  `HUB` must be `` `${QUIT_VICE}/old` ``.

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

- **The Stop hook runs `npm test`, which is vitest only.** Every milestone here
  has to run its Playwright project by hand, or it will be reported green on the
  strength of the wrong suite. That is exactly how the 22 failures survived four
  days.
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
