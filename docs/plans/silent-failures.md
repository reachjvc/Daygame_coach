# Numbers the app shows when it does not actually know

A sweep on 2026-09-08, after the instruction "if something is broken it should
be shown". Five readers went through the app looking for one specific fault, and
every finding below was then handed to a second agent told to REFUTE it.

**The fault.** A number, a streak, a badge or a list is put in front of a person,
the code that produced it failed, and instead of being told, they are shown a
plausible value. It takes three shapes:

- **wrong-number** — they act on a false figure. "0 of 3 sessions" to somebody
  who trained three times.
- **stale** — a value that is out of date and does not say so.
- **missing** — something silently absent, usually as "you have nothing here yet".

**Why it matters more than an ordinary bug.** A crash is visible and gets
reported. This class is invisible by construction: it looks exactly like the
truth, so nobody reports it, and the person changes what they do because of it.
One of these — a dropped column on 2026-09-07 — had every strength goal reading
an error for a day while every screen said "nothing logged yet".

Counts below are candidate findings, de-duplicated. Fixed ones are marked.


## wrong-number (18)

### Monthly/yearly goal delta shows the LIFETIME total as this month's gain when the snapshot fetch fails

`src/goals/hooks/usePeriodStats.ts:24`

**What a person sees.** Under "This Month" on the goals page, a milestone goal's rollup row reads "+250 (250 total)" in green with an upward-trend arrow. The truth is they gained 12 this month. Both failure paths — a 500 and a network error — produce the same empty array, and an empty array is exactly what a brand-new user legitimately has, so the row is indistinguishable from a real answer.

**How.** A user has a lifetime milestone goal "Approaches" at current_value 250. /api/goals/snapshots 500s (app/api/goals/snapshots/route.ts:27-29). snapshots = []; computeMultiPeriodStats filters to zero rows, so `monthBaseline` is undefined and goalsService.ts:598 sets `monthDelta = goal.current_value` (250), and :604 does the same for yearDelta. PeriodRollupRow prints `{delta > 0 ? "+" : ""}{delta}` next to "({goal.current_value} total)". The person reads a 250-approach month.

**Rendered by** src/goals/components/PeriodRollupRow.tsx:53-73, via DailyActionView.tsx:410


### Achievements screen reports "0 of N unlocked" when the milestones request fails

`src/tracking/hooks/useTrackingStats.ts:64`

**What a person sees.** The Recent Achievements card says "No achievements yet — Start approaching to earn your first!", and tapping View All opens a modal whose header reads "0 of 43 unlocked" with every badge greyed out as locked. Nothing on the page says anything went wrong: `state.error` is set only when the whole Promise.all throws, and ProgressDashboard never renders `state.error` at all (grep for it in ProgressDashboard.tsx returns nothing).

**How.** A user with 23 earned badges opens /dashboard/tracking. /api/tracking/milestones returns 500 (app/api/tracking/milestones/route.ts:22-27 catches any DB error and returns a 500 body). `milestonesRes.ok` is false, milestones becomes [], and the counter renders `{milestones.length} of {Object.keys(ALL_MILESTONES).length} unlocked` = "0 of 43". A person who has been collecting badges for months concludes the account lost them.

**Rendered by** src/tracking/components/dashboard/AchievementsModal.tsx:59 and RecentMilestonesCard.tsx:63-66, via ProgressDashboard.tsx:91-105


### The period rollover wipes a linked goal to 0 and the new safety guard then refuses to put the value back

`src/db/goalRepo.ts:779`

**What a person sees.** "0/10 · auto-tracked" on a goal they have already made progress on this week.

**How.** The rollover deliberately zeroes every linked goal and relies on syncLinkedGoals running straight afterwards to write the real number back — that dependency is stated in the comment at line 772. The new guard changes syncLinkedGoals so that when a metric cannot be read it skips the goal and leaves it "exactly as it was". But inside /api/goals/tree that phrase means "as the roll just left it", which is 0. Concrete case: a Copenhagen user logs six approaches on Monday morning, the week has just turned over, they open the goals page at midday, the roll fires and zeroes the goal, the approach-history query then fails, sync skips, and the card shows 0/10 for a week in which they have already done six. The comment's promise that a failed source no longer rewrites a goal to "no progress" is not true on this path.

**Rendered by** src/goals/components/GoalCard.tsx:185 (via app/api/goals/tree/route.ts:15-16, which runs the roll and the sync back to back in one request)


### A failed fitness query becomes "0 progress" and is written into the goal **[FIXED 2026-09-08]**

`src/db/metricsRepo.ts:425`

**What a person sees.** Their goal card says "0/3 · auto-tracked" with an empty progress bar, exactly as it would if they had not trained all week. The number is not just displayed — it is saved into the database, so it stays wrong on every screen until a later sync happens to succeed.

**How.** A user has the weekly goal "3 gym sessions" backed by the metric gym_sessions_weekly. They trained Monday, Wednesday and Friday. On Saturday the count query against workout_logs errors (a transient connection failure, or the workout_sets/set_kind style of column change that already broke getExerciseMax once). getWorkoutWeeklyCount throws. Promise.allSettled at line 419 catches that rejection and line 425 turns it into null. Because resolveHealthMetrics itself never rejects, the .catch(markFailed(HEALTH_METRICS, ...)) at line 326 never runs, so this metric is absent from the `failed` map. syncLinkedGoals' new guard at goalRepo.ts:889 therefore does not skip the goal, and line 893's `?? 0` writes current_value = 0. Worse: at the Monday roll, resetGoalsForPeriods reads that 0, records was_complete = false in the snapshot the heatmap and the weekly review read, and sets current_streak = 0 (goalRepo.ts:790). A three-week streak is destroyed by a query error. This hole is live for all 27 health-backed metrics — the largest group of linked metrics in the app.

**Rendered by** src/goals/components/GoalCard.tsx:185 (the "x/y · auto-tracked" text) and :177 (the progress bar); src/tracking/components/GoalsSummarySection.tsx:183 in the weekly review


### A health query that fails is written into the goal as 0 and saved to the database **[FIXED 2026-09-08]**

`src/db/metricsRepo.ts:422`

**What a person sees.** A training goal that has been climbing for months resets to zero and stays there. "Bench press 92/100 kg · auto-tracked" becomes "0/100 kg · auto-tracked", 0% progress bar, streak broken. Reloading does not fix it, because the 0 was written into the database — it only recovers if the query succeeds on some later page load and the metric happens to be recomputed.

**How.** The user opens the Goals page. `/api/goals/tree` calls `syncLinkedGoals`, which asks for `bench_press_1rm`. `getExerciseMax` throws — a Postgres timeout, a connection reset, or a column rename like the `is_warmup` → `set_kind` one this very function already survived once. `Promise.allSettled` catches the rejection and writes `out["bench_press_1rm"] = null`. Because `resolveHealthMetrics` uses `allSettled` it never itself rejects, so `markFailed(HEALTH_METRICS, ...)` at metricsRepo.ts:326 never fires and nothing is added to `failed`. In goalRepo the guard `if (metric in failed) continue` therefore does not skip it, and `values[metric] ?? 0` turns the null into 0, which is UPDATEd into `user_goals.current_value`. All 25 health/training metrics are exposed the same way — gym sessions, training hours, consecutive training weeks, pull-up max, running distance, protein days hit.

**Rendered by** src/goals/components/GoalCard.tsx:185 — `${goal.current_value}/${goal.target_value} · auto-tracked`; also GoalsSummarySection.tsx:183, NodeDetailPanel.tsx:51


### The scenario-practice query never checks whether it failed, so a broken read looks like "you have never practised"

`src/db/scenarioRepo.ts:58`

**What a person sees.** A hard "0" on the Practice Runs tile — not a dash, not a message. And their scenario goal card resets to "0/20 · auto-tracked". Nothing on either screen says the number could not be worked out.

