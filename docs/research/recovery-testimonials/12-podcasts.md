# Recovery podcasts — first-person accounts of behaviour change

Collected 2026-08-17. Every quoted string below was copied out of a transcript actually retrieved and stored during this session. Nothing is reconstructed from show notes, episode descriptions, or recollection.

---

## 1. Which shows actually publish transcripts

I checked the shortlist first, on the shows' own sites. **The result is the single most important finding in this document: almost no recovery-specific podcast publishes a transcript on the web.**

| Show | Own-site transcript? | What the episode page actually has | Workaround found |
|---|---|---|---|
| Recovery Elevator | **No** | Timestamped show notes + audio player (checked `recoveryelevator.com/re-500-i-am-here-i-am-whole/`) | YouTube captions (channel: Recovery Elevator Podcast) |
| Sober Powered | **No** | Short description, category tags, coaching/community CTAs (checked `soberpowered.com/episodes/one-reason-some-people-stay-sober-and-others-dont`) | YouTube captions (channel: Sober Powered) |
| The Addicted Mind | **No** | Summary + bulleted topic list (checked `theaddictedmind.com/episode-355-...`) | **None** — YouTube channel has captions disabled (`yt-dlp --list-subs` → "has no automatic captions / has no subtitles") |
| This Naked Mind | **No** | Description + Alcohol Experiment CTA (checked `thisnakedmind.com/ep-201-sober-bliss-with-gayle/`) | None found |
| Recovery Happy Hour | **Site did not resolve** (`recoveryhappyhour.com` → DNS ENOTFOUND on 2026-08-17) | — | None |
| The Bubble Hour | **No** — and the show is **no longer in production** (confirmed by its own former host, quote T-17 below) | — | Host interviewed elsewhere (see Sober Awkward) |
| Sober Awkward | **No** | — | YouTube captions (channel: Sober Awkward) |
| That Sober Guy | **No** | — | YouTube captions (channel: That Sober Guy Podcast) |
| Since Right Now / Seltzer Squad / Take 12 / Home Podcast | **No transcript found** | — | None |
| Sober Motivation | **Yes, third-party** | Full transcript on PodScripts | `podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/` (243 eps transcribed) |
| NPR Life Kit | **Yes, first-party human transcript** | Full transcript at `npr.org/transcripts/<id>` | — |

Aggregators checked and mostly ruled out: **PodScribe** and **Happy Scribe public** returned nothing for these shows. **PodScripts** covers mainstream shows plus exactly one recovery show (Sober Motivation) — I probed 16 candidate slugs and 15 returned HTTP 302. **soberpodcasts.com** (the "Sober Podcast Network") hosts episode pages with audio only, no transcripts.

### Retrieval success rate

- Shows on the brief's shortlist with a usable transcript route: **5 of 12** (Recovery Elevator, Sober Powered, Sober Awkward, That Sober Guy, The Bubble Hour only indirectly via its ex-host guesting elsewhere).
- Shows on the shortlist with **no** route at all: The Addicted Mind, This Naked Mind, Recovery Happy Hour, Since Right Now, Seltzer Squad, Take 12, Home Podcast.
- Substitutes added to reach coverage: **Sober Motivation** (PodScripts) and **NPR Life Kit** (npr.org).
- Transcripts actually retrieved and stored: **32 episodes / ~250,000 words** across **6 shows**.
- Episodes attempted that failed: 4 (The Addicted Mind ×4, captions disabled).

## 2. Confidence and the ASR caveat — read this before you quote anything

**Only one source in this document is a human-made, publisher-issued transcript: NPR Life Kit.** Everything else is machine transcription:

- **YouTube auto-captions** (Recovery Elevator, Sober Powered, Sober Awkward, That Sober Guy) — retrieved with `yt-dlp --write-auto-subs`.
- **PodScripts ASR** (Sober Motivation).

ASR gets words wrong. Observed errors in these very files: the Sober Motivation intro renders the show's own name as *"Subur Motivation Podcast"* and *"Super Motivation podcast"*; Sober Powered's host is captioned as *"my name is Jill"* when she is Gill/Gillian Tietz; PAWS is captioned throughout as *"pause"*; Sober Awkward's guest Ben Gibbs appears as "Ben Gibson" in the video title. Punctuation and sentence boundaries are invented by the ASR engine.

**Practical consequence:** treat every quote below as *substantively* what the speaker said, not *character-for-character* what they said. Confidence in the substance of each quote: **high**. Confidence that the exact wording would survive a court reporter's check: **medium** for the ASR quotes, **high** for NPR. Speaker attribution is high-confidence for named guests in interview shows and for solo-host episodes; it is flagged inline where the captions do not identify who is speaking.

Anything I could not retrieve is in §F "UNVERIFIED — no transcript", with no quotation marks anywhere in it.

### 2a. Verification actually performed (not asserted — run)

**No quote in this document came from a page-summarising fetch layer.** Every transcript was pulled as raw bytes (`curl` for HTML, `yt-dlp` for caption files) and converted to text by deterministic regex scripts I wrote. A summarising fetch tool was used **only** for the §1 availability audit — "does this page have a transcript at all" — and never as a source of words.

After drafting, I mechanically re-verified the document against the stored raw material:

1. **Every quoted string in this file was extracted programmatically and grepped against the transcript corpus** (punctuation- and case-insensitive; passages containing `...` were split and each fragment matched independently, so an ellipsis can never hide a splice). **Result: 150/150 quoted strings matched.**
2. **A 28-probe sample of distinctive phrases — at least one per source file — was then grepped against the untouched `.vtt` / `.html` wire bytes using a second, independently written reader**, to rule out my own extraction script inventing or merging text. **Result: 28/28 found.**

**Two real defects were found by this pass and fixed:**
- The University of Sussex figures (R-1) had been silently cleaned: the caption track reads `67% had more energy 58 58% lost weight` (an ASR stutter) and I had smoothed it to `58%`. Restored.
- The relapse-risk quote (R-5) had two **non-contiguous fragments reordered** — I had moved *"And that risk is around 7 to 9%"* from before the "5-year mark" sentence to after it, which changed what the sentence appeared to claim. Replaced with the contiguous passage in its true order. **This is exactly the failure mode the warning describes, and it was mine, not the tool's.**

**One methodological disclosure.** YouTube auto-captions are *rolling two-line* cues: each cue repeats the previous line verbatim before adding the next. Read literally, the raw file says `could also join / could also join a Facebook group for your city so like / a Facebook group for your city so like / I'm in the Boston area`. De-duplicating consecutive identical lines is required to read them at all, and it is what my script does. It is a mechanical step with no judgement in it, but you should know it happened: **the raw bytes do not contain my longer quotes as one literal contiguous run.** Both my extractor and the independent verifier de-duplicate the same way and agree.

**Absence vs. failure.** Every "no transcript" finding in §1 and §F rests on positive evidence, not an empty result: `yt-dlp --list-subs` returning *"has no automatic captions / has no subtitles"* for The Addicted Mind; a DNS `ENOTFOUND` (not a 404, not a 429) for recoveryhappyhour.com; HTTP **302** for 15 of 16 probed PodScripts show slugs. No conclusion here rests on a request that merely timed out or rate-limited.

## 3. Bias notes — every host here is selling something

This is not incidental; it shapes what techniques get airtime.

- **Recovery Elevator (Paul Churchill)** — sells Café RE (paid community), international sober travel retreats, and books (*Dolce Vita*, and a compilation *This Is How We Quit* plugged in RE 600). Episodes carry **BetterHelp** and **Soberlink** (remote breathalyser) ad reads. Note the structural conflict in testimonial T-05: a guest credits *booking a Recovery Elevator retreat* as her accountability device, and the host immediately says he has heard that before from other retreat registrants.
- **Sober Powered (Gill Tietz)** — sells the "Living a Sober Powered Life" community, a course ("The Sober Mindset"), and coaching. Nearly every research segment ends in a CTA. She is, to her credit, the only host here who names her sources.
- **That Sober Guy (Shane Ramer)** — sells 1:1 coaching and a men's community ("the victory circle"); explicitly Christian framing.
- **Sober Motivation (Brad McLeod)** — sells the Sober Motivation Community; the Ryan episode opens with a founding-member sales pitch before the interview.
- **Sober Awkward** — ad-funded (Acast); guests are typically promoting a book or a business (Jean McCarthy's *UnPickled*, Ben Gibbs's Sober Boozers Club).
- **NPR Life Kit** — no product, but the guest **Casey Davidson is a paid sobriety coach** and host of her own show. Lowest commercial pressure of the set; also the most concrete tactics. Not a coincidence worth ignoring, but worth noting.

**Systematic skew this produces:** community/coaching/retreat solutions are over-represented; medication (naltrexone, acamprosate, disulfiram) is almost entirely absent from these six shows' output that I sampled; and "get more support" is the default answer to every failure mode, which is also the answer that sells the product.

## 4. Copyright / product-use flag

Short attributed quotes for internal research are ordinarily defensible. **Shipping these quotes inside a commercial recovery-support product is a different question and you should not assume it is covered.** Three separate issues:

