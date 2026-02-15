# Expanding Goals — Life Areas & Goal Hierarchy

## Status: DRAFT — Awaiting User Review

---

## Strategy

**Two tiers of goal support:**

1. **Curated + auto-tracked** — Full L1→L2→L3 graph with fan-out, achievement weights, and auto-tracking from widgets (field reports, future fitness tracker, etc.). Only built where we have tracking infrastructure.

2. **Manual + suggestion-powered** — User creates their own hierarchy. We provide good L2 suggestions and L3 templates per life area. No graph wiring or achievement weights — just parent-child goals with manual tracking. Available for ALL life areas from day one.

The L2/L3 brainstorm below serves double duty: curated templates for tier 1 areas, suggestion library for tier 2 areas.

**Expansion sequence:**
1. **Now:** Enrich daygame/dating L2s (already have tracking) + ship L2/L3 suggestions for all other areas
2. **Next:** Build fitness/health tracking widget → upgrade Health & Appearance to curated tier
3. **Later:** Each new tracking widget unlocks another curated area

---

## Source Material

L2/L3 brainstorm originates from `better_goals.md` (deleted in commit `69e8804`). That doc had ~25 L2 goals across 4 sub-categories but only 2 shipped ("Master Daygame" + "Become Confident with Women"). This plan brings in the rest (minus meta: coach/mentor, document journey).

Also incorporates deferred items from better_goals.md:
- More L3 goals (hours in field, voice notes, texting, dates planned)
- Differentiate L1 flavors ("one person" vs "abundance" get different default sub-goals)
- Differentiate achievement weights ("Master Daygame" = results-heavy, "Become Confident" = exposure/consistency-heavy)

---

## Part 1: MECE Audit of Life Areas

### Current Categories (10)
| # | ID | Name |
|---|-----|------|
| 1 | `daygame` | Daygame |
| 2 | `dating` | Dating & Relationships |
| 3 | `health_fitness` | Health & Fitness |
| 4 | `career_business` | Career & Business |
| 5 | `social` | Social Life |
| 6 | `personal_growth` | Personal Growth |
| 7 | `finances` | Finances |
| 8 | `mindfulness` | Mindfulness & Spirituality |
| 9 | `education` | Education & Skills |
| 10 | `custom` | Custom |

### Problems

**Overlaps:**
1. **Personal Growth vs Mindfulness** — meditation in both, journaling/gratitude ambiguous
2. **Personal Growth vs Education** — reading in both
3. **Career vs Education** — study/reading overlap
4. **Daygame vs Dating** — one pipeline split across two (defensible but fuzzy)

**Gaps:**
- No home for inner game / mindset / confidence work (the Inner Game module has no life area)
- Style, grooming, physical presentation not covered
- Lifestyle / experiences / hobbies not covered

### Proposed Resolution

Merge overlapping categories. Inner game folds into a broader Personal Growth. Style/grooming folds into Health & Fitness (body + presentation = one "look & feel" bucket). Mindfulness absorbed into Personal Growth. Education absorbed into Personal Growth.

| # | ID | Name | What changed |
|---|-----|------|-------------|
| 1 | `daygame` | Daygame | KEEP |
| 2 | `dating` | Dating & Relationships | KEEP |
| 3 | `health_fitness` | Health & Appearance | RENAME — now includes style, grooming, physical presentation alongside gym/nutrition/sleep |
| 4 | `career_business` | Career & Business | KEEP |
| 5 | `social` | Social Life | KEEP |
| 6 | `personal_growth` | Personal Growth | EXPANDED — absorbs Mindfulness, Education, Inner Game. Big bucket: mindset, learning, meditation, journaling, reading, skills, confidence work |
| 7 | `finances` | Finances | KEEP |
| 8 | `lifestyle` | Lifestyle | NEW — replaces Mindfulness slot. Travel, hobbies, experiences, adventures, living situation |
| 9 | `custom` | Custom | KEEP as escape hatch |

**Net result: 8 named categories + Custom = 9 total.** Down from 10. Cleaner, no overlaps, no gaps.

