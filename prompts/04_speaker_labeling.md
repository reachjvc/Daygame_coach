# Prompt: Speaker Cluster Labeling (04)

Version: 1.0.0
Updated: 30-01-2026

## Task

Assign semantic labels to speaker clusters identified by audio analysis.

## Input

You will receive speaker cluster statistics from audio feature analysis:

```json
{
  "speaker_clusters": [
    {
      "speaker_id": 0,
      "segment_count": 45,
      "total_duration_seconds": 180.5,
      "average_pitch_hz": 125.3,
      "sample_utterances": [
        "Hey, I just noticed you walking by...",
        "So what brings you to this area?",
        "That's actually really interesting..."
      ]
    },
    {
      "speaker_id": 1,
      "segment_count": 38,
      "total_duration_seconds": 95.2,
      "average_pitch_hz": 215.7,
      "sample_utterances": [
        "Oh, thanks, I'm just on my way to work",
        "Yeah, I live around here",
        "Haha, that's funny"
      ]
    }
  ],
  "video_context": {
    "title": "Daygame Approach - Coffee Shop",
    "channel": "CoachName"
  }
}
```

## Output Format

Return valid JSON only:

```json
{
  "speaker_labels": {
    "0": {
      "label": "coach",
      "confidence": 0.95,
      "reasoning": "Male voice, initiating conversation, asking questions, typical coach patterns"
    },
    "1": {
      "label": "target",
      "confidence": 0.90,
      "reasoning": "Female voice (higher pitch), responding to questions, shorter utterances"
    }
  }
}
```

## Label Definitions

- **coach**: The person doing the approach. Usually male, initiating conversation, asking questions, leading the interaction.
- **target**: The person being approached. Usually female, responding to questions, shorter responses.
- **voiceover**: Commentary track, same speaker as coach but not in-scene (different audio quality, explaining what's happening).
- **other**: Anyone else - friends, bystanders, interruptions.

## Decision Rules

1. **Pitch heuristic**: Male voices typically 85-180 Hz, female voices typically 165-255 Hz
2. **Conversation flow**: Initiator is usually coach, responder is usually target
3. **Sample utterances**: Look for approach-style language (compliments, questions about her)
4. **Duration ratio**: Coach typically speaks more in infield content
5. **Video context**: Title and channel can hint at who's who

## Confidence Guidelines

- 0.9-1.0: Clear signals (pitch, conversation role, typical phrases)
- 0.7-0.9: Some ambiguity but reasonable inference
- Below 0.7: Significant uncertainty - flag for review

## Edge Cases

- **Single speaker**: May be voiceover/talking head content
- **Multiple female voices**: One target, others likely "other"
- **Very short clips**: Less context, lower confidence expected
- **Podcast format**: May have multiple coaches, different labeling pattern
