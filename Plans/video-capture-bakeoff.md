# Video capture bake-off: who said what, body language, situation, tone

Written 2026-11-13. Status: plan only, nothing run yet.

This replaces Phases 0b and 0c of `Plans/gold-videos.md`. Phase 0d and the
later phases of that plan stay as they are and start when this plan ends.
Video ids, coach names and the clip list are private, in
`~/.cache/daygame-research/capture/clips.md`, because this repo is public.

## For you first (owner items)

- **Money:** none. Everything runs on this PC and on the Claude subscription.
  Owner 2026-11-14: no paid tests; anything free is fine (Q1).
- **Deleting data:** none. Old outputs stay where they are; new work goes in
  a new folder.
- **Cannot be undone:** nothing.
- **One click (free, 1 minute):** sign in at huggingface.co and press "Agree"
  on the page of the newest pyannote speaker model (B2). Without it, one of
  the speaker methods is skipped.
- **Your time:** about 1.5 to 2 hours in total, spread over the plan:

  | When | What | Time |
  |---|---|---|
  | Phase 3 | Listen to the lines the machines disagree on, and fix them | 45–60 min, in sittings of 15 |
  | Phase 5 | The same for 3 test clips you have not seen | 15 min |
  | Phase 6 | Check the situation card of 8 sets (thumbs up or fix) | 10 min |
  | Phase 7 | Check about 40 short body-language moments (yes / no) | 15 min |
  | Phase 9 | Look at the format of the finished result | 10 min |

All of it is on one page with three tabs: Listen, Look, Scene.

## What your marks give us, and what they don't

You marked two sets almost fully on the Beat Map: the Lisbon set and the
coffee-shop set. That is 28 parts you agreed with, 2 you were unsure of, and
5 places where you said the text was off: "something seems to be missing",
"is this really the next line?", "seems weird that she says this".

- **What they give:** proof that the rebuilt text of those two sets reads
  right in most places, and a list of the places where it does not.
- **What they don't give:** a line-by-line answer key. You judged the meaning
  of each part, not every word and not who said each line. In those two sets
  my own record says I was not sure who spoke 80 of 248 lines.
- **So:** the two sets become the core of the answer key, but the key itself
  is built in Phase 3. The machines first try every method. Then you listen
  only where they disagree, plus some random lines to check that agreeing
  machines are right.
- The earlier "Who Speaks" page has no marks. It is folded into the new page
  and needs nothing more from you.

## What we already know (bake-off of 2026-11-12, 4 videos)

- Where the editor burned subtitles into the picture, reading them beats
  every speech model clearly. They caught 80% of the words, against 63–71% for
  the best speech model in the café and the group video.
- On the street video and the other coach's video, all speech models scored
  about the same (77–80%).
  Removing music and noise helped one model in the café (61% to 71%) and did
  nothing elsewhere.
- The score was "share of the editor's words caught". That only works where
  subtitles exist, and the editor shortens lines. The new answer key fixes
  this.
- Speakers were never scored, because there was no key.
- Body pose works when the two people are tied to their clothes. A Claude
  model reading sheets of frames works; two small local picture models gave
  unusable output.

## What this plan does, in plain words

Four tracks, each tested on the same clips:

1. **Words and speakers (most important).** Every link from download to the
   finished line is tried several ways: which file we download, how the sound
   is cleaned, which speech model, how the editor's subtitles are read, how
   the voices are told apart, and how all of it is combined. Each way is
   scored against an answer key: your ears, plus the editor's typed
   subtitles. The method that wins must also win on 3 clips nobody looked at
   while tuning.
2. **Body language.** A cheap pose model watches every frame, 10–15 a second,
   and flags moments: she steps back, turns away, touches her hair, laughs,
   looks at her phone. A stronger picture reader then checks only those
   moments. Your yes/no on 40 moments tells us which flags can be trusted.
3. **The situation.** One card per set: where it is, whether she is alone,
   walking or sitting, headphones, bags, coffee, style, how he approached,
   what the weather and the crowd are like. The card uses the same words as
   the app's scenarios, so the data can go straight into them.
