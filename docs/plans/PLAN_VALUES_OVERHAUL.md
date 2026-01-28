# Plan: Comprehensive Values System Overhaul

## Problem Statement

The current values system has 222 values across 10 categories, but analysis revealed:
1. **18 values used by role models don't exist** in the master list (showing as grey/unmapped)
2. **Structural gaps** in the value system - missing entire domains relevant to daygame
3. **Potential bloat** - some values may be redundant or rarely resonate with users
4. **Category organization** may not be optimal

This isn't a "patch the 18 missing values" task - it's a fundamental review of whether our value system is complete, well-organized, and fit for purpose.

---

## Phase 1: Research & Analysis (COMPLETED)

### 1.1 External Validation - Compare Against Established Frameworks

Research these established personal values frameworks to identify gaps:

- [ ] **Schwartz Theory of Basic Values** (10 universal values, academically validated)
- [ ] **VIA Character Strengths** (24 character strengths, positive psychology foundation)
- [ ] **Rokeach Value Survey** (36 values - 18 terminal, 18 instrumental)
- [ ] **Barrett Values Centre** (organizational/personal values research)
- [ ] **Reiss Motivation Profile** (16 basic desires)

**Goal:** Create a master comparison table showing which of our values map to established frameworks, and which established values we're missing.

### 1.2 Domain-Specific Validation - Daygame/Dating Context

Review values emphasized in dating/social dynamics literature:

- [ ] Models by Mark Manson (authenticity, vulnerability, non-neediness)
- [ ] The Natural Lifestyles / James Marshall (presence, expression, adventure)
- [ ] RSD/Owen Cook materials (self-amusement, entitlement, intent)
- [ ] Todd V methodology (calibration, charisma, social intelligence)

**Goal:** Ensure values critical to the daygame context are represented.

### 1.3 Current Usage Analysis

- [ ] Review which values users actually select in the Values Step
- [ ] Check which values appear in role models (our curated selection)
- [ ] Identify values that are never/rarely selected (candidates for removal)

---

## Phase 2: Gap Analysis

### 2.1 The 18 Role Model Values - Resolution

| Value | Resolution | Rationale |
|-------|-----------|-----------|
| adventure | **ADD** | Distinct from exploration - thrill-seeking quality |
| authenticity | **ADD** | Critical gap - being genuine to self |
| charisma | **ADD** | Magnetic quality, core to social attraction |
| charm | **ADD** | Pleasant manner, distinct from charisma |
| directness | **REPLACE with Candor** | Same meaning, Candor already exists |
| experimentation | **ADD** | Trial-and-error distinct from exploration |
| hustle | **ADD** | Scrappy urgency, distinct from hard work |
| influence | **ADD** | Broader than leadership, softer power |
| ownership | **KEEP BOTH with Accountability** | People resonate with different words |
| presence | **ADD** | Commanding attention, distinct from "present" (mindfulness) |
| reinvention | **ADD** | Dramatic transformation, distinct from growth |
| resilience | **ADD** | Bouncing back, distinct from endurance |
| self-expression | **REPLACE Expressive** | Better wording, same meaning |
| self-honesty | **ADD** | Inward-facing honesty, distinct from honesty to others |
| self-improvement | **EVALUATE** | May be redundant with Growth/Development |
| style | **ADD** | Personal aesthetic, relevant to first impressions |
| wit | **ADD** | Clever humor, missing entirely |
| action | **ADD** | Bias toward doing, distinct from decisive |

### 2.2 Identified Structural Gaps

**Gap 1: Social Magnetism / Attraction**
- Current SOC category = giving to others (generosity, kindness)
- Missing = drawing others in (charisma, charm, wit, presence)
- **Decision needed:** Add to existing category or create new one?

**Gap 2: Self-Authenticity**
- Current ID category = self-worth, confidence
- Missing = being genuine (authenticity, self-honesty)
- **Decision needed:** Add to ID or create new category?

