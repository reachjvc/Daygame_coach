#!/usr/bin/env python3
"""
scripts/training-data/validation/semantic_judge.py

Semantic quality evaluation for Stage 07 enrichments using Claude CLI.

This is *optional* and intended for small sampled sets (canary + holdout),
with caching to avoid burning quota on reruns.

Writes (unless --no-write):
  data/validation_judgements/<batch_id>/<video_id>.conv<conversation_id>.judge.json

Read-only w.r.t. pipeline stage artifacts (06/07); it only produces judgement files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LOG_PREFIX = "[semantic-judge]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")

# Keep in sync with scripts/training-data/07.content
TECHNIQUE_TAXONOMY = [
    "direct_opener",
    "indirect_opener",
    "situational_opener",
    "observation_opener",
    "gambit",
    "push_pull",
    "tease",
    "cold_read",
    "role_play",
    "disqualification",
    "DHV",
    "frame_control",
    "takeaway",
    "false_time_constraint",
    "qualification",
    "statement_of_intent",
    "grounding",
    "storytelling",
    "vulnerability",
    "callback_humor",
    "screening",
    "appreciation",
    "compliance",
    "number_close",
    "instagram_close",
    "soft_close",
    "assumptive_close",
    "instant_date",
    "bounce",
    "time_bridge",
    "logistics_check",
]

TOPIC_TAXONOMY = [
    "name",
    "origin",
    "career",
    "education",
    "hobby",
    "travel",
    "living_situation",
    "ambitions",
    "appearance",
    "personality",
    "age",
    "behavior",
    "values",
    "plans",
    "contact",
    "logistics",
    "relationship",
    "duration",
    "food_drinks",
    "location",
    "humor",
    "flirting",
]

CLAUDE_BINARY_PATHS = [
    "claude",
    Path.home() / ".vscode-server/extensions/anthropic.claude-code-2.1.17-linux-x64/resources/native-binary/claude",
    Path.home() / ".vscode/extensions/anthropic.claude-code-2.1.17-linux-x64/resources/native-binary/claude",
    "/usr/local/bin/claude",
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def data_root() -> Path:
    return repo_root() / "data"


def _extract_video_id(text: str) -> Optional[str]:
    m = _BRACKET_ID_RE.search(text)
    return m.group(1) if m else None


def load_manifest_entries(manifest_path: Path, source_filter: Optional[str]) -> List[Tuple[str, str, str]]:
    """Return list of (source, video_id, raw_folder_text)."""
    out: List[Tuple[str, str, str]] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        src = parts[0].strip()
        folder = parts[1].strip()
        if source_filter and src != source_filter:
            continue
        vid = _extract_video_id(folder)
        if not vid:
            continue
        out.append((src, vid, folder))
    return out


def _video_id_for_path(p: Path) -> Optional[str]:
    return _extract_video_id(str(p))


def index_paths_by_video_id(stage_root: Path, glob_pattern: str, only_ids: set[str]) -> Dict[str, List[Path]]:
    out: Dict[str, List[Path]] = {}
    if not stage_root.exists():
        return out
    for p in stage_root.rglob(glob_pattern):
        vid = _video_id_for_path(p)
        if not vid or vid not in only_ids:
            continue
        out.setdefault(vid, []).append(p)
    return out


def pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, float, str]:
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        depth = len(p.parts)
        try:
            mtime = p.stat().st_mtime
        except OSError:
            mtime = 0.0
        return (source_bonus, depth, mtime, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def find_claude_binary() -> Optional[str]:
    for path in CLAUDE_BINARY_PATHS:
        path = Path(path)
        if path.exists() and path.is_file():
            return str(path)
        if str(path) == "claude":
            try:
                result = subprocess.run(["which", "claude"], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    return "claude"
            except Exception:
                pass
    return None


def call_claude(prompt: str, timeout: int = 300, model: Optional[str] = None) -> Optional[str]:
    claude_bin = find_claude_binary()
    if not claude_bin:
        print(f"{LOG_PREFIX} Error: Claude CLI not found", file=sys.stderr)
        return None
    try:
        cmd = [claude_bin]
        if isinstance(model, str) and model.strip():
            cmd += ["--model", model.strip()]
        cmd += ["-p", prompt, "--output-format", "text"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            err = (result.stderr or "").strip()
            snippet = err
            if len(snippet) > 2000:
                snippet = snippet[:2000] + " ... [truncated]"
            print(f"{LOG_PREFIX} Claude CLI error: {snippet}", file=sys.stderr)
            if "EACCES" in err and ".claude" in err:
                print(
                    f"{LOG_PREFIX} Hint: Claude CLI couldn't write to ~/.claude*. If you're running in a sandboxed "
                    f"environment, rerun with escalated permissions (or run locally outside the sandbox).",
                    file=sys.stderr,
                )
            return None
        return (result.stdout or "").strip()
    except subprocess.TimeoutExpired:
        print(f"{LOG_PREFIX} Claude CLI timeout after {timeout}s", file=sys.stderr)
        return None


def parse_json_object(response: str) -> Optional[Dict[str, Any]]:
    """Extract first JSON object from a response string."""
    if not response:
        return None
    start = response.find("{")
    if start == -1:
        return None
    brace = 0
    for i in range(start, len(response)):
        ch = response[i]
        if ch == "{":
            brace += 1
        elif ch == "}":
            brace -= 1
            if brace == 0:
                try:
                    return json.loads(response[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def stable_hash(obj: Any) -> str:
    payload = json.dumps(obj, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def judgement_root(batch_id: str) -> Path:
    return data_root() / "validation_judgements" / batch_id


@dataclass
class JudgementRequest:
    video_id: str
    source: str
    conversation_id: int
    enrichment: Dict[str, Any]
    transcript_segments: List[Dict[str, Any]]
    prompt_version: str = "1.2.9"

    def to_prompt(self, max_segments: int) -> str:
        # Ensure the judge sees any segments explicitly referenced by the enrichment.
        referenced: set[int] = set()
        for t in self.enrichment.get("techniques_used", []) or []:
            if isinstance(t, dict) and isinstance(t.get("segment"), int):
                referenced.add(int(t["segment"]))
        for tp in self.enrichment.get("turn_phases", []) or []:
            if isinstance(tp, dict) and isinstance(tp.get("segment"), int):
                referenced.add(int(tp["segment"]))

        seg_lines: List[str] = []
        head = self.transcript_segments[:max_segments]
        head_ids = {s.get("id") for s in head if isinstance(s.get("id"), int)}
        for s in head:
            seg_id = s.get("id")
            speaker = s.get("speaker_role") or s.get("speaker_id") or "unknown"
            text = (s.get("text") or "").strip()
            seg_lines.append(f"[{seg_id}] {speaker}: {text}")

        missing_refs = sorted([sid for sid in referenced if sid not in head_ids])
        if missing_refs:
            seg_lines.append("")
            seg_lines.append("REFERENCED SEGMENTS (outside cap):")
            by_id = {
                s.get("id"): s
                for s in self.transcript_segments
                if isinstance(s.get("id"), int)
            }
            for sid in missing_refs:
                s = by_id.get(sid)
                if not s:
                    continue
                speaker = s.get("speaker_role") or s.get("speaker_id") or "unknown"
                text = (s.get("text") or "").strip()
                seg_lines.append(f"[{sid}] {speaker}: {text}")

        if len(self.transcript_segments) > max_segments:
            omitted = len(self.transcript_segments) - len(head)
            seg_lines.append(f"... ({omitted} more segments omitted)")

        enrichment_json = json.dumps(self.enrichment, ensure_ascii=False, indent=2)
        taxonomy = {
            "techniques": TECHNIQUE_TAXONOMY,
            "topics": TOPIC_TAXONOMY,
        }

        return f"""You are grading a structured enrichment for a single daygame approach conversation.

