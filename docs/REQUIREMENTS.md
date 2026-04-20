# Music Divider — Requirements

## Product Definition

**이 제품은 무엇인가**
로컬 오디오 파일을 악기/보컬/드럼/베이스로 분리해서, 어떤 소리가 들어있는지 귀로 탐색할 수 있게 해주는 개인용 분석 도구.

**누구를 위한 것인가**
- 음악을 듣다가 "이 파트가 뭔지" 궁금한 일반 청취자
- 악기 파트를 공부하고 싶은 연주자/학생
- 음악 제작자가 레퍼런스 트랙을 분석할 때

**기존 툴과 차별점**
- Spleeter/Moises/LALAL.AI: 클라우드 업로드, 계정 필요, 다운로드 중심
- 이 도구: 로컬 우선, 계정 없음, "듣기/탐색" 중심 UX

**하지 않을 것**
- 스트리밍 URL 입력/추출
- DRM 우회
- 분리 결과 파일 내보내기(MVP 제외)
- 클라우드 저장, 계정, 공유

---

## Supported Formats
- 입력: MP3, WAV, FLAC, M4A, OGG, AIFF
- 최대 파일 크기: 100MB
- 최대 길이: 10분 (600초)

## Stems
- vocals (보컬)
- drums (드럼)
- bass (베이스)
- other (기타 악기 및 배경)

## Quality Presets
- **fast**: 빠른 처리, 약간 낮은 분리 품질 (htdemucs, segment=7)
- **better**: 높은 품질, 더 긴 처리 시간 (htdemucs 기본값)

## Feature Requirements

### 필수 (MVP)
- 로컬 파일 업로드 (drag & drop + 파일 선택)
- 처리 진행률 표시 (progress bar + 단계 텍스트)
- 4개 stem별 파형(waveform) 표시
- 전체 파형에서 재생 위치 표시 및 seek
- 전체 재생/일시정지
- stem별 solo / mute
- stem별 볼륨 슬라이더
- loop in/out 마커 설정 및 반복 재생
- 구간별 에너지/특징 태그 (sound tags)
- 처리 실패 시 에러 메시지 + 재시도
- 임시 파일 자동 정리

### 제외 (MVP 이후)
- 계정/인증
- 클라우드 저장
- 파일 내보내기/다운로드
- 공유 링크
- MIDI 편집
- 플러그인 시스템
