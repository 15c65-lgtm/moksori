// 모든 페이지 공통: 오류 자동 기록, 「이상해요」 알리기, 내 사용 기록 (모두 이 기기에만 저장, 어디에도 보내지 않음)
// 페이지에서 지금 상태를 알려 주려면: Diag.set('울림', '920 / 1400 Hz')
(() => {
  const PAGE = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const NAMES = { index: '첫 화면', mimic: '성대모사', yeomok: '여목 연습', range: '음역대', script: '대본 연습', collection: '내 모음집', challenge: '챌린지', exam: '공채 대비', sing: '노래 연습', pronounce: '발음 연습', routine: '오늘의 루틴' };
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const state = {};
  window.Diag = { set: (k, v) => { state[k] = v; }, page: PAGE, names: NAMES };

  // ---- 오류 기록 ----
  const logErr = (msg, where) => { const E = get('moksori.errors', []); E.push({ at: Date.now(), page: PAGE, msg: String(msg).slice(0, 300), where: String(where || '').slice(0, 120) }); put('moksori.errors', E.slice(-50)); };
  addEventListener('error', e => { if (e.message) logErr(e.message, `${(e.filename || '').split('/').pop()}:${e.lineno || ''}`); });
  addEventListener('unhandledrejection', e => logErr(e.reason && (e.reason.message || e.reason), 'promise'));

  // ---- 사용 기록 (페이지 열기 횟수와 실제로 화면을 본 시간) ----
  const U = get('moksori.usage', {}), u = U[PAGE] = U[PAGE] || { n: 0, sec: 0, last: 0, days: {} };
  u.n++; u.last = Date.now(); u.days[day()] = (u.days[day()] || 0) + 1; const ks = Object.keys(u.days).sort(); while (ks.length > 60) delete u.days[ks.shift()];
  put('moksori.usage', U);
  let seen = Date.now();
  const flush = () => { if (document.hidden) return; const now = Date.now(), d = Math.min(600, (now - seen) / 1000); seen = now; const V = get('moksori.usage', {}); if (V[PAGE]) { V[PAGE].sec = Math.round((V[PAGE].sec || 0) + d); put('moksori.usage', V); } };
  setInterval(flush, 15000); addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) { const now = Date.now(), d = Math.min(600, (now - seen) / 1000); const V = get('moksori.usage', {}); if (V[PAGE]) { V[PAGE].sec = Math.round((V[PAGE].sec || 0) + d); put('moksori.usage', V); } } else seen = Date.now(); });

  // ---- 이상해요 버튼 ----
  const css = `.rp-btn{position:fixed;right:14px;bottom:14px;z-index:50;font-size:12.5px;padding:6px 11px;border-radius:999px;opacity:.75;box-shadow:0 2px 8px rgba(0,0,0,.12)}.rp-btn:hover{opacity:1}
  .rp-box{position:fixed;right:14px;bottom:56px;z-index:51;width:min(420px,calc(100vw - 28px));max-height:min(78vh,640px);overflow:auto;background:var(--panel,#fff);color:var(--ink,#111);border:1px solid var(--line,#ddd);border-radius:12px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);display:grid;gap:10px;font-size:14px}
  .rp-box[hidden]{display:none}.rp-box textarea{width:100%;font:inherit;font-size:14px;color:inherit;background:var(--bg,#fff);border:1px solid var(--line,#ddd);border-radius:8px;padding:8px 10px;resize:vertical}
  .rp-box pre{white-space:pre-wrap;font-size:12px;background:color-mix(in srgb,var(--ink,#000) 4%,transparent);border-radius:8px;padding:8px;margin:0;max-height:160px;overflow:auto}.rp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rp-box h3{margin:0;font-size:16px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rp-btn'; btn.textContent = '이상해요'; btn.title = '이상한 점을 기록해서 Claude에게 보낼 수 있어요';
  const box = document.createElement('div'); box.className = 'rp-box'; box.hidden = true;
  box.innerHTML = `<h3>무엇이 이상했나요?</h3>
    <div class="rp-row" id="rpQuick"></div>
    <textarea id="rpText" rows="3" placeholder="예: 「아~」를 길게 냈는데 울림 막대가 계속 남자 칸에 있어요"></textarea>
    <label class="rp-row" style="gap:6px"><input type="checkbox" id="rpUsage" checked> 내 사용 기록도 같이 (어떤 도구를 얼마나 쓰는지)</label>
    <div class="rp-row"><button type="button" class="primary-sm" id="rpCopy">내용 복사하기</button><button type="button" id="rpFile">파일로 저장</button><button type="button" id="rpClose">닫기</button></div>
    <div class="cap" id="rpMsg" style="margin:0">복사한 내용을 Claude와의 대화에 그대로 붙여 넣으면 돼요. 녹음 소리는 들어가지 않아요.</div>
    <details><summary>같이 보내는 내용 보기</summary><pre id="rpPre"></pre></details>`;
  const QUICK = ['숫자가 이상해요', '버튼이 안 돼요', '소리가 안 나요/녹음이 안 돼요', '화면이 깨져요', '느려요', '쓰는 법을 모르겠어요'];
  document.addEventListener('DOMContentLoaded', () => { document.body.appendChild(btn); document.body.appendChild(box); box.querySelector('#rpQuick').innerHTML = QUICK.map(q => `<button type="button" class="sc-tag" data-q="${q}">${q}</button>`).join(''); wire(); });
  const usageText = () => { const V = get('moksori.usage', {}); return Object.entries(V).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${NAMES[k] || k}: ${v.n}번 열기, ${Math.round((v.sec || 0) / 60)}분, 마지막 ${new Date(v.last).toLocaleDateString()}`).join('\n'); };
  function compose() {
    const E = get('moksori.errors', []).filter(e => Date.now() - e.at < 7 * 864e5).slice(-8);
    const ua = navigator.userAgent, dev = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '기타';
    const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : '기타';
    const lines = [`[목소리 연습실 문제 알림]`, `페이지: ${NAMES[PAGE] || PAGE} (${location.pathname.split('/').pop() || 'index.html'})`, `때: ${new Date().toLocaleString()}`, `기기: ${dev} · ${br} · 화면 ${innerWidth}×${innerHeight}`, `내용: ${box.querySelector('#rpText').value.trim() || '(안 적음)'}`];
    const s = Object.entries(state); if (s.length) lines.push('지금 상태:', ...s.map(([k, v]) => `  ${k}: ${v}`));
    if (E.length) lines.push('최근 오류:', ...E.map(e => `  ${new Date(e.at).toLocaleString()} [${NAMES[e.page] || e.page}] ${e.msg} (${e.where})`)); else lines.push('최근 오류: 없음');
    if (box.querySelector('#rpUsage').checked) lines.push('사용 기록:', ...usageText().split('\n').map(l => '  ' + l));
    return lines.join('\n');
  }
  function wire() {
    const pre = box.querySelector('#rpPre'), upd = () => { pre.textContent = compose(); };
    btn.addEventListener('click', () => { box.hidden = !box.hidden; if (!box.hidden) { upd(); box.querySelector('#rpText').focus(); } });
    box.querySelector('#rpClose').addEventListener('click', () => { box.hidden = true; });
    box.querySelector('#rpQuick').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; const t = box.querySelector('#rpText'); t.value = (t.value ? t.value + ' / ' : '') + b.dataset.q; upd(); t.focus(); });
    box.querySelector('#rpText').addEventListener('input', upd); box.querySelector('#rpUsage').addEventListener('change', upd);
    const save = () => { const R = get('moksori.reports', []); R.push({ at: Date.now(), page: PAGE, text: compose() }); put('moksori.reports', R.slice(-30)); };
    box.querySelector('#rpCopy').addEventListener('click', async () => { const t = compose(); save(); try { await navigator.clipboard.writeText(t); box.querySelector('#rpMsg').textContent = '복사했어요. Claude와의 대화에 붙여 넣어 주세요.'; } catch (_) { pre.parentElement.open = true; box.querySelector('#rpMsg').textContent = '복사가 막혔어요. 아래 내용을 길게 눌러 직접 복사해 주세요.'; } });
    box.querySelector('#rpFile').addEventListener('click', () => { const t = compose(); save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = `목소리연습실-문제-${day()}.txt`; document.body.appendChild(a); a.click(); a.remove(); box.querySelector('#rpMsg').textContent = '파일로 저장했어요. Claude와의 대화에 첨부해 주세요.'; });
  }
})();
