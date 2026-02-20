# Phase 2.1b: Deep Audit of Dating (Daygame) Templates

**Date**: 2026-02-19
**Status**: Complete audit. All recommendations flagged for user review.
**Scope**: All daygame life area L3 templates, L2 achievements, L1 paths, and their overlap with milestones.ts

---

## 1. Full L3 Inventory

### 1a. Daygame L3 Templates (25 total)

#### Field Work (9 templates)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_approach_volume` | Approach Volume | input | milestone_ladder | `approaches_cumulative` | start:1, target:1000, steps:15 | master_daygame (0.15), confident (0.20), overcome_aa (0.50), master_cold_approach (0.15), attract_any (0.06) |
| `l3_approach_frequency` | Approach Frequency | input | habit_ramp | `approaches_weekly` | 10/wk x12wk, 15/wk x12wk, 25/wk x24wk | master_daygame (0.06), confident (0.10), master_cold_approach (0.15), attract_any (0.04) |
| `l3_session_frequency` | Session Frequency | input | habit_ramp | `sessions_weekly` | 3/wk x48wk | master_daygame (0.04), confident (0.10), attract_any (0.03) |
| `l3_consecutive_days` | Consecutive Days Approaching | input | milestone_ladder | none | start:1, target:30, steps:8 | master_daygame (0.03), confident (0.10), overcome_aa (0.30), attract_any (0.03) |
| `l3_hours_in_field` | Hours in Field | input | milestone_ladder | none | start:1, target:500, steps:12 | master_daygame (0.06), confident (0.10), attract_any (0.04) |
| `l3_voice_notes` | Voice Notes / Field Reports | input | habit_ramp | none | 3/wk x12wk, 5/wk x24wk | master_daygame (0.03), great_talker (0.15), attract_any (0.02) |
| `l3_approach_quality` | Approach Quality Self-Rating | input | habit_ramp | none | 3/wk x12wk, 5/wk x24wk | master_daygame (0.05), master_cold_approach (0.25), attract_any (0.04) |
| `l3_open_in_3_seconds` | Open in <3 Seconds | input | habit_ramp | none | 5/wk x12wk, 10/wk x12wk, 15/wk x24wk | master_daygame (0.03), master_cold_approach (0.20), attract_any (0.03) |
| `l3_solo_sessions` | Solo Sessions | input | habit_ramp | none | 1/wk x12wk, 2/wk x12wk, 3/wk x24wk | master_daygame (0.03), confident (0.10), overcome_aa (0.20), attract_any (0.03) |

#### Results (4 templates)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_phone_numbers` | Phone Numbers | outcome | milestone_ladder | `numbers_cumulative` | start:1, target:25, steps:6 | master_daygame (0.12), confident (0.10), master_cold_approach (0.15), great_talker (0.20), attract_any (0.06) |
| `l3_instadates` | Instadates | outcome | milestone_ladder | `instadates_cumulative` | start:1, target:10, steps:5 | master_daygame (0.08), confident (0.07), master_cold_approach (0.10), great_talker (0.20), attract_any (0.05) |
| `l3_dates` | Dates from Cold Approach | outcome | milestone_ladder | none | start:1, target:15, steps:6 | master_daygame (0.08), confident (0.07), great_talker (0.25), master_seduction (0.20), attract_any (0.05) |
| `l3_second_dates` | Second Dates | outcome | milestone_ladder | none | start:1, target:10, steps:5 | master_daygame (0.05), confident (0.06), master_seduction (0.15), attract_any (0.04) |

#### Dirty Dog (4 templates)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_kiss_closes` | Kiss Closes | outcome | milestone_ladder | none | start:1, target:15, steps:6 | master_daygame (0.05), master_seduction (0.15), attract_any (0.04) |
| `l3_lays` | Lays from Daygame | outcome | milestone_ladder | none | start:1, target:10, steps:5 | master_daygame (0.07), master_seduction (0.25), attract_any (0.06) |
| `l3_rotation_size` | Rotation Size | outcome | milestone_ladder | none | start:1, target:3, steps:3 | master_daygame (0.035), dating_freedom (0.25), attract_any (0.03) |
| `l3_sustained_rotation` | Sustained Rotation | outcome | habit_ramp | none | 1/wk x4wk, 1/wk x8wk, 1/wk x12wk | master_daygame (0.035), dating_freedom (0.20), attract_any (0.03) |

