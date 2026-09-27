# Off Vercel and Supabase, onto your own platform, aimed at a real app

**Rewritten 2026-09-27**, replacing five stacked revision banners that had stopped
agreeing with the milestones beneath them. Serves vision items 36, 37, 46, 47.

**How to read this.** Every number in this plan lives in **THE NUMBERS** and
nowhere else — if a milestone needs a figure it names the row, so a correction
happens in one place. Every decision lives in **DECISIONS** and is stated once.
Every milestone declares what it **depends on**, so an ordering mistake is visible
rather than buried. What moved and why is in the **revision log at the end**, which
records history and is never where a change lives.

**Five rounds of adversarial review produced 50 findings. The 13 changes announced
in rounds 4 and 5 were written as banners and never reached the milestones; that is
why this is a rewrite and not a sixth revision.**

---

# PART 1 — For you, in plain words

## What this does

Moves the app off Vercel and Supabase onto one platform you control, with the
database off the public internet, and rebuilds login as the kind a phone app can
use. When it is done the thing on your phone can be a real installed app that
notifies you when it is closed.

## What you will see

**Almost nothing new, for months.** The screens stay the same. That is the cost of
doing this once instead of twice.

**One thing you must not lose, and the old plan would have taken it:** you use this
product every day on `localhost:3000`, against live Supabase, and there is no local
database here to fall back on (there is no `supabase/config.toml`). Three steps in
the old plan quietly broke that, one of them for weeks. **M1 now delivers a
development connection before anything depends on it, and every milestone states
whether your daily use survives it.** If a milestone cannot say yes, it does not
start.

## What it costs

**$40–60 a month for the platform. $115–140 if the AI models are hosted on it.**
See the cost rows in THE NUMBERS. The old plan said $5–20, which was wrong by
enough to matter.

**Time: unknown, and I will not give you a single number again.** It was 4–7 weeks,
then 6–10, then 8–14, and each was produced by a review that then found more work.
What I can say honestly: **M0 alone is the largest piece of preparation ever
attempted in this project**, and it is gated on you (B1). The milestones below each
carry their own size so you can see where it goes.

## The five rules this plan follows

Approve these. Each says what it costs if it is wrong.

1. **The backend becomes a data service with token login, from day one.** Not the
   website on a new host. **If wrong:** you rebuild login when the phone app
   arrives — the rebuild vision item 15 forbids.
2. **Everything doable on the current stack is done first.** **If wrong:** little;
   the preparation is useful either way. **But it is no longer risk-free** — M0 now
   needs a dump of your live database (B1), so it starts with your credentials, not
   without them.
3. **Staging and production exist from the first day on the new platform.** **If
   wrong:** you learn whether a migration works by running it on your own data.
4. **Nothing is deleted until its replacement has served real traffic.** Supabase
   stays paid and running. **If wrong:** a bad week becomes a lost weekend.
5. **You can use the product on localhost every day of this.** **If wrong:** you
   stop being able to work on your own product for the duration, which is how a
   three-month migration becomes abandoned.

**The rule that used to be number 5 — "the 68 database rules are deleted, not
translated" — is gone.** It was contradicted by this plan's own recommendation 250
lines below it, and the count was wrong. It is now Q-POLICIES, unanswered.

## The security position, stated plainly

Today your database is on the public internet. The browser holds a key on purpose,
and **the rules inside the database are the entire wall** between one user and
another. After the move the database is unreachable from the internet and the wall
is your own server code filtering every query.

**Three things make the changeover the dangerous part, and all three were missed
until round 4:**

- **Some of your code deliberately has no filter of its own**, because a database
  rule does that job. `save_life_plan` takes the owner from the caller's own payload
  and looks up a plan by id with no user check — its own migration says the rule is
  what refuses. Delete the rules with that unchanged and one user can read and
  overwrite another's whole life plan.
- **A second kind of protection exists that nobody had counted**: rules about which
  *columns* you may change. The one stopping a user from granting themselves premium
  is of that kind, and no row rule can do its job. It disappears with the move.
- **Some rules are small programs attached to tables**, not policies. One exists
  purely so nobody can attach their own workout to someone else's program.

**So M4 is a gate, and it now proves itself on a throwaway copy with the rules
already removed.** Run against a database where they still apply, the test passes
because the database refused — which is the green light for removing the database's
refusal. That was the shape of the old M4 and it could not have closed.

## Three live problems this move does not create and does not fix

Stated here because they are yours to know about now, not at the end.

1. **Your AI spending cap has a hole today.** The three features that run on the
   Claude CLI skip the budget check entirely. Vision item 11 is unmet in a way the
   move does not touch.
2. **Serving app users from your personal Claude Max subscription is outside its
   terms.** The code says so itself: *"For beta testing only. Switch to API for
   production."* That has to change before anyone pays you.
3. **Your scenario corpus appears readable by any signed-in user.** A sibling table
   holding the same kind of data was locked down and this one was not. Nothing needs
   that access. One line fixes it; it is a migration, so it waits on you (Q-CORPUS).

---

# THE NUMBERS

**Every figure in this plan is here and stated nowhere else.** All measured
2026-09-27 on `training-rebuild` unless noted. A number that moves is a number a
peer is editing — treat each as a floor.

## What gets rewritten

| Row | Figure |
|---|---|
| N1 · Database access: `src/db/*Repo.ts` | 26 files, **11,272** lines |
| N2 · All of `src/db/` | 46 files, **14,330** lines |
| N3 · The two largest repos | `workoutRepo` **1,762**, `healthRepo` **1,296** |
| N4 · Files importing `@/src/db/` | **275** (app, src, tests) |
| N5 · Identity calls still outside the facade | **20** call sites, 20 files, ledger agrees |
| N6 · Business logic touching Next.js | **0** of 314 non-component `src/*.ts` |

