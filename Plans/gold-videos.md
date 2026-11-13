# Gold videos: 100 conversations mapped right, one video at a time

Written 2026-11-11, from your 43 notes on the "The Finished Video" page
(https://claude.ai/artifact/QnnHBeHJdtSRqg5fAbP8rh). This plan takes over from
`Plans/conversation-map-social-stoic.md` (Phases 2–6) and absorbs
`Plans/transcript-quality.md` (Phases 0–2), which was never run.

## Status (2026-11-12)

- Phase 0a done. 0b and 0c run; results page: https://claude.ai/artifact/CeXKs1KWgC97bwZFiLVyXF
- 0b speakers wait for the owner's marks on https://claude.ai/artifact/5ZePdZuah7biEuCBwtdtqM
- Then Phase 0d. Work files are outside the repo in `~/.cache/daygame-research/gold/`.
- 2026-11-13: Phases 0b and 0c are replaced by `Plans/video-capture-bakeoff.md`
  (words, speakers, body language, situation, tone, tested link by link).
  This plan resumes at Phase 1 when that one ends; its Phase 9 does 0d.

## Owner items

- **Money:** none. Everything runs on this PC (RTX 4060, 8 GB) and the Claude
  subscription. If a paid model ever looks clearly better for reading
  frames, I show you the test result and the price, and you decide.
- **Deleting:** none. Old outputs stay in their folders.
- **Your time:**
  - in Phase 0b, about 25 minutes of listening to short clips and marking
    who says what;
  - after that, one review page per phase.

## What your notes changed

1. **Video 0 comes first: find the best method before mapping anything.**
   - Several ways of getting words, speakers, picture and sound are tried on
     the same videos again and again.
   - The winner must hold across different videos and coaches, not just one
     video.
   - It is settled before video 2.
2. **Capture everything from the start.** Fetching a missing variable later
   (body language, how he approached, the place) means redoing every video.
   - So the raw data is collected for every video now, even if we only use
     part of it at first: picture, sound and words.
3. **Understanding over rules.** A growing list of hard rules turns brittle
   and drifts.
   - Instead: a short guide of principles, plus worked examples (your
     corrected lines and why).
   - A new video is checked against the examples, but a mismatch means "look
     at it", not "wrong".
   - Single signals are weak; several signals together are strong (your
     day-trading point).
4. **Mistakes have weights.**
   - **Near miss:** a defensible other choice, where you could see it both
     ways. It counts little.
   - **Miss:** off the mark. It counts fully.
5. **The review page gets faster to read.**
   - Notes and a thumbs-up on every line and every part.
   - Symbols and colour instead of sentences for: not sure who speaks,
     something cut here, muted.
   - What the editor muted, and his comments on the set, are shown plainly.
   - All of a line's labels sit in one row: stage (two at once allowed),
     move, her signals.
   - Extras (prepared, what to practise, Copenhagen version) fold away.
   - Every summary item (hook point, holes) links to its actual line.
   - For now the page leans towards too much information. It gets leaner as
     the method proves itself.
6. **Two buckets of videos.**
   - **A:** the opener is on camera. These are used first.
   - **B:** everything else, including the sets in a compilation whose
     opener isn't shown. These are kept and used later, especially for the
     coaches you like most.
   - The video count per coach is refreshed regularly, because new uploads
     appear.
7. **Corrected:** the 5 sets already done are **not** a test set. You
   reviewed parts of Lisbon and the coffee shop only. Those notes become
   worked examples; nothing else does.
8. **Tone is split in two.**
   - Raw sound measures are kept for every line (cheap). They are not shown
     for review now.
   - Telling cocky, needy or insecure apart is a separate later track (Track
     T), because it has to be proven, not invented.

## Guide changes from your notes (principles, not hard rules)

- **Stack** can build on his own statement; she need not give anything.
  **Vibe** can simply be humour. Where the line between them is unclear, say
  so; that is a near miss, not a miss.
- Elaborating the compliment overlaps open and stack: still opening, already
  stacking. Two stages at once is the normal answer there.
- She can move the set forward too (a question, visible interest). He is
  the one who has to notice a new stage is emerging.
- "Says what he was doing" belongs to the opener: it gives context so she
  isn't afraid.
- Small talk is labelled by what lies under it: is it flat? is she the one
  leading because she is interested? That matters more than the label.
- Compliments are read by their place in the whole conversation and its
  stage.
- Interest is read from several signals together, never one. A numeric
  interest score comes later, once there is enough data.
- The rule "only sets that show the opener" is now bucket A first, B later
  (your D1 note). It came from your 2026-11-10 note that a set without its
  start is no use while we build the opening phases.

## Phases

**Phase 0a: inventory (me).**
- Every video per coach: downloaded or not, and a conversation or a teaching
  video.
- Each conversation goes into bucket A or B, with a per-set count for
  compilations.
- A script re-counts new uploads.
- Done when the table exists and the script runs.

**Phase 0b: words and speakers bake-off (me, then your 25 minutes).**
- 4 videos of different kinds:
  - street, with the editor's subtitles;
  - noisy café;
  - a group;
  - another coach, with no subtitles.
- Methods tried:
  - reading the editor's burned-in subtitles;
  - WhisperX (the old pipeline);
  - faster-whisper on voices cleaned of music and noise;
  - at least one other speech model;
  - two speaker trackers (pyannote 3.1 and DiariZen, both already
    downloaded);
  - combinations of the above.
- Scoring:
  - Words are scored against the editor's subtitles where they exist. Those
    subtitles are typed by a person.
  - Speakers are scored against your marks. You listen to about 20 short
    clips on one page and mark who says what.
- Done when one method (or a combination) wins on all 4 videos, and the
  result page shows the scores.

**Phase 0c: picture bake-off (me).**
- On 2 videos, try:
  - a body-pose model (where each person stands and faces, distance, steps
    back, turning away, touching her hair), run at 10–15 frames a second;
  - a small picture-reading model on sampled frames (scene, what she
    carries, how he approaches);
  - a lighter Claude model reading frame sheets.
- I compare what each one catches against what I see on the same frames.
- Done when a page shows, per method, what it reliably catches, what it
  misses, and the time and token cost of each.

**Phase 0d: review page v2 (me, then you look at the format only).**
- The coffee-shop set, rebuilt with the Phase 0b and 0c methods.
- Shown in the new page format (point 5 above).
- You judge the format, not the content.
- Done when you say the format works.

**Video 0 is done** when the methods from 0b and 0c are chosen and the
format from 0d is approved.

**Phase 1: video 1 (me, then you).**
- A new bucket-A Social Stoic video with the chosen methods.
- Two independent mappings, possibly by different models.
- You check:
  - where the two mappings disagree;
  - the lines I am unsure of;
  - 10 random lines.
- Score: misses and near misses, plus the token count.
- Done when you sign it off.

**Phase 2 onward: one video at a time.**
- Your corrections become worked examples, and the guide changes only when a
  principle was missing.
- When the score stays low for 3 videos, your check shrinks to the random
  lines.
- After about 20 Social Stoic videos, the next coach.

**Track T: tone (later, not before video 5).** It starts with a list of tone
words we can actually prove.
- Validate them on outside videos where tone is named outright (acting,
  speech coaching), and test whether the measures tell them apart beyond
  chance.
- Then your test:
  - learn from 10 Adam videos;
  - the 11th video should come out similar;
  - a 12th from another coach should be similar in shape;
  - your own voice notes should show the gaps.

## Blockers (each tried once)

| ID | What | Tried, and result | Recommendation |
|---|---|---|---|
| B1 | Speaker answer key | I can't hear audio; editor subtitles never show who speaks | Your ~20 clips in Phase 0b |
| B2 | GPU room | `nvidia-smi`: 8 GB, 3.6 GB already in use by another process | Run picture models one at a time, in small batches |
| B3 | Pose and picture models not installed | Checked: none in the cache | Install into a separate environment in `~/.cache`, not the repo |
| B4 | Token count per video | Session logs give exact counts (done 2026-11-11: about 68M tokens in one session) | Run each video in its own session, or log start and end times; I say so if a count is incomplete |
| B5 | Repo is public | — | Transcripts, frames and your marks stay in `~/.cache/daygame-research` |

## Decisions taken (veto any)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Bake-off videos | 4 of different kinds, one from another coach | 1 video only | A method that fits one video and fails the rest |
| Frame rate for body pose | 10–15 a second (pose models are fast) | 1 a second | Missed short movements such as a step back |
| Second mapping | A different model where it helps | The same model twice | Two copies of one model can share the same blind spot |