#### Texting (3 templates)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_texting_initiated` | Texting Conversations Initiated | input | habit_ramp | none | 3/wk x12wk, 5/wk x12wk, 7/wk x24wk | master_texting (0.30), attract_any (0.03) |
| `l3_number_to_date_conversion` | Numbers Converted to Dates | outcome | milestone_ladder | none | start:1, target:15, steps:6 | master_texting (0.40), attract_any (0.04) |
| `l3_response_rate` | Texts That Got Replies | outcome | milestone_ladder | none | start:1, target:25, steps:6 | great_talker (0.20), master_texting (0.30), attract_any (0.03) |

#### Dates (4 templates)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_dates_planned` | Dates Planned & Executed | input | habit_ramp | none | 1/wk x12wk, 2/wk x24wk | master_dating (0.30), dating_freedom (0.25), attract_any (0.04) |
| `l3_date_to_second_date` | Second Dates Achieved | outcome | milestone_ladder | none | start:1, target:10, steps:5 | master_dating (0.25), attract_any (0.04) |
| `l3_creative_dates` | Creative Date Ideas Tried | outcome | milestone_ladder | none | start:1, target:10, steps:5 | master_dating (0.15), attract_any (0.03) |
| `l3_physical_escalation` | Physical Escalation on Dates | outcome | milestone_ladder | none | start:1, target:10, steps:5 | master_seduction (0.25), master_dating (0.30), attract_any (0.05) |

#### Relationship (1 template)

| Template ID | Title | Nature | templateType | linkedMetric | Config | Feeds L2s (via edges) |
|---|---|---|---|---|---|---|
| `l3_women_dating` | Women Currently Dating | outcome | milestone_ladder | none | start:1, target:5, steps:5 | dating_freedom (0.30), attract_any (0.06) |

### 1b. Display Categories with Labels

| display_category | CATEGORY_LABEL | # L3s |
|---|---|---|
| `field_work` | Field Work | 9 |
| `results` | Results | 4 |
| `dirty_dog` | Dirty Dog | 4 |
| `texting` | Texting Game | 3 |
| `dates` | Dating | 4 |
| `relationship` | Relationship | 1 |
| **Total** | | **25** |

---

## 2. Real-World Action Mapping

