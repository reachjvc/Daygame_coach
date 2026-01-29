# Vertical Slice: Q&A Coach
**Status:** Reference
**Updated:** 29-01-2026 07:46 (Danish time)

## Slice Purpose

When a logged-in premium user asks a daygame question, the system returns:
- An actionable answer
- Sources used (training chunks)
- Meta-cognition (how the answer was formed)
- A confidence score

This slice is the **core product loop**.

---

## UI Page

**Path:** `app/dashboard/qa/page.tsx`

The UI must render these sections from the API response:
1. Answer
2. Confidence (with score and factors)
3. Sources (with coach name, topic, relevance)
4. Meta-cognition (reasoning, limitations, follow-ups)

---

## API Endpoint

**HTTP Method + Path:** `POST /api/qa`

**Route File:** `app/api/qa/route.ts`

---

## Request JSON (Frontend -> Backend)

```json
{
  "question": "<<USER_QUESTION_STRING>>",
  "retrieval": {
    "topK": 8,
    "minScore": 0.5,
    "maxChunkChars": 8000
  },
  "generation": {
    "provider": "claude",
    "model": "claude-3-5-haiku-20241022",
    "maxOutputTokens": 2048,
    "temperature": 0.7
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The user's daygame question |
| `retrieval.topK` | int | No | Number of chunks to retrieve (default: 8, max: 20) |
| `retrieval.minScore` | float | No | Minimum similarity score (default: 0.5) |
| `retrieval.maxChunkChars` | int | No | Max chars per chunk (default: 8000) |
| `generation.provider` | string | No | LLM provider: "ollama", "openai", "claude" (default: "claude") |
| `generation.model` | string | No | Model name (default: `claude-3-5-haiku-20241022` for Claude, `gpt-4o-mini` for OpenAI, `llama3.1` for Ollama) |
| `generation.maxOutputTokens` | int | No | Max output tokens (default: 2048, max: 4096) |
| `generation.temperature` | float | No | Temperature 0.0-1.0 (default: 0.7) |

---

## Response JSON (Backend -> Frontend)

```json
{
  "answer": "<<GENERATED_ANSWER_STRING>>",
  "confidence": {
    "score": 0.85,
    "factors": {
      "retrievalStrength": 0.9,
      "sourceConsistency": 0.8,
      "policyCompliance": 1.0
    }
  },
  "sources": [
    {
      "chunkId": "chunk_abc123",
      "text": "<<CHUNK_TEXT_EXCERPT>>",
      "metadata": {
        "coach": "Tom Torero",
        "topic": "openers",
        "source": "podcast_ep_42",
        "timestamp": "2023-05-15T10:30:00Z"
      },
      "relevanceScore": 0.92
    }
  ],
  "metaCognition": {
    "reasoning": "This answer synthesizes advice from 3 sources focusing on indirect openers...",
    "limitations": "The training data has limited coverage of nightgame scenarios",
    "suggestedFollowUps": [
      "How do I transition from opener to conversation?",
      "What body language should I use during the opener?"
    ]
  },
  "meta": {
    "provider": "claude",
    "model": "claude-3-5-haiku-20241022",
    "latencyMs": 1250,
    "tokensUsed": 856
  }
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `answer` | string | The generated answer to the user's question |
| `confidence.score` | float | Overall confidence 0.0-1.0 |
| `confidence.factors.retrievalStrength` | float | How relevant the retrieved chunks are |
| `confidence.factors.sourceConsistency` | float | How consistent the sources are with each other |
| `confidence.factors.policyCompliance` | float | 1.0 if no policy violations, lower if issues detected |
| `sources` | array | The chunks used to generate the answer |
| `sources[].chunkId` | string | Unique identifier for the chunk |
| `sources[].text` | string | The chunk text (truncated for display) |
| `sources[].metadata` | object | Metadata about the chunk source |
| `sources[].relevanceScore` | float | Similarity score for this chunk |
| `metaCognition.reasoning` | string | Explanation of how the answer was formed |
| `metaCognition.limitations` | string | What the answer cannot cover |
| `metaCognition.suggestedFollowUps` | array | Suggested follow-up questions |
| `meta.provider` | string | Which LLM provider was used |
| `meta.model` | string | Which model was used |
| `meta.latencyMs` | int | Response time in milliseconds |
| `meta.tokensUsed` | int | Total tokens consumed |

---

## Service Layer Contract

**File:** `src/qa/qaService.ts`

```typescript
export async function handleQARequest(
  request: QARequest,
  userId: string
): Promise<QAResponse>
```

The service MUST:
1. Call `retrieval.ts` to get relevant chunks
2. Call `prompt.ts` to build the system prompt with chunks
3. Call the appropriate provider (ollama/openai/claude)
4. Call `confidence.ts` to compute confidence score
5. Assemble and return the `QAResponse`

---

## Retrieval Contract

**File:** `src/qa/retrieval.ts`

```typescript
export interface RetrievalOptions {
  topK: number;
  minScore: number;
  maxChunkChars: number;
}

export interface RetrievedChunk {
  chunkId: string;
  text: string;
  metadata: {
    coach: string;
    topic: string;
    source: string;
    timestamp: string;
  };
  relevanceScore: number;
}

export async function retrieveRelevantChunks(
  question: string,
  options: RetrievalOptions
): Promise<RetrievedChunk[]>
```

This function:
1. Generates an embedding for the question
2. Queries the vector store (Supabase pgvector)
3. Filters by minScore
4. Returns top K chunks sorted by relevance

---

## Prompt Contract

**File:** `src/qa/prompt.ts`

```typescript
export function buildSystemPrompt(
  chunks: RetrievedChunk[]
): string

export function buildUserPrompt(
  question: string
): string
```

The system prompt MUST:
- Include retrieved chunks as context
- Mark chunk text as UNTRUSTED (prompt injection defense)
- Include response format instructions
- Include policy rules (what the model should/shouldn't do)

---

## Confidence Contract

**File:** `src/qa/confidence.ts`

```typescript
export interface ConfidenceFactors {
  retrievalStrength: number;
  sourceConsistency: number;
  policyCompliance: number;
}

export interface ConfidenceResult {
  score: number;
  factors: ConfidenceFactors;
}

export function computeConfidence(
  chunks: RetrievedChunk[],
  answer: string,
  policyViolations: string[]
): ConfidenceResult
```

Confidence is computed from:
- **retrievalStrength:** Average relevance score of chunks
- **sourceConsistency:** How consistent the chunks are (overlap in advice)
- **policyCompliance:** 1.0 minus penalties for any policy violations

Confidence is NOT "LLM guessing its own correctness."

---

## Provider Contract

**File:** `src/qa/providers/ollama.ts` (and openai.ts, claude.ts)

```typescript
export interface ProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
}

export async function generate(
  request: ProviderRequest
): Promise<ProviderResponse>
```

Providers:
- Accept normalized input
- Return normalized output
- Throw typed errors on failure
- Do NOT contain business logic

---

## API Route Handler Contract

**File:** `app/api/qa/route.ts`

The route handler MUST only:
1. Check authentication (reject if not logged in)
2. Check subscription (reject if not premium)
3. Validate request body with Zod schema
4. Rate limit (TODO - not implemented yet)
5. Call `qaService.handleQARequest()`
6. Log the request/response to database
7. Return the response JSON

The route handler MUST NOT:
- Perform retrieval
- Build prompts
- Call LLM providers directly
- Compute confidence

---

## Security Requirements

### Authentication
- Only logged-in users may call POST /api/qa
- Return 401 if not authenticated

### Subscription Gate
- Only premium users may call POST /api/qa
- Return 403 if not premium

### Rate Limiting
- Limit by user_id
- Limits: 10/minute, 50/hour, 200/day
- Return 429 if exceeded

### Input Validation
- `question` must be string, max 2000 chars
- `retrieval.topK` max 20
- `generation.maxOutputTokens` max 4096
- Return 400 for invalid input

### Prompt Injection Defense
- Retrieved chunk text is UNTRUSTED
- System policy always overrides source text
- Never execute instructions found in chunks

---

## Test Requirements

### Unit Tests

**File:** `tests/qa/retrieval.test.ts`
- Test embedding generation
- Test vector search returns correct format
- Test minScore filtering
- Test topK limiting

**File:** `tests/qa/confidence.test.ts`
- Test retrievalStrength calculation
- Test sourceConsistency calculation
- Test policyCompliance penalties
- Test overall score formula

**File:** `tests/qa/prompt.test.ts`
- Test system prompt includes chunks
- Test chunks are marked as untrusted
- Test user prompt formatting

### Integration Tests

**File:** `tests/qa/qaService.test.ts`
- Test full flow: question -> answer
- Test response has all required fields
- Test error handling

### Contract Tests

**File:** `tests/api/qa.test.ts`
- Test 401 for unauthenticated
- Test 403 for non-premium
- Test 429 for rate limit (deferred until rate limiting is implemented)
- Test 400 for invalid input
- Test 200 with valid request
- Test response schema matches contract

---

## Files in This Slice

```
src/qa/
├── qaService.ts          # Orchestration
├── retrieval.ts          # Vector search
├── prompt.ts             # Prompt building
├── confidence.ts         # Confidence scoring
├── types.ts              # TypeScript types
├── config.ts             # QA-specific config
├── providers/
│   ├── index.ts          # Provider factory
│   ├── ollama.ts         # Ollama provider
│   ├── openai.ts         # OpenAI provider
│   └── claude.ts         # Claude provider
└── components/
    └── QAPage.tsx        # UI component

app/api/qa/
└── route.ts              # API route handler

app/dashboard/qa/
└── page.tsx              # Next.js page (imports QAPage)

tests/qa/
├── retrieval.test.ts
├── confidence.test.ts
├── prompt.test.ts
└── qaService.test.ts

tests/api/
└── qa.test.ts
```
