# Plan: Progressive Commitment for Article Workflow

**Status:** ✅ Implemented
**Created:** 01-02-2026
**Updated:** 05-02-2026 - Added Phase 1a/1b contract ideation workflow
**Owner:** Complete

## Changelog
- 05-02-2026 - Added Phase 1a/1b: contract ideation before lock. Claude must present building blocks as options, editor assembles. Prevents Claude from unilaterally deciding article direction.
- 01-02-2026 - Implementation complete (all 7 steps done)
- 01-02-2026 - Open questions answered, plan finalized

---

## Problem

Articles drift as alternatives are generated. Title, structure, and content lose coherence because there's no enforced checkpoint where decisions get locked.

## Solution: Progressive Commitment

Lock decisions in phases. Structure changes require explicit "unlock" action.

---

## Phases

| Phase | What's Defined | What's Locked | Can Edit |
|-------|----------------|---------------|----------|
| **1a. Contract Ideation** | Building blocks explored as options | Nothing | Everything |
| **1b. Contract Lock** | Title, thesis, target reader, must-include | Nothing → Contract | Everything → Contract locked |
| **2. Outline** | Section purposes (what each section accomplishes) | Contract | Outline, prose |
| **3. First Draft** | Actual prose | Contract | Structure, prose |
| **4. Refinement** | Feedback iterations | Contract + Structure | Prose only |

### Phase 1a → 1b: Contract Ideation Workflow

**The problem this solves:** Claude tends to propose a single finished contract and immediately start drafting. This skips the most valuable part — the editor picking from genuinely different options and assembling the contract modularly.

**Phase 1a (Ideation) — `contract.status: "ideation"`:**

Claude presents building blocks **separately**, not as a finished contract:

- **Thesis:** 3-4 genuinely different angles (not variations on same sentence)
- **Title:** 3-4 options that match different thesis angles
- **Research pieces:** Available facts with recommendation on include/exclude, but editor decides
- **Structure:** 2-3 structural approaches (e.g. "convergence argument as centerpiece" vs "practical framework first" vs "single extended analogy")
- **Tone:** Direction options if relevant

The editor picks and combines modularly — "thesis B, title A, include this research but not that, structure C." Claude generates new variations based on editor picks if needed. This loops until editor is satisfied.

**Phase 1b (Lock) — `contract.status: "locked"`:**

Editor explicitly locks the assembled contract. `contractLockedAt` timestamp set. Only then does Phase 2 become available.

**CRITICAL CONSTRAINT:** Claude must NEVER:
- Lock a contract without the editor explicitly requesting it
- Write a draft while contract status is "ideation"
- Pick a single direction instead of presenting options
- Skip ideation and jump straight to a locked contract + draft

During Phase 1a, Claude's role is to **generate variations and options**. The editor assembles. Claude does not pick a direction.

---

**Key insight (Phase 4):** After Phase 4 begins, changing structure requires explicit "Unlock Structure" action that:
1. Logs why the unlock was needed
2. Resets to Phase 2 (outline review)
3. Preserves prose as reference but marks it "outdated"

---

## Data Model Changes

### Update `manifest.json` schema:

```typescript
interface ArticleManifest {
  // Existing fields...

  // NEW: Progressive commitment
  phase: 1 | 2 | 3 | 4
  phaseLocks: {
    contractLockedAt?: string      // ISO timestamp
    structureLockedAt?: string     // ISO timestamp
  }

  // NEW: Contract (Phase 1)
  contract: {
    status: "ideation" | "locked"  // Must be "locked" before Phase 2
    title: string
    thesis: string                 // One sentence: the core claim
    targetReader: string           // Who is this for?
    mustInclude: string[]          // Non-negotiable points
    mustNotInclude: string[]       // Explicit scope boundaries
    tone: string                   // e.g., "Scientific third-person"
  }

  // NEW: Outline (Phase 2)
  outline: {
    sections: Array<{
      id: string
      purpose: string              // What this section must accomplish
      notes?: string               // Optional guidance
    }>
    lockedAt?: string
  }

  // NEW: Unlock history
  structureUnlocks: Array<{
    timestamp: string
    reason: string
    previousOutline: object        // Snapshot before unlock
  }>
}
```

---

## UI Changes

### 1. Phase indicator in header
Show current phase with visual progress: `[Contract] → [Outline] → [Draft] → [Refine]`

### 2. Phase-specific views

**Phase 1a (Contract Ideation):**
- Claude presents building blocks as separate options (thesis variants, title variants, research include/exclude, structure approaches)
- Editor picks and combines modularly
- Claude generates new variations based on editor's selections
- Loops until editor is satisfied
- No "Lock" button visible yet — only "I'm happy with this, lock it"
- No access to prose editing
- `contract.status: "ideation"`