1. **Copyright in the spoken content** sits with the shows/guests. Testimonials-as-product-content is closer to commercial republication than to criticism or review.
2. **YouTube's Terms of Service prohibit downloading content except through features YouTube provides.** The caption files here were obtained with `yt-dlp`. That is fine for a one-off research read; it is a real exposure if it becomes a pipeline.
3. **PodScripts' transcripts are themselves a derivative work** with their own terms.

Also: several speakers here are ordinary members of the public who told a stranger the worst period of their life. Guests identified by first name only in the transcript (Ryan, Carrie, Greg, Will, Lydia, Rich, Dan, Butch, Jessica, Elisa, Todd, Matt, Luke) are kept **first-name-only** below, even where a surname could be inferred. Hosts and publicly-promoting guests (Gill Tietz, Paul Churchill, Shane Ramer, Brad McLeod, Jean McCarthy, Ben Gibbs, Casey Davidson, Matt Farnsworth, Shanna Whan) are named.

---

# SECTION A — TESTIMONIALS

34 verbatim quotes across 6 shows. Timestamps are caption/transcript timestamps, i.e. the start of the caption block containing the quote.

## Recovery Elevator (host: Paul Churchill)

Transcripts: YouTube auto-captions, channel "Recovery Elevator Podcast".

**T-01 — Carrie, ~7 months AF, nurse, Maine. "What do you do on a day-to-day basis?"**
Show: Recovery Elevator, RE 574: Your Sobriety Team · Published 2026-02-16 · https://www.youtube.com/watch?v=cPu5x9_nb3s · [00:30:18]–[00:31:42]
Substance: alcohol. Stage: month 7.

The host's probe, verbatim: *"Carrie, you mentioned this time you're doing the work. What does that look like? What do you do on a day-to-day basis? Are you going to aa podcasts, Quitlet, Community? What are you doing?"*

Her answer:
> "So here I am month seven. So I can tell you every night before I go to bed, I have to plan the next day. And that involves like I have to choose a couple healthy things that I'm going to do. If it's going to be walking and journaling or a sauna and yoga, like you know, day and night some things lots of I carry a notebook on me and journal all my thoughts and confusion and my emotions. I go to AA on once a week. I'm not a regular attender. It's the one meeting I can commit to for schedule-wise, but that I would like to grow."

**T-02 — Carrie, on why the planning is load-bearing for her specifically**
Same episode · [00:33:26]
> "I do want to be self-professed. I have attention deficit disorder which has been found out much later in life and I think that neurode diverency in addiction is proven to be I have a strong correlation because the mind's going so fast so the planning of the day also is my approach how I attack my brain functioning"

**T-03 — Carrie, on all-or-nothing program norms as a barrier**
Same episode · [00:32:01]
> "It's unfortunate sometimes how people in recovery I think get the impression of there's like one way. I sometimes I wonder if that steers people away from getting help. Like they're like, 'Oh my gosh, well 90 meetings in 90 days. I can't do it, so forget it all.'"

**T-04 — Greg, 45 days AF. "This time around, I'm doing recovery." — What does that look like?**
Show: Recovery Elevator, RE 575: What Finally Makes One Quit Drinking · Published 2026-02-23 · https://www.youtube.com/watch?v=tVKMOeNoQ1I · [00:37:12]–[00:37:45]
Substance: alcohol. Stage: 45 days.

The host's probe, verbatim: *"Greg, so earlier in the interview, you said, 'This time around, I'm doing recovery.' What does that look like for you?"*

> "I've established a very consistent like everyday morning routine. I I wake up. I have a devotional book I read out of. I read a chapter of my Bible. I journal, which I have never ever done in my life. And that is such a huge part of my recovery is just putting pen to paper and just reviewing the the day before and where I'm at and what my thoughts are and what my feelings are, whatever. Again, there's a lot of prayer. There's an awful lot of listening to your podcast. I've got some community things going again, mostly through my church. I'm actually starting a recovery group tonight that my my church hosts with a group of men that I'm I'm really excited about."

**T-05 — Greg, on time-scale realism in repairing a marriage**
Same episode · [00:40:04]
> "And you know, I'm in early sobriety. I will not use the word only because 45 days is 45 days. And I'm proud of myself, but there's there needs to be some more time. I spent 24 years tearing this thing down and it doesn't get built back up in in a couple of months."

**T-06 — Will, on "burning the ships": the specific sequence of calls he made in one day**
Show: Recovery Elevator, RE 587: Schedule What? · Published 2026-05-18 · https://www.youtube.com/watch?v=H73QNmH7gK0 · [00:25:09]–[00:25:59]
Substance: alcohol.
> "So, I called my boss. And this is like 11:00 a.m. on like a Wednesday or something. I'm drunk. I call my boss and I say, 'I need to go to rehab.' And I need you to take me off the schedule and and he helped me out. You know, he was concerned and then I went to my other job when I sobered up and I spoke to HR and said I need the time off from both my jobs so I can go. Then I told my brother and I told my parents. And you know, burning the ships or whatever."

**T-07 — Will, on what made the burn-the-ships day work**
Same episode · [00:26:50]–[00:27:18]
The host's probe: *"On your burning the ships day, how did it feel after each conversation? ... walk the the direction, Will."*
> "It felt good. It felt like I was trying something new. ... It felt good to commit, you know, to go to the jobs. And everyone was concerned and cuz they had no idea."

**T-08 — Will, the relapse right after: a 30-day milestone read as permission — BACKFIRE**
Same episode · [00:27:33]–[00:27:50]
> "So, I probably get 30 days after rehab. And then I think like I'm watching TV and I think, 'You know, a beer would be nice. I'm really enjoying this show. I got 30 days. That should be enough.' So, and then that started just the saddest, most pathetic, trying to hide and it's clearly I'm drinking every day, getting hammered in my room"

**T-09 — Lydia, 41, Seattle. Pink cloud in month 1, hard crash in month 2**
Show: Recovery Elevator, RE 581: The BEST Way to Feel Better · Published 2026-04-06 · https://www.youtube.com/watch?v=FQOJzIKwKRk · [00:30:15]–[00:31:32]
Substance: alcohol. Stage: ~7 months at recording; describing months 1–3.
> "The first month, thankfully, my pink cloud arrived and I was just living life high on the fact that my body was feeling better. Mentally, I was feeling better. Once I got past that initial first week of suck, I was I was doing great. I was fantastic and I was so excited. And then I got a little itchy around day 29, like I always do, but it was that accountability that kept going. And then month two, I crashed hard. I crashed so hard from that high. And that second month was a lot of just early bedtimes, taking sick days, eating lots of ice cream, and just being open."

**T-10 — Lydia, on the booked-event-as-deadline device**
Same episode · [00:29:39]
> "And that was the accountability I needed. It was I needed a goalpost in the future that got me at least a month underneath my feet because I could not get past that 30-day point."

