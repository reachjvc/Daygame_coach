# Beta launch — getting to 20 testers

Goal: 20 people can sign up, use the app, and delete their account if they want.
Everything below was read from the live database on 2026-09-02.

---

# PART 1 — THE ORDER TO DO THINGS IN

You asked whether deploying today makes sense. **Yes, and it should be first.**
I told you the opposite last time and I was wrong. Here is why it goes first:

The confirmation email contains a link. That link has to point at a real web
address. Right now Supabase thinks your site lives at `http://localhost:3000`,
which only exists on your own laptop — so an email sent to a tester would contain
a link that does nothing on their machine. **You cannot test the signup flow
properly until the site has an address.** Everything else waits on that.

You do not need to buy a domain. Vercel gives you `something.vercel.app` free,
in about ten minutes, and it works for all of this.

| Phase | What it gives you | Blocked by |
|---|---|---|
| **P1** | The site has a real web address | you (Vercel signup) |
| **P2** | Emails actually arrive, more than 2 per hour | you (Resend signup) |
| **P3** | Three exposed tables get locked down | nothing |
| **P4** | Someone can delete their account | P3 |
| **P5** | A test that proves signup works end to end | P1, P2 |
| **P6** | 20 testers let in | P1–P5 |

Phases 3 and 4 are code and can happen while you do 1 and 2.

---

# PART 2 — WHAT "RLS" MEANS AND WHERE YOU STILL NEED IT

Your web pages talk to the database using a key that is **public** — anyone can
read it out of their browser in about five seconds. So the database cannot trust
the app to ask politely; it has to enforce the rules itself. Those rules are
called Row Level Security. A table without them is readable *and writable* by
anyone on the internet who has looked at that key.

I checked all 43 tables. **37 are correctly protected. 3 are wide open. 3 are
locked to server-only code on purpose.**

### The three that are open

| Table | What is in it | What someone could do today |
|---|---|---|
| `embeddings_test` | **32,126 rows of your coaching content** | Download your entire corpus. It is the material the QA chatbot answers from — arguably the most valuable thing you own. They could also insert junk into it and poison the answers. |
| `core_values` | 222 rows, a duplicate of the `values` table | Read it, and **edit or delete it**. Nothing in the app reads it, so the damage is latent rather than immediate. |
| `user_xp` | user_id, xp — **currently empty** | Nothing today, because there are no rows. But the moment anything writes to it, anyone can read and change anyone's score. |

`embeddings_test` is the one that actually matters. It is not a security hole in
the "someone steals a password" sense — it is your content sitting on a public
shelf.

### The three that look open but are not

`beta_invites`, `waitlist_emails` and `plan_snapshots` have security switched on
with no rules at all. That means **nobody** can reach them except server-side
code holding the secret key. That is deliberate and correct — verified that
`planSnapshotRepo` uses the admin client.

### So you do not have to trust me about this

Your friends' concern is fair: I only find what I happen to look for. So I turned
this check into a script you can run yourself, any time, forever:

```
npm run audit:rls
```

It asks the live database about every table and exits with an error if any of
them is open to the internet. Run it after you ever add a table. Right now it
fails, correctly, on those three. When P3 is done it will pass.

This is the honest answer to "you don't see what you don't see": I can't promise
to notice everything, so the check shouldn't depend on me noticing.

---

# PART 3 — PHASES

## P1 — Give the site a real address

1. Push this repo to GitHub if it isn't already.
2. vercel.com → New Project → import the repo.
3. Add three environment variables, copied from your `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Note the address it gives you.
5. In Supabase → Authentication → URL Configuration:
   - Site URL: change from `http://localhost:3000` to your new address.
   - Redirect URLs: add `https://<your-address>/auth/confirm` and
     `https://<your-address>/auth/reset-password`.
     (The two `localhost` ones you added today stay — they are what lets you keep
     testing on your own machine.)

**Acceptance:** open the deployed site, click Sign up, and reach the "check your
email" page. The email itself will not work yet — that is P2.

## P2 — Make email actually work

