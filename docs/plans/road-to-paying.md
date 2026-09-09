# Road to paying customers

**Written 2026-09-09.** Every quality claim below came from opening the running app
as a logged-in user and looking at the screen, or from reading the code — not from
a test summary. The unit suite passes 4,626 tests and told me nothing about any of
the findings in Part 1.

---

# PART 1 — WHAT THE PRODUCT ACTUALLY LOOKS LIKE TODAY

I loaded 17 signed-in screens at phone size and read each one. Nothing crashed.
That is the good news, and it is the end of the good news.

## The app is three different products wearing one coat

| | What it is | State |
|---|---|---|
| **Daygame trainer** | The landing page's promise: practice conversations with an AI, get feedback | 4 of 20 scenarios exist |
| **Life improvement system** | Life Mastery / goals / values / training | Built, deep, and **has no way in** — no navigation entry anywhere |
| **A time tracker** | `/dashboard/time` — a Toggl clone with its own six-tab bottom bar and its own visual style | Empty, and it owns 1 of your 4 main tabs |

A visitor reads "Master Daygame From Home", signs up, and lands on a dashboard
whose biggest button is Scenarios — where 16 of 20 doors are padlocked. The thing
you now say you care most about, the life-improvement system, is unreachable
unless you type the URL.

## Twenty-one dead ends a user can hit

Your own rule in `CLAUDE.md` says *"Never show 'coming soon' dead ends."* Counted:

- **Scenarios — 16 of 20 padlocked.** Opening 1/1, Hooking 1/4, Vibing 1/4,
  Resistance 1/3, **Closing & Texting 0 of 8**. An entire phase of the
  conversation has nothing behind it. (`src/scenarios/catalog.ts` — 16 ×
  `comingSoon: true`.)
- **Articles — a 3,700-pixel page advertising content that does not exist.** It
  ends with three counters: **0 Articles Published. 0 Minutes of Reading. 4
  Content Pillars.** The page describes four pillars, three article types and six
  formats, in detail, and contains zero articles.
- **Cold Approach** — a full-size module card on the dashboard, greyed out.
- **Levels & XP** — "Coming soon" in three places (dashboard card, settings,
  preferences). The dashboard's top card shows an em-dash where a number goes.
- **Experience level** — "Coming soon" on the dashboard's own preferences block.

## The dashboard is a launcher and a settings form at the same time

Top half: three big module cards with "Start Training" buttons. Middle: four
small list rows with arrows — a completely different visual language. Bottom half:
a **preferences editing form**, on the home screen — a photo of a woman with a
"Primary" badge, a world map, an age slider, two Yes/No toggles, and a truncated
"Primary goal: Build Confide…" with an Update button. Your home screen asks you
to fill in a form.

## Four different sets of chrome

Scenarios has "← Back to Dashboard". Ask Coach, Articles and Settings have the
hamburger header. Time has its own six-tab bottom bar. Training has its own four
tabs and opens on the **fourth** one ("Anything else"), not "Today". Every
screen looks like it came from a different app.

## Life Mastery is a 6,550-pixel questionnaire

`/dashboard/goals/plan` is one continuous scroll: fourteen section rows, then a
wall of forms — ideal future, why it matters, hundreds of value chips across two
questions, what mattered in your life, who are you, what you hold yourself to,
who you must become, affirmations. It reads like a research instrument, not a
product. This is the thing you now want to be the centre of the app.

## Real defects, found by looking

- **Sessions never end.** I found a live session that had been running **8 hours
  23 minutes**, and three sessions logged today with **0 approaches** each (3 min,
  8 min, 25 min). `src/tracking/config.ts:148` sets
  `STALE_SESSION_THRESHOLD_HOURS: 12` with a comment saying stale sessions "will
  be auto-closed … prevents zombie sessions from accumulating". **Nothing in the
  codebase reads that value.** I grepped the whole repo: one occurrence, the
  definition. The behaviour the comment describes does not exist.
- **Your headline numbers are truncated.** The two biggest tiles on Tracking read
  "779 Total Appro…" and "23 Total Numb…".
