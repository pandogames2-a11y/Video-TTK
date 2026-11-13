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
# two ElevenLabs accounts: each key is a network secret of the cloud environment, one per host (same API, same voices)
ELEVEN_HOSTS = os.environ.get('ELEVEN_HOSTS', 'api.elevenlabs.io,api.us.elevenlabs.io').split(',')
def tts_eleven(text, out, voice, prev='', nxt=''):
    import hashlib, urllib.request, urllib.error
    v = VOICES[voice]; os.makedirs('audio/cache', exist_ok=True)
    key = hashlib.sha1(json.dumps([text, v, VOICES.get('model_id'), VOICES.get('seed'), prev, nxt], sort_keys=True).encode()).hexdigest()[:16]
    mp3 = f'audio/cache/{voice}_{key}.mp3'
    if not os.path.exists(mp3):   # cached, so re-running does not spend credits again
        body = json.dumps({'text': text, 'model_id': VOICES.get('model_id', 'eleven_multilingual_v2'), 'seed': VOICES.get('seed', 4242),
                           'previous_text': prev, 'next_text': nxt,
                           'voice_settings': {'stability': v['stability'], 'similarity_boost': v['similarity_boost'], 'style': v.get('style', 0), 'use_speaker_boost': True}}).encode()
        last = None
        for host in ELEVEN_HOSTS:   # account 1, then account 2 when the first one is out of credits
            req = urllib.request.Request(f"https://{host}/v1/text-to-speech/{v['voice_id']}?output_format=mp3_44100_128", data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'Accept': 'audio/mpeg', 'xi-api-key': os.environ.get('ELEVEN_KEY', 'proxy-injected')})
            try:
                with urllib.request.urlopen(req, timeout=120) as r: open(mp3, 'wb').write(r.read())
                break
            except urllib.error.HTTPError as e:
                last = f"{host}: {e.code} {e.read()[:200]!r}"; print('ElevenLabs', last)
        else: raise SystemExit('ElevenLabs sem créditos nas duas contas: ' + str(last))
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

# exact word times (from audio/words.json of the previous alignment of this same audio), so effects land on the word
import unicodedata
WORDS = json.load(open('audio/words.json')) if os.path.exists('audio/words.json') else []
def _norm(w): return re.sub(r'[^a-zà-ú]', '', w.lower())
def wT(prefix, scene):
    a = T0(scene)
    for w in WORDS:
        if w['t0'] >= a - 0.01 and _norm(w['text']).startswith(prefix): return w['t0']
    return capT(prefix, scene)

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
def correct(at, amp=0.11):
    for k, f in enumerate([1046, 1318, 1568, 2093]):
        n = int(0.5 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2 * f * x)) * np.exp(-x * 7) * amp, at + k * 0.075)
    for k in range(10):
        n = int(0.06 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * (3000 + rng.random() * 3000) * x) * np.exp(-x * 60) * amp * 0.4, at + 0.3 + k * 0.04 + rng.random() * 0.03)
def wrong(at, amp=0.12):
    for k, f in enumerate([233, 175]):
        n = int(0.32 * SR); x = np.arange(n) / SR; sq = np.sign(np.sin(2 * np.pi * f * x)) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.01 * x)) * 0.4
        put(fx, lowp(sq, 1400) * np.minimum(1, x * 50) * np.minimum(1, (0.32 - x) * 25) * amp, at + k * 0.3)
def popin(at, amp=0.08): bloop(at, 300, 900, amp, 0.14)
def swoosh(at, amp=0.12): whoosh(at, 0.35, 800, 5000, amp)
def fire_bed(a, b, amp, fade=0.6):   # crackling fire: low roar + random pops
    e = gate(a, b, fade)
    amb[:] += (lowp(noise, 250) * 1.4 * (0.7 + 0.3 * np.sin(2 * np.pi * 1.3 * tt)) + band(noise, 2000, 7000) * (rng.random(N) > 0.997) * 4) * e * amp
def fwoosh(at, amp=0.5, dur=1.2):
    n = int(dur * SR); x = np.arange(n) / SR
    put(fx, (lowp(rng.standard_normal(n), 900) * 1.5 + band(rng.standard_normal(n), 900, 4000) * 0.5) * np.minimum(1, x * 25) * np.exp(-x * 2.5) * amp, at); boom(at, amp * 0.5, 55)
def sizzle(a, b, amp=0.05):
    e = gate(a, b, 0.3); fx[:] += band(noise, 3000, 10000) * (0.6 + 0.4 * (rng.random(N) > 0.5)) * e * amp
def ringtone(at, amp=0.07, k=3):
    for i in range(k):
        for j, f in enumerate([1318, 1568, 1976, 1568]):
            n = int(0.12 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * f * x) * np.exp(-x * 8) * amp, at + i * 0.8 + j * 0.13)