**How.** The `error` field of the Supabase response is never destructured. If the query fails for any reason — network blip, a row-level-security change, a renamed column — `rows` and `count` both come back null and the function returns { totalSessions: 0, uniqueTypes: 0, highScoreCount: 0 } as though those were measured facts. Because it returns normally rather than throwing, the new .catch(markFailed(SCENARIO_METRICS, ...)) at metricsRepo.ts:314 never fires, so the `failed` map stays empty. Two things then happen at once: dashboardService.ts:130-133 sees a real number (0) rather than null, so StatTile prints "0" instead of "—"; and syncLinkedGoals writes 0 over the goal's true value. A user with 34 practice runs and a goal of 20 (a template that exists — src/goals/data/goalGraph.ts:324) goes from complete to "0/20" with no explanation. This is the one case in the whole area where a plain fabricated number reaches the screen with no dash and no reason line.

**Rendered by** src/tracking/components/dashboard/StatTile.tsx:41 (the big number on the "Practice Runs" / "Scenario Types" / "Scenario Wins" tiles) and src/goals/components/GoalCard.tsx:185


### A user with no profile row silently gets every weekly tile computed on UTC weeks

`src/db/settingsRepo.ts:162`

**What a person sees.** Weekly tiles (Week Streak is one of the four default tiles) that change over at the wrong hour. For someone in New York, the week rolls at 19:00 on Sunday local time: they open the page on Sunday evening and "Approaches this week" has already dropped to 0 and the Week Streak may read 0, with a full day of the week still to go.

**How.** Precondition: the signed-in user has no profiles row, or its timezone is null. The tracking layout only checks for a session, not a profile, so such a user reaches /dashboard/tracking. getDashboardLayout then passes "UTC" into resolveMetrics, which both reads the weekly counters against UTC week boundaries and calls rollTrackingCounters with them — so this does not just misread the row, it can zero the live week's counters early. The only trace is a console.error the person never sees. Lower confidence than the rest: profiles.timezone is NOT NULL, so this depends on whether a profile row can be missing for a user who can sign in — worth confirming against the live table rather than assuming.

**Rendered by** StatTile.tsx:41 for week_streak (a default tile) and every *_weekly metric, via dashboardService.getDashboardLayout


### A failed history read makes every set of the session announce itself as a personal best **[FIXED 2026-09-08]**

`src/db/workoutRepo.ts:481`

**What a person sees.** The workout summary screen shows a green award panel reading "New best — Squat 60 kg × 5, Bench press 45 kg × 5, Barbell row 40 kg × 5" for a session that was ordinary and, for the squat, 40 kg below what they did last week. Every distinct lift in the session gets a medal.

**How.** The `error` field of this query is never destructured, so a failure is discarded and `data ?? []` hands back an empty history. `detectPersonalRecords` (healthService.ts:226) then builds its baseline from nothing, so the first working set of every exercise clears an empty bar and is pushed as a record. The person cannot tell it apart from the truth because the panel looks identical to a genuine PR announcement and there is no "we could not read your history" anywhere on the screen — and the summary's other numbers (minutes, sets, kg lifted) are all correct, so nothing looks broken.

**Rendered by** src/programs/components/live/FinishSheet.tsx:109-122 — the green "New best" panel on the workout summary


### A failed profile read silently switches a pounds lifter into kilograms **[FIXED 2026-09-08]**

`src/db/workoutRepo.ts:459`

**What a person sees.** A lifter who works in pounds opens a loose workout and their bench, which reads 135 last time, now reads 61.2. They type 135 as usual. The finish sheet says "New best — Bench press 135 kg × 5" and "135 kg lifted", and their bench-press 1RM goal jumps by a factor of 2.2 — permanently, because 135 was stored as 135 kg.

**How.** The `error` from this profiles read is never destructured, so any failure (a transient error, an RLS change) makes `data` null and the function returns the "kg" default rather than the person's actual setting. Every weight on the screen is then converted with the wrong unit in both directions: previously-stored kilograms are displayed raw as if they were pounds-worth of number, and newly typed pounds are stored raw as kilograms. The unit label on screen does change to "kg", which is the only clue — but it is a small label next to numbers the person is mid-workout and not auditing, and the damage (a 135 kg bench in `workout_sets`) survives the transient failure and feeds `getExerciseMax`, the PR history and the strength goals from then on.

**Rendered by** src/programs/components/live/LiveWorkoutScreen.tsx and SetRow.tsx (the weight fields on the live workout screen), src/programs/components/live/FinishSheet.tsx:106 ("{unit} lifted") and :115-121 (the "New best" list)


### A failed snapshots fetch turns a milestone's monthly gain into its lifetime total

`src/goals/hooks/usePeriodStats.ts:24`

**What a person sees.** Under "This Year" on the goals page, a green up-arrow and "+412 (412 total)" against their lifetime approach counter — when what they actually did this year is +37. The number is presented as a period gain in the same row, same colour, same arrow as a real one. There is no way to tell it from a genuinely explosive year. Separately, every weekly/monthly completion row ("5/7 days") disappears, because weekTotal falls to 0 and PeriodRollupRow returns null.

**How.** /api/goals/snapshots returns 500 (its catch returns status 500) or the request fails offline. snapshots becomes [], so computeMultiPeriodStats finds no baseline row and falls through to `yearDelta = goal.current_value` — the whole lifetime total, presented as this year's gain.

**Rendered by** DailyActionView line 410 → PeriodRollupRow mode="delta" (lines 54-73), the green "+N" row under "This Month" / "This Year" on the goals page


### "Week streak" can never exceed 13 because only 90 days of workouts are loaded

`src/health/components/WorkoutLogger.tsx:242`

**What a person sees.** Someone who has trained every single week for a year sees "13w" under "Week streak", and it never moves again no matter how long they keep going. The same person's goal tile, if they have a "consecutive training weeks" goal, reads 52 — the two screens flatly disagree and neither says why.

**How.** `logs` comes from `fetch("/api/health/workout?days=90&include=sets")` (line 99), so it is a 90-day slice — about 13 week buckets. `computeWeekStreak` counts back from this week until it finds a week with nothing in it, and the 90-day window guarantees it runs out of data at week 13-14. Nothing on the card says the streak is windowed; the neighbouring tile is explicitly labelled "Last 90 days" while this one is not, which reads as a promise that the streak is not. The server-side twin `getConsecutiveTrainingWeeks` (src/db/healthRepo.ts:447) reads the whole history, which is why the goal number and the tile number diverge.

**Rendered by** src/health/components/WorkoutLogger.tsx:285-291 — the "Week streak" stat tile


### "New PR" is judged against only the last 90 days of training

`src/health/components/WorkoutLogger.tsx:202`

**What a person sees.** Green banner: "New PR — Deadlift 140kg × 5", when the person pulled 180 kg × 5 five months ago and is currently working back up after an injury. It reads as progress past their best when it is well short of it.

**How.** `logs` is the 90-day window fetched at line 99, and it is the entire baseline handed to `detectPersonalRecords`. Anything last done more than 90 days ago is invisible to the comparison, so the first time you come back to a lift after a lay-off, whatever you do is declared a record. The person cannot tell it apart from a real PR because the banner is the same banner, and no window is mentioned. The live-workout path deliberately uses 400 past workouts for exactly this reason (src/db/workoutRepo.ts:464-474, "the app would announce 'New best' for a lift they had beaten years earlier") — that fix never reached this second PR path.

**Rendered by** src/health/components/WorkoutLogger.tsx:299-312 — the green "New PR — {exercise} {weight}kg × {reps}" banner


### "Protein target hit" counts meals, not days, so a day well over target scores zero

`src/health/healthService.ts:538`

**What a person sees.** "0%" in large type under "Protein target hit", for someone eating four 50 g-protein meals a day — 200 g against a 150 g target, hit every single day for a month. The obvious response is to eat more protein they do not need.

**How.** `computeNutritionStats(data, 150)` is called with a 150 g target, and the comparison runs per LOG ROW rather than per day. A person who logs each meal separately can never clear 150 g in one row, so the rate is 0%. A person who logs one row a day clears it, so the same eating habits produce 0% or 100% depending only on how they type it in. This is the exact bug that was already found and fixed on the server side — see the comment on `getProteinDaysHitWeekly` at src/db/healthRepo.ts:513-523: "This counted rows: two meals over 150g on the same day scored 2, and a day made of three 60g meals — 180g, target hit — scored 0." The fix was applied in the repo only; this second copy in the health slice still has it, and it is the one the person actually reads on the Nutrition card.

