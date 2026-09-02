# Click-by-click guide to the four blockers

Written for someone who is not a programmer. Every step says what to click and
what you should see afterwards. If what you see does not match, stop and tell me
— do not carry on.

Do them in this order. B1 must come first; the others depend on the address it
gives you.

---

# B1 — Put the site on the internet (Vercel)

**Time:** ~15 minutes. **Cost:** free. **Reversible:** yes, delete the project.

Vercel is a company that takes your code from GitHub and runs it on a real web
address. Your code is already on GitHub at `reachjvc/Daygame_coach`, so there is
nothing to prepare.

### Step 1 — Make the account

1. Go to **vercel.com** → **Sign Up**.
2. Choose **Continue with GitHub**. Use the same GitHub account that owns
   `reachjvc/Daygame_coach`.
3. When it asks about a plan, choose **Hobby** (free). It will ask what you are
   building; anything is fine.

### Step 2 — Import the repository

1. On the Vercel dashboard, click **Add New...** → **Project**.
2. You should see a list of your GitHub repositories. Find
   **`Daygame_coach`** and click **Import**.
   - If you do not see it: click **Adjust GitHub App Permissions**, and grant
     Vercel access to that repository.
3. Vercel will detect **Next.js** automatically. Leave Framework Preset, Build
   Command and Output Directory exactly as they are. **Do not change them.**

### Step 3 — Add the settings the app needs (before deploying)

Still on the import screen, expand **Environment Variables**. You are copying
values out of your `.env.local` file. Add these, one at a time — name on the
left, value on the right:

**Required — the app will not work without these three:**

| Name | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, same name |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`, same name |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, same name |

**Required for the AI features (Ask Coach, the QA chat):**

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `.env.local`, same name |
| `AI_PROVIDER` | type exactly: `claude` |

**Required for links inside emails and pages to be correct:**

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Leave this out for now. You will add it in Step 5, once you know your address. |

**Add these only if you use those features:** `ADMIN_SECRET_KEY`,
`STRIPE_SECRET_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_EXERCISE_SHEET_ID`.

> ### Two things you must NOT copy over
>
> **Do not set `USE_CLAUDE_CODE`.** On your laptop this makes the app run the
> Claude Code command-line program. That program does not exist on Vercel's
> servers, so any feature using it will fail. Four files depend on it
> (`northStarGenerateService`, `claudeHeadless`, `keepitgoing/chat`,
> `keepitgoing/claudeCode`). Leaving it unset makes them use the normal API.
>
> **Do not set `OLLAMA_API_URL` or `OLLAMA_MODEL`.** Ollama runs on your own
> machine. Vercel cannot reach it.

> ### A security note, because it matters
> `SUPABASE_SERVICE_ROLE_KEY` is the master key to your database — it ignores
> every security rule we have set up. It is safe to put in Vercel because Vercel
> keeps it server-side only. It is **not** safe anywhere a browser can see it.
> The rule: a name starting with `NEXT_PUBLIC_` is visible to anyone using your
> site; a name without that prefix is not. Never rename the service key to start
> with `NEXT_PUBLIC_`.

### Step 4 — Deploy

1. Click **Deploy**.
2. Wait 2–4 minutes. You will see build logs scrolling.
3. **Expected:** a congratulations screen with a preview image of your site and
   an address like `daygame-coach-xyz123.vercel.app`.
4. **If the build fails:** copy the last 30 lines of the log and send them to me.
   Do not try to fix it by changing settings.

### Step 5 — Tell the app its own address

1. In Vercel: **Settings** → **Environment Variables** → add
   `NEXT_PUBLIC_APP_URL` = your full address including `https://`
   (for example `https://daygame-coach-xyz123.vercel.app`).
2. Go to **Deployments** → the top one → the **⋯** menu → **Redeploy**.
   Environment variables only take effect on a new build.

### Step 6 — Tell Supabase about the address

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. **Site URL:** change `http://localhost:3000` to your Vercel address.
3. **Redirect URLs:** click Add URL twice and add:
   - `https://<your-address>/auth/confirm`
   - `https://<your-address>/auth/reset-password`
