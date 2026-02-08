# Plan: Realistic Conversation Logic (MVP) from 224 Transcribed Videos (Diarized Subset)

**Status:** Phase 0-1 DONE, Phase 2 ready
**Created:** 2026-02-07
**Updated:** 2026-02-08

## Goal
Use the transcripts to teach the app more realistic conversation dynamics for scenarios (starting with `keep-it-going`).

Reality check (current repo state):
- `data/02.transcribe` contains **224** `.full.json` transcripts.
- `data/04.diarize` currently contains **~97** diarized `.full.json` files.

For MVP we use the diarized subset because it preserves speaker labels (man/woman/coach). We can diarize the remaining transcripts later if needed.

Primary problems to fix:
1. Woman gets warm/flirty too quickly.
2. Evaluation is not contextual enough (it should consider what she just said, not only his line).

**MVP target:** ~90% "feels real" for the first ~10 turns of `keep-it-going`.

## MVP decisions (locked)
- **Data style:** US-style infield baseline (this is what we have in the dataset).
- **Realism target:** average realistic (not "coachably compliant").
- **Early exit:** enabled (ending the conversation early is a feature, not a bug).
- **No busy exit (MVP):** she can be busy/deflect, but do not randomly end the conversation just because she's "busy".
- **Sycophancy:** treat as a bug; woman should not reward low-quality lines with warmth.
- **Future-proofing:** build baseline + "notches" up/down (later: archetypes, difficulty, modulators).

## Definition of "90% realistic" (MVP)
We treat this as an acceptance checklist:
1. **Warmth pacing:** She does not jump to "interested/flirty" in the first 3 turns unless the user's line is exceptional and the situation fits.
2. **Question behavior:** In cold/guarded states she rarely asks questions back.
3. **Length behavior:** Cold is short (often 1-6 words), guarded is short (often 1 sentence), curious is 1-2 sentences, interested is still short but more playful/investing.
4. **Friction exists:** She sometimes deflects, tests, or is busy even if he's decent.
5. **Context-aware scoring:** Evaluator sees at least her last message (so "threading" can be scored).
6. **Early exits happen:** If interest tanks (or he is creepy), she ends the interaction quickly.
7. **No early fantasy lines:** Avoid "det var frækt" on turn 3 behavior.

## Inputs (source of truth)
Use diarized transcripts, not raw transcripts.

- Primary: `data/04.diarize/**/**/*.full.json`
  - Contains `segments[]` with `speaker` labels (e.g. `SPEAKER_02`) and segment `text`.
- Fallback only if diarized file is missing: `data/02.transcribe/**/**/*.full.json`
- Exclusions: `data/.excluded-video-ids.txt`

Important: diarization speaker labels are per-video, not global. We must map them per video.

## Outputs (artifacts)
All artifacts live under `data/woman-responses/` so we can iterate without touching app code every batch.

1. `data/woman-responses/manifest.json`
   - Stable list of diarized transcript files: `video_id`, `title`, `path`.
2. `data/woman-responses/holdout.json`
   - Fixed holdout set for end-only validation.
3. `data/woman-responses/extractions/*.json`
   - One extraction file per video with turn-by-turn (him/her) pairs + labels.
4. Draft loop (one per batch of 5 videos):
   - `data/woman-responses/drafts/draft_XX_playbook.md`
   - `data/woman-responses/drafts/draft_XX_profiles.json`
   - `data/woman-responses/drafts/draft_XX_rubric.json`
   - `data/woman-responses/drafts/draft_XX_metrics.json`
   - `data/woman-responses/drafts/draft_XX_changelog.md`
5. Frozen "v1" (integrate into app):
   - `data/woman-responses/final/playbook.md`
   - `data/woman-responses/final/profiles.json`
   - `data/woman-responses/final/rubric.json`

## Core idea (matches your draft loop, but makes it runnable)
We do not try to stuff 224 full transcripts into prompts. Instead:
1. Extract small, structured turn data per video (cheap + cacheable).
2. In batches of 5 videos, update a compact draft "playbook + profiles + rubric".
3. Run quick regression checks after each draft update (metrics + scripted conversations).
4. Integrate the frozen v1 artifacts into `keep-it-going`.

This keeps drafts grounded and testable.

## Conversation state model (MVP)
Realism needs accumulation + pacing.

MVP state variables:
- `interestLevel`: 1-10 (accumulates; does not reset each turn)
- `phase`: `hook` | `vibe` | `invest` | `close` (derived from turn count + interest)
- `difficulty`: `easy` | `normal` | `hard` (tunes how fast interest moves and how "testy" she is)
- `exitRisk`: 0-3 (rises with boring/creepy/too-long; can trigger early exit)

Optional (slot for later):
- `archetype`: e.g. busy professional, playful extrovert, skeptical, etc.

MVP implementation note:
- Even if `difficulty` isn't exposed in UI yet, implement it as a small numeric "notch" that shifts the baseline (so we can later add archetypes/difficulty without rewriting prompts).
- Suggested representation: `realismNotch` in `[-1, 0, +1]` where:
  - `-1` = slightly easier/more compliant (still realistic)
  - `0` = average realistic (MVP default)
  - `+1` = slightly harder/more skeptical

## Extraction schema
Each extraction file is one video:

Path: `data/woman-responses/extractions/VIDEO_ID.json`