**Rendered by** src/health/components/NutritionTracker.tsx:104-107 — the "Protein target hit" percentage tile


### "Sleep debt this week" and "Weekly average" are the last 7 entries, not the last 7 days

`src/health/healthService.ts:163`

**What a person sees.** "Sleep debt: 9.4h this week" on a week in which they slept well on all three nights they logged — the 9.4 hours is mostly carried over from four bad nights logged three weeks ago. The "Weekly average" underneath it is an average over the same 2-3 week stretch.

**How.** `computeSleepStats` is fed a 30-day fetch (SleepTracker.tsx:24, `?days=30`) and takes the last 7 ROWS. Anyone who logs sleep irregularly — three nights one week, none the next, four the week after — gets a window that silently spans weeks while the label says "this week". A person who has genuinely fixed their sleep still sees a large debt figure and concludes they have not. Nothing on the card indicates the window is entry-count based; the number sits under an explicit "this week". The same shape applies to the headline "7-day rolling average" on the Body Weight card (healthService.ts:76-77 taking `entries.slice(-7)`, rendered at WeightTracker.tsx:96-99): a weekly weigher's "7-day rolling average" is a seven-WEEK average, and the velocity and projected target date are derived from it.

**Rendered by** src/health/components/SleepTracker.tsx:86-93 — "{x}h / Weekly average" and "Sleep debt: {y}h this week"


### Field report saves, the goals it should advance silently do not

`src/tracking/components/FieldReportPage.tsx:651`

**What a person sees.** They log a field report with 9 approaches. The report saves and they are navigated on, with either no confirmation at all or "Updated 1 daygame goal with 9 approaches" when two goals should have moved. Days later their weekly approach goal reads "14 / 25" when they actually did 23. Nothing on any screen distinguishes a counter that was never incremented from approaches they never made — and because the field report itself saved successfully, there is nothing to retry and no record that the increment was owed.

**How.** The goals list fetch or an individual increment POST returns 500 (both routes return 500 on a thrown error) while the field report POST succeeded. The loop swallows each failure, the summary message reports only the successes, and the absent message when every increment fails is indistinguishable from "you have no daygame goals linked to approaches".

**Rendered by** The "Updated N daygame goals with M approaches" confirmation on FieldReportPage, and afterwards the goal progress bars on /dashboard/goals and the goal stat tiles


### Weekly Reviews card prints "0 completed" and a 0/4 progress bar when the stats request failed

`src/tracking/components/dashboard/WeeklyReviewsCard.tsx:22`

**What a person sees.** "0 completed • 4 more to unlock monthly" with an empty progress bar. This is a number, not a blank — it is exactly what a person who has never written a review sees. Someone who has written three weekly reviews is told they have written none and are four away from unlocking the monthly review, when they are one away. If they act on it they write reviews they have already written.

**How.** `stats` is null whenever /api/tracking/stats did not return 200 (see finding 1) — an expired session, or getTrackingStatsForDisplay throwing because rollTrackingCounters could not write the roll (trackingRepo.ts:1225 throws on the guarded update error). `null || 0` and `undefined || 0` are indistinguishable from a real 0, and `monthly_review_unlocked` being undefined also re-locks a monthly review the person had already unlocked.

**Rendered by** WeeklyReviewsCard, mounted by ProgressDashboard.tsx:143


### Tracking dashboard treats five failed requests as five empty answers and never shows the error it recorded

`src/tracking/hooks/useTrackingStats.ts:64`

**What a person sees.** On /dashboard/tracking: "Recent Achievements — No achievements yet. Start approaching to earn your first!" under a trophy icon, for a person holding 23 badges. "Weekly Reviews — 0 completed · 4 more to unlock monthly" with an empty progress bar, for a person who has written eleven. Empty Recent Sessions and Recent Field Reports lists. Every one of those is the exact screen a brand-new user gets, so there is nothing on the page that distinguishes "we could not fetch this" from "you have done none of this". The one thing that would distinguish them, state.error, is set to null here and is not rendered anywhere in ProgressDashboard even when the whole fetch throws.

