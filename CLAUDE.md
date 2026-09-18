# daygame-coach

Next.js + TypeScript + Supabase. Feature slices in `src/<slice>/`, routes in `app/`, training-data pipeline in `scripts/training-data/`.

## What this product is

**A subscription web app that helps a man get better with women, and then
quietly grew into a life-improvement app around that.** One owner, one paying
audience, sold from the public home page at `/` for $20/month, $35/two months or
$135/year through Stripe (`src/home/products.ts`).

Two halves, and they are not the same product:

- **The dating half — what is advertised.** Practice conversations against an AI
  woman (Scenarios), work on confidence (Inner Game), ask a coach questions (Ask
  Coach), and log real approaches you did in the street (Tracking).
- **The life half — what it became.** A fourteen-step plan for your whole life
  (Life Mastery), quitting a vice, gym programs, time tracking, sleep, weight and
  food. None of this is mentioned on the sales page.

The owner is the main user. Features are built, used, rebuilt and abandoned at
speed, so **the live surface is much smaller than the code**, and the gap is the
single biggest source of misunderstanding. See "Live, lab, or dead" below before
assuming anything is in the product.

## What a signed-in user actually sees

The navigation is the honest map, and it lives in `components/navTabs.ts`.

Bottom tab bar: **Dashboard · Training · Tracking · Scenarios · Time**, plus a
"More" sheet holding **Ask Coach · Articles · Settings**.

Not in the navigation at all: **Life Mastery** (`/life-mastery`), reachable only
by typing the address, and the **quit-a-vice** module inside it. There is
deliberately no Goals tab — the old goals hub is archived and the app is being
consolidated onto one surface.

**Every address in the product**, so nothing is a surprise: `/` sales page,
`/auth/*` sign-up, login and password reset, `/dashboard` and everything under
it (tracking, scenarios, inner-game, qa, articles, settings, time),
`/programs` the gym, `/life-mastery` the plan and `/life-mastery/quit-vice`,
`/preferences` the dating answers, read by Scenarios, by the dashboard's
welcome banner and by `loginDestinationService` to decide where you land after
signing in, `/admin/ai-usage`
what the AI is costing, `/qa` and `/dashboard/goals/plan` which only redirect,
`/redirect` the post-login landing, and `/test/*` the laboratory.

**Three access levels.** Signed out sees the home page and a preview dashboard.
Signed in sees Life Mastery and Training. Paid (`profiles.has_purchased`, or an
accepted beta tester — `hasAccess` in `src/db/profilesRepo.ts`) unlocks the
training modules. Life Mastery deliberately needs no purchase.

## The slices, one line each

Business logic in `*Service.ts`, database access only in `src/db/*Repo.ts`.

**The dating half**
- `scenarios/` — AI conversation practice. Twenty scenarios defined, **four
  actually built**: Practice Openers, Keep It Going, Career Response,
  Shit-Tests. The other sixteen are "Coming Soon" tiles. The opener generator
  (`openers/generator.ts`, 4.5k lines) composes a woman, her outfit, the weather
  and her energy into a situation to open.
- `tracking/` — the real world, not practice. A live session tracker you run on
  your phone while out: count approaches, tag outcome and mood, record a voice
  note. Then field reports, daily and weekly reviews, stats, achievements,
  milestones, and a custom report builder.
- `inner-game/` — confidence work. Values selection and ranking, shadow work,
  peak experiences, role models.
- `qa/` — "Ask Coach". Answers from a retrieval system over transcribed daygame
  videos, not from the model's own knowledge. Reads the `embeddings` table the
  pipeline fills. Scores its own groundedness and confidence.
- `articles/` — AI-assisted article drafting and revision.
- `profile/` — who the user is and who he is looking for. Dating preferences,
  a world map of regions, ten woman archetypes across four age bands.

**The life half**
- `goals/` — **by far the biggest slice, over 100k lines, and mostly not live.** The
  live part is Life Mastery: `northStarService` plus the `north-star/`
  components, a fourteen-step flow at `/life-mastery` — north star, your 10s,
  the one thing, where to start, templates, systems, experiences, focus &
  season, values & identity, commit, track, today, journal, everything. It keeps
  the plan in the browser's own storage, but **more than the Track step writes
  to the database**: the one-thing box and the season band read and write
  `life_answers`, the Today tab increments goals, and the workout card creates a
  program enrollment. The comment on `app/life-mastery/page.tsx` claiming twelve
  of thirteen steps touch no API is wrong. The rest is lab work behind `/test` — nine goal-screen generations
  (`goalsv2` to `goalsv9`, then `goalsv11`; there is no v10), `new-goals/`,
  `setup/`. One trap: the Vision Plan **Lab screen**
  is test-only, but `visionPlanService` behind it is live and Life Mastery calls
  it. Judge each file, not the folder.
