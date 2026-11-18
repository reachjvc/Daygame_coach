# Quit tool: a free menu of quit tools, then a 90-day program

Written 2026-11-18, rewritten the same day after three research rounds and the owner's menu idea. Status:
**Phase 0 done, Phase 1 live 2026-11-18 (types, importer, validator); Phase 2 (nicotine content) running.** Replaces the "one page per addiction" frame of the addiction one-pagers
(docs/research/addiction-one-pagers/); their research, rules and checked numbers are reused, the page form is not.

**Scheduled by `Plans/first-1000.md` (2026-11-18):** the free nicotine tools ship by **20 Dec 2026** so New Year
quitters can use them; the account program comes after. That plan's owner decisions (A1–A6, answered "yes all of
these are fine") apply here: coaching is **$200 for 30 days** with the guarantee "if you're not nicotine-free in 30
days, I keep working with you free until you are", paid through a **Stripe Payment Link the owner makes himself**;
his face and story go on Instagram, while **the tool speaks in the brand's voice** (no founder "I" in the tool).
Each week, what the pilot clients trip on (the first-1000 problem log) is added to this plan's tools.

## Before anything: what only the owner decides

Ask in ONE message at the start of Phase 0, then don't stop again for them.

1. **New tables on the live database** (adds tables, deletes nothing). Needed by Phase 8. Yes / not yet.
2. **The Payment Link URL** for the 30-day coaching (first-1000 A3), to put in `src/quit/data/offer.json`.
3. **Optional:** a Ukraine-donation line next to the coaching price. Off until he writes the line himself.
4. **Optional, costs money, his click only:** paid programs to study (list in Part 3). Nothing is bought by Claude.

Nothing in this plan's code costs money: no email service, no paid tier, no payment code (the Payment Link is
a plain link).

## Which model runs what (owner, 2026-11-18)

The big model plans and judges; smaller models build. Every phase below names its model.

| Work | Model | How |
|---|---|---|
| Planning, specs, design decisions, the phase brief before each build phase, final review gates | Opus (the big model) | The planning session itself |
| Fact-checking every number and proof (a wrong number reaches readers) | Opus | A subagent with `model: "opus"` |
| Building code, filling data files by recipe, writing content drafts, phone walks | Sonnet | Start the build session with `claude --model sonnet` (or `/model sonnet`); subagents `model: "sonnet"` |
| Purely mechanical checks: run the validator and tests, compare screenshots to a checklist, count things | Haiku | Subagents `model: "haiku"` |

Rule for the build session: if a step needs a decision this plan doesn't make, stop that step, write the
question at the bottom of this file under "Questions from the build", and go on with the next step. The
planning session answers them.

---

## Part 1: in plain words

### The idea

A **menu** of small free tools per addiction, grouped by the moment a man is in, so he picks what he needs.
More than paid apps sell, given free, and still easy to find your way around on a phone. Mock of the menu:
https://claude.ai/artifact/N6isH3tC391NxHWoJ8ppRV (his 👍 and notes are in its db: collections `likes`,
`notes`, keyed by tool id; read them before Phase 3).

The menu screen `/quit/<addiction>`: the title and an addiction switcher; one line "New here? Most start with
the 12 lies test." (a link to `beliefs`); then the 5 groups, the only list; and a **"Craving now?"** bar always
at the bottom. Each row: name, one line, time, and a pill only where one is needed: *Free account* or *Paid*
(no "No account" pill).

**Owner's menu notes (2026-11-18, mock db; 👍 on every other tool), folded in:** no "No account" pill, no
"Start here" box (it repeated "Understand it"); no "men"/"man" in tool names (`how` = "How people quit",
`tell` = "Tell someone"); day 1 "some days or weeks out is fine" (Q8 below); `clear` "not sure if useful"
(wave 2, built last); `curve` "dunno how this would work" (a visual mock goes to him first; `curve` is not
built until his reaction is written here); price: he is weighing a small membership ($1.99–2.99 a month),
undecided: wave 1 stays free, no payment code, an open question for Phase 8.

| Group | Tool (id) | Account | Wave |
|---|---|---|---|
| Understand it | `beliefs`, `gives`, Your past attempts (`past`), What it costs you (`cost`), How people quit (`how`) | none | 1 |
| Plan it | `curve` (with day 1), If-then cards (`ifthen`), Clear-out list (`clear`), Money on the line (`stake`), Tell someone (`tell`) | none | curve 1, rest 2 |
| Get through it | Craving now? (`sos`), Symptom guide (`symptoms`), Daily check-in (`checkin`), Today's lesson (`lesson`) | sos, symptoms none; checkin, lesson free account | sos, symptoms 1; rest 3 |
| Stay free | Your record (`record`), Slipped? Restart today (`slip`), Who you are now (`identity`) | slip none; record, identity free account | slip 1; rest 3 |
| Get help | What helps besides apps (`besides`), Talk to a coach (`coach`) | none / paid | 2 |

**Wave 1** ships by 20 Dec for nicotine. **Wave 2** follows in January. **Wave 3** is the account program.

### Why these tools (research of 2026-11-18, private files on the owner's machine)

- **What users love** (75,000 reviews and posts, `~/.cache/daygame-research/quit-tool/loved-features.md`):
  simple clean design first; blockers hard but not impossible to undo; a free core; streak counters (which
  backfire after one slip: users ask for an "almost gave up, but didn't" count, which nobody offers); daily
  lessons that explain why you use; money-saved counters. **Why they leave:** surprise paywalls (1,477),
  price (1,016), bugs and lost streaks (989), "just a timer" (824). AI chatbot coaches have the worst
  praise-to-complaint ratio of any feature: **no AI coach**. In quit forums, apps come about 11th in what
  people credit; ahead: the forum itself, exercise, therapy, sleep and food, hobbies, patches and gum,
  medication, meetings, telling people, books. So the menu points to those too (`besides`).
- **What exists** (60 products, 98 tools, `feature-census.md`): free almost everywhere: counters, money saved,
  forums, SOS button, badges, health timelines. Usually paid: daily lesson programs, blockers, human coaching.
  **Nobody gives free:** past attempts turned into a plan; hard days on his own calendar; a belief test answered
  on the page; if-then plans; a letter to self; sources one tap away.
- **What has evidence** (`evidence-tools.md`, 125 sources, abstracts unless marked): money on the line
  (strong), a near date then a full stop (strong; days, at most about two weeks), guarding the first two weeks
  (strong), if-then plans with a "do", never a "won't" (moderate), logging each use before day 1 (moderate),
  trigger map from the log (moderate), clear-out and friction (moderate), reward swaps (moderate), moving 5–10
  minutes during a craving (strong for the craving), identity line (moderate), sleep rules for "it helps me
  sleep" (moderate). **Against:** pros-and-cons lists (none in this plan). **No study gives how long one craving
  lasts**: no tool promises a duration.
- The patterns borrowed (P1–P23) and refused (A1–A8) are listed with their sources in
  `~/.cache/daygame-research/quit-tool/patterns.md`. Copy ideas only, never words or layout.

### How the addictions differ (one data file each)

| | Nicotine | Weed | Porn | Alcohol | Phone | Gambling |
|---|---|---|---|---|---|---|
| Unit | cigarettes / vape days / pouches | sessions | sessions | drinks | hours a day | bets |
| Cost | dollars + minutes | dollars | hours | dollars + hours | hours + years | dollars |
| Danger line | none | none | none | **yes**: heavy daily drinkers see a doctor before stopping (seizures) | none | money + a crisis line only where a source ties it to gambling |
| Felt data (quit-forum posts) | 758 | 801 | 534 | 605 | none yet | none yet |
| Clear-out extras | throw out vapes, pouches, lighters | delete the dealer | blocker, PIN with a friend | empty the house | grayscale, app limits | national self-exclusion, bank gambling block |
| Black Box vice id | `nicotine` | `weed` | `porn` | `alcohol` | `scrolling` | `gambling` |

Order: nicotine (the only avatar until 1 Feb 2027 per first-1000), then weed, porn, alcohol, phone, gambling.

---

## Part 2: every tool, specified

Shared for all tools: a route under `/quit/[addiction]/<tool>`; reads only `src/quit/data/<addiction>.json`;
phone first (390 px), one question per screen on phones, back button and progress bar; state in the browser
under `localStorage` key `quit-v1` (`{[addiction]: {[tool]: …}}`, try/catch, works without it); a footer with
"Craving now?", the two doors (`/quit/<a>` free tools, `/quit/coaching`), the privacy link and the sources; a
`?present=1` mode for filming (see Part 4). Counts: each tool sends `start` and `done` to `/api/quit/count`.
Every reader-facing number shows its basis and Counted tag (RULEBOOK rule 3) with tap-to-open source (P22).