| Template ID | Real-World Action | Frequency | Auto-Trackable? | If Not, Input Method |
|---|---|---|---|---|
| `l3_approach_volume` | Walk up to a stranger and open a conversation | Per approach | YES - from session approach count (cumulative sum) | n/a |
| `l3_approach_frequency` | Same action as above, measured weekly | Weekly | YES - from session data (approaches this week) | n/a |
| `l3_session_frequency` | Go out for a dedicated approaching session | Weekly | YES - session count per week | n/a |
| `l3_consecutive_days` | Approach at least once per day, N days straight | Daily streak | PARTIAL - could derive from session dates, but requires at least 1 approach per session day | Needs daily approach log or session-per-day derivation |
| `l3_hours_in_field` | Time spent physically doing daygame | Per session | PARTIAL - session has duration field if populated | Manual timer or session duration field |
| `l3_voice_notes` | Record an audio debrief after sets | Per session | NO | Manual counter: "How many voice notes did you record?" |
| `l3_approach_quality` | Self-rate your approaches (e.g., 1-10 scale) | Per session | NO | Manual self-rating input per session (or post-set) |
| `l3_open_in_3_seconds` | Open within 3 seconds of seeing target | Per approach | NO | Manual counter per session: "How many <3s opens?" |
| `l3_solo_sessions` | Go out alone (no wingman) | Weekly | PARTIAL - session has wingman field; solo = null wingman | Could auto-derive if wingman field is reliably populated |
| `l3_phone_numbers` | Get a phone number from an approach | Per approach | YES - from approach outcomes (cumulative) | n/a |
| `l3_instadates` | Take a girl for instant coffee/walk right after opening | Per approach | YES - from approach outcomes (cumulative) | n/a |
| `l3_dates` | Go on a scheduled date originating from cold approach | Per date | PARTIAL - if date tracking exists | Manual counter: "Dates this week from cold approach" |
| `l3_second_dates` | Go on a second date with someone from cold approach | Per date | NO - no second-date tracking in sessions | Manual counter |
| `l3_kiss_closes` | Kiss a girl during daygame interaction or date | Per event | NO | Manual counter |
| `l3_lays` | Sleep with a girl from daygame | Per event | NO | Manual counter |
| `l3_rotation_size` | Number of women you're actively seeing | Snapshot | NO | Manual entry: current number |
| `l3_sustained_rotation` | Maintain rotation over consecutive weeks | Weekly check | NO | Manual boolean: "Still maintaining rotation?" |
| `l3_texting_initiated` | Send first text to a new number | Per text | NO | Manual counter |
| `l3_number_to_date_conversion` | Successfully convert a number to a date | Per conversion | NO | Manual counter |
| `l3_response_rate` | Send a text and get a reply | Per text | NO | Manual counter |
| `l3_dates_planned` | Plan and execute a date | Weekly | NO | Manual counter |
| `l3_date_to_second_date` | Convert first date to second date | Per event | NO | Manual counter |
| `l3_creative_dates` | Try a non-standard date (not just drinks) | Per event | NO | Manual counter |
| `l3_physical_escalation` | Escalate physically on a date (hand-hold, kiss, etc.) | Per date | NO | Manual boolean per date |
| `l3_women_dating` | Number of women actively dating | Snapshot | NO | Manual entry: current number |

### Auto-Tracking Summary

- **Fully auto-trackable (5)**: approach_volume, approach_frequency, session_frequency, phone_numbers, instadates
- **Partially auto-trackable (4)**: consecutive_days, hours_in_field, solo_sessions, dates
- **Manual only (16)**: Everything else

**Recommendation**: The 16 manual-only goals need a lightweight input UX. For most, a simple "+1" counter at session end or a weekly check-in screen would work. The self-rating (`approach_quality`) needs a different widget (slider or 1-10 scale).

---

## 3. Overlap Detection

### 3a. Direct Overlaps (same real-world action, different template IDs)

| Pair | Issue | Severity | Recommendation |
|---|---|---|---|
| `l3_second_dates` (Results) vs `l3_date_to_second_date` (Dates) | **Identical real-world action**: both track "second dates achieved." `l3_second_dates` is milestone_ladder (target 10), `l3_date_to_second_date` is also milestone_ladder (target 10, same config). Incrementing one from a second date means you should also increment the other. | **HIGH** | **MERGE**: Remove `l3_date_to_second_date` and keep `l3_second_dates`. Rewire `l2_master_dating` to point at `l3_second_dates` instead. |
| `l3_dates` (Results) vs `l3_dates_planned` (Dates) | **Substantial overlap**: `l3_dates` = "Dates from Cold Approach" (milestone_ladder, target 15). `l3_dates_planned` = "Dates Planned & Executed" (habit_ramp, 1-2/wk). Same real-world action (going on a date), but different tracking types. One counts cumulative total, the other tracks weekly frequency. | **MEDIUM** | **KEEP BOTH but clarify**: `l3_dates` is the cumulative milestone ("total dates ever"), `l3_dates_planned` is the weekly habit ("stay active dating"). Rename `l3_dates_planned` to "Weekly Dating Activity" or similar to distinguish. Add a note that they track the same action but from different angles (volume vs consistency). |
| `l3_approach_volume` vs `l3_approach_frequency` | **Same action, different measurement**: Volume = cumulative lifetime approaches (milestone_ladder to 1000). Frequency = approaches per week (habit_ramp). Both track "doing approaches." | **LOW - Intentional** | **KEEP**: This is the correct milestone_ladder + habit_ramp dual-tracking pattern. Volume measures lifetime progress, frequency measures consistency. No change needed. |
| `l3_rotation_size` vs `l3_women_dating` | **Near-identical**: `rotation_size` = "Rotation Size" (milestone_ladder, target 3). `women_dating` = "Women Currently Dating" (milestone_ladder, target 5). Both are snapshot counts of how many women you're seeing. | **HIGH** | **MERGE**: These measure the same thing. `women_dating` has a higher target (5 vs 3) and broader framing. Keep `l3_women_dating` and rename to "Active Rotation / Women Dating". Remove `l3_rotation_size`. Rewire edges from `l2_master_daygame`, `l2_dating_freedom`, `l2_attract_any` to `l3_women_dating`. |

