// 방송국 성우 공채 시험 정보와 지난 1차 시험 목록 (공채 대비 페이지에서 씀)
// 대본 글은 넣지 않았어요: 지난 시험 대본은 대부분 실제 애니·드라마·다큐 대사라서, 공개 저장소에 통째로 옮기지 않고
// 원문이 올라와 있는 곳 링크(link)만 적었어요. 페이지에서 문항마다 대본을 붙여 넣으면 내 기기에만 저장돼요.
//
// 새 시험 넣는 법: 아래 EXAMS 목록 끝에 한 덩어리를 붙여요. 공채 대비 페이지의 「시험 직접 추가」 → 「사이트용 코드 복사」로 만들 수도 있어요.
//   station: 'kbs' | 'mbc' | 'ebs' | 'tooniverse' | 'daewon'
//   gen: 기수(숫자), year: 연도, gender: 'm' | 'f'
//   items: [{ type: '캐릭터 나이·종류', dir: '괄호 안 지시(성격·상황)', file: '따로 내는 파일 이름에 들어갈 말(EBS처럼 파일을 나눌 때만)' }]
//   partial: true → 문항 일부만 알아낸 시험 (나머지는 원문을 보고 「문항 추가」로 채워요)
//   link / linkName: 원문 대본이 올라와 있는 곳

window.STATIONS = {
  kbs: {
    name: 'KBS', full: 'KBS 전속성우',
    steps: ['1차: 지원서와 음성 파일(mp3)을 인터넷으로 제출 (공고와 함께 남녀 지정 대본이 나와요)', '2차: 실기 시험 (현장에서 라디오 드라마·내레이션 등 대본을 받아 연기)', '3차: 실기 시험과 면접'],
    rules: ['녹음에는 대본 문안을 읽은 내 목소리만 담아요. 배경음악·자기소개를 넣거나 기계로 소리를 바꾸면 안 돼요 (50기 안내)', '남녀를 나눠 뽑아요', '연령·학력·국적 제한 없음, 남자는 군필 또는 면제 (50기 공고 기준)', '성우 공채가 있는 방송사 중 유일하게 자기소개서를 보지 않아요', '전속 기간 2년, 다른 곳과 달리 전속이 1년 남았을 때 미리 뽑아요', '뽑는 인원: 45기부터 남녀 각 8명, 51기부터 각 4명'],
    file: 'one', intro: '', apply: 'https://xapplicant2.kbs.co.kr',
    tip: 'KBS는 라디오 드라마 중심이라 과장된 애니 톤보다 생활 연기, 장면 속 사람의 말처럼 들리는 연기가 중요하다는 이야기가 많아요.',
  },
  mbc: {
    name: 'MBC', full: 'MBC 전속성우',
    steps: ['2004년 이후 성우 공채를 하지 않고 있다는 보도가 있어요. 공고가 다시 나오면 「시험 직접 추가」로 넣어 주세요.'],
    rules: [], file: 'one', intro: '',
    tip: '외화 더빙과 다큐 해설 비중이 커서, 해설 톤과 실사 더빙 연기를 같이 준비하는 게 좋아요.',
  },
  ebs: {
    name: 'EBS', full: 'EBS 전속성우',
    steps: ['1차: 음성 파일 제출 (남성용·여성용 지정 대본)', '이후 실기와 면접'],
    rules: ['다른 방송사와 달리 파일을 나눠 내요. 2025년(29기): 해설 A형·B형을 한 파일에, 연기 문항은 한 문항씩 따로, 모두 4개', '녹음 처음에 "안녕하세요. EBS 전속성우 공채 지원자입니다."라고 말해요 (2025년 안내)', '해설 A형과 B형은 둘 다 다큐 해설이지만, 다른 내용이라는 게 들리게 느낌을 달리해요', '27기: 파일 4개', '파일 형식 mp3 320kbps (27기)', '파일 이름: 수험번호_번호_종류.mp3 (예: 수험번호_1_해설_다큐멘터리.mp3)', '보통 2년마다 뽑아요 (25기 2017 · 26기 2019 · 27기 2021 · 28기 2023 · 29기 2025)'],
    file: 'split', fileName: '{수험번호}_{번호}_{종류}', mp3: 320, intro: '안녕하세요. EBS 전속성우 공채 지원자입니다.', introInFirst: true,
    tip: '다큐 해설이 꼭 들어가요. 유아·10대 같은 어린이 연기 비중도 커서, 해설과 아이 연기를 둘 다 준비해야 해요.',
  },
  tooniverse: {
    name: '투니버스', full: '투니버스(CJ ENM) 전속성우',
    steps: ['1차: 음성 파일 제출', '2차: 동영상 심사 (카메라 테스트)', '3차: 실기 심화', '4차: 최종 면접'],
    rules: ['보통 3년마다 뽑아요. 2024년에 예정됐던 공채는 열리지 않았어요', '괄호 안 지시와 문제 번호는 읽지 않아요', '1번은 가장 자연스러운 내 목소리로, 빈칸에 내 이름을 넣어 읽어요 (10기)', '목소리는 자유, 가장 자신 있는 톤으로 (10기)'],
    file: 'one', intro: '투니버스 {기}기 성우 모집 {성별} 1차 실기시험에 응시하는 {이름}입니다.',
    tip: '문항이 짧은 대신 캐릭터가 확 바뀌어요. 한 파일 안에서 캐릭터 전환이 분명하게 들리는지가 중요해요.',
  },
  daewon: {
    name: '대원방송', full: '대원방송(애니원·애니박스) 전속성우',
    steps: ['1차: 음성 파일과 이력서·자기소개서·사진을 메일로 제출', '2차: 실기', '최종 면접'],
    rules: ['경쟁률은 기수마다 대략 120~350 대 1 (1~6기)', '영상 없이 주어진 대사로 자유롭게 연기해요', '맨 처음 내 목소리로 이름을 녹음: "안녕하십니까? 대원방송 ○기 전속성우 공채에 응시하는 ○○○입니다."', '각 문항 전에 캐릭터 타입을 먼저 말해요: "1번, 10대 소년 연기입니다."', '모든 문항을 하나의 파일에 (16기), wav 또는 mp3', '파일 이름: 응시일_이름.wav (예: 20250817_홍길동.wav)', '첨부 파일 20MB 이하', '반드시 모든 문항을 연기해야 해요', '과도한 리터칭·편집은 불이익'],
    file: 'one', fileName: '{응시일}_{이름}', intro: '안녕하십니까? 대원방송 {기}기 전속성우 공채에 응시하는 {이름}입니다.', announce: '{번호}번, {종류} 연기입니다.',
    tip: '거의 해마다 뽑고, 문항이 애니 캐릭터 위주예요. 연령·성격 폭을 넓게 보여 주는 게 핵심이에요. 학원가에서는 맨 처음 인사만 듣고도 실력이 갈린다고 할 만큼 첫 인사를 중요하게 봐요.',
  },
};

