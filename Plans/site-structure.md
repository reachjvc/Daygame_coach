# Site structure: addresses that say what belongs to what, and one frame around every page

**Status:** Phase 0 done 2026-10-13, in the session that wrote this plan. Phases 1–6 can run without
you, apart from the blockers listed below. Phase 7 is after the STOP line and needs you (a deploy or
a share link).

**Written 2026-10-13** for the owner, and for the AI session that will carry it out. A friend opened
`daygame-coach.vercel.app` and said the site "appears weird": Settings looks like a subset of
something, and the sections are not logical slices. This plan checks that claim against the site
itself, says what causes it, and fixes every instance of it, not only the ones he saw.

**Where it sits.** It delivers part of vision item 38 ("Dashboard, front page, settings and every other
page need another pass") and item 12 ("It works on a phone and in a browser"). It finishes item 32
("Preferences onboarding moves … into daygame / Scenarios where it belongs"), which moved the form
but left its address at `/preferences`. It has to stay compatible with D8 of
`docs/plans/own-platform-and-app.md` (the phone app is Capacitor with bundled assets), and it must not
collide with `docs/plans/tests-worth-their-keep.md`, which is cutting the same test files right now
(B-PEER-TREE).

---

# PART 1 — In plain words

## Words used here

| Word | Meaning |
|---|---|
| Address, route | What appears after the domain in the browser bar, such as `/dashboard/settings`. |
| Tab destination | A page the bottom tab bar or the "More" sheet opens directly: Dashboard, Training, Tracking, Scenarios, Time, Your plan, Ask Coach, Articles, Settings. It is a place in its own right, not a child of another page. |
| Sub-page | A page you reach from inside a tab destination, such as a single tracking session. It has a back link to its parent. |
| Frame | The navigation drawn around every page: the header at the top on a laptop and the tab bar at the bottom on a phone. |
| Layout | A Next.js file (`layout.tsx`) that wraps every page inside its folder. It is how one frame reaches many pages without each page drawing it. |
| Route group | A folder whose name is in brackets, such as `app/(app)/`. It shares a layout between pages **without appearing in the address**. |
| Proxy | `proxy.ts`, Next 16's name for middleware. It runs before every matched request; this app uses it to send signed-out visitors to the login page. |
| Redirect, 308 | An answer that says "this page has moved permanently to …". Browsers follow it automatically, keep the query string, and remember it. |
| Route list (registry) | The one file, `src/shared/routes.ts`, that will hold every page address. Everything else imports from it. |
| Service worker | `public/sw.js`, a script the browser keeps that lets two pages open with no network (the time tracker and the Black Box). |
| Preview deployment | The copy of the site Vercel builds for every push to a branch other than `main`. |
| D8 | The decision in `docs/plans/own-platform-and-app.md` that the phone app is built with Capacitor, with the web pages bundled inside it. Server-only code does not run there. |

## What the friend saw, and why it is an old build

- **`daygame-coach.vercel.app` serves `main` at commit `c1680654`, from 2026-09-17.** GitHub's
  deployment record for the Production environment says so. Your daily build, `training-rebuild`,
  is **440 commits ahead** of it.
- The problem he described is present on both. On the current branch it is slightly worse, because
  `/life-mastery` added another top-level address with yet another name.
- **Nothing in this plan reaches him until something is deployed.** `main` can be fast-forwarded
  without conflicts, but that redeploys production with 440 commits at once (B-DEPLOY). The other
  route is a preview link (B-PREVIEW).

## What is wrong — four things with one cause

### 1. The addresses do not say what belongs to what

Seven separate sections sit under `/dashboard/`, as if they were parts of the landing page:

`/dashboard/settings`, `/dashboard/tracking`, `/dashboard/scenarios`, `/dashboard/time`,
`/dashboard/qa`, `/dashboard/articles`, `/dashboard/inner-game`

Sections of the same rank sit at the top level instead: Training at `/programs`, the dating answers
at `/preferences`, and the plan at `/life-mastery`. On the live site, `/settings`, `/tracking`,
`/scenarios`, `/training` and `/time` all answer "not found" (checked with `curl`, 2026-10-13).

### 2. Most sections have two or three names

| What you tap | Its address | Its code folder |
|---|---|---|
| Training | `/programs` | `src/programs/` |
| Ask Coach | `/dashboard/qa` | `src/qa/` |
| Your plan | `/life-mastery` (its page heading says "Life Mastery") | `src/goals/` |
| Time | `/dashboard/time` | `src/timetrack/` |
| (dating answers) | `/preferences` | `src/profile/` |

Training's own heading adds a third claim about where it belongs: "Training · part of your Life
Mastery plan", under a "← Dashboard" link, at an address that is neither.

### 3. There is no shared frame, so every page draws its own (or doesn't)

No layout covers the signed-in pages, so each page decides whether to draw the header and the tab
bar. This is what the friend most likely felt. Checked on 2026-10-13 by signing in as the test
account on `localhost:3000` (the current branch) and screenshotting each page at phone width
(390 px) and laptop width (1280 px):

| Page | Phone | Laptop |
|---|---|---|
| Dashboard | tab bar | header: Your plan · Ask Coach · Articles · Settings · Log Out. **Training, Tracking, Scenarios and Time are not in it.** |
| Settings | app header with ☰ menu, **"‹ Back"**, and the tab bar: three navigation systems | header and **"‹ Back"** |
| Tracking | tab bar | **nothing: no header, no links, no way back.** Only the browser's Back button. |
| Scenarios | its own "Scenarios" header with **"← Back to Dashboard"**, plus the tab bar | the same header, **no site navigation** |
| Training | **"← Dashboard"**, "part of your Life Mastery plan", tab bar | **"← Dashboard"** only |
| Time | its own header with **"← Dashboard"** and its own bottom bar | the same |
| Your plan | its own header and controls | the same |
| Preferences | **nothing** | **nothing** |
| Ask Coach | header and tab bar | header |

So **every tab destination presents itself as a child of Dashboard**: Settings with "Back", Scenarios
with "Back to Dashboard", Training and Time with "← Dashboard". On a laptop, three sections cannot be
left at all except with the browser. The tab bar is `sm:hidden`, so above 640 px it does not exist,
and the desktop header is mounted on only five pages.

### 4. The rules about addresses live in hand-kept lists that drift

- **Addresses are typed out by hand in about 60 app files** (the list is in Phase 1), plus 87 test
  files. Three files each hold part of a route list: `components/navTabs.ts`,
  `src/shared/lifeMasteryRoutes.ts` and `src/shared/trainingRoutes.ts`.
- **One has already drifted.** `src/settings/actions.ts:98` refreshes `/scenarios` after you change
  difficulty, an address that has never existed, so the Scenarios page is never refreshed.
- **The sign-in guard is a hand-kept list of address prefixes**, typed twice in `proxy.ts` (the check
  and the `matcher`). A page outside the list is not guarded by the proxy. Moving Tracking to
  `/tracking` without editing both lists would leave it guarded only by whatever check the page does
  itself. The list also still names `/lair`, a page deleted on 2026-09-09.
- **The service worker's list of pages that work offline** (`public/sw.js`) is a third hand-kept copy.

**The cause of all four: no single place owns the app's structure.** Each page decides its own frame;
each file types its own addresses; each list keeps its own copy.

## The short answer

1. **One route list** that every file imports. Nothing visible changes, but every later step becomes
   a small edit, and the `/scenarios` bug is fixed on the way.
2. **The test tooling learns route groups and layouts**, so the navigation checks keep working when
   the frame moves into a layout.
3. **The sign-in guard protects everything by default** and lists only what is public (the home page
   and `/auth/*`). Pages can then move without falling out of the guard.
4. **One frame for the signed-in app.** A route group layout draws the header on a laptop and the tab
   bar on a phone, from the same list. Every page gets navigation at every width, and the fake
   "Back to Dashboard" controls on tab destinations go.
5. **New addresses**, one top-level address per tab destination and named after its tab. A deeper
   address only when the page really is part of the page above it. Old addresses redirect permanently,
   from one table.
6. **Clean-ups found on the way**, then the product map is updated.
7. **After the STOP line: show the friend**, through a deploy or a preview share link.

## The rule for addresses after this plan

> **A path segment means "is part of".** A tab destination gets its own top-level address, named what
> its tab says. A page goes deeper only if you reach it from inside its parent and it makes no sense
> without it.

| Today | After | Why |
|---|---|---|
| `/dashboard` | `/dashboard` (unchanged) | It is the Dashboard tab; it is the installed app's start page (`app/manifest.ts`) and where login lands |
| `/dashboard/tracking` and `/session`, `/session/[id]`, `/report`, `/review`, `/daily`, `/history` under it | `/tracking/…` (same sub-pages) | A tab |
| `/dashboard/scenarios` | `/scenarios` | A tab |
| `/preferences`, `/preferences/archetypes` | `/scenarios/preferences`, `/scenarios/preferences/archetypes` | Vision item 32, and the page's own words: "These answers shape the people you meet in scenarios. Nothing else in the app uses them." Settings links to it (Q1) |
| `/dashboard/time` | `/time` | A tab |
| `/dashboard/qa` | `/coach` | Its label is "Ask Coach" (Q2) |
| `/dashboard/articles` | `/articles` | A "More" destination |
| `/dashboard/inner-game` | `/inner-game` | A destination opened from a Dashboard card; not part of the Dashboard |
| `/dashboard/settings` | `/settings` | A "More" destination |
| `/programs`, `/programs/live`, `/programs/workout/[id]` | `/training`, `/training/live`, `/training/workout/[id]` | Its label is "Training" (Q4) |
| `/life-mastery` | `/plan` | Its label is "Your plan" (Q3) |
| `/life-mastery/quit-vice` | `/plan/quit-vice` | You reach it from the Vices card inside the plan, so nesting it is accurate (Q6) |
| `/qa`, `/dashboard/goals/plan` (pages that only redirect) | deleted; the redirect table sends them to `/coach` and `/plan` | One table of old addresses instead of stub pages |
| `/`, `/auth/*`, `/redirect`, `/admin/ai-usage`, `/test/*` | unchanged | Not part of the problem |

## What this plan deliberately does not do

- **It does not rename code folders.** `src/programs/` → `src/training/` and the rest would touch
  200+ files and change nothing a person sees. The route list is where a folder name and an address
  meet, so the mismatch stays in one readable place (Q12).
- **It does not rename API addresses.** The gym's data is spread across `/api/workouts`,
  `/api/programs` and `/api/health/workout`, the plan's across `/api/goals`, `/api/life-plan` and
  `/api/life-answers`, and the vice record sits at `/api/black-box`. It is the same problem, but no
  visitor sees it, and the database move will reshape that layer anyway. Phase 8 records the
  inventory, marked "not now" (Q13).
- **It does not bring back `tests/unit/architecture/orientation.test.ts`.** That test failed when a
  new route appeared that `docs/product/map.md` did not list. It was deleted in `2fea6697`, and on
  2026-10-13 you said the rule probably did not make sense. `docs/product/map.md` still claims the
  test exists; Phase 6 removes that sentence.
- **It does not change who may see what.** Paid gating stays inside the pages that have it. The frame
  is navigation only.

## Future-proofing, said before anything is built

- **D8 (Capacitor, bundled assets) means server-only code does not run in the phone app.** So the new
  frame is a client component with **no server data**. It does not fetch the user, the purchase state
  or the profile. The `(app)` layout adds no sign-in check of its own: the proxy owns that for the
  website, and the pages keep their existing checks. Anything else would add server-only logic that
  D8 must later remove.
- **The redirects and the proxy are website-only.** That is correct: a freshly installed app has no
  old bookmarks. The route list itself is plain data, and it is what the phone app's notification
  links (vision item 48) will need.
- **Addresses become expensive to change once notifications link into them.** Today nobody else uses
  the app, and the only bookmarks are yours. This is the cheapest the move will ever be.

## Security, stated plainly and unasked

- **Today, a page outside the proxy's prefix list is unguarded at the edge.** Each page that reads
  data also checks sign-in itself, or the layout above it does (checked: each page file or the
  component it renders calls `getUser()`/`requireAuth()`; Tracking's sub-pages are covered by
  `app/dashboard/tracking/layout.tsx`, and quit-vice by `app/life-mastery/layout.tsx`), and the database
  enforces row-level security. So nothing leaks today. The risk is the move itself: Phase 5 would
  create six new top-level prefixes. **Phase 3 inverts the guard before anything moves**, so a page
  is private unless it is on a short public list. A forgotten page then fails closed.
- **Server actions are guarded by the proxy only on the address of the page that uses them** (Next's
  own warning, `proxy.md` "Execution order"). Checked one by one: all 17 exported actions in
  `src/settings/actions.ts` (11) and `src/profile/actions.ts` (6) call `requireAuth()` or `getUser()`
  themselves; `signOut` in `app/actions/auth.ts` needs none. Phase 5 must not move a server action into a file that skips that check.
- **The signed-out preview branches are dead code.** `DashboardPage`, the Articles page and the Inner
  Game page each render a signed-out "preview", but the proxy redirects signed-out visitors before
  any of them run. The home page's "Preview Dashboard" button therefore opens the login page (checked
  on the live site). This is not a leak, only a broken promise (Q14).
