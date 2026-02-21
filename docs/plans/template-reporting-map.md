# Template Reporting Interconnection Map

Maps every L3 goal template to its data source and input method.

**Legend:**
- `Auto-sync (session)`: Updated automatically from session end data via linkedMetric
- `Auto-sync (metric)`: Updated from approach/number tracking metrics via linkedMetric
- `Manual counter`: User taps +1/+5/+10 buttons (GoalInputWidget)
- `Manual entry`: User types direct numeric value
- `Boolean check`: Daily/weekly check-off ("Mark Done")
- `NEEDS BUILD`: No input mechanism exists yet → Phase 5

---

## DAYGAME (23 L3 templates)

### Field Work (9)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_approach_volume | Approach Volume | Auto-sync (session) | `linkedMetric: approaches_cumulative` | Cumulative |
| l3_approach_frequency | Approach Frequency | Auto-sync (session) | `linkedMetric: approaches_weekly` | Weekly reset |
| l3_session_frequency | Session Frequency | Auto-sync (session) | `linkedMetric: sessions_weekly` | Weekly reset |
| l3_consecutive_days | Consecutive Days Approaching | Manual counter | GoalInputWidget | User logs streak |
| l3_hours_in_field | Hours in Field | Manual entry | GoalInputWidget | No auto-tracking |
| l3_voice_notes | Voice Notes / Field Reports | Auto-sync (metric) | `linkedMetric: field_reports_weekly` | Weekly reset |
| l3_approach_quality | Approach Quality Self-Rating | Auto-sync (metric) | `linkedMetric: approach_quality_avg_weekly` | Avg quality from Quick Log (1-10) |
| l3_open_in_3_seconds | Open in <3 Seconds | Manual counter | GoalInputWidget | User logs |
| l3_solo_sessions | Solo Sessions | Manual counter | GoalInputWidget | User logs |

### Results (4)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_phone_numbers | Phone Numbers | Auto-sync (metric) | `linkedMetric: numbers_cumulative` | Cumulative |
| l3_instadates | Instadates | Auto-sync (metric) | `linkedMetric: instadates_cumulative` | Cumulative |
| l3_dates | Dates from Cold Approach | Manual counter | GoalInputWidget | |
| l3_second_dates | Second Dates | Manual counter | GoalInputWidget | Now also feeds l2_master_dating |

### Dirty Dog (3)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_kiss_closes | Kiss Closes | Manual counter | GoalInputWidget | |
| l3_lays | Lays from Daygame | Manual counter | GoalInputWidget | |
| l3_sustained_rotation | Sustained Rotation | Boolean check | GoalInputWidget | Weekly check |

### Texting (3)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_texting_initiated | Texting Conversations Initiated | Manual counter | GoalInputWidget | |
| l3_number_to_date_conversion | Numbers Converted to Dates | Manual counter | GoalInputWidget | |
| l3_response_rate | Texts That Got Replies | Manual counter | GoalInputWidget | |

### Dates (3)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_dates_planned | Weekly Dating Activity | Manual counter | GoalInputWidget | Renamed from "Dates Planned & Executed" |
| l3_creative_dates | Creative Date Ideas Tried | Manual counter | GoalInputWidget | |
| l3_physical_escalation | Physical Escalation on Dates | Manual counter | GoalInputWidget | |

### Relationship (1)

| Template ID | Title | Input Method | Data Source | Notes |
|---|---|---|---|---|
| l3_women_dating | Active Rotation / Women Dating | Manual counter | GoalInputWidget | Merged from l3_rotation_size |

---

## PERSONAL GROWTH (20 L3 templates)

### Mindfulness (5)

| Template ID | Title | Input Method | Notes |
|---|---|---|---|
| l3_pg_meditation | Daily Meditation | Boolean check | |
| l3_pg_gratitude | Gratitude Practice | Boolean check | |
| l3_pg_meditation_hours | Total Meditation Hours | Manual entry | NEEDS BUILD: meditation timer (Phase 5) |
| l3_pg_meditation_streak | Consecutive Meditation Days | NEEDS BUILD | Phase 5: meditation timer |
| l3_pg_breathwork | Breathwork Sessions | Manual counter | |

### Resilience (4)

| Template ID | Title | Input Method | Notes |
|---|---|---|---|
| l3_pg_comfort_zone | Comfort Zone Challenges | Manual counter | |
| l3_pg_cold_exposure | Cold Exposure | Boolean check | |
| l3_pg_challenges_completed | Total Comfort Zone Challenges | Manual entry | |
| l3_pg_cold_streak | Consecutive Cold Exposure Days | NEEDS BUILD | Phase 5: cold exposure logger |

### Learning (4)

| Template ID | Title | Input Method | Notes |
|---|---|---|---|
| l3_pg_books | Books Completed | Manual counter | |
| l3_pg_courses | Courses Completed | Manual counter | |
| l3_pg_study_hours | Study & Learning Hours | Manual counter | |
| l3_pg_reading_hours | Total Reading Hours | Manual entry | |

### Reflection (5)