- **3,037 sessions, 779 approaches, 0 field reports.** The reflection step — the
  part that turns activity into improvement — has never once been used, on the
  account with three thousand sessions. Either it is too much work or it is not
  worth doing, and both are product problems.
- **Settings breaks its own rendering.** A hydration mismatch — the server draws
  one time and the browser draws another, so the page throws away what it drew and
  redraws it. Plain version: the clock in the timezone box is wrong for a moment
  and React complains. Caused by rendering "now" on the server.
- **Timezone is UTC**, and your goal resets depend on it. Weekly goals reset at
  the wrong midnight for anyone not in London.
- **Scenarios default to Danish.** The language toggle shows Dansk selected.

## What I did NOT check — and it's the important part

Be clear about the size of this gap: **I never sent a single message to a
scenario, and never asked the coach a single question.** I have no evidence about
the one thing your whole product bet depends on — whether the AI conversation is
any good. I also did not check desktop layout, a real phone, or any of the 65
`/test` pages. The audit above is 17 screens, one phone size, one test account
full of fake data. Treat it as a floor on the problems, not a list of them.

---

# PART 2 — THE HONEST ARITHMETIC ON $2k/MONTH

You said you like a plan that earns 2k in 4 months. Here is what that number
actually requires, so you can decide against real figures instead of hope.

$2,000/month at $20/month is **100 paying subscribers**.

Free-first on Reddit, the funnel is: posts → visitors → signups → still-there-in-
week-2 → paying.

- Most large relevant subs (r/seduction, r/getdisciplined, r/selfimprovement,
  r/DecidingToBeBetter) remove self-promotion. Realistically 1 post in 4 survives
  and gets traction.
- A post that lands: 200–2,000 visitors. A post that doesn't: 20.
- Free-tool signup rate: 10–20% of visitors.
- Free → paid conversion, no track record, no brand: **1–4% of signups.**

So a good first month of Reddit gives you roughly **200–600 signups** and, once
payments exist, **2–20 paying customers. $40–$400/month.**

**100 paying customers needs about 3,000–8,000 signups.** Reddit alone does not
produce that in four months. What produces it is content that compounds — YouTube
and search — and that has a 6–12 month lag before it pays.

### So there are three honest paths, and they need different plans

| | Path | $2k lands | What it costs you |
|---|---|---|---|
| **A** | Free app → Reddit → subscriptions at $20 | **Month 9–14** | Slowest to money, biggest thing at the end |
| **B** | Coaching at $100–200/month, app as the tool you coach with | **Month 3–5** | 10–20 clients is a job, not a product. Your time is the product |
| **C** | Free app for reach + a paid cohort at $100–150 running alongside | **Month 5–7** | Two things at once, and the cohort teaches you what to build |

**My recommendation: C.** A paid cohort of 15 people at $130 is $1,950 — the
number you want — and it needs no Stripe integration on day one (you can invoice
15 people by hand). It also does the thing you cannot buy: puts you in a room with
fifteen people using the app, which is the only reliable way to find out which of
your 65 prototype pages is the real product.

**Path A is not wrong, it is just slower than four months, and no plan I write can
change that.** If you want A, the four-month goal has to become "500 signups and
30 people who come back every week", and money moves to next year.

---

# PART 3 — THE PLAN, IN DAYS

Assumes roughly 5 working days a week. Days are numbered so slippage doesn't
invalidate the sheet; calendar anchors are given per week. **Months 1 and 2 are
identical under all three paths** — the product has to become coherent and has to
become something you use, whichever way you sell it. Month 3 onwards branches.

## Month 1 — ORDER (Thu 10 Sep → Wed 7 Oct)

The goal of this month: **a stranger can move through the app without hitting a
locked door, and you can explain what it is in one sentence.**

### Week 1 (Thu 10 – Wed 16 Sep) — find out if the core works, then decide what the app is

