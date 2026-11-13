// ===== 성대모사 유사도 분석 엔진 =====
const SR = 16000, WIN = 400, HOP = 160, NFFT = 512, NMEL = 40, NCEP = 13;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const hz2mel = h => 2595 * Math.log10(1 + h / 700);
const mel2hz = m => 700 * (10 ** (m / 2595) - 1);
const MELFB = (() => {
  const lo = hz2mel(60), hi = hz2mel(7600), pts = [];
  for (let i = 0; i < NMEL + 2; i++) pts.push(Math.floor((NFFT + 1) * mel2hz(lo + (hi - lo) * i / (NMEL + 1)) / SR));
  const fb = [];
  for (let m = 1; m <= NMEL; m++) {
    const w = new Float32Array(NFFT / 2 + 1);
    for (let k = pts[m - 1]; k < pts[m]; k++) w[k] = (k - pts[m - 1]) / Math.max(1, pts[m] - pts[m - 1]);
    for (let k = pts[m]; k <= pts[m + 1]; k++) w[k] = (pts[m + 1] - k) / Math.max(1, pts[m + 1] - pts[m]);
    fb.push(w);
  }
  return fb;
})();
const HANN = Float32Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1)));

// YIN 피치 추정 (60~900 Hz)
function yin(x, start) {
  const W = 480, tmin = Math.floor(SR / 900), tmax = Math.floor(SR / 60);
  if (start + W + tmax > x.length) return 0;
  const d = new Float32Array(tmax + 1);
  for (let t = tmin; t <= tmax; t++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const v = x[start + i] - x[start + i + t]; s += v * v; }
    d[t] = s;
  }
  // 누적 평균 정규화 (tmin 이전은 근사적으로 0으로 취급)
  let run = 0; const dn = new Float32Array(tmax + 1);
  for (let t = 1; t <= tmax; t++) {
    if (t < tmin) { let s = 0; for (let i = 0; i < W; i++) { const v = x[start + i] - x[start + i + t]; s += v * v; } d[t] = s; }
    run += d[t]; dn[t] = run > 0 ? d[t] * t / run : 1;
  }
  let tau = -1;
  for (let t = tmin; t <= tmax; t++) {
    if (dn[t] < 0.15) { while (t + 1 <= tmax && dn[t + 1] < dn[t]) t++; tau = t; break; }
  }
  if (tau < 0) return 0;
  let a = dn[tau - 1], b = dn[tau], c = tau + 1 <= tmax ? dn[tau + 1] : b;
  const den = a - 2 * b + c, shift = den !== 0 ? 0.5 * (a - c) / den : 0;
  return SR / (tau + Math.max(-1, Math.min(1, shift)));
}

