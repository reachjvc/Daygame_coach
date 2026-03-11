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
    def test_stage06_speaker_collapse_overload_blocks(self) -> None:
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
                        "reassignment_rate": 1.0,
                        "unknown_count": 0,
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