4. **Tone.** Raw sound measures are kept for every line, plus laughter and
   how fast she answers. Tone words (confident, needy, hesitant, playful)
   are only used once a test shows the measures can tell them apart. The
   test uses clips where the tone is known, for example a coach saying the
   same line "the needy way" and "the confident way".

Tracks 2–4 run beside track 1 and do not wait for it, except that tone needs
the finished lines.

## Blockers (each tried once on 2026-11-13)

| ID | What | Tried, and result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | An answer key for words and speakers | Read the "Who Speaks" page db: 0 marks, 0 notes. Read the Beat Map db: 54 entries on the 2 sets, judging parts, not lines | Phases 4–5 | Your Listen tab in Phase 3 |
| B2 | Newest pyannote speaker model (community-1) is gated | Fetched its config with the stored HF token: HTTP 403. Gate type "auto": approved on clicking Agree | one speaker method | You click Agree (free). If not, it is skipped and the results say so |
| B3 | GPU room | `nvidia-smi`: RTX 4060, 8,188 MiB, 2,757 MiB in use by something else, so about 5.4 GB free | models over 5 GB | One model at a time. Larger models (8B speech models, 7B audio LLMs) run in 4- or 8-bit, or are skipped with the reason written down |
| B4 | Claude cannot hear | Claude takes text and pictures, not sound | audio-based judging | Sound is judged by local models and your ears only. Paid audio APIs only if you say yes (Q1) |
| B5 | Repo is public | — | — | Video ids, coach names, transcripts, frames and your marks stay in `~/.cache/daygame-research/capture/` |
| B6 | Disk | `df`: C: 762 GB free, Linux disk 558 GB free | nothing now | Phase 5 projects the space for all videos. If the projection is over 300 GB, keep full video only around the sets |
| B7 | Models newer than my knowledge (June 2026) | not tried; needs a web search | completeness | Phase 0 searches for anything newer before installing |
| B8 | NVIDIA NeMo (needed for Sortformer, Canary, Parakeet v3) not installed | `pip index versions nemo_toolkit`: 3.0.0 available | 4 candidate models | Install in its own venv in Phase 0; if it fails twice, use the ONNX builds where they exist |
| B9 | Subscription room for Claude reading at full scale | unknown until measured | the scale decision | Phase 5 measures tokens per minute of video and projects it |
| B10 | ffmpeg and AV1 video | `ffmpeg -decoders`: libdav1d present, so AV1 now decodes | nothing | Higher-resolution AV1 downloads can be tested |

## Questions (each with my recommendation; veto any)

| ID | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Compare against a paid or free cloud transcriber with speaker labels (for example Gemini, ElevenLabs Scribe, AssemblyAI)? | **Yes, as a yardstick only, on the 8 tuning clips (about 25 minutes of sound), if you create the key yourself.** A free Gemini key without billing costs nothing; a paid test costs under $5 and you run it yourself. It shows whether the local methods leave quality on the table | Local only | If local loses badly, we would not know |
| Q2 | Standard for "right words" | Meaning-faithful: what was said, with fillers allowed but not scored | Exact word for word, every "um" | Too lax misses real errors; too strict scores noise |
| Q3 | How many lines you listen to | Every line where the methods disagree, every line in your 5 flagged places, plus 15% of the lines they agree on, at random | Every line (about 3 hours) | Without the random lines, we cannot tell how often agreeing machines are wrong |
| Q4 | Who decides who speaks | A combination of signals: voice clusters, the coach's voice print, how close the voice is to the microphone, whose lips move on screen, and whether the line makes sense. An LLM may vote but never changes words | Let an LLM decide alone (what the old pipeline did; it deleted and moved words) | The old pipeline's errors again |
| Q5 | Her looks | Age range and style from the picture; nationality only from what is said, never guessed from looks | Guess nationality from looks | Wrong, and unfair, labels in the data |
| Q6 | Frames per second for body pose | Test 2, 5 and 15 a second and keep the lowest that misses nothing | Always 15 | Wasted time, or missed short moves |

## How a method is scored

The scorer is written in Phase 0 and frozen before any result is seen, so
the goalposts cannot move.

- **Words:** content-word error per speaker, his and hers separately, after
  normalising case, punctuation and numbers and dropping pure fillers.
- **Missing lines:** answer-key lines that a method mostly misses, per
  minute. Her short replies are the known weak spot.
