# Pipeline Audit Template (Audit-Only)

**Purpose:** Produce a reviewable audit of pipeline files, inconsistencies, and cleanup candidates. No code changes. No refactors.

**Agent:**
**Date:**
**Scope:**

## 1) Summary
- One-paragraph executive summary.
- Top 3 risks or inconsistencies.
- Highest-leverage cleanup wins.

## 2) Canonical Pipeline Map (As Found)
- Stage list with script path, inputs, outputs.
- Orchestration entry points used (batches, sub-batch, final_pipeline, etc.).

## 3) File Inventory (In Scope)
- List key files grouped by category:
- Stage scripts
- Orchestrators
- Schemas
- Prompts
- Verification tools
- Docs
- Data manifests and batch files

## 4) Inconsistencies and Drift
- Stage numbering mismatches
- Docs vs code conflicts
- Missing stage coverage in runners
- Output path mismatches
- Unused or orphaned assets

## 5) Stale/Orphaned Files (Proposed)
- Keep
- Delete
- Needs review

## 6) Verification Coverage Gaps
- Stages missing deterministic checks
- Stages missing LLM review prompts
- Missing cross-stage validations

## 7) Cleanup Recommendations (Ordered)
- Minimal-risk sequence of actions
- What to validate after each action

## 8) Open Questions
- Any assumptions that need confirmation
- Decisions that must be made by the user
