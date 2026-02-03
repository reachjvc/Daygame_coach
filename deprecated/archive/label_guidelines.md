# Label Guidelines

Status: Draft
Updated: 31-01-2026 04:00 - Initial draft created for all taxonomy items (v1.2.0)

## Purpose

Clear definitions for consistent labeling by AI and human reviewers. Each item includes:
- **Definition**: What it is
- **Examples**: Typical instances
- **Boundary cases**: What it is NOT / disambiguation

Taxonomy version: v1.2.0 (62 items total)

---

## 1. Phases (4)

Phases are sequential stages within an interaction. An interaction progresses through these phases (though not all phases may be present).

### open
**Definition**: Initial approach and first contact. The coach initiates conversation with the target.
**Typical turns**: 1-3
**Markers**: Physical approach, first words, establishing presence
**Examples**:
- "Hey, I just saw you walking by and had to say something"
- "Excuse me, quick question..."
**Ends when**: Target responds with more than a single word/acknowledgment

### pre_hook
**Definition**: Coach working to engage her interest. Target responds briefly but isn't yet invested.
**Typical turns**: 3-10
**Markers**: Short target responses, coach doing most of the work, testing/probing
**Examples**:
- Coach teasing, target giving polite but short answers
- Coach stacking topics to find something that hooks
**Ends when**: Target asks a question OR gives an extended response (hook_point)

### post_hook
**Definition**: Target is invested. Mutual exchange begins.
**Typical turns**: 5-30+
**Markers**: Target asks questions, shares unprompted info, laughs genuinely, extended responses
**Examples**:
- Target: "So what do you do?" (asking about him)
- Target sharing a story without being asked
**Ends when**: Coach initiates closing sequence

### close
**Definition**: Asking for contact info or date.
**Typical turns**: 2-5
**Markers**: Number/Instagram request, instant date proposal, time bridge
**Examples**:
- "We should grab coffee sometime"
- "What's your Instagram?"
**Ends when**: Interaction ends (contact exchanged, rejection, or parting)

### hook_point (marker, not a phase)
**Definition**: The moment target becomes invested (transition from pre_hook to post_hook)
**Signals**: First genuine question from target, extended unprompted sharing, genuine laughter
**Note**: Recorded as `turn_index` within the phases object

---

## 2. Techniques (31)

Techniques are specific verbal/behavioral tactics used by the coach. Multiple techniques can occur in one turn.

### Openers (5)

| Technique | Definition | Example | NOT this |
|-----------|------------|---------|----------|
| **direct_opener** | Explicit statement of attraction/interest | "I think you're cute" | Indirect compliment on style |
| **indirect_opener** | Question/comment not revealing romantic intent | "Do you know where the coffee shop is?" | Situational observation |
| **situational_opener** | Comment on shared environment/situation | "This line is taking forever" | Direct compliment |
| **observation_opener** | Specific observation about her | "You have a very artistic vibe" | Generic "you're pretty" |
| **gambit** | Pre-prepared opinion opener or routine | "Quick opinion - is it weird if..." | Spontaneous question |

**Disambiguation**:
- `observation_opener` vs `direct_opener`: Observation is specific and curious; direct is explicitly romantic
- `situational_opener` vs `observation_opener`: Situational is about context; observation is about her

### Attraction (9)

| Technique | Definition | Example | NOT this |
|-----------|------------|---------|----------|
| **push_pull** | Mixed signals - compliment + tease/qualifier in sequence | "You're cute, but you seem like trouble" | Pure compliment OR pure tease |
| **tease** | Playful challenge without genuine criticism | "Oh no, you're one of THOSE people" | Mean-spirited insult |
| **cold_read** | Assumption about her personality/life | "I bet you're the responsible friend" | Asking a direct question |
| **role_play** | Creating imaginary scenario together | "We'd be a terrible couple, always fighting over pizza toppings" | Stating a fact |
| **disqualification** | Explicitly stating she's not his type (playfully) | "You're too young/old/innocent for me" | Genuine rejection |
| **DHV** | Demonstrating higher value through story/action | Story about adventure, leadership, social proof | Direct bragging |
| **frame_control** | Defining/maintaining interpretation of interaction | "We're not flirting, we're just having a conversation" | Agreeing with her frame |
| **takeaway** | Threatening to end interaction (playfully) | "I'm leaving" (while staying) | Actually leaving |
| **false_time_constraint** | Indicating limited time to reduce pressure | "I only have a minute but..." | Genuine time limit |

