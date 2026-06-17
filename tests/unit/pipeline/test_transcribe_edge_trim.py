#!/usr/bin/env python3
"""Tests for the Stage 02 intro/outro ASR-artifact edge trimmer (_trim_edge_artifacts)."""
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

_MODULE_PATH = _SCRIPTS_DIR / "02.EXT.transcribe"
_LOADER = importlib.machinery.SourceFileLoader("transcribe02", str(_MODULE_PATH))
_SPEC = importlib.util.spec_from_loader("transcribe02", loader=_LOADER)
transcribe02 = types.ModuleType("transcribe02")
transcribe02.__file__ = str(_MODULE_PATH)
transcribe02.__spec__ = _SPEC
sys.modules["transcribe02"] = transcribe02
_LOADER.exec_module(transcribe02)

_trim = transcribe02._trim_edge_artifacts


def _segs(texts):
    return [{"text": t, "start": float(i), "end": float(i) + 1.0} for i, t in enumerate(texts)]


class TestEdgeTrim(unittest.TestCase):
    def test_single_fat_intro_segment_trimmed(self) -> None:
        # One leading segment that is "Pew!" repeated 110x (the NhaqeRwLPJY shape).
        segs = _segs(["Pew! " * 110] + ["You look like a cute librarian honestly", "going to H and M"])
        trimmed, report = _trim(segs)
        self.assertIsNotNone(report)
        self.assertEqual(report["lead_trimmed"], 1)
        self.assertEqual(report["lead_text"], "pew")
        self.assertEqual(len(trimmed), 2)
        self.assertTrue(trimmed[0]["text"].startswith("You look"))

    def test_many_separate_intro_segments_trimmed(self) -> None:
        # Same artifact expressed as 30 separate one-token segments (post-alignment shape).
        segs = _segs(["Pew!"] * 30 + ["real conversation starts here now", "and continues onward"])
        trimmed, report = _trim(segs)
        self.assertIsNotNone(report)
        self.assertEqual(report["lead_trimmed"], 30)
        self.assertEqual(len(trimmed), 2)

    def test_trailing_outro_trimmed(self) -> None:
        segs = _segs(["real opener line here", "more real talk continues"] + ["la"] * 20)
        trimmed, report = _trim(segs)
        self.assertIsNotNone(report)
        self.assertEqual(report["trail_trimmed"], 20)
        self.assertEqual(report["lead_trimmed"], 0)
        self.assertEqual(len(trimmed), 2)

    def test_clean_transcript_untouched(self) -> None:
        segs = _segs([
            "hey how are you doing today",
            "I am well thanks for asking friend",
            "lets talk about your day",
        ])
        trimmed, report = _trim(segs)
        self.assertIsNone(report)
        self.assertEqual(len(trimmed), 3)

    def test_short_legit_repeat_not_trimmed(self) -> None:
        # "yeah yeah" is short but only spans 2 tokens -> below min_run -> must not trim.
        segs = _segs(["yeah yeah", "real content right here now", "more real content here"])
        trimmed, report = _trim(segs)
        self.assertIsNone(report)

    def test_repeated_longer_word_not_trimmed(self) -> None:
        # A long run of a *longer* word (> max_token_len, e.g. "absolutely") is treated as
        # potential real content, not a short music-onomatopoeia artifact.
        segs = _segs(["absolutely " * 20] + ["genuine dialogue line one", "genuine dialogue line two"])
        trimmed, report = _trim(segs)
        self.assertIsNone(report)

    def test_does_not_trim_entire_transcript(self) -> None:
        # All-artifact input: do not return an empty transcript.
        segs = _segs(["Pew!"] * 40)
        trimmed, report = _trim(segs)
        self.assertIsNone(report)
        self.assertEqual(len(trimmed), 40)

    def test_empty_input(self) -> None:
        trimmed, report = _trim([])
        self.assertIsNone(report)
        self.assertEqual(trimmed, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
