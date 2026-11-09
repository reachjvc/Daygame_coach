# Perfect week: Dan Martell's step after the time & energy audit

**Look page:** https://claude.ai/artifact/JrvYJwtBTDN4eQ3PRtmoj1 ("Perfect week, in Martell's words"; marks db,
collection `marks`: doc ids `p--<step>`, `l--<link>`, `b--<block>`; notes as `notes: [{text, at}]`).

Written 2026-11-09. Status: **Phase 2 built 2026-11-09, live; not yet used.** The owner said the same day to
keep going without looking at anything, so Phase 1 (his marks and a sketch) was skipped and the choices below
were made for him; the look page stays open for notes. The owner marked "Yes" on the D-FILL card of the Audit look page
(https://claude.ai/artifact/GF69w68HJxiyFkudNwYBXv, 2026-11-09 08:19 UTC, no note). `Plans/energy-audit.md` (D-FILL)
says a Yes becomes its own plan; this is it.

## Only you decide these

None yet. Nothing is bought; no data is deleted. A new table may be needed (Phase 2); its migration will be
listed here, in plain words, before it is applied.

## Part 1, in plain words

**What you said yes to.** After his two-week audit, Dan Martell plans an ideal week ahead of time, built so that
doing it exactly would leave you energized and feeling you made real investments in health and relationships.
Most people start each week blank and let other people's requests fill it; he decides first. In his words
(paraphrased; source below): put the big rocks in first (workouts and other weekly musts), plan around your
energy (hard work in your best hours), batch similar tasks, and say no to what does not fit.

**How it would link to what exists.**
- The audit's review already gives the inputs: the "Do more" box, the "Cut" box, and "Your energy through the
  day" (which hours are your best).
- Time (the tracker) can show a week; a planned week could appear there as planned blocks.
- Your plan (/plan) has weekly rhythms; they may be the "big rocks".

**Doubt first.**
1. Nobody has used the audit yet. A perfect week built from an audit that was never finished has nothing to
   start from. Recommendation: build this only after your first audit is done.
2. The steps above are from one Martell video and one book summary. Phase 0 checks his own words in full
   before anything is designed (memory: copy a named system first).

## Blockers, each tried once

| ID | What | Tried, and what it returned | Recommendation |
|---|---|---|---|
| B-SOURCE | Martell's exact perfect-week steps | 2026-11-09: searched the research transcripts (`~/.cache/daygame-research/feelings-v2/text/`). Found his own video `9w0INwjTYdU` ("build your perfect week", after "big rocks first"), a summary of his book (`Pu99AgrvvXU`, lesson 13: be proactive, plan around your energy, batch, say no), and a team version (`GIRkQQHzsxI`). Phase 0 (same day) read all in full: `GIRkQQHzsxI` is **Alex Hormozi** (maker/manager schedule), not Martell, so it is left out. A wider search found two more of Martell's own videos, `pzdU6AdF9AU` (his chapter 8, "your perfect week") and `W8_fLDSnVSw` (Sunday planning), and a second book summary `cQL-EjzPK5E` that reads machine-written. The book itself is not in the corpus. | Done: steps below come from his three videos and two summaries; quotes stay out of the public repo. |

## Questions, each with a recommendation

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Where does the perfect week live? | Inside the audit's review, as the step after "What you will do with it". | A page of its own, or inside Time. | Hard to find if it lives apart from the review it comes from. |
| Q2 | Does a planned block appear in Time? | Not at first; a plain week grid in the audit. Link to Time later. | Write planned blocks into Time's calendar. | Time is still being worked on; touching it now risks the other session's work. |
| Q3 | When does it become available? | When an audit has ended and has at least one activity in "Do more". | Any time. | A week planned without audit data is just a calendar. |

## Phases

**Phase 0 — Martell's own words.** Read the three transcripts in full; write his perfect-week steps as a numbered
list in plain words, each marked copy or ours. Publish one look page: the steps, then one Keep / Change / Not sure
card per link to the audit, Time and the plan. Done when the page is published and its URL is at the top of this file.

**Phase 0 result (2026-11-09).** His steps, in plain words (all "copy" unless marked):

- A. The loop: audit, hand off or cut what drains you, fill the freed time. The perfect week is the fill.
- B. Preload the year first (birthdays, trips, regular time with people, recovery after hard stretches).
  Recommendation on the page: leave the year to /plan, build only the week.
- 1. Big rocks first: workouts, people, deep work, thinking blocks.
- 2. Plan around energy: hardest work in your best hours, admin and calls in the low ones.
- 3. Batch the same kind of work into 2–3 hour blocks.
- 4. Cut bleed time: plan meetings 15 minutes shorter (fits a man without a team less).
- 5. Block the hobbies; never miss a workout two days in a row.
- 6. No extra time: pair two things in one slot (calls while walking, audiobook at the gym).
- 7. Say no often: the designed week shows what to refuse.
- 8. Spare time and rest between blocks: **summary only**, never in his own videos.
- 9. End each workday by writing open loops into one document the morning opens.
- 10. Plan on Sunday; most weeks keep the same rhythm.
- 11. Put the perfect week beside real past weeks; redesign every three months.

His test of a good perfect week: lived exactly, it leaves you energized, with real work done and something put
into health and relationships. Links (ours, one card each): Q1 audit review, Q2 Time compare-later, plus
the plan's routines offered as big rocks. Page tested before publishing with a fake store (mark, two notes,
a failed save keeps the text, no sideways scroll at 390 px); after publishing, the `marks` collection is empty
and a non-editor's write is refused.

**Phase 2 result (2026-11-09).** Built without his marks (he asked for that). What was decided, and why:

- **Where (Q1):** the last section of the audit's review, "Your perfect week", under "Your energy through the
  day". It shows only for a finished audit with answers (Q3); with no "Do more" yet it says to mark some.
- **Time (Q2):** not linked. **Plan:** not linked yet either (the routines-as-big-rocks card); kept for later
  so this phase stays small.
- **No migration:** the week is stored in the audit's existing `review` (jsonb) as `week`. A save that leaves
  `choices`, `notes` or `week` out keeps what is stored (code review: an old page sending no week must not wipe it).
- **What it holds:** one template week, Monday to Sunday; blocks on the quarter hour, 00:00 to 24:00, that may
  touch but never overlap (Martell: no room in the calendar means no room in the week); at most 150.
- **Kinds:** Deep work, Workout or hobby, People (his big rocks), Batched tasks (his batching), Admin and calls
  (his low hours), Rest (summary only; kept because rest is a real block of a week).
- **Above the week:** the "Do more" activities (also offered as one-tap names when adding a block) and the
  three most energetic hours; Martell's steps 1–7 as a folded checklist. Steps 9–11 (end-of-day dump, Sunday
  planning, compare and redesign) are not built.
- **Proof:** unit tests (`weekService.test.ts`), the repo integration test, and an end-to-end test on desktop
  and phone (add from Do more, overlap refused with its reason, reload, a choice keeps the week, an old-style
  save keeps the week, remove). Whole audit e2e file: 38 passed. Screens checked at phone size in dark mode.

**Phase 1 — Design from his marks.** Skipped on the owner's word (see Status). Turn his marks into a screen sketch at phone size (390×844) on the same page.
Done when he has marked the sketch.

**Phase 2 — Build.** Failing tests first; a migration only if the week must be stored (listed under "Only you
decide" first); ship by fast-forward like `Plans/energy-audit.md` Part 2. Done when it is live and he has used it once.
