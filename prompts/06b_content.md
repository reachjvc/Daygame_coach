# Prompt: Technique & Topic Extraction (06b)

Version: 1.0.0
Updated: 30-01-2026

## Task

Extract techniques used and topics discussed from an interaction, using only taxonomy-defined labels.

## Input

```json
{
  "interaction_id": 1,
  "conversation_id": 1,
  "turns": [
    {"index": 0, "speaker": "coach", "text": "Hey, I noticed you walking by and thought you looked interesting"},
    {"index": 1, "speaker": "target", "text": "Oh, thanks! That's sweet of you to say"},
    {"index": 2, "speaker": "coach", "text": "You look like you're the creative type. Let me guess... artist? Designer?"},
    {"index": 3, "speaker": "target", "text": "Actually I'm a graphic designer! How did you know?"},
    {"index": 4, "speaker": "coach", "text": "I'm never wrong about these things. Well, sometimes. Like 60% of the time."},
    {"index": 5, "speaker": "target", "text": "Haha that's not very impressive"},
    {"index": 6, "speaker": "coach", "text": "See, we'd never work out. You need someone who's right 100% of the time."}
  ],
  "taxonomy_version": "v1"
}
```

## Output Format

Return valid JSON only:

```json
{
  "interaction_id": 1,
  "conversation_id": 1,
  "techniques_used": [
    {
      "technique": "direct_opener",
      "turn_index": 0,
      "evidence": "I noticed you... thought you looked interesting",
      "confidence": 0.90
    },
    {
      "technique": "cold_read",
      "turn_index": 2,
      "evidence": "You look like you're the creative type",
      "confidence": 0.95
    },
    {
      "technique": "tease",
      "turn_index": 4,
      "evidence": "60% of the time - self-deprecating humor",
      "confidence": 0.80
    },
    {
      "technique": "disqualification",
      "turn_index": 6,
      "evidence": "We'd never work out",
      "confidence": 0.88
    }
  ],
  "topics_discussed": [
    {
      "topic": "career",
      "turn_index": 3,
      "evidence": "graphic designer",
      "confidence": 0.95
    },
    {
      "topic": "personality",
      "turn_index": 2,
      "evidence": "creative type",
      "confidence": 0.85
    }
  ]
}
```

## CRITICAL: Taxonomy-Only Extraction

You MUST only use techniques and topics from the official taxonomy. If something doesn't match, do NOT invent new labels.

### Techniques (42 total)

**Openers**: direct_opener, indirect_opener, situational_opener, observation_opener, gambit

**Attraction**: push_pull, tease, cold_read, role_play, disqualification, neg, DHV, preselection, frame_control, buying_temperature, IOI_recognition, takeaway, reframe, false_disqualifier

**Connection**: qualification, statement_of_intent, grounding, storytelling, vulnerability, callback_humor, screening, appreciation

**Physical**: kino, proximity, false_time_constraint, compliance_test, compliance_ladder

**Closing**: number_close, instagram_close, soft_close, assumptive_close, instant_date, bounce, time_bridge

**Mechanics**: front_stop, side_stop, seated_approach

### Topics (34 total)

**Personal**: origin, career, education, hobby, travel, living_situation, lifestyle, relationship_history, ambitions, social_circle

**Appearance**: appearance, style, hair, eyes, height, tattoos, fitness

**Personality**: personality, energy, age, behavior, values

**Logistics**: plans, contact, logistics, relationship, texting

**Context**: food_drinks, location, weather, events, humor, flirting, pets

## Decision Rules

1. **One technique per turn maximum**: Choose the most prominent
2. **Evidence required**: Quote or paraphrase the relevant text
3. **Coach techniques only**: We're analyzing the coach's game
4. **Multiple topics per turn OK**: Conversations often touch multiple topics

## Confidence Guidelines

- 0.85-1.0: Clear, textbook example
- 0.7-0.85: Reasonable match with some interpretation
- Below 0.7: Flag for review

## Edge Cases

- **Unclear technique**: If it doesn't clearly match taxonomy, don't force it
- **Subtle techniques**: Require evidence in text
- **Topics from context**: Only count if explicitly discussed