```json
{
  "video_id": "e2dLEB-AwmA",
  "source_path": "data/04.diarize/.../Title [e2dLEB-AwmA].full.json",
  "video_type": "infield|mixed|educational|testimonial|unknown",
  "speaker_roles": {
    "SPEAKER_00": "coach|man|woman|other|unknown",
    "SPEAKER_01": "..."
  },
  "turns": [
    {
      "turn": 1,
      "phase": "hook|vibe|invest|close",
      "him": "string",
      "her": "string",
      "his_move": ["statement", "question_interview", "cold_read", "tease", "logistics", "sexual", "meta", "apology"],
      "her_move": ["short_ack", "answer_short", "answer_detail", "deflect", "test", "question_back", "laugh", "busy", "flirt", "exit"],
      "her_interest": 4,
      "notes": "optional"
    }
  ],
  "extraction_notes": "optional",
  "confidence": "high|medium|low"
}
```

Notes:
- Keep the move taxonomy small and consistent. Don't invent new tags mid-run unless you update the rubric too.
- `her_interest` is a per-turn label (what she seems like at that moment), not the global state variable.

---

# Phase 0: Setup (run once) ✅ DONE

**Completed 2026-02-08:**
- Created `data/woman-responses/{drafts,extractions,final}`
- Built `manifest.json` - 96 unique video IDs (1 duplicate removed, 4 excluded IDs not in dataset)
- Created `holdout.json` - 10 stratified IDs
- Created `candidates.json` - ranked by dialogue score
- Created `draft_00_*` baselines (profiles, rubric, playbook, changelog)

## Step 0.0: Preflight counts (know what you actually have)
```bash
echo "02.transcribe:" && find data/02.transcribe -name '*.full.json' | wc -l
echo "04.diarize:" && find data/04.diarize -name '*.full.json' | wc -l
```

Decision:
- If diarized is "enough" for MVP (it usually is): proceed with diarized-only extraction.
- If you insist on using all 224 for this iteration: run diarization on the missing transcripts first (not covered in this plan).

## Step 0.1: Create folders
```bash
mkdir -p data/woman-responses/{drafts,extractions,final}
```

## Step 0.1.1: Create `draft_00` baselines (so the loop has a starting point)
Create these files by copying the templates from the Prompts section:
- `data/woman-responses/drafts/draft_00_playbook.md`
- `data/woman-responses/drafts/draft_00_profiles.json`
- `data/woman-responses/drafts/draft_00_rubric.json`

Optional:
- `data/woman-responses/drafts/draft_00_changelog.md` ("initial baseline")

## Step 0.2: Build `manifest.json` (stable batching)
Goal: stable list of all diarized transcripts.

Command:
```bash
python3 - <<'PY'
import json, re
from pathlib import Path

root = Path("data/04.diarize")
excluded_path = Path("data/.excluded-video-ids.txt")
excluded = set(excluded_path.read_text().split()) if excluded_path.exists() else set()

items = []
seen = set()
for p in sorted(root.rglob("*.full.json")):
  s = str(p)
  m = re.search(r"\\[([A-Za-z0-9_-]{6,})\\]", p.name) or re.search(r"\\[([A-Za-z0-9_-]{6,})\\]", s)
  if not m:
    continue
  vid = m.group(1)
  if vid in excluded:
    continue
  if vid in seen:
    # If duplicates exist, keep the first one for stable batching.
    continue
  seen.add(vid)
  items.append({
    "video_id": vid,
    "title": p.parent.name,
    "path": s,
  })

out_dir = Path("data/woman-responses")
out_dir.mkdir(parents=True, exist_ok=True)
out_path = out_dir / "manifest.json"
out_path.write_text(json.dumps(items, indent=2), encoding="utf-8")
print(f"Wrote {out_path} with {len(items)} items.")
PY
```

## Step 0.3: Create a holdout list (do before learning)
Goal: a reality check at the end (not trained-on examples).

Rule:
- Pick ~10% of *infield* videos (or minimum 20) across multiple coaches/channels.
- Save only their `video_id`s.

Artifact:
`data/woman-responses/holdout.json`

Format:
```json
{ "video_ids": ["abc123", "def456"] }
```

Recommended command (creates a stable holdout stratified by top folder; review before committing):
```bash
python3 - <<'PY'
import json, random
from collections import defaultdict
from pathlib import Path

random.seed(1337)  # keep stable
manifest = json.loads(Path("data/woman-responses/manifest.json").read_text(encoding="utf-8"))
holdout_n = min(20, max(10, round(len(manifest) * 0.10)))

by_group = defaultdict(list)
for it in manifest:
  p = Path(it["path"])
  # group by the first folder under data/04.diarize
  parts = p.parts
  try:
    idx = parts.index("04.diarize")
    group = parts[idx + 1]
  except Exception:
    group = "unknown"
  by_group[group].append(it["video_id"])

# round-robin sample across groups
groups = sorted(by_group.keys(), key=lambda g: len(by_group[g]), reverse=True)
for g in groups:
  random.shuffle(by_group[g])

holdout = []
while len(holdout) < holdout_n:
  progressed = False
  for g in groups:
    if by_group[g] and len(holdout) < holdout_n:
      holdout.append(by_group[g].pop())
      progressed = True
  if not progressed:
    break

out = {"video_ids": holdout}
out_path = Path("data/woman-responses/holdout.json")
out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
print(f"Wrote {out_path} with {len(holdout)} ids.")
print("\\nHoldout ids:")
for vid in holdout:
  print("-", vid)
PY
```

## Step 0.4 (recommended): Rank "dialogue-likely" candidates for faster MVP
Reason: The 224 videos include many educational/testimonial videos. For MVP, prioritize files that look like real back-and-forth dialogue.

Heuristic: videos with frequent speaker alternation and 2-3 dominant speakers are more likely infield.

