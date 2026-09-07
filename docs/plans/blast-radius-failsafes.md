# Blast-radius failsafes

**Status:** M0 (the live defects) BUILT and attacked, 07-09-2026 — see the attack
pass below, which found seventeen more things wrong, including one blocker, in
M0 itself. M1–M6 are still proposals; nothing of them is built.
**Written:** 06-09-2026, updated 07-09-2026
**Trigger:** "The fonts changed on parts of the website, and the preferences on the dashboard are all weird."

---

## HUMAN SECTION (read this to decide)

### What actually happened

Two separate things, from two separate commits. Neither was the service worker added today, which was the first suspect.

**1. The dashboard preferences card grew a list of 13 dead buttons.**
On 5 September a fix went in so that step 2 of onboarding could be completed on a phone (the map's countries were too small to tap, so a list of regions was added beside the map). That list was added *inside the map component itself* — and the same map component is also used by the "Your Preferences" card on the dashboard. Nobody looked at the dashboard. So the dashboard's small map tile now carries a 13-button list that is greyed out and does nothing until you press "Choose new primary region", is roughly 500 px tall on desktop and 800 px on a phone, and stretches the portrait panel next to it to match. Reproduced today with screenshots; a 29-finding investigation with three independent checkers per finding confirmed it 3 votes to 0.

Why nothing caught it: the test written with the change reads the component *file as text* and checks that certain strings are present in it. It never draws the component, and never looks at the second place the component is used. Every test passed. The commit message says "the layout checks I ran earlier all came back clean" — they were run on the onboarding screen only.

**2. The fonts — CONFIRMED 07-09-2026, after the user said "it's like an overarching zoom in".**
Not a different typeface. Everything was **28% bigger**.

`next/font` generates a metric-matched stand-in for each family, so text does not
jump when the real webfont lands. Both stand-ins are the same physical font —
Arial — scaled to match:

| Generated face | What it is | Scale |
|---|---|---|
| `Geist Fallback` | `local(Arial)` | **104.76%** |
| `Geist Mono Fallback` | `local(Arial)` | **134.59%** |

`app/globals.css` named **`"Geist Mono Fallback"` in the SANS stack**, from the
first commit in January. So every time the Geist webfont had not arrived, the
whole site was painted in Arial at 134.59% instead of 104.76% — every word 28%
larger, layout otherwise intact. A zoomed-in page.

**Why it started happening now.** The webfont began failing to arrive. Two
causes, both dated: `.next` was deleted at 02:52 on 06-09 and the dev server
restarted at 18:53, so every route's first load had to fetch the font fresh; and
`npm start` serves a production build on **port 3000 — the same address as
`npm run dev`** — so one production run installs a service worker against the dev
server. The worker added on 06-09 cached every file it ever fetched, forever, and
served them whenever a request failed to connect, which a dev-server restart is.

**Why eight months of tests never saw it.** The fallbacks are `local(Arial)`, and
the Linux machines the tests run on **have no Arial**. The rule never matched,
every fallback collapsed to plain `sans-serif`, and the broken and fixed stacks
measured byte-identical in a browser. Nor could Playwright see the second half:
it starts every run with a clean profile, so it never has a service worker.
The bug was invisible to every automated check available, on the only machine
they run on. `tests/unit/shared/fontStack.test.ts` reads the declaration instead,
and says in its own header why it has to.

**Not the cause:** the service worker (it only installs on a production build, never on the dev server; every chain that needed it running here was refuted 3–0), the deleted secondary-region page (zero remaining references; it was a duplicate of a setting already on the Settings screen), any dependency change (none), any font/CSS/layout change in the last five commits (none), any merge or rebase (none).

**Also found, live right now, not what you reported** (all six fixed 07-09-2026;
each one's regression test was checked by breaking the fix and watching the test
go red):
- **Security.** The new service worker copies fully-rendered signed-in pages (dashboard, settings — with your regions, archetypes, age range, subscription) into a store shared by everyone who uses that browser. Sign-out doesn't clear it. On any network hiccup the *next* person to sign in on that device can be shown the previous account's settings page. Only on production builds, only after someone has opened the time tracker — but the runbook tells people to test exactly that.
- **A screen that errors every time.** The "one thing" screens asked the database for a column `due_on` that was renamed to `legacy_due_on` on 3 September. The cause turned out to be bigger than a column name: the entire code half of the 3 September chapters rework had never been committed. It was sitting in `git stash@{0}` while the migration and the server that calls it went in without it, so the server called functions that did not exist. Restored file by file on 7 September — the stash also holds 80+ files that were later redone differently on `main`, so it must never be applied wholesale.
- **The app icons don't exist anywhere but this machine.** `.gitignore` ignores every `.png`; the four icons the new manifest and service worker need are untracked. Any clean checkout, CI run, or deploy gets 404 for all four, so Chrome/Android will never offer "Add to Home Screen".
- **Nothing type-checks.** `next.config.mjs` says "type checking runs in CI (npm test)". It didn't: the unit runner had no type-check step, CI ran no `tsc`, and the build is told to ignore type errors. 119 errors existed, 14 of them in the half-restored file above — which is why nobody saw that the page was broken. `scripts/typecheck-ratchet.mjs` now records every existing error by file, code and message; anything not in that list fails, and the list can only shrink. 105 remain, all pre-existing.
- **Two docs say things the code doesn't.** The workout-programs plan says the orphan page was "recorded in `.test-known-failures.json` with the reason" — the file only got a date bump. `SLICE_PREFERENCES.md` still documents the deleted page.

### The general problem, in one sentence

**A change was tested where it was made, not everywhere it lands.** Every fault above is a version of that: a shared component changed for one screen; a worker that governs the whole site with zero tests of what it does; a column renamed in the database but not in one reader; a comment that describes a CI step that doesn't exist; a build that was broken for seven months because nobody ran it on a clean checkout.

### The failsafes, by what they let you trust

Each milestone is something you can rely on afterwards. Order is by payoff.

**M1 — "Every screen has a picture, and a change has to explain every picture it alters."**
A test that finds every real page in the app on its own (the route-reachability test already does this), opens each one in a production build at desktop and phone width, and checks five things: the right page loaded (a marker unique to that page, so a wrong page served at the right address is caught), no errors in the console, no failed downloads (a missing stylesheet or font fails here), the body text is painted in Geist and Geist has actually loaded, and the full-page screenshot matches the one on record. A change that alters any screen's picture fails until the new picture is deliberately accepted — *per screen*, so "I fixed onboarding" can never silently change the dashboard again. **This one test would have caught the region list, the 16 px buttons, a stale stylesheet, and a wrong page from the service worker.**

**M2 — "If it's committed, it builds — from nothing."**
CI clones the repo fresh, installs, and runs the real production build and a real type check. Today CI runs lint and unit tests only; the build is only exercised by the e2e job and never on a clean checkout, which is how a build stayed broken from 12 February to 2 September and how four untracked icons look fine here and don't exist anywhere else. The lie in `next.config.mjs` goes; the type check becomes real (prototype pages and pipeline scripts get their own, looser check so they can't block product code).

