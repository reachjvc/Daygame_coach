#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
import unittest
from collections import Counter
from pathlib import Path

_VALIDATION_DIR = (
    Path(__file__).resolve().parents[3]
    / "scripts"
    / "training-data"
    / "validation"
)
if str(_VALIDATION_DIR) not in sys.path:
    sys.path.insert(0, str(_VALIDATION_DIR))


def _load_module(name: str, rel_path: str):
    module_path = Path(__file__).resolve().parents[3] / rel_path
    spec = importlib.util.spec_from_file_location(name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


validate_manifest = _load_module(
    "validate_manifest_signal_map",
    "scripts/training-data/validation/validate_manifest.py",
)
validate_stage_report = _load_module(
    "validate_stage_report_signal_map",
    "scripts/training-data/validation/validate_stage_report.py",
)


class TestValidateSignalClassMappings(unittest.TestCase):
    def test_validate_manifest_stage06b_flag_low_transcript_maps_to_transcript_quality(self) -> None:
        got = validate_manifest._canonical_signal_class(
            {"check": "stage06b_flag_low_transcript_quality"}
        )
        self.assertEqual(got, "transcript_quality")

    def test_validate_manifest_stage06b_flag_severe_maps_to_transcript_quality(self) -> None:
        got = validate_manifest._canonical_signal_class(
            {"check": "stage06b_flag_severe"}
        )
        self.assertEqual(got, "transcript_quality")

    def test_validate_manifest_stage06b_contract_preflight_maps_to_artifact_contract(self) -> None:
        got = validate_manifest._canonical_signal_class(
            {"check": "stage06b_contract_preflight_fail"}
        )
        self.assertEqual(got, "artifact_contract")

    def test_validate_stage_report_reason_mapping_for_stage06b_flags(self) -> None:
        self.assertEqual(
            validate_stage_report._signal_class_for_readiness_reason(
                "stage06b_flag_low_transcript_quality",
                Counter(),
            ),
            "transcript_quality",
        )
        self.assertEqual(
            validate_stage_report._signal_class_for_readiness_reason(
                "stage06b_flag_severe",
                Counter(),
            ),
            "transcript_quality",
        )
        self.assertEqual(
            validate_stage_report._signal_class_for_readiness_reason(
                "stage06b_contract_preflight_fail",
                Counter(),
            ),
            "artifact_contract",
        )

    def test_validate_stage_report_check_mapping_for_stage06b_flags(self) -> None:
        self.assertEqual(
            validate_stage_report._warning_class_for_check(
                "stage06b_flag_low_transcript_quality"
            ),
            "transcript_quality",
        )
        self.assertEqual(
            validate_stage_report._warning_class_for_check("stage06b_flag_severe"),
            "transcript_quality",
        )
        self.assertEqual(
            validate_stage_report._warning_class_for_check(
                "stage06b_contract_preflight_fail"
            ),
            "artifact_contract",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
