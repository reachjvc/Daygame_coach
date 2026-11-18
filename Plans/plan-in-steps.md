# Your plan, in steps: a new version built beside the old one, on a copy of real data

Written 2026-11-18 from the owner's request: *"(1) I need to see what it looks like when a new user uses it …
without removing my data. (2) I need to make sure that data is actually saved correctly, in a sustainable,
secure and long-term oriented way … fully correctly. (3) I need to remake part of the plan, (3a) it cannot
have the labeling that it currently has, where it is too close to tony robbins, (3b) … too many steps, not
sure what is missing or if it is important. The fix is that i make the planning phase entirely modular, make
it more into actual, sequential steps and not one 'big' plan."*

His answers the same day, which shape everything below:
- *"it needs to actually be this big. I think the tool has some real value, but we must make it easier to
  use."*
- *"show me fully what it looks like, with real clickability on the test pages or whereever else you want to,
  with my real data. I.e. do not change what it is today, or disrupt the data, but rebuild it in a new way."*
- Y1 yes. Y2: "can u not just sign me up". Y3 yes: backups on his OneDrive. Y4: "we need to recreate the
  areas, but i need to look them over again and decide". Y5: asked what the 10 were (answered in chat).
  Y6 yes.

**Status:**
- **Phase 3 built** on branch `plan-p3` (not merged). Known and left for the Phase 5 outbox: an edit typed
  during an open save is still lost on a hard close (the browser kills the page before that save lands),
  and a copy of the plan kept in the browser can still be dropped on the next load when the account holds a
  newer plan (items 3 and 6 of the Opus review).
- **Phase 1 live** on 2026-11-18 (`02278590`):
  - The first backup is in `~/dg-backups/nightly/` and OneDrive: 32 tables, 2,231 rows, 4 accounts.
  - The nightly timer runs at 03:00.
  - The restore was proved against the local stack.
  - Recovering the key from OneDrive into a clean keyring works, and a wrong passphrase is refused.
- **Phase 6 live** on 2026-11-18 (`97127775`) at `/plan/new`, on the copy space:
  - The plan home and Core modules 1–6, built on `planStatus()` and the `usePlanStore()` interface.
  - The owner's eight areas are the default, with the "Switch areas" fold on the copy.
  - The extra modules show "Coming soon". Today, Track and Journal link to `/plan/sandbox`.
  - The owner's real row counts are unchanged after his first copy-space visit (927/927).
- **Phase 3 live** on 2026-11-18 (`55d50455`):
  - Two Opus review rounds; the must-fix items were fixed. Plan e2e 39/39.
  - Still open, for Phase 5: an edit typed during an open save is lost on a hard close, and a start-empty
    import that stops partway can drop the rest. The second review's low findings 2–9 are noted in the
    review output.
- **Not ours, found on the way:**
  - `npm audit`: Next 16.4.1 has two moderate advisories (`use cache`/`unstable_cache`, which the app does
    not use; fixed in 16.4.6).
  - High: `zod`, `undici`, `sharp`, `@huggingface/transformers`.
  - The dependency upgrade is the owner's call.
- **Phase 4:**
  - 4.1 job spec written (private, `spec/job-spec.md`). All 171 old jobs have a home: 93 kept, 26 in a new
    form, 52 replaced by original forms.
  - 4.3 areas page published 2026-11-18: https://claude.ai/artifact/WzWoej19QPwSe42fXk5YBY. Its database
    holds `pick/choice` and `notes`/`likes` per block. Read it before applying areas.
  - **Areas decided** on 2026-11-18 from his marks on the page:
    - His note on the twelve-to-seven table: "mostly right", except Emotions. In his words: *"'emotions'
      i think this one could be named something like 'feeling about life' … Ultimately, i want to live a
      life that feels great, so it seems like this should be tracked"*.
    - He liked "One list for the whole app".
    - Read as option A plus his change. The eight areas, in order: Dating & Daygame, Health & Appearance,
      Career & Finances, Social Life, Personal Growth, **Feeling about life**, Lifestyle,
      Vices & Elimination.
    - Feeling about life gets a daily rating on Today; this is his concept item 21.
    - He saved no radio pick; the recommendation counts.
  - 4.2 words written by a writer who saw no sources (private, `spec/words.md`). After two checker rounds:
    0 must-change. Builder rules are in `spec/builder-notes.md`.