Command (writes ranked JSON to `data/woman-responses/candidates.json`):
```bash
python3 - <<'PY'
import json, math, re
from pathlib import Path

manifest = json.loads(Path("data/woman-responses/manifest.json").read_text(encoding="utf-8"))

def safe_log(x):
  return math.log(max(1e-9, x))

items = []
for it in manifest:
  p = Path(it["path"])
  try:
    obj = json.loads(p.read_text(encoding="utf-8"))
  except Exception:
    continue
  segs = obj.get("segments") or []
  if not segs:
    continue
  speakers = [s.get("speaker") for s in segs if s.get("speaker")]
  texts = [(s.get("text") or "").strip() for s in segs]
  texts = [t for t in texts if t]

  uniq = sorted(set(speakers))
  # alternations: count changes in consecutive speaker labels
  alts = 0
  last = None
  for sp in speakers:
    if last is not None and sp != last:
      alts += 1
    last = sp

  # crude proxy for "dialogue": alternations per segment, penalize too many unique speakers (noise)
  alt_rate = alts / max(1, len(speakers))
  uniq_penalty = max(0, len(uniq) - 3) * 0.12
  # long single-speaker educational videos often have low alternation
  dialogue_score = max(0.0, alt_rate - uniq_penalty)

  items.append({
    "video_id": it["video_id"],
    "title": it["title"],
    "path": it["path"],
    "segments": len(segs),
    "unique_speakers": len(uniq),
    "alternations": alts,
    "alt_rate": round(alt_rate, 3),
    "dialogue_score": round(dialogue_score, 4),
  })

items.sort(key=lambda x: x["dialogue_score"], reverse=True)
out_path = Path("data/woman-responses/candidates.json")
out_path.write_text(json.dumps(items, indent=2), encoding="utf-8")
print(f"Wrote {out_path} with {len(items)} ranked items.")
print("Top 10 by dialogue_score:")
for x in items[:10]:
  print("-", x["video_id"], x["dialogue_score"], x["unique_speakers"], x["title"])
PY
```

Use `candidates.json` to pick:
- Pilot videos: from top-ranked, but from different folders/coaches if possible.
- MVP batches: top-ranked items not in holdout.

## Step 0.5 (recommended): Build "rejection-likely" candidates (to avoid warmth bias)
Reason: If you only sample high `dialogue_score`, you bias toward longer/successful interactions and you may not learn enough cold/exit behavior.

Command (creates `data/woman-responses/rejection_candidates.json` by keyword search in diarized text):
```bash
python3 - <<'PY'
import json, re
from pathlib import Path

manifest = json.loads(Path("data/woman-responses/manifest.json").read_text(encoding="utf-8"))

patterns = [
  r\"\\bnot interested\\b\",
  r\"\\bhave a boyfriend\\b\",
  r\"\\bI('?m| am) busy\\b\",
  r\"\\bI have to go\\b\",
  r\"\\bno thanks\\b\",
  r\"\\bsorry\\b\",
  r\"\\bleave me alone\\b\",
  r\"\\bdon't talk to me\\b\",
]
rx = re.compile(\"|\".join(patterns), re.IGNORECASE)

hits = []
for it in manifest:
  p = Path(it[\"path\"])
  try:
    obj = json.loads(p.read_text(encoding=\"utf-8\"))
  except Exception:
    continue
  text = (obj.get(\"text\") or \"\")
  m = rx.search(text)
  if m:
    hits.append({**it, \"match\": m.group(0)})

out_path = Path(\"data/woman-responses/rejection_candidates.json\")
out_path.write_text(json.dumps(hits, indent=2), encoding=\"utf-8\")
print(f\"Wrote {out_path} with {len(hits)} hits.\")
print(\"Top 10 matches:\")
for x in hits[:10]:
  print(\"-\", x[\"video_id\"], x[\"match\"], x[\"title\"])
PY
```

---

# Phase 1: Pilot (1 batch of 5 videos) ✅ DONE

**Completed 2026-02-08:**
- Extracted 5 videos: `d8H9RlGpS0g`, `hllwnZLqvsE`, `mv2X8Yhg9M0`, `pI3rYRHL4Oc`, `D1t_K8hjJzc`
- 69 total turns extracted
- Pilot gate passed:
  - ✅ 3+ infield with 8+ turns (d8H9RlGpS0g=19, hllwnZLqvsE=17, D1t_K8hjJzc=12)
  - ✅ Early turns 100% guarded (4-5), no premature warming
  - ✅ Word counts: guarded=6.7, curious=14.7 (matches expectations)
- Metrics saved to `draft_00_metrics.json`
- Note: No cold (1-3) or interested (8-10) in pilot - need more diverse videos in Phase 2

Objective: validate diarization speaker mapping + turn extraction + labeling before scaling.

## Step 1.1: Pick 5 known-infield videos
Choose across different coaches/channels (avoid 5 from the same series).

## Step 1.2: Map diarization speakers to roles (per video)
For a given diarized file path from `manifest.json`, print sample segments per speaker:

```bash
python3 - <<'PY'
import json, collections, sys
from pathlib import Path

path = Path(sys.argv[1])
obj = json.loads(path.read_text(encoding="utf-8"))
by = collections.defaultdict(list)
for seg in obj.get("segments", []):
  sp = seg.get("speaker", "UNKNOWN")
  t = (seg.get("text") or "").strip()
  if t:
    by[sp].append(t)

for sp in sorted(by.keys()):
  texts = by[sp]
  print(f"\\n== {sp} ({len(texts)} segments) ==")
  for t in texts[:12]:
    print("-", t[:140])
PY "PATH_FROM_MANIFEST"
```

Now decide:
- Which speaker is coach/commentary/ads
- Which is the man (infield)
- Which is the woman (or multiple women)

If ambiguous: set `confidence: low` and skip the video for now.

