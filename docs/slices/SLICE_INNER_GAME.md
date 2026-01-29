# Vertical Slice: Inner Game (Values)
**Status:** Reference
**Updated:** 29-01-2026 07:46 (Danish time)

## Slice Purpose

Help a logged-in premium user clarify their personal values through a multi-step flow:
- Values selection by category
- Progress tracking across steps
- Pairwise value comparisons
- AI-assisted value inference (hurdles/deathbed prompts)

---

## UI Page

**Route:** `/dashboard/inner-game`

**App File:** `app/dashboard/inner-game/page.tsx` (thin wrapper)

**Main Component:** `src/inner-game/components/InnerGamePage.tsx`

UI requirements:
- UI must match the legacy project exactly
- Fixed header with "Back to Dashboard" button
- Category sections with value chips
- "Save Selections" button

---

## API Endpoint(s)

### List Values

**HTTP Method + Path:** `GET /api/inner-game/values`

**Route File:** `app/api/inner-game/values/route.ts`

Supports optional query param `?category=<name>` to filter by category.

**Response JSON:**

```json
[
  {
    "id": "confidence",
    "category": "Identity",
    "display_name": "Confidence"
  }
]
```

### Save Selected Values

**HTTP Method + Path:** `POST /api/inner-game/values`

**Route File:** `app/api/inner-game/values/route.ts`

**Request JSON:**

```json
{
  "valueIds": ["confidence", "discipline"]
}
```

**Response JSON:**

```json
{ "ok": true }
```

### Progress (Journey State)

**HTTP Method + Path:** `GET /api/inner-game/progress`

Returns current progress plus selected values count.

**HTTP Method + Path:** `POST /api/inner-game/progress`

Updates progress fields (currentStep, substep, inferred values, etc.).

---

### Infer Values (LLM)

**HTTP Method + Path:** `POST /api/inner-game/infer-values`

**Request JSON:**

```json
{
  "context": "hurdles",
  "response": "Longer free-text response..."
}
```

**Response JSON:**

```json
{
  "values": [
    { "id": "confidence", "reason": "Mentions overcoming fear..." }
  ]
}
```

---

### Value Comparisons

**HTTP Method + Path:** `GET /api/inner-game/comparisons`

Returns comparison history.

**HTTP Method + Path:** `POST /api/inner-game/comparisons`

Saves a new comparison result.

**HTTP Method + Path:** `DELETE /api/inner-game/comparisons`

Clears all comparisons for the user.

---

## Service Layer Contract

**File:** `src/inner-game/innerGameService.ts`

```ts
export async function getInnerGameValues(): Promise<ValueItem[]>

export async function saveInnerGameValueSelection(
  userId: string,
  valueIds: string[]
): Promise<void>
```

**Additional modules:**
- `src/inner-game/modules/progress.ts` (get/update/reset progress)
- `src/inner-game/modules/valueInference.ts` (infer values with Ollama)

---

## Data Source

**Canonical store:** Supabase table `values`

**Seed/reference files (not used at runtime):**
- `src/inner-game/data/values.json`
- `src/inner-game/data/categories.json`

---

## DB Contract

**Repo Files:** `src/db/valuesRepo.ts`, `src/db/innerGameProgressRepo.ts`, `src/db/valueComparisonRepo.ts`

Tables used:
- `values` (read)
- `user_values` (upsert)
- `inner_game_progress` (progress state)
- `value_comparisons` (pairwise/aspirational comparisons)
