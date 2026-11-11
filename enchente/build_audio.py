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
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af', f"highpass=f=60,acompressor=threshold=0.12:ratio=2.5,volume=1.15,atempo={os.environ.get('SPEED', '1.0')}", '-ar', '44100', '-ac', '1', out], check=True)

def tighten(v, keep=0.16, min_gap=0.22):
    """shorten long silences inside a spoken line (pauses between sentences): TIGHT=1"""
    hop = int(SR * 0.01); n = len(v) // hop
    env = np.array([np.sqrt(np.mean(v[k * hop:(k + 1) * hop] ** 2)) for k in range(n)])
    quiet = env < max(0.01, env.max() * 0.04)
    out, k = [], 0
    while k < n:
        j = k
        while j < n and quiet[j] == quiet[k]: j += 1
        if quiet[k] and (j - k) * 0.01 > min_gap and k > 0 and j < n:
            kn = int(keep / 0.01); out.append(v[k * hop:(k + kn // 2) * hop]); out.append(v[(j - kn // 2) * hop:j * hop])
        else: out.append(v[k * hop:j * hop])
        k = j
    out.append(v[n * hop:])
    return np.concatenate(out).astype(np.float32)

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
        if os.environ.get('TIGHT'): v = tighten(v); wo_ = wave.open(f, 'wb'); wo_.setnchannels(1); wo_.setsampwidth(2); wo_.setframerate(SR); wo_.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); wo_.close()
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
def thud(at, amp=0.3):
    n = int(0.3 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) + lowp(rng.standard_normal(n), 500) * np.exp(-x * 25) * 0.6) * amp, at)
def bonk(at, amp=0.35):
    n = int(0.25 * SR); x = np.arange(n) / SR; f = 600 * np.exp(-x * 8) + 180
    put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) * amp, at)
def thunder(at, amp=0.5):
    n = int(3.2 * SR); x = np.arange(n) / SR
    put(fx, (lowp(rng.standard_normal(n), 300) * 2.0 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * x) ** 2) + band(rng.standard_normal(n), 300, 2000) * 0.25 * np.exp(-x * 6)) * np.minimum(1, x * 20) * np.exp(-x * 1.1) * amp, at)
def rain_bed(a, b, amp, fade=1.0):
    e = gate(a, b, fade)
    amb[:] += (band(noise, 1500, 9000) * 0.9 + lowp(noise, 400) * 0.5) * e * amp
def flow_bed(a, b, amp, fade=0.8):
    e = gate(a, b, fade)
    amb[:] += (lowp(noise, 600) * 1.2 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * tt)) + band(noise, 600, 3000) * 0.35) * e * amp
def zap(at, dur=0.9, amp=0.16):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 120 * x)) * (0.5 + 0.5 * (rng.random(n) > 0.6))
    put(fx, (lowp(s, 3000) * 0.7 + band(rng.standard_normal(n), 2000, 8000) * 0.5) * (0.4 + 0.6 * (np.sin(2 * np.pi * 17 * x) > 0)) * np.minimum(1, (dur - x) * 10) * amp, at)
def clack(at, amp=0.3):
    n = int(0.12 * SR); x = np.arange(n) / SR; put(fx, (band(rng.standard_normal(n), 1500, 6000) + np.sin(2 * np.pi * 900 * x)) * np.exp(-x * 60) * amp, at)
def clank(at, amp=0.3):
    for f in (520, 1310, 2210):
        n = int(0.9 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * f * x) * np.exp(-x * 5) * amp / 3, at)
    thud(at, amp * 0.8)
def dtmf(at, digits, amp=0.06):
    T_ = {'1': (697, 1209), '9': (852, 1477), '3': (697, 1477)}
    for k, d in enumerate(digits):
        n = int(0.16 * SR); x = np.arange(n) / SR; f1, f2 = T_[d]; put(fx, (np.sin(2 * np.pi * f1 * x) + np.sin(2 * np.pi * f2 * x)) * amp, at + k * 0.22)
def motor(a, b, amp=0.05):
    e = gate(a, b, 0.6); fx[:] += (np.sign(np.sin(2 * np.pi * 48 * tt + 0.3 * np.sin(2 * np.pi * 7 * tt))) * 0.5 + lowp(noise, 300)) * e * amp
def trombone(at, amp=0.07):
    for k, (m, d_) in enumerate([(55, 0.45), (54, 0.45), (53, 0.45), (52, 1.1)]):
        f = 440 * 2 ** ((m - 69) / 12); n = int(d_ * SR); x = np.arange(n) / SR
        put(mus, (np.sin(2 * np.pi * f * x + 0.25 * np.sin(2 * np.pi * 5 * x * (k == 3))) + 0.5 * np.sin(4 * np.pi * f * x) + 0.25 * np.sin(6 * np.pi * f * x)) * np.minimum(1, x * 20) * np.exp(-x * 1.2) * amp, at + k * 0.45)

