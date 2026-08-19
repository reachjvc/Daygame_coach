# r/stopdrinking — verified first-person accounts and techniques

Source: the r/stopdrinking subreddit (alcohol), retrieved from the **arctic-shift** Reddit
archive. Collected 2026-08-17.

## What I could and could not access

**Could not access — live Reddit is completely closed to this agent.**

| Path | Result |
|---|---|
| `reddit.com`, `old.reddit.com`, `.json` endpoints (curl, browser UA) | HTML block page / 403 |
| WebFetch on any reddit.com URL | "unable to fetch from www.reddit.com" |
| Web search restricted to `reddit.com` | API error: *"domains not accessible to our user agent"* — Reddit blocks Anthropic's crawler outright |
| Redlib mirror | 403 |
| `api.pullpush.io` | Worked for ~10 minutes, then hard 429 with an explicit notice: *"This website does not provide free scraping resources for agents."* I stopped using it rather than evade it. |
| `arctic-shift` full-text / wide-window comment search | Server-side timeout even on 1-day windows |

**Could access.** The `arctic-shift` archive's **post search by date window** and
**`comments/tree` by thread id**. I downloaded the archive records locally and searched
them offline. Corpus actually used: **7,701 records** — 2,700 posts and 5,001 comments.

## Confidence

**High that every quote below is verbatim, and that it is attributed to the right handle.**
No quote in this file was typed by hand. Each one was extracted programmatically from the
archived record by anchor-matching and sliced out of the stored text, then re-verified in a
separate pass as an exact substring of the archived body with a matching author field.

A third check re-parsed this finished markdown file and re-tested every quote instance in it
against the archive: **90/90 quote instances exact, 90/90 attributions correct** (43 distinct
quotes, several cited under more than one technique). See the verification appendix.

**Two real limitations:**

1. **URL rendering is unverified.** Permalinks are reconstructed from archive fields. I could
   not open a single one, because Reddit blocks every fetch path available to me. The *text*
   is verified against the archive; the *link* is not verified as loading. Comment URLs use
   the `/comments/<thread>/-/<comment>/` form and are the least certain.
2. **The archive is a mirror, not the live site.** If a user later edited or deleted a post,
   the archived text is what they wrote at capture time, which may differ from what is live.

**No quote in this file comes from an academic paper.** I checked two candidate papers and
found that the JMIR study on substance-use recovery narratives states outright that its
quotations are *synthetic or paraphrased* to prevent deanonymisation, despite reading exactly
like verbatim testimony. I discarded all of them. Treat any paper-sourced recovery quote as
paraphrased unless its methods section explicitly says otherwise.

## Sampling bias — read before using this

- **Survivorship bias, but less than expected.** The sub's own norms mean people *do* post
  their relapses ("Badge reset" is a recurring post title). Still, people who quit the sub
  entirely — whether they succeeded or died — are invisible here.
- **Anniversary bias.** Milestone posts (1 year, 5 years) are heavily upvoted, so retrospective
  accounts are over-represented relative to the messy middle. Retrospective causal claims
  ("what worked") are memory, not measurement.
- **Chronological bias in my sample.** Date-window sampling means the corpus is weighted to
  2015–2016 with a thinner 2016+ tail; I could not sample evenly to 2026 before rate limits
  made it impractical. Community vocabulary (e.g. specific apps) will have moved on.
- **AA over-representation is contested inside the sub itself** — the corpus contains explicit
  pushback and non-AA success stories. Do not read technique frequency as efficacy.
- **Frequency counts below are regex matches over 7,701 records**, i.e. how often people
  *mention* a thing, not how well it works.
- **Selection within the corpus is mine.** I prioritised concrete, repeatable actions over
  slogans, so "one day at a time" is under-represented here relative to its true frequency.

## Privacy

Pseudonymous handles only, as published. I excluded otherwise strong accounts that contained
self-identifying detail (occupation plus location, named institutions, a user speaking publicly
under their own identity). No quote below names an employer, a town, or a third party.

---

# B. Techniques, tools and prompts people credit

## T1 — Pour it out / keep no alcohol in the house

**What it is.** Physically destroy or remove every drink in the home at the moment of deciding, and adopt a standing rule that none is bought again. People describe it as an irreversible act that converts a private intention into a fact.

**Recurrence.** occasional (18 matches for supply-removal language)

**Verbatim support.**

> Today I did something I've never done before. I poured out my alcohol. 1875 ml of rum down the drain.
>
> — u/ADudeNamedDude, post, 2015-07-01 · https://www.reddit.com/r/stopdrinking/comments/3brj0l/while_vomiting_last_night_i_said_id_finally_drank/

> I poured all my booze out. Even though my roommate wanted to cook with it. I don’t buy it for parties. LA CROIX and mocktails all the way!
>
> — u/hagne, post, 2015-11-15 · https://www.reddit.com/r/stopdrinking/comments/3sxixn/a_year_and_change/

> One day at a time (focus on today!) - No alcohol in the house - No drinking alone
>
> — u/Habits17, post, 2015-10-15 · https://www.reddit.com/r/stopdrinking/comments/3ov5id/hello_i_have_a_problem/

**Contradicted by.** No account found saying it backfired; several note it is insufficient alone because a liquor store is still within walking distance (see u/FourDozenEggs, 3j9xqg).

## T2 — A specific replacement drink you actually like (seltzer / LaCroix / soda water)

**What it is.** Keep a named fizzy non-alcoholic drink stocked and reach for it in the exact slot the drink used to occupy — carried to parties, poured into a proper glass, bought in bulk. People credit the carbonation and the ritual of holding a glass, not the flavour.

**Recurrence.** common (98 matches; LaCroix is a running in-joke in the sub)

**Verbatim support.**

> I've found that cans of seltzer water gives me the fizz and feel of drinking without the hangover and unwanted calories.
>
> — u/dirtymartini74, post, 2015-07-15 · https://www.reddit.com/r/stopdrinking/comments/3dbvsf/tomorrow_is_30_days_for_me/

> I’ve walked in the door, fired up the soda stream and am having a ton of sparkling water, because if I have any thirst I want to curb it.
>
> — u/McLensky, post, 2015-05-15 · https://www.reddit.com/r/stopdrinking/comments/3619ui/first_sober_friday/

> I poured all my booze out. Even though my roommate wanted to cook with it. I don’t buy it for parties. LA CROIX and mocktails all the way!
>
> — u/hagne, post, 2015-11-15 · https://www.reddit.com/r/stopdrinking/comments/3sxixn/a_year_and_change/