**M3 — "Things that touch the whole site are named, and can't change untested."**
A short list in the architecture test of *blast-radius-max* files — the root layout, `globals.css`, `proxy.ts`, `public/sw.js`, the shared UI primitives in `components/ui/`, and any component rendered by more than one screen (derived from imports, never hand-listed). The rule: each has at least one test that renders or executes it, and the service worker specifically gets a contract test on a production build: it never caches a signed-in page, never answers one address with another page's content, its cache name comes from the build so a new build empties the old cache, and sign-out clears it.

**M4 — "One fact, one place."**
Database column names are generated from the schema into TypeScript, and the repos use those types, so renaming a column in a migration becomes a *compile error* in every reader instead of a runtime crash in one of them. The slice docs' route tables are checked against `app/` so a deleted page can't stay documented. The known-failures file is checked against the docs that claim to reference it.

**M5 — "Nothing errors silently."**
The error-reporting work already in progress (another session, uncommitted) plus: the M1 sweep fails if the server logs an error during it. The `due_on` error has been happening on every "one thing" page load with no one seeing it.

**M6 — "Every commit says what it touched and who else it affects."**
A commit hook that refuses one-word messages, and — when the diff touches an M3 file — requires a line naming the other screens that use it. Not a test, a habit made mechanical. "gogo" (105 files) and "sss" (50 files) are not bisectable; the region-list commit was 3 files with a perfect message and *still* didn't say "also rendered on the dashboard" because nothing asked.

