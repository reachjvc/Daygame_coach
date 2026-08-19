# 14 — Harm Reduction & Moderation

First-person accounts from people whose goal was **reduction, not abstinence** — and from people who tried
reduction and abandoned it. Collected for the recovery-support product, which currently assumes stopping or a
bounded break.

**This document does not advocate.** Moderation held for some of the people below over years. It failed for
others, sometimes badly. Both are recorded at full strength.

---

## 1. Sources, access notes, verification

### Sources actually used

| Source | What it is | Access |
|---|---|---|
| **HAMS** (`hams.cc`) | Harm Reduction, Abstinence and Moderation Support — peer-led, "any positive change" | ✅ raw HTML |
| **HAMS book excerpt** (thefix.com) | Member story republished from HAMS' book | ✅ raw HTML |
| **Moderation Management** (`moderation.org/testimonials`) | MM's public member-quote page | ✅ raw HTML (blog + forum are members-only / 403) |
| **Mumsnet Alcohol Support** | UK parenting forum, very active alcohol board, pseudonymous, dated | ✅ raw HTML |
| **r/Petioles** | cannabis moderation | ✅ via arctic-shift archive API |
| **r/dryalcoholics** | drinking, moderation-tolerant-ish | ✅ via arctic-shift |
| **r/Alcoholism_Medication** | naltrexone / Sinclair Method | ✅ via arctic-shift |
| **Gilbert et al. 2026**, *Choosing and Managing Non-Abstinent Recovery* (PMC12873455) | peer-reviewed qualitative study, 2026, untreated-recovery adults, verbatim participant quotes under researcher-assigned pseudonyms | ✅ |
| Henssler et al. 2021 (PMID 33188563); Jonas et al. 2014 (PMID 24825644); Bold et al. 2016 (PMID 27690505) | evidence base | ✅ PubMed abstracts |

### Access failures — recorded so nobody repeats the work

- **Live Reddit is fully blocked from this environment**: `reddit.com`, `old.reddit.com`, `api.reddit.com`,
  `.json` endpoints → HTTP 429; Redlib/safereddit mirrors → 403/browser-challenge; `r.jina.ai` → 403;
  **Wayback replay of `reddit.com/*/comments/*` → HTTP 498** (CDX index still lists the snapshots, but replay is
  refused); `api.pullpush.io` → 429 "does not provide free scraping resources".
  **What worked: `arctic-shift.photon-reddit.com`** (`/api/posts/search?subreddit=X&selftext=…`,
  `/api/posts/ids?ids=…`). Returns raw JSON post bodies with author, score, created_utc, permalink.
- **Search engines are degraded from this IP.** Bing/DDG/Mojeek via curl return junk or challenge pages and
  ignore operators. Workaround used instead: **Wayback CDX as a URL enumerator**
  (`cdx/search/cdx?url=mumsnet.com/talk/alcohol_support*&fl=original`), filtering thread slugs for keywords,
  then fetching the **live** page. This is how the Mumsnet threads were found.
- **Blocked and not used:** `drugs.com` naltrexone reviews (403 to both curl and the fetch tool),
  `askapatient.com` (403), Trustpilot (403), MM's own forum (403) and members-only blog,
  Club Soda / Sunnyside / Reframe first-person material (not reachable as verifiable primary text).
- **Not found in an accessible form:** Mark Willenbring's own words (interviews are behind paywalls or on
  blocked hosts). His position is therefore **absent** from this document rather than paraphrased. Do not let
  anyone fill that gap from memory.

### Verification method and confidence

Every quoted string below was **re-fetched from its source URL after drafting** and matched by substring
against the raw HTML (tags stripped, then entities unescaped, whitespace and smart-punctuation normalised) or
against raw JSON from arctic-shift. **136 quote checks run; all pass.** No quote in this document reached the
page via a summarising fetch tool.

Two verification traps hit during this work, both recorded because they will recur:

1. An early version of the checker unescaped HTML entities *before* stripping tags. A source containing
   `&lt; 5 years]` then produced a fake `<…>` span that swallowed the following sentence, and a **real** quote
   reported as FAIL. Strip tags first.
2. Mumsnet page numbers **shift as threads grow**. Two quotes "failed" only because the post had moved from
   page 8 to page 7 (and one from 7 to 6) between collection and verification. **Cite handle + date as the
   durable locator; the `?page=` in the URLs below is a convenience that will rot.**

**Confidence: high** for quote fidelity and attribution. **Medium** for representativeness — Mumsnet skews
UK/female/parent, and self-selected forum success stories systematically over-represent people still posting.
**Low** for anything about long-run outcome: almost nobody posts a five-year follow-up, and the people whose
moderation quietly failed mostly stop posting rather than announcing it.

---

## 2. SAFETY — read before using anything here

> **Unsupervised tapering from physical alcohol dependence can cause seizures and death.**
> Several accounts below involve people reducing alcohol intake while physically dependent, buying prescription
> medication from overseas sellers without a prescription, or taking opioid antagonists while dependent.
>
> **No taper schedule, dose, timing, or sourcing route has been extracted from these accounts, and none may be.**
> Where an account mentions a specific method, this document deliberately records only *that the person did it*
> and *that it was dangerous*.
>
> **Product requirement:** any user who reports morning drinking, shakes, sweats, prior withdrawal seizures, or
> daily heavy drinking must be routed to a doctor. Reduction support is not a substitute for medically
> supervised detox. Naltrexone in particular is an **opioid antagonist** — dangerous for anyone taking opioids —
> and is prescription-only.

Specific flags raised by the material collected here are listed in **§7**.

---

## 3. Honest statement of the moderation-vs-abstinence evidence, as found

Stated plainly, because the product will have to take a position:

- **Reduction goals are legitimate and the evidence does not support abstinence-only.** Henssler et al. (2021,
  *Addiction*, PMID 33188563), 22 studies / 4,204 patients, concluded: *"Available evidence does not support
  abstinence as the only approach in the treatment of alcohol use disorder. Controlled drinking, particularly
  if supported by specific psychotherapy, appears to be a viable option where an abstinence-oriented approach
  is not applicable."* In RCTs there was **no statistically significant difference** between the two paradigms
  (OR 1.32, 95% CI 0.51–3.39). Note the width of that interval — "no difference detected" here means
  *underpowered*, not *proven equivalent*.
- **Non-randomised free-goal-choice studies favoured abstinence** (OR 0.60, 95% CI 0.40–0.90) — *unless*
  goal-specific treatment was provided (OR 0.79, CI 0.40–1.56), or the study was low-risk-of-bias
  (OR 0.73, CI 0.49–1.09), or follow-up was long (OR 1.49, CI 0.78–2.85). Honest reading: **unsupported
  moderation looks worse than abstinence; supported moderation does not.**
- **Effect sizes were "not clearly dependent upon AUD severity"** — i.e. the folk rule *"moderation is only for
  mild cases"* is not clearly supported by that meta-analysis.
- **The safest amount of alcohol is none.** Gilbert et al. (2026) say it themselves before reporting their
  moderation findings: *"the safest approach for physical health—whether a person has AUD or not—is no alcohol
  consumption."* Reduction is harm reduction, not health optimisation.
