# CLAUDE.md - READ THIS FIRST
**Updated:** 28-01-2026 08:47

This file contains rules that AI assistants MUST follow when working on this project.

---

## CRITICAL: Pause Before Risky Actions

Before performing any MEDIUM or HIGH risk action, you MUST:
1. Explain what you are about to do
2. Explain why it might be risky
3. Wait for explicit user confirmation

### Risk Levels

| Risk | Actions | Why It's Risky |
|------|---------|----------------|
| **LOW** | Creating empty folders, creating type files, writing documentation | Easily undone, no side effects |
| **MEDIUM** | Setting up package.json, configuring Next.js, database connection setup, auth/security setup, creating API routes | Wrong config = bugs or security holes later |
| **HIGH** | Anything touching production data, environment variables with secrets, modifying Supabase schema, deleting files | Could corrupt data or expose secrets |

### How to Ask for Confirmation

Say something like:
> "I'm about to [ACTION]. This is MEDIUM risk because [REASON]. Should I proceed?"

Do NOT proceed with MEDIUM/HIGH risk actions without explicit "yes" from the user.

---

## Project Overview

This is a daygame coaching platform. Core features:
- **Q&A Coach** - Users ask questions, get answers grounded in training data with confidence scores
- **Scenarios** - Practice scenarios (future)
- **XP/Levels** - Gamification (future)

---

## Architecture Rules (MUST FOLLOW)

### 1. Vertical Slices
Every feature is built end-to-end:
```
UI -> API Endpoint -> Service Layer -> DB/External Services -> Tests
```

Each slice lives in `/src/{slice-name}/` with everything it needs.

### 2. Thin API Route Handlers
Files in `app/api/*` MUST only do:
- Auth check
- Subscription gate
- Validate request body
- Rate limit
- Call service function
- Log outcome
- Return response JSON

Route handlers MUST NOT contain:
- Retrieval logic
- Prompt building
- Confidence scoring
- Direct LLM calls

### 3. Service Layer
Business logic lives in `src/{slice}/service.ts`. Example: `src/qa/qaService.ts`

### 4. Isolated Modules
Each slice has isolated modules:
- `src/qa/retrieval.ts` - Vector search (only place that does retrieval)
- `src/qa/prompt.ts` - Prompt building (only place that builds prompts)
- `src/qa/confidence.ts` - Confidence scoring
- `src/qa/providers/*.ts` - LLM providers (ollama, openai, claude)

### 5. Database Access Through Repos
All database queries go through `src/db/*.ts` repositories.
NO raw Supabase queries in services or UI.

### 6. Security Built Into Each Slice
Every LLM endpoint MUST include:
- Auth required
- Premium required
- Input validation
- Per-user rate limiting
- Request logging
- Prompt injection defense

---

## Folder Structure

```
daygame-coach/
├── app/                    # Next.js routing (thin wrappers only)
│   ├── api/                # API routes
│   ├── dashboard/          # UI pages
│   └── auth/               # Auth pages
├── src/                    # ALL business logic
│   ├── qa/                 # Q&A slice
│   ├── scenarios/          # Scenarios slice
│   ├── auth/               # Auth slice
│   ├── profile/            # Profile slice
│   ├── onboarding/         # Onboarding slice
│   ├── admin/              # Admin slice
│   ├── db/                 # Database repositories
│   └── shared/             # Shared utilities
├── components/ui/          # Shared UI components
├── tests/                  # Tests organized by slice
├── docs/                   # Documentation
│   └── slices/             # Slice specifications
├── training-data/          # Training data pipeline
└── scripts/                # Processing scripts
```

---

## Q&A Response Contract

POST /api/qa MUST return:
```json
{
  "answer": "...",
  "confidence": { "score": 0.0-1.0, "factors": {...} },
  "sources": [...],
  "metaCognition": { "reasoning": "...", "limitations": "...", "suggestedFollowUps": [...] },
  "meta": { "provider": "...", "model": "...", "latencyMs": 0, "tokensUsed": 0 }
}
```

Do NOT remove or rename these fields.

---

