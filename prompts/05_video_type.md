# Prompt: Video Type Detection (05)

Version: 1.0.0
Updated: 30-01-2026

## Task

Classify the video type based on title, transcript content, and speaker patterns.

## Input

```json
{
  "video_id": "abc123",
  "title": "Daygame Infield - Coffee Shop Approach",
  "channel": "CoachName",
  "transcript_snippet": "Hey, I just noticed you and thought you looked interesting... So what brings you here today?",
  "speaker_distribution": {
    "coach": 0.55,
    "target": 0.40,
    "voiceover": 0.05,
    "other": 0.0
  },
  "total_duration_seconds": 420
}
```

## Output Format

Return valid JSON only:

```json
{
  "video_type": {
    "type": "infield",
    "confidence": 0.92,
    "reasoning": "Title contains 'infield', transcript shows approach conversation, speaker distribution shows coach-target interaction"
  }
}
```

## Video Type Definitions

### infield
Real approach footage with actual interactions. Contains genuine conversations with targets.
- **Signals**: Target present in speaker distribution, approach-style dialogue, outdoor/public settings implied
- **Title keywords**: infield, approach, set, interaction, pickup

### talking_head
One person speaking directly to camera. Commentary, teaching, analysis.
- **Signals**: Single speaker (coach only), explanatory language, no target dialogue
- **Title keywords**: breakdown, analysis, tips, how to, mindset, commentary

### podcast
Two or more people in conversation format. Interview style, discussion.
- **Signals**: Multiple speakers but no target, longer back-and-forth, discussion format
- **Title keywords**: podcast, interview, conversation with, episode, guest

### compilation
Mixed content or highlights from multiple sources.
- **Signals**: Rapid topic changes, multiple distinct interactions, highlight reel format
- **Title keywords**: compilation, best of, highlights, montage

## Decision Rules

1. **Title is strong signal**: "infield" almost always means infield
2. **Speaker distribution**: Target present usually means infield
3. **Transcript content**: Approach dialogue vs commentary vs discussion
4. **Duration**: Very short clips may be compilation pieces

## Priority Order

1. Title keywords (strongest signal)
2. Speaker distribution
3. Transcript content analysis
4. Duration/format clues

## Confidence Guidelines

- 0.9-1.0: Clear title keyword + matching content
- 0.8-0.9: Strong content signals, ambiguous title
- 0.7-0.8: Reasonable inference with some ambiguity
- Below 0.7: Flag for review

## Edge Cases

- **Infield with commentary**: Still "infield" if contains real approaches
- **Teaching during approach**: Still "infield"
- **Mixed format**: Use dominant format, or "compilation" if truly mixed
