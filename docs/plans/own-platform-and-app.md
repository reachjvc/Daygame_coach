# Off Vercel and Supabase, onto your own platform, aimed at a real app

**Status:** written 2026-09-26. Serves vision items 36, 37, 46 and 47.

Every number below was measured in this codebase on 2026-09-26, not estimated.
Where a number is a guess it says so.

## Revision 3 — 2026-09-26, after an independent review

A separate agent was given this plan and told to attack it and re-measure every
number rather than trust the prose. **It found worse than Revision 2 did, and it
corrected Revision 2's own headline number.** Everything below was re-verified by
hand before being written here.

**The one that matters most: M4's gate could not close.** Revision 2 replaced the
static test with a behavioural one — log in as A, try to reach B's things through
every endpoint, expect nothing. Correct instinct, fatal ordering. That test was to
run **before** the 68 policies are dealt with, and the integration harness turns
row security **on**: `tests/integration/setup.ts:188` issues `SET ROLE
authenticated` inside `asUser()`, with its own docstring explaining that without it
"RLS is never exercised, and every denial test passes while proving nothing." So
the test passes because *Postgres* refused the row, not because *our code*
filtered — and that green light is what authorises deleting Postgres's refusal.

It is not theoretical. `save_life_plan` is `SECURITY INVOKER` and takes ownership
**from the caller's own payload** — `(e.value ->> 'user_id')::uuid`
(`20260922110000_save_life_plan.sql:84`) — and its lock reads
`FROM life_plans WHERE id = …` with **no user filter**, because the policy is
doing that job. Delete the policies with that unchanged and one signed-in user can
read and overwrite another's entire life plan. Nine more functions are built on the
same principle. **Fix: M4's test runs against a throwaway copy with the policies
already dropped. Only then does green mean our code filters.**

**Revision 2's headline number was wrong, and in the flattering direction.** It
said 12 of 26 database files have a real-database test. Measured: **3 of 22
integration test files import repo code at all**, and their own headers say why —
`trackingRepo.integration.test.ts:5` says "this tests the schema constraints, not
the trackingRepo.ts business logic"; `goalRepo.integration.test.ts:7` says "They do
**NOT** test production goalRepo.ts functions". So it is **0 of 26 repos** whose
own functions are executed against a database, not 12. My count matched filenames,
which is the stand-in mistake CLAUDE.md rule 1 exists to prevent.

Worse, M0.4 as scoped could not have fixed it: `tests/integration/schema.sql`
creates **52 tables, not 66** — 29 live tables are absent, including all four that
`healthRepo` uses, and `healthRepo` was M0.4's second-largest target. And every
repo gets its client from `createServerSupabaseClient()`, which speaks HTTP to
Supabase and reads `next/headers`; it cannot talk to the bare Postgres container
the harness provides. **Fix: M0.4's first job is the seam — repos receive a data
handle instead of each making their own client — so one suite can be aimed at
Supabase today and Drizzle tomorrow. M5 already noticed "M0 establishes no such
interfaces" and never connected it back. That seam IS the missing interface.**

**Five more that no milestone owned:**

1. **Nothing will create a `profiles` row after M3.** A `SECURITY DEFINER` trigger
   on `auth.users` does it today (`handle_new_user`,
   `20260101000000_create_profiles.sql:134`), and **no app code inserts a profile —
   zero `insert`/`upsert` on `profiles` anywhere.** When Better Auth owns sign-up,
   `auth.users` and its trigger are gone, and a new account gets no profile. Every
   access gate reads it. **The same trigger fills `profiles.timezone` at sign-up —
   so the scheduler M1.2 builds to fix the midnight bug would roll everyone over at
   UTC midnight instead of theirs.** M3 now owns both.
2. **Existing accounts and their passwords have no path across.** Supabase stores
   bcrypt; Better Auth uses scrypt and will not verify bcrypt without a custom
   verifier. M3's test is sign-up/sign-in/reset — all of which pass with a brand-new
   account, which is exactly what "your own account is the first test" means. M2 now
   names it, with the choice written down: import the hashes with a verifier, or
   force a reset for every account — and the second needs M1.3's email working
   first, so it constrains the order.
3. **M5's rollback loses data.** Revision 2 said "a DNS or platform switch back".
   Every row written on the new platform between cutover and rollback lives only
   there. Switching back does not retrieve it, it hides it, and the two databases
   diverge. In a project with two recorded data losses. M5 now requires a stated
   reverse path and a bounded maintenance window.
4. **Two slices run their AI on a local Ollama.** `src/qa/config.ts:9` and
   `src/inner-game/config.ts:244` both read
   `process.env.OLLAMA_API_URL || "http://localhost:11434"`. On Railway that
   address is nothing. Hosting the models is a second service with real memory, so
   **B2's "$5–20/month" is wrong.** And `|| "http://localhost:11434"` is a silent
   fallback, which CLAUDE.md forbids — it will present as "the AI is slow", not
   "the AI is not configured".