Today Supabase sends your confirmation emails from a shared free address. It is
capped at **2 emails per hour for the whole project** and is explicitly not for
real use — mail from it frequently lands in spam. With 20 testers signing up in
an evening, 18 of them get nothing and see no error.

"SMTP" is just the standard way software hands an email to a company that
delivers it. You sign up with such a company and paste four values into Supabase.

1. resend.com → sign up (free tier is far more than 20 testers).
2. You can send from their shared `onboarding@resend.dev` sender to start.
   Using your own domain needs DNS records, which you do not have yet — skip it.
3. Supabase → Project Settings → Authentication → SMTP Settings → enable, then:
   - Host `smtp.resend.com`, Port `465`, Username `resend`,
     Password = your Resend API key, Sender = the address from step 2.
4. Raise the rate limit: Authentication → Rate Limits → emails per hour, from
   `2` to something like `100`.

**Acceptance:** sign up three accounts within one hour on the deployed site and
receive all three emails. Three, specifically — two would pass even if nothing
changed.

## P3 — Close the three open tables

**What can go wrong from applying this? Almost nothing — and here is the check
rather than the reassurance.** Before writing the migration I traced every reader
of all three tables:

| Table | Every reader | Breaks if locked? |
|---|---|---|
| `embeddings_test` | all 7 functions in `src/db/embeddingsTestRepo.ts`, every one using `createAdminSupabaseClient()` — the secret key, which ignores these rules by design. `src/qa/retrieval.ts` imports from `@/src/db/server`, so search runs on the server. | **No.** No browser ever queries it. |
| `core_values` | **nothing.** Zero references in `src/`, `app/` or `scripts/`. The app reads the separate `values` table. | **No.** |
| `user_xp` | **nothing.** Zero references anywhere. | **No.** |

Because nothing reads them with a user's key, the right setting is the tightest
one: security on, **no rule at all** — meaning only server-side code with the
secret key may touch them. That is the same pattern `beta_invites`,
`waitlist_emails` and `plan_snapshots` already use here.

**I changed my own answer here.** The first draft of this migration gave each
table a "signed-in users may read" rule. That was inventing a reader that does
not exist — a weaker lock, for nobody. Corrected.

Migration: `supabase/migrations/20260902_rls_remaining_tables.sql`.

**Acceptance:** `npm run audit:rls` exits clean, and `npm test` still passes.

### The architecture thing you were right to worry about

You guessed the risk was not the lock itself but something structural. It was.
While tracing readers I found this:

- `values` — 222 rows, columns `(id, category)`. **The app reads this one.**
- `core_values` — 222 rows, columns `(id, category)`. **221 of the 222 ids are
  identical.** Nothing reads it.
- `user_values` — 4 rows. Its foreign key points at **`core_values`**, the table
  the app does not read.

So you have the same list twice under two names, and the table recording what
users picked is attached to the copy nobody uses. That is a real defect, it
predates everything I have done, and locking the tables does not fix it — it
just stops it being publicly editable while you decide. See Q1.

## P4 — Delete my account

Where: Settings page, a clearly separated "Danger zone" at the bottom. That is
where users expect it and where it is hardest to hit by accident.

**How deletion works underneath.** Every one of your 42 user-data tables is wired
to the account with "when the account goes, this goes too" (I verified all 42).
So deleting the one account row removes everything automatically — sessions,
goals, approaches, reviews, workouts, the profile, all of it.

**Two tables are not wired up and would be left behind:**
`user_values` (which values a person picked) and `user_xp`. `user_values` links
to the values list but not to the person's account; `user_xp` links to nothing at
all. The migration in P4 adds the missing links so they are cleaned up too.

Files:

| File | What it does |
|---|---|
| `supabase/migrations/20260902_orphan_cleanup_fks.sql` | Adds the missing account links to `user_values` and `user_xp`, after deleting any rows already orphaned |
| `app/api/account/route.ts` | `DELETE` — requires login, deletes **only** the calling user's own account using the admin key |
| `src/settings/components/DangerZone.tsx` | The UI: a red-bordered section, a Delete button, a dialog that requires typing the account's email address before the button enables |
| `src/settings/actions.ts` | Sign the user out and send them to `/` afterwards |

