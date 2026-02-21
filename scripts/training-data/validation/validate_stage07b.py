#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_stage07b.py

Validate Stage 07b enrichment verification artifacts at manifest scope.

This validator emits canonical issue rows:
  - blocking rows (`gate_decision=block`) for missing/invalid outputs or 07b block decisions
  - review rows (`gate_decision=review`) for 07b review decisions

JSON output is intended for quarantine extraction via batch/quarantine_updater.py.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import jsonschema  # type: ignore
except Exception:  # pragma: no cover
    jsonschema = None


LOG_PREFIX = "[validate-stage07b]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
BRACKET_VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_schema() -> Optional[Dict[str, Any]]:
    schema_path = repo_root() / "scripts" / "training-data" / "schemas" / "07b.enrichment-verify.schema.json"
    if not schema_path.exists():
        return None
    try:
        data = json.loads(schema_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = BRACKET_VIDEO_ID_RE.search(text or "")
    if not m:
        return None
    vid = m.group(1)
    return vid if VIDEO_ID_RE.fullmatch(vid) else None


def _load_manifest_entries(manifest_path: Path, source: Optional[str]) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        src = parts[0].strip()
        folder = parts[1].strip()
        if source and src != source:
            continue
        vid = _extract_video_id_from_text(folder)
        if not vid:
            continue
        out.append((src, vid))
    return out


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _load_quarantine_ids(path: Path) -> Set[str]:
    payload = _load_json(path)
    if not isinstance(payload, dict):
        return set()
    ids: Set[str] = set()
    for key in ("quarantined_video_ids", "video_ids"):
        raw = payload.get(key)
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, str):
                    vid = item.strip()
                    if VIDEO_ID_RE.fullmatch(vid):
                        ids.add(vid)
    videos = payload.get("videos")
    if isinstance(videos, list):
        for row in videos:
            if not isinstance(row, dict):
                continue
            raw_vid = row.get("video_id")
            if isinstance(raw_vid, str):
                vid = raw_vid.strip()
                if VIDEO_ID_RE.fullmatch(vid):
                    ids.add(vid)
    return ids


def _index_stage07b_files(stage_root: Path, manifest_ids: Set[str]) -> Dict[str, List[Path]]:
    out: Dict[str, List[Path]] = {}
    if not stage_root.exists():
        return out
    for path in stage_root.rglob("*.enrichment-verify.json"):
        text_vid = _extract_video_id_from_text(str(path))
        payload_vid: Optional[str] = None
        if not text_vid:
            payload = _load_json(path)
            if isinstance(payload, dict):
                raw_vid = payload.get("video_id")
                if isinstance(raw_vid, str) and VIDEO_ID_RE.fullmatch(raw_vid.strip()):
                    payload_vid = raw_vid.strip()
        vid = text_vid or payload_vid
        if not vid or vid not in manifest_ids:
            continue
        out.setdefault(vid, []).append(path)
    return out


def _pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(path: Path) -> Tuple[int, int, str]:
        source_bonus = 1 if (preferred_source and preferred_source in path.parts) else 0
        depth = len(path.parts)
        return (source_bonus, depth, str(path))

    return sorted(candidates, key=rank, reverse=True)[0]


def _validate_schema(payload: Dict[str, Any], schema: Optional[Dict[str, Any]]) -> bool:
    if schema is None or jsonschema is None:
        return True
    try:
        jsonschema.validate(instance=payload, schema=schema)
        return True
    except Exception:
        return False


