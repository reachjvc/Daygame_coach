# Recovery testimonials — Problem gambling

Verbatim first-person accounts of behaviour change in gambling harm, collected for recovery-support product design.

**Collected:** 2026-08-17

---

## 1. Access notes — what I could and could not fetch

| Source | Status | Notes |
|---|---|---|
| **r/problemgambling** | ✅ Fetched | Blocked via `reddit.com` and the `.json` API (HTTP 403 anti-bot). **`old.reddit.com` HTML works via curl with a browser UA** — note a sibling researcher found old.reddit blocked for them, so this is network-dependent, not universal. 136 post pages retrieved with comment trees. Rate-limits hard at ~1.5s/request; ~9s/request is stable. **Fallbacks if old.reddit is blocked:** `arctic-shift` (bulk subreddit date-range dumps) and `pullpush` (`https://api.pullpush.io/reddit/search/submission/?ids=<post_id>`). Not needed here. |
| **Delaware Council on Gambling Problems** | ✅ Fetched | Full published personal essay. |
| **Minnesota Alliance on Problem Gambling (MNAPG)** | ✅ Fetched | Full published personal essay. |
| **Betknowmore UK** | ✅ Fetched | Full published client story. |
| **GamblerND** (North Dakota, Gamblers Choice / Lutheran Social Services) | ✅ Fetched | Story series; 6 retrieved. |
| **Gamblers Anonymous Saskatchewan** | ✅ Fetched | 6 published member testimonials. |
| **Gordon Moody** | ✅ Fetched | Charity blog; one ex-service-user first-person piece. Site is WordPress; `wp-json` search available. |
| **Gamban** | ✅ Fetched | Marketing testimonial page. **Heavily curated — see bias warning.** |
| **GamCare** | ❌ **BLOCKED** | Cloudflare 403 on every UA tried (desktop, mobile, Googlebot), on both `www.gamcare.org.uk` and `community.gamcare.org.uk` (the peer forum). Wayback CDX also failed/rate-limited. **This is the single biggest gap** — the GamCare forum is a large UK peer corpus that I could not reach. |
| **GambleAware** | ⚠️ Reached, unusable | `begambleaware.org` 301s to `gambleaware.org`. The lived-experience page is **video-only** — no transcripts, so no verifiable text quotes. |
| **BBC / journalism** | ⚠️ Reached, unusable | The BBC Gordon Moody piece (`health-41700730`) is a video page with no transcript. |
| **Published memoir** | ❌ Not obtained | No memoir or long-form journalism text was verified. |

### Verification confidence

**High — and machine-checked, not asserted.**

Every quoted string was copied out of raw HTML fetched to disk and read directly, never through a summarising model. The one page initially read via a summariser (Gordon Moody / Paul) was **re-verified against the raw HTML** before use.

Two scripts were then run over the finished document against the archived HTML:

| Check | Result |
|---|---|
| **Exact-substring**: every quote fragment must appear verbatim in the archived source text (elisions marked `[…]` split into fragments; typographic quote/dash variants normalised on both sides) | **270 / 271 exact.** The 1 "miss" is a regex artifact where the extractor matched my own editorial prose, not a quote. |
| **Attribution**: every Reddit block-quote must appear in text authored by the handle it is attributed to; every charity/commercial block-quote must appear in that page's archived HTML | **107 / 107 Reddit handle-confirmed; 53 / 53 charity-text-confirmed. 0 problems.** |

**Errors this caught and I corrected — recorded because they show the failure modes:**
1. **A real misattribution.** Item 21 originally credited a blocking checklist and the proxy-card passage to *u/PhoneFancy95*. They are **u/VirtusSilens** (post `1t15czn`), and one sentence in the same item is **u/Worth-Feature9560** (post `1t7cq65`). Three downstream technique citations inherited the error. Fixed.
2. **Two quote attributions pointing at the wrong post** (GamStop-held-5-years and bank-card-block → actually u/Helirose, post `1qbo3kh`).
3. **Silent alterations of my own making**: joining bullet-list items with invented full stops; concatenating two separate paragraphs into one quotation; truncating mid-sentence and closing with a full stop instead of `[…]`. All rewritten to match source exactly.
4. **Two paraphrases of mine presented inside quotation marks** in the findings section. Replaced with real quotes and an explicit note marking my own summary words.

Caveats that remain:
- **Comment scores are absent** — old.reddit does not render them in the markup I parsed. Post scores are present.
- **Permalink rendering is unverified.** URLs are constructed from `data-permalink` attributes in the archived HTML; the text and handle are confirmed, but I did not re-open each URL in a browser.
- Self-reported figures are **unverified claims**. Treat every "I lost £X" as a claim, not a fact.
- Reddit dates are UTC timestamps from page markup.

### ⚠️ Are the charity/commercial quotes actually verbatim?

This matters as much as the substring check: **charity and commercial lived-experience pages are frequently written up from an interview rather than written by the person.** All charity pages here were checked as static server-rendered HTML — the testimony was present in the raw source, not injected by JavaScript — so the text I quote is genuinely what the page publishes. But *what the page publishes* is not automatically the person's unedited words:

| Source | Reads as | Treat as |
|---|---|---|
| Delaware Council — Jeffrey W. | Authored first-person essay, polished | Likely self-written; lightly edited |
| MNAPG — Sam | **Series titled "In Their Own Words"** — a house style that normally signals an interview written up | **Probably transcribed/edited from interview.** Quote as *published*, not as spoken |
| Betknowmore — Christine | First-person, with speech-like artifacts (e.g. "my peer supporter which was already called Lisa") | Lightly edited from the person's own text or speech |
| GamblerND — Andi, Mike, Randy, Blake | First-person written testimonials | Self-written, lightly edited |
| GA Saskatchewan | Short first-person testimonials | Self-written |
| Gordon Moody — Paul | Structured blog post with section headings | **Self-written but comms-edited**; headings are almost certainly the charity's |
| Gamban | Extracted review snippets, vendor-selected | **Fragments chosen by the seller**; no context, no failures shown |

**Practical rule:** the peer (Reddit) quotes are unmediated and are the ones to rely on for *how people actually talk about this*. The charity quotes are reliable as **published statements** and should be cited as "as published by X", not as a verbatim utterance.

Caveats to hold:
- **Reddit scores** are not rendered in the pages I parsed for comments, so comment scores are absent. Post scores are included.
- Reddit **dates are UTC timestamps** from the page markup.
- Self-reported financial figures are **unverified claims by the poster**, not audited facts. Treat every "I lost £X" as a claim.
- Handles are pseudonymous as published. Charity stories use first name / first-name-plus-initial exactly as the charity published them.

### Source-type breakdown

| `source_type` | Items | Weight |
|---|---|---|
| **peer** (r/problemgambling) | 30 | **Highest.** Unsolicited, no institutional interest, includes failure and relapse. |
| **charity/NHS** | 13 | Good. But these are *selected* by the charity and edited for publication — survivorship-filtered toward resolution. |
| **commercial** (Gamban marketing) | 4 | **Lowest.** See below. |
| **published memoir/journalism** | 0 | Not obtained. |

### ⚠️ Bias warning — commercial testimonials

The Gamban testimonials in §2C are **marketing copy on the vendor's own blog**, published under the heading "What Do Our Users Say About Gamban" and closing with "Start Your Free Trial Today". They are selected by the seller from user feedback. Note what the page does *not* contain: a single account of the product failing, being uninstalled, or being circumvented.

Compare with §3F, where peer users of the *same product* describe iOS uninstallability, app-offloading, and known workarounds. **The peer corpus and the vendor corpus disagree about the same tool, and the peer corpus is the one that mentions failure modes.** Any product decision about blocking software should be weighted on §3F, not §2C.

The same caution applies more gently to charity stories: treatment providers publish stories of people their treatment helped. Gordon Moody's piece is a first-person account of recovery *at Gordon Moody*, published by Gordon Moody during Volunteers Week. It is credible and detailed, but it is not a neutral sample.

**Where peer and institutional accounts conflict, this document treats the peer account as the better evidence.**

---

## 2. Testimonials

Stage key: `deciding` / `early` / `an urge` / `after a lapse` / `long-term`

### 2A. Peer — r/problemgambling (`source_type: peer`)

---