## Step 1.3: Extract turns (man -> woman pairs)
Rules:
- Only include turns where we have a `man -> woman` exchange.
- Skip long monologues that are clearly coach commentary.
- Merge consecutive segments from the same role into one utterance (to avoid micro-segmentation noise).

## Step 1.4: Label moves + per-turn interest
Be conservative:
- Default early turns to cold/guarded unless there is strong evidence.
- If you are not sure she is flirting, don't label `flirt`.

## Step 1.5: Pilot gate (must pass)
For the 5 pilot videos:
- At least 3 are `video_type: infield` with 8+ extracted turns each.
- Cold/guarded dominates early turns (not curious/interested).
- Output JSON validates and follows schema.

If pilot fails: refine the prompts/taxonomy/schema now, not later.

---

# Phase 2: Batch loop (core iteration)
We process batches of 5 videos and produce `draft_XX`.

## MVP scope (recommended)
For the first MVP, do not process all 224.

Stop after:
- 6 batches (30 videos) OR
- 3 consecutive drafts with stable metrics and no major regressions

Then integrate v1 into the app. You can continue batching afterwards.

## Batch inputs
- Prefer a balanced batch to avoid warmth bias:
  - 3 videos from the top of `data/woman-responses/candidates.json` (dialogue-heavy)
  - 2 videos from `data/woman-responses/rejection_candidates.json` (rejection/exit-heavy), if available

Hard rule:
- Never pick from `holdout.json`.
- Never re-process an already extracted `video_id`.

Recommended command to list the next 5 unprocessed candidates:
```bash
python3 - <<'PY'
import json
from pathlib import Path

candidates = Path("data/woman-responses/candidates.json")
manifest = Path("data/woman-responses/manifest.json")
holdout = Path("data/woman-responses/holdout.json")

items = json.loads((candidates if candidates.exists() else manifest).read_text(encoding="utf-8"))
hold = set(json.loads(holdout.read_text(encoding="utf-8")).get("video_ids", [])) if holdout.exists() else set()

extracted = set()
ex_dir = Path("data/woman-responses/extractions")
if ex_dir.exists():
  for p in ex_dir.glob("*.json"):
    extracted.add(p.stem)

out = []
for it in items:
  vid = it["video_id"]
  if vid in hold or vid in extracted:
    continue
  out.append(it)
  if len(out) >= 5:
    break

for it in out:
  print(it["video_id"], it.get("dialogue_score","-"), it["path"])
PY
```

## Batch steps (repeat for batch_01 ... batch_N)
1. Extract 5 videos into `data/woman-responses/extractions/*.json`
2. Update the draft artifacts (playbook/profiles/rubric)
3. Compute metrics + run drift checks
4. Run quick scripted regression conversations
5. Decide: accept draft, or revise and rerun the same batch

## Step 2.1: Draft update (the "learning" step)
Input:
- previous draft (`draft_XX_*`)
- the 5 new extraction files

Output:
- `draft_YY_playbook.md`: compact instructions for response generation
- `draft_YY_profiles.json`: numeric ranges/probabilities by interest bucket
- `draft_YY_rubric.json`: scoring and tagging rules for evaluator
- `draft_YY_changelog.md`: what changed and why (cite example turns)
- `draft_YY_metrics.json`: updated aggregate metrics

Critical rule: drafts must stay small. If a draft grows beyond ~6-8KB, summarize harder.

## Step 2.2: Metrics (per draft)
Compute from extracted turns:
- Count of turns per interest bucket (1-3, 4-5, 6-7, 8-10)
- Mean/median word count of `her` by bucket
- Question-mark rate (`?` present) by bucket
- Question-back rate (`her_move` includes `question_back`) by bucket
- Deflect/test/busy rate by bucket
- Flirty-token rate by bucket (simple keyword list; keep it crude for MVP)

Suggested command (writes metrics JSON to stdout; redirect into `draft_YY_metrics.json`):
```bash
python3 - <<'PY'
import json, glob, re, statistics

def word_count(s: str) -> int:
  s = (s or "").strip()
  if not s:
    return 0
  return len(re.findall(r"\\b\\w+\\b", s))

def bucket(i: int) -> str:
  if i <= 3: return "1-3"
  if i <= 5: return "4-5"
  if i <= 7: return "6-7"
  return "8-10"

files = sorted(glob.glob("data/woman-responses/extractions/*.json"))
turns = []
for fp in files:
  try:
    obj = json.load(open(fp, encoding="utf-8"))
  except Exception:
    continue
  for t in obj.get("turns", []):
    hi = int(t.get("her_interest") or 0)
    if hi < 1 or hi > 10:
      continue
    her = t.get("her","") or ""
    her_move = t.get("her_move") or []
    turn_num = int(t.get("turn") or 0)
    phase = t.get("phase") or ""
    turns.append({
      "bucket": bucket(hi),
      "words": word_count(her),
      "has_q_mark": "?" in her,
      "has_q_back": "question_back" in her_move,
      "her_move": her_move,
      "turn": turn_num,
      "phase": phase,
    })

byb = {}
for b in ["1-3","4-5","6-7","8-10"]:
  ts = [x for x in turns if x["bucket"] == b]
  if not ts:
    byb[b] = {"count": 0}
    continue
  words = [x["words"] for x in ts]
  q_mark_rate = sum(1 for x in ts if x["has_q_mark"]) / len(ts)
  q_back_rate = sum(1 for x in ts if x["has_q_back"]) / len(ts)
  deflect_rate = sum(1 for x in ts if "deflect" in x["her_move"]) / len(ts)
  test_rate = sum(1 for x in ts if "test" in x["her_move"]) / len(ts)
  busy_rate = sum(1 for x in ts if "busy" in x["her_move"]) / len(ts)
  byb[b] = {
    "count": len(ts),
    "word_count_mean": round(statistics.mean(words), 2),
    "word_count_median": statistics.median(words),
    "question_mark_rate": round(q_mark_rate, 3),
    "question_back_rate": round(q_back_rate, 3),
    "deflect_rate": round(deflect_rate, 3),
    "test_rate": round(test_rate, 3),
    "busy_rate": round(busy_rate, 3),
  }

out = {
  "videos": len(files),
  "turns": len(turns),
  "by_bucket": byb,
  "early_turns_by_bucket": {
    "1-3": sum(1 for x in turns if x["bucket"]=="1-3" and (x["phase"]=="hook" or (x["turn"] and x["turn"]<=4))),
    "4-5": sum(1 for x in turns if x["bucket"]=="4-5" and (x["phase"]=="hook" or (x["turn"] and x["turn"]<=4))),
    "6-7": sum(1 for x in turns if x["bucket"]=="6-7" and (x["phase"]=="hook" or (x["turn"] and x["turn"]<=4))),
    "8-10": sum(1 for x in turns if x["bucket"]=="8-10" and (x["phase"]=="hook" or (x["turn"] and x["turn"]<=4))),
  },
}
print(json.dumps(out, indent=2))
PY
```

