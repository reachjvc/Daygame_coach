# Transcript Processing: Training AI for Daygame Coaching

## Goal
Transform raw YouTube transcripts into structured training data that teaches AI models:
1. What good daygame looks like (successful interactions)
2. The structure of an approach (opener → hook → vibe → close)
3. How to evaluate user responses in scenarios
4. The difference between theory content and actual in-field practice

---

## The Problem with Raw Transcripts

Raw transcripts are messy:
```
"hey guys it's adam for social stoic i'm right here in rainy london in today's video
i'm going to show you a mashup of infields... [5 min intro] ...so let's get into it
enjoy so excuse me hey two seconds this is so random i was just walking through..."
```

Issues:
- **No speaker labels** - can't tell coach vs girl vs voiceover
- **Mixed content** - intros, outros, commentary mixed with actual approaches
- **No structure** - can't identify where opener ends and conversation begins
- **No outcome labels** - did she give her number? Was this successful?

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRANSCRIPT PROCESSING PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Raw           Content        Segment        Speaker       Interaction       │
│  Transcripts → Classifier  → Identifier  → Diarizer  → Extractor           │
│  (.txt)        (theory vs     (intro,       (him vs     (opener,            │
│                 infield)      approach,      her)        response,           │
│                               outro)                     outcome)            │
│                                                                              │
│                                    ↓                                         │
│                                                                              │
│                         Structured Training Data                             │
│                         - interaction_pairs.jsonl                            │
│                         - opener_examples.jsonl                              │
│                         - conversation_flows.jsonl                           │
│                         - scenario_training.jsonl                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Alignment & IDs for Scale

- Assign stable IDs early: per-video IDs from the manifest, per-segment IDs from ASR timestamps, and carry them through classified → features → interactions → processed JSONL so text and audio stay aligned.
- Store audio refs alongside text: for each segment/turn keep `{file, start, end}` so scenario evaluators can surface the exact clip for feedback.
- Record label provenance on every object (`source`: heuristic | human_reviewed | model_vX) to support evaluation splits and retraining.

---

## Phase 1: Content Classification

### 1.1 Content Types

| Type | Description | Training Use |
|------|-------------|--------------|
| `intro` | "Hey guys, welcome back..." | DISCARD |
| `outro` | "Don't forget to subscribe..." | DISCARD |
| `theory` | Explaining concepts without live demo | KNOWLEDGE BASE |
| `infield` | Live approach/interaction | PRIMARY TRAINING DATA |
| `breakdown` | Coach reviewing an interaction | SECONDARY (commentary) |
| `transition` | "Let's see another approach..." | MARKERS (segment boundaries) |

### 1.2 Classification Signals

**Intro/Outro Detection:**
```python
INTRO_PATTERNS = [
    r"hey guys",
    r"what's up (everyone|guys|youtube)",
    r"welcome back",
    r"in today's video",
    r"before we (get into|start)",
    r"make sure to (subscribe|like|hit)",
    r"let's get into it"
]

OUTRO_PATTERNS = [
    r"thanks for watching",
    r"see you (in the next|next time)",
    r"don't forget to subscribe",
    r"leave a comment",
    r"check out my",
    r"links in the description",
    r"peace out"
]
```

**Infield Detection:**
```python
INFIELD_INDICATORS = [
    # Direct speech markers
    r"excuse me",
    r"hey,? (one|two|quick) (second|sec)",
    r"i (just )?(saw|noticed) you",
    r"can i get your (number|instagram)",
    r"nice to meet you",
    r"what's your name",

    # Contextual markers
    r"[laughs]",
    r"[laughter]",
    r"\?$",  # Questions (high frequency in conversation)

    # Girl's responses (short affirmatives)
    r"^(yeah|yes|no|okay|oh|haha|what|really)\W*$",
]

THEORY_INDICATORS = [
    r"the (reason|key|trick|secret) (is|to)",
    r"what (you|i) (want|need) to do",
    r"(always|never) do this",
    r"(most|many) guys (make the mistake|don't)",
    r"let me (explain|break down|show you)",
    r"the psychology (of|behind)",
]
```

### 1.3 Content Classification Script

Create `scripts/classify_content.py`:

