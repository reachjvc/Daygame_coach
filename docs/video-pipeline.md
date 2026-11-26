# Coach-video pipeline

Turns daygame coach videos into checked transcripts (clean words, who said each line), then labels each line (LDG stage, tags). The result is raw material for the app's practice scenarios.
Goal now: a whole-video method he trusts so much that he checks almost nothing: "a quality where i have to look at very little or nothing at all, i.e. fully automated. That is exactly what we want." (2026-11-19). Still active (his answer, 2026-11-26).
This repo is public: coach names, video ids and real lines stay in the private files under "Where files are". Coach A and coach B are the two coaches he named first (his Pipeline Check note of 2026-11-21; coach A also in `labels/sources.md`).

## His rules (his words, dated)

Quality and scope
- "It is better to have a sample of 100 videos that are high quality, than 2000 that do not work properly." (2026-11-11)
- Test every link from the download on: "I asked you to comprehensively test out how we get the best quality ... something that works for 2000 videos down the line" (2026-11-12). No silent defaults: test a link, or say plainly that it is untested.
- Capture everything early: "if we later find out that we need a 4th variable ... it is probably quite expensive to go back and retreive it" (2026-11-11).
- "minimize the use of LLM in the long term for things where it is not needed, but it is so alfa omega that we get the quality right" (2026-11-11). "minimize our token usage" (2026-11-23). "Make me aware if you cannot correctly measure token usage" (2026-11-11).
- Order: "Lets finish [coach A] first, then [coach B]" (2026-11-21). Videos without the opener go in a second bucket, not out; "continually update how many videos there are"; use every approach in a compilation eventually, "especially for the coaches we like the most" (2026-11-11).
- Whole videos: "prioritize taking a few videos fully, i.e. ALL of the video, even if it has multiple convesations" (2026-11-23).
- Before asking him to grade: "be absolutely sure that you give me something that would settle a big amount of your debate" (2026-11-19).

Words
- Never drop a line: "I would rather have that i need to listen to some stuff, than you drop something entirely." (2026-11-18). Words a machine heard that no line holds become "maybe heard" marks or a card for him.
- Lone overlapping words: "If the conversation is still comprehensible, then that is not an important detail to get 100% correct." (2026-11-19)
- A speaker step only labels; it never changes words (capture plan Q4, he accepted 2026-11-14).

Who said it
- "in 85% of cases, it will always just be the coach, if its a man talking. But it is naturally important that we dont produce a pipeline with some wrong labels." Doubtful "other man" lines go "to the side" for a later look (2026-11-19).
- Students: "students should not be him" (2026-11-20). "he would be student N, where N goes from 1 to N in each video. Students are not part of the voice catalog." (2026-11-22)
- Yes to a voice catalog of the coaches and to a reader of the whole set (2026-11-20, again 2026-11-22).
- Talk to camera never gets a stage: "That is obviously NOT a stage in the LDG, it is simply commentary!!!!" (2026-11-21)

Labels
- "the stages are the LDG" (2026-11-22): open, stack, vibe, invest, close. No "outside": "it is all part of the close" (2026-11-21).
- Two stages on one line are allowed: "we need to have it in a way where we can have two phases simultaneously" (2026-11-11; also 2026-11-10).
- Tags (Tag Shortlist, 2026-11-23): "Mostly it seems i want all of the tags"; "We should call this assumption"; a line may carry several ("something can be an assumption that is also a tease"); "he answers" stays apart from "about him".
- On video 1 (2026-11-23): "he cannot be the one initiating investment"; "everything in a conversation must have a tag".
- "We should definitely lean on what he says about the things happening in the conversation, when we hear them happening" (2026-11-20): the coach's own words decide a label.
- Mistakes have weights: "It is not really that big a mistake if i think it could be 2 things, and youve chosen one thing. It is more egregious if you completely miss the mark" (2026-11-11).
- "I am afraid of too many rules. My experience is that it becomes brittle and drifts anyway." (2026-11-11). Use principles and worked examples; one signal alone is weak, several together are strong (his note M3).
- His other label principles (2026-11-11, notes S2-S4 and M1-M4 on the Finished Video page) go into every label guide.
- More labelling only after he checked it: "was i not supposed to check if your labeling is correct, before just telling you to do more?" (2026-11-20)

