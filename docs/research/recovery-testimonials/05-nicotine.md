# 05 — Nicotine: first-person accounts of quitting

Source pass: r/stopsmoking, r/QuitVaping, plus government/charity published quit stories (NHS Better Health, Quit Victoria/Quitline AU, American Lung Association, CDC Tips From Former Smokers).

Collected 2026-08-17.

---

## Access, confidence and bias notes

**What was reachable.**

| Source | Route that worked | Status |
|---|---|---|
| r/stopsmoking, r/QuitVaping | `old.reddit.com/r/<sub>/search?q=…&restrict_sr=1&sort=top&t=all`, then `old.reddit.com/r/<sub>/comments/<id>/?sort=top&limit=200`, plain Chrome UA, ~12 s spacing | 107 threads archived locally |
| r/stopsmoking (secondary) | arctic-shift `posts/search?subreddit=…&title=…` | 1 query landed (100 posts, Allen Carr) |
| NHS Better Health | direct `curl` | OK |
| Quit Victoria (quit.org.au) | direct `curl`, text inside `<article data-article-content>` | 11 pages, 6 with substantive first-person text |
| American Lung Association | direct `curl`, text inside `<div class="fr-view">` and `<p>` | 8 pages |
| CDC Tips From Former Smokers | **blocked** — 403 to WebFetch and to `curl`; Wayback returned 498 rate-limit on every retry over 25 minutes | only 2 ad transcripts recovered, via `tools.cdc.gov` PDFs |

**What was NOT reachable** — listed under "UNVERIFIED" at the foot. The CDC `Real Stories` pages (Terrie H., John B., Geri M., Brian H., Denise H., Ethan B., Elizabeth B., Stephen B., Tammy W., Angie P., Noel S., Felicita R.) and the CDC `Quitting Stories` pages (Betty, Daniel) could not be opened. I have their titles only, from an archived copy of the index page. **No quote from any of them appears in this document.**

**Verification standard.** Every quoted string below was extracted from a raw file downloaded to disk (HTML, JSON or PDF) — not from a fetch-tool summary. Two scripts re-check the file:

- `verify.py` — each quote must be a normalised exact substring of an archived source. Result: **105/105 quotes verified; 0 misses.**
- `pairs.py` — each Reddit quote must appear inside a body whose own `data-author` attribute is the handle I credited. Result: **54/54 handle-quote pairs correct** after fixing two errors described below.

This mattered. The fetch/summarise layer demonstrably altered text: asked for Anne's story it returned `"I didn't want to go on like this."` The raw HTML reads `The thought suddenly struck me that I didn't want to go on like this.` The summary is a truncation presented as a quote. Everything here is from raw.

It mattered even more for attribution, and this document nearly shipped two wrong ones. My first Reddit comment parser paired comment bodies with the wrong `data-author` — it reported the OP of "I accidentally quit smoking" as u/McnastyCDN when the post's own `data-author` attribute says u/boxmaster21. I rewrote it to key off each comment div's own `data-author` and `data-permalink`, but two quotes had already been drafted from the broken output:

- *"I was apprehensive to stop because I thought I’d be missing out"* — drafted as u/Xoph3881, **actually u/coldbeers**.
- *"It was quit smoking or move into my car"* — drafted as u/rogerwil, **actually u/catsbluepajamas**.

Both were caught only by the `pairs.py` pass, not by substring verification — the quotes were genuine, the handles were not. Substring-verifying a quote does not verify who said it; these are two separate checks and both are needed. Corrected above, and the comment-level permalinks now cited resolve to the specific comment.

**Caveat on URLs.** The pages I actually retrieved are the `old.reddit.com` renderings, cited as such. I did not separately confirm each canonical `www.reddit.com` URL renders.

**Biases you should hold while reading this.**

- **Survivor bias, extreme.** r/stopsmoking milestone posts are written by people it worked for. The people on attempt 30 who never came back are structurally invisible. Two threads in the corpus are explicitly *about* this distortion — u/jpfx1's "Being honest, this sub is horrible" and u/scuttle_jiggly's "This sub can be really discouraging for people trying to quit."
- **Charity and government stories are selected and edited to promote a named programme.** The ALA stories all credit Freedom From Smoking; the NHS page testimonials credit the NHS app and local Stop Smoking Services. Treat those as marketing-shaped even where the person is real.
- **CDC Tips material is scripted and produced.** Participants are real, consented, publicly named — but the words are ad copy delivered to camera, not spontaneous first-person speech. Tagged `government/campaign` and **not** weighted alongside forum posts.
- **Recency skew.** Reddit search ranked by all-time top; most surviving high-score posts are 2019–2026.
- **One post has a commercial motive** — u/No-Club591's "10+ failed attempts" post resolves into a pitch for an app the author built. Flagged inline.

---

## Where self-report and trial evidence diverge

This is the sharpest finding in the nicotine source, and it is unusually clean because smoking cessation is the most heavily trialled behaviour change in existence.

**1. NRT is the biggest disagreement.** Trials support nicotine replacement as roughly doubling quit odds. Quitters in this corpus frequently rate it *worthless or counterproductive*, and the stated reason is consistent and non-random: they experience their problem as *being addicted to nicotine*, so a treatment that supplies nicotine reads to them as not-quitting. u/MenuSpiritual2990 scores NRT **0/10** and writes the reasoning out explicitly — *"I needed to break my nicotine addiction, not feed it."* That is a coherent model of the problem that happens to contradict the trial result. It is not ignorance of the evidence; it is a different definition of the target.

**2. Cold turkey is the opposite disagreement.** It is the most-credited method in the corpus by volume — the subreddit's top posts are saturated with "cold turkey baby, I did it" — while trials place unassisted quitting at the *bottom* of the effectiveness ranking. The mechanism is visible: cold turkey is what most people try, so it is also what most successes happened to be doing, and the failures are silent. Notably the same u/MenuSpiritual2990 who scores NRT 0/10 scores **cold turkey 2/10** and varenicline 9.5/10 — a person who has tried both directions does not reproduce the community consensus.

**3. Varenicline is the one place self-report and trials agree**, and it agrees loudly. Where people have taken it they describe a specific mechanism, not a vague benefit: it decouples smoking from reward, so relapse stops being catastrophic. u/JayCroghan: *"this time it just felt like I was making a choice to have that smoke and not that I was shaken to my core if I didn't smoke it."* This account also explains a trial artefact — people on varenicline who smoke during titration are not "failing", and the drug's design tolerates it.

**4. Allen Carr's Easyway is the largest volume-vs-evidence gap.** Trial evidence is mixed and thin; credit in this corpus is enormous. But the accounts are mechanically specific enough to be interesting rather than merely enthusiastic — see the technique entry below.

**5. Cutting down.** CDC campaign copy and much trial guidance say reduction without cessation does not deliver health benefit; the corpus contains both people for whom tapering was *the thing that finally worked* after cold turkey failed (Maria, Quit Victoria) and the CDC's own scripted counter-message (Kristy). Genuinely contested in the self-report.

