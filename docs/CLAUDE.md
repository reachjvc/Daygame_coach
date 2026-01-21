# CLAUDE.md - READ THIS FIRST

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

Specifically:
- **Use the most accurate method** even if it's more complex (e.g., pyannote-audio for speaker diarization over simple pitch heuristics)
- **Prefer local processing** when quality is comparable (e.g., Ollama over cloud APIs for cost savings without quality loss)
- **Document trade-offs explicitly** when shortcuts are necessary
- **Build for the future** - data pipelines should support voice-to-voice even before that feature exists
- **Quality over speed** - a pipeline that takes 10 hours but produces excellent data beats a 1-hour pipeline with mediocre output

---

## CRITICAL: Keep Documentation Updated

After completing any significant work, you MUST update the relevant documentation files:

1. **CLAUDE.md** - Update the Migration Status section below
2. **docs/slices/SLICE_*.md** - Update if slice contracts change
3. **Any file that tracks progress** - Keep it current

This ensures the next AI instance (or human) can pick up where you left off.

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
- [x] Ingest script for training data (scripts/ingest.ts)

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