5. **No secrets inventory, and no way to know the platform is broken.** 19
   distinct environment variables are read across the codebase and M1 names none of
   them; `NEXT_PUBLIC_APP_URL` alone is baked into both Stripe's return URL and
   M1.3's email links. There is no monitoring of any kind, and `/api/health/*` is
   the health-**tracking** slice, not a liveness probe — so Railway has nothing to
   ping. On Vercel he had someone else's monitoring for free; on Railway he has
   none, and the plan never noticed the swap.

**Also folded in:** the 10 Postgres functions become named deliverables in M4/M5
(`claim_beta_slot` calls `auth.uid()` **inside its body**, so it breaks outright,
not just its policy); connection pooling gets named in M5, because 280 free HTTP
calls become 280 sockets against a default ceiling of 100 shared with the
scheduler and staging; and Q8's rate limiting collides with convention 4 exactly
as M7 does, since `checkRateLimit` lives in `src/timetrack/`.

**Numbers corrected in Revision 3.** Every one re-measured by hand:

| Was | Is |
|---|---|
| "12 of 26 repos have a real-database test" | **0 of 26** run repo functions against a database |
| "`schema.sql` boots all 66 tables" | **52**; 29 live tables absent |
| "26 repo files, 14,194 lines" | **11,272** lines in the 26 `*Repo.ts`; 14,330 is all 46 files in `src/db/` |
| "68 policies across 56 migration files" | 68 policies, in **12** files (56 is the total migration count) |
| rule 5's "**66** database security rules" | **68** — the plan contradicted itself on the line where approval happens |
| "18 call sites remain" | **19**, and the ledger had 19 entries while the prose said 18 |
| "115 data endpoints" | **116** `route.ts` files |
| "4 scripts" (M0.3) / "8 scripts" (M1.5) | **12** reach the database — including
  `scripts/backup-timetrack.ts` and `scripts/restore-timetrack.ts`, which are the
  timetrack slice's own disaster recovery and die the day the database goes private |
| "6,104 unit tests" (still at line 101) | **6,116** |
| M8's test asserts "66 tables" | **63 live** — 66 created, 8 dropped, 5 never recreated, so the test errors on tables that no longer exist |
| M6: "each route keeps its existing e2e spec green" | **4 of the 23 have no e2e spec at all** (`/qa`, `/preferences/archetypes`, `/test/scenario-lab`, `/test/goal-review`) |

**A third spelling of the identity call was missed twice.** The M0.1 guard checked
`getUser()`, then `getSession()`, and still missed
`supabase.auth.admin.getUserById` at `src/api_ai/apiAiService.ts:337`. Now caught,
and proved by planting it. Three passes to enumerate one thing correctly is the
honest record of how hard "I have found them all" is.

**What the review confirmed as sound, so nobody re-checks it:** 23 of 94 screens
server-drawn and 71 browser-drawn — exact. 40 `references auth.users` — exact. 68
`CREATE POLICY` — exact. 18 stray queries in 8 files, and the file list — exact.
98 type errors and 335 lint errors — exact. `resetGoalsForPeriods` at
`goalRepo.ts:896` and `deleteUserValues` at `valuesRepo.ts:80` — exact. **No file
uploads, no Supabase Storage, no Realtime, no `pg_cron` anywhere** — so file
handling is a non-problem, which is unusual and genuinely good news. And M7's
finding that the timer already derives elapsed time from the wall clock is correct.

## Revision 2 — 2026-09-26, after a second pass over the plan

The owner asked for a critical re-read. Seven things changed. Two of them were
load-bearing claims that were not true.

1. **M5 had no safety net.** The plan said the 6,104 existing tests would catch a
   database-layer rewrite. They would not: only **12 of the 26 repo files have any
   test that runs against a real database**, and the 14 without include the two
   biggest, `workoutRepo` (1,453 lines) and `healthRepo` (1,242 lines). That is
   ~2,700 lines of the 14,194 being rewritten with nothing watching. **New M0.4
   writes those tests first, against the current database**, so the same tests
   judge the rewrite. This is the most important change in Revision 2.
2. **M4's gate, as written, could not pass** — and its fallback was an exception
   list on the one test protecting user data. Rewritten so the primary proof is
   behavioural, not a static read of the source.
3. **The 68 database rules are no longer "delete, not translate" by default.**
   That was stated as settled and it is a real decision. Now Q6.
4. **M2 and M3 were in the wrong order.** M2 built a users table before M3 chose
   the login library that owns it — repointing 40 links twice.
5. **Nothing in the plan built the scheduler**, though a native scheduler is one
   of the reasons for moving and M7's notifications need one. Now in M1.
6. **M7 contradicted convention 4** — it cannot deliver notifications without
   editing `src/timetrack/**`, which convention 4 forbids.
7. **Four categories were missing entirely:** sending email, backups with a
   rehearsed restore, the pipeline losing its route to the database, and rate
   limiting. Added as M1.5, M2.5, B8 and Q8.