**Gap 3: Adventure / Transformation**
- Current GROW = steady learning
- Missing = thrill-seeking, dramatic change (adventure, reinvention)
- **Decision needed:** Add to GROW or to FREE?

### 2.3 Potential Bloat - Values to Consider Removing

Review for redundancy or low resonance:
- [ ] Careful vs Thorough (redundant?)
- [ ] Decisive vs Decisiveness (same word, different form)
- [ ] Ferocious (too aggressive for most?)
- [ ] Lawful (too formal/legal?)
- [ ] Famous vs Recognition (redundant?)
- [ ] Skillfulness vs Skill (same concept)
- [ ] Clever vs Smart vs Intelligent (three words for same thing?)
- [ ] Traditional (relevant to daygame context?)

---

## Phase 3: Restructuring Decisions

### 3.1 Category Review

Current categories (10):
1. DISC - Discipline, Structure & Performance
2. DRIVE - Courage, Drive & Intensity
3. EMO - Emotional Regulation & Inner State
4. ETH - Ethics, Integrity & Moral Compass
5. FREE - Freedom, Power & Independence
6. GROW - Growth, Learning & Mastery
7. ID - Self-Worth & Identity
8. PLAY - Play, Expression & Vitality
9. PURP - Purpose, Vision & Meaning
10. SOC - Connection, Love & Belonging

**Options to consider:**

**Option A: Keep 10 categories, redistribute**
- Add magnetism values to PLAY (rename to "Play, Expression & Magnetism"?)
- Add authenticity values to ID
- Add adventure/reinvention to GROW or FREE

**Option B: Create 11th category for Social Presence**
- New category: PRES - Presence, Charisma & Social Magnetism
- Contains: charisma, charm, wit, presence, style, influence
- Keeps attraction-related values distinct from connection-related (SOC)

**Option C: Major restructure**
- Combine some categories, split others
- Requires significant UI/UX changes

### 3.2 Naming Conventions

Decide on consistent naming:
- Noun vs adjective (Creativity vs Creative, Honesty vs Honest)
- Single words vs compound (Self-reliance, Self-expression, Self-honesty)
- Current list is inconsistent - standardize?

---

## Phase 4: Implementation

### 4.1 Update Master Values List
- [ ] Add approved new values to `src/inner-game/config.ts`
- [ ] Remove approved redundant values
- [ ] Ensure consistent naming

### 4.2 Update Role Models
- [ ] Replace deprecated values in `src/inner-game/data/roleModels.ts`
- [ ] Verify all role model values now exist in master list

### 4.3 Update Value Inference Logic
- [ ] Review `src/inner-game/modules/valueInference.ts`
- [ ] Ensure new values can be inferred from user input

### 4.4 Database Migration (if needed)
- [ ] If values are renamed/removed, migrate user data
- [ ] Handle users who previously selected removed values

### 4.5 Testing
- [ ] Values Step displays all values correctly
- [ ] Role Models page shows proper colors for all values
- [ ] No orphaned values in user data

---

## Decision Points for User

Before implementation, need decisions on:

1. **New category or not?** Should we create an 11th category for social magnetism values?

2. **Naming convention?** Should we standardize to nouns, adjectives, or allow mix?

3. **Scope of external research?** How thorough should Phase 1 be before we proceed?

4. **Value removal threshold?** What criteria for removing values (redundancy, low usage)?

---

## Files Affected

- `src/inner-game/config.ts` - Master values list and categories
- `src/inner-game/data/roleModels.ts` - Role model value assignments
- `src/inner-game/modules/valueInference.ts` - Inference logic
- `app/test/role-models/page.tsx` - Role models display
- `src/inner-game/components/ValuesStep/` - Values selection UI
- Potentially: database migrations for user data

---

## Status

- [x] Problem identified
- [x] Initial analysis complete
- [ ] Phase 1: External research
- [ ] Phase 2: Gap analysis finalization
- [ ] Phase 3: Restructuring decisions
- [ ] Phase 4: Implementation
