# Onboarding & Account Creation → Deployment Ready

> **⚠️ SUPERSEDED IN PART.** The first draft of this plan was written without
> database access and got two things wrong. Both are corrected in
> **PART 0 — GROUND TRUTH** below, which was read from the live database on
> 2026-08-28. Where Part 1 and Part 0 disagree, Part 0 wins.

---

# PART 0 — GROUND TRUTH (verified against the live database)

## Corrections to the first draft

| First draft claimed | Actually |
|---|---|
| **"No profiles row is created on signup"** — called a blocker | **Wrong.** Trigger `on_auth_user_created` -> `handle_new_user()` exists and works. 4 auth users, 4 profile rows. |
| **"`full_name` is collected and silently discarded"** | **Wrong.** The trigger copies it. Proof: the owner's own account has `raw_user_meta_data.full_name` = `profile.full_name` = "Jonas vindahl Christensen". The nulls are on API-created test users that never had metadata. |
| **"SSRF: the calendar route can reach the cloud metadata endpoint"** | **Overstated.** `assertPublicUrl()` already blocks 169.254/127/10/192.168/172.16-31/localhost/.local/.internal. Two real gaps remained: `redirect: "follow"` re-checked nothing on the hop, and the route had no auth. Both now fixed. |
| M1 (write the trigger + backfill) | **Not needed.** The live function is byte-for-byte the behaviour M1 proposed, `ON CONFLICT` included. Dropped from the plan. |

The lesson, recorded because it is the house rule: the repo-only sweep was
accurate about the repo and wrong about the database. Three "verified blockers"
were inferences from absence-of-code. Absence of a migration is not absence of a
trigger.

## What was actually wrong — verified

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **Any signed-in user could grant themselves premium.** `authenticated` held table-level UPDATE on `profiles`, which covers `has_purchased`; row policies cannot restrict columns. One `PATCH` on their own row = free premium. 5 API routes + 6 pages gate on that flag. | **Critical** | Migration written, **not yet applied** — see Blocker 1 |
| 2 | **A user could brick their own account.** `profiles_delete_own` allowed deleting the profile row; the trigger only fires on INSERT to `auth.users`, so it never comes back. `/redirect` then loops to `/preferences`, whose UPDATE matches zero rows. | **High** | Same migration, not yet applied |
| 3 | **Email confirmation was broken.** No `/auth/confirm`; the one-time code in the email was never exchanged for a session. Confirmed users were bounced to login. | **Critical** | ✅ Fixed |
| 4 | No password reset at all. | **High** | ✅ Fixed |
| 5 | Open redirect: `startsWith("/")` accepts `//evil.com`, which browsers load as `https://evil.com`. Three copies of the check, all wrong. | Medium | ✅ Fixed |
| 6 | `proxy.ts` sent `?redirectTo=`, login read `?next=` — post-login destination always lost. | Medium | ✅ Fixed |
| 7 | `postLoginNext` cookie read but never written. | Dead code | ✅ Removed |
| 8 | `proxy.ts` guarded only `/dashboard`. | Medium | ✅ Fixed |
| 9 | 10 `/api/test/*` routes unauthenticated in production. | High | ✅ Fixed |
| 10 | Calendar route: unauthenticated + redirect hops unvalidated. | Medium | ✅ Fixed |
| 11 | 7 RLS policies on `profiles` where 4 suffice; 3 exact duplicates. | Cleanup | In the unapplied migration |
| 12 | Signup e2e tests asserted only that the form renders. | High | ✅ Fixed |
| 13 | `profiles` has no migration — not reproducible from the repo. | High | ⬜ Open |
| 14 | `settingsRepo` reads/writes `profiles.sandbox_settings`, and `settingsService` writes `profiles.subscription_cancelled_at`. **Neither column exists** — both throw `42703` in production. | High | Migration written, **not yet applied** — see Blocker 1 |
| 15 | `tests/integration/schema.sql` declares 8 phantom columns and ~19 FKs to `profiles` that production does not have (production has **zero**). | High | ⬜ Open |
| 16 | Whole beta feature (`betaRepo`, `hasAccess`, `requireAccess`) has zero callers, but its tables and `claim_beta_slot()` are live. | Decision | ✅ Decided 2026-08-29: **keep**, revisit with pricing |
| 17 | **Supabase Site URL is `http://localhost:3000`** and the redirect allow-list holds only a leftover `v0.app` URL — no production domain, no `/auth/confirm`. Email links cannot work in production regardless of code. | **Critical** | ⬜ Open — needs the production domain |
| 18 | No custom SMTP (`smtp_host` is null); `rate_limit_email_sent` = 2/hour. | High | ⬜ Open — needs SMTP credentials |

## Verified facts worth not re-deriving

- `profiles.id` -> `auth.users(id) ON DELETE CASCADE`. Deleting an account cleans up.
- **Zero** foreign keys point at `profiles`. Every other table references `auth.users`.
- Live auth settings: email/password only, no OAuth, `disable_signup: false`,
  `mailer_autoconfirm: false` (confirmation genuinely required).
- A new user with `has_purchased = false` lands on the dashboard in **preview
  mode** — a graceful paywall that already works. Q1 is answered by the code.
- 43 tables in `public`.

Full entity diagram: `docs/architecture/onboarding-entities.md`.

---

# PART 1 — HUMAN SECTION

## What actually happens today if a stranger signs up

I walked the real path. Here it is, step by step, with the verified failure points.

1. Stranger opens `/auth/sign-up`, fills name/email/password. ✅ works.
2. `supabase.auth.signUp()` fires with `emailRedirectTo: <origin>/dashboard`
   and `data: { full_name }`. ✅ the auth user is created.
