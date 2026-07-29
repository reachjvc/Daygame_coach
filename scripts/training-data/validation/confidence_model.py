#!/usr/bin/env python3
"""
Shared confidence math primitives for pipeline stages/validators.

This module is intentionally deterministic and side-effect free so confidence
aggregation behavior can be reused across stages and audits.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple  # noqa: F811


DEFAULT_HIGH_THRESHOLD = 0.80
DEFAULT_MEDIUM_THRESHOLD = 0.60

# Video-level gate threshold: videos below this are blocked from LLM processing.
# 2026-07-09: 0.85->0.80. Once 06h honors the LLM's per-attribution override confidence
# (speaker_role_override_confidence), 06h video_confidence reflects the model's ACTUAL certainty:
# confidently-reassigned collapses self-sort to 0.92-0.99, leaving a clean residual gradient. Tier
# audit of the 14 videos in 0.64-0.85 showed a natural break at 0.80 — everything >=0.80 is 64-87%
# high-tier (good), below 0.80 trends to junk (9-40% high). See learnings.md "Stall root-cause audit".
VIDEO_GATE_THRESHOLD = 0.80

# ---- v2 confidence model constants (06h.DET.confidence-propagation-v2.0) ----

# Video-type-aware axis weights for the 3-axis blocking overall.
# Phase has small weight (~5%) — enough to surface classification issues
# without dominating the blocking decision.
VIDEO_TYPE_AXIS_WEIGHTS: Dict[str, Dict[str, float]] = {
    "infield":      {"transcript": 0.475, "speaker": 0.475, "phase": 0.05},
    "compilation":  {"transcript": 0.76,  "speaker": 0.19,  "phase": 0.05},
    "talking_head": {"transcript": 0.90,  "speaker": 0.05,  "phase": 0.05},
    "podcast":      {"transcript": 0.90,  "speaker": 0.05,  "phase": 0.05},
    "lecture":      {"transcript": 0.90,  "speaker": 0.05,  "phase": 0.05},
}
DEFAULT_AXIS_WEIGHTS: Dict[str, float] = {"transcript": 0.57, "speaker": 0.38, "phase": 0.05}

# Repair credit: segments with accepted repairs get this multiplier
# instead of the damage multiplier on the repaired axis.
REPAIR_CREDIT_MULTIPLIER = 0.95

# Contamination propagation penalty for neighboring segments.
# With 1.0 base scores and 0.85 threshold, the old 0.84 penalty
# would block clean neighbors. 0.95 gives a mild flag without blocking.
PROPAGATION_PENALTY = 0.95

# Speaker ambiguity multipliers by video type.
# Compilations: speaker identity matters less (mostly one narrator).
SPEAKER_AMBIGUITY_MULT_INFIELD = 0.48
# A collapsed infield speaker that Stage 06 CONFIDENTLY reassigned (speaker_role_override present)
# is the same situation as a reassigned compilation speaker — trust it the same instead of applying
# the full unresolved-collapse penalty. Without an override (role stays unknown) the segment is
# genuinely unresolved and keeps SPEAKER_AMBIGUITY_MULT_INFIELD. Fixes coach-heavy / confidently-
# reassigned infield (e.g. K8) being held by the 06h confidence gate on an over-harsh penalty.
SPEAKER_AMBIGUITY_MULT_INFIELD_WITH_OVERRIDE = 0.80
SPEAKER_AMBIGUITY_MULT_COMPILATION_NO_OVERRIDE = 0.65
SPEAKER_AMBIGUITY_MULT_COMPILATION_WITH_OVERRIDE = 0.80

# When speaker_role_override exists for a collapsed speaker,
# boost the base speaker_conf to at least this value.
SPEAKER_OVERRIDE_FLOOR = 0.85

# A collapse that Stage 06 reassigned NEARLY COMPLETELY by content (high reassignment_rate,
# few residual unknowns) is the diarizer mislabelling speakers on otherwise-clean dialogue —
# the override labels are trustworthy, so credit the speaker axis close to full instead of the
# generic 0.80 over-collapse penalty. Gated on the SAME residual signals as the stage-06 collapse
# gate (reassignment_rate / unknown_count), so a poorly-reassigned collapse gets NO boost and the
# fail-closed behaviour is preserved. (Recovers clean infield like grq-TNERVuA: 291/294 reassigned,
# rate 0.99, held at video_confidence 0.82 purely on the speaker axis despite correct labels.)
SPEAKER_REASSIGN_TRUST_RATE_MIN = 0.95
SPEAKER_REASSIGN_TRUST_UNKNOWN_MAX = 10
SPEAKER_AMBIGUITY_MULT_INFIELD_TRUSTED_REASSIGN = 0.95
SPEAKER_OVERRIDE_FLOOR_TRUSTED_REASSIGN = 0.92


def get_axis_weights(video_type: str) -> Dict[str, float]:
    """Return axis weights for the given video type."""
    vt = video_type.strip().lower() if isinstance(video_type, str) else ""
    return dict(VIDEO_TYPE_AXIS_WEIGHTS.get(vt, DEFAULT_AXIS_WEIGHTS))


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
