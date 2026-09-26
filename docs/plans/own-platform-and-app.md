# Off Vercel and Supabase, onto your own platform, aimed at a real app

**Status:** written 2026-09-26. Serves vision items 36, 37, 46 and 47.

Every number below was measured in this codebase on 2026-09-26, not estimated.
Where a number is a guess it says so.

---

# PART 1 — For you (plain language)

## What this does, and what you will see

It moves the app off Vercel and Supabase onto one platform you control, with the
database on a private network, and it rebuilds login as the kind a phone app can
use. When it is done, the thing on your phone can be a real installed app that
sends notifications when it is closed and keeps counting with the screen dark.

**You will see almost nothing new for several weeks.** The screens stay the same.
That is the honest cost of doing this once instead of twice.

## The five rules this plan follows

Approve these, not the phase count. Each says what it costs if it is wrong.

1. **The backend becomes a data service with token login, from day one.**
   Not the website moved to a new host. **If wrong:** you rebuild login a second
   time when the app arrives — the exact rebuild vision item 15 forbids.

2. **Everything that can be done on the current stack is done first, before
   moving.** The preparation shrinks the move itself. **If wrong:** nothing; the
   preparation is useful on either stack, which is why it is safe to do first.

3. **Staging and production exist from the first day on the new platform.**
   **If wrong:** you find out whether a migration works by running it on your own
   data.

4. **Nothing is deleted until its replacement has been used.** Supabase stays
   paid-for and running until the new platform has served real traffic. **If
   wrong:** a bad week becomes a lost weekend of restoring from a dump.

5. **The 66 database security rules are deleted, not translated.** They exist
   because the database sits on the public internet; on a private network the
   wall is the network. **If wrong:** this is the one rule with real downside —
   see the security note below.

## The security note, stated plainly

Today your database is on the public internet. The browser holds a key on
purpose, and **68 rules inside the database are the entire thing standing between
one user and another user's data.** I counted them across 56 migration files.

After the move, the database is unreachable from the internet, and the wall is
that every query goes through your own server code, which filters by user. That
is a stronger arrangement — one wall you can read instead of 68 you cannot.

**But the danger window is the move itself.** Between deleting the 68 rules and
having every query correctly filtered, a single missed filter exposes everyone's
data with nothing behind it. This plan handles that in one specific way: the
filtering is proved by a test that reads every query in the codebase before a
single rule is deleted (M4), and the deletion happens in the same step. If that
test cannot be made to pass, **the rules stay and this plan stops** — I will tell
you rather than proceed.

## What survives, and what gets rewritten

**Survives, untouched:** every screen, every component, all your business logic,
6,104 unit tests, the whole of Life Mastery, Training, Tracking, Scenarios and
the pipeline. This is the large majority of the codebase.

**Gets rewritten:** the layer that talks to the database and the layer that knows
who you are. Measured:

| What | Size today |
|---|---|
| Database access (`src/db/`) | 26 repo files, 14,194 lines |
| Files asking "who is logged in" directly | 50 files, 66 call sites |
| Database queries outside the database layer | 8 files, 18 call sites |
| Scripts talking to Supabase directly | 4 |
| Security rules to delete | 68, across 56 migration files |
| Database links to Supabase's user table | 40 |
| Screens the server draws (must become browser-drawn) | 23 of 94 |
| Data endpoints that already exist | 115 |

**The last two lines are the good news.** 71 of your 94 screens already draw
themselves in the browser and you already have 115 data endpoints, so you have
been building this the app way by accident. The app is much closer than the
hosting situation suggests.

## The milestones, each a working app

**M0 — Preparation, on the current stack. Nothing moves.**
One function answers "who is logged in", and all 50 files call it instead of
asking Supabase directly. All 18 stray database queries move into the database
layer. A test fails if anyone adds a new one.
*You see:* no change at all. Everything still on Vercel.
*Why first:* it turns "rewrite 50 files during the migration" into "rewrite one",
and it is useful even if you never move.

**M1 — The new platform exists, with staging and production, and deploys itself.**
An empty app on Railway, private Postgres, a staging copy, and a pipeline that
migrates the database then deploys. This is the "CD" your friend asked for
(vision item 37).
*You see:* a second URL that works and is not used yet. Vercel untouched.

**M2 — Your data lives there, on your own user table.**
Schema ported, all 40 links repointed from Supabase's user table to your own.
Run against a copy first, then for real.
*You see:* nothing. Staging holds a copy of your data.

**M3 — Login works with tokens, on the new platform.**
Better Auth, users in your own database, the five login pages repointed. Your own
account is the first test.
*You see:* you can sign in on the new URL.

**M4 — Every query filters by user, proved, and the 68 rules are deleted.**
The gate described in the security note. The test comes before the deletion.
*You see:* nothing. This is the most important step in the plan.

**M5 — The database layer is yours (Drizzle), and Vercel is switched off.**
All 26 repo files ported. Traffic moves. Supabase stays paid and running.
*You see:* the app, on your platform, at your address.

