# One hub, and how a goal gets made

**Status: PART 2 DECIDED AND BUILT, 2026-09-02. The rest is still design.**

The consolidation question is answered and done: the goals hub is archived at
`/test/archive/goals-hub`, the 14-step Life Mastery flow at
`/dashboard/goals/plan` is the one goal surface the product keeps, and the Goals
tab now points at it. See §Consolidation, as built, at the end. Parts 1, 3 and 4
still stand as written.

**Original status:** Written 2026-09-02 under
`.claude/rules/finished-work.md` — the attack on it is in Part 4, written before
the design and sitting above it.

This answers three things you asked: how goals are made in this project
*generally*, what "one hub instead of two" would actually mean, and how the Life
Mastery plan gets out of your browser and into the app. The last one needs your
approval on a permission rule before any of it runs.

---

# PART 1 — How a goal is made, generally

## There is one table and one door

Every goal in the app — from the hub form, from onboarding, from any prototype —
is a row in **one table, `user_goals`**, and there is exactly **one door** into
it: `POST /api/goals` for a single goal, `POST /api/goals/batch` for a plan.
Nothing writes goals any other way. That is worth knowing before consolidating
anything: the prototypes are not six separate systems, they are six front doors
onto one room.

## A goal row answers five questions

| The question | The field | Notes |
|---|---|---|
| **What is it?** | `title`, `life_area` | The sentence, and which part of life it belongs to |
| **How is it counted?** | `tracking_type` | A **counter** (a number you add to) or **yes/no** |
| **How often does it reset?** | `period` | daily, weekly, monthly, quarterly, yearly — or **`custom`**, which never resets |
| **How much?** | `target_value` | The number you are aiming at |
| **Who fills it in?** | `linked_metric` | **You** (a manual `+1`), or **the app**, from one of 41 things it already counts |

`period: "custom"` is the important one for a life plan. It means *this is a
milestone, not a habit* — "get to 12% body fat", "read 24 books" — and it runs to
its own end date instead of going back to zero every week. Everything the last
week of counter work established sits underneath this: whatever period you pick,
the count belongs to that period and expires with it.

There is a sixth, bookkeeping field: **`template_id`**, a tag recording which
maker created the goal. It is how pressing "send my plan to goals" twice adds
nothing the second time — the batch endpoint recognises the tag and maps onto
what is already there instead of making a copy.

## The six makers you have built

| Maker | Where it lives | Writes real goals? | Tag |
|---|---|---|---|
| Goal form (hub) | `/dashboard/goals` | **yes** | none |
| Goal form (Lair) | Mission Control widget | **yes** | none |
| Catalogue picker | hub | **yes** | catalogue id |
| Setup wizard | onboarding | **yes** | catalogue id |
| New-goals framework | `/test/new-goals` | **yes** | `fw:` |
| North Star → track step | North Star flow | **yes** | `ns:<run>:<goal>` |
| **Life Mastery** | `/test/life-mastery` | **no — browser only** | — |
| Vision Plan, Life Direction, Change Your Life | `/test/*` | **no** | — |

Four of them persist; four are prototypes that forget everything when you clear
your browser. **Life Mastery is in the second group**, and that — not counting,
not tracking — is why nothing about it can appear anywhere.

## Why nothing needs building to count them

A goal already becomes a tile on the tracking dashboard: the tile is identified
as `goal:<the goal's id>:<which reading>`, and it resolves through exactly the
same path as "approaches this week". Any goal, any period, already rolls over,
already snapshots the finished period, already carries a streak.

**So there is no counting function to write.** If a Life Mastery goal reaches
`user_goals`, everything downstream already works. Building a separate counter
for it would be the seventh instance of the bug class the last two days removed.

---

# PART 2 — One hub instead of two

You have two surfaces that both show goals, and you want one.

**What each does today:**

| | `/dashboard/goals` (hub) | `/dashboard/tracking` |
|---|---|---|
| Shows | every goal, grouped by life area, with progress, streaks, trees | four configurable tiles + the daygame session tracker |
| Lets you | create, edit, archive, increment, reorder | log a session, log approaches, write a field report, choose which tiles to show |
| Is driven by | `user_goals` | `dashboard_widgets` (which can point at any goal) |

