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
to be confident… those are the standards I just remind myself every week." Ours
lives on the review tab under `conduct`. It belongs with the other three, because
he groups them: "so these **four things** are the driving force."

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

## 3. What this changed in `/test/life-mastery`

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