**M6 — The remaining 23 screens become browser-drawn, behind the data service.**
After this the backend is a pure data service and a phone app can talk to it.
*You see:* the same screens, possibly faster.

**M7 — A real installed app: notifications when closed, and screen control.**
The shell, the push handler, the two things you named.
*You see:* the app on your phone, notifying you.

**M8 — The legal minimum, before anyone but you uses it.**
Account deletion, data export, privacy policy, terms. **None of this exists
today — I checked.** Deletion and export are legal requirements the moment you
have users, and no host provides them.

## What this deliberately does not do

- It does not fix the known bugs. They are listed in `docs/known-failures.md` and
  they wait, except where a phase touches them anyway.
- It does not build the App Store listing, pricing or the store cut decision.
- It does not change any screen's design.
- It does not touch `src/vice/**` or `src/timetrack/**`. Other sessions own those.

## What it costs

**My honest estimate: 4 to 7 weeks of working sessions**, and it is an estimate,
not a measurement. The recorded figure was "about 3 weeks", which was written
when the job was thought to be 12 files; it is 26 repo files and 50 auth call
sites. I would not plan around 3 weeks.

M0 alone is 2 to 4 sessions and carries no risk.

---

# MANUAL BLOCKERS

Each attempted at least once, with the result.

### B1 — Your friend has not confirmed the platform, auth library or migration tool. **Proceeding without him.**
*Attempted:* the recorded defaults from the 2026-09-17 decision are Railway,
Better Auth and Drizzle. This plan is written against those.
*Why it is safe to proceed:* nothing in M0 depends on the choice, and the shape
of M1–M7 is identical on Fly or Render. If he picks differently, the platform
name changes in M1 and roughly two paragraphs move. **Not a reason to wait.**
*Needs him:* before M1 is executed, not before M0.

### B2 — Railway account and a payment method. **Cannot do; needs you.**
*Attempted:* no Railway credentials exist in this repo or environment.
*Cost:* roughly $5–20/month to start, replacing what Vercel and Supabase cost.
*When:* before M1.

### B3 — Apple and Google developer accounts. **Cannot do; needs you.**
*Attempted:* no such accounts or certificates referenced anywhere in the repo,
and no native tooling is installed (no Capacitor, Expo, React Native or Tauri in
`package.json` — checked).
*Cost:* Apple $99/year, Google $25 once.
*When:* before M7 only. Nothing earlier needs it.

### B4 — A dump of the live Supabase database. **Cannot do; needs you.**
*Attempted:* not attempted against live data on purpose. Reading production out
is your call and the credentials are yours.
*When:* before M2.

### B5 — Switching Vercel and Supabase off. **Cannot do; needs you.**
*Attempted:* Vercel deploys through its GitHub integration, so there is no
`vercel.json` and no `.vercel/` here to change — the switch is in Vercel's own
settings.
*When:* M5, and not before the new platform has served real traffic.

### B6 — I cannot test a real iPhone, a locked phone, or a push notification.
*Attempted:* nothing in this environment can do it. M7's acceptance is you
holding your phone.

### B7 — Three other Claude sessions share this checkout.
*Attempted:* messaged; they have told me what they own. `src/timetrack/**`,
`src/vice/**`, `public/sw.js` (its offline list), `playwright.config.ts` and
`components/BottomSheet.tsx` are in active use by others. M7 touches
`public/sw.js` — I will message before editing it.

---

# OPEN QUESTIONS

Each with a recommendation, so "go with your recommendations" is a complete
answer.

### Q1 — Which kind of app shell?
**Recommendation: Capacitor.** It wraps the code you already have, and the two
things you named (notifications when closed, screen control) are plugins rather
than a rewrite. React Native or a native rewrite means building every screen
again, which is the rebuild you have said you do not want. **Cost if wrong:** a
Capacitor app feels slightly less native in animation than a rewritten one.

### Q2 — Do subscriptions go through the app stores?
**Recommendation: no — sell on the web, let the app only sign in.** Apple and
Google take 15–30%, which turns your planned $1.99 tier into about $1.40. **Cost
if wrong:** slightly worse sign-up conversion for people who found you in a
store.

### Q3 — Does M8 (the legal minimum) move earlier?
**Recommendation: no, keep it last, but do it before the first user who is not
you.** It is a launch blocker, not a today blocker — there are no users. **Cost
if wrong:** if you let someone in before M8, you are collecting personal data
with no policy, no deletion and no export.

### Q4 — What happens to the 98 type errors and 335 lint errors during this?
**Recommendation: the ratchet holds the line — they may not increase — and they
are not fixed as part of this.** `next.config.mjs` also sets
`ignoreBuildErrors: true`, which is how they survive; turning that off belongs in
its own job, not buried in a migration. **Cost if wrong:** a real type error
hides among them for longer.

### Q5 — Do the four `/api/test/*` and `/api/exercising/*` routes that are live in
production get removed on the way?
**Recommendation: yes, during M1.** They are test surfaces reachable in
production. It is a small job and this is the moment the route list is being
handled anyway. **Cost if wrong:** nothing; they are not used by any screen.