**Rules this must follow, none of them optional:**
- The API route takes **no user id parameter**. It reads the id from the session
  only. A route that accepts an id is a route that deletes other people's
  accounts.
- Typing the email to confirm — not a plain "are you sure". This is permanent and
  instant.
- Say plainly in the dialog what goes: every session, approach, goal, review and
  workout, permanently, with no way back.
- No soft-delete flag. If the button says delete, the data is gone.

**Acceptance test** (`tests/e2e/account-deletion.spec.ts`): create a throwaway
account through the admin API, give it one goal, delete it through the UI, then
assert the auth account is gone AND the goal row is gone. The second half is the
point — it is what proves the cascade worked.

## P5 — A signup test that actually proves something

**My current test is weak and I oversold it.** I called it "the regression guard
for the defect that broke every real signup". It is not. It intercepts the
network call and checks one setting in a URL. It would pass if Supabase rejected
the signup, if no email were sent, if `/auth/confirm` were deleted.

The replacement (`tests/e2e/signup-live.spec.ts`) does the real thing:

1. Submit the actual signup form with a unique address, no interception.
2. Using the secret key, find the new account and confirm its email through the
   admin API — this stands in for clicking the link, and sends no mail.
3. Assert a profile row exists **and carries the name that was typed**.
4. Log in as the new account, assert it lands on onboarding — not a login loop.
5. Delete the account afterwards, always, even if the test fails.

**Why it needs P1 and P2:** step 1 makes Supabase send a real email. Against the
current 2-per-hour shared sender the third test run of the day fails for reasons
that have nothing to do with the code.

**Critically:** this test creates and destroys a real account on your live
project every run. There is no separate test database. That is a genuine
downside and the reason it must be tagged so it does not run by accident.

## P6 — Let the testers in

`beta_invites` and `claim_beta_slot()` already exist and are well built, but
nothing in the app uses them and there is no page to enter a code on. See the
open question about whether you want a gate at all.

---

# PART 3B — WHAT TO DO WITH PROTOTYPE LEFTOVERS

You said `user_values`, `user_xp` and friends are artifacts of prototypes that you
may or may not revive — values in particular might be redone under Life Mastery
rather than Inner Game. That is the right thing to be unsure about, and "decide
the future of every table before launching" is not a reasonable bar.

So the rule is: **undecided means locked, not deleted.**

| State | What to do | Why |
|---|---|---|
| App code reads it | RLS on, own-row rules | Normal |
| Nothing reads it, might revive | **RLS on, no rules at all** | Server-only. Data preserved, decision preserved, exposure zero |
| Nothing reads it, definitely dead | Drop it | Only when you are sure |

This is why P3 locks rather than drops. Locking is reversible in one line;
dropping is not reversible at all. A table sitting behind a lock costs you
nothing and prejudges nothing.

**The one thing you must not do is leave it open "for now".** That is what
happened with `embeddings_test`: a prototype table nobody thought about, holding
32,126 rows of your content, readable by anyone. It was not a decision — it was
an absence of one, and it lasted months.

`npm run audit:rls` is what stops that recurring: a table added in a prototype
and forgotten now fails a check instead of sitting quietly.

Current leftovers, for the record: `user_xp` (0 rows), `life_areas` (0 rows,
already protected), `core_values` (222 rows, duplicate of `values`),
`embeddings_test` (32,126 rows, actively used server-side — not a leftover).

---

# PART 4 — BEING CRITICAL ABOUT MY OWN WORK

- **I made product decisions that were not mine to make.** I made the name field
  optional based on my opinion that mandatory names cost signups. You have an
  onboarding flow built around having a name. Reverted. I should have asked, and
  from here on anything that changes what a user sees gets asked first.
- **My "critical" ranking was miscalibrated to your situation.** I led three
  replies with the premium bypass. Real, worth fixing — but all four accounts
  already had premium, so nobody could have used it. Meanwhile your entire
  content corpus has been publicly downloadable the whole time and I did not
  check for it until you asked. **You asked the better question than I did.**
- **I removed account deletion silently.** I took it away in the security
  migration for a good reason and mentioned it only afterwards. It is now a
  planned feature, which is where it should have started.
