#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_chunks.py

Deterministic validator for Stage 09 chunk files.

This is intentionally read-only (no DB calls, no writes) and can be used to:
  - Sanity-check chunk file structure
  - Enforce stable idempotency key usage (sourceKey + videoId)
  - Catch embedding shape/data issues before ingest

Usage:
  python3 scripts/training-data/validation/validate_chunks.py --source daily_evolution
  python3 scripts/training-data/validation/validate_chunks.py --manifest docs/pipeline/batches/P001.1.txt
  python3 scripts/training-data/validation/validate_chunks.py --all
  python3 scripts/training-data/validation/validate_chunks.py --json
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, DefaultDict, Dict, Iterable, List, Optional, Set, Tuple

LOG_PREFIX = "[validate-chunks]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_STABLE_SOURCE_KEY_RE = re.compile(r".+[\\/][A-Za-z0-9_-]{11}\.txt$")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = _BRACKET_ID_RE.search(text or "")
    return m.group(1) if m else None


def _load_manifest_entries(manifest_path: Path) -> List[Tuple[str, str]]:
    """Return list of (source, video_id) pairs from a batch/sub-batch manifest."""
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
        vid = _extract_video_id_from_text(folder)
        if not vid:
            continue
        out.append((src, vid))
    return out


def _iter_chunk_files(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return sorted(root.rglob("*.chunks.json"))


@dataclass
class Issue:
    severity: str  # error|warning
    video_id: str
    source: str
    check: str
    message: str
    path: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "video_id": self.video_id,
            "source": self.source,
            "check": self.check,
            "message": self.message,
            "path": self.path,
        }


