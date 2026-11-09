# Transcript quality: measure it, then walk back what needs it

Written 2026-11-09. Status: plan only, nothing run yet.

## Owner decides first (one ask)

1. **25 minutes of listening (your ears are the answer key).** No sampled
   video has human-made captions on YouTube, and I can't hear audio. So you
   listen to 12 short clips on one page and mark each line. Recommendation: yes.
2. **No money.** Everything runs on this PC (Whisper, pyannote, GPU) and on
   the Claude subscription that the LLM stages already use. Re-running about
   270 videos takes the subscription's quota over several days. Nothing is
   bought. Recommendation: yes.
3. **Old pipeline outputs are kept.** Re-runs write new outputs; the current
   ones are copied to a dated folder first (1.1 TB free on C:). No deletion.
4. **The app's Q&A data is replaced later (Phase 4).** It means deleting the
   current 955 chunks (31 videos) and loading new ones. They can be rebuilt
   from files at any time, but it is a delete, so it waits for your yes then.

## Where we are (counted 2026-11-09)

| | Videos |
|---|---|
| In your playlists on YouTube today | 2,161 |
| Downloaded | 1,610 |
| Through the whole pipeline on this PC (stage 09) | 1,277 |
| **Actually loaded into the app** | **31** (all from Feb 2026) |

- The last pipeline run was 2026-08-05. Four Natural Lifestyles playlists
  (106 videos) were never downloaded.
- 267 of the finished videos hold conversations with women: 428 conversations,
  about 21 hours. The other ~1,130 are teaching videos (one person talking).
- Per-creator table and the samples: see the status page linked in chat.

## What is wrong (from samples and counts)

Teaching videos read clean. Conversation videos do not, and the faults sit
almost all on her side:

1. **Her replies are missing.** The microphone is on him. In 44% of the cases
   where he asks a question, the next line is him again (2,991 questions).
   Some of that is normal; most is her answer not being transcribed.
   Example: OntdnFF7HSM at 0:10, where her answer to his question is not there.
2. **Wrong person.** Short replies ("yeah", "oh my God") get his label, or a
   whole set gets his label (L2MWaFVEX74: every line is "coach").
3. **The repair step deletes or moves words.** 184 of 428 conversations have
   5% or more lines blanked by stage 06e/06h "repairs", and fragments get
   glued onto the wrong person's line.
4. **Lines glued across a cut.** kVNih9mOvsE at 1:42: his first words back
   to her were glued onto his voice-over, so they left the conversation.
5. **The quality gate can't tell good from bad.** Stage 07b passes 98% of
   videos, including ones with every line on the wrong person.

By the pipeline's own confidence marks, 77 of 428 conversations (18%, about
6 hours) pass all checks. Reading a few of the 77 says they are readable but
not exact. These marks are the machine grading itself. Phase 1 tests them
against your ears.

## Blockers (each tried once)

| ID | What | Tried, and result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | No human-made captions to compare with | Listed subtitles for 30 sample videos with yt-dlp: 0 have English captions made by people, 28 have YouTube's machine captions | an answer key without you | Your 25-minute listening pass (Phase 0) |
| B2 | I can't hear the audio | n/a | judging words and speakers | Same; I use two machine transcripts to show where they disagree, so you listen where it matters |
| B3 | GPU size | `nvidia-smi`: RTX 4060, 8 GB; Whisper large-v3 + pyannote 3.1 have run on it before | nothing | none |
| B4 | Newer speaker model (pyannote community-1) | `pip index versions pyannote.audio`: 4.0.7 exists; installed is 3.4.0; HF token is set. The model is gated: someone signs in at huggingface.co and accepts its terms (free) | experiment E3c only | Install in a separate scratch environment, not the repo's; you click "accept" once if E3a/E3b are not enough |
| B5 | Repo is public | `data/` is gitignored (checked) | nothing | Transcripts, clips and your marks stay out of git |

## Phases

