#!/usr/bin/env python3
"""
Unit tests for 06h confidence propagation v2.1 model.

Covers: base scores, LLM failure fallback, phase contribution (~5% weight),
video-type-aware weighting, speaker collapse, repair credit, video-level gate,
penalty trace, repair metadata, damage type counts.

Run: .venv/bin/python -m pytest tests/unit/pipeline/test_06h_confidence.py -v
  or: .venv/bin/python tests/unit/pipeline/test_06h_confidence.py
"""

from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

# Make scripts/training-data/ importable.
_SCRIPTS_DIR = Path(__file__).resolve().parents[3] / "scripts" / "training-data"
sys.path.insert(0, str(_SCRIPTS_DIR))

# Import the module under a name (it has no .py extension).
import importlib.util
import types

_module_path = _SCRIPTS_DIR / "06h.DET.confidence-propagation"
_SPEC = importlib.util.spec_from_loader(
    "stage_06h",
    loader=importlib.machinery.SourceFileLoader("stage_06h", str(_module_path)),
)
stage_06h = types.ModuleType("stage_06h")
stage_06h.__file__ = str(_module_path)
stage_06h.__spec__ = _SPEC
_loader = importlib.machinery.SourceFileLoader("stage_06h", str(_module_path))
_loader.exec_module(stage_06h)

from validation.confidence_model import (
    PROPAGATION_PENALTY,
    REPAIR_CREDIT_MULTIPLIER,
    SPEAKER_AMBIGUITY_MULT_COMPILATION_NO_OVERRIDE,
    SPEAKER_AMBIGUITY_MULT_COMPILATION_WITH_OVERRIDE,
    SPEAKER_AMBIGUITY_MULT_INFIELD,
    SPEAKER_OVERRIDE_FLOOR,
    get_axis_weights,
)


# ---------------------------------------------------------------------------
# Helpers to build minimal 06d payloads
# ---------------------------------------------------------------------------

def _make_segment(sid: int, *, speaker_id="SPEAKER_00", role="coach",
                  segment_type="approach", text="Hello", conv_id=1,
                  speaker_role_override=None):
    seg = {
        "id": sid,
        "speaker_id": speaker_id,
        "speaker_role": role,
        "segment_type": segment_type,
        "text": text,
        "conversation_id": conv_id,
    }
    if speaker_role_override is not None:
        seg["speaker_role_override"] = speaker_role_override
    return seg


def _make_06d(segments, *, video_type="infield", speaker_labels=None,
              transcript_score=70):
    return {
        "video_id": "test_video",
        "segments": segments,
        "conversations": [
            {"conversation_id": 1, "segment_ids": [s["id"] for s in segments]},
        ],
        "video_type": {"type": video_type},
        "speaker_labels": speaker_labels or {
            "SPEAKER_00": {"label": "coach", "confidence": 0.95},
        },
        "transcript_confidence": {"score": transcript_score},
        "metadata": {},
    }


def _make_damage_map(segments_data):
    """segments_data: list of (seg_id, damage_types, reason_codes)."""
    return {
        "segments": [
            {
                "segment_id": sid,
                "damage_types": dtypes,
                "damage_reason_codes": codes,
            }
            for sid, dtypes, codes in segments_data
        ],
    }


def _make_adjudication(seeds):
    """seeds: list of dicts with at minimum seed_segment_id."""
    return {"seeds": seeds}