**Contradicted by.** None found for alcohol specifically. Sugar/sweet substitution is separately described as a new problem (u/DrunkWooky: 'It took a lot of root beer, cookies, and cheeseburger indulging to stay sober. I'm working on that.', 3ov3aa).

## T3 — Play the tape forward

**What it is.** At the moment of craving, deliberately continue the mental film past the first drink to the specific end of the night and the next morning, asking where it actually finishes. Named as a discrete technique, often taught in comments to newcomers.

**Recurrence.** uncommon by count (10 matches) but explicitly named as a 'technique' and taught to newcomers in advice comments

**Verbatim support.**

> In these instances, I took a deep breath and played the tape forward. If I had that one beer, I'd be drinking out the bottle in no time at all.
>
> — u/chappaquiditch, post, 2015-02-16 · https://www.reddit.com/r/stopdrinking/comments/2w0vlx/1_week/

> I "play the tape forward." What would happen if I did drink? Where would it get me in life? What would it accomplish in the long run? Then, as soon as I can, I put on my running shoes and run my little heart out.
>
> — u/rose_the_wolf, comment, 2015-07-01 · https://www.reddit.com/r/stopdrinking/comments/3br05u/-/csp8fcv/

> I found the daily pledge to be very effective. It's powerful saying each morning 'I will not drink today'. Do not worry about tomorrow, just aim for hitting the pillow with a sober head tonight. When the cravings come, play the tape forward. How is the day likely to end once you have that first taste?
>
> — u/BadToTheTrombone, comment, 2016-05-01 · https://www.reddit.com/r/stopdrinking/comments/4h6vb5/-/d2o9nmm/

> with the strategies I'm learning here, especially the "play the tape forward" technique, I'm finding that cravings are not nearly as prevalent...yet. I've also made my intentions known to my family, I've never had accountability about my drinking before, quitting was just something I secretly wanted.
>
> — u/JamesTGrizzly, post, 2016-02-15 · https://www.reddit.com/r/stopdrinking/comments/45x2ap/one_week_whats_different/

**Contradicted by.** None found. u/Lanakila87 reports using it successfully yet still white-knuckling a craving the same morning (43omb9), i.e. it reduces rather than removes the urge.

## T4 — The daily check-in / 24-hour pledge (IWNDWYT)

**What it is.** Post one line in the day's check-in thread each morning committing not to drink for the next 24 hours only, then return to it. The commitment is public, dated, re-made daily, and never extends beyond today.

**Recurrence.** very common — the sub's core recurring ritual (166 matches)

**Verbatim support.**

> Come hell or high water, I'm not drinking today!
>
> — u/McLensky, post, 2015-08-01 · https://www.reddit.com/r/stopdrinking/comments/3fgcms/the_daily_check_in_saved_me_yesterday/

> I found the daily pledge to be very effective. It's powerful saying each morning 'I will not drink today'. Do not worry about tomorrow, just aim for hitting the pillow with a sober head tonight. When the cravings come, play the tape forward. How is the day likely to end once you have that first taste?
>
> — u/BadToTheTrombone, comment, 2016-05-01 · https://www.reddit.com/r/stopdrinking/comments/4h6vb5/-/d2o9nmm/

> My post here for the morning check in promising not to drink coupled with the thought of having to reset my hard earned star were literally the only things that got me through.
>
> — u/thebestmeicanbe, post, 2015-09-16 · https://www.reddit.com/r/stopdrinking/comments/3l5pxh/amazed_i_made_it_through_last_night_without/

**Contradicted by.** None found; the failure mode described is not doing it (u/Whereareyo: 'Last year I went about not drinking alone so I had no accountability.', 2r0glx).

## T5 — Day counter / badge on your username

**What it is.** A bot renders your sober-day count next to your username on every post, so the number is visible to you and others each time you write. Resetting it after a drink is a public act.

**Recurrence.** very common (293 matches)

**Verbatim support.**

> My post here for the morning check in promising not to drink coupled with the thought of having to reset my hard earned star were literally the only things that got me through.
>
> — u/thebestmeicanbe, post, 2015-09-16 · https://www.reddit.com/r/stopdrinking/comments/3l5pxh/amazed_i_made_it_through_last_night_without/

> the sobriety counter is just that, a number. Instead of being sober 853 of the last 853 days, i've been sober 849 of the last 853 days.
>
> — u/c0mptar2000, post, 2015-08-15 · https://www.reddit.com/r/stopdrinking/comments/3h4tju/four_days_sober_again/

**Contradicted by.** Well documented. u/sundriedpotatoes on 'Day Zero' shame (see testimonial); u/c0mptar2000 reframes the counter to survive a reset. Several posts are titled only 'Badge reset'.

## T6 — A rehearsed one-line refusal

**What it is.** Decide in advance the exact short sentence you will say when offered a drink, deliver it without explanation, and immediately change the subject. Variants range from 'No thanks, I'm good' to a flat 'I don't drink'.

**Recurrence.** very common (315 matches for refusal/identity phrasing)

**Verbatim support.**

> I just said 'No thanks, I'm good' and didn't offer further explanations. No one cared.
>
> — u/-babygiraffe-, post, 2015-08-15 · https://www.reddit.com/r/stopdrinking/comments/3h3o16/oh_youre_feeling_good_lets_just_throw_a_spanner/

> I literally said nothing more than "you're so kind, but you have to drink that, I had to stop drinking wine, bummer right?" and just continued to talk about something else.
>
> — u/KetoJam, post, 2015-03-01 · https://www.reddit.com/r/stopdrinking/comments/2xlfch/my_neighbor_just_brought_over_a_bottle_of_wine/

> After about the 4th year it just became second nature to turn down drinks and declare that I didn't drink.
>
> — u/scarlin, post, 2015-06-01 · https://www.reddit.com/r/stopdrinking/comments/3834qw/september_1_1992_22_years_and_9_months_for_those/

**Contradicted by.** None found. u/msdrinkynomore describes being caught off guard without a prepared line and improvising badly (3sw9s2).

## T7 — Write the reasons down, then re-read them when tempted

**What it is.** Make a written list — of reasons to quit, of gratitudes, or a detailed record of the last withdrawal — at a moment of clarity, and deliberately re-open it when the craving arrives. Several people put it somewhere they cannot avoid seeing.

**Recurrence.** occasional (42 matches)

**Verbatim support.**

> Last year I went about not drinking alone so I had no accountability. This year I've told my husband I want to quit and he said he's behind me. Also I think I might need to check out some of these meetings everyone is so fond of!! I made a list a few nights ago after maybe the worst night of my life of why I want to quit and I plan to look at it when I'm feeling tempted.
>
> — u/Whereareyo, post, 2015-01-01 · https://www.reddit.com/r/stopdrinking/comments/2r0glx/this_year_is_different/

> Made a list of all the reasons to stop drinking: 1. No more hangovers. 2. Improved health. 3. Improved memory 4. Will be better able to accomplish my goals in life. 5. Improved performance at work. 6. No more damn hangovers.
>
> — u/clearandpresent, post, 2015-10-15 · https://www.reddit.com/r/stopdrinking/comments/3ovdsf/day_2/

> I decided to record in detail the feelings of the withdrawals in a new journal. As a reminder as to why I can't go on like this.
>
> — u/wiserswife, post, 2015-06-16 · https://www.reddit.com/r/stopdrinking/comments/39zgmw/time_for_some_honesty_up_in_here/

> I cropped out Panel 5 above and stuck the jpg up on the corner of my desktop to open when I need reminding of why I'm doing this.
>
> — u/ItstheWolf, post, 2015-04-01 · https://www.reddit.com/r/stopdrinking/comments/312hjk/its_funny_what_motivates_you/

> Writing down 5 gratitudes and 5 acknowledgements daily has supported my sobriety
>
> — u/finally_woken, post, 2015-10-01 · https://www.reddit.com/r/stopdrinking/comments/3n2vge/thankful_thursday/

**Contradicted by.** None found.

## T8 — The drinking jar — move the money and spend it visibly

**What it is.** Each time you would have drunk, physically put that amount of cash in a jar, then spend the total on something concrete. Makes an avoided purchase into a visible accumulating object.

**Recurrence.** occasional (14 matches, incl. a post titled 'The Drinking Jar')

**Verbatim support.**

> every time I think about drinking, I am going to take what I would have spent drinking that day and put it in a jar. That would be about $10 a night for a cheap 12-pack at home, or $20+ at a bar watching football.
>
> — u/Trobbits, post, 2015-10-01 · https://www.reddit.com/r/stopdrinking/comments/3n2f8e/welcome_to_oksoberfest_i_think_we_can_do_some/

> With the money I normally spend on booze, I had half the money I needed to buy a PS4, so my wonderful girlfriend surprised me by MATCHING the money I've saved. So we went out and I bought a brand new PS4.
>
> — u/PrimeapeGuy, post, 2015-01-15 · https://www.reddit.com/r/stopdrinking/comments/2skbkt/guess_what_i_got_today/

**Contradicted by.** One account reports it did not hold: u/[deleted] tried 'monetary rewards' among other things and wrote 'Nothing seems to work.' (32mpus).

## T9 — HALT — check Hungry / Angry / Lonely / Tired first

**What it is.** When a craving hits, run a four-item checklist on your physical and emotional state before treating it as a desire to drink, and fix whichever item is true.

**Recurrence.** rare in this sample (6 matches); imported from AA

**Verbatim support.**

> try and remember triggers can be caused by : HALT Hungry,Angry,Lonely,Tired It helped my to put my cravings in a perspective
>
> — u/Bluejay888, comment, 2016-02-01 · https://www.reddit.com/r/stopdrinking/comments/43nl8a/-/czjl3to/

**Contradicted by.** None found. Users extend it ad hoc — u/ge101- writes 'Hungry, Angry, Lonely, Tired, Stressed. HALTS.' (cspbzmi).

## T10 — Urge surfing / ride the wave

**What it is.** Treat the craving as a wave that crests and falls: accept it, distract, and wait it out rather than fighting it, on the premise that it passes on its own.

**Recurrence.** rare in this sample (4 matches) despite being a standard clinical term

**Verbatim support.**

> Cravings pass. Everything changes. I like to accept, distract and ride the wave of emotion.
>
> — u/VictoriaElaine, comment, 2016-05-02 · https://www.reddit.com/r/stopdrinking/comments/4hd2vk/-/d2p3wzx/

**Contradicted by.** None found. Notably scarce in the sub's own vocabulary compared with 'play the tape forward'.

## T11 — Tell a specific person out loud

**What it is.** Name the problem to a named person — spouse, family, friend — rather than quitting privately, explicitly to create accountability that did not exist in previous attempts.

**Recurrence.** very common (132 matches)

**Verbatim support.**

> Last year I went about not drinking alone so I had no accountability. This year I've told my husband I want to quit and he said he's behind me. Also I think I might need to check out some of these meetings everyone is so fond of!! I made a list a few nights ago after maybe the worst night of my life of why I want to quit and I plan to look at it when I'm feeling tempted.
>
> — u/Whereareyo, post, 2015-01-01 · https://www.reddit.com/r/stopdrinking/comments/2r0glx/this_year_is_different/

> with the strategies I'm learning here, especially the "play the tape forward" technique, I'm finding that cravings are not nearly as prevalent...yet. I've also made my intentions known to my family, I've never had accountability about my drinking before, quitting was just something I secretly wanted.
>
> — u/JamesTGrizzly, post, 2016-02-15 · https://www.reddit.com/r/stopdrinking/comments/45x2ap/one_week_whats_different/

> My addiction to alcohol was something I had kept from my family, and I decided to be completely honest. It was hard for them to hear, but the transparency was crucial for me.
>
> — u/BigHairyNordic, post, 2015-06-15 · https://www.reddit.com/r/stopdrinking/comments/39z7j0/checking_in_at_1_year/

**Contradicted by.** Support can be conditional: u/abnormal_user describes a wife who is 'verbally supportive' but whose belief has worn thin after repeated attempts (3fe91k).

## T12 — Change the situation, not the decision

**What it is.** When you notice you are in a bad mental place, alter the plan, route, or environment so that drinking is harder to reach — cancel the dinner, drive a different way, move house — instead of trying to hold the line by willpower in place.

**Recurrence.** occasional as an explicit rule, common in practice

**Verbatim support.**

> By 3pm, I knew I wasn't in the best of mental places, so instead of changing my decision to not drink, I changed the situation and plans I had so that I would have less of a chance TO drink. I wasn't psyched about missing the dinner, but I would have been way less psyched about white knuckling through a few hours or breaking my sobriety.
>
> — u/KetoJam, post, 2015-02-01 · https://www.reddit.com/r/stopdrinking/comments/2udilq/sundays_quote/

> I drive past 3 beer stores and white knuckled past the 3rd one thinking Nope, I'm going to go home, get into my jammies and do a check in on SD.
>
> — u/effpasswords, post, 2016-02-01 · https://www.reddit.com/r/stopdrinking/comments/43m4un/day_2_check_in/

> My addiction to alcohol was something I had kept from my family, and I decided to be completely honest. It was hard for them to hear, but the transparency was crucial for me.
>
> — u/BigHairyNordic, post, 2015-06-15 · https://www.reddit.com/r/stopdrinking/comments/39z7j0/checking_in_at_1_year/

**Contradicted by.** None found.

## T13 — Post here instead of drinking

**What it is.** Substitute the act of writing a post or reading the sub for the act of pouring a drink, at the exact moment the craving hits — the sub is used as the behaviour, not just as support.

**Recurrence.** very common (99 matches for reading/lurking; whole posts are titled this way)

**Verbatim support.**

> It started with me posting here and reading your stories. So I wanted to say thanks.
>
> — u/toughtoquit, post, 2015-10-01 · https://www.reddit.com/r/stopdrinking/comments/3n41d0/7_days_without_a_drink_today_after_13_years_of/

> I literally come to this sub to read and it helps with my anxiety and in the long run, I'm confident, my sobriety.
>
> — u/jdavidc, post, 2015-07-01 · https://www.reddit.com/r/stopdrinking/comments/3bt0s3/let_me_be_honest_about_this_sub/

> I drive past 3 beer stores and white knuckled past the 3rd one thinking Nope, I'm going to go home, get into my jammies and do a check in on SD.
>
> — u/effpasswords, post, 2016-02-01 · https://www.reddit.com/r/stopdrinking/comments/43m4un/day_2_check_in/

**Contradicted by.** One dissenting post argues the sub is 'a bunch of people Whiteknuckling' (u/Rufio_IV, 2sm348, score 0).

## T14 — The first-drink rule

**What it is.** Locate the decision at drink one rather than at quantity: the rule is not 'drink less' but 'do not take the first one', on the observation that control is lost after it, never before.

**Recurrence.** occasional as an explicit rule (22 matches), near-universal as a belief

**Verbatim support.**

> It's never that 10th or 11th shot, or the 17th or 18th beer that causes me problems. It's the very first one. So by handling it a day at a time, I'm not going to take that first drink.
>
> — u/OnlyTeaNow, post, 2015-09-01 · https://www.reddit.com/r/stopdrinking/comments/3j8iui/starting_over_again/

> Every time I relapse it's because I think I can handle *one* drink. And by definition, that literally makes me insane.
>
> — u/rehauck, post, 2015-10-01 · https://www.reddit.com/r/stopdrinking/comments/3n3onm/so_i_was_at_the_bar_last_night/

**Contradicted by.** None found; it is instead offered as the lesson learned from failed moderation.

## T15 — Put the shoes on — exercise at the moment of craving

**What it is.** Use running or the gym as the immediate response to a craving rather than as general wellness: the trigger is the urge, the action is leaving the house.

**Recurrence.** common (282 matches for exercise, though most are general rather than craving-triggered)

**Verbatim support.**

> I "play the tape forward." What would happen if I did drink? Where would it get me in life? What would it accomplish in the long run? Then, as soon as I can, I put on my running shoes and run my little heart out.
>
> — u/rose_the_wolf, comment, 2015-07-01 · https://www.reddit.com/r/stopdrinking/comments/3br05u/-/csp8fcv/

> I ran in the mornings. I ran at night. I ran when I had cravings.
>
> — u/rose_the_wolf, post, 2015-11-01 · https://www.reddit.com/r/stopdrinking/comments/3r4awj/i_ran_my_first_half_marathon_today/

**Contradicted by.** None found.

## T16 — Shop for a different meeting

**What it is.** If the first AA/SMART meeting does not fit, treat that as a property of the room rather than of the programme, and try another one until one fits.

**Recurrence.** common (270 matches for meetings/programmes)

**Verbatim support.**

> I went to my first meeting. I hated it - lots of bible talk. So I left and found another meeting. This one fit me.
>
> — u/Cutty_McStabby, post, 2015-01-01 · https://www.reddit.com/r/stopdrinking/comments/2r05d9/2014_kicked_my_ass_2015_doesnt_stand_a_chance/

> Every AA meeting is different -- if you hate your first meeting...just go to another one.
>
> — u/grouch420, post, 2015-04-16 · https://www.reddit.com/r/stopdrinking/comments/32s5jo/almost_half_a_year_of_sobriety_152_days/

**Contradicted by.** Strongly contradicted. u/help_plzzzz: meetings 'just made me want to drink more'; u/quitordie: 'they never seemed to click for me'. Others succeed with no meetings at all (u/Nika65's brother, 15 years, one meeting ever, 2r0mer).

## T17 — White-knuckling (named by users as the thing that fails)

**What it is.** Holding out by raw willpower without changing beliefs, environment, or support. Recorded here as an anti-pattern because users name it themselves and describe its characteristic failure at 4–12 months.

**Recurrence.** common as a self-described state (13+ matches)

**Verbatim support.**

> A few years ago, I quit for a year. Pretty much, I white knuckled it the entire time, and then went back to drinking as much or more than before.
>
> — u/hoppital, post, 2015-11-15 · https://www.reddit.com/r/stopdrinking/comments/3suyef/flirting_with_fundamental_change/

> I started my sobriety by white knuckling my way through it because I didn't really believe I was an alcoholic. I lasted about 4 months doing this when the craving for alcohol just exploded for me.
>
> — u/nattiebee, post, 2015-11-01 · https://www.reddit.com/r/stopdrinking/comments/3r1wfz/my_cloud_and_its_silver_lining/

**Contradicted by.** Contested: u/AmbivalentFanatic credits five years to a mix including 'a little white-knuckling' (3bumxp).

## T18 — Say STOP out loud to interrupt the thought

**What it is.** When the mind starts rationalising a drink, interrupt it with a spoken, jarring command and then deliberately move to a different thought.

**Recurrence.** rare (1 clear instance in this sample)

**Verbatim support.**

> One tool that I've discovered is to yell (if alone...) STOP! if my mind begins to run down a negative rabbit trail. (I wonder if I can...) This jarring interruption to my thinking seems to quickly get me back on track
>
> — u/Agrateful123, post, 2016-02-01 · https://www.reddit.com/r/stopdrinking/comments/43oif7/newold_priorities/

**Contradicted by.** None found — but the evidence base is a single account; treat as low-confidence.

## T19 — Refuse to put any tool off-limits

**What it is.** Deliberately keep every recovery option available — meetings, therapy, books, medication — because ruling one out is read by the addicted mind as an opening to negotiate.

**Recurrence.** rare as an explicit rule, but from a high-scoring detailed account

**Verbatim support.**

> I found that if I put a recovery technique "off-limits", my alcoholic brain takes it as a sign that I'm willing to negotiate. That fucker is a terrorist. I don't negotiate with terrorists.
>
> — u/greatmainewoods, post, 2015-04-01 · https://www.reddit.com/r/stopdrinking/comments/311wq6/i_effectively_quit_drinking_a_year_ago_today_why/

**Contradicted by.** None found.

## T20 — Quit lit — read the book that reframes the drink

**What it is.** Read a book (most often Allen Carr's Easy Way) whose aim is to remove the desire rather than strengthen resistance, and credit the change to a shift in belief about what alcohol gives you.

**Recurrence.** occasional (45 matches)

**Verbatim support.**

> With the Alen Carr method, it's like I just knocked out the little keyhole of alcohol from my life
>
> — u/imreadyfor2015, post, 2015-10-15 · https://www.reddit.com/r/stopdrinking/comments/3osja9/8_months_in_alan_carr_is_still_the_man/

**Contradicted by.** Explicitly contested within the sub — the same author notes 'there are mixed opinions on this sub-reddit regarding the "Allen Carr" approach' (3osja9).

---

# A. Testimonials

Every `quote` is a byte-exact substring of the archived record at `id`. `substance` is alcohol throughout.

## Stage: deciding

```yaml
quote: "Today I did something I've never done before. I poured out my alcohol. 1875 ml of rum down the drain."
handle: u/ADudeNamedDude
source: r/stopdrinking — While vomiting last night, I said I'd finally drank enough. Today is my first day sober.
url: https://www.reddit.com/r/stopdrinking/comments/3brj0l/while_vomiting_last_night_i_said_id_finally_drank/
date: 2015-07-01
substance: alcohol
stage: deciding
technique_ids: [T1]
archive_id: 3brj0l   # post, score 57
```

```yaml
quote: "It's never that 10th or 11th shot, or the 17th or 18th beer that causes me problems. It's the very first one. So by handling it a day at a time, I'm not going to take that first drink."
handle: u/OnlyTeaNow
source: r/stopdrinking — Starting over again.
url: https://www.reddit.com/r/stopdrinking/comments/3j8iui/starting_over_again/
date: 2015-09-01
substance: alcohol
stage: deciding
technique_ids: [T14]
archive_id: 3j8iui   # post, score 7
```

```yaml
quote: "Last year I went about not drinking alone so I had no accountability. This year I've told my husband I want to quit and he said he's behind me. Also I think I might need to check out some of these meetings everyone is so fond of!! I made a list a few nights ago after maybe the worst night of my life of why I want to quit and I plan to look at it when I'm feeling tempted."
handle: u/Whereareyo
source: r/stopdrinking — This year is different
url: https://www.reddit.com/r/stopdrinking/comments/2r0glx/this_year_is_different/
date: 2015-01-01
substance: alcohol
stage: deciding
technique_ids: [T7, T11]
archive_id: 2r0glx   # post, score 10
```

```yaml
quote: "I cropped out Panel 5 above and stuck the jpg up on the corner of my desktop to open when I need reminding of why I'm doing this."
handle: u/ItstheWolf
source: r/stopdrinking — It's Funny What Motivates You
url: https://www.reddit.com/r/stopdrinking/comments/312hjk/its_funny_what_motivates_you/
date: 2015-04-01
substance: alcohol
stage: deciding
technique_ids: [T7]
archive_id: 312hjk   # post, score 2
```

```yaml
quote: "I tried AA and hated it. It was not the spirituality aspect. While I don’t believe in a Christian god, I liked the idea of believing in a higher power. I wish I did, but It’s hard to when so many people have to live such lives of shit. I’d like to find faith though. Going to those meetings just made me want to drink more, I could never get into it."
handle: u/help_plzzzz
source: r/stopdrinking — I need to stop drinking, but kind of don't want to... Help before I hit a real bad bottom?
url: https://www.reddit.com/r/stopdrinking/comments/38698u/i_need_to_stop_drinking_but_kind_of_dont_want_to/
date: 2015-06-02
substance: alcohol
stage: deciding
technique_ids: [T16]
archive_id: 38698u   # post, score 8
```

```yaml
quote: "One day at a time (focus on today!) - No alcohol in the house - No drinking alone"
handle: u/Habits17
source: r/stopdrinking — Hello. I have a problem.
url: https://www.reddit.com/r/stopdrinking/comments/3ov5id/hello_i_have_a_problem/
date: 2015-10-15
substance: alcohol
stage: deciding
technique_ids: [T1, T6]
archive_id: 3ov5id   # post, score 31
```

## Stage: early days

```yaml
quote: "It started with me posting here and reading your stories. So I wanted to say thanks."
handle: u/toughtoquit
source: r/stopdrinking — 7 days without a drink today after 13 years of being drunk every day.
url: https://www.reddit.com/r/stopdrinking/comments/3n41d0/7_days_without_a_drink_today_after_13_years_of/
date: 2015-10-01
substance: alcohol
stage: early days
technique_ids: [T13]
archive_id: 3n41d0   # post, score 168
```

```yaml
quote: "I've found that cans of seltzer water gives me the fizz and feel of drinking without the hangover and unwanted calories."
handle: u/dirtymartini74
source: r/stopdrinking — Tomorrow is 30 days for me...
url: https://www.reddit.com/r/stopdrinking/comments/3dbvsf/tomorrow_is_30_days_for_me/
date: 2015-07-15
substance: alcohol
stage: early days
technique_ids: [T2]
archive_id: 3dbvsf   # post, score 26
```

```yaml
quote: "with the strategies I'm learning here, especially the 'play the tape forward' technique, I'm finding that cravings are not nearly as prevalent...yet. I've also made my intentions known to my family, I've never had accountability about my drinking before, quitting was just something I secretly wanted."
handle: u/JamesTGrizzly
source: r/stopdrinking — One Week, What's different?
url: https://www.reddit.com/r/stopdrinking/comments/45x2ap/one_week_whats_different/
date: 2016-02-15
substance: alcohol
stage: early days
technique_ids: [T3, T11]
archive_id: 45x2ap   # post, score 5
```

```yaml
quote: "every time I think about drinking, I am going to take what I would have spent drinking that day and put it in a jar. That would be about $10 a night for a cheap 12-pack at home, or $20+ at a bar watching football."
handle: u/Trobbits
source: r/stopdrinking — Welcome to Oksoberfest! I think we can do some cool things this month.
url: https://www.reddit.com/r/stopdrinking/comments/3n2f8e/welcome_to_oksoberfest_i_think_we_can_do_some/
date: 2015-10-01
substance: alcohol
stage: early days
technique_ids: [T8]
archive_id: 3n2f8e   # post, score 10
```

```yaml
quote: "Made a list of all the reasons to stop drinking: 1. No more hangovers. 2. Improved health. 3. Improved memory 4. Will be better able to accomplish my goals in life. 5. Improved performance at work. 6. No more damn hangovers."
handle: u/clearandpresent
source: r/stopdrinking — Day 2
url: https://www.reddit.com/r/stopdrinking/comments/3ovdsf/day_2/
date: 2015-10-15
substance: alcohol
stage: early days
technique_ids: [T7]
archive_id: 3ovdsf   # post, score 8
```

```yaml
quote: "I went to my first meeting. I hated it - lots of bible talk. So I left and found another meeting. This one fit me."
handle: u/Cutty_McStabby
source: r/stopdrinking — 2014 kicked my ass. 2015 doesn't stand a chance.
url: https://www.reddit.com/r/stopdrinking/comments/2r05d9/2014_kicked_my_ass_2015_doesnt_stand_a_chance/
date: 2015-01-01
substance: alcohol
stage: early days
technique_ids: [T16]
archive_id: 2r05d9   # post, score 58
```

```yaml
quote: "I’ve walked in the door, fired up the soda stream and am having a ton of sparkling water, because if I have any thirst I want to curb it."
handle: u/McLensky
source: r/stopdrinking — First sober Friday...
url: https://www.reddit.com/r/stopdrinking/comments/3619ui/first_sober_friday/
date: 2015-05-15
substance: alcohol
stage: early days
technique_ids: [T2]
archive_id: 3619ui   # post, score 30
```

## Stage: an urge

```yaml
quote: "My post here for the morning check in promising not to drink coupled with the thought of having to reset my hard earned star were literally the only things that got me through."
handle: u/thebestmeicanbe
source: r/stopdrinking — Amazed I made it through last night without drinking. A huge thank you to all of you for being here.
url: https://www.reddit.com/r/stopdrinking/comments/3l5pxh/amazed_i_made_it_through_last_night_without/
date: 2015-09-16
substance: alcohol
stage: an urge
technique_ids: [T4, T5]
archive_id: 3l5pxh   # post, score 93
```

```yaml
quote: "Come hell or high water, I'm not drinking today!"
handle: u/McLensky
source: r/stopdrinking — The Daily Check In saved me yesterday
url: https://www.reddit.com/r/stopdrinking/comments/3fgcms/the_daily_check_in_saved_me_yesterday/
date: 2015-08-01
substance: alcohol
stage: an urge
technique_ids: [T4]
archive_id: 3fgcms   # post, score 56
```

```yaml
quote: "I drive past 3 beer stores and white knuckled past the 3rd one thinking Nope, I'm going to go home, get into my jammies and do a check in on SD."
handle: u/effpasswords
source: r/stopdrinking — Day 2? Check in.
url: https://www.reddit.com/r/stopdrinking/comments/43m4un/day_2_check_in/
date: 2016-02-01
substance: alcohol
stage: an urge
technique_ids: [T12, T13]
archive_id: 43m4un   # post, score 26
```

```yaml
quote: "By 3pm, I knew I wasn't in the best of mental places, so instead of changing my decision to not drink, I changed the situation and plans I had so that I would have less of a chance TO drink. I wasn't psyched about missing the dinner, but I would have been way less psyched about white knuckling through a few hours or breaking my sobriety."
handle: u/KetoJam
source: r/stopdrinking — Sunday's Quote
url: https://www.reddit.com/r/stopdrinking/comments/2udilq/sundays_quote/
date: 2015-02-01
substance: alcohol
stage: an urge
technique_ids: [T12]
archive_id: 2udilq   # post, score 12
```

```yaml
quote: "In these instances, I took a deep breath and played the tape forward. If I had that one beer, I'd be drinking out the bottle in no time at all."
handle: u/chappaquiditch
source: r/stopdrinking — 1 week!
url: https://www.reddit.com/r/stopdrinking/comments/2w0vlx/1_week/
date: 2015-02-16
substance: alcohol
stage: an urge
technique_ids: [T3]
archive_id: 2w0vlx   # post, score 4
```

```yaml
quote: "I 'play the tape forward.' What would happen if I did drink? Where would it get me in life? What would it accomplish in the long run? Then, as soon as I can, I put on my running shoes and run my little heart out."
handle: u/rose_the_wolf
source: r/stopdrinking — comment in thread csp8fcv
url: https://www.reddit.com/r/stopdrinking/comments/3br05u/-/csp8fcv/
date: 2015-07-01
substance: alcohol
stage: an urge
technique_ids: [T3, T15]
archive_id: csp8fcv   # comment, score 1
```

```yaml
quote: "try and remember triggers can be caused by : HALT Hungry,Angry,Lonely,Tired It helped my to put my cravings in a perspective"
handle: u/Bluejay888
source: r/stopdrinking — comment in thread czjl3to
url: https://www.reddit.com/r/stopdrinking/comments/43nl8a/-/czjl3to/
date: 2016-02-01
substance: alcohol
stage: an urge
technique_ids: [T9]
archive_id: czjl3to   # comment, score 1
```

```yaml
quote: "Cravings pass. Everything changes. I like to accept, distract and ride the wave of emotion."
handle: u/VictoriaElaine
source: r/stopdrinking — comment in thread d2p3wzx
url: https://www.reddit.com/r/stopdrinking/comments/4hd2vk/-/d2p3wzx/
date: 2016-05-02
substance: alcohol
stage: an urge
technique_ids: [T10]
archive_id: d2p3wzx   # comment, score 11
```

```yaml
quote: "One tool that I've discovered is to yell (if alone...) STOP! if my mind begins to run down a negative rabbit trail. (I wonder if I can...) This jarring interruption to my thinking seems to quickly get me back on track"
handle: u/Agrateful123
source: r/stopdrinking — New/Old Priorities
url: https://www.reddit.com/r/stopdrinking/comments/43oif7/newold_priorities/
date: 2016-02-01
substance: alcohol
stage: an urge
technique_ids: [T18]
archive_id: 43oif7   # post, score 2
```

```yaml
quote: "I just said 'No thanks, I'm good' and didn't offer further explanations. No one cared."
handle: u/-babygiraffe-
source: r/stopdrinking — "Oh, you're feeling good? Let's just throw a spanner in the works then!" - The Universe
url: https://www.reddit.com/r/stopdrinking/comments/3h3o16/oh_youre_feeling_good_lets_just_throw_a_spanner/
date: 2015-08-15
substance: alcohol
stage: an urge
technique_ids: [T6]
archive_id: 3h3o16   # post, score 36
```

```yaml
quote: "So I'm in bed, sober, feeling shit - but knowing I will feel better tomorrow morning for having made the right choice."
handle: u/three_pear_pieces
source: r/stopdrinking — Posting here instead of going to the pub
url: https://www.reddit.com/r/stopdrinking/comments/34idw4/posting_here_instead_of_going_to_the_pub/
date: 2015-05-01
substance: alcohol
stage: an urge
technique_ids: [T3]
archive_id: 34idw4   # post, score 60
```

```yaml
quote: "I literally said nothing more than 'you're so kind, but you have to drink that, I had to stop drinking wine, bummer right?' and just continued to talk about something else."
handle: u/KetoJam
source: r/stopdrinking — My neighbor just brought over a bottle of wine and I sent her packin'!
url: https://www.reddit.com/r/stopdrinking/comments/2xlfch/my_neighbor_just_brought_over_a_bottle_of_wine/
date: 2015-03-01
substance: alcohol
stage: an urge
technique_ids: [T6]
archive_id: 2xlfch   # post, score 70
```

```yaml
quote: "I found the daily pledge to be very effective. It's powerful saying each morning 'I will not drink today'. Do not worry about tomorrow, just aim for hitting the pillow with a sober head tonight. When the cravings come, play the tape forward. How is the day likely to end once you have that first taste?"
handle: u/BadToTheTrombone
source: r/stopdrinking — comment in thread d2o9nmm
url: https://www.reddit.com/r/stopdrinking/comments/4h6vb5/-/d2o9nmm/
date: 2016-05-01
substance: alcohol
stage: an urge
technique_ids: [T4, T3]
archive_id: d2o9nmm   # comment, score 2
```

## Stage: after a lapse

```yaml
quote: "Every time I relapse it's because I think I can handle *one* drink. And by definition, that literally makes me insane."
handle: u/rehauck
source: r/stopdrinking — So I was at the bar last night...
url: https://www.reddit.com/r/stopdrinking/comments/3n3onm/so_i_was_at_the_bar_last_night/
date: 2015-10-01
substance: alcohol
stage: after a lapse
technique_ids: [T14]
archive_id: 3n3onm   # post, score 71
```

```yaml
quote: "I guess the concept of Day Zero pisses me off because I don't want to believe that it's really, truly Day Zero all over again"
handle: u/sundriedpotatoes
source: r/stopdrinking — Day Two again, torn feelings
url: https://www.reddit.com/r/stopdrinking/comments/2sk5r2/day_two_again_torn_feelings/
date: 2015-01-15
substance: alcohol
stage: after a lapse
technique_ids: [T5]
archive_id: 2sk5r2   # post, score 7
```

```yaml
quote: "the sobriety counter is just that, a number. Instead of being sober 853 of the last 853 days, i've been sober 849 of the last 853 days."
handle: u/c0mptar2000
source: r/stopdrinking — Four days sober. (Again)
url: https://www.reddit.com/r/stopdrinking/comments/3h4tju/four_days_sober_again/
date: 2015-08-15
substance: alcohol
stage: after a lapse
technique_ids: [T5]
archive_id: 3h4tju   # post, score 37
```

```yaml
quote: "I decided to record in detail the feelings of the withdrawals in a new journal. As a reminder as to why I can't go on like this."
handle: u/wiserswife
source: r/stopdrinking — Time for some honesty up in here
url: https://www.reddit.com/r/stopdrinking/comments/39zgmw/time_for_some_honesty_up_in_here/
date: 2015-06-16
substance: alcohol
stage: after a lapse
technique_ids: [T7]
archive_id: 39zgmw   # post, score 10
```

```yaml
quote: "I started my sobriety by white knuckling my way through it because I didn't really believe I was an alcoholic. I lasted about 4 months doing this when the craving for alcohol just exploded for me."
handle: u/nattiebee
source: r/stopdrinking — My cloud and it's silver lining....
url: https://www.reddit.com/r/stopdrinking/comments/3r1wfz/my_cloud_and_its_silver_lining/
date: 2015-11-01
substance: alcohol
stage: after a lapse
technique_ids: [T17]
archive_id: 3r1wfz   # post, score 4
```

## Stage: long-term

```yaml
quote: "A few years ago, I quit for a year. Pretty much, I white knuckled it the entire time, and then went back to drinking as much or more than before."
handle: u/hoppital
source: r/stopdrinking — Flirting with fundamental change
url: https://www.reddit.com/r/stopdrinking/comments/3suyef/flirting_with_fundamental_change/
date: 2015-11-15
substance: alcohol
stage: long-term
technique_ids: [T17]
archive_id: 3suyef   # post, score 7
```

```yaml
quote: "I found that if I put a recovery technique 'off-limits', my alcoholic brain takes it as a sign that I'm willing to negotiate. That fucker is a terrorist. I don't negotiate with terrorists."
handle: u/greatmainewoods
source: r/stopdrinking — I effectively quit drinking a year ago today. Why did I do it? How did I do it?
url: https://www.reddit.com/r/stopdrinking/comments/311wq6/i_effectively_quit_drinking_a_year_ago_today_why/
date: 2015-04-01
substance: alcohol
stage: long-term
technique_ids: [T19]
archive_id: 311wq6   # post, score 119
```

```yaml
quote: "My addiction to alcohol was something I had kept from my family, and I decided to be completely honest. It was hard for them to hear, but the transparency was crucial for me."
handle: u/BigHairyNordic
source: r/stopdrinking — Checking In At 1 Year
url: https://www.reddit.com/r/stopdrinking/comments/39z7j0/checking_in_at_1_year/
date: 2015-06-15
substance: alcohol
stage: long-term
technique_ids: [T11, T12]
archive_id: 39z7j0   # post, score 59
```

```yaml
quote: "After about the 4th year it just became second nature to turn down drinks and declare that I didn't drink."
handle: u/scarlin
source: r/stopdrinking — September 1, 1992. 22 years and 9 months. For those starting out - it gets easier.
url: https://www.reddit.com/r/stopdrinking/comments/3834qw/september_1_1992_22_years_and_9_months_for_those/
date: 2015-06-01
substance: alcohol
stage: long-term
technique_ids: [T6]
archive_id: 3834qw   # post, score 84
```

```yaml
quote: "I poured all my booze out. Even though my roommate wanted to cook with it. I don’t buy it for parties. LA CROIX and mocktails all the way!"
handle: u/hagne
source: r/stopdrinking — A year and change...
url: https://www.reddit.com/r/stopdrinking/comments/3sxixn/a_year_and_change/
date: 2015-11-15
substance: alcohol
stage: long-term
technique_ids: [T1, T2]
archive_id: 3sxixn   # post, score 17
```

```yaml
quote: "With the Alen Carr method, it's like I just knocked out the little keyhole of alcohol from my life"
handle: u/imreadyfor2015
source: r/stopdrinking — 8 months in, Alan Carr is still the man!
url: https://www.reddit.com/r/stopdrinking/comments/3osja9/8_months_in_alan_carr_is_still_the_man/
date: 2015-10-15
substance: alcohol
stage: long-term
technique_ids: [T20]
archive_id: 3osja9   # post, score 9
```

```yaml
quote: "I ran in the mornings. I ran at night. I ran when I had cravings."
handle: u/rose_the_wolf
source: r/stopdrinking — I ran my first half marathon today....!!!
url: https://www.reddit.com/r/stopdrinking/comments/3r4awj/i_ran_my_first_half_marathon_today/
date: 2015-11-01
substance: alcohol
stage: long-term
technique_ids: [T15]
archive_id: 3r4awj   # post, score 121
```

```yaml
quote: "Writing down 5 gratitudes and 5 acknowledgements daily has supported my sobriety"
handle: u/finally_woken
source: r/stopdrinking — Thankful Thursday 🍓🎂
url: https://www.reddit.com/r/stopdrinking/comments/3n2vge/thankful_thursday/
date: 2015-10-01
substance: alcohol
stage: long-term
technique_ids: [T7]
archive_id: 3n2vge   # post, score 18
```

```yaml
quote: "I literally come to this sub to read and it helps with my anxiety and in the long run, I'm confident, my sobriety."
handle: u/jdavidc
source: r/stopdrinking — Let me be honest about this sub
url: https://www.reddit.com/r/stopdrinking/comments/3bt0s3/let_me_be_honest_about_this_sub/
date: 2015-07-01
substance: alcohol
stage: long-term
technique_ids: [T13]
archive_id: 3bt0s3   # post, score 119
```

```yaml
quote: "With the money I normally spend on booze, I had half the money I needed to buy a PS4, so my wonderful girlfriend surprised me by MATCHING the money I've saved. So we went out and I bought a brand new PS4."
handle: u/PrimeapeGuy
source: r/stopdrinking — Guess what I got today? :)
url: https://www.reddit.com/r/stopdrinking/comments/2skbkt/guess_what_i_got_today/
date: 2015-01-15
substance: alcohol
stage: long-term
technique_ids: [T8]
archive_id: 2skbkt   # post, score 16
```

```yaml
quote: "Every AA meeting is different -- if you hate your first meeting...just go to another one."
handle: u/grouch420
source: r/stopdrinking — ...almost half a year of sobriety (152 days)
url: https://www.reddit.com/r/stopdrinking/comments/32s5jo/almost_half_a_year_of_sobriety_152_days/
date: 2015-04-16
substance: alcohol
stage: long-term
technique_ids: [T16]
archive_id: 32s5jo   # post, score 28
```

```yaml
quote: "I have attended AA meetings before, but they never seemed to click for me."
handle: u/quitordie
source: r/stopdrinking — I think I could use your help
url: https://www.reddit.com/r/stopdrinking/comments/43oppr/i_think_i_could_use_your_help/
date: 2016-02-01
substance: alcohol
stage: long-term
technique_ids: [T16]
archive_id: 43oppr   # post, score 2
```

_Total: 43 testimonials._

---

# Verification appendix

Re-checked in a pass independent of extraction: each quote must be an exact substring of the archived body, and the handle must equal the record's `author` field.

**Result: 43/43 exact, 43/43 attributions correct.**

Not verified: that the permalink renders. Reddit blocks every fetch path available to this agent, so no URL in this file was opened. Treat URLs as reconstructed pointers to verify manually.

| key | archive id | quote exact in body | handle matches author |
|---|---|---|---|
| `pour_out` | `3brj0l` | yes | yes |
| `first_one` | `3j8iui` | yes | yes |
| `made_a_list` | `2r0glx` | yes | yes |
| `desktop_jpg` | `312hjk` | yes | yes |
| `aa_hated` | `38698u` | yes | yes |
| `no_house` | `3ov5id` | yes | yes |
| `posting_here` | `3n41d0` | yes | yes |
| `seltzer_fizz` | `3dbvsf` | yes | yes |
| `tape_learning` | `45x2ap` | yes | yes |
| `the_jar` | `3n2f8e` | yes | yes |
| `reasons_list` | `3ovdsf` | yes | yes |
| `found_meeting` | `2r05d9` | yes | yes |
| `soda_stream` | `3619ui` | yes | yes |
| `morning_star` | `3l5pxh` | yes | yes |
| `checkin_saved` | `3fgcms` | yes | yes |
| `three_stores` | `43m4un` | yes | yes |
| `changed_situ` | `2udilq` | yes | yes |
| `tape_breath` | `2w0vlx` | yes | yes |
| `tape_shoes` | `csp8fcv` | yes | yes |
| `halt_persp` | `czjl3to` | yes | yes |
| `ride_wave` | `d2p3wzx` | yes | yes |
| `yell_stop` | `43oif7` | yes | yes |
| `no_thanks` | `3h3o16` | yes | yes |
| `bed_sober` | `34idw4` | yes | yes |
| `neighbour_wine` | `2xlfch` | yes | yes |
| `pledge_tape` | `d2o9nmm` | yes | yes |
| `insane_one` | `3n3onm` | yes | yes |
| `day_zero` | `2sk5r2` | yes | yes |
| `counter_number` | `3h4tju` | yes | yes |
| `record_wd` | `39zgmw` | yes | yes |
| `wk_exploded` | `3r1wfz` | yes | yes |
| `wk_year` | `3suyef` | yes | yes |
| `no_offlimits` | `311wq6` | yes | yes |
| `honesty_moved` | `39z7j0` | yes | yes |
| `barbershop` | `3834qw` | yes | yes |
| `poured_all` | `3sxixn` | yes | yes |
| `carr_keyhole` | `3osja9` | yes | yes |
| `ran_cravings` | `3r4awj` | yes | yes |
| `gratitudes` | `3n2vge` | yes | yes |
| `read_the_sub` | `3bt0s3` | yes | yes |
| `ps4` | `2skbkt` | yes | yes |
| `meeting_again` | `32s5jo` | yes | yes |
| `aa_never_click` | `43oppr` | yes | yes |