function median(a) { if (!a.length) return NaN; const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function mean(a) { let s = 0; for (const v of a) s += v; return a.length ? s / a.length : NaN; }

// 신호 → 프레임 특징
function extract(x) {
  // DC 제거 + 프리엠퍼시스용 사본
  const m = mean(x); const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - m;
  const nF = Math.max(0, Math.floor((y.length - WIN) / HOP) + 1);
  const db = new Float32Array(nF), logmel = [], f0 = new Float32Array(nF);
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT);
  for (let f = 0; f < nF; f++) {
    const o = f * HOP; let e = 0;
    re.fill(0); im.fill(0);
    for (let i = 0; i < WIN; i++) {
      const v = y[o + i]; e += v * v;
      re[i] = (v - 0.97 * (o + i > 0 ? y[o + i - 1] : 0)) * HANN[i];
    }
    db[f] = 10 * Math.log10(e / WIN + 1e-10);
    fft(re, im);
    const lm = new Float32Array(NMEL);
    for (let b = 0; b < NMEL; b++) {
      const w = MELFB[b]; let s = 0;
      for (let k = 0; k <= NFFT / 2; k++) if (w[k]) s += w[k] * (re[k] * re[k] + im[k] * im[k]);
      lm[b] = 10 * Math.log10(s + 1e-10);
    }
    logmel.push(lm);
  }
  // 음성 구간 검출 → 앞뒤 무음 자르기
  const peak = Math.max(...db);
  const sortedDb = Array.from(db).sort((a, b) => a - b);
  const floor = sortedDb[Math.floor(0.1 * (nF - 1))];
  const thr = Math.max(peak - 35, floor + 12, -75);
  // 잡음 스펙트럼 (가장 조용한 10% 프레임 평균, 선형 파워)
  const noiseP = new Float32Array(NMEL); let nN = 0;
  for (let f = 0; f < nF; f++) if (db[f] <= floor + 1) { nN++; for (let b = 0; b < NMEL; b++) noiseP[b] += 10 ** (logmel[f][b] / 10); }
  for (let b = 0; b < NMEL; b++) noiseP[b] /= Math.max(1, nN);
  let s0 = 0, s1 = nF - 1;
  while (s0 < nF && db[s0] < thr) s0++;
  while (s1 > s0 && db[s1] < thr) s1--;
  const sl = (s0 > 3 ? s0 - 3 : 0), el = Math.min(nF - 1, s1 + 3);
  const frames = [];
  for (let f = sl; f <= el; f++) {
    const active = db[f] >= Math.max(peak - 30, floor + 15, -70);
    const p = active ? yin(y, f * HOP) : 0;
    frames.push({ db: db[f], lm: logmel[f], f0: p, active });
  }
  // 피치 이상치 제거 (옥타브 점프 완화: 중앙값 3중 필터)
  const raw = frames.map(fr => fr.f0);
  for (let i = 0; i < frames.length; i++) {
    const w = [raw[i - 1], raw[i], raw[i + 1]].filter(v => v > 0);
    if (raw[i] > 0 && w.length >= 2) frames[i].f0 = median(w);
    if (raw[i] > 0 && w.length < 2) frames[i].f0 = 0; // 고립된 유성 프레임 제거
  }
  // MFCC (DCT-II)
  for (const fr of frames) {
    const c = new Float32Array(NCEP);
    for (let k = 0; k < NCEP; k++) { let s = 0; for (let b = 0; b < NMEL; b++) s += fr.lm[b] * Math.cos(Math.PI * k * (b + 0.5) / NMEL); c[k] = s * Math.sqrt(2 / NMEL); }
    fr.mfcc = c;
  }
  return { frames, dur: (s1 - s0 + 1) * HOP / SR, startSec: sl * HOP / SR, peak, noiseP, snr: peak - floor };
}

// 발화 내 정규화 MFCC (c1~c12) + 델타 → DTW용
function normFeats(frames) {
  const n = frames.length, D = NCEP - 1;
  const v = frames.map(fr => Array.from(fr.mfcc.slice(1)));
  const mu = new Array(D).fill(0), sd = new Array(D).fill(0);
  for (const r of v) r.forEach((x, i) => mu[i] += x / n);
  for (const r of v) r.forEach((x, i) => sd[i] += (x - mu[i]) ** 2 / n);
  const out = v.map(r => r.map((x, i) => (x - mu[i]) / (Math.sqrt(sd[i]) + 1e-6)));
  return out.map((r, t) => {
    const a = out[Math.max(0, t - 2)], b = out[Math.min(n - 1, t + 2)];
    return r.concat(r.map((_, i) => (b[i] - a[i]) / 4 * 0.5));
  });
}

function dtw(A, B) {
  const n = A.length, m = B.length, INF = 1e30;
  const band = Math.max(Math.abs(n - m) + 10, Math.round(Math.max(n, m) * 0.25));
  const C = new Float32Array((n + 1) * (m + 1)).fill(INF);
  const P = new Uint8Array((n + 1) * (m + 1));
  C[0] = 0;
  for (let i = 1; i <= n; i++) {
    const c = Math.round(i * m / n), lo = Math.max(1, c - band), hi = Math.min(m, c + band);
    for (let j = lo; j <= hi; j++) {
      let d = 0; const a = A[i - 1], b = B[j - 1];
      for (let k = 0; k < a.length; k++) { const t = a[k] - b[k]; d += t * t; }
      d = Math.sqrt(d / a.length);
      const x = C[(i - 1) * (m + 1) + j - 1] , y = C[(i - 1) * (m + 1) + j] + 0.0, z = C[i * (m + 1) + j - 1];
      let best = x, dir = 0;
      if (y < best) { best = y; dir = 1; }
      if (z < best) { best = z; dir = 2; }
      C[i * (m + 1) + j] = best + d * (dir === 0 ? 2 : 1); P[i * (m + 1) + j] = dir;
    }
  }
  const path = []; let i = n, j = m;
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);
    const dir = P[i * (m + 1) + j];
    if (dir === 0) { i--; j--; } else if (dir === 1) i--; else j--;
  }
  path.reverse();
  return { cost: C[n * (m + 1) + m] / (n + m), path };
}