## Step 2.3: Drift checks (stop if broken)
Stop and fix labeling/prompts if any of these occur:
- Cold bucket question_back_rate > 5%
- Cold bucket mean word count > 8
- Interested bucket dominates early turns in extracted dataset (e.g. `early_turns_by_bucket["8-10"] > 5%` of all early turns)
- Flirty-token rate shows up meaningfully in low-interest buckets

## Step 2.4: Scripted regression conversations (per draft)
Run 3 short scripts and ensure behavior is sane:
1. Interview mode: expect cooling + exit
2. Playful cold reads: expect gradual warming
3. Try-hard/sexual too early: expect skepticism + exit

These are to catch obvious regressions, not to prove correctness.

## Step 2.5: Coverage stop condition (do not integrate without it)
Before freezing v1 / integrating, ensure you have at least:
- `>= 20` turns labeled `her_interest` 1-3 (cold)
- `>= 20` turns labeled `her_interest` 8-10 (interested)
- `>= 5` turns where `her_move` includes `"exit"` OR the transcript clearly ends with her leaving/refusing

If you cannot get enough cold/exit examples from the diarized subset:
- Expand sampling beyond the top dialogue_score candidates.
- Use `rejection_candidates.json` aggressively.

---

# Phase 3: Freeze v1
Freeze when:
- Metrics stabilize (no big swings for 3 drafts)
- Scripted regressions behave as expected
- Manual spot checks on ~10 random extracted turns match intuition

Then:
- Copy best draft artifacts to `data/woman-responses/final/*`
- Add a "known limitations" section to `data/woman-responses/final/playbook.md`

---

# Phase 4: Integrate into `keep-it-going` (MVP)
This section intentionally describes *what* to change; code can be generated when we get here.

## Step 4.0: Freeze artifacts for v1
You need these files before coding:
- `data/woman-responses/final/playbook.md`
- `data/woman-responses/final/profiles.json`
- `data/woman-responses/final/rubric.json`

Recommendation for MVP: copy the final JSON into TypeScript constants (to avoid runtime file loading issues in Next.js/serverless).

## Step 4.1: Extend keep-it-going context (state)
Files:
- `src/scenarios/keepitgoing/types.ts`
- `src/scenarios/schemas.ts` (Zod API schema)

Add to `KeepItGoingContext` (and schema):
- `interestLevel: number` (1-10)
- `exitRisk: number` (0-3)
- `realismNotch: -1 | 0 | 1` (default 0)
- `isEnded: boolean`
- `endReason?: string`

## Step 4.2: Initialize the new state on scenario start
File:
- `src/scenarios/keepitgoing/generator.ts`

In `generateKeepItGoingScenario()` initialize:
- `interestLevel = 4` (guarded baseline)
- `exitRisk = 0`
- `realismNotch = 0`
- `isEnded = false`

## Step 4.3: Make evaluation contextual + output deltas + end flags
File:
- `src/scenarios/keepitgoing/chat.ts`

Update `EVAL_SYSTEM_PROMPT` so it evaluates his line *relative to her last line*, and returns:
```json
{
  "score": 1,
  "feedback": "string (same language as input)",
  "quality": "positive|neutral|deflect|skeptical",
  "tags": ["threading", "interview_question"],
  "endConversation": false,
  "endReason": ""
}
```

Rules:
- Tags must come from `final/rubric.json` only (do not invent tags).
- Do NOT compute deltas in the model. The server computes deltas deterministically from the rubric (score mapping + tags).
- `endConversation` should be true for creepy/sexual-too-soon patterns and for low-interest + high-annoyance patterns.

Minimum context to include in the eval user prompt:
- situation (location/setup)
- her last message
- his new message
- current `interestLevel`, `exitRisk`, and `conversationPhase`

## Step 4.4: Update context using rubric (deterministic)
Files:
- `src/scenarios/keepitgoing/generator.ts` (or a new pure helper module)
- `src/scenarios/scenariosService.ts` (wiring)

Implement update rules:
1. Clamp `interestLevel` to 1-10 and `exitRisk` to 0-3.
2. Compute `interestDelta` from `scoreToInterestDelta` plus per-tag deltas, then clamp.
3. Compute `exitRiskDelta` from per-tag deltas, then clamp.
4. Apply pacing rules:
   - Cap max interest by early turns using `pacing.maxInterestBeforeTurn`.
   - Do not allow `interestLevel >= 8` before `pacing.noInterestedBeforeTurn`.
