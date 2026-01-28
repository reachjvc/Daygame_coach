# Field Report Research Plan

## Objective
Design the optimal field report system that gives users the best options for documenting and learning from their sessions.

---

## Phase 1: Research & Discovery

### 1.1 Existing Field Report Frameworks
Research established field report formats from:
- **Daygame community sources**: RSD, Todd V, Tom Torero, Krauser PUA, James Marshall
- **Sports coaching**: Post-game analysis formats (what athletes track)
- **Journaling science**: What reflection methods actually improve performance
- **Learning theory**: Spaced repetition, deliberate practice documentation

### 1.2 Key Questions to Answer
1. What do experienced practitioners actually write down vs. what beginners think they should?
2. Which fields lead to measurable improvement over time?
3. What's the minimum viable data for useful pattern recognition?
4. How do detailed vs. sparse reports correlate with skill progression?
5. What emotional/internal states are worth tracking vs. noise?

### 1.3 Data Sources to Analyze
- [ ] Survey experienced users about their current tracking habits
- [ ] Analyze existing field report templates from forums/communities
- [ ] Review psychology literature on performance journals
- [ ] Look at how coaches structure debrief sessions

---

## Phase 2: Field Categories to Evaluate

### Essential Metrics (Objective)
| Field | Purpose | Priority |
|-------|---------|----------|
| Approach count | Volume tracking | High |
| Duration | Time investment | High |
| Location/venue | Pattern recognition | Medium |
| Outcomes (number/date) | Results tracking | High |
| Time of day | Optimal timing | Medium |

### Internal State (Subjective)
| Field | Purpose | Priority |
|-------|---------|----------|
| Pre-session mood/energy | Correlation with results | ? |
| Post-session mood | Emotional processing | ? |
| Anxiety level | Progress on fear | Medium |
| State/vibe rating | Calibration awareness | ? |
| Physical state (sleep, caffeine) | External factors | Low |

### Tactical/Skill-Based
| Field | Purpose | Priority |
|-------|---------|----------|
| Best approach details | Learning from wins | High |
| Sticking point encountered | Targeted improvement | High |
| What worked today | Positive reinforcement | Medium |
| What to try next time | Deliberate practice focus | High |
| Specific technique practiced | Skill isolation | Medium |

### Qualitative Reflection
| Field | Purpose | Priority |
|-------|---------|----------|
| Free-form notes | Capture insights | Medium |
| Key learning/insight | Distilled wisdom | High |
| Pattern noticed | Self-awareness | Medium |
| Mindset shift | Inner game tracking | ? |

---

## Phase 3: Template Design Principles

### Discovered Principles (To Be Filled In)
1. **Less is more**: Users who complete shorter reports consistently outperform those who abandon detailed ones
2. **?**: TBD from research
3. **?**: TBD from research

### Template Tiers
1. **Quick Log (30 sec)**: Just the numbers - approaches, numbers, duration
2. **Standard (2-3 min)**: Numbers + best moment + one insight
3. **Deep Dive (5-10 min)**: Full analysis with breakdown by approach
4. **Blowout Recovery**: Specialized for tough sessions (different fields)
5. **Custom**: User picks their own fields

### Field Type Considerations
- **Scales (1-5)**: Fast but lose nuance
- **Tags**: Quick categorization, good for filtering
- **Short text**: Capture specifics without overwhelm
- **Long text**: Only for key reflections
- **Numbers**: Objective, chartable
- **Multiple choice**: Consistent data, easy aggregation

---

## Phase 4: Custom Report Builder Requirements

### Core Features Needed
1. **Field Library**: All possible fields available to choose from
2. **Drag-and-drop ordering**: User prioritizes what matters to them
3. **Required vs. Optional**: Mark which fields they must fill
4. **Conditional fields**: Show X only if Y was answered
5. **Presets**: Save multiple custom templates for different situations

### Suggested Field Library Categories
```
BASIC STATS
├── Approach count
├── Number count
├── Duration (minutes)
├── Location
└── Time of day

OUTCOMES
├── Outcome breakdown (blowout/short/good/number/date)
├── Best outcome details
├── Lead quality rating
└── Follow-up planned

INTERNAL STATE
├── Pre-session mood (1-5)
├── Post-session mood (1-5)
├── Anxiety level (1-5)
├── Energy/state rating
└── Confidence level

TACTICAL
├── Opener used
├── Sticking point hit
├── Technique practiced
├── What worked
└── What to improve

REFLECTION
├── Key insight (short text)
├── Highlight of the session
├── Biggest challenge
├── Gratitude/win
└── Free notes

CONTEXT
├── Weather
├── Day of week
├── Solo vs. with wing
├── Wing name
└── Special circumstances
```

---

## Phase 5: Validation & Testing

### A/B Testing Ideas
- Compare completion rates across template lengths
- Track which optional fields get filled vs. skipped
- Correlate field usage with user retention
- Measure perceived value ratings post-report

### User Interviews
- What do they skip and why?
- What do they wish they could add?
- How do they use past reports (if at all)?
- What would make them report more consistently?

---

## Phase 6: Implementation Priorities

### MVP Custom Builder
1. Show all available fields in categories
2. Let user toggle fields on/off
3. Set field order with drag-and-drop
4. Save as custom template
5. Option to start from existing template

### Future Enhancements
- AI-suggested fields based on user's sticking points
- Smart defaults based on session type (day vs. night, solo vs. wing)
- Field recommendations based on experience level
- Export/share template with others

---

## Next Actions

1. [ ] Search daygame forums/blogs for example field reports
2. [ ] Review Tom Torero's "Daygame" book for his debrief method
3. [ ] Look at Todd V's recommended journaling structure
4. [ ] Research deliberate practice literature (Ericsson)
5. [ ] Survey 5-10 experienced users on what they track
6. [ ] Prototype the custom builder UI
7. [ ] Test with 3 users and iterate

---

## Notes & Ideas

*Space for ongoing thoughts as research progresses*

- Consider voice memos as an input method (transcribe to text)
- "Highlight reel" feature - save best approach from each session
- Pattern detection across reports ("you get more numbers when X")
- Weekly auto-summary generated from field reports