**Corrections to numbers:** the suite is 6,116 tests, not 6,104. M0.1's claim
that the auth facade was used by "almost nothing" was wrong — **65 route files
already used it**; the real gap was 33 route files. M0.1 is now **done**
(commits `3a54e532`, `54749fce`): 48 of 66 call sites moved, guard test in place
with both failure modes proved.

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

5. **The 68 database security rules are deleted, not translated.** They exist
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
6,116 unit tests, the whole of Life Mastery, Training, Tracking, Scenarios and
the pipeline. This is the large majority of the codebase.

**Gets rewritten:** the layer that talks to the database and the layer that knows
who you are. Measured:

| What | Size today |
|---|---|
| Database access (`src/db/`) | 26 repo files, **11,272** lines (all 46 files in `src/db/` are 14,330) |
| Files asking "who is logged in" directly | 50 files, 66 call sites |
| Database queries outside the database layer | 8 files, 18 call sites |
| Scripts reaching the database | **12** |
| Security rules to delete | 68, across **12** migration files (56 is the total migration count) |
| Database links to Supabase's user table | 40 |
| Screens the server draws (must become browser-drawn) | 23 of 94 |
| Data endpoints that already exist | **116** |

**The last two lines are the good news.** 71 of your 94 screens already draw
themselves in the browser and you already have 115 data endpoints, so you have
been building this the app way by accident. The app is much closer than the
hosting situation suggests.

## The milestones, each a working app

**M0 — Preparation, on the current stack. Nothing moves.**
One function answers "who is logged in", and all 50 files call it instead of
asking Supabase directly. All 18 stray database queries move into the database
layer. A test fails if anyone adds a new one. **And the 14 database files with no
real-database test get one (M0.4), because those tests are what will judge the
rewrite in M5.**
*You see:* no change at all. Everything still on Vercel.
*Why first:* it turns "rewrite 50 files during the migration" into "rewrite one",
and it is useful even if you never move.

**M1 — The new platform exists, with staging and production, deploys itself, and
can do things at 3am.**
An empty app on Railway, private Postgres, a staging copy, and a pipeline that
migrates the database then deploys. This is the "CD" your friend asked for
(vision item 37). **Plus the always-running part that a website cannot have: the
scheduler.** It is why your goals rolling over at midnight stops being a bug, and
it is what will later send a notification to a phone in your pocket. Nothing in
Revision 1 built it.
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
**This is the riskiest step in the plan** — 14,194 lines rewritten — and it is
only safe because M0.4 gave every one of those files a test that runs against a
real database first.
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

**Revision 3 estimate: 8 to 14 weeks.** Revision 1 said 4 to 7, Revision 2 said 6
to 10. **The estimate has now moved twice, both times upward, and that is itself
the most useful thing on this line** — it means the job keeps being bigger than the
last look suggested, so treat any number here as a floor. Revision 3 adds the data
seam before M0.4 (without it M0.4 buys nothing), profile creation and password
migration in M3, hosting the AI models, secrets and monitoring in M1, and M4's
throwaway-copy rehearsal. It is an estimate, not
a measurement. The increase is M0.4 (the 14 missing database tests, 1–2 weeks), the
scheduler, email and backups in M1, and Q6 if the rules are kept rather than
deleted. **"Weeks" here means weeks of sessions like this one, not calendar weeks
and not your own hours.**

The Revision 1 estimate was 4 to 7 weeks. The recorded figure was "about 3 weeks", which was written
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

### B8 — An email provider, and a domain you control. **Cannot do; needs you.** NEW.
*Attempted:* searched the repo — no email provider is configured anywhere. No
Resend, Postmark, SendGrid or SMTP credentials, and no sending code. Supabase does
it all today. There is also no custom domain in the repo; the app answers on
`daygame-coach.vercel.app`.
*Why it blocks more than it looks like:* password reset and sign-up confirmation
stop working the day login becomes ours. And mail from a brand-new sender lands in
spam until the DNS records are in place and warmed, which is a wait, not a task.
*Cost:* free to roughly $20/month at this size. A domain is about $15/year.
*When:* before M3, and the DNS part wants doing at M1 so it has time to settle.

### B9 — Your friend's answer on the backend shape. **Sent; not returned.** NEW.
*Attempted:* the owner texted him on 2026-09-26. The plan does not wait on it —
B1's reasoning holds — but one question is worth more than the platform name: the
owner recalls him saying to **leave Next.js**. Measured here: 314 non-component
`.ts` files in `src/` and **not one imports Next**, so the business logic is
already free of it. Next does two jobs only — wrapping the API routes
(`next/server`, 116 imports) and routing the web UI (`next/link` 68,
`next/navigation` 45). **This plan's shape is what makes that decision cheap
later**, because once the backend is its own service nothing depends on the web
framework. No milestone needs the answer.

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

### Q6 — Are the 68 database rules deleted, or kept as a second wall? NEW.
Revision 1 said delete, as settled fact. It is a real decision and here is the
case both ways.

**Row-level security is a Postgres feature, not a Supabase one.** You keep it when
you leave. The reason it is a burden today is that it is the *only* wall and it is
68 rules across 56 files that nobody can read. On a private network with your own
login, the network and your own filtering are the wall, and the 68 rules would be
a second one behind it.