The overlap is smaller than it looks. **The hub is where goals are managed. The
tracking page is where daygame is logged, plus a tile grid that can already show
anything.** They are not two views of the same thing; they are a manager and a
scoreboard that happens to sit next to a logger.

**Three ways to consolidate, and they are genuinely different products:**

**A. One page, two sections.** Tracking absorbs the hub: tiles on top, then your
goals by life area, then the session logger. Least work, and the page becomes
long. Risk: it becomes a wall.

**B. The hub absorbs the tiles.** Goals hub gains the tile row at the top, and
the tracking page shrinks to what it uniquely is — the daygame logger. Reflects
what each is actually for. Risk: "tracking" stops being the place you look for
numbers, which is a habit change for you.

**C. One "Today" surface, everything else behind it.** A single page that answers
"what am I doing today, and how am I doing" — the tiles you chose, the goals due
today, one button to log. Managing goals moves to a quieter screen you visit
rarely. This is the biggest change and the closest to what a life-mastery product
usually is.

**I am not choosing this for you** — it is a product decision, and you have
prototypes precisely because you are still deciding. What I would say: **B is the
cheapest true consolidation and A is not really one** — A just puts two things on
one page. C is the one worth doing if the answer to "what is this app for" has
changed.

---

# PART 3 — Getting the Life Mastery plan out of your browser

## What is at stake, plainly

The Life Mastery flow holds what you value, what you want your life to look like,
a manifesto you signed, and the goals you set from it. Right now that lives only
in the browser you typed it in: clear your history and it is gone, open the app
on your phone and it was never there.

**This is the most personal data in the app.** Sentences people write about what
they are afraid of and who they want to become. Two consequences that are not
negotiable:

1. **Anyone with the master key can read it.** Backend code uses a key that
   ignores all permission rules. That is how the app writes counters. It means
   every guarantee below is a guarantee about *other users*, never about us. This
   belongs in the privacy policy, and it must never reach a log.
2. **The permission rules need your approval before they run.** That is the
   deferral recorded in `life-mastery-canon.md`, and it is the one thing I will
   not do on my own.

## The table

There is already a table doing this exact job for one field — `life_answers`,
holding your "one thing", added a week ago. It is **append-only**: writing a new
answer adds a row and the old one keeps the moment it was written. You can delete
any of your own rows; nothing can silently rewrite one.

**Recommendation: follow that pattern rather than invent a second one.**

```sql
create table life_mastery_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- The whole plan as it stood when saved. It IS a document — values, vision,
  -- areas, goals, manifesto — and the flow already writes it as one.
  plan        jsonb not null,
  -- A version each save, so a later read can tell which is newest without
  -- trusting a clock.
  revision    integer not null,
  saved_at    timestamptz not null default now()
);
```

**The permission rules I am asking you to approve — say yes or change them:**

| Who can | Rule | Why |
|---|---|---|
| **Read** | your own rows only | obvious |
| **Add** | your own rows only | saving is adding, never overwriting |
| **Change in place** | **nobody** | so an edit cannot silently rewrite what you wrote in March |
| **Delete** | your own rows only | it is your writing; you can drop anything you no longer want |

The one thing worth arguing about: **no changing in place** means every save adds
a row, so a flow that autosaves on every keystroke would write thousands.

**I checked, and this is a real problem.** `LifeMasteryFlow.tsx` has three steps
— your why, your areas, a why under every goal — but it tells the user
*"Everything saves as you type"*, and it means it: every keystroke rewrites the
browser copy. Append-only storage plus that autosave is thousands of rows per
session.

So the design is **two things, not one**:

- **The draft stays in the browser, saved on every keystroke, exactly as now.**
  Nothing about typing changes, and nothing is lost if you close the tab
  mid-sentence.
- **The server gets a checkpoint** when you finish a step and when you leave the
  flow. Three to ten rows per sitting, each one a version you could go back to.

That also answers something the append-only rule was really about: you keep the
history of *what you decided*, not a recording of you typing.

