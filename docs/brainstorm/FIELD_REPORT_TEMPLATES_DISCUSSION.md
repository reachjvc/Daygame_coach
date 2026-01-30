# Field Report Templates - Design Discussion
**Status:** ✅ APPROVED - Ready for implementation
**Updated:** 30-01-2026 12:30

## Changelog
- 30-01-2026 12:30 - Added Template 4 (Customizable) with 10 research questions. Added "intention/goal" to all templates. Added "30 seconds before" and "not admitting" to Deep Dive.
- 31-01-2026 05:45 - USER APPROVED. Ready for implementation.
- 31-01-2026 05:30 - Phase 11+12 COMPLETE. Final specs written.
- 31-01-2026 05:15 - Phase 10 COMPLETE. Master lists compiled.
- 31-01-2026 05:00 - User checkpoint B/C/D complete. Feedback captured.

---

## Current State

### What's DONE
- **Research:** 1,600+ lines across 9 files (sports psych, military AAR, CBT, habit science, etc.)
- **25 design principles** extracted in [DESIGN.md](../research/FIELD_REPORTS/DESIGN.md)
- **Pre-session prompts:** Already working (session_focus, technique_focus, if_then_plan, custom_intention)
- **UI infrastructure:** FieldReportPage, FieldRenderer, template selection UI
- **4 template shells in DB:** quick-log, standard, deep-dive, customizable (final specs defined)
- **Phases 1-9 COMPLETE** (92 steps): Structural angles, research, questions, user contexts, competitor analysis, goal-based designs, anti-patterns, wild cards
- **User Checkpoint B/C/D:** Feedback captured - see section below Phase 9

### What's IN PROGRESS
- **Implementation:** Ready to start

### What's NEXT
- Update database templates with final specs
- Build conversation module component
- Add pattern alerts feature
- Add voice capture feature

---

## Ideation Plan: Divergent Exploration (~184 steps)

**Approach:** Generate MANY different ideas from MANY angles. Don't converge too early. User picks what resonates.

**User Checkpoints:** Pause for feedback after phases 3, 6, and 9.

---

## PHASE 1: Structural Angles (15 steps)

| # | Step | Status |
|---|------|--------|
| 1.1 | Define depth-based templates: Quick / Standard / Deep | ✅ |
| 1.2 | List pros/cons of depth-based approach | ✅ |
| 1.3 | Define emotional-state templates: Good day / Tough day / Breakthrough | ✅ |
| 1.4 | List pros/cons of emotional-state approach | ✅ |
| 1.5 | Define purpose-based templates: Learning / Processing / Just-tracking | ✅ |
| 1.6 | List pros/cons of purpose-based approach | ✅ |
| 1.7 | Define time-based templates: Immediate / Same-day / Next-day | ✅ |
| 1.8 | List pros/cons of time-based approach | ✅ |
| 1.9 | Define modular approach: Core template + optional add-ons | ✅ |
| 1.10 | List pros/cons of modular approach | ✅ |
| 1.11 | Define experience-based: Beginner / Intermediate / Advanced templates | ✅ |
| 1.12 | Define single-template-only approach (one size fits all) | ✅ |
| 1.13 | Define freeform-only approach (no structure) | ✅ |
| 1.14 | Define hybrid combinations (e.g., depth × emotion matrix) | ✅ |
| 1.15 | Rank all structural approaches by fit for daygame context | ✅ |

**Output →**

### 1.1 Depth-Based Templates

| Template | Time | Core Purpose | Fields |
|----------|------|--------------|--------|
| **Quick** | 30s | Log the session happened | When/where, count, mood (1-5), best moment (1 line) |
| **Standard** | 3m | Learn from the session | + context, wins/work-ons, key takeaway |
| **Deep** | 10m | Full forensic analysis | + reconstruction, emotional timeline, technique review, replay with changes |

### 1.2 Depth-Based Pros/Cons

| Pros | Cons |
|------|------|
| Intuitive mental model (short/medium/long) | User must judge "how deep" - choice friction |
| Scales with available time | May choose Quick when Deep is needed (avoidance) |
| Research-backed (habit science: low friction options) | Depth ≠ emotional state (deep dive after easy day?) |
| Already familiar from existing templates | 3 options may not cover all states |

### 1.3 Emotional-State Templates

| Template | When to use | Core Fields |
|----------|-------------|-------------|
| **Good Day** | Session went well, feeling positive | Celebration focus, what worked, replicate-plan |
| **Tough Day** | Rejection-heavy, low energy, struggled | Self-compassion, reframe, one tiny next step |
| **Breakthrough** | Something clicked, major insight | Capture the insight, what led to it, how to repeat |

### 1.4 Emotional-State Pros/Cons

| Pros | Cons |
|------|------|
| Matches user's actual experience | Requires emotional self-awareness |
| CBT-aligned (emotion first) | "Tough day" might feel like admitting defeat |
| Different states need different support | Miss neutral/average days |
| Reduces shame (explicit "tough day" option) | May anchor negative identity |

### 1.5 Purpose-Based Templates

| Template | Purpose | Core Fields |
|----------|---------|-------------|
| **Learning** | Skill development focus | Technique practiced, what worked/didn't, next experiment |
| **Processing** | Emotional debrief | How you felt, why, reframe, self-compassion |
| **Just-Tracking** | Pure data logging | Stats only: when, where, count, outcomes |

### 1.6 Purpose-Based Pros/Cons

| Pros | Cons |
|------|------|
| Clear intent for each template | User must know what they need (metacognition) |
| Separates concerns cleanly | Real sessions often need multiple purposes |
| "Just-tracking" legitimizes minimal input | May skip learning when tired (always "just-tracking") |
| Matches different user goals | 3 purposes may not cover all needs |

### 1.7 Time-Based Templates

| Template | When filled | Design constraints |
|----------|-------------|-------------------|
| **Immediate** | Still on street, between sets | Taps only, no typing, <15 seconds |
| **Same-Day** | Evening at home | Full typing, 2-5 minutes, memory fresh |
| **Next-Day** | Morning after | Distance perspective, pattern questions |

### 1.8 Time-Based Pros/Cons

| Pros | Cons |
|------|------|
| Design matches physical context | Doesn't address emotional state |
| Mobile-optimized "immediate" prevents forgetting | Three reports per session? Too much |
| "Next-day" adds reflection distance | User may only do one (which?) |
| Research-backed (spacing effect) | Complicated flow |

### 1.9 Modular Approach

**Core template (always required):**
- When/where, count, mood, best moment

**Optional add-ons (user chooses):**
- 📊 Stats module: Duration, outcome breakdown, numbers
- 🎯 Learning module: Technique focus, what worked, next experiment
- 💭 Processing module: Emotional state, reframe, self-compassion
- 🔬 Deep-dive module: Full reconstruction, lead-up analysis, replay

### 1.10 Modular Pros/Cons

| Pros | Cons |
|------|------|
| Maximum flexibility | Choice overload (which modules?) |
| User builds custom experience | Implementation complexity |
| Can add depth without changing template | May skip important modules |
| Progressive disclosure | Hard to enforce learning cycle completion |

### 1.11 Experience-Based Templates

| Template | User stage | Design focus |
|----------|------------|--------------|
| **Beginner** (0-100) | Building habit, overcoming fear | Celebrate showing up, low friction, identity building |
| **Intermediate** (100-500) | Developing skills | Technique focus, pattern recognition, sticking points |
| **Advanced** (500+) | Refining edge cases | Speed, edge-case analysis, minimal guidance |

**Note:** Could auto-detect based on total approach count in system.

### 1.12 Single-Template Approach

**One template for all situations:**
```
1. When/where (auto-filled)
2. Count
3. How did it feel? (1-5 + optional text)
4. Best moment
5. What would you do differently?
6. Key takeaway
```

| Pros | Cons |
|------|------|
| Zero choice friction | One size fits none perfectly |
| Consistency for analytics | Can't match emotional state |
| Simple to learn | Boring over time |
| Fast to complete | Misses deep-dive opportunity |

### 1.13 Freeform-Only Approach

**Just a text box:**
```
Write whatever you want about today's session.
```

Optional prompts shown as hints (not required fields).

| Pros | Cons |
|------|------|
| Maximum expression | No structure for analytics |
| Respects user agency | Easy to skip entirely |
| Natural for journalers | Hard to track patterns over time |
| No "wrong" answers | No completion guidance |

### 1.14 Hybrid Combinations

**A. Depth × Emotion Matrix (6 templates):**
| | Good Day | Tough Day |
|---|----------|-----------|
| Quick | Quick-Good | Quick-Tough |
| Standard | Standard-Good | Standard-Tough |
| Deep | Deep-Good | Deep-Tough |

**B. Core + Emotion add-on:**
- Choose depth (Quick/Standard/Deep)
- Optional: Add "Blowout Recovery" module if tough day

**C. Time + Purpose hybrid:**
- Immediate: Just-tracking
- Same-day: Learning
- Next-day: Processing (if needed)

**D. Experience + Emotion:**
- Beginner: Extra self-compassion built in
- Advanced: Self-compassion as opt-in module

### 1.15 Structural Approach Ranking

| Rank | Approach | Fit | Rationale |
|------|----------|-----|-----------|
| 1 | **Depth-based** | ⭐⭐⭐⭐⭐ | Intuitive, research-backed, already partially implemented |
| 2 | **Modular (core + add-ons)** | ⭐⭐⭐⭐ | Flexible, but needs good defaults |
| 3 | **Emotional-state** | ⭐⭐⭐⭐ | Strong for processing, may need depth option too |
| 4 | **Hybrid (depth + emotion)** | ⭐⭐⭐⭐ | Covers most cases, but 4-6 options = choice friction |
| 5 | **Purpose-based** | ⭐⭐⭐ | Clean but requires metacognition |
| 6 | **Experience-based** | ⭐⭐⭐ | Good personalization, hard to switch levels |
| 7 | **Single-template** | ⭐⭐ | Too limiting for diverse needs |
| 8 | **Time-based** | ⭐⭐ | Context-aware but complicated flow |
| 9 | **Freeform** | ⭐ | Loses structure benefits |

**Recommendation:** Depth-based primary structure with emotional-state consideration built in (e.g., "Blowout" as a variant of Deep, or as a module)

---

## PHASE 2: Research Domain Lenses (15 steps)

| # | Step | Status |
|---|------|--------|
| 2.1 | Read habit_science.md, extract B=MAP and friction reduction ideas | ✅ |
| 2.2 | Extract habit stacking and celebration ideas | ✅ |
| 2.3 | Propose habit-science optimized template | ✅ |
| 2.4 | Read military_aar.md, extract 4 AAR questions and intended-vs-actual | ✅ |
| 2.5 | Extract sustain/improve framework | ✅ |
| 2.6 | Propose military-style template | ✅ |
| 2.7 | Read sports_psychology.md, extract Well-Better-How and 3-2-1 format | ✅ |
| 2.8 | Extract process-vs-outcome focus principles | ✅ |
| 2.9 | Propose sports-psychology template | ✅ |
| 2.10 | Read cbt_journaling.md, extract cognitive distortion patterns | ✅ |
| 2.11 | Extract self-compassion and rumination circuit-breaker techniques | ✅ |
| 2.12 | Propose CBT-style template | ✅ |
| 2.13 | Read learning_science.md, extract Kolb cycle and deliberate practice | ✅ |
| 2.14 | Propose learning-science template | ✅ |
| 2.15 | Read community_feedback.md, extract user preferences and pain points | ✅ |

**Output →**

### HABIT SCIENCE LENS

#### 2.1-2.2 Key Extractions

**BJ Fogg's B=MAP Model:**
- Behavior = Motivation × Ability × Prompt
- Low motivation? → Use "Spark" prompt (inspiring, why it matters)
- Low ability? → Use "Facilitator" prompt (simplify, reduce friction)
- Both high? → Simple "Signal" reminder is enough

**Friction Reduction Ideas:**
- One sentence minimum (lowering the bar)
- Pre-filled defaults (location, time auto-detected)
- Voice-to-text option
- Templates reduce decision fatigue
- 59-66 days to form habit → set expectations

**Habit Stacking:**
- Link report to existing routine: "After I get home, I complete my report"
- Implementation intentions: "If X situation, then Y behavior"
- +64% success rate with habit stacking

**Celebration:**
- Immediate reward after completing (confetti, XP, streak)
- Identity framing: "I am someone who reflects" vs "I should reflect"
- +32% adherence with identity-based habits

#### 2.3 Habit-Science Template: "The Streak Builder"

**Design goal:** Maximum consistency, minimum friction

```
REQUIRED (30 seconds):
1. [Auto] Date/time/location
2. Did you go out today? ✅/❌
3. How many approaches? [number]
4. One emoji: How do you feel? 😤😐😊🔥

ENCOURAGED (optional, +30 sec):
5. Best moment in one sentence: _______________
6. Celebrate: What did you do well? _______________

[🎉 STREAK UPDATED: 7 days!]
```

**Why it works:**
- Absolute minimum: 3 taps
- Celebration built-in
- Identity reinforcement via streak
- Voice input for "best moment"

---

### MILITARY AAR LENS

#### 2.4-2.5 Key Extractions

**The 4 AAR Questions:**
1. What did we intend to accomplish? (goal)
2. What actually happened? (execution)
3. Why did it happen that way? (gap analysis)
4. What will we do differently? (adaptation)

**Intended vs. Actual Comparison:**
- Critical: Start with GOAL before describing events
- Learning comes from the gap between plan and reality
- "Focus on WHAT not WHO" → no self-blame, analyze performance

**Sustain/Improve Framework:**
- SUSTAIN: What worked? Keep doing this.
- IMPROVE: What didn't? Change this.
- Simple, actionable, forward-looking

**Critical Success Factors:**
- Timing: Immediate = better recall
- Psychological safety: Candor without judgment
- Self-discovery: Leading questions, not lectures

#### 2.6 Military-Style Template: "The Debrief"

**Design goal:** Systematic gap analysis

```
1. PRE-SESSION GOAL
   What was your intention for today?
   □ Practice specific technique: _______
   □ Hit approach count: _______
   □ Work on sticking point: _______
   □ Just show up and do it

2. WHAT HAPPENED
   How many approaches? [number]
   Best interaction (1-2 sentences): _______________

3. GAP ANALYSIS
   How did reality differ from your intention?
   _______________

4. SUSTAIN (What worked?)
   - _______________

5. IMPROVE (What would you change?)
   - _______________

6. NEXT MISSION
   Based on this, my intention for next session is:
   _______________
```

**Why it works:**
- Forces goal-setting BEFORE action
- Explicit gap analysis drives insight
- Sustain/Improve is actionable
- "Next mission" completes the cycle

---

### SPORTS PSYCHOLOGY LENS

#### 2.7-2.8 Key Extractions

**Well-Better-How Framework:**
1. What did I do WELL?
2. What can I do BETTER?
3. HOW am I going to get better?

**3-2-1 Format:**
- 3 Highlights (positives)
- 2 Lowlights (improvement areas)
- 1 Forward (lesson to carry)

**Process vs. Outcome Focus:**
- Judge DECISIONS, not results
- "Did I execute well?" not "Did I get the number?"
- Good process with bad outcome > bad process with good outcome

**Timing Matters:**
- Shorter, sharper debriefs work better
- Consider emotional state → sometimes wait
- Positive framing improves future performance (hormones!)

#### 2.9 Sports Psychology Template: "The Athlete's Debrief"

**Design goal:** Balanced positive/negative, process-focused

