# 15 — What the repo's existing corpora already hold on addiction & behaviour change

Audit date: 2026-08-17. Everything quoted below was read from a file on disk and run through the
repo's own 5-gram verbatim verifier. Nothing here is reconstructed from memory or from a summary doc.

---

## 1. Honest inventory — notes vs. reality

The standing notes in `MEMORY.md` were checked item by item.

| Claim in the notes | Reality on disk | Verdict |
|---|---|---|
| lm-corpus at `~/.cache/lm-corpus` | Exists | ✅ |
| "372 transcripts / 2.38M words" | **374** `.txt` files in `text/`, **2,395,793** words | ✅ (slightly understated) |
| 5-gram verbatim verifier | `~/.cache/lm-corpus/merge-corpus.py`; mirrored as a test in `tests/unit/goals/lifeMasteryExemplar.test.ts` | ✅ real, and it runs |
| cyl-corpus at `~/.cache/cyl-corpus` | Exists | ✅ |
| cyl research in `docs/research/change-your-life/` | 7 files, 592 KB, incl. a 473 KB per-video extract file | ✅ |
| Reusable YouTube harvest rig | `discover.sh`, `fetch-one.sh`, `channel-baseline.sh`, `select.py`, `metrics.py`, `make-batches.py`, `convergence.py` — all present and readable | ✅ real and reusable |
| `src/goals/data/lifeMasteryCorpus.ts` | 8,867 lines, **1,264 cited entries** | ✅ |
| `docs/plans/quitting-a-vice.md` | 312 lines | ✅ |

### Sizes

**`~/.cache/lm-corpus`** — single-channel (Project Life Mastery / Stefan James).

```
text/     374 .txt files    13 MB   2,395,793 words   ← the corpus
subs/     749 .vtt files   224 MB                     ← timestamps live here
audio/                      44 MB                     ← ASR top-up for no-caption videos
findings/   8 .md files    432 KB   (dating, goals, identity, onboarding,
                                     purpose, reviews, routines, vision)
results/   22 .json files  712 KB   ← extraction results the verifier merges
```

**`~/.cache/cyl-corpus`** — 91 videos across ~54 channels, multi-perspective by design
(categories GEN / SCI / MEN / DATE / ANTI).

```
text/       91 .txt files   1.8 MB                    ← the corpus
raw/       178 .vtt + info.json                       ← timestamps + full metadata
meta/       91 .json        full attribution + top-20 comments each
findings/   24 files (12 batch .md + 12 .manifest)
comment-bank.json          176 KB
metrics.json                59 KB   relative-performance multipliers
```

### What is NOT here — the real gaps

- **No recovery-specific corpus exists.** Neither corpus was harvested for addiction. Both hit
  the topic incidentally. There is no sobriety, quit-lit, or recovery-channel material on disk.
- **`docs/research/recovery-testimonials/` contained only `README.md`** before this file.
- **lm-corpus has no structured metadata.** No `meta/*.json`, no channel field, no upload dates,
  no view counts, no comments. Attribution is three flat TSVs (`channel-list.tsv` 317 rows,
  `streams-list.tsv`, `shorts-list.tsv`). Union of the three covers **374/374** transcripts with a
  title — but 76 of 374 are missing from `channel-list.tsv` alone, so a lookup that reads only
  that file silently loses the livestreams. cyl-corpus does not have this problem.
- **The addiction material in lm-corpus is almost entirely un-mined.** The raw transcripts contain
  287 hits for "addiction"; the generated `lifeMasteryCorpus.ts` (1,264 entries) contains
  **8 lines** matching any addiction term, and most are video-game-addiction backstory used as
  *dating* origin material. The eight `findings/*.md` files are dating/goals/identity/onboarding/
  purpose/reviews/routines/vision — **no addiction or habit finding file exists.** The richest
  source in the whole corpus (below) was never extracted.

---

## 2. Hit counts

Word-boundary, case-insensitive, over `text/` in each corpus.