### 3b. Subset Relationships

| Parent | Subset | Issue |
|---|---|---|
| `l3_approach_volume` (1000 cumulative) | `l3_consecutive_days` (30 days streak) | Consecutive days is a subset of volume in the sense that doing consecutive days will increase volume. But they measure different things (streak vs total). **No action needed.** |
| `l3_session_frequency` (3/wk) | `l3_solo_sessions` (1-3/wk) | Solo sessions are a subset of total sessions. If user does 3 sessions, some may be solo. Tracking makes sense separately since solo sessions build a specific confidence skill. **No action needed.** |

### 3c. Redundancy at Tracking Level

| Pair | Issue | Recommendation |
|---|---|---|
| `l3_voice_notes` vs `l3_approach_quality` | Both are habit_ramp with identical ramp configs (3/wk for 12wk, 5/wk for 24wk). Both are "post-session review" activities. | **DIFFERENTIATE**: Voice notes = audio debrief. Quality rating = numeric self-assessment. Different actions, but users might perceive overlap. Consider merging into a single "Session Review" goal, or keep separate but explain in descriptions that voice notes = qualitative debrief, quality rating = quantitative scoring. |

---

## 4. Gap Detection

All suggestions below are marked as **SUGGESTED -- NEEDS USER REVIEW**.

### 4a. Inner Game Gaps

| Gap | Description | Suggested Template | Category | Type |
|---|---|---|---|---|
| Approach anxiety tracking | No goal for tracking AA level over time. `l2_overcome_aa` links to volume/streak/solo but nothing measures anxiety reduction directly. | `l3_aa_comfort_rating` - "Pre-Session Anxiety Level" (weekly self-rating, track decrease over time) | field_work | habit_ramp |
| State control / warm-up | No goal for getting into "state" before approaching. Many coaches emphasize warm-up routines. | `l3_warmup_routine` - "Warm-Up Routine Completed" (boolean per session) | field_work | habit_ramp |
| Positive self-talk | No goal tracking inner dialogue or affirmation practice. Important for inner game. | Would fit better in `personal_growth` life area. Consider `l3_pg_affirmations` - "Affirmation Practice" | mindfulness (PG) | habit_ramp |
| Reference experience logging | No goal for deliberately noting positive experiences (got a smile, held eye contact, girl laughed). Builds confidence. | `l3_positive_references` - "Positive Reference Experiences Logged" | field_work | habit_ramp |

### 4b. Outer Game Gaps

| Gap | Description | Suggested Template | Category | Type |
|---|---|---|---|---|
| Eye contact training | Fundamental skill, not tracked. Many coaches have eye contact drills. | `l3_eye_contact_holds` - "Eye Contact Holds with Strangers" | field_work | habit_ramp |
| Vocal tonality practice | No goal for voice projection, tonality variation, speaking slowly. | `l3_vocal_practice` - "Vocal Tonality Drills" | field_work | habit_ramp |
| Body language practice | No goal for open body language, posture, etc. | Could be absorbed into `l3_approach_quality` if quality rating criteria include BL. Low priority standalone. | -- | -- |
| Fashion/grooming improvement | Exists in `lifestyle` area (`l3_li_grooming`, `l3_li_wardrobe`), NOT in daygame area. | **No new daygame template needed** -- already covered cross-area. But consider linking `l2_attract_any` to lifestyle grooming L3s as cross-area edges. | -- | -- |

