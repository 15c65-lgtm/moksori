// 게임: 친구랑 각자 폰으로 (방)
// 방장 폰이 게임 상태(S)를 쥐고 모두에게 보내요. 다른 폰은 할 일(act)만 방장에게 보내요.
// 녹음은 μ-law로 줄여서 방 안 친구들에게만 보내고, 서버에는 남지 않아요.
(() => {
const $ = id => document.getElementById(id);
const { esc, play, stopPlay } = GM, UI = window.GameUI;
const SB_URL = 'https://zvbxjaapuppzmoanqhsq.supabase.co', SB_KEY = 'sb_publishable_gJ1HABK7qwWqGk_KQ0uzXQ_kaINRuwO';
const qs = new URLSearchParams(location.search);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = window.GameT = window.GameT || {};

const MODES = {
  battle: { t: '흉내 배틀', d: '돌아가며 한 명이 문제를 내고, 나머지가 각자 폰으로 흉내 내요. 닮음 점수 + 출제자 보너스 + 투표.', min: 2 },
  surv: { t: '동시 서바이벌', d: '모두 같은 가락을 듣고 동시에 따라 불러요. 통과 점수보다 낮으면 목숨 -1, 마지막까지 남으면 우승.', min: 1 },
  fly: { t: '비행기 레이스', d: '모두 같은 하늘(같은 벽)을 날아요. 친구 비행기가 반투명으로 보여요. 오래 버티는 사람이 이겨요.', min: 1 },
  who: { t: '누구 목소리?', d: '모두 같은 문장을 목소리를 바꿔 녹음해요. 순서를 섞어 들려주면 누가 누군지 맞혀요. 맞히면 +2, 속이면 한 명당 +1.', min: 3 },
  relay: { t: '고장난 전화기', d: '첫 사람만 비밀 카드를 보고 소리를 내요. 다음 사람은 바로 앞사람 녹음만 듣고 이어 가요. 끝나면 다 같이 처음과 끝을 비교해요.', min: 2 }
};
const PHASE_WAIT = { ask: 1, copy: 1, vote: 1, sing: 1, fly: 1, wrec: 1, wguess: 1, relay: 1 };

let R = null;     // 방: {code, me, host, members, wire, audio, parts, sent, my, key, cleanup}
let S = null;     // 마지막으로 받은 게임 상태

// ---------- 연결 ----------
function loadSb() { return window.supabase ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js'; sc.onload = res; sc.onerror = () => rej(new Error('net')); document.head.appendChild(sc); }); }
async function openWire(code, me, onMsg, onMembers) {
  const name = 'moksori-game-' + code;
  if (qs.get('local')) { // 시험용: 같은 브라우저 탭끼리
    const bc = new BroadcastChannel(name), seen = new Map(); let state = {};
    const beat = () => bc.postMessage({ k: 'p', id: me.id, st: state });
    const emit = () => { const now = Date.now(); for (const [id, v] of seen) if (now - v.t > 4000) seen.delete(id); onMembers([{ ...state, id: me.id }, ...[...seen.values()].map(v => v.st)]); };
    bc.onmessage = e => { const d = e.data; if (d.k === 'p') { const old = seen.get(d.id); seen.set(d.id, { t: Date.now(), st: { ...d.st, id: d.id } }); if (!old || JSON.stringify(old.st) !== JSON.stringify(seen.get(d.id).st)) emit(); } else if (d.k === 'bye') { seen.delete(d.id); emit(); } else if (d.k === 'm') onMsg(d.m); };
    const iv = setInterval(() => { beat(); emit(); }, 1000);
    return { send: async m => bc.postMessage({ k: 'm', m }), track: async st => { state = st; beat(); emit(); }, close: () => { clearInterval(iv); bc.postMessage({ k: 'bye', id: me.id }); bc.close(); } };
  }
  await loadSb();
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, storageKey: 'moksori.game.room' } });
  const ch = sb.channel(name, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
  ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(); onMembers(Object.keys(st).map(k => ({ ...st[k][0], id: k }))); });
  await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout')), 10000); ch.subscribe(s => { if (s === 'SUBSCRIBED') { clearTimeout(to); res(); } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(to); rej(new Error(s)); } }); });
  return { send: m => ch.send({ type: 'broadcast', event: 'm', payload: m }), track: st => ch.track(st), close: () => { try { ch.untrack(); sb.removeChannel(ch); } catch (_) {} } };
}
const send = m => { if (R) { m.from = R.me.id; return R.wire.send(m); } };
const isHost = () => R && R.host === R.me.id;
const present = () => new Set(R.members.map(m => m.id));
const nameOf = id => (S && S.names && S.names[id]) || (R && (R.members.find(m => m.id === id) || {}).name) || '친구';
const onMsgEl = h => { $('onMsg').innerHTML = h; };

try { $('onNick').value = localStorage.getItem('moksori.nick') || ''; } catch (_) {}
if (qs.get('room')) { $('onCode').value = qs.get('room').toUpperCase().slice(0, 6); $('onOutMsg').textContent = '초대받은 방이에요. 이름을 적고 「들어가기」를 누르세요.'; setTimeout(() => $('onBox').scrollIntoView({ block: 'start' }), 300); }

