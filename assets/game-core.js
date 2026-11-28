// 게임 공통: 소리 재생·녹음, 합성 가락, 채점, 문제 카드, 녹음 주고받기용 압축
// core.js(extract, compare, SR, median) 뒤에 불러야 함
const GM = (() => {
  // ---- 소리 ----
  let actx = null, playing = null;
  const ctx = () => { if (!actx) { const C = window.AudioContext || window.webkitAudioContext; actx = new C(); } if (actx.state === 'suspended') actx.resume(); return actx; };
  function stopPlay() { if (playing) { const p = playing; playing = null; try { p.stop(); } catch (_) {} if (p._done) p._done(); } }
  function play(x, rate = SR) {
    stopPlay(); if (!x || !x.length) return Promise.resolve();
    const c = ctx(), b = c.createBuffer(1, x.length, rate); b.getChannelData(0).set(x);
    const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); playing = s;
    return new Promise(r => { s._done = r; s.onended = () => { if (playing === s) playing = null; r(); }; });
  }
  async function to16k(buf, maxSec = 20) {
    const dur = Math.min(buf.duration, maxSec), off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dur * SR)), SR);
    const s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start();
    const x = Float32Array.from((await off.startRendering()).getChannelData(0));
    let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
    if (pk < 1e-4) throw new Error('silent');
    if (pk < 0.3) for (let i = 0; i < x.length; i++) x[i] *= 0.3 / pk;
    return trim(x);
  }
  // 앞뒤 무음 잘라내기 (앞뒤 0.15초 여유)
  function trim(x) {
    const H = 320, n = Math.floor(x.length / H); if (n < 4) return x;
    const db = []; for (let f = 0; f < n; f++) { let s = 0; for (let i = 0; i < H; i++) s += x[f * H + i] ** 2; db.push(10 * Math.log10(s / H + 1e-12)); }
    const pk = Math.max(...db), sorted = [...db].sort((a, b) => a - b), fl = sorted[Math.floor(n * 0.1)], thr = Math.max(pk - 35, fl + 10);
    let a = 0, b = n - 1; while (a < n && db[a] < thr) a++; while (b > a && db[b] < thr) b--;
    const s0 = Math.max(0, (a - 8) * H), s1 = Math.min(x.length, (b + 9) * H);
    return s1 - s0 > SR * 0.3 ? x.slice(s0, s1) : x;
  }
  let rec = null;
  // 녹음: 말이 끝나고 조용해지면 저절로 멈춤. 결과는 16 kHz Float32Array (실패하면 null)
  async function record({ maxSec = 8, onLevel, quietSec = 1.1 } = {}) {
    if (rec) { rec.stop(); return null; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('이 브라우저에서는 마이크를 쓸 수 없어요.');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (_) { throw new Error('마이크 권한이 없어요. 주소창 자물쇠 아이콘에서 마이크를 허용해 주세요.'); }
    stopPlay();
    const c = ctx(), src = c.createMediaStreamSource(stream), proc = c.createScriptProcessor(4096, 1, 1), mute = c.createGain(); mute.gain.value = 0;
    const chunks = []; let n = 0, quiet = 0, spoke = false, minDb = 0;
    GM.onRec && GM.onRec(true);
    return new Promise(resolve => {
      const stop = async () => {
        if (!rec || rec.stop !== stop) return; rec = null;
        proc.onaudioprocess = null; try { src.disconnect(); proc.disconnect(); mute.disconnect(); } catch (_) {}
        stream.getTracks().forEach(t => t.stop()); GM.onRec && GM.onRec(false);
        const len = chunks.reduce((a, b) => a + b.length, 0);
        if (len < c.sampleRate * 0.4) return resolve(null);
        const buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0); let o = 0;
        for (const k of chunks) { ch.set(k, o); o += k.length; }
        try { resolve(await to16k(buf)); } catch (_) { resolve(null); }
      };
      proc.onaudioprocess = e => {
        const d = e.inputBuffer.getChannelData(0); chunks.push(new Float32Array(d)); n += d.length;
        let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
        const db = 10 * Math.log10(s / d.length + 1e-12), sec = n / c.sampleRate, dt = d.length / c.sampleRate;
        if (chunks.length <= 3) minDb = chunks.length === 1 ? db : Math.min(minDb, db);
        const on = db > Math.max(minDb + 12, -55);
        if (on) { spoke = true; quiet = 0; } else if (spoke) quiet += dt;
        if (onLevel) onLevel(sec, Math.min(1, Math.max(0, (db + 60) / 50)), spoke, maxSec);
        if ((spoke && quiet > quietSec && sec > 0.8) || sec >= maxSec) stop();
      };
      src.connect(proc); proc.connect(mute); mute.connect(c.destination);
      rec = { stop };
    });
  }
  const recording = () => !!rec;
  const stopRec = () => { if (rec) rec.stop(); };
  async function fileTo16k(f) {
    const ab = await f.arrayBuffer(), c = ctx();
    const buf = await new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    return to16k(buf);
  }
  const reverse = x => { const y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i]; return y; };

  // ---- 합성 가락 (따라 부르기) ----
  function rng(seed) { let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1; const f = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; for (let i = 0; i < 6; i++) f(); return f; }
  function pattern(L, seed) {
    for (let k = 0; k < 20; k++) { const p = pattern1(L, seed + k * 7919), v = p.filter(q => q[0] !== '_').flatMap(q => [q[2], q[3]]); if (Math.max(...v) - Math.min(...v) >= Math.min(5, 3 + L)) return p; }
    return pattern1(L, seed);
  }
  function pattern1(L, seed) {
    const r = rng(seed), n = Math.min(2 + Math.floor((L + 1) / 2), 7), w = Math.min(5 + L, 10), V = 'aoeui', out = [];
    const step = (from, min) => { let v = from; for (let k = 0; k < 8; k++) { v = Math.round(r() * w); if (Math.abs(v - from) >= min) break; } return v; };
    let prev = Math.round(r() * w);
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? prev : step(prev, 2);
      const b = L >= 3 && r() < 0.45 ? step(a, 2) : a;
      out.push([V[Math.floor(r() * (L < 3 ? 2 : 5))], 0.24 + r() * 0.2 + (L < 3 ? 0.1 : 0), a, b]);
      prev = b;
      if (i < n - 1 && r() < (L < 3 ? 0.5 : 0.3)) out.push(['_', 0.07 + r() * 0.1]);
    }
    return out;
  }
  const VOW = { a: [750, 1150, 2500], i: [300, 2200, 2950], u: [350, 750, 2350], e: [480, 1800, 2550], o: [470, 850, 2450] };
  function synth(seq, base, { tempo = 1, shift = 0 } = {}) {
    const out = []; let ph = 0;
    const env = (f, F) => { let a = 0; F.forEach((fc, k) => { const bw = 70 + k * 45; a += (k ? 0.55 : 1) / (1 + ((f - fc) / bw) ** 2); }); return a * Math.exp(-f / 3200); };
    const pad = s => { for (let i = 0; i < s * SR; i++) out.push(0); };
    pad(0.25);
    for (const [v, dur, a0, b0] of seq) {
      const n = Math.round(dur * tempo * SR);
      if (v === '_') { for (let i = 0; i < n; i++) out.push(0); continue; }
      for (let i = 0; i < n; i++) {
        const t = i / n, sm = t < 0.15 ? 0 : t > 0.85 ? 1 : (t - 0.15) / 0.7, semi = a0 + (b0 - a0) * (sm * sm * (3 - 2 * sm)) + shift;
        const f0 = base * 2 ** (semi / 12) * (1 + 0.012 * Math.sin(2 * Math.PI * 5.2 * i / SR) * Math.min(1, t * 3));
        ph += 2 * Math.PI * f0 / SR;
        let s = 0; for (let h = 1; h * f0 < 6500; h++) s += env(h * f0, VOW[v]) * Math.sin(h * ph);
        out.push(0.11 * s * Math.min(1, t * 12, (1 - t) * 8) + (Math.random() * 2 - 1) * 0.0015);
      }
    }
    pad(0.25);
    return Float32Array.from(out);
  }
  // 높낮이 모양 + 폭 + 길이로 채점 (옥타브·조 무관)
  function contourOf(x) {
    const F = extract(x), fr = F.frames, v = [];
    let t0 = -1, t1 = -1;
    fr.forEach((f, i) => { if (f.f0 > 0) { v.push({ i, m: 12 * Math.log2(f.f0 / 440) }); if (t0 < 0) t0 = i; t1 = i; } });
    let med = median(v.map(p => p.m));
    for (const p of v) { while (p.m - med > 8.5) p.m -= 12; while (med - p.m > 8.5) p.m += 12; }
    med = median(v.map(p => p.m));
    return { pts: v.map(p => ({ t: t1 > t0 ? (p.i - t0) / (t1 - t0) : 0, m: p.m - med })), voiced: v.length, span: t1 - t0 + 1, med };
  }
  const resample = (a, n) => { if (a.length <= n) return a.slice(); const o = []; for (let k = 0; k < n; k++) { const s = Math.floor(k * a.length / n), e = Math.max(s + 1, Math.floor((k + 1) * a.length / n)); let m = 0; for (let i = s; i < e; i++) m += a[i]; o.push(m / (e - s)); } return o; };
  function dtwMad(A, B) {
    const n = A.length, m = B.length, band = Math.max(Math.abs(n - m) + 3, Math.round(Math.max(n, m) * 0.12)), INF = 1e9;
    const C = new Float64Array((n + 1) * (m + 1)).fill(INF), L = new Uint16Array((n + 1) * (m + 1)); C[0] = 0;
    for (let i = 1; i <= n; i++) { const c = Math.round(i * m / n), lo = Math.max(1, c - band), hi = Math.min(m, c + band);
      for (let j = lo; j <= hi; j++) { const d = Math.abs(A[i - 1] - B[j - 1]), k = i * (m + 1) + j;
        const a = C[(i - 1) * (m + 1) + j - 1], b = C[(i - 1) * (m + 1) + j], e = C[i * (m + 1) + j - 1];
        if (a <= b && a <= e) { C[k] = a + d; L[k] = L[(i - 1) * (m + 1) + j - 1] + 1; } else if (b <= e) { C[k] = b + d; L[k] = L[(i - 1) * (m + 1) + j] + 1; } else { C[k] = e + d; L[k] = L[i * (m + 1) + j - 1] + 1; } } }
    const k = n * (m + 1) + m; return C[k] >= INF ? 99 : C[k] / Math.max(1, L[k]);
  }
  function svScore(ref, me) {
    const R = contourOf(ref), M = contourOf(me);
    if (M.voiced < 15) return { total: 0, none: true, R, M };
    const A = resample(R.pts.map(p => p.m), 100), B = resample(M.pts.map(p => p.m), 100);
    const mad = dtwMad(A, B), shape = 100 * Math.exp(-((mad / 1.7) ** 2));
    const ratio = M.span / Math.max(1, R.span), len = 100 * Math.exp(-((Math.log(ratio) / 0.45) ** 2));
    const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
    const wR = q(A, 0.95) - q(A, 0.05), wM = q(B, 0.95) - q(B, 0.05), wide = 100 * Math.exp(-(((wM - wR) / 3) ** 2));
    return { total: 0.55 * shape + 0.2 * wide + 0.25 * len, shape, wide, len, mad, ratio, wR, wM, R, M };
  }
  const need = L => Math.min(78, 60 + (L - 1) * 3);
  // 흉내 점수: 성대모사 싱크로율과 같은 비교. 소리가 거의 없으면 0
  function mimicScore(src, me) {
    try { const a = extract(src), b = extract(me), r = compare(a, b), p = {}; for (const k in r.parts) p[k] = isNaN(r.parts[k]) ? null : Math.round(r.parts[k]); return { score: isNaN(r.overall) ? 0 : Math.round(r.overall), parts: p }; }
    catch (_) { return { score: 0, parts: {} }; }
  }
  // 거꾸로 말하기 점수: 순서에 민감한 항목(억양·발음·강세)만 보고,
  // '원래 낱말을 그냥 뒤집은 것'만큼 닮은 건 0점, 원래 낱말과 똑같으면 100점이 되게 맞춤
  function backScore(orig, mine) {
    try {
      const A = extract(orig), ord = r => { const v = ['into', 'pron', 'stress'].map(k => r.parts[k]).filter(v => !isNaN(v)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
      const good = compare(A, extract(reverse(mine))), base = ord(compare(A, extract(reverse(orig)))), g = ord(good);
      const frac = Math.max(0, Math.min(1, (g - base) / Math.max(15, 100 - base)));
      const p = {}; for (const k in good.parts) p[k] = isNaN(good.parts[k]) ? null : Math.round(good.parts[k]);
      return { score: Math.round(100 * Math.sqrt(frac)), raw: Math.round(g), base: Math.round(base), parts: p };
    } catch (_) { return { score: 0, raw: 0, base: 0, parts: {} }; }
  }
  function tipOf(parts) {
    const N = { timbre: '음색', pitch: '높이', into: '억양', pron: '발음', rhythm: '리듬', stress: '강세' };
    const e = Object.entries(parts || {}).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1]);
    if (!e.length) return ''; const [lo, hi] = [e[0], e[e.length - 1]];
    if (lo[1] >= 90) return '모든 항목이 거의 똑같아요';
    return `제일 닮은 건 ${N[hi[0]]}(${hi[1]}), 제일 다른 건 ${N[lo[0]]}(${lo[1]})`;
  }

  // ---- 흉내 배틀 점수 규칙 ----
  // 따라 한 사람: 닮음 점수 10점마다 1점 (0~10) + 2명 이상이면 1등 +3, 2등 +1
  // 문제 낸 사람: 따라 한 사람들 평균이 45~80점이면 '딱 좋은 문제' +5 (너무 쉽거나 어려우면 0)
  // 투표: 한 표마다 +3
  const RULE = { per: 10, rank: [3, 1], askLo: 45, askHi: 80, askPts: 5, vote: 3 };
  function battlePoints(asker, takes) { // takes: {id: score}
    const ids = Object.keys(takes).sort((a, b) => takes[b] - takes[a]), pts = {}, why = {};
    ids.forEach((id, r) => { const base = Math.round(takes[id] / RULE.per), bonus = ids.length >= 2 ? RULE.rank[r] || 0 : 0; pts[id] = base + bonus; why[id] = `닮음 ${base}${bonus ? ` + ${r + 1}등 ${bonus}` : ''}`; });
    if (asker != null && ids.length) { const avg = ids.reduce((s, id) => s + takes[id], 0) / ids.length, good = avg >= RULE.askLo && avg <= RULE.askHi;
      pts[asker] = (pts[asker] || 0) + (good ? RULE.askPts : 0); why[asker] = good ? `딱 좋은 문제 +${RULE.askPts} (평균 ${Math.round(avg)})` : avg > RULE.askHi ? `너무 쉬운 문제 +0 (평균 ${Math.round(avg)})` : `너무 어려운 문제 +0 (평균 ${Math.round(avg)})`; }
    return { pts, why, order: ids };
  }

  // ---- 문제 카드 (모두 직접 지은 것) ----
  const CARDS = ['고양이가 밥 달라고 조르는 소리', '고장 난 로봇의 인사', '놀이공원 안내 방송 한 줄', '할머니가 멀리 있는 손주 부르기', '지구에 처음 온 외계인의 인사', '알람 다섯 번 끈 월요일 아침', '무대 끝난 아이돌의 마지막 인사', '골 들어간 순간의 축구 중계', '공포 영화에서 삐걱 문 여는 소리', '뜨거운 라면 첫입 감탄', '엄청 느린 나무늘보 말투', '시끄러운 교실에서 "조용!"', '홈쇼핑 "지금 바로 주문하세요"', '새벽 닭 우는 소리', '사극 신하 "전하, 아니 되옵니다"', '재벌 3세 드라마 말투', '갓난아기 옹알이', '내비게이션 "경로를 이탈했습니다"', '게임 캐릭터 레벨 업 효과음', '뉴스 앵커의 첫인사', '비 맞은 강아지 낑낑', '마법 주문 외우는 마법사', '지하철 "이번 역은…" 안내', '헬륨 풍선 마신 목소리 흉내', '잔뜩 신난 유치원생 자기소개', '로봇 청소기가 벽에 부딪힌 소리', '중2병 주인공의 필살기 이름', '오페라 가수 "아~"', '배고픈 공룡 울음', '친절한 콜센터 첫마디'];
  const DISGUISE = ['오늘 저녁은 내가 쏜다', '냉장고에 있는 푸딩 누가 먹었어', '나 지금 출발했어, 진짜야', '이 노래 누가 틀었어', '고양이가 키보드를 밟았어', '다음 정류장은 우리 집입니다', '배고파서 아무 생각이 없어', '내일 숙제 있는 사람 손', '비밀번호는 절대 안 알려 줘', '방금 그거 나 아니야'];
  const BACKWARD = ['바나나', '고양이', '안녕하세요', '사랑해', '토마토', '아이스크림', '자동차', '초콜릿', '펭귄', '무지개', '목소리', '라면 먹자', '감사합니다', '수박', '오리너구리'];
  const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

  // ---- 녹음 주고받기용 압축 (μ-law, 16 kHz) ----
  const MU = (() => { const enc = v => { let s = v < 0 ? 0x80 : 0; v = Math.min(32635, Math.abs(v)) + 132; let e = 7; for (let m = 0x4000; (v & m) === 0 && e > 0; e--, m >>= 1); return ~(s | (e << 4) | ((v >> (e + 3)) & 0x0f)) & 0xff; };
    const dec = u => { u = ~u & 0xff; const s = u & 0x80, e = (u >> 4) & 7, m = u & 0x0f; let v = ((m << 3) + 132) << e; v -= 132; return s ? -v : v; };
    const D = new Float32Array(256); for (let i = 0; i < 256; i++) D[i] = dec(i) / 32768; return { enc, D }; })();
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const packAudio = x => { const u = new Uint8Array(x.length); for (let i = 0; i < x.length; i++) u[i] = MU.enc(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767)); return b64(u); };
  const muRound = x => unpackAudio(packAudio(x)); // 보낼 때와 같은 압축을 거친 소리 (비교를 공평하게)
  const unpackAudio = s => { const u = unb64(s), x = new Float32Array(u.length); for (let i = 0; i < u.length; i++) x[i] = MU.D[u[i]]; return x; };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const nn = m => NOTE[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);
  const levelHtml = (s, lv, spoke, max) => `<b>녹음 중 ${s.toFixed(1)}초</b>${max ? ` / ${max}초` : ''} <span class="lvl"><i style="width:${lv * 100}%"></i></span>${spoke ? '' : ' 소리를 내 보세요'}`;

  return { ctx, play, stopPlay, record, recording, stopRec, fileTo16k, trim, reverse, rng, pattern, synth, svScore, contourOf, need, mimicScore, backScore, tipOf, RULE, battlePoints, CARDS, DISGUISE, BACKWARD, pick, packAudio, unpackAudio, muRound, esc, nn, levelHtml, onRec: null };
})();
