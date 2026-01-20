#!/usr/bin/env python3
"""
Audio Feature Extraction for Daygame Training Data

Extracts per-segment features:
- Pitch (mean/std/range/direction)
- Energy (RMS, dynamics)
- Tempo (onset-based syllable proxy)
- Spectral brightness/rolloff
- Optional speaker embeddings (resemblyzer) and clip refs

Adds quality flags (clipping/silence) and processing metadata for reproducibility.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional

import librosa
import numpy as np

try:
    from resemblyzer import VoiceEncoder, preprocess_wav
except Exception:  # pragma: no cover - optional dependency
    VoiceEncoder = None
    preprocess_wav = None


MIN_SEGMENT_SEC = 0.1
RMS_SILENCE_THRESHOLD = 1e-4
CLIP_THRESHOLD = 0.98


@dataclass
class QualityFlags:
    clipped: bool
    low_energy: bool
    voiced_ratio: Optional[float]

    def to_dict(self) -> Dict:
        return asdict(self)


def hash_file(path: Path) -> str:
    """Small helper to checksum the source audio for reproducibility."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def detect_quality(segment: np.ndarray, voiced_probs: Optional[np.ndarray]) -> QualityFlags:
    rms = np.sqrt(np.mean(segment**2)) if len(segment) else 0
    clipped = bool(np.any(np.abs(segment) > CLIP_THRESHOLD))
    low_energy = rms < RMS_SILENCE_THRESHOLD
    voiced_ratio = None
    if voiced_probs is not None:
        valid = voiced_probs[~np.isnan(voiced_probs)]
        if valid.size:
            voiced_ratio = float(np.mean(valid))
    return QualityFlags(clipped=clipped, low_energy=low_energy, voiced_ratio=voiced_ratio)


def extract_segment_features(
    y: np.ndarray, sr: int, start_time: float, end_time: float
) -> Optional[Dict]:
    """Extract audio features for a single segment."""
    start_sample = int(start_time * sr)
    end_sample = int(end_time * sr)
    segment = y[start_sample:end_sample]

    if len(segment) < sr * MIN_SEGMENT_SEC:
        return None

    features: Dict = {}

    f0, voiced_flag, voiced_probs = librosa.pyin(
        segment,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr,
    )

    f0_valid = f0[~np.isnan(f0)]
    if f0_valid.size:
        direction = float(np.polyfit(np.arange(len(f0_valid)), f0_valid, 1)[0]) if len(f0_valid) > 1 else 0.0
        features["pitch"] = {
            "mean_hz": float(np.mean(f0_valid)),
            "std_hz": float(np.std(f0_valid)),
            "min_hz": float(np.min(f0_valid)),
            "max_hz": float(np.max(f0_valid)),
            "range_hz": float(np.max(f0_valid) - np.min(f0_valid)),
            "direction": direction,
            # Safety check for empty voiced_probs to prevent NaN
            "voiced_ratio": float(np.mean(voiced_probs[~np.isnan(voiced_probs)])) if np.any(~np.isnan(voiced_probs)) else 0.0,
        }
    else:
        features["pitch"] = None

    rms = librosa.feature.rms(y=segment)[0]
    features["energy"] = {
        "mean_db": float(20 * np.log10(np.mean(rms) + 1e-10)),
        "max_db": float(20 * np.log10(np.max(rms) + 1e-10)),
        "std_db": float(20 * np.log10(np.std(rms) + 1e-10)),
        "dynamics_db": float(20 * np.log10(np.max(rms) / (np.mean(rms) + 1e-10))),
    }

    onset_frames = librosa.onset.onset_detect(y=segment, sr=sr)
    duration = max(end_time - start_time, 1e-6)
    features["tempo"] = {
        "syllable_rate": float(len(onset_frames) / duration),
        "onset_count": int(len(onset_frames)),
        "duration_sec": float(duration),
    }

    spectral_centroid = librosa.feature.spectral_centroid(y=segment, sr=sr)[0]
    spectral_rolloff = librosa.feature.spectral_rolloff(y=segment, sr=sr)[0]
    features["spectral"] = {
        "brightness_hz": float(np.mean(spectral_centroid)),
        "rolloff_hz": float(np.mean(spectral_rolloff)),
    }

    quality = detect_quality(segment, voiced_probs)
    features["quality"] = quality.to_dict()

    return features


def maybe_embed_segment(
    encoder: Optional[VoiceEncoder],
    segment: np.ndarray,
    sr: int,
) -> Optional[List[float]]:
    """Compute a speaker embedding for the segment if encoder available."""
    if encoder is None or preprocess_wav is None:
        return None
    # preprocess_wav can take raw waveform with sampling rate
    wav = preprocess_wav(segment, source_sr=sr)
    if wav.size == 0:
        return None
    emb = encoder.embed_utterance(wav)
    return [float(x) for x in emb]


def process_audio_file(
    audio_path: Path,
    timestamps_path: Path,
    output_path: Path,
    embed: bool = False,
) -> Dict:
    """Process a single audio file with its timestamps."""
    y, sr = librosa.load(audio_path, sr=22050)

    with timestamps_path.open("r") as f:
        whisper_data = json.load(f)

    encoder = VoiceEncoder() if (embed and VoiceEncoder is not None) else None

    results: Dict = {
        "source_audio": str(audio_path),
        "audio_sha256": hash_file(audio_path),
        "source_timestamps": str(timestamps_path),
        "processing": {
            "sample_rate": sr,
            "librosa_version": librosa.__version__,
            "pyin_range": ["C2", "C6"],
            "embedder": "resemblyzer" if encoder else None,
        },
        "total_duration_sec": float(len(y) / sr),
        "segments": [],
    }

    for segment in whisper_data.get("segments", []):
        start = float(segment["start"])
        end = float(segment["end"])
        text = segment.get("text", "")

        features = extract_segment_features(y, sr, start, end)
        if not features:
            continue

        item = {
            "start": start,
            "end": end,
            "text": text.strip(),
            "features": features,
            "audio_clip": {
                "file": str(audio_path),
                "start": start,
                "end": end,
            },
        }

        if "content_type" in segment:
            item["content_type"] = segment["content_type"]

        if embed:
            segment_audio = y[int(start * sr) : int(end * sr)]
            embedding = maybe_embed_segment(encoder, segment_audio, sr)
            if embedding:
                item["speaker_embedding"] = embedding

        results["segments"].append(item)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(results, f, indent=2, default=_json_default)

    return results


def _json_default(o):
    """JSON serializer for numpy types."""
    import numpy as np

    if isinstance(o, np.generic):
        return o.item()
    raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract audio features from daygame recordings.")
    parser.add_argument("--audio", required=True, help="Path to audio file (.opus/.mp3/.wav)")
    parser.add_argument("--timestamps", required=True, help="Path to Whisper JSON with timestamps")
    parser.add_argument("--output", required=True, help="Output path for features JSON")
    parser.add_argument("--embed", action="store_true", help="Compute speaker embeddings with resemblyzer")
    args = parser.parse_args()

    audio_path = Path(args.audio)
    timestamps_path = Path(args.timestamps)
    output_path = Path(args.output)

    print(f"[features] {audio_path.name} -> {output_path}")
    results = process_audio_file(audio_path, timestamps_path, output_path, embed=args.embed)
    print(f"  segments with features: {len(results['segments'])}")


if __name__ == "__main__":
    main()
