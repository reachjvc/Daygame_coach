# Expanding Goals — Life Areas & Goal Hierarchy

## Status: PARTIALLY SHIPPED

---

## Decisions Made

- **Categories:** Simplify from 10 → 6 + Custom. Merge Daygame+Dating, merge Career+Finances, absorb Mindfulness+Education into Personal Growth, add Lifestyle
- **L2 scope:** Ship all 10 new daygame/dating L2s at once
- **Achievement weights:** Per-L2 weights (not shared). Each L2 gets its own weight distribution
- **L1 flavors:** Create all L3 options first, then decide what goes where for one-person vs abundance
- **Meta L2s:** Dropped (coach/mentor, document journey)
- **L2 overlap resolution:** Dropped "Never Worry About Dating Again" (= "Total Dating Freedom") and "Master Online Dating" (no L3s to wire to). 8 new L2s shipped.
- **Display categories:** Added `texting`, `dates`, `relationship` alongside existing `field_work`, `results`, `dirty_dog`
- **Per-L2 edges:** Each L2 fans into its specific L3s (not all-to-all). `l2_attract_any` is the broadest (all 25 L3s).

## What's Shipped

- 8 new L2 badge templates (10 total)
- 5 new Daygame L3s (field_work): Hours in Field, Voice Notes, Approach Quality, Open in <3s, Solo Sessions
- 8 new Dating L3s: Texting Initiated, Numbers Converted, Texts Replied, Dates Planned, Second Dates Achieved, Creative Dates, Physical Escalation, Women Currently Dating
- Per-L2 fan-out edges and per-L2 achievement weights
- 3 new display categories (texting, dates, relationship) with labels in all UI components
- Enriched life area suggestions (daygame, dating, health, career, social, personal growth)
- All tests updated and passing (1088 tests)

## What's NOT Shipped Yet

- Life area consolidation (10 → 7) — needs DB migration for existing users
- Tier 2 suggestion-powered manual hierarchy UX
- Cross-area L3 sharing (e.g., Meditation feeding into Overcome AA)
- L1 path differentiation (one-person vs abundance defaults)
- Online dating L3s

---

## Strategy

**Two tiers of goal support:**

1. **Curated + auto-tracked** — Full L1→L2→L3 graph with fan-out, per-L2 achievement weights, auto-tracking from widgets. Only where we have tracking infrastructure.

2. **Manual + suggestion-powered** — User creates their own hierarchy. We provide L2 suggestions and L3 templates per life area. No graph wiring — just parent-child goals with manual tracking. Available for ALL life areas from day one.

**Expansion sequence:**
1. **Now:** Enrich Dating & Daygame with all new L2s + L3s. Ship L2/L3 suggestions for all other areas
2. **Next:** Build fitness/health tracking widget → upgrade Health & Appearance to curated tier
3. **Later:** Each new tracking widget unlocks another curated area

---

## Source Material

L2/L3 brainstorm from `better_goals.md` (deleted in commit `69e8804`). 25 L2 goals brainstormed, only 2 shipped. This plan brings in the rest minus meta.

---

## Part 1: Life Area Categories

### Before (10)

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

### After (6 + Custom)

| # | ID | Name | What changed |
|---|-----|------|-------------|
| 1 | `dating_daygame` | Dating & Daygame | MERGE — daygame + dating into one pipeline |
| 2 | `health_appearance` | Health & Appearance | RENAME — fitness + style + grooming |
| 3 | `social` | Social Life | KEEP |
| 4 | `personal_growth` | Personal Growth | EXPANDED — absorbs Mindfulness, Education, Inner Game |
| 5 | `career_finances` | Career & Finances | MERGE — career + finances |
| 6 | `lifestyle` | Lifestyle | NEW — travel, hobbies, experiences, adventures |
| 7 | `custom` | Custom | KEEP |

**Removed:** `daygame` (→ dating_daygame), `dating` (→ dating_daygame), `finances` (→ career_finances), `mindfulness` (→ personal_growth), `education` (→ personal_growth)

