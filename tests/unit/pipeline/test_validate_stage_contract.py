#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_MODULE_PATH = (
    Path(__file__).resolve().parents[3]
    / "scripts"
    / "training-data"
    / "validation"
    / "validate_stage_contract.py"
)
_SPEC = importlib.util.spec_from_file_location("validate_stage_contract", _MODULE_PATH)
stage_contract = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(stage_contract)


def _write(path: Path, content: str = "{}") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class TestValidateStageContract(unittest.TestCase):
    def test_stage05_collects_only_clean16k_artifacts(self) -> None:
        clean_id = "AAAAAAAAAAA"
        raw_id = "BBBBBBBBBBB"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(
                root
                / "data/05.EXT.audio-features/source"
                / f"Clean [{clean_id}]"
                / f"Clean [{clean_id}].audio.asr.clean16k.audio_features.json"
            )
            _write(
                root
                / "data/05.EXT.audio-features/source"
                / f"Raw [{raw_id}]"
                / f"Raw [{raw_id}].audio.asr.raw16k.audio_features.json"
            )

            with patch.object(stage_contract, "repo_root", return_value=root):
                present_ids = stage_contract._collect_stage_video_ids("05")

            self.assertEqual(present_ids, {clean_id})

    def test_stage06_dependency_marks_raw_only_video_missing(self) -> None:
        clean_id = "CCCCCCCCCCC"
        raw_id = "DDDDDDDDDDD"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "docs/pipeline/batches/TEMP.txt"
            _write(
                manifest,
                "\n".join(
                    [
                        f"src | Clean Video [{clean_id}]",
                        f"src | Raw Video [{raw_id}]",
                    ]
                ),
            )
            _write(
                root
                / "data/05.EXT.audio-features/src"
                / f"Clean Video [{clean_id}]"
                / f"Clean Video [{clean_id}].audio.asr.clean16k.audio_features.json"
            )
            _write(
                root
                / "data/05.EXT.audio-features/src"
                / f"Raw Video [{raw_id}]"
                / f"Raw Video [{raw_id}].audio.asr.raw16k.audio_features.json"
            )

            with patch.object(stage_contract, "repo_root", return_value=root):
                manifest_ids = stage_contract._load_manifest_video_ids(manifest, source_filter=None)
                present_ids = stage_contract._collect_stage_video_ids("05")

            missing_ids = sorted(manifest_ids - present_ids)
            self.assertEqual(missing_ids, [raw_id])


if __name__ == "__main__":
    unittest.main(verbosity=2)
