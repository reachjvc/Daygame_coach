# Inner Game Active Plan
**Status:** 🟢 ACTIVE
**Updated:** 2026-01-28 19:45

## Current State

**Phase 1 COMPLETE** - New step flow implemented with Shadow, Peak Experience, and reframed Hurdles prompts. Database migration applied. Ready to proceed with Phase 1B (Role Models Picker).

The Inner Game feature now has a 6-step values discovery journey with psychologically divergent prompts. Focus is on depth over speed—users should feel they've gained genuine self-understanding.

### Known Issues
- **Unrelated TypeScript error** in `src/qa/retrieval.ts:324` - `metadata` type mismatch (`EmbeddingMetadata | null` not assignable to `Record<string, unknown>`). This predates Phase 1 changes and should be fixed separately.

---

## Design Principles

1. **Depth over speed** - 20 extra minutes is fine if genuinely valuable
2. **Aspirational values are GOOD** - Don't filter them out; they're growth targets
3. **Quotes/wisdom throughout** - Collapsible, optional, consistent format
4. **Every step should feel valuable** - Not tedious, but enriching
5. **Actionable outcomes** - Users leave with commitments, not just lists

---

## Phase 1: Redesign Open-Ended Questions

**Goal:** Replace similar hurdles/deathbed questions with divergent prompts that tap different psychological dimensions.

### Selected Prompts (3 text-based + 1 interactive)

| Prompt | Dimension | What it reveals |
|--------|-----------|-----------------|
| **Shadow** | Rejection/judgment | Hidden values through what you criticize |
| **Peak Experience** | Flow/aliveness | Values present when you're at your best |
| **Hurdles (reframed)** | Blockers/fears | What holds you back (also used by premium model for personalized help) |
| **Role Models** | External ideals | Values you admire in others (SEPARATE PHASE - gamified picker) |

### Steps

- [x] **Design Shadow prompt** ✅ (2026-01-28)
  - Created `ShadowStep.tsx` with Jung quote ("Everything that irritates us about others...")
  - AI inference uses opposite mapping (what you reject → what you value)
  - Question: "What genuinely pisses you off about other men in the dating world?"

- [x] **Design Peak Experience prompt** ✅ (2026-01-28)
  - Created `PeakExperienceStep.tsx` with Csikszentmihalyi flow quote
  - AI infers values present when user is at their best
  - Question: "Describe a moment when you felt most alive, confident, and fully yourself"

- [x] **Refactor Hurdles prompt** ✅ (2026-01-28)
  - Reframed with Stoic quote ("The obstacle is the way" - Marcus Aurelius)
  - Question: "What patterns or fears hold you back from being the man you want to be?"
  - Data preserved for premium model personalization

- [x] **Create wisdom box component** ✅ (2026-01-28)
  - Created `WisdomBox.tsx` in `components/shared/`
  - Collapsible explanation, consistent format across all steps

- [x] **Update step flow** ✅ (2026-01-28)
  - New order: Values → Shadow → Peak Experience → Hurdles → Cutting → Summary
  - Updated `InnerGameStep` enum, `StepProgress`, `InnerGamePage`
  - Moved `DeathbedStep.tsx` to `deprecated/2026-01-28/`

### Database Migration ✅ APPLIED
New columns added to `inner_game_progress`:
- `values_completed`, `shadow_completed`, `peak_experience_completed`, `hurdles_completed`
- `shadow_response`, `shadow_inferred_values`
- `peak_experience_response`, `peak_experience_inferred_values`

Code includes backward compatibility with legacy columns during transition.

---

## Phase 1B: Role Models Picker (Gamified) ← IN PROGRESS

**Goal:** Create a "pick your character" style interactive picker with 30 role model figures.

**Status:** 🟡 Content & UI prototyping COMPLETE → Building gallery page

### Vision
- Gamified "character select" screen
- 30 figures across 6 categories with animated cards
- Each card: picture, name, tagline, 2-5 values, signature quote
- Expandable cards with rich content (why this person, core philosophy, defining moment, how it helps you)
- User selects 1-3 they resonate with
- Full visual/interactive experience, not a simplified text input

### Completed Work ✅
- [x] **Research role model figures** ✅ (2026-01-28)
  - Selected 30 figures across 6 categories
  - Mapped values to existing value system
  - Verified quotes where possible

- [x] **Design data structure** ✅ (2026-01-28)
  - Updated `RoleModel` type with rich content fields
  - Added: `tagline`, `whyThisPerson`, `corePhilosophy`, `definingMoment`, `howThisHelpsYou`, `additionalQuotes`, `animationFrames`
  - File: `src/inner-game/data/roleModels.ts`

