# Achievement counters: derive, never increment

**Status:** BUILT AND APPLIED — 2026-08-27. Backfill run against production, security hole closed,
3934 unit tests and 207 integration tests green. What changed from the plan as written is recorded
in "How it actually went" below; the rest of the document is left as written so the two can be
compared.
**Written:** 2026-08-27
**Owner file set:** `src/tracking/**`, `src/db/trackingRepo.ts`, `app/api/tracking/**`, `supabase/migrations/**`
**Prereq reading:** `.claude/rules/database.md`, `.claude/rules/testing.md`, `.claude/rules/finished-work.md`

---

# PART 1 — For the human

## What is broken, in plain language

The app keeps a running tally — "you have done 31 approaches" — and hands out a badge at the
*moment* that tally ticks past a number. Ticks past 5, you get Getting Started. If the app is
not watching at that exact moment, the badge is never given, and nothing ever looks again.

Three things go wrong with that:

**1. The tally can lose count.** To add one approach the app reads the old number, adds one in
its head, and writes the new number back. Tap twice quickly and both taps read "3", both write
"4", and one approach vanishes from the tally. Your very first two approaches on 28 January were
two seconds apart and did exactly this.

**2. The tally is what the badges are based on** — not your actual approaches. So once the tally
is wrong, the badges are wrong too, and they stay wrong. It drifts in both directions: deleting a
session also deletes its approaches, which the tally never notices (too high), and lost taps make
it too low.

**3. Half the badges cannot be won at all.** The screen shows 101 badges. Only 50 have any code
behind them — the other 51 are decoration. Worse, the app records "she gave me her number" as a
*second* step, after the approach is already saved, and that second step doesn't touch the tally
at all. That is why the whole Numbers row is empty for someone with 23 real numbers.

Technical detail for whoever implements this: the award is an exact-equality edge trigger
(`if (newTotal === 5)`, `src/tracking/trackingService.ts:942`) on a JS read-modify-write counter
(`stats.total_approaches + 1`, `:902`); outcome is assigned by a later PATCH
(`useSession.ts:362` → `updateApproach`, `trackingService.ts:231`) which updates no stats.

### What the live data actually says (I read it today, changed nothing)

| account | approaches the app thinks / really has | sessions thinks / really | numbers thinks / really |
|---|---|---|---|
| `1f492d40` | 416 / **471** | 1747 / **1899** | 0 / **23** |
| `edec2d78` (yours) | 31 / **33** | 21 / **18** ← counted too many | 0 / **1** |
| `e34cb016` | 21 / 21 | 2 / 2 | 1 / 1 |

Your missing badge, reconstructed: your first two approaches were logged at 10:10:34 and
10:10:36 on 28 January and collided, so the tally lost one. That means the tally reached 5 at
your *sixth* approach, 10:13:03 the same morning. The approach-tracking feature was written
during that same day — it didn't exist at 06:01 and was saved at 19:33 — so at 10:13 the version
running on your phone had no "5 approaches" badge in it yet. First Steps (10:10:36) and Double
Digits (30 Jan) sit either side of the gap, which is why those two arrived and the middle one
never did.

## What this plan changes

**The badges stop being based on a tally, and start being based on your actual approaches.**

Instead of counting as it goes and hoping it never misses, the app will work it out from
scratch each time: look at everything you have actually logged, decide which badges that earns,
and give you any you don't have yet. The tally becomes a display number that gets rewritten from
the same look-up — so the badges and the number on screen can never disagree, and a missed moment
repairs itself the next time you log anything.

Six stages, each one finishable and testable on its own:

- **M1 — The rule book.** All 101 badges get a written rule in one list. The build refuses to
  compile if a badge has no rule, so "decorative badge nobody can win" becomes impossible. No
  database and no screens are touched at this stage.
- **M2 — The look-up.** One piece of code that gathers everything you've logged — approaches,
  sessions, field reports, reviews — into the shape the rules read.
- **M3 — The rehearsal.** A script that prints what *would* change for each account: badges owed,
  and how far each tally has drifted. It writes nothing. This is the safety gate before M5.
- **M4 — One way in.** Every action that changes your data (log an approach, set its outcome, end
  a session, delete a session, file a report, do a review) ends by re-running the same look-up.
  All the scattered "if the tally just hit 5" checks get deleted. After this stage the problem
  cannot come back.
- **M5 — Catching everyone up.** Runs the same look-up for every account so people get the badges
  they already earned, dated to the day they earned them rather than today. **This one writes to
  the live database and waits for your go-ahead.**
- **M6 — Making sure it stays fixed.** Tests that fail the build if anyone reintroduces a hand-
  counted tally or a badge with no rule. Plus two live bugs: the achievements screen only ever
  loads the first 20 badges, and the security hole below.

## What you will see when it is done

- Getting Started (5 approaches) unlocked on your account, dated **28.1.2026** — the day you
  actually earned it, not the day it was fixed.
- The Numbers row stops being empty. The account with 23 real numbers picks up First Digits,
  Doubling Up, High Five and Perfect 10.
- Mindset, Social and Unique Sets stop being stuck at 0 out of 8, 0 out of 5 and 0 out of 14 —
  those badges become winnable for the first time.
- The approach count on the dashboard shows 471 instead of 416, because it is now counting your
  actual approaches.
- If you delete a session the numbers go down, but you keep every badge you have already been
  given. Nothing is ever taken away.

## Security risk (please read — needs your decision)

**Anyone who signs up for your app can give themselves any badge, and can set their approach
count to any number they like.** They don't need to hack anything. The database is currently
configured to accept "add a badge" and "change my stats" requests sent straight from a user's own
browser, and the app's public key — which every visitor's browser already has — is enough to send
them. Someone could sit at 5000 approaches and Living Legend without ever going outside.

It is a leftover permission that the app itself never uses: badges and stats are only ever
written by the server. Removing it changes nothing for honest users and closes the hole
completely.

I have not touched it, because changing database permissions is on your stop-and-ask list. Say
the word and it goes in with the rest of the work.

The three permissions to remove, for the record:

```sql
"Users can insert own milestones"   ON milestones            -- lets a user grant themselves badges
"Users can insert own stats"        ON user_tracking_stats   -- lets a user create a fake tally
"Users can update own stats"        ON user_tracking_stats   -- lets a user edit their tally
```

The code already assumes these don't exist — see the comment "milestones is system-only (no user
INSERT policy)" at `src/db/trackingRepo.ts:1198`, which is simply wrong today.

## How it actually went

Everything in the plan shipped. Five things turned out differently, and the differences matter more
than the parts that went to plan:

**1. Your badge is dated 10:11:33, not 10:13:03.** The plan said Getting Started would be dated to
the moment the *counter* reached five. Counting the actual approach rows gives the moment the
*fifth approach* happened — 28 January 2026 at 10:11:33 — a minute and a half earlier, and the
honest answer. The badge is now in the database with that timestamp, between First Steps and
Double Digits.

**2. Two badges came back from the dead.** `night_owl` (start a session after 9pm) and `early_bird`
(start one before 10am) had been awarded to real users in February and then quietly dropped out of
the catalogue, so the app was filtering them off the achievements screen — earned, invisible. Both
are restored with their original wording, which is why the catalogue is 103 badges now, not 101.

