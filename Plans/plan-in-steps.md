# Your plan, in steps: see it new, save it right, rebuild it as modules

Written 2026-11-18 from the owner's request: *"(1) I need to see what it looks like when a new user uses it …
without removing my data. (2) I need to make sure that data is actually saved correctly, in a sustainable,
secure and long-term oriented way … fully correctly. (3) I need to remake part of the plan, (3a) it cannot
have the labeling that it currently has … (3b) … too many steps, not sure what is missing or if it is
important. The fix is that i make the planning phase entirely modular, make it more into actual, sequential
steps and not one 'big' plan."*

**Status: written, nothing built.** The one ask is right below.

The facts come from three read-only checks run on 2026-11-18. Their reports are private, because they name
outside sources and this repo is public:

- **Walk:** a fresh account went through all of `/plan` on a 390 px phone screen. Report:
  `~/.cache/daygame-research/plan-steps/walk/report.md`, with 133 screenshots.
- **Data audit:** an audit of the save path, with proof tests and catalog-only queries against the live
  database. Report: `~/.cache/daygame-research/plan-steps/data-audit.md`.
- **Label inventory:** every visible word on `/plan`, checked against outside methods. Report:
  `~/.cache/daygame-research/plan-steps/labels.md`.

This plan does the `/plan` part of the private originality plan (`~/.cache/daygame-research/originality/plan.md`,
Phase 2, decisions Q1–Q4). The rest of that plan (repo private, lawyer hour, dating half) is untouched and
still waits for the owner's answers D1–D13.

---

## The one ask (answered once; then nothing stops for you until Phase 8)

| # | What | Recommendation | Undo? | Money? |
|---|---|---|---|---|
| Y1 | Go on Phases 1–8, including the live database changes they need. They **add** tables and columns, back up first, and delete nothing of yours | Yes | Yes | No |
| Y2 | **Your one action:** sign up once, in a private window, as your Gmail address with `+plantest` before the `@`. Gmail delivers that to your normal inbox. That account is the "brand-new user". Tell me when it exists | Yes. It shows you the new-user flow today, before any code changes | Delete the account | No |
| Y3 | A nightly backup of every plan and day table, encrypted, into your OneDrive folder (`daygame-backups/`). You pick a passphrase once by running one command I give you. Store it in your password manager | Yes | Yes | No. The paid alternative, Supabase daily backups at about $25/month, is not needed until a stranger's data is in the database |
| Y4 | Your 12 areas folded into your own 7 from February 2026: Dating & Daygame, Health & Appearance, Career & Finances, Social Life, Personal Growth, Lifestyle, Vices & Elimination. Everything you wrote is kept. The mapping is shown on the Phase 4 page before it runs | Yes | Yes, from the backup | No |
| Y5 | Parts **proposed to remove from the screens**, listed under "Proposed removals" below. What you wrote in them stays in a read-only "Earlier plan" page | Yes for all; veto any by number | Yes, from git and the backup | No |
| Y6 | Build this in **this** codebase now, although `Plans/platform.md` proposes a new one. The design, the words and the status logic are pure files that carry over | Yes | — | No |

### Proposed removals (Y5); your data in each is kept, read-only

The private label inventory traces each of these to an outside method:

1. Scoring each area 0–10 against a written "10", and the wheel drawn from it. This becomes "where you stand",
   in your own measures.
2. The four near-identical identity boxes on step 1. They become one direction text, plus an optional
   Identity module.
3. The morning-hour ritual items, and the morning questions in the routine library and the journal.
4. The "driving force" sections at the top of Everything, and the commit button with its sentence.
5. The words "the one thing" and its defining sentence. The season keeps its job: one aim for about 3 months.
6. The values ranking method. It becomes "pick up to 5, tap to order".
7. The review's fixed sections (score every area, magic moments, next outcomes). They become a short weekly
   check-in written fresh.
8. The goal card's checks: belief/desire scored 0–10 with "below a 7", the "I will easily…" sentence, the
   stacked reasons, and the reward plus stake.
9. The name "Life Mastery" wherever a user can see it (page title, ids in addresses), and the `/life-mastery`
   redirect.
10. The step-1 example lines, the "His usual answer" tooltip, and the quotes still shipped in the page code.

---

# PART 1 — in plain words

## What we found

**1. Seeing it as a new user.**
- A "preview" switch on your own account is **not safe**. The data audit proved this: the empty preview
  plan, compared against your real plan, sends all your goals as deletions, and the day save clears your
  history.