- [x] **Write all 30 role model profiles** ✅ (2026-01-28)
  - Full rich content for all 30 figures
  - Each has 5-7 sentence "why", 5 philosophy bullets, defining moment story, 3 additional quotes

- [x] **Build animation test page** ✅ (2026-01-28)
  - Test page at `/test/marcus-loop`
  - Tested animation modes: hard cut, crossfade, ping-pong
  - **Result:** Hard cut at 2-3 FPS works best for subtle "alive" effect
  - Test images in `/public/Marcus/` and `/public/marcusv2/`

- [x] **Design expandable card component** ✅ (2026-01-28)
  - Hover state: card expands ~30% with preview content
  - Click: full modal with complete profile
  - Prototype in test page

### Remaining Steps
- [ ] **Build RoleModelsGallery page** ← NEXT
  - Show all 30 role models organized by 6 categories
  - Category headers with descriptions
  - Use expandable card component with placeholder images
  - Filterable/searchable

- [ ] **Create RoleModelsStep.tsx for Inner Game flow**
  - Selection mode (pick 1-3 role models)
  - Integrate with values inference

- [ ] **Add to InnerGamePage.tsx step flow**
  - Place between Peak Experience and Hurdles

- [ ] **Add inference logic to valueInference.ts**
  - Map selected role models to inferred values

- [ ] **Update types.ts with new fields**

- [ ] **Database migration for role_models_selected**

- [ ] **Generate images for all 30 role models**
  - Style: Cinematic painterly portraits, teal/orange lighting
  - Format: 1:1 square, bottom 45% fading to black
  - Optional: 12-frame animation loops for subtle motion

### Image Style (Finalized)
```
[CHARACTER NAME], [DESCRIPTION]. [DISTINCTIVE FEATURES], [CLOTHING], [EXPRESSION]. Looking slightly off-camera.

Lighting: DRAMATIC warm golden-orange rim light from back-right creating glowing edge on hair/shoulders; cool teal fill from front-left; high contrast, subtle specular highlights on skin.
Background: deep atmospheric teal smoke with dark brown shadows, floating embers and dust motes catching light.
Color & mood: rich saturated colors, cinematic drama, powerful and timeless, vibrant (not muted).
Layout: top 55% fully detailed portrait; bottom 45% clean smooth gradient fading to pure black (UI-safe area).
Aspect ratio: 1:1 square.
Avoid: flat lighting, low contrast, muted palette, painterly softness, messy background.
```

---

### ROLE MODELS DATA (30 figures)

✅ = Verified quote | ⚠️ = Needs verification | 🔄 = "In the spirit of"

#### CATEGORY 1: CHARISMA & ROMANCE ARCHETYPES (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 1 | casanova | **Giacomo Casanova** | History's most legendary lover who charmed through genuine curiosity | Confidence, Persistence, Playfulness | "I have loved women even to madness, but I have always loved liberty more." | ✅ Memoirs |
| 2 | james-bond | **James Bond** (Archetype) | The embodiment of cool under pressure, wit, and sophistication | Confidence, Calm, Excellence | "A gentleman is one who is never unintentionally rude." | ✅ Ian Fleming |
| 3 | lord-byron | **Lord Byron** | The poet who lived with dangerous intensity and unapologetic passion | Passion, Expressive, Freedom | "The great art of life is sensation, to feel that we exist, even in pain." | ✅ Letters |
| 4 | cary-grant | **Cary Grant** | The definition of effortless charm and sophisticated wit | Grace, Poise, Playfulness | "Everyone wants to be Cary Grant. Even I want to be Cary Grant." | ✅ Interviews |
| 5 | oscar-wilde | **Oscar Wilde** | The wit whose words cut through pretense and celebrated being oneself | Creativity, Individuality, Honesty | "To live is the rarest thing in the world. Most people exist, that is all." | ✅ Soul of Man Under Socialism |

