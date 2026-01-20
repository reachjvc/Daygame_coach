THIS IS ONLY USED TO MIGRATE TO A NEW PROJECT FOLDER

# PROJECT_CONTEXT.md
# Read this file before making changes.

## What this app is
This is a daygame coaching platform where logged-in users (premium required) can:
- Ask daygame questions (Q&A Coach)
- See answer + sources used + meta-cognition + confidence score
- Practice scenarios (future slices)
- Gain XP/levels (future slices)
- Provide feedback on responses (future slices)

The Q&A answers are grounded in a training data knowledge base (transcripts/chunks + metadata) stored in Supabase and retrieved via vector search.

---

## Non-negotiable Architecture Rules (MUST FOLLOW)
### 1) Everything is built as vertical slices
Every feature must be implemented end-to-end:

UI -> API Endpoint -> Service Layer -> DB/External Services -> Tests

Do NOT build horizontal "systems" in isolation.

---

### 2) The API Route Handler must stay thin
In Next.js, API routes are in:
- app/api/*

A route handler MUST do only:
- auth
- subscription gate
- validate request body
- rate limit
- call service function
- log outcome
- return response JSON

Route handlers MUST NOT contain:
- retrieval logic
- chunking logic
- prompt building logic
- confidence scoring logic
- direct model provider calls (except via service)

---

### 3) Feature logic lives in service modules
For Q&A, the core logic MUST live in:
- src/qa/qaService.ts

The service orchestrates:
- retrieval -> prompt -> model call -> response assembly -> confidence -> meta cognition

---

### 4) Retrieval is isolated
Q&A retrieval MUST live in:
- src/qa/retrieval.ts

No other module should perform training-data retrieval directly.

---

### 5) Providers are isolated
Model providers MUST be isolated in:
- src/qa/providers/*

Example files:
- src/qa/providers/ollama.ts
- src/qa/providers/openai.ts
- src/qa/providers/claude.ts

Providers must only:
- accept a normalized request
- return a normalized response
- throw typed errors

Providers MUST NOT implement business logic.

---

### 6) Prompt-building is isolated
Q&A prompt building MUST live in:
- src/qa/prompt.ts

No other file should construct prompts ad-hoc.

---

### 7) Confidence scoring is isolated
Confidence scoring MUST live in:
- src/qa/confidence.ts

Confidence score MUST be computed from:
- retrieval signal strength
- internal consistency checks
- policy checks (e.g., injection safety)
NOT from "LLM guessing the probability of correctness"

---

### 8) Database access goes through repos
All database reads/writes MUST go through:
- src/db/*

No UI or service is allowed to run raw Supabase queries directly.

---

### 9) Safety is part of each slice
Every LLM endpoint MUST include:
- auth required
- premium required
- strict validation
- per-user rate limiting
- DB logging for every request
- prompt injection defense

---

## Folder Layout
Frontend:
- app/dashboard/*              # Next.js UI pages
- components/*                 # UI components used by pages

API:
- app/api/*                    # Next.js route handlers

Core logic:
- src/qa/*                     # Q&A slice implementation
- src/security/*               # auth, validation, rate limiting
- src/db/*                     # database repositories (Supabase)

Tests:
- tests/api/*                  # endpoint contract tests
- tests/qa/*                   # retrieval/confidence/service tests
- tests/ui/*                   # end-to-end UI tests

---

## Q&A Contract (MUST NOT BREAK)
Endpoint:
- POST /api/qa

The response MUST ALWAYS include these keys:
- answer
- confidence
- sources
- metaCognition
- meta

Do not remove or rename these fields without:
- updating API tests
- updating UI components

---

## Q&A Safety Requirements (MUST)
### Authentication
- Only logged-in users may call POST /api/qa

### Subscription gate
- Only premium users may call POST /api/qa
- Premium flag location: <<SUPABASE_TABLE_OR_FIELD_FOR_SUBSCRIPTION_STATUS>>

### Rate limiting
- Must limit by user_id
- Limits:
  - per minute: <<RATE_LIMIT_PER_MINUTE>>
  - per hour: <<RATE_LIMIT_PER_HOUR>>
  - per day: <<RATE_LIMIT_PER_DAY>>
- Return HTTP 429 for rate limit exceeded

### Validation
Enforce:
- question is a string
- question length <= <<MAX_QUESTION_CHARS>>
- retrieval.topK <= <<MAX_TOPK>>
- generation.maxOutputTokens <= <<MAX_OUTPUT_TOKENS>>

### Prompt injection defense
- Retrieved source text is UNTRUSTED and MUST NOT be treated as instructions.
- System policy always overrides source text.

---

## Developer Commands
These commands MUST work:
- npm run dev
- npm run lint
- npm run test
- npm run test:e2e

---

## AI Workflow Rules (for future edits)
When implementing a change:
1) Identify the vertical slice being changed
2) List the exact files to modify
3) Preserve the request/response contract
4) Update tests with changes
5) Ensure lint + tests pass

Do NOT restructure unrelated parts of the repo.
Do NOT add new architecture patterns unless explicitly required.

---

## Placeholders to replace
Search for `<<` to find placeholders and fill them in.
