# Jonas - Project Status

## MIGRATION COMPLETE

**Project location:** `/home/jonaswsl/projects/daygame-coach/`
**Old project (deprecated):** `/home/jonaswsl/projects/v0-ai-daygame-coach/`

**Last updated:** 2026-01-20

---

## What's Done

### Infrastructure
- [x] New project folder with vertical slice architecture
- [x] package.json with trimmed dependencies
- [x] Strict TypeScript (no ignoreBuildErrors)
- [x] Config files (next.config.mjs, tsconfig.json, postcss.config.mjs)
- [x] globals.css with color scheme
- [x] CLAUDE.md with AI assistant rules
- [x] PROJECT_CONTEXT.MD (architecture rules)
- [x] Environment variables (.env.local)
- [x] Build passes

### Database Layer (src/db/)
- [x] Supabase browser client (supabase-client.ts)
- [x] Supabase server client (server.ts)
- [x] Database types (types.ts)
- [x] Embeddings repository (embeddingsRepo.ts)
- [x] Profiles repository (profilesRepo.ts)

### Q&A Slice (src/qa/) - COMPLETE
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
- [x] components/QAPage.tsx - Q&A UI component
- [x] API route (app/api/qa/route.ts)
- [x] Dashboard page (app/dashboard/qa/page.tsx)

### Auth Slice - COMPLETE
- [x] Proxy/middleware for session refresh (proxy.ts)
- [x] Login page (app/auth/login/)
- [x] Sign-up page (app/auth/sign-up/)
- [x] Sign-up success page (app/auth/sign-up-success/)
- [x] Redirect handler (app/redirect/page.tsx)
- [x] Sign-out action (app/actions/auth.ts)

### Home Page (src/home/)
- [x] HomePage component with checkout flow
- [x] Products configuration
- [x] Checkout components

### UI Components (components/ui/)
- [x] Button, Card, Input, Label, Badge, Dialog

### Scripts
- [x] Ingest script for training data (scripts/ingest.ts)

---

## Routes Available

| Route | Description |
|-------|-------------|
| `/` | Home page with product info |
| `/auth/login` | Login page |
| `/auth/sign-up` | Registration page |
| `/auth/sign-up-success` | Post-registration confirmation |
| `/dashboard/qa` | Q&A Coach interface |
| `/qa` | Alias for /dashboard/qa |
| `/redirect` | Post-login redirect handler |
| `/api/qa` | Q&A API endpoint |

---

## Deferred (Not Needed Now)
- [ ] Rate limiting implementation
- [ ] Request logging to database

## Not Started
- [ ] Scenarios slice
- [ ] Profile/Settings slice
- [ ] Onboarding slice
- [ ] Admin slice
- [ ] Tests for Q&A slice

---

## Database

Using SAME Supabase database as old project:
- No migration needed
- Same credentials in .env.local
- Tables: `embeddings`, `profiles`, `purchases`

---

## Commands

```bash
cd /home/jonaswsl/projects/daygame-coach

npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run linter
npm run test     # Run tests (none configured yet)
```

---

## Architecture

```
daygame-coach/
├── app/                    # Next.js routing (thin wrappers)
│   ├── api/qa/             # Q&A API endpoint
│   ├── auth/               # Login/signup pages
│   ├── dashboard/qa/       # Q&A UI page
│   └── redirect/           # Post-login handler
├── src/                    # ALL business logic
│   ├── qa/                 # Q&A slice (complete)
│   ├── db/                 # Database repositories
│   └── home/               # Home page components
├── components/ui/          # Shared UI components
├── lib/                    # Utilities
├── scripts/                # Data processing
└── docs/slices/            # Slice specifications
```

---

## Key Files Reference

| What | Location |
|------|----------|
| Q&A API | `app/api/qa/route.ts` |
| Q&A service | `src/qa/qaService.ts` |
| Q&A UI | `src/qa/components/QAPage.tsx` |
| Retrieval | `src/qa/retrieval.ts` |
| Supabase (server) | `src/db/server.ts` |
| Supabase (browser) | `src/db/supabase-client.ts` |
| Proxy | `proxy.ts` |
| Q&A spec | `docs/slices/SLICE_QA.md` |