```python
"""
Content Classification for Daygame Transcripts

Classifies transcript segments as:
- intro/outro (discard)
- theory (knowledge base)
- infield (primary training data)
- breakdown (secondary)
- transition (segment markers)

Uses pattern matching + context analysis.
"""

import re
import json
from pathlib import Path
from typing import List, Dict, Tuple

# Pattern definitions
INTRO_PATTERNS = [
    r"hey guys",
    r"what's up (everyone|guys|youtube)",
    r"welcome back",
    r"in today's video",
    r"before we (get into|start)",
    r"let's get into it",
]

OUTRO_PATTERNS = [
    r"thanks for watching",
    r"see you (in the next|next time)",
    r"don't forget to subscribe",
    r"links in the description",
]

INFIELD_STARTERS = [
    r"excuse me",
    r"hey,? (one|two|quick) (second|sec)",
    r"i (just )?(saw|noticed) you",
    r"this is (so )?random",
    r"i had to (come|stop)",
]

INFIELD_EXCHANGES = [
    r"what's your name",
    r"where (are you|you) from",
    r"can i get your (number|instagram)",
    r"nice to meet you",
    r"you('re| are) (so |really |very )?cute",
]

THEORY_PATTERNS = [
    r"the (reason|key|trick|secret) (is|to)",
    r"what (you|i) (want|need) to do",
    r"let me (explain|break down|tell you)",
    r"(most|many) guys",
    r"the psychology",
    r"(always|never) (do|say) this",
    r"tip (number )?\d",
    r"mistake (number )?\d",
]

TRANSITION_PATTERNS = [
    r"let's (see|watch|look at) (another|the next)",
    r"here's another",
    r"next (approach|interaction|one)",
    r"moving on",
    r"okay so",
]


class ContentClassifier:

    def __init__(self):
        self.compiled_patterns = {
            'intro': [re.compile(p, re.IGNORECASE) for p in INTRO_PATTERNS],
            'outro': [re.compile(p, re.IGNORECASE) for p in OUTRO_PATTERNS],
            'infield_start': [re.compile(p, re.IGNORECASE) for p in INFIELD_STARTERS],
            'infield_exchange': [re.compile(p, re.IGNORECASE) for p in INFIELD_EXCHANGES],
            'theory': [re.compile(p, re.IGNORECASE) for p in THEORY_PATTERNS],
            'transition': [re.compile(p, re.IGNORECASE) for p in TRANSITION_PATTERNS],
        }

    def classify_segment(self, text: str, context: Dict = None) -> Dict:
        """
        Classify a single segment of text.

        Args:
            text: The segment text
            context: Optional context (previous/next segments, position in video)

        Returns:
            Dict with classification and confidence
        """

        text_lower = text.lower().strip()
        scores = {
            'intro': 0,
            'outro': 0,
            'infield': 0,
            'theory': 0,
            'transition': 0,
        }

        # Check patterns
        for pattern in self.compiled_patterns['intro']:
            if pattern.search(text_lower):
                scores['intro'] += 2

        for pattern in self.compiled_patterns['outro']:
            if pattern.search(text_lower):
                scores['outro'] += 2

        for pattern in self.compiled_patterns['infield_start']:
            if pattern.search(text_lower):
                scores['infield'] += 3

        for pattern in self.compiled_patterns['infield_exchange']:
            if pattern.search(text_lower):
                scores['infield'] += 2

        for pattern in self.compiled_patterns['theory']:
            if pattern.search(text_lower):
                scores['theory'] += 2

        for pattern in self.compiled_patterns['transition']:
            if pattern.search(text_lower):
                scores['transition'] += 2

        # Contextual signals
        if context:
            position = context.get('position_ratio', 0.5)
            # Intros usually in first 10%
            if position < 0.1:
                scores['intro'] += 1
            # Outros usually in last 10%
            if position > 0.9:
                scores['outro'] += 1

        # Short responses likely infield (her responses)
        word_count = len(text.split())
        if word_count < 5 and '?' not in text:
            scores['infield'] += 1

        # Questions are often infield
        if text.strip().endswith('?'):
            scores['infield'] += 1

        # Determine winner
        max_type = max(scores, key=scores.get)
        max_score = scores[max_type]

        if max_score == 0:
            return {
                'type': 'unknown',
                'confidence': 0.0,
                'scores': scores
            }

        total = sum(scores.values())
        confidence = max_score / total if total > 0 else 0

        return {
            'type': max_type,
            'confidence': confidence,
            'scores': scores
        }

    def classify_transcript(self, segments: List[Dict]) -> List[Dict]:
        """
        Classify all segments in a transcript with context awareness.
        """

        total_segments = len(segments)
        results = []

        for i, segment in enumerate(segments):
            context = {
                'position_ratio': i / total_segments if total_segments > 0 else 0,
                'prev_text': segments[i-1].get('text', '') if i > 0 else '',
                'next_text': segments[i+1].get('text', '') if i < total_segments - 1 else '',
            }

            classification = self.classify_segment(segment.get('text', ''), context)
            segment['content_type'] = classification

            results.append(segment)

        # Second pass: smooth classifications (isolated different types often wrong)
        results = self._smooth_classifications(results)

        return results

    def _smooth_classifications(self, segments: List[Dict]) -> List[Dict]:
        """
        Smooth classifications - if one segment is different from neighbors,
        it's likely misclassified.
        """

        for i in range(1, len(segments) - 1):
            prev_type = segments[i-1]['content_type']['type']
            curr_type = segments[i]['content_type']['type']
            next_type = segments[i+1]['content_type']['type']

            # If surrounded by same type but different, adopt neighbors' type
            if prev_type == next_type and curr_type != prev_type:
                if segments[i]['content_type']['confidence'] < 0.7:
                    segments[i]['content_type']['type'] = prev_type
                    segments[i]['content_type']['smoothed'] = True

        return results


def process_transcript_file(input_path: str, output_path: str):
    """Process a single transcript JSON file."""

    with open(input_path, 'r') as f:
        data = json.load(f)

    classifier = ContentClassifier()

    segments = data.get('segments', [])
    classified_segments = classifier.classify_transcript(segments)

    data['segments'] = classified_segments

    # Add summary stats
    type_counts = {}
    for seg in classified_segments:
        t = seg['content_type']['type']
        type_counts[t] = type_counts.get(t, 0) + 1

    data['content_summary'] = type_counts

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    return data
```

---

## Phase 2: Interaction Extraction

### 2.1 What is an "Interaction"?

An interaction is a complete approach from open to close/rejection:

```
INTERACTION:
├── opener (coach's first words)
├── hook_attempt (trying to get her engaged)
├── conversation (back and forth)
├── close_attempt (number/insta ask)
└── outcome (success/rejection/maybe)
```