## The database, and why the migration folder is not it

| Row | Figure |
|---|---|
| N7 · Tables the code queries | **46** |
| N8 · Tables any migration creates | **66** |
| N9 · **Queried but created by NO migration** | **19** — `ai_usage_logs`, `approaches`, `daily_goal_snapshots`, `embeddings`, `field_report_templates`, `field_reports`, `inner_game_progress`, `milestones`, `purchases`, `review_templates`, `reviews`, `scenarios`, `sessions`, `sticking_points`, `user_goals`, `user_tracking_stats`, `user_values`, `value_comparisons`, `values` |
| N10 · Tables in the test mirror `tests/integration/schema.sql` | **52**, last synced 2026-09-18 |
| N11 · Row-security policies | **~140** — 64 written out, plus 4 inside a loop over 19 `timetrack_*` tables = 76. A grep says 68 and is wrong. Authoritative count: `select count(*) from pg_policies where schemaname='public'` |
| N12 · `references auth.users` in migrations | **40**, plus ~16 more on the N9 tables |
| N13 · `user_id uuid` column declarations | **61** |
| N14 · Migration files referencing Supabase-only roles | **16** of 56, in **19** GRANT/REVOKE statements |
| N15 · Postgres functions the app calls by name | **11**. `match_embeddings` is defined **nowhere in this repo** |
| N16 · Parked migrations outside `migrations/` | **2**, one dated 2026-09-27 — so "56" is 58 and moving |

## Tests

| Row | Figure |
|---|---|
| N17 · Unit tests | **6,116+**, rising daily as peers work |
| N18 · Repos with a test that executes repo functions against a database | **0 of 26**. Only 3 of 22 integration files import repo code at all; the rest test schema constraints with raw SQL and say so in their headers |
| N19 · Type errors / lint errors (ratcheted, may only fall) | **98** / **323** |
| N20 · pgvector exercised by any test | **never**. The harness fakes it as `DOUBLE PRECISION[]` |

## The web app

| Row | Figure |
|---|---|
| N21 · API endpoints | **116** `route.ts` |
| N22 · With a dynamic `[id]` segment | **26** |
| N23 · **No dynamic segment and no parameters read at all** | **21** — "give me *my* collection". No id to substitute |
| N24 · Screens | **94** `page.tsx`; **71** browser-drawn, **23** server-drawn |
| N25 · `fetch("/api/…")` with a relative path | **189** call sites in **62** files |
| N26 · Server Actions / files importing `next/headers` | **3** / **3** |
| N27 · `app/api/test/*` + `app/api/exercising/*` routes live in production | **14** (11 + 3), all with live callers |
| N28 · `page.tsx` under `app/test/` | **63**, all 404 in production by design |

## The pipeline and the AI

| Row | Figure |
|---|---|
| N29 · Pipeline stages | **11**. Only **3** touch the database |
| N30 · Stages pinning the Claude CLI to a path in your home folder | **8** |
| N31 · Product features running that same CLI | **3** — Keep It Going, Scenario Lab, Vision→Plan Lab |
| N32 · Corpus inputs on your laptop | **107 GB** |
| N33 · Scripts reaching the database | **12**, including `backup-timetrack.ts` and `restore-timetrack.ts` |

## Branches and cost

| Row | Figure |
|---|---|
| N34 · `training-rebuild` vs `origin/main` | **313 ahead, 0 behind** → fast-forward, no conflict risk |
| N35 · `beta` vs `main` | **1 ahead, 59 behind**, last touched 2026-02-27; it deletes Ask Coach, articles and lair — a different product |
| N36 · Platform cost | **$40–60/month** |
| N37 · Cost with AI models hosted | **$115–140/month** |
| N38 · Volume cost if the 107 GB moves | **+$15.45/month** |

**N36–N38 were priced against a managed platform and are not Hetzner's numbers.**
D1 changed the provider on 2026-09-27, so those three rows are superseded by N39–N43
below and are the only figures in this plan that a decision has invalidated. Do not
quote them at the owner.

Hetzner's own, from its pricing 2026-09-27 — **confirm on the order page, because
Hetzner raised cloud prices on 15 June 2026 and the CPX line rose steeply:**

| Row | Figure |
|---|---|
| N39 · Two small servers (staging + production, same shape) | **€11–16/month** — CX23 from €5.49, CPX22 €5.99 |
| N40 · Postgres data volume + an object-storage bucket for WAL and backups | **€6–12/month** |
| N41 · **Platform total, self-hosted** | **≈ €20–30/month** — materially below N36. The saving is paid for in operations work, not conjured |
| N42 · If the AI models are hosted (Q-AI-HOST) | **+€40–90/month** for a box holding ~8 GB resident. Still the largest single line |
| N43 · If the corpus inputs move (D5, N32) | **≈ €5/month** of volume — a fraction of N38, which is what makes D5 a choice again |

Confirm N39–N43 on the order page before B2 is acted on.

---

# DECISIONS

Settled. Each stated once, here, and referenced by the milestones that act on it.
Nothing below re-opens one.

**D1 is settled hardest of all, and by you rather than by this plan. The provider
is Hetzner, because your programmer friend recommended it — decided 2026-09-27.**
That reason is sufficient on its own: no cost row in this document, no benchmark
and no recommendation of mine outranks it, and if every other line here is torn up
in review, this one stands. Only you and he can change it. Any session that opens
with "have you considered Fly, Render, or staying on Vercel" is out of scope of
this plan and is spending your turn on a question you already closed.

