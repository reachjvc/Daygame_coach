#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_manifest.py

Manifest/sub-batch validation harness (read-only).

Given a batch/sub-batch manifest (docs/pipeline/batches/*.txt), this script:
  - Checks 06b.LLM.verify coverage + verdict distribution
  - Checks presence of 06c.DET.patched and 07.LLM.content artifacts for each video
  - Runs cross-stage validation (06/06c vs 07) for all available pairs

This is intended to be the "one command" sanity check after running LLM stages.
It does not call the LLM. By default it is read-only; optional stage-report emission
(`--emit-stage-reports`) writes validation report artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, DefaultDict, Dict, Iterable, List, Optional, Set, Tuple

import validate_cross_stage

LOG_PREFIX = "[manifest-validate]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_CHUNKS_BASENAME_VIDEO_ID_RE = re.compile(r"^([A-Za-z0-9_-]{11})\.chunks\.json$")
_WAIVER_VIDEO_OR_WILDCARD_RE = re.compile(r"^(\*|[A-Za-z0-9_-]{11})$")
_STABLE_SOURCE_KEY_RE = re.compile(r".+[\\/][A-Za-z0-9_-]{11}\.txt$")
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
_KNOWN_STAGE07_DROP_REASONS: Set[str] = {
    "missing_evidence_segment",
    "unknown_evidence_segment",
    "flagged_evidence_segment",
    "excluded_by_sanitizer",
    "non_approach_segment",
    "transcript_artifact",
    "low_quality_evidence_segment",
    "segment_not_in_evidence_allowlist",
    "insufficient_post_hook_evidence",
    "low_confidence_anchor",
}


def _canonical_issue_severity(legacy_severity: str) -> str:
    sev = str(legacy_severity or "").strip().lower()
    if sev in {"critical", "major", "minor", "info"}:
        return sev
    if sev == "error":
        return "major"
    if sev == "warning":
        return "minor"
    return "info"


def _canonical_gate_decision(issue_severity: str) -> str:
    if issue_severity in {"critical", "major"}:
        return "block"
    if issue_severity == "minor":
        return "review"
    return "pass"


def _canonical_scope_type(issue: Dict[str, Any]) -> str:
    scope = str(issue.get("scope_type", "")).strip().lower()
    if scope in {"segment", "conversation", "video", "batch"}:
        return scope
    if issue.get("segment_id") is not None:
        return "segment"
    if issue.get("conversation_id") is not None:
        return "conversation"
    vid = str(issue.get("video_id", "")).strip()
    if vid == "*" or not vid:
        return "batch"
    return "video"


def _canonical_issue_code(raw_check: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("_", str(raw_check or "").strip().lower()).strip("_")
    return cleaned or "unspecified_issue"


def _canonical_signal_class(issue: Dict[str, Any]) -> str:
    check = str(issue.get("check", "")).strip().lower()
    issue_code = str(issue.get("issue_code", "")).strip().lower()

    if check in {"preexisting_quarantine", "stage06b_reject"}:
        return "quarantine_gate"
    if issue_code in {"preexisting_quarantine", "stage06b_reject"}:
        return "quarantine_gate"

    if check in {"video_type_mismatch", "prompt_variant_mismatch"}:
        return "routing_mismatch"
    if issue_code in {"video_type_mismatch", "prompt_variant_mismatch"}:
        return "routing_mismatch"

    if check.startswith("stage08_"):
        return "taxonomy_coverage"
    if issue_code.startswith("stage08_"):
        return "taxonomy_coverage"

    if check in {"segment_text_modified", "stage07_normalization_repairs", "stage07_validation_warnings"}:
        return "transcript_quality"
    if issue_code in {"segment_text_modified", "stage07_normalization_repairs", "stage07_validation_warnings"}:
        return "transcript_quality"

    if check in {"conversation_not_contiguous", "compilation_with_single_conversation"}:
        return "conversation_structure"
    if issue_code in {"conversation_not_contiguous", "compilation_with_single_conversation"}:
        return "conversation_structure"

    if (
        check.startswith("missing_")
        or check.startswith("invalid_")
        or issue_code.startswith("missing_")
        or issue_code.startswith("invalid_")
    ):
        return "artifact_contract"

    return "other_quality"


def _canonical_remediation_path(signal_class: str) -> str:
    if signal_class == "quarantine_gate":
        return "quarantine"
    if signal_class == "artifact_contract":
        return "contract_repair"
    if signal_class == "routing_mismatch":
        return "routing_policy_review"
    if signal_class == "taxonomy_coverage":
        return "taxonomy_review"
    if signal_class == "transcript_quality":
        return "transcript_review"
    if signal_class == "conversation_structure":
        return "conversation_review"
    return "manual_review"


def _annotate_issue_canonical(issue: Dict[str, Any], origin_stage: str = "manifest-validation") -> None:
    # Keep legacy fields untouched; add canonical siblings for transition.
    issue_severity = _canonical_issue_severity(str(issue.get("severity", "")))
    issue["issue_severity"] = issue_severity
    issue["gate_decision"] = _canonical_gate_decision(issue_severity)
    issue["scope_type"] = _canonical_scope_type(issue)
    issue["issue_code"] = _canonical_issue_code(str(issue.get("check", "")))
    signal_class = _canonical_signal_class(issue)
    issue["signal_class"] = signal_class
    issue["remediation_path"] = _canonical_remediation_path(signal_class)
    issue["origin_stage"] = origin_stage


@dataclass(frozen=True)
class WaiverRule:
    video_id: str
    check: str
    note: Optional[str]
    expires_at: Optional[str]
    expires_ts: Optional[float]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = _BRACKET_ID_RE.search(text)
    return m.group(1) if m else None


def _video_id_for_file(p: Path) -> Optional[str]:
    # Common stage artifacts include [VIDEO_ID] in filenames.
    vid = _extract_video_id_from_text(str(p))
    if vid:
        return vid

    # Stage 09 chunks are often emitted as <video_id>.chunks.json (no [VIDEO_ID] token).
    m = _CHUNKS_BASENAME_VIDEO_ID_RE.match(p.name)
    if m:
        return m.group(1)

    # Fall back to JSON metadata (supports legacy `video_id`, Stage 09 `videoId`, and `sourceKey`).
    vid = validate_cross_stage._extract_video_id_from_json(p)  # type: ignore[attr-defined]
    if vid:
        return vid
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    for key in ("videoId", "video_id"):
        raw = data.get(key)
        if isinstance(raw, str) and _VIDEO_ID_RE.fullmatch(raw.strip()):
            return raw.strip()
    source_key = data.get("sourceKey")
    if isinstance(source_key, str):
        m2 = re.search(r"[\\/](?P<vid>[A-Za-z0-9_-]{11})\.txt$", source_key)
        if m2:
            return m2.group("vid")
    return None


def _safe_report_name(raw: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("_", (raw or "").strip()).strip("_")
    return cleaned or "report"


def _stage08_report_stem(manifest_stem: str, source_filter: Optional[str]) -> str:
    suffix = f".{source_filter}" if source_filter else ""
    return _safe_report_name(f"{manifest_stem}{suffix}")


def _stage08_expected_source_label(manifest_name: str, source_filter: Optional[str]) -> str:
    if source_filter:
        return f"manifest:{manifest_name}|source:{source_filter}"
    return f"manifest:{manifest_name}"



def _load_manifest_entries(manifest_path: Path, source: Optional[str] = None) -> List[Tuple[str, str, str]]:
    """Return list of (source, video_id, raw_folder_text)."""
    entries: List[Tuple[str, str, str]] = []
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
        entries.append((src, vid, folder))
    return entries


def _index_paths_by_video_id(
    stage_root: Path,
    glob_pattern: str,
    only_ids: Set[str],
) -> Dict[str, List[Path]]:
    out: DefaultDict[str, List[Path]] = defaultdict(list)
    if not stage_root.exists():
        return {}
    for p in stage_root.rglob(glob_pattern):
        vid = _video_id_for_file(p)
        if not vid or vid not in only_ids:
            continue
        out[vid].append(p)
    return dict(out)


def _pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, int, str]:
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        depth = len(p.parts)
        name = p.name.lower()
        # Prefer clean16k over raw16k when both artifacts exist for the same video id.
        quality_bonus = 2 if ".audio.asr.clean16k" in name else (1 if ".audio.asr.raw16k" in name else 0)
        return (source_bonus, quality_bonus, depth, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _validate_verification_payload(
    verification_path: Path,
    expected_video_id: str,
) -> Tuple[Optional[str], List[str]]:
    data = _load_json(verification_path)
    if not isinstance(data, dict):
        return None, ["unreadable_json"]

    errs: List[str] = []
    verdict_raw = data.get("verdict")
    verdict: Optional[str] = None
    if not isinstance(verdict_raw, str) or not verdict_raw.strip():
        errs.append("missing_verdict")
    else:
        verdict = verdict_raw.strip().upper()
        if verdict not in {"APPROVE", "FLAG", "REJECT"}:
            errs.append(f"invalid_verdict={verdict_raw!r}")
            verdict = None

    video_id = data.get("video_id")
    if video_id is not None:
        if not isinstance(video_id, str) or not _VIDEO_ID_RE.fullmatch(video_id.strip()):
            errs.append("invalid_video_id")
        elif video_id.strip() != expected_video_id:
            errs.append("video_id_mismatch_manifest")

    confidence = data.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, (int, float)) or not math.isfinite(float(confidence)):
            errs.append("invalid_confidence")
        elif float(confidence) < 0 or float(confidence) > 1:
            errs.append("confidence_out_of_range")

    flags = data.get("flags")
    if flags is not None and not isinstance(flags, list):
        errs.append("invalid_flags_not_array")

    return verdict, errs


def _parse_waiver_expires_at(expires_at: str, idx: int) -> float:
    raw = expires_at.strip()
    if not raw:
        raise ValueError(f"Waiver at index {idx} has empty 'expires_at'")
    normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(
            f"Waiver at index {idx} has invalid 'expires_at'={expires_at!r}; expected ISO-8601 timestamp"
        ) from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def _load_waiver_rules(waiver_path: Path) -> Tuple[List[WaiverRule], List[WaiverRule]]:
    """
    Load waiver rules split into (active_rules, expired_rules).

    Supported JSON formats:
      {"waivers":[{"video_id":"abc123...", "check":"some_check"}, ...]}
      [{"video_id":"abc123...", "check":"some_check"}, ...]

    Wildcards:
      video_id="*" or check="*"
    """
    try:
        data = json.loads(waiver_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Could not read waiver file: {exc}") from exc

    items: List[Any]
    if isinstance(data, dict):
        waivers = data.get("waivers")
        if not isinstance(waivers, list):
            raise ValueError("Waiver file object must contain a 'waivers' list")
        items = waivers
    elif isinstance(data, list):
        items = data
    else:
        raise ValueError("Waiver file must be a JSON object or list")

    now_ts = time.time()
    active_rules: List[WaiverRule] = []
    expired_rules: List[WaiverRule] = []
    seen_rules: Set[Tuple[str, str, Optional[str], Optional[str]]] = set()
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Waiver at index {idx} is not an object")
        unknown = sorted(set(item.keys()) - {"video_id", "check", "note", "expires_at"})
        if unknown:
            raise ValueError(f"Waiver at index {idx} has unknown keys: {unknown}")
        vid = item.get("video_id")
        chk = item.get("check")
        if not isinstance(vid, str) or not vid.strip():
            raise ValueError(f"Waiver at index {idx} missing non-empty 'video_id'")
        if not _WAIVER_VIDEO_OR_WILDCARD_RE.fullmatch(vid.strip()):
            raise ValueError(
                f"Waiver at index {idx} has invalid 'video_id'={vid!r}; expected '*' or 11-char video id"
            )
        if not isinstance(chk, str) or not chk.strip():
            raise ValueError(f"Waiver at index {idx} missing non-empty 'check'")
        note = item.get("note")
        if note is not None and not isinstance(note, str):
            raise ValueError(f"Waiver at index {idx} has invalid 'note'; expected string when present")
        expires_at_raw = item.get("expires_at")
        if expires_at_raw is not None and not isinstance(expires_at_raw, str):
            raise ValueError(f"Waiver at index {idx} has invalid 'expires_at'; expected string when present")
        expires_ts: Optional[float] = None
        expires_at: Optional[str] = None
        if isinstance(expires_at_raw, str):
            expires_at = expires_at_raw.strip()
            expires_ts = _parse_waiver_expires_at(expires_at, idx)

        key = (vid.strip(), chk.strip(), note.strip() if isinstance(note, str) else None, expires_at)
        if key in seen_rules:
            continue
        seen_rules.add(key)

        rule = WaiverRule(
            video_id=vid.strip(),
            check=chk.strip(),
            note=note.strip() if isinstance(note, str) and note.strip() else None,
            expires_at=expires_at,
            expires_ts=expires_ts,
        )
        if expires_ts is not None and now_ts > expires_ts:
            expired_rules.append(rule)
        else:
            active_rules.append(rule)

    return active_rules, expired_rules


def _find_matching_waiver(issue: Dict[str, Any], rules: List[WaiverRule]) -> Optional[WaiverRule]:
    if not rules:
        return None
    vid = str(issue.get("video_id", "")).strip() or "*"
    chk = str(issue.get("check", "")).strip() or "*"
    best: Optional[Tuple[int, int, WaiverRule]] = None
    for idx, rule in enumerate(rules):
        vid_match = rule.video_id == "*" or rule.video_id == vid
        chk_match = rule.check == "*" or rule.check == chk
        if not (vid_match and chk_match):
            continue
        specificity = (1 if rule.video_id != "*" else 0) + (1 if rule.check != "*" else 0)
        candidate = (specificity, -idx, rule)
        if best is None or candidate > best:
            best = candidate
    return best[2] if best else None


def _load_quarantine_video_ids(quarantine_path: Path) -> Set[str]:
    """Load quarantine video IDs from JSON file.

    Supported formats:
      {"quarantined_video_ids":["id1", ...]}
      {"video_ids":["id1", ...]}
      {"videos":[{"video_id":"id1"}, "id2", ...]}
      ["id1", "id2", ...]
    """
    try:
        raw = json.loads(quarantine_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Could not read quarantine file: {exc}") from exc

    out: Set[str] = set()

    def add_id(value: Any) -> None:
        if isinstance(value, str):
            v = value.strip()
            if _VIDEO_ID_RE.fullmatch(v):
                out.add(v)

    if isinstance(raw, list):
        for item in raw:
            add_id(item)
        return out

    if not isinstance(raw, dict):
        return out

    for key in ("quarantined_video_ids", "video_ids"):
        arr = raw.get(key)
        if isinstance(arr, list):
            for item in arr:
                add_id(item)

    videos = raw.get("videos")
    if isinstance(videos, list):
        for item in videos:
            if isinstance(item, dict):
                add_id(item.get("video_id"))
            else:
                add_id(item)

    return out


def _validate_chunks_payload(chunks_path: Path) -> List[str]:
    data = _load_json(chunks_path)
    if not isinstance(data, dict):
        return ["unreadable_json"]

    errs: List[str] = []
    source_key = data.get("sourceKey")
    video_id = data.get("videoId")
    channel = data.get("channel")

    if not isinstance(source_key, str) or not source_key.strip():
        errs.append("missing_sourceKey")
    elif not _STABLE_SOURCE_KEY_RE.fullmatch(source_key.strip()):
        errs.append("invalid_sourceKey_format")

    if not isinstance(video_id, str) or not _VIDEO_ID_RE.fullmatch(video_id.strip()):
        errs.append("missing_or_invalid_videoId")
    if not isinstance(channel, str) or not channel.strip():
        errs.append("missing_channel")

    if (
        isinstance(source_key, str)
        and source_key.strip()
        and isinstance(video_id, str)
        and _VIDEO_ID_RE.fullmatch(video_id.strip())
        and isinstance(channel, str)
        and channel.strip()
    ):
        normalized_key = source_key.strip().replace("\\", "/")
        expected_key = f"{channel.strip()}/{video_id.strip()}.txt"
        if normalized_key != expected_key:
            errs.append("sourceKey_channel_video_mismatch")

    chunks = data.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        return ["chunks_missing_or_empty"]

    emb_dim: Optional[int] = None
    expected_chunk_count = len(chunks)
    seen_chunk_indices: Set[int] = set()
    declared_total_chunks: Optional[int] = None

    for i, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            errs.append(f"chunk[{i}]_not_object")
            continue

        content = chunk.get("content")
        if not isinstance(content, str) or not content.strip():
            errs.append(f"chunk[{i}]_empty_content")

        emb = chunk.get("embedding")
        if not isinstance(emb, list) or not emb:
            errs.append(f"chunk[{i}]_missing_embedding")
        else:
            for j, val in enumerate(emb):
                if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                    errs.append(f"chunk[{i}]_embedding[{j}]_not_finite")
                    break
            if emb_dim is None:
                emb_dim = len(emb)
            elif len(emb) != emb_dim:
                errs.append(f"chunk[{i}]_embedding_dim_mismatch")

        md = chunk.get("metadata")
        if not isinstance(md, dict):
            errs.append(f"chunk[{i}]_missing_metadata")
            continue
        if not isinstance(md.get("segmentType"), str) or not str(md.get("segmentType", "")).strip():
            errs.append(f"chunk[{i}]_missing_segmentType")
        chunk_index = md.get("chunkIndex")
        total_chunks = md.get("totalChunks")
        if not isinstance(chunk_index, int):
            errs.append(f"chunk[{i}]_missing_chunkIndex")
        elif chunk_index < 0:
            errs.append(f"chunk[{i}]_invalid_chunkIndex")
        if not isinstance(total_chunks, int):
            errs.append(f"chunk[{i}]_missing_totalChunks")
        elif total_chunks <= 0:
            errs.append(f"chunk[{i}]_invalid_totalChunks")

        if isinstance(total_chunks, int) and total_chunks > 0:
            if declared_total_chunks is None:
                declared_total_chunks = total_chunks
            elif total_chunks != declared_total_chunks:
                errs.append(f"chunk[{i}]_totalChunks_inconsistent")

        if (
            isinstance(chunk_index, int)
            and chunk_index >= 0
            and isinstance(total_chunks, int)
            and total_chunks > 0
            and chunk_index >= total_chunks
        ):
            errs.append(f"chunk[{i}]_chunkIndex_out_of_bounds_totalChunks")

        if isinstance(chunk_index, int) and chunk_index >= 0:
            if chunk_index >= expected_chunk_count:
                errs.append(f"chunk[{i}]_chunkIndex_out_of_bounds_chunkCount")
            elif chunk_index in seen_chunk_indices:
                errs.append(f"chunk[{i}]_duplicate_chunkIndex")
            else:
                seen_chunk_indices.add(chunk_index)

    if declared_total_chunks is not None and declared_total_chunks != expected_chunk_count:
        errs.append("totalChunks_not_equal_chunk_count")

    if expected_chunk_count > 0:
        missing_indices: List[int] = []
        for idx in range(expected_chunk_count):
            if idx not in seen_chunk_indices:
                missing_indices.append(idx)
                if len(missing_indices) >= 5:
                    break
        if missing_indices:
            suffix = ",..." if expected_chunk_count - len(seen_chunk_indices) > len(missing_indices) else ""
            errs.append(f"missing_chunkIndex_values:{','.join(str(i) for i in missing_indices)}{suffix}")

    # Keep output concise for large files.
    if len(errs) > 12:
        return errs[:12] + [f"... {len(errs) - 12} more"]
    return errs


def _validate_audio_features_payload(audio_features_path: Path) -> List[str]:
    data = _load_json(audio_features_path)
    if not isinstance(data, dict):
        return ["unreadable_json"]

    errs: List[str] = []

    for key in ("source_audio", "audio_sha256", "source_timestamps"):
        val = data.get(key)
        if not isinstance(val, str) or not val.strip():
            errs.append(f"missing_{key}")

    total_duration = data.get("total_duration_sec")
    if not isinstance(total_duration, (int, float)) or not math.isfinite(float(total_duration)) or float(total_duration) <= 0:
        errs.append("invalid_total_duration_sec")

    processing = data.get("processing")
    if not isinstance(processing, dict):
        errs.append("missing_processing")
    else:
        sample_rate = processing.get("sample_rate")
        if not isinstance(sample_rate, int) or sample_rate <= 0:
            errs.append("invalid_processing_sample_rate")
        extractor = processing.get("feature_extractor")
        if not isinstance(extractor, str) or not extractor.strip():
            errs.append("missing_processing_feature_extractor")
        pitch_range = processing.get("pitch_range_hz")
        if (
            not isinstance(pitch_range, list)
            or len(pitch_range) != 2
            or any(not isinstance(v, (int, float)) or not math.isfinite(float(v)) for v in pitch_range)
        ):
            errs.append("invalid_processing_pitch_range_hz")
        pitch_method = processing.get("pitch_method")
        if pitch_method not in {"pyin", "yin"}:
            errs.append("invalid_processing_pitch_method")

    segments = data.get("segments")
    if not isinstance(segments, list) or not segments:
        errs.append("segments_missing_or_empty")
        return errs

    for i, seg in enumerate(segments):
        if not isinstance(seg, dict):
            errs.append(f"segment[{i}]_not_object")
            continue

        start = seg.get("start")
        end = seg.get("end")
        dur = seg.get("duration_sec")
        text = seg.get("text")
        if not isinstance(start, (int, float)) or not math.isfinite(float(start)):
            errs.append(f"segment[{i}]_invalid_start")
        if not isinstance(end, (int, float)) or not math.isfinite(float(end)):
            errs.append(f"segment[{i}]_invalid_end")
        if not isinstance(dur, (int, float)) or not math.isfinite(float(dur)) or float(dur) <= 0:
            errs.append(f"segment[{i}]_invalid_duration")
        if (
            isinstance(start, (int, float))
            and isinstance(end, (int, float))
            and math.isfinite(float(start))
            and math.isfinite(float(end))
            and float(end) < float(start)
        ):
            errs.append(f"segment[{i}]_end_before_start")
        if not isinstance(text, str) or not text.strip():
            errs.append(f"segment[{i}]_empty_text")

        features = seg.get("features")
        if not isinstance(features, dict):
            errs.append(f"segment[{i}]_missing_features")
            continue

        pitch = features.get("pitch")
        energy = features.get("energy")
        tempo = features.get("tempo")
        spectral = features.get("spectral")
        quality = features.get("quality")

        if not isinstance(pitch, dict):
            errs.append(f"segment[{i}]_missing_pitch")
        else:
            for key in ("mean_hz", "std_hz", "range_hz", "direction"):
                val = pitch.get(key)
                if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                    errs.append(f"segment[{i}]_invalid_pitch_{key}")

        if not isinstance(energy, dict):
            errs.append(f"segment[{i}]_missing_energy")
        else:
            val = energy.get("dynamics_db")
            if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                errs.append(f"segment[{i}]_invalid_energy_dynamics_db")

        if not isinstance(tempo, dict):
            errs.append(f"segment[{i}]_missing_tempo")
        else:
            val = tempo.get("syllable_rate")
            if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                errs.append(f"segment[{i}]_invalid_tempo_syllable_rate")

        if not isinstance(spectral, dict):
            errs.append(f"segment[{i}]_missing_spectral")
        else:
            val = spectral.get("brightness_hz")
            if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                errs.append(f"segment[{i}]_invalid_spectral_brightness_hz")

        # Stage 05 quality fields were added after some legacy artifacts were created.
        # Accept missing quality for backward compatibility; validate strictly when present.
        if quality is None:
            pass
        elif not isinstance(quality, dict):
            errs.append(f"segment[{i}]_invalid_quality")
        else:
            low_energy = quality.get("low_energy")
            speech_ratio = quality.get("speech_activity_ratio")
            if not isinstance(low_energy, bool):
                errs.append(f"segment[{i}]_invalid_quality_low_energy")
            if (
                not isinstance(speech_ratio, (int, float))
                or not math.isfinite(float(speech_ratio))
                or float(speech_ratio) < 0
                or float(speech_ratio) > 1
            ):
                errs.append(f"segment[{i}]_invalid_quality_speech_activity_ratio")

        if len(errs) >= 20:
            break

    if len(errs) > 12:
        return [*errs[:12], f"... ({len(errs) - 12} more issue(s))"]
    return errs


def _validate_stage07_drop_reason_contract(s07_data: Dict[str, Any]) -> Dict[str, Any]:
    dropped = s07_data.get("dropped_candidates")
    if not isinstance(dropped, list):
        return {
            "present": False,
            "missing_reason_code": 0,
            "unknown_reason_code": [],
            "missing_damage_reason_for_segment": 0,
            "missing_source_stage": 0,
            "missing_timestamp": 0,
            "anchor_drop_total": 0,
            "anchor_drop_reason_counts": {},
        }

    missing_reason_code = 0
    unknown_reason_code: Set[str] = set()
    missing_damage_reason_for_segment = 0
    missing_source_stage = 0
    missing_timestamp = 0
    anchor_drop_total = 0
    anchor_drop_reason_counts: Counter = Counter()
    anchor_candidate_types = {"technique_used", "turn_phase", "hook_point", "investment_level"}
    for rec in dropped:
        if not isinstance(rec, dict):
            missing_reason_code += 1
            continue
        source_stage = rec.get("source_stage")
        if not isinstance(source_stage, str) or not source_stage.strip():
            missing_source_stage += 1
        ts = rec.get("timestamp")
        if not isinstance(ts, str) or not ts.strip():
            missing_timestamp += 1

        reason_code_raw = rec.get("reason_code")
        reason_raw = rec.get("reason")
        reason_code: Optional[str] = None
        if isinstance(reason_code_raw, str) and reason_code_raw.strip():
            reason_code = reason_code_raw.strip()
        elif isinstance(reason_raw, str) and reason_raw.strip():
            reason_code = reason_raw.strip()
        if not reason_code:
            missing_reason_code += 1
        elif reason_code not in _KNOWN_STAGE07_DROP_REASONS:
            unknown_reason_code.add(reason_code)

        candidate_type = rec.get("candidate_type")
        if isinstance(candidate_type, str) and candidate_type in anchor_candidate_types:
            anchor_drop_total += 1
            if reason_code:
                anchor_drop_reason_counts[reason_code] += 1

        seg = rec.get("segment")
        if isinstance(seg, int):
            damage_reason = rec.get("damage_reason_code")
            if not isinstance(damage_reason, str) or not damage_reason.strip():
                missing_damage_reason_for_segment += 1

    return {
        "present": True,
        "missing_reason_code": missing_reason_code,
        "unknown_reason_code": sorted(unknown_reason_code),
        "missing_damage_reason_for_segment": missing_damage_reason_for_segment,
        "missing_source_stage": missing_source_stage,
        "missing_timestamp": missing_timestamp,
        "anchor_drop_total": anchor_drop_total,
        "anchor_drop_reason_counts": dict(anchor_drop_reason_counts),
    }


def _compute_stage07_damage_metrics(s07_data: Dict[str, Any]) -> Dict[str, Any]:
    segments = s07_data.get("segments")
    if not isinstance(segments, list):
        return {
            "video_damaged_token_ratio": 0.0,
            "video_damaged_segment_ratio": 0.0,
            "max_conversation_damaged_token_ratio": 0.0,
            "max_conversation_damaged_segment_ratio": 0.0,
            "damage_type_hist": {},
            "contamination_source_hist": {},
            "damaged_segments_total": 0,
            "segments_total": 0,
            "token_total": 0,
            "damaged_token_total": 0,
        }

    low_quality_ids: Set[int] = set()
    for row in s07_data.get("low_quality_segments", []) or []:
        if isinstance(row, dict) and not row.get("repaired"):
            sid = row.get("segment")
            if isinstance(sid, int):
                low_quality_ids.add(sid)
    artifact_ids: Set[int] = set()
    for row in s07_data.get("transcript_artifacts", []) or []:
        if isinstance(row, dict):
            sid = row.get("segment_index")
            if isinstance(sid, int):
                artifact_ids.add(sid)

    damage_type_hist: Counter = Counter()
    contamination_source_hist: Counter = Counter()
    by_conv_tokens: Dict[int, int] = defaultdict(int)
    by_conv_damaged_tokens: Dict[int, int] = defaultdict(int)
    by_conv_segments: Dict[int, int] = defaultdict(int)
    by_conv_damaged_segments: Dict[int, int] = defaultdict(int)

    token_total = 0
    damaged_token_total = 0
    damaged_segments_total = 0
    segments_total = 0

    for seg in segments:
        if not isinstance(seg, dict):
            continue
        sid = seg.get("id")
        if not isinstance(sid, int):
            continue
        segments_total += 1
        conv_id = seg.get("conversation_id")
        if not isinstance(conv_id, int):
            conv_id = 0
        text = seg.get("text")
        tokens = len([t for t in str(text).strip().split() if t]) if isinstance(text, str) else 0
        token_total += tokens
        by_conv_tokens[conv_id] += tokens
        by_conv_segments[conv_id] += 1

        tier = str(seg.get("confidence_tier", "")).strip().lower()
        contamination_sources = [
            str(x).strip()
            for x in (seg.get("contamination_sources") or [])
            if isinstance(x, str) and str(x).strip()
        ]
        damaged = False
        if tier == "low":
            damaged = True
            damage_type_hist["low_confidence_tier"] += 1
        if sid in low_quality_ids:
            damaged = True
            damage_type_hist["low_quality"] += 1
        if sid in artifact_ids:
            damaged = True
            damage_type_hist["transcript_artifact"] += 1
        if contamination_sources:
            damaged = True
            for src in contamination_sources:
                contamination_source_hist[src] += 1

        if damaged:
            damaged_segments_total += 1
            damaged_token_total += tokens
            by_conv_damaged_segments[conv_id] += 1
            by_conv_damaged_tokens[conv_id] += tokens

    max_conv_token_ratio = 0.0
    max_conv_segment_ratio = 0.0
    for conv_id in set(by_conv_segments.keys()) | set(by_conv_tokens.keys()):
        conv_tokens = by_conv_tokens.get(conv_id, 0)
        conv_damaged_tokens = by_conv_damaged_tokens.get(conv_id, 0)
        conv_segments = by_conv_segments.get(conv_id, 0)
        conv_damaged_segments = by_conv_damaged_segments.get(conv_id, 0)
        if conv_tokens > 0:
            max_conv_token_ratio = max(max_conv_token_ratio, conv_damaged_tokens / conv_tokens)
        if conv_segments > 0:
            max_conv_segment_ratio = max(max_conv_segment_ratio, conv_damaged_segments / conv_segments)

    return {
        "video_damaged_token_ratio": (damaged_token_total / token_total) if token_total > 0 else 0.0,
        "video_damaged_segment_ratio": (damaged_segments_total / segments_total) if segments_total > 0 else 0.0,
        "max_conversation_damaged_token_ratio": max_conv_token_ratio,
        "max_conversation_damaged_segment_ratio": max_conv_segment_ratio,
        "damage_type_hist": dict(damage_type_hist),
        "contamination_source_hist": dict(contamination_source_hist),
        "damaged_segments_total": damaged_segments_total,
        "segments_total": segments_total,
        "token_total": token_total,
        "damaged_token_total": damaged_token_total,
    }


def _compute_stage07_anchor_drop_ratio(s07_data: Dict[str, Any]) -> Dict[str, Any]:
    enrichments = s07_data.get("enrichments")
    if not isinstance(enrichments, list):
        enrichments = []
    dropped = s07_data.get("dropped_candidates")
    if not isinstance(dropped, list):
        dropped = []

    kept_anchors = 0
    for enrichment in enrichments:
        if not isinstance(enrichment, dict):
            continue
        if enrichment.get("type") != "approach":
            continue
        techniques = enrichment.get("techniques_used")
        if isinstance(techniques, list):
            kept_anchors += len([t for t in techniques if isinstance(t, dict)])
        phases = enrichment.get("turn_phases")
        if isinstance(phases, list):
            kept_anchors += len([p for p in phases if isinstance(p, dict)])
        hook = enrichment.get("hook_point")
        if isinstance(hook, dict) and isinstance(hook.get("segment"), int):
            kept_anchors += 1
        inv = enrichment.get("investment_level")
        if isinstance(inv, str) and inv.strip():
            kept_anchors += 1

    dropped_anchor_total = 0
    anchor_drop_reason_counts: Counter = Counter()
    for row in dropped:
        if not isinstance(row, dict):
            continue
        ctype = row.get("candidate_type")
        if ctype not in {"technique_used", "turn_phase", "hook_point", "investment_level"}:
            continue
        dropped_anchor_total += 1
        reason = row.get("reason_code")
        if not isinstance(reason, str) or not reason.strip():
            reason = row.get("reason")
        if isinstance(reason, str) and reason.strip():
            anchor_drop_reason_counts[reason.strip()] += 1

    denom = kept_anchors + dropped_anchor_total
    ratio = (dropped_anchor_total / denom) if denom > 0 else 0.0
    return {
        "kept_anchor_total": kept_anchors,
        "dropped_anchor_total": dropped_anchor_total,
        "dropped_anchor_ratio": ratio,
        "anchor_drop_reason_counts": dict(anchor_drop_reason_counts),
    }


def _merge_string_int_hist(dst: Counter, src: Any) -> None:
    if not isinstance(src, dict):
        return
    for raw_key, raw_val in src.items():
        if not isinstance(raw_key, str):
            continue
        key = raw_key.strip()
        if not key:
            continue
        if isinstance(raw_val, bool):
            val = int(raw_val)
        elif isinstance(raw_val, (int, float)) and math.isfinite(float(raw_val)):
            val = int(raw_val)
        else:
            continue
        if val <= 0:
            continue
        dst[key] += val


def _issue_to_stage_check(issue: Dict[str, Any]) -> Dict[str, str]:
    sev_raw = str(issue.get("severity", "info")).strip().lower()
    sev = sev_raw if sev_raw in {"error", "warning", "info"} else "info"
    check = str(issue.get("check", "unknown")).strip() or "unknown"
    message = str(issue.get("message", "")).strip() or "(no message)"
    out = {
        "severity": sev,
        "check": check,
        "message": message,
    }
    signal_class = str(issue.get("signal_class", "")).strip()
    if signal_class:
        out["signal_class"] = signal_class
    remediation_path = str(issue.get("remediation_path", "")).strip()
    if remediation_path:
        out["remediation_path"] = remediation_path
    return out


def _build_video_stage_report(
    *,
    video_id: str,
    source: str,
    stem: str,
    manifest_path: Path,
    raw_issues: List[Dict[str, Any]],
    artifact_paths: Set[str],
    started_at: str,
    finished_at: str,
    elapsed_sec: float,
) -> Dict[str, Any]:
    checks = [_issue_to_stage_check(i) for i in raw_issues]
    errors = sum(1 for c in checks if c["severity"] == "error")
    warnings = sum(1 for c in checks if c["severity"] == "warning")
    infos = sum(1 for c in checks if c["severity"] == "info")
    waived = sum(1 for i in raw_issues if bool(i.get("waived")))

    if errors > 0:
        status = "FAIL"
        reason_code = next((c["check"] for c in checks if c["severity"] == "error"), "unknown_error")
    elif warnings > 0:
        status = "WARN"
        reason_code = next((c["check"] for c in checks if c["severity"] == "warning"), "unknown_warning")
    else:
        status = "PASS"
        reason_code = "ok"

    report = {
        "stage": "manifest-validation",
        "status": status,
        "reason_code": reason_code,
        "video_id": video_id,
        "source": source,
        "stem": stem,
        "batch_id": manifest_path.stem,
        "manifest_path": str(manifest_path),
        "inputs": [{"path": str(manifest_path)}],
        "outputs": [{"path": p} for p in sorted(artifact_paths)],
        "checks": checks,
        "metrics": {
            "errors": errors,
            "warnings": warnings,
            "info": infos,
            "waived": waived,
        },
        "timestamps": {
            "started_at": started_at,
            "finished_at": finished_at,
            "elapsed_sec": round(max(elapsed_sec, 0.0), 3),
        },
        "versions": {
            "pipeline_version": "manifest-validation-v1",
            "prompt_version": None,
            "model": None,
            "schema_version": "1.0.0",
            "git_sha": None,
        },
    }
    return report


def _default_stage_reports_dir(manifest_path: Path, source_filter: Optional[str]) -> Path:
    suffix = f".{source_filter}" if source_filter else ""
    name = _safe_report_name(f"{manifest_path.stem}{suffix}")
    return repo_root() / "data" / "validation" / "stage_reports" / name


def _default_quarantine_path(manifest_path: Path, source_filter: Optional[str]) -> Path:
    suffix = f".{source_filter}" if source_filter else ""
    name = _safe_report_name(f"{manifest_path.stem}{suffix}")
    return repo_root() / "data" / "validation" / "quarantine" / f"{name}.json"


def _default_gate_path(manifest_path: Path, source_filter: Optional[str]) -> Path:
    suffix = f".{source_filter}" if source_filter else ""
    name = _safe_report_name(f"{manifest_path.stem}{suffix}")
    return repo_root() / "data" / "validation" / "gates" / f"{name}.gate.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Manifest validation harness (06b/06c/07 cross-stage)")
    parser.add_argument("--manifest", required=True, help="Batch/sub-batch manifest file (docs/pipeline/batches/*.txt)")
    parser.add_argument("--source", help="Only validate one source within the manifest")
    parser.add_argument(
        "--skip-stage01-presence",
        action="store_true",
        help="Do not fail when Stage 01 .wav artifacts are missing (useful for archived/migrated datasets)",
    )
    parser.add_argument(
        "--check-stage05-audio",
        action="store_true",
        help="Also require Stage 05 audio_features artifacts and validate basic payload integrity",
    )
    parser.add_argument(
        "--check-stage09-chunks",
        action="store_true",
        help="Also require Stage 09 chunk artifacts and validate basic chunk payload integrity",
    )
    parser.add_argument(
        "--check-stage08-report",
        action="store_true",
        help="Also require a valid Stage 08 manifest report (and fail on FAIL status)",
    )
    parser.add_argument(
        "--waiver-file",
        help=(
            "Optional JSON file with issue waivers "
            "({\"waivers\":[{\"video_id\":\"...\",\"check\":\"...\",\"expires_at\":\"...\"}]}); "
            "expired waivers are ignored"
        ),
    )
    parser.add_argument(
        "--emit-stage-reports",
        action="store_true",
        help="Write per-video stage reports under data/validation/stage_reports/",
    )
    parser.add_argument(
        "--stage-reports-dir",
        help="Directory for --emit-stage-reports output (defaults to data/validation/stage_reports/<manifest>)",
    )
    parser.add_argument(
        "--quarantine-file",
        help="Optional JSON file of quarantined video IDs; matching videos are downgraded to info in this validation run",
    )
    parser.add_argument(
        "--emit-quarantine",
        action="store_true",
        help="Write quarantine video list derived from current issues (post-waiver)",
    )
    parser.add_argument(
        "--quarantine-out",
        help="Output file for --emit-quarantine (defaults to data/validation/quarantine/<manifest>[.<source>].json)",
    )
    parser.add_argument(
        "--quarantine-level",
        choices=["error", "warning"],
        default="error",
        help="Severity threshold for quarantine entries: error or warning (default: error)",
    )
    parser.add_argument(
        "--emit-canonical-gate",
        action="store_true",
        help="Emit canonical manifest-level gate artifact under data/validation/gates/",
    )
    parser.add_argument(
        "--canonical-gate-out",
        help="Output file for --emit-canonical-gate (defaults to data/validation/gates/<manifest>[.<source>].gate.json)",
    )
    parser.add_argument(
        "--max-damaged-token-ratio",
        type=float,
        help=(
            "Optional hard budget: block when Stage 07 video_damaged_token_ratio exceeds this value (0..1)"
        ),
    )
    parser.add_argument(
        "--max-dropped-anchor-ratio",
        type=float,
        help=(
            "Optional hard budget: block when Stage 07 dropped_anchor_ratio exceeds this value (0..1)"
        ),
    )
    parser.add_argument(
        "--damage-drift-out",
        help=(
            "Optional JSON output path for manifest-level damage drift histograms "
            "(damage types, contamination sources, anchor drop reasons)"
        ),
    )
    parser.add_argument("--strict", action="store_true", help="Fail on warnings (not just errors)")
    parser.add_argument("--json", action="store_true", help="Output JSON report (stdout)")
    parser.add_argument("--show", type=int, default=30, help="Max issue lines to print in text mode")

    args = parser.parse_args()
    emit_quarantine = bool(args.emit_quarantine or args.quarantine_out)
    emit_canonical_gate = bool(args.emit_canonical_gate or args.canonical_gate_out)

    if args.max_damaged_token_ratio is not None and not (0.0 <= float(args.max_damaged_token_ratio) <= 1.0):
        print(f"{LOG_PREFIX} ERROR: --max-damaged-token-ratio must be within [0,1]", file=sys.stderr)
        sys.exit(2)
    if args.max_dropped_anchor_ratio is not None and not (0.0 <= float(args.max_dropped_anchor_ratio) <= 1.0):
        print(f"{LOG_PREFIX} ERROR: --max-dropped-anchor-ratio must be within [0,1]", file=sys.stderr)
        sys.exit(2)

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        print(f"{LOG_PREFIX} ERROR: Manifest file not found: {manifest_path}", file=sys.stderr)
        sys.exit(2)

    waiver_rules: List[WaiverRule] = []
    waiver_rules_expired: List[WaiverRule] = []
    waiver_file_path: Optional[Path] = None
    if args.waiver_file:
        waiver_file_path = Path(args.waiver_file)
        if not waiver_file_path.is_absolute():
            waiver_file_path = repo_root() / waiver_file_path
        if not waiver_file_path.exists():
            print(f"{LOG_PREFIX} ERROR: Waiver file not found: {waiver_file_path}", file=sys.stderr)
            sys.exit(2)
        try:
            waiver_rules, waiver_rules_expired = _load_waiver_rules(waiver_file_path)
        except ValueError as exc:
            print(f"{LOG_PREFIX} ERROR: Invalid waiver file {waiver_file_path}: {exc}", file=sys.stderr)
            sys.exit(2)

    quarantine_file_path: Optional[Path] = None
    quarantine_video_ids: Set[str] = set()
    if args.quarantine_file:
        quarantine_file_path = Path(args.quarantine_file)
        if not quarantine_file_path.is_absolute():
            quarantine_file_path = repo_root() / quarantine_file_path
        if not quarantine_file_path.exists():
            print(f"{LOG_PREFIX} ERROR: Quarantine file not found: {quarantine_file_path}", file=sys.stderr)
            sys.exit(2)
        try:
            quarantine_video_ids = _load_quarantine_video_ids(quarantine_file_path)
        except ValueError as exc:
            print(f"{LOG_PREFIX} ERROR: Invalid quarantine file {quarantine_file_path}: {exc}", file=sys.stderr)
            sys.exit(2)

    entries = _load_manifest_entries(manifest_path, source=args.source)
    if not entries:
        print(f"{LOG_PREFIX} No entries found in manifest: {manifest_path}")
        sys.exit(0)

    manifest_ids: Set[str] = {vid for _, vid, _ in entries}
    source_by_vid: Dict[str, str] = {vid: src for src, vid, _ in entries}
    folder_by_vid: Dict[str, str] = {vid: folder for src, vid, folder in entries}

    data_root = repo_root() / "data"
    s01_root = data_root / "01.download"
    s05_root = data_root / "05.EXT.audio-features"
    s06_root = data_root / "06.LLM.video-type"
    s06c_root = data_root / "06c.DET.patched"
    s07_root = data_root / "07.LLM.content"
    s06b_root = data_root / "06b.LLM.verify"
    s09_root = data_root / "09.EXT.chunks"

    idx_s01_wav = _index_paths_by_video_id(s01_root, "*.wav", manifest_ids)
    idx_s05 = _index_paths_by_video_id(s05_root, "*.audio_features.json", manifest_ids) if args.check_stage05_audio else {}
    idx_s06 = _index_paths_by_video_id(s06_root, "*.conversations.json", manifest_ids)
    idx_s06c = _index_paths_by_video_id(s06c_root, "*.conversations.json", manifest_ids)
    idx_s07 = _index_paths_by_video_id(s07_root, "*.enriched.json", manifest_ids)
    idx_s07_val = _index_paths_by_video_id(s07_root, "*.validation.json", manifest_ids)
    idx_s06b = _index_paths_by_video_id(s06b_root, "*.verification.json", manifest_ids)
    idx_s09 = _index_paths_by_video_id(s09_root, "*.chunks.json", manifest_ids) if args.check_stage09_chunks else {}

    verdict_counts: Counter = Counter()
    missing_verify: List[str] = []
    invalid_verify: List[str] = []
    missing_s01: List[str] = []
    missing_s05: List[str] = []
    missing_s06c: List[str] = []
    missing_s07: List[str] = []
    missing_s09: List[str] = []

    issues: List[Dict[str, Any]] = []
    check_counts: Counter = Counter()
    validated_pairs = 0
    cross_stage_errors = 0
    cross_stage_warnings = 0
    stage06b_checked_files = 0
    stage06b_invalid_files = 0
    stage09_checked_files = 0
    stage09_invalid_files = 0
    stage05_checked_files = 0
    stage05_invalid_files = 0
    stage08_checked = False
    stage08_status: Optional[str] = None
    stage08_report_path: Optional[Path] = None
    stage08_blocked_video_ids: Set[str] = set()
    stage08_block_reason_by_video: Dict[str, str] = {}

    # Stage 07 quality signals (from per-file validation + normalization metadata)
    stage07_val_errors = 0
    stage07_val_warnings = 0
    stage07_warning_types: Counter = Counter()
    stage07_normalization_repairs_total = 0
    stage07_videos_with_repairs = 0
    stage07_metrics_videos = 0

    stage07_segments_total = 0
    stage07_damaged_segments_total = 0
    stage07_token_total = 0
    stage07_damaged_token_total = 0
    stage07_kept_anchor_total = 0
    stage07_dropped_anchor_total = 0

    stage07_damage_type_hist: Counter = Counter()
    stage07_contamination_source_hist: Counter = Counter()
    stage07_anchor_drop_reason_hist: Counter = Counter()
    stage07_max_video_damaged_token_ratio = 0.0
    stage07_max_video_dropped_anchor_ratio = 0.0
    stage07_damage_ratio_by_video: List[Dict[str, Any]] = []
    stage07_anchor_ratio_by_video: List[Dict[str, Any]] = []
    damage_budget_violations: List[Dict[str, Any]] = []
    anchor_budget_violations: List[Dict[str, Any]] = []

    video_artifacts: Dict[str, Dict[str, Optional[str]]] = {}
    stage_reports_emitted = 0
    stage_reports_dir: Optional[Path] = None
    quarantine_out_path: Optional[Path] = None
    quarantined_videos: List[str] = []

    start = time.time()
    started_at_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start))
    if args.emit_stage_reports:
        if args.stage_reports_dir:
            stage_reports_dir = Path(args.stage_reports_dir)
            if not stage_reports_dir.is_absolute():
                stage_reports_dir = repo_root() / stage_reports_dir
        else:
            stage_reports_dir = _default_stage_reports_dir(manifest_path, args.source)
    if emit_quarantine:
        if args.quarantine_out:
            quarantine_out_path = Path(args.quarantine_out)
            if not quarantine_out_path.is_absolute():
                quarantine_out_path = repo_root() / quarantine_out_path
        else:
            quarantine_out_path = _default_quarantine_path(manifest_path, args.source)

    if args.check_stage08_report:
        stage08_checked = True
        report_stem = _stage08_report_stem(manifest_path.stem, args.source)
        stage08_report_path = data_root / "08.DET.taxonomy-validation" / f"{report_stem}.report.json"
        expected_source = _stage08_expected_source_label(manifest_path.name, args.source)

        if not stage08_report_path.exists():
            issues.append({
                "video_id": "*",
                "source": args.source or "all",
                "severity": "error",
                "check": "missing_stage08_report",
                "message": f"Missing Stage 08 report for manifest scope: {stage08_report_path}",
            })
            check_counts["error:missing_stage08_report"] += 1
        else:
            report_data = _load_json(stage08_report_path)
            if not isinstance(report_data, dict):
                issues.append({
                    "video_id": "*",
                    "source": args.source or "all",
                    "severity": "error",
                    "check": "invalid_stage08_report",
                    "message": "Stage 08 report is unreadable or not a JSON object",
                    "stage08_report": str(stage08_report_path),
                })
                check_counts["error:invalid_stage08_report"] += 1
            else:
                if report_data.get("stage") != "08.DET.taxonomy-validation":
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_stage",
                        "message": f"Stage 08 report has unexpected stage={report_data.get('stage')!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_stage"] += 1

                source_label = report_data.get("source")
                if source_label != expected_source:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_scope",
                        "message": (
                            f"Stage 08 report source mismatch: expected {expected_source!r}, "
                            f"found {source_label!r}"
                        ),
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_scope"] += 1

                scope = report_data.get("scope")
                if scope is None:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "missing_stage08_report_scope",
                        "message": "Stage 08 report missing scope metadata; cannot fully verify manifest/source scope",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:missing_stage08_report_scope"] += 1
                elif not isinstance(scope, dict):
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_scope_object",
                        "message": "Stage 08 report scope is not a JSON object",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_scope_object"] += 1
                else:
                    scope_manifest = scope.get("manifest")
                    if scope_manifest not in {None, manifest_path.name}:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_scope_manifest",
                            "message": (
                                f"Stage 08 report scope.manifest mismatch: expected {manifest_path.name!r}, "
                                f"found {scope_manifest!r}"
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_scope_manifest"] += 1

                    expected_scope_source = args.source or None
                    scope_source = scope.get("source_filter")
                    if scope_source != expected_scope_source:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_scope_source",
                            "message": (
                                f"Stage 08 report scope.source_filter mismatch: expected {expected_scope_source!r}, "
                                f"found {scope_source!r}"
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_scope_source"] += 1

                    scope_manifest_videos = scope.get("manifest_videos")
                    if isinstance(scope_manifest_videos, int) and scope_manifest_videos != len(manifest_ids):
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_scope_video_count",
                            "message": (
                                f"Stage 08 report scope.manifest_videos mismatch: expected {len(manifest_ids)}, "
                                f"found {scope_manifest_videos}"
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_scope_video_count"] += 1

                validation = report_data.get("validation")
                if not isinstance(validation, dict):
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_validation",
                        "message": "Stage 08 report missing validation object",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_validation"] += 1
                else:
                    status = validation.get("status")
                    stage08_status = status if isinstance(status, str) else None
                    reason = validation.get("reason")
                    reason_text = reason.strip() if isinstance(reason, str) else ""
                    video_results = validation.get("video_results")
                    has_video_results = isinstance(video_results, list)

                    if status not in {"PASS", "WARNING", "FAIL"}:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_status",
                            "message": f"Stage 08 report has invalid validation.status={status!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_status"] += 1
                    elif status == "FAIL":
                        if has_video_results:
                            issues.append({
                                "video_id": "*",
                                "source": args.source or "all",
                                # Per-video FAIL rows already carry actionable signal.
                                # Keep manifest-level FAIL summary as non-gating context
                                # so a single missing/failed video doesn't downgrade every
                                # video in the manifest to REVIEW.
                                "severity": "info",
                                "check": "stage08_validation_fail_manifest",
                                "message": (
                                    "Stage 08 report status is FAIL; per-video failures will be quarantined"
                                    + (f": {reason_text}" if reason_text else "")
                                ),
                                "stage08_report": str(stage08_report_path),
                            })
                        else:
                            issues.append({
                                "video_id": "*",
                                "source": args.source or "all",
                                "severity": "error",
                                "check": "stage08_validation_fail",
                                "message": (
                                    f"Stage 08 report status is FAIL"
                                    + (f": {reason_text}" if reason_text else "")
                                ),
                                "stage08_report": str(stage08_report_path),
                            })
                            check_counts["error:stage08_validation_fail"] += 1
                    elif status == "WARNING":
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "warning",
                            "check": "stage08_validation_warning",
                            "message": (
                                f"Stage 08 report status is WARNING"
                                + (f": {reason_text}" if reason_text else "")
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["warning:stage08_validation_warning"] += 1

                    if has_video_results:
                        for row in video_results:
                            if not isinstance(row, dict):
                                continue
                            raw_vid = row.get("video_id")
                            if not isinstance(raw_vid, str):
                                continue
                            vid = raw_vid.strip()
                            if not _VIDEO_ID_RE.fullmatch(vid):
                                continue
                            if vid not in manifest_ids:
                                continue
                            row_status = row.get("status")
                            row_reason = row.get("reason")
                            reason_text = row_reason.strip() if isinstance(row_reason, str) else ""

                            if row_status == "FAIL":
                                if vid not in stage08_blocked_video_ids:
                                    issues.append({
                                        "video_id": vid,
                                        "source": source_by_vid.get(vid, args.source or "all"),
                                        "severity": "error",
                                        "check": "stage08_video_fail",
                                        "message": (
                                            "Stage 08 per-video taxonomy status is FAIL"
                                            + (f": {reason_text}" if reason_text else "")
                                        ),
                                        "stage08_report": str(stage08_report_path),
                                    })
                                    check_counts["error:stage08_video_fail"] += 1
                                stage08_blocked_video_ids.add(vid)
                                stage08_block_reason_by_video.setdefault(
                                    vid,
                                    reason_text or "stage08_video_fail",
                                )
                            elif row_status == "WARNING":
                                issues.append({
                                    "video_id": vid,
                                    "source": source_by_vid.get(vid, args.source or "all"),
                                    "severity": "warning",
                                    "check": "stage08_video_warning",
                                    "message": (
                                        "Stage 08 per-video taxonomy status is WARNING"
                                        + (f": {reason_text}" if reason_text else "")
                                    ),
                                    "stage08_report": str(stage08_report_path),
                                })
                                check_counts["warning:stage08_video_warning"] += 1

                details = report_data.get("details")
                files_processed = details.get("files_processed") if isinstance(details, dict) else None
                if not isinstance(files_processed, int) or files_processed <= 0:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_files_processed",
                        "message": f"Stage 08 report has invalid details.files_processed={files_processed!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_files_processed"] += 1
                files_unreadable = details.get("files_unreadable") if isinstance(details, dict) else None
                if not isinstance(files_unreadable, int) or files_unreadable < 0:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_files_unreadable",
                        "message": f"Stage 08 report has invalid details.files_unreadable={files_unreadable!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_files_unreadable"] += 1
                elif files_unreadable > 0:
                    unreadable_ids = details.get("unreadable_video_ids") if isinstance(details, dict) else None
                    if not isinstance(unreadable_ids, list):
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "stage08_unreadable_enriched_files",
                            "message": (
                                f"Stage 08 report indicates {files_unreadable} unreadable Stage 07 enriched file(s) "
                                "but no unreadable_video_ids list is present"
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:stage08_unreadable_enriched_files"] += 1
                    else:
                        for raw_vid in unreadable_ids:
                            vid = raw_vid.strip() if isinstance(raw_vid, str) else ""
                            if not _VIDEO_ID_RE.fullmatch(vid):
                                continue
                            if vid not in manifest_ids:
                                continue
                            if vid not in stage08_blocked_video_ids:
                                issues.append({
                                    "video_id": vid,
                                    "source": source_by_vid.get(vid, args.source or "all"),
                                    "severity": "error",
                                    "check": "stage08_unreadable_enriched_file",
                                    "message": "Stage 08 report marks this video as unreadable in Stage 07 enriched input",
                                    "stage08_report": str(stage08_report_path),
                                })
                                check_counts["error:stage08_unreadable_enriched_file"] += 1
                            stage08_blocked_video_ids.add(vid)
                            stage08_block_reason_by_video.setdefault(vid, "unreadable_stage07_enriched")

                manifest_cov = details.get("manifest_coverage") if isinstance(details, dict) else None
                if not isinstance(manifest_cov, dict):
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_manifest_coverage",
                        "message": "Stage 08 report missing details.manifest_coverage",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_manifest_coverage"] += 1
                else:
                    missing_videos = manifest_cov.get("missing_videos")
                    matched_video_ids = manifest_cov.get("matched_video_ids")
                    missing_video_ids = manifest_cov.get("missing_video_ids")
                    if not isinstance(missing_videos, int) or missing_videos < 0:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_missing_videos",
                            "message": f"Stage 08 report has invalid manifest_coverage.missing_videos={missing_videos!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_missing_videos"] += 1
                    elif missing_videos > 0:
                        if not isinstance(missing_video_ids, list):
                            issues.append({
                                "video_id": "*",
                                "source": args.source or "all",
                                "severity": "error",
                                "check": "stage08_manifest_coverage_incomplete",
                                "message": (
                                    f"Stage 08 report indicates incomplete manifest coverage (missing_videos={missing_videos}) "
                                    "but missing_video_ids list is absent"
                                ),
                                "stage08_report": str(stage08_report_path),
                            })
                            check_counts["error:stage08_manifest_coverage_incomplete"] += 1
                        else:
                            for raw_vid in missing_video_ids:
                                vid = raw_vid.strip() if isinstance(raw_vid, str) else ""
                                if not _VIDEO_ID_RE.fullmatch(vid):
                                    continue
                                if vid not in manifest_ids:
                                    continue
                                if vid not in stage08_blocked_video_ids:
                                    issues.append({
                                        "video_id": vid,
                                        "source": source_by_vid.get(vid, args.source or "all"),
                                        "severity": "error",
                                        "check": "stage08_missing_stage07_enriched",
                                        "message": "Stage 08 report marks this video as missing Stage 07 enriched output",
                                        "stage08_report": str(stage08_report_path),
                                    })
                                    check_counts["error:stage08_missing_stage07_enriched"] += 1
                                stage08_blocked_video_ids.add(vid)
                                stage08_block_reason_by_video.setdefault(vid, "missing_stage07_enriched")

                    if not isinstance(matched_video_ids, int) or matched_video_ids <= 0:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_matched_video_ids",
                            "message": f"Stage 08 report has invalid manifest_coverage.matched_video_ids={matched_video_ids!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_matched_video_ids"] += 1

    for vid in sorted(manifest_ids):
        src = source_by_vid.get(vid, "")
        folder_text = folder_by_vid.get(vid, "")

        s01_candidates = idx_s01_wav.get(vid) or []
        s05_candidates = idx_s05.get(vid) or []
        s06c_candidates = idx_s06c.get(vid) or []
        s06_candidates = idx_s06.get(vid) or []
        s07_candidates = idx_s07.get(vid) or []
        s07v_candidates = idx_s07_val.get(vid) or []
        v_candidates = idx_s06b.get(vid) or []
        s09_candidates = idx_s09.get(vid) or []

        s01_path = _pick_best_candidate(s01_candidates, src) if s01_candidates else None
        s05_path = _pick_best_candidate(s05_candidates, src) if s05_candidates else None
        s06c_path = _pick_best_candidate(s06c_candidates, src) if s06c_candidates else None
        s06_path = _pick_best_candidate(s06_candidates, src) if s06_candidates else None
        s07_path = _pick_best_candidate(s07_candidates, src) if s07_candidates else None
        s07v_path = _pick_best_candidate(s07v_candidates, src) if s07v_candidates else None
        v_path = _pick_best_candidate(v_candidates, src) if v_candidates else None
        s09_path = _pick_best_candidate(s09_candidates, src) if s09_candidates else None
        video_artifacts[vid] = {
            "s01": str(s01_path) if s01_path else None,
            "s05": str(s05_path) if s05_path else None,
            "s06": str(s06_path) if s06_path else None,
            "s06c": str(s06c_path) if s06c_path else None,
            "s07": str(s07_path) if s07_path else None,
            "s07_validation": str(s07v_path) if s07v_path else None,
            "verify": str(v_path) if v_path else None,
            "s09": str(s09_path) if s09_path else None,
        }

        if not s06c_path:
            missing_s06c.append(vid)
        if not s07_path:
            missing_s07.append(vid)
        if args.check_stage05_audio and not s05_path:
            missing_s05.append(vid)
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "error",
                "check": "missing_stage05_audio",
                "message": "No Stage 05 audio_features artifact found for this video_id",
                "manifest_folder": folder_text,
            })
            check_counts["error:missing_stage05_audio"] += 1
        elif args.check_stage05_audio and s05_path:
            stage05_checked_files += 1
            s05_errs = _validate_audio_features_payload(s05_path)
            if s05_errs:
                stage05_invalid_files += 1
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "stage05_audio_invalid",
                    "message": f"Stage 05 audio_features payload invalid: {s05_errs}",
                    "s05": str(s05_path),
                })
                check_counts["error:stage05_audio_invalid"] += 1
        if args.check_stage09_chunks and not s09_path:
            missing_s09.append(vid)
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "error",
                "check": "missing_stage09_chunks",
                "message": "No Stage 09 chunks artifact found for this video_id",
                "manifest_folder": folder_text,
            })
            check_counts["error:missing_stage09_chunks"] += 1
        elif args.check_stage09_chunks and s09_path:
            stage09_checked_files += 1
            s09_errs = _validate_chunks_payload(s09_path)
            if s09_errs:
                stage09_invalid_files += 1
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "stage09_chunks_invalid",
                    "message": f"Stage 09 chunk payload invalid: {s09_errs}",
                    "s09": str(s09_path),
                })
                check_counts["error:stage09_chunks_invalid"] += 1

        # Stage 01 download integrity: at least one .wav exists for this video id (raw16k/clean16k/legacy).
        if not s01_candidates:
            missing_s01.append(vid)
            sev = "warning" if args.skip_stage01_presence else "error"
            msg = (
                "No Stage 01 .wav found for this video_id "
                "(download incomplete/mis-filed or Stage 01 artifacts are not retained)"
            )
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": sev,
                "check": "missing_stage01_audio",
                "message": msg,
                "manifest_folder": folder_text,
            })
            check_counts[f"{sev}:missing_stage01_audio"] += 1

        # Stage 07 per-file validation handling
        if s07_path and not s07v_path:
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "warning",
                "check": "missing_stage07_validation",
                "message": "Stage 07 enriched output exists but no .validation.json was found",
                "s07": str(s07_path),
            })
            check_counts["warning:missing_stage07_validation"] += 1

        if (not s07_path) and s07v_path:
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "error",
                "check": "stage07_partial_write",
                "message": "Stage 07 validation exists but enriched output is missing (partial write / validation failure)",
                "s07_validation": str(s07v_path),
            })
            check_counts["error:stage07_partial_write"] += 1

        if s07v_path:
            s07v = _load_json(s07v_path)
            if not s07v:
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "warning",
                    "check": "unreadable_stage07_validation",
                    "message": "Could not read Stage 07 validation JSON",
                    "s07_validation": str(s07v_path),
                })
                check_counts["warning:unreadable_stage07_validation"] += 1
            else:
                summary = s07v.get("summary", {})
                v_err = summary.get("errors", 0)
                v_warn = summary.get("warnings", 0)
                if isinstance(v_err, int) and v_err:
                    stage07_val_errors += v_err
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "error",
                        "check": "stage07_validation_errors",
                        "message": f"Stage 07 validation reports {v_err} error(s)",
                        "s07_validation": str(s07v_path),
                    })
                    check_counts["error:stage07_validation_errors"] += 1
                if isinstance(v_warn, int) and v_warn:
                    stage07_val_warnings += v_warn

                    # Summarize warning types for this video (avoid spamming per-warning issues).
                    w_counts: Counter = Counter()
                    for r in s07v.get("results", []) or []:
                        if r.get("severity") == "warning":
                            w_counts[r.get("check", "unknown")] += 1
                            stage07_warning_types[r.get("check", "unknown")] += 1

                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "warning",
                        "check": "stage07_validation_warnings",
                        "message": f"Stage 07 validation reports {v_warn} warning(s): {dict(w_counts)}",
                        "s07_validation": str(s07v_path),
                    })
                    check_counts["warning:stage07_validation_warnings"] += 1

        verdict: Optional[str] = None
        if not v_path:
            missing_verify.append(vid)
        else:
            stage06b_checked_files += 1
            verdict, v_errs = _validate_verification_payload(v_path, vid)
            if v_errs:
                stage06b_invalid_files += 1
                invalid_verify.append(vid)
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "stage06b_verification_invalid",
                    "message": f"Stage 06b verification payload invalid: {v_errs}",
                    "verify": str(v_path),
                })
                check_counts["error:stage06b_verification_invalid"] += 1
            if verdict:
                verdict_counts[verdict] += 1

        s07_data: Optional[Dict[str, Any]] = None
        stage07_content_unreadable = False
        if s07_path:
            s07_loaded = _load_json(s07_path)
            if isinstance(s07_loaded, dict):
                s07_data = s07_loaded
                stage07_metrics_videos += 1

                damage_metrics = _compute_stage07_damage_metrics(s07_data)
                anchor_metrics = _compute_stage07_anchor_drop_ratio(s07_data)

                video_damaged_token_ratio = float(damage_metrics.get("video_damaged_token_ratio", 0.0) or 0.0)
                video_dropped_anchor_ratio = float(anchor_metrics.get("dropped_anchor_ratio", 0.0) or 0.0)
                video_max_conv_damaged_token_ratio = float(
                    damage_metrics.get("max_conversation_damaged_token_ratio", 0.0) or 0.0
                )

                stage07_max_video_damaged_token_ratio = max(
                    stage07_max_video_damaged_token_ratio,
                    video_damaged_token_ratio,
                )
                stage07_max_video_dropped_anchor_ratio = max(
                    stage07_max_video_dropped_anchor_ratio,
                    video_dropped_anchor_ratio,
                )

                stage07_segments_total += int(damage_metrics.get("segments_total", 0) or 0)
                stage07_damaged_segments_total += int(damage_metrics.get("damaged_segments_total", 0) or 0)
                stage07_token_total += int(damage_metrics.get("token_total", 0) or 0)
                stage07_damaged_token_total += int(damage_metrics.get("damaged_token_total", 0) or 0)
                stage07_kept_anchor_total += int(anchor_metrics.get("kept_anchor_total", 0) or 0)
                stage07_dropped_anchor_total += int(anchor_metrics.get("dropped_anchor_total", 0) or 0)

                _merge_string_int_hist(stage07_damage_type_hist, damage_metrics.get("damage_type_hist"))
                _merge_string_int_hist(
                    stage07_contamination_source_hist,
                    damage_metrics.get("contamination_source_hist"),
                )
                _merge_string_int_hist(
                    stage07_anchor_drop_reason_hist,
                    anchor_metrics.get("anchor_drop_reason_counts"),
                )

                stage07_damage_ratio_by_video.append({
                    "video_id": vid,
                    "source": src,
                    "video_damaged_token_ratio": round(video_damaged_token_ratio, 6),
                    "max_conversation_damaged_token_ratio": round(video_max_conv_damaged_token_ratio, 6),
                })
                stage07_anchor_ratio_by_video.append({
                    "video_id": vid,
                    "source": src,
                    "dropped_anchor_ratio": round(video_dropped_anchor_ratio, 6),
                    "dropped_anchor_total": int(anchor_metrics.get("dropped_anchor_total", 0) or 0),
                    "kept_anchor_total": int(anchor_metrics.get("kept_anchor_total", 0) or 0),
                })

                if (
                    args.max_damaged_token_ratio is not None
                    and video_damaged_token_ratio > float(args.max_damaged_token_ratio)
                ):
                    damage_budget_violations.append({
                        "video_id": vid,
                        "source": src,
                        "video_damaged_token_ratio": round(video_damaged_token_ratio, 6),
                        "threshold": float(args.max_damaged_token_ratio),
                    })
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "error",
                        "check": "stage07_damaged_token_ratio_budget_exceeded",
                        "message": (
                            "Stage 07 damaged-token ratio budget exceeded: "
                            f"{video_damaged_token_ratio:.3f} > {float(args.max_damaged_token_ratio):.3f}"
                        ),
                        "s07": str(s07_path),
                    })
                    check_counts["error:stage07_damaged_token_ratio_budget_exceeded"] += 1

                if (
                    args.max_dropped_anchor_ratio is not None
                    and video_dropped_anchor_ratio > float(args.max_dropped_anchor_ratio)
                ):
                    anchor_budget_violations.append({
                        "video_id": vid,
                        "source": src,
                        "dropped_anchor_ratio": round(video_dropped_anchor_ratio, 6),
                        "threshold": float(args.max_dropped_anchor_ratio),
                    })
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "error",
                        "check": "stage07_dropped_anchor_ratio_budget_exceeded",
                        "message": (
                            "Stage 07 dropped-anchor ratio budget exceeded: "
                            f"{video_dropped_anchor_ratio:.3f} > {float(args.max_dropped_anchor_ratio):.3f}"
                        ),
                        "s07": str(s07_path),
                    })
                    check_counts["error:stage07_dropped_anchor_ratio_budget_exceeded"] += 1

                drop_contract = _validate_stage07_drop_reason_contract(s07_data)
                if drop_contract.get("present"):
                    missing_reason = int(drop_contract.get("missing_reason_code", 0) or 0)
                    if missing_reason > 0:
                        issues.append({
                            "video_id": vid,
                            "source": src,
                            "severity": "error",
                            "check": "stage07_drop_reason_code_missing",
                            "message": (
                                "Stage 07 dropped_candidates missing reason_code/reason in "
                                f"{missing_reason} item(s)"
                            ),
                            "s07": str(s07_path),
                        })
                        check_counts["error:stage07_drop_reason_code_missing"] += 1
                    unknown_reasons = drop_contract.get("unknown_reason_code", [])
                    if isinstance(unknown_reasons, list) and unknown_reasons:
                        issues.append({
                            "video_id": vid,
                            "source": src,
                            "severity": "error",
                            "check": "stage07_drop_reason_code_unknown",
                            "message": f"Stage 07 dropped_candidates has unknown reason_code(s): {unknown_reasons}",
                            "s07": str(s07_path),
                        })
                        check_counts["error:stage07_drop_reason_code_unknown"] += 1
                    missing_damage = int(drop_contract.get("missing_damage_reason_for_segment", 0) or 0)
                    if missing_damage > 0:
                        issues.append({
                            "video_id": vid,
                            "source": src,
                            "severity": "warning",
                            "check": "stage07_drop_damage_reason_missing",
                            "message": (
                                "Stage 07 dropped segment candidates missing damage_reason_code: "
                                f"{missing_damage}"
                            ),
                            "s07": str(s07_path),
                        })
                        check_counts["warning:stage07_drop_damage_reason_missing"] += 1
                    missing_source_stage = int(drop_contract.get("missing_source_stage", 0) or 0)
                    if missing_source_stage > 0:
                        issues.append({
                            "video_id": vid,
                            "source": src,
                            "severity": "error",
                            "check": "stage07_drop_source_stage_missing",
                            "message": (
                                "Stage 07 dropped_candidates missing source_stage in "
                                f"{missing_source_stage} item(s)"
                            ),
                            "s07": str(s07_path),
                        })
                        check_counts["error:stage07_drop_source_stage_missing"] += 1
                    missing_timestamp = int(drop_contract.get("missing_timestamp", 0) or 0)
                    if missing_timestamp > 0:
                        issues.append({
                            "video_id": vid,
                            "source": src,
                            "severity": "error",
                            "check": "stage07_drop_timestamp_missing",
                            "message": (
                                "Stage 07 dropped_candidates missing timestamp in "
                                f"{missing_timestamp} item(s)"
                            ),
                            "s07": str(s07_path),
                        })
                        check_counts["error:stage07_drop_timestamp_missing"] += 1

                # Stage 07 normalization metadata (best-effort drift repairs)
                meta = s07_data.get("metadata", {}) if isinstance(s07_data, dict) else {}
                repairs = meta.get("normalization_repairs_count", 0)
                if isinstance(repairs, int) and repairs > 0:
                    stage07_videos_with_repairs += 1
                    stage07_normalization_repairs_total += repairs
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "warning",
                        "check": "stage07_normalization_repairs",
                        "message": f"Stage 07 applied {repairs} normalization repair(s) before validation",
                        "s07": str(s07_path),
                    })
                    check_counts["warning:stage07_normalization_repairs"] += 1
            else:
                stage07_content_unreadable = True
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "unreadable_stage07_content",
                    "message": "Could not read Stage 07 enriched JSON",
                    "s07": str(s07_path),
                })
                check_counts["error:unreadable_stage07_content"] += 1

        # Run cross-stage validation when we have both sides.
        # Prefer 06c.DET.patched, fall back to 06.LLM.video-type if needed.
        s06_for_cross = s06c_path or s06_path
        if s06_for_cross and s07_path:
            s06_data = _load_json(s06_for_cross)
            if not s06_data or not s07_data:
                if (not s06_data) or (not stage07_content_unreadable):
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "error",
                        "check": "unreadable_json",
                        "message": "Could not read stage JSON for cross-stage validation",
                        "s06": str(s06_for_cross),
                        "s07": str(s07_path),
                    })
                    check_counts["error:unreadable_json"] += 1
                    cross_stage_errors += 1
                continue

            validated_pairs += 1
            results = validate_cross_stage.validate_cross_stage(s06_data, s07_data, vid)
            for r in results:
                if r.severity == "info":
                    continue
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": r.severity,
                    "check": r.check,
                    "message": r.message,
                    "s06": str(s06_for_cross),
                    "s07": str(s07_path),
                })
                check_counts[f"{r.severity}:{r.check}"] += 1
                if r.severity == "error":
                    cross_stage_errors += 1
                elif r.severity == "warning":
                    cross_stage_warnings += 1

    waivers_applied = 0
    if waiver_rules:
        for issue in issues:
            sev = issue.get("severity")
            if sev not in {"error", "warning"}:
                continue
            match = _find_matching_waiver(issue, waiver_rules)
            if match is not None:
                issue["waived"] = True
                issue["original_severity"] = sev
                issue["severity"] = "info"
                issue["waiver"] = {
                    "video_id": match.video_id,
                    "check": match.check,
                    "note": match.note,
                    "expires_at": match.expires_at,
                }
                waivers_applied += 1

    quarantine_applied = 0
    if quarantine_video_ids:
        for issue in issues:
            sev = issue.get("severity")
            if sev not in {"error", "warning"}:
                continue
            vid = str(issue.get("video_id", "")).strip()
            if vid in quarantine_video_ids:
                issue["quarantined"] = True
                issue["original_severity"] = sev
                issue["severity"] = "info"
                issue["quarantine"] = {
                    "video_id": vid,
                    "file": str(quarantine_file_path) if quarantine_file_path else None,
                }
                quarantine_applied += 1

    for issue in issues:
        _annotate_issue_canonical(issue)

    # Recompute check counts after waiver application to keep summary/gates consistent.
    check_counts = Counter()
    for issue in issues:
        sev = issue.get("severity")
        chk = issue.get("check", "unknown")
        if sev in {"error", "warning"}:
            check_counts[f"{sev}:{chk}"] += 1

    quarantine_severities = {"error"} if args.quarantine_level == "error" else {"error", "warning"}
    quarantine_items: Dict[str, Dict[str, Any]] = {}
    if emit_quarantine and quarantine_file_path and quarantine_file_path.exists():
        # Preserve existing quarantine membership/reasons when re-emitting so
        # stage-derived quarantines (for example 06b REJECT) are never dropped
        # by a later validation-only quarantine write.
        try:
            existing_quarantine_raw = json.loads(
                quarantine_file_path.read_text(encoding="utf-8")
            )
        except Exception:
            existing_quarantine_raw = None

        if isinstance(existing_quarantine_raw, dict):
            existing_videos = existing_quarantine_raw.get("videos")
            if isinstance(existing_videos, list):
                for existing_item in existing_videos:
                    if not isinstance(existing_item, dict):
                        continue
                    vid = str(existing_item.get("video_id", "")).strip()
                    if not vid or vid not in manifest_ids:
                        continue
                    checks_raw = existing_item.get("checks")
                    checks_set: Set[str] = set()
                    if isinstance(checks_raw, list):
                        checks_set = {
                            str(v).strip()
                            for v in checks_raw
                            if isinstance(v, str) and str(v).strip()
                        }
                    reasons_raw = existing_item.get("reasons")
                    reasons_list: List[Dict[str, str]] = []
                    if isinstance(reasons_raw, list):
                        for reason in reasons_raw:
                            if not isinstance(reason, dict):
                                continue
                            reasons_list.append(
                                {
                                    "severity": str(reason.get("severity", "")),
                                    "check": str(reason.get("check", "unknown")),
                                    "message": str(reason.get("message", ""))[:300],
                                    "issue_severity": str(reason.get("issue_severity", "")),
                                    "gate_decision": str(reason.get("gate_decision", "")),
                                    "scope_type": str(reason.get("scope_type", "")),
                                    "issue_code": str(reason.get("issue_code", "")),
                                    "signal_class": str(reason.get("signal_class", "")),
                                    "remediation_path": str(reason.get("remediation_path", "")),
                                }
                            )
                    quarantine_items[vid] = {
                        "video_id": vid,
                        "source": existing_item.get("source") or source_by_vid.get(vid),
                        "checks": checks_set,
                        "reasons": reasons_list,
                    }

        for vid in sorted(quarantine_video_ids):
            if vid not in manifest_ids:
                continue
            item = quarantine_items.setdefault(
                vid,
                {
                    "video_id": vid,
                    "source": source_by_vid.get(vid),
                    "checks": set(),
                    "reasons": [],
                },
            )
            if "preexisting_quarantine" not in item["checks"]:
                item["checks"].add("preexisting_quarantine")
                item["reasons"].append(
                    {
                        "severity": "error",
                        "check": "preexisting_quarantine",
                        "message": "Video is quarantined by prior run input.",
                        "issue_severity": "",
                        "gate_decision": "block",
                        "scope_type": "video",
                        "issue_code": "preexisting_quarantine",
                        "signal_class": "quarantine_gate",
                        "remediation_path": "quarantine",
                    }
                )

    if emit_quarantine:
        for issue in issues:
            sev = str(issue.get("severity", "")).strip().lower()
            if sev not in quarantine_severities:
                continue
            vid = str(issue.get("video_id", "")).strip()
            if not vid or vid == "*" or vid not in manifest_ids:
                continue
            item = quarantine_items.setdefault(
                vid,
                {
                    "video_id": vid,
                    "source": source_by_vid.get(vid),
                    "checks": set(),
                    "reasons": [],
                },
            )
            item["checks"].add(str(issue.get("check", "unknown")))
            msg = str(issue.get("message", "")).strip()
            item["reasons"].append({
                "severity": sev,
                "check": str(issue.get("check", "unknown")),
                "message": msg[:300],
                "issue_severity": str(issue.get("issue_severity", "")),
                "gate_decision": str(issue.get("gate_decision", "")),
                "scope_type": str(issue.get("scope_type", "")),
                "issue_code": str(issue.get("issue_code", "")),
                "signal_class": str(issue.get("signal_class", "")),
                "remediation_path": str(issue.get("remediation_path", "")),
            })

        for item in quarantine_items.values():
            item["checks"] = sorted(item["checks"])
            seen_reason_keys: Set[Tuple[str, str]] = set()
            deduped: List[Dict[str, str]] = []
            for r in item["reasons"]:
                key = (r.get("severity", ""), r.get("check", ""))
                if key in seen_reason_keys:
                    continue
                seen_reason_keys.add(key)
                deduped.append(r)
            item["reasons"] = deduped

        quarantined_videos = sorted(quarantine_items.keys())
        if quarantine_out_path is not None:
            try:
                quarantine_out_path.parent.mkdir(parents=True, exist_ok=True)
                quarantine_payload = {
                    "version": 1,
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "manifest": str(manifest_path),
                    "source_filter": args.source or None,
                    "quarantine_level": args.quarantine_level,
                    "video_count": len(manifest_ids),
                    "quarantined_video_count": len(quarantined_videos),
                    "quarantined_video_ids": quarantined_videos,
                    "videos": [quarantine_items[vid] for vid in quarantined_videos],
                }
                quarantine_out_path.write_text(json.dumps(quarantine_payload, indent=2) + "\n", encoding="utf-8")
            except Exception as exc:
                print(f"{LOG_PREFIX} ERROR: Could not emit quarantine file {quarantine_out_path}: {exc}", file=sys.stderr)
                sys.exit(2)

    canonical_gate_payload: Optional[Dict[str, Any]] = None
    canonical_gate_out_path: Optional[Path] = None
    if emit_canonical_gate:
        if args.canonical_gate_out:
            canonical_gate_out_path = Path(args.canonical_gate_out)
            if not canonical_gate_out_path.is_absolute():
                canonical_gate_out_path = repo_root() / canonical_gate_out_path
        else:
            canonical_gate_out_path = _default_gate_path(manifest_path, args.source)

        global_signals = [i for i in issues if str(i.get("video_id", "")).strip() == "*"]
        issues_by_vid: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
        for issue in issues:
            vid = str(issue.get("video_id", "")).strip()
            if vid and vid != "*" and vid in manifest_ids:
                issues_by_vid[vid].append(issue)

        summary_counts = {"pass": 0, "review": 0, "block": 0}
        signal_class_counts: Counter[str] = Counter()
        videos_payload: List[Dict[str, Any]] = []
        for vid in sorted(manifest_ids):
            raw_signals = list(global_signals) + list(issues_by_vid.get(vid, []))
            gate = "pass"
            signals_payload: List[Dict[str, Any]] = []
            for sig in raw_signals:
                sig_gate = str(sig.get("gate_decision", "pass")).strip().lower()
                if sig_gate not in {"pass", "review", "block"}:
                    sig_gate = "pass"
                if sig_gate == "block":
                    gate = "block"
                elif sig_gate == "review" and gate != "block":
                    gate = "review"
                signals_payload.append(
                    {
                        "issue_code": str(sig.get("issue_code", "")),
                        "issue_severity": str(sig.get("issue_severity", "")),
                        "gate_decision": sig_gate,
                        "signal_class": str(sig.get("signal_class", "")),
                        "remediation_path": str(sig.get("remediation_path", "")),
                        "scope_type": str(sig.get("scope_type", "")),
                        "origin_stage": str(sig.get("origin_stage", "manifest-validation")),
                        "message": str(sig.get("message", "")),
                        "legacy": {
                            "severity": sig.get("severity"),
                            "check": sig.get("check"),
                        },
                    }
                )

            summary_counts[gate] += 1
            for signal in signals_payload:
                sclass = str(signal.get("signal_class", "")).strip()
                if sclass:
                    signal_class_counts[sclass] += 1
            videos_payload.append(
                {
                    "video_id": vid,
                    "source": source_by_vid.get(vid),
                    "gate_decision": gate,
                    "signals": signals_payload,
                }
            )

        canonical_gate_payload = {
            "version": 1,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "manifest": str(manifest_path),
            "source_filter": args.source or None,
            "summary": {
                "video_count": len(manifest_ids),
                "pass": summary_counts["pass"],
                "review": summary_counts["review"],
                "block": summary_counts["block"],
                "signal_class_counts": dict(signal_class_counts),
            },
            "videos": videos_payload,
        }
        if canonical_gate_out_path is not None:
            try:
                canonical_gate_out_path.parent.mkdir(parents=True, exist_ok=True)
                canonical_gate_out_path.write_text(
                    json.dumps(canonical_gate_payload, indent=2) + "\n",
                    encoding="utf-8",
                )
            except Exception as exc:
                print(
                    f"{LOG_PREFIX} ERROR: Could not emit canonical gate file {canonical_gate_out_path}: {exc}",
                    file=sys.stderr,
                )
                sys.exit(2)

    if args.emit_stage_reports and stage_reports_dir is not None:
        try:
            stage_reports_dir.mkdir(parents=True, exist_ok=True)
            issues_by_vid: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
            global_issues: List[Dict[str, Any]] = []
            for issue in issues:
                vid = str(issue.get("video_id", "")).strip()
                if vid == "*":
                    global_issues.append(issue)
                elif vid in manifest_ids:
                    issues_by_vid[vid].append(issue)

            for vid in sorted(manifest_ids):
                raw_issues = list(global_issues) + list(issues_by_vid.get(vid, []))
                artifact_paths: Set[str] = set()

                for p in (video_artifacts.get(vid) or {}).values():
                    if isinstance(p, str) and p.strip():
                        artifact_paths.add(p)

                for issue in raw_issues:
                    for key in ("s01", "s05", "s06", "s06c", "s07", "s07_validation", "verify", "s09", "stage08_report"):
                        p = issue.get(key)
                        if isinstance(p, str) and p.strip():
                            artifact_paths.add(p)

                report_obj = _build_video_stage_report(
                    video_id=vid,
                    source=source_by_vid.get(vid, ""),
                    stem=folder_by_vid.get(vid, vid),
                    manifest_path=manifest_path,
                    raw_issues=raw_issues,
                    artifact_paths=artifact_paths,
                    started_at=started_at_iso,
                    finished_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    elapsed_sec=time.time() - start,
                )
                out_path = stage_reports_dir / f"{vid}.manifest-validation.report.json"
                out_path.write_text(json.dumps(report_obj, indent=2) + "\n", encoding="utf-8")
                stage_reports_emitted += 1
        except Exception as exc:
            print(f"{LOG_PREFIX} ERROR: Could not emit stage reports to {stage_reports_dir}: {exc}", file=sys.stderr)
            sys.exit(2)

    elapsed = time.time() - start

    errors = sum(1 for i in issues if i.get("severity") == "error")
    warnings = sum(1 for i in issues if i.get("severity") == "warning")

    # In text mode, compute a simple pass/fail heuristic that matches how we'd use this in CI.
    # "Complete" here means: for manifest videos, 06c + 07 + 06b verification exist.
    # Completeness should be measured on the active processing scope:
    # remove user-quarantined items.
    effective_manifest_ids = {
        vid
        for vid in manifest_ids
        if vid not in quarantine_video_ids
    }
    missing_verify_effective = sum(1 for vid in missing_verify if vid in effective_manifest_ids)
    missing_s05_effective = sum(1 for vid in missing_s05 if vid in effective_manifest_ids)
    missing_s06c_effective = sum(1 for vid in missing_s06c if vid in effective_manifest_ids)
    missing_s07_effective = sum(1 for vid in missing_s07 if vid in effective_manifest_ids)
    missing_s09_effective = sum(1 for vid in missing_s09 if vid in effective_manifest_ids)

    complete = (
        missing_verify_effective == 0
        and (not args.check_stage05_audio or missing_s05_effective == 0)
        and missing_s06c_effective == 0
        and missing_s07_effective == 0
        and (not args.check_stage09_chunks or missing_s09_effective == 0)
    )
    passed = complete and errors == 0 and (warnings == 0 if args.strict else True)

    stage07_manifest_damaged_token_ratio = (
        (stage07_damaged_token_total / stage07_token_total) if stage07_token_total > 0 else 0.0
    )
    stage07_manifest_damaged_segment_ratio = (
        (stage07_damaged_segments_total / stage07_segments_total) if stage07_segments_total > 0 else 0.0
    )
    stage07_manifest_dropped_anchor_ratio = (
        (stage07_dropped_anchor_total / (stage07_kept_anchor_total + stage07_dropped_anchor_total))
        if (stage07_kept_anchor_total + stage07_dropped_anchor_total) > 0
        else 0.0
    )

    worst_damaged_videos = sorted(
        stage07_damage_ratio_by_video,
        key=lambda row: float(row.get("video_damaged_token_ratio", 0.0) or 0.0),
        reverse=True,
    )[:10]
    worst_anchor_videos = sorted(
        stage07_anchor_ratio_by_video,
        key=lambda row: float(row.get("dropped_anchor_ratio", 0.0) or 0.0),
        reverse=True,
    )[:10]

    audit_sample_size = max(1, math.ceil(len(manifest_ids) / 100))
    fixed_random_sample_video_ids = sorted(
        manifest_ids,
        key=lambda video_id: hashlib.sha1(
            f"{manifest_path.name}|{args.source or 'all'}|{video_id}".encode("utf-8")
        ).hexdigest(),
    )[:audit_sample_size]
    damage_ratio_lookup: Dict[str, float] = {}
    for row in stage07_damage_ratio_by_video:
        video_id = str(row.get("video_id", "")).strip()
        if not video_id:
            continue
        damage_ratio_lookup[video_id] = float(row.get("video_damaged_token_ratio", 0.0) or 0.0)
    anchor_ratio_lookup: Dict[str, float] = {}
    for row in stage07_anchor_ratio_by_video:
        video_id = str(row.get("video_id", "")).strip()
        if not video_id:
            continue
        anchor_ratio_lookup[video_id] = float(row.get("dropped_anchor_ratio", 0.0) or 0.0)
    worst_case_candidates = sorted(
        manifest_ids,
        key=lambda video_id: (
            max(damage_ratio_lookup.get(video_id, 0.0), anchor_ratio_lookup.get(video_id, 0.0)),
            damage_ratio_lookup.get(video_id, 0.0),
            anchor_ratio_lookup.get(video_id, 0.0),
            video_id,
        ),
        reverse=True,
    )[:audit_sample_size]
    worst_case_samples = [
        {
            "video_id": video_id,
            "risk_score": round(max(damage_ratio_lookup.get(video_id, 0.0), anchor_ratio_lookup.get(video_id, 0.0)), 6),
            "video_damaged_token_ratio": round(damage_ratio_lookup.get(video_id, 0.0), 6),
            "dropped_anchor_ratio": round(anchor_ratio_lookup.get(video_id, 0.0), 6),
        }
        for video_id in worst_case_candidates
    ]

    stage07_drift_summary = {
        "videos_with_metrics": stage07_metrics_videos,
        "damage": {
            "segments_total": stage07_segments_total,
            "damaged_segments_total": stage07_damaged_segments_total,
            "video_damaged_segment_ratio": round(stage07_manifest_damaged_segment_ratio, 6),
            "tokens_total": stage07_token_total,
            "damaged_tokens_total": stage07_damaged_token_total,
            "video_damaged_token_ratio": round(stage07_manifest_damaged_token_ratio, 6),
            "max_video_damaged_token_ratio": round(stage07_max_video_damaged_token_ratio, 6),
            "worst_videos": worst_damaged_videos,
        },
        "anchors": {
            "kept_total": stage07_kept_anchor_total,
            "dropped_total": stage07_dropped_anchor_total,
            "dropped_anchor_ratio": round(stage07_manifest_dropped_anchor_ratio, 6),
            "max_video_dropped_anchor_ratio": round(stage07_max_video_dropped_anchor_ratio, 6),
            "worst_videos": worst_anchor_videos,
        },
        "histograms": {
            "damage_types": dict(stage07_damage_type_hist),
            "contamination_sources": dict(stage07_contamination_source_hist),
            "anchor_drop_reasons": dict(stage07_anchor_drop_reason_hist),
        },
        "budgets": {
            "max_damaged_token_ratio": args.max_damaged_token_ratio,
            "max_dropped_anchor_ratio": args.max_dropped_anchor_ratio,
            "damaged_token_ratio_violations": damage_budget_violations,
            "dropped_anchor_ratio_violations": anchor_budget_violations,
        },
        "audit_sampling": {
            "videos_per_100": audit_sample_size,
            "fixed_random_sample_video_ids": fixed_random_sample_video_ids,
            "worst_case_samples": worst_case_samples,
        },
    }

    damage_drift_out_path: Optional[Path] = None
    if args.damage_drift_out:
        damage_drift_out_path = Path(args.damage_drift_out)
        if not damage_drift_out_path.is_absolute():
            damage_drift_out_path = repo_root() / damage_drift_out_path

    report = {
        "validated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "manifest": str(manifest_path),
        "source_filter": args.source or None,
        "video_count": len(manifest_ids),
        "effective_video_count": len(effective_manifest_ids),
        "artifact_presence": {
            "missing_01_download": len(missing_s01),
            "missing_06b_verify": len(missing_verify),
            "invalid_06b_verify": len(invalid_verify),
            **({"missing_05_audio_features": len(missing_s05)} if args.check_stage05_audio else {}),
            "missing_06c_patched": len(missing_s06c),
            "missing_07_content": len(missing_s07),
            **({"missing_09_chunks": len(missing_s09)} if args.check_stage09_chunks else {}),
        },
        "stage01_presence_required": not bool(args.skip_stage01_presence),
        "stage08_report_required": bool(args.check_stage08_report),
        "stage05_audio_required": bool(args.check_stage05_audio),
        "stage09_chunks_required": bool(args.check_stage09_chunks),
        "verification_verdicts": dict(verdict_counts),
        "stage06b_validation": {
            "checked_files": stage06b_checked_files,
            "invalid_files": stage06b_invalid_files,
        },
        "stage07_validation": {
            "errors": stage07_val_errors,
            "warnings": stage07_val_warnings,
            "warning_types": dict(stage07_warning_types),
            "normalization_repairs_total": stage07_normalization_repairs_total,
            "videos_with_repairs": stage07_videos_with_repairs,
        },
        "cross_stage": {
            "validated_pairs": validated_pairs,
            "errors": cross_stage_errors,
            "warnings": cross_stage_warnings,
        },
        "stage09_validation": (
            {
                "checked_files": stage09_checked_files,
                "invalid_files": stage09_invalid_files,
            }
            if args.check_stage09_chunks
            else None
        ),
        "stage05_validation": (
            {
                "checked_files": stage05_checked_files,
                "invalid_files": stage05_invalid_files,
            }
            if args.check_stage05_audio
            else None
        ),
        "stage08_validation": (
            {
                "checked": stage08_checked,
                "status": stage08_status,
                "report": str(stage08_report_path) if stage08_report_path else None,
                "blocked_videos": len(stage08_blocked_video_ids),
                "blocked_video_ids": sorted(stage08_blocked_video_ids),
            }
            if args.check_stage08_report
            else None
        ),
        "stage_reports": {
            "enabled": bool(args.emit_stage_reports),
            "dir": str(stage_reports_dir) if stage_reports_dir else None,
            "emitted": stage_reports_emitted,
        },
        "quarantine": {
            "enabled": emit_quarantine,
            "level": args.quarantine_level,
            "out": str(quarantine_out_path) if quarantine_out_path else None,
            "videos": len(quarantined_videos),
            "input_file": str(quarantine_file_path) if quarantine_file_path else None,
            "input_video_ids": len(quarantine_video_ids),
            "applied": quarantine_applied,
        },
        "canonical_gate": {
            "enabled": emit_canonical_gate,
            "out": str(canonical_gate_out_path) if canonical_gate_out_path else None,
            "summary": (canonical_gate_payload or {}).get("summary"),
        },
        "waivers": {
            "enabled": bool(waiver_rules or waiver_rules_expired),
            "file": str(waiver_file_path) if waiver_file_path else None,
            "rules": len(waiver_rules) + len(waiver_rules_expired),
            "active_rules": len(waiver_rules),
            "expired_rules": len(waiver_rules_expired),
            "applied": waivers_applied,
        },
        "issues_summary": {
            "errors": errors,
            "warnings": warnings,
        },
        "canonical_summary": {
            "gate_decisions": dict(Counter(str(i.get("gate_decision", "")) for i in issues)),
            "issue_severity": dict(Counter(str(i.get("issue_severity", "")) for i in issues)),
        },
        "stage07_drift": stage07_drift_summary,
        "check_counts": dict(check_counts),
        "passed": passed,
        "strict": bool(args.strict),
        "elapsed_sec": round(elapsed, 2),
        "issues": issues,
    }

    if damage_drift_out_path is not None:
        try:
            damage_drift_out_path.parent.mkdir(parents=True, exist_ok=True)
            drift_payload = {
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "manifest": str(manifest_path),
                "source_filter": args.source or None,
                "video_count": len(manifest_ids),
                "stage07_drift": stage07_drift_summary,
            }
            damage_drift_out_path.write_text(json.dumps(drift_payload, indent=2) + "\n", encoding="utf-8")
        except Exception as exc:
            print(
                f"{LOG_PREFIX} ERROR: Could not emit damage drift report {damage_drift_out_path}: {exc}",
                file=sys.stderr,
            )
            sys.exit(2)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{LOG_PREFIX} Manifest: {manifest_path}")
        print(f"{LOG_PREFIX} Videos: {len(manifest_ids)}")
        if quarantine_video_ids:
            print(
                f"{LOG_PREFIX} Quarantine input: {len(quarantine_video_ids)} video(s) "
                f"(effective gate scope={len(effective_manifest_ids)})"
                + (f", file={quarantine_file_path}" if quarantine_file_path else "")
            )
        if args.source:
            print(f"{LOG_PREFIX} Source filter: {args.source}")

        print(f"{LOG_PREFIX} 06b.LLM.verify verdicts: {dict(verdict_counts) or '{}'}")

        print(
            f"{LOG_PREFIX} Presence: missing 01.download={len(missing_s01)}, "
            f"missing 06b.LLM.verify={len(missing_verify)}, invalid 06b.LLM.verify={len(invalid_verify)}, "
            f"missing 06c.DET.patched={len(missing_s06c)}, missing 07.LLM.content={len(missing_s07)}"
            + (f", missing 05.audio_features={len(missing_s05)}" if args.check_stage05_audio else "")
            + (f", missing 09.EXT.chunks={len(missing_s09)}" if args.check_stage09_chunks else "")
        )
        print(
            f"{LOG_PREFIX} Stage 06b verification check: "
            f"checked={stage06b_checked_files}, invalid={stage06b_invalid_files}"
        )
        if args.check_stage05_audio:
            print(
                f"{LOG_PREFIX} Stage 05 audio_features check: enabled "
                f"(checked={stage05_checked_files}, invalid={stage05_invalid_files})"
            )
        if args.skip_stage01_presence:
            print(f"{LOG_PREFIX} Stage 01 presence check: optional (--skip-stage01-presence)")
        if args.check_stage09_chunks:
            print(
                f"{LOG_PREFIX} Stage 09 chunk check: enabled "
                f"(checked={stage09_checked_files}, invalid={stage09_invalid_files})"
            )
        if args.check_stage08_report:
            print(
                f"{LOG_PREFIX} Stage 08 report check: enabled "
                f"(status={stage08_status or 'unknown'}, blocked_videos={len(stage08_blocked_video_ids)}, "
                f"report={str(stage08_report_path) if stage08_report_path else 'n/a'})"
            )
        if args.emit_stage_reports:
            print(
                f"{LOG_PREFIX} Stage reports: enabled "
                f"(emitted={stage_reports_emitted}, dir={stage_reports_dir})"
            )
        if emit_quarantine:
            print(
                f"{LOG_PREFIX} Quarantine: enabled "
                f"(level={args.quarantine_level}, videos={len(quarantined_videos)}, out={quarantine_out_path}"
                + (
                    f", input_video_ids={len(quarantine_video_ids)}, applied_issues={quarantine_applied}"
                    if quarantine_video_ids
                    else ""
                )
                + ")"
            )
        if emit_canonical_gate:
            gate_summary = (canonical_gate_payload or {}).get("summary", {}) if canonical_gate_payload else {}
            print(
                f"{LOG_PREFIX} Canonical gate: enabled "
                f"(pass={gate_summary.get('pass', 0)}, review={gate_summary.get('review', 0)}, "
                f"block={gate_summary.get('block', 0)}, out={canonical_gate_out_path})"
            )
        if quarantine_video_ids and not emit_quarantine:
            print(
                f"{LOG_PREFIX} Quarantine input applied: "
                f"(video_ids={len(quarantine_video_ids)}, applied_issues={quarantine_applied}, file={quarantine_file_path})"
            )
        if waiver_rules or waiver_rules_expired:
            print(
                f"{LOG_PREFIX} Waivers: enabled "
                f"(rules={len(waiver_rules) + len(waiver_rules_expired)}, "
                f"active={len(waiver_rules)}, expired={len(waiver_rules_expired)}, "
                f"applied={waivers_applied}, file={waiver_file_path})"
            )

        print(
            f"{LOG_PREFIX} Cross-stage: validated_pairs={validated_pairs}, "
            f"errors={cross_stage_errors}, warnings={cross_stage_warnings}"
        )
        if stage07_val_errors or stage07_val_warnings or stage07_normalization_repairs_total:
            print(
                f"{LOG_PREFIX} Stage07 validation: errors={stage07_val_errors}, warnings={stage07_val_warnings}, "
                f"normalization_repairs={stage07_normalization_repairs_total}"
            )
        if stage07_metrics_videos:
            print(
                f"{LOG_PREFIX} Stage07 drift: videos={stage07_metrics_videos}, "
                f"damaged_token_ratio={stage07_manifest_damaged_token_ratio:.3f}, "
                f"dropped_anchor_ratio={stage07_manifest_dropped_anchor_ratio:.3f}, "
                f"max_video_damaged_token_ratio={stage07_max_video_damaged_token_ratio:.3f}, "
                f"max_video_dropped_anchor_ratio={stage07_max_video_dropped_anchor_ratio:.3f}"
            )
        if args.max_damaged_token_ratio is not None:
            print(
                f"{LOG_PREFIX} Stage07 budget (damaged_token_ratio): threshold={float(args.max_damaged_token_ratio):.3f}, "
                f"violations={len(damage_budget_violations)}"
            )
        if args.max_dropped_anchor_ratio is not None:
            print(
                f"{LOG_PREFIX} Stage07 budget (dropped_anchor_ratio): threshold={float(args.max_dropped_anchor_ratio):.3f}, "
                f"violations={len(anchor_budget_violations)}"
            )
        if damage_drift_out_path is not None:
            print(f"{LOG_PREFIX} Damage drift report: {damage_drift_out_path}")
        print(f"{LOG_PREFIX} Issues total: errors={errors}, warnings={warnings}")
        print(f"{LOG_PREFIX} Result: {'PASS' if passed else 'FAIL'} ({elapsed:.1f}s)")

        if issues:
            # Show most severe first (error then warning), then stable by check/video id.
            def sort_key(i: Dict[str, Any]) -> Tuple[int, str, str]:
                sev = i.get("severity")
                sev_rank = 0 if sev == "error" else 1
                return (sev_rank, str(i.get("check", "")), str(i.get("video_id", "")))

            print("")
            shown = 0
            for i in sorted(issues, key=sort_key):
                if shown >= args.show:
                    remaining = len(issues) - shown
                    print(f"{LOG_PREFIX} ... ({remaining} more issue(s) not shown; use --json for full list)")
                    break
                vid = i.get("video_id", "")
                check = i.get("check", "")
                msg = i.get("message", "")
                sev = (i.get("severity") or "").upper()
                print(f"{LOG_PREFIX} {sev} [{vid}] {check}: {msg}")
                shown += 1

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
