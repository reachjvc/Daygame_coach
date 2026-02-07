# Plan: Keep It Going Scenario

**Status:** Implemented
**Created:** 2026-02-07
**Languages:** Danish + English

---

## Summary

Practice the middle of the conversation - after the opener, keep the vibe alive without going into interview mode. System provides setup, user drives the conversation.

---

## Core Concept

**Problem:** User opens fine, but then asks boring questions → interview mode → conversation dies.

**Solution:** Train using statements, cold reads, and interesting questions instead.

| Good | Bad |
|------|-----|
| Statement: "You read to escape" | Question: "What do you read?" |
| Cold read: "You seem organized" | Interview: "Where do you work?" |
| Dig deeper: "Do you like it?" | Generic: "That sounds interesting" |
| Direct: "That sounds boring" | Try-hard: "You have mysterious energy" |

---

## Flow

```
1. SYSTEM shows setup:

   LOCATION: Bookstore. She's browsing books.

   YOU OPENED: "Hey - quick. You look like you actually read the back cover."

   HER: "Yeah?" *looks up, slightly skeptical*

   ---
   Your turn.

2. USER writes response

3. SYSTEM evaluates + generates her reply

4. REPEAT (~20 turns until close)

5. MILESTONE feedback every 5 turns
```

---

## Language Support

Two languages from start: **Danish (da)** and **English (en)**.

All situations, openers, responses, and evaluation patterns need both versions.

---

## File Structure

```
src/scenarios/keepitgoing/
├── index.ts
├── generator.ts
├── evaluator.ts
└── data/
    ├── situations.ts      # 3 situations, both languages
    ├── openers.ts         # Pre-written openers per situation
    └── responses.ts       # Her response templates
```

---

## 1. Types (src/scenarios/types.ts)

Add to `ScenarioType`, `ScenarioId`, and `ChatScenarioType`:

```typescript
| "keep-it-going"
```

---

## 2. Catalog (src/scenarios/catalog.ts)

```typescript
"keep-it-going": {
  id: "keep-it-going",
  title: "Keep It Going",
  description: "She gave a short answer. Keep the vibe alive without interview mode.",
  icon: MessageSquare,
  status: "available",
},
```

Add to `hooking` phase in `PHASE_CATALOG`:
```typescript
scenarioIds: ["topic-pivot", "assumption-game", "her-question", "keep-it-going"],
```

---

## 3. Data: Situations (src/scenarios/keepitgoing/data/situations.ts)

```typescript
export type Language = "da" | "en"

export interface Situation {
  id: string
  location: { da: string; en: string }
  setup: { da: string; en: string }
  yourOpener: { da: string; en: string }
  herFirstResponse: { da: string; en: string }
}

export const SITUATIONS: Situation[] = [
  {
    id: "bookstore",
    location: {
      da: "Boghandel",
      en: "Bookstore",
    },
    setup: {
      da: "Hun kigger på bøger.",
      en: "She's browsing books.",
    },
    yourOpener: {
      da: "Hey - to sekunder. Du så ud som om du faktisk læste bagsiden.",
      en: "Hey - quick. You look like you actually read the back cover.",
    },
    herFirstResponse: {
      da: '"Ja?" *kigger op, lidt skeptisk*',
      en: '"Yeah?" *looks up, slightly skeptical*',
    },
  },
  {
    id: "cafe",
    location: {
      da: "Café",
      en: "Coffee shop",
    },
    setup: {
      da: "Hun sidder med laptop, ser fokuseret ud.",
      en: "She's sitting with her laptop, looks focused.",
    },
    yourOpener: {
      da: "Undskyld - 30 sekunder. Du har den der 'lad mig være produktiv' energi.",
      en: "Sorry - 30 seconds. You have that 'let me be productive' energy.",
    },
    herFirstResponse: {
      da: '"Øh, jeg arbejder faktisk..." *kigger op fra laptop*',
      en: '"Uh, I\'m actually working..." *looks up from laptop*',
    },
  },
  {
    id: "street",
    location: {
      da: "Gaden",
      en: "Street",
    },
    setup: {
      da: "Hun går med formål, ser travl ud.",
      en: "She's walking with purpose, looks busy.",
    },
    yourOpener: {
      da: "Hey, hurtigt - du gik som om du faktisk ved hvor du skal hen. Det er sjældent.",
      en: "Hey, quick - you walked like you actually know where you're going. That's rare.",
    },
    herFirstResponse: {
      da: '"Haha, jeg skal bare et sted hen?" *sakker lidt ned*',
      en: '"Haha, I\'m just going somewhere?" *slows down slightly*',
    },
  },
  {
    id: "metro",
    location: {
      da: "Metrostation",
      en: "Metro station",
    },
    setup: {
      da: "Hun venter på metroen, kigger på sin telefon.",
      en: "She's waiting for the metro, looking at her phone.",
    },
    yourOpener: {
      da: "Hey - du ser ud som en der faktisk ved hvilken retning hun skal. Jeg er lost.",
      en: "Hey - you look like someone who actually knows which direction to go. I'm lost.",
    },
    herFirstResponse: {
      da: '"Øh, hvor skal du hen?" *kigger op fra telefon*',
      en: '"Uh, where are you going?" *looks up from phone*',
    },
  },
  {
    id: "mall",
    location: {
      da: "Storcenter",
      en: "Shopping mall",
    },
    setup: {
      da: "Hun går rundt med en pose, ser afslappet ud.",
      en: "She's walking around with a bag, looks relaxed.",
    },
    yourOpener: {
      da: "Hey - to sekunder. Du har den der 'jeg ved præcis hvad jeg vil have' energi. Imponerende.",
      en: "Hey - quick. You have that 'I know exactly what I want' energy. Impressive.",
    },
    herFirstResponse: {
      da: '"Haha, tak?" *stopper, smiler lidt*',
      en: '"Haha, thanks?" *stops, smiles slightly*',
    },
  },
]
```

