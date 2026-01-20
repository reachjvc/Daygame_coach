# Vertical Slice: Scenarios

## Slice Purpose

A unified scenarios system with **19 pluggable scenario types** organized into 5 phases:

| Phase | Scenarios | Available |
|-------|-----------|-----------|
| **Opening** | Practice Openers | 1/1 |
| **Hooking** | Topic Pivot, Assumption Game, Her Question to You | 0/3 |
| **Vibing** | Career Response, Hobby Response, Compliment Delivery, Flirting Escalation | 1/4 |
| **Resistance** | Shit-Tests, Boyfriend Mention, Time Pressure | 1/3 |
| **Closing** | Number Ask, Instagram Close, Instant Date Pitch, First Text, Date Proposal, Flake Recovery, Dating App Opener, App to Date | 0/8 |

**Total: 19 scenarios (3 available, 16 coming soon)**

All scenarios share common infrastructure (archetypes, difficulty, evaluation patterns) while each scenario type has its own generator, evaluator, and UI component. The UI must display ALL scenarios with "Coming Soon" badges for unavailable ones.

---

## Architecture Overview

```
src/scenarios/
├── scenariosService.ts           # Routes to correct scenario handler
├── types.ts                      # All shared types
├── config.ts                     # ALL 19 scenarios with phases, availability
├── shared/
│   ├── archetypes.ts             # Woman personality types (6 archetypes)
│   ├── difficulty.ts             # Difficulty system (5 levels)
│   └── evaluation.ts             # Shared evaluation patterns
├── openers/                      # Single-turn opener practice
│   ├── generator.ts              # Scenario generation (v2)
│   ├── evaluator.ts              # AI + heuristic evaluation
│   ├── data/
│   │   ├── base-texts.ts         # Position-constrained activities
│   │   ├── energy.ts             # Energy states & weights
│   │   ├── outfits.ts            # Outfit descriptions by tier
│   │   ├── weather.ts            # Weather system
│   │   └── hooks.ts              # Opener hints
│   └── OpenersTrainer.tsx        # UI component
├── career/                       # Career revelation scenario
│   ├── generator.ts              # Career scenario generator
│   ├── evaluator.ts              # Career response evaluator
│   ├── data/careers.ts           # Careers by archetype
│   └── CareerChat.tsx            # UI component
├── shittests/                    # Shit-test scenarios
│   ├── generator.ts              # Shit-test generator
│   ├── evaluator.ts              # Shit-test response evaluator
│   ├── data/shit-tests.ts        # Challenges by difficulty
│   └── ShittestChat.tsx          # UI component
├── providers/
│   └── index.ts                  # AI provider integration (reuses Q&A pattern)
└── components/
    ├── ScenariosHub.tsx          # Main hub showing all scenarios
    └── ChatWindow.tsx            # Shared chat interface for multi-turn

app/api/scenarios/
├── openers/
│   ├── encounter/route.ts        # Generate opener encounter
│   └── evaluate/route.ts         # Evaluate user's opener
└── chat/route.ts                 # Multi-turn chat for career/shittests

app/dashboard/scenarios/
└── page.tsx                      # Next.js page (renders ScenariosHub)
```

---

## Migration Source

**Old project:** `/home/jonaswsl/projects/v0-ai-daygame-coach/`

### Files to Migrate