**M0 — the five live defects, fixed first** (small, each with its own regression test): scope the region list to onboarding with an explicit prop; change the sans fallback to *Geist Fallback*; read `legacy_due_on` / the chapter's date, whichever the 3 September design intended; make the service worker never cache signed-in pages, version its cache by build, and clear on sign-out; un-ignore the four icons.

### What this costs and what it doesn't fix

M1 is the big one: roughly 40 routes × 2 viewports of baseline screenshots checked into the repo, and a production build in CI (~2 min). Screenshots go stale when a screen changes on purpose — that's the point, but it means every intentional visual change has an "accept the new picture" step. M4's generated types touch every repo file once. Nothing here catches a *wrong* design that renders correctly — that still needs a person walking the screen, which the onboarding-on-a-phone work was.

### Blockers and open questions

1. **Which address were you looking at when the fonts looked wrong — localhost:3000, localhost:3200, or a phone — and which parts?** I can't see your browser; the three candidates above are all real but only one is what you saw. *Recommendation:* assume :3000 at phone width; fix the mono-fallback defect regardless because it is wrong on its own.
2. **May I stop the dead production server on :3200 (process 208212, started 5 Sep 00:45)?** It answers 500 on everything and can only mislead. *Recommendation:* yes.
3. **May I fix the five M0 defects now?** Another session is editing this checkout right now (error reporting: `app/layout.tsx`, `proxy.ts`, `TogglLab.tsx`, `playwright.config.ts` and new files). The M0 files — `InteractiveWorldMap.tsx`, `UserPreferences.tsx`, `OnboardingFlow.tsx`, `globals.css`, `lifeAnswerRepo.ts`, `public/sw.js`, `.gitignore` — don't overlap, but two agents in one tree is how a stash broke in-flight work before. *Recommendation:* yes, after that session commits.
4. **Turn build-time type errors back on?** It means the ~30 errors in `app/test/*` and `scripts/*` must be fixed or moved under a separate, looser tsconfig. *Recommendation:* separate tsconfig for prototypes and scripts, strict for product code, `ignoreBuildErrors` removed.
5. **The service-worker cache is a security defect even though the site isn't deployed** — the runbook has people sign in with real accounts on a production build to test offline. *Recommendation:* fix before the next such test, ahead of everything else in M0.

---

## The attack pass on M0 — what the review found in my own fixes

**07-09-2026.** Four reviewers, two adversarial verifiers per finding, against
the uncommitted M0 work. 25 findings. **Every verdict that actually ran came
back "not refuted" — nothing was refuted.** 31 of 54 verifier agents died on
usage credits, and the harness reported findings with zero surviving verifiers
in the same bucket as genuinely-refuted ones. So 14 findings were reported to me
as "refuted" when they had simply never been checked, including one marked
blocker. That is a reporting fault in the workflow I wrote, and it is exactly
the failure this document is about: a cheap signal standing in for the thing
itself. Those 14 were then verified by hand against the code.

**Confirmed and fixed (17):**

| What was wrong | Where |
|---|---|
| **Blocker.** Saving on a run-out one thing posted `extend`, so the next season opened with the OLD start date and inherited last season's why/cost/identity/values — "Running since <last season>" on a brand-new commitment. The picker seeds a fresh date when a season lapses, which made the box think the user had moved it. | `OneThingBox.tsx` |
| My region-list fix removed the dashboard's only keyboard- and thumb-usable region picker. The map's 236 country shapes are mostly under 10px with no tabindex. | `UserPreferences.tsx` |
| The test I wrote for that fix passed the prop itself, so flipping the dashboard back would have kept all six assertions green. Same class as the string test it replaced. | `regionList.test.tsx` |
| The app checked the five-year horizon from today; the database checks it from the chapter's start, which an extension carries across. Passed here, refused there, surfaced as "That did not save" with no reason. | `oneThingService.ts` |
| Opening a chapter is two writes with no rollback: a failed second write left an invisible, undeletable empty chapter that was also "current", so the page went blank. | `oneThingService.ts` |
| The first deadline saved came from the device's clock, not the account's timezone — the server default was unreachable from the UI. | `OneThingBox.tsx` |
| Service worker install used `cache.add`, which follows the login redirect and files the login page under the tracker's address. | `public/sw.js` |
| The cache was emptied at `/auth/` and never re-warmed; sign-in and sign-out are client-side transitions, so the rule barely fired at all. | `public/sw.js`, `OfflineShell.tsx` |
| Caching the shell HTML without the scripts it names: after a deploy an offline launch drew the timer and nothing worked. | `public/sw.js` |
| `"unversioned"` was a silent fallback that re-created the one-cache-forever bug. A build with no id now registers nothing and says why. | `OfflineShell.tsx` |
| The ratchet counted errors per file, so fixing two and adding two passed. It now records each error's file, code and message. | `typecheck-ratchet.mjs` |
| `--update` rewrote the baseline unconditionally — the ratchet could be raised in one command. | `typecheck-ratchet.mjs` |
| Windows CRLF made every path unmatchable; a tsc killed mid-report passed. | `typecheck-ratchet.mjs` |
| Onboarding wrote `preferred_region` with no validation, while both other write paths validated. | `profileService.ts` |
| A local variable shadowed the new `regionList` prop in the same file. | `InteractiveWorldMap.tsx` |
| React `act()` warnings on every test in the new file. | `regionList.test.tsx` |
| The restore was partial: this feature's doc and its migration edit were still in the stash. | `one-thing.md`, `20260902120000_…sql` |

