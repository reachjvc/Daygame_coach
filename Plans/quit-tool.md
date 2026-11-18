# Quit tool: free tools that bring a man in, then a 90-day program

Written 2026-11-18. Status: **plan written; not started.** Replaces the "one page per addiction" frame of the
addiction one-pagers (docs/research/addiction-one-pagers/). Their research, rules and checked numbers are reused
here; the page form is not.

## Before anything: what only the owner decides

Ask these in ONE message at the start of Phase 0, then don't stop again for them.

1. **New tables on the live database** (adds five tables, deletes nothing, can be dropped again). Needed by
   Phase 6. Yes / not yet.
2. **The coaching price, in USD**, and whether a money-back line and a Ukraine-donation line are shown. Until he
   writes them into `src/quit/data/offer.json`, the coaching door says "price in the reply" and shows no
   guarantee or donation line. He was not sure about the prices proposed so far, so never fill these in yourself.
   Phase 7 brings him a short list of what comparable coaches charge, with sources, to help him choose.
3. **Nothing costs money.** No payment system, no email service, no paid tier is touched. If a step seems to need
   one, stop that step and say so; don't sign up for anything.

Already decided by the owner (2026-11-18): build inside the current app (the rebuild Jacob advised is not
decided; all words and numbers sit in plain data files so a rebuild carries them over); saving the plan, the
craving tool and the program are free with an account; the only paid thing is 1:1 coaching, requested through a
form; all amounts are in USD; **no first-person founder story** ("I quit…") anywhere: the tool speaks in the
brand's voice.

---

## Part 1: in plain words

### What gets built

Today the app has the Black Box (`/plan/quit-vice`), a signed-in record of quit runs and close calls. Nobody
can reach anything about quitting without an account. This plan adds four free public tools per addiction,
each one handing to the next, and a 90-day program behind a free account:

1. **Start page** `/quit/<addiction>`: one hope number with its basis, a three-line key-facts box, three
   "how people quit" numbers, and three buttons: *Take the belief test*, *See your quit curve*, *Craving now?*
2. **Belief test** `/quit/<addiction>/beliefs`: 12 beliefs written as scenes he recognises, each rated 1 to 5,
   plus 3 true-or-false facts. The full result shows on screen at once, no email: first the beliefs he already
   sees through, then the three that hold him most, each with its new belief, the proof and its basis, when the
   thought tends to come, and a real-life test. An honest band, including "you're mostly free". A share card.
3. **Your quit curve** `/quit/<addiction>/curve`: four short questions (how much, what it costs him in dollars
   or hours, what it gives him, his day 1). Then his yearly cost, and the felt-difficulty lines drawn on HIS
   calendar ("Thu 27 Nov, day 3: the hardest stretch starts"), the symptoms people mention most and when they
   fade, swaps for what it gives him, and the 5 steps. He "signs" his day 1. The only ask: **save my curve and
   nudge me** (free account). Saying no still gives him a calendar file for day 1 and a copy-link.
4. **Craving now?** `/quit/<addiction>/now`: name the voice (which belief is talking), what it wants to give him,
   then the answer to that belief, one swap, "play the tape forward", and a 10-minute timer. Signed in, it files
   a close call or a slip straight into the Black Box.
5. **The program** (signed in, on the Black Box page): day N of 90, one short lesson and one exercise a day at
   the hour he picks, each aimed at one belief; before day 1 he logs each use with one tap and what it gave him;
   check-ins on days 1, 15, 30, 60, 90; push nudges the evening before day 1, on day 3, and 30 minutes before
   his usual moment. A slip sends him back through steps 1 to 3 with a new date, never to "day 0" shame.
6. **Two doors**: *do it privately* (the program) or *talk to a coach* (a request form, signed in). A plain
   "What's the catch?" paragraph. Coaching price comes from the owner.
7. **A funnel count** the owner can read at `/admin/quit-funnel`: how many reached each step, per addiction,
   per day. No names, no answers, no addresses.

### Which addictions, in what order