- **My first plan was 787 lines and partly fiction.** I wrote it before I had
  database access, and two of its headline "verified blockers" did not exist. The
  access token was on this machine the entire time.
- **The audit script has a real limit.** It checks whether a table has rules at
  all. It does **not** check whether those rules are correct — a table with a
  rule saying "everyone can read everything" passes. Reading all 37 rule sets
  properly is a separate job I have not done.
- **I have still never watched a real signup work.** Everything I have said about
  the flow comes from reading code and querying the database. Until P5 runs on a
  deployed site, "signup works" is an informed belief, not an observation.

---

# PART 5 — BLOCKERS

Each was attempted at least once. What the attempt showed is recorded.

### B1 — Deploy to Vercel and tell me the address
**Blocks:** P2 acceptance, P5 entirely, and any real signup.
**Attempted:** ✅ Yes. `vercel` CLI is not installed and there is no `.vercel`
link in the repo, so I cannot deploy on your behalf — it needs a browser login to
your Vercel account. **Useful result: your GitHub remote already exists**
(`git@github.com:reachjvc/Daygame_coach.git`), so step 1 of P1 is done and the
Vercel import will find the repo immediately.
**You do:** vercel.com → New Project → import `reachjvc/Daygame_coach` → add the
three environment variables from P1 → deploy → paste me the address.
*Recommendation: today. Free, reversible, and everything else queues behind it.*

### B2 — Resend account and API key
**Blocks:** P2, and P5's reliability.
**Attempted:** ✅ Yes. Read your live auth config through the Management API:
`smtp_host` is `null` and `rate_limit_email_sent` is `2`, confirming you are on
the shared sender at 2 emails/hour. I cannot create a Resend account for you —
it needs an email confirmation on their side.
*Recommendation: do it with B1. Ten minutes, and it is the difference between
"signup looks right" and "I watched twenty people sign up".*

### B3 — Apply `20260902_rls_remaining_tables.sql`
**Blocks:** P4 (deletion touches the same tables), and `npm run audit:rls` passing.
**Attempted:** ✅ Yes, four times across this session. Every write to your
Supabase project — the database SQL endpoint and the auth-config endpoint alike —
is refused by the Claude Code permission classifier. Reads work, which is how
every finding here was verified. You applied the previous migration manually and
that worked.
**You do:** paste the file into the Supabase SQL Editor.
*Recommendation: apply it. Traced every reader first (P3 table); nothing in the
app reads these three with a user's key, so nothing breaks. If you would rather I
did it, add a Bash permission rule for `curl` to `api.supabase.com`.*

### B4 — May I create and delete real accounts on the live project?
**Blocks:** P5's honest version.
**Attempted:** ✅ Yes — and deliberately stopped. I could create one through the
admin API, but the delete call is blocked by the same classifier as B3, so I
would be leaving accounts behind with no way to clean up. I did not want to
litter your user list.
*Recommendation: yes, with `e2e+<timestamp>@<domain-you-own>` addresses and
cleanup that runs even when the test fails. There is no separate test database,
so this is the only way to prove signup works.*

**No other blockers.** P3, P4 and P6 are code and need nothing from you.

---

# PART 6 — OPEN QUESTIONS

### Q1 — `values` and `core_values` are the same list twice. Which one survives?
222 rows each, identical columns, 221 shared ids. The app reads `values`.
`user_values` — the record of what people picked — points at `core_values`. So
the live feature and the stored answers are attached to different tables.
> **Recommendation: keep `values`, repoint `user_values.value_id` at it, drop
> `core_values`.** All 4 existing `user_values` rows already resolve against
> `values` (checked), so the repoint loses nothing. **But do this only after you
> decide the Life Mastery values direction** — if values are being redesigned,
> consolidating first means doing the migration twice. Locking `core_values` in
> P3 costs nothing and holds the position until then.

### Q2 — `user_xp`: drop it, or keep it locked?
Empty, referenced nowhere, duplicates `profiles.xp` which is what the app reads.
> **Recommendation: keep it locked for now, drop it when you next touch XP.**
> I originally recommended dropping it. I have changed that: you told me these
> prototype tables may get revived, and locking is reversible while dropping is
> not. It costs nothing to leave a locked empty table sitting there.