3. They land on `/auth/sign-up-success` — "check your email". ✅ correct, because
   the live project has `mailer_autoconfirm: false` (verified via
   `GET /auth/v1/settings`), so confirmation really is required.
4. They click the link in the email. Supabase verifies and redirects to
   `/dashboard?code=<pkce_code>`.
   **💥 DEFECT 1 — nothing on our side ever exchanges that code for a session.**
   There is no `/auth/confirm` route handler anywhere in the repo, and
   `exchangeCodeForSession` appears zero times. `proxy.ts` sees no session cookie
   on `/dashboard` and bounces them to `/auth/login`. The user has now confirmed
   their email and been thrown out with no explanation.
5. Suppose they log in manually anyway. `/redirect` reads
   `profiles.onboarding_completed`, finds no row, sends them to `/preferences`. OK.
6. They complete the 5-step onboarding. `completeOnboardingForUser()` calls
   `updateProfileDb()`, which is a bare `.update(...).eq("id", userId).single()`.
   **💥 DEFECT 2 — if no `profiles` row exists, this UPDATE matches zero rows and
   `.single()` throws `Failed to update profile`.** Onboarding cannot complete.
   The user is stuck in a loop: `/redirect` → `/preferences` → error → `/redirect`.

So: **a brand-new account cannot reach the dashboard.** Both defects are
invisible to the current test suite (see Defect 9).

## The full defect list (verified, ranked)

| # | Defect | Severity | Evidence |
|---|--------|----------|----------|
| 1 | No email-confirmation callback; PKCE `code` never exchanged | **Blocker** | no `app/auth/confirm/`; `grep exchangeCodeForSession` → 0 hits; live `mailer_autoconfirm: false` |
| 2 | No `profiles` row is created on signup; onboarding UPDATE hits 0 rows | **Blocker** | no `handle_new_user` trigger in repo; `profileService.ts:163` uses update-not-upsert |
| 3 | No password reset anywhere | **Blocker for launch** | `grep resetPasswordForEmail` → 0 hits |
| 4 | `full_name` is collected at signup and silently discarded | High | live `profiles` row for the test user has `full_name: null` despite signup writing it to user_metadata |
| 5 | `profiles` table has **no migration** — the schema is not reproducible from the repo | High | `supabase/migrations/` has 16 files, none create `profiles`; `schema.sql` is 0 bytes |
| 6 | `proxy.ts` sets `?redirectTo=`, login page reads `?next=` → post-login destination is always dropped | Medium | `proxy.ts:41` vs `LoginPageClient.tsx:27` |
| 7 | `postLoginNext` cookie is read but **never written** anywhere | Medium (dead code) | `grep postLoginNext` → 1 hit, the reader |
| 8 | `requireAccess()`/`hasAccess()` are used by **zero** routes — the paid/beta gate is dead | Medium | `grep -rl requireAccess app/api` → 0 files |
| 9 | Signup e2e tests never submit a signup — they only assert the form renders and that client-side password-mismatch works | High | `tests/e2e/signup-flow.spec.ts`, all 4 tests |
| 10 | `proxy.ts` guards only `/dashboard`. `/preferences`, `/programs`, `/lair`, `/qa`, `/admin` have no edge guard | Medium | `proxy.ts` matcher |
| 11 | **Security:** `/api/timetrack/calendar` is unauthenticated and fetches an arbitrary caller-supplied URL server-side — a clean SSRF into your VPC/metadata endpoint | **High** | `app/api/timetrack/calendar/route.ts`, no auth import |
| 12 | **Security:** 10 `/api/test/*` routes ship unauthenticated in a production build | High | route sweep, see AI section |
| 13 | No rate limiting on signup or login | Medium | no limiter in repo |
| 14 | `next.config.mjs` sets `ignoreBuildErrors: true` — a type error in auth code will deploy | Medium | `next.config.mjs:4` |
| 15 | No beta-claim UI despite `beta_invites` / `claim_beta_slot()` existing | Low | no `app/**/beta*` files |

### What is already right (don't rebuild it)

- `profiles` RLS is correct and enforced. Verified live: anon `SELECT` returns `[]`,
  the authenticated test user returns exactly one row (their own).
- `proxy.ts` is correctly named for Next 16.0.10 (`middleware.ts` was renamed to
  `proxy.ts`). It is picked up. Do not rename it back.
- `requireAuth()` / `requirePremium()` in `src/db/auth.ts` are sound. Reuse them.
- The 5-step onboarding UI (`OnboardingFlow.tsx`) works and is e2e-covered.
- Beta gating tables + `claim_beta_slot()` SECURITY DEFINER function are well-built.

## What you'll see when this plan is done

A stranger can: sign up → get an email → click it → land in onboarding already
logged in with their name filled in → finish onboarding → reach the dashboard.
If they forget their password they can reset it. If they mistype the email they
get a real error, not a stuck page. And `npm run test:e2e` fails loudly if any of
that ever breaks again.

## Milestones

Each is a working, shippable app state. Execute in order.

| M | User capability | Gated on |
|---|---|---|
| **M0** | *(no user-facing change)* The `profiles` schema is reproducible from the repo | Blocker B1, B2 |
| **M1** | A new signup always has a profile row, with their name in it | M0 |
| **M2** | Clicking the confirmation email logs you in and drops you into onboarding | M1 |
| **M3** | A forgotten password can be reset | M2 |
| **M4** | Auth errors are legible; post-login destination is preserved | M2 |
| **M5** | The whole signup→dashboard path is covered by a test that would have caught Defects 1 and 2 | M3 |
| **M6** | Every route is guarded; the SSRF and the test routes are closed | — (can run in parallel with M1–M5) |
| **M7** | Deployment: env, redirect URLs, SMTP, rate limits | M5, M6 |

---

# PART 2 — MANUAL BLOCKERS