(Host's immediate response confirms this is a pattern he sells into: *"I have heard this before where people will register for our Bosezeman retreat and they'll circle it on the calendar months out or a Costa Rica retreat."* — see bias note §3.)

**T-11 — Lydia, on what actually replaced the drinking hour**
Same episode · [00:31:13]
> "the Cafe RE community and the fact that they have chats, multiple chats, every single day of the week. So I could feel like and I could still show up no camera onto a chat and just have a space where all of that is held and connect with somebody and see myself in somebody else's story"

**T-12 — Lydia, on counting small present-tense wins**
Same episode · [00:32:17]
> "going to a Girl Scout meeting and being present for that being present for the girls doing something like that proved to me just how much sobriety held showing up for to help my daughter with homework at night. Right in that moment in that present space I would be like wow what would I be doing right now instead? ... but instead I was here with my daughter and I just kept stacking up wins and I recognized them."

**T-13 — Rich, 60, Sacramento. The cooking trigger, and the two things that got him past it**
Show: Recovery Elevator, RE 595: You Have One Job · Published 2026-07-13 · https://www.youtube.com/watch?v=4gQH_1k7c5c · [00:36:21]–[00:37:33]
Substance: alcohol.
The host's probe: *"So, how did you make it past those cravings? I know we're all thinking the same question."*
> "I still had cravings and was thinking about it a lot. I had lots of triggers. Cooking dinner was a huge trigger. Every time I got in the kitchen, got out the pots and pans, this, that, and the other thing. Oh, man. My brain was like, drink."
> "Well, I I'd like to think some good self-determination, but soda water, like flavored soda waters, if I had some sort of drink while I was cooking, that helped. But a lot of it too was just kind of buckling down and realizing by then I had educated myself enough to hear terms like play the tape forward. ... I could say to myself, 'Okay, fine. You go have that shot. You're not going to have one. You're going to have 12.'"

**T-14 — Rich, on building a non-12-step stack, and his wife's line about why she wasn't enough**
Same episode · [00:37:33]–[00:38:30]
> "Nothing formal. Like I said, I was doing Zoom meetings and such on an app. I started doing some reading of Quitlit, Unbelievable Joy of Being Sober, Katherine Gray, This Naked Mind. I also read Let Them by Mel Robbins, which helped me a lot with moving away from worrying about what other people think"
> "And my wife had said when I got sober, she says, 'Look, I'm going to support you in this, but you need to find some people to talk to about this that can relate to what you're saying because I don't know what you're going through. I've never drank like that. I don't know what you're going through.'"

**T-15 — Dan, 44, Denver, AF since Feb 2025. Play the tape forward, described operationally**
Show: Recovery Elevator, RE 600: What Happens After You Quit Drinking? · Published 2026-08-17 · https://www.youtube.com/watch?v=zFUdAB_4sug · [00:41:49]
Substance: alcohol. Stage: ~18 months.
> "Play the tape forward. It's an AA term. Know that if you put this alcohol in your body, where are you going to be in 15 minutes? Where you going to be in 2 days? Where you going to be in a week? I think those that drink, playing the tape forward helped me immensely. You fast forward. If I do this, where am I going to be in two days?"

**T-16 — Dan, the concrete drink substitutions**
Same episode · [00:41:17]
> "A lot of fresca. I love fresca and I love cranberry juice. I'm not a soda guy, but I'll get the the cranberry pineapple mixes. I'll drink half of it down then fill it with water and dilute it. That and also the Arizona tea Arnold Palmer mix."

**T-17 — Paul Churchill (host), naming the passive→intentional transition**
Show: Recovery Elevator, RE 571: From Passive to Active Recovery · Published 2026-01-26 · https://www.youtube.com/watch?v=g5y-N7sTiP0 · [00:03:33]–[00:05:51]
> "In early recovery, things kind of happen to you. Sleep improves, your head clears, maybe a hobby resurfaces on its own. It's somewhat passive, and that's a good thing because you're healing and you're stabilizing. Your body knows what to do. But at some point, and the timing is different for everyone, you realize I'm not just not drinking anymore. I'm actually living."
> "So this week, I want you to ask yourself, what's one thing I've been curious about that I haven't made time for? Just one thing, not 10. This isn't a complete life overhaul. Just one small piece of unexplored territory."

## Sober Powered (host: Gill Tietz, MS — biochemist)

Transcripts: YouTube auto-captions, channel "Sober Powered". Note ASR renders her name as "Jill".

**T-18 — Gill Tietz, 3.5 years sober, on what actually keeps her sober**
Show: Sober Powered, "What Helps Me Stay Sober and Not Go Back to Drinking + Q&A" · Published 2023-06-30 · https://www.youtube.com/watch?v=_lTdtNDg-eU · [00:00:22]–[00:01:29]
Substance: alcohol. Stage: 3.5 years.
> "what has helped the most is just connecting with other people and kind of feeling like I matter in some way that some people out there care about me um that if I just completely disappeared that at least one person might check in on me"
> "I don't do in-person meetings I do online meetings so that's another option so you could start with online meetings and then you know work up your comfort level to where you can go in person you could also join a Facebook group for your city so like I'm in the Boston area and if you search Boston sober or whatever your city is then you'll find like the closest group and you can ask someone to take you to a meeting too so then you have a buddy"

**T-19 — Gill Tietz, on the "walking in" problem, with a non-recovery analogy**
Same episode · [00:01:29]
> "I think the hardest part is just like walking in and like going to group fitness at the gym just like getting to the class is really scary but once you're there it's hopefully not as bad"

**T-20 — Gill Tietz, 4.5 years sober, on her own physical baseline while drinking**
Show: Sober Powered, "What to Expect After 30 Days of No Alcohol" · Published 2024-05-08 · https://www.youtube.com/watch?v=P4pnyUH8z68 · [00:06:22]
> "I didn't realize the impact that alcohol had on my heart I had borderline high blood pressure in my 20s at an average weight my blood pressure was always 134 over 85 at rest and my resting heart rate was in the mid 80s I felt horrible all the time"

**T-21 — Gill Tietz, on a benefit that runs backwards for the first six months**
Same episode · [00:12:28]
> "some people will see their skin improve right away other people's skin will get worse before it gets better and I was one of those people I developed acne for the first 6 months of sobriety and then it went away and I've heard a similar story from a lot of people"

**T-22 — Gill Tietz, redefining what counts as a quit attempt**
Show: Sober Powered, "How Many Attempts Does it Take to Quit Drinking For Good (and Relapse Rates)" · Published 2024-10-25 · https://www.youtube.com/watch?v=r_ICVR_gUoQ · [00:01:36]–[00:02:19]
> "I know it may feel like you have tried to quit drinking 100 times. I felt that way, too, when I was going through it, and I was in the back and forth, and I was suffering. However, most of those times I didn't actually want to quit. I wanted the suffering to end, but then I still also wanted to drink. That's not a real quit attempt. A real quit attempt is when you are serious about being done, and you take the appropriate steps to get the support you need to stay done. Saying, 'I'm never drinking again.' That's not an actual quit attempt. That's expressing desperation and frustration."

**T-23 — Sober Powered, the pink cloud and its ending** *(speaker attribution uncertain — this is a multi-voice clip and the auto-captions carry no speaker labels; at least two people are talking, both describing ~6-month pink clouds)*
Show: Sober Powered, "What's the Pink Cloud and How What Happens After it Goes Away?" · Published 2024-01-13 · https://www.youtube.com/watch?v=6ktSOD2fjcQ · [00:00:23]–[00:01:45]
> "I feel like it lasted a while actually I feel like it lost a good six months or something mine was also about six months"
> "it's the extreme excitement that you get when you first stop drinking and all of the things that made you really hate yourself stop happening and it's awesome uh like the 3:00 a.m. wake up is the best example you don't wake up at 3M hating yourself anymore and that's its own high and that makes it difficult too because if you have a really pink a really big pink cloud like we did you have to come off of it eventually"
> "and eventually those benefits even out and it's just your life and that's not as exciting and that's when a lot of people will romanticize alcohol again and they'll feel sad that they can't drink and they'll have to grieve it and a lot of people when they fall off they'll drink again"

## Sober Awkward (hosts: Vic and Hamish, Australia)

Transcripts: YouTube auto-captions, channel "Sober Awkward".

**T-24 — Jean McCarthy (author, *UnPickled*; former host of The Bubble Hour) on the ritual architecture of daily drinking**
Show: Sober Awkward, "UnPickled - Prepare to be Alcohol-Free - with Jean McCarthy" · Published 2026-07-12 · https://www.youtube.com/watch?v=iKPBTFpr0W0 · [00:33:36]
Substance: alcohol (wine).
> "So for me I was a daily drinker and my drinking really became very ritualized. So I came home from work. I would pour my wine into a certain coffee mug. ... So that no one knew was drinking. And then uh when dinner was served I would start drinking openly out of a wine glass. And I had certain wine glasses that I liked and I liked to sit in a certain chair and watch a certain show and then I would take my wine up to my bedroom and then I would watch another show in bed"

**T-25 — Jean McCarthy on grief as the unexpected feature of early sobriety**
Same episode · [00:34:11]–[00:34:32]
> "one thing that people don't expect that is enormous in early recovery is grief."
> "I miss wine like my best friend had died."
> "I felt like I had been so betrayed by alcohol. I grieved it. I was so sad. And I grieved the me that was a drinker, that sort of elegance and the whatever I thought I was."

**T-26 — Jean McCarthy, confirming The Bubble Hour's status and her interview base**
Same episode · [00:14:46]
> "I interviewed hundreds of people in recovery on a podcast called The Bubble Hour, which is no longer in production, but it was one of the sort of original podcasts"

**T-27 — Jean McCarthy on "sober corners" — the most concrete environmental tactic in the whole set**
Same episode · [00:34:53]–[00:35:28]
> "So, I rearranged my furniture, for example, and what I tell people in the book is in early recovery, if you rearrange your furniture and keep drinking, well, then you're that's just going to become your new drinking place. So, what I invite people to do is make a few little corners in your house that are going to be your little sober corners. And maybe it's a guest room or maybe you can just find a little corner in your closet. I one of the guests on my show talked about making a little nest in her closet. And whenever she had company, she would slip away and go to this little nest in her closet. ... She had a lotion and a flashlight and magazines and chocolate"

**T-28 — Jean McCarthy on why herbal tea fails as a substitute at first**
Same episode · [00:36:28]
> "If you had offered me a a mug of herbal tea instead of a glass of wine, I would have politely thrown it across the room. ... I just could not imagine that ever being a satisfying thing. But I had to try a whole bunch of different things until I found some that I liked."

**T-29 — Jean McCarthy on the paper calendar drinking audit**
Same episode · [00:39:15]
> "Another thing that's quite helpful, and this is a chapter that's early on in the book, is just to get out a calendar. You can do this with your phone, but I like to do it on paper. Get out a calendar and look at your phone and see what you were up to the last little while and when did you drink and what did it look like? And you start to see a pattern emerge"

**T-30 — Jean McCarthy on changing the *shape* of socialising rather than quitting it**
Same episode · [00:38:55]
> "It can also be that our true friendships, we get a little lazy with socializing when we lean on alcohol. I learned um to start inviting my friends to brunch or to go out for coffee. And so instead of always meeting up for wine or having parties or whatever, I just started socializing differently."

**T-31 — Ben Gibbs (founder, Sober Boozers Club) — keeping the venue, changing the exit time**
Show: Sober Awkward, "The Sober Boozers Club with Ben Gibson" [sic — his surname is Gibbs, as the host says in the intro] · Published 2026-06-28 · https://www.youtube.com/watch?v=N4Rcs-S4I7M · [00:10:04]–[00:10:21]
Substance: alcohol.
> "my social life it's I mean the only difference in in uh I suppose how I would have seen it as a negative but now I see it as a positive is I've just got a much earlier bedtime. You know I'll still go on these on these pub crawls. It's just now it gets to 11:00 and I'm like, 'Right, I'm going now. You guys crack on. I'm I'm going to get in my car and and drive home.' So, my social life is is pretty similar to what it was as a full drinker."

**T-32 — Ben Gibbs, on the drinking network thinning out by itself**
Same episode · [00:12:12]
> "I suppose I'm I'm quite fortunate that a lot of my social group, and I don't think it was completely accidental, they don't really drink heavy volumes of alcohol anymore. And the people that did, I don't I don't really see anymore."

**T-33 — Vic (host), on the point in an evening where sober socialising stops working**
Same episode · [00:10:39]
> "I've had a little bit of a change in my socializing recently because I think I took a long time to understand that I didn't enjoy it once people had got that ticket for a train that I didn't have a ticket for. They were out of the station heading into Crazy Town and I was kind of stuck on the station platform feeling like a sore thumb. And when that happened for me, I was like, 'Right, I'm out.' But I still wanted to socialize and I do like a pub."

## That Sober Guy (host: Shane Ramer)

Transcripts: YouTube auto-captions, channel "That Sober Guy Podcast".

**T-34 — Shane Ramer, ~12 years sober, on the plateau after the milestones stop**
Show: That Sober Guy, "The Sober Plateau: When Life Stops Moving After You Quit Drinking" · Published 2026-03-06 · https://www.youtube.com/watch?v=MfNa9bLrg1s · [00:13:46]–[00:14:30]
Substance: alcohol. Stage: ~12 years.
> "So, you get 30 days, right? And you're like, 'Yeah, it's exciting. I'm pumped. Like, hell yeah. This is great.' And then you get 90 days and you're like, 'Man, all right, I got some momentum here. It's still exciting. You know, it's kind of that pink cloud they call it.' ... And then you hit a year and it's like, 'Man, huge milestone.' ... And then, you know, the next year goes by and the next year goes by. And a couple years go by and and you kind of go like, 'Well, is this is this it? I just drink sparkling water now and like watch a game here and there and I'm in bed by 8:00'"

**T-35 — Shane Ramer, naming chaos rather than alcohol as the addiction**
Same episode · [00:18:21]–[00:18:56]
> "So many of us, and including myself, we were addicted to chaos. Not just alcohol, right? It wasn't just the alcohol or the drugs or the partying or whatever. It was chaos. It was drama. We were addicted to that. And when life gets peaceful ... you start looking around you like, 'God, like should I just like do something crazy just to spark like some some feelings so I could feel alive again?'"
> "the pink cloud, it kind of turns into overcast a little bit some days"

**T-36 — Shane Ramer, on boring being the diagnostic sign of doing well**
Same episode · [00:13:12]
> "if you look at the kind of the patterns in this people who are struggling, they have a lot of chaos and drama in their lives. And the people who are doing okay their lives are sometimes kind of boring."

## Sober Motivation (host: Brad McLeod)

Transcripts: PodScripts ASR, `podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/`.

**T-37 — Ryan, 11 months sober, on which support actually stuck after several didn't**
Show: Sober Motivation, "Ryan started as the party guy and then alcohol took over his entire life." · Published 2024-08-29 · https://podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/ryan-started-as-the-party-guy-and-then-alcohol-took-over-his-entire-life
Substance: alcohol. Stage: 11 months. Transcript: **machine-generated (PodScribe/PodScripts ASR)**. · [00:49:57]
> "for me, one of the biggest things to help out was the feeling of not being alone anymore. And it took me a couple different communities to try out before I found the right home."

The detail worth keeping: **it took several communities before one fit.** "Find a community" is the genre's universal advice; Ryan is one of the few who says the first one didn't work.

**T-38 — Jessica, 13 years sober, writer, three daughters. The moment**
Show: Sober Motivation, "I was drinking 3 bottles of wine a night - Jessica's sobriety story" · Published 2026-05-22 · https://podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/i-was-drinking-3-bottles-of-wine-a-night-jessicas-sobriety-story · [00:00:00]
Substance: alcohol (wine). Stage: 13 years.
> "I remember looking at myself in the mirror and I got done throwing up. And I genuinely heard a voice that wasn't mine. And it said, haven't you had enough yet? And at that moment, I was like, yeah, I've had enough. Enough is enough. I walked back into the bedroom with my husband. And I said, I think I have a problem with drinking."

**T-39 — Jessica, on always feeling outside the circle, and alcohol as the entry ticket**
Same episode · [00:01:34]–[00:02:28]
> "I very much felt like an outsider looking in on my own life from the beginning. I always felt like I didn't quite belong. I'm 6.1 and I was 6.1 in junior high. ... My whole life I felt like I was on the outside. I felt like I was being pushed to the back. And then come 16 years old, I discover the thing that made me feel like I was inside of the circle and it was drinking."

**T-40 — Jessica: the mass announcement she regrets — the clearest BACKFIRE account in the set**
Same episode · [00:59:48]–[01:00:32]
> "I didn't start out like shouting this from the rooftops, right? Because if we shouted from the rooftops, we have to be held accountable. And this is part of my story in the sense that I actually like in a. post pink cloud haze did reach out to all of my family and friends and say, I am an alcoholic. I have a problem with drinking. I need you to hold me accountable. And I deeply regretted doing that."
> "Right. Like I was like, oh, man, that was a mistake. But thank God I did because if I didn't get pregnant and I, like, and I got pregnant and I hadn't made that announcement, I can tell you without a shadow of a doubt that my children would not be alive today because I was a blackout drinker."

Note the shape of this: she regrets the *method* (broadcast to everyone, made while on the pink cloud) but credits the *effect*. That ambivalence is the finding — not a clean endorsement and not a clean warning.

**T-41 — Jessica, on the minimum viable version of disclosure**
Same episode · [01:01:23]–[01:01:42]
> "For those people that are like, I'm not going to go out there and be like, yes, I'm sober. I'm a doctor. I can't do that. You absolutely don't have to. but someone has to know. Someone else has to know in your life because otherwise you will keep lying to yourself and you will find an excuse."

**T-42 — Jessica, on resenting the people who had noticed**
Same episode · [01:02:35]–[01:02:58]
> "I was so resentful of the people that told me, like, yeah, I could tell something was going on with you or, yeah, I really knew because I thought I was hiding it so well. And I was like, what do you mean you knew? Like, you didn't know because I was such a master of a disguise. And like, so instead of focusing on like the recovery piece of it right there, I was just, like, busy building a resentment towards them because they caught on to me."

**T-43 — Brad McLeod (host), on motivation — from ~290 interviews**
Show: Sober Motivation, "I interviewed 280 people about sobriety - these 12 lessons changed everything" · Published 2026-07-16 · https://podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/i-interviewed-280-people-about-sobriety-these-12-lessons-changed-everything · [00:11:33]–[00:12:36]
> "I called this show sober motivation and after 290 episodes, here's my confession. I'm not sure if I've ever interviewed someone who got sober because they woke up motivated. I don't know if anybody's story started out with. I just felt inspired one morning. How their stories go is like this. It starts with fear, with exhaustion, with maybe a doctor's warning, with a look on their kid's face, and then they took action. they absolutely did not feel like taking"
> "we think motivation comes first then action it's the opposite action comes first and motivation shows up somewhere down the line maybe on day two maybe on day 10 maybe on day 30 once we already have a little bit of momentum motivation isn't the spark it's the fire"

**T-44 — Brad McLeod, on the identity switch he sees in guests**
Same episode · [00:06:13]–[00:07:03]
> "There's a difference between I'm trying not to drink and I'm not a drinker anymore. the first one is a fight you have to win every single day. The second is just who you are. I've noticed this in so many of my guess. At some point, the language shifts."
> "Give that new person a name. Give them habits. Give them a morning routine. And people in places. The old identity had all of those things. The new one deserves them too."

**T-45 — Brad McLeod, on the social circle as a permission structure**
Same episode · [00:02:57]
> "When I was drinking, I wasn't surrounded by people who challenged it. I was surrounded by people who normalized it, not because they were bad people, but because my drinking made their drinking okay, and their drinking made mine okay. We were all holding each other's permission slips. When you change, you find out quickly, who was a friend and who was a drinking arrangement."

**T-46 — Brad McLeod, on the question he thinks separates durable from fragile sobriety**
Same episode · [00:05:11]–[00:06:13]
> "Putting down the drink is step one, no doubt about it. But the drinking was never really the problem. It was the solution we found for the problem."
> "The people I've seen build lasting peaceful sobriety are the ones who got curious instead of just disciplined."

**T-47 — Brad McLeod, on the absence of a rescue**
Same episode · [00:09:49]
> "for years, a lot of us wait for the perfect program, the perfect partner, the rock bottom that finally makes it obvious, the moment someone stages an intervention and carries us out. And I've now heard enough stories to tell you, the Calvary doesn't come. What comes is a Tuesday, an ordinary Tuesday, where you decide, I don't want to live like this anymore."

**T-48 — Brad McLeod, quoting his mentor**
Same episode · [00:13:41]
> "you can go to all the meetings, read all the literature, connect with all the people drink all the coffee. But if you don't do the right thing when nobody's watching, this isn't going to work out for you."

**T-49 — Elisa, ~30 years of drinking, on not doing 90-in-90**
Show: Sober Motivation, "How I got sober after drinking alcohol for 30 years - Elisa's sober story" · Published 2026-06-19 · https://podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/how-i-got-sober-after-drinking-alcohol-for-30-years-elisas-sober-story · [00:42:56]
> "a lot of people that are part of you know recovery program they want to do 90 meetings in 90 days it was never really my thing i never really i don't think i ever fold through with that i mean i would i would pop in here there and um you know check things out"

**T-50 — Elisa, on what alcohol switched off**
Same episode · [00:11:05]
> "I was able to put alcohol in my system, feel pretty, feel smart, and escape. Like, I didn't have that not good enough that was always there in my head. ... that mind, that chatter of a thousand monkeys of one of my friends likes to say, it went away. It went away and I could breathe. So it eased that constant chatter that I do not belong on planet Earth."

**T-51 — Todd, on the identity objection that delayed him for years**
Show: Sober Motivation, "I wasn't drinking every day but alcohol controlled my life - Todd's sober story" · https://podscripts.co/podcasts/sober-motivation-sharing-sobriety-stories/i-wasnt-drinking-every-day-but-alcohol-controlled-my-life-todds-sober-story · [00:09:59]
> "if I quit, what does that say about, what does that mean for what people are going to think about my drinking? And that, I use that as an excuse and as sort of a rationale and a reason for a long time to not seriously consider quitting because I thought, well, I'm not that guy."

## NPR Life Kit — "How to cut down on drinking"

**First-party human transcript.** Host: Marielle Segarra. Guest: **Casey Davidson**, sobriety coach, host of the *Hello Someday* podcast, ~9 years sober. Published 2024-12-26. https://www.npr.org/transcripts/1221596345

**T-52 — Casey Davidson, on the rule-making phase**
> "I tried to do everything I could to keep it in my life. You know, every rule I could make about I'll only drink two drinks a night, or only three days a week, or only on the weekends. And it never worked for very long. And I found that just not drinking was so much easier than trying to keep it in my life."

**T-53 — Casey Davidson, on why a 30-day break can be structurally counterproductive — BACKFIRE**
> "I recommend a hundred-day break from alcohol to really institute the habit of not drinking, and experience ups and downs in your life and work stress and celebrations and date nights without alcohol, for it to become your new normal. That said, I love Dry January, I love Sober October, because it normalizes the idea of taking a break from drinking. But if you're just doing a 30-day break, the danger is that in the first two weeks, the withdrawal from alcohol is real. Even if you don't drink a ton, your sleep will be interrupted, you will be tired, you'll have less energy. Once you get past that, you start feeling much better. ... But if you're just doing a month, you tend to spend the first two weeks not feeling great, feeling irritated. And then the next two weeks you're basically counting down to drinking as your reward. So you never sort of rewire your reward system to expand to other ways of relaxing or finding joy."

**T-54 — Casey Davidson, "sober treats", with the actual examples**
> "my favorite thing to suggest is to actually plan out what I call sober treats. And in the beginning, in your first week or two, I recommend planning them out every single day. So, for example, on Friday nights, instead of getting a bottle of wine, I would maybe get a pedicure. During the week, it might be blocking off an hour on my calendar and going for a walk somewhere really nice with music on. Getting sushi takeout and watching a movie. And honestly, once you stop drinking, like, waking up feeling good, feeling clear-eyed, being in your home in the morning when it's quiet with coffee, that's a sober treat."

**T-55 — Casey Davidson, the party protocol, including the designated-driver trap**
> "First is eat something, and eat something with protein before you go. Hunger is a huge trigger to drink. I would say tell someone in advance, if you can at all, that you're not drinking. And you can do this even going to a party, really casually, saying, hey, I'm so excited to see you. It'll be fantastic. By the way, I'm not drinking. The last thing I would say is absolutely don't volunteer to be a designated driver just because you're not drinking. People tend to immediately say, oh, you're doing a no-alcohol challenge. Great. You can drive us. And then you're stuck there till the end with a whole bunch of people who might get drunk, and it's really annoying."

**T-56 — Casey Davidson, the heuristic for whether an event is worth attending**
> "If something won't be any fun if you don't drink, it's probably just not very fun."

**T-57 — Casey Davidson, on the mental bandwidth that came back**
> "Drinking took up a lot of time, both in my life, but also in my mind. I was constantly thinking about drinking, trying to drink less, rationalizing drinking. That whole tickertape of thinking went away once I got out of early sobriety"

**T-58 — Casey Davidson, on what she'd tell a friend who wants to help**
> "The other thing you can do is have non-alcoholic options on hand. My good friends, who were my biggest drinking friends for years, whenever I go over to their place now, they have my favorite non-alcoholic beer on hand, and they're like, hey, don't worry, I've got a six-pack of what you love."

**T-59 — Marielle Segarra (host), her own tactic at a bar**
> "sometimes in these scenarios, I also will take a step outside for a minute. And the cold air on my face and just it not being so loud reminds me - like, it gives me a chance to check in with myself and say, do I actually even want to be here right now?"

---

# SECTION B — TECHNIQUES

Named in speakers' own words where possible. "Recurrence" = number of distinct shows in this corpus where the technique appears.

### B-01 · "Play the tape forward"
**What a person literally does:** when the urge arrives, mentally run the consequence chain at fixed horizons — 15 minutes, 2 days, a week — instead of stopping at the first drink.
**Recurrence: 2 shows, 3 speakers.** Dan (T-15), Rich (T-13), and Rich again at [00:41:39] noting it becomes unnecessary later: *"I was out in the garage last night filling up dog food. It popped into my head because I used to have a bottle out there, but it didn't lead to anything. I didn't have to play the tape forward."*
**Note:** both users identify it as AA-derived. Rich's version is more specific than the slogan — he runs it as a quantity forecast (*"You're not going to have one. You're going to have 12"*), not a vague bad-outcome image.

### B-02 · Plan tomorrow, tonight, in writing
**What a person literally does:** before bed, write the next day's plan including two named "healthy things" (Carrie's examples: walking + journaling, or sauna + yoga). Carry a notebook during the day.
**Support:** T-01. **Recurrence: 1 show**, but the host frames it as a known pattern and Greg's morning routine (T-04) is the mirror image.
**Mechanism the user gives:** ADHD — externalising structure because *"the mind's going so fast"* (T-02).

