# Outvoted animation round, process fixes and a history of mistakes

Written 2026-11-21 by Claude (planner session, Opus). Status: **proposed**. Nothing here is
decided until the owner says yes in his own words. Every pick below is Claude's.

## In plain words

Three pieces of work, in this order:

- **A. Process doc.** Fold the first night's lessons into
  `docs/product/content_creation_process.md` and the "Going on now" list in
  `docs/product/content_creation.md`. Add one line that says which film is next and which of his
  notes it carries out. Keep the tracks apart. Mark every section as his words, a record,
  research or Claude's proposal. None of his words are dropped; contradicted parts are kept and
  marked.
- **B. History.** A new public file, `docs/product/content_history.md`: one entry per thing that
  went wrong, with date, what happened, cause and what changed in the process. Seeded with 13
  entries from the process doc and memory.
- **C. Outvoted v2.** The same blocks film, faster, breaths gone, with other kinds of animation
  at the night and morning spots and four more spots. Claude builds the new scenes in the evening.
  The GPU renders them at night, with a logged proof that it was busy. A reviewer that did not
  build them checks every output against the film he liked before he sees anything. He gets one
  short page: the new film, the changed spots, the sound, a filming storyboard, and the night's
  GPU chart. Each item has a 👍 and notes that save while he types.

His filmed part (his words, 2026-11-21): it is mostly **him speaking the script on camera**, put
into the video in different ways. It is not B-roll of him doing things. Filming waits until the
core is right. So v2 has no footage of him. The page gets a filming storyboard showing the ways
his footage could go in. He picks ways and films when he wants. Then v3 puts him in.

## What was read for this plan (2026-11-21)

- CLAUDE.md, both content docs in full, `Plans/reel-outvoted.md`, the film's `BRIEF.md` and
  `NOTES.md`, the 38 key stills (`film/keys/contact.png`), the pass2 page text (seven cutaway
  spots), the reader panel (`wordcheck/panel.json`), the breath test key, the night folder.
- Notes and likes on every page in `notes-seen.md`. **No new notes or likes.** The film page
  8d7WHZ…, the finder 1irGqr… and the night films page THMRyz… are all empty. The known notes
  (breath test vC, ten ways w1–w10, clip round 2 A5/A7) are already in the process doc.
- Facts this plan rests on:
  - The blocks film renders in headless Chromium on the **CPU** (Mesa llvmpipe). The night's
    GPU did only the AI paintings.
  - The five lines all five readers cut: 3 "And I meant it.", 7 "And it took me years to see
    what was actually going on.", 9 "Or quit nicotine.", 25 "Just quitting weed.", 29 "Decide
    just on that one thing."
  - Breath test: vC = speech detector (strict, 0.75, 20 ms pads) plus gate. His note: "probably
    the best", may retake "I am perfection".
  - Pace (measured 2026-11-20): 117 s long, 30 s of it pauses.

## Checked today, and from memory

**Tested on his PC today (2026-11-21):**
- The RTX 4060 can render the blocks film. Headless Chromium with `--use-gl=angle
  --use-angle=gl-egl` (the flags `film/tool.cjs` already uses) plus the environment
  `GALLIUM_DRIVER=d3d12 MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA` reports "ANGLE (Microsoft
  Corporation, D3D12 (NVIDIA GeForce RTX 4060), OpenGL ES 3.1)". Without that environment it
  falls back to llvmpipe or SwiftShader.
- Same picture: three 1080x1920 stills (42.3 s, 55.9 s, 86.3 s) differ from the CPU stills by
  a mean of 1.25 of 255. That is the film grain.
- Speed, measured while other sessions' speech jobs held the card at 64% and 7.6–7.9 GB:
  - about 22 s to start a page;
  - 128 samples: 42.8 s on the CPU, 35.6 s on the GPU;
  - so about 0.16 s per sample on the CPU and about 0.10 s on the GPU.
  - The quiet-card speed is not measured. Phase 0 does it.
- Disk: 52 GB free on the WSL disk (95% used); C: has 405 GB free. A full-size film is about
  10.5 GB of PNG frames.