Per house rule, each was attempted at least once. Result of each attempt is recorded.

### B1 — Confirm whether a `handle_new_user` trigger exists in the live database
**Why it blocks:** M1 chooses between "create the trigger" and "the trigger exists
but doesn't copy `full_name`, so fix it". Guessing here either produces a duplicate
trigger or a no-op migration.

**Attempted:** ✅ Yes, twice.
- Attempt 1: `GET /auth/v1/admin/users` with the service-role key — **blocked by the
  Claude Code permission classifier**, not by Supabase.
- Attempt 2: `GET /rest/v1/profiles` with the service-role key — **blocked the same way.**
- Attempt 3 (succeeded, read-only, anon + test-user token): confirmed `profiles`
  exists, RLS is own-row, and the test user's `full_name` is `null`. This is
  *indirect* evidence that no trigger copies `full_name`, but it does not prove
  whether a trigger exists at all.

**What I could not do and why:** running arbitrary SQL against the live project
needs either the SQL editor or a `psql` connection string; neither is available
here, and the service-role REST path is blocked by the sandbox.

**Run this yourself** (Supabase Dashboard → SQL Editor, read-only):
```sql
select t.tgname, p.proname, pg_get_functiondef(p.oid) as body
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;

select count(*) as auth_users from auth.users;
select count(*) as profile_rows from public.profiles;
```
**Report back:** the trigger name (or "none"), and whether the two counts match.
If `auth_users > profile_rows`, M1 must include the backfill step.

---

### B2 — Dump the live `profiles` DDL so M0 can commit a truthful migration
**Why it blocks:** `tests/integration/schema.sql` claims 30 columns but is a
hand-maintained mirror, not a dump. Committing it as the migration would encode
whatever has drifted.

**Attempted:** ✅ Yes. `dump_schema.sh` exists in the repo root; I read it and it
requires the same service-role/psql access that was blocked. Column *names* were
confirmed live for the 6 columns I could select through RLS
(`id, email, full_name, onboarding_completed, has_purchased, created_at`) — all
present and correctly typed. The other ~24 columns are unverified.

**Run this yourself** (SQL Editor):
```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy where polrelid = 'public.profiles'::regclass;
```
**Report back:** paste both outputs. M0 turns them verbatim into
`supabase/migrations/20260828_baseline_profiles.sql`.

---

### B3 — Add the production redirect URLs to Supabase Auth allow-list
**Why it blocks:** M2's confirmation link goes to `/auth/confirm`. Supabase will
refuse any `emailRedirectTo` that is not in the allow-list, and silently falls back
to Site URL — which reproduces Defect 1 in production even after M2 ships.

**Attempted:** ✅ Yes — read via `GET /auth/v1/settings`, which returns provider and
autoconfirm flags but **not** `SITE_URL` or `URI_ALLOW_LIST`; those are only exposed
through the Management API (needs a personal access token, which is not in `.env.local`)
or the dashboard.

**Do this yourself** (Dashboard → Authentication → URL Configuration):
- Site URL: your production origin.
- Redirect URLs, add all four:
  `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/reset-password`,
  `https://<prod-domain>/auth/confirm`, `https://<prod-domain>/auth/reset-password`.

---

### B4 — Replace Supabase's built-in SMTP before launch
**Why it blocks:** the built-in sender is capped at **2 emails/hour per project** and
is explicitly not for production. At 3 signups in an hour, users 3+ never get a
confirmation email and there is no error to see — the signup just appears to hang.

**Attempted:** ✅ Yes — `GET /auth/v1/settings` confirms `"email": true` as a provider
but does not expose the SMTP configuration; that is dashboard/Management-API only.
No custom SMTP credentials exist in `.env.local` (checked), which is consistent with
the default sender still being in use.

**Do this yourself:** Dashboard → Project Settings → Authentication → SMTP Settings.
Resend / Postmark / SES all work. Then send one test signup and confirm delivery.

---

### B5 — Decide and apply the `profiles` INSERT/UPDATE RLS policies
**⚠️ HOUSE RULE — STOP AND ASK.** `CLAUDE.md` requires explicit approval for any
INSERT/UPDATE/DELETE RLS policy. **Do not apply M1's policy block without a "yes".**

**Attempted:** ✅ Read-only probe only. Confirmed SELECT is own-row and working.
Write policies could not be enumerated (same block as B2).

**The decision:** M1's recommended design creates the row via a `SECURITY DEFINER`
trigger, which bypasses RLS by design — so **no INSERT policy for users is needed
at all**, and none should be added. Only an UPDATE-own-row policy is required, and
only if B2 shows it is missing. Approve or reject explicitly.

---

### B6 — Verify a real signup end-to-end against the live project
**Attempted:** ⚠️ **Deliberately not executed.** Creating a live auth user would send
a real confirmation email (burning 1 of the 2/hour B4 quota, and bouncing if the
address is fake, which harms sender reputation). Critically, the admin delete API
needed to clean it up is blocked in this sandbox — so I could create the user but
**not** remove it. That makes it hard to reverse, which the house rules gate.

**Do this yourself, after M2 ships**, with an address you control:
```bash
set -a && . ./.env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"you+t1@yourdomain.com","password":"CorrectHorse9!","data":{"full_name":"T One"}}'
```
Then confirm via the email, and check a `profiles` row appeared with
`full_name = 'T One'`. Delete the user afterwards in Dashboard → Authentication → Users.

---

# PART 3 — OPEN QUESTIONS

Each has a recommendation. If you don't answer, the executing agent takes the
recommendation and notes the assumption in the commit message.

### Q1 — Should a brand-new signup get access, or hit a paywall/beta gate?
`requireAccess()` and `hasAccess()` exist but **no route calls them**. Today a new
user with `has_purchased = false` and no beta membership passes `requireAuth()` and
uses the whole app free. That is either the intent or an unshipped gate.