5. Apply notch bias (from `realismNotch`) to `exitRisk` (recommended), but keep it small.
6. If `endConversation` is true:
   - set `isEnded = true`
   - set `endReason`
   - force `conversationPhase = "close"` (or keep current phase but mark ended)

## Step 4.5: Condition response generation on interest bucket + playbook constraints
File:
- `src/scenarios/keepitgoing/chat.ts`

Modify `buildSystemPrompt()` to include:
- current `interestLevel` + bucket name
- `conversationPhase`
- the non-sycophancy rule
- numeric constraints from `final/profiles.json` (word count, question rate guidance, exit likelihood)
- if `isEnded` is true: instruct to send a final exit line and not re-engage

Important: keep the response generator grounded in constraints:
- Short, no coaching tone
- No "unearned warmth"
- Early turns: no strong validation/flirting by default

## Step 4.5.1 (recommended): Validate output and regenerate once
Reason: LLMs will sometimes violate constraints (too long, too warm, too many questions).

MVP validator checks (language-agnostic):
- <= 2 sentences (rough heuristic: count `.?!`)
- if interest bucket is cold/guarded: no more than 1 question mark total
- word count within bucket range (from profiles.json)
- at most 1 `*action*` block

If validation fails:
1. Re-prompt with "Rewrite the last message to satisfy constraints exactly. Keep meaning similar. Output only the rewritten message."
2. If it still fails, hard-trim (server-side) and log.

## Step 4.6: Wire early-exit into the API + UI
Files:
- `src/scenarios/scenariosService.ts`
- `src/scenarios/components/ChatWindow.tsx`

Server behavior:
- If evaluation returns `endConversation: true`, generate her final exit response (1-2 sentences) and return updated context with `isEnded = true`.
- If `isEnded` is already true and the user keeps typing, respond with a consistent hard stop (do not reopen).

UI behavior:
- If `keepItGoingContext.isEnded` becomes true: disable the input and show `endReason` (or a generic "She left" line).

## Step 4.7: MVP verification checklist (in-app)
Pass conditions:
1. In the first 3 turns, she is usually cold/guarded.
2. Repeated interview questions cool her and can end the convo.
3. 3-5 good turns warms her gradually (not instantly).
4. Sexual too soon triggers skepticism/exit.
5. She is not "nice" by default; she is realistic.

---

# Phase 5: Verification (release gate)
1. Manual:
   - Run 10 keep-it-going sessions (mixed good/bad replies)
   - Confirm pacing + exits feel realistic
2. Automated sanity:
   - Generate 50 responses at each interest bucket
   - Check word-count and question-rate constraints
3. Holdout:
   - Extract holdout videos only at the end
   - Check that holdout metrics are similar (no major mismatch)

---

# Prompts (copy/paste blocks)

## Draft artifact templates (freeze the structure early)
These templates are important: they let Draft N+1 update Draft N deterministically.

### Template: `draft_XX_profiles.json`
```json
{
  "version": 1,
  "global": {
    "maxSentences": 2,
    "actions": {
      "required": false,
      "maxPerMessage": 1,
      "style": "use *actions* sparingly; no novel-length stage directions"
    },
    "noEarlyFlirtTurns": 3
  },
  "notches": {
    "-1": { "label": "slightly easier", "interestDeltaBias": 0, "exitRiskBias": -1 },
    "0": { "label": "average realistic (MVP)", "interestDeltaBias": 0, "exitRiskBias": 0 },
    "1": { "label": "slightly harder", "interestDeltaBias": 0, "exitRiskBias": +1 }
  },
  "buckets": {
    "cold": {
      "interestRange": [1, 3],
      "wordCount": { "min": 1, "max": 6 },
      "questionRateMax": 0.05,
      "shouldAskBack": false,
      "deflectRateTarget": 0.35,
      "busyRateTarget": 0.25,
      "testRateTarget": 0.15,
      "exitChancePerTurn": 0,
      "styleNotes": "short, unimpressed, can ignore, can leave"
    },
    "guarded": {
      "interestRange": [4, 5],
      "wordCount": { "min": 2, "max": 14 },
      "questionRateMax": 0.15,
      "shouldAskBack": false,
      "deflectRateTarget": 0.20,
      "busyRateTarget": 0.15,
      "testRateTarget": 0.15,
      "exitChancePerTurn": 0,
      "styleNotes": "polite but not investing; answers can be vague"
    },
    "curious": {
      "interestRange": [6, 7],
      "wordCount": { "min": 6, "max": 26 },
      "questionRateMax": 0.45,
      "shouldAskBack": true,
      "deflectRateTarget": 0.10,
      "busyRateTarget": 0.08,
      "testRateTarget": 0.10,
      "exitChancePerTurn": 0,
      "styleNotes": "engaged; asks a question sometimes; still not 'in love'"
    },
    "interested": {
      "interestRange": [8, 10],
      "wordCount": { "min": 8, "max": 32 },
      "questionRateMax": 0.65,
      "shouldAskBack": true,
      "deflectRateTarget": 0.05,
      "busyRateTarget": 0.03,
      "testRateTarget": 0.06,
      "exitChancePerTurn": 0,
      "styleNotes": "warm/playful; may flirt lightly; still realistic"
    }
  }
}
```

Interpretation note:
- `questionRateMax` should track **question_back_rate** (tag-based), not raw punctuation. A rhetorical "Really?" can contain `?` without being an investing question-back.