- **But abstinence-only framing actively deters help-seeking.** Same paper: *"a restrictive conceptualisation
  that holds abstinence as a criterion for recovery may deter people from attempting to resolve AUD if their
  goal is to reduce their drinking and related negative consequences, not necessarily to stop drinking."*
  They note their findings *"support recognition by the US National Institute on Alcohol Abuse and Alcoholism
  that non‐abstinence based strategies are 'an important part of the discussion around AUD treatment and
  recovery'."* (NIAAA's own page was not fetched directly; this is the paper's characterisation of NIAAA.)
- **And it genuinely does not work for everyone.** Same paper again: *"non‐abstinent recovery appears to depend
  on a set of individual and situational factors. While it is possible for some, it may not be suitable for all
  people with AUD."*

**Net position for the product: offer a reduction goal, support it properly, and never sell it as safe.**

---

## 4. Testimonials

Goal-type key: **M** = moderation/reduction · **A←M** = abstinence after moderation failed ·
**HR** = harm reduction (risk-lowering without a consumption target) · **M+Rx** = moderation with medication.

Mumsnet URLs: cite the **handle + date**; page numbers shift.

### 4.1 Moderation that worked and held (multi-year)

**T1 — u/voyoco9** · r/dryalcoholics · 2026-07-30 · goal **M** · outcome: held >1yr, still drinking · stage: maintenance
> "I used to drink hard liquor all day, then I cut down to wine, and now if I drink, I drink 4.4% ABV Pacifico
> beer. I never drink more than a 6-pack a day now. I am MILES ahead of where I used to be, and I'm damn proud
> of it. I used to regularly black out and piss myself while drunk; I haven't done either in over a year now,
> since I began to cut down."
`https://www.reddit.com/r/dryalcoholics/comments/1vb9gc8/i_thought_this_sub_supported_moderation/`
*Note: by clinical standards a six-pack a day is still heavy drinking. This is the harm-reduction case in its
purest and most uncomfortable form — a large real reduction in harm that is nowhere near a safe endpoint.*

**T2 — WaddleAway** · Mumsnet · 2022-11-25 · **M** · 3 years held · maintenance
> "I was drinking far too much a few years ago, and decided to moderate. 3 years on and I now drink 1-2 times a
> week, a couple of glasses of wine at a time. Some weeks I drink nothing. So it worked for me. But I guess it
> depends on what your issue with alcohol is, and your personality type."
`https://www.mumsnet.com/talk/alcohol_support/4684887-moderation-success-stories`

**T3 — Mabelface** · Mumsnet · 2023-01-16 · **M** · 7 years held · maintenance
> "I used to drink the same until I left my husband, and like you have 1 a week. The changes happen fairly
> slowly - but, when they do it's amazing. […] 7 years later, I've kept off the 3st I lost and am actually not
> that fussed about drinking now."
`https://www.mumsnet.com/talk/alcohol_support/4721247-cut-back-from-8-9-bottles-of-wine-per-week-to-one`

**T4 — ChelseaBabbage** · Mumsnet · 2018-12-18 · **M** · "years" held · maintenance
> "I used to drink half a bottle 5 nights a week. I cut down by having one small glass followed by a long soft
> drink. I also don't drink wine with food as I just guzzle if I'm eating. […] Have kept my alcohol consumption
> down significantly for years now."
`https://www.mumsnet.com/talk/alcohol_support/3438197-Does-anyone-cutdown-and-keep-it-at-that`

**T5 — "Olivia"** (researcher pseudonym) · Gilbert et al. 2026 · **M** · 30+ years · maintenance
> "I may have a cocktail every now and then […] but it would be negligible, probably five or six [drinks] in
> 30, 31 years."
`https://pmc.ncbi.nlm.nih.gov/articles/PMC12873455/`

**T6 — "Mallory"** · Gilbert et al. 2026 · **M** · 11 years · maintenance
> "If we're out for lunch or whatever, I've taken a few sips here and there, and it has not triggered anything.
> But I've never even had a full drink or anything like that in 11 years."

**T7 — "Floyd"** · Gilbert et al. 2026 · **M** · very long-term · maintenance · **the atypical one**
> "I never decided that I needed to quit completely because I've learned that I have an off‐switch. I know when
> I've had too much and I can say, 'Okay, I'm done,' even if occasionally I do get drunk. And these days, that's
> extremely rare."
*The study flags Floyd as the single participant who still got drunk occasionally. Everyone else treated
intoxication as the line not to cross.*

**T8 — "Victor"** · Gilbert et al. 2026 · **M** · long-term · maintenance
> "I began having alcohol again, but I realised I could control it. I didn't need to just drink and keep
> drinking. I could have one glass of beer and that was fine."

**T9 — HAMS member "EG"** · hams.cc/testimonials · undated · **M** (after physical dependence) · 9 months
> "I've been working with the HAMS approach for almost 9 months. Vodka is no longer a part of my routine, and
> drinking moderately when I choose to imbibe is no longer a problem. I'm adding more abstinence days, and the
> days I do drink, it's usually wine with dinner or a couple drinks with friends."
`https://hams.cc/testimonials/`
⚠️ **EG also describes breaking physical dependence with a self-managed taper — see §7.1.**

**T10 — HAMS member "DP"** · hams.cc/testimonials · undated · **M** · maintenance
> "When I do drink, I actively avoid becoming intoxicated. This is a HUGE change for me. It seems so simple…"
> … "If this drinking thing was a battle, I feel as though I have won. But diligence is involved."

**T11 — u/plasma_dan** · r/Petioles · 2024-03-11 & 2025-05-14 · cannabis · **M** · 3+ years, method reposted annually
> "moderation is living a life that is mostly sober, while being able to enjoy occasional recreational weed use.
> For me, this means spending about 5 days of the week sober, and taking 2 days as an allowance to get high."
`https://www.reddit.com/r/Petioles/comments/1kmeopr/my_weekendsonly_moderation_method_and_sobriety/`
`https://www.reddit.com/r/Petioles/comments/1bbzijq/i_went_from_daily_use_to_only_weekends_this_is/`

**T12 — "Brian"** · Moderation Management testimonials · undated · **M** · ~1 year, held through a high-risk trip
> "When I got back to the states, I decided to take MM seriously. I did 30 days AF, ordered the book Responsible
> Drinking, and started weekly therapy sessions with the plan that if I couldn't drink more moderately, I would
> take naltrexone. With the use of non-alcoholic beer, taking 3-4 days AF per week, I was able to bring down my
> tolerance to the point that 4 beers were more potent than 8 beers were previously. […] The phrase 'no shots'
> is in my head as I'm moderating my way through an all-inclusive resort."
`https://moderation.org/testimonials/`
*The single richest technique account in the set: reset → structured AF days → NA substitution → one portable
rule → a named escalation path if it fails.*

### 4.2 Moderation that failed — and what the person says they missed

