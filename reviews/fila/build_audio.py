"""Fila sneaker review: tiger voice (free Piper preview), word timings, mouth envelope, music and sound effects.
Writes audio/mix.wav, audio/voice.wav and timeline.json."""
import json, os, re, subprocess, wave
import numpy as np
from scipy.signal import butter, lfilter
SR = 44100
TEXT = ("Você já tá cansado de comprar aqueles tênis que não duram nem um mês e, quando você vai caminhar "
        "ou fazer qualquer outra coisa, eles machucam seus pés? Então eu tenho a solução.")
SAY = TEXT
D = '../../telefone/tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium'
os.makedirs('audio', exist_ok=True)
VSTART = 0.6
def readwav(f):
    w = wave.open(f); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    t = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t, np.arange(len(x)) / sr, x).astype(np.float32)
raw = 'audio/voice_raw.wav'
subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', '0.86', '--sentence-silence', '0.25'],
               input=SAY.encode(), check=True, capture_output=True)
# a brighter, friendlier "mascot" tone: pitch up a little, keep the speed
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'asetrate=22050*1.12,aresample=22050,atempo=0.95,highpass=f=90,acompressor=threshold=0.1:ratio=3,volume=1.5',
                '-ar', str(SR), '-ac', '1', 'audio/voice.wav'], check=True)
v = readwav('audio/voice.wav')
vd = len(v) / SR
# ---- word timings: split by punctuation at the longest silences, spread words by length inside each phrase ----
fr = int(SR * 0.01); env = np.array([np.sqrt(np.mean(v[i:i + fr] ** 2)) for i in range(0, len(v) - fr, fr)])
on = env > env.max() * 0.06
idx = np.where(on)[0]; s0, s1 = idx[0] * 0.01, idx[-1] * 0.01 + 0.01
gaps = []; i = idx[0]
while i < idx[-1]:
    if not on[i]:
        j = i
        while not on[j]: j += 1
        gaps.append(((j - i) * 0.01, i * 0.01, j * 0.01)); i = j
    else: i += 1
phrases = [p.strip() for p in re.split(r'(?<=[?.])\s+', TEXT) if p.strip()]
cut = sorted(sorted(gaps, reverse=True)[:len(phrases) - 1], key=lambda g: g[1])
bounds = [s0] + [x for g in cut for x in (g[1], g[2])] + [s1]
words = []
def spread(toks, a, b):
    wts = [len(re.sub(r'\W', '', w)) + 1.5 for w in toks]; tot = sum(wts); c = a
    for w, wt in zip(toks, wts):
        d = (b - a) * wt / tot; words.append({'text': w, 't0': round(VSTART + c, 3), 't1': round(VSTART + c + d * 0.92, 3)}); c += d
for k, ph in enumerate(phrases):
    a, b = bounds[2 * k], bounds[2 * k + 1]
    parts = [p.split() for p in re.split(r'(?<=,)\s+', ph)]
    if len(parts) == 1: spread(parts[0], a, b); continue
    # anchor each comma to the silence nearest to where it is expected (by word length)
    lens = [sum(len(w) + 1.5 for w in p) for p in parts]; tot = sum(lens); acc = 0; pa = a
    inside = [g for g in gaps if a < g[1] < b]
    for p, L in zip(parts[:-1], lens[:-1]):
        acc += L; exp = a + (b - a) * acc / tot
        g = min(inside, key=lambda g: abs((g[1] + g[2]) / 2 - exp) - g[0] * 2) if inside else (0, exp, exp)
        spread(p, pa, g[1]); pa = g[2]
    spread(parts[-1], pa, b)
mouth = [round(float(min(1, e / (env.max() * 0.55))), 3) for e in env[::1]]   # 100 per second
END_SPEECH = VSTART + vd
SHOTS = END_SPEECH + 0.2
T = {'voice_start': VSTART, 'speech_end': round(END_SPEECH, 3), 'shot1': round(SHOTS, 3), 'shot2': round(SHOTS + 3.0, 3), 'shot3': round(SHOTS + 5.8, 3),
     'final': round(SHOTS + 8.3, 3), 'end': round(SHOTS + 13.0, 3)}
def wt(prefix): return next(w['t0'] for w in words if w['text'].lower().startswith(prefix))
T['w_tenis'] = wt('tênis'); T['w_machucam'] = wt('machucam'); T['w_entao'] = wt('então'); T['w_solucao'] = wt('solução')
json.dump({'T': T, 'words': words, 'mouth': mouth}, open('timeline.json', 'w'), ensure_ascii=False)
# ---- music + effects ----
N = int(SR * T['end']) + SR
mix = np.zeros(N, np.float32); fx = np.zeros(N, np.float32)
def put(buf, x, at):
    a = int(at * SR); b = min(len(buf), a + len(x));
    if b > a: buf[a:b] += x[:b - a]
def lowp(x, f): b, a_ = butter(2, f / (SR / 2)); return lfilter(b, a_, x).astype(np.float32)
def hip(x, f): b, a_ = butter(2, f / (SR / 2), 'high'); return lfilter(b, a_, x).astype(np.float32)
def tone(f, d, amp, decay=3.0, wave_='sin'):
    t = np.arange(int(SR * d)) / SR; ph = 2 * np.pi * f * t
    w = np.sin(ph) if wave_ == 'sin' else (2 * (t * f % 1) - 1)
    return (w * amp * np.exp(-decay * t) * np.minimum(1, t * 200)).astype(np.float32)
