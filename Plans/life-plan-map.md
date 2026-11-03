# Life plan map: every element of the life plan, where it goes, and who asked for it

**Status:** plan only, written 2026-11-03. Nothing is built yet. Waiting for the owner's "go".
The same plan as a page: https://claude.ai/artifact/5mLSWcEa9Lw4H6c2GskUB6

**Written for** the owner first (Part 1), then for the AI session that carries it out (blockers,
questions, phases, Part 2, and the `/goal` prompt at the end).

**What this plan makes.** A map of the life plan at `/plan` (Life Mastery), like the box-and-line drawing
the owner made on 2026-11-03, but complete: every element, which step asks for it, where it is stored,
what reads it later, whether it works, and whether the owner ever asked for it. It changes no product
code. Shortening or rearranging the steps is the next plan, written after the owner has marked the map.

---

# PART 1 — In plain words

## What you asked for (2026-11-03, your words)

> I did something like this as a light example of the domain. I am now particularly interested in the
> tracker part of the website, specifically the life plan project. There are all these different steps,
> which we may want to shorten or rearrange. There are different names like season focus, the one thing,
> goals, subgoals etc. Some of it is sort of functional, while other things i dont believe really work as
> intended. I need you to help me by making something like this, but listing out every single element and
> where it goes. First, before doing that, I need you to make a plan on how you indtend to make it happen.
> I want you to read older documents about what i wanted exactly. Be careful in not reading your own
> interpretations or notes, but sticking to what ive requested specifically. If you think you can show me
> what the different tables and links are in a different way, then feel free to do it. Youve already
> started some of this work as we tried to change it from storing in the browser and onto the database
> itself, but i know that youve made a lot of mistakes and havent considered good programming principles.

Your drawing had these boxes: **Users** (Id, name, AccessLevelId), **AccessLevel** (Id, Name),
**TimeEntry** (id, UserId, DateStart, DateEnd, Navn), **Area** (livsområde, helbred, dating: Id, UserId,
Navn), **Goal** (Id, Navn, TargetDate), **SeasonFocus** (id, DateStart, DateEnd, GoalId), **NorthStar**
(id, UserId, Navn, DateStart, DateEnd), **GoalServesArea** (GoalID, AreaId) and **GoalFeeds** (GoalId,
FeedsGoalId). The map keeps that shape and fills it in for the real app.

## Doubt first: what I can and cannot prove about what you wanted

1. **Your own words are missing for April to August 2026, and that is when most of the life plan was
   built.** What survives: your prompt history from 2026-02-11 to 2026-03-11 (332 prompts, about the
   older goals setup), and our chats from 2026-09-25 until today (321 messages). The chats from
   April–August were deleted by Claude Code's automatic cleanup, and almost nothing was committed in
   those months (18 commits in total). So for many elements the honest answer will be "no record that
   you asked for this". I will write exactly that rather than guess.
2. **In the months I do have, you said little about the life plan's details.** Out of about 650 messages, the
   ones that describe what the life plan should be are mainly six Danish messages from 2026-10-23 (see
   below). The rest ask for it to be finished, made live, or given its own slice.
3. **Much of the life plan follows Stefan James's "Project Life Mastery" method**, from his videos. That
   is neither your words nor my interpretation; it is a third kind of source. The map labels it
   separately, so you can decide whether "it is in his method" counts as "I wanted it".
4. **I cannot read the live database's own description of itself.** The tool for it is not connected,
   and reading the file with the database address was refused (B1). The map uses the database changes
   we wrote ourselves, which created all 25 life plan tables, plus the code that reads and writes them.
   That is a good record, but it is not the database itself.

## What you said about the life plan, in your own words, so far

From 2026-10-23 (Danish, quoted exactly):

- "Men goal / project life mastery virker slet ikke færdigt ? … alle vil jo have en northstar, men man
  kan kun have én northstar af gangen, men flere over tid"
- "så når goals nu i mit rigtige projekt har undermål, systemer osv., så vil jeg ikke fjerne al
  kompleksiteten"