---

## 4. Generator (src/scenarios/keepitgoing/generator.ts)

```typescript
import type { Archetype } from "../shared/archetypes"
import type { DifficultyLevel } from "../types"
import { SITUATIONS, type Situation, type Language } from "./data/situations"

export interface KeepItGoingContext {
  situation: Situation
  language: Language
  turnCount: number
  conversationPhase: "hook" | "vibe" | "invest" | "close"
}

export function generateKeepItGoingScenario(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  seed: string,
  language: Language = "en"
): KeepItGoingContext {
  // Pick situation based on seed
  const index = Math.abs(hashSeed(seed)) % SITUATIONS.length
  const situation = SITUATIONS[index]

  return {
    situation,
    language,
    turnCount: 0,
    conversationPhase: "hook",
  }
}

export function generateKeepItGoingIntro(context: KeepItGoingContext): string {
  const { situation, language } = context
  const lang = language

  const locationLabel = lang === "da" ? "STED" : "LOCATION"
  const youOpenedLabel = lang === "da" ? "DU ÅBNEDE" : "YOU OPENED"
  const herLabel = lang === "da" ? "HENDE" : "HER"
  const yourTurnLabel = lang === "da" ? "Din tur." : "Your turn."

  return `**${locationLabel}:** ${situation.location[lang]}. ${situation.setup[lang]}

**${youOpenedLabel}:** "${situation.yourOpener[lang]}"

**${herLabel}:** ${situation.herFirstResponse[lang]}

---
${yourTurnLabel}`
}
```

---

## 5. Evaluator (src/scenarios/keepitgoing/evaluator.ts)

