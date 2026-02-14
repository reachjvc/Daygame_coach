#!/usr/bin/env python3
"""
scripts/training-data/validation/pipeline_stage_audit.py

Stage-by-stage validation + manual review harness for pipeline hardening.

This script is intentionally layout-tolerant and can inspect artifacts across:
- source-video layout (01-05 canonical)
- source-flat layout (06-07 common in manifest mode)
- root-flat layout (legacy single-file runs)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import jsonschema


LOG_PREFIX = "[pipeline-stage-audit]"


@dataclass
class ManifestEntry:
    source: str
    folder: str
    video_id: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_video_id(text: str) -> Optional[str]:
    match = re.search(r"\[([A-Za-z0-9_-]{11})\]", text)
    return match.group(1) if match else None


def parse_manifest(path: Path) -> List[ManifestEntry]:
    entries: List[ManifestEntry] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "|" not in line:
            continue
        source, folder = [part.strip() for part in line.split("|", 1)]
        video_id = extract_video_id(folder)
        if not video_id:
            continue
        entries.append(ManifestEntry(source=source, folder=folder, video_id=video_id))
    return entries


def pick_preferred(candidates: List[Path]) -> Optional[Path]:
    if not candidates:
        return None

    def score(path: Path) -> Tuple[int, int, str]:
        name = path.name
        clean_score = 1 if ".clean16k." in name else 0
        depth_score = len(path.parts)
        return (clean_score, depth_score, str(path))

    return sorted(candidates, key=score, reverse=True)[0]


def find_stage_file_by_video_id(root: Path, source: str, video_id: str, suffix: str) -> Optional[Path]:
    candidates: List[Path] = []
    video_token = f"[{video_id}]"

    source_dir = root / source
    if source_dir.exists():
        for path in source_dir.rglob(f"*{suffix}"):
            if video_token in path.name:
                candidates.append(path)

    for path in root.rglob(f"*{suffix}"):
        if video_token in path.name:
            candidates.append(path)

    deduped = sorted(set(candidates))
    return pick_preferred(deduped)


def load_schema(path: Path) -> Dict[str, Any]:
    return read_json(path)


def validate_schema(instance: Dict[str, Any], schema: Dict[str, Any]) -> List[str]:
    try:
        jsonschema.validate(instance=instance, schema=schema)
        return []
    except jsonschema.ValidationError as exc:
        where = ".".join(str(p) for p in exc.path) or "<root>"
        return [f"schema_invalid at {where}: {exc.message}"]


def stage_status(errors: List[str], warnings: List[str]) -> str:
    if errors:
        return "FAIL"
    if warnings:
        return "WARN"
    return "PASS"


def summarize_stage(results: List[Dict[str, Any]], stage: str) -> Dict[str, int]:
    stage_items = [r for r in results if r["stage"] == stage]
    summary = {"PASS": 0, "WARN": 0, "FAIL": 0}
    for item in stage_items:
        summary[item["status"]] += 1
    return summary


def check_stage_01(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    video_dir = root / "data" / "01.download" / entry.source / entry.folder
    wavs = sorted(video_dir.glob("*.audio.asr.raw16k.wav"))

    if not video_dir.exists():
        errors.append(f"missing directory: {video_dir}")
    if not wavs:
        errors.append("missing raw16k wav")
    else:
        if wavs[0].stat().st_size < 1_000_000:
            warnings.append("raw16k wav is unusually small (<1MB)")

    return {
        "stage": "01",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(p) for p in wavs[:1]],
        "errors": errors,
        "warnings": warnings,
    }


def check_stage_02(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "02.transcribe", entry.source, entry.video_id, ".full.json")
    if not path:
        errors.append("missing transcription .full.json")
        return {
            "stage": "02",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
            "manual_review": manual,
        }

    data = read_json(path)
    segments = data.get("segments", [])
    if not isinstance(segments, list) or not segments:
        errors.append("segments missing/empty")
    else:
        starts = [seg.get("start", 0) for seg in segments if isinstance(seg, dict)]
        if starts != sorted(starts):
            errors.append("segment starts are non-monotonic")

        sample_indices = [0, max(0, len(segments) // 2), max(0, len(segments) - 1)]
        seen = set()
        for idx in sample_indices:
            if idx in seen or idx >= len(segments):
                continue
            seen.add(idx)
            seg = segments[idx]
            text = str(seg.get("text", "")).strip().replace("\n", " ")
            if text:
                manual.append(f"seg {idx}: {text[:180]}")

        short_segments = sum(1 for seg in segments if len(str(seg.get("text", "")).strip()) < 4)
        if short_segments > max(5, int(len(segments) * 0.1)):
            warnings.append(f"many very short segments: {short_segments}/{len(segments)}")

    return {
        "stage": "02",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_03(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "03.align", entry.source, entry.video_id, ".full.json")
    if not path:
        errors.append("missing aligned .full.json")
        return {
            "stage": "03",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    data = read_json(path)
    segments = data.get("segments", [])
    if not isinstance(segments, list) or not segments:
        errors.append("segments missing/empty")
    else:
        total_words = 0
        words_with_ts = 0
        for seg in segments:
            words = seg.get("words", [])
            if not isinstance(words, list):
                continue
            total_words += len(words)
            for word in words:
                if isinstance(word, dict) and "start" in word and "end" in word:
                    words_with_ts += 1
        if total_words > 0:
            ratio = words_with_ts / total_words
            manual.append(f"word_timestamp_coverage={ratio:.1%} ({words_with_ts}/{total_words})")
            if ratio < 0.6:
                warnings.append(f"word timestamp coverage low: {ratio:.1%}")

        for idx, seg in enumerate(segments[:2]):
            words = seg.get("words", [])
            if not isinstance(words, list) or not words:
                continue
            first_word = words[0] if isinstance(words[0], dict) else {}
            word_txt = str(first_word.get("word", "")).strip()
            word_start = first_word.get("start")
            word_end = first_word.get("end")
            if word_txt:
                manual.append(f"seg {idx} first_word={word_txt!r} ts=({word_start},{word_end})")

    return {
        "stage": "03",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_04(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "04.diarize", entry.source, entry.video_id, ".full.json")
    if not path:
        errors.append("missing diarized .full.json")
        return {
            "stage": "04",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
            "manual_review": manual,
        }

    data = read_json(path)
    segments = data.get("segments", [])
    if not isinstance(segments, list) or not segments:
        errors.append("segments missing/empty")
    else:
        speakers = [str(seg.get("speaker", "")).strip() for seg in segments]
        non_empty = [s for s in speakers if s]
        unique = sorted(set(non_empty))
        if not non_empty:
            errors.append("no speaker labels on segments")
        if len(unique) <= 1:
            warnings.append("single-speaker diarization result (possible collapse)")

        for seg in segments[:8]:
            speaker = str(seg.get("speaker", "UNK"))
            text = str(seg.get("text", "")).strip().replace("\n", " ")
            manual.append(f"{speaker}: {text[:120]}")

    return {
        "stage": "04",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_05(root: Path, entry: ManifestEntry, schema: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(
        root / "data" / "05.audio-features", entry.source, entry.video_id, ".audio_features.json"
    )
    if not path:
        errors.append("missing audio_features.json")
        return {
            "stage": "05",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    data = read_json(path)
    errors.extend(validate_schema(data, schema))

    segments = data.get("segments", [])
    if isinstance(segments, list) and segments:
        low_quality = 0
        speech_activity: List[float] = []
        for seg in segments:
            quality = seg.get("features", {}).get("quality", {})
            ratio = quality.get("speech_activity_ratio")
            if isinstance(ratio, (int, float)):
                speech_activity.append(float(ratio))
            if quality.get("low_energy"):
                low_quality += 1
        if low_quality > max(5, int(len(segments) * 0.3)):
            warnings.append(f"many low-energy segments: {low_quality}/{len(segments)}")
        manual.append(f"low_energy={low_quality}/{len(segments)}")
        if speech_activity:
            speech_activity_sorted = sorted(speech_activity)
            p50 = speech_activity_sorted[len(speech_activity_sorted) // 2]
            p10 = speech_activity_sorted[max(0, int(len(speech_activity_sorted) * 0.10) - 1)]
            manual.append(f"speech_activity_ratio p10={p10:.3f} p50={p50:.3f}")
            if p50 < 0.25:
                warnings.append(f"median speech_activity_ratio is low: {p50:.3f}")
        sample_quality = segments[0].get("features", {}).get("quality")
        if isinstance(sample_quality, dict):
            manual.append(f"sample_seg0_quality={json.dumps(sample_quality, ensure_ascii=False)[:180]}")

    return {
        "stage": "05",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_06(root: Path, entry: ManifestEntry, conv_schema: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "06.video-type", entry.source, entry.video_id, ".conversations.json")
    if not path:
        errors.append("missing conversations.json")
        return {
            "stage": "06",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    data = read_json(path)
    errors.extend(validate_schema(data, conv_schema))

    video_type = data.get("video_type", {})
    if isinstance(video_type, dict):
        vtype = video_type.get("type")
        confidence = video_type.get("confidence")
        manual.append(f"video_type={vtype} confidence={confidence}")

    segments = data.get("segments", [])
    if isinstance(segments, list) and segments:
        role_counts: Dict[str, int] = {}
        for seg in segments:
            role = str(seg.get("speaker_role", "unknown"))
            role_counts[role] = role_counts.get(role, 0) + 1
        manual.append(f"speaker_role_counts={json.dumps(role_counts, ensure_ascii=False)}")
        unknown = role_counts.get("unknown", 0)
        if unknown > max(3, int(len(segments) * 0.15)):
            warnings.append(f"high unknown speaker_role count: {unknown}/{len(segments)}")

    conversations = data.get("conversations", [])
    if isinstance(conversations, list):
        manual.append(f"conversation_count={len(conversations)}")

    validation_sidecar = path.with_name(path.name.replace(".conversations.json", ".conversations.validation.json"))
    if validation_sidecar.exists():
        sidecar = read_json(validation_sidecar)
        summary = sidecar.get("summary", {})
        if summary.get("errors", 0) > 0:
            errors.append(f"validation sidecar reports errors={summary.get('errors')}")
        if summary.get("warnings", 0) > 0:
            warnings.append(f"validation sidecar warnings={summary.get('warnings')}")
    else:
        warnings.append("missing .conversations.validation.json sidecar")

    return {
        "stage": "06",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path), str(validation_sidecar) if validation_sidecar.exists() else ""],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_06b(root: Path, entry: ManifestEntry, schema: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "06b.verify", entry.source, entry.video_id, ".verification.json")
    if not path:
        errors.append("missing verification.json")
        return {
            "stage": "06b",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
            "verdict": None,
        }

    data = read_json(path)
    errors.extend(validate_schema(data, schema))

    verdict = data.get("verdict")
    manual.append(f"verdict={verdict}")
    manual.append(
        "issues="
        f"misattr:{len(data.get('misattributions', []) or [])},"
        f"boundary:{len(data.get('boundary_issues', []) or [])},"
        f"collapse:{len(data.get('collapse_issues', []) or [])},"
        f"other:{len(data.get('other_flags', []) or [])}"
    )
    summary_text = data.get("summary")
    if isinstance(summary_text, str) and summary_text.strip():
        manual.append(f"summary={summary_text.strip()[:220]}")

    if verdict == "REJECT":
        errors.append("verdict=REJECT")
    elif verdict == "FLAG":
        warnings.append("verdict=FLAG")
    elif verdict != "APPROVE":
        errors.append(f"unknown verdict: {verdict}")

    return {
        "stage": "06b",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "verdict": verdict,
        "manual_review": manual,
    }


def check_stage_06c(root: Path, entry: ManifestEntry, conv_schema: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "06c.patched", entry.source, entry.video_id, ".conversations.json")
    if not path:
        errors.append("missing patched conversations.json")
        return {
            "stage": "06c",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    data = read_json(path)
    errors.extend(validate_schema(data, conv_schema))

    patch_meta = data.get("patch_metadata")
    if not isinstance(patch_meta, dict):
        warnings.append("missing patch_metadata")
    else:
        applied = patch_meta.get("fixes_applied_count")
        unresolved = patch_meta.get("flags_not_fixed_count")
        verification_verdict = patch_meta.get("verification_verdict")
        manual.append(
            f"verification_verdict={verification_verdict} fixes_applied_count={applied} flags_not_fixed_count={unresolved}"
        )
        if patch_meta.get("verification_verdict") == "REJECT":
            errors.append("patch metadata indicates verification_verdict=REJECT")
        if patch_meta.get("flags_not_fixed_count", 0) > 0:
            warnings.append(f"flags_not_fixed_count={patch_meta.get('flags_not_fixed_count')}")

    return {
        "stage": "06c",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_07(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    path = find_stage_file_by_video_id(root / "data" / "07.content", entry.source, entry.video_id, ".enriched.json")
    if not path:
        errors.append("missing enriched.json")
        return {
            "stage": "07",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
            "manual_review": manual,
        }

    data = read_json(path)
    segments = data.get("segments", [])
    segment_by_id = {
        seg.get("id"): seg for seg in segments
        if isinstance(seg, dict) and isinstance(seg.get("id"), int)
    }

    enrichments = data.get("enrichments", [])
    if not isinstance(enrichments, list) or not enrichments:
        warnings.append("enrichments missing/empty")
    else:
        for enrichment in enrichments:
            if enrichment.get("type") != "approach":
                continue
            conv_id = enrichment.get("conversation_id")
            for tp in enrichment.get("turn_phases", []):
                seg_id = tp.get("segment")
                if seg_id not in segment_by_id:
                    errors.append(f"turn_phases references missing segment id {seg_id}")
                    continue
                seg_conv = segment_by_id[seg_id].get("conversation_id")
                if conv_id is not None and seg_conv != conv_id:
                    errors.append(
                        f"turn_phases segment {seg_id} belongs to conv {seg_conv}, enrichment conv is {conv_id}"
                    )

        first_approach = next((e for e in enrichments if e.get("type") == "approach"), None)
        if isinstance(first_approach, dict):
            manual.append(f"conversation_id={first_approach.get('conversation_id')}")
            manual.append(f"hook_point={first_approach.get('hook_point')}")
            techniques = first_approach.get("techniques_used", [])
            topics = first_approach.get("topics_discussed", [])
            manual.append(f"techniques={json.dumps(techniques)[:200]}")
            manual.append(f"topics={json.dumps(topics)[:200]}")

    sidecar = path.with_name(path.name.replace(".enriched.json", ".enriched.validation.json"))
    if sidecar.exists():
        sidecar_data = read_json(sidecar)
        summary = sidecar_data.get("summary", {})
        if summary.get("errors", 0) > 0:
            errors.append(f"validation sidecar errors={summary.get('errors')}")
        if summary.get("warnings", 0) > 0:
            warnings.append(f"validation sidecar warnings={summary.get('warnings')}")
    else:
        warnings.append("missing .enriched.validation.json sidecar")

    return {
        "stage": "07",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path), str(sidecar) if sidecar.exists() else ""],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_09(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    stage_root = root / "data" / "09.chunks"
    if not stage_root.exists():
        return {
            "stage": "09",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": ["stage output directory missing"],
            "warnings": warnings,
        }

    source_dir = stage_root / entry.source
    candidates: List[Path] = []
    if source_dir.exists():
        candidates.extend(source_dir.rglob(f"*{entry.video_id}*.chunks.json"))
    candidates.extend(stage_root.rglob(f"*{entry.video_id}*.chunks.json"))

    path = pick_preferred(sorted(set(candidates)))
    if not path:
        errors.append("missing chunks.json")
        return {
            "stage": "09",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    data = read_json(path)
    chunks = data.get("chunks", [])
    if not isinstance(chunks, list) or not chunks:
        errors.append("chunks missing/empty")
    else:
        lengths = []
        for chunk in chunks:
            embedding = chunk.get("embedding", [])
            if not isinstance(embedding, list) or not embedding:
                errors.append("chunk with missing embedding vector")
                continue
            lengths.append(len(embedding))
        if lengths and len(set(lengths)) != 1:
            errors.append(f"inconsistent embedding lengths: {sorted(set(lengths))}")
        unknown_phases = 0
        with_phase = 0
        for chunk in chunks:
            phase = chunk.get("metadata", {}).get("phase")
            if phase is not None:
                with_phase += 1
                if phase == "unknown":
                    unknown_phases += 1
        if with_phase > 0 and unknown_phases / with_phase > 0.5:
            warnings.append(f">50% unknown phase tags in chunks ({unknown_phases}/{with_phase})")

        manual.append(f"chunk_count={len(chunks)}")
        if lengths:
            manual.append(f"embedding_dim={lengths[0]}")
        first_meta = chunks[0].get("metadata", {}) if isinstance(chunks[0], dict) else {}
        if isinstance(first_meta, dict):
            manual.append(
                f"first_chunk_meta={json.dumps({k: first_meta.get(k) for k in ['segmentType', 'conversationId', 'phase', 'problematicReason']}, ensure_ascii=False)}"
            )

    return {
        "stage": "09",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_10(root: Path, entry: ManifestEntry) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    manual: List[str] = []

    state_path = root / "data" / ".ingest_state.json"
    if not state_path.exists():
        errors.append("missing ingest state file")
        return {
            "stage": "10",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [],
            "errors": errors,
            "warnings": warnings,
        }

    state = read_json(state_path)
    sources = state.get("sources", {})
    if not isinstance(sources, dict):
        errors.append("invalid ingest state format")
        return {
            "stage": "10",
            "video_id": entry.video_id,
            "source": entry.source,
            "status": "FAIL",
            "files": [str(state_path)],
            "errors": errors,
            "warnings": warnings,
        }

    expected_key = f"{entry.source}/{entry.video_id}.txt"
    if expected_key not in sources:
        errors.append(f"missing source key in ingest state: {expected_key}")
    else:
        ingested_count = sources[expected_key].get("ingestedCount")
        manual.append(f"{expected_key} ingestedCount={ingested_count}")
        if not isinstance(ingested_count, int) or ingested_count <= 0:
            warnings.append(f"unexpected ingestedCount for {expected_key}: {ingested_count}")

    return {
        "stage": "10",
        "video_id": entry.video_id,
        "source": entry.source,
        "status": stage_status(errors, warnings),
        "files": [str(state_path)],
        "errors": errors,
        "warnings": warnings,
        "manual_review": manual,
    }


def check_stage_08(root: Path, manifest_name: str) -> Dict[str, Any]:
    stage_root = root / "data" / "08.taxonomy-validation"
    if not stage_root.exists():
        return {
            "stage": "08",
            "status": "FAIL",
            "files": [],
            "errors": ["missing stage output directory"],
            "warnings": [],
        }

    slug = re.sub(r"[^A-Za-z0-9._-]+", "_", f"manifest:{manifest_name}").strip("_")
    target = stage_root / f"{slug[:120]}.report.json"

    errors: List[str] = []
    warnings: List[str] = []
    files: List[str] = []

    if not target.exists():
        errors.append(f"missing taxonomy report for manifest: {target.name}")
    else:
        files.append(str(target))
        report = read_json(target)
        status = report.get("validation", {}).get("status")
        if status == "FAIL":
            errors.append("taxonomy report status=FAIL")
        elif status == "WARNING":
            warnings.append("taxonomy report status=WARNING")
        elif status != "PASS":
            warnings.append(f"taxonomy report status={status}")

    return {
        "stage": "08",
        "status": stage_status(errors, warnings),
        "files": files,
        "errors": errors,
        "warnings": warnings,
    }


def build_markdown_report(report: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("# Pipeline Stage Audit")
    lines.append("")
    lines.append(f"- Generated: {report['generated_at']}")
    lines.append(f"- Manifest: `{report['manifest']}`")
    lines.append(f"- Videos: {report['video_count']}")
    lines.append("")

    lines.append("## Stage Summary")
    lines.append("")
    for stage in ["01", "02", "03", "04", "05", "06", "06b", "06c", "07", "08", "09", "10"]:
        summary = report["summary"].get(stage)
        if not summary:
            continue
        lines.append(
            f"- Stage {stage}: PASS={summary['PASS']} WARN={summary['WARN']} FAIL={summary['FAIL']}"
        )
    lines.append("")

    lines.append("## Manual Review Snippets")
    lines.append("")
    for item in report["results"]:
        snippets = item.get("manual_review", [])
        if not snippets:
            continue
        lines.append(f"### Stage {item['stage']} [{item['video_id']}]")
        for snippet in snippets:
            lines.append(f"- {snippet}")
        lines.append("")

    lines.append("## Failures")
    lines.append("")
    fail_items = [r for r in report["results"] if r["status"] == "FAIL"]
    if not fail_items:
        lines.append("- None")
    else:
        for item in fail_items:
            lines.append(f"- Stage {item['stage']} [{item.get('video_id', 'n/a')}]:")
            for err in item.get("errors", []):
                lines.append(f"  - {err}")
    lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage-by-stage pipeline audit harness")
    parser.add_argument("--manifest", required=True, help="Manifest file path (source|folder entries)")
    parser.add_argument("--json-out", help="Optional JSON report output path")
    parser.add_argument("--markdown-out", help="Optional markdown report output path")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on any FAIL result")
    args = parser.parse_args()

    root = repo_root()
    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = root / manifest_path
    if not manifest_path.exists():
        print(f"{LOG_PREFIX} ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
        return 1

    entries = parse_manifest(manifest_path)
    if not entries:
        print(f"{LOG_PREFIX} ERROR: No valid entries in manifest: {manifest_path}", file=sys.stderr)
        return 1

    conv_schema = load_schema(root / "scripts" / "training-data" / "schemas" / "conversations.schema.json")
    verify_schema = load_schema(root / "scripts" / "training-data" / "schemas" / "verification.schema.json")
    audio_schema = load_schema(root / "scripts" / "training-data" / "schemas" / "audio_features.schema.json")

    results: List[Dict[str, Any]] = []

    for entry in entries:
        results.append(check_stage_01(root, entry))
        results.append(check_stage_02(root, entry))
        results.append(check_stage_03(root, entry))
        results.append(check_stage_04(root, entry))
        results.append(check_stage_05(root, entry, audio_schema))
        results.append(check_stage_06(root, entry, conv_schema))
        results.append(check_stage_06b(root, entry, verify_schema))
        results.append(check_stage_06c(root, entry, conv_schema))
        results.append(check_stage_07(root, entry))
        results.append(check_stage_09(root, entry))
        results.append(check_stage_10(root, entry))

    results.append(check_stage_08(root, manifest_path.name))

    summary: Dict[str, Dict[str, int]] = {}
    for stage in ["01", "02", "03", "04", "05", "06", "06b", "06c", "07", "08", "09", "10"]:
        summary[stage] = summarize_stage(results, stage)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": str(manifest_path.relative_to(root)),
        "video_count": len(entries),
        "summary": summary,
        "results": results,
    }

    if args.json_out:
        out_path = Path(args.json_out)
        if not out_path.is_absolute():
            out_path = root / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{LOG_PREFIX} Wrote JSON report: {out_path}")
    else:
        print(json.dumps(report, indent=2, ensure_ascii=False))

    if args.markdown_out:
        md_path = Path(args.markdown_out)
        if not md_path.is_absolute():
            md_path = root / md_path
        md_path.parent.mkdir(parents=True, exist_ok=True)
        md_path.write_text(build_markdown_report(report) + "\n", encoding="utf-8")
        print(f"{LOG_PREFIX} Wrote markdown report: {md_path}")

    if args.strict and any(item.get("status") == "FAIL" for item in results):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