- "skal det hedde seasonFocusAreaID? der er jo også en end date osv. … skal det ikke bare hedde
  SeasonFocus med streg hen til areaID?"
- "et season fokus har også indbygget et mål. AreaId, her er der jo også flere områder (hver sit id),
  med flere mål. Et area kunne også have 2 mål, altså "stop weed" = noget der hjælper alle områder, men
  det kan også være season fokus samtidigt... ? det er i hvert fald sådan det skal være ultimativt."
- "men season fokus kan også være flere områder. Stop med at ryge weed = 3 områder ? Hvodan skal jeg
  tegne goalServesArea?"

Earlier, about the life plan as a whole: "go on with the tracking and project life mastery changes"
(2026-09-24); "can you make a path to the current test project life mastery pages, so its accessible on
the real website?" (2026-10-05); "how live is the project life mastery? it would need its own vertical
slice, an access point in the toolbar, etc." (2026-10-14); "building the life i wantin the long term uis  ultimately
what it shold do" (2026-10-15, about the whole site).

About the older goals setup (February–March 2026, before Life Mastery): life areas with preselected
goals, "higher level goals like "get married"", L1/L2/L3 goals, "milestones, habit ramps or … the curve
editor", and a guided tour. Whether any of that lives on in `/plan` is one of the things the map shows.

These are the first findings. Phase 1 reads every message, not only these.

## What you are agreeing to

- **Money: none.** Nothing is bought, rented or signed up for.
- **Your data: read, never changed.** The work only reads code and database structure. The pages are
  walked with the automatic test account, never yours. Anything written goes to that test account and
  is undone again.
- **What cannot be undone: nothing.** No product code changes. Two new files in `Plans/`, and one
  private web page.
- **What becomes visible to others: nothing, unless you share the link.** The map page quotes your own
  messages, including personal ones like the weed example. It is private to you.
- **Your marks.** The map page lets you mark each element Keep / Change / Cut / Unsure and write a note.
  The marks are saved with the page so that I can read them afterwards.

## What you will get

One private web page with five views, plus a written list in `Plans/life-plan-map.inventory.md` that
holds the same facts as text:

1. **The flow.** The 14 steps of `/plan` from left to right (north star, your 10s, the one thing, where
   to start, templates, systems, experiences, focus & season, values & identity, commit, track, today,
   journal, everything), each with the elements it asks you for.
2. **The tables and lines.** Your kind of drawing, complete: one box per table with every column, one
   line per link, lines routed around boxes, never through them. Each box is coloured by status.
3. **One example followed all the way.** "Stop smoking weed" (your example) traced through every step
   and every table it touches, so the links are seen in use instead of only drawn.
4. **Every element as a card**, with: what it is in plain words; the step that asks for it; where it is
   stored (database table and column, only in the browser, both, or nowhere); what reads it later;
   status (works / saves but nothing uses it / only in this browser / lost on reload / broken); and its
   source: **your words** (quoted, dated), **your words quoted in my old notes** (second-hand),
   **Stefan's method** (video cited), or **no source**. Plus where it breaks the rules below.
5. **Names that may mean the same thing.** For example season focus, focus & season and the one thing;
   goals in two different tables; subgoals, checkpoints, milestones and sub-steps. The map shows for
   each name what it really is in the code, so you can decide which names stay.

## The rules each element is checked against

Your own rules first, then the common ones. Nothing is fixed in this plan; the map only shows where an
element breaks a rule.

| Rule | Where it comes from |
|---|---|
| One home per fact. The same thing is not kept in two places. | You, 2026-10-01: "we prefer single source of truth" |
| Each part of the app owns its own tables (vertical slices). | You, 2026-10-01 |
| Nothing stored that nothing reads; nothing in the database that no page or endpoint uses. | Jacob, through you, 2026-10-24 |
| Keep the real depth: goals have subgoals and systems. | You, 2026-10-23: "vil ikke fjerne al kompleksiteten" |
| Many-to-many goes through a link table, like your GoalServesArea and GoalFeeds. | Your drawing |
| One name per thing, and the same name on the screen, in the code and in the database. | Common practice |
| The database itself enforces the links (a goal cannot point at an area that does not exist). | Common practice |
| The browser copy is only a spare copy; the account holds the truth. | The move to the database you mention |