- `vice/` — quitting a vice, at `/life-mastery/quit-vice`. Eight steps —
  learn, shortlist, map, where, gives, week, line, experiment — arranged into
  several flows over one stored state. Read the memory note before touching
  it: no streak counter, no pros-and-cons list, and rulers that compare only
  downwards are each a deliberate research finding, not an oversight.
- `programs/` — the gym. Hand-encoded strength programs, a custom program
  builder, and a live workout screen you use set by set at the rack. The engine
  handles four kinds of progression: load, endurance, skill tier and hold range.
  The comment at the top of `programs/types.ts` still says only load is built.
  That comment is stale; `programsService.ts` implements all four.
- `timetrack/` — a Toggl Track clone, at `/dashboard/time`. Nineteen tables of
  its own: workspaces, projects, tags, reports, alerts, webhooks. Ids are made
  on the device so two offline devices cannot collide.
- `health/` — weight, sleep, nutrition, workouts. Rolling averages, plateau and
  trend detection, personal records, cross-domain correlation. **Its screens are
  test-only** (`/test/health`), but its logic and data are live: the Training
  screens and `programs/` use it, and its API routes are real.
- `exercising/` — an older gym progression scheme, kept in Google Sheets rather
  than the database. **Entirely test-only** (`/test/exercising`) and superseded
  by `programs/`. Do not confuse the two.

**Plumbing**
- `db/` — every Supabase call in the app. Nothing outside this folder talks to
  the database.
- `shared/` — dates and timezones, weight units, icon registry, error reporting,
  the Life Mastery address.
- `home/` — public sales page and Stripe checkout.
- `dashboard/` — the signed-in landing page. Conversation practice only;
  the gym deliberately does not appear here.
- `settings/` — units, timezone, language, difficulty, subscription management.
- `api_ai/` — what every AI call cost, per user, against a budget.

## The data