**Researched fresh today (web search, 2026 sources, mostly blogs and vendors, no controlled
tests):**
- Local AI video on 8 GB:
  - ComfyUI's docs say Wan 2.2 5B fits 8 GB with offloading.
  - One RTX 4060 writer failed three times with the 5B model, then got the 14B distilled model
    working at 111 s a clip.
  - LTX-2 on 8 GB: short 480p clips only, slow; sources disagree.
  - Sources: [ComfyUI Wan 2.2](https://docs.comfy.org/tutorials/video/wan/wan2_2),
    [lilting.ch RTX 4060](https://lilting.ch/en/articles/wan22-comfyui-rtx4060-i2v),
    [LTX-2 8 GB guide](https://www.apatero.com/blog/ltx-2-8gb-vram-optimization-complete-guide-2025).
- Checking AI video before a client sees it:
  - Pause wherever hands touch something, and count fingers only where the shot shows them.
  - Watch for faces that drift. Mark the bad frames, simplify the action, make it again.
  - People stay in the loop; automatic checks only help.
  - Sources: [Superside](https://www.superside.com/guides/ai-video-qc-checklist),
    [Magic Hour](https://magichour.ai/blog/ai-video-quality-assurance-checklist),
    [Hackernoon](https://hackernoon.com/how-to-fix-warped-hands-and-faces-in-ai-generated-video).
- Mixing an animated film with its maker on camera:
  - One guide gives three shapes: full talking head; short on-camera cameos between other
    pictures; the face only at the start and the end.
  - 10–15 s of face early is said to build trust. Unmeasured; vendor blogs.
  - No source shows an animated 3D world cutting to its maker and back. The 2026-11-20
    research found none either.
  - Source: [ReelForge](https://reelforgeai.io/blog/opposite-of-faceless-guide).
- Putting filmed people into CG:
  - Matting with SAM 2: tracked masks on every frame, weak on hair and motion blur.
  - Feather the edges. Match the light direction and colour. Add grain back to phone footage.
  - Sources: [Meta SAM 2 in Edits](https://ai.meta.com/blog/instagram-edits-cutouts-segment-anything/),
    [Creative Bloq](https://www.creativebloq.com/3d/how-seamlessly-integrate-cg-and-live-action-51411697).
- Pace in Reels:
  - Guides say a visual change every 1.5–3 s or 2–4 s. Another says pace should follow
    meaning, not a timer.
  - All of it is practitioner opinion, not measured.
  - Sources: [Opus Clip](https://www.opus.pro/blog/ideal-instagram-reels-length),
    [Klap](https://klap.app/blog/instagram-reels-optimization).
- A file of mistakes for AI agents:
  - A common pattern is a lessons file the agent reads before each task. Each entry must change
    later behaviour.
  - A known risk: stale entries contradict newer ones. Review them and mark the dead ones.
  - Evidence is anecdotal.
  - Sources: [pi-workflow-kit lessons design](https://cdn.jsdelivr.net/npm/@tianhai/pi-workflow-kit@0.18.1/docs/plans/completed/2026-05-08-lessons-learned-design.md),
    [Penloom on dev.to](https://dev.to/penloom_studio_829b7817d3/stop-your-ai-coding-agent-from-making-the-same-mistake-twice-a-claudemd-agentsmd-workflow-that-4k61).
- GPU proof: nvidia-smi's "utilization" only means some kernel ran, so it can read high while
  little work is done. Tie the load to a job through the render log.
  Source: [GMI Cloud](https://www.gmicloud.ai/en/blog/gpu-utilization-monitoring-finding-the-40-you-are-wasting).

**From Claude's memory, not checked:**
- Robust Video Matting and MediaPipe hand and pose detectors run locally on 8 GB.
- An optical-flow fit can tell a slow zoom or pan from real motion.

---

## Part A: changes to the process doc

Phase 1 carries these out. Every change keeps his words. Where something he said is overruled
by something he said later, both stay, with a line such as "(dropped by his rule 2026-11-21)".

**A1. One "Next film" line at the top of the process doc**, under the status line:

> **Next film to improve: "Outvoted" v2** (Claude, proposed 2026-11-21). It carries out:
> - his notes of 2026-11-20: faster; more kinds of animation, with "at night" and "in the
>   morning" as the obvious spots; the blocks stay the main line; himself filmed; breathing gone;
> - his notes of 2026-11-21: no AI still paintings or slow zooms; variety from kinds of
>   animation; the GPU near full at night, proven with numbers; filming means him speaking the
>   script on camera.
>
> Plan: `Plans/outvoted-animation-round.md`. A night session builds **only** from this line.
> If the line is out of date, the night does not start.

**A2. A track index right below A1.** Each section heading gets its track:
- Track 1: celebrity clip reels.
- Track 2: our own films (Outvoted, the next reels).
- Video 01.
- Finding the look: finder, ten ways.

The sections stay where they are. Only the index and the tags are new, so nothing moves out from
under a reference.

**A3. Labels on every heading** that lacks one: [his words], [record] (what was tried, with
dates), [research] (date and how strong) or [Claude, proposed].
- "Idea bank": [Claude, proposed].
- "What others do": [research 2026-11-18].
- "Tried on video 01": [record].
- "Proposed next version": already labelled.
- "Why it went wrong": [Claude's reading].
- "Proposed change": already labelled.

**A4. New block under "The owner's words", headed "2026-11-21, on the night run and this
round".** His words from the request for this plan, written down without changes in meaning:
- No paid AI tools.
- He can film himself. Filming is more about putting his real person speaking the script into
  the video, in various ways, than about B-roll of himself doing things. Maybe waking up.
- Right now we are still getting the core of what we want to do right.
- The Outvoted film gets better through animation, following his notes. The blocks stay the
  main story line. Spots like "at night" and "in the morning" get a different kind of animation;
  an animated person waking up is one idea, not the list. It goes faster. There is a storyboard
  step for the filming choice. The breathing is gone. His examples are seeds, never the full list.
- Never again AI still paintings, or images with a slow zoom or pan. They had wrong hands, wrong
  pictures and no real animation, and they are the opposite of what he enjoys about AI. Variety
  comes from different kinds of animation, not the same shots in other colours.
- The GPU is used near full when work runs at night. It must be proven with numbers, not
  claimed. Claude builds scenes in the evening, and the GPU renders at night. There is always more
  queued work than the night can finish.

**A5. Contradictions to mark, with the text kept:**
- "His marks on the ten ways page", the 👍 on way 8: add "(way 8 dropped by his rule
  2026-11-21, see the first night run)".
- "Proposed next version", step 6: "AI pictures or clips where a real picture is needed".
  Change to: AI **still pictures** are out (his rule 2026-11-21). Local AI **clips** with real
  motion stay possible: free tools only, no people in them, and they must pass the check in C5.
  Mark the change "Claude, proposed".
- Step 6, "his own filmed clips where he wants to be in it": add "Filming = him speaking the
  script on camera (his words 2026-11-21)".
- Step 8, "several different whole films of the same voice": mark "(replaced 2026-11-21: one
  film improved, variety per spot by kind of animation; see Plans/outvoted-animation-round.md)".
- Open question "Do filmed clips of him sit well inside an animated look? Test on one spot":
  add "Planned in v3 of Outvoted".
- Open question "What limits the night films": add the GPU measurements from "Checked today".
- "Proposed change (2026-11-21)": add "Planned in detail in `Plans/outvoted-animation-round.md`"
  (no other change).
- `content_creation.md`, "Keeping this file: … Remove lines that are outdated, repeated or
  contradicted without asking". This conflicts with his rule of 2026-11-04: nothing is removed
  until he says so. Proposed new wording: "fold or mark 'proposed to remove', never delete
  without his yes". The old wording stays, marked "(conflicts with his rule 2026-11-04; proposed
  change)". He decides.

**A6. Track 2 in "What we tried"**:
- Add under "Did not work": "Claude's own check of its night output ('came out well'), with
  nothing to compare against. [his words 2026-11-21 on the result; cause is Claude's reading]".
- Add under "Not judged yet": "Outvoted v2 (this plan)".

**A7. `content_creation.md`, "Going on now":**
- Replace nothing. Add to the Outvoted bullet: "Next: v2 by `Plans/outvoted-animation-round.md`
  (proposed): faster, breaths gone, other kinds of animation at seven spots, his filmed part
  storyboarded first."
- The "First night run failed" bullet gets: "Mistakes are kept in `docs/product/content_history.md`."
- The look finder bullet stays as it is: it still waits for his marks.

**A8. A check before committing A** (done in Phase 1):
- A script lists every line in the old docs that holds "[his words]", "(owner" or "His words".
- Each must still appear in the new docs, word for word.
- The script's output goes into the commit message.

## Part B: the history file

**Where:** `docs/product/content_history.md`. It is public, like the process doc.

**Not in it:** quotes from forums, names of private people, celebrity names, video ids, health
details. Celebrity reels are "a celebrity quit reel". Details stay in the private folders it
points to.

**Format:** newest first. One entry per event:

```
### H<n> · <date> · <track> · <short title>
- What happened: <facts, measured where possible>
- Cause: <Claude's reading, or his words, labelled>
- What changed in the process: <his words / Claude, proposed / nothing yet>
- Where: <section of the process doc, plan, or private folder>
```

**Rules for the file (Claude's proposal, not a rule of his):**
- Append only.
- When a later entry overrules an earlier one, the earlier one gets "(superseded by Hn)".
- A content session reads the last 10 entries before starting work, after the two content docs.
- The file records things. It does not make new rules: "What changed" only cites his words or
  says "proposed".

**Seed entries (Phase 1 writes them; wording in plain sentences, dates as found):**

| # | Date | Track | What happened | Cause (whose reading) | What changed |
|---|---|---|---|---|---|
| H1 | 2026-11-12 | Video 01 | A screen recording for a 10–20 s spot came back 97 s long, showing the whole window | The brief gave no length, beat or crop (Claude) | Each asset brief names the beat, its seconds, what to show and hide (proposed then, in use) |
| H2 | 2026-11-18 | Video 01 | Question rounds on single items: too slow | Claude guessed one thing at a time (his words) | More options per round, clearer choices (his words) |
| H3 | 2026-11-18 | Video 01 | A 3D render took 54 min before he saw a frame; the idea then changed | Render before any look (record) | Frames before long renders (his words: "more handholding") |
| H4 | 2026-11-18 | Video 01 | A block scene was re-rendered as a new story plus two extra formats, without asking | No creative questions first (his words) | Ask creative questions; build on the old scene; one format (his words) |
| H5 | 2026-11-18 | Video 01 | Four moving options for one scene: too few, not specific | Too little variance (his words) | Early rounds get many different ideas plus near cousins (his words) |
| H6 | 2026-11-19 | Track 2 | Moving storyboard of near-stills: "a bunch of very simple animations" | Looking before it is finished may not work for him (his words) | Whole film first, then he looks (his words) |
| H7 | 2026-11-19 | Track 2 | Breathing audible in the cut voice | Breaths were cut by the word list only (record) | Breath test page; vC "probably the best" (his words) |
| H8 | 2026-11-20 | Track 2 | Outvoted film: right path, but too slow, blocks only, breathing still audible | One world for the whole film; pauses kept (Claude) | This plan (proposed) |
| H9 | 2026-11-20 | Track 2 | The second-pass page with tables of sentences to cut was "almost impossible to understand" | Tables instead of the film (Claude) | No cut tables for him (his words); lines in doubt are heard, not read |
| H10 | 2026-11-20 | Look | Claude presented the blocks as the chosen look (way 4) | Misread his like of one film as a house look (his words) | Look is open; finder first (his words) |
| H11 | 2026-11-20 | Look | Ways 8 and 9 were shown next to the researched ways without saying they came from memory | Not labelled (his question) | Every item says checked or memory (CLAUDE.md rule, his words) |
| H12 | 2026-11-21 | Track 1 | Celebrity round 2: words cut off in every version, no version longer, black text cards, eight experiments instead of one better reel | Cuts placed at transcript word ends, which come before the sound ends (measured); the brief was read too narrowly (his words) | Cut checker; 2–3 better versions of one reel (his words) |
| H13 | 2026-11-21 | Track 2 | First night: 18 AI-painting films, same shots in six colours; not usable; GPU "full" not proven | Wrong brief won; "few tokens" read as "no Claude"; volume not variety; self-judged; one GPU reading kept (Claude's reading) | Never AI still paintings again (his rule); night brief, variety, gate, GPU proof (proposed, this plan) |

---

## Part C: Outvoted v2

### C1. What stays

- The blocks are the main line: the tower, the fall, the cleared table, the one block.
- The look stays: wooden blocks, dark table, light as the time of day.
- The engine stays: `film/`, the cue table in `build.py`, `src/*.js`, `tool.cjs`, `render.sh`,
  `mux.sh`.
- One format: 1080x1920.
- The climax, the tower falling on "no" (lines 17–18), stays blocks.

### C2. Faster, and the breaths gone

- **Breaths:** run the vC method (strict speech detector 0.75, 20 ms pads, plus the gate) over
  the whole take. Same settings as `breathtest/make.py` used for vC.
- **Pauses:** close every gap between sentences to 0.25 s. Three beats stay at 0.6 s:
  - before line 6, "For a long time";
  - before line 16, "But the guy who woke up";
  - before line 22, "The decision that finally held".
- **Measured estimate:** 117 s becomes about 94 s with every word kept. Adding Q2 (cut the five
  lines) gives about 84 s.
- **Picture pace:**
  - No stretch of more than 3 s without a visible change: a landing, a light move, a cut or new
    text.
  - Measured by frame difference on the draft. The 3 s figure is practitioner opinion (see
    research), so it is a check, not a target to pad.
  - v1's holds get shorter by retiming the camera keys to the new cues. No new holds.
- `python3 build.py` retimes the blocks after the new cut.

### C3. Kinds of animation: the families

Variety means a different **kind**, not other colours. Rules:
- No two neighbouring spots use the same family.
- Besides the blocks, the film uses at least three families.
- AI still pictures are never used (his rule).

| Family | What it is | Made with | Runs on |
|---|---|---|---|
| K1 Same world, new objects | New wooden objects on the same table: a phone, an alarm clock, a calendar block, small props | the three.js engine | GPU (D3D12) or CPU |
| K2 Drawn figure | A simple line-drawn man (round head, mitten hands, so no fingers to get wrong), rigged and animated by code, in its own small room | SVG or canvas code, frames through Chromium | CPU |
| K3 Screen and text | A game quest window, a phone note, a vote counter, a calendar page; moving UI and type | HTML/CSS/canvas code | CPU |
| K4 Real motion from a local AI video model | Short clips **with no people**: rain on a dark window with city lights, low sun moving across a bedroom wall, smoke curling in a lamp beam. Real motion, no zoom-on-a-still | Wan 2.2 5B (or the 14B distilled version) in its own venv, free download | GPU |
| K5 Light drawing | Light trails, the moon and sun drawing arcs, words written in light | three.js | GPU |
| K6 Him, filmed (v3 only) | His footage speaking the script, put in by one of the ways F1–F8 below | ffmpeg plus matting (Robust Video Matting or SAM 2, local) | GPU |

### C4. The spots, and the options per spot

Times are of the current cut (`cues_resolved.md`); the cue words decide. Each spot gets **every**
listed option built as a draft. The gate (C5) drops the weak ones before night. The night
renders all surviving options at full size. The gate then picks one per spot for the film; the
picking rule is in Phase 5.

| Spot | Line | Now (v1) | Options built for v2 | v3 (after he films) |
|---|---|---|---|---|
| S1 night | 2 "Late at night I would lie in bed … tomorrow I quit" (7 s) | slow push on the block | **S1a K1**: a phone lies by the amber block; it lights up 02:47 and "tomorrow I quit" types on "decide"; its blue glow lights the block. **S1b K2**: the drawn man in bed, eyes open in the dark; above him the wasted day plays back as tiny icons, fast; "TOMORROW I QUIT" writes itself on the ceiling. **S1c K3**: a game quest window, "NEW QUEST: QUIT WEED · Accept", and a counter "accepted 1,214 times" ticking up. **S1d K4**: rain on a dark window, city lights, 3 s, then back to the table | F-way he picks for "Late at night" |
| S2 morning | 5 "And every morning, within an hour of waking up, I was back" (3.3 s) | light sweeps, crash | **S2a K1**: a wooden alarm clock on the table rings 07:00, the hands sweep to 07:52 in one second, then the v1 crash comes in on "back". **S2b K2**: the drawn man sits up in sunlight; his mitten hand reaches for the nightstand drawer; cut to the crash on "back". **S2c K3**: the calendar page "DAY 1 ✓" gets a red cross at 07:52. **S2d K4**: low sun moving across a bedroom wall, 2 s | — |
| S3 | 6 "For a long time I thought that just made me a weak person" | crash, block on its side | keep v1 (blocks) | his face, close, to camera (F1 or F3) |
| S4 two guys | 8–9 "That guy, deciding late at night … Or quit nicotine" | wide night frame | **S4a K2**: the drawn man at night (blue) points at the tower, signing it like a contract; then back to the blocks. **S4b K5**: the moon draws the night guy's plan in light lines over the tower. **S4c** keep v1 | night-graded him (F5) |
| S5 the morning guy | 16 "But the guy who woke up the next morning had to carry all of that" (4 s) | light sweeps, camera down the tower | **S5a K2**: the drawn man in bed in morning light with the whole night tower standing on his chest; he can't sit up; back to the tower swaying. **S5b K1**: a small wooden bed on the table, the tower standing on it. **S5c** keep v1 | morning-graded him (F5) |
| S6 outvoted | 19 "I was not weak, but I was downvoting a plan that nobody could really live" (5.5 s) | NOT WEAK / THE PLAN WAS IMPOSSIBLE burned into the table | **S6a K3**: a vote card "PLAN: become someone else by tomorrow", NIGHT GUY ▲ 1, MORNING GUY ▼, the score falling −1, −2 … −365 on "downvoting". **S6b K1**: a big wooden down-arrow drops onto the wreck on "downvoting", then the burned words. **S6c** keep v1 | — |
| S7 list | 24 "I could play games all day, eat junk food … no running and no women" (7 s) | glide over lying blocks | **S7a K1**: on each word a wooden object drops on the table: controller, pizza box, closed laptop, blank book, running shoes, phone with an unanswered chat; one second each, then the glide. **S7b K2**: the drawn man on the couch, six one-second poses on the words. **S7c** v1 glide at double speed | — |
| S8 days | 26–27 "And eventually … within just a few days" (7 s) | light wheels DAY 1–4 | **S8a K3**: calendar days tick DAY 1 … DAY 4, each tick quicker. **S8b K3**: quest log "QUIT WEED · day 4 · streak 4", the bar filling. **S8c K5**: v1 time-lapse with the sun and moon drawing their arcs as light trails | — |
| S9 ask | 28–30 "So stop trying … Comment QUIT" (15 s) | pale block, QUIT cubes | keep v1 (blocks) | him to camera for the instruction (F1), back to the cubes for QUIT |

That is 22 options to build, 6 of them "keep v1". 16 are new scenes.

**Fixed for every option** (so the builder decides nothing):
- Length = the spoken line's length in the new cut.
- Enter and leave on a light sweep or a hard cut on a cue word; no fades to black.
- Captions stay in the 77–83.5% band. `capband` must report 0 offenders.
- Sound: the scene's own soft effects (phone buzz, clock ring, rain) mixed 14 dB under the voice.
- Colour: night spots cool (moon), morning spots warm (sun), like the table light.
- K2 drawn man:
  - one design, made once, used in every K2 option: line-drawn on dark paper, the amber colour
    for him;
  - mitten hands; the face is two dots and a line;
  - frames rendered at 1080x1920.
- K4 AI clips:
  - image-to-video from a code-rendered first frame, or text-to-video;
  - the prompt says no people;
  - 3 s at 16–24 fps, upscaled to 1080x1920;
  - at least 8 seeds per option. The gate keeps the best.

### C5. The check before he sees anything (the gate)

Two parts, run twice: on drafts in the evening, and on the full-size output in the morning.

**G1, automatic checks** (`film/gate/gate.py`, built in Phase 0). Each check gives pass/fail with
a number:
1. **Not a slow zoom.** Fit one global zoom/pan to the optical flow, frame by frame (OpenCV
   Farnebäck plus an affine fit). Fail any stretch over 1.0 s where that fit explains more than
   90% of the motion.
   - It must flag all 18 night films. Test on them first.
   - It must pass v1's tower and fall.
2. **No AI people.** Every frame of every K4 clip runs through a person and hand detector
   (MediaPipe). Any hit fails the clip. K2 figures are drawn by code and are exempt; a person
   still looks at their hands (G2).
3. **Still stretches.** No stretch over 3 s with under 2% of pixels changing.
4. **Pace.** Words per minute over the whole film, and the sum of pauses. Target: no gap over
   0.6 s except the three beats.
5. **Seams.** Mean brightness and colour, 0.3 s before and after each spot. A jump bigger than
   the v1 light sweeps fails.
6. **Captions.** `node tool.cjs capband`: 0 offenders.
7. **Physics.** `H.clipReport` is empty.
8. **Sound.**
   - −14 LUFS ±0.5, true peak under −1 dB.
   - Voice offset under 10 ms.
   - Breath count from the detector: 0 left outside words.

**G2, a fresh reviewer.** An Opus subagent that did not build anything gets only these:
- the line text and time of each spot;
- v1's frames for the same lines (the film he liked), 5 per second;
- the option's frames, 5 per second;
- the G1 numbers;
- his words from "The owner's words" (2026-11-19 to 21).

It answers per option, in a fixed form:
- fits the line (yes/no + why);
- craft at least v1's (yes/no + the weakest frame number);
- hands and faces (count fingers where shown; any drift);
- is it a real animation, not a zoom;
- different from the neighbouring spots' family;
- pass/fail;
- a score of 1–5.

A fail is cut, not fixed at night. The reviewer never sees the builder's own judgment.

### C6. His filmed part: the storyboard step

The ways his footage of himself speaking the script could go in. Brainstormed wide; seeds, not
the full list:

| Way | What |
|---|---|
| F1 | Full screen, him to camera, then back to the table |
| F2 | Small round face in a corner while the blocks play |
| F3 | Him on the phone lying on the table (the S1a phone), lit like the scene |
| F4 | Cut out (matted) and standing at the table's edge, lit by the moon or the sun, block-sized or full-sized |
| F5 | Two of him: the night guy (cool, lamp-lit) and the morning guy (warm, window), split screen for "that guy" and "the guy who woke up" |
| F6 | His face on the amber block's front face, as a moving picture burned into the wood |
| F7 | His real footage drawn over as lines by code (real motion, no AI), so he lives in the K2 drawing |
| F8 | Silhouette of him against the window, speaking; face dark |
| F9 | His own idea: him waking up (a short shot, not speaking) |

- **Storyboard frames:** a grey cut-out shape marked "you here", composited into real v2 frames
  for each way. One frame per way.
- **Filming list for after he picks** (proposed). He films the whole script twice:
  - once lit like night: a lamp, a dark room;
  - once lit like morning: window light;
  - phone upright on a stand at eye height, a plain background, about 20 minutes in all;
  - plus F9 if he wants it.
- This also gives a new voice take. It replaces the current voice only if it measures cleaner
  (noise floor, breath count).

### C7. Evening build, night render

**Evening (Phases 2–3):**
- Claude builds the voice, the retimed blocks and the 16 new options.
- Draft renders at 360x640, and G1 and G2 on the drafts.
- Failing options are dropped.
- The night queue is written.

**Night (Phase 4), as the queue's priority order:**
1. Full-size frames of the v2 film: the retimed blocks parts, on the GPU through D3D12 (CPU
   workers run the K2 and K3 parts at the same time).
2. Full-size frames of every surviving option.
3. K4 AI clips: 8 seeds or more per option, more seeds while the night lasts.
4. The blocks parts again at 64 samples instead of 16. Better motion blur and depth of field;
   used if G1 and G2 pass them.
5. Overflow (real work, never padding): more K4 seeds for the night and morning spots; v1's
   unchanged shots re-rendered at 64 samples.

There is always more in the queue than one night can finish (his rule).

**Night brief:** before the night starts, one short message by PushNotification, and the same
text at the top of the night status file. It says:
- the film (Outvoted v2);
- the notes it carries out (the A1 line);
- what is queued;
- what "done" looks like: v2 frames all rendered, options rendered, G1 run, GPU summary.
- "Reply 'stop night' to stop it."

**GPU proof:**
- `~/.cache/daygame-research/tools/gpu_log.sh start <night dir>` runs from the first job to
  06:00.
- A watcher wakes Claude if the GPU sits under 80% for 5 minutes. Claude then adds GPU workers
  or starts a K4 job.
- Morning: `gpu_log.sh summary <night dir>` gives busy % per hour and every stretch under 80%.
- The reels' share comes from the render logs: seconds per frame against the quiet-card speed
  from Phase 0. WSL cannot name the processes on the card.
- Other sessions' GPU jobs are listed by start and end time from their logs (see Q3).

**Load:** `tools/load.sh` before and during; `gpu_guard.py` attached (League running = 1 worker,
no GPU).

### C8. What he sees: one short page

"Outvoted v2", built from the v1 film page (`film/page/index.html`). Items, each with a 👍 and a
note box that saves while he types (green Saved badge, his earlier notes listed, newest first):

1. **The film**: v2, full screen player (AV1 + H.264 assets), with v1 smaller beside it.
   - One line: "117 s → N s, every word kept" (or "5 lines cut" if Q2 is yes).
2. **The changed spots**, one card each (up to 7). Each card has:
   - the line;
   - the chosen option as a looping clip;
   - at most two other options as small loops, each with its own 👍 to swap it in.
3. **Sound**: one sentence on the breath method, and a 20 s excerpt.
4. **The filming storyboard**: F1–F9, one frame each, 👍 per way, plus the filming list from C6.
5. **The night**: the GPU chart (busy % per hour), the stretches under 80% with their cause, and
   the reels' share.

- Nothing else: no tables of sentences, no process text.
- The page is listed in `notes-seen.md`.
- His daily tasks page gets a row for the day it is ready.

---

## Blockers (each tried once)

| ID | What | Tried, and what came back | Blocks | Proposed |
|---|---|---|---|---|
| B1 | Can the blocks film render on the GPU in WSL? | Tried 2026-11-21: yes, through D3D12 (see "Checked today"). Same picture. Faster per sample while the card was shared; quiet speed not measured | Night GPU use for the blocks | Phase 0 measures the quiet card with 1–4 workers and records the worker count that keeps the GPU at or above 80% |
| B2 | Local AI video on 8 GB | Not run: it needs a 10–20 GB free download. Research: the 5B model fits with offloading; one RTX 4060 user needed the 14B distilled model (111 s a clip) | K4 options | Phase 0 tries once: 5B first, the 14B distilled if 5B fails. If both fail, K4 is dropped from v2 and recorded in the history file. No paid fallback |
| B3 | Disk | 52 GB free on the WSL disk. One full film is about 10.5 GB of PNG; models 10–20 GB | Night | Encode each finished part, then delete **that night's own PNG frames** after a checked encode. These are temporary renders, not his data. Stop the queue under 15 GB free |
| B4 | Other sessions use the GPU | Right now: other sessions' speech jobs at 64%, 7.6–7.9 GB. The first night shared the card with a capture batch | Proof, speed | Q3 |
| B5 | Claude cannot hear | Measured only: breath detector, noise floor, LUFS | Sound verdict | He is the ear; the page has a 20 s sound excerpt |
| B6 | No footage of him yet | — | v3 | v2 ships without him; the storyboard comes first |
| B7 | WSL nvidia-smi cannot name processes | Known (night-films memory) | Proof per job | Reels' share from render logs |
| B8 | main is red (nightly durations check, runs of 18–20 Nov) | Not this plan's. Commit 0b87d41b on main (another session) splits the database tests in two to fix it; the next nightly run tells | Nothing here | The execute session checks the next nightly and names it if still red |

## Questions for him (one short list)

| # | Question | Claude's recommendation | Other way | Cost if wrong |
|---|---|---|---|---|
| Q1 | Will you film yourself speaking the script, and when? | Yes, **after** you see v2 and 👍 the filming ways on its page. One sitting of about 20 minutes, two lightings (night, morning), plus the waking-up shot if you like it | Film now, before v2 | v3 comes a few days later |
| Q2 | Make it faster by also cutting the five lines all five readers cut? (3 "And I meant it.", 7 "And it took me years…", 9 "Or quit nicotine.", 25 "Just quitting weed.", 29 "Decide just on that one thing.") | Yes, cut them in v2 (about 84 s instead of 94 s). If you don't answer before the build, v2 keeps them and only closes the pauses | Keep every line | One re-cut, computer time only |
| Q3 | At night (23:00–07:00), may the reel renders have the GPU first, with other sessions' GPU batches (speech, capture) running only in the gaps? | Yes. Otherwise the proof can't show the reels used the card | Share the card as now | The proof shows a low reels' share |

**Nothing in this plan spends money, deletes his data or cannot be undone.** All tools are free
and local. The only deletes are each night's own temporary PNG frames, after a checked encode.

---

## Phases

Each phase names its model. Start build sessions with `claude --model sonnet`; give subagents
`model: "sonnet"` or `"haiku"`. Opus is for the gate (G2), the doc edits in Phase 1 and the
morning pick.

### Phase 0: tools and measurements (Sonnet)

1. **GPU speed of the blocks film.**
   - Wait for a quiet card (`nvidia-smi` util under 10%), or measure with Q3's rule if he said yes.
   - Render 60 frames of the film at 1080x1920, 16 samples, through `GALLIUM_DRIVER=d3d12
     MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA`, with 1, 2, 3 and 4 workers, `gpu_log.sh` running.
   - Do the same on the CPU with the usual 4 workers.
   - Add a `GPU=1` switch to `render.sh` and `tool.cjs` that sets that environment.
2. **K4.**
   - New venv `~/.cache/daygame-research/venv-wan`; check disk first.
   - Download Wan 2.2 TI2V-5B (fp8). Make one 3 s 480p clip: "rain running down a dark window,
     city lights blurred behind, night, no people".
   - Time it, VRAM peak included. If it fails, try the 14B distilled model once.
   - Record what came back.
3. **The gate tools.**
   - `film/gate/gate.py` with checks G1.1–G1.8.
   - Test check 1 on three night films (must fail) and on v1 (must pass).
   - Test check 2 on one night film with a painted person (must fail).
4. **Results** go to `film/GPU.md`: seconds per frame, GPU % per worker count, the chosen worker
   count, the K4 result.

**Done when:** `film/GPU.md` holds the numbers; `gate.py` flags all 3 night films and passes v1;
the K4 attempt is recorded (works, or why not).

### Phase 1: process doc and history (Opus)

1. Make the edits A1–A7.
2. Write `docs/product/content_history.md` with H1–H13.
3. Run the A8 check (every line of his words still present).
4. Commit with `git commit --only` on the two docs plus the history file. Ship with
   `node scripts/ship.mjs`.

**Done when:** A8 reports 0 missing lines; shipped; the "Going on now" list names v2 and this
plan.

### Phase 2: voice and retime (Sonnet)

1. Apply vC to the take, and close the pauses as in C2. If Q2 is yes, cut lines 3, 7, 9, 25 and
   29 with `content/audio/cut_take.py` drops.
2. Write the new `cut.wav` and `cut_words.json` into `reel-outvoted/audio/v2/`. v1's files are
   kept.
3. Point `build.py` at v2, run it, and read `cues_resolved.md`.
4. Draft render of the blocks (`make_draft.sh`).

**Done when:**
- G1.4 pace passes;
- G1.8 sound passes (breath count 0 outside words);
- `clipReport` is empty;
- the length is recorded.

### Phase 3: evening build of the options (Sonnet builds, Opus gate)

1. Build the K2 drawn man once (`film/figure/`).
2. Build S1a–S8c as in C4: one file per option under `film/spots/<id>/`, each rendering frames
   for its line from the cue table.
3. Build K4 prompts for S1d and S2d, and make 2 test seeds each.
4. Draft every option at 360x640.
5. Run G1 on each. Then run one G2 Opus subagent per spot (9 subagents at most), with only the
   inputs listed in C5.
6. Write `film/spots/verdicts.json`. Drop the fails.
7. Write the night queue (`film/night/queue.txt`) in the C7 order, with more work than one
   night.

**Done when:**
- each spot has at least one passing new option, or a written reason why only v1 is left;
- the queue's estimated hours exceed the night's hours (estimate from Phase 0 speeds).

### Phase 4: the night (Sonnet starts it; the watcher is a script)

1. Send the night brief (C7).
2. `gpu_log.sh start`. Start the queue runner (`setsid nohup`, resumable, log per job), with
   `gpu_guard.py` attached.
3. A watcher script: GPU under 80% for 5 minutes, or a job stuck for 15 minutes, wakes the
   session (Monitor). The session adds workers or the next K4 job. It does not change the plan.
4. Encode finished parts; delete their PNGs after a checked encode; stop under 15 GB free.

**Done when:** 06:00, or the queue is empty (it should not be).

### Phase 5: morning gate, assembly, page (Opus picks, Sonnet assembles)

1. Run `gpu_log.sh summary`, plus the reels' share from the render logs.
2. Run G1 and G2 on the full-size options.
3. **Pick per spot** by fixed rule:
   - the highest G2 score;
   - on a tie, the family not used by a neighbouring spot;
   - on a tie again, the new option over "keep v1";
   - check the C3 rules (no neighbouring repeats; at least 3 families). If broken, take the
     next-highest option.
4. Assemble v2 and run G1 on the whole film.
5. Build the page (C8). Test notes and 👍 with a fake store, including a failed save. Publish.
   Never call `open`.
6. Add the page to `notes-seen.md` and the row to his daily page.
7. Update the A1 line's status, and write an H entry if anything failed.
8. Commit and ship the doc changes.

**Done when:** the page is live; G1 passes on the whole film; the night's proof is on the page;
the link is in the final message.

### Phase 6: his notes (Opus reads, Sonnet fixes)

1. Read his 👍 and notes.
2. Fix what each note points at. Swap options he liked.
3. Copy his words into "The owner's words". A failure gets an H entry.
4. Only a rule he asks for becomes a rule.

### Phase 7: v3 with him (after he films; Opus plans the cut, Sonnet builds)

1. Use the ways he liked (F1–F9).
2. Mat his footage on the GPU at night.
3. Match the light: night ways cool, morning ways warm, grain added.
4. Run G1 and G2 (with the fingers check on his real hands too).
5. Make one page, as in C8.

## Cost estimate (Claude's guess, not measured)

- v1 took about 2.4 million new tokens.
- v2: Phase 1 about 150k. Phases 2–3 about 1.2–1.8 million (16 new scenes plus 9 reviewers).
  Phase 5 about 300k.
- The night costs computer time only.

## Ground rules for the executing session

- Read CLAUDE.md, both content docs, this plan, the memory notes named in the execute prompt,
  and the last 10 entries of `content_history.md`.
- First step of content work: read the notes and likes on every page in `notes-seen.md`. Act on
  new ones before building.
- No AI still pictures and no slow zoom or pan on a still, ever (his rule).
- No paid tools. No deleting his data. Nothing irreversible.
- Everything Claude writes is "proposed" until he says yes.
- A design question this plan does not answer is not decided by the session. Pick the
  plan-closest option, write the choice in `film/DECISIONS.md` and in the final report, and mark
  it proposed.
- Work only in `~/.cache/daygame-research/content/reel-outvoted/` for the film. Repo edits are
  limited to the two content docs, the history file and this plan. Commit the same turn with
  `git commit --only`, and ship with `node scripts/ship.mjs`.
- Never open a window or a browser on his screen. Headless only.
- Report in plain words: done / not yet / what is left. Put the links at the end of the last
  message.
