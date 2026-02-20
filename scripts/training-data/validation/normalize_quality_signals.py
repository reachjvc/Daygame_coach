#!/usr/bin/env python3
"""
scripts/training-data/validation/normalize_quality_signals.py

Normalize canonical validation/gating payloads into a consistent signal envelope.

Input payload formats supported:
- validate_cross_stage / validate_chunks JSON with "results" or "issues".
- stage-report-like JSON with "checks".
- ad-hoc list of issue objects.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

LOG_PREFIX = "[normalize-signals]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
SNAKE_RE = re.compile(r"[^a-z0-9_]+")


def _safe_issue_code(raw: Optional[str]) -> str:
    if not raw:
        return "unspecified_issue"
    norm = SNAKE_RE.sub("_", raw.strip().lower()).strip("_")
    return norm or "unspecified_issue"


def _severity_to_canonical(row: Dict[str, Any]) -> str:
    canonical = str(row.get("issue_severity", "")).strip().lower()
    if canonical in {"critical", "major", "minor", "info"}:
        return canonical

    gate = str(row.get("gate_decision", "")).strip().lower()
    if gate == "block":
        return "major"
    if gate == "review":
        return "minor"
    if gate == "pass":
        return "info"
    return "info"


def _gate_to_canonical(row: Dict[str, Any], severity: str) -> str:
    canonical = str(row.get("gate_decision", "")).strip().lower()
    if canonical in {"pass", "review", "block"}:
        return canonical

    if severity in {"critical", "major"}:
        return "block"
    if severity == "minor":
        return "review"
    return "pass"


def _extract_video_id(row: Dict[str, Any]) -> Optional[str]:
    candidates: List[Any] = [row.get("video_id")]
    scope = row.get("scope")
    if isinstance(scope, dict):
        candidates.append(scope.get("video_id"))
    for value in candidates:
        if isinstance(value, str):
            vid = value.strip()
            if VIDEO_ID_RE.fullmatch(vid):
                return vid
    return None


def _scope_type(row: Dict[str, Any]) -> str:
    scope = str(row.get("scope_type", "")).strip().lower()
    if scope in {"segment", "conversation", "video", "batch"}:
        return scope
    return "video" if _extract_video_id(row) else "batch"


def _scope_id(row: Dict[str, Any], scope_type: str) -> Optional[Any]:
    if scope_type == "video":
        return _extract_video_id(row)
    raw = row.get("scope_id")
    if raw is None:
        return None
    if isinstance(raw, (str, int)):
        return raw
    return None


def _message(row: Dict[str, Any]) -> str:
    for key in ("message", "reasoning", "detail", "description"):
        raw = row.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    check = row.get("check") or row.get("issue_code") or "unknown"
    return f"Normalized issue: {check}"


def _origin_stage(row: Dict[str, Any], default_stage: str) -> str:
    raw = row.get("origin_stage") or row.get("stage") or default_stage
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return default_stage


def _iter_rows(payload: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                yield item
        return
    if not isinstance(payload, dict):
        return

    for key in ("results", "issues", "checks", "signals"):
        raw = payload.get(key)
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, dict):
                    yield item

    videos = payload.get("videos")
    if isinstance(videos, list):
        for video_row in videos:
            if not isinstance(video_row, dict):
                continue
            gate = video_row.get("gate_decision")
            issue_code = video_row.get("issue_code") or "video_gate_decision"
            if isinstance(gate, str):
                synthesized = dict(video_row)
                synthesized.setdefault("issue_code", issue_code)
                synthesized.setdefault(
                    "message",
                    f"Gate decision for video is {gate.strip().lower()}",
                )
                yield synthesized


def normalize_payload(payload: Any, default_stage: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for row in _iter_rows(payload):
        raw_issue_code = row.get("issue_code")
        if not isinstance(raw_issue_code, str) or not raw_issue_code.strip():
            # Canonical-only mode: ignore rows that do not provide issue_code.
            continue
        severity = _severity_to_canonical(row)
        gate_decision = _gate_to_canonical(row, severity)
        scope_type = _scope_type(row)
        normalized = {
            "issue_code": _safe_issue_code(raw_issue_code),
            "issue_severity": severity,
            "gate_decision": gate_decision,
            "scope_type": scope_type,
            "scope_id": _scope_id(row, scope_type),
            "video_id": _extract_video_id(row),
            "origin_stage": _origin_stage(row, default_stage),
            "message": _message(row),
        }
        out.append(normalized)
    return out


def _summary(signals: List[Dict[str, Any]]) -> Dict[str, int]:
    out = {
        "total_signals": len(signals),
        "pass": 0,
        "review": 0,
        "block": 0,
    }
    for s in signals:
        decision = s.get("gate_decision")
        if decision in out:
            out[str(decision)] += 1
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize canonical quality signals to a consistent signal envelope.")
    parser.add_argument("--input", help="Input JSON file path (defaults to stdin).")
    parser.add_argument("--output", help="Output JSON file path (defaults to stdout).")
    parser.add_argument("--stage", default="unknown", help="Default origin_stage when absent.")
    args = parser.parse_args()

    if args.input:
        in_path = Path(args.input)
        if not in_path.exists():
            print(f"{LOG_PREFIX} ERROR: Input file not found: {in_path}", file=sys.stderr)
            sys.exit(2)
        try:
            payload = json.loads(in_path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"{LOG_PREFIX} ERROR: Could not parse input JSON: {exc}", file=sys.stderr)
            sys.exit(2)
    else:
        try:
            payload = json.load(sys.stdin)
        except Exception as exc:
            print(f"{LOG_PREFIX} ERROR: Could not parse stdin JSON: {exc}", file=sys.stderr)
            sys.exit(2)

    signals = normalize_payload(payload, default_stage=args.stage)
    out = {
        "version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "default_stage": args.stage,
        "summary": _summary(signals),
        "signals": signals,
    }

    serialized = json.dumps(out, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(serialized, encoding="utf-8")
        print(f"{LOG_PREFIX} Wrote normalized signals: {out_path}")
    else:
        sys.stdout.write(serialized)


if __name__ == "__main__":
    main()