**6. Cross-substance check (asked by the coordinator).** The cannabis finding — that relapse is triggered by *feeling fine* and the failure mode is "now I can finally moderate" — **reproduces in nicotine, strongly, and is one of the most repeated structures in the corpus.** It is not a cannabis-specific pattern. Evidence in technique #4 below.

---

## (A) Testimonials

`source_type`: peer | government/charity | government/campaign | peer-commercial

### Peer — r/stopsmoking

**T1 — u/Secret4gentMan**, 2021-03-12, `peer`, stage: 4 months quit after ~20 years and countless attempts.
Source: https://old.reddit.com/r/stopsmoking/comments/m3hm3l/what_ive_learned_over_20_years_and_countless/

> Every attempt before this one I was white-knuckling it. Counting down the hours until it was time to sleep and another day without a cigarette would be done. Every hour without a cigarette was excruciating. I would try to deceive myself by telling myself I didn't want to smoke, when really it was all I wanted to do... but you can't be on fire and convince yourself that you're not feeling hot.

> I thought I'd have all these mental triggers that I built up over the years. Drinking coffee, right before going in to a movie theater, after eating a meal, while having a drink etc. All of that just evaporates when you cut the bullshit and REALLY know that you don't want to have another smoke.

**T2 — u/Historical-Money5040**, 2025-04-30, `peer`, stage: ~4.5 years quit; describes a relapse at 6 months in a prior attempt.
Source: https://old.reddit.com/r/stopsmoking/comments/1kbq6uq/the_myth_of_just_one_cigarette/

> I honestly felt great, and I was proud of myself. But then, one night, I wanted to prove to myself and others that I could smoke just one cigarette without getting hooked again. That was a HUGE mistake.

> After finishing that one cigarette, I thought, "What’s the harm? If I can have one, I can have another, and it won’t do anything." One after another, and by morning, I had smoked a whole pack.

> Because of that I started thinking that I would never be able to quit smoking. Now, I smoked even more than before and I completely lost my confidence and desire to try quitting again. That went on for about two years until I finally quit for good.

**T3 — u/reginafalangie7**, 2020-02-07, `peer`, stage: re-quit ~1 month, after a 9-year quit ended.
Source: https://old.reddit.com/r/stopsmoking/comments/f0i8em/warning_i_quit_cold_turkey_for_9_years_hadnt/

> And then I went to Europe for the first time, and thought I could have just one or two. I hadn’t taken a single drag in 9 years! We went out in France on our last night there, and I decided to smoke one. People had told me it would taste gross, etc. NOPE!! I LOVED IT from the first drag.

> That was in October of 2017. It took me about a year but I was a full time smoker again by October of 2018.

**T4 — u/MenuSpiritual2990**, 2026-06-21, `peer`, stage: 4 years quit (second quit); 25/day for 25 years.
Source: https://old.reddit.com/r/stopsmoking/comments/1ubhxdj/my_scores_of_different_quit_methods_ive_tried/

> Nicotine replacement (e.g. patches, inhalers) - 0/10

> I needed to break my nicotine addiction, not feed it. This just prolonged the torture and was expensive.

> Chantix/champix (varenicline) - 9.5/10

> Easy Way book by Alan Carr - 9/10

> I’ve read a bunch of criticism that this is boring, repetitive etc. That is true. But it also somehow fundamentally changed how I viewed smoking. Read it with an open mind.

> Cold turkey - 2/10

**T5 — u/JayCroghan**, 2020-12-12, `peer`, stage: 22 days quit on varenicline after 20+ years at 20/day.
Source: https://old.reddit.com/r/stopsmoking/comments/kbqick/3_weeks_champixchantix_varenicline_a_wild_ride/

> as the day drew closer I became less sure of myself and I lasted a couple of hours before having a cigarette but one thing I noticed that was different from any other time was that this time it just felt like I was making a choice to have that smoke and not that I was shaken to my core if I didn't smoke it.

> You know when you don't smoke for a day and then you have that first one and you get that rush? Yeah, that doesn't happen! You're just smoking a dirty cigarette and nothing more.

> I caught myself one time telling myself I actually liked smoking, another that it wasn't actually that bad (!!!!!!!!), and another that I must have smoked for all those years for a reason I just must not remember it.

> So, the box of the last cigarette I smoked still has 19 in it, and it sits beside my car keys beside the front door where it would usually have sat. And every time I see it, it reminds me of how easy it is to choose not to smoke.

**T6 — u/CarefreeBrowsing**, 2026-04-21, `peer`, stage: 4 days quit on varenicline; smoker since 15, previously held a 2-year cold-turkey quit.
Source: https://old.reddit.com/r/stopsmoking/comments/1srus3v/chantix_varenicline_helped_me_quit_smoking/

> I set a quit date for April 7th but did not follow through. I was disappointed, but definitely noticed I was smoking less.

> I hardly crave it anymore and only get triggered by certain things like driving or after a meal.

> The pill took the enjoyment out of cigarettes and made the cravings much more tolerable/manageable. I stopped enjoying them completely by the first week and smoked mainly out of habit.

**T7 — u/TrueCryptographer982**, 2025-01-17, `peer`, stage: 10 years quit; was ~30/day.
Source: https://old.reddit.com/r/stopsmoking/comments/1i3okhi/had_my_last_cigarette_10_years_ago_last_month/

> First of all I stopped drinking because I knew I could not drink and not smoke and I stayed off alcohol for 6 months (maybe more?).

> Then I went to a half every 2nd hour and did that for week and by then I felt like I was getting control over them because I was sticking to the schedule, went to every 3rd hour and quit after that, having had a lot of small wins leading up to it.

> I had a specific store I bought them from usually which was a real trigger for me and every time I drove past I would start growling and then barking my head off like a dog. I know I know it looked bizarre I am sure BUT it got me out of my head and into my head and I forgot the trigger.

**T8 — u/wrv505**, 2025-01, `peer`, stage: approaching 11 years quit. Comment on T7's thread — note it is the *methodological opposite* of the OP it replies to.
Source: https://www.reddit.com/r/stopsmoking/comments/1i3okhi/had_my_last_cigarette_10_years_ago_last_month/m7q16xt/

> I'm coming up to 11 years and your method is the polar opposite to mine. After numerous failed attempts with cutting down, patches, inhalators, gum and vapes when they were brand new, I went all in on the cold turkey.

> I embraced the thoughts and cravings, never tried to ignore them. I read as much as I could about how the addiction works, realised I was in a war with it and made it front and centre of my mind, gave it all my focus, pretty much constantly.

**T9 — u/303trance**, 2019-07-09, `peer`, stage: 7 months quit after 25+ years and "hundreds" of failed attempts.
Source: https://old.reddit.com/r/stopsmoking/comments/cayhx7/smoked_for_25_years_failed_quitting_hundreds_of/