Keeping them is not free: they call `auth.uid()`, which stops existing, so each
would be rewritten to read a session value your own code sets. Call it a week.

**Recommendation: keep them, rewritten.** Your vision item 10 is "nobody can read
or take another user's data", item 39 is long-term over speed, and item 40 says you
take the programmer's road rather than the simpler one. Two walls where one would
do is exactly that road, and this project has already lost data twice. **Cost if
wrong:** a week spent on a wall you never needed, and slightly more work each time
a new table is added. **Cost if the other way is wrong:** one missed filter in
14,194 rewritten lines exposes one user's data to another with nothing behind it.
The costs are not symmetrical.

### Q7 — Does M0.4 (the missing database tests) really go first, adding 1–2 weeks
before anything moves? NEW.
**Recommendation: yes.** It is the difference between M5 being engineering and
being a gamble, and per this plan's own rule 2 the tests are worth having whether
or not you ever move. It also front-loads the boring part while you are still on a
platform that works. **Cost if wrong:** two weeks where you see nothing new, on top
of the several weeks you already see nothing new. That is the real cost and it is
not small.

### Q8 — Rate limiting on the new data service? NEW.
A token API is a plainer target than today's arrangement. You already have
`checkRateLimit` (`src/timetrack/rateLimitService.ts`) and `/api/errors` uses it.
**Recommendation: apply it to login, password reset and the AI endpoints in M3,
and leave the rest.** **Revision 3 note: `checkRateLimit` lives in
`src/timetrack/`, which convention 4 forbids touching — the same collision M7
has, and it needs settling the same way.** Those three are where a stranger costs you money or gets in.
**Cost if wrong:** someone can hammer login, or run your AI bill up.

### Q9 — Paying still does not give anybody anything. When is that fixed? NEW.
Q2 recommends selling on the web rather than through the app stores. But **nothing
in this codebase grants access when someone pays** — there is no Stripe webhook and
no code ever writes `has_purchased`. So "sell on the web" has a prerequisite that
is not a milestone anywhere in this plan.
**Recommendation: it stays out of this plan, but it is written down as the thing
that must exist before you charge one person, on any host.** It is not a hosting
problem and folding it in here would widen a migration into a product build.
**Cost if wrong:** you finish all nine milestones and still cannot take money.

---

# PART 2 — Execution

## Conventions

1. Every deliverable names its test. A step is done when its named test passes,
   not when the code is written.
2. No phase starts before the previous phase's test passes.
3. `git commit --only <paths>`, every time. Three other sessions share this tree.
4. Do not touch `src/timetrack/**` or `src/vice/**`.

## M0 — Preparation on the current stack

**M0.1 — One function answers "who is logged in". DONE (`3a54e532`, `54749fce`).**
`src/db/auth.ts` exports `requireAuth`, `requirePremium`, `requireAccess` and now
`optionalUserId`. **Revision 1 said "almost nothing uses them" — that was wrong:
65 route files already did**, and the real gap was 33 route files.

All 48 API-route call sites are converted; `grep -rn "auth.getUser()" app/api`
returns nothing. Five files each carried their own copy of the paywall and now
call `requirePremium()`. `AuthSuccess` gained `email` (two callers legitimately
need it) and `optionalUserId()` is new for `/api/errors`, which serves signed-out
callers on purpose.

**19 call sites remain, deliberately, and they are not the same job:**
`app/page.tsx` renders a signed-out landing page instead of redirecting,
`app/life-mastery/layout.tsx` redirects carrying a `?next=` return address,
`app/auth/reset-password/page.tsx` runs in the browser where a server facade
cannot reach, and 10 server pages need a **page-shaped facade that redirects
rather than returning a 401 body** — which does not exist yet. They are live
pages and the owner's localhost serves this working tree, so they need a browser
check, not just a green test.
- Test: **built into `tests/unit/architecture.test.ts`** rather than a new file,
  because CLAUDE.md names that file as where architecture is enforced and the
  repo's ledger idiom lives there. Fails when any file outside `src/db/auth.ts`
  contains `.auth.getUser()` **or `.auth.getSession()`** — the first version
  checked only `getUser()` and `app/dashboard/tracking/layout.tsx` walked past it
  using the other spelling, which is why `54749fce` exists.
  Enumeration, stated because a guard's reach IS the claim: every `.ts`/`.tsx`
  under `app/` and `src/`, skipping `node_modules` and `.next`. Both failure modes
  proved by planting a violation and a stale ledger entry.
  **Not covered, deliberately:** the nine other `.auth.*` calls that make up the
  login flow itself (`signUp`, `signInWithPassword`, `signOut`,
  `resetPasswordForEmail`, `resend`, `updateUser`, `exchangeCodeForSession`,
  `GoogleAuth`). They are M3's job, not this rule's.

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

**M0.4 — The 14 database files with no real-database test get one. NEW, and the
most important addition in Revision 2.**

