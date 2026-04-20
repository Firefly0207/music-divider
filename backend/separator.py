"""
Demucs 기반 stem 분리 모듈.
htdemucs 모델로 vocals / drums / bass / other 4개 트랙 분리.
"""
import threading
from pathlib import Path
from typing import Callable

import librosa
import numpy as np
import soundfile as sf
import torch

STEM_LABELS = {
    "vocals": "보컬",
    "drums": "드럼",
    "bass": "베이스",
    "guitar": "기타",
    "piano": "피아노",
    "other": "기타 악기",
}
STEM_COLORS = {
    "vocals": "#6366f1",
    "drums": "#f43f5e",
    "bass": "#f59e0b",
    "guitar": "#10b981",
    "piano": "#8b5cf6",
    "other": "#06b6d4",
}

_model = None
_model_lock = threading.Lock()


def load_model():
    """앱 시작 시 한 번만 호출. 모델을 메모리에 로드."""
    global _model
    with _model_lock:
        if _model is None:
            from demucs.pretrained import get_model
            _model = get_model("htdemucs_6s")
            _model.eval()
            if torch.cuda.is_available():
                _model.cuda()
    return _model


def separate(
    input_path: Path,
    output_dir: Path,
    on_progress: Callable[[int, str], None] | None = None,
    quality: str = "fast",
):
    """
    오디오 파일을 stem으로 분리.
    on_progress(percent, stage_text) 콜백으로 진행률 보고.
    """
    def progress(pct, stage):
        if on_progress:
            on_progress(pct, stage)

    progress(5, "모델 준비 중...")
    model = load_model()

    progress(15, "오디오 로딩 중...")
    y, _ = librosa.load(str(input_path), sr=int(model.samplerate), mono=False, res_type="polyphase")
    if y.ndim == 1:
        y = np.stack([y, y])
    elif y.shape[0] > 2:
        y = y[:2]

    wav = torch.from_numpy(y).float()

    progress(25, "분리 처리 중...")

    from demucs.apply import apply_model

    device = next(model.parameters()).device
    overlap = 0.1 if quality == "fast" else 0.25
    shifts = 1 if quality == "fast" else 2

    final_sources = apply_model(
        model,
        wav.unsqueeze(0),
        device=device,
        shifts=shifts,
        split=True,
        overlap=overlap,
        progress=False,
        num_workers=0,
    )  # (1, 4, 2, T)

    progress(90, "저장 중...")
    output_dir.mkdir(parents=True, exist_ok=True)

    stem_paths = {}
    for idx, stem_name in enumerate(model.sources):
        source = final_sources[0, idx]  # (2, T)
        out_path = output_dir / f"{stem_name}.wav"
        sf.write(str(out_path), source.numpy().T, int(model.samplerate), subtype="PCM_16")
        stem_paths[stem_name] = out_path

    progress(100, "완료")
    return stem_paths