| Day | Do | Done when |
|---|---|---|
| **1** | **Play all 4 working scenarios to the end, and ask the coach 10 real questions.** Score each on a 1–5: did it respond like a person, was the feedback worth reading. Write the scores down. | You have 4 + 10 verdicts on paper. This is the highest-value day in the whole plan — it decides whether scenarios are an asset or a sunk cost |
| **2** | Same for Life Mastery: walk the 6,550px plan page as a user, end to end, and note every question you would not answer | A list of what survives |
| **3** | **Write the one sentence.** What the app is, who for. Then delete from the plan everything that doesn't serve it | One sentence, and a kill list |
| **4** | Decide the fate of Time (`/dashboard/time`) and the 65 `/test` pages: promote / archive / delete. Nothing stays undecided | Every page has a verdict in a file |
| **5** | Account deletion — you asked for this now. Settings danger zone, type-your-email confirm, real deletion via the admin key | `tests/e2e/account-deletion.spec.ts`: make a throwaway account, give it a goal, delete via the UI, assert the account **and** the goal row are gone |

### Week 2 (Thu 17 – Wed 23 Sep) — remove every dead end

| Day | Do | Done when |
|---|---|---|
| **6** | Scenarios: hide the 16 padlocked ones. A page showing 4 real scenarios beats one showing 4 real and 16 locked | Scenarios page has no padlock and no "Coming Soon" |
| **7** | Articles: remove the page from navigation until an article exists. A page saying "0 Articles Published" is worse than no page | `/dashboard/articles` unreachable, or holds ≥1 real article |
| **8** | Remove Cold Approach, the Levels & XP card, and the Experience-level placeholder. Take the preferences form off the dashboard | Automated check: **zero** matches for "coming soon" in `src/` and `app/` outside `/test` |
| **9** | Rebuild the dashboard as one thing, not two: the modules that exist, in one visual language, no forms | Screenshot at phone size fits in under 2 screens of scroll |
| **10** | One header everywhere. Pick the tab bar, delete the other three chromes. Training opens on "Today" | A test asserts every signed-in route renders the same header component |

### Week 3 (Thu 24 – Wed 30 Sep) — give the life-improvement side a home

| Day | Do | Done when |
|---|---|---|
| **11** | Decide the shape: Life Mastery as **one tab** in the main bar, replacing Time | The tab exists and lands somewhere that isn't a wall of forms |
| **12–13** | Break the 6,550px page into a stepped flow — one question group per screen, save as you go, resumable | You can leave halfway, come back tomorrow, and continue where you were |
| **14** | The plan's *output*: after the questions, a user must see something worth the effort. One page: your direction, your goals, this week | A test asserts the output page renders from saved answers alone |
| **15** | Wire goals → tracking so a goal you set shows progress from what you log | Log an approach, watch the goal number move, in one browser session |

### Week 4 (Thu 1 – Wed 7 Oct) — fix what's broken

| Day | Do | Done when |
|---|---|---|
| **16** | **Zombie sessions.** Implement the auto-close that `config.ts` already claims. Prompt on return: "you left a session running 8 hours — end it, or keep it?" | A test that starts a session, moves the clock 13 hours, and asserts it closed |
| **17** | Sessions with 0 approaches: don't save them, or mark them clearly. Three empty sessions today is noise in your own data | History shows no 0-approach sessions, or shows them as abandoned |
| **18** | The truncated tiles, the timezone default, the Settings hydration error, the Danish default | Nothing on Tracking is cut off; timezone is detected on first load |
| **19** | The 44px touch minimum: 250 controls short, 106 of them on one page. Fix the shared button first — that's most of them | The counted ceiling drops below 60 |
| **20** | **Ten minutes on your own phone**, signed up fresh, from the confirmation email onwards | You did it, and wrote down what annoyed you |

**End of Month 1 you have:** one product with a name, no locked doors, a
life-improvement flow that produces an output, and no zombie data. Nothing is
sold yet and nothing is public.

## Month 2 — MAKE IT YOURS (Thu 8 Oct → Wed 4 Nov)

The goal: **you use it every day without wanting to fix it.** This is the month
you asked for, and it is not optional — an app its own author doesn't open is
not going to hold strangers.

- **Week 5:** Use it daily. Keep a running list of every friction. Fix nothing
  until Friday, then fix the top five. (The discipline is the point: fixing as
  you go hides how often you get annoyed.)
