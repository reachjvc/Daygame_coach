# Finding out when the app breaks

**Status:** plan, not started. Written 2026-09-05 against the working tree and the live database.
**Subject:** recording crashes in your own database, so a broken screen on somebody's phone reaches you
instead of dying with them.

---

## Part 1 — For you

### What happens today

Nothing. There is not a single error boundary in the app — checked, not assumed. When a page throws, the
person gets Next.js's default error screen, and no record of it exists anywhere: not in the database, not in a
log you would ever read. You find out when somebody tells you, or you never find out.

That is the whole gap. Everything below exists to close it.

### Why your own database rather than a service

You have no Sentry account and no key for one — checked, both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are
unset. Waiting for that decision means shipping blind in the meantime. Your own database can hold crash
reports today, and swapping in a service later is a few lines at one boundary, because everything goes through
one function.

### How it will work, in one paragraph

When something breaks, the browser sends a short description of it — what the error said, which line of code,
which page, which browser — to an address on your own server. The server writes it to a table only it can
touch. You read them from an admin page. Old ones delete themselves after thirty days. What is deliberately
never sent: anything you typed. A crash report should tell you the *shape* of a fault, not the contents of
somebody's afternoon.

### The seven phases

Each is a state you could stop at and still be better off than today.

| | Phase | What you get | Size |
|---|---|---|---|
| **P0** | Catch it | Crashes stop being invisible; a broken screen offers a way out instead of a dead end | half a day |
| **P1** | A place to put it | The table, reachable only by your server | 1 hour |
| **P2** | The road in | The endpoint, rate-limited, with everything private stripped out | half a day |
| **P3** | Never lose one | Reports survive being offline; a broken loop cannot write ten thousand rows | half a day |
| **P4** | Actually see them | An admin page, newest first, grouped by what broke | half a day |
| **P5** | Not growing forever | Old reports delete themselves; the table cannot fill the database | 1 hour |
| **P6** | Proof | A deliberate crash, and the row it produced | half a day |

---

## P0 — Catch it

Nothing else matters until something is listening. Three things throw, and all three are currently silent:

1. **A React screen that fails to render.** Caught by an error boundary. There are none.
2. **An error nobody caught** (`window.onerror`) — a click handler that throws, a script that fails.
3. **A promise nobody caught** (`unhandledrejection`) — a fetch that rejects with no `.catch`.

**Deliverables**
- `app/global-error.tsx` — the last resort when even the layout fails.
- `src/shared/components/ErrorBoundary.tsx` — a reusable boundary, wrapped around the tracker and each
  dashboard section, so one broken panel does not take the page with it.
- `src/shared/errorReportService.ts` — the single function everything reports through. **One boundary, so
  swapping to Sentry later is one file.**
- A visible recovery: "Something went wrong here. Try again" with a button that re-renders, not a blank screen.

**Acceptance test:** a component that throws on purpose renders the recovery UI rather than a white page, and
`reportError` was called once with the message and the component stack.

---

## P1 — A place to put it

**Migration `<ts>_error_reports.sql`.** One table:

| Column | Holds |
|---|---|
| `id` | uuid |
| `user_id` | who hit it, or null when signed out — a crash on the login page still matters |
| `fingerprint` | what makes two reports "the same fault": message + top stack frame, hashed |
| `message` | what the error said, scrubbed |
| `stack` | where it happened, scrubbed, first 4,000 characters |
| `component_stack` | which part of the screen, for React failures |
| `route` | the page path, never the query string — that is where tokens hide |
| `user_agent` | browser and version, for "only on Safari" faults |
| `release` | the build it happened on, so a fixed fault stops counting |
| `severity` | `error` or `warning` |
| `seen_count` | how many times this exact fault has happened |
| `first_seen_at` / `last_seen_at` | |

**Access, in plain words:** Row Level Security on, and **no policies at all**. That means only code holding
the server's secret key may read or write it — nobody with the public key from the browser can do either.
This is not a new invention: `waitlist_emails`, `plan_snapshots` and `beta_invites` already work exactly this
way, verified in the live database.

**Why not let the browser write directly:** it would need a policy allowing anyone to insert, and then anyone
who reads the public key out of your site could fill the table with junk — or with a million rows.

**Acceptance test:** `npm run audit:rls` still reports nothing open; a query using the public key returns
nothing for this table; a query using the server key works.

---

## P2 — The road in