- The safe way is a **separate real account**. It has its own id, its own browser copy and its own rows,
  so nothing it does can reach yours.

**2. How it saves.**

What is right, checked against the live database:
- No user can read or change another user's plan. Row security is on for all 32 plan tables.
- The server takes the user from the sign-in, never from the browser.
- Each save is one locked transaction.
- The live database matches the 94 migrations exactly.

What is wrong, worst first:
- **No backups exist.** Supabase reports zero backups, and every delete is permanent. Deleting a goal also
  deletes every tick and number under it.
- **Unsaved work is thrown away silently** on the next load. The page tells you "your work is still here on
  this device" when the next reload will lose it.
- **A second tab or device goes stale.** Its edits are refused and then lost. A save that landed, but whose
  reply was lost, is wrongly reported as "changed on another device".
- **A brand-new account never saves its ticks, ratings, notes or journal** on its first visit.
- **One text that is too long** (for example a goal title over 500 characters) blocks every save after it.
  The only message is "Could not save your plan".
- **"Start over" wipes everything**, including the journal, with no undo.
- **The plan stays in the browser after you sign out.**
- **Saving waits 4 seconds after typing**, and Next and Done don't send it. In the walk, closing the browser
  2.5 seconds after filling the 12 areas lost all of them.

**3. The flow itself.**
- `/plan` is one 12-step plan. 8 steps build it, with about 190 fields and 1.5–2 hours of honest work.
  Nothing is required. The first screen is 12 step cards, not a question.
- The progress numbers contradict what you see. For example, "50 % · 0 of 7 ladder questions answered"
  appears with every box filled.
- Save status shows three ways at once. Some of the wording loops back on itself, for example "rank your
  values at step 6" shown on step 7.
- At 390 px the goal sheet runs off the screen, and some rows are cut off.
- Lines typed into Systems move to Experiences on their own.
- The words lean on outside methods well beyond the 10 items above. The private inventory has the full
  list, with what each word does for the user.

## What it becomes

**"Your plan" becomes a short list of modules.** Each module is one small job, done as a few screens in a
row, with one question per screen. It ends on a "done, here is what you made" screen. Then you are back on
the list, with the next module offered.

- **Core modules, in order.** Once they are done, Today works:
  1. Areas: which of your 7 matter now.
  2. Direction: where your life is going, in one text.
  3. This season: one aim, an end date, and the areas it serves.
  4. Goals for the season, 1–3 of them. Each is one of your goal kinds: by a date, a count to reach, a
     frequency to hold, always/never, or N things in N days.
  5. Weekly actions: what you do each week for each goal, and on which days. This fills Today.
  6. Weekly check-in: the day and time, and the reminder.
- **Extra modules, any time, any order:** Values, Identity and reasons, Experiences you want, What could stop
  you (with an if-then plan), Routines, Journal questions, Role models, Quit something.
- **One status rule.** It is computed from your data and shown everywhere: *Not started / Done / Needs a
  look (reason)*. Every "needs a look" line is one tap from the exact screen that fixes it. Each module says
  in one line what you get from it, so you can tell what matters.
- **Today, Track, Journal and Check-in stay** as the daily and weekly side. Their wording is rewritten.
- **New words throughout.** They are written by a writer who never sees the outside sources or the current
  labels, only the job each word does and your own words. Then a checker who does see the sources flags
  anything close. Your own labels stay: North star, Season, Systems, Track, Today, Journal, Review.

Names above are working names. The real ones come from the writer in Phase 4.

## The owner's concept, item by item (`docs/product/life-mastery-concept.md`)

| Items | Where they live |
|---|---|
| 1–8, 13–15, 27 (goal kinds, dates, frequencies, ladders, a list in N days) | Core 4 Goals |
| 9–10, 19–20 (why, identity, experiences) | Extra: Identity and reasons, Experiences |
| 11–12, 16, 22, 26 (systems, routines, links, achievements) | Core 5 Weekly actions, Extra Routines; achievements stay automatic |
| 17–18 (areas, rating them) | Core 1 Areas, with your own measures; the 0–10 "your 10" form goes (Y5.1) |
| 21, 34 (constant tracking, judging your own effort) | Today (your own fields), Core 6 check-in |
| 24 (north star, season focus, priorities) | Core 2, Core 3 |
| 28, 31 (values, which matter most) | Extra Values |
| 32 (celebrating) | The check-in's "one win", plus achievements |
| 33 (what could stop you, if-then) | Extra: What could stop you |
| 23, 25, 29, 30 (automating the chain, framing) | The status rule and the suggested next module; no AI in this plan |