- **Phase 2 live** on 2026-11-18 (`4f9128e4`):
  - The migration `20261118120000_plan_sandboxes` is applied, and the owner's row is inserted.
  - An Opus security review found 1 high, 2 medium and 5 low findings. All were fixed, including H1: the
    address bar must stay on `/plan/sandbox`.
  - Tests: e2e 27/27 (including the normal-/plan specs), integration 16/16.
  - The owner's real row counts before first use (32 tables, 927 rows) are in
    `~/.cache/daygame-research/plan-steps/owner-counts-before.json`, made with `live/counts.py`.

## Where the facts come from

Three read-only checks ran on 2026-11-18. Their reports are private, because they name outside sources and
this repo is public:
- **Walk:** a fresh account went through all of `/plan` at 390 px. `~/.cache/daygame-research/plan-steps/walk/report.md`,
  with 133 screenshots.
- **Data audit:** the save path, with proof tests and catalog-only live queries. `~/.cache/daygame-research/plan-steps/data-audit.md`.
- **Label inventory:** every visible word, checked against outside methods, with the job each word does.
  `~/.cache/daygame-research/plan-steps/labels.md`.

This plan carries out the `/plan` part of the private originality plan (`~/.cache/daygame-research/originality/plan.md`,
Phase 2). The rest of that plan still waits for his answers to D1–D13.

---

# PART 1 — in plain words

## The shape

- **Today's `/plan` keeps working exactly as it is, on his real data.** Its look does not change. It gets
  only invisible fixes that stop it losing work (Phase 3).
- **A copy space.** A hidden second account, owned by his account, holds a **copy** of his real plan and
  days. He never signs in to it. He opens it from his own account, and the server does the work for him.
  Two buttons:
  - **Copy my real plan in again**: replaces the copy with fresh data from his account;
  - **Start as a brand-new user**: empties the copy.
- **Two things run on the copy:**
  - `/plan/sandbox` is today's flow, so he can see it as a new user, or play with his data without risk.
  - `/plan/new` is the new version. He clicks through it fully on his copied data, on the phone, and every
    save is real but lands in the copy.
- **His real data is never written by either page.** The copy is a different account, so row security keeps
  them apart. A preview switch on his own account was proved destructive by the data audit, so it is never
  built.
- **When he says the new version is better (Phase 9, his word only),** his real account moves onto it, and
  the areas he decides on are applied. The old flow stays readable at `/plan/earlier`.

## The new version: same depth, easier

**Nothing gets smaller.** Every job the old flow does keeps a home in the new one. What changes:

- **Modules, not one big plan.** Each module is one job, done as a short run of screens with one question
  per screen. It ends on a "done, here is what you made" screen, and then the next module is offered.
- **Core modules first, in a set order.** Once they are done, Today works. Then the deeper **extra
  modules**, any time, in any order.
- **One status rule, computed from the data:** *Not started / Done / Needs a look (why)*.
  - Each "needs a look" is one tap from the screen that fixes it.
  - Each module says in one line what it gives you, so you can tell what matters.
- **New words and new forms** wherever the old ones trace to outside methods. They are written by a writer
  who never sees the sources or the current labels; a checker who does see them flags anything close. His
  own labels stay: North star, Season, Systems, Track, Today, Journal, Review.
- **Areas: he decides** (Y4). Phase 4 shows him options on one short page. Until then the copy keeps his
  current 12.

Working module list (the Phase 4 spec settles it; names come from the writer):