> **Recommendation: leave it open for now, and delete nothing.** Ship M1–M7 with
> `requireAuth()` as the gate, i.e. open access. Do **not** wire `requireAccess()`
> into 38 routes in this plan — that is a pricing decision, not an onboarding one,
> and doing it here would double the blast radius. Keep `hasAccess()` (it is 6 lines
> and correct). Track "choose the access gate" as a separate plan.

### Q2 — Confirm-email-first, or let users in immediately and confirm later?
Currently confirmation is mandatory (`mailer_autoconfirm: false`) and the user sits
on a dead-end "check your email" page. The alternative is `mailer_autoconfirm: true`:
instant access, confirm later, much better activation — at the cost of fake-email
signups.

> **Recommendation: keep confirmation mandatory.** You are pre-launch with a 2/hour
> SMTP cap and no rate limiting; autoconfirm would let a script create unlimited real
> accounts with junk addresses. Revisit after B4 + M7's rate limiting are in place.

### Q3 — Where does a confirmed user land: `/dashboard` or straight into onboarding?
`emailRedirectTo` currently says `/dashboard`, but `/redirect` will immediately
bounce them to `/preferences` anyway since onboarding isn't done.

> **Recommendation: send them to `/auth/confirm?next=/redirect`.** One route decides
> destination (`/redirect` already reads `onboarding_completed`), so the rule lives in
> exactly one place. Don't hardcode `/preferences` in the email link — that breaks the
> day someone re-confirms an existing account.

### Q4 — Should `/preferences` be added to the `proxy.ts` matcher?
The page already does its own `getUser()` + redirect, so it isn't *insecure*. But an
unauthenticated hit renders a server component and a DB round-trip before redirecting.

> **Recommendation: yes, add it** — plus `/programs`, `/lair`, `/qa`. Change the
> matcher to `["/dashboard/:path*", "/preferences/:path*", "/programs/:path*", "/lair/:path*", "/qa/:path*"]`.
> Cheap, and it makes "logged-out users see nothing but auth pages" a single
> enforceable rule instead of 40 individually-correct pages.

### Q5 — What happens to `/api/test/*` in production?
Ten routes under `app/api/test/` have no auth and will be live on your production
domain. Some read and write files and article state.

> **Recommendation: gate the whole prefix at the edge, don't touch 10 files.** Add to
> `proxy.ts`: if `pathname.startsWith("/api/test/")` and
> `process.env.NODE_ENV === "production"` and `process.env.ENABLE_TEST_ROUTES !== "true"`,
> return 404. One rule, no per-route edits, no silent fallback.

### Q6 — Should `full_name` be required at signup?
It's `required` in the form but never persisted (Defect 4), so today it's pure theatre.

> **Recommendation: keep the field, make it actually save (M1), but drop `required`.**
> A mandatory real-name field on a daygame app is a conversion tax and a privacy
> smell. Nullable column, optional input, greeting falls back to the email local-part.

### Q7 — Do you want a `/beta` invite-claim page in this plan?
`beta_invites`, `beta_testers`, `waitlist_emails` and `claim_beta_slot()` all exist
and are well-built. There is no UI for any of it.

> **Recommendation: no — out of scope here.** It only has value once Q1 is answered
> (a beta gate is meaningless while access is open). Leave the tables; build the page
> in the same plan that answers Q1.

### Q8 — Rate limiting: build it, or buy it at the edge?
No limiter exists. Signup and login are both unthrottled.

> **Recommendation: buy it.** Supabase already rate-limits its own auth endpoints
> per-IP; add Vercel WAF / Cloudflare rules on `/auth/*` at the edge rather than
> writing an in-app limiter with no shared store. If you are not on an edge platform
> that offers it, then M7 adds `@upstash/ratelimit` — but only then.

### Q9 — What email domain should the M5 e2e signup test use?
M5 creates a real auth user on every run. The address must be in a domain you
control, or Supabase's sender starts bouncing mail at a domain that isn't yours.
This was found during the review pass — the first draft told the executing agent to
stop and ask mid-run, which is a worse answer than deciding it now.

> **Recommendation: add `E2E_EMAIL_DOMAIN=<your-domain>` to `.env`** and have the
> test throw if it's unset. Plus-addressing (`e2e+<timestamp>@`) on a domain you own
> is enough; the test confirms the user via the admin API and never sends mail. If
> you have no domain handy, `example.com` is reserved by RFC 2606 and will never
> deliver — acceptable *only* because M5 never triggers a send.

### Q10 — Should `/auth/sign-up-success` have a "resend confirmation email" button?
Right now if the email doesn't arrive the user's only recourse is to sign up again,
which errors with "User already registered" and leaves them stranded.

> **Recommendation: yes, but only after B4.** A resend button on the 2/hour built-in
> SMTP would mostly render a broken button. Once custom SMTP is live it is ~15 lines
> (`supabase.auth.resend({ type: 'signup', email })`) and removes a whole class of
> support ticket. Schedule it as the first item after M7, not inside it.

### Q11 — `profiles.email` goes stale the moment a user changes their email
The M1 trigger copies `email` at creation. Supabase's `auth.users.email` can change
later; the `profiles` copy will not follow. Nothing in the app currently reads
`profiles.email` for anything load-bearing, so this is latent, not broken.

> **Recommendation: drop the column from the read path rather than syncing it.**
> `auth.users` is the single source of truth for the address — read it from the
> session (`user.email`) wherever you need it. Keep the column (dropping it needs a
> migration and a check of every `select *`), but add a comment in M0's baseline:
> `-- denormalised copy, may be stale; auth.users.email is authoritative`. Adding a
> second trigger to keep it in sync would be two writers for one fact.

