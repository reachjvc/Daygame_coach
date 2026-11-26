# /plan/new, rebuilt from the real tool: everything comes over

The new version of his plan, built beside today's `/plan` on a copy of his data (the copy space). `/plan` stays as
it is until he says to switch. The long version of this file (inventory, reasoning, blockers, execution prompt) is
in git: `git show ebc1a0de:Plans/plan-new-from-real.md`.

## Where things are

- On the site (owner only, also linked from `/backstage`): `/plan/new` (new version, with the switcher),
  `/plan/sandbox` (today's plan on the copy), `/plan/new/first/…` (the first rebuild, kept).
- Code: `src/goals/planSteps/` (sequences, sections, numbers, sorter, words), `src/goals/components/plan-new/`.
  The real step parts in `src/goals/components/north-star/` are shared with `/plan`.
- Private work files: `~/.cache/daygame-research/plan-steps/` (`inventory/MASTER.md`, 973 rows; `labels.md`;
  `proof/` reports p3–p7; `routines/` for Phase 8b).
- Backups of his real plan: nightly at 03:00, `~/dg-backups/nightly/`.

## His words

2026-11-19, after opening the first `/plan/new`: *"youve not replicated the plan at all, but made a very simplified
version of what i initially had."* Then: *"you should try to completely look over the real tool again, and then take
everything from it. […] I like if we're able to make it more simple to use, so you can suggest to me a different
order of screens or something like that, but you must not just remove stuff without my knowing."*

His notes on the decision page, 2026-11-19:
- **Order:** *"You can do the quick start, but i think north star needs to go first, it is sort of the way we get to
  know ourselves. But it is fine that we deepen them later."* And: *"[…] i think it is also nice to prompt the user
  to do it automatically when theyre looking at the area, and thinking 'hmm, i just wrote my north star/my area, and
  this is really important, and i wont get there if i keep doing X'. So i am split."*
- **New words:** *"when you reword stuff, it often becomes quite AI-speak. I guess i can look it over, but in order to
  lessen the amount i need to work, i would like for you to think it through."*
- **Ready-made routines:** *"it does not perhaps have to be entirely X morning routine as we've taken it, but just a
  morning routine that makes sense - the issue is that i dont want you to make the things smaller in order to avoid
  copyright, i more likely want you to make them bigger and more all encompassing."*
- **Lines that move by themselves:** *"I am not sure what this means. […] Part of this exercise we're doing here is to
  allow me to look at it with fresh eyes so i can decide how it should ideally work."*
- **General:** *"What i would prefer is to see a few different examples of how it could be done, in the real (new)
  tool, and how it would affect the whole sequence of things happening."*
- **Look** (rebrand page, 2026-11-19): *"probably like the one on the left slightly more, but this also just needs to
  look more interactive and cool"*

2026-11-26: he found V1 is not today's plan (long pages are split). Asked whether he wants an "Old" button that
shows today's pages whole: *"yes, i want that"* (built, Phase 7b).

## His picks (decision page, 2026-11-19)

| | Question | His pick | Where |
|---|---|---|---|
| Q1 | Order of screens | No pick (notes above) | Versions to try: Old, V1–V3 (Phase 7) |
| Q2 | Split long pages into short screens | Split | Phase 6.2 |
| Q3 | The 122 cut parts come back in our words | All | Phases 4 and 8 |
| Q3b | The five ready-made routines | Bring back, bigger and more complete | Phase 8b |
| Q4 / Q4b | Plan home, season band, Done summaries, earlier notes / locks | Keep / no locks | Phase 6.3 |
| Q5 | Hidden parts as "Plan my week" | In | Phase 6.4 |
| Q6 | Percentages and chips by one rule | Back | Phase 6.5 |
| Q7 | Each experience is a goal | Goal | Phase 4 |
| Q8 | Lines that move between Systems and Experiences | No pick (note above) | Versions to try: S1–S3 (Phase 7) |
| Q9 | Drag plus buttons on the phone | Both | Phase 6.6 |
| Q10 | Open on Today once in use | Today | Phase 6.7 |
| Q11 | Keep the first rebuild reachable | Keep | `/plan/new/first/…` |

Proposed by Claude, not confirmed by him: one numbers rule counts the north star ladder toward the paragraph until
it is written; the season counts as started once any answer is written; values need three in the list.

## Status

- **Phases 0–2** (inventory, decision page, one checklist): done 2026-11-19.
- **Phase 3** (reuse the real parts through one adapter): built 2026-11-19.
- **Phase 4** (faithful copy of all 12 steps on `/plan/new`): built 2026-11-19.
- **Phase 5** (phone fixes in the shared parts, so `/plan` gets them too; desktop unchanged): live 2026-11-20.
- **Phase 6** (his picks Q2, Q4–Q6, Q9, Q10): live 2026-11-20.
- **Phase 7** (versions to try): live 2026-11-20. Order V1 (today's steps, split), V2 (north star first, quick
  start, the rest on a Deepen list), V3 (V2 plus go-deeper cards in place). Sorter S1 (moves silently, as today),
  S2 (moves and says so, Undo), S3 (asks first).
- **Phase 7b** ("Old"): live 2026-11-26 (ebc1a0de). First on the switcher: today's 12 steps in today's order, every
  page whole, today's own numbers and chips, each step's own Next button. A test compares all 12 steps with
  `/plan/sandbox` line by line. V1 stays the default.
- Nothing here is "done" until he says so.

## Open

- **Waiting on him:** which order (Old, V1, V2, V3) and which sorter (S1, S2, S3) he prefers, after trying them.
- **Known gaps:** Black Box links on `/plan/new` still go to the real `/plan/quit-vice` (its record is shared browser
  storage, so mounting it would touch his real record). "Plan my week" has no frame yet. Old step numbers in real
  words ("change it at step 3") and the placeholder chip "Area and date" wait for Phase 8. The 0–10 buttons are 24 px
  tall on a phone. Review units misread "Run 5k" as "k" (fix waits for the save engine). Start over on the copy uses
  the reset route because the store left rows behind (save-engine bug). `/api/settings/time-preferences` answers 409
  on copy-space pages (the clock sync meets the copy space's wall, by design).
- **Blocker:** the save-engine branch `plan-engine` (6 commits) is still not merged; Phase 9 waits for it.

## Next

- **Phase 8, words.** Change only labels that trace to an outside method or that confused him. Voice: a
  straight-talking friend talking to one man, everyday words (gym, dates, money, sleep, work). Label at most
  4 words, question at most 12, help text at most 2 short sentences. No AI-speak (journey, unlock, empower, elevate,
  intentional, align, thrive, embrace, transform, holistic, level up, leverage, optimize, best self, show up, lean
  into); no dash asides, "not X but Y", lists of three, exclamation marks, emoji. A fresh writer agent and a
  checker that sees `labels.md`, two rounds at most. New words reach `/plan/new` only; `/plan`'s text must stay
  byte-equal.
- **Phase 8b, routines.** Five of our own, each bigger than the old one: a full morning routine; lines said out loud
  with posture and voice; morning questions; reading your plan; seeing it done. Each step has a why, minutes, a short
  and a full version. Design is proposed in `plan-steps/routines/` (design.md, presets.json, sources.md); build them
  as presets beside his own routines.
- **Phase 9:** move the day-send into the store once `plan-engine` merges.
- **Phase 10:** prove it: 4–5 adversarial agents walk every inventory row, Old and V1–V3, S1–S3; phone walk on the
  emulator.
- **Phase 11:** his look: one short page, a 👍 and auto-saving note per item: the versions, the changed words, the
  five routines, one note box per step.
- **Phase 12:** switch-over, only on his word. Old links (`?step=`, `?period=`, notifications) map to the new routes.
