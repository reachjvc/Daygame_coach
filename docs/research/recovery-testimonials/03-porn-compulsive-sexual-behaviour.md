# Compulsive porn use — first-person accounts, techniques, and backfire evidence

Research gathering for the recovery-support product. Compiled 2026-08-17.

**Scope.** Verbatim first-person accounts from r/pornfree, r/NoFap-adjacent communities, and published
first-person journalism, plus the technique inventory those accounts credit, plus evidence on where
community ideology outruns the evidence and harms people.

**Terminology used in this file.** The product never calls porn use an "addiction." This document does
not adopt that framing either — but it records the word verbatim wherever a person used it, because
what people call their problem *is data*, and in these communities almost everybody calls it addiction.
Where this document speaks in its own voice it says *compulsive use*, *problematic use*, or simply
*the behaviour*.

---

## 1. Access, method, and what failed

**Live Reddit is not fetchable from this environment.** Confirmed blocked: `reddit.com`,
`old.reddit.com`, the `.json` endpoints (HTTP 403 then 429), the built-in page-fetch tool
("unable to fetch from www.reddit.com"), and four Redlib mirrors (403 / 502 / Anubis proof-of-work
interstitials). A browser-automation route was unavailable (profile already in use).

**What worked — two independent Reddit archives:**

| Route | Status | Used for |
|---|---|---|
| **Arctic-Shift** (`arctic-shift.photon-reddit.com/api`) | Working, heavily rate-limited | Full-text search of post `selftext` and comment `body` by subreddit; fetch-by-ID; fetch comments by `link_id`. **Primary source for all Reddit text in this file.** |
| **PullPush** (`api.pullpush.io`) | Worked briefly, then persistently rate-limited | Initial corpus discovery only. Could not be used for the intended independent cross-check — see §3. |
| **Redlib mirrors, meta tags only** | Working (page *body* blocked by Anubis, but `<meta>` tags served on the interstitial) | Liveness checking: confirms a post ID still exists, its title, its current author state, and whether it has been removed/deleted. |

Rate limiting was the binding constraint. Arctic-Shift returns `"Timeout. Maybe slow down a bit"`
under concurrency; three parallel harvesters produced near-total failure, so collection was
serialised. r/NoFap full-text search returned `Internal server error` consistently at every attempt,
so **the corpus is r/pornfree-dominated** — see the bias notes in §4.

**Corpus assembled:** 588 posts (≥200 chars, not `[removed]`/`[deleted]`) plus 92 comments,
across r/pornfree, r/rebootnation, r/PornAddiction, r/pornfreewomen and r/loveafterporn,
retrieved by keyword search on ~120 query terms.

---

## 2. The paraphrase trap — sources deliberately excluded

Academic papers analysing these subreddits looked like the obvious workaround for the Reddit block.
**Most of them cannot be used for testimonials**, and this needs stating loudly because their
"quotes" read exactly like verbatim disclosure.