### B-03 · Fixed morning routine as the anchor
**What a person literally does:** Greg — wake, read a devotional chapter, read a Bible chapter, journal the previous day, pray, listen to a recovery podcast. Journaling is the part he flags as new and load-bearing (*"which I have never ever done in my life"*).
**Support:** T-04. **Recurrence: 3 shows** (Recovery Elevator, Sober Motivation T-44 "give them a morning routine", That Sober Guy).

### B-04 · "Burning the ships"
**What a person literally does:** in a single day, make the disclosures that remove the retreat option — call the employer and ask to be taken off the schedule, tell HR at the second job, tell family. Then go.
**Support:** T-06, T-07. **Recurrence: 1 show**, but conceptually adjacent to Jessica's disclosure (T-40/41).
**Backfire adjacent:** Will relapsed ~30 days after the rehab that this bought him (T-08). The technique got him in the door; it did not hold him.

### B-05 · Future goalpost with an enforced sobriety requirement
**What a person literally does:** book and pay for a dated event that has a sobriety precondition, months out, and treat cancellation as the cost of drinking.
**Support:** T-10. **Recurrence: 1 show.**
**⚠ Conflict of interest:** the event in question is the host's own paid retreat, and he affirms the pattern on air. Discount accordingly; the underlying mechanism (a costly, dated, external commitment) is separable from the product.

