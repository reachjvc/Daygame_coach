# 11 — YouTube long-form: first-person accounts of quitting

Source medium: long-form YouTube video (5–130 min) by people describing their own quit, plus a small number of clinician/coach channels included only where the speaker is describing their *own* history. Substances covered: alcohol, cannabis, nicotine (vape + cigarette), pornography, opioids.

---

## Retrieval method

`yt-dlp` (v2026.03.03, `--js-runtimes node`) pulling YouTube auto-captions and creator-uploaded captions directly, plus `--write-info-json` for metadata. Discovery via `yt-dlp ytsearch15:<query>` across 35 queries in two passes, then channel-page listing for named channels.

I wrote a small timestamp-preserving fetch script rather than reusing the existing `~/.cache/cyl-corpus` rig (documented under `docs/research/change-your-life/`) — that rig's cleaner **strips timestamps**, and timestamps are the whole point here. I read the cyl rig's `fetch-one.sh`/`discover.sh` for the throttling and VTT-dedupe approach and copied that logic; I did not modify it or write anything to it.

Working corpus (scratch, not committed): `/tmp/claude-1000/-home-jonaswsl-projects-daygame-coach/ff3f8751-7999-40f3-a07f-39e49e15c9be/scratchpad/rec/` — `text/` (timestamped transcripts), `meta/` (title, channel, upload date, view count), `raw/` (original VTT + info JSON).

### Success rate

| | count |
|---|---|
| Candidates discovered (unique, ≥5 min) | 272 |
| Videos selected and attempted | 66 |
| Transcripts retrieved | **64** |
| Failures | 2 |
| **Retrieval rate** | **97.0%** |
| Total transcript words | ~248,000 |

The two failures: `ZFwsggWH-Xs` (Your Mate Tom, "I quit smoking weed 180 days ago") — metadata extraction failed on two attempts; `cOLyemr0ZuY` (Sober Leon, "8 Things To Expect When You Quit Drinking Alcohol") — `NOSUBS`, no caption track exposed. Both are listed under UNVERIFIED below.

Retrieval was far more reliable than expected. If more volume is wanted, the same rig will scale — the constraint is reading time, not fetching.

### Confidence

**High** that every quote below appears in a transcript I actually retrieved and read — I did not quote from any description, thumbnail, title, or recollection, and I did not quote from any of the 64 transcripts I fetched but did not read in full.

**Important caveat on verbatim-ness.** Most of these are **auto-generated captions (ASR)**, not human transcripts. Auto-captions have no punctuation or capitalisation, and they contain recognition errors. Two errors I confirmed by eye: the McCall Mirabella captions render her own name as "macaulay arabella," and multiple transcripts render "Allen Carr" as "Alencar" / "Alan Car" and "Sober Clear" as "silber clear."