## Commands That Must Work
```bash
npm run dev      # Start development server
npm run lint     # Run linter
npm run test     # Run tests
npm run build    # Production build
```

---

## When Making Changes

1. Identify which vertical slice is affected
2. List exact files to modify
3. Preserve request/response contracts
4. Update tests
5. Ensure lint + tests pass

Do NOT restructure unrelated parts of the codebase.

---

## Engineering Philosophy: Best Practice Over Shortcuts

**Always aim for best practice and the best method.** No easy ways out, except when there's a huge tradeoff or limited benefit.

The objective is to create the best possible product with no technical debt.

### Core Principles

1. **Quality over speed, ALWAYS** - It is NEVER a priority to build fast MVPs. The priority is doing things RIGHT, with no technical debt. 20 extra hours of work for a better result is always worth it.

2. **Best possible experience** - When building features, think about what would be the most fun, engaging, visually appealing version. If something could have animated cards, gamification, or rich visuals—do that, don't simplify.

3. **Clean architecture is non-negotiable** - Always consider clean architecture and vertical slicing. If something feels like it might create technical debt or doesn't fit the existing patterns, ASK before proceeding.

4. **Delete and recreate cleaner** - If a file/component needs significant changes, prefer deleting it and recreating it cleanly over patching it. Git history preserves the old version.

### Deprecated Files Policy

When files become unused:
1. Move them to `deprecated/YYYY-MM-DD/` folder (e.g., `deprecated/2026-01-28/`)
2. After 7 days without being called/used, they can be reviewed and deleted
3. Run periodic cleanup: check `deprecated/` folders older than 7 days and remove them

This allows a safety window for recovery while keeping the codebase clean.

### Specific Guidelines

- **Use the most accurate method** even if it's more complex (e.g., pyannote-audio for speaker diarization over simple pitch heuristics)
- **Prefer local processing** when quality is comparable (e.g., Ollama over cloud APIs for cost savings without quality loss)
- **Document trade-offs explicitly** when shortcuts are necessary
- **Build for the future** - data pipelines should support voice-to-voice even before that feature exists
- **Quality over speed** - a pipeline that takes 10 hours but produces excellent data beats a 1-hour pipeline with mediocre output
- **Never simplify for speed** - If a feature could have a rich UI (e.g., gamified character picker with 15 animated cards), build that, don't reduce to a text input

---

## CRITICAL: Documentation Structure (No Bloat)

**Living documents over point-in-time reports.** Don't create new files—update existing ones.

### Canonical Files (One Source of Truth)

| Topic | File | Purpose |
|-------|------|---------|
| AI rules | `docs/CLAUDE.md` | Rules, status, migration progress |
| Planning style | `docs/claude/planning_style.md` | How to structure plans |
| Feature specs | `docs/slices/SLICE_*.md` | One per feature slice |
| Training pipeline | `docs/data/PIPELINE.md` | Plan, status, test results, issues |
| Training data | `docs/data_docs/TRAINING_DATA.md` | Data sources, formats, quality |

### Document Structure Standard

Every planning/tracking doc MUST use this structure:
```markdown
# [Title]
**Status:** 🟢 ACTIVE | 🔴 BLOCKED | ✅ DONE
**Updated:** YYYY-MM-DD

## Current State
[What's the situation right now - 2-3 sentences max]

## Blockers (if any)
- [ ] Blocker 1: description

## Plan
### Phase N: [Name]
- [ ] Step with status

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|

## Test Results (if applicable)
[Consolidated results, not separate files]
```

### Anti-Bloat Rules

1. **NO separate files for**:
   - Test results → Add to the relevant plan doc
   - Issues found → Add to the relevant plan doc
   - Improvement plans → Update the existing plan, don't create a new one

