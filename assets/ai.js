// AI 목소리 닮음: WavLM 화자 인증 모델(브라우저 안에서 실행)
window.VoiceAI = (() => {
  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
  const MODEL = 'Xenova/wavlm-base-plus-sv';
  let loading = null, proc = null, model = null;
  const files = {};

  async function load(onProgress) {
    if (model) return;
    if (!loading) loading = (async () => {
      const T = await import(LIB);
      T.env.allowLocalModels = false;
      const cb = p => {
        if (p.status === 'progress' && p.total) {
          files[p.file] = [p.loaded, p.total];
          let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; }
          onProgress && onProgress(a, b);
        }
      };
      proc = await T.AutoProcessor.from_pretrained(MODEL, { progress_callback: cb });
      try { model = await T.AutoModel.from_pretrained(MODEL, { dtype: 'q8', progress_callback: cb }); }
      catch (e) { model = await T.AutoModel.from_pretrained(MODEL, { dtype: 'fp32', progress_callback: cb }); }
    })();
    try { await loading; } catch (e) { loading = null; throw e; }
  }

  // 16 kHz 모노 Float32Array → 정규화된 화자 임베딩
  async function embed(x) {
    const inputs = await proc(x);
    const { embeddings } = await model(inputs);
    const v = embeddings.data; let n = 0;
    for (let i = 0; i < v.length; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    return Float32Array.from(v, a => a / n);
  }
  const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  // 코사인 유사도 → 0~100 (같은 화자 ≈ 0.93 이상, 다른 화자 ≈ 0.6 안팎)
  const score = c => Math.max(0, Math.min(100, (c - 0.55) / (0.93 - 0.55) * 100));
  const label = v => v >= 85 ? '같은 사람처럼 들려요' : v >= 65 ? '꽤 비슷한 목소리예요' : v >= 40 ? '닮은 구석이 있어요' : '다른 사람 목소리로 들려요';

  return { load, embed, cos, score, label, ready: () => !!model };
})();