const st = hz => 12 * Math.log2(hz / 440) + 69; // MIDI 반음
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const NOTE = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'];
const noteName = midi => NOTE[((Math.round(midi) % 12) + 12) % 12] + (Math.floor(Math.round(midi) / 12) - 1);

function pearson(a, b) {
  const n = a.length; if (n < 3) return NaN;
  const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : NaN;
}

function compare(R, I) {
  const fr = R.frames, fi = I.frames;
  const A = normFeats(fr), B = normFeats(fi);
  const { cost, path } = dtw(A, B);

  // 1) 발음·구성 (말소리 모양) — DTW 거리
  const pron = clamp(100 / (1 + Math.exp((cost - 0.75) / 0.08)));

  // 2) 음높이 (평균 피치)
  const vr = fr.filter(f => f.f0 > 0).map(f => st(f.f0)), vi = fi.filter(f => f.f0 > 0).map(f => st(f.f0));
  const mr = median(vr), mi = median(vi);
  const dPitch = mi - mr;
  const pitch = vr.length > 5 && vi.length > 5 ? 100 * Math.exp(-((dPitch / 2.5) ** 2)) : NaN;

  // 3) 억양 (피치 곡선 모양) — DTW 경로 위에서 각자 중앙값 기준 반음 곡선 비교
  const pa = [], pb = [];
  for (const [i, j] of path) if (fr[i].f0 > 0 && fi[j].f0 > 0) { pa.push(st(fr[i].f0) - mr); pb.push(st(fi[j].f0) - mi); }
  let into = NaN, intoMad = NaN, rangeR = NaN, rangeI = NaN;
  if (pa.length > 8) {
    intoMad = mean(pa.map((v, k) => Math.abs(v - pb[k])));
    into = 100 * Math.exp(-((intoMad / 1.8) ** 2));
    const q = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
    rangeR = q(vr, 0.9) - q(vr, 0.1); rangeI = q(vi, 0.9) - q(vi, 0.1);
  }

  // 4) 음색 — 유성 구간 평균 스펙트럼 포락선(멜 대역) 모양 비교
  const ltas = X => {
    const frames = X.frames;
    const sel = frames.filter(f => f.f0 > 0 && f.active); const use = sel.length > 5 ? sel : frames.filter(f => f.active);
    const p = new Float64Array(NMEL);
    for (const f of use) for (let b = 0; b < NMEL; b++) p[b] += 10 ** (f.lm[b] / 10) / use.length;
    // 잡음 파워 빼기 (스펙트럼 차감)
    const s = Array.from(p, (v, b) => 10 * Math.log10(Math.max(v - X.noiseP[b], v * 0.03) + 1e-12));
    const mu = mean(s); return s.map(v => v - mu);
  };
  const LR = ltas(R), LI = ltas(I);
  // 5밴드씩 묶어 부드럽게(마이크 차이 영향 완화) 비교
  const smooth = L => L.map((_, b) => mean(L.slice(Math.max(0, b - 2), Math.min(NMEL, b + 3))));
  const SRr = smooth(LR), SIr = smooth(LI);
  const tdiff = Math.sqrt(mean(SRr.map((v, b) => (v - SIr[b]) ** 2)));
  const timbre = 100 * Math.exp(-((tdiff / 6) ** 2));
  // 밝기(고역 비중) 차이
  const hiBand = L => mean(L.slice(26)) - mean(L.slice(4, 18));
  const bright = hiBand(LI) - hiBand(LR);

  // 5) 리듬·속도
  const ratio = I.dur / R.dur;
  const tempoS = 100 * Math.exp(-((Math.log(ratio) / 0.3) ** 2));
  let dev = 0;
  for (const [i, j] of path) dev += Math.abs(i / Math.max(1, fr.length - 1) - j / Math.max(1, fi.length - 1));
  dev /= path.length;
  const localS = 100 * Math.exp(-((dev / 0.07) ** 2));
  const rhythm = 0.5 * tempoS + 0.5 * localS;

  // 6) 강세·셈여림 — 에너지 곡선 상관
  const ea = [], eb = [];
  for (const [i, j] of path) { ea.push(fr[i].db); eb.push(fi[j].db); }
  const ec = pearson(ea, eb);
  const stress = isNaN(ec) ? NaN : clamp(((ec - 0.3) / 0.6) * 100);

  const parts = { timbre, pitch, into, pron, rhythm, stress };
  const W = { timbre: 0.25, pitch: 0.2, into: 0.2, pron: 0.15, rhythm: 0.1, stress: 0.1 };
  let tot = 0, ws = 0;
  for (const k in W) if (!isNaN(parts[k])) { tot += parts[k] * W[k]; ws += W[k]; }
  const overall = ws ? tot / ws : NaN;

  return {
    overall, parts, path, cost,
    detail: { dPitch, mr, mi, intoMad, rangeR, rangeI, ratio, dev, ec, tdiff, bright, LR: SRr, LI: SIr, voicedR: vr.length, voicedI: vi.length }
  };
}

