import json, wave, re, subprocess, os
import numpy as np
from scipy.signal import lfilter, butter

SR = 44100; FPS = 30
D = 'tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium'
os.makedirs('audio', exist_ok=True)
S = json.load(open('script.json'))

def readwav(f):
    w = wave.open(f); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    t = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t, np.arange(len(x)) / sr, x).astype(np.float32)

def tts(text, out, voice):
    raw = out + '.raw.wav'
    ls = {'narr': '1.02', 'hero': '0.95', 'tourist': '1.25'}[voice]
    subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', ls, '--sentence-silence', '0.25'],
                   input=text.encode(), check=True, capture_output=True)
    af = {'narr': 'highpass=f=70,acompressor=threshold=0.1:ratio=3,volume=1.3',
          'hero': 'asetrate=22050*1.28,aresample=22050,atempo=0.85,volume=1.2',
          'tourist': 'asetrate=22050*0.86,aresample=22050,atempo=1.05,volume=1.2'}[voice]
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', '44100', '-ac', '1', out], check=True)

def chunks(text, maxc=42):
    parts = [p.strip() for p in re.findall(r'[^,.?!:]+[,.?!:]*', text) if p.strip()]
    out = []
    for p in parts:
        p = p.rstrip(',')
        if out and len(out[-1]) + len(p) + 1 <= maxc and not out[-1].endswith(('.', '?', '!')):
            out[-1] += ' ' + p
        else: out.append(p)
    return out

segs = []; t = 0.0
for i, s in enumerate(S):
    v = np.zeros(1, np.float32)
    if s['voice'] != 'none':
        f = f'audio/v{i:02d}.wav'; tts(s['text'], f, s['voice']); v = readwav(f)
        # trim silence edges
        nz = np.where(np.abs(v) > 0.01)[0]
        if len(nz): v = v[max(0, nz[0] - 200): nz[-1] + 2000]
    lead = s.get('lead', 0.25); vl = len(v) / SR if s['voice'] != 'none' else 0
    dur = max(s.get('min', 0), lead + vl + s.get('tail', 0.5))
    g = dict(scene=s['scene'], voice=s['voice'], start=round(t, 3), dur=round(dur, 3), vstart=round(t + lead, 3), vdur=round(vl, 3), audio=v)
    caps = []
    if s['voice'] != 'none' and not s.get('nocap'):
        if 'cap' in s: caps = [dict(t0=t + lead, t1=t + lead + vl + 0.3, text=s['cap'], who=s['voice'])]
        else:
            cs = chunks(s['text']); tot = sum(len(c) + 6 for c in cs); acc = t + lead
            for c in cs:
                d = vl * (len(c) + 6) / tot; caps.append(dict(t0=acc, t1=acc + d, text=c, who='narr')); acc += d
    g['caps'] = caps
    segs.append(g); t += dur
    print(f"{s['scene']:9s} start {g['start']:6.2f} dur {dur:5.2f}")
T = t; N = int(T * SR) + SR
seg = {g['scene']: g for g in segs}
T0 = lambda n: seg[n]['start']; TE = lambda n: seg[n]['start'] + seg[n]['dur']

voice = np.zeros(N, np.float32); heroV = np.zeros(N, np.float32); tourV = np.zeros(N, np.float32)
for g in segs:
    a = int(g['vstart'] * SR); x = g['audio']
    if g['voice'] == 'none': continue
    voice[a:a + len(x)] += x
    if g['voice'] == 'hero': heroV[a:a + len(x)] += x
    if g['voice'] == 'tourist': tourV[a:a + len(x)] += x

