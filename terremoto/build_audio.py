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

# voices: narrator (natural), hero (high cartoon), friend (laid-back surfer, a bit lower and quicker)
LS = {'narr': '1.02', 'hero': '0.95', 'friend': '0.92'}
AF = {'narr': 'highpass=f=70,acompressor=threshold=0.1:ratio=3,volume=1.3',
      'hero': 'asetrate=22050*1.28,aresample=22050,atempo=0.85,volume=1.2',
      'friend': 'asetrate=22050*1.1,aresample=22050,atempo=0.98,volume=1.25'}
def tts_piper(text, out, voice):
    raw = out + '.raw.wav'
    subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', LS[voice], '--sentence-silence', '0.25'],
                   input=text.encode(), check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', AF[voice], '-ar', '44100', '-ac', '1', out], check=True)

# ElevenLabs: TTS=eleven python3 build_audio.py  (the API key is injected by the session's network proxy)
VOICES = json.load(open('voices.json')) if os.path.exists('voices.json') else {}
def tts_eleven(text, out, voice, prev='', nxt=''):
    import hashlib, urllib.request
    v = VOICES[voice]; os.makedirs('audio/cache', exist_ok=True)
    key = hashlib.sha1(json.dumps([text, v, VOICES.get('model_id'), VOICES.get('seed'), prev, nxt], sort_keys=True).encode()).hexdigest()[:16]
    mp3 = f'audio/cache/{voice}_{key}.mp3'
    if not os.path.exists(mp3):   # cached, so re-running does not spend credits again
        body = json.dumps({'text': text, 'model_id': VOICES.get('model_id', 'eleven_multilingual_v2'), 'seed': VOICES.get('seed', 4242),
                           'previous_text': prev, 'next_text': nxt,
                           'voice_settings': {'stability': v['stability'], 'similarity_boost': v['similarity_boost'], 'style': v.get('style', 0), 'use_speaker_boost': True}}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}?output_format=mp3_44100_128", data=body, method='POST',
                                     headers={'Content-Type': 'application/json', 'Accept': 'audio/mpeg', 'xi-api-key': os.environ.get('ELEVEN_KEY', 'proxy-injected')})
        with urllib.request.urlopen(req, timeout=120) as r: open(mp3, 'wb').write(r.read())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af', 'highpass=f=60,acompressor=threshold=0.12:ratio=2.5,volume=1.15', '-ar', '44100', '-ac', '1', out], check=True)

def tts(text, out, voice, prev='', nxt=''):
    return tts_eleven(text, out, voice, prev, nxt) if os.environ.get('TTS') == 'eleven' else tts_piper(text, out, voice)

def chunks(text, maxc=42):
    parts = [p.strip() for p in re.findall(r'[^,.?!:]+[,.?!:]*', text) if p.strip()]
    out = []
    pieces = []
    for p in parts:   # split clauses that are too long on their own, at word boundaries
        p = p.rstrip(','); cur = ''
        for w in p.split():
            if cur and len(cur) + len(w) + 1 > maxc: pieces.append(cur); cur = w
            else: cur = (cur + ' ' + w).strip()
        if cur: pieces.append(cur)
    for p in pieces:
        if out and len(out[-1]) + len(p) + 1 <= maxc and not out[-1].endswith(('.', '?', '!', ':')):
            out[-1] += ' ' + p
        else: out.append(p)
    return out

def ctx(i, step):
    j = i + step
    while 0 <= j < len(S):
        if S[j]['voice'] == S[i]['voice']: return S[j]['text']
        j += step
    return ''