**T13 — u/bingbangtheory** · r/Petioles · 2024-03-26 · cannabis · **A←M** · failed at ~day 72
> "I would've been at day 72, but broke the streak 2 weeks ago when some friends visited. I got to the point
> where I didn't even think about MJ. I could smell it out in public and consider it a thing of the past.
> Thought I was out of the woods, convinced myself I was able to moderate and vowed to *only use on the weekends
> going forward*. Turns out the cravings were through the roof on Monday (yesterday), so I gave absolutely
> everything away…"
`https://www.reddit.com/r/Petioles/comments/1bohrfj/turns_out_i_cant_moderate_use/`
**The single most important account in this document. See §6.**

**T14 — "Jessica"** · HAMS book excerpt, thefix.com · 2019-12-27 · **A←M** · failed twice
> "I tried moderating, but it didn't work for me. Once I start to drink, there is no stop button. So I made the
> decision last year to be alcohol-free. Once I tried moderation again, but drank way too much. **It wasn't even
> stress or trauma: I just thought I deserved a treat so I tried it again**, but once I started I kept going."
`https://www.thefix.com/better-better-stories-alcohol-harm-reduction/`
*Independent corroboration of T13's shape in alcohol: the relapse decision arrived as a **reward bargain during
a good period**, explicitly not as a stress response.*

**T15 — u/jakejjoyner** · r/Petioles · 2024-02-19 · cannabis · **A←M** · failed after 10 months
> "Ultimately I relapsed over break when I met this girl - I thought I could moderate but I failed miserably. […]
> It is physically impossible for me to regulate my usage, yet I still come up with rationalizations about why
> its ok for me to smoke weed on occasion, which has literally NEVER happened in my 4-5 years or smoking weed."
`https://www.reddit.com/r/Petioles/comments/1auhuy8/quitting_again_after_10mo_sober/`
*What he says he missed: a way to tell a rationalisation from a decision.*

**T16 — "Martin"** · Gilbert et al. 2026 · **A←M** · 4 years abstinent, then a free drink
> Abstinent ~4 years until offered a free drink at the bar where he played darts; a six-day episode followed in
> which he went from "one beer … to two cases." Afterwards he "decided that the people in AA knew what they were
> talking about, that I must be an alcoholic, so I stopped again. I haven't had a drink since."

**T17 — "Veronica"** · Gilbert et al. 2026 · **A←M** · 10 months abstinent, then a holiday
> "I thought that I had been off of it long enough that I would have been okay to drink a few drinks here and
> there, and clearly that wasn't the case."
*Third instance of the same shape: **elapsed good time was read as evidence of restored control.***

**T18 — HermioneWeasley** · Mumsnet · 2022-11-25 · **A←M**
> "Nope. I can't drink in moderation. I kidded myself I could for a long time."
`https://www.mumsnet.com/talk/alcohol_support/4684887-moderation-success-stories`

**T19 — u/kkw234** · r/dryalcoholics · 2025-03-05 · **A←M**
> "For years, I tried to convince myself that moderation was the key, that I could find balance with alcohol if
> I just had enough discipline. But the reality is, for many people, moderation isn't a sustainable solution
> it's a trap that keeps you stuck in the same cycle."
`https://www.reddit.com/r/dryalcoholics/comments/1j4c7bt/the_myth_of_moderation_why_it_doesnt_work_for/`
*Caveat: this poster is promoting a paid newsletter in the same post. Weight accordingly.*

**T20 — u/Akrasiatic** · r/Petioles · 2024-11-09 · cannabis · **M** after repeated failure · cycling
> "the pattern of my last 7-8 years has been: smoke every day for most of a year; take a few months off, then
> try and fail to moderate; and start the cycle anew."
`https://www.reddit.com/r/Petioles/comments/1gnefqf/theres_no_magic_when_its_normal_long_post/`
*Now attempting a **descending** target rather than a fixed one: "Right now, once or twice a week is my limit."*

**T21 — "Vincent"** · Gilbert et al. 2026 · abstinence, never attempted moderation
> "I know that my next drink is not gonna be one, it's gonna be all."

**T22 — u/First_Difference_239** · r/dryalcoholics · 2026-02-09 · **M** planned after 1y9m abstinence · pre-lapse
> "1 year and 9 months sober from alcohol. Been white knuckling it and miserable. […] I will take it slow. Try
> moderation again. It's my time to be that guy.. **I feel like an arrow that's been pulled reallllllyyyyy far
> back and I'm just about to fly off so hard.** I am worried about that."
`https://www.reddit.com/r/dryalcoholics/comments/1r0i7yn/planning_to_drink_again/`
*A person predicting their own moderation failure in advance, in detail, and going ahead anyway. What they say
they missed: any tolerable alternative — "It's suffer with or suffer without." Miserable white-knuckle
abstinence was the thing that produced the moderation plan.*

### 4.3 The Sinclair Method / naltrexone

**T23 — u/LipstickRevenge** · r/Alcoholism_Medication · 2026-01-01 · **M+Rx → abstinence by preference** · 2 years
> "Thanks to TSM, I'm celebrating two years dry. […] The extinction burst came at the end of that year, then it
> was a steady reduction from there. It became easy, and much more about using Naltrexone to train any urges out
> of me, rather than actually really wanting those remaining drinks. What's been great is how I genuinely have no
> interest in alcohol any more. It's not this constant battle with myself to resist, like certain groups might
> have you believe."
`https://www.reddit.com/r/Alcoholism_Medication/comments/1q0w69z/two_years_dry/`

**T24 — ArtichokeSurprise** · Mumsnet · 2023-10-22 · **M+Rx** · sustained reduction
> "for me (and thousands of others), it was an instant transformation and easily got me to cut my alcohol
> consumption by two thirds. I can still have a drink socially, but once I've had one or two, that's enough."
`https://www.mumsnet.com/talk/alcohol_support/4925518-naltrexone`

**T25 — LankylegsFromOz** · Mumsnet · 2025-08-23 · **M+Rx** · 3 years
> "I started taking Naltrexone about 3 years ago and it has been life changing. I still drink, but only
> occasionally. I've lost 20kg and I've become really fit and healthy."
`https://www.mumsnet.com/talk/alcohol_support/5396751-anyone-on-or-starting-a-naltrexone-journey`

**T26 — SnowShapes7** · Mumsnet · 2026-02-04 then 2026-05-22 · **M+Rx** · partial → near-total, tracked
> At 7 weeks: "I've definitely had a few major slip ups. […] I'm tracking my units diligently in the TSM app, and
> they're definitely going down! **It hasn't made all of the cravings go away**, but I think I'm getting less of
> them, and they're less overwhelming and all consuming. I'm now drinking 2-3 nights a week, if that; whereas
> before I started on the naltrexone it was pretty much every night."
> Months later: "I've had the same sad half used pack of pills rattling around the bottom of my handbag for
> months now 😂"
`https://www.mumsnet.com/talk/alcohol_support/5396751-anyone-on-or-starting-a-naltrexone-journey` (7-week post
was on `?page=6`, later post on `?page=9` at time of collection — pagination shifts)
*One of the very few genuinely longitudinal accounts in the set — same handle, same thread, ~4 months apart.*

**T27 — u/pastramallama** · r/Alcoholism_Medication · 2026-01-17 · **M+Rx** · reports extinction
> "Its been probably 3 months since ive thought anything close to positive/craving/interest about alcohol. […]
> I maybe have between 1 drink a week to 1 drink a month to a month and a half, fluctuating according to my
> social life. Most of the time I actively choose soda or some other kind of non alcoholic beverage not bc im
> trying to be sober or anything but just bc I dont want the alcohol."
`https://www.reddit.com/r/Alcoholism_Medication/comments/1qf6k0w/just_realized_ive_reached_extinction/`