> My 7th month, most stressful time of my life: extra nasty divorce, loss of work, loss of home, loss of friend - yet I don't smoke cigs anymore and have no plans to. I have the weakest will of all - yet here I am, an ex smoker.

> Someone here said something along the lines that we choose to avoid things we don't want. For some of us it's some food or activity - you will never try it no matter what

> Add cigarettes to your "do not want" mental list

**T10 — u/boxmaster21**, 2020-11-21, `peer`, stage: 5 days, unplanned quit. A clean instance of the West & Sohal unplanned-quit finding.
Source: https://old.reddit.com/r/stopsmoking/comments/jyf4sm/i_accidentally_quit_smoking/

> More like, I'm so broke right now I have to choose between buying cigarettes and cat food, so I haven't smoked a cigarette in five days. I get paid in a couple days and I don't think I'll buy cigarettes then either

> I've been a lurker here for a while and this isn't how I imagined my "I finally quit" post but I'm really happy to be joining the rest of you guys on my no smoking journey.

**T11 — u/lyrisme**, 2021-11-06, `peer`, stage: hours in, unplanned.
Source: https://old.reddit.com/r/stopsmoking/comments/qo8ajs/spontaneously_decided_to_quit_please_keep_me/

> A few hours ago, I realised I was out of cigarettes and would need to go out to get some more. I felt lazy and kept waiting and waiting until the shop closed; I thought "that's the perfect occasion for me to finally quit".

**T12 — u/drygrain**, 2014-08-09, `peer`, stage: day 1, unplanned, first ever attempt.
Source: https://old.reddit.com/r/stopsmoking/comments/2d1d1q/just_spontaneously_quit/

> I saw an antismoking ad this morning about living long enough to see your children grow up. Usually advertising doesn't get to me but that one really hit home. Ive never tried to quit before, mostly because I don't like trying and failing.

**T13 — u/mapras21**, 2019-09-07, `peer`, stage: 1 month; 2 packs/day for 9 years, multiple prior failures. Title is the testimonial.
Source: https://old.reddit.com/r/stopsmoking/comments/d0wqlh/9_years_of_smoking_2_packs_a_day_failed_quitting/

> 9 years of smoking, 2 packs a day, failed quitting multiple times, and then suddenly one morning u wake up and decide, enough is enough and quit the cold turkey way...YES...I dit IT.....SMOKE FREE FOR A MONTH

**T14 — u/TheDayIsOn**, 2016-10, `peer`, stage: ~1 year quit, 4th serious attempt, 28-year smoker.
Source: https://www.reddit.com/r/stopsmoking/comments/55jfs0/well_after_10_years_and_multiple_failed_attempts/d8bcjt7/

> This is my 4th what I consider real quit attempt.  It took those three past failures for me to finally get it. Each of those times I fell for the "just one" mind trick.  This time I absolutely knew  I couldn't have one.  Use your past failure to learn from and just DON'T smoke no matter what.

**T15 — u/cutebeats**, 2020-01, `peer`, stage: post-hospitalisation re-quit. The clearest statement of the "feeling fine" relapse mechanism in the corpus.
Source: https://www.reddit.com/r/stopsmoking/comments/eoemnn/i_spent_the_first_week_of_2020_in_a_coma_because/feez21a/

> I remember the last time I quit and told my friend I was feeling so much better already physically, she said, "Remember how good you feel right now, because after enough time passes, you'll forget and think you can just have one here and there." And that's exactly what I did.

**T16 — u/ShockWave324**, 2024-09, `peer`, stage: quit for good June 2023 after a multi-year cigarette→vape→quit sequence.
Source: https://www.reddit.com/r/stopsmoking/comments/1fi1fon/im_definitely_not_smoking_after_chatting_with/lnexa7a/

> And then I vaped on and off until I quit for good on June 8th, 2023. This is why you don't have "just one puff" whether it's a cigarette or vape. It ALWAYS leads to more. There'd be periods where I wouldn't vape for 3 months until I had a slip up.

> If I even have a split second craving of smoking or vaping, I have to remind myself that I don't do it because I can't have just one.

**T17 — u/chunkybeard**, 2025-06, `peer`, stage: quit; explicitly credits a taper *through* vaping and NRT, and reports Allen Carr failing.
Source: https://www.reddit.com/r/stopsmoking/comments/1l7ki8v/this_sub_can_be_really_discouraging_for_people/mwy6kit/

> Yeah Allen Carrs' book isn't all that. I read it and kept smoking for years. It just wasn't enough. I used a patch for a long time but would still smoke 2-4 every morning before putting it on. I switched to vape and honestly that helped because I could do a controlled decline of nicotine concentration

> But when I went cold turkey it was easy becaise my nicotine intake was low by then. Tried going cold turkey in the midst of a pack a day habit and it wasn't gonna happen, NRT for sure helped.

**T18 — u/Accomplished-Way6964**, 2023-11, `peer`, stage: day 61; had a 1-year Allen Carr quit, relapsed off one cigarette, then smoked 10 more years.
Source: https://www.reddit.com/r/stopsmoking/comments/17wmh89/being_honest_this_sub_is_horrible/k9xsrpj/

> Quit for a year with Allan Carr , then had one and smoked 10 years. A pack a day for 45 years. Signed up for “Finito” hypnosis and the sessions spoke to subconscious mind. This time I have that and nrt lozenges and it is painless. The only thing is the weird wave of sadness for the first month.

**T19 — u/ZoloftPlsBoss**, 2025-08-31, `peer`, stage: day 5; had a 6-year Allen Carr quit, relapsed, and the book then failed repeatedly. Archived via arctic-shift JSON.
Source: https://www.reddit.com/r/stopsmoking/comments/1n4q2b3/

> This is NOT a hate post for Allen Carr. I had previously quit for 6 years thanks to him. However, due to all the stress my job has caused me, I started smoking again and had struggled to quit, even during my holiday. I read his book twice but had multiple "last cigarettes" and I kept slipping.

> Now, my issue with the book this time was that it somehow made me smoke more while trying to quit. I had reduced to 3 cigarettes but the book is staunchly against reducing and it says you shouldn't stop smoking until you finish it. So I went back to half a pack a day and occasionally even a full pack...

> Allen Carr said NOT to use any substitutes like candy but I found that they helped me a lot with battling the cravings.

**T20 — u/recyclops18505**, 2026-06-01, `peer`, stage: day 3, after "countless" attempts that never passed 10 hours. Archived via arctic-shift JSON.
Source: https://www.reddit.com/r/stopsmoking/comments/1ttu6yo/

> I actually hated so much of the book. I hated how generalized so many things were. ALL smokers are the same. ALL people who try to willpower way still want cigarettes.

> However, this is the first time I have ever quit with no physical symptoms. Not a single one. No headaches, shakes, stomach aches, anything.

> I have been having insanely intense cravings, worse than I have ever had because I have never lasted more than 10 hours any of the countless times I have tried to quit.

