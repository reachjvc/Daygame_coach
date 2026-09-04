# Chapters and versions — amending without losing the thread

**Status: DESIGN, not built.** Written under `.claude/rules/finished-work.md`:
the failure list was written by attacking the design before it was shown, and it
is the first section.

The request, in the user's words: *"when I change something, I would still want
it to be the tracking from the initial first date"*, *"the system registers that
there's an update, so it saves the previous version always, and now the old
version becomes switchable"*, and the old versions should live *"someplace else"*
than the flow — on a page that *"represents the output of the flow"*.

---

# 1. What is wrong with this design

Nine faults, found by attacking it. Six changed the design.

### Changed the design

**F1. The current table cannot express it at all.** `life_answers` has seven
columns — id, user_id, answer_key, body, answered_at, due_on, created_at — and
**nothing that links two rows as versions of the same commitment.** Verified
against the live database, not against the migration file. So "fix the wording
without restarting the clock" is not merely unimplemented, it is
unrepresentable: every row carries its own deadline and no row knows what came
before it. *Fixed by* a **chapter**: the thing you committed to, which owns the
dates, and versions hanging off it, which own the words.

**F2. "Save the previous version always" plus autosave is a row per keystroke.**
`plan_snapshots` already shows one person's plan at **326 revisions**. If a
version is cut whenever the text differs, a single afternoon of rewording
produces dozens of "previous versions", and the history the user actually wants
— the four or five real chapters — is buried in them. *Fixed by* cutting a
version on **leaving the field**, and collapsing consecutive edits to the same
field inside a short window into one version. The user said it himself: *"All of
these, I wouldn't care to have different versions of."*

**F3. The supports would drift out of sync with what they support.** The why,
the cost, the identity and the values are about the CURRENT one thing. Given
independent histories, you can read a reason written for a season that ended two
one-things ago with nothing on the page saying so. *Fixed by* `belongsTo` in
`ANSWER_INVENTORY`: starting a new one thing starts new ones of its four
supports. Tested, one level deep only, no nesting.

**F4. A "start a new one" button on all 88 answers is noise on 80 of them.** A
one thing runs a season; a north star runs years; "what a 10 looks like in
Health" changes at a review. Offering the same momentous button everywhere makes
it meaningless. *Partly fixed by* the button appearing only on **root
statements** — the ones with no `belongsTo`. That is 16 rather than 88.

