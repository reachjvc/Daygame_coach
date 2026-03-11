#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_VALIDATION_DIR = (
    Path(__file__).resolve().parents[3]
    / "scripts"
    / "training-data"
    / "validation"
)
if str(_VALIDATION_DIR) not in sys.path:
    sys.path.insert(0, str(_VALIDATION_DIR))

_MODULE_PATH = (
    Path(__file__).resolve().parents[3]
    / "scripts"
    / "training-data"
    / "validation"
    / "validate_manifest.py"
)
_SPEC = importlib.util.spec_from_file_location("validate_manifest", _MODULE_PATH)
validate_manifest = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
sys.modules["validate_manifest"] = validate_manifest
_SPEC.loader.exec_module(validate_manifest)


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class TestValidateManifestQuarantinePreserve(unittest.TestCase):
    def test_emit_quarantine_same_file_preserves_existing_stage_reasons(self) -> None:
        video_id = "AAAAAAAAAAA"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "docs/pipeline/batches/TEST.txt"
            quarantine = root / "data/validation/quarantine/TEST.json"

            _write(manifest, f"src | Test Video [{video_id}]\n")
            _write(
                quarantine,
                json.dumps(
                    {
                        "version": 1,
                        "generated_at": "2026-03-07T00:00:00Z",
                        "quarantine_level": "error",
                        "quarantined_video_count": 1,
                        "quarantined_video_ids": [video_id],
                        "videos": [
                            {
                                "video_id": video_id,
                                "source": "src",
                                "checks": ["stage06b_flag_severe"],
                                "reasons": [
                                    {
                                        "severity": "error",
                                        "check": "stage06b_flag_severe",
                                        "message": "Stage 06b severe FLAG (misattributions=17).",
                                    }
                                ],
                            }
                        ],
                    },
                    indent=2,
                )
                + "\n",
            )

            argv = [
                "validate_manifest.py",
                "--manifest",
                "docs/pipeline/batches/TEST.txt",
                "--emit-quarantine",
                "--quarantine-file",
                "data/validation/quarantine/TEST.json",
            ]
            with patch.object(validate_manifest, "repo_root", return_value=root):
                with patch("sys.argv", argv):
                    with self.assertRaises(SystemExit):
                        validate_manifest.main()

            payload = json.loads(quarantine.read_text(encoding="utf-8"))
            self.assertGreaterEqual(int(payload.get("quarantined_video_count", 0)), 1)
            rows = payload.get("videos") or []
            self.assertTrue(rows)
            checks = set(rows[0].get("checks") or [])
            self.assertIn("stage06b_flag_severe", checks)


if __name__ == "__main__":
    unittest.main(verbosity=2)
