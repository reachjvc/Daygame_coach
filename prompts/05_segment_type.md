# Prompt: Segment Type Classification (05)

Version: 1.0.0
Updated: 30-01-2026

## Task

Classify each segment by its role in the video structure.

## Input

```json
{
  "segment": {
    "id": 5,
    "start": 45.2,
    "end": 52.8,
    "speaker": "coach",
    "text": "So as you can see, she was really receptive to that opener. Let me show you what happens next."
  },
  "context": {
    "video_type": "infield",
    "previous_segment": {"speaker": "target", "text": "Yeah that's really interesting!"},
    "next_segment": {"speaker": "coach", "text": "What brings you to this area?"}
  }
}
```

## Output Format

Return valid JSON only:

```json
{
  "segment_id": 5,
  "segment_type": {
    "type": "commentary",
    "confidence": 0.90,
    "reasoning": "Coach speaking about the interaction in third person, explaining what happened"
  }
}
```

## Segment Type Definitions

### approach
Active interaction with target. Direct conversation, real-time dialogue.
- **Signals**: Back-and-forth with target, present-tense dialogue, natural conversation flow
- **Speaker**: Usually coach or target speaking TO each other

### commentary
Coach speaking about the interaction. Before, after, or voiceover during.
- **Signals**: Third-person references ("she said", "notice how"), explanatory language
- **Speaker**: Coach only, speaking to camera/viewer

### transition
Moving between locations or interactions. Setup for next segment.
- **Signals**: Location references, "let me show you", "here's another one"
- **Duration**: Usually short (5-15 seconds)

### intro
Video introduction/greeting. Welcome, preview of content.
- **Signals**: Typically at start, greetings to viewer, content preview
- **Position**: First 30-60 seconds usually

### outro
Video closing/summary. Wrap-up, calls to action, goodbyes.
- **Signals**: Summary language, "subscribe", thanks, goodbye
- **Position**: Last 30-60 seconds usually

## Decision Rules

1. **Speaker + content**: Coach talking TO target = approach, coach talking ABOUT target = commentary
2. **Position matters**: Start = likely intro, end = likely outro
3. **Video type context**: Talking_head videos are mostly commentary
4. **Transition detection**: Look for scene-change language

## Confidence Guidelines

- 0.85-1.0: Clear signals (direct dialogue vs meta-commentary)
- 0.7-0.85: Reasonable inference
- Below 0.7: Flag for review

## Edge Cases

- **Brief commentary during approach**: Mark as commentary if clearly meta
- **Coach speaking to target AND camera**: Consider primary audience
- **Very short segments**: May need context from neighbors
