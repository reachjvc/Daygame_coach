# Auth polish — UX, UI and bugs

Everything listed was measured against the live site or the live project on
2026-09-03, not guessed. Where something is unverified it says so.

The flow works end to end — signup, confirmation, login, password reset and
deletion are all verified in production. This plan is about the parts that work
but are unpleasant, and the edges nobody has walked.

---

# PART 1 — WHAT IS ACTUALLY WRONG

## Confirmed by measurement

| # | Problem | Evidence | Who it hits |
|---|---|---|---|
| **1** | **No `autocomplete` attributes anywhere.** All four auth pages, all inputs. | Read from the live page: `autocomplete: null` on `fullName`, `email`, `password`, `repeat-password` | **Everyone.** Password managers cannot offer to save or fill. On a phone this means typing a password by hand every time |
| **2** | No password length check before submitting | No `minLength` in signup or reset | Anyone who types a short password: full server round-trip to be told |
| **3** | Minimum password length is **6**, no character rules | Live config `password_min_length = 6`, `password_required_characters = None` | Everyone. "abcdef" is accepted |
| **4** | No show/hide password toggle | No such control in signup or login | Mobile users especially — no way to check what you typed |
| **5** | No "resend confirmation email" | `sign-up-success` has no resend | Anyone whose email is lost, delayed or spam-filed. Their only route is to sign up again, which now says "you already have an account" |
| **6** | No bot protection on signup | Live config `security_captcha_enabled = False` | You, when a bot finds the form |
| **7** | **A stale session cookie breaks the confirmation link** | Reproduced 2026-09-03: a browser holding a dead session got `confirm_failed`; clearing cookies fixed it | Anyone whose session expired oddly, or who was deleted and signed up again |
| **8** | Login shows the bare words "Email not confirmed" | Verified 2026-09-04: `error_code: email_not_confirmed` | Anyone who signs up, ignores the email, and tries to log in |

## Measured and fine — do not "fix" these