function feedback(res) {
  const d = res.detail, out = [];
  if (!isNaN(d.dPitch)) {
    const a = Math.abs(d.dPitch);
    if (a >= 0.8) out.push({ k: 'pitch', t: `목소리가 원본보다 평균 ${a.toFixed(1)}반음 ${d.dPitch > 0 ? '높아요' : '낮아요'}. (원본 ≈ ${noteName(d.mr)}, 내 모사 ≈ ${noteName(d.mi)})` });
    else out.push({ k: 'pitch', t: `기본 음높이는 원본과 거의 같아요 (차이 ${a.toFixed(1)}반음).` });
  }
  if (!isNaN(d.rangeR) && !isNaN(d.rangeI)) {
    const r = d.rangeI - d.rangeR;
    if (r > 1.5) out.push({ k: 'into', t: `억양 폭이 원본보다 넓어요 (${d.rangeR.toFixed(1)} → ${d.rangeI.toFixed(1)}반음). 오르내림을 조금 덜 과장해 보세요.` });
    else if (r < -1.5) out.push({ k: 'into', t: `억양이 원본보다 평평해요 (${d.rangeR.toFixed(1)} → ${d.rangeI.toFixed(1)}반음). 오르내림을 더 살려 보세요.` });
  }
  if (!isNaN(d.intoMad) && d.intoMad > 1.2) out.push({ k: 'into', t: `억양 곡선이 평균 ${d.intoMad.toFixed(1)}반음 어긋나요. 아래 그래프에서 많이 벌어진 부분을 확인해 보세요.` });
  if (Math.abs(d.bright) > 2.5) out.push({ k: 'timbre', t: d.bright > 0 ? `고음역 성분이 원본보다 강해서 소리가 더 밝고 날카롭게 들려요. 공명을 조금 더 뒤·아래로 내려 보세요.` : `고음역 성분이 원본보다 약해서 소리가 더 어둡고 먹먹하게 들려요. 공명을 앞쪽(입·코 쪽)으로 올려 보세요.` });
  const pct = Math.round((d.ratio - 1) * 100);
  if (Math.abs(pct) >= 8) out.push({ k: 'rhythm', t: `전체 길이가 원본보다 ${Math.abs(pct)}% ${pct > 0 ? '길어요 (말이 느려요)' : '짧아요 (말이 빨라요)'}.` });
  else out.push({ k: 'rhythm', t: `말 빠르기는 원본과 비슷해요 (차이 ${Math.abs(pct)}%).` });
  if (!isNaN(d.ec) && d.ec < 0.6) out.push({ k: 'stress', t: `소리의 셈여림(강하게·약하게 말하는 위치)이 원본과 많이 달라요.` });
  if (res.cost > 0.9) out.push({ k: 'pron', t: `같은 대사가 맞는지 확인해 보세요. 발음 구성이 원본과 꽤 다르게 분석됐어요.` });
  return out;
}

if (typeof module !== 'undefined') module.exports = { extract, compare, feedback, SR, HOP };