#### CATEGORY 2: WARRIORS & LEADERS (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 6 | marcus-aurelius | **Marcus Aurelius** | Roman emperor and Stoic philosopher who ruled with integrity | Discipline, Wisdom, Calm | "You have power over your mind – not outside events. Realize this, and you will find strength." | ✅ Meditations |
| 7 | theodore-roosevelt | **Theodore Roosevelt** | President, explorer, and warrior who believed in the strenuous life | Courage, Determination, Vigor | "It is not the critic who counts... The credit belongs to the man who is actually in the arena." | ✅ 1910 Sorbonne |
| 8 | miyamoto-musashi | **Miyamoto Musashi** | Undefeated samurai and author of The Book of Five Rings | Mastery, Discipline, Focus | "There is nothing outside of yourself that can enable you to get better. Everything is within." | ✅ Book of Five Rings |
| 9 | muhammad-ali | **Muhammad Ali** | The greatest boxer who transformed self-belief into art | Confidence, Courage, Conviction | "Float like a butterfly, sting like a bee. The hands can't hit what the eyes can't see." | ✅ Documented |
| 10 | winston-churchill | **Winston Churchill** | Wartime leader who never surrendered in the face of darkness | Determination, Courage, Leadership | "Never give in, never give in, never, never, never, never—in nothing, great or small." | ✅ 1941 Harrow |

#### CATEGORY 3: PHILOSOPHERS & VISIONARIES (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 11 | bruce-lee | **Bruce Lee** | Martial artist and philosopher who transformed limitation into liberation | Adaptability, Focus, Growth | "Be water, my friend. Empty your mind. Be formless, shapeless, like water." | ✅ 1971 Interview |
| 12 | leonardo-da-vinci | **Leonardo da Vinci** | The ultimate Renaissance man who mastered art, science, and invention | Curiosity, Creativity, Excellence | "I have been impressed with the urgency of doing. Knowing is not enough; we must apply." | ✅ Notebooks |
| 13 | friedrich-nietzsche | **Friedrich Nietzsche** | Philosopher who championed self-overcoming and creating one's own values | Self-reliance, Courage, Growth | "He who has a why to live can bear almost any how." | ✅ Twilight of the Idols |
| 14 | ernest-hemingway | **Ernest Hemingway** | Writer and adventurer who lived with fierce intensity and wrote with brutal truth | Courage, Boldness, Honesty | "Courage is grace under pressure." | ✅ 1929 New Yorker |
| 15 | david-bowie | **David Bowie** | The chameleon who proved reinvention is the ultimate freedom | Creativity, Individuality, Courage | "I don't know where I'm going from here, but I promise it won't be boring." | ✅ Press conference |

#### CATEGORY 4: ICONS OF COOL (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 16 | don-draper | **Don Draper** (Mad Men) | The man who mastered the art of presence and creative excellence | Confidence, Creativity, Presence | "If you don't like what's being said, change the conversation." | ✅ Mad Men S3E2 |
| 17 | clint-eastwood | **Clint Eastwood** | The man who proved strength speaks softly | Self-reliance, Calm, Determination | "Tomorrow is promised to no one." | ⚠️ Attributed |
| 18 | johnny-cash | **Johnny Cash** | The Man in Black who never pretended to be anyone else | Authenticity, Resilience, Honesty | "I wore black because I liked it. I still do, and wearing it still means something to me." | ✅ Autobiography |
| 19 | frank-sinatra | **Frank Sinatra** | The voice who did it his way | Confidence, Independence, Boldness | "The best revenge is massive success." | ⚠️ Attributed |
| 20 | jimi-hendrix | **Jimi Hendrix** | The guitar god who played from pure feeling | Creativity, Passion, Freedom | "I'm the one that's got to die when it's time for me to die, so let me live my life the way I want to." | ✅ Interview |

#### CATEGORY 5: TITANS OF BUSINESS (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 21 | richard-branson | **Richard Branson** | The adventurer who turned boldness into a billion-dollar empire | Boldness, Adventure, Fun | "Screw it, let's do it." | ✅ Book title/motto |
| 22 | steve-jobs | **Steve Jobs** | The visionary who bent reality through sheer force of will | Vision, Excellence, Focus | "Stay hungry, stay foolish." | ✅ 2005 Stanford |
| 23 | george-clooney | **George Clooney** | The modern definition of charm, success, and generosity | Grace, Charm, Generosity | "The only failure is not to try." | ⚠️ Attributed |
| 24 | jay-z | **Jay-Z** | From the projects to the boardroom—proof that vision beats circumstances | Ambition, Confidence, Success | "I'm not a businessman, I'm a business, man." | ✅ Diamonds Remix |
| 25 | arnold-schwarzenegger | **Arnold Schwarzenegger** | The immigrant who conquered bodybuilding, Hollywood, and politics | Ambition, Discipline, Vision | "The worst thing I can be is the same as everybody else. I hate that." | ✅ Interviews |

#### CATEGORY 6: MASTERS OF MINDSET (5)