### B-06 · "Sober treats", planned daily for the first two weeks
**What a person literally does:** pre-schedule a specific pleasurable thing for each of the first ~14 days, in the slot the drink used to occupy. Named examples: pedicure on Friday night; an hour blocked on the calendar for a walk somewhere nice with music; sushi takeout and a movie.
**Support:** T-54. **Recurrence: 1 show** — but it is the most operationally specific reward-substitution protocol in the corpus, and it is the one from the human transcript.

### B-07 · A 100-day break instead of 30
**What a person literally does:** set the window long enough to contain a work crisis, a celebration, and a date night, so that not-drinking becomes the default rather than a countdown.
**Support:** T-53. **Recurrence: 1 show explicitly**, but corroborated obliquely — Lydia *"could not get past that 30-day point"* (T-10) and Will treated 30 days as sufficient and drank (T-08).
**This is the strongest cross-source convergence in the document, and it is a warning about 30-day framing.**

### B-08 · "Craving emergency kit" + written trigger plan
**What a person literally does:** (a) write down your top three triggers and what you will do instead when each shows up; (b) assemble a physical/digital kit. Shane Ramer's named contents: water, gum, candy, a meditation app, a friend/sponsor/coach on speed dial, a community you can post into, and *"a photo of like your worst hangover phase ever. keep that thing close on your phone"*.
Show: That Sober Guy, "Alcohol Triggers Explained" · Published 2025-05-02 · https://www.youtube.com/watch?v=jDUIWgXkNrw · [00:43:35]–[00:44:28]
**Recurrence: 1 show**, but every component appears separately elsewhere.