segs = []; t = 0.0
for i, s in enumerate(S):
    v = np.zeros(1, np.float32)
    if s['voice'] != 'none':
        f = f'audio/v{i:02d}.wav'; tts(s['text'], f, s['voice'], ctx(i, -1), ctx(i, 1)); v = readwav(f)
        nz = np.where(np.abs(v) > 0.01)[0]
        if len(nz): v = v[max(0, nz[0] - 200): nz[-1] + 2000]
    lead = s.get('lead', 0.25); vl = len(v) / SR if s['voice'] != 'none' else 0
    dur = max(s.get('min', 0), lead + vl + s.get('tail', 0.5))
    g = dict(scene=s['scene'], voice=s['voice'], start=round(t, 3), dur=round(dur, 3), vstart=round(t + lead, 3), vdur=round(vl, 3), audio=v)
    caps = []
    if s['voice'] != 'none' and not s.get('nocap'):
        if s['voice'] != 'narr' and len(s['text']) <= 44:
            cs = [s['text']]
        else:
            cs = chunks(s['text'])
        tot = sum(len(c) + 6 for c in cs); acc = t + lead
        for c in cs:
            d = vl * (len(c) + 6) / tot
            txt = c if s['voice'] == 'narr' else '“' + c + '”'   # characters speak in quotes
            caps.append(dict(t0=acc, t1=acc + d, text=txt, who=s['voice'])); acc += d
    g['caps'] = caps
    segs.append(g); t += dur
    print(f"{s['scene']:9s} start {g['start']:6.2f} dur {dur:5.2f}")
T = t; N = int(T * SR) + SR
seg = {g['scene']: g for g in segs}
T0 = lambda n: seg[n]['start']; TE = lambda n: seg[n]['start'] + seg[n]['dur']
VS = lambda n: seg[n]['vstart']; VE = lambda n: seg[n]['vstart'] + seg[n]['vdur']

voice = np.zeros(N, np.float32); heroV = np.zeros(N, np.float32); friendV = np.zeros(N, np.float32)
for g in segs:
    if g['voice'] == 'none': continue
    a = int(g['vstart'] * SR); x = g['audio']
    voice[a:a + len(x)] += x
    if g['voice'] == 'hero': heroV[a:a + len(x)] += x
    if g['voice'] == 'friend': friendV[a:a + len(x)] += x

rng = np.random.default_rng(3); tt = np.arange(N) / SR
noise = rng.standard_normal(N).astype(np.float32)
def band(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def lowp(x, f): b, a = butter(2, f / (SR / 2)); return lfilter(b, a, x)
def gate(a, b, fade=0.5):
    e = ((tt >= a) & (tt < b)).astype(np.float32); k = max(1, int(fade * SR))
    return np.convolve(e, np.ones(k) / k, 'same')
def put(buf, x, at):
    i = int(at * SR)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0: buf[i:i + n] += x[:n]
amb = np.zeros(N, np.float32); mus = np.zeros(N, np.float32); fx = np.zeros(N, np.float32)

allcaps = [c for g in segs for c in g['caps']]
def capT(word, scene):
    a, b = T0(scene), TE(scene)
    for c in allcaps:
        if a <= c['t0'] < b and word in c['text'].lower(): return c['t0']
    return a

# ---------------- sound helpers ----------------
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
def scratch(at, amp=0.25):
    n = int(0.35 * SR); x = np.arange(n) / SR; f = 300 + 900 * np.abs(np.sin(2 * np.pi * 3 * x))
    put(fx, band(rng.standard_normal(n), 500, 4000) * np.sin(2 * np.pi * np.cumsum(f) / SR) * amp * np.exp(-x * 4), at)
def boom(at, amp=0.6, f=45):
    n = int(2.5 * SR); x = np.arange(n) / SR
    put(fx, (np.sin(2 * np.pi * f * x * (1 - 0.15 * x / 2.5)) * np.exp(-x * 1.6) + lowp(rng.standard_normal(n), 200) * np.exp(-x * 3) * 0.8) * amp, at)
def pad(a, b, notes, amp=0.03):
    e = gate(a, b, 1.5)
    for m in notes:
        f = 440 * 2 ** ((m - 69) / 12)
        mus[:] += (np.sin(2 * np.pi * f * tt + 0.3 * np.sin(2 * np.pi * 0.2 * tt)) + 0.3 * np.sin(2 * np.pi * 2.003 * f * tt)) * e * amp
def blip(at, f=880, amp=0.08, d=0.12):
    n = int(d * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * (f + 600 * x / d) * x) * np.exp(-x * 30) * amp, at)
