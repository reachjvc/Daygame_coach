#!/usr/bin/env python3
"""
Shared confidence math primitives for pipeline stages/validators.

This module is intentionally deterministic and side-effect free so confidence
aggregation behavior can be reused across stages and audits.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


DEFAULT_HIGH_THRESHOLD = 0.80
DEFAULT_MEDIUM_THRESHOLD = 0.60


def clamp01(value: float) -> float:
    """Clamp numeric confidence into [0, 1]."""
    try:
        raw = float(value)
    except Exception:
        return 0.0
    if raw != raw:  # NaN
        return 0.0
    if raw < 0.0:
        return 0.0
    if raw > 1.0:
        return 1.0
    return raw


def band_from_score(
    score: float,
    *,
    high_threshold: float = DEFAULT_HIGH_THRESHOLD,
    medium_threshold: float = DEFAULT_MEDIUM_THRESHOLD,
) -> str:
    """Map confidence score to canonical band."""
    value = clamp01(score)
    if value >= float(high_threshold):
        return "high"
    if value >= float(medium_threshold):
        return "medium"
    return "low"


@dataclass(frozen=True)
class Penalty:
    issue_code: str
    scope_type: str
    multiplier: float
    severity: str = "minor"

    @classmethod
    def from_mapping(cls, raw: Mapping[str, Any]) -> "Penalty":
        return cls(
            issue_code=str(raw.get("issue_code", "unknown_issue")).strip() or "unknown_issue",
            scope_type=str(raw.get("scope_type", "segment")).strip() or "segment",
            multiplier=clamp01(float(raw.get("multiplier", 1.0))),
            severity=str(raw.get("severity", "minor")).strip().lower() or "minor",
        )


def apply_penalties(
    base_score: float,
    penalties: Sequence[Penalty | Mapping[str, Any]],
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Apply multiplicative penalties to a base confidence score.

    Returns `(final_score, applied_trace)` where trace is deterministic and
    safe to persist in confidence artifacts.
    """
    current = clamp01(base_score)
    trace: List[Dict[str, Any]] = []
    for item in penalties:
        penalty = item if isinstance(item, Penalty) else Penalty.from_mapping(item)
        before = current
        current = clamp01(current * clamp01(penalty.multiplier))
        trace.append(
            {
                "issue_code": penalty.issue_code,
                "scope_type": penalty.scope_type,
                "severity": penalty.severity,
                "multiplier": round(clamp01(penalty.multiplier), 4),
                "before": round(before, 4),
                "after": round(current, 4),
                "delta": round(current - before, 4),
            }
        )
    return current, trace


def weighted_mean(scores: Sequence[float], weights: Optional[Sequence[float]] = None) -> float:
    """
    Compute bounded weighted mean in [0,1].

    If weights are omitted, all points are weighted equally.
    Invalid values are ignored.
    """
    if not scores:
        return 0.0

    if weights is None:
        safe_scores = [clamp01(v) for v in scores]
        if not safe_scores:
            return 0.0
        return clamp01(sum(safe_scores) / float(len(safe_scores)))

    total_w = 0.0
    total_v = 0.0
    for raw_score, raw_weight in zip(scores, weights):
        try:
            weight = float(raw_weight)
        except Exception:
            continue
        if weight <= 0.0:
            continue
        score = clamp01(raw_score)
        total_v += score * weight
        total_w += weight
    if total_w <= 0.0:
        return 0.0
    return clamp01(total_v / total_w)


def aggregate_scope_confidence(
    rows: Iterable[Mapping[str, Any]],
    *,
    score_key: str = "final_confidence",
    weight_key: str = "weight",
) -> float:
    """
    Aggregate scope confidence from row mappings that carry score + weight.
    """
    scores: List[float] = []
    weights: List[float] = []
    for row in rows:
        if not isinstance(row, Mapping):
            continue
        raw_score = row.get(score_key)
        raw_weight = row.get(weight_key, 1.0)
        try:
            score = float(raw_score)
            weight = float(raw_weight)
        except Exception:
            continue
        if weight <= 0.0:
            continue
        scores.append(score)
        weights.append(weight)
    return weighted_mean(scores, weights=weights)