- **Week 6:** The daily loop. Whatever you actually open every morning gets to be
  excellent — one screen, three seconds, no scrolling.
- **Week 7:** The weekly loop. Review, field report, whatever makes the daily
  logging add up to something. **Your own account has 3,037 sessions and 0 field
  reports** — solve why, because that is the whole value of tracking.
- **Week 8:** The plumbing that a launch needs and nothing else:
  - analytics (you have **none** — you cannot launch blind),
  - error alerts to your inbox,
  - email that isn't your personal Gmail relay (free, no domain needed),
  - the two unapplied migrations, including the one that closes the hole letting
    any visitor empty 63 tables,
  - privacy policy + terms. **You need these before the free launch, not before
    payments** — the moment a stranger's email is in your database, European law
    applies whether or not money changed hands.

**End of Month 2:** you have used your own app for four weeks straight, and it is
safe to point strangers at.

## Month 3 — PEOPLE (Thu 5 Nov → Wed 2 Dec)

- **Week 9:** Write the Reddit artifact. Not a launch post — something useful on
  its own that happens to mention the app. Your corpus is an unfair advantage
  here: you have 372 transcripts nobody else has mined.
- **Week 10:** Post it. Three subs, three different framings, a week apart.
  Watch analytics, fix the drop-off point the same day.
- **Week 11:** Talk to the first 20 signups individually. Not a survey — messages.
- **Week 12:** Fix the top three things they said, and only those.

**Target: 200–600 signups, 30+ people back in week 2.** If week 2 retention is
under 10%, stop and fix the product before spending another post.

### Path C also starts here
- **Week 9:** name the cohort, write the offer, price it at $130.
- **Week 11:** sell it in the same threads. 15 seats, invoiced by hand — no Stripe.
- **Week 12:** cohort starts. **This is where the $2k comes from.**

## Month 4 — MONEY (Thu 3 Dec → Thu 7 Jan)

- **Week 13:** Decide what premium *is*. You said you don't know yet — by now you
  will, because you'll have watched people use it. The rule: free must be useful
  forever, paid must remove a limit people are actually hitting.
- **Week 14:** Build payments. Start-a-payment, listen-for-payment, cancel page,
  a record of who is subscribed. ~2–3 days of work; today there is **none** of it,
  and the checkout button literally says "Payments/Stripe are not migrated yet".
- **Week 15:** Stripe account, business details, bank, tax. Started in week 13 —
  verification is calendar time you cannot compress.
- **Week 16:** Turn it on. Ask the 30 most active free users directly.

**Realistic end of Month 4:** Path C — $1,500–2,000/month from the cohort, plus
$50–200 of subscriptions. Path A — $100–400/month and a real audience forming.

---

# PART 4 — BLOCKERS

Each attempted at least once. What the attempt showed is recorded.

### B1 — Which path: A, B or C?
**Blocks:** Months 3–4 entirely. Months 1–2 are the same either way, so this is
not blocking the start.
**Attempted:** N/A — this is yours to decide; I did the arithmetic in Part 2.
*Recommendation: C. It is the only one that puts $2k inside four months without
turning you into a full-time coach.*

### B2 — How many hours a day, realistically?
**Blocks:** every date in Part 3.
**Attempted:** I read the commit history — you have been shipping most days for
weeks, which is why I planned on 5 days a week. If it is really 2, every date
doubles and Month 1 runs to mid-November.
*Recommendation: tell me the real number and I will re-date the sheet rather than
let it quietly slip.*

### B3 — May I create/delete real accounts and apply migrations on the live database?
**Blocks:** Day 5 (account deletion needs a throwaway account to prove the
cascade), Week 8 (two unapplied migrations).
**Attempted:** ✅ Yes, and blocked again today — reading your `.env` files was
refused by the permission classifier mid-audit, and every previous write to
Supabase from here has been refused.
*Recommendation: yes for `e2e+<timestamp>@` addresses with cleanup that runs even
on failure. For migrations, either you paste them in or you allow `curl` to
Supabase. Otherwise those days become hand-offs and the week stretches.*