**How.** Any one of the five endpoints returns 500 (each route's catch returns status 500) or 401 after a session expires mid-visit. Say /api/tracking/milestones fails: milestones = [], error stays null, and the achievements card announces "No achievements yet" to someone with 23. The stale value is also written to the module-level statsCache and reused for 30 seconds on every back-navigation.

**Rendered by** ProgressDashboard → RecentMilestonesCard, RecentSessionsCard, RecentFieldReportsCard, WeeklyReviewsCard. ProgressDashboard never renders state.error at all — grep it: the field is set by deleteSession/deleteFieldReport and by the outer catch, and no JSX reads it.


### Badges the app does not recognise are dropped from the count with only a console warning

`src/tracking/trackingService.ts:722`

**What a person sees.** "22 of 60 unlocked" in the All Achievements dialog when they have actually earned 23, and one fewer badge in the Recent Achievements list. The "N more" expander under the card also counts down from the reduced number, so nothing on screen hints that a row was withheld.

**How.** The milestones table holds rows written by earlier builds. Rename or retire one milestone type in src/tracking/data/milestones.ts and every already-awarded badge of that type silently stops counting — the person watches an achievement they earned disappear, and the total they are working towards moves without explanation. The count is rendered straight off the filtered array length, so the display cannot distinguish "not earned" from "dropped on the way to the screen".

**Rendered by** AchievementsModal.tsx:59 ({milestones.length} of {Object.keys(ALL_MILESTONES).length} unlocked) and RecentMilestonesCard.tsx:33-60



## stale (12)

### A period's archive is dropped, then the counter is zeroed anyway — the year rollup under-counts forever

`src/db/goalRepo.ts:966`

**What a person sees.** A rollup row reading "31/34 weeks" for a year in which they actually completed 32 of 35. One completed week has been erased from history and no screen ever mentions it. The comment at rollGoalPeriods (line 767) says "Not swallowed any more" — that is true only under NODE_ENV=test; in production it still returns 0 and the caller carries on to zero the counter at line 778, destroying the period it failed to archive.

**How.** The weekly roll runs, the upsert into daily_goal_snapshots fails (unique-index contention, admin key rotated, transient outage). snapshotGoals logs and returns 0; rollGoalPeriods proceeds to set current_value = 0. That week is gone permanently. Every later render of the year rollup, the completion percentage and the goal's accumulated total is quietly one period short, and re-running does not recover it.

**Rendered by** src/goals/components/PeriodRollupRow.tsx:26-51 (completion counts) and getGoalAccumulatedTotal → StatTile "total" view


### Daily Reflection card says "Not yet today" to somebody who already wrote it

`src/tracking/components/dashboard/DailyReviewCard.tsx:22`

**What a person sees.** The Daily Reflection card reads "Not yet today" with a "Reflect on Today" button, exactly as it does for a person who genuinely has not written one. There is no third state for "we could not check".

**How.** User writes their reflection at 8am. At 9pm the dashboard's status request fails; `status` stays null, so `todayDone` and `todayDraft` are both falsy and the card asserts the reflection was never done. They click through to /dashboard/tracking/daily, where the same swallowed catch (DailyReviewPage.tsx:120 `.catch(() => {})`) means the existing draft is not pre-filled either — so they are shown an empty form for a day they already filled in.

**Rendered by** src/tracking/components/dashboard/DailyReviewCard.tsx:39-45


### Linked goal counters silently stop advancing after a session is logged

`src/tracking/trackingService.ts:753`

**What a person sees.** The session saves and shows its success screen. The goal card still reads "12/20 · auto-tracked" — the words "auto-tracked" are an explicit promise that this number is current. The 8 approaches just logged are missing from it, and the progress bar, the completion tick and any celebration are all computed from the stale figure.

**How.** User ends a session with 8 approaches. syncLinkedGoals throws — goalRepo.ts:858 throws on any fetch error against user_goals. endSession (line 174) awaits syncGoals, which swallows it, and the API route returns 200. The person goes to the goals page and sees last week's count under a label saying it tracks itself. They cannot tell this from "the sync ran and my count really is 12".

**Rendered by** src/goals/components/GoalCard.tsx:185 — `${goal.current_value}/${goal.target_value}${goal.linked_metric && !goal.is_complete ? " · auto-tracked" : ""}`


### The goals page throws away the "could not be read" report, so a stale goal is shown as if it were fresh

`app/api/goals/tree/route.ts:16`

**What a person sees.** A goal number that is out of date, sitting next to the label "auto-tracked", which is a promise that the number is current. There is no dash, no warning, no different colour — a frozen number and a live one look identical.

**How.** syncLinkedGoals was just changed to return { updated, failed } and to deliberately leave a goal alone when its metric could not be read, so the bad zero is no longer written. But this route ignores the return value entirely, and swallows a thrown error into console.error. So when a source is broken, the improvement is invisible: the person opens /goals, the approach-history query has failed, their "10 approaches this week" goal still shows last Tuesday's 4/10 · auto-tracked, and they conclude they have logged 4 approaches this week. The same drop happens at src/tracking/trackingService.ts:753 (after logging a session) and src/scenarios/scenariosService.ts:432 (after a practice run) — in both, the user has just done the thing that should move the number, watches it not move, and is told nothing. The repair to syncLinkedGoals only reaches a screen if a caller passes `failed` on; today none of the three do.

**Rendered by** src/goals/components/GoalsHubContent.tsx:102 fetches this route; src/goals/components/GoalCard.tsx:185 renders the number with the words "· auto-tracked" beside it


### A refused database write on a goal is discarded without a word

`src/db/goalRepo.ts:902`

**What a person sees.** The goal simply does not move. They log five approaches, go to the goals page, and the card still reads "0/10 · auto-tracked". Nothing appears anywhere — not on the card, not on the page, not in the response.

**How.** The metric was computed correctly, but the write back into user_goals is rejected (a row-level-security rule, a check constraint, a dropped connection). The error object is looked at only to decide whether to increment a counter — it is never logged, never thrown, and never added to the `failed` map that the rest of this function now builds. So a permanently broken write is indistinguishable from a metric that genuinely did not change, both to the person and to whoever reads the logs. The /api/goals/sync route (app/api/goals/sync/route.ts:12) reports the run as a success either way.

**Rendered by** src/goals/components/GoalCard.tsx:185 and src/lair/components/widgets/GoalProgressWidget.tsx:248


### A rollover write that fails is counted as a success, leaving last period's number on screen as this period's

`src/db/goalRepo.ts:794`

**What a person sees.** On Monday morning a weekly goal still shows "10/10" with a full green bar and a tick, as if they had already hit this week's target before doing anything.

**How.** The update that zeroes the counter and stamps the new period is fired without ever looking at whether it succeeded, and the function then returns goals.length — the number it intended to roll, not the number it actually rolled. If the write is rejected, the goal keeps last week's count while every other part of the app believes the roll happened. The archive snapshot has already been taken by then (line 767), so the same period is now recorded twice: once in history and once as the live count. A completed goal reads as complete for a week it has not started.

**Rendered by** src/goals/components/GoalCard.tsx:185 and :177; src/tracking/components/GoalsSummarySection.tsx:183


### Practice counts are computed from a capped page of rows while the total uses the real count

`src/db/scenarioRepo.ts:60`

**What a person sees.** "Practice Runs 1,240" next to "Scenario Wins 312", where the wins number stopped growing months ago and never will again.

**How.** totalSessions comes from an exact database count, but uniqueTypes and highScoreCount are worked out in JavaScript from `rows`, and no limit is set on that query — so it gets whatever page size the server allows (1,000 by default on hosted Supabase). Past that point the two numbers on the same screen are measuring different things: the total keeps rising, the wins count is frozen at whatever the first 1,000 rows contained, and a goal linked to scenario_high_scores_cumulative silently stops advancing. The file's own comment at line 49 acknowledges the assumption ("fine for expected volumes (<1000 rows per user)") but nothing detects or reports the moment it stops holding. Lower confidence than the others because it needs a heavy user, and the exact cap depends on the project's PostgREST setting, which is not in this repo.

**Rendered by** src/tracking/components/dashboard/StatTile.tsx:41 ("Scenario Wins", "Scenario Types") and src/goals/components/GoalCard.tsx:185


### The week strip marks a weekday "done" if it was ever trained, in any week

`src/programs/components/ProgramsApp.tsx:236`

**What a person sees.** Monday morning, top of the Training page: the week strip shows a green "done" under Mon, Wed and Fri — before they have trained at all this week. After a two-week break it still says done under all three. After their very first Monday session, every future Monday shows "done" for ever.

**How.** `detail.logs` is the enrollment's complete history — `getSessionLogs` → `sessionLogsFor` (src/db/programRepo.ts:952-963) applies no date filter at all. Mapping it through `isoWeekday` collapses every session ever logged down to a bare 1-7, losing which week it was in, and `WeekStrip` then treats membership in that set as "done this week". The prop's own doc comment says "Days already trained, as ISO weekdays, so the week can show what is done", so the component believes it is being handed this week. The person cannot tell, because a genuinely-completed Monday renders exactly the same green "done" — and it is directly above today's session card, so acting on it means skipping a session they have not done.

**Rendered by** src/programs/components/WeekStrip.tsx:159 and :175 — the green "done" label under each weekday


### A failed refresh after logging a session leaves the previous numbers on screen **[FIXED 2026-09-08]**

`src/programs/hooks/useEnrollment.ts:158`

**What a person sees.** They log Wednesday's session, the form clears and closes as if it saved fine, and the page still shows Wednesday's session as the next one to do, the same weights, and "14 sessions" in the History line. The session did save — the page just never picked it up. Pressing log again is the obvious response, and that writes a second copy of the same workout, which then counts twice towards the streak, the heatmap and any linked goal.

**How.** `onLogged`/`onChanged` call `refresh()`. If that GET returns non-ok, or resolves to a body that fails to parse, `setDetail` is skipped entirely and `loading` goes back to false — so the component leaves the pre-log data in place and looks fully settled. There is no error banner in this hook and no staleness marker on the card. The identical situation with a successful refresh (nothing changed) is indistinguishable, which is precisely why the person concludes the save failed.

**Rendered by** src/programs/components/ProgramsApp.tsx:244-305 — today's session card, the week strip, and the History panel's session count and lift progress


### Time tracker keeps showing the green "Saved" badge while another device's changes never arrive

`src/timetrack/hooks/useTimetrackSync.ts:375`

**What a person sees.** The badge says "Saved", green, which the person reads as "this browser and my account agree". Entries they logged on their phone this morning are not in the list, and the day's and week's totals below are short by those hours. The pill deliberately distinguishes saving / offline / error / signed-out states, so a green "Saved" is a positive claim about being in sync — and a persistently failing pull never changes it.

**How.** /api/timetrack/sync GET returns 500 on every poll (a bad cursor row, a database error). Push still works, so status stays "synced" from the last successful flush; only the incoming direction is dead. The person reads a week total off the screen and reports it, hours short.

**Rendered by** TogglLab lines 626/635/675 — the sync pill reading "Saved" / "Saved to your account" in green


### Tiles built on a goal skip the new failure reporting entirely **[FIXED 2026-09-08]**

`src/tracking/dashboardService.ts:128`

**What a person sees.** A tile on the tracking page showing a confident number — say "4" for a goal they have set as a tile — when the source behind that goal could not be read and the 4 is left over from days ago.

**How.** The `failed` check only runs for catalogue metric ids. A tile whose id is goal:<uuid>:period goes down the second branch and reads goal.current_value straight off the row via readGoalMetric (src/tracking/metricsService.ts:250). That stored value is exactly the one syncLinkedGoals has just declined to update because the metric was unreadable. So the fix that makes the catalogue tile honestly say "Not shown — your training history could not be read" leaves the goal-backed tile sitting next to it printing a stale figure with no mark on it at all. Two tiles for the same underlying source, one truthful and one not, on the same screen.

**Rendered by** src/tracking/components/dashboard/StatTile.tsx:41


### The tracking cache is shared between accounts in one tab, so a second person can be shown the first person's sessions and badges

`src/tracking/hooks/useTrackingStats.ts:24`

**What a person sees.** Recent Sessions, Recent Achievements, Recent Field Reports and the Weekly Reviews counter belonging to whoever used the tab before — presented with no loading state and no refetch, so it looks like their own data.

**How.** The cache is keyed on nothing but the browser tab. Sign-out is a server action ending in redirect("/") (app/actions/auth.ts:12) and sign-in is router.push (app/auth/login/LoginPageClient.tsx:57) — both are in-app navigations, so no page reload clears module state. Person A signs out, person B signs in in the same tab and opens /dashboard/tracking within 30 seconds: the hook seeds from statsCache with isLoading:false and the freshness check returns early, so no request is even made. After 30 s it background-refreshes with no spinner, so A's data is on screen until B's arrives. src/programs/hooks/useEnrollment.ts has the same shape (module-level `store.data`, no user key) for program enrollments. SECURITY: this is one person's activity history rendered inside another person's signed-in session — worth fixing even though it needs a shared device, and invalidateTrackingStatsCache() is currently called only from SessionTrackerPage, never on sign-out or sign-in.

**Rendered by** All four cards under ProgressDashboard.tsx:88-147



## missing (29)

### Training page says "No active program" after a server read error, and never refetches

`app/programs/page.tsx:57`

**What a person sees.** /programs opens on the "Anything else" tab with their running program nowhere on the page; switching to the session tab shows a card reading "No active program. Browse the catalog to start one." with a Browse button. The file's own header comment claims "A failure to resolve is not a failure to render: the client falls back to fetching" — it does not. `useActiveEnrollments(initial)` skips the fetch whenever `initial` is provided (useEnrollment.ts:117 `if (initial) return`), and `[]` is truthy, so the empty list from the failed server read is treated as the authoritative answer.

**How.** listActiveEnrollments throws (connection blip, RLS change, timeout). `active` stays [] and is handed to TrainingScreen, where `tab = initialActive.length === 0 ? "anything" : "session"` (TrainingScreen.tsx:59) opens the wrong tab. A person mid-way through a 12-week program sees it has vanished and can start a duplicate enrollment. The same coercion exists client-side at src/programs/hooks/useEnrollment.ts:78-81 (`const data = res.ok ? await res.json().catch(() => []) : []` / `catch { store.data = [] }`), which produces the identical screen on the goals dashboard.

**Rendered by** src/programs/components/ProgramsApp.tsx:120-127 and TrainingScreen.tsx:59; ActiveProgramsPanel.tsx:19 renders nothing at all


### Fire streak badge disappears when the stats request fails

`src/goals/components/GoalsHubContent.tsx:131`

**What a person sees.** The fire-streak badge is simply not on the page. `weekStreak` is initialised to 0 (line 83) and the badge only renders at `weekStreak >= 2`, so a 14-week streak and a failed request look identical — an absence.

**How.** User on a 14-week streak opens the goals hub; /api/tracking/stats returns non-ok. weekStreak stays 0, the badge is skipped, and the streak they are working to protect appears to have been reset. The identical pattern sits at SessionTrackerPage.tsx:208.

**Rendered by** src/goals/components/GoalsHubContent.tsx:560-561 (FireStreakBadge)


### Health × Daygame panel claims the user has no data when the sessions fetch fails

`src/health/components/CorrelationPanel.tsx:25`

**What a person sees.** Either "Not enough data for correlations yet. Keep logging — insights appear after 2+ weeks" (sessions fetch failed) or "Log health data and daygame sessions to see how they correlate. Need at least 7 days of sleep data and 3 sessions" (sleep fetch failed). Both are statements about what the person has done, and both are false. Nothing distinguishes them from the real empty case.

**How.** A user with 90 days of sleep logs and 40 sessions opens the health page. /api/tracking/sessions times out, `.catch(() => null)` makes sessionsRes null, sessionData stays [], generateCorrelationInsights returns immediately at healthService.ts:571 (`sessionData.length < 3`), and hasData is still true from the sleep rows — so the panel renders the "keep logging" line to somebody who has been logging for three months.

**Rendered by** src/health/components/CorrelationPanel.tsx:79-88 and :101-105


### Weight, Sleep and Nutrition cards all say "No data yet" when their fetch fails

`src/health/components/WeightTracker.tsx:29`

**What a person sees.** "No weight data yet" with a "Log your weight" button, and the 7-day rolling average, the per-week velocity, the projected target date and the plateau warning all silently absent. The identical fault is in SleepTracker.tsx:29 ("No sleep data yet", plus the weekly average and sleep-debt figures vanish) and NutritionTracker.tsx:30.

**How.** A user weighing in daily for three months opens the health page while /api/health/weight is erroring. The thrown error is caught, `logs` stays [] and `trend` stays null, so the card renders its first-run empty state. The person reasonably concludes their weight history was deleted — and if they re-log to "fix" it, they add a duplicate row for today.

**Rendered by** src/health/components/WeightTracker.tsx:94-125; SleepTracker.tsx:84-102; NutritionTracker.tsx


### Weekly Summary widget tells a user with goals to "Add goals"

`src/lair/components/widgets/WeeklySummaryWidget.tsx:58`

**What a person sees.** "Add goals to see your weekly summary" — an onboarding prompt — where the completion rate %, total streak days, best streak and the per-life-area progress bars should be. Byte-for-byte the same as a brand-new account.

**How.** The Lair dashboard loads while /api/goals is failing (or returns non-ok). `goals` stays [], the `goals.length === 0` branch fires, and a person tracking 18 goals is told to create some. GoalsListWidget.tsx:44, TodayGoalsWidget.tsx:26, MissionControlWidget.tsx:420, GoalProgressWidget.tsx:103 and RecentSessionsWidget.tsx:28 share the exact same `if (res.ok)` + `catch { console.error }` shape and produce the same false empty states across the Lair.

**Rendered by** src/lair/components/widgets/WeeklySummaryWidget.tsx:113-120


### "Your lifts over time" and the CSV export vanish on a failed history fetch

`src/programs/components/LiftHistory.tsx:54`

**What a person sees.** The entire "Your lifts over time" section — sparklines, start-to-current weight per lift, the +/- movement — is absent from the Training page, along with the Export CSV button, with no gap or message where it was. `if (!lifts || lifts.length === 0) return null`.

**How.** A user with three years of lifts opens Training; /api/health/workout returns non-ok (the `res.ok ? json() : []` on line 43 does this without any catch at all). The section renders nothing. The card's own copy elsewhere promises "this does not reset when you change program" — so its disappearance reads as data loss. It also removes the only route to their own backup file at the moment they would most want it.

**Rendered by** src/programs/components/LiftHistory.tsx:60 (early return) — section normally at :63-115


### Dashboard says "No sessions yet" / "No field reports yet" when those requests fail

`src/tracking/hooks/useTrackingStats.ts:63`

**What a person sees.** "No sessions yet — Start your first session to begin tracking" and "No field reports yet — Write your first report to reflect on your sessions". These are onboarding messages for a brand-new account, shown to somebody with 200 logged sessions. The failure also poisons the module-level cache (`statsCache = newState`, line 78), so navigating away and back within 30 seconds re-serves the empty answer without another request.

**How.** The user is on hotel wifi that fails one of the five parallel requests, or /api/tracking/sessions 500s. isLoading goes false, error stays null, and the empty arrays render as empty states. There is no retry affordance and no error text anywhere on the screen.

**Rendered by** src/tracking/components/dashboard/RecentSessionsCard.tsx:161-165, RecentFieldReportsCard.tsx:270-272


### Script builder route returns an empty list on error, so saved scripts read as deleted

`app/api/test/scripts/route.ts:23`

**What a person sees.** The saved-scripts list in the script builder is empty. Every conversation script they have written appears to be gone. The response was a 200 with a valid empty array, so the client has nothing to detect — it renders the empty list as the truth. If one script file contains malformed JSON, the Promise.all rejects and every other script disappears along with it.

**How.** A single unparseable .json file in docs/conversation-scripts, or a permissions error on the directory. JSON.parse throws inside Promise.all, the catch returns [] with status 200, and the builder shows no saved scripts at all. The POST handler in the same file gets this right — it returns a 500 with an error — which makes the GET's silent [] the deliberate-looking odd one out.

**Rendered by** app/test/script-builder/ScriptBuilder.tsx:42 — `fetch("/api/test/scripts").then(r => r.json()).then(setSavedScripts).catch(() => {})` — feeding the saved-scripts list in the builder UI


### A failed page load on /programs says the person has no training program

`app/programs/page.tsx:57`

**What a person sees.** The Training page opens on the "Anything else" tab instead of today's session. Tapping "Today's session" shows a dumbbell icon and "No active program. Browse the catalog to start one." Their StrongLifts program, their weights and their whole history appear to be gone. A reasonable next move is to enroll again, which creates a duplicate enrollment.

**How.** Any one of `listActiveEnrollments`, `listPastEnrollments`, `getLiveWorkout`, `getTodaySession` or `getSessionLogs` throws — a transient database error is enough. The catch logs to the server console and leaves `active`, `past` at `[]` and `detail`, `live` at `null`. The file's own header comment claims "A failure to resolve is not a failure to render: the client falls back to fetching" — that is not what happens. `useActiveEnrollments` (src/programs/hooks/useEnrollment.ts:108-119) treats the empty array as a real server answer, because `[]` is truthy: it seeds the store with it, sets `loading` false, and the effect's `if (initial) return` skips the client fetch entirely. So there is no fallback and no retry until a full page reload. An empty list from a broken query is byte-for-byte the same as an empty list from someone who has never started a program.

**Rendered by** src/programs/components/ProgramsApp.tsx:120-127 — "No active program. Browse the catalog to start one."; src/programs/components/TrainingScreen.tsx:59 opens on the wrong tab


### The sets query is capped at 1000 rows, so the CSV "every set ever logged" silently loses most of it

`src/db/healthRepo.ts:256`

**What a person sees.** They press "Export CSV" under "Your lifts over time" — a feature whose own comment calls it "Every set ever logged" — and get a file with roughly the first 1000 sets and no warning. Expanding an old workout in the history list shows "100kg × 5 × 2 sets" for a day they did five sets. The sparkline for a lift can flatten or drop where the heavier later sets were the ones cut.

**How.** PostgREST caps a single response at 1000 rows; this codebase already knows it (src/db/trackingRepo.ts:1313, "Read in pages or lose the tail silently", and src/db/workoutRepo.ts:468). `LiftHistory` asks for 1095 days with sets, so this query fetches every set from three years of training — tens of thousands of rows for a regular lifter — with no `.limit()` and no paging. The cap is applied server-side and returns a normal 200 with no error, so `error` is null and the truncation is invisible. Because the rows are ordered by `set_number` ascending, the cut lands on the highest set numbers across the whole history: the file keeps everyone's set 1 and 2 and drops the back-off and top sets. Nothing on screen says the data is partial.

**Rendered by** src/programs/components/LiftHistory.tsx:74-81 (the Export CSV button) and :92-113 (the "Your lifts over time" sparklines); src/health/components/WorkoutLogger.tsx:613 (each workout's per-exercise summary)


### A health/training query that errors is reported to the user as "Nothing logged for this yet" **[FIXED 2026-09-08]**

`src/db/metricsRepo.ts:419`

**What a person sees.** The tile shows an em dash with the caption "Nothing logged for this yet" underneath — a statement about what the person did, not about the app. Someone who trained four times this week and has a "Gym Sessions (this week)" tile is told they logged nothing.

**How.** Promise.allSettled never rejects, so one broken health source is turned into `null` here and the group-level guard on the caller (metricsRepo.ts:325-327, `.catch(markFailed(HEALTH_METRICS, "your training history could not be read"))`) never fires. The null then reaches dashboardService.ts:131-133, which has no entry in `catalog.failed` for it and falls through to `reason: "Nothing logged for this yet"`. Trigger: any single healthRepo query erroring — e.g. getWorkoutWeeklyCount hitting an RLS change or a column added by an unapplied migration. Note this survives the in-flight three-state fix in dashboardService: that fix catches a whole source group failing, not one query inside the group.

**Rendered by** StatTile.tsx:41-44 (value + metricSubLabel), for any of the 26 HEALTH_METRICS tiles


### The fire-streak badge silently disappears when the stats call fails, on both screens that show it

`src/goals/components/GoalsHubContent.tsx:124`

**What a person sees.** A person on a 9-week streak opens the goals page and the flame badge is gone. Not greyed out, not zero — absent, because the badge is gated on `weekStreak >= 2` and the failed fetch leaves the state at its initial 0. On the session tracker the encouragement line "Your 9-week streak continues!" also vanishes. Both screens look exactly like the screens of somebody who has no streak, which for a streak feature is the one message you must never send by accident.

**How.** /api/tracking/stats returns 500 (route catch, status 500) or 401 on an expired session. `.then(... if (data) ...)` and `.catch(() => {})` both leave weekStreak at 0, and 0 renders as "no badge". The same code is duplicated in SessionTrackerPage, so one bad request blanks the streak on both surfaces at once.

**Rendered by** FireStreakBadge on the goals hub (GoalsHubContent:561) and on the session tracker (SessionTrackerPage:794, 1107)


### The band at the top of the dashboard says "Build your plan" when the one-thing request failed

`src/goals/components/north-star/SeasonBand.tsx:86`

**What a person sees.** Two different lies depending on the browser. On a browser with no local plan: the whole band collapses to "Your plan / Your one thing and the areas this season is about show up here once you have set them" with a "Build your plan" button — i.e. the app tells someone who wrote their one thing that they never did. On a browser that has a plan: the band renders but the one-thing line reads "Nothing named yet".

**How.** The one thing lives on the account and the rest of the plan lives in this browser's localStorage. If /api/life-answers returns 500 or 401, or the request drops, the catch sets it to null, which is the same value as "never wrote one". This is the exact bug the component's own docblock says it was built to fix — "a saved one thing, a new phone, and a header that showed neither" — reappearing whenever the request fails rather than whenever the browser is new.

**Rendered by** SeasonBand.tsx:102-119 (the "no plan" branch) and :146-149 (noFocus), mounted by ProgressDashboard.tsx:80


### Your One Thing disappears from the top of the dashboard and is replaced by an invitation to create one

`src/goals/components/north-star/SeasonBand.tsx:88`

**What a person sees.** The banner across the top of the page they open every day either shows the "build your plan" invitation, or shows the One Thing slot filled with the greyed placeholder instead of the sentence they wrote. Their deadline countdown badge and the nudge prompt both vanish with it. The component's own comment says this exact screen — "a saved one thing, a new phone, and a header that showed neither" — is the bug it was built to fix; the server-error path reproduces it.

**How.** /api/life-answers GET returns 500 (`err("Failed to read your answers")`) on a database hiccup, or the request fails offline. Both the non-ok branch and the catch set oneThing to null, which the render treats as "they have not named one".

**Rendered by** SeasonBand, the band at the very top of /dashboard/tracking


### A failed sessions or sleep fetch tells the person they have not logged enough data

`src/health/components/CorrelationPanel.tsx:28`

**What a person sees.** "Log health data and daygame sessions to see how they correlate. Need at least 7 days of sleep data and 3 sessions." — shown to somebody with 90 days of sleep logs and 40 sessions. Or, if only the sessions call fails, "Not enough data for correlations yet. Keep logging — insights appear after 2+ weeks." Both tell the person their record is too thin when in fact the app could not read it.

**How.** If the sleep endpoint returns non-ok, the function returns early with `hasData` still false, so the card renders its brand-new-user prompt. If only the sessions endpoint fails, `.catch(() => null)` makes `sessionsRes` null, `sessionData` stays `[]`, and `generateCorrelationInsights` bails at its `sessionData.length < 3` guard (healthService.ts:571) and returns no insights — rendering the "keep logging" message. In both cases the copy actively instructs the person to go and produce data they already have, and there is no error state on the card to contradict it.

**Rendered by** src/health/components/CorrelationPanel.tsx:80-91 and :103-106 — the "Health × Daygame" card body


### A failed workout fetch shows 0 sessions, a 0-week streak and an empty activity grid

`src/health/components/WorkoutLogger.tsx:97`

**What a person sees.** Three big numbers reading 0 ("This week"), 0w ("Week streak") and 0 ("Last 90 days"), the activity heatmap gone, and the line "No workouts logged yet" with a button to log their first one — for someone who trained four times this week and has an eleven-week streak.

**How.** `/api/health/workout` returns 500 (its own handler at app/api/health/workout/route.ts:19 catches any repo error and returns "Failed to get workout logs"). The component logs to the browser console, leaves `logs` at its initial `[]`, and turns the loading state off. Everything below is then computed from an empty array: `buildWorkoutHeatmapWeeks([])` gives 91 grey squares, `computeWeekStreak([])` gives 0, `logs.length` gives 0. There is no error message anywhere on the card, and the layout is identical to a genuinely empty account.

**Rendered by** src/health/components/WorkoutLogger.tsx:280-296 (the three stat tiles), :314-321 ("No workouts logged yet"), :573-605 (the 13-week activity grid)


### Lair's Recent Sessions widget reads .sessions off an array, so it says "No sessions yet" to everyone, always

`src/lair/components/widgets/RecentSessionsWidget.tsx:26`

**What a person sees.** The Recent Sessions panel on the Lair board reads "No sessions yet" with a "Start your first session" link, for a person with 200 logged sessions. It is not a failure state at all — the request succeeded. `data` is the array of sessions, `data.sessions` is undefined, so the widget throws the real answer away on every single load and shows the new-user empty state permanently.

**How.** Always, for every user. app/api/tracking/sessions/route.ts line 19 is `return NextResponse.json(sessions)` where sessions is the array from getSessionSummaries — there is no `sessions` key to read. The same endpoint is read correctly as an array by useTrackingStats.ts:65, which is how the two surfaces disagree. The Lair page comment says explicitly "IT IS NOT A MOCK. Same page, same widgets, same real data."

**Rendered by** RecentSessionsWidget lines 47-58 — "No sessions yet / Start your first session" — on the archived-but-live Lair board at /test/archive/lair (widgetRegistry.ts:110)


### Lair goal widgets tell you that you have no goals and no streaks when /api/goals fails

`src/lair/components/widgets/TodayGoalsWidget.tsx:24`

**What a person sees.** Four widgets on the Lair board make four confident statements about the person: "No daily goals set", "Complete goals consistently to build streaks", "No goals yet. Set your first goal!", and a weekly summary of zeros. All four are the new-user copy, all four are shown to somebody with a dozen active goals and a 40-day streak, and none of them mentions that anything went wrong. WeeklySummaryWidget is the worst of the four because it renders computed numbers — a completion rate and a total streak-day count derived from an empty list — rather than an empty state.

**How.** /api/goals returns 500 (route catch at line 24 returns `err("Failed to get goals")`) — for instance because rollGoalPeriods throws on a timezone lookup. All four widgets share the same shape: only the success branch sets state, isLoading flips to false in `finally`, and the initial [] is rendered as fact. Note the sibling GoalsSummarySection.tsx:47-61 does the same thing and returns null, so the goals block silently vanishes from the weekly review page too.

**Rendered by** TodayGoalsWidget lines 98-107 ("No daily goals set. Add a daily goal to track here."); the same pattern in GoalStreaksWidget:70-90 → "Complete goals consistently to build streaks"; GoalProgressWidget:94-106 → "No goals yet. Set your first goal!"; WeeklySummaryWidget:51-63 → an all-zero summary


### Your whole lift history and its CSV export vanish when the workout fetch fails

`src/programs/components/LiftHistory.tsx:54`

**What a person sees.** The Training screen simply has no "Your lifts over time" section. No heading, no chart, no Export CSV button, no message. Three years of lift history looks like a person who has not yet done any lift twice. The card carries a promise in its own comment — "'I lost years of data' is one of the loudest complaints about training apps" — and the failure path is precisely that experience, minus any way to know it is a failure.

**How.** /api/health/workout returns 500 (`err("Failed to get workout logs")`) on a slow query or a database error over the 1095-day range. `r.ok ? r.json() : []` produces an empty log list, liftsWithHistory returns [], and the component's own "nothing to show yet" guard hides everything.

**Rendered by** TrainingScreen line 112 — the "Your lifts over time" card, including its Export CSV button


### A failed lift-history fetch removes the whole "Your lifts over time" section from the page

`src/programs/components/LiftHistory.tsx:43`

**What a person sees.** Nothing at all. The heading, the sparklines and the Export CSV button are simply not on the page. Someone with three years of lifting sees the same Training screen as someone on day one, and the copy they would otherwise read — "this does not reset when you change program" — is absent too, so there is nothing to be suspicious about.

**How.** The 3-year workout fetch returns 500 (a very plausible outcome given the same endpoint has to serialise every set from 1095 days) or the network drops. Both the non-ok branch and the catch set `lifts` to `[]`, and the guard on line 61 then returns `null` for the entire component. The "nothing to say yet" empty state and the "we could not read it" state are the same state, and the second one is the one that hides the CSV export — the feature the file itself describes as the answer to "I lost years of data".

**Rendered by** src/programs/components/LiftHistory.tsx:63-116 — the "Your lifts over time" card and its Export CSV button


### Today's prescribed workout vanishes from the dashboard when the enrollments request fails **[FIXED 2026-09-08]**

`src/programs/hooks/useEnrollment.ts:76`

**What a person sees.** Nothing at all — the panel is simply absent from the page (ActiveProgramsPanel.tsx:19: `if (loading || enrollments.length === 0) return null`). There is no gap, no message, no placeholder. A person following a training program opens the page they open daily and today's prescribed session is not there, which reads as "the program ended" or "nothing scheduled today".

**How.** A 500 from /api/programs/enrollments, a 401 after the session expires, or a dropped connection all produce an empty array, and an empty array is how the panel is told the person has no active program. The panel is deliberately silent in the no-program case, which is exactly what makes the failure case invisible.

**Rendered by** ActiveProgramsPanel.tsx:19, mounted by ProgressDashboard.tsx:137


### A failed session-detail request leaves "Loading session…" on the dashboard forever **[FIXED 2026-09-08]**

`src/programs/hooks/useEnrollment.ts:151`

**What a person sees.** A card headed with their program name that reads "Loading session…" and never changes, for as long as the page is open. The effect that would retry is guarded (`if (detail && detail.enrollment.id === id) return` plus a dependency list that only re-runs on id change), so nothing tries again.

**How.** A 500 or 401 from /api/programs/enrollments/<id> leaves `detail` null while `loading` goes false, and ActiveProgramsPanel.tsx:47 branches on `loading || !detail`. The person is shown a permanent loading state instead of being told the session could not be fetched, and has no way to know a reload would fix it.

**Rendered by** ActiveProgramsPanel.tsx:47-52, mounted by ProgressDashboard.tsx:137


### "No active program. Browse the catalog to start one." is what a failed enrollments fetch looks like **[FIXED 2026-09-08]**

`src/programs/hooks/useEnrollment.ts:78`

**What a person sees.** Week 7 of a 12-week strength program. They open /programs and are told, as a plain statement of fact, "No active program. Browse the catalog to start one." On the tracking dashboard, today's prescribed session card is simply absent. Both are byte-for-byte what somebody with no program sees. The comment above this very function documents this "No active program" bug being fixed once already — for a caching cause, not this one.

**How.** /api/programs/enrollments returns 500 (its catch returns `err("Failed to list enrollments")`, status 500) because of a transient database error, or 401 because the session expired in another tab. The empty list is then cached in the module-level store and shared with every component on the page.

**Rendered by** ProgramsApp line 120-124 ("No active program. Browse the catalog to start one."); ActiveProgramsPanel line 19 (renders nothing, so today's prescribed session vanishes from the tracking dashboard and the goals page); RunningPrograms line 83 (renders nothing)


### A failed enrollments fetch is turned into an empty list of programs **[FIXED 2026-09-08]**

`src/programs/hooks/useEnrollment.ts:77`

**What a person sees.** After ending or starting a program, or after any refresh, the Training page flips to "No active program. Browse the catalog to start one." Every running program disappears from the list at once.

**How.** The user is in a gym with bad signal and taps something that calls `refresh()` — finishing a schedule edit, resuming an archived program. The fetch rejects or returns a 500. Both the non-ok branch and the catch write `store.data = []` and flip `loading` to false, so the screen renders the settled "you have nothing" state rather than an error or the list it was already showing. This is the same empty array a brand-new account produces, so there is nothing on screen that could distinguish them.

**Rendered by** src/programs/components/ProgramsApp.tsx:120-127 ("No active program") and :55 (which decides whether to open straight onto today's session)


### Weekly-review page silently drops the week's numbers and last week's commitment when their fetches fail — and then writes "no commitment" into the saved review

`src/tracking/components/WeeklyReviewPage.tsx:200`

**What a person sees.** They open their weekly review. The box that normally reads "42 approaches · 6 sessions · 3 numbers" is simply not on the page, and the section asking "did you keep last week's commitment?" is not there either. No error, no dash, no explanation — the page looks like a weekly review that just doesn't have those parts. They write the review from memory. Worse: when they submit, the review is saved with previous_commitment = null and commitment_fulfilled = null, so the permanent record now says they made no commitment last week. Weeks later the Weekly Reviews card on the dashboard shows no kept/broken badge for that week, and there is no way to tell it apart from a week where they genuinely never committed to anything.

**How.** /api/tracking/stats and /api/tracking/review/commitment both go through Supabase. A dropped connection or a 500 from either (both routes return 500 on any thrown error) makes statsRes.ok / commitmentRes.ok false. weeklyStats stays null and previousCommitment stays null, both of which the JSX treats as "nothing to show". The person submits the review and the false record is written.

**Rendered by** WeeklyReviewPage — the "This week" stat block (lines 405-460) and the "Last week you committed to…" block (lines 607-615, 717-745)


### Daily Reflection card says "Not yet today" when it could not find out

`src/tracking/components/dashboard/DailyReviewCard.tsx:17`

**What a person sees.** "Daily Reflection — Not yet today" with a "Reflect on Today" button, which is character-for-character what someone who has not written today's reflection sees. A person who wrote their reflection an hour ago is told they did not, and clicking through starts a second one. Yesterday's "one thing for tomorrow" reminder also just disappears from the card.

**How.** /api/tracking/review/daily has no try/catch of its own (route.ts GET lines 7-19), so if getUserReviews throws — any Postgres error — Next returns a 500 and `res.ok` is false; the state stays null and `todayDone`/`todayDraft` are both falsy. Same on a 401 after the session expires, and same on a dropped connection via the empty `.catch(() => {})`. Three different failures and "you haven't reflected today" all render identically.

**Rendered by** DailyReviewCard.tsx:39-44 and 47-58, mounted by ProgressDashboard.tsx:127


### A goal tile claims the metric was removed when it was only the goal-titles request that failed

`src/tracking/hooks/useDashboardLayout.ts:46`

**What a person sees.** A tile such as "127 days without weed" keeps its number but loses its icon and gains the caption "This metric is no longer available" — telling the person the thing they are tracking has been taken out of the app. It has not; only the request that fetches goal titles failed, and a reload fixes it.

**How.** The dashboard is rendered on the server with the tile values already filled in, but goal titles and icons come from a separate client request to /api/goals. If that returns 500 or 401, `state.goals` stays empty, metricDefFor returns null for a goal-derived tile, and StatTile.tsx:27 falls to its "metric was deleted from the build" message. The caption is a definite claim about the product, produced by a transient network failure.

**Rendered by** StatTile.tsx:27 and :44, via StatTileGrid.tsx:60-70


### A failed "is a session running?" check puts the person on the Start Session screen with an active session still open on the server

`src/tracking/hooks/useSession.ts:151`

**What a person sees.** They are 40 minutes into a session with 7 approaches logged, the phone locks, they reopen the tab, and the app shows the clean "Start Session" setup screen — goal presets, location field, the lot — with no error message anywhere. It looks exactly like a person who has not started yet. They press Start; the server refuses or a second session is opened, and the approaches from the first one are not in front of them.

**How.** The tab is restored from bfcache (the pageshow handler re-runs loadActiveSession) or the page is reloaded while /api/tracking/session/active happens to return 500. The route returns 500 on any thrown error, and the network-throw path is the only one that sets an error message — a non-ok HTTP response sets none.

**Rendered by** SessionTrackerPage line 429 `if (!state.isActive)` renders the whole pre-session setup screen; line 448 renders state.error, which this path leaves null


### Every failed tracking request becomes an empty list, and the dashboard says "you have nothing"

`src/tracking/hooks/useTrackingStats.ts:64`

**What a person sees.** The tracking dashboard draws itself as a brand-new account. "No sessions yet — Start your first session to begin tracking", "No achievements yet — Start approaching to earn your first!", "No field reports yet". Nothing anywhere on the page says a request failed: the code explicitly sets error to null on this path, and ProgressDashboard never renders state.error at all (grep for state.error in ProgressDashboard.tsx returns nothing), so even the throw-path error message is invisible.

**How.** The five requests are /api/tracking/stats, /sessions?limit=5, /milestones, /field-report?limit=5, /review?limit=5. Any of them returning a non-2xx is coerced here. Two concrete ways: (1) the sign-in cookie expires while the tab is open — every route answers 401 ("Unauthorized") and on the next mount the page repaints as an empty account; (2) any Postgres error — every repo function behind these routes throws loudly (e.g. trackingRepo.getUserMilestones line 1303: throw new Error(`Failed to get milestones: ...`)) and the route returns 500. A user with 400 approaches and 23 badges is told they have none.

**Rendered by** RecentSessionsCard.tsx:160-165, RecentMilestonesCard.tsx:62-67, RecentFieldReportsCard.tsx:267-272, WeeklyReviewsCard.tsx — all via ProgressDashboard.tsx:88-147


---

# What was fixed on 2026-09-08, and what was not

## Fixed

1. **A query that threw was recorded as "nothing logged".** `resolveHealthMetrics`
   used `Promise.allSettled` so one bad source could not take the others down —
   the right instinct — and then folded a rejection into the same `null` as an
   empty week. That is how the estimated one-rep maxes broke: a migration
   dropped the column they read, both queries threw on every call, and every
   screen said "nothing logged yet" to people who had been training all week.
   Rejections are now reported as failures, separately from absence.
2. **One broken source took every metric down with it.** The sources ran in a
   bare `Promise.all`, so a single failure rejected the whole call and froze the
   progress of every linked goal at once. Each source now fails on its own and
   names the readings it took down.
3. **A failed metric was written into the goal as 0.** `syncLinkedGoals` now
   skips a goal whose metric could not be read, rather than saving a zero over
   a real number.
4. **A tile said "Nothing logged for this yet" when it meant "we could not work
   this out".** Those are different sentences and only one of them is about the
   person. The third state is now carried through and shown in amber with a
   warning icon, so a fault does not read as a week off.
5. **A failed history read made every set a personal best.** In `workoutRepo`
   the error was discarded, so no history came back as an empty history — and
   against a blank past, every set of an ordinary Tuesday is a record. The
   workout still saves; the summary now says it could not check.
6. **A failed profile read silently switched a pounds lifter into kilograms.**
   Same discarded error, defaulting to "kg". There is no safe guess for a unit,
   so it now refuses rather than corrupting the session.
7. **A failed programs fetch said "No active program".** Both failure paths
   emptied the list, so a dropped request offered the catalogue to somebody
   three weeks into a program. The list now keeps what it knew and says it may
   be out of date, with a way to retry.
8. **A refresh was undone by the page it ran on.** Found while testing the
   above: the server's list was re-seeded on every render, not once, so ending a
   program put it straight back.
9. **The write-coverage guard was blind to any function with braces in its
   return type.** It took the body to start at the first `{`, so
   `Promise<{ ... }>` made the "body" the return type. Twenty-three write paths
   were invisible, eleven with no test asserting what they save.

## Not fixed, and what each would take

- **The rollover still shows 0 after a failed first sync.** A period boundary
  zeroes every linked goal on the understanding that the sync immediately after
  writes the real number back. When that sync fails, the guard added above
  leaves the goal at the zero the roll just wrote. Fixing it properly means the
  goals table being able to hold "this value is unknown" as distinct from zero —
  a new column and a decision about how a goal card renders it.
- **The other 50 findings in this file.** They are spread across goals,
  tracking, the dashboard, the lair widgets and the health slice. Each is
  described above with the file, what a person sees, and how to reproduce it.