rng = np.random.default_rng(3); tt = np.arange(N) / SR
noise = rng.standard_normal(N).astype(np.float32)
def band(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def lowp(x, f): b, a = butter(2, f / (SR / 2)); return lfilter(b, a, x)
def gate(a, b, fade=0.5):
    e = ((tt >= a) & (tt < b)).astype(np.float32); k = max(1, int(fade * SR))
    return np.convolve(e, np.ones(k) / k, 'same')
def put(buf, x, at):
    i = int(at * SR); n = min(len(x), N - i)
    if n > 0: buf[i:i + n] += x[:n]

amb = np.zeros(N, np.float32); mus = np.zeros(N, np.float32); fx = np.zeros(N, np.float32)
# ---- ambience: surf + wind (calm part, and again in the gag & end)
surf = band(noise, 150, 2500) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 5.5)) ** 3) * 0.13
wind = band(rng.standard_normal(N), 300, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 9 + 1)) * 0.05
calm = gate(0, T0('recede') + 1.5, 1.0) + gate(T0('end'), T, 1.0)
amb += (surf + wind) * calm
# sea being sucked back: rising hiss + gurgle
suck = gate(T0('recede') + 1.2, T0('recede') + 5.5, 0.8)
amb += band(noise, 400, 3000) * suck * 0.10 * np.clip((tt - T0('recede') - 1.2) / 4, 0, 1)
# seagulls
def gull(dur=0.5, f0=1700, f1=1100):
    n = int(dur * SR); x = np.arange(n) / SR; f = np.linspace(f0, f1, n) + 60 * np.sin(2 * np.pi * 25 * x)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * x / dur) ** 0.6 * 0.045
for at in [1.5, 3.2, 3.6, 6.0, 9.4, 9.8, 10.2, 13.0, 16.5, 17.0]:
    if at < T0('recede'): put(fx, gull(0.35 + rng.random() * 0.3, 1500 + rng.random() * 600, 1000 + rng.random() * 300), at)
for at in np.arange(T0('end') + 0.5, T, 1.7): put(fx, gull(0.4), at)
# fish flopping slaps
for at in np.arange(T0('recede') + 5, T0('twist'), 0.37):
    n = int(0.05 * SR); put(fx, band(rng.standard_normal(n), 800, 5000) * np.exp(-np.arange(n) / SR * 80) * 0.15 * rng.random(), at)

# ---- music helpers
def pluck(m, dur, amp, decay=5.0):
    f = 440 * 2 ** ((m - 69) / 12); n = int(dur * SR); x = np.arange(n) / SR
    return ((np.sin(2 * np.pi * f * x) + 0.45 * np.sin(4 * np.pi * f * x) + 0.2 * np.sin(6 * np.pi * f * x)) * np.exp(-x * decay) * amp).astype(np.float32)
def uke(a, b, amp=0.05, bpm=104):
    beat = 60 / bpm; chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; k = 0; tb = a
    while tb < b:
        ch = chords[(k // 8) % 4]; pat = [0, 2, 1, 2, 0, 2, 1, 2]; m = ch[pat[k % 8]] + (12 if k % 8 in (2, 6) else 0)
        put(mus, pluck(m, 0.6, amp), tb)
        if k % 8 == 0: put(mus, pluck(ch[0] - 24, 1.2, amp * 1.6, 3), tb)
        if k % 4 == 2: put(mus, band(rng.standard_normal(int(0.06 * SR)), 2000, 8000) * np.exp(-np.arange(int(0.06 * SR)) / SR * 60) * amp * 0.6, tb)
        k += 1; tb += beat / 2
uke(0.3, T0('recede') + 1.2, 0.05)
# abrupt stop -> record scratch at "de repente"
def scratch(at):
    n = int(0.35 * SR); x = np.arange(n) / SR; f = 300 + 900 * np.abs(np.sin(2 * np.pi * 3 * x))
    put(fx, band(rng.standard_normal(n), 500, 4000) * np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.exp(-x * 4), at)
scratch(T0('recede') + 1.1)
# comedic plinks for fish/dinner
uke(T0('fish') + 0.2, TE('dinner'), 0.045, 120)
# twist: boom + drone
def boom(at, amp=0.6, f=45):
    n = int(2.5 * SR); x = np.arange(n) / SR
    put(fx, (np.sin(2 * np.pi * f * x * (1 - 0.15 * x / 2.5)) * np.exp(-x * 1.6) + lowp(rng.standard_normal(n), 200) * np.exp(-x * 3) * 0.8) * amp, at)
boom(seg['twist']['vstart'] + seg['twist']['vdur'] - 0.4, 0.7)
# mysterious pad for explanations
def pad(a, b, notes, amp=0.03):
    e = gate(a, b, 1.5)
    for m in notes:
        f = 440 * 2 ** ((m - 69) / 12)
        mus[:] += (np.sin(2 * np.pi * f * tt + 0.3 * np.sin(2 * np.pi * 0.2 * tt)) + 0.3 * np.sin(2 * np.pi * 2.003 * f * tt)) * e * amp
pad(T0('explain'), TE('retreat'), [45, 52, 57, 60], 0.022)
# pulsing tick under explain
for at in np.arange(T0('explain') + 0.5, TE('retreat') - 0.5, 60 / 90):
    put(mus, pluck(81, 0.15, 0.02, 30), at)
# horizon: rising drone + distant rumble
e = gate(T0('horizon'), TE('ficha'), 1.0) * np.clip((tt - T0('horizon')) / (TE('ficha') - T0('horizon')), 0, 1)
mus += (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 58.3 * tt) + 0.3 * np.sin(2 * np.pi * 110 * tt)) * e * 0.06
amb += lowp(noise, 150) * gate(T0('horizon'), TE('building'), 1.5) * 0.35 * np.clip((tt - T0('horizon')) / 30, 0.2, 1)
boom(T0('horizon') + 4.0, 0.35, 38)
# heartbeat in ficha
hb = T0('ficha') + 0.3; rate = 1.0
while hb < seg['ficha']['vstart'] + seg['ficha']['vdur'] - 1.0:
    for d, a in [(0, 0.5), (0.18, 0.35)]:
        n = int(0.15 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * 50 * x) * np.exp(-x * 25) * a, hb + d)
    hb += 0.85 / rate; rate *= 1.07