---

# BLOCKERS — each attempted once

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Read the live database's own structure | `supabase db dump --linked --dry-run` returned `ProjectRefNotLinkedError: Cannot find project ref. Have you run supabase link?`. Linking needs the database password, which only the owner holds. Reading `.env.local` for the address was refused by the permission system. | Nothing essential | Use `supabase/migrations/20260922100000_life_plan_tables.sql` and the later life plan migrations (they created all 25 tables), plus `src/db/lifePlanRepo.ts`, `lifePlanDayRepo.ts`, `goalRepo.ts`, `lifeAnswerRepo.ts`, `lifeChapterRepo.ts`. Confirm by saving through the real page on the test account (Phase 3). Never ask the owner for the password. |
| B2 | The owner's own words from April–August 2026 | Listed every source. `~/.claude/projects/-home-jonaswsl-projects-daygame-coach/`: 51 chats, oldest 2026-09-25. `~/.claude/history.jsonl`: 332 prompts, 2026-02-11 to 2026-03-11. Windows side `/mnt/c/Users/jonas/.claude/projects/`: only the Jacob exercise (32 messages, no life plan words) and four scratch chats from October, none with life plan words. Git: 18 commits in April–August. Chats on claude.ai, if any, cannot be read from here. | Proof for the elements built in those months | Use second-hand quotes from old plans and commit messages, including the roughly 40 deleted goals and life plan files in git history, labelled "second-hand". Mark every element without a record "no source". Q1 asks the owner whether notes exist elsewhere. |
| B3 | Walk `/plan` signed in, without touching the owner's account | Found the test-account path: `tests/e2e/life-mastery-day-persists.spec.ts` signs in through `tests/e2e/fixtures/test` and seeds its own plan with `tests/e2e/helpers/lifePlan.ts` (`seedLifePlan`). Not run yet. | Phase 2 screenshots, Phase 3 status checks | Drive the page with Playwright through that same fixture and helper. If it cannot sign in, fall back to reading the code for that step and mark its status "not checked on the page". |

---

# OPEN QUESTIONS — each with a recommendation

The executing session takes the recommendation unless the owner answers otherwise.

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Do you have notes from April–August anywhere else (claude.ai chats, phone notes, a notebook)? | Proceed without; mark gaps "no source". If you find some, paste them and the map is updated. | Wait for the notes | Small. An element marked "no source" that you did ask for; your mark on the board corrects it. |
| Q2 | Does "it is in Stefan's method" count as "I wanted it"? | Keep it as its own label and let you decide per element on the board. | Count it as wanted | Medium. Counting it hides which parts you actually chose. |
| Q3 | Should the older goals system be in the map (the `user_goals` table, L1/L2/L3 goals, habit ramp, curve editor, nine test-only goal screens)? | Map in detail only what `/plan` reads or writes (`user_goals` and `life_answers` are both touched by `/plan`). The test-only screens get one line each, not element by element. | Map them all | Small. They are not in the product. |
| Q4 | Should the Black Box (quit a vice, at `/plan/quit-vice`) be included? | One box with its tables and the lines to the plan, no element cards. It is its own part of the app. | Full detail | Small. |
| Q5 | Should the day half (Today, Journal, ratings, ticks) be included? | Yes, in full. It lives inside `/plan` and on your account. | Leave it out | High if left out: much of "does it work" is there. |
| Q6 | Which language for the board? | English, the app's language. Your quotes stay in the language you wrote them in. | Danish | Small. |

---

# PHASES

Each phase records its evidence under its own heading in `Plans/life-plan-map.inventory.md`.

## Phase 0 — Set up (no product change)

- Create `Plans/life-plan-map.inventory.md` with headings for Phases 1–5.
- Re-run the message extraction into the session scratchpad: every owner message from the chats in
  `~/.claude/projects/-home-jonaswsl-projects-daygame-coach/*.jsonl` (type `user`, not a tool result, not
  a sidechain, system reminders and IDE selections stripped) plus `~/.claude/history.jsonl` (project
  `daygame-coach`), plus `/mnt/c/Users/jonas/.claude/projects/*/*.jsonl`.
