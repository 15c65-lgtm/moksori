"""목소리 연습실 자동 점검. 사용: python3 tests/run.py  (CHROME=/path/to/chrome 로 바꿀 수 있음)"""
import asyncio, os, sys, json
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://localhost:8766/'); CH = os.environ.get('CHROME', '/usr/bin/google-chrome')
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
PAGES = ['index', 'mimic', 'yeomok', 'range', 'script', 'collection', 'game', 'exam', 'sing', 'pronounce', 'routine']
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f'  ({info})' if info else ''))
async def browser(p, mic=None):
    args = ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    if mic: args.append(f'--use-file-for-fake-audio-capture={os.path.join(FX, mic)}')
    return await p.chromium.launch(executable_path=CH, args=args)
async def page(b, w=1100, **kw):
    ctx = await b.new_context(viewport={'width': w, 'height': 900}, accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'], **kw)
    pg = await ctx.new_page(); pg.errs = []; pg.on('pageerror', lambda e: pg.errs.append(str(e)[:150])); return pg

async def t_pages(p):
    b = await browser(p)
    for w in (1200, 390):
        pg = await page(b, w)
        for n in PAGES:
            await pg.goto(BASE + n + '.html'); await pg.wait_for_timeout(500)
            sw = await pg.evaluate('document.documentElement.scrollWidth > innerWidth')
            ok(f'{n} 열림 ({w}px)', not pg.errs and not sw, f'오류 {pg.errs}' if pg.errs else '가로 넘침' if sw else ''); pg.errs.clear()
    await b.close()

async def t_meter(p):
    for mic, lo, hi, lab in (('aa_male.wav', 550, 750, '남자'), ('aa_female.wav', 820, 1050, '여자')):
        b = await browser(p, mic); pg = await page(b); await pg.goto(BASE + 'yeomok.html'); await pg.click('#micBtn'); await pg.wait_for_timeout(2500)
        v = await pg.inner_text('#rmV1'); n = int(v.split()[0]) if v[0].isdigit() else -1
        ok(f'울림 재기 {lab} 「아」 첫째 울림', lo <= n <= hi, v); await b.close()

async def t_exam(p):
    b = await browser(p, 'speech.wav'); pg = await page(b); await pg.goto(BASE + 'exam.html'); await pg.wait_for_timeout(300)
    await pg.click('[data-st="ebs"]'); await pg.click('[data-ex="ebs-29-f"]'); await pg.click('#mockGo'); await pg.fill('#mkName', '시험'); await pg.fill('#mkNo', 'T1'); await pg.click('#mkStart')
    for _ in range(14):
        if await pg.is_visible('#mkDone'): break
        await pg.click('#mkRec'); await pg.wait_for_timeout(1300); await pg.click('#mkRec'); await pg.wait_for_timeout(500); await pg.click('#mkNext'); await pg.wait_for_timeout(100)
        if 'err' in await pg.inner_html('#mkCheck'): await pg.click('#mkNext')
    names = []; pg.on('download', lambda d: names.append(d.suggested_filename)); await pg.click('#mkSave'); await pg.wait_for_timeout(2500)
    ok('공채 EBS 2025 파일 나누기', names == ['T1_1_해설.mp3', 'T1_2_연기1.mp3', 'T1_3_연기2.mp3', 'T1_4_연기3.mp3'], str(names))
    ok('공채 페이지 오류 없음', not pg.errs, str(pg.errs)); await b.close()

async def t_sing(p):
    b = await browser(p, 'singer.wav'); pg = await page(b); await pg.goto(BASE + 'sing.html'); await pg.wait_for_timeout(300)
    await pg.click('#sgNew'); await pg.set_input_files('#edTrack', os.path.join(FX, 'guide.wav')); await pg.click('#edGuideSame'); await pg.fill('#edLyrics', '[0:00] 하나\n[0:05] 둘'); await pg.click('#edSave'); await pg.wait_for_timeout(4000)
    await pg.click('#phones'); await pg.click('#playBtn'); await pg.wait_for_timeout(6000); acc = await pg.inner_text('#accAll'); await pg.click('#playBtn')
    ok('노래 채점이 나옴', acc.endswith('%') and int(acc[:-1]) >= 50, acc); ok('노래 페이지 오류 없음', not pg.errs, str(pg.errs)); await b.close()

async def t_script(p):
    b = await browser(p, 'speech.wav'); pg = await page(b); await pg.goto(BASE + 'script.html'); await pg.wait_for_timeout(300)
    await pg.click('#scNew'); await pg.fill('#edTitle', '점검'); await pg.fill('#edText', '# 점검\n나: 오늘은 / 정말 *좋은* 날이야'); await pg.click('#edSave'); await pg.wait_for_timeout(300)
    h = await pg.inner_html('#pLine'); ok('대본 강조·숨 표시', '<b class="sc-emph">좋은</b>' in h and 'sc-br' in h, h[:80])
    await pg.keyboard.press('Space'); await pg.wait_for_timeout(2500); await pg.keyboard.press('Space'); await pg.wait_for_timeout(800)
    ok('대본 테이크 저장', '테이크 1' in await pg.inner_text('#recMsg'), await pg.inner_text('#recMsg')); ok('대본 페이지 오류 없음', not pg.errs, str(pg.errs)); await b.close()

async def t_room(p):
    b = await browser(p, 'turn.wav'); ctx = await b.new_context(); A = await ctx.new_page(); B = await ctx.new_page(); errs = []
    for x in (A, B): x.on('pageerror', lambda e: errs.append(str(e)))
    await A.goto(BASE + 'script.html?local=1'); await A.click('#scNew'); await A.fill('#edText', '# 방\n가: 하나 둘\n나: 셋 넷\n가: 다섯'); await A.click('#edSave'); await A.wait_for_timeout(300)
    await A.click('#rmOpen'); await A.fill('#rmNick', '가'); await A.click('#rmCreate'); await A.wait_for_timeout(600); code = await A.inner_text('#rmCodeTxt')
    await B.goto(BASE + f'script.html?room={code}&local=1'); await B.fill('#rmNick', '나'); await B.click('#rmJoin'); await B.wait_for_timeout(3500)
    ok('같이 읽기 역할 나눔', await B.input_value('#rmRole') == '나', await B.input_value('#rmRole'))
    await A.click('.rm-diag summary'); await A.wait_for_timeout(1800); dg = await A.inner_text('#rmDiag'); ok('같이 읽기 연결 상태 표시', '서버 연결됨' in dg and '연결됨' in dg.split('목소리')[-1], dg.replace(chr(10), ' / '))
    await A.click('#rmStart')
    for _ in range(12):
        await A.wait_for_timeout(2000)
        if '장면 끝' in await A.inner_text('#rmMsg') and '장면 끝' in await B.inner_text('#rmMsg'): break
    await A.wait_for_timeout(1500); ok('같이 읽기 끝까지 진행', '장면 끝' in await B.inner_text('#rmMsg'), await B.inner_text('#rmMsg'))
    ok('같이 읽기 기록 저장', not await A.is_hidden('#svBox'), ''); ok('같이 읽기 오류 없음', not errs, str(errs)); await b.close()

async def t_report(p):
    b = await browser(p); pg = await page(b); await pg.goto(BASE + 'pronounce.html'); await pg.wait_for_timeout(300)
    await pg.click('.rp-btn'); await pg.fill('#rpText', '점검'); await pg.click('#rpCopy'); await pg.wait_for_timeout(200); t = await pg.evaluate('navigator.clipboard.readText()')
    ok('이상해요 알림 복사', '[목소리 연습실 문제 알림]' in t and '발음 연습' in t, t[:40]); await b.close()

async def t_game(p):
    b = await browser(p); pg = await page(b); await pg.goto(BASE + 'game.html'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""() => { const T = GameT, o = [];
      for (const L of [2, 5, 8]) { const s = T.pattern(L, 7 + L), x = T.synth(s, 165);
        o.push([T.svScore(x, T.synth(s, 110, { tempo: 1.08 })).total, T.svScore(x, T.synth(s.map(q => q[0] === '_' ? q : [q[0], q[1], 3, 3]), 165)).total]); }
      return o; }""")
    ok('서바이벌: 같은 가락(낮은 목소리)은 높게', all(a >= 85 for a, _ in r), [round(a) for a, _ in r])
    ok('서바이벌: 평평하게 부르면 낮게', all(f < 70 for _, f in r), [round(f) for _, f in r])
    await b.close()
    b = await browser(p, 'speech.wav'); pg = await page(b); await pg.goto(BASE + 'game.html#pt'); await pg.wait_for_timeout(300)
    await pg.click('#ptAdd'); await pg.click('#ptStart')
    for _ in range(3):
        await pg.click('#ptRec'); await pg.wait_for_timeout(2300)
        if 'on' in (await pg.get_attribute('#ptRec', 'class') or ''): await pg.click('#ptRec')
        await pg.wait_for_selector('#ptNext:not([hidden])', timeout=5000); await pg.click('#ptNext')
    await pg.click('#ptVotes button'); bd = await pg.inner_text('#ptBoard')
    ok('돌려 하기: 순위·투표 점수', '5점' in bd and '2점' in bd, bd.replace('\n', ' / ')); ok('게임 페이지 오류 없음', not pg.errs, pg.errs)
    await b.close()
    b = await browser(p, 'singer.wav'); pg = await page(b); await pg.goto(BASE + 'game.html#fl'); await pg.wait_for_timeout(300)
    await pg.click('#flStart'); await pg.wait_for_timeout(3000)
    v = await pg.evaluate('GameT.fly.voicedT'); ok('목소리 비행기: 노래 소리로 날기', v > 1.5, f'{v:.1f}초'); await b.close()

async def main():
    async with async_playwright() as p:
        for t in (t_pages, t_meter, t_exam, t_sing, t_script, t_room, t_report, t_game):
            try: await t(p)
            except Exception as e: ok(t.__name__ + ' 실행', False, str(e)[:200])
    bad = [r for r in results if not r[1]]; print(f'\n{len(results) - len(bad)}/{len(results)} 통과'); sys.exit(1 if bad else 0)
asyncio.run(main())