**Found by attacking my own fixes, after the review:**

- The ratchet reported false failures: tsc does not order union members
  stably, so unchanged files looked newly broken. A gate that fails at random is
  a gate people learn to skip. Signatures are now normalised, and five
  consecutive runs were checked.
- Passing `undefined` to a parameter that has a default runs the default — so my
  own timezone fix made "start a new one" post the deadline of the season it was
  replacing. Caught by an existing test.
- My first service-worker test could not fail: the mock threw before reaching
  the code under test. Every new test here was then mutation-checked by breaking
  the fix and confirming the test goes red.

**Refuted, with the reason:** the review proposed refusing an amend that carries
a deadline. `oneThing.test.ts` documents the opposite decision and why —
refusing a reworded sentence because of a stale date in a field nobody touched
would block the one act meant to be free. Not changed. The review also flagged
the map swapping its two region colours in secondary mode; the two states differ
by stroke and glow, and `primary-muted` exists for exactly that case. Judged
intentional, not changed.

---

## AI SECTION (for execution)

### Evidence index

| Claim | Where | How verified |
|---|---|---|
| Region list rendered on dashboard, disabled | `src/profile/components/InteractiveWorldMap.tsx:451-504`; callers `OnboardingFlow.tsx:273`, `UserPreferences.tsx:307` (`isInteractive={mapMode !== null}`, `showInfoBox={false}`, no prop for the list) | Rendered on :3000 with e2e auth state: 13 buttons, 13 disabled, 490 px desktop / 798 px phone; screenshots `.playwright-mcp/diag-dashboard-{desktop,phone}.png`; onboarding step 2: 13 buttons, 0 disabled |
| Introduced by | `d1841a1e` 2026-09-05 "Onboarding step 2 was impossible to complete on a phone" — 3 files | `git show --stat` |
| Test is a string test | `tests/unit/profile/regionListFallback.test.ts:23` `readFileSync(...InteractiveWorldMap.tsx)` + `toContain` | read |
| Secondary highlight bug | `UserPreferences.tsx:310` hardcodes `selectionMode="primary"`; `InteractiveWorldMap.tsx:417-418, 479` | 3/3 verifiers |
| `slavic-europe` raw id | `UserPreferences.tsx:43-56` hand-copied `REGION_NAMES` missing the 13th region of `src/profile/data/regions.ts` | 2/3 (pre-existing, newly reachable) |
| Button/select 16 px < 640 px | `components/ui/button.tsx:8` `text-base sm:text-sm`, `:24` `h-11 sm:h-9`; commit `318a624a` 2026-03-04 | read; measured 16 px phone / 14 px desktop |
| Sans → mono fallback | `app/globals.css:84` `--font-sans: "Geist", "Geist Mono Fallback", sans-serif` since `9f5c67d8` | read; `document.fonts` shows `Geist/loaded`, `Geist Fallback/unloaded` |
| next/font family names are NOT hashed in Next 16 | `.next/dev/static/chunks/...geist...css` has `@font-face { font-family: Geist }` | read by investigator; consistent with computed `fontFamily` |
| Dead :3200 server | pid 208212 since 2026-09-05 00:45:57; `curl :3200/` → 500, 21 B; `.next` recreated 2026-09-06 02:52 | `ps`, `ss`, `curl` |
| SW production-only | `src/timetrack/components/OfflineShell.tsx:18-21` | read |
| SW caches signed-in HTML, never cleared | `public/sw.js:52-60` caches every ok same-origin GET; only `caches.delete` is in `activate` filtering by the constant name | read; 3/3 |
| SW navigate fallback serves `/dashboard/time` for any failed navigation | `public/sw.js:61-71` | read; 3/3 (fires only on a network *error*, not 4xx/5xx) |
| `due_on` | `src/db/lifeAnswerRepo.ts:22,26,77`; `supabase/migrations/20260903100000_life_chapters.sql:208` renames to `legacy_due_on` | read |
| Icons untracked | `.gitignore:94 *.png`; `git ls-files public/icon-*.png` empty; files exist locally | read |
| No type-check anywhere | `next.config.mjs:6-10`; `vitest.config.ts` no `typecheck`; `ci.yml` lint+test; `npx tsc --noEmit` ≈30 errors in `app/test/*`, `scripts/*` | read + run |
| Build broken 2026-02-12 → 2026-09-02 | `98540f98` added module-load `fs.readdirSync` on gitignored `data/`; fixed `9eb1e815` | 2/3 |
| Known-failures never recorded | `git show 4bfc843e -- .test-known-failures.json` = date bump only; `docs/plans/workout-programs.md:217` claims otherwise | read |
| Existing guards | `tests/unit/navigation/routeReachability.test.ts`, `tests/unit/architecture.test.ts`, `.claude/rules/finished-work.md`, `.husky/pre-commit` (unit tests only), CI e2e on 5 engines against `npm run build && npm start` | read |