Revision 1 promised that M5 — rewriting 14,194 lines of database code — would be
caught by "the existing suite, the repos have tests already". Measured: **12 of
26 repo files have an integration test that runs against a real Postgres; 14 do
not.** The unit tests that name a repo mostly test pure transforms, and four of
them mock the database client, so they would pass against a broken rewrite.

The 14 without, with size, worst first:

| File | Lines |
|---|---|
| `workoutRepo` | 1,453 |
| `healthRepo` | 1,242 |
| `metricsRepo` | 460 |
| `programDraftRepo` | 220 |
| `timetrackRepo` | 195 |
| `trainingDoorRepo` | 185 |
| `viceRepo` | 165 |
| `embeddingsTestRepo` | 153 |
| `timetrackBackupRepo` | 148 |
| `lifeAnswerRepo` | 111 |
| `lifeChapterRepo` | 105 |
| `dashboardRepo` | 101 |
| `betaRepo` | 97 |
| `errorReportRepo` | 94 |

`workoutRepo` and `healthRepo` alone are ~2,700 lines, ~19% of everything M5
rewrites, with nothing watching.

**REVISION 3 — M0.4's FIRST JOB IS THE SEAM, or none of the rest works.** Measured:
**0 of 26 repos have a test that executes the repo's own functions against a
database.** Three of the 22 integration files import repo code at all, and the
others say plainly in their headers that they test schema constraints rather than
repo logic. Worse, they *cannot*: every repo calls `createServerSupabaseClient()`
itself, which speaks HTTP to Supabase and reads `next/headers`, and cannot talk to
the bare Postgres container the harness provides.

So M0.4 starts by giving repos a **data handle they receive rather than create**.
One suite then points at Supabase today and Drizzle in M5. This is the interface
M5 complains does not exist. Two consequences worth stating: `src/db/supabase.ts`
importing `next/headers` is also what binds the data layer to Next's request
context, so the seam is a prerequisite for rule 1 ("the backend becomes a data
service") being true at all; and **`tests/integration/schema.sql` creates 52
tables, not 66** — 29 live tables are missing including all four `healthRepo`
uses, so the mirror has to be completed before M0.4 can even seed a fixture.

- These tests are written **now, against Supabase**, so they describe behaviour
  rather than implementation. The same tests then judge the Drizzle version. A
  test written after the rewrite only proves the rewrite agrees with itself.
- `tests/integration/schema.sql` already boots all 66 tables in a plain Postgres
  container with `auth.uid()` stubbed, so the harness exists — this is writing
  cases, not building infrastructure.
- **Two files are owned by other sessions** (`timetrackRepo`,
  `timetrackBackupRepo`, `viceRepo` — convention 4). Either they write those or
  convention 4 is renegotiated for them. Do not skip them silently: they are
  still rewritten in M5 whether or not they have a test.
- Test: `npm run test:integration` covers 26 of 26 repo files. The count is the
  deliverable.
- **Honest cost:** this is the single biggest addition to the plan. Call it 1 to 2
  weeks. It is the price of M5 not being a leap of faith, and per the plan's own
  rule 2 it is useful even if the move never happens.

**M0 acceptance:** 6,116 unit tests still pass (the figure was 6,104 and has
moved), `npm run test:integration` covers all 26 repo files, both ratchets report
"none new", and the app still works on Vercel. Nothing about the platform has
changed.

## M1 — Platform, staging, production, pipeline, scheduler, email, backups

- Railway project, private Postgres, two environments.
- `.github/workflows/deploy.yml`: migrate, then deploy. Staging on every push to
  `training-rebuild`; production on `main`.
- Remove `app/api/test/*` and `app/api/exercising/*` from the production build
  (Q5).
- Test: `tests/unit/ciWorkflows.test.ts` extended — migrate step precedes deploy
  step, and no workflow deploys without migrating.

**M1.2 — The scheduler. NEW in Revision 2; Revision 1 built no such thing.**
There is no scheduler library anywhere in this project today — checked. Two things
need one and neither is optional:
- The midnight rollover. `resetGoalsForPeriods` (`src/db/goalRepo.ts:896`) runs
  lazily, when somebody happens to load a page, which is the whole reason the
  rollover bug class exists. "A native scheduler deletes that bug class" is one of
  the stated reasons for this move, so something has to actually build it.
- Sending notifications in M7. A phone in a pocket is not making requests; the
  server has to start the conversation.
- Per-user timezone matters: `profiles.timezone` exists and is `NOT NULL DEFAULT
  'UTC'`, so "midnight" is 24 different moments.
- Test: an integration test that moves the clock across a period boundary for two
  users in different timezones and asserts each rolled over once, at their own
  midnight, without anyone loading a page.

**M1.3 — Sending email. NEW; Revision 1 never mentioned email at all.**
Supabase currently sends sign-up confirmations and password resets — the code for
the user's side of that already exists (`supabase.auth.resend()`,
`resetPasswordForEmail`, and the whole `app/auth/sign-up-success/` flow). Once
login is ours, we send them. **This is not a nice-to-have: without it nobody can
confirm an address or recover a password, and the app is unusable for anyone who
is not already logged in.**
- Needs an email provider account and DNS records on a domain the owner owns —
  see B8. Sender reputation is why this cannot be left to M3 week.
