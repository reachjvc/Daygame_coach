#!/usr/bin/env python3
"""Tests for stage 04 turn-boundary re-segmentation (_resegment_segments_by_turns)."""
from __future__ import annotations

import importlib.machinery
import importlib.util
import sys
import types
import unittest
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[3] / "scripts" / "training-data"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

_LOADER = importlib.machinery.SourceFileLoader("diarize04", str(_SCRIPTS_DIR / "04.EXT.diarize"))
diarize04 = types.ModuleType("diarize04")
diarize04.__spec__ = importlib.util.spec_from_loader("diarize04", loader=_LOADER)
sys.modules["diarize04"] = diarize04
_LOADER.exec_module(diarize04)

_reseg = diarize04._resegment_segments_by_turns


def _seg(words, **kw):
    s = {"start": words[0][1], "end": words[-1][2], "text": " ".join(w[0] for w in words), "speaker": "SPEAKER_00",
         "words": [{"word": w, "start": a, "end": b} for w, a, b in words]}
    s.update(kw)
    return s


class TestResegment(unittest.TestCase):
    def test_two_speaker_chunk_splits(self):
        # Coach "where are you" then target "colombia ..." fused in one chunk -> split in two.
        turns = [
            {"start": 0.0, "end": 0.62, "speaker": "SPEAKER_00"},
            {"start": 0.84, "end": 5.2, "speaker": "SPEAKER_02"},
        ]
        seg = _seg([("where", 0.0, 0.28), ("are", 0.30, 0.42), ("you", 0.44, 0.50),
                    ("colombia", 1.09, 1.47), ("i", 1.50, 1.83), ("used", 1.90, 2.10), ("to", 2.1, 2.3)])
        out = _reseg([seg], turns)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0]["speaker"], "SPEAKER_00")
        self.assertEqual(out[0]["text"], "where are you")
        self.assertEqual(out[1]["speaker"], "SPEAKER_02")
        self.assertTrue(out[1]["text"].startswith("colombia"))

    def test_clean_single_speaker_unchanged(self):
        turns = [{"start": 0.0, "end": 10.0, "speaker": "SPEAKER_00"}]
        seg = _seg([("a", 0.0, 0.5), ("b", 0.6, 1.0), ("c", 1.1, 2.9), ("d", 3.0, 3.8)])
        out = _reseg([seg], turns)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["speaker"], "SPEAKER_00")

    def test_tiny_blip_merged_not_fragmented(self):
        # A 1-word foreign-speaker blip mid-monologue must NOT create a fragment.
        turns = [
            {"start": 0.0, "end": 1.0, "speaker": "SPEAKER_00"},
            {"start": 1.0, "end": 1.15, "speaker": "SPEAKER_01"},  # tiny blip
            {"start": 1.15, "end": 5.0, "speaker": "SPEAKER_00"},
        ]
        seg = _seg([("one", 0.0, 0.4), ("two", 0.5, 0.9), ("blip", 1.02, 1.10),
                    ("three", 1.2, 1.7), ("four", 1.8, 2.3), ("five", 2.4, 2.9)])
        out = _reseg([seg], turns)
        self.assertEqual(len(out), 1)  # blip absorbed
        self.assertEqual(out[0]["speaker"], "SPEAKER_00")

    def test_no_words_falls_back_to_midpoint(self):
        turns = [{"start": 0.0, "end": 5.0, "speaker": "SPEAKER_02"}]
        seg = {"start": 1.0, "end": 3.0, "text": "hi", "speaker": "SPEAKER_00", "words": []}
        out = _reseg([seg], turns)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["speaker"], "SPEAKER_02")  # reassigned by midpoint

    def test_word_speakers_updated_to_run(self):
        turns = [
            {"start": 0.0, "end": 0.62, "speaker": "SPEAKER_00"},
            {"start": 0.84, "end": 5.0, "speaker": "SPEAKER_02"},
        ]
        seg = _seg([("where", 0.0, 0.28), ("are", 0.30, 0.42), ("you", 0.44, 0.50),
                    ("colombia", 1.09, 1.47), ("i", 1.50, 1.83), ("used", 1.9, 2.1)])
        out = _reseg([seg], turns)
        for sub in out:
            for w in sub["words"]:
                self.assertEqual(w["speaker"], sub["speaker"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