```typescript
import type { EvaluationResult } from "../types"
import type { Language } from "./data/situations"

// Patterns per language
const PATTERNS = {
  da: {
    statement: [
      /du virker/i,
      /du ser ud/i,
      /lad mig gætte/i,
      /jeg får/i,
      /det forklarer/i,
      /du har den der/i,
    ],
    interview: [
      /^hvad /i,
      /^hvor /i,
      /^hvorfor /i,
      /^hvornår /i,
      /laver du\?/i,
      /bor du\?/i,
      /hedder du\?/i,
      /studerer du\?/i,
    ],
    digging: [
      /kan du lide/i,
      /er det kedeligt/i,
      /hvorfor det/i,
      /hvad fik dig til/i,
      /er du i det for/i,
      /savner du/i,
    ],
    tryHard: [
      /mystisk/i,
      /hemmeligheder/i,
      /der er noget ved dig/i,
      /du har en energi/i,
    ],
  },
  en: {
    statement: [
      /you seem/i,
      /you look like/i,
      /let me guess/i,
      /i get/i,
      /that explains/i,
      /you have that/i,
      /you strike me/i,
    ],
    interview: [
      /^what /i,
      /^where /i,
      /^why /i,
      /^when /i,
      /do you do\?/i,
      /do you live\?/i,
      /is your name\?/i,
      /do you study\?/i,
    ],
    digging: [
      /do you like/i,
      /do you enjoy/i,
      /is it boring/i,
      /why.s that/i,
      /what got you into/i,
      /are you in it for/i,
      /do you miss/i,
    ],
    tryHard: [
      /mysterious/i,
      /secrets/i,
      /something about you/i,
      /you have an energy/i,
    ],
  },
}

export function evaluateKeepItGoingResponse(
  userMessage: string,
  language: Language
): EvaluationResult {
  const patterns = PATTERNS[language]
  const msg = userMessage.trim()

  // Check patterns
  const hasStatement = patterns.statement.some((p) => p.test(msg))
  const hasInterview = patterns.interview.some((p) => p.test(msg))
  const hasDigging = patterns.digging.some((p) => p.test(msg))
  const hasTryHard = patterns.tryHard.some((p) => p.test(msg))
  const hasQuestion = msg.includes("?")
  const tooLong = msg.length > 150

  // Score calculation
  let score = 5

  if (hasStatement) score += 2
  if (hasDigging) score += 2
  if (hasInterview && !hasDigging) score -= 2
  if (hasTryHard) score -= 1
  if (tooLong) score -= 1
  if (!hasQuestion && !hasStatement) score -= 1

  score = Math.max(1, Math.min(10, score))

  // Feedback
  const feedback = buildFeedback(
    { hasStatement, hasInterview, hasDigging, hasTryHard, tooLong },
    language
  )

  const strengths: string[] = []
  const improvements: string[] = []

  if (hasStatement) strengths.push(language === "da" ? "Brugte statement" : "Used statement")
  if (hasDigging) strengths.push(language === "da" ? "Gravede dybere" : "Dug deeper")
  if (!hasTryHard && !tooLong) strengths.push(language === "da" ? "Autentisk" : "Authentic")

  if (hasInterview && !hasDigging) {
    improvements.push(language === "da" ? "Undgå interview-spørgsmål" : "Avoid interview questions")
  }
  if (hasTryHard) {
    improvements.push(language === "da" ? "For try-hard" : "Too try-hard")
  }
  if (tooLong) {
    improvements.push(language === "da" ? "Hold det kortere" : "Keep it shorter")
  }

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
    },
  }
}

function buildFeedback(checks: Record<string, boolean>, language: Language): string {
  if (language === "da") {
    if (checks.hasStatement && checks.hasDigging) return "Godt! Statement + graver dybere."
    if (checks.hasStatement) return "Godt statement. Prøv at grave dybere næste gang."
    if (checks.hasDigging) return "Godt spørgsmål. Tilføj et statement først."
    if (checks.hasInterview) return "Interview mode. Brug statements i stedet for spørgsmål."
    if (checks.hasTryHard) return "Lidt for smooth. Vær mere direkte."
    return "Prøv et statement eller cold read."
  }

  // English
  if (checks.hasStatement && checks.hasDigging) return "Good! Statement + digging deeper."
  if (checks.hasStatement) return "Good statement. Try digging deeper next time."
  if (checks.hasDigging) return "Good question. Add a statement first."
  if (checks.hasInterview) return "Interview mode. Use statements instead of questions."
  if (checks.hasTryHard) return "A bit too smooth. Be more direct."
  return "Try a statement or cold read."
}
```

---

## 6. Placeholder Responses (src/scenarios/keepitgoing/data/responses.ts)