### Q3 — Should the 20 beta testers need an invite code?
`beta_invites` and `claim_beta_slot()` exist and are well built. No page uses them.
> **Recommendation: no code for the first 20.** You are hand-picking them. A code
> page is another surface to build, test and debug before launch. Revisit if the
> address leaks.

### Q4 — Should deleting an account require an emailed confirmation link?
Prevents deletion by someone using an unlocked laptop.
> **Recommendation: no.** Typing the account's email address is enough friction
> at this size, and an email step depends on B2 being reliable first.

### Q5 — What happens to `life_areas` (0 rows, already protected)?
Another prototype leftover, but this one already has correct rules.
> **Recommendation: leave it entirely alone.** It is protected and empty. It
> costs nothing and it is plainly part of the goals/Life Mastery direction.

### Q6 — Should the corpus move behind a server API before beta?
`embeddings_test` retrieval already runs server-side, so P3 fully protects it.
The sibling `embeddings` table lets any signed-in user read all rows.
> **Recommendation: not before beta.** Your 20 testers are hand-picked people you
> know. Revisit before any public launch, when "any signed-in user" stops meaning
> "someone I invited".

---

# PART 7 — REVIEW PASS ON THIS PLAN

Written, then attacked, per `.claude/rules/finished-work.md`.

## Could a smaller model execute this without guessing?

**P1, P2, P6 — yes.** Numbered click-paths, exact values (`smtp.resend.com`, port
`465`, username `resend`), named settings pages.

**P3 — yes.** The migration is written and its acceptance test is a command.

**P4 — mostly.** Two things a smaller model would have to invent, so they are
pinned here explicitly:
- The confirmation dialog copy. Use exactly: *"This deletes your account and
  everything in it — every session, approach, goal, review and workout.
  This cannot be undone. Type your email address to confirm."*
- Which key deletes the account: `createAdminSupabaseClient()`, and the user id
  comes from `requireAuth()`, never from the request body. A route that accepts
  an id is a route that deletes other people's accounts.

**P5 — no, not until B4 is answered.** The test cannot be written without knowing
which email domain to use and whether live accounts may be created.

## DRY / YAGNI / SOLID

**DRY — duplication removed:** P3 reuses the existing "RLS on, no policies"
pattern rather than inventing a fourth access shape. P4 reuses `requireAuth()`
and the existing settings page rather than a new auth path. The account-deletion
cascade is declared once in the database, not re-implemented as a delete-all
routine in TypeScript.

**DRY — duplication found but NOT fixed here:** `values` / `core_values` (Q1).
Flagged, held, deliberately not consolidated mid-launch-prep.

**YAGNI — cut:** the invite-code page (Q3), the emailed deletion confirmation
(Q4), moving the corpus behind an API (Q6), consolidating the values tables (Q1),
dropping `user_xp` (Q2). Also cut from my own first draft: the per-table read
policies in P3, which served no reader.

**SOLID — the one that matters is single responsibility:**
- Deletion has exactly one authority: the database cascade. TypeScript asks for
  one row to go and the other 42 tables follow. No second cleanup routine to
  drift out of sync.
- Profile creation still has exactly one writer, the trigger.
- `audit-rls.ts` checks exposure and nothing else — it does not also try to fix,
  which is why it is safe to run in CI.

## Where this plan is still weak — stated, not hidden

1. **`npm run audit:rls` checks that rules exist, not that they are right.** A
   table with a rule saying "everyone reads everything" passes. I have not read
   all 37 rule sets line by line. That is a separate job and it is not in this
   plan.
2. **I have still never watched a real signup succeed.** Every claim about the
   flow comes from reading code and querying the database. Until P5 runs against
   a deployed site, "signup works" is an informed belief.
3. **P4's acceptance test does not exist yet.** It is specified, not written —
   because writing it needs B4 answered.
4. **Nothing here has had an adversarial security review.** The repo rule says
   RLS/auth work gets `security-review`; that has not been run on the auth code I
   wrote in earlier phases.