VIDEO_ID: {self.video_id}
SOURCE: {self.source}
CONVERSATION_ID: {self.conversation_id}
JUDGE_PROMPT_VERSION: {self.prompt_version}

TAXONOMY (reference only):
{json.dumps(taxonomy, ensure_ascii=False)}

TRANSCRIPT (this conversation only):
{chr(10).join(seg_lines)}

PROPOSED ENRICHMENT (from Stage 07):
{enrichment_json}

PHASE DEFINITIONS (grade using THESE rules; match Stage 07 contract):
- open: approach + initial opener; coach leads; her responses are acknowledgments.
- pre_hook: attraction-building; coach is still leading; teasing/cold reads/story.
- post_hook: she is actively participating (asks questions back, longer responses, initiates topics).
- close: after a close attempt begins: logistics/closing (number/Instagram, proposing plans, instant date, time-bridge),
  PLUS continued rapport while walking/on the instant date (the label is intentionally sticky).
Rules:
- Phases progress forward only: open -> pre_hook -> post_hook -> close (never backwards).
- What counts as starting "close": the first explicit attempt to (a) exchange contact info, (b) propose moving somewhere now
  (instant date), or (c) explicitly invite her to meet/hang out now or later (time-bridge).
  IMPORTANT: Do NOT start close on "fishing" questions alone (including schedule probes like "what are you doing later?") unless the invite is explicit.
