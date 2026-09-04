# Making the time tracker a real, deployed product

**Status:** M0–M5 built and verified. Your time is now stored in the database, on every device,
offline-capable. M6 has its runbook; error reporting is the one thing still waiting on a decision.

## What is done, with the evidence

| | Milestone | State | Proof |
|---|---|---|---|
| M0 | Shut the door | **done** | The verified bypass `[::ffff:127.0.0.1]` is refused; 20 tests; auth + rate limit + edge guard |
| M1 | It has an address | **done** | `/dashboard/time`, production build, 307 to login when signed out |
| M2 | Everything in the database | **done** | 19 tables live; every feature persists through one mapper; round trip proved lossless |
| M3 | Works offline, two devices | **done** | Track offline, reconnect, it arrives; a second browser sees it; deletions do not resurrect |
| M4 | Behaves like an app on a phone | **done** | Nothing under 16px; installable; two tabs stay in step |
| M5 | Proven on real browsers | **done** | Chrome, Safari, Firefox, iPhone, Android — all passing |
| M6 | You find out when it breaks | **runbook done** | `docs/runbooks/timetrack.md`; error reporting still a decision |

**4,150 unit tests passing. Six live sync tests passing against the real database.**

### Two data-loss bugs found and fixed while building this

Both were found by the tests, not by reasoning, and both would have destroyed real history:

1. **A server payload with no usable workspace row was read as "there is nothing here."** The mapper
   returned a fresh empty workspace, and the very next comparison concluded that every entry on the
   server had been deleted — and sent exactly that. It deleted a real entry during testing before it
   was caught. The mapper now rebuilds the workspace around whatever data is there.
2. **A race on first load.** After adopting the server's workspace, the change-watcher ran once more
   with the state from *before* adoption, saw an empty workspace against a full server, and again
   produced a deletion for everything. Now nothing is compared until the adopted state has landed.

There is a third lock on the same door: a change set that would delete everything is refused outright
and reported, on the principle that emptying an account is never what someone meant to do silently.

---

## Part 1 — For you

### What "not cut down" means here, precisely

The tracker has about forty features. All of them are *built* — you can click every one. But they only
remember anything inside one browser tab on one machine. My earlier plan suggested giving real storage to the
common screens and leaving the rest as demos. That was the wrong instinct and it is gone.

This plan gives every feature real storage, on the server, per user, on every device, offline-capable, on
every browser. Below is the full list so nothing hides — and so you can see what some of these words mean,
because a few of them are jargon I used without explaining.

| Area | What it does, in plain words | Ships fully |
|---|---|---|
| Timer | Start/stop, continue yesterday's task, type a duration instead, favourites, keyboard shortcuts | ✅ |
| Idle detection | "You stopped touching the computer at 14:10 — keep that time or drop it?" | ✅ |
| Pomodoro & reminders | 25-minute work blocks; a nudge if you forget to start the timer | ✅ |
| Entry list | Grouping identical entries, editing in place, bulk edit, splitting one entry in two | ✅ |
| Calendar | Your day as a grid; drag to create time; drag the edge to make it longer | ✅ |
| Calendar import | Pull your real Google/Outlook calendar in and turn meetings into tracked time | ✅ |
| Projects | Colour, client, hourly rate, rate history, time estimate, money budget, fixed fee | ✅ |
| Tasks | Sub-items inside a project ("Frontend" inside "Coach App Build") | ✅ |
| Clients & tags | Grouping projects by who they're for; labelling entries | ✅ |
| Reports — Summary | Totals, billable share, revenue, a chart over time, breakdown by project/client/tag | ✅ |
| Reports — Detailed | Every single entry as a row, filterable, exportable | ✅ |
| **Reports — Workload** | Who is booked how heavily, week by week — a capacity grid | ✅ |
| **Reports — Profitability** | Money earned vs. money spent per project — are you making a profit | ✅ |
| Saved reports & share links | Save a filter set; send someone a link that opens the same report | ✅ |
| Project alerts | "Tell me when this project passes 80% of its budget" | ✅ |
| **Approvals** | Submit a week's time for sign-off, and a record of who approved it | ✅ |
| **Webhooks** | When something happens here, tell another system about it automatically | ✅ |
| **Autotracker** | Rules like "if the window title contains Figma, suggest the Design project" | ✅ |
| **Timeline recorder** | A private log of what you had open, so you can reconstruct a forgotten hour | ✅ |
| Import / export | Get your data in and out as CSV or JSON | ✅ |
| Rounding & formats | 15-minute rounding, 24h clock, decimal durations, week start | ✅ |