def _canonical_issue(
    *,
    video_id: str,
    source: str,
    issue_code: str,
    issue_severity: str,
    gate_decision: str,
    signal_class: str,
    remediation_path: str,
    message: str,
    artifact: Optional[str] = None,
) -> Dict[str, Any]:
    row: Dict[str, Any] = {
        "video_id": video_id,
        "source": source,
        "issue_code": issue_code,
        "issue_severity": issue_severity,
        "gate_decision": gate_decision,
        "signal_class": signal_class,
        "remediation_path": remediation_path,
        "message": message,
    }
    if artifact:
        row["stage07b"] = artifact
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Stage 07b enrichment-verify artifacts")
    parser.add_argument("--manifest", required=True, help="Manifest file path")
    parser.add_argument("--source", help="Source filter within manifest")
    parser.add_argument("--quarantine-file", help="Quarantine JSON path to exclude pre-quarantined videos")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        print(f"{LOG_PREFIX} ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
        sys.exit(2)

    entries = _load_manifest_entries(manifest_path, args.source)
    if not entries:
        print(f"{LOG_PREFIX} No manifest entries in scope: {manifest_path}")
        sys.exit(0)

    manifest_ids = {vid for _, vid in entries}
    source_by_vid = {vid: src for src, vid in entries}

    quarantine_ids: Set[str] = set()
    if args.quarantine_file:
        quarantine_path = Path(args.quarantine_file)
        if not quarantine_path.is_absolute():
            quarantine_path = repo_root() / quarantine_path
        if quarantine_path.exists():
            quarantine_ids = _load_quarantine_ids(quarantine_path)
        else:
            print(f"{LOG_PREFIX} WARNING: quarantine file not found (ignoring): {quarantine_path}")

    effective_ids = sorted(vid for vid in manifest_ids if vid not in quarantine_ids)
    stage_root = repo_root() / "data" / "07b.LLM.enrichment-verify"
    idx = _index_stage07b_files(stage_root, manifest_ids)
    schema = _load_schema()

    issues: List[Dict[str, Any]] = []
    checked_files = 0
    unreadable_files = 0
    invalid_files = 0
    blocked_videos = 0
    review_videos = 0
    pass_videos = 0

    for vid in effective_ids:
        src = source_by_vid.get(vid, args.source or "all")
        candidates = idx.get(vid) or []
        path = _pick_best_candidate(candidates, src) if candidates else None
        if not path:
            issues.append(
                _canonical_issue(
                    video_id=vid,
                    source=src,
                    issue_code="missing_stage07b_output",
                    issue_severity="critical",
                    gate_decision="block",
                    signal_class="artifact_contract",
                    remediation_path="contract_repair",
                    message="Missing Stage 07b enrichment-verify artifact for this video",
                )
            )
            blocked_videos += 1
            continue

        checked_files += 1
        payload = _load_json(path)
        if not payload:
            unreadable_files += 1
            blocked_videos += 1
            issues.append(
                _canonical_issue(
                    video_id=vid,
                    source=src,
                    issue_code="unreadable_stage07b_output",
                    issue_severity="critical",
                    gate_decision="block",
                    signal_class="artifact_contract",
                    remediation_path="contract_repair",
                    message="Stage 07b artifact is unreadable or not JSON",
                    artifact=str(path),
                )
            )
            continue

        if not _validate_schema(payload, schema):
            invalid_files += 1
            blocked_videos += 1
            issues.append(
                _canonical_issue(
                    video_id=vid,
                    source=src,
                    issue_code="invalid_stage07b_schema",
                    issue_severity="critical",
                    gate_decision="block",
                    signal_class="artifact_contract",
                    remediation_path="contract_repair",
                    message="Stage 07b artifact failed schema validation",
                    artifact=str(path),
                )
            )
            continue

        gate = str(payload.get("gate_decision", "")).strip().lower()
        reason = str(payload.get("reason_code", "")).strip()
        if gate == "block":
            blocked_videos += 1
            issues.append(
                _canonical_issue(
                    video_id=vid,
                    source=src,
                    issue_code="stage07b_gate_block",
                    issue_severity="major",
                    gate_decision="block",
                    signal_class="other_quality",
                    remediation_path="manual_review",
                    message=f"Stage 07b gate decision is block ({reason or 'blocking_issue_detected'})",
                    artifact=str(path),
                )
            )
        elif gate == "review":
            review_videos += 1
            issues.append(
                _canonical_issue(
                    video_id=vid,
                    source=src,
                    issue_code="stage07b_gate_review",
                    issue_severity="minor",
                    gate_decision="review",
                    signal_class="other_quality",
                    remediation_path="manual_review",
                    message=f"Stage 07b gate decision is review ({reason or 'review_required'})",
                    artifact=str(path),
                )
            )
        else:
            pass_videos += 1

    errors = sum(1 for i in issues if str(i.get("issue_severity")) in {"critical", "major"})
    warnings = sum(1 for i in issues if str(i.get("issue_severity")) == "minor")
    summary = {
        "manifest": str(manifest_path),
        "source_filter": args.source or None,
        "manifest_videos": len(manifest_ids),
        "effective_videos": len(effective_ids),
        "checked_files": checked_files,
        "unreadable_files": unreadable_files,
        "invalid_files": invalid_files,
        "pass_videos": pass_videos,
        "review_videos": review_videos,
        "blocked_videos": blocked_videos,
        "errors": errors,
        "warnings": warnings,
        "total_checks": len(issues),
    }
    payload = {"summary": summary, "issues": issues}

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(f"{LOG_PREFIX} Manifest: {manifest_path}")
        print(
            f"{LOG_PREFIX} Videos: manifest={len(manifest_ids)}, effective={len(effective_ids)}, "
            f"checked={checked_files}"
        )
        print(
            f"{LOG_PREFIX} Stage07b gates: pass={pass_videos}, review={review_videos}, block={blocked_videos}"
        )
        print(f"{LOG_PREFIX} Issues: errors={errors}, warnings={warnings}")


if __name__ == "__main__":
    main()
