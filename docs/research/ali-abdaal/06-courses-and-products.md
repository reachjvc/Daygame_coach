# Ali Abdaal — Paid Products & Structured Programmes

*Research date: 2026-08-09. Focus: what curriculum he actually teaches when he has hours of a student's attention.*

**Spelling note:** the correct spelling is **Abdaal** (double-a), not "Abdal". All searches must use "Abdaal".

**Access note:** `aliabdaal.com` and `lifestylebusiness.com` sit behind Cloudflare and return **403 to direct fetching** (WebFetch, plain curl, and a headless Playwright browser all hit the "Just a moment…" challenge). Everything marked [VERIFIED] below was read through the `r.jina.ai` reader proxy (`curl -s "https://r.jina.ai/<url>"`), which renders the real page. `web.archive.org` is blocked to WebFetch but reachable via curl. This matters if anyone re-runs this research.

---

## 1. Product Inventory

| Product | What it is | Price | Format | Duration / commitment | Availability (Aug 2026) |
|---|---|---|---|---|---|
| **LifeOS** | Flagship personal-productivity system: vision + action, 6 named modules in 2 pillars | **$297** one-time (promo pages show **$197**, "regular $297") | Self-paced video course + Notion template; lifetime access | 2–3 h initial setup, then 30–60 min/week; "full transformation 4–12 weeks" | **Live.** `aliabdaal.com/lifeos` |
| **LifeOS Pro** | LifeOS + coaching/community support layer | **$347 then $85/month** | Self-paced + onboarding call, accountability pods, daily focus sessions, monthly Ali Q&As | Same course + optional live sessions | **Retired [VERIFIED].** The live checkout (`/checkouts/lifeos-checkout/`) offers a **single $297 line item, no tiers, no subscription** — only an **order bump for the $97 Spark recordings** ("Missed the worlds biggest productivity summit?"). Pro survives only as stale FAQ copy |
| **Productivity Lab** | 12-week cohort programme, then an annual accountability membership on Circle | **$997/yr** (2025 sales page, incl. LifeOS "worth $297"); a community post referenced **$29/mo or $299/yr** at an earlier point | Membership: daily focus labs, accountability pods, monthly expert workshops, monthly Ali Q&A | 12-week programme originally; membership = ongoing, drop-in | **Retired.** `aliabdaal.com/productivity-lab` now serves the **LifeOS** page verbatim, and `productivitylab.com` now serves the **Lifestyle Business Academy** homepage |
| **Part-Time YouTuber Academy (PTYA)** | Flagship YouTube course | **$995** one-time, or 3-month payment plan; scholarships at 25/50/75/100% off | Self-paced (originally a live cohort); 12 months community access | 20+ h core + 16+ h bonus video | **Live.** `aliabdaal.com/part-time-youtuber-academy` |
| **7 Video Challenge** | Beginner YouTube challenge with a completion-refund | **$295, fully refunded on completion** | Self-paced tutorials + community submission space | Must finish 7 videos within **7 months** | **Live.** `aliabdaal.com/7-video-challenge` |
| **Lifestyle Business Academy (LBA)** | 6-month "online business school" cohort | **Not published** — application + interview gated | Cohort; squads of ~6 with a dedicated coach; 14 modules / 112 lessons / 13+ h | **5–10 h/week for 6 months** | **Live, application-only.** `lifestylebusiness.com/academy` |
| **Superfocus** (app URLs: `superfocus.me`, `superos.me`) | Productivity SaaS app (goals → seasons → time blocks → focus mode → AI coaching) | **$199/year** founding membership | Software | Daily use | **Live (founding access).** Now the headline product on his homepage |
| **Viral Thumbnail Pack** | Thumbnail template pack | **$49** | Template download | — | Live |
| **Feel-Good Productivity** | NYT-bestselling book | Retail | Book | — | Live; 250k+ copies |
| **Spark** (annual productivity summit) | **His biggest programme by reach.** Free 2-day virtual New Year summit: Day 1 VISION, Day 2 ACTION | **Free**; recordings only via **$97 VIP** upsell | Live Zoom, 13:00–17:00 GMT × 2 days, guest speakers | 8 h over 2 days | **Live, annual.** Spark 2025: **110,000 registered**; Spark 2026: **89,256 registered** |
| **Annual Planning Workshop** | Free live 3–3.5 h year-reflection + goal-setting workshop — the **precursor to Spark** | Gated on a *Feel-Good Productivity* preorder receipt | Live Zoom, recorded, worksheets emailed after | 3 h (1400–1700 GMT, 6 Jan 2024) | Superseded by Spark |
| **Quarterly Alignment / "Summer Reset" Workshops** | Free live ~90-min quarterly reflection + Quarterly Quests goal-setting, with a full Google Docs workbook | Free (replays email-gated) | Live Zoom + workbook you copy | ~90 min per quarter (~3,000 live in June 2024) | **Live.** Ali: *"I've been running these for 2 years now"* (Jun 2025). `aliabdaal.com/summer-reset-2026/` |
| **LifeNotes** (formerly **Sunday Snippets**) | Free weekly-ish newsletter | Free | Email | ~5 min read | Live. **443,000 subscribers** |
| **7 Day Focus Crash Course** | Free 7-day email course | Free (email opt-in) | Email drip | 7 days | Live (launched Mar 2024) |
| **Part-Time YouTuber Crash Course** | Free 7-day email course | Free | Email drip | 7 days | Live. **34,000+ joined**; day titles partly published |
| **Indistractable in 5 Days** | Free email crash course **co-branded with Nir Eyal** (dual newsletter opt-ins) | Free | Email drip | 5 days (page copy contradicts itself, fine print says 7) | Live |
| **Creatorpreneur Crash Course** | Free 5-day email course | Free | Email drip | 5 days | ~2022 era |
| **GPS Coach GPT** | Free CustomGPT goal coach | Free (email opt-in) | ChatGPT custom GPT | One session | Live |
| **Business Class** | Free BTS business newsletter | Free (Typeform signup) | Email, 2–3×/month | — | Live |
| **Part-Time Creatorpreneur** | Course on turning a creative side hustle into a scalable business — the **precursor to LBA** | Not recovered | Course (`creatorpreneur.aliabdaal.com`) | — | Legacy (~2022–23); superseded by Lifestyle Business Academy |
| **$1k Challenge** | 6-week bootcamp to earn your first $1,000 online — run in summer 2025 as a **validation experiment** that became LBA | Not published | Bootcamp cohort | 6 weeks | One-off experiment; superseded by LBA |
| **Entrepreneurs Mastermind** | Invitation-only 1-day in-person event (Bali, 30 Sep 2025) | Not published; requires $100k+ annual revenue | In-person | 1 day | Past event |

---

## 2. Per-Product Deep Dive

### 2.1 LifeOS — the best-documented curriculum

[VERIFIED] Source: `https://aliabdaal.com/lifeos` and the ad landing page `https://aliabdaal.com/fb-lifeos/`.

**Framing.** Two pillars, stated as the product's central thesis:

> "The secret to truly enjoyable, meaningful and sustainable productivity … comes down to connecting two basic things: **1️⃣ VISION.** Without a clear picture of where you're going and why it matters, you'll only excel at tasks that ultimately don't move your life forward. **2️⃣ ACTION.** Once your direction is clear, progress isn't about willpower – it's about building systems that make consistent action inevitable."

**Published module outline (verbatim module names + descriptions):**

**Pillar 1: VISION — "Gain Clarity, Get Direction & Set Your Goals"**

| Module | Published description (condensed, wording preserved) |
|---|---|
| 🧭 **Life Compass** | "This transformative **4-part framework** helps you align your daily actions with your deepest values." |
| 🎨 **Future Sketch** | "You'll develop a flexible **3-year roadmap** that eliminates overwhelm and gives you the freedom to confidently say 'no' to distractions." |
| 🚀 **Quarterly Quests** | "The **GPS Method** will help you break down your ambitious yearly goals into actionable **12-week sprints**, complete with **milestone tracking**." |

**Pillar 2: ACTION — "Take Action, Get Organised & Manage Your Time"**

| Module | Published description (condensed, wording preserved) |
|---|---|
| ⏳ **Focus Hours** | Creating distraction-free periods of intense productivity, consistently rather than by chance. |
| ☀️ **Productive Days** | "Bridges the gap between your long-term vision and daily execution … a customised system to prioritise effectively, overcome procrastination." |
| ⚖️ **Balanced Weeks** | "You'll create a personalised **weekly rhythm** that accommodates both your professional ambitions and personal priorities." |

The stated pillar-level learning outcomes:

- **Vision:** discover core values · craft a compelling future vision · set goals aligned with purpose · prioritise high-leverage activities · make confident decisions.
- **Action:** track progress · create a personalised productivity system · build routines · overcome procrastination psychologically · **manage energy, not just time**.

**Module count discrepancy:** the sales page names **6** modules; a student who bought the self-paced course on launch reports **7 modules** ("7 modules with many short videos from three live sessions Ali hosted"). [INFERRED] The 7th is most likely an intro/orientation module — not confirmed.

**Actual lesson content (from a student's session-by-session notes — the only granular record I could find):**

Lukas Zangerl (neurohackingly.com) attended the **live LifeOS cohort in Jan–Feb 2025** and wrote it up in 4 parts. This is the highest-value external source in this document.

- **Week 1, ~2 hours** — Focus + vision. Core claims quoted from Ali:
  - "Productivity is a deeply personal thing… Something that works for me might not work for you."
  - "Everything you want is on the other side of being able to sit down and focus on one thing for an extended period of time."
  - "One focused hour can beat eight scattered ones."
  - "**If the only change you made to your life was to consistently track your focus minutes, you'd probably double your productivity.**"
  - "There is nothing more sad than someone who's super efficient and super productive, but who spends years working towards something only to realize that they were actually working towards the wrong things after all."
  - **Life Compass exercises done in-session:** "My Eulogy", "Bucket List Prompt", "Mission Prompt", "Success Prompt". [VERIFIED — student's own list]
- **Week 1 part 2 — The 3 Menus** (personalised, pre-written lists you build once and consult in the moment):
  - **Activation Menu** — for when you can't start (e.g. gentle background music, short breathing exercise, one small admin task for momentum).
  - **Reactivation Menu** — for when attention drifts mid-task (one-minute stretch, jumping jacks, swap playlist, phone in another room).
  - **Recharge Menu** — for after a focused session (short walk, tea/coffee, stretch).
  - Rationale given: the three menus map to the three failure points — **starting, sustaining, recovering**.
- **Week 2 — Productive Days / the Morning Manifesto.** A **five-minute morning checklist** with three steps: **Identify** your priority → **Schedule** it deliberately → **Execute** with focus. Framing quote: efficiency without direction is "the most sophisticated form of failure".
- **Week 3 (final week) — Quarterly Quests + Balanced Weeks.**
  - **GPS framework**, as the student recorded it: **G**oal — "What do I want to achieve and why?" · **P**lan — "What milestones will show my progress?" · **S**ystem — "What daily and weekly actions will ensure success?"
  - Constraint taught: **exactly one professional and one personal goal per quarter.**
  - Claimed planning cost: **"only one hour of planning for three months of focused action."**
  - Balanced Weeks weekly ritual: **30 minutes (or even 5)** — review 90-day goals, reflect on last week's wins and challenges, set **three priorities** for the coming week.

**Materials included.** "Comprehensive suite of tools, resources and templates." The student names it specifically: **"A full Life OS Notion template to track everything from your life vision to your focus hours."** [VERIFIED] The template's internal field names are **not public** — I could not see inside it.

**Time commitment (published FAQ, verbatim):** "setting aside **2–3 hours for initial setup**, then **30–60 minutes weekly** for planning and reflection." Results horizon: "The full transformation typically unfolds over **4–12 weeks**."

**Guarantee.** "The 'Help Ali Sleep at Night' Money-Back Guarantee" — 30 days, no-questions-asked, but they ask what could have been better "to help us improve".

**Format history** [VERIFIED via student notes + testimonials]:
1. **Jan 2024** — free 3.5 h Annual Planning Workshop (book-launch lead magnet).
2. **Jan 2024** — Productivity Lab launches as the Circle community's flagship **12-week programme**.
3. **Jan 2025** — LifeOS runs as a **live 3-week cohort**, ~2 h live session per week (testimonials also call it "this 3 day workshop", so a 3-day intensive variant existed).
4. **Feb 2025** — the polished **self-paced** course ships, cut from the three live session recordings.
5. **2026** — `/productivity-lab` redirects to LifeOS content; LifeOS Pro tier gone from the live page; **Superfocus** app becomes the headline product on the homepage.

The student's account of *why* Productivity Lab became LifeOS is worth quoting:

> "Productivity Lab launched in January 2024 as the Circle community's flagship 12-week program. It was ambitious—covering everything from the fundamentals of sleep and nutrition to advanced topics like burnout prevention, mindset optimization, and workspace design. Looking back, Ali himself acknowledged that the course stretched beyond his core expertise in certain areas. This honest reflection led to the creation of LifeOS—a more focused, seven-module program that keeps what worked best (the system, action, and vision components) while streamlining the rest. Notably, entire sections like the regeneration module were thoughtfully removed."

Also: in Productivity Lab, coach **Kaylen Apple** taught portions; **in LifeOS Ali teaches every module himself.**

---

### 2.2 Productivity Lab (retired)

[VERIFIED] Source: archived sales page `web.archive.org/web/20250324064443/https://aliabdaal.com/productivity-lab`.

Positioning: **"Ambition + Accountability = Action"** and *"Accountability is the secret to sustainable Productivity."* Explicitly **not** a curriculum product — the course (LifeOS) was bundled in free; the thing you paid for was the **accountability scaffolding**.

**What $997/year bought (verbatim bullets):**
- 12 months' access to Productivity Lab
- **Onboarding call with one of our expert productivity & accountability coaches**
- **Weekly & monthly productivity challenges** "to keep you motivated and have fun along the way"
- **Daily facilitated focus sessions**, **weekly reflection workshops**, **monthly reviews**
- **Accountability Pods** — "small groups designed to keep you accountable … regular check-ins, guided prompts, and collaborative goal-setting"
- **Monthly expert guest workshops**; **monthly group Q&As with Ali**
- Private community access; **Custom Productivity Toolkits** (templates, checklists, action plans, guides)
- Free LifeOS self-serve course (worth $297); lifetime access to materials
- 30-day money-back guarantee; ~1,500 members

**The named daily ritual: "Focus Labs."** Live, guided deep-work sessions. Testimonials give the real cadence — *"joining at least 3 out of 6 labs a day"*, *"a ton of time options on weekdays"*. Multiple reviewers say the Focus Labs alone justified the price. This is the single most-praised mechanic across every testimonial on the page.

**Inside a Focus Lab / the focus system** [VERIFIED via student notes, July 2024]:
- **Focus log fields**: 📝 Task · ⏱️ Start and end times · ⌛ Duration (calculated) · 📚 Topic · 🤔 Reflection.
- **The 60-minute structured hour**: 5 min **Organize** (tidy, get a drink, bathroom) → 50 min **Focus** → 5 min **Reflect & Rest** (review work, plan next session, stretch/walk).
- Ali's framing hypothesis for that week: *"By tracking our focus sessions, we will be able to double our productivity."*
- The 12-week programme moved through one **area per week** (that week's area was "FOCUS").

**Retirement is now unambiguous** [VERIFIED, Aug 2026]: both entry points have been repurposed. `aliabdaal.com/productivity-lab` serves the **LifeOS** page byte-for-byte, and **`productivitylab.com` — the domain the newsletter used to link to for Lab enrolment — now serves the Lifestyle Business Academy homepage.** The Productivity Lab brand no longer exists as a product; its *content* survives as LifeOS and its *accountability mechanics* survive in LBA (squads, weekly live workshops) and in Superfocus (focus mode, AI coaching, weekly reflection). That same page reveals two products not listed elsewhere: a **"Freedom Notes"** weekly newsletter for the LBA audience, and **"YouTubeOS"** in a tools-and-templates collection.

**Anti-persona section** (a notable sales/pedagogy move — they publish who it's *not* for): people unwilling to reflect on their habits; people who "prefer excuses over action"; people "looking for quick hacks and shortcuts"; people "not willing to put in the effort".

---

### 2.3 Part-Time YouTuber Academy — full published chapter outline

[VERIFIED] Source: `https://aliabdaal.com/part-time-youtuber-academy`. **$995**, 6,000+ students, self-paced.

**Curriculum, as published (10 chapters):**

1. 🧑‍🏫 **The Part-Time YouTuber Blueprint** — orientation; the holistic system overview.
2. 🕵️ **How to Find your Perfect Niche** — the **Growth-Fun Spectrum** (business vs hobby); the **architect vs archaeologist** distinction; defining your channel's **value proposition**; competitor analysis; finding your "authentic edge".
3. 💡 **How To Generate Endless Ideas** — capturing ideas into a **video homebase**; the "problem of ideas"; the **Birdsong Technique** (drawing from other creators/industries); **coal mining** (digging into existing content); **viral replication**; keyword research; the **"5 Months in 5 Minutes"** method for mass-generating a backlog.
4. ✍️ **How to Write Incredible Titles** — browse intent vs search intent; what makes a title concise/descriptive/intriguing; AI-assisted title generation.
5. 🖼️ **How to Make Banger Thumbnails** — professional vs amateur design; developing a **house style**; A/B testing.
6. 🍿 **How to Make Compelling Videos** — the **HIVES Framework** (hook → intro → value → …); pre-production structuring; 7 tips for writing better videos; filming and editing.
7. ❤️‍🔥 **The Power of Branding** — the **"ABCs of Connection"**: **A**esthetics, **B**randing, **C**onfidence & Delivery, **P**ersonality (published as "ABCs" despite the fourth letter — their wording).
8. 📈 **How to Grow on YouTube Part-Time** — the **Time Audit** self-assessment; **Slow Burn Writing**; **batch filming**; publishing automations; when/how to delegate; **the Ideal Week**.
9. 🤝 **How to Outsource Effectively** — when to hire, what to outsource first, freelancer vs employee, hiring A-players, managing them.
10. 🚀 **How to Earn Money On and Off YouTube** — Expand / Monetise (Adsense & CPMs, affiliate, sponsorship) / own products, merch, courses; a teardown of Ali's own current system.

**What's included:** 20+ h core curriculum · 16+ h bonus modules (gear, studio setups, monetisation, repurposing, community building, newsletters) · **12 months** community access + alumni in-person events · exclusive interviews with 20+ creators (Mrwhosetheboss, Matt D'Avella, Nathaniel Drew, Lana Blakely, Elizabeth Filips — 36M+ combined subs) · Final Cut Pro X 3-hour editing course · Viral Thumbnail Template Pack.

**Named templates/tools ("Part-Time YouTuber Productivity System"):** Infinite Content Engine · H.I.V.E.S Framework + video format templates · Ultimate Gear Guide · **Idea Generation Machine** (7-part framework) · **Outsourcing Almanack** (checklists + sample job descriptions) · 3 "edge" systems · **Creator's Compass** · **Identity Analyst template**.

**No 1:1 coaching** (stated explicitly in the FAQ). Community Q&A only.

**Price and format have both come down.** PTYA launched in 2020 as a **live cohort** course and was priced far higher — a **$1,995** figure is cited for late 2022 [INFERRED from a secondary summary; not page-verified]. It is now **$995 and fully self-paced**. Independent commentary from creator Mark Ellis (Jan 2023, `markellis.substack.com/p/ali-abdaals-2million-disaster`) ties this to a market shift: PTYA "was a massive driver of revenue during 2021 but also incredibly pricey", and 2022 brought "a reduced thirst for expensive cohort courses" alongside a profit decline on a team that had grown past 20 people. That pressure is the most plausible explanation for the pattern visible right across this catalogue: **live cohorts → self-paced courses → software**.

---

### 2.4 Lifestyle Business Academy — the richest *pedagogy* source

[VERIFIED] Source: `https://lifestylebusiness.com/academy`. Price not published; application + interview gated. Aug 2026 cohort advertised "37 Seats Remaining".

**Scope statement:** "a **6-month online business school**." Seven subject pillars named on the waitlist page: **Productivity, Product, Marketing, Sales, Operations, Finance, Mindset.**

**Curriculum size (published, precise):** **14 modules, 112 individual lessons, over 13 hours of content**, plus weekly workshops from outside specialists (ads, sales, marketing).

**Three phases over six months:**

| Phase | Goal | What you do |
|---|---|---|
| **1. Identify & build** (target: **within 2 weeks**) | Niche, offer, premium pricing | Figure out who you help and how · validate the idea · **1:1 session** to design the business idea · **pressure-test using the DREAM Score framework** |
| **2. Work toward your first sale** | "Magnetic marketing" | Build content engine, outreach system, **discovery call framework** · refine offer on market feedback · land first paying client |
| **3. Build momentum & escape your day job** | Scale to **$8.4k/month ($100k/yr run rate)** | Delivery systems · lead-gen systems · "transition from 'I have customers' to 'I have a business'" |

**Named diagnostic:** the **DREAM Score** — an idea pressure-test scored numerically; the guarantee requires a "coach-approved business idea that scores **8+** on our DREAM Score framework". [VERIFIED that it exists and is scored; the five criteria behind D-R-E-A-M are **not published** — I could not find them.]

---

### 2.5 Superfocus (the app the system is migrating into)

[VERIFIED] `https://www.superfocus.me`. **$199/year** founding membership. Opens with "You only have **168 hours** each week."

Positioned as the LifeOS system operationalised: "breaks down big goals into **seasons**", time blocking + calendar sync, focus mode with music and cross-device app/website blocking, **AI daily & weekly coaching**, "**Plan strength + Compass**" (naming echoes LifeOS's Life Compass). Bio line: **"He designed the GPS Method and Superfocus is where it comes to life."** One-month no-questions refund.

This is the clearest signal of strategic direction: the cohort/membership accountability business (Productivity Lab) has been replaced by **software** that automates the same loop.

---

### 2.6 7 Video Challenge — a pure completion-mechanic product

[VERIFIED] `https://aliabdaal.com/7-video-challenge`. **$295, fully refunded when you finish.**

- "Enroll for $295, complete the 7 videos, and we'll refund your entire challenge fee… **Whether it takes you 7 weeks or 7 months, the guarantee stands.**"
- Hard deadline: **all 7 videos within 7 months of purchase.**
- **After each video you must submit a short reflection survey** — and the refund is contingent on it: "To be eligible for the refund, we ask that you complete all the steps outlined which includes completing the reflection form after each upload. This isn't just another form – you'll make way more progress by doing this self-reflection practice."
- Homework is submitted **publicly** into a dedicated space in the PTYA community; peers see each other's work and give feedback.
- Videos must stay published until the refund is processed.
- One-time only per student, explicitly "not a repeatable program".
- Refund takes 5–7 business days after the final survey.
- **Completion signal:** the page states "We've refunded over **$5,000** to people who have completed this challenge" — i.e. roughly **17 completers** at $295 each at time of writing. Read that against a product marketed to a 6M-subscriber audience: **completion is rare**, and they publish the number as social proof anyway.

---

### 2.7 The free Annual Planning Workshop (the goal-setting workshop)

[VERIFIED] Sources: `https://aliabdaal.com/newsletter/my-annual-reflection-goal-setting-method/` (his own pre-workshop email) and an attendee review at neurohackingly.com.

- **6 January 2024, 1400–1700 GMT (3 hours)**; attendee reports **3.5 hours** and **"over 10,000 participants"**.
- Free, but gated on a **Feel-Good Productivity preorder receipt** submitted via Typeform — i.e. the workshop was the preorder bonus.
- **Recorded**; "We'll also send all the materials, **worksheets, templates** etc by email afterwards."
- Run with a background **Spotify playlist** ("Study With Me" / a yoga+meditation playlist), eyes-closed prompt delivery, then writing.

**Published three-step method:**
1. **Reflect on the past year** — "structured reflection prompts … clarity on how 2023 went for you, and what you can learn from it."
2. **Find your North Star** — "structured journaling and reflection prompts" to identify direction. His instruction on *how* to answer: *"if you don't think too hard about them, and go with your 'gut' … the answers will come to you a lot more readily."* The purpose is a testable question: *"To what extent is what I'm currently doing aligned with this future that I think I want?"*
3. **Decide on goals** — explicitly **divergent then convergent**: "(1) divergent thinking to list out a bunch of different *dreams* … then (2) convergent thinking to narrow them down to specific *goals*." He deliberately withheld the detail of step 3 from the email to keep it exclusive to live attendees.

**Actual worksheet prompts recovered** (two, quoted by the attendee from the workshop worksheet):
- *"What would you do again in 2023 even if you knew you'd fail?"*
- **The Future TED Talk Prompt** — *"You're attending the TED conference, and everyone in the audience (including you) is deeply moved and inspired by what the speaker is talking about. The speaker is you, 20 years in the future. What is 'You + 20 Years' talking about, and what's so inspiring about it?"*

**Facilitation detail worth stealing:** *"Ali often gave us **3 min per question** only. Try to think less and just write what comes up intuitively."* Timeboxing per prompt is a deliberate anti-overthinking device.

---

### 2.8 Spark — the free annual summit (his highest-reach programme)

[VERIFIED] Sources: `https://web.archive.org/web/20251218113036/https://aliabdaal.com/spark-2026/`; Ali's LinkedIn post on final numbers; `https://aliabdaal.com/newsletter/110000-people-registered-for-this-workshop-heres-what-we-learned/`.

This is the single most important product in this document that is **not** on his own nav bar. It reaches ~100× more people than any paid programme.

- **Format:** free virtual summit, **3–4 January 2026**, **13:00–17:00 GMT both days**.
- **Taglines:** "Spark Your Most Productive Year Yet" · "**Reflect. Plan. Act.**" · "Don't Rely On Resolutions. Set Your Vision. Build Systems. Take Action."
- **Registration:** First Name + Email only.
- **Structure: Day 1 = VISION. Day 2 = ACTION.** — *the exact two pillars of the $297 LifeOS course.*
- **Scale:** Spark 2025 — **110,000 registered**, 18–20k concurrent per session. Spark 2026 — **89,256 registered** against a target of 75,000 (Ali's own LinkedIn).
- **Monetisation:** attending live is free; **session recordings are VIP-only at $97**, sold on the post-registration confirmation page. Nothing of value is withheld from the live event — you pay for asynchrony.

**Published Spark 2026 agenda [VERIFIED verbatim]:**

*Saturday 3 Jan — VISION*
| Time (GMT) | Session |
|---|---|
| 13:00–14:00 | 🔮 **2025: A Year In Review** w/ Ali — "go beyond basic goal review and uncover the real insights from your past year through structured exercises and proven frameworks to identify what actually worked, what didn't, and why" |
| 14:10–15:10 | 👑 **The Power of Vision Boarding** w/ Izzy Sealey — "create a powerful vision board, refine it for 2026, and use it to stay aligned, motivated, and intentional" |
| 15:15–16:15 | 👑 **Escaping Dopamine Land** w/ TJ Power (DOSE® tools) |
| 16:15–16:25 | 🌅 **Your Vision, Locked In** w/ Ali — recap + bridge to Day 2 |
| 16:30–17:30 | 🚨 VIP-only: **Building Financial Freedom in 2026 (Part I)** |

*Sunday 4 Jan — ACTION*
| Time (GMT) | Session |
|---|---|
| 13:00–13:15 | 🎨 **The Action Pillar: An Introduction** w/ Ali |
| 13:15–14:15 | 🏗️ **Tiny Experiments for the New Year** w/ Anne-Laure Le Cunff |
| 14:30–15:30 | 👑 **Beyond Belief** w/ Nir Eyal — "Three Powers of Belief: Attention, Anticipation, and Agency" |
| 15:30–16:25 | 🌅 **Build Your Life Operating System** w/ Ali — "the core philosophy of LifeOS… how to build a personal operating system" |
| 16:30–17:30 | 🚨 VIP-only: **Financial Freedom (Part II)** |

Past Spark/Reset speakers also include **Sahil Bloom** and **Cal Newport**.

**★ The actual Spark 2025 exercises** — published free in his newsletter afterwards. These are the highest-fidelity record of how he runs a mass reflection session.

Delivery: a guided visualisation first ("a few minutes of this, with some vibey music"), then **3 minutes per prompt**, with live word-cloud polls between exercises (e.g. *"What's 1 small action you'll commit to taking TODAY to make a start towards your dream 2025?"*).

**"✍️ 2024 Reflections" — the 8 prompts, verbatim:**
1. 🏆 **Major Milestones** — "What were the most significant events or achievements in 2024 for you? How did these impact your life?"
2. 🙏 **Gratitude** — "What are you most grateful for in 2024? Think about people, experiences, or opportunities that enriched your life."
3. 💪 **Challenges** — "What were the biggest challenges or obstacles you faced in 2024? How did you overcome them, and what did you learn from these experiences?"
4. 🎓 **Professional Growth** — "How did you progress in your career / work in 2024? What were the key learnings and how have they shaped your future aspirations?"
5. 🌱 **Personal Growth** — "In what ways have you grown or changed as a person over the past year? Consider changes in your beliefs, attitudes, and behaviours."
6. ❌ **Unfulfilled Aspirations** — "Were there goals or aspirations you had for 2024 that you didn't achieve? Reflect on why they were not met and how you feel about it."
7. 👥 **Relationships and Connections** — "Reflect on your relationships in 2024. How have they evolved? Were there new relationships that had a significant impact on you?"
8. 🚀 **Looking Forward** — "Based on your experiences in 2024, what would you like to do differently in 2025?" → answered as **continue / start / stop**

(Note the near-identity with §2.9's quarterly workbook — the same prompt set, rescoped from 12 months to 90 days. He runs **one reflection instrument at two time horizons**.)

**"🪦 Write your Own Eulogy"** — framed as visualising your funeral "in a world where you live to be 100 years old in great physical and mental health", then completing 10 sentence stems, verbatim:
- "Today, we gather to honour the life and legacy of [name]"
- "[Name] was a…"
- "In his personal life, he…"
- "Those closest to him remember him as…"
- "In his professional life, he…"
- "His work will be remembered for its contribution to…"
- "He was an inspiration to others because…"
- "The story of his life teaches us that…"
- "He'll always be remembered as someone who lived with…"
- "Finally, if [name] were here with us today, he'd remind us that…"

This is the "My Eulogy" exercise from the paid LifeOS **Life Compass** module — **given away in full**, as sentence stems rather than an open question. Sentence stems are the key design choice: they make a heavy, abstract prompt answerable in three minutes.

Also featured: Sahil Bloom's **5 Types of Wealth** (physical / social / time / mental / financial) with an accompanying Wealth Score Quiz.

---

### 2.9 The Quarterly Alignment Workshop workbook — **full field-level transcript**

[VERIFIED] This is the most valuable artifact in this research: an **actual, complete Ali Abdaal goal-setting workbook**, publicly readable, with every prompt intact.

- Source newsletter: `https://aliabdaal.com/newsletter/its-time-for-your-quarterly-reflection/`
- Workbook (live Google Doc, "File → Make a Copy"): `https://docs.google.com/document/d/1616n-jX0tPjtcYRbRPmd9Qs-qFFF1SY9dCxmbgBUm9I/template/preview`
- Title: **"Alignment Workshop – June 2024 · Plan Your Next 90 Days to Make 2024 the Best Year of Your Life"**
- Free live Zoom, **~3,000 live attendees**, run **quarterly** (this one June 2024; next announced for Sunday 22 Sept 2024, "free-for-all"). Explicitly a **lead magnet for Productivity Lab**.

**Onboarding copy inside the workbook** (worth copying — it pre-empts the two main failure modes):

> "It's totally okay if you're not sure about your answers to some of these questions. It's also totally okay if you feel like you didn't have enough time during the live session to complete this fully – **think of this as a v1 which you can always tweak later** 🙂"

**Structure: 4 sections.**

**§1 — Reflect** ("Reflecting on 2024 so far…")

| Field | Prompt (verbatim, condensed) |
|---|---|
| 📅 **Key Events** | "What actually happened so far in 2024? Take a look through **your calendar** (and your **Weekly Reflection Log**, if you have one) and note down the key moments from each month." — rendered as a **table: rows = months, columns = Work \| Life** |
| 🏆 **Milestones** | "What were the **1–3 most significant** events or achievements so far in 2024 for you? How did these impact your life?" |
| 💪 **Challenges** | "What were the biggest challenges or obstacles…? How did you overcome them, and what did you learn?" + explicit self-compassion framing: "it's totally okay that you might've 'missed' some goals" |
| 👥 **Relationships** | "Reflect on your relationships… How have they evolved? Were there new relationships that had a significant impact on you?" |
| 🎓 **Professional Growth** | "How have you progressed in your career or studies? What were the key learnings and how have they shaped your future aspirations (if at all)?" |
| 🚀 **Looking Forward** | "Based on your experiences…, what would you like to do differently for the next 3 months? Are there new areas you'd like to explore or changes you want to make?" |

**§2 — Align** (two sub-blocks; both assume artifacts produced in the *Annual* workshop)

- **⭐ Align to your Life Vision**
  - *Looking Back:* "How closely have your actions over the past few months aligned with your overarching life vision? Consider areas where you've excelled and areas where you might be a little misaligned."
  - *Looking Ahead:* "What specific actions could you take **in the next 12 weeks** to get more aligned with your life vision?"
- **🎯 Align to your Annual Goals**
  - *Annual Goal Review:* "Review each of your annual goals. **Which have you made progress on, and which are lagging behind? Do any of them need updating or removing?** For each goal that's still on the list, what **1–3 specific steps** could you take to realign, make progress or accelerate your progress in the next 12 weeks?"
  - Fallback for people with no annual goals: "What are **3–5 goals** you'd like to achieve by the end of 2024?" with numbered slots Goal #1–#4.

**§3 — Plan your Quarterly Quests.** A four-column table, **three quest slots** (Quest #1, #2, #3). This is the **GPS Method fully expanded** — the sub-fields are the real content:

| Column | Sub-fields and their verbatim prompts |
|---|---|
| 🚀 **Quest Name** | "Choose a **fun name** for the quest :)" (Ali's own examples: *Operation Banger*, *Operation Gymshark*) |
| 🎯 **Goal** | **Facts** — "What will be true when you've accomplished the goal? Describe the tangible outcomes… These are the facts that will confirm your success."<br>**Feelings** — "How will you (and/or others around you) feel when you've accomplished the goal?… How will it affect those around you?"<br>**Function** — "What function does this goal unlock? Think about **why** this goal matters to you. What new opportunities or benefits will it provide?" |
| 🗾 **Plan** | **Steps** — "What are the **3–5 major steps**…? Identify the key actions or milestones."<br>**Schedule** — "What's the rough schedule, or timeline? Estimate a timeframe for each step… creates a sense of urgency."<br>**Support** — "**Who could you enlist for help?** … mentors, friends, family, or professionals."<br>**Snags** — "What **potential obstacles** might you encounter, and **how would you overcome them**?" |
| ⚙️ **System** | **Actions** — "What **daily or weekly** actions will help you get to the goal? These should be **regular habits or practices**."<br>**Accountability** — "**How will you track your progress? Who's your accountability buddy or group?** Regular check-ins with them can help you stay on course."<br>**Adaptation** — "**How will you adapt if things don't go according to plan?** Flexibility is key." |

So the real acronym expands to **G**(Facts·Feelings·Function) → **P**(Steps·Schedule·Support·Snags) → **S**(Actions·Accountability·Adaptation). Note that **accountability and failure-planning are fields in the goal object itself**, not afterthoughts.

**Two fully worked examples are shipped pre-filled in the template**, written by Ali about his own quarter, in his own casual voice ("Everything's happening in May lol"), each ending with a candid *Snags → plan* pair:
- *Operation Banger* (business): "Materials not ready in time → Make sure I've got entire days in the calendar ahead of time to prep slides and material."
- *Operation Gymshark* (health): "Things getting derailed by work → Don't let it lol. **Pre-book and pre-pay for PT.**" · "Not making the time for getting the steps in → **Build a work routine that has ambient walking built-in.**"
- The health example adds a fifth field the blank slots don't have: **Tracking** (progress pics, measurements, DEXA, daily weights, app) — separate from Accountability.

**§4 — Concluding**
- 🙏 **Gratitude:** "What are you most grateful for in 2024 so far? Think about people, experiences, or opportunities that enriched your life."

**Cross-product notes revealed by this doc:**
- Productivity Lab **Cohort 2** of "The Life Productivity System" (a **90-day / 12-week** programme) kicked off **Monday 8 July 2024**; a later newsletter names 7 July. The founding cohort target in Ali's own worked example was **500 students, 450 5-star reviews, 250 testimonials**.
- Productivity Lab's coaches ran separate **"Life Vision & Goal-Setting Workshops"** for cohort students.
- A **"Weekly Reflection Log"** is referenced as an assumed existing artifact.
- The Jan 2024 Annual Planning Workshop content was later released as **"a playlist of 3 videos"** so non-attendees could self-serve.
- **Quest-count inconsistency:** this 2024 workbook provides **3** quest slots; the 2025 LifeOS teaching is **one professional + one personal** (2). The constraint tightened over time.

---

### 2.10 The Annual Review Notion template — actual field names

[VERIFIED, with caveat] Ali's own annual-review Notion template is **no longer distributed by him**. A third-party re-upload is live and readable: `https://jafonso.notion.site/Annual-Review-Ali-Abdaal-16a684d1596e80bf8556d6e616f208c1` (listed on Notion Marketplace as "Ali Abdaal Annual Review"; the uploader states "it is no longer available on the original video, so I thought to re-upload it here"). Fields below are verbatim from that page; **I cannot verify Ali's original was byte-identical.**

**Top-level sections:** 👩‍❤️‍👨 People · 🚀 Experiences · 🚀 Accomplishments · 🚀 Things · 🚀 Game Changers · 🚀 The Big Picture · 🚀 Timeline · 🚀 Articles/Blog Posts · 🚀 Podcasts · 🚀 Books · 🚀 YouTube Channels/Videos · Visualization Exercises · Add a new goal.

**Reflection prompts (verbatim).** Note how many are *paired opposites* — a distinctive design:
- "What were the 'difficult' things this year? Any challenges?"
- "When have you felt proud of yourself this year? What were you doing?"
- "If you had to teach one thing you learnt this year (that would improve one's quality of life) what would that be?"
- "What kept you up at night with excitement this year? Was it worth it? Would you want to do more of it?"
- **"How did you have fun differently this year?" / "How did you suffer differently this year?"**
- **"What people/kind of people did you spend less time with this year?" / "…more time with this year?"**
- "What did you feel guilty for this year?"
- "Think of the people that you are most grateful to this year. How can you thank them? How can you find more people like this in your life?"
- "What new habits did you create this year? Which ones would you want to keep?"
- "Did you feel you spent enough time with your family/significant other this year? How would you change this next year?"
- "What things did you stop caring about this year?"
- **"What new thing did you spend a lot of money on this year?" / "…a lot of time on this year?"**
- "What do you feel you've gotten a lot better at this year?"
- "What pleasure did you rediscover this year?"
- "When you felt at peace this year, what were you doing?"
- "Which of last years goals did you not achieve? Why did you not achieve them? Will you carry them on to next year and if not why?"
- "At the end of next year, if you are drastically exceeding your expectations, what would you be doing?"

---

### 2.11 Free lead magnets

- **7 Day Focus Crash Course** — free 7-day email drip. Five published learning outcomes (build laser-like focus · work with your brain not against it · overcome digital distractions · stay energised · create a productive work environment). **The day-by-day breakdown is not published** — the page lists themes, not Day 1/Day 2/… titles.
- **GPS Coach GPT** — free CustomGPT, email-gated: "help you **choose one goal**, put together a **simple 90-day plan**, and map out a **tiny system** to actually follow through." This is the GPS framework as a conversational intake.
- **Business Class** — free email list, 2–3 issues/month, BTS Looms/presentations/write-ups from his team. Signup is via a **Typeform survey**, not a plain email field.
- **LifeNotes** newsletter — see §5.

---

## 3. Pedagogy & Completion Mechanics — the patterns

These are the transferable mechanics, ranked by how strongly they're evidenced.

**A. Sell the system, but charge for the accountability.** Productivity Lab's $997 included LifeOS ($297) *for free*. The paid object was the scaffolding: daily focus labs, pods, weekly reflection workshops, monthly reviews. Ali's own stated reasoning: *"even the best system in the world only works if you consistently implement it… Ever since university when I'd organise co-working study sessions, my personal productivity has always been supercharged by working with others."*

**B. The small-group squad with a scripted weekly agenda.** LBA's is the most explicit spec I found anywhere:

> "You'll be placed in a **Squad of ~6 students** with **one dedicated coach** who leads a **45-minute weekly Zoom session** where each person **shares wins**, **reports on last week's commitment**, **sets one priority for this week**, and **flags any blockers** — a format used by Oxford and Cambridge Universities."

Four fixed slots, ~7 minutes per person, same every week. Copy this verbatim.

**C. Live co-working as the retention engine.** "Focus Labs" ran ~**6 sessions a day on weekdays**; testimonials say members attended 3 of 6. Every Productivity Lab testimonial on the sales page names Focus Labs as the best part. Synchronous body-doubling outperformed the content.

**D. Drip-release to prevent binge-and-abandon.** LBA: content is "**released as you progress** through the programme, **so you don't binge and burn out**." Each module ends with a **reflection survey**.

**E. Reflection surveys as the completion gate.** 7 Video Challenge: the $295 refund requires a reflection form after *every* video, not just the videos. The refund is the carrot; the survey is what actually produces the learning. PTYA does the same at a coarser grain: the money-back guarantee **only applies if you completed the entire course** ("'Do the work' technically means completing the core modules").

**F. Deposit-refund as a commitment device.** 7 Video Challenge is a pure implementation: pay $295, do the work, get it all back. Time-boxed at 7 months, one-time-only, non-repeatable.

**G. Effort-gated guarantees.** LBA's ROI Guarantee requires, verbatim:
- Attend **90% of your weekly squad sessions** (45 min each)
- Submit your weekly **Lifestyle Business Scorecard** (5 minutes)
- Submit your weekly **Pulse** (10 minutes)
- "Show clear proof of effort: course progress and the weekly actions you commit to with your coach"
- Pick a coach-approved idea scoring **8+ on the DREAM Score**

Two separate weekly instruments (Scorecard, Pulse) with **published time costs** — 5 min and 10 min. Naming the time cost is itself a compliance device.

**H. Nested planning cadence.** Consistent across products: **3-year roadmap (Future Sketch) → quarterly quests (90 days) → balanced weeks (weekly, 30 min) → productive days (morning manifesto, 5 min) → focus hours (60-min blocks)**. Every horizon has a named ritual and a stated duration. Ali's own summary of the quarterly layer: *"one hour of planning for three months of focused action."*

**I. Radical constraint on goal count.** One professional + one personal goal per quarter. Three priorities per week. One priority per morning. The system's defining move is subtraction, not capture. He teaches this via a **Bezos/Jeff Wilke analogy** — "you have to release the work at the right rate that the organisation can accept it" — applied to a person: *"a business, once established, is more likely to die of overeating than of starvation."* His stated ceiling: *"I can only really make meaningful progress on 1–3 things at any given time."*

The screening question he uses, worth lifting verbatim as a UI prompt:

> **"What am I already doing that this would compete with?"**

And his framing of who the product is for: *"rather than screwing up our lives due to laziness and sloth, we're actually much more likely to burn ourselves into the ground through ambition, lack of balance, and a failure to show restraint when setting goals."*

**J. Menus, not willpower.** The Activation / Reactivation / Recharge menus are pre-committed decision lists built in a calm moment and consulted in the failure moment — mapped explicitly to starting, sustaining, recovering.

**K. Measurement as the single highest-leverage habit.** *"If the only change you made to your life was to consistently track your focus minutes, you'd probably double your productivity."* The focus log has only five fields and one of them is a free-text reflection.

**L. Publish the anti-persona.** Productivity Lab's page lists four types of people it is *not* for. LBA: "It's an application, **not a checkout**. We don't take everyone." Screening out is marketed as a feature.

**M. Facilitation craft in live sessions.** Timeboxed prompts (~3 min each), ambient music, eyes-closed prompt delivery before writing, group setting for heavy questions. Ali: *"doing stuff like this in a group setting, with the right background music, and the right framing beforehand, is super helpful."*

**N. The free live workshop as the top of the funnel — and as real teaching.** The annual summit (**Spark**, ~90–110k registrants) and the quarterly resets (~3,000) are free, live, and ship a **complete, genuinely usable workbook** that you copy into your own account. **Spark's Day 1 = VISION / Day 2 = ACTION is literally the architecture of the $297 course.** He gives away the map — including the Life Compass eulogy exercise in full — and sells the system. The monetisation is asynchrony, not content: **live is free, recordings are $97 (VIP)**. They are unmistakably lead magnets for the paid programme — the Alignment workbook plugs Productivity Lab three separate times mid-document — but nothing is withheld. The one thing he *did* hold back was step 3 of the annual method, "as a surprise for the wonderful people attending". Note also the **calendar-forming effect**: the workshop cadence *is* the review cadence he's teaching, so attending the funnel event is itself the habit.

**O. Pre-filled worked examples in the author's own voice.** Every blank slot in the Alignment workbook is preceded by two of Ali's own real, messy, first-person quests — including the embarrassing bits ("Don't let it lol"). This solves blank-page paralysis far better than an abstract instruction would.

**P. "This is a v1" permission-giving.** Both the workbook intro and the LifeOS teaching hammer the same anti-perfectionism message: think of this as a v1 you can tweak later; "start before you're ready"; a good goal acted upon beats a perfect goal contemplated forever. Paired with **timeboxed prompts**, this is a deliberate system for getting output from people who would otherwise stall.

**Q. One reflection instrument, reused at every horizon.** The Spark annual prompts and the quarterly Alignment prompts are near-identical (Milestones · Gratitude · Challenges · Professional Growth · Relationships · Looking Forward), just rescoped from 12 months to 90 days. Users learn one instrument and apply it four-plus times a year. Cheap to build, compounding to use.

**R. Sentence stems for the heavy questions.** The eulogy exercise ships as **10 fill-in-the-blank stems**, not "write your eulogy". Combined with a 3-minute timer, this converts an intimidating existential prompt into a completable task. Same trick in the Annual Review template's **paired opposites** ("How did you have fun differently this year?" / "How did you suffer differently this year?").

**S. Publish the workshop's exercises afterwards.** He reposts the full prompt set in the newsletter after each event — turning a one-off live session into evergreen content, proof of value, and FOMO for the next one. That is *why* this research could recover the prompts at all.

**T. Gamified badges** — used in Productivity Lab's Circle community era (a member describes earning badges like "🎭 Community Champion" via Zapier automations for actions like posting an intro). [INFERRED that this was Ali's own implementation — the student describes running the same mechanic in *their own* course after seeing it at Ship30for30 and in the Lab; treat as weakly attributed.]

---

## 4. Onboarding, Intake & Diagnostics

| Programme | Intake |
|---|---|
| **LBA** | 3 steps, published: **(1)** 5-minute application "about where you are now and what you'd love to build"; **(2)** if a fit, **book an interview call**; **(3)** "we decide together" — two-way conversation, then **matched with a coach and a Squad**. "We match you to a coach during your application review." Cohorts are capped. First real diagnostic inside the programme is the **DREAM Score** on your business idea (must reach 8+). |
| **Productivity Lab** | **Onboarding call with an expert productivity & accountability coach** was a headline inclusion. Content of that call is not published. Then assignment to an **Accountability Pod**. |
| **LifeOS (Pro tier)** | Also included an "Onboarding call with one of our expert productivity coaches" plus a "**Personalised Productivity Action Plan**". The base $297 tier has **no intake at all** — you buy and start. |
| **LifeOS (course-internal)** | The de-facto diagnostic is the **Life Compass** module itself: My Eulogy, Bucket List, Mission, Success prompts — a values/vision audit run *before* any goal-setting. |
| **PTYA** | No intake. Exception: **scholarship applicants** must be 18+, have a channel with ≥3 published full-length videos, complete every form question, and upload an **unlisted YouTube video of max 2 minutes** covering why they'd benefit, why they need a scholarship, and their channel goals. Over-length videos are auto-rejected. Reviewed monthly. |
| **GPS Coach GPT** | Free conversational intake: choose one goal → 90-day plan → tiny system. Effectively the LifeOS Quarterly Quests module compressed into a chatbot. |
| **Business Class** | Signup is a Typeform **survey**, not a bare email capture. |

**Notable:** none of his *own* productivity products opens with a scored assessment or quiz. The in-product "diagnostic" is always **structured reflective journaling** — the Life Compass in LifeOS, §1 "Reflect" of the Alignment workbook — never a questionnaire and never a score. The only numerically scored diagnostic he sells is LBA's DREAM Score, and that scores the *idea*, not the person.

**But he has published — and personally taken — a scored 20-question productivity self-assessment.** [VERIFIED] Source: `https://aliabdaal.com/newsletter/20-questions-to-change-your-life/`. It is **Chris Sparks' / Forcing Function "Performance Assessment"**, not Ali's own (he states there's no sponsorship or affiliate relationship), but he reproduced all 20 items in full and scored himself **45/100** publicly — "way lower than I expected… thinking about the questions I scored lowest on helped me uncover some personal blind spots."

Scoring: each item rated **1–5** (strongly disagree → strongly agree), summed to **/100**. His published interpretation bands: **100** = "unstoppable force of nature" · **60** = "decent, room for improvement" · **20** = "you have no clue what you're doing."

**The four categories and their framing questions — this is a ready-made intake instrument:**

| Category | Framing question | Items |
|---|---|---|
| 🗺️ **Vision** | *"Are you designing a life in alignment with your top values?"* | 1. Do you have a life mission you want to achieve? · 2. Do you have a vision for your career? · 3. Do you have a consistent **long-term review** process? ("regularly reserve time to review wins, lessons, and opportunities") · 4. Do you have a consistent **long-term planning** process? ("define objectives, set actionable goals, and reallocate resources") · 5. Do you keep track of your projects? ("defined deadlines and clear objectives") |
| 🚦 **Prioritisation** | *"Are you working on the most important things?"* | 6. Plan and review top priorities for the **week**? · 7. …for the **day**? · 8. Do you work on your **Top Priority first** each day? ("delay email, phone, and reactive work until after") · 9. Do you have control over your own schedule? · 10. Are you decisive? ("minimize procrastination on difficult or ambiguous tasks") |
| 🏭 **Systems** | *"Are you making what you want to do easier to do?"* | 11. Do you leverage your time well? · 12. Do you manage and delegate well? · 13. Does your **physical workspace** inspire you? · 14. Do you **track important metrics**? ("health, time, habits, finances, business") · 15. Do you have **systems for learning**? |
| 🧘 **Presence** | *"Are you showing up as your best self every day?"* | 16. Do you **start your day intentionally**? · 17. Are you focused? ("check email and messages only at pre-selected times") · 18. Do you prioritise **physical health**? · 19. Do you prioritise **mental health and recovery**? ("diverse identity with hobbies and supportive friends") · 20. Do you **finish your days effectively**? |

Follow-up instruction: *"Once you've got your final score, think about how to improve your weakest areas."* Note how cleanly the four categories map onto his own product architecture — **Vision** and **Systems/Prioritisation/Presence** are LifeOS's Vision and Action pillars.

**The intake pattern he actually uses is: look backwards before you look forwards.** Every planning artifact he ships — annual and quarterly — opens with a reflection pass over the *previous* period, sourced from **the user's own calendar** rather than from memory or from a form. Only then does it move to vision alignment, and only then to goal-setting. His stated reason: *"Reflect on the past first to know what to focus on in the future."*

---

## 5. LifeNotes / Sunday Snippets — newsletter structure

**The rename is dated** [VERIFIED]: announced **31 July 2024**, in the issue `aliabdaal.com/newsletter/introducing-lifenotes/` and on X/LinkedIn — *"After 6+ years, Sunday Snippets is getting a makeover. Say hello to LifeNotes."* First Sunday Snippets edition: **April 2018, to ~264 people.**

**The four declared changes** (a useful case study in deliberately *reducing* structure):
1. **Flexibility** — "We're no longer tied to Sundays."
2. **Expanded Content** — "You'll start seeing more of my raw notes from books, podcasts, and conversations."
3. **"Publish Most Weeks"** — "I'm giving myself permission to skip a week if I don't have anything substantial to share… 'Write most days, publish most weeks'."
4. **More Personal** — "I'd love LifeNotes to feel like you're literally getting an email from me that I've written directly in a Gmail compose window."

**Segment structure across three eras** [VERIFIED by reading real issues]:

| Era | Segments |
|---|---|
| **A — Sunday Snippets, ~2020** | main essay · promo slot · `This Week On Not Overthinking` · `My Favourite Things This Week` · `Quote of the Week` · `Tweet of the Week` · `This Week's Videos` |
| **B — Sunday Snippets, ~2022–23 (mature)** | "Hey friends," → main essay → "Have a great week! / Ali xx" + PS/PPS/PPPS · sponsor-or-own-product slot · **`❤️ My Favourite Things this Week`** (numbered, each tagged by media type — 📚 Book, 🎬 YouTube Video, Podcast, and freeform ones like *Kitchen Equipment*, *Pocket Notebook*) · **`🎬 My New Videos`** · **`✍️ Quote of the Week`** (blockquote + attribution + "Resurfaced using Readwise") |
| **C — LifeNotes, 2025–26** | **Fixed segments abandoned.** Five recent issues read in full contain **zero H2 headings** — single personal essays ending "Have a great week! / Ali xx", usually with a reply-CTA ("I'd love to hear what comes up for you. Hit reply and let me know"). "My Favourite Things" survives only as an occasional **whole-issue theme**, roughly monthly |

**Cadence reality-check** [VERIFIED from the RSS feed/archive]: 8 Sep, 12 Oct, 9 Nov, 16 Nov, 30 Nov 2025; 2 Jan, 9 Jan, 18 Jan, 15 Feb, 22 Feb 2026 — **and nothing after 22 Feb 2026** as of Aug 2026. "Weekly(ish)" is generous; the real rate is ~2/month with multi-month gaps.

**Subscriber counts over time** [VERIFIED from live + archived pages]:

| Date | Claimed count |
|---|---|
| Apr 2018 | ~264 (first edition) |
| Aug 2021 | "more than 100,000" |
| Jun 2022 | **"Join 137,319 friendly readers"** (exact) |
| Jun 2023 | "more than 300,000" |
| May 2024 | "over 275,000" ← **went down** (likely list cleaning) |
| Jul 2024 | 300,000 (rebrand issue) |
| Jan 2026 | "over 370,000" |
| Aug 2026 | **"over 443,000"** |

⚠️ His own site is internally inconsistent — the top nav says "Join 230k+ Subscribers" while the body form says 443,000. These are marketing numbers, not audited.

Also note the **opt-out-of-a-sub-sequence** pattern: during book launch week he offered a one-click link to opt out of *just* the extra launch emails while staying subscribed. And he runs **more than one list** — consent copy on newer pages names both **"LifeNotes"** and **"Productive Notes"**, plus **"Freedom Notes"** for the LBA audience.

---

## 6. Total Time Commitment (published figures)

| Programme | Published expectation |
|---|---|
| **LifeOS** | 2–3 h setup + 30–60 min/week ongoing; results over 4–12 weeks |
| **LifeOS live cohort (Jan 2025)** | 3 weekly live sessions, ~2 h each ≈ 6 h live |
| **Quarterly planning (GPS)** | ~1 hour per quarter |
| **Weekly review (Balanced Weeks)** | 30 min (student says "or even 5") |
| **Daily (Morning Manifesto)** | 5 min |
| **Focus Hour** | 60 min = 5 organise / 50 focus / 5 reflect |
| **LBA** | **5–10 h/week for 6 months** (~130–260 h), incl. 45-min squad call + Scorecard (5 min) + Pulse (10 min) |
| **PTYA** | 20+ h core video, 16+ h bonus; no pacing prescribed |
| **7 Video Challenge** | 7 videos within 7 months; self-paced |
| **Annual Planning Workshop** | 3–3.5 h, once a year |
| **Productivity Lab** | 12-week programme; Focus Labs ~6/day available, members attended ~3 |

---

## 7. Source List

**Primary (his own pages, all read via the r.jina.ai proxy):**
- LifeOS — https://aliabdaal.com/lifeos
- LifeOS (ad landing page, incl. the retired **LifeOS Pro** $347+$85/mo tier) — https://aliabdaal.com/fb-lifeos/
- LifeOS $197 promo variant — https://aliabdaal.com/ai-life-coaching-confirmation/
- Productivity Lab (2025 archive, $997) — https://web.archive.org/web/20250324064443/https://aliabdaal.com/productivity-lab
- Productivity Lab (current — now serves LifeOS) — https://aliabdaal.com/productivity-lab
- Part-Time YouTuber Academy — https://aliabdaal.com/part-time-youtuber-academy
- 7 Video Challenge — https://aliabdaal.com/7-video-challenge/
- Viral Thumbnail Pack ($49) — https://aliabdaal.com/viral-thumbnail-pack/
- 7 Day Focus Crash Course — https://aliabdaal.com/7-day-focus-crash-course/
- GPS Coach GPT — https://aliabdaal.com/gps-coach/
- Lifestyle Business Academy — https://lifestylebusiness.com/academy
- LBA waitlist page (7 pillars) — https://aliabdaal.com/lifestyle-business-academy/
- LBA application — https://aliabdaal.com/lifestyle-business-academy-application/
- Business Class — https://aliabdaal.com/business-class/
- Entrepreneurs Mastermind (Bali, Sep 2025) — https://aliabdaal.com/mastermind-workshop/
- Superfocus — https://www.superfocus.me/
- Feel-Good Productivity — https://feelgoodproductivity.com/
- LifeNotes newsletter — https://aliabdaal.com/newsletter
- **Annual reflection & goal-setting method (Sunday Snippets, 24 Dec 2023)** — https://aliabdaal.com/newsletter/my-annual-reflection-goal-setting-method/
- **Quarterly Alignment Workshop recap (LifeNotes)** — https://aliabdaal.com/newsletter/its-time-for-your-quarterly-reflection/
- Goal-load constraint + the "$1k Challenge" origin of LBA — https://aliabdaal.com/newsletter/my-biggest-mistake-with-goal-setting/
- Post-Spark-2026 issue ("What's the point of goals?") — https://aliabdaal.com/newsletter/whats-the-point-of-goals/
- **★ Spark 2025 debrief with the full 8 reflection prompts + eulogy sentence stems** — https://aliabdaal.com/newsletter/110000-people-registered-for-this-workshop-heres-what-we-learned/
- Spark 2026 agenda (Wayback, 18 Dec 2025) — https://web.archive.org/web/20251218113036/https://aliabdaal.com/spark-2026/
- Summer Reset 2026 — https://aliabdaal.com/summer-reset-2026/ · Summer Reset 2025 replay — https://aliabdaal.com/summer-reset-2025/
- Newsletter rebrand issue (Sunday Snippets → LifeNotes, 31 Jul 2024) — https://aliabdaal.com/newsletter/introducing-lifenotes/
- Sunday Snippets era-B format sample — https://aliabdaal.com/newsletter/failing-with-abandon/
- **★ "20 Questions to Change Your Life" — the full scored Performance Assessment (Chris Sparks / Forcing Function)** — https://aliabdaal.com/newsletter/20-questions-to-change-your-life/ · instrument at https://www.forcingfunction.com/assessment
- Part-Time YouTuber Crash Course — https://aliabdaal.com/part-time-youtuber-crash-course/
- Indistractable in 5 Days (w/ Nir Eyal) — https://aliabdaal.com/indistractable-in-5-days/
- Free YouTube Notion templates (email-gated) — https://aliabdaal.com/youtube-notion-templates/
- **Annual Review Notion template (third-party re-upload, readable)** — https://jafonso.notion.site/Annual-Review-Ali-Abdaal-16a684d1596e80bf8556d6e616f208c1
- Ali on LinkedIn, Spark 2026 final numbers (89,256 signups) — https://www.linkedin.com/posts/ali-abdaal_89256-people-signed-up-for-our-spark-summit-activity-7416830796700807168-vObJ
- **★ Alignment Workshop June 2024 workbook (full GPS worksheet, publicly readable)** — https://docs.google.com/document/d/1616n-jX0tPjtcYRbRPmd9Qs-qFFF1SY9dCxmbgBUm9I/template/preview
- Notion templates shop (currently empty) — https://shop.aliabdaal.com/collections/notion-templates
- productivitylab.com (now serves Lifestyle Business Academy) — https://www.productivitylab.com/
- Site page sitemap (used to enumerate products) — https://aliabdaal.com/page-sitemap.xml

**Third-party — student first-hand accounts (Lukas Zangerl, neurohackingly.com):**
- LifeOS Week 1 Pt.1 (Life Compass exercises, session-1 quotes) — https://www.neurohackingly.com/life-os-w-ali-abdaal-day-1/
- LifeOS Week 1 Pt.2 (the 3 Menus) — https://www.neurohackingly.com/lifeos-w-ali-abdaal-day-1-p-2
- LifeOS Week 2 (Morning Manifesto) — https://www.neurohackingly.com/reactive-proactive-life-os-week-2
- LifeOS Part 3 (course launch, 7 modules, Notion template, Productivity Lab → LifeOS history) — https://www.neurohackingly.com/lifeos-w-ali-abdaal-part-3-2
- LifeOS Part 4 (GPS framework, quarterly quests) — https://www.neurohackingly.com/the-90-day-success-formula/
- Productivity Lab: focus log fields + the 60-minute hour — https://www.neurohackingly.com/productivity-lab-journey-focusing-on-focus/
- Annual Planning Workshop 2024 review (worksheet prompts, 3-min timeboxing) — https://www.neurohackingly.com/my-review-on-ali-abdaals-feel-good-productivity-annual-planning-workshop-2024

**Third-party — independent commentary:**
- Mark Ellis, "Ali Abdaal's $2million 'disaster'" (Jan 2023) — cohort-course demand decline, team overhead — https://markellis.substack.com/p/ali-abdaals-2million-disaster

**Consulted and rejected:** `digitalassistant.academy`, `gigacourses.com`, `udcourse.com`, `loadcourse.com`, `courseslibrary.com`, `beastcourses.com`, `downloadcoursesnow.com`, `imarketing.courses`, `greatxcourses.com`, `tscourses.com`, `buycheapcoursesnow.com`. These are **course-piracy resale sites**. Their "curriculum outlines" (e.g. "Module 1: Foundations of Productivity, Module 2: Time Management and Prioritization…") are **generic AI-generated SEO filler** that does **not** match the real module names on Ali's own page (Life Compass, Future Sketch, Quarterly Quests, Focus Hours, Productive Days, Balanced Weeks). **Do not cite them.** Any research summary that reports those module names has been contaminated by this source class.

---

## 8. Confidence & Gaps

**High confidence [VERIFIED]:** all prices except LBA; LifeOS's 6 published module names and descriptions; PTYA's 10-chapter outline, named frameworks, inclusions and $995 price; LBA's 14 modules / 112 lessons / 13 h, 3 phases, squad format, ROI-guarantee conditions, 5–10 h/week, application process; 7 Video Challenge's full refund mechanic and reflection-survey gate; Productivity Lab's 2025 inclusions and $997; the Annual Planning Workshop's 3-step method, two worksheet prompts, and format; LifeNotes' segment structure from a real archived issue; the LifeOS session-by-session content from a named attendee who published contemporaneously.

**Commercial structure note** [VERIFIED at checkout]: the LifeOS checkout runs on `lifestylebusiness.com` infrastructure and the Terms name the legal entity **"Sparkle Studios"**. The whole catalogue has been consolidated under the Lifestyle Business brand — `productivitylab.com`, `lifestylebusiness.com` and `aliabdaal.com` now share a backend, and `aliabdaal.com/spark/` redirects to a LifeOS sales page. The **$97 Spark-recordings order bump attached to the $297 LifeOS checkout** is the clearest picture of the funnel: free summit → paid recordings → paid course.

**Medium confidence [INFERRED]:**
- LifeOS module count 6 vs 7 — sales page says 6, student says 7. Probably an intro module.
- Productivity Lab's earlier $29/mo · $299/yr pricing — surfaced only in a search snippet of a member-forum post I could not open; the $997/yr figure is the verified one.
- Exactly *when* Productivity Lab was retired. **That it is retired is now [VERIFIED]** — both `aliabdaal.com/productivity-lab` and `productivitylab.com` have been repointed. The date and any official announcement were not found; the last archived live sales page I have is 24 Mar 2025.
- The Sunday Snippets → LifeNotes rename date.
- The badge/gamification mechanic's attribution to Ali's community specifically.

**Could not see — paywalled or unpublished:**
1. **Inside LifeOS itself.** Lesson-level titles, video lengths, and the **Notion template's actual fields** are all behind the $297 paywall. What Life Compass's "4-part framework" consists of is not published — I have four *exercise names* from a student (My Eulogy, Bucket List, Mission, Success) which may or may not be the four parts.
2. **The LifeOS-era worksheets.** The one complete workbook I recovered (§2.8) is from the **free June 2024 Alignment Workshop**, not from inside the paid course. The paid LifeOS Notion template's fields remain unseen — though §2.8 is almost certainly a close ancestor of the Quarterly Quests module. The **Annual** Planning workbook itself (as opposed to the Quarterly one) was not recovered; only two of its prompts, quoted by an attendee.
3. **LBA's price.** Application-gated and not published anywhere I could find, including Reddit.
4. **LBA's 14 module titles and 112 lesson titles.** Only the 3 phases are public. One lesson ("Validation · Lesson 39") is previewed as video only.
5. **The DREAM Score's five criteria.** Named and numerically scored, but the acronym is never expanded publicly.
6. **The 7 Day Focus Crash Course day-by-day breakdown — [VERIFIED NEGATIVE].** Checked the live page and three Wayback snapshots (Apr 2024, Sep 2024, Jan 2025): **no version has ever published Day 1/2/3… titles.** Only five thematic outcomes. Any source claiming to list its daily topics is fabricating. (By contrast his *Part-Time YouTuber* crash course does publish some day titles, so the pattern is inconsistent, not a policy.)
6b. **Two Productivity Lab artifacts I saw named but could not verify:** a **"Life Productivity System Handbook"**, and a five-part daily routine **"Align, Focus, Recharge, Reflect, Organize"**. Both surface only on course-piracy sites, so despite sounding plausible (and "Recharge" matching the verified Recharge Menu) they are **[UNVERIFIED]** and must not be quoted as his.

7. **Productivity Lab's 12-week week-by-week syllabus.** I have one week ("FOCUS") from a student's notes and a general list of covered domains (sleep, nutrition, burnout prevention, mindset, workspace design). The full 12-week sequence was never published and the product is retired.
8. **Real completion/drop-off rates.** The only quantitative signal anywhere is the 7 Video Challenge's "over $5,000 refunded" (~17 completers). No published completion stats for any other product.
9. `lab.aliabdaal.com` (the Circle community) — member-gated; only post titles were visible via search.
10. **Independent student reviews are genuinely scarce.** Despite repeated targeted searching, I found **no substantive Reddit thread and no Trustpilot presence** for LifeOS, Productivity Lab, or PTYA. Reddit's API and search both blocked automated access, and general web search surfaces only (a) his own testimonials and (b) course-piracy SEO pages. The only detailed independent first-hand account located anywhere is the neurohackingly.com series. **Treat the absence of criticism in this document as a search limitation, not as evidence that none exists.**