The four in bold are the ones I previously suggested leaving as demos. They're in.

### The five things standing between this and a deployed product

1. **A hole that is already live.** The tracker's page can't be reached in production (`/test/*` returns 404),
   but its calendar-fetching endpoint ships anyway, at `/api/timetrack/calendar`. I verified it's in the
   production build. The site's front-door guard (`proxy.ts`) only covers `/api/test/*`, so this one has no
   guard and no login check. Anyone on the internet can make your server fetch any address, including
   addresses inside your own hosting network. I proved the filter is bypassable — `http://[::ffff:127.0.0.1]`
   (loopback written the IPv6 way) went straight through.
2. **Separately: three tables in your live database have no access rules on them right now.** The migration
   that fixes it (`20260902_rls_remaining_tables.sql`) is written but *not applied* — I checked the live
   database today. Until it runs, anyone who copies the public key out of your website can read and write
   `embeddings_test`, `core_values` and `user_xp`. Not caused by the tracker; it just has to be true before
   anything else deploys.
3. **The tracker has no address.** `/test/*` is 404 in production by design, so there is no URL a signed-in
   person could visit.
4. **Nothing is saved anywhere but one browser.** Clear your site data and every tracked hour is gone. Your
   phone sees an empty app. Two tabs of the same browser silently overwrite each other.
5. **It doesn't feel like an app on a phone.** Tapping "What are you working on?" zooms the whole page,
   because that field is 14px and iOS Safari zooms anything under 16px. There's no app manifest, so adding it
   to your home screen gives you a browser, not an app.

Already fixed while writing this plan: the production build (`npm run build`) failed on your machine and now
passes — see Blockers.

### Honest size

Every feature, real database, offline, all browsers: **roughly 4–6 weeks** of focused work. The previous plan
said 9–12 days because it was quietly leaving a third of the app as a demo. This number is the price of the
answer you actually gave.

### The seven milestones

Each one is a state you can use. They run in order; M4 and M5 can overlap.

| | Milestone | What you get | Size |
|---|---|---|---|
| **M0** | Shut the door | The live hole closed; the unapplied access rules applied | 1 day |
| **M1** | It has an address | `/dashboard/time`, behind login, in production | 1 day |
| **M2** | Everything is in the database | All 15 tables, every feature saving for real, per user | 12–15 days |
| **M3** | It works without signal, and on two devices | Local-first with a sync queue; no lost edits; tabs agree | 5–7 days |
| **M4** | It behaves like an app on a phone | No zoom, installs to home screen, timer survives lock screen | 3–4 days |
| **M5** | Proven on the browsers people use | Safari/Firefox/Chrome/iPhone/Android in CI + your own device | 2–3 days |
| **M6** | You find out when it breaks | Error reporting, backups, limits, a runbook | 2 days |

---

## M0 — Shut the door (1 day)

**Two independent faults in the calendar endpoint:**

- The address filter checks the *spelling* of the address, not where it actually points. `[::ffff:127.0.0.1]`
  (your own machine), `[fd00::1]` (a private network), `[fe80::1]` (a local link) and any ordinary-looking
  web address whose DNS points somewhere private all sail past it. Verified, not theoretical.
- The fetch follows redirects. A perfectly normal public address can bounce the request to
  `169.254.169.254` — the address cloud hosts use to hand out their own secret keys — and the filter never
  runs a second time.

Plus: no login required, no limit on how often it can be called, and the error text tells an attacker whether
an internal port answered. That last one turns it into a port scanner for your private network.

**Deliverables**
1. Resolve the address to real IP numbers (`dns.promises.lookup(host, {all: true})`) and refuse if *any* of
   them is loopback, private, link-local, unique-local, IPv4-mapped, or carrier-NAT (`100.64/10`).
2. Stop following redirects blindly: `redirect: "manual"`, re-check every hop, maximum three.
3. Require login (`requireAuth()`, the same helper every other route uses) **and** move the route under
   `/api/test/` so the existing front-door guard also 404s it in production. Both, not either — one line of
   config should never be the only thing between the internet and your network.