## What it does NOT do

It does not create goals. Storing the plan and turning parts of it into counted
goals are two separate steps, and conflating them is how you end up with 40
untouchable goals after one workshop.

---

# PART 4 — How a plan sentence becomes a counted goal

This is the part you said my first answer got wrong, so here are four ways
instead of one.

A Life Mastery goal today is **a title in a life area** — "get strong", "read
more", "12% body fat by December". To be counted it needs a cadence and a number.
Someone has to supply those. Four candidates:

**A. Ask in the flow, per goal.** A step that asks "how often, and how many?" for
each goal as you write it.
*For:* the answer is captured while the intention is fresh.
*Against:* it is friction at the worst moment — you have just written twenty
aspirations and now face forty questions. This was my first suggestion and I
think it is the weakest.

**B. Push everything as intentions; ask later, on the goals page.**
Every plan goal becomes a real row immediately, with no cadence and nothing
counting — it just exists and can be read. The goals page shows them with a
**"start tracking this"** control that asks the two questions only for the ones
you actually want counted.
*For:* the friction lands where the motivation is, one goal at a time.
*Against:* your goals list fills with things that show no progress, which can
read as failure.

**C. Read the cadence out of the sentence, then confirm.**
"Read 20 pages a day", "gym 3x a week", "12% by December" already contain the
cadence and the number. Show what was understood, let it be corrected.
*For:* nearly no friction, and it rewards writing goals well.
*Against:* most work, and a wrong reading is invisible unless the confirmation
step is real.

**D. Do not turn them into goals at all.** The plan stays the vision layer you
re-read; you separately pick a handful of things to actually track, by hand.
*For:* honest — most of a life plan is not a weekly counter, and pretending
otherwise produces dead goals.
*Against:* the plan and the tracking drift apart, which is the thing the app
exists to prevent.

**Recommendation: B, with C layered on later.** Push as intentions so nothing is
lost and nothing is forced; add the reading-the-sentence part once the promotion
step exists and you can see which sentences people actually promote. D is the
honest fallback if promotion turns out to be rare — and if it is, that is a
finding about the product, not a failure of the plumbing.

---

# What could go wrong with all of this

Written before the parts above were finished.

**R1. Consolidation is a one-way door.** Merging two surfaces means throwing away
one set of habits and layouts. If the answer to "which one survives" is still
moving, merging now costs more than waiting. **Mitigation: decide the surface
before any code, and build it as a new page rather than by deleting one.**

**R2. Storing the plan makes it look finished.** The moment it is on the server it
will be read by other screens, and every one of those becomes a caller that
constrains its shape. **Mitigation: one reader at first — the flow itself — and
no other screen reads the JSON until the promotion step exists.**

**R3. "Append-only" fights autosave. CONFIRMED, and it changed the design.**
The flow does autosave on every keystroke — it says so on screen. Storing every
save would write thousands of rows per session. Resolved in Part 3: the browser
keeps the per-keystroke draft, the server gets a checkpoint per completed step.
Found by checking rather than by assuming, which is the only reason this document
does not contain a wrong recommendation.

**R4. Promotion can create dozens of goals at once.** A workshop can produce
thirty sentences. Thirty new rows would swamp the goals page and every count on
it. **Mitigation: promotion is one goal at a time, by hand, which is what option
B says — but that means the batch endpoint is NOT the right door for this, and I
said the opposite earlier in this conversation. The `ns:` flow pushes in bulk
because a North Star plan is small. Life Mastery is not.**

**R5. `template_id` is load-bearing and easy to break.** The goals hub archives
any goal whose tag points at a catalogue entry that no longer exists — a sweep
that is right for catalogue goals and lethal for everything else. Two namespaces
are exempt (`fw:`, `ns:`) via a list. **A `lm:` namespace must be added to that
list in the same commit that first writes one**, or the first render of the hub
silently archives the whole plan.

**R6. RESOLVED by reading it.** Three steps — `why`, `areas`, `qualify` — all
reachable at any time, so "completed a step" means *left* a step, not *finished*
one in order. The checkpoint trigger is leaving a step, whichever direction.

