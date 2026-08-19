# r/leaves (cannabis cessation) — verified first-person accounts and techniques

Harvested 2026-08-17. Substance throughout: **cannabis** (flower, vape carts, dabs, edibles, delta-8).

---

## 0. What I could and could not access — read this first

### Blocked
| Route | Result |
|---|---|
| `reddit.com`, `old.reddit.com` (curl, multiple UAs) | **HTTP 403** |
| `reddit.com/.json` endpoints | **HTTP 403** |
| WebFetch on `reddit.com` | refused by the fetch layer |
| Redlib / Teddit mirrors (`catsarch`, `perennialte.ch`, `opnxng`, `safereddit`) | 403 / 503 |

**No quote in this file was read on reddit.com.** Live Reddit was unreachable from this environment for the entire session.

### Worked
| Route | Use |
|---|---|
| `arctic-shift.photon-reddit.com/api/posts/search` | bulk date-range download — **primary source** |
| `api.pullpush.io/reddit/search/submission/` | ID lookup + score-ranked keyword search (heavily rate-limited) |

Both are public archives of Reddit's own API payloads. Every quote below was read from the archived `selftext` field of a post — i.e. real text a real account posted — not from a rendered page and not from a summary.

**Corpus actually downloaded and searched locally: 7,618 usable posts** (≥300 chars, not `[removed]`/`[deleted]`, not AutoModerator):
- r/leaves — 6,788
- r/Petioles — 830

Months covered: 2021-01, 2021-02, 2021-03, 2022-01, 2022-06, 2023-01, 2024-05.

One honest caveat about process: the download ran continuously while I worked, so the **quote-selection pass was made over roughly the first 3,000 posts**; the final 7,618-post corpus is what every quote was then verified against. Later-arriving posts were searched for counter-evidence but were not re-mined exhaustively for new testimonials.

### Confidence

| Claim type | Confidence | Why |
|---|---|---|
| Quote text is verbatim as archived | **High** | Every quote below was mechanically re-checked as an exact substring of the archived post body (see §5). |
| Handle + thread title + date correct | **High** | Same archive record as the text. |
| URL resolves to that post on live Reddit | **Medium** | Permalinks are reconstructed from the archive's own `permalink` field. I could not open a single one to confirm, because Reddit blocked me. Post IDs are canonical, so these should resolve, but **I have not seen them render**. |
| Post still exists / wasn't later deleted | **Unknown** | Archives are snapshots. Some authors will have deleted since. |
| Recurrence counts | **Low-Medium** | Counts are over *my* 2,986-post sample, not over r/leaves as a whole. Treat as "common / occasional / rare", not as statistics. |

### Sampling bias I noticed — this one is significant

1. **Heavy January skew.** 57% of the final corpus is January (2021, 2022, 2023), because the bulk downloader walks months from January. This over-samples **New Year's resolution quitters at day 1–10** and under-samples people who quit for a non-calendar reason. Mid-year slices (June 2022, May 2024) were added to correct this and now make up 36%, but the skew was worse — roughly 82% January — during the quote-selection pass, so **the testimonials in §1 are more January-weighted than the corpus is.**
2. **Posts only, no comments.** arctic-shift's full-text search timed out on every attempt and pullpush was rate-limited by other jobs sharing the host. On r/leaves a great deal of the *advice* lives in comment replies, so **the technique list below is skewed toward people who wrote their own long post** — i.e. articulate, self-reflective, often at a milestone. Quieter, more mechanical advice given in comments is missing.
3. **Survivor / milestone bias.** Long posts cluster at "day 1" and at round-number milestones. People who quit uneventfully and never posted again are invisible; so are people who relapsed and left.
4. **Success is self-reported at a moment in time.** A "1 year clean" post is evidence about the day it was written and nothing after.
5. **Anhedonia weeks 2–8 is under-covered** relative to days 1–14, because the January skew catches people early.

### A trap worth recording: the academic literature is not a quote source

