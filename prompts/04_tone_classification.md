# Prompt: Tone Window Classification (04)

Version: 1.0.0
Updated: 30-01-2026

## Task

Classify the dominant tone of a conversation window (30 seconds, 10-second hop).

## Input

You will receive a transcript window with speaker labels:

```json
{
  "window_id": 3,
  "start_time": 30.0,
  "end_time": 60.0,
  "segments": [
    {"speaker": "coach", "text": "Oh so you're one of THOSE people who eat pineapple on pizza"},
    {"speaker": "target", "text": "Haha yes, don't judge me!"},
    {"speaker": "coach", "text": "I'm definitely judging you right now. But in a good way."}
  ]
}
```

## Output Format

Return valid JSON only:

```json
{
  "window_id": 3,
  "tone": {
    "primary": "playful",
    "confidence": 0.88,
    "secondary": "flirty",
    "reasoning": "Light teasing about pizza preference, mutual laughter, positive energy"
  }
}
```

## Tone Definitions

### playful
Light-hearted, joking energy. Uses humor, teasing, or silly observations. Not taking things too seriously.

### confident
Self-assured, grounded presence. Clear statements, unhurried delivery, comfortable with pauses.

### warm
Genuine interest, emotional connection, empathetic listening. Makes the other person feel understood.

### nervous
Uncertain, hesitant, or anxious energy. Filler words, rushed speech, self-doubt.

### grounded
Present, centered, comfortable with silence. Not reactive or seeking validation.

### direct
Straightforward, honest communication. Stating intentions clearly. Can be confrontational.

### flirty
Romantic/sexual undertones. Suggestive, teasing with attraction, creating tension.

### neutral
Neither positive nor negative emotional charge. Informational exchange, logistics, small talk.

## Decision Rules

1. **Focus on delivery, not just content**: "I like you" can be nervous, confident, or flirty
2. **Coach tone takes priority**: We're assessing the coach's vibe
3. **One primary tone**: Pick the dominant one, use secondary for overlap
4. **Context matters**: Early interaction tends toward confident/playful, later toward warm/flirty

## Confidence Guidelines

- 0.8-1.0: Clear, unambiguous tone
- 0.6-0.8: Reasonable inference with some ambiguity
- Below 0.6: Flag for review

## Edge Cases

- **Mixed tones**: Choose dominant, note secondary
- **Very short window**: Less context, lower confidence
- **No coach speech**: Mark as neutral with note
- **Transcript quality issues**: Lower confidence appropriately