- **Invented lines:** method lines with nothing in the key.
- **Speakers:** share of answer-key words given to the wrong person, at word
  level. Also: of her lines, how many come out as hers.
- **Voice-over:** voice-over read as conversation, and the other way round.
- **Meaning:** per line, a strong model (Opus) compares with the key: same,
  near miss or miss. A near miss counts 0.25 and a miss counts 1, following
  your note that a defensible other choice should count little.
- **Cost:** GPU seconds and Claude tokens per minute of video, projected to
  every conversation video in the inventory.

**Winner rule:**
- lowest weighted error on the 8 tuning clips;
- no single clip worse than the old pipeline;
- stable when any one clip is left out;
- on the 3 held-out clips, not more than 25% worse than on the tuning clips.

## Phases

Machine phases are run by the executing session. Owner steps are marked.

### Phase 0: set-up, research, frozen scorer

Depends on: nothing.

1. Make `~/.cache/daygame-research/capture/` with `code/`, `runs/`, `gold/`,
   `src/`, `page/`, and `runs.csv`.
   - One row per run: run_id, track, link, every setting written out (no
     defaults), clip, start, end, GPU seconds, tokens, output path, status,
     and the reason when skipped.
2. Web search (standard first, extended if thin) for the best open models as
   of November 2026, for each link below. Add anything newer than these
   lists; drop nothing without writing why.
3. Install each stack in its own venv. Never pip into an existing venv; it
   upgraded torch and segfaulted before. Planned venvs:
   - `venv-nemo`: Sortformer, Canary, Parakeet v3;
   - `venv-asr2`: CrisperWhisper, Kyutai STT, Voxtral, Granite Speech;
   - `venv-asd`: lip-movement speaker detection;
   - `venv-face`: gaze, head pose, smiles;
   - `venv-tone`: prosody, emotion and laughter models;
   - `venv-vlm`: local picture readers.

   Existing venvs (`venv-gold`, `venv-diarizen`, `venv-sep`, `venv-ocr`) are
   reused as they are.
4. Pick G6–G8 and H1–H3 by the rules in `clips.md`. Re-count first with
   `gold/code/recount.py`. Pick H1–H3 with a fixed random seed and do not
   open them.
5. Write `code/score_words.py`, `code/score_speakers.py` and
   `code/score_meaning.py` to the rules above. Test them on a hand-made toy
   clip with known errors. Freeze them: later changes need a dated reason in
   `code/SCORER_CHANGES.md`.

**Done when:** venvs import, `runs.csv` exists, all 11 clips are chosen, and
the scorer passes the toy test.

### Phase 1: capture the sources (link 1 and 2)

Depends on: Phase 0.

**Link 1, source files.** For each G clip, list every format with yt-dlp
(`-J`, keep the json).
- Audio:
  - download the original-language track, never an AI-dubbed one (check
    `language` and `format_note`);
  - get both the best opus (251) and the best m4a (140).
- Video:
  - the best H.264 or AV1 at 1080p;
  - plus the highest resolution available (1440p or 4K), for faces and
    subtitles.
- Subtitles:
  - creator-uploaded subtitles, if any;
  - YouTube's automatic captions as one more candidate.
- Test that matters: one speech model on opus versus m4a, and the subtitle
  reader and the face model on 1080p versus the highest resolution. Keep
  whichever wins; write the numbers in `runs.csv`.

**Link 2, cuts and voice-over.**
- Picture cuts: PySceneDetect and TransNetV2.
- Sound quality per frame: Brouhaha (speech, noise level, room echo). Studio
  voice-over has almost no noise or echo, so this flags it.
- Every line later gets split at a cut. Lines glued across a cut were a known
  fault of the old pipeline.

**Done when:** every G clip has its sources, cut list and quality track in
`src/<clip>/`, and the format tests are logged.

### Phase 2: run every candidate (words and speakers)

Depends on: Phase 1. Runs on the 8 G clips only. Each run is resumable and
skips when its output exists.

**Link 3, sound prep (each feeds every speech model in link 5):**
- raw;
- loudness-levelled (ffmpeg `dynaudnorm`);
- voices separated from music: Demucs htdemucs, Demucs htdemucs_ft, a
  Mel-band RoFormer vocal model (python-audio-separator);
