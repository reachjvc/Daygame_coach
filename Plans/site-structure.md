# Site structure: addresses that say what belongs to what, and one frame around every page

**Status:** Phase 0 done 2026-10-13. **Every decision is taken** (the owner accepted all
recommendations on 2026-10-13), and Q-ICON was answered yes on 2026-10-15. Phases 1–5 run without
the owner. Phase 6 is after the STOP line.

**Written 2026-10-13, revised the same day after a review for a smaller executing model** (see
"What the review changed" at the end of Part 1). For the owner, and for the AI session that carries
it out. A friend opened `daygame-coach.vercel.app` and said the site "appears weird": Settings looks
like a subset of something, and the sections are not logical slices. This plan checks that against
the site itself, names the cause, and fixes every instance.

**Where it sits.** Part of vision item 38 ("Dashboard, front page, settings and every other page need
another pass") and item 12 ("It works on a phone and in a browser"). It finishes item 32
("Preferences onboarding moves … into daygame / Scenarios where it belongs"), which moved the form
but not its address. It stays compatible with D8 of `docs/plans/own-platform-and-app.md` (the phone
app is Capacitor with bundled assets), and it builds on `Plans/tests-worth-their-keep.md`,
which is cutting the test suite in this same checkout (B-PEER-TREE).

---

# PART 1 — In plain words

## Words used here

| Word | Meaning |
|---|---|
| Address, route | What follows the domain in the browser bar, such as `/dashboard/settings`. |
| Tab destination | A page the bottom tab bar or its "More" sheet opens directly: Dashboard, Training, Tracking, Scenarios, Time, Your plan, Ask Coach, Articles, Settings. A place in its own right, not a child of another page. |
| Sub-page | A page reached from inside a tab destination, such as one tracking session. It has a back link to its parent. |
| Frame | The navigation drawn around every signed-in page: a header on a laptop, the tab bar on a phone. |
| Layout | A Next.js `layout.tsx`. It wraps every page in its folder, which is how one frame reaches many pages. |
| Route group | A folder named in brackets, such as `app/(app)/`. It shares a layout **without appearing in the address**. |
| Proxy | `proxy.ts`, Next 16's name for middleware. It runs before matched requests; here it sends signed-out visitors to login. |
| 308 redirect | "This page has moved permanently." Browsers follow it and keep the query string. |
| Route list | `src/shared/routes.ts`, the one file that will hold every signed-in page address. |
| Service worker | `public/sw.js`, which lets two pages open with no network (the time tracker and the Black Box). |
| Preview deployment | The copy Vercel builds for every push to a branch other than `main`. |
| D8 | The decision that the phone app is Capacitor with the pages bundled inside. Server-only code does not run there. |

## What the friend saw, and why it is an old build

- **`daygame-coach.vercel.app` serves `main` at `c1680654`, from 2026-09-17** (GitHub's deployment
  record for Production). Your daily build, `training-rebuild`, is **440 commits ahead**.
- The problem is present on both. Nothing here reaches him until something is deployed (B-DEPLOY) or
  shared (B-PREVIEW).

## What is wrong — four things with one cause

### 1. The addresses do not say what belongs to what

Seven separate sections sit under `/dashboard/`, as if they were parts of the landing page:
`/dashboard/settings`, `/dashboard/tracking`, `/dashboard/scenarios`, `/dashboard/time`,
`/dashboard/qa`, `/dashboard/articles`, `/dashboard/inner-game`. Sections of the same rank sit at the
top level instead: Training at `/programs`, the dating answers at `/preferences`, the plan at
`/life-mastery`. On the live site `/settings`, `/tracking`, `/scenarios`, `/training` and `/time` all
answer "not found".

### 2. Most sections have two or three names

| What you tap | Its address | Its code folder |
|---|---|---|
| Training | `/programs` | `src/programs/` |
| Ask Coach | `/dashboard/qa` | `src/qa/` |
| Your plan | `/life-mastery` (heading: "Life Mastery") | `src/goals/` |
| Time | `/dashboard/time` | `src/timetrack/` |
| (dating answers) | `/preferences` | `src/profile/` |

Training's own heading adds a third claim: "Training · part of your Life Mastery plan", under a
"← Dashboard" link, at an address that is neither.

### 3. No shared frame, so every page draws its own (or doesn't)

Checked on 2026-10-13, signed in as the test account on `localhost:3000`, at 390 px and 1280 px:

| Page | Phone | Laptop |
|---|---|---|
| Dashboard | tab bar | header: Your plan · Ask Coach · Articles · Settings · Log Out. **No Training, Tracking, Scenarios or Time.** |
| Settings | header with ☰, **"‹ Back"**, tab bar | header, **"‹ Back"** |
| Tracking | tab bar | **nothing: no header, no links, no way back** |
| Scenarios | own header with **"← Back to Dashboard"**, tab bar | own header, **no site navigation** |
| Training | **"← Dashboard"**, "part of your Life Mastery plan", tab bar | **"← Dashboard"** only |
| Time | own header **"← Dashboard"**, own bottom bar | the same |
| Your plan | own header and controls | the same |
| Preferences | **nothing** | **nothing** |
| Ask Coach | header, tab bar | header |

Every tab destination presents itself as a child of Dashboard. On a laptop, three sections can only be
left with the browser's Back button. The tab bar is `sm:hidden` (above 640 px it does not exist), and
the desktop header is mounted on five pages. **An unpaid account gets no tab bar on the Dashboard at
all** (`DashboardPage.tsx:57–66`).

### 4. The rules live in hand-kept lists that drift

- Addresses are typed by hand in about 60 app files and 87 test files. Three files each hold part of
  a route list (`components/navTabs.ts`, `src/shared/lifeMasteryRoutes.ts`,
  `src/shared/trainingRoutes.ts`).
- **One has already drifted:** `src/settings/actions.ts:98` refreshes `/scenarios`, which has never
  existed, so changing difficulty never refreshes the Scenarios page.
- **The sign-in guard is a hand-kept prefix list**, typed twice in `proxy.ts`. A page outside it is
  unguarded at the edge. It still names `/lair`, deleted on 2026-09-09.
- **The offline page list** in `public/sw.js` is a third hand-kept copy.
- **The tests keep three copies of "folder → address"** (`tests/support/appRoutes.ts`,
  `backNavigation.test.ts`, `routeReachability.test.ts`) and three copies of the import walk.

**The cause of all four: no single place owns the app's structure.**

## The rule for addresses after this plan

> **A path segment means "is part of".** A tab destination gets its own top-level address, named
> what its tab says. A page goes deeper only if you reach it from inside its parent.

| Today | After |
|---|---|
| `/dashboard` | `/dashboard` (unchanged; the installed app's start page and the login landing) |
| `/dashboard/tracking`, `…/session`, `…/session/[id]`, `…/report`, `…/review`, `…/daily`, `…/history` | `/tracking`, `/tracking/session`, `/tracking/session/[id]`, `/tracking/report`, `/tracking/review`, `/tracking/daily`, `/tracking/history` |
| `/dashboard/scenarios` | `/scenarios` |
| `/preferences`, `/preferences/archetypes` | `/scenarios/preferences`, `/scenarios/preferences/archetypes` |
| `/dashboard/time` | `/time` |
| `/dashboard/qa` and `/qa` | `/coach` |
| `/dashboard/articles` | `/articles` |
| `/dashboard/inner-game` | `/inner-game` |
| `/dashboard/settings` | `/settings` |
| `/programs`, `/programs/live`, `/programs/workout/[id]` | `/training`, `/training/live`, `/training/workout/[id]` |
| `/life-mastery`, `/life-mastery/quit-vice` | `/plan`, `/plan/quit-vice` |
| `/dashboard/goals/plan` | `/plan` |
| `/`, `/auth/*`, `/redirect`, `/admin/ai-usage`, `/test/*` | unchanged |

## DECISIONS — all taken 2026-10-13 (owner accepted every recommendation)

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| D1 | Dating answers live at **`/scenarios/preferences`**; Settings keeps a row linking there | Vision item 32; the page says only Scenarios uses them | One route-list line and one redirect |
| D2 | Ask Coach is **`/coach`** | Its label | The same |
| D3 | The plan is **`/plan`**; the navigation calls it "Your plan" (already true). Training's line becomes "part of your plan"; the plan's own "Life Mastery" heading is left as it is | Label and address agree | The same |
| D4 | Training is **`/training`** | Its label | The same |
| D5 | Dashboard keeps **`/dashboard`** | Start page of installed copies; login landing | — |
| D6 | Quit-a-vice is **`/plan/quit-vice`** | Reached from the plan's Vices card | One line and one redirect |
| D7 | **Tab destinations have no back control.** Removed: Settings' "‹ Back", Scenarios' own header bar with "Back to Dashboard" (all branches), Training's "← Dashboard". **Kept:** sub-pages' `BackLink`s; Time's and the plan's own exits (they draw their own frame, D15); Inner Game's "Exit" and "Back to Dashboard" (Inner Game is not a tab; you open it from a Dashboard card, so returning there is honest) | The frame is the way out | — |
| D8 | **A laptop header built from the same `TABS` and `MORE_ITEMS` as the phone bar**, then Log Out | One list feeds both, so they cannot disagree | A redesign later |
| D9 | **No header on a phone inside the frame** (the ☰ menu duplicates "More", which already has Log Out at `MobileTabBar.tsx:102`). *Revised by the review from "logo-only header": a logo strip would add 56 px to every phone page, including Tracking and Training, which have none today.* The public home page keeps its own header | Fewer things, same reach | Branding on phone pages, if missed, is one component |
| D10 | Old addresses redirect from **`proxy.ts`**, from a table in `src/shared/routes.ts`. `next.config.mjs` is not edited | The proxy reloads live in `next dev` and can import the route list; `next.config.mjs` is shared with the Caddy plan and restarts the dev server on every edit | Moving the table later is one function |
| D11 | **Generalise the existing guard** in `lifeMasteryRoutes.test.ts` ("is not written out by hand anywhere in the product") from one address to every route-list address, instead of adding a new test | It already exists for one address and caught real drift | — |
| D12 | **Code folders keep their names** | 200+ files of churn for nothing visible | — |
| D13 | **API addresses are not renamed now**; Phase 7 records them for the database move | No visitor sees them; that move rewrites the layer | Renames redone later |
| D14 | **Remove the home page's "Preview Dashboard" card and every signed-out branch behind the proxy** (`DashboardPage`, Articles, Inner Game, Scenarios) | The proxy already sends signed-out visitors to login first; the button opens the login page | A real public preview would be a feature and a security review |
| D15 | **`HIDDEN_ROUTE_PREFIXES` hides the whole frame** (laptop header and phone bar) on the plan and quit-vice, weekly review, live workout and Time | Each draws its own top and bottom controls and its own exit | Two headers stacked on four pages |
| D16 | **Old addresses redirect permanently** | A 308 costs nothing; a test keeps targets valid | A dead bookmark |
| D17 | **The friend sees it through a preview share link** after Phase 5 | Does not touch production | — |
| D18 | **Every signed-in account gets the same frame, paid or not.** Page gates are unchanged (Ask Coach still redirects unpaid accounts; Scenarios, Articles and Inner Game still show their previews) | One rule; nobody can pay yet (no webhook), and the phone "More" sheet already shows Ask Coach to everyone | An unpaid account sees links to pages that show a preview |
| D19 | **The header's "Preview Mode" pill and "Subscribe" button go.** The frame holds no purchase state (D8 forbids server data in it). Preview pages keep their in-page notices; checkout is a placeholder anyway | No server data in the frame | A paying flow later adds its own entry point |
| D20 | **The route list holds only signed-in product pages** (the ones that move). `/`, `/auth/*`, `/redirect`, `/admin/ai-usage` and `/test/*` stay literal | `/auth/*` is a contract with Supabase's emails and never moves; pulling 27 `"/auth/login"` literals in is churn | — |

## Still open — needs the owner's word

| # | Question | Recommendation | Default if unanswered |
|---|---|---|---|
| Q-ICON | May the laptop header show **the same icons the phone bar already shows for the same destinations** (`LayoutDashboard`, `Dumbbell`, `BarChart3`, `Swords`, `Timer`, `ScrollText`, `HelpCircle`, `BookOpen`, `Settings`)? `.claude/rules/ui.md` says "Ask before reusing an existing icon in a new context", and `src/shared/iconRoles.ts` needs approval by name. The icons are drawn from `navTabs.ts`'s own data, so no file gains a new import and the registry need not change | **Yes**: same destination, same meaning, one list | **Text-only links in the laptop header — final unless the line `Q-ICON: yes` appears in this file, written by the owner.** The executor never infers a yes, does not wait, and does not ask. Adding icons later is one line in `AppFrame.tsx`. |

Q-ICON: yes

*Answered by the owner on 2026-10-15 in session `daygame-coach-ff`, in their words "yes to 1 & 3",
where 3 was this question: "Should the laptop navigation show icons, the same ones the phone bar
uses?" Recorded here by that session because the owner gave the answer there, not in this file.*

## What this plan deliberately does not do

- Rename code folders (D12) or API addresses (D13).
- Bring back `tests/unit/architecture/orientation.test.ts` (deleted in `2fea6697`; per the owner the
  rule did not make sense). Phase 5 removes `docs/product/map.md`'s claim that it exists.
- Change who may see what. Paid gating stays in the pages (D18).

## Future-proofing, said before anything is built

- **D8:** the frame is a client component with **no server data** and no sign-in check. The proxy
  owns sign-in for the website; pages keep their own checks.
- **Redirects and the proxy are website-only.** A freshly installed app has no old bookmarks. The
  route list is plain data, which is what the phone app's notification links (vision item 48) need.
- **This is the cheapest the move will ever be:** today the only bookmarks are yours.

## Security, stated plainly and unasked

- **Today a page outside the proxy's prefix list is unguarded at the edge.** Every page that reads
  data checks sign-in itself or through its layout (Tracking's sub-pages via
  `app/dashboard/tracking/layout.tsx`, quit-vice via `app/life-mastery/layout.tsx`), and row-level
  security holds at the database, so nothing leaks. The move would create six new top-level
  prefixes. **Phase 2 makes the guard private-by-default before anything moves**, so a forgotten page
  fails closed.
- **Server actions are covered by the proxy only on the page that uses them** (Next's warning in
  `proxy.md`, "Execution order"). Checked one by one: all 17 exported actions in
  `src/settings/actions.ts` (11) and `src/profile/actions.ts` (6) call `requireAuth()` or
  `getUser()` themselves. Moving pages changes nothing there.
- **The test API routes are sealed** (live: `/api/test/*` 404, `/api/admin/*` 401, `/api/qa-test`
  needs a paid account). Phase 2 keeps `/api/test/` and `/api/timetrack/` in the matcher.

## What the review changed (2026-10-13, second pass)

Found by reading the plan as a smaller model would, then checking each step against the code:

1. **Phase 1 could not have been committed.** `routeReachability.test.ts` and
   `backNavigation.test.ts` find links by reading literal address strings, and resolve only three
   named constants. Replacing literals with `ROUTES.x` would have made every page an orphan, and the
   pre-commit hook would have refused. Phase 1 now teaches the test tooling first.
2. **A wrong fact:** `viceArchiveStep` lives in `app/test/archive/quit-vice/routes.ts`, not in
   `lifeMasteryRoutes.ts`. It stays where it is.
3. **DRY:** the proposed "no typed addresses" test duplicated an existing one (now D11). The three
   copies of "folder → address" and of the import walk in the tests become one.
4. **YAGNI:** `PRIVATE_PREFIXES` and `OFFLINE_SHELL` constants (used only by tests, or only until
   Phase 2) are gone; so is a planned "walk enclosing layouts" feature, replaced by a direct check.
5. **Guesswork removed:** the proxy matcher, the redirect table, the route list's contents, the frame,
   the per-page removals, the test-update rule, the ports and every verification command are now
   given literally (Appendix).
6. **Decisions the first draft left open:** unpaid accounts and the frame (D18), the preview pill and
   Subscribe button (D19), Inner Game's exits (D7), the route list's scope (D20), the phone header
   (D9, revised).
7. **Traps found:** a test imports a page file by relative path (`lifeMasteryRoutes.test.ts:26`), a
   test pins `app/programs/` by path (`lintRatchet.test.ts:171`), the dev-check and production-build
   ports collided, and `/qa`'s deletion was filed under the wrong section.
8. **A smaller model (Haiku) then dry-read the revised plan** against the code and listed 24 places
   it would have to guess. All 24 are fixed here. The ones that would have failed a phase: Phase 3's
   check counted Time and Your plan as framed pages, though D15 hides their frame; the hidden-route
   list was never written out; e2e files another session is editing were not covered by B-PEER-TREE;
   the old plan page's import had no removal step; `programs-offline.spec.ts` runs only in the
   `training` project, so the offline command would have skipped it and passed. Also fixed:
   the manual "change difficulty" check became a class-level test ("every `revalidatePath` target
   is a real page"); and **sign-out is checked by a unit test only**, because `signOut()` ends
   every session of the account, which would log out other sessions' browser tests on a shared
   account.
9. **A third Haiku pass** found the commits that would still fail the hook (`proxy.ts` importing a
   deleted file; an existing test pinning the literal `"/programs"` in `navTabs.ts`; `"/qa"` as a
   sweep-debt key; `routes.ts` tripping the old one-address guard; `SETTINGS_CONFIG.paths` hiding
   `revalidatePath` targets) and one contradiction (dirty test files in Phase 4). All fixed. It also
   found that **the browser suite moved today to a throwaway local test backend** (Docker; every
   test makes its own account; nothing touches production — `playwright.config.ts`,
   `tests/e2e/fixtures/`). So the plan no longer checks the frame with screenshots of the live
   database through a shared account: the check is now **`tests/e2e/site-frame.spec.ts`**, a
   permanent test of the friend's complaint on that backend (Appendix D), and every server used for
   checks runs against the test backend (Appendix C).

---

# BLOCKERS — things only a person can do, or that wait on someone else

Each was attempted on 2026-10-13; the result column is what happened.

| ID | What | Attempted, and what happened | Blocks | What to do |
|---|---|---|---|---|
| B-PEER-TREE | Another session cuts the test suite in this checkout | Three peer sessions (`daygame-coach-6e`, `-ac`, `-bf`). At 14:30, ~250 test files were uncommitted, including four navigation tests. By 14:50, `-ac` had committed those (`812f496d`) and `playwright.config.ts` with `e2e.yml` (`9274a742`), and the suite was green. Their cut (`tests-worth-their-keep.md` Phases 1–3) is still running. | Any commit while their unfinished change breaks `npm test` | Before each phase: `git status --short tests/ playwright.config.ts .github/`. If a file this plan edits is dirty, message its owner (`-ac` owns the test cut) and do other work. If the pre-commit hook fails on a test this plan did not touch, quote it, message `-ac`, and wait; never `--no-verify`. |
| B-DEPLOY | Put the fix on `daygame-coach.vercel.app` | `git push --dry-run origin training-rebuild:main` → `c1680654..d659ac47` (clean fast-forward). Not pushed: it ships 440 commits to production, and the same push was refused by the safety classifier on 2026-10-12 (Caddy plan, B-MAIN). | Phase 6, only if you choose to deploy | **You** run `git push origin training-rebuild:main`. Undo: `git push --force-with-lease origin c1680654:main`. |
| B-PREVIEW | Show the friend without touching production | Every push to `training-rebuild` gets a Preview deployment; opening one answers `302 → vercel.com/sso-api` (Vercel's login wall). `vercel` CLI not installed. | Phase 6 (D17) | **You**: Vercel dashboard → the Preview of the last commit → **Share**. Password sign-in works there; sign-up emails would not (Supabase's allow-list has only the production URL and localhost). |
| B-DEVSERVER | Your `next dev` on `:3000` | Not touched. Folder moves usually appear without a restart; a new route group sometimes leaves stale routes. | Nothing; checks never use `:3000` | **You** (never the executor): if `:3000` shows a 404 for a moved page, restart `npm run dev` when convenient. The executor only notes it. |
| B-SW-PHONE | Your phone's installed app keeps old offline pages until it updates | `sw.js` versions its cache by build, calls `skipWaiting()`/`clients.claim()`, and deletes old caches; it updates on an **online** visit. | Nothing in this plan | After the change reaches your phone's address, open the app once with signal. |
| B-STACK | The local test backend every browser check runs on | **Up.** Docker 29.1.3 with 8 containers running; `node scripts/db/test-stack.mjs env` exits 0 and its JSON has `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` (only the key names were printed); `jq` is at `~/.local/bin`. Phase 0's screenshots were taken differently, through the shared live test account on `:3000` (17 of 18 loads signed in; one first load bounced to login) — the executor does **not** repeat that. | Every browser check in Phases 1–4 | If it is down: `node scripts/db/test-stack.mjs up`. If Docker itself is down, **you** start it; record the blocker meanwhile. Never point a browser test at the live project. |
| B-DISK | WSL's virtual disk lives on C:, and C: is nearly full | `df -h /mnt/c`: **1.8 of 1.9 TB used, 30 GB free (99%)**. A full C: detached WSL at 16:39 today and killed every session (memory note `c-drive-full-wsl-risk`). WSL crash dumps on C: total 3.9 GB. Existing build folders here: `.next` 9.3 GB, `.next-prod` 1.5 GB, `.next-verify` 1.6 GB (a peer's), `.next-e2e` 1.0 GB. | Every build in Phases 2 and 4 (~1.5 GB each) and the second dev server (~1 GB) | **You:** free space on C:. The crash dumps in `C:\Users\jonas\AppData\Local\Temp\wsl-crashes` are the safe first 3.9 GB. **The executor:** before each build or server start, `df -h /mnt/c`; below 20 GB free, stop and record B-DISK. Delete its own `.next-site-build` and `.next-site-dev` after each phase's checks. Deleting inside WSL frees room in the virtual disk but does not shrink it on C:. |
| B-SUPABASE | Email links and redirect allow-list | **Cleared.** Read through the management API (only these fields printed): `site_url` is the Vercel URL, `uri_allow_list` is `…vercel.app/**,http://localhost:3000/**`, and no email template names a page. The app's links use `/auth/confirm?next=/redirect` and `/auth/reset-password`, which do not move. | — | — |
| B-STRIPE | Stripe return addresses | **Cleared.** Checkout is a placeholder; the billing portal's `return_url` comes from `SETTINGS_CONFIG.billingPortalReturnUrl()`, which Phase 1 points at the route list. | — | — |
| B-DATA | Addresses saved in the database or browser | **Cleared.** No column holds a link; no storage key holds a path. The one copied address, the time tracker's start link, carries a query string, which the redirect keeps. | — | — |
| B-BASELINES | Lint and type baselines keyed by file path | **Cleared.** `eslint-baseline.json` and `tsc-baseline.json` have no entry in any folder that moves. | — | — |

---

# PHASES

Every commit must pass the pre-commit hook (`npm test`). Each phase ends in a working app and names
acceptance checks that are **run**, with the decisive output quoted under the phase. A step that hits a
blocker is marked `blocked: <ID>`; work continues with the next step that does not depend on it.

**Servers used for checks — all on the local test backend (Appendix C):** Playwright's own dev
server on `:3200`, which `npx playwright test` starts by itself when `PW_BASE_URL` is unset (the
normal case); a dev server on **`:3101`** for the `curl` loops; and, for the two offline specs only,
a production build on **`:3100`**. Their build folders (`.next-e2e`, `.next-site-dev`,
`.next-site-build`) are git-ignored (`.next-*`). Never touch `:3000`.

## Phase 0 — Inventory, screenshots, blocker attempts. **Status: done 2026-10-13**

- Live site probed with `curl` (signed out); production commit read from GitHub's deployment API.
- Signed-in screenshots of nine pages at two widths (recorded in Appendix D as "Phase 0 evidence"); the table in Part 1.
- Code inventory: the file lists in Phase 1, the per-page table below, the test tooling, the proxy and
  `sw.js` lists, the `/scenarios` bug.
- Next 16's docs read: `route-groups.md`, `proxy.md` (matcher, execution order, the server-action
  warning), `redirects.md` (query strings pass through).
- Every blocker attempted (table above).

**Per page today** (sign-in check, paid gate, frame):

| Page | Own sign-in | Paid gate | Header | Tab bar | Notes |
|---|---|---|---|---|---|
| `/dashboard` → `DashboardPage` | in component | preview if unpaid | yes | **paid only** | dead signed-out branch (D14) |
| `/dashboard/settings` → `SettingsPage` | yes | — | yes | yes | "‹ Back" at `SettingsPage.tsx:234` |
| `/dashboard/tracking` → `ProgressDashboard` | yes + layout | — | no | yes | dead end on a laptop |
| `/dashboard/tracking/*` sub-pages | via `tracking/layout.tsx` | — | no | no | `BackLink`; `review` hides the bar |
| `/dashboard/scenarios` → `ScenariosPage` | in component | in component | own bar (4 branches) | yes | "Back to Dashboard" at `ScenariosPage.tsx:46,115,150,183`; branch 1 (lines ~30–60) is signed-out, dead |
| `/dashboard/time` → `TimetrackScreen` | yes | — | own | own | `backHref="/dashboard"` at `TimetrackScreen.tsx:20` (kept, D15) |
| `/dashboard/qa` | yes | redirects unpaid | yes | yes | |
| `/dashboard/articles` | yes | preview | yes | yes | dead signed-out branch |
| `/dashboard/inner-game` | yes | preview | yes | yes | dead signed-out branch; Exit links kept (D7) |
| `/programs` → `TrainingScreen` | yes | — | no | yes | "← Dashboard" at `:208–210`; "Life Mastery plan" at `:237` |
| `/programs/live`, `/programs/workout/[id]` | yes | — | no | live: hidden | sub-pages |
| `/life-mastery`, `/life-mastery/quit-vice` | layout + page | none | own | hidden | |
| `/preferences`, `/preferences/archetypes` | yes | — | no | no | no way out but Save |
| `/admin/ai-usage`, `/` (home) | key / yes | — | — | — | stay outside the frame |

## Phase 1 — One route list, and the navigation tests read it (nothing visible changes)

**Depends on:** B-PEER-TREE: before editing any file under `tests/` (unit or e2e), `git status --short <file>`
must be empty. If it is not, skip that file, note it under this phase, message `daygame-coach-ac`
(owner of the test cut), and come back to it after their commit. **Working state:** every signed-in
page address comes from `src/shared/routes.ts`, with today's values. Only the `/scenarios` fix is
visible.

**First, record the start:** write `**Start SHA:** <output of git rev-parse HEAD>` under this
heading and commit it with the plan. Part 2's reviews and the escape clause use it.

**Start SHA:** `f9033db37d4ac52da1c72d5140323575ddfc65ce` (2026-10-14, session `daygame-coach-26`).

**Status:** done 2026-10-14. Commits `d6b39e20` (1.A), `d5bf0a38`, `c612460c`, `642dd18b`,
`a27767c3`, `dbeb9922`, `7323e917` (1.B), `7ac274e8` (1.C). Evidence:
- `npm test` green at every commit (pre-commit hook); 4,731 unit tests after 1.C.
- `routeList.test.ts` ("is the only place a page address is written out", comment-stripped) passes
  over `app/`, `src/` and `components/`, `app/test/` included. The step 9 finder, which cannot see
  block comments, prints only four prose lines inside them: `TrainingScreen.tsx:228`,
  `TrainingCard.tsx:337`, `BlackBoxPage.tsx:279` and `:744`.
- Type ratchet "90, none new"; lint ratchet "291, none new".
- `npx playwright test --project=sweep-desktop --project=sweep-phone`: **106 passed (2.3m)** on
  the local test backend.

Differences from the steps, by content: the 1.B slices went in as five commits, not thirteen (the
hook tests the whole tree either way). `tests/support/appRoutes.ts` gained `routeOfDir()`, one
folder-to-address rule that also fixes `gateRoutes()`'s own-address check for route groups.
`startLinkFor`'s `path` is typed `string` (a `ROUTES` default narrowed it). The bulk conversion used
a scratch script that masks comments first, so prose quoting a path was left alone.

Do it as **three kinds of commit, in order**. Each must pass `npm test` on its own.

### 1.A — The route list exists, and the test tooling understands it (one commit)

1. **Create `src/shared/routes.ts`** exactly as Appendix A, part 1 (today's values). Copy the
   explanatory comments from `src/shared/lifeMasteryRoutes.ts` and `src/shared/trainingRoutes.ts`
   onto the matching entries; they record real incidents. Do not delete those two files yet.
2. **One copy of each rule the route list touches, in `tests/support/appRoutes.ts`.** Move into it,
   exported:
   - `productRoutes()` — already there. Change one thing: drop every path segment wrapped in
     **parentheses** (a route group), so `app/(app)/settings/page.tsx` becomes `/settings`:
     `relDir.split("/").filter((s) => !/^\(.+\)$/.test(s)).join("/")`. Segments in **square
     brackets** (`[id]`) stay; they are what sets `dynamic`.
   - **Not moved, on purpose:** each test's own import walker. They are three different rules, not
     three copies of one: `routeReachability`'s `componentTree` returns a `Set` and follows every
     `@/` import 6 deep; `tabBarDestinations`' returns an array, 4 deep; `backNavigation`'s
     `mentions` follows only `components/` and `index.ts` imports, 2 deep. Merging them would change
     what each test proves.
   - From `routeReachability.test.ts`, **with everything they call**: `root`, `rel()`,
     `productFiles()` (line ~65), `normalize()` (~143), `DYNAMIC_VICE_STEP` (~189), `viceFlowIds()`
     (~197), and the imports of `viceArchiveStep`/`QUIT_VICE_ARCHIVE` they use. Then:
   - `gateRoutes()` — take `routeReachability.test.ts`'s version (line ~234), delete the copy in
     `backNavigation.test.ts` (line ~94). Extend its regex so `redirect(ROUTES.x)` also counts:
     `/redirect\((?:"(\/[^"]*)"|ROUTES\.(\w+))\)/g`, mapping group 2 through `ROUTES`.
   - `linksIn(files)` and `symbolicLinksIn(src)` — from `routeReachability.test.ts` (lines
     ~143–232). Keep the literal pattern and the `viceArchiveStep` handling. **Add** a generic
     resolver: `/(?:href=|[A-Za-z]*[Hh]ref\s*:\s*|\.push\(|\.replace\(|\bredirect\()\s*\{?\s*(?:`\$\{)?ROUTES\.(\w+)/g`
     → `ROUTES[m[1]]` (skip unknown keys).
   - Replace `routePages()` in `backNavigation.test.ts` (line ~28) and in `routeReachability.test.ts`
     (line ~83) with `productRoutes()`.
3. **`routeConstantsResolve.test.ts`:** add `import * as routes from "@/src/shared/routes"` and
   `...routesOf(routes, "src/shared/routes.ts")` to its list. **`routesOf()` reads only exported
   strings and one-argument functions, so it would skip `ROUTES`:** add a branch for a plain object,
   pushing `[file, \`${name}.${key}\`, value]` for each string value starting with `/`. Its
   `isServed(dir)` must accept a page reached through a route-group folder: when `app/<path>` does
   not exist, also try `app/(<group>)/<path>` for every folder in `app/` whose name is in
   parentheses.
4. **`lifeMasteryRoutes.test.ts` must allow the new file.** Its tests "is not written out by hand
   anywhere in the product" and "is not reached through an address it has already left" exempt only
   `src/shared/lifeMasteryRoutes.ts`; `routes.ts` now holds the same literals
   (`"/life-mastery"`, `SUPERSEDED_LIFE_MASTERY_PATHS`), so add
   `path.join(root, "src/shared/routes.ts")` to both exemptions in this commit.
5. **A premise test, so the resolver cannot go quiet:** in `routeReachability.test.ts`, next to
   "counts only navigation, never a path that is merely named", add "resolves a link written as a
   route-list entry": `symbolicLinksIn('<Link href={ROUTES.settings}>')`,
   `symbolicLinksIn('router.push(`${ROUTES.tracking}?tab=week`)')` and
   `symbolicLinksIn('redirect(ROUTES.plan)')` return the **values** `ROUTES.settings`,
   `ROUTES.tracking` and `ROUTES.plan` (today `"/dashboard/settings"`, `"/dashboard/tracking"`,
   `"/life-mastery"`; compare against `ROUTES.x`, not against literals, so Phase 4 does not break it);
   `symbolicLinksIn('import { ROUTES } from "@/src/shared/routes"')` returns nothing.
   **Acceptance for 1.A:** `npm test` passes.

### 1.B — Move every literal and old constant onto `ROUTES` (one commit per slice)

6. **Slices, one commit each:** `components/` (navTabs, AppHeader); `app/` page files;
   `src/tracking`; `src/programs`; `src/goals`; `src/profile`; `src/settings`; `src/scenarios`;
   `src/inner-game`; `src/dashboard`; `src/home`; `src/timetrack`; `src/vice`; the 4 `app/test/`
   files that link into the product (`app/test/page.tsx`, `app/test/archive/quit-vice/routes.ts`,
   `app/test/archive/quit-vice/page.tsx`, `app/test/archive/goals-hub/page.tsx`).
   **`proxy.ts`** belongs to the `components/` commit: its `import { LIFE_MASTERY }` becomes
   `import { ROUTES }` and `pathname.startsWith(LIFE_MASTERY)` becomes
   `pathname.startsWith(ROUTES.plan)`; its `matcher` stays literal (step 8). In the same commit,
   `lifeMasteryRoutes.test.ts`'s check `expect(proxy).toMatch(/pathname\.startsWith\(LIFE_MASTERY\)/)`
   becomes `/pathname\.startsWith\(ROUTES\.plan\)/`.
   **`src/settings/config.ts`'s `paths` object is a second copy of two addresses: delete it**, and
   every `revalidatePath(SETTINGS_CONFIG.paths.settings|dashboard)` in `src/settings/actions.ts` (14
   calls) becomes `revalidatePath(ROUTES.settings|dashboard)`.
   **The same `components/` commit rewrites the premise test** in `routeReachability.test.ts`
   ("counts only navigation, never a path that is merely named", line ~435), which asserts the
   literal `'"/programs"'` in `navTabs.ts`: it becomes "navTabs.ts names `ROUTES.trackingHistory`
   as a label key (`toContain("[ROUTES.trackingHistory]")` on the file's text) and
   `[...linksIn([navTabs])]` does not contain the **value** `ROUTES.trackingHistory`
   (`not.toContain(ROUTES.trackingHistory)`, today `"/dashboard/tracking/history"`)" — a label, never
   a link; `/programs` is now a real `href:`.
   In `components/navTabs.ts`, `HIDDEN_ROUTE_PREFIXES` becomes exactly
   `[ROUTES.plan, ROUTES.trackingReview, ROUTES.liveWorkout, ROUTES.time]` (the same four it holds
   today: `LIFE_MASTERY`, `"/dashboard/tracking/review"`, `"/programs/live"`, `"/dashboard/time"`;
   quit-vice is under the plan). Keep its comments. Files and counts (non-comment occurrences):
   - `app/`: `dashboard/qa/page.tsx` (1), `dashboard/settings/page.tsx` (1),
     `dashboard/tracking/history/page.tsx` (3), `dashboard/tracking/session/page.tsx` (1),
     `life-mastery/page.tsx` (1), `manifest.ts` (1: `start_url` → `ROUTES.dashboard`),
     `preferences/archetypes/page.tsx` (1), `preferences/page.tsx` (1), `programs/live/page.tsx` (1),
     `programs/workout/[id]/page.tsx` (1), `qa/page.tsx` (1), `admin/ai-usage/page.tsx` (1)
   - `components/`: `AppHeader.tsx` (6), `navTabs.ts` (13)
   - `src/dashboard/components/DashboardContent.tsx` (5)
   - `src/goals/components/`: `new-goals/GoalsConfigStep.tsx` (1), `north-star/NorthStarFlow.tsx` (1),
     `north-star/RoutineCard.tsx` (1), `north-star/SeasonBand.tsx` (1),
     `north-star/WorkoutPrograms.tsx` (3), `tree-of-life/EmptyTreeState.tsx` (1)
   - `src/home/components/`: `Checkout.tsx` (1), `HomePage.tsx` (1)
   - `src/inner-game/components/`: `InnerGamePage.tsx` (2), `SummaryPage.tsx` (1), `WelcomeCard.tsx` (1)
   - `src/profile/`: `actions.ts` (11, all `revalidatePath`), `components/ArchetypeSelector.tsx` (1),
     `components/UserPreferences.tsx` (2), `loginDestinationService.ts` (1)
   - `src/programs/components/`: `BuildYourWeek.tsx` (1), `ProgramDetail.tsx` (1),
     `StartLooseWorkout.tsx` (2), `TrainingCard.tsx` (1), `TrainingScreen.tsx` (2),
     `live/LiveWorkoutScreen.tsx` (3)
   - `src/scenarios/components/ScenariosPage.tsx` (5)
   - `src/settings/`: `actions.ts` (1, plus the `"/scenarios"` and `"/programs"` `revalidatePath`
     calls), `components/SettingsPage.tsx` (1), `config.ts` (2, including `billingPortalReturnUrl`)
   - `src/timetrack/`: `components/TimetrackScreen.tsx` (1), `components/TogglLab.tsx` (1),
     `timetrackService.ts` (1: `startLinkFor`'s default `path`)
   - `src/tracking/components/`: `DailyReviewPage.tsx` (2), `FieldReportPage.tsx` (4),
     `ProgressDashboard.tsx` (1), `SessionDetailPage.tsx` (5), `SessionTrackerPage.tsx` (4),
     `VoiceRecorderButton.tsx` (1), `WeeklyReviewPage.tsx` (2), `dashboard/DailyReviewCard.tsx` (1),
     `dashboard/QuickActionsCard.tsx` (4), `dashboard/RecentFieldReportsCard.tsx` (3),
     `dashboard/RecentSessionsCard.tsx` (4; line 129 becomes `trackingSessionDetail(session.id)`),
     `dashboard/WeeklyReviewsCard.tsx` (1)
   - `src/vice/components/blackbox/BlackBoxPage.tsx` (2)
   **Every file** listed by `grep -rln "shared/lifeMasteryRoutes\|shared/trainingRoutes" app src components tests`
   (46 on 2026-10-13, including `app/life-mastery/layout.tsx` and three files under
   `app/test/archive/quit-vice/_module/`; tests are done in 1.C) changes its import: `LIFE_MASTERY`, `QUIT_VICE`, `TRACKING`, `PROGRAMS`, `LIVE_WORKOUT` become `ROUTES.plan`, `ROUTES.quitVice`, `ROUTES.tracking`, `ROUTES.training`,
   `ROUTES.liveWorkout`. `TRAINING_HISTORY`, `TRAINING_DOOR_API`, `workoutReceipt`, `programSession`
   and `withFrom` keep their names and move their import to `@/src/shared/routes`. A template such as
   `` `/dashboard/tracking?tab=week` `` becomes `` `${ROUTES.tracking}?tab=week` ``.
7. **The `/scenarios` bug:** `src/settings/actions.ts:98` becomes `revalidatePath(ROUTES.scenarios)`.
8. **Leave literal, on purpose:** `proxy.ts`'s matcher and `public/sw.js` (Next reads the matcher at
   build time and cannot evaluate an import; `sw.js` is served as plain JavaScript). Their agreement
   tests are in step 11.
9. **Finder for what is left** — must print nothing when 1.B is done (the two old route files are
   exempt until 1.C deletes them):
   `grep -rnE "([\"'\`]|next=)(/dashboard|/programs|/preferences|/life-mastery|/qa)([/?&\"'\`\$]|$)" --include=*.ts --include=*.tsx app src components | grep -vE ":\s*(\*|//)" | grep -vE "^(src/shared/routes|src/shared/lifeMasteryRoutes|src/shared/trainingRoutes)\.ts:"`
   (`next=` catches the two login redirects that carry a return address:
   `app/dashboard/time/page.tsx:28` and `app/programs/workout/[id]/page.tsx:29` become
   `` redirect(`/auth/login?next=${ROUTES.time}`) `` and `` redirect(`/auth/login?next=${ROUTES.training}`) ``.)
   (`proxy.ts` is not searched: its prefix list is rewritten in Phase 2.)

### 1.C — One owner (one commit)

10. **Delete `src/shared/lifeMasteryRoutes.ts` and `src/shared/trainingRoutes.ts`.** First move the
   remaining test importers (such as `tests/unit/goals/northStarSteps.test.ts`) to
   `@/src/shared/routes`, and reword comments that name the two files so they name
   `src/shared/routes.ts`. Then
   `grep -rn "shared/lifeMasteryRoutes\|shared/trainingRoutes" app src components tests | grep -vE ":\s*(\*|//)"`
   must print nothing. Remove the
   `LIFE_MASTERY`/`QUIT_VICE` special cases from `symbolicLinksIn` (the generic `ROUTES` resolver
   covers them). Keep `viceArchiveStep`/`QUIT_VICE_ARCHIVE` handling: they live in
   `app/test/archive/quit-vice/routes.ts` and stay there.
11. **`lifeMasteryRoutes.test.ts` → `tests/unit/navigation/routeList.test.ts`** (D11), generalised:
    - "is not written out by hand anywhere in the product" runs **for every `ROUTES` value**, using
      the file's existing `writesPath()` and `code()`. The only allowed file is
      `src/shared/routes.ts` (no folder exemption: after 1.B no page file needs one).
    - **New, the class behind the `/scenarios` bug:** "every `revalidatePath` target is a real
      page". Scan the **comment-stripped** source (`code()`) of every file in `app/` and `src/`
      (prose such as `profileService.ts:28`'s "revalidatePath()" must not count) for every
      `revalidatePath(` call. Its argument must be
      `ROUTES.x` or a string literal; **any other argument fails the test, naming the file and
      line** (so a new indirection cannot hide a dead target, as `SETTINGS_CONFIG.paths` did).
      Resolve `ROUTES.x` through `ROUTES`, and expect each target in `productRoutes()`. Before 1.B step 7
      this test would have failed on `"/scenarios"`; it must pass after.
    - "still has a page" runs for every `ROUTES` value (via `productRoutes()`).
    - "is gated by the proxy": read `proxy.ts` as text; collect the matcher prefixes with
      `/"(\/[^"]*?)\/:path\*"/g`; for every `ROUTES` value some prefix `p` satisfies
      `v === p || v.startsWith(p + "/")`. (Phase 2 replaces this with a behavioural test.)
    - "is named by the service worker": read `public/sw.js` as text; take what lies between
      `const SHELL_PATHS = [` and the next `]`; drop lines starting with `//`; collect the quoted
      strings. They equal exactly `[ROUTES.time, ROUTES.quitVice]`, and none is `QUIT_VICE_ARCHIVE`.
    - "keeps the old address working" and "is not reached through an address it has left" stay as
      they are until Phase 4 replaces them.
    - Its `import OldPlanPage from "../../../app/dashboard/goals/plan/page"` stays until Phase 3
      moves that file (then it must follow, see 3.3).
12. **e2e:** the 9 specs importing `@/src/shared/lifeMasteryRoutes` import `ROUTES` from
    `@/src/shared/routes` instead. Other e2e literals are updated in Phase 4.

**Acceptance (Phase 1):**
- `npm test` passes, including the new `revalidatePath` test; the finder in step 9 prints nothing.
- `npx playwright test --project=sweep-desktop --project=sweep-phone` passes (no `PW_BASE_URL`:
  Playwright starts the test backend and its own server).

## Phase 2 — The sign-in guard protects everything by default

**Depends on:** Phase 1. **Working state:** signed-in use unchanged; every page is private unless it
is `/`, under `/auth/`, or under `/test/` (never guarded; 404 in production by its own layout).
`git diff proxy.ts` must be clean before starting.

1. **Add to `src/shared/routes.ts`** (Appendix A, part 2): `isUnder()`, `isPublicPage()`,
   `LEGACY_ROUTES` (empty for now) and `legacyRedirect()`.
2. **Rewrite `proxy.ts`** to Appendix B: legacy redirect → `/api/test/` production gate → public pages
   skip `getUser()` → `getUser()` → `/api/timetrack/` answers 401 → every other `/api/` path passes
   through → anything else without a user goes to `/auth/login?next=<path+search>`. The separate
   `/admin` rule and `/lair` disappear (the default covers `/admin`). Keep the existing explanatory
   comments that still apply (`getUser()` not `getSession()`, `next` keeps the query string).
3. **Matcher**, literally:
   `["/((?!api/|_next/static|_next/image|.*\\..*).*)", "/api/test/:path*", "/api/timetrack/:path*"]`.
   Anything with a dot (`/sw.js`, `/manifest.webmanifest`, icons, `favicon.ico`) is excluded, and
   no page address contains a dot.
4. **`isActive()` moves:** delete the private `isActive` function from `components/MobileTabBar.tsx`
   (line 19), add it to `components/navTabs.ts` as an export —
   `export function isActive(pathname: string, href: string, exact: boolean) { return exact ? pathname === href : isUnder(pathname, href) }` —
   and import it in `MobileTabBar.tsx`. Its hidden-route check becomes
   `HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(pathname, p))`. `tabBarCurrent.test.tsx` must still pass
   unchanged.
5. **Tests**, in `tests/unit/navigation/proxyPrivateByDefault.test.ts`, modelled on
   `testRoutesSealed.test.ts` (`setNodeEnv`, `stubSupabaseEnv`, `req()`). Mock the network:
   `vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }))`.
   - For every route in `productRoutes()` except `/` and `/auth/*` (replace `[id]` with `x`): status
     307; parse the header (`new URL(res.headers.get("location")!)`, it is absolute) and expect
     `pathname === "/auth/login"` and `searchParams.get("next") === route`.
   - `/`, `/auth/login`, `/test/goals`: no `location` header.
   - `/api/tracking/stats` and `/api/test/scripts` (development): no login redirect.
   - `/api/timetrack/sync` without a user: 401.
   - `isUnder`: `/time` is not under `/timeline`'s prefix and vice versa; `/plan` is under `/plan`.
   - The old "is gated by the proxy" string check from 1.C step 11 is deleted (this replaces it).

**Status:** done 2026-10-15. Code `d36103d2` (2026-10-14). It reached production before its live
checks, because `main` was fast-forwarded on the owner's word on 2026-10-14 (`b55c374c`), so the
address check ran **on production itself** (`/api/healthz` buildId `3e72d130`, which contains it),
signed out: every product address, `/redirect` and `/admin/ai-usage` answer 307 to
`/auth/login?next=<path+query>` (`/dashboard/tracking?tab=week` keeps its query); `/`,
`/auth/login`, `/auth/sign-up`, `/sw.js`, `/manifest.webmanifest`, `/favicon.ico` and
`/icon-192.png` answer 200; `/test` 404; `/api/tracking/stats` and `/api/timetrack/sync` 401.
Sweep (`sweep-desktop` + `sweep-phone`, test backend): **106 passed (1.9m)**. A first run the same
morning had 3 junk-URL timeouts on phone while another session ran `blackbox.spec.ts` at 4
workers on the same `:3200` server; all three passed alone, and the full rerun on a quiet machine
passed. Offline specs against a production build of `fc3ec48e` on `:3100` (test backend):
`vice-offline.spec.ts` and `programs-offline.spec.ts` both **passed, neither skipped** (both now
in the `desktop` project). `tsconfig.json`, rewritten by the build, restored. The earlier
B-DISK stop (2026-10-14, 19.3 GiB) cleared: C: had 1,034 GiB free on 2026-10-15.

**Acceptance:** `npm test` passes. On `:3101` (Appendix C), signed out, the "before Phase 4" loop:
every product address answers 307 to login with `next`; `/`, `/auth/login`, `/sw.js` and
`/manifest.webmanifest` answer 200. The sweep projects still pass. **Build `:3100` now**
(Appendix C) and run the two offline specs; both pass, neither skipped.

## Phase 3 — One frame for the signed-in app

**Status:** done 2026-10-15. Commits `08cf882c` (steps 2–8, one commit as planned) and `1ca27fa8`
(step 9). Evidence: 4,743 unit tests green including `appFrame.test.tsx` (renders the real
`app/(app)/layout.tsx`); `site-frame.spec.ts` **14 passed** (7 framed destinations × laptop and
phone, fresh account, test backend); `mobile/mobile-navigation.spec.ts` passed in `phone` (now the
More sheet); `dashboard-navigation.spec.ts` passed 3 of 3 (one earlier 2 ms setup failure right
after another run, not reproduced); sweep **106 passed (2.3m)**; type check clean outside generated
build folders; lint 290, one fewer, baseline lowered. Screenshots at 1280 and 390 px (Settings,
Tracking, Training) looked right; they showed the header did not mark the current page in colour
and that Log Out scrolled out of view at 1280 in development, both fixed in `1ca27fa8`.
Differences from the steps: Q-ICON unanswered, so the header is text-only. While this ran, someone
made Your plan a tab and moved Time to More (`3f755a3b`); the frame and the spec read the lists, so
neither needed a change. Stale generated types for the old folder paths were deleted from `.next/`
and `.next-e2e/` (build output only); another session's `.next-verify` was left alone, so a local
type-ratchet run still lists its stale files.

**Depends on:** Phases 1–2. **Working state:** navigation on every signed-in page at both widths; no
tab destination poses as a child of the Dashboard; every address unchanged.

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` and
`layout.md` first.

**Commits:** step 1 alone (no behaviour change). **Steps 2–8 are one commit**: the move breaks
`tabBarDestinations`' `pageFor()` and removing the per-page bars breaks `mountsTheBar()` until
step 8's test changes land, so they cannot be split. Step 9 is its own commit. Check
`git status --short` for every file in steps 2–8 before starting; the commit is large.

1. **`components/AppLogo.tsx`:** move the logo `<Link href="/">` block out of `AppHeader.tsx`
   (line 251) so `AppHeader` and the frame share it. Add `shrink-0` to its class list so a crowded
   header never squeezes it.
2. **`components/AppFrame.tsx`** as Appendix E: a client component, no server data. Under a hidden
   prefix it renders the children bare (D15). Otherwise: the laptop header (`hidden sm:block`),
   built from `[...TABS, ...MORE_ITEMS]` using `isActive()`, with icons only if Q-ICON was answered
   yes, then the existing `signOut` form, then the development-only "Test Pages" link exactly as
   `AppHeader` does it; the children inside `<div className="pb-tab-bar">`; and `<MobileTabBar />`.
   Appendix E gives the classes (copied from `AppHeader.tsx`, `.claude/rules/ui.md`: reuse the
   nearest sibling) and **the test IDs the e2e helpers depend on**: `header-dashboard-link`,
   `header-life-mastery-link` (Your plan), `header-settings-link`, `header-logout-button`
   (`tests/e2e/helpers/selectors.ts:15–17`, `auth.helper.ts:207`).
3. **`app/(app)/layout.tsx`** renders `<AppFrame>{children}</AppFrame>`; nothing else. Then move,
   with history:
   ```
   mkdir -p "app/(app)"
   git mv app/dashboard "app/(app)/dashboard"
   git mv app/programs "app/(app)/programs"
   git mv app/preferences "app/(app)/preferences"
   git mv app/life-mastery "app/(app)/life-mastery"
   ```
   Before each `git mv`, `git status --short app/<folder>` must be empty (B-PEER-TREE). `app/page.tsx`,
   `app/auth/`, `app/admin/`, `app/redirect/`, `app/qa/`, `app/test/`, `app/api/` stay where they are.
   Update `lifeMasteryRoutes`→`routeList.test.ts`'s import to
   `"../../../app/(app)/dashboard/goals/plan/page"`, and `lintRatchet.test.ts:171`'s `"app/programs/"`
   to `"app/(app)/programs/"`.
4. **Remove every per-page frame:**
   - `<AppHeader …>`: `DashboardPage.tsx` (3 branches), `SettingsPage.tsx:229`,
     `app/(app)/dashboard/qa/page.tsx`, `…/articles/page.tsx` (2), `…/inner-game/page.tsx` (3).
   - `<MobileTabBar />`: `DashboardPage.tsx`, `SettingsPage.tsx`, `ScenariosHub.tsx`,
     `ProgressDashboard.tsx`, `TrainingScreen.tsx`, `…/qa/page.tsx`, `…/articles/page.tsx`,
     `…/inner-game/page.tsx`.
   - `pb-tab-bar` (the frame owns it now): `DashboardPage.tsx:76`, `…/articles/page.tsx:29`,
     `…/inner-game/page.tsx:45`, `…/qa/page.tsx:30`, `ScenariosHub.tsx:173`,
     `ProgressDashboard.tsx:81`, `TrainingScreen.tsx:207`, `SettingsPage.tsx:228` (and
     `WorkoutReceipt.tsx:293`, below). **Keep** it in `HomePage.tsx:21` (outside the frame).
   - `AppHeader` now serves only the public home page. Delete its `isPreviewMode` prop and the
     "Preview Mode" badge (`AppHeader.tsx:265–268`), stop passing `isPreviewMode` to `MobileNav`
     (`:275`) and delete that prop from `MobileNav` if nothing else passes it, and delete the
     `currentPage` values no page passes any more. **The "Subscribe" button stays** in `AppHeader`:
     the home page is the sales page, and D19 is about the frame only. Keep `MobileNav` for the home
     page.
   - `WorkoutReceipt.tsx:293`: remove only `pb-tab-bar` from the class list. It has a `BackLink` and
     no bottom bar of its own; the frame now pads it.
5. **Remove the fake back controls (D7):** `SettingsPage.tsx:234–237` (the
   `<Button … onClick={() => router.back()}>` "Back"; keep the `<h1>Settings</h1>` beside it, and
   remove `useRouter`/`ChevronLeft` imports if nothing else uses them); every `<header>` bar in `ScenariosPage.tsx` (the logo, "Preview Mode" pill and
   "Back to Dashboard" — the hub's own "Practice Scenarios" heading stays); `TrainingScreen.tsx`'s
   `<BackLink fallback="/dashboard" …>` (`:208–212`). Training's line at `:237` reads "part of your
   plan", still linking to `ROUTES.plan` (D3). **Do not touch** Inner Game's Exit and "Back to
   Dashboard", Time's `TogglLab backHref`, the plan's `backHref`, or any sub-page `BackLink`.
6. **Preferences:** `ArchetypeSelector.tsx:140`'s `BackLink` fallback becomes
   `ROUTES.scenarioPreferences`, label "Preferences".
7. **D14:** delete the home page's "Preview Dashboard" card (`HomePage.tsx:88–114`) and the
   signed-out branches: `DashboardPage.tsx`'s `if (!user)` branch (lines 45–52), `ScenariosPage.tsx`'s `if (!user)` branch, and the
   `!user` branches in `…/articles/page.tsx` and `…/inner-game/page.tsx`. **Each removed branch is
   replaced by one line, `if (!user) redirect("/auth/login")`** (add `import { redirect } from "next/navigation"`
   where it is missing; `redirect` returns `never`, so `user` is non-null after it). The proxy
   already sends signed-out visitors away first; this line is for the type checker and for defence
   in depth. Then remove the now-dead `viewer === "visitor"` variant from
   `src/dashboard/components/DashboardContent.tsx` (the type member and its branches, around lines
   34, 57, 66, 82 and 236). **Same commit:** `tests/unit/dashboard/dashboardViewer.test.tsx` tests
   that variant — change "a logged-out visitor is a visitor, with no profile" (line ~115) to "a
   logged-out visitor is sent to sign in":
   `await expect(DashboardPage()).rejects.toMatchObject({ digest: expect.stringContaining(";/auth/login;") })`
   (Next's real `redirect()` throws an error whose `digest` is `NEXT_REDIRECT;replace;<url>;307;`;
   the file does not mock `next/navigation`, and should not start to). Delete "a visitor is sent to
   sign up" (line ~169).
8. **Tests:** add `hasAppFrame(route, file)` to `tests/support/appRoutes.ts`: true when `file` sits
   under `app/(app)/` and `!HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(route, p))`.
   - `backNavigation.test.ts`: `const hasTabBar = …` becomes
     `const hasTabBar = hasAppFrame(route, file) || /<MobileTabBar[\s/>]/.test(tree)`. This is the
     test's own rule ("a route needs a BackLink unless the app's own navigation is on screen"): a
     framed sub-page is not a dead end. Sub-pages keep their `BackLink`s because D7 says so, not
     because this test forces it.
   - `tabBarDestinations.test.ts`: `mountsTheBar(page)` becomes `hasAppFrame(route, page)`; its
     premise test expects `/dashboard` true and `ROUTES.liveWorkout` false.
   - `pageFor(route)` in `tabBarDestinations` uses `productRoutes()` to find the file.
   - **`tests/unit/navigation/appFrame.test.tsx`**, modelled on `tabBarCurrent.test.tsx` (same
     `// @vitest-environment jsdom` line and the same `vi.mock("next/navigation", () => ({ usePathname: () => path }))`).
     Query inside the frame's `<header>` with `within(container.querySelector("header")!)`, because
     `MobileTabBar`'s own links render in jsdom too; count links inside the header's `<nav>` only
     (the logo link sits outside it). Mock `@/app/actions/auth` with
     `vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }))`. At `ROUTES.settings` the header
     `<nav>` has one link per item of `[...TABS, ...MORE_ITEMS]` with its `href` (plus "Test Pages"
     when `NODE_ENV` is development; vitest runs as "test", so not here), exactly one
     `aria-current="page"` (Settings), and a `<form>` with a "Log Out" button; at
     `ROUTES.liveWorkout` and `ROUTES.time` it renders the children and no link. **The wiring:**
     render the default export of `@/app/(app)/layout` around `<p>x</p>` at `ROUTES.dashboard` and
     expect the header `<nav>` and the `<p>`; without this, every other check passes from file paths
     alone even if the layout never draws the frame. **Never test sign-out by clicking it with a test account:**
     `signOut()` (`app/actions/auth.ts`) uses Supabase's default global scope, which ends *every*
     session of that account, including other sessions' browser tests.

9. **e2e that the frame changes:**
   - `tests/e2e/mobile/mobile-navigation.spec.ts` clicks the ☰ "Open menu" button that D9 removes.
     Rewrite its one test to the "More" sheet: at `/dashboard` on the phone project,
     `header-settings-link` is hidden; click the button named "More"; the sheet
     (`getByTestId("more-sheet")`) shows "Log Out"; click its "Settings" row; the sheet closes and
     the URL matches `ROUTES.settings`.
   - `tests/support/sweepDebt.ts`: if the frame raises a page's `TAP_TARGET_DEBT` count, fix the frame
     (every target at least 44 px) — never raise the number; the file says it may only go down.
   - **Create `tests/e2e/site-frame.spec.ts`** exactly as Appendix D, and add
     `/site-frame\.spec\.ts/` to `ON_OWN_ACCOUNTS` in `playwright.config.ts` (a file the test-cut
     session edits: only when `git status --short playwright.config.ts` is clean; otherwise ask
     `daygame-coach-ac` to add the line, and wait).

**Acceptance (no `PW_BASE_URL` anywhere; Playwright starts the test backend and its server):**
`npm test` passes; `npx playwright test tests/e2e/site-frame.spec.ts --project=desktop` passes
(14 tests: 7 framed destinations × 2 widths); `npx playwright test --project=sweep-desktop --project=sweep-phone`
passes; `npx playwright test tests/e2e/dashboard-navigation.spec.ts --project=chromium` and
`npx playwright test tests/e2e/mobile/mobile-navigation.spec.ts --project=mobile-iphone` pass.
**Never click Log Out on an account another test shares** (the `setup`-based projects): it ends
every session of that account. Specs on `ON_OWN_ACCOUNTS` (such as `auth.spec.ts` in `desktop`)
have their own account and may.

## Phase 4 — Addresses that say what belongs to what

**Status:** done 2026-10-15. Commits: `f2dfd1b9` (first, every test names pages through `ROUTES`
and `urlOf()`, so each section was a folder move, one value and one row), `c60d35cd` (1 Settings),
`150e0b62` (2 Scenarios + preferences), `60bd49fd` (3 Time + `sw.js`), `b0382c8c` (4 Coach, `/qa`
page deleted), `dfb52f12` (5 Articles), `70b1cc09` (6 Inner Game and 7 Tracking together: the route
list carried both), `fc2f7ec3` (8 Training), `1443aef7` (9 Plan + quit-vice, old plan page deleted,
`sw.js`, one-segment check on), `edeea95b` and `e7f8d1da` (browser-test follow-ups), `5fd39cfe`
(comments). Evidence on the test backend: the `curl` loops gave 307-to-login with `next` on all 17
product addresses, 200 on `/`, `/auth/login`, `/sw.js`, `/manifest.webmanifest`, and 308 on all 14
old addresses with the query kept (`/dashboard/time?start=1&description=x` → `/time?start=1&…`,
`/dashboard/goals/plan?step=today` → `/plan?step=today`); `site-frame.spec.ts` 14 passed with the
one-segment check; sweep **98 passed** (8 fewer tests: two redirect-only pages are gone; one phone
junk-URL timeout on `/plan?step=-1` in a first run passed 4 of 4 alone and in the full rerun, the
same plan page that timed out under load before any move); `vice-offline` and `programs-offline`
passed on a production build of `2a0563c8`; a full local run of the `desktop` and `phone` projects
gave 276 passed, 4 failed, 1 skipped (programs-offline under dev, by design): two were real and
fixed in `e7f8d1da` (Scenarios' removed Back button, a "first button on the page" that is now the
frame's), two passed alone and in a quiet rerun. `legacyRoutes.test.ts` checks the whole redirect
table. Differences from the steps: sections 6 and 7 share a commit; a converter turned three tests'
sample-data paths into route values, which broke when Tracking moved, and they were put back to
literals; 20 Playwright globs (`"**/programs/live"`) were missed by it and fixed in `edeea95b`; a
stale `:3100` server from the morning answered the first offline run until it was stopped by PID.

**Depends on:** Phases 1–3. **Working state:** the table in Part 1 is true; every old address
redirects permanently with its query string.

**Nine sections, one commit each, in this order.** Each commit contains all of its rows, because a
redirect to a page that has not moved is a 404, and a moved page without its redirect breaks
bookmarks.

| # | `git mv` (from → to, both under `app/(app)/`) | `ROUTES` changes | `LEGACY_ROUTES` rows added | Also |
|---|---|---|---|---|
| 1 | `dashboard/settings` → `settings` | `settings: "/settings"` | `/dashboard/settings` → `/settings` | |
| 2 | `dashboard/scenarios` → `scenarios`, then `preferences` → `scenarios/preferences` | `scenarios: "/scenarios"`, `scenarioPreferences: "/scenarios/preferences"`, `scenarioArchetypes: "/scenarios/preferences/archetypes"` | `/dashboard/scenarios` → `/scenarios`; `/preferences` → `/scenarios/preferences` | |
| 3 | `dashboard/time` → `time` | `time: "/time"` | `/dashboard/time` → `/time` | `public/sw.js` `SHELL_PATHS`: `"/dashboard/time"` → `"/time"` |
| 4 | `dashboard/qa` → `coach`; `git rm app/qa/page.tsx` | `coach: "/coach"` | `/dashboard/qa` → `/coach`; `/qa` → `/coach` | |
| 5 | `dashboard/articles` → `articles` | `articles: "/articles"` | `/dashboard/articles` → `/articles` | |
| 6 | `dashboard/inner-game` → `inner-game` | `innerGame: "/inner-game"` | `/dashboard/inner-game` → `/inner-game` | |
| 7 | `dashboard/tracking` → `tracking` (with its `layout.tsx`, `loading.tsx`, `TrackingAuthContext.tsx`) | the seven `tracking*` values: `/tracking…` | `/dashboard/tracking` → `/tracking` | |
| 8 | `programs` → `training` | `training: "/training"`, `liveWorkout: "/training/live"` | `/programs` → `/training` | `lintRatchet.test.ts`: `"app/(app)/programs/"` → `"app/(app)/training/"` |
| 9 | `life-mastery` → `plan`; `git rm -r "app/(app)/dashboard/goals"` | `plan: "/plan"`, `quitVice: "/plan/quit-vice"` | `/life-mastery` → `/plan`; `/dashboard/goals/plan` → `/plan` | `sw.js`: `"/life-mastery/quit-vice"` → `"/plan/quit-vice"`. Delete `SUPERSEDED_LIFE_MASTERY_PATHS` from `routes.ts`. In `routeList.test.ts` delete the tests "keeps the old address working: it redirects to Life Mastery, step and all" and "is not reached through an address it has already left", the `import OldPlanPage …` line, and the `next/navigation` `redirect` mock and `redirected` array if nothing else uses them (step 2 below replaces them). In `tests/e2e/site-frame.spec.ts`, enable the one-segment line |

In every section:

1. **Tests that name the old address.** Search both the plain and the regex-escaped form (e2e
   specs match URLs with regexes such as `/\/dashboard\/scenarios$/`):
   `grep -rlnF -e "<old address>" -e "$(printf '%s' '<old address>' | sed 's#/#\\/#g')" tests/`.
   Replace each occurrence that names our page with the `ROUTES` reference (import from
   `@/src/shared/routes`); in a regex, build it with
   `new RegExp(ROUTES.x.replace(/\//g, "\\/") + "$")` or match with `toHaveURL(new URL(ROUTES.x, base))`.
   In `tests/support/sweepDebt.ts` replace the key with the route-list value
   (`"/programs": 3` becomes `[ROUTES.training]: 3`) and keep the number; **a key whose page is
   deleted is deleted** (section 4: remove `"/qa"`; `"/dashboard/qa"` becomes `[ROUTES.coach]`).
   **A dirty test file is skipped, as in Phase 1:** if `git status --short <file>` is not empty,
   leave it, note it under the section, and message `daygame-coach-ac`. The old address it names
   still works through the redirect; come back to it after their commit. **Leave alone:** `tests/unit/shared/safeRedirect.test.ts` and
   `tests/unit/shared/errorScrub.test.ts` (paths there are sample data for pure functions), and the
   legacy test below (old addresses on purpose).
2. **`tests/unit/navigation/legacyRoutes.test.ts`.** **Section 1 creates it** with the checks that
   run over the whole table (they hold for any number of rows): every `from` has no page in
   `productRoutes()`; every `to` is in `productRoutes()`; no `to` is another row's `from` (no
   chains); no product file **other than `src/shared/routes.ts`** (which holds the table) writes a
   `from` address (reuse `writesPath()` and `code()` from `routeList.test.ts`, moved to
   `tests/support/appRoutes.ts`); `legacyRedirect("/dashboard")` is
   `null`; `legacyRedirect("/dashboard/settings")` is `"/settings"`; and through the proxy (same
   mocks as `proxyPrivateByDefault.test.ts`) `/dashboard/settings` answers 308 whose parsed
   `location` has `pathname === "/settings"` (the header is absolute; compare `pathname` and
   `search`, never the raw string).
   **Each later section adds one sample for its own rows:** section 3 adds
   `/dashboard/time?start=1&description=x` → 308 whose parsed `location` has `pathname === "/time"`
   and `search === "?start=1&description=x"`; section 7 adds `legacyRedirect("/dashboard/tracking/session/abc")`
   is `"/tracking/session/abc"`; sections 2, 4, 5, 6, 8 and 9 add `legacyRedirect(<from>)` equals
   `<to>` for each of their rows.
3. Re-read the comments in that section's files that mention the old address. Fix any that now say
   something false; leave dated history ("was at … until 2026-10-…").

**Acceptance (after section 9):**
- On `:3101`, Appendix C's legacy loop: every row answers 308 to its target with the query kept.
- On `:3101`, Appendix C's "after Phase 4" loop: every new address answers 307 to login signed out;
  the public ones answer 200.
- `npx playwright test tests/e2e/site-frame.spec.ts --project=desktop` passes; it reads `ROUTES`, so
  it now visits the new addresses, and its one-segment check holds.
- `npm test` passes; the sweep projects pass. **Rebuild `:3100` once now** (not per section) and run
  the two offline specs; both pass at the new addresses.
- `find "app/(app)/dashboard" -name page.tsx` prints only `app/(app)/dashboard/page.tsx`.
- `app/manifest.ts`'s `start_url` is still `/dashboard`.

## Phase 5 — The product map, and loose ends

**Depends on:** Phase 4.

**Status:** done 2026-10-15. `docs/product/map.md`: the frame paragraph, "Every address", the
access line and the slice lines describe the new structure; the orientation-test sentence is
gone. The acceptance grep (`[\` (]/(…old addresses…)\b` without `2026-`) prints nothing.
`docs/product/vision.md` item 45 has its dated line. Step 3 (the first-load bounce) was dropped in
the review: checks run on the test backend now, not through the shared live account.

1. **`docs/product/map.md`:**
   - rewrite "Every address in the product" using the **After** column of Part 1's table;
   - update the slice lines that name addresses (`timetrack/` "at `/dashboard/time`", `vice/`,
     `programs/`, the Life Mastery paragraphs);
   - replace "Signed out sees the home page and a preview dashboard" with "Signed out sees the home
     page and the sign-in pages";
   - delete the sentence claiming `tests/unit/architecture/orientation.test.ts` fails on a new route.
   Leave `docs/plans/*`: they are dated records.
2. **`docs/product/vision.md` item 45:** add a line dated with the day you write it (YYYY-MM-DD):
   "<date>: the address followed the form into Scenarios (`/scenarios/preferences`)."

**Acceptance:** `npm test` passes;
`grep -nE "/dashboard/(settings|tracking|scenarios|time|qa|articles|inner-game|goals)|/programs|/life-mastery|(^|[^s])/preferences" docs/product/map.md`
piped through `| grep -v "2026-"` prints nothing (every remaining mention of an old address sits
on a dated history line).

---

# ████ STOP — the AI returns to you here ████

Everything above is on `training-rebuild` and visible on `localhost:3000`. To show the friend (D17):
Vercel dashboard → the Preview deployment of the last commit → **Share** (B-PREVIEW). Or deploy
(B-DEPLOY), which also ships 440 other commits.

---

## Phase 6 — The friend looks again

1. On the shared URL: Appendix C's `curl` loops with `B=<that URL>` (old 308, new 307 signed out).
2. **You** sign in there with your own account and open each tab on a laptop and on a phone. (The
   browser tests cannot run there: a preview talks to the live project, and they only run on the
   test backend.)
3. Ask the friend his original question: "Does anything look like a subset of something it isn't?"
   Record his answer here, verbatim and dated.

## Phase 7 — API addresses (**not now**, D13)

Recorded for the database move.

| Family | Today | Problem |
|---|---|---|
| Gym | `/api/workouts/*` (12 routes), `/api/programs/*` (11), `/api/health/workout` and `/bests`, `/api/exercising/*` (3, test-only slice) | One feature, four prefixes |
| Plan | `/api/goals/*` (18), `/api/life-plan/*` (3), `/api/life-answers` | One feature, three prefixes |
| Vice | `/api/black-box` | Named after a screen |
| AI usage | `/api/api-ai-usage`, `/api/admin/{api-ai-stats,api-ai-usage,check-ai-logs,test-ai-logging,test-user-logging}` | `api` twice; test endpoints under admin |
| Test | `/api/test/*`, `/api/qa-test` | Sealed in production |
| Rest | `/api/tracking/*`, `/api/timetrack/*`, `/api/scenarios/*`, `/api/inner-game/*`, `/api/settings/*`, `/api/health/{nutrition,sleep,weight}`, `/api/qa`, `/api/errors`, `/api/whoami`, `/api/auth/destination` | Consistent enough |

---

# PART 2 — For the executing session

## Ground rules

- **The checkout is shared** (`ListAgents` on 2026-10-13: `-6e`, `-ac`, `-bf`).
  - Never `git stash`, `git add -A`, `git add .`, `git commit -a` or `--no-verify`.
  - Commit with `git commit --only <paths>`. **A new file must be added first, by name:**
    `git add <each new path>`, then `git commit --only <every path in the commit>`. A `git mv`
    stages both sides; list **both** the old and the new folder in `--only`. Edit a file only when
    `git status --short <file>` is clean, and check again just before committing. Never commit or
    revert another session's hunk. After a failed commit, `git restore --staged <your paths>` so
    nothing of yours is left staged for another session's `git commit`.
  - **Before each `git mv` under `app/`:** `git status --short <that folder>` must be empty.
  - When `.git/index.lock` exists, another session is mid-command: retry after a few seconds; never
    delete the lock.
  - If the hook fails on a test this plan did not touch, record B-PEER-TREE with the test and file,
    message the owning session (`-ac` for the test cut), and do work that needs no commit.
- **Never kill, start or restart `:3000`.** Checks run on `:3200` (Playwright's own), `:3101` and
  `:3100` (Appendix C); stop only `:3101` and `:3100` when done.
- **Never edit `next.config.mjs`.** Never read or print `.env.local` values, nor the test backend's
  keys (keep them in shell variables). Never write to the live database. **Every browser check runs
  on the local test backend**; set `PW_BASE_URL` only for Appendix C's `:3100` build.
- **Builds only through `npm run build`** (it keeps `--webpack` and the memory cap). **Before every
  build or server start, `df -h /mnt/c`; below 20 GB free on C:, stop (B-DISK).** Use only this
  plan's folders (`.next-site-build`, `.next-site-dev`), never another session's (`.next-verify`,
  `.next-prod`, `.next-e2e`), and delete them when a phase's checks are done.
- **Read Next's own docs before writing Next code** (`route-groups.md`, `layout.md`, `proxy.md` under
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`).
- **When a step and the code disagree** (a line number moved, a file was trimmed by the peer), find
  the same thing by its content, do what the step intends, and note the difference under the phase.
  If the intent itself no longer applies, stop and record it as a blocker rather than improvising.
- **Every phase ends with:** commit, push, read the CI run (`gh run list --branch training-rebuild --limit 3`),
  then write `**Status:** done <date>` and the evidence under that phase. **Judge your change by the
  `checks` job only.** Since `STAGING_PUBLISH` was switched on, every run also has an
  `image-staging` job that waits for `e2e.yml` on the same commit and fails when that fails; a red
  `image-staging` with a green `checks` is not this plan's failure (record it, do not chase it). A status-only commit to
  this file may carry `[skip ci]`.
- **Commit messages** follow the repository's style (`git log --oneline -10`): one sentence saying
  what is now true for a person using the app, or what was wrong, not the mechanics. For example:
  "Settings lives at /settings, and the old address still finds it". A short body for the why, then
  a blank line and the `Co-Authored-By:` trailer this session's instructions give.
- **The pre-push hook runs gitleaks** over the commits being pushed (`.husky/pre-push`, since
  `5036e193`). A finding refuses the push. Never bypass it. A genuine false positive gets its
  fingerprint added to `.gitleaksignore` with a one-line reason, in its own commit.
- **Versions:** `package.json` pins `next` 16.3.8 and Node ≥ 24, but the shared `node_modules` and
  `:3000` still run 16.3.5 on Node 20 until the owner moves them (Caddy plan, R11). Read the docs in
  `node_modules` as installed; do not run `npm install` or `npm ci`.
- **Playwright projects are being consolidated** by the test-cut session (`e10f08ee`: specs move
  one by one from the shared-account projects such as `chromium`, `training` and `mobile-iphone`
  into `desktop`, and those projects then go). Before running a spec in the project this plan
  names, run `npx playwright test <spec> --list`; if it lists nothing, find the spec's current
  project with `npx playwright test <spec> --list --project='*'` and use that one. Note the change
  under the phase.
- **`next dev` with a new `NEXT_DIST_DIR` rewrites `tsconfig.json`** (it appends that folder's
  `types` lines to `include`). Before committing, `git diff tsconfig.json`; if the only change is
  your folder's lines, `git restore tsconfig.json`. Never commit it.
- **The Playwright projects were consolidated on 2026-10-14**: `desktop`, `phone`, `timing`,
  `timing-phone`, `firefox`, `webkit`, `android` and the three `sweep-*`; `chromium`, `training`,
  `mobile-iphone` and the `setup` projects are gone, and lanes pick devices by tag (`@phone`,
  `@engine`, `@timing`; `.claude/rules/testing.md`). Every project name in this plan that no longer
  exists is resolved with the `--list` rule above.
- **"Outside this plan's diff"** (the escape clause) means: `git log <Start SHA>..HEAD --format=%h -- <failing test file> <file it tests>`
  lists no commit made by this session. Quote that command's output and the failing test's author
  (`git log -1 --format='%h %an %s' -- <file>`) when using the clause.
- **A permission refusal is a blocker, not a puzzle.** Quote it in the blocker table and continue with
  the next independent step.
- **Before calling the work done:** run `/code-review` and `/security-review` on `<start>..HEAD` for
  this plan's files; fix or record every finding; re-read each acceptance list against what was run.

## Files

**Created:** `src/shared/routes.ts`, `components/AppFrame.tsx`, `components/AppLogo.tsx`,
`app/(app)/layout.tsx`, `tests/unit/navigation/routeList.test.ts` (renamed from
`lifeMasteryRoutes.test.ts`), `proxyPrivateByDefault.test.ts`, `legacyRoutes.test.ts`.

**Moved:** `app/dashboard/`, `app/programs/`, `app/preferences/`, `app/life-mastery/` into
`app/(app)/` (Phase 3); then each section (Phase 4).

**Edited:** `proxy.ts`, `public/sw.js`, `components/navTabs.ts`, `components/AppHeader.tsx`,
`components/MobileTabBar.tsx`, the ~60 files of Phase 1 step 6, the files of Phase 3 steps 4–7,
`tests/support/appRoutes.ts`, `tests/support/sweepDebt.ts`, the navigation tests,
`tests/unit/lintRatchet.test.ts`, the tests and e2e specs that name moved addresses,
`docs/product/map.md`, `docs/product/vision.md`, this plan.

**Deleted:** `src/shared/lifeMasteryRoutes.ts`, `src/shared/trainingRoutes.ts`, `app/qa/page.tsx`,
`app/(app)/dashboard/goals/`.

**Not touched:** `next.config.mjs`, `app/manifest.ts`'s value, `src/db/`, API routes, code folder
names, `src/shared/iconRoles.ts`.

## What would make this plan wrong

- **If the peer deletes a navigation test outright,** its steps here disappear; `site-frame.spec.ts`
  and the sweep projects still cover the same ground.
- **If a nested layout under a route group remounts on every navigation** (the bar flickers or loses
  state between tabs), Phase 3's acceptance catches it. Then mount `AppFrame` in `app/layout.tsx`
  with a `usePathname()` check that skips `/`, `/auth/*`, `/admin/*`, `/redirect` and `/test/*`.
  The address work is unaffected.
- **If the wider matcher measurably slows navigation** (one `getUser()` per page load, as guarded
  pages already pay), generate an explicit matcher list instead and keep Phase 2's behavioural test.
- **If the laptop header looks crowded** (ten links scroll inside it below ~1100 px), put
  `MORE_ITEMS` behind one "More" menu in the header, as the phone does. One component; the data
  does not change.
- **If D8 is reversed** to a shell loading the remote site, nothing here breaks.
- **If the owner later renames a section,** it is one `ROUTES` value plus one `LEGACY_ROUTES` row;
  the existing row's `to` must then point at the newest address (the no-chains test enforces it).

---

# APPENDIX

## A. `src/shared/routes.ts`

**Part 1 — created in Phase 1 (today's values):**

```ts
/**
 * EVERY SIGNED-IN PAGE ADDRESS, IN ONE PLACE.
 * (Carry over the incident comments from lifeMasteryRoutes.ts and trainingRoutes.ts.)
 * `/`, `/auth/*`, `/redirect`, `/admin/ai-usage` and `/test/*` are deliberately not here (D20).
 */
export const ROUTES = {
  dashboard: "/dashboard",
  tracking: "/dashboard/tracking",
  trackingSession: "/dashboard/tracking/session",
  trackingReport: "/dashboard/tracking/report",
  trackingReview: "/dashboard/tracking/review",
  trackingDaily: "/dashboard/tracking/daily",
  trackingHistory: "/dashboard/tracking/history",
  scenarios: "/dashboard/scenarios",
  scenarioPreferences: "/preferences",
  scenarioArchetypes: "/preferences/archetypes",
  time: "/dashboard/time",
  coach: "/dashboard/qa",
  articles: "/dashboard/articles",
  innerGame: "/dashboard/inner-game",
  settings: "/dashboard/settings",
  training: "/programs",
  liveWorkout: "/programs/live",
  plan: "/life-mastery",
  quitVice: "/life-mastery/quit-vice",
} as const

export const trackingSessionDetail = (id: string): string => `${ROUTES.trackingSession}/${id}`
export const workoutReceipt = (workoutId: string): string => `${ROUTES.training}/workout/${workoutId}`
export const programSession = (enrollmentId: string): string =>
  `${ROUTES.training}?program=${encodeURIComponent(enrollmentId)}`
export const TRAINING_HISTORY = `${ROUTES.training}?tab=history`
export function withFrom(href: string, from: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`
}

/** An API address, here only because trainingRoutes.ts held it. No other API address joins (D13). */
export const TRAINING_DOOR_API = "/api/programs/today"

/** Removed in Phase 4, section 9; LEGACY_ROUTES replaces it. */
export const SUPERSEDED_LIFE_MASTERY_PATHS = ["/dashboard/goals/plan", "/test/life-mastery"] as const
```

**Part 2 — added in Phase 2:**

```ts
/** Is `pathname` this address or below it? Segment-aware: "/timeline" is not under "/time". */
export function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)
}

/**
 * The only pages a signed-out visitor may open. Everything else is private by default.
 * `/test` is here to keep today's behaviour: it was never guarded, and `app/test/layout.tsx`
 * answers 404 in production whoever asks.
 */
export function isPublicPage(pathname: string): boolean {
  return pathname === "/" || isUnder(pathname, "/auth") || isUnder(pathname, "/test")
}

/** Addresses that moved, and where they went. Filled section by section in Phase 4. */
export const LEGACY_ROUTES: ReadonlyArray<{ from: string; to: string }> = []

/** Where an old address now lives, or null. The longest matching `from` wins. */
export function legacyRedirect(pathname: string): string | null {
  let best: { from: string; to: string } | null = null
  for (const row of LEGACY_ROUTES) {
    if (isUnder(pathname, row.from) && (!best || row.from.length > best.from.length)) best = row
  }
  return best ? best.to + pathname.slice(best.from.length) : null
}
```

**Final values after Phase 4:** `dashboard` `/dashboard`; `tracking` `/tracking` and its six
sub-pages under `/tracking/`; `scenarios` `/scenarios`; `scenarioPreferences`
`/scenarios/preferences`; `scenarioArchetypes` `/scenarios/preferences/archetypes`; `time` `/time`;
`coach` `/coach`; `articles` `/articles`; `innerGame` `/inner-game`; `settings` `/settings`;
`training` `/training`; `liveWorkout` `/training/live`; `plan` `/plan`; `quitVice`
`/plan/quit-vice`. `LEGACY_ROUTES` holds the twelve rows of Phase 4's table.

## B. `proxy.ts` shape (Phase 2)

```ts
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const moved = legacyRedirect(pathname)
  if (moved) return NextResponse.redirect(new URL(moved + search, request.url), 308)

  if (pathname.startsWith("/api/test/")) {
    /* existing production gate, unchanged: 404 unless dev or ENABLE_TEST_ROUTES */
  }

  if (isPublicPage(pathname)) return NextResponse.next()

  const response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(/* unchanged, including setAll onto `response` */)
  const { data: { user } } = await supabase.auth.getUser()

  if (pathname.startsWith("/api/timetrack/") && !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (pathname.startsWith("/api/")) return response

  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url)
    redirectUrl.searchParams.set("next", pathname + search)
    return NextResponse.redirect(redirectUrl)
  }
  return response
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)", "/api/test/:path*", "/api/timetrack/:path*"],
}
```

## C. Servers and `curl` checks — all on the local test backend

```bash
# 1. The test backend's settings, once per shell. Kept in variables: never echo them.
export E2E_STACK_ENV="$(node scripts/db/test-stack.mjs up)"
export NEXT_PUBLIC_SUPABASE_URL="$(jq -r .API_URL <<<"$E2E_STACK_ENV")"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(jq -r .ANON_KEY <<<"$E2E_STACK_ENV")"
export SUPABASE_SERVICE_ROLE_KEY="$(jq -r .SERVICE_ROLE_KEY <<<"$E2E_STACK_ENV")"
# Next does not let .env.local override variables already set, so both servers below use these.

# 2. Dev server for the curl loops (never :3000). Background; stop it when done.
NEXT_DIST_DIR=.next-site-dev npx next dev -p 3101

# 3. Production build for the two offline specs only. Build at the end of Phase 2 and again at the
#    end of Phase 4. The NEXT_PUBLIC_ values are baked in at build time, hence step 1 first.
NEXT_DIST_DIR=.next-site-build npm run build
NEXT_DIST_DIR=.next-site-build npx next start -p 3100          # background; stop it when done
PW_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/vice-offline.spec.ts --project=chromium
PW_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/programs-offline.spec.ts --project=training
# Each spec lives in a different project (chromium ignores programs-offline). "Skipped" is not a
# pass: vice-offline skips when no service worker controls the page. If a spec cannot sign in on
# this server, record B-STACK with its output rather than pointing it anywhere else.

B=http://localhost:3101

# BEFORE PHASE 4 (Phase 2's check). Signed out: product addresses → 307 to login; the last four → 200.
for p in /dashboard /dashboard/tracking /dashboard/tracking/session /dashboard/tracking/history \
         /dashboard/scenarios /preferences /dashboard/time /dashboard/qa /dashboard/articles \
         /dashboard/inner-game /dashboard/settings /programs /programs/live /life-mastery \
         /life-mastery/quit-vice /redirect /admin/ai-usage \
         / /auth/login /sw.js /manifest.webmanifest; do
  printf "%-32s " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B$p"; done

# AFTER PHASE 4. Signed out: product addresses → 307 to login; the last four → 200.
for p in /dashboard /tracking /tracking/session /tracking/history /scenarios /scenarios/preferences \
         /time /coach /articles /inner-game /settings /training /training/live /plan /plan/quit-vice \
         /redirect /admin/ai-usage \
         / /auth/login /sw.js /manifest.webmanifest; do
  printf "%-32s " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B$p"; done

# AFTER PHASE 4. Old addresses → 308 to the new one, query kept.
for p in /dashboard/settings /dashboard/scenarios /preferences /preferences/archetypes \
         "/dashboard/time?start=1&description=x" /dashboard/qa /qa /dashboard/articles \
         /dashboard/inner-game /dashboard/tracking/session /programs/live /life-mastery/quit-vice \
         "/dashboard/goals/plan?step=today"; do
  printf "%-40s " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B$p"; done
```

## D. The frame check: `tests/e2e/site-frame.spec.ts` (created in Phase 3)

The friend's complaint as a permanent test. It runs on its own fresh account in the test backend
(`ON_OWN_ACCOUNTS`, `desktop` project). It reads `TABS`, `MORE_ITEMS` and `ROUTES`, so Phase 4's
moves need no edit here. A fresh account is unpaid: Ask Coach redirects it to the Dashboard and
Scenarios shows the preferences form; both are still inside the frame, which is what is checked.

```ts
import { test, expect } from "./fixtures/test"
import { HIDDEN_ROUTE_PREFIXES, MORE_ITEMS, TABS } from "@/components/navTabs"
import { isUnder } from "@/src/shared/routes"

/**
 * EVERY TAB DESTINATION HAS THE APP'S NAVIGATION, AND NONE POSES AS A CHILD OF ANOTHER PAGE.
 *
 * A friend opened the site on 2026-10-13 and said Settings looked like "a subset of something".
 * It did: Settings drew "‹ Back", Scenarios "Back to Dashboard", Training "← Dashboard", and on a
 * laptop Tracking had no navigation at all. Plans/site-structure.md.
 */
const ITEMS = [...TABS, ...MORE_ITEMS]
const FRAMED = ITEMS.filter((item) => !HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(item.href, p)))
const WIDTHS = [
  { name: "laptop", viewport: { width: 1280, height: 800 }, labels: ITEMS.map((i) => i.label) },
  { name: "phone", viewport: { width: 390, height: 844 }, labels: TABS.map((t) => t.label) },
]

for (const item of FRAMED) {
  for (const width of WIDTHS) {
    test(`${item.label} on a ${width.name}: the app's navigation, no back control`, async ({ page }) => {
      await page.setViewportSize(width.viewport)
      await page.goto(item.href)
      await page.waitForLoadState("networkidle")
      const seen = await page.evaluate(() => {
        const visible = (el: Element) => {
          const s = getComputedStyle(el)
          const b = el.getBoundingClientRect()
          return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0
        }
        const text = (el: Element) => (el as HTMLElement).innerText.trim()
        return {
          navLinks: [...document.querySelectorAll("nav")].filter(visible)
            .flatMap((nav) => [...nav.querySelectorAll("a")].filter(visible).map(text)),
          backControls: [...document.querySelectorAll("a, button")]
            .filter((el) => visible(el) && !el.closest("nav"))
            .map(text)
            .filter((t) => /^(←\s*)?back\b|^←|^‹/i.test(t) || t === "Dashboard"),
        }
      })
      for (const label of width.labels) expect(seen.navLinks).toContain(label)
      expect(seen.backControls).toEqual([])
      // One segment: a tab destination is not part of another page.
      expect(item.href.split("/").filter(Boolean)).toHaveLength(1)
    })
  }
}
```

**The one-segment line fails until Phase 4** (`/dashboard/settings` has two). In Phase 3 add it
commented out with `// enabled in Phase 4`; Phase 4's section 9 commit enables it.

**Phase 0 evidence** — what the same measurements showed on 2026-10-13, taken with a scratch script
through the shared live test account on `:3000` (the method the executor must not repeat; see
B-STACK). One line per page and width: the address, the links in each visible `<nav>`, and on-page
back controls.

```
phone /dashboard               {"url":"/dashboard","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":[]}
phone /dashboard/settings      {"url":"/dashboard/settings","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":["Back"]}
phone /dashboard/tracking      {"url":"/dashboard/tracking","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":[]}
phone /dashboard/scenarios     {"url":"/dashboard/scenarios","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":["Back to Dashboard"]}
phone /programs                {"url":"/programs","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":["Dashboard"]}
phone /dashboard/time          {"url":"/dashboard/time","nav":[""],"back":["←\nDashboard"]}
phone /life-mastery            {"url":"/life-mastery","nav":[""],"back":["Dashboard"]}
phone /preferences             {"url":"/preferences","nav":[],"back":[]}
phone /dashboard/qa            {"url":"/dashboard/qa","nav":["Dashboard|Training|Tracking|Scenarios|Time"],"back":[]}
desk  /dashboard               {"url":"/dashboard","nav":["Your plan|Ask Coach|Articles|Settings|Test Pages"],"back":[]}
desk  /dashboard/settings      {"url":"/dashboard/settings","nav":["Dashboard|Your plan|Ask Coach|Articles|Test Pages"],"back":["Back"]}
desk  /dashboard/tracking      {"url":"/dashboard/tracking","nav":[],"back":[]}
desk  /dashboard/scenarios     {"url":"/dashboard/scenarios","nav":[],"back":["Back to Dashboard"]}
desk  /programs                {"url":"/programs","nav":[],"back":["Dashboard"]}
desk  /dashboard/time          {"url":"/dashboard/time","nav":[""],"back":["←\nDashboard"]}
desk  /life-mastery            {"url":"/life-mastery","nav":[""],"back":["Dashboard"]}
desk  /preferences             {"url":"/preferences","nav":[],"back":[]}
desk  /dashboard/qa            {"url":"/dashboard/qa","nav":["Dashboard|Your plan|Articles|Settings|Test Pages"],"back":[]}
```

## E. `components/AppFrame.tsx` shape (Phase 3)

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { signOut } from "@/app/actions/auth"
import { AppLogo } from "@/components/AppLogo"
import { MobileTabBar } from "@/components/MobileTabBar"
import { Button } from "@/components/ui/button"
import { HIDDEN_ROUTE_PREFIXES, MORE_ITEMS, TABS, isActive } from "@/components/navTabs"
import { ROUTES, isUnder } from "@/src/shared/routes"

/** The e2e helpers find these (tests/e2e/helpers/selectors.ts). Same IDs AppHeader used. */
const TEST_IDS: Record<string, string> = {
  [ROUTES.dashboard]: "header-dashboard-link",
  [ROUTES.plan]: "header-life-mastery-link",
  [ROUTES.settings]: "header-settings-link",
}

/** The signed-in app's navigation. No server data, by design (D8 of own-platform-and-app.md). */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(pathname, p))) return <>{children}</>

  const items = [...TABS, ...MORE_ITEMS].map((item) => ({ ...item, exact: "exact" in item ? item.exact : false }))
  return (
    <>
      <header className="hidden sm:block border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          {/* Ten destinations plus Log Out do not fit beside the logo below ~1100px. The nav scrolls
              inside the header instead of pushing the page sideways (the sweep checks that). */}
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {items.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm" className="shrink-0 text-foreground hover:text-primary"
                data-testid={TEST_IDS[item.href]}>
                <Link href={item.href} aria-current={isActive(pathname, item.href, item.exact) ? "page" : undefined}>
                  {/* Q-ICON: only if the plan holds the line "Q-ICON: yes": <item.icon className="size-4 mr-2" /> */}
                  {item.label}
                </Link>
              </Button>
            ))}
            {process.env.NODE_ENV === "development" && (
              <Button asChild variant="ghost" size="sm" className="shrink-0 text-amber-500 hover:text-amber-400">
                <Link href="/test">Test Pages</Link>
              </Button>
            )}
            <form action={signOut}>
              <Button variant="ghost" type="submit" size="sm" className="shrink-0 text-foreground hover:text-primary"
                data-testid="header-logout-button">
                Log Out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="pb-tab-bar">{children}</div>
      <MobileTabBar />
    </>
  )
}
```

`app/(app)/layout.tsx`:

```tsx
import type { ReactNode } from "react"
import { AppFrame } from "@/components/AppFrame"

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>
}
```

---

## Execution prompt — Phases 1–5. Paste after `/goal`.

```
Execute Plans/site-structure.md, Phases 1 to 5 in order, and stop at its STOP line. Read the whole plan first, including the DECISIONS table (all final), the Still-open table, Part 2's ground rules and the Appendix, and follow them. First record the Start SHA under Phase 1 as the plan says. Q-ICON: build the laptop header text-only unless the line "Q-ICON: yes" appears in the plan; never infer it, never wait for it. The goal is met only when all of these are true and shown in this session: (1) every step of Phases 1-5 is marked in the plan either done, with its acceptance check actually run (command and decisive output quoted under that phase), or "blocked: <ID>" with the refusal or the peer's dirty files quoted; nothing after the STOP line was started. (2) Phase 1 step 9's finder prints nothing, and grep -rn "shared/lifeMasteryRoutes\|shared/trainingRoutes" app src components tests | grep -vE ":\s*(\*|//)" prints nothing. (3) On the local test backend (never the live project): npx playwright test tests/e2e/site-frame.spec.ts --project=desktop passes with its one-segment check enabled; on the :3101 server of Appendix C, the "after Phase 4" loops show every product address answering 307 to /auth/login with next when signed out, /, /auth/login, /sw.js and /manifest.webmanifest answering 200, and every old address answering 308 to its new one with the query string kept. (4) npm test passes; the sweep-desktop and sweep-phone projects pass; dashboard-navigation.spec.ts (chromium) and mobile/mobile-navigation.spec.ts (mobile-iphone) pass; against Appendix C's production build on :3100, vice-offline.spec.ts passes in the chromium project and programs-offline.spec.ts in the training project, neither skipped. (5) Every commit added new files by name, used git commit --only <paths>, passed the pre-commit hook, and was pushed to origin training-rebuild through the gitleaks pre-push hook without bypassing it; each phase's CI run was read; Status lines and the blocker table say what happened; /code-review and /security-review ran on <Start SHA>..HEAD for this plan's files with every finding fixed or recorded. (6) The final reply starts with what is not yet true. Escape clause: if (3) or (4) cannot be met because of a permission refusal, an open blocker, or a failure outside this plan's diff as Part 2 defines it (quote the git log output and the test's author), record it as a blocker in the plan and that condition counts as met. While working: other sessions share this checkout. Never git stash, git add -A or --no-verify; edit a file only when git status --short shows it clean, including test, e2e and playwright.config.ts files; before each git mv under app/, check that folder has no uncommitted changes; never delete .git/index.lock; commit only your own files. Never kill, start or restart the :3000 dev server; never edit next.config.mjs; never run npm install or npm ci; never read or print .env.local values or the test backend's keys; never write to the live database; run every browser check on the local test backend and set PW_BASE_URL only for the :3100 build; never click Log Out on an account another test shares. Build only through npm run build. When a step and the code disagree, find the same thing by content and do what the step intends, noting the difference; if the intent no longer applies, record a blocker instead of improvising. When the permission system refuses something, record the exact message and continue with the next independent step. Put doubt in the first line of every report, not the last.
```