async function enter(code, create) {
  const nick = $('onNick').value.trim(); if (!nick) { $('onNick').focus(); $('onNick').placeholder = '이름을 먼저 적어 주세요'; return; }
  try { localStorage.setItem('moksori.nick', nick); } catch (_) {}
  GM.ctx(); // 소리 재생 허용 (버튼을 누른 지금)
  $('onCreate').disabled = $('onJoin').disabled = true; $('onOutMsg').textContent = '연결하는 중…';
  const me = { id: Math.random().toString(36).slice(2, 10), name: nick, at: Date.now() };
  R = { code, me, host: create ? me.id : null, members: [], wire: null, audio: new Map(), parts: new Map(), sent: new Map(), my: {}, key: '', cleanup: null, server: null, hostSeen: null };
  S = create ? { v: 1, mode: null, phase: 'lobby', round: 0, players: [], names: {}, score: {}, opts: {} } : null;
  try { R.wire = await openWire(code, me, onMsg, onMembers); R.server = true; }
  catch (e) { R = null; S = null; $('onCreate').disabled = $('onJoin').disabled = false; $('onOutMsg').innerHTML = '<span class="err">방에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 해 보세요. (학교·회사 와이파이는 막혀 있을 수 있어요)</span>'; if (window.Diag) Diag.set('게임 방', '서버 연결 실패: ' + (e && e.message)); return; }
  $('onOut').hidden = true; $('onIn').hidden = false; $('onCodeTxt').textContent = code;
  try { history.replaceState(null, '', location.pathname + '?room=' + code + (qs.get('local') ? '&local=1' : '')); } catch (_) {}
  await trackMe();
  if (!create) {
    send({ t: 'hello' }); onMsgEl('방장에게 게임 상태를 받는 중…');
    const c0 = R; setTimeout(() => { if (R === c0 && !S) { if (R.members.length < 2) onMsgEl('<span class="err">이 방에 아무도 없어요. 방 코드를 다시 확인해 주세요.</span>'); else send({ t: 'hello' }); } }, 5000);
  } else onMsgEl('친구에게 방 코드나 초대 링크를 보내 주세요. 다 모이면 게임을 고르고 ▶ 시작!');
  render();
}
$('onCreate').addEventListener('click', () => { const c = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join(''); enter(c, true); });
$('onJoin').addEventListener('click', () => { const c = $('onCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 4) { $('onCode').focus(); return; } enter(c, false); });
$('onCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('onJoin').click(); });
const trackMe = () => R.wire.track({ name: R.me.name, at: R.me.at, host: R.host === R.me.id });
function leave(msg) {
  if (!R) return; cleanupStage(); GM.stopRec(); stopPlay();
  try { R.wire.close(); } catch (_) {}
  R = null; S = null; $('onIn').hidden = true; $('onOut').hidden = false; $('onCreate').disabled = $('onJoin').disabled = false; $('onOutMsg').textContent = msg || '';
  try { history.replaceState(null, '', location.pathname + (qs.get('local') ? '?local=1' : '')); } catch (_) {}
}
$('onLeave').addEventListener('click', () => leave('방에서 나왔어요.'));
window.addEventListener('pagehide', () => { if (R) try { R.wire.close(); } catch (_) {} });
$('onCopy').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '?room=' + R.code + (qs.get('local') ? '&local=1' : '');
  try { await navigator.clipboard.writeText(url); onMsgEl('초대 링크를 복사했어요. 카톡 같은 데 붙여 넣어 보내세요.'); } catch (_) { onMsgEl('링크: ' + esc(url)); }
});

function onMembers(list) {
  if (!R) return;
  const ids = new Set(list.map(m => m.id));
  R.members = list.sort((a, b) => a.at - b.at);
  const flagged = R.members.find(m => m.host && m.id !== R.me.id);
  if (flagged && R.host !== R.me.id) R.host = flagged.id;
  if (R.host && ids.has(R.host)) R.hostSeen = R.host;
  else if (R.host && R.hostSeen === R.host && !ids.has(R.host) && R.members.length) { // 방장이 나감 → 가장 먼저 들어온 사람이 이어받기
    R.host = R.members[0].id;
    if (isHost()) { onMsgEl('방장이 나가서 내가 방장이 됐어요.'); if (!S) S = { v: 1, mode: null, phase: 'lobby', round: 0, players: [], names: {}, score: {}, opts: {} }; trackMe(); }
  }
  if (isHost()) {
    for (const m of R.members) S.names[m.id] = m.name;
    const sig = R.members.map(m => m.id + m.name).join(','), ph = S.phase + (S.g ? S.g.k : '');
    hostAdvance();
    if (sig !== R.memSig || ph !== S.phase + (S.g ? S.g.k : '')) { R.memSig = sig; commit(); return; }
  }
  render();
}

// ---------- 메시지 ----------
function onMsg(m) {
  if (!R || m.from === R.me.id) return;
  if (m.t === 'hello') { if (isHost()) commit(); }
  else if (m.t === 'st') {
    if (isHost() && m.from !== R.host) return;
    if (m.from !== R.host) { if (R.host && present().has(R.host)) return; R.host = m.from; }
    if (S && m.st.v < S.v && S.gid === m.st.gid) return;
    S = m.st; render();
  }
  else if (m.t === 'act') { if (isHost()) { hostAct(m.from, m.a); } }
  else if (m.t === 'aud') onAud(m);
  else if (m.t === 'need') { const s = R.sent.get(m.tag); if (s) sendAudio(m.tag, s, true); }
  else if (m.t === 'pos') { if (R.fly && S && S.mode === 'fly') R.fly.ghosts.set(m.from, { name: nameOf(m.from), y: m.y, alive: m.al, score: m.s }); }
}
function commit() { if (!isHost() || !S) return; S.v++; send({ t: 'st', st: S }); render(); }
// 방장도 자기 행동을 똑같이 처리
function act(a) { if (!S) return; a.round = S.round; a.mode = S.mode; if (isHost()) hostAct(R.me.id, a); else send({ t: 'act', a }); }

// ---------- 녹음 주고받기 ----------
async function sendAudio(tag, x, again) {
  if (!again) x = GM.muRound(x); // 모두가 똑같은 소리를 갖도록
  R.audio.set(tag, x); R.sent.set(tag, x); update();
  const str = GM.packAudio(x), CH = 45000, n = Math.ceil(str.length / CH), aid = Math.random().toString(36).slice(2, 8);
  for (let k = 0; k < n; k++) { if (!R) return; await send({ t: 'aud', tag, aid, k, n, d: str.slice(k * CH, (k + 1) * CH) }); await sleep(again ? 120 : 90); }
}
function onAud(m) {
  const key = m.from + ':' + m.aid; let e = R.parts.get(key); if (!e) { e = { n: m.n, got: new Array(m.n), c: 0, tag: m.tag }; R.parts.set(key, e); }
  if (!e.got[m.k]) { e.got[m.k] = m.d; e.c++; }
  if (e.c === e.n) { R.parts.delete(key); if (!R.audio.has(m.tag)) { R.audio.set(m.tag, GM.unpackAudio(e.got.join(''))); update(); if (isHost()) hostAdvance(true); } }
}
const askFor = tag => send({ t: 'need', tag });
T.room = () => ({ R, S });

// =========================================================
// 방장: 게임 진행
// =========================================================
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const newSeed = () => (Math.random() * 4294967295) >>> 0;
function hostStart(mode) {
  const players = R.members.map(m => m.id);
  for (const id of players) { S.names[id] = nameOf(id); if (S.score[id] == null) S.score[id] = 0; }
  const opts = readOpts(mode);
  Object.assign(S, { gid: Math.random().toString(36).slice(2, 7), mode, opts, round: 0, players, g: {} });
  if (mode === 'battle') battleRound();
  else if (mode === 'surv') { S.g = { lives: Object.fromEntries(players.map(id => [id, 3])), L: 1 }; survRound(); }
  else if (mode === 'fly') flyRound();
  else if (mode === 'who') whoRound();
  else if (mode === 'relay') relayRound();
  commit();
}
// 칭호용 기록 (방에 있는 동안)
function stat(id, k, v, max) { S.stats = S.stats || {}; const o = S.stats[id] = S.stats[id] || {}; o[k] = max ? Math.max(o[k] || 0, v) : (o[k] || 0) + v; }
const AWARDS = [['best', '🎤 흉내 장인', '흉내 최고 점수'], ['votes', '❤️ 인기상', '받은 표'], ['ask', '🧩 출제왕', '딱 좋은 문제'], ['fooled', '🎭 변장왕', '속인 사람'], ['right', '🕵️ 명탐정', '맞힌 목소리'], ['star', '⭐ 가락 장인', '판 1등'], ['fly', '✈️ 에이스', '비행 최고'], ['relay', '📞 전달왕', '전화기 최고']];
function awardsHtml() {
  const st = S && S.stats; if (!st) return '';
  const out = [];
  for (const [k, t, d] of AWARDS) { let best = null; for (const id in st) if ((st[id][k] || 0) > 0 && (!best || st[id][k] > st[best][k])) best = id; if (best) out.push(`<span title="${esc(d)} ${st[best][k]}">${t} <b>${esc(nameOf(best))}</b> <small>${esc(d)} ${st[best][k]}</small></span>`); }
  return out.length ? `<div class="gm-awards">${out.join('')}</div>` : '';
}
// 흉내 배틀
function battleRound() {
  const n = S.players.length, max = S.opts.laps ? S.opts.laps * n : 0;
  if (max && S.round >= max) { S.phase = 'final'; return; }
  let asker = S.players[S.round % n], tries = 0;
  while (!present().has(asker) && tries++ < n) { S.round++; asker = S.players[S.round % n]; }
  S.phase = 'ask'; S.g = { asker, takes: {}, votes: {}, res: null };
}
function battleFinish() {
  const sc = {}; for (const id in S.g.takes) sc[id] = S.g.takes[id].score;
  const P = GM.battlePoints(S.g.asker, sc), votesFor = {};
  for (const v in S.g.votes) { const t = S.g.votes[v]; votesFor[t] = (votesFor[t] || 0) + 1; }
  for (const id in votesFor) { P.pts[id] = (P.pts[id] || 0) + votesFor[id] * GM.RULE.vote; P.why[id] = (P.why[id] ? P.why[id] + ' + ' : '') + `투표 ${votesFor[id]}표 ${votesFor[id] * GM.RULE.vote}`; }
  for (const id in P.pts) S.score[id] = (S.score[id] || 0) + P.pts[id];
  for (const id in sc) stat(id, 'best', sc[id], true);
  for (const id in votesFor) stat(id, 'votes', votesFor[id]);
  if (/딱 좋은/.test(P.why[S.g.asker] || '')) stat(S.g.asker, 'ask', 1);
  S.g.res = { pts: P.pts, why: P.why, order: P.order, votesFor }; S.phase = 'res';
}
// 동시 서바이벌
function survRound() { S.phase = 'sing'; S.g.seed = newSeed(); S.g.takes = {}; S.g.note = ''; }
const alive = () => S.players.filter(id => S.g.lives[id] > 0);
function survResolve(force) {
  const al = alive(), need = GM.need(S.g.L), sc = id => S.g.takes[id] != null ? S.g.takes[id] : 0;
  let fails = al.filter(id => sc(id) < need);
  S.g.note = '';
  if (al.length > 1 && fails.length === al.length) { fails = []; S.g.note = '모두 통과 점수에 못 미쳐서 이번 판은 봐줘요! 목숨은 그대로예요.'; }
  for (const id of fails) S.g.lives[id]--;
  for (const id of al) if (!fails.includes(id) && sc(id) >= need) S.score[id] = (S.score[id] || 0) + 1;
  const top = al.slice().sort((a, b) => sc(b) - sc(a))[0];
  if (top && sc(top) > 0) { S.score[top] = (S.score[top] || 0) + 2; S.g.star = top; stat(top, 'star', 1); } else S.g.star = null;
  S.g.fails = fails; S.phase = 'sres';
  const left = alive();
  if ((S.players.length > 1 && left.length <= 1) || left.length === 0) {
    S.g.winner = left.length === 1 ? left[0] : (top || null);
    if (S.g.winner) S.score[S.g.winner] = (S.score[S.g.winner] || 0) + 10;
    S.g.over = true;
  }
}
// 비행기 레이스
function flyRound() { S.phase = 'fly'; S.g = { seed: newSeed(), res: {}, at: Date.now() }; }
function flyFinish() {
  const ids = Object.keys(S.g.res).sort((a, b) => S.g.res[b] - S.g.res[a]), P = [5, 3, 1], pts = {};
  if (ids.length >= 2) ids.forEach(id => { const sc = S.g.res[id]; if (sc <= 0) return; const rank = ids.filter(o => S.g.res[o] > sc).length; if (P[rank]) { pts[id] = P[rank]; S.score[id] = (S.score[id] || 0) + P[rank]; } });
  for (const id of ids) stat(id, 'fly', S.g.res[id], true);
  S.g.order = ids; S.g.pts = pts; S.phase = 'fres';
}
// 누구 목소리?
function whoRound() { S.phase = 'wrec'; S.g = { line: GM.pick(GM.DISGUISE), done: {}, order: [], guesses: {}, res: null }; }
function whoFinish() {
  const right = {}, fooled = {};
  for (const g in S.g.guesses) for (const owner in S.g.guesses[g]) { if (owner === g) continue; if (S.g.guesses[g][owner] === owner) right[g] = (right[g] || 0) + 1; else fooled[owner] = (fooled[owner] || 0) + 1; }
  for (const id in right) S.score[id] = (S.score[id] || 0) + right[id] * 2;
  for (const id in fooled) S.score[id] = (S.score[id] || 0) + fooled[id];
  for (const id in right) stat(id, 'right', right[id]); for (const id in fooled) stat(id, 'fooled', fooled[id]);
  S.g.res = { right, fooled }; S.phase = 'wres';
}
// 고장난 전화기
function relayRound() {
  const ps = S.players.filter(id => present().has(id)), rot = S.round % Math.max(1, ps.length);
  const order = shuffle(ps); if (order.length > 1) order.push(...order.splice(0, rot));
  S.phase = 'relay'; S.g = { order, k: 0, card: GM.pick(GM.CARDS), chain: null };
}
async function relayFinish() {
  const rd = S.round, gid = S.gid, tags = S.g.order.map((_, k) => `r${gid}:${rd}:${k}`);
  for (let w = 0; w < 40 && tags.some(t => !R.audio.has(t)); w++) await sleep(250);
  if (!S || S.round !== rd || S.phase !== 'relay') return;
  const clips = S.g.order.map((id, k) => ({ who: nameOf(id), id, x: R.audio.get(tags[k]) })).filter(c => c.x);
  const ch = UI.relayChain(clips);
  S.g.chain = ch.map(c => ({ id: c.id, prev: c.prev, first: c.first }));
  for (const c of S.g.chain) if (c.prev != null) { S.score[c.id] = (S.score[c.id] || 0) + Math.round(c.prev / 10); stat(c.id, 'relay', c.prev, true); }
  S.phase = 'rres'; commit();
}

// 할 일 받기
function hostAct(from, a) {
  if (!S || a.round !== S.round || a.mode !== S.mode) return;
  const g = S.g;
  if (S.mode === 'battle') {
    if (a.a === 'asked' && S.phase === 'ask' && from === g.asker) { S.phase = 'copy'; }
    else if (a.a === 'take' && S.phase === 'copy' && from !== g.asker) g.takes[from] = { score: a.score, parts: a.parts };
    else if (a.a === 'vote' && S.phase === 'vote' && a.target !== from && g.takes[a.target]) g.votes[from] = a.target;
  } else if (S.mode === 'surv') {
    if (a.a === 'take' && S.phase === 'sing' && g.lives[from] > 0) g.takes[from] = Math.round(a.score);
  } else if (S.mode === 'fly') {
    if (a.a === 'crash' && S.phase === 'fly') g.res[from] = a.score;
  } else if (S.mode === 'who') {
    if (a.a === 'wdone' && S.phase === 'wrec') g.done[from] = true;
    else if (a.a === 'guess' && S.phase === 'wguess') g.guesses[from] = a.g;
  } else if (S.mode === 'relay') {
    if (a.a === 'rdone' && S.phase === 'relay' && g.order[g.k] === from && a.k === g.k) g.k++;
  }
  hostAdvance(); commit();
}
// 기다리는 사람
function pending() {
  if (!S || !S.g) return [];
  const P = present(), g = S.g, ps = S.players.filter(id => P.has(id));
  switch (S.phase) {
    case 'ask': return [g.asker].filter(id => P.has(id));
    case 'copy': return ps.filter(id => id !== g.asker && !g.takes[id]);
    case 'vote': return ps.filter(id => !g.votes[id] && Object.keys(g.takes).some(t => t !== id));
    case 'sing': return ps.filter(id => g.lives[id] > 0 && g.takes[id] == null);
    case 'fly': return ps.filter(id => g.res[id] == null);
    case 'wrec': return ps.filter(id => !g.done[id]);
    case 'wguess': return g.order.filter(id => P.has(id) && !g.guesses[id]);
    case 'relay': return g.k < g.order.length ? [g.order[g.k]] : [];
  }
  return [];
}
function hostAdvance(audioOnly) {
  if (!isHost() || !S || !S.g) return;
  const left = pending(), g = S.g;
  if (S.phase === 'ask' && !left.length) battleRound(); // 문제 낼 사람이 나감
  else if (S.phase === 'copy' && !left.length) { if (S.opts.vote && Object.keys(g.takes).length >= 2) S.phase = 'vote'; else battleFinish(); }
  else if (S.phase === 'vote' && !left.length) battleFinish();
  else if (S.phase === 'sing' && !left.length) survResolve();
  else if (S.phase === 'fly' && !left.length && Object.keys(g.res).length) flyFinish();
  else if (S.phase === 'wrec' && !left.length && Object.keys(g.done).length) { S.g.order = shuffle(Object.keys(g.done)); S.phase = 'wguess'; }
  else if (S.phase === 'wguess' && !left.length) whoFinish();
  else if (S.phase === 'relay') {
    while (g.k < g.order.length && !present().has(g.order[g.k])) g.k++;
    if (g.k >= g.order.length && !R.finishing) { R.finishing = true; relayFinish().finally(() => { if (R) R.finishing = false; }); }
  }
  if (audioOnly) commit();
}
function hostForce() {
  if (!isHost() || !S) return; const g = S.g;
  if (S.phase === 'ask') { S.round++; battleRound(); }
  else if (S.phase === 'copy') { if (S.opts.vote && Object.keys(g.takes).length >= 2) S.phase = 'vote'; else battleFinish(); }
  else if (S.phase === 'vote') battleFinish();
  else if (S.phase === 'sing') survResolve(true);
  else if (S.phase === 'fly') { for (const id of pending()) { const gh = R.fly && R.fly.ghosts.get(id); g.res[id] = gh ? gh.score : 0; } flyFinish(); }
  else if (S.phase === 'wrec') { if (Object.keys(g.done).length >= 2) { g.order = shuffle(Object.keys(g.done)); S.phase = 'wguess'; } else { onMsgEl('녹음한 사람이 2명은 있어야 맞히기를 할 수 있어요.'); return; } }
  else if (S.phase === 'wguess') whoFinish();
  else if (S.phase === 'relay') { g.k++; hostAdvance(); }
  commit();
}
function hostNext() {
  if (!isHost() || !S) return;
  S.round++;
  if (S.mode === 'battle') battleRound();
  else if (S.mode === 'surv') { if (S.g.over) { S.phase = 'final'; } else { S.g.L++; survRound(); } }
  else if (S.mode === 'fly') flyRound();
  else if (S.mode === 'who') whoRound();
  else if (S.mode === 'relay') relayRound();
  commit();
}
$('onForce').addEventListener('click', hostForce);
$('onLobby').addEventListener('click', () => { if (!isHost()) return; S.mode = null; S.phase = 'lobby'; S.g = {}; commit(); });

// ---------- 방장 고르기 화면 ----------
let pickMode = 'battle';
function readOpts(mode) {
  const o = {}; const v = id => $(id) ? $(id).value : null, c = id => $(id) ? $(id).checked : false;
  if (mode === 'battle') { o.vote = c('oVote'); o.laps = +(v('oLaps') || 1); o.listens = +(v('oListens') || 0); }
  return o;
}
function hostPanel() {
  const show = isHost();
  $('onHost').hidden = !show; if (!show) return;
  const playing = S && S.mode && S.phase !== 'final' && S.phase !== 'lobby';
  const msig = pickMode + ':' + playing;
  if (R.modeSig !== msig) { R.modeSig = msig;
    $('onModes').innerHTML = Object.entries(MODES).map(([k, m]) => `<button type="button" class="sc-tag${k === pickMode ? ' on' : ''}" data-m="${k}"${playing ? ' disabled' : ''}>${m.t}</button>`).join('');
    $('onModes').querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { pickMode = b.dataset.m; hostPanel(); })); }
  const M = MODES[pickMode], n = R.members.length;
  let o = `<p class="cap" style="margin:0;flex-basis:100%">${esc(M.d)}${n < M.min ? ` <span class="err">${M.min}명 이상이 필요해요 (지금 ${n}명).</span>` : ''}</p>`;
  if (pickMode === 'battle') o += `<label class="gm-check"><input type="checkbox" id="oVote" checked> 투표 (한 표 +3)</label><label>판 수 <select id="oLaps"><option value="1">한 바퀴</option><option value="2" selected>두 바퀴</option><option value="0">끝없이</option></select></label><label>문제 듣기 <select id="oListens"><option value="0">마음대로</option><option value="2">2번까지</option><option value="1">딱 1번</option></select></label>`;
  const osig = pickMode + ':' + n + ':' + playing;
  if (!playing && R.optSig !== osig) { const keep = $('oLaps') ? readOpts('battle') : null; $('onOpts').innerHTML = o; R.optSig = osig; if (keep && $('oLaps')) { $('oVote').checked = keep.vote; $('oLaps').value = String(keep.laps); $('oListens').value = String(keep.listens); } }
  if (playing) R.optSig = '';
  $('onOpts').hidden = playing;
  $('onStart').hidden = playing; $('onStart').disabled = n < M.min;
  $('onStart').textContent = S && S.phase === 'final' ? '▶ 새 게임 시작' : '▶ 시작';
  $('onForce').hidden = !(playing && PHASE_WAIT[S.phase]); $('onLobby').hidden = !playing;
}
$('onStart').addEventListener('click', () => { if (isHost()) { GM.ctx(); hostStart(pickMode); } });