- speech cleaned: DeepFilterNet3, and one MossFormer2/ClearerVoice model;
- per-turn levelling: each diarized turn brought to the same loudness, so
  her quieter voice is not lost;
- prep chosen per stretch by the Brouhaha noise level.

**Link 4, finding speech:** Silero VAD, pyannote segmentation 3.0, and each
model's own. Score: her short replies found or missed.

**Link 5, speech models.** All that fit B3:
- faster-whisper large-v3 and large-v3-turbo;
- distil-large-v3.5;
- CrisperWhisper (keeps "um" and false starts; useful for tone later);
- Parakeet TDT 0.6b v2 and v3;
- Canary-1b-v2;
- Canary-Qwen-2.5b;
- Kyutai STT 2.6b;
- Voxtral Mini 3B (8-bit);
- Granite Speech 3.3 (2b, or 8b in 4-bit);
- the old WhisperX run;
- added by the 2026-11 research (`capture/research-2026-11.md`): Qwen3-ASR
  1.7B and 0.6B, Cohere Transcribe (gated, owner click), Granite Speech 4.1 2B
  and 5.0 470M, Nemotron 3.5 Transcribe (GGUF with CPU offload), and two models
  that give words and speakers in one pass: MOSS-Transcribe-Diarize 0.9B and
  VibeVoice-ASR (BitNet; 8.7B only in 4-bit);
- YouTube automatic captions;
- Q1 cloud yardstick: owner said no paid tests; skipped.

Settings for the two best Whisper-type models, one change at a time:
- beam 5 versus 10;
- `condition_on_previous_text` off;
- a lower no-speech cut-off;
- a prompt with the names and places in the video;
- the whole file versus turn by turn.

**Link 6, editor subtitles.** Where they are burned in:
- Claude reading contact sheets (what we did; best known, costs tokens);
- RapidOCR (installed) and PaddleOCR;
- a local picture reader (Florence-2 or Qwen-VL OCR).

Subtitle timing comes from `subframes.py` (frame-change detection).

**Link 7, word timings:** each model's own, the WhisperX wav2vec2
alignment, and the NeMo Forced Aligner. Speakers are given to words by time,
so word timing matters.

**Link 8, voice clusters (diarization):**
- pyannote 3.1;
- pyannote community-1 (B2);
- DiariZen;
- Sortformer (streaming v2, and v1);
- NeMo MSDD;

each with and without a speaker-count hint (2, or 3 in a group).

**Link 9, the coach's voice print.** The coach is the same man in every
video.
- Enrol him from 2 minutes of his voice-over and teaching talk.
- Score every turn against the print, with three embedding models: ECAPA
  (SpeechBrain), WeSpeaker ResNet, TitaNet.
- Then the main question becomes simple: is it him, or not him?

**Link 10, close to the microphone.** His microphone is on him.
- Per turn: loudness, noise level and echo (Brouhaha).
- A close, dry voice is usually his.

**Link 11, lips on screen:** Light-ASD and TalkNet on the faces in the
picture: who is visibly talking.

**Link 12, does the line make sense:** Opus reads the lines without speaker
names and says who most likely said each one, with a confidence. It may only
vote. Its output never changes words.

**Done when:** every candidate has a row in `runs.csv` with status done or
skipped-with-reason, on all 8 clips.

### Phase 3: build the answer key (owner: 45–60 minutes)

**Probe first (owner suggestion, 2026-11-14).** Before the full key, build the
key for one 3-minute probe: the coffee-shop set 0:10–3:10 (clip P1 in
`clips.json`; it holds 2 of the 5 flagged places and the café noise). The
owner listens to P1 only (about 15 minutes). Every Phase 2 method is scored on
P1 by cutting its G2 output to that span. Only the best 3 per link go on to
the other 7 clips, and new or slow methods are tried on P1 first. Then the
full key (steps 1–5) is built for the finalists' disputes only.

Depends on: Phase 2.

1. **Draft.** Opus (a subagent with `model: opus`) builds a draft key per
   clip:
   - lines, start and end, speaker, and text;
   - built from the editor subtitles where they exist and from the speech
     models elsewhere;
   - it may pick or merge words that some method or the subtitles heard,
     never invent;
   - every line carries the candidates it came from.