def whoosh(at, dur=1.2, lo=300, hi=3000, amp=0.25):
    n = int(dur * SR); x = np.arange(n) / SR; nz = rng.standard_normal(n); out = np.zeros(n, np.float32); steps = 24
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps; f = lo * (hi / lo) ** (k / steps)
        out[a:b] = band(nz[max(0, a - 2000):b], f * 0.7, min(f * 1.4, 20000))[-(b - a):]
    put(fx, out * np.sin(np.pi * x / dur) ** 1.5 * amp, at)
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
def ding(at, amp=0.12, notes=(1318, 988)):
    for k, f in enumerate(notes):
        n = int(0.6 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.7 * f * x)) * np.exp(-x * 5) * amp, at + k * 0.28)
def honk(at, amp=0.12, dur=0.35, f=420):
    n = int(dur * SR); x = np.arange(n) / SR; s = np.sign(np.sin(2 * np.pi * f * x)) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.26 * x)) * 0.5
    put(fx, lowp(s, 2500) * np.minimum(1, x * 60) * np.minimum(1, (dur - x) * 40) * amp, at)
def glubs(at, k=5, amp=0.18):
    for i in range(k):
        n = int(0.12 * SR); x = np.arange(n) / SR; f = 300 + 500 * x / 0.12 + rng.random() * 200
        put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 25) * amp, at + i * 0.22 + rng.random() * 0.08)
def wavecrash(at, amp=0.8, dur=2.2):
    n = int(dur * SR); x = np.arange(n) / SR
    put(fx, (lowp(rng.standard_normal(n), 1200) + band(rng.standard_normal(n), 1500, 6000) * 0.4) * np.minimum(1, x * 6) * np.exp(-x * 1.2) * amp, at); boom(at, amp * 0.7, 40)
def step(at, amp=0.12):
    n = int(0.08 * SR); x = np.arange(n) / SR; put(fx, (lowp(rng.standard_normal(n), 700) * 1.5 + np.sin(2 * np.pi * 90 * x)) * np.exp(-x * 45) * amp, at)
def slide(at, f0, f1, dur=0.6, amp=0.12):
    n = int(dur * SR); x = np.arange(n) / SR; f = f0 + (f1 - f0) * (x / dur) ** 1.3
    put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / dur) * amp, at)

def drums(a, b, bpm=150, amp=0.18):
    beat = 60 / bpm; k = 0; tb = a
    while tb < b:
        n = int(0.25 * SR); x = np.arange(n) / SR
        if k % 2 == 0: put(mus, np.sin(2 * np.pi * (60 + 80 * np.exp(-x * 30)) * x) * np.exp(-x * 9) * amp, tb)
        if k % 4 == 2: put(mus, band(rng.standard_normal(n), 1000, 6000) * np.exp(-x * 18) * amp * 0.8, tb)
        put(mus, band(rng.standard_normal(int(0.04 * SR)), 6000, 12000) * np.exp(-np.arange(int(0.04 * SR)) / SR * 90) * amp * 0.35, tb + beat / 2)
        put(mus, pluck([40, 40, 43, 40, 45, 43, 40, 38][k % 8], beat * 0.9, amp * 0.5, 4), tb)
        k += 1; tb += beat

