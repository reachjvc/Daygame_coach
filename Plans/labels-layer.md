# Labels layer: stages, moves and her signals on finished transcripts

Written 2026-11-19 at the owner's ask. Status: **proposed**. Nothing here is
decided until he says so.

Private companion file (set ids, coach names, source paths):
`~/.cache/daygame-research/labels/sources.md`. Read it first. The repo is
public, so names and ids stay there.

## In plain words

The transcript run (Plans/video-capture-bakeoff.md, Phase 12) now turns sets
into clean text with who-said-what. Next is the layer on top. Each line gets:
- the stage of the conversation (two stages at once is allowed);
- his move;
- her interest signal, if any.

Each set gets a short summary: the hook point, the holes, and the outcome.

We start on the first 10 finished sets, all from the same coach. That coach
already has a stage rulebook, a coder prompt and the owner's notes. Two AI
labellers label every line on their own. The owner's page shows:
1. where they disagree;
2. every rare label;
3. a random 10% of the lines they agree on.

His corrections become proposed changes to the guide. He approves each kind
of change once. Then the labellers run again, and the guide is scored on 3
sets that were never used for tuning. Only then does it go to more sets.

The goal he asked for: check the AI step as soon as possible, so he can start
tweaking it. That makes the first page small: 3 sets read as a whole
conversation, plus about 60 disputed lines.

## What we copy (no new scheme)

- Stages: open, stack, vibe, invest, close, outside, from the existing stage
  rulebook (private path in sources.md), with its 9 coding rules.
- Moves: the 18 moves of the existing coder prompt (11 his, 4 hers, 3
  either). One move per line.
- Her signal: rule M3 of the "Finished Video" target page, plus the text
  cues in the body-moments list (sources.md). Body signals from the picture
  come later (Phase 6).
- Per-line row format: the target page's excerpt fields `stage`, `stage2`,
  `move`, `sig`, `sure`.
- The owner's guide principles in Plans/gold-videos.md ("Guide changes from
  your notes"), for example:
  - stack may build on his own statement;
  - vibe can simply be humour;
  - a compliment followed by elaboration is open and stack at once;
  - interest needs several signals.
- Scoring a *near miss* (a defensible other choice) apart from a *miss*
  (gold-videos point 4).

## Research (2026-11-19)

Checked in the sources (links in the research notes of the 2026-11-19
session; key ones below):
- LLMs that apply a written guide agree with human coders at Cohen's kappa
  of about 0.45–0.75. Asking for a short reason before the label raised it
  (Dunivin, EPJ Data Science, April 2025). Giving the previous lines as
  context helped on tutoring dialogue (arXiv 2509.09125).
- The biggest gain: once enough lines are checked, put the most similar
  already-checked lines into the prompt as examples. Kappa rose from 0.16–0.41
  to 0.53–0.74, most of all on rare labels (Lee et al., arXiv 2604.03127,
  April 2026; Claude Sonnet 4.6 among the models tested).
- Several labellers, with humans shown only disagreements and low-confidence
  items, is the common setup (arXiv 2503.17620, March 2025).
- Two runs of the same model are not independent votes (arXiv 2510.27106).
- Labelling the *strategy* in a negotiation is harder for LLMs than labelling
  the dialogue act. Expect his *move* to be weaker than the stage.
- Pitch and loudness written as words ("her pitch: high") helped LLMs label
  emotion (ICLR 2026). For dialogue acts, voice features added about 1% in
  pre-LLM work.
- No published work labels this kind of conversation. The closest are
  tutoring, speed dating and sales calls.

From memory, not checked: Krippendorff's alpha is the usual agreement
measure when a line can carry two labels.

## Blockers (each tried once, 2026-11-19)

| ID | What | Attempt and result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Graphics card busy with the transcript run (~1 day) | Checked: labelling is text only, no graphics card needed | nothing | Run in parallel |
| B2 | Headless Claude on the subscription | The transcript run uses `claude -p` (prod_lib.py) and logs tokens; working today | nothing | Reuse `prod_lib.claude()` |
| B3 | Owner's Beat Map notes are in an artifact database | Read 2026-11-19: 54 docs saved to `labels/beatmap-notes/notes/` | nothing | Use them as worked examples for set B1 only |
| B4 | A second labeller from another company (e.g. GPT) | Not tried: it costs money | Q1 | Owner's call; default is Opus plus Sonnet |
| B5 | Lines marked "maybe another man" (side list, settler v8) | 37 lines in 18 sets, kept as "him" | nothing | Labellers see the mark; the page shows it |