2. **Disputes.** A line goes to you when any of these is true:
   - the speaker signals disagree;
   - the candidate texts differ in content words;
   - it sits in one of your 5 flagged places;
   - there is speech sound with no words (a missing reply);
   - it was drawn in the random 15%.
3. **Gold Check page, Listen tab.** Start from the "Who Speaks" page code.
   Mobile first.
   - One card per disputed line, in conversation order, with the agreed
     lines greyed in between for context.
   - ▶ plays the line; a second button plays 5 seconds around it.
   - Speaker buttons: him / her / friend / voice-over / both / can't tell.
   - The text is editable. ✓ means "right as shown".
   - A note box per card, with a Save button, a green "Saved" badge, and all
     earlier notes listed. Notes are appended, never overwritten.
   - Progress per clip, so you can stop and resume.
   - Before sending the link, check it in headless Playwright at 390 px
     width: playback works, a save survives a reload, nothing scrolls
     sideways.
4. **Owner step.** You listen and mark.
5. **Finalise.** `gold/<clip>.json` is the key: the draft plus your marks.
   - Each line records where its truth came from: owner, subtitles plus
     agreement, or agreement only.
   - Report how often the randomly checked agreed lines were wrong. That
     number is how far "agreement only" can be trusted.

**Done when:** all 8 keys exist, and every disputed line has a mark.

### Phase 4: score, improve, combine

Depends on: Phase 3.

1. Score every Phase 2 run with the frozen scorer. Table per link: method,
   error per clip, cost.
2. Pick the best prep per model, then the best 3 speech models.
3. **Word merge,** tried 4 ways:
   - the best single model;
   - ROVER-style word voting;
   - subtitles first, with gaps filled by the best model;
   - Opus merging the candidates (it may only choose words some candidate
     has).
4. **Speaker combination,** from the signals of links 8–12:
   - a simple weighted vote;
   - a small logistic regression, checked by leaving one clip out each time.

   It is kept only if it beats the best single signal on every left-out
   clip.
5. **Lines:** how words become lines (speaker change, pause length,
   subtitle breaks, cuts). Tune the pause threshold on the key.
6. **Confidence per line:** each line carries "sure" or "check", from how
   much the signals agree. Score it: of the "sure" lines, how many are right?
   Target: 98% or more.

Each change is one run, logged. No change to the scorer.

**Done when:** one full chain wins under the winner rule on the tuning
clips, and the table shows the next-best method for each link.

### Phase 5: prove it (owner: 15 minutes)

Depends on: Phase 4.

1. Open H1–H3 for the first time. Run the winning chain unchanged.
2. Build their keys the same way (Phase 3 steps 1–2 and 5), and put them on
   the Listen tab. Owner step: 15 minutes.
3. Score them. If the winner rule fails, write down where, return to Phase 4
   once, and say so in the report.
4. **Adversarial review.** Two fresh agents that never saw the work try to
   break the conclusion. They check:
   - leaks between tuning and held-out clips;
   - scorer bugs;
   - a key biased toward the winning method;
   - silent defaults in any link.

   Fix what they find, then re-score.
5. **Scale test.** Run the chain on 10 fresh conversation videos from 4
   coaches. Measure GPU minutes, tokens and disk per minute of video. Project
   to the whole inventory, and say how many days it takes at the
   subscription's pace.
6. **Results page** (one, short): the winner per link with its score, what
   lost and by how much, cost per video, projected total. Update the
   "Video 0 Bake-off" page instead of making a new one.

**Done when:** the held-out score passes, the review findings are fixed, and
the page is live.

### Phase 6: situation card (owner: 10 minutes)

Depends on: Phase 1. Runs beside Phases 2–5.

