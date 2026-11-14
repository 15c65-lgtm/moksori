// 이번 주 대사 챌린지 목록
// 주차 ID는 한국 시간 기준 ISO 주차예요 (월요일 시작 ~ 일요일 끝). 예: 2026-W47 = 11월 16일(월) ~ 11월 22일(일)
// 새 주 추가: 아래 목록에 한 덩어리를 복사해서 주차·대사·영상만 바꾸면 돼요.
// 새 대사를 안 넣으면 가장 최근 대사가 다음 주에도 그대로 이어져요(순위표는 매주 월요일 새로 시작).
//   youtube: 유튜브 영상 ID (주소 youtu.be/여기부분 또는 watch?v=여기부분), start/end: 초 단위 구간(20초 이내)
window.CHALLENGES = {
  '2026-W46': {
    character: '고죠 사토루',
    work: '주술회전',
    line: '다이죠부, 보쿠 사이쿄다카라',
    original: '大丈夫、僕最強だから',
    meaning: '괜찮아, 나 최강이니까',
    youtube: '4yng_hMdJDs',   // https://www.youtube.com/shorts/4yng_hMdJDs
    start: 0, end: 3,
    tip: '여유 있게 웃는 듯한 말투, "사이쿄"에서 살짝 힘을 주는 게 포인트예요.',
  },
};

window.Week = (() => {
  // 한국 시간 기준 ISO 주차
  function id(d = new Date()) {
    const k = new Date(d.getTime() + 9 * 3600e3);
    const dow = (k.getUTCDay() + 6) % 7; // 월=0
    const thu = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow + 3));
    const y = thu.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4));
    const w = 1 + Math.round(((thu - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
    return `${y}-W${String(w).padStart(2, '0')}`;
  }
  // 주차의 시작(월 00:00 KST)과 끝(다음 월 00:00 KST) 시각
  function range(wid) {
    const [y, w] = wid.split('-W').map(Number), jan4 = new Date(Date.UTC(y, 0, 4));
    const mon = new Date(Date.UTC(y, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + (w - 1) * 7));
    const start = new Date(mon.getTime() - 9 * 3600e3), end = new Date(start.getTime() + 7 * 864e5);
    return { start, end };
  }
  const label = wid => { const { start, end } = range(wid), f = d => { const k = new Date(d.getTime() + 9 * 3600e3); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; }; return `${f(start)} ~ ${f(new Date(end.getTime() - 1))}`; };
  // 그 주에 정한 대사가 없으면 가장 최근 대사를 이어서 사용
  const resolve = w => { const keys = Object.keys(window.CHALLENGES).filter(k => k <= w).sort(); return keys.length ? window.CHALLENGES[keys[keys.length - 1]] : null; };
  const current = () => { const w = id(); return { id: w, ch: resolve(w) }; };
  const prevWeek = w => id(new Date(range(w).start.getTime() - 3 * 864e5));
  const past = () => { // 첫 챌린지 주부터 지난주까지, 최근 순
    const first = Object.keys(window.CHALLENGES).sort()[0], out = [];
    if (!first) return out;
    for (let w = prevWeek(id()); w >= first && out.length < 12; w = prevWeek(w)) out.push(w);
    return out;
  };
  return { id, range, label, current, past, resolve };
})();