- IMPORTANT: For this pipeline, an accepted instant date does NOT create a separate "date" phase. If he proposes an instant date (or other close attempt)
  and she agrees, that still means "close" has started and remains sticky for the rest of the conversation (even if they keep building rapport on the date).
- Once "close" begins, ALL remaining turns should stay "close" even if rapport continues or the first close attempt doesn't land.
- Not all phases are required (blowout can be open only).
- If there is no post_hook, hook_point and investment_level should be null.

STICKY CLOSE CLARIFICATION (most important):
- It is EXPECTED that "close" can contain attraction-building banter, role-play, teasing, and rapport after a contact exchange attempt.
- Do NOT penalize an enrichment for having playful/attraction content inside "close". That's correct under this contract.
- Do NOT require post_hook/hook_point/investment_level after close begins. If close starts before any hook, hook_point and investment_level being null is correct.
- If a close attempt happens early (before any clear hook), it is still correct for the rest of the conversation to remain "close" and for post_hook/hook_point/investment_level to remain null.
- Even if the target becomes highly engaged *after* close begins, that does NOT create a post_hook phase. It remains "close" (sticky) by design.
- If the enrichment correctly tags a close technique (e.g. instagram_close/number_close/instant_date/time_bridge/bounce/logistics_check),
  then it is correct for close to start at that technique's segment and remain sticky. Do not suggest moving close later unless the close technique itself is incorrect.
- When judging whether post_hook/hook_point/investment_level should exist, only consider evidence BEFORE close begins. Engagement after close begins is still "close" and does not imply a missing post_hook.

EXAMPLE (do not penalize):
If coach asks \"What's your Instagram?\" at [100], and then at [105]-[130] they keep joking/talking about tattoos, those turns are still phase \"close\".

SEGMENT REFERENCE TOLERANCE:
- Segment ids are global transcript ids (the numbers in [brackets]).
- If a technique/topic is correct but the cited segment id is off-by-1 (or off-by-2) and the evidence is clearly in an adjacent segment, treat it as a MINOR issue and suggest the corrected segment id.
- If the evidence text is present but the cited segment's speaker_role looks misassigned (diarization error) or the target is clearly quoting the coach, treat it as a MINOR issue (do not mark hallucination for this alone).
- Only mark hallucination_suspected if the enrichment claims content that is not present anywhere in the transcript excerpt.
  IMPORTANT: Do NOT set hallucination_suspected solely due to a high-level description mistake (summary drift). Reserve hallucination for substantive claim drift.