| Term | lm hits / files | cyl hits / files |
|---|---|---|
| habit | **396 / 97** | **259 / 30** |
| dopamine | **301 / 34** | **141 / 9** |
| addiction | **287 / 63** | 35 / 13 |
| discipline | 120 / 52 | 61 / 13 |
| willpower | 110 / 45 | 52 / 15 |
| quit | 109 / 56 | 53 / 24 |
| alcohol | 87 / 46 | 28 / 11 |
| drinking | 72 / 48 | 27 / 12 |
| porn | 48 / 14 | 12 / 6 |
| craving | 24 / 17 | 25 / 9 |
| smoking | 21 / 14 | 27 / 11 |
| gambling | 18 / 14 | 1 / 1 |
| moderation | 15 / 8 | 1 / 1 |
| quitting | 12 / 9 | 6 / 4 |
| temptation | 11 / 7 | 32 / 3 |
| withdrawal | 9 / 8 | 1 / 1 |
| sober | 7 / 5 | 1 / 1 |
| cold turkey | 7 / 3 | 1 / 1 |
| urge | 6 / 3 | 22 / 10 |
| addict | 5 / 4 | 1 / 1 |
| abstain | 3 / 2 | 1 / 1 |
| sobriety | 1 / 1 | 2 / 2 |
| **relapse** | **0 / 0** | 7 / 5 |

**The single most important number: `relapse` appears zero times in 2.4M words of lm-corpus.**
Stefan James never uses the word. That is a hard limit on what this corpus can supply — it has a
great deal on *why* people use and a great deal on *awareness*, and essentially nothing on what to
do after a slip. cyl-corpus supplies that gap from exactly one source (Dr. Tracey Marks), which
`docs/research/change-your-life/00-synthesis.md:80` had already flagged as a near-universal absence
across the genre.

### Densest files

**lm-corpus** (combined addiction-term line count):

| videoId | lines | words | title |
|---|---|---|---|
| `bT1akeSdIIM` | **198** | 10,158 | How To Overcome Addiction (Nobody Talks About This) |
| `E8mtiClhLWI` | 100 | 4,581 | Dopamine Detox: My Experience & Results After 2 Years |
| `oLQiUIJ7PsQ` | 74 | 42,710 | How to Step Up, Achieve Your Desires and Become LIMITLESS 💪 (livestream) |
| `QZjdmXreWd0` | 55 | 35,745 | Ask Me Anything! Live Q&A with Stefan James |
| `PWB6w9nyGII` | 51 | 7,724 | How To Overcome Anxiety (5 WAYS) |
| `Kz83kMosOWU` | 41 | 21,840 | The Life Mastery Blueprint & Life Management System |
| `AFgeREfiDgw` | 22 | 6,601 | How To Break Bad Habits & Addictions |

**cyl-corpus**:

| videoId | lines | channel | title |
|---|---|---|---|
| `9QiE-M1LrZk` | **80** | Better Than Yesterday | How I Tricked My Brain To Like Doing Hard Things (dopamine detox) |
| `rIxBg2Q9tQQ` | 52 | Newel of Knowledge | why trying to control yourself doesn't work |
| `PYaixyrzDOk` | 39 | Hamza | HOW TO FIX YOUR LIFE: Full Self Improvement Guide |
| `h6jSTr47CcI` | 38 | Andrew Kirby | DOPAMINE DETOX: Get Your Life Back Together |
| `PZ7lDrwYdZc` | 28 | Escaping Ordinary | Atomic Habits summary |
| `44iAPrQoYU8` | 23 | The Diary Of A CEO | Behaviour Change Scientist: How I Lost 120lbs With Kindness: Shahroo Izadi |
| `-moW9jvvMr4` | 19 | TED | A Simple Way to Break a Bad Habit — Judson Brewer |
| `8dHEG7WxR4c` | 16 | Mel Robbins | The Science of Making & Breaking Habits |
| `GjXY-l1EnhQ` | 9 | Dr. Tracey Marks | Why Bad Habits Stick (and How to Finally Break Free) |

---

## 3. Verification method

Every quote below was checked with `/tmp/.../scratchpad/verify.py`, which reimplements the rule in
`~/.cache/lm-corpus/merge-corpus.py:24-32` exactly: normalise to `[a-z0-9 ]`, cut the quote into
non-overlapping 5-grams, require **≥60%** of them to appear in the transcript. It then locates the
quote in the source `.vtt` to recover a timestamp.

**All 28 quotes below scored `gram_frac = 1.0` — every 5-gram present.** Zero rejections.