- **Mobile layout is already correct.** At 390px: no horizontal overflow, inputs
  are 16px (so iOS does not zoom on focus), inputs and buttons are 44px tall
  (Apple's minimum touch target). The auth pages do not need a redesign.
- Session handling: `jwt_exp` 3600 with refresh-token rotation on.
- Enumeration protection on password reset is correct and tested.

**The mobile risk is behaviour, not layout** — Safari's cookie handling, not
CSS. That is why P5 is a test project, not a stylesheet.

---

# PART 2 — PHASES

Each phase is independently shippable and has an acceptance test.

## P1 — Find out what the unconfirmed-login message says

**Half an hour, no code until you have looked.** Item 8 is the only one on the
list I have not verified, and the fix depends on what it actually does.

1. Sign up with a disposable address, do **not** click the email link.
2. Try to log in with those credentials.
3. Record the exact text shown.

**ANSWERED 2026-09-04.** Verified against the live project with an unconfirmed
account:

```json
{ "code": 400, "error_code": "email_not_confirmed", "msg": "Email not confirmed" }
```

The login page prints `error.message` raw, so the user sees exactly
**"Email not confirmed"** — accurate, and useless. It does not say to check the
inbox, does not mention spam, and offers no way to get the email again. P4(c) is
written against this string.

## P2 — Password managers (item 1)

The highest value change here, and the smallest. Four attributes.

| File | Field | Value |
|---|---|---|
| `app/auth/sign-up/page.tsx` | fullName | `autoComplete="name"` |
| | email | `autoComplete="email"` |
| | password | `autoComplete="new-password"` |
| | repeat-password | `autoComplete="new-password"` |
| `app/auth/login/LoginPageClient.tsx` | email | `autoComplete="username"` |
| | password | `autoComplete="current-password"` |
| `app/auth/forgot-password/page.tsx` | email | `autoComplete="email"` |
| `app/auth/reset-password/page.tsx` | both password fields | `autoComplete="new-password"` |

`username` on the login email is not a typo — it is the value password managers
look for to pair an address with a saved password.

**Acceptance test** (`tests/unit/auth/autocomplete.test.ts`): read the four page
files, assert each expected `autoComplete` value is present. A shape test, and
labelled as one — it proves the attribute exists, not that 1Password likes it.
Verifying that needs a human with a password manager, in P6.

## P3 — Password rules that are checked before submitting (items 2, 3)

**Two halves, and both are needed.** Raising the server minimum without a
client-side check means the user learns about it only after a round-trip.

1. **Server:** set `password_min_length` to `8` and require lowercase, uppercase
   and digits, via the Management API or Dashboard → Authentication → Policies.
   Existing accounts are unaffected; the rule applies on next password set.
2. **Client:** one shared validator, because signup and reset both need the same
   answer and must not drift.

   New file `src/shared/passwordRules.ts`:
   ```ts
   export const PASSWORD_MIN_LENGTH = 8
   /** Returns null when acceptable, otherwise the reason, in plain words. */
   export function checkPassword(value: string): string | null
   ```
   Rules, and the exact message for each:
   - shorter than 8 → `"Use at least 8 characters."`
   - no lowercase letter → `"Add a lowercase letter."`
   - no uppercase letter → `"Add a capital letter."`
   - no digit → `"Add a number."`

   Show the message live as the user types, not only on submit. Keep the submit
   button enabled — a disabled button with no explanation is worse than an error.

**Acceptance test** (`tests/unit/shared/passwordRules.test.ts`): a meaning test,
one case per rule, plus `"Xy3zzzzz"` passing. Assert the exact strings; the
wording is the feature.

## P4 — The three dead ends (items 5, 7, 8)

Each is a screen where a real person gets stuck with no way forward.

**a) Resend the confirmation email.** On `app/auth/sign-up-success/page.tsx`, a
"Didn't get it? Send it again" button calling
`supabase.auth.resend({ type: 'signup', email })`.
- The email must be carried over from signup. Pass it as
  `/auth/sign-up-success?email=<encoded>`; if the parameter is missing, show an
  email input instead of a button rather than failing.
- Supabase rate-limits resends. **Handle the 429 exactly as
  `forgot-password` already does** — say you already asked and to wait a minute.
  Do not invent a second pattern.

**b) A stale session must not break the confirmation link.** In
`app/auth/confirm/route.ts`, before exchanging the code, clear any existing
Supabase auth cookies on the response. The user is arriving from an email link
to establish a *new* session; whatever they were carrying is irrelevant and, as
reproduced, can break the exchange.

**c) Unconfirmed login.** Add to the `NOTICES` map in `LoginPageClient.tsx`,
keyed on whatever P1 finds: a message saying the address is not confirmed yet,
with a link to `/auth/sign-up-success?email=<what they typed>` so the resend
button from (a) is one click away.

**Acceptance tests** (`tests/e2e/password-reset.spec.ts`, which already covers
this area — do not create a new file):
- Resend shows the rate-limit message on a stubbed 429, and does **not** show a
  success message. Mirrors the existing forgot-password test.
- `/auth/confirm?code=x` with a junk `sb-...-auth-token` cookie set beforehand
  reaches `/auth/login?error=confirm_failed`, not a hang.

## P5 — Auth on phones and other browsers

**This is the one you asked me to keep reminding you about.**

Today: 10 mobile and cross-browser specs exist, and **none of them touch signup,
login or password reset.** `cross-browser/auth-flows.spec.ts` starts from an
already-signed-in state, so it tests session persistence, never getting a
session. The flow every tester meets first is untested on Safari and on phones.

Layout is fine (measured). The risk is Safari's Intelligent Tracking Prevention
and its stricter cookie rules — exactly the machinery the confirmation link
depends on, which has already broken three times on Chrome alone.

