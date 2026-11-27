"""EP12 (menina do poço) audio: narration, sound effects, mix and timeline.
Default voice is the free local Piper voice (preview). Later: TTS=eleven for the final narrator.
Writes audio/mix.wav, timeline.json (scene times) and audio/words.json (time of each spoken word)."""
import json, wave, re, subprocess, os
import numpy as np
from scipy.signal import lfilter, butter

SR = 44100
D = '../tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium'
os.makedirs('audio', exist_ok=True)
S = json.load(open('script.json'))
rng = np.random.default_rng(5)

def readwav(f):
    w = wave.open(f); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    t = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t, np.arange(len(x)) / sr, x).astype(np.float32)

def tts_piper(text, out):
    raw = out + '.raw.wav'
    subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', '0.9', '--sentence-silence', '0.12'],
                   input=text.encode(), check=True, capture_output=True)
    # same preview narrator as EP5 (a bit deeper)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'asetrate=22050*0.92,aresample=22050,atempo=1.04,highpass=f=60,acompressor=threshold=0.1:ratio=3,volume=1.4',
                    '-ar', '44100', '-ac', '1', out], check=True)

# ElevenLabs narrator (TTS=eleven): "Will" — a calm, relaxed young man (the user asked for a calm ~20-year-old voice, not too high, not too deep).
# Uses the /with-timestamps endpoint, so every word gets its exact time (no extra alignment credits). The key is injected by the network proxy.
NARR = {'voice_id': 'bIHbv24MWmeRgasZH58o', 'name': 'Will', 'model_id': 'eleven_multilingual_v2', 'stability': 0.72, 'similarity_boost': 0.85, 'style': 0.0, 'seed': 4242}
ELEVEN_HOSTS = os.environ.get('ELEVEN_HOSTS', 'api.elevenlabs.io,api.us.elevenlabs.io').split(',')
def tts_eleven(text, out, prev='', nxt=''):
    import hashlib, urllib.request, urllib.error, base64
    os.makedirs('audio/cache', exist_ok=True)
    key = hashlib.sha1(json.dumps([text, NARR, prev, nxt], sort_keys=True).encode()).hexdigest()[:16]
    cj = f'audio/cache/{key}.json'
    if not os.path.exists(cj):
        body = json.dumps({'text': text, 'model_id': NARR['model_id'], 'seed': NARR['seed'], 'previous_text': prev, 'next_text': nxt,
                           'voice_settings': {'stability': NARR['stability'], 'similarity_boost': NARR['similarity_boost'], 'style': NARR['style'], 'use_speaker_boost': True}}).encode()
        err = None
        for host in ELEVEN_HOSTS:
            rq = urllib.request.Request(f"https://{host}/v1/text-to-speech/{NARR['voice_id']}/with-timestamps?output_format=mp3_44100_128", data=body, headers={'xi-api-key': 'proxy-injected', 'Content-Type': 'application/json'})
            try: d = json.load(urllib.request.urlopen(rq, timeout=120)); json.dump(d, open(cj, 'w')); err = None; break
            except urllib.error.HTTPError as e: err = f'{host}: {e.code} {e.read()[:200]}'
        if err: raise SystemExit('ElevenLabs: ' + err)
    d = json.load(open(cj)); mp3 = out + '.mp3'; open(mp3, 'wb').write(base64.b64decode(d['audio_base64']))
    sp = float(os.environ.get('SPEED', '1'))   # speed the narration up without changing the pitch (keeps the episode under 3 min)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af', f'atempo={sp}', '-ar', '44100', '-ac', '1', out], check=True)
    al = d.get('alignment') or d.get('normalized_alignment')
    return [(c, a / sp, b / sp) for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds'])]
ELEVEN = os.environ.get('TTS') == 'eleven'
ALIGN = {}

# ---- voices + timeline ----
segs, t = [], 0.0
voice = {}
for i, s in enumerate(S):
    lead, tail = s.get('lead', 0.25), s.get('tail', 0.35)
    if s['voice'] != 'none':
        f = f'audio/v{i:02d}.wav'; say = s.get('say', s['text'])
        if ELEVEN:
            vo = [k for k in range(len(S)) if S[k]['voice'] != 'none']; j = vo.index(i)
            prev = S[vo[j - 1]].get('say', S[vo[j - 1]]['text']) if j > 0 else ''; nxt = S[vo[j + 1]].get('say', S[vo[j + 1]]['text']) if j + 1 < len(vo) else ''
            ALIGN[i] = tts_eleven(say, f, prev, nxt)
        else: tts_piper(say, f)
        x = readwav(f); nz = np.where(np.abs(x) > 0.01)[0]; cut = max(0, nz[0] - 200); x = x[cut: nz[-1] + 2000]; voice[i] = x
        if i in ALIGN: ALIGN[i] = [(c, a - cut / SR, b - cut / SR) for c, a, b in ALIGN[i]]
        vd = len(x) / SR
    else: vd = 0
    dur = max(s.get('min', 0), lead + vd + tail)
    segs.append({'scene': s['scene'], 'voice': s['voice'], 'start': round(t, 3), 'dur': round(dur, 3), 'vstart': round(t + lead, 3), 'vdur': round(vd, 3)})
    t += dur
TOTAL = t
N = int(TOTAL * SR) + SR
voc = np.zeros(N, np.float32); fx = np.zeros(N, np.float32); mus = np.zeros(N, np.float32)
def put(buf, x, at):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[:len(buf) - i]; buf[i:i + len(x)] += x
for i, x in voice.items(): put(voc, x, segs[i]['vstart'])

# ---- word timings (no API): spread the words over the speech, longer words get more time, commas add a pause ----
words = []
for i, x in voice.items():
    if i in ALIGN:   # exact times from ElevenLabs: group the characters into words, then label them with the caption text
        g = segs[i]; ws, cur = [], None
        for c, a, b in ALIGN[i]:
            if c.isspace(): cur = None; continue
            if cur is None: cur = [a, b]; ws.append(cur)
            else: cur[1] = b
        toks = S[i]['text'].split()
        if len(ws) == len(toks):
            for w, (a, b) in zip(toks, ws): words.append({'seg': g['scene'], 'who': 'narr', 'text': w, 't0': round(g['vstart'] + a, 3), 't1': round(g['vstart'] + b, 3)})
            continue
        st = S[i].get('say', S[i]['text']).split()
        if len(ws) == len(st):   # caption differs from the spoken text (e.g. "2%" said as "dois por cento"): match equal words, spread the rest
            import difflib
            sm = difflib.SequenceMatcher(None, [x.lower() for x in toks], [x.lower() for x in st], autojunk=False)
            for op, a1, a2, b1, b2 in sm.get_opcodes():
                if op == 'equal':
                    for k in range(a2 - a1): words.append({'seg': g['scene'], 'who': 'narr', 'text': toks[a1 + k], 't0': round(g['vstart'] + ws[b1 + k][0], 3), 't1': round(g['vstart'] + ws[b1 + k][1], 3)})
                elif a2 > a1:
                    ta = ws[b1][0] if b2 > b1 else ws[max(0, b1 - 1)][1]; tb = ws[b2 - 1][1] if b2 > b1 else ta + 0.2
                    for k in range(a2 - a1): words.append({'seg': g['scene'], 'who': 'narr', 'text': toks[a1 + k], 't0': round(g['vstart'] + ta + (tb - ta) * k / (a2 - a1), 3), 't1': round(g['vstart'] + ta + (tb - ta) * (k + 1) / (a2 - a1), 3)})
            continue
        print('aviso: palavras não batem em', g['scene'], len(ws), len(toks))
    g = segs[i]; env = np.convolve(np.abs(x), np.ones(441) / 441, 'same'); on = np.where(env > env.max() * 0.08)[0]
    a, b = on[0] / SR, on[-1] / SR
    toks = S[i]['text'].split(); wts = [len(re.sub(r'\W', '', w)) + 2 + (3 if re.search(r'[,.?!…]$', w) else 0) for w in toks]
    tot = sum(wts); c = a
    for w, k in zip(toks, wts):
        d = (b - a) * k / tot; words.append({'seg': g['scene'], 'who': 'narr', 'text': w, 't0': round(g['vstart'] + c, 3), 't1': round(g['vstart'] + c + d * 0.8, 3)}); c += d
json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False, indent=0)
def T0(n): return next(g['start'] for g in segs if g['scene'] == n)
def TE(n): return next(g['start'] + g['dur'] for g in segs if g['scene'] == n)
def wT(prefix, scene): return next(w['t0'] for w in words if w['seg'] == scene and w['text'].lower().startswith(prefix))

