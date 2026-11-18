# First $1,000: content, a quit offer, and the quit tool

Written 2026-11-18 from a strategy session with the owner (private notes:
`~/.cache/daygame-research/hormozi-persona/session-log.md`). Status: **A1–A6 approved 2026-11-18; Phase 0 running.** Phase 0 kit (messages, log, terms line, Instagram checklist): `~/.cache/daygame-research/first-1000/phase0-kit.md`.
Deadline: **$1,000 collected by Monday 1 February 2027.**

## What was decided in the session

- **Goal:** $1,000 total by 1 Feb 2027. Runway is about 5–6 months of money, so 1 Feb is also the first
  checkpoint on whether this path earns.
- **Topic for the next six months: quitting.** One avatar: a man who wants to quit nicotine (cigarettes,
  vapes, snus/pouches). Daygame and the life half are frozen, not deleted. They come back later as "what
  next" for men who have already quit and trust the brand.
- **Channel: content.** He has more time than money, so content comes before ads. One home platform.
- **The first money comes from selling his time.** A 30-day quit with him, found through the content. It is
  how he learns what the product must be, and it pays while the tool is built.
- **The real product is built only from what clients actually hit.** The build is `Plans/quit-tool.md`,
  re-ordered here so the free nicotine tools are live before New Year.
- **4 hours a day, 6 days a week, in a fixed block.** Order: content first, then messages and clients, then
  everything else. He agreed to this.
- **The one number to watch:** new DM conversations per day.

## The math

- Five paid clients at $200 makes $1,000. Pilots are free or cheap (5 spots), then $200 with a guarantee.
- Content-only is too slow for this date. Getting 50 paid months of a $20 app from zero followers in ten
  weeks would take something like 50,000 engaged viewers. Coaching carries the first $1,000, and the content
  builds the audience the app sells to later.
- **New Year is the lever.** 1 January is the biggest quit date of the year. A "Quit in January" group
  starts **Monday 4 January**, sold from 15 December, with 10 spots (his real capacity).

## OWNER-ONLY: one ask — ANSWERED 2026-11-18: "yes all of these are fine" (A1–A6 as recommended)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A1 | Does his Instagram show his face and his own quit story? (`quit-tool.md` says the TOOL speaks in the brand's voice, and that stays.) | **Yes.** His face and his own story on Instagram; the tool keeps the brand voice. | Proof sells. A faceless account with zero followers has nothing to trust. Going public is hard to undo, so it is his call. |
| A2 | Coaching price | Pilot: 5 spots free (or $25). Paid: **$200 for 30 days**. "If you're not nicotine-free in 30 days, I keep working with you free until you are." Raise about 20% every 5 paid clients. | Cheap enough for an impulse yes. The guarantee costs only his time. |
| A3 | How money is taken (`quit-tool.md` said no payment system) | **A Stripe Payment Link** for the coaching. No code, no monthly fee, only Stripe's per-payment fee (pricing page to be checked when he opens it). He logs in and makes it himself. | Without it, nobody can pay. The Stripe account already exists: `src/home/products.ts` holds its price IDs. |
| A4 | Handle and name | Instagram **under his own name** now. The product name for the `/quit` pages comes from one naming round (method in memory), decided by **8 Dec**. | The name must not block the first post. |
| A5 | Domain | Free `*.vercel.app` alias until the name is chosen. Then buy the `.com` (about $10–15/yr, his money, his click). | A bio link reading `daygame-coach…` puts off a man who wants to quit nicotine. |
| A6 | Small kit | A phone tripod (about 100–200 DKK) and window light. Optional; a stack of books works. | First posts look better. Not required. |