1. **Card fields.** Build them wide from your examples, from the app's
   scenario words, and from what scenarios could use. The app's words are in
   `src/scenarios/openers/types.ts`: EnergyState, WeatherType, Season,
   OutfitCategory, Position, ActivityId. The archetypes are in
   `src/scenarios/shared/archetypes.ts`. At least:
   - place type, and indoor or outdoor;
   - city and country (from words and signs);
   - crowd, time of day, weather, season;
   - alone, with a friend, or a group, and how many;
   - walking, standing or sitting, and her pace (rushing?);
   - headphones (in the ears, or around the neck);
   - phone in hand, or looking at it;
   - what she carries (shopping bags, coffee, backpack, suitcase);
   - sunglasses;
   - age range and outfit category;
   - her energy before he speaks;
   - how he approached: from the front, the side or behind;
   - did she stop, or keep walking;
   - distance at his first word;
   - is the camera visible to her;
   - noise level (Brouhaha);
   - language spoken;
   - nationality (from words only, Q5);
   - the outcome (number, Instagram, date, she left).

   Every field has fixed values plus "unclear".
2. **Frames.** One a second over the minute around the approach, plus 4
   across the rest of the set. The old 8 frames per set left too many
   "unknown".
3. **Methods:**
   - Sonnet on frame sheets;
   - Opus on the same sheets (for the draft key only);
   - the best local picture reader that fits B3 (Qwen3-VL, MiniCPM-V,
     InternVL; check Phase 0 research);
   - an open-word object finder (YOLO-World, OWLv2 or Grounding DINO) for
     headphones, bags, cups and phones, on her crop;
   - fields taken from the words where the words say it ("you're with your
     friend").
4. **Key.** Opus drafts the 8 cards from sheets and words. Gold Check page,
   Scene tab: one card per set, pre-filled, thumbs up or fix per field.
   Owner step: 10 minutes.
5. **Score:** field accuracy per method, with "unclear" counted as half
   right when the key is not unclear. Cost per set.

**Done when:** each field has a winning method or is marked "not reliable
yet", and the scores are on the results page.

### Phase 7: body language (owner: 15 minutes)

Depends on: Phase 1. Runs beside Phases 2–6.

1. **Moment list.** Build it from your notes ("when she does X things it
   shows rising or falling interest", "single signals are weak; several
   together are strong") and from published research on courtship
   nonverbal behaviour. Keep only moments that can be seen. Keep the source
   per moment in the cache.
   - **Her:**
     - distance to him, and steps back or forward;
     - torso and feet turned toward him or away;
     - stops walking, or turns to leave;
     - leans in;
     - hair touch, neck touch, arms crossed;
     - phone use;
     - touches him;
     - smile, laugh;
     - looks at him or away, nods, tilts her head.
   - **Him:**
     - approach line and angle;
     - distance, side-by-side or face-on;
     - touches her;
     - steps back (a "false time" move).
2. **Methods:**
   - Pose models: YOLO11-pose (installed), RTMPose or RTMO (rtmlib), and
     MediaPipe, at 2, 5 and 15 frames a second (Q6). Tracking: ByteTrack.
     Identity: the existing clothing anchor (`gold/code/pose_pair.py`), plus
     a re-identification embedding.
   - Face (where faces are big enough; measure the pixel size): head pose
     (6DRepNet), gaze (L2CS-Net), smile and action units (LibreFace or
     OpenFace 3).
   - Picture readers: Sonnet on dense strips (4 frames a second over
     10-second windows); the best local reader on the same.
   - **Cascade (your idea of a lesser model on many frames):**
     1. pose and face flag candidate moments at 15 frames a second;
     2. the picture reader checks only those windows.

     Compare its cost and accuracy with reading everything.
3. **Key.** Opus reads dense strips of 3 clips (G1, G2, G3) and lists every
   moment with its second.
   - Gold Check page, Look tab: about 40 short video snippets (3 seconds
     each, as page assets).
   - Each asks "Did she [do X] here?" yes / no / unclear.
   - Mix in true moments, machine-only moments, and 5 random empty windows,
     to catch missed moments.
   - Owner step: 15 minutes.
4. **Score:** per moment type, how many found, how many false, timing
   error, cost per minute.
5. Output aligned to the lines: for each line, what she did during it and in
   the 2 seconds after.

**Done when:** each moment type is marked reliable, usable together with
other signals, or not reliable yet, with numbers.

### Phase 8: tone

Depends on: Phase 5 for the lines. The validation sets can start after
Phase 0.

1. **Raw measures for every line** (cheap, kept for all videos). Each line
   gets a reliability flag from the Brouhaha noise level, because her voice
   is far from the microphone.
   - pitch: level, range, and the rise at the end;
   - loudness;
   - speaking rate;
   - pause before the answer: how fast she replies;
   - overlaps and interruptions;
   - fillers per minute (from CrisperWhisper);
   - voice quality (Praat via parselmouth: HNR, jitter, shimmer);
   - the eGeMAPS set (openSMILE).
2. **Laughter:** a laughter detector plus the AudioSet laughter classes
   (BEATs or PANNs). Her laughing is one of the strongest signs of interest.
3. **Ready-made judges:**
   - dimensional emotion (audeering wav2vec2: arousal, valence, dominance;
     dominance is closest to "confident");
   - emotion2vec+ large;
   - one local audio LLM that fits B3 (Qwen2.5-Omni-3B, or Voxtral in
     8-bit), asked to describe the tone.
4. **Proof sets, where the right answer is known:**
   - a) from our own downloaded teaching videos: search the transcripts for
     "tonality", "needy", "say it like", "versus". Cut the paired demos where
     a coach says the same line two ways and names them;
   - b) 2–3 outside voice or acting coaching videos that do the same;
   - c) one licensed acted-emotion set (CREMA-D, or RAVDESS) as a sanity
     check.

   Keep sources and clips in the cache only.