**MECE check:**
- Daygame vs Dating: approach methodology vs relationship pipeline — ME ✓
- Health & Appearance vs Personal Growth: body/looks vs mind/learning — ME ✓
- Career vs Finances: earning/building vs managing money — ME ✓
- Social vs Lifestyle: people vs experiences — ME ✓
- Personal Growth covers: inner game, mindfulness, education, reading, journaling, meditation, confidence — CE ✓
- Health & Appearance covers: gym, nutrition, sleep, style, grooming, skincare — CE ✓
- Lifestyle covers: travel, hobbies, home, adventures — CE ✓

---

## Part 2: L2 Goals — The Full Brainstorm

### Tier 1: Curated (Daygame + Dating)

These get the full graph treatment — fan-out edges, achievement weights, auto-tracking where field report data exists.

#### Daygame L2s

| ID | Title | Status |
|----|-------|--------|
| `l2_master_daygame` | Master Daygame | EXISTS |
| `l2_confident` | Become Confident with Women | EXISTS |
| `l2_overcome_aa` | Overcome Approach Anxiety Permanently | NEW |
| `l2_master_cold_approach` | Master Cold Approach | NEW |
| `l2_great_talker` | Become Great at Talking to Women | NEW |
| `l2_master_seduction` | Master Seduction / Attraction | NEW |
| `l2_attract_any` | Be Able to Attract Any Woman I Want | NEW |

#### Dating L2s

| ID | Title | Status |
|----|-------|--------|
| `l2_master_dating` | Master Dating | NEW |
| `l2_master_texting` | Master Texting Game | NEW |
| `l2_master_online_dating` | Master Online Dating | NEW |
| `l2_dating_freedom` | Have Total Dating Freedom | NEW |
| `l2_never_worry` | Never Worry About Dating Again | NEW |

### Tier 2: Suggestion Library (all other areas)

These are NOT wired into a graph. They appear as suggestions when a user creates goals in that life area. User builds their own hierarchy manually.

#### Personal Growth L2 suggestions

| ID | Title |
|----|-------|
| `l2_become_man` | Become the Man I Want to Be |
| `l2_no_fear` | Never Fear Rejection Again |
| `l2_worthy` | Feel Worthy of Love / Attractive |
| `l2_self_worth` | Develop Unshakeable Self-Worth |
| `l2_masculine_frame` | Develop Masculine Frame / Leadership |
| `l2_naturally_attractive` | Become "Naturally" Attractive |

#### Social L2 suggestions

| ID | Title |
|----|-------|
| `l2_socially_fearless` | Become Socially Fearless |
| `l2_master_night_game` | Master Night Game |
| `l2_master_social_circle` | Master Social Circle Game |

#### Health & Appearance L2 suggestions

| ID | Title |
|----|-------|
| `l2_women_approach` | Be the Guy Women Approach |
| `l2_max_physical` | Maximize Physical Attractiveness |

#### Lifestyle L2 suggestions

| ID | Title |
|----|-------|
| `l2_attractive_lifestyle` | Build an Attractive Lifestyle |

#### Career & Finances

No curated L2s yet. Users create their own. Could add later.

---

## Part 3: L3 Goals — Existing + New

### Tier 1: Curated L3s (auto-tracked or graph-wired)

#### Existing L3 — Daygame (all shipped)

| L3 Goal | Type | Category |
|---------|------|----------|
| Approach Volume | milestone_ladder (1→1000) | field_work |
| Approach Frequency | habit_ramp (10→25/wk) | field_work |
| Session Frequency | habit_ramp (3/wk) | field_work |
| Consecutive Days Approaching | milestone_ladder (1→30) | field_work |
| Phone Numbers | milestone_ladder (1→25) | results |
| Instadates | milestone_ladder (1→10) | results |
| Dates from Cold Approach | milestone_ladder (1→15) | results |
| Second Dates | milestone_ladder (1→10) | results |
| Kiss Closes | milestone_ladder (1→15) | dirty_dog |
| Lays from Daygame | milestone_ladder (1→10) | dirty_dog |
| Rotation Size | milestone_ladder (1→3) | dirty_dog |
| Sustained Rotation | habit_ramp | dirty_dog |