### M0 — live defects (each ships with a regression test)

| Fix | Files | Acceptance test |
|---|---|---|
| Region list opt-in: `showRegionList?: boolean` default `false`; onboarding passes `true` | `InteractiveWorldMap.tsx`, `OnboardingFlow.tsx` | Render `UserPreferences` with a profile → `queryByTestId("region-list")` is null; render `OnboardingFlow` step 2 → 13 enabled buttons. Delete `regionListFallback.test.ts` (string test) |
| Secondary-mode highlight: pass `selectionMode={mapMode ?? "primary"}` | `UserPreferences.tsx:310` | Click "Choose new secondary region" → `aria-pressed` on secondary, not primary |
| Delete hand-copied `REGION_NAMES`; derive from `REGIONS` | `UserPreferences.tsx:43-56` | Every `REGIONS[i].id` resolves to its `name`; test iterates `REGIONS`, not a fixed list |
| `--font-sans` fallback → `"Geist Fallback"` | `app/globals.css:84` | Unit: parse globals.css, assert sans stack contains no `Mono`; e2e (M1): computed family + `document.fonts.check` |
| `due_on` → whatever the 03-09 design intends (chapter date or `legacy_due_on`) | `src/db/lifeAnswerRepo.ts`, plus the two other readers named in the 03-09 migration comment | Integration test on migrated schema: `listLifeAnswers()` succeeds; typed columns (M4) make this a compile error afterwards |
| Service worker: never `cache.put` a `navigate`/`document` response; pre-cache only the shell; `CACHE = "timetrack-shell-" + BUILD_ID` (inject at build); on sign-out `caches.keys().then(delete all)` | `public/sw.js`, sign-out action, build step | e2e on production build: sign in as A, load `/dashboard/settings`, sign out, go offline, sign in as B → no A content; `caches.keys()` after a new build contains only the new name |
| Un-ignore icons | `.gitignore` (`!public/icon-*.png`) | Clean-clone build (M2) serves 200 for all four |

### M1 — route sweep with visual baselines