**MECE check:**
- Dating & Daygame vs Social: romantic pursuit vs friendships/community — ME ✓
- Health & Appearance vs Personal Growth: body/looks vs mind/learning — ME ✓
- Career & Finances vs Lifestyle: work/money vs play/experiences — ME ✓
- Personal Growth covers: inner game, mindfulness, education, reading, journaling, meditation, confidence, learning — CE ✓
- Health & Appearance covers: gym, nutrition, sleep, style, grooming, skincare — CE ✓
- Lifestyle covers: travel, hobbies, home, adventures, experiences — CE ✓

**Migration note:** Existing user goals with `life_area = 'daygame'` or `'dating'` need remapping to `'dating_daygame'`. Same for `'finances'` → `'career_finances'`, `'mindfulness'`/`'education'` → `'personal_growth'`.

---

## Part 2: L2 Goals

### Tier 1: Curated (Dating & Daygame)

Full graph treatment — fan-out edges, per-L2 achievement weights, auto-tracking.

| ID | Title | Status |
|----|-------|--------|
| `l2_master_daygame` | Master Daygame | EXISTS |
| `l2_confident` | Become Confident with Women | EXISTS |
| `l2_overcome_aa` | Overcome Approach Anxiety Permanently | NEW |
| `l2_master_cold_approach` | Master Cold Approach | NEW |
| `l2_great_talker` | Become Great at Talking to Women | NEW |
| `l2_master_seduction` | Master Seduction / Attraction | NEW |
| `l2_attract_any` | Be Able to Attract Any Woman I Want | NEW |
| `l2_master_dating` | Master Dating | NEW |
| `l2_master_texting` | Master Texting Game | NEW |
| `l2_master_online_dating` | Master Online Dating | NEW |
| `l2_dating_freedom` | Have Total Dating Freedom | NEW |
| `l2_never_worry` | Never Worry About Dating Again | NEW |

**Total: 12 L2s** (2 existing + 10 new)

### Tier 2: Suggestion Library (all other areas)

Not graph-wired. Appear as suggestions when user creates goals. Manual hierarchy.

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

No curated L2s yet. Users create their own.

---

## Part 3: L3 Goals — The Full Catalog

All L3 options listed here. L1 path differentiation (one-person vs abundance defaults) to be decided after reviewing the full set.

### Tier 1: Curated L3s (Dating & Daygame)

#### Existing L3 — Daygame (shipped)

| L3 Goal | Type | Display Category |
|---------|------|-----------------|
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

#### New L3 — Daygame (from better_goals.md deferred list)

| L3 Goal | Type | Display Category | Why |
|---------|------|-----------------|-----|
| Hours in Field | milestone_ladder | field_work | Total time invested |
| Voice Notes / Field Reports | habit_ramp | field_work | Self-coaching loop |
| Approach Quality Self-Rating | habit_ramp | field_work | Deliberate practice |
| Open in <3 Seconds | habit_ramp | field_work | 3-second rule consistency |
| Solo Sessions | habit_ramp | field_work | Independence from wings |

#### New L3 — Dating

| L3 Goal | Type | Display Category |
|---------|------|-----------------|
| Texting Conversations Initiated | habit_ramp | texting |
| Number-to-Date Conversion Rate | milestone_ladder | texting |
| Response Rate (% numbers that reply) | milestone_ladder | texting |
| Dates Planned / Executed | habit_ramp | dates |
| Date-to-Second-Date Conversion | milestone_ladder | dates |
| Physical Escalation on Dates | milestone_ladder | dates |
| Creative Date Ideas Tried | milestone_ladder | dates |
| Women Currently Dating | milestone_ladder | relationship |

### Tier 2: L3 Suggestion Templates (manual tracking)

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

#### Career & Finances L3 suggestions

| L3 Goal | Type | Sub-category |
|---------|------|-------------|
| Deep Work Hours Per Day | habit_ramp | Focus |
| High-Value Tasks Per Day | habit_ramp | Output |
| Revenue / Income Milestones | milestone_ladder | Financial |
| Side Project Hours Per Week | habit_ramp | Building |
| Networking Meetings Per Month | habit_ramp | Connections |
| Monthly Savings Amount | habit_ramp | Saving |
| Expense Tracking Adherence | habit_ramp | Awareness |
| Net Worth Milestones | milestone_ladder | Wealth |
| No Impulse Purchases Streak (days) | milestone_ladder | Discipline |
| Budget Review Per Week | habit_ramp | Management |

---