def alarm(a, b, amp=0.045):   # smoke alarm: three quick beeps, repeat
    tb = a
    while tb < b:
        for k in range(3):
            n = int(0.18 * SR); x = np.arange(n) / SR; put(fx, np.sign(np.sin(2 * np.pi * 3150 * x)) * np.minimum(1, (0.18 - x) * 40) * amp, tb + k * 0.3)
        tb += 1.6
def cough(at, amp=0.14, k=3):
    for i in range(k):
        n = int(0.16 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 300, 2500) * np.exp(-x * 14) * amp, at + i * 0.3)
def siren(a, b, amp=0.06):
    n = int((b - a) * SR); x = np.arange(n) / SR; f = 700 + 300 * (np.sin(2 * np.pi * 0.5 * x) > 0)
    put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, x * 2) * np.minimum(1, (b - a - x) * 2) * amp, a)
def trombone(at, amp=0.07):
    for k, (m, d_) in enumerate([(55, 0.45), (54, 0.45), (53, 0.45), (52, 1.1)]):
        f = 440 * 2 ** ((m - 69) / 12); n = int(d_ * SR); x = np.arange(n) / SR
        put(mus, (np.sin(2 * np.pi * f * x + 0.25 * np.sin(2 * np.pi * 5 * x * (k == 3))) + 0.5 * np.sin(4 * np.pi * f * x) + 0.25 * np.sin(6 * np.pi * f * x)) * np.minimum(1, x * 20) * np.exp(-x * 1.2) * amp, at + k * 0.45)
def dtmf(at, digits, amp=0.06):
    T_ = {'1': (697, 1209), '9': (852, 1477), '3': (697, 1477)}
    for k, d in enumerate(digits):
        n = int(0.16 * SR); x = np.arange(n) / SR; f1, f2 = T_[d]; put(fx, (np.sin(2 * np.pi * f1 * x) + np.sin(2 * np.pi * f2 * x)) * amp, at + k * 0.22)
def clack(at, amp=0.3):
    n = int(0.12 * SR); x = np.arange(n) / SR; put(fx, (band(rng.standard_normal(n), 1500, 6000) + np.sin(2 * np.pi * 900 * x)) * np.exp(-x * 60) * amp, at)
def clank(at, amp=0.3):
    for f in (520, 1310, 2210):
        n = int(0.9 * SR); x = np.arange(n) / SR; put(fx, np.sin(2 * np.pi * f * x) * np.exp(-x * 5) * amp / 3, at)
def thud(at, amp=0.3):
    n = int(0.3 * SR); x = np.arange(n) / SR; put(fx, (np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) + lowp(rng.standard_normal(n), 500) * np.exp(-x * 25) * 0.6) * amp, at)
def rewind(seg_name):
    r = T0(seg_name); n = int((seg[seg_name]['dur'] - 0.3) * SR); x = np.arange(n) / SR
    put(fx, band(rng.standard_normal(n), 2000, 7000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * x))) * 0.12 + np.sin(2 * np.pi * np.cumsum(900 + 500 * np.sin(2 * np.pi * 3 * x)) / SR) * 0.05, r + 0.15)
    scratch(r, 0.3); slide(TE(seg_name) - 0.35, 1500, 300, 0.35, 0.08)

def glassbreak(at, amp=0.3):
    n = int(0.9 * SR); x = np.arange(n) / SR
    put(fx, band(rng.standard_normal(n), 3000, 12000) * np.exp(-x * 6) * amp, at)
    for i in range(14):
        m = int(0.06 * SR); y = np.arange(m) / SR; put(fx, np.sin(2 * np.pi * (3000 + rng.random() * 4000) * y) * np.exp(-y * 50) * amp * 0.5, at + rng.random() * 0.6)
def zap(at, dur=0.6, amp=0.14):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 120 * x)) * (0.5 + 0.5 * (rng.random(n) > 0.6))
    put(fx, (lowp(s, 3000) * 0.7 + band(rng.standard_normal(n), 2000, 8000) * 0.5) * (0.4 + 0.6 * (np.sin(2 * np.pi * 17 * x) > 0)) * np.minimum(1, (dur - x) * 10) * amp, at)
def spray(a, b, amp=0.07):
    e = gate(a, b, 0.15); fx[:] += band(noise, 2500, 9000) * e * amp
def brass(at, notes, amp=0.06, d=0.9):
    for m in notes:
        f = 440 * 2 ** ((m - 69) / 12); n = int(d * SR); x = np.arange(n) / SR
        put(mus, (np.sign(np.sin(2 * np.pi * f * x)) * 0.3 + np.sin(2 * np.pi * f * x) * 0.7) * np.minimum(1, x * 15) * np.exp(-x * 1.5) * amp, at)