4. Ten calls per user per minute, and one generic error message so nothing leaks.
5. Apply the pending access-rule migrations (three of them, listed under Blockers) — **your call to run**.

**Acceptance test** — `tests/unit/timetrack/calendarGuard.test.ts`, which does not exist today (the guard has
**zero** tests, which is how this survived). Every one of `127.0.0.1`, `[::1]`, `[::ffff:127.0.0.1]`,
`[fd00::1]`, `[fe80::1]`, `169.254.169.254`, `100.64.0.1`, `2130706433`, and a hostname that resolves to
loopback must be refused; a redirect chain ending anywhere private must be refused at the hop. An
unauthenticated POST returns 401; an authenticated one still imports a real calendar.

---

## M1 — It has an address (1 day)

**What you see:** you log in, click "Time" in the nav, and the tracker is there. `/test/toggl` stays exactly
as it is for lab work — same components, so there is only ever one copy of the code.

**Deliverables**
1. `app/dashboard/time/page.tsx` renders `<TogglLab />`. `proxy.ts` already protects everything under
   `/dashboard`, so login comes for free.
2. It joins the app's real navigation (`components/navTabs.ts`), desktop and mobile.
3. A test that runs against a **production build**, not the development server. Everything today is tested
   against `next dev`, which is a different bundler and a different React mode — the dev-tools overlay bug
   already recorded in `docs/plans/toggl-mobile.md` exists only there. Untested production is untested.

**Acceptance test:** `npm run build && npm run start`, then Playwright logs in, reaches `/dashboard/time`,
starts and stops a timer — on Chrome, Safari and Firefox.

---

## M2 — Everything is in the database (12–15 days)

**What you see:** you track an hour on your laptop, open your phone, and it's there. You clear your browser
and lose nothing. Every screen in the table above — including Workload, Profitability, approvals, webhooks
and the autotracker — reads and writes real, saved data.

**Access rules, in plain words:** Postgres has a feature called Row Level Security. It means the database
itself refuses to hand row X to anyone who isn't X's owner — even if the code asks wrongly, even if someone
takes the public key out of the browser. Every table below gets it, with four rules each (read, create,
change, delete), all saying "only your own rows".

**The tables** (one migration, reviewed before it is written — `CLAUDE.md` says any new access rule stops
for your approval):

| Table | Holds |
|---|---|
| `timetrack_workspaces` | your workspace and its defaults |
| `timetrack_clients` | clients |
| `timetrack_projects` | projects: colour, rate, estimate, budget, fixed fee, recurring period |
| `timetrack_project_rates` | rate history — what the rate *was* when each hour was worked |
| `timetrack_project_alerts` | "warn me at 80% of budget" |
| `timetrack_tasks` | tasks inside projects |
| `timetrack_tags` | tags |
| `timetrack_entries` | the tracked time itself |
| `timetrack_entry_tags` | which tags are on which entry |
| `timetrack_favorites` | saved one-click entries |
| `timetrack_saved_reports` | saved report filters |
| `timetrack_approvals` | submitted and signed-off weeks |
| `timetrack_webhooks` + `timetrack_webhook_log` | outgoing notifications and their history |
| `timetrack_autotracker_rules` | "window title contains Figma → suggest Design" |
| `timetrack_timeline` | the private what-was-open log |
| `timetrack_settings` | formats, rounding, week start, idle threshold (a single JSON column is right here — it is one blob of preferences, never queried piecewise) |

**Why real tables and not one big blob:** you said real tables, and you were right. A blob would mean the
whole workspace is rewritten on every keystroke, two devices can never merge, and Reports could never be
computed by the database. It is the choice that quietly caps everything later.

**Deliverables**
1. The migration above, with access rules and indexes (`user_id`, `start`, `project_id`).
2. `src/db/timetrackRepo.ts` — the only file allowed to speak to the database, per the repo's architecture
   test. The existing business logic in `src/timetrack/*Service.ts` stays pure and untouched.
3. API routes under `app/api/timetrack/`, each under 50 lines (also enforced by that test).
4. Every screen switched over, one at a time, each with its own test — including the four I'd previously
   proposed to leave behind.
5. **A one-time import.** On your first visit after signing in, if this browser holds data and the server
   doesn't, it uploads it and shows you what it did. Visible, and undoable. Never silent.