---

# PART 4 — AI EXECUTION SECTION

Conventions this repo enforces (`tests/unit/architecture.test.ts` — run it, don't
memorise it): business logic in `*Service.ts`, DB access only in `src/db/*Repo.ts`,
types in each slice's `types.ts`, API routes under 50 lines.

Run `npm test` after **every** milestone, not at the end.

---

## M0 — `profiles` schema is reproducible from the repo

**Gated on B1 + B2.** Do not invent this file; transcribe the dump.

**Create** `supabase/migrations/20260828_baseline_profiles.sql`:
- `create table if not exists public.profiles (...)` using **exactly** the columns
  from B2's `information_schema` output, in ordinal order.
- `alter table public.profiles enable row level security;`
- Re-declare each policy from B2's `pg_policy` output using
  `drop policy if exists ... ; create policy ...`.
- Header comment: `-- Baseline. Transcribed from the live project on <date>. This table predates migrations; this file makes it reproducible. It is idempotent and safe to re-run.`

**Acceptance test:** `tests/unit/db/profilesSchema.test.ts`. Precise recipe, so there
is nothing to guess:
1. `readFileSync` both `tests/integration/schema.sql` and the new migration.
2. From each, slice the text between the line matching
   `/create table (if not exists )?(public\.)?profiles \(/i` and the next line that
   is exactly `);`.
3. In that slice, for each line, take the first whitespace-delimited token, lowercase
   it; drop lines whose token is `--`, `constraint`, `primary`, `unique`, `check`, or
   `foreign`.
4. `expect(new Set(a)).toEqual(new Set(b))`.

Label it in a comment as what it is: **a shape test.** It proves the two files agree,
not that either matches the live database. Only B2 proves that.

---

## M1 — A new signup always has a profile row, with their name in it

**Gated on B1 (does the trigger exist?) and B5 (RLS approval).**

**Create** `supabase/migrations/20260828_profiles_autocreate.sql`:

```sql
-- One writer for profile creation: the database.
-- SECURITY DEFINER so it bypasses RLS; no user INSERT policy is needed or wanted.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
insert into public.profiles (id, email, full_name)
select u.id, u.email, nullif(u.raw_user_meta_data->>'full_name', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

**If B1 reports a trigger already exists:** do not add a second one. `create or
replace function` above already replaces the body; keep the `drop trigger if exists`
+ `create trigger` so the binding is known-good. Read the existing body first and
preserve any column it sets that this one doesn't.

**Do NOT also add an upsert in `profileService.ts`.** One writer, one layer. Adding a
belt-and-braces upsert in TS would be a second source of truth for the same
invariant, and it would mask a broken trigger instead of failing loudly.

**Edit** `app/auth/sign-up/page.tsx`: remove `required` from the `fullName` input
(per Q6). Leave everything else.

**Acceptance tests:**
1. `tests/unit/db/profilesAutocreate.test.ts` — reads the migration file and asserts
   it contains `security definer`, `on conflict (id) do nothing`, and a backfill
   `insert ... select ... where p.id is null`. Shape-only, and labelled as such.
2. The real check is **B6**, run manually after M2. A passing unit test here does not
   mean a profile row appears; only B6 shows that.
3. `tests/e2e/signup-flow.spec.ts` gains the M5 test.

---

## M2 — Clicking the confirmation email logs you in and drops you into onboarding

This closes Defect 1.

**Create** `app/auth/confirm/route.ts` (route handler, not a page — under 50 lines).

*Note for the implementer:* `createServerSupabaseClient()` has a `try/catch` around
`cookieStore.set` with a comment saying writes may be ignored. That applies to Server
Components. **In a Route Handler the write succeeds** — which is exactly why the code
exchange must live here and not in a page.

```ts
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"

/**
 * Supabase redirects here after the user clicks the confirmation link.
 * Exchanges the PKCE code for a session cookie, then hands off to /redirect,
 * which owns the "onboarding done or not" decision.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next")
  const safeNext = next && next.startsWith("/") ? next : "/redirect"

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=confirm_failed", url.origin))
  }

  return NextResponse.redirect(new URL(safeNext, url.origin))
}
```

Note: `safeNext` must reject `//evil.com` as well as absolute URLs. `startsWith("/")`
alone permits `//evil.com`. Use `next.startsWith("/") && !next.startsWith("//")`.
Apply the same fix to the two existing call sites that have this bug:
`app/redirect/page.tsx:40` and `app/auth/login/LoginPageClient.tsx:50`.

**Better: extract it once.** Create `src/shared/safeRedirect.ts`:
```ts
/** Accept only same-origin absolute paths. Rejects "//evil.com" and "https://evil.com". */
export function safeNextPath(value: string | null | undefined, fallback = "/redirect"): string {
  if (!value) return fallback
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback
}
```
and use it in all three places. That is the DRY fix; three copies of a security
predicate is exactly how one of them ends up wrong.

**Edit** `app/auth/sign-up/page.tsx`, change `emailRedirectTo`:
```ts
emailRedirectTo: `${window.location.origin}/auth/confirm?next=/redirect`,
```

**Acceptance tests:**
- `tests/unit/shared/safeRedirect.test.ts` — asserts `//evil.com`,
  `https://evil.com`, `null`, `""` all return the fallback, and `/dashboard` passes.
  This is a meaning test, not a shape test.
- `tests/e2e/auth-errors.spec.ts` — add: `GET /auth/confirm` with no `code` lands on
  `/auth/login` and shows an error message.

---

## M3 — A forgotten password can be reset

Two new pages, both mirroring the existing login/signup card layout. **Reuse
`components/ui/card|input|button|label` and copy the structure from
`LoginPageClient.tsx`** — do not introduce a new form pattern.