F0 = wT('incêndio', 'fire')               # the fire breaks out downstairs
room = lowp(noise, 120) * 0.03 + band(noise, 2000, 6000) * 0.003
amb += room * (1 - gate(T0('explain'), TE('explain'), 0.5))
uke(0.3, F0 - 0.5, 0.04)
chip(0.3, F0 - 0.5, 0.018)
for k in range(3): zap(wT('curto', 'fire') + k * 0.25, 0.3, 0.12)
fwoosh(F0, 0.55); glassbreak(wT('minutos', 'fire'), 0.18); fwoosh(wT('prédio', 'fire'), 0.5, 1.6)
fire_bed(F0, T0('explain'), 0.25); fire_bed(T0('exit1'), TE('blast') - 1.0, 0.22); fire_bed(T0('real'), TE('gag3'), 0.12)
alarm(F0 + 0.8, T0('explain') - 0.2); alarm(T0('exit1'), TE('crawl'))
drums(T0('friend1'), TE('friend1'), 150, 0.12)
# explanation
pad(T0('explain'), TE('explain'), [45, 52, 57, 60], 0.022)
for at in np.arange(T0('explain') + 0.5, TE('explain') - 0.5, 60 / 90): put(mus, pluck(81, 0.15, 0.02, 30), at)
for w_ in ['calor', 'combustível', 'oxigênio', 'fumaça']: swoosh(wT(w_, 'explain') - 0.3, 0.07)
clank(wT('sem', 'explain') + 0.1, 0.18); put(fx, lowp(rng.standard_normal(int(0.8 * SR)), 500) * np.exp(-np.arange(int(0.8 * SR)) / SR * 5) * 0.2, wT('apaga', 'explain'))
for k in range(12): bloop(wT('oxigênio', 'explain') + 0.2 + k * 0.2, 400 + 30 * k, 700, 0.025, 0.1)
fwoosh(wT('calor', 'explain'), 0.2)
# round 1: getting out
APPEAR = [T0('exit1') + 0.3, wT('abaixa', 'idea'), T0('suit') + 0.6, wT('opção', 'real')]
for at in APPEAR: popin(at)
wrong(wT('não', 'exit2'))
for sc in ['crawl', 'real']: correct(wT('assim', sc))
ding(T0('exit1') + 0.3, 0.06, (1046, 1318))
slide(wT('energia', 'exit2'), 900, 200, 0.8, 0.1)
cough(wT('caixa', 'exit2'), 0.12, 3)
rewind('replay')   # VHS rewind noise
E0 = T0('elevgag'); cough(E0 + 0.5, 0.12, 2); cough(TE('elevgag') - 0.6, 0.12, 2)
ding(VS('idea') - 0.15, 0.12, (1568, 2093))
for k, at in enumerate(np.arange(T0('crawl') + 0.4, TE('crawl') - 0.8, 0.28)): step(at, 0.06)
# clothes on fire: an ember falls on the friend's back
slide(T0('roll') + 0.1, 1500, 500, 0.6, 0.08); fwoosh(T0('roll') + 0.7, 0.2)
for k, at in enumerate(np.arange(wT('correr', 'roll'), wT('pare', 'roll'), 0.16)): step(at, 0.1)
for k in range(4): thud(wT('role', 'roll') + 0.1 + k * 0.28, 0.12)
# option 1: suit up, grab the extinguishers, put the whole building out
s0 = T0('suit')
drums(s0, TE('suit'), 120, 0.14)
for k, m in enumerate([[50, 57, 62], [53, 60, 65], [55, 62, 67], [57, 64, 69], [58, 65, 70], [60, 67, 72]]): brass(s0 + 0.3 + k * 1.0, m, 0.045)
drums(T0('blast'), TE('blast'), 120, 0.14)
n = int(0.25 * SR); x = np.arange(n) / SR; put(fx, band(rng.standard_normal(n), 2000, 6000) * (np.sin(2 * np.pi * 30 * x) > 0) * 0.12, wT('vestir', 'suit') + 0.3)   # zip
clank(wT('extintores', 'suit') + 0.3, 0.3)
spray(wT('apagar', 'suit') - 0.2, TE('blast') - 0.4, 0.08)
correct(wT('inteiro', 'suit') + 0.4, 0.09)
# option 2: the real one
dtmf(wT('cento', 'real'), '193')
siren(wT('cento', 'real') + 0.8, TE('real') + 0.5, 0.05)
# ending: out the window
uke(T0('q1'), T0('q3'), 0.05, 104)
scratch(T0('ohoh') + 0.05); slide(VE('ohoh') + 0.05, 700, 250, 0.7, 0.1)
j0 = T0('jump')
for k, at in enumerate(np.arange(j0 + 0.05, j0 + 0.65, 0.12)): step(at, 0.12)
glassbreak(j0 + 0.75, 0.4); whoosh(j0 + 0.9, 1.4, 1500, 300, 0.2); slide(j0 + 0.9, 1400, 250, 1.3, 0.1)
boom(j0 + 2.35, 0.35, 60); thud(j0 + 2.35, 0.4); fwoosh(j0 + 2.45, 0.25)
trombone(j0 + 2.9, 0.06)
for k, m in enumerate([60, 64, 67, 72]): put(mus, pluck(m, 1.5, 0.06, 2.5), T0('end') + 0.5 + k * 0.12)
uke(T0('end') + 1.2, T, 0.04, 104)

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