# silence moment at "pra onde?" then action drums
def drums(a, b, bpm=150, amp=0.18):
    beat = 60 / bpm; k = 0; tb = a
    while tb < b:
        n = int(0.25 * SR); x = np.arange(n) / SR
        if k % 2 == 0: put(mus, np.sin(2 * np.pi * (60 + 80 * np.exp(-x * 30)) * x) * np.exp(-x * 9) * amp, tb)
        if k % 4 == 2: put(mus, band(rng.standard_normal(n), 1000, 6000) * np.exp(-x * 18) * amp * 0.8, tb)
        put(mus, band(rng.standard_normal(int(0.04 * SR)), 6000, 12000) * np.exp(-np.arange(int(0.04 * SR)) / SR * 90) * amp * 0.35, tb + beat / 2)
        bass = [40, 40, 43, 40, 45, 43, 40, 38][k % 8]
        put(mus, pluck(bass, beat * 0.9, amp * 0.5, 4), tb)
        k += 1; tb += beat
drums(T0('answer') - 0.05, TE('building'), 150, 0.16)
boom(T0('answer') - 0.05, 0.5, 50)
# hit: massive roar
e = gate(T0('hit') + 0.6, TE('safe'), 1.0) * np.clip(1 - (tt - T0('hit')) / (TE('safe') - T0('hit')) * 0.75, 0.2, 1)
amb += (lowp(noise, 500) * 1.2 + band(noise, 700, 5000) * 0.35) * e * 0.5
boom(T0('hit') + 1.2, 0.9, 35)
for k in range(5):
    n = int(0.4 * SR); put(fx, lowp(rng.standard_normal(n), 900) * np.exp(-np.arange(n) / SR * 8) * 0.4, T0('hit') + 2.5 + k * 0.9 + rng.random() * 0.3)
pad(T0('safe') + 1, TE('safe'), [57, 60, 64], 0.02)
# gag: happy ukulele, then scratch + wave + bubbles
uke(T0('q1'), seg['swallow']['start'] + 0.6, 0.05, 104)
amb += (surf * 0.8) * gate(T0('q2'), T0('swallow') + 0.6, 0.6)
amb += lowp(noise, 300) * gate(T0('q3'), T0('swallow') + 0.8, 1.2) * 0.35 * np.clip((tt - T0('q3')) / 3, 0, 1)
scratch(T0('swallow') + 0.55)
n = int(2.2 * SR); x = np.arange(n) / SR
put(fx, (lowp(rng.standard_normal(n), 1200) * 1.0 + band(rng.standard_normal(n), 1500, 6000) * 0.4) * np.minimum(1, x * 6) * np.exp(-x * 1.2) * 0.8, T0('swallow') + 0.75)
boom(T0('swallow') + 0.75, 0.6, 40)
for k in range(7):
    n = int(0.12 * SR); x = np.arange(n) / SR; f = 300 + 500 * x / 0.12 + rng.random() * 200
    put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 25) * 0.18, T0('swallow') + 2.4 + k * 0.22 + rng.random() * 0.08)
# end sting
for k, m in enumerate([60, 64, 67, 72]): put(mus, pluck(m, 1.5, 0.06, 2.5), T0('end') + 0.6 + k * 0.12)
uke(T0('end') + 1.4, T, 0.04, 104)