// =========================================================
// 화면 그리기 (모두)
// =========================================================
function render() {
  if (!R) return;
  // 사람 칩: 이름, 방장, 점수, 지금 할 일을 했는지
  const wait = new Set(pending()), board = S ? S.score : {};
  const ranked = R.members.slice().sort((a, b) => (board[b.id] || 0) - (board[a.id] || 0));
  const top = ranked.length && board[ranked[0].id] ? board[ranked[0].id] : null;
  $('onMem').innerHTML = R.members.map(m => {
    const me = m.id === R.me.id, inGame = S && S.players && S.players.includes(m.id), w = S && PHASE_WAIT[S.phase] && inGame;
    const life = S && S.mode === 'surv' && S.g && S.g.lives ? ` ${'♥'.repeat(Math.max(0, S.g.lives[m.id] || 0))}` : '';
    return `<span class="rm-p${me ? ' me' : ''}"><b>${esc(m.name)}${me ? ' (나)' : ''}${m.id === R.host ? ' 👑' : ''}${top != null && board[m.id] === top ? ' 🥇' : ''}</b><span>${board[m.id] || 0}점${life}</span>${w ? `<i class="${wait.has(m.id) ? '' : 'ok'}">${wait.has(m.id) ? '하는 중…' : '✓ 완료'}</i>` : S && S.mode && !inGame && S.phase !== 'lobby' && S.phase !== 'final' ? '<i>다음 게임부터</i>' : ''}</span>`;
  }).join('');
  hostPanel();
  const key = S ? `${S.gid || ''}:${S.mode}:${S.phase}:${S.round}:${S.mode === 'relay' && S.g ? S.g.k : ''}` : 'none';
  if (key !== R.key) { R.key = key; build(); }
  update(); diag();
}
function cleanupStage() { if (R && R.cleanup) { try { R.cleanup(); } catch (_) {} R.cleanup = null; } }
const my = () => { const k = `${S.gid}:${S.round}`; return R.my[k] || (R.my[k] = {}); };
const stage = h => { $('onStage').innerHTML = h; };
const head = (t, sub) => `<div class="gm-st-h"><b>${esc(t)}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
const tagB = (id) => `b${S.gid}:${S.round}:${id}`;
function build() {
  cleanupStage(); GM.stopRec();
  if (!S) { stage('<p class="cap">방장에게 게임 상태를 받는 중…</p>'); return; }
  const M = MODES[S.mode] || {}, rd = `${S.round + 1}판`;
  if (!S.mode || S.phase === 'lobby') { stage(head('대기실') + `<p class="cap">${isHost() ? '위에서 게임을 고르고 ▶ 시작을 누르세요.' : '방장이 게임을 고르는 중이에요. 기다려 주세요.'} 지금 <b id="gCount2">${R.members.length}</b>명.</p>` + boardHtml()); return; }
  if (S.phase === 'final') { stage(head(`${M.t} 끝!`) + finalHtml() + boardHtml()); return; }
  onMsgEl('');
  const fn = { ask: bAsk, copy: bCopy, vote: bVote, res: bRes, sing: sSing, sres: sRes, fly: fFly, fres: fRes, wrec: wRec, wguess: wGuess, wres: wRes, relay: rRelay, rres: rRes }[S.phase];
  if (fn) fn(head(M.t, S.mode === 'surv' ? `${S.g.L}판 · 통과 ${GM.need(S.g.L)}점` : rd));
}
function update() {
  if (R && $('gCount2')) $('gCount2').textContent = R.members.length;
  if (!R || !S || !S.g) return;
  const u = { copy: uCopy, vote: uVote, ask: uAsk, wguess: uGuess, relay: uRelay, sing: uWait, wrec: uWait, fly: uWait }[S.phase];
  if (u) u();
}
function boardHtml() {
  if (!S || !S.score) return '';
  const ids = Object.keys(S.score).filter(id => S.names[id]).sort((a, b) => S.score[b] - S.score[a]);
  if (!ids.length) return '';
  return `<h3 class="gm-h3">방 점수 (오늘 모인 동안)</h3><ol class="gm-rank board">${ids.map(id => `<li><b>${esc(nameOf(id))}</b> <span class="gm-sc">${S.score[id]}점</span></li>`).join('')}</ol>` + awardsHtml();
}
function finalHtml() {
  const ids = Object.keys(S.score).filter(id => S.players.includes(id)).sort((a, b) => S.score[b] - S.score[a]);
  const w = S.mode === 'surv' && S.g.winner ? S.g.winner : ids[0];
  return w ? `<div class="gm-win">🏆 <b>${esc(nameOf(w))}</b> 님 우승!</div>` : '';
}
const waitList = () => { const p = pending(); return p.length ? `기다리는 중: ${p.map(id => esc(nameOf(id))).join(', ')}` : ''; };
function uWait() { const el = $('gWait'); if (el) el.innerHTML = waitList(); }
const nextBtn = (label = '다음 판 ▶') => isHost() ? `<div class="sc-ctl"><button type="button" class="primary-sm" id="gNext">${label}</button></div>` : '<p class="cap">방장이 다음 판을 시작하면 바로 넘어가요.</p>';
const bindNext = () => { const b = $('gNext'); if (b) b.addEventListener('click', hostNext); };
const playBtn = (tag, label) => `<button type="button" data-tag="${esc(tag)}">${label}</button>`;
function bindPlays(root) { (root || $('onStage')).querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => { const x = R.audio.get(b.dataset.tag); if (x) play(x); else { askFor(b.dataset.tag); onMsgEl('그 녹음을 아직 못 받았어요. 다시 보내 달라고 했어요.'); } })); }
// 녹음 → 미리 듣기 → 보내기 공통
function recBlock(id, label, maxSec) { return `<div class="sc-ctl"><button type="button" class="rec" id="${id}Rec">${label}</button><button type="button" id="${id}Play" hidden>▶ 들어 보기</button><button type="button" class="primary-sm" id="${id}Send" hidden>이걸로 보내기</button></div><p class="gm-msg" id="${id}Msg"></p>`; }
function bindRec(id, label, maxSec, onGot, onSend) {
  let x = null;
  $(id + 'Rec').addEventListener('click', async () => {
    const y = await UI.recBtn($(id + 'Rec'), $(id + 'Msg'), label, { maxSec }); if (!y) return;
    x = y; $(id + 'Play').hidden = false; $(id + 'Send').hidden = false; $(id + 'Rec').textContent = '● 다시 녹음';
    const extra = onGot ? onGot(x) : ''; $(id + 'Msg').innerHTML = extra || `녹음했어요 (${(x.length / SR).toFixed(1)}초). 들어 보고 괜찮으면 보내요.`;
  });
  $(id + 'Play').addEventListener('click', () => x && play(x));
  $(id + 'Send').addEventListener('click', () => { if (!x) return; $(id + 'Rec').hidden = $(id + 'Send').hidden = true; $(id + 'Msg').innerHTML = '보냈어요! 다른 사람을 기다려요.'; onSend(x); });
}

// ---------- 흉내 배틀 ----------
function bAsk(h) {
  const me = S.g.asker === R.me.id;
  if (!me) { stage(h + `<div class="gm-turn"><span class="gm-who" style="--c:var(--ref)">${esc(nameOf(S.g.asker))}</span> 님이 문제를 만드는 중…</div><p class="cap">문제가 오면 내 폰에서 들을 수 있어요.</p>`); return; }
  const card = GM.pick(GM.CARDS);
  stage(h + `<div class="gm-turn">내가 문제를 낼 차례!</div><div class="gm-card-draw"><span>문제 아이디어</span><b id="gCard">${esc(card)}</b><button type="button" class="linkbtn" id="gCardNew">다른 카드</button></div>` + recBlock('gA', '● 문제 녹음') + `<p class="cap">너무 쉬우면 문제 보너스를 못 받아요. 따라 한 사람들 평균이 45~80점이면 +5!</p>`);
  $('gCardNew').addEventListener('click', () => { $('gCard').textContent = GM.pick(GM.CARDS); });
  bindRec('gA', '● 문제 녹음', 10, null, x => { sendAudio(tagB('src'), x); act({ a: 'asked' }); });
}
function uAsk() {}
function bCopy(h) {
  const amAsker = S.g.asker === R.me.id, M = my();
  if (amAsker) { stage(h + `<div class="gm-turn">내 문제를 친구들이 흉내 내는 중…</div><div class="sc-ctl">${playBtn(tagB('src'), '▶ 내 문제')}</div><p class="gm-msg" id="gWait"></p>`); bindPlays(); return; }
  if (!S.players.includes(R.me.id)) { stage(h + '<p class="cap">이번 게임은 구경 중이에요. 다음 게임부터 같이 해요.</p><p class="gm-msg" id="gWait"></p>'); return; }
  M.heard = M.heard || 0;
  stage(h + `<div class="gm-turn"><span class="gm-who" style="--c:var(--ref)">${esc(nameOf(S.g.asker))}</span> 님 문제를 흉내 내요</div><div class="sc-ctl"><button type="button" id="gHear">▶ 문제 듣기</button><button type="button" id="gAsk" hidden>다시 받기</button></div>` + recBlock('gC', '● 따라 하기') + '<p class="gm-msg" id="gWait"></p>');
  $('gHear').addEventListener('click', () => { const x = R.audio.get(tagB('src')), max = S.opts.listens; if (!x) return; if (max && M.heard >= max) return; M.heard++; uCopy(); play(x); });
  $('gAsk').addEventListener('click', () => askFor(tagB('src')));
  let res = null;
  bindRec('gC', '● 따라 하기', 12, x => { const src = R.audio.get(tagB('src')); if (!src) return '<span class="err">문제를 아직 못 받았어요.</span>'; res = GM.mimicScore(src, GM.muRound(x)); return `<b>${res.score}점</b> · ${esc(GM.tipOf(res.parts))}. 마음에 들면 보내고, 아니면 다시 녹음해요.`; },
    x => { if (!res) return; sendAudio(tagB(R.me.id), x); act({ a: 'take', score: res.score, parts: res.parts }); M.sent = true; });
  M.t0 = Date.now();
}
function uCopy() {
  uWait(); if (S.g.asker === R.me.id || !$('gHear')) return;
  const M = my(), has = R.audio.has(tagB('src')), max = S.opts.listens;
  $('gHear').disabled = !has || !!(max && M.heard >= max);
  $('gHear').textContent = has ? `▶ 문제 듣기${max ? ` (${Math.max(0, max - M.heard)})` : ''}` : '문제 받는 중…';
  $('gAsk').hidden = has || Date.now() - (M.t0 || 0) < 6000;
  if (!has) setTimeout(() => S && S.phase === 'copy' && uCopy(), 1500);
  if ($('gCRec')) $('gCRec').disabled = !has;
  if (!M.autoPlayed && has && !M.heard) { M.autoPlayed = true; M.heard++; play(R.audio.get(tagB('src'))); $('gHear').textContent = `▶ 문제 듣기${max ? ` (${Math.max(0, max - M.heard)})` : ''}`; }
}
function bVote(h) {
  const takers = Object.keys(S.g.takes);
  stage(h + `<div class="gm-turn">누가 제일 닮았나요? 한 명 골라요</div><div class="sc-ctl">${playBtn(tagB('src'), '▶ 문제 원본')}</div><ol class="gm-rank" id="gVote">${takers.map(id => `<li>${playBtn(tagB(id), '▶')} <b>${esc(nameOf(id))}</b> ${id === R.me.id ? '<span class="cap">(나)</span>' : `<button type="button" class="sc-tag" data-v="${id}">이 사람!</button>`}</li>`).join('')}</ol><p class="cap">점수는 투표가 끝나면 공개돼요. 한 표에 +${GM.RULE.vote}점.</p><p class="gm-msg" id="gWait"></p>`);
  bindPlays();
  $('gVote').querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { if (my().voted) return; my().voted = b.dataset.v; b.classList.add('on'); b.textContent = '✓ 투표함'; $('gVote').querySelectorAll('[data-v]').forEach(x => x.disabled = true); act({ a: 'vote', target: b.dataset.v }); }));
}
function uVote() { uWait(); }
function bRes(h) {
  const r = S.g.res, ask = S.g.asker;
  stage(h + `<div class="gm-src">${playBtn(tagB('src'), '▶')} 문제 · <b>${esc(nameOf(ask))}</b> <small>+${r.pts[ask] || 0}</small> <span class="cap">${esc(r.why[ask] || '')}</span></div><ol class="gm-rank">` +
    r.order.map((id, i) => `<li>${playBtn(tagB(id), '▶')} <b>${esc(nameOf(id))}</b> <span class="gm-sc">${S.g.takes[id].score}점</span> <small>+${r.pts[id] || 0}</small> <span class="cap">${esc(r.why[id] || '')} · ${esc(GM.tipOf(S.g.takes[id].parts))}</span></li>`).join('') + '</ol>' +
    (r.order.length ? '' : '<p class="cap">아무도 흉내를 안 냈어요.</p>') + nextBtn() + boardHtml());
  bindPlays(); bindNext();
}

// ---------- 동시 서바이벌 ----------
function survVoice() { try { return +(localStorage.getItem('moksori.game.voice') || 165); } catch (_) { return 165; } }
function sSing(h) {
  const M = my(), alv = S.g.lives[R.me.id] > 0 && S.players.includes(R.me.id);
  if (!alv) { stage(h + `<p class="cap">${S.players.includes(R.me.id) ? '목숨을 다 잃었어요 😢 친구들을 응원해요!' : '이번 게임은 구경 중이에요.'}</p><p class="gm-msg" id="gWait"></p>` + livesHtml()); return; }
  M.seq = GM.pattern(S.g.L, S.g.seed); M.x = GM.synth(M.seq, survVoice()); M.left = 1;
  stage(h + `<div class="gm-opts"><label>내 목소리 <select id="gVoice"><option value="110">낮은 편</option><option value="165">중간</option><option value="220">높은 편</option></select></label></div><div class="sc-ctl"><button type="button" id="gHear">▶ 다시 듣기 (1)</button><button type="button" class="rec" id="gSRec">● 따라 하기</button></div><p class="gm-msg" id="gSMsg">모두 같은 가락이에요. 잘 들어요!</p><canvas class="gm-cv" id="gCv" height="150" hidden></canvas><p class="gm-msg" id="gWait"></p>` + livesHtml());
  $('gVoice').value = String(survVoice());
  $('gVoice').addEventListener('change', () => { try { localStorage.setItem('moksori.game.voice', $('gVoice').value); } catch (_) {} M.x = GM.synth(M.seq, survVoice()); });
  $('gHear').addEventListener('click', () => { if (M.left <= 0) return; M.left--; $('gHear').disabled = true; $('gHear').textContent = '▶ 다시 듣기 (0)'; play(M.x); });
  $('gSRec').addEventListener('click', async () => {
    if (M.sent) return;
    const x = await UI.recBtn($('gSRec'), $('gSMsg'), '● 따라 하기', { maxSec: 10 }); if (!x) return;
    const r = GM.svScore(M.x, x); UI.svDraw($('gCv'), r);
    if (r.none) { $('gSMsg').innerHTML = '<span class="err">높낮이가 안 잡혔어요. "아~"처럼 소리를 내서 다시 해 보세요.</span>'; return; }
    M.sent = true; $('gSRec').hidden = true; $('gHear').hidden = true;
    const pass = r.total >= GM.need(S.g.L);
    $('gSMsg').innerHTML = `<b class="${pass ? 'gm-ok' : 'gm-no'}">${Math.round(r.total)}점 ${pass ? '통과!' : '— 통과 점수보다 낮아요'}</b> ${esc(UI.svJudge(r))} 친구들 결과를 기다려요.`;
    act({ a: 'take', score: r.total });
  });
  setTimeout(() => { if (S && S.phase === 'sing' && !M.played) { M.played = true; play(M.x); } }, 600);
}
function livesHtml() { return `<div class="gm-lives">${S.players.map(id => `<span class="${S.g.lives[id] > 0 ? '' : 'out'}"><b>${esc(nameOf(id))}</b> ${'♥'.repeat(Math.max(0, S.g.lives[id]))}${'♡'.repeat(Math.max(0, 3 - Math.max(0, S.g.lives[id])))}</span>`).join('')}</div>`; }
function sRes(h) {
  const need = GM.need(S.g.L), sc = id => S.g.takes[id];
  const ids = S.players.filter(id => S.g.lives[id] > 0 || S.g.fails.includes(id)).sort((a, b) => (sc(b) || 0) - (sc(a) || 0));
  stage(h + `<ol class="gm-rank">${ids.map(id => `<li><b>${esc(nameOf(id))}</b> <span class="gm-sc">${sc(id) != null ? sc(id) + '점' : '안 냄'}</span> ${S.g.star === id ? '⭐ +2' : ''} ${S.g.fails.includes(id) ? `<span class="gm-no">목숨 -1${S.g.lives[id] <= 0 ? ' · 탈락' : ''}</span>` : sc(id) >= need ? '<span class="gm-ok">통과 +1</span>' : ''}</li>`).join('')}</ol>` +
    (S.g.note ? `<p class="cap">${esc(S.g.note)}</p>` : '') + livesHtml() +
    (S.g.over ? `<div class="gm-win">🏆 ${S.g.winner ? `<b>${esc(nameOf(S.g.winner))}</b> 님 최후의 생존자! +10` : '모두 탈락!'}</div>` + nextBtn('결과 보기 ▶') : nextBtn()));
  bindNext();
}

// ---------- 비행기 레이스 ----------
function fFly(h) {
  const inGame = S.players.includes(R.me.id);
  stage(h + `<div class="gm-opts"><label>내 높이 범위 <select id="gRange" class="gm-range"></select></label><span class="cap" style="margin:0">범위는 각자 자기 목소리에 맞춰요. 벽은 모두 똑같아요.</span></div><div class="gm-fly"><canvas id="gFlCv" height="300"></canvas><div class="gm-fly-score" id="gFlScore">0</div><div class="gm-count" id="gCount"></div></div><p class="gm-msg" id="gFlMsg"></p><p class="gm-msg" id="gWait"></p>`);
  UI.fillRange($('gRange')); try { const v = localStorage.getItem('moksori.game.range'); if (v && $('gRange').querySelector(`option[value="${v}"]`)) $('gRange').value = v; } catch (_) {}
  $('gRange').addEventListener('change', () => { try { localStorage.setItem('moksori.game.range', $('gRange').value); } catch (_) {} if (R.fly) R.fly.draw(); });
  const F = R.fly = UI.createFly({ cv: $('gFlCv'), scoreEl: $('gFlScore'), rangeSel: $('gRange') });
  for (const m of R.members) if (m.id !== R.me.id && S.players.includes(m.id)) F.ghosts.set(m.id, { name: m.name, y: 0.85, alive: true, score: 0 });
  F.draw();
  let pos = null, redraw = null, cancelled = false;
  R.cleanup = () => { cancelled = true; clearInterval(pos); clearInterval(redraw); if (F.on) F.stop(true); R.fly = null; };
  redraw = setInterval(() => { if (!F.on) F.draw(); }, 150);
  if (!inGame) { $('gFlMsg').textContent = '이번 판은 구경해요. 친구 비행기를 보세요!'; return; }
  const my0 = my();
  if (my0.done) { $('gFlMsg').textContent = `내 기록 ${my0.done.score}점. 친구들을 기다려요.`; return; }
  (async () => {
    for (const n of [3, 2, 1]) { if (cancelled) return; $('gCount').textContent = n; await sleep(800); }
    if (cancelled) return; $('gCount').textContent = '';
    try {
      await F.start({ seed: S.g.seed, onEnd: ({ score, silent }) => {
        clearInterval(pos); send({ t: 'pos', y: F.y, s: score, al: false });
        if (silent) return; my0.done = { score };
        $('gFlMsg').innerHTML = `<b class="gm-no">쾅!</b> <b>${score}점</b>. 친구들이 끝날 때까지 구경해요.`; act({ a: 'crash', score });
      } });
      $('gFlMsg').textContent = '소리를 내서 떠올라요!';
      pos = setInterval(() => { if (F.on) send({ t: 'pos', y: +F.y.toFixed(3), s: F.score, al: true }); }, 200);
    } catch (e) { $('gFlMsg').innerHTML = UI.errHtml(e); act({ a: 'crash', score: 0 }); }
  })();
}
function fRes(h) {
  stage(h + `<ol class="gm-rank">${S.g.order.map(id => `<li><b>${esc(nameOf(id))}</b> <span class="gm-sc">${S.g.res[id]}점</span> ${S.g.pts[id] ? `<small>+${S.g.pts[id]}</small>` : ''}</li>`).join('')}</ol><p class="cap">1등 +5 · 2등 +3 · 3등 +1 (2명 이상일 때)</p>` + nextBtn('한 판 더 ▶') + boardHtml());
  bindNext();
}

// ---------- 누구 목소리? ----------
const tagW = id => `w${S.gid}:${S.round}:${id}`;
function wRec(h) {
  const inGame = S.players.includes(R.me.id), M = my();
  stage(h + `<div class="gm-say">「${esc(S.g.line)}」</div><p class="cap">이 문장을 <b>내 목소리가 아닌 것처럼</b> 바꿔서 말해요. 높게, 낮게, 사투리, 할머니, 로봇… 친구들이 못 맞히면 한 명당 +1!</p>` + (inGame && !M.sent ? recBlock('gW', '● 변장 녹음') : '<p class="cap">녹음을 보냈어요. 다른 사람을 기다려요.</p>') + '<p class="gm-msg" id="gWait"></p>');
  if (inGame && !M.sent) bindRec('gW', '● 변장 녹음', 7, null, x => { M.sent = true; sendAudio(tagW(R.me.id), x); act({ a: 'wdone' }); });
}
function wGuess(h) {
  const others = S.players.map(id => [id, nameOf(id)]), M = my();
  M.g = M.g || {};
  stage(h + `<div class="gm-say">「${esc(S.g.line)}」</div><p class="cap">목소리마다 누구인지 골라요. 내 목소리는 건너뛰어요.</p><ol class="gm-rank" id="gGuess">${S.g.order.map((id, i) => `<li>${playBtn(tagW(id), `▶ 목소리 ${i + 1}`)} ${id === R.me.id ? '<span class="cap">← 내 목소리</span>' : `<select data-o="${id}" aria-label="목소리 ${i + 1}은 누구?"><option value="">누구?</option>${others.filter(([o]) => o !== R.me.id).map(([o, n]) => `<option value="${o}">${esc(n)}</option>`).join('')}</select>`}</li>`).join('')}</ol><div class="sc-ctl"><button type="button" class="primary-sm" id="gGSend">다 골랐어요</button></div><p class="gm-msg" id="gGMsg"></p><p class="gm-msg" id="gWait"></p>`);
  bindPlays();
  $('gGuess').querySelectorAll('select').forEach(s => { if (M.g[s.dataset.o]) s.value = M.g[s.dataset.o]; s.addEventListener('change', () => { M.g[s.dataset.o] = s.value; }); });
  $('gGSend').addEventListener('click', () => {
    const need = S.g.order.filter(id => id !== R.me.id), miss = need.filter(id => !M.g[id]);
    if (miss.length) { $('gGMsg').innerHTML = `<span class="err">아직 ${miss.length}개 안 골랐어요.</span>`; return; }
    M.sentGuess = true; $('gGSend').hidden = true; $('gGuess').querySelectorAll('select').forEach(s => s.disabled = true); $('gGMsg').textContent = '보냈어요! 결과를 기다려요.';
    act({ a: 'guess', g: Object.fromEntries(need.map(id => [id, M.g[id]])) });
  });
  if (!S.g.order.includes(R.me.id) && !S.players.includes(R.me.id)) { $('gGSend').hidden = true; }
}
function uGuess() { uWait(); if ($('gGSend') && my().sentGuess) $('gGSend').hidden = true; }
function wRes(h) {
  const r = S.g.res, G = S.g.guesses;
  const rows = S.g.order.map((id, i) => {
    const gs = Object.keys(G).filter(g => g !== id && G[g][id] != null), ok = gs.filter(g => G[g][id] === id), no = gs.filter(g => G[g][id] !== id);
    return `<li>${playBtn(tagW(id), `▶ ${i + 1}`)} <b>${esc(nameOf(id))}</b> <span class="cap">맞힘: ${ok.map(g => esc(nameOf(g))).join(', ') || '없음'} · 속음: ${no.map(g => `${esc(nameOf(g))}(→${esc(nameOf(G[g][id]))})`).join(', ') || '없음'}</span></li>`;
  }).join('');
  const best = (o) => { const e = Object.entries(o || {}).sort((a, b) => b[1] - a[1]); return e.length ? e[0] : null; };
  const fo = best(r.fooled), de = best(r.right);
  stage(h + `<div class="gm-say">「${esc(S.g.line)}」</div><ol class="gm-rank">${rows}</ol><div class="gm-awards">${fo ? `<span>🎭 변장왕 <b>${esc(nameOf(fo[0]))}</b> (${fo[1]}명 속임)</span>` : ''}${de ? `<span>🕵️ 명탐정 <b>${esc(nameOf(de[0]))}</b> (${de[1]}개 맞힘)</span>` : ''}</div><p class="cap">맞히면 하나에 +2, 속이면 한 명에 +1.</p>` + nextBtn() + boardHtml());
  bindPlays(); bindNext();
}

// ---------- 고장난 전화기 ----------
const tagR = k => `r${S.gid}:${S.round}:${k}`;
function rRelay(h) {
  const g = S.g, cur = g.order[g.k], mine = cur === R.me.id, M = my(), pos = g.order.indexOf(R.me.id);
  if (g.k >= g.order.length) { stage(h + '<div class="gm-turn">다 이어졌어요! 결과를 계산하는 중…</div>'); return; }
  const steps = `<div class="gm-chain-dots">${g.order.map((id, i) => `<span class="${i < g.k ? 'done' : i === g.k ? 'now' : ''}">${esc(nameOf(id))}</span>`).join('<i>→</i>')}</div>`;
  if (!mine) { stage(h + steps + `<div class="gm-turn"><span class="gm-who" style="--c:var(--imi)">${esc(nameOf(cur))}</span> 님 차례…</div><p class="cap">${pos > g.k ? `내 차례는 ${pos - g.k}번 뒤예요. 앞사람 소리가 안 들리게 조금 떨어져 있어요!` : pos >= 0 ? '내 차례는 끝났어요. 결과를 기다려요.' : '구경 중이에요.'}</p>`); return; }
  M.heard = M.heard || 0;
  if (g.k === 0) {
    stage(h + steps + `<div class="gm-turn">내가 첫 사람! 비밀 카드를 소리로 내요</div><div class="gm-card-draw"><span>비밀 문제 (나만 보기)</span><b>${esc(g.card)}</b></div>` + recBlock('gR', '● 녹음'));
  } else {
    stage(h + steps + `<div class="gm-turn">내 차례! 앞사람 소리만 듣고 따라 해요</div><div class="sc-ctl"><button type="button" id="gRHear">▶ 앞사람 소리 (2)</button><button type="button" id="gRAsk" hidden>다시 받기</button></div>` + recBlock('gR', '● 녹음'));
    $('gRHear').addEventListener('click', () => { const x = R.audio.get(tagR(g.k - 1)); if (!x || M.heard >= 2) return; M.heard++; uRelay(); play(x); });
    $('gRAsk').addEventListener('click', () => askFor(tagR(g.k - 1)));
    M.t0 = Date.now();
  }
  bindRec('gR', '● 녹음', 10, null, x => { sendAudio(tagR(g.k), x); act({ a: 'rdone', k: g.k }); });
}
function uRelay() {
  const g = S.g, M = my(); if (!$('gRHear')) return;
  const has = R.audio.has(tagR(g.k - 1));
  $('gRHear').disabled = !has || M.heard >= 2; $('gRHear').textContent = has ? `▶ 앞사람 소리 (${2 - M.heard})` : '앞사람 소리 받는 중…';
  $('gRAsk').hidden = has || Date.now() - (M.t0 || 0) < 6000; if (!has) setTimeout(() => S && S.phase === 'relay' && uRelay(), 1500);
  if ($('gRRec')) $('gRRec').disabled = !has || !M.heard;
}
function rRes(h) {
  const ch = (S.g.chain || []).map((c, k) => ({ ...c, who: nameOf(c.id), x: R.audio.get(tagR(S.g.order.indexOf(c.id))) }));
  stage(h + `<ol class="gm-chain" id="gChain">${UI.chainHtml(ch, S.g.card)}</ol><div class="sc-ctl"><button type="button" class="primary-sm" id="gAll">▶ 전부 이어 듣기</button><button type="button" id="gFL">▶ 처음 vs 마지막</button></div><p class="cap">앞사람과 닮은 점수 10점마다 1점씩 받아요.</p>` + nextBtn() + boardHtml());
  $('gChain').querySelectorAll('[data-ci]').forEach(b => b.addEventListener('click', () => { const c = ch[+b.dataset.ci]; if (c.x) play(c.x); }));
  let tok = 0;
  $('gAll').addEventListener('click', async () => { const t = ++tok; for (const c of ch) { if (t !== tok || !R) return; if (c.x) { await play(c.x); await sleep(400); } } });
  $('gFL').addEventListener('click', async () => { const t = ++tok; if (ch[0] && ch[0].x) await play(ch[0].x); await sleep(600); const l = ch[ch.length - 1]; if (t === tok && l && l.x) play(l.x); });
  bindNext();
}

// ---------- 연결 상태 ----------
function diag() {
  if (!R) return; const it = [];
  it.push([R.server, R.server ? '서버 연결됨' : '서버 연결 중…']);
  const others = R.members.filter(m => m.id !== R.me.id);
  it.push([others.length > 0, others.length ? `친구 ${others.length}명 찾음` : '아직 친구가 없어요 → 방 코드가 같은지 확인']);
  if (!isHost()) it.push([!!S, S ? '게임 상태 받음' : '게임 상태를 기다리는 중 → 방장 화면이 켜져 있는지 확인']);
  it.push([true, `받은 녹음 ${[...R.audio.keys()].length}개${R.parts.size ? ` · 받는 중 ${R.parts.size}개` : ''}`]);
  $('onDiag').innerHTML = it.map(([o, t]) => `<li class="${o ? 'ok' : 'no'}">${o ? '✓' : '…'} ${esc(t)}</li>`).join('');
  if (window.Diag) Diag.set('게임 방', it.map(x => x[1]).join(' / ') + (S ? ` / ${S.mode || '대기실'} ${S.phase}` : ''));
}
setInterval(() => { if (R) { diag(); if (isHost() && S && S.g) { const before = S.phase; hostAdvance(); if (S.phase !== before) commit(); } } }, 1500);
})();
