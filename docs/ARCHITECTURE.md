# Music Divider — Architecture

## System Overview

```
[Browser UI]  <──HTTP──>  [FastAPI Backend]  <──Python──>  [Demucs Model]
     │                          │                               │
  Web Audio API            temp_jobs/                    PyTorch / torchaudio
  Canvas waveform          {job_id}/                    htdemucs model
  React state              ├── original.wav              (로컬 파일 처리)
                           └── stems/
                               ├── vocals.wav
                               ├── drums.wav
                               ├── bass.wav
                               └── other.wav
```

## Component Map

### Backend (`/backend`)
- `main.py` — FastAPI 앱, 라우팅, CORS, 수명주기
- `separator.py` — Demucs 분리 로직, 진행률 추적
- `analyzer.py` — waveform peaks + sound tags 계산
- `cleaner.py` — 오래된 temp_jobs 정리

### Frontend (`/frontend/src`)
- `App.tsx` — 전체 상태 관리, 단계 전환
- `components/Uploader.tsx` — 파일 드래그앤드롭
- `components/ProcessingOverlay.tsx` — 진행률 UI
- `components/StemTrack.tsx` — stem 1개의 파형 + 컨트롤
- `components/PlayerControls.tsx` — 재생/일시정지/seek/loop
- `components/SoundTags.tsx` — 구간별 에너지 태그 표시
- `hooks/useStemPlayer.ts` — Web Audio API 멀티트랙 재생 엔진
- `api/client.ts` — 백엔드 API 호출

## Data Flow

```
1. 사용자 파일 선택
   → POST /api/jobs (multipart)
   → job_id 반환

2. 폴링: GET /api/jobs/{id}/status
   → {status: 'processing', progress: 45, stage: '분리 중...'}

3. 완료 시: GET /api/jobs/{id}/stems
   → [{name, label, color, duration}]

4. 각 stem:
   GET /api/jobs/{id}/stems/{name}/audio  → WAV blob → AudioBuffer
   GET /api/jobs/{id}/stems/{name}/waveform → float[] peaks

5. GET /api/jobs/{id}/analysis → SoundTag[] per-segment

6. Web Audio API로 동기 재생
   → GainNode per stem (volume/mute)
   → requestAnimationFrame으로 재생 위치 추적
   → canvas에 playhead 렌더링
```

## Separation Job Flow

```
upload → save to temp_jobs/{id}/original.ext
       → spawn thread: separator.run(job_id)
           → demucs API: apply_model(htdemucs, audio)
           → save stems to temp_jobs/{id}/stems/
           → analyzer: compute waveforms + tags
           → jobs[id].status = 'done'
```

## Temp File Policy
- 모든 파일은 `backend/temp_jobs/{job_id}/` 에만 저장
- 브라우저 탭 종료 전 DELETE /api/jobs/{id} 호출 (beforeunload)
- 서버 시작 시 24시간 이상 된 temp_jobs 자동 삭제
- 서버는 파일을 영구 저장하지 않음

## Extensibility Points
- `separator.py`: 모델 교체 (mdx_extra, spleeter 등)
- `analyzer.py`: 추가 태그 (pitch, tempo, chord)
- `api/client.ts`: WebSocket으로 polling 대체
- packaging: Electron wrapper (main.js + python embedded)