Timestamps are the **cue start** of the first matching caption, accurate to roughly one cue
(±3 s). Two were pinned by hand against the `.vtt` where the sliding window landed a cue early.

---

## 4. Extracted material — lm-corpus (Stefan James, Project Life Mastery)

### 4.1 `bT1akeSdIIM` — "How To Overcome Addiction (Nobody Talks About This)"

The richest single source on disk for this topic and **completely absent from the mined corpus.**
10,158 words, wholly about addiction, first-person throughout.
File: `~/.cache/lm-corpus/text/bT1akeSdIIM.txt`. Captions: `~/.cache/lm-corpus/subs/bT1akeSdIIM.en.vtt`.
Channel: Project Life Mastery (Stefan James). Title from `channel-list.tsv`.

**His definition of addiction** — `text/bT1akeSdIIM.txt:133-136`, ts `00:04:22`:

> i define it an addiction as any activity that you do consistently but you can't stop doing

Followed by a second criterion at `:153-157` — "not just something that you you can't stop doing
but also something that's causing harm or damage to your life".

**The humility argument (why willpower framing fails)** — `:115-118`, ts `00:03:48`:

> if you could have you would have solved it by now if you could have then you wouldn't have this
> problem you wouldn't have this addiction

**Ranking it against his other achievements** — `:246-252`, ts `00:08:11`:

> for me making a million dollars was easier than overcoming addiction for me attracting the woman
> of my dreams was a lot easier than overcoming addiction

**His own behaviour, concretely** — `:486-495`, ts `00:16:11`:

> i would play video games 16 hours a day i would skip school go home to play video games all day

Context at `:490-495`: "i'd get on the school bus to go to school my mom would go to work around
the same time once i got to school i'd walk home 30 minutes sneak into the house and play video
games all day skipping school". He also describes a binge-eating disorder following two fitness
competitions (`:519-540`) and pornography (`:542-596`) in the same first-person register.

**Environmental / lifestyle displacement** — `:896-908`, ts `00:30:24`:

> maybe your addiction mostly lives in the evening time when you're just there by yourself bored
> and you're more likely to act out

**The "welcome it" / letting-go technique (Sedona Method)** — `:1415-1418`, ts `00:47:39`:

> and you just allow it to run its course and when it runs its course it goes through you it's got
> nothing to stick to

**Named techniques in this video:** dopamine detox; abstinence + neuroplasticity reset; daily
meditation (started at 10 min guided via Calm/Headspace); the Sedona Method / letting-go technique;
12-step (with an explicit disagreement — he rejects the "I am an addict" identity label at
`:1188-1192`); lifestyle redesign around the high-risk window; therapy; community.
**Named books:** *Dopamine Nation* (Anna Lembke), *The Brain That Changes Itself* (Norman Doidge),
*Power vs. Force* (David Hawkins), *The Sedona Method*.

### 4.2 `AFgeREfiDgw` — "How To Break Bad Habits & Addictions"

The most *operational* file in lm-corpus. It is a taught session with written assignments.
File: `~/.cache/lm-corpus/text/AFgeREfiDgw.txt`.

**The core rule** — `:310-319`, ts `00:11:32`:

> to break a habit you must make a habit you've got to replace this bad habit with something new

**Why, stated as an observed failure mode** — `:325-328`, ts `00:11:15`:

> people they smoke cigarettes they stop smoking they replace that with eating

**The habit cycle** — `:639-645`, ts `00:22:18`:

> the habit cycle there's three parts to the habit cycle we're gonna break this down the first one
> is a trigger the second one is a thought the third one is an action

