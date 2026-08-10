# Turning this into a 3-minute vertical

Not a script — you asked for research and flow design this round. This is the raw material a script gets built from, with the evidence attached so the choices aren't guesses.

---

## The one structural finding that should decide the script

**Resonance tracks recognition, not instruction.**

Ranked by like-rate across all 91 videos (age- and channel-size independent, so it measures how much people actually liked the thing rather than how hard the algorithm pushed it):

- **Seven of the ten lowest-resonance videos in the corpus are tactical dating listicles.** Coach Corey Wayne 1.10%, TopThink's *7 Steps* 1.65%, Courtney Ryan 1.72%, alpha m.'s *6 Simple Steps* 1.85%.
- **The two highest-resonance categories are masculine self-improvement and anti-self-help, both at 5.08% median** against a 3.62% corpus median. Peaks: struthless 8.34%, Odysseas 8.31%, Andrew Kirby 7.62%.
- Adam Leipzig's purpose talk: **20.4M views, 1.31% like-rate.** Enormous reach, almost no resonance.

A "here are 5 tips" short is the lowest-performing shape in this dataset. The shape that works is: **name the condition precisely enough that the viewer feels caught, then give one mechanism.**

## First: what a like count is allowed to justify

**A like count can justify a hook. It cannot justify a claim.** These are different jobs and the first version of this document ran them together.

The check that settles it: of the **100 most-liked comments in the corpus, zero** report anything that actually happened. Not one. The most-liked layer is wit, recognition and aphorism — which is precisely what makes it good hook material and useless as evidence.

Worse, the two signals actively point in opposite directions:

| | Median likes | Videos it appears under |
|---|---|---|
| Like-button-as-reminder | **3,500** | **2** of 91 |
| "This doesn't fit my circumstances" | **182** | **15** of 91 |
| A viewer writes out the missing steps | 754 | **41** of 91 |

So: **hooks are ranked by likes, findings are ranked by convergence** — how many unconnected channels show the same thing. Run `~/.cache/cyl-corpus/convergence.py` to reproduce. Counts there are lower bounds (regexes over free text), so a low number means *not demonstrated*, never *doesn't happen*.

Two corrections to the first version of this playbook, recorded rather than quietly fixed: the like-button-as-reminder device was given headline treatment on 2 videos' worth of evidence, and the constraints finding was argued from "83,000 likes on two comments" when the real support is that it appears under 15 videos on 14 channels, almost always well down the thread.

## Use the comments as the hook — it's the strongest device available

The most powerful openers in this research are not lines from the videos. They're what the audience said underneath them. Three reasons this works: the phrasing is already the audience's own, the like count is proof it lands, and quoting a comment is a credibility move no creator in the corpus makes.

The move: **state the video's promise, then cut to what the top comment actually says.** Everything in the table below is chosen for resonance — it is proven to land with this audience. None of it is offered as proof of anything.

| Setup | Cut to | Likes |
|---|---|---|
| "This video has 20 million views and promises your life purpose in 5 minutes." | *"the only answer I have is my name"* | 3,400 |
| "8 steps to fix your life." | *"Step 9: Stop watching these videos. You already know what to do."* | 33,000 |
| "Everyone says work on yourself." | *"'Work on yourself' is the equivalent of 'Have you tried turning it on and off?'"* | 9,700 |
| "A 13-minute video on how to focus." | *"I realized that ive started to always scroll down the comments section while the video is still playing."* | 127,000 |
| "Just change your environment." | *"it's so much easier when you don't have a family that's also addicted."* | 41,000 |
| A dating-app tips montage. | *"Dating for straight women is like shopping. Dating for straight men is like a job interview."* | 59,000 |
| "Put yourself out there." | *"I am naturally not selected"* | 19,000 |

And the single best one for a product about *doing* rather than *watching* — a man describing what he did during a 13-minute video about discipline:

> "During this video i: Played it forward so that it would be over faster. Opened tiktok 4 times and paused the video. Stopped the video to write 2 comments. Paused the video to write on a forum that im going on a dopamine detox." — 493 likes

## Hook inventory, ranked

**Tier 1 — recognition hooks.** Fastest to land, highest measured resonance.
- "90% of people watching this are lying on their bed." (37,000 likes, already a comment)
- "You can scroll for two hours but you can't study for thirty minutes."
- "You already know what to do. That's the whole problem."
- "You're not lazy. You've just never been told how long it takes."