**Create** `app/auth/forgot-password/page.tsx` (client component):
- One email input, `data-testid="forgot-email-input"`, submit
  `data-testid="forgot-submit-button"`.
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` })`.
- **On success shows the same message whether or not the email exists**
  ("If an account exists for that address, we've sent a reset link"). Revealing
  which emails are registered is an account-enumeration leak.
- `data-testid="forgot-success-message"`.

**The recovery link reuses M2's route — do not write a second code-exchange.**
Set `redirectTo` to
`` `${window.location.origin}/auth/confirm?next=/auth/reset-password` ``.
`/auth/confirm` exchanges the code and forwards. By the time
`/auth/reset-password` renders, the session cookie already exists. This is the
whole reason M2's route takes a `next` param.

**Create** `app/auth/reset-password/page.tsx` (client component):
- Assumes an active recovery session (see above). On mount, call
  `supabase.auth.getUser()`; if there is no user, render "This reset link has
  expired" with a link back to `/auth/forgot-password` and render no form.
- Two password inputs (`data-testid="reset-password-input"`,
  `data-testid="reset-repeat-input"`), submit `data-testid="reset-submit-button"`.
- Mismatch check: **copy the four lines from `sign-up/page.tsx:30-34` inline. Do not
  extract a shared validator for it.** Two occurrences of a four-line equality check
  is not duplication worth a module; extracting it would be the YAGNI failure here.
- On success: `await supabase.auth.signOut()` then
  `router.push("/auth/login?reset=1")`. Signing out is deliberate — it forces the
  user to prove the new password works, and invalidates the recovery session so a
  leaked link in browser history is inert.

**Edit** `app/auth/login/LoginPageClient.tsx`: add a "Forgot your password?" link to
`/auth/forgot-password` under the password field.

**Acceptance test:** `tests/e2e/password-reset.spec.ts` — form renders; submitting a
never-registered address shows the *same* success message as a registered one
(this is the enumeration test and it is the point of the file); mismatched new
passwords show an error.

---

## M4 — Auth errors are legible; post-login destination is preserved

Closes Defects 6 and 7.

**Edit** `proxy.ts`: change `redirectUrl.searchParams.set("redirectTo", ...)` to
`("next", ...)` so it matches what the login page reads. One-word fix, real bug.

**Edit** `app/auth/login/LoginPageClient.tsx`:
- Delete `POST_LOGIN_KEY`, the `cookieNext` state, and the `useEffect` that reads it
  (~10 lines). Nothing writes that cookie — it is dead. Deleting it is safe and its
  purpose is fully explained: it was a second channel for the same value that `next`
  already carries.
- Replace the inline `startsWith("/")` check with `safeNextPath()` from M2.
- Read `?error=` and `?reset=` from `searchParams` and render the matching banner
  (`missing_code` / `confirm_failed` from M2; `reset=1` from M3).

**Edit** `app/redirect/page.tsx`: use `safeNextPath()`.

**Acceptance test:** `tests/e2e/protected-routes.spec.ts` — hitting
`/dashboard/tracking` while logged out redirects to login, and after logging in the
user lands back on `/dashboard/tracking`, not `/dashboard`. This test fails today.

---

## M5 — The signup path is covered by a test that would have caught Defects 1 and 2

The current `tests/e2e/signup-flow.spec.ts` asserts only that inputs are visible and
that two mismatched strings produce a client-side error. It would pass with the
entire backend deleted. Fix that.

**Edit** `tests/e2e/signup-flow.spec.ts`, add one test that does the real thing:
- Generate a unique address: `` `e2e+${Date.now()}@${process.env.E2E_EMAIL_DOMAIN}` ``.
  Read the domain from `E2E_EMAIL_DOMAIN` in `.env`; if it is unset, `throw` with
  "Set E2E_EMAIL_DOMAIN in .env". No fallback domain — see Q9.
- Submit the signup form for real; assert the URL becomes `/auth/sign-up-success`.
- Using the service-role key from `.env.local`, fetch the new user's id from
  `/auth/v1/admin/users`, then `PUT /auth/v1/admin/users/<id>` with
  `{"email_confirm": true}` to simulate the click without sending mail.
- Assert a `profiles` row now exists for that id with the submitted `full_name`.
  **This assertion is what catches Defect 2.**
- Log in as the new user; assert they land on `/preferences` (not `/dashboard`,
  not a login loop). **This catches Defect 1's downstream symptom.**
- `test.afterEach`: `DELETE /auth/v1/admin/users/<id>`. Non-negotiable — without it
  every CI run leaks a live account.

Put the admin helpers in `tests/e2e/helpers/adminUser.helper.ts`
(`createConfirmedUser`, `deleteUser`, `fetchProfile`) so no other spec re-implements
service-role calls.

**Acceptance test:** the test above is the acceptance test. Verify it genuinely
fails against the current `main` by stashing M1's migration — if it passes before
M1, it is not testing what it claims.

---

## M6 — Every route is guarded; SSRF and test routes closed

**Ordering correction:** M6 edits `proxy.ts`, and so does M4. Run M6 **after M4**,
not in parallel with it. The rest of M6 (the calendar SSRF fix, `safeFetchUrl.ts`)
touches no file any other milestone touches and *can* run in parallel with M1–M5 —
split it out if you want the parallelism.

**Edit** `proxy.ts`:
1. Matcher (per Q4):
   `["/dashboard/:path*", "/preferences/:path*", "/programs/:path*", "/lair/:path*", "/qa/:path*", "/api/test/:path*"]`
2. Add the `/api/test/*` production 404 rule (per Q5) **before** the session check.
3. Leave `getSession()` as-is. The comment above it is correct: this is routing, not
   data access, and RLS is the real boundary. Do not "upgrade" it to `getUser()` —
   that adds a network round-trip to every protected request for no security gain.

