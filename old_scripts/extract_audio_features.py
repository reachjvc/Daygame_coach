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
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional

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

def load_audio_ffmpeg(path: Path, sr: int = 22050) -> tuple[np.ndarray, int]:
    """
    Load audio using ffmpeg into a mono float32 waveform in [-1, 1].

    We avoid librosa here because some environments hit numba/librosa import-time
    failures that break the whole pipeline.
    """
    if not path.exists():
        raise FileNotFoundError(path)

    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        str(path),
        "-ac",
        "1",
        "-ar",
        str(sr),
        "-f",
        "f32le",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed for {path.name} (code {proc.returncode}): {proc.stderr.decode('utf-8', errors='ignore')}"
        )

    y = np.frombuffer(proc.stdout, dtype=np.float32)
    return y, sr

def frame_audio(y: np.ndarray, frame_length: int, hop_length: int) -> np.ndarray:
    if y.size < frame_length:
        return np.empty((0, frame_length), dtype=np.float32)
    n_frames = 1 + (y.size - frame_length) // hop_length
    shape = (n_frames, frame_length)
    strides = (y.strides[0] * hop_length, y.strides[0])
    frames = np.lib.stride_tricks.as_strided(y, shape=shape, strides=strides)
    return frames.astype(np.float32, copy=False)

def rms_per_frame(frames: np.ndarray) -> np.ndarray:
    if frames.size == 0:
        return np.array([], dtype=np.float32)
    return np.sqrt(np.mean(frames * frames, axis=1) + 1e-12).astype(np.float32)

def pitch_autocorr(
    frames: np.ndarray,
    sr: int,
    fmin_hz: float = 65.41,  # C2
    fmax_hz: float = 1046.5,  # C6
    min_confidence: float = 0.3,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Very lightweight pitch tracker using normalized autocorrelation peak-picking.

    Returns:
      f0_hz: float array, NaN when unvoiced/unknown
      voiced_probs: [0..1] confidence proxy per frame
    """
    n_frames = frames.shape[0]
    if n_frames == 0:
        return np.array([], dtype=np.float32), np.array([], dtype=np.float32)

    win = np.hanning(frames.shape[1]).astype(np.float32)
    f0 = np.full((n_frames,), np.nan, dtype=np.float32)
    conf = np.zeros((n_frames,), dtype=np.float32)

    lag_min = max(1, int(sr / fmax_hz))
    lag_max = max(lag_min + 1, int(sr / fmin_hz))

    for i in range(n_frames):
        x = frames[i].astype(np.float32, copy=False)
        x = (x - np.mean(x)) * win
        if not np.any(x):
            continue

        # Autocorrelation via FFT (real, positive lags).
        n = int(2 ** np.ceil(np.log2(x.size * 2)))
        X = np.fft.rfft(x, n=n)
        r = np.fft.irfft(X * np.conj(X), n=n)[: x.size]
        r0 = float(r[0]) if r.size else 0.0
        if r0 <= 0:
            continue

        search = r[lag_min : min(lag_max, r.size)]
        if search.size == 0:
            continue

        peak_idx = int(np.argmax(search))
        peak_val = float(search[peak_idx])
        c = peak_val / (r0 + 1e-12)
        conf[i] = float(np.clip(c, 0.0, 1.0))

        if c < min_confidence:
            continue

        lag = lag_min + peak_idx
        if lag > 0:
            f0[i] = float(sr / lag)

    return f0, conf

def spectral_features(frames: np.ndarray, sr: int) -> tuple[float, float]:
    if frames.size == 0:
        return 0.0, 0.0

    win = np.hanning(frames.shape[1]).astype(np.float32)
    freqs = np.fft.rfftfreq(frames.shape[1], d=1.0 / sr).astype(np.float32)

    centroids: list[float] = []
    rolloffs: list[float] = []

    for i in range(frames.shape[0]):
        x = frames[i] * win
        mag = np.abs(np.fft.rfft(x)).astype(np.float32)
        total = float(np.sum(mag))
        if total <= 0:
            continue

        centroid = float(np.sum(freqs * mag) / (total + 1e-12))
        centroids.append(centroid)

        cumsum = np.cumsum(mag)
        target = 0.85 * cumsum[-1]
        idx = int(np.searchsorted(cumsum, target))
        idx = min(max(idx, 0), freqs.size - 1)
        rolloffs.append(float(freqs[idx]))

    if not centroids:
        return 0.0, 0.0
    return float(np.mean(centroids)), float(np.mean(rolloffs))

def onset_count_from_rms(rms: np.ndarray, hop_length: int, sr: int) -> int:
    if rms.size < 3:
        return 0
    diff = np.diff(rms)
    thr = float(np.mean(diff) + 2.0 * np.std(diff))
    count = 0
    for i in range(1, rms.size - 1):
        if diff[i - 1] > thr and rms[i] > rms[i - 1] and rms[i] >= rms[i + 1]:
            count += 1
    return count


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
    start_sample = max(0, start_sample)
    end_sample = min(int(y.size), end_sample)
    segment = y[start_sample:end_sample]

    if len(segment) < sr * MIN_SEGMENT_SEC:
        return None

    features: Dict = {}

    frame_length = int(0.04 * sr)  # 40ms
    hop_length = int(0.01 * sr)  # 10ms
    frames = frame_audio(segment, frame_length=frame_length, hop_length=hop_length)

    f0, voiced_probs = pitch_autocorr(frames, sr=sr)

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
            "voiced_ratio": float(np.mean(voiced_probs > 0.0)) if voiced_probs.size else 0.0,
        }
    else:
        features["pitch"] = None

    rms = rms_per_frame(frames)
    features["energy"] = {
        "mean_db": float(20 * np.log10(float(np.mean(rms)) + 1e-10)) if rms.size else -100.0,
        "max_db": float(20 * np.log10(float(np.max(rms)) + 1e-10)) if rms.size else -100.0,
        "std_db": float(20 * np.log10(float(np.std(rms)) + 1e-10)) if rms.size else -100.0,
        "dynamics_db": float(20 * np.log10(float(np.max(rms)) / (float(np.mean(rms)) + 1e-10))) if rms.size else 0.0,
    }

    duration = max(end_time - start_time, 1e-6)
    onset_count = onset_count_from_rms(rms, hop_length=hop_length, sr=sr)
    features["tempo"] = {
        "syllable_rate": float(onset_count / duration),
        "onset_count": int(onset_count),
        "duration_sec": float(duration),
    }

    brightness_hz, rolloff_hz = spectral_features(frames, sr=sr)
    features["spectral"] = {
        "brightness_hz": float(brightness_hz),
        "rolloff_hz": float(rolloff_hz),
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
    y, sr = load_audio_ffmpeg(audio_path, sr=22050)

    with timestamps_path.open("r") as f:
        whisper_data = json.load(f)

    encoder = VoiceEncoder() if (embed and VoiceEncoder is not None) else None

    results: Dict = {
        "source_audio": str(audio_path),
        "audio_sha256": hash_file(audio_path),
        "source_timestamps": str(timestamps_path),
        "processing": {
            "sample_rate": sr,
            "feature_extractor": "ffmpeg+numpy",
            "pitch_range_hz": [65.41, 1046.5],
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
