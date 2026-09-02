# Every input in the app — first pass

**Status: a draft for you to correct.** Nothing here has been renamed or moved.
It is a list of what exists today, so the next argument is about the list
rather than about a screen.

**Read `WHAT THIS SHOWS` at the bottom first** if you only read one part.

---

## How to read it

Two lists, kept apart on purpose:

- **A field says what it is** — name, type, who writes it, whether it keeps a history.
- **A screen says what it shows** — a short list of field names.

A field never says where it appears. The moment it does, a screen's contents get
decided inside the field's file, and the user can no longer swap them. That
separation is what makes the four dashboard boxes changeable.

Each section starts with the two facts shared by every row in it: **who writes
these** and **where they are stored**. Then the rows carry only what differs.

    NAME      what the code calls it today
    TYPE      text / number / choice / date / list
    SHOWN ON  screens that read it. `?` = not traced yet
    HISTORY   does an old value survive a new one

"this browser" means `localStorage`: one machine, one browser, invisible to the
server and to every other device you own.

---

## A. The Life Mastery plan

Written in the Life Mastery flow (`/dashboard/goals/plan`, the 14-step North Star
flow — the one goal surface the product keeps. The goals hub that used to live at
`/dashboard/goals` is archived at `/test/archive/goals-hub`).
Stored in this browser under `north-star-v1`. **None of it reaches the server.**

```
NAME           TYPE                 SHOWN ON                             HISTORY
-------------  -------------------  -----------------------------------  -------
northStar      text, paragraph      Star tab; Today (as a step target)   -
rungs          text x n             Star tab                             -
horizonYears   choice 5/10/20       Star tab                             -
areas          list                 Wheel; Areas; Focus; Today           -
review         text x n per area    Area dialog; Review tab              -
answers        text x n             the step that asked (see B)          -
currentValues  list                 Values tab                           -
values         list, ordered        Values tab; goal cards               -
goals          records              Goals; Focus; Track; Today           -
routines       records              Systems; Track; Today                -
experiences    list                 Experiences tab                      -
priorityIds    list, ordered        Focus; Track                         -
seasonFocusId  one goal/area id     TRACKING PAGE HEADER; area cards     -
seasonAreaIds  list, ordered        Focus; tracking page header          -
daily          0-10 per area/date   Today; Star (rolling average)        by date
notes          text per date        Today                                by date
logged         step ids per date    Today; Track schedule; header count  by date
fields         your own questions   Today                                -
journal        text per field/date  Today                                by date
subSteps       list                 Today                                -
```

## B. The One Thing step

Written in the One Thing step. Stored in the same browser key, inside `answers`.

```
NAME                TYPE            SHOWN ON                         HISTORY
------------------  --------------  -------------------------------  -------
start:one-thing     text, one line  One Thing step; Focus step echo  -
start:one-why       text            One Thing step                   -
start:one-cost      text            One Thing step                   -
start:one-identity  text            One Thing step                   -
start:one-values    list            One Thing step                   -
start:one-areas     list            One Thing step; Experiences      -
start:next-season   text            Recap                            -
start:commit        text            Commit step                      -
start:commit-date   date            Commit step                      -
start:ideal-day     text            Ideal Day step                   -
start:q:<id>        text            the starter question that asked  -
```

## C. A session

Written in `/dashboard/tracking/session`. Stored on the server in `sessions`, one row each.

```
NAME                   TYPE           SHOWN ON                 HISTORY
---------------------  -------------  -----------------------  -------
goal                   text           session detail; history  yes
goal_met               yes/no         session detail           yes
session_focus          text           session detail           yes
technique_focus        text           session detail           yes
if_then_plan           text           session detail           yes
custom_intention       text           session detail           yes
pre_session_mood       choice         session detail           yes
primary_location       text           session detail; history  yes
with_wingman           yes/no + name  session detail           yes
started_at / ended_at  time           everywhere               yes
```

## D. An approach

Written during a session. Stored on the server in `approaches`, one row each.

```
NAME                  TYPE    SHOWN ON                      HISTORY
--------------------  ------  ----------------------------  -------
outcome               choice  session detail; stats         yes
set_type              choice  session detail                yes
tags                  list    session detail                yes
mood                  choice  session detail                yes
quality               number  stats; goals (linked metric)  yes
note                  text    session detail                yes
voice_note_url        file    session detail                yes
latitude / longitude  number  ?                             yes
```

## E. Field reports and weekly/daily reviews

Written in `/dashboard/tracking/report`, `/review` and `/daily`.
Stored on the server: the answers go into one blob, `field_reports.fields` or
`reviews.fields`. Everything here keeps its history.