**1. u/OandA_myeverything** — *stage: deciding → early (day 5)* — 2024-02-24 — score 65
[Day 5….i told my wife….](https://old.reddit.com/r/problemgambling/comments/1az75gj/day_5i_told_my_wife/)

> "The weight of my poor decisions was becoming unbearable to hide anymore."

> "I came clean to my wife about everything and was prepared to accept whatever outcome became (even her asking me to leave)."

> "And finally but most importantly, she now has full control of ALL my finances. I feel ashamed and embarrassed and now I'm being treated like a child…because I acted like one."

> "If you haven't already come clean to someone you love and trust….DO IT. I honestly don't think I can beat this alone."

---

**2. u/jdhmmmm** — *stage: long-term (1254 days)* — reply to the above
[comment](https://old.reddit.com/r/problemgambling/comments/1az75gj/day_5i_told_my_wife/ks0q4ji/)

> "I did this 1254 days ago. Have not made one bet since. She is still with me and we are happier than ever."

> "Download the app nomo - it's a sobriety clock. According to it I've saved over 400k."

> "Telling my wife was the best thing I ever did. Wish I'd done it 10 years earlier."

---

**3. u/MaffYootube** — *stage: long-term (2 years 2 months)* — 2024-05-11 — score 31
[2 Years and 2 Months Without Gambling](https://old.reddit.com/r/problemgambling/comments/1cpcnkh/2_years_and_2_months_without_gambling/)

The single most complete technique inventory in the corpus.

> "I cannot stress this enough, tell somebody about your struggles."

> "This was the biggest moment in recovery, I told my partner and it was the best decision I ever made."

> "Surrender your finances to a trusted individual. […] set up a direct debit for any income/wages etc to go to their bank instead each month and if you have any money leftover at the moment, get that sent over.....today! This doesn't have to be permanent, but whilst you adjust to a life without gambling, you need to brute force your approach and make it almost impossible to engage with slots/tickets/whatever your vice is."

> "If you don't have a trusted individual, speak to your bank, let them know about your addiction and they can incorporate blocks to known gambling outlets or transactions. Now this option isn't as bulletproof, but they will also be able to put you in contact with further services for additional support."

> "GAMSTOP is fantastic. Nothing short of commiting fraud can get around it and it's been a blessing in moments where I've tried to revisit my old online casinos. It's the friend you need in these early days and it won't give in."

> "Treat Somebody […] I'd bought some flowers for £5 on the way to my partner's […] In that moment I realised £5 brought both herself and I more joy than the thousands I'd thrown into slots chasing what I thought was happiness."

> "I used to spend £100 per spin in my deepest moments of addiction, now I can make someone I love 100x happier for the cost of a frozen supermarket pizza, it's astounding when you realise."

---

**4. u/thegamfallacy** — *stage: long-term (day 1493)* — 2024-08-03 — score 44
[Day 1493. Please Read…](https://old.reddit.com/r/problemgambling/comments/1ejequv/day_1493_please_read/)

> "I gambled away Harvard Med School, a successful start-up, and racked up tons of debt."

> "I stopped by eliminating access to funds, permanent self exclusions, and taking it one day at a time."

> "This will destroy your life if you don't take drastic action. Even if you win it back you will see gambling as a way out and keep going until you eventually lose."

On the debt, in reply:
> "It wasn't fun, but I got the best job I could find (retail store manager) and moved in with my parents (grateful for this option). I literally paid for everything I made towards debt for a few years."

---

**5. u/KenanKenny** — *stage: deciding (day 0)* — 2024-05-12 — score 54
[I self excluded my self.](https://old.reddit.com/r/problemgambling/comments/1cqi212/i_self_excluded_my_self/)

The mechanics of walking into a venue and doing it:

> "Today, after a loss at poker, I asked for self exclusion, security escorted me to the office where I signed few papers and they escorted me again on the way out. I am gambling free from today, its actually a good feeling."

> "Btw. I am 22 years old"

---

**6. u/Such-Lengthiness5422** — *stage: an urge (chase interrupted)* — 2025-04-06 — score 92
[I am quitting permanently today](https://old.reddit.com/r/problemgambling/comments/1jsuy94/i_am_quitting_permanently_today/)

A chase interrupted mid-act — the exact moment the product would want to reach:

> "I relapsed and was about to start my binge. I lost $200 in about 10 minutes and was about to start chasing my loss and deposit $300 of my last $1000 to my name but no. I fucking quit. I did not deposit it and I am never ever going to gamble ever again."

> "I self excluded every site i use and the local casinos. I am done."

And his own framing of chasing, in reply:
> "the only way to 'win' is to stop. […] stopping is winning. making a correct guess is just delaying the incoming loss and maintaining the illusion that the casino is not just robbing you."

---

**7. u/Cmdinh** — *stage: long-term (1 year)* — 2024-04-30 — score 100
[1 year gambling free!](https://old.reddit.com/r/problemgambling/comments/1cgtvww/1_year_gambling_free/)

> "A few things that helped me keep on track is 1) Transparency- my wife has full access to all my accounts so that means I can't hide anything. 2) I quit playing fantasy football. 3) this is a big one, find a new hobby or two to keep occupied. I started playing basketball and pickleball."

---

**8. u/Ashe_N94** — *stage: after a lapse → early* — 2025-04
[comment](https://old.reddit.com/r/problemgambling/comments/1k53f46/i_genuinely_hate_my_life/moisffo/)

The clearest statement of *layering* in the corpus, plus a self-exclusion that only worked once enforced:

> "The BIGGEST help was setting preventative measures, one may not work but when you put them together they make it really difficult, and you need that to get through those initial 3 months."

> "I had also self excluded but it didn't do much to stop me... until security actually spotted me one day and asked me to leave."

> "Self exclude from brick and mortar locations 2. Self exclude online platforms 3. Only use google wallet or apple wallet ect - give your cards to someone else or even cut them up 4. read 'the easy-way to stop gambling'"

---

**9. u/Happy_Possession_435** — *stage: deciding (still gambling)* — 2024-12-04 — score 110
[33 Year Old, Lost Millions Due To Gambling Addiction](https://old.reddit.com/r/problemgambling/comments/1h6fbad/33_year_old_lost_millions_due_to_gambling/)

**Why people do NOT self-exclude** — unusually honest, and product-relevant:

> "I honestly don't have a proper answer for why I haven't self excluded. I know for sure it's because of the status I've built in the casinos, the level of play and player cards I have which grant me all kinds of comps. Knowing if I self exclude, the one thing I've 'gained' from gambling will be lost."

> "Another reason why I haven't done it is because I know regardless I'll find a way to gamble. There's underground poker spots all over the city. There's endless amounts of online gambling."

> "I've banned myself from every single iGaming (online casinos controlled by Ontario gambling commission) and that's definitely helped the online aspect. But then there's the crypto sites where you can just open a new anonymous account and gamble even after banning yourself from their site."

He resolves, mid-thread:
> "I've decided I'm going to self exclude myself regardless and hope that will aid in my recovery."

The reply that moved him (u/feelslikeliving):
> "Why have you not self excluded from the casinos yet? […] Do it today. Leave no doors open because when the urge comes you'll kick them in for sure. Wanting to leave doors open is the addiction talking."

---

**10. u/muzzledmind** — *stage: deciding (crisis point)* — 2024-12
[comment](https://old.reddit.com/r/problemgambling/comments/1h6fbad/33_year_old_lost_millions_due_to_gambling/m0d9zn1/)

Disclosure and self-exclusion executed together, in one sitting. (Preceding this, he describes suicidal ideation — not quoted here; see §4.)

> "All that being said, I broke down to my wife the other day and explained everything going on. I took out my phone and self-excluded from the casinos I play online."

> "Lean into your passions, get back involved with the music, and self-exclude so that you do not have the option to gamble. It truly is the only way for some of us."

---

**11. u/Fit-Load3733** — *stage: after a lapse (645 days → relapse)* — 2024-10-07 — score 39
[I relapsed yesterday after 645 days clean](https://old.reddit.com/r/problemgambling/comments/1fy46do/i_relapsed_yesterday_after_645_days_clean/)

Self-exclusion described as **friction that degrades the experience**, rather than a wall:

> "One thing that is very important to mention is that self-exlusion is a blessing for us gamblers. I have self exluded for lifetime from the biggest and best gambling websites of my country […] Being unable to gamble on these websites, makes the whole thing less attractive."

> "I am actually 4-5 of self-exclusions away from leaving myself able to gamble only on shadding websites, which is totally disgusting to me."

An accidental bank block ended the session:
> "My card was blocked and also my web banking was blocked too due to security reasons. I stopped there because anyway the website has a rule of maximum deposits of 800 for new accounts until the KYC process finishes […] Otherwise I would possibly still gamble and lose more."

**The community pushed back hard on his framing** — a useful example of peer correction (u/Turbulent-Register72):
> "When OP states that they 'deserved some small relapse, and entertainment after staying sober so long', that there is 100% the addiction speaking, clawing, and surfacing its way back in anyway it can."

Elsewhere **u/Fit-Load3733** gives the clearest debt-facing account in the corpus ([comment](https://old.reddit.com/r/problemgambling/comments/17vq4pt/my_story_140k_debt_because_of_gambling_no_one/k9ds085/)):
> "First thing was to cut all credit cards (I had 14 credit cards and 7 loans at that time, plus my car pawned) and this way I could never use them for gambling again."

---

**12. u/Eastern-Mountain2895** — *stage: after a lapse* — 2025-09-05 — score 41
[I hit a $15k jackpot and didn't get paid — and maybe that saved me](https://old.reddit.com/r/problemgambling/comments/1n96p2m/i_hit_a_15k_jackpot_and_didnt_get_paid_and_maybe/)

**Self-exclusion not enforced by the venue** — the most important backfire account here:

> "Two years ago I put myself on the self-exclusion list. Despite that, over the past 6 months I've been sneaking back into casinos. Truth is, they don't really stop you. they'll happily take your money whether you're excluded or not."

> "The staff swarmed, confirmed I was on the list, threatened to charge me, and I walked away humiliated and empty-handed."

> "Self-exclusion only works if I actually respect it."

---

**13. u/forc3_sim** — *stage: early (8 weeks), after years of relapse* — 2025-08-07 — score 39
[I ruined my life, again and again. My Story](https://old.reddit.com/r/problemgambling/comments/1mjz948/i_ruined_my_life_again_and_again_my_story/)

GamStop held for years, then failed:

> "At the time of moving, i joined Gamstop, i didn't touch a casino for YEARS, until last year i discovered some ways around GamStop or sites which were not affected by it so fast forward to today, £50k in debt."

> "im 8 weeks sober, have GamBan on ALL my devices, still signed up to GamStop and i plan on NEVER gambling again"

---

**14. u/Youaintcuttingit2024** — *stage: early (first clean month in 6 years)* — 2025-09-26 — score 43
[My gambling story 2019-2025](https://old.reddit.com/r/problemgambling/comments/1nqyjrb/my_gambling_story_20192025/)

> "I've tried therapy, I've sold my belongings, I've self-excluded from shops and websites. None of it worked—if one door closed, I'd find another way to gamble."

> "September 2025 is the first month since 2019 where my bank statement doesn't have 'betting and gambling' at the top of my spending."

His advice section, verbatim:
> "Self-exclusion isn't enough if you're not ready. I'd just travel further or find another casino or bookies."

> "Even me going prison wasnt enough to fix it. If you think you can beat this addiction by 'waiting it out,' you're wrong—it takes action."

And a striking backfire on selling possessions:
> "I sold my items and gambled the money, I made all the money back to buy my old items back then I gambled all the winnings and lost"

---

**15. u/laugh_hack** — *stage: long-term (6 years)* — 2023-12
[comment](https://old.reddit.com/r/problemgambling/comments/18o7oxr/so_i_made_it_to_six_years_free_from_gambling/kejlg5k/)

**The best money-architecture account in the corpus** — a solo alternative to handing money to a person:

> "The main thing is to see if you can set up a completely inaccessible second bank account, or something similar. I don't have a credit card number attached to mine and have disabled electronic transfers going OUT, it's where most of my paycheck is deposited. The small account that I can access for cash has a very small balance and a very small withdrawal limit. Everything is on autopay from the big account, so I don't have to make many decisions about money and don't see the balance all that often. This is how I managed everything without having to ask someone to take over my finances."

> "It does rely on me not deciding to drive to the bank, which is several towns away, and withdraw in person; but that sort of thing is not in my nature, so it has worked for me."

> "Most employers will let you split your paycheck deposit between two accounts."

On debt:
> "I paid off my $25k in debt using the snowball method, while abstaining from gambling by protecting my funds from being accessed as cash. No cash, no casino, easier than trying to not gamble by only deciding not to gamble while still able to access funds."

---

**16. u/Ok-Conversation-6873 (31F)** — *stage: long-term with ongoing controlled gambling* — 2025-01-05
[1 year on from the bottom of my pit](https://old.reddit.com/r/problemgambling/comments/1hu714s/1_year_on_from_the_bottom_of_my_pit_progress/)

Named UK bank mechanics, and an unusually candid non-abstinent outcome:

> "By this time a year ago today, I broke down and told him. He gave me so much love and helped me rebuild."

> "weekly GA for the first 90 days"

> "Gamban and GameStop on ALL electronic devices in the house (this is important as this is how I relapsed around April)"

> "to this day, I'm allowed to manage my own finances to a degree. I pay all my bills, have a Monzo pot for food shops and petrol BUT we've agreed on a fun pot where we both have the same amount of money. It's £400-500 pm. Everything else goes into my own savings pot in our joint bank that he can see. He doesn't touch it, just watches it."

What did not help:
> "being able to access dodgy European crypto gambling sites on other devices in the house."

And the honest part most published stories omit:
> "The truth is I still gamble. I can't not. I've only went 90 days without. But in order to put a bet on we have rules I need to follow […] 1) no more than £25 per week on accas 2) I need to tell him when I've put one on 3) I need to walk to the bookies to do it as there's no other way for me to do so. 4) under no circumstances am I allowed to play slots."

> "I did this my breaking trust when he was away and maxing out my over drafts so he couldn't see as my savings pot wasn't touched."

---

**17. u/mindgames2024** — *stage: long-term (6 months)* — 2025-12-09 — score 37
[6 months bet free 🙌](https://old.reddit.com/r/problemgambling/comments/1pi02sn/6_months_bet_free/)

Exact US procedure, including the ongoing maintenance work:

> "No casino to go to, no online casino to log into. Permanent self exclusions everywhere helped so much."

> "I'm from Arizona. For land casinos, I submitted a notarized form to the gaming commission. The exclusion is statewide. Then I emailed each online casino customer support to close my accounts permanently with no option to reopen. Anytime a new site pop up I create an account and do the same thing."

> "I've tried everything, GA, gambling addiction therapy, handling my finances to hubby. This time I made sure I don't have the opportunity to gamble anywhere, unless I drive at least 5 hours to either Vegas or California. Cut yourself from all gambling opportunities!!"

---

**18. u/Unhappy_Opinion_4935** — *stage: long-term (6 months)* — 2026-02-08 — score 18
[Almost 6 months gambling free!](https://old.reddit.com/r/problemgambling/comments/1qzgqdv/almost_6_months_gambling_free/)

Bank-level blocks as the load-bearing layer, and an explicit friction rationale:

> "I have all my gambling blocks across my 2 bank accounts, and I am on Gamstop."

> "I know there will always be ways around this, but with my cards blocked it feels like too much hassle to sign up to foreign casinos (which I absolutely do not trust)."

> "I was using my phone bill to gamble, I took out contracts on new devices so I had more ways to gamble. I was paying about £600 worth of contracts each month - and I still believed this was making me better off."

---

**19. u/m1cha31ra3** — *stage: disclosure (after a lapse)* — 2023-09
[Lost another $23k](https://old.reddit.com/r/problemgambling/comments/16k88va/lost_another_23k/) · [key comment](https://old.reddit.com/r/problemgambling/comments/16k88va/lost_another_23k/k44f8ao/)

**The most procedurally useful disclosure account in the whole corpus.** He was coached on *how* to tell his wife:

> "Beforehand, I spoke to a fellow gambler. And he said, treat this discussion as if it was crisis communication. Keep the message simple (avoid the details) and limit your own reaction. Support them (her) with how they may react. Best advice I got."

> "It also helped that prior to this I enrolled in a debt management plan to say that: 'Yes I have all these debts but I got the consequences reduced by starting this plan.' (Plan lowered my credit and loan interest and monthly payment)."

> "Initially, she was freaking out. So was I inside. I refrained from screaming aloud and being emotional myself. But she felt scared with how we were going to pay for things, particularly child care."

> "She left the kitchen table where we were talking for about an hour and came back. We were both much calmer and made a financial plan together. After that, everything was good."

---

**20. u/Capital-Principle-43** — *stage: long-term (1 year)* — 2025-03-03 — score 49
[I Quit Sports Gambling for a Year—Here's How I Did It](https://old.reddit.com/r/problemgambling/comments/1j2tpix/i_quit_sports_gambling_for_a_yearheres_how_i_did/)

Notable because **every standard technique failed first**, and the thing that worked was cutting the trigger content:

> "Self-exclusion from every betting platform I had access to. Giving my money to loved ones so I couldn't access it. Destroying my debit cards and keeping only cash. Opening a separate savings account with no easy withdrawal option. Turning to faith (Islam), joining GA meetings, blocking betting sites—you name it. But no matter what I did, I always found my way back to the bookies."

> "I was trying to stop gambling while still consuming sports."

> "I unfollowed every sports page, journalist, athlete, and commentator on all social media. I deleted my sports Twitter (which was full of betting content). I removed myself from sports-related group chats and distanced myself from friends whose bond with me was based on sports. I stopped playing sports video games (FIFA, 2K, etc.), because they still kept me attached to that world."

> "If you're struggling with this addiction, consider the root cause. If sports are your trigger, don't just quit betting—quit sports. Out of sight, out of mind."

---

**21. u/VirtusSilens** — *stage: long-term (1 year 4 months)* — 2026-05-01 — score 27
[1 year and 4 months gambling free and how I managed to quit.](https://old.reddit.com/r/problemgambling/comments/1t15czn/1_year_and_4_months_gambling_free_and_how_i/)

The cleanest description of the **proxy-card** arrangement:

> "I didn't rely on willpower. I blocked myself everywhere:"
>
> "Self-excluded from every gambling site I used"
>
> "Registered for national gambling blocks"
>
> "Deleted all accounts, emails, promotions tied to my gambling activity."
>
> "Stopped watching gambling content completely on social media."
>
> "I made it as hard as possible to even start."

> "Every month I moved my salary to my family member. They gave me access to money through a separate debit card on their name, that I couldn't use for gambling, but I could use for groceries and shopping. No access = no impulsive deposits."

---

**21b. u/Worth-Feature9560** — *stage: early (1 year in)* — 2026-05-08 — score 50
[A year ago I placed my first bet. I didn't realize it would cost me everything.](https://old.reddit.com/r/problemgambling/comments/1t7cq65/a_year_ago_i_placed_my_first_bet_i_didnt_realize/)

> "I tried self-exclusion, but there are endless sites. I tried gambling blockers, but when the urge hits hard, you find ways around everything."

---

**22. u/BarlimanandBill (23M)** — *stage: long-term (debt cleared)* — 2023-06-21 — score 100
[I (23M) just paid off my last gambling debt](https://old.reddit.com/r/problemgambling/comments/14exgmk/i_23m_just_paid_off_my_last_gambling_debt/)

> "After over 10k in accumulated debt I just paid my final loan payment today 🥰"

> "Still going to allow my parents to manage my finances for the year so I don't risk anymore money until I've built up my savings again."

---

**23. u/Ok-Button-6063** — *stage: long-term (2.5 years)* — 2025-11-17 — score 171
[Going to Federal Prison](https://old.reddit.com/r/problemgambling/comments/1ozutaz/going_to_federal_prison/)

Crime and concealment as the core harm:

> "I had a very successful accounting career; however, after hitting rock bottom in my personal finances, I was desperate for a solution and I started embezzling from my employer. […] It went on for about 3 years before I had completely drained the company accounts. Every penny that was stolen was lost to gambling. Over half a million dollars."

> "My biggest mistake was not telling anyone the full truth about my addiction. Anybody who is struggling with this addiction, please reach out for help. Don't let pride cloud your judgement and ruin your life."

---

**24. u/shadowlauren** — *stage: after a lapse* — 2024-08-27 — score 26
[Relapsed, lost everything, hanging in there](https://old.reddit.com/r/problemgambling/comments/1f2uka3/relapsed_lost_everything_hanging_in_there/)

Ordering error worth designing around — **blocker installed before self-exclusion**:

> "I've installed gamban. I should have self excluded before I did, I guess I'll have to email the casinos now since I can't access their sites."

Her cash plan, and the deliberately-left-open door:
> "I plan to start withdrawing in cash a budgeted amount and only spending from there. The rest of my pay cheques will go directly to credit cards and I'll call to disable cash advances. I'll leave $100 in my cheating account just in case."

On why she had not disclosed:
> "I haven't yet, if I'm going to tell my boyfriend about it I want it to be after I've made some solid progress. I know that would make it easier though, and will try if I fail again."

---

**25. u/No-Category1703** — *stage: an urge / backfire* — 2024-06-13 — score 14
[WTF do I do? The second I have access to money online I can not control myself](https://old.reddit.com/r/problemgambling/comments/1df6fyf/wtf_do_i_do_the_second_i_have_access_to_money/)

**Cash-out protected the old money but not the new income:**

> "I only have 2k left, so I took it out of my bank account in cash to stop myself from online depositing. Well, I got paid today from a new job, and the second I saw the money in my account, I spent it all gambling."

> "The only reason I haven't lost the 2k is because it's in physical cash in my bedroom. My laptop doesn't support Gamstop because it runs on windows, and won't work even though I downloaded it."

Earlier, the same user on a self-exclusion **expiring** — a designed re-engagement moment:
[Wow, I'm actually sick of this.](https://old.reddit.com/r/problemgambling/comments/1by4nzw/wow_im_actually_sick_of_this/) — 2024-04-07 — score 102
> "This morning I checked my emails and saw I got a 200 euro bonus from a casino, their way to welcome me back after the month self-exclusion ended."

> "Well, I rejected the bonus and added another exclusion to my account."

---

**26. u/whoiswylis** — *stage: affected family member* — 2025-12-29 — score 34
[My husband relapsed today and I am broken.](https://old.reddit.com/r/problemgambling/comments/1pyh6hv/my_husband_relapsed_today_and_i_am_broken/)

Included because the affected-other perspective is systematically under-represented, and because it documents **a self-exclusion that did not hold**:

> "I thought that can't be right? He said he joined self exclusion, so he cant enter a venue. So I went there and caught red handed and made a fool of myself at the venue."

> "So I have been deceived and lied to and guilted and manipulated for the past few years. I dont even know how long because I cant trust his words."

> "I am angry about the betrayal, lies, and robbing me of any sort of future."

> "I even asked the question today if I didnt go there and see it all with my own eyes would he have told me, and he said he would have been scared to."

> "I am now in too much debt and too broke to leave. So I am trapped now."

---

**27. u/VentureCatalyst00** — *stage: an urge (the reasoning trap)* — 2025-11-16 — score 230
[You're a gambling addict for life, always remember that.](https://old.reddit.com/r/problemgambling/comments/1oz14z6/youre_a_gambling_addict_for_life_always_remember/)

The best articulation of the relapse-thought script:

> "Then one day you're bored and a little thought pops in your head and says "You know I'm doing really well, I've been clean for 3 months, I've got a little extra money in my account I can use for fun, let's just take $100 to the Casino OR deposit on a gambling site and see what I can do. If I lose the 100, I'll call it quits. If I win, I'll cash out and call of quits.""

> "So you proceed to play that $100, and you lose it. Or even worse, you win. Doesn't matter, you started playing and that's where you already lost."

> "You entered the 'zone' as I like to call it. The zone is where you're gambling, and all that matters once you're in that zone is to keep going. All money, whether it's money in your account or any money you've won, is just fuel to stay in the 'zone'."

---

**28. u/dymondhandsy** — *stage: an urge (daily practice)* — 2026-02
[comment](https://old.reddit.com/r/problemgambling/comments/1r81kpe/i_lost_590k_in_a_single_day/o6896hw/)

A concrete, repeatable daily ritual:

> "Don't gamble today on anything for any amount and when you wake up tomorrow and look at yourself in the mirror tell yourself 'I will not gamble today' and do this every morning, the same affirmation one day at a time."

---

**29. u/armageddon_20xx** — *stage: long-term* — 2023-05
[comment](https://old.reddit.com/r/problemgambling/comments/135b0pk/day_3652_10_years/jm7910v/)

On why **day-counting works as a deterrent**, not just a reward:

> "It is helpful to have someone as an accountability partner, this is one of the huge benefits of GA. You don't need to be in GA to have one. Pick someone close to you. Random internet people don't count. You will need to share everything with them."

> "My advice is to get a clock or counting mechanism of some kind and count the days […] One of the inexplicably large deterrents to relapse is that the clock has to be reset."

---

**30. u/sirmurr777** — *stage: long-term (9 months)* — 2025-12-18 — score 26
[9 months gamble free. It's possible if you want it bad enough !](https://old.reddit.com/r/problemgambling/comments/1ppx12o/9_months_gamble_free_its_possible_if_you_want_it/)

Identity reframe, explicitly modelled on non-smoking:

> "I've never been a cigarette smoker. I would NEVER in my wildest imagination walk into a gas station, buy a pack of cigarettes, and smoke. LOL. Now I think of gambling the same way. I AM NOT A GAMBLER."

> "Out of the 3, gambling did the most damage and was the hardest to quit. 3.5 years off booze and drugs now."

And on why day 1 matters:
> "Day 1 is more important than day 270 and I'll tell you why. Day 1 is you demanding better for yourself. Wanting to change. Being tired of feeling the pain that gambling causes."

---

### 2B. Charity / fellowship (`source_type: charity/NHS`)

---

**31. Jeffrey W.** — *stage: long-term (~1 year)* — Delaware Council on Gambling Problems
[The Hidden Addiction](https://www.deproblemgambling.org/Recovery/Stories/The-Hidden-Addiction)

> "Chasing losses only lead me to gamble with more frequency and with more money than I wanted or could afford to lose. Paradoxically, winning was almost worse than losing. A win caused me to want to gamble more."

> "I became physically exhausted, financially ruined and emotionally bankrupt. I knew I was destroying myself, but I couldn't stop gambling."

> "Little did I know that it was virtually impossible to gamble compulsively without lying, stealing, avoiding reality and escaping into a dream world."

> "It was at my first GA meeting that I learned about gambling addiction. […] What amazed me was that many of these people had not gambled in months and even years."

> "Abstaining from gambling hasn't been the hardest part of my recovery. The greatest challenge is rebuilding the personal relationships I destroyed by gambling."

> "I am grateful that my gambling addiction is no longer hidden from my family and friends."

---

**32. Sam** — *stage: long-term (6 months since last relapse)* — MNAPG, 2023-11-29
[In Their Own Words – Sam's Story](https://mnapg.org/in-their-own-words-sams-story/)

> "In 2006, I was sentenced to prison for eight years for writing bad checks and fraud. I remember asking the judge if they had a gambling court as they do for drugs and alcohol, but they had no equivalent."

> "I went to that meeting and that's when I first found a certain sense of home. I remember thinking, 'These people understand why I can't stop gambling.'"

> "When I first found the GA community, I thought I had my gambling woes — as well as drinking and drugs — whooped. But while I found the right people, I didn't use the tools properly."

> "I had several relapses, including one after I was six years clean. There were times when I thought I could be a social gambler but my addiction would just pick up where it left off. I realized that what I was missing was not believing I was powerless."

The single most actionable moment — a **phone number kept from two meetings months earlier**:
> "While there, I had a moment of clarity and remembered that I still had my sponsor's phone number from when I attended two GA meetings months earlier. I called him, desperate for help. He was willing to help me, but only if I helped myself."

---

**33. Christine** — *stage: long-term (over a year)* — Betknowmore UK
[Christine's Story](https://www.betknowmoreuk.org/client-stories/christines-story)

The corpus's clearest account of **marketing-triggered relapse** and of gender-specific isolation:

> "When life got hard again and gambling companies continued to send free money bets, it took one weak moment, and I went straight back."

> "the one thing that prevented me from going as far as I did later on in my life was my relationship with physical cash."

> "One of the worst days of my life up to that point was the day I lost more than a year's wages in an afternoon, only to win it back and then lose it again within 2 hours with money that was available on my credit card."

> "Unfortunately, as a female, I felt very isolated and there seemed to be limited help and information. At this time, I attended gamblers Anonymous, and as the only female, I found this experience completely overwhelming."

> "Unfortunately, I concluded that I could battle this addiction by myself and although my life became manageable again my addiction was waiting around the corner for me."

On peer matching:
> "I asked if there was anyone with lived experience who I might be able to speak to in the hope that they would understand what I was going through. Fortunately, I was informed that there was a program called Peer Aid where I could have 1:1 sessions with somebody who had lived experience in gambling."

> "being able to have 1:1 with another female with lived gambling experiences put me at ease and I was comfortable to openly talk about my experience."

---

**34. Andi** — *stage: long-term (~3 years)* — GamblerND
[Andi's Story](https://www.gamblernd.com/andis-story/)

> "For a long time, I didn't see my gambling as a problem; everyone else gambled – why shouldn't I?"

> "I 'borrowed' money from my kids, my husband and my father. I wrote bad checks and desperately looked for change in old coat pockets."

> "My husband finally pleaded with me to quit and get help; he was emotionally exhausted and financially depleted from my gambling. […] Instead of getting angry, I cried. I felt so scared and broken. I had to change and needed help."

> "Eventually I made amends to the people I had hurt, repaid borrowed money and began to rebuild my life."

> "I know that I cannot gamble again – not even small bets. But I'm okay with that"

---

**35. Randy** — *stage: long-term (14 months)* — GamblerND
[Randy's Story](https://www.gamblernd.com/randys-story/)

> "'When you win you lose, and when you lose you lose.' Every time I 'won', I would return as soon as possible to the casino, and give it all back along with several hundred more dollars."

> "I always told others (and myself), 'Look, I'm single, with no family to take care of. What business is it of anybody else's what I do with my money'?"

> "The first time I tried to quit gambling was in 1993. I kept thinking I could do it on my own, without help, because I had the answers."

> "Later I was fired from a job I loved because I was stealing money to finance my gambling."

> "Sometimes the idea of never gambling again seems absurd to me, but I know that I can GET THROUGH TODAY without it. I can live with the fact that every day I need to make choices, and the first choice is always not to gamble."

---

**36. Mike** — *stage: long-term* — GamblerND
[Mike's Story](https://www.gamblernd.com/mikes-story/)

> "All I knew was that gambling allowed me to forgo all these responsibilities and hide in the isolation."

> "With the help of a family intervention, I found out about (GA) Gamblers Anonymous."

> "As the GA Program has taught, we are never free of gambling. We are given tools to manage when any gambling urges come around."

> "My finances immediately turned around and I am no longer behind on bills and still have plenty left over to spare. This in itself, has taken an additional burden, of complex-negative-emotions out of my life."

> "I made amends to most my family members and friends. This really has taken a huge burden of guilt away that I let build up."

---

**37. Blake** — *stage: long-term* — GamblerND
[Blake's Story](https://www.gamblernd.com/blakes-story/)

> "I could not stop no matter what; win or lose. My compulsion to gamble was so great, I was losing sleep, my mood was greatly affected, people close to me knew something was off, my work suffered, every waking idle minute was used to gamble, our family finances quickly fell off a cliff, and above all, my stress level was always a 10 out of 10."

> "Each and every day during that time, I deceived myself and many others and believed I could find the willpower on my own to stop."

---

**38. Paul** — *stage: long-term (in treatment → recovery home)* — Gordon Moody (charity; published by the treatment provider)
[Volunteering – how it helped my recovery from gambling addiction](https://gordonmoody.org.uk/blog/volunteering-how-it-helped-my-recovery-from-gambling-addiction/)

> "Throughout, my 20 years of addiction, I always helped people where I could. Either by giving my time or giving financially, something I now realise was not due to my desire to genuinely help but was a self-gratifying way of hiding my addiction."

> "My first reaction was quite negative, I'm here to stop gambling I thought, not be a good Samaritan, but a little reluctantly I went along."

> "I had helped someone with no ulterior motive, I wasn't doing it to hide something bad or because I was getting something out of it. I actually looked forward to going back to help again."

> "Years of selfish behaviour had taken its toll on me but I was now experiencing the joy of being kind."

> "I felt complete and I think for the first time genuinely believed I had a future, one that I was excited about."

> "It has helped me combat boredom and also has given me a structure and routine, two huge factors that help me stay focused and positive."

---

**39–44. Gamblers Anonymous Saskatchewan** — published member testimonials
[Testimonials](https://www.gamblersanonymoussaskatchewan.org/testimonials/)

**Dwayne** — *long-term (2+ years)*
> "It started when I was fourteen with Bingo, then progressed to Sport Select, VLT's, the Internet, and when I was of age, to the Casino. There was no amount of money that I wouldn't spend and nothing I wouldn't gamble on."

**Patricia** — *long-term (10 years)* — grief as the entry point, and a return after leaving
> "I became a widow, and then a compulsive gambler. After my husband died I found I would wander to the casino to escape from my own thoughts. After about three years I found I was lying about where I had been because I was ashamed."

> "I went to my first meeting not believing I really had a problem. I got a year in and walked away due to a personality conflict. Three years later I was back, broken and defeated. All the insurance money was gone, retirement gone, credit cards and line of credit maxed out."

> "I have made friends, purchased a home, and retired. I will be celebrating my 10th birthday and still attend meetings regularly."

**Mike B** — *long-term (5 years)*
> "Before the GA program I hated myself and I used gambling to escape the feelings of self loathing. Today I'm not perfect, but I can honestly say that I love who I am"

**Adam** — *long-term*
> "When I came to Gamblers Anonymous, my bank accounts were $45,000 overdrawn, I was living in my car, and totally self-consumed."

> "Many nights after a big loss at the casino, I'd sit in the parking lot telling myself 'I'm never doing this again'. Then I'd be back there the next day."

**Jilly** — *long-term (13+ years)*
> "I spent many years telling myself that I would quit when I wanted to; that I wasn't gambling as bad as other people; and, that I was entitled to gamble because it was fun and I had earned it. Sadly, none of that was true."

> "I found out that no one was shocked or judged me on the things I'd done to keep my addiction going. I learned that I wasn't a bad person, just a very sick person."

**Unnamed member** — *long-term (20+ years)*
> "I joined GA to stop gambling. I was deep in debt, unemployed, & unemployable. I had been gambling for 34 years, but the last 4 years were hell. I didn't know where to turn, so I thought, 'What have I got to lose'?"

> "I haven't gambled for over 20 years thanks to GA. I still attend 2-3 meetings per week, because I want to stay stopped."

---

### 2C. Commercial — Gamban marketing page (`source_type: commercial`) ⚠️

**Read §3F before giving these any weight.** Published by the vendor, 2022-06-16, on a page ending in a free-trial CTA.
[What Do Our Users Say About Gamban](https://gamban.com/blog/what-do-our-users-say-about-gamban)

**Ash:** > "Saved my life. I cannot give it a bigger accomplishment."

**Yvonne W:** > "This app is brilliant have tried many other apps, but this is the only one that stops me from joining any new gambling sites, even those sites not registered in the uk, such as those not registered on gamstop, it has help me such a lot, and for less than £3 per month."

**Ray:** > "The new update is great! Unable to remove app from phone. Thank you very much!"

**HA:** > "It's only been a short while but it's already been life-changing. I had teething problems to begin with, after a couple of days I checked and I was able to access gambling sites. I needed the help so I contacted their support and they quickly got back to me and gave me the solution."

*(HA's is the only one on the page that admits the product failed at all — and it resolves into a customer-service compliment.)*

---

## 3. Techniques people credit

Ordered roughly by how often they recur and how load-bearing people say they are. **"Recurrence" counts distinct accounts in this document only.**

---

### 3A. Self-exclusion — venue / land-based
**In their words:** "self exclude", "ban yourself", "permanent self exclusions", "SENSE" (UK), "statewide exclusion" (US)

**What a person literally does:** Walks into the venue (or contacts the state gaming commission), asks for self-exclusion, signs paperwork, is escorted out. In Arizona: a **notarized form to the gaming commission**, giving statewide coverage. In the UK: **SENSE** for national land-based exclusion.

**Recurrence: 12+.** The most-cited single action in the corpus.

**Verbatim support:**
- u/KenanKenny: *"I asked for self exclusion, security escorted me to the office where I signed few papers and they escorted me again on the way out."*
- u/mindgames2024: *"I submitted a notarized form to the gaming commission. The exclusion is statewide."*
- u/AvoidingAdversity: *"I've enrolled on SENSE (UK national self exclusion) and GAMSTOP (UK online self exclusion)."*

**⚠️ BACKFIRE — this is the important part:**
- **Venues frequently do not enforce it.** u/Eastern-Mountain2895: *"Two years ago I put myself on the self-exclusion list. Despite that, over the past 6 months I've been sneaking back into casinos. Truth is, they don't really stop you. they'll happily take your money whether you're excluded or not."* He was only stopped when he **won** — and the winnings were voided.
- u/whoiswylis found her husband inside a venue he was excluded from.
- Enforcement, when it does happen, can be what makes it work — u/Ashe_N94: *"I had also self excluded but it didn't do much to stop me... until security actually spotted me one day and asked me to leave."*
- Geography defeats it. u/Youaintcuttingit2024: *"I'd just travel further or find another casino or bookies."*

**Design implication:** treat venue self-exclusion as a *friction and consequence* mechanism, never as a wall. Do not tell a user they are protected.

---

### 3B. Self-exclusion — online, per-operator
**In their words:** "closed my accounts permanently", "self excluded every site i use"

**What a person literally does:** Emails each operator's support asking for permanent closure with no reopen option — then **repeats this for every new site that appears**. This is ongoing maintenance, not a one-time act.

**Recurrence: 8+.**

**Verbatim support:**
- u/mindgames2024: *"Then I emailed each online casino customer support to close my accounts permanently with no option to reopen. Anytime a new site pop up I create an account and do the same thing."*
- u/Fit-Load3733 frames it as cumulative attrition rather than a wall: *"I am actually 4-5 of self-exclusions away from leaving myself able to gamble only on shadding websites, which is totally disgusting to me."*

**⚠️ BACKFIRE:**
- **Time-limited exclusions expire into a marketing event.** u/No-Category1703: *"I got a 200 euro bonus from a casino, their way to welcome me back after the month self-exclusion ended."* He refused and re-excluded — but the operator engineered the moment.
- **Ordering trap:** installing a site-blocker first locks you out of the accounts you still need to close. u/shadowlauren: *"I've installed gamban. I should have self excluded before I did, I guess I'll have to email the casinos now since I can't access their sites."* → **Self-exclude first, then block.**

---

### 3C. GAMSTOP (UK national online self-exclusion)
**What a person literally does:** Registers once (minutes); blocks all UK-licensed online gambling for the chosen period.

**Recurrence: 9.**

**Verbatim support:**
- u/MaffYootube: *"GAMSTOP is fantastic. Nothing short of commiting fraud can get around it […] It's the friend you need in these early days and it won't give in."*
- u/Rocknrolla282: *"I've signed up to gamstop and caught up with my bills I can see a good future for the first time in a very long time and I am confident I won't slip again."*
- **u/Helirose** reports it holding for five years: *"Gamstop has worked for me for 5 years for the online gambling, I won't risk my money on dodgy sites or crypto casinos which aren't registered so I haven't found any ways around this."* ([comment](https://old.reddit.com/r/problemgambling/comments/1qbo3kh/gambling_is_ruining_me/nzmi5n4/))

**⚠️ BACKFIRE — recurs strongly:**
- **Non-GamStop offshore and crypto casinos are the standard escape route**, and several users found them only *after* registering.
  - u/forc3_sim: *"i joined Gamstop, i didn't touch a casino for YEARS, until last year i discovered some ways around GamStop or sites which were not affected by it"*
  - One user: *"I put myself on gamstop […] but I just ended up depositing into those dodgy offshore unregulated non gamstop cesspits […] Self exclude yourself and you can just make a new account and carry on losing it's amazing."*
  - **u/cupcakeddd** (2026-01-17): *"im on gamstop but use a vpn to access foreign casinos"* ([post](https://old.reddit.com/r/problemgambling/comments/1qfcf42/gambling_driving_me_to_suicide/))
- One user reports it simply not installing: *"My laptop doesn't support Gamstop because it runs on windows"* (u/No-Category1703 — likely conflating GamStop with a blocker, but the lived experience is "the tool didn't work for me").

**Notable:** the *distrust* of offshore sites is itself protective. u/Unhappy_Opinion_4935: *"with my cards blocked it feels like too much hassle to sign up to foreign casinos (which I absolutely do not trust)."*

---

### 3D. Bank gambling blocks and card-level controls
**In their words:** "gambling blocks on my bank accounts", "blocked gambling transactions on my cards", "ban on UK credit cards"

**What a person literally does:** Calls or uses the app to switch on the bank's gambling-merchant block; sets withdrawal limits; disables cash advances; cuts up or cancels cards. Several describe **telling the bank about the addiction directly**.

**Recurrence: 9.**

**Verbatim support:**
- u/MaffYootube: *"speak to your bank, let them know about your addiction and they can incorporate blocks to known gambling outlets or transactions. Now this option isn't as bulletproof, but they will also be able to put you in contact with further services for additional support."*
- u/Unhappy_Opinion_4935: *"I have all my gambling blocks across my 2 bank accounts, and I am on Gamstop."*
- **u/Helirose**: *"The biggest thing that's helped me lately is blocking gambling on my bank card and setting withdrawal limits as that's a hard stop."* ([comment](https://old.reddit.com/r/problemgambling/comments/1qbo3kh/gambling_is_ruining_me/nzmi5n4/))
- u/iwontgambleagain: *"Installed gamban and self excluded from every online casino + blocked gambling transactions on my cards. Feels like a weight lifted off my chest."*
- u/Fit-Load3733: *"First thing was to cut all credit cards (I had 14 credit cards and 7 loans at that time, plus my car pawned) and this way I could never use them for gambling again."*
- u/shadowlauren: *"I'll call to disable cash advances."*

**Named banks:** only **Monzo** appears by name (used for budget "pots", not blocks). Nobody in this corpus names Lloyds/Barclays/NatWest/Halifax/Starling. **This is a research gap** — likely because the GamCare UK forum was unreachable.

**Accidental version that worked:** u/Fit-Load3733's relapse was ended by an automated fraud block: *"My card was blocked and also my web banking was blocked too due to security reasons. I stopped there because anyway the website has a rule of maximum deposits of 800 for new accounts until the KYC process finishes"* — and, critically: *"Otherwise I would possibly still gamble and lose more."*

---

### 3E. Money separation — handing control to another person
**In their words:** "surrender your finances", "she has full control of ALL my finances", "transparency", "gave my cards to someone else"

**What a person literally does:** Redirects salary by direct debit into a trusted person's account; receives a **secondary debit card in that person's name** for groceries; grants full read access to all accounts; or hands physical cards over / cuts them up.

**Recurrence: 14 — the most-recommended technique in the corpus after self-exclusion.**

**Verbatim support:**
- u/MaffYootube: *"set up a direct debit for any income/wages etc to go to their bank instead each month […] you need to brute force your approach"*
- u/VirtusSilens: *"Every month I moved my salary to my family member. They gave me access to money through a separate debit card on their name, that I couldn't use for gambling, but I could use for groceries and shopping. No access = no impulsive deposits."*
- u/OandA_myeverything: *"she now has full control of ALL my finances."*
- u/Cmdinh: *"Transparency- my wife has full access to all my accounts so that means I can't hide anything."*
- u/BarlimanandBill: *"Still going to allow my parents to manage my finances for the year"*
- u/GamblingAddictAlt: *"Fear will make you implement preventatives that will keep you from gambling like Gamban, GA meetings, and handing over control of your finances to a loved one."*
- **u/PattonOswalt35**, after a Vegas relapse: *"That was the final straw before I got clean and put my mother in charge of all my finances. Haven't gambled since thankfully."* ([comment](https://old.reddit.com/r/problemgambling/comments/1ltcmbl/these_gambling_youtubers_are_fueling_an_addiction/n1puumv/))

**⚠️ BACKFIRE:**
- **Overdrafts are the hole in the fence.** u/Ok-Conversation-6873: *"I did this my breaking trust when he was away and maxing out my over drafts so he couldn't see as my savings pot wasn't touched."* Handing over savings visibility does nothing if credit remains reachable.
- u/Capital-Principle-43 tried it and it failed alone: *"Giving my money to loved ones so I couldn't access it […] But no matter what I did, I always found my way back to the bookies."*
- Requires a trusted person, which many do not have — u/MaffYootube flags this explicitly: *"sadly we don't all have a trusted individual in our lives."*

---

### 3F. Blocking software (Gamban et al.) ⚠️ **read against §2C**
**What a person literally does:** Installs on **every** device in the household — the household scope is what people say matters.

**Recurrence: 11.**

**Peer verdict — a barrier that buys time, explicitly NOT a solution:**
- u/Seb_2312: *"Gamban is not the one true solution to stop gambling addiction, it is a barrier to give you time to think about what you are doing and, possibly, give you the time to stop yourself. It also, most likely, wont work on its own for a longer period of time. It is just one potential aspect of recovery."*
- u/Throwaway8383716: *"It makes me very aware that I would have to consciously make those decisions and take those steps to get onto a site which allows me to rethink my actions"*
- u/gamblingsucksass: *"I also tried uninstalling it and couldn't. I'm pretty sure there is some hack but the point is to build many barriers to make it more difficult."*

**⚠️ BACKFIRES — none of which appear on the vendor's page:**
- **iOS removability.** u/Sudden_Air6202: *"Gamban works like a charm on android, sadly, u can uninstall it easily on iOS, that's why I want to change my iPad por a Samsung tab, to be done gambling completely"*
- **iOS app-offloading silently disables it while you keep paying.** u/Throwaway8383716: *"my iPhone offloaded the app because it wasn't 'used' and even though I was still paying it loaded a casino ad page so keep an eye on that!"*
- **Unblocked old devices.** u/T00092Y, after a year clean: *"I managed this by finding a old phone out that hasn't even been used for years, which didn't have blocks on."* — hence u/Ok-Conversation-6873's insistence on *"ALL electronic devices in the house"*.
- **Flat refusal on grounds of known workarounds.** u/WoodHouse3991: *"Why don't you self exclude and sign up for Gamban or another website blocking service? I know ways around both of these, so these options are worthless."*
- u/Worth-Feature9560: *"I tried gambling blockers, but when the urge hits hard, you find ways around everything."*
- Blunt, from the OP of [Gambling is ruining me](https://old.reddit.com/r/problemgambling/comments/1qbo3kh/gambling_is_ruining_me/): *"Gamstop doesn't help. Gamban doesn't help either. I always find a way."*

**Design implication:** never present a blocker as protection. Present it as **delay**, and pair it with something that uses the delay.

---

### 3G. Disclosure to a partner or family — **the hinge**
This recurs as a turning point in gambling far more than the money mechanics do. In several accounts, disclosure and money-handover happen in the same conversation, and the money-handover only sticks *because* of the disclosure.

**Recurrence: 18 — the most frequently described turning point in the corpus.**

**What a person literally does:** Tells one person the full amount. Several describe deliberately **not** leading with detail.

**The procedure, from u/m1cha31ra3** (coached by another gambler):
> "treat this discussion as if it was crisis communication. Keep the message simple (avoid the details) and limit your own reaction. Support them (her) with how they may react."

He also **brought a solution to the table** — enrolling in a debt management plan *before* the conversation so he could say: *"Yes I have all these debts but I got the consequences reduced by starting this plan."*

**Other verbatim support:**
- u/OandA_myeverything: *"If you haven't already come clean to someone you love and trust….DO IT. I honestly don't think I can beat this alone."*
- u/jdhmmmm: *"Telling my wife was the best thing I ever did. Wish I'd done it 10 years earlier."*
- u/MaffYootube: *"Just shine a light on what you're going through and make it known."* and, separately: *"This was the biggest moment in recovery, I told my partner and it was the best decision I ever made."*
- u/Ok-Button-6063: *"My biggest mistake was not telling anyone the full truth about my addiction."*
- u/Youaintcuttingit2024 and u/Crazy-Freak5401 both describe **secrecy as the engine**: *"I have a reputation for being smart and responsible in my family, admitting my addiction to them is not an option."*
- u/What_now_2023 names secrecy as the root cause: *"the secret probably is the root-cause which has fueled my behavior (Had to pretend I had money > lending > trying desperately to hit some kind of big win to solve my financial problems, all without telling a soul."*
- **u/Levelthegame** on why it is the strongest tool available: *"Asking whomever you’ve been hiding this addiction from to hold you accountable is the ultimate way to fight this addiction. There’s no way around it…. If you truly want to stop gambling, this is the best tool to use. Most addicts shy away from this tool since they know deep down if they start it, their relationship with gambling will change forever."* ([comment](https://old.reddit.com/r/problemgambling/comments/1pxt0at/what_happens_to_you_when_youre_addicted_to/nwdkf1o/))
- The fear that stops it, and the reply — **u/Competitive-Area-6**: *"What if by being honest to say your wife you know it can possibly cause loss of marriage and three children? Still worth coming clean? I can’t not have them in my life."* **u/Levelthegame**: *"I was suicidal over this exact fear. The truth is, the addiction is still controlling your thoughts and emotions to lead you to this line of thinking. Your wife can definitely leave once she finds out, I can’t guarantee she won’t."* ([thread](https://old.reddit.com/r/problemgambling/comments/1pxt0at/what_happens_to_you_when_youre_addicted_to/onmytbx/))

**⚠️ BACKFIRE / cost — do not present disclosure as uniformly safe:**
- **Postponement is common and self-defeating.** u/shadowlauren: *"if I'm going to tell my boyfriend about it I want it to be after I've made some solid progress."*
- **Partial disclosure sets up a worse second conversation.** **u/sceptomatic** disclosed a £12k loss, then lost £9k more: *"Confessed to partner the £12k and she completely supportive. Don't know if can tell her about last night stupidity just yet."* ([comment](https://old.reddit.com/r/problemgambling/comments/1kd63fo/39k_gone/mqbrl74/))
- **The relationship may not survive, and the affected partner carries real harm.** See u/whoiswylis (§2, item 26): *"I am now in too much debt and too broke to leave. So I am trapped now."*
- Several report the reaction being far better than feared — u/m1cha31ra3: *"I was confused thinking she would be mad but she isn't."*

---

### 3H. Facing the debt number, and formal debt handling
**What a person literally does:** Sits down with every statement and totals it; enrols in a **debt management plan**; uses **snowball** (smallest-first) ordering; consolidates; considers bankruptcy; takes a second job.

**Recurrence: 11.**

**Verbatim support:**
- u/Party-Blackberry9989: *"I finally sat down and went through everything - bank statements, credit card bills, every brokerage account."*
- u/laugh_hack: *"I paid off my $25k in debt using the snowball method"* — and on the timeline, honestly: *"It took me 3.5 years to pay off $25,000"*
- u/Resolution01-22-2023 (engineer, $69.5k remaining): *"RAMSEY SOLUTION really helped me to understand how to tackle the debt smallest to largest."* — with Uber/DoorDash after a full-time job.
- u/Suspicious_Status_40: *"I googled payment calculator, and found that $393 monthly will pay off the rest in a year after this payment."*
- u/muzzledmind: *"My debts became so out of control that I was forced to file bankruptcy this past May."*
- Peer priority-setting, u/Resolution01-22-2023: *"not relapsing way more important than actually paying back the debt."*

**Note:** several accounts warn that **debt consolidation loans became gambling stakes** — u/What_now_2023 took a $35k consolidation loan and *"instead, I invested again"*. A lump sum in the hands of an active gambler is a hazard, not a solution.

---

### 3I. Gamblers Anonymous — meetings, sponsor, step work
**Recurrence: 17** (dominant in the charity corpus, well-represented but more contested in the peer corpus).

**What a person literally does:** Attends meetings (2–3/week is commonly cited), gets a sponsor, works the 12 steps, states their last gambling date aloud at each meeting.

**Verbatim support:**
- u/supedupshortbus on the mechanism: *"We start every meeting telling the group the last time we gambled and I dont want to let the group down by slipping"* — and note: *"I dont beleive in god or higher powers but it was important for me to go to a group"*
- Sam (MNAPG): *"These people understand why I can't stop gambling."*
- Jeffrey W.: *"What amazed me was that many of these people had not gambled in months and even years."*
- Jilly (GA Saskatchewan): *"I found out that no one was shocked or judged me on the things I'd done to keep my addiction going."*

**⚠️ Barriers people report:**
- **Fear of the room.** u/forc3_sim: *"im just not sure I have the balls to go to a face-to-face sit-down"*
- **Gender isolation.** Christine (Betknowmore): *"as the only female, I found this experience completely overwhelming."*
- **Shame at resetting the date.** u/Happy_Possession_435: *"I'm on and off with it solely because I am still gambling and feel embarrassed every time I relapse […] to go into the meeting and have a new last gambling date."* — *the very mechanism that deters relapse also deters attendance after one.*
- **Higher-power framing is a filter** for some (see u/supedupshortbus working around it).

---

### 3J. Day counting / sobriety clock
**What a person literally does:** Counts days, often with an app (**nomo** is named), or posts milestones publicly.

**Recurrence: 10.**

**The mechanism people describe is loss-aversion, not reward:**
- u/armageddon_20xx: *"One of the inexplicably large deterrents to relapse is that the clock has to be reset."*
- u/jdhmmmm: *"Download the app nomo - it's a sobriety clock. According to it I've saved over 400k."*
- u/IntentionSame3313: *"I am counting days. 44 days now. But I won't stop when I get 1000 or 5000. I will keep counting rest of my life."*
- One commenter suggests a paper version: *"buy a calendar and mark the days you are gamble FREE!"*

**⚠️ Tension:** the counter creates the shame that keeps people out of meetings after a lapse (§3I) and out of the community. u/sirmurr777 offers the counter-frame: *"Day 1 is more important than day 270 […] Day 1 is you demanding better for yourself."*

---

### 3K. Cutting the trigger media
**What a person literally does:** Unfollows sports accounts, deletes sports/betting apps, quits watching gambling streamers, deletes YouTube.

**Recurrence: 6.**

- u/Capital-Principle-43 (full list in §2, item 20): *"If sports are your trigger, don't just quit betting—quit sports. Out of sight, out of mind."*
- **u/PattonOswalt35**: *"one of the things I did was delete the YouTube app from my phone and blocked all of those gambling YouTubers."* ([comment](https://old.reddit.com/r/problemgambling/comments/1ltcmbl/these_gambling_youtubers_are_fueling_an_addiction/n1puumv/))
- u/Cmdinh: *"I quit playing fantasy football."*
- u/VirtusSilens: *"Stopped watching gambling content completely on social media."*

---

### 3L. Replacing the time — hobbies and structure
**Recurrence: 12.** Universally framed as *necessary but not sufficient*, and specifically as filling the vacuum blocks create.

- u/MaffYootube: *"Gambling […] occupied such a large part of my day, I could lose hours and hours to slots. Once you take that away it can leave you feeling a little lost."* — he names guitar, reading, growing vegetables, hikes.
- u/FeelinFine97: *"Set non-financial goals (e.g learning how to cook new food, strength/increasing the weights at the gym, running/improving your fitness, career progression etc)."*
- u/AvoidingAdversity, newly quitting: *"I don't think I've got a single hobby, I definitely need to find something to fill my time with!"*

---

### 3M. Volunteering
**Recurrence: 2** (Paul at Gordon Moody in depth; several peer mentions of helping others). Weak evidence base here, but the mechanism Paul describes is specific: identity repair plus enforced routine.

> "It has helped me combat boredom and also has given me a structure and routine, two huge factors that help me stay focused and positive."

⚠️ Note the source bias: published by the treatment provider during Volunteers Week.

---

### 3N. Re-anchoring money to felt value
A distinctive, low-cost technique — and one of the few that is *positive* rather than restrictive.

- u/MaffYootube's "Treat Somebody" (§2, item 3): spend £5 on someone you love and notice the return.
- u/Consistent_Bottle864: *"I went to a Michelin restaraunt in Mallorca this year. Paid lunch for me and my girlfriend 200 euros. It made me starstruck to what the hell am I throwing thousands on."*
- u/Alive-Lab-1358: *"That $54K isn't theoretical. It's in a college fund."*
- u/sirmurr777: *"I also booked a trip to Miami for a week. It cost me as much as I used to put on 1 half of a sporting game or 1 hand of blackjack."*
- Christine (Betknowmore) inverts it — *"my relationship with physical cash"* was what limited her harm before online play removed it. Compare u/ISKslav: *"Money digitally doesnt feel real."*

---

### 3O. Layering — the meta-technique
Nearly every long-term account is a **stack**, and several state explicitly that no single layer holds.

- u/Ashe_N94: *"one may not work but when you put them together they make it really difficult, and you need that to get through those initial 3 months."*
- u/GambleShmamble: *"self exclude, gamstop, gamban, block transactions via bank"*
- u/Tazman12k4: *"blocks etc are a must, self exclusion is all part of the strategy […] the only way out is making extreme changes"*
- u/thegamfallacy: *"eliminating access to funds, permanent self exclusions, and taking it one day at a time."*

**Everyone who reported a single-layer approach reported failure.** This is the strongest pattern in the document.

---

### 3P. Therapy / specialist support
**Recurrence: 9.** Consistently recommended as an *addition* to blocks, and repeatedly specified as **addiction-specialist**, not general counselling.

- u/supedupshortbus: *"Talk to someone that specializes in addiction therapy. Some ppl never figure out why they gamble, but i think therapy is a path to figuring it out."*
- u/feelslikeliving: *"If you can't go to rehab at least go see a therapist specializing in gambling addiction. You can even see someone online so it fits your schedule."*
- One UK user credits **GamCare's 7-day chatroom** specifically for the daily-contact cadence: *"gamcare worked fine for me has they run chatroom 7 days a week so for me i need a daily reminder i cant forget about it"*

---

## 4. Suicidality — how accounts describe getting through it

Suicidal ideation appears in a large fraction of this corpus — far more than in comparable behaviour-change material. **Nothing graphic is quoted here.** What follows is only the *coping and help-seeking* content, which is the part with product relevance.

One poster cites the scale (their claim, sourced to NCPG):
> "The National Council on Problem Gambling (NCPG) estimates that about 80% of those with a gambling addiction consider suicide, while one in five actually attempts it. That's roughly twice the rate of other addictions." — Jeffrey W., Delaware Council

**What people describe as getting them through:**

1. **A specific named person or dependant as an anchor.** u/forc3_sim: *"I can honestly say if i didnt have my daughter I would not be alive today."* Another user names pets. These are concrete, not abstract.

2. **Reframing the loss as recoverable and non-identity-defining.** u/Information100: *"A younger friend of mine said it best, it's just a piece of paper. Don't give up."*

3. **Explicit peer signposting to crisis services.** One user: *"If you are struggling with the same thoughts call your local crisis line, a friend, attend a peer support meeting, schedule a doctors appointment, even talking to someone from those gambling hotlines will help."*

4. **Disclosure breaking the isolation.** u/muzzledmind moved from ideation to action in a single evening by telling his wife and self-excluding from his phone in the same sitting.

5. **Being told directly that recovery happened for someone in a worse position.** u/NoSeSiRegresar: *"I'm $1m+ in debt and lost $29m from the high. It sounds absurd, I know. But this has now given me a lot of experience, especially after wanting to suicide and then turning my life around. I am happy today, about 3 months after my rock bottom."*

6. **Subreddit automod signposting** fires on keyword detection and points to an FAQ and resources — an existing pattern worth noting for product design.

**A caution from the corpus itself** about attention dynamics in peer spaces — u/laugh_hack: *"Lots of gamblers in despair get a couple upvotes and a word or two of encouragement, but mention offing yourself and it gets 30 replies of how valuable your life is."* Any peer-support feature should consider that support may be allocated by severity of language rather than severity of risk.

**Product note:** money-blocking features interact with suicidality. Several accounts place the crisis point at the moment of realising the total. A product that surfaces a debt total should surface support in the same view.

---

## 5. Cross-cutting findings

1. **Layer or fail.** Single-technique approaches fail in every account here. Long-term abstinence is always a stack: exclusion + blocker + bank block + money separation + disclosure + a group.

2. **Disclosure is the load-bearing move, not the money mechanics.** Money controls fail when they are self-administered and secret, because the person retains the ability to undo them. Disclosure is what makes the other layers durable — and it recurs as *the* turning point far more in gambling than the technique lists suggest.

3. **Every tool has a documented circumvention, and users know it before they start.** u/WoodHouse3991's objection — *"I know ways around both of these, so these options are worthless"* — is common. The counter-frame that works in this corpus is not protection but **delay and friction**, in the users' own words: u/Seb_2312, *"it is a barrier to give you time to think about what you are doing"*; u/Unhappy_Opinion_4935, *"it feels like too much hassle to sign up to foreign casinos"*. *(The words "delay" and "friction" are my summary, not anyone's quote.)*

4. **Winning is described as more dangerous than losing** — near-universal, and counter-intuitive to outsiders. Randy: *"When you win you lose, and when you lose you lose."*

5. **The industry actively works against these techniques**: welcome-back bonuses timed to exclusion expiry, free-bet marketing to lapsed customers (Christine's relapse trigger), non-GamStop offshore and crypto sites, and venues that do not enforce their own exclusion lists.

6. **The gap in the peer corpus is UK bank specifics.** Only Monzo is named. This is almost certainly an artefact of GamCare being unreachable, not an absence in reality.

---

## 6. Recommended follow-up

- **Retry GamCare** from a different network or via Wayback CDX with backoff — `community.gamcare.org.uk/forum/recovery-diaries/` is the highest-value unreached source, and would likely close the UK-bank gap.
- **r/gambling_addiction** and **r/GamblingAddiction** were not searched; only r/problemgambling.
- **Trustpilot / App Store reviews for Gamban** would give a much larger set of *negative* commercial-product accounts to set against §2C.
- **Gordon Moody** has ~8 pages of `latest-news` not enumerated; the `wp-json` API is open if more service-user stories are wanted.
- **No journalism or memoir was verified.** If that source type matters, target text articles rather than broadcast pages.