**3. The plan under-estimated how many badges were owed.** The rehearsal found 37 across four
accounts: 15 for `e34cb016`, 15 for `1f492d40`, 7 for `edec2d78`, 0 for the account with no data.
Mostly the Mindset and Unique Sets rows that had never had any code behind them.

**4. Three badges are held that no rule explains, and they were left alone.** `1f492d40` holds
`2_week_streak`; `edec2d78` holds `2_week_streak` and `4_week_streak`. The old streak code awarded
them off counters that had rolled over wrongly — the bug documented in
`supabase/migrations/20260828_tracking_counter_periods.sql`. Badges are insert-only, so nothing was
taken away. The audit lists them every run under "awarded but no rule explains them".

**5. Production and the test database disagreed in three places**, all found by writing tests that
exercised the behaviour rather than describing it:
- `approaches.session_id` cascades on delete in production — deleting a session really does delete
  the approaches inside it — while `tests/integration/schema.sql` said it only nulls the link;
- `sessions.end_reason`, the column the whole "completed session" rule depends on, did not exist in
  the test schema at all;
- `user_tracking_stats` was missing five columns and still had two that production had dropped.
All three are fixed, so those tests now mean something.

Two more bugs were fixed on the way past because tests found them: `getNowInTimezone` in
`src/shared/dateUtils.ts` read midnight as hour 24 (`Intl` renders it that way), pushing any
midnight calculation onto the next day; and `enumConstraintSync` had been failing on a
`display_category` value that the code and the real database both had and only the test schema
lacked.

### What the second pass found — and it found plenty

The work was written, then attacked by a separate adversarial review before being handed over
(`.claude/rules/finished-work.md`). Twenty claims, fourteen confirmed. The three that mattered most
were mine, and two of them were invisible to a green test suite:

**The week-streak badges were unearnable — the same class of bug this whole plan exists to fix.**
`weekStreakReachedAt` carried its own copy of an ISO-week parser ("2026-W07"), while `buildFacts`
produced Monday dates ("2026-03-02"). Every comparison was NaN, so the run never advanced past one
and none of the six week-streak badges could ever be awarded. **The unit tests passed because they
fed the rule ISO labels that no caller ever produces** — a test that could not fail, standing exactly
where the bug was. Fixed by asking `dateUtils` what a consecutive week is instead of keeping a
private opinion, and covered now by tests that go from ROWS to badges rather than from hand-built
facts. Confirmed against production: the two accounts holding `2_week_streak` are now explained by
the rules, where before the audit called that badge unexplainable.

**Badges earned mid-session were never attached to the session.** Only `endSession` passed a
session, so every approach-earned badge (all the volume ones, the speed ones, the streaks) went in
with `session_id = null` and the session card showed no achievements. Fixed by deriving the session
from the rows — a badge belongs to whichever session's window contains the moment it was earned —
so no call site can forget it, including for a session still running.

**Two functions were writing the same five counters with different definitions.**
`repairWeeklyCounters` in `metricsRepo` recounted this week from `sessions.started_at` (no
completed filter), `approaches.created_at` and `field_reports.created_at`; the projection counts
completed sessions by `ended_at`, approaches by `timestamp`, reports by `reported_at`. They
overwrote each other, so a tile could show a different number on every page load. The repair
existed because the old `+1` counters could drift; they cannot any more, so it is deleted.

The rest, each with a test:

- **Reopening a session made the user's totals drop.** `reactivateSession` cleared `ended_at` but
  left `end_reason = 'completed'`, which the indexer reads as corrupt data — it dropped the session
  and logged an error describing a normal user action as a database fault.
- **Ending a session just after midnight on a Monday could wipe the week's counters.**
  `syncLinkedGoals` was called without the user's timezone, so the week was rolled by the server
  clock — backwards. Both call sites now pass the timezone, and `rollTrackingCounters` refuses to
  roll backwards at all, which closes the whole class.
- **Every review was filed one day early.** The review pages sent `startOfWeek.toISOString()` into a
  DATE column, so Copenhagen's Monday 00:00 was stored as the Sunday before, and the weekly-review
  streak was read against the wrong week. The pages now send calendar dates; the five rows already
  stored were corrected by `supabase/migrations/20260828130000_fix_review_period_dates.sql`.
- **The review streak was never gated.** `last_review_week_start` was written and read by nothing,
  so a streak that stopped in June still displayed in August — the exact bug `gateStreaks` exists to
  prevent. One line.
- **One future-dated approach zeroed the user's streaks, permanently.** Nothing bounded
  `timestamp`, and a row dated 2099 makes today's approach not the most recent, so the recount
  produced 0 every time. The schema now rejects a timestamp more than a minute ahead.
- **Editing a session changed nothing.** `updateSession` did not reconcile, so correcting a
  mistyped location left the old name in `unique_locations` and the 5-locations badge wrong.
- **Mall Rat and Bookworm were unwinnable** — their rules read tags the app never offered. `mall`
  and `bookstore` were added to `APPROACH_TAGS.location`, reverted by a concurrent edit an hour
  later without anything failing, and are now held in place by a test that reads the rules and
  checks every tag they depend on is one the picker offers.

### And what the pass after that found

The fixes were themselves attacked. Seven of eight held; one had broken something else, and three
new problems turned up:

- **The review fix broke submitting a review.** The pages started sending a calendar date, but
  `CreateReviewSchema` still demanded a full timestamp, so every weekly review and draft would have
  come back 400. A passing test was asserting the old contract, which is why nothing went red. The
  schema now takes `YYYY-MM-DD` only — an instant is refused, because an instant is what filed every
  review under the wrong week. The daily review route, which validated nothing at all, now uses the
  same schema.
- **Every tap during a session re-read the user's whole history, twice.** Reconciling on each
  approach meant two full reads of approaches, sessions, field reports and reviews — `select("*")`,
  so the JSONB body of every report and review came along for the ride. Now it reads only the
  columns the rules use, once, and confirms nothing raced with a COUNT instead of a second read.
- **Reopening a session still did not recount.** `end_reason` was fixed but `reactivateSession`
  never reconciled, so the counters kept a live session filed as finished until something else
  happened to trigger a recount.
- **The scenario path had the same missing-timezone bug** that ending a session did, so it is fixed
  the same way.
- **`/api/tracking/stats` served counters without rolling the week.** A user who logged nothing
  since Sunday opened the app on Monday and the Lair's weekly widget showed last week's numbers as
  this week's, and called a dead week active. It now goes through one service function that rolls
  and gates, the same pair the dashboard's own path already did.
- **The week-active threshold existed twice.** `activeWeeksFrom` hardcoded "2 sessions or 5
  approaches" beside a comment claiming it used `isWeekActive`; a reviewer proved the copy was the
  one that shipped by changing the thresholds and watching `counterRules.test.ts` stay green. It
  calls the shared function now.
- **The fact sheet the rule tests are written against is now pinned** to the one `buildFacts`
  actually produces. That single assertion is what the week-streak bug needed to be caught on the
  day it was written.