**T21 — u/blowfisher4959**, 2025-11-06, `peer`, stage: day 1 after countless failed attempts; 15/day for 15 years. Archived via arctic-shift JSON.
Source: https://www.reddit.com/r/stopsmoking/comments/1opxrlz/

> After countless failed attempts I picked up Allen Carr and along the reading of the book, I could already feel that something was changing in me, mainly the point of view on smoking I had before.

**T22 — u/coldbeers**, 2025-05-19, `peer`, stage: 22 years quit; smoked 18→38 at 1.5–2 packs/day.
Source: https://www.reddit.com/r/stopsmoking/comments/1kqacbb/just_bought_allen_carrs_book_what_are_your/mt42ytj/

> All I’d say is it took me a while to actually pick it up and read it, I think I was apprehensive to stop because I thought I’d be missing out, I was utterly wrong, there are zero downsides to stopping.

**T23 — u/catsbluepajamas**, 2025-05-19, `peer`, stage: 4+ years quit; 2+ packs/day for 25+ years. Note the stated trigger for quitting was money, not health or readiness.
Source: https://www.reddit.com/r/stopsmoking/comments/1kqacbb/just_bought_allen_carrs_book_what_are_your/mt4gwdr/

> I did buy a water bottle with a nozzle tip I liked that kind of resembled a vape nozzle and drank a ton of water the first month or so lol.

> I didn’t want to quit smoking when I did- I had no choice because I could not afford it anymore. It was quit smoking or move into my car. It was the best thing I have done for myself ever.

**T24 — u/No-Club591**, 2024-09-04, `peer-commercial` — **flagged**: the post is a first-person account that resolves into a pitch for an app the author built. Treat the account as real and the framing as promotional.
Source: https://old.reddit.com/r/stopsmoking/comments/1f8mrku/i_quit_smoking_after_10_failed_attempts_heres_how/

> I tried pretty much every method to quit, from patches to cold turkey, but I’d always end up back where I started.

> One day, I had an idea. What if I gradually cut down instead of going cold turkey? I’d tried that before too, but this time, I got ChatGPT involved to help me out. I asked it to create a custom weaning schedule—basically reducing the number of cigarettes I smoked each day while increasing the time between them.

### Peer — r/QuitVaping

**T25 — u/Catasmet**, 2024-08-28, `peer`, stage: ex-vaper writing tips.
Source: https://old.reddit.com/r/QuitVaping/comments/1f3o0g2/tips_from_an_exvaper/

> Drop it all at once, and drop it in a public bin, not the one in your house where you can go back and pull them out when it calls you once again to kneel.

> Third, sugar is your best friend, get a ton of lollipops, and put those in your mouth instead

**T26 — u/AshleyThibodeaux**, 2022-11, `peer`, stage: still trying; a candid partial account.
Source: https://www.reddit.com/r/QuitVaping/comments/yudn0x/what_actually_happened_when_i_quit_vaping/iy12aso/

> I bought some coffee straws to get the feeling out smoking & it helps tremendously. Just remember it’s an obsessive thought. If you let it; it will only last about 3 minutes max. I just cannot bring myself to throw my vape away. Idk why.

**T27 — u/Rin-l**, `peer`, stage: quit vaping, deleting tracking apps. Note the explicit rejection of substitution.
Source: https://old.reddit.com/r/stopsmoking/comments/1keo3hr/

> So without thinking twice I threw away my vape, this time I did not say I'll throw it away once the juice ran out, I did not think about the vape or worried about my next craving, I was gonna ignore it like an ex who keeps texting and calling, annoying, but eventually they'll stop texting.

### Government / charity — published quit stories

**T28 — Anne**, Quit Victoria (Quitline, AU), `government/charity`. Quit cold turkey 53 years ago at 30; three packs/day; aged 83 at publication. Licence: not stated on page; standard charity publication.
Source: https://www.quit.org.au/en/stories/annes-story

> I quit cold turkey 53 years ago at the age of 30. I am ashamed to say that I was a three pack per day chain-smoker. Cigarettes were the first thing I reached for in the morning and the last thing I put down at night.

> The thought suddenly struck me that I didn't want to go on like this. So, I simply announced to my husband - a non-smoker - that I was quitting.

> Having quit, I found it was very hard to get through certain times of day. I missed especially the ritual of lighting up after a meal, or in social situations, or the cigarette to help me relax once my two toddlers were in bed. I also missed the feeling of something in my mouth.

> To deal with the cravings, I found the best solutions (depending on the situation) were to clean my teeth, eat XXXX peppermints, drink iced water with lots of ice cubes in it, or to gently bite the inside of my cheeks. I think all of these activities were just substituting one form of oral stimulation for another.

> After about four cigarette-free days, feeling cranky and irritable, I had a huge argument with my husband, then went out and bought a packet of cigarettes and lit up defiantly ("see what you made me do"). It tasted vile and I felt sick and dizzy. That was it.

> It took me a while to see myself as a 'non-smoker', though. For many years afterward, I had a recurring dream in which I was smoking.

**T29 — Peter ("Dad Peter")**, Quit Victoria, `government/charity`. Pack/day for 24 years; quit on prescribed cessation tablets (varenicline-class) at first attempt after "dozens" of failures.
Source: https://www.quit.org.au/en/stories/dad-peters-story

> I have tried to quit dozens of times with varying degrees of success all eventuating in failure, obviously. I managed to quit on my first try on the prescribed stop smoking tablets.

> It doesn't stop the urges completely but it massively reduced my urges. The only time I thought about smoking were triggers like driving home from work and after eating, but they are much easier to stave off with distractions than the real addiction urges - which the tablets killed dead for me.

> I am not captain willpower. Whoever you are I'll bet you have plenty more willpower than me - and I did it easily.

> The rest of my life is garbage, but in this one area I have succeeded and it makes me feel really good!

**T30 — Maria**, Quit Victoria, `government/charity`. Cold turkey failed; graduated tapering worked. One year smoke-free.
Source: https://www.quit.org.au/en/stories/marias-story

> I tried quitting several times, but it never worked. I always went back to it.

> It got to this point where I was really determined to quit, but I knew I needed a different approach. I had tried quitting cold turkey, but that didn’t work for me.

> I took it slow, one step at a time. Instead of 10 cigarettes a day, I cut it down to five, then three, until I finally stopped. It took time, but that’s what worked for me.

> I found support through online communities. I joined Facebook groups where people were also quitting.

> When I felt tempted by family or friends smoking around me, I took a simple approach. I would take a step back and keep my distance until they finished.

**T31 — Mohammed**, Quit Victoria, `government/charity`. Unplanned quit; and a one-puff test at 6 months that did *not* cause relapse — a counter-case worth keeping.
Source: https://www.quit.org.au/en/stories/mohammeds-story