window.EXAMS = [
  // ---- 대원방송 ----
  { id: 'daewon-16-m', station: 'daewon', gen: 16, year: 2025, gender: 'm', partial: true,
    items: [{ type: '로봇' }, { type: '(원문 확인)' }, { type: '10대 소년' }],
    link: 'http://m.voicementor.co.kr/bbs_shop/file_download.php?board_code=rwdboard&board_idx=9526&sel_no=', linkName: '보이스멘토 (PDF)' },
  { id: 'daewon-15-m', station: 'daewon', gen: 15, year: 2024, gender: 'm', partial: true,
    items: [{ type: '히어로', dir: '진지하고 정의로운, 힘을 모으며 신중하게 싸우는 상황' }, { type: '고릴라' }, { type: '악마', dir: '상대를 살살 꾀지만 안 넘어오는 상황' }, { type: '(원문 확인)' }, { type: '60대 캐릭터', dir: '능력에 당해 점점 어려지는 상황' }],
    link: 'https://m.voicementor.co.kr/bbs/rwdboard/7271', linkName: '보이스멘토 풀이' },
  { id: 'daewon-14-m', station: 'daewon', gen: 14, year: 2023, gender: 'm', partial: true,
    items: [{ type: '20대 남자', dir: '주인공, 하이텐션' }, { type: '20대 남자' }, { type: '20대 남자', dir: '까칠하면서 정이 깊은' }],
    link: 'https://script.happyhobby.kr/2023%EB%85%84-%EB%8C%80%EC%9B%90%EB%B0%A9%EC%86%A1-14%EA%B8%B0-%EC%A0%84%EC%86%8D%EC%84%B1%EC%9A%B0-%EA%B3%B5%EC%B1%84-1%EC%B0%A8-%EC%8B%9C%ED%97%98-%EB%82%A8%EC%9E%90-%EB%8C%80%EB%B3%B8/', linkName: '대본 모음 사이트' },
  { id: 'daewon-12-m', station: 'daewon', gen: 12, year: 2021, gender: 'm',
    items: [{ type: '10대 남성', dir: '명랑 쾌활하게' }, { type: '10대 중반 남성', dir: '진지한, 다혈질의, 자존심이 강한' }, { type: '30대 초중반 남성', dir: '중성적, 비열하고 야비한, 깐족대듯이' }, { type: '연령 불명 남성', dir: '괴물, 저음, 화내듯이, 악마' }, { type: '40대 남자', dir: '진지한, 근엄한' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=17104', linkName: '성우 지망생 갤러리' },
  { id: 'daewon-12-f', station: 'daewon', gen: 12, year: 2021, gender: 'f',
    items: [{ type: '10대 소녀', dir: '당차고 밝은 성격' }, { type: '30대 여자', dir: '신경질적인 성격' }, { type: '10대 미만 남아', dir: '순수, 명랑, 쾌활' }, { type: '연령 불명 여자', dir: '사악한, 마녀, 악당' }, { type: '40대 중후반 여자', dir: '밝고 유쾌한' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=17104', linkName: '성우 지망생 갤러리' },
  { id: 'daewon-11-m', station: 'daewon', gen: 11, year: 2020, gender: 'm', partial: true,
    items: [{ type: '(원문 확인)' }, { type: '20대 중반 남성' }, { type: '20대 중반 남성' }, { type: '(원문 확인)' }, { type: '20대 인간', dir: '명랑, 쾌활, 주인공, 힘있는' }],
    link: 'https://script.happyhobby.kr/2020%EB%85%84-%EB%8C%80%EC%9B%90%EB%B0%A9%EC%86%A1-11%EA%B8%B0-%EC%A0%84%EC%86%8D%EC%84%B1%EC%9A%B0-%EA%B3%B5%EC%B1%84-1%EC%B0%A8-%EC%8B%9C%ED%97%98-%EB%82%A8%EC%9E%90-%EB%8C%80%EB%B3%B8/', linkName: '대본 모음 사이트' },
  { id: 'daewon-10-m', station: 'daewon', gen: 10, year: 2019, gender: 'm', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=7207', linkName: '성우 지망생 갤러리 (그림 파일, 남녀)' },
  { id: 'daewon-10-f', station: 'daewon', gen: 10, year: 2019, gender: 'f', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=7207', linkName: '성우 지망생 갤러리 (그림 파일, 남녀)' },
  { id: 'daewon-9-m', station: 'daewon', gen: 9, year: 2018, gender: 'm',
    items: [{ type: '10대 소년', dir: '아이들을 사랑하는 다정한 성격' }, { type: '연령 불명', dir: '분노를 터트리는 비뚤어진 성격의 빌런' }, { type: '20대 남성', dir: '열혈 바보' }, { type: '30대 남성', dir: '대형 무대 사회자' }, { type: '70대 남자', dir: '중저음, 까칠, 화가 많이 나 있음, 음침하고 욱하는 성격' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=quote&no=84', linkName: '명대사 갤러리' },
  { id: 'daewon-9-f', station: 'daewon', gen: 9, year: 2018, gender: 'f',
    items: [{ type: '7세 아이', dir: '순수함, 때가 묻지 않은 어린아이' }, { type: '10대 초반 남아', dir: '건방짐, 거칠다, 짜증내다가 걱정해 주는 톤' }, { type: '10대 후반 여학생', dir: '원칙주의자 모범생이지만 사회성이 없는 성격' }, { type: '30대 여성', dir: '인간의 아이를 임신하고 정체성의 고민에 빠진 외계인' }, { type: '60대 노인', dir: '깐깐하고 고지식하지만 손자를 사랑하는 할머니' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=quote&no=84', linkName: '명대사 갤러리' },
  { id: 'daewon-8-m', station: 'daewon', gen: 8, year: 2017, gender: 'm', partial: true,
    items: [{ type: '10대 소년', dir: '생명의 위협을 느끼며 쫓기는 상황' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=quote&no=57', linkName: '명대사 갤러리' },
  { id: 'daewon-5-m', station: 'daewon', gen: 5, year: 2014, gender: 'm',
    items: [{ type: '10대 남성', dir: '패기 넘치는 꽃미남' }, { type: '동물 캐릭터', dir: '모사꾼이지만 겁도 많고 어설픈, 정감 있는' }, { type: '40~50대 중년 남성', dir: '따뜻하면서도 강한 리더십' }, { type: '20대 남성', dir: '겉으론 날카롭고 이지적이지만 속은 냉소적인 소시오패스' }],
    link: 'https://gall.dcinside.com/board/view/?id=radio_actor&no=192221', linkName: '성우 갤러리' },
  { id: 'daewon-5-f', station: 'daewon', gen: 5, year: 2014, gender: 'f',
    items: [{ type: '10대 여전사', dir: '언제나 밝고 긍정적' }, { type: '7세 남아 형사', dir: '씩씩하고 정의감에 불타지만 쉽게 당황함' }, { type: '20~30대 전문직 여성', dir: '상대의 약점을 노리고 출연을 설득하는 PD' }, { type: '10대 소녀', dir: '가족을 지키기 위해 분노를 표출' }],
    link: 'https://gall.dcinside.com/board/view/?id=radio_actor&no=192221', linkName: '성우 갤러리' },

  // ---- 투니버스 ----
  { id: 'tooniverse-11-m', station: 'tooniverse', gen: 11, year: 2020, gender: 'm', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=12766', linkName: '성우 지망생 갤러리 (그림 파일)' },
  { id: 'tooniverse-11-f', station: 'tooniverse', gen: 11, year: 2020, gender: 'f', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=12766', linkName: '성우 지망생 갤러리 (그림 파일)' },
  { id: 'tooniverse-10-m', station: 'tooniverse', gen: 10, year: 2018, gender: 'm',
    items: [{ type: '자기소개', dir: '가장 자연스러운 내 목소리로, 빈칸에 내 이름', intro: true }, { type: '미소년', dir: '호감 있는 여자친구에게' }, { type: '열혈 청년', dir: '친구의 죽음을 전하며' }, { type: '중년 남자', dir: '오랫동안 품고 있던 속내를 보이며' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=quote&no=56', linkName: '명대사 갤러리' },
  { id: 'tooniverse-10-f', station: 'tooniverse', gen: 10, year: 2018, gender: 'f',
    items: [{ type: '자기소개', dir: '가장 자연스러운 내 목소리로, 빈칸에 내 이름', intro: true }, { type: '10대 여자', dir: '자신의 꿈 이야기를 대중에게' }, { type: '20대 여자', dir: '이별 후' }, { type: '40대', dir: '카리스마 있는 악녀' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=quote&no=56', linkName: '명대사 갤러리' },
  { id: 'tooniverse-8-f', station: 'tooniverse', gen: 8, year: 2012, gender: 'f', partial: true,
    items: [{ type: '자기소개', dir: '빈칸에 내 이름', intro: true }, { type: '(원문 확인)', dir: '고민하는 친구에게' }, { type: '(원문 확인)', dir: '열 받아 소리 지르는 미팅 주선자' }, { type: '(원문 확인)' }, { type: '여자아이', dir: '남자한테 오버하며 들이대는 부잣집 여자아이' }],
    link: 'https://m.cafe.daum.net/sbsvoice/KrfE/16', linkName: '다음 카페' },

  // ---- EBS ----
  { id: 'ebs-29-m', station: 'ebs', gen: 29, year: 2025, gender: 'm', partial: true,
    items: [{ type: '해설 A형', dir: '다큐멘터리', file: '해설', group: 'h' }, { type: '해설 B형', dir: '다큐멘터리 (A형과 다른 느낌)', file: '해설', group: 'h' }, { type: '(원문 확인)', file: '연기1' }, { type: '(원문 확인)', file: '연기2' }, { type: '(원문 확인)', file: '연기3' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=30581', linkName: '성우 지망생 갤러리 (그림 파일, 제출 매뉴얼 포함)' },
  { id: 'ebs-29-f', station: 'ebs', gen: 29, year: 2025, gender: 'f', partial: true,
    items: [{ type: '해설 A형', dir: '다큐멘터리', file: '해설', group: 'h' }, { type: '해설 B형', dir: '다큐멘터리 (A형과 다른 느낌)', file: '해설', group: 'h' }, { type: '아이', dir: '생글생글하고 귀여운', file: '연기1' }, { type: '(원문 확인)', dir: '로봇 또는 공주 캐릭터, 과감하고 역동적으로', file: '연기2' }, { type: '(원문 확인)', file: '연기3' }],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=30581', linkName: '성우 지망생 갤러리 (그림 파일, 제출 매뉴얼 포함)' },
  { id: 'ebs-27-m', station: 'ebs', gen: 27, year: 2021, gender: 'm', partial: true,
    items: [{ type: '해설', dir: '다큐멘터리', file: '해설_다큐멘터리' }, { type: '연기', dir: '유아', file: '연기_유아' }, { type: '연기', dir: '10대', file: '연기_10대' }, { type: '(원문 확인)' }],
    link: 'https://www.youtube.com/watch?v=LI5q6NCfQ6Y', linkName: '유튜브 (설명란)' },

  // ---- KBS ----
  { id: 'kbs-50-m', station: 'kbs', gen: 50, year: 2025, gender: 'm', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=30854', linkName: '성우 지망생 갤러리 (공고와 남녀 대본)' },
  { id: 'kbs-50-f', station: 'kbs', gen: 50, year: 2025, gender: 'f', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=30854', linkName: '성우 지망생 갤러리 (공고와 남녀 대본)' },
  { id: 'kbs-48-m', station: 'kbs', gen: 48, year: 2023, gender: 'm', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=23997', linkName: '성우 지망생 갤러리 (공고와 남녀 대본)' },
  { id: 'kbs-48-f', station: 'kbs', gen: 48, year: 2023, gender: 'f', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=23997', linkName: '성우 지망생 갤러리 (공고와 남녀 대본)' },
];

// ---- 2차 즉석 대본 연습용 (이 사이트에서 새로 쓴 짧은 대본) ----
// kind: 라디오 드라마 | 내레이션 | 해설 | 애니 | 광고, who: 'm' | 'f' | '' (누구나)
window.COLD_READS = [
  { kind: '라디오 드라마', who: '', dir: '40대, 오래된 가게를 정리하는 날 손님에게', text: '오늘이 마지막 날이에요. / 삼십 년 동안 이 자리에서 문을 열었는데, // 막상 닫으려니까 손이 잘 안 가네요. / 그래도 마지막 손님이 단골이라 다행이에요. / 늘 드시던 걸로 드릴게요. / 오늘은… 제가 살게요.' },
  { kind: '라디오 드라마', who: 'm', dir: '20대 남자, 면접에서 떨어진 걸 숨기고 아버지와 통화', text: '어, 아빠. 응, 잘 봤어. / 아니 뭐, 결과는 다음 주에 나온대. // 밥? 먹었지. 먹었어. / 걱정 마시라니까. / …아빠. 그냥, 고마워서요. 끊을게요.' },
  { kind: '라디오 드라마', who: 'f', dir: '30대 여자, 십 년 만에 만난 동창에게 반가움과 서운함이 섞여', text: '정말 너야? / 세상에, 하나도 안 변했다. // 근데 너, 그때 왜 아무 말도 없이 이사 갔어? / 나 한 달 동안 너희 집 앞에서 기다렸던 거 알아? / …됐어, 다 지난 얘기지. 커피 한잔 할래?' },
  { kind: '라디오 드라마', who: '', dir: '70대, 손주에게 옛날이야기를 들려주며', text: '할머니 어릴 적에는 말이다, / 이 동네가 전부 논이었어. / 여름이면 개구리가 어찌나 울던지 잠을 못 잘 정도였지. // 그때는 그게 그렇게 시끄러웠는데, / 요즘은 가끔 그 소리가 그리워.' },
  { kind: '라디오 드라마', who: 'm', dir: '30대 형사, 범인을 조용히 몰아붙이며', text: '앉으세요. 서두를 것 없습니다. / 어젯밤 열한 시에 어디 계셨는지만 말씀해 주시면 돼요. // 집에 계셨다고요? / 이상하네. 그 시간에 댁 앞 편의점 카메라에 선생님 차가 찍혀 있던데. / 다시 한번 생각해 보시죠.' },
  { kind: '라디오 드라마', who: 'f', dir: '20대 여자, 처음 혼자 사는 집에서 무서운 소리를 듣고', text: '누, 누구세요? // …아무도 없나? / 바람 소리겠지. 그래, 바람이야. / (작게) 괜찮아, 괜찮아… / 아니 근데 바람이 노크를 해?' },
  { kind: '내레이션', who: '', dir: '잔잔한 에세이 낭독', text: '퇴근길 버스 창가에 앉으면 / 하루가 천천히 뒤로 밀려난다. / 잘한 일과 못한 일이 가로등처럼 하나씩 지나가고, // 집 앞 정류장에 닿을 즈음이면 / 그래도 오늘을 버텨 낸 내가, 조금은 대견해진다.' },
  { kind: '내레이션', who: '', dir: '따뜻한 동화 낭독, 아이에게 들려주듯', text: '옛날 어느 숲속에 / 겁이 아주 많은 아기 다람쥐가 살았어요. / 바람에 나뭇잎이 바스락거리기만 해도 / 꼬리를 꼭 끌어안고 숨었지요. // 그런데 어느 날, / 다람쥐의 도토리 창고 앞에 낯선 발자국이 찍혀 있었어요.' },
  { kind: '해설', who: '', dir: '자연 다큐멘터리, 차분하고 정확하게', text: '해가 지면 사막의 기온은 빠르게 떨어진다. / 낮 동안 모래 속에 몸을 숨겼던 작은 생명들이 / 이 시간을 기다려 하나둘 밖으로 나온다. // 사막여우의 커다란 귀는 / 모래 아래 움직이는 먹잇감의 소리까지 잡아낸다.' },
  { kind: '해설', who: '', dir: '과학 교양, 호기심을 끌며', text: '우리 몸에서 가장 큰 장기는 무엇일까. / 심장도, 간도 아닌 바로 피부다. / 성인의 피부를 펼치면 넓이가 약 2제곱미터에 이른다. // 피부는 몸을 지키는 벽이면서, / 동시에 세상과 닿는 가장 넓은 창이다.' },
  { kind: '해설', who: '', dir: '역사 다큐멘터리, 무게 있게', text: '1443년 겨울, / 궁궐 깊은 곳에서 스물여덟 개의 글자가 만들어졌다. / 누구나 쉽게 익혀 날마다 쓰기를 바란다는 뜻이었다. // 그러나 이 글자가 백성의 손에 닿기까지는 / 그 뒤로도 오랜 시간이 필요했다.' },
  { kind: '애니', who: '', dir: '6~7세 아이, 신나서 자랑하며', text: '엄마! 엄마! 이거 봐요! / 내가 혼자 신발 끈 묶었어요! / 토끼 귀 만들고, 한 바퀴 돌리고, 쏙! // 히히, 나 이제 다 컸죠? / 내일은 자전거도 혼자 탈 거예요!' },
  { kind: '애니', who: '', dir: '10대 주인공, 쓰러진 친구 앞에서 다시 일어서며', text: '아직… 안 끝났어. / 너 혼자 다 짊어지게 두진 않을 거야. // 넘어지면 일어나면 되잖아! / 몇 번이든! / 이번엔 내가 지킬 차례야!' },
  { kind: '애니', who: '', dir: '연령 불명 악당, 느긋하게 비웃으며', text: '후후… 여기까지 오다니, 칭찬해 주지. / 하지만 문을 열었다고 해서 / 나갈 수 있는 건 아니야. // 네가 믿는 그 정의라는 거, / 오늘 얼마나 가벼운지 보여 주마.' },
  { kind: '애니', who: '', dir: '80대 마법사 노인, 제자를 타이르며', text: '허허, 서두르지 말거라. / 마법은 손끝이 아니라 마음에서 나오는 법이다. // 네가 화가 나 있으면 불꽃도 화를 내고, / 네가 겁을 먹으면 바람도 숨는단다. / 자, 숨을 한번 크게 쉬어 보거라.' },
  { kind: '애니', who: '', dir: '말하는 고양이, 귀찮지만 은근히 다정하게', text: '또 왔냐, 인간. / 참치캔은? 없어? 그럼 왜 왔는데. // …흥, 울긴 왜 울어. / 저기, 무릎 좀 빌려줘 봐. / 딱히 너 위로하려는 거 아니고, 거기가 따뜻해서 그래.' },
  { kind: '광고', who: '', dir: '밝고 경쾌하게, 15초', text: '아침이 바쁜 당신을 위해! / 데우지 않아도 바로 먹는 든든한 한 끼. / 오늘도 시간은 아끼고, 맛은 챙기세요. // 지금 가까운 편의점에서 만나요!' },
  { kind: '광고', who: '', dir: '차분하고 신뢰감 있게, 공익 광고', text: '잠깐 멈추는 3초가 / 누군가의 하루를 지킵니다. / 횡단보도 앞에서는 꼭, 한 번 더 살펴 주세요. // 우리의 작은 습관이 / 모두의 안전이 됩니다.' },
];

// ---- 면접 예상 질문 (흔히 나오는 주제를 이 사이트에서 정리) ----
window.INTERVIEW = [
  { q: '30초 동안 자기소개를 해 보세요.', sec: 30, tip: '이름, 성우를 꿈꾸게 된 한 장면, 내 목소리의 강점 하나. 숫자나 구체적 경험이 들어가면 기억에 남아요.' },
  { q: '1분 동안 자기소개를 해 보세요.', sec: 60, tip: '30초 버전에 "그래서 이 방송국에서 하고 싶은 일"을 붙여요.' },
  { q: '성우를 꿈꾸게 된 계기는 무엇인가요?', sec: 45, tip: '"어릴 때부터 좋아해서"보다 구체적인 순간(작품, 장면, 사람)을 말해요.' },
  { q: '성우는 어떤 직업이라고 생각하나요?', sec: 45, tip: '내 생각 한 문장 → 이유 → 내가 그 일을 하고 싶은 까닭 순서로.' },
  { q: '본인의 장점과 단점을 말해 보세요.', sec: 45, tip: '단점은 인정하고, 지금 어떻게 고치고 있는지까지 말해요.' },
  { q: '왜 우리 방송국에 지원했나요?', sec: 45, tip: '그 방송국 대표 프로그램(라디오 드라마, 애니, 다큐 등)과 내 강점을 이어요.' },
  { q: '좋아하는 성우와 그 이유를 말해 보세요.', sec: 45, tip: '"목소리가 좋아서"보다 그 성우의 어떤 연기 방식을 배우고 싶은지.' },
  { q: '최근 인상 깊게 들은 작품은 무엇인가요?', sec: 45, tip: '작품 이름 + 어떤 장면의 어떤 연기가 왜 좋았는지 하나만 깊게.' },
  { q: '대본을 처음 받으면 어떤 순서로 분석하나요?', sec: 60, tip: '상황 → 상대 → 인물의 성격과 상태 → 목표 → 감정이 바뀌는 지점 → 강조와 쉼.' },
  { q: '고치고 있는 말 습관이 있나요?', sec: 45, tip: '실제 습관 하나와 녹음으로 확인하며 고치는 방법을 말해요.' },
  { q: '목 관리는 어떻게 하나요?', sec: 45, tip: '물, 휴식, 워밍업, 연습 시간 조절처럼 실제로 하는 것만.' },
  { q: '함께하는 성우와 연기 의견이 다르면 어떻게 하겠어요?', sec: 45, tip: '연출의 방향을 먼저 듣고, 여러 버전을 해 보는 협업 태도를 보여요.' },
  { q: '실력이 부족해 보이는데 왜 당신을 뽑아야 하죠?', sec: 45, tip: '흔들리지 말고 나만의 매력 하나를 자신 있게. 압박 질문은 태도를 보는 질문이에요.' },
  { q: '떨어져 본 경험이 있다면, 그 뒤에 무엇을 바꿨나요?', sec: 45, tip: '결과보다 바꾼 행동을 구체적으로.' },
  { q: '전속 2년 동안 이루고 싶은 목표는 무엇인가요?', sec: 45, tip: '현실적인 목표 두 가지(맡고 싶은 분야, 성장하고 싶은 기술).' },
  { q: '지금 자기소개를 전혀 다른 캐릭터 톤으로 해 보세요.', sec: 30, tip: '즉석 연기도 나와요. 나이·성격 하나를 정하고 바로 들어가요.' },
  { q: '가장 자신 있는 캐릭터 목소리로 짧게 한마디 해 보세요.', sec: 20, tip: '짧고 분명하게. 설명보다 연기로 보여 줘요.' },
  { q: '마지막으로 하고 싶은 말이 있나요?', sec: 30, tip: '감사 인사 + 한 문장 포부. 길게 하지 않아요.' },
];