**Disambiguation**:
- `push_pull` requires BOTH push AND pull in close proximity
- `tease` is playful; if it could genuinely hurt feelings, it's not a tease
- `DHV` must be embedded in story/action, not bragging

### Connection (8)

| Technique | Definition | Example | NOT this |
|-----------|------------|---------|----------|
| **qualification** | Getting her to prove herself/seek approval | "What's interesting about you?" | Asking about hobbies |
| **statement_of_intent** | Direct expression of intentions/feelings | "I want to take you on a date" | Casual "we should hang" |
| **grounding** | Sharing relatable personal info to build rapport | "I just moved here from London" | Deep emotional story |
| **storytelling** | Extended narrative for entertainment/connection | Multi-sentence story with structure | Brief factual answer |
| **vulnerability** | Sharing genuine emotion/insecurity | "I was nervous to talk to you" | Fake vulnerability for effect |
| **callback_humor** | Referencing earlier moment in conversation | "Like your pizza obsession earlier" | New joke |
| **screening** | Evaluating her for compatibility | "Do you like adventure?" (genuinely caring about answer) | Qualification (approval-seeking) |
| **appreciation** | Genuine positive comment on her qualities | "I love that you're so direct" | Flattery to get something |

**Disambiguation**:
- `qualification` makes her seek YOUR approval; `screening` is YOU evaluating HER
- `grounding` is brief rapport; `storytelling` is extended narrative
- `vulnerability` must be genuine, not strategic

### Compliance (1)

| Technique | Definition | Example | NOT this |
|-----------|------------|---------|----------|
| **compliance** | Getting her to do small actions/agree | "Come with me to see this" / "Hold this" | Asking a question |

**Note**: Includes both compliance tests (small asks) and compliance ladders (escalating asks). Consolidated from v1.1.

### Closing (8)

| Technique | Definition | Example | NOT this |
|-----------|------------|---------|----------|
| **number_close** | Asking for phone number | "What's your number?" | Asking for Instagram |
| **instagram_close** | Asking for Instagram/social media | "What's your Insta?" | Asking for phone |
| **soft_close** | Low-pressure close leaving door open | "Maybe we could hang out sometime" | Direct close |
| **assumptive_close** | Assuming agreement, asking for logistics | "So when are you free this week?" | Asking IF she wants to meet |
| **instant_date** | Proposing immediate continuation | "Let's grab coffee right now" | Time bridge |
| **bounce** | Moving to new location during interaction | "Let's check out that bar" | Instant date (end of interaction) |
| **time_bridge** | Creating reason to meet again in future | "There's an event next week..." | Asking for number without context |
| **logistics_check** | Gathering info for future meeting | "When do you usually have free time?" | Casual conversation about schedule |

**Disambiguation**:
- `instant_date` vs `bounce`: Instant date is proposed at close; bounce is during interaction
- `soft_close` vs `assumptive_close`: Soft is tentative; assumptive presumes yes

---

## 3. Topics (22)

Topics are conversation subjects. Multiple topics can appear in one turn.

### Personal (8)

| Topic | Definition | Example phrases | Exclusions |
|-------|------------|-----------------|------------|
| **name** | Names, nicknames | "What's your name?", "I'm Jonas" | - |
| **origin** | Where from, nationality, ethnicity | "Where are you from?", "I'm Danish" | Current location (living_situation) |
| **career** | Job, work, profession | "What do you do?", "I work in tech" | Education |
| **education** | School, studying, degrees | "What did you study?", "I'm in uni" | Career |
| **hobby** | Interests, hobbies, passions | "I love hiking", "Do you paint?" | Career-related activities |
| **travel** | Travel experiences, destinations | "Have you been to Japan?", "I travel a lot" | Where from (origin) |
| **living_situation** | Where living now, roommates, neighborhood | "I just moved to this area" | Where from (origin) |
| **ambitions** | Goals, dreams, future plans | "I want to start a business" | Current career |

### Appearance (1)

| Topic | Definition | Example phrases | Exclusions |
|-------|------------|-----------------|------------|
| **appearance** | Physical appearance, style, clothing, accessories | "I like your jacket", "You have nice eyes", "Cool tattoo" | Personality traits |

**Note**: Consolidated from v1.1 (style, hair, eyes, height, tattoos, fitness all merged into `appearance`)

### Personality (4)