- Test: an integration test that triggers a reset and asserts the provider was
  called with a real address and a working link; plus one manual send to the
  owner's own inbox, because "the API returned 200" is not "the mail arrived".

**M1.6 — The AI has nowhere to run. NEW in Revision 3.**
`src/qa/config.ts:9` and `src/inner-game/config.ts:244` both read
`process.env.OLLAMA_API_URL || "http://localhost:11434"` — a local model server.
On Railway that address is nothing, so Ask Coach and Inner Game stop working.
Decide: host the models as a second service (real memory, and **B2's $5–20/month
is then wrong**) or move those two slices to a paid API. Also remove the `||`
default: a silent fallback is forbidden by CLAUDE.md and this one will present as
"the AI is slow" rather than "the AI is not configured".

**M1.7 — Secrets, and knowing when it is broken. NEW in Revision 3.**
19 distinct environment variables are read across the codebase and Revision 2's M1
named none. `NEXT_PUBLIC_APP_URL` is baked into both Stripe's return URL and
M1.3's email links, so a wrong value there sends password-reset links nowhere.
- A secrets inventory per environment, and the app **refuses to boot** when one is
  missing rather than degrading.
- `/api/healthz` that actually touches the database — note `app/api/health/*` is
  the health-**tracking** slice, not a probe, so Railway has nothing to ping today.
- An error sink that is **not** the app's own Postgres: `/api/errors` writes into
  the database the app depends on, so an outage takes the alarm with it. There is
  no monitoring of any kind in this project — on Vercel that came free, on Railway
  it does not.
- `prune_error_reports()` (`20260906100000_error_reports.sql:76`) has no caller
  anywhere, so `error_reports` grows without bound. M1.2's scheduler owns it.

**M1.4 — Backups, and a restore that has actually been done. NEW.**
Revision 1 mentioned backups nowhere. 66 tables, and two real data losses are
already on record in this project.
- Point-in-time recovery switched on, and **a restore performed into staging**.
- Test: the restore is the test. "Backups are enabled" is a setting; "I have
  restored from one" is a fact. Only the second is worth anything.

**M1.5 — The pipeline keeps its route to the database. NEW, and it is a trap.**
The point of this move is that the database leaves the public internet. That also
means **the owner's own laptop can no longer reach it.** Eight scripts currently
connect directly, including the ones that build the scenario corpus — the premium
product. Revision 1's M0.3 handles which library those scripts import; it does not
handle that they will not connect at all.
- **Security warning, stated because the tempting fix is the wrong one:** do not
  open the database to the internet so the scripts work. That undoes the only
  reason for the move. The routes that keep the wall intact are a private tunnel
  from the platform's CLI, or running the pipeline as a job on the platform
  itself. The second is better — the corpus build is long-running and does not
  belong on a laptop that sleeps.
**The timetrack backup holds the key that bypasses every wall, and nothing runs
it.** Verified 2026-09-26 after a peer raised it:
`exportTimetrack` (`src/db/timetrackBackupRepo.ts:44`) calls
`createAdminSupabaseClient()`, which reads `SUPABASE_SERVICE_ROLE_KEY`
(`src/db/server.ts` → `supabase.ts:47`) — the **service-role** credential, which
bypasses row-level security entirely and can read and overwrite every user's rows.
`grep -rl backup-timetrack .github/ package.json scripts/` finds only the script
itself: **no npm script, no workflow, no schedule.** So the slice's disaster
recovery is a person remembering to run a script that holds the master key.

**And its own docstring overclaims its test coverage, which is the more dangerous
half.** `timetrackBackupRepo.ts:10` says "there is a test that runs the whole round
trip against a real Postgres". There is not. `tests/unit/db/timetrackBackup.test.ts`
covers `assertRestorable` — whether a file is safe to write over live data — and
its own header is honest that the round trip "is proved by hand (the procedure is
in docs/runbooks/timetrack.md, and it was run)". So: proved once manually,
documented, never re-proved automatically, and a comment in the repo that tells the
next reader a test is watching. **Fix the comment as part of this milestone** — a
false claim of coverage is worse than no coverage, because it stops the next person
looking. Three files are involved and nothing else imports them:
`src/db/timetrackBackupRepo.ts`, `scripts/backup-timetrack.ts`,
`scripts/restore-timetrack.ts`.

- **It is 12 scripts, not 8** (Revision 3 re-measured). Two of them matter more
  than the rest: **`scripts/backup-timetrack.ts` and
  `scripts/restore-timetrack.ts`** are the timetrack slice's own disaster recovery,
  and they stop working the day the database goes private. In a project with two
  recorded data losses, those two are not "a script".
- Test: `scripts/training-data/11.EXT.retrieval-smoke.ts` runs green against the
  new database from wherever it is going to live from now on, **and the timetrack
  backup/restore pair runs green from wherever it will live.**

