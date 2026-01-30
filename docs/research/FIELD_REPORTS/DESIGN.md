# Field Report Design Document

**Status:** Active
**Updated:** 30-01-2026

## Changelog
- 30-01-2026 - Extracted from FIELD_REPORT_RESEARCH_PLAN.md (actionable content only)

---

## Objective

Design the optimal field report system that gives users the best options for documenting and learning from their sessions.

---

## Design Principles (Research-Backed)

| # | Principle | Application |
|---|-----------|-------------|
| 1 | Less friction = more consistency | Quick options, minimal required fields |
| 2 | Emotion first, analysis second | Ask feelings before tactics |
| 3 | Balance positive and negative | Celebrate wins (affects hormones) |
| 4 | The critical question | "Why did it end? What would you do differently?" |
| 5 | Make it actionable | End with forward action, not just reflection |
| 6 | Match depth to situation | Quick log vs deep dive based on context |
| 7 | Complete the learning cycle | Reflection → Insight → Action (Kolb) |
| 8 | Intended vs actual comparison | Add "What was your goal?" (AAR) |
| 9 | Challenge cognitive distortions | Balanced perspective prompts (CBT) |
| 10 | Habit stack the behavior | Link report to existing routine |
| 11 | Match template to skill stage | Beginners need structure, experts need speed |
| 12 | Build identity, not just behavior | "I am someone who learns" |
| 13 | Common humanity reduces shame | Normalize failure in UI copy |
| 14 | Process over outcomes | Judge decisions, not results |
| 15 | Psychological safety with self | No self-judgment; frame as learning |
| 16 | If-then planning | Pre-session implementation intentions |
| 17 | Rumination circuit breakers | Time limits, action requirements |
| 18 | Match feedback to self-efficacy | Gentler feedback for struggling users |
| 19 | What? So What? Now What? | Minimal viable reflection (Driscoll) |
| 20 | Focus on the lead-up | "What happened before the key moment?" |
| 21 | Mastery experiences build confidence | Display wins prominently (Bandura) |
| 22 | Learning goals for new skills | "Practice X" not "Achieve Y" |
| 23 | Spaced retrieval of past learnings | Periodically resurface old insights |
| 24 | Yes, And mindset | Unexpected = opportunity |
| 25 | Expressive writing heals | Emotional expression, not just facts |

---

## Recommended Template Structures

### Quick Log (30 seconds)
```
1. When & Where
2. Number of approaches
3. Energy/mood (1-5 scale)
4. Best moment (1 sentence)
```

### Standard Debrief (3 minutes)
```
1. When & Where
2. Context (solo/wing, time of day)
3. Approach breakdown (best/most significant interaction)
4. What went well (celebrate wins)
5. What to work on (growth areas)
6. Key takeaway (one actionable insight)
```

### Deep Analysis (10 minutes)
```
1. When & Where
2. Full reconstruction (dialogue)
3. Emotional state - Before/During/After
4. The critical 3 minutes (what happened leading up to loss?)
5. Techniques attempted
6. What would you do differently (replay with changes)
7. Connection to current skill focus
```

### Blowout Recovery (5 minutes)
```
1. What happened (factual, without judgment)
2. How it made you feel (emotional processing)
3. Why it might have happened (analysis)
4. Reframe & learning
5. What would you tell a friend? (self-compassion)
6. Would you do it again? (resilience check)
```

### Ultra-Minimal: What? So What? Now What?
```
1. What happened?
2. What did you learn?
3. What will you do differently?
```

---

## Field Library (All Available Fields)

### Basic Stats
| Field | Type | Purpose |
|-------|------|---------|
| Date & Time | datetime | When it happened |
| Location | text | Where (pattern recognition) |
| Approach count | number | Volume tracking |
| Duration | number | Time invested |
| Solo/Wing | select | Social context |

### Outcomes
| Field | Type | Purpose |
|-------|------|---------|
| Outcome breakdown | multiselect | Results by type |
| Numbers gotten | number | Success metric |
| Best outcome details | textarea | Learn from wins |
| Follow-up planned | boolean | Accountability |

### Internal State
| Field | Type | Purpose |
|-------|------|---------|
| Pre-session mood | scale 1-5 | Starting state |
| Post-session mood | scale 1-5 | Ending state |
| Energy level | scale 1-5 | Physical state |
| Anxiety level | scale 1-5 | Fear tracking |
| Confidence | scale 1-5 | Self-belief |