**T28 — Hotdiggity766** · Mumsnet · 2024-10-28 → 2025-09-01 · **M+Rx** · the full longitudinal arc
The most valuable single thread found. Same handle, ~11 months, self-reported at each stage:
- Start (2024-10-28): "I'm scared, but desperate after years of drinking and knowing I can't abstain"
- Week 1 (2024-11-16): "early days but I had a phone appointment with a doctor and my tablets have been
  delivered, I'm amazed at how well it is working to be honest!"
- Month 4 (2025-02-26): "I've been 100percent compliant and really stuck to that side of things. I think it's
  stopped me going over board on occasion but **I'm 4months in now and am kind of disappointed with the
  results**, I feel like I need a group support network"
- Month ~7 (2025-05-09): "after following the guidance strictly for approx 5 months and not deviating, following
  all the rules, I am finally free"
- Month ~8 (2025-06-30): "I drank on my holiday, I didn't enjoy it at first, then I got used to it and did." —
  then back to 2 weeks alcohol-free
- Month 10 (2025-08-14): "I've gone from daily drinker to about 150/158 alcohol free days since joing the
  group. Miracle! Hope everyone else is seeing success as **I'm unsure if it's the nal or the group working for
  me**."
`https://www.mumsnet.com/talk/alcohol_support/5197782-tsm-the-sinclair-method-scam`
*Read the whole arc before designing anything: an early "miracle" phase, a **month-4 trough that nearly ended
it**, recovery only after adding human support, a planned holiday lapse absorbed without collapse, and the
person's own honest inability to attribute the result to the drug.*

**T29 — u/TidelandinGA** · r/Alcoholism_Medication · 2026-03-24 · **M+Rx failed** · side effects
> "Unfortunately I believe that I've failed the Naltrexone experiment. I drink very rarely and that could be the
> reason why this doesn't seem to work. I'm doing the Sinclair Method. But it seems no matter how small a dose I
> start with I get awful nausea and crippling anxiety."
`https://www.reddit.com/r/Alcoholism_Medication/comments/1s2byrn/failed_experiment/`

**T30 — 2023forme** · Mumsnet · 2023-09-13 and 2023-10-30 · **M+Rx failed → abstinence** · compliance failure
> "It did stop the buzz and I literally felt like I was drinking water instead of a G&T (was a weird feeling)
> but at the time, I didn't deep down inside want to stop so I continued to abuse alcohol in secret/without
> taking the nalmefene."
> "I did however relapse massively as I drank without taking it and am now 80 plus days AF."
`https://www.mumsnet.com/talk/alcohol_support/4895654-one-little-pill` ·
`https://www.mumsnet.com/talk/alcohol_support/4925518-naltrexone`
*The characteristic TSM failure mode: the pharmacology works when taken; the **behaviour of taking it** is the
thing that fails.*

**T31 — u/BillWWouldveDoneTSM** · r/Alcoholism_Medication · 2026-01-05 and 2026-03-18 · **M+Rx**, mixed
> On losing an earlier near-success: "I never got back up to the full 50mg dose (kicking myself for this now) due
> to nausea and so I just settled on doing 25mg, I also started drinking liquor straight, I rarely re-dosed
> during long sessions […] and, perhaps worst of all, I was now taking a daily high dose of Valium that made me
> crave alcohol all on its own."
> Later, on whether he has arrived: "But to me that's not extinction, even though 90% of the time my sentiment
> towards alcohol seems to be consistent with other people's' experience of extinction."
`https://www.reddit.com/r/Alcoholism_Medication/comments/1q47e72/debating_continuing_tsm_after_some_time_off/` ·
`https://www.reddit.com/r/Alcoholism_Medication/comments/1rxa27k/when_can_i_call_extinction/`

**T32 — u/Dayum-Girly** · r/Alcoholism_Medication · 2026-06-21 · TSM's structural trap
> "So I'd like to try TSM, but the thought of relapsing to be able to some day have one drink just makes my mind
> revolt right now as living through a relapse is the hardest thing I've done […] Then again, I'll probably
> relapse anyway and at least with TSM I might get a sustainable solution to deal with it."
`https://www.reddit.com/r/Alcoholism_Medication/comments/1ubboxv/relapsing_to_start_tsm/`
*TSM requires drinking. For someone currently abstinent, starting it means deliberately drinking again. This is
a real and under-discussed cost.*

**T33 — Justwanttobebythesea** · Mumsnet · 2026-03-20 · **M+Rx**, stopped and restarted
> "I'm back on it. I had a stressful period and stopped taking it and my brain reverted to old habits so the
> drinking crept up again. Started a half yesterday and only 2 small glasses of wine so that's a win. I realise I
> need to take it consistently to rewire my brain."

**T34 — IAmAnAlcoholic** · Mumsnet · 2026-03-21 · **M+Rx** · 1 month, ~⅓ reduction
> "So I'm a month in now and consistently drinking 1/3 less than I was before. […] I keep a water bottle next to
> my wine glass and I'm finding I want to drink loads of water instead of just guzzling wine. I'm getting
> hangovers for the first time in years"

### 4.4 Hostility toward a reduction goal

**T35 — u/voyoco9** · r/dryalcoholics · 2026-07-30 · the clearest statement found
> "Every time I post here about trying to moderate I get hit with an influx of people telling me that it's not
> possible, I'm going to end up at rock bottom, etc. etc. […] Am I perfect? No. Am I sober? No, and I don't want
> to be. I've been in rehab, I've gone to more AA meetings than I can count. Sobriety, complete abstinence, is
> not for me. Full stop. Why can't some people respect this? Moderation is NOT a one-size-fits-all solution, but
> IT'S WORKING FOR ME. […] **I don't feel as if this is a safe space for me anymore to discuss moderation.**"

**T36 — mindutopia** · Mumsnet · 2023-10-25 · an abstinent poster naming the dynamic accurately
> "there would be a weariness about using a pill to allow yourself to continue to drink even if in moderation.
> There is a really point of pride with being sober and not having had a drink for however many days/months/years.
> I think naltrexone can be a useful tool to get to the point of stopping, but **I suspect people who want to use
> it long-term as a way to moderate, would find it more tricky to find their communities of support.** I say that
> not as a judgement, but simply because it's so important to find a support community"
*Notably fair-minded, and identifies the mechanism: the reduction goal is not just disbelieved, it is
**structurally unsupportable** in a community whose core ritual is the day count.*

**T37 — mindutopia** · Mumsnet · 2024-10-30 · advice given to someone starting TSM
> "What I would say is don't see it as a route to moderation. I think some people hope that a pill will mean they
> can 'drink normally'. It doesn't work like that. And honestly, alcohol is shit anyway and doesn't add anything
> to your life."

**T38 — PlioTalk** · Mumsnet · 2025-08-15 · former addiction support worker
> "Please be aware that AA is broadly against TSM. There are support groups such as SMART Recovery, which is
> excellent."