# ---------------- ambience ----------------
def chip(a, b, amp=0.025, bpm=132):
    """8-bit video game loop (square waves)"""
    beat = 60 / bpm; mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74]; tb = a; k = 0
    while tb < b:
        f = 440 * 2 ** ((mel[k % 16] - 69) / 12); n = int(beat / 2 * 0.9 * SR); x = np.arange(n) / SR
        put(mus, np.sign(np.sin(2 * np.pi * f * x)) * np.exp(-x * 6) * amp, tb)
        if k % 4 == 0: f2 = 440 * 2 ** ((mel[k % 16] - 24 - 69) / 12); n2 = int(beat * 1.8 * SR); x2 = np.arange(n2) / SR; put(mus, np.sign(np.sin(2 * np.pi * f2 * x2)) * np.exp(-x2 * 3) * amp * 0.7, tb)
        k += 1; tb += beat / 2
room = lowp(noise, 120) * 0.03 + band(noise, 2000, 6000) * 0.004
amb += room * (1 - gate(T0('explain'), TE('scale'), 0.5))
def rumble_bed(a, b, amp, fade=0.8):
    e = gate(a, b, fade)
    amb[:] += (lowp(noise, 90) * 1.8 * (0.75 + 0.25 * np.sin(2 * np.pi * 6 * tt)) + band(noise, 90, 400) * 0.35) * e * amp
def clinks(a, b, rate=7, amp=0.06):
    k = a
    while k < b:
        n = int(0.08 * SR); x = np.arange(n) / SR; f = 2500 + rng.random() * 2500
        put(fx, np.sin(2 * np.pi * f * x) * np.exp(-x * 60) * amp * (0.5 + rng.random()), k); k += 1 / rate * (0.5 + rng.random())
def thud(at, amp=0.3):
    n = int(0.3 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) + lowp(rng.standard_normal(n), 500) * np.exp(-x * 25) * 0.6) * amp, at)
def glassbreak(at, amp=0.3):
    n = int(0.9 * SR); x = np.arange(n) / SR
    put(fx, band(rng.standard_normal(n), 3000, 12000) * np.exp(-x * 6) * amp, at)
    for i in range(12):
        m = int(0.06 * SR); y = np.arange(m) / SR; put(fx, np.sin(2 * np.pi * (3000 + rng.random() * 4000) * y) * np.exp(-y * 50) * amp * 0.5, at + rng.random() * 0.5)
def bonk(at, amp=0.35):
    n = int(0.25 * SR); x = np.arange(n) / SR; f = 600 * np.exp(-x * 8) + 180
    put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) * amp, at)
def tweets(at, k=6, amp=0.05):
    for i in range(k):
        n = int(0.09 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * np.cumsum(2400 + 900 * np.sin(2 * np.pi * 30 * x)) / SR) * np.sin(np.pi * x / 0.09) * amp, at + i * 0.16)