# ================= extra sound design =================
allcaps = [c for g in segs for c in g['caps']]
def capT(word, scene):
    a, b = T0(scene), TE(scene)
    for c in allcaps:
        if a <= c['t0'] < b and word in c['text'].lower(): return c['t0']
    return a
def blip(at, f=880, amp=0.08, d=0.12):
    n = int(d * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * (f + 600 * x / d) * x) * np.exp(-x * 30) * amp, at)
def whoosh(at, dur=1.2, lo=300, hi=3000, amp=0.25, rise=True):
    n = int(dur * SR); x = np.arange(n) / SR; nz = rng.standard_normal(n)
    out = np.zeros(n, np.float32); steps = 24
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps; u = k / steps if rise else 1 - k / steps
        f = lo * (hi / lo) ** u; seg_ = band(nz[max(0, a - 2000):b], f * 0.7, min(f * 1.4, 20000))[-(b - a):]; out[a:b] = seg_
    env = np.sin(np.pi * x / dur) ** 1.5; put(fx, out * env * amp, at)
def splash(at, amp=0.3, dur=0.8):
    n = int(dur * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 600, 7000) * np.exp(-x * 6) * np.minimum(1, x * 40) * amp, at)
def buzzer(at, amp=0.12, dur=0.5):
    n = int(dur * SR); x = np.arange(n) / SR; sq = np.sign(np.sin(2 * np.pi * 110 * x)) * 0.6 + np.sign(np.sin(2 * np.pi * 116 * x)) * 0.4
    put(fx, lowp(sq, 1800) * np.minimum(1, (dur - x) * 20) * amp, at)
def rumble(at, dur=1.6, amp=0.5):
    n = int(dur * SR); x = np.arange(n) / SR; e = np.minimum(1, x * 8) * np.exp(-x * 1.5)
    put(fx, (lowp(rng.standard_normal(n), 120) * 2.2 * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * x)) + band(rng.standard_normal(n), 150, 600) * 0.4) * e * amp, at)
def crack(at, amp=0.35):
    n = int(0.25 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 1500, 9000) * np.exp(-x * 35) * amp + lowp(rng.standard_normal(n), 300) * np.exp(-x * 12) * amp, at)
def bloop(at, f0=200, f1=600, amp=0.12, d=0.35):
    n = int(d * SR); x = np.arange(n) / SR; f = f0 + (f1 - f0) * x / d; put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) * amp, at)
def jet(at, dur=2.6, amp=0.28):
    n = int(dur * SR); x = np.arange(n) / SR; u = x / dur
    hiss = band(rng.standard_normal(n), 900, 6000) * 0.6 + lowp(rng.standard_normal(n), 400) * 0.8
    tone = np.sin(2 * np.pi * np.cumsum(520 - 180 * np.tanh((u - 0.5) * 6)) / SR) * 0.15
    put(fx, (hiss + tone) * np.exp(-((u - 0.5) / 0.22) ** 2) * amp, at)
def ding(at, amp=0.12):
    for k, f in enumerate([1318, 988]):
        n = int(0.6 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.7 * f * x)) * np.exp(-x * 5) * amp, at + k * 0.28)

# --- explain: what is a tsunami
e0 = T0('explain'); pE = capT('oceano', 'explain'); pT = capT('alto-mar', 'explain'); pG = capT('costa', 'explain')
splash(e0 + 0.3, 0.25); whoosh(e0 + 0.15, 0.6, 400, 3000, 0.15)       # surf wave icon pops in
buzzer(e0 + 1.0, 0.13)                                               # red X
crack(pE + 0.3, 0.4); rumble(pE + 0.3, 1.8, 0.6)                     # seafloor quake
bloop(pE + 0.6, 150, 420, 0.14, 0.5); blip(pE + 0.35, 700)            # ocean pushed up + label
jet(pT - 0.1, 2.8, 0.3); blip(pT + 0.05, 990)                         # "velocidade de um avião"
for k in range(5): put(fx, band(rng.standard_normal(int(0.5 * SR)), 300, 1500) * np.sin(np.pi * np.arange(int(0.5 * SR)) / (0.5 * SR)) * 0.05, pT + 0.4 + k * 0.5)  # wave travelling
gdur = TE('explain') - pG - 0.8
whoosh(pG, max(1.5, gdur), 120, 1500, 0.35, True); blip(pG + 0.05, 600)  # slows down and grows
n = int(gdur * SR); x = np.arange(n) / SR; put(fx, lowp(rng.standard_normal(n), 250) * (x / gdur) ** 2 * 0.6, pG)
splash(TE('explain') - 0.9, 0.35, 1.0); boom(TE('explain') - 0.9, 0.35, 45)  # wall of water
# --- retreat: water pulled back + last warning
r0 = T0('retreat'); whoosh(r0 + 0.3, 2.2, 2500, 200, 0.3, True)
for k in range(8): put(fx, band(rng.standard_normal(int(0.04 * SR)), 1500, 6000) * np.exp(-np.arange(int(0.04 * SR)) / SR * 80) * 0.12, r0 + 1.6 + k * 0.33)
ding(r0 + 1.0, 0.13); ding(r0 + 2.0, 0.1)

