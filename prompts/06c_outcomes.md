# Prompt: Outcome & Quality Assessment (06c)

Version: 1.0.0
Updated: 30-01-2026

## Task

Determine the interaction outcome and assess overall quality.

## Input

```json
{
  "interaction_id": 1,
  "conversation_id": 1,
  "turns": [
    {"index": 0, "speaker": "coach", "text": "Hey, I noticed you..."},
    ...
    {"index": 15, "speaker": "coach", "text": "Let me get your number, we should grab coffee sometime"},
    {"index": 16, "speaker": "target", "text": "Sure! It's 555-1234"},
    {"index": 17, "speaker": "coach", "text": "Cool, I'll text you. Have a great rest of your day!"}
  ],
  "phases": {
    "opener": {"start_turn": 0, "end_turn": 1},
    "attraction": {"start_turn": 2, "end_turn": 9},
    "connection": {"start_turn": 10, "end_turn": 14},
    "close": {"start_turn": 15, "end_turn": 17}
  },
  "techniques_used": ["direct_opener", "cold_read", "tease", "qualification", "number_close"]
}
```

## Output Format

Return valid JSON only:

```json
{
  "interaction_id": 1,
  "conversation_id": 1,
  "outcome": "number",
  "outcome_confidence": 0.95,
  "interaction_quality": {
    "overall_score": 7.5,
    "strengths": [
      "Strong opener with clear intent",
      "Good use of cold reads to create intrigue",
      "Smooth transition to close"
    ],
    "areas_for_improvement": [
      "Could have built more connection before closing",
      "Missed opportunity for instant date"
    ]
  }
}
```

## Outcome Definitions

### number
Phone number obtained. Explicit number exchange.
- **Signals**: Digits shared, "let me get your number", phone handed over

### instagram
Social media exchanged instead of phone number.
- **Signals**: "What's your Instagram", username shared

### instant_date
Extended to immediate date (coffee, walk, etc.).
- **Signals**: "Let's grab coffee right now", continued together

### rejection
Clear rejection received.
- **Signals**: "I have a boyfriend", "not interested", walks away

### soft_close
Vague future mentioned but no concrete exchange.
- **Signals**: "We should hang out sometime" without actual exchange

### blowout
Immediate harsh rejection before conversation developed.
- **Signals**: Immediate "no thanks", dismissive, walks away quickly

### interrupted
Interaction cut short by external factors.
- **Signals**: Friend pulls her away, bus arrives, phone call

### unknown
Outcome unclear from video. Video cuts, unclear ending.
- **Signals**: Fade out, commentary takes over, ambiguous ending

## Quality Assessment Guidelines

### Scoring (1-10)
- 1-3: Poor execution, multiple mistakes, uncomfortable vibe
- 4-5: Basic competence, some good moments, notable issues
- 6-7: Solid execution, good flow, minor areas for improvement
- 8-9: Excellent game, smooth transitions, strong presence
- 10: Exceptional, textbook example of great game

### Strengths to Look For
- Strong opener with clear intent
- Good calibration to her responses
- Smooth phase transitions
- Appropriate use of techniques
- Natural conversation flow
- Good physical/vocal presence

### Areas for Improvement
- Missed escalation windows
- Talked too much / not enough
- Weak close timing
- Didn't build enough attraction/connection
- Overcomplicated techniques
- Nervous behaviors

## Confidence Guidelines

- 0.9-1.0: Explicit outcome (number read aloud, clear rejection)
- 0.7-0.9: Strong inference (implied success, context clues)
- Below 0.7: Use "unknown" if genuinely unclear

## Edge Cases

- **Multiple close attempts**: Count the final result
- **Number + instagram**: Use "number" as primary
- **Soft rejection then number**: Use "number"
- **Video cuts during close**: Use "unknown"