### 4c. Logistics Gaps

| Gap | Description | Suggested Template | Category | Type |
|---|---|---|---|---|
| Venue knowledge | No goal for exploring/cataloging approach venues. Venue rotation keeps things fresh and builds comfort in different environments. | `l3_venues_explored` - "New Approach Venues Tried" | field_work | milestone_ladder |
| Date spot rotation | No goal for building a repertoire of date locations. | `l3_date_spots` - "Date Spot Repertoire" (milestone_ladder, target: 10-15 spots) | dates | milestone_ladder |
| Scheduling efficiency | No goal for how quickly numbers convert to dates (time-to-date). Advanced metric. | Low priority. Could be a derived stat rather than a goal. | -- | -- |

### 4d. Relationship Skills Gaps

| Gap | Description | Suggested Template | Category | Type |
|---|---|---|---|---|
| Emotional intelligence in dating | No dating-specific EQ goal. `l2_pg_eq` exists in personal_growth but no dating context. | Could cross-link PG goals. Not needed as separate daygame template. | -- | -- |
| Conflict resolution | No goal. Relevant for sustained rotation / relationship path. | Low priority for daygame focus. Fits better in a future "relationship management" category. | -- | -- |
| Boundary setting | No goal for setting/maintaining personal boundaries in dating. | `l3_boundaries_set` - "Boundaries Clearly Set" (per relationship situation) | relationship | milestone_ladder |
| Leading / decision-making on dates | No goal for masculine leadership on dates (choosing venue, making plans, leading transitions). | Could be absorbed into `l3_dates_planned` with better description. Or: `l3_date_leadership` - "Dates Where I Led All Logistics" | dates | habit_ramp |

### 4e. Meta-Skills Gaps

| Gap | Description | Suggested Template | Category | Type |
|---|---|---|---|---|
| Review discipline | `l3_voice_notes` exists but no explicit "session debrief" or "weekly review" for daygame specifically. `l3_pg_weekly_reviews` is personal growth, not daygame. | `l3_daygame_weekly_review` - "Daygame Weekly Reviews Completed" | field_work | habit_ramp |
| Peer feedback | No goal for getting feedback from wings or community. | `l3_wing_feedback` - "Wing Feedback Sessions" | field_work | habit_ramp |
| Coaching sessions | No daygame-specific coaching session tracker. `l3_pg_therapy` covers therapy/coaching generically. | Could cross-link `l3_pg_therapy` or add `l3_daygame_coaching` - "Daygame Coaching Sessions" | field_work | habit_ramp |
| Video review | No goal for watching back infield footage or reviewing approach videos. Common deliberate practice method. | `l3_video_review` - "Approach Video Reviews" | field_work | habit_ramp |

### 4f. Gap Priority Summary

| Priority | Gaps to Address |
|---|---|
| **High** (core to daygame improvement) | Eye contact, venue exploration, daygame weekly review, date spot repertoire |
| **Medium** (valuable but niche) | AA comfort rating, wing feedback, positive reference logging, vocal tonality |
| **Low** (nice-to-have or covered elsewhere) | State control, affirmations, body language, conflict resolution, boundary setting, video review |

---

## 5. L1 Path Evaluation (FTO vs Abundance)

### 5a. Current State

The L1 goals are split into two groups:
- **FTO (Find The One)**: `l1_girlfriend`, `l1_dream_girl`, `l1_engaged`, `l1_relationship`, `l1_the_one`, `l1_family`
- **Abundance**: `l1_rotation`, `l1_abundant`, `l1_sleep_x`, `l1_attractive_women`, `l1_casual`, `l1_variety`

**Both paths fan out to ALL 10 L2 achievements equally** (line 1483: `[...L1_ONE_PERSON, ...L1_ABUNDANCE].flatMap(l1 => L2_TEMPLATES.map(l2 => ...))`). There is no L1-path-specific filtering at the edge level.