# --- light suspense music while the wave approaches (horizon -> run)
s0, s1 = T0('horizon'), T0('answer')
eS = gate(s0 + 0.2, s1 - 0.1, 1.2)
for m, a in [(45, 0.025), (52, 0.018), (60, 0.012), (63, 0.010)]:   # A minor + b5 color, soft strings
    f = 440 * 2 ** ((m - 69) / 12)
    mus[:] += (np.sin(2 * np.pi * f * tt + 0.25 * np.sin(2 * np.pi * 5 * tt)) + 0.4 * np.sin(2 * np.pi * 2 * f * tt)) * eS * a * (0.75 + 0.25 * np.sin(2 * np.pi * tt / 3.1))
seq = [69, 72, 76, 75, 69, 72, 77, 76]   # creepy pizzicato ostinato
tb = s0 + 0.4; k = 0; beat = 60 / 84
while tb < s1 - 0.3:
    put(mus, pluck(seq[k % 8], 0.4, 0.035, 9), tb); tb += beat / 2; k += 1
for k, at in enumerate(np.arange(s0 + 0.4, s1 - 0.3, beat * 4)): put(mus, pluck(33, 2.0, 0.05, 1.5), at)   # low pulse

# --- "pra onde?" confusion: slide whistle + pops for the question marks
w0 = capT('pra onde', 'ficha')
n = int(0.7 * SR); x = np.arange(n) / SR; f = 500 + 700 * (x / 0.7) ** 1.5
put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.7) * 0.12, w0 - 0.1)
for i in range(10): bloop(w0 + i * 0.1, 500 + i * 60, 900 + i * 80, 0.07, 0.12)
n = int(1.2 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * (300 + 40 * np.sin(2 * np.pi * 6 * x)) * x) * np.exp(-x * 2) * 0.05, w0 + 0.3)   # wobbly "hmm"

# --- surfer: splash spray at the "som gostoso do mar" moment
st = capT('som gostoso', 'sunny'); splash(st + 0.2, 0.12, 1.0); splash(st + 1.2, 0.1, 1.0)

# ---- mix
venv = np.convolve(np.abs(voice), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same'); duck = 1 - np.clip(venv * 5, 0, 0.55)
mix = voice * 1.0 + (amb + mus) * duck + fx * (1 - np.clip(venv * 2, 0, 0.3))
fade = np.clip((T - tt) / 1.2, 0, 1); mix *= fade
mix = np.tanh(mix * 1.15) * 0.92
wo = wave.open('audio/mix.wav', 'wb'); wo.setnchannels(1); wo.setsampwidth(2); wo.setframerate(SR)
wo.writeframes((mix[:int(T * SR)] * 32767).astype(np.int16).tobytes()); wo.close()

def env(x):
    out = []
    for f in range(int(T * FPS)):
        a = int(f / FPS * SR); s = x[a:a + SR // FPS]
        out.append(round(float(min(1, np.sqrt(np.mean(s ** 2)) * 8)) if len(s) else 0, 3))
    return out
caps = [dict(t0=round(c['t0'], 3), t1=round(c['t1'], 3), text=c['text'], who=c['who']) for g in segs for c in g['caps']]
json.dump(dict(total=round(T, 3), fps=FPS, segs=[{k: v for k, v in g.items() if k not in ('audio', 'caps')} for g in segs],
               caps=caps, heroMouth=env(heroV), tourMouth=env(tourV)), open('timeline.json', 'w'))
print('total', round(T, 2))