## Questions (each with a recommendation)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Who are the two labellers? | **Opus and Sonnet**, same guide, on the subscription | Sonnet twice with different prompts; or a paid GPT key (owner makes it and pays) | Both Claude models can share a blind spot; the random 10% check catches some of it |
| Q2 | Label lists | **Copy the existing 6 stages and 18 moves as they are**; changes only through his notes | Rework the list first | Weeks of rework before he sees anything |
| Q3 | What he checks in round 1 | **3 sets read as a whole conversation, plus ≤ 60 disputed lines from the other 4 tuning sets** | Every disputed line of 7 sets (likely 300+) | Too long a page; he stops halfway |
| Q4 | Held-out sets | **3 of the 10 (B4, B6, B10) never used for tuning**, scored after each guide change | No hold-out | Guide fits his 7 sets and fails on new ones |
| Q5 | Body language and the picture-based situation card | **After the transcript run frees the graphics card (Phase 6)**; text labels first | Now, sharing the card | Slows the transcript run, which is already a day long |
| Q6 | Voice measures as words for her signals | **Test with and without them on the held-out sets in Phase 4** | Always on, or never | A cue added or dropped blindly |
| Q7 | Pass to scale | **Stage alpha ≥ 0.6 against his answers on the held-out sets, and he says "go"** | His "go" only | Scaling a weak labeller to 150 sets |

## Phases

### Phase 0: guide v1 and set split (Opus; no owner time)

1. Read everything in sources.md, the "Guide changes" section of
   Plans/gold-videos.md, and this plan.
2. Write `labels/guide-v1.md`. For each stage, move and signal:
   - definition;
   - when to use it;
   - when not to use it;
   - one real example line;
   - the closest label it gets confused with.

   Use the rulebook's words wherever they exist. Keep the total under 3,000
   words.
3. Worked examples: the owner's Beat Map notes and the 5 earlier coded sets.
   They are examples, never rules (owner rule "notes are fixes, not rules").
4. Write `labels/schema.json`:
   - per line `{i, stage, stage2?, move, sig?, reason, sure: high|mid|low}`;
   - per set `{hook_point: i|null, hook_note, holes: [{i, text}], outcome, summary, doesnt_fit: []}`.
5. Freeze the split from sources.md in `labels/split.json`.

Done when guide-v1, schema and split exist and a dry run of one labeller
prompt on 20 lines of B1 returns valid JSON.

### Phase 1: two labellers on the 10 sets (build: Sonnet; labellers: Opus and Sonnet)

1. Write `labels/code/label_set.py <id> <labeller> [guide]`.
   - It reads `capture/final/<id>.json`.
   - It sends the lines in windows of about 40, with the previous 3 lines
     as context.
   - It asks for the reason before each label.
   - It writes `labels/runs/<guide>/<labeller>/<id>.json`.
   - It reuses `prod_lib.claude()` (the token log goes to
     `labels/tokens.csv`).
   - Resumable; it validates against schema.json.
2. Pass order per set:
   1. stage and stage2;
   2. move and signal (stage given);
   3. set summary (from the labelled lines).