---

# PART 2 — Execution

## Conventions

1. Every deliverable names its test. A step is done when its named test passes,
   not when the code is written.
2. No phase starts before the previous phase's test passes.
3. `git commit --only <paths>`, every time. Three other sessions share this tree.
4. Do not touch `src/timetrack/**` or `src/vice/**`.

## M0 — Preparation on the current stack

**M0.1 — One function answers "who is logged in".**
`src/db/auth.ts` already exports `requireAuth`, `requirePremium` and
`requireAccess` (lines 22, 43, 62) and almost nothing uses them. The 50 files
calling `supabase.auth.getUser()` directly (66 call sites) move onto them.
- Test: `tests/unit/architecture/oneAuthEntryPoint.test.ts` — new. Fails when any
  file outside `src/db/` contains `.auth.getUser()` or `.auth.getSession()`.
  Enumeration to state in the test: every `.ts`/`.tsx` under `src`, `app`,
  `components`, excluding `.d.ts`, comments stripped.

**M0.2 — No database queries outside the database layer.**
18 call sites across 8 files: `app/dashboard/qa/page.tsx`,
`app/dashboard/articles/page.tsx`, `app/dashboard/inner-game/page.tsx`,
`app/preferences/archetypes/page.tsx`, `app/test/archive/goals-hub/page.tsx`,
`src/scenarios/components/ScenariosPage.tsx`, `src/api_ai/apiAiRepo.ts`,
`src/api_ai/apiAiService.ts`. Each becomes a repo function.
- Test: extend `tests/unit/architecture.test.ts`. The existing boundary checks
  `@supabase` **imports**, which is why it never caught these — they get the
  client from `src/db/`. The new check is for the `.from("…")` query builder.

**M0.3 — The 4 scripts stop importing Supabase directly.**
`scripts/repair-counters.ts`, `scripts/tracking/audit-achievements.ts`,
`scripts/training-data/11.EXT.retrieval-smoke.ts`,
`scripts/dev/seed-training-year.ts`.
- Test: the same architecture check, extended to `scripts/`.

**M0 acceptance:** 6,104 unit tests still pass, both ratchets report "none new",
and the app still works on Vercel. Nothing about the platform has changed.

## M1 — Platform, staging, production, pipeline

- Railway project, private Postgres, two environments.
- `.github/workflows/deploy.yml`: migrate, then deploy. Staging on every push to
  `training-rebuild`; production on `main`.
- Remove `app/api/test/*` and `app/api/exercising/*` from the production build
  (Q5).
- Test: `tests/unit/ciWorkflows.test.ts` extended — migrate step precedes deploy
  step, and no workflow deploys without migrating.

## M2 — Schema and data

- Port 56 migrations. **One `users` table of your own**, and all 40
  `references auth.users` repointed to it.
- Order: staging from a dump first, verified, then production.
- Test: a row count per table, staging against the dump, plus a foreign-key
  integrity check that fails if any `auth.users` reference survives.

## M3 — Token login (Better Auth)

- Users in your own database. Tokens, not cookies, because a phone app cannot use
  the cookie (vision item 47).
- The five pages under `app/auth/` and `app/actions/auth.ts` repointed.
  `src/db/authCookies.ts` is replaced.
- Test: sign-up, sign-in, sign-out, password reset, and a token accepted from a
  non-browser client — that last one is what proves the app can log in.

## M4 — Prove the filtering, then delete the 68 rules

**The gate. Nothing after this runs if the test cannot pass.**
- A test that reads every function in `src/db/*Repo.ts` and fails any query that
  does not filter by the current user's id.
- Only once green: drop all 68 policies.
- Test: the above, plus a two-account integration test that reads across accounts
  and expects nothing.

## M5 — Drizzle, and Vercel off

- 26 repo files, 14,194 lines, ported behind the interfaces M0 established.
- Traffic moves. Supabase stays running and paid.
- Test: the existing suite. The repos have tests already; this is the phase where
  6,104 passing tests earn their keep.

## M6 — The last 23 server-drawn screens

- The 23 `page.tsx` files without `"use client"` become browser-drawn against the
  115 existing endpoints plus whatever is missing.
- Test: each converted route keeps its existing e2e spec green.

## M7 — The real app

- Capacitor shell (Q1). Push handler in `public/sw.js` — **message the session
  that owns its offline list before editing.**
- Notifications when closed; screen-dark counting. Today there is no push at all:
  `useTimetrack.ts:289` and `RestBar.tsx:91` only fire while the page is open.
- Test: B6 — you, holding your phone.

## M8 — The legal minimum

- Account deletion, data export, privacy policy, terms, cookie notice.
- None exists today. `deleteUserValues` (`src/db/valuesRepo.ts:80`) deletes one
  slice's rows, not an account.
- Test: an integration test that deletes an account and finds no row of theirs in
  any of the **66 tables** the migrations create. Counted 2026-09-26, and it
  matters: the figure carried in the notes was 34, so the table the test forgets
  is the one that keeps somebody's data after they asked for it to be gone.