| Topic | Definition | Example phrases | Exclusions |
|-------|------------|-----------------|------------|
| **personality** | Character traits, temperament | "You seem adventurous", "Are you always this shy?" | Appearance |
| **age** | Age, age-related topics | "How old are you?", "You seem young" | - |
| **behavior** | Actions, habits, tendencies | "Why do you keep looking away?", "You talk fast" | Personality traits |
| **values** | Beliefs, priorities, what matters | "Family is important to me", "What do you value?" | Career ambitions |

### Logistics (5)

| Topic | Definition | Example phrases | Exclusions |
|-------|------------|-----------------|------------|
| **plans** | Current/near-future plans | "What are you up to today?", "Going anywhere tonight?" | Long-term ambitions |
| **contact** | Phone, Instagram, social media | "Give me your number", "What's your Insta?" | - |
| **logistics** | Scheduling, availability, practical details | "When are you free?", "I'm here until Friday" | Plans (what doing) |
| **relationship** | Relationship status, dating life | "Do you have a boyfriend?", "Are you single?" | - |
| **duration** | How long (time references in context) | "How long have you been here?", "I'm here for a week" | - |

### Context (4)

| Topic | Definition | Example phrases | Exclusions |
|-------|------------|-----------------|------------|
| **food_drinks** | Food, restaurants, drinks, coffee | "Want to grab coffee?", "This place has great food" | - |
| **location** | Current place, surroundings, venue | "Do you come here often?", "This street is nice" | Living_situation |
| **humor** | Jokes, banter, funny observations | Jokes, callbacks, playful comments | Techniques (tease, push_pull) |
| **flirting** | Romantic/sexual tension topics | Innuendo, romantic references, tension | Techniques |

**Note**: `humor` and `flirting` are TOPICS (what's being discussed), not TECHNIQUES (how it's said)

---

## 4. Tones (5)

**IMPORTANT**: Tones are classified from AUDIO FEATURES, not text. These rules use acoustic thresholds.

| Tone | % of Data | Audio Signature | Threshold Rules |
|------|-----------|-----------------|-----------------|
| **playful** | 13% | High pitch variation, high energy dynamics | pitch_std > 22 AND energy_dyn > 13 |
| **confident** | 14% | Steady pitch, moderate energy, measured pace | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 |
| **nervous** | 14% | Fast speech, flat pitch | syl_rate > 6.8 AND pitch_std < 16 |
| **energetic** | 12% | High brightness OR high energy | brightness > 1700 OR energy_dyn > 15 |
| **neutral** | 47% | Default (none of above match) | No threshold triggers |

**Note**: Thresholds derived from clustering analysis of 76,224 segments. See [tones_gap.md](PIPELINE/plans/tones_gap.md).

### Feature Definitions

- `pitch_std`: Standard deviation of pitch in Hz (variation in voice pitch)
- `energy_dyn`: Energy dynamics in dB (loudness variation)
- `syl_rate`: Syllable rate (syllables per second = speech speed)
- `brightness`: Spectral brightness in Hz (vocal effort/clarity)

---

## 5. Speaker Labels (4)

| Label | Definition | Markers |
|-------|------------|---------|
| **coach** | The person doing the approach/teaching | Initiating, leading, asking questions |
| **target** | The woman being approached | Responding, being opened |
| **voiceover** | Commentary track (not live audio) | Different audio quality, explanatory |
| **other** | Bystander, friend, anyone else | Not coach or target |

---

## 6. Video Types (4)

| Type | Definition | Markers |
|------|------------|---------|
| **infield** | Live recorded approach footage | Street/venue setting, real-time audio |
| **talking_head** | Single person speaking to camera | Studio/home setting, coaching content |
| **podcast** | Multi-person discussion format | Interview setup, long-form discussion |
| **compilation** | Multiple clips edited together | Frequent cuts, montage style |

---

## 7. Segment Types (5)

| Type | Definition | Markers |
|------|------------|---------|
| **approach** | Active approach segment with target | Coach + target dialogue |
| **commentary** | Coach explaining/analyzing | Single speaker, teaching tone |
| **transition** | Between-segment filler | Walking, moving, non-substantive |
| **intro** | Video introduction | "Hey guys", channel intro |
| **outro** | Video ending | "Like and subscribe", closing remarks |

---

## Labeling Rules

1. **Multiple labels allowed**: A turn can have multiple techniques and multiple topics
2. **Hierarchy**: If unsure between two techniques, prefer the more specific one
3. **Context matters**: Same words can be different techniques based on delivery/intent
4. **Tones are audio-only**: Never infer tone from text content
5. **When in doubt**: Flag for human review (confidence < threshold)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 31-01-2026 | Initial draft for taxonomy v1.2.0 |