Check pages
- Whole conversation as context, then a small sample to grade, then Claude's own doubt marks: "theres a difference between something being wrong, and something being wrong that you knew with high likelihood would be wrong" (2026-11-21).
- Every line the same full card (2026-11-18). The clip must line up "exactly with the right lines" (2026-11-21). Stage colour on the left (2026-11-21). Video link and context for each set (2026-11-20). Each card says what to judge (2026-11-19). Symbols and colour over text; show what the editor muted and what the coach says about it (2026-11-11).
- "When i tell you that ive made notes, you need to next time tell me the sequence of steps" (2026-11-21).

Machine
- His pause: "just pause it until i say so. It is fine that we transcribe etc., everything that is only GPU" (2026-11-20). The file `~/.cache/daygame-research/capture/prod/PAUSE_CLAUDE` is that pause (in place since 2026-11-20 21:00). Never delete it yourself; only he lifts it.
- Every GPU job goes through `~/.cache/daygame-research/tools/gpu_gate.py` (his rule, 2026-11-21; details in memory note machine-limits).

Later tracks (his asks, not started)
- Body language: "crucial that we gather these types of data immediately" (2026-11-11); his idea: a cheaper model on many frames. Situation card per set (place, alone or not, headphones and so on) for scenarios (2026-11-13). Her nationality only from what is said, never from looks (Q5, 2026-11-14).
- Tone: "build a list of things we're quite sure of, and then test it" (cocky, needy, insecure; 2026-11-11). His test: learn on 10 videos of one coach, check the 11th, then another coach, then his own voice note, which should differ more.
- From his video 1 notes, 2026-11-23 (check with him): a list of opener compliments "that is easily accessible"; a way to value cut-up fragments below whole conversations; maybe a third label layer (stage, what happens in it, technique).
- Practice goes node by node, from the opener outward; app scenes use generated pictures, never video frames (2026-11-09; Claude's notes of his words, check with him).

## What is true now (checked on disk 2026-11-26)

- Method, proven 2026-11-18/19: per stretch of video, download the original-language audio; on the GPU run 5 word machines (one joint words+speakers model as the skeleton), 5 speaker machines, 2 voice prints, a man/woman voice reading and a two-voice split; two Sonnet judges write the lines with doubt marks; a fixed rule step (settler v8) settles disagreements; Opus judges word differences. Driver: `capture/code/run_set.py`.
- Proof: big test of 1,289 lines. Of 23 lines he checked, every "sure" line was right; the errors were who speaks in crosstalk and dropped one-word replies. His verdict: "mostly very high quality ... the test has been concluded" (2026-11-18). The lean recipe then matched 24 of his 25 answers. Settler v8 passed the frozen test (`capture/code/settle_test.py`).
- Production: 148 sets from 7 coaches in `capture/prod/sets_all.tsv`. 78 finished: coach A 60 of 60, coach B 16 of 31, the other 5 coaches 2 of 57. 70 unfinished since the batch stopped on 2026-11-21: 7 never downloaded (YouTube sign-in check), 63 downloaded, 22 through the GPU machines, 17 through the judges. Their remaining Claude steps wait on PAUSE_CLAUDE.
- Whole videos (his ask, 2026-11-23): 2 videos done from start to end, 17 conversations. Finished sets and the stretches between them (W1-W8) are joined; who is fixed by Opus reading the whole video plus Sonnet reading frames; one Opus labeller uses guide v13 (his 5 stages and 21 tags). A third video (W9-W11) is only partly run.
- His read of the words: "the text was pretty much spot on" (one set, 2026-11-23). On video 1: "only a few, mostly insignificant mistakes in the transcript itself, but definitely a totally wrong understanding of when investment has happened" (2026-11-23).
- Older labels: 10 sets labelled twice (v1, v1.1) and 61 sets labelled unchecked (`labels/runs/v11u`, old 6-stage scheme). He never checked them. Do not use them.
- Other man: settler v8 stays (a man talking is the coach by default; doubtful lines on the side list `capture/prod/side/`). He closed the question on 2026-11-20: "I accept that the 'other man' thing is now finished". The proposed v9 rule was never applied.
- Old pipeline (`scripts/training-data/`, stages 01-10): last run 2026-08-05; it fed the app's Q&A data. Not used for this work. Its code reads `docs/pipeline/sources.txt`, `excluded-videos.txt` and `source-classification.txt`.

## Known faults

- Set start and end times come from `capture/prod/sets_all.tsv` and were never checked against the video. Set B52 is cut wrong at both ends. A machine hint (unchecked): 10 of 70 sets don't start at the open, 17 end mid-talk. Whole videos avoid this.
- Read check of 62 sets (2026-11-20, text only, no audio): about 3.5-4% of lines misleading. Most often talk to camera mid-set labelled as the coach talking to her; also a new woman or a friend labelled "her", and mishears that flip the meaning.
- The 78 finished sets still use the old who labels (him, her, vo, other): no "student N", no "commentary". His approved fixes run only in the whole-video run. No voice catalog exists yet.
- Guide v13 allows one stage per line; his "two phases simultaneously" is missing.
- Labels on video 1 (his notes, 2026-11-23): invest called too early, lines without a tag, "laughs" mixed up with "plays along", "assumption" used after she had already said it.
- The Canary speech model crashes on pieces of about 130 s ("CUDA driver error: device not ready"); 4 whole-video pieces have 6 of 7 machines.
- Age-limited videos need a signed-in YouTube cookie, which is not used, so they are skipped.

## Next steps, in order

Newest page: **Whole Video Check** https://claude.ai/artifact/QYuwTDBdkLBHR8TAHyRRLp (db `marks`, `notes`, `likes`; source `capture/page/2026-11-23/ten/build.py`). Read 2026-11-26, nothing written: video 1 (11 conversations, 23 parts) has 15 parts tapped Done (23-24 Nov), 33 notes and 1 like; open are conversations 2-5 and 8 and 3 talk-to-camera parts. He tapped no Words/Who/Stage/Tag/Gap chip; all his feedback is in notes. Video 2 (6 conversations) is untouched. Daily tasks whole-1 to whole-4 (26-29 Nov) still plan all of it, video 1 first.
1. He finishes the page: video 2 and the open parts of video 1.
2. Read every mark and note first, then fix the step they point at. So far that is the labels, not the words: a guide v14 from his notes (Claude's proposal).
3. Bring his who rules (commentary, student N) to all 78 finished sets by reading each whole set (Claude's proposal). It needs Claude calls, so he must lift PAUSE_CLAUDE first.
4. Finish the 70 unfinished sets, coach B first (his order).
5. Label more sets only after he has checked the labels (his rule, 2026-11-20).
6. Then the later tracks: body language, situation card, tone (Claude's proposal on timing; check with him, since he called body data "crucial ... immediately").

## Hard-won facts (read before changing a step)

- Don't remove noise before speech models on street audio: DeepFilter and MossFormer2 cut her voice (her word error 60-86%).
- The editor's on-screen subtitles carry her quiet replies; without them the machines find fewer of her lines (34-35 of 42 instead of 39).
- When scoring who, the coach's voice-over IS the coach; scoring it as a separate person made 2% error look like 16%.
- pyannote 3.1 on cleaned audio keeps one long background turn under the short ones: read turns on an exclusive timeline (the latest start wins).
- Voice prints taken from voice-over don't match his street voice; on lines under 1 s every voice reading is noise (35% of lines are under 1 s).
- Judges see pieces of at most 240 s, so they lose context; talk to camera mid-set needs a reader of the whole set or video.
- Download the original-language audio track, never an AI-dubbed one; choose formats on purpose, never the default.
- YouTube's bot check: one download at a time, a 60 s gap, slow retries (`capture/code/fetch_prod.py`).
- Never cap a GPU job below its need (a 6 GB cap made Canary fail silently); several jobs overfilling the 8 GB card froze his PC.
- Each model stack gets its own venv; pip into an existing venv upgraded torch and broke it.
- Wait on a PID, never on `pgrep -f` or `pkill -f` (they match your own shell). Long jobs live in `~/.cache`, never `/tmp` (a WSL crash wiped it).
- The frozen test `capture/code/settle_test.py` (sha256 beside it) is the truth check: never edit it, never tune on its answer sets.
- Sonnet judged as well as Opus for merging lines; Haiku never for anything that becomes truth; two runs of one model are not two independent votes.
- Old pipeline: launch LLM runs inside `( unset CLAUDECODE; ... )` or it aborts with a false "outage"; cron runs lack HF_TOKEN unless the script loads it; after a usage-limit stop, delete the fake fail-closed outputs before counting rejects.
- Count finished work from the files on disk, never from logs, docstrings or "COMPLETE" lines.

## Open questions for him (Claude's recommendation after each)

- Lift PAUSE_CLAUDE (on since 2026-11-20) for the 70 unfinished sets and the who fix? Recommend: yes, after the Whole Video Check round, within his weekly allowance.
- Whole videos (every conversation plus talk to camera) as the unit from now on, instead of cut sets? Recommend: yes; it removes the wrong set ends.
- Bring back a second stage per line, as he asked on 2026-11-10 and 2026-11-11? Recommend: yes, as an optional second stage.
- A third label layer (stage, what happens in it, technique), from his 2026-11-23 note? Recommend: not yet; first get 5 stages and 21 tags right.
- Build the voice catalog (approved 2026-11-22) now, or first measure the who fix by reading? Recommend: measure first; build it if students still come out as the coach.
- Age-limited videos: use a signed-in cookie from his YouTube account, or skip them? Recommend: skip.
- App Q&A (old pipeline): it ignores chunk confidence (`src/qa/retrieval.ts:407` reads `chunkConfidence`, stage 09 writes `chunk_confidence_score`); the fix waits for his go-ahead since 2026-07-08. Recommend: fix it.

## Where files are

Repo: this file; `.claude/rules/pipeline.md`; old pipeline code `scripts/training-data/`; its inputs `docs/pipeline/sources.txt`, `excluded-videos.txt`, `source-classification.txt`.
Private, under `~/.cache/daygame-research/`:
- `capture/clips.md`: clip codes, video ids and coach names. `labels/sources.md`: label set split, coach A.
- `capture/code/`: `run_set.py` (driver), `fetch_prod.py`, `settle*.py`, `settle_test.py`, `prod_lib.py` (headless Claude calls).
- `capture/prod/`: `sets_all.tsv` (148 sets: video, start, end, coach), `sets.json`, `status.json`, `log/`, `side/`, `PAUSE_CLAUDE`.
- `capture/final/<id>.json`: 86 finished pieces (78 sets B*, 8 whole-video stretches W*).
- `capture/gold/`: his answer keys (`bigtest.key.json`, `P1.owner11.json`, `P1.draft.json`) and drafts. `capture/readcheck/`: the 2026-11-20 read check. `capture/runs.csv`: every bake-off run.
- `whole10/`: whole-video run (`gaps.tsv`, `code/`, `out/<video>.who.json`).
- `labels/`: `guide-v13.md`, `schema-v13.json`, `code/label_set13.py`, `runs/v13/` (2 videos), `runs/v11u/` (unchecked, old scheme).
- `gold/inventory/summary.txt` and `gold/code/recount.py`: videos per coach. `gold/buckets/`: buckets A and B.
- `tools/gpu_gate.py` and `tools/load.sh`: GPU gate and load check. `conversation-map/`: older beat-map work and his Beat Map notes.
- His earlier pages, all read 2026-11-26: Finished Video (43 notes, 2026-11-11) https://claude.ai/artifact/QnnHBeHJdtSRqg5fAbP8rh, Tag Shortlist https://claude.ai/artifact/LwF418scLwYhN5RiJtTAzs, Random Sample Check https://claude.ai/artifact/MvWmVeSa1RoDZfxfJ7cNyR, Pipeline Check https://claude.ai/artifact/JDDHqYXPCjVNwNn9yX9MXJ.