| Core, in order | Extra, any order |
|---|---|
| 1 Areas · 2 Direction · 3 This season · 4 Goals for the season · 5 Weekly actions · 6 Weekly check-in | Where you stand per area · Values · Identity and reasons · Experiences you want · What could stop you (if-then) · Routines · Journal questions · Role models · Quit something · Daily self-ratings |

## What changes for saving (his item 2)

The data audit's verdict:
- **Right:** no user can reach another's data (row security on all 32 plan tables, the user taken from the
  sign-in, one locked transaction per save), and the live database matches the 94 migrations.
- **Wrong:**
  - no backups at all;
  - unsaved work silently dropped on reload;
  - a second tab or device goes stale and loses its edits;
  - a new account's first-visit ticks never saved;
  - one too-long text blocks all saving;
  - Start over wipes the journal;
  - the plan is left in the browser after sign-out;
  - a 4-second wait before saving, in which the walk lost 12 areas.

The fix comes in three layers:
- **Backups now (Phase 1).**
- **Small invisible fixes to today's flow (Phase 3).**
- **A save engine built right for the new version (Phase 5).** Every change is queued until the server
  confirms it, a retry never double-applies or claims a false conflict, limits name the field, and there is
  one save indicator. Removed parts are archived, not deleted, and history is never cascaded away.

## The owner's concept, item by item (`docs/product/life-mastery-concept.md`)

| Items | Home in the new version |
|---|---|
| 1–8, 13–15, 27 (goal kinds, dates, frequencies, ladders, a list in N days) | Core 4 Goals |
| 9–10, 19–20 (why, identity, experiences) | Extra: Identity and reasons, Experiences |
| 11–12, 16, 22, 26 (systems, routines, links, achievements) | Core 5, Extra Routines; achievements stay automatic |
| 17–18 (areas and rating them) | Core 1 Areas (his decision), Extra Where you stand, in new forms |
| 21, 34 (constant tracking, judging your own effort) | Today, Extra Daily self-ratings, Core 6 check-in |
| 24 (north star, season, priorities) | Core 2, Core 3 |
| 28, 31 (values, which matter most) | Extra Values |
| 32 (celebrating) | The check-in, plus achievements |
| 33 (what could stop you, if-then) | Extra: What could stop you |
| 23, 25, 29, 30 (automating the chain, framing) | The status rule and the suggested next module; no AI in this plan |

---

# BLOCKERS (each tried once on 2026-11-18)

| ID | What | Tried, and what came back | Plan |
|---|---|---|---|
| B1 | Creating accounts needs the service key | Reading `.env.local` was refused by the permission system. The live server has the key (`src/db/supabase.ts`) | The server creates the copy account itself, on his first click. No key on this machine, no sign-up for him |
| B2 | No owner/admin concept in the code | `/admin/ai-usage` is guarded by a key in the browser, not by an account | One row in `plan_sandboxes` names his account. Every other account gets 404 |
| B3 | Plan ids are global UUIDs (`20260922100000_life_plan_tables.sql`) | — | Copying remaps every id consistently, and is proved with a count per table plus a content-equality check |
| B4 | Somewhere off this PC for backups | `/mnt/c/Users/jonas/OneDrive/` syncs. `gpg` is installed, `age` is not. The systemd user session runs | gpg public-key encryption, so the nightly job needs no passphrase |
| B5 | No database backups | `supabase backups list`: `"pitr_enabled":false,"backups":[]` | Phase 1 |
| B6 | New words must not come from the sources | The planning session has read the private inventory | A fresh writer agent with no repo or cache access (Phase 4) |
| B7 | Other sessions on `/plan` | No commits to the plan files since 2026-11-14. Navigation Phases 5–6 (address renames) wait for him | Re-check `git log` before each phase |
| B8 | Deploy rate limit (about 60 pushes a day) | Memory, 2026-11-11 | Batch commits |

# DECISIONS I TOOK (vetoable; say the number)

