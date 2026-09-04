# Check my work — the one thing, chapters and versions

**For you, not for a programmer.** Built 2026-09-03. Everything below is either
something you can click and see for yourself, or a decision I made that you did
not make and might disagree with.

---

## 1. The one sentence this was all for

> "When I change something, I would still want it to be the tracking from the
> initial first date."

**That now works.** Open your plan, change the wording of your one thing, press
save. The countdown does not move. Underneath it a line appears saying
*"Running since 1 Aug 2026 · reworded 1 time"* — that line exists purely so you
can see the clock was not restarted, and it stays hidden until you have actually
changed something.

**How to check it yourself:** `/dashboard/goals/plan?step=one` → note the days
left → reword the sentence → save → the days left are identical.

---

## 2. The three buttons, and what each one costs you

| What you do | What happens | What it costs |
|---|---|---|
| Edit the box, press **Save this wording** | A new wording is stored. The old one is kept. | Nothing moves — not the start date, not the deadline, not the countdown. |
| Change the date, press **Move the deadline** | The deadline moves. | Still nothing else. The day it started is carried across. |
| **This is a different one thing — start a new one** | A new season begins. | The clock restarts from today. The old one goes into your history. Your why, cost, identity and values start blank. |

The third asks you to confirm, and says the clock restarts before you commit.

---

## 3. Six decisions I made that you did not

These are the most likely places for me to have chosen wrong.

1. **Your why, cost, identity and values belong to your one thing.** Start a new
   one thing and those four start blank. *Move* a deadline and they carry over.
   My reasoning: a reason written for last season sitting under this season's
   sentence, with nothing saying so, is worse than a blank box. **You may want
   them to carry over always.**
2. **Deleting is by season, not by wording.** Your history lists seasons; the
   bin deletes the whole season including every wording inside it. You cannot
   delete a single wording. **Tell me if you want that finer.**
3. **Nothing ever closes a season except starting the next one.** A deadline
   passing prompts you; it does not end anything. Somebody a week late still has
   a current one thing.
4. **A new season defaults to 90 days**, not to whatever was left on the old one.
5. **Old wordings are stored but not shown yet.** The plumbing is there
   (`wordingsOf`) and tested. Nothing in the interface displays them, because
   you said they belong on a page that does not exist yet.
6. **The five starter questions and two review prompts do NOT get a "start a new
   one" button** even though my own rule said they qualify. They are things you
   answered once while thinking, not commitments. I wrote this down rather than
   guessed — see `docs/plans/statements-and-versions.md`, fault F10.

---

## 4. What I got wrong along the way, and who caught it

Not a confession — a map of where the risk is. **Ten of my own mistakes were
caught by machines, not by me.**

| What I got wrong | Caught by |
|---|---|
| Said there were 5 answers; there are 88 | You, asking twice |
| Said 19 statements; there are 20 | The inventory test, first run |
| My "who gets a new-one button" rule gave 16, ~5 deserve it | Running the code |
| Deleting a season that was extended failed **always** | Code review |
| Changing the words *and* the date silently threw the date away | Code review |
| A new season could inherit a 3-day deadline while promising a restart | Code review |
| Writing a "why" before any one thing existed stored it *as* the one thing | Code review |
| The data backfill could abort on a legacy row | Code review |
| A test hardcoded a date and would fail forever after 8 Dec 2026 | Code review |
| My backfill tried to overwrite rows the database forbids overwriting | The database itself |

**The pattern worth noticing:** every one was found by something that *runs*.
None was found by re-reading. That is why the count is now a test rather than a
sentence in a document.

---

## 5. What the database will not let anyone do — checked, not assumed

I ran each of these against the real database and watched it refuse:

- **Editing an answer in place** — refused. (This guard exists because a probe
  once destroyed a real answer someone had written 90 seconds earlier.)
- **Editing a season's dates in place** — refused. I added this guard; it did not
  exist before, and without it the "your clock never moves" promise was only a
  promise.
- **A season that ends before it starts** — refused.
- **A deadline in the past, or 45 December** — refused, with a sentence you can
  act on rather than a database error.

Zero rows were damaged by any probe; I checked afterwards each time.

---

## 6. Numbers you can sanity-check

- **4,143 tests pass.** 81 of them are about this feature specifically.
- **8 browser tests** walk the real app end to end, including "reword it and
  confirm the countdown did not move".
- **46 wordings, 46 seasons, 0 orphans** after the data migration — every
  existing answer got a season, none was lost.
- Your whole real database is **3.9 MB**. A test table is 302 MB of the 327 MB
  total, which remains the only actual storage problem you have.

---

## 7. What is NOT done

- **The plan page does not exist.** The overview that shows everything with old
  versions in tabs — the thing you described — is designed
  (`docs/plans/statements-and-versions.md`) and not built. My recommendation
  stands: promote the existing "Everything" step out of the flow rather than
  build a second one.
- **83 of the 88 statements are still browser-only.** Only the one thing and its
  four supports are on your account. The north star, the 7 ladder rungs and the
  60 area boxes have not moved.
- **The supports have no interface yet.** The database accepts them and the
  server writes them; the four boxes on the step still save into the browser.
  This is the next piece of work, and it is small.
- **A user still cannot invent their own statement** (your "mission" example).
  Designed, not built.