When building interactions, carry forward the segment IDs, `audio_clip` refs, and speaker cluster IDs so every turn can be linked back to the exact audio for future voice-based feedback.

### 2.2 Interaction Boundaries

**Start signals:**
- "excuse me", "hey one second", etc.
- Transition phrases: "let's see another approach"
- Significant pause in audio (gap > 5 seconds)

**End signals:**
- Number close: "can I get your number"
- Departure: "nice to meet you", "enjoy your day"
- Rejection: "I have a boyfriend", walking away
- Next transition: "okay so that was..."

### 2.3 Interaction Extraction Script

Create `scripts/extract_interactions.py`:

```python
"""
Interaction Extraction from Daygame Transcripts

Identifies complete approach sequences:
1. Finds interaction boundaries (start/end)
2. Segments into phases (opener, hook, vibe, close)
3. Labels outcomes where detectable
4. Outputs structured interaction data

Output format suitable for:
- Fine-tuning language models
- RAG retrieval systems
- Scenario evaluation training
"""

import re
import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class InteractionPhase(Enum):
    OPENER = "opener"
    HOOK = "hook"
    VIBE = "vibe"
    CLOSE = "close"
    UNKNOWN = "unknown"


class Outcome(Enum):
    NUMBER = "number"
    INSTAGRAM = "instagram"
    DATE = "date"
    REJECTED = "rejected"
    BLOWOUT = "blowout"
    WALKED_AWAY = "walked_away"
    UNKNOWN = "unknown"


@dataclass
class Turn:
    """A single conversational turn."""
    speaker: str  # 'coach' or 'target'
    text: str
    start_time: float
    end_time: float
    phase: InteractionPhase = InteractionPhase.UNKNOWN


@dataclass
class Interaction:
    """A complete approach interaction."""
    id: str
    source_video: str
    start_time: float
    end_time: float
    turns: List[Turn]
    outcome: Outcome
    outcome_confidence: float
    notes: str = ""


# Detection patterns
OPENER_PATTERNS = [
    r"excuse me",
    r"hey,? (one|two|quick) sec",
    r"i (just )?(saw|noticed) you",
    r"this is (so )?random",
    r"i had to (come|stop|say)",
    r"you caught my (eye|attention)",
]

CLOSE_PATTERNS = [
    r"(can i |let me |i('ll| will) )?(get|have|take) your (number|instagram|insta|snap)",
    r"(give|put in) (me )?your number",
    r"what's your (number|instagram|insta)",
    r"we should (hang out|grab|get)",
    r"let('s| us) (exchange|swap) (numbers|instagrams)",
]

SUCCESS_PATTERNS = [
    r"(yeah|yes|sure|okay),? (here|it's|my)",
    r"i('ll| will) (give|put|type)",
    r"(just )?call me",
    r"(here you go|there you go)",
    r"(what's|give me) your(s| number)",  # Her asking for HIS number = very good
]

REJECTION_PATTERNS = [
    r"i have a boyfriend",
    r"i('m| am) (married|engaged|taken|seeing someone)",
    r"(no|sorry),? (thanks|thank you|i('m| am) (good|okay|fine))",
    r"i('m| am) (not interested|in a hurry|busy)",
    r"(leave me alone|go away|not interested)",
]

BLOWOUT_PATTERNS = [
    r"(walks away|walked away|she left)",
    r"(ignored|ignoring)",
    r"(no response|didn't respond)",
    r"\[walks away\]",
]


class InteractionExtractor:

    def __init__(self):
        self.opener_re = [re.compile(p, re.IGNORECASE) for p in OPENER_PATTERNS]
        self.close_re = [re.compile(p, re.IGNORECASE) for p in CLOSE_PATTERNS]
        self.success_re = [re.compile(p, re.IGNORECASE) for p in SUCCESS_PATTERNS]
        self.rejection_re = [re.compile(p, re.IGNORECASE) for p in REJECTION_PATTERNS]
        self.blowout_re = [re.compile(p, re.IGNORECASE) for p in BLOWOUT_PATTERNS]

    def find_interaction_starts(self, segments: List[Dict]) -> List[int]:
        """Find indices where new interactions begin."""

        starts = []

        for i, seg in enumerate(segments):
            text = seg.get('text', '').lower()
            content_type = seg.get('content_type', {}).get('type', '')

            # Skip non-infield content
            if content_type not in ['infield', 'unknown']:
                continue

            # Check for opener patterns
            for pattern in self.opener_re:
                if pattern.search(text):
                    # Verify this isn't mid-conversation
                    if i == 0 or self._is_conversation_break(segments, i):
                        starts.append(i)
                        break

        return starts

    def _is_conversation_break(self, segments: List[Dict], index: int) -> bool:
        """Check if there's a break before this segment (new interaction)."""

        if index == 0:
            return True

        curr_seg = segments[index]
        prev_seg = segments[index - 1]

        # Time gap > 3 seconds suggests new interaction
        curr_start = curr_seg.get('start', 0)
        prev_end = prev_seg.get('end', 0)
        if curr_start - prev_end > 3.0:
            return True

        # Transition detected
        prev_type = prev_seg.get('content_type', {}).get('type', '')
        if prev_type == 'transition':
            return True

        return False

    def extract_interaction(self, segments: List[Dict], start_idx: int,
                           next_start_idx: Optional[int] = None) -> Optional[Interaction]:
        """Extract a single interaction starting at start_idx."""

        end_idx = next_start_idx if next_start_idx else len(segments)

        interaction_segments = segments[start_idx:end_idx]

        if len(interaction_segments) < 2:
            return None

        # Build turns
        turns = []
        current_phase = InteractionPhase.OPENER

        for seg in interaction_segments:
            text = seg.get('text', '').strip()
            speaker_info = seg.get('speaker', {})
            speaker = speaker_info.get('label', 'unknown')

            # Determine phase
            phase = self._determine_phase(text, current_phase, speaker)
            current_phase = phase

            turn = Turn(
                speaker=speaker,
                text=text,
                start_time=seg.get('start', 0),
                end_time=seg.get('end', 0),
                phase=phase
            )
            turns.append(turn)

        # Determine outcome
        outcome, confidence = self._determine_outcome(turns)

        return Interaction(
            id=f"interaction_{start_idx}",
            source_video="",  # Set by caller
            start_time=turns[0].start_time if turns else 0,
            end_time=turns[-1].end_time if turns else 0,
            turns=turns,
            outcome=outcome,
            outcome_confidence=confidence
        )

    def _determine_phase(self, text: str, current_phase: InteractionPhase,
                        speaker: str) -> InteractionPhase:
        """Determine what phase of the interaction this turn is."""

        text_lower = text.lower()

        # Check for close attempt
        for pattern in self.close_re:
            if pattern.search(text_lower):
                return InteractionPhase.CLOSE

        # Opener phase - first few coach turns
        if current_phase == InteractionPhase.OPENER:
            # Stay in opener until girl gives substantive response
            if speaker == 'target' and len(text.split()) > 5:
                return InteractionPhase.HOOK
            return InteractionPhase.OPENER

        # Hook phase - trying to get her engaged
        if current_phase == InteractionPhase.HOOK:
            # Move to vibe once conversation flows
            if speaker == 'target' and ('?' in text or len(text.split()) > 10):
                return InteractionPhase.VIBE
            return InteractionPhase.HOOK

        # Vibe phase - flowing conversation
        if current_phase == InteractionPhase.VIBE:
            return InteractionPhase.VIBE

        # Close phase
        if current_phase == InteractionPhase.CLOSE:
            return InteractionPhase.CLOSE

        return current_phase

    def _determine_outcome(self, turns: List[Turn]) -> tuple[Outcome, float]:
        """Determine the outcome of the interaction."""

        # Look at last few turns
        last_turns = turns[-5:] if len(turns) >= 5 else turns
        combined_text = ' '.join([t.text.lower() for t in last_turns])

        # Check for success
        for pattern in self.success_re:
            if pattern.search(combined_text):
                return Outcome.NUMBER, 0.8

        # Check for rejection
        for pattern in self.rejection_re:
            if pattern.search(combined_text):
                return Outcome.REJECTED, 0.8

        # Check for blowout
        for pattern in self.blowout_re:
            if pattern.search(combined_text):
                return Outcome.BLOWOUT, 0.7

        return Outcome.UNKNOWN, 0.3


def extract_all_interactions(transcript_path: str, output_path: str):
    """Process a transcript and extract all interactions."""

    with open(transcript_path, 'r') as f:
        data = json.load(f)

    extractor = InteractionExtractor()
    segments = data.get('segments', [])

    # Find interaction boundaries
    starts = extractor.find_interaction_starts(segments)

    interactions = []
    for i, start_idx in enumerate(starts):
        next_idx = starts[i + 1] if i + 1 < len(starts) else None

        interaction = extractor.extract_interaction(segments, start_idx, next_idx)

        if interaction:
            interaction.source_video = transcript_path
            interactions.append(interaction)

    # Save as JSONL (one interaction per line)
    with open(output_path, 'w') as f:
        for interaction in interactions:
            # Convert to JSON-serializable format
            obj = {
                'id': interaction.id,
                'source_video': interaction.source_video,
                'start_time': interaction.start_time,
                'end_time': interaction.end_time,
                'outcome': interaction.outcome.value,
                'outcome_confidence': interaction.outcome_confidence,
                'turns': [
                    {
                        'speaker': t.speaker,
                        'text': t.text,
                        'start': t.start_time,
                        'end': t.end_time,
                        'phase': t.phase.value
                    }
                    for t in interaction.turns
                ]
            }
            f.write(json.dumps(obj) + '\n')

    print(f"Extracted {len(interactions)} interactions")
    return interactions
```