**Edit** `app/api/timetrack/calendar/route.ts` — **this is the highest-severity item
in the plan.** Today any anonymous caller can make your server fetch any URL:
```
POST /api/timetrack/calendar {"source":"ics_url","ref":"http://169.254.169.254/latest/meta-data/"}
```
That reaches your cloud metadata endpoint from inside your network. Two changes:
1. Add `requireAuth()` at the top, matching the 38 routes that already do.
2. **Read `src/timetrack/calendarSyncService.ts` in full before editing** — the plan
   does not assume `fetchIcsFromUrl`'s signature. Validate the URL **before** fetching:
   scheme must be `https:`; resolved host must not be a private/loopback/link-local
   address (`10.`, `127.`, `169.254.`, `192.168.`, `172.16–31.`, `::1`, `localhost`,
   `*.internal`); reject redirects to such hosts too (`redirect: "manual"`, then
   re-validate each hop). Put this in `src/shared/safeFetchUrl.ts` with its own unit
   test — the metadata-endpoint case must be an explicit test case.
   **Known residual risk, state it in the code comment:** hostname validation does not
   stop DNS rebinding (a name that resolves to a public IP at check time and a private
   one at fetch time). Fully closing that needs resolve-then-connect-by-IP, which Node's
   `fetch` does not expose. Accept it for now and say so in the comment; do not pretend
   the check is complete.

**Edit** `app/api/plan-snapshots/route.ts` — leave it. Its "unauthenticated by
design" comment is accurate and it validates hard; the `clientId` is the only key and
a caller can only affect their own. Flagged and reviewed, not changed.

**Acceptance tests:**
- `tests/unit/shared/safeFetchUrl.test.ts` — asserts `169.254.169.254`, `localhost`,
  `10.0.0.1`, and an `https://` URL that 302s to `127.0.0.1` are all rejected.
- `tests/e2e/security-auth.spec.ts` — unauthenticated `POST /api/timetrack/calendar`
  returns 401.

---

## M7 — Deployment readiness

1. **B3** applied (redirect URLs allow-listed). Verify by completing a real
   confirmation on the production domain.
2. **B4** applied (custom SMTP). Verify by signing up 3 accounts within one hour and
   confirming all 3 emails arrive — this is the only way to prove the 2/hour cap is gone.