1. `playwright.config.ts`: add four projects reusing the existing device
   presets — `auth-iphone` (`iPhone 14`), `auth-android` (`Pixel 7`),
   `auth-firefox`, `auth-webkit` — each with
   `testMatch: [/signup-flow\.spec\.ts/, /password-reset\.spec\.ts/]` and **no
   `storageState`**, since these are logged-out flows.
2. Run them. Fix what breaks.

**Acceptance:** `npx playwright test --project=auth-webkit --project=auth-iphone`
passes.

**Honest limit:** this covers the pages, not the emailed round-trip, which needs
a live inbox. That stays P6.

## P6 — The human pass

Things no test can answer. Twenty minutes on a real phone.

1. Sign up on an actual iPhone or Android, in Safari or Chrome — not a
   simulator. Complete the email link. **Does your password manager offer to
   save the password?** That is the real test of P2.
2. Complete all five onboarding steps and reach the dashboard.
3. Reset your password on the phone.
4. Log out, log back in. Does the password manager fill it?

**Acceptance:** you can describe each step from memory, and any friction is
written down here.

---

# PART 3 — MANUAL BLOCKERS

Each attempted at least once. What the attempt showed is recorded.

### B1 — Password policy has to be raised in the Dashboard
**Blocks:** P3's server half.
**Attempted:** ✅ Yes. I can read the policy through the Management API
(`password_min_length = 6`, `password_required_characters = None`) and I
successfully wrote other auth settings today (site URL, redirect list, rate
limit, email templates). I did **not** write this one: it changes the rule for
every future password, including yours, and unlike a redirect URL a bad value
locks people out of their own accounts.
**You do:** Dashboard → Authentication → Policies → minimum length `8`, require
lowercase + uppercase + digits. Or say the word and I will apply it.
*Recommendation: 8 with those three classes. Not 12, and no symbol requirement —
on a phone keyboard that trades real signups for theoretical strength.*

### B2 — Turning on bot protection needs a captcha account
**Blocks:** item 6.
**Attempted:** ✅ Yes. Confirmed `security_captcha_enabled = False` live.
Enabling it needs an hCaptcha or Cloudflare Turnstile site key, which requires
signing up with those services — I cannot create that account.
*Recommendation: **skip it for the beta.** You are inviting twenty people you
know, and Supabase already rate-limits per address and per IP. Revisit before
the URL is public. Adding a captcha now costs you a signup step and buys nothing
at this size.*

### B3 — The password-manager check needs a real device
**Blocks:** P6 step 1, and therefore the real acceptance of P2.
**Attempted:** ✅ Yes, and it cannot be automated. Playwright reports the
attributes are absent, which is why P2 exists — but no browser automation can
tell you whether iOS Keychain or 1Password offers to save a password. That is a
human looking at a prompt.
*Recommendation: do it on your own phone during P6. Two minutes.*

### B4 — mail-tester's free tests are used up for today
**Blocks:** re-scoring the spam result after the template fix.
**Attempted:** ✅ Yes — four tests today (8/10, then 9/10 after two runs), then
it redirected me to a pricing page. The email template fix that should recover
`-0.635` went live afterwards and is **verified in the message body** but not
re-scored.
*Recommendation: run one test tomorrow at mail-tester.com — send a signup to the
address it gives you, then open the same URL. Expect 9 or 10.*

**No other blockers.** P1, P2, P4, P5 are code and need nothing from you.

---

# PART 4 — OPEN QUESTIONS

### Q1 — Should the minimum password be 8, or longer?
> **Recommendation: 8, with lowercase + uppercase + digit.** Long enough to stop
> "abcdef", short enough that people do not give up on a phone. Symbols look
> stronger and mostly produce forgotten passwords and abandoned signups.

### Q2 — Should the signup page keep asking for a name?
You restored it as required, and I agree with the reasoning — onboarding and the
dashboard greeting both expect one. But it is a third field before anyone has
seen the product.
> **Recommendation: keep it required, exactly as you decided.** Revisit only if
> you measure people dropping at signup. I raised this once already and was
> wrong to change it without asking; I am not relitigating it, only flagging
> that it is the field most likely to cost a signup.