The engine is the same for all; each addiction is one data file. **Pilot: nicotine** (cigarettes, vapes,
snus): the widest audience among his readers, money cost is obvious, withdrawal is not medically dangerous,
and its research is the most complete (758 forum posts by day, 15 checked numbers).
Then **weed** (801 posts), **porn** (closest to the dating half, 534 posts), **alcohol**
(needs a danger line for heavy daily drinkers, 605 posts), and **phone/scrolling** (no withdrawal data yet:
research first). Gambling and junk food come after, in a later plan.

How they differ, and the data file carries it:

| | Nicotine | Weed | Porn | Alcohol | Phone |
|---|---|---|---|---|---|
| Unit he counts | cigarettes / vape days / pouches | sessions or grams | sessions | drinks | hours a day |
| Cost shown | dollars + minutes | dollars | hours | dollars + hours | hours + years |
| Danger line | none (not dangerous) | none | none | **yes, small**: heavy daily drinkers see a doctor before stopping (seizure risk) | none |
| Felt-difficulty data | yes, 758 posts | yes, 801 | yes, 534 | yes, 605 | **none yet** |
| Black Box vice id | `nicotine` | `weed` | `porn` | `alcohol` | `scrolling` |

### What it borrows, and what it refuses

Patterns are named by id. Where each was seen, with screenshots, is in a private file on the owner's machine
(`~/.cache/daygame-research/quit-tool/patterns.md`); read it, copy the idea only, never words or layout.

- Borrowed: P1 cost reused next to the price · P2 strength first · P3 your moment · P4 name the voice · P5 a
  reply per belief · P6 honest result · P7 dated curve · P8 commitment ritual · P9 the gate sits at "save",
  never at "see" · P10 each tool hands to the next free tool · P11 key-facts box · P12 "you are here" with
  "what helps now" · P13 danger level per addiction · P14 two doors · P15 "What's the catch?" · P16 help for
  the craving moment · P17 lesson a day at his hour, check-ins · P18 one-tap slip check-in that turns into a
  pattern · P19 a loading screen that says what it combines · P20 share card · P21 scenes as answers · P22
  sources one tap away.
- Refused: A1 email before the result · A2 fake "not complete" pages · A3 countdowns, "spots left" · A4 hidden
  fees, card trials · A5 numbers with no basis · A6 a result that always says "addicted" · A7 buttons that lead
  to someone else, screen-filling banners · A8 "Does this sound like you?" openers.
- Not borrowed, on purpose: choosing an approach (cold stop / taper / moderate). His method is a date ahead and
  a stop for three months; moderation answers are against his rules (RULEBOOK rule 4).

---