#### New L3 — Daygame (deferred from better_goals.md)

| L3 Goal | Type | Why |
|---------|------|-----|
| Hours in Field | milestone_ladder | Total time invested, not just set count |
| Voice Notes / Field Reports | habit_ramp | Self-coaching loop |
| Approach Quality Self-Rating | habit_ramp | Deliberate practice, not just volume |
| Open in <3 Seconds | habit_ramp | 3-second rule consistency |
| Solo Sessions | habit_ramp | Independence from wings |

#### New L3 — Dating

| L3 Goal | Type | Category |
|---------|------|----------|
| Texting Conversations Initiated | habit_ramp | Texting |
| Number-to-Date Conversion Rate | milestone_ladder | Texting |
| Response Rate (% numbers that reply) | milestone_ladder | Texting |
| Dates Planned / Executed | habit_ramp | Dates |
| Date-to-Second-Date Conversion | milestone_ladder | Dates |
| Physical Escalation on Dates | milestone_ladder | Dates |
| Creative Date Ideas Tried | milestone_ladder | Dates |
| Women Currently Dating | milestone_ladder | Relationship |

### Tier 2: L3 Suggestion Templates (manual tracking)

These appear as suggestions when creating sub-goals. User picks what's relevant, tracks manually.

#### Personal Growth L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Meditation Minutes Per Day | habit_ramp | Mindset |
| Journal Entries Per Week | habit_ramp | Self-Reflection |
| Books Read Per Month | milestone_ladder | Learning |
| Pages / Reading Minutes Per Day | habit_ramp | Learning |
| Course Modules Per Week | habit_ramp | Learning |
| Comfort Zone Challenges Per Week | habit_ramp | Growth |
| Days Without Negative Self-Talk Spiral | milestone_ladder | Mindset |
| "Rejected But Kept Going" Count | milestone_ladder | Resilience |
| Therapy / Coaching Sessions Per Month | habit_ramp | Support |
| Skill Practice Minutes Per Day | habit_ramp | Learning |

#### Health & Appearance L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Gym Sessions Per Week | habit_ramp | Training |
| Body Weight Target | milestone_ladder | Body Comp |
| Body Fat % Target | milestone_ladder | Body Comp |
| Protein Intake Daily | habit_ramp | Nutrition |
| Sleep Hours Per Night | habit_ramp | Recovery |
| Steps Per Day | habit_ramp | Activity |
| Run Distance Per Week | habit_ramp | Cardio |
| Consecutive Gym Weeks (streak) | milestone_ladder | Consistency |
| Skincare Routine Adherence | habit_ramp | Grooming |
| Haircut Frequency | habit_ramp | Grooming |
| Wardrobe Upgrade Sessions | milestone_ladder | Style |

#### Social L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Social Events Per Week | habit_ramp | Volume |
| Friends Called / Messaged Per Week | habit_ramp | Maintenance |
| New People Met Per Month | milestone_ladder | Expansion |
| Events Hosted Per Month | habit_ramp | Leadership |
| Conversations With Strangers (non-daygame) | habit_ramp | Social Comfort |

#### Lifestyle L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| New Experiences Per Month | milestone_ladder | Adventure |
| Trips / Weekend Getaways Per Quarter | milestone_ladder | Travel |
| Hobbies Practiced Per Week | habit_ramp | Interests |
| "First Time Doing X" Count | milestone_ladder | Novelty |

#### Career & Business L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Deep Work Hours Per Day | habit_ramp | Focus |
| High-Value Tasks Per Day | habit_ramp | Output |
| Revenue / Income Milestones | milestone_ladder | Financial |
| Side Project Hours Per Week | habit_ramp | Building |
| Networking Meetings Per Month | habit_ramp | Connections |