### 5b. buildPreviewState() Behavior

In `goalsService.ts` line 376-393, `buildPreviewState()`:
- L0/L1: always enabled (structural root)
- L2: default ON, user-toggleable
- L3 `dirty_dog`: default **OFF**
- All other L3: default ON

So the only path differentiation is that `dirty_dog` goals default to OFF, which makes sense for FTO users. But this is a blanket rule, not path-conditional.

### 5c. Which L3s SHOULD Be Path-Specific?

| Template ID | FTO Default | Abundance Default | Rationale |
|---|---|---|---|
| `l3_kiss_closes` | OFF | ON | FTO users focused on one person, not collecting kiss closes |
| `l3_lays` | OFF | ON | FTO: not tracking lay count. Abundance: core metric. |
| `l3_rotation_size` | OFF | ON | Rotation is explicitly an abundance concept |
| `l3_sustained_rotation` | OFF | ON | Same as above |
| `l3_women_dating` | OFF (or target=1) | ON | FTO: dating one woman. Abundance: multiple. |
| `l3_physical_escalation` | ON | ON | Both paths benefit from escalation skills |
| `l3_creative_dates` | ON | ON | Both paths benefit |
| `l3_dates_planned` | ON (lower target) | ON | FTO: fewer dates needed. Abundance: more. |
| All field_work | ON | ON | Both paths need volume/consistency |
| All results | ON | ON | Both paths need numbers/dates |
| All texting | ON | ON | Both paths need texting skills |

### 5d. Current `buildPreviewState` Assessment

The current approach (dirty_dog OFF by default for everyone) is a **reasonable first pass** but misses nuance:
- `l3_women_dating` is in `relationship` category (not dirty_dog), so it defaults ON even for FTO users who don't need "Women Currently Dating: target 5."
- `l3_sustained_rotation` semantically only makes sense for Abundance path.

### 5e. Recommendations

1. **Add path-aware defaults**: `buildPreviewState` should accept the selected L1 template ID. If L1 is from `L1_ONE_PERSON`, also disable `l3_women_dating` (or set target to 1), and disable `l3_sustained_rotation`.
2. **Keep dirty_dog OFF for FTO**: Current behavior is correct.
3. **Consider different target values per path**: FTO `l3_dates` target could be 5 (find the one), Abundance could stay at 15. This could be a `pathDefaults` map keyed by L1 group.

---

## 6. L2 Evaluation (Daygame Achievements)

### 6a. Full L2 Inventory

| L2 ID | Title | # Child L3s | Meaningful Badge? | Overlap with milestones.ts? | Proposed Unlock Threshold |
|---|---|---|---|---|---|
| `l2_master_daygame` | Master Daygame | 17 | YES - broadest achievement, represents overall mastery | Overlaps with: `1000_approaches` (Legend), various number/instadate milestones. But L2 is weighted aggregate, milestones are single-metric thresholds. **Different mechanism.** | 70% weighted progress across all 17 L3s |
| `l2_confident` | Become Confident with Women | 10 | YES - exposure/consistency focused. Earning this = "I've done the reps." | Overlaps conceptually with `approach_anxiety_conquered`, `zone_state`, `flow_state` milestones (Mindset category). Different: milestones are single-session feats, L2 is sustained progress. | 65% weighted progress (exposure-focused, achievable earlier) |
| `l2_overcome_aa` | Overcome Approach Anxiety Permanently | 3 | YES - very focused. Only 3 L3s (volume, consecutive days, solo). High-signal badge. | Overlaps with `approach_anxiety_conquered` milestone. But milestone is "3 approaches in 10 min" (one-time), L2 is sustained. **Complementary.** | 80% weighted progress (narrow scope = higher bar) |
| `l2_master_cold_approach` | Master Cold Approach | 6 | YES - technique mastery (quality + speed + results). | Overlaps with approach/number milestones in milestones.ts but measures quality (approach_quality 25% weight), not just quantity. **Different signal.** | 70% weighted progress |
| `l2_great_talker` | Become Great at Talking to Women | 5 | PARTIALLY - "Great Talker" is vague. What does it mean to earn this? Conversion rates + instadates. | No direct overlap. | 65% weighted progress |
| `l2_master_seduction` | Master Seduction & Attraction | 5 | YES - clear meaning: escalation mastery. | No milestone overlap (milestones.ts has no kiss/lay tracking). **Clean.** | 70% weighted progress |
| `l2_attract_any` | Be Able to Attract Any Woman I Want | 25 (all) | PARTIALLY - too broad. Every L3 contributes. Same as "master everything." Feels redundant with `l2_master_daygame`. | Same overlap concerns as master_daygame. | 60% weighted progress (broad = lower bar per skill) |
| `l2_master_texting` | Master Texting Game | 3 | YES - narrow and clear. Texting is a distinct sub-skill. | No overlap. | 75% weighted progress (only 3 L3s) |
| `l2_master_dating` | Master Dating | 4 | YES - date execution is a distinct phase. | No overlap. | 70% weighted progress |
| `l2_dating_freedom` | Have Total Dating Freedom | 4 | YES - clear Abundance-path badge. Having options. | No overlap. | 75% weighted progress |