The obvious workaround — mine the NLP/qualitative papers that study this subreddit — **does not work for testimonials**. The main one (Tapscott et al., *JMIR* 2024, "Examining the Popularity, Content, and Intersections … in a Nonclinical Online Cannabis Cessation Community", <https://pmc.ncbi.nlm.nih.gov/articles/PMC11470220/>) states in its Ethical Considerations section:

> To uphold deidentification and follow Reddit's intention of anonymity, the quotes presented below are paraphrased based on the reviewed data

So **every "quote" in that paper is a paraphrase**, deliberately altered so it cannot be searched back to its author. Anything lifted from it and put in quotation marks would be a fabricated testimonial wearing a citation. I read the paper's full text and discarded all 53 of its quoted strings for this reason. Other Reddit-corpus papers commonly do the same — check the ethics section before trusting any of them.

---

## 1. Testimonials

Format: quote — u/handle, thread title, URL, date, stage, techniques named.
All handles are pseudonymous Reddit accounts. Self-identifying detail is flagged.

### Stage: deciding

**T1** — a tolerance break that accidentally became evidence
> so i though ooo a tolerance break would be a good idea. i'm a week into it and i am so happy and content with life and ive not felt like this in a very long time, i love feeling like this and want to continue feeling like this, so obviously the best option would be to just quit weed forever but the issue is i don't want to do that, but i want to want to do that if that makes sense.

u/othersideleigh — "how to actually *want* to stay sober" — <https://www.reddit.com/r/leaves/comments/1ckpru0/how_to_actually_want_to_stay_sober/> — 2024-05-05
Techniques named: tolerance break (as unintentional diagnostic).

**T2** — the same accident, stated more plainly
> I'm on day 2 of what I originally thought would be a 3-day t-break. After decades on weed, it's clear to me that, while I've had some good times on weed, the overall effect on my life has been negative.

u/ChildEmperorLogan — "Day 2 after 3 decades - Realizing weed has been a net negative in my life" — <https://www.reddit.com/r/leaves/comments/1cif81n/day_2_after_3_decades_realizing_weed_has_been_a/> — 2024-05-02
Techniques named: tolerance break.

**T3** — t-breaks getting harder, not easier
> I've been doing tolerance breaks off and on and each one is more difficult for me than the last. I've started to cut it to only the weekends but I'm afraid that won't do it either because I'm still going through emotionally tiring withdrawals.

u/Hour_Pass8199 — "Should I quit smoking?" — <https://www.reddit.com/r/leaves/comments/1cix3fy/should_i_quit_smoking/> — 2024-05-03
Techniques named: tolerance breaks, weekends-only rule. **Directly relevant to the revolving-door question.**

**T4** — never once by choice
> Never really taken a t break either, I've gone a week without a few times but that's because I was traveling. It's never been by choice.

u/Adventurous_Fox278 — "Why do I still smoke even though I know it'll ruin my day once I'm high?" — <https://www.reddit.com/r/leaves/comments/1chxmx2/why_do_i_still_smoke_even_though_i_know_itll_ruin/> — 2024-05-01

**T5** — the "not rock bottom" decider
> Quit drinking alcohol 9 years ago and replaced it with weed and have smoked, vaped, or taken an edible almost every night since then. 2 weeks ago, I made the decision to stop using.

u/Humble_Marketing_212 — "Weed wasn't destroying my life, but it was holding me back" — <https://www.reddit.com/r/leaves/comments/10ajzqm/weed_wasnt_destroying_my_life_but_it_was_holding/> — 2023-01-13
Note: substitution history (alcohol → cannabis).

**T6** — the honest objection to sober alternatives
> I have ADHD and everything is boring especially people cause of how slow they think and talk it's like I have to be high to even entertain a conversation from a normal person.

u/Dustydoor19 — "Why are alternatives so lame." — <https://www.reddit.com/r/leaves/comments/1050689/why_are_alternatives_so_lame/> — 2023-01-06
Worth keeping: this is the objection a product has to answer, stated without varnish.

### Stage: early days (first fortnight)

**T7** — a dated symptom catalogue (unusually precise)
> Day 4 - increased gastrointestinal discomfort/nausea (5/10), feels like a rock in my stomach creating almost complete loss of appetite, inability to control body temperature, night sweats, severe insomnia, mild depression (nothing feels fun or tastes good)

u/rusty_alt12 — "Catalogue of my withdrawal symptoms" — <https://www.reddit.com/r/leaves/comments/rwuvq8/catalogue_of_my_withdrawal_symptoms/> — 2022-01-05

**T8** — sleep returning in fragments
> the night sweats/chills are not as bad - still around but not as bad. Sleeping is getting slightly better - still hard to fall asleep and stay asleep but i did have a few dreams last night.

u/jgreenz — "Day 4: Field report" — <https://www.reddit.com/r/leaves/comments/rttfl3/day_4_field_report/> — 2022-01-01

**T9** — week one, and the one thing that helped
> It is one of the shittiest sick feelings I've ever experienced — your body simply feels beat and there is absolutely no joy in anything. The only time I felt fine was when I took hot showers.

u/CuriousCat9898 — "1 week sober after being a heavy smoker for the last 10 years — here is my story" — <https://www.reddit.com/r/leaves/comments/1cjbro9/1_week_sober_after_being_a_heavy_smoker_for_the/> — 2024-05-03
Techniques named: hot showers.

**T10** — forcing intake back, meal by meal
> Can't eat anything. Everything makes me want to vomit. I am trying to force myself to eat some soup. 3 days ago I ate half a bowl. 2 days ago I ate 1 bowl. Yesterday I ate 2 bowls.

u/Bob_Eggshell — "I don't know why I'm posting" — <https://www.reddit.com/r/leaves/comments/104vxj8/i_dont_know_why_im_posting/> — 2023-01-06
Substance detail: delta-8 carts specifically; this poster had quit flower previously without trouble.

**T11** — the disbelief problem
> I try talking to people around me. But they act like I'm making it all up. Weed isn't addictive and doesn't have withdrawals; it's probably the flu or covid.

u/Bob_Eggshell — same thread as T10 — <https://www.reddit.com/r/leaves/comments/104vxj8/i_dont_know_why_im_posting/> — 2023-01-06
Recurs constantly: the withdrawal is disbelieved by the people around the quitter.

**T12** — exactly which symptom ended previous attempts
> Any attempts to quit in the past couple years didn't last longer than 2-3 weeks because I couldn't get through the withdrawals, specifically insomnia and anxiety.

u/Possible_Ad_6684 — "Day 40 - Anxiety and Insomnia getting better" — <https://www.reddit.com/r/leaves/comments/rto3if/day_40_anxiety_and_insomnia_getting_better/> — 2022-01-01
**The single clearest statement in the corpus that sleep is the relapse driver.**

**T13** — everything tried, still awake
> I've tried melatonin, Tylenol PM, I don't drink caffeine, I read before bed, I leave my phone and TV out of the bedroom, I'm physically active, and I don't take naps during the day.

u/JoyfulSpite — "Day 4, I can't sleep. Any suggestions?" — <https://www.reddit.com/r/leaves/comments/kqcb9y/day_4_i_cant_sleep_any_suggestions/> — 2021-01-04
Techniques named: melatonin, OTC antihistamine, caffeine abstinence, reading, phone/TV out of bedroom, exercise, no naps. Note this is a *failure* report for the standard sleep-hygiene stack at day 4.

**T14** — insomnia anxiety as its own relapse risk
> I have sleep hygiene so idk what advice I can receive that I don't already know. I think I just want to understand how long it took you guys to sleep because the only way I see myself relapsing is anxiety over this insomnia.

u/CalledIt987 — "Can't sleep since on day 2/3 of quitting weed" — <https://www.reddit.com/r/leaves/comments/105kph9/cant_sleep_since_on_day_23_of_quitting_weed/> — 2023-01-07
What this person wants is not a technique — it's a **timeline**. Recurs often.

**T15** — melatonin as a bridge you come off
> Last night was the first night that I didn't use melatonin either to sleep! The sweats are still happening, but I gotta say I am enjoying those vivid dreams!

u/sunsweet17 — "10 days done!" — <https://www.reddit.com/r/leaves/comments/kppi4l/10_days_done/> — 2021-01-03
Techniques named: melatonin; **reframing vivid dreams as a pleasure rather than a symptom**.

**T16** — the dreams, reframed as novelty
> I haven't had dreams in years, even during sober streaks. But these have been fucking wild!

u/I-Fucked-YourMom — "Day 7 and DAMN these dreams are freaking weird!" — <https://www.reddit.com/r/leaves/comments/1ckds14/day_7_and_damn_these_dreams_are_freaking_weird/> — 2024-05-04
(Handle is crude but pseudonymous.)

**T17** — a bedtime that moved on its own
> Melatonin is a godsend for knocking me out, and I find that I don't stay up playing video games til 1am anymore, I try to get in bed by 11:30pm which is a new development.

u/blondre3052 — "Day 4 updates and thoughts" — <https://www.reddit.com/r/leaves/comments/kqlb2d/day_4_updates_and_thoughts/> — 2021-01-04

### Stage: an urge

**T18** — the timer method, described mechanically (the best single technique account in the corpus)
> When you feel an acute craving to use, sit down with a timer and just watch the time go by. After a while the craving will fade. Stop the timer. Now you know how much time you need to be able to get through to ride out a craving without using. Is it 2 minutes? 15 minutes? It's probably in that range.

u/UnhappySwing — "Advice for New Years leavers" — <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/> — 2021-01-03

**T19** — and what you do with the measurement
> So what new habit can you try to get you through that amount of time? Can you do pushups? Can you close your eyes and focus on your breathing? Can you put on music and loudly sing along? Try different things that fit into the window of time that you can pull out on short notice and come up with a list of options that works for you.

u/UnhappySwing — same thread — <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/> — 2021-01-03

**T20** — posting as a commitment device
> I found this thread and am making this post in hopes that it guilts me into quitting when I get the urge today. This will be my first day not smoking in years and I'm pretty nervous about it.

u/flump41 — "Accountability post" — <https://www.reddit.com/r/leaves/comments/106h4k5/accountability_post/> — 2023-01-08

**T21** — the two-options argument used in the moment
> if being sober feels kind of shitty, then after smoking all I'm left to do is just feel shitty again so to not feel shitty I've got 2 options constantly stay high which is a terrifying concept psychologically and financially or ride it out and embrace sobriety

u/FragrantChipmunk5073 — "Day 7" — <https://www.reddit.com/r/leaves/comments/rz4nes/day_7/> — 2022-01-08

**T22** — permission to not optimise (a corrective to the technique-stacking culture)
> I sometimes just need to feel the shittiness without trying to "fix that" with good habits, and just ride it out. I tend to feel guilty for not trying hard enough so this post is a reminder to me and others who are similar: it's fine to not be and do fine.

u/Technical_Care_2031 — "Reminder: If you're not recovering "perfectly" by exercising diet cold showers yoga meditation and herbal teas then that's perfectly fine also" — <https://www.reddit.com/r/leaves/comments/1chcb77/reminder_if_youre_not_recovering_perfectly_by/> — 2024-05-01 — score 101

### Stage: after a lapse

**T23** — moderation after long abstinence, tested and failed
> Turns out that didn't work for me at all even though I made sure to limit myself. All it took was smoking 1/10th of what I used to and I'm right back to square one.

u/dentcarrot — "Found this sub 1.4 years ago. Relapse 6 months ago." — <https://www.reddit.com/r/leaves/comments/kqtfe8/found_this_sub_14_years_ago_relapse_6_months_ago/> — 2021-01-05
**A moderation backfire, stated as a controlled test.**

**T24** — the exact thought that precedes it
> Even after feeling somewhat "free" meaning I'm completely fine without it, I kept going back to it telling myself that now I can finally moderate use.

u/Apprehensive-Cod-267 — "How do you deal with saying "goodbye"?" — <https://www.reddit.com/r/leaves/comments/ruv8j2/how_do_you_deal_with_saying_goodbye/> — 2022-01-03
**"Feeling fine without it" is itself the relapse trigger.** Recurs strongly.

**T25** — the same, on a two-week clock
> Week 1 had all the withdrawal symptoms, by week 2 was feeling good enough to attempt moderating my use. That did not work out, so I'm back here again.

u/Trying1979 — "Day 2" — <https://www.reddit.com/r/leaves/comments/rvwdu2/day_2/> — 2022-01-04

**T26** — eight years abstinent, then a "little stash for rainy days"
> All in all, my original intent was to smoke once or twice and then keep a little stash for rainy days or every now and again. It became evident that wasn't going to be the case, just like in the past.

u/SenorBulldops — "Smoked for 15 years, Quit for 8 years, relapsed and smoked for 5 days, Quit again today thoughts" — <https://www.reddit.com/r/leaves/comments/rxqh67/smoked_for_15_years_quit_for_8_years_relapsed_and/> — 2022-01-06

**T27** — the hijack, described from inside
> It was bizarre how quickly I decided to throw away all the mental work I had done to get sober prior and give in to this "fuck it" impulsive mentality. I literally was reading posts for hours trying to logically prevent another relapse before my last one but it's like that primal emotional side of my brain completely hijacked me.

u/trynalovelife — "Day 1 again. My last day 1. I WILL win this time!! Lessons learned" — <https://www.reddit.com/r/leaves/comments/rxnk85/day_1_again_my_last_day_1_i_will_win_this_time/> — 2022-01-06
Notable: **reading recovery content was not protective** — it was what he was doing while relapsing.

**T28** — the relapse that wasn't enjoyable
> In the end, these last two relapses weren't enjoyable at all. I was literally returning to chase a high that doesn't exist anymore. I just felt dull, ate a bunch of crappy food till my stomach hurt and woke up ashamed each day.

u/trynalovelife — same thread — <https://www.reddit.com/r/leaves/comments/rxnk85/day_1_again_my_last_day_1_i_will_win_this_time/> — 2022-01-06

**T29** — a lapse counted as a subtraction, not a reset
Thread title: "3 months minus 1 setback"
> I took that opportunity, and threw out my whole stash. I took the advice given by all you fine people, and worked out, meditated, stayed close to family, etc.

u/nicracicot — <https://www.reddit.com/r/leaves/comments/1cha252/3_months_minus_1_setback/> — 2024-05-01
The **title** is the interesting artefact: the framing "3 months minus 1 setback" rather than "back to day 1".

### Stage: long-term

**T30** — five years, and the disposal ritual that started it
> I was tired of being a slave to smoking. Honestly, it was a joke and I said fuck this. I went to the bathroom and flushed everything down the toilet. I got a plastic bag and chucked all papers, pipes etc out! I cleaned my house from top to bottom and told myself that I would keep myself busy enough to forget about the withdrawals. However they never came; life came instead.

u/BankingtoBass — "Complete Guide to Quitting NOW: How I went to from smoking 4-6g skunk a day (from morning till night) between 2005 - 2016, to now being smoke free for 5 years+ (2100+ days)" — <https://www.reddit.com/r/leaves/comments/1036n41/complete_guide_to_quitting_now_how_i_went_to_from/> — 2023-01-04

**T31** — one year, reported honestly as a mixed result
> I'm clear headed, able to be present, and more productive, but my relationships are strained, I'm drinking more, and I haven't lost any weight - I've actually gained weight.

u/MaNiFeX — "A year without weed." — <https://www.reddit.com/r/leaves/comments/rxg08t/a_year_without_weed/> — 2022-01-06 — score 290
**Keep this one.** The highest-scoring one-year post in my sample is not a triumph narrative, and it names substitution to alcohol.

**T32** — 52 days after 26 years: craving without ambivalence
> I am soon on week 8 and still find it a bit hard to get a full night sleep but I feel more rested compared to when I was smoking. I crave it daily but I am so convinced of my choice that I know I am not even close to breaking my clean streak.

u/ExpressPossession311 — "52 days clean after 26 years of daily smoking" — <https://www.reddit.com/r/leaves/comments/1056ie3/52_days_clean_after_26_years_of_daily_smoking/> — 2023-01-06
Sleep still imperfect at week 8 — useful for timeline expectation-setting.

**T33** — 15 months, one drag
> Today new year and 15 months with one slip up, literally one drag while on vacation a while back that I regret doing. Still get my weird days, get some anxiety and low mood but motivated to see this through.

u/shadowcat20 — "15 months" — <https://www.reddit.com/r/leaves/comments/kobzfs/15_months/> — 2021-01-01

**T34** — the streak becomes the new attachment
> I now have a new addiction: the streak of days without weed.

u/ClemDooresHair — "Day 45" — <https://www.reddit.com/r/leaves/comments/rxs5ef/day_45/> — 2022-01-06

**T35** — 130 days, a named daily stack
> Daily rituals like using the reframe app, reading affirmations, mediation, exercise, and getting plenty of sleep (although I know how hard that is in the beginning)help

u/Improv38 — "130 days of freedom" — <https://www.reddit.com/r/leaves/comments/kpll6q/130_days_of_freedom/> — 2021-01-03 — score 47

### Stage: moderation (r/Petioles contrast)

**T36** — the clearest successful-moderation mechanic in the corpus: friction + a fixed day
> Today, I simply moved all my weed stuff to a box and put it in the back corner of my closet (a lot harder to access than right in my bedside drawer) and decided to only smoke only on Friday nights.

u/RelativeBreakfast9 — "choosing to finally change something" — <https://www.reddit.com/r/Petioles/comments/ku7kcc/choosing_to_finally_change_something/> — 2021-01-10 — score 144

**T37** — pre-existing rules as the reason moderation is even plausible
> I've always been good about setting rules for my use such as only smoking after 8PM, maintaining a consistent athletic and academic routine, etc.

u/robertobaz — "Debating how long to break for, could use advice" — <https://www.reddit.com/r/Petioles/comments/kui6q8/debating_how_long_to_break_for_could_use_advice/> — 2021-01-10

**T38** — moderation as the explicit goal of the break
> Hey everyone I'm on day 6 of a break to try and get off the dependency of weed and move to using in moderation for recreation.

u/TheRealSnifflepus — "Day 6 - what to do when you lose interest in everything?" — <https://www.reddit.com/r/Petioles/comments/ku7ij9/day_6_what_to_do_when_you_lose_interest_in/> — 2021-01-10

**T39** — the substitution "solution" (flagged: uncorroborated pharmacological claim)
> switched to vaping Delta 8 and CBD bud and get all the benefits of THC without any of the negatives. Kept THC for when I want to have fun, like a glass of very strong whiskey.

u/elpitu_ — "Perhaps I Craked the Code" — <https://www.reddit.com/r/Petioles/comments/kxaxmw/perhaps_i_craked_the_code/> — 2021-01-14
**Do not present this as advice.** Compare with T10/T11 — u/Bob_Eggshell's severe withdrawal was *specifically* from delta-8 carts. Included because the belief is common, not because it's sound.

---

## 2. Techniques, tools and prompts people credit

Recurrence is over my 2,986-post sample. "Common" ≈ dozens of posts; "occasional" ≈ several; "rare" ≈ one or two.

---

### TQ1. Total disposal in one pass — including the residue routes
**Recurrence: common** (40+ posts matched disposal language; the most frequently described concrete action in the corpus)

**What a person literally does:** flush the flower; put papers, grinder, bong, pipes, lighters, ashtrays into a bin bag and take it out of the house *that same hour*; vacuum carpets where kief/crumbs collect; delete the dealer's number from the phone. The distinguishing detail versus a generic "throw it away" is that experienced quitters name the **residue routes** — the grinder scrapings, the carpet, the un-opened spares in a closet — because those are what a day-3 self will go looking for.

> Walk over the to toilet, and FLUSH THE WEED DOWN THE TOILET.
> — u/BankingtoBass, <https://www.reddit.com/r/leaves/comments/1036n41/complete_guide_to_quitting_now_how_i_went_to_from/>

> Got a plastic bag, and start dumping EVERYTHING in it. Papers, grinders full of THC, lighters, bongs, pipes, EVERYTHING. Hoover weed filled carpets, chuck out ashtrays full of ends and take the bags out of the house.
> — u/BankingtoBass, same post

> After my previous post about a paradigm shift I've had, I mentioned I threw out all of my paraphernalia, flushed the remaining amount of flower I had(about a quarter ounce), and deleted my dealers number.
> — u/FajanglesMcgee, "Status update on my sobriety", <https://www.reddit.com/r/leaves/comments/rupaox/status_update_on_my_sobriety/>, 2022-01-03

**The same author on why previous attempts failed:**
> Did you hang out with a stoner friend? Did you scrape the shit out of a grinder you didn't chuck out? Smoke crap from the carpet?
> — u/BankingtoBass

**Backfire / counter-evidence:** one poster attributes a relapse partly to *skipping* this step —
> I didn't throw out my weed stuff like I did the first time, I didn't count days, I just existed sober and eventually when the pressure to use became too great, nothing stopped my sensation-seeking behavior.
> — u/GalacticShonen, "The power of attitude in moving past addiction", <https://www.reddit.com/r/leaves/comments/v3u45y/the_power_of_attitude_in_moving_past_addiction/>, 2022-06-03

Also note the cost objection people talk themselves through: `I DONT GIVE A FUCK HOW MUCH MONEY I HAVE SPENT ON THE WEED IN MY POSSESSION` (u/BankingtoBass) — the sunk cost of the stash is a named barrier to disposal.

---

### TQ2. Time your craving with a stopwatch, then build a menu that fits the measurement
**Recurrence: rare as described this precisely (1 strong account), but the underlying "urges pass" claim is common**

**What a person literally does:** when a craving hits, start a timer and do nothing but watch it. When the craving fades, stop the timer and read the number. That number — typically 2–15 minutes — is now *your* craving duration. Then assemble a written list of activities that fit inside that window and can be started at zero notice (pushups, breathing with eyes closed, singing loudly to music). When a craving hits later, you read the list and pick one, rather than improvising while compromised.

> When you feel an acute craving to use, sit down with a timer and just watch the time go by. After a while the craving will fade. Stop the timer. Now you know how much time you need to be able to get through to ride out a craving without using. Is it 2 minutes? 15 minutes? It's probably in that range.
> — u/UnhappySwing, "Advice for New Years leavers", <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/>, 2021-01-03

> Then look at your list when a craving hits and pick something to do. Over time, the cravings will come less and less frequently for shorter and shorter amounts of time.
> — same

Why this one is worth copying into a product: it converts an unbounded dread ("this feeling will not stop") into a **personal measured constant**, and it pre-commits the response so the urge doesn't get to choose.

---

### TQ3. "Become a non-smoker" — identity reframe instead of deprivation framing
**Recurrence: occasional**

**What a person literally does:** refuse the sentence "I am quitting weed" and substitute "I am a non-smoker", then apply a consistency test whenever a reward-thought appears — you do not reward a non-archer with a secret archery lesson.

> I am a non-archery person. I do not go on secret trips to archery classes.
> — u/BankingtoBass, <https://www.reddit.com/r/leaves/comments/1036n41/complete_guide_to_quitting_now_how_i_went_to_from/>

> Do not be someone who has quit weed. Become a NON-SMOKER.
> — same

Paired prompt for the "I've earned one" thought, which the same author lists as four questions:
> If you had a shopping addiction, would you reward yourself with a spending spree?

---

### TQ4. Play the tape forward — "what exactly are you planning to DO while high?"
**Recurrence: occasional**

**What a person literally does:** when the urge arrives, refuse to evaluate the *first* minute of being high and instead force a concrete itinerary for the whole evening — what will you actually do, and then what, and then what after that.

> Smoke a joint and do... what exactly? Roll a fat one and watch Fear and Loathing? How long is that going to last? I am going to roll up, then prepare munchies and then just sit and watch it high? And what after that?
> — u/BankingtoBass

> If you have quit for 10 days and are itching; ask yourself: What exactly are you planning on doing when you are stoned? What do you think you will be gaining or experiencing from it?
> — same

A weaker but independent version of the same reasoning appears at T21 (u/FragrantChipmunk5073).

---

### TQ5. Cool the bedroom and dry the air for night sweats
**Recurrence: occasional as a *remedy*; night sweats themselves are common**

**What a person literally does:** drop the bedroom temperature and run a dehumidifier so the sweats don't wake you.

> Some people get a lot of night sweats. If possible keep the bedroom really cool and run a dehumidifier to keep the air dry.
> — u/leaving_again, "How is day 1 going for the new class of 2022? Sharing a few tips from my way journey.", <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>, 2022-01-01

This is the only *mechanical* night-sweat intervention I found. Most posts only report the symptom.

---

### TQ6. Melatonin as an explicit temporary bridge, plus phone/TV out of the bedroom
**Recurrence: common** (melatonin is the single most-named substance aid in the corpus)

**What a person literally does:** take melatonin for the first ~1–2 weeks, keep phone and TV out of the bedroom, hold a fixed bed time, then deliberately test a night without it and treat that as a milestone.

> Melatonin is a godsend for knocking me out, and I find that I don't stay up playing video games til 1am anymore, I try to get in bed by 11:30pm which is a new development.
> — u/blondre3052, <https://www.reddit.com/r/leaves/comments/kqlb2d/day_4_updates_and_thoughts/>, 2021-01-04

> Last night was the first night that I didn't use melatonin either to sleep!
> — u/sunsweet17, <https://www.reddit.com/r/leaves/comments/kppi4l/10_days_done/>, 2021-01-03

**Backfire / limits — important:** the full sleep-hygiene stack routinely fails in the first week and people report that failure as its own crisis.
> I've tried melatonin, Tylenol PM, I don't drink caffeine, I read before bed, I leave my phone and TV out of the bedroom, I'm physically active, and I don't take naps during the day.
> — u/JoyfulSpite, day 4, <https://www.reddit.com/r/leaves/comments/kqcb9y/day_4_i_cant_sleep_any_suggestions/>

> I've tried everything from exercising daily, getting some Sun, breathing exercises, yoga, chamomile tea, eating three hours before bed and no electronics an hour before bed.
> — u/I_live_in_a_dumpster, "Is this weed withdrawal?", <https://www.reddit.com/r/leaves/comments/10a02me/is_this_weed_withdrawal/>, 2023-01-12

**Design implication:** telling a day-4 quitter to "practise sleep hygiene" is telling them something they have already done and watched fail. What they ask for instead is a **duration estimate** (T14).

---

### TQ7. Reframe the vivid dreams as a returning faculty, not a side effect
**Recurrence: occasional (and the dreams themselves are near-universal in the first fortnight)**

**What a person literally does:** relabel the dreams — cannabis suppresses REM, so their return is evidence the brain is recovering — and, where possible, treat them as interesting rather than as a symptom to be escaped.

> I gotta say I am enjoying those vivid dreams!
> — u/sunsweet17, <https://www.reddit.com/r/leaves/comments/kppi4l/10_days_done/>

> I haven't had dreams in years, even during sober streaks. But these have been fucking wild!
> — u/I-Fucked-YourMom, <https://www.reddit.com/r/leaves/comments/1ckds14/day_7_and_damn_these_dreams_are_freaking_weird/>

**Counter-evidence — do not oversell this.** For some people the dreams are genuinely distressing and persist for months:
> Expect intense, exhausting, and confusing dreams. Seriously disturbing stuff based on your deepest worries, fears, and secrets. I have experienced these many months into my quits
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

And relapse dreams are their own distinct event, reported as upsetting on waking (u/buddybabybud, "Oh goodness. Dreamt that I relapsed", <https://www.reddit.com/r/leaves/comments/kr8qmt/oh_goodness_dreamt_that_i_relapsed/>).

---

### TQ8. Deliberately lower the cognitive demand of your media for two weeks
**Recurrence: rare, but unusually specific and mechanistically argued**

**What a person literally does:** watch only familiar, light, already-seen content (sitcom reruns, bloopers, comedies); avoid complex or challenging film/TV; and specifically avoid open-ended scrolling and social media because the dopamine churn leaves you exhausted and reaching.

> Watch familiar and lighthearted tv shows or movies (for example sitcom reruns, bloopers, comedy movies, etc) If what I was watching was too challenging or complicated, it might peak anxious feelings and make me want to use weed to cope.
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

> Avoid too much random internet and social media. My brain will spin and I will feel exhausted from the dopamine rushes.
> — same

Companion rule from the same list — don't schedule hard things:
> If possible, I didn't attempt to do anything too complicated or frustrating. I was quick to get short tempered and want to run back to weed for comfort.

---

### TQ9. Stock a convalescent food kit before day 1
**Recurrence: occasional** (appetite loss and nausea are common)

**What a person literally does:** shop in advance for post-illness foods — yogurt, jello, buttered noodles, saltines, mashed potatoes, rice — plus antacids and headache medication, and treat hydration as a task rather than a background assumption.

> Have some easy foods ready like after a sickness or surgery. Yogurt, jello, buttered noodles, saltines, mashed potatoes, rice, etc. Have some antacids handy too.
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

> I highly recommend to everyone drink detox tea during the day and sleepy time tea when you want to sleep; and saltines for nausea.
> — u/grizzlyboob, "New year new us", <https://www.reddit.com/r/leaves/comments/rtb3rp/new_year_new_us/>, 2022-01-01

> it was a long process of sweaty sleepless nights, drinking smoothies and eating saltines, and trying to find joy in daily things that weed used to make more interesting for me.
> — u/madameleota24, "I quit in March and started again in November", <https://www.reddit.com/r/leaves/comments/ks3ee7/i_quit_in_march_and_started_again_in_november/>, 2021-01-07

The "framed as convalescence" element matters: it gives people permission to be ill rather than to be failing.

---

### TQ10. The long walk or bike ride with a podcast (as the low-barrier substitute for "exercise")
**Recurrence: common** (exercise language matched 114 posts; the *podcast-plus-walk* variant is the most repeatable form)

**What a person literally does:** put on a podcast or audiobook and walk or cycle for a long time — explicitly offered as what to do when "go to the gym" is too big an ask.

> I went on very on long walks or bike rides with a podcast. It eased anxiety and help wear the body down for better rest at night. It also counts as exercise if the idea of the gym or running seems like too much.
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

> take your earphones, go for a walk, that´s a start for me at least !
> — u/rulfry, "Day 2", <https://www.reddit.com/r/leaves/comments/ru9v96/day_2/>, 2022-01-02

Note the dual function claimed: anxiety relief *and* sleep pressure for that night. That links TQ10 back to the sleep problem in TQ6.

---

### TQ11. Defer every major life decision until the quit settles
**Recurrence: rare, but I found no contradicting account**

**What a person literally does:** impose a rule against breakups, resignations and large purchases for the first weeks, and sleep on anything that looks urgent.

> Try not to make any big dramatic decisions (breaking up, quitting jobs, buying cars, etc) until the dust settles on the quit. Sleep on any big decisions changes if possible until a few weeks or months after quitting.
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

Worth pairing with the observation that some withdrawal anxiety is not withdrawal at all — same author:
> sometimes they come from real problems I need to face with a sober reality. Those problems will not fix themselves by quitting weed, so this anxiety could be around for a while

---

### TQ12. Dump the circling to-do spiral into an external list
**Recurrence: rare**

**What a person literally does:** when the "everything I've neglected" flood starts, write all of it down in one list so it stops re-circulating in working memory.

> When I started thinking of a bunch of overwhelming stuff I need to do, just put it all in a list. This avoids worrying about all of it in a circular pattern.
> — u/leaving_again, <https://www.reddit.com/r/leaves/comments/rtrp2f/how_is_day_1_going_for_the_new_class_of_2022/>

Related but distinct, as an *action generator* rather than an anxiety dump:
> Make a list of shit you have neglected: cleaning the house, bank cards you're worried about, decluttering.. anything you feel you need to improve on your life.
> — u/BankingtoBass, <https://www.reddit.com/r/leaves/comments/1036n41/complete_guide_to_quitting_now_how_i_went_to_from/>

---

### TQ13. A written list of reasons, posted where you'll see it
**Recurrence: occasional**

**What a person literally does:** write out the reasons to abstain and physically post them up; re-read on the days when the decision starts looking negotiable.

Thread title, u/baldwhiteman: **"finally wrote my list of reasons to abstain"** — <https://www.reddit.com/r/leaves/comments/rvqytf/finally_wrote_my_list_of_reasons_to_abstain/>, 2022-01-04

The same post captures precisely the drift the list is meant to counter:
> Have sobered up enough that I started to think getting clean wasn't such a big deal any more, that I could use it again if I wanted.

---

### TQ14. Sauna and/or cold shower as a scheduled daily block
**Recurrence: occasional**

**What a person literally does:** a hard workout followed by a cold shower, in a fixed morning slot; sauna-then-cold-shower where available; an extra shower in the evening on bad days.

> My routine of getting up early having a hard work out and taking a cold shower afterwards is how I cope now. On hard days I have a shower in the evenings too.
> — u/dad_in_a_garage, "Day 52", <https://www.reddit.com/r/leaves/comments/1chi2cn/day_52/>, 2024-05-01

> If i hit the sauna and take a cold shower after, I feel like a new man.
> — u/ktdubss187, "If you're having a hard time with your quit, hit the sauna! Day 4 :)", <https://www.reddit.com/r/leaves/comments/10a3pmt/if_youre_having_a_hard_time_with_your_quit_hit/>, 2023-01-12

Plain hot showers are also repeatedly named as the only relief in week 1 (T9, and u/shirleycapable: `also a hot shower is a great replacement to smoking for me`).

**Counter-evidence:** see TQ18 — the cold-shower/yoga/tea stack is explicitly named as a source of guilt for people who can't sustain it.

---

### TQ15. Self-compassion as an operational move, not a sentiment
**Recurrence: occasional**

**What a person literally does:** catch the negative self-talk sentence, then substitute a specific perspective-taking move — for this poster, imagining how he'd want his own children to speak to themselves in the same situation, and then using those words.

> Shame is not your friend in the quitting process, so when you find yourself engaging in negative self-talk ("why can't I do this? I suck!" etc.) try out different ways to shift your mindset.
> — u/UnhappySwing, <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/>

> Then I try to talk to myself the way I hope they will talk to themselves, with love and compassion.
> — same

The same post opens by pre-empting technique-shopping guilt:
> Ignore advice that doesn't work for you--there's no one way to do this. That starts with my list!

---

### TQ16. Learn the pharmacology so the symptoms become legible and time-limited
**Recurrence: occasional**

**What a person literally does:** read up on why THC clears slowly and why emotional regulation takes months to reset, in order to convert "this is my new permanent personality" into "this is a known process with an end".

> It's easy to think that the acute physical symptoms like headaches and nausea, and the long term symptoms like anhedonia and difficulty regulating emotions, will last forever.
> — u/UnhappySwing, <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/>

> Through understanding I was able to have hope that all of the symptoms would subside. And they did! It just takes time, as in many months.
> — same (names Judith Grisel's book *Never Enough*, the cannabis chapter)

---

### TQ17. Access friction — put distance and admin between you and the next purchase
**Recurrence: occasional**

**What a person literally does:** block and delete dealer contacts; move remaining gear somewhere physically awkward; and — the most inventive instance in the corpus — stop carrying ID so that entering a dispensary becomes impossible.

> I've decided no more driving with ID since I can't enter the shops without it and I blocked and deleted my dealers.
> — u/DoubleDraco, "Making Progress", <https://www.reddit.com/r/leaves/comments/1ck30fb/making_progress/>, 2024-05-04

> Today, I simply moved all my weed stuff to a box and put it in the back corner of my closet (a lot harder to access than right in my bedside drawer)
> — u/RelativeBreakfast9, r/Petioles, <https://www.reddit.com/r/Petioles/comments/ku7kcc/choosing_to_finally_change_something/>

The social version of the same problem, when the dealer is a friend:
> one of my good friends even would say was "best friend" is a dealer so I can get my hands on pretty much anything, I'm going to cut him off I think because I'm tired of this pattern repeating all the time.
> — u/IncognitoBudz, "I'm tired...", <https://www.reddit.com/r/leaves/comments/1chjyw8/im_tired/>, 2024-05-01

Note the cost of the same move, honestly reported by u/DoubleDraco: `I can't go by there just yet because they smoke regularly and I don't wanna tempt myself, but I miss my nieces and nephews.`

---

### TQ18. Public accountability post / telling your story
**Recurrence: common**

**What a person literally does:** write the quit into a public post *before* the urge arrives, explicitly to create a social cost; or read threads until ready and then post one's own history.

> I found this thread and am making this post in hopes that it guilts me into quitting when I get the urge today.
> — u/flump41, <https://www.reddit.com/r/leaves/comments/106h4k5/accountability_post/>

> Find outlets to tell your story so that you can discover assumptions you had about using that you didn't know about.
> — u/UnhappySwing, <https://www.reddit.com/r/leaves/comments/kprifa/advice_for_new_years_leavers/>

> I know this was a lot but thanks for reading, posting for accountability. I love this community.
> — u/trynalovelife, <https://www.reddit.com/r/leaves/comments/rxnk85/day_1_again_my_last_day_1_i_will_win_this_time/>

**Backfire — the important one:** consuming recovery content is not the same as being protected by it. u/trynalovelife was doing exactly this while relapsing:
> I literally was reading posts for hours trying to logically prevent another relapse before my last one but it's like that primal emotional side of my brain completely hijacked me.

---

## 3. Things that BACKFIRED (actively hunted)

These matter more than the successes for product design. I searched specifically for failure language; here is what I could substantiate.

### B1. Moderation attempted from a position of feeling recovered — the dominant failure mode
The trigger is not craving. It is **feeling fine**, which gets read as evidence of non-addiction and therefore as a licence.

> Even after feeling somewhat "free" meaning I'm completely fine without it, I kept going back to it telling myself that now I can finally moderate use.

— u/Apprehensive-Cod-267 (T24), <https://www.reddit.com/r/leaves/comments/ruv8j2/how_do_you_deal_with_saying_goodbye/>

> by week 2 was feeling good enough to attempt moderating my use. That did not work out, so I'm back here again. — u/Trying1979, <https://www.reddit.com/r/leaves/comments/rvwdu2/day_2/>

> All it took was smoking 1/10th of what I used to and I'm right back to square one. — u/dentcarrot, <https://www.reddit.com/r/leaves/comments/kqtfe8/found_this_sub_14_years_ago_relapse_6_months_ago/>

> my original intent was to smoke once or twice and then keep a little stash for rainy days or every now and again. It became evident that wasn't going to be the case, just like in the past. — u/SenorBulldops, <https://www.reddit.com/r/leaves/comments/rxqh67/smoked_for_15_years_quit_for_8_years_relapsed_and/>

u/BankingtoBass names this as a scripted thought in advance, at both the 10-day and 2-month marks (sections 11 and 12 of his guide) — evidence that experienced quitters treat it as a **predictable scheduled event** rather than a personal failing.

### B2. Tolerance breaks as a revolving door
The corpus supports both readings, and the split is informative:
- **T-break as on-ramp to quitting** (T1, T2): the break produces unexpected evidence that life is better, and the person converts.
- **T-break as maintenance of the habit** (T3, T4): breaks are used to restore tolerance and preserve use, and get harder each cycle — `each one is more difficult for me than the last` (u/Hour_Pass8199).

The difference appears to be whether the break was undertaken **to feel better** or **to smoke more effectively afterwards**.

### B3. Substitution to alcohol and nicotine
Frequently reported, rarely anticipated.

> The lack of dopamine has lead to me drinking more heavily, and I suddenly started smoking cigarettes again despite having quit over a year ago. Meanwhile I don't think anything in my life has improved.
> — u/Total_Diamond, "Is this common?", <https://www.reddit.com/r/leaves/comments/rzqaak/is_this_common/>, 2022-01-09

> Just feels like I traded one drug for another. Cravings have been bad because of that frustration.
> — u/divebarhemingway, "Month Anniversary", <https://www.reddit.com/r/leaves/comments/ryujmi/month_anniversary/>, 2022-01-08

> I'm drinking more — u/MaNiFeX at one year (T31)

Note also the reverse direction in the histories: several people arrived at daily cannabis *from* quitting alcohol (T5, u/whitemaleinamerica). Substitution runs both ways and nobody seems to see it coming.

### B4. The streak becoming the object
> I now have a new addiction: the streak of days without weed. — u/ClemDooresHair (T34)

Counter-evidence in the same corpus: u/GalacticShonen attributes a relapse partly to *not* counting days. So day-counting is contested, not simply harmful — unlike in some other recovery communities. I did **not** find r/leaves posts describing a shame spiral triggered by a counter reset; that may be a genuine difference from other quit communities, or an artefact of my posts-only sample.

### B5. The optimisation stack as a source of guilt
The highest-scoring urge-stage post I found (101) is explicitly a corrective to techniques:

> Reminder: If you're not recovering "perfectly" by exercising diet cold showers yoga meditation and herbal teas then that's perfectly fine also
> — u/Technical_Care_2031, thread title, <https://www.reddit.com/r/leaves/comments/1chcb77/reminder_if_youre_not_recovering_perfectly_by/>

> I tend to feel guilty for not trying hard enough

**Design implication:** a product that presents a checklist of recovery behaviours will generate this failure. Whatever is shipped needs a legitimate "I did none of it and that's fine" state.

### B6. Sleep hygiene advice offered to people who have already exhausted it
See TQ6. At day 2–4, "have you tried melatonin and no screens" is not new information, and being given it again is reported as demoralising. The unmet need is a **timeline**, and the corpus supports a rough one: severe insomnia days 1–7, improving but imperfect by weeks 3–4, `still find it a bit hard to get a full night sleep` at week 8 (T32).

### B7. Delta-8 / CBD as a "solved it" substitution
u/elpitu_'s claim (T39) versus u/Bob_Eggshell's delta-8 withdrawal (T10, T11), which he describes as worse than quitting cigarettes: `I quite smoking cigarettes' years ago. Cold Turkey. This is 1000x worse.` Treat the substitution claim as folklore.

---

## 4. Cannabis-specific findings the brief asked about

**Sleep and dreams in the first fortnight.** Confirmed as the leading named relapse driver — T12 states it outright. The dreams are near-universal and bidirectionally experienced: welcome novelty for some (TQ7), months-long disturbance for others. Mechanically, only three interventions recur: melatonin as a bridge, a cold/dry bedroom for sweats, and daytime physical exhaustion via the walk/bike (TQ10). The most valuable thing to give someone at day 3 is not a technique but the week-8 expectation.

**Anhedonia and boredom, weeks 2–8.** Under-sampled here (see bias note 5) but present: `nothing feels fun or tastes good` at day 4 (T7), `absolutely no joy in anything` at week 1 (T9), irritability at day 21 and brain fog worsening after month 2 (u/chemicallyspeaking, <https://www.reddit.com/r/leaves/comments/1chmw4s/memory_worse_after_4_months_please_help/>), sex drive absent at week 3 (u/waitwhatnonevermind, <https://www.reddit.com/r/leaves/comments/s1fv6f/how_long_until_your_sex_drive_came_back/>). The boredom is not treated as a symptom to be waited out by the more experienced posters — u/BankingtoBass builds an explicit substitution table (BOREDOM → "go and do something interesting"; FEELING DOWN → exercise; FEELING ANXIOUS → walk, journal, talk, meditate), and u/Dustydoor19 (T6) supplies the honest objection that the substitutes are worse than the drug.

**Do tolerance breaks help or become a revolving door?** Both — see B2. The predictor is intent.

**How successful moderators differ from outright quitters.** With only 291 r/Petioles posts I can only offer a hypothesis, flagged as such:
- Moderators who report doing well describe **pre-existing structural rules that predate the problem** (`only smoking after 8PM, maintaining a consistent athletic and academic routine` — T37) and **physical friction plus a fixed permitted slot** (box in the back of the closet, Friday nights only — T36).
- Moderation attempted *as a recovery from dependence*, by someone who has just been abstinent, fails repeatedly (B1).
- The distinction is roughly: moderation works as a **maintained constraint on a habit that was never fully out of control**, and fails as a **destination reached from dependence**. This is consistent across my sample but the sample is small and self-selected. Do not ship this as a finding without more data.

---

## 5. Verification

Every quoted string in sections 1–4 was mechanically checked, after this file was written, as an **exact substring** of the archived post body it is attributed to. The check normalises only whitespace and Unicode quote/dash characters; it does not tolerate paraphrase.

Verifier script and the harvested corpus: `<scratchpad>/leafwork/` (`verify.py`, `posts_*.jsonl`).

To spot-check any item yourself without hitting the Reddit block, resolve its post ID through an archive:

```
https://api.pullpush.io/reddit/search/submission/?ids=<post_id>
```

e.g. T30 → `https://api.pullpush.io/reddit/search/submission/?ids=1036n41`
(the post ID is the alphanumeric segment in each reddit.com URL after `/comments/`).

### UNVERIFIED — could not access
- **Live Reddit rendering of every URL in this file.** Reddit returned 403 to every method available. URLs are reconstructed from archive `permalink` fields.
- **Comment threads.** No comments were harvested (see bias note 2). Any technique that lives mainly in replies is absent from this document.
- **Vote scores.** Scores shown come from the archive snapshot at capture time and are systematically *lower* than final scores. Do not treat them as popularity measures. The exception is the small number of records retrieved via pullpush re-fetch, which are closer to final.
- **Whether the quoted accounts are truthful.** These are anonymous self-reports. Nothing here is clinically validated, and the timelines are what people believed about themselves, not measurements.

### Privacy
All attributions are pseudonymous Reddit handles, as posted publicly. No real names appear. No demographic detail has been added beyond what is inside a quote.
Flagged as potentially self-identifying, and therefore **not quoted** in this document despite being relevant:
- u/kolter00's post directs readers to a personal video via their Reddit profile (deanonymisation route).
- One poster's post opens with occupation, gender and age together.
- One poster describes a period of homelessness alongside other locating detail.
- u/quietladybug's post is about a partner's withdrawal, i.e. a **third party who did not post** — excluded on consent grounds.
If any of these accounts is later needed, re-check the flag before reproducing the text.