**T39 — HAMS member "EG"** · hams.cc · why they came
> "I found HAMS searching for a sane approach to a problem - I could not accept AA's dogma and reductionism"

**T40 — "Stephanie J."** · Moderation Management
> "In a 'recovery' world that sees only in black and white (total drunkenness or total abstinence), Moderation
> Management is a scientifically-based harm reduction program"

**T41 — Bluetrews25** · Mumsnet · 2023-01-16 · the *soft* form, which is more common than the hostile form
> Responding to someone celebrating a cut from 8–9 bottles a week to 1:
> "If you don't miss the alcohol, then why are you having that one bottle a week? It concerns me that you have it
> all in one night."
*Not aggression — concern. But the effect is to reframe a large success as a residual failure. This is the tone
the product must not accidentally reproduce.*

**T42 — GreenGodiva** · Mumsnet · 2025-08-23 · hostility from services, not peers
> "I've been looking into this for a year, I'm on a very lower income so went to the gp, refused to help. Got
> referred to an alcohol and drug support place and they were awful. Absolutely awful. Why they think filling in
> unit forms will do to stop anybody drinking…just stupid."

### 4.5 Reduction goals in cannabis

**T43 — u/chelofastora** · r/Petioles · 2025-11-11 · **M** with a written rule set and a pre-committed exit
> "I typed out some rules for myself on my notes app and plan on sticking to it. […] I decided I am not going
> back to smoking or vaping. I am saving smoking a joint for my wedding anniversary […] I plan on taking edibles
> only twice a week. Wednesday and Saturday evenings around 5pm […] **I already know in my heart that if it ends
> up ramping up more than twice a week, I will go back to abstaining from THC altogether.**"
`https://www.reddit.com/r/Petioles/comments/1oul4pb/been_here_a_week_or_so_and_i_am_gonna_try_my_luck/`

**T44 — u/LongjumpingAd3244** · r/Petioles · 2026-06-25 · **M** · 1 month in, daily user of 5–6 years
> "I've been letting myself get high 3 days of the week now & trying to keep it as low as possible within that.
> […] Having it in the house and not smoking it gets easier all the time."

**T45 — u/JoeTisseo** · r/Petioles · 2019-08-28 · **the signal question, asked out loud**
> "Now the thing is I've given up and feel I'm getting out of the woods in terms of withdrawals etc, but like I
> said I really miss it […] and keep asking myself if I could become a weekend or small time smoker. **I wonder
> whether this is my brain trying to trick me into becoming an addict again or whether it's actually possible to
> use weed in moderation, at least in my case.**"
`https://www.reddit.com/r/Petioles/comments/cwn6fo/im_torn/`

**T46 — u/Ok-Nobody-1266** · r/Petioles · 2025-09-19 · **M**, explicitly data-gathering
> "My current plan is to save a lower percentage joint or brownie for Saturday nights or a special occasion. […]
> At this point I'm going to try and continue moderating and **collect more data regarding my usage**."

**T46b — u/Plantmoremilkweed** · r/Petioles · 2025-04-05 · cannabis · **M** · held several months · maintenance
> "I (27) have been smoked weed nearly every night since I was 19 […] I got one of those timed lock-boxes that
> I'm pretty sure are meant for children's iPads. I've been locking my stash in there for usually 2-5 days after
> each time I smoke. I've been doing this for a few months now and I can confidently say I've gone from daily
> smoking to 1-3 times per week when the box unlocks. Yes, it's embarrassing that I have to treat myself like a
> child, but whatever works I guess. I'm hoping one day I won't need it anymore and can just smoke intuitively,
> but **right now I still crave it every day and can't really trust myself to moderate**."
`https://www.reddit.com/r/Petioles/comments/1jsas9u/got_a_timed_lockbox_and_its_been_working_well/`
*Rare and valuable: moderation succeeding **while the person explicitly disclaims self-trust**. The device is
doing the work. Contrast with every account in §6, where restored self-trust was the thing that caused failure.*

**T46c — u/IDontEvenKnowAlt** · r/Petioles · 2025-11-25 · cannabis · commitment device defeated
> "Got my code in just a few minutes, and it's open now. I couldn't wait 22 hours. It's hard to describe, but I'm
> sure yall are familiar with the feeling--the burning, the hunger, being unable to get the thought out of your
> head, feeling like a crazy person but having every inch of your reality shape itself around getting access to
> this stupid plant."
`https://www.reddit.com/r/Petioles/comments/1p5z76z/opened_my_timed_lock_box_early/`
⚠️ *Occurred during a mental-health crisis; the post references self-harm urges. See TQ17.*

### 4.6 Reduction as a route *into* abstinence, chosen freely

**T47 — HAMS member "CW"** · hams.cc · **HR → abstinence** · 5 weeks
> "I've abstained almost 5 weeks and headed through New Year's. […] The idea of moderation and the acceptance of
> that really helps. I'm not very good at moderation but abstinence without the sword of Damocles hanging above
> my head is really nice."

**T48 — HAMS member "HP"** · hams.cc · **A←M**, decided by a self-assessment
> "before I quit (30 days today!), I read Controlling Your Drinking, and I took the two tests in there, and it
> revealed to me that most people who scored where I scored ended up choosing abstinence, for different reasons.
> One reason is that it is just too much effort and work to try to control drinking. Turns out that fit me."
*The only account found in which a **formal instrument** was used to make the moderation-vs-abstinence choice.*

**T49 — "Starfish"** · Moderation Management
> "MM has given me something I've been missing for a long time: Hope. Hope that I can do this. I can't imagine a
> life entirely without alcohol, and now I know I don't have to. Armed with the tools necessary to feel
> empowered, I can abstain. And I can moderate. And I can make that decision for myself. Yes, I slip sometimes.
> But these slips aren't failures, they are moments to learn and move forward."

**T50 — u/Awkward_Magician422** · r/dryalcoholics · 2026-03-31 · abstinent 4 years, considering **M**, motive is psychological
> "The biggest reason I want to reintroduce it is because I have some rigid thinking patterns that I've been
> working on, and pure abstinence feels like fear and self punishment for letting it go too far in the past. […]
> I also don't want to live with a lack of trust in myself."
`https://www.reddit.com/r/dryalcoholics/comments/1s8b8le/im_4_years_sober_from_alcohol_thinking_of/`

**T51 — u/_whatever-nevermind** · r/dryalcoholics · 2025-03-10 · abstinent 1 year, motive is **social isolation**
> "I feel like people who aren't sober avoid socializing with me because I'm sober and sober people I just
> struggle to connect with. […] I'm just looking for the 'in' to be able to socialize and connect in a way that
> people seem to *need*"

**T52 — u/demoniass** · r/dryalcoholics · 2025-06-09 · **M**, 10 years stable, no confidence in it
> "I drink like 2-4 beers every evening some weeks, other weeks I can do weekdays+Sunday without alcohol. Been
> keeping this up for 10 yrs. A month ago I tried to introduce a rule to only drink in social settings […] I
> fucked it up last week though. […] **my moderation has nothing to do with willpower, I'm just lucky.**"

---

## 5. Techniques people credit

Ranked roughly by recurrence. "Recurrence" counts *distinct people* in this collection, not mentions.