> One morning – eight years ago now – I woke up and thought, “I have a two-week-old baby girl, I want to be with her for the rest of my life”. I guess having kids made me realise one day it’s gonna hit me. I stopped smoking, literally just like that.

> I remember after six months of being quit, I was at a Christmas party. Someone asked if I wanted to come down for a ciggie. I thought “yeah, why not, I could have one, once in a blue moon”. I had one puff, started coughing and thought “no way, it’s not happening”. I haven’t touched one since.

**T32 — Tony**, Quit Victoria, `government/charity`. Quit after heart attack; keeps the unopened pack as a token.
Source: https://www.quit.org.au/en/stories/tonys-story

> The morning of my heart attack, after my first cigarette of the day, I was coughing and coughing. I bought another packet of cigarettes that same morning and they were $60 for a packet of 40. I shook my head and thought to myself: this has got to stop,

> It’s a reminder of everything I’ve been through.

**T33 — Dorothy K., Lansing, Illinois**, American Lung Association `#MyQuitStory` series, Jan 2018, `government/charity`. 42-year smoker. Four posts across the series.
Sources: https://www.lung.org/blog/my-quit-story-1 (2018-01-02), https://www.lung.org/blog/my-quit-story-2 (2018-01-04), https://www.lung.org/blog/my-quit-story-3 (2018-01-05), https://www.lung.org/blog/my-quit-story-6 (2018-01-07)

> I could go three weeks without a cigarette, and then my husband would walk by smelling like a cigarette and I'd light up again. Or something stressful happened and I’d need the cigarette to calm my nerves.

> My husband is also a smoker, and we often found ourselves on opposite schedules. I'd be trying to quit while he was still smoking, or I was smoking and he was trying to quit. It was easy to slip up with one of us still smoking, and neither of us could stay smokefree for very long.

> under the new policy, we were told that our premiums would go up $100 a month if we continued smoking. So now, we have to take quitting more seriously.

> To eliminate temptations, I removed all the things that reminded me of smoking. I went through our house and removed every ashtray, lighter and cigarette.

> The weekend before my official Quit Day, I was so motivated to just be done with cigarettes. I had already stopped smoking, thinking that I wouldn't have another, but then I got stressed and reached for my daughter's pack. I took two puffs and realized how silly it was.

> There have still been times when I thought about giving into the urge to smoke but I was stopped by my amazing support system. I often texted my brother who talked sense into me. "No, you really don't want that cigarette," he said. He knew that I would hate having that cigarette, but the craving was so loud that I couldn't think straight.

> I made a goal that if I got to a certain day without smoking a cigarette, I would get a tattoo. I did just that.

**T34 — anonymous ALA blogger** (`#TheDayIQuit` series), 2016-12-20, `government/charity`. Quit 2007 via ALA group clinic with her mother.
Source: https://www.lung.org/blog/quitting-was-hardest

> During periods of my life, I would quit smoking—when I was pregnant and had a newborn, for instance—but during tense or stressful moments, I would pick it back up.

> The eight-week course made us look at all of the times we smoked and encouraged us to change up some of those routines. For instance, I used to love to drive and smoke—the window rolled down and a few moments of escape. When I quit, I actually stopped driving for a few days because the car was just too much of a smoking trigger for me.

> My mom and I did other things, like sitting in different spots at the kitchen table or while watching TV than where we typically sat and smoked. Just little things to shake up that routine of smoking.

> We would chew on straws and call each other out when we were grumpy over those first days when the cravings were really bad.

**T35 — anonymous ALA blogger**, 2017-02-05, `government/charity`. Pack/day for 44 years; quit via ALA programme + nicotine patch; had slips.
Source: https://www.lung.org/blog/i-hope-one-person-quits-smoking-because-of-this-bl

> When I was sad, happy, stressed out, after dinner, when I woke up, when I drove my car – there are so many reasons I had to smoke. Nothing happened in my life without a cigarette.

> I tried to quit without success. New Year's Resolutions were short-lived. I was into sports when I was younger, so I would try to get back into shape and quit at the same time. Nothing I tried seemed to work. I could not break the addiction of smoking.

> Through the eight-week program, I did all the things they told me to do: the readings, setting a quit date, throwing out all of my smokes, lighters and ashtrays, and I quit. It was not easy. I used a nicotine patch to help with cravings and a lot of willpower.

> I had a few slips since I first quit in 2014, but I've been smokefree for the last 171 days.

**T36 — Wendell**, American Lung Association, 2021-01-29, `government/charity`. Quit date 2007-01-01 via Freedom From Smoking clinic after several failed attempts.
Source: https://www.lung.org/blog/ffs-success-stories

> I was fortunate to hear about the Freedom From Smoking program from my employer and it came at a time when I had “tried” to quit smoking quite a few times before. What helped me the most was having a plan and knowing what to do when cravings hit,

**T37 — Ana**, American Lung Association, 2021-01-29, `government/charity`. 40-year smoker; five years of solo attempts failed before a group class.
Source: https://www.lung.org/blog/ffs-success-stories

> The instructor was very knowledgeable and professional and taught us skills that, with time, proved to work.

**T38 — Stevie, Maria, Heather**, NHS Better Health, `government/charity`. Short site testimonials; treat as marketing-shaped.
Source: https://www.nhs.uk/better-health/quit-smoking/

> I smoked for over 25 years, and it wasn't easy breaking the habit. But what worked was choosing a quit date and getting help from my local Stop Smoking Service.

> I used lozenges to help with cravings. However, when I’m around smokers I use a vape. This helped me quit for good.

> The NHS Quit Smoking app really helped me. I liked seeing my progress. Recording my goals and reading other people's stories kept me motivated.

### Government campaign material (scripted — not peer testimony)

**T39 — Kristy**, CDC Tips From Former Smokers, 2015, `government/campaign`. Public-domain US government work. Directly on vaping-as-substitution and on cutting down.
Source: https://tools.cdc.gov/podcasts/media/pdf/TIPS_2015_Kristy.pdf

> I’m Kristy. I used to smoke cigarettes. I had smoker’s cough and severe shortness of breath. And I knew I had to quit.

> Then I tried e-cigarettes, but – I just ended up using both.

> My tip to you is: just cutting down on the number of cigarettes you smoke isn’t enough.

**T40 — Julia**, CDC Tips From Former Smokers, 2015, `government/campaign`. Public-domain. Included for completeness; it is a disease-consequence ad, not a method account.
Source: https://tools.cdc.gov/podcasts/media/pdf/TIPS_2015_Julia.pdf

> I’m Julia. I smoked and got colon cancer. And a colonoscopy saved my life.

> There’s so much I don’t want to tell you - but I did. Because my tip is: Tell what you know about smoking because someone might listen.

---

## (B) Techniques people credit

Recurrence counts are within this 107-thread + 20-page corpus and are indicative, not prevalence estimates.

### 1. Allen Carr's Easyway — "it changed what I thought I was giving up"