- **Acceptance:** the count matches or exceeds the 653 found on 2026-11-03 (a few of those are tool text, not the owner; drop them), with the date range of each source written
  down.

## Phase 1 — What the owner asked for (sources A and B only)

Depends on Phase 0.

1. **Source A, the owner's own words.** Read every extracted message, start to end. Keyword
   search is not enough: on 2026-11-03 it missed messages that say "Life Mastery" without "goal". For
   each message that says anything about what the life plan, goals, areas, north star, season, the one
   thing, routines, values, the day half or the older goals setup should be or do, write one row: date,
   exact quote (original language), what element it is about. Pasted text counts as the owner's only
   when the owner introduced it as theirs or as Jacob's words (then label it "Jacob").
2. **Source B, the owner quoted in my notes.** Search commit messages (`git log --format=%B`) and every
   version of the plan files in git history, including the roughly 40 deleted goals and life mastery plans (list:
   `git log --diff-filter=D --name-only --format= -- docs`), for text that the note attributes to the
   owner in quote marks, or records as an owner decision ("user decision 2026-07-27" in
   `docs/plans/life-mastery-canon.md` is one). Copy the quote and the note's date and path. Everything
   else in those notes is my interpretation: it may be used to find where something is, never as proof
   of what the owner wanted.
3. **Source C, the method.** For each element, note whether it comes from Stefan James's videos, citing
   the entry in `src/goals/data/lifeMasteryCorpus.ts` (each entry names its video). Do not read the
   corpus as the owner's wish.
- **Acceptance:** a table of requests in the inventory file, every row with a date and an exact quote
  that can be found again with `grep` in the extracted messages or in git. A second pass searches the
  extracted messages for each element's names and finds no request missing from the table.

## Phase 2 — What exists (the elements)

Depends on Phase 0. Can run alongside Phase 1.

1. **Walk the page.** Start `npm run dev`, sign in as the test account (B3), seed a plan, and go through
   all 14 steps and every tab. Screenshot each. List every thing the page asks the user for or shows:
   each box, choice, slider, list, button that saves. That list is the set of elements.
2. **Trace each element to its home.** From the screen part in `src/goals/components/north-star/` to the
   service (`northStarService.ts`, `lifePlanMapper.ts`, `lifePlanSync.ts`, `lifePlanDayService.ts`,
   `oneThingService.ts` and the others), to the repo in `src/db/`, to the table and column. Or to a
   browser storage key (`north-star-v1`, `north-star-track-run`, `life-plan-imported-v1`, `lm-simple-v1`
   and any others found). Or to nowhere.
3. **The tables.** For each of the 25 tables in the life plan migrations (`life_plans`,
   `life_plan_nodes`, `life_plan_north_stars`, `life_plan_areas`, `life_plan_goals`,
   `life_plan_goal_checkpoints`, `_obstacles`, `_beliefs`, `_habits`, `_feeds`, `_serves`,
   `life_plan_routines`, `_routine_serves`, `_routine_steps`, `_step_serves`, `_routine_split_days`,
   `life_plan_experiences`, `_fields`, `_sub_steps`, `_values`, `_answers`, `life_plan_days`,
   `_day_ratings`, `_day_ticks`, `_day_journal`) and for `user_goals`, `life_answers`, `life_chapters`:
   every column, its type, every link (foreign key) and what happens to it when the thing it points at is
   deleted. Take these from the migrations, including later changes such as
   `20260923130000_season_focus_is_any_node.sql` and `20261016120300_life_plan_set_null_keeps_the_owner.sql`.
4. **Who reads it.** For each column and browser key, every place that reads it (later steps, tabs, the
   dashboard, other slices).
- **Acceptance:** every element on the screenshots has a row; every column of every table has a row;
  nothing in either list is left without a "stored in" and a "read by" answer (which may be "nothing").

## Phase 3 — Does it work (checked on the page, not in the code)

Depends on Phase 2.