| Old Location | New Location | Purpose |
|--------------|--------------|---------|
| `lib/scenarios/scenario-generator-v2.ts` | `src/scenarios/openers/generator.ts` | Core opener generator |
| `lib/scenarios/base-texts.ts` | `src/scenarios/openers/data/base-texts.ts` | Activity descriptions |
| `lib/scenarios/energy.ts` | `src/scenarios/openers/data/energy.ts` | Energy states |
| `lib/scenarios/outfits.ts` | `src/scenarios/openers/data/outfits.ts` | Outfits by tier |
| `lib/scenarios/weather.ts` | `src/scenarios/openers/data/weather.ts` | Weather system |
| `lib/scenarios/difficulty.ts` | `src/scenarios/shared/difficulty.ts` | Difficulty levels |
| `lib/scenarios/archetypes.ts` | `src/scenarios/shared/archetypes.ts` | Woman archetypes |
| `lib/scenarios/prompts.ts` | `src/scenarios/shared/prompts.ts` | AI system prompts |
| `lib/scenarios/career-scenario.ts` | `src/scenarios/career/data/careers.ts` | Career options |
| `lib/scenarios/shit-tests.ts` | `src/scenarios/shittests/data/shit-tests.ts` | Shit-test database |
| `app/api/scenarios/openers/encounter/route.ts` | `app/api/scenarios/openers/encounter/route.ts` | Encounter API |
| `app/api/scenarios/openers/evaluate/route.ts` | `app/api/scenarios/openers/evaluate/route.ts` | Evaluation API |
| `app/api/scenarios/chat/route.ts` | `app/api/scenarios/chat/route.ts` | Chat API |
| `components/scenarios/practice-openers-trainer.tsx` | `src/scenarios/openers/OpenersTrainer.tsx` | Openers UI |
| `components/scenarios/scenarios-page-client-v2.tsx` | `src/scenarios/components/ScenariosHub.tsx` | Hub UI |

### Files NOT to Migrate

- `scenario-generator.ts` (v1 - deprecated)
- `scenarios-page-client.tsx` (v1 - deprecated)
- `sandbox-settings.ts` (not needed)
- `test-generator.ts` (test utility)

---

## Shared Infrastructure

### 1. Types (`src/scenarios/types.ts`)