5. **Test.**
   - For each tone word, can a measure or a judge tell the pair apart beyond
     chance? Pair accuracy of at least 70%, and a sign test p < 0.05, on at
     least 20 pairs.
   - Words that pass are "proven" and may be shown. The rest stay as raw
     numbers.
   - Your own test from Track T of `Plans/gold-videos.md` (10 videos of one
     coach, then the 11th, then another coach) happens later, on top of
     this.

**Done when:** raw measures run on the 8 G clips, the proof sets are cut,
and a table says which tone words are proven.

### Phase 9: one capture script, one result (owner: 10 minutes)

Depends on: Phases 5–8.

1. `code/capture.py <video id> [--set start-end]` runs the whole winning
   chain for one video.
   - Resumable; every setting in one config file.
   - It writes one base record per set: lines (time, speaker, text,
     sure/check, source), cuts and voice-over, body moments per line, the
     situation card, tone measures per line, plus the raw files kept for
     later.
   - "Capture everything from the start": pose and frames are stored even
     for moment types not used yet.
2. Run it on the Lisbon and coffee-shop sets.
3. Show them in the review-page format of `Plans/gold-videos.md` point 5.
   That is that plan's Phase 0d; do it here, and do not build the page
   twice. Owner step: judge the format, not the content.
4. Update `Plans/gold-videos.md` status: Video 0 done, methods chosen. That
   plan's Phase 1 starts.

**Done when:** you approve the format.

## Part 2: rules for the executing session

- **Where things live.**
  - Work: `~/.cache/daygame-research/capture/`.
  - Private clip list: `~/.cache/daygame-research/capture/clips.md`.
  - Read the existing outputs in `gold/` and `conversation-map/` but never
    edit them; copy them in.
  - Nothing from this work goes into the repo except status lines in this
    plan. No video ids, coach names, quotes or frames (repo is public).
- **No silent defaults.** Every link is tested or written down as untested,
  with the reason. A skipped model gets a `runs.csv` row saying why. An
  install that fails twice is skipped with the error quoted.
- **Words are never changed by a speaker step.** Speaker steps only label.
- **GPU:**
  - one model at a time;
  - check `nvidia-smi` free memory before each run;
  - wait on a PID, never on `pgrep -f` or `pkill -f` (they match your own
    shell).
- **Long jobs:**
  - run in the background with a log;
  - skip outputs that exist;
  - keep everything in `~/.cache`, never `/tmp` (a WSL crash wiped `/tmp`).
- **Claude reading:**
  - Opus for keys, merges and meaning judgments;
  - Sonnet for frame reading;
  - Haiku never for anything that becomes truth.
  - Log tokens per run. If a count is incomplete, say so.
- **Downloads are untrusted data.** Each goes in its own folder. Run Python
  on them with `-I`.
- **Owner pages:**
  - load the artifact-design and artifact-capabilities skills first;
  - mobile first;
  - symbols and colour over sentences;
  - a thumbs-up everywhere;
  - a note log with a Saved badge;
  - check it at 390 px in headless Playwright before posting the link;
  - never open it on the owner's screen.