4. **Leave the two `localhost:3000` entries in place.** They are what lets you
   keep testing on your own machine.

### How you know B1 worked

Open your Vercel address in a browser. Click **Sign up**. Fill the form. You
should land on the **"Check your email"** page.

The email itself will probably not arrive yet — that is B2. Getting to that page
is the pass condition.

---

# B2 — Make email actually work (Resend)

**Time:** ~10 minutes. **Cost:** free. **Reversible:** yes, switch SMTP back off.

Right now Supabase sends your confirmation emails from a shared address they
provide for testing. It is capped at **2 emails per hour for your whole project**
and mail from it often lands in spam. With 20 testers, 18 get nothing — and see
no error, so they will just think the app is broken.

"SMTP" is simply the standard way one program hands an email to a company that
delivers it. Resend is such a company.

### Step 1 — Resend account and key

1. Go to **resend.com** → **Sign up**. Free tier is 3,000 emails/month — far more
   than 20 testers need.
2. Confirm your email address when they send you one.
3. In the Resend dashboard → **API Keys** → **Create API Key**.
   - Name: `supabase`
   - Permission: **Sending access**
4. **Copy the key now.** It starts with `re_` and is shown only once.

### Step 2 — Sender address

Use Resend's shared sender to start: `onboarding@resend.dev`. It works
immediately with no setup.

Sending from your own address (`hello@yourdomain.com`) requires owning a domain
and adding DNS records. You do not have a domain yet — skip it. Revisit when you
buy one.

### Step 3 — Put it into Supabase

1. Supabase → **Project Settings** → **Authentication** → scroll to
   **SMTP Settings** → turn on **Enable Custom SMTP**.
2. Fill in exactly:

   | Field | Value |
   |---|---|
   | Sender email | `onboarding@resend.dev` |
   | Sender name | `DayGame Coach` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the `re_...` key from Step 1 |

3. Click **Save**.

### Step 4 — Raise the limit

Supabase keeps the old 2/hour cap even after you connect Resend.

1. **Authentication** → **Rate Limits**.
2. Find **Rate limit for sending emails**. Change `2` to `100`.
3. Save.

### How you know B2 worked

Sign up **three** accounts within one hour on your Vercel address, using three
addresses you can actually check. All three emails must arrive.

Three specifically — testing with two would pass even if you had changed nothing,
because two is the old limit.

Then click the link in one of them. You should land in the app, logged in, on the
onboarding questions. **That is the first end-to-end proof that signup works.**

---

# B3 — Apply the security migration

**Time:** 2 minutes. **Reversible:** yes, but you would have to ask me for the
undo statements.

This locks the three tables that are currently readable and writable by anyone
on the internet — including the 32,126 rows of coaching content.

1. Open `supabase/migrations/20260902_rls_remaining_tables.sql` in your editor.
2. Select all, copy.
3. Supabase dashboard → **SQL Editor** → **New query** → paste → **Run**.
4. **Expected:** "Success. No rows returned."

### How you know B3 worked

In your terminal, in the project folder:

```
npm run audit:rls
```

**Expected:** `OK: no table is left open to the internet.`

It currently says `FAIL: 3 table(s) are open to the internet.` If it still says
that after running the migration, the SQL did not apply — tell me.

---

# B4 — Let me create and delete test accounts

Nothing for you to click. This is a yes or no.

The signup test that would actually prove signup works has to create a real
account, confirm it, log in as it, and delete it — every time it runs. There is
no separate practice database; it would happen on your live project.

**What I would do:** create accounts named `e2e+<timestamp>@<a domain you own>`,
which are obviously not real people, and delete them at the end of every run
including when the test fails.

**The risk, honestly:** if a run crashes at the wrong moment, a leftover test
account sits in your user list until someone removes it. That is the whole
downside.

Answer yes or no, and if yes, tell me an email domain you own.

---

# What to do when something does not match

Send me:
1. Which step number you were on.
2. What you expected (this guide says it).
3. What you actually saw — the exact error text, or a screenshot.

Do not change settings to try to make an error go away. The most common cause of
a hard-to-find problem is a setting changed during troubleshooting and then
forgotten.
