# Inner Game Backlog
**Updated:** 2026-01-28 17:20

Ideas parking lot for Inner Game features. Each entry has enough context to revive later.

---

## Integration Features (Depends on Other Slices)

### Value-Aware Q&A Coaching
**Idea:** Inject user's core values into Q&A system prompt for personalized advice. E.g., "Based on your value of Courage, here's how to handle that situation..."

**Why it's good:** Makes coaching feel personal; increases relevance of advice

**Blockers:**
- Should be premium feature (business model decision)
- Need to test Ollama's ability to weave values naturally
- Q&A slice needs modification

**Revisit when:** Q&A improvements planned, premium tier defined

**Files affected:** `src/qa/qaService.ts`, `src/qa/prompt.ts`

---

### Values Journal Integration
**Idea:** Weekly micro-check-ins tied to values: "Rate how well you lived [VALUE] this week (1-5)"

**Why it's good:** Creates ongoing engagement with values; tracks growth over time

**Dependency:** Part of broader Journaling feature (separate slice)

**Revisit when:** Journaling slice is being built

**Note:** Values section of journaling could be "unlocked" after completing Inner Game journey

---

### Pre-Session Check-in
**Idea:** Quick alignment ritual before going out: "What value will you embody today? What's one specific thing you'll do?"

**Why it's good:** Connects values to action; creates accountability

**Category:** This is a PREPARATION feature, not Inner Game proper. Should be its own slice.

**Revisit when:** Feature categorization complete; after Inner Game improvements

**Design notes:**
- Quick (30 seconds)
- Shows user's top value
- Captures one commitment
- Stores for post-session comparison

---

### Post-Session Value Reflection
**Idea:** After sessions, reflect on whether values were lived: "Did you embody Courage today?"

**Why it's good:** Closes the loop; builds self-awareness

**Dependency:** Part of Journaling / Infield Reports feature

**Revisit when:** Journaling slice is being built

---

## Advanced Features (Future Exploration)

### Belief Audit System
**Idea:** Identify limiting beliefs that block values. Map belief-value conflicts. Offer reframes.

**Why it's good:** Values are aspirational; beliefs are the actual operating system. This addresses root causes.

**Complexity:** High
- Need to test Ollama's belief analysis capability
- Could be static (rules-based) + AI enhancement
- Premium feature candidate

**Approach:**
1. Build static version first (common beliefs list, predefined conflicts)
2. Add Ollama for personalized analysis
3. Premium = Claude API for deeper insight

**Revisit when:** Inner Game core improvements done; Ollama tested

---

### Values-Based Scenario Practice
**Idea:** Generate practice scenarios that specifically test user's core values.

**Why it's good:** Connects Inner Game to Practice features; personalized challenges

**Dependency:** Scenarios slice must exist

**Revisit when:** Scenarios feature is being built

---

### Coach Wisdom Library
**Idea:** Index all transcribed coach content by value. When user clicks "Courage", show relevant clips/quotes.

**Why it's good:** Connects values to real coaching; depth of content

**Blockers:**
- Need content processing pipeline
- Copyright considerations (short quotes + links = OK)
- RAG retrieval setup

**Revisit when:** Training data pipeline complete; article strategy defined

---

### Value Conflict Deep-Dives
**Idea:** When user's values conflict (Freedom vs Connection), provide in-depth exploration, not just resolution tips.

**Why it's good:** Real self-understanding comes from grappling with tensions

**Note:** Basic conflict resolution is in Active plan. This is the DEEP version.

**Revisit when:** Basic conflicts implemented; content library built

---

### Value Evolution Tracking
**Idea:** Track how values shift over time. Prompt re-evaluation every 3-6 months. Show journey.

**Why it's good:** Values do change as people grow; this captures the arc

**Revisit when:** Users have been using Inner Game for 3+ months

---

### Community Accountability
**Idea:** Match users with similar values for peer accountability (optional)

**Why it's good:** External accountability works; community builds retention

**Dependency:** Community features must exist

**Revisit when:** Community/social features planned

---

## Content Ideas

### SEO Article Strategy
**Idea:** Write articles with quotes from transcribed videos + links. Covers values, mindset, specific techniques.

**Why it's good:**
- Drives organic traffic
- Proper attribution (fair use)
- Internal links to features

**Format:**
- Title targeting search query
- Your written content + analysis
- Short quote from coach + link to video
- Internal link to relevant feature

**Revisit when:** Content calendar planned

---

### Anti-Values Feature
**Idea:** Explicitly name what you reject (opposite of values). "I will NEVER be [X]"

**Why it's good:** Defines boundaries; complements positive values

**Revisit when:** Core Inner Game flow solid; looking for depth additions

---

## Notes from Jonas (2026-01-28)

- Journaling feature should have journal prompts for daily/weekly/post-infield that users can choose from → valuable standalone feature + SEO opportunity
- Feature categories: Discovery (Inner Game) | Practice (Scenarios, Cold Approach) | Preparation (Pre-Session) | Reflection (Journaling, Infield Reports) | Learning (Q&A, Articles)
- Values reminder is part of pre-session check-in, not separate
- Role models: 5 daygamers + 10 broader figures with highlights/quotes
- General wisdom on value conflicts is useful—doesn't need to be all daygame-specific
- "Quick wins" framing not important—focus on best long-term product