| # | Decision | Why |
|---|---|---|
| D1 | The copy is a hidden second account that his account owns. The server acts as that account under row security, with a sign-in made on the server that never reaches the browser. The client never names a user id | Isolation comes from the database, not from care in the code. The existing repo code works unchanged |
| D2 | Backups hold every account that has a plan, encrypted to a key only his passphrase unlocks. When strangers sign up, backups move to Supabase's own (paid, his decision then) and leave OneDrive | Today the accounts are his and test accounts. Encrypted, OneDrive sees nothing |
| D3 | The backup passphrase is generated, shown to him once and kept in a 600-mode file here. He stores it in his password manager. The passphrase-protected private key goes to OneDrive too | Restoring after losing this PC needs only OneDrive and the passphrase. No terminal work for him |
| D4 | Today's flow gets only fixes that don't change how it looks or behaves (Phase 3). The big save engine is built for the new version | His words: don't change what it is today |
| D5 | The status rule is one pure function, `planStatus(plan)`, with tests | The single answer to "what is missing, does it matter" |
| D6 | One question per screen; Next saves at once | Phone first. The walk lost 12 areas in the 4-second wait |
| D7 | The copy account sends no reminders and no pushes, and is left out of every cron | A copy must not ping his phone |
| D8 | No AI in the new flow | Out of scope; a module can get it later |

---

# PHASES

Models (owner, 2026-11-18): planning, specs, design, words and review gates on **Opus**. Building and phone
walks on **Sonnet**. Mechanical checks on **Haiku**. A build step that needs a decision this plan does not
make writes it under "Questions from the build", then carries on.

## Phase 1 — Backups (Sonnet)

1.1 `tools/plan-backup.sh`:
    - a `json_agg` export of every `life_plan*` table, the day tables and the reminders, for every account
      that has a plan;
    - encrypted with `gpg --encrypt -r <backup key>`;
    - written to `~/dg-backups/nightly/` and `/mnt/c/Users/jonas/OneDrive/daygame-backups/`;
    - keeps 30 dailies and 12 monthlies;
    - run by a systemd user timer at 03:00 with `Persistent=true`.
1.2 The key (D3). The passphrase is in `~/.cache/daygame-research/plan-steps/backup-passphrase.txt`
    (mode 600). The protected private key is also copied to OneDrive.
1.3 `scripts/restore-life-plan.ts` (modelled on `scripts/restore-timetrack.ts`). It restores one account or
    all of them into a target database, optionally under a different user id (the same id remap as 2.4).
    **Run once for real** into the local test stack and compared row by row.
1.4 *Check:* the first run is in both folders. It decrypts only with the passphrase. The restore test passes.

## Phase 2 — The copy space (Sonnet builds, Opus security review)

2.1 A fresh `json_agg` backup of his plan by hand, into `~/dg-backups/`.
2.2 Migration: `plan_sandboxes`:
    - `owner_id uuid primary key references auth.users on delete cascade`;
    - `sandbox_user_id uuid unique references auth.users on delete cascade`;
    - `created_at`.
    RLS on; select only your own row; no write policy. One row inserted for his account, with
    `sandbox_user_id` null.
2.3 `src/db/planSandbox.ts`, `resolvePlanTarget(session, "self" | "sandbox")`:
    - For "sandbox": look up the session user's row and create the hidden user on first use (admin API,
      `@sandbox.invalid` address, no password).
    - Make a server-side session for it, and return a Supabase client acting as that user.
    - No row: 404. The token never leaves the server.
2.4 Copy: read his plan and days with his own client, remap every id, and write them with the sandbox's
    client through the existing import and day paths. Reminders are copied switched off (D7).
    Reset: delete the sandbox's `life_plans` row; the cascades do the rest.
2.5 Routes: `POST /api/plan-sandbox/copy`, `POST /api/plan-sandbox/reset`, plus `?target=sandbox` on
    `/api/life-plan` and `/api/life-plan/day`. These resolve through 2.3 only.
