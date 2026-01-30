# Prompt: Interaction Structure & Phases (06a)

Version: 1.1.0
Updated: 30-01-2026

## Task

Extract interaction boundaries and identify conversation phases within each interaction.

## Input

```json
{
  "video_id": "abc123",
  "conversation_id": 1,
  "segments": [
    {"id": 1, "speaker": "coach", "text": "Hey, I noticed you walking by and thought you looked interesting"},
    {"id": 2, "speaker": "target", "text": "Oh, thanks! That's sweet of you to say"},
    {"id": 3, "speaker": "coach", "text": "So what brings you to this area? You look like you're on a mission"},
    {"id": 4, "speaker": "target", "text": "Haha yeah, I'm actually heading to grab coffee before work"},
    {"id": 5, "speaker": "coach", "text": "Let me guess, you're one of those oat milk people"},
    {"id": 6, "speaker": "target", "text": "Okay wow, how did you know that?"},
    ...
  ]
}
```

## Output Format

Return valid JSON only:

```json
{
  "interaction_id": 1,
  "conversation_id": 1,
  "segment_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "turns": [
    {"index": 0, "speaker": "coach", "text": "Hey, I noticed you walking by..."},
    {"index": 1, "speaker": "target", "text": "Oh, thanks! That's sweet..."},
    ...
  ],
  "phases": {
    "open": {
      "start_turn": 0,
      "end_turn": 1,
      "confidence": 0.92
    },
    "pre_hook": {
      "start_turn": 2,
      "end_turn": 5,
      "confidence": 0.85
    },
    "post_hook": {
      "start_turn": 6,
      "end_turn": 12,
      "confidence": 0.78
    },
    "close": {
      "start_turn": 13,
      "end_turn": 15,
      "confidence": 0.88
    }
  },
  "hook_point": {
    "turn_index": 6,
    "signal": "she asked a question back",
    "confidence": 0.85
  }
}
```

## Phase Definitions (Street Daygame Model)

### open
Initial contact. The approach and first words.
- **Start**: First words of approach
- **End**: Past initial greeting, first substantive exchange
- **Duration**: Usually 1-3 turns, under 30 seconds
- **Detection**: Opening lines, "hey", "excuse me", first compliment

### pre_hook
Coach working to get her engaged. She's responding but not invested yet.
- **Start**: After initial greeting
- **End**: When she shows genuine interest
- **Detection**:
  - Coach's turns are longer than hers
  - He's asking questions, making assumptions
  - She's responding politely but briefly
  - She hasn't asked him questions yet

### post_hook
She's invested. Mutual exchange happening.
- **Start**: First sign of genuine investment from her
- **End**: Before close attempt
- **Detection**:
  - She asks questions back
  - She shares personal information voluntarily
  - Her turns get longer
  - Mutual back-and-forth, laughing
  - She initiates topics

### close
Asking for contact or a date.
- **Start**: First mention of next steps, number, plans
- **End**: Contact exchanged or interaction ends
- **Detection**: "Let me get your number", "we should grab...", "what's your Instagram"

## Hook Point

The **hook_point** is the moment she transitions from passive to invested. Mark:
- **turn_index**: Which turn showed the hook
- **signal**: What indicated it (e.g., "she asked a question", "she laughed and continued topic", "she shared where she's from unprompted")
- **confidence**: How clear the hook was

## Decision Rules

1. **Not all phases required**: Short interactions may only have open + close (or open + blowout)
2. **pre_hook may be skipped**: Strong opener can hook immediately
3. **post_hook may be skipped**: He might close right after hooking her
4. **Hook point may be absent**: She never hooked (blowout or polite exit)

## Confidence Guidelines

- 0.85-1.0: Clear phase transitions
- 0.7-0.85: Reasonable but fuzzy boundaries
- Below 0.7: Flag for review

## Edge Cases

- **Blowout**: Entire interaction is open phase, no hook_point
- **Instant hook**: Skip pre_hook, open → post_hook
- **Quick close**: pre_hook → close (skipping post_hook)
- **Multiple close attempts**: Mark first attempt as close phase start