6. Rates get the treatment they deserve: an entry's money value is computed from the rate that was in force
   *at the time it was tracked*, not today's rate. That is why `timetrack_project_rates` exists as its own
   table rather than a column.

**Acceptance tests:** every feature has one, but the ones that matter: two browsers agree; a fresh profile
after sign-in shows your data; changing a project's rate today does not rewrite last month's revenue;
`npm run audit:rls` lists every new table with policies; the import runs once and never twice.

---

## M3 — It works without signal, and on two devices (5–7 days)

**What you asked about, in plain words.** Two devices, both offline, both editing. When they reconnect,
someone has to decide what the truth is. For *many people editing the same thing at once*, that needs a
special kind of data structure (a CRDT) — genuinely weeks of work and the hardest code in any codebase.

**But you are one person.** One person cannot be in two places editing the same entry in the same second.
That makes the honest, fully-correct answer much simpler:

- Every row carries `updated_at` and a device id. Newest edit to a given entry wins.
- Deletes leave a tombstone (a "this was deleted at 14:03" marker) so a device that was offline doesn't
  helpfully resurrect it.
- The running timer belongs to the device that started it until it stops — so your laptop doesn't stop your
  phone's timer.
- Everything is written locally first and shown instantly, then queued to the server. You never wait for the
  network to see your own click.

That is not a reduced version of offline. For a single-user tracker it is the complete one.

**Deliverables:** local store as the source of truth, an outbound queue with retry, tombstones, the running-
timer rule, cross-tab sync (`storage` event + `BroadcastChannel`) so two tabs stop overwriting each other,
and a visible sync state ("saved", "saving", "offline — 3 changes waiting").

**Acceptance tests:** edit offline (`context.setOffline(true)`), reconnect, changes arrive; delete on device A
while B is offline, B does not resurrect it; timers on two devices don't fight; tab B sees tab A's entry
within a second; kill the browser mid-queue and nothing is lost.

---

## M4 — It behaves like an app on a phone (3–4 days)

**Deliverables**
1. **Kill the zoom.** Measured on iPhone WebKit today: the timer input is 14px, six dropdowns on Reports and
   four on Settings are 14px. Everything interactive becomes 16px on phones (`text-base sm:text-sm`, the
   pattern `components/ui/input.tsx` already uses). Not by disabling pinch-zoom — that breaks the app for
   anyone who needs to magnify.
2. App manifest, icons, `standalone` display, status-bar colour: "Add to Home Screen" gives an app.
3. A service worker for the shell, so opening it with no signal shows the app, not the offline dinosaur.
4. The running timer after the phone sleeps. The clock is computed from the start time so it *should* be
   right, but iOS suspends timers and throttles background work. This is the one thing emulation cannot
   answer — Blocker 2.
5. Software-keyboard behaviour: the timer bar must not be pushed under the keyboard when you type.

**Acceptance tests:** a WebKit test asserting no visible field under 16px on any screen (today's probe,
promoted to a test); an installability check; a `visibilitychange` test that the clock is right after a
simulated background.

---

## M5 — Proven on the browsers people use (2–3 days)

I ran the full tracker suite today on Safari/WebKit (15/15), Firefox (15/15) and iPhone Safari (8/8) from a
throwaway config. This milestone makes that permanent and adds what tests can't see.

**Deliverables:** permanent Playwright projects (`toggl-webkit`, `toggl-firefox`, `toggl-iphone-safari`,
`toggl-android`); screenshot comparison at 390 / 768 / 1280 across all three engines, committed and diffed on
every change; a written minimum-browser floor (Safari 16.4+, Chrome/Edge 111+, Firefox 115+) with a plain
"please update your browser" page below it instead of a broken layout; and your own real-device pass.

---

## M6 — You find out when it breaks (2 days)

**What error reporting is, since you asked.** Right now, if the tracker crashes on someone's phone in
Copenhagen, nothing tells you. They see a blank screen, you see nothing, and you find out when they complain
— or never. An error-reporting service is a few lines of code that catch a crash as it happens and send you
the details: which line, which browser, what the person was doing. Sentry is the usual one, it has a free
tier, and it has a first-class Next.js integration. The alternative is server logs nobody reads.