3. **Env parity.** Production must have `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Add a boot-time
   assertion in `src/db/supabase.ts` that throws on a missing
   `NEXT_PUBLIC_SUPABASE_URL` (the admin client already does this for the service
   key — mirror that pattern rather than inventing a new one). Fail loudly, no fallback.
4. **`next.config.mjs`:** flip `ignoreBuildErrors` to `false`, and instead exclude the
   `app/test/**` pages from the production build. Shipping auth code that doesn't
   typecheck is not worth the convenience. If that turns out to be a large fix,
   scope it to its own task and record it here rather than silently leaving it `true`.
5. **Rate limiting** per Q8.
6. **Custom email templates.** The default Supabase confirmation email says
   "Supabase" and looks like phishing. Dashboard → Authentication → Email Templates.
7. **Final gate:** `npm run test:all` green, then run **B6** manually against
   production with a real address, end to end, including the reset flow from M3.

---

## Files touched (no two milestones edit the same file concurrently)

| File | Milestone |
|---|---|
| `supabase/migrations/20260828_baseline_profiles.sql` | M0 (new) |
| `supabase/migrations/20260828_profiles_autocreate.sql` | M1 (new) |
| `src/shared/safeRedirect.ts` | M2 (new) |
| `app/auth/confirm/route.ts` | M2 (new) |
| `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/page.tsx` | M3 (new) |
| `.env` — add `E2E_EMAIL_DOMAIN` | M5, see Q9 |
| `src/shared/safeFetchUrl.ts` | M6 (new) |
| `tests/e2e/helpers/adminUser.helper.ts` | M5 (new) |
| `app/auth/sign-up/page.tsx` | M1 (`required`), M2 (`emailRedirectTo`) |
| `app/auth/login/LoginPageClient.tsx` | M3 (link), M4 (dead code + banners) |
| `app/redirect/page.tsx` | M4 |
| `proxy.ts` | M4 (`next` param), then M6 (matcher + test-route rule) — **sequential, see P4** |
| `app/api/timetrack/calendar/route.ts`, `src/timetrack/calendarSyncService.ts` | M6 |
| `next.config.mjs`, `src/db/supabase.ts` | M7 |

---

# PART 5 — REVIEW PASS

A second pass attacked the first draft. What it changed, and what it could not fix.

## Changed (defects in the plan itself)

| # | Plan defect found | Fix applied |
|---|---|---|
| P1 | M3 said "exchange the recovery code the same way M2 does" — but M2's exchange is a **server route handler** and M3's page is a **client component**. An executing agent would have written a second, different code-exchange. | M3 now reuses `/auth/confirm?next=/auth/reset-password`. One exchange, one place. This is also *why* M2's route takes `next`. |
| P2 | M5 instructed the executing agent to stop and ask the user for an email domain mid-run. | Promoted to **Q9** with a recommendation, read from `E2E_EMAIL_DOMAIN`, throws if unset. |
| P3 | M0's acceptance test said "extract the column names" with no method — invites a flailing regex. | Replaced with a 4-step recipe including the exact regex and the exact reject-list. |
| P4 | M6 claimed it could run in parallel with M1–M5, but both M4 and M6 edit `proxy.ts`. | M6 now runs after M4; the SSRF half is explicitly split out as the parallel-safe part. |
| P5 | M6 told the executor to edit `calendarSyncService.ts` without knowing `fetchIcsFromUrl`'s signature. | Now says: read the file in full first. No assumed signature. |
| P6 | M6's SSRF fix implied hostname validation was complete. It isn't — DNS rebinding defeats it. | Residual risk now stated, and must be written into the code comment rather than papered over. |
| P7 | `src/db/supabase.ts` carries a comment saying cookie writes may be silently dropped. An executor reading it could conclude M2's route can't set a session. | M2 now explains that the caveat is Server-Component-only and route-handler writes succeed. |
| P8 | M3 said "reuse the mismatch check" — ambiguous between copy and extract. | Explicit: **copy the four lines, do not extract.** |

## DRY / YAGNI / SOLID audit

**DRY — where duplication was removed:**
- `safeNextPath()` (M2) replaces three hand-written `startsWith("/")` checks, two of
  which are live and both of which are wrong (`//evil.com` passes). Three copies of a
  security predicate is how one ends up wrong; this one already did.
- One code-exchange route serves both confirmation and password recovery (P1).
- `adminUser.helper.ts` (M5) keeps service-role calls out of individual specs.
- M6 gates 10 test routes with one edge rule instead of 10 file edits.

**DRY — where duplication was deliberately kept.** Flagged so a reviewer doesn't
"fix" them later:
- The password-mismatch check is copied, not extracted (P8). Four lines, two sites.
- `handle_new_user` copies `email` into `profiles`, duplicating `auth.users.email`.
  Kept because the column already exists; **not** synced by a second trigger (Q11) —
  that would be two writers for one fact.

**YAGNI — what was cut from scope, and why:**
- Wiring `requireAccess()` into 38 routes (Q1) — a pricing decision, not an
  onboarding one. Left dead rather than half-wired.
- The `/beta` claim UI (Q7) — worthless until Q1 is answered.
- Resend-confirmation button (Q10) — a broken button while B4 is outstanding.
- A hand-rolled rate limiter (Q8) — buy it at the edge first.
- Upgrading `proxy.ts` from `getSession()` to `getUser()` — adds a network round-trip
  per request for zero security gain, since RLS is the real boundary.
- A TS-side upsert as a safety net for M1's trigger — see SOLID below.

**SOLID — the one that actually bites here is single-responsibility:**
- **One writer per invariant.** Profile *creation* is the database trigger's job,
  alone. The plan explicitly forbids also adding an upsert in `profileService.ts`.
  Two writers would mean a broken trigger silently self-heals in TS and you never
  learn it's broken — the exact "silent fallback" the house rules ban.
- **One decider for post-auth destination.** `/redirect` owns "onboarding done or
  not". `/auth/confirm` doesn't duplicate that logic, it forwards (Q3).
- **Layer boundaries respected**, per `tests/unit/architecture.test.ts`: URL-safety
  predicates go in `src/shared/`, not inline in pages; `/auth/confirm` is a route
  handler under 50 lines; no DB access outside `src/db/*Repo.ts`.
- **Open/closed on the auth gate:** `requireAuth` / `requirePremium` / `requireAccess`
  already compose correctly. The plan adds no fourth variant.

## Is this executable by a smaller model without guessing?

Yes for M2–M7: every file is named, every new file has its full contents or an exact
recipe, every acceptance test names its assertions, and the two places that need
judgement (copy-vs-extract, read-before-edit) say so explicitly.

**No for M0 and M1** — and this is not fixable by writing more plan. Both transcribe
live database state that could not be read from here (B1, B2). An agent that runs M0
without B2's output will invent a `profiles` schema, and the invented one will be
wrong. **M0 and M1 must not start until B1 and B2 are answered.**

## Remaining blockers

| ID | Blocker | State |
|---|---|---|
| **B1** | `handle_new_user` trigger — exists or not? | ⛔ Open. Attempted twice; service-role REST blocked by the sandbox, not by Supabase. SQL provided. **Blocks M0, M1.** |
| **B2** | Live `profiles` DDL + write policies | ⛔ Open. Attempted; 6 of ~30 columns confirmed through RLS, rest unverified. SQL provided. **Blocks M0, M1.** |
| **B3** | Redirect URLs allow-listed in Supabase | ⛔ Open. Attempted; not exposed by `/auth/v1/settings`. Dashboard-only. **Blocks M7, and silently breaks M2 in prod.** |
| **B4** | Custom SMTP (built-in is 2 emails/hour) | ⛔ Open. Attempted; not exposed by the settings endpoint. **Blocks M7, Q10.** |
| **B5** | Approval for `profiles` write RLS policies | ⛔ Open — needs an explicit yes/no from you. The recommended design needs **no** user INSERT policy. |
| **B6** | Real end-to-end signup against the live project | ⛔ Deliberately not run: would create a live user that this sandbox cannot delete. Command provided. **Run after M2.** |

**No blocker was resolved by the review pass.** All six need you or a live SQL session.

## Remaining open questions

Q1–Q8 from the first draft, plus Q9–Q11 found in review. All eleven have a
recommendation; none blocks starting M2 if you accept the defaults. Q9 must be
answered before M5 runs. Q1 deliberately stays open — answering it is a separate plan.

## Known weak spots in this plan, stated rather than hidden

1. **M1's acceptance test is a shape test.** It greps the migration for
   `security definer` and `on conflict`. It cannot prove a profile row appears. Only
   B6 can. The plan says so at the point of use; do not let a green `npm test` be
   read as "signup works".
2. **Defect counts are from a static sweep.** "38 routes use `requireAuth`" comes
   from grep, not from exercising 94 routes. The 12 unauthenticated routes listed
   were each opened and read; the 38 were not.
3. **`tests/integration/schema.sql` is treated as a mirror, not truth.** M0's whole
   purpose is to stop relying on it. Until B2 lands, any claim about `profiles`
   columns beyond the 6 verified live ones is unverified.