chip(0.3, T0('shake') + 1.1, 0.02)
uke(0.3, T0('shake') + 1.1, 0.04)
for at in [3.0, 9.5, 14.0]: put(fx, np.sin(2 * np.pi * np.cumsum(np.linspace(2600, 2100, int(0.25 * SR))) / SR) * np.sin(np.pi * np.arange(int(0.25 * SR)) / (0.25 * SR)) * 0.02, at)   # birds outside
# ---------------- the quake ----------------
s0 = T0('shake') + 0.9
scratch(s0 + 0.15)
rumble_bed(s0, TE('pause') - 0.3, 0.5); boom(s0, 0.6, 38)
clinks(s0 + 0.3, TE('friend1'), 9, 0.05)
cl = capT('livros', 'shake')
for k in range(6): thud(cl + 0.3 + k * 0.18 + rng.random() * 0.1, 0.22)
glassbreak(capT('lustre', 'shake') + 0.2, 0.12)
# explanation: plates creaking, snap, waves
pad(T0('explain'), TE('scale'), [45, 52, 57, 60], 0.022)
for at in np.arange(T0('explain') + 0.5, TE('scale') - 0.5, 60 / 90): put(mus, pluck(81, 0.15, 0.02, 30), at)
ct = capT('travam', 'explain')
n = int(2.5 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 200, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * x)) * np.minimum(1, x) * 0.18, ct)
cs = capT('soltam', 'explain'); crack(cs, 0.5); boom(cs, 0.6, 40); rumble(cs, 1.5, 0.5)
co = capT('ondas', 'explain')
for k in range(4): whoosh(co + k * 0.45, 0.8, 200, 1200, 0.12)
for k, at in enumerate([capT('quatro', 'scale'), capT('sete', 'scale')]): blip(at, 700 + k * 300, 0.08); 
rumble(capT('sete', 'scale') + 0.4, 1.2, 0.4)
# bad idea: run outside -> bonk -> replay
ding(VE('run1') - 0.2, 0.08, (1046, 1318))
for k, at in enumerate(np.arange(T0('run2') + 0.2, TE('run2'), 0.19)): step(at, 0.1 if k % 2 else 0.13)
rumble_bed(T0('run2'), TE('bonk'), 0.35)
b0 = T0('bonk'); slide(b0 + 0.1, 1800, 400, 0.8, 0.1); bonk(b0 + 0.95, 0.45); thud(b0 + 0.95, 0.25); tweets(b0 + 1.2)
r = T0('replay'); n = int((seg['replay']['dur'] - 0.3) * SR); x = np.arange(n) / SR
put(fx, band(rng.standard_normal(n), 2000, 7000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * x))) * 0.12 + np.sin(2 * np.pi * np.cumsum(900 + 500 * np.sin(2 * np.pi * 3 * x)) / SR) * 0.05, r + 0.15)
scratch(r, 0.3); slide(TE('replay') - 0.35, 1500, 300, 0.35, 0.08)
# the right move: still shaking while they take cover
ding(VS('idea') - 0.15, 0.12, (1568, 2093))
rumble_bed(T0('idea'), TE('rule') - 0.5, 0.4)
clinks(T0('idea'), TE('rule') - 1, 5, 0.04)
for k in range(5): thud(T0('rule') + 1.2 + k * 1.7 + rng.random() * 0.5, 0.15)
pad(T0('rule'), TE('outside'), [50, 57, 62], 0.016)
# outside tips: street noise, brakes
amb += band(noise, 300, 2500) * gate(T0('outside'), TE('outside'), 0.8) * 0.04
brk = capT('dirigindo', 'outside'); n = int(0.9 * SR); x = np.arange(n) / SR
put(fx, np.sin(2 * np.pi * np.cumsum(2200 + 300 * np.sin(2 * np.pi * 40 * x)) / SR) * np.exp(-x * 2.5) * np.minimum(1, x * 30) * 0.06 + band(rng.standard_normal(n), 1000, 5000) * np.exp(-x * 3) * 0.08, brk + 0.4)
# shaking stops, then an aftershock (friend bumps his head)
rumble_bed(T0('stop') - 0.2, T0('stop') + 1.2, 0.25, 1.0)
a0 = T0('after') + 0.2; rumble(a0, 1.2, 0.6); boom(a0, 0.4, 42); bonk(a0 + 0.35, 0.35); clinks(a0, a0 + 1.0, 10, 0.05)
# gas: hiss, lighter click, fwoomp, sad trombone
hiss = band(noise, 3000, 9000) * gate(T0('gas1'), T0('gas3') + 0.6, 0.6) * 0.03; amb += hiss
g0 = T0('gas3') + 0.5
for k in range(2): n = int(0.03 * SR); put(fx, band(rng.standard_normal(n), 3000, 9000) * 0.3, g0 + k * 0.25)
n = int(0.9 * SR); x = np.arange(n) / SR; put(fx, lowp(rng.standard_normal(n), 700) * np.minimum(1, x * 25) * np.exp(-x * 4) * 0.7, g0 + 0.55); boom(g0 + 0.55, 0.45, 50)
for k, (m, d_) in enumerate([(55, 0.45), (54, 0.45), (53, 0.45), (52, 1.1)]):
    f = 440 * 2 ** ((m - 69) / 12); n = int(d_ * SR); x = np.arange(n) / SR
    put(mus, (np.sin(2 * np.pi * f * x + 0.25 * np.sin(2 * np.pi * 5 * x * (k == 3))) + 0.5 * np.sin(4 * np.pi * f * x) + 0.25 * np.sin(6 * np.pi * f * x)) * np.minimum(1, x * 20) * np.exp(-x * 1.2) * 0.07, g0 + 1.9 + k * 0.45)