**What a person literally does:** reads the book to the end while still smoking (the book instructs you not to stop until you finish), with the explicit goal of ending it not wanting to smoke rather than resisting smoking.

**Recurrence:** very high — the single most-named branded method in the corpus. 100 posts matched the title search alone.

**The mechanically specific claim** is consistent across accounts and it is *not* "it motivated me". It is that the book removes the sense of sacrifice, so there is nothing to white-knuckle. u/Secret4gentMan states the mechanism and why it matters:

> Getting in to the appropriate mindset is essential, I believe, for most people to quit smoking for good. Which is why I think Allen Carr's book on quitting smoking is so successful in helping people to quit. Once you have the proper mental shift in thinking about smoking you will know it. You won't be having to reinforce it to yourself by telling yourself that you're done. You'll just be done.

u/MerlinShinji compresses it to one line (title: "I think I finally understand Allen Carr's method"):

> It's really about seeing and understanding that smoking has no benefit.

u/Supermacropenis on the mechanism being persuasion against one's own intent:

> I’d say I’m quite a stubborn person. If I want to do something then I’ll do it. So to have Allen talk me out of it through the course of the book was quite shocking.

u/coldbeers names the specific belief that changed — anticipated deprivation (T22): *"I was apprehensive to stop because I thought I’d be missing out, I was utterly wrong."*

**BACKFIRE — three distinct failure modes, all first-person:**

*(a) It increases consumption during the read.* u/ZoloftPlsBoss (T19): the instruction not to stop until finishing the book, combined with its prohibition on cutting down, took him from 3 cigarettes/day back to a pack.

*(b) It does not work twice.* Same account: a 6-year Carr quit, then relapse, then the book had no further effect across repeated re-reads. He asks the corpus directly:

> I'm curious if anyone had a similar experience with Allen Carr. I read so many posts about the book working the first time but after a relapsd, it no longer had an effect.

*(c) It simply doesn't land.* u/chunkybeard (T17): *"I read it and kept smoking for years. It just wasn't enough."*

**Also worth capturing:** u/recyclops18505 (T20) is a case of the method working while the reader rejects the content — hated the book, quit anyway with zero physical withdrawal. And the community itself notices the monoculture: u/okaymoose, *"Its like some freaky Curr cult over here."*

### 2. Varenicline (Chantix/Champix) — "it made smoking not work"

**What a person literally does:** starts the tablet while still smoking, keeps smoking through titration, sets a quit date 7–10 days in, and — critically — treats missing that date as non-fatal.

**Recurrence:** ~12 threads. Uniformly positive where taken; the complaints are side-effects, not efficacy.

**Support:** T5, T6, T29, and T4's 9.5/10. The distinguishing feature versus every other technique here is that users describe an *altered relapse economics*, not increased willpower — smoking during a lapse produces no reward, so a lapse does not cascade. u/JayCroghan smoked ~5 partial cigarettes during his first three weeks and still reached a stable quit.

**Design-relevant detail:** both varenicline accounts *missed their first quit date and kept going*. u/CarefreeBrowsing: *"I set a quit date for April 7th but did not follow through. I was disappointed, but definitely noticed I was smoking less."* A product that treats a missed quit date as failure would have ejected both of these successful quitters.

**BACKFIRE:** u/Shinee131 reports the cravings returning on stopping the course — *"I did my first month of Chantix and finished the pack. My cravings did return severely."* And side-effect load is substantial and specific: T5's account of the first-week dreams is the most detailed in the corpus and includes a genuine safety point about the neuropsychiatric feeling, with the correct advice to stop and see a doctor.

### 3. Cold turkey — most credited, least differentiated

**What a person literally does:** stops, keeps nothing, uses no substitute.

**Recurrence:** highest raw volume in the corpus by a wide margin.

**Support:** T8, T13, T28. u/wrv505's version is the most articulated and is notable because it *inverts* the usual craving advice — engage the craving rather than distract from it: *"I embraced the thoughts and cravings, never tried to ignore them."*

**Read this one sceptically.** The volume is a selection artefact: cold turkey is the default attempt, so it is also the modal success *and* the modal failure, and only the successes post milestones. The one person in the corpus who systematically scored the methods he had personally tried rated it **2/10** (T4).

### 4. The "one puff" rule — absolutism beats flexibility, with one exception

**What a person literally does:** adopts a categorical rule that no quantity is permissible, and treats "I could have just one" as a symptom rather than a thought.

**Recurrence:** very high; one of the corpus's few near-consensus positions, and the *only* technique that survivors and relapsers agree on.

**This is where the cross-substance pattern the coordinator flagged reproduces.** The nicotine relapse trigger is *not* craving. It is feeling well, plus a wish to demonstrate control. The shape is identical to the cannabis "now I can finally moderate" finding:

- T2, at 6 months: *"I honestly felt great, and I was proud of myself. But then, one night, I wanted to prove to myself and others that I could smoke just one cigarette without getting hooked again."*
- T3, at **9 years**: *"And then I went to Europe for the first time, and thought I could have just one or two."*
- T15, prospectively warned and relapsed anyway: *"Remember how good you feel right now, because after enough time passes, you'll forget and think you can just have one here and there." And that's exactly what I did.*
- T18, at 1 year: *"then had one and smoked 10 years."*
- T14 names it as the repeated cause of three prior failures: *"Each of those times I fell for the 'just one' mind trick."*

Two differences from the cannabis version worth noting: the nicotine timescale is far longer — 6 months, 1 year, 9 years, not 10 days and 2 months — and the nicotine cascade is faster once it starts (T2 went one cigarette → full pack overnight; T3 took a year to return to full-time).

**COUNTER-CASE, and it is a real one.** T31 (Mohammed) took a puff at 6 months and it terminated the temptation rather than reactivating it: *"I had one puff, started coughing and thought 'no way, it’s not happening'. I haven’t touched one since."* T33 (Dorothy) similarly took two puffs pre-quit-date and read it as confirmation. So the rule is not universal — but note both counter-cases involve an *unpleasant* physical experience. The relapses above all involve a *pleasant* one (T3: *"I LOVED IT from the first drag"*).

### 5. Quit date vs. unplanned quitting

**Recurrence:** both are well-represented, and unplanned quitting is common enough here to be consistent with West & Sohal's finding that roughly half of successful attempts are unplanned.

**Unplanned instances:** T10 (ran out of money), T11 (shop shut), T12 (an ad landed), T13 (woke up and decided), T31 (woke up and decided). Trigger classes: money, accident of supply, a single emotionally-landing image, and the birth of a child.

**Planned instances:** T7, T33, T34, T35, T36, T38 (Stevie) — note that *every* structured-programme account is a quit-date account, because that is what the programmes instruct.

**The interesting asymmetry:** the charity/programme corpus contains essentially no unplanned quits, and the peer corpus is full of them. That is a property of the sources, not of quitting. Any product that assumes a scheduled quit date is modelling the programme literature, not the population.