# ---- sound design ----
def band(x, lo, hi): b, a_ = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a_, x)
def lowp(x, f): b, a_ = butter(2, f / (SR / 2)); return lfilter(b, a_, x)
def f32(x): return np.asarray(x, np.float32)
def tone(f, d, amp, decay=3.0):
    k = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * k) + 0.3 * np.sin(4 * np.pi * f * k)) * np.exp(-k * decay) * amp
def sting(at, amp=0.25):
    k = np.arange(int(1.8 * SR)) / SR; env = np.exp(-k * 1.6)
    x = sum(np.sign(np.sin(2 * np.pi * f * k)) * 0.25 for f in (233, 247, 349, 370)) * env * amp
    put(fx, f32(lowp(x, 3000)), at); put(fx, f32(np.sin(2 * np.pi * 55 * k) * np.exp(-k * 3) * amp * 2), at)
def whoosh(at, d=0.5, amp=0.15):
    n = int(d * SR); k = np.arange(n) / SR; put(fx, f32(band(rng.standard_normal(n), 400, 4000) * np.sin(np.pi * k / d) ** 2 * amp), at)
def buzz(at, amp=0.08):
    kk = np.arange(int(0.45 * SR)) / SR; put(fx, f32((np.sign(np.sin(2 * np.pi * 110 * kk)) * 0.5 + np.sign(np.sin(2 * np.pi * 116 * kk)) * 0.5) * amp * np.exp(-kk * 2)), at)