### 6b. L2 Issues Found

| Issue | Details | Recommendation |
|---|---|---|
| `l2_attract_any` is near-duplicate of `l2_master_daygame` | Both link to all/most L3s. `attract_any` literally links all 25. `master_daygame` links 17. The difference is just 8 texting/dating/relationship L3s. Achieving one almost implies the other. | **MERGE or DIFFERENTIATE**: Option A: Remove `l2_attract_any` and make `l2_master_daygame` the all-encompassing badge. Option B: Keep both but make `l2_master_daygame` field-work-only (opening + results) and `l2_attract_any` as the "full pipeline" badge (field + texting + dating + relationship). **User decision needed.** |
| `l2_great_talker` is poorly defined | "Great at Talking to Women" links to phone_numbers, instadates, dates, response_rate, voice_notes. These are conversion metrics, not conversation quality. A better name would be "Master Conversational Game" or this should be reworked to include approach_quality. | **RENAME** to "Master Conversational Game" and add `l3_approach_quality` to its edges (with weight). |
| Missing L2 for "inner game" | There's `l2_confident` and `l2_overcome_aa` but no L2 for broader inner game (resilience, mindset, not quitting). The milestones.ts has a whole "Mindset" category (rejection handling, zone state) that has no L2 equivalent. | **SUGGESTED -- NEEDS USER REVIEW**: Add `l2_inner_game_mastery` - "Master Inner Game" linking to: `l3_consecutive_days`, `l3_solo_sessions`, `l3_approach_volume`, `l3_voice_notes`, plus proposed gap templates (AA rating, positive references). |

### 6c. L2 vs milestones.ts Overlap Summary

| milestones.ts Category | Overlapping L2 | Nature of Overlap |
|---|---|---|
| Approaches (first_approach through 5000_approaches) | `l2_master_daygame`, `l2_overcome_aa`, `l2_master_cold_approach` | milestones.ts = single-threshold unlocks. L2 = weighted aggregate. **Complementary, not redundant.** |
| Numbers (first_number through 200_numbers) | `l2_master_daygame`, `l2_master_cold_approach`, `l2_great_talker` | Same complementary pattern. |
| Instadates (first_instadate through 50_instadates) | `l2_master_daygame`, `l2_great_talker` | Complementary. |
| Sessions (first_session through 100_sessions) | `l2_confident` | Complementary. |
| Streaks (2_week_streak through 52_week_streak) | `l2_confident`, `l2_overcome_aa` | Complementary. milestones.ts tracks weekly streaks; L2 tracks broader progress. |
| Mindset (first_rejection through flow_state) | `l2_overcome_aa`, `l2_confident` | **Partial conceptual overlap**: "Fear Slayer" (3 approaches in 10 min) is a single-session feat; `l2_overcome_aa` is sustained. Both signal AA reduction. |
| Social (wing_commander through 25_wingman_sessions) | No L2 overlap | milestones.ts tracks wingman sessions; no L2 achievement for social daygame. |
| Unique Sets | No L2 overlap | milestones.ts tracks set type variety; no L2 for this. |