- Source of truth for routes: reuse `routePages()` from `routeReachability.test.ts` (extract to `tests/helpers/routes.ts`; both tests import it — one representation).
- New Playwright project `sweep` running only in CI's production-build job (`npm run build && npm start`) and locally on demand; `storageState` user A; viewports `1280×900`, `390×844`.
- Per route: `expect(status).toBe(200)`; `expect(page.getByTestId(pageMarker(route)))` — add `data-testid="page:<route>"` to each page's root (architecture test enforces every `app/**/page.tsx` renders one); collect `console.error` and `requestfailed` → must be empty; `await page.evaluate(() => document.fonts.check("16px Geist"))` true and `getComputedStyle(body).fontFamily` starts with `Geist`; `expect(page).toHaveScreenshot(`${route}-${viewport}.png`, { fullPage: true, maxDiffPixelRatio: 0.002 })`.
- Baselines committed under `tests/e2e/sweep/__screenshots__/` — the one place `.png` is allowed outside `.playwright-mcp/`; update CLAUDE.md's "Never" line accordingly.
- Dynamic routes (`[id]`) get one fixture id each, created via the existing API helpers.
- Acceptance: temporarily pass `showRegionList` on the dashboard → exactly `/dashboard-*.png` fail, nothing else.

### M2 — clean-checkout build + real type-check in CI

- `ci.yml`: new job `build-clean`: `actions/checkout` → `npm ci` → `npx tsc -p tsconfig.ci.json --noEmit` → `next build`. Fails on any untracked dependency (icons, `data/`).
- `tsconfig.ci.json`: extends base, `exclude: ["app/test/**", "scripts/**"]`; a second, non-blocking job type-checks those so the count is visible, not hidden.
- Remove `typescript.ignoreBuildErrors` and its false comment from `next.config.mjs`.
- `.husky/pre-push`: `npm run build` (not pre-commit — too slow per commit).
- Acceptance: reintroduce the `98540f98` `readdirSync` → `build-clean` red; add a type error in `src/` → red; in `app/test/` → visible, not blocking.

### M3 — blast-radius guard

- In `architecture.test.ts`: `GLOBAL_FILES = [app/layout.tsx, app/globals.css, proxy.ts, public/sw.js, components/ui/**]` + `sharedComponents()` = every `.tsx` under `src/**/components` imported by ≥2 distinct route trees (reuse `componentTree()` from route reachability). For each: at least one test file imports it or, for `sw.js`/`globals.css`, a named e2e spec exists. Error message names the file and the routes that render it — that list is also what M6's hook asks the author to acknowledge.
- `tests/e2e/service-worker.spec.ts` (production build only): scope, document-not-cached, wrong-page-never-served, versioned cache, sign-out clears.
- Acceptance: delete `offlineShell.test.tsx` → architecture test names `public/sw.js` and `OfflineShell.tsx`.

### M4 — one fact, one place

- `supabase gen types typescript --local > src/db/database.types.ts` in a script + CI check that the committed file matches; repos type their selects with `Database["public"]["Tables"][T]["Row"]`; the `COLUMNS` strings become `satisfies (keyof Row)[]` arrays.
- `tests/unit/docs/sliceRoutes.test.ts`: every `| \`/path\` |` in `docs/slices/SLICE_*.md` route tables exists in `routePages()`; stale `/preferences/secondary-region` fails it today.
- `.test-known-failures.json` already has a schema; add: any doc line matching `recorded in .test-known-failures.json` must correspond to an entry (or a resolved-entry archive).
- Acceptance: rename a column in a migration, regenerate types → `tsc` fails in the reader.

### M5 — nothing silent

- Coordinate with the in-flight error-reporting session (`docs/plans/error-reporting.md`); the M1 sweep additionally tails the server's stdout during the run and fails on `Error:` lines.

### M6 — commit hygiene

- `.husky/commit-msg`: subject ≥ 20 chars, not in a deny-list (`gogo`, `sss`, `wip`, `commit`); if the staged diff touches an M3 file, body must contain `Callers:` followed by the routes the architecture test reports for it.
- Acceptance: `git commit -m gogo` refused; touching `InteractiveWorldMap.tsx` without `Callers:` refused, and the hook prints the two routes.

### Ordering

M0 (after the other session commits) → M2 (cheap, unblocks trust in CI) → M1 (biggest catch-rate) → M3 → M4 → M6 → M5 (waits on the error-reporting work).

### Not covered

- A correct render of a wrong design. Needs a person.
- Behaviour that differs by real device (Safari font rendering, iOS PWA) — `real-device-verification-checklist.md` remains the process.
- Data-shape regressions in localStorage-only labs (`/test/*`) — deliberately out of the product route set.