---

# BLOCKERS (each tried once on 2026-11-18)

| ID | What | Tried, and what came back | Blocks | Plan |
|---|---|---|---|---|
| B1 | A test account needs creating | Reading `.env.local` (service key) was refused by the permission system | Phase 1 | You sign up yourself (Y2). No key needed |
| B2 | Somewhere off this PC for backups | `/mnt/c/Users/jonas/OneDrive/` exists and syncs (OneDrive settings: `Personal`, `Business1`). `age` is not installed; `gpg` is. The systemd user session is running | Phase 2 | gpg public-key encryption, so the nightly job needs no passphrase. Your passphrase protects the private key (Y3) |
| B3 | No database backups | `supabase backups list` returned `"pitr_enabled":false,"backups":[]` (free plan) | Phase 2 | Own nightly export, plus in-database snapshots |
| B4 | Other sessions on `/plan` | `git log --since=2026-11-14` on the plan files: no commits. `Plans/site-navigation-build.md` Phases 5–6 (address renames) wait for the owner | — | Re-check `git log` before each phase. If navigation Phase 5 starts, rebase on it |
| B5 | Words must not come from the sources | I (the planning session) have read the private inventory, so I must not write the new words | Phase 4 | A fresh writer agent with no repo or cache access. It gets only the job spec |
| B6 | Phone checks | The emulator rig `~/.cache/daygame-research/alpha/phone.sh` exists | Phases 5–8 | Use it; `phone.sh stop` after |
| B7 | Deploy rate limit (about 60 pushes a day) | Memory, 2026-11-11 | All | Batch commits; one push per finished step |

# DECISIONS I TOOK (vetoable; say the number)

| # | Decision | Why |
|---|---|---|
| D1 | "As a new user" = a real second account, plus a **Reset this test account** button, never a mode on your account | A preview on your own account proved destructive (data audit Q6). A real account also tests the real save path |
| D2 | Order: **safety first** (backups, then the save fixes), then the rebuild | The rebuild migrates your data (Y4), and that needs a restorable backup and a save path that doesn't lose work |
| D3 | Pull the saving out of `NorthStarFlow.tsx` (126 KB) into one plan store (`src/goals/planStore/`) used by the old flow now and the modules later | The fixes are made once, and the rebuild reuses them instead of redoing them |
| D4 | Removed plan parts are **archived**, not deleted. Day history no longer cascades away when a goal goes | You asked for long-term. A deleted goal must not erase the ticks you logged |
| D5 | The status rule is one pure function, `planStatus(plan) → per module: state, reasons, link`, with unit tests | It is the single answer to "what is missing, does it matter", so the numbers can't contradict each other again |
| D6 | One question per screen, Next saves at once, no 4-second wait | The walk lost 12 areas in the wait. Phone first |
| D7 | Words written clean-room (B5), then checked against the private inventory | Your originality direction of 2026-11-11 |
| D8 | The old 12-step flow stays reachable at `/plan/earlier` (read-only) until you say it can go | Nothing is removed until you say so |
| D9 | No AI in the new flow | Out of scope. It can be added to a module later |

---

# PHASES

Models (owner, 2026-11-18): planning, specs, design, words and review gates on **Opus**. Building and phone
walks on **Sonnet** (`claude --model sonnet`, subagents `model: "sonnet"`). Mechanical checks on **Haiku**.
A build step that needs a decision this plan does not make writes the question under "Questions from the
build" at the end of this file, and then carries on with the next step.

## Phase 1 — The brand-new-user account (Sonnet; needs Y1, Y2)

1.1 Back up your plan by hand first (`json_agg` per table, method in memory `live-db-backup-method`), into
    `~/dg-backups/life-plan-2026-11-18-before-plan-in-steps.json`.
1.2 Migration: table `plan_test_accounts (user_id uuid primary key references auth.users on delete cascade,
    added_at timestamptz default now())`. RLS on. A `select` policy for your own row only. No write policy
    (service role only). Insert the `+plantest` account's id.
1.3 Route `POST /api/plan-test/reset`. The session's user must be in `plan_test_accounts`; anyone else gets
    403. It deletes that user's `life_plans` row (the cascades take the rest) and its reminders. It
    returns the list of cleared browser keys. The client then clears `north-star-v1:<id>`,
    `plan-due-hidden:<id>` and any other `<id>`-keyed plan key.