def thud(at, amp=0.25):
    kk = np.arange(int(0.4 * SR)) / SR; put(fx, f32(np.sin(2 * np.pi * 60 * kk) * np.exp(-kk * 12) * amp), at)
def click(at, amp=0.12):
    n = int(0.03 * SR); put(fx, f32(band(rng.standard_normal(n), 2000, 8000) * np.exp(-np.arange(n) / SR * 150) * amp), at)
def step(at, amp=0.07, grass=True):
    n = int(0.09 * SR); x = lowp(rng.standard_normal(n), 400) * 4 + (band(rng.standard_normal(n), 2000, 6000) * 0.6 if grass else 0)
    put(fx, f32(x * np.exp(-np.arange(n) / SR * 40) * amp), at)
def creak(at, d=0.9, amp=0.05):
    kk = np.arange(int(d * SR)) / SR; f = 180 + 60 * np.sin(2 * np.pi * 2.2 * kk) + 40 * kk
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * kk)) * np.sin(np.pi * kk / d)
    put(fx, f32(band(x, 300, 2500) * amp), at)
def breath(at, n=6, amp=0.12, gap=0.55):   # loud panting (in/out) for the buffalo joke
    for j in range(n):
        d = 0.32; m = int(d * SR); kk = np.arange(m) / SR
        x = band(rng.standard_normal(m), 500 if j % 2 else 300, 2500 if j % 2 else 1600) * np.sin(np.pi * kk / d) ** 1.5
        put(fx, f32(x * amp * (1.2 if j % 2 else 0.9)), at + j * gap)
def engine(a, b, amp=0.05):
    n = int((b - a) * SR); kk = np.arange(n) / SR; env = np.minimum(1, kk / 0.4) * np.minimum(1, (b - a - kk) / 0.6)
    x = np.sign(np.sin(2 * np.pi * (38 + 6 * np.sin(kk * 3)) * kk)) * 0.5 + rng.standard_normal(n) * 0.2
    put(fx, f32(lowp(x, 300) * env * amp), a)
def door_slam(at): thud(at, 0.3); click(at + 0.02, 0.15)
def bell(at, f0=196, amp=0.22, d=4.5):   # a deep church-bell "DONG": inharmonic partials with a long decay
    kk = np.arange(int(d * SR)) / SR
    x = sum(a_ * np.sin(2 * np.pi * f0 * r * kk) * np.exp(-kk * dec) for r, a_, dec in [(0.5, 0.5, 0.8), (1, 1, 1.0), (1.19, 0.6, 1.4), (1.5, 0.4, 1.8), (2, 0.35, 2.2), (2.52, 0.25, 3.0), (3.0, 0.15, 3.5)])
    put(fx, f32(x * amp / 2.5 * np.minimum(1, kk / 0.005)), at)
def growl(at, d=1.2, amp=0.12):   # a distorted, low, angry breath
    kk = np.arange(int(d * SR)) / SR; f = 70 + 15 * np.sin(2 * np.pi * 5 * kk)
    x = np.tanh(4 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * band(rng.standard_normal(len(kk)), 100, 900)) * np.sin(np.pi * kk / d)
    put(fx, f32(x * amp), at)