### Q3 — Should a stale session be cleared on every auth page, or only `/auth/confirm`?
P4(b) clears cookies on the confirm route. The same stale session could
theoretically confuse the login page.
> **Recommendation: only `/auth/confirm`.** That is where it was actually
> reproduced. Clearing cookies on the login page would sign out anyone who
> visits `/auth/login` while already logged in, which is a worse bug than the one
> being fixed.

### Q4 — Show/hide password toggle: both pages, or just signup?
> **Recommendation: signup and reset-password, not login.** Those are where you
> type a password you have never typed before and cannot check. On login, a
> password manager fills it and a toggle mostly adds a shoulder-surfing risk.
> Costs one small component reused three times.

### Q5 — Should the resend button live on the success page, or the login page too?
> **Recommendation: success page only, for now.** P4(c) links the login page to
> it, so there is one implementation and one place to get right. Two resend
> buttons is two rate-limit handlers to keep in step.

### Q6 — Do you want a "stay signed in" option?
Sessions currently last an hour and refresh silently while the tab is open.
> **Recommendation: no.** Supabase's refresh-token rotation already keeps people
> signed in across visits. A checkbox implies a choice that does not currently
> change anything, which is worse than not offering it.

---

# PART 5 — REVIEW PASS

Written, then attacked, per `.claude/rules/finished-work.md`.

## Could a smaller model execute this?

**P2, P3, P5 — yes.** Exact files, exact attribute values, exact message
strings, exact config keys. Nothing to invent.

**P4 — mostly.** Two things it would otherwise guess, pinned here:
- The resend rate-limit handling must reuse the `error.status === 429` pattern
  already in `forgot-password/page.tsx`. Do not write a second one.
- The email for resend comes from `?email=` on the URL. If absent, render an
  input — never call `resend` with an empty string.

**P1 and P6 — no, and deliberately.** P1 is "go and look"; P6 is a human with a
phone. Neither should be handed to a model, and pretending otherwise is how the
unverified gets reported as done.

## DRY / YAGNI / SOLID

**DRY:** one `checkPassword()` shared by signup and reset, so the rules cannot
drift. One resend implementation, linked to from login rather than duplicated
(Q5). One rate-limit pattern, reused (P4a). The new Playwright projects reuse
the existing device presets and the existing specs — no new test files where an
existing one covers the area.

**YAGNI — cut:** captcha (B2), "stay signed in" (Q6), a login-page resend (Q5),
symbol requirements (Q1), any mobile CSS work (measured fine), a show/hide
toggle on login (Q4).

**SOLID:** `passwordRules.ts` decides validity and nothing else — it does not
render, and it does not know about Supabase. `/auth/confirm` keeps its single
job: turn a code into a session. The autocomplete change touches only markup.

## Where this plan is weak, stated

1. **P2's test is a shape test.** It proves an attribute string is in a file. It
   cannot prove a password manager behaves. B3 is the real test and it is manual.
2. **Item 8 is unverified.** The whole of P4(c) is written against an expectation
   of what Supabase returns. If P1 finds something else, P4(c) changes.
3. **P5 tests pages, not the email round-trip.** A Safari-specific failure in the
   emailed link would still slip through. Closing that needs a real device with a
   real inbox — P6.
4. **The stale-session bug (item 7) was reproduced once, by accident.** I have
   not established exactly which cookie state triggers it. P4(b) clears all auth
   cookies, which should cover it, but "should" is doing work in that sentence.

---

# PART 6 — SUGGESTED ORDER

**P2 first** (30 minutes, helps every user, zero risk), then **P1** (look), then
**P3**, **P4**, **P5**, **P6**.

If you only do one thing: **P2.** Four attributes, and it is the difference
between your testers typing a password on a phone keyboard every visit and their
phone filling it in.

**And the standing reminder: P5 and P6 are the mobile work, and they are still
not done.**