**Hetzner is a server, not a platform, and this document was written against a
managed one.** Four jobs therefore move from "the provider does it" to "we do it",
and each is now owned by a milestone rather than left implied: the build runs in CI
and the server only runs the result (M1.1); TLS, OS patching and uptime monitoring
(M1.7); the deploy mechanism, because there is no provider git integration to
deploy for us (M1.8); and Postgres backups, which is the one that changes an
ordering — M2 now loads real data before M1b.4 exists, and on a managed platform
the provider's own snapshots quietly covered that gap. Two things get **easier**:
pgvector is installed rather than hoped for (M2), and the private network is the
box's own loopback with 5432 closed at the firewall. **Nothing else moves** — M0 in
full, the database-layer port, the auth call sites, M4's gate, M6, M7 and M8 are
exactly as written below.

| # | Decision | Why, and what it cost |
|---|---|---|
| D1 | **Leave Vercel and Supabase for Hetzner** — a server you run, with Postgres on a private network and the app's own auth. Auth and migration defaults unchanged: Better Auth, Drizzle. | Leaving decided 2026-09-17. **Provider settled 2026-09-27 because your friend recommended it; that reason stands on its own and is re-litigated by nobody.** Still his to call and not blocking (B7): the deploy layer — GitHub Actions over SSH, or Coolify / Dokku on the box — Postgres on the app box or its own, one server or two. Defaults if he does not say: Actions + Compose over SSH, Postgres on the same box with its data on a separate volume, two small servers so staging and production keep the same shape. |
| D2 | **The backend is a separate data service with token login**, not the website rehosted. | A phone app cannot use server-drawn pages or the browser cookie. Building it later means building login twice. |
| D3 | **The users table's primary key is `uuid`, and every imported account keeps the uuid Supabase gave it.** | N13: 61 `user_id uuid` columns point at it. Better Auth defaults to a **text** id — if that default is taken, M2 stops being a repoint and becomes a type migration across every user-owned table. **Verify Better Auth can be overridden this way before committing to it.** |
| D4 | **The Claude CLI must become the Anthropic API** in the 3 product features (N31). | It is a desktop binary pinned to a path in your home folder; no host can run it. The code deliberately deletes `ANTHROPIC_API_KEY` for its child process, so adding a key does not rescue it. Its own header says "Switch to API for production." Cost: a code change in 3 files, a real per-call bill, and re-enabling the budget check that path skips. |
| D5 | **The corpus build stays on your machine for now — but Hetzner reopens this, so it is a choice rather than a constraint.** Hetzner rents dedicated and GPU machines by the month, which the managed platform did not, and N43 makes the storage trivial. **Revisit after M1 is up; do not fold it into this plan.** Only stages 09/10/11 — the ingest tail, N29 — move to the platform. | Stages 02–05 need a GPU (a Cloud VPS has none); stages using the CLI (N30) need an interactive login. Its output crosses the wall, not the pipeline. Moving the build is a separate project with its own budget. |
| D6 | **The embedding model may not change.** The chat model may move to a paid API freely. | One hardcoded constant both stores and queries the vectors. A different 768-dimension model means comparing two unrelated vector spaces: Ask Coach returns confident answers built from irrelevant excerpts, and **no test in this project could tell**. Changing it means re-embedding the whole corpus. |
| D7 | **Sell subscriptions on the web; the app only signs in.** | The stores take 15–30%, turning $1.99 into about $1.40. |
| D8 | **Capacitor, with bundled assets and one configured API base URL.** | The alternative — a shell pointing at the remote URL — is what Apple's guideline 4.2 rejects. Cost, which the old plan hid by saying Capacitor "wraps the code you already have": N25 must route through one indirection, plus the 3 auth redirects built from `window.location.origin` that would resolve to `capacitor://localhost`. **Done as M0 preparation, where it is cheap and useful either way.** |
| D9 | **The type and lint ratchets hold the line and are not paid down here.** | They may not increase. `ignoreBuildErrors: true` is its own job, not one buried in a migration. |
| D10 | **`app/api/test/*` and `app/api/exercising/*` are NOT deleted.** | N27: 14 routes, all with live callers, including your article authoring tool. The old plan said four and "cost if wrong: nothing", presented as measured. They get the same production gate the pages have, decided together with the pages. |

---

# OPEN QUESTIONS — these need you

Each has a recommendation, so "go with your recommendations" is a complete answer.
**A milestone that depends on an unanswered question says so and does not start.**

### Q-POLICIES — Are the database rules (N11) deleted, or kept as a second wall?
Row-level security is a Postgres feature, not a Supabase one, so it survives the
move. Keeping it means rewriting each rule to read a value your code sets instead of
asking Supabase who you are.

**Recommendation: keep them, rewritten.** Vision item 10 is "nobody can read or take
another user's data"; item 40 says you take the programmer's road. **Cost if wrong:**
time spent on a wall you did not need, and slightly more work per new table. **Cost
the other way:** one missed filter across N1 exposes one user's
data to another with nothing behind it. The costs are not the same size.
**Note the old "a week" estimate was priced against a count of 68, not N11, and 76 of
them are in the area B-PATHS covers.** *Gates: M4.*

### Q-CORPUS — May I write the one-line lockdown for the `embeddings` table?
It is readable by any signed-in user; nothing needs that; its only reader runs
server-side with an admin key. A migration, so it waits on you. Changes no data.
**Recommendation: yes, now, separately from this plan.** *Gates: nothing. It is
independent.*

