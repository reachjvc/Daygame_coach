# Life plan tables: what each table is, what it gives the user, and what is still open

**Status:** plan only, rewritten 2026-11-03 after the owner called the first version too expansive.
Waiting for the owner to say "execute".

## What you asked for (2026-11-03, your words)

> What could also work, is just that you now sort of create some sort of direct view of the tables, and
> tell me what that would create in terms of user functionality, what sort of open quetions u have etc.
> Before that, just read everything ive written that seems useful. It is also useful to use stefan james
> as a baseline because he is sort of describing the functionality that we want to implement.

Earlier the same day: the life plan has steps "we may want to shorten or rearrange", names like "season
focus, the one thing, goals, subgoals", some parts that do not "really work as intended", and a move from
the browser to the database with "a lot of mistakes". Your drawing (Users, AccessLevel, TimeEntry, Area,
Goal, SeasonFocus, NorthStar, GoalServesArea, GoalFeeds) is the shape to follow.

## What you are agreeing to

No money. Read-only: no app code, no database and none of your data is changed. One new file,
`Plans/life-plan-tables.md`, committed and pushed (it changes nothing on the site).

## Doubt first

- Your own messages from April to August 2026 no longer exist (deleted by Claude Code's automatic
  cleanup), and that is when most of the life plan was built. What survives: prompt history Feb–Mar 2026
  and chats from 25 Sep 2026 on, about 650 messages.
- I cannot read the live database's own layout (needs your database password; I will not ask). I use the
  database changes we wrote, which created every life plan table. Small risk: a change made by hand in
  Supabase would be missed.

## The result: `Plans/life-plan-tables.md`

1. **A view of the tables.** A diagram in your style (a Mermaid diagram: it draws itself on GitHub, and
   reads as text anywhere else), then a plain list of every table and its columns.
2. **Per group of tables** (north star; areas; goals and their parts; routines; season focus and the one
   thing; values; answers and journal; the day half):
   - what each column holds, in plain words, and what it links to;
   - **what it lets the user do**, and on which step of `/plan`;
   - **Stefan James's baseline**: what he teaches that this is for, with the video named;
   - **your words** about it, quoted and dated, if any;
   - **whether the app really writes it and reads it back**, from the code (not tried on the page).
3. **Open questions**, each with my recommendation. For example where a table does something nobody asked
   for and Stefan does not teach, where two tables seem to hold the same thing, where a name differs
   between screen, code and database, or where the tables cannot do what you described (one season focus
   spanning several areas).

## Steps

1. **Your words.** Read all ~650 messages you wrote, start to end, and keep everything about goals, the
   life plan and its parts. Quotes of you inside my old notes and commits count only when they are in
   quote marks, and are marked second-hand. My notes are never used as what you wanted.
2. **Stefan's baseline.** Use the extracted summaries in `~/.cache/lm-corpus/findings/` (goals, vision,
   routines, reviews, identity, purpose, onboarding) as an index, and confirm each point against his own
   transcripts in `~/.cache/lm-corpus/text/` (374 videos) before writing it down.
3. **The tables.** From `supabase/migrations/20260922100000_life_plan_tables.sql` and the later life plan
   migrations, plus `src/db/lifePlanRepo.ts`, `lifePlanDayRepo.ts`, `goalRepo.ts`, `lifeAnswerRepo.ts`,
   `lifeChapterRepo.ts`: the 25 `life_plan_*` tables, `life_answers`, `life_chapters`, and the parts of
   `user_goals` that `/plan` touches. For each, search the code for what writes it and what reads it.
4. **Write the file.** Check that every table is in it, and that every quote of you can be found again
   word for word.
5. **Commit and push, then report** in chat: the short version and the most important questions.

**Not in this plan:** clicking through the pages, testing saves, a web page, fixing anything. Those come
after you have read the result.

## Blocker, tried once

| What | Tried, and the result | Instead |
|---|---|---|
| Read the live database layout | `supabase db dump --linked --dry-run` → `ProjectRefNotLinkedError: Cannot find project ref. Have you run supabase link?`; reading `.env.local` was refused by the permission system | Use the migrations and the `src/db/` repos |

## Questions, each with a recommendation (taken if you say nothing)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Include the day half (Today, Journal, ratings, ticks)? | Yes, briefly: four tables, part of `/plan`. |
| Q2 | Include the older goals system (`user_goals`, L1/L2/L3, habit ramp)? | Only the parts `/plan` reads or writes. |
| Q3 | Notes from April–August somewhere else (claude.ai, phone)? | Go without; paste any you find and I add them. |
| Q4 | The quit-vice Black Box under `/plan/quit-vice`? | Leave it out; it is its own part of the app. |
