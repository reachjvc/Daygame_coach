# Off Vercel and Supabase, onto your own platform, aimed at a real app

**Rewritten 2026-09-27**, replacing four stacked revision banners that had stopped
agreeing with the milestones beneath them. (Round 5's own 20 findings never reached a
committed banner — they went from the reviewers straight into this rewrite, so they
cannot be audited from git. An audit corrected the "five" claim.) Serves vision items 36, 37, 46, 47.

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

# WHAT THIS JOB ACTUALLY IS — five facts

**Read only this if you read nothing else.** Six review rounds produced about 66
findings. They are not 66 problems. They are **five facts, most of them counted many
times over**, and the owner spotted that before I did: *"you kept checking details, but
you should check the overall big thinking."* He was right. Six rounds asked "is each
sentence in this plan true" and none asked "what are the few things that decide this
job". This section is that question, answered.

### Fact 1 — The live database is the truth. The folder is not.
Parts of your database were built by clicking in Supabase's website, not by writing
instructions down. So the folder is an incomplete recipe, and **anything that says
"port the migrations" produces a broken app.** N9 is the measurement: 19 tables the code
uses appear in no instruction file, `supabase db reset` already fails on the second one,
and N15's `match_embeddings` exists nowhere here.
**Nine separate findings were this one fact:** the 19 tables, the missing function, the
52-table mirror, the wrong "63 live tables", the undercounted user links, M8's deletion
list, "port 56 migrations", the grants to Supabase-only roles, and the policies a grep
cannot see.
**The whole fix is two sentences:** export the live database and make *that* the recipe
(B1), and then add a test that fails whenever the database holds something the files do
not — so it can never drift again. That second sentence is the part that matters, and it
came out of the owner's question.

### Fact 2 — Some of your security is done by the database, not by your code.
**This is the one that could hurt somebody, and it is NOT Fact 1 in disguise** — it
survives a perfect export. Seven of your database functions are written to let the
database do the filtering, so `save_life_plan` looks a plan up by id with no owner check
at all. A separate rule stops a user granting themselves premium by editing their own
row, and no amount of exporting changes that your code does not replicate it. One small
program attached to a table exists purely so nobody can attach their own workout to
someone else's programme.
**Consequence:** remove the database's protections before your code does that work and
one user can read and overwrite another's data. That is why M4 exists, and why it must
prove itself on a throwaway copy with the protections already off — run with them on, the
test passes because the database refused, which is the green light for removing the
refusal.

### Fact 3 — Nothing tests the code that talks to your database, and that is the biggest rewrite.
N18: **0 of 26.** The step that rewrites 11,272 lines had, on paper, 6,000 tests
watching it and in reality none. M0.4 builds that net first, and it is the largest piece
of preparation in the plan.

### Fact 4 — Parts of your app run on your own machine and cannot be hosted anywhere.
Eight pipeline stages and three live features run a program inside your VS Code folder
on your personal subscription; two features call a model server at `localhost`; the
corpus build needs a graphics card; its inputs are 107 GB on your laptop. **No host
fixes this — it is a code change (D4) plus a deliberate decision to leave the corpus
build where it is (D5).**

### Fact 5 — Vercel and Supabase were doing invisible work that is now yours.
Only true since the provider became Hetzner: the build, TLS certificates, what restarts
the app, backups, monitoring, the firewall, and somewhere for secrets to live. M1.1 and
M1.7 own it.

---

**So: is the plan wrong?** No — it handles all five. **But it is 938 lines, and those
five facts were nowhere in it**, which for the person who has to decide is the same
thing as wrong. That is the real finding of round 6, and it came from the owner rather
than from any reviewer.

**And the order falls out of the five by itself:** Fact 1 is a blocker on him (B1), and
it is cheap, read-only and reversible; Fact 3 is the longest job and can start the day
Fact 1 lands; Fact 2 decides one irreversible step (M4); Facts 4 and 5 are ordinary work
once the platform exists.

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

**≈ €20–30 a month for the server (N41). ≈ €40–90 on top if the AI models are hosted
(N42).** The AI choice is the largest single line, so Q-AI-HOST matters more to the
bill than everything else combined. **Do not read N36–N38: they priced a managed
platform and D1 superseded them.** The original plan said $5–20, wrong by enough to
matter. **The saving against a managed platform is paid for in operations work, not
conjured** — that work is M1.1 and M1.7.

**The number that justified leaving no longer exists.** The 2026-09-17 decision rested on
an asymmetry: leaving unnecessarily costs about three weeks, bounded, while staying wrongly
compounds. **That three weeks is now 8–14+ weeks of sessions and has grown at every
revision.** The decision is settled and not re-argued — but the arithmetic that made it
easy has changed by four or five times, and you should hear that from me rather than
discover it in month three. It is also the strongest argument for Q-ORDER and Q-SKELETON:
both shrink what has to go right at once.

**Time: unknown, and I will not give you a single number again.** It was 4–7 weeks,
then 6–10, then 8–14, and each was produced by a review that then found more work.
What I can say honestly: **M0 alone is the largest piece of preparation ever
attempted in this project**, and it is gated on you (B1). The milestones below each
carry their own size so you can see where it goes.

## The five rules this plan follows

Approve these. Each says what it costs if it is wrong.