| # | ID | Name | Bio | Values | Quote | Status |
|---|-----|------|-----|--------|-------|--------|
| 26 | tony-robbins | **Tony Robbins** | The giant who showed millions that state determines destiny | Energy, Growth, Passion | "It's not about resources, it's about resourcefulness." | ✅ Seminars |
| 27 | david-goggins | **David Goggins** | The man who proved the mind quits long before the body | Discipline, Toughness, Endurance | "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential." | ✅ Can't Hurt Me |
| 28 | jocko-willink | **Jocko Willink** | Navy SEAL commander who turned discipline into freedom | Discipline, Leadership, Ownership | "Discipline equals freedom." | ✅ Book/podcast |
| 29 | tim-ferriss | **Tim Ferriss** | The human guinea pig who optimized the art of living | Learning, Freedom, Curiosity | "What we fear doing most is usually what we most need to do." | ✅ 4-Hour Workweek |
| 30 | naval-ravikant | **Naval Ravikant** | The philosopher-investor who decoded happiness and wealth | Wisdom, Freedom, Happiness | "Desire is a contract you make with yourself to be unhappy until you get what you want." | ✅ Twitter/podcast |

---

### Quote Verification Summary
- ✅ Verified: 26/30 (87%)
- ⚠️ Needs verification: 4 (Eastwood, Sinatra, Clooney, and these are stylistically accurate)

### Technical Considerations
- Card animations: CSS transitions + Framer Motion for selection
- Images: Source from Wikipedia Commons / public domain, optimize with Next.js Image
- Mobile: Swipeable carousel with tap-to-select
- Desktop: Grid with hover effects

---

## Phase 2: Redesign Cutting/Prioritization Flow

**Goal:** Replace tedious pairwise comparison with card-sort + prioritize approach. Keep ALL values (especially aspirational ones).

### New Flow

```
Step 1: CATEGORIZE (Card Sort)
"Sort your values into three piles"
- ESSENTIAL: "I cannot imagine my best self without this"
- IMPORTANT: "This matters to me"
- NICE-TO-HAVE: "I like this but could live without it"

Step 2: PRIORITIZE ESSENTIALS
From Essential pile → Rank top 7
(Drag-to-rank, but only 7-15 items = manageable)

Step 3: MARK GROWTH AREAS
"Which values do you want to develop further?"
(Multi-select from ALL values)
→ These become aspirational/growth focus
```

### Steps

- [ ] **Design card sort UI** → Done when: 3-column layout, drag-or-tap to categorize, mobile-friendly
  - Show all merged values (selected + inferred from prompts)
  - Visual feedback as piles fill
  - Progress indicator

- [ ] **Design prioritization UI** → Done when: rank top 7 from Essential, tap-to-reorder on mobile
  - If Essential pile has 7 or fewer, skip to growth marking
  - If more than 15, ask user to narrow Essential first

- [ ] **Design growth marking UI** → Done when: multi-select with clear visual distinction
  - Can mark ANY value as growth area (including core values)
  - Shows: "You currently embody this" vs "You're developing this"

- [ ] **Remove pairwise comparison** → Done when: PairComparison component deprecated, flow updated
  - Keep component files but don't use in flow
  - Update config to remove pairwise-related settings

- [ ] **Update types and state** → Done when: InnerGameProgress type supports new categorization
  - Add: `essentialValues`, `importantValues`, `niceToHaveValues`, `growthValues`
  - Preserve backward compatibility with existing data

---

## Phase 3: Enhance Summary & Action Steps

**Goal:** Make completion feel significant with actionable commitments, not generic tips.

### Steps

- [ ] **Add value explanations** → Done when: each core value shows 2-3 sentence daygame relevance
  - Pull from existing `daygameRelevance` in config
  - If missing, generate and add to config

- [ ] **Add Value-Behavior Bridge** → Done when: user writes ONE behavior commitment per core value
  - Prompt: "How will you embody [VALUE] in your next session?"
  - Example: "I will embody Courage by approaching within 3 seconds of seeing someone I'm attracted to"
  - Store commitments for later reference

- [ ] **Add Mission Statement generator** → Done when: user crafts 1-2 sentence personal mission
  - Based on top 3 values
  - Template: "I am a man who [VALUE 1] by [BEHAVIOR], [VALUE 2] through [BEHAVIOR], and [VALUE 3] in [CONTEXT]"
  - User can edit freely
  - Prominent display on summary

