// 여목 스타일 프리셋, 목표 목소리 분석, 훈련 드릴 정의
// 근거: 프로젝트 문서 「여목 스타일 분류와 측정 기준」
// reg: 진성(0)~가성(1) 위치 목표 구간, breath: 'warn'(숨 적게) | 'allow'(공기감 허용), breathRange: 숨 섞인 프레임 비율 목표
window.YStyle = (() => {
  const STYLES = {
    A: { name: '진성 여목', sub: '일상·성우 톤', desc: '성대를 닫은 채 얇고 가볍게. 음높이와 공명을 함께 올리고 숨은 적게.', fmin: 165, fmax: 255, rmin: 15, rmax: 40, reg: [0.15, 0.65], breath: 'warn', breathRange: [0, 0.3], into: [4, 10], water: 15 },
    B: { name: '가성 소녀 보이스', sub: '모에·공기감 (나히다 계열)', desc: '가성 기반에 공기를 섞은 높고 가벼운 소리. 억양을 크게, 높이를 끝까지 유지.', fmin: 260, fmax: 420, rmin: 25, rmax: 60, reg: [0.55, 1.15], breath: 'allow', breathRange: [0.1, 0.7], into: [6, 14], water: 10 },
    C: { name: '성숙·쿨 여성', sub: '누님·쿨데레', desc: '낮은 편의 음높이에서 공명으로 여성스럽게. 억양은 차분하게 좁게.', fmin: 165, fmax: 210, rmin: 15, rmax: 35, reg: [-0.15, 0.55], breath: 'warn', breathRange: [0, 0.25], into: [2, 7], water: 15 },
  };
  const FIELDS = ['fmin', 'fmax', 'rmin', 'rmax', 'reg', 'breath', 'breathRange', 'into', 'water'];
  const pick = o => Object.fromEntries(FIELDS.map(k => [k, Array.isArray(o[k]) ? [...o[k]] : o[k]]));

  const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.max(0, Math.min(s.length - 1, Math.floor(p * (s.length - 1))))]; };
  const st = hz => 12 * Math.log2(hz / 440) + 69;

  // 목표 목소리(16 kHz 모노) 분석 → 스타일 값
  // regPosFn: 사용자의 기준 녹음으로 H1-H2를 진성·가성 위치로 바꾸는 함수, baseRes: 사용자의 평소 공명(Hz)
  function analyzeClip(x, regPosFn, baseRes, breathyFn) {
    const N = 1024, hop = 512, fr = [];
    let peak = -99;
    for (let i = 0; i + N <= x.length; i += hop) { const r = VF.analyze(x.subarray(i, i + N)); fr.push(r); if (r.db > peak) peak = r.db; }
    const v = fr.filter(r => r.f0 >= 70 && r.f0 <= 1000 && r.db > peak - 35 && r.clarity > 0.5);
    if (v.length < 15) return { error: '목소리가 충분히 잡히지 않았어요. 배경음악 없이 대사만 또렷한 3초 이상 클립을 올려 주세요.' };
    const f0 = v.map(r => r.f0), hs = v.map(r => r.h1h2).filter(Number.isFinite), rs = v.map(r => r.res).filter(Number.isFinite);
    const sts = f0.map(st), into = q(sts, 0.9) - q(sts, 0.1);
    const rp = hs.length ? regPosFn(med(hs)) : NaN;
    const breath = v.filter(r => breathyFn(r)).length / v.length;
    const res = rs.length ? med(rs) : NaN;
    const out = { n: v.length, sec: v.length * hop / 16000, f0med: med(f0), f0lo: q(f0, 0.15), f0hi: q(f0, 0.85), rp, breath, res, into, notes: [] };
    const t = {
      fmin: Math.round(out.f0lo * 0.97), fmax: Math.round(out.f0hi * 1.03),
      reg: Number.isFinite(rp) ? [Math.max(-0.15, rp - 0.25), Math.min(1.15, rp + 0.25)] : [-0.15, 1.15],
      breath: breath > 0.25 ? 'allow' : 'warn',
      breathRange: breath > 0.25 ? [Math.max(0, breath - 0.2), Math.min(0.9, breath + 0.2)] : [0, Math.max(0.2, breath + 0.1)],
      into: [Math.max(1, Math.round(into - 3)), Math.round(into + 3)],
      water: breath > 0.25 || (Number.isFinite(rp) && rp > 0.6) ? 10 : 15,
    };
    if (Number.isFinite(baseRes) && Number.isFinite(res)) {
      let rel = (res / baseRes - 1) * 100;
      if (rel > 60) { out.notes.push(`목표 목소리의 공명이 평소보다 ${Math.round(rel)}% 높아요. 성도 길이 차이 때문에 그대로 따라가기는 어려워서 최대 +60%로 맞췄어요.`); rel = 60; }
      t.rmin = Math.max(10, Math.round(rel - 12)); t.rmax = Math.max(t.rmin + 10, Math.round(rel + 8));
      out.notes.push('대사에는 여러 모음이 섞여 있어서 공명 목표는 대략값이에요. 연습은 기준 녹음과 같은 모음으로 하는 게 정확해요.');
    } else { t.rmin = 20; t.rmax = 50; out.notes.push('기준 녹음 1번(평소 목소리)을 하면 공명 목표도 이 목소리에 맞춰져요. 지금은 +20~50%로 잡았어요.'); }
    out.target = t;
    return out;
  }

  // 훈련 드릴. check(frame, T, ctx) → true/false (프레임 단위 판정)
  // mode 'sentence' 는 문장 전체로 평가(evalSentence)
  const inBand = (v, a, b) => v >= a && v <= b;
  const DRILLS = [
    { id: 'hum', name: '목표음 허밍 유지', for: 'ABCD', reps: 5, sec: 5, aim: '음높이가 목표 안',
      how: ['「기준음 듣기」로 목표 음역 가운데 음을 들어요', '"음~" 허밍으로 그 높이를 5초 유지해요', '목에 힘이 들어가면 볼륨을 줄여요'],
      check: (f, T) => inBand(f.f0, T.fmin, T.fmax) },
    { id: 'smalldog', name: '작은 강아지 → "이~"', for: 'ABCD', reps: 5, sec: 4, aim: '공명이 목표 이상', needBase: true,
      how: ['큰 개처럼 "하, 하" 헐떡이다가 점점 작은 개처럼 높고 가볍게 헐떡여요 (속삭임으로)', '목 안이 위로 당겨지는 느낌을 잡은 채 "이~"로 소리 내요', '입꼬리를 살짝 옆으로 당기면 더 올라가요. 타는 느낌이 들기 전에 쉬어요'],
      check: (f, T, c) => Number.isFinite(f.res) && Number.isFinite(c.base) && (f.res / c.base - 1) * 100 >= T.rmin },
    { id: 'awww', name: '귀여워 "아우~"로 무게 빼기', for: 'ACD', reps: 5, sec: 4, aim: '진성·가성 위치 목표 구간 + 음높이',
      how: ['귀여운 강아지를 본 것처럼 "아우~" 해요', '그 가벼운 느낌 그대로 목표 높이에서 "아~" 4초', '볼륨은 평소의 절반 정도로'],
      check: (f, T, c) => inBand(f.f0, T.fmin, T.fmax) && Number.isFinite(f.h1h2) && inBand(c.regPos(f.h1h2), T.reg[0], T.reg[1]) },
    { id: 'airy', name: '공기감 가성 "하~"', for: 'BD', reps: 5, sec: 4, aim: '가성 쪽 + 공기감 + 높이',
      how: ['도라에몽 소리를 낸 다음, 긁는 소리를 빼고 바람 소리를 섞어요', '그 상태로 목표 높이에서 "하~"를 끊기지 않게 4초', '소리가 끊길 만큼 숨이 많으면 공기를 살짝 줄여요'],
      check: (f, T, c) => inBand(f.f0, T.fmin, T.fmax) && Number.isFinite(f.h1h2) && c.regPos(f.h1h2) >= T.reg[0] - 0.1 && (c.breathy(f) || (Number.isFinite(f.cpp) && f.cpp < 1.2)) },
    { id: 'light', name: '작게·높게 사이렌', for: 'AD', reps: 3, sec: 6, aim: '믹스(목표 구간) 유지',
      how: ['볼륨을 반으로 줄여요', '목표 아래 음에서 "우~" 하고 천천히 올라갔다 내려와요', '올라갈 때 진성·가성 미터가 목표 구간에 머물게 해요'],
      check: (f, T, c) => Number.isFinite(f.h1h2) && inBand(c.regPos(f.h1h2), T.reg[0], T.reg[1]) },
    { id: 'rise', name: '끝 올리기 문장', for: 'ABD', mode: 'sentence', reps: 3, sec: 6, aim: '억양 폭 + 문장 끝 오름',
      lines: ['정말? 나도 그거 좋아해!', '오늘 같이 갈래?', '이거 진짜 귀엽지 않아?', '고마워, 덕분에 살았어!'],
      how: ['화면의 문장을 목표 목소리로 읽어요', '문장 끝을 살짝 올려요', '중간에도 높낮이를 크게 써요'] },
    { id: 'calm', name: '차분한 문장', for: 'CD', mode: 'sentence', reps: 3, sec: 6, aim: '좁은 억양 + 공명 + 높이',
      lines: ['괜찮아, 천천히 해도 돼.', '그건 내가 처리할게.', '오늘은 여기까지 하자.', '걱정 마, 다 잘될 거야.'],
      how: ['낮은 편의 목표 높이에서 밝게 읽어요', '억양은 크게 흔들지 말고 차분하게', '문장 끝을 툭 떨어뜨리지 말고 부드럽게'] },
  ];
  // 문장 평가: 억양 폭(반음), 끝 오름(반음), 음높이·공명 목표 비율
  function evalSentence(items, T, c, id) {
    const v = items.filter(f => f.f0 > 0);
    if (v.length < 15) return { score: 0, msg: '소리가 짧았어요. 문장을 끝까지 읽어 주세요.' };
    const s = v.map(f => st(f.f0)), range = q(s, 0.9) - q(s, 0.1);
    const n = s.length, mid = med(s.slice(Math.floor(n * 0.25), Math.floor(n * 0.75))), end = med(s.slice(Math.floor(n * 0.8)));
    const rise = end - mid;
    const pOk = v.filter(f => inBand(f.f0, T.fmin, T.fmax)).length / n;
    const rOk = Number.isFinite(c.base) ? v.filter(f => Number.isFinite(f.res) && (f.res / c.base - 1) * 100 >= T.rmin).length / Math.max(1, v.filter(f => Number.isFinite(f.res)).length) : null;
    let intoScore;
    if (id === 'calm') intoScore = range <= T.into[1] ? 1 : Math.max(0, 1 - (range - T.into[1]) / 6);
    else intoScore = range >= T.into[0] ? 1 : Math.max(0, range / T.into[0]);
    const riseScore = id === 'rise' ? (rise >= 0.5 ? 1 : rise > -0.5 ? 0.5 : 0) : (rise > -2 ? 1 : 0.5);
    const parts = [intoScore, riseScore, pOk].concat(rOk == null ? [] : [rOk]);
    const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100);
    const tips = [];
    if (id === 'calm' && range > T.into[1]) tips.push(`억양 폭이 ${range.toFixed(1)}반음으로 넓어요. 더 차분하게`);
    if (id !== 'calm' && range < T.into[0]) tips.push(`억양 폭이 ${range.toFixed(1)}반음이에요. ${T.into[0]}반음 이상 오르내려 보세요`);
    if (id === 'rise' && rise < 0.5) tips.push(rise < -0.5 ? '문장 끝이 내려갔어요. 끝을 살짝 올려요' : '문장 끝을 조금 더 올려요');
    if (pOk < 0.6) tips.push(`목표 높이 안 비율 ${Math.round(pOk * 100)}%`);
    if (rOk != null && rOk < 0.5) tips.push('공명이 목표보다 낮아요. 입꼬리를 옆으로');
    return { score, range, rise, pOk, rOk, msg: tips.length ? tips.join(' · ') : '좋아요! 억양, 높이, 공명 다 목표 안이에요.' };
  }
  return { STYLES, FIELDS, pick, analyzeClip, DRILLS, evalSentence };
})();
