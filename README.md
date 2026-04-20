# Music Divider — 사운드 탐색기

음악을 보컬/드럼/베이스/기타 악기로 분리해서 어떤 소리가 들어있는지 귀로 탐색하는 **개인용 분석 도구**.

> 개인 청취 분석 전용. 분리 결과 파일 내보내기 없음. 서버 영구 저장 없음.

---

## 실행 방법 (Windows)

### 사전 준비
- Python 3.10+ 설치 (python.org)
- Node.js 18+ 설치 (nodejs.org)
- GPU가 있으면 PyTorch CUDA 버전 권장 (없어도 동작, 단 느림)

### 첫 실행
```bat
start.bat
```
- 최초 실행 시 Python 가상환경 생성 + 패키지 설치 (5~10분)
- Demucs 모델 자동 다운로드 (~300MB, 최초 1회)
- 브라우저가 자동으로 열립니다

### 이후 실행
```bat
start.bat
```

---

## 수동 실행

### 백엔드
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

### 프론트엔드 (별도 터미널)
```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

---

## 사용법

1. 음원 파일을 드래그앤드롭 또는 클릭해서 선택
2. 처리 속도 선택: **빠르게** (빠름) / **고품질** (더 정확)
3. 분리 완료 후 파형 화면으로 전환
4. 각 stem(보컬/드럼/베이스/기타) 개별 재생/뮤트/솔로/볼륨 조절
5. 파형 클릭으로 위치 이동
6. [IN] / [OUT] 버튼으로 반복 구간 설정

### 키보드 단축키
| 키 | 기능 |
|---|---|
| Space | 재생 / 일시정지 |
| ← | 5초 뒤로 |
| → | 5초 앞으로 |

---

## 지원 포맷
MP3, WAV, FLAC, M4A, OGG, AIFF · 최대 100MB · 최대 10분

## 성능
- CPU 전용: 3~5분짜리 곡 기준 약 5~15분
- GPU(CUDA) 있는 경우: 1~3분

---

## 법적 안내
이 프로그램은 개인 청취 분석 보조 도구입니다.
- 저작권이 있는 음원의 분리 결과를 재배포하거나 상업적으로 이용하지 마십시오.
- 스트리밍 서비스 URL 입력 기능은 제공하지 않습니다.
- 분리된 파일은 세션 종료 시 자동으로 삭제됩니다.

---

## 폴더 구조
```
Music Divider/
├── backend/
│   ├── main.py         # FastAPI 서버
│   ├── separator.py    # Demucs 분리
│   ├── analyzer.py     # 파형/태그 분석
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── api/
├── docs/
├── start.bat
└── start.sh
```
