# Quit tool: a free menu of quit tools, then a 90-day program

Written 2026-11-18, rewritten the same day after three research rounds and the owner's menu idea. Status:
**plan written; not started.** Replaces the "one page per addiction" frame of the addiction one-pagers
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

The menu screen `/quit/<addiction>`: the title and an addiction switcher; a **"Start here"** box with 3 tools
(6 minutes); then 5 groups; and a **"Craving now?"** bar always at the bottom. Each row: name, one line, time,
and a pill saying *No account*, *Free account* or *Paid*.

| Group | Tool (id) | Account | Wave |
|---|---|---|---|
| Start here | The 12 lies test (`beliefs`), What it gives you (`gives`), Your quit curve (`curve`) | none | 1 |
| Understand it | `beliefs`, `gives`, Your past attempts (`past`), What it costs you (`cost`), How men quit (`how`) | none | 1 |
| Plan it | `curve` (with day 1), If-then cards (`ifthen`), Clear-out list (`clear`), Money on the line (`stake`), Tell one man (`tell`) | none | curve 1, rest 2 |
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

**`how` — How men quit** (wave 1, no account)
A read page: hope number, then who gets free, what helps, how quitting goes (the checked number cards from
`08-v3/pages/<id>.json`), each with basis and source. No screening, no death tolls. Done when: every card
passes the validator.

**`curve` — Your quit curve** (wave 1, no account, P7 P8 P9 P12 P19)
As before: four questions (how much, cost, what it gives, day 1: chips "in 3 days", "next Monday", "in 2
weeks" or a date; **never today and never more than 14 days out**: the near-date evidence), a 2-second
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

**`tell` — Tell one man** (wave 2, no account)
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
| Q8 Day 1 range | Within 14 days, never today | His wording "days or weeks" | Asked on the menu mock (item `step3`); his step text in the tool stays his words until he changes it |
| Q9 Streaks | Total clear days + close calls beaten; never reset | Classic streak | Users report streak shame after one slip |
| Q10 Community feed, AI coach | None | Build them | A feed needs moderation; AI coaches are the worst-rated feature |
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

### Phase 3: the menu screen and the shared frame — brief Opus, build Sonnet

1. `/quit` (pick an addiction: live ones first), `/quit/[addiction]` (the menu, as the mock, with his notes
   folded in), shared tool frame (header, back, progress, footer with "Craving now?", two doors, privacy,
   sources), `?present=1` mode (Part 4), `isPublicPage` + unit test, unknown id → 404.
2. `POST /api/quit/count {addiction, tool, step, src?}`: whitelisted names only; `src` is a short campaign tag
   from the link (`?src=ig-012`), letters/digits/dash, ≤ 20 chars. Until Phase 8's table exists, a no-op.
3. "Start here" remembers which of its 3 tools are done (local) and shows the next one.

Acceptance: Playwright at 390×844: menu loads signed out, every row opens its tool or a "coming soon" state
for wave 2/3 tools that says when; no horizontal scroll; dark and light.

### Phase 4: wave 1, part 1 — `beliefs`, `gives`, `past`, `cost`, `how` — brief Opus, build Sonnet

Per Part 2. Acceptance per tool as written there, plus a phone walk (Sonnet) and a Haiku check that every
screen's text matches the data file (no hard-coded reader text in components).

### Phase 5: wave 1, part 2 — `curve`, `sos`, `symptoms`, `slip` — brief Opus, build Sonnet

Per Part 2. Signed-in parts use a test account on the test stack, never the owner's.

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

## /goal prompts (start the session with `claude --model sonnet`; Phase 0 and the briefs on Opus)

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
