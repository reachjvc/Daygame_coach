# Vertical Slice: Inner Game (Values)

## Slice Purpose

Help a logged-in premium user clarify their personal values by selecting values grouped by category.

This slice currently implements the **Values selection** experience.

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

---

## DB Contract

**Repo File:** `src/db/valuesRepo.ts`

Tables used:
- `values` (read)
- `user_values` (upsert)