1. **The backend becomes a data service with token login.** *(The words "from day one" were
   removed 2026-09-28: day one on the new platform is now M1.0, the website rehosted on
   cookie auth, so "from day one" stopped being literally true when M1.0 was added. The
   substance survives — login is still built once, at M3 — so the stated cost never
   materialises, but you were being asked to approve words that described M3.)* Not the
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
| N44 · **Build-time** variables, inlined into the bundle by `next build` | **4** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BUILD_ID`, `NEXT_PUBLIC_APP_URL`. **A runtime boot check can never catch these**, and one build cannot serve two environments |
| N45 · RAM and disk floor per box | **unset — B2 orders hardware against a price (N39) with no floor stated.** Derive it from Postgres + data + WAL + kept images + logs before ordering |

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
| D1 | **Leave Vercel and Supabase for Hetzner** — a server you run, with Postgres on a private network and the app's own auth. Auth and migration defaults unchanged: Better Auth, Drizzle. | Leaving decided 2026-09-17. **Provider settled 2026-09-27 because your friend recommended it; that reason stands on its own and is re-litigated by nobody.** **Confirmed by the owner in person 2026-09-27, not relayed — an earlier note recorded it from a peer session, and this is the owner's own word.** Still his to call and not blocking (B7): the deploy layer — GitHub Actions over SSH, or Coolify / Dokku on the box — Postgres on the app box or its own, one server or two. Defaults if he does not say: Actions + Compose over SSH, Postgres on the same box with its data on a separate volume, two small servers so staging and production keep the same shape. |
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

# OPEN QUESTIONS

**SPLIT 2026-09-28, and this is a fault in how I have been working.** Twelve questions had
accumulated and I audited who can actually answer them. **Six were engineering choices I had
offloaded onto someone who has said he is not a programmer** — Q-HARNESS asks you to choose
between building a PostgREST-compatible surface, porting 26 files behind a dual seam, or
accepting a safety net covering 0.8% of the riskiest phase. **That is not your decision; it is
mine, and putting it to you was me making you do my job.**

## Tier 1 — genuinely yours. Seven, and each turns on your money, your time, your risk appetite or your permission.

| | Question | Why it is yours | My recommendation |
|---|---|---|---|
| 1 | **Q-DOWNTIME** | Can the app be off for an evening? Only you know. Deletes five pieces of work. | Answer it; I cannot |
| 2 | **Q-CUSTOMER** | What the next months are *for*. | Leave the order, write the trade down |
| 3 | **Q-RULE5** | Whether your daily working setup moves to the box. | Yes |
| 4 | **Q-CORPUS** | Permission to write a migration. | Yes, and it is one line |
| 5 | **Q-AI-HOST** | Money: it is the largest line in the bill. | Ollama for embeddings, paid API for chat |
| 6 | **Q-BETA** | It deletes a branch. Your repo, your call. | Retire it |
| 7 | **Q-POLICIES** | Risk appetite, with a real cost either way. | Keep them, rewritten |

## Tier 2 — mine. Decided, so you do not have to. Overrule any of them if you disagree.

I should have arrived at these rather than asked. Each is recorded with what it costs if I am
wrong, so you can overrule without needing the engineering.

| | Decision | If I am wrong |
|---|---|---|
| **Q-HARNESS** | **Build the PostgREST-compatible surface over `pg`.** Option (c) leaves M5's net at 91 of 11,272 lines; option (b) turns M0 into the rewrite. | Weeks spent on a layer that is deleted at M5 |
| **Q-AUTHWINDOW** | **M3 mints a Supabase-shaped token until M5.** Keeps every milestone's daily-use answer yes and leaves the order alone. | A throwaway token path, deleted at M5 |
| **Q-ORDER** | **Closed: no.** Not a preference — the plan's own physics closes it, since M4 must precede the port and M4 needs M2, which needs the move. | We forgo a checkpoint that was never reachable |
| **Q-SEAM** | **Ambient provider**, not a threaded parameter: ~26 files instead of 275, and it is what makes Q-HARNESS work. | A seam that has to be widened later |
| **Q-SKELETON** | **Yes — test the one belief M1.0 cannot cover**, that a non-browser client accepts a Better Auth token. An afternoon. | An afternoon spent early instead of a surprise at M3 |

**The general rule this should have followed from the start:** bring the owner decisions that
turn on what he wants, what he will pay, what he will risk, or what he permits. **Everything
that turns on how the code works is mine, and handing it over is not consultation — it is
making the person least equipped to answer do the work.**

---

# The questions in full — these need you

Each has a recommendation, so "go with your recommendations" is a complete answer.
**A milestone that depends on an unanswered question says so and does not start.**

**ANSWER THEM IN THIS ORDER — round 9 found the set did not work.** The five added in rounds
7–8 had no *Gates* line and were cited by no milestone, so starting work answered them "no"
by default and nothing said so. And two depend on each other.

**CORRECTED 2026-09-28: items 2 and 3 are not yours to answer yet, and the list did not say
so.** B-PATHS gates Q-POLICIES, and **B-PATHS is a renegotiation with the peer sessions that
own `src/timetrack/**` and `src/vice/**`** — not a question you can answer alone. So the real
chain is **B-PATHS → Q-POLICIES → Q-ORDER**, and the first three items below were gated on a
multi-session negotiation the list never named.

0. **B-PATHS** — settle convention 4 with the other sessions. Not a question; a negotiation.
   **Everything numbered 2 and 3 waits on it.**
1. **Q-DOWNTIME** — one sentence from you, and it decides whether five other things exist.
   Answerable now, independent of B-PATHS.
2. **Q-POLICIES** — after B-PATHS, because 76 of the rules live in the paths it covers. Then
   it decides whether the role-and-claim machinery Q-ORDER needs gets built at all.
3. **Q-ORDER** — the only question here **with no recommendation**, because mine was
   withdrawn when its premise proved false. **And as the plan stands it cannot be answered
   "yes":** its own corrected consequence is that M4 must run before the port, but M4 depends
   on M2 and M3, and M2 depends on the hosting move — so "port before the move" requires the
   move first. **Either M4 gets a stated pre-move form — and it can, because neither of its
   two generated test forms needs Better Auth; they need a throwaway Postgres from B1's dump
   and two hand-made accounts — or Q-ORDER is not genuinely open and should say so.**
   Until one of those is written, treat it as closed: no.
4. **Q-RULE5, Q-CUSTOMER, Q-SEAM, Q-AI-HOST, Q-BETA, Q-CORPUS** — independent, any order.
5. **Q-SKELETON is PARTLY ANSWERED by the document already**, which is a defect: M1.0
   absorbed two of its four beliefs and M0.4 step 2 covers a third. **The fourth is not
   covered anywhere before M3 — "Better Auth issues a token a non-browser client accepts",
   which is the belief rule 1 and D2 both rest on.** So the live question is narrower than
   its entry reads: *should that one belief be tested early?* **Recommendation: yes, and it
   is an afternoon.**

**"Go with your recommendations" is therefore no longer a complete answer** — it was, and
rounds 7–8 broke it by adding questions without gates. Q-ORDER needs you.

### Q-HARNESS — How do the database tests reach a database before the port? **NEW 2026-09-28. This is the question my last two fixes were patching around.**
*Gates: M0.4's acceptance, and therefore M0's exit and M5's entry.*

Three options, priced. **None is free and the plan must not pretend otherwise.**
- **(a) Build a PostgREST-compatible surface over `pg`** so unported repos can run against the
  container. Makes "26 of 26" genuinely reachable without porting anything. **Cost:** 7
  embedded selects, 3 `!inner`, 8 `.or()`, 16 `.upsert()`, errors-as-values, and error *text*
  fidelity — `valuesRepo.ts` branches on the string "column values.display_name does not
  exist". A large throwaway, deleted at M5.
- **(b) Port all 26 in M0.4 behind a seam that carries both implementations.** Then M0 *is* the
  rewrite, and the plan's shape changes.
- **(c) Accept 1 of 26 and reword both gates**, in which case **M5's safety net is 91 lines out
  of 11,272** — and M5 is the phase this whole plan calls its riskiest.

**Recommendation: (a), and note it also resolves Q-SEAM's contradiction** — Q-SEAM says the
seam's default is "today's client" while step 4 said the seam's test implementation is
Drizzle-over-`pg`; those are two different seams, and only Q-SEAM's makes 26 of 26 reachable
without porting. **Cost if wrong:** weeks on a compatibility layer that gets thrown away.
**Cost of (c):** the net under the riskiest phase covers 0.8% of it.

### Q-AUTHWINDOW — How do queries stay authorised between M3 and M5? **NEW 2026-09-28. Eleven rounds missed this and it is not a wording problem.**
*Gates: M3, and therefore M1b, M4 and M5 — the longest stretch in the plan.*

**Measured:** 21 of 26 repos build their client from the **anon key plus the user's Supabase
session cookie**, and the policies are `using (auth.uid() = user_id)` with no role clause.
The app keeps reading Supabase until M5 — M1.0 says so, and M5's "second dump of every table
with rows newer than B1's" confirms it.

**So the moment M3 replaces `authCookies.ts` and issues its own tokens, `auth.uid()` is NULL
on every request.** Every user-owned table returns zero rows; every insert is refused. For
the whole M1b + M4 + M5 span. Three things follow, and the third is the one that would have
hurt:
1. M3's own acceptance — "a new account that lands on a working dashboard" — cannot pass.
2. **M4's gate goes green on nothing.** Its form (b) seeds user B and fails if any of B's
   markers appear in A's response. With the rules denying everything, no marker appears. That
   is the *"green denial test that proves nothing"* M4 exists to prevent, arriving through a
   door no round had checked.
3. **Rule 5 dies for months** — and the plan could not see it, because the "your daily use"
   line the fixed shape requires is present on only four milestones. M3 is exactly where it
   would have fired.

**Two resolutions. Pick one; there is no third.**
- **(a) M3 mints a Supabase-shaped token until M5**, keeping the existing path alive. Possible
  precisely because D3 preserves Supabase's uuid. **Verify the project still exposes a
  symmetric JWT secret before relying on it.**
- **(b) M3 moves after the data-layer port**, which is Q-ORDER territory and reopens M4's
  position.

**Recommendation: (a).** It keeps every milestone's daily-use answer "yes" and leaves the
order alone. **Cost if wrong:** a throwaway token-minting path that lives until M5 and is then
deleted. **Cost of not deciding:** the app is dead for its longest phase and the security gate
passes while proving nothing.

### Q-DOWNTIME — Can the app be off for an evening, and can you go one day without using it? **NEW 2026-09-28. The cheapest question in this document.**
*Gates: M1b.2, M1b.5, M2's live row-count acceptance, M3's password branch, and M5's second dump and rehearsed rollback — five places that must be hand-applied because none of them names this question.*

**This plan is priced for a live service. There is one user and he owns it.** Work that
exists only because nobody asked: a second dump taken inside a bounded read-only window
before traffic moves; row counts compared against live Supabase at the moment of cutover
rather than against the dump (stale only because the plan takes months); the whole
bcrypt-verifier-versus-force-a-reset branch for existing accounts, when the honest account
count is probably one; a rehearsed data rollback.

**STRUCK from this list 2026-09-28: "two servers from day one."** It was on it, and it should
not have been. That is **rule 3**, which you are asked to approve — *"staging and production
exist from the first day; if wrong, you learn whether a migration works by running it on
your own data"* — and **four acceptances name staging**: M1.1's reboot test and "both boxes
from a fresh image", M2's "does not load production data until that dump has been restored
into staging once", M1b.4's restore with real data in it, and M1.8's staging lane. **M2's
staging restore is the only place B1's dump is proven to rebuild on real Hetzner hardware
before production data moves** — i.e. the mitigation for Fact 1, this plan's own first fact.
At N39's prices it is also the cheapest item on the list. A one-word "yes" to this question
would otherwise have taken rule 3 and four acceptances with it.

**This is also the mechanical explanation for three weeks becoming 8–14:** each review
round added another continuity guarantee, and every one was priced as though there were
customers. `docs/known-failures.md`'s very first check is *"Did I price advice for a
product that has users?"* — and six rounds, mine included, failed it.

**Recommendation: answer it, then delete what the answer makes unnecessary.** If the answer
is no, nothing changes — but the machinery is then justified by your word instead of an
assumption nobody wrote down. **Cost:** one sentence from you.

**And two milestones become optional, with stated consequences:**
- **M1b.2, the scheduler — droppable.** Goal rollover keeps happening lazily when a page
  loads, which is exactly today's behaviour and today's known bug. Not a hosting job.
- **M1b.5, the pipeline's ingest tail — droppable.** Ingest keeps running from your laptop
  over the same connection, already true of the eight stages D5 leaves there.
Both are product jobs that got pulled into a migration.

### Q-ORDER — Should the database-layer rewrite happen on Supabase's own Postgres, BEFORE the hosting move? **NEW 2026-09-28, and the largest open question in this plan.**

**Supabase is just Postgres.** It hands out a direct connection string, `pg` is already a
dependency here, and `tests/integration/setup.ts` already talks to Postgres directly
rather than through Supabase's client. So there is an intermediate state nobody proposed
across six review rounds: **port the 26 repo files to Drizzle against Supabase's own
Postgres, over a direct connection, while row-level security is still on and managed
backups still exist.**

**CORRECTED 2026-09-28, and the correction kills the argument this section led with.** I
wrote that the port would run "with row-level security still behind it as a second wall".
**That is false, and this repo documents why in the harness that does the same thing.**
`tests/integration/setup.ts:161-166`: *"The account that owns the tables is exempt from the
row rules — Postgres lets an owner see everything on its own tables — so a test that asks
'is someone else refused?' while connected as the owner passes without the rules ever being
consulted."* Supabase's direct connection authenticates as `postgres`, which owns every
table, so a Drizzle port over a socket gets **zero** policy enforcement. And the other
branch is worse, not better: every policy is written against `auth.uid()`, which in live
Supabase reads a claim set per HTTP request. A socket carries no claim, so stepping down to
`authenticated` makes `auth.uid()` NULL and every policy denies everything — which is
exactly why `schema.sql` has to **stub** `auth.uid()` and hand-build a non-owner role.

**So the intermediate state I recommended is LESS protected than today, not more.** Today's
anon-key path always enforces the rules; the ported path never would. Getting the wall back
means new machinery — `FORCE ROW LEVEL SECURITY`, a non-owner role, and setting the role
and claim on every transaction of a pooled connection — and the harness warns that the
failure mode is *a green denial test that proves nothing*, which is the trap M4 exists to
avoid.

**Two consequences if this is answered yes anyway:**
- **M4's gate must run BEFORE the port, not after.** The port *is* the step that removes the
  database's protection, silently and with no gate. That inverts the order stated below.
- **Q-POLICIES stops gating M4 and starts gating the port**, because "keep them, rewritten"
  is what decides whether the per-transaction claim machinery gets built at all.

**What survives of the original argument** — three of the four benefits:
- It runs with **managed point-in-time backups still in place**, before M1b.4 has to build
  them by hand.
- The hosting move then shrinks to something boring: *the same code, a different
  connection string*, plus the operations work in M1.1 and M1.7.
- A real checkpoint arrives in weeks, not months — "the app runs on Drizzle" is verifiable
  long before "the app runs on Hetzner".

*Gates: M5's port order, and it is gated BY Q-POLICIES.*

**Recommendation: WITHDRAWN pending your answer to Q-POLICIES.** I recommended this
reorder on a premise that turned out false. It may still be right for its other three
reasons, but it is no longer a recommendation I will make for you — the version that works
requires building the role-and-claim machinery first, and that is Q-POLICIES' decision, not
a sequencing preference. **Cost if wrong:** Supabase's direct-connection limits are
lower than its pooler's, so the port may have to use the pooler — real but small. **Cost
of the current order if it is wrong:** a data-access bug and an unfamiliar server in the
same week, with no second wall and no managed backup.

### Q-CUSTOMER — Should anything here come before "somebody can pay you"? **NEW 2026-09-28.**
*Gates: nothing mechanically — it is an ordering question, so starting M1 answers it "no". Said plainly because that is how it would otherwise be decided by default.*

As ordered, **this plan delivers an installed phone app before it delivers a customer.**
Paying grants nobody anything today — no Stripe webhook, `has_purchased` never written —
and that sits in the out-of-scope row. The legal minimum is M8, last. M6 and M7 build the
app first.

That may be right: no users, so nothing to lose. But it is a choice about what the next
months are *for*, and it was never put to you. **Recommendation: leave the order, write the
trade down** — vision item 7 calls Scenarios the real product and item 31 calls the corpus
the core value driver, and this plan touches neither. **Cost if wrong:** months of
infrastructure and still no way to take money, on a product whose own vision says the
value is elsewhere.

### Q-SKELETON — Should one screen go end-to-end first? **NEW 2026-09-28.**
*Gates: M1's first deliverable — and it had no Gates line until round 10 caught that the fix
landed on three of the five questions that needed one, not five. M1's dependency line still
reads "B2, Q-BETA", so this question's answer changes what M1 does first and M1 does not
know it exists.*

Nothing proves the approach works until months in. **One screen, one endpoint, own token
login, own Postgres, on Hetzner, end to end** would test every load-bearing belief in days:
that Better Auth issues a token a non-browser client accepts, that this schema restores
into a fresh Postgres at all, that the build deploys, that the proxy and certificate work.
**Recommendation: yes, first thing in M1**, before M1.7 and M1.8 are built out. **Cost:** a
few days in no current milestone. **Cost of skipping:** every assumption is validated at
once, at month three, when unpicking them is expensive.

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

### B1 — A schema-only dump AND a data dump of live Supabase. **Needs you. Gates M0.4, M0.6, M2, M8's acceptance — and therefore M1.0, M1.7 and everything after.** It is the first thing.
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

### B3 — An email provider and a domain you control. **Needs you. The domain half gates M1.0 and M3; the email half gates M1b.3 and M3's forced-reset branch.**
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

### B-PATHS — Convention 4 must be renegotiated before M0.4. **Gates M0.4, M1b.4,
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
| **The drift guard — a test that fails when the live database holds what the files do not** | **M0.4 step 2c — BUT SEE BELOW: as specified it cannot do this.** Re-pointing `schemaMirror.test.ts` leaves a unit test comparing two files on disk. It fails when someone edits the mirror; **it can never fail because the live database changed**, which is literally what Fact 1 asked for. Either B1 becomes **repeatable, with stated re-take points before M2's staging restore and before M5's cutover**, or a check reads the live schema directly. **Security: the second option puts a live Supabase credential in GitHub Actions beside the deploy key — read-only role, and unreachable from any fork-triggerable event.** Four acceptances currently treat a day-one snapshot as current months later (M0.4, M2's schema half, M8, M5's second dump) while M2's *data* half two lines earlier explicitly refuses a stale dump — the plan caught the staleness for rows and missed it for schema, inside one acceptance. |
| **Re-pointing `schemaMirror.test.ts` at the dump, dump wins on conflict** | **M0.4 step 2c** |
| The data seam (Q-SEAM) | **M0.4**, its first deliverable |
| Completing the test mirror to the live schema | **M0.4** |
| The API base-URL indirection (D8) | **M0.5** |
| **The box itself — provisioning, supervision, the build artifact** | **M1.1** |
| The app builds and boots on the platform | **M1.1** |
| Postgres major version and its configuration | **M2** |
| Secrets, healthcheck, monitoring | **M1.7** |
| Scheduler | **M1b.2** |
| Email | **M1b.3** |
| Backups with a restore actually performed | **M1b.4** |
| Pipeline ingest tail route (D5) | **M1b.5** |
| AI hosting decision executed (D4, Q-AI-HOST) | **M1.6** |
| Rate-limit counter moved to a shared store **and applied to login, reset and AI** | **M1.6** |
| pgvector, the `embeddings` table, `match_embeddings` | **M2** |
| Supabase roles / the 19 GRANTs (N14) | **M2** |
| Users table, id type (D3), password migration | **M3** |
| `profiles` row creation and timezone capture at sign-up | **M3** |
| The permission model, incl. the `has_purchased` column allow-list | **M4** |
| The 11 Postgres functions (N15) | **M4** decides their fate, **M5** ports the callers |
| Connection pooling | **M5** |
| Account deletion and export | **M8** |
| **A database and accounts for the browser suite, after M3 and M5** | **UNOWNED — and it is load-bearing three times.** See below |
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

### M0.1 — One function answers "who is logged in". **DONE**
**Depends on:** nothing. Done on the current stack. (`3a54e532`, `54749fce`)
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
**Depends on:** nothing.
18 call sites in 8 files. Round 4 checked every one for the `save_life_plan` pattern
— relying on a database rule instead of filtering — and **found none**. The five
`profiles` reads and both in `ScenariosPage` all filter by the signed-in user; the
four unfiltered reads in `apiAiRepo` sit behind an admin-key gate that fails closed.
- Acceptance: extend `tests/unit/architecture.test.ts` to the `.from("…")` query
  builder. The existing boundary checks `@supabase` **imports**, which is why it
  never caught these — they get their client from `src/db/`.

### M0.3 — Scripts stop reaching the database directly
**Depends on:** nothing.
**N33, and all twelve named** — an earlier draft described four of them only as "the
four the old plan named", pointing at a document that no longer exists, and enumerated
ten while asserting twelve. Measured
`grep -rl 'src/db/\|@supabase' scripts/ --include=*.ts`:
`backup-timetrack.ts`, `restore-timetrack.ts`, `dev/seed-training-year.ts`,
`generate-goal-constraints.ts`, `list-errors.ts`, `repair-counters.ts`,
`seed_values.ts`, `tracking/audit-achievements.ts`,
`training-data/00.EXT.reset-embeddings.ts`, `training-data/10.EXT.ingest.ts`,
`training-data/10.EXT.ingest-test.ts`, `training-data/11.EXT.retrieval-smoke.ts`.
**The first two matter most: they are the timetrack slice's own disaster recovery**,
and they reach the database through `timetrackBackupRepo` rather than importing
Supabase, which is why an import-only check misses them.
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
2. **The migration rehearsal — not "a test fixture".** `tests/integration/schema.sql` is
   **2,640 lines and 52 tables, and it already does the thing M2 calls its hardest work**:
   measured today, **25 references to `profiles` and zero to `auth.users`**, plus
   `auth.uid()` stubbed, policies included, green on a plain Postgres container in CI.
   The plan treated this as N10, a fixture for M0.4 to "complete", while handing M2 the
   schema separately. **They are the same artifact.** Finishing it from B1's dump is
   simultaneously M0.4's fixture, M2's schema deliverable, and the answer to the question
   everything else stands on — *can this database be rebuilt on a plain Postgres at all?*
   **Give it M2's acceptance and the plan's largest unknown moves from month three to week
   two.** M2 then becomes a data load against a schema already proven.
2c. **(Runs AFTER 2b, and lands in the same commit as it.)** 2c re-points a guard at a
   mirror that 2b completes, and 2c itself predicts its rule 3 firing is close to certain. A
   knowingly-red unit test in this shared checkout blocks **every** session, because the Stop
   hook runs the whole suite — so these two are one commit, not two. **Re-point the drift guard, and give Fact 1's second half a mechanism.** Fact 1 says the
   part that matters is *a test that fails whenever the live database holds something the
   files do not*. **Round 9 found that sentence has no deliverable, no acceptance and no
   owner anywhere in this plan** — the only drift mechanism proposed recomputes the plan's own
   number rows, not the schema. It belongs here.
   And the repo's existing guard points the wrong way: `tests/unit/db/schemaMirror.test.ts`
   reads `supabase/migrations/` as the original and `tests/integration/schema.sql` as the
   copy, while this plan says the migration folder is **not** the source of truth. So
   re-sourcing the mirror from B1's dump will make its rule 3 fire **exactly where live
   Postgres and the folder have drifted** — which is Fact 1's premise, so it is close to
   certain. **Decide it once, here: the dump wins — EXCEPT the user links and the
   `auth.uid()` stub, which M2's acceptance requires to differ.** **CORRECTED 2026-09-28: a
   flat "the dump wins" contradicted step 2 and M2's acceptance on the same file, and would
   have broken the integration suite outright.** Measured: the mirror's only three
   `auth.users` occurrences are **comments explaining why it has none** — *"auth.users does
   not exist in the container, so user_id references profiles"* — and the `auth.uid()` stub
   reads `test.uid`. **There is no `auth` schema in a plain Postgres**, so a dump-sourced
   mirror would not merely drift, it would fail to load. And M2's acceptance states the
   opposite rule for the same artifact: *the user links must NOT match the dump*, with a test
   that fails if any `auth.users` reference survives. One file, two tests, mutually exclusive
   until this sentence. And note its rules 1 and 4 walk
   migration-declared tables, so the completed mirror would get no guard at all on N9's 19
   tables — the ones that motivated B1 in the first place.
2b. **Complete the test mirror** from N10 to the live schema, out of B1's
   dump. Without this M0.4 cannot seed a fixture for 8 of its own targets.
3. **Tests that execute repo functions**, written now against Supabase so they
   describe behaviour, not implementation. A test written after the rewrite only
   proves the rewrite agrees with itself.
4. **Slice vertically, not horizontally — the "whole graph" claim is true of one clump,
   not of this plan.** Measured: **18 of the 26 repo files import no other repo file.** The
   coupling is three small clumps (training/programs ~5,529 lines; goals/tracking ~3,831;
   `profilesRepo`→`betaRepo` 224) plus **14 standalone files**, the smallest being
   `valuesRepo.ts` at 91 lines. So "test all 26, then port all 26" puts the first evidence
   that the approach works at the end of a multi-week phase — which is why this plan cannot
   estimate at all. **Build the seam once (Q-SEAM, genuinely shared), then run
   test → **port into the container only** → prove, on ONE standalone file first.**
   **CORRECTED AGAIN 2026-09-28, because my previous correction broke this milestone.** I
   removed the word "port" and thereby removed the only mechanism by which this milestone's
   acceptance could ever be met. Measured: **zero of the 26 repos import `pg`; 21 of 26
   import the Supabase client**, which speaks HTTP to PostgREST and reads `next/headers`.
   There is no `supabase/config.toml`, so no local Supabase either. **A repo function cannot
   reach a Postgres container until it is ported.** N18's "0 of 26" is structural, not an
   oversight — and the three integration files this plan credited with importing repo code
   import only types and enums (`lifePlanTypes`, `lifePlanDayTypes`, `goalEnums`); not one
   calls a repo function.
   **CORRECTED A THIRD TIME 2026-09-28, and this time as a decision rather than a patch —
   because patching this has now failed twice.** "Port into the container only" is not
   something this codebase permits: **a repo is one file, shared with production.**
   `valuesRepo.ts` is on the serving path (`app/api/goals/tree-of-life/route.ts`,
   `app/api/inner-game/infer-values/route.ts`, `app/api/inner-game/progress/route.ts`,
   `src/inner-game/innerGameService.ts`, `src/inner-game/modules/progress.ts`), so porting it
   breaks Inner Game and Tree of Life — against M0's own acceptance, "the app still works on
   Vercel". There is no `DATABASE_URL` and no drizzle anywhere yet. **The three readings all
   fail:** port the real file and production loses it; keep a forked copy and you have two
   implementations of one repo for months, which is the drift Fact 1 exists to kill;
   re-implement the queries in the test and you hit step 3's own trap.
   **So this is Q-HARNESS, below, and the acceptance must not be written until it is
   answered.** What follows is the reasoning that remains true and is not sufficient: Round 8's danger was a
   ported repo *serving live traffic* with no row rules behind it. **A repo ported and
   exercised only against a throwaway container strips nothing — there is no production
   row-security in a container built from `schema.sql`.** So: the seam's test implementation
   IS Drizzle-over-`pg` against the container, and **one standalone repo (`valuesRepo.ts`,
   91 lines) is ported inside M0.4 to prove the harness works.** That also restores the thing
   the previous correction threw away — a measured cost per line of an 11,272-line rewrite,
   in week two rather than after M4. **M5 still owns porting anything that serves traffic,
   and M4 still gates that.** **CORRECTED 2026-09-28:
   this bullet used to read "test → port → prove", which instructed the whole Drizzle port
   inside M0 — contradicting this milestone's own closing line ("this does not port
   anything") and, far worse, instructing it BEFORE M4. Round 8 established that a direct
   Postgres connection authenticates as the table owner and is therefore exempt from the row
   rules, so **each ported repo loses the database's protection the moment it is ported.**
   Read literally, the old wording stripped row-level security slice by slice, in
   production, months before the gate that exists to guard it. **M0.4 tests. M5 ports, and
   M4 runs first.** The per-file sequencing below is M5's, recorded here only because it is
   what makes the estimate knowable.** That yields a measured cost per line
   so the estimate stops being a guess, a checkpoint every few days, and somewhere to stop.
   Then the other 13 standalone files, then the clumps, largest last. **The whole-graph rule
   still applies within a clump:** `healthRepo` reaches the database through
   `settingsRepo`; `workoutRepo` through three other repos and two Postgres
   functions. Giving one a seam while its callees build their own client buys
   nothing.
- Acceptance: **UNWRITABLE until Q-HARNESS is answered.** It said "executes repo functions for
  26 of 26" while the deliverable ports one and the milestone's own mechanism paragraph says a
  repo cannot reach the container until it is ported. **An acceptance incompatible with its own
  deliverable is worse than a missing one**, and this is M0's exit gate and M5's entry
  condition. Whichever Q-HARNESS answer is taken writes this line.
  The mirror half stands: the mirror contains every table in B1's dump. **Plus the cheapest test in this plan,
  whose second half the rewrite dropped: every table the code queries AND every
  function it calls by name exists in the dump.** The function half is what catches
  N15's `match_embeddings` being absent. **Prerequisite for the test to be
  runnable at all:** B1 and step 2.
- **Five load-bearing beliefs nothing in this plan tests, and four are an afternoon each.**
  They are currently all scheduled to be discovered late, together: that Better Auth can be
  forced onto `uuid` ids (D3 literally says "verify" and nobody has); that it can verify
  Supabase's bcrypt hashes; that its tokens are accepted by a Capacitor client; that service
  workers run under Capacitor on iOS; and that `match_embeddings` can be extracted from
  Supabase at all (N15 — it exists nowhere here). **Test the first four before M1 ends.**
- **Not covered:** this ports **one** file, and only into a test container, to prove the
  harness. **It ports nothing that serves traffic — M5 owns that and M4 gates it.** The
  distinction is the whole of step 4's second correction.

### M0.5 — One API base URL (D8)
**Depends on:** nothing. Useful on either stack.
N25 routes through one `apiFetch()` helper, and the 3 auth redirects built from `window.location.origin` take a
configured address.
- Acceptance: an architecture test that fails on a new bare `fetch("/api/…")`.
- **Why now:** useful on either stack, and it is the difference between D8 being a
  wrapper and a rewrite.

### M0.6 — Your development connection (rule 5)
**Depends on:** B1 (the dump, if the local-Postgres route is taken). **Gates M1.6, M1.7 and M5** — each breaks your daily use without it.
A way for your `localhost:3000` to reach a database once the real one is private:
an SSH tunnel to the box — there is no platform CLI under D1 — or a local Postgres loaded from B1's dump.
- **This exists before M1 finishes**, because M1.6, M1.7 and M5 each break your daily
  use without it. M1.6 makes an environment variable mandatory on your laptop the
  moment it lands; M1.7's "refuse to boot when a variable is missing" applies to your
  machine too, and there are 21 of them; M5 rewrites N1 to talk to a
  database your laptop cannot reach.

**M0 acceptance:** N17 still passes, N19 reports "none new", `npm run test:integration`
covers 26 of 26, and the app still works on Vercel. Nothing about the platform has
changed.

## M1 — The platform exists

**Depends on:** B2, Q-BETA. **Split from the old M1**, because four of its
sub-milestones named tests that need M2 and M3 — so the old plan deadlocked at its
second milestone. The always-on parts are now **M1b, after M3**.

### M1.0 — Lift and shift: the same app, on your box, still talking to Supabase.
**Depends on:** B2, **B3's domain half** (the acceptance is "answers on your domain" and
rollback is a DNS change; B3 records that there is no custom domain in the repo, and TLS
needs one), **M1.1 and M1.7** — see the correction below — **and therefore B1,
transitively**: M1.7 depends on M0.6, and M0.6 depends on B1's dump. **So the "zero-code,
reverses in minutes" hosting half still cannot begin until you have exported your database.
That was not visible anywhere and it changes what you do first.** **No new *application* code.**

**CORRECTED 2026-09-28. This is not a milestone before M1.1; it is M1.1 and M1.7's
ACCEPTANCE.** I wrote "Depends on: B2. No new code. Week one" and also "M1.1 comes after
M1.0". That is a ring: M1.0's deliverable is the artifact M1.1 builds, so it cannot exist
until M1.1's provisioning artifact, build job, registry, supervision and build-variable
rule exist, and its own text says M1.7's hardening ships with it while M1.7 depends on
M1.1. **Read it as: M1.1 and M1.7 are the work, and "runs on your box against Supabase, on
your domain, and you used it for a day" is how they are judged.** "Week one" was then a
claim about CI build plus compose or systemd plus a proxy plus firewall plus sshd plus DNS,
in a repo with no Dockerfile, compose file or Caddyfile — judge it on that, not on "no new
code".

**Two prerequisites nothing had named, both outside this repo:**
- **Supabase's redirect allow-list.** Sign-up, sign-up-success and forgot-password build
  their redirect from `window.location.origin`, so a new origin must be added to Supabase's
  Site URL / redirect list or confirmation and password reset bounce — on the milestone
  whose acceptance is "you used it for a day".
- **`x-forwarded-proto` on the new proxy.** `src/db/authCookies.ts:46` says in as many words
  that **Vercel always sets it**; if the new proxy does not, session cookies are refreshed
  without `Secure`.

**Feasibility, traced and confirmed:** no `process.env.VERCEL` anywhere in `src/`, `app/` or
`proxy.ts`; `@supabase/ssr` needs only `cookies()`/`headers()`, which work under
`next start`; the four build-time values are ordinary build args; `build.sh`'s refusal is
satisfied because Actions sets `CI`. **The application can run on a Hetzner box against
Supabase with no code change.**

**"Leave Vercel" and "leave Supabase" are two projects and the plan had them welded
together, with the easy one last.** M5 was titled "Drizzle, and Vercel off" — leaving
Vercel bolted onto the largest and most dangerous rewrite, at the very end. And there was
no state anywhere in which the app ran on Hetzner with Supabase still behind it, because
M1.1's box boots against an empty Postgres.

The two halves have opposite risk profiles. **Every one-way door is in the Supabase half**
— forcing a password reset, deleting the database's protections, the first real write to
the new database. **The hosting half has none:** it needs no new code and is reversible in
minutes by pointing the domain back at Vercel. It is also the half that exercises every
operator job D1 handed over — build in CI, TLS, firewall, supervision, deploy, monitoring.

- The same artifact M1.1 builds, running on the box behind the proxy, `DATABASE_URL` still
  pointing at Supabase.
- **You move your daily use onto it.** Everything after becomes "swap one thing at a time
  underneath an app you are already using", and your own use becomes the smoke test — for
  someone with no monitoring habits, the only alarm that will ever actually be acted on.
- **RETRACTED: "this deletes work".** I claimed M0.6 stops being needed. **Four places in
  this plan correctly say otherwise and my claim was the wrong one.** M0.6 gives your
  *laptop* a way to reach a database once the real one is private, and moving your *usage*
  to the box does not do that — `npm run dev` and `npm run test:e2e` both run on the laptop,
  and M1.6's and M1.7's mandatory-variable changes land there. **M0.6 survives untouched;
  only its "keep the old world alive for months" rationale shrinks.**
- **AND THIS CHANGES A RULE YOU WERE ASKED TO APPROVE, so it is a question, not a bullet.**
  Rule 5 says "you can use the product on localhost every day of this". This milestone
  quietly replaces it with "you move your daily use onto the box". That may be better — but
  your approval surface moved after you were asked to approve it. **Q-RULE5: do you want
  rule 5 to become "on the box" rather than "on localhost"? Recommendation: yes, because
  the box then gets exercised daily by the only person who will notice. Cost if wrong: your
  daily driver is the thing being changed underneath you.**
- **Security, unasked:** the database's exposure is unchanged here (Supabase stays public
  behind its rules, exactly as today). What *is* new is an internet-facing box of your own,
  months earlier than planned. That is the point — learn sshd, TLS and the firewall while
  there is nothing to lose — but it means **M1.7's hardening ships WITH M1.0, not after.**
- Acceptance: the app answers on your domain, from the box, against Supabase, and you have
  used it for a day. Rolling back is a DNS change.

### M1.1 — It builds and boots. **M1.0 is this milestone's acceptance, not a step before it** — see M1.0's correction.
**Depends on:** B2. **Note the ring:** its acceptance names M1.7's healthcheck, and M1.7's healthcheck touches a database whose schema is M2, which depends back on M1.1. It resolves because an empty Postgres answers a healthcheck and `app/page.tsx` renders a signed-out page — **stating that is the point, because the old plan's deadlock was invisible for exactly this reason.**
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
**Under D1 this milestone also owns the box, which nothing owned before.** There is
no Dockerfile, compose file, Caddyfile, Ansible or Terraform in this repo, and
`next.config.mjs` sets no `output` key — so today the recipe for the server would
exist only in whoever typed the commands.

1. **One checked-in provisioning artifact** — an `infra/` directory with the script or
   playbook, the compose file or systemd units, the reverse-proxy config, and M2's
   `postgresql.conf` fragment. **One stated rule: nothing exists on either box that
   this artifact did not put there, except the secrets file and Postgres's data
   directory.** That rule is what makes M1b.4's restore real — a restored database
   needs an identical machine before it is worth anything, so **the backup plan is only
   as good as the machine plan.** It is also what makes "staging and production are the
   same shape" mean the same shape rather than the same price.
2. **A real build job producing a deployable artifact.** CI builds this app today only
   *inside Playwright's web server* (`playwright.config.ts:696`) and throws the result
   away — no build job, no artifact, no registry. Choose the shape:
   `output: "standalone"` (it does **not** copy `public/` or `.next/static` — you copy
   them), a Docker image, or shipped `node_modules` whose native binaries must match the
   box's architecture and libc. Name the registry and its retention.
0. **The process topology, first line of this milestone.** One process or two? The word
   "worker" appears twice in this plan and both times means a *browser* service worker;
   there is **no scheduling or queue library in `package.json` at all** (measured). M1b.2
   states its requirement and names no mechanism and no home. This matters structurally
   because of this milestone's own rule — nothing exists on either box that the
   provisioning artifact put there — so **a second always-on process discovered later means
   reopening the artifact, the supervision units, the log caps, the alerts and the deploy
   step after all of them are signed off.** Decide now: one process, or the app plus a
   worker, both in the artifact from the start. Not a backend rebuild — a decision taken
   before the machine is built rather than after. (The `leave-vercel-supabase-decision`
   note recorded that Next has nowhere to put a worker; this plan asserts rule 1 and never
   resolves it.)
3. **Supervision.** What runs the app, restarts it on crash, starts it on boot. Compose
   does this only if the restart policy is set and Docker is enabled at boot, neither of
   which is currently stated. systemd is familiar territory — `build.sh:65`.
4. **Build-time variables are a separate class (N44), owned here:** the build fails when
   any is missing, and **there is one build per environment.** The same image cannot be
   promoted from staging to production — it would bill and email against the wrong URL.
5. **`deploymentId`** from the same git sha as the build id, one line, so a tab left open
   across a deploy reloads instead of 404-ing on chunks the box no longer has.
- Acceptance: **reboot the staging box from the Hetzner console and, without logging in,
  the app answers `/api/healthz` — and Postgres came back first.** A hand-typed
  `npm start` in an SSH session passes a weaker test and dies with the terminal. Plus:
  the provisioning artifact built both boxes from a fresh image, and running it twice
  changes nothing.

### M1.7 — Secrets, healthcheck, monitoring
**Depends on:** M1.1, M0.6.
**21** distinct environment variables are read across the codebase. `NEXT_PUBLIC_APP_URL`
is baked into both Stripe's return URL and M1b.3's email links.
- `NEXT_PUBLIC_BUILD_ID` is required and set from the git sha **in CI** — under D1 there is no provider commit variable to read — and
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
- A fourth place secrets live: **GitHub Actions.** `e2e.yml` passes five Supabase
  values, and the heavy jobs nine — **as `${{ secrets.* }}` references, not
  hardcoded.** An earlier draft of this plan said "hardcodes", which was wrong and
  would send someone hunting a leaked key to rotate. There is no key in the file.
  **Under D1 a fifth joins them and it is the most valuable secret in the project: a
  deploy key that can log into production.** Dedicated non-root user, restricted to
  the deploy command, and `deploy.yml` must not run on any event a fork can trigger.
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
**The new internet-facing surface, which one clause did not cover.** Vercel and
Supabase absorbed all of this:
- **The app must not face the internet.** `next start` listens on every interface unless
  told otherwise, and Next's own self-hosting guide says put a reverse proxy in front —
  the proxy absorbs malformed requests, slow-connection attacks, payload limits and rate
  limiting. So the app binds `127.0.0.1` only, and the **Hetzner Cloud Firewall**
  (outside the box, so a mistake in `ufw` cannot expose anything) default-denies inbound
  with 80, 443 and a restricted 22 open.
- **sshd:** `PasswordAuthentication no`, `PermitRootLogin no`, a non-root deploy user,
  fail2ban or a source restriction on 22. An unhardened sshd on a Hetzner IP meets
  credential-stuffing within hours.
- **Who owns 80/443 and renewal.** Caddy renews itself; nginx + certbot needs its own
  timer. ACME's HTTP-01 challenge needs port 80 open — a constraint on the rule above.
- **If Q-AI-HOST says host: Ollama has no authentication at all.** Private network only,
  never the public IP, and **never the app box** — resident weights would evict
  Postgres's cache and make every query slow.
- **The "private network is loopback" claim is conditional** on Postgres living on the
  app box, which B7 leaves open. On its own box you need a private network plus
  `listen_addresses` and `pg_hba.conf`.

**Two alerts, at the standard this milestone already sets.** The disk is the single
point of failure on one box, and **the backup system M1b.4 adds is the likeliest thing
to fill it**: WAL archiving keeps each segment until the archive command succeeds, so
expired credentials or a long network drop grow `pg_wal` until the disk is full — and a
full disk stops Postgres accepting writes and takes the app with it. An uptime check
reports that *after* the outage, by definition.
- **Disk free under 25% and under 10%.** Also cap journald/Docker logs and prune old
  images: every deploy leaves ~1GB behind and Docker's default logging has no size cap.
- **The age of the last successful WAL archive**, once M1b.4 exists.

- Acceptance: the app refuses to boot with a **runtime** variable missing, loudly —
  N44's four are build-time and M1.1 owns them. **Scan the public IP from outside: only
  80, 443 and 22 answer; 3000, 5432 and 11434 answer nothing.** A forced certificate
  renewal performed and observed once, **plus an alert when the served certificate has
  under 14 days left** — "it renews without being touched" cannot be tested for 60 days,
  and silent failure means an untrusted site for every browser and, after M7, every
  phone app at once. The uptime check and both disk alerts each fired once, on purpose,
  into something you actually read. **Prerequisite: M0.6, or this locks you out of your
  own dev server.**

### M1.8 — Deploy pipeline
**Depends on:** M1.1.
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
**Depends on:** M1.1, M0.6, B-PATHS (the rate-limit counter lives in `src/timetrack/`), Q-AI-HOST.
Two classes, not one. **Ollama** is hostable (see N37). **The Claude CLI is not** —
N30 and N31. Executing D4 means: 3 files move to the Anthropic API, the budget check
that path skips is re-enabled, and the `execSync` call stops blocking the event loop
for 60 seconds, which was invisible on Vercel and freezes every other user on one
always-on container.
- Remove the `|| "http://localhost:11434"` default — a silent fallback CLAUDE.md
  forbids, which presents as "the AI is slow" rather than "not configured".
- **The rate-limit counter moves to Postgres here, AND is applied.** Moving it without
  applying it protects nothing: **login, password reset and the AI endpoints are where a
  stranger either gets in or spends your money**, and M3 builds a token login on a
  public API. The rewrite kept the move and dropped the application; this restores it. It is an
  in-memory map per process, so with staging plus production the real limit is
  already twice the stated one — and for the AI endpoints that multiplies the bill.
  It lives in `src/timetrack/`, so it needs B-PATHS.
- Acceptance: Ask Coach and Inner Game answer on the deployed URL; a budget-exceeded
  user is refused on every AI path including the ones that used the CLI.
- **Prerequisite: M0.6** — removing the default makes the variable mandatory locally.

## M2 — Schema and data

**Depends on:** B1, M1.1. **Not M3, despite needing M3's library choice** — that looks
like a cycle and is not one, because **D1 settles the library and D3 settles the id type,
so the dependency is already discharged in DECISIONS.** M2 runs first and M3 consumes
its schema. Stated because an unexplained ring is what made the old plan's deadlock
invisible — because
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
- **Repoint N12's user links to our own users table.** A deliverable in the original
  plan that the rewrite lost, keeping only the rationale. Largest mechanical change here.
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
  for name — nothing currently guards those. **One deliberate exception, and stating it is
  the point: the user links must NOT match the dump.** The dump's point at `auth.users`;
  ours must point at our users table, and **a test that fails if any `auth.users`
  reference survives** is the other half. A name-for-name assertion with no exception
  would assert the very thing that must change.

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

**Depends on:** M2, M3, **B-PATHS** (M1b.4 touches `timetrackBackupRepo`). Moved here because each named a test that needed a
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
- **The 11 Postgres functions** (N15), named because "decide each one's fate" with no
  list is the stand-in failure this plan is otherwise careful about: `save_life_plan`,
  `start_enrollment`, `end_enrollment`, `resume_enrollment`, `finish_program_workout`,
  `remove_session_and_replay`, `replace_sets_and_replay`, `log_session_and_advance`,
  `claim_beta_slot`, `match_embeddings`, `match_embeddings_test`. Decide each fate. `save_life_plan` takes
  ownership from the caller's payload; `claim_beta_slot` calls `auth.uid()` inside its
  body and breaks outright. **Triggers too** — one exists purely so nobody can attach
  their own workout to someone else's program, and it is not a policy.
- Acceptance: the above, plus **a stated enumeration**: how many of N21's 116 were
  exercised, how many were skipped, and why each skip is safe.

## M5 — Drizzle

**Vercel is already off — M1.0 did it, and M1.0 is M1.1+M1.7's acceptance rather than a separate week-one step (see its correction).** Leaving Vercel was
welded to this milestone and that was the plan's largest ordering mistake: the cheap
reversible half bolted to the dangerous one-way half, and scheduled last.

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
- **M4 runs before the first file is ported, not after.** The port is what removes the
  database's protection (round 8), so the gate cannot follow it. The per-file order is the
  one recorded in M0.4 step 4: seam once, then `valuesRepo`, then the other standalone
  files, then the clumps largest-last, measuring cost per line as you go.
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
- **The push handler lives in `public/sw.js`, whose offline list another session owns —
  message them before editing.** The rewrite dropped that warning and it matters on a
  shared checkout; same for `playwright.config.ts` and `components/BottomSheet.tsx`.
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

# THE BROWSER SUITE HAS NO DATABASE AFTER M5, AND NOTHING OWNS ONE

**Found round 8, and it is the second gap of the scheduler kind — a requirement stated with
no mechanism.** Today CI depends on a **live Supabase project containing three seeded
accounts**: `auth.setup.ts` signs in through the real login form, `fixtures/test-user.ts`
defines `TEST_USER`, `TEST_USER_B` (for cross-user isolation) and `TEST_USER_TRAINING`
— whose own comment records that the training specs **wipe that account clean on every
run** — and `e2e.yml` hands every job the Supabase URL, the anon key, the **service-role
key** and all six credentials.

After M3 those accounts live in our own users table. After M5 and B5 Supabase is off. After
M1.7 port 5432 answers nothing from outside and inbound is default-deny, and GitHub's
runners have no stable address to allow-list. **So the suite has nowhere to run, and this is
a precondition of three separate things:** M1.8's "the full suite green once" before the
merge to `main`, M6's "each converted route keeps its e2e spec green", and M3's acceptance,
which is a live sign-in.

Two options, neither written down until now: **a throwaway Postgres per CI run**, seeded
from B1's dump plus Better Auth accounts — the mechanism already exists for the integration
suite via testcontainers, but nothing wires it to Playwright — or **point the suite at
staging** and accept that a suite which wipes an account on every push writes to a real box.

**This needs an owner before M3.** The OWNERSHIP table is the device this plan invented to
catch exactly this, and it had no row for a test database.

**A second, smaller orphan of the same kind:** M0.4's "test the first four beliefs before M1
ends" names no milestone, no deliverable and no acceptance — and since M1.0 absorbed
Q-SKELETON, that bullet is now the *only* early validation of Better Auth's uuid override,
its bcrypt verification and its non-browser tokens left anywhere in the plan. Unenforceable
as written.

---

# WHAT KEEPS THIS PLAN TRUE

**Nothing does, and it went stale during its own review** — the file grew 62 lines under
round 7 while it was reading, moving its citations. That is the revision-banner failure
again, live, at small scale.

The repo already owns the right kind of mechanism and none of it points here:
`tests/unit/docs/planConceptCheck.test.ts`, `knownFailuresWired.test.ts` and
`architecture/orientation.test.ts` all go red when a document stops matching the code.
**Grep over `tests/`, `scripts/` and `.claude/`: nothing names this plan.**

Two options, in preference order:
- **(a) Shorten the horizon so the plan need not survive months.** That is exactly what
  M1.0, Q-DOWNTIME, the vertical slicing and the rehearsal relabel do. Preferred, and it is
  free.
- **(b) One test that recomputes the rows this plan actually leans on** — N1, N4, N7, N9,
  N18, N21, N24, N29 — and fails on drift. **Half a day, and one more red test the peers
  will see.** Worth it only if the horizon stays long.

**Prose discipline is not a mechanism.** "All figures in one table" is exactly the
discipline that failed five times in this document already.

---

# ALREADY CHECKED — do not spend a round re-deriving these

Round 4 verified each of these against the code and the rewrite dropped the section,
so every later reviewer has been re-deriving them. They are here to be trusted.

- **M3's cookie→token switch does not by itself break the 79 e2e specs**, because
  `tests/e2e/auth.setup.ts` signs in through the real form and saves
  `page.context().storageState()`, which captures cookies **and** localStorage. That half
  holds.
- **CORRECTED 2026-09-28 — the second half of this entry was wrong, and this was the worst
  possible place to put a wrong fact.** It said `grep -rln supabase tests/e2e/` returns
  nothing, "so the browser suite never touches it". The grep is accurate and the conclusion
  is a stand-in: **the suite reaches Supabase through the app, so no import appears.** It
  depends on a live Supabase project with three seeded accounts — see the section above.
  Sixth single-pattern grep failure of that session, in the one section headed "do not spend
  a round re-deriving these".
- **38 of N12's 40 user links are `ON DELETE CASCADE`**, and the single `SET NULL`
  (`error_reports.user_id`) holds nothing a person typed, so it is de-identified by
  design. **There is no orphan class — this matters to M8.**
- **No file uploads, no Supabase Storage, no Realtime, no `pg_cron` anywhere.** That
  removes an entire category migrations normally trip over. Audio is transcribed in the
  browser, so nothing is stored.
- **Dropping the policies has no hidden tail of test rewrites** — `asUser` appears in 3
  integration files, 13 times.
- **Only 3 `SECURITY DEFINER` functions exist** and all three are already named
  (`handle_new_user` → M3, `claim_beta_slot` → M4, `prune_error_reports` → M1b.2).
- **No Vercel-only runtime config beyond the build id** — zero `maxDuration`, zero
  `runtime` exports, one `force-dynamic`, and `images.unoptimized: true` is already set,
  so the usual self-hosted `sharp`/glibc memory trap does not apply.
- **`--webpack` is a real supported flag** in the installed Next 16.3.5.
- **The Drizzle query port is mechanical** — 7 embedded selects, 3 `!inner`, 8 `.or()`,
  16 `.upsert()`, no full-text search — and the deliberate-refusal protocol survives,
  because `databaseRefusal` needs only `{ code, message }`, which `pg` provides.
- **The static filter test cannot be M4's primary gate**, and this is why, so nobody
  re-proposes it: `getFieldReport(reportId)` checks ownership in the route rather than
  the repo, which is legitimate; and `embeddingsRepo`/`embeddingsTestRepo` have no user
  column at all because they hold shared corpus data. Kept as a **secondary** signal.
- **Two more append-only triggers** beyond the workout one M4 names:
  `life_answers_no_update` and `life_chapters_no_update`, both added after an update
  destroyed a real answer someone had written ninety seconds earlier. Plus **17
  `*_touch` triggers created inside a loop, invisible to a static read** — the same
  blind spot as N11's policy count.
- **Four `tests/unit/db/` tests mock the client**, so they pass against a broken
  rewrite. N18 covers the coverage claim; this is the separate hazard.
- **Vercel deploys through its GitHub integration** — no `vercel.json`, no `.vercel/`,
  so B5's switch is in Vercel's own settings, not in this repo.

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
