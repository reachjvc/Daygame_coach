# Scenarios API Contracts
**Status:** Reference
**Updated:** 29-01-2026

## Changelog
- 29-01-2026 17:15 - Split from SLICE_SCENARIOS.md

---

## API Endpoints

### POST /api/scenarios/openers/encounter

Generate an opener encounter.

**Request:**
```json
{
  "difficulty": "intermediate",
  "environment": "coffee-shop",
  "includeHint": true,
  "includeWeather": false
}
```

**Response:**
```json
{
  "encounter": {
    "userFacing": {
      "description": "She's sitting alone at a small table...",
      "environment": "Coffee Shop - Working",
      "activity": "Typing on a laptop",
      "hook": "She glances up briefly as you enter."
    },
    "aiHandoff": { /* hidden context */ },
    "meta": {
      "activityId": "3.2.1",
      "difficulty": "intermediate",
      "calculatedDifficulty": 0.45
    }
  }
}
```

---

### POST /api/scenarios/openers/evaluate

Evaluate a user's opener.

**Request:**
```json
{
  "opener": "Hey, quick question - you look like you'd know...",
  "encounter": { /* full encounter object */ }
}
```

**Response:**
```json
{
  "evaluation": {
    "overallScore": 7,
    "confidence": 8,
    "authenticity": 7,
    "calibration": 7,
    "hook": 6,
    "feedback": "Solid opener...",
    "strengths": ["Direct", "Situational"],
    "improvements": ["Could be more specific"],
    "suggestedRewrite": "Hey, quick one - I noticed..."
  },
  "fallback": false
}
```

---

### POST /api/scenarios/chat

Multi-turn conversation for career/shittests scenarios.

**Request (first message):**
```json
{
  "message": "",
  "scenario_type": "practice-career-response",
  "conversation_history": []
}
```

**Response (introduction):**
```json
{
  "text": "*You're mid-conversation... She says: 'I'm a marketing manager.'",
  "archetype": "The Powerhouse",
  "difficulty": "intermediate",
  "isIntroduction": true
}
```

**Request (subsequent):**
```json
{
  "message": "Marketing manager? So you manipulate people for a living?",
  "scenario_type": "practice-career-response",
  "conversation_history": [/* previous messages */]
}
```

**Response:**
```json
{
  "text": "*smiles* Maybe. What about you?",
  "archetype": "The Powerhouse",
  "evaluation": {
    "score": 7,
    "feedback": "Good tease; add warmth after."
  }
}
```

---

## Scenario Sub-Module Contracts

### Openers (`src/scenarios/openers/`)

**Generator (`generator.ts`):**
```typescript
export interface GeneratorOptions {
  difficulty: DifficultyLevel;
  environment: EnvironmentChoice;
  includeHint: boolean;
  includeWeather: boolean;
  regionId?: string;
}

export function generateScenarioV2(options: GeneratorOptions): GeneratedScenarioV2
```

**Evaluator (`evaluator.ts`):**
```typescript
export async function evaluateOpener(
  opener: string,
  encounter: GeneratedScenarioV2
): Promise<OpenerEvaluation>

export function evaluateOpenerHeuristic(
  opener: string,
  encounter: GeneratedScenarioV2
): OpenerEvaluation
```

**Data files:**
- `base-texts.ts` - 100+ activities across 7 environments
- `energy.ts` - 21 energy states with visibility/approachability
- `outfits.ts` - 14 categories × 3 tiers each
- `weather.ts` - 9 weather types with mood modifiers
- `hooks.ts` - Opener hint texts

---

### Career (`src/scenarios/career/`)

**Generator (`generator.ts`):**
```typescript
export interface CareerScenarioContext {
  archetype: Archetype;
  jobTitle: string;
  jobLine: string;
  outfitDescription: string;
  vibeDescription: string;
}

export function generateCareerScenario(
  archetype: Archetype,
  difficulty: DifficultyLevel
): CareerScenarioContext

export function generateCareerIntro(context: CareerScenarioContext): string
```

**Evaluator (`evaluator.ts`):**
```typescript
export function evaluateCareerResponse(
  message: string,
  jobTitle: string,
  turn: number
): SmallEvaluation | MilestoneEvaluation
```

**Data (`data/careers.ts`):**
Careers by archetype: Powerhouse (Marketing manager, Financial analyst), Creative (Graphic designer, Writer), etc.

---

### Shit-Tests (`src/scenarios/shittests/`)

**Generator (`generator.ts`):**
```typescript
export function getRandomShittest(
  difficulty: DifficultyLevel,
  archetypeShittests: string[]
): string

export function generateShittestIntro(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  shittest: string
): string
```

**Evaluator (`evaluator.ts`):**
```typescript
export function evaluateShittestResponse(
  message: string,
  shittest: string,
  turn: number
): SmallEvaluation | MilestoneEvaluation
```

**Data (`data/shit-tests.ts`):**
```typescript
export const SHITTESTS_BY_DIFFICULTY: Record<DifficultyLevel, string[]> = {
  beginner: ["Do you do this often?", "Is this a pickup line?"],
  intermediate: ["I don't usually talk to random guys.", "You're confident, I'll give you that."],
  // ... advanced, expert, master
};
```

---

## Service Layer Contract

### Main Orchestrator (`scenariosService.ts`)

```typescript
export class ScenariosService {
  // Openers (single-turn)
  async generateOpenerEncounter(
    request: GenerateEncounterRequest,
    userId: string
  ): Promise<GeneratedScenarioV2>

  async evaluateOpenerResponse(
    request: EvaluateOpenerRequest,
    userId: string
  ): Promise<OpenerEvaluation>

  // Chat scenarios (multi-turn)
  async handleChatMessage(
    request: ChatRequest,
    userId: string
  ): Promise<ChatResponse>
}
```

The service:
1. Validates request
2. Gets user profile (level, preferences)
3. Routes to appropriate scenario handler
4. Returns response

---

## Security Requirements

All endpoints require:
1. **Authentication** - Return 401 if not logged in
2. **Subscription gate** - Return 403 if not premium
3. **Input validation** - Zod schemas, max lengths
4. **Rate limiting** (deferred) - 30 messages/min

```typescript
// In route handlers:
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const profile = await getProfile(session.user.id);
if (!profile.isPremium) return NextResponse.json({ error: "Premium required" }, { status: 403 });

const parsed = requestSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
```

---

## Testing Requirements

### Unit Tests

```
tests/scenarios/
├── shared/
│   ├── archetypes.test.ts
│   └── difficulty.test.ts
├── openers/
│   ├── generator.test.ts
│   └── evaluator.test.ts
├── career/
│   ├── generator.test.ts
│   └── evaluator.test.ts
└── shittests/
    ├── generator.test.ts
    └── evaluator.test.ts
```

### Integration Tests

```
tests/scenarios/
└── scenariosService.test.ts
```

### API Contract Tests

```
tests/api/
├── scenarios-openers.test.ts
└── scenarios-chat.test.ts
```