def heartbeat(a, b, amp=0.25, bpm=95):
    for at in np.arange(a, b, 60 / bpm): thud(at, amp); thud(at + 0.18, amp * 0.6)
def scream(at, d=1.0, amp=0.18):
    kk = np.arange(int(d * SR)) / SR; f0 = 420 + 160 * np.minimum(kk / 0.25, 1) + 18 * np.sin(2 * np.pi * 7 * kk); src = ((np.cumsum(f0) / SR) % 1.0) * 2 - 1
    x = band(src, 700, 900) * 1.6 + band(src, 1100, 1400) + band(src, 2400, 2900) * 0.5
    put(fx, f32(x * np.minimum(1, kk / 0.05) * np.minimum(1, (d - kk) / 0.3) * amp), at)
def static(at, d, amp=0.2):   # TV static (snow)
    n = int(d * SR); kk = np.arange(n) / SR; x = band(rng.standard_normal(n), 300, 9000) * (0.8 + 0.2 * np.sin(2 * np.pi * 60 * kk))
    put(fx, f32(x * amp * np.minimum(1, kk / 0.02) * np.minimum(1, (d - kk) / 0.05)), at)
def tv_on(at, amp=0.2):   # CRT power-on: a thunk + a high whine + static burst
    thud(at, amp); kk = np.arange(int(1.5 * SR)) / SR; put(fx, f32(np.sin(2 * np.pi * 7800 * kk) * 0.012 * np.exp(-kk * 1.5)), at); static(at + 0.05, 0.5, amp * 0.6)
def clunk(at):   # tape going into the VCR
    click(at, 0.2); thud(at + 0.05, 0.18); n = int(0.6 * SR); kk = np.arange(n) / SR
    put(fx, f32(band(np.sign(np.sin(2 * np.pi * 90 * kk)), 80, 600) * 0.03 * np.sin(np.pi * kk / 0.6)), at + 0.2); click(at + 0.8, 0.12)
def ring(a, b, amp=0.06):   # phone ringtone (two-tone trill) + vibration buzz
    for at in np.arange(a, b, 1.6):
        for j in range(8): put(fx, f32(tone(1320 if j % 2 else 1760, 0.07, amp, 8)), at + j * 0.075)
        n = int(0.5 * SR); kk = np.arange(n) / SR; put(fx, f32(np.sign(np.sin(2 * np.pi * 150 * kk)) * lowp(np.ones(n), 50) * 0.02), at)
def whisper(at, d=1.0, amp=0.08):   # breathy noise shaped like a whisper
    n = int(d * SR); kk = np.arange(n) / SR; x = band(rng.standard_normal(n), 1500, 6000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 2.5 * kk))) * np.sin(np.pi * kk / d)
    put(fx, f32(x * amp), at)
def ping(at, amp=0.05): put(fx, f32(tone(1568, 0.25, amp, 10)), at); put(fx, f32(tone(2093, 0.25, amp * 0.7, 10)), at + 0.06)
def crack(at, amp=0.12):   # bones cracking while she crawls
    for j in range(3): n = int(0.02 * SR); put(fx, f32(band(rng.standard_normal(n), 800, 5000) * np.exp(-np.arange(n) / SR * 200) * amp), at + j * 0.045)
def drag(at, d=0.5, amp=0.04):   # wet hair/cloth dragging on the floor
    n = int(d * SR); kk = np.arange(n) / SR; put(fx, f32(band(rng.standard_normal(n), 200, 1500) * np.sin(np.pi * kk / d) * amp), at)
def suspense(a, b, amp=1.0):   # dark detuned pad + tremolo strings swelling + low booms + ticking clock
    n = int((b - a) * SR); kk = np.arange(n) / SR; L = b - a
    env = np.minimum(1, kk / 1.2) * np.minimum(1, (L - kk) / 0.6)
    saw = lambda f: ((kk * f) % 1.0) * 2 - 1
    pad = lowp(saw(55) + saw(55.4) + 0.7 * saw(110.2) + 0.5 * saw(116.5) + 0.4 * saw(82.4), 520) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * kk))
    put(mus, f32(pad * env * 0.035 * amp), a)
    grow = (kk / L) ** 1.5; trem = 0.55 + 0.45 * np.sin(2 * np.pi * 11 * kk)
    st = sum(np.sin(2 * np.pi * f * kk + 0.3 * np.sin(2 * np.pi * 5.5 * kk)) for f in (659.3, 698.5, 987.8, 1046.5)) / 4
    put(mus, f32(band(st, 400, 4000) * trem * env * (0.008 + 0.05 * grow) * amp), a)
    for at in np.arange(0.4, L - 0.3, 1.5):
        m = int(0.9 * SR); q = np.arange(m) / SR; put(mus, f32(np.sin(2 * np.pi * (48 - 10 * q) * q) * np.exp(-q * 5) * (0.16 + 0.06 * at / L) * amp), a + at)