**Phase 0: answer key (needs your 25 minutes).** I pick 12 clips of about
90 seconds each, two per conversation creator (Daily Evolution, Social Stoic,
Playing With Fire, Coach Kyle, Austen Summers, Natural Lifestyles). Half pass
my checks and half fail, so the checks get tested too. One page: each line
with a play link to that second on YouTube, and four buttons: right / wrong
words / wrong person / a line is missing here. Marks save to the page's
database. Done when all 12 clips are marked.

**Phase 1: baseline (me).** From your marks: per creator, the share of lines
with the wrong person or wrong words, and missing lines per minute. Then test
my automatic checks (the "next line is him again" rate, the 18% usable mark,
the 07b gate) against your marks. Done when the table exists and each check
is marked trusted or not trusted.

**Phase 2: experiments on the 12 clips (me, free, one change at a time).**
Each is scored against your marks and kept only if it helps.
- E1 Repair step stops deleting or moving words (code fix in 06e/06h; re-run
  from 06e).
- E2 Re-transcribe (stage 02) so her quieter voice survives: raise quiet
  parts (compression, not noise removal, which made Whisper worse in June),
  a lower "no speech" cut-off, and word timings.
- E3 Speaker split (stage 04): a) tell it 2–3 speakers per single set,
  b) a lower clustering threshold, c) the newer model from B4, d) a voice print
  of each coach, who is the same man in every video.
- E4 Let stage 06 fix speakers line by line from the text, and compare.
Done when one combination beats today's baseline on the answer key.

**Phase 3: walk back (me).** Apply the winning combination only to the 267
conversation videos, from the earliest stage it touches. Teaching videos stay
as they are. Order: Social Stoic, Playing With Fire, Coach Kyle, Austen
Summers, Natural Lifestyles, then Daily Evolution. Time: stages 02–05 take
about 3 minutes a video on the GPU (about 14 hours); stages 06–07b about
6 minutes a video of LLM (about 27 hours, paced by quota). Then re-base the
07b gate on the checks Phase 1 trusted. Done when the automatic numbers are
re-counted for all 428 conversations and 3 fresh clips pass your ears.

**Phase 4: ship (your yes on item 4).** Rebuild the conversation sets the app
uses (scenario mining, woman responses), then reload the app's Q&A data.

**Later: dense picture read (not started, owner said rough is fine for now,
2026-11-09).** The 100 assumption sets got 8 frames each, so her look, what
she is doing and who she is with are often "unknown" or taken from his words.
Next step when it matters: about 1 frame a second over the minute around his
approach (60 frames), drop near-duplicates, and have a reader note every clue
(headphones, bags, a friend nearby, walking or still, how he reaches her) with
the second it shows. Pulling frames costs nothing; reading them costs LLM
quota. Up to ~1,000 frames a minute is possible, but neighbouring frames repeat
each other, so check first that 1 a second misses nothing.

## Scenario we can build first

**Assumption Game (cold reads).** It needs his lines (clean, his microphone)
and her first short reaction. A working version already exists at
`/test/scenario-lab`, built on 46 cold-read moments mined in July. On held-out
moments, the real coach line ranked first 62% of the time and in the top two
92%. The work left is moving it onto the Assumption Game tile and re-reading
the 46 moments. Second: **Compliment Delivery**: his compliment appears in 246
conversations, and her reply is mostly a short "thank you". Scenarios that rest
on her words (Her Question to You, Hobby Response, Boyfriend Mention) wait for
Phase 3.

## Open questions

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Which creators matter most? | Social Stoic, Playing With Fire, Coach Kyle first: the best real sets found on 2026-11-03 came from these three | Daily Evolution first (most material) | Hours spent on sets you won't study |
| Download the 671 playlist videos not yet downloaded? | Not yet; most are teaching videos, and new conversations would inherit the same faults until Phase 2 is done | Download now (free, ~1 day) | Disk and time only |
| Paid transcription with speaker labels as a second opinion? | No, only if Phase 2 fails | Pay for one test batch (your decision, money) | Money |
