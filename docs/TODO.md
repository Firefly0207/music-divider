# TODO — Implementation Phases

## Phase 1: 동작하는 최소 버전
완료 기준: 파일을 올리면 분리되고, 각 stem을 재생할 수 있다.

- [x] docs 작성
- [ ] backend: FastAPI + 파일 업로드 + 상태 API
- [ ] backend: Demucs 분리 (htdemucs)
- [ ] backend: stem 오디오 서빙
- [ ] frontend: 프로젝트 초기화 (Vite + React + TS)
- [ ] frontend: 파일 업로드 UI
- [ ] frontend: 진행률 폴링 + 표시
- [ ] frontend: stem 오디오 로드 + 재생/일시정지
- [ ] frontend: stem mute/solo/volume
- [ ] 실행 스크립트 (start.bat / start.sh)

## Phase 2: 청취 경험 개선
완료 기준: 파형이 보이고, 원하는 구간을 반복할 수 있다.

- [ ] backend: waveform peaks 계산 API
- [ ] frontend: 파형 canvas 렌더링
- [ ] frontend: 파형 클릭으로 seek
- [ ] frontend: loop in/out 마커 (우클릭 또는 드래그)
- [ ] frontend: 현재 재생 구간 시각적 강조
- [ ] frontend: 키보드 단축키 (space=재생, ←→=seek)

## Phase 3: 사운드 탐색 기능 강화
완료 기준: 어느 구간에 무슨 소리가 있는지 한눈에 파악된다.

- [ ] backend: 구간별 에너지/특성 분석 (analyzer.py)
- [ ] frontend: sound tags 타임라인 표시
- [ ] frontend: 에너지가 높은 구간 하이라이트
- [ ] frontend: "보컬 강한 구간", "드럼 강한 구간" 레이블
- [ ] 품질 preset 선택 (fast / better)
- [ ] 임시 파일 정리 UI (현재 세션 초기화)
- [ ] 저작권 안내 모달 (최초 실행 시)