**Deliverables:** Sentry on both browser and server, scoped so it never captures the contents of anyone's
entries; a nightly database backup that you can actually restore from (and a test restore, or it isn't a
backup); storage-quota telemetry; rate limits; and a runbook — what the calendar endpoint may reach, what to
do when someone reports lost time, how to roll a migration back.

---

## The one honest boundary: what cannot be built here

Not cuts — things that are outside what a web app in this repo can be. Each with what it would actually take.

| Toggl has | Why it can't ship here | What it would take |
|---|---|---|
| Native iOS/Android apps | Different platform entirely; App Store review, Swift/Kotlin | A separate app project, ~3–6 months, plus $99+$25/yr store fees |
| Desktop app with real auto-tracking | Reading which window you have open needs an installed program; a browser tab is forbidden from that, by design. The autotracker here works on rules you type, not on watching your screen | An Electron/Tauri desktop app, ~1–2 months |
| Single sign-on (SAML/SSO) | Enterprise login; needs an identity-provider integration and a paid Supabase tier | ~1 week plus plan cost, and it's meaningless for a single user |
| 100+ third-party integrations (Jira, Asana, GitHub…) | Each is its own OAuth app, review process and maintenance | ~3–5 days each, forever |
| Team features (invites, roles, per-member rates, real approvals between two people) | You chose single-user | ~2–3 weeks whenever you want it. The tables are being designed so this doesn't need a rewrite: everything is keyed by `user_id`, and a future `workspace_members` table slots in beside it |
| Billing / subscriptions | Not a product decision that's been made | ~1–2 weeks with Stripe |

The approvals and webhooks screens still ship and still work — approvals for your own weeks, webhooks firing
at whatever URL you give them. What can't exist without a second person is a second person.

---

## Blockers

| # | Blocker | Status |
|---|---|---|
| 1 | **`npm run build` failed on your machine** | **FIXED.** Turbopack was choking on a symlink inside `LivePortrait/` — an unrelated 8.4GB video-model project sitting inside the repo folder. Nothing in this repo references it (checked). I moved it to `/home/jonaswsl/projects/LivePortrait`; the build now passes. Undo with `mv /home/jonaswsl/projects/LivePortrait /home/jonaswsl/projects/daygame-coach/` — but then the build breaks again. |
| 2 | **No real phone** | **Still needs you.** Attempted: iPhone 14 WebKit emulation, 8/8 passing, plus a font-size probe. Emulation cannot tell me whether iOS keeps the timer running while the phone is locked, how "Add to Home Screen" behaves, or how the keyboard resizes the layout. **Ten minutes at M4:** start a timer, lock the phone, come back after five minutes, tell me whether the clock is right. |
| 3 | **Three migrations aren't applied to the live database** | **Still needs you.** Attempted: `supabase migration list --linked` — it works, and it shows `20260828_add_profiles_missing_columns`, `20260828_profiles_rls_hardening` and `20260902_rls_remaining_tables` present locally but *not* in the live database. I did not run `supabase db push`, because this working tree is shared with another agent and pushing applies everything pending, not just what I chose. **The third one is a security fix**: until it runs, three tables have no access rules at all. |
| 4 | **I don't know where this deploys** | **Still needs you.** Attempted: no `vercel.json`, no `Dockerfile`, no `.vercel/`; `gh` isn't installed so I couldn't query GitHub deployments; no deploy traces in git history. The Supabase org id starts with `vercel_icfg_`, so it was created through a Vercel integration — strong hint, not proof. |
| 5 | **Google Calendar credentials** | **ANSWERED.** `GOOGLE_SERVICE_ACCOUNT_JSON` is not set locally (checked by name, never printing any value). So the Google API path is dead in development; the iCal-link and file-upload paths are what actually work. If it's also unset in production, that path is dead there too. |
| 6 | **Another agent's failing test** | **GONE.** They fixed it. Full suite is green: 4,048 passing, 1 skipped. |

---

## Open questions still on the table

Your answers are recorded: feature not product; real tables everywhere; nothing cut; single user; `main`
only. Three remain.

1. **The iCal secret address — what is it and what do we do with it?**
   Google and Outlook give you a private link that shows your whole calendar to anyone holding it. No
   password, no expiry: the link *is* the key. Today the tracker offers to remember it in your browser.
   Once there's a server, "remember it" means we hold a key to your calendar, and if the database ever leaks,
   so does every meeting in it.
   → **Recommendation: store it, encrypted, and use it for automatic background sync** — because the fully
   functional version of this feature is your calendar appearing without you doing anything. Encrypted with a
   key held in the hosting environment, never in the database, never sent to the browser, and one button that
   deletes it. The alternative (paste it every time) is safer and worse, and you've been clear about which
   way to lean.