---

## Phase 3: Training Data Generation

### 3.1 Output Formats for Different AI Use Cases

**Format 1: Scenario Evaluation Training (Your Current App)**

For teaching AI to evaluate user responses in scenarios:

```jsonl
{"scenario_type": "opener", "situation": "Coffee shop, she's reading a book", "good_response": "That book looks intense - are you studying or escaping reality?", "good_because": "Observational, playful, opens conversation thread", "bad_response": "Hey, you're cute, can I get your number?", "bad_because": "Too direct too fast, no conversation, low investment"}
{"scenario_type": "shit_test", "her_line": "Do you say this to every girl?", "good_response": "Only the ones wearing ridiculous hats", "good_because": "Deflects with humor, doesn't get defensive", "bad_response": "No, you're special, I really mean it", "bad_because": "Too sincere, validates her frame, try-hard"}
```

**Format 2: Conversation Flow Training**

For teaching AI the structure of successful interactions:

```jsonl
{"interaction_id": "ss_001", "phases": {"opener": ["i just saw you with this dress and it's psychedelic", "i just wanted to say hi"], "hook": ["you look so exotic", "where are you from"], "vibe": ["you have a very relaxed energy", "you smell really good"], "close": ["let me get your number", "we should grab coffee"]}, "outcome": "number", "total_duration_sec": 180}
```