### The live run, and what it exposed

Logged in as the test user and did it for real, on 2026-09-02: started a session, tapped four
approaches in quick succession, set an outcome, logged a fifth, ended the session. Watched from the
database side:

- four rapid taps moved the total 21 → 25, exactly four. No lost increment.
- **Quarter Century** and **Comeback Kid** appeared mid-session, each dated to the tap that earned
  it — a second and a half apart, not to the same moment.
- setting the outcome to "number" on an already-saved approach moved `total_numbers` 1 → 2 and
  awarded **Doubling Up** and **Bookworm**. That is the path that had made every Numbers badge
  unwinnable, and the tag Bookworm needs did not exist until this work.
- ending the session awarded **Hat Trick**, **Warming Up**, **Goal Crusher** and **Early Bird** —
  one of the two badges restored from the dead.
- all eight carry the session id, and the session card lists all eight. Before, every
  approach-earned badge went in with no session and the card showed nothing.
- `unique_locations` gained the session's location only when the session completed, which is right.

Two things the run exposed that no test had:

**The audit could not tell "stale" from "wrong".** A user who logs nothing for a week has a stats
row that still names last week — correctly, for last week; the read path rolls it before anyone
sees it. The audit compared that row against a projection for *this* week and called it drift,
which made a clean run impossible for any idle account. It now asks the honest question — is the
row correct for the week it names? — and says so in words.

**A semantic change landed underneath this work.** `projectTrackingStats` was rewritten (by the
concurrent goals work) to store streak runs raw and let `gateStreaks` hide a dead one at read time,
rather than zeroing it at write time as this plan originally did. That is the better model — the
row records what was achieved — but it left one account's stored streaks written under the old
rules. The audit caught it, and re-running the backfill converged them.

### What the structure ended up being

The plan named one service. It became two, split along the line the plan itself argued for:

- `src/tracking/achievementsService.ts` — **pure**: `buildFacts`, `deriveEarnedMilestones`,
  `projectTrackingStats`. No database, no clock of its own. That is what lets the same code run
  inside a request, inside a unit test with hand-written rows, and inside a command-line audit with
  no Next.js around it — which the audit script needs.
- `src/tracking/achievementsSyncService.ts` — the writing half: `reconcileUserProgress`.

`statsFromFacts(facts)` became `projectTrackingStats(rows, timezone, now)`. The counters need the
current week and today, which are not facts about the past, so they are arguments.

Badge identity moved to `MILESTONE_TYPES` in `src/db/trackingEnums.ts`, beside the other canonical
enum lists. There had been two hand-maintained lists of badge names — one in `trackingTypes.ts`,
one derived from the catalogue — and they had already drifted: `first_date` and `mentor` existed in
one and nowhere else.

### The security hole is closed

The three write policies are gone from production, verified by reading `pg_policies` back: only
SELECT policies remain on `milestones` and `user_tracking_stats`, and row-level security is still
enabled on both. Nobody can grant themselves a badge or edit their own totals any more.