For each element, on the test account: fill it in, reload, and open the same account in a second,
separate browser (as a second device would). Record what came back. Where needed, read the rows through
the app's own repo code inside `begin; … rollback;`, test account only.

Status labels: **works** (saves, survives reload and a second browser, and something uses it) /
**saves but nothing uses it** / **only in this browser** / **lost on reload** / **broken** (error, or
saves the wrong thing) / **not checked on the page** (only if B3 failed for that step, with the reason).

The known open gap from `docs/plans/life-mastery-everything-saves.md` (a second device sees the goals
but cannot count against them) is checked, not assumed.

- **Acceptance:** every element has a status and a sentence saying what was seen; each "broken" has a
  screenshot or the exact error.

## Phase 4 — Names and rules

Depends on Phases 1–3.

1. **Names.** List every name a user can see and every name in the code and the database. Group names
   that turn out to be the same thing, and split names that turn out to be two things. Start with:
   north star; your 10s, areas and the wheel; the one thing, season focus, focus & season, chapters;
   goals in `life_plan_goals` and in `user_goals`; subgoals, checkpoints, milestones, sub-steps and
   routine steps; systems and routines; "feeds" and "serves". Each group says what the code really does.
2. **Rules.** Check each element and each table against the rules table in Part 1. Write each break in
   plain words with the file and line, for example "the same goal is kept in two tables", "this column
   is written and never read", "this link is checked by code but not by the database".
3. **Against the owner's words.** Where the code differs from a Phase 1 quote, say so next to the quote.
   Example to check: the owner wants one season focus to span several areas and to have a goal built in;
   does the code allow that?
- **Acceptance:** every name in Phase 2's lists sits in exactly one group; every rule break names a file
  and line.

## Phase 5 — The board

Depends on Phase 4.

Build the private web page with the five views from "What you will get". The table drawing follows
Jacob's rule that the owner passed on: lines go around boxes, never through them. Each element card has
Keep / Change / Cut / Unsure buttons and a note field, saved in the page's own small database so the
next session can read the marks. It must work on a phone and in dark mode.

- **Acceptance:** every element and table from the inventory is on the board (count them both); the
  page is checked at phone width and in both colour modes from screenshots; a mark set on the board can
  be read back.

## Phase 6 — Independent check

Depends on Phase 5.

A fresh reviewer agent gets 20 elements picked at random and the code paths, not my conclusions. It
checks each element's stored-in, read-by and status against the code and the page, and each quote
against the extracted messages. Fix what it finds and say how many it found.

- **Acceptance:** the reviewer's findings and what was done with each are written in the inventory.

## Phase 7 — Hand over

Commit `Plans/life-plan-map.md` and `Plans/life-plan-map.inventory.md` with `git commit --only` and push.
Send the owner the board link with a short plain-words report: doubts first, then the count of elements
by status and by source, then the five biggest rule breaks. Stop there. Shortening or rearranging the
steps is the next plan, made after the owner's marks.

---

# PART 2 — Ground rules for the executing session

1. **Change no product code and no live data.** Only the two `Plans/` files and the board page.
2. **The test account only.** Never sign in as the owner, never read or write the owner's rows.
3. **Evidence of what the owner wanted is only source A or B, quoted exactly.** Old plans, code
   comments, `docs/product/map.md` and memory notes are where to look, never proof. When there is no
   record, write "no source".
4. **Check the thing itself.** A status comes from the page and the rows, not from a comment or a test
   name. This codebase's comments are often stale.
5. **Other sessions share this working tree.** Commit with `git commit --only <paths>`; never `git add -A`
   or `git stash`.
6. **Plain words to the owner**, doubt first, and show it on the board.

---

# `/goal` prompt

### All phases. Paste after `/goal`.

> Execute Plans/life-plan-map.md Phases 0 to 7 in order, following its Part 2 ground rules. Take the
> recommendation for every open question the owner has not answered. Record evidence under each phase
> heading in Plans/life-plan-map.inventory.md. Change no product code and no live data; use the test
> account only. Finish with the board link and a plain-words report, doubts first.