**Format 3: Turn-by-Turn Training Pairs**

For fine-tuning models on response generation:

```jsonl
{"context": "opener situation: street, daytime", "coach_says": "excuse me, one second - this is random but I saw you walking and loved your style", "she_responds": "oh, thank you", "next_good_move": "continue with observation about her specifically"}
{"context": "she's being cold/short", "she_says": "okay", "coach_says": "you're not very talkative are you? that's okay, I'll do the talking for both of us", "outcome": "she laughed and opened up"}
```

**Format 4: RAG Knowledge Base**

For retrieval-augmented generation (finding relevant examples):

```jsonl
{"chunk_id": "ss_001_opener", "text": "i just saw you with this dress and it's psychedelic, i love it", "metadata": {"type": "opener", "style": "observational", "tone": "playful", "outcome": "positive_hook", "source": "social_stoic"}}
{"chunk_id": "ss_001_tease", "text": "you want to be serious? you're a serious girl? you pretend to be serious", "metadata": {"type": "push_pull", "style": "teasing", "tone": "playful", "outcome": "she_laughed", "source": "social_stoic"}}
```

For all formats, include:
- `audio_clip` reference `{file, start, end}` so evaluators can play the exact snippet.
- Delivery summaries (e.g., delta from coach pitch/tempo baselines, tone label provenance) alongside text to ground scenario feedback in delivery, not just wording.
- `provenance` per record (`heuristic`, `human_reviewed`, `model_vX`) and stable IDs inherited from transcripts/features.

### 3.2 Training Data Generation Script

Create `scripts/generate_training_data.py`:

```python
"""
Generate Training Data from Processed Interactions

Creates multiple output formats:
1. scenario_training.jsonl - For scenario evaluation
2. conversation_flows.jsonl - For understanding structure
3. turn_pairs.jsonl - For response generation
4. rag_chunks.jsonl - For knowledge retrieval

Input: Extracted interactions with speaker labels
Output: Multiple JSONL files for different training purposes
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Generator
from dataclasses import dataclass


@dataclass
class TrainingExample:
    format_type: str
    data: Dict


class TrainingDataGenerator:

    def __init__(self, interactions_dir: str, output_dir: str):
        self.interactions_dir = Path(interactions_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load_interactions(self) -> Generator[Dict, None, None]:
        """Load all interaction files."""

        for file in self.interactions_dir.glob('*.jsonl'):
            with open(file, 'r') as f:
                for line in f:
                    if line.strip():
                        yield json.loads(line)

    def generate_scenario_training(self, interactions: List[Dict]) -> List[Dict]:
        """
        Generate scenario evaluation training data.

        Format:
        {
            "scenario_type": "opener|shit_test|comfort|close",
            "situation": "description of context",
            "her_line": "what she said (if applicable)",
            "example_response": "what the coach said",
            "quality": "good|bad|neutral",
            "reasoning": "why this response works/doesn't"
        }
        """

        examples = []

        for interaction in interactions:
            turns = interaction.get('turns', [])
            outcome = interaction.get('outcome', 'unknown')

            for i, turn in enumerate(turns):
                if turn['speaker'] != 'coach':
                    continue

                phase = turn.get('phase', 'unknown')
                text = turn['text']

                # Get context (what she said before, if anything)
                prev_turn = turns[i-1] if i > 0 else None
                her_line = prev_turn['text'] if prev_turn and prev_turn['speaker'] == 'target' else None

                # Determine quality based on outcome and phase
                quality = self._assess_quality(phase, outcome, i, len(turns))

                example = {
                    'scenario_type': self._phase_to_scenario(phase),
                    'situation': self._infer_situation(turns[:i]),
                    'example_response': text,
                    'quality': quality,
                    'reasoning': self._generate_reasoning(text, phase, quality)
                }

                if her_line:
                    example['her_line'] = her_line

                examples.append(example)

        return examples

    def generate_conversation_flows(self, interactions: List[Dict]) -> List[Dict]:
        """
        Generate conversation flow training data.

        Shows complete interaction structure.
        """

        flows = []

        for interaction in interactions:
            turns = interaction.get('turns', [])

            # Group turns by phase
            phases = {
                'opener': [],
                'hook': [],
                'vibe': [],
                'close': []
            }

            for turn in turns:
                if turn['speaker'] == 'coach':
                    phase = turn.get('phase', 'vibe')
                    if phase in phases:
                        phases[phase].append(turn['text'])

            # Calculate duration
            if turns:
                duration = turns[-1]['end'] - turns[0]['start']
            else:
                duration = 0

            flow = {
                'interaction_id': interaction['id'],
                'source': interaction.get('source_video', ''),
                'phases': phases,
                'outcome': interaction.get('outcome', 'unknown'),
                'total_duration_sec': duration,
                'turn_count': len(turns)
            }

            flows.append(flow)

        return flows

    def generate_turn_pairs(self, interactions: List[Dict]) -> List[Dict]:
        """
        Generate turn-by-turn training pairs.

        For fine-tuning conversational response generation.
        """

        pairs = []

        for interaction in interactions:
            turns = interaction.get('turns', [])

            for i in range(len(turns) - 1):
                curr = turns[i]
                next_turn = turns[i + 1]

                # We want: she says X, he responds Y
                if curr['speaker'] == 'target' and next_turn['speaker'] == 'coach':
                    pair = {
                        'context': self._build_context(turns[:i]),
                        'she_says': curr['text'],
                        'he_responds': next_turn['text'],
                        'phase': next_turn.get('phase', 'unknown'),
                        'worked': interaction.get('outcome') in ['number', 'instagram', 'date']
                    }
                    pairs.append(pair)

                # Also: he says X, she responds Y (to see what works)
                elif curr['speaker'] == 'coach' and next_turn['speaker'] == 'target':
                    pair = {
                        'context': self._build_context(turns[:i]),
                        'he_says': curr['text'],
                        'she_responds': next_turn['text'],
                        'response_quality': self._assess_her_response(next_turn['text'])
                    }
                    pairs.append(pair)

        return pairs

    def generate_rag_chunks(self, interactions: List[Dict]) -> List[Dict]:
        """
        Generate chunks for RAG (retrieval augmented generation).

        Each chunk is a searchable piece of knowledge.
        """

        chunks = []
        chunk_id = 0

        for interaction in interactions:
            turns = interaction.get('turns', [])
            source = interaction.get('source_video', 'unknown')

            for turn in turns:
                if turn['speaker'] != 'coach':
                    continue

                text = turn['text']
                phase = turn.get('phase', 'unknown')

                # Classify the type of line
                line_type = self._classify_line_type(text)

                chunk = {
                    'chunk_id': f"chunk_{chunk_id}",
                    'text': text,
                    'metadata': {
                        'type': line_type,
                        'phase': phase,
                        'source': source,
                        'interaction_outcome': interaction.get('outcome', 'unknown'),
                        'style': self._infer_style(text)
                    }
                }

                chunks.append(chunk)
                chunk_id += 1

        return chunks

    def _phase_to_scenario(self, phase: str) -> str:
        """Map interaction phase to scenario type."""
        mapping = {
            'opener': 'opener',
            'hook': 'hook_point',
            'vibe': 'conversation',
            'close': 'close'
        }
        return mapping.get(phase, 'general')

    def _assess_quality(self, phase: str, outcome: str, turn_idx: int, total_turns: int) -> str:
        """Assess quality of a response based on context."""

        # If interaction led to number, most coach lines were probably good
        if outcome in ['number', 'instagram', 'date']:
            return 'good'
        elif outcome in ['rejected', 'blowout']:
            # Early turns in rejected interactions might still be okay
            if turn_idx < total_turns * 0.3:
                return 'neutral'
            return 'bad'
        return 'neutral'

    def _generate_reasoning(self, text: str, phase: str, quality: str) -> str:
        """Generate reasoning for why a response is good/bad."""

        # This would ideally use an LLM, but here's rule-based version
        reasons = []

        if quality == 'good':
            if '?' in text:
                reasons.append("asks a question to engage her")
            if len(text.split()) < 15:
                reasons.append("concise and punchy")
            if phase == 'opener':
                reasons.append("opens conversation naturally")
        elif quality == 'bad':
            if len(text.split()) > 30:
                reasons.append("too long and rambling")
            if text.lower().startswith('i '):
                reasons.append("too self-focused")

        return '; '.join(reasons) if reasons else "contextual assessment"

    def _infer_situation(self, prior_turns: List[Dict]) -> str:
        """Infer the situation from prior conversation."""

        if not prior_turns:
            return "opening a new interaction"

        last_turn = prior_turns[-1]
        if last_turn['speaker'] == 'target':
            return f"she just said: {last_turn['text'][:50]}..."

        return "mid-conversation"

    def _build_context(self, prior_turns: List[Dict], max_turns: int = 3) -> str:
        """Build context string from prior turns."""

        recent = prior_turns[-max_turns:] if len(prior_turns) > max_turns else prior_turns

        context_parts = []
        for turn in recent:
            speaker = "HIM" if turn['speaker'] == 'coach' else "HER"
            context_parts.append(f"{speaker}: {turn['text']}")

        return " | ".join(context_parts) if context_parts else "start of interaction"

    def _assess_her_response(self, text: str) -> str:
        """Assess quality of her response (indicates if his line worked)."""

        text_lower = text.lower()

        # Positive signals
        positive = ['haha', 'lol', 'oh my', 'really', 'that\'s', 'wow', 'cute', 'funny']
        if any(p in text_lower for p in positive):
            return 'positive'

        # Negative signals
        negative = ['boyfriend', 'no', 'sorry', 'busy', 'leave']
        if any(n in text_lower for n in negative):
            return 'negative'

        # Short responses could be neutral or negative
        if len(text.split()) < 3:
            return 'neutral_or_cold'

        return 'engaged'

    def _classify_line_type(self, text: str) -> str:
        """Classify the type of line (opener, tease, compliment, etc.)."""

        text_lower = text.lower()

        if any(p in text_lower for p in ['excuse me', 'one second', 'random']):
            return 'opener'
        if any(p in text_lower for p in ['your number', 'instagram', 'coffee', 'drink']):
            return 'close'
        if any(p in text_lower for p in ['you\'re', 'you are', 'you look', 'i love', 'i like your']):
            return 'compliment'
        if any(p in text_lower for p in ['where', 'what', 'how', 'when', 'why', '?']):
            return 'question'
        if any(p in text_lower for p in ['just kidding', 'joking', 'tease']):
            return 'tease'

        return 'statement'

    def _infer_style(self, text: str) -> str:
        """Infer the style/tone of a line."""

        text_lower = text.lower()

        if any(p in text_lower for p in ['haha', 'lol', 'joking', 'kidding', 'funny']):
            return 'playful'
        if '!' in text:
            return 'energetic'
        if '...' in text:
            return 'mysterious'
        if len(text.split()) > 20:
            return 'verbose'

        return 'neutral'

    def generate_all(self):
        """Generate all training data formats."""

        # Load all interactions
        interactions = list(self.load_interactions())
        print(f"Loaded {len(interactions)} interactions")

        # Generate each format
        print("Generating scenario training data...")
        scenarios = self.generate_scenario_training(interactions)
        self._save_jsonl(scenarios, 'scenario_training.jsonl')

        print("Generating conversation flows...")
        flows = self.generate_conversation_flows(interactions)
        self._save_jsonl(flows, 'conversation_flows.jsonl')

        print("Generating turn pairs...")
        pairs = self.generate_turn_pairs(interactions)
        self._save_jsonl(pairs, 'turn_pairs.jsonl')

        print("Generating RAG chunks...")
        chunks = self.generate_rag_chunks(interactions)
        self._save_jsonl(chunks, 'rag_chunks.jsonl')

        print(f"\nGenerated:")
        print(f"  - {len(scenarios)} scenario examples")
        print(f"  - {len(flows)} conversation flows")
        print(f"  - {len(pairs)} turn pairs")
        print(f"  - {len(chunks)} RAG chunks")

    def _save_jsonl(self, data: List[Dict], filename: str):
        """Save data as JSONL."""
        output_path = self.output_dir / filename
        with open(output_path, 'w') as f:
            for item in data:
                f.write(json.dumps(item) + '\n')
        print(f"  Saved: {output_path}")


if __name__ == '__main__':
    import sys

    interactions_dir = sys.argv[1] if len(sys.argv) > 1 else 'training-data/interactions'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'training-data/processed'

    generator = TrainingDataGenerator(interactions_dir, output_dir)
    generator.generate_all()
```