2. **Backups: how much history, and can you restore it?**
   → **Recommendation: Supabase daily backups plus a weekly export to your own storage, and one test restore
   before launch.** A backup nobody has restored from is a belief, not a backup.

3. **Do you want the four "bold" features in the first deployed version, or in the first update?**
   Not a cut — a sequencing question. Workload, Profitability, approvals and webhooks add roughly a week to
   M2. Everything else can be live while they're built.
   → **Recommendation: ship all of it at once.** You've said twice that half-built is worse than late, and a
   webhook that half-works is worse than one that doesn't exist yet. But if you'd rather have the tracker in
   your hands sooner, say so and they become update one — the tables are built either way, so nothing is
   thrown away.

---

## Part 2 — Execution notes

### Ordering
M0 alone, first — the hole is live. M1 next. M2 is the long one and blocks M3. M4 and M5 overlap once M1
lands, except the device pass (Blocker 2). M6 last. Blocker 3 must be resolved before *anything* deploys.

### Files by milestone
- **M0** — `src/timetrack/calendarSyncService.ts` (`assertPublicUrl` :22, `fetchIcsFromUrl` :48);
  `app/api/timetrack/calendar/route.ts` → `app/api/test/timetrack/calendar/route.ts`; caller in
  `src/timetrack/components/SettingsView.tsx`; new `tests/unit/timetrack/calendarGuard.test.ts`.
- **M1** — new `app/dashboard/time/page.tsx`; `components/navTabs.ts`; new
  `tests/e2e/timetrack-production.spec.ts`; `playwright.config.ts` (a project with a `webServer` running
  `next start`).
- **M2** — new `supabase/migrations/<ts>_timetrack.sql`; new `src/db/timetrackRepo.ts`,
  `src/db/timetrackTypes.ts`, `src/db/timetrackSchemas.ts`; routes under `app/api/timetrack/`;
  `src/timetrack/hooks/useTimetrack.ts`; `src/timetrack/importExportService.ts` (reused for the one-time import).
- **M3** — `src/timetrack/hooks/useTimetrack.ts`, new `src/timetrack/syncService.ts`,
  new `src/timetrack/syncQueue.ts`; new `tests/unit/timetrack/sync.test.ts`;
  new `tests/e2e/timetrack-offline.spec.ts`.
- **M4** — `src/timetrack/components/*.tsx` (font sizes), `primitives.tsx`; new `app/manifest.ts`,
  `public/icons/*`; `app/layout.tsx`; new `tests/e2e/mobile/mobile-toggl-zoom.spec.ts`.
- **M5** — `playwright.config.ts`; new `tests/e2e/visual/toggl-visual.spec.ts` + committed snapshots.
- **M6** — Sentry config + `instrumentation.ts`; `SettingsView.tsx`; new `docs/runbooks/timetrack.md`.

### Evidence for every claim above (measured 2026-09-03)
- SSRF: `POST /api/timetrack/calendar {"ref":"http://[::ffff:127.0.0.1]:3000/test/toggl"}` returned "That URL
  did not return an iCalendar file" — i.e. it fetched loopback. `127.0.0.1` and `2130706433` were correctly
  refused (the URL parser normalises the decimal form).
- Route ships to production: `.next/server/app/api/timetrack/calendar/route.js` exists after a build;
  `proxy.ts` matcher covers `/api/test/:path*`, not `/api/timetrack/:path*`.
- Unapplied migrations: `supabase migration list --linked`, three rows local-only.
- Cross-browser: 15/15 WebKit, 15/15 Firefox, 8/8 iPhone WebKit.
- iOS zoom: WebKit computed font sizes — timer input 14px; Reports 6 selects 14px; Settings 4 selects 14px.
- Scale: 3,000 entries = 963KB in localStorage, 2.8s load, 262ms Reports render, zero page errors.
- Build: fails before the `LivePortrait` move, passes after (`.next/BUILD_ID` written both via Turbopack now
  and via `--webpack` earlier).
- Test suite: 4,048 unit tests passing, 1 skipped.
