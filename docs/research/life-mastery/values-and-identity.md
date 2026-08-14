# Values and identity, from the transcripts

Read from `~/.cache/lm-corpus/text/` (372 Stefan James transcripts), not from our
own notes. Written because `/test/life-mastery` asked "who do you need to become"
and "who are you committed to being" back to back, which read as the same
question, and because its values list was a static suggestion chip row that went
nowhere.

Primary sources:

| Video | What it is |
|---|---|
| `Lp_GOrM16Xc` | "Determine and create your core life values". The whole values procedure. |
| `8kco2rjijjE` | "How to manage your life". The **driving force**: vision, purpose, identity, code of conduct. |
| `I1MhBE-0zxU` | Goal setting. "Who do you need to become" in its actual context. |
| `Rw2qaMltFcY` | The life plan book. A vision AND a purpose for **each area**, then goals. |
| `xTWuLHNc6aM` | Attracting people. Same "who do you need to become" job. |
| `PliFBr__T7Y`, `OgRGJBpTOeU` | Morning ritual. Where all of it gets read back. |

## 1. They are not the same question

**"Who are you committed to being?" is identity**, and it is his verbatim
wording. From `8kco2rjijjE`:

> "the only person that can define who you are is you and you have to consciously
> do it… just ask yourself who am I, who would I want to be, **who am I committed
> to being**, if I were to look my name up in the dictionary what would it say
> about me… this is another piece as well that I associate to **every week**"

His own answer is present tense and long: "I'm an extraordinarily loving man who
loves God, people, family, friends… I'm a creator of magic moments… I'm a force
for good… I'm present, I'm a good listener." It is a declaration you condition,
not a plan. "When you condition that you start to become that."

**"Who do you need to become?" is the gap**, and it never appears in the driving
force. It appears attached to an outcome. From `I1MhBE-0zxU`:

> "who do you need to become to achieve that… **in terms of character, skill set,
> focus, self-discipline, daily habits**"

and `xTWuLHNc6aM`: "define who you need to become to attract them." It produces
work. It is the bridge from the vision to the plan.

So: identity is who you declare yourself to be now; the become question is what
is missing between here and there. Putting them side by side with no framing was
the bug, not having both.

**"How are you committed to showing up?" is a third thing** — the **code of
conduct**, his standards: "to be fun playful outrageous, to be loving and caring,
to be confident… those are the standards I just remind myself every week." It
belongs with the other three, because he groups them: "so these **four things**
are the driving force."

#### But identity and conduct read as one question, and nearly are

Re-checked after "isn't that the same thing?". They are close enough that **he
blurs them himself**: describing the STANDARDS list he says "this is who I'm
committed to being, this is the standards that I want to live my life by". Our
page made it worse by phrasing both prompts as "committed to", so the screen
showed two lists of good qualities in the present tense with near-identical
headings.

The difference is in the two lists, not in his framing:

| | Identity | Code of conduct |
|---|---|---|
| Prompt | "who am I committed to being, if I were to look my name up in the dictionary what would it say about me" | "how you're committed to showing up… standards you have set to live your life by" |
| His answer | "I'm an extraordinarily loving man… I'm an amazing friend, son, brother, uncle, strategist, marketer… I'm an athlete, bodybuilder and fitness model… I'm a Muay Thai fighter" | "to be fun playful outrageous, to be loving and caring, to be confident… to be disciplined… to be outgoing social and friendly" |
| Shape | long, rangy, nouns as much as adjectives | short by his own account, every line "to be" |
| What it is | what is TRUE of you, conditioned weekly until it is ("when you condition that you start to become that") | the bar you set, which you can fall short of on a Tuesday and come back to |

So: **what is true of you** vs **what you hold yourself to**. The page asks "Who
are you?" and "What do you hold yourself to?", neither says "committed to", and
each prints a few words of his own list under the box. Seeing "an amazing friend,
son, brother" beside "to be disciplined" separates them faster than any
explanation does, which is why `NsReviewPrompt` grew an `example` field rather
than the help text growing another sentence.

### The driving force, in his order

1. **Vision** — what you want your life to be about.
2. **Purpose** — "what is my ultimate purpose for achieving this vision? Why do I
   want this? What will this give me?"
3. **Identity** — who you are committed to being.
4. **Code of conduct** — the standards, how you show up.

Read weekly, "sometimes twice a week if I'm down". Values are read **daily**
(below). Both are in the morning ritual as the "driving force" step, which we
already ship.

## 2. Values are a procedure, not a word list

`Lp_GOrM16Xc`, start to finish:

**Two passes, and the diff is the insight.**

- Pass 1, diagnosis: *"What's been most important to me in my life?"* — asked
  over and over ("what else has been important for you"). This is the list that
  produced the life you already have. "Why do you have the life that you have…
  the most important core decisions that we make have always been based on our
  values."
- Pass 2, after the vision: *"What do my values need to be in order to create the
  life that I want?"* Some of it will not be on the first list at all.

We only ever asked pass 2, so nothing could be compared and the exercise had no
diagnosis in it.

**The question is never asked bare, and that is the part that makes it work.**
Re-checked against the transcript after "people don't think in terms of values
without prompting". He asks his question and then, in the same breath, does four
things:

1. **Take the first answer.** "as I ask you that question right now, what's the
   first answer that comes up… just trust whatever comes up, don't think about
   it too much, don't overanalyze it, don't get too much in your head, because
   oftentimes the first answer is in our gut, it's really our intuition."
2. **He reads a menu out loud.** Verbatim, in this order: *"security, um, has it
   been being safe, has it been happiness, has it been success, has it been
   money, has it been family, has it been love, has it been passion, has it been
   friends, has it been travel — what has it really been for you?"* This is the
   scaffolding. It is not a suggestion row we invented for the page; it is how he
   gets an answer out of somebody who has never thought in these terms.
