#!/usr/bin/env python3
"""
Audit sub-batches for reusable stage outputs before rerunning LLM stages.

This script combines:
  1) strict contract completeness from `sub-batch-ops --status`
  2) stage file metadata (pipeline version / prompt version / model)

Primary use case: map which sub-batches can reuse later stages vs need reruns.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[3]
TRAINING_SCRIPTS_ROOT = REPO_ROOT / "scripts" / "training-data"

if str(TRAINING_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(TRAINING_SCRIPTS_ROOT))

try:
    from batch.manifest_parser import load_manifest  # type: ignore
except Exception:  # pragma: no cover
    load_manifest = None  # type: ignore


STATUS_STAGE_RE = re.compile(r"Stage\s+([0-9]{2}[a-z]?):\s+(\d+)/(\d+)")
SUBBATCH_RE = re.compile(r"^P(\d+)\.(\d+)$")
VIDEO_ID_BRACKET_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")
CHUNKS_ID_RE = re.compile(r"([A-Za-z0-9_-]{11})\.chunks\.json$")


LLM_STAGE_ORDER = ["06b", "06e", "06g", "07", "07b"]


@dataclass(frozen=True)
class StageDef:
    code: str
    root: Path
    suffix: str
    excludes: Tuple[str, ...] = ()


STAGE_DEFS: List[StageDef] = [
    StageDef("06b", REPO_ROOT / "data" / "06b.LLM.verify", ".verification.json"),
    StageDef("06e", REPO_ROOT / "data" / "06e.LLM.quality-check", ".quality-check.json"),
    StageDef("06g", REPO_ROOT / "data" / "06g.LLM.damage-adjudicator", ".damage-adjudication.json"),
    StageDef("07", REPO_ROOT / "data" / "07.LLM.content", ".enriched.json", excludes=(".enriched.validation.json",)),
    StageDef("07b", REPO_ROOT / "data" / "07b.LLM.enrichment-verify", ".enrichment-verify.json"),
    StageDef("09", REPO_ROOT / "data" / "09.EXT.chunks", ".chunks.json"),
]


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--start", required=True, help="Start sub-batch id, e.g. P001.4")
    ap.add_argument("--end", required=True, help="End sub-batch id, e.g. P002.8")
    ap.add_argument(
        "--manifest-dir",
        default=str(REPO_ROOT / "docs" / "pipeline" / "batches"),
        help="Directory containing sub-batch manifests",
    )
    ap.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: data/validation/runs/<start>-<end>.stage-reuse-audit.json)",
    )
    ap.add_argument(
        "--status-timeout-seconds",
        type=int,
        default=60,
        help="Timeout for each sub-batch status call",
    )
    return ap.parse_args()


def subbatch_sort_key(sid: str) -> Tuple[int, int]:
    m = SUBBATCH_RE.match(sid)
    if not m:
        return (10**9, 10**9)
    return (int(m.group(1)), int(m.group(2)))


def load_subbatch_ids_in_range(manifest_dir: Path, start: str, end: str) -> List[str]:
    start_key = subbatch_sort_key(start)
    end_key = subbatch_sort_key(end)
    if start_key > end_key:
        raise ValueError(f"start > end: {start} > {end}")
    ids: List[str] = []
    for p in sorted(manifest_dir.glob("P*.txt")):
        sid = p.stem
        key = subbatch_sort_key(sid)
        if start_key <= key <= end_key:
            ids.append(sid)
    return ids


def read_manifest_video_ids(manifest_path: Path) -> List[str]:
    if load_manifest is not None:
        return sorted(load_manifest(manifest_path))
    ids: List[str] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = VIDEO_ID_BRACKET_RE.search(line)
        if m:
            ids.append(m.group(1))
    return sorted(set(ids))


def parse_status_output(text: str) -> Dict[str, Any]:
    stages: Dict[str, Dict[str, Any]] = {}
    total_videos: Optional[int] = None
    for line in text.splitlines():
        if "Status (" in line and "videos" in line:
            m = re.search(r"\((\d+)\s+videos\)", line)
            if m:
                total_videos = int(m.group(1))
        m = STATUS_STAGE_RE.search(line)
        if not m:
            continue
        code = m.group(1)
        done = int(m.group(2))
        total = int(m.group(3))
        stages[code] = {
            "done": done,
            "total": total,
            "complete": (done == total),
            "partial": (0 < done < total),
        }
    overall = None
    m_overall = re.search(r"Overall status:\s+(\S+)", text)
    if m_overall:
        overall = m_overall.group(1)
    return {"total_videos": total_videos, "overall_status": overall, "stages": stages, "raw_text": text}


def run_subbatch_status(sid: str, timeout_seconds: int) -> Dict[str, Any]:
    cmd = [str(REPO_ROOT / "scripts" / "training-data" / "batch" / "sub-batch-ops"), sid, "--status"]
    proc = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    out = proc.stdout or ""
    err = proc.stderr or ""
    parsed = parse_status_output(out)
    parsed["command"] = cmd
    parsed["returncode"] = proc.returncode
    if err.strip():
        parsed["stderr"] = err
    return parsed


def extract_video_id_from_path(path: Path) -> Optional[str]:
    if path.suffix == ".json":
        m = CHUNKS_ID_RE.search(path.name)
        if m:
            return m.group(1)
    for part in path.parts[::-1]:
        m = VIDEO_ID_BRACKET_RE.search(part)
        if m:
            return m.group(1)
    return None


def read_json_dict(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def pick(obj: Any, *keys: str) -> Any:
    cur = obj
    for key in keys:
        if not isinstance(cur, dict) or key not in cur:
            return None
        cur = cur[key]
    return cur


def normalize_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, str):
        s = value.strip()
        return s or None
    return None


def extract_stage_metadata(stage: str, path: Path, data: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    out: Dict[str, Optional[str]] = {
        "pipeline_version": None,
        "prompt_version": None,
        "model": None,
        "embedding_model": None,
        "format_version": None,
    }
    if data:
        out["pipeline_version"] = normalize_value(data.get("pipeline_version"))
        out["prompt_version"] = normalize_value(data.get("prompt_version"))
        out["model"] = normalize_value(data.get("model"))
        out["format_version"] = normalize_value(data.get("version"))
        out["embedding_model"] = normalize_value(data.get("embeddingModel"))

    if stage == "06b" and data:
        out["model"] = out["model"] or normalize_value(pick(data, "metadata", "model"))
        out["model"] = out["model"] or normalize_value(pick(data, "metadata", "llm_model"))
    elif stage == "07" and data:
        out["model"] = out["model"] or normalize_value(pick(data, "metadata", "model"))
    elif stage == "07b" and data:
        out["prompt_version"] = out["prompt_version"] or normalize_value(pick(data, "inputs", "enriched", "prompt_version"))
        out["model"] = out["model"] or normalize_value(pick(data, "inputs", "llm", "model"))
    elif stage == "09" and data:
        out["embedding_model"] = out["embedding_model"] or normalize_value(data.get("embeddingModel"))
        out["format_version"] = out["format_version"] or normalize_value(data.get("version"))

    return out


def build_stage_index(stage_def: StageDef) -> Dict[str, List[Dict[str, Any]]]:
    out: Dict[str, List[Dict[str, Any]]] = {}
    if not stage_def.root.exists():
        return out
    for path in stage_def.root.rglob(f"*{stage_def.suffix}"):
        if not path.is_file():
            continue
        if any(path.name.endswith(ex) for ex in stage_def.excludes):
            continue
        vid = extract_video_id_from_path(path)
        data: Optional[Dict[str, Any]] = None
        if vid is None or stage_def.code in {"07", "07b", "06b", "06e", "06g", "09"}:
            data = read_json_dict(path)
            if vid is None and isinstance(data, dict):
                vid = normalize_value(data.get("video_id")) or normalize_value(data.get("videoId"))
        if not vid:
            continue
        stat = path.stat()
        record = {
            "path": str(path.relative_to(REPO_ROOT)),
            "mtime": int(stat.st_mtime),
            "size": stat.st_size,
        }
        record.update(extract_stage_metadata(stage_def.code, path, data))
        out.setdefault(vid, []).append(record)
    return out


def choose_latest(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    return max(records, key=lambda r: (int(r.get("mtime", 0)), int(r.get("size", 0))))


def summarize_stage_for_manifest(
    stage_def: StageDef,
    manifest_ids: Iterable[str],
    index: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    manifest_ids = list(manifest_ids)
    present_records: Dict[str, Dict[str, Any]] = {}
    for vid in manifest_ids:
        recs = index.get(vid) or []
        if recs:
            present_records[vid] = choose_latest(recs)
    missing_ids = [vid for vid in manifest_ids if vid not in present_records]

    counters = {
        "pipeline_versions": Counter(),
        "prompt_versions": Counter(),
        "models": Counter(),
        "embedding_models": Counter(),
        "format_versions": Counter(),
    }
    for rec in present_records.values():
        if rec.get("pipeline_version"):
            counters["pipeline_versions"][str(rec["pipeline_version"])] += 1
        if rec.get("prompt_version"):
            counters["prompt_versions"][str(rec["prompt_version"])] += 1
        if rec.get("model"):
            counters["models"][str(rec["model"])] += 1
        if rec.get("embedding_model"):
            counters["embedding_models"][str(rec["embedding_model"])] += 1
        if rec.get("format_version"):
            counters["format_versions"][str(rec["format_version"])] += 1

    return {
        "files_present_for_manifest_videos": len(present_records),
        "missing_videos_count": len(missing_ids),
        "missing_video_ids": missing_ids,
        "latest_records_by_video_id": present_records,
        "pipeline_versions": dict(counters["pipeline_versions"]),
        "prompt_versions": dict(counters["prompt_versions"]),
        "models": dict(counters["models"]),
        "embedding_models": dict(counters["embedding_models"]),
        "format_versions": dict(counters["format_versions"]),
    }


def parse_constant_from_script(path: Path, name: str) -> Optional[str]:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    m = re.search(rf"^{re.escape(name)}\s*=\s*['\"]([^'\"]+)['\"]", text, flags=re.MULTILINE)
    return m.group(1) if m else None


def stage_order_index(stage: Optional[str]) -> int:
    if stage is None:
        return 10**9
    try:
        return LLM_STAGE_ORDER.index(stage)
    except ValueError:
        return 10**9


def earlier_stage(a: Optional[str], b: Optional[str]) -> Optional[str]:
    if a is None:
        return b
    if b is None:
        return a
    return a if stage_order_index(a) <= stage_order_index(b) else b


def first_incomplete_llm_stage(status: Dict[str, Any], total_videos: int) -> Optional[str]:
    stages = status.get("stages", {})
    for code in LLM_STAGE_ORDER:
        entry = stages.get(code)
        if not entry:
            return code
        if int(entry.get("done", 0)) < total_videos:
            return code
    return None


def determine_version_requirements(
    *,
    total_videos: int,
    status: Dict[str, Any],
    stage_meta: Dict[str, Dict[str, Any]],
    current_07_prompt_version: Optional[str],
    current_07b_pipeline_version: Optional[str],
) -> Dict[str, Any]:
    required_from: Optional[str] = None
    reasons: List[str] = []

    stage07_status = status.get("stages", {}).get("07", {})
    stage07_meta = stage_meta.get("07", {})
    if (
        current_07_prompt_version
        and stage07_status
        and int(stage07_status.get("done", 0)) == total_videos
        and stage07_meta.get("files_present_for_manifest_videos", 0) == total_videos
    ):
        prompt_versions = stage07_meta.get("prompt_versions", {}) or {}
        non_current = {
            ver: n
            for ver, n in prompt_versions.items()
            if ver and ver != current_07_prompt_version
        }
        missing_prompt_count = sum(
            1
            for rec in (stage07_meta.get("latest_records_by_video_id", {}) or {}).values()
            if not rec.get("prompt_version")
        )
        if non_current or missing_prompt_count:
            required_from = earlier_stage(required_from, "07")
            if non_current:
                reasons.append(f"07.prompt_version_mismatch:{non_current}!=current:{current_07_prompt_version}")
            if missing_prompt_count:
                reasons.append(f"07.prompt_version_missing:{missing_prompt_count}")

    stage07b_status = status.get("stages", {}).get("07b", {})
    stage07b_meta = stage_meta.get("07b", {})
    if (
        current_07b_pipeline_version
        and stage07b_status
        and int(stage07b_status.get("done", 0)) == total_videos
        and stage07b_meta.get("files_present_for_manifest_videos", 0) == total_videos
    ):
        versions = stage07b_meta.get("pipeline_versions", {}) or {}
        non_current = {
            ver: n
            for ver, n in versions.items()
            if ver and ver != current_07b_pipeline_version
        }
        missing_version_count = sum(
            1
            for rec in (stage07b_meta.get("latest_records_by_video_id", {}) or {}).values()
            if not rec.get("pipeline_version")
        )
        if non_current or missing_version_count:
            required_from = earlier_stage(required_from, "07b")
            if non_current:
                reasons.append(
                    f"07b.pipeline_version_mismatch:{non_current}!=current:{current_07b_pipeline_version}"
                )
            if missing_version_count:
                reasons.append(f"07b.pipeline_version_missing:{missing_version_count}")

    return {"required_rerun_from_stage": required_from, "reasons": reasons}


def make_compact_stage_completion(status: Dict[str, Any]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for code in ["06b", "06e", "06g", "07", "07b", "09"]:
        entry = (status.get("stages", {}) or {}).get(code)
        if not entry:
            out[code] = "missing"
            continue
        done = int(entry.get("done", 0))
        total = int(entry.get("total", 0))
        if total > 0 and done == total:
            out[code] = "complete"
        elif done > 0:
            out[code] = f"partial:{done}/{total}"
        else:
            out[code] = f"missing:{done}/{total}"
    return out


def build_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    strict_counts = Counter()
    prompt_counts = Counter()
    for item in results:
        strict_counts[item.get("recommended_rerun_from_stage_strict") or "none"] += 1
        prompt_counts[item.get("recommended_rerun_from_stage_prompt_aware") or "none"] += 1
    return {
        "sub_batches": len(results),
        "recommended_rerun_from_stage_strict": dict(strict_counts),
        "recommended_rerun_from_stage_prompt_aware": dict(prompt_counts),
    }


def main() -> int:
    args = parse_args()
    manifest_dir = Path(args.manifest_dir)
    if not manifest_dir.exists():
        print(f"ERROR: manifest dir not found: {manifest_dir}", file=sys.stderr)
        return 2

    subbatch_ids = load_subbatch_ids_in_range(manifest_dir, args.start, args.end)
    if not subbatch_ids:
        print("ERROR: no sub-batch manifests in requested range", file=sys.stderr)
        return 2

    current_versions = {
        "07_prompt_version": parse_constant_from_script(REPO_ROOT / "scripts" / "training-data" / "07.LLM.content", "PROMPT_VERSION"),
        "07b_pipeline_version": parse_constant_from_script(
            REPO_ROOT / "scripts" / "training-data" / "07b.LLM.enrichment-verify", "PIPELINE_VERSION"
        ),
    }

    stage_indexes: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for stage_def in STAGE_DEFS:
        stage_indexes[stage_def.code] = build_stage_index(stage_def)

    results: List[Dict[str, Any]] = []
    for sid in subbatch_ids:
        manifest_path = manifest_dir / f"{sid}.txt"
        ids = read_manifest_video_ids(manifest_path)
        status = run_subbatch_status(sid, args.status_timeout_seconds)
        total_videos = int(status.get("total_videos") or len(ids))

        stage_meta = {
            stage_def.code: summarize_stage_for_manifest(stage_def, ids, stage_indexes.get(stage_def.code, {}))
            for stage_def in STAGE_DEFS
        }
        strict_from = first_incomplete_llm_stage(status, total_videos)
        version_req = determine_version_requirements(
            total_videos=total_videos,
            status=status,
            stage_meta=stage_meta,
            current_07_prompt_version=current_versions.get("07_prompt_version"),
            current_07b_pipeline_version=current_versions.get("07b_pipeline_version"),
        )
        prompt_aware_from = earlier_stage(strict_from, version_req["required_rerun_from_stage"])

        results.append(
            {
                "sub_batch_id": sid,
                "manifest_path": str(manifest_path.relative_to(REPO_ROOT)),
                "video_count": len(ids),
                "video_ids": ids,
                "status": {
                    "returncode": status.get("returncode"),
                    "overall_status": status.get("overall_status"),
                    "total_videos": status.get("total_videos"),
                    "stages": status.get("stages"),
                    "stage_completion_compact": make_compact_stage_completion(status),
                },
                "stage_metadata": stage_meta,
                "recommended_rerun_from_stage_strict": strict_from,
                "recommended_rerun_from_stage_prompt_aware": prompt_aware_from,
                "version_requirements": version_req,
            }
        )

    output_path = (
        Path(args.output)
        if args.output
        else (REPO_ROOT / "data" / "validation" / "runs" / f"{args.start}-{args.end}.stage-reuse-audit.json")
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at_epoch": int(os.times().elapsed) if hasattr(os, "times") else None,
        "range": {"start": args.start, "end": args.end},
        "current_versions": current_versions,
        "stage_definitions": [
            {"code": d.code, "root": str(d.root.relative_to(REPO_ROOT)), "suffix": d.suffix, "excludes": list(d.excludes)}
            for d in STAGE_DEFS
        ],
        "summary": build_summary(results),
        "results": results,
    }
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output_path.relative_to(REPO_ROOT))
    print(json.dumps(payload["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