### Template: `draft_XX_rubric.json`
```json
{
  "version": 1,
  "interest": { "start": 4, "min": 1, "max": 10 },
  "exitRisk": { "start": 0, "min": 0, "max": 3 },
  "pacing": {
    "noInterestedBeforeTurn": 4,
    "maxInterestBeforeTurn": [
      { "turnMax": 2, "maxInterest": 6 },
      { "turnMax": 4, "maxInterest": 7 }
    ]
  },
  "scoreToInterestDelta": [
    { "minScore": 9, "maxScore": 10, "delta": 2 },
    { "minScore": 7, "maxScore": 8, "delta": 1 },
    { "minScore": 5, "maxScore": 6, "delta": 0 },
    { "minScore": 3, "maxScore": 4, "delta": -1 },
    { "minScore": 1, "maxScore": 2, "delta": -2 }
  ],
  "tags": {
    "threading": { "interestDelta": 1, "exitRiskDelta": -1 },
    "cold_read": { "interestDelta": 1, "exitRiskDelta": 0 },
    "interview_question": { "interestDelta": -1, "exitRiskDelta": 1 },
    "too_long": { "interestDelta": -1, "exitRiskDelta": 1 },
    "try_hard": { "interestDelta": -1, "exitRiskDelta": 1 },
    "sexual_too_soon": { "interestDelta": -2, "exitRiskDelta": 2 },
    "creepy": { "interestDelta": -3, "exitRiskDelta": 3 }
  },
  "endRules": [
    { "when": "exitRisk>=3", "endConversation": true, "reason": "she is done / uncomfortable" },
    { "when": "interestLevel<=2 && exitRisk>=2", "endConversation": true, "reason": "low interest + annoyance" }
  ]
}
```

### Template: `draft_XX_playbook.md`
```md
# Woman Response Playbook (Draft XX)

## Non-sycophancy rule (critical)
She is not here to be nice. She is here to be realistic.
If his line is mediocre, she does not "reward" him with warmth.

## Global constraints
- Stay in character as a real woman in a public place.
- Short: max 2 sentences.
- Include at most one small *action*.
- No long explanations, no coaching, no therapy tone.
- If she wants to leave, she leaves (end the conversation).

## Pacing constraints
- Turns 1-3: no strong flirt/validation unless he is exceptional.
- Interest changes gradually; no instant 8/10 from a decent line.

## Behavior by interest bucket
- Cold (1-3): short, dismissive, busy, may ignore, rarely asks questions.
- Guarded (4-5): polite but guarded; minimal info; watches his vibe.
- Curious (6-7): engaged; sometimes asks a question back; playful sometimes.
- Interested (8-10): warm and investing; can flirt lightly; still realistic.

## Early exit examples
- "Sorry, I have to go." *keeps walking*
- "I'm not interested." *turns away*

MVP note:
- Do not randomly end just because she's busy. "Busy" should usually be a deflect, not an exit.
```

## Prompt A: Speaker role mapping (per video)
Goal: map `SPEAKER_XX` to roles.

Input you provide:
- For each `SPEAKER_XX`: 10 short example segments (verbatim)

Prompt text:
```
You are mapping diarized speaker labels to roles for a dating/infield transcript.

SPEAKER SAMPLES (verbatim snippets):
{paste groups like: SPEAKER_00: - "...", - "..."}

TASK:
1. Decide the video_type:
   - "infield" = mostly a real man-woman interaction
   - "mixed" = some infield + some coach commentary/ads
   - "educational" = mostly teaching monologue
   - "testimonial" = mostly testimonial story
   - "unknown" if unclear
2. Map each SPEAKER_XX to exactly one role:
   - "man" = the infield guy speaking to her
   - "woman" = the primary woman being approached (ONLY ONE speaker should be "woman")
   - "coach" = commentary / narration / ads
   - "other" = friends, bystanders, multiple women, interviewer, etc.
   - "unknown" if truly unclear

IMPORTANT RULES:
- Be strict. If it's not clearly infield, don't force it.
- If there are multiple women, pick one primary woman (the one he interacts with most) as "woman"; label the rest "other".
- If confidence is not high, set confidence to "low" and explain why.

OUTPUT (JSON only):
{
  "video_type": "infield|mixed|educational|testimonial|unknown",
  "speaker_roles": {
    "SPEAKER_00": "coach|man|woman|other|unknown",
    "SPEAKER_01": "coach|man|woman|other|unknown"
  },
  "confidence": "high|medium|low",
  "notes": "Short evidence-based notes. Cite 1-2 snippet fragments per key decision."
}
```

Output (JSON only):
```json
{
  "video_type": "mixed",
  "speaker_roles": { "SPEAKER_00": "coach", "SPEAKER_01": "man", "SPEAKER_02": "woman" },
  "confidence": "high|medium|low",
  "notes": "Evidence-based explanation, cite 1-2 example snippets per mapping."
}
```

## Prompt B: Turn extraction + labeling (per video)
Input:
- `speaker_roles` mapping
- diarized segments (or segments filtered to man/woman only)