1.4 Settings shows a card "Test account: start over as brand new" **only** when the route says the account is
    a test account. Your account never sees it (unit test plus e2e).
1.5 *Check:* on the live site, as the test account: reset, then `/plan` shows the first-visit screen. Your
    plan's row counts are unchanged before and after (read-only count query).

## Phase 2 — The safety net (Sonnet; needs Y1, Y3)

2.1 `tools/plan-backup.sh`: `json_agg` export of every `life_plan*` table plus the day tables and reminders,
    all users. Encrypted with `gpg --encrypt -r daygame-backup`. Written to `~/dg-backups/nightly/` and
    `/mnt/c/Users/jonas/OneDrive/daygame-backups/`. Keeps 30 dailies and 12 monthlies. A systemd user
    timer runs it at 03:00 with `Persistent=true`, so a missed night runs at the next start.
2.2 Key setup script for you (Y3). One command; it asks your passphrase twice. The private key goes to
    `~/.gnupg` and a passphrase-protected copy to OneDrive.
2.3 `scripts/restore-life-plan.ts`, modelled on `scripts/restore-timetrack.ts`. It restores one user or
    all users into a target database. It is **run once for real**: into the local test stack, then
    compared row by row with the source.
2.4 Migration: `life_plan_snapshots (user_id, taken_at, reason, plan jsonb)`. The save function writes one
    before any save that removes rows, and before Start over. Snapshots are kept for 30 days.
2.5 *Check:* tonight's run lands in both folders. Decrypting needs the passphrase. The restore test passes.

## Phase 3 — Saving that never loses work (Sonnet builds, Opus reviews; needs Y1)

Fix list from the data audit, in its order. The proof tests in `~/.cache/daygame-research/plan-steps/proof/`
become repo tests first; they are synthetic, with no private data.

3.1 **The plan store (D3).** Move load, diff, save, status and the leave-hook out of `NorthStarFlow.tsx`
    into `src/goals/planStore/`. Behaviour is unchanged. All the existing tests must stay green.
3.2 **First visit saves its day.** In `start-empty` (`NorthStarFlow.tsx:774-777`), set the day baseline to
    an empty record when the day read succeeded. Add an e2e test on a fresh account that only ticks.
3.3 **Save now.** Next, Done, closing a sheet and `visibilitychange`/`pagehide` flush at once. Saves of
    any size use `keepalive` (split above 60 KB). The leave-hook stays armed while a save is open
    (`NorthStarFlow.tsx:851/858`).
3.4 **Outbox.** Unsent changes are kept per user (IndexedDB), with their base revision and a change id. On
    load they are replayed: sent directly if nothing moved, re-diffed if the account moved. You are asked
    only when the same row changed in both places. Nothing is dropped silently. Until this lands, the two
    misleading messages (`lifePlanSync.ts:279,281`) say the truth.
3.5 **Idempotent retry and rebase.** Each save carries its change id, held in a table of applied ids for
    7 days, so a retry of a save that landed answers "done". On 409, fetch, re-diff and re-apply. The
    plan is re-read when the tab gets focus back.
3.6 **Limits that name the field.** One `src/goals/planLimits.ts` holds the database's CHECK limits. It is
    used by every input (maxLength, plus a counter near the end) and by a server check (zod) that answers
    422 with e.g. "Goal title: 612 of 500 characters". Caps go on `asked`, `reasons_list`, `days`, `ladder`
    and `ramp_steps`.
3.7 **One save indicator:** Saved / Saving… / Not saved – Retry / Updating from another device, plus the
    count of changes waiting. The other two signals go.
3.8 **Database hardening (migration):**
    - Soft delete (`archived_at`) on goals, areas, routines, steps and values.
    - Day-history foreign keys stop cascading; the parts are archived instead.
    - The save function requires each row's `plan_id = v_plan_id`.
    - `user_id`/`plan_id` indexes on every child table and on the cascade columns.
    - `(select auth.uid())` in policies.
    - Start over: takes a snapshot, keeps the journal, stamps `cleared_at` so an old browser copy is never
      re-imported.
    - Values and answers get stable ids and are diffed like the rest.