Roughly 40 tables in one Supabase Postgres. The ones that matter most, by how
hard the code leans on them: `user_goals` (Life Mastery and every goal surface),
`workout_logs` and `workout_sets` (the gym), `profiles` (identity, level, XP,
`has_purchased`), `sessions` and `approaches` (real-world tracking),
`program_enrollments`, `field_reports`, `embeddings` (Ask Coach's knowledge),
`ai_usage_logs`, and the `timetrack_*` family.

**`supabase/migrations/` holds only 42 files and does not describe the whole
schema.** Many tables were made directly in Supabase. The repos in `src/db/` are
the truthful record of what exists.

## Live, lab, or dead — the distinction to get right

- **`/test/*` is a laboratory, and 404s in production by design**
  (`app/test/layout.tsx`). It holds over fifty pages: nine generations of the goals
  screen, the Vision Plan Lab, the Scenario Lab,
  Change Your Life, archived hubs. **Finding something under `/test` means it is
  not in the product.**
- **A slice having code is not the same as a slice being reachable.** `health/`
  and `exercising/` have no live page at all. Check for a page outside
  `app/test/` before saying a feature is in the product.
- **The comments in this codebase are essays, and some are stale.** They are
  unusually good, which makes them unusually tempting to quote. Four claims in
  this orientation were wrong on the first draft because they came from a
  comment or a note instead of the code: the gym engine's four progression
  kinds, what the `beta` branch carries, which Life Mastery steps write to the
  database, the vice module's shape, and who reads the dating answers. Read the
  code.
- **Deleted, not hiding.** The Lair (a second goals surface) and the goals hub
  were removed on 2026-09-09. Comments still say so; do not resurrect them.
- **A cited `docs/` path that is not on disk is expected**, not a mistake. 482
  docs were deleted on 2026-09-09; the name is what finds the file in git
  history.
- **`beta` is a cherry-pick branch, not a feature flag.** It carries eleven
  slices: goals, tracking, scenarios, inner-game, profile, settings, dashboard,
  home, db, shared, api_ai. Absent there: programs, timetrack, vice, health,
  exercising, qa, articles. Check the branch rather than trusting this list.

## In flight now

- **Branch `training-rebuild`**, well ahead of main — a set-by-set rebuild of
  the gym.
- **Leaving Vercel and Supabase** — decided 2026-09-17. Read the memory note
  before any hosting, database or auth work.
- **Life Mastery persistence** — planned, nothing built; the plan still lives
  only in the browser.

`tests/unit/architecture/orientation.test.ts` fails if a new slice or a new
top-level route appears and nobody added it above.


## Commands
- `npm test` — Vitest unit + integration. Run after every code change, not just at the end.
- `npm run test:e2e` — Playwright
- `npm run dev` — localhost:3000
- Pipeline stages 02–10 — `.venv/bin/python -u scripts/training-data/<stage> ...`. Never system python; the venv has pinned torch/ctranslate2/pyannote.

## The four rules

This section was twenty-odd rules. They were four ideas restated, and a rule
restated eleven times reads as no rule at all. Each one below carries the
failure that bought it, because the story is the part that sticks.

**1. Check the thing itself, never a stand-in for it.** A filename, a handle, a
URL, a truncated preview, a passing shape-test, a docstring, a dashboard and a
green test count are all metadata. Read output the way the user will, in full;
for N generated records read a random 20 end to end. *381 testimonials shipped
with wrong quotes, quotes glued together, and a research agent's own write-up
presented as somebody's testimony. Every check ran on structure, none on
meaning.* Ground every claim in the code or the data, never in a doc, a summary
or a comment that describes it.

**2. Attack it before you show it.** Writing and attacking are different jobs,
and a confident explanation is exactly what hides the gap. *A schema called
"settled" gave up seven real defects in ten minutes to one question: "find
faults with it as a professional." No new information arrived in between.* So:
write it, attack it as someone paid to find what is wrong, hand over both. The
failure list ships with the work. "Done", "works", "ready", "fixed",
"verified" and "settled" all require that pass to have run. Say which claims
you checked and how, separately from which are inference.

**3. Fix it now, and fix the class, not the instance.** "Out of scope", "a
follow-up", "revisit later", "good enough for now" and "cheap if it ever
matters" are the same sentence, and none of them is an answer. Blocked on a
missing account, a timezone, a device, a fixture? Create it. When it genuinely
cannot be done now, say the whole shape of it in plain language *in the reply*:
what is wrong, what it takes, what it costs, what breaks if it is left. Never a
code, never a cross-reference. And widen the fix until the class is gone: one
place that owns each rule, one representation of each fact, and a test that
fails when a new caller forgets.

**4. Write for a non-programmer, and say the blockers out loud.** Short, no
preamble, no recap. Plain language first, file paths second. Any term like *RLS
policy*, *race condition*, *migration* gets a plain-language gloss the first
time it appears: "anyone signed in can add fake achievements to their own
account", not "the INSERT policy is permissive". Blockers go in the reply
itself, never "see the plan", one numbered line each, written as a question the
user can answer, each carrying your recommendation so "go with your
recommendations" always works. Say you attempted it and how it failed, because
a blocker never tried once is a guess. No blockers? Say "No blockers".

## Never, and ask first

Short, cheap, and not restatements of the four:

- Never leave a failing test. Fix the production code and add a regression test.
- Never add a silent fallback. Scripts fail loudly or ask the user.
- Never delete code whose purpose you can't explain.
- Never write a `.png` outside `.playwright-mcp/`.
- When the user asks to see text, put it in the reply, not through a tool.
- **Ask first:** any INSERT/UPDATE/DELETE RLS policy, anything touching auth,
  payments or permissions, reusing an existing icon in a new context
  (`src/shared/iconRoles.ts`), and anything destructive or hard to reverse.
- Warn about security risk every time it comes up, even unasked.

## Architecture
Enforced by `tests/unit/architecture.test.ts` — run it rather than memorizing it. Business logic lives in `*Service.ts`, DB access only in `src/db/*Repo.ts`, types in each slice's `types.ts`, API routes under 50 lines, multi-file icons registered in `iconRoles.ts`.

## Where the rest lives

`.claude/rules/` holds the **facts** — pipeline, database, UI, testing, plans,
bulk data. They load automatically when you touch matching files, and they are
specific on purpose: the 1,000-row limit, the probe that destroyed real data,
the defect classes that actually shipped here. Do not generalize them away.
Also `docs/pipeline/learnings.md` before pipeline work, `docs/testing_behavior.md`
before writing tests.

**482 docs were deleted on 2026-09-09** because they described screens that no
longer existed. 35 code comments still cite one by name; that name is exactly
what finds it in git history (`git log --diff-filter=D -- <path>`), so a cited
path that is not on disk is expected, not a mistake. Read the code, not a doc
about the code, and do not resurrect an old one to answer a question.