```typescript
import type { Language } from "./situations"

interface ResponseSet {
  positive: string[]    // Good statement → she opens up
  neutral: string[]     // Okay response → she gives more
  deflect: string[]     // Bad/interview → short answer
  skeptical: string[]   // Try-hard → she's skeptical
}

export const RESPONSES: Record<Language, ResponseSet> = {
  da: {
    positive: [
      '*smiler* "Haha, måske. Hvad med dig?"',
      '*griner lidt* "Okay, det er faktisk ret sandt."',
      '"Fair nok. Du er ikke helt ved siden af."',
      '*smiler* "Det kan du godt sige. Hvorfor spørger du?"',
    ],
    neutral: [
      '"Måske. Hvad får dig til at sige det?"',
      '"Hmm, interessant observation."',
      '*tænker* "Jeg ved ikke... måske?"',
    ],
    deflect: [
      '"Okay?"',
      '"Jah..."',
      '"Det ved jeg ikke."',
      '*kort pause* "Sure."',
    ],
    skeptical: [
      '*hæver øjenbryn* "Det var... noget at sige."',
      '"Øh, okay?"',
      '*ser skeptisk ud* "Right."',
    ],
  },
  en: {
    positive: [
      '*smiles* "Haha, maybe. What about you?"',
      '*laughs a bit* "Okay, that\'s actually pretty true."',
      '"Fair enough. You\'re not totally off."',
      '*smiles* "You could say that. Why do you ask?"',
    ],
    neutral: [
      '"Maybe. What makes you say that?"',
      '"Hmm, interesting observation."',
      '*thinks* "I don\'t know... maybe?"',
    ],
    deflect: [
      '"Okay?"',
      '"Yeah..."',
      '"I don\'t know."',
      '*short pause* "Sure."',
    ],
    skeptical: [
      '*raises eyebrow* "That was... something to say."',
      '"Uh, okay?"',
      '*looks skeptical* "Right."',
    ],
  },
}

export function pickResponse(
  quality: "positive" | "neutral" | "deflect" | "skeptical",
  language: Language
): string {
  const options = RESPONSES[language][quality]
  return options[Math.floor(Math.random() * options.length)]
}
```

---

## 7. Service Integration (src/scenarios/scenariosService.ts)

Add imports:
```typescript
import {
  generateKeepItGoingScenario,
  generateKeepItGoingIntro,
} from "./keepitgoing/generator"
import { evaluateKeepItGoingResponse } from "./keepitgoing/evaluator"
import { pickResponse } from "./keepitgoing/data/responses"
```

In `handleChatMessage`, add routing:
```typescript
const keepItGoingScenario =
  scenario_type === "keep-it-going"
    ? generateKeepItGoingScenario(archetype, difficulty, scenarioSeed, "da") // or get from user prefs
    : null

// In isFirstMessage block:
if (scenario_type === "keep-it-going" && keepItGoingScenario) {
  return {
    text: generateKeepItGoingIntro(keepItGoingScenario),
    archetype: archetype.name,
    difficulty,
    isIntroduction: true,
  }
}

// In placeholder response section:
if (scenario_type === "keep-it-going" && keepItGoingScenario) {
  const evaluation = evaluateKeepItGoingResponse(request.message, keepItGoingScenario.language)
  const quality = evaluation.small.score >= 7 ? "positive" :
                  evaluation.small.score >= 5 ? "neutral" :
                  evaluation.small.score >= 3 ? "deflect" : "skeptical"
  const response = pickResponse(quality, keepItGoingScenario.language)
  // ...
}
```

---

## 8. API Route (app/api/scenarios/chat/route.ts)

```typescript
const ScenarioTypeSchema = z.enum([
  "practice-openers",
  "practice-career-response",
  "practice-shittests",
  "keep-it-going",  // ADD
])
```

---

## Implementation Checklist

1. [x] Add `"keep-it-going"` to types.ts (ScenarioType, ScenarioId, ChatScenarioType)
2. [x] Add to catalog.ts + hooking phase
3. [x] Create `src/scenarios/keepitgoing/` folder
4. [x] Create `data/situations.ts` with 5 situations (both languages)
5. [x] Create `data/responses.ts` with response templates (both languages) - close responses included
6. [x] Create `generator.ts` with phase tracking
7. [x] Create `evaluator.ts` with language-specific patterns
8. [x] Create `types.ts` for all module types
9. [x] Create `index.ts` exports
10. [x] Integrate in `scenariosService.ts`
11. [x] Update API route schema
12. [x] Run `npm test` - all 748 tests pass
13. [ ] Manual test in browser

---

## Example Full Interaction (Danish)