---

## Phase 4: Quality Assurance

### 4.1 Manual Review Interface

Create a simple CLI tool to review and correct classifications:

```python
"""
Manual Review Tool for Training Data

Allows human review of:
- Content type classifications
- Speaker labels
- Interaction boundaries
- Outcome labels

Corrections are saved and used to improve classifiers.
"""

import json
import sys
from pathlib import Path


def review_interactions(interactions_file: str):
    """Interactive review of extracted interactions."""

    with open(interactions_file, 'r') as f:
        interactions = [json.loads(line) for line in f if line.strip()]

    corrections = []

    for i, interaction in enumerate(interactions):
        print(f"\n{'='*60}")
        print(f"Interaction {i+1}/{len(interactions)}")
        print(f"Outcome: {interaction.get('outcome', 'unknown')}")
        print(f"{'='*60}")

        for turn in interaction.get('turns', [])[:10]:  # First 10 turns
            speaker = turn['speaker'].upper()
            phase = turn.get('phase', '?')
            text = turn['text'][:100]
            print(f"[{speaker}] ({phase}) {text}")

        print(f"\nDetected outcome: {interaction.get('outcome')}")

        response = input("\nCorrect? (y/n/s=skip/q=quit): ").strip().lower()

        if response == 'q':
            break
        elif response == 'n':
            new_outcome = input("Enter correct outcome (number/rejected/blowout/unknown): ")
            corrections.append({
                'interaction_id': interaction['id'],
                'field': 'outcome',
                'old_value': interaction.get('outcome'),
                'new_value': new_outcome
            })
        elif response == 's':
            continue

    # Save corrections
    if corrections:
        corrections_file = interactions_file.replace('.jsonl', '_corrections.json')
        with open(corrections_file, 'w') as f:
            json.dump(corrections, f, indent=2)
        print(f"\nSaved {len(corrections)} corrections to {corrections_file}")


if __name__ == '__main__':
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'training-data/interactions/sample.jsonl'
    review_interactions(file_path)
```

### 4.2 Automated Quality Checks

```python
def validate_training_data(data_dir: str):
    """Run quality checks on generated training data."""

    issues = []

    # Check scenario training
    scenario_file = Path(data_dir) / 'scenario_training.jsonl'
    if scenario_file.exists():
        with open(scenario_file) as f:
            for i, line in enumerate(f):
                item = json.loads(line)

                # Check required fields
                if not item.get('example_response'):
                    issues.append(f"scenario_training line {i}: missing example_response")

                # Check response isn't too short
                if len(item.get('example_response', '').split()) < 3:
                    issues.append(f"scenario_training line {i}: response too short")

    # Check turn pairs
    pairs_file = Path(data_dir) / 'turn_pairs.jsonl'
    if pairs_file.exists():
        with open(pairs_file) as f:
            for i, line in enumerate(f):
                item = json.loads(line)

                # Check we have both sides
                has_she = 'she_says' in item or 'she_responds' in item
                has_he = 'he_says' in item or 'he_responds' in item

                if not (has_she or has_he):
                    issues.append(f"turn_pairs line {i}: missing speaker data")

    print(f"Quality check found {len(issues)} issues:")
    for issue in issues[:20]:  # First 20
        print(f"  - {issue}")

    return issues
```

### 4.3 QA for Scale (1000h)

- Sampling plan: review at least N=20 interactions per channel per 10 hours processed (stratify by outcome + confidence buckets) and log reviewer IDs.
- Inter-annotator checks: double-label 10% of samples for speaker/outcome; track agreement and feed corrections back as `provenance: human_reviewed`.
- Auto flags: mark degenerate interactions (duration < 10s, single-speaker, >70% segments filtered by quality gates) for review before they enter training sets.