### TQ1 — Alcohol-free / substance-free days as a fixed weekly quota
**What they do:** name specific days of the week as AF/sober days and treat them as non-negotiable, rather than
setting a total-quantity target.
> "With the use of non-alcoholic beer, **taking 3-4 days AF per week**, I was able to bring down my tolerance to
> the point that 4 beers were more potent than 8 beers were previously." — Brian, MM
> "spending about 5 days of the week sober, and taking 2 days as an allowance to get high" — u/plasma_dan
> "I've been letting myself get high 3 days of the week now" — u/LongjumpingAd3244
> "I'm adding more abstinence days" — EG, HAMS
> "I like the accountability and the ability to be honest when we **juggle the ABS days around**." — Steph F., MM
**Recurrence: 6+.** The most consistently credited single structure in the whole collection.
**Backfire:** Steph F.'s phrase gives it away — days get "juggled". And it does not constrain the amount drunk
on a drinking day, which is exactly the problem for binge-pattern users (u/SlippersLaCroix: *"My issue with
drinking is the amount I binge in a session, not really the frequency."*).

### TQ2 — Non-alcoholic substitution
> "I have replaced my nightly wine with a bottle or two of non alcoholic beer or a tonic water with ice and lime.
> They feel grown up and special, but don't have the guilt of having alcohol in them." — msnowtybach, Mumsnet
> "I have also replaced wine with non-alcoholic alternatives. I have beers, sparkling wines, and even the
> ridiculously expensive seedlip" — jazzandh, Mumsnet
> "I keep a water bottle next to my wine glass" — IAmAnAlcoholic, Mumsnet
**Recurrence: 4.** **Backfire:** jazzandh only got it to work by *also* banning drinking at home (TQ4) — the
substitute alone was not enough.

### TQ3 — A long reset first, then rules
**What they do:** an extended abstinence period (30 days to 6 months) *before* attempting moderation, explicitly
to lower tolerance and break the automaticity — then re-enter with pre-written rules.
> "I had a **six month break** from alcohol and **set rules about consumption thereafter**. Been okay for the last
> two months" — DirtyBroomstick, Mumsnet
> "I did **30 days AF**, ordered the book Responsible Drinking, and started weekly therapy sessions" — Brian, MM
> "I made it just over 3 months without any THC, and after reading the many experiences on this sub, I decided to
> try my luck with moderating" — u/chelofastora
**Recurrence: 4.** **Backfire — and it is a big one:** this is the exact structure that produced T13, T14, T16
and T17. The reset works; the *feeling produced by* the reset is what triggers the over-confident re-entry.
See §6.

### TQ4 — Category and context bans rather than quantity limits
**What they do:** ban a *class* of occasion, place or drink outright — easier to adjudicate than a number.
> "I have had to **cut out all drinking at home** unless 'socialising' ie friends round." — jazzandh
> "I also **don't drink wine with food** as I just guzzle if I'm eating." — ChelseaBabbage
> "I **generally avoid mixed drinks**" — DP, HAMS
> "I **rarely drink before 6 PM**" — TS, HAMS
> "I decided I am **not going back to smoking or vaping**" (edibles only) — u/chelofastora
> "if I do try the method again, **I will use something I don't particularly like such as a real ale** so I'm not
> tempted to drink more than a small amount" — 2023forme
**Recurrence: 6.** Strongly preferred over counting by people who report it working. **Backfire:** demoniass
adopted "only drink in social settings" and broke it within a month — *"I drank 2-4 beers every evening of the
week, alone."*

### TQ5 — One short portable rule carried into the risky situation
> "**The phrase 'no shots' is in my head** as I'm moderating my way through an all-inclusive resort." — Brian, MM
> "**don't get drunk**" — "Natasha", Gilbert et al.: *"That's always been my limit. Being drunk and drinking—it's
> a very fine line. So, my goal is always drink, have fun, but don't get drunk."*
> "I'm going to put the champagne to my lips, I'm going to taste it, and I'm going to leave it." — "Juan",
> Gilbert et al. (a rehearsed script for one specific foreseen event — his son's wedding)
**Recurrence: 3, but all three are high-risk-situation successes.** Directly productisable: a single phrase
plus a rehearsed script for one named upcoming event.

### TQ6 — Pacing: one alcoholic drink, then a long soft one
> "I cut down by having **one small glass followed by a long soft drink**." — ChelseaBabbage
> "I keep a water bottle next to my wine glass" — IAmAnAlcoholic
**Recurrence: 2.**

### TQ7 — Tracking / counting units
> "learn how **planning and tracking** really help" — JB, HAMS
> "I'm **tracking my units diligently in the TSM app**, and they're definitely going down!" — SnowShapes7
> "I'm going to try and continue moderating and **collect more data regarding my usage**." — u/Ok-Nobody-1266
> u/LipstickRevenge posted a **graph** of two years of consumption.
**Recurrence: 4.** **Backfire:** the strongest caution in the collection comes from a practitioner:
> "I don't believe it has anything to do with who you are as a person but with how you are willing to feel and
> what you are willing to do. **When moderation becomes about a strict number then that's when I see people
> rebel.**" — brightspice, Mumsnet, 2022-12-05
*Design implication: track to reveal a trend, not to enforce a threshold.*

### TQ8 — Make access inconvenient / remove supply
> "Do you have enough self control to keep weed around and not smoke it? (If No, then you need to either run out
> of weed, hide it, give it to someone else, or make it incredibly inconvenient to get to.)" — u/plasma_dan
> "ensure there only is a minimal amount of alcohol in the house, hand over all my cash and cards to DH, get in
> my pjs and go to bed" — 2023forme
**Recurrence: 3** (plus the timed lock box, TQ17, which is the industrialised version).
**Counter-account:** u/LongjumpingAd3244 reports the opposite adaptation — *"Having it in the house and not
smoking it gets easier all the time."* Both appear to work; they are different strategies (avoidance vs.
exposure tolerance) and should not be blended.

### TQ17 — The timed lock box (cannabis) — highest-recurrence *device* in the collection
**What they literally do:** put the stash in a commercial timer-locked container and set it for a fixed number
of days. The device, not the person, enforces the AF days.
> "I got one of those timed lock-boxes that I'm pretty sure are meant for children's iPads. **I've been locking
> my stash in there for usually 2-5 days after each time I smoke.** I've been doing this for a few months now and
> I can confidently say I've gone from daily smoking to 1-3 times per week when the box unlocks."
> — u/Plantmoremilkweed, r/Petioles, 2025-04-05
> `https://www.reddit.com/r/Petioles/comments/1jsas9u/got_a_timed_lockbox_and_its_been_working_well/`
> "Once it's locked there is no need to think about it. Smoked 4 times today instead of 12."
> — u/Jackson88877, r/Petioles, 2025-03-22
**Recurrence: 10+ distinct threads found in r/Petioles between 2024-10 and 2026-04.**

Why it is interesting for the product: it converts a *rule* into a *latency*. The user is not asked to resist;
they are asked to wait. It is the only technique in this collection that removes the moment-of-decision
entirely.