```typescript
// ============ DIFFICULTY ============
export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "master";

// ============ SCENARIOS ============
export type ScenarioType =
  // Opening phase
  | "practice-openers"
  // Hooking phase
  | "topic-pivot"
  | "assumption-game"
  | "her-question"
  // Vibing phase
  | "practice-career-response"
  | "hobby-response"
  | "compliment-delivery"
  | "flirting-escalation"
  // Resistance phase
  | "practice-shittests"
  | "boyfriend-mention"
  | "time-pressure"
  // Closing phase
  | "number-ask"
  | "insta-close"
  | "instant-date"
  | "first-text"
  | "date-proposal"
  | "flake-recovery"
  | "app-opener"
  | "app-to-date";

export type ScenarioPhase =
  | "opening"
  | "hooking"
  | "vibing"
  | "resistance"
  | "closing";

export interface ScenarioConfig {
  id: ScenarioType;
  title: string;
  description: string;
  phase: ScenarioPhase;
  available: boolean;
  isMultiTurn: boolean;
}

// ============ SCENARIO REGISTRY ============
// This is the complete list - ALL scenarios must appear in the UI
export const SCENARIO_PHASES: ScenarioPhase[] = [
  "opening",
  "hooking",
  "vibing",
  "resistance",
  "closing",
];

export const ALL_SCENARIOS: ScenarioConfig[] = [
  // === OPENING PHASE ===
  {
    id: "practice-openers",
    title: "Practice Openers",
    description: "First 5 seconds - what do you say to get her attention?",
    phase: "opening",
    available: true,
    isMultiTurn: false,
  },

  // === HOOKING PHASE ===
  {
    id: "topic-pivot",
    title: "Topic Pivot",
    description: "She gave a bland response. Keep the conversation going.",
    phase: "hooking",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "assumption-game",
    title: "Assumption Game",
    description: "Make playful assumptions about her to create intrigue.",
    phase: "hooking",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "her-question",
    title: "Her Question to You",
    description: '"So what do you do?" - she\'s qualifying you now.',
    phase: "hooking",
    available: false,
    isMultiTurn: true,
  },

  // === VIBING PHASE ===
  {
    id: "practice-career-response",
    title: "Career Response",
    description: "She reveals her job. Practice push/pull dynamics.",
    phase: "vibing",
    available: true,
    isMultiTurn: true,
  },
  {
    id: "hobby-response",
    title: "Hobby Response",
    description: '"I do yoga" - respond without interview mode.',
    phase: "vibing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "compliment-delivery",
    title: "Compliment Delivery",
    description: "Give a genuine compliment without being needy.",
    phase: "vibing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "flirting-escalation",
    title: "Flirting Escalation",
    description: "Add tension and romantic intent to the conversation.",
    phase: "vibing",
    available: false,
    isMultiTurn: true,
  },

  // === RESISTANCE PHASE ===
  {
    id: "practice-shittests",
    title: "Shit-Tests",
    description: "Handle challenges and boundary checks with humor.",
    phase: "resistance",
    available: true,
    isMultiTurn: true,
  },
  {
    id: "boyfriend-mention",
    title: "Boyfriend Mention",
    description: '"I have a boyfriend" - real or test? How do you respond?',
    phase: "resistance",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "time-pressure",
    title: "Time Pressure",
    description: '"I really need to go" - respect or persist?',
    phase: "resistance",
    available: false,
    isMultiTurn: true,
  },

  // === CLOSING PHASE ===
  {
    id: "number-ask",
    title: "Number Ask",
    description: "Conversation is going well. Ask for her number.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "insta-close",
    title: "Instagram Close",
    description: "She's hesitant on number. Pivot to social media.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "instant-date",
    title: "Instant Date Pitch",
    description: "High momentum - propose grabbing coffee right now.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "first-text",
    title: "First Text",
    description: "You got her number. What do you send?",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "date-proposal",
    title: "Date Proposal",
    description: "She's responding positively. Set up a date.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "flake-recovery",
    title: "Flake Recovery",
    description: "She went cold or cancelled. Re-engage without neediness.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "app-opener",
    title: "Dating App Opener",
    description: "Her profile is interesting. Send a standout first message.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
  {
    id: "app-to-date",
    title: "App to Date",
    description: "Match is going well. Move from app chat to real date.",
    phase: "closing",
    available: false,
    isMultiTurn: true,
  },
];

// ============ OPENERS-SPECIFIC ============
export type EnvironmentChoice =
  | "any"
  | "high-street"
  | "mall"
  | "coffee-shop"
  | "transit"
  | "park"
  | "gym"
  | "campus";

export type EnergyState =
  | "bubbly" | "cheerful" | "relaxed" | "curious" | "playful"
  | "flirty" | "excited" | "amused" | "content"    // positive
  | "neutral" | "daydreaming" | "shy" | "bored"     // neutral
  | "preoccupied" | "focused" | "rushed" | "closed" // negative
  | "icy" | "tired" | "stressed" | "distracted";

export type Position =
  | "standing"
  | "seated"
  | "walking_slow"
  | "walking_moderate"
  | "walking_brisk"
  | "walking_fast";

export interface GeneratedScenarioV2 {
  userFacing: {
    description: string;
    environment: string;
    activity: string;
    hook?: string;
    weatherDescription?: string;
  };
  aiHandoff: {
    env: string;
    activity: string;
    position: Position;
    energy: EnergyState;
    energyDescription: string;
    approachability: number;
    crowd: string;
    hasHeadphones: boolean;
    listeningTo?: string;
    weather?: WeatherData;
  };
  meta: {
    activityId: string;
    difficulty: DifficultyLevel;
    calculatedDifficulty: number;
  };
}

// ============ CHAT-SPECIFIC ============
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SmallEvaluation {
  score: number;
  feedback: string;
}

export interface MilestoneEvaluation extends SmallEvaluation {
  strengths: string[];
  improvements: string[];
  suggestedNextLine?: string;
  turn: number;
}

// ============ EVALUATION ============
export interface OpenerEvaluation {
  overallScore: number;
  confidence: number;
  authenticity: number;
  calibration: number;
  hook: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestedRewrite?: string;
}
```

### 2. Archetypes (`src/scenarios/shared/archetypes.ts`)

6 woman personality types that influence ALL scenarios:

```typescript
export interface Archetype {
  id: string;
  name: string;
  coreVibe: string;
  screeningFor: string;
  resonatesWith: string;
  typicalResponses: {
    positive: string[];
    neutral: string[];
    negative: string[];
  };
  communicationStyle: {
    tone: "professional" | "casual" | "playful" | "intellectual" | "warm";
    usesEmoji: boolean;
    sentenceLength: "short" | "medium" | "long";
  };
  commonShittests: string[];
}

export const ARCHETYPES: Record<string, Archetype> = {
  powerhouse: { /* Polished, purposeful, time-conscious */ },
  creative: { /* Artsy, individualistic, perceptive */ },
  athlete: { /* Energetic, disciplined, competitive */ },
  intellectual: { /* Thoughtful, curious, observant */ },
  freeSpirit: { /* Relaxed, unconventional, warm */ },
  traveler: { /* Open, adventurous, story-seeking */ },
};
```