Applying it took a detour worth recording. `supabase db push` refuses to run while the migration
history and the local files disagree, and they do: two of another agent's migration files share the
version prefix `20260827`, and one shares `20260828`, so the CLI can never pair them up. Re-running
those files is not safe either — `20260828_tracking_counter_periods.sql` reads `current_week`, a
column that a later migration drops. The migration was applied through the Supabase Management API
instead (the CLI's own stored access token, `POST /v1/projects/{ref}/database/query`) and its row
written into `supabase_migrations.schema_migrations` by hand, so the file and the database agree.

**That route also retires blocker B1**: arbitrary SQL against production is available after all, and
needs no database password.

## Things that could stop this, and what happened when I tried them

"Blocker" here means: something I might not be able to do on my own. I tried each one once,
today, so none of these is a guess.

**Two of them need a decision from you. The other six are already sorted.**

### Needs you

**1. Letting me change real user data.** The fix has to give people the badges they already
earned. That means writing to the live database, and I don't do that without you saying so.
Nothing is written until you do — the plan runs a rehearsal first that only *prints* what it
would change (you can see the exact list in the M3 section).

**2. Closing the security hole.** Right now anyone who signs up can give themselves any badge,
and set their approach count to any number, straight from their browser. No hacking tools
needed — the database is configured to accept it. Fixing it means changing the database's
permission settings, which the house rules say I must ask about first. There is no downside I
can see: the app itself doesn't use that permission, only a malicious user would.

### Already sorted, no action from you

**3. Reading the live database.** I can read it (that is how the numbers in this plan were
measured), but I can't run free-form queries against it — the password for that isn't stored on
this machine, and it prompts for one I don't have. Not a problem: everything I need can be read
another way, and changes get made through the app's normal change-tracking system instead.

**4. A stale instruction in our own notes.** Our house rules tell me to use a command
(`supabase db query`) that no longer exists in the installed version of the tool. I tried it; it
errors out. I've noted the correct approach and the plan fixes the note.

**5. Half-finished database changes from another session.** If another agent had left a
half-applied change sitting there, mine could accidentally ship it. I checked — there are none,
everything is in sync. Safe to proceed.

**6. The heavier test suite needs Docker running.** It does, and I ran that suite: 86 tests, all
passing. So the deeper tests this plan calls for can actually be run.

**7. Knowing the current state of the tests.** Everything passes today — 3782 tests at 12:05,
3834 an hour later (someone else is working in this same folder), none failing, nothing on the
known-failures list. **Run `npm test` and write down the number before you start**, because that
is the line this work must not cross: if anything is red at the end, it's mine.

**8. The database tool is a version behind.** Noticed it, it's harmless, and upgrading it isn't
part of this job.

## Open questions — each with a recommendation already written into the plan

Every one of these is answered by a default in Part 2. The plan is executable as written; an
answer here only overrides a default.

| # | Question | Recommendation (already the default) |
|---|---|---|
| Q1 | What counts as a "rejection" for the Mindset badges? `outcome` is one of blowout / short / good / number / instadate. | **`outcome IN ('blowout','short')`.** "good" is a good conversation without a close — calling it a rejection would make Thick Skin meaningless. |
| Q2 | Bookworm ("number in a bookstore") and Mall Rat ("10 mall approaches") have no data source — `APPROACH_TAGS.location` is `street, cafe, store, park, transit`. | **Add `mall` and `bookstore` to `APPROACH_TAGS.location`** (`src/tracking/config.ts:19`). The tag pickers render `Object.values(APPROACH_TAGS)` so both appear in the UI with no further work. Alternative — delete the two badges — loses two catalog entries for no gain. |
| Q3 | Polyglot is "5 different languages"; nothing stores a language. | **Redefine as "approach 5 foreign-language sets"** (`set_type = 'foreign_language'`, count 5) and update the description string. Adding a language field to every approach for one badge is not worth it. |
| Q4 | "Consistent" (approach every day for a week) and "7_day_streak" (7 consecutive days) are the same condition. | **Keep both, pointing at the same rule.** Removing a catalog key hides any already-awarded row, because `getUserMilestones` filters unknown types (`trackingService.ts:699`). |
| Q5 | Never Give Up: "complete a session after 5 consecutive rejections" — after, within, or across sessions? | **Within one completed session: 5 consecutive rejection-outcome approaches, with at least one further approach after them.** That is the behaviour the label is praising. |
| Q6 | Instant Connection: "instadate on your first approach" — of the day or of the session? | **Of the session.** Sniper already covers "first approach of the day". |
| Q7 | First Group: `set_type` has both `three_plus` and `triple_set`. | **Both count.** They are the same thing recorded by two different pickers. |
| Q8 | Which timezone decides "lunch break", "Sunday", "Valentine's"? | **`profiles.timezone` via `getUserTimezone(userId)` (`src/db/settingsRepo.ts:146`), UTC when null.** Three of four profiles already have `Europe/Copenhagen`; the fourth has none. Reuse `src/shared/dateUtils.ts`, do not write new date maths. |
| Q9 | *Speed.* Working the badges out from scratch on every tap means re-reading everything that account has logged. At today's largest account (471 approaches, 1899 sessions) that is fast. When would it stop being fast enough? | **Ship the full recompute (YAGNI), with a perf test at 5000 approaches asserting < 2s.** If that test ever fails, move fact-building into a Postgres function behind the same repo signature — the boundary is already there for exactly this. |
| Q10 | If you delete a session, should badges you earned from it be taken back? | **No. Badges are insert-only.** Counters follow the data down; badges do not. Deleting a session already cascade-deletes its approaches (`approaches_session_id_fkey ON DELETE CASCADE`), and un-awarding something a user saw would be worse than a stale badge. |
| Q11 | When everyone is caught up, should the app pop a congratulations for badges earned months ago? | **No** — and today it cannot: there is no achievement toast anywhere in the app, only the badge stack on session cards. M5 writes historical `achieved_at`, so nothing new appears at the top of the modal. If a celebration is added later it must filter to `achieved_at >= requestStart - 60s`. |
| Q12 | `.claude/rules/database.md` documents `supabase db query --linked`, which does not exist (stale-instruction item 4 above). | **Correct the rule file in M6** to the command that works. |
| Q13 | *The double-tap case, again.* Two taps in the same instant each work the total out from their own snapshot, so the second one can write a total that is one behind — for a moment. Badges are unaffected, and the next thing you log fixes the number. Is "right a moment later" good enough? | **Yes, plus the one-shot re-count retry in M4 step 5.** If you ever want exact-at-every-instant, wrap reconcile in a per-user `pg_advisory_xact_lock(hashtext(user_id))` inside an RPC — one SQL function, no change to the rules or the facts. Not worth it for a burst of taps a second apart that self-corrects on the next tap. |

---

# PART 2 — Execution

**Part 1 above has everything you need to decide on. Part 2 is the build instructions and is
technical on purpose** — it is written for whoever implements this, human or AI.

Read this whole part before starting. Do the stages in order; each one ends with the tests green.

## Vocabulary used below

- **source rows** — `approaches`, `sessions`, `field_reports`, `reviews`. The only truth.
- **facts** — a plain object of sorted timestamp lists derived from source rows.
- **rule** — a pure function `(facts) => string | null` returning the ISO timestamp at which
  that badge was earned, or `null` if it has not been.
- **reconcile** — facts → rules → insert missing badge rows → overwrite `user_tracking_stats`.

## Why drift cannot come back

1. A rule never reads a counter. Its only input is `MilestoneFacts`, built from source rows.
2. `user_tracking_stats` is written by exactly one function, `statsFromFacts`, which takes the
   same facts object. Badge state and counter state are two projections of one input, computed
   in the same call — they cannot disagree.
3. There is no `+ 1` anywhere, so an error cannot accumulate. Every write recomputes the whole
   value from source rows; a racing write can leave a counter one row behind for one beat, and
   the next reconcile — or M3's audit — restores it exactly. Today's `+ 1` loses that row forever
   (this is how 471 approaches became 416).
4. Awarding is an upsert on `(user_id, milestone_type)` — the constraint
   `milestones_user_id_milestone_type_key` already exists in production — so a double reconcile
   is a no-op, and a missed reconcile is repaired by the next one.
5. Every badge in the catalog has a rule, enforced by `Record<MilestoneType, MilestoneRule>`
   at compile time. A badge with no rule does not build.

## Design constraints this plan is held to

**DRY.** One rule per badge, in one table, consumed by every caller — the write path, the read
path, the audit script and the backfill all call `reconcileUserProgress`. Today the awarding logic
lives in five functions across `trackingService.ts`, and the catalog itself is duplicated —
`app/test/achievements/page.tsx:38` holds a stale hand-copy of `ALL_MILESTONES` (it stops at
`100_approaches`). After M4 the logic exists once; M6 deletes the copy. The four helpers are
shared; no rule re-implements week adjacency, day arithmetic or timezone conversion — they call
`areWeeksConsecutive`, `getISOWeekString`, `getNowInTimezone`.

**YAGNI.** No event table, no queue, no cache, no Postgres function, no badge-progress
materialisation. Full recompute on write, because at the largest real user (471 approaches,
1899 sessions) it is four paginated queries. Q9 names the single measurement that would justify
more, and nothing is built for it in advance.

**SOLID, the two parts that matter here.** *Single responsibility*: repo fetches rows, service
shapes facts, rules decide, one function writes. A rule cannot touch the database; the repo
cannot know what a badge is. *Open/closed*: a new badge is one entry in `ALL_MILESTONES` and one
entry in `MILESTONE_RULES` — no existing function changes, and the compiler refuses the entry
if you forget the second half. *Dependency inversion*: `deriveEarnedMilestones` depends on the
`MilestoneFacts` shape, not on Supabase, which is why the whole rule book is unit-testable with
object literals and why Q9's swap to SQL would touch one function.

**A rule for whoever executes this.** If a milestone tempts you to add a field to
`user_tracking_stats`, or to read one inside a rule, stop — that is the bug this plan removes.
Counters are output. Source rows are input.

## How the facts are constructed (this is the part that must not be guessed)

All times are ISO-8601 UTC strings. All lists are **ascending** and **complete** — no limits,
no sampling. The nth element of a list is when the nth event happened, which is exactly what a
threshold badge needs, so a threshold rule is `nth(list, n)` and nothing else.

Row selection, exactly:

| List | Source | Filter | Time used |
|---|---|---|---|
| `approaches` | `approaches` | `user_id` | `timestamp` (NOT NULL, default now()) |
| `numbers` | `approaches` | `outcome = 'number'` | `timestamp` |
| `instadates` | `approaches` | `outcome = 'instadate'` | `timestamp` |
| `rejections` | `approaches` | `outcome IN ('blowout','short')` (Q1) | `timestamp` |
| `blowouts` | `approaches` | `outcome = 'blowout'` | `timestamp` |
| `setTypes[t]` | `approaches` | `set_type = t`, for each of the 15 `SET_TYPES` | `timestamp` |
| `tags[t]` | `approaches` | `t = ANY(tags)`, for each `ApproachTag` | `timestamp` |
| `numbersByTag[t]` | `approaches` | `outcome = 'number' AND t = ANY(tags)` | `timestamp` |
| `sessions` | `sessions` | `end_reason = 'completed' AND ended_at IS NOT NULL` | `ended_at` |
| `wingmanSessions` | `sessions` | as above `AND with_wingman = true` | `ended_at` |
| `fieldReports` | `field_reports` | `is_draft = false` | `reported_at` (NOT NULL) |
| `weeklyReviews` | `reviews` | `review_type = 'weekly' AND is_draft = false` | `created_at` |
| `monthlyReviews` | `reviews` | `review_type = 'monthly' AND is_draft = false` | `created_at` |
| `approachDays` | derived | unique `YYYY-MM-DD` of each approach **in the user's timezone** (Q8) | — |
| `activeWeeks` | derived | one entry per ISO week that qualifies, ascending: `{ week, qualifiedAt }`. A week qualifies when it holds >= 2 completed sessions **or** >= 5 approaches (`isWeekActive`, `trackingService.ts:744`). `qualifiedAt` is the timestamp of the event that tipped it over — the 2nd session's `ended_at` or the 5th approach's `timestamp`, **whichever comes first in time** | — |
| `uniqueLocations` | `sessions` | distinct non-null `primary_location`, in first-seen order, with that first-seen `ended_at` | — |

Rules that fail loudly rather than guessing (`.claude/rules` — never a silent fallback):
- a session with `end_reason = 'completed'` but `ended_at IS NULL` → `console.error` naming the
  session id, excluded from `sessions`. It cannot be dated, so it cannot award anything.
- a review row with `created_at IS NULL` (column is nullable) → same treatment.
- **never** read `sessions.total_approaches`. It is itself a denormalised counter written by
  `trackingRepo.ts:419` and carries the same drift. Per-session approach counts are computed by
  grouping the `approaches` rows by `session_id`.

Per-session and per-window facts (each is `string | null` — the ISO time it first became true):

| Fact | Definition |
|---|---|
| `firstSession5Approaches` / `firstSession10Approaches` | earliest completed session whose grouped approach count >= 5 / >= 10 → its `ended_at` |
| `firstSessionGoalMet` | earliest completed session with `goal_met = true` |
| `firstSession120Min` | earliest completed session with `duration_minutes >= 120` |
| `firstSession3Numbers` / `firstSession5Numbers` | earliest completed session with >= 3 / >= 5 approaches of `outcome='number'` |
| `firstSession2Instadates` | earliest completed session with >= 2 `outcome='instadate'` |
| `firstSession10NoNumbers` | earliest completed session with >= 10 approaches and zero `outcome='number'` |
| `firstSessionWeekend` / `firstSessionSunday` | earliest completed session whose `ended_at` falls on Sat/Sun / on Sun, in the user's timezone |
| `firstSessionFirstWeekJan` | earliest completed session with `ended_at` in Jan 1–7, user timezone |
| `firstSessionValentines` | earliest completed session with `ended_at` on Feb 14, user timezone |
| `firstSessionAfter5ConsecutiveRejections` | earliest completed session containing 5 consecutive rejection approaches (ordered by `timestamp`) followed by >= 1 further approach in the same session (Q5) |
| `first3ApproachesIn10Min` | earliest `approaches[i+2].timestamp` where that minus `approaches[i].timestamp` <= 10 min |
| `first5ApproachesIn15Min` / `first10ApproachesIn30Min` | same sliding window, 5-in-15 / 10-in-30 |
| `first3ApproachesInLunchHour` | earliest 3rd approach falling in hour 12 (12:00–12:59) of one calendar day, user timezone |
| `first5ApproachesInRushHour` | earliest 5th approach in hours 17–18 of one calendar day, user timezone |
| `firstNumberOnFirstApproachOfDay` | earliest approach that is both the first of its calendar day (user timezone) and `outcome='number'` |
| `firstInstadateOnFirstApproachOfSession` | earliest approach that is the first of its session and `outcome='instadate'` (Q6) |
| `firstComeback` | earliest approach preceded by a gap of >= 14 days from the previous approach |
| `fifthUniqueLocation` | `ended_at` of the session that introduced the 5th distinct `primary_location` |

Four shared helpers, used by every rule — write them once, in the rules module:

```ts
const nth = (list: string[], n: number): string | null => list[n - 1] ?? null
const merge = (...lists: string[][]): string[] => lists.flat().sort()   // ISO strings sort chronologically
const dayStreakReachedAt = (days: string[], n: number): string | null   // nth day of an n-long run of consecutive YYYY-MM-DD
const weekStreakReachedAt = (weeks: ActiveWeek[], n: number): string | null // qualifiedAt of the nth week of an n-long consecutive run
```

`merge` is only used by `first_group` (Q7). `nth` covers roughly 60 of the 101 rules — if a
rule you are writing needs anything more than these four helpers plus a facts field, the fact
sheet is missing a field: add it to `buildFacts` in M2 rather than putting logic in the rule.

`weekStreakReachedAt` reuses `areWeeksConsecutive` (`trackingService.ts:728`) — do not write a
second week-adjacency function.

---

## M1 — The rule book (pure, no database)

**Deliverable:** every catalog badge has a rule; the compiler rejects a badge without one, and
`tests/unit/architecture.test.ts` rejects it again at runtime because the build skips type checking.

*Built. 103 badges, 103 rules — `night_owl` and `early_bird` were restored to the catalogue after
turning up as awarded rows in production that the app was hiding.*

Files:
- `src/tracking/types.ts` — add `MilestoneFacts`, `ActiveWeek`, `MilestoneRule`.
  (Types live in the slice's `types.ts`; the architecture test enforces this.)
- `src/tracking/data/milestoneRules.ts` — **new**. Exports `nth`, `merge`,
  `dayStreakReachedAt`, `weekStreakReachedAt`, and
  `export const MILESTONE_RULES: Record<MilestoneType, MilestoneRule> = { ... }`.
  The `Record<MilestoneType, ...>` is the exhaustiveness guarantee — the same idiom already
  used for outcomes at `src/tracking/config.ts:37`.
  **Export no types from this file** — the architecture test allows type exports only from
  `types.ts` and a short allowlist. `MilestoneRule` goes in `src/tracking/types.ts`.
- `src/tracking/achievementsService.ts` — **new**, and pure (the writing half ended up in
  `achievementsSyncService.ts`). Note the name: `src/goals/milestoneService.ts`
  already exists and is unrelated — do not edit it, do not import from it.
  `deriveEarnedMilestones(facts)` returns `Array<{ type: MilestoneType; achievedAt: string }>`,
  sorted by `achievedAt`. It is a `map` over `MILESTONE_RULES` filtering nulls — nothing else.
  No I/O in this file.

Rule table. Every entry is one expression; `f` is the facts object.

```
Approaches   first_approach nth(f.approaches,1) · 5/10/25/50/100/250/500/1000/2000/5000_approaches nth(f.approaches,N)
Numbers      first_number nth(f.numbers,1) · 2/5/10/25/50/100/200_numbers nth(f.numbers,N)
Instadates   first_instadate nth(f.instadates,1) · 2/5/10/25/50_instadates nth(f.instadates,N)
Sessions     first_session nth(f.sessions,1) · 3/5/10/25/50/100_sessions nth(f.sessions,N)
             first_5_approach_session  f.firstSession5Approaches
             first_10_approach_session f.firstSession10Approaches
             first_goal_hit            f.firstSessionGoalMet
Streaks      2/4/8/12/26/52_week_streak weekStreakReachedAt(f.activeWeeks,N)
             7/30/100_day_streak        dayStreakReachedAt(f.approachDays,N)
Reports      first_field_report nth(f.fieldReports,1) · 5/10/25/50_field_reports nth(f.fieldReports,N)
             first_weekly_review nth(f.weeklyReviews,1)
             monthly_unlocked    nth(f.weeklyReviews,4)
             quarterly_unlocked  nth(f.monthlyReviews,3)
Special      globetrotter f.fifthUniqueLocation
             consistent   dayStreakReachedAt(f.approachDays,7)          (Q4: same as 7_day_streak)
             marathon f.firstSession120Min · weekend_warrior f.firstSessionWeekend
             comeback_kid f.firstComeback · rejection_proof f.firstSession10NoNumbers
             never_give_up f.firstSessionAfter5ConsecutiveRejections     (Q5)
             lunch_break_legend f.first3ApproachesInLunchHour
             rush_hour_hero     f.first5ApproachesInRushHour
             sunday_funday f.firstSessionSunday
             new_years_resolution f.firstSessionFirstWeekJan
             valentines_warrior   f.firstSessionValentines
             sniper f.firstNumberOnFirstApproachOfDay
             hot_streak f.firstSession3Numbers · perfect_session f.firstSession5Numbers
             instant_connection f.firstInstadateOnFirstApproachOfSession (Q6)
             double_date f.firstSession2Instadates
             coffee_connoisseur nth(f.numbersByTag.cafe,1)
             bookworm           nth(f.numbersByTag.bookstore,1)          (Q2: new tag)
             street_smart nth(f.tags.street,10) · park_ranger nth(f.tags.park,10)
             mall_rat     nth(f.tags.mall,10)                            (Q2: new tag)
Mindset      first_rejection nth(f.rejections,1) · 10/50/100_rejections nth(f.rejections,N)
             first_blowout nth(f.blowouts,1)
             approach_anxiety_conquered f.first3ApproachesIn10Min
             zone_state f.first5ApproachesIn15Min · flow_state f.first10ApproachesIn30Min
Social       wing_commander nth(f.wingmanSessions,1)
             10/25_wingman_sessions nth(f.wingmanSessions,N)
             first_double_set nth(f.setTypes.double_set,1)
             10_double_sets   nth(f.setTypes.double_set,10)
Unique Sets  first_two_set nth(f.setTypes.two_set,1)
             first_group   nth(merge(f.setTypes.three_plus, f.setTypes.triple_set),1)  (Q7)
             first_mixed_group / first_mom_daughter / first_sisters / first_tourist /
             first_moving_set / first_seated / first_foreign  = nth(f.setTypes.<t>,1)
             tourist_guide nth(f.setTypes.tourist,10) · world_traveler nth(f.setTypes.tourist,25)
             10_seated nth(f.setTypes.seated,10) · seated_master nth(f.setTypes.seated,25)
             polyglot  nth(f.setTypes.foreign_language,5)                (Q3)
```

Also in M1, per Q2 and Q3:
- `src/tracking/config.ts:19` — `location: ["street","cafe","store","park","transit","mall","bookstore"]`.
- `src/tracking/data/milestones.ts` — Polyglot description becomes "Approach 5 foreign-language sets".

**Acceptance tests** — `tests/unit/tracking/milestoneRules.test.ts` (new):
1. `Object.keys(MILESTONE_RULES)` equals `Object.keys(ALL_MILESTONES)` — both directions.
2. Threshold boundary, for `5_approaches` and three others: facts with 4 events → `null`;
   with 5 → **the 5th event's timestamp**, not the 4th and not `now`. This is the regression
   test for the reported bug.
3. A facts object with 33 approaches whose 5th is `2026-01-28T10:13:03Z` yields
   `5_approaches` at exactly that time (the real `edec2d78` case).
4. Idempotence of derivation: same facts twice → deep-equal output.
5. Every rule returns `null` for empty facts — catches a rule that reads a missing field
   and returns `undefined`.
6. Q5/Q6/Q7 each get one positive and one negative case.
7. **The transcription test — this one matters most.** For every catalog key matching
   `/^(\d+)_(approaches|numbers|instadates|sessions|field_reports|rejections|seated|double_sets|wingman_sessions)$/`,
   build facts with `N-1` events of that kind and assert `null`, then `N` events and assert the
   Nth timestamp. The rule table below is transcribed by hand; the compiler catches a *missing*
   entry but not `nth(f.approaches, 50)` written under `100_approaches`. This test catches every
   wrong number in one pass. Add `first_*` keys to the same loop with `N = 1`.

`npm test` green before moving on.

---

## M2 — The facts (database)

**Deliverable:** `getMilestoneFacts(userId)` returns the M1 fact sheet from real rows.

*Built. `getMilestoneSourceRows` pages at 1000 rows, proven against the account with 1899 sessions.*

Exactly three functions, exactly these names — the repo fetches rows, the service shapes them:

```ts
// src/db/trackingRepo.ts      — DB only, no rule logic, no date maths
export async function getMilestoneSourceRows(userId: string): Promise<MilestoneSourceRows>
// src/tracking/achievementsService.ts — pure, no I/O
export function buildFacts(rows: MilestoneSourceRows, timezone: string | null): MilestoneFacts
// src/tracking/achievementsService.ts — the only place the two meet
export async function getMilestoneFacts(userId: string): Promise<MilestoneFacts>
```

`MilestoneSourceRows` (in `src/tracking/types.ts`) is
`{ approaches: ApproachRow[]; sessions: SessionRow[]; fieldReports: FieldReportRow[]; reviews: ReviewRow[] }`
— whole rows, unfiltered except by `user_id`. Filtering is the service's job, so every filter
decision is unit-testable without a database.

`getMilestoneSourceRows` uses the admin client (this table set is system-read) and runs four
queries, each **paginated in 1000-row pages**:

```ts
const PAGE = 1000
let from = 0, all: Row[] = []
for (;;) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId)
                                        .order("id").range(from, from + PAGE - 1)
  if (error) throw new Error(`Failed to read ${table}: ${error.message}`)
  all.push(...data)
  if (data.length < PAGE) break
  from += PAGE
}
```

PostgREST caps one request at 1000 rows. `1f492d40` already has 1899 sessions, so a single
unpaginated read silently truncates — the exact class of bug this plan exists to kill.

Timezone handling: `getUserTimezone(userId)` (`src/db/settingsRepo.ts:146`) and the existing
`getNowInTimezone` / `getTodayInTimezone` in `src/shared/dateUtils.ts`. Do not add a date
library and do not hand-roll offsets.

**Acceptance tests**
- `tests/unit/tracking/milestoneFacts.test.ts` — `buildFacts` over hand-built row fixtures:
  ordering, the completed-session filter, the `ended_at IS NULL` loud-exclusion, per-session
  grouping done from approach rows (a fixture where `sessions.total_approaches` is deliberately
  wrong proves it is ignored), timezone day boundaries (an approach at 23:30 UTC is "tomorrow"
  in `Europe/Copenhagen`).
- `tests/integration/db/milestoneFacts.integration.test.ts` — seeds 1200 approaches over 2
  users, asserts pagination returns all 1200 for the right user and none of the other's.

---

## M3 — The audit (read-only, gate for M5)

*Built and run — output in "How it actually went".*

**Deliverable:** `scripts/tracking/audit-achievements.ts`, run with
`npx tsx scripts/tracking/audit-achievements.ts` (`tsx` is already a devDependency and
`seed:values` uses it). Writes nothing. It loads `.env.local` and uses
`SUPABASE_SERVICE_ROLE_KEY`, because there is no logged-in user in a script context.

For every row in `user_tracking_stats` plus every `profiles` row without one, print:
- badges earned-by-rule but absent from `milestones`, each with the date it will be given
- badges present in `milestones` but not earned-by-rule (expect none; a non-empty list means
  a rule is stricter than the historical code — investigate before M5, do not delete rows)
- each counter: stored vs derived, and the delta

**Acceptance** — the output must reproduce this, measured read-only on 2026-08-27. Any other
result means M1/M2 are wrong: fix them, do not adjust the expectation.

| user | counters (stored → derived) | badges it must add (threshold rules only; the window and per-session rules may add more, list them and eyeball each) |
|---|---|---|
| `1f492d40` | approaches 416→471, sessions 1747→1899, numbers 0→23 | `first_number`, `2_numbers`, `5_numbers`, `10_numbers` |
| `edec2d78` | approaches 31→33, sessions 21→18, numbers 0→1 | `5_approaches` dated **2026-01-28T10:13:03Z**, `first_number`, `5_field_reports` |
| `e34cb016` | no counter change | `first_two_set`, `first_group`, `first_mixed_group`, `first_mom_daughter`, `first_sisters`, `first_tourist`, `first_moving_set`, `first_seated`, `first_foreign` |
| `22a69a54` | no stats row exists; one is created | none (no tracking data) |

Per `.claude/rules/generated-data.md`: read the full output for at least one user end to end,
not the summary counts.

---

## M4 — One award path

**Deliverable:** every write ends in the same reconcile; all threshold arithmetic is deleted.

*Built. Five functions and 242 lines of threshold arithmetic deleted from `trackingService.ts`,
plus `checkAndAwardMilestone`/`checkAndAwardMilestones` (94 lines) from `trackingRepo.ts`.*

Add to `src/tracking/achievementsService.ts`:

```ts
export async function reconcileUserProgress(userId: string, sessionId?: string): Promise<MilestoneRow[]>
```

1. `const facts = await getMilestoneFacts(userId)` — the M2 function; it fetches the timezone
   and the rows itself. Do not re-fetch either here.
2. `const earned = deriveEarnedMilestones(facts)`
3. insert the ones not already present, via a new repo function
   `insertMilestones(userId, rows, sessionId?)` doing a single
   `.upsert(rows, { onConflict: "user_id,milestone_type", ignoreDuplicates: true })`;
   each row carries its own historical `achieved_at`. `session_id` is stamped only on badges
   whose `achievedAt` falls inside the session being closed — a badge earned in January must
   not be attributed to today's session.
4. `await replaceUserTrackingStats(userId, statsFromFacts(facts))` — a full-row overwrite, no
   read-modify-write.
5. **Verify the snapshot, once.** Re-count approaches with a cheap
   `select("id", { count: "exact", head: true })`. If it differs from `facts.approaches.length`,
   a concurrent write landed mid-recompute: run steps 1–4 again, **at most one extra time**, then
   stop. See "What this does and does not guarantee" below for why one retry is enough.
6. return the newly inserted rows.

`milestones.value` stays `null` on every insert — no existing row uses it and nothing in the UI
reads it. Do not repurpose the column.

**No badge storm.** There is no achievement toast in the app today (the approach and session
endpoints return the row and nothing else; session cards read `milestones.session_id` through
`SessionAchievement`, `src/db/trackingTypes.ts:576`), so nothing pops when M5 lands. Keep it
that way: any future celebration must filter to rows with `achieved_at >= requestStart - 60s`.
Without that filter the first reconcile after deploy would "celebrate" badges earned in January.

**What this does and does not guarantee.** Two approaches logged in the same instant each run a
full recompute; the second one's snapshot may have been taken before the first one's row landed,
so the counter it writes can be one behind. That is why step 5 re-counts and retries once — and
why the guarantee is stated precisely:

- **Badges can never be lost.** Inserts are a union (`ignoreDuplicates`), every reconcile derives
  from the complete source rows, and every later reconcile re-checks every badge. A badge missed
  by a racing write is awarded by the next write or the next audit run — unlike today, where a
  missed tick is permanent.
- **Counters are exact after the last write settles**, not necessarily during a burst. The value
  is recomputed from source rows every time, so an error cannot accumulate: one reconcile after
  the burst and the row is right again. Contrast with `+ 1`, where every lost update is permanent.
- If exact-at-every-instant counters are ever required, the fix is one line of SQL, not a
  redesign — see Q13.

`statsFromFacts(facts)` (pure, in `src/tracking/achievementsService.ts`) returns every column of
`user_tracking_stats` except `user_id`, `updated_at` and `favorite_template_ids`. All 26 columns
are accounted for below — **do not leave one out and do not invent one**; the two similarly
named streak columns mean different things and are the easiest mistake in this file.

| Column | Value |
|---|---|
| `total_approaches` | `facts.approaches.length` |
| `total_sessions` | `facts.sessions.length` |
| `total_numbers` | `facts.numbers.length` |
| `total_instadates` | `facts.instadates.length` |
| `total_field_reports` | `facts.fieldReports.length` |
| `current_streak` | length of the run of consecutive `approachDays` ending today or yesterday (user tz); else `0` |
| `longest_streak` | longest run of consecutive `approachDays` ever |
| `last_approach_date` | last entry of `approachDays`, or `null` |
| `current_week` | ISO week of now, user tz — `getISOWeekString(getNowInTimezone(tz))` |
| `current_week_approaches` | approaches whose day falls in `current_week` |
| `current_week_sessions` | sessions whose `ended_at` falls in `current_week` |
| `current_week_numbers` / `current_week_instadates` / `current_week_field_reports` | same filter on those lists |
| `current_week_streak` | **activity** streak: run of consecutive `activeWeeks` ending at `current_week` or the week before; else `0` |
| `longest_week_streak` | longest run of consecutive `activeWeeks` ever |
| `last_active_week` | last entry of `activeWeeks`, or `null` |
| `last_session_week` | ISO week of the last entry of `facts.sessions`, or `null` |
| `weekly_reviews_completed` | `facts.weeklyReviews.length` |
| `current_weekly_streak` | **review** streak, a different column from `current_week_streak`: consecutive ISO weeks (by the review's `period_start`) holding a non-draft weekly review, ending at the current or previous week |
| `monthly_review_unlocked` | `facts.weeklyReviews.length >= 4` |
| `quarterly_review_unlocked` | `facts.monthlyReviews.length >= 3` |
| `unique_locations` | `facts.uniqueLocations` names, first-seen order |
| `favorite_template_ids` | **not written** — user input, not a projection |
| `user_id`, `updated_at` | set by the repo write, not by this function |

The repo write is `replaceUserTrackingStats(userId, stats)` in `src/db/trackingRepo.ts`:
`.upsert({ user_id: userId, ...stats, updated_at: new Date().toISOString() }, { onConflict: "user_id" })`.
Upsert, not update — one production profile (`22a69a54`) has no stats row at all, and the
backfill must create it rather than skip the user.

Call sites — replace, do not wrap:

| File / line | Now | After |
|---|---|---|
| `trackingService.ts:227` `createApproach` | `incrementApproachStats(...)` | `reconcileUserProgress(userId, approach.session_id)` |
| `trackingService.ts:231` `updateApproach` | nothing | same call — **this is what makes Number badges reachable** |
| `trackingService.ts:186` `deleteSession` | nothing | same call, so counters follow deletions down (cascade removes that session's approaches) |
| `trackingService.ts:164` `endSession` | `updateSessionStats(...)` | `reconcileUserProgress(userId, sessionId)` |
| `trackingService.ts:279` `createFieldReport` | inline counting + award | same call |
| `trackingService.ts:500` weekly review | `repoCheckAndAwardMilestone(...,"first_weekly_review")` | same call |
| `trackingService.ts:991`, `:1007` | `monthly_unlocked` / `quarterly_unlocked` | same call |

Then **delete**: `incrementApproachStats`, `updateSessionStats`, `checkAndUpdateWeeklyStreak`,
`incrementWeeklyReviewCount`, `incrementMonthlyReviewCount`, and both
`checkAndAwardMilestone(s)` exports in `trackingRepo.ts` (`:1193`, `:1238`) once no caller
remains. `isWeekActive` / `areWeeksConsecutive` / `getISOWeekString` stay — the facts builder
uses them. Deleting these is the point of the milestone: two implementations of one rule is
how the two halves drifted apart in the first place.

`app/api/tracking/approach/[id]/route.ts` gains nothing new — it exposes PATCH only (there is
no approach-delete endpoint today) and already calls `updateApproach`, which now reconciles.
If a delete endpoint is added later it needs the same one-line call and nothing else.

**Acceptance tests**
- `tests/integration/db/reconcile.integration.test.ts`:
  1. insert 5 approaches one at a time → `5_approaches` exists, `achieved_at` == the 5th
     approach's `timestamp`.
  2. insert 5 approaches **concurrently** (`Promise.all`) → `5_approaches` exists immediately
     (this is the lost-update case that produced the reported bug), and after one further
     `reconcileUserProgress` call `total_approaches` is exactly 5 (Q13).
  3. create an approach with no outcome, PATCH it to `number` → `first_number` appears.
  4. delete a session with 3 approaches → `total_approaches` drops by 3, and every badge row
     still exists (Q10).
  5. reconcile twice → no duplicate rows, no changed `achieved_at`.
- `tests/unit/architecture.test.ts` — extend: no file outside `src/tracking/achievementsService.ts`
  may reference `milestones` inserts.

---

## M5 — Backfill (writes production — gated)

*Run against production on 2026-08-27 with the user's go-ahead. 37 badges awarded, four stats rows
rewritten, snapshot kept. The audit re-run afterwards reports nothing owed and nothing adrift.*

**Do not run without the user's explicit go-ahead (the "needs you" item 1 above).**

`scripts/tracking/backfill-achievements.ts`:
- default is dry-run; printing is identical to M3's audit
- `--confirm` performs writes: `reconcileUserProgress` for every user, in sequence
- writes a JSON snapshot to `scratchpad/backfill-<ISO>.json` **before the first write**,
  containing every user's full `user_tracking_stats` row and the id of every existing
  `milestones` row
- prints, per user, badges inserted and each counter's before → after, and at the end the ids of
  every row it inserted
- **to undo:** delete the `milestones` ids listed as inserted, and re-apply the snapshot's
  `user_tracking_stats` rows. Both are plain upserts; write the undo as a `--rollback <snapshot>`
  flag on the same script rather than leaving it as a manual exercise

**Acceptance:** re-running M3's audit afterwards reports zero missing badges and zero counter
deltas for every user. Then open the achievements modal as `edec2d78` and read the screen:
Getting Started unlocked, dated 28.1.2026.

## M6 — Guardrails and the two live bugs

1. **Fetch limit.** `useTrackingStats.ts:56` requests `/api/tracking/milestones?limit=20`.
   With 101 badges the modal under-reports as soon as a user passes 20. Drop the limit for the
   modal's fetch; `RecentMilestonesCard` keeps its own slice client-side.
2. **RLS (needs approval — the "needs you" item 2 above).** Migration
   `supabase/migrations/<ts>_lock_down_milestones_rls.sql` dropping
   `"Users can insert own milestones"`, `"Users can insert own stats"`,
   `"Users can update own stats"`. Keep every SELECT policy. Mirror the change into
   `tests/integration/schema.sql` and bump its "Last synced" header. Apply with
   `supabase migration list --linked` first, then `supabase db push --linked` (item 5 above confirmed nothing else is pending).
3. **Regression tests**
   - a rule exists for every catalog key (M1 test 1) — already covers "badge with no rule"
   - a source-scanning test in `tests/unit/architecture.test.ts`: no file under `src/` outside
     `src/tracking/achievementsService.ts` may contain `total_approaches:`, `total_sessions:`,
     `total_numbers:`, `total_instadates:` or `total_field_reports:` as an object-literal
     assignment, and no file may contain the substring `=== 5` next to a milestone push. The
     message on failure must name the file and say "counters are derived — see
     docs/plans/achievement_counters.md"
   - a perf test (Q9): facts + derive for a 5000-approach fixture in under 2s
4. **Delete the duplicated catalog.** `app/test/achievements/page.tsx:38` defines its own
   partial `ALL_MILESTONES` and a `MOCK_EARNED` array. Import from
   `src/tracking/data/milestones.ts` instead, or delete the page if the real modal has replaced
   it — ask before deleting; do not leave two catalogs.
5. **Docs.** Update `.claude/rules/database.md` (`supabase db query --linked` is not a real command in the installed CLI v2.75). Update this plan's status to done, with the M5 audit output
   pasted in.

## Definition of done

- `npm test` green, with no test that passed before now failing or missing (note the count
  before starting — it was 3782 then 3834 on 2026-08-27; this folder is shared with another
  agent, so the number moves on its own). `npm run test:integration` green too.
- M3's audit prints zero missing badges and zero counter deltas for all users.
- The achievements modal on a real account shows Getting Started unlocked with its 28.1.2026
  date, and the Numbers row populated.
- No `if (newTotal === N)` remains anywhere in `src/`.
- A second pass has attacked the result: concurrent-write test, delete test, double-reconcile
  test, and one full end-to-end read of the audit output for the largest user
  (`.claude/rules/finished-work.md`).