## Part 4: L2 → L3 Fan-Out Edges (Tier 1)

Per-L2 achievement weights. Each L2 gets its own weight distribution reflecting what actually matters for that transformation.

### Daygame L2s

**Master Daygame** (results-heavy)
→ all existing field_work L3s + Hours in Field, Voice Notes, Approach Quality
→ all existing results L3s
→ all dirty_dog L3s
Weights: results & dirty_dog weighted higher than field_work inputs

**Become Confident with Women** (exposure/consistency-heavy)
→ all existing field_work L3s + Hours in Field, Solo Sessions
→ results L3s (lower weight)
→ "Rejected But Kept Going" (cross-area from Personal Growth)
Weights: field_work & consistency metrics weighted higher than outcome metrics

**Overcome Approach Anxiety** (exposure-heavy)
→ Approach Volume, Consecutive Days, Solo Sessions
→ Comfort Zone Challenges (cross-area from Personal Growth)
→ "Rejected But Kept Going" (cross-area from Personal Growth)
→ Meditation (cross-area from Personal Growth)
Weights: pure exposure metrics dominate

**Master Cold Approach** (technique-heavy)
→ Approach Volume, Approach Frequency, Approach Quality, Open in <3s
→ Phone Numbers, Instadates
Weights: quality & frequency metrics over pure volume

**Become Great at Talking to Women** (conversion-heavy)
→ Phone Numbers, Instadates, Dates, Response Rate
→ Voice Notes
Weights: conversion outcomes dominate

**Master Seduction / Attraction** (escalation-heavy)
→ Kiss Closes, Lays, Physical Escalation, Dates, Second Dates
Weights: escalation outcomes dominate

**Be Able to Attract Any Woman** (broad)
→ all field_work + all results + all dirty_dog
→ Physical Attractiveness metrics (cross-area from Health)
Weights: broadly distributed, slight emphasis on results

### Dating L2s

**Master Texting Game**
→ Texting Conversations Initiated, Response Rate, Number-to-Date Conversion
Weights: conversion rate highest

**Master Dating**
→ Dates Planned, Date-to-Second-Date Conversion, Creative Dates, Physical Escalation
Weights: conversion & escalation metrics

**Master Online Dating**
→ *(needs online-specific L3s — deferred)*

**Have Total Dating Freedom / Never Worry About Dating Again**
→ Women Currently Dating, Dates/month, Rotation Size, Sustained Rotation
Weights: abundance metrics — rotation & date volume

---

## Part 5: Cross-Area L3 Sharing

L3s have a "home" life area (where they show in the Daily view) but can connect to L2 achievements in other areas via graph edges.

| L3 Goal | Home Area | Also feeds into |
|---------|-----------|----------------|
| Meditation | Personal Growth | Dating & Daygame → Overcome AA |
| Comfort Zone Challenges | Personal Growth | Dating & Daygame → Overcome AA |
| "Rejected But Kept Going" | Personal Growth | Dating & Daygame → Overcome AA, Become Confident |
| Gym Sessions | Health & Appearance | Dating & Daygame → Attract Any Woman |
| Physical Attractiveness metrics | Health & Appearance | Dating & Daygame → Attract Any Woman |

When a user activates a Dating & Daygame L2 that benefits from cross-area L3s, the system could suggest adding them.

---

## Part 6: Deferred

- AI-assisted decomposition for unknown goal types
- Advanced UX flows (wizard, interactive tree builder)
- Time commitment reality-checker
- Celebration cascade improvements
- L0 "life dream" goals (exist as data but no special UX)
- Meta L2s (coach/mentor, document journey) — explicitly dropped
- Online dating L3s (need to design what to track)

---

## Part 7: Remaining Questions

1. **L1 path differentiation** — which L3s default ON for "one person" vs "abundance"? (Need to review full L3 list first)
2. **Suggestion UX for tier 2** — when user creates a goal in Personal Growth, how do suggestions appear? Catalog picker? Simple list?
3. **Cross-area suggestions** — when activating an L2 that benefits from cross-area L3s, auto-suggest or leave to user?
4. **New display categories** — Dating L3s need categories (texting, dates, relationship). Add to `GoalDisplayCategory` type?
5. **Migration** — existing users with goals in old life areas need data migration. Strategy?
