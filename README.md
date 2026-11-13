# 목소리 연습실

성우 연기, 성대모사, 여목 연습용 목소리 분석 도구 모음. 빌드 없이 GitHub Pages에 그대로 올리는 정적 사이트입니다.

- `index.html` 홈
- `mimic.html` 성대모사 싱크로율 (마이크 녹음 + 파일 업로드)
- `assets/core.js` 분석 엔진 (YIN 피치, MFCC + DTW 정렬, 스펙트럼 비교)
- `assets/store.js` 보관함 (IndexedDB에 폴더·기록·소리 저장, JSON 백업 내보내기/불러오기)
- `assets/ai.js` AI 목소리 닮음 (WavLM 화자 인증 모델, Transformers.js로 브라우저에서 실행)

원본은 유튜브 링크로도 넣을 수 있어요(컴퓨터 크롬·엣지에서 탭 오디오 캡처).
- `assets/style.css` 공통 스타일

녹음과 분석은 모두 브라우저 안에서 이뤄지며 서버로 전송되지 않습니다.