**Phase 1b (Contract Lock):**
- Editor reviews assembled contract
- "Lock Contract & Continue" button
- `contract.status: "locked"`, `contractLockedAt` timestamp set
- No access to prose editing

**Phase 2 (Outline):**
- Display locked contract (read-only, collapsible)
- Outline editor: add/edit/reorder section purposes
- "Lock Outline & Start Draft" button

**Phase 3 (First Draft):**
- Display locked contract (collapsed)
- Display outline as reference sidebar
- Full prose editor
- "Structure looks good, begin refinement" button (locks structure)

**Phase 4 (Refinement):**
- Current feedback UI
- Structure is READ-ONLY
- Red "Unlock Structure" button (requires reason, resets to Phase 2)

### 3. "Unlock Structure" flow
```
[Click Unlock]
  → Modal: "Why does the structure need to change?"
  → Text input (required)
  → Warning: "This will reset to Phase 2. Current prose will be preserved but marked outdated."
  → [Cancel] [Unlock & Reset]
```

### 4. Unlock History Panel
- Visible in UI (collapsible section)
- Shows timestamp, reason, and previous outline for each unlock
- Helps user track how the article evolved

---

## Claude Behavioral Rules

### Phase 1a (Ideation) — CRITICAL

Claude must NEVER lock a contract or write a draft without the editor explicitly requesting it.

During ideation, Claude's job is to **generate options**, not make decisions:
- Present building blocks separately (thesis, title, research, structure, tone)
- Offer 3-4 genuinely different variants per building block
- When editor picks from options, generate refined variants based on their selections
- Do NOT assemble a final contract — the editor does that
- Do NOT write prose while `contract.status` is `"ideation"`
- Do NOT skip ideation by presenting a single "recommended" contract

**What "genuinely different" means:** Not the same idea reworded three ways. Different angles, different emphases, different structural choices. If all 3 thesis options say the same thing in different words, that's not ideation — that's polish.

### Phase 4 (Refinement)

When processing feedback in Phase 4:
1. Read contract and check alternatives against it
2. If alternative would violate contract → generate with warning banner (not hard block)
3. If alternative would require structure change → note this in output, suggest unlock

Add to revision prompt:
```
CONSTRAINTS (from article contract):
- Thesis: {contract.thesis}
- Must include: {contract.mustInclude}
- Must NOT include: {contract.mustNotInclude}
- Tone: {contract.tone}

Your alternatives MUST serve the thesis and stay within scope.
If the feedback suggests the structure itself is wrong, say so explicitly
rather than generating alternatives that violate the contract.
```

---

## File Changes Required

| File | Change |
|------|--------|
| `src/articles/types.ts` | Add phase, contract, outline types |
| `docs/articles/*/manifest.json` | Migrate to new schema |
| `app/test/articles/page.tsx` | Add phase UI, unlock flow |
| `src/articles/articlesService.ts` | Add contract validation to revision |
| `app/api/test/articles/route.ts` | Handle phase transitions |

---

## Migration for Existing Articles

Existing articles (like 80/20) start at Phase 4 with:
- Contract: inferred from current title/content (human review needed)
- Outline: inferred from current sections
- `structureLockedAt`: migration timestamp

---

## Implementation Order

1. **Types first** - Define the full schema in `types.ts`
2. **Manifest migration** - Update existing article to new format
3. **Phase indicator UI** - Visual feedback on current phase
4. **Contract form** - Phase 1 UI
5. **Outline editor** - Phase 2 UI
6. **Phase transitions** - Lock buttons, unlock flow
7. **Revision integration** - Claude checks contract during alternatives

---

## Decisions (Answered 01-02-2026)

| Question | Decision |
|----------|----------|
| Contract authorship | Claude generates building block options, editor assembles. Claude never picks direction. |
| Contract ideation flow | Phase 1 split into 1a (ideation) and 1b (lock). Claude cannot draft while in 1a. |
| "Must include" enforcement | Warning only (not hard block) |
| Unlock history visibility | Visible in UI |

---

## Handover Notes

**Context:** User wants to reduce drift in article iterations. We discussed 3 approaches; user chose Progressive Commitment (Option 3) with explicit unlock for structure changes.

**What exists now:**
- Article feedback UI at `app/test/articles/page.tsx`
- Manifest schema at `src/articles/types.ts` (needs extension)
- One article in progress: `docs/articles/01-8020-rule/`

**What to build:**
- The phased workflow described above
- Start with types and manifest migration
- Then build UI phase by phase

**User preference:** They want the ability to change structure, but it should feel like "breaking glass" - deliberate, logged, and resets progress. The normal flow should guide toward refinement, not restructuring.

**Do NOT:**
- Over-engineer the unlock flow (simple modal is fine)
- Add more phases than described
- Make contract fields optional (the whole point is forcing upfront decisions)