**Three attested backfires, all in the users' own words:**
- **The manufacturer's override defeats it.** u/IDontEvenKnowAlt, 2025-11-25: *"I always thought that the
  fortress mode reset code, that you have to contact them for, took about a day to come in"* … *"Got my code in
  just a few minutes, and it's open now. I couldn't wait 22 hours."*
  `https://www.reddit.com/r/Petioles/comments/1p5z76z/opened_my_timed_lock_box_early/`
- **Physical defeat.** Same poster: *"I've already broken open a K-Safe--it was disturbingly easy."*
- **Re-supply routes around it.** u/Plantmoremilkweed: *"My biggest fear is one day I'll just go to the
  dispensary to bypass the lock-box."*
- **A dignity cost that deters adoption.** u/Plantmoremilkweed: *"Yes, it's embarrassing that I have to treat
  myself like a child, but whatever works I guess."* u/OatsForDays, still deciding: *"It makes me feel so
  fiendish to think about potentially buying one. It's just a stigma though."*
- ⚠️ The failure episode above occurred during a mental-health crisis with reference to self-harm. A
  commitment device that a user in crisis cannot open — or can open only by begging a vendor — is a real
  design hazard, not just a broken feature.

### TQ9 — Fill the time; treat boredom as the actual target
> "The prime assumption that underpins this whole method is that **many people turn to daily weed use because
> they are bored, and/or lacking purpose in their lives**." — u/plasma_dan
> "It had become a habit f boredom, loneliness and sadness. I'm tackling these simultaneously while cutting way
> back." — illraiseya, Mumsnet
> "my triggers are boredom, stress and anxiety" — Justwanttobebythesea, Mumsnet
**Recurrence: 4.**

### TQ10 — Substitute a competing reward with its own feedback (usually exercise)
> "Then I got into exercise and started to reduce how much I drank as didn't want to feel hungover if I was doing
> an event etc… **Basically the buzz from the exercise was better than the buzz from the alcohol!**" — Marigold41
> "I've lost 20kg and I've become really fit and healthy." — LankylegsFromOz
> "My sleep is better and my running is more consistent." — Haggisfish3, Mumsnet 2025-08-23
**Recurrence: 3.** Distinguishing feature vs. generic "find a hobby": the substitute **punishes** the old
behaviour (a hangover ruins the run), so it is self-enforcing.

### TQ11 — A pre-committed exit condition ("if X, I quit entirely")
> "I already know in my heart that **if it ends up ramping up more than twice a week, I will go back to abstaining
> from THC altogether**." — u/chelofastora
> "with the plan that **if I couldn't drink more moderately, I would take naltrexone**" — Brian, MM
**Recurrence: 2 — and it is rare, which is itself the finding.** Almost nobody sets a tripwire in advance.
Everyone who failed at moderation discovered the failure *after* it had run its course. **This is the largest
unmet design opportunity in the collection.**

### TQ12 — Downward-ratcheting target rather than a fixed one
> "Right now, once or twice a week is my limit. Hopefully will get to once or twice a month — and maybe if I ever
> get to the point where it's a few times a year, it will feel special again." — u/Akrasiatic
> "Would I like to cut down even more? Of course, I'm working on a period of full sobriety—at least one month."
> — u/voyoco9
> "I plan on taking edibles only twice a week […] to start, see how it feels the following day and maybe move
> that to my actual days off" — u/chelofastora
**Recurrence: 3.** The target is a direction, not a line. Fits brightspice's warning in TQ7.

### TQ13 — Taking naltrexone one hour before drinking, every time (the Sinclair Method)
**What they literally do:** take a prescribed opioid antagonist ~1 hour before *every* drinking occasion, and
keep drinking, so that the reward is repeatedly unreinforced.
> "**the longer you take the pills the less often you feel the urge to drink**, so you need less of them. However
> with TSM you do need to take a pill every time you plan to drink." — SnowShapes7
> "It became easy, and much more about **using Naltrexone to train any urges out of me**, rather than actually
> really wanting those remaining drinks." — u/LipstickRevenge
> "**Really recommend taking the required dose and always giving the 1hr wait**, this is what all the literature
> advises. I believe you need to train your brain pathways there is no reward when drinking and **you can't do
> that if you are drinking as a test**" — Hotdiggity766
**Recurrence: 12+.** **Backfires, all attested:** non-compliance is the dominant failure mode (T30, T31);
side effects can end the attempt outright (T29); it requires an abstinent person to start drinking again (T32);
and there is a **month-3-to-4 disappointment trough** (T28) at which people quit.
⚠️ Prescription-only, opioid-antagonist, **not** a technique the product may instruct. Route to a clinician.

### TQ14 — Peer support that does not require a shared goal
> "There were so many people on so many different paths, including many who had been abstinent for years or
> moderating successfully, as well as those who had serious problems." — Jessica, HAMS
> "MM has provided unwavering and non-judgmental support and motivation to enable me to understand why I was
> abusing alcohol. It has provided the tools and skills to change my behavior and attitude and therefore
> change/drastically reduce my drinking." — Bonnie C, MM
> "It has allowed me to **define what healthy drinking looks like for me** and given me tools to achieve that."
> — Lindsey H., MM
> "About 5 months in I signed up to a different group and purchased AF coaching 121 and **it's made the world of
> difference to me**." — Hotdiggity766
**Recurrence: 8+.** Note T28's conclusion — she could not tell whether the drug or the group was responsible.

### TQ15 — Deliberately let tolerance fall so the hangover returns
> "I was able to bring down my tolerance to the point that 4 beers were more potent than 8 beers were
> previously." — Brian, MM
> "I'm getting hangovers for the first time in years, I was struggling to hold back the tears when Bruce said
> it's because my tolerance to alcohol is dropping." — IAmAnAlcoholic
> "at one point in my life, fishbowl margaritas would have been ideal, then you would switch to maybe two jumbos
> […] to where you are today, where a sip is probably all I can tolerate." — "Virgil", Gilbert et al.
**Recurrence: 3.** The mechanism is that reduced tolerance makes over-drinking self-punishing.
⚠️ Falling tolerance also raises overdose/impairment risk at previously routine amounts. Do not present as
risk-free.

### TQ16 — Use a formal self-assessment to *choose* the goal
> "I read Controlling Your Drinking, and I took the two tests in there, and it revealed to me that most people
> who scored where I scored ended up choosing abstinence" — HP, HAMS
**Recurrence: 1.** Included despite n=1 because it is the only instance of anyone choosing the goal by any means
other than preference, and because §6 shows preference is systematically unreliable at exactly the moment the
choice is made.

---

## 6. Can people tell in advance? — the strongest finding

**Short answer: not reliably, and the errors have a consistent shape.**

The coordinator flagged a cross-source pattern from cannabis-quitting and blog-diary corpora: relapse is
triggered by **feeling fine**, not by craving. **That pattern reproduces cleanly and independently here, in both
alcohol and cannabis, in first-person accounts and in a peer-reviewed study.**

The decision to moderate arrives during a *good* stretch, and the good stretch is read as evidence of restored
control:

| Who | Substance | State at the moment of deciding | Outcome |
|---|---|---|---|
| u/bingbangtheory (T13) | cannabis | day 72; "I didn't even think about MJ"; "Thought I was out of the woods" | failed within 2 weeks |
| "Jessica" (T14) | alcohol | explicitly **not** stress or trauma — "I just thought I deserved a treat" | failed, needed medical detox |
| "Martin" (T16) | alcohol | ~4 years abstinent, relaxed, offered a free drink | 6-day episode, one beer → two cases |
| "Veronica" (T17) | alcohol | 10 months abstinent — "I thought that I had been off of it long enough" | panic attack, goal abandoned |
| u/jakejjoyner (T15) | cannabis | 10 months sober, on holiday, met someone | "failed miserably" |

Corroborating evidence from a controlled trial, which nobody in these forums cites and which points the same
way: Bold et al. 2016 (PMID 27690505), daily-diary data from 127 young adults in a naltrexone RCT, found
*"positive affect was associated with greater urge to drink, which in turn was associated with greater odds of
BAC ≥ .08"*. **Positive affect predicted the urge.** The forums describe as a personal failing what a trial
measured as a within-person mechanism.

### Is there any reported signal that distinguishes a durable goal from a rationalised one?

Nobody reports a reliable predictive test. But four candidate signals appear, and they are worth stating as
hypotheses the product could actually check:

1. **Timing of the decision.** Every failure above was decided *during* a good stretch. Several durable cases
   were decided *outside* one: Wallace decided moderation was realistic because abstinence was not
   (*"[Declaring] that I was never going to drink again didn't seem like a reasonable thing to expect of
   myself"*); Daafi simply never wanted to quit (*"I just wanted to cut back… I like the taste of beer"*).
   **A reduction goal formed as a considered preference looks different from one formed as a reward for a good
   run.** u/JoeTisseo (T45) is the only person in the collection who asked the question in real time —
   *"I wonder whether this is my brain trying to trick me"* — which is the exact prompt the product should
   surface.
2. **Whether an off-switch has ever been observed.** The people who held moderation cite direct evidence:
   Floyd *"I've learned that I have an off-switch"*; Victor *"I began having alcohol again, but I realised I
   could control it"*. The people who failed cite the absence: Vincent *"I know that my next drink is not gonna
   be one, it's gonna be all"*; Jessica *"Once I start to drink, there is no stop button"*; jakejjoyner
   *"literally NEVER happened in my 4-5 years"*. **The evidence is retrospective and behavioural, not a feeling.**
   Asking "when did you last stop at one, and when was that?" is answerable; "do you think you can moderate?"
   is not.
3. **Whether the target is a number or a category.** People who succeeded mostly named a *class* of occasion or
   a portable phrase (TQ4, TQ5). brightspice, working with clients: *"When moderation becomes about a strict
   number then that's when I see people rebel."*
4. **Whether the plan rests on self-trust or on structure.** The sharpest contrast in the collection:
   u/bingbangtheory failed *because* self-trust returned (*"Thought I was out of the woods"*), while
   u/Plantmoremilkweed (T46b) has held a reduction for months while explicitly stating the opposite —
   *"right now I still crave it every day and **can't really trust myself to moderate**"* — because a timed
   lock box, not their judgement, enforces the gap. **A moderation plan justified by restored confidence is the
   risky kind; a moderation plan that assumes confidence will fail is the durable kind.** This is directly
   testable in-product: ask what happens on the worst night, and treat "I'll be fine" as a red flag rather than
   a green one.
5. **What abstinence currently feels like.** u/First_Difference_239 (T22), *"white knuckling it and miserable"*,
   predicted their own failure — *"an arrow that's been pulled reallllllyyyyy far back"* — and proceeded anyway.
   **Miserable abstinence generates moderation plans.** Treating a moderation request as a signal that the
   current abstinence is unsustainable is likely more useful than treating it as a goal to accept or refuse.

Two honest counterweights:

- **Personality/severity heuristics are folk theory here, not evidence.** Two Mumsnet posters independently
  attribute the outcome to "personality type" (Jw1102, WaddleAway) — but Henssler found effect sizes "not
  clearly dependent upon AUD severity," and brightspice, who works with moderators professionally, explicitly
  rejects the personality account: *"I don't believe it has anything to do with who you are as a person."*
- **Some people who hold moderation do not believe they know why.** u/demoniass, stable for 10 years:
  *"my moderation has nothing to do with willpower, I'm just lucky."* Any confident predictor the product ships
  will be wrong for this person in both directions.

---

## 7. Safety flags raised by this material

1. **Self-managed taper from physical dependence.** HAMS testimonial "EG" describes being *"physically addicted"*
   and *"particularly afraid of stopping 'cold turkey' considering the volume of vodka I'd been consuming"*, then
   breaking dependence with a self-managed taper described on the HAMS site. "Jessica" describes a long
   self-managed taper *"because I live alone and I didn't want to risk DTs"*, later needing a doctor-prescribed
   at-home detox. **Both are medically dangerous. No schedule, volume or method has been extracted here, and the
   HAMS taper page was deliberately not retrieved.** Route these users to a clinician.
2. **Naltrexone taken by a physically dependent person mid-reduction.** TheDogAndDuck (Mumsnet, 2023-10-29/30)
   describes a friend given naltrexone to reduce intake before a home detox: *"they are alcohol dependent and
   could die if they stop too quickly."* Naltrexone is an opioid antagonist; interactions and dependence status
   are clinical questions.
3. **Prescription medication bought from an overseas seller without a prescription.** GreenGodiva (Mumsnet, June
   2026) describes buying 200 naltrexone tablets from an overseas online seller with no prescription, and
   stockpiling antibiotics from the same source. **Deliberately not detailed here.** Unverified provenance,
   no liver-function monitoring, no clinical oversight. Several posts in that thread were removed by Mumsnet
   moderators. The product must never facilitate this.
4. **Liver function testing is being treated as a commercial obstacle, not a safety step.** Multiple posters
   discuss avoiding, deferring or shopping around for liver tests, and how to keep it off their medical record.
5. **Tolerance reduction cuts both ways** (TQ15) — lower tolerance means previously routine amounts now impair
   more.
6. **Reduction targets that remain in the harmful range.** T1 — a six-pack a day — is a genuine and proud harm
   reduction, and still dangerous. The product must be able to say "this is real progress" and "this is still
   hurting you" in the same breath without retracting either.

---

## 8. Gaps in this collection — do not paper over them

- **No Willenbring, no NIAAA primary text, no Club Soda / Sunnyside / Reframe first-person material, no
  drinking-reduction trial participant accounts in their own words.** All were blocked or paywalled. The NIAAA
  position appears here only as *characterised by* Gilbert et al. 2026.
- **Moderation Management is under-represented.** Its forum and blog are members-only; the public testimonials
  page is a marketing artefact (curated, undated, no failures). Treat MM quotes as weaker evidence than the
  forum and Reddit material.
- **Almost no long-run failure reporting.** People who quietly drift back do not post. Every "it held" claim
  here is a snapshot from someone still engaged with the topic. The 3-, 7- and 10-year claims (T3, T4, T52) are
  single sentences, unverifiable beyond the fact that they were written.
- **No accounts from people who moderated successfully and then left the community entirely** — which, if
  moderation works, is what success should look like. This is a structural blind spot in every forum-derived
  corpus, this one included.
