# Field Report Templates - Design Discussion
**Status:** NEEDS DECISION - What fields go in each template?
**Updated:** 30-01-2026

## Changelog
- 30-01-2026 22:15 - Added 7-phase ideation plan (multi-perspective exploration)
- 30-01-2026 22:00 - Corrected status: template CONTENT not finalized, pre-session prompts already working
- 30-01-2026 21:30 - Round 3 discussion (4-template structure proposed, NOT validated)
- 30-01-2026 - Round 2: Over-indexed on differentiation
- 30-01-2026 - Round 1: Initial generic proposal

---

## Current State

### What's DONE
- **Research:** 1,600+ lines across 9 files (sports psych, military AAR, CBT, habit science, etc.)
- **25 design principles** extracted in [DESIGN.md](../research/FIELD_REPORTS/DESIGN.md)
- **Pre-session prompts:** Already working (session_focus, technique_focus, if_then_plan, custom_intention)
- **UI infrastructure:** FieldReportPage, FieldRenderer, template selection UI
- **4 template shells in DB:** quick-log, standard, deep-dive, blowout (with placeholder fields)

### What's NOT DONE
- **Template field content** - The actual questions/fields in each template are placeholders
- **Template count/structure** - 4-template structure was PROPOSED, not validated by user
- **Naming** - Current names may not be optimal

---

## Key Discussion Points (Unresolved)

### 1. How many templates?
Research suggests 4 maps to different user states:
| Template | User State |
|----------|------------|
| Quick Log | "Routine session, nothing special" |
| Standard | "Solid session, want to learn" |
| Deep Dive | "Something significant happened" |
| Blowout | "Got wrecked, need to process" |

**Question:** Is this the right split? More? Fewer?

### 2. What goes in each template?
Research DESIGN.md proposes structures, but actual fields need user sign-off.

### 3. Blowout as standalone vs add-on?
Could be a separate template OR optional fields in other templates.

---

## Template Content Principles (From Research)

1. **Emotion before analysis** - Ask how they felt first
2. **The critical question** - "Why did it end?" is central
3. **Complete the learning cycle** - Every template needs insight → action
4. **Balance positive and negative** - Wins matter for future performance
5. **Match depth to situation** - Right tool for right moment

---

## Ideation Plan: Multi-Perspective Exploration

Rather than mixing all research at once, explore field report ideas through distinct lenses. Each phase generates proposals, then we synthesize.

### Phase 1: Habit Science Lens
**Source:** `research/habit_science.md`
**Core question:** How do we make field reports stick as a habit?

Focus areas:
- BJ Fogg's B=MAP (Behavior = Motivation × Ability × Prompt)
- Friction reduction - what's the minimum viable report?
- Habit stacking - tie report to existing post-session routine
- Tiny habits - what's the 2-minute version?
- Reward/celebration - how does completing feel?

**Output:** Propose fields optimized for consistency over depth.

---

### Phase 2: Military AAR Lens
**Source:** `research/military_aar.md`
**Core question:** What structure extracts maximum learning?

Focus areas:
- The 4 AAR questions (What was supposed to happen? What happened? Why? What do we do now?)
- Intended vs actual comparison
- "Sustain and Improve" framework
- No-blame culture - how questions are framed
- Action-oriented closure

**Output:** Propose fields optimized for tactical learning.

---

### Phase 3: Sports Psychology Lens
**Source:** `research/sports_psychology.md`
**Core question:** How do elite performers debrief?

Focus areas:
- Well-Better-How framework
- 3-2-1 format (3 things well, 2 to improve, 1 focus)
- Emotional state before/during/after
- Process vs outcome focus
- Celebrating effort, not just results

**Output:** Propose fields optimized for performance mindset.

---

### Phase 4: CBT & Self-Compassion Lens
**Source:** `research/cbt_journaling.md`, `research/psychology_research.md`
**Core question:** How do we process emotionally without ruminating?

Focus areas:
- Cognitive distortion detection (all-or-nothing, catastrophizing)
- "What would you tell a friend?" reframe
- Common humanity - normalizing failure
- Rumination circuit breakers (time limits, action requirements)
- Expressive writing for emotional release

**Output:** Propose fields optimized for tough sessions / blowout recovery.

---

### Phase 5: Learning Science Lens
**Source:** `research/learning_science.md`
**Core question:** How do we accelerate skill acquisition?

Focus areas:
- Kolb's learning cycle (experience → reflect → conceptualize → experiment)
- Deliberate practice - connecting to skill focus
- Spaced retrieval - resurfacing past insights
- Near-miss analysis - learning from almost-wins
- The "critical 3 minutes" before failure

**Output:** Propose fields optimized for deep skill development.

---

### Phase 6: Community Feedback Lens
**Source:** `research/community_feedback.md`
**Core question:** What do actual daygamers say they need?

Focus areas:
- What fields do people actually fill out?
- What gets skipped?
- What insights do experienced guys wish they'd tracked?
- Common complaints about existing tracking tools

**Output:** Reality-check proposals against user preferences.

---

### Phase 7: Synthesis
Combine outputs from phases 1-6:
- Identify overlapping recommendations
- Resolve conflicts (e.g., habit science says "less" but learning science says "more")
- Map fields to templates based on fit
- Finalize field list per template

---

## Execution Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Habit Science | ⬜ Not started | |
| 2. Military AAR | ⬜ Not started | |
| 3. Sports Psychology | ⬜ Not started | |
| 4. CBT/Self-Compassion | ⬜ Not started | |
| 5. Learning Science | ⬜ Not started | |
| 6. Community Feedback | ⬜ Not started | |
| 7. Synthesis | ⬜ Not started | |