3. **He loops it.** "and then I want to ask yourself the question again, what
   else has been important for you in life… ask again what else has been
   important for you in your life, write that down, again… you're going to keep
   asking yourself that question, you're going to go deep."
4. **He steers to the emotion, in pass 1, not only at ordering time.** "try to
   steer that your focus and direction to the emotion, the core emotion that
   you've been after to experience, the emotional states, and write those down."

So the page asks his question verbatim and ships all four: the "first answer"
instruction as the help, the menu as the chip row under a "Has it been…" line,
"And what else has been important to you?" printed from the first answer onward,
and the emotion steer beside the box. An earlier build rewrote the question
instead ("What have you been living by so far?"), which was a fix aimed at the
wrong thing — the question was never the problem, the missing prompting was.

**Means values vs ends values.** This is the answer to "what if somebody types
something that is not a value".

> "there's actually two different types of values, there's a means value and an
> ends value. Often when someone says they value family, which is great… what is
> the emotion that you're really after? Because at the core of it our values are
> just emotions… if you say it's money, then what are you really after money for?
> Maybe it's security, maybe it's freedom, maybe it's adventure."

So the correction is a **follow-up question on the item**, never a rejection and
never a whitelist. "Family", "money", "my business" and "think better thoughts"
are all fine to type; each earns "and what is the emotion you are really after
from that?" The typed word is kept either way.

**The hierarchy is the whole point.**

> "whatever number one is, everything else is being filtered through that…
> ask yourself what has to be number one, then **is it this one or this one**, is
> it this one or this one"

Pairwise comparison, explicitly. And: "I'd recommend maybe coming up with **at
least seven** values… I don't care if it's 10 values, 15, 20."

**The payoff of ordering is conflict detection.** Both of his examples are the
same shape — a means value ranked above the end it was supposed to serve:

- Success above happiness → "I'm only going to allow myself to feel happy once
  I'm successful." His own years on "the pain train".
- Fitness above health → two fitness competitions, "the most fit I've ever been
  and the most unhealthy I've ever been", shot adrenals.
- Business above love/family → checking email first thing "you're valuing your
  business more than all the other things".

**Values audit the areas you are failing in.** The client story:

> "he really wanted to change his health… and when we listed his values he never
> even had health on the list. No wonder you're not creating long-term change
> here… if you asked a super athletic healthy fit person their values, I can
> guarantee health and fitness is high on their list."

That is where the list "goes": an area you rated under the floor, with no value
in your list pointing at it, is a diagnosis the app can make and we were not
making.

**Where they live afterwards.** "Write it out, put it up on the wall where you
can see it every day… I read it every single day, I review them, I say
affirmations as part of my morning ritual." Revisit "every year or two, because
at different stages of your life your values will change", and whenever the
vision changes.

## 3. He runs the same structure per area

> "I have my vision, I have my purpose, but I also have **a vision and a purpose
> for each area of my life**. And I have goals for each area as well… I've got my
> vision here, I've got my purpose for my relationship, and then I've got my
> goals, my one-year goals, my three-month goals, my monthly goals in that area.
> So I do that for each area of my life." — `Rw2qaMltFcY`

So per area: **vision → purpose → goals**, and separately **rituals** for each
area ("you got to have a vision for each area of your life", `NidJpDcCkQs`).

What he does NOT do per area is values and identity; those are whole-life in his
material. Our flow already carried a per-area values list and a per-area identity
line, which is ours rather than his, and they are worth keeping for one reason
the transcripts do support: the whole-life list has to come from somewhere, and
"what would you have to value to live at that 10" asked twelve times produces a
far better pool than one blank box asked once.

The gap was the **purpose**. We had the vision, the goals and the rituals per
area and no purpose, which is the one of the four that decides whether the other
three survive a bad month.

## 4. Where the ordering belongs

He teaches make-the-list-then-rank-it in one sitting. That works in a seminar,
where the vision work has already happened over two days. In a page where the
opening screen is a blank paragraph, ranking immediately means ranking the six
words somebody could think of in the first two minutes.

The material supports splitting it: the second list is explicitly derived from
the vision ("once you know your vision, you make the list"), and he also derives
values per area of life. So the fuller the picture, the better the list. Noticing
happens on screen one; ordering happens on the review, after twelve areas have
been rated, pictured, given a purpose, and asked what they demand of you.

## 5. What this changed in `/test/life-mastery`

| Finding | Change |
|---|---|
| Driving force is vision → purpose → identity → standards | Star tab reordered; `conduct` moved up from the review tab, keeping its id |
| Identity ≠ the gap | The become question is reframed in his own words (character · skill set · focus · self-discipline · daily habits) and moved after identity, where it hands off to the plan |
| Two value passes | `plan.currentValues` added; both lists on the page, with the diff shown |
| Means vs ends | A drill on any item, offered not enforced |
| Hierarchy by pairwise comparison | "Which is more important?" duel replaces remove-and-re-add |
| Conflicts | The three pairs he names, checked against the user's order |
| At least seven | Shown as the target on the list |
| Values audit the areas | An under-floor area with no value pointing at it says so |
| Suggestions should come from the user | Value words are read out of the north star, the why, the area 10s and the goal whys, and offered first |
| Vision + purpose + goals per area | `NsAreaReview.purpose` added, between the 10 and the goals |
| The per-area values feed the whole-life list | Per-area values and identity moved into the area dialog; the review offers every value named anywhere that is not yet on the ordered list |
| Ordering needs a full picture | `ValuesWork` splits into `mode="elicit"` (north star tab) and `mode="order"` (review) |
