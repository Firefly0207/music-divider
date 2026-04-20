"""
Music Divider — FastAPI 백엔드
로컬 전용. 원본/분리 파일은 temp_jobs/ 에만 저장, 영구 보존 없음.
"""
import os
import shutil
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import aiofiles
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from analyzer import analyze_stems, compute_waveform_peaks
from separator import STEM_COLORS, STEM_LABELS, separate, load_model

# ── 설정 ────────────────────────────────────────────────────────────────
TEMP_DIR = Path("./temp_jobs")
MAX_FILE_BYTES = 100 * 1024 * 1024   # 100 MB
MAX_DURATION_SEC = 600               # 10분
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aiff", ".aif"}
JOB_TTL_HOURS = 24                   # 이 시간 지난 temp_jobs 자동 삭제

# ── Job 상태 저장소 (in-memory) ──────────────────────────────────────────
# { job_id: { status, progress, stage, error, stems, waveforms, analysis } }
jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()


# ── 수명주기 ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    TEMP_DIR.mkdir(exist_ok=True)
    _cleanup_old_jobs()
    # 모델을 백그라운드에서 미리 로드 (첫 분리 시 대기 없앰)
    threading.Thread(target=load_model, daemon=True).start()
    yield
    # 종료 시 아무것도 안 함 (temp_jobs는 다음 시작 시 정리)


app = FastAPI(title="Music Divider API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 헬퍼 ─────────────────────────────────────────────────────────────────
def _cleanup_old_jobs():
    """오래된 temp 디렉토리 삭제."""
    if not TEMP_DIR.exists():
        return
    cutoff = time.time() - JOB_TTL_HOURS * 3600
    for job_dir in TEMP_DIR.iterdir():
        if job_dir.is_dir() and job_dir.stat().st_mtime < cutoff:
            shutil.rmtree(job_dir, ignore_errors=True)


def _set_job(job_id: str, **kwargs):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(kwargs)


def _run_separation(job_id: str, input_path: Path, quality: str):
    """백그라운드 스레드에서 분리 실행."""
    stems_dir = TEMP_DIR / job_id / "stems"

    def on_progress(pct: int, stage: str):
        _set_job(job_id, progress=pct, stage=stage)

    try:
        stem_paths = separate(input_path, stems_dir, on_progress=on_progress, quality=quality)

        # waveform peaks 계산
        _set_job(job_id, stage="파형 분석 중...")
        waveforms = {}
        for name, path in stem_paths.items():
            waveforms[name] = compute_waveform_peaks(path)

        # 원본 파형도 계산
        waveforms["original"] = compute_waveform_peaks(input_path)

        # sound tag 분석
        _set_job(job_id, stage="사운드 분석 중...")
        analysis = analyze_stems(stem_paths)

        # duration 계산
        import librosa
        duration = librosa.get_duration(path=str(input_path))

        stems_info = []
        for name in stem_paths:
            stems_info.append({
                "name": name,
                "label": STEM_LABELS.get(name, name),
                "color": STEM_COLORS.get(name, "#888"),
            })

        _set_job(
            job_id,
            status="done",
            progress=100,
            stage="완료",
            stems=stems_info,
            waveforms=waveforms,
            analysis=analysis,
            duration=round(duration, 2),
        )

    except Exception as e:
        _set_job(job_id, status="error", stage="", error=str(e), progress=0)


# ── API ──────────────────────────────────────────────────────────────────

@app.post("/api/jobs")
async def create_job(
    file: UploadFile = File(...),
    quality: Literal["fast", "better"] = Form("fast"),
):
    """파일 업로드 + 분리 작업 시작."""
    # 확장자 검증
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"지원하지 않는 파일 형식입니다. ({', '.join(ALLOWED_EXTENSIONS)})")

    # 크기 검증 (스트리밍 저장하면서 확인)
    job_id = str(uuid.uuid4())
    job_dir = TEMP_DIR / job_id
    job_dir.mkdir(parents=True)
    input_path = job_dir / f"original{suffix}"

    total_bytes = 0
    async with aiofiles.open(input_path, "wb") as f:
        while chunk := await file.read(1024 * 256):
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_BYTES:
                await f.close()
                shutil.rmtree(job_dir, ignore_errors=True)
                raise HTTPException(413, "파일이 너무 큽니다. (최대 100MB)")
            await f.write(chunk)

    # 길이 검증
    try:
        import librosa
        duration = librosa.get_duration(path=str(input_path))
        if duration > MAX_DURATION_SEC:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(400, f"파일이 너무 깁니다. (최대 {MAX_DURATION_SEC // 60}분)")
    except HTTPException:
        raise
    except Exception:
        pass  # duration 확인 실패해도 계속 진행

    # Job 등록
    with jobs_lock:
        jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "stage": "준비 중...",
            "error": None,
            "stems": [],
            "waveforms": {},
            "analysis": [],
            "duration": 0,
            "filename": file.filename,
        }

    # 백그라운드 분리 시작
    t = threading.Thread(
        target=_run_separation, args=(job_id, input_path, quality), daemon=True
    )
    t.start()

    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}/status")
def get_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    return {
        "status": job["status"],
        "progress": job["progress"],
        "stage": job["stage"],
        "error": job["error"],
    }


@app.get("/api/jobs/{job_id}/stems")
def get_stems(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    if job["status"] != "done":
        raise HTTPException(400, "아직 처리 중입니다.")
    return {
        "stems": job["stems"],
        "duration": job["duration"],
        "filename": job["filename"],
    }


@app.get("/api/jobs/{job_id}/stems/{stem_name}/audio")
def get_stem_audio(job_id: str, stem_name: str):
    path = TEMP_DIR / job_id / "stems" / f"{stem_name}.wav"
    if not path.exists():
        raise HTTPException(404, "해당 stem 파일을 찾을 수 없습니다.")
    return FileResponse(str(path), media_type="audio/wav")


@app.get("/api/jobs/{job_id}/stems/{stem_name}/waveform")
def get_waveform(job_id: str, stem_name: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(404, "데이터 없음")
    peaks = job["waveforms"].get(stem_name, [])
    return {"peaks": peaks}


@app.get("/api/jobs/{job_id}/analysis")
def get_analysis(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(404, "데이터 없음")
    return {"segments": job["analysis"]}


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    """세션 종료 시 temp 파일 정리."""
    with jobs_lock:
        jobs.pop(job_id, None)
    job_dir = TEMP_DIR / job_id
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}


# 프론트엔드 빌드 파일 서빙 (프로덕션 빌드 후)
frontend_dist = Path("../frontend/dist")
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