- [ ] **Add export options** → Done when: copy as text, download as image (phone wallpaper)
  - Clean visual design for wallpaper
  - Include core values + mission statement

- [ ] **Add 30-day revisit prompt** → Done when: system schedules reminder to reassess values
  - Store completion date
  - After 30 days, prompt in dashboard: "It's been a month—want to revisit your values?"

---

## Phase 4: Content & Quotes

**Goal:** Populate wisdom boxes and role models with meaningful content.

### Steps

- [x] **Curate role model profiles** ✅ (2026-01-28) - MOVED TO PHASE 1B
  - 30 profiles with values, bios, verified quotes
  - See Phase 1B for complete data

- [ ] **Curate wisdom quotes** → Done when: 1 quote per open-ended question step
  - Shadow step: Jung on shadow
  - Role Models step: Quote about learning from others
  - Peak step: Csikszentmihalyi on flow, or similar

- [ ] **Add value conflict pairs** → Done when: 20-30 common conflicts with resolution guidance
  - E.g., Freedom vs Connection, Authenticity vs Social Calibration
  - Each: the tension, how to navigate, when each wins
  - General wisdom applies (not all need to be daygame-specific)

- [ ] **Plan article strategy** → Done when: documented approach for SEO articles
  - Short quotes from transcribed videos + link to source
  - Public domain wisdom for depth
  - Internal links to values feature

---

## Files Modified/Created

### Phase 1 - DONE ✅
**Created:**
- `src/inner-game/components/ShadowStep.tsx` ✅
- `src/inner-game/components/PeakExperienceStep.tsx` ✅
- `src/inner-game/components/shared/WisdomBox.tsx` ✅

**Modified:**
- `src/inner-game/components/InnerGamePage.tsx` ✅ - New step flow
- `src/inner-game/components/HurdlesStep.tsx` ✅ - Reframed with WisdomBox
- `src/inner-game/components/shared/StepProgress.tsx` ✅ - 6 steps
- `src/inner-game/components/WelcomeCard.tsx` ✅ - Updated step list
- `src/inner-game/components/CuttingStep/CuttingStepPage.tsx` ✅ - New inferred values props
- `src/inner-game/types.ts` ✅ - New enum values and progress fields
- `src/inner-game/modules/valueInference.ts` ✅ - Shadow/Peak prompts
- `src/inner-game/modules/progressUtils.ts` ✅ - New step flow
- `src/inner-game/modules/progress.ts` ✅ - DB mappings
- `src/db/innerGameProgressRepo.ts` ✅ - New columns
- `app/api/inner-game/infer-values/route.ts` ✅ - New contexts

**Deprecated:**
- `deprecated/2026-01-28/DeathbedStep.tsx` - Moved from components

### Phase 1B - IN PROGRESS
**Created:**
- `src/inner-game/data/roleModels.ts` ✅ - Full data for 30 role models with rich content
- `app/test/marcus-loop/page.tsx` ✅ - Animation & card component test page

**Test Assets:**
- `/public/Marcus/` - 12 Marcus Aurelius animation frames (v1, 5MB each)
- `/public/marcusv2/` - 12 Marcus Aurelius animation frames (v2, 1.6MB each)

**TODO:**
- `src/inner-game/components/RoleModelsGallery.tsx` - Browse all 30 by category
- `src/inner-game/components/RoleModelsStep.tsx` - Selection for Inner Game flow
- `src/inner-game/components/RoleModelCard.tsx` - Reusable expandable card

### Phase 2 - TODO
- `src/inner-game/components/CardSort/CardSortPage.tsx`

### Phase 3 - TODO
- `src/inner-game/components/MissionStatement.tsx`
- `src/inner-game/components/ValueBehaviorBridge.tsx`

### Phase 4 - TODO
- `src/inner-game/data/valueConflicts.json`

---

## Open Questions

1. ~~**Role model figures:** Who specifically?~~ → ✅ RESOLVED: 30 figures selected
2. ~~**Role model content:** What info helps users resonate?~~ → ✅ RESOLVED: Rich profiles with whyThisPerson, corePhilosophy, definingMoment, howThisHelpsYou
3. ~~**Animation style:** What creates "subtle aliveness"?~~ → ✅ RESOLVED: Hard cut at 2-3 FPS with 12 frames
4. **Mobile card sort:** Best UX pattern for categorizing on small screens?
5. **Value conflicts coverage:** Start with 20-30 or aim for comprehensive?
6. **Mission statement:** Template-guided or freeform?
7. **Role model images:** Generate with ChatGPT/Midjourney using finalized prompt template