# exit by the stairs, outdoor ambience, coast callback
for k, at in enumerate(np.arange(T0('exit') + 0.4, TE('exit') - 2.5, 0.19)): step(at, 0.1 if k % 2 else 0.13)
amb += (band(noise, 150, 2500) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 5.5)) ** 3) * 0.12) * gate(TE('exit') - 2.5, TE('coast2'), 1.0)
boom(VE('coast') - 0.2, 0.5, 45)
drums(T0('coast2'), TE('coast2'), 150, 0.16)
# ending gag
uke(T0('q1'), T0('q2'), 0.05, 104)
chip(T0('q2'), T0('crack') + 0.3, 0.025)
rumble_bed(T0('q3'), TE('ohoh'), 0.3, 1.2)
c0 = T0('crack') + 0.2
for k in range(4): crack(c0 + k * 0.32, 0.25)
scratch(T0('ohoh') + 0.05); slide(VE('ohoh') + 0.05, 700, 250, 0.7, 0.1)
x0 = T0('crash') + 1.0; crack(x0 - 0.75, 0.45); crack(x0 - 0.55, 0.35); slide(x0 - 0.5, 900, 200, 0.5, 0.1); bonk(x0 + 0.02, 0.4); bonk(x0 + 0.1, 0.35); boom(x0, 0.9, 38); n = int(2.0 * SR); x = np.arange(n) / SR
put(fx, (lowp(rng.standard_normal(n), 1500) + band(rng.standard_normal(n), 2000, 7000) * 0.3) * np.minimum(1, x * 30) * np.exp(-x * 2.2) * 0.8, x0)
for k in range(8): thud(x0 + 0.2 + k * 0.17 + rng.random() * 0.1, 0.18)
for k in range(3): n = int(0.18 * SR); y = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 400, 3000) * np.exp(-y * 12) * 0.12, x0 + 2.0 + k * 0.4)   # cough cough
for k, m in enumerate([60, 64, 67, 72]): put(mus, pluck(m, 1.5, 0.06, 2.5), T0('end') + 0.6 + k * 0.12)
uke(T0('end') + 1.4, T, 0.04, 104)

# ---------------- mix ----------------
venv = np.convolve(np.abs(voice), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same'); duck = 1 - np.clip(venv * 5, 0, 0.55)
mix = voice * 1.0 + (amb + mus) * duck + fx * (1 - np.clip(venv * 2, 0, 0.3))
mix *= np.clip((T - tt) / 1.2, 0, 1)
mix = np.tanh(mix * 1.15) * 0.92
wo = wave.open('audio/mix.wav', 'wb'); wo.setnchannels(1); wo.setsampwidth(2); wo.setframerate(SR)
wo.writeframes((mix[:int(T * SR)] * 32767).astype(np.int16).tobytes()); wo.close()

def env(x):
    out = []
    for f in range(int(T * FPS)):
        a = int(f / FPS * SR); s = x[a:a + SR // FPS]
        out.append(round(float(min(1, np.sqrt(np.mean(s ** 2)) * 8)) if len(s) else 0, 3))
    return out
caps = [dict(t0=round(c['t0'], 3), t1=round(c['t1'], 3), text=c['text'], who=c['who']) for c in allcaps]
json.dump(dict(total=round(T, 3), fps=FPS, segs=[{k: v for k, v in g.items() if k not in ('audio', 'caps')} for g in segs],
               caps=caps, heroMouth=env(heroV), friendMouth=env(friendV)), open('timeline.json', 'w'))
print('total', round(T, 2))