## BLOCKERS (each tried once, 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Live home page `/` errors | curl with a phone browser agent: `/` → **500**, `/auth/login` 200, healthz ok (build b70788dd). Agent: the server-side HTML render of the client tree fails ON VERCEL ONLY. Locally a dev build and a prod `--webpack` build both give 200. The `vercel` CLI is logged out, so the real exception can't be read yet | Bio link, sales | Owner runs `npx vercel login` once (or opens the function log for `/` in the dashboard). Then read the exception and fix it. Must be fixed before Phase 1 |
| B2 | Nobody can pay | `src/home/components/Checkout.tsx` says "Payments/Stripe are not migrated…". No webhook writes `has_purchased` | Phase 3 sales | A3: a Payment Link for coaching. The app subscription waits |
| B3 | Instagram account | Not attempted: only he can create it (his phone, his email, 2FA) | Phase 1 | Phase 0 checklist below |
| B4 | Handle availability | Not checked: checking means sending his name to Instagram | Phase 0 | He checks in the app while signing up (10 seconds) |
| B5 | `/quit` pages are not public | `src/shared/routes.ts` `isPublicPage` allows only `/`, `/auth`, `/test` (also `quit-tool.md` B1) | Free tools | `quit-tool.md` Phase 3 adds `/quit` |
| B6 | Danish tax and VAT | Searched: VAT registration only above **50,000 DKK** turnover in 12 months. A sole trader's CVR is free on virk.dk. These come from third-party guides, not Skattestyrelsen | Phase 3 | Report the first income as B-income in TastSelv. Register a CVR (free) if Stripe asks for a business. He checks skat.dk once |
| B7 | DM limits on a new account | Instagram publishes no number. Third-party estimates for new accounts are 20–50 a day | Phase 1–2 | Cap at **30 DMs a day** for the first 3 weeks. Write each one, never paste copies |
| B8 | Health data | Coaching intake collects what he uses and how much. Under GDPR that is health data, and no privacy page exists (`quit-tool.md` B9) | Phase 2 | Ask only what's needed, in DMs. The privacy page from `quit-tool.md` Phase 7 is pulled forward |
| B9 | EU 14-day right to cancel | Online services sold to EU consumers come with a cancellation right. Rules not yet read in full | Phase 3 | One plain terms line next to the Payment Link. Claude drafts it from the official EU page before the first sale |

## PHASES

### Phase 0: setup (Wed 19 – Fri 21 Nov, about 10 hours)

He does:
1. Answer A1–A6 in one message.
2. Instagram: create the account under his own name, switch to a professional (creator) account, turn on
   two-factor, add a profile photo (plain, face visible, daylight). Bio: one line saying who it's for and
   what he did, plus "Comment QUIT on any post". Link: the free alias for now. **About 1.5 h.**
3. Warm the account: follow 50 accounts in the quit/health niche and leave 10 real comments a day, from day
   one. That counts toward the 100 actions.
4. Study session, **2 h**: watch the 30 Reels Claude lists, and mark the 5 hooks he could say as himself.
5. Install a free editor (Instagram Edits or CapCut), then make one 15-second test clip and throw it away.
   **About 1 h of learning.**
6. If A3 is yes: log into Stripe and make the coaching Payment Link. **About 30 min.** Check skat.dk (B6).

Claude does, in parallel:
- Research the 30 best-performing quit-nicotine Reels and accounts: hook, length, format, call to action.
  This stands in for testing on real people, so it studies peers.
- Draft the first 10 scripts from his own story and his five steps. He rewrites them in his own words.
- DM templates: a reply to "QUIT", the pilot offer, the referral ask, the daily check-in, the day-30 review ask.
- A daily log: five numbers (posts, comments made, DMs started, calls, clients and money), on his phone.
- B1 fixed and deployed.

Done when: the account exists, the first 3 scripts are rewritten, the editor is installed, and the owner
decisions are answered.

### Phase 1: first posts (Sat 22 – Sun 30 Nov)

- **Post 1 takes 4–6 hours:** script, ten takes, editing, captions. That's normal and it's budgeted. Posts 2–3
  take about 3 hours each, and by post 5 aim for about 90 minutes.