```
1. ENERGY CHECK
   Pre-session energy: [1-5]
   Post-session energy: [1-5]

2. THREE HIGHLIGHTS (What went well?)
   1. _______________
   2. _______________
   3. _______________

3. TWO GROWTH AREAS (What to work on?)
   1. _______________
   2. _______________

4. PROCESS CHECK
   Did you follow your game plan? [Yes/Mostly/No]
   Rate your execution (not outcomes): [1-5]

5. ONE FORWARD
   Key lesson to carry into next session:
   _______________
```

**Why it works:**
- 3:2 positive-to-negative ratio (research-backed)
- Process focus reduces outcome anxiety
- Energy tracking reveals patterns
- "One forward" = actionable takeaway

---

### CBT / THERAPY LENS

#### 2.10-2.11 Key Extractions

**Cognitive Distortions to Detect:**
| Distortion | Pattern | Reframe |
|------------|---------|---------|
| All-or-nothing | "Complete failure" | "What parts went okay?" |
| Catastrophizing | "Never/always/impossible" | "Is this actually permanent?" |
| Mind reading | "She thought I was..." | "What did she actually say?" |
| Overgeneralization | "Women always..." | "What about exceptions?" |
| Discounting positives | "Doesn't count, just luck" | "Why doesn't it count?" |

**Self-Compassion Techniques:**
- "What would you tell a friend in this situation?"
- Common humanity: "Everyone struggles with this"
- Mindful acceptance before reappraisal

**Rumination Circuit-Breakers:**
- Replace "why" with "how" (concrete, not abstract)
- Set time limits on processing
- Label: "I notice I'm ruminating"
- End with ACTION, not more reflection

**Reflection vs. Rumination:**
| Reflection | Rumination |
|------------|------------|
| Purposeful, goal-oriented | Repetitive, stuck |
| Time-limited | Endless looping |
| Leads to action | Leads to more rumination |

#### 2.12 CBT-Style Template: "The Reset"

**Design goal:** Emotional processing + cognitive reframe (for tough days)

```
1. WHAT HAPPENED (Facts only, no judgment)
   _______________

2. HOW DID IT FEEL? (Name the emotions)
   □ Frustrated □ Embarrassed □ Anxious □ Disappointed
   □ Angry □ Sad □ Numb □ Other: _______
   Intensity: [1-10]

3. AUTOMATIC THOUGHTS
   What went through your mind?
   _______________

4. DISTORTION CHECK
   Might any of these apply?
   □ All-or-nothing thinking
   □ Catastrophizing ("always/never")
   □ Mind reading
   □ Discounting positives

5. BALANCED PERSPECTIVE
   What would you tell a friend who had this experience?
   _______________

6. COMMON HUMANITY
   Reminder: Every guy learning this struggles. You're not broken.

7. ONE TINY NEXT STEP
   What's the smallest action you can take tomorrow?
   _______________

[Time limit: 5 minutes. Then close this and do something else.]
```

**Why it works:**
- Emotion labeling reduces intensity
- Distortion checklist catches unhelpful thinking
- Self-compassion via "friend" reframe
- Time limit prevents rumination
- Ends with action, not more analysis

---

### LEARNING SCIENCE LENS

#### 2.13 Key Extractions

**Kolb's Experiential Learning Cycle:**
```
Experience → Reflect → Conceptualize → Experiment → (repeat)
```
- **Critical:** Learning requires completing the FULL cycle
- Reports that only document without extracting lessons = incomplete

**Deliberate Practice Components:**
| Component | Field Report Application |
|-----------|-------------------------|
| Specific goal | "Technique practiced" field |
| Full concentration | Prompts that require thought |
| Immediate feedback | Same-day reporting |
| Problem-solving | "Why it ended" analysis |
| Repetition plan | "What to try next time" |

**Skill Acquisition Stages:**
| Stage | Template Design |
|-------|-----------------|
| Cognitive (beginner) | Detailed, guided, many prompts |
| Associative (intermediate) | Standard debrief, some autonomy |
| Autonomous (advanced) | Quick logs, edge cases only |

**Spaced Repetition:**
- Periodically surface old insights for review
- "What did you learn last session?" prompt
- 200-300% better retention vs. cramming

#### 2.14 Learning Science Template: "The Lab Report"

**Design goal:** Complete Kolb cycle + deliberate practice

```
1. TECHNIQUE FOCUS
   What specific skill were you practicing?
   _______________

2. EXPERIENCE (What happened?)
   Describe your best attempt at this technique:
   _______________

3. REFLECT (What did you notice?)
   - What worked about your execution?
   - What didn't work?
   _______________

4. CONCEPTUALIZE (Why?)
   Why do you think it worked/didn't work?
   What's your hypothesis?
   _______________

5. EXPERIMENT (What's next?)
   What specific variation will you try next time?
   _______________

6. CONFIDENCE CHECK
   How confident are you in this assessment? [1-5]
   (Low confidence = try more experiments)

[RETRIEVAL: What was your key insight from your last session?]
```

**Why it works:**
- Forces complete Kolb cycle
- Hypothesis-experiment mindset
- Confidence check = metacognition
- Retrieval prompt uses spaced repetition

---

### COMMUNITY WISDOM LENS

#### 2.15 Key Extractions

**What Users Say Works:**
- Quick capture (seconds, not minutes)
- Focus on "emotional tipping points" (80/20)
- Writing down interactions = "way more improvement"
- Voice memos while memory is fresh

**What Users Say Fails:**
- Detailed stats become counterproductive after ~1000 approaches
- "Anchored to numbers, go for easier sets"
- Over-detailed reports: "huge time investment, low ROI"
- Reports without engagement/feedback

**User Wants:**
| Want | Design Implication |
|------|-------------------|
| "Takes seconds" | Quick Log option |
| "See progress" | Streak, graphs |
| "Tell me what I did wrong" | Direct AI feedback |
| "Pattern recognition" | Analytics over time |
| "Celebrate small wins" | Built-in celebration |

**User Dislikes:**
| Dislike | Avoid |
|---------|-------|
| "Every detail of every interaction" | Optional depth |
| "Vague platitudes" | Specific feedback |
| "Feeling embarrassed" | Non-judgmental tone |
| "Too many fields" | Progressive disclosure |

**The Julien Blanc Quote:**
> "Game is 49% taking action and 51% writing field reports."

**Timing Consensus:**
- Write basic notes IMMEDIATELY (on street/bus)
- Deeper analysis within 24 hours
- Quick notes + deep review = best combo

**Community Template Pattern (from actual use):**
```
1. Stats: Sets, numbers, outcomes
2. Best interaction: What happened, what worked
3. Sticking point: Where you got stuck
4. Learning: What you'll do differently
```

---

## PHASE 3: Question/Field Angles (15 steps)

| # | Step | Status |
|---|------|--------|
| 3.1 | List all possible emotion questions | ✅ |
| 3.2 | List all possible factual questions | ✅ |
| 3.3 | List all possible action/next-step questions | ✅ |
| 3.4 | Design emotion-first flow and facts-first flow | ✅ |
| 3.5 | Compare ordering approaches (emotion vs facts vs action first) | ✅ |
| 3.6 | Design pattern-focus questions ("Did your sticking point show up?") | ✅ |
| 3.7 | Design self-compassion questions ("What would you tell a friend?") | ✅ |
| 3.8 | Design tactical-analysis and celebration/wins questions | ✅ |
| 3.9 | Design "why did it end" and "what would you do differently" questions | ✅ |
| 3.10 | Define minimal viable: 1-3 questions only | ✅ |
| 3.11 | Define standard: 5-7 questions | ✅ |
| 3.12 | Define comprehensive: 10+ questions | ✅ |
| 3.13 | Identify "the one question" candidates and test against goals | ✅ |
| 3.14 | List field types: scale (1-5), text (open), select (checkbox/dropdown) | ✅ |
| 3.15 | Rank question approaches by fit | ✅ |

**Output →**

### 3.1 All Possible Emotion Questions

**State Assessment:**
- How do you feel right now? (scale 1-5 or emoji)
- How did you feel BEFORE the session? (scale)
- How did you feel DURING? (scale)
- How did you feel AFTER? (scale)
- Energy level? (scale 1-5)
- Anxiety level? (scale 1-5)
- Confidence level? (scale 1-5)

**Emotion Naming:**
- What emotions are you experiencing? (multiselect: frustrated, proud, anxious, excited, etc.)
- How intense is this feeling? (scale 1-10)
- Where do you feel it in your body?

**Emotional Processing:**
- What's bothering you most about this session?
- What are you proud of from this session?
- Is there anything you need to let go of?
- What surprised you emotionally today?

**Self-Compassion:**
- What would you tell a friend who had this experience?
- Is the way you're thinking about this helpful?
- What do you need right now?

### 3.2 All Possible Factual Questions

**Basic Stats:**
- Date/time (auto-filled)
- Location (text or auto)
- Duration of session (minutes)
- Number of approaches
- Solo or with wing?
- Day of week / time of day

**Outcome Tracking:**
- How many conversations lasted >2 minutes?
- Any contact info exchanged? (number, IG, etc.)
- Any instant dates?
- Outcome breakdown: (stopped, hooked, longer convo, contact, date)

**Context:**
- Weather/vibe of location
- Your physical state (well-rested, tired, hungover, etc.)
- Any external factors?

**Interaction Details:**
- Describe your best interaction
- Describe your most challenging interaction
- What opener did you use?
- How long was your longest conversation?

### 3.3 All Possible Action/Next-Step Questions

**Forward Planning:**
- What will you do differently next time?
- What specific technique will you practice next session?
- What's one thing you'll repeat because it worked?
- When is your next session planned?

**If-Then Planning:**
- Complete: "If [situation], then I will [action]"
- What's your implementation intention for next time?

**Commitment:**
- On a scale of 1-10, how committed are you to your next session?
- What might get in the way? How will you handle it?

**Tiny Next Step:**
- What's the smallest action you could take tomorrow?
- What's one thing you can do in the next 24 hours?

### 3.4 Emotion-First vs Facts-First Flows

**EMOTION-FIRST FLOW:**
```
1. How do you feel right now? [emoji/scale]
2. What emotions are present? [multiselect]
3. --- now that emotions are acknowledged ---
4. What happened? [facts]
5. Best moment? [text]
6. What would you do differently? [text]
7. Key takeaway [text]
```

**FACTS-FIRST FLOW:**
```
1. Date/time/location [auto]
2. How many approaches? [number]
3. Best interaction? [text]
4. --- now reflect ---
5. How did you feel? [scale]
6. What would you do differently? [text]
7. Key takeaway [text]
```

### 3.5 Ordering Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Emotion-first** | Validates feelings, CBT-aligned, processes before analyzing | May anchor negative state, slower | Tough days, emotional processing |
| **Facts-first** | Quick, objective, familiar | May skip emotional processing | Routine logging, good days |
| **Action-first** | Forward-focused, energizing | Skips reflection entirely | Very quick logs, busy users |
| **Hybrid** | Start with ONE emotion check, then facts, end with action | Slightly longer | Best of both worlds |

**Research suggests:** Emotion-first for processing, facts-first for learning, action-first for habit building.

### 3.6 Pattern-Focus Questions