He then argues triggers are **not removable** (`:666-669`: "these triggers are biologically
hardwired they're not going to go away you will always be triggered") and that the intervention is
to widen the gap: "you must create space space between the trigger the thought and the action"
(`:853-855`), citing Frankl.

**"Wrong thought / right thought"** — `:935-942`, ts `00:33:28`:

> you have a negative thought a self-deprecating thought a limiting thought you say to yourself
> wrong thoughts

**The thank-you letter, then the goodbye letter** — `:1002-1010`, ts `00:35:37`:

> a thank you letter to that addiction that habit that behavior so you might write a thank you
> letter thanking this habit for what it's provided for you in your life

Worked example follows at `:1011-1035` ("dear procrastination or dear binge eating thank you for
always being there for me…"), then the goodbye letter at `:1036-1057`. This is the single most
directly product-shaped exercise in either corpus.

**Assignment list, verbatim summary at `:1071-1080`:** pick 1–3 habits; journal triggers and
thoughts; wrong-thought/right-thought; 10 min mindfulness meditation daily; thank-you and goodbye
letters. Plus accountability (`:987-991`).

**Named source:** Charles Duhigg, *The Power of Habit* — he quotes it at `:379-380`: "we know that
a habit cannot be eradicated it must instead be replaced". (Note: that is Stefan quoting Duhigg, so
it is a **second-hand quote inside a transcript** — cite it as such, not as Duhigg's book.)

### 4.3 `E8mtiClhLWI` — "Dopamine Detox: My Experience & Results After 2 Years"

**Definition** — `text/E8mtiClhLWI.txt:315-318`, ts `00:10:56`:

> the dopamine detox is where you intentionally remove things that over stimulate dopamine for a
> period of time

His own protocol follows at `:319-351`: device blockers on phone and computer; removed social
media, pornography, alcohol (down to ~monthly), marijuana; then explicitly *replaced* the freed
time (`:377-379`). He rejects total abstinence as universal advice at `:277-282`: "i still you know
engage in some of these things occasionally and i want you to know it's okay to do so here and
there but it's the over consumption the overstimulation of it that's going to have negative
effects".

### 4.4 `oLQiUIJ7PsQ` — livestream Q&A, 42,710 words

Answers live viewer questions about porn and alcohol. Untitled in `channel-list.tsv`; title
"How to Step Up, Achieve Your Desires and Become LIMITLESS 💪" recovered from `streams-list.tsv`.

**The denial mechanism, via a Robin Williams anecdote** — `:3308-3311`, ts `01:56:56`:

> there's a personality in your brain with the voice it just says one more one more one more it's
> not going to be that bad if I just have one more drink

**Named as the central obstacle** — `:3300-3304`, ts `01:56:44`:

> the biggest problem with addiction is people think I can stop anytime that's the biggest lie that
> they tell themselves

**A usable decision test** — `:3260-3263`, ts `01:55:15`:

> is it benefiting me long-term a year from now five years ten years from now is it benefiting my
> relationship five or ten years from now

---

## 5. Extracted material — cyl-corpus

Full attribution for every video is in `~/.cache/cyl-corpus/meta/<id>.json`
(channel, channel_id, channel_url, webpage_url, upload_date, view_count, duration, chapters).

### 5.1 `-moW9jvvMr4` — Judson Brewer, TED, uploaded 2016-02-24, 16.36M views

The strongest *mechanism* source in either corpus. File: `~/.cache/cyl-corpus/text/-moW9jvvMr4.txt`.

**The loop** — `:52`: "Trigger, behavior, reward." Elaborated `:38-84`.

**The intervention — and it is the opposite of restraint** — `:123-126`, ts `00:03:34`:

> we even told them to smoke. What? Yeah, we said, "Go ahead and smoke, just be really curious about
> what it's like when you do."

**What a participant reported** — `:130-133`, ts `00:03:52`:

> Mindful smoking: smells like stinky cheese and tastes like chemicals, YUCK!

He names the move: knowledge → wisdom, "knowing in her bones" (`:141-145`), and calls the mechanism
**disenchantment** (`:147`, `:176-192`).

**Why cognitive control fails under load** — `:161-175`: the prefrontal cortex "is also the first
part of our brain that goes offline when we get stressed out".

**Cravings decomposed** — `:217-222`, ts `00:06:28`:

> We start to notice that cravings are simply made up of body sensations -- oh, there's tightness,
> there's tension, there's restlessness -- and that these body sensations come and go.

**The efficacy claim** — `:237-240`, ts `00:07:12`:

> we found that mindfulness training was twice as good as gold standard therapy at helping people
> quit smoking

**Techniques named:** curiosity-as-substitute-for-restraint; mindful engagement with the behaviour
rather than suppression; disenchantment; noticing craving as decomposable body sensation;
in-context ("context-dependent memory") delivery of the tool at the moment of the urge (`:270-279`)
— which is a direct argument for an app.

### 5.2 `44iAPrQoYU8` — Shahroo Izadi, behaviour-change specialist, Diary Of A CEO, 2023-02-16

The only trained clinician in either corpus talking about her own change and her clients'. She
trained addiction staff and worked in criminal justice (`:507-510`).

**Assume failure into the plan** — `:932-934`, ts `00:31:27`:

> you can have the best plans in the world but you should assume that your plans will not go to plan

**Reframe the behaviour as a solution, not a defect** — `:413-417`, ts `00:13:45`:

> they focus on what's wrong with the behavior that they're engaging in as opposed to how it's
> serving them they look at it as a problem as opposed to a solution

**On self-talk** — `:441-443`, ts `00:14:44`:

> people think that like tough love when you're speaking to yourself often isn't very smart love

**The blame/responsibility split** — `:483-486`, ts `00:16:09`:

> how did I come to be this way with compassion how cool is it that this isn't my fault but I've
> decided to make it my responsibility

**Urges as signals, not orders** — `:492-497`, ts `00:16:28`:

> urges cravings to listen in on the way that I speak to myself and work out whether these
> predictable alerts from my body are turning into commands that I'm obeying

**Her named failure modes** (`:362-436`): fixating on the long-term outcome and expecting it to be
motivating in the moment; focusing on deficits rather than assets; "taking life off hold";
treating the behaviour as a problem rather than as something that serves a need.
**Her named test** for any reward (`:404-407`): "if I started doing it now would it put me in a
better position to do difficult things".
**Her kindness/firmness analogy** at `:981-994` (the 11 a.m. treat you stop giving a child).

### 5.3 `GjXY-l1EnhQ` — Dr. Tracey Marks, psychiatrist, 2025-04-16

The only source in either corpus with an explicit relapse protocol.

**Relapse framing** — `text/GjXY-l1EnhQ.txt:185-190`, ts `00:09:36` (pinned against
`raw/GjXY-l1EnhQ.en.vtt:374`):

> Relapse, isn't failure it's feedback. Your brain is in the process of rewiring, every time you
> return to the new behavior after you slip, you're strengthening the right pathway. It's the
> return, not the mistake that builds resilience.

**The 10-minute rule** — `:180-183`, ts `00:09:17` (pinned against `raw/GjXY-l1EnhQ.en.vtt:363`):

> the 10-minute rule. When a craving hits, tell yourself "I'll wait 10 minutes." Most urges lose
> their intensity with time

**The replacement rule** — `:165-169`, ts `00:08:29`:

> the replacement rule. Swap the old habit, for a new behavior, and decide in advance what it's
> going to be. So this takes some pre-planning, the replacement should satisfy the same underlying
> need.

Her full five: environmental design / friction (`:151-156`), implementation intentions
(`:157-164`), replacement rule, habit stacking (`:175-179`), 10-minute rule. Then the post-slip
debrief at `:190-195`: "treat it like data what triggered it? what thought patterns were active?
what can you do differently next time?"

⚠️ **Note for `src/vice/`:** her implementation-intention examples are phrased as *substitutions*
("If I feel stressed, then I'll take these three deep breaths instead of checking my phone"), not
as negations. That is consistent with the quit-vice module's standing rule that negation if-then
plans are refused. Her framing can be cited without violating it.

### 5.4 Viewer comments — first-person accounts

`meta/*.json` holds **1,860 top-comments** across 91 videos. **45 are addiction-related.** These are
the closest thing to recovery testimonials already on disk. Full text, author, like count and
source video are in `~/.cache/cyl-corpus/meta/<id>.json` → `top_comments[]`.

The three strongest, verbatim:

**On craving duration** — `meta/-moW9jvvMr4.json`, 7,300 likes:

> I quit smoking 12 years ago. The physical withdraw just lasted the first 48 hours, after that time
> my body didn't beg me for nicotine anymore. After that all I had to fight was the impulse to light
> a cigarette. What I learned in the process is that the impulse and crave last no longer than 40
> seconds. So next time you want to do what you shouldn't, remember: fight that crave and it will
> vanish in less than 40 seconds

**On disclosure, and why it backfired** — `meta/_XIihESyy5g.json` (Better Ideas), 1,500 likes:

> The "Tell no one" rule is spot on. After being a binge drinking alcoholic for close to a decade, I
> quit one day and told no one. I felt like it was so important to me that it needed to stay with me
> until I had a better grip on my life.

**On environment as the binding constraint** — `meta/Ufm0yPA-kWc.json` (Matt D'Avella,
*I quit sugar for 30 days*), **41,000 likes** — the single most-liked comment in the corpus:

> it's so much easier when you don't have a family that's also addicted.

Also present: a 6,400-like "3 months sober today. Went from a suicidal drug addict and alcoholic and
obese to working out twice a day…" on `meta/WNSZ6xouNv4.json` (Chris Williamson / Goggins); a
1,800-like account of a 12-year YouTube addiction on `meta/XEb89CQJPO4.json` (HealthyGamerGG); an
847-like monk-mode pledge with a dated start and explicit rules on `meta/56AD4lejvag.json`.

⚠️ These are **the accounts of private individuals**, not public figures speaking on the record.
Treat them as more sensitive than the transcripts, not less. Paraphrase or aggregate for product
copy; do not reproduce identifying detail.

---

## 6. Technique index

Consolidated, with the source that actually names each one.

| Technique | Source | Where |
|---|---|---|
| Replacement rule (break a habit → make a habit) | Stefan James; Dr. Tracey Marks | `AFgeREfiDgw:310-319`; `GjXY-l1EnhQ:165-169` |
| Trigger → thought → action, widen the gap | Stefan James | `AFgeREfiDgw:639-645`, `:853-855` |
| Trigger → behaviour → reward loop | Judson Brewer | `-moW9jvvMr4:52` |
| Curiosity instead of restraint; disenchantment | Judson Brewer | `-moW9jvvMr4:120-147`, `:176-192` |
| Craving as decomposable body sensation | Judson Brewer | `-moW9jvvMr4:217-222` |
| 10-minute rule (urge surfing, timed) | Dr. Tracey Marks | `GjXY-l1EnhQ:180-183` |
| Implementation intentions (substitution-framed) | Dr. Tracey Marks | `GjXY-l1EnhQ:157-164` |
| Environmental design / friction | Dr. Tracey Marks | `GjXY-l1EnhQ:151-156` |
| Habit stacking | Dr. Tracey Marks | `GjXY-l1EnhQ:175-179` |
| Relapse-as-feedback + post-slip debrief | Dr. Tracey Marks | `GjXY-l1EnhQ:185-195` |
| Plan-for-plan-failure; the self-talk at the slip | Shahroo Izadi | `44iAPrQoYU8:928-955` |
| Behaviour-as-solution reframe | Shahroo Izadi | `44iAPrQoYU8:413-436` |
| Kindness + firmness held together | Shahroo Izadi | `44iAPrQoYU8:974-994` |
| Reward test ("would it put me in a better position to do difficult things") | Shahroo Izadi | `44iAPrQoYU8:404-407` |
| Thank-you letter → goodbye letter to the habit | Stefan James | `AFgeREfiDgw:1002-1057` |
| Wrong thought / right thought | Stefan James | `AFgeREfiDgw:935-966` |
| Dopamine detox (device blockers + replacement activity) | Stefan James | `E8mtiClhLWI:315-379` |
| Letting-go / Sedona (welcome the sensation, let it run out) | Stefan James | `bT1akeSdIIM:1400-1432` |
| Lifestyle redesign around the high-risk window | Stefan James | `bT1akeSdIIM:896-908` |
| Long-horizon honesty test (1 / 5 / 10 years) | Stefan James | `oLQiUIJ7PsQ:3260-3263` |
| Daily meditation, ramped from 10 min guided | Stefan James | `bT1akeSdIIM:1016-1025` |

**Convergence worth noting:** the replacement rule and "widen the gap between trigger and action"
are the only two techniques that appear in *both* corpora from *unconnected* speakers — a
self-help YouTuber and a board-certified psychiatrist. Everything else is single-sourced.

**Divergence worth noting:** Brewer says stop forcing and get curious; Stefan James says attack it
from every angle at once (`bT1akeSdIIM:456-462`). Izadi says assume your plan fails; Stefan James's
material contains no post-slip step at all. These are genuinely different theories of change and
the product should pick one rather than blending them.

---

## 7. Copyright and attribution

**These are third-party copyrighted YouTube transcripts, plus viewer comments by private
individuals.** Verbatim quotes need the same care as any other copyrighted source: short, attributed,
and used to make a point about the source rather than as substitute product copy. The comments
carry an additional personal-data concern the transcripts do not.

**Does the existing tooling track attribution well enough to cite?**

| Field | cyl-corpus | lm-corpus |
|---|---|---|
| video ID | ✅ filename | ✅ filename |
| title | ✅ `meta/*.json` | ⚠️ 3 flat TSVs; must union all three |
| channel + channel_id + channel_url | ✅ | ❌ **absent** (single channel, implied only) |
| canonical URL | ✅ `webpage_url` | ❌ (reconstructable from ID) |
| upload date | ✅ `upload_date` | ❌ **absent** |
| view / like counts | ✅ | ❌ |
| timestamp for a given quote | ✅ `raw/*.vtt` (178 files) | ✅ `subs/*.vtt` (749 files) |
| comments | ✅ top-20 per video | ❌ |

**Verdict:** cyl-corpus is citation-ready today. lm-corpus is not — it can produce
*videoId + title + timestamp*, which is enough to build a working YouTube deep link
(`https://youtu.be/<id>?t=<seconds>`), but channel and date have to be filled in by hand or
re-fetched. **If lm-corpus material ships, backfill metadata first** by running the cyl rig's
metadata step over `all-ids.txt` (one command, §8.4).

Everything a citation needs is recoverable — but only cyl-corpus has it in one place.

---

## 8. The harvest rig — real, reusable, and worth pointing at recovery

### 8.1 Verdict

**Yes, reuse it.** It is not a sketch; it is a working seven-stage pipeline that produced the
91-video corpus on disk, and its stages are cleanly separated by file. Nothing in it is
change-your-life-specific except `queries.txt`. Swapping the queries and the quotas is a
config change, not a rewrite.

### 8.2 What each piece does

| File | Role |
|---|---|
| `queries.txt` | 39 seed queries tagged by category (`CAT\|query`). **The only topic-specific file.** |
| `discover.sh` | `yt-dlp ytsearch20:` per query → `candidates.jsonl`. Throttled 2 s. |
| `select.py` | Dedupe; quota per category; **channel cap of 3**; duration 180–6000 s; >5,000 views → `corpus.tsv` |
| `fetch-one.sh <id>` | Per video: VTT subs (manual `en` preferred, auto `en-orig` fallback), top-20 comments, full info JSON → `text/`, `meta/`, `raw/`. Idempotent (skips if both outputs exist). Throttled, 4 retries. |
| `channel-baseline.sh <cid>` | Up to 60 recent uploads per channel → `channels/` |
| `metrics.py` | views-per-day ÷ channel median views-per-day = outperformance multiplier |
| `make-batches.py` | Round-robin split by category into N agent batches + manifests |
| `convergence.py` | Counts how many *unconnected channels* show the same finding |

Two design decisions in there are the reason the cyl research held up and should be kept:
**the channel cap of 3** (`select.py:22`), which stops one prolific creator dominating, and
**`convergence.py`**, which ranks findings by cross-channel agreement rather than by like count.
`00-synthesis.md:31` records the correction that forced the second one — it is worth reading before
reusing the rig, because the same trap is waiting in recovery content, where the most-liked comment
will always be the funniest one.

### 8.3 What a recovery harvest would take

- **Effort:** roughly a day. ~2 h wall-clock for discovery + fetch of 90 videos at the current
  throttle, plus the mining pass.
- **Code changes:** `queries.txt` (rewrite), `select.py:20` `QUOTA` dict (rewrite categories).
  Everything else runs unmodified.
- **Prerequisites:** `yt-dlp` and `node` (the scripts pass `--js-runtimes node`). Both are already
  working — the rig ran in August.
- **Suggested categories:** `SUB` (alcohol/drugs), `BEH` (porn/gambling/gaming/phone),
  `CLIN` (clinicians and researchers), `TEST` (long-form personal testimony / sobriety vlogs),
  `CRIT` (critiques of AA, of the disease model, of NoFap) — keep a critical category, as the cyl
  `ANTI` bucket produced disproportionately useful findings.
- **New risk, and it is the real one:** recovery content includes people in active crisis. The
  comment harvest will collect suicidal ideation. `00-synthesis.md:116` already records this hazard
  for the Sisyphus 55 video. Decide the handling policy **before** running `fetch-one.sh`, not after.

### 8.4 Concrete commands

```bash
# 0. New workspace, cloned rig (scripts hardcode ~/.cache/cyl-corpus — sed the path)
mkdir -p ~/.cache/rec-corpus/{logs,raw,text,meta,channels,channels_d,findings}
cd ~/.cache/cyl-corpus
cp discover.sh select.py fetch-one.sh channel-baseline.sh chan-deep.py \
   metrics.py make-batches.py convergence.py export-table.py ~/.cache/rec-corpus/
sed -i 's|cyl-corpus|rec-corpus|g' ~/.cache/rec-corpus/*.sh ~/.cache/rec-corpus/*.py

# 1. Seed queries  (CAT|query, one per line)
cat > ~/.cache/rec-corpus/queries.txt <<'EOF'
SUB|how i got sober
SUB|quitting alcohol changed my life
SUB|what nobody tells you about getting sober
BEH|how i quit porn for good
BEH|quitting gambling addiction story
CLIN|neuroscience of addiction and recovery
CLIN|addiction psychiatrist explains cravings
TEST|one year sober what changed
CRIT|why AA didn't work for me
EOF

# 2. Discover  (~2 s/query)
bash ~/.cache/rec-corpus/discover.sh

# 3. Select — edit QUOTA in select.py:20 to your categories first
python3 ~/.cache/rec-corpus/select.py

# 4. Fetch transcripts + comments + metadata  (THE workhorse; ~45 s/video)
cut -f1 ~/.cache/rec-corpus/corpus.tsv | tail -n +2 \
  | xargs -I{} -P1 bash ~/.cache/rec-corpus/fetch-one.sh {}

# 5. Channel baselines → outperformance multipliers
cut -f4 ~/.cache/rec-corpus/corpus.tsv | tail -n +2 | sort -u \
  | xargs -I{} bash ~/.cache/rec-corpus/channel-baseline.sh {}
python3 ~/.cache/rec-corpus/metrics.py

# 6. Split into agent batches, mine, then rank by CROSS-CHANNEL agreement (not likes)
python3 ~/.cache/rec-corpus/make-batches.py
python3 ~/.cache/rec-corpus/convergence.py
```

**Single-video smoke test before committing to a full run** — this one command proves the rig works
end to end and costs ~45 s:

```bash
bash ~/.cache/cyl-corpus/fetch-one.sh dQw4w9WgXcQ   # → text/, meta/, raw/ populated; prints "OK <id> words=… comments=…"
```

### 8.5 Backfilling lm-corpus metadata

Independent of any new harvest, and worth doing if lm-corpus quotes are going to ship:

```bash
# Fills the channel / upload_date / URL gap for all 374 lm transcripts.
# fetch-one.sh skips a video only when BOTH text/ and meta/ exist, so pointing it at a
# corpus with no meta/ dir re-fetches metadata while leaving transcripts intact.
mkdir -p ~/.cache/lm-corpus/{meta,raw}
cut -f1 ~/.cache/lm-corpus/all-ids.txt \
  | xargs -I{} -P1 bash ~/.cache/lm-corpus/fetch-one.sh {}   # after copying + sed-ing the script in
```

---

## 9. Bottom line

1. **Both corpora are real and the notes were accurate**, including the 5-gram verifier, which
   runs and passed 28/28 quotes at 1.0.
2. **Neither corpus is a recovery corpus.** They contain good incidental material — one excellent
   dedicated video, one excellent taught habit session, and four strong cyl sources — and no
   sobriety testimony at scale.
3. **`bT1akeSdIIM` and `AFgeREfiDgw` are the find.** 16,759 words of first-person addiction and
   habit-change material by a speaker the product already quotes, sitting un-mined next to a
   1,264-entry corpus that contains almost none of it. Extracting them costs nothing but a mining
   pass and produces cited entries through the existing merge.
4. **The relapse gap is structural, not incidental.** Zero occurrences in 2.4M words of lm-corpus;
   one usable source in cyl. A recovery product cannot be built on lm-corpus alone.
5. **The harvest rig is worth reusing**, roughly a day's work, and its two hard-won design
   decisions (channel cap, convergence-over-likes) transfer directly.
6. **Fix lm-corpus attribution before shipping any quote from it** — no channel, no date, and the
   title lookup silently misses 76 files if you read only `channel-list.tsv`.
