// 챌린지 순위표: Supabase (익명 로그인 + 닉네임 + 점수만 저장)
// publishable 키는 공개용이에요. 권한은 데이터베이스의 보안 규칙(RLS)이 지켜요.
window.Board = (() => {
  const URL_ = 'https://zvbxjaapuppzmoanqhsq.supabase.co';
  const KEY = 'sb_publishable_gJ1HABK7qwWqGk_KQ0uzXQ_kaINRuwO';
  const BAD = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '개새', '닥쳐', '애미', '애비', '느금', '섹스', 'fuck', 'shit', 'admin', '관리자', '운영자'];
  let sb = null;

  function client() {
    if (!sb) {
      if (!window.supabase || !window.supabase.createClient) throw new Error('순위표 모듈을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.');
      sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'moksori.auth' } });
    }
    return sb;
  }
  function friendly(e) {
    const m = (e && (e.message || e.msg || e.error_description)) || String(e || '');
    if (/anonymous/i.test(m) && /(disabled|not enabled)/i.test(m)) return new Error('아직 참가 접수가 준비되지 않았어요. (관리자: Supabase에서 익명 로그인을 켜 주세요)');
    if (/profiles_nickname_key|duplicate key/i.test(m)) return new Error('이미 다른 사람이 쓰는 닉네임이에요.');
    if (/does not exist|Could not find the table|schema cache/i.test(m)) return new Error('순위표가 아직 준비되지 않았어요. (관리자: schema.sql을 실행해 주세요)');
    if (/nickname/i.test(m) && /check/i.test(m)) return new Error('닉네임은 2~12자로 정해 주세요.');
    if (/entries_(synchro|ai)_check/i.test(m)) return new Error('원본과 거의 똑같아서 제출할 수 없어요. 원본 소리가 그대로 녹음된 건 아닌지 확인해 주세요.');
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
    if (/rate limit|too many/i.test(m)) return new Error('요청이 너무 많아요. 잠시 뒤에 다시 해 주세요.');
    return new Error(m || '알 수 없는 오류가 생겼어요.');
  }
  const run = async q => { const r = await q; if (r.error) throw friendly(r.error); return r; };

  async function session(create) {
    const c = client();
    const { data } = await c.auth.getSession();
    if (data.session || !create) return data.session;
    const r = await c.auth.signInAnonymously();
    if (r.error) throw friendly(r.error);
    return r.data.session;
  }
  function checkNick(n) {
    n = (n || '').trim();
    if (n.length < 2 || n.length > 12) return '닉네임은 2~12자로 정해 주세요.';
    if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_.\- ]+$/.test(n)) return '한글, 영어, 숫자, 공백과 _ . - 만 쓸 수 있어요.';
    const low = n.toLowerCase().replace(/\s/g, '');
    if (BAD.some(b => low.includes(b))) return '쓸 수 없는 단어가 들어 있어요.';
    return null;
  }

  return {
    checkNick,
    async me() {
      const s = await session(false); if (!s) return null;
      const { data } = await run(client().from('profiles').select('nickname').eq('user_id', s.user.id).maybeSingle());
      return { id: s.user.id, nickname: data ? data.nickname : null };
    },
    async setNickname(n) {
      const bad = checkNick(n); if (bad) throw new Error(bad);
      const s = await session(true), c = client(); n = n.trim();
      const { data } = await run(c.from('profiles').select('nickname').eq('user_id', s.user.id).maybeSingle());
      if (data) await run(c.from('profiles').update({ nickname: n }).eq('user_id', s.user.id));
      else await run(c.from('profiles').insert({ user_id: s.user.id, nickname: n }));
      return n;
    },
    async submit(week, synchro, ai, parts) {
      await session(true);
      await run(client().from('entries').insert({ challenge_id: week, synchro: Math.round(synchro * 100) / 100, ai: ai == null ? null : Math.round(ai * 100) / 100, parts }));
    },
    async top(week, n = 50) {
      const { data } = await run(client().from('leaderboard').select('user_id,nickname,total,synchro,ai,created_at').eq('challenge_id', week).order('total', { ascending: false }).order('created_at', { ascending: true }).limit(n));
      return data || [];
    },
    async count(week) {
      const { count } = await run(client().from('leaderboard').select('user_id', { count: 'exact', head: true }).eq('challenge_id', week));
      return count || 0;
    },
    async mine(week) {
      const s = await session(false); if (!s) return null;
      const { data } = await run(client().from('leaderboard').select('total,synchro,ai').eq('challenge_id', week).eq('user_id', s.user.id).maybeSingle());
      if (!data) return null;
      const { count } = await run(client().from('leaderboard').select('user_id', { count: 'exact', head: true }).eq('challenge_id', week).gt('total', data.total));
      return { ...data, rank: (count || 0) + 1 };
    },
    async deleteMe() {
      const s = await session(false); if (!s) return;
      await run(client().from('profiles').delete().eq('user_id', s.user.id));
      await client().auth.signOut();
    },
  };
})();