This is **the one part of the app that already has a catalog**: 55 questions in
`FIELD_LIBRARY` ([src/tracking/config.ts](../../src/tracking/config.ts)). A
report picks some of them and asks those.

```
CATEGORY       THE QUESTIONS IT HOLDS
-------------  ---------------------------------------------------------------
quick capture  approaches, what_happened, best_moment, what_went_well,
               quick_note
emotional      feeling_now, feelings, mad, sad, glad, self_compassion,
               feels_big, free_write
analysis       why_ended, what_learned, key_takeaway, pattern_check,
               hinge_moment, thirty_seconds_before, not_admitting,
               gap_analysis, root_cause, skill_vs_variance
action         do_differently, intention, if_clause, then_clause, start, stop,
               continue, action_plan, one_focus, experiment
skill          technique, skill_targeted, concentration, feedback, one_moment,
               right_call, perception_gap
context        location, time_of_day, energy, pre_state, helped, hurt
cognitive      automatic_thoughts, distortions, distortions_custom,
               evidence_for, evidence_against, balanced_thought, friend_test,
               five_years, reframe
```

The wrapper around those answers:

```
NAME                   TYPE                 STORED IN
---------------------  -------------------  ----------------------------
title, location, tags  text / list          field_reports.*
approach_count         number               field_reports.approach_count
is_draft, reported_at  yes/no + date        field_reports.*
review_type            choice daily/weekly  reviews.review_type
period_start/_end      date                 reviews.*
previous_commitment    text                 reviews.previous_commitment
commitment_fulfilled   yes/no               reviews.commitment_fulfilled
new_commitment         text                 reviews.new_commitment
```

## F. A goal

Written in the goal form, the goals hub, and the Life Mastery Track step.
Stored on the server in `user_goals`, one row each.

```
NAME              TYPE                  SHOWN ON                         HISTORY
----------------  --------------------  -------------------------------  -------
title             text                  goals hub; Today; weekly review  yes
description       text                  goal card                        yes
motivation_note   text                  goal card                        yes
target_value      number                goals hub; Today; progress bars  yes
current_value     number                goals hub; Today; progress bars  rolls*
period            choice                goals hub                        yes
target_date       date                  goals hub; Today                 yes
life_area         choice                goals hub grouping               yes
category          choice                goals hub grouping               yes
display_category  choice                goals hub grouping               yes
goal_type         choice                goals hub                        yes
goal_nature       choice input/outcome  goals hub                        yes
tracking_type     choice                goals hub                        yes
aligned_values    list                  goal card                        yes
linked_metric     choice of 41          goals hub (auto-counted)         yes
parent_goal_id    goal id               goal tree                        yes
ramp_steps        records               curve editor; Today              yes
milestone_config  record                curve editor                     yes
current_streak    number, derived       goals hub; streak widget         yes
```

`rolls*` — `current_value` is the count for the period named by
`period_start_date`. When the period turns over it goes back to zero and the
finished period is archived in `daily_goal_snapshots`, stamped with the
`period_start_date` of the period that ended rather than the day the roll ran.

That table held 0 rows against 398 goals until 2026-08-27: `snapshotGoals` used
the user-scoped Supabase client against a table whose only RLS policy is SELECT,
so every insert was rejected and the error swallowed. It now uses the admin
client and throws in test. See `docs/plans/counters.md`.

## G. Preferences and profile

Written in `/preferences` and `/dashboard/settings`.
Stored on the server in `profiles`. No history — the current answer replaces
the old one.

```
full_name              age_range_start        age_range_end
experience_level       primary_goal           difficulty
primary_archetype      secondary_archetypes   region
secondary_regions      dating_foreigners      user_is_foreign
timezone               sandbox_settings
```

(`favorite_template_ids` looks like it belongs here but sits on
`user_tracking_stats`.)

## H. Quitting a vice

Written in `/test/quit-vice`. Stored in this browser under `quit-vice-v1`.
**Nothing reaches the server, and it has no route in the real app.**

```
NAME                     TYPE               SHOWN ON                 HISTORY
-----------------------  -----------------  -----------------------  -------
viceId / viceLabel       choice + text      what you are quitting    -
answers                  text per step      the step that asked      -
scales                   number per step    the step that asked      -
lists                    list per step      the step that asked      -
awareness.criteria       choice             awareness step           -
awareness.guess          number             awareness step           -
awareness.usage          number x 4         awareness step           -
safety.*                 yes/no             withdrawal check         -
experiment.days          number             the trial                -
experiment.startDate     date               the trial                -
experiment.hypothesis    text               the trial                -
plans                    list of when/then  tools; tripwire          -
episodes                 event record x 13  payoff + urge summaries  by time
voice / card             text               voices; reasons card     -
stepDone / missionsDone  list               flow progress            -
```