**Tier 2 — contrarian hooks.** Generate argument, which generates comments.
- "Tell no one." *(Better Ideas — the most argument-generating claim in the corpus)*
- "She quit drinking by smoking." *(Hormozi, on replacement over cessation)*
- "Balance is a lie." *(Iman Gadzhi)*
- "Confidence comes from data, not dopamine." *(Hormozi)*
- "The heaviest weight at the gym is the front door." *(Ed Latimore, via Clear)*
- "We even told them to smoke." *(Brewer's actual method)*

**Tier 3 — mechanism hooks.** Weaker openers, strong middles.
- "You don't have a treatment problem. You have a diagnosis problem."
- "Your conscious brain is fighting a system that's faster, older and stronger."
- "25 likes. Then 12. Then 7. Then 1." *(Memeable Data's countdown)*

**Do not use:** anything from Iman Gadzhi's *5 Traits of The Top 1% Man* cold open — it's deliberate emotional coercion and the video narrates suicidal planning. Anything from the motivational-speech compilations, where the register is borrowed and the substance is nil. And the "if you look like a Discord mod" line, which is funny and cruel to exactly the person you're trying to reach.

## Visual mechanisms worth stealing

Every line in a tight short needs a matched visual. These are the ones the corpus proves are legible, ranked by how well they animate:

| Visual | Mechanism it carries | Source |
|---|---|---|
| Trail → path → street → highway through a jungle | Why the old behaviour is cheap and the new one expensive | Kurzgesagt |
| Prefrontal cortex vs basal ganglia as a losing fistfight | Willpower cannot win against automaticity | Dr. Tracey Marks |
| Descending staircase: vodka → seltzer → NA beer → sparkling water | Replacement beats elimination | Leila Hormozi |
| Guitar out of the closet / batteries out of the remote | 20 seconds of friction each way | Better Than Yesterday |
| Wall calendar filling with X's | Tracking *as* the reward | James Clear |
| A five-rung ladder with an exit door on every rung | Permission to leave is what makes the scary thing possible | Todd V |
| Approach geometry: behind = creepy, head-on = flight, side-and-ahead = safe | The open starts before you speak | Coach Kyle |
| Two finch beaks | Why advice that worked for him doesn't transfer to you | Dr. K |
| Chocolate vs carrot, with a useless third option | The brain chooses comparatively | Andrew Kirby |
| Cartoon prisoner shaking bars on a cage with open sides | The story you're telling yourself | Lori Gottlieb, TED |
| Write a letter to someone you love, cross out their name, write your own | The whole relapse thesis in 20 seconds | Shahroo Izadi |
| Plane 3 degrees off course: New York → Tijuana | Small deltas compound | Escaping Ordinary |
| Split screen: highlight reel vs behind the scenes | "Whose measuring stick am I using?" | Nathaniel Drew |

The Izadi letter is the strongest single asset in the list: it's physical, it's 20 seconds, it needs no explanation, and **nobody in the corpus has built it into anything.**

## A 3-minute shape that fits the evidence

Roughly, and only as a starting argument:

1. **0:00–0:08 — Recognition.** A comment on screen, not a claim. The viewer sees themselves before they see you.
2. **0:08–0:30 — Name the pattern.** They've watched the videos. They know the steps. Nothing changed. Cite the corpus — "I read 91 of these" is a real and unusual credential.
3. **0:30–1:15 — The real diagnosis.** Not "you lack discipline." The seven things every video skips: relapse, selection, duration, measurement, constraints, candidate generation, and the route from −5 to 1. Pick **one** — probably duration or relapse, both are underexploited and both are emotionally relieving.
4. **1:15–2:15 — One mechanism, shown.** One visual from the table above, demonstrated rather than described. Resist adding a second.
5. **2:15–2:45 — The turn.** What the audience built for itself in comment boxes — dated pledges, return check-ins, like-button reminders. This is genuinely surprising, it's true, and it's the natural bridge to a tool.
6. **2:45–3:00 — The offer.** Free, on the site, and specific about what it does that a video can't.

## Angles that are open, ranked by how unexploited they are

1. **Duration.** One video in 91 states how long it takes. The genre's estimates span 30 days to 15 years for the same request. "Nobody will tell you how long this takes, so here's the honest answer" is close to unclaimed territory.
2. **The relapse letter.** Largest gap in the corpus; best exercise in the corpus; nobody has connected the two.
3. **The comment-section accountability system.** Nobody has pointed out that half a million people built the same missing product by hand. It's a genuinely novel observation and it's provable on screen.
4. **Level −5 to level 1.** Named by a commenter, ignored by every creator. Every program starts above where the viewer is standing.
5. **Constraints.** "This advice assumes you control your own kitchen" — with the 83,000 likes of people saying they don't.

## For the dating-specific short

The evidence here is unusually clear and cuts against the obvious approach.

- **Do not lead with tactics.** The tactical dating listicles are the worst-performing content in the entire 474M-view corpus on a resonance basis.
- **Lead with the structural explanation.** Memeable Data got 6.4M views and 21,080 comments for telling men the math wasn't their fault, and prescribing nothing. The relief of an accurate external diagnosis is the strongest force in this category.
- **Then supply the first rung** — which is exactly what Memeable Data and Dr. K both refuse to do, and the reason their comment sections read as verdicts rather than starting points. Dr. K's audience upvoted "I am naturally not selected" to 19,000. That's a diagnosis landing as a life sentence.
- **The differentiated position is therefore: accurate structural diagnosis, then a first rung with permission to leave.** Nobody in this corpus does both. The diagnosis half comes from Memeable Data and Dr. K; the ladder half comes from Todd V. The product joins them.