**`app/api/errors/route.ts`**, under 50 lines, and it does four things:

1. **Strips anything private** before storing (`src/shared/errorScrubService.ts`, pure and tested):
   - query strings and hash fragments off every URL — a password-reset link is a credential
   - anything that looks like a token, key or email address
   - **the contents of what people typed.** A tracker error can carry an entry description. The shape of a
     fault is useful; "Lunch with Sarah" is not.
2. **Limits how often one caller may report** — 20 a minute, reusing the limiter the calendar endpoint uses.
   *Stated limitation, same as there: the count lives in one server's memory, so two servers mean twice the
   limit. It moves into Postgres the day a second one exists.*
3. **Merges repeats** rather than inserting again: same fingerprint, same release → bump `seen_count` and
   `last_seen_at`. One broken render loop writes one row, not ten thousand.
4. **Accepts reports from signed-out visitors**, with `user_id` null. A crash on the login page is exactly the
   one you never hear about otherwise.

**Acceptance tests:** a report containing `?token=abc`, an email address and a typed description comes back
with all three gone; the 21st report in a minute is refused; the same fault twice leaves one row with
`seen_count` 2.

---

## P3 — Never lose one

A crash often happens when the network is also unhappy, and a report that fails to send is a report you never
see.

**Deliverables:** the same pattern the tracker's sync already uses — hold unsent reports in the browser, retry
with a widening gap, and send them on the next visit. Capped at 50 held reports, because a phone that has been
offline for a week should not send a week of noise the moment it reconnects.

**Acceptance test:** with the network off, a crash is queued; when it comes back the report arrives, once.

---

## P4 — Actually see them

**`app/admin/errors/page.tsx`**, gated the way the existing admin pages are — an `X-Admin-Key` header checked
against `ADMIN_SECRET_KEY`, which is already set. Newest first, grouped by fingerprint, showing count, first
and last seen, browser spread, and the stack.

**Plus a one-line command** for when you are not at a browser:
`npx tsx scripts/list-errors.ts --since 24h`.

**Acceptance test:** a report made in P6 appears on the page within a minute, with its count.

---

## P5 — Not growing forever

Crash reports are the kind of table that quietly becomes the biggest thing in the database.

**Deliverables:** a nightly job deleting anything older than 30 days, and a hard cap of 10,000 rows (oldest
first) so a bad night cannot fill the disk. `pg_cron` is installed and ready — I enabled it while writing this
(version 1.6.4); it was available but switched off.

**Acceptance test:** insert a report dated 40 days ago, run the job by hand, watch it disappear.

---

## P6 — Proof

Not "the code looks right" — a real crash and the row it produced.

**Deliverables:** a deliberately broken page at `/test/crash` (dev only), and an end-to-end test that visits
it, waits, and asserts a row exists with the right fingerprint, no query string, and no typed text.

**Acceptance test:** that test, passing — and failing when the reporting call is commented out.

---

## Part 2 — Execution notes

### Files
- **P0** `app/global-error.tsx`, new `src/shared/components/ErrorBoundary.tsx`, new
  `src/shared/errorReportService.ts`, `src/timetrack/components/TogglLab.tsx` (wrap), `app/dashboard/*/page.tsx`
- **P1** new `supabase/migrations/<ts>_error_reports.sql`, new `src/db/errorReportRepo.ts`,
  `src/db/errorReportTypes.ts`, `scripts/audit-rls.ts` (add to the intentional list, with the reason)
- **P2** new `app/api/errors/route.ts`, new `src/shared/errorScrubService.ts`,
  `src/timetrack/rateLimitService.ts` (reused as-is)
- **P3** `src/shared/errorReportService.ts` (queue + retry)
- **P4** new `app/admin/errors/page.tsx`, new `app/api/admin/errors/route.ts`, new `scripts/list-errors.ts`
- **P5** the same migration as P1, or a follow-up if P1 has already been applied
- **P6** new `app/test/crash/page.tsx`, new `tests/e2e/error-reporting.spec.ts`, unit tests for scrubbing,
  fingerprinting and the queue

### Order
P0 and P1 are independent. P2 needs both. P3–P5 need P2. P6 last, and it is the only one that proves the rest.

### What this deliberately does not do
- No performance monitoring, no session replay, no breadcrumbs. Those are a product; this is a smoke alarm.
- No email or push alerts. Adding them once reports exist is small; guessing at thresholds before you have
  seen a single real report is how alerting gets ignored.