#### Finances L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Monthly Savings Amount | habit_ramp | Saving |
| Expense Tracking Adherence | habit_ramp | Awareness |
| Net Worth Milestones | milestone_ladder | Wealth |
| No Impulse Purchases Streak (days) | milestone_ladder | Discipline |
| Budget Review Per Week | habit_ramp | Management |

---

## Part 4: Curated Fan-Out Edges (Tier 1 only)

Which L3 goals feed into which L2 achievements? Only for daygame/dating where we have the full graph.

### Daygame L2 → L3

**Master Daygame** → all existing L3s + Hours in Field, Voice Notes, Approach Quality
**Become Confident with Women** → all existing L3s + Hours in Field, Solo Sessions, "Rejected But Kept Going"
**Overcome Approach Anxiety** → Approach Volume, Consecutive Days, Comfort Zone Challenges, "Rejected But Kept Going", Meditation
**Master Cold Approach** → Approach Volume, Approach Frequency, Approach Quality, Open in <3s, Phone Numbers, Instadates
**Great Talker** → Phone Numbers, Instadates, Dates, Response Rate, Voice Notes
**Master Seduction** → Kiss Closes, Lays, Physical Escalation, Dates, Second Dates
**Attract Any Woman** → all field work + all results + Physical Attractiveness metrics

Note: some L2s pull L3s from other life areas (e.g., "Overcome AA" pulls Meditation from Personal Growth, "Attract Any Woman" pulls from Health). This is by design — the graph edges cross life area boundaries.

### Dating L2 → L3

**Master Texting** → Texting Conversations, Response Rate, Number-to-Date Conversion
**Master Dating** → Dates Planned, Date-to-Second-Date, Creative Dates, Physical Escalation
**Master Online Dating** → *(needs online-specific L3s — deferred for now)*
**Dating Freedom / Never Worry** → Women Currently Dating, Dates/month, Rotation Size

---

## Part 5: Cross-Area L3 Sharing

Some L3 goals naturally feed into L2s across multiple life areas. These L3s have a "home" life area (where they show in the UI) but connect to L2 achievements elsewhere via graph edges.

| L3 Goal | Home Area | Also feeds into |
|---------|-----------|----------------|
| Meditation | Personal Growth | Daygame → Overcome AA |
| Comfort Zone Challenges | Personal Growth | Daygame → Overcome AA, Social → Socially Fearless |
| "Rejected But Kept Going" | Personal Growth | Daygame → Overcome AA, Become Confident |
| Gym Sessions | Health & Appearance | Personal Growth → Masculine Frame |
| Approach Volume | Daygame | Personal Growth → No Fear of Rejection |

This means: when a user activates "Overcome Approach Anxiety" (daygame L2), the system could suggest "add Meditation to your goals?" even though it lives in Personal Growth. The L3 stays in its home area for the Daily view, but the graph edge connects it to the daygame achievement.

---

## Part 6: Deferred (Still Not In Scope)

From better_goals.md's "Future" section:
- AI-assisted decomposition for unknown goal types
- Advanced UX flows (wizard, interactive tree builder)
- Time commitment reality-checker
- Celebration cascade improvements
- L0 "life dream" goals (exist as data but no special UX)
- Meta L2s (coach/mentor, document journey) — explicitly dropped

---

## Part 7: Open Questions

1. **Category restructure** — does the 8+Custom breakdown feel right?
2. **Tier 1 L2 scope** — all 12 daygame/dating L2s in the first pass, or start with fewer?
3. **Differentiate "one person" vs "abundance"** — different default L3 targets per path. Do now or defer?
4. **Differentiate achievement weights** — "Master Daygame" = results-heavy, "Become Confident" = exposure-heavy. Do now or defer?
5. **Suggestion UX for tier 2** — when user creates a goal in Personal Growth, how do suggestions appear? Dropdown? Catalog-style picker? Simple list?
6. **Cross-area suggestions** — when activating a daygame L2 that benefits from meditation, should the system prompt "also add this from Personal Growth?" or leave it to the user?