Prompt text:
```
You are extracting clean man->woman turns from a diarized transcript, then labeling each turn with simple behavioral tags and an interest score.

INPUTS:
1) video_id: {VIDEO_ID}
2) source_path: {PATH}
3) video_type: {from Prompt A}
4) speaker_roles: {from Prompt A}
5) diarized transcript JSON: {either paste segments OR you (the assistant) should read the file at source_path}

TURN BUILDING RULES:
- Use ONLY segments whose speaker role is "man" or "woman".
- Merge consecutive segments from the same role into one utterance.
- Create a turn only when the pattern is man -> woman.
- Skip:
  - coach commentary, ads, calls to action
  - unclear speaker
  - overly fragmented filler that doesn't form a real exchange

PHASE RULES (MVP):
- turn 1-4: "hook"
- turn 5-12: "vibe"
- turn 13-18: "invest"
- turn 19+: "close"
- If she tries to end/leave at any point, you may set phase to "close" for that turn.

LABELS:
his_move (choose 1-2 max):
- statement
- question_interview
- cold_read
- tease
- logistics
- sexual
- meta
- apology

her_move (choose 1-3 max):
- short_ack
- answer_short
- answer_detail
- deflect
- test
- question_back
- laugh
- busy
- flirt
- exit

her_interest (1-10):
- 1-3 = cold (wants to leave, one-word, dismissive, annoyed)
- 4-5 = guarded (polite but not investing, minimal)
- 6-7 = curious (engaged, gives something back, may ask a question)
- 8-10 = interested (warm/playful, invests, light flirt)

IMPORTANT CALIBRATION:
- Polite != interested.
- Early hook turns should usually be 3-5 unless she clearly invests.
- Avoid sycophancy: mediocre lines should not produce 7-10 responses.

OUTPUT (JSON only, matches the extraction schema in the plan):
{
  "video_id": "...",
  "source_path": "...",
  "video_type": "...",
  "speaker_roles": { "...": "..." },
  "turns": [
    {
      "turn": 1,
      "phase": "hook|vibe|invest|close",
      "him": "...",
      "her": "...",
      "his_move": ["..."],
      "her_move": ["..."],
      "her_interest": 4,
      "notes": ""
    }
  ],
  "extraction_notes": "",
  "confidence": "high|medium|low"
}
```

Output:
- one extraction JSON per schema in this doc

Hard constraints (MVP):
- Be conservative: do not label warmth/flirt unless it's obvious.
- Do not "politeness inflate" interest scores. Polite != interested.
- Sycophancy guard: if his line is mediocre, her response should not become warm/investing.
- If the transcript is unclear who is speaking, skip that segment (better fewer, higher-quality turns).

## Prompt C: Draft update (per batch of 5)
Input:
- previous draft artifacts
- 5 new extraction JSON files

Prompt text:
```
You are updating a compact "realistic woman responses" draft based on 5 new extracted infield transcripts.

GOAL:
- Improve realism (average realistic), reduce sycophancy, and make warmth pacing + early exits behave like real interactions.
- Keep everything short and operational; no long essays.

INPUTS:
1) Previous draft artifacts:
   - draft_XX_playbook.md
   - draft_XX_profiles.json
   - draft_XX_rubric.json
   - draft_XX_metrics.json (if available)
2) New evidence:
   - 5 extraction JSON files (turns + labels + her_interest)
3) (Optional) Current aggregate metrics produced by the metrics script from this plan.

TASK:
1) Update `draft_YY_profiles.json`:
   - Keep the same JSON structure (do not rename keys).
   - Adjust numeric targets slightly toward what the extracted data shows, but keep them realistic and stable.
   - Make sure cold/guarded remain short, low question rate, higher deflect/busy.
   - MVP rule: do NOT introduce random "busy exit". Exits should be justified by end rules (rubric) and explicit endConversation cases.
2) Update `draft_YY_rubric.json`:
   - Keep it simple. Tags should stay small and high-signal.
   - Ensure evaluator can produce realistic interest deltas and trigger endConversation for creepy/sexual-too-soon, etc.
3) Update `draft_YY_playbook.md`:
   - Add or refine rules only if supported by multiple examples in the new evidence.
   - Keep "Non-sycophancy" as the top priority.
4) Create `draft_YY_changelog.md`:
   - Bullet list of what changed and why.
   - Cite at least 2 example turns from the new evidence (video_id + short quote fragments).

OUTPUT:
- draft_YY_playbook.md
- draft_YY_profiles.json
- draft_YY_rubric.json
- draft_YY_changelog.md

CONSTRAINTS:
- Keep playbook <= ~2 pages.
- Avoid inventing "new rules" unless the evidence repeats.
- If you changed any numeric target, explain the change in the changelog.
```

Output:
- updated playbook/profiles/rubric + changelog + metrics

Constraint:
- keep playbook short and operational
- if you add a rule, include at least 1 supporting extracted example

---

# Defaults (so the plan runs without extra decisions)
- **MVP extraction scope:** focus on 1:1 interactions. If a video has multiple women, label only the primary as `"woman"`; label the rest `"other"`.
- **Baseline context:** public place with moderate time pressure (she can be busy; she can also linger briefly if engaged).

---

# Runbook (MVP execution)
This is the shortest path to a good v1.

## Runbook 1: Data -> Drafts (30-video MVP)
1. Run Phase 0.1 through 0.4.
2. Create `draft_00_*` from templates.
3. Pick 5 pilot videos from the top of `data/woman-responses/candidates.json`.
4. For each pilot video:
   - Print speaker samples (Step 1.2)
   - Run Prompt A and decide if confidence is high enough
   - If yes: run Prompt B and save `data/woman-responses/extractions/VIDEO_ID.json`
5. After pilot: if extraction quality is good, start batch loop.
6. For each batch:
   - Pick next 5 unprocessed candidates
   - Extract them (Prompt A + Prompt B)
   - Compute metrics into `data/woman-responses/drafts/draft_YY_metrics.json`
   - Run Prompt C to produce:
     - `data/woman-responses/drafts/draft_YY_playbook.md`
     - `data/woman-responses/drafts/draft_YY_profiles.json`
     - `data/woman-responses/drafts/draft_YY_rubric.json`
     - `data/woman-responses/drafts/draft_YY_changelog.md`
7. Stop after 6 batches (30 videos) or when you have 3 stable drafts in a row.
8. Copy the best draft to `data/woman-responses/final/*`.

## Runbook 2: Drafts -> App (keep-it-going MVP)
1. Implement Phase 4 steps (context, evaluator output, response conditioning, early exit UI).
2. Run Phase 5 verification.
