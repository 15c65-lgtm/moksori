// 여목 연습용 실시간 프레임 분석 (16 kHz, 1024 샘플 프레임)
// 결과: 음높이(f0), 맑음(주기성), H1-H2(진성↔가성 단서), 포먼트 F1~F3, 공명(F1~F3 기하평균), 밝기(고음역 배음 비)
// 공명은 음이 높으면(약 330 Hz 위) 배음 간격이 넓어 덜 정확함 → 그때는 밝기를 함께 볼 것
const VF = (() => {
  const SR = 16000, N = 1024, NFFT = 2048, ORDER = 18;
  const HANN = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const HAMM = Float32Array.from({ length: N }, (_, i) => 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1)));

  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
          re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    }
  }

  // YIN: 60~1100 Hz, 맑음 = 1 - 정규화 차이값
  function pitch(x) {
    const W = 480, tmin = Math.floor(SR / 1100), tmax = Math.floor(SR / 60);
    const dn = new Float32Array(tmax + 1); let run = 0;
    for (let t = 1; t <= tmax; t++) { let s = 0; for (let i = 0; i < W; i++) { const v = x[i] - x[i + t]; s += v * v; } run += s; dn[t] = run > 0 ? s * t / run : 1; }
    let tau = -1;
    for (let t = tmin; t <= tmax; t++) if (dn[t] < 0.15) { while (t + 1 <= tmax && dn[t + 1] < dn[t]) t++; tau = t; break; }
    if (tau < 0) { // 숨 섞인 소리: 뚜렷한 골이 없으면 전체 최소값으로 (맑음 낮게)
      let m = 1; for (let t = tmin; t <= tmax; t++) if (dn[t] < m) { m = dn[t]; tau = t; }
      if (m > 0.5) return { f0: 0, clarity: 0 };
    }
    const a = dn[tau - 1], b = dn[tau], c = tau + 1 <= tmax ? dn[tau + 1] : b, den = a - 2 * b + c;
    const sh = den !== 0 ? Math.max(-1, Math.min(1, 0.5 * (a - c) / den)) : 0;
    return { f0: SR / (tau + sh), clarity: Math.max(0, Math.min(1, 1 - b)) };
  }

  // 배음 크기: f0 배수 근처 최대 피크 (dB)
  function harmonicDb(mag, f, df) {
    const k0 = f / df, w = Math.max(2, Math.round(k0 * 0.12));
    let m = -1e9; for (let k = Math.max(1, Math.round(k0) - w); k <= Math.round(k0) + w && k < mag.length; k++) m = Math.max(m, mag[k]);
    return m;
  }

  // LPC (자기상관 + 레빈슨-더빈) → 포락선 피크로 포먼트
  function formants(x) {
    const y = new Float64Array(N);
    for (let i = 0; i < N; i++) y[i] = (x[i] - 0.97 * (i ? x[i - 1] : 0)) * HAMM[i];
    const r = new Float64Array(ORDER + 1);
    for (let k = 0; k <= ORDER; k++) { let s = 0; for (let i = k; i < N; i++) s += y[i] * y[i - k]; r[k] = s; }
    if (r[0] <= 0) return null;
    r[0] *= 1.0001; // 약한 정규화
    const a = new Float64Array(ORDER + 1); a[0] = 1; let e = r[0];
    for (let i = 1; i <= ORDER; i++) {
      let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
      const k = -acc / e; const prev = a.slice();
      for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
      a[i] = k; e *= 1 - k * k; if (e <= 0) return null;
    }
    const step = 10, fmin = 150, fmax = 4600, env = [];
    for (let f = fmin; f <= fmax; f += step) {
      const w = 2 * Math.PI * f / SR; let re = 0, im = 0;
      for (let j = 0; j <= ORDER; j++) { re += a[j] * Math.cos(w * j); im -= a[j] * Math.sin(w * j); }
      env.push(-10 * Math.log10(re * re + im * im + 1e-12));
    }
    const peaks = [], span = Math.round(500 / step);
    for (let i = 1; i < env.length - 1; i++) if (env[i] > env[i - 1] && env[i] >= env[i + 1]) {
      // 돌출도: 양옆으로 더 높은 지점(또는 500 Hz)까지의 최저점 중 높은 쪽과의 차이
      let lm = env[i], rm = env[i];
      for (let j = i - 1; j >= Math.max(0, i - span) && env[j] <= env[i]; j--) lm = Math.min(lm, env[j]);
      for (let j = i + 1; j <= Math.min(env.length - 1, i + span) && env[j] <= env[i]; j++) rm = Math.min(rm, env[j]);
      if (env[i] - Math.max(lm, rm) < 1.0) continue;
      const p = env[i - 1], q = env[i], s = env[i + 1], d = p - 2 * q + s, off = d ? 0.5 * (p - s) / d : 0;
      peaks.push(fmin + (i + off) * step);
    }
    const F1 = peaks.find(f => f >= 250 && f <= 1300);
    const F2 = F1 && peaks.find(f => f > F1 + 150 && f >= 700 && f <= 2900);
    const F3 = F2 && peaks.find(f => f > F2 + 200 && f >= 1700 && f <= 4000);
    if (!F1 || !F2 || !F3) return null;
    return [F1, F2, F3];
  }

  function analyze(x) {
    let e = 0; for (let i = 0; i < N; i++) e += x[i] * x[i];
    const db = 10 * Math.log10(e / N + 1e-12);
    const out = { db, f0: 0, clarity: 0, h1h2: NaN, h1h2raw: NaN, cpp: NaN, F: null, res: NaN, bright: NaN };
    if (db < -65) return out;
    const p = pitch(x); out.f0 = p.f0; out.clarity = p.clarity;
    if (!p.f0) return out;
    const re = new Float32Array(NFFT), im = new Float32Array(NFFT);
    for (let i = 0; i < N; i++) re[i] = x[i] * HANN[i];
    fft(re, im);
    const mag = new Float32Array(NFFT / 2);
    for (let k = 0; k < NFFT / 2; k++) mag[k] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-12);
    const df = SR / NFFT;
    // CPP(켑스트럼 피크 돌출도): 숨이 섞일수록 배음 줄무늬가 흐려져 값이 낮아짐
    {
      const cr = new Float32Array(NFFT), ci = new Float32Array(NFFT);
      for (let k = 0; k < NFFT / 2; k++) { cr[k] = mag[k]; cr[NFFT - 1 - k] = mag[k]; }
      fft(cr, ci);
      const ce = n => cr[n] / NFFT, lo = 16, hi = 300;
      let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
      for (let n = lo; n <= hi; n++) { const y = ce(n); sx += n; sy += y; sxx += n * n; sxy += n * y; m++; }
      const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx), icpt = (sy - slope * sx) / m;
      const T0 = SR / p.f0, a = Math.max(lo, Math.floor(T0 * 0.9)), b = Math.min(hi, Math.ceil(T0 * 1.1));
      let pk = -1e9, at = a; for (let n = a; n <= b; n++) { const y = ce(n); if (y > pk) { pk = y; at = n; } }
      out.cpp = pk - (slope * at + icpt);
    }
    out.h1h2 = out.h1h2raw = harmonicDb(mag, p.f0, df) - harmonicDb(mag, 2 * p.f0, df);
    // 밝기: 배음 크기로 1.5~5 kHz 대 0~1.5 kHz 에너지 비(dB). 음이 높아 포먼트 추정이 흔들릴 때도 쓸 수 있음
    {
      let lo = 0, hi = 0;
      for (let k = 1; k * p.f0 <= 5000; k++) { const f = k * p.f0, a = Math.pow(10, harmonicDb(mag, f, df) / 10); if (f < 1500) lo += a; else hi += a; }
      if (lo > 0 && hi > 0) out.bright = 10 * Math.log10(hi / lo);
    }
    const F = formants(x);
    if (F) {
      out.F = F; out.res = Math.cbrt(F[0] * F[1] * F[2]);
      // 포먼트 보정(H1*-H2*): 성도 공명이 H1·H2를 키운 만큼 빼서 성대 자체의 차이만 남김
      const T = f => F.reduce((s, Fi, i) => { const b = (80 + 30 * i) / 2; return s + 20 * Math.log10((Fi * Fi + b * b) / Math.sqrt(((f - Fi) ** 2 + b * b) * ((f + Fi) ** 2 + b * b))); }, 0);
      const corr = T(p.f0) - T(2 * p.f0);
      // 음이 높으면(250 Hz~) 포먼트 추정이 배음에 붙어 보정이 틀어지므로 낮은 음에서만 적용
      const w = Math.max(0, Math.min(1, (260 - p.f0) / 40)); // 220 Hz 아래 완전 보정, 260 Hz 위 보정 없음 (사이는 서서히)
      if (w > 0 && F[0] > 1.6 * p.f0 && isFinite(corr) && Math.abs(corr) < 25) out.h1h2 -= w * corr;
    }
    return out;
  }

  // 임의 샘플레이트 스트림 → 16 kHz 링버퍼 (선형 보간)
  class Stream16k {
    constructor(rate) { this.step = rate / SR; this.pos = 0; this.prev = 0; this.buf = new Float32Array(SR * 2); this.w = 0; this.total = 0; }
    push(chunk) {
      let p = this.pos;
      while (p < chunk.length) {
        const i = Math.floor(p), f = p - i, a = i === 0 ? this.prev : chunk[i - 1], b = chunk[i];
        // p는 chunk 기준 위치(이전 마지막 샘플 = -1 위치를 prev로 취급)
        const v = i === 0 ? this.prev + (chunk[0] - this.prev) * f : a + (b - a) * f;
        this.buf[this.w] = v; this.w = (this.w + 1) % this.buf.length; this.total++;
        p += this.step;
      }
      this.pos = p - chunk.length; this.prev = chunk[chunk.length - 1];
    }
    last(n) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = this.buf[(this.w - n + i + this.buf.length * 2) % this.buf.length]; return o; }
  }

  const hz2midi = hz => 12 * Math.log2(hz / 440) + 69;
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = hz => { const m = Math.round(hz2midi(hz)); return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); };

  return { SR, N, analyze, Stream16k, note, hz2midi };
})();
if (typeof module !== 'undefined') module.exports = VF;