### 3. Difficulty (`src/scenarios/shared/difficulty.ts`)

5 difficulty levels affecting ALL scenarios:

```typescript
export interface DifficultyConfig {
  level: DifficultyLevel;
  receptiveness: number;        // 1-10, how warm she starts
  outfitDetailLevel: 1 | 2 | 3; // tier for outfit descriptions
  energyBias: "positive" | "neutral" | "negative";
  womanDescription: string;     // for prompts
}

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    level: "beginner",
    receptiveness: 8,
    outfitDetailLevel: 1,
    energyBias: "positive",
    womanDescription: "warm and receptive, looking for connection"
  },
  // ... intermediate, advanced, expert, master
};
```

### 4. Evaluation Patterns (`src/scenarios/shared/evaluation.ts`)

Shared evaluation utilities:

```typescript
// AI evaluation with structured output (reuses Q&A provider pattern)
export async function evaluateWithAI<T>(
  systemPrompt: string,
  userInput: string,
  schema: z.ZodSchema<T>
): Promise<T | null>

// Heuristic fallback checks
export function checkApologeticFraming(text: string): boolean
export function checkGenericCompliment(text: string): boolean
export function checkHasQuestion(text: string): boolean
export function checkWordCount(text: string): { tooShort: boolean; tooLong: boolean }
```

---

## Scenario Sub-Modules

### 1. Openers (`src/scenarios/openers/`)

Single-turn interaction for practicing opening lines.

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

**UI (`OpenersTrainer.tsx`):**
- Configuration panel (difficulty, environment, hints, weather)
- Encounter display with badges
- Opener input field
- Evaluation display with scores and feedback

---

### 2. Career (`src/scenarios/career/`)

Multi-turn conversation when she reveals her job.

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
Careers by archetype:
- Powerhouse: Marketing manager, Financial analyst, Product manager
- Creative: Graphic designer, Musician, Writer
- etc.

**UI (`CareerChat.tsx`):**
Chat interface with intro display, message input, and per-turn feedback.

---

### 3. Shit-Tests (`src/scenarios/shittests/`)

Multi-turn handling of challenges and boundary tests.

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
  beginner: [
    "Do you do this often?",
    "Is this a pickup line?",
  ],
  intermediate: [
    "I don't usually talk to random guys.",
    "You're confident, I'll give you that.",
  ],
  // ... advanced, expert, master
};
```

**UI (`ShittestChat.tsx`):**
Chat interface focused on testing handling and witty responses.

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

## Service Layer

### Main Orchestrator (`scenariosService.ts`)

```typescript
import { generateScenarioV2 } from "./openers/generator";
import { evaluateOpener } from "./openers/evaluator";
import { generateCareerScenario } from "./career/generator";
import { generateShittestScenario } from "./shittests/generator";

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

## UI Components

### ScenariosHub (`components/ScenariosHub.tsx`)

Main page showing **ALL 19 scenarios** organized by phase.

**IMPORTANT:** The UI must exactly match `dashboard_test/scenarios` in the old project:
- All 19 scenarios visible
- Grouped into 5 collapsible phase sections
- Available scenarios are clickable
- Unavailable scenarios show "Coming Soon" badge and are disabled
- Recommended section at the top highlights available scenarios

```tsx
export function ScenariosHub() {
  // Import ALL_SCENARIOS from config
  // Group by phase using SCENARIO_PHASES
  // Render collapsible sections for each phase
  // Each scenario card shows:
  //   - Title
  //   - Description
  //   - "Coming Soon" badge if not available
  //   - Click handler (disabled if not available)
}
```

When user clicks an available scenario:
- **practice-openers** → Render `<OpenersTrainer />`
- **practice-career-response** → Render `<CareerChat />`
- **practice-shittests** → Render `<ShittestChat />`
- Others → (implement as scenarios become available)

### ChatWindow (`components/ChatWindow.tsx`)

Shared multi-turn chat interface.

