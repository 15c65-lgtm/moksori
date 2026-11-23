"""시험용 소리 만들기 (사람 녹음은 공개 저장소에 넣지 않음)"""
import numpy as np, os
from scipy.io import wavfile
from scipy.signal import lfilter
SR = 48000; D = os.path.join(os.path.dirname(__file__), 'fixtures'); os.makedirs(D, exist_ok=True)
def vowel(f0, F, sec, jit=0.004):
    n = int(SR * sec); t = np.arange(n) / SR; f = f0 * (1 + jit * np.sin(2 * np.pi * 5.5 * t)); ph = np.cumsum(f) / SR
    x = sum(np.sin(2 * np.pi * k * ph) / k ** 1.3 for k in range(1, int(7000 / f0)))
    for Fc, bw in zip(F, [90, 110, 150, 200]):
        r = np.exp(-np.pi * bw / SR); a = [1, -2 * r * np.cos(2 * np.pi * Fc / SR), r * r]; x = lfilter([sum(a)], a, x)
    env = np.minimum(1, np.minimum(t / 0.03, (sec - t) / 0.05)); return x * env / np.abs(x).max() * 0.5
def save(name, x): wavfile.write(os.path.join(D, name), SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
sil = lambda s: np.zeros(int(SR * s))
# 말소리 비슷한 것: 모음 여러 개 + 쉼
syl = [vowel(130 + 20 * np.sin(i), F, 0.18) for i, F in enumerate([[700, 1200, 2500], [300, 2200, 2900], [500, 900, 2400]] * 4)]
speech = np.concatenate([sil(0.3)] + [np.concatenate([s, sil(0.04)]) for s in syl[:6]] + [sil(0.4)] + [np.concatenate([s, sil(0.04)]) for s in syl[6:]] + [sil(0.6)])
save('speech.wav', speech)
save('turn.wav', np.concatenate([speech[:int(SR * 1.6)], sil(2.4)]))
save('aa_male.wav', np.concatenate([vowel(110, [651, 1156, 2500, 3500], 4.0), sil(1)]))
save('aa_female.wav', np.concatenate([vowel(220, [945, 1582, 2900, 3900], 4.0), sil(1)]))
notes = [60, 62, 64, 65, 67, 67, 65, 64, 62, 60]
song = np.concatenate([vowel(440 * 2 ** ((m - 69) / 12), [700, 1200, 2600, 3500], 1.0) for m in notes] + [sil(1)])
save('guide.wav', song); save('singer.wav', np.concatenate([sil(0.3), song]))
print('fixtures ok')