2. **Consolidate aggressively**:
   - If two docs cover overlapping topics, merge them
   - Delete the old file after merging (don't leave orphans)

3. **When updating docs**:
   - Update in place, don't append endlessly
   - Replace outdated sections, don't add "UPDATE:" headers
   - Keep total length under 500 lines per doc (split if needed)

4. **Status over history**:
   - Current state is more important than changelog
   - Use git history for "what changed when"

5. **Always timestamp updates**:
   - Every doc MUST have `**Updated:** DD-MM-YYYY HH:MM` in header
   - Update this timestamp EVERY time you modify the file
   - Format: DD-MM-YYYY, 24-hour clock, Danish time (e.g., `28-01-2026 14:35`)

### Before Referencing Any Doc

**ALWAYS check the Status field first.** If a doc has:
- `⚠️ OUTDATED` or `⚠️ PARTIALLY OUTDATED` → Warn user, check for superseding doc
- `🔴 BLOCKED` → Note the blocker before proceeding
- `📦 ARCHIVED` → Do not reference as current information

If a doc says "See [other-doc] for current info" → Follow that reference instead.

### Cleanup Checklist (Run Periodically)
- [ ] Are there multiple docs about the same topic? → Merge
- [ ] Are there "results" files separate from plans? → Merge into plan
- [ ] Are there docs nobody reads? → Delete
- [ ] Is any doc >500 lines? → Split or summarize
- [ ] Are there docs with ⚠️ status >30 days old? → Fix or archive

---

## CRITICAL: Update Implementation Plans After Each Step

When working from an implementation plan (e.g., `docs/data/ai-implementation-plan.md`):

1. **After completing each step**, IMMEDIATELY update the plan to mark it complete
2. **Record decisions** made during the step (e.g., "Decision: Use llama3.2")
3. **Record any deviations** from the original plan
4. **Add timestamps** to completed steps

Format for completed steps:
```markdown
### Step X.X: [Title]
**Status:** ✅ COMPLETED (YYYY-MM-DD)
**Decision:** [What was decided]
**Artifacts:** [Files created/modified]
```

This is NON-NEGOTIABLE. Plans MUST reflect reality at all times.

---

## CRITICAL: Always Update Plans, Logs, and Tests

After any significant work, you MUST:
1. Update the active plan with checkmarks + timestamps
2. Update the relevant log (e.g., `docs/log`) with decisions and outcomes
3. Run required tests for the changes; if skipped, record why and any risk

This must happen automatically without waiting for user prompting.

---

## CRITICAL: Test Accuracy Before Recommending

**Read `docs/data/TESTING_PROTOCOL.md` before any pipeline recommendation.**

When evaluating LLM models, prompts, or strategies:
1. **Coverage ≠ Accuracy** - 100% coverage of wrong answers is worthless
2. **Create ground truth** - Manual annotation of 30+ segments
3. **Test ALL candidates** on same ground truth
4. **Meet thresholds** before recommending (see protocol for minimums)
5. **Never say "acceptable for MVP"** in pipeline work - we run all files ONCE

If accuracy is below threshold, DO NOT recommend. Investigate root cause first.

---

## CRITICAL: Never Skip Quality Improvements to "Just Proceed"

**Quality over progress.** NEVER skip improving a script, stage, or component just to move forward in a pipeline.

### The Anti-Pattern to Avoid
When you see poor results (e.g., "only 4/137 segments classified"), the WRONG response is:
- "This is acceptable because we can do a second pass later"
- "Let's proceed and fix it in post"
- "Good enough for now"

The RIGHT response is:
- **STOP and analyze** why the quality is poor
- **Investigate alternatives** (different prompts, models, chunking strategies)
- **Run comprehensive tests** before deciding
- **Document the root cause** and solutions tried
- **Only proceed** when quality meets the bar, OR when you've exhausted options and documented why

### Specifically for LLM/AI Pipeline Stages
These files (transcripts, training data) are the foundation of the entire product. Poor extraction = poor RAG = poor user experience. You MUST:

1. **Maximize extraction quality** - If an LLM only classifies 3% of segments, that's a failure to investigate, not an acceptable result
2. **Test multiple approaches** before settling (different prompts, chunk sizes, models, multi-pass strategies)
3. **Quantify the gap** - What's the theoretical maximum? What are we achieving? Why the delta?
4. **Never rationalize poor results** - "The topic extraction works" is not an excuse for 97% of segments being unclassified

### The Goal
Extract the **maximum possible value** from every source file. If a video has 10 teachable moments, we should capture 9-10 of them, not 2-3 and call it "acceptable."

This mindset applies to ALL stages:
- Transcription quality
- Speaker diarization accuracy
- Semantic analysis completeness
- Topic extraction depth
- Technique identification coverage
- Interaction boundary detection

**When in doubt, improve before proceeding.**

---

## Migration Status

**MIGRATION COMPLETE** - This is now the primary project.

The old project at `/home/jonaswsl/projects/v0-ai-daygame-coach/` is deprecated and kept only for reference.

### Completed
- [x] Folder structure created
- [x] package.json with dependencies (trimmed)
- [x] next.config.mjs (strict TypeScript - no ignoreBuildErrors)
- [x] tsconfig.json
- [x] postcss.config.mjs
- [x] app/globals.css (color scheme)
- [x] app/layout.tsx, app/page.tsx (minimal)
- [x] CLAUDE.md with rules
- [x] docs/slices/SLICE_QA.md (complete spec)
- [x] Build passes with strict TypeScript
- [x] Environment variables (.env.local) - copied from old project
- [x] Supabase client setup (src/db/supabase.ts)
- [x] Database types (src/db/types.ts)
- [x] Embeddings repository (src/db/embeddingsRepo.ts) - for Q&A retrieval
- [x] Profiles repository (src/db/profilesRepo.ts) - for user data
- [x] Q&A slice implementation (src/qa/)
  - [x] types.ts - All Q&A types following SLICE_QA.md contract
  - [x] config.ts - Configuration with defaults for Ollama/OpenAI/Claude
  - [x] retrieval.ts - Vector search using Supabase pgvector
  - [x] prompt.ts - System prompt builder with injection defense
  - [x] confidence.ts - Confidence scoring from retrieval quality
  - [x] providers/ollama.ts - Ollama provider
  - [x] providers/openai.ts - OpenAI provider via AI SDK
  - [x] providers/claude.ts - Claude provider via AI SDK
  - [x] providers/index.ts - Provider factory
  - [x] qaService.ts - Main orchestration service
  - [x] index.ts - Public exports
- [x] API route (app/api/qa/route.ts) - Thin handler with auth, validation, subscription gate
- [x] Build passes with all Q&A slice code
- [x] Shared UI dependencies (lib/utils.ts, components/ui/button.tsx, components/ui/card.tsx)
- [x] Q&A UI component (src/qa/components/QAPage.tsx)
- [x] Q&A dashboard page (app/dashboard/qa/page.tsx)
- [x] Auth slice implementation
  - [x] Supabase browser client (src/db/supabase-client.ts)
  - [x] Supabase server client (src/db/server.ts)
  - [x] Proxy/middleware for session refresh (proxy.ts)
  - [x] Login page (app/auth/login/page.tsx)
  - [x] Sign-up page (app/auth/sign-up/page.tsx)
  - [x] Sign-up success page (app/auth/sign-up-success/page.tsx)
  - [x] Redirect handler (app/redirect/page.tsx)
  - [x] Sign-out action (app/actions/auth.ts)
  - [x] UI components (Input, Label, Badge, Dialog)
- [x] Home page with checkout (src/home/)
- [x] Ingest script for training data (scripts/training-data/10.ingest.ts)

### Deferred (Not Needed Now)
- [ ] Rate limiting implementation
- [ ] Request logging to database

### Next Up: Preferences & Dashboard Slices
**Plan:** `docs/PLAN_PREFERENCES_DASHBOARD.md`
**Specs:** `docs/slices/SLICE_PREFERENCES.md`, `docs/slices/SLICE_DASHBOARD.md`

This involves migrating:
- Onboarding flow (5-step wizard)
- UserPreferences component (dashboard embed)
- ArchetypeSelector page
- SecondaryRegionSelector page
- InteractiveWorldMap component
- LevelProgressBar component
- Dashboard page with training module cards

### Not Started
- [ ] **Profile/Preferences slice** - See plan above
- [ ] **Dashboard slice** - See plan above
- [ ] Scenarios slice
- [ ] Tests for Q&A slice

### Database
- Using SAME Supabase project as old codebase
- No new database needed - just copy .env.local credentials
- Existing tables and training data remain intact
