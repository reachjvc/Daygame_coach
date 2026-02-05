# Field Report Research Plan
**Status:** Research/Brainstorm
**Updated:** 29-01-2026 07:46 (Danish time)

## Objective
Design the optimal field report system that gives users the best options for documenting and learning from their sessions.

---

## Research Findings

### From Daygame Community Sources

#### The 80/20 Field Report Method
Source: [Skilled Seducer Forum](https://www.skilledseducer.com/threads/stickied-how-to-write-efficient-field-reports-80-20-rule-time-hack.18988/)

**Key principle**: "80% of your results come from 20% of your effort/activities"

**What to focus on**:
- Identify 1-2 interactions per outing that triggered strong emotional responses
- Detail "the 3 minutes leading up to the point where you lost the girl"
- Explain what you would do differently
- Note reoccurring bad habits separately

**When to use detailed reports**: On nights when you got really close but didn't pull

#### General Field Report Best Practices
Sources: [Australian Dating Coach](https://onemanslifemission.com/how-to-write-a-pick-up-field-report-pua-field-report/), [Pickup Alpha](https://pickupalpha.com/example-of-a-good-pickup-field-report/)

- Write the report immediately the night you come back
- State WHY the set ended and what you could have done to prevent/prolong it (CRITICAL)
- Write down 3 things you did well and 3 things you could improve
- Record audio voice memos at end of each approach while fresh
- For beginners: write every detail of every interaction
- For experienced: focus on significant learning moments

---

### From Sports Psychology Research

#### The "Well, Better, How" Method
Source: [Brian Cain Peak Performance](https://briancain.com/blog/performance-journaling.html)

After each session, write:
1. **What did I do well?**
2. **What can I do better?**
3. **How am I going to get better?**

*"Writing down your well, better, how notes post-training helps you to let the game go."*

#### The "3-2-1" Framework (Individual Sports)
Source: [Bridge Athletic](https://blog.bridgeathletic.com/sports-psych2-the-skill-of-reflecting)

- **3 Highlights** - what stood out positively
- **2 Lowlights** - areas for improvement
- **1 Forward** - lesson to take with you

#### Post-Game Debrief Questions
Source: [Sport Resilience](https://sportresilience.com/debrief-questions/), [BelievePerform](https://members.believeperform.com/debriefing-in-sport/)

**Emotional Processing**:
- "How did that make you feel?"
- "Why did it make you feel that way?"

**Learning-Focused**:
- "What did you learn from this?"
- "What can you learn for next time?"
- "What one thing will you take as a key learning?"

**Improvement-Focused**:
- "What didn't go so well?"
- "What would you do differently next time?"
- "What other ways could you have overcome this?"

#### Key Research Findings

1. **Timing matters**: Shorter, sharper debriefs work better. Consider emotional state - sometimes wait until next day.

2. **Positive framing impacts future performance**: Players who received positive feedback had better performance AND higher pre-game testosterone in subsequent games. ([Science of Running](https://www.scienceofrunning.com/2017/03/what-you-say-matters-how-the-post-race-debrief-influences-performance.html))

3. **Reflection is where growth happens**: "Reflection is where you get to extract the DNA from that performance and improve your preparation moving forward."

4. **Deliberate practice correlation**: Research shows deliberate practice accounts for ~18% of variance in sports performance - significant but not everything. ([Ericsson research](https://pubmed.ncbi.nlm.nih.gov/27217246/))

---

## Derived Design Principles

### 1. Less Friction = More Consistency
Users who complete shorter reports consistently outperform those who abandon detailed ones. Offer quick options.

### 2. Emotion First, Analysis Second
Ask how they felt before diving into tactical analysis. Emotional processing aids learning.

### 3. Balance Positive and Negative
Don't just focus on mistakes. Celebrating wins reinforces good behavior and affects future performance hormones.

### 4. The Critical Question
The most important question: **"Why did the interaction end, and what could you have done differently?"**

### 5. Make It Actionable
End with a forward-looking action item, not just reflection.

### 6. Match Depth to Situation
- Quick log for routine sessions
- Deep dive for near-misses and significant learning moments
- Special template for tough days (emotional recovery focus)

---

## Recommended Template Structures

### Quick Log (30 seconds)
Based on: Minimum viable data for pattern recognition

```
1. When & Where
2. Number of approaches
3. Energy/mood (1-5 scale)
4. Best moment (1 sentence)
```

### Standard Debrief (3 minutes)
Based on: "Well, Better, How" + critical question

```
1. When & Where
2. Context (solo/wing, time of day)
3. Approach breakdown (what happened in best/most significant interaction)
4. What went well (celebrate wins)
5. What to work on (growth areas)
6. Key takeaway (one actionable insight)
```

### Deep Analysis (10 minutes)
Based on: 80/20 method for near-misses + emotional processing

```
1. When & Where
2. Full reconstruction (write out the interaction dialogue)
3. Emotional state - Before (how were you feeling walking up?)
4. Emotional state - During (what did you feel?)
5. Emotional state - After (how did you feel walking away?)
6. The critical 3 minutes (what happened leading up to where you lost her?)
7. Techniques attempted (what specific things did you try?)
8. What would you do differently (replay with changes)
9. Connection to current skill focus
```

### Blowout Recovery (5 minutes)
Based on: Sports psychology emotional debrief + reframing

```
1. When & Where
2. What happened (factual, without judgment)
3. How it made you feel (emotional processing)
4. Why it might have happened (analysis)
5. Reframe & learning (what can you take from this?)
6. What would you tell a friend? (self-compassion)
7. Would you do it again? (resilience check)
```

### Custom Report
User selects from field library based on their personal sticking points and goals.

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

### Context (Optional)
| Field | Type | Purpose |
|-------|------|---------|
| Weather | select | Environmental |
| Day of week | auto | Patterns |
| Hours of sleep | number | Physical factors |
| Tags | tags | Categorization |

---

## Next Actions

1. [x] Research daygame community field report methods
2. [x] Research sports psychology debrief methods
3. [x] Synthesize into design principles
4. [x] Define recommended template structures
5. [ ] Review current templates against research findings
6. [ ] Prototype custom builder UI
7. [ ] Test with users and iterate

---

## Implementation Notes

### Current Templates vs. Research Alignment

| Template | Alignment | Potential Improvements |
|----------|-----------|----------------------|
| The Speedrun | Good - quick, low friction | Add "best moment" as encouraged default |
| The Debrief | Good - balanced | Add "3 wins" before "what to work on" |
| The Forensics | Good - detailed | Consider adding emotional state questions first |
| The Phoenix | Excellent - matches sports psych emotional debrief | Keep as is |

### Custom Builder Priority Fields
Based on research, these fields have highest learning impact:
1. **Why it ended / What would you do differently** (critical question)
2. **What went well** (positive reinforcement)
3. **Key takeaway / One action for next time** (forward focus)
4. **Emotional state** (processing before analysis)

---

## Extended Research (Round 2)
**Research Date:** 29-01-2026

This section contains additional research from military/organizational learning, cognitive psychology, habit science, and learning theory to further ground the field report design.

---

### From Military/Organizational Learning

#### After Action Review (AAR) Methodology
Sources: [Wikipedia - AAR](https://en.wikipedia.org/wiki/After-action_review), [US Army FM 7-0](https://www.first.army.mil/Portals/102/FM%207-0%20Appendix%20K.pdf), [Wharton Executive Education](https://executiveeducation.wharton.upenn.edu/thought-leadership/wharton-at-work/2021/07/after-action-reviews-simple-tool/), [HBR](https://hbr.org/2023/01/a-better-approach-to-after-action-reviews)

**Origin:** Developed by US Army in 1970s. Called "one of the most successful organizational learning methods yet devised."

**The Four Core Questions:**
1. What did we intend to accomplish? (goal/strategy)
2. What actually happened? (execution)
3. Why did it happen that way? (gap analysis)
4. What will we do differently next time? (adaptation)

**Key Distinction from Debrief:** AAR begins with comparing intended vs. actual results. Learning is carried forward by participants, not just the leader.

**Critical Success Factors:**
| Factor | Why It Matters |
|--------|----------------|
| Timing | Immediate feedback = more accurate recall |
| Safe environment | Candor requires psychological safety |
| Focus on WHAT not WHO | No blame, analyze team performance |
| Equality assumption | Rank doesn't matter during AAR |
| Self-discovery | Use leading questions, don't lecture |

**Common Failure Mode:** Peter Senge notes AARs often fail when "reduced to a sterile technique." Must be "more verb than noun" - a living process.

**Organizational Techniques:**
- Chronological order (follow event flow)
- Key themes/issues (organize by topic)
- Warfighting functions (organize by capability area)

```
DESIGN_IMPLICATION: The "Why did it end?" question maps directly to AAR question #3.
Consider adding explicit intended vs. actual comparison for advanced users.
```

---

### From Cognitive Behavioral Therapy (CBT)

#### CBT Journaling & Thought Diaries
Sources: [Charlie Health](https://www.charliehealth.com/post/cbt-journaling), [Positive Psychology - Thought Diary](https://positivepsychology.com/thought-diary/), [Better Humans - Cognitive Journaling](https://betterhumans.pub/cognitive-journaling-a-systematic-method-to-overcome-negative-beliefs-119be459842c)

**Core Concept:** Written exercise to identify automatic thoughts, connected emotions, and consequent behavior in stressful situations.

**Benefits for Skill Development:**
| Benefit | Mechanism |
|---------|-----------|
| Self-awareness | Writing surfaces thought-feeling-behavior connections |
| Emotional processing | Safe private expression aids processing |
| Emotional regulation | Understanding origins allows choosing response |
| Pattern recognition | Repeated logging reveals cognitive distortions |

**The Thought Diary Structure:**
1. Situation - What happened? (factual)
2. Automatic thoughts - What went through your mind?
3. Emotions - What did you feel? (rate intensity 0-100)
4. Evidence for - What supports this thought?
5. Evidence against - What contradicts this thought?
6. Balanced thought - More realistic perspective
7. Outcome - How do you feel now?

**Key CBT Prompts (Adapted for Field Reports):**
- "What evidence supports this belief about what happened?"
- "What evidence contradicts it?"
- "How might you reframe this in a more balanced way?"

**Cognitive Distortions to Watch:**
| Distortion | Example in Daygame Context |
|------------|---------------------------|
| All-or-nothing | "The set was a complete failure" |
| Catastrophizing | "I'll never be good at this" |
| Mind reading | "She definitely thought I was weird" |
| Overgeneralization | "Women always reject me" |

```
DESIGN_IMPLICATION: The "Blowout Recovery" template already uses CBT principles.
Consider adding explicit cognitive distortion identification for emotional processing.
"What's the balanced/realistic view of what happened?"
```

---

### From Habit Formation Science

#### Building Consistent Reflection Habits
Sources: [CNN - Keystone Habits](https://www.cnn.com/2026/01/01/health/how-to-form-habits-resolutions-wellness), [Confide Coaching](https://confidecoaching.com/the-science-of-building-habits-that-stick/), [Reflection.app](https://www.reflection.app/blog/habit-tracking-journal-build-better-routines-through-reflection)

**Key Findings:**

| Finding | Research Source | Application |
|---------|-----------------|-------------|
| Habit formation takes 59-66 days median (up to 254 days) | Multiple studies | Set expectations, celebrate consistency |
| Consistency > Intensity | Journal of Applied Psychology | Short daily reports beat sporadic long ones |
| Habit stacking increases success by 64% | 2025 JAP study | Link report to existing routine (e.g., after commute home) |
| Morning routines 43% more successful | Habit research | Consider morning reflection on previous day |
| Tracking increases success by 40% | APA research | Show streak/consistency metrics |
| Identity-based habits +32% adherence | JPSP study | Frame as "I am someone who reflects" not "I should reflect" |
| Environmental cues +58% adherence | 2018 review | Push notifications, dedicated report location |

**The Habit Loop:**
1. **Cue** → Trigger (time, location, emotional state, preceding action)
2. **Routine** → The behavior (completing field report)
3. **Reward** → Satisfaction (insight gained, streak maintained, XP earned)

**Friction Reduction Strategies:**
- One sentence minimum (lowering the bar)
- Pre-filled defaults
- Voice-to-text option
- Templates reduce decision fatigue

```
DESIGN_IMPLICATION: Gamification (XP, streaks) directly maps to habit formation.
Quick Log template enables consistency. Consider "habit stacking" prompt:
"After I [existing habit], I will complete my field report."
```

---

### From Learning Science & Deliberate Practice

#### Deliberate Practice Theory
Sources: [Ericsson et al. 1993](https://www.academia.edu/16624318/The_role_of_deliberate_practice_in_the_acquisition_of_expert_performance), [PMC Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7461852/), [Structural Learning](https://www.structural-learning.com/post/deliberate-practice)

**Definition (Ericsson):** "When individuals engage in practice activities with full concentration on improving some specific aspect of performance."

**Core Components of Deliberate Practice:**
| Component | Description | Field Report Application |
|-----------|-------------|-------------------------|
| Specific goal | Focus on particular skill | "Technique practiced" field |
| Full concentration | Engaged, not mindless | Prompts that require thought |
| Immediate feedback | Know results quickly | Same-day reporting |
| Problem-solving time | Analyze what went wrong | "Why it ended" analysis |
| Repetition | Practice the skill again | "What to try next time" |

**Skill Acquisition Stages (Fitts 1964):**
1. **Cognitive** - Understanding what to do (beginner: needs detailed templates)
2. **Associative** - Practicing, getting faster/accurate (intermediate: standard debrief)
3. **Automatic** - Proceduralized, minimal thought (advanced: quick log, focus on edge cases)

```
DESIGN_IMPLICATION: Template recommendations should adapt to user skill level.
Beginners need more structure. Experts need less friction.
Connect reports to specific skill focus for true deliberate practice.
```

#### Kolb's Experiential Learning Cycle
Sources: [Simply Psychology](https://www.simplypsychology.org/learning-kolb.html), [Norwich University](https://online.norwich.edu/online/about/resource-library/4-components-experiential-learning-cycle), [Structural Learning](https://www.structural-learning.com/post/kolbs-learning-cycle)

**The Four Stages:**
```
┌─────────────────────────────────────────────────────────────┐
│  1. CONCRETE EXPERIENCE  ──────►  2. REFLECTIVE OBSERVATION │
│         (Do it)                        (Think about it)     │
│            ▲                                 │              │
│            │                                 ▼              │
│  4. ACTIVE EXPERIMENTATION ◄────  3. ABSTRACT CONCEPTUALIZATION │
│       (Try new approach)              (Draw conclusions)    │
└─────────────────────────────────────────────────────────────┘
```

**Stage Mapping to Field Reports:**
| Kolb Stage | What Happens | Field Report Element |
|------------|--------------|---------------------|
| Concrete Experience | The approach session itself | (precedes report) |
| Reflective Observation | "What happened? How did I feel?" | Debrief sections |
| Abstract Conceptualization | "What does this mean? What's the pattern?" | Key insight, why it ended |
| Active Experimentation | "What will I try next time?" | Forward action, technique to practice |

**Key Insight:** Learning requires completing the full cycle. A field report that only documents (stage 1-2) without extracting lessons (stage 3) and planning change (stage 4) is incomplete.

```
DESIGN_IMPLICATION: Every template should include at least one element from stages 3 and 4.
The "Key takeaway" and "What to try next time" fields complete the learning cycle.
```

---

### From Self-Compassion Research

#### Kristin Neff's Self-Compassion Framework
Sources: [Self-Compassion.org Research](https://self-compassion.org/the-research/), [Annual Review of Psychology 2023](https://self-compassion.org/wp-content/uploads/2023/01/Neff-2023.pdf), [PMC - Self-Compassion in Development](https://pmc.ncbi.nlm.nih.gov/articles/PMC2790748/)

**Three Components of Self-Compassion:**
| Component | Description | Opposite (to avoid) |
|-----------|-------------|---------------------|
| Self-kindness | Treating yourself as you'd treat a friend | Self-judgment |
| Common humanity | Recognizing struggle is universal | Isolation ("only I fail") |
| Mindfulness | Balanced awareness of emotions | Over-identification |

**Research Findings on Failure & Performance:**

| Finding | Implication |
|---------|-------------|
| Self-compassion linked to greater resilience than self-esteem | Don't rely on external validation |
| Positive association with mastery goals (intrinsic motivation) | Focus on learning, not looking good |
| Greater self-efficacy (meta-analysis, medium effect size) | Builds confidence over time |
| Less rumination and fear of failure | Can take more risks |
| Motivation NOT undermined by self-compassion | Common myth debunked |

**The Self-Compassion Break (for tough sessions):**
1. "This is a moment of difficulty" (mindfulness)
2. "Struggle is part of learning" (common humanity)
3. "May I be kind to myself" (self-kindness)

**Key Question:** "What would you tell a friend in this situation?"
- Forces perspective shift
- Activates compassionate response
- Reduces harsh self-criticism

```
DESIGN_IMPLICATION: "Blowout Recovery" template already includes "What would you tell a friend?"
Consider adding common humanity element: "Remember: every skilled person failed many times learning."
```

---

## Synthesized Insights (Round 2)

### New Design Principles from Extended Research

| # | Principle | Source | Application |
|---|-----------|--------|-------------|
| 7 | Complete the learning cycle | Kolb | Every template needs reflection → insight → action |
| 8 | Intended vs. Actual comparison | Military AAR | Add "What was your goal?" before "What happened?" |
| 9 | Challenge cognitive distortions | CBT | Add balanced perspective prompts for emotional processing |
| 10 | Habit stack the behavior | Habit science | Suggest linking report to existing routine |
| 11 | Match template to skill stage | Deliberate practice | Beginners need structure, experts need speed |
| 12 | Build identity, not just behavior | Habit science | Frame as "I am someone who learns from experience" |
| 13 | Common humanity reduces shame | Self-compassion | Normalize failure in prompts and UI copy |

### Template Enhancement Recommendations

| Template | Enhancement | Research Basis |
|----------|-------------|----------------|
| Quick Log | Add "Goal for session" field | AAR: intended vs. actual |
| Standard Debrief | Add "What would balanced view be?" | CBT: cognitive reframe |
| Deep Analysis | Add skill stage indicator | Deliberate practice stages |
| Blowout Recovery | Add "This is normal" messaging | Self-compassion: common humanity |
| All | Show streak/consistency metrics | Habit formation: tracking +40% |

### Cognitive Distortions Checklist (for AI Analysis)

When analyzing user field reports, watch for these patterns:

```yaml
cognitive_distortions:
  all_or_nothing:
    pattern: "complete failure|total disaster|nothing worked"
    reframe: "What parts went okay? What was one thing that worked?"

  catastrophizing:
    pattern: "never|always|impossible|hopeless"
    reframe: "Is this actually permanent? What evidence suggests otherwise?"

  mind_reading:
    pattern: "she thought|she must have|she probably"
    reframe: "You don't know what she thought. What did she actually say/do?"

  overgeneralization:
    pattern: "women always|every time|this always happens"
    reframe: "Is this really every time? What about exceptions?"

  discounting_positives:
    pattern: "but|doesn't count|just luck"
    reframe: "Why doesn't it count? What if it does matter?"
```

### Habit Formation Triggers (for Notifications)

```yaml
habit_triggers:
  time_based:
    - "9:00 PM" # End of typical session window
    - "Next morning 8:00 AM" # Fresh reflection

  location_based:
    - "Arriving home" # Natural transition point

  action_based:
    - "After logging approach count" # Habit stack
    - "After viewing dashboard" # Habit stack

  streak_messaging:
    day_1: "First step! You're building a learning habit."
    day_7: "One week of reflection. You're becoming someone who learns."
    day_30: "30 days. This is who you are now."
```

---

## Research Sources Index

### Military/Organizational Learning
- [After Action Review - Wikipedia](https://en.wikipedia.org/wiki/After-action_review)
- [US Army FM 7-0 Appendix K](https://www.first.army.mil/Portals/102/FM%207-0%20Appendix%20K.pdf)
- [Wharton - After Action Reviews](https://executiveeducation.wharton.upenn.edu/thought-leadership/wharton-at-work/2021/07/after-action-reviews-simple-tool/)
- [HBR - Better Approach to AARs](https://hbr.org/2023/01/a-better-approach-to-after-action-reviews)
- [MindTools - AAR Process](https://www.mindtools.com/ap0ri1f/after-action-review-aar-process/)

### Cognitive Behavioral Therapy
- [Charlie Health - CBT Journaling](https://www.charliehealth.com/post/cbt-journaling)
- [Positive Psychology - Thought Diary](https://positivepsychology.com/thought-diary/)
- [Better Humans - Cognitive Journaling](https://betterhumans.pub/cognitive-journaling-a-systematic-method-to-overcome-negative-beliefs-119be459842c)
- [Positive Psychology - CBT Techniques](https://positivepsychology.com/cbt-cognitive-behavioral-therapy-techniques-worksheets/)

### Habit Formation
- [CNN - Keystone Habits 2026](https://www.cnn.com/2026/01/01/health/how-to-form-habits-resolutions-wellness)
- [Confide Coaching - Science of Habits](https://confidecoaching.com/the-science-of-building-habits-that-stick/)
- [Reflection.app - Habit Tracking](https://www.reflection.app/blog/habit-tracking-journal-build-better-routines-through-reflection)
- [Healthline - Science of Habit](https://www.healthline.com/health/the-science-of-habit)

### Learning Science & Deliberate Practice
- [Ericsson - Deliberate Practice](https://www.academia.edu/16624318/The_role_of_deliberate_practice_in_the_acquisition_of_expert_performance)
- [PMC - Deliberate Practice Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7461852/)
- [Simply Psychology - Kolb Learning Cycle](https://www.simplypsychology.org/learning-kolb.html)
- [Structural Learning - Deliberate Practice](https://www.structural-learning.com/post/deliberate-practice)

### Self-Compassion
- [Kristin Neff - Research Summary](https://self-compassion.org/the-research/)
- [Annual Review of Psychology 2023 - Self-Compassion](https://self-compassion.org/wp-content/uploads/2023/01/Neff-2023.pdf)
- [PMC - Self-Compassion in Development](https://pmc.ncbi.nlm.nih.gov/articles/PMC2790748/)

---

## Extended Research (Round 3) - Comprehensive Cross-Domain Analysis
**Research Date:** 29-01-2026

This extensive research round covers 15+ additional domains to ensure best-in-class field report design grounded in evidence from aviation, healthcare, sales, gaming, martial arts, psychology, and more.

---

### From Aviation & Crew Resource Management (CRM)

#### Pilot Debriefs and Logbooks
Sources: [AOPA - CRM](https://www.aopa.org/news-and-media/all-news/2019/july/flight-training-magazine/crm-head-in-the-game), [FAA Advisory Circular 120-51D](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-51D.pdf), [SKYbrary](https://skybrary.aero/articles/crew-resource-management-crm)

**CRM Definition:** "The effective use of all available resources (people, systems, facilities, equipment, environment) to safely and efficiently accomplish an assigned mission."

**Key CRM Principles for Field Reports:**
| Principle | Aviation Application | Field Report Application |
|-----------|---------------------|-------------------------|
| Pre-flight briefing | Set expectations before flight | Set session goals before going out |
| Post-flight debrief | Review immediately after | Same-day reflection |
| Positive behaviors first | Reinforce what worked | Celebrate wins before analyzing mistakes |
| Self-discovery over lecture | Use questions, not statements | AI prompts, not AI lectures |

**Single-Pilot Resource Management (SRM):**
Even solo pilots benefit from CRM thinking - using all available resources (ATC, other pilots, technology). Similarly, solo daygamers can leverage community, recordings, and coaching.

**Debrief Best Practice:** "The best results occur when crews examine their own behavior with the assistance of a trained instructor who can point out both positive and negative CRM performance."

```
DESIGN_IMPLICATION: Add optional "session goal" field at start.
Consider AI coach role as "trained instructor" pointing out patterns.
Frame debriefs as self-examination, not external judgment.
```

---

### From Healthcare: Structured Reflection Models

#### Gibbs' Reflective Cycle (1988)
Sources: [Simply Psychology](https://www.simplypsychology.org/gibbs-reflective-cycle.html), [University of Edinburgh Reflection Toolkit](https://reflection.ed.ac.uk/reflectors-toolkit/reflecting-on-experience/gibbs-reflective-cycle)

**The Six Stages:**
```
┌─────────────────────────────────────────────────────────────┐
│  1. DESCRIPTION ──► 2. FEELINGS ──► 3. EVALUATION          │
│    (What happened?)   (What were you    (What was good/bad?) │
│                        thinking/feeling?)                    │
│                                                             │
│  6. ACTION PLAN ◄── 5. CONCLUSION ◄── 4. ANALYSIS          │
│    (What will you     (What else could   (What sense can     │
│     do next time?)     you have done?)    you make of it?)  │
└─────────────────────────────────────────────────────────────┘
```

**Why Popular:** 63% of healthcare professionals use Gibbs' Cycle. Simple, cyclical, emphasizes the link between reflection and action.

**Limitation:** Can become a superficial checklist without genuine insight if not facilitated well.

#### Driscoll's "What? So What? Now What?" Model (1994, 2007)
Sources: [EBSCO Research](https://www.ebsco.com/research-starters/health-and-medicine/driscoll-model-reflection), [University of Cambridge](https://libguides.cam.ac.uk/reflectivepracticetoolkit/models)

**Three Simple Questions:**
1. **What?** - Describe what happened (factual)
2. **So What?** - What did you learn? What was significant?
3. **Now What?** - What will you do differently next time?

**Advantage:** Extreme simplicity makes it easy to remember and apply quickly.

**Field Report Mapping:**
| Driscoll Stage | Field Report Element |
|----------------|---------------------|
| What? | Event description, approach breakdown |
| So What? | Key insight, why it ended analysis |
| Now What? | Action for next time, technique to practice |

```
DESIGN_IMPLICATION: Consider "What? So What? Now What?" as ultra-minimal template.
Could be the absolute simplest option - just 3 questions.
```

---

### From Sales: Call Review & Coaching

#### Sales Call Analysis Best Practices
Sources: [Claap](https://www.claap.io/blog/sales-call-review-routines), [Advanced Business Abilities](https://advancedbusinessabilities.com/sales-call-review/), [MindTickle](https://www.mindtickle.com/blog/how-to-analyze-sales-call-recordings-to-uncover-valuable-customer-feedback/)

**Review Cadences:**
| Cadence | Activity | Daygame Equivalent |
|---------|----------|-------------------|
| Daily | Review previous day's calls, identify 1 takeaway | Quick Log after session |
| Weekly | Team review of selected calls, focus on one theme | Weekly pattern review |
| Monthly | Deep dive on metrics, update playbook | Monthly progress assessment |

**Key Metrics Sales Teams Track:**
- Talk-to-listen ratio (balance of conversation)
- Objection handling effectiveness
- Closing technique success rate
- Sentiment analysis (emotional tone)

**Best Practices Library:** Top performers' best moments are tagged and shared as training materials. Creates searchable repository of "what success looks like."

**Peer Review:** Pairing team members to review each other's calls provides new perspectives and fosters collaborative learning.

```
DESIGN_IMPLICATION: Consider "best moment" tagging for building personal success library.
Weekly theme focus (e.g., "this week: opening lines") matches sales coaching.
Peer review could translate to wing feedback integration.
```

---

### From Poker & Trading: Decision Journals

#### Session Review & Tilt Management
Sources: [Jared Tendler - Mental Game of Trading](https://jaredtendler.com/), [Deuces Cracked](https://www.deucescracked.com/the-psychology-of-poker-understanding-and-controlling-tilt/), [FX Replay](https://www.fxreplay.com/learn/trading-psychology-starts-with-a-journal--heres-why)

**Core Insight:** "Emotions are signals, not obstacles. Fear, greed, tilt, or frustration point to deeper flaws—biases, illusions, gaps in learning—that quietly undermine decision-making."

**The Trading/Poker Journal Framework:**
1. **Pre-session mindset** - How am I feeling? Any emotional baggage?
2. **Session log** - Document decisions (not just outcomes)
3. **Post-session review** - Patterns in decision quality, not results
4. **Emotional pattern tracking** - Note what triggers negative states

**Tilt Management:**
| Strategy | Description |
|----------|-------------|
| Circuit breaker | Pre-defined rule to stop after X consecutive losses |
| Loss limits | Daily maximum loss that triggers walk-away |
| Emotional labeling | Simply naming the emotion helps engage logical brain |
| Process focus | Judge decisions, not outcomes |

**Critical Distinction:** Focus on decision quality, not outcome. A good decision can have a bad outcome (variance). Bad decisions with good outcomes reinforce bad habits.

```yaml
tilt_indicators:
  frustration: "Feeling annoyed at rejections beyond normal"
  desperation: "Changing approach mid-session out of panic"
  overconfidence: "Taking unnecessary risks after early success"
  apathy: "Going through motions without genuine effort"
```

```
DESIGN_IMPLICATION: Add optional "pre-session mindset" check-in.
Consider circuit breaker: "After X harsh rejections, take a 10-min break."
Emphasize decision quality over outcomes in prompts.
Track emotional patterns over time for personalized insights.
```

---

### From Software Development: Agile Retrospectives

#### Blameless Postmortems & Sprint Retrospectives
Sources: [Atlassian](https://www.atlassian.com/team-playbook/plays/retrospective), [GoRetro](https://www.goretro.ai/post/how-to-run-a-blameless-sprint-retrospective), [NOBL](https://nobl.io/changemaker/definitive-guide-to-agile-retrospectives-and-post-mortem-meetings/)

**Retrospectives vs. Postmortems:**
| Aspect | Retrospective | Postmortem |
|--------|--------------|------------|
| Timing | Every 2 weeks (during project) | After project ends |
| Focus | Continuous improvement | Root cause analysis |
| Feedback loop | Short, actionable | Long, comprehensive |

**Blameless Culture Principles:**
- Focus on WHAT happened, not WHO caused it
- "Many errors occur not because of a person's behaviour, but because the system guided them towards the outcome"
- Replace "you should have" with "I felt" or "I noticed"
- Goal is learning, not punishment

**Popular Retrospective Formats:**
| Format | Structure | Best For |
|--------|-----------|----------|
| Start-Stop-Continue | What to start, stop, continue doing | Simple, fast |
| 4 Ls | Liked, Learned, Lacked, Longed for | Emotional processing |
| Mad-Sad-Glad | Emotional categorization | Tough sessions |
| Sailboat | Wind (helps), Anchor (slows), Rocks (risks) | Visual thinkers |

**Key Practice:** Pick 1-3 themes that matter most and go deep, rather than skimming 10 different problems.

```
DESIGN_IMPLICATION: Frame all prompts as blameless self-analysis.
"What happened" not "What did I do wrong."
Consider Mad-Sad-Glad as alternative emotional processing template.
Limit to 1-3 key learnings per session to ensure depth.
```

---

### From Esports: VOD Review Methodology

#### Game Analysis & Coaching
Sources: [Insights.gg](https://insights.gg/blog/what-are-vod-reviews-and-why-you-should-do-them), [Next Level Esports](https://www.nextlevelesports.com/blog/how-to-run-an-effective-vod-review), [Stratplays](https://stratplays.com/vod-reviews-everything-you-should-know-and-why/)

**Types of VOD Review:**
| Type | Focus | Daygame Equivalent |
|------|-------|-------------------|
| Micro | Individual player actions, mechanics | Single interaction breakdown |
| Macro | Team strategy, overall decisions | Session-level patterns |
| Synchronous | Live team review together | Wing debrief |
| Asynchronous | Coach records analysis for later | AI analysis of field reports |

**VOD Review Best Practices:**
- Keep sessions SHORT (10-15 minutes)
- Focus on 1-2 things per session
- Prioritize decision-making over mechanical execution
- Don't get hung up on every minor mistake

**Key Insight:** "Many players notice real improvement after a couple of weeks of regular VOD review. You'll start making smarter calls in live games since you've thought those situations through already."

```
DESIGN_IMPLICATION: Could integrate voice memo/video analysis for advanced users.
AI could provide "coach analysis" of text reports asynchronously.
Keep analysis focused: 1-2 themes per review, not everything at once.
```

---

### From Executive Coaching: 360 Feedback & Development

#### Leadership Reflection & Multi-Rater Feedback
Sources: [Emerald Insight - Impact of Coaching](https://www.emerald.com/insight/content/doi/10.1108/01437730210429070/full/html), [DDI](https://www.ddi.com/blog/how-to-use-360-degree-feedback), [Envisia](https://www.envisialearning.com/360_degree_feedback)

**360 Feedback Research:**
- Combination of multi-rater feedback + individual coaching can increase leadership effectiveness by up to 60%
- Self-assessment vs. others' ratings reveals blind spots
- Most valuable insight: gap between self-perception and external perception

**The Perception Gap:** "The greatest value of 360-degree feedback is that it helps leaders see the gap between their intentions and how they actually show up."

**Application to Daygame:**
| 360 Element | Daygame Equivalent |
|-------------|-------------------|
| Self-assessment | User's own field report |
| Peer feedback | Wing observations |
| "Customer" feedback | What she actually said/did |
| Coach feedback | AI analysis or human coach |

```
DESIGN_IMPLICATION: Consider "perception gap" prompts:
"What was your intention?" vs. "How did she respond?"
Wing feedback integration could add valuable external perspective.
```

---

### From Behavioral Science: BJ Fogg's Behavior Design

#### Tiny Habits & the Fogg Behavior Model
Sources: [BJ Fogg - Behavior Model](https://www.behaviormodel.org/), [Stanford Behavior Design Lab](https://behaviordesign.stanford.edu/resources/fogg-behavior-model), [Growth Engineering](https://www.growthengineering.co.uk/fogg-behavior-model/)

**The Formula: B = MAP**
- **B**ehavior happens when **M**otivation, **A**bility, and **P**rompt converge at the same moment

**The Action Line:**
```
High Motivation ─────────────────────────────
                  │    ✓ Action happens     │
                  │    (above the line)     │
                  └─────────────────────────┘
                           ACTION LINE
                  ┌─────────────────────────┐
                  │   ✗ No action           │
                  │   (below the line)      │
Low Motivation ───────────────────────────────
               Hard ◄─── Ability ───► Easy
```

**Types of Prompts:**
| Prompt Type | When to Use | Field Report Example |
|-------------|-------------|---------------------|
| Spark | Low motivation, high ability | Inspiring quote, reminder of why |
| Facilitator | High motivation, low ability | Simplified template, voice input |
| Signal | Both high | Simple reminder notification |

**Tiny Habits Approach:**
- Start with smallest possible version ("After I get home, I will write one sentence about my session")
- Celebrate immediately after completing the behavior
- Scale up only after habit is established

**Three Core Motivators:**
1. Sensation (pleasure/pain)
2. Anticipation (hope/fear)
3. Belonging (acceptance/rejection)

```
DESIGN_IMPLICATION: Offer "one sentence" minimum for field reports.
Use appropriate prompt type based on user's motivation/ability state.
Celebrate completion immediately (confetti, XP, streak update).
Frame habit around identity: "I am someone who reflects on experiences."
```

---

### From Psychology: Growth Mindset & Grit

#### Carol Dweck's Mindset Research
Sources: [Farnam Street](https://fs.blog/carol-dweck-mindset/), [Education Week](https://www.edweek.org/leadership/opinion-carol-dweck-revisits-the-growth-mindset/2015/09), [Stanford Teaching Commons](https://teachingcommons.stanford.edu/teaching-guides/foundations-course-design/learning-activities/growth-mindset-and-enhanced-learning)

**Fixed vs. Growth Mindset:**
| Fixed Mindset | Growth Mindset |
|---------------|----------------|
| "I'm not good at this" | "I'm not good at this YET" |
| Avoids challenges | Embraces challenges |
| Sees effort as fruitless | Sees effort as path to mastery |
| Ignores criticism | Learns from criticism |
| Threatened by others' success | Inspired by others' success |

**The Power of "Yet":** Adding "yet" to negative self-statements ("I can't do this → I can't do this yet") increases persistence and future confidence.

**Critical Clarification:** Growth mindset is NOT just about effort. Praising effort without linking to effective strategies is counterproductive. "It's about telling the truth about a student's current achievement and then, together, doing something about it."

**Praise Research:** Children praised for effort (process) were eager for challenges and persistent. Children praised for intelligence (person) rejected challenges and collapsed when facing difficulty.

#### Angela Duckworth's Grit Research
Sources: [Duckworth - Original Paper](https://pubmed.ncbi.nlm.nih.gov/17547490/), [Angela Duckworth Q&A](https://angeladuckworth.com/qa/)

**Grit Definition:** "Perseverance and passion for long-term goals." Not talent, not luck, not momentary intensity.

**Key Research Findings:**
- Grit predicted success across West Point cadets, Spelling Bee competitors, Ivy League GPAs
- Grit did NOT correlate with IQ
- Grit strongly correlated with Conscientiousness (Big Five personality)

**Connection to Deliberate Practice:** "Over 10 years of daily deliberate practice set apart expert performers from less proficient peers."

```yaml
growth_mindset_prompts:
  after_rejection:
    fixed_response: "I'm not cut out for this"
    growth_reframe: "What can I learn from this? What will I try differently?"

  after_success:
    fixed_response: "I'm naturally good at this"
    growth_reframe: "What specifically worked? How can I repeat and build on it?"

  facing_challenge:
    fixed_response: "This is too hard for me"
    growth_reframe: "This is an opportunity to grow. What's one small step?"
```

```
DESIGN_IMPLICATION: Use "yet" language in all prompts and feedback.
Praise process and strategy, not inherent ability.
Connect grit to long-term progress visualization (show improvement over time).
Frame challenges as opportunities, not threats.
```

---

### From Learning Science: Memory & Skill Acquisition

#### Spaced Repetition & Retrieval Practice
Sources: [Wikipedia - Spaced Repetition](https://en.wikipedia.org/wiki/Spaced_repetition), [MedStudy](https://explore.medstudy.com/blog/how-spaced-retrieval-works), [PMC - Spacing Effect](https://pmc.ncbi.nlm.nih.gov/articles/PMC8759977/)

**The Spacing Effect (Ebbinghaus, 1885):** Repetitions spaced in time produce stronger memories than repetitions massed together.

**Key Statistics:**
- Spaced repetition increases long-term retention by 200-300% compared to cramming
- Students using spaced repetition retain 80-90% after six months vs. 20-30% with cramming

**Critical Insight:** "Retrieval, not just repetition, strengthens memory. The best way to prevent forgetting is not passive repetition but structured, effortful retrieval."

**Application to Field Reports:**
| Learning Principle | Field Report Application |
|-------------------|-------------------------|
| Spaced repetition | Review past reports periodically, not just write new ones |
| Retrieval practice | Answer questions from memory before looking at notes |
| Interleaving | Mix different types of challenges, don't focus on one thing only |

#### Fitts & Posner's Stages of Motor Learning
Sources: [Sport Science Insider](https://sportscienceinsider.com/stages-of-learning/), [Human Kinetics](https://us.humankinetics.com/blogs/excerpt/understanding-motor-learning-stages-improves-skill-instruction)

**Three Stages:**
| Stage | Characteristics | Field Report Implication |
|-------|-----------------|-------------------------|
| Cognitive | High mental effort, many errors, inconsistent | Detailed templates with guidance |
| Associative | Fewer errors, more consistent, refining | Standard debrief, some autonomy |
| Autonomous | Automatic, effortless, minimal thought | Quick logs, focus on edge cases only |

**Key Shift:** "Initial, explicit control gives way to more routinized forms of control."

```
DESIGN_IMPLICATION: Template recommendations should adapt to skill level.
Periodically surface old reports for review (spaced repetition).
Consider retrieval prompts: "What did you learn last session?" before new report.
Track skill stage and adjust complexity accordingly.
```

---

### From Psychology: Metacognition & Self-Regulation

#### Thinking About Thinking
Sources: [EEF - Metacognition](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation), [PMC - Fostering Metacognition](https://pmc.ncbi.nlm.nih.gov/articles/PMC8734377/)

**Definition:** "Cognition about cognition" - awareness and control of one's own thinking processes.

**Two Components:**
1. **Metacognitive Knowledge**
   - Declarative: Knowing about yourself as a learner
   - Procedural: Knowing how to use learning strategies
   - Conditional: Knowing when and why to use particular strategies

2. **Metacognitive Regulation**
   - Planning: Deciding what strategies to use
   - Monitoring: Assessing your understanding while learning
   - Evaluating: Judging effectiveness after learning

**Key Finding:** "Metacognition and self-regulation approaches support pupils to think about their own learning more explicitly... Improved outcomes have been identified across literacy, maths and science."

**Context Dependency:** Metacognitive skills don't automatically transfer. Someone strong at reflecting on social skills may be weak at reflecting on technical skills.

```
DESIGN_IMPLICATION: Explicitly teach reflection strategies, don't assume users know how.
Include monitoring prompts: "How confident are you in this assessment?"
Track which reflection strategies each user finds most effective.
```

---

### From Psychology: Self-Efficacy (Bandura)

#### Building Confidence Through Mastery
Sources: [Simply Psychology](https://www.simplypsychology.org/self-efficacy.html), [Positive Psychology](https://positivepsychology.com/bandura-self-efficacy/), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3540350/)

**Four Sources of Self-Efficacy:**
| Source | Description | How to Apply in Field Reports |
|--------|-------------|------------------------------|
| Mastery Experiences | Personal success at the task | Highlight and celebrate wins |
| Vicarious Experiences | Seeing others succeed | Share community success stories |
| Social Persuasion | Encouragement from others | AI coach encouragement, wing support |
| Physiological States | Physical/emotional state | Track energy, mood, anxiety levels |

**The Power of Mastery Experiences:** "According to Bandura, the most effective way to build self-efficacy is to engage in mastery experiences." Nothing convinces you of your capability like achieving something firsthand.

**Setbacks Build Stronger Belief:** "When you push through initial setbacks and eventually succeed, those victories are especially rewarding, showing you clearly that perseverance pays off. In fact, successfully navigating setbacks can lead to even stronger self-belief than never facing difficulty at all."

**High vs. Low Self-Efficacy:**
| High Self-Efficacy | Low Self-Efficacy |
|--------------------|-------------------|
| Views challenges as mastery opportunities | Views challenges as threats to avoid |
| Focuses on skills they have | Focuses on skills they lack |
| Recovers quickly from setbacks | Dwells on failures |

```
DESIGN_IMPLICATION: Emphasize mastery experiences in UI and prompts.
Create "wins wall" or success log prominently displayed.
After setbacks, remind users of past successes.
Track physiological states to correlate with performance.
```

---

### From Therapy: Expressive Writing (Pennebaker)

#### Writing to Heal
Sources: [Wisconsin Integrative Health](https://www.fammed.wisc.edu/files/webfm-uploads/documents/outreach/im/tool-therapeutic-journaling.pdf), [Pennebaker Paper](https://journals.sagepub.com/doi/full/10.1177/1745691617707315), [Stanford SPARQ](https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/baikie_wilhelm_2005_-_emotional_and_physical_health_benefits_of_expressive_writing.pdf)

**The Protocol:** Write about stressful, traumatic, or emotional experiences for 15-20 minutes per session, 3-5 sessions over consecutive days.

**Research Results:**
- Over 200 studies published
- Average effect size of d=0.16 on health outcomes
- 5% reduction in mental health measure scores vs. control
- Greater benefit for anxiety and PTSD symptoms

**Critical Finding:** "Just writing about the facts of a trauma did not evidence any improvement." The emotional expression and meaning-making is essential, not just documentation.

**Mechanism:** "The simple act of expressing thoughts and feelings on paper about challenging and upsetting events can allow us to move forward by expressing and letting go of the feelings involved."

**Universality:** "The disclosure paradigm has benefited senior professionals with advanced degrees at rates comparable to rates of benefit in maximum security prisoners with 6th grade educations."

```
DESIGN_IMPLICATION: Encourage emotional expression, not just tactical analysis.
The "Blowout Recovery" template already captures this.
Prompts should invite feelings, not just facts.
Consider multi-day reflection for significant experiences.
```

---

### From Psychology: Emotion Regulation Science

#### Processing Emotions Effectively
Sources: [PMC - Reappraisal vs Acceptance](https://pmc.ncbi.nlm.nih.gov/articles/PMC6188704/), [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1187092/full), [Positive Psychology](https://positivepsychology.com/emotion-regulation/)

**The Process Model (Gross, 1998):**
Emotions can be regulated at 5 stages: Situation Selection → Situation Modification → Attentional Deployment → Cognitive Change (Reappraisal) → Response Modulation

**Two Key Strategies:**

| Strategy | Definition | When to Use |
|----------|------------|-------------|
| Cognitive Reappraisal | Changing the meaning of emotional events | When you can change perspective |
| Acceptance | Non-judgmentally accepting the experience | When the situation can't be changed |

**Research Comparison:**
- Reappraisal is more effective for changing subjective experience in short term
- Acceptance is less effortful and more effective for physiological response
- Both are "effective" for different reasons

**Counterintuitive Finding:** "Emotion naming impeded regulation via both cognitive reappraisal and mindful acceptance." Labeling an emotion too specifically can "crystalize" it and make it resistant to change.

**Reappraisal Tactics:**
1. **Reinterpretation:** Construe alternative meaning ("This rejection is useful data")
2. **Distancing:** Increase psychological distance ("How will I view this in 5 years?")

```
DESIGN_IMPLICATION: Offer both reappraisal AND acceptance pathways.
Avoid forcing specific emotion labels early in processing.
Use distancing prompts: "How would you view this in a month?"
"Blowout Recovery" should offer acceptance option alongside reframing.
```

---

### From Psychology: Reflection vs. Rumination

#### Healthy vs. Unhealthy Processing
Sources: [Child Focus](https://www.child-focus.org/news/what-is-the-difference-between-self-reflection-and-rumination-constructive-vs-destructive-thoughts/), [MSU Extension](https://www.canr.msu.edu/news/reflection_or_rumination), [Bluewater Psychiatry](https://www.bluewaterpsychiatry.com/rumination-vs-reflection-breaking-the-loop/)

**Critical Distinction:**
| Reflection | Rumination |
|------------|------------|
| Purposeful processing | Repetitive without purpose |
| Goal of learning/insight | Stuck in replay |
| Active, moves forward | Passive, goes in circles |
| Constructive | Self-flagellating |
| Time-limited | Endless |

**Rick Hanson's Test:** "The difference between reflection and rumination is whether the reflection process is productive. Introspection is productive, rumination is not: it's repetitive, negativistic, and often self-flagellating."

**Shift from Rumination to Reflection:**
- Replace abstract "why" questions with concrete "how" questions
- Set time limits on processing
- Label the experience ("I notice I'm ruminating")
- Focus on actionable next steps

**Warning Signs of Rumination:**
- Thinking about the same thing for hours
- No new insights emerging
- Increasingly negative self-talk
- Feeling worse, not better, after "reflecting"

```yaml
rumination_detection:
  time_check: "Have you been thinking about this for more than 30 minutes?"
  progress_check: "Have you gained any new insights, or are you repeating?"
  emotion_check: "Are you feeling better or worse than when you started?"
  action_check: "Do you have a clear next step, or are you still stuck?"

intervention:
  time_limit: "Set a timer for 10 minutes. When it ends, write one action item and stop."
  reframe: "Replace 'Why did this happen?' with 'What will I do next time?'"
  distraction: "Take a break. Go for a walk. Return with fresh eyes."
```

```
DESIGN_IMPLICATION: Build rumination detection into AI analysis.
Set suggested time limits for reflection sessions.
Always end with action-oriented prompt to break the loop.
Provide "rumination circuit breaker" intervention.
```

---

### From Research: Feedback Intervention Theory

#### When Feedback Helps vs. Harms
Sources: [Kluger & DeNisi 1996](https://psycnet.apa.org/record/1996-02773-003), [ResearchGate](https://www.researchgate.net/publication/232458848_The_Effects_of_Feedback_Interventions_on_Performance_A_Historical_Review_a_Meta-Analysis_and_a_Preliminary_Feedback_Intervention_Theory)

**Landmark Finding (Meta-analysis of 607 studies):**
- 1/3 of the time: Feedback improves performance
- 1/3 of the time: Feedback does nothing
- 1/3 of the time: Feedback DECREASES performance

**"Providing feedback is like gambling: on average you gain, but variance means 40% chance of performance loss."**

**When Feedback Harms:**
- Attention shifts to self/ego instead of task
- Complex, unfamiliar tasks with high cognitive load
- Recipient already anxious
- Feedback threatens self-image

**When Feedback Helps:**
- Combined with goal-setting (SMART goals, learning goals)
- Focuses on task, not person
- Simple, familiar tasks
- Recipient has high self-efficacy
- Includes strategies for improvement, not just outcome

**Key Principle:** "Feedback is most effective when it refers to instances of specific behavior, rather than behavior in general."

```
DESIGN_IMPLICATION: Always pair feedback with actionable strategies.
Keep focus on task and process, not on user identity.
For complex skill areas, emphasize learning goals over performance goals.
Be cautious with feedback for anxious/struggling users.
Consider user self-efficacy level when calibrating feedback intensity.
```

---

### From Research: Goal-Setting Theory (Locke & Latham)

#### What Makes Goals Effective
Sources: [Positive Psychology](https://positivepsychology.com/goal-setting-theory/), [MindTools](https://www.mindtools.com/azazlu3/lockes-goal-setting-theory/), [Stanford/SPIRE](https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf)

**35 Years of Research Summarized:**
- Specific, challenging goals led to higher performance 90% of the time
- Participants with difficult goals performed 250% higher than those with easy goals
- Validated across 40,000+ participants in multiple countries

**Five Goal-Setting Principles:**
| Principle | Description |
|-----------|-------------|
| Clarity | Specific, measurable goals |
| Challenge | Difficult enough to stretch |
| Commitment | Buy-in from the person |
| Feedback | Progress information |
| Task Complexity | Break complex goals into sub-goals |

**Learning Goals vs. Performance Goals:**
- For NEW, COMPLEX tasks: Learning goals work better
- "Focus on learning" beats "focus on outcome" for skill acquisition
- MBA students with learning goals had higher GPAs AND satisfaction

**The Commitment Factor:** "The goal-performance relationship is strongest when people are committed to their goals. This is particularly important for difficult goals."

```
DESIGN_IMPLICATION: Include session goal-setting before going out.
Goals should be specific and challenging but achievable.
For beginners: learning goals ("practice X technique") not performance goals ("get Y numbers").
Track commitment level - uncommitted goals don't work.
```

---

### From Research: Implementation Intentions

#### The Power of If-Then Planning
Sources: [Gollwitzer - Original](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf), [Wikipedia](https://en.wikipedia.org/wiki/Implementation_intention), [ResearchGate](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)

**The Format:** "If [situation X], then I will [behavior Y]"

**Meta-Analysis (94 studies, 8,000+ participants):** Medium-to-large effect size (d=0.65) on goal attainment.

**Key Finding:** "Difficult goal intentions were completed about 3 times more often when participants had furnished them with implementation intentions."

**Why It Works:**
1. Mental representation of situation becomes highly accessible
2. Strong associative link between situation and action is established
3. Behavior becomes automatically triggered by situational cue
4. Reduces need for conscious effort in the moment

**Metaphor:** "Passing control of behavior to the environment."

**Examples for Daygame:**
```yaml
implementation_intentions:
  opening:
    situation: "When I see an attractive woman walking alone"
    action: "I will approach within 3 seconds"

  sticking_point:
    situation: "When I feel the conversation stalling"
    action: "I will use a cold read or share something vulnerable"

  number_close:
    situation: "When she's laughing and engaged for 5+ minutes"
    action: "I will suggest we continue over coffee and ask for her number"

  reflection:
    situation: "When I get home from a session"
    action: "I will immediately open the app and log my best moment"
```

```
DESIGN_IMPLICATION: Include if-then planning in pre-session goal setting.
"When [situation], I will [action]" format for technique practice.
Implementation intentions for the reflection habit itself.
Review if-then plans in post-session to assess execution.
```

---

### From Research: Psychological Safety

#### Creating Safe Conditions for Learning from Mistakes
Sources: [Edmondson 1999](https://journals.sagepub.com/doi/10.2307/2666999), [HBS](https://www.hbs.edu/faculty/Pages/item.aspx?num=2959), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7393970/)

**Edmondson's Discovery:** Higher-performing hospital teams reported MORE errors, not fewer. Psychological safety enabled honest reporting, which enabled learning and improvement.

**Definition:** "The belief that you can speak up with ideas, questions, concerns, or mistakes without fear of repercussions."

**Google's Project Aristotle:** Psychological safety was the #1 factor behind high-performing teams. Teams with high psychological safety:
- Had lower turnover
- Harnessed more diverse ideas
- Brought in more revenue
- Were rated as effective 2× more often by management

**Three Core Behaviors:**
1. Frame work as a learning problem, not execution problem
2. Acknowledge your own fallibility
3. Model curiosity and ask questions

**Application to Self-Reflection:** Users need psychological safety with THEMSELVES to honestly assess their performance. Self-judgment and shame inhibit honest reflection.

```
DESIGN_IMPLICATION: Create psychologically safe environment in the app.
Normalize mistakes in UI copy: "Every approach is data. No failures, only feedback."
Never use judgmental language in prompts.
Celebrate honest self-assessment, not just good outcomes.
Privacy and confidentiality are essential for candid reflection.
```

---

### From Improv Comedy: The "Yes, And" Mindset

#### Embracing Failure and Building on Ideas
Sources: [Second City](https://futureofstorytelling.org/case-study/kelly-leonard-second-city-and-the-power-of-yes-and/), [Fast Company](https://www.fastcompany.com/3042080/yes-and-5-more-lessons-in-improv-ing-collaboration-and-creativity-from-second-city)

**The "Yes, And" Principle:** Accept what's given ("yes") and build on it ("and"). The opposite of "no, but" which blocks creative flow.

**Second City on Failure:** Classes are described as "brave and nurturing environments" that help participants "step outside their comfort zone and learn to embrace failure."

**Key Insight:** "You cannot be creative when you're in judgment of self or judgment of others. You also can't be creative if you're in fear."

**Handling Mistakes:** When someone screws up on stage at Second City, they acknowledge it and incorporate it. "By bringing the audience in, they'll love you for it."

**Application to Daygame:**
- Unexpected responses are opportunities, not obstacles
- Build on what she gives you ("yes, and")
- Mistakes in-set can become charming moments if acknowledged
- Fear and self-judgment block spontaneity

```
DESIGN_IMPLICATION: Frame unexpected responses as creative opportunities.
Encourage "yes, and" mindset in field reports.
When reviewing "mistakes," ask: "How could this have been incorporated?"
Reduce fear and judgment in the entire reflection experience.
```

---

### From Martial Arts: Training Logs & Fight Analysis

#### BJJ Video Review & Progress Tracking
Sources: [Athlete Analyzer](https://www.athleteanalyzer.com/video-analysis-brazilian-jiu-jitsu), [BJJ Fanatics](https://bjjfanatics.com/products/training-journal), [Richmond BJJ](https://www.richmondbjj.com/study/video101)

**BJJ Training Journal Components:**
- Session goals
- Techniques drilled (with repetitions)
- Sparring log (partners, outcomes)
- Areas for improvement
- Insights from class

**Fight Analysis (BJJ Scout Method):**
- Focus on "off the move" - what happens BEFORE the technique
- Study movement, grips, posture leading up to success
- See techniques in their natural environment, not just instructional

**Key Quote:** "The great value of watching analysis videos is that you see techniques in their natural environment. You see what really works, the circumstances under which it works, and the nuances that may be missed in an instructional video."

**Progression Tracking:** Track performance across competitions and training, identify patterns, monitor injury risk, look back at training blocks.

```
DESIGN_IMPLICATION: Track the "lead-up" to key moments, not just the moments themselves.
"What happened in the 30 seconds before?" for both wins and losses.
Pattern recognition across multiple sessions is key value.
Consider technique "drills" tracking for deliberate practice.
```

---

### From Music: Practice Journals

#### Deliberate Practice for Musicians
Sources: [Modacity](https://www.modacity.co/blog/deliberate-practice-helps-musicians-learn-faster), [Online Metronome](https://theonlinemetronome.com/practice-journal), [SAGE Journals](https://journals.sagepub.com/doi/full/10.1177/03057356211065172)

**Practice Journal Components:**
- Session goals
- What was practiced (specific pieces/techniques)
- Duration and quality of focus
- What went well
- What needs more work
- Plan for next session

**Key Insight:** "It's not about how much time you practice, it's about HOW you practice. Deliberate practice is by far the most effective and fastest way to progress."

**Quality Over Quantity:** Students should "not only record their practice time but also have a call to action when it comes to reflecting on their practice effectiveness and progress each week."

```
DESIGN_IMPLICATION: Track quality of session, not just quantity of approaches.
Focus prompts: "Were you fully present or going through motions?"
Session goals should be technique-specific, not just volume-based.
```

---

## Synthesized Insights (Round 3)

### New Design Principles from Comprehensive Research

| # | Principle | Source | Application |
|---|-----------|--------|-------------|
| 14 | Process over outcomes | Trading psychology, goal-setting | Judge decisions, not results |
| 15 | Psychological safety with self | Edmondson, improv | No self-judgment; normalize failure |
| 16 | If-then planning | Gollwitzer | Pre-session implementation intentions |
| 17 | Rumination circuit breakers | Psychology research | Time limits, action requirements |
| 18 | Match feedback to self-efficacy | Kluger & DeNisi | Gentler feedback for struggling users |
| 19 | What? So What? Now What? | Driscoll | Minimal viable reflection structure |
| 20 | Focus on the lead-up | BJJ Scout, 80/20 | "What happened before the key moment?" |
| 21 | Mastery experiences build confidence | Bandura | Prominently display wins and progress |
| 22 | Learning goals for new skills | Locke & Latham | "Practice X" not "Achieve Y" |
| 23 | Spaced retrieval of past learnings | Learning science | Periodically resurface old insights |
| 24 | Yes, And mindset | Improv | Unexpected = opportunity |
| 25 | Expressive writing heals | Pennebaker | Emotional expression, not just facts |

### Master Reflection Framework (Synthesized)

Based on all research, the optimal reflection follows this flow:

```
PRE-SESSION
├── Set specific learning goal (not outcome goal)
├── Create implementation intention ("If X, then Y")
└── Note starting emotional state

POST-SESSION: IMMEDIATE (< 30 min after)
├── Quick emotional check (how do you feel right now?)
├── Log basic stats (approaches, location, duration)
└── Best moment (one sentence)

POST-SESSION: STANDARD (same day)
├── What? (factual description of significant interaction)
├── Feelings? (emotional state before/during/after)
├── So What? (what does this mean? patterns? insights?)
├── Now What? (specific action for next time)
└── Celebration (acknowledge effort, wins)

POST-SESSION: DEEP DIVE (for near-misses, breakthroughs)
├── Full reconstruction of interaction
├── The lead-up (what happened in 3 min before key moment)
├── Intended vs. actual comparison
├── Cognitive distortion check (if negative)
├── Implementation intention for next time
└── Self-compassion element

WEEKLY REVIEW
├── Pattern identification across sessions
├── Spaced retrieval of past learnings
├── Progress on learning goals
└── Adjust focus for next week

BLOWOUT RECOVERY
├── Acceptance before reappraisal
├── Rumination circuit breaker (time limit)
├── Common humanity reminder
├── Self-compassion ("What would you tell a friend?")
└── One tiny action step forward
```

### AI Coach Behavioral Guidelines

Based on Feedback Intervention Theory and psychological safety research:

```yaml
ai_coach_guidelines:
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
      - More frequent acknowledgment of progress
      - Learning goals only
      - Smaller steps
    high_self_efficacy:
      - Can handle direct feedback
      - Performance goals acceptable
      - Challenge them appropriately
      - Focus on edge cases
```

---

## Comprehensive Sources Index (Round 3)

### Aviation & CRM
- [AOPA - CRM](https://www.aopa.org/news-and-media/all-news/2019/july/flight-training-magazine/crm-head-in-the-game)
- [FAA Advisory Circular 120-51D](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120_51D.pdf)
- [SKYbrary - CRM](https://skybrary.aero/articles/crew-resource-management-crm)

### Healthcare Reflection Models
- [Simply Psychology - Gibbs Cycle](https://www.simplypsychology.org/gibbs-reflective-cycle.html)
- [University of Edinburgh - Gibbs](https://reflection.ed.ac.uk/reflectors-toolkit/reflecting-on-experience/gibbs-reflective-cycle)
- [EBSCO - Driscoll Model](https://www.ebsco.com/research-starters/health-and-medicine/driscoll-model-reflection)
- [Cambridge - Reflection Models](https://libguides.cam.ac.uk/reflectivepracticetoolkit/models)

### Sales Coaching
- [Claap - Sales Call Review](https://www.claap.io/blog/sales-call-review-routines)
- [Advanced Business Abilities](https://advancedbusinessabilities.com/sales-call-review/)
- [MindTickle - Call Recordings](https://www.mindtickle.com/blog/how-to-analyze-sales-call-recordings-to-uncover-valuable-customer-feedback/)

### Poker & Trading Psychology
- [Jared Tendler](https://jaredtendler.com/)
- [Deuces Cracked - Tilt Psychology](https://www.deucescracked.com/the-psychology-of-poker-understanding-and-controlling-tilt/)
- [FX Replay - Trading Journal](https://www.fxreplay.com/learn/trading-psychology-starts-with-a-journal--heres-why)

### Agile & Software
- [Atlassian - Retrospective](https://www.atlassian.com/team-playbook/plays/retrospective)
- [GoRetro - Blameless Retrospectives](https://www.goretro.ai/post/how-to-run-a-blameless-sprint-retrospective)
- [NOBL - Guide to Retrospectives](https://nobl.io/changemaker/definitive-guide-to-agile-retrospectives-and-post-mortem-meetings/)

### Esports Coaching
- [Insights.gg - VOD Reviews](https://insights.gg/blog/what-are-vod-reviews-and-why-you-should-do-them)
- [Next Level Esports](https://www.nextlevelesports.com/blog/how-to-run-an-effective-vod-review)
- [Stratplays - VOD Review](https://stratplays.com/vod-reviews-everything-you-should-know-and-why/)

### Behavioral Science
- [BJ Fogg - Behavior Model](https://www.behaviormodel.org/)
- [Stanford Behavior Design Lab](https://behaviordesign.stanford.edu/resources/fogg-behavior-model)
- [Gollwitzer - Implementation Intentions](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf)

### Psychology Research
- [Carol Dweck - Growth Mindset](https://fs.blog/carol-dweck-mindset/)
- [Angela Duckworth - Grit](https://angeladuckworth.com/qa/)
- [Bandura - Self-Efficacy](https://www.simplypsychology.org/self-efficacy.html)
- [Edmondson - Psychological Safety](https://journals.sagepub.com/doi/10.2307/2666999)
- [Kluger & DeNisi - Feedback](https://psycnet.apa.org/record/1996-02773-003)
- [Locke & Latham - Goal Setting](https://positivepsychology.com/goal-setting-theory/)

### Learning Science
- [Spaced Repetition - Wikipedia](https://en.wikipedia.org/wiki/Spaced_repetition)
- [Fitts & Posner - Motor Learning](https://sportscienceinsider.com/stages-of-learning/)
- [EEF - Metacognition](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation)

### Therapeutic Writing
- [Pennebaker - Expressive Writing](https://journals.sagepub.com/doi/full/10.1177/1745691617707315)
- [Emotion Regulation - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6188704/)

### Improv & Performance
- [Second City - Yes, And](https://futureofstorytelling.org/case-study/kelly-leonard-second-city-and-the-power-of-yes-and/)
- [Fast Company - Improv Lessons](https://www.fastcompany.com/3042080/yes-and-5-more-lessons-in-improv-ing-collaboration-and-creativity-from-second-city)

### Martial Arts & Sports
- [BJJ Fanatics - Training Journal](https://bjjfanatics.com/products/training-journal)
- [Richmond BJJ - Video Analysis](https://www.richmondbjj.com/study/video101)
- [Modacity - Music Practice](https://www.modacity.co/blog/deliberate-practice-helps-musicians-learn-faster)

---

## Extended Research (Round 4) - Community & User Feedback
**Research Date:** 29-01-2026

This section contains direct user feedback from Reddit, forums (Skilled Seducer, SoSuave, etc.), and community blogs about what real users say they want, need, and struggle with regarding field reports.

---

### What Users Say Works

#### The 80/20 Approach is Popular
Source: [Skilled Seducer - 80/20 Rule](https://www.skilledseducer.com/threads/stickied-how-to-write-efficient-field-reports-80-20-rule-time-hack.18988/)

After reading the 80/20 field report guide, one user shared they "started writing down my interactions in great detail to analyze why they failed, and decide on what to improve for next time" and saw "way more improvement than the last few hundred approaches before that."

**Key User Insight:** "Writing field reports can take ages. Focusing on the emotional tipping points saves time. It's usually in those crucial moments where success or failure is determined."

#### Three Main Benefits Users Report
Source: [r/seduction community guidelines](https://libredd.it/r/seduction)

1. **Documents Progress & Fuels Motivation**
   - "It documents your progress, and fuels your own motivation. You can use it for future reference."

2. **Creates Accountability**
   - "Writing field reports holds yourself accountable. You write that you're going to try something, and then you have to do it and write the results."

3. **Provides Useful Feedback**
   - "Early in the learning process, the feedback received can help correct sticking points."

#### Bridge Between Theory and Practice
Users note that sharing experiences and reading others' experiences serves "as a bridge between the theoretical and practical - the two don't exist in isolation."

---

### What Users Say DOESN'T Work

#### Stats Can Become Counterproductive
Source: [Thomas Crown PUA - Stats Guide](https://thomascrownpua.com/2019/09/28/how-to-keep-daygame-statistics/)

**After 1000 approaches, detailed tracking becomes harmful:**
- "The problem with keeping stats for a long time is that you become anchored to them"
- "You may start to daygame with an eye for good stats, subconsciously going for easier sets"
- "Daygame is supposed to be fun" - stats shouldn't undermine intrinsic motivation

**Recommended Progression:**
| Year | What to Track |
|------|---------------|
| 1-3 | Sets, phone numbers, dates, lays |
| 4 | Stop recording phone number ratios |
| 5 | Stop tracking date counts |
| 6+ | Only remember lay count; stop calculating ratios |

#### Over-Detailed Reports for Every Interaction
When first starting, detail is useful. But users report diminishing returns: "you can reach a point where you're spending much time writing without a huge return on investment."

#### Field Reports Without Getting Feedback
Source: [Skilled Seducer Forum Rules](https://www.skilledseducer.com/threads/read-before-posting-field-reports-board-rules.12/)

Some users post field reports but don't engage with feedback. The community emphasizes that field reports "are mostly for your own use to look back and learn from them" - but the real value comes from external perspective.

---

### Community Debates & Preferences

#### Report Timing Preferences
| Timing | Pros | Cons |
|--------|------|------|
| Immediately after session | Fresh memory, accurate details | May still be emotional |
| Same night before bed | Time to decompress first | Details may fade |
| Next morning | Fresh perspective, better analysis | Lose specifics |

**Community consensus:** Write basic notes immediately, do deeper analysis within 24 hours.

#### Report Length Debates
Source: [Modern Seduction](https://www.modernseduction.com/field-report-template-for-rapidly-improving-your-game/)

"Although more detail is generally better, you can write a short field report in about five minutes and get a lot of insights from just that — probably more insights than the entire night of going out gave you."

**Julien Blanc quote shared often:** "Game is 49% taking action and 51% writing field reports."

#### What Should Count as a Lay Report?
Source: [Skilled Seducer Petition Thread](https://www.skilledseducer.com/threads/petition-to-change-rules-about-lr-and-fr.24596/)

Active debate about terminology:
- **LR** = Penis in vagina only
- **LR-** = Oral sex
- **LR--** = Handjobs/foreplay
- **FR++** = Brought girl to private location
- **FR+** = Kissed
- **FR** = Met new women

This tiered system helps identify "specific transition-phase challenges in reports, not merely classify achievements."

---

### What Users Ask For Help With

#### Common Field Report Questions
Source: [Skilled Seducer Forums](https://www.skilledseducer.com/forums/field-reports.5/)

Users frequently ask:
- "What themes, frames should I be looking to set when texting a girl?"
- "I usually just go with the flow - should I have more structure?"
- "What would you have done differently?"
- "Where did I lose her?"

#### Example of Quality Feedback Given
When a user shared a text conversation, the feedback was direct:
"Appearing to be like a silly internet geek will drastically reduce your success rate... Chances are you already completely blew this opportunity when you acted like you forgot who she was."

Users want **specific, actionable criticism**, not vague encouragement.

---

### User Frustrations with Field Reports

#### Low Quality Reports Don't Help Anyone
Source: [r/seduction Guidelines](http://seddit.wikidot.com/)

The community's golden rule: "Does this post help someone get laid or land a relationship?"

**Great field reports focus on:**
- Techniques, mindsets, and phrases specifically used
- What changed the course of the interaction
- If a failure: what would have turned it into a success

**Bad field reports:**
- Just narrative without analysis
- "I approached, we talked, she left" with no insight
- Bragging without teaching

#### Forums Can Become "Echo Chambers"
Source: [Medium - Reddit Seduction Critique](https://medium.com/@bryce_foster/why-reddit-seduction-is-destroying-your-game-and-what-to-do-about-it-bdf74fb372ba)

Critics note: "The seduction community is run through with references to feel-good 'positive thinking' that clearly fuels an entire industry of guys who keep coming back for more instead of actually solving their problems."

When successful, users "thank the community." When they fail, they "blame themselves." This creates unhealthy dynamics.

#### The RooshV Forum Saga
Source: [SoSuave Discussion](https://www.sosuave.net/forum/threads/rooshvforum-alternative.273733/)

When the popular RooshV Forum shifted focus:
- Users complained they only see "theories and opinions, or asking for personal help"
- "Nothing is actually happening, only online blah-blah"
- The forum's strength was that it "wasn't just about pickup" - lifestyle and self-improvement were integrated

**User insight:** "The reason RVF towered head and shoulders above other PUA forums is that IT'S NOT JUST ABOUT PICK-UP. You NEED the Lifestyle and Everything Else forums to foster good PUAs."

---

### Audio/Voice Recording Preferences

#### Voice Memos After Sessions
Source: [One Man's Life Mission](https://onemanslifemission.com/how-to-write-a-pick-up-field-report-pua-field-report/)

Best practice: "Record audio voice memos at end of each approach while fresh."

**Benefits users report:**
- Captures emotional state in the moment
- Faster than typing
- Can be transcribed later
- Preserves details that would be forgotten

**Drawback:** Harder to search/review than written text.

#### AI Transcription Workflow
Source: [Krauser PUA](https://krauserpua.com/2017/12/)

Krauser recommends a lower-budget memoir approach:
"Tell your stories into your smartphone's audio recorder, get the files transcribed, and then go through the transcript yourself turning it from speech to prose."

Many writers "leverage their existing lay reports from blogs or forums as raw data."

---

### Tracking Apps Users Actually Use

#### Daylio (Most Popular General Tracker)
Source: [Reddit Favorites](https://redditfavorites.com/android_apps/daylio-diary-journal-mood-tracker)

- "Quick and easy" - reminds you automatically, takes seconds to complete
- Completely customizable activities
- Shows graphs of past weeks/months with activity correlations
- Can export all data to Google Drive for deeper analysis
- Users report using it "every day for years"

#### Google Forms + Spreadsheet Approach
Users recommend: "Do this with Google Forms if you want to be simple and straightforward. It dumps the data into a spreadsheet that you can add pivots/charts/whatever on top of."

#### Custom Spreadsheets
Source: [Thomas Crown PUA](https://thomascrownpua.com/statistics/how-to-keep-daygame-stats/)

"Create a spreadsheet which you can access on your phone and add your sets at the end of each session."

**Initial tracking columns:**
- Sets
- Phone numbers
- Social media adds
- Responses to feelers
- I-dates
- Dates
- Kisses
- Lays

**Advanced columns:**
- Time on street
- Time on dates
- Stops vs. social hooks vs. sexual hooks

---

### What the Community Values Most

#### Template for Good Field Report (User-Derived)
Source: [Pickup Alpha](https://pickupalpha.com/example-of-a-good-pickup-field-report/)

1. **Timing:** Write immediately the night you come back
2. **Duration:** ~30 minutes of focused writing
3. **Format:** Summarize each interaction in a single paragraph
4. **Critical Question:** Why did it end? What could you have done differently?
5. **Balance:** 3 things done well + 3 things to improve

#### What Forum Users Most Want in Reports

| Element | Why It Matters |
|---------|----------------|
| Opening approach used | Learn what works |
| Target's initial response | Calibration data |
| Conversation topics/dynamics | Technique analysis |
| How the set concluded | The critical learning moment |
| Specific tactical lessons | Actionable takeaways |

---

### Synthesized User Feedback Insights

#### Design Implications from User Feedback

| Finding | Design Implication |
|---------|-------------------|
| Users want quick capture after sessions | Voice memo option + simple quick log |
| Stats become counterproductive after ~1000 approaches | Phase out detailed tracking over time |
| Users want specific, actionable feedback | AI coach should give direct, specific guidance |
| Detail fatigue is real | 80/20 templates, focus on key moments |
| Community accountability drives consistency | Streak tracking, social features |
| Users debate terminology (LR, FR, etc.) | Flexible categorization, user-defined labels |
| Forums become "echo chambers" | Ground feedback in evidence, not platitudes |
| Integration with lifestyle/self-improvement valued | Don't isolate approach tracking from bigger picture |

#### What Users Say They Actually Want

```yaml
user_wants:
  quick_capture:
    - "Takes seconds to complete"
    - "Can do it on my phone right after"
    - "Reminds me automatically"

  meaningful_analysis:
    - "What specific thing went wrong?"
    - "What would you have done differently?"
    - "Pattern recognition across sessions"

  motivation_boosters:
    - "See my progress over time"
    - "Celebrate small wins"
    - "Accountability to keep going"

  honest_feedback:
    - "Don't sugarcoat it"
    - "Tell me what I did wrong"
    - "But also acknowledge what worked"

  community_connection:
    - "Learn from others' reports"
    - "Share techniques that work"
    - "Not feel alone in the struggle"
```

#### What Users Say They DON'T Want

```yaml
user_dislikes:
  tedious_logging:
    - "Writing out every detail of every interaction"
    - "Tracking stats that don't matter anymore"
    - "Spending more time logging than doing"

  vague_platitudes:
    - "You're doing great!"
    - "Just be confident"
    - "Generic advice that doesn't help"

  judgment:
    - "Feeling embarrassed to share failures"
    - "Being mocked for mistakes"
    - "Unhelpful criticism without solutions"

  complicated_systems:
    - "Too many fields to fill out"
    - "Rigid structures that don't fit my situation"
    - "Having to categorize everything precisely"
```

---

### Community Sources Index (Round 4)

#### Forums
- [Skilled Seducer - Field Reports Board](https://www.skilledseducer.com/forums/field-reports.5/)
- [Skilled Seducer - 80/20 Field Reports](https://www.skilledseducer.com/threads/stickied-how-to-write-efficient-field-reports-80-20-rule-time-hack.18988/)
- [Skilled Seducer - FR/LR Rules Discussion](https://www.skilledseducer.com/threads/petition-to-change-rules-about-lr-and-fr.24596/)
- [SoSuave - Field Reports](https://www.sosuave.net/forum/tags/field-report/)
- [SoSuave - RooshV Alternative Discussion](https://www.sosuave.net/forum/threads/rooshvforum-alternative.273733/)

#### Reddit
- [r/seduction Community](https://libredd.it/r/seduction)
- [Seddit Wiki](http://seddit.wikidot.com/)

#### Blogs & Guides
- [Thomas Crown PUA - Daygame Stats](https://thomascrownpua.com/2019/09/28/how-to-keep-daygame-statistics/)
- [Pickup Alpha - Good Field Report Example](https://pickupalpha.com/example-of-a-good-pickup-field-report/)
- [One Man's Life Mission - How to Write Field Reports](https://onemanslifemission.com/how-to-write-a-pick-up-field-report-pua-field-report/)
- [Krauser PUA - Blogging Advice](https://krauserpua.com/2017/12/)

#### Critical Perspectives
- [Medium - Reddit Seduction Critique](https://medium.com/@bryce_foster/why-reddit-seduction-is-destroying-your-game-and-what-to-do-about-it-bdf74fb372ba)

#### Tracking Tools
- [Daylio App](https://daylio.net/)
- [Reddit Favorites - Daylio Discussion](https://redditfavorites.com/android_apps/daylio-diary-journal-mood-tracker)
