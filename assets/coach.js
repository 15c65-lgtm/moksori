// 여목 코치: 규칙 기반(무료, 즉시) + Claude API(내 키, 선택)
window.Coach = (() => {
  const r0 = v => Math.round(v);
  const note = hz => (typeof VF !== 'undefined' ? VF.note(hz) : '');

  // s: 최근 연습 요약, prev: 이전 연습들, t: 목표, cal: 기준 녹음
  function rules(s, prev, t, cal) {
    const out = [];
    if (!s) return [{ k: 'start', title: '먼저 연습 기록이 필요해요', body: '마이크를 켜고 1분 이상 모음을 길게 끌며 연습한 뒤 멈추면, 그 기록을 보고 코칭해 드려요.' }];
    if (!cal || !cal.modal) out.push({ k: 'calib', title: '기준 녹음부터 해 주세요', body: '평소 진성과 가성을 3초씩 녹음해 두면 공명 변화와 진성·가성 위치를 내 목소리 기준으로 볼 수 있어요. 지금은 대략값이라 코칭이 덜 정확해요.' });
    if (s.sec < 30) out.push({ k: 'short', title: '연습 시간이 짧아요', body: `이번엔 소리 낸 시간이 ${s.sec}초예요. 판단하려면 최소 30초~1분은 필요해요. 모음을 3~5초씩 길게 끌어 10번 반복해 보세요.` });

    const pOk = s.pitchOk != null ? s.pitchOk : null;
    if (s.f0 < t.fmin - 3) {
      const gap = t.fmin - s.f0, step = Math.min(t.fmin, s.f0 + Math.max(10, Math.min(25, gap / 2)));
      out.push({ k: 'pitch', title: `음높이가 목표보다 ${r0(gap)} Hz 낮아요`, body: `평균 ${r0(s.f0)} Hz(${note(s.f0)})예요. 한 번에 올리지 말고 오늘은 ${r0(step)} Hz(${note(step)}) 근처를 편하게 유지하는 걸 목표로 하세요. 허밍 "음~"으로 그 높이에 5초 머물기를 10번 하면 좋아요.` });
    } else if (s.f0 > t.fmax + 3) {
      out.push({ k: 'pitch', title: '음높이가 목표보다 높아요', body: `평균 ${r0(s.f0)} Hz예요. 너무 높으면 가성으로 넘어가거나 목이 쉽게 지쳐요. ${r0(t.fmax)} Hz 아래로 살짝 내려서, 같은 높이를 오래 편하게 유지하는 쪽이 자연스러워요.` });
    } else if (pOk != null && pOk < 0.6) {
      out.push({ k: 'pitch', title: '평균은 맞는데 음높이가 자주 벗어나요', body: `목표 음역 안에 있던 비율이 ${r0(pOk * 100)}%예요. 말끝이 처지는지 음높이 흐름 그래프를 보세요. 문장 끝을 살짝 올리듯 마무리하면 평균이 안정돼요.` });
    }

    if (s.resRel != null) {
      if (s.resRel < t.rmin) out.push({ k: 'res', title: `공명이 평소 대비 ${r0(s.resRel) > 0 ? '+' : ''}${r0(s.resRel)}%예요 (목표 +${t.rmin}% 이상)`, body: (s.f0 >= t.fmin ? '음높이는 올렸지만 공명은 평소와 비슷해요. ' : '공명도 평소와 비슷해요. 음높이와 함께 올려야 여성스럽게 들려요. ') + "'이' 모음에서 혀끝을 아랫니 뒤에 붙이고 혀 몸통을 앞으로 내민 채, 입꼬리를 살짝 옆으로 당겨 웃는 입 모양을 만들어 보세요. 작은 강아지가 낑낑대는 소리를 흉내 내면 목 안 공간이 좁아지는 감각을 찾기 쉬워요. 지도에서 점이 위로 올라가는지 확인하세요." });
      else if (s.resRel > t.rmax) out.push({ k: 'res', title: '공명을 과하게 올렸어요', body: `평소 대비 +${r0(s.resRel)}%예요. 너무 밝으면 앵앵거리거나 얇게 들릴 수 있어요. 입꼬리 당김을 조금 풀고 목표(+${t.rmin}~${t.rmax}%) 안으로 돌아오세요.` });
    }

    const allowFals = t.reg && t.reg[1] >= 0.95, needFals = t.reg && t.reg[0] >= 0.5, allowAir = t.breath === 'allow';
    if (s.regMix && needFals) {
      const { modal, mix, fals } = s.regMix;
      if (modal + mix > 0.5) out.push({ k: 'reg', title: `가성 쪽이 ${r0(fals * 100)}%예요 (이 스타일은 가성 중심)`, body: '소리를 위로 띄워 가성으로 넘겨 보세요. "후~" 하고 힘을 뺀 소리에서 시작해 그 느낌 그대로 말하면 미터가 가성 쪽으로 가요. 목을 조여서 높이지는 마세요.' });
      else out.push({ k: 'reg-good', title: `가성 비율 ${r0(fals * 100)}%, 스타일에 맞아요`, body: '이 상태로 문장 끝까지 높이와 공기감을 유지하는 연습(끝 올리기 문장)으로 넘어가 보세요.' });
    } else if (s.regMix) {
      const { modal, mix, fals } = s.regMix;
      if (fals > 0.45 && !allowFals) out.push({ k: 'reg', title: `가성 쪽이 ${r0(fals * 100)}%로 많아요`, body: '가성으로 말하면 숨이 새고 힘없이 들리기 쉬워요. 성대를 붙이는 감각을 찾아 보세요. 가볍게 "응, 응" 하고 짧게 끊어 소리 낸 다음, 그 닫힌 느낌을 유지한 채 "응~" 하고 길게 이어 보세요. 미터가 믹스 쪽으로 오면 성공이에요.' });
      else if (modal > 0.65 && s.f0 >= t.fmin) out.push({ k: 'reg', title: '높이는 맞는데 소리가 무거워요', body: `진성 쪽이 ${r0(modal * 100)}%예요. 성대를 두껍게 쓰고 있다는 신호예요. 볼륨을 반으로 줄이고, 아주 부드럽게 "음~"에서 "아~"로 열어 보세요. 소리를 위로 띄운다는 느낌으로 가볍게 내면 미터가 믹스 쪽으로 이동해요.` });
      else if (mix >= 0.5) out.push({ k: 'reg-good', title: `믹스 비율 ${r0(mix * 100)}%, 좋아요`, body: '성대는 닫히면서 가볍게 쓰고 있어요. 이 감각을 짧은 단어("네", "응", "안녕")로 옮기는 연습을 시작해도 돼요.' });
    }
    if (allowAir && s.breath != null) {
      if (s.breath < 0.1) out.push({ k: 'breath', title: '공기감이 적어요', body: '이 스타일은 공기 섞인 소리가 매력이에요. 도라에몽 소리에서 긁는 소리를 빼고 바람을 섞는 느낌으로, 숨을 조금 더 실어 보세요.' });
      else if (s.breath > 0.75) out.push({ k: 'breath', title: `숨이 ${r0(s.breath * 100)}%로 너무 많아요`, body: '공기가 너무 많으면 소리가 끊기고 목이 빨리 말라요. 소리의 심지가 남을 만큼만 공기를 섞고, 물을 자주 마셔 주세요.' });
    } else if (s.breath != null && s.breath > 0.3) out.push({ k: 'breath', title: `숨 섞인 소리가 ${r0(s.breath * 100)}%예요`, body: '소리를 높이려다 성대가 벌어지면 숨이 새요. 숨을 덜 쓰고 작게 내 보세요. 촛불 앞에서 말해도 불꽃이 거의 흔들리지 않는 정도가 좋아요.' });

    if (prev && prev.length) {
      const p = prev[prev.length - 1];
      const d = s.inPct - p.inPct;
      if (Math.abs(d) >= 8) out.push({ k: 'trend', title: d > 0 ? `지난번보다 목표 안 비율이 ${r0(d)}%p 늘었어요` : `지난번보다 목표 안 비율이 ${r0(-d)}%p 줄었어요`, body: d > 0 ? '방향이 맞아요. 같은 연습을 하루 10~15분, 며칠 이어가면 몸이 기억하기 시작해요.' : '컨디션 차이일 수 있어요. 목이 피곤하면 무리하지 말고 쉬는 날을 두세요.' });
    }
    if (s.inPct >= 70 && !out.some(o => ['pitch', 'res', 'reg', 'breath'].includes(o.k))) out.push({ k: 'next', title: `목표 안 ${r0(s.inPct)}%, 다음 단계로 가도 돼요`, body: '모음 연습은 충분해요. 이제 짧은 문장을 읽거나, 목표를 조금 높게(공명 +5%) 잡아 보세요.' });
    if (!out.length) out.push({ k: 'ok', title: '전반적으로 안정적이에요', body: `평균 ${r0(s.f0)} Hz, 목표 안 ${r0(s.inPct)}%예요. 같은 연습을 이어가며 목표 안 비율을 70% 넘기는 걸 목표로 해 보세요.` });
    return out.slice(0, 4);
  }

  const SYSTEM = `너는 취미로 여목(남성이 여성스러운 목소리를 내는 것) 연습을 하는 고등학생을 돕는 발성 코치야. 연습 앱이 측정한 숫자 요약을 받으면 한국어 존댓말(~요체)로 코칭해.
규칙:
- 숫자를 직접 인용해서 지금 상태를 2~3문장으로 진단해. 음높이(F0), 공명(포먼트 기반, 평소 대비 %), 진성·믹스·가성 비율, 숨 섞임, 목표 안 비율을 근거로 써.
- 가장 중요한 개선점 1~2개만 골라. 각각 바로 해 볼 수 있는 구체적인 연습법(입 모양, 소리, 횟수, 시간)을 줘.
- 지난 연습과 비교할 수 있으면 변화를 짚어 줘.
- 목 보호를 우선해. 아프거나 쉰 소리가 나면 쉬라고 하고, 한 번에 많이 올리지 말라고 해.
- 측정값은 마이크 기반 추정치라 오차가 있다는 걸 전제로, 단정 대신 "~로 보여요"처럼 말해.
- 의료적 진단은 하지 마. 400자~700자. 마크다운 제목 없이, 필요하면 짧은 번호 목록만 써.`;

  async function ai({ key, model, data, question }) {
    const body = {
      model, max_tokens: 900, system: SYSTEM,
      messages: [{ role: 'user', content: `연습 측정 요약(JSON):\n${JSON.stringify(data, null, 1)}\n\n${question ? '사용자 질문: ' + question : '이 기록을 보고 코칭해 줘.'}` }],
    };
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify(body),
      });
    } catch (_) { throw new Error('네트워크에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    let j = null; try { j = await res.json(); } catch (_) {}
    if (!res.ok) {
      const m = j && j.error && j.error.message || '';
      if (res.status === 401) throw new Error('API 키가 맞지 않아요. 키를 다시 확인해 주세요.');
      if (res.status === 429) throw new Error('요청이 너무 많아요. 잠시 뒤에 다시 눌러 주세요.');
      if (res.status === 400 && /credit|balance/i.test(m)) throw new Error('API 크레딧이 부족해요. Claude Console에서 결제 상태를 확인해 주세요.');
      if (res.status === 404 || /model/i.test(m)) throw new Error('선택한 모델을 쓸 수 없어요. 다른 모델을 골라 보세요.');
      throw new Error(`AI 응답 오류 (${res.status}) ${m}`);
    }
    return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  }
  return { rules, ai };
})();