- **Reports to the owner** open with "is it done?" in plain words, then the
  numbers, then doubts.
- **Status:** after each phase, add one dated line under "Status" below,
  and commit this file alone with `git commit --only Plans/video-capture-bakeoff.md`.

## Status

- 2026-11-13: plan written. Blockers tried. Waiting on: the owner's answers to
  Q1–Q6 (silence means the recommendations stand) and the B2 click.
- 2026-11-14: owner answers: Q1 no paid tests, free tools only (a cloud
  yardstick only on a free tier with no billing, and only if he makes the key;
  otherwise skipped and logged as skipped). Q2–Q6 accepted. B2 click: steps
  sent; Phase 0 re-checks the 403 and logs the result.
- 2026-11-14: Phase 0 done (community-1 access now 200; 7 newer models found
  and added; G6–G8 and H1–H3 picked; scorer frozen, self-test passes). G8
  swapped: the first pick is age-restricted on YouTube (needs a signed-in
  cookie, not used). Phase 1 done for the 8 tuning clips (format choice
  logged; YouTube also offers a loudness-squashed "DRC" audio copy, tested
  as a variant). Phase 2 on the probe: 30+ word runs, 13 speaker runs, 6
  sound preps, coach voice print (2 embeddings), close-mic quality (SQUIM)
  and lips-on-screen (Light-ASD). Not yet run: Kyutai, VibeVoice, Cohere
  (gated), Nemotron 3.5 (needs CPU offload), NeMo MSDD, TitaNet. Gold Check
  page live with Listen (probe, 53 lines), Scene (88 fields) and Look (42
  clips) tabs; waiting on the owner's marks.
- Findings so far: the editors blur the women's faces in almost every clip,
  so face-based reads (smile, gaze, age, her lips) are mostly unavailable;
  body language must come from posture and movement. She is visible for
  well under half of some sets (cutaways, back to camera, far shots).
  Pose-only rules miss her stop and walking-on in one clip (tracks switch
  people); a picture-reader check on top is needed. The rebuilt subtitle
  transcript's timings run up to 1–2 s off the speech.
- 2026-11-14 provisional probe scores (against the unchecked draft key, so
  the order may move once the owner marks the Listen tab; `capture/runs_score_P1.csv`,
  `code/score_all.py`). Words: the joint MOSS model is best overall (9% word
  error, her words 19%), then Voxtral and YouTube's own captions (23–24% on her
  words); the rebuilt-subtitle text scores best on her words but the draft key
  leans on it, so that is not yet fair. Sound prep before Whisper: vocals
  separation (htdemucs) helps a little; DeepFilter and MossFormer2 hurt badly
  (they cut her voice). Speakers: MOSS's own labels put 16% of words on the
  wrong person, DiariZen 19–21%, pyannote community-1 23%; pyannote 3.1 on
  prepped sound collapses to one speaker. Voice prints find her lines (39–41 of
  42) but also tag much of his speech as not-him. Face-based active speaker
  (Light-ASD) fails: her face is blurred. First fusion (`code/fuse.py`: words
  from one run, speakers voted across runs, named by the voice print) does not
  yet beat MOSS alone (19% vs 16%).
- GPU runs go through `code/gpu_guard.py` (capture folder): while the owner's
  game is in a match, workers run a quarter of the time and are stopped if video
  memory gets near full; full speed otherwise.

## Execution prompts

One session per phase. Each starts with:

> Read `Plans/video-capture-bakeoff.md` (Part 2 first) and
> `~/.cache/daygame-research/capture/clips.md`. Execute Phase N. Stop when
> its "Done when" holds, add the status line, commit, report.

- `/goal` Phase 0, then Phase 1 (one session).
- `/goal` Phase 2 (long; background jobs; may span sessions, resumable).
- `/goal` Phase 3 steps 1–3, then post the Listen tab link and stop.
- After the owner's marks: `/goal` Phase 3 step 5 and Phase 4.
- `/goal` Phase 5 (stops for the owner's 15 minutes, then continues).
- `/goal` Phase 6 and Phase 7 (can run as soon as Phase 1 is done).
- `/goal` Phase 8.
- `/goal` Phase 9.