2.6 `/plan/sandbox`: today's flow on the copy. The page server reads go through 2.3, and the cache key is
    the sandbox id. A banner reads "Copy space. Your real plan is not touched", with the two buttons.
    Settings shows a card linking to it, only for an account with a `plan_sandboxes` row.
2.7 The copy account is left out of the reminder and push senders (D7).
2.8 *Check:*
    - on the live site, his real row counts are the same before and after copy, play and reset (a
      read-only count query);
    - another account gets 404 on every sandbox route;
    - no sandbox token appears in any browser response;
    - an Opus adversarial security review of the diff.

## Phase 3 — Invisible fixes to today's flow (Sonnet; Opus review)

From the data audit. They change nothing he sees except error wording.

3.1 First visit saves its day: set the day baseline in `start-empty` (`NorthStarFlow.tsx:774-777`). An e2e
    test on a fresh account that only ticks.
3.2 Save now: Next, Done, closing a sheet and `pagehide`/`visibilitychange` flush at once. `keepalive` is
    used for every size (split above 60 KB). The leave-hook stays armed during an open save
    (`NorthStarFlow.tsx:851/858`).
3.3 Truthful messages instead of "your work is still here on this device" (`lifePlanSync.ts:279,281`).
3.4 Limits that name the field: `src/goals/planLimits.ts` mirrors the database CHECKs. It is used by the
    inputs (maxLength) and by the server, which answers 422 with e.g. "Goal title: 612 of 500 characters".
3.5 Sign-out clears `north-star-v1:*`, `plan-due-hidden:*`.
3.6 *Check:* e2e for the fresh account, a close right after typing, and a too-long title. A phone walk of
    the everyday edits compared with before.

## Phase 4 — Design, words, areas (Opus; runs alongside 1–3)

4.1 **Job spec:**
    - **Built from:** his words (the concept items, his board notes, his February areas and goal graph
      `c867fbc9` and `4e073e02`), the walk's confusion list, and the job column of the inventory.
    - **Each module gets:** its screens, the one question per screen, what Done needs, what is optional,
      the status reasons, and the table and column each answer lands in.
    - **Rule:** every job of the old flow has a home.
4.2 **Writer** (a fresh Opus agent, given only 4.1) writes every visible word. **Checker** (an Opus agent
    with the inventory) flags anything close. They loop until nothing is flagged.
4.3 **Areas page for his decision (Y4).** One short phone-width page with notes and a thumbs-up on every
    block (memory `review-boards-note-log`). It shows:
    - his February seven;
    - his current twelve, and where each would go;
    - one or two merged options, each with the reason.
    He decides there. The new version uses his choice on the copy first.

## Phase 5 — The new save engine (Sonnet builds, Opus review)

5.1 `src/goals/planStore/`, built for the new version:
    - a per-user outbox in IndexedDB with change ids and base revisions;
    - replay on load: send directly, re-diff when the account moved, ask only on a same-row conflict;
    - a re-read on focus;
    - one indicator: Saved / Saving… / Not saved – Retry / Updating;
    - the count of changes waiting.