3. Run both labellers on all 10 sets.
4. Write `labels/code/agree.py`:
   - agreement per label (Krippendorff's alpha, plus plain percent);
   - the list of disagreements;
   - rare labels (fewer than 5 uses in the 10 sets);
   - a fixed random 10% of the agreed lines.

Done when 20 label files exist and agree.py prints one table.

### Phase 2: the owner's page, round 1 (build: Sonnet; final check: Opus; owner: about 30 minutes)

One artifact page, phone first.

- **Read 3 sets**: B1 plus two other tuning sets. The whole conversation,
  with each line's labels in one row (stage chip, move, her signal) as in
  gold-videos point 5. Hook point and holes link to their lines.
- **Disputed lines**: at most 60, from the 4 other tuning sets. Each card
  shows:
  - the line with 2 lines before it;
  - the two labels side by side;
  - one-tap buttons: "A", "B", "both fine (near miss)", "neither";
  - a picker for the right label.
- **Rare labels and spot checks**: the same card shape, marked as such.
- **Lines on the side list** ("maybe another man") carry a small mark.
- **Notes and thumbs-up on every block and card**, as in
  memory/review-boards-note-log.md:
  - notes save by themselves while he types and append, never overwrite;
  - a green "Saved" badge;
  - his earlier notes listed.
- Each card says what he is judging, in one line. He found the Settle
  Round 1 page unclear about that.
- Test with a fake store, including a failed save, before publishing. Post
  the link in chat and add the check to his daily tasks page (memory
  daily-tasks-stay-current).

Done when the page is live, the link is posted, and the daily task is
written.

### Phase 3: read his marks, guide v2 (Opus)

1. Read the page database. Score each labeller against his answers, per
   label: miss, near miss, right.
2. Turn his notes into **proposed** guide changes, grouped by kind. Each
   change names the note it comes from. Show them on one short page; he
   approves kinds once (memory review-rules-once-not-per-page).
3. When ~30 checked lines exist for a label, switch that label's examples to
   "most similar checked lines" (retrieval, Research point 2).

Done when guide-v2 exists, with only the changes he approved.

### Phase 4: re-run and score on the held-out sets (labellers as Phase 1; scoring: Opus; owner: about 15 minutes)

1. Re-run both labellers with guide-v2 on all 10 sets.
2. Voice-words test (Q6): run her signals twice on the held-out sets, with
   and without "her pitch / loudness / speed vs her own average".
3. Short page: the held-out sets' disputed lines plus a random 10%. He marks
   them the same way.
4. Score alpha per label on the held-out sets. Report it in plain words,
   with near misses apart from misses.

Done when the score table and a plain verdict are on the page and he has
answered "go", "another round", or changes.

### Phase 5: scale (on his "go"; runs: Sonnet labellers plus the Opus checker)

- Label every finished set as the transcript run delivers it, same coach
  first.
- The owner sees only disagreements and a 5% spot check, grouped per week.
- A new coach starts with a 3-set round like Phase 2, because the guide was
  built on one coach.

### Phase 6: body language and the picture-based situation card (later; graphics card)

After the transcript run ends:
- the pose models (capture plan Phase 7: `code/pose.py`, `code/pose_moments.py`);
- the picture card (capture plan Phase 6: `scene/schema.json`).

Their events join the line rows as her and his body signals. Separate plan
section when it starts.

## Part 2: rules for the executing session

- Private data stays in `~/.cache/daygame-research/labels/`. No coach names,
  video ids, transcript lines or source names in the repo (repo-is-public,
  originality-direction).
- Never change the transcripts. Labels live in their own files.
- Every page: phone first, notes and thumbs-up as above, post the link, never
  open it on his screen.
- His marks are read before any next step. Nothing he did not say counts as
  decided.
- Commit the plan's status lines with `git commit --only Plans/labels-layer.md`.
- Name the model at each step: Opus for guide, scoring and page check; Sonnet
  for code, runs and page build.

## Execution prompts

One session per line:

- `/goal` Read `Plans/labels-layer.md` and
  `~/.cache/daygame-research/labels/sources.md`. Execute Phase 0 and Phase 1
  (Opus for Phase 0, then switch to `/model sonnet` for the code and runs).
  Stop when Phase 1's "Done when" holds; add a status line; commit; report.
- `/goal` Same files. Execute Phase 2: build the page with Sonnet, check it
  with Opus, publish, post the link, write his daily task. Stop there.
- After his marks: `/goal` Execute Phase 3 and Phase 4.

## Status

- 2026-11-19: plan written (proposed). 18 sets finished on settler v8; the
  first 10 are all from coach A.
- 2026-11-19: Phase 0 done (proposed). Guide v1 (2,750 words) copies the stage
  rulebook and the move list, adds "he answers" from the owner's note M2 and a
  10-value her-signal list from rule M3. Schema and split frozen; dry run on 20
  lines of B1 returned valid JSON. Correction: the set with his Beat Map notes
  is not one of the 10, so his notes serve as worked examples only (details in
  the private sources file).
- 2026-11-19: Phase 1 done. Both labellers (Opus, Sonnet) labelled all 10 sets
  (1,501 lines). Agreement, all 10 sets (alpha / percent): stage 0.74 / 81%,
  move 0.82 / 84%, her signal 0.73 / 79%, second stage yes/no 0.38 / 92%;
  same hook point in 7 of 10 sets. Held-out stage agreement is lower (0.63 /
  72%). 545 lines disagree; 26 carry a rare label. Her signal "laughs" is
  almost never used (the models pick "plays along").
- 2026-11-19: Phase 2 done. Round 1 page live (3 whole sets + 59 cards: 40
  disputed, 9 rare, 10 spot checks), tested with a fake store incl. a failed
  save; task added to his daily page for 2026-11-20. Next: Phase 3 after his
  marks.