# ambience: quiet bedroom at night — low hum, a ticking clock, a creepy music-box at the start
k = np.arange(N) / SR
mus += f32(lowp(rng.standard_normal(N), 200) * 0.012)
mus += f32(np.sin(2 * np.pi * 60 * k) * 0.006)
for at in np.arange(0.2, N / SR - 1, 1.0):
    m = int(0.02 * SR); put(mus, f32(band(rng.standard_normal(m), 3000, 9000) * np.exp(-np.arange(m) / SR * 200) * 0.025), at)
bell(0.02, 147, 0.18)
suspense(0.0, T0('watch') + 0.6)
for j, f in enumerate([659, 587, 523, 494, 440]): put(mus, tone(f * 2, 0.7, 0.03, 3), T0('tape') + 0.3 + j * 0.55)   # eerie piano
ERR = [wT('assistiu', 'watch'), wT('postou', 'post'), wT('ajudar', 'help')]
for at in ERR: buzz(at, 0.1); thud(at, 0.3)
INS = wT('claro', 'watch') - 0.1; clunk(INS)   # tape into the VCR
static(ERR[0] + 0.3, 0.8, 0.05)
# the cursed video plays (low static under the narration), then it ends; the phone rings; the whisper
static(T0('watch') + 1.2, TE('watch') - T0('watch') - 1.2, 0.025)
RING = wT('tocou', 'call'); ring(RING - 0.2, RING + 1.6)
WH = wT('sete', 'call'); whisper(WH - 0.05, 0.9, 0.09); sting(WH + 0.1, 0.16)
heartbeat(WH + 0.4, TE('call'), 0.12, 80)
# posting: send whoosh + notification pings that speed up
whoosh(ERR[1] + 0.1, 0.35, 0.1)
for j in range(10): ping(ERR[1] + 0.5 + j * max(0.08, 0.3 - j * 0.025), 0.035)
# 7 days later: calendar flips, the TV turns on by itself, the well
for j in range(7): click(T0('days') + 0.15 + j * 0.13, 0.1)
TVON = wT('ligou', 'days'); tv_on(TVON)
static(TVON + 0.5, TE('crawl') - TVON - 0.5, 0.03)
suspense(TVON, TE('help'), 1.3)
CR0 = wT('saiu', 'crawl')
for at in np.arange(CR0, TE('crawl'), 0.42): crack(at, 0.1); drag(at + 0.1, 0.35, 0.04)
for at in np.arange(T0('help'), ERR[2], 0.5): drag(at, 0.4, 0.03)
heartbeat(T0('help'), TE('help') - 1.0, 0.14, 120)
GL = TE('help') - 1.0; static(GL, 1.0, 0.22); growl(GL, 1.0, 0.1); scream(GL + 0.1, 0.8, 0.12)
for j, f in enumerate([392, 370, 349, 330]): put(fx, f32(tone(f, 0.55 if j < 3 else 1.1, 0.06, 1.5)), wT('fita', 'end') + j * 0.42)   # sad trombone-ish
VIR = wT('viralizou', 'end')
for j in range(12): ping(VIR + j * 0.12, 0.03)
for i in range(3): whoosh(T0('cta') + 0.25 + i * 0.12, 0.2, 0.05)
# ---- mix (narration ducks the bed) ----
duck = np.ones(N, np.float32); env = np.convolve(np.abs(voc), np.ones(4410) / 4410, 'same'); duck -= np.clip(env * 6, 0, 0.5)
mix = voc * 1.0 + fx + mus * duck
mix = mix[:int(TOTAL * SR)]
mix = mix / max(1e-6, np.abs(mix).max()) * 0.9
with wave.open('audio/mix.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(TOTAL, 3), 'fps': 30, 'segs': segs, 'err': [round(x, 3) for x in ERR], 'ins': round(INS, 3), 'ring': round(RING, 3), 'tvon': round(TVON, 3), 'glitch': round(GL, 3)}, open('timeline.json', 'w'), indent=1)
for g in segs: print(f"{g['scene']:8s} start {g['start']:6.2f} dur {g['dur']:5.2f}")
print('total', round(TOTAL, 2))