---

# Blockers — I need these from you

1. **Which hub survives — A, B or C in Part 2?** *Recommendation: B (the goals
   hub gains the tiles; tracking shrinks to the daygame logger). It is the
   cheapest change that is genuinely a consolidation.*
2. **Do you approve the four permission rules in Part 3 — read own, add own, no
   changing in place, delete own?** *Recommendation: yes, as written. The
   "nobody changes in place" rule is the one that costs something, and it is what
   makes your March writing still say what you wrote in March.*
3. **Which of A–D in Part 4?** *Recommendation: B now, C later.*
4. **Is the plan one document or many answers?** I want to store it as one
   document per save. If you expect to edit individual answers from other screens
   later, many rows is the better shape and it is much cheaper to decide now.
   *Recommendation: one document — the flow already reads and writes it as one.*

# Open questions I can answer myself, and will unless you say otherwise

- **What happens to the other three unpersisted prototypes** — Vision Plan, Life
  Direction, Change Your Life? *Recommendation: leave them exactly as they are.
  They are prototypes and persisting them multiplies the surface for no gain
  until you have decided which one is the product.*

---

# Consolidation, as built — 2026-09-02

**The decision.** Not "merge the two hubs" but "keep one and archive the other".
The goals hub is a *manager*; the Life Mastery flow already contains the same hub
component inside its Track step and adds everything before it. So there was
nothing to merge — one of them was a subset.

**What moved.** `/dashboard/goals` → `/test/archive/goals-hub`, fully live: same
guards, same component, same real rows. Creating, editing and incrementing there
still write to the account. It is kept to be inspected and cherry-picked from,
and is expected to be deleted outright once that is done.
`/dashboard/goals/setup` was deleted — it only redirected, and the wizard it
redirected to has been at `/test/archive/goal-setup` for a while.

**One deliberate difference in the archive.** The live page sent an empty account
to the plan flow. That redirect belonged to it being the front door; the archive
is not one, so an empty account now sees the empty hub — which is the thing being
inspected.

**The Goals tab is gone entirely.** It briefly became "Plan"; the user asked for
it to go, and it has. There is now no goals entrance anywhere in the navigation —
verified in a signed-in browser: the word "Goals" appears nowhere on
`/dashboard/tracking`, desktop or mobile.

`/dashboard/goals/plan` is not orphaned by that, which was the worry. The
tracking page carries its own **"Open your plan"** link, and the flow is also at
`/test/life-mastery`. Nothing needed adding.

**The Lair went too, whole.** `/lair` is now `/test/archive/lair` — a second
goals surface, built for the same job, and not one to keep. Moving the page
rather than retiring Mission Control on its own avoided a real trap: the widget
is in the DEFAULT Lair layout, and `validateLayout` rejects an entire layout
containing a widget id it does not recognise. Deleting the widget from the
registry would have left anyone whose saved board still listed it unable to save
any change to their Lair again — rendering tolerates an unknown id, saving does
not. Moving the page leaves every saved board valid and the registry untouched.

Mission Control's "View All Goals" points at `/test/archive/goals-hub`. That is
archive-to-archive now, not production-to-archive. The other two links — the
inner-game Goals tab and the Track step's "your goals page" — point at the plan
flow. Inner game is deliberately untouched: the user is still deciding what it
becomes.

**Nothing in the navigation points at goals or the Lair.** Verified signed in:
neither word appears anywhere on `/dashboard/tracking`, and `/lair`,
`/dashboard/goals` and `/dashboard/goals/setup` all return 404.

**A naming collision that resolved itself.** Two different flows were called Life
Mastery: the 14-step North Star flow (live) and a 3-step flow at
`/test/life-mastery`. During this session the test routes were renamed —
`/test/life-mastery` is now the 14-step canon and the 3-step one is
`/test/life-mastery-v1`. Both readings of "Life Mastery" now point at the same
thing.

**Not done, and it is the interesting half:** Parts 3 and 4 above — getting the
plan out of the browser, and how a written sentence becomes something counted.
Those still need the four answers in §Blockers.