## M2 — Schema and data

**Ordering corrected in Revision 2.** Revision 1 built the users table here and
chose the login library in M3. That is backwards: Better Auth (and every
alternative) ships its own user/session/account tables, so a users table invented
in M2 gets replaced in M3 and the 40 links get repointed **twice**. **Do M3's
library choice and schema generation first, then repoint the 40 links once.**

- Port 56 migrations. **One `users` table of your own — generated by whichever
  login library M3 picks, not hand-written here** — and all 40
  `references auth.users` repointed to it.
- Order: staging from a dump first, verified, then production.
- Test: a row count per table, staging against the dump, plus a foreign-key
  integrity check that fails if any `auth.users` reference survives.

## M3 — Token login (Better Auth)

**REVISION 3 — two deliverables that belonged to nobody.**
1. **Creating the profile row on sign-up, and capturing the timezone.** Today a
   `SECURITY DEFINER` trigger on `auth.users` does it (`handle_new_user`,
   `20260101000000_create_profiles.sql:134`) and **no app code inserts a profile —
   zero inserts or upserts on `profiles` anywhere.** The trigger dies with
   `auth.users`, so a new account would get no profile and hit a blank wall at
   every access gate with no error explaining it. The same trigger fills
   `profiles.timezone`, so **without this M1.2's scheduler rolls everyone over at
   UTC midnight instead of their own.** M1.2's timezone test must therefore use a
   user whose timezone arrived at sign-up, not one typed into Settings.
2. **Existing accounts and passwords.** Supabase stores bcrypt; Better Auth uses
   scrypt and will not verify bcrypt without a custom verifier. Decide and write
   down which: import the hashes with a verifier, or force a reset for every
   account — **the second needs M1.3's email working and warmed first, so it
   constrains the order.** M3's stated test (sign-up, sign-in, reset) passes with
   a brand-new account and cannot see this gap, and M2's stated foreign-key test
   passes perfectly against an empty users table. **Ask the owner how many real
   accounts exist** — `beta_invites`, `beta_testers` and `waitlist_emails` exist,
   so it is a question, not an assumption.

- Users in your own database. Tokens, not cookies, because a phone app cannot use
  the cookie (vision item 47).
- The five pages under `app/auth/` and `app/actions/auth.ts` repointed.
  `src/db/authCookies.ts` is replaced.
- Test: sign-up, sign-in, sign-out, password reset, and a token accepted from a
  non-browser client — that last one is what proves the app can log in.

## M4 — Prove the filtering, then decide what happens to the 68 rules

**The gate. Nothing after this runs if the test cannot pass.**

**Rewritten in Revision 2, because Revision 1's version could not pass.** It asked
for "a test that reads every function in `src/db/*Repo.ts` and fails any query
that does not filter by the current user's id". Concretely why that fails:
`getFieldReport(reportId)` takes a report id and no user — ownership is checked
afterwards, in the route (`report.user_id !== auth.userId`). That is a legitimate
pattern and there are many like it. Two of the 26 repos have no user column at all
(`embeddingsRepo`, `embeddingsTestRepo`) because they hold shared corpus data, not
anybody's rows. So the static test either fails everywhere — and by the plan's own
rule 5 the plan then stops — or it grows an exception list. **An exception list on
the single test standing between one user's data and another's is exactly where
the hole would live.** Reading source is a proxy; what protects data is behaviour.

**REVISION 3, AND THIS IS THE WHOLE GATE: the behavioural test must run with the
68 policies ALREADY DROPPED, on a throwaway copy.** Run with them live — which is
what the existing harness does, `SET ROLE authenticated` at
`tests/integration/setup.ts:188` — the test passes because Postgres refused the
row, not because our code filtered, and that green light is what authorises
deleting Postgres's refusal. The harness's own docstring says it: without the role
switch "RLS is never exercised, and every denial test passes while proving
nothing." Order: copy the database, drop the policies on the copy, run the test
there, and only a green run on the *unprotected* copy means anything.

**And the 10 Postgres functions are named deliverables, not background.** They were
absent from Revision 1 and 2 entirely. `save_life_plan` takes ownership from the
caller's own payload (`(e.value ->> 'user_id')::uuid`) and locks
`FROM life_plans WHERE id = …` with no user filter, because the policy does that
job — its own migration says so in capitals. `claim_beta_slot` calls `auth.uid()`
**inside its body** (`20260709_create_beta_tables.sql:41`), so it breaks outright
rather than merely losing a wall. The full list: `save_life_plan`,
`start_enrollment`, `end_enrollment`, `resume_enrollment`, `finish_program_workout`,
`remove_session_and_replay`, `replace_sets_and_replay`, `log_session_and_advance`,
`claim_beta_slot`, `match_embeddings`.

**The primary proof is now behavioural:**
- A generated integration test that, for **every one of the 116 endpoints**, calls
  it as user A using user B's ids, and asserts nothing of B's comes back and
  nothing of B's is changed. Generated from the route list so a new endpoint is
  covered the day it is added, and failing for an endpoint it cannot classify
  rather than skipping it.