| Template ID | Title | Input Method | Notes |
|---|---|---|---|
| l3_pg_journal | Journal Entries | Manual counter | |
| l3_pg_weekly_reviews | Weekly Reviews Completed | Boolean check | |
| l3_pg_therapy | Therapy or Coaching Sessions | Manual counter | |
| l3_pg_journal_entries | Total Journal Entries | Manual entry | |
| l3_pg_retreats | Retreat or Workshop Days | Manual counter | |

### Discipline (2)

| Template ID | Title | Input Method | Notes |
|---|---|---|---|
| l3_pg_morning_routine | Morning Routine Completed | Boolean check | |
| l3_pg_routine_streak | Consecutive Perfect Routine Days | NEEDS BUILD | Phase 5: morning routine checklist |

---

## SOCIAL (24 L3 templates)

All manual input — no auto-sync. All use GoalInputWidget.

| Template ID | Title | Category | Input Method |
|---|---|---|---|
| l3_s_social_events | Social Events Attended | social_activity | Manual counter |
| l3_s_new_conversations | Conversations with New People | social_activity | Manual counter |
| l3_s_group_activities | Group Activities | social_activity | Manual counter |
| l3_s_plans_initiated | Plans Initiated | social_activity | Manual counter |
| l3_s_total_events_attended | Total Social Events Attended | social_activity | Manual entry |
| l3_s_friend_hangouts | Friend Calls & Hangouts | friendships | Manual counter |
| l3_s_old_friends | Reach Out to Old Friends | friendships | Manual counter |
| l3_s_deep_conversations | Deep 1-on-1 Conversations | friendships | Manual counter |
| l3_s_quality_time | Quality Time with Close Friends | friendships | Manual counter |
| l3_s_close_friends | Close Friendships Built | friendships | Manual counter |
| l3_s_gatherings | Gatherings & Dinners Hosted | hosting | Manual counter |
| l3_s_organized_activities | Group Activities Organized | hosting | Manual counter |
| l3_s_introductions | Friends Introduced to Each Other | hosting | Manual counter |
| l3_s_events_planned | Events Planned & Executed | hosting | Manual counter |
| l3_s_total_hosted | Total Events Hosted | hosting | Manual entry |
| l3_s_followups | Follow-ups Sent Within 24h | social_skills | Manual counter |
| l3_s_consecutive_social | Consecutive Weeks Being Social | social_skills | NEEDS BUILD |
| l3_s_conversations_total | Total Conversations with Strangers | social_skills | Manual entry |
| l3_s_new_people | New People Met | network | Manual counter |
| l3_s_network_size | Total Network Connections | network | Manual entry |
| l3_s_introductions_received | Introductions Received | network | Manual counter |
| l3_s_mentoring_given | Mentoring Sessions Given | mentorship | Manual counter |
| l3_s_mentoring_received | Mentoring Sessions Received | mentorship | Manual counter |
| l3_s_volunteering | Community & Volunteering Hours | mentorship | Manual counter |

---

## HEALTH & FITNESS (27 L3 templates)

All manual input. NEEDS BUILD items link to Phase 5 workout logger.

| Template ID | Title | Category | Input Method |
|---|---|---|---|
| l3_f_bench_press | Bench Press 1RM (kg) | strength | Manual entry |
| l3_f_squat | Squat 1RM (kg) | strength | Manual entry |
| l3_f_deadlift | Deadlift 1RM (kg) | strength | Manual entry |
| l3_f_overhead_press | Overhead Press 1RM (kg) | strength | Manual entry |
| l3_f_pullups | Pull-ups Max Reps | strength | Manual counter |
| l3_f_gym_frequency | Gym Sessions per Week | training | Manual counter |
| l3_f_total_sessions | Total Training Sessions | training | Manual entry |
| l3_f_consecutive_weeks | Consecutive Weeks Training | training | NEEDS BUILD (workout logger) |
| l3_f_training_hours | Total Hours Training | training | Manual entry |
| l3_f_cardio_sessions | Cardio Sessions per Week | training | Manual counter |
| l3_f_combat_sports | Combat Sports Sessions | training | Manual counter |
| l3_f_protein | Protein Target Hit | nutrition | Boolean check |
| l3_f_meals_prepped | Meals Prepped | nutrition | Manual counter |
| l3_f_water | Water Intake Target Hit | nutrition | Boolean check |
| l3_f_calorie_target | Calorie Target Hit | nutrition | Boolean check |
| l3_f_weight_lost | Weight/Fat Lost (kg) | body_comp | Manual entry |
| l3_f_muscle_gained | Lean Muscle Gained (kg) | body_comp | Manual entry |
| l3_f_body_measurements | Body Measurements Improved | body_comp | Manual counter |
| l3_f_progress_photos | Progress Photos Taken | body_comp | Manual counter |
| l3_f_mobility_sessions | Stretching/Mobility Sessions | flexibility | Manual counter |
| l3_f_yoga | Yoga Sessions | flexibility | Manual counter |
| l3_f_flexibility_hours | Total Flexibility Hours | flexibility | Manual entry |
| l3_f_running_sessions | Running Sessions | endurance | Manual counter |
| l3_f_running_distance | Total Running Distance (km) | endurance | Manual entry |
| l3_f_longest_run | Longest Run (km) | endurance | Manual counter |
| l3_f_cardio_weeks | Consecutive Cardio Weeks | endurance | NEEDS BUILD (workout logger) |
| l3_f_sleep_hours | Sleep Hours Tracked | sleep | Manual entry |

