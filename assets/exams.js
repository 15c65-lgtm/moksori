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
    steps: ['1차: 지원서와 음성 파일을 인터넷으로 제출 (공고와 함께 남녀 지정 대본이 나와요)', '2차: 방송사에 직접 가서 실기 시험', '최종 면접'],
    rules: ['남녀를 나눠 뽑아요', '연령·학력·국적 제한 없음, 남자는 군필 또는 면제 (50기 공고 기준)', '성우 공채가 있는 방송사 중 유일하게 자기소개서를 보지 않아요', '전속 기간 2년, 다른 곳과 달리 전속이 1년 남았을 때 미리 뽑아요', '뽑는 인원: 45기부터 남녀 각 8명, 51기부터 각 4명'],
    file: 'one', intro: '', apply: 'https://xapplicant2.kbs.co.kr',
    tip: 'KBS는 라디오 드라마 중심이라 과장된 애니 톤보다 생활 연기, 장면 속 사람의 말처럼 들리는 연기가 중요하다는 이야기가 많아요.',
  },
  mbc: {
    name: 'MBC', full: 'MBC 전속성우',
    steps: ['최근 공채 공고를 찾지 못했어요. 공고가 나오면 「시험 직접 추가」로 넣어 주세요.'],
    rules: [], file: 'one', intro: '',
    tip: '외화 더빙과 다큐 해설 비중이 커서, 해설 톤과 실사 더빙 연기를 같이 준비하는 게 좋아요.',
  },
  ebs: {
    name: 'EBS', full: 'EBS 전속성우',
    steps: ['1차: 음성 파일 제출 (남성용·여성용 지정 대본)', '이후 실기와 면접'],
    rules: ['문항마다 파일을 따로 내요 (27기: 파일 4개)', '파일 형식 mp3 320kbps (27기)', '파일 이름: 수험번호_번호_종류.mp3 (예: 수험번호_1_해설_다큐멘터리.mp3)', '보통 2년마다 뽑아요 (25기 2017 · 26기 2019 · 27기 2021 · 28기 2023 · 29기 2025)'],
    file: 'split', fileName: '{수험번호}_{번호}_{종류}', mp3: 320, intro: '',
    tip: '다큐 해설이 꼭 들어가요. 유아·10대 같은 어린이 연기 비중도 커서, 해설과 아이 연기를 둘 다 준비해야 해요.',
  },
  tooniverse: {
    name: '투니버스', full: '투니버스(CJ ENM) 전속성우',
    steps: ['1차: 음성 파일 제출', '2차: 동영상 심사', '3차: 실기 심화', '4차: 최종 면접'],
    rules: ['괄호 안 지시와 문제 번호는 읽지 않아요', '1번은 가장 자연스러운 내 목소리로, 빈칸에 내 이름을 넣어 읽어요 (10기)', '목소리는 자유, 가장 자신 있는 톤으로 (10기)'],
    file: 'one', intro: '투니버스 {기}기 성우 모집 {성별} 1차 실기시험에 응시하는 {이름}입니다.',
    tip: '문항이 짧은 대신 캐릭터가 확 바뀌어요. 한 파일 안에서 캐릭터 전환이 분명하게 들리는지가 중요해요.',
  },
  daewon: {
    name: '대원방송', full: '대원방송(애니원·애니박스) 전속성우',
    steps: ['1차: 음성 파일과 이력서·자기소개서·사진을 메일로 제출', '2차: 실기', '최종 면접'],
    rules: ['영상 없이 주어진 대사로 자유롭게 연기해요', '맨 처음 내 목소리로 이름을 녹음: "안녕하십니까? 대원방송 ○기 전속성우 공채에 응시하는 ○○○입니다."', '각 문항 전에 캐릭터 타입을 먼저 말해요: "1번, 10대 소년 연기입니다."', '모든 문항을 하나의 파일에 (16기), wav 또는 mp3', '파일 이름: 응시일_이름.wav (예: 20250817_홍길동.wav)', '첨부 파일 20MB 이하', '반드시 모든 문항을 연기해야 해요', '과도한 리터칭·편집은 불이익'],
    file: 'one', fileName: '{응시일}_{이름}', intro: '안녕하십니까? 대원방송 {기}기 전속성우 공채에 응시하는 {이름}입니다.', announce: '{번호}번, {종류} 연기입니다.',
    tip: '거의 해마다 뽑고, 문항이 애니 캐릭터 위주예요. 연령·성격 폭을 넓게 보여 주는 게 핵심이에요.',
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
  { id: 'ebs-29-m', station: 'ebs', gen: 29, year: 2025, gender: 'm', partial: true, items: [],
    link: 'https://gall.dcinside.com/mgallery/board/view/?id=voiceactor&no=30581', linkName: '성우 지망생 갤러리 (그림 파일, 제출 매뉴얼 포함)' },
  { id: 'ebs-29-f', station: 'ebs', gen: 29, year: 2025, gender: 'f', partial: true, items: [],
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