### Tactical
| Field | Type | Purpose |
|-------|------|---------|
| Best interaction breakdown | textarea | What worked |
| Why it ended | textarea | CRITICAL learning |
| Sticking point hit | text | Pattern tracking |
| Technique practiced | text | Deliberate practice |
| What to try next time | textarea | Forward action |

### Reflection
| Field | Type | Purpose |
|-------|------|---------|
| 3 things done well | list | Positive reinforcement |
| 3 things to improve | list | Growth areas |
| Key insight | textarea | Distilled wisdom |
| Emotional debrief | textarea | Processing feelings |
| What would you tell a friend? | textarea | Self-compassion |

---

## Master Reflection Framework

```
PRE-SESSION
├── Set specific learning goal (not outcome goal)
├── Create implementation intention ("If X, then Y")
└── Note starting emotional state

POST-SESSION: IMMEDIATE (< 30 min)
├── Quick emotional check
├── Log basic stats
└── Best moment (one sentence)

POST-SESSION: STANDARD (same day)
├── What? (factual description)
├── Feelings? (emotional state)
├── So What? (patterns, insights)
├── Now What? (specific action)
└── Celebration (acknowledge effort)

POST-SESSION: DEEP DIVE (near-misses, breakthroughs)
├── Full reconstruction
├── The lead-up (3 min before key moment)
├── Intended vs. actual comparison
├── Cognitive distortion check
├── Implementation intention for next time
└── Self-compassion element

WEEKLY REVIEW
├── Pattern identification
├── Spaced retrieval of past learnings
├── Progress on learning goals
└── Adjust focus for next week

BLOWOUT RECOVERY
├── Acceptance before reappraisal
├── Rumination circuit breaker (time limit)
├── Common humanity reminder
├── Self-compassion
└── One tiny action step forward
```

---

## AI Coach Guidelines

```yaml
always:
  - Focus on task/process, not person/identity
  - Pair criticism with actionable strategy
  - Celebrate effort and learning, not just outcomes
  - Use "yet" language ("You haven't mastered this yet")
  - Normalize setbacks as part of learning

avoid:
  - Judgmental language
  - Person-focused criticism ("You are...")
  - Outcome-only feedback without strategy
  - Triggering rumination loops
  - Breaking psychological safety

calibrate_to_user:
  low_self_efficacy:
    - Gentler feedback
    - More frequent acknowledgment
    - Learning goals only
    - Smaller steps
  high_self_efficacy:
    - Direct feedback
    - Performance goals acceptable
    - Challenge appropriately
    - Focus on edge cases
```

---

## Cognitive Distortions Checklist (for AI Analysis)

```yaml
cognitive_distortions:
  all_or_nothing:
    pattern: "complete failure|total disaster|nothing worked"
    reframe: "What parts went okay?"

  catastrophizing:
    pattern: "never|always|impossible|hopeless"
    reframe: "Is this actually permanent?"

  mind_reading:
    pattern: "she thought|she must have|she probably"
    reframe: "What did she actually say/do?"

  overgeneralization:
    pattern: "women always|every time|this always happens"
    reframe: "What about exceptions?"

  discounting_positives:
    pattern: "but|doesn't count|just luck"
    reframe: "Why doesn't it count?"
```

---

## Current Templates vs. Research Alignment

| Template | Status | Notes |
|----------|--------|-------|
| The Speedrun | Good | Add "best moment" as encouraged default |
| The Debrief | Good | Add "3 wins" before "what to work on" |
| The Forensics | Good | Add emotional state questions first |
| The Phoenix | Excellent | Matches sports psych emotional debrief |

---

## For Detailed Research

See `research/` subfolder:
- `research/sports_psychology.md` - Sports debrief methods
- `research/military_aar.md` - After Action Review
- `research/cbt_journaling.md` - CBT and emotional processing
- `research/habit_science.md` - Behavior design
- `research/learning_science.md` - Deliberate practice, learning theory
- `research/psychology_research.md` - Self-efficacy, growth mindset, feedback theory
- `research/community_feedback.md` - User preferences from forums
- `research/sources.md` - Complete citation index