**`beliefs` — The 12 lies test** (wave 1, no account, P5 P2 P6 P20 P21)
Screens: 12 beliefs as scenes (`scene`), each rated Not me / A bit / Somewhat / Mostly / That's me (1–5);
3 true-or-false facts with the answer after each tap. Result (same page, no email): "already see through"
(rated 1–2) first; top 3 (highest rating, ties by order) each with counterpart, proof + Counted tag, "when this
thought comes", "test it this week", and a link to its need in `gives`; band from `bands` ("mostly free" →
link to `/plan` instead of the program); share card `/quit/[a]/card?held=N` via `ImageResponse` (count only).
Next: `gives`, prefilled. Done when: scoring, ties, bands and the share URL have unit tests.

**`gives` — What it gives you (80% swaps)** (wave 1, no account, owner's idea, his step 2)
Screens: pick 1–3 needs from `needs` (relief, reward, boredom, connection, sleep, focus, confidence, the
substance itself); each shows the beliefs tagged with that need ("it's the only way I relax"); then 3 swaps per
need, best-evidence first, each with its evidence grade in plain words ("tested: cuts cravings" / "not tested");
"Try one this week". After trying (return visit or account): "How much of it did that give you?" slider 0–100%;
swaps ≥ 60% rise to the top of his list (stored locally). Data: each belief has `need`; each need has
`swaps: [{text ≤ 10 words, evidence: strong|moderate|weak|none, refs}]`. Done when: a belief rated high in
`beliefs` preselects its need; the slider reorders swaps; unit tests.

**`past` — Your past attempts** (wave 1, no account, owner's idea)
Screens: (1) how many tries (0, 1, 2–3, 4–9, 10+), longest stretch (days/weeks/months/years), when the last one
ended; (2) what ended it, up to 3 from `endings` (stress, someone offered, it was right there, "just one",
empty evening, couldn't sleep, a celebration, a fight, boredom, other); (3) what helped while it lasted (pick
from `helped`); (4) what went through his head after the first slip (gave up / restarted / "just this once"
/ don't remember). Result: "Many tries are normal" line with its source; his danger window ("your last tries
ended in days X–Y") drawn on `curve` when he makes one; his top 2 endings become prefilled `ifthen` cards;
what helped is pinned to his plan; if he answered "gave up" after a slip: the same-day restart line (his step
3). Never a forecast of success. Signed in: endings map to Black Box endings (`justone`, `stress`, `faded`,
`other`, …) and past runs can be added to the Black Box as history. Done when: the mapping to
`ViceEndingId` has a unit test; no screen predicts success (validator word list).

**`cost` — What it costs you** (wave 1, no account, P1)
Screens: how much (unit, stepper), price per unit in USD (prefilled `defaultUnitPriceUsd`) or minutes per
session. Result: a year and ten years in dollars and hours; one concrete comparison from `costSwaps` (data:
`[{usd, text}]`, e.g. "a week in Lisbon"); "Use it in your quit curve" button. The number reappears next to
the coaching price on `/quit/coaching`. Done when: maths unit-tested; no invented prices.

**`how` — How people quit** (wave 1, no account)
A read page: hope number, then who gets free, what helps, how quitting goes (the checked number cards from
`08-v3/pages/<id>.json`), each with basis and source. No screening, no death tolls. Done when: every card
passes the validator.

**`curve` — Your quit curve** (wave 1, no account, P7 P8 P9 P12 P19)
Visual mock for the owner (2026-11-18): https://claude.ai/artifact/F9kYB9LmiFq2e1ssFRzCkK (db `notes`, `likes`,
keys how/chart/cards/plan/ask). Read its notes before the Phase 5 `curve` brief.
As before: four questions (how much, cost, what it gives, day 1: chips, nearest first: "in 3 days", "next Monday", "in 2
weeks", or a date up to 6 weeks out; never today; under them one small sourced line "Sooner tends to work
better" (the near-date evidence, evidence-tools §4)), a 2-second
screen saying what it combines (his answers + N posts + checked numbers). Result: yearly cost; symptom lines
(share of posts naming each, as settled in round 8) on HIS weekdays to day 90, "hardest stretch" where
craving's share peaks; his danger window from `past` if any; "you are here" once day 1 passed; the 3
most-mentioned symptoms with "most mentioned days X–Y, fades by Z" computed from the bins; swaps for his
needs; the five steps with his date. Commit: press-and-hold 1.5 s (keyboard alternative). The one ask:
"Save my curve and nudge me" → sign-up with `next=/plan/quit-vice?claim=<a>`; decline → `.ics` (day 1 and
day 3) and "copy my curve link" (state in the hash only). Reuse `docs/research/addiction-one-pagers/board/build_v3.py`
(v6 graph) as the drawing reference, ported to a React SVG component. Done when: date maths across time
zones (Copenhagen, New York) and DST, symptom summaries against hand-computed values, and the `.ics` text
are unit-tested.

**`ifthen` — If-then cards** (wave 2, no account, evidence moderate)
Screens: pick 3 risky moments from `riskyMoments` (prefilled from `past`); for each pick a DO from
`responses` (walk 5 minutes, water and gum, call X, leave the room, the craving tool…). Wording is always "If
<moment>, then I <do>". Never "I won't". Result: 3 cards; "Save as phone wallpaper" (a PNG drawn in the
browser, saved by a normal download); signed in, they arrive as a push at that hour. Done when: the validator
rejects any response containing "won't", "not", "avoid" as the main verb.

**`clear` — Clear-out list** (wave 2, no account)
A checklist per addiction from `clearOut` (each item: text, what it removes, optional link: blocker set-up
guides, the national self-exclusion register for gambling). Ticks are stored locally; "Do this the night before
day 1" ties to `curve`. Blockers: always the kind that is hard but not impossible to undo (the PIN held by a
friend). Done when: every link resolves (a test that fetches them in CI is not allowed; check by hand in the
phone walk).

**`stake` — Money on the line** (wave 2, no account, evidence strong)
Screens: an amount (his choice, USD), a friend to hold it, a cause he'd hate it to go to; the tool writes the
message to the friend with his day 1, day 30 and day 90 and the rule ("one slip that I don't restart from the
same day = it goes"). Copy button and share sheet (`navigator.share` where it exists). The site never holds or
moves money; it says so on the screen. Done when: no payment code anywhere; copy text unit-tested.

**`tell` — Tell someone** (wave 2, no account)
One person who doesn't use; a link to a small page showing his day 1 and "check on him on day 3" with an
`.ics` for the friend. Nothing stored on the server (the date travels in the link hash).

**`sos` — Craving now?** (wave 1, no account, P4 P16)
As before: what is the voice saying (chips from `beliefs[].short` + something else) → what does it want to
give you (needs) → its counterpart, one swap for that need, "Move 5" (5 minutes walking or stairs), the four
tape-forward lines, a 10-minute wait with a calm count (sound only if he turns it on) → "Did it pass?". Signed
in: a Black Box report (`wentThrough: false` for passed, `true` for a slip). No duration promise. Done when:
signed-out and signed-in Playwright runs pass; the Black Box shows the report and undo works.

**`symptoms` — Symptom guide** (wave 1, no account)
Tap a symptom (from the felt data's keys, in plain words): when people mention it most and when it fades
(computed), what helps (`symptomHelp`, each with evidence), and for sleep a card with four rules (fixed wake
time, bed only for sleep, up after 20 minutes awake, worst in the first 1–2 weeks). Done when: every "when"
is computed from the data file, none typed by hand.

**`slip` — Slipped? Restart today** (wave 1, no account; logs to the Black Box if signed in)
Three taps (when, what was going on, what he told himself), then his step 3: back through steps 1–3 (his top
beliefs, his swaps, a new day 1, ideally today or tomorrow), and "every day you kept was a complete success".
Never "back to zero". Done when: the validator bans "reset", "back to zero", "start over from day 0".

**`besides` — What helps besides apps** (wave 2, no account)
The list from the forum research in plain words, each with a free link where one exists (free national quit
lines, free meetings, the subreddit, a book, an exercise idea). Nicotine: patches and gum done right (with
sources). Alcohol: doctor first for heavy daily drinkers. No affiliate links.

**`coach` — Talk to a coach** (wave 2; page by 20 Dec if the Jan group sells through it)
`/quit/coaching`: what the 30 days with him are, the price and guarantee from `offer.json` (from first-1000
A2), his yearly cost from `cost` next to it if he made one (P1), the "What's the catch?" paragraph (P15), and
the Payment Link button (opens Stripe; this site stores nothing about the payment). Two doors on every tool
page (P14): "Do it privately" / "30 days with a coach". Privacy page `/privacy` must be live first.

**`checkin`, `lesson`, `record`, `identity`** (wave 3, free account) — Phase 8 below.

---

## BLOCKERS (each tried once on 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Signed-out visitors can't open new pages | `src/shared/routes.ts` `isPublicPage` lets only `/`, `/auth`, `/test` through `proxy.ts` | 3–7 | Add `/quit`, `/privacy`, `/api/quit/count` with a unit test |
| B2 | No payment code | Searched for stripe/payment libraries: none; `Checkout.tsx` says payments are not migrated | coach | The owner's Payment Link (first-1000 A3), a plain link |
| B3 | No email sending | No mail library; only Supabase sign-in emails | 5, 8 | `.ics` files, share links and push instead; email is a later plan |
| B4 | Timed nudges | `app/api/notifications/tick/route.ts` runs every minute (pg_cron) with quiet hours | 8 | Add `runQuitNudgeClock`, idempotent through a sent-log table |
| B5 | Felt data | `08-v3/felt/*.json`: nicotine 758 posts (38–61 per bin), weed 801, porn 534, alcohol 605; phone and gambling none | curve, symptoms | Phone and gambling wait for their research step (Phase 10) |
| B6 | Share card and wallpaper images | `ImageResponse` doc present in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`; wallpaper drawn in the browser on a canvas | 4, 6 | As specified |
| B7 | Live database change | Not tried: owner's yes first (Phase 0 item 1); method in memory "Live DB backup and apply" | 8 | Ask in the Phase 0 message |
| B8 | Black Box ids and endings | `vices.ts` ids: nicotine, weed, porn, alcohol, scrolling, gambling, junk; `ViceEndingId` = fine, justone, drink, stress, faded, other | past, sos, slip | Map quit-tool endings onto these; extend only with a migration |
| B9 | No privacy page | `find app -path '*privacy*'`: none (also first-1000 B8) | coach, 8 | Phase 6 writes it; first-1000 pulls it forward |
| B10 | No bot protection | `Plans/bot-protection.md` (local only) not started | count route | The count route takes only whitelisted names and stores no identifiers; abuse only skews counts |
| B11 | Live home page error | first-1000 B1: `/` returns 500 on Vercel only | 3 (links from `/`) | Fixed under first-1000 Phase 0; the `/quit` pages don't depend on `/` |

## OPEN QUESTIONS (decided, with a reason; the owner may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Pilot addiction | Nicotine (first-1000's only avatar) | — | — |
| Q2 Program length | 90 days (his step 3) | 30 | Weekly lessons after day 30 are cheap to cut |
| Q3 Beliefs in the test | 12 (5 checked exist, 7 new) | 8 | Fewer to write |
| Q4 Felt drawing | Lines per symptom (round 8); 0–10 score stays dropped | One line | He rejected a misdrawn curve once |
| Q5 Bands | 0–2 "mostly free", 3–6 "some hooks", 7–12 "hooked", in the data file | Score /100 | Data, easy to retune |
| Q6 Save before an account | Browser only (`quit-v1`) until he saves | Server, anonymous | Nothing about his habit leaves the phone without an account |
| Q7 "You vs others" | Later: 200+ saved tests and opt-in only | Now | Needs real data to be honest |
| Q8 Day 1 range | **Answered 2026-11-18** (mock note `step3`: "some days or weeks out is fine"): up to 6 weeks, never today, nearest chips first, "Sooner tends to work better" with its source; his step text unchanged | — | — |
| Q9 Streaks | Total clear days + close calls beaten; never reset | Classic streak | Users report streak shame after one slip |
| Q10 Community feed, AI coach | None | Build them | A feed needs moderation; AI coaches are the worst-rated feature |
| Q12 Membership fee | Open (his note 2026-11-18: maybe $1.99–2.99 a month): wave 1 free, no payment code; decide before Phase 8 | — | — |
| Q11 Wave 2 before or after 20 Dec | After, except `coach` if the January group is sold through the site | All before | Too much for 20 Dec on one build session |

---

## PHASES

Each build phase starts with a **phase brief** written by the planning model (Opus): the exact files, data
fields and acceptance checks for that phase, appended under the phase. The build model (Sonnet) then follows
the brief without making design decisions. Build in a git worktree; phone width first; done = acceptance
checks pass AND a phone walk of that phase's screens.

### Phase 0: setup and the one ask — Opus

1. Send the owner the Phase-0 items at the top in one message; write his answers here.
2. Read the owner's 👍 and notes on the menu mock (ArtifactData, collections `likes` and `notes`); fold them
   into Part 2 before any brief. Notes are fixes, not new rules.
3. Worktree from `main`; record `npm test` and `node scripts/typecheck-ratchet.mjs` baselines.
4. Read: `docs/research/addiction-one-pagers/RULEBOOK.md`, `08-v3/SCHEMA.md`, `08-v3/pages/nicotine.json`,
   `08-v3/felt/nicotine.json`, `08-v3/kinds.json`, `src/vice/types.ts`, `src/vice/hooks/blackboxStore.ts`,
   `src/notifications/pushService.ts`, `app/api/notifications/tick/route.ts`, the private files in
   `~/.cache/daygame-research/quit-tool/`, and the Next.js docs for every API used.

### Phase 1: data file and checker — brief Opus, build Sonnet, checks Haiku

1. `src/quit/types.ts`: `QuitAddiction` with every field Part 2 uses: `id`, `name`, `unit`, `costKind`,
   `defaultUnitPriceUsd`, `defaultMinutesPerUnit`, `danger`, `hope`, `numbers`, `keyFacts`, `beliefs` (12 ×
   {id, scene ≤ 16 words, short ≤ 6 words, need, limiting, counterpart, whenThought, test, proof, severity,
   counted, refs}), `facts` (3), `needs` (8 × {id, name, swaps: [{text, evidence, refs}]}), `endings`, `helped`,
   `riskyMoments`, `responses`, `clearOut`, `symptomWords`, `symptomHelp`, `tapeForward` (4), `costSwaps`,
   `besides`, `felt` (bins + forum, years, posts used, bias note), `lessons`, `bands`, `catch`, `planSteps`
   (the owner's five steps from `06-template.json`, slots filled, never reworded).
2. `scripts/quit/import-v3.mjs`: writes what exists in 08-v3 into `src/quit/data/<id>.json` (`cannabis` →
   `weed`); missing fields `"TODO"`.
3. `src/quit/data/offer.json`: `{coachingPriceUsd: 200, days: 30, guaranteeLine: "<first-1000 A2 wording>",
   paymentLinkUrl: null, donationLine: null}`; nothing shows a buy button while `paymentLinkUrl` is null.
4. `src/quit/validate.ts` + `tests/unit/quit/validate.test.ts`: fails on any `"TODO"` in a file listed in
   `src/quit/data/live.json`; word limits; missing severity, counted or ref on any number, belief, swap or
   symptom help; RULEBOOK rule 3 key words; screening phrases (rule 1 list + "sound like you"); founder voice
   ("I quit", "when I", "my story"); `$` outside `offer.json`, `costSwaps` and the calculators; moderation
   proofs tagged `heavy`/`users`; `danger.line` on `level: "none"`; forecasts in `past` text ("you will",
   "chance of success"); "won't/avoid/not" responses in `responses`; "reset"/"back to zero" anywhere.

Acceptance: validator passes with `live.json` empty and fails, naming each TODO, with nicotine listed.

#### Phase 1 brief (Opus, 2026-11-18) — build exactly this, decide nothing

Phase 0 findings this brief rests on: the menu mock's `likes` and `notes` were empty on 2026-11-18 (nothing to
fold in). The v3 belief's `test` field is the "When this thought comes" step (rule 22) and `testR7` is the
real-life test; the five-step slots come from `06-template.json` `pages[id=<v3 id>].subs`, overridden by
`SUBS_V3` in `board/build_v3.py` line 58. The guarantee line is the owner's own offer text and stays in
first person (only `offer.json` may hold "I"). Nicotine's footer line (clozapine/olanzapine, v3
`footerProposal`) is a `footerNote`, not a danger line: nicotine's `danger.level` is `"none"`.

**Files (all new):**

1. `src/quit/types.ts` — exported types, no runtime code except the `as const` id lists:
   - `QUIT_ADDICTION_IDS = ["nicotine","weed","porn","alcohol","scrolling","gambling"] as const`;
     `QuitAddictionId`. `QUIT_TOOL_IDS` = the 19 tool ids of Part 1's table; `QuitToolId`.
   - `Severity` = the 8 RULEBOOK rule 3 tags. `Evidence = "strong"|"moderate"|"weak"|"none"`.
   - `QuitRef {cite: string; url: string; pmid?: string; quote?: string; fetched?: boolean; fetchedOn?: string}`.
   - `Check {by: string; on: string; verdict: "ok"|"fix"|"drop"; notes?: string}`.
   - `QuitNumber` = the SCHEMA.md "A number" shape (kind, big, headline, mirror, severity, counted, basis
     {design, who, n, where, when, measured}, caveat, projection?, pooled?, checked?, timeIsResult?, weak?,
     ref: QuitRef, alsoRef?, check?).
   - `QuitBelief {id; kind: "stuck"|"hard"|"need"|"harmless"|"moderation"|"identity"; scene; short; need;
     limiting; counterpart; whenThought; test; proof; severity; counted: string|null; refs: QuitRef[];
     weak?: string|null; ownWords?: boolean; check?: Check}` (`need` is a `QuitNeed.id`).
   - `QuitFact {id; statement; answer: boolean; explain; severity; counted: string|null; refs; check?}`.
   - `QuitSwap {id; text; evidence: Evidence; refs: QuitRef[]}`; `QuitNeed {id; name; swaps: QuitSwap[]}`;
     need ids fixed: `relief, reward, boredom, connection, sleep, focus, confidence, substance`.
   - `QuitEnding {id; label; blackBoxEnding: ViceEndingId}` (import `ViceEndingId` from `src/vice/types.ts`).
   - `QuitOption {id; label}` for `helped`, `riskyMoments`; `QuitResponse {id; text}`.
   - `QuitClearItem {id; text; removes; link?: string}`; `QuitSymptomHelp {symptom; text; evidence; refs}`;
     `QuitCostSwap {usd: number; text}`; `QuitBesides {id; text; link?: string; refs?: QuitRef[]}`.
   - `QuitFelt {forums: string[]; years: string; postsUsed: number; postsSampled: number; bias: string[];
     bins: {label; from; to; n; symptoms: Record<string,number>; positives: Record<string,number>}[]}`.
   - `QuitLesson {day: number /* -3..-1 prep, 1..90 */; beliefId; title; body; exercise; refs}`.
   - `QuitBand {id: "free"|"some"|"hooked"; min: number; max: number; label; text; link?: string}` (count of
     beliefs rated 4 or 5; Q5 ranges).
   - `QuitPlanStep {title; text; do: string[]; proof?: {text; refs; severity; counted?; weak?; ownWords?}}`.
   - `QuitDanger {level: "none"|"danger"; line: string|null; refs: QuitRef[]}`.
   - `QuitUnit {id; one; many; defaultPriceUsd: number|null; defaultMinutesPerUnit: number|null;
     priceRefs: QuitRef[]}` (nicotine: cigarettes, vape days, pouches).
   - `QuitAddiction`: `id, name, units: QuitUnit[], costKind: "money"|"money+time"|"time"|"money+hours", danger, footerNote: {text, refs}|null,
     hope: QuitNumber|null, numbers: QuitNumber[], keyFacts: string[], beliefs, facts, needs, endings, helped,
     riskyMoments, responses, clearOut, symptomWords: Record<string,string>, symptomHelp, tapeForward: string[],
     costSwaps, besides, felt: QuitFelt|null, lessons, bands, catch: string, planSteps: QuitPlanStep[]`.
     Any field may hold the string `"TODO"` in a non-live file: type it as `T | "TODO"` through a
     `Draftable<T>` helper, and export `isTodo(x)`.
   - `QuitOffer {coachingPriceUsd: number; days: number; guaranteeLine: string; paymentLinkUrl: string|null;
     donationLine: string|null}`.

2. `scripts/quit/import-v3.mjs` (plain Node, no deps): for v3 ids `nicotine, cannabis, porn, alcohol` writes
   `src/quit/data/<id>.json` (`cannabis` → `weed`), 2-space JSON, trailing newline, deterministic (running it
   twice gives no diff). Maps: `numbers` ← v3 `numbers` minus the internal keys `was, wasR6, wasR7,
   changeNote, editNote, origin, rev*`; `hope` ← the number of kind `hope-free-now` (else null); `beliefs` ←
   v3 beliefs with `id` = `b1`…`b5`, `whenThought` ← `test`, `test` ← `testR7` (fallback `"TODO"`), `scene`,
   `short`, `need` = `"TODO"`, internal keys dropped; `felt` ← `felt/<v3 id>.json` (`forums`, `years:
   "2021–2025"` from `harvest`, `postsUsed` ← `nUsed`, `postsSampled` ← `nSampled`, `bias` ← `biases`,
   bins keep only label/from/to/n/symptoms/positives); `symptomWords` ← the `HARD` and `GOOD` maps (line ~342
   ) in `board/build_v3.py`, parsed with a regex, label only; `planSteps` ← `06-template.json`
   `planTitles` + `plan` with `{thing}`, `{need}`, `{verb}`, `{free}` filled from that page's `subs` merged
   with `SUBS_V3`, HTML tags stripped, `do`/`proof` from v3 `plan[i]` (proof refs resolved to full refs from
   the page's `researchRefsToAdd`/06 `globalRefs` where they are ids; unresolved → `"TODO"`); `footerNote` ←
   `footerProposal`; `danger` ← `{level: id==="alcohol" ? "danger" : "none", line: alcohol ? "TODO" : null, refs: []}`;
   `name` ← `VICES` label in `src/vice/data/vices.ts` (hard-code the four: "Smoking or vaping", "Weed", "Porn",
   "Drinking"); `units` and every other field `"TODO"`. Prints a per-file count of TODO fields.
3. Run it once; commit the four outputs. `src/quit/data/live.json` = `[]`.
4. `src/quit/data/offer.json` = `{"coachingPriceUsd": 200, "days": 30, "guaranteeLine": "If you're not
   nicotine-free in 30 days, I keep working with you free until you are.", "paymentLinkUrl": null,
   "donationLine": null}`. `src/quit/offer.ts` exports `getOffer()` and `canBuy() = paymentLinkUrl !== null`.
5. `src/quit/data/index.ts`: static imports of the JSON files; `getAddiction(id): QuitAddiction | null`,
   `liveIds(): QuitAddictionId[]`, `isLive(id)`.
6. `src/quit/validate.ts`: `validateAddiction(data, opts?: {live: boolean}): Issue[]` with `Issue {path:
   string /* e.g. "beliefs[2].scene" */; rule: string; message: string}`, and `validateLive(): Issue[]`
   (all files in `live.json`). Rules (each its own small function, each with a `rule` id):
   - `todo`: any `"TODO"` string at any depth, path named. Only reported when `live: true`.
   - `words`: scene ≤ 16, short ≤ 6, proof ≤ 40, swap text ≤ 10, mirror ≤ 14, quote ≤ 30, counted ≤ 12,
     headline ≤ 22, lesson body ≤ 180, lesson exercise ≤ 40 (word = whitespace-split token).
   - `basis`: every number has severity (known tag), counted, ref.url, and basis who/n/where/when/measured
     and caveat; every belief, fact and symptomHelp has severity-or-evidence plus ≥ 1 ref; every swap has
     evidence and (unless `evidence: "none"`) ≥ 1 ref; counts: beliefs 12, facts 3, needs 8, tapeForward 4,
     planSteps 5, bands cover 0–12 without gaps or overlap.
   - `counted-words`: rule 3 key words per tag (copy `COUNTED_KEYS` from `build_v3.py` (after `OFF_READER`) exactly).
   - `screening`: rule 1 list (`SCREEN` in build_v3.py) + "sound like you", in all reader text.
   - `cheer`: `CHEER` from build_v3.py + "!" in reader text.
   - `founder`: `\bI quit\b`, `\bwhen I\b`, `\bmy story\b` (case-insensitive) in any reader text. Belief
     `limiting`/`counterpart`, `tapeForward`, `responses`, `riskyMoments`, `endings`, `helped` are the
     reader's own voice and exempt; `planSteps` are the owner's words and exempt.
   - `dollar`: `$` anywhere in a data file (amounts are numbers: `usd`, `defaultPriceUsd`). Every unit with a
     `defaultPriceUsd` has ≥ 1 `priceRefs` entry (`basis` rule).
   - `moderation`: a belief matching `MOD_WORDS` (build_v3.py) must be `kind: "moderation"`; a moderation
     belief's severity must be in `MOD_OK` or its `counted` contains "not checked".
   - `danger`: `danger.line` must be null when `level: "none"`, non-empty when `"danger"`.
   - `forecast`: "you will", "chance of success", "likely to succeed", "will succeed" in `endings`, `helped`,
     and any field under a `past` key, and in `lessons`.
   - `do-not-avoid`: a `responses[].text` whose first verb after an optional "I " is won't/not/avoid/never/
     don't/stop (regex `^(I\s+)?(won'?t|will not|not|avoid|never|don'?t|stop)\b`, case-insensitive).
   - `no-reset`: `reset`, `back to zero`, `start over from day 0`, `day zero` anywhere.
   - `toll`: `TOLL` from build_v3.py in number text.
   "Reader text" = every string field except: `refs`/`ref`/`alsoRef` objects, `basis`, `check`, `id`,
   `kind`, `severity`, `evidence`, `blackBoxEnding`, `symptomWords` keys, `link`, `url`.
7. `tests/unit/quit/validate.test.ts`:
   - `validateLive()` returns `[]` (live.json is empty now).
   - For nicotine with `live: true`: the issues include `rule: "todo"` with paths naming each TODO field
     (assert at least `beliefs[0].need`, `needs`, `lessons`, `catch`), and the message lists the path.
   - One minimal valid fixture (`tests/unit/quit/fixtures/valid.ts`, a complete small `QuitAddiction` built
     to pass every rule) returns `[]`; then one test per rule mutating that fixture to break exactly that
     rule and asserting exactly that rule id fires.
   - Importer determinism: run `node scripts/quit/import-v3.mjs --check` (a flag that compares instead of
     writing and exits 1 on difference) via `spawnSync` with env including `NODE_ENV: "test"`.
   - `canBuy()` is false.

**Out of scope:** no routes, no components, no reader text written (Phase 2 writes the content).

**Acceptance (Haiku checks):** `npx vitest run tests/unit/quit` green; full `npx vitest run` no new failures
against the baseline in `~/.cache/daygame-research/quit-tool/baseline-2026-11-18.md`; `node
scripts/typecheck-ratchet.mjs` passes; `npx eslint src/quit scripts/quit tests/unit/quit` clean; temporarily
putting `"nicotine"` in `live.json` makes `validateLive()` fail naming TODO paths (then revert).

### Phase 2: nicotine content — writer Sonnet, checker Opus, critics Opus + Sonnet

1. Writer (Sonnet subagent; gets RULEBOOK, SCHEMA, the five existing beliefs, the five steps, felt data,
   `evidence-tools.md`, memory rules "brand edge", "numbers show their basis"): 7 new beliefs, 12 scenes,
   facts, needs and swaps (swaps graded from `evidence-tools.md`), endings, helped, risky moments, responses,
   clear-out, symptom help, tape-forward, cost swaps, besides, bands, catch, and the 3 prep lessons + 14 daily
   ones (the rest in Phase 8). Voice: short, plain, edge, for the 98%; no sermon; no founder "I".
2. Checker (Opus subagent, separate, never sees the writer's reasoning): fetches every source, checks every
   claim, group, n and Counted tag; ok / fix / drop with reasons. `research@example.com` for any API that
   wants an email.
3. Fixes, then a second check on changed items. Owner-lens critic (Opus: RULEBOOK + his round notes in
   `docs/research/addiction-one-pagers/README.md` + his menu notes) and cold reader (Sonnet: a man who vapes,
   sees only screen text).
4. Drafts and verdicts in `~/.cache/daygame-research/quit-tool/nicotine/` (private).

Acceptance: validator passes with nicotine live; no open items from either checker or critic.

#### Phase 2 brief (Opus, 2026-11-18) — the nicotine content, by recipe

Work folder (private, never committed): `~/.cache/daygame-research/quit-tool/nicotine/`. The committed result
is only `src/quit/data/nicotine.json`. Every round's file is kept (`draft-1.json`, `verdicts-1.json`, …).

**Step A, writer (Sonnet subagent).** Starts from the Phase 1 `src/quit/data/nicotine.json` and fills every
`"TODO"`, writing `draft-1.json` (a full `QuitAddiction`) and `claims-1.md` (one row per sourced item: path,
claim, url, quote ≤ 30 words copied from the page it fetched, date). Reads first: RULEBOOK.md (all), SCHEMA.md,
`06-template.json` (the five steps), `08-v3/felt/nicotine.json`, `~/.cache/daygame-research/quit-tool/
evidence-tools.md` (§1, §3.2, §4, §5), `loved-features.md` (voice of what users love), memory files
`brand-edge-not-safety-first.md`, `numbers-show-their-basis.md`, `reality-not-saints.md`. Rules:
- The five existing beliefs (`b1`–`b5`): `limiting`, `counterpart`, `proof`, `refs`, `check` stay word for
  word (rule 25). Add only `scene`, `short`, `need`.
- Seven new beliefs `b6`–`b12`, picked from: focus/work ("I can't concentrate without it"), boredom ("it's
  something to do"), social/breaks ("smoke breaks are where I talk to people"), weight ("I'll put on weight"),
  identity ("I'm just a smoker"), timing ("I'll quit when things calm down"), drinking ("only when I drink" →
  `moderation`), sleep or mornings, "vaping is how I quit smoking" (answer: switching keeps nicotine; never
  says vapes are as harmful as cigarettes). Each new belief: one of each kind is not required; `need` from
  the 8 ids; `counterpart` is something he can genuinely believe (rule 22); `whenThought` is a small act at
  the moment the thought shows up on its own; `test` is a this-week test that never sends him into the hard
  thing on purpose; `proof` ≤ 40 words, one figure per line, "N in 100", sourced, never repeating a number
  already in `numbers` or `hope` (rule 22, G2); severity + counted per rule 3.
- `scene` (≤ 16 words) is a moment he recognises, second person, present tense ("Your phone buzzes with bad
  news and your hand is already in your pocket."). `short` (≤ 6 words) is the voice's line, used as a chip
  in `sos` ("It calms me down").
- `facts`: 3 true-or-false statements where most smokers guess wrong, each with `explain` ≤ 40 words + ref.
- `needs`: all 8, each 3 swaps, best evidence first, grades from evidence-tools §3.2 and §5 only (a swap with
  no study is `evidence: "none"`, refs `[]`). Text ≤ 10 words, a "do", plain.
- `units`: cigarettes, vape days, pouches; `defaultPriceUsd` per unit from a fetched public US source (state
  average pack price, a major retailer's listed price); `priceRefs` say what it is; `defaultMinutesPerUnit`
  for cigarettes from a source (time per cigarette), else null. `costKind: "money+time"`.
- `endings` (10, Part 2 `past` list) each mapped to a `ViceEndingId` (stress→stress, "just one"→justone,
  someone offered/celebration/drinking→drink, faded/boredom→faded, it was right there/empty evening/
  couldn't sleep/a fight→other or stress as fits; write the map in claims-1.md); `helped` (8–10);
  `riskyMoments` (10, from felt data + evidence §5.7); `responses` (10, each a "do", Move 5 first).
- `clearOut` (8–12), the hard-but-not-impossible blocker rule; `symptomWords` keep the imported labels;
  `symptomHelp`: one row for each of the 6 symptoms named most in the felt bins, plus the sleep card (four
  rules, Part 2 `symptoms`), evidence graded.
- `tapeForward`: 4 lines, second person, the moment after "just one" played forward, no sermon.
- `costSwaps`: 6, rising `usd` (about 100 → 20,000), everyday things a man would want, `usd` rounded, each
  backed in claims-1.md by a fetched typical price; text has no `$`.
- `besides`: free help only (national quit lines for the US and UK, the free official quit sites, the main
  forum by name, combination NRT done right with its Cochrane ref, exercise for the craving, telling one
  person). No affiliate links.
- `keyFacts`: 3–4 one-line facts for the top of the menu (P11, P13), each sourced in claims-1.md (e.g.
  nicotine withdrawal is not dangerous; when it peaks).
- `bands`: Q5 ranges; `free` links to `/plan`. `catch`: ≤ 80 words, true against Part 2 (the tools are free,
  no account; answers stay on his phone until he saves; coaching is paid and optional; no ads, nothing sold).
- `lessons`: 3 prep (days −3..−1) + 14 daily (days 1–14), each tied to a `beliefId`, body ≤ 180 words,
  exercise ≤ 40 words, plain, edge, sourced where they state a fact.
- Voice everywhere: plain, short, edge, for the 98%; no "!", no cheering, no screening, no sermon, no founder
  "I", no "reset"/"back to zero", no forecasts of success, no death tolls. Copy no forum post, review or book
  sentence (the repo is public); counts from the felt data may be used.
- Run `validateAddiction(draft, {live: true})` (write a throwaway script in the work folder that imports
  `src/quit/validate.ts` with `npx tsx`) and fix until it returns `[]` except `check` fields.

**Step B, checker (Opus subagent, fresh, never sees the writer's reasoning).** Gets `draft-1.json` and
`claims-1.md` only. Fetches every url again (`research@example.com` where an API asks for an email); for each
claim: does the quote appear on the page word for word, does the claim say what the source says, is the
group/severity/counted right, is the n the n behind that figure, is the evidence grade right, is it "N in
100". Writes `verdicts-1.json`: `[{path, verdict: ok|fix|drop, reason, fix?}]` for every sourced item, and a
`voice` list of rule breaks it noticed (rule number + path).

**Step C.** Writer applies every fix/drop (`draft-2.json`); checker re-checks only changed items
(`verdicts-2.json`). Repeat at most once more. Items still not `ok` are dropped or replaced by a weaker
honest version (`evidence: "none"`).

**Step D, critics (parallel).** Owner-lens critic (Opus): RULEBOOK + `docs/research/addiction-one-pagers/
README.md` round notes + memory `notes-are-fixes-not-rules.md`, `brand-edge-not-safety-first.md`,
`reality-not-saints.md`; lists anything the owner has objected to before, with path. Cold reader (Sonnet):
a 27-year-old man who vapes daily and tried to stop twice; sees only the reader text (a flat dump of
scenes, shorts, counterparts, whenThought, test, swaps, facts, tapeForward, lessons); says per item what he
understood, what felt preachy, what he'd skip, and explains each number back. Writer fixes; changed sourced
items go back to the checker.

**Step E, commit (Sonnet, worktree).** Copy the final into `src/quit/data/nicotine.json`; each sourced item
gets `check: {by: "quit-tool checker (opus)", on: <date>, verdict: "ok"}`; add a test in
`tests/unit/quit/validate.test.ts`: `validateAddiction(getAddiction("nicotine"), {live: true})` returns `[]`.
`live.json` stays `[]` until Phase 7.

**Acceptance (Haiku):** that test green; `npx vitest run tests/unit/quit`; typecheck ratchet; `python3
docs/research/addiction-one-pagers/board/check_privacy.py src/quit/data/nicotine.json` passes (rule 30: no
8-word run from any harvested forum post).

### Phase 3: the menu screen and the shared frame — brief Opus, build Sonnet

1. `/quit` (pick an addiction: live ones first), `/quit/[addiction]` (the menu, as the mock, with his notes
   folded in), shared tool frame (header, back, progress, footer with "Craving now?", two doors, privacy,
   sources), `?present=1` mode (Part 4), `isPublicPage` + unit test, unknown id → 404.
2. `POST /api/quit/count {addiction, tool, step, src?}`: whitelisted names only; `src` is a short campaign tag
   from the link (`?src=ig-012`), letters/digits/dash, ≤ 20 chars. Until Phase 8's table exists, a no-op.
3. (Dropped by the owner's menu note, 2026-11-18: no "Start here" box; one "New here?" line instead.)

Acceptance: Playwright at 390×844: menu loads signed out, every row opens its tool or a "coming soon" state
for wave 2/3 tools that says when; no horizontal scroll; dark and light.

#### Phase 3 brief (Opus, 2026-11-18) — menu, frame, count route

Reads first: `node_modules/next/dist/docs/` guides for the App Router pages, layouts, dynamic segments
(`params` is a Promise in this Next), `notFound`, route handlers, `generateStaticParams`, metadata;
`proxy.ts`, `src/shared/routes.ts`, `tests/unit/navigation/proxyPrivateByDefault.test.ts`, `app/globals.css`
(tokens; the app is dark only: there is no light theme, so "dark and light" in the acceptance means the page
is unchanged and readable under `prefers-color-scheme: light`), `components/ui/` (reuse its Button etc.),
`components/BackLink.tsx`.

**Files:**
1. `src/quit/data/menu.json` ← copy `~/.cache/daygame-research/quit-tool/menu/menu-from-mock.json` without
   `_note`. Types for it in `src/quit/types.ts` (`QuitMenu`). Every reader string on the quit pages comes
   from `menu.json`, `src/quit/data/frame.json` (new: footer labels "Craving now?", "Free tools", "30 days
   with a coach", "Privacy", "Sources", "Back", "Coming soon", 404 text) or the addiction data file; no
   reader text in components.
2. `app/quit/layout.tsx`: outside `(app)` (no tab bar, no sign-in). Minimal header: site name linking to
   `/quit`. Uses the app tokens. Max width 640 px centred, 16 px side padding, safe-area insets.
3. `app/quit/page.tsx`: list of addictions; live ones (`liveIds()`) first as big rows linking to
   `/quit/<id>`; the rest under "Coming later" without links. While `live.json` is empty, every addiction is
   "Coming later" in production; in development and test (`process.env.NODE_ENV !== "production"`) or with
   `?preview=1`, non-live addictions that have a data file are shown as links marked "Preview". Same rule
   decides whether `/quit/[addiction]` answers 404.
4. `app/quit/[addiction]/page.tsx`: the menu. Title (`addictions[id].title`), a `<select>` addiction switcher
   (live + previewable ids; navigates on change), the "New here?" line (link to `/quit/<id>/beliefs`),
   5 groups (`groups[]`): row = name (with `{lies}` filled), line, minutes (number → "N min"; string as is;
   null → nothing), pill only for `account: "free"|"paid"`. Wave-1 rows link to `/quit/<id>/<tool>`; wave 2/3
   rows link too but open the coming-soon state. `coach` row links to `href`. Sticky "Craving now?" bar at
   the bottom (links to `/quit/<id>/sos`), not covering the last row (bottom padding), respects the safe-area
   inset. Unknown id or non-previewable → `notFound()`.
5. `app/quit/[addiction]/[tool]/page.tsx`: looks up the tool in `src/quit/tools/registry.ts` (`{[toolId]:
   {wave, Component: React.ComponentType<ToolProps> | null}}`, all `null` for now). Null or wave > 1 →
   `ComingSoon` (tool name, its line, `coming[wave]` text, link back to the menu). Unknown tool → 404.
6. `src/quit/components/ToolFrame.tsx`: header (Back → menu, title, optional progress bar `step/of`),
   children, footer: "Craving now?" (hidden on the `sos` tool), the two doors (`/quit/<a>` and
   `/quit/coaching`), Privacy (`/privacy`), "Sources" (an anchor `#sources` that tools fill). `?present=1`
   (Part 4): no footer, no counts, type scaled 1.4×, `data-present` on the root for later phases. Export a
   `useQuitStore()` hook in `src/quit/store.ts`: `localStorage` key `quit-v1`, shape
   `{[addiction]: {[tool]: unknown}}`, every read/write in try/catch, in-memory fallback, `get(a, tool)`,
   `set(a, tool, value)`, `clear(a, tool)`; unit tests with storage throwing.
7. `isPublicPage`: add `isUnder(pathname, "/quit")` and `isUnder(pathname, "/privacy")`; extend the routes
   unit test (`/quit`, `/quit/nicotine/beliefs`, `/privacy` public; `/quitx`, `/plan/quit-vice` private).
   API routes skip the proxy already (matcher), so `/api/quit/count` needs nothing there.
8. `app/api/quit/count/route.ts` (POST): body `{addiction, tool, step, src?}`; `addiction` ∈ ids, `tool` ∈
   `QUIT_TOOL_IDS` or `"menu"`, `step` ∈ `"view"|"start"|"done"`, `src` matches `^[a-z0-9-]{1,20}$`; else
   400. Body over 1 KB → 413. Valid → 204 and nothing stored (Phase 8 adds the table). No cookies, no IP,
   no logging of the body. `src/quit/count.ts` client helper `count(addiction, tool, step)`: reads `src` from
   the page URL once (kept in `sessionStorage` `quit-src`, try/catch), `navigator.sendBeacon` with fetch
   fallback, never throws, does nothing in `?present=1`. The menu sends `view`. Unit tests for the
   validation.
9. Playwright spec `tests/e2e/quit/menu.spec.ts`, 390×844, signed out: `/quit` loads; `/quit/nicotine`
   (preview in dev) shows the 5 groups and all 20 rows; no element wider than the viewport
   (`document.documentElement.scrollWidth <= 390`); every row's link answers 200 and shows either a tool or
   the coming-soon text; `/quit/nope` is 404; the sos bar does not cover the last row when scrolled to the
   bottom; the same with `colorScheme: "light"`. Follow the repo's e2e rules (look at an existing spec and
   `tests/unit/ci/e2e-isolation.test.ts` for what specs must do: timed sleeps, listed skips).

**Acceptance (Haiku):** unit tests green (new + full suite vs baseline), typecheck ratchet, eslint on changed
files, the Playwright spec green against a worktree dev server (memory "Worktree e2e servers": `next dev
--webpack -p <free port>`, `NEXT_DIST_DIR=.next-quit`, test-stack env, `--workers=1`, own `--output`),
plus screenshots of `/quit` and `/quit/nicotine` at 390×844 saved to `~/.cache/daygame-research/
quit-tool/shots/phase3/` and checked against this list: title, switcher, New-here line, 5 group headings,
pills only on Free account/Paid rows, sos bar visible, no "No account", no "Start here", no "men".

### Phase 4: wave 1, part 1 — `beliefs`, `gives`, `past`, `cost`, `how` — brief Opus, build Sonnet

Per Part 2. Acceptance per tool as written there, plus a phone walk (Sonnet) and a Haiku check that every
screen's text matches the data file (no hard-coded reader text in components).

#### Phase 4 brief (Opus, 2026-11-18) — `beliefs`, `gives`, `past`, `cost`, `how`

**Shared for all five (and every later tool):**
- One folder per tool: `src/quit/tools/<id>/` with `logic.ts` (pure functions, no React, unit-tested in
  `tests/unit/quit/tools/<id>.test.ts`) and `<Name>Tool.tsx` (client component, `ToolProps = {addiction:
  QuitAddiction; present: boolean}`); register it in `src/quit/tools/registry.ts`.
- UI labels (buttons, headings, rating labels, evidence words) live in `src/quit/data/tooltext.json`, keyed by
  tool, with `{name}`, `{n}` slots; content comes from the addiction file. A unit test
  `tests/unit/quit/noHardcodedText.test.ts` scans every `.tsx` under `src/quit/` and `app/quit/` and fails on
  a JSX text node or string literal prop (`aria-label`, `placeholder`, `title`, `alt`) holding two or more
  letters that is not read from data (allow-list: none; use tooltext for aria labels too).
- Shared components in `src/quit/components/`: `NumberCard` (big figure, headline, Counted line, one tag
  "Checked as hooked" / "Not checked for addiction" from `checked` else severity per RULEBOOK rule 2, chips
  for `projection` "Worked out, not counted", `pooled` "Average across studies", `weak` line; a "Based on"
  fold with design/who/n/where/when/measured, caveat and `SourceTap`), `SourceTap` (tap → cite, quote, link
  opening in a new tab; P22), `CountedLine`, `Chips`, `Stepper`, `OneQuestion` (one question per screen,
  progress from `ToolFrame`), `EvidenceChip` (strong "Strong evidence", moderate "Some evidence", weak "Weak
  evidence", none "Not tested").
- Each tool lists the refs it showed in the frame's `#sources` fold. Each tool sends `count(a, tool,
  "start")` on its first answer and `"done"` on its result screen.
- State in `useQuitStore()` (`quit-v1`) under the tool id; a reload resumes at the first unanswered screen;
  a "Clear my answers" button on each result screen (never the word "reset").
- Back on screen N goes to screen N−1 (in-page), and the browser Back button does the same (push a `?s=N`
  search param per screen with `router.push`, read it on load; an out-of-range `s` goes to the first
  unanswered screen).

**`beliefs`** — screens 1–12: the belief's `scene`, 5 buttons (tooltext ratings, values 1–5); 13–15: a fact's
`statement`, True / False, then its answer, `explain`, Counted line and `SourceTap`, Next. Result screen:
1. "Already see through" — the `short` of each belief rated 1–2, in data order (left out if none).
2. Top beliefs — `topBeliefs(ratings)`: ratings ≥ 3, sorted by rating desc then data order, at most 3. Each:
   `limiting` → `counterpart`, `proof` + CountedLine + SourceTap, "When this thought comes" `whenThought`,
   "Test it this week" `test`, and a link "What it gives you: <need name>" to `/quit/<a>/gives?need=<id>`.
3. Band — `held = count(rating ≥ 4)`, `bandFor(held, bands)`; label and text; `link` shown when present.
4. Share — "Share my result": `navigator.share({title, text: tooltext share line with {n}, url:
   /quit/<a>/beliefs})`, fallback copies the URL and says "Link copied". "Save the image" links to
   `/quit/<a>/card?held=N`.
5. Next: "What it gives you" → `/quit/<a>/gives` (its needs prefilled from the top beliefs).
`app/quit/[addiction]/card/route.tsx`: `ImageResponse` (read the `image-response.md` doc), 1080×1350, the
tooltext card line ("I believed {n} of {name}'s 12 lies") and the site name; `held` must be an integer 0–12,
else 400; unknown or non-previewable addiction 404. Tests: scoring, ties by order, all 1s (no top, band
free), all 5s, bands at 2/3/6/7/12, share URL, card param validation.

**`gives`** — screen 1: pick 1–3 needs (8 chips, `needs[].name`; preselected from `?need=` or from the
`beliefs` result's top beliefs' needs, at most 3). Screen per picked need: the `limiting` lines of beliefs
with that need (quoted), then its 3 swaps in `orderSwaps(swaps, ratings)` order, each with `EvidenceChip`
and "Try this one this week" (stores `{swapId, triedOn}`). A swap tried before today shows the slider "How
much of it did that give you?" 0–100 (step 10) with Save. `orderSwaps`: rated ≥ 60 first by pct desc, then
unrated in data order, then 30–59, then < 30. Tests: preselect from beliefs, `?need=` wins, slider
reorders, unknown need ids ignored.

**`past`** — screen 1: tries (chips 0, 1, 2–3, 4–9, 10+); longest stretch (number stepper 1–99 + unit chips
days/weeks/months/years); when the last one ended (chips: this month, this year, longer ago). Tries = 0 →
straight to the result. Screen 2: what ended it, up to 3 (`endings`). Screen 3: what helped (`helped`,
multi). Screen 4: after the first slip (tooltext chips: gave up / restarted the same day / "just this once" /
don't remember). Result: the `how-tries` number from `numbers` as a `NumberCard` (left out if the file has
none); `dangerWindow(longest)`: days or weeks ≤ 8 weeks → "Your longest try ended around day N" and the
window days ⌈N/2⌉–N (stored for `curve`); months/years → no window; his top 2 endings as "Risky moments
for your if-then cards" (stored for `ifthen`); what helped as "Keep these in your plan" (stored); "gave up"
→ the line from `planSteps[2].text` that starts "If you slip". No forecast anywhere (validator covers data;
tooltext for this tool gets the same `forecast` regex in a unit test). `toBlackBoxEndings(ids, endings)`
maps to `ViceEndingId` (test). Black Box history writing is deferred to Phase 8.

**`cost`** — screen 1: what you use (`units[]` chips); screen 2: how many a day (stepper 0–200, default 10
for cigarettes, 1 for others), days a week (1–7, default 7); screen 3: price per unit in USD (number field
prefilled with `defaultPriceUsd`, 0–100, 2 decimals) and, when the unit has `defaultMinutesPerUnit`, minutes
each (prefilled, 0–120). Result: `yearCost = amount × daysPerWeek × 52 × price` (52, not 52.18: simple and
stated), ten years = ×10 (no inflation, said in a small line), hours a year when minutes exist; formatted
with `Intl.NumberFormat("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 0})`; one
`costSwaps` line: the largest swap with `usd ≤ yearCost`, else the smallest with "in N years" (N =
⌈usd/yearCost⌉, only when ≤ 10). The price and ten-year figure are stored for `coach`. Tests: maths, zero use,
the 200 × 100 maximum, the swap pick, rounding.

**`how`** — a read page: `hope` first as a big `NumberCard`, then `numbers` grouped by kind prefix in this
order: `who-`, `how-`/`quit-`, `helps-`, `after-`; group headings from tooltext; anything else last. No
screening, no death tolls (validator). `footerNote` as one small line at the end when present.

**Acceptance (Haiku + Sonnet phone walk):** unit tests above; `noHardcodedText` green; full suite vs
baseline; typecheck ratchet; eslint on changed files; Playwright `tests/e2e/quit/wave1-part1.spec.ts` at
390×844 signed out: a full `beliefs` run to the result (top 3 shown, band shown, card URL answers an image),
reload on screen 7 resumes at 7, browser Back from screen 5 shows screen 4, `gives` preselected from that
run, a `past` run with tries 0 and one with all screens, `cost` with defaults shows a dollar figure, `how`
shows every number card; the same `beliefs` run with `localStorage` throwing (an `addInitScript` that
replaces it) still reaches the result; no horizontal scroll on any screen. Screenshots of every screen
type to `~/.cache/daygame-research/quit-tool/shots/phase4/`; a Haiku agent compares each screenshot's text
with `nicotine.json`/`tooltext.json` and lists any text found in neither.

### Phase 5: wave 1, part 2 — `curve`, `sos`, `symptoms`, `slip` — brief Opus, build Sonnet

Per Part 2. Signed-in parts use a test account on the test stack, never the owner's. **`curve` waits** for
the owner's reaction to its visual mock (his note 2026-11-18); `sos`, `symptoms`, `slip` go first.

### Phase 6: privacy page and coach page — brief Opus, build Sonnet

`/privacy` (what is kept, what never is, how to delete; marked as a draft he reads; not legal advice) and
`/quit/coaching` per Part 2. Linked from every quit page and sign-up. Pulled forward by first-1000.

### Phase 7: prove it, then ship nicotine wave 1 (target 20 Dec) — audits Sonnet ×3, review Opus

1. Phone walk on the Android emulator rig and Playwright, light and dark, signed out and in.
2. Adversarial audit, three Sonnet agents with one theme each: signed-out reader breaking flows (back,
   reload mid-test, two tabs, no storage, odd dates, huge numbers); signed-in Black Box links (slips, undo,
   two devices); privacy and security (answers in URLs or logs, count abuse). Each bug reproduced twice.
3. Code review and security review of the fixes (Opus).
4. Owner review page (artifact): the screens as phone shots, each with 👍 and a note box; exceptions only.
5. Ship: nicotine in `live.json`, typecheck ratchet, push `main`, signed-out phone walk on the live site,
   `/api/healthz` build id. Tell first-1000's session the tools are live (its Phase 3 links to them).

### Phase 8: wave 3, the account program — brief Opus, build Sonnet (after the owner's yes to tables)

1. Migration `supabase/migrations/<timestamp>_quit_program.sql`, RLS owner-only: `quit_plans` (id, user_id,
   vice_id, day1, unit_amount, unit_price_usd, minutes_per_unit, needs text[], belief_answers jsonb,
   past jsonb, ifthen jsonb, moment_time, lesson_hour, nudges_on, status active|restarted|ended, created_at,
   deleted_at), `quit_uses` (id, plan_id, user_id, at, need), `quit_checkins` (id, plan_id, user_id, day,
   difficulty 0–10, belief_answers, used, created_at), `quit_swap_ratings` (plan_id, swap_id, pct, at),
   `quit_nudges_sent` (plan_id, kind, for_date; PK all three), `quit_funnel_counts` (day, vice_id, tool, step,
   src, count; PK all but count; written only by a `security definer` function). Repo `src/db/quitRepo.ts`.
   Test stack first; live per "Live DB backup and apply".
2. Claim on `/plan/quit-vice?claim=<a>`: copies `quit-v1` into a plan, starts a Black Box run on day 1,
   idempotent.
3. Plan card on the Black Box page: day N of 90 (before day 1: "+1" use logging with "what did it give you?"
   and, after 5 logs, "most vulnerable: evenings, for relief": P18), today's lesson, check-in, "Craving now?",
   "I slipped", **`record`**: total clear days (never reset), best run, close calls beaten.
4. **`checkin`**: days 1–14 daily, then weekly; days 15, 30, 90 re-rate the top 3 beliefs and show the change.
5. **`lesson`**: 3 prep + 14 daily + weekly to 90 (28 total), each {day, beliefId, title, body ≤ 180 words,
   exercise ≤ 40 words, refs}; days 15–90 written and checked as Phase 2.
   Owner note relayed 2026-11-18: lessons are written clean-room from about 10 books and 5 tools (source
   readers write idea notes; writers never see source text; no close paraphrase).
6. **`identity`**: one line written once; a morning tap "still true today".
7. Nudges `runQuitNudgeClock`: evening before day 1, morning of day 1, evening of day 3, the lesson hour, 30
   minutes before his moment (P3), if-then cards at their hour; quiet hours; one sent-log row per send.
8. `/admin/quit-funnel`: counts per tool and step per addiction, last 30 days, by `src` (which post brought
   them). Admin only.

Acceptance: integration tests for RLS, the claim, no double nudge, quiet hours, DST day counting; a fake
week on the test stack driven by test hooks; then Phase 7's audit pattern again.

### Phase 9: wave 2 — `ifthen`, `clear`, `stake`, `tell`, `besides` — brief Opus, build Sonnet

Per Part 2; ship after a phone walk and a one-agent audit.

### Phase 10: the other addictions — content as Phase 2 (Sonnet writer, Opus checker)

Weed, porn, alcohol by the Phase 2 recipe (import-v3 first). Alcohol: the danger line in key facts and on
the curve's first days; no "cut down instead" anywhere. Porn: swaps can point to the dating half. Phone and
gambling: collect felt data the way the four others were collected (README round 8, scripts in
`~/.cache/daygame-research/one-pagers-v2/`); under 300 usable posts → no curve, "when the pull comes" by hour
from his own logged uses instead. Order may change: first-1000 keeps nicotine the only avatar until 1 Feb.

---

## Part 3: paid programs worth studying (owner's money, owner's click)

Nothing is bought by Claude. The ranked list (names, prices, refund terms, and the two whose terms forbid
studying them for a competing product) is private: `~/.cache/daygame-research/quit-tool/paid-programs.md`,
from `feature-census.md`. For nicotine, the top picks cost about $5–50 in total. Whatever he buys: ideas only,
never words, exercises or audio.

## Part 4: content (owner, 2026-11-18; see `docs/product/content_creation.md`)

- **Platform:** first-1000 makes Instagram Reels the one home platform until 1 Feb 2027 (daily posts, "Comment
  QUIT"). The owner also spoke of YouTube for the tools; the same ideas become long videos when YouTube starts.
- **A video is about his problem, not the feature.** The tool is what's on screen, and he fills it in live.
  Ideas per tool are on the menu mock ("Video idea") and in the planning notes: "The 12 lies vaping tells you,
  pause and rate yourself", "I analysed 758 posts from people quitting. Here's when it gets hard", "Why your
  last quit failed", "What to do in the next 10 minutes", "Day 3 is the worst. Here's why", "I gave my friend
  $500".
- **Every post ends on a free tool or "Comment QUIT"**, never a sale (first-1000 sells the coaching in DMs).
- **`?present=1`**: big type sized for a phone video frame, one step per key press or tap, no footer, no
  counts; the owner records the screen while he talks.
- **`?src=<post-id>`** on every link from a post, so `/admin/quit-funnel` shows which post brought people in;
  no personal data.
- **The tool has to be live before a post points at it.** Until then posts point to "Comment QUIT".
- **Later, a flywheel:** once 200+ men opt in, the totals become posts ("the lie most men believe").

## Part 5: ground rules for the build session

- **Shared working tree.** Build in a git worktree, `git commit --only <paths>`, never `git add -A` or
  `git stash`; ship by fast-forwarding `main`.
- **`main` is the live site.** Push your own work; run `node scripts/typecheck-ratchet.mjs` and `npm test`
  first; batch commits (about 60 pushes a day hits the deploy limit).
- **This Next.js differs from what you know.** Read `node_modules/next/dist/docs/` before any API.
- **Mobile first**, 390 px; done only when it works on a phone.
- **Database** only through `src/db/*Repo.ts`; live test writes inside `begin; … rollback;`; never the
  owner's rows.
- **Repo is public.** No forum quotes, no competitor names or screenshots, no book text, no personal data, no
  owner health history. Private material stays in `~/.cache/daygame-research/`.
- **Every number shows its basis** and Counted tag; a writer's number is unusable until the Opus checker
  fetched its source.
- **Voice:** plain, short, edge, for the 98%; no screening, no sermon, no founder "I"; danger lines only where
  a source ties them to that addiction.
- **Money:** USD; prices only from `offer.json` (the owner's); never sign up for or buy anything.
- **Decisions are not yours** (the build model's): write them under "Questions from the build" and carry on.
- Reports to the owner open with whether it is done, in plain words.

## The one prompt to run it all (owner, 2026-11-18)

Start in the project folder with `claude --model opus` and paste:

> /goal Execute Plans/quit-tool.md for nicotine, Phases 0 to 7, so wave 1 is live by 20 Dec 2026. You are the
> planner and reviewer only: do Phase 0 yourself, then for each phase write its brief into the plan and hand
> ALL building to subagents with model "sonnet" and isolation "worktree", all fact-checking of numbers and
> proofs to subagents with model "opus", and mechanical checks (validator, tests, typecheck ratchet, screenshot
> checklists) to subagents with model "haiku". Do not write app code yourself. After each phase: read the
> subagent's diff and its acceptance results, send it back with exact fixes if anything fails, then
> fast-forward main, push, and update the status line at the top of the plan. Follow Part 5's ground rules and
> memory. Stop only for the owner-only items (one message at the start) or an acceptance check still failing
> after two fix rounds; otherwise keep going phase by phase.

After 20 Dec, the same prompt with "Phases 8 to 10" continues the account program, wave 2 and the other
addictions.

## /goal prompts per phase (if run one at a time; build sessions on `claude --model sonnet`, briefs on Opus)

- Phase 0 (Opus): "/goal Run Plans/quit-tool.md Phase 0: one owner message, read the menu mock's likes and
  notes into Part 2, baselines, reading list. Then write the Phase 1 brief."
- Phase 1 (Sonnet): "/goal Run Plans/quit-tool.md Phase 1 from its brief: types, import script, offer file,
  validator; tests green; commit. Questions go under 'Questions from the build'."
- Phase 2 (Sonnet + Opus checker): "/goal Run Plans/quit-tool.md Phase 2 for nicotine: Sonnet writer, Opus
  checker (model: opus), second check, two critics; validator passes with nicotine live."
- Phases 3–6 (Sonnet, one brief each from Opus first): "/goal Run Plans/quit-tool.md Phase N from its brief;
  acceptance checks pass; push."
- Phase 7 (Sonnet audits, Opus review): "/goal Run Plans/quit-tool.md Phase 7: phone walk, three Sonnet
  auditors, Opus code and security review, owner review page, ship nicotine wave 1."
- Phases 8–10: as above, each after its Opus brief.

## Questions from the build

(none yet)