5.2 Migration (additive; today's flow keeps working):
    - an applied-change-id table (7 days), so a retry is answered "done";
    - the save function requires each row's `plan_id = v_plan_id`;
    - server validation against one shared schema;
    - `life_plan_snapshots` written before any save that removes rows (kept 30 days);
    - `archived_at` on goals, areas, routines, steps and values, and day-history keys that no longer
      cascade;
    - `user_id`/`plan_id` indexes, `(select auth.uid())` in policies, and stable ids for values and answers.
5.3 *Check:* e2e for two tabs, offline then online, a lost reply, a close during a save, and a stale tab
    after a deploy.

## Phase 6 — The new version: home and core modules (Sonnet; needs 4.1–4.2, 5)

6.1 `planStatus()` (D5) and its tests.
6.2 `/plan/new` on the copy space: Next up, Core, Extra, the status chips, and deep links
    (`/plan/new/<module>/<screen>`).
6.3 Core modules 1–6. One question per screen, Next saves, a Done summary with "Change" per answer.
6.4 *Check:* starting from "Start as a brand-new user", reach a working Today at 390 px in under 15 minutes
    of honest typing. With his copied data, every status reason opens the right screen in one tap. No
    sideways overflow anywhere.

## Phase 7 — Extra modules and the daily side (Sonnet)

7.1 Every extra module on the same pattern.
7.2 Today, Track, Journal and Check-in in the new words and forms, on the new store.
7.3 *Check:* a phone walk of a full week on the copy.

## Phase 8 — Prove it, show him (Opus audit, Sonnet walks)

8.1 A 5-agent adversarial audit: loss, leak (copy space ↔ real), phone layout, words (the checker again),
    and the new-user flow. Repeat until a round finds nothing serious.
8.2 He clicks through `/plan/new` on his phone, on his copied data and from brand-new. "Built/live", never
    "done", until he has looked.

## Phase 9 — Switch over (his word only)

9.1 A fresh backup. His real account moves onto the new version, and his area decision is applied to his
    real data (counts per table before and after).
9.2 The old flow stays readable at `/plan/earlier`. Removing its code waits for his word.

---

# PART 2 — rules for the build sessions

- **Shared checkout.** Work in worktrees under `~/.cache/daygame-research/plan-steps/` (not /tmp). Ship by
  ff-merge, `git commit --only <paths>`, batched pushes. `npm run build` keeps `--webpack`.
- **Before every push,** run `npm run typecheck-ratchet`. Stop dev servers before typecheck or a full
  vitest run.
- **Live database.** A `json_agg` backup before every migration. Test writes go inside
  `begin; … rollback;`. Never read his plan's text; counts only.
- **Public repo.** No outside source names, quotes or video ids in the repo, commits or the live database.
- **Phone first.** Every screen at 390 px before desktop.
- **Phase ends.** Each phase ends with its check run for real, and a status line at the top of this file.

`/goal Execute Plans/plan-in-steps.md phase by phase. Read it fully first. Follow Part 2. Build steps on Sonnet subagents, review gates on Opus. Stop only for his area decision (4.3) and the switch (Phase 9).`

## Questions from the build

From Phase 6 (the home and the core modules). None blocks; each is a bit left out or held in a stand-in until the save engine and the migration land.

- **New columns not added (no migration in Phase 6).** A goal's level (`tier`), a hidden area (`archived_at`), the daily rating's 1–5 scale and its area (`scale_max`, area link), and the check-in day are kept as `start:new:*` answer rows (`src/goals/planSteps/planFacts.ts`). When the migration lands, only those helpers change.
- **Season close take-away.** Needs `cadence = 'season'`. Kept as a `start:new:season-take:<id>` answer instead.
- **Protected step.** The plan's own load keeps only a goal or area id in the season focus, so a protected routine step is kept as `start:new:protected`.
- **Check-in settings and the phone reminder.** The copy cannot read or write `life_plan_reminders` (the copy-space guard blocks it, D7), so the day, hour and phone choice are kept as answers. The "Remind you on your phone?" switch stores the choice and sends nothing.
- **Goal readings ("where you are now" as today's reading).** Needs the day route; the store sends only the plan half. The ladder start is stored; no day reading is written.
- **Ready-made goal sets** (`goals/start`, `goals/sets`) left out: the old set data is keyed to the old pillars, not to areas, and its titles still need the "Clean days" wording. Core 4 opens straight on "write my own".
- **Big goal with no area.** The plan's load drops a goal whose area is unknown, so an unfiled big goal sits under the first area and carries an "unfiled" marker; the `direction.big-area` reason reads that marker.
- **Extra modules** are listed as "coming" rows; Next up runs rules 1–4 and 7 only (rules 5 and 6 need the extras' status).
- **Save engine.** `usePlanStore` sends each change at once through the existing client calls (one save at a time, last change always lands, Retry on failure). The outbox, replay and re-read on focus are Phase 5.