- **The test API routes are sealed** (checked live: `/api/test/*` answers 404, `/api/admin/*` 401,
  `/api/qa-test` requires a paid account). Nothing to do.

---

# BLOCKERS — things only a person can do, or that wait on someone else

Each was attempted on 2026-10-13. The result column says what actually happened.

| ID | What | Attempted, and what happened | Blocks | Recommendation |
|---|---|---|---|---|
| B-PEER-TREE | Another session is cutting the test suite in this same checkout | `ListAgents`: three peer sessions (`daygame-coach-6e` busy, `-ac` busy, `-bf` idle). About 250 test files are modified and uncommitted, including four this plan must edit: `tests/unit/navigation/backNavigation`, `lifeMasteryRoutes`, `routeReachability` and `tabBarDestinations` (−87 lines between them). `docs/plans/tests-worth-their-keep.md` says "executing since 2026-10-13 — Phases 1–3 in progress", and its inventory marks all four "TRIM". | Every step that edits `tests/` (Phase 1's test step, all of Phase 2, the e2e parts of Phases 4–5) | **Update, same day:** the four navigation tests were committed trimmed in `812f496d`, and `playwright.config.ts` with `e2e.yml` in `9274a742` (session `daygame-coach-ac`, which owns the browser cut). Re-check `git status --short tests/` before each test step; the cut was still running. The executor waits until those four files show clean in `git diff` (the other session has committed), then builds on the trimmed versions. It asks with `SendMessage` which session owns `tests-worth-their-keep.md`, and never edits or commits a peer's hunk. App-code steps (Phase 1 steps 1–6, Phase 3's proxy code) do not wait. |
| B-DEPLOY | Put the fixed site on `daygame-coach.vercel.app` | `git push --dry-run origin training-rebuild:main` → `c1680654..d659ac47  training-rebuild -> main` (a clean fast-forward). Not pushed: it redeploys production with 440 commits, and the same push was refused by the safety classifier on 2026-10-12 (see `Plans/caddy-deploy-and-cicd.md`, B-MAIN). | Phase 7 | **You** run `git push origin training-rebuild:main` after Phase 6 (the same act as R8 in the Caddy plan). To undo: `git push --force-with-lease origin c1680654:main`. Or use B-PREVIEW instead. |
| B-PREVIEW | Show the friend a preview without touching production | GitHub's deployment records show a Preview deployment for every push to `training-rebuild` (latest: `d659ac47`, 10:28 UTC). Opening it answers `302 → vercel.com/sso-api`: Vercel's deployment protection requires a Vercel login. The `vercel` CLI is not installed. | Phase 7, if you choose not to deploy | In the Vercel dashboard, open the preview deployment of the final commit and use **Share** to create a link that bypasses protection. Sign-in works there with a password; sign-up emails would not, because Supabase's redirect allow-list has only the production URL and localhost. |
| B-DEVSERVER | Your `next dev` on `:3000` (pid 928633, running 15 days) | Not touched. Folder moves under `app/` normally appear without a restart. A new route group and new layouts sometimes leave stale routes until restart. | Nothing; the executor verifies on a second instance (`NEXT_DIST_DIR=.next-verify npx next dev -p 3100`, as the comment in `next.config.mjs` describes) | If `:3000` shows a 404 for a moved page after Phase 4 or 5 while `:3100` does not, restart `npm run dev` when convenient. The executor never kills or restarts it. |
| B-SW-PHONE | Your phone's installed app keeps the old offline pages until it updates | `public/sw.js` names its cache after the build (`?v=`), calls `skipWaiting()` and `clients.claim()`, and deletes old caches on activation. So it updates itself, but only on an **online** visit. | Nothing in this plan. Until that visit, opening `/time` or `/plan/quit-vice` with no signal shows the browser's error page. | After Phase 5 reaches wherever your phone points, open the app once with signal. |
| B-SIGNIN | A signed-in browser for before/after screenshots | Worked: `tests/e2e/.auth/user.json` (written 14:14 today by another session's test run) signed into `localhost:3000`. 17 of 18 page loads rendered signed in. **The first load was sent to `/auth/login` once**, for a reason not investigated. | Phase 0 evidence and every phase's acceptance screenshots | The executor uses the test accounts only, never your account. If the file is stale, it regenerates it with `npx playwright test --project=setup` (the script reads `.env.local`; the executor never reads or prints those values). If the first-load bounce repeats, it is recorded in Phase 6, not chased here. |
| B-SHARED-FILES | Files another plan also edits | `proxy.ts`, `public/sw.js` and `next.config.mjs` are clean now (`git status`). `Plans/caddy-deploy-and-cicd.md` edits `next.config.mjs` and warns that "each edit restarts the owner's `next dev`". | Phases 3 and 5 | This plan **does not edit `next.config.mjs` at all**: the old-address redirects live in `proxy.ts` (Q10). `proxy.ts` and `sw.js` are edited only when `git diff` shows them clean, and the executor checks again just before committing. |
| B-ICON | Desktop header icons for Training, Tracking, Scenarios, Time | `src/shared/iconRoles.ts` says icons may not be reused without your approval, and `.claude/hooks/never.py` asks before any edit to it. The test that enforced the registry was deleted with the architecture tests (`2fea6697`). | Nothing, if the design below is followed | **Avoided by design:** the desktop header draws each item's icon from `navTabs.ts`'s own data, so no file imports a new icon and the registry is untouched. Only a deviation from that would need your approval. |
| B-SUPABASE | Email links and the redirect allow-list | **Cleared.** Read through the Supabase management API (only these fields were printed): `site_url` is `https://daygame-coach.vercel.app`, `uri_allow_list` is `…vercel.app/**,http://localhost:3000/**`, and none of the 13 email templates names a page. The app's own links go to `/auth/confirm?next=/redirect` and `/auth/reset-password`, which do not move. | Nothing | None |
| B-STRIPE | Stripe-side return addresses | **Cleared.** Checkout is still a placeholder dialog ("Stripe migration in progress"). The billing portal's `return_url` comes from code (`SETTINGS_CONFIG.billingPortalReturnUrl`), which Phase 1 points at the route list. The Stripe CLI is not installed and the Stripe dashboard was not read; a default return URL set there would be overridden by the code's value anyway. | Nothing | None |
| B-DATA | Addresses saved in the database or the browser | **Cleared.** No repository column holds a link (only `voice_note_url`, `avatar_url`, `photo_url`). Migrations mention addresses only in comments. No `localStorage`/`sessionStorage` key stores a path. The one address people copy is the time tracker's "start link" (`startLinkFor`), with a query string. The redirect keeps query strings. | Nothing | None |

---

# OPEN QUESTIONS — each with a recommendation

The executor uses the recommendation unless this file records a different answer from you. Q1–Q6 are
names. After Phase 1 a name is one line in the route list plus one redirect, so a wrong guess is cheap
to correct until notifications link into these addresses.

| # | Question | Recommendation | Alternative | Cost if the recommendation is wrong |
|---|---|---|---|---|
| Q1 | Where do the dating answers live? | **`/scenarios/preferences`.** Vision item 32 says they belong in Scenarios, the page says only Scenarios uses them, and Scenarios already embeds the same form before your first scenario. Settings keeps a row linking to it. | `/settings/preferences`: where people look for "change my answers" | One route-list line and one redirect |
| Q2 | What is Ask Coach's address? | **`/coach`** | `/ask-coach`, or keep `/qa` at the top level | The same |
| Q3 | What is the plan's address, and what is it called? | **`/plan`, and "Your plan" wherever the navigation names it** (already true). The page's own heading ("Life Mastery") and Training's "part of your Life Mastery plan" line are wording; the executor changes the Training line to "part of your plan" and leaves the plan's heading to you. | Keep `/life-mastery` | A label and an address that disagree, which is the friend's complaint |
| Q4 | Training: `/training` or keep `/programs`? | **`/training`**. The tab says Training, and "programs" is one of its three tabs' contents. | Keep `/programs` (the most-linked address in the code: about 147 references) | None after Phase 1, which reduces those 147 to one |
| Q5 | Does the Dashboard keep `/dashboard`? | **Yes.** It is the tab's name, the installed app's start page and the login landing. | `/home` | A manifest change on every installed copy, for no gain |
| Q6 | Quit-a-vice: under the plan or on its own? | **`/plan/quit-vice`.** You reach it from the plan's Vices card, and its back link returns there. The code being its own slice (`src/vice/`) is not a reason for its address. | `/quit-vice` at the top level | One line and one redirect |
| Q7 | What does a tab destination show at the top? | **No back control at all.** The frame is the way out. Training's "← Dashboard", Scenarios' "Back to Dashboard" (twice), Settings' "‹ Back" and the Inner Game page's dashboard links are removed. Sub-pages keep their `BackLink`. | Keep a back control everywhere | The "child of Dashboard" feel stays |
| Q8 | How does a laptop navigate? | **A top header drawn from the same `TABS` and `MORE_ITEMS` the phone bar uses**: Dashboard, Training, Tracking, Scenarios, Time, then Your plan, Ask Coach, Articles, Settings, Log Out. One list feeds both, so they cannot disagree again. | A left sidebar | A redesign later. The header is the smaller change and keeps today's look. |
| Q9 | What happens to the phone header's ☰ menu? | **Remove it inside the app frame.** It duplicates the "More" sheet, which already has Log Out (`MobileTabBar.tsx:102`). The signed-out home page keeps its own header. | Keep both | Two menus that can disagree |
| Q10 | Where do old addresses redirect from? | **`proxy.ts`, from a table in `src/shared/routes.ts`.** The proxy reloads live in `next dev`, can import the route list, already runs on every old prefix, and can be unit-tested with a `NextRequest` (as `testRoutesSealed.test.ts` does). It needs no edit to `next.config.mjs`, which the Caddy plan is changing and which restarts your dev server. | `redirects()` in `next.config.mjs` (Next's documented way; it runs before the proxy) | Slightly later redirects (after the proxy starts instead of before it). Moving the table later is one function. |
| Q11 | Should a test forbid typed-out addresses outside the route list? | **Yes, narrowly.** It scans `app/`, `src/` and `components/` (not `app/test/`, comments, tests or docs) for a quoted string starting with a page address, and allows only `src/shared/routes.ts`. Unlike the deleted orientation test, it checks code against code, not code against a document, and it is the only thing that stops the `/scenarios` bug from recurring. | No test; rely on habit | Drift returns slowly, as it did before |
| Q12 | Rename code folders to match the addresses? | **No.** | Rename `programs/` → `training/`, `qa/` → `coach/` and so on | 200+ files of churn and merge conflicts with three peer sessions, for nothing a person sees |
| Q13 | Rename API addresses? | **Not now.** Do it with the database move (`own-platform-and-app.md`, M5), which rewrites that layer anyway. Phase 8 holds the inventory. | Do it now | Each rename now is redone during the move |
| Q14 | The home page's "Preview Dashboard" button sends signed-out visitors to login | **Remove the button and the three dead signed-out branches.** Nobody is signed out on purpose yet, and the sales page is the preview. The signed-in, unpaid preview stays (that one is alive). | Make `/dashboard` public in a real preview mode | A real preview is a feature, not a fix. It also means a public page that reads the database, which is a security review in itself. |
| Q15 | Which pages draw their own frame and hide the app's? | **The ones already listed in `HIDDEN_ROUTE_PREFIXES`** (Your plan and quit-vice, weekly review, live workout, Time). The list now hides **both** bars, the header on a laptop as well as the tab bar on a phone, because each of those pages has its own top and bottom controls and its own way out. | Hide only the phone bar, and draw the header above them on a laptop | Two headers stacked on four pages |
| Q16 | How long do the old addresses keep redirecting? | **Permanently.** The table is a few lines, and a 308 costs nothing. A unit test keeps every target pointing at a page that exists. | Remove them after the Hetzner move | A dead bookmark on your phone |
| Q17 | When does the friend see it? | **After Phase 6, through B-PREVIEW's share link**, because it does not touch production. Fast-forward `main` when the Caddy plan's R8 is due anyway. | Fast-forward `main` now | Production jumps 440 commits for one person's look |

---

# PHASES

Each phase ends in a working app, says what it depends on, and names acceptance checks that are run,
not asserted. A step that hits a blocker is marked "blocked: <ID>", and work continues with the next
step that does not depend on it.

## Phase 0 — Inventory, screenshots, blocker attempts. **Status: done 2026-10-13**

- **Live site** (`curl`, signed out): every `/dashboard/*`, `/programs*`, `/preferences*`, `/qa` and
  `/admin/*` address answers 307 to `/auth/login?next=…`. `/life-mastery` answers 404 (it is not on
  `main`). `/settings`, `/tracking`, `/scenarios`, `/training`, `/time` and `/test` answer 404.
  The home page links to `/dashboard`, `/dashboard/articles`, `/auth/login` and `/auth/sign-up`.
- **Production commit:** `gh api repos/reachjvc/Daygame_coach/deployments?environment=Production` →
  `c1680654`, 2026-09-17T07:17Z. `origin/main` is 0 ahead and 440 behind `origin/training-rebuild`.
- **Signed-in screenshots** of nine pages at 390×844 and 1280×800 on `localhost:3000`, as the test
  account. The table under "What is wrong", point 3, is their summary. The script is reproducible: it
  loads `tests/e2e/.auth/user.json` into Playwright's `chromium`, visits each address, and records the
  visible `<header>` count, the links inside visible `<nav>` elements, any visible control whose text
  starts with "Back" or "←", and the `<h1>`.
- **Code inventory:** the per-file lists in Phases 1, 3 and 4, the page-by-page sign-in and frame
  table below, the five navigation tests that derive addresses from folders, the hand-kept lists in
  `proxy.ts` and `sw.js`, and the `/scenarios` bug.
- **Next 16's own docs read:** `03-file-conventions/route-groups.md` (brackets do not appear in the
  address; caveats are conflicting paths and multiple *root* layouts, neither of which applies here),
  `03-file-conventions/proxy.md` (matcher, execution order, the server-action warning) and
  `05-config/01-next-config-js/redirects.md` (query values pass through to the destination).
- **Every blocker attempted** (table above). The plan format is saved as a memory for future plans.

**Page-by-page today** (sign-in check in the page file; paid gate; which frame it mounts):

| Page file | Own sign-in check | Paid gate | Header | Tab bar | Notes |
|---|---|---|---|---|---|
| `app/dashboard/page.tsx` → `DashboardPage` | in component | preview if unpaid | yes | yes | dead signed-out branch (Q14) |
| `app/dashboard/settings/page.tsx` → `SettingsPage` | yes | — | yes | yes | `router.back()` "Back" at `SettingsPage.tsx:234` |
| `app/dashboard/tracking/page.tsx` → `ProgressDashboard` | yes, plus `tracking/layout.tsx` | — | no | yes | no way out on a laptop |
| `app/dashboard/tracking/{session,session/[id],report,review,daily,history}` | via `tracking/layout.tsx` | — | no | no | sub-pages with `BackLink`; `review` hides the bar |
| `app/dashboard/scenarios/page.tsx` → `ScenariosPage`/`ScenariosHub` | in component | in component | own "Scenarios" header | yes | four `href="/dashboard"` "Back to Dashboard" links (`ScenariosPage.tsx:44,113,148,181`) |
| `app/dashboard/time/page.tsx` → `TimetrackScreen` | yes | — | own | own | `TogglLab backHref="/dashboard"` (`TimetrackScreen.tsx:20`) |
| `app/dashboard/qa/page.tsx` | yes | redirects unpaid to `/dashboard` | yes | yes | |
| `app/dashboard/articles/page.tsx` | yes | preview | yes | yes | dead signed-out branch |
| `app/dashboard/inner-game/page.tsx` | yes | preview | yes | yes | dead signed-out branch; `InnerGamePage.tsx:389,441` and `SummaryPage.tsx:137` link to `/dashboard` |
| `app/programs/page.tsx` → `TrainingScreen` | yes | — | no | yes | "← Dashboard" (`TrainingScreen.tsx:208–210`) and "part of your Life Mastery plan" (`:237`) |
| `app/programs/live/page.tsx`, `app/programs/workout/[id]/page.tsx` | yes | — | no | live: hidden | sub-pages |
| `app/life-mastery/page.tsx`, `quit-vice/page.tsx`, `layout.tsx` | layout + page | none (deliberate) | own | hidden | `backHref="/dashboard"` (`life-mastery/page.tsx:72`) |
| `app/preferences/page.tsx`, `archetypes/page.tsx` | yes | — | no | no | no way out at all except Save |
| `app/admin/ai-usage/page.tsx` | admin key | — | no | no | stays outside the frame |
| `app/page.tsx` → `HomePage` | yes | — | yes | yes | public; stays outside the frame |

## Phase 1 — One route list (nothing visible changes)

**Depends on:** nothing for steps 1–6. Step 7 waits for B-PEER-TREE. **Working state:** every page
address comes from `src/shared/routes.ts`. The values are still today's addresses, so the site is
unchanged apart from the `/scenarios` fix.

1. **Create `src/shared/routes.ts`** with today's values:
   - a `ROUTES` object with every static page address. Names follow the tab label, not the folder:
     `dashboard`, `tracking`, `trackingSession`, `trackingReport`, `trackingReview`, `trackingDaily`,
     `trackingHistory`, `scenarios`, `scenarioPreferences`, `scenarioArchetypes`, `time`, `coach`,
     `articles`, `innerGame`, `settings`, `training`, `liveWorkout`, `plan`, `quitVice`, `home`,
     `login`, `redirect`, `adminAiUsage`;
   - builder functions for dynamic pages: `trackingSessionDetail(id)`, `workoutReceipt(id)`,
     `programSession(id)`, plus `withFrom()` and `TRAINING_HISTORY` moved unchanged from
     `trainingRoutes.ts`, and `viceArchiveStep` and `SUPERSEDED_LIFE_MASTERY_PATHS` from
     `lifeMasteryRoutes.ts`;
   - `PRIVATE_PREFIXES` (today's proxy list, used by Phase 3's test) and `OFFLINE_SHELL` (today's
     `sw.js` list);
   - an empty `LEGACY_ROUTES` table, which Phase 5 fills.
   Keep the existing explanatory comments from the two old files; they record real incidents.
   `TRAINING_DOOR_API` is an API address. It moves too, under an `API` heading, so that
   `trainingRoutes.ts` can be deleted, but no other API address is added (Q13).
2. **Delete `src/shared/lifeMasteryRoutes.ts` and `src/shared/trainingRoutes.ts`.** Update their 37 and
   11 importers (app code now, tests in step 7). Use one name per page; do not leave re-exports
   behind, or the two-list problem survives in a new form.
3. **`components/navTabs.ts` reads every `href` from `ROUTES`.** `ROUTE_LABELS`,
   `HIDDEN_ROUTE_PREFIXES` and `TAB_ROUTES` keep their shapes.
4. **Replace every typed-out page address in app code.** These are the files, with the number of
   non-comment occurrences (comments that mention an address are left alone, but re-read so they do
   not lie after Phase 5):
   - `app/`: `admin/ai-usage/page.tsx` (1), `dashboard/qa/page.tsx` (1), `dashboard/settings/page.tsx`
     (1), `dashboard/tracking/history/page.tsx` (3), `dashboard/tracking/session/page.tsx` (1),
     `life-mastery/page.tsx` (1), `manifest.ts` (1), `preferences/archetypes/page.tsx` (1),
     `preferences/page.tsx` (1), `programs/live/page.tsx` (1), `programs/workout/[id]/page.tsx` (1),
     `qa/page.tsx` (1)
   - `components/`: `AppHeader.tsx` (6), `navTabs.ts` (13)
   - `src/dashboard/components/DashboardContent.tsx` (5)
   - `src/goals/components/`: `new-goals/GoalsConfigStep.tsx` (1), `north-star/NorthStarFlow.tsx` (1),
     `north-star/RoutineCard.tsx` (1), `north-star/SeasonBand.tsx` (1), `north-star/WorkoutPrograms.tsx`
     (3), `tree-of-life/EmptyTreeState.tsx` (1)
   - `src/home/components/`: `Checkout.tsx` (1), `HomePage.tsx` (1)
   - `src/inner-game/components/`: `InnerGamePage.tsx` (2), `SummaryPage.tsx` (1), `WelcomeCard.tsx` (1)
   - `src/profile/`: `actions.ts` (11, all `revalidatePath`), `components/ArchetypeSelector.tsx` (1),
     `components/UserPreferences.tsx` (2), `loginDestinationService.ts` (1)
   - `src/programs/components/`: `BuildYourWeek.tsx` (1), `ProgramDetail.tsx` (1),
     `StartLooseWorkout.tsx` (2), `TrainingCard.tsx` (1), `TrainingScreen.tsx` (2),
     `live/LiveWorkoutScreen.tsx` (3)
   - `src/scenarios/components/ScenariosPage.tsx` (5)
   - `src/settings/`: `actions.ts` (1 literal, plus the two `"/scenarios"` and `"/programs"`
     `revalidatePath` calls), `components/SettingsPage.tsx` (1), `config.ts` (2, including
     `billingPortalReturnUrl`)
   - `src/timetrack/`: `components/TimetrackScreen.tsx` (1), `components/TogglLab.tsx` (1),
     `timetrackService.ts` (1, `startLinkFor`'s default)
   - `src/tracking/components/`: `DailyReviewPage.tsx` (2), `FieldReportPage.tsx` (4),
     `ProgressDashboard.tsx` (1), `SessionDetailPage.tsx` (5), `SessionTrackerPage.tsx` (4),
     `VoiceRecorderButton.tsx` (1), `WeeklyReviewPage.tsx` (2), `dashboard/DailyReviewCard.tsx` (1),
     `dashboard/QuickActionsCard.tsx` (4), `dashboard/RecentFieldReportsCard.tsx` (3),
     `dashboard/RecentSessionsCard.tsx` (4), `dashboard/WeeklyReviewsCard.tsx` (1)
   - `src/vice/components/blackbox/BlackBoxPage.tsx` (2)
   - Pages under `app/test/` that link into the product (4 files) also import from `ROUTES`, so
     Phase 5 does not leave them pointing at old addresses.
   This regex finds them all: `["'\`](/dashboard|/programs|/preferences|/life-mastery|/qa)([/?"'\`$]|$)`.
   Run it again at the end. It must find nothing outside `src/shared/routes.ts`, comments and
   `tests/`.
5. **Fix `src/settings/actions.ts:98`**: `revalidatePath("/scenarios")` becomes
   `revalidatePath(ROUTES.scenarios)`, which is `/dashboard/scenarios` until Phase 5.
6. **`proxy.ts` and `public/sw.js` keep their literals.** Next reads the `matcher` at build time and
   cannot evaluate an import, and `sw.js` is plain JavaScript served as-is. Both are already checked
   against constants by `tests/unit/navigation/lifeMasteryRoutes.test.ts` for the plan's address.
   Generalise that check in step 7: the `matcher` covers every `PRIVATE_PREFIXES` entry, and
   `sw.js`'s `SHELL_PATHS` equals `OFFLINE_SHELL`.
7. **Tests** (blocked until B-PEER-TREE clears for each file):
   - update the importers of the two deleted files;
   - generalise the proxy and `sw.js` agreement checks (step 6), in whichever file survives the
     peer's trim, or in a new `tests/unit/navigation/routeList.test.ts`;
   - `routeConstantsResolve.test.ts` walks `ROUTES` and the builders instead of the two old files;
   - if Q11 stays "yes", add `tests/unit/navigation/noTypedAddresses.test.ts` using step 4's regex,
     skipping comment lines and `app/test/`;
   - **e2e specs import `ROUTES`** instead of typing addresses (43 spec files name one today). Do this
     after `tests-worth-their-keep.md` Phase 3 has committed its cuts, so no time is spent on specs
     that are about to be deleted. Then Phase 5 does not touch them.

**Acceptance:**
- `npm test` passes.
- Step 4's regex finds nothing outside the allowed places (quote the command and its empty output).
- Re-running Phase 0's screenshot script gives the same table.
- Changing difficulty in Settings, then opening Scenarios, shows the new difficulty without a manual
  reload. That is the `/scenarios` fix, checked on `:3100` as the test account.

## Phase 2 — The route tooling understands route groups and layouts (nothing visible changes)

**Depends on:** B-PEER-TREE (every file here is a test file another session is trimming). **Working
state:** the navigation tests give the same answers as before, and would keep giving correct answers
after Phases 4–5.

1. **`tests/support/appRoutes.ts`, `productRoutes()`:** drop path segments wrapped in brackets, such as
   `(app)`, when building the address. Make this the only place that turns a folder into an address.
2. **`backNavigation.test.ts` has its own copy of that walk** (`routePages()`). Replace it with
   `productRoutes()`.
3. **`routeConstantsResolve.test.ts`'s `isServed()`** says "Route groups `(name)` are not used here".
   Teach it that a directory may also be served through a bracketed folder at any level.
4. **"Does this page render the tab bar?"** (`tabBarDestinations`, `backNavigation`,
   `routeReachability`) follows imports from the page file only. Add the `layout.tsx` files that
   enclose the page, walking up the folders, to the files whose imports are followed.
5. **A desktop gap in the back-navigation rule.** Today, a page that renders the tab bar counts as
   having a way out. Above 640 px that bar does not exist, which is how Tracking became a dead end on
   a laptop. Change the exemption to "renders the bar **and** a desktop header", which will be one
   component, the frame (Phase 4). Until Phase 4 lands, record the pages this newly fails as the
   expected list, in the test itself. Phase 4 must empty that list.

**Acceptance:** in a scratch worktree (`git worktree add --detach <scratchpad>/wt HEAD`), create
`app/(probe)/probe-x/page.tsx` and `app/(probe)/layout.tsx` mounting `MobileTabBar`. The route tooling
reports `/probe-x` (not `/(probe)/probe-x`), and the bar check sees the bar. Delete the worktree and
run `git worktree prune`. Then `npm test` passes in the shared folder.

## Phase 3 — The sign-in guard protects everything by default

**Depends on:** Phase 1. **Working state:** signed-in use is unchanged, and every product page is
private unless listed as public.

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` first.

1. **In `src/shared/routes.ts`, add `PUBLIC_PATHS`:** `/` (exact), `/auth/` (prefix), and the files
   the browser fetches without a session: `/manifest.webmanifest` (from `app/manifest.ts`), `/sw.js`,
   icons and other files in `public/`. Look at `public/` and `app/` for the real list; do not guess.
2. **Rewrite `proxy.ts`'s order:**
   1. legacy redirects (empty until Phase 5);
   2. the `/api/test/` production gate (unchanged);
   3. public paths: `NextResponse.next()` without calling `getUser()`, which is the same as today,
      since the proxy does not run on them now;
   4. `getUser()`, then the `/admin` and `/api/timetrack/` rules (unchanged);
   5. **anything else without a user** → `/auth/login?next=<path+search>`.
3. **The matcher becomes a negative pattern:** every path except `_next/static`, `_next/image`,
   static files by extension, and `/api/` other than `/api/test/` and `/api/timetrack/` (API routes
   check sign-in themselves and answer 401; running `getUser()` on each would add a network call per
   request). It is a literal, because Next requires one.
4. **Remove `/lair`**, deleted on 2026-09-09.
5. **Test** (extend `tests/unit/navigation/testRoutesSealed.test.ts`'s `NextRequest` pattern, or a new
   `proxyPrivateByDefault.test.ts`): for every route from `productRoutes()`, a request without a
   cookie is redirected to login unless it is in `PUBLIC_PATHS`. Also test the reverse: `/` and
   `/auth/login` are not redirected, and `/sw.js` and `/manifest.webmanifest` are not intercepted.

**Acceptance:**
- `npm test` passes.
- On `:3100`, signed out: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}"` for every product
  address gives 307 to login with `next`; `/`, `/auth/login`, `/sw.js` and `/manifest.webmanifest`
  give 200.
- Signed in as the test account, Phase 0's screenshot table is unchanged.
- The offline Black Box still opens: `tests/e2e/vice-offline.spec.ts` against a production build
  (`npm run build`, then `NEXT_DIST_DIR`-separated `next start` on another port), since it skips
  under `next dev`.

## Phase 4 — One frame for the signed-in app

**Depends on:** Phases 1 and 2. **Working state:** every signed-in page has navigation at both widths,
no tab destination pretends to be a child of the Dashboard, and every address is still today's.

Read `03-file-conventions/route-groups.md` and `layout.md` first.

1. **`components/AppFrame.tsx`** (`"use client"`, no server data, per D8):
   - reads `usePathname()`;
   - when the path is under `HIDDEN_ROUTE_PREFIXES`, renders the children with no frame (Q15);
   - otherwise renders a **desktop header** (`hidden sm:flex`) built from `TABS` then `MORE_ITEMS`,
     using each item's own `icon` (B-ICON), with the current item marked by the same rule the bar
     uses (`exact` or prefix), plus Log Out (the existing `signOut` form) and, in development only,
     the existing "Test Pages" link;
   - renders a slim phone header with the logo only (Q9), and `<MobileTabBar />`;
   - keeps the page's bottom padding (`pb-tab-bar`) in one place, the frame, instead of in each page.
2. **`app/(app)/layout.tsx`** renders `<AppFrame>{children}</AppFrame>`. It has no sign-in check and no
   data fetching.
3. **Move (with `git mv`, so history follows) into `app/(app)/`:** `dashboard/`, `programs/`,
   `preferences/`, `life-mastery/`. Addresses do not change. `app/page.tsx`, `app/auth/`,
   `app/admin/`, `app/redirect/`, `app/qa/`, `app/test/` and `app/api/` stay outside.
   `app/dashboard/tracking/layout.tsx` and `app/life-mastery/layout.tsx` move with their folders and
   nest inside the new layout unchanged.
4. **Remove every per-page frame:**
   - `<AppHeader>` from `DashboardPage.tsx` (three branches), `SettingsPage.tsx`,
     `app/dashboard/{qa,articles,inner-game}/page.tsx` (six mounts);
   - `<MobileTabBar>` from `DashboardPage.tsx`, `SettingsPage.tsx`, `ScenariosHub.tsx`,
     `ProgressDashboard.tsx`, `TrainingScreen.tsx`, `app/dashboard/{qa,articles,inner-game}/page.tsx`;
   - `AppHeader` itself remains only for the public home page. Rename its prop `currentPage` to what
     it now serves, or fold it into `HomePage` if nothing else uses it.
5. **Remove the fake back controls from tab destinations (Q7):** `SettingsPage.tsx:234` ("‹ Back"),
   `ScenariosPage.tsx:44,113,148,181` and Scenarios' own header, `TrainingScreen.tsx:208–210`
   ("← Dashboard"), `InnerGamePage.tsx:389,441`, `SummaryPage.tsx:137` and `WelcomeCard.tsx:85` where
   they act as "back to Dashboard". Training's line becomes "part of your plan" (Q3). Pages with
   their own frame keep their own exits: Time (`TimetrackScreen.tsx:20`) and Your plan
   (`life-mastery/page.tsx:72`, `NorthStarFlow`'s `backHref`).
6. **Preferences gets a way out:** inside the frame, the tab bar and header now cover it. Its
   archetype sub-page keeps its `BackLink`, with its fallback pointing at the preferences page rather
   than `/dashboard` (`ArchetypeSelector.tsx:140`).
7. **Paid gating is unchanged.** Ask Coach's page still redirects unpaid accounts, and Articles and
   Inner Game still show their signed-in preview. Ask Coach appears in the laptop header for
   everyone, as it already does in the phone's "More" sheet.
8. **Phase 2's expected-failure list must now be empty.** Remove it.

**Acceptance:**
- `npm test` passes, and the e2e `route-sweep` passes at desktop and phone width.
- Phase 0's screenshot script, re-run on `:3100`: every tab destination shows the header at 1280 px and
  the bar at 390 px. None of them shows a control starting with "Back" or "←". Sub-pages still do.
  The pages in `HIDDEN_ROUTE_PREFIXES` show their own frame only. Quote the table.
- `tests/e2e/dashboard-navigation.spec.ts` and `mobile-navigation` (whatever survives the peer's
  trim) pass.
- Sign out from the laptop header and from the phone "More" sheet: both land on the home page.

## Phase 5 — Addresses that say what belongs to what

**Depends on:** Phases 1, 3 and 4. **Working state:** the address table in Part 1 is true, and every
old address redirects permanently, keeping its query string.

**One commit per section, in this order:** Settings; Scenarios with its preferences; Time; Coach;
Articles; Inner Game; Tracking; Training; Plan with quit-vice. Each commit contains everything for
that section, because a redirect to a page that has not moved yet is a 404, and a moved page without
its redirect breaks bookmarks:

1. `git mv` the folder within `app/(app)/` (for example `app/(app)/dashboard/settings` →
   `app/(app)/settings`).
2. Change its value in `ROUTES`. Everything else already reads from there.
3. Add its rows to `LEGACY_ROUTES` (an exact path, or a prefix for a section with sub-pages such as
   `/dashboard/tracking` → `/tracking`). The proxy matches the longest prefix first, on segment
   boundaries, so a hypothetical `/dashboard/timeline` is never caught by `/dashboard/time`.
4. If the section is in `OFFLINE_SHELL`, update `public/sw.js`'s `SHELL_PATHS` in the same commit
   (Time, and quit-vice with the Plan section). The agreement test catches a miss.
5. `HIDDEN_ROUTE_PREFIXES` and `PRIVATE_PREFIXES` follow automatically, since they read `ROUTES`.
6. **The Plan section also deletes `app/(app)/dashboard/goals/plan/page.tsx` and `app/qa/page.tsx`**,
   and adds their rows to the table (`/dashboard/goals/plan` → `/plan`; `/qa` → `/coach`). The
   `?step=` parameter they handled is carried by the redirect's query passthrough. Delete
   `SUPERSEDED_LIFE_MASTERY_PATHS` if nothing reads it any more.
7. **Unit test, `legacyRoutes.test.ts`:** every source no longer has a page, every target is in
   `productRoutes()`, no target is itself a source (no chains), and a sample with a query string
   (`/dashboard/time?start=1&description=x` → `/time?start=1&description=x`) is passed through intact.

After the last section:
- `app/(app)/dashboard/` holds only the Dashboard's own `page.tsx`.
- `app/manifest.ts` still says `start_url: "/dashboard"` (Q5).
- Re-read the comments that mention old addresses in the files from Phase 1 step 4. Fix the ones that
  now state something false. Leave history-style comments ("was at … until 2026-10-…") alone.

**Acceptance, on `:3100` and then `:3000`:**
- `curl` of every `LEGACY_ROUTES` source gives 308 to the right target, with the query string kept.
- Every new address answers 307 to login signed out, and renders signed in.
- The screenshot table is re-run and quoted with the new addresses.
- `npm test` passes, `route-sweep` passes, and against a production build `vice-offline.spec.ts` and
  `programs-offline.spec.ts` pass at the new addresses.
- The browser bar on each tab destination shows a one-segment address.

## Phase 6 — Clean-ups found on the way, and the product map

**Depends on:** Phase 5.

1. **Q14:** remove the home page's "Preview Dashboard" card (`HomePage.tsx:88–114`) and the
   signed-out branches in `DashboardPage.tsx`, `app/(app)/articles/page.tsx` and
   `app/(app)/inner-game/page.tsx`. The proxy guarantees a user on every one of them.
2. **The first-load bounce from B-SIGNIN:** re-run the screenshot script three times from a fresh
   state file. If the first signed-in load is sent to login again, record it in `docs/product/map.md`
   under "In flight now" with the evidence. Do not fix it in this plan; it is about token refresh, not
   structure.
3. **`docs/product/map.md`:**
   - rewrite "Every address in the product" to the new table;
   - update the slice lines that name addresses (`timetrack/` "at `/dashboard/time`", `vice/`,
     `programs/`, and the Life Mastery paragraphs);
   - correct "Signed out sees the home page and a preview dashboard";
   - **remove the sentence that says `tests/unit/architecture/orientation.test.ts` fails when a new
     route appears.** That test was deleted in `2fea6697`, and per the owner it stays deleted.
   Leave `docs/plans/*`: they are dated records, and their old addresses are history.
4. **Vision item 32:** add a dated line saying the address followed the form into Scenarios.

**Acceptance:** `npm test` passes; `grep -n "/dashboard/\|/programs\|/life-mastery\|/preferences" docs/product/map.md` finds only historical mentions, each labelled as such.

---

# ████ STOP — the AI returns to you here ████

Everything above runs on `training-rebuild` and is visible on `localhost:3000`. Nothing reaches the
friend until you choose how (Q17):

- **Preview share link (recommended):** Vercel dashboard → the Preview deployment of the last commit →
  Share. Send him that link and the test steps: sign in, open each tab on a laptop and on a phone.
- **Or deploy:** `git push origin training-rebuild:main` (B-DEPLOY). This also ships 440 other commits.

---

## Phase 7 — The friend looks again

**Depends on:** your choice above.

1. On the shared or deployed URL, re-run Phase 0's `curl` probe: old addresses 308, new addresses 307
   signed out.
2. Re-run the screenshot script against that URL with the test account, if sign-in works there (a
   preview shares the production database, so it does).
3. Ask the friend the same question he answered: "Does anything look like a subset of something it
   isn't?" Record his answer here, verbatim, with the date.

## Phase 8 — API addresses (optional; **not now**, Q13)

Recorded so the inventory is not lost. Do it with the database move, which rewrites this layer.

| Family | Today | Problem |
|---|---|---|
| Gym | `/api/workouts/*` (12 routes), `/api/programs/*` (11), `/api/health/workout` and `/bests`, `/api/exercising/*` (3, a test-only slice) | One feature, four prefixes |
| Plan | `/api/goals/*` (18), `/api/life-plan/*` (3), `/api/life-answers` | One feature, three prefixes |
| Vice | `/api/black-box` | Named after a screen, not the slice |
| AI usage | `/api/api-ai-usage`, `/api/admin/api-ai-stats`, `/api/admin/api-ai-usage`, `/api/admin/check-ai-logs`, `/api/admin/test-ai-logging`, `/api/admin/test-user-logging` | `api` twice in one address; test endpoints in admin |
| Test | `/api/test/*`, `/api/qa-test` | Sealed in production; fine as is |
| Rest | `/api/tracking/*`, `/api/timetrack/*`, `/api/scenarios/*`, `/api/inner-game/*`, `/api/settings/*`, `/api/health/{nutrition,sleep,weight}`, `/api/qa`, `/api/errors`, `/api/whoami`, `/api/auth/destination` | Consistent enough |

---

# PART 2 — For the executing session

## Ground rules

- **This checkout is shared with at least three other sessions** (`ListAgents` on 2026-10-13: `-6e`,
  `-ac`, `-bf`).
  - Never run `git stash`, `git add -A`, `git add .`, `git commit -a` or `--no-verify`.
  - Commit with `git commit --only <paths>`. Edit a file another session might touch (`proxy.ts`,
    `public/sw.js`, `components/*`, `tests/**`) only when `git diff <file>` shows it clean, and check
    again just before committing. Never commit or revert another session's hunk.
  - **Folder moves under `app/` touch many files at once.** Before each `git mv`, check
    `git status --short app/` for that folder. If a peer has uncommitted changes inside it, message
    that peer and wait. A move must not carry their edits into your commit.
  - If the pre-commit hook fails because of another session's change, record **B-PEER-TREE** with the
    failing test and file, and continue with work that needs no commit.
- **Never kill, start or restart the dev server on `:3000`.** Verify on a second instance:
  `NEXT_DIST_DIR=.next-verify npx next dev -p 3100`. Stop only that instance when done.
- **Never edit `next.config.mjs`** (B-SHARED-FILES, Q10).
- **Never read or print `.env.local` values.** Scripts read them.
- **Never write to the live database.** The screenshots and e2e runs use the test accounts only, never
  the owner's.
- **Builds only through `npm run build`** (it keeps `--webpack`; the default bundler exhausts WSL
  memory).
- **Read Next's own docs before writing Next code:** `route-groups.md`, `layout.md` and `proxy.md`
  under `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`. This version
  differs from older ones.
- **Every phase ends with:** commit, push, read the CI result for that commit
  (`gh run list --branch training-rebuild --limit 3`; `gh` is logged in), then write
  `**Status:** done <date>` and the acceptance evidence under that phase here. A status-only commit to
  this file may carry `[skip ci]`.
- **A permission refusal is a blocker, not a puzzle.** Quote it in the blocker table, do not work
  around it, and continue with the next step that does not depend on it.
- **Before calling the work done:** note the starting commit, then run `/code-review` and
  `/security-review` on `<start>..HEAD`, limited to this plan's files. Fix or record every finding.
  Then re-read each phase's acceptance list against what was actually run.

## Files

**Created:** `src/shared/routes.ts`, `components/AppFrame.tsx`, `app/(app)/layout.tsx`, and the tests
`tests/unit/navigation/routeList.test.ts`, `legacyRoutes.test.ts`, `proxyPrivateByDefault.test.ts`
(or the same checks in surviving files), plus `noTypedAddresses.test.ts` if Q11 stays "yes".

**Moved:** `app/dashboard/`, `app/programs/`, `app/preferences/` and `app/life-mastery/` into
`app/(app)/` (Phase 4), then each section to its new address (Phase 5).

**Edited:** `proxy.ts`, `public/sw.js`, `components/navTabs.ts`, `components/AppHeader.tsx`,
`components/MobileTabBar.tsx`, the roughly 60 files in Phase 1 step 4, the pages and components in
Phase 4 steps 4–6, `tests/support/appRoutes.ts`, the navigation tests in Phase 2, the e2e specs that
name addresses, `docs/product/map.md`, `docs/product/vision.md` (one dated line), and this plan.

**Deleted:** `src/shared/lifeMasteryRoutes.ts`, `src/shared/trainingRoutes.ts`, `app/qa/page.tsx`,
`app/dashboard/goals/plan/page.tsx`.

**Not touched:** `next.config.mjs`, `app/manifest.ts`'s `start_url`, anything under `src/db/`, every
API route, every code folder name.

## What would make this plan wrong

- **If the peer's trim deletes a navigation test outright** rather than trimming it, Phase 2's steps
  for that file disappear. Phase 4 step 8 and Phase 5's acceptance then rely on the screenshot script
  and `route-sweep`, which still cover the same ground.
- **If Next 16 treats a bracketed folder differently from what `route-groups.md` says** (for example, a
  nested layout remounting on every navigation), Phase 4's acceptance catches it: the tab bar would
  flicker or lose its state between tabs. Then put the frame in `app/layout.tsx` behind a
  `usePathname()` check instead. The address work is unaffected.
- **If the proxy's wider matcher measurably slows page loads** (one `getUser()` network call per
  navigation, as every guarded page already pays today), narrow it back to an explicit list generated
  from `PRIVATE_PREFIXES`, with the agreement test kept.
- **If D8 is reversed to a shell that loads the remote site,** the frame and redirects still work
  unchanged. Only the "no server data in the frame" constraint becomes optional.
- **If the owner answers Q1–Q6 differently after Phase 5,** each answer is a one-line change in
  `ROUTES` plus a new row in `LEGACY_ROUTES`. The old row must then point at the newest address (no
  chains, enforced by the test).

---

## Execution prompt

Kept beside the plan it executes, so a session that has never seen this conversation can run it.

### Phases 1–6. Paste after `/goal`.

```
Execute Plans/site-structure.md, Phases 1 to 6 in order, and stop at its STOP line. Read the whole plan first, including Part 2's ground rules, and follow them. The goal is met only when all of these are true and shown in this session: (1) every step of Phases 1-6 is marked in the plan either done, with its acceptance check actually run (the command and its decisive output quoted under that phase), or "blocked: <ID>" with the exact refusal or the peer's uncommitted files quoted; nothing after the STOP line has been started. (2) The regex from Phase 1 step 4 finds no page address outside src/shared/routes.ts, comments and tests/. (3) On a second dev instance on :3100, signed in as the test account, Phase 0's screenshot script shows the desktop header at 1280px and the tab bar at 390px on every tab destination, no "Back"/"←" control on any tab destination, and the address table from Part 1 is true; every LEGACY_ROUTES source answers 308 to its target with the query string kept; signed out, every product address answers 307 to /auth/login with next, and /, /auth/login, /sw.js and /manifest.webmanifest answer 200. (4) npm test passes; the e2e route-sweep passes at desktop and phone width; vice-offline.spec.ts and programs-offline.spec.ts pass against a production build at the new addresses. (5) Every phase is committed with git commit --only <paths> and pushed to origin training-rebuild, and that commit's CI run is read; Status lines and the blocker table say what actually happened; /code-review and /security-review were run on <start SHA>..HEAD for this plan's files, with every finding fixed or recorded. (6) The final reply starts with what is not yet true, then lists the open questions whose recommendation was used without an answer from the owner. Escape clause: if (3) or (4) cannot be met because of a permission refusal, an open blocker, or a failure caused outside this plan's diff (quote the test, the file and the commit author), record it as a blocker in the plan and that condition counts as met. While working: other sessions share this checkout. Never git stash, git add -A or --no-verify; edit a shared file only when git diff shows it clean; before each git mv under app/, check that no peer has uncommitted changes inside that folder; commit only your own files. Never kill, start or restart the :3000 dev server; never edit next.config.mjs; never read or print .env.local values; never write to the live database; use only the test accounts. Build only through npm run build. When the permission system refuses something, record it with the exact message, do not route around it, and continue with the next step that does not depend on it. Put doubt in the first line of every report, not the last.
```