SEVERITY + CATEGORIZATION GUIDELINES:
- Use issue.type that matches the field: technique/topic/phase/summary/other.
- Mark an issue as MAJOR only if it materially harms retrieval usefulness or is clearly wrong (wrong technique, wrong topic, invalid phase order, missing hook/investment when post_hook is present, etc).
- Description-level inaccuracies (e.g., mentioning a number close when none is shown) are usually MINOR unless the description is fundamentally misleading.
- The boundary between open vs pre_hook vs post_hook can be subjective; small boundary disagreements should be MINOR unless they break the monotonic phase order or clearly misrepresent the interaction.

TASK:
1) Judge whether the enrichment is accurate and useful for retrieval (RAG).
2) Find incorrect techniques/topics/phases, hallucinated claims, or missing key info.
3) Score each dimension and give concise actionable feedback.

SCORING (0-5, integers):
- technique_accuracy
- topic_accuracy
- phase_accuracy
- summary_quality
- overall_usefulness

Also provide an overall_score_0_100 (integer).

OUTPUT JSON ONLY with this schema:
{{
  "video_id": "...",
  "source": "...",
  "conversation_id": 1,
  "scores": {{
    "technique_accuracy": 0,
    "topic_accuracy": 0,
    "phase_accuracy": 0,
    "summary_quality": 0,
    "overall_usefulness": 0,
    "overall_score_0_100": 0
  }},
  "flags": {{
    "hallucination_suspected": false,
    "major_errors": false,
    "minor_errors": false
  }},
  "issues": [
    {{"type": "technique"|"topic"|"phase"|"summary"|"other", "severity": "major"|"minor", "message": "..." }}
  ],
  "suggested_fixes": {{
    "techniques_to_add": [],
    "techniques_to_remove": [],
    "topics_to_add": [],
    "topics_to_remove": [],
    "notes": "..."
  }}
}}
"""


def build_requests_from_stage07(
    s07_data: Dict[str, Any],
    source: str,
) -> List[JudgementRequest]:
    video_id = s07_data.get("video_id")
    if not isinstance(video_id, str) or not video_id:
        return []

    segments = s07_data.get("segments", []) or []
    enrichments = s07_data.get("enrichments", []) or []

    conv_segments: Dict[int, List[Dict[str, Any]]] = {}
    for s in segments:
        cid = s.get("conversation_id")
        if isinstance(cid, int) and cid > 0:
            conv_segments.setdefault(cid, []).append(s)

    out: List[JudgementRequest] = []
    for e in enrichments:
        if not isinstance(e, dict) or e.get("type") != "approach":
            continue
        cid = e.get("conversation_id")
        if not isinstance(cid, int) or cid <= 0:
            continue
        segs = sorted(conv_segments.get(cid, []), key=lambda s: s.get("id", 0))
        out.append(JudgementRequest(
            video_id=video_id,
            source=source,
            conversation_id=cid,
            enrichment=e,
            transcript_segments=segs,
        ))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Semantic judge for Stage 07 approach enrichments")
    parser.add_argument("--manifest", help="Manifest file (docs/pipeline/batches/*.txt)")
    parser.add_argument("--source", help="Only judge one source within the manifest")
    parser.add_argument("--video-id", help="Only judge one YouTube video id (11 chars)")
    parser.add_argument("--conversation-id", type=int, help="Only judge one conversation id (within the video)")
    parser.add_argument("--input", help="Single Stage 07 .enriched.json file")
    parser.add_argument("--batch-id", help="Batch id for caching/output directory (defaults to manifest stem)")
    parser.add_argument("--n", type=int, default=5, help="Number of approach conversations to judge")
    parser.add_argument("--seed", type=int, default=1, help="Random seed")
    parser.add_argument(
        "--max-per-video",
        type=int,
        default=1,
        help="Max conversations to judge per video (default: 1 to keep samples diverse)",
    )
    parser.add_argument("--max-segments", type=int, default=200, help="Max transcript segments to include per conversation")
    parser.add_argument("--timeout", type=int, default=300, help="Claude timeout per judgement (seconds)")
    parser.add_argument("--model", help="Claude model alias or full name (e.g. sonnet, opus)")
    parser.add_argument("--no-write", action="store_true", help="Do not write judgement files")

    args = parser.parse_args()

    if not args.manifest and not args.input:
        raise SystemExit("Provide --manifest or --input")
    if isinstance(args.model, str) and args.model.strip():
        print(f"{LOG_PREFIX} Using Claude model: {args.model.strip()}")

    requested_model: Optional[str] = None
    if isinstance(args.model, str) and args.model.strip():
        requested_model = args.model.strip()

    requests: List[JudgementRequest] = []
    batch_id = args.batch_id

    if args.input:
        p = Path(args.input)
        if not p.is_absolute():
            p = repo_root() / p
        s07 = load_json(p)
        if not s07:
            raise SystemExit(f"Could not read Stage 07 file: {p}")
        # Best-effort source from path
        source = p.parent.name
        requests = build_requests_from_stage07(s07, source)
        batch_id = batch_id or p.stem

    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo_root() / manifest_path
        if not manifest_path.exists():
            raise SystemExit(f"Manifest not found: {manifest_path}")

        entries = load_manifest_entries(manifest_path, source_filter=args.source)
        ids = {vid for _, vid, _ in entries}
        source_by_vid = {vid: src for src, vid, _ in entries}

        s07_root = data_root() / "07.content"
        idx_s07 = index_paths_by_video_id(s07_root, "*.enriched.json", ids)

        for vid in sorted(ids):
            candidates = idx_s07.get(vid) or []
            if not candidates:
                continue
            best = pick_best_candidate(candidates, source_by_vid.get(vid))
            s07 = load_json(best)
            if not s07:
                continue
            requests.extend(build_requests_from_stage07(s07, source_by_vid.get(vid, "")))

        batch_id = batch_id or manifest_path.stem

    if not requests:
        raise SystemExit("No approach conversations found to judge")

    # Optional filters (for targeted debugging / regression repro).
    if args.video_id:
        requests = [r for r in requests if r.video_id == args.video_id]
    if args.conversation_id is not None:
        requests = [r for r in requests if r.conversation_id == args.conversation_id]

    if not requests:
        raise SystemExit("No approach conversations matched filters")

    rnd = random.Random(args.seed)
    n = max(1, min(args.n, len(requests)))

    # Sample with optional per-video cap to avoid over-weighting compilation videos.
    shuffled = list(requests)
    rnd.shuffle(shuffled)
    picked: List[JudgementRequest] = []
    per_vid: Dict[str, int] = {}
    max_per_video = max(0, int(args.max_per_video))
    for req in shuffled:
        if len(picked) >= n:
            break
        if max_per_video > 0 and per_vid.get(req.video_id, 0) >= max_per_video:
            continue
        picked.append(req)
        per_vid[req.video_id] = per_vid.get(req.video_id, 0) + 1

    if len(picked) < n:
        # If the cap was too strict for the requested n, fill the remainder without the cap.
        remaining = [r for r in shuffled if r not in picked]
        need = n - len(picked)
        picked.extend(remaining[:need])

    sample = picked

    out_dir = judgement_root(batch_id)
    if not args.no_write:
        out_dir.mkdir(parents=True, exist_ok=True)

    judged = 0
    scores: List[int] = []

    for req in sample:
        prompt = req.to_prompt(max_segments=args.max_segments)
        request_fingerprint = stable_hash({
            "video_id": req.video_id,
            "source": req.source,
            "conversation_id": req.conversation_id,
            "enrichment": req.enrichment,
            "transcript_segments": [s.get("id") for s in req.transcript_segments],
            "prompt_version": req.prompt_version,
            "max_segments": args.max_segments,
        })

        out_path = out_dir / f"{req.video_id}.conv{req.conversation_id}.judge.json"
        if out_path.exists():
            existing = load_json(out_path)
            if existing and existing.get("request_fingerprint") == request_fingerprint:
                # If the caller specifies a model, don't reuse cached results from a different
                # model (or from an unknown prior run where we didn't record the model).
                existing_model: Optional[str] = None
                judge_meta = existing.get("judge")
                if isinstance(judge_meta, dict):
                    m = judge_meta.get("model")
                    if isinstance(m, str) and m.strip():
                        existing_model = m.strip()
                if requested_model is not None and existing_model != requested_model:
                    existing = None  # Treat as cache miss; we'll re-judge below.
                else:
                    print(f"{LOG_PREFIX} Cache hit: {out_path.name}")
                    # Backfill request metadata without re-judging.
                    if not args.no_write:
                        req_meta = existing.get("request")
                        if not isinstance(req_meta, dict):
                            existing["request"] = {
                                "prompt_version": req.prompt_version,
                                "model": requested_model,
                                "max_segments": args.max_segments,
                                "transcript_segment_ids": [
                                    s.get("id") for s in req.transcript_segments if isinstance(s.get("id"), int)
                                ],
                            }
                            out_path.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
                    judged += 1
                    try:
                        scores.append(int(existing.get("scores", {}).get("overall_score_0_100", 0)))
                    except Exception:
                        pass
                    continue

        print(f"{LOG_PREFIX} Judging {req.video_id} conv {req.conversation_id} ({len(req.transcript_segments)} segs)...")
        raw = call_claude(prompt, timeout=args.timeout, model=requested_model)
        parsed = parse_json_object(raw or "")
        if not parsed:
            print(f"{LOG_PREFIX} WARNING: Could not parse judge JSON (skipping)", file=sys.stderr)
            continue

        # Attach metadata for caching/audit
        parsed["request_fingerprint"] = request_fingerprint
        parsed["request"] = {
            "prompt_version": req.prompt_version,
            "model": requested_model,
            "max_segments": args.max_segments,
            "transcript_segment_ids": [
                s.get("id") for s in req.transcript_segments if isinstance(s.get("id"), int)
            ],
        }
        parsed["judged_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        parsed["judge"] = {
            "tool": "claude-cli",
            "model": requested_model,
            "timeout_sec": args.timeout,
            "seed": args.seed,
        }

        overall = 0
        try:
            overall = int(parsed.get("scores", {}).get("overall_score_0_100", 0))
            scores.append(overall)
        except Exception:
            overall = 0

        flags = parsed.get("flags", {}) if isinstance(parsed.get("flags"), dict) else {}
        major = sum(
            1
            for it in (parsed.get("issues", []) or [])
            if isinstance(it, dict) and it.get("severity") == "major"
        )
        minor = sum(
            1
            for it in (parsed.get("issues", []) or [])
            if isinstance(it, dict) and it.get("severity") == "minor"
        )
        print(
            f"{LOG_PREFIX}   Score={overall:3d} "
            f"flags={{major_errors={bool(flags.get('major_errors'))}, hallucination={bool(flags.get('hallucination_suspected'))}}} "
            f"issues={{major={major}, minor={minor}}}"
        )

        if not args.no_write:
            out_path.write_text(json.dumps(parsed, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"{LOG_PREFIX} Wrote: {out_path}")
        judged += 1

    if judged == 0:
        raise SystemExit("No judgements produced")

    if scores:
        mean_score = sum(scores) / len(scores)
        print(f"{LOG_PREFIX} Done: judged={judged}, mean_overall_score={mean_score:.1f}")
    else:
        print(f"{LOG_PREFIX} Done: judged={judged}")


if __name__ == "__main__":
    main()