## I. Workout programs

Written in `/programs` and the Life Mastery Systems step.
Stored on the server in `program_enrollments` and `program_session_logs`.

```
NAME                      TYPE                   SHOWN ON              HISTORY
------------------------  ---------------------  --------------------  -------
program_id                choice                 programs page         yes
level                     choice                 programs page         yes
unit_system               choice kg/lb           programs page         yes
oneRepMaxes               number per lift        session prescription  yes
workingWeights            number per lift        session prescription  yes
custom_schedule           weekdays               today session widget  yes
entries                   reps + weight per set  session log; history  yes
rpe                       number                 session log           yes
notes                     text                   session log           yes
durationMin / distanceKm  number                 session log           yes
```

---

# WHAT THIS SHOWS

## 1. "The one thing" is four different things

```
WHERE                            NAME                  WHAT IT ACTUALLY IS
-------------------------------  --------------------  ---------------------------------
Life Mastery, Focus step         plan.seasonFocusId    a goal you starred
Life Mastery, One Thing step     start:one-thing       a sentence you wrote
field catalog, action            one_focus             "ONE thing to work on next"
field catalog, skill             one_moment            "The ONE moment that mattered"
```

The tracking page header reads the first one. Nothing links them, so writing
your one thing in the step named after it changes nothing on the page that
shows it.

## 2. Eleven more concepts answer to several names

```
THE CONCEPT           THE NAMES IT GOES BY TODAY
--------------------  -----------------------------------------------------------
what I intend to do   sessions.goal, sessions.custom_intention,
                      sessions.session_focus, sessions.technique_focus,
                      field intention
how I feel            approaches.mood, sessions.pre_session_mood,
                      fields feeling_now / energy / pre_state,
                      vice episodes[].feelings, plan.daily
a note                approaches.note, field quick_note, plan.notes,
                      vice episodes[].notes, program_session_logs.notes
where I was           sessions.primary_location, field_reports.location,
                      field location, approaches.latitude/longitude,
                      vice episodes[].where
my values             plan.values, plan.currentValues,
                      user_goals.aligned_values, user_values table,
                      start:one-values
my life areas         plan.areas, user_goals.life_area, user_goals.category,
                      user_goals.display_category
if-then plan          sessions.if_then_plan, fields if_clause + then_clause,
                      vice plans[]
what I learned        fields what_learned, key_takeaway, what_went_well
why it matters        user_goals.motivation_note, start:one-why,
                      vice card.reasons
my commitment         reviews.new_commitment, reviews.previous_commitment,
                      start:commit
a streak              user_goals.current_streak,
                      user_tracking_stats.current_streak,
                      user_tracking_stats.current_week_streak
```

## 3. Three storage rules, none of them written down

```
server, with history   sessions, approaches, goals, reports, reviews,
                       milestones, programs, profile
this browser only      the whole Life Mastery plan, the whole vice module
derived on the fly     streaks, averages, "0 of 7 done today"
```

## 4. The list that makes the four boxes swappable already exists

The four stat boxes on the tracking page have their label, icon and column
typed straight into
[QuickStatsGrid.tsx](../../src/tracking/components/dashboard/QuickStatsGrid.tsx),
so nobody can change what they show.

But `LINKED_METRICS` in [goalEnums.ts](../../src/db/goalEnums.ts) already names
**41 countable things**, and every one is already computed — 15 in
`getMetricValue`, the other 26 through the health branch of `syncLinkedGoals`.
It already includes the non-daygame examples:

```
gym_sessions_weekly        training_hours_cumulative    running_sessions_weekly
sleep_hours_avg_weekly     body_weight_current          consecutive_training_weeks
cardio_sessions_weekly     yoga_sessions_weekly         longest_run_km
```

What is missing is not the numbers. It is (a) a human label for each metric,
which today lives nowhere, and (b) somewhere to store which four a given user
picked.

## 5. What this pass did not cover

Covered: everything stored on the server, the 55 catalogued questions, the
Life Mastery plan, the vice module, workout programs.

Not covered: inputs typed straight into a component and belonging to no
catalog — **89 component files** contain a raw `input`, `textarea` or `select`.
That is pass two, and some of them will turn out to be duplicates of rows
above.