**Conclusion**: The L2 achievement system and milestones.ts are **complementary systems**. milestones.ts = moment-in-time unlocks from session data. L2 = sustained, weighted progress badges. No merging needed between systems.

---

## Summary of All Recommendations

### Merge (2 actions)

| Action | From | To | Impact |
|---|---|---|---|
| MERGE `l3_date_to_second_date` into `l3_second_dates` | dates category | results category | Remove `l3_date_to_second_date`. Rewire `l2_master_dating` edge to point at `l3_second_dates`. Transfer weight (0.25). |
| MERGE `l3_rotation_size` into `l3_women_dating` | dirty_dog category | relationship category | Remove `l3_rotation_size`. Rename `l3_women_dating` to "Active Rotation / Women Dating". Update target to 5 (keep higher). Rewire all edges. Move to `relationship` or create new `abundance` category. |

### Rename (2 actions)

| Action | Current | Proposed |
|---|---|---|
| RENAME `l3_dates_planned` | "Dates Planned & Executed" | "Weekly Dating Activity" (to differentiate from `l3_dates`) |
| RENAME `l2_great_talker` title | "Become Great at Talking to Women" | "Master Conversational Game" |

### Rewire (2 actions)

| Action | Details |
|---|---|
| Add `l3_approach_quality` to `l2_great_talker` edges | With weight ~0.15, redistribute from other L3s |
| Add `l3_second_dates` to `l2_master_dating` edges | Replacing removed `l3_date_to_second_date` |

### Add (SUGGESTED -- NEEDS USER REVIEW)

| Priority | Template | Category | Type |
|---|---|---|---|
| HIGH | `l3_venues_explored` - "New Approach Venues Tried" (target: 20) | field_work | milestone_ladder |
| HIGH | `l3_daygame_weekly_review` - "Daygame Weekly Reviews" | field_work | habit_ramp |
| HIGH | `l3_eye_contact_holds` - "Eye Contact Holds with Strangers" | field_work | habit_ramp |
| HIGH | `l3_date_spots` - "Date Spot Repertoire" (target: 15) | dates | milestone_ladder |
| MEDIUM | `l3_aa_comfort_rating` - "Pre-Session Anxiety Level" (self-rate decrease) | field_work | habit_ramp |
| MEDIUM | `l3_wing_feedback` - "Wing Feedback Sessions" | field_work | habit_ramp |
| MEDIUM | `l3_positive_references` - "Positive Reference Experiences Logged" | field_work | habit_ramp |
| LOW | `l3_vocal_practice` - "Vocal Tonality Drills" | field_work | habit_ramp |
| LOW | `l3_warmup_routine` - "Warm-Up Routine Completed" | field_work | habit_ramp |
| LOW | `l3_video_review` - "Approach Video Reviews" | field_work | habit_ramp |
| LOW | `l3_date_leadership` - "Dates Where I Led All Logistics" | dates | habit_ramp |
| LOW | `l3_boundaries_set` - "Boundaries Clearly Set" | relationship | milestone_ladder |

### Path-Aware Defaults

| L1 Group | Additional OFF defaults (beyond current dirty_dog OFF) |
|---|---|
| FTO (L1_ONE_PERSON) | `l3_women_dating` should default OFF or target=1; `l3_sustained_rotation` OFF |
| Abundance (L1_ABUNDANCE) | All defaults appropriate as-is |

### L2 Achievement Questions for User

1. Should `l2_attract_any` be removed (redundant with `l2_master_daygame`), or should `l2_master_daygame` be narrowed to field-work-only?
2. Should an `l2_inner_game_mastery` badge be added for mindset/resilience tracking?
3. What % weighted progress threshold should unlock each L2 badge? Proposed defaults are in section 6a.