- Pace: posts 1–3 one every other day. From Thursday 27 Nov, one a day.
- Batch filming: Sunday films 3–4 posts, weekdays edit and post.
- Every post ends: "Comment QUIT and I'll send you my plan." He answers every comment and DMs everyone who
  comments, up to the cap.
- **Pilot offer goes out from post 3:** 5 spots, free or $25, in return for doing it, honest feedback, and a
  review if it deserves one.
- Expect low views for the first 10–20 posts. Judge hooks by comments and DMs, not views.

Done when: 7 posts are up, 10 DM conversations have started, and at least 1 pilot client has begun.

### Phase 2: daily rhythm and pilots (Mon 1 – Mon 14 Dec)

- One post a day and 100 minutes a day of content work.
- Pilots: a 20-minute start call (Instagram or WhatsApp video), then a daily check-in by text. Budget 10–15
  minutes per client per day, and no more than 8 clients at once.
- Log every problem a client hits, with the day number. That log is the spec for the product.
- Every Monday, 30 minutes: change one thing per week (the hook, the first 3 seconds, the call to action) and
  keep the rest.
- Claude builds `quit-tool.md` Phases 1–5 for nicotine: data file, start page, belief test, quit curve,
  craving now, all public. Each week it adds what the pilots tripped on. The owner tests on his phone for 20
  minutes a day.
- Naming round by 8 Dec (A4/A5).

Gate on 10 Dec: fewer than 10 DM conversations in total means changing the hooks, not the plan.

Done when: 5 pilots have started, there are 14+ posts, and the log has 20+ client problems.

### Phase 3: sell January (Tue 15 Dec – Sun 3 Jan)

- From 15 Dec, posts lead to the **"Quit in January"** group: starts Monday 4 Jan, 30 days, 10 spots, $200,
  with the guarantee, paid through the Payment Link. Real spots, a real deadline, no fake countdowns.
- Pilots who finish get the review ask on day 30, plus "who do you know who wants to quit?"
- Holidays (24–26 Dec, 31 Dec–1 Jan): film 6–8 posts beforehand and schedule them. Messages still get
  answered daily, even if only for 30 minutes.
- Claude ships the nicotine tools by **20 Dec** (`quit-tool.md` Phase 8 checks, minus the program) so New
  Year quitters can use them. The program follows later.

Done when: 5 or more paid spots are sold, which is $1,000. Collected if paid upfront.

### Phase 4: deliver and decide (Mon 4 Jan – Mon 1 Feb)

- Deliver the January group. Keep posting daily. Selling continues on a rolling basis: a February group
  starts 1 Feb.
- Capture proof with consent: day counts, before and after, short quotes.
- **1 Feb review, about 1 hour:** money collected, DMs a day, posts, client results, and what the problem log
  says the app must do. Then decide months 3–5. Options include more of what worked, raising the price, the
  app subscription with a working checkout, and a second avatar. That's a new plan, written from this
  review.

## Daily 4-hour block (6 days a week, fixed start time he picks)

| Minutes | What |
|---|---|
| 100 | Content: script, film, edit, post (batch on Sundays) |
| 60 | Comments and DMs: answer everyone, start new conversations (cap 30 new DMs/day for 3 weeks) |
| 60 | Clients: check-ins and calls (before clients, use it to comment on 20 posts in the niche) |
| 20 | Test the quit tool on his phone and log what's wrong |

Code never comes before the day's post and messages. Daygame, his own coding practice and the rest of life
sit outside the block.

## Things easy to forget (checked off as they're done)

Instagram professional account and 2FA · profile photo · bio + link · account warm-up · DM cap · editor app ·
first-post time · Christmas pre-filming · Payment Link · terms line (14-day cancellation) · privacy page ·
consent before using a client's words or numbers · B-income/CVR at skat.dk · product name + domain by 8 Dec ·
the home page error (B1) · a weekly 30-minute review · what to do if he slips himself (say so, keep going;
honesty is the brand) · `quit-tool.md`'s own decisions (no founder story in the tool, prices only from him)
are kept.