```tsx
interface ChatWindowProps {
  scenarioType: ScenarioType;
  onSendMessage: (message: string) => Promise<ChatResponse>;
  introText: string;
  archetype: string;
}

export function ChatWindow({ scenarioType, onSendMessage, introText, archetype }: ChatWindowProps)
```

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

## Implementation Order

### Phase 1: Foundation (Shared Infrastructure)

1. **Types** - Create `src/scenarios/types.ts` with all shared types
2. **Config** - Create `src/scenarios/config.ts` with scenario registry
3. **Difficulty** - Migrate to `src/scenarios/shared/difficulty.ts`
4. **Archetypes** - Migrate to `src/scenarios/shared/archetypes.ts`
5. **Evaluation utilities** - Create `src/scenarios/shared/evaluation.ts`

### Phase 2: Openers Sub-Module

6. **Data files** - Migrate base-texts, energy, outfits, weather, hooks
7. **Generator** - Migrate scenario-generator-v2 logic
8. **Evaluator** - Implement AI + heuristic evaluation
9. **API routes** - Create encounter and evaluate routes
10. **UI component** - Migrate OpenersTrainer

### Phase 3: Chat Scenarios Sub-Modules

11. **Career data** - Migrate career options by archetype
12. **Career generator/evaluator** - Implement career scenario logic
13. **Shittests data** - Migrate shit-test database
14. **Shittests generator/evaluator** - Implement shit-test logic
15. **Chat API route** - Create unified chat endpoint
16. **Chat UI components** - Create ChatWindow and scenario-specific components

### Phase 4: Hub & Integration

17. **ScenariosHub** - Create main selection page
18. **Service layer** - Create scenariosService orchestrator
19. **Dashboard page** - Create `app/dashboard/scenarios/page.tsx`
20. **Navigation** - Add to dashboard nav

### Phase 5: Testing

21. **Unit tests** - Generator, evaluator, utility tests
22. **Integration tests** - Service layer tests
23. **API contract tests** - Endpoint tests with auth/validation

---

## Making a "Coming Soon" Scenario Available

All 19 scenarios are already defined in `config.ts`. To implement a "coming soon" scenario (e.g., "boyfriend-mention"):

1. **Create the sub-module** `src/scenarios/boyfriend/`:
   - `generator.ts` - Scenario setup
   - `evaluator.ts` - Response evaluation
   - UI component (optional, can use shared ChatWindow)

2. **Add routing** in `scenariosService.ts` for the new scenario type

3. **Set `available: true`** in `config.ts`:
   ```typescript
   {
     id: "boyfriend-mention",
     ...
     available: true,  // Change from false to true
   }
   ```

4. **Done** - Hub automatically enables the scenario

## Adding a Brand New Scenario Type

If you need to add an entirely new scenario not in the current 19:

1. Add to `ScenarioType` union in `types.ts`
2. Add config entry to `ALL_SCENARIOS` in `config.ts`
3. Create sub-module folder with generator/evaluator
4. Add routing in `scenariosService.ts`

---

## Relationship to Q&A Slice

The scenarios slice reuses infrastructure from Q&A:

```typescript
// Provider pattern
import { getProvider } from "@/src/qa/providers";

// Structured output for evaluation
import { generateObject } from "ai";
```

No duplication - shared code stays in Q&A, scenarios imports as needed.

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

---

## Notes

### Why One Slice?

1. **Shared infrastructure** - Archetypes, difficulty, evaluation patterns used by all
2. **Easy to extend** - Add new scenario = add a folder
3. **Single hub** - One entry point for users at `/dashboard/scenarios`
4. **Consistent patterns** - Same service/API/UI structure across all scenarios

### Key Differences from Old Structure

| Aspect | Old | New |
|--------|-----|-----|
| Location | `lib/scenarios/` flat | `src/scenarios/` with sub-modules |
| Openers route | `/api/scenarios/openers/*` | Same (kept for clarity) |
| Dashboard | `/dashboard_test/scenarios` | `/dashboard/scenarios` |
| Components | `components/scenarios/` | `src/scenarios/{type}/Component.tsx` |
| Archetypes | Used only in chat | Shared, can influence openers too |

### What's NOT Changing

- Database schema (no changes needed)
- Environment credentials
- Provider integration pattern (reuses Q&A)