**System intro:**
```
STED: Boghandel. Hun kigger på bøger.

DU ÅBNEDE: "Hey - to sekunder. Du så ud som om du faktisk læste bagsiden."

HENDE: "Ja?" *kigger op, lidt skeptisk*

---
Din tur.
```

**User:** "De fleste faker det. Du virkede ægte interesseret."

**Evaluation:** Score 8/10 - Statement ✅, Observation ✅

**Her:** *smiler lidt* "Haha, måske. Hvad med dig?"

**User:** "Jeg læser kun bagsider. Aldrig selve bogen."

**Evaluation:** Score 7/10 - Playful statement ✅

**Her:** *griner* "Okay, det er faktisk ret sjovt. Hvad hedder du?"

*... conversation continues ...*

---

## Decisions

| Question | Decision |
|----------|----------|
| LLM or placeholder? | **Placeholder first** |
| Situations? | **5** (bookstore, café, street, metro, mall) |
| Languages? | **Danish + English** |
| Turns? | **~20** (user drives until close) |

---

## Additional: Her Questions Back

When she asks a question back ("Hvad med dig?", "What about you?"), responses should reflect this:

```typescript
const HER_QUESTIONS = {
  da: [
    '"Hvad med dig?" *nysgerrig*',
    '"Og dig? Hvad laver du?" *smiler*',
    '"Okay, men hvem er du egentlig?"',
    '"Du er mystisk. Hvad hedder du?"',
  ],
  en: [
    '"What about you?" *curious*',
    '"And you? What do you do?" *smiles*',
    '"Okay, but who are you actually?"',
    '"You\'re mysterious. What\'s your name?"',
  ],
}
```

**Triggered when:** Score >= 7 for 2+ consecutive turns (she's investing).

---

## Additional: Conversation Phase Tracking

Track phase based on turn count + content:

```typescript
function getPhase(turnCount: number, userMessage: string): ConversationPhase {
  // Check for close attempt
  if (isCloseAttempt(userMessage)) return "close"

  // Phase by turn count
  if (turnCount <= 4) return "hook"
  if (turnCount <= 12) return "vibe"
  if (turnCount <= 18) return "invest"
  return "close"
}

// Close patterns
const CLOSE_PATTERNS = {
  da: [
    /hvad er dit nummer/i,
    /giv mig dit nummer/i,
    /lad os tage en kaffe/i,
    /skal vi bytte numre/i,
    /jeg skal videre/i,
  ],
  en: [
    /what's your number/i,
    /give me your number/i,
    /let's grab coffee/i,
    /should we exchange numbers/i,
    /i gotta go/i,
  ],
}
```

---

## Additional: Close Response Logic

When user attempts to close:

```typescript
// If score >= 6 throughout conversation → she gives number
// If score 4-5 → she hesitates, maybe gives Instagram instead
// If score < 4 → she declines politely

const CLOSE_RESPONSES = {
  da: {
    success: [
      '*smiler* "Okay, fair nok. Det her er mit nummer..."',
      '"Du er sød. Her." *giver nummer*',
    ],
    hesitant: [
      '"Hmm... har du Instagram? Så kan vi skrive der først."',
      '"Jeg ved ikke... vi har kun snakket i to minutter."',
    ],
    decline: [
      '"Nej tak, men hyggeligt at møde dig."',
      '*smiler høfligt* "Jeg er god, men tak."',
    ],
  },
  en: { /* same structure */ },
}
```

---

## Additional: Suggested Next Line

When evaluation score is low, provide a suggested alternative:

```typescript
function getSuggestedLine(
  userMessage: string,
  context: KeepItGoingContext,
  language: Language
): string | undefined {
  // Only suggest if score < 5
  // Provide a statement-based alternative

  if (language === "da") {
    return "Prøv: \"Du virker som en der [observation].\" i stedet for at spørge."
  }
  return "Try: \"You seem like someone who [observation].\" instead of asking."
}
```

---

## Additional: Session End Summary

After ~20 turns or close attempt, show summary:

```typescript
interface SessionSummary {
  totalTurns: number
  averageScore: number
  statementsUsed: number
  interviewQuestionsUsed: number
  diggingQuestionsUsed: number
  closeSuccessful: boolean
  topStrength: string
  topImprovement: string
}
```