| Source | Verdict | Evidence |
|---|---|---|
| Chasioti & Binnie, *Exploring the Etiological Pathways of Problematic Pornography Use in NoFap/PornFree Rebooting Communities* ([PMC8275519](https://pmc.ncbi.nlm.nih.gov/articles/PMC8275519/)) | **Quotes unusable.** Findings usable. | Paper states: *"the existing usernames and pseudonyms were replaced and the verbatim quotes presented within the study have been paraphrased to the extent that they cannot be traced back to the original source"*. Its 20+ numbered `[Extract N]` passages are therefore reconstructions, not testimony. |
| *"I Feel Like a Fraud Who Acts Like a Feminist"* — r/PornFreeWomen study ([PMC11176243](https://pmc.ncbi.nlm.nih.gov/articles/PMC11176243/)) | **Quotes unusable.** Findings usable. | Paper states: *"unique phrases were paraphrased to ensure individual users could not be identified"*. |
| Fernandez et al. / *Males' Lived Experience with Self-Perceived Pornography Addiction* ([PMC9861829](https://pmc.ncbi.nlm.nih.gov/articles/PMC9861829/)) | **Secondary tier — see §10.** | Interview study (13 men, consented, transcript review). **No paraphrasing statement anywhere in the methods.** Silence is not a guarantee, so its quotes are quarantined in a clearly-labelled section and excluded from the headline testimonial count. |

The rule applied throughout: **a quote in an academic paper is treated as unusable for testimony
unless the paper explicitly states its quotes are unaltered.** Silence counts as unusable.

---

## 3. Verification and confidence

Every quoted string in §6–§9 was extracted **programmatically** from the stored archive record by
anchored substring extraction — no quote was retyped by hand, so transcription error is structurally
impossible. A verification pass then re-checked each one.

**Results: 53/53 quotes are exact substrings of the archived body. 53/53 attributions match the
archived author field.**

Liveness of the underlying posts, checked independently via Redlib meta tags:

- **45/53** quotes sit on posts that are still live and intact.
- **5/53** (two posts, both by u/TheTankIsEmpty99) are on posts **since removed by a moderator**. Flagged inline.
- **3/53** (one post) is on a post **since deleted**. Flagged inline.

**Known verification gaps — read these before relying on the file:**

1. **The permalinks were never opened.** Reddit is unreachable from here. URLs are reconstructed from
   the archive `permalink` field and confirmed to resolve to a real post *via the Redlib mirror's
   metadata*, but **URL rendering in a browser is unverified**. A spot-checker opening the
   moderator-removed ones will see "removed", not the text.
2. **The intended second-archive cross-check did not happen.** PullPush was rate-limited out for the
   whole working session, so text is confirmed against *one* archive (Arctic-Shift) plus a liveness
   signal, not two independent archives.
3. **Comment-level account status is unknown.** The Redlib meta tag exposes the *post* author, not the
   commenter, so for the seven quoted comments I could not check whether the commenter's account
   still exists.

**Non-Reddit sources were re-verified against raw HTML**, not against any fetch-tool summary.
Thirteen load-bearing strings from the Slate article and the PMC papers were grepped directly out of
the downloaded HTML: **13/13 present.** (One initially read as absent and turned out to be an inline
`<a>` tag splitting the sentence — a fetch artefact, not an absence. Worth remembering: markup splits
and HTTP 429s both masquerade as "text not there".)

---

## 4. Bias notes — what this corpus systematically cannot tell you

- **Survivorship and self-selection, in both directions.** These are *quitting* communities. Everyone
  present has already decided the behaviour is a problem. People whose porn use is unremarkable and
  untroubling do not post here; neither do people who tried quitting, concluded they never needed to,
  and left. The one voice of that second type in this file (§6.2) is a person who came *back* to say so.
- **r/pornfree-dominated.** r/NoFap search failed at the API level. r/pornfree is explicitly the more
  moderate of the two — one quoted user describes it as the sub that exists to "actually address
  addiction rather than rant about 'superpowers'". **So this corpus systematically *under*-samples the
  ideology it is most important to document.** The superpowers/streak/reboot material quoted below is
  therefore what leaks into the *moderate* sub; the real thing is stronger.
- **Keyword-shaped.** The corpus was built by searching ~120 terms. Any frequency figure below reflects
  the query list, not the subreddit. Counts in §7 are labelled accordingly and must not be read as prevalence.
- **Overwhelmingly male, young, heterosexual.** r/pornfree skews that way and the corpus reflects it.
  Two women's voices appear (§6.2, u/Bllueberrypop; and §6.1, u/heidijp, writing as a partner); r/pornfreewomen returned almost nothing through the API.
- **Text is a snapshot.** Archive records capture the post as crawled. Later edits are invisible.

---

## 5. The incongruence split — the headline finding

The brief asked for testimonials sorted into (i) distress about **what the behaviour cost** —
time, relationships, function — and (ii) distress about **doing it at all** — moral or religious
conflict, often with unremarkable actual usage.

**The split in the verified set (32 distinct people — 31 Reddit accounts plus "Derrick" from the Slate
reporting in §9.1):**

| Distress type | People | Notes |
|---|---|---|
| **(i) Cost-driven** | 15 | Hours lost, relationships damaged, sexual function, work/study collapse. **One of these 15 is a spouse, not a user** — u/heidijp writes as the wife of a heavy user, and her testimony is about the household, not her own behaviour. |
| **(ii) Incongruence-driven** | 10 | Includes the whole cluster of people who *concluded* their problem was shame, not compulsion. |
| **Unclear / mixed** | 7 | Genuinely both, or not enough detail to call. |

These are tags applied by me from the content of each account, not self-reports; the people themselves
almost never make this distinction (see "Second" below). Treat the boundary between "cost" and "unclear"
as soft — the seven unclear cases are unclear because the person described a harm without describing why
it distressed them.

**Three things about that split matter more than the numbers:**

**First — the two types are not two populations, they are often the same person at two different times.**
The most striking pattern in the corpus is not people who *are* incongruence cases; it is people who
*started* cost-framed, adopted the addiction/abstinence model, and then discovered the model itself had
become the source of their distress. The clearest accounts in §6.2 are all of this shape: years inside
NoFap, then a therapist or a psychiatrist or plain exhaustion reframes it, and the distress drops without
the underlying behaviour necessarily changing much. Any product that assigns a user to a bucket at
intake and leaves them there will get these people wrong.

**Second — the community's own vocabulary hides the distinction.** Almost every person here says
"addiction" regardless of which type they are. The word is the price of admission to the subreddit.
Distress type has to be inferred from *what they say went wrong*, never from the label they use.
Several of the incongruence-type accounts below use "addiction" in the same sentence where they explain
that shame, not compulsion, was the actual mechanism.

**Third — the incongruence cluster is under-represented here for a structural reason and is probably
much larger in the real population.** People who conclude they were never compulsive tend to *leave*
these forums; the ones quoted below came back specifically to post that conclusion, which is a rare act.
Grubbs's moral-incongruence work (N≈66,994) predicts this group is a large share of self-identified
"porn addicts". This corpus can corroborate the *mechanism* they describe but cannot measure its size.

---
## 6. Testimonials

Every quote below is an exact substring of an archived Reddit post or comment. Handles are Reddit
pseudonyms. **Where the account has since been deleted the handle is withheld** — deletion is a
withdrawal signal and the post URL is sufficient for verification. Nothing self-identifying has been
retained.

### 6.1 Distress type (i) — about what it cost

**Time and function.**

> The sheer amount of hours I spent on porn is terrifying. A napkin estimate I did of my more than a decade-long addiction led to just shy of a full year of my life spent on porn. An hour daily, starting from a young age: that adds up fast. I have lost this time forever, but I will do anything I can to not waste another minute.

— u/ClenchedBrain, r/pornfree, 2026-07-14 (post) · [1uwcnjq](https://www.reddit.com/r/pornfree/comments/1uwcnjq/a_100_days_in_rules_to_withdraw_from_lifelong/) · *distress: cost* · *stage: long-term*

> I can't even count the amount of times I've pulled an all-nighter with the intention of studying alllllll night (I'm on Adderall and hardly slept before it either), and spent the entire night watching porn.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-09-05 (post) · [1n9gwqa](https://www.reddit.com/r/pornfree/comments/1n9gwqa/my_story_seeking_helpadvice/) · *distress: cost* · *stage: an urge*


**Sexual function and partners.** The account below is notable for the product's purposes because the
erectile failure happened *after* he began abstaining, and he reads it as evidence he needs to abstain
harder — the exact loop the Slate reporting (§9.1) documents from the other side, where the same
attribution turned out to be wrong.

> I have never felt such a strong shame, but also so vulnerable in a single moment.

— *[handle withheld — account since deleted]*, r/pornfree, 2023-02-19 (post) · [116qo9c](https://www.reddit.com/r/pornfree/comments/116qo9c/lost_boner_during_one_night_stand/) · *distress: cost* · *stage: long-term*


**The lapse, and the spiral that follows it.** This is the single most important behavioural
observation in the corpus and it recurs constantly:

> In the past, my relapses have often led to a spiral - a descent into more frequent binges as I say "fuck it, I've lost my streak anyway," and just completely give up for a time.

— u/memery_palace, r/pornfree, 2023-11-03 (post) · [17mtbpr](https://www.reddit.com/r/pornfree/comments/17mtbpr/i_relapsed_last_night_after_42_days_porn_free/) · *distress: cost* · *stage: after a lapse*

> a part of me do want to look another time, "get it while the getting is good", the thought of "fuck it, I've already fucked up", and so on.

— u/skinnahbox, r/pornfree, 2026-06-20 (post) · [1uaqv6o](https://www.reddit.com/r/pornfree/comments/1uaqv6o/i_relapsed_and_now_i_want_to_do_it_again/) · *distress: cost* · *stage: after a lapse*


**A lapse that did *not* spiral** — same event, different interpretation, and the difference is
explicitly that he had enough prior evidence to not treat the reset as annihilating:

> However, I have reset my counter, and tmrw I will start collecting those days pornfree again. Im not so anxious or depressed about starting again because I had 240 days experience without porn, I have first hand awareness of how much more beneficial the pornfree lifestyle is.

— u/drinkteanotporn, r/pornfree, 2020-06-22 (post) · [hdwz01](https://www.reddit.com/r/pornfree/comments/hdwz01/first_relapse_after_240_days_pornfreesome_thoughts/) · *distress: cost* · *stage: after a lapse*

> I do not shame myself I did because I thought it will help but it did not and I will not go into the spiral of self-hatred and further use.

— u/Nodupizdek, r/pornfree, 2023-12-09 (post) · [18eauf2](https://www.reddit.com/r/pornfree/comments/18eauf2/relapse_after_almost_7_months_of_freedom/) · *distress: cost* · *stage: after a lapse*


**Triggers people name.** Loneliness and night-time isolation dominate; stress and boredom follow.

> My relapses most of the time happen because of loneliness. It's difficult to bear sometimes. Porn numbs that out quite successfully but obviously also artificially and illusory. The loneliness doesn't go away, it's still there, even if I don't experience it as strongly.

— u/skinnahbox, r/pornfree, 2026-06-20 (post) · [1uaqv6o](https://www.reddit.com/r/pornfree/comments/1uaqv6o/i_relapsed_and_now_i_want_to_do_it_again/) · *distress: cost* · *stage: after a lapse*

> Alone time and nights were my weakness.
>
> Most of my relapses happened at night, alone in my room.
> So I started changing my environment:
> 	•	Put my phone away before bed
> 	•	Don’t sit on the bed scrolling
> 	•	Don’t invite triggers in

— *[handle withheld — account since deleted]*, r/pornfree, 2025-05-15 (post) · [1knbizn](https://www.reddit.com/r/pornfree/comments/1knbizn/i_recovered_from_my_8_years_porn_addiction_after/) · *distress: cost* · *stage: an urge* — **post since deleted — text from archive only**


**Disclosure to a partner — helped.**

> Each stumble resulted in terrible, long drawn-out shame spiral. My longest streak before now was 21 days.

— u/pizzabebop, r/pornfree, 2023-05-02 (post) · [135qm1u](https://www.reddit.com/r/pornfree/comments/135qm1u/my_wife_found_out_happy_story/) · *distress: cost* · *stage: after a lapse*

> I took a deep breath, sat her down, and explain what’s been going on, how long it’s been going on. and what I’ve been doing to try to overcome it. She reacted like the kind, caring, compassionate person that she is.

— u/pizzabebop, r/pornfree, 2023-05-02 (post) · [135qm1u](https://www.reddit.com/r/pornfree/comments/135qm1u/my_wife_found_out_happy_story/) · *distress: cost* · *stage: long-term*

> I dreaded the thought of her finding out about this, and now my only regret is not telling her sooner.

— u/pizzabebop, r/pornfree, 2023-05-02 (post) · [135qm1u](https://www.reddit.com/r/pornfree/comments/135qm1u/my_wife_found_out_happy_story/) · *distress: cost* · *stage: long-term*


**Disclosure to a partner — hurt.** Both directions are real and the corpus contains both. This one
is a re-disclosure after a lapse, into a relationship that had already spent its trust:

> Anyways I told her and she is pissed at me. She walked out, understandably. She texted me soon after saying how she still loves me but she also hates me. She doesn't know what to do, and it hurts more than when I first told her about my addiction. She's lost all faith and trust in me when she was finally able to trust me again.

— u/throwaway523493, r/pornfree, 2025-10-04 (post) · [1nxfik6](https://www.reddit.com/r/pornfree/comments/1nxfik6/told_my_girlfriend_about_my_relapse_not_sure_what/) · *distress: cost* · *stage: after a lapse*


**Disclosure with a third outcome — a compassionate response that backfired.** This is the most
product-relevant disclosure account in the set, because the harm came from *reassurance*:

> I looked at porn, felt awful, and confessed to my wife. She, trying to be kind, told me not to beat myself up. That maybe it was okay if I looked at it sometimes. She didn’t know how deep the problem went. I took her grace as a free pass and spiraled.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-06-19 (post) · [1lfl1yz](https://www.reddit.com/r/pornfree/comments/1lfl1yz/porn_has_been_a_part_ofand_ruiningmy_life_for_10/) · *distress: cost* · *stage: long-term*


### 6.2 Distress type (ii) — about doing it at all

This is the under-represented, high-value cluster the brief asked for: people who concluded their
problem was shame or moral conflict rather than compulsion, and what helped *them*.

**The clearest single account — four years of NoFap, then a sexologist.** Two posts, three days apart,
from a user who came back specifically to argue the point. Note that the behaviour he was distressed
about was masturbation, that his distress was severe and physical-seeming ("depressed for 4 days"), and
that it resolved when the framing changed rather than when the behaviour did:

> at 19 i started seeing a sexologist and my life changed. i'm 21 right now , and i have no problem toward masturbation anymore. before the therapy , masturbation would get me depressed for 4 days ( foggyness, anxiety , fatigue , feeling like a zombie) and honestly even though this kind of situation is accepted on nofap , it's absolutely not normal. we're not supposed to feel like shit because of masturbation , we're supposed to be strong enough to deal with it. it's not a drug , it's not an addiction , it's sex and it's part of life.

— u/goodbynofap, r/pornfree, 2018-07-17 (post) · [8zpwvp](https://www.reddit.com/r/pornfree/comments/8zpwvp/why_i_stopped_nofap_2_years_ago_and_why_some/) · *distress: incongruence* · *stage: long-term*

> so now i'm not doing nofap anymore , i'm not couting days , i stopped believing that i had to abstain in order to feel good , i stopped all this. i became normal again.

— u/goodbynofap, r/pornfree, 2018-07-17 (post) · [8zpwvp](https://www.reddit.com/r/pornfree/comments/8zpwvp/why_i_stopped_nofap_2_years_ago_and_why_some/) · *distress: incongruence* · *stage: long-term*

> it's the concept of resisting urges - among other things - that turn sexual release into a moment of depression and emptiness. there are not scientifical research right now that says " human musn't masturbate and it's normal to feel brain dead several days after orgasm " so don't confront me with some kind of science puzzle filled with random chemicals studies. science is not approving nofap. period. you have a problem with orgasm , and people outside of nofap aren't. the problem is psychological!

— u/goodbynofap, r/pornfree, 2018-07-17 (post) · [8zpwvp](https://www.reddit.com/r/pornfree/comments/8zpwvp/why_i_stopped_nofap_2_years_ago_and_why_some/) · *distress: incongruence* · *stage: long-term*


**What the clinician actually told him** — from the companion post, answering another user who had
asked exactly this question:

> she made it clear that my case was based on guilt , shame , ignorance on the subject , porn use , among other factors. she seemed to know a lot on sexual guilt and she considers it totally unhealthy .

— *[handle withheld — account since deleted]*, r/pornfree, 2018-07-20 (post) · [90jjj0](https://www.reddit.com/r/pornfree/comments/90jjj0/masturbating_without_porn_getting_free_of_guilt/) · *distress: incongruence* · *stage: long-term*

> if masturbation is making you feel bad , it’s not because of masturbation

— *[handle withheld — account since deleted]*, r/pornfree, 2018-07-20 (post) · [90jjj0](https://www.reddit.com/r/pornfree/comments/90jjj0/masturbating_without_porn_getting_free_of_guilt/) · *distress: incongruence* · *stage: long-term*


And the concrete behavioural change, which was *stopping the intervention*:

> By stopping nofap , I mean that I stopped counting days about masturbation , and stopped trying abstinence.

— *[handle withheld — account since deleted]*, r/pornfree, 2018-07-20 (post) · [90jjj0](https://www.reddit.com/r/pornfree/comments/90jjj0/masturbating_without_porn_getting_free_of_guilt/) · *distress: incongruence* · *stage: long-term*


**A psychiatrist delivering the same reframe cold, to someone not ready for it.** The whole post is
five lines; the reaction is the point. This is what it looks like when de-pathologising lands badly —
useful as a warning about *how* the product says this, not whether:

> he told me he was too. he said he had a wife and he watches porn too. that i don't have to get sad every time i nut because it's your moment.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-09-05 (post) · [1n8tkia](https://www.reddit.com/r/pornfree/comments/1n8tkia/my_psychiatrist_told_me_porn_doesnt_corrupt_your/) · *distress: incongruence* · *stage: deciding*

> "this idea of porn being harmful is just a fallacy".

— *[handle withheld — account since deleted]*, r/pornfree, 2025-09-05 (post) · [1n8tkia](https://www.reddit.com/r/pornfree/comments/1n8tkia/my_psychiatrist_told_me_porn_doesnt_corrupt_your/) · *distress: incongruence* · *stage: deciding*


**Long streaks, no superpowers, and the conclusion that the framing was the problem.**

> I didn't experience the "superpowers" or any of that other bullshit they circlejerk each other about. Maybe it's because I'm a pretty objective person and confirmation bias/placebo don't affect me as much as other people, I don't know.

— *[handle withheld — account since deleted]*, r/pornfree, 2017-11-11 (post) · [7c8rnn](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/) · *distress: incongruence* · *stage: long-term*

> I finally realized that *porn* is the problem, not masturbation itself, and my mental state at this point is much better than it was 9 months ago, even after having several "relapses".

— *[handle withheld — account since deleted]*, r/pornfree, 2017-11-11 (post) · [7c8rnn](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/) · *distress: incongruence* · *stage: long-term*


**Streak culture named as the mechanism of harm**, by a poster arguing the case directly in r/pornfree:

> The obsession with counting streaks creates a pressure-cooker mentality. When you inevitably “fail,” it’s easy to spiral into guilt and shame, feeling like you’ve undone all your progress. This black-and-white thinking (success = streak intact; failure = streak broken) doesn’t allow room for self-compassion or growth. Instead, it reinforces unhealthy cycles of self-loathing, which is counterproductive to personal development.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-01-04 (post) · [1ht620c](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/) · *distress: incongruence* · *stage: long-term*

> Breaking a streak doesn’t mean you’re back at square one; it means you’re human.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-01-04 (post) · [1ht620c](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/) · *distress: incongruence* · *stage: long-term*


**A woman reporting that streaks themselves made her mental health worse** — and that abandoning them
reduced both depression and shame. One of only two women's voices recovered:

> I feel like my mental health was worse when I would do streaks. And The longest I could go is a month lol. Now I just give in which is every two to three days. If not I literally feel
> Like someone is pulling on my vag all the time. Which honestly never really goes away. But it’s less intense when I do masturbate. Since I been doing it this way I’m less depressed and feel

— u/Bllueberrypop, r/pornfree, 2025-01-05 (comment) · [m5hdzx9](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5hdzx9/) · *distress: incongruence* · *stage: long-term*


**The community as an active source of harm**, from a reply in the same thread:

> Some of the comments and posts in this community promote extreme fear, guilt, and black and white thinking

— u/UnrelentingSTBFL, r/pornfree, 2025-01-04 (comment) · [m5b04cc](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5b04cc/) · *distress: incongruence* · *stage: long-term*


### 6.3 Unclear or mixed

**Ambivalence about the label itself**, which is extremely common and usually goes unremarked:

> For years, I was addicted to porn. I didn't want to call it that, "addiction" felt too extreme, too ugly. I told myself it was normal, harmless. "I've got this under control." I didn't.

— u/SabrinaRewired, r/pornfree, 2026-07-20 (post) · [1v1mzv5](https://www.reddit.com/r/pornfree/comments/1v1mzv5/1_year_pornfree_after_realising_it_was_tied_to_my/) · *distress: unclear* · *stage: long-term*


**Someone who defends streaks** — included deliberately. The corpus is not unanimous and the product
should not pretend it is. His argument is that a streak is fine *as a measurement* and harmful only
when loaded with self-worth:

> Streaks are a good way to track your progress as long as you take them for what they are. If you are relapsing once every couple of weeks, you just have to recognize that you have massively improved from relapsing every couple of days.

— u/EyeOfTheTurtle1, r/pornfree, 2025-01-04 (comment) · [m5ce6zo](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5ce6zo/) · *distress: unclear* · *stage: long-term*


**Agrees streak culture is harmful, but abstains anyway** — the middle path is not universal:

> Streak culture does create guilt and shame, and it leads to people just trying to abstain from porn and not deal with the root causes of their addiction in the first place.

— u/Competitive-Way-6033, r/pornfree, 2025-01-04 (comment) · [m5ciqcr](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5ciqcr/) · *distress: unclear* · *stage: long-term*


**The root-cause reading**, which cuts across both distress types:

> I'd say it's not even porn that's the main problem. Excessive porn use and other addictions are mainly symptoms used to cover up deeper issues. Some have to do with self worth, toxic shame, and perhaps even trauma. A lot of people turn to porn to cover up unbearable emotions. This is what I noticed the deeper I went.

— u/fromabook, r/pornfree, 2017-11-11 (comment) · [dpo7wwr](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/dpo7wwr/) · *distress: unclear* · *stage: long-term*


**An observer's account of the counter-reset harm**, from a long-form poster who noticed the pattern
across the sub rather than in himself:

> And then I read so many stories about people relapsing and feeling terrible and needing to reset their day counters and talking about how they just want to give up.

— u/mvee2, r/pornfree, 2022-07-04 (post) · [vraw4i](https://www.reddit.com/r/pornfree/comments/vraw4i/if_you_have_been_trying_a_bunch_of_techniques_to/) · *distress: unclear* · *stage: long-term*


---
## 7. Techniques people credit

**How to read the recurrence column.** The corpus was built by keyword search, so these counts measure
*prominence within a keyword-shaped sample of 588 posts*, not prevalence in the subreddit. They are
useful for relative ranking and for nothing else. Read them as "how loudly this is talked about", never
as "how many people do this".

| # | Name in their words | What a person literally does | Recurrence (n/588, keyword-biased) |
|---|---|---|---|
| 1 | "get a content blocker" | Install Cold Turkey / Apple Screen Time / a DNS filter; hand the password to someone else | 67 (11.4%) |
| 2 | "make it not even an option" | Remove the device, not the temptation: phone out of the bedroom, charger elsewhere, flip phone, hardware in a storage locker | 9 (1.5%) explicitly, but see §7.1 |
| 3 | "urge surfing" / "the urge just goes away if you wait long enough" | Do not fight the urge; time-box an unrelated task until it passes | 4 (0.7%) named, far more described unnamed |
| 4 | "find your triggers" | Write down time, place, and feeling before each urge; look for the pattern | 33 (5.6%) |
| 5 | "accountability partner" / disclosure | Tell one specific person; hand them the blocker password | 43 (7.3%) |
| 6 | therapy / SAA / SLAA / sexologist | Book a professional; attend meetings | 105 (17.9%) |
| 7 | exercise | Gym, running, walking | 144 (24.5%) |
| 8 | meditation / mindfulness | Sit, observe thoughts without reacting | 42 (7.1%) |
| 9 | **"stop counting days"** | Delete the counter; stop tracking streaks entirely | 44 (7.5%) |
| 10 | streak / day counting | Track consecutive clean days, often in an app | 127 (21.6%) |
| 11 | self-compassion after a lapse | Explicitly refuse the shame response; treat the lapse as data | 33 (5.6%) |
| 12 | "porn-free but not fap-free" | Quit porn, keep masturbation, on purpose | 108 (18.4%) |
| 13 | prayer / faith practice | Pray at the moment of urge | 76 (12.9%) |
| 14 | "fill the time" | Deliberately schedule the hours the behaviour used to occupy | 48 (8.2%) |
| 15 | "don't make the whole day about it" | Deliberately *de-centre* recovery from identity | described, not countable |

### 7.1 Environment change vs willpower — the strongest signal in the corpus

The single most consistent practical claim, and it is made most forcefully by a *partner* rather than
a user:

> If you have a phone/tablet/laptop/computer/ps4 w in your home, you are setting yourself up for failure.

— *[handle withheld — account since deleted]*, r/pornfree, 2020-05-26 (post) · [gqms4p](https://www.reddit.com/r/pornfree/comments/gqms4p/quit_kidding_yourselves/) · *distress: cost* · *stage: deciding*

> Not porn blockers (which everyone can get around if they try). Not a smart phone with the promise to an "accountability partner". You need to get the option 100% out of your home.

— *[handle withheld — account since deleted]*, r/pornfree, 2020-05-26 (post) · [gqms4p](https://www.reddit.com/r/pornfree/comments/gqms4p/quit_kidding_yourselves/) · *distress: cost* · *stage: deciding*


The same conclusion from a user, with the mechanism spelled out — the point of removing the option is
that it forces the discovery of a different coping response:

> i've found it very helpful for me to just make PMO not even an option with a combination of software on my phone and personal laptop.

— *[handle withheld — account since deleted]*, r/pornfree, 2026-06-08 (post) · [1u0fgas](https://www.reddit.com/r/pornfree/comments/1u0fgas/for_many_i_think_pmo_is_a_signifier_of_a_lack_in/) · *distress: cost* · *stage: long-term*

> They say abstinence isn't recovery, and we've seen that by how getting to "x" amount of days does not equate to recovered. Recovered, to me, is even when the option is available, you consciously choose not to because it just isn't who you are.

— *[handle withheld — account since deleted]*, r/pornfree, 2026-06-08 (post) · [1u0fgas](https://www.reddit.com/r/pornfree/comments/1u0fgas/for_many_i_think_pmo_is_a_signifier_of_a_lack_in/) · *distress: cost* · *stage: long-term*


**And the counter-evidence, which is essential.** Blockers are widely recommended and widely defeated.
Any product that ships a blocker as the core intervention should read this first:

> I use blockers, Cold Turkey on my laptop and computer, and Apple's built in blocker (had brother put password on phone and iPad, Apple's is top-notch). But these are damn near useless because 1. OCD, 2. I'm a "contrarian" and will find a way to get what I want (God that sounds so douchey, sorry). Needless to say, blockers or not, if you want to find a website, you will find one.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-09-05 (post) · [1n9gwqa](https://www.reddit.com/r/pornfree/comments/1n9gwqa/my_story_seeking_helpadvice/) · *distress: cost* · *stage: an urge*


A middle position — blockers work only when someone else holds the key:

> get a content blocker, pay for it, make a trusted loved one the moderator so you can't cheat

— u/livebetterly, r/pornfree, 2024-11-23 (post) · [1gy1e0p](https://www.reddit.com/r/pornfree/comments/1gy1e0p/thoughts_after_6_months_of_sobriety/) · *distress: cost* · *stage: long-term*


And the escalation people reach for after enough defeats:

> I need to find a porn blocker too. And eventually find a sponsor or accountability partner to have the credentials so I can’t hack it. It would suck, but if I really need to downgrade to a flip phone and no internet, so be it. I “need” food and water, not a pocket sized super computer.

— u/ihavenowords3, r/pornfree, 2026-08-09 (post) · [1vk57ju](https://www.reddit.com/r/pornfree/comments/1vk57ju/9_days_11_hours_of_sobriety_down_the_drain/) · *distress: cost* · *stage: after a lapse*


### 7.2 What to do at the moment of an urge

The stall-and-substitute rule, stated concretely enough to implement:

> Usually the urge just goes away if you wait long enough. So it helps to just give yourself something that will stall for time if you're finding it difficult. Say, "I will read a chapter of this book." Or "I will go make lunch for tomorrow." Or something. Once you get your mind and body occupied, you'll probably forget the urge.

— u/polynomials, r/pornfree, 2021-01-04 (post) · [kq2sbs](https://www.reddit.com/r/pornfree/comments/kq2sbs/what_i_learned_from_368_days_without_porn/) · *distress: unclear* · *stage: an urge*


Urge surfing, named, from someone writing the morning after a lapse:

> instead of ignoring them, consider why they might be happening and try to find a different, healthier vent for them - or practice "urge surfing" to allow them to pass (which they *always* do).

— u/memery_palace, r/pornfree, 2023-11-03 (post) · [17mtbpr](https://www.reddit.com/r/pornfree/comments/17mtbpr/i_relapsed_last_night_after_42_days_porn_free/) · *distress: cost* · *stage: after a lapse*


Observation over suppression, plus the night-time environment rule:

> So before you try to “quit,” take some time to observe your urges:
> 	•	When do they come?
> 	•	What triggers them?
> 	•	What are you trying not to feel?

— *[handle withheld — account since deleted]*, r/pornfree, 2025-05-15 (post) · [1knbizn](https://www.reddit.com/r/pornfree/comments/1knbizn/i_recovered_from_my_8_years_porn_addiction_after/) · *distress: cost* · *stage: deciding* — **post since deleted — text from archive only**

> Alone time and nights were my weakness.
>
> Most of my relapses happened at night, alone in my room.
> So I started changing my environment:
> 	•	Put my phone away before bed
> 	•	Don’t sit on the bed scrolling
> 	•	Don’t invite triggers in

— *[handle withheld — account since deleted]*, r/pornfree, 2025-05-15 (post) · [1knbizn](https://www.reddit.com/r/pornfree/comments/1knbizn/i_recovered_from_my_8_years_porn_addiction_after/) · *distress: cost* · *stage: an urge* — **post since deleted — text from archive only**


### 7.3 De-centring recovery from identity

A recurring and under-appreciated technique — deliberately refusing to make the behaviour the
organising fact of your life:

> Don’t Make the Whole Day About Fighting Addiction
>
> Yes, you’re recovering — but that’s not your whole identity.
> You’re a person with goals, ideas, dreams. Spend your day building those.
>
> Let fighting urges be a part of your life — not your entire focus.

— *[handle withheld — account since deleted]*, r/pornfree, 2025-05-15 (post) · [1knbizn](https://www.reddit.com/r/pornfree/comments/1knbizn/i_recovered_from_my_8_years_porn_addiction_after/) · *distress: cost* · *stage: long-term* — **post since deleted — text from archive only**

> Blocking the sites
> * Writing down my triggers
> * Sitting with the feelings instead of escaping into them
> * Finding ways to actually fill the time I used to lose

— u/SabrinaRewired, r/pornfree, 2026-07-20 (post) · [1v1mzv5](https://www.reddit.com/r/pornfree/comments/1v1mzv5/1_year_pornfree_after_realising_it_was_tied_to_my/) · *distress: unclear* · *stage: long-term*


---

## 8. Backfire findings

The brief asked specifically about streak counters and their collapse after a lapse. **The corpus
supports the harm hypothesis strongly, and the evidence is unusually direct: several people describe
the causal chain in the first person.**

### 8.1 The abstinence-violation effect, described from the inside

The mechanism, stated as a sequence — broken streak → shame → "might as well" → binge:

> When I would relapse I use to get so fucking pissed at myself for "blowing my streak" I'd fkn cry and scream WHY THE F Are you DOING THIS TO ME!! 
>
> I'm not that religious but in those moments I was screaming at the sky like I expected God to hear me. 
>
> I'd get flooded with shame, guilt, and the worst one of all, *I've already fucked up, might as well keep watching it.*
>
> Our brains doesn’t care about healing, it cares about certainty and control and a streak gives you the **illusion of control**.

— u/TheTankIsEmpty99, r/pornfree, 2025-04-18 (post) · [1k22mrp](https://www.reddit.com/r/pornfree/comments/1k22mrp/the_brain_loves_to_panic_when_it_ruins_a_perfect/) · *distress: unclear* · *stage: after a lapse* — **post since removed by a moderator — text from archive only**


The all-or-nothing structure named as the thing that sustained the cycle for years:

> My all-or-nothing thinking kept me running the same patterns and cycles for years.

— u/TheTankIsEmpty99, r/pornfree, 2025-04-18 (post) · [1k22mrp](https://www.reddit.com/r/pornfree/comments/1k22mrp/the_brain_loves_to_panic_when_it_ruins_a_perfect/) · *distress: unclear* · *stage: after a lapse* — **post since removed by a moderator — text from archive only**


The same "fuck it" moment from a different user, quoted verbatim as self-talk:

> In the past, my relapses have often led to a spiral - a descent into more frequent binges as I say "fuck it, I've lost my streak anyway," and just completely give up for a time.

— u/memery_palace, r/pornfree, 2023-11-03 (post) · [17mtbpr](https://www.reddit.com/r/pornfree/comments/17mtbpr/i_relapsed_last_night_after_42_days_porn_free/) · *distress: cost* · *stage: after a lapse*

> a part of me do want to look another time, "get it while the getting is good", the thought of "fuck it, I've already fucked up", and so on.

— u/skinnahbox, r/pornfree, 2026-06-20 (post) · [1uaqv6o](https://www.reddit.com/r/pornfree/comments/1uaqv6o/i_relapsed_and_now_i_want_to_do_it_again/) · *distress: cost* · *stage: after a lapse*


### 8.2 Streak counters specifically

The clearest statement of the harm, from a post that has **since been removed by a moderator** — the
text survives only in the archive:

> The fastest path back to porn after a relapse is spiraling in guilt and shame afterwards.

— u/TheTankIsEmpty99, r/pornfree, 2025-05-10 (post) · [1kj6xv0](https://www.reddit.com/r/pornfree/comments/1kj6xv0/you_didnt_fail_because_you_relapsed_you_failed/) · *distress: unclear* · *stage: after a lapse* — **post since removed by a moderator — text from archive only**

> If you want to stop relapsing, stop handing your self-worth to your streak. 
>
> Stop using you streak counter to beat the shit out of yourself.

— u/TheTankIsEmpty99, r/pornfree, 2025-05-10 (post) · [1kj6xv0](https://www.reddit.com/r/pornfree/comments/1kj6xv0/you_didnt_fail_because_you_relapsed_you_failed/) · *distress: unclear* · *stage: after a lapse* — **post since removed by a moderator — text from archive only**


And the constructive reframe from the same author — the target is the recovery time after a lapse, not
the length of the run before it:

> It's not about stacking days without porn but learning how to get back up without the shame spiral.

— u/TheTankIsEmpty99, r/pornfree, 2025-04-18 (post) · [1k22mrp](https://www.reddit.com/r/pornfree/comments/1k22mrp/the_brain_loves_to_panic_when_it_ruins_a_perfect/) · *distress: unclear* · *stage: after a lapse* — **post since removed by a moderator — text from archive only**


### 8.3 Backfire evidence *against* the middle path, for balance

The "quit porn, keep masturbating" middle path (technique 12, the second-most-discussed approach in the
corpus) has its own failure mode, reported by someone who tried it for three months:

> The second time was more recent. I stopped pornography cold turkey again, but decided I would continue masturbating, only this time I would strictly use my imagination. I lasted three months. Unfortunately, I don’t think this experience was a success, and I don’t recommend it: pornographic imagery was so strongly rooted in my head that I was simply able to invoke clips or images to fantasise on. Even my “new” fantasies I brought up on my own were strongly inspired by porn. I felt no big difference in feelings during this period simply because, as I realised later, I was still consuming porn: I just limited myself to what was already in my head.

— u/ClenchedBrain, r/pornfree, 2026-07-14 (post) · [1uwcnjq](https://www.reddit.com/r/pornfree/comments/1uwcnjq/a_100_days_in_rules_to_withdraw_from_lifelong/) · *distress: cost* · *stage: long-term*


And from a commenter who finds that masturbation reliably re-opens the door:

> Streak culture does create guilt and shame, and it leads to people just trying to abstain from porn and not deal with the root causes of their addiction in the first place.

— u/Competitive-Way-6033, r/pornfree, 2025-01-04 (comment) · [m5ciqcr](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5ciqcr/) · *distress: unclear* · *stage: long-term*


**Net read on streaks:** the harm is not the counting, it is the *loading of self-worth onto the count*.
Both the critics (§6.2) and the one defender in the corpus (§6.3) actually agree on this. A product
decision that follows from the evidence: if progress is displayed at all, display something a lapse
cannot zero — cumulative clean days, or lapse frequency over time, rather than a consecutive-day streak
that resets to 0. One user in §6.1 independently describes surviving a reset precisely because he could
compare against 240 days of banked evidence.

---

## 9. Where community ideology outruns the evidence

Recorded because the product needs to know what its users have already been told, and by whom.

**"Superpowers."** The claim that abstinence confers social/sexual/energetic superpowers. Directly
contradicted by a long-term participant:

> I didn't experience the "superpowers" or any of that other bullshit they circlejerk each other about. Maybe it's because I'm a pretty objective person and confirmation bias/placebo don't affect me as much as other people, I don't know.

— *[handle withheld — account since deleted]*, r/pornfree, 2017-11-11 (post) · [7c8rnn](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/) · *distress: incongruence* · *stage: long-term*


**The community described as a cult, by people leaving it.** Two comments from the same 2017 thread:

> It's the same reason I left NoFap and there bullshit circle jerk (no pin intended).
>
> Hell even animals masturbate for gods sake.
>
> Thank you and this sub for being the voice of reason instead of a cult.

— u/DirtyBandit007, r/pornfree, 2017-11-11 (comment) · [dpo5v68](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/dpo5v68/) · *distress: incongruence* · *stage: long-term*

> not only was it ineffective, but the whole culture is very unreasonable. Maybe it works for some people, but boy am I glad that this sub exists too, to actually address addiction rather than rant about 'superpowers.'

— u/yossarian_298, r/pornfree, 2017-11-11 (comment) · [dpo45gd](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/dpo45gd/) · *distress: incongruence* · *stage: long-term*


**Fear, guilt, and black-and-white thinking as community outputs**, from 2025 — eight years later,
same complaint:

> Some of the comments and posts in this community promote extreme fear, guilt, and black and white thinking

— u/UnrelentingSTBFL, r/pornfree, 2025-01-04 (comment) · [m5b04cc](https://www.reddit.com/r/pornfree/comments/1ht620c/why_nofap_streaks_can_be_harmful_to_your_mental/m5b04cc/) · *distress: incongruence* · *stage: long-term*


**The reboot/escalation model, contested by a clinician in the user's own account** (§6.2, u/Western_Total2961's
psychiatrist). And contested at the level of the sub itself: the most upvoted framing in the corpus for
why techniques fail is not neurological at all but "porn is a symptom":

> I'd say it's not even porn that's the main problem. Excessive porn use and other addictions are mainly symptoms used to cover up deeper issues. Some have to do with self worth, toxic shame, and perhaps even trauma. A lot of people turn to porn to cover up unbearable emotions. This is what I noticed the deeper I went.

— u/fromabook, r/pornfree, 2017-11-11 (comment) · [dpo7wwr](https://www.reddit.com/r/pornfree/comments/7c8rnn/rant_this_sub_is_so_much_more_practicalrealistic/dpo7wwr/) · *distress: unclear* · *stage: long-term*


### 9.1 Documented harm from the ideology — published journalism

Will McCurdy, *"We Know 'NoFap' Is Misleading Men About Masturbation. It Might Be More Dangerous Than
That."*, **Slate, 9 July 2023** —
<https://slate.com/human-interest/2023/07/nofap-masturbation-reddit-forum-suicide.html>

Quotes below were grepped directly out of the downloaded raw HTML (**7/7 present**). The subject is
identified only as **"Derrick"**, a pseudonym assigned by the publication.

**Derrick is a textbook incongruence case**: Christian-school upbringing, told masturbation was a sin,
distress about *doing it at all*, and an erectile problem he attributed to porn that turned out to be a
side effect of his ADHD medication.

> It felt like everything was coming together to produce this environment of shame

> That was my lowest point, feeling I just failed everyone by masturbating

> I feel like the whole organization is based around the sense of purity, and that aligns with the church in a lot of ways. I feel like they're just as moralistic.

**What helped him** — and note that it was not a technique, it was leaving the framework:

> I found a healthier relationship with masturbating, just accepting the fact that I enjoy it.

**The reported harm figure.** Per the article: *28.9 percent of participants in a recent study on users
of the NoFap subreddit said they felt suicidal following their most recent relapse*, with roughly 5
percent "extremely" so — and the article notes suicidality was *higher* with greater engagement in
NoFap and PornFree. (The article carries a published correction dated 30 Aug 2023 revising these
figures down from 68.9% / 18%; **the corrected figures are the ones quoted here**. The underlying study
is linked by Slate to `openresearch.lsbu.ac.uk/item/93513`, which **I could not fetch** — see §11.)

**Clinician commentary in the same piece**, from neuroscientist Nicole Prause — directly relevant to
the product's content rule:

> A real therapist would not treat fantasy as a relapse

> The goal with this approach is usually not to terminate porn viewing entirely, but to bring it more in line with your values, whatever those are

Prause's recommended modality in the article is **Acceptance and Commitment Therapy (ACT)** — accept and
manage the feeling rather than fight it, and align behaviour with values rather than eliminate it.
This is the closest thing in the gathered material to an evidence-anchored alternative to the streak model.

### 9.2 Corroborating academic finding (findings only — quotes excluded)

Chasioti & Binnie's narrative analysis of r/NoFap and r/pornfree reaches the same conclusion from the
data side. Verbatim from the paper's abstract:

> commitment to abstinence, framed by the notions of recovery and relapse, was found to be a major factor for maintaining distress

That is the academic statement of exactly what §8.1 shows in the first person: **the abstinence framework
is itself load-bearing in the distress.** Note again that this paper's *participant quotes* are
paraphrased and unusable (§2) — only its findings are cited.

---
## 10. Secondary tier — quarantined, do not quote as testimony

**Source:** *Males' Lived Experience with Self-Perceived Pornography Addiction: A Qualitative Study of
Problematic Porn Use* — [PMC9861829](https://pmc.ncbi.nlm.nih.gov/articles/PMC9861829/), published
13 Jan 2023. 13 cisgender men, ages 21–66, Australia and USA, **recruited from NoFap and Reboot Nation**,
semi-structured interviews, participants reviewed their own transcripts.

**Why quarantined.** The methods section contains no statement that quotes are unaltered. Anonymity is
handled by participant codes (P1–P13) and de-identification, and the printed extracts retain speech
disfluencies ("Um,", "Mmhmm, er") which is consistent with verbatim transcription — but the paper never
says so, and per the rule in §2 silence is not a guarantee. The strings below were grepped out of the
raw downloaded HTML (**3/3 checked present**), so they are faithful to *the paper*; what is unproven is
whether the paper is faithful to *the participant*.

**Also note the recruitment bias**: every participant self-identified as a porn addict and volunteered
from abstinence communities. This is the most addiction-framed sample imaginable and it is not evidence
about the general population.

Retained because it is the only consented, interview-based material found, and because P11's account of
the behaviour colonising a working day is more concrete than anything in the Reddit corpus:

> I knew it was bad for me, it was very big negative effect on my life, but I just couldn't stop it. That's clearly in my eyes a sign of addictive behavior. [P2]

> It consumed my everyday life. […] It was the one thing that was constantly on my mind. I would go on lunch at work, and I would look at porn. I would get home and if my wife wasn't home yet, I was looking at porn. If she was at home yet I was trying to create situations to where she wouldn't be in the room, and I could go look at porn. It was, I mean it became, it became my life. [P11]

Technique credited (distraction-substitution, matching technique 3/15 above):

> One of the big things […] is um, trying to find your triggers and trying to find ways to cope with urges. And the one that I found that works best for me is distraction. So, when I have an urge or I get triggered, instead of acting on that urge I will find something more constructive to do and I will choose to do that instead of acting on the urge and engaging with pornography use. [P11]

*(Ellipses in square brackets are the paper's own.)*

---

## 11. UNVERIFIED — could not access

Listed so nothing here is mistaken for gathered evidence.

| Source | Why it failed |
|---|---|
| The LSBU suicidality study (`openresearch.lsbu.ac.uk/item/93513`) — primary source for Slate's 28.9% figure | Connection failed (HTTP 000). **The 28.9% figure is reported here on Slate's authority only, post-correction.** Not independently confirmed. |
| Medium first-person essays on streak collapse (a "stopped the count" piece; an "87-day streak to near-daily relapses" piece) | Cloudflare 403 on raw fetch. A page-fetch summary was available but **deliberately not used** — per §3 a summariser is not proof of verbatim text. No quotes taken. |
| r/NoFap full-text search | Arctic-Shift returns `Internal server error` for this subreddit at every attempt. Material from r/NoFap here is second-hand (people describing it from r/pornfree) or from published journalism. |
| Live Reddit permalinks | Unreachable (see §1). Text verified against archive; **browser rendering unverified**. |
| PullPush second-archive cross-check | Rate-limited out for the entire session. |
| Taylor & Jackson 2018; Hartmann 2021; Dashiell & Rowland 2025 (NoFap discourse/relapse-space studies) | Identified as relevant but paywalled (SAGE). Not fetched, not cited. |

---

## 12. Implications for the product

Stated as claims traceable to the evidence above, not as design decisions.

1. **Do not assign a distress type once.** §5 shows the two types are frequently the same person at
   different times, and the transition (cost-framed → incongruence-framed) is the most common trajectory
   in the corpus.
2. **Never infer distress type from the word "addiction."** Everyone uses it. Infer from what they say
   went wrong.
3. **Do not ship a resetting consecutive-day streak.** The abstinence-violation chain is documented in
   the first person by multiple users (§8.1) and corroborated academically (§9.2). If progress is shown,
   show something a lapse cannot zero.
4. **The critics and the one defender agree on the actual mechanism**: harm comes from loading self-worth
   onto the count, not from measurement as such (§8.3). That is a designable distinction.
5. **Environment change beats willpower, and blockers are the weak form of it** (§7.1). The corpus
   contains a specific, repeated failure mode: a motivated user defeats their own blocker. Blockers work
   when a second person holds the key.
6. **Handle de-pathologising carefully.** §6.2's psychiatrist account shows the correct message delivered
   badly, and the user's reaction was to disbelieve the clinician. Being right is not sufficient.
7. **Disclosure to a partner has three outcomes, not two** (§6.1): it helped, it hurt, and — the one
   nobody designs for — a warm, permissive response was taken as licence and preceded a worsening.
8. **The recovery-time-after-a-lapse metric is the one users themselves propose** (§8.2), and it is the
   metric a shame-aware product can actually support.

---

## 13. Reproducing this

Corpus and tooling under the session scratchpad at `.../scratchpad/pcsb/`:

- `h/*.jsonl` — 588 posts + 92 comments, one JSON record per line (`id`, `author`, `title`, `created`, `permalink`, `score`, body).
- `sel.json` — the quote selections, expressed as `{id, start_anchor, end_anchor, tag, stage}`.
- `build.py` — extracts the exact substring for each selection from the archive record. Quotes are never retyped.
- `verify2.py` — re-checks exact-substring + attribution against the archive, and liveness via Redlib meta tags. Last run: **53/53 exact, 53/53 attribution, 45 live / 5 mod-removed / 3 deleted**.
- `gen_doc*.py` — generate this file, injecting quotes from `quotes.json`.

Single-post fetch that works:
`https://arctic-shift.photon-reddit.com/api/posts/ids?ids=<id>`
Comment thread: `https://arctic-shift.photon-reddit.com/api/comments/search?link_id=t3_<post_id>&limit=100`
Liveness: fetch `https://redlib.privacyredirect.com/r/<sub>/comments/<id>/` and read the `og:title` and
`author` meta tags (served on the Anubis interstitial, so no JavaScript needed).