rng = np.random.default_rng(3)
def noise(d): return rng.standard_normal(int(SR * d)).astype(np.float32)
def whoosh(at, d=0.5, amp=0.18):
    n = noise(d); env_ = np.sin(np.linspace(0, np.pi, len(n))) ** 2; put(fx, lowp(hip(n, 400), 3000) * env_ * amp, at - d * 0.6)
def impact(at, amp=0.5):
    t = np.arange(int(SR * 0.8)) / SR; put(fx, (np.sin(2 * np.pi * (55 + 90 * np.exp(-t * 18)) * t) * np.exp(-t * 5) * amp).astype(np.float32), at)
    put(fx, lowp(noise(0.4), 1500) * np.exp(-np.arange(int(SR * 0.4)) / SR * 12) * amp * 0.3, at)
def sparkle(at, amp=0.06):
    for k, f in enumerate([2093, 2637, 3136, 4186]): put(fx, tone(f, 0.5, amp, 7), at + k * 0.06)
def pop(at, amp=0.12): put(fx, tone(880, 0.12, amp, 30) + tone(1320, 0.12, amp * 0.5, 30), at)
def boing(at, amp=0.1):
    t = np.arange(int(SR * 0.45)) / SR; put(fx, (np.sin(2 * np.pi * (180 + 60 * np.sin(t * 40)) * t) * np.exp(-t * 6) * amp).astype(np.float32), at)
def ouch(at, amp=0.12):
    t = np.arange(int(SR * 0.3)) / SR; put(fx, (np.sign(np.sin(2 * np.pi * (600 - 900 * t) * t)) * np.exp(-t * 9) * amp * 0.5).astype(np.float32), at)
# intro: soft, slightly sad pad (problem) until "solução"
sol = T['w_solucao']
for k, (f, a) in enumerate([(220, 0), (174.6, 2.2), (196, 4.4), (164.8, 6.6)]):
    if a < sol - 0.3:
        d = min(2.4, sol - a); t = np.arange(int(SR * d)) / SR
        pad = sum(np.sin(2 * np.pi * f * m * t) / m for m in (1, 1.5, 2)) * 0.035 * np.minimum(1, t * 3) * np.minimum(1, (d - t) * 3)
        put(mix, lowp(pad.astype(np.float32), 1800), a + VSTART * 0.3)
boing(T['w_tenis'] + 0.1); ouch(T['w_machucam'] + 0.15)
# riser into the reveal
rd = 1.2; n = noise(rd); put(fx, hip(n, 1200) * np.linspace(0, 1, len(n)) ** 2 * 0.12, sol - rd + 0.1)
impact(sol + 0.05); whoosh(sol + 0.05, 0.6, 0.2); sparkle(sol + 0.2)
# upbeat beat from the reveal to the end (112 bpm)
bpm = 112; beat = 60 / bpm; t0 = sol + 0.05; k = 0
chords = [(261.6, 329.6, 392.0), (220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (196.0, 246.9, 293.7)]
while t0 + k * beat < T['end'] - 0.3:
    at = t0 + k * beat
    t = np.arange(int(SR * 0.35)) / SR
    put(mix, (np.sin(2 * np.pi * (50 + 110 * np.exp(-t * 30)) * t) * np.exp(-t * 9) * 0.45).astype(np.float32), at)        # kick
    put(mix, hip(noise(0.05), 7000) * np.exp(-np.arange(int(SR * 0.05)) / SR * 80) * 0.08, at + beat / 2)                  # hat
    if k % 2 == 1: put(mix, lowp(noise(0.18), 5000) * np.exp(-np.arange(int(SR * 0.18)) / SR * 22) * 0.12, at)             # clap
    if k % 4 == 0:
        ch = chords[(k // 4) % 4]
        for f in ch: put(mix, lowp(tone(f, beat * 4, 0.03, 0.8, 'saw'), 2200), at)
        put(mix, tone(ch[0] / 2, beat * 3.5, 0.12, 1.2), at)                                                                  # bass
    k += 1
for key in ('shot2', 'shot3', 'final'): whoosh(T[key], 0.45, 0.15)
sparkle(T['final'] + 0.4); pop(T['final'] + 1.0); pop(T['final'] + 1.6)
# fade out the end
fade = int(SR * 0.8); e = int(SR * T['end']); mix[e - fade:e] *= np.linspace(1, 0, fade); mix[e:] = 0; fx[e:] = 0
out = mix * 0.9 + fx
# duck the music under the voice
vv = np.zeros(N, np.float32); put(vv, v, VSTART)
out = out * (1 - 0.35 * (np.convolve(np.abs(vv), np.ones(4410) / 4410, 'same') > 0.01)) + vv
out = out[:int(SR * T['end'])]; out /= max(1, np.abs(out).max() / 0.95)
w = wave.open('audio/mix.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
print(json.dumps(T, indent=1)); print(' '.join(f"{w['text']}@{w['t0']}" for w in words))