The NHS story T38 (Stevie) and the Blackpool NHS service both stress that the date is *chosen by the quitter, in the near future* — pre-planning as an agency device rather than a deadline.

### 6. Tapering / scheduled reduction

**What a person literally does:** fixes cigarettes to a clock — one per hour, then one per two hours — rather than to cues, then steps down.

**Recurrence:** moderate, and sharply contested.

**Support:** T7's is the most concrete (30/day → 1/hour → half/hour → half/2h → half/3h → stop), and he names the mechanism as accumulated evidence of control: *"I felt like I was getting control over them because I was sticking to the schedule ... having had a lot of small wins leading up to it."* T30 (Maria) succeeded on tapering *after* cold turkey failed. T24 built a schedule with an LLM. T17 tapered nicotine concentration through a vape and then found cold turkey easy from a low baseline.

**BACKFIRE / contested:** CDC campaign copy directly contradicts it (T39: *"just cutting down on the number of cigarettes you smoke isn’t enough"*), Allen Carr's method prohibits it, and T19 reports the prohibition itself causing a rebound. This is a genuine live disagreement, not a settled question.

### 7. Hand-to-mouth and oral substitution

**What a person literally does:** puts a specific object in the mouth on a craving. The corpus is unusually concrete about *which* object.

**Recurrence:** very high.

Named substitutes, all first-person: peppermints, iced water with lots of ice, cleaning teeth, and biting the inside of the cheek (T28); carrots, celery, fruit and vegetables (T33); chewing on straws (T34); lollipops (T25); coffee straws (T26); flavoured/cinnamon toothpicks (u/No_Wolf_8172, u/sweetncyka, u/Simple-Property-8861); sunflower seeds (u/recyclops18505, u/AnimatorIcy4922); minty gum and ice water through a straw (u/kbears09); a water bottle with a vape-shaped nozzle (T23); candy, cake and snacks (T19).

Two mechanically distinct sub-strategies are visible and worth separating:
- **Oral occupation** — replacing the sensation. T28 names this explicitly: *"I think all of these activities were just substituting one form of oral stimulation for another."*
- **Throat-hit simulation** — replacing the *respiratory* sensation specifically. u/recyclops18505 is the clearest: heavily carbonated water *"helps with that throat hit feeling"*, plus deep breathing, plus *"Cutting a straw to the size of a cig and then breathing in while pinching it almost all the way closed."*

**BACKFIRE:** Allen Carr's method forbids substitutes on the grounds that they preserve the sense of sacrifice, and T19 found the prohibition harmful and broke it deliberately. u/AnimatorIcy4922's *"I’ve eaten an entire bag of sunflower seeds, my mouth is raw"* is a mild caution.

### 8. Cue and routine surgery

**What a person literally does:** identifies specific cue-bound cigarettes and changes the *setting*, not the willpower.

**Recurrence:** high; and the named cues are strikingly consistent — after a meal, with coffee, driving, with alcohol, first thing on waking.

Concrete moves: stopped driving for a few days because the car was the trigger, and sat in different chairs at the kitchen table and in front of the TV (T34); declared the house and car smokefree zones and removed every ashtray, lighter and cigarette (T33); went outside on a craving as if for a smoke and did deep breathing there instead (u/recyclops18505); kept the last pack visible by the front door as a deliberate counter-cue (T5).

The oddest and most memorable is T7's, and it is a genuine pattern-interrupt rather than avoidance — driving past the shop he used to buy from, he would *"start growling and then barking my head off like a dog ... it got me out of my head and into my head and I forgot the trigger."*

**Note the disagreement about the last pack.** T33 and T35 remove every trace; T5 keeps 19 cigarettes by the door on purpose. Both are stable quits. Removing cues is not universally required.

### 9. Quitting alcohol alongside, or avoiding drinking

**Recurrence:** high, and near-unanimous where mentioned.

**Support:** T7 stopped drinking for six months first, on the explicit reasoning *"I knew I could not drink and not smoke."* T5 stopped drinking seven days in for the same reason, stating it precisely: *"if I have a drink it makes me want to have a smoke and I do not want to want to have a smoke so if I remove the cause."*

**Counter-case:** T8 deliberately went drinking on night one while motivation was high and reports it permanently defused the cue — *"drinking has never been a trigger for me since."* Exposure-with-high-resource versus avoidance; both reported working, by opposite logic.

### 10. Recruiting other people explicitly, with instructions

**Recurrence:** high in the charity corpus, moderate on Reddit.

The distinguishing feature of the accounts that credit support is that the support was *briefed*, not merely present. T33's brother had a script (*"No, you really don't want that cigarette"*); T33 asked her granddaughter and daughter to hold her accountable by name. T30 checked in daily in Facebook groups and still does. T34 quit jointly with her mother and they *"call each other out when we were grumpy."*

**BACKFIRE:** co-quitting fails when schedules are misaligned — T33's earlier attempts collapsed repeatedly because she and her husband were never quitting at the same time. When they finally synchronised, it held. u/cybrmavn lost a **seven-year** quit and attributes it to absence of support.

### 11. Money as the operative lever

**Recurrence:** moderate, and it shows up as a *cause* of quitting more often than as a reward.

T23 quit because he could not afford it — *"It was quit smoking or move into my car"* — and explicitly did not want to quit at the time. T10 chose cat food over cigarettes. T33's household quit when insurance premiums rose $100/month. T32 was jolted by a $60 packet.

This is the clearest evidence in the corpus against readiness-gating: several durable quits began with no motivation at all, only constraint.

### 12. Savings and progress tracking

**Recurrence:** high but shallow — very commonly mentioned, rarely credited as decisive.

T34 saved the cigarette money in a glass jar and spent it on a dinner when full; T23 used an app tracking days and money; T38 (Maria/Heather, NHS) credit the NHS app's progress display and savings figure. T33 set a milestone reward and got a tattoo for it.

**Caution for a recovery product:** T27 describes *deleting all tracking apps* as the act of moving on, and the NHS testimonials crediting the NHS app are the most marketing-shaped text in this document. Tracking appears to support early weeks and to become something people want to shed later.

### 13. Identity relabelling, and the lag

**Recurrence:** moderate.

T9's is the most usable formulation, because it is a mechanism rather than an affirmation — move cigarettes onto the pre-existing mental list of things you simply do not do: *"Add cigarettes to your 'do not want' mental list."*

The honest counterweight is T28's, and it should be preserved in any product that promises a fast identity shift: *"It took me a while to see myself as a 'non-smoker', though. For many years afterward, I had a recurring dream in which I was smoking."*

### 14. Education about the mechanism as an anti-relapse tool

**Recurrence:** moderate.

T8 read everything he could about how the addiction works and made it *"front and centre of my mind"*. T2's follow-up post (T-source `1g86jrp`) puts self-education first among four things he would do differently, and ties it directly to the one-puff rule:

> The first thing I would do is educate myself more about cigarettes, tobacco, and nicotine. When we understand something better, it’s easier to fight against it. If I had known from the start how cigarettes affect the brain and body, I would have realized sooner that there’s no such thing as "just one cigarette."

He also gives the most product-shaped support instruction in the corpus:

> I’d send a message to everyone I’m in regular contact with, telling them I’m quitting smoking and need their support because it’s important to me. I’d ask them not to give me a cigarette even if I ask

### 15. Craving-duration reframing

**Recurrence:** moderate.

The claim is that a craving is short and self-limiting, so the task is bounded. T26: *"it’s an obsessive thought. If you let it; it will only last about 3 minutes max."* T2: cravings *"don’t last long, usually just a few minutes. But if you’re not prepared for those few minutes, the craving can catch you off guard."* T5 used a 15-minute naming-everything-in-the-room exercise and reports the craving gone within two minutes.

Physical discharge is the commonest paired action: T7 curled his toes until they hurt, stood and spun in a circle, clapped for a minute; T2 used the gym, walking and cycling; T30 used meditation, yoga and music.

### 16. Vaping as a substitution route

**Recurrence:** moderate; **the most contested technique in the corpus.**

**Credited:** T17 used a vape for controlled nicotine-concentration decline and says cold turkey then became easy — while warning about lung damage. T38 (Maria, NHS) uses a vape situationally around smokers.

**BACKFIRE, and it is the dominant pattern:** T39 (CDC) is dual use — *"Then I tried e-cigarettes, but – I just ended up using both."* T16 traded cigarettes for years of vaping before quitting both. T27, T25, T26 and the whole of r/QuitVaping exist because the substitution became the new dependency. T4's *"heavy vaping at the tail end"* and T24's Japan device (*"Just as addictive, maybe even worse"*) are the same shape.

The honest summary: as a *taper vehicle* with a planned endpoint it has real first-person support; as a *substitution* it very commonly becomes the next thing to quit.

### 17. What was different on the attempt that finally worked

This was the highest-value question and the corpus answers it consistently. Five themes, in rough order of frequency:

**(a) The internal argument was over before day one.** The most-repeated answer by a distance. Not more willpower — *less need for willpower*, because the wish to smoke had gone rather than been suppressed. T1 is the canonical statement (white-knuckling versus *"I know within my heart of hearts that I never want another cigarette"*). T4, T21, T22 and the whole Allen Carr cluster are the same claim by another route. u/TWootie13: *"this time it was a non negotiable effort."*

**(b) Absolutism about the first cigarette, learned from the specific prior failure.** T14 is the clearest: three failures, all to the "just one" trick, then *"This time I absolutely knew I couldn't have one."* T2 and T3 arrived at the same rule by paying for it.

**(c) A pharmacological change, not a psychological one.** T5, T6, T29. Notable that T29 had failed "dozens" of times and then succeeded *first try* on medication — which reframes the prior failures as a treatment-access problem rather than a character one.

**(d) Removing the second substance.** T7 (stopped drinking first), T5 (stopped drinking at day 7). Several accounts treat alcohol as the actual failure point of every previous attempt.

**(e) A change of environment or routine that broke the cue set.** T34 stopped driving; u/LeoTrollstoy quit on vacation and states the rule generally: *"For me it’s impossible to quit if I have the same daily routine."*

**What is largely absent from the "this time" accounts:** increased motivation, more information about health harms, and stronger reasons. People who relapsed usually had those already. The differences they name are structural — the argument being settled, a rule being absolute, a drug being present, a cue being gone.

**Counter-evidence to the whole framing, and it should be kept:** T9 succeeded at his most stressful life moment while self-describing as having *"the weakest will of all"*, and T23 succeeded with no desire to quit whatsoever. Not every durable quit has a "this time was different" story. Some are just constraint plus time.

---

## Divergences worth carrying into product design

1. **A missed quit date is not a failed quit.** Two of the strongest medication accounts (T5, T6) missed theirs and succeeded. Do not build failure states around a date.
2. **Readiness-gating is contradicted by the corpus.** T23 and T10 did not want to quit. Constraint worked.
3. **The relapse alarm should fire on wellbeing, not on distress.** T2, T3, T15, T18. A product that escalates support during craving and relaxes it during a good stretch is inverted relative to when the corpus says relapse actually happens — and, per the coordinator's cannabis finding, this now looks cross-substance rather than nicotine-specific.
4. **Substitution advice is genuinely contested.** Carr-derived material forbids it; the majority of the corpus uses it; one account (T19) was harmed by the prohibition. Present both, do not arbitrate.
5. **Support must be briefed to work.** "Tell people" underperforms "give people a script and a rule".
6. **Tracking has a natural end.** T27 deleted the apps as the closing act.

---

## UNVERIFIED — could not access

No quotes are drawn from any of these. Listed so the gap is explicit and re-attemptable.

- **CDC "Tips From Former Smokers" Real Stories** — all twelve pages. `www.cdc.gov` returned HTTP 403 to both WebFetch and `curl` under multiple user agents; `web.archive.org` returned HTTP 498 (rate-limited) on every one of ~16 attempts across 25 minutes with backoff to 180 s; `archive.cdc.gov` returned 404; WebFetch refuses `web.archive.org` outright. Page titles obtained from one archived copy of the index that did land: Geri M., Terrie H., Denise H., Brian H., Ethan B., Elizabeth B., Stephen B., Tammy W., John B., Angie P., Noel S., Felicita R.
- **CDC "Quitting Stories"** — Betty's Story and Daniel's Story. Same blocks. A web-search snippet purported to quote Betty; **not used**, because a search snippet is not a fetched page.
- **truthinitiative.org** — `/quit-smoking-stories` returned 404; could not locate the current path before the session's web-search budget was exhausted.
- **Blackpool NHS Tobacco Addiction Service quit stories** (Karen and others) — `bfwh.nhs.uk` returned no response; the `blackpoolteachinghospitals.nhs.uk` path returned a 212-byte stub.
- **whyquit.com** — reachable but the testimonial index paths returned 404. Worth a retry; note it carries a strong cold-turkey/anti-NRT editorial position that would need flagging.
- **Quit Victoria video-only stories** — Terry, Audrey, Lily, Matilda Mercury, "Prepared Peter". Pages carry an editorial blurb and a video; no transcript in the HTML. Matilda's page has one on-page quote block only, which is included nowhere above because it is promotional rather than method-bearing.
- **Reddit comment scores** shown are as rendered at fetch time and drift.

## Reproduction

Archived corpus and scripts: `/tmp/.../scratchpad/nic/` — `threads/` (107 old.reddit thread pages), `pages/` (charity/gov HTML), `as/` (arctic-shift JSON), `tips/` (CDC PDFs), `rthread.py` (attribution-correct parser), `verify.py` (exact-substring checker). Scratchpad is ephemeral; re-run `rsearch.sh` → `collect.py` → `fetch_threads.sh` to rebuild.
