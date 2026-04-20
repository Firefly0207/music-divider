"""
오디오 분석: waveform peaks + 구간별 sound tags 계산.
librosa 기반. 정확한 음악 분석보다 "청취 가이드" 목적.
"""
from pathlib import Path
import numpy as np
import librosa


def compute_waveform_peaks(audio_path: Path, n_points: int = 800) -> list[float]:
    """파형 시각화용 peak 데이터 (0.0~1.0 정규화)."""
    y, _ = librosa.load(str(audio_path), mono=True, res_type="polyphase")
    if len(y) == 0:
        return [0.0] * n_points

    hop = max(1, len(y) // n_points)
    peaks = []
    for i in range(n_points):
        chunk = y[i * hop : (i + 1) * hop]
        if len(chunk) == 0:
            peaks.append(0.0)
        else:
            peaks.append(float(np.max(np.abs(chunk))))

    max_val = max(peaks) if max(peaks) > 0 else 1.0
    return [p / max_val for p in peaks]


def analyze_stems(stem_paths: dict[str, Path], n_segments: int = 40) -> list[dict]:
    """
    구간별 특징 태그 반환.
    각 segment: {time_start, time_end, energy, tags[]}
    tags: 'vocal_present', 'drum_hit', 'bass_heavy', 'quiet', 'loud'
    """
    # 각 stem의 RMS 에너지를 segment 단위로 계산
    stem_rms: dict[str, np.ndarray] = {}
    duration = None

    for stem_name, path in stem_paths.items():
        y, sr = librosa.load(str(path), mono=True, res_type="polyphase")
        if duration is None:
            duration = len(y) / sr

        seg_len = max(1, len(y) // n_segments)
        rms_vals = []
        for i in range(n_segments):
            chunk = y[i * seg_len : (i + 1) * seg_len]
            rms = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
            rms_vals.append(rms)
        stem_rms[stem_name] = np.array(rms_vals)

    if duration is None:
        return []

    seg_duration = duration / n_segments
    segments = []

    for i in range(n_segments):
        tags = []
        energy_total = sum(stem_rms[s][i] for s in stem_rms)

        # 보컬 강한 구간
        if "vocals" in stem_rms and stem_rms["vocals"][i] > 0.02:
            vocal_ratio = stem_rms["vocals"][i] / (energy_total + 1e-8)
            if vocal_ratio > 0.25:
                tags.append("vocal_strong")

        # 드럼 강한 구간
        if "drums" in stem_rms and stem_rms["drums"][i] > 0.02:
            drum_ratio = stem_rms["drums"][i] / (energy_total + 1e-8)
            if drum_ratio > 0.20:
                tags.append("drum_strong")

        # 저역 강한 구간
        if "bass" in stem_rms and stem_rms["bass"][i] > 0.015:
            bass_ratio = stem_rms["bass"][i] / (energy_total + 1e-8)
            if bass_ratio > 0.20:
                tags.append("bass_heavy")

        # 기타 강한 구간
        if "guitar" in stem_rms and stem_rms["guitar"][i] > 0.015:
            guitar_ratio = stem_rms["guitar"][i] / (energy_total + 1e-8)
            if guitar_ratio > 0.20:
                tags.append("guitar_strong")

        # 피아노 강한 구간
        if "piano" in stem_rms and stem_rms["piano"][i] > 0.015:
            piano_ratio = stem_rms["piano"][i] / (energy_total + 1e-8)
            if piano_ratio > 0.20:
                tags.append("piano_strong")

        # 조용한 구간
        if energy_total < 0.01:
            tags.append("quiet")
        elif energy_total > 0.1:
            tags.append("loud")

        segments.append({
            "index": i,
            "time_start": round(i * seg_duration, 2),
            "time_end": round((i + 1) * seg_duration, 2),
            "energy": round(float(energy_total), 4),
            "tags": tags,
        })

    return segments