---

## CAREER & BUSINESS (20 L3 templates)

All manual input.

| Template ID | Title | Category | Input Method |
|---|---|---|---|
| l3_w_monthly_income | Monthly Income | income | Manual entry |
| l3_w_side_income | Side Income Monthly | income | Manual entry |
| l3_w_income_streams | Number of Income Streams | income | Manual counter |
| l3_w_networking | Career Networking Actions | income | Manual counter |
| l3_w_net_worth | Net Worth Milestones | saving | Manual entry |
| l3_w_savings_rate | Budget Reviews Completed | saving | Manual counter |
| l3_w_emergency_fund | Emergency Fund (Months) | saving | Manual entry |
| l3_w_spending_discipline | No-Spend Days per Week | saving | Manual counter |
| l3_w_portfolio | Investment Portfolio Value | investing | Manual entry |
| l3_w_education | Financial Education Hours | investing | Manual counter |
| l3_w_diversification | Asset Classes Invested In | investing | Manual counter |
| l3_w_returns_tracked | Portfolio Review Sessions | investing | Manual counter |
| l3_w_skills | Professional Skills Acquired | career_growth | Manual counter |
| l3_w_certifications | Certifications Earned | career_growth | Manual counter |
| l3_w_deep_work | Deep Work Sessions per Week | career_growth | Manual counter |
| l3_w_learning | Career Learning Sessions | career_growth | Manual counter |
| l3_w_public_speaking | Public Speaking Events | career_growth | Manual counter |
| l3_w_side_revenue | Side Project Revenue | entrepreneurship | Manual entry |
| l3_w_customers | Paying Customers | entrepreneurship | Manual counter |
| l3_w_products_launched | Products/Services Launched | entrepreneurship | Manual counter |

---

## VICES & ELIMINATION (17 L3 templates)

| Template ID | Title | Category | Input Method |
|---|---|---|---|
| l3_v_porn_free_days | Porn-Free Days | porn_freedom | Manual entry |
| l3_v_nofap_streak | NoFap Streak | porn_freedom | NEEDS BUILD (accountability check-in) |
| l3_v_porn_free_sustained | Porn-Free Weeks Sustained | porn_freedom | Boolean check |
| l3_v_urge_journal | Urge Journaling Sessions | porn_freedom | Manual counter |
| l3_v_screen_time | Screen Time Under Target | digital_discipline | Boolean check |
| l3_v_social_media_free | Social Media Free Days | digital_discipline | Manual counter |
| l3_v_no_gaming | No-Gaming Days per Week | digital_discipline | Manual counter |
| l3_v_dopamine_detox | Dopamine Detox Days | digital_discipline | Manual counter |
| l3_v_screen_streak | Consecutive Days Under Screen Limit | digital_discipline | NEEDS BUILD (screen time tracker) |
| l3_v_alcohol_free | Alcohol-Free Days per Week | substance_control | Manual counter |
| l3_v_sober_days | Consecutive Sober Days | substance_control | NEEDS BUILD (sobriety tracker) |
| l3_v_smoke_free | Smoke-Free Days | substance_control | Manual entry |
| l3_v_clean_eating | Clean Eating Days | substance_control | Manual counter |
| l3_v_junk_food_free | Junk Food Free Days | self_control | Manual counter |
| l3_v_impulse_free | Impulse Purchase Free Weeks | self_control | NEEDS BUILD (spending blocker) |
| l3_v_no_late_scrolling | Late Night Scrolling Free Days | self_control | Boolean check |
| l3_v_budget_days | Stuck to Budget Days | self_control | Boolean check |

---

## Summary

| Input Method | Count | Notes |
|---|---|---|
| Auto-sync (session/metrics) | 7 | Daygame: approaches, sessions, numbers, instadates, field reports, quality |
| Manual counter | ~70 | +1/+5/+10 buttons |
| Manual entry | ~30 | Direct numeric input |
| Boolean check | ~25 | Daily/weekly "Mark Done" |
| **NEEDS BUILD** | **~9** | Phase 5 widgets required |

### Phase 5 Build Dependencies

| Widget | Templates It Feeds | Phase |
|---|---|---|
| Meditation timer | l3_pg_meditation_hours, l3_pg_meditation_streak | 5.3 |
| Workout logger | l3_f_consecutive_weeks, l3_f_cardio_weeks | 5.1 |
| Vice streak tracker | l3_v_nofap_streak, l3_v_sober_days, l3_v_screen_streak | 5.4 |
| Morning routine checklist | l3_pg_routine_streak | 5.2 |
| Social activity aggregator | l3_s_consecutive_social | 5.5 |
| Spending blocker | l3_v_impulse_free | 5.4 |