3.9 **Sign-out clears** the `north-star-v1:*` and `plan-due-hidden:*` keys and the outbox.
3.10 **"Download my plan"** in Settings: one JSON file built from `readLifePlan` + `readDayRows`.
3.11 *Check:* e2e for each loss path the audit names: two tabs, offline then online, a lost reply, close
     during a save, a too-long title, a fresh account, Start over. An Opus adversarial review of the
     diff. A phone walk of the everyday edits (memory `review-means-feel-look-bugs`).

## Phase 4 — The design and the words (Opus; can run during Phases 2–3)

4.1 **Job spec** from your words only:
    - the concept items;
    - your board notes;
    - your February areas and goal graph (`c867fbc9`, `4e073e02`);
    - the walk report's confusion list;
    - the "job" column of the private inventory, which describes jobs, not words.

    For every module, the spec lists its screens, the one question each screen asks, which fields are
    required for Done, which are optional, the status reasons, and the existing table and column each
    answer is saved to.
4.2 **Writer** (a fresh Opus agent, no repo or cache access, given only 4.1): every visible word.
    **Checker** (an Opus agent with the private inventory): flags anything close. Fixes loop until
    nothing is flagged.
4.3 **The 12-to-7 mapping** of your areas, goals and ratings (Y4), as a table.
4.4 **One short phone-width mock page** (Artifact): the plan home, Core 4 screen by screen, the status
    lines, and the 12-to-7 mapping. Thumbs-up and notes on every block (memory `review-boards-note-log`).
    You look when you like. The build does not wait for your marks; notes left by then are applied.

## Phase 5 — Plan home and the core modules (Sonnet; depends on 3, 4)

5.1 `planStatus()` (D5) with unit tests for every reason.
5.2 The plan home at `/plan`: Next up, Core, Extra, the status chips, deep links (`/plan/<module>/<screen>`).
5.3 Core modules 1–6 as short screen sequences on the plan store. One question per screen, Next saves, then
    a Done summary with "Change" per answer.
5.4 Landing: Today once Core 5 has an action (the `planIsInUse` rule, kept).
5.5 *Check:* the test account goes from nothing to Today at 390 px in under 15 minutes of honest typing.
    No horizontal overflow on any screen. Every status reason has a working one-tap link.

## Phase 6 — Extra modules and the daily side (Sonnet; depends on 5)

6.1 The Extra modules (Values, Identity and reasons, Experiences, What could stop you, Routines, Journal
    questions, Role models, Quit something) on the same pattern.
6.2 Today, Track, Journal and Check-in in the new words. The weekly check-in replaces the review's fixed
    sections (Y5.7). The reminder text is rewritten.
6.3 *Check:* a phone walk of a full week on the test account. The check-in reads the week back.

## Phase 7 — Your data into the new shape (Sonnet runs it, Opus checks it; needs Y4, Y5)

7.1 A fresh backup. A migration that folds your 12 areas into 7 per the 4.3 table. Goals and routines are
    re-pointed; ratings are kept as history.
7.2 `/plan/earlier`: a read-only page of everything from the removed parts (D8, Y5).
7.3 *Check:* every row from before is either in the new plan or on the earlier page (a count per table).
    Your Today still shows your current week.

## Phase 8 — Prove it, then show you (Opus audit, Sonnet walks)

8.1 A 5-agent adversarial audit (memory `prove-fixes-with-adversarial-audit`): loss, leak, phone layout,
    words (the checker again) and the new-user flow. Fix and repeat until a round finds nothing serious.
8.2 Before/after phone screenshots, on the test account and on yours (read-only), on one short page.
8.3 You use it. "Built/live", never "done", until you have looked. Removing the old 12-step code waits for
    your word (D8).

---

# PART 2 — rules for the build sessions

- Shared checkout: build in a worktree under `~/.cache/daygame-research/plan-steps/` (not /tmp). Ship by
  ff-merge, `git commit --only <paths>`, batched pushes. `npm run build` keeps `--webpack`.
- Run `npm run typecheck-ratchet` before every push. Stop the dev servers before typecheck or a full
  vitest run.
- Live database: a `json_agg` backup before every migration. Test writes go inside `begin; … rollback;`.
  Never read your plan's text; counts only.
- No outside source names, quotes or video ids in the repo, commits or the live database.
- Phone first: every screen at 390 px before desktop.
- Each phase ends with its check run for real, and a status line at the top of this file.

`/goal Execute Plans/plan-in-steps.md phase by phase. Read it fully and the owner's answers to Y1–Y6 first. Follow Part 2. Build steps on Sonnet subagents, review gates on Opus. Stop only for an item the owner has not answered.`

## Questions from the build

(none yet)