**F10. …but "root" is still the wrong test, and running the count proved it.**
The 16 roots include the five starter questions (*"what would make next December
a good year?"*) and the two review prompts (*"what stops you"*, *"what supports
you"*). Nobody "starts a new one" of those — they are questions you answered once
while thinking, not commitments you renew. The honest list of renewable things is
about five: the one thing, the north star, the commitment, the ideal day, the
next season. **`belongsTo` alone cannot tell a commitment from a thought.** A
third property is needed on the inventory, and picking it is OQ6 rather than
something to guess at now. This is written down because it was found by running
the code rather than by reading the design, which is the only reason it was found
at all.

**F5. The area reviews are not sixty statements — they are a dated review.** The
user's instinct (*"if I click update life area, I get a new version for all of
them"*) is describing an event, not sixty edits. A review has a date; you sat
down and did it. *Fixed by* treating an area review as a **dated entry keyed by
(area, review date)**, not as five independent version chains. But per area, not
all twelve at once — see F6.

**F6. Versioning all twelve areas together writes eleven copies of nothing.**
Somebody who only wants to redo Health should not produce twelve new reviews.
*Fixed by* making the unit one area's review; a "full review" is simply doing
twelve of them in a sitting, and the page can offer that as a sequence.

### Accepted costs

**F7. A second overview page would duplicate the recap.** The flow's last step,
"Everything", is already the whole plan on one page and already editable. It is
step 14 at `?step=recap` with no URL of its own. Building a *new* output page
gives two overviews that drift apart. **Accepted only in the form of promoting
the recap out of the flow to its own route** — not building a second one.

**F8. Chapters and the goals attached to them can disagree.** A one thing has
real goals in `user_goals` with real counts. Starting a new chapter must not
orphan them, and must not silently drag them into the new one either. Open
question OQ2 below; not solvable by the schema alone.

**F9. The `answer_key` CHECK constraint blocks user-created statements.** The
column is `check (answer_key in ('one_thing'))`. A user wanting a "mission" —
the user's own example — cannot have one. See §3.

---

# 2. The design

## A chapter is what you committed to. A version is how you worded it.

    chapter   started_on, due_on, the goals attached, whether it is current
      └── version   the words, when they were written

- **Amending** adds a version. The chapter keeps `started_on` and `due_on`, so
  every countdown, streak and "since" date is untouched. This is the whole point.
- **Starting a new one** opens a new chapter with new dates. The old chapter
  closes and becomes readable history.
- **Current** = newest version of the open chapter. Still never a stored flag.
- **History has two levels**, which is what "switchable" needs: chapters are the
  list you browse; versions are the wording inside one chapter, folded away.

## Where the old versions live

Not in the flow. A **plan page** — the recap, promoted to its own route — shows
the current state of everything in one place, with each statement offering its
earlier chapters. The flow stays the place you *build*; the plan page is the
place you *live in*, and it is where the daily north-star read lands.

## What the buttons are

| Where | Button | What it does |
|---|---|---|
| Flow, on a statement | *(just type)* | Amends. New version, same chapter, same dates. |
| Flow + plan page, on a **renewable** statement (see F10/OQ6) | **Start a new one** | New chapter, new dates, supports reset with it. |
| Plan page, per area | **Do this area's review** | Writes a dated review entry for that area. |

---

# 3. A user's own statement — the "mission" case

Asked: *"what would happen if a user wanted to create a fifth item in that
class, let's say a mission, which we don't have."*

Today: impossible. The keys are compiled in and the database refuses anything
but `one_thing`.

**The pattern to copy already exists one level down.** `NsDailyField` lets a
person write their own daily question — *"one key learning"* is exactly that —
and the answers land in `plan.journal` beside the built-in ones. Nothing about
that is special-cased.

So: statements get the same two-tier shape.

- **System statements** — the 88 in `ANSWER_INVENTORY` and `WRITTEN_ELSEWHERE`.
  Defined in code, so the copy, the ordering and the help text can improve for
  everybody at once.
- **User statements** — rows a person creates. Same chapters, same versions, same
  plan page, same "start a new one" button.

Consequence for the schema: **the `answer_key` CHECK constraint has to go**,
replaced by a reference to a statement-definition table holding both kinds. That
is a deliberate loosening and it is the price of the feature; the constraint was
protecting against typos in code, and a foreign key protects against more.

---

# 4. Open questions

Each with a recommendation, so "go with your recommendations" is a valid answer.

**OQ1. How long is the window that collapses consecutive edits into one
version?** → *Recommend: the editing session — collapse until the person leaves
the page or an hour passes.* Rewording is bursty; a fixed short timer either
splits one burst or merges two sittings.

**OQ2. When a new chapter starts, what happens to the old chapter's goals?**
They are real rows with real progress. → *Recommend: they stay exactly where they
are and keep counting, and the new chapter starts with none. Closing a chapter is
not a statement about the goals underneath it, and silently archiving somebody's
tracked goals because they wrote a new sentence would be the worst kind of
surprise.* The plan page can offer "carry these over" as an explicit choice.

**OQ3. Does a chapter close on its deadline, or when a new one starts?** →
*Recommend: only when a new one starts.* A deadline passing is information, not
an event — the prompt already asks for the next one. Auto-closing means somebody
who is a week late has no current one thing at all.

**OQ4. Does the recap move to its own route, or does a new page get built?** →
*Recommend: move it.* It is already the whole plan on one page. Two overviews
would drift, and this is less work.

**OQ6. What marks a statement as renewable?** F10: `belongsTo` gives 16 roots and
only about five deserve the button. → *Recommend: an explicit `renewable: true`
on the inventory entry, set on the one thing, the north star, the commitment, the
ideal day and the next season — and a test that a renewable statement is never
also a support.* An inferred rule ("has a deadline", "is on a scored step") would
be a rule that quietly changes meaning the next time a step is renamed.

**OQ5. Build the four one-thing supports first, or all 88?** → *Recommend: the
one thing's chapter — the sentence plus its four supports — first, because it is
the one place chapters, versions, dates and "start a new one" all appear at once.
If the model is wrong, it is wrong on five fields rather than eighty-eight.*

---

# 5. What already exists

- `src/goals/data/answerInventory.ts` — all 20 answers in `plan.answers`, each
  classified, with `belongsTo`, plus `WRITTEN_ELSEWHERE` recording the other 68
  on the three shelves the mechanical check cannot reach. 88 total, 16 roots.
- `tests/unit/goals/answerInventory.test.ts` — rebuilds the list from the running
  code AND from a scan of the source, and fails if either finds a key the
  inventory has not classified. **It caught the count being wrong the first time
  it ran** (20, not the 19 that had been asserted). Its own blind spot is stated
  in the file: a key assembled at runtime from a variable would not be seen.