### B-09 · Something in the hand at the trigger moment
**What a person literally does:** hold a flavoured soda water while cooking — the specific activity that triggered him (Rich, T-13). Dan's variant: cranberry-pineapple juice diluted with water, Fresca, Arnold Palmer (T-16).
**Recurrence: 3 shows** (Recovery Elevator, Sober Awkward — AF beer, NPR — non-alcoholic options at friends' houses, T-58).
**Backfire flag from a host:** Sober Powered has a whole episode questioning whether NA drinks are safe for sobriety ("Non-Alcoholic Drinks and Mocktails: Are They OK for Your Sobriety", https://www.youtube.com/watch?v=eZ1jaulZxik) — not retrieved, listed in §9.

### B-10 · "Sober corners" — re-engineer the room, not just the fridge
**What a person literally does:** rearrange the furniture so the drinking chair is no longer the drinking chair; then designate two or three small physical spaces in the home as sober-only and stock them (the guest room; a corner of a closet with lotion, a flashlight, magazines, chocolate).
**Support:** T-27. **Recurrence: 1 show.**
**Crucial caveat the speaker herself adds:** *"if you rearrange your furniture and keep drinking, well, then you're that's just going to become your new drinking place"* — i.e. the environmental change only works if it lands after the stop, not before.

### B-11 · Paper calendar drinking audit
**What a person literally does:** print or open a calendar, walk back through the last stretch with your phone as a memory aid, and mark when you drank and what the occasion was, to find the pattern (daily vs binge).
**Support:** T-29. **Recurrence: 1 show.** Adjacent: NPR's takeaway one is *"assess when alcohol shows up in your life and for what reason"*, and Casey Davidson's version is a written list (*"when you write down what you think alcohol is helping you with, that gives you a really good list of things that you can experiment with to find other ways to meet those needs"*).

### B-12 · Change the socialising format, not the friends
**What a person literally does:** move standing social slots from wine/parties to brunch, coffee, walks (T-30, and NPR: *"moving from happy hours to brunches"*). Or keep the venue and impose a hard exit time — Ben Gibbs still does pub crawls and leaves at 11pm (T-31).
**Recurrence: 4 shows** (Sober Awkward, NPR, Sober Powered, Recovery Elevator). Highest-recurrence social technique in the corpus.

### B-13 · Keep the refusal short; volunteer no reason
**What a person literally does:** rehearse a single short sentence and stop talking. Explicitly do *not* offer "I'm driving" / "antibiotics" / "taking a break".
Gill Tietz, Sober Powered, "How to Socialize Without Drinking Alcohol", Published 2024-02-28, https://www.youtube.com/watch?v=REI4LzHydO0 · [00:03:09]:
> "having some kind of plan for what you're going to say if people ask why aren't you drinking and keep it short like challenge yourself to keep this statement as short as you possibly can it's tempting to make excuses like you're on antibiotics or you have to drive or or you know you're taking a break or you're not feeling that good but the more excuses that you make the more you invite in solutions from other people they'll solve that problem for you so that you can drink"
**Recurrence: 2 shows** — NPR's version is the opposite polarity and worth noting as a genuine disagreement: Casey Davidson recommends *pre*-telling people ("By the way, I'm not drinking", T-55). Gill is talking about in-the-moment refusal, Casey about advance framing; they are compatible but a product should not blur them.

### B-14 · Eat protein before the event; refuse the designated-driver role
**What a person literally does:** exactly that. Rationale given: *"Hunger is a huge trigger to drink"*; and the DD role traps you until the end of the night.
**Support:** T-55. **Recurrence: 1 show.** The DD point is the single most non-obvious tactic in the corpus.

### B-15 · Peer support + trained professional, deliberately combined
**What a person literally does:** run two channels at once — a therapist or certified coach, *and* a peer group (AA, SMART Recovery, Sober Mom Squad, an online community).
Gill Tietz, "Dry January: What the Research Says", Published 2024-01-01, https://www.youtube.com/watch?v=kum6KLBdBPw · [00:04:24]:
> "this is why support is so important from people that get it or people that are trained to get it so I recommend a support combo to everybody that's therapy or coaching so work with a trained professional either oneon-one or in a group setting and a peer support group"
Her explicit argument for why a supportive spouse is not sufficient ([00:02:39]): *"the problem with people that don't struggle with alcohol that are supportive is they don't understand they think you can just decide to stop drinking and move on with your life"* — corroborated word-for-word in spirit by Rich's wife (T-14).
**Recurrence: 4 shows.** Also the most commercially self-serving recommendation in the corpus (§3).

### B-16 · Low-friction daily community contact, camera off
**What a person literally does:** join a community with multiple daily text/video chats and attend without turning the camera on.
**Support:** T-11. **Recurrence: 2 shows** (Recovery Elevator; Sober Powered's online-meetings-before-in-person ladder, T-18).
The camera-off detail matters: it is the mechanism that lowers activation cost, which is the same barrier Gill names in T-19.

### B-17 · Tell exactly one person
**What a person literally does:** disclose to a single human being, not to a network.
**Support:** T-41. **Recurrence: 2 shows** (Sober Motivation; NPR's *"tell someone in advance"*).
**Paired backfire: B-17b, the mass announcement** — T-40. Jessica broadcast to all family and friends while on the pink cloud and *"deeply regretted"* it, while also crediting it with saving her pregnancy. Design implication: the accountability benefit and the regret are separable, and a product should let a user get the first without the second.

### B-18 · Identity relabel
**What a person literally does:** stop saying "I'm trying not to drink" and start saying "I'm not a drinker" — then attach habits, a morning routine, and people/places to the new label.
**Support:** T-44. **Recurrence: 2 shows** (Sober Motivation; Sober Awkward's Jean McCarthy grieving *"the me that was a drinker"*, T-25, is the same mechanism seen from the loss side).

### B-19 · Quitlit as a self-education stack
**What a person literally does:** read recovery memoir/science books instead of, or alongside, meetings. Rich's named list: *"Unbelievable Joy of Being Sober, Katherine Gray, This Naked Mind"*, plus *Let Them* by Mel Robbins for the social-judgement piece.
**Support:** T-14. **Recurrence: 2 shows.**

### B-20 · Exercise as a PAWS countermeasure, dosed
**What a person literally does:** 30 minutes of moderate-intensity exercise most days.
Gill Tietz, "Post-Acute Withdrawal Syndrome (PAWS)", Published 2024-08-30, https://www.youtube.com/watch?v=3ZNEvyUCzMM · [00:14:53]:
> "at least 30 minutes of moderate intensity exercise most days of the week is good for brain healing stress management feeling relaxed better sleep and your longevity and this can include things like walking jogging swimming or cycling"
**Recurrence: 2 shows.**

### B-21 · Challenge the assumption before the event
**What a person literally does:** write down what you're predicting will happen socially, then check it afterwards. Gill's own worked example (T-23 episode's sibling, https://www.youtube.com/watch?v=REI4LzHydO0 · [00:02:31]):
> "The one that I focused on a lot was how am I going to go to a wedding and not do the champagne toast with everybody what actually happened when I went to my first sober wedding most people didn't even do the champagne toast they had the ability to drink the champagne they weren't sober they just didn't want to"
And [00:04:48], on a real cost she did incur:
> "not getting invited to stuff anymore because that does actually happen and that happened to me a lot actually and this was not so much because people were rejecting me because I didn't drink it was more because they thought they were doing me a favor they knew that I had recently quit and they didn't want to make me uncomfortable so they thought that the best solution was just to not invite me"
**Recurrence: 1 show.** Notable for being an honest mixed report — the feared outcome (rejection) didn't happen; a different real one (exclusion-by-kindness) did.

### B-22 · Say no to the event itself
**What a person literally does:** decline. Same episode · [00:01:02]:
> "someone was asking me my friends want to go out and I don't feel that confident I feel like I might drink and I kind of don't want to go so what should I do and the answer is don't go if you don't want to go don't go I think forget how to say no to things when we're newly sober we think that we have to do everything everybody wants us to do"
**Recurrence: 3 shows** (Sober Powered; NPR T-56; Sober Awkward T-33).

### B-23 · One intentional new thing, not ten
**What a person literally does:** at the point where recovery stops being passive, pick exactly one previously-curtailed interest and make time for it.
**Support:** T-17. **Recurrence: 1 show.** Directly aimed at the months-3-9 gap (§7).

## Techniques that BACKFIRED — consolidated

| # | Technique | Who | What went wrong |
|---|---|---|---|
| 1 | Broadcast disclosure to everyone | Jessica (T-40) | *"I deeply regretted doing that"* — made in a *"post pink cloud haze"*; irreversible; she still credits the effect |
| 2 | 30-day challenge framing | Casey Davidson (T-53) | first two weeks feel bad, last two become *"counting down to drinking as your reward"* — the structure trains the wrong thing |
| 3 | Treating 30 days as sufficient | Will (T-08) | *"I got 30 days. That should be enough"* → daily hidden drinking |
| 4 | "90 meetings in 90 days" as the entry price | Carrie (T-03), Elisa (T-49) | reads as impossible, so people abandon the whole thing; Elisa simply never did it and got sober anyway |
| 5 | Excuses instead of a flat no | Gill Tietz (B-13) | *"the more excuses that you make the more you invite in solutions from other people"* |
| 6 | Volunteering as designated driver | Casey Davidson (T-55) | traps you at the venue until the end |
| 7 | Rearranging the environment *before* stopping | Jean McCarthy (B-10) | the new arrangement just becomes the new drinking spot |
| 8 | "Feeling more in control" after a dry month | Gill Tietz | on the Sussex 80% figure: *"which I guess is good or bad if it convinces you you can moderate"* — the benefit doubles as a relapse route |
| 9 | Geographical cure | Will (RE 587 · [00:28:25]) | partial credit only: *"I know there's in in AA they talk a lot about the geographical cure, but I can't deny it helped a little bit, changing up my circumstances"* — followed by *"I would get a couple months and relapse, get a month, relapse"* |
| 10 | Waiting for motivation | Brad McLeod (T-43) | across ~290 interviews he cannot recall one person who started motivated |
| 11 | Waiting for rescue / rock bottom | Brad McLeod (T-47) | *"the Calvary doesn't come"* |
| 12 | Herbal tea as a direct wine substitute | Jean McCarthy (T-28) | *"I would have politely thrown it across the room"* — substitutes need iteration, not assignment |

---

# SECTION C — THE FIRST 30 DAYS vs MONTHS 3–9

## First 30 days — what people report

**Week 1 is bad and people are surprised by it.** Lydia: *"that initial first week of suck"* (T-09). Casey Davidson: *"in the first two weeks, the withdrawal from alcohol is real. Even if you don't drink a ton, your sleep will be interrupted, you will be tired, you'll have less energy"* (T-53).

**A physiological timeline** (Gill Tietz, T-20 episode, [00:04:37]–[00:06:02]) — flagged as a claim, not verified by me:
> "withdrawal symptoms can begin to show up 12 to 24 hours after your last drink and they'll Peak around 48 to 72 hours"
> "If you don't get DTS you should start to feel better between 3 days and a week as the withdrawal symptoms fade but some can linger like insomnia and anxiety"

**Counter-intuitive early effects people are unprepared for:**
- *Tiredness*, attributed to the brain losing acetate as a fuel source ([00:07:03]).
- *Sugar cravings* — *"craving sugar is really really normal and just don't worry about it in your first month"* ([00:08:07]).
- *Vivid dreams, including drinking dreams*, from REM rebound: *"this can lead to dreams about drinking alcohol again which seem very real and can make you wake up feeling guilty or that you relapsed"* ([00:09:06]).
- *Cognitive worsening first*: *"for the first couple weeks you may experience confusion brain fog irritability being easily distracted trouble concentrating slower reaction times"* ([00:09:28]).
- *Skin getting worse* — six months of acne in her own case (T-21).
- *Grief*, which several people rank as the biggest surprise (T-25).

**The trap at the end of month 1.** Gill Tietz, [00:13:23]:
> "as you get some time away from alcohol and begin to feel better you will probably feel tempted to drink because you're not feeling so horrible anymore so stay on the lookout for that trigger and remember just because you feel a little bit better doesn't mean that you should celebrate that with alcohol"
Lydia's version: *"I got a little itchy around day 29, like I always do"* (T-09). Will's version is the same thought, acted on (T-08).

## The pink cloud, and when it ends

Duration reports in this corpus cluster at **about six months**, not the commonly-quoted few weeks: two speakers in the Sober Powered clip both say *"about six months"* (T-23). Lydia's arrived in month 1 and broke in month 2 (T-09) — much shorter. Jessica puts the average at 90 days: *"now it's 90 days sober. I think kind of on average of the pink cloud wears off"* (Sober Motivation, Jessica episode, [00:45:23]).

**Range across the corpus: ~1 to ~6 months. There is no consensus, and any product that asserts a fixed pink-cloud duration will be wrong for most users.**

The mechanism of the ending is consistently described the same way (T-23):
> "eventually those benefits even out and it's just your life and that's not as exciting and that's when a lot of people will romanticize alcohol again"

## Months 3–9 — the danger zone

This is the thinnest-covered period in the recovery-podcast genre and the most important for your product. What exists:

**1. PAWS is the named clinical frame.** Gill Tietz, PAWS episode ([00:04:32], [00:09:16], [00:09:37]):
> "pause will typically Peak within the first few months"
> "think about how many years you drank and how much alcohol you consumed your brain adapted to all of that 2 weeks of withdrawal is not enough time for our brain to be healed"
> "although paw can continue on or off for up to 18 months"
She also pushes back on over-diagnosis ([00:10:36]):
> "then it's very unlikely that every moment of discomfort you experience is pause sometimes what's really going on is we're experiencing regular life stuff like stress anxiety depression or just feeling uncomfortable and since we never learned how to deal with it it feels"

**2. Month 2 as the crash.** Lydia is the clearest first-person account (T-09), and what she did about it was unglamorous: early bedtimes, sick days, ice cream, and staying in daily contact with a group.

**3. The plateau — the best single description of the post-milestone flatness.** Shane Ramer (T-34, T-35, T-36). His diagnosis is that the person was addicted to chaos, not only alcohol, and that peace reads as deprivation. His reframe: boring is the signal that it's working (T-36). His own admission that he is in it while recording ([00:19:44]: *"This pre-production here took a little bit because I'm going through [ ] as I'm, you know, talking about this kind of stuff. I'm actively going through this stuff, too"*) makes it more credible than most.

**4. Paul Churchill's structural answer** — the passive→intentional handoff (T-17). His claim is that early recovery improves *on its own*, and that at some undefined point the free improvements stop and you must start choosing. That is precisely the months-3-9 cliff, and "pick one thing, not ten" (B-23) is the only concrete protocol anyone in this corpus offers for it.

**5. Jessica's long view** (Jessica episode, [00:45:23]):
> "I mean, emotions, relationships, careers, jobs, bank account, keeping that out of the red. I had to learn all of these things and it did take time years to work through stuff."

**Gap worth naming:** nobody in this corpus offers a *scheduled intervention* for months 3–9. The advice is all reactive (notice the plateau, reframe it) or generic (more support). If your product does anything here, it is doing something the genre does not.

---

# SECTION D — REBUILDING A SOCIAL LIFE

Three distinct strategies appear, and they are genuinely different — not variants:

**Strategy 1 — Keep the venue, change the exit time.** Ben Gibbs still does pub crawls, drinks AF beer, leaves at 11pm, drives home (T-31). His social group also self-selected over time toward lighter drinkers (T-32). Lowest disruption; requires that the drinking network wasn't the problem.

**Strategy 2 — Change the format.** Brunch, coffee, walks, yoga, guitar, books instead of happy hour (T-30; NPR: *"try new activities, whether it's picking up a bunch of books or taking up guitar or going to a yoga class, moving from happy hours to brunches"*). Ladder in gently: Gill's advice is *"take baby steps so don't challenge yourself to go to all of these parties all at once go to smaller things that you're comfortable with hang out with your friends oneon-one go to brunch uh go on a walk"* (REI4LzHydO0 · [00:05:24]).

**Strategy 3 — Build a parallel sober network first.** Online meetings before in-person; a city-specific Facebook sober group; ask someone there to take you to your first meeting so you arrive with a buddy (T-18). Then daily camera-off community chats (T-11). Structured leagues also appear — Shane Ramer's co-ed beach volleyball league, jiu-jitsu, a men's softball league (jDUIWgXkNrw · [00:41:45]).

**What people report actually losing.** The honest accounts are not "my friends rejected me":
- Invitations quietly stop, *because people think they're being kind* (T-21 episode's sibling, quoted at B-21).
- The circle shrinks and reveals which relationships were *"a drinking arrangement"* (T-45).
- The evening has a cliff-edge — the point at which drinkers board the train and you're on the platform (T-33).

**The specific fear that turns out to be unfounded**, in two independent accounts: the champagne toast / being handed a drink. Gill: *"no one has ever handed me a drink at a party so it's unlikely that that will happen"* (REI4LzHydO0 · [00:02:09]), and the wedding toast worry that evaporated (B-21).

---

# SECTION E — SOBER POWERED'S RESEARCH CLAIMS

Gill Tietz is the only host in this corpus who cites sources. Below: her claim as stated, the study she names, and my assessment of whether it needs independent checking. **I have not verified any of these against the primary literature — that was outside the retrieval I did. Each is listed so you can.**

**Count the lossy steps before you trust any number here.** A published paper → a host paraphrasing it from memory in a monologue → a speech-recognition engine → my extraction. That is three transformations before the number reaches this table, and **two of them can silently change a digit**. The quotes below are verified verbatim against the caption track (§2a), which means I can vouch that *she said this*; it is no evidence at all that *the paper says this*. Treat every row as a pointer to a study to go read, never as a citation. Where she names no study, the row is a research lead, not a finding — and **6 of the 10 rows name no study at all**.

| # | Claim (verbatim) | Study she names | Verify? |
|---|---|---|---|
| R-1 | *"research from the University of Sussex found that 93% of participants had a sense of achievement 88% saved money 82% thought more deeply about their relationship with alcohol 80% felt more in control of their drinking ... 76% learned more about when and why they drink 71% realized they don't need a drink to enjoy themselves 70% had improved Health 71% slept better 67% had more energy 58 58% lost weight 57% had better concentration and 54% had better skin"* (the doubled "58 58" is in the caption track, not a typo here) (kum6KLBdBPw · [00:00:00]) | "University of Sussex" — no author/year given | **Findable.** This is the de Visser Dry January participant survey (Sussex / Alcohol Change UK). ⚠ **Self-report from self-selected Dry January sign-ups, no control group.** She presents it as "research" without that caveat. The 80%-feel-more-in-control figure she does flag herself as double-edged. |
| R-2 | *"a 2018 study published in the British medical journal looked at drinkers who were drinking about 18 drinks a week that quit for a month and found that quitting for a month improves insulin resistance weight blood pressure and cancer related growth factors"* (same · [00:00:55]) | "2018 study... British medical journal" | **Findable** — almost certainly Mehta et al., *BMJ Open* 2018. ⚠ Note *BMJ Open* ≠ *The BMJ*; small, non-randomised. Worth pulling the n. |
| R-3 | *"70% of the dry January participants that received support during the month were able to successfully complete the challenge compared to 36% who did it alone"* (same · [00:01:57]) | unnamed "another study" | **Verify.** No citation given. Likely also de Visser/Alcohol Change UK. ⚠ "Support" here is probably *signing up for the official Dry January app/emails*, which is a selection effect as much as an intervention. This is the number most likely to be over-read. |
| R-4 | *"Between 40 to 60% of people relapse in their first year. In the second year, about 21% ... In years three to five, the relapse risk drops down to a little bit under 10%, and after 5 years, the risk of relapse drops to about 7%"* (r_ICVR_gUoQ · [00:00:22]) | none named; refers listeners to her own episode 252 | **Verify carefully.** ⚠ The 40–60% figure is the well-known NIDA *general* chronic-relapse statistic, frequently mis-applied to alcohol specifically. The 21% / <10% / 7% series resembles Dennis/Scott/Laudet long-term remission data. **Flag: presented as one coherent dataset when it is likely stitched from several.** |
| R-5 | *"they have some small amount of risk that they could develop alcohol use disorder. And that risk is around 7 to 9% depending on where you look. So, at the 5-year mark, or at the 3 to 5-year mark, depending on what data you're using, your risk of relapse is similar or equivalent to the risk of a regular old person developing alcohol use disorder."* (same · [00:00:47]–[00:01:36]) | none | **Verify.** ⚠ This is a rhetorically powerful equivalence that compares a *lifetime prevalence* number to an *annual relapse* number. **Likely an apples-to-oranges comparison. Highest-priority claim to check before reusing.** |
| R-6 | *"It's estimated that about 75% of people who get sober from alcohol experience pause"* (3ZNEvyUCzMM · [00:02:45]) | none | **Verify.** ⚠ The 75% PAWS figure circulates widely with no traceable primary source. She immediately hedges it (*"this does not mean that 75% of people in recovery suffer"*), which is honest, but the number itself is soft. PAWS is not in DSM-5. |
| R-7 | *"paw can continue on or off for up to 18 months"* / *"pause will typically Peak within the first few months"* (same) | none | **Verify.** Same provenance problem. |
| R-8 | *"acetal dhide ... this toxin is actually 10 times more toxic than alcohol itself"* (P4pnyUH8z68 · [00:02:13]) | none | **Verify.** Commonly stated as 10–30×; the specific multiplier depends heavily on the endpoint measured. Low stakes but imprecise. |
| R-9 | *"eventually the brain prefers to use acetate for energy instead of glucose so when you stop drinking now all of a sudden you've deprived your brain of its now preferred energy source"* (same · [00:07:23]) | none | **⚠ Sounds overstated.** There is real work (Volkow, Jiang et al.) on heavy drinkers' brains taking up more acetate. "Prefers ... instead of glucose" is a strong reading of it. **Flagged as the most likely oversimplification in her physiology.** |
| R-10 | *"liver fat can decrease by up to 20%"* after one month (same · [00:11:11]) | none | **Verify.** Plausible, traceable to the same dry-month literature as R-2. |

**One non-Sober-Powered research claim, for completeness:**

| R-11 | *"people with ADHD are estimated to be two to three times more likely to struggle with substance use disorders"* — Jessica, Sober Motivation ([00:04:13]). She explicitly disclaims: *"I don't know the exact stats in front of me"* and *"You could obviously Google this to find, you know, the specific studies"*. **Honest sourcing; verify independently.** Relevant because Carrie independently attributes her need for daily written planning to ADHD (T-02). |

**Overall on Sober Powered:** she is meaningfully better than the rest of the genre — she names Sussex and *BMJ*, she distinguishes her own experience from generalisable data (*"you can't use someone else's experience with withdrawal to gauge your own"*), and she volunteers counter-evidence (the 80%-more-in-control double edge). But **the majority of her numbers are delivered without a citation**, and R-5 and R-9 look like real overstatements. Do not treat "Sober Powered said it" as sourcing.

---

# SECTION F — UNVERIFIED — no transcript

Recorded here without quotation marks. Nothing below was read; these are leads, not evidence.

- **The Addicted Mind** (host Duane Osterlind) — episode pages carry summaries only; the YouTube channel has captions disabled, confirmed by `yt-dlp --list-subs`. Candidate episodes if you obtain audio: Ep 297 "Building a Sober Life One Day at a Time with Justin McClure" (https://www.youtube.com/watch?v=qvrH2nUjghM); Ep 293 "Finding Emotional Freedom Through Sobriety with Veronica Valli" (https://www.youtube.com/watch?v=Q9Tm1z1zLnQ); Ep 292 "Personalized Recovery Paths for Atheists with Jeffrey Munn" (https://www.youtube.com/watch?v=4iRD6CJIuKE); Ep 355 with Dr Scott Teitelbaum (https://theaddictedmind.com/episode-355-overcoming-addiction-dr-scott-teitelbaums-journey-of-resilience-and-redemption/).
- **This Naked Mind Podcast** (Annie Grace) — no transcripts. Relevant-looking episodes: EP 201 "Sober Bliss with Gayle" (https://thisnakedmind.com/ep-201-sober-bliss-with-gayle/); EP 65 "Moderation"; EP 286 "Are You Sober?".
- **Recovery Happy Hour** (Tricia Lewis) — recoveryhappyhour.com did not resolve on 2026-08-17 (DNS failure). Status of the show unknown. Host interviewed on third-party channels if a secondary account is acceptable.
- **The Bubble Hour** — out of production, per its own former host (T-26). Archive episodes exist on Apple/Amazon without transcripts. Its former host Jean McCarthy is well covered above via Sober Awkward.
- **Since Right Now**, **Seltzer Squad**, **Take 12 Recovery Radio**, **Home Podcast** (Laura McKowen & Holly Whitaker) — no transcripts located by site check or aggregator search.
- **Sober Powered episode 252** — the episode Gill Tietz says contains her full review of the quit-attempts literature (referenced in T-22's episode). **This is the single highest-value unretrieved item in the whole exercise** — it is where R-4 and R-5 would be sourced. Not on her YouTube channel in the 40 most recent uploads.
- **Sober Powered, "Non-Alcoholic Drinks and Mocktails: Are They OK for Your Sobriety"** (https://www.youtube.com/watch?v=eZ1jaulZxik) — not retrieved; would likely contain a backfire account for technique B-09.
- **Sober Awkward episodes not retrieved but topically on-point:** "Naltrexone - Can You Drink Your Way Sober? - with Katie Herzog" (https://www.youtube.com/watch?v=2eJ4hP7LUyY) — **the only medication-focused episode found anywhere in this corpus**, and a notable gap given §3; "Sober in the Country - with Shanna Whan AM" (retrieved but not mined); "The Hidden Struggle of the High Functioning Drinker - with James Swanwick" (retrieved but not mined); "When Booze Becomes Part of Belonging – with Karl Considine" (retrieved but not mined).
- **Retrieved but not mined for quotes** (transcripts stored, available for a second pass): Recovery Elevator RE 579 (Butch, Indianapolis); That Sober Guy "I Was Sober for 11 Years... But Still Miserable | Matt Farnsworth", "How Do You Stay Social Without Drinking?", "What Is Life Like After Quitting Drinking? | Paul Churchill"; Sober Motivation episodes for Matt, Mailinn, Luke, and "She thought she was stronger than alcohol".

---

## Method note (for your spot-check)

- YouTube captions: `yt-dlp --skip-download --write-auto-subs --write-subs --sub-langs en --sub-format vtt`, then a VTT→text pass that strips markup, de-duplicates rolling caption lines, and groups into ~8-line blocks stamped with the block's start time. **Timestamps in this document are the start of the containing block, so a quote may begin a few seconds after the stamp.**
- PodScripts: raw HTML fetch, then extraction of `.transcript-text` spans grouped by `data-group-id`, stamped from each group's "Starting point is HH:MM:SS".
- NPR: raw HTML fetch, `<p>` extraction. Human transcript, no ASR.
- To spot-check any quote: open the URL, seek to the stamp, listen. For the ASR sources expect small word-level differences; if the *substance* differs, that is a real error and I want it flagged.