# ---------------- story ----------------
R0 = T0('rain') + 0.9                                     # the downpour starts
room = lowp(noise, 120) * 0.03
amb += room * (1 - gate(T0('explain'), TE('depth'), 0.5))
uke(0.3, R0 + 0.3, 0.04)
rain_bed(0, R0, 0.025, 1.0)                               # gentle rain on the window
rain_bed(R0 - 0.2, T0('end') + 0.5, 0.06, 0.8)            # heavy rain for the rest
thunder(R0, 0.6); thunder(T0('friend1') + 0.2, 0.35); thunder(T0('idea') - 0.6, 0.3); thunder(T0('wait') + 0.5, 0.3)
flow_bed(capT('rio', 'rain'), TE('pause') - 0.3, 0.12)
n = int(2.0 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 300, 2500) * np.minimum(1, x * 3) * 0.12, capT('porta', 'rain'))   # water seeping in
# explanation
pad(T0('explain'), TE('depth'), [45, 52, 57, 60], 0.022)
for at in np.arange(T0('explain') + 0.5, TE('depth') - 0.5, 60 / 90): put(mus, pluck(81, 0.15, 0.02, 30), at)
glubs(capT('lixo', 'explain') + 0.6, 4, 0.14)
whoosh(capT('rios', 'explain') + 0.6, 1.2, 200, 1500, 0.2); splash(capT('rios', 'explain') + 1.2, 0.25)
blip(capT('quinze', 'depth') + 0.2, 900, 0.08); slide(capT('derrubam', 'depth') + 0.1, 900, 300, 0.5, 0.08); splash(capT('derrubam', 'depth') + 0.55, 0.25)
# bad idea: drive away -> the car floats off -> replay
ding(VE('car1') - 0.2, 0.08, (1046, 1318))
flow_bed(T0('car1'), TE('carfloat'), 0.14)
motor(T0('car2') + 1.5, T0('carfloat') + 0.6, 0.04)
c0 = T0('carfloat'); slide(c0 + 0.2, 500, 1200, 0.6, 0.08); glubs(c0 + 0.5, 5, 0.14)
for k in range(3): honk(c0 + 1.2 + k * 0.45, 0.1)
splash(c0 + 0.3, 0.3)
r = T0('replay'); n = int((seg['replay']['dur'] - 0.3) * SR); x = np.arange(n) / SR
put(fx, band(rng.standard_normal(n), 2000, 7000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * x))) * 0.12 + np.sin(2 * np.pi * np.cumsum(900 + 500 * np.sin(2 * np.pi * 3 * x)) / SR) * 0.05, r + 0.15)
scratch(r, 0.3); slide(TE('replay') - 0.35, 1500, 300, 0.35, 0.08)
# the right move
ding(VS('idea') - 0.15, 0.12, (1568, 2093))
pad(T0('rule'), TE('kit'), [50, 57, 62], 0.016)
clack(capT('energia', 'rule') + 0.5, 0.35)
for k, at in enumerate(np.arange(capT('suba para', 'rule'), capT('nunca', 'rule'), 0.19)): step(at, 0.1 if k % 2 else 0.13)
flow_bed(capT('nunca', 'rule') - 0.2, TE('rule'), 0.18)
for k, w_ in enumerate(['documentos', 'lanterna', 'água e', 'remédios']): blip(capT(w_, 'kit') + 0.2, 800 + k * 150, 0.07)
flow_bed(T0('outside'), TE('hidden'), 0.16)
glubs(capT('túneis', 'outside') + 0.5, 6, 0.12)
clank(capT('arrancar', 'hidden') + 0.6, 0.35); splash(capT('arrancar', 'hidden') + 0.6, 0.3)
n = int(2.4 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 200, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 4 * x)) * np.sin(np.pi * x / 2.4) * 0.14, capT('esconde', 'hidden'))   # whirlpool
# gag: the friend steps into the hidden manhole
flow_bed(T0('gag1'), TE('gag3'), 0.12)
g0 = T0('gag2')
for k in range(4): splash(g0 + 0.15 + k * 0.35, 0.12, 0.3)
slide(g0 + 1.45, 1400, 250, 0.5, 0.12); splash(g0 + 1.95, 0.45, 1.0); boom(g0 + 1.95, 0.25, 60); glubs(g0 + 2.1, 4, 0.16)
splash(g0 + 2.9, 0.35, 0.7); bloop(g0 + 2.95, 200, 700, 0.12)
trombone(TE('gag2') - 1.0 + 0.2, 0.06)
bloop(capT('xixi', 'germs') + 0.2, 500, 250, 0.08, 0.4)
dtmf(capT('noventa', 'wait'), '193'); dtmf(capT('nove,', 'wait') + 0.3, '199')
motor(T0('wait') + 2.0, TE('wait'), 0.03)
zap(capT('fio', 'wire') + 0.2, 1.4, 0.15); crack(capT('fio', 'wire') + 0.2, 0.3)
# ending gag
uke(T0('q1'), T0('q2'), 0.05, 104)
pad(T0('q2'), T0('rise'), [57, 60, 64], 0.015)   # the movie on TV
flow_bed(T0('q3'), TE('ohoh'), 0.1)
n = int(seg['rise']['dur'] * SR); x = np.arange(n) / SR; put(fx, lowp(rng.standard_normal(n), 500) * np.minimum(1, x) * 0.3, T0('rise')); glubs(T0('rise') + 0.4, 5, 0.1)
scratch(T0('ohoh') + 0.05); slide(VE('ohoh') + 0.05, 700, 250, 0.7, 0.1)
x0 = T0('float'); n = int(seg['float']['dur'] * SR); x = np.arange(n) / SR; put(fx, lowp(rng.standard_normal(n), 400) * np.exp(-x * 0.4) * 0.3, x0)
bonk(x0 + 1.6, 0.4); bonk(x0 + 1.7, 0.35); glubs(x0 + 2.4, 8, 0.18); glubs(x0 + 4.2, 4, 0.14)
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