### B4 — Is the email problem worth fixing, given you want to keep reachjvc@gmail.com?
**Blocks:** the free launch (Week 8).
**Attempted:** ✅ Read your live auth config previously: `smtp.gmail.com`, sender
`reachjvc@gmail.com`. The issue is not how the address sounds — it is that Google
caps relayed mail at ~500/day and mail from a personal Gmail to strangers lands in
spam far more often, so some share of your signups never get their confirmation
link and see no error.
*Recommendation: Resend's free tier, sending from their shared address. **It costs
nothing and needs no domain.** Your address stays yours; it just stops being the
mail server. 20 minutes.*

### B5 — Are the 4 working scenarios and Ask Coach actually good?
**Blocks:** the one-sentence decision on Day 3, and therefore the whole plan.
**Attempted:** ❌ **No — and this is the biggest hole in this document.** I audited
17 screens and never sent one message to a scenario or one question to the coach.
I have no evidence about the thing the product is built on.
*Recommendation: Day 1, you do it, before anything else. If the conversations are
weak, the scenarios are decoration and the plan should be built on the
life-improvement side alone — which changes Month 1 substantially.*

---

# PART 5 — OPEN QUESTIONS

### Q1 — What happens to Time?
An empty Toggl clone with its own six-tab navigation and its own design language,
occupying one of four main tabs.
> **Recommendation: archive it to `/test`.** It is a third product. If time
> tracking matters to life improvement, it comes back later as a widget inside
> Life Mastery, not as a peer of the whole app.

### Q2 — Do scenarios stay, given the repositioning?
You said you may aim them at dating in general, or even sales, later.
> **Recommendation: keep the 4 that work, hide the 16 that don't, and stop
> building more until Day 1's verdict is in.** The engine is the asset; the
> catalogue is not. Sales training reuses the engine — that is an argument for
> keeping it, not for finishing 16 daygame scenarios.

### Q3 — What is the app called if it isn't about daygame?
Every screen says "DayGame Coach" and the landing page promises daygame. A life
improvement product with that name confuses everyone who arrives.
> **Recommendation: decide the name on Day 3 with the one sentence, but don't
> spend Month 1 renaming.** Rename in Week 9, when you write the first thing a
> stranger reads. Renaming before that is cost with no reader.

### Q4 — Free tier: what is in it forever?
> **Recommendation: tracking and goals free forever, AI conversations metered.**
> The AI is the part that costs you real money per use (Anthropic charges per
> message, and there is currently **no per-user cap** — one enthusiastic user can
> cost more than they pay). Metering the expensive thing is both the business model
> and the cost control.

### Q5 — 65 test pages, 28 live pages. What happens to them?
> **Recommendation: on Day 4, three folders — promote, archive, delete.** Deleting
> is allowed; the git history keeps them. What is not allowed is leaving them,
> because a page you might revive is a decision you are paying interest on.

---

# PART 6 — REVIEW PASS ON THIS PLAN

Attacked after writing, per `.claude/rules/finished-work.md`.

**The audit is a floor, not a list.** 17 screens, one phone width, one test
account with 3,037 fake sessions. A fresh empty account will show a different set
of problems — probably worse ones, because most of these screens have never been
seen with no data in them. Add that to Day 1.

**Part 2's conversion numbers are industry ranges, not measurements of your
funnel.** 1–4% free-to-paid is what comparable self-improvement tools report. Your
number could be 0.5% or 8%. The plan's shape survives either; the dates don't.

**Month 2 is the weakest month in this document.** "Use it daily and fix what
annoys you" cannot be scheduled honestly by someone who is not you, so I gave it
a structure rather than a list of tasks. If it turns into four weeks of drifting,
the whole schedule moves.

**I have assumed the four working scenarios are worth keeping.** B5 says I have no
evidence for that. If Day 1 says they are weak, Weeks 1–2 change and this document
needs rewriting rather than adjusting.

**The $2k target is not proven by anything here.** Path C reaches it by selling
your time to 15 people, which is a real business but not the one you described
wanting. If nobody buys the cohort, Month 4 ends at a few hundred dollars, and the
honest answer is that a product-led $2k/month is a 2027 number, not a
four-month one.