def _is_valid_video_id(raw: Any) -> bool:
    return isinstance(raw, str) and bool(_VIDEO_ID_RE.fullmatch(raw.strip()))


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def validate_chunks_file(path: Path) -> Tuple[Optional[str], Optional[str], List[Issue], Dict[str, Any]]:
    """Return (source, video_id, issues, stats)."""
    issues: List[Issue] = []
    data = _load_json(path)
    if not data:
        issues.append(Issue("error", "unknown", "unknown", "unreadable_json", "Could not read JSON", str(path)))
        return None, None, issues, {}

    channel = data.get("channel") if isinstance(data.get("channel"), str) else ""
    video_id = data.get("videoId") if isinstance(data.get("videoId"), str) else None
    if not _is_valid_video_id(video_id):
        # Try fallback: extract from filename stem.
        video_id = _extract_video_id_from_text(path.name)

    vid = video_id if isinstance(video_id, str) else "unknown"
    src = channel or "unknown"

    # Top-level required structure
    if data.get("version") != 1:
        issues.append(Issue("warning", vid, src, "unexpected_version", f"Expected version=1, found {data.get('version')!r}", str(path)))

    chunks = data.get("chunks")
    if not isinstance(chunks, list):
        issues.append(Issue("error", vid, src, "missing_chunks", "Top-level 'chunks' is missing or not a list", str(path)))
        return src, vid, issues, {}
    if not chunks:
        issues.append(Issue("error", vid, src, "empty_chunks", "Top-level 'chunks' is empty", str(path)))
        return src, vid, issues, {}

    # Stable key fields (required for idempotent ingest in new pipeline)
    source_key = data.get("sourceKey")
    if not (isinstance(source_key, str) and source_key.strip()):
        issues.append(Issue("error", vid, src, "missing_sourceKey", "Missing top-level sourceKey (stable ingest key)", str(path)))
    elif not _STABLE_SOURCE_KEY_RE.fullmatch(source_key.strip()):
        issues.append(Issue("error", vid, src, "invalid_sourceKey_format", "sourceKey is not in <channel>/<video_id>.txt format", str(path)))
    if not _is_valid_video_id(data.get("videoId")):
        issues.append(Issue("error", vid, src, "missing_videoId", "Missing/invalid top-level videoId (YouTube id)", str(path)))
    if isinstance(source_key, str) and source_key.strip() and _is_valid_video_id(data.get("videoId")) and channel:
        normalized_key = source_key.strip().replace("\\", "/")
        expected_key = f"{channel}/{str(data.get('videoId')).strip()}.txt"
        if normalized_key != expected_key:
            issues.append(Issue("error", vid, src, "sourceKey_channel_video_mismatch", "sourceKey does not match channel/videoId", str(path)))

    # Embedding dimension consistency
    embed_dims: Counter = Counter()
    missing_embeddings = 0
    content_empty = 0
    bad_metadata = 0
    bad_index = 0
    bad_total = 0
    duplicate_index = 0
    expected_chunk_count = len(chunks)
    seen_chunk_indices: Set[int] = set()
    declared_total_chunks: Optional[int] = None

    for i, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            issues.append(Issue("error", vid, src, "chunk_not_object", f"Chunk {i} is not an object", str(path)))
            continue

        content = chunk.get("content")
        if not isinstance(content, str) or not content.strip():
            content_empty += 1

        emb = chunk.get("embedding")
        if (
            not isinstance(emb, list)
            or not emb
            or not all(isinstance(x, (int, float)) and math.isfinite(float(x)) for x in emb)
        ):
            missing_embeddings += 1
        else:
            embed_dims[len(emb)] += 1

        meta = chunk.get("metadata")
        if not isinstance(meta, dict):
            bad_metadata += 1
            continue

        # Metadata invariants
        if meta.get("videoId") != data.get("videoId") and _is_valid_video_id(data.get("videoId")):
            issues.append(Issue("warning", vid, src, "videoId_mismatch", f"Chunk metadata.videoId != top-level videoId at chunk {i}", str(path)))
        if meta.get("channel") != channel and channel:
            issues.append(Issue("warning", vid, src, "channel_mismatch", f"Chunk metadata.channel != top-level channel at chunk {i}", str(path)))

        # Index sanity (optional but useful)
        idx = meta.get("chunkIndex")
        total = meta.get("totalChunks")
        if not isinstance(total, int) or total <= 0:
            bad_total += 1
        else:
            if declared_total_chunks is None:
                declared_total_chunks = total
            elif total != declared_total_chunks:
                bad_total += 1

        if not isinstance(idx, int) or idx < 0:
            bad_index += 1
        else:
            if isinstance(total, int) and total > 0 and idx >= total:
                bad_index += 1
            if idx >= expected_chunk_count:
                bad_index += 1
            elif idx in seen_chunk_indices:
                duplicate_index += 1
            else:
                seen_chunk_indices.add(idx)

    if content_empty:
        issues.append(Issue("warning", vid, src, "empty_content", f"{content_empty} chunk(s) have empty content", str(path)))
    if missing_embeddings:
        issues.append(Issue("error", vid, src, "missing_embeddings", f"{missing_embeddings} chunk(s) missing/invalid embedding vectors", str(path)))
    if bad_metadata:
        issues.append(Issue("error", vid, src, "missing_metadata", f"{bad_metadata} chunk(s) missing/invalid metadata", str(path)))
    if bad_index:
        issues.append(Issue("error", vid, src, "bad_chunk_index", f"{bad_index} chunk(s) have invalid chunkIndex", str(path)))
    if bad_total:
        issues.append(Issue("error", vid, src, "bad_total_chunks", f"{bad_total} chunk(s) have invalid/inconsistent totalChunks", str(path)))
    if duplicate_index:
        issues.append(Issue("error", vid, src, "duplicate_chunk_index", f"{duplicate_index} duplicate chunkIndex value(s)", str(path)))

    if len(embed_dims) > 1:
        issues.append(Issue("error", vid, src, "inconsistent_embedding_dims", f"Embedding dims vary: {dict(embed_dims)}", str(path)))

    if declared_total_chunks is not None and declared_total_chunks != expected_chunk_count:
        issues.append(Issue(
            "error",
            vid,
            src,
            "total_chunks_mismatch",
            f"metadata.totalChunks={declared_total_chunks} does not match chunk count={expected_chunk_count}",
            str(path),
        ))

    if expected_chunk_count > 0:
        missing_indices = [i for i in range(expected_chunk_count) if i not in seen_chunk_indices]
        if missing_indices:
            preview = ",".join(str(i) for i in missing_indices[:5])
            suffix = ",..." if len(missing_indices) > 5 else ""
            issues.append(Issue(
                "error",
                vid,
                src,
                "missing_chunk_indices",
                f"Missing chunkIndex values: {preview}{suffix}",
                str(path),
            ))

    stats = {
        "chunks": len(chunks),
        "embedding_dims": dict(embed_dims),
        "missing_embeddings": missing_embeddings,
        "bad_metadata": bad_metadata,
        "bad_chunk_index": bad_index,
        "bad_total_chunks": bad_total,
    }
    return src, vid, issues, stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Stage 09 chunk files (deterministic, read-only).")
    parser.add_argument("--source", help="Only validate one source (data/09.EXT.chunks/<source>/)")
    parser.add_argument("--manifest", help="Only validate videos in this manifest (docs/pipeline/batches/*.txt)")
    parser.add_argument("--all", action="store_true", help="Validate all sources under data/09.EXT.chunks/")
    parser.add_argument("--json", action="store_true", help="Output JSON report (stdout)")
    parser.add_argument("--show", type=int, default=30, help="Max issue lines to print in text mode")

    args = parser.parse_args()

    chunks_root = repo_root() / "data" / "09.EXT.chunks"

    sources_filter: Optional[Set[str]] = None
    ids_by_source: Optional[Dict[str, Set[str]]] = None

    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo_root() / manifest_path
        if not manifest_path.exists():
            print(f"{LOG_PREFIX} ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
            sys.exit(2)
        entries = _load_manifest_entries(manifest_path)
        ids_by_source = defaultdict(set)
        for src, vid in entries:
            ids_by_source[src].add(vid)
        sources_filter = set(ids_by_source.keys())

    if args.source:
        sources_filter = {args.source}

    if not args.all and not args.source and not args.manifest:
        print(f"{LOG_PREFIX} ERROR: Provide --all or --source or --manifest", file=sys.stderr)
        sys.exit(2)

    files: List[Path] = []
    if sources_filter is not None:
        for src in sorted(sources_filter):
            files.extend(_iter_chunk_files(chunks_root / src))
    else:
        files = list(_iter_chunk_files(chunks_root))

    if not files:
        print(f"{LOG_PREFIX} No chunk files found under {chunks_root}")
        sys.exit(0)

    issues: List[Issue] = []
    stats_by_source: DefaultDict[str, Dict[str, Any]] = defaultdict(lambda: {"files": 0, "chunks": 0})
    processed = 0

    for p in files:
        src, vid, file_issues, file_stats = validate_chunks_file(p)
        if not src or not vid:
            issues.extend(file_issues)
            continue

        # Manifest filtering by id (if requested)
        if ids_by_source is not None:
            allowed = ids_by_source.get(src, set())
            if vid not in allowed:
                continue

        processed += 1
        issues.extend(file_issues)
        stats_by_source[src]["files"] += 1
        stats_by_source[src]["chunks"] += int(file_stats.get("chunks", 0) or 0)

    errors = sum(1 for i in issues if i.severity == "error")
    warnings = sum(1 for i in issues if i.severity == "warning")

    report = {
        "version": 1,
        "stage": "09.chunk-embed",
        "processed_files": processed,
        "issues_summary": {"errors": errors, "warnings": warnings},
        "stats_by_source": dict(stats_by_source),
        "issues": [i.to_dict() for i in issues],
        "passed": errors == 0,
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{LOG_PREFIX} Files processed: {processed}")
        print(f"{LOG_PREFIX} Issues: errors={errors}, warnings={warnings}")
        print(f"{LOG_PREFIX} Result: {'PASS' if errors == 0 else 'FAIL'}")

        if issues:
            # Show errors first.
            def sort_key(i: Issue) -> Tuple[int, str, str]:
                return (0 if i.severity == "error" else 1, i.check, i.video_id)

            shown = 0
            print("")
            for i in sorted(issues, key=sort_key):
                if shown >= args.show:
                    remaining = len(issues) - shown
                    print(f"{LOG_PREFIX} ... ({remaining} more issue(s) not shown; use --json for full list)")
                    break
                print(f"{LOG_PREFIX} {i.severity.upper()} [{i.source} {i.video_id}] {i.check}: {i.message}")
                shown += 1

    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