- Plus the static check, kept as a **secondary** signal with its exceptions
  written out and justified one by one. It is useful for catching a careless new
  query; it is not the wall.
- **Enumeration to state when reporting this green:** how many of the 115 were
  exercised, how many were generated-and-skipped, and why each skip is safe. A
  green suite that silently skipped 30 endpoints is worse than a red one.

**Then, and only then, Q6 decides what happens to the 68 policies** — deleted, or
rewritten to read a session variable and kept as a second wall. Revision 1 treated
deletion as settled. It is not.

## M5 — Drizzle, and Vercel off

- 26 repo files, 14,194 lines. **Revision 1 said "behind the interfaces M0
  established" — M0 establishes no such interfaces.** M0.1 is auth, M0.2 is stray
  queries, M0.3 is scripts. What actually holds the shape is each repo's exported
  functions, which the rest of the app already calls, plus M0.4's tests.
- Traffic moves. Supabase stays running and paid.
- Test: **M0.4's integration tests, which is the only reason this phase is not a
  leap of faith.** Revision 1 claimed "6,104 passing tests earn their keep" here.
  They do not: most never touch a database and four of the db unit tests mock the
  client, so they pass against a broken rewrite. Twelve of 26 repos had real
  coverage before M0.4; all 26 must have it before a line of this phase is
  written.
- **REVISION 3 — connection pooling.** Today each of ~280 `.from()` call sites gets
  a free HTTP client. Under Drizzle each becomes a real socket, and Postgres
  defaults to 100 connections shared between the web app, M1.2's scheduler,
  staging and any pipeline job. Name a single module-level pool with an explicit
  ceiling; do not let each repo function open its own.
- **REVISION 3 — the rollback as written loses data.** A DNS switch back to
  Vercel+Supabase does not retrieve the rows written on the new platform after
  cutover: it hides them, and the two databases diverge permanently. State the
  reverse path (a dump of the changed tables back into Supabase) and a bounded
  read-only window so the set of divergent writes is known. Rehearse the **data**
  part on staging, not just the switch.
- **Rollback, which Revision 1 did not state:** traffic moving is the one step
  users would notice. Write down before starting how it goes back — Supabase is
  still running and paid by rule 4, so the answer should be a DNS or platform
  switch, and it should be tested once on staging rather than reasoned about.

## M6 — The last 23 server-drawn screens

- The 23 `page.tsx` files without `"use client"` become browser-drawn against the
  115 existing endpoints plus whatever is missing.
- Test: each converted route keeps its existing e2e spec green — **except that 4
  of the 23 have no e2e spec at all** (`/qa`, `/preferences/archetypes`,
  `/test/scenario-lab`, `/test/goal-review`), measured in Revision 3 against all
  79 specs in `tests/e2e/`. Write them, or accept a browser check for those four
  and say which was done.

## M7 — The real app

- Capacitor shell (Q1). Push handler in `public/sw.js` — **message the session
  that owns its offline list before editing.**
- Notifications when closed; screen-dark counting. Today there is no push at all:
  `useTimetrack.ts:289` and `RestBar.tsx:91` only fire while the page is open.

**Two things Revision 2 found here, one good and one a contradiction.**

*The good one:* the hard half is already built correctly. The timer derives elapsed
time from the wall clock — `setInterval(() => setNowSec(Math.floor(Date.now() /
1000)))` at `useTimetrack.ts:190` — rather than counting upwards. A phone
suspending the app therefore stops it *repainting*, not *counting*, and it is right
again the moment you look at it. If it had been an incrementing counter, item 46
would have meant rewriting the timer.

*The contradiction:* what must change is **when** a notification fires. Today the
pomodoro end is a `Date.now()` comparison inside that same running interval
(`useTimetrack.ts:399`, `:409`), so with the app closed nothing fires — it fires
late, when you reopen. The fix is to hand the phone's operating system a scheduled
notification in advance, which means editing `src/timetrack/**`. **Convention 4 of
this plan forbids touching `src/timetrack/**`.** So either M7 takes ownership of
those files by agreement with the session that holds them, or M7 cannot deliver
vision item 46. This must be settled before M7 starts, not during it.
- Test: B6 — you, holding your phone.

## M8 — The legal minimum

- Account deletion, data export, privacy policy, terms, cookie notice.
- None exists today. `deleteUserValues` (`src/db/valuesRepo.ts:80`) deletes one
  slice's rows, not an account.
- Test: an integration test that deletes an account and finds no row of theirs in
  any of the **63 LIVE tables** — Revision 3 measured 66 `CREATE TABLE` statements
  of which 8 were later dropped and 5 never recreated, so a test iterating "the 66
  tables the migrations create" errors on tables that no longer exist. The
  tempting fix is to skip the failures, which is exactly the trap the next
  paragraph warns about. Counted 2026-09-26, and it
  matters: the figure carried in the notes was 34, so the table the test forgets
  is the one that keeps somebody's data after they asked for it to be gone.