### Q-SEAM — M0.4's seam: ambient provider, or threaded parameter?
An ambient provider (a settable module-level factory, default today's client)
touches ~26 files and no call sites. A threaded parameter touches N4's 275.
**Recommendation: ambient provider.** *Gates: M0.4, and the only honest estimate for
it.*

### Q-BETA — Is the `beta` branch retired or given its own environment?
N35: seven months stale and a deliberately different product. Under D1 no provider
deploys anything on its own — our own `deploy.yml` is the only path — so the risk is
now a branch trigger we write ourselves, and it is one line of YAML away. **Recommendation: retire it** — delete the
branch and its CI triggers. **Cost if wrong:** you lose a staging lane you have not
used since February. *Gates: M1.*

### Q-AI-HOST — Is Ollama hosted on the platform, or do those slices move to a paid API?
N36 vs N37: this single choice is three to four times everything else in the bill.
It cannot be made cheap by letting it sleep — reloading 4.9 GB of weights on the
first request means Ask Coach times out rather than being slow. **And D6 constrains
it: the embedding half cannot move.** So the real question is only about the chat
half. **Recommendation: host Ollama for embeddings, move chat to the API.** *Gates:
M1.6.*

---

# BLOCKERS

Each names the milestone it gates, in its own entry.

### B1 — A schema-only dump AND a data dump of live Supabase. **Needs you. Gates M0.4.**
*Attempted:* not against live data, on purpose — those are your credentials.
*Why it moved to the front:* N9. Nineteen tables the code uses exist in no
migration, so **the migration folder cannot rebuild your database** and
`supabase db reset` already fails on the second file. The only authoritative
description of your schema is the live database. M0.4 has to complete the test
mirror from N10, and it cannot invent 29 tables.
*Consequence to state plainly:* the first substantive step of this plan is gated on
you. "M0 carries no risk" was wrong on both halves.

### B2 — Hetzner account, a payment method and an SSH key. **Needs you. Gates M1.**
*Also:* Hetzner verifies new accounts, which can take a day or two — open it early
rather than on the morning M1 starts.
*Cost:* **not priced** — see the note under N36–N38. The shape is N36, or N37 if
Q-AI-HOST says host, but those were a managed platform's prices.

### B3 — An email provider and a domain you control. **Needs you. Gates M1b.3.**
*Attempted:* no provider is configured anywhere; Supabase sends every confirmation
and reset today. There is no custom domain in the repo.
*Why it gates more than it looks like:* the day login becomes yours, nobody can
confirm an address or recover a password. And mail from a new sender lands in spam
until DNS has settled — a wait, not a task, so start it at M1.

### B4 — Apple and Google developer accounts. **Needs you. Gates M7 only.**
*Cost:* Apple $99/year, Google $25 once. No native tooling is installed yet.

### B5 — Switching Vercel and Supabase off. **Needs you. Gates M5, and not before
the new platform has served real traffic** (rule 4).

### B6 — A real phone, locked, receiving a notification. **Needs you. Gates M7's
acceptance.** Nothing here can test it.

### B-PATHS — Convention 4 must be renegotiated before M0.4. **Gates M0.4, M1b.2,
M7, M1.6 and Q-POLICIES.**
The old plan said "do not touch `src/timetrack/**` or `src/vice/**`" and then
required those paths in **five** places: M0.4's tests for `timetrackRepo`,
`timetrackBackupRepo` and `viceRepo`; the rate-limit counter; M7's notification
scheduling; and 76 of N11's policies. Five collisions with one rule is not five
problems, it is one unmade decision. **Resolve it once, with the sessions that own
those paths, before M0.4 starts.**

### B7 — Your friend's call on the layers under D1. **Not blocking. Not the provider.**
The provider is settled — he chose it (D1). What is still open is the deploy layer,
Postgres on the app box or its own, and one server or two; D1 records the defaults
to build against. Nothing in M0 depends on any of it and the shape of M1–M7 does not
change with the deploy layer. **Do not wait, and do not re-ask him about Hetzner.**

---

# OWNERSHIP — one milestone per job

Written because the old plan had three claimants for the schema and two for the
first data load. Anything with no owner here is out of scope, explicitly.

| Job | Owner |
|---|---|
| Source of truth for the schema | **B1's schema-only dump.** Not `supabase/migrations/`, not the test mirror |
| The data seam (Q-SEAM) | **M0.4**, its first deliverable |
| Completing the test mirror to the live schema | **M0.4** |
| The API base-URL indirection (D8) | **M0.5** |
| The app builds and boots on the platform | **M1.1** |
| Secrets, healthcheck, monitoring | **M1.7** |
| Scheduler | **M1b.2** |
| Email | **M1b.3** |
| Backups with a restore actually performed | **M1b.4** |
| Pipeline ingest tail route (D5) | **M1b.5** |
| AI hosting decision executed (D4, Q-AI-HOST) | **M1.6** |
| Rate-limit counter moved to a shared store | **M1.6** |
| pgvector, the `embeddings` table, `match_embeddings` | **M2** |
| Supabase roles / the 19 GRANTs (N14) | **M2** |
| Users table, id type (D3), password migration | **M3** |
| `profiles` row creation and timezone capture at sign-up | **M3** |
| The permission model, incl. the `has_purchased` column allow-list | **M4** |
| The 11 Postgres functions (N15) | **M4** decides their fate, **M5** ports the callers |
| Connection pooling | **M5** |
| Account deletion and export | **M8** |
| **Out of scope, stated:** paying grants access (no Stripe webhook); the 98 type and 323 lint errors (D9); `ignoreBuildErrors`; moving the corpus build off your laptop (D5) | — |

---

# MILESTONES

Fixed shape, every one: **depends on** · **deliverables** · **acceptance, and what
must already exist for that test to be runnable** · **your daily use** (rule 5) ·
**not covered**.

Conventions: a step is done when its named test passes. No milestone starts before
its dependencies pass. `git commit --only <paths>` — three other sessions share this
tree.

## M0 — Preparation on the current stack

**Depends on:** B1 (the dumps), B-PATHS (convention 4 resolved).
**Your daily use:** unaffected, except where noted in M0.6.

### M0.1 — One function answers "who is logged in". **DONE** (`3a54e532`, `54749fce`)
All 48 API-route call sites now use `requireAuth` / `requirePremium` /
`requireAccess` / `optionalUserId` in `src/db/auth.ts`. Five files that each carried
their own copy of the paywall now share one.
- **N5 remain, and they are four different jobs, not one:** 10 server pages needing a
  redirect-shaped facade **that does not exist yet**; `app/page.tsx`, which renders a
  signed-out landing page instead of redirecting; `app/life-mastery/layout.tsx`,
  which carries a `?next=` return address; `app/auth/reset-password/page.tsx`, which
  runs in the browser where a server facade cannot reach; `app/dashboard/tracking/layout.tsx`,
  which spells it `getSession()`; `src/api_ai/apiAiService.ts`, which uses the admin
  api; plus 5 server components/actions and `src/db/profilesRepo.ts`.
- **So "swapping the provider is a one-file change" is a two-file change**, because
  `profilesRepo` asks too.
- Acceptance: the guard in `tests/unit/architecture.test.ts` catches `getUser()`,
  `getSession()` **and** `auth.admin.*`, with a ledger that may only shrink. Both
  failure modes proved by planting them. It took three passes to enumerate one
  concept; that is the honest record.
- **Still to do here:** build the page-shaped facade and convert the 10 server
  pages, with a browser check, because they are live pages your localhost serves.

### M0.2 — No database queries outside the database layer
18 call sites in 8 files. Round 4 checked every one for the `save_life_plan` pattern
— relying on a database rule instead of filtering — and **found none**. The five
`profiles` reads and both in `ScenariosPage` all filter by the signed-in user; the
four unfiltered reads in `apiAiRepo` sit behind an admin-key gate that fails closed.
- Acceptance: extend `tests/unit/architecture.test.ts` to the `.from("…")` query
  builder. The existing boundary checks `@supabase` **imports**, which is why it
  never caught these — they get their client from `src/db/`.

### M0.3 — Scripts stop reaching the database directly
**N33, not the 4 the old plan named.** The four it named plus `audit-rls.ts`,
`seed_values.ts`, two training-data stages, and — the ones that matter —
`backup-timetrack.ts` and `restore-timetrack.ts`, **the timetrack slice's own
disaster recovery**, which reach it through `timetrackBackupRepo`.
- Acceptance: the same architecture check extended to `scripts/`. **Note it goes red
  on all 12, so M0.3's deliverable must cover all 12** — the old plan's test
  contradicted its own scope.

### M0.4 — Give the database layer a testable seam, and tests. **The largest piece.**
**Depends on:** B1, B-PATHS, Q-SEAM.
1. **The seam first** (Q-SEAM). N18 is zero — not the 12 an earlier round
   claimed, which was a count of filenames appearing inside test files. Only 3 of 22
   integration files import repo code, and the rest say in their headers that they
   test schema constraints rather than repo logic. They *cannot* test repo code:
   every repo builds its own client, which speaks HTTP to Supabase and reads
   `next/headers`. **That last fact is also why rule 1 is not yet true — the data
   layer is bound to Next's request context.**
2. **Complete the test mirror** from N10 to the live schema, out of B1's
   dump. Without this M0.4 cannot seed a fixture for 8 of its own targets.
3. **Tests that execute repo functions**, written now against Supabase so they
   describe behaviour, not implementation. A test written after the rewrite only
   proves the rewrite agrees with itself.
4. **The repo graph must be done whole.** `healthRepo` reaches the database through
   `settingsRepo`; `workoutRepo` through three other repos and two Postgres
   functions. Giving one a seam while its callees build their own client buys
   nothing.
- Acceptance: `npm run test:integration` executes repo functions for 26 of 26, and
  the mirror contains every table in B1's dump. **Prerequisite for the test to be
  runnable at all:** B1 and step 2.
- **Not covered:** this does not port anything. It builds the net M5 falls into.

### M0.5 — One API base URL (D8)
N25 routes through one `apiFetch()` helper, and the 3 auth redirects built from `window.location.origin` take a
configured address.
- Acceptance: an architecture test that fails on a new bare `fetch("/api/…")`.
- **Why now:** useful on either stack, and it is the difference between D8 being a
  wrapper and a rewrite.

### M0.6 — Your development connection (rule 5)
A way for your `localhost:3000` to reach a database once the real one is private:
the platform CLI's tunnel, or a local Postgres loaded from B1's dump.
- **This exists before M1 finishes**, because M1.6, M1.7 and M5 each break your daily
  use without it. M1.6 makes an environment variable mandatory on your laptop the
  moment it lands; M1.7's "refuse to boot when a variable is missing" applies to your
  machine too, and there are 21 of them; M5 rewrites 21 of 26 repos to talk to a
  database your laptop cannot reach.

**M0 acceptance:** N17 still passes, N19 reports "none new", `npm run test:integration`
covers 26 of 26, and the app still works on Vercel. Nothing about the platform has
changed.

## M1 — The platform exists

**Depends on:** B2, Q-BETA. **Split from the old M1**, because four of its
sub-milestones named tests that need M2 and M3 — so the old plan deadlocked at its
second milestone. The always-on parts are now **M1b, after M3**.

### M1.1 — It builds and boots. **First, because everything else assumes it.**
**Correcting a claim I made and you were told:** CI *does* build this app, and has
since 2026-02-04 — `playwright.config.ts` runs `npm run build && npm start` when
`CI` is set, and all three e2e jobs set it. The earlier "only Vercel has ever built
this" was me reading the workflow file instead of what the workflow does.
- **Under D1 the build happens in GitHub Actions and the server only runs the
  result** — an image or artifact. Actions sets `CI`, so `scripts/build.sh` takes
  its straight-through branch at line 28 and the `systemd-run` ceiling is never
  needed. That keeps the 29 GB freeze class off the production box permanently, and
  it means the server is sized for running the app, not for compiling it.
- If anything ever does build on the box, `scripts/build.sh` needs a third case —
  "inside a container whose memory is already limited" — rather than relying on `CI`
  being set by accident. It **exits 1** today on any host that sets neither `CI` nor
  `VERCEL`, which is the correct refusal, not a bug.
- The webpack build's peak memory is **readable from an existing green e2e run's
  log** — no measurement job needed.
- Watch: `next.config.mjs` excludes the Node-only ONNX runtime under a
  **Turbopack-only** key while the build command passes `--webpack`. Three client
  components import `@huggingface/transformers` dynamically, so it may be benign —
  it is the one place the two engines are configured differently.
- Acceptance: a deployed URL that serves the app and answers M1.7's healthcheck.

### M1.7 — Secrets, healthcheck, monitoring
**21** distinct environment variables are read across the codebase. `NEXT_PUBLIC_APP_URL`
is baked into both Stripe's return URL and M1b.3's email links.
- `NEXT_PUBLIC_BUILD_ID` is required and wired to the platform's commit variable, and
  **the build fails rather than resolving to `"unknown"`** — the workflow sets it
  from `github.sha`, since under D1 there is no provider commit variable at all.
  `OfflineShell` refuses to register the service worker without a build id, so a
  deploy that skips this silently ships with no offline support whatever, on the move
  chosen to get you a phone app. Crash reports also collapse to one release, which the config's own
  comment says destroys the only number worth prioritising by.
- `/api/healthz` that touches the database. Note `app/api/health/*` is the
  health-**tracking** slice, not a probe.
- An error sink that is **not** the app's own Postgres — `/api/errors` writes to the
  database it would need to report on.
- `prune_error_reports()` has no caller anywhere, so `error_reports` grows without
  bound. M1b.2 owns it.
- A fourth place secrets live: `e2e.yml` hardcodes five Supabase values in `env:`.
- **On Hetzner there is no platform secret store**, so they are a file on the box with
  file permissions as the only wall, readable by anything that gets a shell. Say where
  it lives, who may read it, and that it never reaches the repo or a backup that
  leaves the box. New work the managed platform had done for us.
- **Three jobs D1 hands us that no provider now does:** TLS certificates (Caddy or
  Traefik in front of the app, renewing on their own), unattended security upgrades
  on the box, and an **external** uptime check — external because a monitor running
  on the server cannot report that the server is down. This project has no monitoring
  of any kind today and Vercel supplied it for free, so this is a new job, not a
  ported one.
- Acceptance: the app refuses to boot with a variable missing, loudly; a certificate
  renews without being touched; and the uptime check has fired once, on purpose, into
  something you actually read. **Prerequisite: M0.6, or this locks you out of your own
  dev server.**

### M1.8 — Deploy pipeline
Migrate, then deploy. Staging on push to `training-rebuild`, production on `main`.
- **How `main` gets updated must be stated**: N34 says the merge is a fast-forward
  with no conflict risk, but the heavy e2e suite runs only on PRs into `main` and
  nightly, and of 179 measured runs every completed one was red. **So that merge
  would be the first full-suite run against this code, and M1.8 deploys production
  from it. "The full suite green once" is a precondition, not an assumption.**
- GitHub workflows are independent: a `deploy.yml` on push runs *beside* `ci.yml` and
  would ship red code unless it uses `workflow_run`.
- **Under D1 this workflow is the only way anything reaches the server** — there is no
  provider git integration to deploy behind our backs, which removes a whole class of
  surprise and makes this milestone load-bearing rather than convenient. It builds the
  image (M1.1), runs the migrations, then restarts the app over SSH. The mechanism
  itself is B7's open sub-choice; the default is Actions + Compose over SSH.
- Acceptance: `tests/unit/ciWorkflows.test.ts` extended — migrate precedes deploy, no
  workflow deploys without migrating, and no deploy triggers independently of CI.

### M1.6 — Every AI dependency named, with its replacement (D4, D6, Q-AI-HOST)
Two classes, not one. **Ollama** is hostable (see N37). **The Claude CLI is not** —
N30 and N31. Executing D4 means: 3 files move to the Anthropic API, the budget check
that path skips is re-enabled, and the `execSync` call stops blocking the event loop
for 60 seconds, which was invisible on Vercel and freezes every other user on one
always-on container.
- Remove the `|| "http://localhost:11434"` default — a silent fallback CLAUDE.md
  forbids, which presents as "the AI is slow" rather than "not configured".
- **The rate-limit counter moves to Postgres here**, before it is relied on. It is an
  in-memory map per process, so with staging plus production the real limit is
  already twice the stated one — and for the AI endpoints that multiplies the bill.
  It lives in `src/timetrack/`, so it needs B-PATHS.
- Acceptance: Ask Coach and Inner Game answer on the deployed URL; a budget-exceeded
  user is refused on every AI path including the ones that used the CLI.
- **Prerequisite: M0.6** — removing the default makes the variable mandatory locally.

## M2 — Schema and data

**Depends on:** B1, M1.1, and **M3's library choice and id decision (D3)** — because
the login library owns the users table, so building one here first means repointing
N12 twice.

- **The source of truth is B1's schema-only dump, not `supabase/migrations/`** (N9).
- `CREATE EXTENSION vector`; the real `embeddings` table with its `vector(768)`
  column and index; `match_embeddings` read out of live Supabase and committed
  (N15). **Under D1 this stops being a platform gamble** — the extension is installed
  on our own Postgres as a provisioning step, so the old "verify the provider ships
  pgvector or change the database" risk is closed.
- **A backup runs off the box before the first real row lands here, and a restore has
  been performed once.** On a managed platform the provider's snapshots covered the
  window between this milestone and M1b.4; under D1 nothing does, and this is the
  milestone that puts your only copy of months of goals, approaches and field reports
  onto a server you administer. A scheduled `pg_dump` to storage that is not this
  server is enough to start; M1b.4 upgrades it to point-in-time recovery. **M2 does
  not load production data until that dump has been restored into staging once.**
- The Supabase roles (N14): state whether they are recreated or the 19 grants
  rewritten. On a fresh Postgres those roles do not exist and the replay stops there.
- The embeddings table **records its model name**, and retrieval **refuses to answer**
  when the stored and query models differ rather than comparing across vector spaces
  (D6).
- Order: staging from the dump, verified, then production.
- Acceptance: **row counts per table compared against live Supabase at the moment of
  the check, not against the dump** — the dump is taken once and cutover is months
  later, so a stale dump passes a dump-to-copy comparison while every goal, approach
  and field report you recorded in between exists only in Supabase. Plus the set of
  triggers, CHECK constraints, unique indexes and foreign keys matching the dump name
  for name — nothing currently guards those.

## M3 — Token login

**Depends on:** M2's schema, B3 (email, for the reset path).
- Users in your own database. Tokens, not cookies (D2). The five `app/auth/` pages
  and `app/actions/auth.ts` repointed; `src/db/authCookies.ts` replaced.
- **Creating the `profiles` row, and capturing the timezone, at sign-up.** A
  `SECURITY DEFINER` trigger on `auth.users` does it today and **no app code inserts
  a profile — zero inserts or upserts anywhere.** The trigger dies with `auth.users`,
  so a new account gets no profile and hits a blank wall at every access gate with no
  error explaining it. The same trigger fills `profiles.timezone`, **so without this
  M1b.2's scheduler rolls everyone over at UTC midnight instead of their own.**
- **Existing accounts and passwords** (D3). Supabase stores bcrypt; Better Auth uses
  scrypt and will not verify bcrypt without a custom verifier. Decide: import the
  hashes with a verifier, or force a reset for every account — **the second needs B3
  working and warmed first.** Ask how many real accounts exist; `beta_invites`,
  `beta_testers` and `waitlist_emails` all exist, so it is a question.
- Acceptance: sign-up, sign-in, sign-out, reset, **a token accepted from a
  non-browser client** (this is what proves a phone app can log in), **and a new
  account that lands on a working dashboard** — which is the only form that catches
  the missing profile row. The old acceptance passed with a brand-new account and
  could not see it.

## M1b — The always-on parts (after M3)

**Depends on:** M2, M3. Moved here because each of these named a test that needed a
schema and real users.

- **M1b.2 Scheduler.** No scheduling tool exists in this project. `resetGoalsForPeriods`
  runs lazily when somebody loads a page, which is the whole reason the rollover bug
  class exists. Also owns `prune_error_reports()`. Acceptance: two users in different
  timezones each roll over once, at their own midnight, with nobody loading a page —
  **using users whose timezone arrived at sign-up** (M3), not typed into Settings.
- **M1b.3 Email** (B3). Acceptance: a reset link that works, plus one real send to
  your own inbox, because "the API returned 200" is not "the mail arrived".
- **M1b.4 Backups. The milestone two prior data losses argue for.** Point-in-time
  recovery — under D1 this is pgBackRest or WAL-G shipping WAL off the box, not a
  toggle in a dashboard. **Its destination is the object-storage bucket in N40, on a
  different machine: a backup on the same box is a copy, not a backup.** And
  **restoring is now a procedure you own**, so it is written down beside the timetrack
  runbook rather than living in whoever set it up — and **a restore performed
  into staging with real data in it** — a restore of an empty database is the "setting, not a
  fact" this plan warns about. Also: `timetrackBackupRepo` uses the service-role key
  that bypasses every wall, and nothing schedules it. **The docstring that falsely
  claimed a round-trip test exists is already fixed** (`7af55e3c`, by the session
  that owns the slice) — it now states what is covered: `assertRestorable` only,
  with `exportTimetrack`/`restoreTimetrack` called by nothing but the two scripts,
  and the round trip proved by hand once per `docs/runbooks/timetrack.md`, which is
  on disk. So the substance left for this milestone is the service-role key, the
  missing schedule, and the absent automated round trip — not the comment.
- **M1b.5 The pipeline's ingest tail** (D5). Only stages 09/10/11 move.
  **Security: the tempting fix is to open the database to the internet so the old
  scripts work. That undoes the only reason for the move.** Acceptance:
  `11.EXT.retrieval-smoke.ts` green — which needs M2's `match_embeddings`, which is
  why this is no longer in M1.

## M4 — Prove the filtering, then Q-POLICIES

**Depends on:** M2, M3, Q-POLICIES answered. **The gate. Nothing after this runs if
the test cannot pass.**

- **The test runs on a throwaway copy with the rules already removed.** With them
  live the harness does `SET ROLE authenticated` and every denial passes because
  Postgres refused — and that green light is what would authorise removing Postgres's
  refusal.
- **Two generated forms, not one.** (a) id substitution for N22's 26 path-param
  endpoints. (b) For N23 — the highest-risk
  class, where one forgotten filter returns everyone's rows — seed user B with
  recognisably marked rows, call as A, fail if any marker appears in A's response.
  Form (a) alone reports green on all of N23 because there is nothing to substitute.
- **State how the generator tells "our code filtered" from "the request was
  malformed".** A generated request that 400s proves nothing.
- **Enumerate the permission model, not just the policies**, from
  `information_schema.table_privileges` and `column_privileges`, before deleting
  anything. Carry each survivor into code — specifically **a column allow-list in
  `updateProfile`, with a test that a payload containing `has_purchased` is
  refused.** `src/db/types.ts` still types it on `ProfileUpdate` and
  `profilesRepo.ts` updates whatever it is handed.
- **A self-escalation case**, because raising your own paid flag on your own row is
  not a cross-user action and form (a) and (b) both miss it.
- **The 11 Postgres functions** (N15): decide each one's fate. `save_life_plan` takes
  ownership from the caller's payload; `claim_beta_slot` calls `auth.uid()` inside its
  body and breaks outright. **Triggers too** — one exists purely so nobody can attach
  their own workout to someone else's program, and it is not a policy.
- Acceptance: the above, plus **a stated enumeration**: how many of N21's 116 were
  exercised, how many were skipped, and why each skip is safe.

## M5 — Drizzle, and Vercel off

**Depends on:** M0.4 (the only reason this is not a leap of faith), M4, B5.
- N1. What holds the shape is each repo's exported functions
  plus M0.4's tests — **M0 establishes no other interface.**
- **Connection pooling**: today ~280 call sites each get a free HTTP client; under
  Drizzle each becomes a socket against a default ceiling of 100 shared with the
  scheduler and staging. One module-level pool with an explicit limit.
- The port itself is mechanical: 7 embedded selects, 3 `!inner`, 8 `.or()`, 16
  `.upsert()`, no full-text search. The real change is that Supabase returns errors
  as values and Drizzle throws — but `databaseRefusal` needs only `{ code, message }`,
  which `pg` provides, so the deliberate-refusal protocol survives.
- **Before traffic moves: a second dump inside a bounded read-only window**, of every
  table with rows newer than B1's, so the months of your own use in between are not
  lost.
- **Rollback, stated as data and not DNS:** switching back does not retrieve rows
  written on the new platform — it hides them and the two databases diverge. Write the
  reverse path down and rehearse the data half on staging.
- **Your daily use:** this is the phase that breaks it without M0.6. Say so here
  rather than leaving "*you see: nothing*".

## M6 — The last 23 server-drawn screens
**Depends on:** M5. N24's server-drawn screens become browser-drawn against N21's endpoints.
- Acceptance: each converted route keeps its e2e spec green — **except 4 of the 23
  have no spec at all** (`/qa`, `/preferences/archetypes`, `/test/scenario-lab`,
  `/test/goal-review`). Write them or accept a browser check, and say which. Note the
  two under `app/test/` cannot have a passing CI spec without changing the production
  gate (N28).

## M7 — The real app
**Depends on:** M6, B4, B6, B-PATHS.
- Capacitor per D8 — the indirection is already built in M0.5.
- **What actually has to change is when a notification fires.** Today the pomodoro
  end is a clock comparison inside a running timer, so with the app closed nothing
  fires until you reopen it. It must be handed to the phone's OS in advance, and that
  code is in `src/timetrack/` — hence B-PATHS.
- **The good news, measured:** the timer derives elapsed time from the wall clock
  rather than counting up, so a suspended app stops repainting, not counting. The hard
  half is already right.
- **Verify before building:** service workers may not run under Capacitor's scheme on
  iOS. If so, M1.7's build-id fix protects an offline shell the app does not have, and
  M7's offline story needs a different mechanism.
- Acceptance: B6 — you, holding your phone, with it closed.

## M8 — The legal minimum
**Depends on:** M5. Before the first user who is not you.
- Account deletion, data export, privacy policy, terms, cookie notice. None exists;
  `deleteUserValues` deletes one slice's rows, not an account.
- Acceptance: deleting an account leaves no row of theirs in **every table in B1's
  dump** — not a count derived from the migration folder, which omits N9
  including field reports, approaches, sessions, reviews and purchases. **An account
  deletion that iterated the migration list would have been proved complete while
  leaving the most personal data behind.**

---

# REVISION LOG

History only. **A change is never recorded here instead of being made above.**

- **2026-09-26** — written (`f9e70898`), 9 milestones, 4–7 weeks.
- **R2** (`cd7a0bfb`) — 7 findings. M5 had no safety net; M4's static test could not
  pass; M2/M3 ordering; no scheduler; M7 vs convention 4; email, backups, pipeline
  route and rate limiting absent.
- **R3** (`c21d0cf0`) — an independent agent. M4's gate could not close; "12 of 26
  repos tested" was wrong; no `profiles` row after M3; passwords; rollback; Ollama;
  secrets and monitoring.
- **R4** (`93a814c9`, `acf4d251`) — 12 findings. The migration folder cannot build the
  database; policies are ~140; the permission model; triggers; nothing had ever built
  the app but Vercel **(wrong — corrected in M1.1)**; the build id; M4's parameterless
  endpoints; Q5's counts; the seam's shape; B4's position; roles.
- **R5** — 20 findings, and the reason for this rewrite: **R4 and R5 had been written
  as banners and never reached the milestones — 13 announced changes, 24
  contradictions, two of them executable damage.** Plus: M1 could not finish; the
  corpus build needs a GPU and a hand-authenticated CLI; 3 product features run that
  CLI on a personal subscription; the real cost; the id type; the embedding model; the
  forward data gap; Capacitor's 189 call sites; `beta`; and your own daily use.
- **2026-09-27** — **the provider was settled as Hetzner**, on the owner's
  programmer friend's recommendation, replacing the managed-platform default of
  Railway. Folded into D1 and the milestones that it changes (M1.1, M1.7, M1.8, M2,
  M1b.4, B2, B7, Q-BETA); N36–N38 marked unpriced. Not a review finding — the owner's
  call, and closed.
- **2026-09-27** — rewritten as one document. Every number in THE NUMBERS, every
  decision in DECISIONS, every job with one owner, every milestone declaring its
  dependencies. The five banners were mined for measurements, then deleted.