## BLOCKERS (each tried once on 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Signed-out visitors can't open new pages | Read `src/shared/routes.ts`: `isPublicPage` lets only `/`, `/auth`, `/test` through `proxy.ts` | 3–5 | Add `/quit` to `isPublicPage`, with a unit test; `/api/quit/count` must answer without a user |
| B2 | No payment system | Searched src/app/lib for stripe or any payment library: none | — | Coaching by request form only (owner's choice). Payments are a later plan |
| B3 | No email sending | Searched for resend, nodemailer, sendgrid, postmark: none. Only Supabase's own sign-in emails | 4, 6, 7 | No emails from this plan. Day-1 calendar file (.ics) and push nudges instead. The owner gets coaching requests by push to his own devices |
| B4 | Timed nudges | `app/api/notifications/tick/route.ts` is called every minute by the database clock and already runs four reminder jobs with quiet hours (`src/notifications/quietHours.ts`) | 6 | Add `runQuitNudgeClock` beside them, idempotent through a sent-log table |
| B5 | Felt-difficulty data per addiction | `docs/research/addiction-one-pagers/08-v3/felt/*.json`: nicotine 758 posts (38–61 per day bin), weed 801, porn 534, alcohol 605. Phone: no file | 4 (phone only) | Phone's curve waits for its research step in Phase 9 |
| B6 | Share card image | `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` is present | 3 | Use `ImageResponse` in a route handler, as that doc says |
| B7 | Live database change | Not tried: the owner's yes comes first (item 1 above). Method: memory "Live DB backup and apply" | 6, 7 | Ask in the Phase 0 message |
| B8 | Black Box ids | `src/vice/data/vices.ts` has `nicotine`, `weed`, `porn`, `alcohol`, `scrolling`, `gambling`, `junk` | 5, 6 | Reuse these ids. Research files say `cannabis`: map it to `weed` once, in the import script |
| B9 | No privacy page exists | `find app -path '*privacy*'` returned nothing | 7 | Phase 7 writes one before the coaching form goes live: it collects a name and an email |
| B10 | No bot protection yet | `Plans/bot-protection.md` (local only) is not started | 3, 7 | The coaching form needs an account, so it isn't open to bots. The count endpoint takes only a whitelisted step name and stores no identifiers: abuse can only skew counts. Note it in that plan |

## OPEN QUESTIONS (decided, with a reason; the owner may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Pilot addiction | Nicotine | Porn (closest to the dating half) | One data file; swap order in Phase 9 |
| Q2 Program length | 90 days: his step 3 says "the one thing for the next three months" | 30 days | Lessons after day 30 are weekly, so cheap to cut |
| Q3 How many beliefs in the test | 12 per addiction (5 checked ones exist; 7 new) | 8 | Fewer to write and check |
| Q4 Felt-difficulty drawing | Lines per symptom (share of posts naming it), as the owner settled in round 8; "hardest stretch" = the day bins where craving's share is highest. The 0–10 score stays dropped | A single 0–10 line | He already rejected a curve that misdrew craving once |
| Q5 Bands | 0–2 held beliefs "mostly free", 3–6 "some hooks", 7–12 "hooked". Thresholds live in the data file | Score out of 100 | Bands are data, easy to retune |
| Q6 Save before an account | Answers stay in the browser (`localStorage` key `quit-v1`) until he saves; after sign-up the program claims them | Save to the server anonymously | Nothing about his habit leaves his phone unless he makes an account |
| Q7 "You vs others" comparison | Not now; once 200+ saved tests exist per addiction, and only from men who tick "add my answers to the averages" | Show it now with research averages | Needs enough real data to be honest |
| Q8 Coaching request without an account | No: account required (B10). The account is free and quick | Open form | A spam-filled inbox and a GDPR liability |
| Q9 Email follow-up (P23) | Not in this plan (B3). Push replaces it | Add a free-tier email service | A later plan, after the owner says yes to an email account |

---

## PHASES

Every phase: build in a git worktree (see Part 2), phone width first, then desktop. Done = acceptance checks
pass AND the phone walk in Phase 8's style was done for that phase's screens.

### Phase 0: setup and the one ask (depends on nothing)

1. Send the owner the three items at the top of this plan in one message. Record the answers here.
2. Create a worktree from `main`. Run `npm test` and `node scripts/typecheck-ratchet.mjs`. If either is already
   red, write down which tests fail and that they fail on `main` too. Don't fix other people's failures.
3. Read: `docs/research/addiction-one-pagers/RULEBOOK.md` (all rules apply to every word this tool shows),
   `08-v3/SCHEMA.md`, `08-v3/pages/nicotine.json`, `08-v3/felt/nicotine.json`, `08-v3/kinds.json`,
   `src/vice/types.ts`, `src/vice/hooks/blackboxStore.ts`, `src/notifications/pushService.ts`,
   `app/api/notifications/tick/route.ts`, the private `~/.cache/daygame-research/quit-tool/patterns.md`, and
   the Next.js docs in `node_modules/next/dist/docs/` for any API you use.

Acceptance: the owner's answers are written into this file; test and typecheck baselines are recorded.

### Phase 1: the data file and its checker (depends on 0)

Create the slice `src/quit/` (types, data, services, components) per the project's slice layout.

1. `src/quit/types.ts`: `QuitAddiction` with these fields (all reader text in plain words):
   - `id` (Black Box vice id), `name`, `unit` {singular, plural, perDay: boolean}, `costKind`
     ("money" | "time" | "both"), `defaultUnitPriceUsd` (number or null), `defaultMinutesPerUnit`.
   - `danger`: {level: "none" | "doctor-first", line: string | null, refs}. `line` only where a source ties
     the risk to this addiction (memory rule "brand edge").
   - `hope`: one number card copied from `08-v3/pages/<id>.json` `numbers` (kind `hope-*`), with its full
     `basis`, `severity`, `counted` and `refs`.
   - `numbers`: three cards, kinds who-gets-free / what-helps / outlook, same shape.
   - `keyFacts`: three lines (how long the hard part lasts, danger level, what helps most), each with refs.
   - `beliefs`: 12 × {id, scene (≤ 16 words, a moment he recognises), short (≤ 6 words, for chips), limiting,
     counterpart, whenThought, test, proof, severity, counted, refs}. Five come from `08-v3/pages/<id>.json`.
   - `facts`: 3 × {statement, isTrue, explain (≤ 30 words), refs}.
   - `needs`: the six things it gives him (rest, relief, reward, fun, connection, focus), each with
     3 swaps (≤ 10 words).
   - `felt`: day bins from `08-v3/felt/<id>.json` (label, from, to, n, symptoms, positives) + forum name,
     harvest years, total posts used, and the bias note.
   - `symptomWords`: plain name per symptom key ("sleep" → "bad sleep").
   - `tapeForward`: 4 lines for "play the tape forward" (adapted from the retired module's urge tool; see
     `app/test/archive/quit-vice/_module/`).
   - `lessons`: see Phase 6. `bands`: thresholds + one line each. `catch`: the "What's the catch?" paragraph.
   - `planSteps`: the owner's five steps from `06-template.json` `plan`, with `{thing}` etc. filled in.
     Never reword step text beyond filling the slots: they are his words.
2. `scripts/quit/import-v3.mjs`: reads the 08-v3 files and writes the parts that already exist into
   `src/quit/data/<id>.json` (maps `cannabis` → `weed`). Fields that don't exist yet are written as `"TODO"`.
3. `src/quit/data/offer.json`: `{ "coachingPriceUsd": null, "guaranteeLine": null, "donationLine": null }`.
4. `src/quit/validate.ts` + `tests/unit/quit/validate.test.ts`. The test fails when, in any data file:
   any `"TODO"` remains in a file listed as live in `src/quit/data/live.json`; a word limit above is broken; a
   number or belief has no `severity`, no `counted`, or no ref; a `counted` breaks RULEBOOK rule 3's key words;
   any reader text contains a screening phrase (RULEBOOK rule 1 list, plus "sound like you"); any text says
   "I quit", "when I", "my story" (no founder voice); any `$` amount appears outside `offer.json` and the cost
   calculator; a moderation belief's proof is tagged `heavy` or `users` (rule 4); `danger.line` is set on an
   addiction with `level: "none"`.

Acceptance: `npm test` runs the validator over nicotine with `live.json` empty (passes) and with nicotine
listed (fails, naming each TODO). Commit.

### Phase 2: nicotine content (depends on 1)

Write the missing nicotine content with the writer → checker loop that the one-pagers proved necessary
(memory "a research agent's numbers are not ready until a separate reviewer has fetched the sources"):

1. **Writer agent** (fresh, gets RULEBOOK, SCHEMA, the five existing beliefs, the owner's five steps, the
   felt data, and memory rules "brand edge", "numbers show their basis", "reality, not saints"): writes 7 new
   beliefs, 12 scenes, 3 facts, needs + swaps, key facts, symptom words, tape-forward lines, bands, the catch
   paragraph. Every proof gets a real source with a URL. Voice: short, plain, edgy, for the 98%; never
   moralising; no founder "I".
2. **Checker agent** (separate, never sees the writer's reasoning): fetches every source, checks each claim,
   group, n and Counted tag, marks each item ok / fix / drop with the reason. Use `research@example.com` for any
   API that asks for an email, never a real address.
3. Apply fixes. Run a second checker pass on changed items only. Then **owner-lens critic** (reads as the
   owner, with the RULEBOOK and his round notes in `docs/research/addiction-one-pagers/README.md`) and **cold
   reader** (a man who vapes, sees only the screens' text): both report anything unclear, preachy, screening,
   or untrue to how quitting feels.
4. Keep drafts and verdicts in `~/.cache/daygame-research/quit-tool/nicotine/` (private): forum lines and
   quotes never go in the repo.

Acceptance: validator passes with nicotine in `live.json`; both checker passes and both critics have no open
items; a table of every number with its source URL is in the private folder.

### Phase 3: start page and belief test (depends on 1; content from 2)

1. `/quit/[addiction]/page.tsx` (public; add `/quit` to `isPublicPage` with a unit test). Order on a phone:
   hope number (tap opens basis: design, who, n, where, when, what it does not mean: P22) → key-facts box
   (P11) → danger line only if set (P13) → "Take the belief test" (primary) → "See your quit curve" → three
   number cards → "Craving now?" (always visible, slim bottom bar on phones: one bar only, A7) → two doors
   (P14) → What's the catch? (P15) → sources. Unknown addiction id → 404.
2. `/quit/[addiction]/beliefs`: one belief per screen on phones (scene in large type, five buttons from
   "Not me" to "That's me", progress bar, back button), all on one scrolling list on desktop. Then 3 facts,
   true/false, the answer shown after each tap (P5).
3. Result, same route, no email, no account (A1, P9): (a) "Already see through" (rated 1–2) first (P2);
   (b) the 3 highest-rated beliefs as cards: limiting → counterpart, proof with its Counted tag and tap-for-basis,
   "When this thought comes", "Test it this week"; (c) the band with its line; "mostly free" points to the life
   half (`/plan`) instead of the program (P6, A6); (d) share card (P20): `/quit/[addiction]/card?held=6`
   renders "I believed 6 of nicotine's 12 lies" via `ImageResponse`: count only, nothing else from his
   answers; (e) "Next: see your quit curve" carries his answers forward (P10); (f) "Save my answers" → account.
4. Answers and progress live in `localStorage` key `quit-v1` (`{[addiction]: {beliefs, facts, curve, day1}}`),
   wrapped in try/catch; the page works without it.
5. Counts: `POST /api/quit/count {addiction, step}` increments `quit_funnel_counts` (Phase 6 table; until it
   exists the call is a no-op). Steps: `start`, `test-begin`, `test-result`, `share`, `curve-begin`,
   `curve-result`, `signed-day1`, `save-click`, `saved`, `craving-open`, `craving-done`, `coach-open`,
   `coach-sent`. Anything else answers 400. Stores no IP, no id, no answers.

Acceptance: unit tests for scoring, bands, top-3 choice (ties broken by belief order), and the share URL.
Playwright on a 390×844 phone: test → result → share → next, signed out, with no network call carrying
answers (check request bodies). Works in dark and light.

### Phase 4: your quit curve (depends on 3)

1. Four screens, one question each, progress bar: how much (unit from the data file, number stepper); cost
   (dollars per unit, prefilled with `defaultUnitPriceUsd`, or minutes per session for time addictions);
   what it gives you (pick 1–3 of the six needs; prefilled from his test if a belief maps to a need); day 1
   (chips: "in 3 days", "next Monday", "in 2 weeks", or a date; never today, because his step 3 sets a date
   ahead and step 1 says keep using it as usual and log it until then).
2. A 2-second "building your curve" screen that lists what it combines: his answers, N posts from people
   who quit (n from the data), the checked numbers (P19). No fake delay beyond 2 s.
3. Result: (a) yearly cost: dollars and hours, plus one concrete swap ("= a week in Lisbon") from a small
   list in the data file (P1); (b) the symptom lines on his dates: x axis = real weekdays from his day 1 to
   day 90, log-spaced like the day bins; top 4 symptom lines + "craving"; "hardest stretch" band where
   craving's share peaks; a "you are here" marker once day 1 has passed (P7, P12); under it the basis line
   (forum, years, posts used, the bias note) and a tap-open table of every bin's n. Reuse the drawing logic of
   `docs/research/addiction-one-pagers/board/build_v3.py` (its v6 graph), ported to a React SVG component;
   (c) the three most-mentioned symptoms, each "most mentioned on days X–Y, fades by Z" computed from the bins,
   never invented; (d) swaps for the needs he picked; (e) the five steps with his date filled in;
   (f) "Craving now?" pinned at the hardest stretch (P16).
4. Commitment (P8): "Day 1 is Thursday 27 November. Hold to commit." (press-and-hold 1.5 s, keyboard
   alternative). Then the one ask: **"Save my curve and nudge me"** → `/auth/sign-up?next=/plan/quit-vice?claim=<addiction>`
   (P9). Decline → "Add day 1 to my calendar" (download a `.ics` with day 1 and day 3 events, built in the
   browser) and "Copy my curve link" (state in the URL hash, never on the server).
5. The yearly cost reappears next to the coaching price only when `offer.json` has one (P1); never invent a
   price.

Acceptance: unit tests for the date maths (time zones: compute in the reader's local date; test Copenhagen and
New York), the cost maths, the symptom summaries against hand-computed values from `felt/nicotine.json`, and the
.ics text. Phone walk: answer → curve → commit → decline → .ics downloads.

### Phase 5: craving now (depends on 3)

1. `/quit/[addiction]/now`, public, built for one hand at night: large buttons, dark by default if the system
   is dark. Screen 1 "What is the voice saying?": chips from `beliefs[].short` + "something else" (P4).
   Screen 2 "What does it want to give you?": the six needs. Screen 3: the counterpart for that belief, one
   swap for that need, the four tape-forward lines, a 10-minute timer with a calm count (no alarm sound unless
   he taps "sound on"). Screen 4: "Did it pass?" Yes / No.
2. Signed in: file it through the Black Box store as a report, `wentThrough: false` for "yes, it passed",
   `true` for a slip, with the belief and need in the report's note fields (read `src/vice/types.ts` for the
   exact fields; add fields only with a migration and only if no existing field fits). Then show the Black Box
   link. Signed out: "Keep a record of these: free account" (P9).
3. Any timing claim on this screen ("most cravings pass within minutes") needs a checked source in the data
   file; otherwise say nothing about timing.

Acceptance: Playwright signed out and signed in (test account on the test stack, never the owner's); the
Black Box shows the filed report; undo works as for any report.

### Phase 6: the program, signed in (depends on 4, 5; owner's yes to the tables)

1. Migration `supabase/migrations/<timestamp>_quit_program.sql`, with row-level security (owner-only on rows
   with `user_id`):
   - `quit_plans` (id, user_id, vice_id, day1 date, unit_amount, unit_price_usd, minutes_per_unit, needs text[],
     belief_answers jsonb, moment_time time null, lesson_hour smallint, nudges_on bool, status
     'active'|'restarted'|'ended', created_at, deleted_at)
   - `quit_uses` (id, plan_id, user_id, at, need text): before day 1, each use logged with one tap (P18)
   - `quit_checkins` (id, plan_id, user_id, day smallint, difficulty smallint 0–10, belief_answers jsonb,
     used bool, created_at)
   - `quit_nudges_sent` (plan_id, kind, for_date, PRIMARY KEY all three)
   - `quit_funnel_counts` (day date, vice_id, step text, count int, PRIMARY KEY day+vice_id+step), written only
     by a `security definer` function the count route calls; no select for anyone but the service role.
   Repo: `src/db/quitRepo.ts` (all DB access there). Psql the migration on the test stack first (memory
   "integration tests without stack up"); live apply per memory "Live DB backup and apply", after the owner's yes.
2. Claim: on `/plan/quit-vice?claim=<addiction>`, read `quit-v1` from the browser, create the plan, start a
   Black Box run dated day 1 if none is running, clear the claimed part of `quit-v1`. Idempotent on reload.
3. A "Your quit plan" card on top of the Black Box page: day N of 90 (before day 1: "N days to go: log each
   use"), today's lesson, the +1 use button before day 1 with "what did it give you?" (needs chips), a
   "most vulnerable" line once 5+ uses are logged ("evenings, for relief": P18), "Craving now?", "I slipped".
   No streak counter (Black Box research verdict). Count clear days in total, never reset.
4. Lessons (P17): 3 before day 1 (observe, the 80% swaps, the one thing), daily days 1–14, then weekly to day
   90: 28 per addiction, each {id, day, beliefId, title, body ≤ 180 words, exercise ≤ 40 words, refs}. Written
   and checked like Phase 2. He picks the lesson hour at claim time (default 19:00).
5. Check-ins days 1, 15, 30, 60, 90: difficulty 0–10, re-rate his top 3 beliefs, used yes/no. Show him his own
   before/after belief ratings on day 30 and 90.
6. Slip: "I slipped" → Black Box lapse report (existing form) → "Go back through steps 1–3": re-run the belief
   test for his top 3, pick a new day 1 (chips as Phase 4). Old plan → `restarted`, new plan row. Words: every
   day kept was a complete success (his step 3); no "back to zero".
7. Nudges: `src/quit/nudgeClock.ts` `runQuitNudgeClock()`, called from the tick route beside the others,
   respecting quiet hours: evening before day 1 (20:00 local), morning of day 1, evening of day 3, the daily
   lesson at his hour, and, if he set `moment_time`, 30 minutes before it (P3). One row in `quit_nudges_sent`
   per send; a second tick never sends twice. Settings on the plan card turn each kind off.

Acceptance: integration tests for the repo and RLS (another user can't read a plan), the claim's idempotency,
the clock's no-double-send, quiet hours; unit tests for day counting across DST. Phone walk of a full fake
week on the test stack (clock driven by test hooks, never by waiting).

### Phase 7: coaching door, privacy page, funnel view (depends on 6)

1. Two doors on the start page, the curve result and the plan card: "Do it privately" (the program) and
   "Talk to a coach" (P14). Coaching page `/quit/coaching`: what 1:1 coaching is, the price from `offer.json`
   or "price in the reply", guarantee and donation lines only if set, the catch paragraph. Request form needs
   an account: what's hard (free text), which addiction, best times, contact email prefilled from the account.
   Stored in `quit_coaching_requests` (add to the Phase 6 migration if the owner's yes covered it; otherwise
   ask in the same message). On send, push to the owner's devices: "New coaching request (nicotine)". The
   request view for him lives under `/admin`.
2. Price help for the owner: research what 1:1 quit coaches and men's coaches charge (10+ real offers, with
   URLs, in USD), and write the range on his review page (Phase 8). He sets the numbers himself.
3. `/privacy`: plain page saying what is kept (account data, the quit plan, uses, check-ins, coaching requests),
   what is never kept (test answers before an account, IP addresses on counts), how to delete it (the Black Box
   already supports deletion; add "delete my quit plan" to the plan card). Link it from every quit page footer
   and from sign-up. Mark it as a draft the owner should read; it is not legal advice.
4. `/admin/quit-funnel`: a table per addiction of the last 30 days' counts per step, and each step as a share
   of `start`. Admin-only like the other admin pages.

Acceptance: a non-admin gets 404 on the admin views; a request reaches the owner's device on the test stack;
`/privacy` is linked from every quit page.

### Phase 8: prove it, then ship nicotine (depends on 3–7)

1. Phone walk on the Android emulator rig (memory "Android emulator rig") and Playwright at 390×844, light and
   dark: every screen of every tool, signed out and signed in. Fix what feels worse than it should
   (memory "review means feel, look, bugs").
2. Adversarial audit (memory "prove fixes adversarially"): three independent agents, each with one theme:
   (a) a signed-out reader trying to break the flow (back button, reload mid-test, two tabs, no storage,
   strange dates, huge numbers); (b) a signed-in user over a fake 90 days (slips, restarts, two devices,
   nudges, quiet hours); (c) privacy and security: can anyone read another man's plan, fill the counts with
   junk, get answers into a URL or a log. Each bug reproduced twice; then a code review and a security review
   of the fixes.
3. Owner review page (artifact): the nicotine screens as phone screenshots, each with 👍 and a note box
   (memory "review boards"), plus the coaching price research. Short: screens and exceptions only.
4. Ship: add nicotine to `live.json`, typecheck ratchet, push `main`, check the live site with a signed-out
   phone walk and `/api/healthz`'s build id.

Acceptance: audit findings fixed or written down as known; the review page link sent to the owner; nicotine
live at `/quit/nicotine`.

### Phase 9: the other addictions (depends on 8)

For each of **weed, porn, alcohol**: run Phase 2's recipe for its data file (import-v3 first; 7 new beliefs,
facts, needs, lessons), the validator, the two checkers and two critics, then a short phone walk and add it to
`live.json`. Alcohol only: the danger line (heavy daily drinkers see a doctor before stopping; seizures), small,
in the key-facts box and on the curve's first days, with its source; the craving tool's "slip" never suggests
drinking less instead of stopping. Porn: needs and swaps aimed at the dating half (link to Scenarios and
Tracking as swaps where they fit).

**Phone/scrolling**: first collect felt data the same way the four others were collected (see
`docs/research/addiction-one-pagers/README.md`, round 8, and the scripts in `~/.cache/daygame-research/one-pagers-v2/`),
from a quit-phone forum; if fewer than 300 usable posts exist, draw no curve and show "when the pull comes" by
hour from his own logged uses instead. Unit: hours a day; cost: hours and years.

Acceptance per addiction: as Phase 8 steps 1 and 4; one owner review page covering all three (exceptions only).

---

## Part 2: ground rules for the session that runs this

- **Shared working tree.** Other Claude sessions edit the same checkout. Build in a git worktree, commit with
  `git commit --only <paths>`, never `git add -A`, never `git stash`. Ship by fast-forwarding `main`.
- **`main` is the live site**; every push deploys. Push your own work without asking, but run
  `node scripts/typecheck-ratchet.mjs` and `npm test` first. Batch commits: about 60 pushes a day hits the
  host's deploy limit.
- **This Next.js differs from what you know.** Read the guide in `node_modules/next/dist/docs/` before using
  any routing, data, image or metadata API.
- **Mobile first.** Every screen at 390 px wide first; a screen is not done until it works on a phone.
- **Database**: all access through `src/db/*Repo.ts`. Test writes against the live database only inside
  `begin; … rollback;`. Never touch the owner's own rows.
- **Repo is public.** No forum quotes, no screenshots of other products, no product names of the companies the
  patterns came from, no book text, no personal data. Private material lives in `~/.cache/daygame-research/`.
- **Every number shows its basis** (who, how many, what was measured, what it does not mean) and carries its
  Counted tag. A number a writer agent found is not usable until a separate checker fetched its source.
- **Voice**: plain, short, edge, for the 98%. No screening questions, no sermon, no founder "I". Danger lines
  only where a source ties the risk to that addiction, small.
- **Money**: amounts in USD; never set a price; never sign up for, buy or enable anything that costs money.
  Use `research@example.com` for any API that asks for an email.
- **Owner reports** open with whether it is done, in plain words. Ask him only what is his to decide; decide
  the rest and say why.

## /goal prompts

- Phase 0–1: "/goal Run Plans/quit-tool.md Phases 0 and 1. Send the owner the three start items in one
  message first; build the quit data file, import script and validator in a worktree; tests green; commit."
- Phase 2: "/goal Run Plans/quit-tool.md Phase 2 for nicotine: writer, checker, second check, owner-lens critic,
  cold reader; validator passes with nicotine listed live; private drafts in ~/.cache/daygame-research/quit-tool/."
- Phases 3–5: "/goal Run Plans/quit-tool.md Phases 3, 4 and 5: start page, belief test, quit curve, craving tool,
  public, phone first; acceptance checks of each phase pass; push."
- Phases 6–7: "/goal Run Plans/quit-tool.md Phases 6 and 7 after the owner's yes to the tables: program, nudges,
  coaching door, privacy page, funnel view; acceptance checks pass; push."
- Phase 8: "/goal Run Plans/quit-tool.md Phase 8: phone walk, three-agent adversarial audit, reviews, owner
  review page with thumbs-up and notes, ship nicotine live."
- Phase 9: "/goal Run Plans/quit-tool.md Phase 9: weed, porn, alcohol by the Phase 2 recipe, then the phone
  research step."