def _propagate(**kwargs):
    """Shortcut to call propagate_confidence with sensible defaults."""
    defaults = {
        "apply_repairs": True,
    }
    defaults.update(kwargs)
    return stage_06h.propagate_confidence(**defaults)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestBaseScores(unittest.TestCase):
    """Clean segments (no damage) should score ~1.0."""

    def test_clean_segment_overall_near_1(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        out, report = _propagate(data_06d=data, damage_map=None,
                                  adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # Infield: 1.0*0.475 + 0.95*0.475 + 1.0*0.05 = 0.97625
        self.assertGreaterEqual(seg["segment_confidence"]["overall"], 0.95)
        self.assertEqual(seg["confidence_tier"], "high")

    def test_clean_segment_all_axes_1(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        conf = out["segments"][0]["segment_confidence"]
        self.assertAlmostEqual(conf["transcript"], 1.0, places=2)
        self.assertAlmostEqual(conf["speaker"], 0.95, places=2)  # speaker_labels confidence
        self.assertAlmostEqual(conf["phase"], 1.0, places=2)

    def test_unknown_role_caps_speaker(self):
        segs = [_make_segment(1, role="unknown")]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        conf = out["segments"][0]["segment_confidence"]
        self.assertLessEqual(conf["speaker"], 0.45)


class TestPhaseWeight(unittest.TestCase):
    """Phase confidence has small weight (~5%) — doesn't dominate overall."""

    def test_low_phase_high_transcript_speaker_still_high(self):
        """Low phase + high transcript/speaker → overall still high."""
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        # Only damage that hurts phase, not transcript/speaker.
        dmg = _make_damage_map([(1, ["mixed_mode", "boundary_uncertain"],
                                  ["mixed_mode", "boundary_uncertain"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # Phase should be low.
        self.assertLess(seg["segment_confidence"]["phase"], 0.5)
        # Overall should still be high (transcript=1.0, speaker=0.95).
        self.assertGreater(seg["segment_confidence"]["overall"], 0.90)


class TestVideoTypeWeighting(unittest.TestCase):
    """Video-type-aware axis weights."""

    def test_compilation_weights(self):
        w = get_axis_weights("compilation")
        self.assertAlmostEqual(w["transcript"], 0.76)
        self.assertAlmostEqual(w["speaker"], 0.19)
        self.assertAlmostEqual(w["phase"], 0.05)

    def test_infield_weights(self):
        w = get_axis_weights("infield")
        self.assertAlmostEqual(w["transcript"], 0.475)
        self.assertAlmostEqual(w["speaker"], 0.475)
        self.assertAlmostEqual(w["phase"], 0.05)

    def test_talking_head_weights(self):
        w = get_axis_weights("talking_head")
        self.assertAlmostEqual(w["transcript"], 0.90)
        self.assertAlmostEqual(w["speaker"], 0.05)
        self.assertAlmostEqual(w["phase"], 0.05)

    def test_unknown_type_uses_defaults(self):
        w = get_axis_weights("some_new_type")
        self.assertAlmostEqual(w["transcript"], 0.57)
        self.assertAlmostEqual(w["speaker"], 0.38)
        self.assertAlmostEqual(w["phase"], 0.05)

    def test_compilation_low_speaker_high_overall(self):
        """Compilation + low speaker → high overall (76/19/5 weighting)."""
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="compilation")
        dmg = _make_damage_map([(1, ["speaker_ambiguity"], ["speaker_ambiguity"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # With compilation: transcript × 0.76 + speaker × 0.19 + phase × 0.05
        # transcript=1.0, speaker=0.95*0.65=0.6175, phase=1.0
        # overall = 1.0*0.76 + 0.6175*0.19 + 1.0*0.05 = 0.9273
        self.assertGreater(seg["segment_confidence"]["overall"], 0.85)

    def test_infield_low_speaker_medium_overall(self):
        """Infield + low speaker → lower overall (47.5/47.5/5 weighting)."""
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="infield")
        dmg = _make_damage_map([(1, ["speaker_ambiguity"], ["speaker_ambiguity"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # With infield: transcript × 0.475 + speaker × 0.475 + phase × 0.05
        # transcript=1.0, speaker=0.95*0.48=0.456, phase=1.0
        # overall = 1.0*0.475 + 0.456*0.475 + 1.0*0.05 = 0.7416
        self.assertLess(seg["segment_confidence"]["overall"], 0.85)


class TestSpeakerCollapse(unittest.TestCase):
    """Speaker ambiguity multipliers vary by video type and override presence."""

    def test_compilation_with_override(self):
        """Compilation + speaker_ambiguity + speaker_role_override → 0.80 multiplier."""
        segs = [_make_segment(1, speaker_role_override="coach")]
        data = _make_06d(segs, video_type="compilation")
        dmg = _make_damage_map([(1, ["speaker_ambiguity"], ["speaker_ambiguity"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # Override boosts speaker to max(conf, 0.85), then *= 0.80
        # speaker = max(0.95, 0.85) * 0.80 = 0.76
        self.assertAlmostEqual(seg["segment_confidence"]["speaker"], 0.76, places=2)

    def test_compilation_without_override(self):
        """Compilation + speaker_ambiguity + no override → 0.65 multiplier."""
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="compilation")
        dmg = _make_damage_map([(1, ["speaker_ambiguity"], ["speaker_ambiguity"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # speaker = 0.95 * 0.65 = 0.6175
        self.assertAlmostEqual(seg["segment_confidence"]["speaker"], 0.6175, places=2)

    def test_infield_speaker_ambiguity(self):
        """Infield + speaker_ambiguity → harsh 0.48 multiplier."""
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="infield")
        dmg = _make_damage_map([(1, ["speaker_ambiguity"], ["speaker_ambiguity"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # speaker = 0.95 * 0.48 = 0.456
        self.assertAlmostEqual(seg["segment_confidence"]["speaker"], 0.456, places=2)

    def test_speaker_override_boosts_floor(self):
        """Speaker override without damage should boost low speaker conf."""
        segs = [_make_segment(1, speaker_id="SPEAKER_01",
                              speaker_role_override="coach")]
        labels = {
            "SPEAKER_01": {"label": "collapsed", "confidence": 0.30},
        }
        data = _make_06d(segs, speaker_labels=labels)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        # Override boosts from 0.30 to max(0.30, 0.85) = 0.85
        self.assertAlmostEqual(seg["segment_confidence"]["speaker"],
                               SPEAKER_OVERRIDE_FLOOR, places=2)


class TestLLMFailureFallback(unittest.TestCase):
    """When 06g LLM fails, skip adjudication merge (no 0.0 averaging)."""

    def test_llm_failure_uses_damage_only_scores(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"],
                                  ["transcript_artifact"])])
        adj = _make_adjudication([{
            "seed_segment_id": 1,
            "llm_failed": True,
            "adjudication": {
                "transcript_confidence": 0.0,
                "speaker_confidence": 0.0,
                "phase_confidence": 0.0,
            },
        }])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=None)
        seg = out["segments"][0]
        # Without LLM failure guard, transcript would average with 0.0:
        # (0.30 + 0.0) / 2 = 0.15. With guard, it stays at 0.30 (damage only).
        self.assertAlmostEqual(seg["segment_confidence"]["transcript"], 0.30, places=2)
        # Speaker should be undamaged (1.0 from labels confidence 0.95).
        self.assertAlmostEqual(seg["segment_confidence"]["speaker"], 0.95, places=2)

    def test_llm_failure_tags_contamination_source(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        adj = _make_adjudication([{
            "seed_segment_id": 1,
            "llm_failed": True,
            "adjudication": {},
        }])
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=adj, quality_check=None)
        seg = out["segments"][0]
        self.assertIn("adjudication_llm_failure", seg["contamination_sources"])


class TestRepairCredit(unittest.TestCase):
    """Repaired segments get gentler transcript multiplier."""

    def test_06e_repair_credit(self):
        """Segment repaired by 06e gets REPAIR_CREDIT_MULTIPLIER floor."""
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"],
                                  ["transcript_artifact"])])
        qc = {
            "transcript_artifacts": [{"segment_index": 1, "repaired": True}],
            "low_quality_segments": [],
        }
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=qc)
        seg = out["segments"][0]
        # Without repair: transcript = 1.0 * 0.30 = 0.30
        # With repair credit: t_mult = max(0.30, 0.95) = 0.95
        # transcript = 1.0 * 0.95 = 0.95
        self.assertAlmostEqual(seg["segment_confidence"]["transcript"],
                               REPAIR_CREDIT_MULTIPLIER, places=2)

    def test_06g_repair_credit(self):
        """Segment with accepted 06g repair boosts transcript."""
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"],
                                  ["transcript_artifact"])])
        adj = _make_adjudication([{
            "seed_segment_id": 1,
            "repair_accepted": True,
            "adjudication": {
                "transcript_confidence": 0.90,
                "speaker_confidence": 0.95,
                "phase_confidence": 0.90,
                "repaired_text": "Fixed text here",
            },
        }])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=None)
        seg = out["segments"][0]
        # After adj merge: transcript = (0.30 + 0.90) / 2 = 0.60
        # Then repair credit boosts to REPAIR_CREDIT_MULTIPLIER = 0.95
        self.assertAlmostEqual(seg["segment_confidence"]["transcript"],
                               REPAIR_CREDIT_MULTIPLIER, places=2)


class TestVideoSummary(unittest.TestCase):
    """Video-level confidence summary in output."""

    def test_video_summary_present(self):
        segs = [_make_segment(1), _make_segment(2)]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        vs = out.get("video_summary")
        self.assertIsInstance(vs, dict)
        self.assertIn("final_confidence", vs)
        self.assertIn("confidence_band", vs)
        self.assertIn("gate_decision", vs)
        self.assertEqual(vs["gate_decision"], "pass")

    def test_clean_video_passes(self):
        segs = [_make_segment(1), _make_segment(2)]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        vs = out["video_summary"]
        self.assertGreater(vs["final_confidence"], 0.90)
        self.assertEqual(vs["confidence_band"], "high")
        self.assertEqual(vs["gate_decision"], "pass")

    def test_damaged_video_blocks(self):
        """All-damaged infield video should get gate_decision=block."""
        segs = [_make_segment(1), _make_segment(2)]
        data = _make_06d(segs, video_type="infield")
        dmg = _make_damage_map([
            (1, ["transcript_artifact", "speaker_ambiguity"],
             ["transcript_artifact", "speaker_ambiguity"]),
            (2, ["transcript_artifact", "speaker_ambiguity"],
             ["transcript_artifact", "speaker_ambiguity"]),
        ])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        vs = out["video_summary"]
        self.assertEqual(vs["gate_decision"], "block")
        self.assertLess(vs["final_confidence"], 0.85)

    def test_no_conversation_blocking_field(self):
        """confidence_block_reason field should not exist on conversations."""
        segs = [_make_segment(1), _make_segment(2)]
        data = _make_06d(segs, video_type="infield")
        dmg = _make_damage_map([
            (1, ["transcript_artifact", "speaker_ambiguity"],
             ["transcript_artifact", "speaker_ambiguity"]),
            (2, ["transcript_artifact", "speaker_ambiguity"],
             ["transcript_artifact", "speaker_ambiguity"]),
        ])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        for conv in out["conversations"]:
            self.assertNotIn("confidence_block_reason", conv)


class TestPropagationPenalty(unittest.TestCase):
    """Contamination propagation to neighboring segments."""

    def test_propagation_uses_095(self):
        """Propagation penalty should be 0.95, not the old 0.84."""
        self.assertAlmostEqual(PROPAGATION_PENALTY, 0.95)

    def test_clean_neighbor_not_blocked(self):
        """Clean neighbor of damaged segment should stay above threshold."""
        segs = [_make_segment(1), _make_segment(2), _make_segment(3)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(2, ["transcript_artifact"],
                                  ["transcript_artifact"])])
        # Adjudication with propagation span covering segment 1 and 3.
        adj = _make_adjudication([{
            "seed_segment_id": 2,
            "adjudication": {
                "transcript_confidence": 0.40,
                "speaker_confidence": 0.90,
                "phase_confidence": 0.80,
                "contamination_start_segment_id": 1,
                "contamination_end_segment_id": 3,
            },
        }])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=None)
        # Segments 1 and 3 are clean but get propagation penalty.
        for sid in [1, 3]:
            seg = next(s for s in out["segments"] if s["id"] == sid)
            # With PROPAGATION_PENALTY=0.95: overall ~= 0.95*clean ≈ 0.93+
            # Should NOT drop below 0.85 threshold.
            self.assertGreater(seg["segment_confidence"]["overall"], 0.85,
                               f"Segment {sid} unfairly blocked by propagation")


class TestConfidenceMetadata(unittest.TestCase):
    """Verify v2 metadata fields in output."""

    def test_metadata_includes_v2_fields(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="compilation")
        out, report = _propagate(data_06d=data, damage_map=None,
                                  adjudication=None, quality_check=None)
        meta = out["confidence_metadata"]
        self.assertEqual(meta["model_version"], "v2.1")
        self.assertEqual(meta["video_type"], "compilation")
        self.assertIn("transcript", meta["axis_weights"])
        self.assertIn("speaker", meta["axis_weights"])
        self.assertIn("phase", meta["axis_weights"])
        self.assertAlmostEqual(meta["axis_weights"]["transcript"], 0.76)
        self.assertAlmostEqual(meta["axis_weights"]["speaker"], 0.19)
        self.assertAlmostEqual(meta["axis_weights"]["phase"], 0.05)

    def test_report_includes_v2_fields(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs, video_type="infield")
        _, report = _propagate(data_06d=data, damage_map=None,
                                adjudication=None, quality_check=None)
        self.assertEqual(report["model_version"], "v2.1")
        self.assertEqual(report["video_type"], "infield")
        self.assertIn("axis_weights", report)
        self.assertIn("damage_type_counts", report)
        self.assertIn("quality_repairs", report)


class TestEndToEnd(unittest.TestCase):
    """End-to-end propagate_confidence with mixed scenarios."""

    def _build_fixture(self):
        """Build a fixture covering: clean, damaged, LLM-failed, repaired segments."""
        segs = [
            _make_segment(1, text="Clean approach text"),
            _make_segment(2, text="Damaged transcript [inaudible]"),
            _make_segment(3, text="LLM failed segment"),
            _make_segment(4, text="Repaired segment text",
                          speaker_role_override="coach"),
        ]
        data = _make_06d(segs, video_type="compilation")

        dmg = _make_damage_map([
            # seg 2: transcript damage
            (2, ["transcript_artifact"], ["transcript_artifact"]),
            # seg 3: speaker ambiguity
            (3, ["speaker_ambiguity"], ["speaker_ambiguity"]),
            # seg 4: transcript damage (repaired)
            (4, ["transcript_artifact"], ["transcript_artifact"]),
        ])

        adj = _make_adjudication([
            # seg 3: LLM failed
            {
                "seed_segment_id": 3,
                "llm_failed": True,
                "adjudication": {
                    "transcript_confidence": 0.0,
                    "speaker_confidence": 0.0,
                    "phase_confidence": 0.0,
                },
            },
            # seg 4: repair accepted
            {
                "seed_segment_id": 4,
                "repair_accepted": True,
                "adjudication": {
                    "transcript_confidence": 0.85,
                    "speaker_confidence": 0.90,
                    "phase_confidence": 0.85,
                    "repaired_text": "Repaired clean text",
                },
            },
        ])

        qc = {
            "transcript_artifacts": [
                {"segment_index": 4, "repaired": True},
            ],
            "low_quality_segments": [],
        }

        return data, dmg, adj, qc

    def test_e2e_clean_segment_high(self):
        data, dmg, adj, qc = self._build_fixture()
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=qc)
        seg1 = next(s for s in out["segments"] if s["id"] == 1)
        self.assertEqual(seg1["confidence_tier"], "high")
        self.assertGreater(seg1["segment_confidence"]["overall"], 0.90)

    def test_e2e_damaged_segment_low(self):
        data, dmg, adj, qc = self._build_fixture()
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=qc)
        seg2 = next(s for s in out["segments"] if s["id"] == 2)
        # transcript_artifact: transcript *= 0.30
        # compilation weights: transcript=0.76, speaker=0.19, phase=0.05
        # overall = 0.30*0.76 + 0.95*0.19 + 0.70*0.05 = 0.4445
        self.assertLess(seg2["segment_confidence"]["overall"], 0.60)

    def test_e2e_llm_failed_not_zeroed(self):
        data, dmg, adj, qc = self._build_fixture()
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=qc)
        seg3 = next(s for s in out["segments"] if s["id"] == 3)
        # LLM failed → damage-only (speaker_ambiguity on compilation).
        # Speaker: 0.95 * 0.65 = 0.6175, transcript: 1.0, phase: 1.0
        # overall = 1.0*0.76 + 0.6175*0.19 + 1.0*0.05 = 0.9273
        self.assertGreater(seg3["segment_confidence"]["overall"], 0.85)
        self.assertIn("adjudication_llm_failure",
                       seg3["contamination_sources"])

    def test_e2e_repaired_segment_credit(self):
        data, dmg, adj, qc = self._build_fixture()
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=qc)
        seg4 = next(s for s in out["segments"] if s["id"] == 4)
        # 06e repair credit: t_mult = max(0.30, 0.95) = 0.95
        # Then adj merge: (0.95 + 0.85) / 2 = 0.90
        # Then 06g repair credit boosts to max(0.90, 0.95) = 0.95
        # Speaker: override → max(0.95, 0.85) = 0.95, then adj merge (0.95+0.90)/2=0.925
        self.assertGreater(seg4["segment_confidence"]["transcript"], 0.85)

    def test_e2e_conversation_score_reasonable(self):
        """Compilation conversation with mixed segments should have reasonable score."""
        data, dmg, adj, qc = self._build_fixture()
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=qc)
        conv = out["conversations"][0]
        score = conv["conversation_confidence_score"]
        self.assertGreater(score, 0.50, "Score should not be catastrophically low")
        # confidence_block_reason field should not exist.
        self.assertNotIn("confidence_block_reason", conv)


class TestDamageMultiplier(unittest.TestCase):
    """Unit tests for _damage_multiplier internal function."""

    def test_no_damage(self):
        t, s, p = stage_06h._damage_multiplier(set())
        self.assertEqual(t, 1.0)
        self.assertEqual(s, 1.0)
        self.assertEqual(p, 1.0)

    def test_transcript_artifact(self):
        t, s, p = stage_06h._damage_multiplier({"transcript_artifact"})
        self.assertAlmostEqual(t, 0.30)
        self.assertAlmostEqual(p, 0.70)
        self.assertEqual(s, 1.0)

    def test_speaker_ambiguity_infield(self):
        _, s, _ = stage_06h._damage_multiplier(
            {"speaker_ambiguity"}, video_type="infield")
        self.assertAlmostEqual(s, SPEAKER_AMBIGUITY_MULT_INFIELD)

    def test_speaker_ambiguity_compilation_no_override(self):
        _, s, _ = stage_06h._damage_multiplier(
            {"speaker_ambiguity"}, video_type="compilation")
        self.assertAlmostEqual(s, SPEAKER_AMBIGUITY_MULT_COMPILATION_NO_OVERRIDE)

    def test_speaker_ambiguity_compilation_with_override(self):
        _, s, _ = stage_06h._damage_multiplier(
            {"speaker_ambiguity"}, video_type="compilation",
            has_speaker_role_override=True)
        self.assertAlmostEqual(s, SPEAKER_AMBIGUITY_MULT_COMPILATION_WITH_OVERRIDE)

    def test_combined_damage(self):
        t, s, p = stage_06h._damage_multiplier(
            {"transcript_artifact", "speaker_ambiguity", "mixed_mode"},
            video_type="infield")
        self.assertAlmostEqual(t, 0.30)
        self.assertAlmostEqual(s, SPEAKER_AMBIGUITY_MULT_INFIELD)
        self.assertAlmostEqual(p, 0.70 * 0.55)


class TestPenaltyTrace(unittest.TestCase):
    """v2.1: Damaged segments should have non-empty penalties in confidence trace."""

    def test_damaged_segment_has_penalties(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"], ["transcript_artifact"])])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=None)
        # The internal _penalty_trace_by_seg should be populated
        trace_by_seg = out.get("_penalty_trace_by_seg", {})
        self.assertIn(1, trace_by_seg)
        penalties = trace_by_seg[1]
        self.assertTrue(len(penalties) > 0, "Damaged segment should have penalty entries")
        # Check structure of first penalty
        p = penalties[0]
        self.assertIn("issue_code", p)
        self.assertIn("axis", p)
        self.assertIn("multiplier", p)
        self.assertIn("before", p)
        self.assertIn("after", p)
        self.assertEqual(p["issue_code"], "damage_multiplier")

    def test_clean_segment_no_penalties(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        trace_by_seg = out.get("_penalty_trace_by_seg", {})
        penalties = trace_by_seg.get(1, [])
        self.assertEqual(len(penalties), 0, "Clean segment should have no penalties")

    def test_adjudication_merge_penalty(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"], ["transcript_artifact"])])
        adj = _make_adjudication([{
            "seed_segment_id": 1,
            "adjudication": {
                "transcript_confidence": 0.80,
                "speaker_confidence": 0.90,
                "phase_confidence": 0.85,
            },
        }])
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=adj, quality_check=None)
        trace_by_seg = out.get("_penalty_trace_by_seg", {})
        penalties = trace_by_seg.get(1, [])
        codes = [p["issue_code"] for p in penalties]
        self.assertIn("damage_multiplier", codes)
        self.assertIn("adjudication_merge", codes)


class TestRepairCreditMetadata(unittest.TestCase):
    """v2.1: Repaired segments should carry visible repair metadata."""

    def test_repair_credit_applied_flag(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"], ["transcript_artifact"])])
        qc = {
            "transcript_artifacts": [{"segment_index": 1, "repaired": True}],
            "low_quality_segments": [],
        }
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=qc)
        seg = out["segments"][0]
        self.assertTrue(seg.get("repair_credit_applied"),
                        "Repaired segment should have repair_credit_applied=True")

    def test_non_repaired_no_flag(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        out, _ = _propagate(data_06d=data, damage_map=None,
                             adjudication=None, quality_check=None)
        seg = out["segments"][0]
        self.assertFalse(seg.get("repair_credit_applied", False),
                         "Clean segment should not have repair_credit_applied")

    def test_contains_repaired_text_includes_06e(self):
        """06e repaired segments should have contains_repaired_text=True."""
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"], ["transcript_artifact"])])
        qc = {
            "transcript_artifacts": [{"segment_index": 1, "repaired": True}],
            "low_quality_segments": [],
        }
        out, _ = _propagate(data_06d=data, damage_map=dmg,
                             adjudication=None, quality_check=qc)
        seg = out["segments"][0]
        self.assertTrue(seg.get("contains_repaired_text"),
                        "06e-repaired segment should have contains_repaired_text=True")


class TestDamageTypeCounts(unittest.TestCase):
    """v2.1: Report should include damage_type_counts dict."""

    def test_report_has_damage_type_counts(self):
        segs = [_make_segment(1), _make_segment(2)]
        data = _make_06d(segs)
        dmg = _make_damage_map([
            (1, ["transcript_artifact"], ["transcript_artifact"]),
            (2, ["speaker_ambiguity", "mixed_mode"],
             ["speaker_ambiguity", "mixed_mode"]),
        ])
        _, report = _propagate(data_06d=data, damage_map=dmg,
                                adjudication=None, quality_check=None)
        dtc = report.get("damage_type_counts")
        self.assertIsInstance(dtc, dict)
        self.assertEqual(dtc.get("transcript_artifact"), 1)
        self.assertEqual(dtc.get("speaker_ambiguity"), 1)
        self.assertEqual(dtc.get("mixed_mode"), 1)

    def test_no_damage_empty_counts(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        _, report = _propagate(data_06d=data, damage_map=None,
                                adjudication=None, quality_check=None)
        dtc = report.get("damage_type_counts")
        self.assertIsInstance(dtc, dict)
        self.assertEqual(len(dtc), 0, "No damage should produce empty counts")

    def test_report_has_repair_credit_segments(self):
        segs = [_make_segment(1)]
        data = _make_06d(segs)
        dmg = _make_damage_map([(1, ["transcript_artifact"], ["transcript_artifact"])])
        qc = {
            "transcript_artifacts": [{"segment_index": 1, "repaired": True}],
            "low_quality_segments": [],
        }
        _, report = _propagate(data_06d=data, damage_map=dmg,
                                adjudication=None, quality_check=qc)
        self.assertEqual(report["summary"]["repair_credit_segments"], 1)


if __name__ == "__main__":
    unittest.main()