**Sticking Point Tracking:**
- Did your main sticking point show up today? [yes/no]
- If yes, describe what happened:
- Did you try your planned countermeasure? [yes/no/didn't come up]
- How did it work?

**Pattern Recognition:**
- Is this similar to something that's happened before?
- What patterns do you notice across your last few sessions?
- What keeps showing up that you need to address?

**Trigger Identification:**
- What type of situation triggered difficulty?
- What was happening right before things went sideways?
- Is there a pattern in WHEN you struggle (time, location, type of approach)?

### 3.7 Self-Compassion Questions

**Friend Reframe:**
- What would you tell a friend who had this exact experience?
- If your best friend described this session, what would you say to them?
- Would you judge a friend as harshly as you're judging yourself?

**Common Humanity:**
- Remember: Everyone learning this struggles. What's universal about your experience?
- How many other guys do you think had a similar day today?
- What would a veteran daygamer say about this?

**Acceptance:**
- What do you need to accept about today?
- Can you let this go and move forward?
- What's one kind thing you can do for yourself tonight?

### 3.8 Tactical Analysis & Celebration Questions

**TACTICAL ANALYSIS:**
- Walk through your best interaction beat by beat:
  - Open: How did you start?
  - Hook: What got her engaged?
  - Vibe: What was the energy like?
  - Close: How did you attempt to close?
  - End: How/why did it end?
- What technique were you practicing? How did it go?
- At what point did the interaction shift?
- What was the "hinge moment" where things could have gone differently?

**CELEBRATION / WINS:**
- What did you do well today? (List 3)
- What are you proud of, regardless of outcomes?
- What took courage?
- What was your best moment?
- Did you surprise yourself in any way?
- What would past-you be impressed by?

### 3.9 "Why Did It End" & "Do Differently" Questions

**WHY DID IT END (The Critical Question):**
- Why did your best interaction end?
- At what point did you lose her?
- What was happening in the 2 minutes before it ended?
- Was there a specific moment where it shifted?
- What did she do/say that signaled it was ending?
- What did YOU do/say right before it ended?

**Versions by depth:**
- Quick: "Why did it end?" (one line)
- Standard: "Describe the last 2 minutes. What happened?"
- Deep: "Walk through the ending moment by moment. What could you have done differently at each point?"

**WHAT WOULD YOU DO DIFFERENTLY:**
- If you could replay this interaction, what would you change?
- What's one thing you'd do differently?
- Knowing what you know now, what would you try?
- What technique would you apply?
- What would you say instead?

### 3.10 Minimal Viable (1-3 Questions)

**Option A: The Bare Minimum (1 question)**
```
What's the one thing worth remembering from today?
```

**Option B: The Tiny Log (2 questions)**
```
1. How many approaches? [number]
2. Best moment in one sentence: ___
```

**Option C: The Micro-Debrief (3 questions)**
```
1. How do you feel? [emoji: 😤😐😊🔥]
2. Best moment: ___
3. What would you do differently? ___
```

### 3.11 Standard (5-7 Questions)

**Option A: Well-Better-How + Context**
```
1. Date/Location [auto]
2. Approaches [number]
3. What went WELL? ___
4. What could be BETTER? ___
5. HOW will you improve? ___
6. Key takeaway: ___
```

**Option B: Emotion + Facts + Action**
```
1. How do you feel? [1-5]
2. Approaches [number]
3. Best interaction: ___
4. Why did it end? ___
5. What would you do differently? ___
6. One thing to try next time: ___
```

**Option C: AAR-Lite**
```
1. What was your goal for today?
2. What actually happened?
3. What worked? (Sustain)
4. What didn't? (Improve)
5. What's your goal for next time?
```

### 3.12 Comprehensive (10+ Questions)

**The Full Debrief (12 questions):**
```
CONTEXT
1. Date/time/location [auto]
2. Solo or wing?
3. Duration (minutes)
4. Number of approaches

STATE
5. Pre-session energy [1-5]
6. Post-session energy [1-5]
7. Anxiety level [1-5]

ANALYSIS
8. Best interaction (describe)
9. Why did it end?
10. Sticking point appear? [y/n + describe]

FORWARD
11. What would you do differently?
12. Key takeaway
13. Technique to practice next time
```

**The Deep Dive (15+ questions) - for significant sessions:**
```
[All of above, plus:]
14. Full dialogue reconstruction
15. Emotional timeline (before/during/after)
16. The lead-up: What happened in 3 min before key moment?
17. Cognitive distortion check
18. Self-compassion reflection
19. Implementation intention for next time
```

### 3.13 "The One Question" Candidates

| Candidate | Pros | Cons | Best For |
|-----------|------|------|----------|
| "What's worth remembering?" | Open, user-driven | Too vague for beginners | Experienced users |
| "Why did it end?" | Targets critical learning moment | Negative frame | Analysis mode |
| "What would you do differently?" | Action-oriented | Assumes something went wrong | Learning mode |
| "What did you do well?" | Positive, celebrates | Misses growth areas | Confidence building |
| "What did you learn?" | Learning-focused | Can be vague | General reflection |
| "Best moment?" | Positive, specific | Misses learning | Quick logs |

**Testing against goals:**
| Goal | Best "One Question" |
|------|---------------------|
| Build consistency | "Did you show up?" (binary) |
| Rapid learning | "Why did it end?" |
| Emotional processing | "How do you feel about it?" |
| Pattern recognition | "Did your sticking point appear?" |
| Celebration | "What did you do well?" |

**Winner for general use:** "What's one thing you learned or would do differently?"
(Combines learning + action in one question)

### 3.14 Field Types Inventory

**SCALE (1-5 or 1-10):**
- Energy level
- Mood/feeling
- Anxiety
- Confidence
- Session quality
- Execution rating
- Commitment level

**TEXT (Open-ended):**
- Best moment description
- Why did it end
- What would you do differently
- Key takeaway
- Dialogue reconstruction
- Emotional processing

**SELECT (Single choice):**
- Template type
- Solo/wing
- Primary emotion
- Sticking point category
- Outcome type

**MULTISELECT (Multiple choice):**
- Emotions present
- Techniques used
- Outcome breakdown (by approach)
- Cognitive distortions detected

**NUMBER:**
- Approach count
- Duration (minutes)
- Conversations >2min
- Contact info gotten

**BOOLEAN (Yes/No):**
- Did sticking point appear?
- Did you follow your plan?
- Would you do it again?

**EMOJI/ICON:**
- Quick mood (😤😐😊🔥)
- Energy visual
- Outcome icons

### 3.15 Question Approach Rankings

| Rank | Approach | Fit | Use Case |
|------|----------|-----|----------|
| 1 | **Hybrid (emotion check → facts → action)** | ⭐⭐⭐⭐⭐ | Best balance |
| 2 | **Facts-first with emotional option** | ⭐⭐⭐⭐ | Quick logging |
| 3 | **Emotion-first** | ⭐⭐⭐⭐ | Tough days |
| 4 | **Action-first** | ⭐⭐⭐ | Minimal logging |
| 5 | **Full tactical analysis** | ⭐⭐⭐ | Deep dives only |

**Recommended default flow:**
```
1. Quick emotion check (1 tap)
2. Basic facts (count, best moment)
3. One learning question (why it ended OR what you'd do differently)
4. Forward action (what to try next)
```

**→ USER CHECKPOINT A: Present structural options and question approaches. Get feedback before proceeding.**

---

## CHECKPOINT A DECISIONS (LOCKED IN)

| Decision | Status |
|----------|--------|
| **One customizable template** | ✅ Users start from template, customize (add/remove questions) |
| **Mostly depth-based** | ✅ Depth primary organizing principle |
| **Facts-first flow** | ✅ Quick emotion tap at top, then facts, then learning |
| **NOT "feeling sorry" mode** | ✅ We're here to learn, not wallow |
| **Habit = per-session** | ✅ Not daily - field report every session, sessions on user schedule |
| **MUST-HAVE: Full conversation writeup** | ✅ Always optional, even in short templates |
| **Multiple interactions expandable** | ✅ "Best interaction" → optional "Interaction 2", "Interaction 3" |
| **AI analysis on conversations** | ✅ Spot mistakes like "too many questions" |

**Locked flow pattern:**
```
1. 😤😐😊🔥 Quick gut check (1 tap)
2. How many approaches? [number]
3. Best interaction: [text]
   └─ [+] Write out full conversation (optional, expandable)
4. [+] Interaction 2 (optional)
   └─ [+] Write out full conversation (optional)
5. Why did it end? / What would you do differently?
6. Key takeaway
```

---

## PHASE 4: User Context Angles (15 steps)

| # | Step | Status |
|---|------|--------|
| 4.1 | Define beginner persona (0-100 approaches): fears, needs, design template | ✅ |
| 4.2 | Define early-stage persona (100-300 approaches): needs and template | ✅ |
| 4.3 | Define plateau persona (stuck at same level): patterns and template | ✅ |
| 4.4 | Define intermediate persona (300-500 approaches): needs and template | ✅ |
| 4.5 | Define advanced persona (500-1000 approaches): needs and template | ✅ |
| 4.6 | Define expert persona (1000+ approaches): speed-focused template | ✅ |
| 4.7 | Define breakthrough-moment state: capture template | ✅ |
| 4.8 | Define tough-day state (rejected/destroyed): recovery template | ✅ |
| 4.9 | Define neutral-day state (nothing special): quick template | ✅ |
| 4.10 | Define wing-debrief context: shareable template | ✅ |
| 4.11 | Define solo-review context: private template | ✅ |
| 4.12 | Compare beginner vs expert needs | ✅ |
| 4.13 | Compare emotional state needs (breakthrough vs tough vs neutral) | ✅ |
| 4.14 | Identify common threads across all user contexts | ✅ |
| 4.15 | Rank user contexts by frequency and importance | ✅ |

**Output →**

### EXPERIENCE-BASED PERSONAS

#### 4.1 Beginner (0-100 approaches)

**Profile:**
- Primary fear: Rejection, social judgment, "doing it wrong"
- Primary need: Build habit, overcome approach anxiety, prove they can do it
- Mindset: Fragile confidence, high emotional volatility

**What they need from field reports:**
- Celebrate showing up (not outcomes)
- Very low friction (they're already drained from approaching)
- Identity reinforcement: "I am someone who approaches"
- NO detailed analysis - keeps it simple
- Focus on courage, not technique

**Suggested default template:**
```
1. 😤😐😊🔥 How do you feel?
2. Approaches today: [number]
3. You showed up. That's the win. What took courage?
4. Best moment (even small): ___
5. [Optional] Write out an interaction
```

#### 4.2 Early-Stage (100-300 approaches)

**Profile:**
- Approach anxiety reducing but still present
- Starting to see patterns, want to improve
- Getting occasional positive reactions, hungry for more

**What they need:**
- Start introducing technique tracking
- Pattern recognition prompts
- Still celebrate consistency
- Begin "why did it end" analysis

**Suggested additions to template:**
```
+ What technique were you practicing?
+ Did you notice any patterns?
+ Why did your best interaction end?
```

#### 4.3 Plateau Persona (stuck at same level)

**Profile:**
- Knows the basics, but results flatlined
- Frustrated, may be losing motivation
- Often has a blind spot they can't see

**What they need:**
- Pattern-breaking prompts
- "What are you avoiding?" questions
- Sticking point focus
- Fresh perspectives

**Suggested template focus:**
```
1. What felt different today vs. last 10 sessions?
2. What are you NOT doing that you know you should?
3. If a coach watched you, what would they critique?
4. What's your current sticking point? Did it show up?
5. One thing to try that you haven't tried in a while:
```

#### 4.4 Intermediate (300-500 approaches)

**Profile:**
- Solid fundamentals, working on refinement
- Can hold conversations, sometimes get numbers
- Ready for deeper tactical analysis

**What they need:**
- Full conversation writeup option
- Technique experimentation tracking
- More nuanced "what would you do differently"
- Process focus over outcomes

**Suggested template:**
```
Standard template + emphasis on:
+ Full conversation reconstruction
+ Specific technique experimented
+ Hinge moment identification
+ Hypothesis for next session
```

#### 4.5 Advanced (500-1000 approaches)

**Profile:**
- Consistent results, refining edge cases
- Can self-diagnose most issues
- Looking for marginal gains

**What they need:**
- Speed (don't waste their time)
- Edge case focus
- Optional deep dive for interesting sets
- Pattern tracking across many sessions

**Suggested template:**
```
1. Approaches: [number]
2. Anything notable? [y/n]
   If yes → expand to standard template
   If no → done in 10 seconds
3. [Optional] Deep dive on specific interaction
```

#### 4.6 Expert (1000+ approaches)

**Profile:**
- Highly self-aware
- Templates may feel restrictive
- Want maximum speed, minimum friction

**What they need:**
- Minimal by default
- Freeform option
- AI analysis on demand, not forced
- Data for long-term patterns only

**Suggested template:**
```
1. Approaches: [number]
2. Worth noting: ___ (freeform, optional)
3. [+] Expand if something significant happened
```

---

### EMOTIONAL STATE PERSONAS

#### 4.7 Breakthrough Moment

**When:** Something clicked. Major insight. Best set ever. Number from dream girl.

**What they need:**
- CAPTURE the insight before it fades
- What specifically worked
- How to replicate
- Celebrate without downplaying

**Template focus:**
```
1. What happened? (Full story encouraged)
2. What specifically worked? Be detailed.
3. What led up to this? What was different?
4. How can you replicate this?
5. What does this prove about you?
```

#### 4.8 Tough Day (rejected/destroyed)

**When:** Nothing worked. Got blown out. Feeling demoralized.

**Note from user feedback:** NOT "feeling sorry" mode. Still facts-first, learning-focused.

**What they need:**
- Brief acknowledgment of difficulty
- Quick pivot to learning
- Tiny next step (not big plans)
- Perspective (one session ≠ identity)

**Template focus:**
```
1. 😤 Tough one. How many approaches? [number]
2. What happened? (brief, factual)
3. What can you learn from this?
4. One thing you did well despite the difficulty:
5. Smallest next step:
```

#### 4.9 Neutral Day (nothing special)

**When:** Normal session. Some good, some bad. Nothing dramatic.

**What they need:**
- Speed - don't overthink
- Basic logging
- Optional depth if something stands out

**Template focus:**
```
1. 😐 Routine session. Approaches: [number]
2. Best moment: ___
3. Anything worth noting? [+] Expand if yes
4. Key takeaway (or skip):
```

---

### SOCIAL CONTEXT PERSONAS

#### 4.10 Wing Debrief Context

**When:** Out with a wing, want to share/compare notes

**What they need:**
- Shareable format
- Comparative elements
- Discussion prompts
- Non-embarrassing to show

**Template additions:**
```
+ Wing's assessment of your set
+ What did you observe in your wing's sets?
+ Discuss: What would you both do differently?
```

#### 4.11 Solo Review Context

**When:** Reviewing alone, private reflection

**What they need:**
- Full honesty (no one watching)
- Can be embarrassing/detailed
- Deep personal reflection

**Template additions:**
```
+ What are you not admitting to yourself?
+ What did you chicken out of?
+ Be honest: What's really holding you back?
```

---

### COMPARISONS

#### 4.12 Beginner vs Expert Needs

| Aspect | Beginner (0-100) | Expert (1000+) |
|--------|------------------|----------------|
| Primary need | Build habit | Track edge cases |
| Friction tolerance | Very low | Very low (but different reason) |
| Celebration | Every session | Breakthroughs only |
| Analysis depth | Minimal | On-demand |
| Identity focus | High ("I approach") | Assumed |
| Technique focus | Low | High |
| Conversation writeup | Optional, encouraged | Optional, for notable sets |
| AI coaching tone | Encouraging, gentle | Direct, efficient |

**Key insight:** Both need low friction, but for different reasons. Beginner = emotional capacity. Expert = time efficiency.

#### 4.13 Emotional State Needs

| Aspect | Breakthrough | Tough Day | Neutral |
|--------|--------------|-----------|---------|
| Length | Long (capture it) | Short (don't dwell) | Short |
| Tone | Celebratory | Matter-of-fact | Efficient |
| Focus | What worked | What to learn | Just log |
| Conversation writeup | Definitely | Optional | Optional |
| Forward action | Replication plan | Tiny next step | Optional |

---

### 4.14 Common Threads Across All Contexts

**Always needed:**
1. Approach count (universal metric)
2. Quick emotional check (gut feeling, 1 tap)
3. "Best moment" or "what stood out" (positive anchor)
4. Optional expansion (never force depth)
5. Forward-looking element (even if small)

**Never wanted:**
1. Forced lengthy reflection when not needed
2. Shame-inducing questions
3. Tedious stats that don't matter
4. Rigid structure with no flexibility

---

### 4.15 User Context Rankings

| Rank | Context | Frequency | Design Priority |
|------|---------|-----------|-----------------|
| 1 | **Neutral day** | 60-70% of sessions | Default template |
| 2 | **Early-stage user** | Most users | Default experience |
| 3 | **Tough day** | 15-20% of sessions | Important variant |
| 4 | **Breakthrough** | 5-10% of sessions | Worth capturing well |
| 5 | **Intermediate user** | Growing segment | Power user features |
| 6 | **Solo review** | Most common context | Default assumption |
| 7 | **Beginner** | First 3-6 months | Onboarding focus |
| 8 | **Plateau** | Common pain point | Specific intervention |
| 9 | **Advanced/Expert** | Smaller segment | Speed optimizations |
| 10 | **Wing debrief** | Occasional | Nice-to-have |

**Design implication:** Optimize for "Neutral day + Early-stage user + Solo" as the default experience.

---

## PHASE 5: When/Where Written (15 steps)

| # | Step | Status |
|---|------|--------|
| 5.1 | Define "immediate" context (still on street): what's possible, design fields | ✅ |
| 5.2 | Define "commute home" context (bus/train): mobile constraints, design fields | ✅ |
| 5.3 | Define "evening at home" context: time available, design fields | ✅ |
| 5.4 | Define "next morning" context: fresh perspective, design fields | ✅ |
| 5.5 | Define "end of week" context: aggregated view, design fields | ✅ |
| 5.6 | Define voice-recording context: what questions work for speech | ✅ |
| 5.7 | Define quick-taps-only context: scales and checkboxes only | ✅ |
| 5.8 | Define typing-heavy context: open text fields | ✅ |
| 5.9 | Map contexts to template types | ✅ |
| 5.10 | Identify context-switching patterns (quick now + deep later) | ✅ |
| 5.11 | Design multi-stage report flow | ✅ |
| 5.12 | Compare mobile vs desktop experience | ✅ |
| 5.13 | Identify time-of-day effects on reflection quality | ✅ |
| 5.14 | Rank contexts by frequency | ✅ |
| 5.15 | Rank contexts by importance for learning | ✅ |

**Output →**

### TIMING CONTEXTS

#### 5.1 Immediate (Still on street, between sets)

**Physical constraints:**
- Standing, possibly cold
- Phone in one hand
- Distracted, may approach again soon
- Adrenaline still up

**What's possible:**
- Taps only (emoji, number)
- Voice memo
- One sentence max

**Best fields:**
```
- Approach count increment: [+1]
- Quick note (voice): "Brunette, Illum, got number"
- Emoji mood: 🔥
```

**NOT possible:** Conversation reconstruction, deep analysis

#### 5.2 Commute Home (Bus/train)

**Physical constraints:**
- Seated, phone in hand
- May have 15-30 minutes
- Memory still fresh (within 1 hour)
- Some typing possible but awkward

**What's possible:**
- Full field report (standard)
- Conversation reconstruction
- Some analysis

**Best fields:**
```
- All standard fields
- Voice-to-text for longer entries
- Conversation writeup
```

**Design note:** This is often the BEST time for detailed reports - memory fresh, time available.

#### 5.3 Evening at Home

**Physical constraints:**
- Full keyboard (phone or desktop)
- Time available
- 2-6 hours since session
- May be tired

**What's possible:**
- Everything
- Deep dives
- Multiple interaction analysis

**Best fields:**
```
- Full template
- All optional expansions
- AI analysis review
```

**Risk:** Memory degradation. Best if quick notes captured earlier.

#### 5.4 Next Morning

**Physical constraints:**
- Fresh mind, slept on it
- 12-18 hours since session
- Memory significantly degraded for details

**What's possible:**
- Pattern reflection
- Big-picture insights
- NOT detailed reconstruction (unless notes captured earlier)

**Best fields:**
```
- What stands out now that you've slept on it?
- Any new insights?
- How do you feel about yesterday now?
```

**Use case:** Follow-up to quick same-day log, not primary report.

#### 5.5 End of Week

**Physical constraints:**
- Reviewing multiple sessions
- Looking for patterns
- Not individual set analysis

**What's possible:**
- Aggregate insights
- Week-over-week comparison
- Sticking point tracking

**Best fields:**
```
- Sessions this week: [number]
- Total approaches: [number]
- Theme of the week: ___
- Progress on sticking point: [1-5]
- Focus for next week: ___
```

**Design note:** This is a DIFFERENT product - weekly review, not field report.

---

### INPUT MODALITY CONTEXTS

#### 5.6 Voice Recording Context

**When useful:**
- Walking home
- Hands busy
- Want to capture nuance
- Thinking out loud

**What works for speech:**
- Open-ended prompts
- "Tell me what happened"
- "Walk me through the conversation"
- NOT: multiple choice, scales

**Voice-optimized prompts:**
```
"Describe your best interaction from start to finish."
"Why do you think it ended?"
"What would you do differently?"
```

**Design note:** Need speech-to-text transcription, then optional AI cleanup.

#### 5.7 Quick-Taps-Only Context

**When useful:**
- Between sets (immediate)
- Very tired
- Just want to log, not analyze

**What works:**
- Emoji selectors
- Number incrementers
- Yes/No toggles
- Pre-set options

**Tap-only template:**
```
Approaches: [+] [-] (current: 3)
Mood: 😤 😐 😊 🔥
Got contact: ☐ Yes ☐ No
Notable: ☐ Yes → [expand] ☐ No → [done]
```

#### 5.8 Typing-Heavy Context

**When useful:**
- Home with keyboard
- Want to process deeply
- Conversation reconstruction
- Journaling mode

**What works:**
- Large text areas
- No character limits
- Formatting support (bold, bullets)
- Full conversation writeup

---

### MAPPING & PATTERNS

#### 5.9 Context → Template Mapping

| Context | Best Template | Depth |
|---------|---------------|-------|
| Immediate (street) | Tap-only | Minimal |
| Commute | Standard | Medium |
| Evening home | Standard or Deep | Medium-High |
| Next morning | Follow-up only | Light |
| Voice memo | Standard (transcribed) | Medium |

#### 5.10 Context-Switching Pattern

**Most common pattern:**
1. **Immediate:** Quick tap (+1 approach, emoji, voice note)
2. **Commute:** Fill in standard template while memory fresh
3. **Evening (optional):** Deep dive if something notable

**Design implication:** Support saving partial reports and completing later.

#### 5.11 Multi-Stage Report Flow

**Option A: Append model**
```
STAGE 1 (Street): +1 approach, 🔥, voice: "Brunette got number"
STAGE 2 (Commute): Expand into full report
STAGE 3 (Evening): Add conversation reconstruction
```

**Option B: Draft model**
```
Auto-save as draft after Stage 1
Notification: "Finish your field report?"
Complete when ready
```

**Recommendation:** Draft model with gentle reminder.

#### 5.12 Mobile vs Desktop

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| Primary use | In-field, commute | Evening deep dives |
| Input mode | Taps, voice, short text | Full keyboard |
| Screen real estate | Limited | Full |
| Template design | Vertical, expandable | Can show more at once |
| Conversation writeup | Possible but harder | Ideal |

**Design implication:** Mobile-first for capture, desktop-optional for deep analysis.

#### 5.13 Time-of-Day Effects

| Time | Emotional State | Analysis Quality | Best For |
|------|-----------------|------------------|----------|
| Immediate | High arousal | Poor analysis, good memory | Capture facts |
| 1-2 hours | Calming down | Good balance | Full report |
| Same evening | Neutral | Good analysis, okay memory | Deep dive |
| Next morning | Fresh | Good pattern recognition | Follow-up |

**Key insight:** 1-2 hours post-session is the sweet spot for detailed reports.

---

### RANKINGS

#### 5.14 Contexts by Frequency

| Rank | Context | Frequency |
|------|---------|-----------|
| 1 | Evening at home | 50% |
| 2 | Commute | 30% |
| 3 | Immediate (partial) | 15% |
| 4 | Next morning | 5% |

#### 5.15 Contexts by Learning Value

| Rank | Context | Learning Value | Why |
|------|---------|----------------|-----|
| 1 | **Commute (1-2 hrs post)** | ⭐⭐⭐⭐⭐ | Best memory + starting to reflect |
| 2 | Evening | ⭐⭐⭐⭐ | Time for depth, memory fading |
| 3 | Immediate + later completion | ⭐⭐⭐⭐ | Best of both worlds |
| 4 | Next morning | ⭐⭐⭐ | Pattern insights, poor detail |
| 5 | Immediate only | ⭐⭐ | Facts captured, no analysis |

**Design implication:** Optimize for commute/evening while supporting immediate capture.

**→ USER CHECKPOINT B: Present context-based insights. Validate assumptions about when/where users write.**

---

## PHASE 6: Competitor/Prior Art (22 steps)

| # | Step | Status |
|---|------|--------|
| 6.1 | Research Day One journaling app | ✅ |
| 6.2 | Research Journey and Notion journal templates | ✅ |
| 6.3 | Extract journaling app patterns | ✅ |
| 6.4 | Research Streaks habit tracker | ✅ |
| 6.5 | Research Habitica and Loop Habit Tracker | ✅ |
| 6.6 | Extract habit tracker patterns | ✅ |
| 6.7 | Research Strava activity tracking | ✅ |
| 6.8 | Research sports training logs | ✅ |
| 6.9 | Extract sports tracking patterns | ✅ |
| 6.10 | Research CBT thought diary worksheets | ✅ |
| 6.11 | Research DBT diary cards | ✅ |
| 6.12 | Extract therapy worksheet patterns | ✅ |
| 6.13 | Research military AAR forms | ✅ |
| 6.14 | Research aviation debrief forms | ✅ |
| 6.15 | Extract debrief form patterns | ✅ |
| 6.16 | Research sales CRM call reviews | ✅ |
| 6.17 | Extract sales review patterns | ✅ |
| 6.18 | Search for existing daygame trackers | ✅ |
| 6.19 | Search for PUA/game tracking tools | ✅ |
| 6.20 | Extract daygame-specific patterns | ✅ |
| 6.21 | Compile all stolen ideas | ✅ |
| 6.22 | Compile all anti-patterns to avoid | ✅ |

**Output →**

### JOURNALING APPS

#### 6.1 Day One

**What it does:**
- Premium journaling app (iOS/Mac/web)
- Beautiful interface, photo-focused
- Templates for different journal types
- Streaks and calendar view
- End-to-end encryption

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Photo attachment | Could attach screenshots of texts, location photos |
| Multiple journals | Different "journals" = different template types |
| Template prompts | Pre-written questions user can customize |
| On This Day | Show old entries for spaced retrieval |
| Quick entry shortcut | Widget for instant capture |

#### 6.2 Journey + Notion

**Journey:**
- Mood tracking with emoji
- Weather auto-capture
- Goal tracking integration
- Coach feature (AI suggestions)

**Notion journal templates:**
- Highly customizable tables
- Toggle blocks for optional sections
- Linked databases (sessions → insights)
- Template buttons for quick entry

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Toggle/expand | Our expandable conversation sections |
| Linked databases | Session → Approach → Conversation hierarchy |
| Quick capture buttons | Pre-configured field report starters |
| Weekly/monthly rollups | Automatic aggregation views |

#### 6.3 Journaling App Patterns Summary

**STEAL:**
- On This Day / memories feature (spaced retrieval)
- Quick capture widgets
- Multiple "journals" (template types)
- Beautiful, inviting interface
- Photo/media attachment
- Calendar heat map view

**AVOID:**
- Over-focus on aesthetics vs. function
- Paywall on basic features
- No structure (pure freeform)

---

### HABIT TRACKERS

#### 6.4 Streaks

**What it does:**
- Simple habit tracking (up to 24 habits)
- Visual streak display
- Health app integration
- Timer for duration habits

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Visual streak | Approach streak, field report streak |
| Completion percentage | Weekly goal progress |
| Timer | Session duration tracking |
| Simplicity | Don't overcomplicate |

#### 6.5 Habitica + Loop

**Habitica:**
- Gamified habit tracker
- RPG mechanics (XP, levels, gear)
- Social guilds, party quests
- Rewards/punishments for habits

**Loop Habit Tracker:**
- Open source, minimalist
- Detailed statistics
- Flexible scheduling (not just daily)
- No account required

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Gamification (Habitica) | XP for field reports, levels |
| Flexible scheduling (Loop) | "3x per week" not "daily" |
| Statistics/graphs (Loop) | Long-term progress visualization |
| Guilds/social (Habitica) | Optional community features |

#### 6.6 Habit Tracker Patterns Summary

**STEAL:**
- Streak visualization
- Flexible scheduling (not forcing daily)
- Statistics and graphs over time
- Light gamification (not overwhelming)
- Celebration animations on completion

**AVOID:**
- Punishment mechanics (Habitica's damage)
- Over-gamification that becomes childish
- Forcing daily when not appropriate

---

### SPORTS TRACKING

#### 6.7 Strava

**What it does:**
- Activity tracking for running/cycling
- GPS route recording
- Social feed, kudos, comments
- Segment leaderboards
- Training analysis (power, pace, heart rate)

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Activity feed | Session feed showing recent reports |
| Kudos (likes) | Wing validation on good sessions |
| Segments | "Approach streaks" or location achievements |
| Training load | Volume vs. intensity balance |
| Personal records | "Best session" highlights |
| Relative effort | Session difficulty rating |

#### 6.8 Sports Training Logs

**Common elements:**
- Pre-session goals
- Post-session notes
- RPE (Rate of Perceived Exertion)
- Workout breakdown
- Coach comments section

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Pre-session intentions | Already have this |
| RPE equivalent | "Session difficulty" 1-5 |
| Coach comments | AI feedback section |
| Workout breakdown | Approach-by-approach breakdown |

#### 6.9 Sports Tracking Patterns Summary

**STEAL:**
- Location-based tracking (where you approached)
- Personal records/bests highlighting
- Relative effort/difficulty rating
- Training load concept (volume tracking)
- Clean activity feed UI

**AVOID:**
- Leaderboards (comparing approaches is toxic)
- Public by default
- Over-emphasis on metrics

---

### THERAPY WORKSHEETS

#### 6.10 CBT Thought Diaries

**Structure:**
1. Situation (facts)
2. Automatic thoughts
3. Emotions + intensity (0-100)
4. Evidence for thought
5. Evidence against thought
6. Balanced thought
7. Re-rate emotion

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Situation vs. interpretation | Facts vs. thoughts separation |
| Emotion intensity rating | Mood scale |
| Evidence examination | "What actually happened?" |
| Reframing | "What would you tell a friend?" |

#### 6.11 DBT Diary Cards

**Structure:**
- Daily emotion tracking (multiple emotions rated 0-5)
- Urge tracking
- Skill use tracking (what coping skills used)
- Target behavior tracking

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Multiple emotion tracking | Could track anxiety, confidence, energy separately |
| Skill use tracking | "What technique did you use?" |
| Target behavior | Approach count, specific goal tracking |

#### 6.12 Therapy Worksheet Patterns Summary

**STEAL:**
- Emotion intensity scaling
- Separation of facts vs. thoughts
- Reframing prompts
- Self-compassion built into structure
- Evidence-based examination

**AVOID:**
- Clinical language (feels like therapy)
- Too many emotion ratings (overwhelming)
- Pathologizing normal experiences

---

### DEBRIEF FORMS

#### 6.13 Military AAR Forms

**Standard US Army AAR structure:**
1. What was the mission/intent?
2. What actually happened?
3. What went well (sustain)?
4. What could improve?
5. Who does what to implement changes?

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Intent vs. reality | Pre-session goal vs. what happened |
| Sustain/improve | Works well as template structure |
| Action assignment | Forward commitment |
| Chronological reconstruction | Conversation timeline |

#### 6.14 Aviation Debrief Forms

**Structure:**
- Mission briefing recap
- Timeline of events
- Decision points analysis
- What-if scenarios
- Lessons identified vs. lessons learned
- Follow-up items

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Decision points | "Hinge moments" in conversation |
| What-if scenarios | "What would you do differently?" |
| Lessons identified vs. learned | Track if lessons are actually implemented |
| Timeline of events | Conversation reconstruction |

#### 6.15 Debrief Form Patterns Summary

**STEAL:**
- Intent vs. actual comparison
- Sustain/improve framework
- Decision point analysis
- Lessons identified tracking
- No-blame framing ("what" not "who")

**AVOID:**
- Military jargon
- Overly formal structure
- Team-focused elements (mostly solo activity)

---

### SALES CRM

#### 6.16 Sales CRM Call Reviews

**Common fields in Salesforce, HubSpot, etc.:**
- Call outcome (connected, voicemail, no answer)
- Call duration
- Next steps
- Deal stage update
- Key discussion points
- Objections raised
- Competitor mentions
- Follow-up date

**Relevant patterns:**
| Pattern | Application |
|---------|-------------|
| Outcome categorization | Approach outcomes (stopped, hooked, number, etc.) |
| Duration tracking | Conversation length |
| Objection tracking | Common rejection reasons |
| Next steps | Follow-up planning |
| Call notes | Conversation notes |

#### 6.17 Sales Review Patterns Summary

**STEAL:**
- Outcome categorization
- Quick logging focus (sales reps are busy)
- Pipeline stages (could map to: approach → hook → number → date → close)
- Objection/rejection categorization

**AVOID:**
- Over-quantification
- Treating people like "prospects"
- Revenue/conversion focus

---

### DAYGAME-SPECIFIC

#### 6.18-6.19 Existing Daygame/PUA Trackers

**What exists:**
- **Spreadsheets** (most common) - Google Sheets with columns for date, location, sets, numbers, dates, lays
- **Daylio** (repurposed) - Mood tracker adapted for approach logging
- **Custom apps** (rare) - A few indie attempts, mostly abandoned
- **Forum posts** - Reddit/forum field reports

**Common patterns in community:**
```
Date | Location | Sets | Hooks | Numbers | Dates | Lays | Notes
-----------------------------------------------------------------
01/15 | Strøget | 5 | 3 | 1 | 0 | 0 | Brunette near Illum...
```

**What's missing in existing tools:**
- Conversation reconstruction
- AI analysis
- Pattern tracking over time
- Mobile-first design
- Emotional/state tracking
- Technique experimentation tracking

#### 6.20 Daygame-Specific Patterns

**What the community actually tracks:**
| Metric | Frequency | Usefulness |
|--------|-----------|------------|
| Approach count | Always | High |
| Number closes | Usually | Medium |
| Date count | Usually | Medium |
| Lay count | Often | Low (rare event) |
| Hook rate | Sometimes | Medium |
| Conversion rates | Varies | Low after 1000+ |

**What the community wants but doesn't have:**
- Pattern recognition across sessions
- Sticking point tracking
- AI feedback on conversations
- Technique experimentation tracking
- Progress visualization that isn't just "number go up"

---

### COMPILED INSIGHTS

#### 6.21 All Stolen Ideas

**UI/UX:**
1. Toggle/expand sections (Notion)
2. Quick capture widgets (Day One)
3. Calendar heat map view (GitHub, habit trackers)
4. Streak visualization
5. Completion celebration animation
6. Personal records/highlights (Strava)
7. "On This Day" memories (Day One)

**Structure:**
8. Flexible scheduling, not daily (Loop)
9. Intent vs. actual comparison (AAR)
10. Sustain/improve framework
11. Decision point / hinge moment analysis
12. Outcome categorization (Sales CRM)
13. Duration tracking
14. Technique/skill use tracking (DBT)

**Emotional:**
15. Emotion intensity scaling (CBT)
16. Facts vs. thoughts separation
17. Reframing prompts ("tell a friend")
18. Self-compassion built-in
19. No-blame framing

**Analytics:**
20. Training load / volume tracking (Strava)
21. Pattern recognition over time
22. Progress visualization beyond "number go up"
23. Linked data (session → approach → conversation)

#### 6.22 Anti-Patterns to Avoid

**From journaling apps:**
- Over-focus on aesthetics vs. function
- Pure freeform with no guidance
- Paywall on basic features

**From habit trackers:**
- Punishment mechanics
- Over-gamification
- Forcing daily when inappropriate

**From sports tracking:**
- Leaderboards (comparison is toxic)
- Public by default
- Over-emphasis on metrics after mastery

**From therapy worksheets:**
- Clinical language
- Too many emotion ratings
- Pathologizing normal experiences

**From sales CRM:**
- Treating people as "prospects"
- Over-quantification
- Pure conversion focus

**From existing daygame tools:**
- Spreadsheet-only mentality
- Stats becoming counterproductive
- No mobile-first design
- No learning/growth features

**→ USER CHECKPOINT C: Present competitor insights and stolen ideas. Any directions to explore or avoid?**

---

## PHASE 7: Goal-Based Angles (15 steps)

| # | Step | Status |
|---|------|--------|
| 7.1 | Define goal: Build consistency habit → design template | ✅ |
| 7.2 | Define goal: Rapid skill improvement → design template | ✅ |
| 7.3 | Define goal: Emotional processing → design template | ✅ |
| 7.4 | Define goal: Pattern recognition over time → design template | ✅ |
| 7.5 | Define goal: Accountability → design template | ✅ |
| 7.6 | Define goal: Sharing with coach/mentor → design template | ✅ |
| 7.7 | Define goal: Self-reflection/journaling → design template | ✅ |
| 7.8 | Define goal: Data/analytics collection → design template | ✅ |
| 7.9 | Define goal: Celebrating wins → design template | ✅ |
| 7.10 | Compare consistency vs improvement templates | ✅ |
| 7.11 | Compare processing vs analytics templates | ✅ |
| 7.12 | Identify goal conflicts | ✅ |
| 7.13 | Identify goal synergies | ✅ |
| 7.14 | Rank goals by user priority | ✅ |
| 7.15 | Map goals to template types | ✅ |

**Output →**

### GOAL-BASED TEMPLATE DESIGNS

#### 7.1 Goal: Build Consistency Habit

**User mindset:** "I want to approach regularly and build the habit."

**What serves this goal:**
- Minimum friction
- Celebrate showing up
- Streak tracking
- Identity reinforcement

**Template design:**
```
1. Did you go out? ✅
2. Approaches: [number]
3. 😤😐😊🔥 How'd it feel?
4. Best moment (1 sentence, optional): ___

[🔥 Streak: 5 sessions! You're building the habit.]
```

**Time:** 15-30 seconds

#### 7.2 Goal: Rapid Skill Improvement

**User mindset:** "I want to get better fast. Show me what I'm doing wrong."

**What serves this goal:**
- Conversation reconstruction
- AI analysis on mistakes
- "Why did it end?" focus
- Technique experimentation tracking
- Hypothesis → test → learn cycle

**Template design:**
```
1. Approaches: [number]
2. Best interaction - describe:
   [+] Write full conversation
3. Why did it end?
4. What would you do differently?
5. Technique you were practicing:
6. Did it work? What did you learn?
7. What will you try next time?

[🤖 AI Analysis: "You asked 4 questions in a row without making any statements..."]
```

**Time:** 5-10 minutes

#### 7.3 Goal: Emotional Processing

**User mindset:** "I had a rough/significant experience and need to process it."

**What serves this goal:**
- Emotion acknowledgment (but brief)
- Reframing prompts
- Self-compassion
- Forward action (not dwelling)

**Template design:**
```
1. 😤 Quick check: How do you feel?
2. What happened? (facts, brief)
3. What can you learn from this?
4. What would you tell a friend in this situation?
5. One thing you did well despite difficulty:
6. Smallest next step:
```

**Time:** 3-5 minutes
**Note:** Facts-first, learning-focused per user feedback. Not "feeling sorry" mode.

#### 7.4 Goal: Pattern Recognition Over Time

**User mindset:** "I want to see my patterns and track progress over months."

**What serves this goal:**
- Consistent data collection
- Sticking point tracking
- Tagged fields for filtering
- Trend visualization

**Template design:**
```
1. Approaches: [number]
2. Sticking point focus: [dropdown: AA, conversation, escalation, closing, other]
3. Did sticking point appear? [y/n]
4. If yes, what happened?
5. Progress on sticking point: [1-5 scale]
6. Tags: [multiselect: day/night, solo/wing, location type]

[📊 Trend: Your approach anxiety has improved 40% over 3 months]
```

**Time:** 2-3 minutes

#### 7.5 Goal: Accountability

**User mindset:** "I want to be accountable to my goals and commitments."

**What serves this goal:**
- Pre-session intention recall
- Goal tracking
- Commitment logging
- Review of promises kept/broken

**Template design:**
```
1. What was your goal for this session?
   [Auto-pull from pre-session if set]
2. Did you achieve it? [Yes/Partially/No]
3. Approaches: [number]
4. If not achieved, what got in the way?
5. Commitment for next session:

[📋 This month: 8/10 sessions hit goal]
```

**Time:** 2-3 minutes

#### 7.6 Goal: Sharing with Coach/Mentor

**User mindset:** "I want my coach to see this and give feedback."

**What serves this goal:**
- Structured format
- Full conversation writeup
- Specific questions for coach
- Non-embarrassing to share

**Template design:**
```
1. Session summary: [number] approaches at [location]
2. Best interaction:
   [+] Full conversation
3. What I think went wrong:
4. What I think went well:
5. Questions for my coach:
   - ___
   - ___

[Share link: coach-view-only URL]
```

**Time:** 5-10 minutes

#### 7.7 Goal: Self-Reflection/Journaling

**User mindset:** "I want to journal about my experience, not just track metrics."

**What serves this goal:**
- Open-ended prompts
- No required structure
- Space for thoughts/feelings
- Optional depth

**Template design:**
```
1. Approaches: [number]
2. Write about your session:
   [Large freeform text area]

   Prompts (optional, collapsible):
   - What stood out?
   - What are you thinking about?
   - What do you want to remember?
```

**Time:** Varies (2-20 minutes)

#### 7.8 Goal: Data/Analytics Collection

**User mindset:** "I want clean data for long-term analysis."

**What serves this goal:**
- Structured fields (dropdowns, scales)
- Consistent categories
- Exportable format
- Quantifiable metrics

**Template design:**
```
1. Date: [auto]
2. Location: [dropdown + custom]
3. Time of day: [dropdown: morning/afternoon/evening/night]
4. Duration (minutes): [number]
5. Approaches: [number]
6. Outcome breakdown:
   - Stopped/ignored: [n]
   - Brief chat: [n]
   - Longer conversation: [n]
   - Contact exchange: [n]
   - Instant date: [n]
7. Energy pre: [1-5]
8. Energy post: [1-5]
9. Session rating: [1-5]
```

**Time:** 2-3 minutes

#### 7.9 Goal: Celebrating Wins

**User mindset:** "I want to acknowledge what's going well, not just problems."

**What serves this goal:**
- Wins-first structure
- No improvement questions required
- Positive framing
- Achievement tracking

**Template design:**
```
1. 🔥 What went well today?
2. What are you proud of?
3. What took courage?
4. Best moment:
5. [Optional] Anything to improve?

[🏆 Achievement unlocked: First number close!]
```

**Time:** 2-3 minutes

---

### GOAL COMPARISONS

#### 7.10 Consistency vs Improvement Templates

| Aspect | Consistency | Improvement |
|--------|-------------|-------------|
| Primary metric | Did you show up? | What did you learn? |
| Friction | Ultra-low | Medium (worth the investment) |
| Analysis depth | None | High |
| Conversation writeup | Optional | Encouraged |
| AI feedback | Celebration only | Detailed critique |
| Best for | Building habit | Breaking plateaus |

**Can combine:** "Consistency" as default, prompt to expand for "Improvement" on notable sessions.

#### 7.11 Processing vs Analytics Templates

| Aspect | Processing | Analytics |
|--------|------------|-----------|
| Focus | How you feel | What happened |
| Questions | Open-ended | Structured |
| Output | Insights | Data points |
| Time | Varies | Consistent |
| Best for | Significant sessions | Long-term tracking |

**Conflict:** Processing is qualitative; analytics is quantitative. Hard to combine well.

#### 7.12 Goal Conflicts

| Goal A | Goal B | Conflict |
|--------|--------|----------|
| Consistency (low friction) | Improvement (detailed analysis) | Time/effort tradeoff |
| Processing (open-ended) | Analytics (structured) | Format incompatible |
| Quick logging | Coach sharing | Need more detail for coach |
| Celebrating wins | Pattern tracking | Different focus (positive vs. problems) |

**Resolution:** Multiple templates OR expandable sections

#### 7.13 Goal Synergies

| Goal A | Goal B | Synergy |
|--------|--------|---------|
| Consistency | Celebrating | Both positive, reinforce habit |
| Improvement | Coach sharing | Both need conversation detail |
| Analytics | Pattern recognition | Both need structured data |
| Accountability | Consistency | Both track commitment |

---

### GOAL RANKINGS & MAPPING

#### 7.14 Goals by User Priority (estimated)

| Rank | Goal | % of Users |
|------|------|------------|
| 1 | **Rapid improvement** | 40% |
| 2 | **Consistency** | 25% |
| 3 | **Pattern recognition** | 15% |
| 4 | **Accountability** | 10% |
| 5 | **Celebrating wins** | 5% |
| 6 | **Analytics** | 3% |
| 7 | **Self-reflection** | 2% |
| 8 | **Coach sharing** | <1% (niche) |

#### 7.15 Goals → Template Mapping

| Goal | Base Template | Key Additions |
|------|---------------|---------------|
| Consistency | Quick | Streak, celebration |
| Improvement | Standard + expansion | Conversation writeup, AI |
| Processing | Standard | Reframe prompts |
| Patterns | Standard | Sticking point fields |
| Accountability | Standard | Goal tracking |
| Coach | Deep | Share link |
| Journaling | Freeform | Large text area |
| Analytics | Standard | Structured dropdowns |
| Wins | Quick | Wins-first ordering |

---

## PHASE 8: Anti-Patterns (15 steps)

| # | Step | Status |
|---|------|--------|
| 8.1 | List reasons people skip field reports | ✅ |
| 8.2 | Identify friction points in current tools | ✅ |
| 8.3 | Identify questions that feel pointless | ✅ |
| 8.4 | Identify questions that trigger shame or cause rumination | ✅ |
| 8.5 | Identify data that's never looked at again | ✅ |
| 8.6 | Identify over-complicated structures | ✅ |
| 8.7 | Identify under-specified structures | ✅ |
| 8.8 | Research failed tracking tools and abandoned journal practices | ✅ |
| 8.9 | List "too long" and "too vague" anti-patterns | ✅ |
| 8.10 | List "too rigid" and "too flexible" anti-patterns | ✅ |
| 8.11 | List "wrong timing/tone/focus" anti-patterns | ✅ |
| 8.12 | Identify gamification and metrics that backfire | ✅ |
| 8.13 | List questions beginners hate | ✅ |
| 8.14 | List questions advanced users hate | ✅ |
| 8.15 | Compile "never do this" and "be careful with this" lists | ✅ |

**Output →**

### WHY PEOPLE SKIP FIELD REPORTS

#### 8.1 Reasons for Skipping

**Effort/Time:**
- "I'm too tired after the session"
- "It takes too long"
- "I'll do it later" → never happens
- "I don't have my phone/computer"

**Emotional:**
- "I don't want to think about it"
- "It was a bad day, I want to forget"
- "I feel embarrassed about what happened"
- "Reliving the rejection hurts"

**Value:**
- "It doesn't help me get better"
- "I already know what I did wrong"
- "No one reads these anyway"
- "It feels like busywork"

**Friction:**
- "The app/spreadsheet is annoying"
- "Too many required fields"
- "I forgot my login"
- "The questions don't fit my situation"

#### 8.2 Friction Points in Current Tools

| Tool | Friction Point |
|------|----------------|
| Spreadsheets | Hard to fill on mobile, no prompts, boring |
| Daylio | Not designed for this, awkward workarounds |
| Forum posts | Public, need to write well, fear of judgment |
| Notes app | No structure, easy to skip, no prompts |
| Custom apps | Bad UX, abandoned by developers |

---

### PROBLEMATIC QUESTIONS

#### 8.3 Questions That Feel Pointless

| Question | Why It's Pointless |
|----------|-------------------|
| "Rate the quality of women today 1-10" | Doesn't help learning |
| "What were you wearing?" | Rarely relevant |
| "Weather?" | Auto-capture this, don't ask |
| "Describe the location in detail" | One-time setup, not per-session |
| "List every approach outcome" | Tedious for high-volume days |
| "How attractive was she?" | Subjective, doesn't help learning |

#### 8.4 Questions That Trigger Shame/Rumination

| Question | Problem |
|----------|---------|
| "What did you do wrong?" | Frames negatively, triggers shame |
| "Why do you keep making this mistake?" | Accusatory, rumination spiral |
| "How many rejections?" | Focuses on failure |
| "Rate your performance 1-10" | Arbitrary, easy to self-flagellate |
| "What would [guru name] think of this?" | External judgment |
| "Are you even improving?" | Seeds doubt |

**Better alternatives:**
| Bad | Better |
|-----|--------|
| "What did you do wrong?" | "What would you do differently?" |
| "How many rejections?" | "How many approaches?" |
| "Rate your performance" | "Rate your execution of your plan" |

#### 8.5 Data Nobody Looks At

| Data | Why It's Ignored |
|------|------------------|
| Detailed time logs | Too granular |
| Weather | Correlation is weak |
| Day of week | Rarely actionable |
| Outfit details | Doesn't vary much |
| "Rate each approach" | Too tedious |
| Detailed stats after 1000+ approaches | Becomes counterproductive |

---

### STRUCTURAL PROBLEMS

#### 8.6 Over-Complicated Structures

**Examples:**
- 20+ required fields
- Multiple nested categories
- Required ratings for every approach
- Separate forms for different outcomes
- Complex tagging systems

**Symptoms:**
- Reports take >10 minutes
- Users skip fields with "N/A"
- Abandonment after a few uses
- "I'll just remember it" mentality

#### 8.7 Under-Specified Structures

**Examples:**
- Just a blank text box
- "Write about your session"
- No prompts or guidance
- Optional everything

**Symptoms:**
- Users don't know what to write
- Inconsistent entries
- Missing key learning moments
- Drift toward superficial logging

---

### FAILED TRACKING TOOLS

#### 8.8 Why Tracking Tools Fail

**Pattern 1: Overcomplicated at launch**
- Designer tries to capture everything
- Users overwhelmed, never adopt
- Example: Custom apps with 30 fields

**Pattern 2: Too simple, no growth path**
- Starts minimal but never adds depth
- Users outgrow it
- Example: Basic spreadsheet with 5 columns

**Pattern 3: Wrong platform**
- Desktop-only for mobile use case
- No offline support
- Requires account creation
- Example: Web apps that need login each time

**Pattern 4: Creator abandonment**
- Side project gets abandoned
- No updates, bugs accumulate
- Example: Most indie daygame apps

**Why journals get abandoned:**
- Too many blanks to fill
- Guilt when skipping days
- No visible progress
- Becomes a chore

---

### BALANCE PROBLEMS

#### 8.9 Too Long vs Too Vague

**TOO LONG:**
- More than 10 required fields
- Open-ended questions with no length guidance
- Multiple page forms
- Requiring conversation reconstruction every time

**Symptoms:** Skipped sessions, incomplete reports, "I'll do it later"

**TOO VAGUE:**
- "How was it?"
- "Any notes?"
- "What happened?"
- No structure, no prompts

**Symptoms:** Superficial answers, no learning, inconsistent data

**Sweet spot:** 4-7 fields by default, expandable depth

#### 8.10 Too Rigid vs Too Flexible

**TOO RIGID:**
- Can't skip questions
- Can't add custom questions
- Forced ordering
- Same template regardless of context
- "Required" fields that don't apply

**Symptoms:** Frustration, gaming the system ("N/A" everywhere)

**TOO FLEXIBLE:**
- No defaults
- User must build from scratch
- Analysis paralysis
- No best practices embedded

**Symptoms:** Never starts, inconsistent use

**Sweet spot:** Good defaults + full customization option

#### 8.11 Wrong Timing/Tone/Focus

**WRONG TIMING:**
- Deep analysis questions on street (immediate)
- Quick tap options at home (evening)
- Next-day prompts immediately after

**WRONG TONE:**
- Clinical/therapeutic when user wants practical
- Cheerful when user is frustrated
- Accusatory framing
- Condescending ("Did you remember to smile?")

**WRONG FOCUS:**
- Stats when user needs processing
- Processing when user wants to log and go
- Technique when user is building basic habit
- Basic questions for advanced users

---

### GAMIFICATION GONE WRONG

#### 8.12 Backfiring Gamification

**Streaks:**
- ✅ Good: Approach streaks, field report streaks
- ❌ Bad: Streaks that break from one missed day → guilt
- ❌ Bad: Streaks that punish (lose XP)

**Points/XP:**
- ✅ Good: XP for completing reports
- ❌ Bad: XP for approach count (gaming the metric)
- ❌ Bad: XP for "successful" outcomes (can't control)

**Leaderboards:**
- ❌ Almost always bad for this use case
- Creates toxic comparison
- Rewards quantity over quality
- Embarrasses lower performers

**Achievements:**
- ✅ Good: "First approach", "First conversation", "First number"
- ❌ Bad: "100 rejections!" (celebrates failure)
- ❌ Bad: "Better than 50% of users" (comparison)

**Metrics that mislead:**
- Approach-to-number ratio (varies by type of approach)
- "Conversion rate" (makes people play safe)
- Daily averages (doesn't fit irregular schedule)

---

### EXPERIENCE-SPECIFIC ANNOYANCES

#### 8.13 Questions Beginners Hate

| Question | Why They Hate It |
|----------|------------------|
| "What technique did you use?" | "I don't know techniques yet" |
| "Analyze your conversation" | "I can barely remember it" |
| "Rate your execution" | "I have no baseline" |
| "What's your sticking point?" | "Everything is a sticking point" |
| "Why didn't you escalate?" | "I was just trying to talk" |

**What beginners need:**
- "Did you approach? Great."
- "What took courage today?"
- Celebration, not analysis

#### 8.14 Questions Advanced Users Hate

| Question | Why They Hate It |
|----------|------------------|
| "Did you make eye contact?" | "Obviously" |
| "Did you smile?" | "Waste of time" |
| "What was your opener?" | "Same one I always use" |
| "How many approaches?" (required) | "Tedious for high volume" |
| "Describe what happened" (when nothing notable) | "Nothing to describe" |

**What advanced users need:**
- "Anything notable? No → done"
- Speed by default
- Depth on demand

---

### COMPILED LISTS

#### 8.15 Never Do This / Be Careful

**🚫 NEVER DO THIS:**
1. Required essay questions
2. Leaderboards comparing users
3. Questions that assume failure ("what went wrong?")
4. Punishment for missing reports
5. Judging users ("you should have...")
6. Stats that encourage gaming metrics
7. Clinical/therapy language by default
8. Public by default
9. Force daily when schedule varies

**⚠️ BE CAREFUL WITH:**
1. Streaks - good if forgiving, bad if punitive
2. XP/points - good for completion, bad for outcomes
3. Conversation reconstruction - valuable but optional
4. Emotional processing - needed sometimes, not always
5. AI feedback - helpful but can feel judgmental
6. Long templates - okay if optional
7. Pattern questions - great for some, overwhelming for others
8. Self-rating scales - useful data but easy to abuse

---

## PHASE 9: Wild Cards (15 steps)

| # | Step | Status |
|---|------|--------|
| 9.1 | What would a professional coach want to see? | ✅ |
| 9.2 | What would a sports psychologist or therapist want? | ✅ |
| 9.3 | What would YOU want to read 1 year from now? | ✅ |
| 9.4 | What would YOU want to read 5 years from now? | ✅ |
| 9.5 | What would be shareable with a wing or community? | ✅ |
| 9.6 | What would you be embarrassed to write? Why might that be important? | ✅ |
| 9.7 | What if AI analyzed all reports? What would AI need? | ✅ |
| 9.8 | What if reports were gamified? What achievements make sense? | ✅ |
| 9.9 | What if reports had streaks? | ✅ |
| 9.10 | What if reports were voice-only or video? | ✅ |
| 9.11 | What if reports were collaborative? | ✅ |
| 9.12 | What if reports surfaced past insights or predicted sticking points? | ✅ |
| 9.13 | What would a "fun" vs "serious" report look like? | ✅ |
| 9.14 | What would a "minimal" vs "comprehensive" report look like? | ✅ |
| 9.15 | List unexpected/creative ideas | ✅ |

**Output →**

### PROFESSIONAL PERSPECTIVES

#### 9.1 What Would a Coach Want to See?

**A professional daygame coach reviewing your reports would want:**

1. **Full conversations** - Can't diagnose without seeing what you said
2. **Context** - Time, place, her energy, your state
3. **Your self-assessment** - Shows awareness level
4. **Patterns over time** - Not just single sessions
5. **What you've tried** - Avoid suggesting things already attempted
6. **Questions from you** - Shows engagement

**Ideal coach-view report:**
```
Session: [date, location, duration]
Approaches: [number]

CONVERSATION (full dialogue)
Me: ...
Her: ...

MY ANALYSIS:
- What I think went well: ...
- What I think went wrong: ...

MY QUESTIONS FOR COACH:
1. Should I have...?
2. How do I handle...?

[Coach notes section - coach can annotate]
```

#### 9.2 What Would a Sports Psychologist/Therapist Want?

**Sports psychologist:**
- Pre-session mental state
- Confidence trajectory during session
- Response to adversity (after rejections)
- Self-talk patterns
- Performance anxiety indicators
- Recovery between sets

**Therapist:**
- Emotional processing
- Cognitive distortions
- Self-compassion level
- Rumination indicators
- Growth mindset markers
- Social anxiety patterns

**Combined insight:** Both would want to see the INNER GAME, not just the outer game. The mental/emotional journey matters as much as the conversation.

**Fields they'd want:**
```
- Anxiety before first approach: [1-10]
- Anxiety after warmup: [1-10]
- Response to hardest rejection today: [text]
- What you told yourself after: [text]
- Cognitive distortion check: [multiselect]
```

---

### FUTURE SELF PERSPECTIVES

#### 9.3 What Would You Want to Read 1 Year From Now?

**Purpose:** Looking back to see progress

**You'd want:**
- Clear memory triggers ("the brunette with the dog near Magasin")
- Emotional snapshot ("I was terrified but did it anyway")
- Specific breakthrough moments
- Evidence of how far you've come
- Funny/memorable details

**Fields:**
```
- Memorable detail (so you remember this): ___
- What took courage: ___
- How you felt: ___
- One thing you're proud of: ___
```

#### 9.4 What Would You Want to Read 5 Years From Now?

**Purpose:** Life documentation, not just skill improvement

**You'd want:**
- The big wins (first date, first relationship from this)
- Your mindset shifts
- The journey, not just the stats
- Stories worth retelling
- Proof that the struggle was worth it

**Fields:**
```
- If this session led to something significant, flag it: ☐
- Personal milestone achieved? ___
- Mindset shift noticed? ___
```

---

### SOCIAL CONTEXTS

#### 9.5 What Would Be Shareable with Wing/Community?

**Shareable elements:**
- Funny moments
- Interesting conversations
- Techniques that worked
- Lessons learned
- Anonymized (no identifying details)

**NOT shareable:**
- Specific outcome stats (too personal)
- Embarrassing failures
- Self-pitying processing
- Identifying details

**Shareable template:**
```
Quick share: [location], [number] approaches

Highlight: [best interaction, funny moment, or lesson]

What worked: ___
What I learned: ___

[Share to wing / community toggle]
```

#### 9.6 What Would You Be Embarrassed to Write?

**Embarrassing but important:**
- "I chickened out 5 times before approaching"
- "I ejected early because I was scared"
- "I got a number but didn't actually like her"
- "I lied/exaggerated to her"
- "I know what I should do but I'm afraid"
- "I'm using daygame as avoidance of other life issues"

**Why this matters:**
- Embarrassment often points to the REAL issue
- Writing it down forces honesty
- Patterns only visible when written

**Design implication:**
- "Private mode" for sensitive entries
- Non-judgmental prompts
- "What aren't you admitting to yourself?"

---

### AI & TECHNOLOGY

#### 9.7 What Would AI Need to Give Good Feedback?

**For conversation analysis:**
- Full conversation text (dialogue format)
- Context (where, when, her energy)
- Your intention (what you were trying to do)
- Outcome (how it ended)

**For pattern recognition:**
- Consistent tagging (sticking points, techniques)
- Emotion tracking over time
- Session context (good day/bad day)
- Multiple sessions (at least 10+ for patterns)

**For personalized coaching:**
- Current skill level
- Active learning goals
- What feedback you've received before
- What you've already tried

**AI-optimized template additions:**
```
Conversation (for AI analysis):
[Structured dialogue format]

AI, please analyze for:
☐ Conversation flow issues
☐ Questions vs. statements ratio
☐ Escalation opportunities missed
☐ Emotional calibration
☐ Open my patterns across sessions
```

---

### GAMIFICATION IDEAS

#### 9.8 Achievements That Make Sense

**Milestone achievements (good):**
- "First approach" 🎯
- "First conversation >5 min" 💬
- "First number" 📱
- "First date from cold approach" ☕
- "10 sessions completed" 🔟
- "50 conversations written down" 📝

**Habit achievements (good):**
- "Field report streak: 5 sessions" 🔥
- "Completed a deep dive" 🔬
- "Reviewed past insights" 📚

**Process achievements (good):**
- "Practiced specific technique 5x" 🎯
- "Wrote full conversation" 📝
- "Identified a sticking point" 🔍

**AVOID:**
- "100 rejections!" (celebrates wrong thing)
- "Better than 50% of users" (comparison)
- "Fastest approach time" (gameable)

#### 9.9 Streak Mechanics

**Good streak design:**
- Based on session frequency, not daily
- "3 of last 5 planned sessions" not "7 days straight"
- Forgiveness for life interruptions
- Celebration, not punishment

**Streak types:**
| Streak | What It Tracks |
|--------|----------------|
| Session streak | Consecutive planned sessions completed |
| Report streak | Reports filed for consecutive sessions |
| Deep dive streak | Thorough reports in a row |

**Display:**
```
🔥 Session streak: 4
📝 Report streak: 6
You're consistent! [animation]
```

---

### ALTERNATIVE FORMATS

#### 9.10 Voice-Only or Video Reports

**Voice-only:**
- Talk through the session while walking home
- Stream-of-consciousness capture
- AI transcription + cleanup later
- Good for: Detail capture, emotional processing

**Video:**
- Record yourself debriefing
- See your own energy/state
- Review body language
- Good for: Advanced users, coach review

**Design:**
```
[🎙️ Record audio]
[📹 Record video]

Later: AI transcribes and suggests fields to fill
```

#### 9.11 Collaborative Reports

**Wing debrief mode:**
- Both fill reports simultaneously
- Compare perspectives
- "What did you observe in your wing's set?"
- Shared learning

**Community modes:**
- Anonymous "today's highlight" shares
- "Learn from others" feed
- Optional feedback requests

---

### SMART FEATURES

#### 9.12 Surfacing Past Insights / Predictions

**Past insights:**
- "Last time you struggled with [X], you learned [Y]"
- "On This Day" last year
- "Your top 3 insights this month"
- "Pattern alert: You've mentioned [sticking point] 5 times"

**Predictions:**
- "Based on your recent sessions, you might be ready to focus on [technique]"
- "Your approach anxiety has decreased 30% - maybe try [harder challenges]"
- "You tend to struggle on [Saturdays] - any ideas why?"

**Implementation:**
```
[Before session]
Reminder: Last session you wanted to practice [X].

[After session]
Pattern detected: "Interview mode" mentioned 3 times this month.
Suggested focus: Making statements instead of questions.
```

---

### TONE VARIATIONS

#### 9.13 Fun vs Serious Reports

**FUN template:**
```
🎯 Approaches today: [number]
🔥 Highlight reel moment: ___
😂 Funniest thing that happened: ___
💪 What took balls: ___
🎉 Win of the day: ___

[Confetti animation on submit]
```

**SERIOUS template:**
```
Session Analysis
Date: [auto]
Approaches: [number]
Technique focus: [dropdown]
Execution assessment: [1-5]
Gap analysis: ___
Lesson extracted: ___
Next session focus: ___
```

**Design insight:** Let users choose tone, or auto-detect based on their mood tap.

#### 9.14 Minimal vs Comprehensive

**MINIMAL (15 seconds):**
```
[+1 approach button]
😤😐😊🔥
Done.
```

**COMPREHENSIVE (15 minutes):**
```
Context: [10 fields]
State: [5 fields]
Interaction 1: [full conversation + analysis]
Interaction 2: [full conversation + analysis]
Interaction 3: [full conversation + analysis]
Patterns: [5 fields]
Learning: [5 fields]
Forward: [3 fields]
```

**Design insight:** These are endpoints on a slider. User should be able to choose where they land.

---

### UNEXPECTED IDEAS

#### 9.15 Creative / Wild Ideas

1. **Pre-mortem:** Before session, imagine it went badly. What happened? (Prepares for adversity)

2. **Alter-ego mode:** "Describe the session as if you were [confident character]" (Shifts perspective)

3. **Haiku challenge:** Summarize session in haiku format (Forces concision)

4. **Photo attachment:** Take a photo of the location (Memory trigger)

5. **Audio clips:** Record her voice (if consented for "practicing conversation") as reference

6. **Rejection bingo:** Track types of rejections to normalize them

7. **Energy graph:** Draw your energy curve through the session

8. **Dialogue roleplay:** AI plays the girl, you practice alternative responses

9. **Letter to past self:** "What would you tell yourself 6 months ago?"

10. **Session soundtrack:** "What song fits today's session?" (Emotional anchor)

11. **Approach location map:** GPS dots showing where you approached over time

12. **Conversation transcript AI:** Feed in rough notes, AI structures into dialogue

13. **Commitment contracts:** "I commit to [X] next session" with reminder

14. **Session grading by metrics you choose:** Pick your own 3 metrics to track

15. **Anti-field-report:** "What would you tell yourself NOT to write?" (Surfaces avoidance)

**→ USER CHECKPOINT D: Present anti-patterns and wild ideas before compiling.**

---

## USER FEEDBACK: Checkpoints B/C/D (31-01-2026)

### Summary of Key Findings

**PHASE 4-5: Context Insights**
- Primary user: Neutral day + Early-stage user + Solo (60-70% of sessions)
- Best timing: Commute home (1-2 hrs post-session) - memory fresh, can type
- Multi-stage pattern confirmed:
  - Quick tap on street (+1, emoji)
  - Fill out on commute/evening
  - Optional deep dive for notable sessions

**PHASE 6: Stolen Ideas Worth Keeping**

| Source | Steal | Status |
|--------|-------|--------|
| Day One | "On This Day" memories | ⭐ KEEP - future feature |
| Day One | Quick capture widgets | ✅ Already planned |
| Notion | Toggle/expand sections | ✅ Already planned |
| Notion | Linked data | ✅ Already planned |
| Strava | Personal records | ✅ Already planned |
| Strava | Training load concept | ✅ Already planned |
| Loop | Flexible scheduling (not daily) | ✅ Already planned |
| CBT | Facts vs. thoughts separation | ✅ Already planned |
| CBT | Reframing prompts | ✅ Already planned |
| AAR | Intent vs. actual comparison | ✅ Already planned |
| AAR | Sustain/improve framework | ✅ Already planned |
| Wild | Approach location map | ⭐ KEEP - future nice-to-have |
| Wild | ~~Dialogue roleplay with AI~~ | ❌ SKIP - exists elsewhere (QA scenarios) |

**PHASE 7: Goal Priority (User-Ranked)**

| Rank | Goal | % Users | What They Need |
|------|------|---------|----------------|
| 1 | Rapid improvement | 40% | Conversation writeup, AI analysis |
| 2 | Consistency | 25% | Low friction, streaks |
| 3 | Pattern recognition | 15% | Sticking point tracking |
| 4 | Emotional processing | 10% | Reframes, self-compassion |
| 5 | Data/analytics | 10% | Stats over time |

**PHASE 8: Critical Anti-Patterns**

🚫 **NEVER:**
1. Required essay questions
2. Leaderboards
3. "What did you do wrong?" framing
4. Punishment for missing reports
5. Public by default

⚠️ **BE CAREFUL:**
1. Streaks (forgiving > punitive)
2. AI feedback (helpful, not judgmental)
3. Emotion processing (not "feeling sorry" mode)

**PHASE 9: Wild Ideas Decisions**

| Idea | Decision |
|------|----------|
| AI conversation analysis | ✅ Core feature - already planned |
| Past insight surfacing | ✅ Implement - "Pattern alert: Interview mode mentioned 5x" |
| Voice capture | ✅ Implement - walk home, transcribe later |
| "On This Day" | ⭐ Future feature - good for motivation |
| Approach location map | ⭐ Future nice-to-have |
| ~~Dialogue roleplay with AI~~ | ❌ Skip - exists in QA scenarios |

### Design Implications

1. **Default flow**: Quick tap on street → Standard report on commute → Optional deep dive
2. **Core template**: Optimize for neutral day + early-stage user + solo context
3. **Conversation writeup + AI analysis**: Priority #1 (serves 40% wanting rapid improvement)
4. **Pattern surfacing**: Show insights like "Interview mode mentioned 5x this month"
5. **Future backlog**: On This Day, approach location map

---

## PHASE 10: Compile All Ideas (15 steps)

| # | Step | Status |
|---|------|--------|
| 10.1 | Collect all structural options from Phase 1 | ✅ |
| 10.2 | Collect all research-based templates from Phase 2 | ✅ |
| 10.3 | Collect all question types and flows from Phase 3 | ✅ |
| 10.4 | Collect all user-context and when/where designs from Phases 4-5 | ✅ |
| 10.5 | Collect all competitor insights from Phase 6 | ✅ |
| 10.6 | Collect all goal-based templates from Phase 7 | ✅ |
| 10.7 | Collect all anti-patterns from Phase 8 | ✅ |
| 10.8 | Collect all wild card ideas from Phase 9 | ✅ |
| 10.9 | Deduplicate and group similar ideas | ✅ |
| 10.10 | Create master list: Template structures and names | ✅ |
| 10.11 | Create master list: Individual fields/questions and types | ✅ |
| 10.12 | Create master list: Anti-patterns and wild ideas | ✅ |
| 10.13 | Tag ideas by source, confidence, and difficulty | ✅ |
| 10.14 | Identify conflicts and synergies between ideas | ✅ |
| 10.15 | Format master list for presentation | ✅ |

**Output →**

### 10.1-10.8: Collected Ideas by Source

**From Phase 1 (Structural):**
- Depth-based: Quick (30s) / Standard (3m) / Deep (10m)
- Modular: Core + optional add-ons
- Experience-based auto-adaptation
- Single-template with expandable sections

**From Phase 2 (Research):**
- Sports psych: Pre/post energy ratings, RPE, process focus
- AAR: Intent vs actual, sustain/improve framework
- CBT: Emotion scaling, cognitive distortion check, reframing
- Habit science: Celebration, streaks, identity reinforcement

**From Phase 3 (Questions):**
- "Why did it end?" - the critical learning question
- "What would you do differently?" - action-oriented
- "Best moment" - positive anchor, memory trigger
- Minimal (1-3), Standard (5-7), Comprehensive (10+)

**From Phase 4-5 (Context):**
- Primary user: Neutral day + Early-stage + Solo (60-70%)
- Best timing: Commute home (memory fresh, can type)
- Multi-stage: Quick tap on street → Fill on commute → Optional deep dive

**From Phase 6 (Competitors):**
- Day One: On This Day, quick capture widgets
- Notion: Toggle/expand, linked data
- Strava: Personal records, training load
- Loop: Flexible scheduling (not daily)
- CBT/AAR: Facts vs thoughts, intent vs actual

**From Phase 7 (Goals):**
- #1 Rapid improvement (40%): Conversation writeup + AI analysis
- #2 Consistency (25%): Low friction, streaks
- #3 Pattern recognition (15%): Sticking point tracking

**From Phase 8 (Anti-Patterns):**
- 🚫 NEVER: Required essays, leaderboards, "what went wrong?", punishment, public default
- ⚠️ CAREFUL: Streaks, AI feedback tone, emotion processing

**From Phase 9 (Wild Cards):**
- ✅ Implement: Voice capture, past insight surfacing, pattern alerts
- ⭐ Future: On This Day, approach location map
- ❌ Skip: Dialogue roleplay (exists in QA)

---

### 10.9-10.10: Master List - Template Structures

| Structure | Name | Time | When to Use | Core Fields |
|-----------|------|------|-------------|-------------|
| **Quick** | "Quick Log" | 30s | On street, routine days | +1 button, emoji mood, optional note |
| **Standard** | "Session Report" | 3min | Commute, most sessions | Count, mood, best moment, why ended, key takeaway |
| **Deep** | "Deep Dive" | 10min | Breakthrough/notable sets | + Full conversation, technique analysis, pattern review |

**Recommended Structure:** 3 templates (Quick → Standard → Deep) with progressive disclosure

**Template Flow:**
```
Quick Log (on street)      → "Done for now"
         ↓ or
Standard Report (commute)  → "Done" OR "Add conversation"
         ↓ if notable
Deep Dive (evening)        → Full analysis
```

---

### 10.11: Master List - Fields/Questions

**CORE FIELDS (all templates):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date/time | Auto | Yes | Auto-filled |
| Location | Text/Auto | Yes | Could use GPS |
| Approach count | Number | Yes | The universal metric |
| Mood | Emoji (😤😐😊🔥) | Yes | 1 tap |
| Best moment | Text (1 line) | No | Positive anchor |

**STANDARD ADDITIONS:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Pre-session energy | Scale 1-5 | No | From pre-session |
| Post-session energy | Scale 1-5 | No | State change |
| Why did it end? | Text | No | Critical learning Q |
| What would you do differently? | Text | No | Action-oriented |
| Key takeaway | Text | No | Forces synthesis |

**DEEP DIVE ADDITIONS:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Conversation writeup | Dialogue | No | AI analysis input |
| Technique practiced | Select | No | From taxonomy |
| Hinge moment | Text | No | Decision point analysis |
| Sticking point appeared? | Y/N + text | No | Pattern tracking |
| Reframe needed? | Text | No | CBT element |

**QUESTION ORDERING (Standard template):**
```
1. 😤😐😊🔥 How do you feel? [emoji tap]
2. Approaches today: [number]
3. Best moment: [text, 1 line]
4. Best interaction - why did it end? [text]
5. What would you do differently? [text]
6. Key takeaway: [text, optional]
7. [+] Add conversation writeup [expand]
```

---

### 10.12: Master List - Anti-Patterns & Wild Ideas

**ANTI-PATTERNS (Verified)**

| Category | Anti-Pattern | Why Bad | Alternative |
|----------|--------------|---------|-------------|
| Questions | Required essays | Friction, skip | Optional depth |
| Questions | "What went wrong?" | Shame spiral | "What would you do differently?" |
| Questions | Pointless data (weather, outfit) | Wastes time | Auto-capture or skip |
| Gamification | Leaderboards | Toxic comparison | Personal bests only |
| Gamification | Punitive streaks | Guilt when missed | Forgiving streaks |
| Gamification | Outcome-based XP | Gaming metrics | Process-based XP |
| Structure | Too many required fields | Abandonment | Progressive disclosure |
| Structure | No guidance (blank box) | No learning | Smart prompts |
| Tone | Clinical language | Feels like therapy | Natural language |
| Tone | Accusatory framing | Shame | Curious framing |

**WILD IDEAS TO IMPLEMENT**

| Idea | Priority | Effort | Value |
|------|----------|--------|-------|
| Voice capture (walk home) | High | Medium | High (solves timing) |
| Past insight surfacing | High | Medium | High (pattern recognition) |
| Pattern alerts ("Interview mode 5x") | High | Medium | High (awareness) |
| On This Day memories | Medium | Low | Medium (motivation) |
| Approach location map | Low | High | Low (nice-to-have) |

---

### 10.13: Tags by Source/Confidence

| Idea | Source | Confidence | Difficulty |
|------|--------|------------|------------|
| 3-template depth structure | Phase 1 + user | High | Low |
| Quick/Standard/Deep naming | Phase 1 | Medium | Low |
| Emoji mood tap | Multiple | High | Low |
| "Why did it end?" question | Phase 3 + coach | High | Low |
| Conversation writeup | Phase 7 (goal #1) | High | Medium |
| AI analysis | Core feature | High | High |
| Voice capture | Phase 9 | High | High |
| Pattern alerts | Phase 9 | High | Medium |
| Forgiving streaks | Phase 8 | High | Low |
| On This Day | Phase 6 (Day One) | Medium | Low |
| Location map | Phase 9 | Low | High |

---

### 10.14: Conflicts & Synergies

**SYNERGIES:**
- Quick tap on street + Standard on commute = Multi-stage flow (reinforces habit)
- Conversation writeup + AI analysis = Core value prop (serves goal #1)
- Forgiving streaks + celebration = Positive reinforcement loop
- "Why did it end?" + "Do differently" = Learning cycle
- Pattern alerts + sticking point tracking = Awareness feedback

**CONFLICTS:**
| Conflict | Resolution |
|----------|------------|
| Deep analysis vs. low friction | Progressive disclosure (start minimal, expand on demand) |
| Emotion processing vs. "not feeling sorry" | Brief acknowledgment → quick pivot to learning |
| Beginner celebration vs. advanced speed | Experience-based defaults (auto-detect level) |
| Rich data vs. quick logging | Core fields always quick, detail fields optional |

---

### 10.15: Formatted Summary for User Selection

**RECOMMENDED TEMPLATE STRUCTURE:**

```
┌─────────────────────────────────────────────────────────┐
│  QUICK LOG (30 sec)  │  STANDARD (3 min)  │  DEEP (10 min)  │
├─────────────────────────────────────────────────────────┤
│  - +1 tap            │  + Best moment      │  + Conversation  │
│  - Emoji mood        │  + Why ended        │  + Technique     │
│  - Optional note     │  + Do differently   │  + Hinge moment  │
│                      │  + Key takeaway     │  + Pattern check │
│                      │  + [Expand to Deep] │  + AI analysis   │
└─────────────────────────────────────────────────────────┘
```

**DEFAULT EXPERIENCE:**
- Target: Neutral day + Early-stage + Solo user
- Flow: Quick tap on street → Standard on commute → Optional deep dive
- Priority: Rapid improvement (#1) via conversation writeup + AI analysis

**CORE VALUE PROPS:**
1. Conversation writeup → AI analysis (unique differentiator)
2. Pattern alerts ("You've mentioned X 5 times")
3. Low friction with optional depth

**FUTURE BACKLOG:**
- On This Day memories
- Approach location map
- Voice capture transcription

---

## PHASE 11: User Selection (22 steps) - COMPLETE

| # | Step | Status |
|---|------|--------|
| 11.1 | Present template structure options | ✅ |
| 11.2 | Ask: How many templates feel right? | ✅ → 3 templates |
| 11.3 | Ask: Which structural approach resonates? | ✅ → Quick → Standard → Deep |
| 11.4 | Record structure preferences | ✅ |
| 11.5 | Present question ordering options | ✅ |
| 11.6 | Ask: Emotion-first or facts-first? | ✅ → Hybrid (emoji → facts) |
| 11.7 | Record ordering preferences | ✅ |
| 11.8 | Present individual field options | ✅ |
| 11.9 | Ask: Which fields are must-have? | ✅ → count, mood, best moment |
| 11.10 | Ask: Which fields are nice-to-have? | ✅ → conversation writeup (optional in all) |
| 11.11 | Ask: Which fields to avoid? | ✅ → see anti-patterns |
| 11.12 | Record field preferences | ✅ |
| 11.13 | Present naming options | ⏭️ → Using defaults |
| 11.14 | Ask: Which names feel right? | ⏭️ → Quick/Standard/Deep |
| 11.15 | Record naming preferences | ✅ |
| 11.16 | Present wild card ideas | ✅ |
| 11.17 | Ask: Any wild cards to include? | ✅ → Pattern alerts + voice capture |
| 11.18 | Record wild card preferences | ✅ |
| 11.19 | Present anti-patterns | ✅ → Verified in Phase 8 |
| 11.20 | Ask: Anything missing? | ⏭️ |
| 11.21 | Summarize all user selections | ✅ |
| 11.22 | Confirm understanding with user | ✅ |

**Output →**

### User Selections Summary (31-01-2026)

| Decision | Selection |
|----------|-----------|
| **Template count** | 3 templates |
| **Template structure** | Quick Log → Standard → Deep Dive |
| **Question flow** | Hybrid (emoji tap first → facts → analysis) |
| **Conversation writeup** | Optional in ALL templates, emphasized in Deep Dive |
| **Wild cards for v1** | Pattern alerts + voice capture |
| **Naming** | Quick Log / Standard / Deep Dive (defaults) |

### Key Design Decisions

1. **Progressive disclosure**: Start minimal, user expands when needed
2. **Conversation writeup everywhere**: Expand button in Quick and Standard, default shown in Deep
3. **No dwelling on emotions**: One emoji tap, then move to facts and learning
4. **Pattern alerts**: "You've mentioned interview mode 5x this month"
5. **Voice capture**: Record on walk home, transcribe later

---

## PHASE 12: Finalize (15 steps) - COMPLETE

| # | Step | Status |
|---|------|--------|
| 12.1 | Determine final template count | ✅ → 3 |
| 12.2 | Name each template and define purpose/tagline | ✅ |
| 12.3 | Assign estimated completion time for each | ✅ |
| 12.4 | Design Template 1: fields, types, required/optional | ✅ |
| 12.5 | Design Template 2: fields, types, required/optional | ✅ |
| 12.6 | Design Template 3: fields, types, required/optional | ✅ |
| 12.7 | Design Template 4+: (if applicable) | N/A |
| 12.8 | Define any modular add-ons | ✅ → Conversation module |
| 12.9 | Verify against anti-patterns | ✅ |
| 12.10 | Verify against user preferences | ✅ |
| 12.11 | Write final spec for all templates | ✅ |
| 12.12 | Create implementation checklist | ✅ |
| 12.13 | Present final spec to user | ✅ |
| 12.14 | Get user approval | ✅ APPROVED |
| 12.15 | Mark ready for implementation | ✅ READY |

**Output →**

---

## FINAL TEMPLATE SPECIFICATIONS

### Template Overview

| Template | Slug | Time | When to Use | Core Value |
|----------|------|------|-------------|------------|
| **Quick Log** | `quick-log` | 30s | On street, routine days | Log it happened |
| **Standard** | `standard` | 3min | Commute, most sessions | Learn from it |
| **Deep Dive** | `deep-dive` | 10min | Notable sets, breakthroughs | Full analysis |
| **Customizable** | `customizable` | 5-15min | Power users, coaches, deep self-work | Pick your questions |

---

### TEMPLATE 1: Quick Log

**Purpose:** Minimum viable logging. Capture that it happened.
**Tagline:** "Log it in 30 seconds"
**When:** On street between sets, or routine sessions with nothing notable

**Fields:**

| Order | Field | Type | Required | Notes |
|-------|-------|------|----------|-------|
| 1 | Mood | Emoji (😤😐😊🔥) | Yes | 1 tap |
| 2 | Approaches | Number (+1 button) | Yes | Tap to increment |
| 3 | Intention/goal | Text (1 line) | No | What were you trying to do? |
| 4 | Quick note | Text (1 line) | No | Optional context |
| 5 | [+] Conversation | Expand | No | Opens conversation module |

**Flow:**
```
[😤] [😐] [😊] [🔥]     ← Tap one
Approaches: [+1] [+1] [+1]  ← Tap to count
Intention/goal: ___________ (optional)
Quick note: ___________ (optional)
[+ Add conversation]    ← Expand if notable
[Done ✓]
```

**Anti-pattern check:**
- ✅ No required text fields
- ✅ No "what went wrong" framing
- ✅ < 30 seconds to complete

---

### TEMPLATE 2: Standard

**Purpose:** Quick learning loop. Extract the key lesson.
**Tagline:** "Learn from every session"
**When:** Commute home, most sessions, when you have 3 minutes

**Fields:**

| Order | Field | Type | Required | Notes |
|-------|-------|------|----------|-------|
| 1 | Mood | Emoji (😤😐😊🔥) | Yes | 1 tap |
| 2 | Approaches | Number | Yes | Manual entry or +1 |
| 3 | Intention/goal | Text (1 line) | No | What were you trying to do? |
| 4 | Best moment | Text (1-2 lines) | No | Positive anchor |
| 5 | Why did it end? | Text | No | Critical learning Q (compare to intention) |
| 6 | Do differently? | Text | No | Action-oriented |
| 7 | Key takeaway | Text (1 line) | No | Forces synthesis |
| 8 | [+] Conversation | Expand | No | Opens conversation module |

**Flow:**
```
[😤] [😐] [😊] [🔥]

Approaches: [___]

What was your intention/goal for this session?
[_________________________________]

Best moment:
[_________________________________]

Your best interaction - why did it end?
[_________________________________]

What would you do differently?
[_________________________________]

Key takeaway (optional):
[_________________________________]

[+ Add conversation for AI analysis]

[Done ✓]
```

**Smart prompts (context-aware):**
- If mood = 😤: "Tough one. What can you learn from this?"
- If mood = 🔥: "Nice! What specifically worked?"

**Anti-pattern check:**
- ✅ No required essay fields
- ✅ All text fields optional
- ✅ No "what went wrong" framing
- ✅ Forward-focused ("do differently" not "did wrong")

---

### TEMPLATE 3: Deep Dive

**Purpose:** Full forensic analysis for notable sessions.
**Tagline:** "Analyze it completely"
**When:** Breakthrough sets, interesting interactions, when you want AI analysis

**Fields:**

| Order | Field | Type | Required | Notes |
|-------|-------|------|----------|-------|
| 1 | Mood | Emoji (😤😐😊🔥) | Yes | 1 tap |
| 2 | Approaches | Number | Yes | Manual entry |
| 3 | Intention/goal | Text | No | What were you trying to do? |
| 4 | Best moment | Text | No | Positive anchor |
| 5 | **Conversation** | Dialogue | **Shown** | Pre-expanded |
| 6 | Technique practiced | Select (multi) | No | From taxonomy |
| 7 | 30 seconds before | Text | No | Lead-up to hinge moment |
| 8 | Hinge moment | Text | No | Decision point |
| 9 | Why did it end? | Text | No | Learning Q (compare to intention) |
| 10 | Do differently? | Text | No | Action |
| 11 | Sticking point? | Toggle + text | No | Pattern tracking |
| 12 | Not admitting? | Text | No | Honest self-reflection |
| 13 | Key takeaway | Text | No | Synthesis |
| 14 | [Get AI Analysis] | Button | No | Triggers AI |

**Flow:**
```
[😤] [😐] [😊] [🔥]

Approaches: [___]

What was your intention/goal for this session?
[_________________________________]

Best moment:
[_________________________________]

─── CONVERSATION ───────────────────
Me: [________________________________]
Her: [_______________________________]
Me: [________________________________]
Her: [_______________________________]
[+ Add more turns]
────────────────────────────────────

Technique practiced: [▼ Select from list]

What happened in the 30 seconds before the key moment?
[_________________________________]

The hinge moment (where it could have gone differently):
[_________________________________]

Why did it end?
[_________________________________]

What would you do differently?
[_________________________________]

Did your sticking point show up? [Yes/No]
If yes: [_________________________________]

What are you not admitting to yourself?
[_________________________________]

Key takeaway:
[_________________________________]

[🤖 Get AI Analysis]

[Done ✓]
```

**AI Analysis output (after button click):**
```
─── AI ANALYSIS ────────────────────
Strengths: ...
Growth areas: ...
Suggested focus for next session: ...
Pattern alert: "You've mentioned [X] 5 times this month"
────────────────────────────────────
```

**Anti-pattern check:**
- ✅ All detail fields optional
- ✅ Conversation shown by default (key differentiator)
- ✅ AI analysis on-demand, not forced
- ✅ Pattern alerts provide value from historical data

---

### TEMPLATE 4: Customizable

**Purpose:** Full question library for power users who want maximum depth.
**Tagline:** "Build your own reflection"
**When:** Users who want to pick specific questions, coaches, deep self-work

**Base Fields (from Deep Dive):**

| Order | Field | Type | Required | Notes |
|-------|-------|------|----------|-------|
| 1 | Mood | Emoji (😤😐😊🔥) | Yes | 1 tap |
| 2 | Approaches | Number | Yes | Manual entry |
| 3 | Intention/goal | Text | No | What were you trying to do? |
| 4 | Best moment | Text | No | Positive anchor |
| 5 | Conversation | Dialogue | No | Expandable |
| 6 | Technique practiced | Select (multi) | No | From taxonomy |
| 7 | 30 seconds before | Text | No | Lead-up to hinge moment |
| 8 | Hinge moment | Text | No | Decision point |
| 9 | Why did it end? | Text | No | Learning Q |
| 10 | Do differently? | Text | No | Action |
| 11 | Sticking point? | Toggle + text | No | Pattern tracking |
| 12 | Not admitting? | Text | No | Honest self-reflection |
| 13 | Key takeaway | Text | No | Synthesis |

**Additional Research-Based Questions (toggleable options):**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| Pre-session energy | Scale 1-5 | Poker/Trading journals | State before starting |
| What took courage? | Text | Sports psychology | Celebrates effort |
| What would you tell a friend? | Text | Self-compassion (Neff) | Reframing prompt |
| Automatic thought | Text | CBT thought diaries | What went through your mind? |
| Pattern repeating? | Text | Learning science | Self-driven pattern awareness |
| Confidence in assessment | Scale 1-5 | Metacognition research | Calibration check |
| What does this prove about you? | Text | Identity/self-efficacy | Breakthrough capture |

**Flow:**
```
[😤] [😐] [😊] [🔥]

Approaches: [___]

─── CORE QUESTIONS ─────────────────
What was your intention/goal for this session?
[_________________________________]

Best moment:
[_________________________________]

[+ Add conversation]

─── ANALYSIS ───────────────────────
What happened in the 30 seconds before the key moment?
[_________________________________]

The hinge moment (where it could have gone differently):
[_________________________________]

Why did it end?
[_________________________________]

What would you do differently?
[_________________________________]

─── OPTIONAL: RESEARCH QUESTIONS ───
[Toggle on/off which questions to include]

☐ Pre-session energy (1-5): [___]
☐ What took courage today?
  [_________________________________]
☐ What would you tell a friend who had this experience?
  [_________________________________]
☐ What automatic thought went through your mind when she responded?
  [_________________________________]
☐ What pattern do you notice repeating from previous sessions?
  [_________________________________]
☐ How confident are you in this self-assessment? (1-5): [___]
☐ What does this experience prove about you?
  [_________________________________]

─── REFLECTION ─────────────────────
Did your sticking point show up? [Yes/No]
If yes: [_________________________________]

What are you not admitting to yourself?
[_________________________________]

Key takeaway:
[_________________________________]

[🤖 Get AI Analysis]

[Done ✓]
```

**User can save their preferred question set as a personal template.**

**Anti-pattern check:**
- ✅ All questions optional and toggleable
- ✅ Users pick what resonates, skip what doesn't
- ✅ Research-grounded options with clear sources
- ✅ Can be as minimal or comprehensive as desired

---

### MODULAR ADD-ON: Conversation Module

**Purpose:** Reusable conversation capture that can expand in any template.
**Behavior:** Collapsed by default in Quick/Standard, expanded in Deep Dive.

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Turns | Array of {speaker, text} | Me/Her alternating |
| Context | Text (1 line) | Where, her vibe, etc. |

**Expand button text by template:**
- Quick Log: "+ Add conversation"
- Standard: "+ Add conversation for AI analysis"
- Deep Dive: (Pre-expanded, no button needed)

---

### WILD CARD FEATURES (v1)

#### 1. Pattern Alerts

**Trigger:** After submitting any report
**Logic:** Check last 30 days of reports for repeated keywords/patterns
**Display:**

```
💡 Pattern noticed: You've mentioned "ran out of things to say"
   in 4 of your last 10 reports.

   Suggested focus: Making statements instead of questions.
   [Dismiss] [Add to sticking points]
```

**Implementation notes:**
- Simple keyword matching initially (interview, ran out, awkward silence, etc.)
- Upgrade to semantic similarity later
- Only show if pattern appears 3+ times in 30 days

#### 2. Voice Capture

**Trigger:** Button on any template
**Flow:**

```
[🎙️ Record voice note]

↓ (user records while walking home)

[Transcribing...]

↓ (AI transcription)

[Review transcript]
"I just did a set with this blonde girl near Magasin.
 She was walking fast but I stopped her with a front stop.
 The conversation went well at first..."

[✓ Use this] [Edit] [Discard]

↓ (if approved, populates relevant fields)

Best moment: "Front stop worked well, she hooked immediately"
Why ended: "She said she had a boyfriend after 5 minutes"
Key takeaway: "Front stops work better than side approaches"
```

**Implementation notes:**
- Use Whisper API or similar for transcription
- AI extracts key fields from transcript
- User can edit before submitting

---

### IMPLEMENTATION CHECKLIST

**Database:**
- [ ] Update `field_report_templates` table with final specs (4 templates)
- [ ] Add `conversation_turns` table for structured dialogue
- [ ] Add `pattern_keywords` table for pattern tracking
- [ ] Add `user_template_preferences` for Customizable template saved configs

**UI Components:**
- [ ] Update Quick Log template fields (added intention/goal)
- [ ] Update Standard template fields (added intention/goal)
- [ ] Update Deep Dive template fields (added intention/goal, 30 seconds before, not admitting)
- [ ] Create Customizable template with toggleable research questions
- [ ] Create Conversation Module component (expandable)
- [ ] Create Pattern Alert component
- [ ] Create Voice Capture component

**Backend:**
- [ ] Pattern detection service (keyword matching)
- [ ] Voice transcription integration
- [ ] AI analysis prompt for conversations
- [ ] Save/load user's Customizable template preferences

**Future (not v1):**
- [ ] On This Day memories feature
- [ ] Approach location map
- [ ] Semantic pattern matching (upgrade from keywords)

---

### ANTI-PATTERN VERIFICATION

| Anti-Pattern | Status | How We Avoid It |
|--------------|--------|-----------------|
| Required essays | ✅ Avoided | All text fields optional |
| "What went wrong?" | ✅ Avoided | Use "do differently" instead |
| Leaderboards | ✅ Avoided | Not implemented |
| Punitive streaks | ✅ Avoided | Forgiving streaks (future) |
| Public by default | ✅ Avoided | All private |
| Too many required | ✅ Avoided | Only mood + count required |
| Clinical tone | ✅ Avoided | Natural language prompts |
| Forced daily | ✅ Avoided | Per-session, flexible |

---

## STATUS: ✅ APPROVED (30-01-2026)

**Approved specs:**
- 4 templates: Quick Log / Standard / Deep Dive / Customizable
- Hybrid flow: Emoji → Facts → Analysis
- "Intention/goal" question added to ALL templates (enables AAR comparison)
- Conversation writeup: Optional in all, emphasized in Deep
- Wild cards v1: Pattern alerts + voice capture
- Customizable template includes all 10 research-backed questions as toggleable options

**Updates (30-01-2026):**
- Added "What was your intention/goal?" to all templates
- Added "What happened 30 seconds before?" to Deep Dive
- Added "What are you not admitting to yourself?" to Deep Dive
- Created Template 4: Customizable with full research question library

**Next steps:** Implementation per checklist above.