---

## Phase 5: Folder Structure & Pipeline Commands

### 5.1 Final Folder Structure

```
training-data/
├── raw-audio/
│   └── SocialStoic/
│       ├── video.opus
│       └── video.info.json
│
├── transcripts/
│   └── SocialStoic/
│       ├── video.txt
│       ├── video.json           # Whisper output
│       └── video.srt
│
├── classified/                   # After Phase 1
│   └── SocialStoic/
│       └── video.classified.json # With content_type labels
│
├── features/                     # After audio feature extraction
│   └── SocialStoic/
│       └── video.features.json   # With pitch, energy, tone + audio_clip refs
│
├── interactions/                 # After Phase 2
│   └── SocialStoic/
│       └── interactions.jsonl    # Extracted interactions
│
├── processed/                    # After Phase 3 (FINAL OUTPUT)
│   ├── splits/                   # Train/val/test split by channel/video
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── scenario_training.jsonl
│   ├── conversation_flows.jsonl
│   ├── turn_pairs.jsonl
│   └── rag_chunks.jsonl
│
├── manifests/
│   └── audio_manifest.jsonl      # Checksums, status, last-processed versions
│
└── corrections/                  # Manual review corrections
    └── review_log.json
```

### 5.2 Complete Pipeline Commands

```bash
#!/bin/bash
# Full pipeline for processing a channel

CHANNEL="SocialStoic"

# Step 1: Classify content (intro/outro/infield/theory)
echo "Step 1: Classifying content..."
python scripts/classify_content.py \
    --input training-data/transcripts/$CHANNEL \
    --output training-data/classified/$CHANNEL

# Step 2: Extract audio features (pitch, energy, tone)
echo "Step 2: Extracting audio features..."
./scripts/batch_extract_features.sh $CHANNEL

# Step 3: Add speaker labels
echo "Step 3: Classifying speakers..."
python scripts/classify_speakers.py \
    --input training-data/features/$CHANNEL \
    --output training-data/features/$CHANNEL

# Step 4: Extract interactions
echo "Step 4: Extracting interactions..."
python scripts/extract_interactions.py \
    --input training-data/features/$CHANNEL \
    --output training-data/interactions/$CHANNEL

# Step 5: Generate training data
echo "Step 5: Generating training data..."
python scripts/generate_training_data.py \
    training-data/interactions \
    training-data/processed

# Step 6: Quality check
echo "Step 6: Running quality checks..."
python scripts/validate_training_data.py training-data/processed

echo "Pipeline complete!"
```

---

### 5.3 Manifests, Splits, and Reprocessing Rules

- Maintain `manifests/audio_manifest.jsonl` with checksum, duration, status, and last processed versions (ASR, diarization, feature extraction). Use it to resume failed jobs and to decide what needs reprocessing when models update.
- Split train/val/test by channel/video to avoid leakage; store split assignment in each record’s metadata and in `processed/splits/`.
- Carry `provenance` through splits (heuristic vs human_reviewed) so evaluation reflects label quality; prioritize human-reviewed data in validation.
- Reprocessing policy: if ASR model changes, redo transcripts + alignment + features; if diarization/embeddings change, redo speaker labels + embeddings only; if scoring heuristics change, regenerate processed JSONL without re-running ASR.

---

## Using the Training Data

### For Your Scenario Evaluation

Update your `/api/scenarios/openers/evaluate/route.ts` to use the training data:

```typescript
// Load examples from training data
import scenarioExamples from '@/training-data/processed/scenario_training.json';

// In your evaluation prompt:
const relevantExamples = scenarioExamples
  .filter(ex => ex.scenario_type === 'opener' && ex.quality === 'good')
  .slice(0, 5);

const prompt = `
You are evaluating an opener response.

Here are examples of good openers from real interactions:
${relevantExamples.map(ex => `- "${ex.example_response}" (${ex.reasoning})`).join('\n')}

Now evaluate this user's opener:
"${userResponse}"
`;
```

### For RAG-based Response Generation

```typescript
// Find similar examples
const similarChunks = await vectorDB.search({
  query: userSituation,
  filter: { type: 'opener' },
  limit: 3
});

// Use as context
const prompt = `
Situation: ${userSituation}

Similar successful approaches:
${similarChunks.map(c => `- ${c.text}`).join('\n')}

Generate a natural opener for this situation.
`;
```

### For Fine-tuning

The `turn_pairs.jsonl` format is compatible with OpenAI's fine-tuning:

```bash
# Convert to OpenAI format
python scripts/convert_to_openai_format.py \
    training-data/processed/turn_pairs.jsonl \
    training-data/openai_finetune.jsonl

# Upload and fine-tune
openai api fine_tunes.create \
    -t training-data/openai_finetune.jsonl \
    -m gpt-3.5-turbo
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Content classification accuracy | >90% | Manual review of 100 samples |
| Interaction boundary detection | >85% | Compare to manual annotations |
| Speaker classification accuracy | >80% | Manual review of 50 interactions |
| Useful training examples generated | >1000 per channel | Count after filtering |
| Scenario evaluation improvement | +20% user satisfaction | A/B test in app |

---

## Estimated Timeline

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Content classification scripts | 4 hours |
| 2 | Interaction extraction | 6 hours |
| 3 | Training data generation | 4 hours |
| 4 | Quality review (100 samples) | 2 hours |
| 5 | Integration with app | 4 hours |
| **Total** | | **20 hours** |

This can run in parallel with downloading/transcribing more channels.
