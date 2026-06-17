#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import importlib.machinery
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

_SCRIPTS_DIR = Path(__file__).resolve().parents[3] / "scripts" / "training-data" / "batch"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

_MODULE_PATH = _SCRIPTS_DIR / "pipeline-runner"
_SPEC = importlib.util.spec_from_loader(
    "pipeline_runner",
    loader=importlib.machinery.SourceFileLoader("pipeline_runner", str(_MODULE_PATH)),
)
pipeline_runner = types.ModuleType("pipeline_runner")
pipeline_runner.__file__ = str(_MODULE_PATH)
pipeline_runner.__spec__ = _SPEC
sys.modules["pipeline_runner"] = pipeline_runner
_LOADER = importlib.machinery.SourceFileLoader("pipeline_runner", str(_MODULE_PATH))
_LOADER.exec_module(pipeline_runner)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


class TestPipelineRunnerStage06Gate(unittest.TestCase):
    def test_stage06_unrepaired_collapse_blocks(self) -> None:
        # Large collapse that Stage 06 could NOT reassign (low rate + many unknowns) -> block.
        video_id = "AAAAAAAAAAA"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "speaker_collapse": {
                        "detected": True,
                        "total_segments_affected": 130,
                        "reassignment_rate": 0.5,
                        "unknown_count": 40,
                    },
                    "transcript_confidence": {"score": 38},
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06_gate(video_id, "src")

        self.assertTrue(should_block)
        self.assertEqual(check_key, "stage06_speaker_collapse_overload")
        self.assertIsInstance(message, str)
        self.assertIn("affected_segments=130", message or "")

    def test_stage06_repaired_large_collapse_does_not_block(self) -> None:
        # Large collapse that Stage 06 fully reassigned (rate 1.0, 0 unknown) must PASS,
        # regardless of raw affected count. Regression guard for the K8_TBjaiNUk false-kill.
        video_id = "KKKKKKKKKKK"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "speaker_collapse": {
                        "detected": True,
                        "total_segments_affected": 151,
                        "reassignment_rate": 1.0,
                        "unknown_count": 0,
                    },
                    "transcript_confidence": {"score": 72},
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06_gate(video_id, "src")

        self.assertFalse(should_block)
        self.assertIsNone(check_key)
        self.assertIsNone(message)

    def test_stage06_collapse_many_unknowns_blocks(self) -> None:
        # High reassignment rate but a large absolute number of unresolved segments -> block.
        video_id = "UUUUUUUUUUU"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "speaker_collapse": {
                        "detected": True,
                        "total_segments_affected": 300,
                        "reassignment_rate": 0.9,
                        "unknown_count": 30,
                    },
                    "transcript_confidence": {"score": 50},
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06_gate(video_id, "src")

        self.assertTrue(should_block)
        self.assertEqual(check_key, "stage06_speaker_collapse_overload")

    def test_stage06_small_collapse_does_not_block(self) -> None:
        video_id = "BBBBBBBBBBB"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "speaker_collapse": {
                        "detected": True,
                        "total_segments_affected": 18,
                        "reassignment_rate": 0.7,
                        "unknown_count": 5,
                    },
                    "transcript_confidence": {"score": 58},
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06_gate(video_id, "src")

        self.assertFalse(should_block)
        self.assertIsNone(check_key)
        self.assertIsNone(message)

    def test_stage06b_flag_with_very_low_transcript_score_blocks(self) -> None:
        video_id = "EEEEEEEEEEE"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "transcript_confidence": {"score": 32},
                },
            )
            _write_json(
                data_dir
                / "06b.LLM.verify/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")

        self.assertTrue(should_block)
        self.assertEqual(check_key, "stage06b_flag_low_transcript_quality")
        self.assertIsInstance(message, str)
        self.assertIn("32.0", message or "")

    def test_stage06b_flag_at_threshold_blocks(self) -> None:
        video_id = "HHHHHHHHHHH"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "transcript_confidence": {"score": 55},
                },
            )
            _write_json(
                data_dir
                / "06b.LLM.verify/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")

        self.assertTrue(should_block)
        self.assertEqual(check_key, "stage06b_flag_low_transcript_quality")
        self.assertIsInstance(message, str)
        self.assertIn("55.0", message or "")

    def test_stage06b_flag_with_healthy_transcript_score_does_not_block(self) -> None:
        video_id = "FFFFFFFFFFF"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data_dir = root / "data"
            _write_json(
                data_dir
                / "06.LLM.video-type/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "transcript_confidence": {"score": 64},
                },
            )
            _write_json(
                data_dir
                / "06b.LLM.verify/src"
                / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )

            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")

        self.assertFalse(should_block)
        self.assertIsNone(check_key)
        self.assertIsNone(message)

    def test_stage06b_noop_misattributions_do_not_block(self) -> None:
        # 6 "misattributions" that are all no-op confirmations (current == suggested) must NOT
        # count toward the severe-FLAG gate. Regression guard for the yTWnGdzgz7w false-kill.
        video_id = "NNNNNNNNNNN"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06.LLM.video-type/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {"transcript_confidence": {"score": 72}},
            )
            _write_json(
                data_dir / "06b.LLM.verify/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [
                        {"current_role": "coach", "suggested_role": "coach", "confidence": 0.9}
                        for _ in range(6)
                    ],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")
        self.assertFalse(should_block)
        self.assertIsNone(check_key)

    def test_stage06b_high_confidence_swaps_do_not_block(self) -> None:
        # Real swaps above 06c's confidence floor are deterministically corrected by 06c, so they
        # are not residual damage. Regression guard for the 06b-before-06c ordering false-kills.
        video_id = "SSSSSSSSSSS"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06.LLM.video-type/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {"transcript_confidence": {"score": 68}},
            )
            _write_json(
                data_dir / "06b.LLM.verify/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [
                        {"current_role": "target", "suggested_role": "coach", "confidence": 0.9}
                        for _ in range(7)
                    ],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")
        self.assertFalse(should_block)

    def test_stage06b_low_confidence_swaps_still_block(self) -> None:
        # Real swaps BELOW 06c's confidence floor are left unfixed -> residual damage -> block.
        video_id = "LLLLLLLLLLL"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06.LLM.video-type/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {"transcript_confidence": {"score": 70}},
            )
            _write_json(
                data_dir / "06b.LLM.verify/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [
                        {"current_role": "target", "suggested_role": "coach", "confidence": 0.5}
                        for _ in range(5)
                    ],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")
        self.assertTrue(should_block)
        self.assertEqual(check_key, "stage06b_flag_severe")

    def test_stage06b_short_clip_exempt_from_low_transcript_cliff(self) -> None:
        # A short, coherent clip (few segments) scoring at/below the cliff must NOT be blocked
        # for brevity. Regression guard for the X6VydswgnfY-style false-kill.
        video_id = "TTTTTTTTTTT"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06.LLM.video-type/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.conversations.json",
                {
                    "transcript_confidence": {"score": 55},
                    "segments": [{"text": "x"} for _ in range(7)],
                },
            )
            _write_json(
                data_dir / "06b.LLM.verify/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.verification.json",
                {
                    "verdict": "FLAG",
                    "misattributions": [],
                    "conversation_verdicts": [],
                    "boundary_issues": [],
                    "other_flags_detailed": [],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06b_gate(video_id, "src")
        self.assertFalse(should_block)

    def test_stage06f_collapse_echo_seeds_do_not_block(self) -> None:
        # 151 high-severity seeds whose only reason is the speaker collapse must NOT trip the 06f
        # overload gate (the collapse is adjudicated at the Stage 06 gate). Regression for K8.
        video_id = "FFFFFFFFFF1"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            segs = [
                {
                    "segment_id": i,
                    "severity": "high",
                    "damage_reason_codes": ["seed_speaker_collapsed"],
                }
                for i in range(151)
            ]
            segs.append({"segment_id": 151, "severity": "medium", "damage_reason_codes": ["seed_speaker_collapsed"]})
            _write_json(
                data_dir / "06f.DET.damage-map/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.damage-map.json",
                {"segments": segs},
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06f_gate(video_id, "src")
        self.assertFalse(should_block)
        self.assertIsNone(check_key)

    def test_stage06f_genuine_damage_seeds_still_block(self) -> None:
        # High-severity seeds with a REAL (non-collapse) damage reason still count -> block.
        video_id = "FFFFFFFFFF2"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            segs = [
                {
                    "segment_id": i,
                    "severity": "high",
                    "damage_reason_codes": ["seed_transcript_artifact"],
                }
                for i in range(120)
            ]
            _write_json(
                data_dir / "06f.DET.damage-map/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.damage-map.json",
                {"segments": segs},
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06f_gate(video_id, "src")
        self.assertTrue(should_block)
        self.assertIn("high_severity_seeds=120", message or "")

    def test_stage06f_mixed_reason_seed_still_counts(self) -> None:
        # A seed with collapse + a real reason is genuine damage -> counts toward the gate.
        video_id = "FFFFFFFFFF3"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            segs = [
                {
                    "segment_id": i,
                    "severity": "high",
                    "damage_reason_codes": ["seed_speaker_collapsed", "seed_transcript_artifact"],
                }
                for i in range(120)
            ]
            _write_json(
                data_dir / "06f.DET.damage-map/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.damage-map.json",
                {"segments": segs},
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06f_gate(video_id, "src")
        self.assertTrue(should_block)

    def test_substantive_low_quality_excludes_cosmetic(self) -> None:
        payload = {
            "low_quality_segments": (
                [{"reason": "Missing capitalization and punctuation"} for _ in range(30)]
                + [{"reason": "Missing punctuation between clauses"} for _ in range(10)]
                + [{"reason": "garbled audio, unintelligible"} for _ in range(3)]
            )
        }
        self.assertEqual(pipeline_runner._count_substantive_low_quality(payload), 3)

    def test_stage06f_cosmetic_low_quality_does_not_block(self) -> None:
        # 40/49 segments flagged low-quality but all cosmetic punctuation -> must NOT block.
        video_id = "PPPPPPPPPP1"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06f.DET.damage-map/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.damage-map.json",
                {"segments": []},
            )
            _write_json(
                data_dir / "06e.LLM.quality-check/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.quality-check.json",
                {
                    "summary": {"low_quality_count": 40, "segments_total": 49},
                    "low_quality_segments": [{"reason": "Missing capitalization and punctuation"} for _ in range(40)],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06f_gate(video_id, "src")
        self.assertFalse(should_block)

    def test_stage06f_substantive_low_quality_still_blocks(self) -> None:
        # 140/200 genuinely garbled -> still an overload -> block.
        video_id = "PPPPPPPPPP2"
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            _write_json(
                data_dir / "06f.DET.damage-map/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.damage-map.json",
                {"segments": []},
            )
            _write_json(
                data_dir / "06e.LLM.quality-check/src" / f"Sample [{video_id}]"
                / f"Sample [{video_id}].audio.asr.clean16k.quality-check.json",
                {
                    "summary": {"low_quality_count": 140, "segments_total": 200},
                    "low_quality_segments": [{"reason": "garbled, unintelligible audio"} for _ in range(140)],
                },
            )
            with patch.object(pipeline_runner, "DATA_DIR", data_dir):
                should_block, check_key, message = pipeline_runner.evaluate_06f_gate(video_id, "src")
        self.assertTrue(should_block)
        self.assertIn("low_quality_total=140", message or "")

    def test_resume_replays_upstream_06f_gate(self) -> None:
        video_id = "CCCCCCCCCCC"
        vs = pipeline_runner.VideoState(video_id=video_id, source="src", folder="Example")
        progress = {video_id: "pending"}

        with patch.object(pipeline_runner, "evaluate_06_gate", return_value=(False, None, None)) as mock_06, patch.object(
            pipeline_runner, "evaluate_06b_gate", return_value=(False, None, None)
        ) as mock_06b, patch.object(
            pipeline_runner,
            "evaluate_06f_gate",
            return_value=(True, "stage06f_low_quality_overload", "06f overload"),
        ) as mock_06f, patch.object(
            pipeline_runner, "evaluate_06h_gate", return_value=(False, None, None)
        ) as mock_06h:
            blocked = pipeline_runner.replay_upstream_gates_for_resume(
                vs=vs,
                start_stage_key="07",
                progress=progress,
                log_prefix=f"[{video_id}]",
            )

        self.assertTrue(blocked)
        self.assertEqual(vs.status, "quarantined")
        self.assertIn("stage06f_low_quality_overload", vs.quarantine_checks)
        self.assertEqual(progress[video_id], "QUARANTINED")
        mock_06.assert_called_once_with(video_id, "src")
        mock_06b.assert_called_once_with(video_id, "src")
        mock_06f.assert_called_once_with(video_id, "src")
        mock_06h.assert_not_called()

    def test_resume_from_06_does_not_replay_upstream_gates(self) -> None:
        video_id = "DDDDDDDDDDD"
        vs = pipeline_runner.VideoState(video_id=video_id, source="src", folder="Example")
        progress = {video_id: "pending"}

        with patch.object(pipeline_runner, "evaluate_06_gate", return_value=(True, "x", "x")) as mock_06:
            blocked = pipeline_runner.replay_upstream_gates_for_resume(
                vs=vs,
                start_stage_key="06",
                progress=progress,
                log_prefix=f"[{video_id}]",
            )

        self.assertFalse(blocked)
        self.assertEqual(vs.status, "pending")
        self.assertEqual(progress[video_id], "pending")
        mock_06.assert_not_called()

    def test_run_video_marks_llm_timeout_as_runtime_failure(self) -> None:
        video_id = "GGGGGGGGGGG"
        vs = pipeline_runner.VideoState(video_id=video_id, source="src", folder=f"Sample [{video_id}]")
        progress = {video_id: "pending"}
        stages = [pipeline_runner.Stage("06", "06.LLM.video-type", needs_llm=True)]

        async def _run() -> None:
            with patch.object(
                pipeline_runner,
                "replay_upstream_gates_for_resume",
                return_value=False,
            ), patch.object(
                pipeline_runner,
                "build_stage_command",
                return_value=["echo", "ignored"],
            ), patch.object(
                pipeline_runner,
                "run_contract_preflight",
                new=AsyncMock(return_value=0),
            ), patch.object(
                pipeline_runner,
                "run_subprocess",
                new=AsyncMock(return_value=(1, "timeout", "Claude CLI timeout after 300s")),
            ), patch.object(
                pipeline_runner,
                "run_llm_capacity_preflight",
                new=AsyncMock(return_value=(True, None)),
            ) as mock_preflight:
                await pipeline_runner.run_video(
                    vs=vs,
                    stages=stages,
                    semaphore=asyncio.Semaphore(1),
                    stage_semaphores={},
                    llm_outage_event=asyncio.Event(),
                    stage_env=None,
                    quarantine_file=None,
                    preexisting_quarantine_ids=set(),
                    dry_run=False,
                    progress=progress,
                    llm_timeout_seconds=300,
                    llm_retries=2,
                    force_stages=set(),
                )
                mock_preflight.assert_not_called()

        asyncio.run(_run())

        self.assertEqual(vs.status, "failed")
        self.assertEqual(vs.error_stage, "06")
        self.assertIn("llm_timeout_during_stage", vs.error_msg)
        self.assertEqual(progress[video_id], "FAIL(llm_timeout)")
        self.assertFalse(vs.quarantine_checks)


if __name__ == "__main__":
    unittest.main(verbosity=2)
