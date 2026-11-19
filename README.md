# 목소리 연습실

성우 연기, 성대모사, 여목 연습용 목소리 분석 도구 모음. 빌드 없이 GitHub Pages에 그대로 올리는 정적 사이트입니다.

- `index.html` 홈
- `challenge.html` 이번 주 대사 챌린지 (순위표, 내 기록, 지난 챌린지)
- `mimic.html` 성대모사 싱크로율 (마이크 녹음 + 파일 업로드, `?challenge`로 챌린지 모드)
- `range.html` 음역대 측정 (최저·진성최고·가성최고·말하기 음높이, 지지 음역대, 건반, 튜너, 음 맞추기 게임, 기록)
- `collection.html` 내 모음집 (여러 녹음 한꺼번에 올리기, 파일 이름으로 캐릭터 묶기, mp4/m4a 녹음 날짜 읽기, 성장 그래프, 높낮이×밝기 지도, 녹음 상태 검사, 캐릭터 카드)
- `script.html` 대본 연습 (대본 해석, 프롬프터, 줄별 테이크 녹음·분석·비교, 원본 대사 싱크로율, 상대역 TTS, 장면 연습·듣기, WAV 저장, 감정별 테이크 비교, 유튜브 원본 구간 반복, 자막 → 대본, 연습 대본 모음(`assets/scripts.js`에 대본을 추가하면 모두에게 보임), 같이 읽기 방(Supabase 실시간 채널 + WebRTC 음성, 녹음은 서버에 저장 안 함, 시험용 `?local=1`))
- `yeomok.html` 여목 연습 (실시간 음높이·공명 지도, 진성·가성 미터, 기준 녹음, 사이렌 테스트, 밝기 훈련, 목 사용 기록)
- `assets/core.js` 분석 엔진 (YIN 피치, MFCC + DTW 정렬, 스펙트럼 비교)
- `assets/voicefeat.js` 실시간 프레임 분석 (YIN 피치, LPC 포먼트, H1–H2)
- `assets/store.js` 보관함 (IndexedDB에 폴더·기록·소리 저장, JSON 백업 내보내기/불러오기)
- `assets/ai.js` AI 목소리 닮음 (WavLM 화자 인증 모델, Transformers.js로 브라우저에서 실행)

원본은 유튜브 링크로도 넣을 수 있어요(컴퓨터 크롬·엣지에서 탭 오디오 캡처).
- `assets/style.css` 공통 스타일

녹음과 분석은 모두 브라우저 안에서 이뤄지며 서버로 전송되지 않습니다.

## 챌린지 운영

- 매주 대사: `assets/challenges.js`에 주차(예: `2026-W47`)별로 캐릭터·대사·유튜브 영상 ID·구간을 추가
- 서버: Supabase (`supabase/schema.sql`). 닉네임·점수·제출 시각만 저장, 녹음은 저장하지 않음
- 부적절한 닉네임·기록 삭제: Supabase 대시보드 → Table Editor → `profiles`에서 해당 행 삭제(기록도 함께 지워짐)
