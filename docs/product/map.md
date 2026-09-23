# The product map — what exists, and what only looks like it exists

**Read this before saying anything about what the app does.** It is not loaded
automatically; it costs you one read, deliberately, because it was 1,300 words
sitting in every session whether or not anyone needed it.

The reason it exists at all: **the live surface is much smaller than the code.**
Over fifty pages under `/test`, nine abandoned generations of the goals screen,
two gym slices where only one is reachable. Reading the folder list alone gets
the product wrong in a way that is not obvious and not self-correcting.

`tests/unit/architecture/orientation.test.ts` fails if a new slice or a new
top-level route appears and nobody added it here.

## What this product is

**A subscription web app that helps a man get better with women, and then
quietly grew into a life-improvement app around that.** One owner, one intended paying
audience, priced on the public home page at `/` at $20/month, $35/two months or
$135/year through Stripe (`src/home/products.ts`).

**Nobody has ever paid, and nothing is in front of users.** There is no Stripe
webhook and no code anywhere writes `profiles.has_purchased`, so checkout cannot
grant access to anyone. No users, no revenue; the AI features are prototype
leftovers, not a live service. Price every recommendation for that stage — a
production-security lens on a prototype is how a reply loses its credibility,
and it has already happened once.

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
`/programs` the gym, `/life-mastery` the plan, `/life-mastery/quit-vice` (the
Black Box since 2026-09-20) and `/life-mastery/quit-vice/old` (the module it
replaced, intact),
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
- `vice/` — quitting a vice, at `/life-mastery/quit-vice`. **Since 2026-09-20
  that address is the Black Box**, a new front door: every run you have had on
  one calendar chart, close calls filed on the same form as lapses (one
  `wentThrough` flag apart), and a door that answers a "maybe I could moderate"
  thought with your own record of it. Its own storage key `vice-blackbox-v1`,
  which neither reads nor writes the old `quit-vice-v1` — **and since 2026-09-23
  the record is also on the account**, in `vice_attempts` and `vice_reports`
  (`src/db/viceRepo.ts`, `app/api/black-box/route.ts`). The browser copy stays
  the working copy so the page opens and files with no network; the account is
  the durable one, and two devices merge row by row rather than one refusing the
  other. A deletion is a row with `deleted_at`, never a gap. It shows **one vice
  at a time** — the record holds runs off several and every read filters to the one
  on screen — and **anything filed can be taken back**: an undo beside the
  report just filed, and per-report and per-run removal inside a run's own
  panel.
  **The whole previous module is intact at `/life-mastery/quit-vice/old`** and
  nothing was deleted — six flows over one stored state (where, gives, map,
  experiment, line, week), a `learn` teaching spine, a `shortlist` page, and
  seven tools; counts from `ViceFlowId` and `ViceToolId`. Only that one line at
  the foot of the Black Box links to it. Read the memory note before touching
  any of it: no streak counter, no pros-and-cons list, and rulers that compare
  only downwards are each a deliberate research finding, not an oversight.
- `programs/` — the gym. Hand-encoded strength programs, a custom program
  builder, and a live workout screen you use set by set at the rack. The engine
  handles four kinds of progression: load, endurance, skill tier and hold range.
  The comment at the top of `programs/types.ts` still says only load is built.
  That comment is stale; `programsService.ts` implements all four.
- `timetrack/` — a Toggl Track clone, at `/dashboard/time`. Nineteen tables of
  its own: workspaces, projects, tags, reports, alerts, webhooks. Ids are made
  on the device so two offline devices cannot collide.
- `health/` — weight, sleep, nutrition, workouts. Rolling averages, plateau and
  trend detection, personal records, cross-domain correlation. Its **dedicated
  trackers** are test-only (`WeightTracker`, `SleepTracker`, `NutritionTracker`,
  mounted only at `/test/health`) — but a signed-in user **does** see this data
  live, as stat tiles on `/dashboard/tracking`: `body_weight_current`,
  `sleep_hours_avg_weekly` and the nutrition metrics in
  `src/tracking/data/metricCatalog.ts`, resolved to real reads at
  `src/db/metricsRepo.ts:392`. This entry said "its screens are test-only" until
  2026-09-19, which read as "a user never sees it" and was wrong.
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