So: **each quoted string is verbatim to the transcript, but the transcript is not guaranteed verbatim to the audio.** Where I quote, I have reproduced the transcript text exactly (including its lack of punctuation) rather than tidying it, so a spot-check against the transcript will match exactly, and a spot-check against the audio may differ in wording at the margins. Where a video had creator-supplied captions (punctuated — e.g. Second Act Recovery, Honest Ramble, Kevin O'Hara, Ian Callaghan, Travis Rieder TEDx), fidelity is much higher. I have marked ASR-only sources with `[auto]`.

Timestamps are block-start times from the caption cues, accurate to roughly ±20 seconds.

### Bias notes — read before using any of this

1. **Nearly every creator here monetises sobriety.** Sober Leon sells the Sober Clear coaching program (pitched inside the first 60 seconds of each of his videos). Addiction Mindset ("Dr Frank") sells coaching, a $497/mo accountability group, and a nicotine-free gum supplement. Second Act Recovery sells a "90-day sobriety survivable kit." Kevin O'Hara sells a 30-day program. QuitByHealing sells a 21-day course. Seb Jones sells coaching. struthless was launching a book mid-video. **Their "what worked" is not neutral testimony; it is the origin story that sells the product.** Techniques that conveniently require the creator's program should be discounted hard.
2. **Survivorship bias is total.** These are people who succeeded and then made a video about it. The person on attempt 43 who is still drinking does not have a channel. The single most valuable video in this corpus (Noah Thomas relapsing at one year) is valuable precisely because it violates the genre.
3. **Retrospective distortion.** All the "year one" videos are reconstructions from the far side. The two contemporaneous-diary sources (McCall Mirabella filming during withdrawal; Jordan Welch narrating day-level detail) read markedly rawer and less tidy than the retrospectives — the retrospectives all resolve into a clean arc.
4. **Algorithmic selection.** Discovery was YouTube search, which ranks by engagement. Dramatic-transformation framing is over-represented; ambivalent and partial outcomes are under-represented. I deliberately over-sampled the ambivalent ones (Honest Ramble, Goal Guys, Noah Thomas, Chris Skoyles) to correct for this, so their frequency here is higher than their frequency in the wild.
5. **Substance skew.** Alcohol dominates, then cannabis, then nicotine. Porn/NoFap content is heavily entangled with a self-improvement/manosphere register that shapes the vocabulary ("higher self," "lower ego voice"). Opioids are represented by a single account.
6. **Demographic skew.** Overwhelmingly Anglophone, mostly white, mostly men, mostly 25–55. Two women's accounts (McCall Mirabella, Ana Wallace Johnson) plus one (Ask Charlie).

### Copyright / product-use flag

These are copyrighted published performances by named creators. Every item below carries channel, video title, URL and timestamp. **Product use must be short attributed quotes with a link back to the source video** — not bulk reproduction, not paraphrase-as-if-quote, and not stripped of attribution. Several of these creators sell competing paid programs, which is a commercial-sensitivity issue on top of the copyright one. Treat "can we quote this in the app" as a question to answer per-quote, not once for the corpus.

---

# (A) Testimonials

Numbered T1–T24. Stage = where the speaker is at the moment of speaking.

---

### T1 — six months, and honestly ambivalent
**Paul, "Honest Ramble"** · *No Alcohol for Six Months. The Surprising Dark Side to Getting Sober* · <https://www.youtube.com/watch?v=LjGVFLz0voM> · uploaded 2026-08-07 · alcohol · **stage: 6 months**

On what he lost:
> "Not having a drink has made me more of a boring fart. I'm not going to lie. I'm a bit grumpier." — [18:31]

> "having a few drinks used to bring fun Bobby out, as I was sometimes called. And now I feel like I'm a little bit of a spare part sometimes." — [15:58]

The doubt that follows:
> "it makes me question a little bit is how much I I used to enjoy the things that I enjoyed doing. Did I really enjoy them or was it having a beer that made me enjoy them?" — [18:53]

On why he won't try moderation:
> "I don't do moderation very well. I said that I cut everything for the diet. It's like all or nothing for me." — [9:08]

Trigger event was medical, not moral — chest pains after a moderation attempt failed, blood pressure "over 250, 257 over 150" [4:32], and:
> "Went to see my doctor who said that I was a walking stroke." — [4:53]

Also notable: he reports the *diet* changes he made alongside sobriety have already slipped [9:31] while the alcohol quit held — his own explanation being that you can avoid a pub but you cannot avoid food [9:53].

---

### T2 — the difference between attempt 42 and the one that worked
**struthless (Campbell Walker)** · *How I got sober after 15 years of addiction* · <https://www.youtube.com/watch?v=rCA2a75YMa8> · uploaded 2025-02-03 · alcohol + drugs · **stage: multi-year, post-relapse**

The framing question:
> "How do you go for attempt 42? Like how do you how do you go for that attempt and tell yourself like this time it's going to be different?" — [0:21]

His central finding, and the most quotable line in the corpus:
> "I thought that rock bottom was catastrophic as opposed to emotional... But what I learned on the attempt that actually worked was that the deepest shame is ordinary. Just about anybody can face a crisis. It's that everyday living that's rough." — [3:54]

On what "powerless" turned out to mean:
> "you only control the first drink. You only control the first line. You only control the first pill." — [9:04]

On his prior failed strategy:
> "in previous attempts, and you can even see this if you go back through my channel, I was doing what I called being 90% sober. Nah, man. Just kept I just kept relapsing. I needed to completely abstain." — [9:40]

On the horizon problem:
> "You don't have to go 5 years sober right now. You just got to make it till tomorrow." — [18:30] (quoting his sponsor)

> "I think when I was trying earlier and earlier, I really just wanted that badge. I wanted to be able to say, 'I'm 10 years sober.'... there was something so much more dignified about that than saying I'm 3 days sober." — [18:30]

On the last night not feeling like the last night:
> "the final night was no bigger or smaller than any other night. It was just another night of me doing the same [ ] thing." — [18:10]

---

### T3 — relapse at exactly one year, filmed while it's happening
**Noah Thomas, "bignoknow"** · *I RELAPSED AFTER 1 YEAR OF SOBRIETY (this is very hard for me to talk about)* · <https://www.youtube.com/watch?v=McajqLzeLgk> · uploaded 2019-05-08 · alcohol · **stage: relapsed, ~1 year + 2 weeks** `[auto]`

The single most important item in this corpus, because it is the only account recorded *inside* a relapse rather than after recovery from one.

> "it started to shift on me a couple weeks before my one-year anniversary something about that triggered me hard and I know from what I've heard in 12-step rooms that's very much a thing and and I fell victim to it" — [1:30]

The negotiation, in real time:
> "I've got my brain telling me hey you've grown a lot you can do this you can do this there's no reason if you don't believe in yourself that you can't do this in terms of control my drinking there's the other part of me that's very responsible mature educated part of me that knows that that's all a cliche" — [4:03]

> "I always end up getting this little feeling at least in moments that maybe things could be different and I know that sounds crazy I'm not stupid I know that sounds crazy but it feels so real to me" — [7:34]

His wife names the pattern he can't see:
> "honey the last time you started drinking the first few months were fine it was after that that it escalated" — [8:20]

On why competence elsewhere is not protective:
> "I've been able to demonstrate so much discipline in so many areas it's it's really hard to imagine I can't be disciplined here but that is the nature of addiction" — [8:45]

And the whiplash of identity:
> "to feel so assertive about something for so long and then to just feel completely different so fast" — [10:38]

---

### T4 — day-by-day, filmed during withdrawal
**McCall Mirabella** · *4 Months Quitting Nicotine Documented* · <https://www.youtube.com/watch?v=IluaaGVtJFU> · uploaded 2022-06-19 · nicotine (vape, 4 years' use) · **stage: 125 days** `[auto]`

Contemporaneous footage, not reconstruction. The clearest week-by-week texture in the whole corpus.

> "i'm 10 hours in and this [ ] is hard i was having a laugh attack and like my hands were really shaky my leg was shaky i don't know why the [ ] i cry" — [2:14]

> "day three i really feel like i'm about to cave just give up right now i'm in a very irritable bad mood" — [3:05]

> "day five i got a stress ball i want to hit it so bad tonight maybe the night i relapse this is not looking good day number six i want to hit nicotine so bad" — [5:56]

> "day 12. i'm trying so hard i'm in a pickle guys i might hit it and i charged it and it was on green and i held it put it to my lips and then i gave it back to sean" — [7:20]

Her own summary of the shape of it:
> "days one through twenty were my toughest battle" — [7:20]

The far end:
> "95 days wow i'm reflecting on days where i watched people hit nicotine and i didn't crave it day 90 about five days ago some cravings have came back even though i'm having those cravings i'm not experiencing any physical reactions to the cravings" — [10:26]

The unglamorous part most retrospectives omit:
> "i weighed myself today and i gained eight pounds that was really hard for me i almost cried" — [9:45]

And what other people got wrong:
> "if someone you know is trying to quit don't call them a [ ] or [ ] for struggling with withdrawals don't tell an addict you would be able to quit if you tried while simultaneously never having battled addiction" — [6:18]

Attrition among the eight friends who quit with her, all incentivised with $3,000 each: two lasted 24 hours, one three days, one five days, one six days, one made three months and then caved [6:39].

---

### T5 — a year sober and nothing had happened yet
**Goal Guys (Brendan)** · *I quit alcohol for 1 year, here's what actually changed...* · <https://www.youtube.com/watch?v=_5kgJY7AEd4> · uploaded 2025-04-03 · alcohol · **stage: 365 days** `[auto]`

The most useful counterweight to the transformation genre. He quit at 7–14 drinks/week and for half a year got almost nothing:

> "there was just one problem nothing in my life actually changed while my sleep had improved somewhat during 75 hard the longer I continued to avoid alcohol through 100 days 150 days my sleep more or less stayed the same and I wasn't experiencing any new breakthroughs in My overall mood or health that I could clearly point to as a win" — [6:39]

> "it felt like I was doing this for nothing" — [8:26]

Then, late:
> "for me personally it took almost 6 months to see any meaningful change and when they did start happening they were not what I was expecting" — [8:48]

> "6 months without drinking and suddenly the act of sitting down and focusing became something that I didn't need to think about" — [9:31]

And he lands on moderation, not abstinence — rare in this corpus:
> "I know moderation isn't a very glamorous takeaway uh the truth is there there are things about alcohol that I I do love and I do enjoy" — [12:19]

He describes the endpoint as going "from 7 to 14 drinks a week to probably like seven drinks a year" [12:19].

---

### T6 — thirteen years out, on what nobody warned him about
**Kevin O'Hara, "Habits V2"** · *I Quit Drinking 13 Years Ago — Here's What Nobody Tells You* · <https://www.youtube.com/watch?v=OA-yK169y2U> · uploaded 2026-03-22 · alcohol · **stage: 13 years**

On the craving actually ending:
> "you realize you haven't thought about it in a in a while. You haven't thought about alcohol in days, or weeks, or months. It's like an old girlfriend, right? You think you'll never get over her, and then 6 months later, somebody mentions her name, and you go, 'Ah.'" — [1:24]

> "They tell you you're going to start out white-knuckling things, cold turkey, and that you're going to be fighting this forever, and it's just not true, not in my experience, anyway." — [1:47]

On the framing that he says did the work:
> "This is a decision. It's not a battle. I didn't spend 13 years fighting off the alcohol... I made a decision, one single decision, and then I built my life around that decision." — [8:48]

> "my decision was actually to become a better dad. It wasn't to stop drinking alcohol." — [9:08]

On why he thinks the battle narrative is the trap:
> "if you believe you're always going to be fighting, then you're always going to be at war." — [10:10]

On what others say:
> "'Why aren't you drinking?' You're going to hear that question so many times in your life... And I'll tell you what that question really means in people's heads. It means your not drinking makes them uncomfortable about their own drinking." — [7:44]

The loss he names as saddest:
> "picking up a load of photographs from some of the best times that I've had in my life, and realizing that I I never remembered those times at all." — [3:10]

Note the commercial context: he pitches a paid 30-day program at [3:32], mid-list.

---

### T7 — twenty years of secret smoking; the quit only worked after the trauma work
**"Ask Charlie"** · *How I Finally Quit Smoking After 20 Years (The Truth I've Never Shared)* · <https://www.youtube.com/watch?v=X4kBUi3d2c8> · uploaded 2025-07-01 · cigarettes · **stage: 2+ years**

She had already tried, and failed with, the Allen Carr clinic, repeated hypnotherapy, and therapy:

> "I even went to um Alan Car's easy way to stop smoking like clinic in London. I think I was 23. And it worked for a few weeks and then I was back um smoking" — [2:11]

> "I would stop and I would stop for a period of time and then something would happen that would trigger me to go back to it" — [3:21]

Her account of what made the difference: she did targeted therapy on her childhood and her relationship with her father *for unrelated reasons*, and only afterwards did a quit attempt hold.

> "unless you have overcome and worked through that trauma, you are not going to be totally free from whatever it is that you have resorted to." — [13:29] (relaying Lucinda Gordon Lennox)

> "And until I had done the work to leave the past in behind behind to accept my past to accept that that has shaped me that has happened but to be free from it. I couldn't stop smoking." — [14:10]

Her therapist's mechanical reframe of what a cigarette was doing:
> "When you're stressed, you hold your breath. And when you hold your breath, you feel awful. When you have a cigarette, you are regulating your breathing." — [10:12]

On why she waited two years to make the video:
> "I didn't want to film this video 3 weeks after, three months after, six months after. I wanted to know that I had was free from cigarettes." — [11:17]

---

### T8 — six months off cannabis, and the introvert who wasn't
**Dorian Develops** · *I quit smoking weed 6 months ago.. Here's what I've noticed so far* · <https://www.youtube.com/watch?v=pGoeG5aY3S0> · uploaded 2024-02-14 · cannabis (20+ years) · **stage: 6.5 months** `[auto]`

The month-by-month shape:
> "it was very hard every month felt like it got easier the first couple weeks were terrible but then a month passed and I felt better and things were still a little rough but after like 2 or 3 months I finally kind of got over it" — [0:41]

The most striking retrospective finding — that a trait he thought was his personality was a drug effect:
> "I've always considered myself an introvert but I'm starting to think that maybe my relationship with weed made me more of an introvert" — [8:55]

> "that being weird turned me into an introvert and it almost produced social anxiety that I don't think I would have had and I don't think was something that was natural for me" — [10:40]

On the self-medication inversion:
> "after being sober for a while I'm noticing that my anxiety and depression was definitely elevated by smoking weed every day it wasn't reduced although I used to think that it was helping me with those things" — [3:11]

On the moments of clarity that never converted:
> "so many times I wanted to quit smoking weed when I was high and it was almost like weed was telling me like dude you don't need this anymore and I wish I would have listened to that" — [22:01]

Cost, concretely: $300–400/month [11:01].

---

### T9 — "no unicorns dancing and sunrise yoga bollocks"
**Ian Callaghan** · *8 Brutal Truths About Quitting Alcohol* · <https://www.youtube.com/watch?v=4PO2xbSQXwM> · uploaded 2026-02-06 · alcohol (45 years' drinking) · **stage: 1 year+**

On the thing nobody warns about:
> "the boredom will nearly kill you. Everyone talks about cravings. Nobody talks about the boredom. Soulcrushing boredom." — [0:22]

> "You have to learn how to exist in a normal life without chemical assistance and that takes months. Some days it still sucks." — [0:22]

On the sleep promise being false:
> "your sleep gets worse before it gets better. Everyone promises amazing sleep. They're [ ] liars. For months, you sleep like [ ] ... You'll wake up at 3:00 a.m. every night for weeks. Month four, month five, then you'll finally start to sleep properly." — [1:04]

On emotional return:
> "I spent 45 years numbing everything. Anger, sadness, joy, fear, all muffled. Then you get sober and emotions come back at full volume. You cry at adverts." — [1:26]

> "sobriety does not fix your problems. You're still you just sober... Sobriety is not the solution. It's the starting line." — [2:31]

The six-month realisation:
> "After about 6 months, you're stone cold sober and you think, 'Oh, right. That's why I drank.' Life is hard. Existence is uncomfortable. Reality is often disappointing. Alcohol was a [ ] solution. But it was a solution. Now you need better tools." — [2:54]

On relapse, non-catastrophically:
> "What if I relapse? Then you start again. No drama, no shame spiral. Just start again." — [4:21]

---

### T10 — Allen Carr worked three times, for a day, a week, and two weeks
**Chris Skoyles** · *REVIEW: Allen Carr's Easy Way to Stop Smoking* · <https://www.youtube.com/watch?v=gAAhNcbt34s> · uploaded 2018-02-04 · cigarettes · **stage: 17 months** `[auto]`

The most rigorous BACKFIRE account in the corpus, from someone who did eventually quit and still credits parts of the book.

He quotes the method's own published numbers back at it:
> "they have a success rate of 90 percent of people who used the Alencar method quit smoking and stay stop smoking for three months however only 50 percent of the people who used the Alencar method stay stopped for a whole year and to me that's the big thing" — [1:59]

The distinction he builds the whole review on:
> "actually stopping smoking is the easy part... the part that's difficult is after you've stopped smoking never picking another cigarette up can sustain stops that's the part that I found challenging and that's the part that this did not help me with" — [2:52]

First attempt — the euphoria and the crash:
> "by Sunday evening I had this great sense of elation like yes I've quit smoking and I'm going to be happy about it" — [4:24]
> "I was too cocky that was my downfall because by the end of that week or maybe the end of the second week... the stresses and pressures of everyday life came back and guess he was a smoker again" — [5:52]

Second attempt, read while his grandmother was dying:
> "I remember finishing reading it jumping on the boss the boss was an hour away from the Kospi tall walking up the hospital coming out I'm going oh my god I knew cigarette now so I didn't even last a day that second time" — [8:14]

What he thinks the book *does* do:
> "wasn't it the perfect tool for me" — [11:04] (his own framing of the question) ... "what it did was help me change my mindset so that I could better arm myself to go forth and stay stopped" — [18:43]

> "use it as a tool and not a miracle cure" — [28:16]

And on prerequisite motivation:
> "if you are approaching this book because a partner is urging you to quit because your children because a family member is urging you to quit I don't think it's going to be successful for you but then I don't think any method is going to be successful for you" — [20:11]

---

### T11 — a month of opioid withdrawal, week by week
**Travis Rieder** · *I was in opioid withdrawal for a month — here's what I learned* · TEDxMidAtlantic · <https://www.youtube.com/watch?v=HMchXc5lemU> · uploaded 2018-10-05 · prescription opioids · **stage: years out**

Iatrogenic dependence after a motorcycle accident, tapered far too fast (one dose dropped per week over a month).

Week one:
> "The early stages of withdrawal feel a lot like a bad case of the flu. I became nauseated, lost my appetite, I ached everywhere... I developed trouble sleeping due to a general feeling of restlessness. At the time, I thought this was all pretty miserable. But that's because I didn't know what was coming." — [1:52]

Week two:
> "At the beginning of week two, my life got much worse... I would sweat profusely almost constantly, and yet, if I managed to get myself out into hot August sun, I might look down and find myself covered in goosebumps." — [2:15]

> "perhaps the most disturbing was the crying. I would find myself with tears coming on for seemingly no reason and with no warning." — [2:57]

Week three:
> "At the beginning of week three, my world got very dark. I basically stopped eating and I barely slept at all thanks to the jitters that would keep me writhing all night." — [4:00]

> "The worst was the depression." — [4:00] (the captions show this phrase repeated; rolling auto-captions duplicate lines, so I cannot establish from the caption file whether he said it twice, and have quoted it once)

> "I began to believe that I would never recover either from the accident or from the withdrawal." — [4:22]

The end, which is not the end he expected:
> "she helped me up the stairs... I took the little orange prescription bottle, and I set it on my nightstand. And then I didn't touch it. I fell asleep. I slept through the night. And when I woke up, the most severe symptoms had abated dramatically." — [8:36]

His structural point:
> "our health care system seemingly hasn't decided who's responsible for patients like me." — [10:08]

CDC guidance he was not given: never more than a 10% dose reduction per week [12:54].

---

### T12 — two years, and the social cost is real
**Ana Wallace Johnson** · *Why I Got Sober & How it Changed my Life (Two Years No Alcohol)* · <https://www.youtube.com/watch?v=n5uFiikf0h0> · uploaded 2024-04-21 · alcohol + cigarettes · **stage: 2.5 years** `[auto]`

On why the earlier time-boxed attempts failed:
> "so how did I quit drinking basically took it one month at a time I think I did like a dry January... I did that and then February and all the subsequent months I was an absolute animal again I was compensating for lost time" — [5:36]

> "I allowed myself to drink again thinking like okay 3 months maybe I'll just do these temporary holds on this lifestyle that didn't work because I would just fall right back back into just going you know it felt like I had treated myself and then I was cured" — [6:18]

What she wanted and didn't have:
> "I kind of just wish I had somebody make this video for me... wish I had somebody say you don't need to drink you as a standalone individual you are totally fine you do not need that social lubricant" — [3:22]

> "I wish I had somebody to just have a very honest conversation and not being like and now I work out and now I eat my greens and I soak in a bath and I do 30 marathons a year now like an honest very chill conversation about what breaking that cycle was like" — [16:57]

On the recurring social moment:
> "there is that strange moment that you kind of have to assess how you are going to go about it and usually I'm like hey no listen please I'm totally fine but every single time I'm somewhere that conversation has to happen" — [13:39]

And a plain cost, stated without spin:
> "get really tired at the function now really really tired really tired if something starts at 10: which it often does in New York City there's no time limit on anything in New York City I'm gonna be exhausted" — [15:04]

Honest about substitution:
> "I have kind of replaced that drinking time frame with other sort of addiction like my phone is a big one" — [16:10]

---

### T13 — six months clean, then "I earned the right to just hit it once"
**Jordan Welch** · *365 Days Without Weed: The Best Year Of My Life* · <https://www.youtube.com/watch?v=q7FdXgMVSDs> · uploaded 2023-09-11 · cannabis · **stage: 1 year** `[auto]`

The cleanest single-decision-relapse narrative in the corpus. Six months sober, on holiday in Jamaica:

> "At this point I was doing really well in my life and I was six months sober so I told myself I earned the right to just hit it once I mean I could definitely handle it this time right so I smoked that day and the next one and the next one" — [4:55]

> "when I got back home it only took about two weeks until I was back to being a daily smoker it was like all those six months of progress went down the drain instantly" — [5:16]

On the loop:
> "I would quit for a couple days or weeks and then always go back or try to do something like smoke only CBD because it's not actually smoking" — [5:37]

First night off, second time round:
> "the first night was horrible I just remember sweating through my entire bed sheets and having the most insane vivid dreams that kept waking me up all night for the first week I had no appetite" — [3:51]

Month one, named in one word:
> "If I could describe my first month of quitting I would use one word doubt I felt like I was less creative without it I didn't feel happy anymore I feel like my conversations weren't as good" — [8:47]

And the measurable version of that doubt:
> "even the first video I made in this month of Being Sober was literally the worst performing one I've ever posted in the history of my channel" — [9:08]

The boredom-void, again:
> "after I quit I feel like I had all this extra free time in my day that I literally didn't know what to do with and that's when I realized those were the times I was smoking the most" — [9:49]

---

### T14 — the lie is the relapse
**Scott, "Spirit Fit Vices"** · *First Drink After a Year of Sobriety (Relapsed)... What I Learned now 3 months sober* · <https://www.youtube.com/watch?v=hNturY3EQmg> · uploaded 2017-12-13 · alcohol · **stage: 3 months, post-relapse** `[auto]`

> "that first drink that I took after a year and a half sobriety all right let's give in to that that was when the addict came out the first thing you do as an addict that comes out yell I what did I lie about I said out loud yeah honestly I I did so much so good you know what I could take it or leave it you know what was going on in my head oh well what's going on my head was oh my [ ] god I can't wait to drink more" — [0:03]

The concealment machinery, immediately online:
> "okay now we're going to track them now we're going to do this we're gonna do that we're to go for a walk to the grocery store we're gonna pick up another bottle and I'm going to replace that bottle so I can finish that bottle and have everything replaced and no one's gonna knew that I drank" — [2:04]

His test:
> "if you can honestly have that first drink and say that you don't just [ ] want more if you can honestly say that then you may not have a problem" — [3:36]

And the detail that makes it a technique rather than an anecdote — he only detected it in retrospect:
> "I didn't even realize it at this start but I realized that after when I was looking over my feelings and all that in reflection that holy [ ] I did really want that bad but I did the actions of getting more but it didn't process in my head it just it was automatic" — [4:00]

---

### T15 — the first week, hour by hour, from a doctor who did it himself
**Dr Donald Crowe, "Second Act Recovery"** · *7 Days Sober: What's Actually Happening Inside* · <https://www.youtube.com/watch?v=64bp946Ya4s> · uploaded 2026-06-02 · alcohol · **stage: 28 years** (40 years' emergency medicine)

Clinician framing, but he is describing his own quit as well. The best-structured week-one map in the corpus.

Day 1 — momentum carries you:
> "The reason why you stopped is still fresh. Maybe fear, maybe shame, maybe anger, maybe exhaustion, but it still has energy, and that energy can carry you through those first 24 hours." — [3:43]
> "Day one has job one. Don't drink. That's it." — [6:18]

Day 2 — worse:
> "Buckle up, because the second day without alcohol is often harder. The adrenaline of making the decision has faded." — [6:38]
> "this is often when a dangerous thought appears. If this is sobriety, you can have it. But this is not sobriety. This is still withdrawal." — [7:00]
> "The future suddenly feels enormous... 'How am I supposed to do this forever?' That thought can break people. Because nobody can emotionally tolerate forever." — [7:44]

Day 3 — discouragement peaks:
> "Day three is where discouragement often peaks. Because by now, people expected to feel better, and often they do not." — [8:26]
> "Day three is also when time becomes strangely heavy. Hours that used to disappear into drinking are now there sitting, waiting to be lived." — [8:47]

Day 4 — the improvement is the danger:
> "Day four often feels like a subtle turning point... And with that improvement comes a trap. The negotiating brain returns. Maybe the drinking wasn't that bad. Maybe I overreacted." — [9:32]
> "as physical discomfort begins to improve, honesty uncovered by the pain begins to fade." — [10:19]

Day 5 — visible evidence, and motivation leaving:
> "Day five is often when improved physical appearance becomes easier to notice. Less swelling, better skin tone, brighter eyes, better energy." — [11:46]
> "Day five is also where routine becomes crucial because motivation begins fading. Motivation always fades." — [12:09]

Day 6 — emotional fatigue and self-pity:
> "day six often brings emotional fatigue. You get tired of fighting, tired of thinking about not drinking." — [12:52]
> "Feeling sorry for yourself because you can't drink creates paralysis" — [13:35]

Day 7:
> "one week is not lifetime sobriety. But it matters enormously because you've now proven something. You can survive without alcohol." — [15:25]
> "Quitting drinking was only the doorway. Recovery is what happens after you walk through it." — [15:46]

Safety point he leads with, which most creator content omits:
> "Alcohol withdrawal can be dangerous. For some people, especially heavy daily drinkers, withdrawal can cause seizures, hallucinations, delirium tremens, and these can be life-threatening... Don't white-knuckle something dangerous out of pride or ignorance." — [2:55]

Commercial note: pitches a paid "90-day sobriety survivable kit" at [18:16].

---

### T16 — week by week off cigarettes at 25 years, with a patch
**Troy, "Second Wind - Midlife Edition"** · *I Quit Smoking After 25 Years | 30 Day Reality Check* · <https://www.youtube.com/watch?v=ztUtNn7hKQg> · uploaded (see meta) · cigarettes · **stage: 30 days**

Week 1:
> "Week one was a complete shock to the system. Irritability, headaches, mood swings. There was also this strange empty feeling. And what do I do with all the time that I used to use smoking?" — [1:25]
> "The win here was simple. I didn't quit quitting. I played it moment by moment and craving by craving." — [1:47]

Week 2 — negotiation:
> "Week two was dangerous. That's when my brain started negotiating. My brain was saying, 'Okay, okay, you prove your point, Troy. Now, just have one cigarette. Come on. Come on. Just one.' I'm convinced now that that little voice right there is responsible for the majority of relapses." — [1:47]

Week 3 — shift:
> "Around week three, something shifted. I was still aware of the triggers, but they weren't controlling me, not like they were before." — [2:32]
> "I'd catch myself realizing I'd gone hours without even thinking about having a cigarette, followed by a craving, of course, simply because I thought about smoking. Yeah, apparently that's one of my triggers, just thinking about it." — [3:14]

Day 30:
> "At 30 days, the physical cravings are much, much quieter. Not completely gone, but much quieter. However, those mental habits, they are still loud. My biggest triggers weren't stress or parties. They were boring everyday moments like finishing a meal, driving, stepping outside for a minute." — [4:17]

On the patch, specifically what it did and didn't do:
> "the patch didn't make the cravings disappear, but it did numb the edge just enough so I could think clearly instead of reacting. It was a plan I could trust when my brain was loud." — [1:04]

---

### T17 — six years, and every mainstream tip inverted
**Leon Sylvester, "Sober Leon"** · *When Quitting Alcohol, DO NOT Do These 6 Things* · <https://www.youtube.com/watch?v=PNgkKdPgY7o> · uploaded 2024-07-21 · alcohol · **stage: ~6 years** `[auto]`

Included because it directly contradicts most of the rest of the corpus — see the contradictions table below. Heavy commercial context: he sells the Sober Clear program and pitches it at [0:41].

Don't announce it:
> "if you've made promises to people that you love and you've let them down this time don't make a big deal out of your decision to not drink because here's the thing if you've let people down in the past they don't want to hear it nobody cares" — [1:23]
> "when I stopped drinking alcohol I told one person... I didn't tell my family I asked nobody for support" — [2:06]

Don't count:
> "don't stop drinking for a period of time don't stop for 30 days for 60 days for 90 days because what do you think will happen once you hit day 30 well what you've done is you spent 30 days resisting resisting resisting resisting so by the end of the stretch is you've got alcohol so high on a pedestal that when you actually drink it's like I can't wait" — [8:20]
> "I have no idea what date I stopped drinking alcohol" — [8:42]

Don't avoid drinkers:
> "if you do avoid it what are you subc communicating well you're subc communicating that you don't fully trust yourself because you still see something to gain from drinking alcohol" — [5:54]

But — the pain fades, and that is the risk:
> "the pain will eventually go away... it might take a few weeks it might take a few months but eventually the source of pain will be gone and everything will have leveled out you'll actually feel pretty good and it's so easy to forget this" — [2:47]
> "don't forget the pain write it down put it in a journal keep it somewhere where you can see it" — [3:48]

And on external motivation:
> "they're like Leon I'm ready to do this because my wife's going to kick me out of the house and I say to them is that it is that your only reason... what's going to happen once your wife is Off Your Case" — [3:07]

---

### T18 — days 14–20, the second wave nobody schedules for
**"Dr Frank," Addiction Mindset** · *4 Mistakes I Made Quitting Vaping! (Avoid These)* · <https://www.youtube.com/watch?v=N4BEo4JPOr4> · uploaded 2023-10-29 · nicotine · **stage: multi-year** `[auto]`

The single most operationally useful timing detail in the corpus:

> "the other time frame that throws a lot of people off is at the two week hump it's somewhere between days 14 to 20 where your body starts to detox the byproducts of nicotine which is cotinine and as this byproduct of nicotine detoxes a lot of people wind up going through a second wave of withdrawal symptoms and this threw me off time and time again cuz I would quit I would get through the first 3 to 5 days I would feel pretty good and then suddenly I feel like I went completely backwards around days 14 to 20" — [1:01]

> "those time frames days 3 to 5 and days 14 to 20 are very common points of relapse because people don't know what to expect" — [1:46]

But he also warns against over-trusting timelines, including his own — see B7.

Commercial context is heavy: coaching, a $497/mo group, and a branded gum supplement, pitched at [0:00] and [7:12].

---

### T19 — five years out, on the expectation that broke earlier attempts
**"Dr Frank," Addiction Mindset** · *i wish i knew this \*before\* i quit smoking weed...* · <https://www.youtube.com/watch?v=jS75B09D8us> · uploaded 2022-08-02 · cannabis · **stage: 5 years** `[auto]`

> "the first thing I wish I had learned or knew going into quitting weed was that trying to reason with addiction is nearly impossible" — [0:21]

> "when I would sit there day to day and say just one more smoke only on the weekends only on special occasions after this event I'll quit after this thing I'll quit I was trying to reason with addiction and it's almost impossible to try and reason with something that is relentlessly unreasonable" — [1:05]

The expectation that was wrong:
> "the expectation that I had with quitting was that I was going to quit and I think I was under the assumption that I was going to have mostly pain-free days days were days where struggling was at a minimum and realizing now five years sober that that's not the case I still have days that are extremely challenging I still have some anxiety I still have days where I have depression" — [4:00]

On the first year specifically:
> "especially after I got to that first year of sobriety that year was pretty choppy but beyond that it's been better" — [5:29]

---

### T20 — PAWS, and the comparison trap
**Gill Tietz, "Sober Powered"** · *Post-Acute Withdrawal Syndrome (PAWS) After Quitting Drinking: 8 Tips to Cope* · <https://www.youtube.com/watch?v=3ZNEvyUCzMM> · uploaded 2024-08-30 · alcohol · **stage: multi-year** `[auto]`

She is a biochemist and a recovered heavy drinker; this is the most epistemically careful channel in the corpus.

On the two shapes early sobriety takes:
> "some people quit drinking and it's great right from the start things improve over time and they live a great sober life other people quit drinking and they feel worse in the beginning and then it slowly improves over time both are normal and fine" — [0:42]

On comparison, with her own numbers on the table:
> "I saw a post online recently about a person who was talking about their heavy drinking at 15 drinks a week my goal for moderation was drinking 30 drinks a week and I couldn't even achieve that so if I'm comparing my early sobriety to someone who drank less than half of what I was drinking then I'm going to feel like my journey sucks" — [1:05]

On anhedonia as the specific mechanism that makes month 2–6 dangerous:
> "anhedonia or the inability to feel pleasure is a Hallmark symptom of pause... your dopamine system has become thrown off from how rewarding alcohol is so Natural Rewards don't make a dent... so you might feel bored apathetic depressed like nothing matters but this will go away" — [6:33]
> "this symptom specifically can make sobriety really difficult because nothing feels worth it to you but you know that alcohol will temporarily make you happy" — [6:55]

And — unusually for this genre — she argues against over-using her own concept:
> "I see a lot of people in very early sobriety constantly worrying about whether or not their symptoms are paw and then they get wrapped up in researching this and it becomes an excuse for relapse" — [10:15]
> "if all of your symptoms are pause then you have a tangible thing that can be weighted out and used as an excuse" — [13:51]

Expectation-setting:
> "it's not going to be unicorns and rainbows and sparkles" — [12:24]
> "it's not constant misery for 6 to 18 months" — [9:08]

---

### T21 — quitting porn, and the "do nothing" response to urges
**QuitByHealing** · *How to Deal With Urges (my strategy to never relapse)* · <https://www.youtube.com/watch?v=Dgvg8Je9Jdk> · uploaded 2023-09-03 · pornography · **stage: recovered, years**

Narrated as a specific incident on a specific walk home, then again in bed that night.

> "when I notice sexual thoughts appear in my mind, I don't respond to them. I don't try to push them away, I don't judge them, I don't worry about what's going to happen next. I treat them like any other random thought that pops into my mind. The thought appears and I do nothing." — [1:23]

> "the urge fades after maybe a minute or two and by the time I get home, my mind has already moved on to the next random thing" — [2:07]

Why he thinks fighting fails:
> "If you try to fight a thought, a feeling, or an urge, what happens? It persists. Try to fight it and it sticks around. Try to suppress it and you get more of it." — [3:32]

> "When you worry and stress about these thoughts, when you judge them as something negative, it's like you're feeding them with your attention and your energy and they grow stronger and stronger." — [4:35]

The generalisation:
> "you are addicted because you always want to feel good and you always want to avoid feeling bad. If you truly develop the ability to feel just how you're feeling right now without wanting to change it, where can addiction get its hooks into you?" — [7:01]

Commercial context: sells a 21-day course, pitched at [3:32].

---

### T22 — porn, and the argument for deciding rather than resisting
**Seb Jones** · *NoFap | Quitting P\*rn Forever Was The Best Decision of My Life (My Story)* · <https://www.youtube.com/watch?v=MtuapWlDcNE> · uploaded 2023-06-02 · pornography · **stage: years** `[auto]`

Unusually candid about having enjoyed it:
> "I actually really enjoyed the Bliss the Ecstasy and the escapism during this period of my life I actually really enjoyed it right it was so good that for a while I'd actually take it over a good life or over feeling normal and healthy" — [2:55]

On the planning intelligence addiction produced:
> "I would have a kind of schedule I'd save myself good images good videos for the future I'd consider Windows of opportunity to use I'd be tactical about how I'm gonna fit this in if I'm traveling" — [1:50]

His resolution of the "forever" problem — same shape as struthless and Second Act Recovery:
> "stop thinking about this forever thing and become really present and then just win the battles that come up in the moment because battles man they never occur in the future they only occur now" — [6:29]

On why he thinks decision beats willpower:
> "when it's an option it's hard you know we've got a choice to make but when you decide and commit like how I'm describing here there's no struggle because it's not an option it's not what you do and it's not who you are" — [9:17]

Non-judgemental about people who aren't ready — rare in NoFap content:
> "don't feel bad if you've got plenty more karma to burn through okay don't worry if you need to stay asleep for a few more years cool man respect that" — [12:08]
> "I would not be here saying any of this saying any of this if I hadn't relapsed dozens and dozens of times" — [12:29]

Note the register: "higher self" / "lower ego voice" framing throughout, and he sells coaching at [13:15].

---

### T23 — the clinician's 30-day map, with the patient-facing script
**Dr Anna Lembke, on Andrew Huberman** · *Understanding & Treating Addiction* · Huberman Lab · <https://www.youtube.com/watch?v=p3JLaF_4Tz8> · uploaded 2021 · general/dopamine · **stage: clinician, not personal account**

Included as the clinical baseline the creator accounts are measured against, not as a testimonial. Lembke is describing what she tells patients.

> "what I say to patients, and it's a really important piece of this intervention, is that you will feel worse before you feel better." — [52:19]

> "I say usually, in my clinical experience, you'll feel worse for two weeks, but if you can make it through those first two weeks, the sun will start to come out in week three. And by week four, most people are feeling a whole lot better than they were before they stopped using their substance." — [52:39]

On the 4-week depression finding she cites:
> "after four weeks, 80% of them no longer met criteria for major depression" — [50:58]

Huberman characterises the first ten days:
> "days one through 10, I would imagine will be very uncomfortable... Anxiety, trouble sleeping, physical agitation." — [51:40]

**Note the conflict**: Lembke's "week three, sun comes out" is markedly faster than the lived accounts — Goal Guys reports six months to any meaningful change; Ian Callaghan reports sleep only fixing at month four to five; Dorian Develops reports two to three months. Lembke is describing her clinical caseload for a 30-day dopamine fast; the creators are describing multi-year heavy use. Do not treat these as the same claim.

---

### T24 — nicotine withdrawal is a thirst signal, not a want
**McCall Mirabella**, same video as T4 · <https://www.youtube.com/watch?v=IluaaGVtJFU> `[auto]`

Separated out because it is the best phenomenological description of craving in the corpus and is reusable independently:

> "when explaining the feeling of withdrawal to people who have never experienced it it's similar to this think of a time when you have been very dehydrated and your brain is sending you these messages water water you need water it's telling you that you need it when i quit vaping my brain were sending me these signals we need it" — [8:44]

> "it wasn't this feeling of oh i really want nicotine because i was addicted my brain was saying you need it" — [9:04]

---

## UNVERIFIED — no transcript retrieved

Recorded here for completeness. No quotation marks used; nothing below is quoted or characterised beyond its title.

- Your Mate Tom — I quit smoking weed 180 days ago.. Here's what I've noticed so far — <https://www.youtube.com/watch?v=ZFwsggWH-Xs> — metadata extraction failed twice
- Sober Leon — 8 Things To Expect When You Quit Drinking Alcohol — <https://www.youtube.com/watch?v=cOLyemr0ZuY> — no caption track exposed

### Channels named in the brief that I could not verify as sobriety sources

- **"Simple Sober Life"** — the channel at `youtube.com/@simplesoberlife` (777 subs) is an **India travel and lifestyle channel** (Lalbagh Flower Show, Mysuru day trips, Bengaluru apartment tours). It is not a sobriety channel. If a sobriety creator by that name exists, it is under a different handle and I did not find it.
- **"Sober Ollie"** — `youtube.com/@soberollie` returned no channel. No sobriety creator by that name surfaced in 35 search queries.
- **"One Year No Beer"** — no channel page at the obvious handle. The brand exists but did not surface as a YouTube long-form source in discovery.
- **Mark Manson** — one video retrieved (*I Quit Drinking Alcohol... But Did Not Expect This*, <https://www.youtube.com/watch?v=tOuUgGWLYa0>) but not read in full, so nothing is quoted from it.
- **Sober Powered, Chris Williamson / Modern Wisdom, Diary of a CEO, Huberman/Lembke, Allen Carr** — all verified and represented above (Sober Powered T20, Lembke T23, Allen Carr T7/T10). DOAC's Russell Brand and Rich Roll episodes were retrieved (18k+ words each) but not read in full; nothing is quoted from them.

---

# (B) Techniques people credit

Named in the speaker's own words where possible. "Recurrence" counts distinct speakers in this corpus who independently describe the same move.

---

### B1 — "I will not drink with you today" / just make it till tomorrow
**What a person literally does:** refuses to commit to forever. Sets the unit of commitment at one day, explicitly, and re-sets it each morning.

**Recurrence: 6** — struthless, Second Act Recovery, Ian Callaghan, Seb Jones, McCall Mirabella, Ask Charlie.

> "You don't have to go 5 years sober right now. You just got to make it till tomorrow." — struthless [18:30]

> "nobody can emotionally tolerate forever." — Second Act Recovery [7:44]

> "the thing about addiction is that you have to say no every day every day you have to commit to stay off of it" — McCall Mirabella [7:00]

> "stop thinking about this forever thing and become really present and then just win the battles that come up in the moment" — Seb Jones [6:29]

> "If you're thinking about quitting, stop thinking. Just stop for today. Then do it again tomorrow. That's it. That's the game." — Ian Callaghan [5:27]

**BACKFIRE:** struthless names the failure mode — wanting the badge rather than the day. "I really just wanted that badge. I wanted to be able to say, 'I'm 10 years sober.'... there was something so much more dignified about that than saying I'm 3 days sober." [18:30]

---

### B2 — Replacement over removal
**What a person literally does:** installs a specific, scheduled, physically demanding activity into the exact slot the substance occupied — before quitting, not after.

**Recurrence: 6** — struthless, Jordan Welch, McCall Mirabella, Second Wind, Sober Leon, Ana Wallace Johnson (negative case).

> "it's the idea that you aren't just removing the drugs or you aren't just removing the alcohol and just having a cavity in your life that you stare at longingly while you cried. No, it's about replacing it." — struthless [19:12]

The concrete instance, which is oddly specific:
> "The actual thing that worked from the very last time that I was hung over was running. And the cool thing about running being a replacement is obviously you get the endorphins... but it also helped me sleep." — struthless [20:16]

Same move, independently:
> "running more specifically manic runs between 1 and 4 a.m." — McCall Mirabella [7:41]

Second Wind's variant is the strongest operational version, because it is *pre-scheduled*:
> "During weeks three and four, we had planned family adventures on the calendar. Yeah. Before I even quit... The important thing to know is that these weren't rewards like not rewards I had to earn. They were anchors, something to look forward to... Plan experiences, not just the quit." — [3:35]

> "I knew to stay sober I needed to stay busy" — Jordan Welch [10:10]

**BACKFIRE — this is where substitution goes wrong.** McCall Mirabella acknowledges her own running was unsafe: *"running alone at night can be super dangerous especially if you're wearing headphones so I do not recommend this as a coping mechanism but it was one of mine"* [8:44]. And Ana Wallace Johnson reports the void simply refilling: *"I have kind of replaced that drinking time frame with other sort of addiction like my phone is a big one"* [16:10]. See B12.

---

### B3 — Remove access; make it a mission to relapse
**What a person literally does:** physically eliminates supply and paraphernalia from the home, including redundant items.

**Recurrence: 3** — struthless, Jordan Welch, McCall Mirabella (partial: handed her vape to a friend).

> "I took all the alcohol and drugs out of my house. I don't even know why they were there. I do know why they were there. And I gave them to my friends." — struthless [10:02]

The reasoning, which is about attention not availability:
> "access is such a demon. If you can reach for it, you're going to do it, you know? And even if you can't, you are going to waste so much mental energy being like, I shouldn't do it. I shouldn't do it." — struthless [10:25]

Jordan Welch's version goes further than necessary on purpose:
> "The first thing I did was literally get rid of everything I own to smoke with all my weeds papers blunts Grinders trays I even threw away every lighter in my house that way if I wanted to smoke it was really going to be a mission to do it" — [8:04]

**BACKFIRE / direct contradiction:** Sober Leon argues the opposite — that avoidance signals distrust of yourself and prolongs the problem. See the contradictions table.

---

### B4 — Do nothing: let the urge arrive and pass without responding
**What a person literally does:** on noticing an urge, does not distract, does not suppress, does not argue with it. Directs attention to the physical sensation and waits, typically 1–2 minutes.

**Recurrence: 3** — QuitByHealing (explicit method), Sober Powered (adjacent), Second Wind (craving-by-craving framing).

> "The thought appears and I do nothing." — QuitByHealing [1:23]
> "I pay attention to the feelings, I feel them, but that's it. I don't try to push them away and I don't try to hold on to them." — [1:45]
> "the urge fades after maybe a minute or two" — [2:07]

Four named components, in his words: "no fighting" [3:32], "no judging" [4:14], "no clinging" [5:14], "stay present with the feelings" [5:34].

Transfer practice, which is the genuinely novel part — rehearsing non-response on *unrelated* urges:
> "you can also practice this same thing in other ways. For example, by fasting, taking ice baths, doing one more set in a difficult workout, or getting up in the morning, getting out of bed as soon as the alarm rings." — [8:25]

> "Being hungry doesn't mean you have to eat right now. Being cold doesn't mean you have to get out of water right now." — [9:10]

**Tension with B2:** distraction/replacement and non-response are opposite instructions for the same moment. Sober Leon's timeline video endorses distraction — *"when they do appear dist rting yourself with something else is a strategy that's been shown to work"* [9:04]. QuitByHealing explicitly rejects it. Unresolved in this corpus.

---

### B5 — Write down the pain and keep it visible
**What a person literally does:** records the state they were in at the moment of quitting, in a journal or somewhere physically visible, specifically because that memory will fade.

**Recurrence: 3** — Sober Leon, Second Wind, Sober Powered (pattern-tracking variant).

> "don't forget the pain write it down put it in a journal keep it somewhere where you can see it don't forget the pain" — Sober Leon [3:48]

The mechanism he names is the important part:
> "the pain will eventually go away... it might take a few weeks it might take a few months but eventually the source of pain will be gone and everything will have leveled out you'll actually feel pretty good and it's so easy to forget this so easy" — [2:47]

Second Act Recovery describes the same decay from the clinical side, but faster — day four:
> "as physical discomfort begins to improve, honesty uncovered by the pain begins to fade. The brutal honesty that you got sober for good reasons starts slipping away." — [10:19]

Second Wind's version is rehearsal rather than recording:
> "By week two, I had rehearsed my why enough times during previous cravings that I had a good handle on it. Repetition matters" — [2:32]

Sober Powered's is behavioural:
> "if you're experiencing a lot of uncomfortable symptoms it could be helpful for you to track it in a journal or in an app... you might notice that they are triggered by work stress certain people or places" — [20:45]

---

### B6 — Reframe the substance as poison, not as a treat forgone
**What a person literally does:** deliberately rebuilds the belief that the substance offers nothing, so that abstaining is not experienced as sacrifice.

**Recurrence: 5** — struthless, Sober Leon, Goal Guys, Chris Skoyles (via Allen Carr), Ian Callaghan.

> "The stick for me, particularly with alcohol, was seeing it as literal poison, which is exactly what it is." — struthless [15:40]

> "if you see Al alcohol as something that adds nothing to your life you see it as ethanol you see it as a poison you see it with as much disgust as somebody drinking a pint of bleach if you see it that way why would you ever need to avoid it" — Sober Leon [5:54]

Chris Skoyles's account of what the Allen Carr book actually installed:
> "to not look at quitting smoking is making a sacrifice but to look at it as that you gaining all the health wealth freedom and happiness" — [9:52]
> "the only stress that a cigarette relieves our alleviates is caused by the last cigarette" — [20:56]

**BACKFIRE — the reframe alone does not hold.** Skoyles is the direct evidence: he absorbed the reframe fully, quit, and relapsed within one to two weeks, three separate times [5:52], [8:14]. His verdict: *"use it as a tool and not a miracle cure"* [28:16]. Ask Charlie's history is the same shape — the Allen Carr clinic at 23 worked "for a few weeks" [2:11], and for her the reframe only held after unrelated trauma therapy. **The reframe appears to be necessary-not-sufficient, and its failure mode is a euphoric quit that collapses on the first ordinary stressor.**

---

### B7 — Learn the timeline — but hold it loosely
**What a person literally does:** learns the specific days on which withdrawal spikes, and schedules low-demand time around them.

**Recurrence: 4** — Addiction Mindset (explicit), Second Act Recovery, Sober Powered, Anna Lembke.

The scheduling move:
> "a lot of times we'll recommend quitting on like let's say say a Wednesday morning or a Wednesday night if you don't have work Saturday and Sunday throughout the course of the weekend you can take that time to be home or go to the sauna go to the gym" — Addiction Mindset [0:41]

Known spike windows, nicotine: **days 3–5** (acute peak) and **days 14–20** (cotinine second wave) — Addiction Mindset [1:01], [1:46].

**And the counter-instruction from the same speaker, in the same video** — one of the most self-aware things in the corpus:
> "mistake number three that I would recommend avoiding is falling for timelines" — [3:36]
> "if your journey doesn't wind up looking exactly like M did or exactly like that person's timeline on Reddit did you're going to be going through this and you're going to say gosh I I don't know why I don't feel better yet... and then that addicted voice in your brain is going to manipulate you into thinking that you're unique" — [3:57]
> "so in the first 90 days I would highly recommend adopting The Motto it is what it is" — [5:01]

Sober Powered independently names the comparison version of the same failure [1:05].

**Product implication:** a timeline feature that shows *the median* is actively harmful; one that shows a *range* plus "this is normal, yours will differ" is the version these accounts support.

---

### B8 — One goal only: do not take on the world
**What a person literally does:** deliberately declines to start other self-improvement projects during the first 90 days.

**Recurrence: 2 explicit, 1 counter-example.**

> "don't quit and try and take on the world a lot of people will quit using nicotine and they'll decide this is a point in which they want to revamp their whole life they're going to go to the gym six days a week... now is not the time to try and take on the world you have one goal to stick to and that goal is not consuming nicotine" — Addiction Mindset [5:01]

> "Day one is not about fixing your life. It's not about figuring out the future, and it's not about the first 90 days. It's not about forever. Day one has job one. Don't drink." — Second Act Recovery [6:18]

**Counter-example:** Goal Guys quit alcohol *as a side effect* of the 75 Hard challenge — two workouts a day, strict diet, no alcohol, all at once [3:23] — and it held for a year. Bundling worked for him. Note his baseline was 7–14 drinks/week, i.e. much lighter than the dependent drinkers in this corpus.

---

### B9 — Don't trade one substance for another
**What a person literally does:** watches for compensatory intake, and in some cases pre-emptively cuts a second substance.

**Recurrence: 3** — Addiction Mindset, McCall Mirabella (as an unwanted outcome), Ana Wallace Johnson (as an unwanted outcome).

> "the point in quitting is to feel good so the last thing you want to do is quit vaping eat a bunch of sugar drink a bunch of alcohol or smoke a ton of weed and then wind up feeling bad from doing those things" — Addiction Mindset [2:30]

The self-defeating loop he names:
> "the person quits vaping they wind up doing those other activities trading one addiction for another they still feel bad and they eventually say well wait a minute I've quit for like 10 20 30 days and I don't feel any better... and then they say there was no point in quitting" — [2:30]

His own pre-emptive cut:
> "when I made the decision to finally put nicotine down for good I had to cut out alcohol for minimally 30 60 something days because every time I drank I would always find myself going to buy nicotine again" — [3:12]

Lived instance of the failure:
> "I was also trying to satisfy the feeling of cravings with food with takeout food more specifically I've probably had more fast food in the past four months than I have in my whole lifetime" — McCall Mirabella [9:25]

Also: Ask Charlie names replacement as her own historical failure mode — *"it also talks about not replacing it with anything else because that had always been my problem. I would replace it with gum. I would replace it with chocolate."* [18:41]

---

### B10 — Convert the decision into an identity, and make it binary
**What a person literally does:** stops framing the goal as "not drinking" and frames it as "I am a person who does not drink," then declines to re-litigate.

**Recurrence: 5** — Kevin O'Hara, Seb Jones, Sober Leon, struthless, Dorian Develops.

> "This is a decision. It's not a battle... I made a decision, one single decision, and then I built my life around that decision." — Kevin O'Hara [8:48]

> "when you decide and commit like how I'm describing here there's no struggle because it's not an option it's not what you do and it's not who you are" — Seb Jones [9:17]

> "when you see it as something in the past you're not trying to not drink it's just like okay here's the cutoff point i'm a non-drinker i'm done" — Sober Leon [13:13]

Dorian Develops's version is arrived at reluctantly and is the most honest form of it:
> "I know that I am un able to just be the person who smokes in the evenings or the person who smokes on the weekends because I've been addicted to it for so long... I'm finally starting to understand when addicts say like they just can't do it and I finally have realized that I am like that" — [1:25]

---

### B11 — Moderation is the trap, not the goal
**What a person literally does:** explicitly forecloses "just one," on the grounds that entertaining the idea is itself the relapse mechanism.

**Recurrence: 7** — Sober Leon, Kevin O'Hara, struthless, Jordan Welch, Noah Thomas, Dorian Develops, Honest Ramble. **The single most recurrent claim in the corpus.**

> "there is no such thing as having just one drink" / "I have never had one drink in my life ever" — Sober Leon [4:52], [5:12]

> "moderation is a battle that you're going to see. You're going to have to cyclical moderation. So, you moderate and then you stop moderating and then you moderate again" — Kevin O'Hara [9:48]

> "I don't do moderation very well." — struthless [5:20] *and*, independently, Honest Ramble [9:08]

The most precise description of the trap mechanism — the *absence* of consequence being the danger:
> "the big problem is the next day if you've had a prolonged period of time without drinking you wake up and then life's the same no major problems have happened... so what do you think happens well I can do it again" — Sober Leon [5:12]

Jordan Welch is the lived proof at exactly this point [4:55], and Noah Thomas is the lived proof at one year [7:34].

**BACKFIRE / dissent:** Goal Guys ends the year at deliberate moderation (~7 drinks/year) and reports it working [12:19]. Sober Powered's framing implies a spectrum of drinkers with different needs [0:42]. Honest Ramble is *tempted* by moderation and refuses on self-knowledge grounds, not principle [20:40]. **The abstinence consensus here is strong but is drawn from a self-selected population of people for whom moderation already failed. It is not evidence that moderation fails for everyone.**

---

### B12 — Alcohol-free substitutes: contested
**What a person literally does:** either uses NA beer/mocktails as a social prop, or refuses to.

**Recurrence: 2, in direct opposition.**

For — Honest Ramble uses them and names their limit:
> "I have been having the odd alcohol-free beer. Um there's a Wingman Zero that I like. That's from BrewDog. And Guinness Zero is a decent drop." — [11:37]
> "I can't sup alcohol-free beer for that length of time, whereas I could with a lager here and there." — [12:20]

Against — Sober Leon, on identity grounds:
> "by buying the alcohol-free drink i'm basically saying that what they're doing is normal but it's not normal what i'm doing is normal by not drinking" — [11:48]

Note he exempts tonic water and mocktails; his objection is specifically to alcohol-*mimicking* products [12:09].

McCall Mirabella's nicotine analogue, used briefly and then dropped:
> "no nicotine no tobacco cigarettes they gave me a weak variation of when you hit nicotine but it was something and it was something for my mouth to do and my throat to feel i went through one pack and then i did not continue using them" — [7:41]

---

### B13 — Get skin in the game: build something that a relapse would cost you
**What a person literally does:** deliberately accumulates visible progress in unrelated domains so that relapse has a price beyond the drink itself.

**Recurrence: 3** — Sober Leon, Jordan Welch, Kevin O'Hara.

> "imagine there's an individual he's not drunk for three years he's changed nothing about him he's got the same job the same relationship he's not gone to the gym... and now he goes to an event everyone's drinking and he's like ah do you know what who cares doesn't make much difference anyway" — Sober Leon [13:55]

> "these people are moving forward every day they've got skin in the game they're building things they're making their life better every single day so when this person is now three years into the future and... something bad happens they've got so much to lose" — [14:37]

Jordan Welch's is the involuntary version — the business, the channel, and the pride became the stake [5:37], [12:36].

---

### B14 — Congratulate yourself out loud after each survived event
**What a person literally does:** after the first birthday, first wedding, first Christmas sober, deliberately marks it rather than letting it pass.

**Recurrence: 2** — struthless (explicit), McCall Mirabella (spontaneous).

> "if you don't celebrate yourself and celebrate how far you've come, it's uh very unlikely to stick. You got to positively reinforce." — struthless [20:58]

> "my birthday was a few weeks after that very brutal, shameful hangover. And I remember looking at my reflection in the mirror afterwards and being like, 'Dude, dude, you made it. You made it through your own birthday.'" — [21:18]

> "wow i'm so proud of myself i would have never believed it if you told me i've quit nicotine hitting 100 days was so special" — McCall Mirabella [10:47]

---

### B15 — Reveal / conceal the quit: contested, no consensus
**Recurrence: 5, split.**

Conceal — Sober Leon [1:23], [2:06], on the grounds that prior broken promises have exhausted others' patience.

Reveal — Second Act Recovery, on the grounds that isolation is the risk:
> "Addiction thrives in secrecy and isolation. Recovery moves in the opposite direction, toward connection, toward people." — [17:32]

Reveal — Ian Callaghan:
> "find one person who gets it. Friend, sponsor, a brutally honest [ ] mate." — [4:43]

Reveal-with-caveat — McCall Mirabella went fully public, and reports that support was genuinely mixed: some friends helped, others actively sabotaged [6:18].

Reveal — Jordan Welch credits an accountability partner [11:34]. Honest Ramble credits his wife's explicit support message, shown on camera [11:17].

**Note the asymmetry:** the only voice for concealment is the one selling a program built around not needing meetings or support groups. Weight accordingly.

---

### B16 — Deal with the underlying thing first, or the quit won't hold
**Recurrence: 4** — Ask Charlie (strongest), Dorian Develops, Addiction Mindset, Ian Callaghan.

Ask Charlie is the fullest case: repeated failure across the Allen Carr clinic, hypnotherapy, and general therapy, then targeted work on her childhood and her father, then a quit that held [13:29], [14:10].

> "most people who suffer from i think addiction have some pain that they're trying to escape from and what I failed to realize was that by further pursuing my cannabis addiction trying to escape the pain I was actually creating a significant amount more of pain for myself" — Addiction Mindset [3:37]

> "for most of my life I think that I was self-medicating to help myself with the trauma" — Dorian Develops [3:11]

> "you remember why you drank in the first place... Now you need better tools. Exercise, honest conversations, sitting with discomfort, therapy if you need it. All harder than drinking, but actually they're all effective." — Ian Callaghan [2:54]

**Counter-pressure from B8:** "deal with the trauma first" and "one goal only for 90 days" are in tension. Ask Charlie's sequence resolves it — she did the therapy *before* the quit attempt, not during it.

---

### B17 — Structure the empty hours, explicitly and in writing
**Recurrence: 4** — Second Act Recovery, Sober Powered, Jordan Welch, Ian Callaghan (as the diagnosis).

> "structure matters. Plan the day. Fill the hours. Give yourself things to do. Don't know what to do? Sit down and write a list of things to do. Don't sit passively and wait for craving to find you." — Second Act Recovery [9:10]

> "At the end of your schedule of activities for the day should be going to bed. Schedule a time and stick to it." — [9:32]

> "develop a consistent routine establishing a consistent daily routine is essential... structure and routine are critical for people in recovery because it reduces stress increases predictability" — Sober Powered [14:35]

The problem being solved, named by three speakers independently: boredom is under-warned-about relative to craving. Ian Callaghan [0:22]; Jordan Welch [9:49]; Honest Ramble [19:14].

---

### B18 — Track something physical, daily
**Recurrence: 3** — Second Act Recovery, struthless, Sober Leon.

> "I tracked my weight each morning. It was simple, and it gave me proof that not drinking was changing my body" — Second Act Recovery [12:09]

> "I just typed sober into the app store. I saw one called I am sober. So, I downloaded that... it could calculate from the day that you would put in obviously how many days you've been clean, but also how much money you'd save... And it was really cool to see things tick up." — struthless [12:08]

> "If you are planning to stop drinking I strongly encourage you to monitor your vitals as you detox especially the first few weeks" — Sober Leon [5:35]

**Direct contradiction:** the same Sober Leon argues elsewhere against counting days at all [8:20], [8:42]. He endorses tracking *physiology* and rejects tracking *streak*. That distinction is probably the useful synthesis, and it matches the quit-vice module's existing no-streak-counter verdict.

---

## Cross-testimony contradictions

These are load-bearing. Any product built on this corpus has to pick a side or expose the choice to the user.

| Question | Position A | Position B |
|---|---|---|
| Count days? | Yes — visible tick-up motivates (struthless [12:08]; Second Act Recovery day-milestones; McCall Mirabella's day-100) | No — counting builds a pedestal and a cliff (Sober Leon [8:20]) |
| Tell people? | Yes — isolation is the risk (Second Act Recovery [17:32]; Ian Callaghan [4:43]) | No — you've broken promises before (Sober Leon [1:23]) |
| Avoid drinkers/bars? | Yes early on (Jordan Welch [8:26]; Second Act Recovery [17:32]) | No — avoidance signals you still want it (Sober Leon [5:54]) |
| Time-boxed challenge (Dry January, 30 days)? | It's how I started (Ana Wallace Johnson [5:36]; Honest Ramble [1:04]; Goal Guys via 75 Hard [3:23]) | It guarantees the rebound (Sober Leon [8:20]); and Ana's own three attempts all failed [6:18] |
| Distract from urges, or sit with them? | Distract (Sober Leon [9:04]; Second Act Recovery [7:21]) | Do nothing, don't distract (QuitByHealing [1:23]) |
| Alcohol-free substitutes? | Useful prop (Honest Ramble [11:37]) | Prolongs the illusion (Sober Leon [11:48]) |
| Moderation possible? | Yes, after reset (Goal Guys [12:19]) | No, never (7 speakers — see B11) |
| When do you feel better? | Week 3–4 (Lembke [52:39]) | Month 4–6 (Ian Callaghan [1:04]; Goal Guys [8:48]); 2–3 months (Dorian Develops [0:41]) |

---

## What the medium is uniquely good for — the three findings the brief asked for

### 1. Week-by-week texture

Aggregating only the day/week-indexed claims from first-person accounts (not the science-explainer narration):

- **Hours 0–24:** momentum from the decision carries you (Second Act Recovery [3:43]). Shakes and crying can start within ten hours (McCall Mirabella [2:14]).
- **Day 2:** harder than day 1, because the adrenaline has gone (Second Act Recovery [6:38]).
- **Days 3–5:** acute peak for nicotine (Addiction Mindset [0:41]); discouragement peak for alcohol (Second Act Recovery [8:26]); "I really feel like I'm about to cave" (McCall Mirabella [3:05]).
- **Day 4:** first improvement — **and therefore the first negotiation window.** "Maybe the drinking wasn't that bad" (Second Act Recovery [9:32]). This is the least-anticipated hazard in the corpus.
- **Day 5–6:** visible physical change begins; motivation begins fading; self-pity arrives (Second Act Recovery [11:46], [12:52], [13:35]).
- **Week 2:** the negotiating voice becomes explicit — "just one cigarette. Come on. Come on. Just one" (Second Wind [1:47]). Opioid withdrawal *worsens* sharply here (Rieder [2:15]).
- **Days 14–20:** **nicotine second wave** — feeling worse after feeling better, from cotinine clearance. Named as a top relapse window (Addiction Mindset [1:01]).
- **Day ~20:** "days one through twenty were my toughest battle" (McCall Mirabella [7:20]).
- **Week 3:** something shifts; triggers noticed but not obeyed (Second Wind [2:32]). Opioid withdrawal is at its darkest (Rieder [4:00]). Lembke's "sun starts to come out" [52:39].
- **Month 1:** cravings quieter, mental habits still loud; the word for the month is *doubt* (Jordan Welch [8:47]; Second Wind [4:17]).
- **Months 2–3:** "after like 2 or 3 months I finally kind of got over it" (Dorian Develops [0:41]). Anhedonia window — natural rewards still don't register (Sober Powered [6:33]).
- **Month 4–5:** sleep finally normalises (Ian Callaghan [1:04]).
- **Month 6:** **the honest-reckoning point.** "That's why I drank" (Ian Callaghan [2:54]). Focus improvement finally arrives (Goal Guys [9:31]). Six-months-sober-and-on-holiday is also a documented relapse point (Jordan Welch [4:55]).
- **Month 12:** anniversary itself is a named trigger (Noah Thomas [1:30]). Year one "pretty choppy," better after (Addiction Mindset [5:29]).

**The two windows the genre under-warns about: day 4 (improvement→negotiation) and the one-year anniversary.**

### 2. What people wish they had known

- That reasoning with the addictive voice is unwinnable, and time spent doing it is the problem (Addiction Mindset [0:21]).
- That there would still be bad days at five years, and expecting otherwise was itself destabilising (Addiction Mindset [4:00]).
- That the deepest shame is ordinary, not dramatic — so waiting for a catastrophic rock bottom is waiting for nothing (struthless [3:54]; Ian Callaghan [4:43]).
- That the underlying thing has to be addressed or the quit won't hold (Ask Charlie [14:10]).
- That someone would have just said "you don't need it, you're fine as you are" — with no wellness performance attached (Ana Wallace Johnson [3:22], [16:57]).
- That the clarity you get *while using* about needing to stop never converts on its own (Dorian Develops [22:01]).
- That the timeline you read online will not be your timeline (Addiction Mindset [3:57]).
- That it would have been easier than feared: "Why did I think it was going to be harder than it was?" (Kevin O'Hara [11:55]); "don't overestimate the challenge" (Addiction Mindset [6:29]).

### 3. What actually mattered vs what they thought would matter

| Thought would matter | Actually mattered |
|---|---|
| Willpower and white-knuckling | A single decision that closed the question (Kevin O'Hara [8:48]; Seb Jones [9:17]) |
| Cravings | Boredom, and the empty hours (Ian Callaghan [0:22]; Jordan Welch [9:49]; Second Wind [1:25]) |
| A dramatic rock bottom | An ordinary shameful morning (struthless [3:54]); or a blood-pressure reading (Honest Ramble [4:53]) |
| Health benefits arriving fast | Six months of nothing, then focus (Goal Guys [6:39], [9:31]) |
| Better sleep immediately | Worse sleep for four months (Ian Callaghan [1:04]) |
| Losing the fun | Discovering the fun was never in the substance — and separately, genuinely being more boring now (Honest Ramble [18:31] holds both) |
| Friends' support | Some friends actively sabotaged (McCall Mirabella [6:18]); some friendships simply ended (Kevin O'Hara [2:30]; Ian Callaghan [0:42]) |
| The method (book, clinic, hypnosis) | The method changed the mindset but did not sustain the quit (Chris Skoyles [18:43]; Ask Charlie [2:11]) |
| Quitting would fix life | Quitting is the starting line (Ian Callaghan [2:31]; Sober Leon [7:39]; struthless [13:31]) |

---

## Source index — every video quoted above

25 videos are quoted. Section B cites some speakers by name only; this table resolves every one. **Note that "Sober Leon" is three different videos** — check the timestamp against the right one.

| # | Channel | Video | URL | Uploaded |
|---|---|---|---|---|
| 1 | Honest Ramble | No Alcohol for Six Months. The Surprising Dark Side to Getting Sober | <https://www.youtube.com/watch?v=LjGVFLz0voM> | 2026-08-07 |
| 2 | struthless | How I got sober after 15 years of addiction | <https://www.youtube.com/watch?v=rCA2a75YMa8> | 2025-02-03 |
| 3 | bignoknow – Noah Thomas | I RELAPSED AFTER 1 YEAR OF SOBRIETY | <https://www.youtube.com/watch?v=McajqLzeLgk> | 2019-05-08 |
| 4 | McCall Mirabella | 4 Months Quitting Nicotine Documented | <https://www.youtube.com/watch?v=IluaaGVtJFU> | 2022-06-19 |
| 5 | Goal Guys | I quit alcohol for 1 year, here's what actually changed... | <https://www.youtube.com/watch?v=_5kgJY7AEd4> | 2025-04-03 |
| 6 | Kevin O'Hara – Habits V2 | I Quit Drinking 13 Years Ago — Here's What Nobody Tells You | <https://www.youtube.com/watch?v=OA-yK169y2U> | 2026-03-22 |
| 7 | Ask Charlie | How I Finally Quit Smoking After 20 Years | <https://www.youtube.com/watch?v=X4kBUi3d2c8> | 2025-07-01 |
| 8 | Dorian Develops | I quit smoking weed 6 months ago.. | <https://www.youtube.com/watch?v=pGoeG5aY3S0> | 2024-02-14 |
| 9 | Ian Callaghan | 8 Brutal Truths About Quitting Alcohol | <https://www.youtube.com/watch?v=4PO2xbSQXwM> | 2026-02-06 |
| 10 | Chris Skoyles | REVIEW: Allen Carr's Easy Way to Stop Smoking | <https://www.youtube.com/watch?v=gAAhNcbt34s> | 2018-02-04 |
| 11 | TEDx Talks (Travis Rieder) | I was in opioid withdrawal for a month | <https://www.youtube.com/watch?v=HMchXc5lemU> | 2018-10-05 |
| 12 | Ana Wallace Johnson | Why I Got Sober & How it Changed my Life | <https://www.youtube.com/watch?v=n5uFiikf0h0> | 2024-04-21 |
| 13 | Jordan Welch | 365 Days Without Weed: The Best Year Of My Life | <https://www.youtube.com/watch?v=q7FdXgMVSDs> | 2023-09-11 |
| 14 | Spirit Fit Vices | First Drink After a Year of Sobriety (Relapsed) | <https://www.youtube.com/watch?v=hNturY3EQmg> | 2017-12-13 |
| 15 | Second Act Recovery | 7 Days Sober: What's Actually Happening Inside | <https://www.youtube.com/watch?v=64bp946Ya4s> | 2026-06-02 |
| 16 | Second Wind – Midlife Edition | I Quit Smoking After 25 Years \| 30 Day Reality Check | <https://www.youtube.com/watch?v=ztUtNn7hKQg> | 2026-01-05 |
| 17 | **Sober Leon** | When Quitting Alcohol, DO NOT Do These 6 Things | <https://www.youtube.com/watch?v=PNgkKdPgY7o> | 2024-07-21 |
| 18 | **Sober Leon** | 10 Unconventional Tips To Stop Drinking Alcohol | <https://www.youtube.com/watch?v=ccK-96APvMQ> | 2021-09-10 |
| 19 | **Sober Leon** | Quit Drinking Alcohol Timeline Days 0 to 365 | <https://www.youtube.com/watch?v=p7ee0oYJHek> | 2024-10-06 |
| 20 | Addiction Mindset | 4 Mistakes I Made Quitting Vaping! | <https://www.youtube.com/watch?v=N4BEo4JPOr4> | 2023-10-29 |
| 21 | Addiction Mindset | i wish i knew this \*before\* i quit smoking weed... | <https://www.youtube.com/watch?v=jS75B09D8us> | 2022-08-02 |
| 22 | Sober Powered | Post-Acute Withdrawal Syndrome (PAWS) After Quitting Drinking | <https://www.youtube.com/watch?v=3ZNEvyUCzMM> | 2024-08-30 |
| 23 | QuitByHealing | How to Deal With Urges (my strategy to never relapse) | <https://www.youtube.com/watch?v=Dgvg8Je9Jdk> | 2023-09-03 |
| 24 | Seb Jones | NoFap \| Quitting P\*rn Forever Was The Best Decision of My Life | <https://www.youtube.com/watch?v=MtuapWlDcNE> | 2023-06-02 |
| 25 | Andrew Huberman (Dr Anna Lembke) | Understanding & Treating Addiction | <https://www.youtube.com/watch?v=p3JLaF_4Tz8> | 2021-08-16 |

**Section-B quotes attributed to "Sober Leon" by timestamp:** B4 [9:04], B18 [5:35] → #19 (timeline). B6 [5:54], B5 [2:47], [3:48], B11 [4:52], [5:12], B17 [1:23], [2:06], B7-adjacent [8:20], [8:42] → #17 (DO NOT). B10 [13:13], B12 [11:48], [12:09], B13 [13:55], [14:37] → #18 (10 Unconventional Tips).

---

## Quote verification

**No page-fetch or summarisation layer was used anywhere in this pipeline.** `yt-dlp` wrote caption files (`.vtt`) directly to disk; nothing between YouTube and the file could paraphrase, merge or invent. No transcript-aggregator site was consulted, and no quote here came from a description, thumbnail, title, or recollection.

That still leaves one layer that could fabricate: **my own cleaner**. `fetch.sh` dedupes rolling-caption repeats and joins cues into blocks, and a dedupe bug could in principle splice together two things the speaker never said consecutively. So the derived `text/*.txt` is *not* treated as ground truth here. Every quote was checked twice:

**Pass 1 — derived text (`verify.py`).** 219/219 quoted strings matched verbatim (whitespace-, case- and punctuation-normalised). Where a quote contains `...`, every fragment was required to appear **in the same video, in order** — not merely somewhere in the corpus.

**Pass 2 — raw `.vtt` ground truth (`verify_raw4.py`).** Each quote re-checked against the caption files themselves, bypassing my cleaner entirely. Two independent reconstructions per file, because rolling auto-captions repeat each line:
- *stamped-only* — keep only lines carrying inline `<HH:MM:SS.mmm>` word stamps (the new speech; un-stamped lines are the rolling repeat);
- *verbatim-all* — every displayed line concatenated with nothing dropped, then immediate repeated n-gram runs collapsed (`months months months` → `months`).

Every consecutive 7-word window of every fragment had to appear in one of those. **218/219 passed automatically.** The single exception (Honest Ramble, "a little bit is how much I I used to enjoy") was confirmed by hand against `raw/LjGVFLz0voM.en.vtt`, which reads `a little bit is is is how much I how much I how much I I used to enjoy` — the quote is correct; my repeat-collapser was over-collapsing a genuine stutter.

**Attribution.** 219/219 confirmed present in the video they are credited to (`verify_attr.py` for section A; `verify_b.py` plus the prose-line speaker for section B; 0 wrong-speaker results).

**What verification actually caught.** Six defects in my own drafting, all corrected rather than left approximate:
- 5 transcription drifts — e.g. I had written "I'd have a kind of schedule" where the caption reads "I would have a kind of schedule"; "not to look at" where it reads "to not look at"; "for the first 90 days" where it reads "so in the first 90 days".
- 1 unresolvable stutter — Travis Rieder's captions show "The worst" repeated, and rolling captions duplicate lines, so I could not establish whether he said it twice. Quoted once, with the ambiguity flagged inline.

### Residual risk you should still assume

Passing both checks proves a quote **matches the caption file**. It does not prove the caption file matches the audio. These are ASR captions with known errors (see the confidence section: "macaulay arabella" for McCall Mirabella, "Alencar" for Allen Carr). Two consequences:

1. Where a caption is garbled, I have **quoted it as-is rather than silently correcting it** into a fluent sentence the speaker may not have said. Artefacts like Honest Ramble's "a little bit is how much I I used to enjoy", Chris Skoyles's "the only stress that a cigarette relieves our alleviates", and Sober Leon's "subc communicating" are caption noise reproduced verbatim `[sic]`, not my paraphrase.
2. **For any quote that goes into the product, listen to the audio at the cited timestamp first.** Timestamps are given precisely so this is cheap. A caption-verified quote is good enough for research synthesis; it is not good enough to put in a user's face under a real person's name.

Verifier scripts (`verify.py`, `verify_attr.py`, `verify_b.py`, `verify_raw3.py`, `verify_raw4.py`) are in the scratch corpus directory and re-runnable against `raw/` and `text/`.

---

## Reproducing this

```bash
BASE=<scratchpad>/rec
$BASE/discover.sh                        # ytsearch across queries.txt -> candidates.jsonl
cat $BASE/ids1.txt | xargs -P 5 -I{} $BASE/fetch.sh {}   # timestamped transcripts -> text/
```

`fetch.sh` writes `text/<id>.txt` with a metadata header and `[m:ss]` block timestamps every ~18s, and `meta/<id>.json` with title/channel/date/views. It skips already-fetched IDs. Throttled at `--sleep-requests 1.0`, parallelism 5, no rate-limiting encountered across 66 fetches.
