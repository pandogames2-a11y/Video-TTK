"""EP13 (boneca do batatinha frita + tênis Fila) audio: narration, sound effects, mix and timeline.
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

# ======== EP13 sound design ========
def suspense(a, b, amp=1.0):   # dark detuned pad + tremolo strings swelling + low booms + ticking (same family as EP11's opening)
    n = int((b - a) * SR); kk = np.arange(n) / SR; L = b - a
    env = np.minimum(1, kk / 1.0) * np.minimum(1, (L - kk) / 0.6)
    saw = lambda f: ((kk * f) % 1.0) * 2 - 1
    pad = lowp(saw(55) + saw(55.4) + 0.7 * saw(110.2) + 0.5 * saw(116.5) + 0.4 * saw(82.4), 520)
    put(mus, f32(pad * env * 0.035 * amp), a)
    st = sum(np.sin(2 * np.pi * f * kk + 0.3 * np.sin(2 * np.pi * 5.5 * kk)) for f in (659.3, 698.5, 987.8, 1046.5)) / 4
    put(mus, f32(band(st, 400, 4000) * (0.55 + 0.45 * np.sin(2 * np.pi * 11 * kk)) * env * (0.01 + 0.04 * (kk / L) ** 1.5) * amp), a)
    for at in np.arange(0.4, L - 0.3, 1.5):
        m = int(0.9 * SR); q = np.arange(m) / SR; put(mus, f32(np.sin(2 * np.pi * (48 - 10 * q) * q) * np.exp(-q * 5) * 0.14 * amp), a + at)
def grass_step(at, amp=0.05):   # running on grass: soft thump + short grassy swish
    m = int(0.1 * SR); q = np.arange(m) / SR
    put(fx, f32((lowp(rng.standard_normal(m), 220) * 3 * np.exp(-q * 40) + band(rng.standard_normal(m), 1500, 6000) * 0.5 * np.exp(-q * 30)) * amp * (0.8 + 0.4 * rng.random())), at)
def walk_steps(a, b, gap, amp=0.05, hard=False):
    for at in np.arange(a, b, gap):
        if hard: step(at, amp, False)
        else: grass_step(at, amp)
def music_box(a, b, amp=0.05):   # the doll's counting song: a slow music-box tune, slightly out of tune, looped
    notes = [67, 67, 64, 67, 69, 67, 64, 0, 62, 64, 67, 0, 60, 60, 0, 0]
    at, i = a, 0
    while at < b - 0.3:
        n = notes[i % len(notes)]
        if n:
            f = 440 * 2 ** ((n - 69) / 12) * 2 * (1 + 0.006 * np.sin(i)); d = 0.9; q = np.arange(int(d * SR)) / SR
            x = (np.sin(2 * np.pi * f * q) + 0.4 * np.sin(2 * np.pi * f * 2.76 * q) * np.exp(-q * 9) + 0.2 * np.sin(2 * np.pi * f * 5.4 * q) * np.exp(-q * 14)) * np.exp(-q * 4)
            put(mus, f32(x * amp), at)
        at += 0.26; i += 1
def creak_turn(at, amp=0.06): creak(at, 0.7, amp); thud(at + 0.65, 0.12)
def plim(at):
    for j, f in enumerate([1319, 1760]): put(fx, f32(tone(f, 0.45, 0.06, 6)), at + j * 0.08)
def squeak(at, amp=0.06):   # sneaker squeak / slip
    q = np.arange(int(0.25 * SR)) / SR; f = 1700 + 500 * np.sin(2 * np.pi * 6 * q); put(fx, f32(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-q * 8) * amp), at)
def scanner(a, d, amp=0.04):
    q = np.arange(int(d * SR)) / SR; x = np.sin(2 * np.pi * 220 * q) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * q)) + 0.3 * np.sin(2 * np.pi * 440.5 * q)
    put(fx, f32(x * amp * np.minimum(1, q / 0.2) * np.minimum(1, (d - q) / 0.3)), a)
def crowd(a, b, amp=0.02):   # people murmuring
    n = int((b - a) * SR); q = np.arange(n) / SR; x = band(rng.standard_normal(n), 300, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.7 * q) * np.sin(2 * np.pi * 0.6 * q))
    put(fx, f32(x * amp * np.minimum(1, q / 0.5) * np.minimum(1, (b - a - q) / 0.5)), a)

bell(0.02, 147, 0.16)
suspense(0.0, T0('dorm') + 0.4)
# street: his footsteps, the van arriving fast, brakes, sliding door, door slam, van leaving
walk_steps(T0('street'), wT('quando', 'street') + 0.6, 0.5, 0.05, True)
VAN_IN = wT('quando', 'street') - 0.4; VAN_STOP = wT('sequestrado', 'street') - 0.15
engine(VAN_IN - 0.6, VAN_STOP + 2.6, 0.07); squeak(VAN_STOP - 0.2, 0.05); thud(VAN_STOP, 0.1)
DOOR_O = VAN_STOP + 0.2; DOOR_C = VAN_STOP + 0.9; VAN_OUT = VAN_STOP + 1.2
whoosh(DOOR_O, 0.3, 0.12); click(DOOR_O + 0.25, 0.2); door_slam(DOOR_C); whoosh(VAN_OUT, 1.0, 0.08)
# dorm: room hum, waking up, murmuring
n = int((TE('told') - T0('dorm')) * SR); put(mus, f32(np.sin(2 * np.pi * 60 * np.arange(n) / SR) * 0.012), T0('dorm'))
crowd(T0('dorm') + 0.3, TE('told') - 0.2, 0.012)
SCR_ON = T0('told') + 0.2; put(fx, f32(tone(880, 0.25, 0.06, 6)), SCR_ON); put(fx, f32(tone(660, 0.4, 0.05, 4)), SCR_ON + 0.18)
sting(wT('sobreviver', 'told'), 0.12)
# game 1: card whoosh + bell, the doll turns away on "batatinha"
whoosh(T0('game1') + 0.1, 0.4, 0.1); bell(T0('game1') + 0.35, 196, 0.12)
TURN_AWAY1 = wT('batatinha', 'game1'); creak_turn(TURN_AWAY1)
SING1 = (T0('rule') + 0.2, wT('virou', 'turn')); music_box(*SING1)
RUN1 = T0('rule') + 0.6
walk_steps(RUN1, SING1[1], 0.17, 0.045); walk_steps(RUN1 + 0.08, SING1[1], 0.23, 0.025)
SLIP = wT('escorregou', 'girl'); squeak(SLIP - 0.1, 0.07); whoosh(SLIP, 0.35, 0.08); thud(SLIP + 0.45, 0.28)
put(fx, f32(tone(1568, 0.3, 0.04, 8)), wT('fila', 'fila') + 0.1); put(fx, f32(tone(2093, 0.4, 0.04, 6)), wT('fila', 'fila') + 0.2)
for w in ('emborrachada', 'grossura', 'amortecendo', 'firmeza'): put(fx, f32(tone(1175, 0.18, 0.04, 10)), wT(w, 'fila'))
TURN = wT('virou', 'turn'); creak_turn(TURN - 0.1); thud(TURN + 0.25, 0.18)
OK1 = wT('milímetro', 'turn'); plim(OK1); scanner(TURN + 0.5, TE('rug') - TURN - 0.6, 0.035)
put(fx, f32(np.concatenate([tone(196, 0.35, 0.05, 2), tone(185, 0.35, 0.05, 2), tone(175, 0.8, 0.05, 1.5)])), wT('estatelada', 'rug') + 0.2)   # sad trombone-ish
TURN_AWAY2 = T0('finish') + 0.1; creak_turn(TURN_AWAY2)
SING2 = (T0('finish') + 0.6, TE('finish') - 0.2); music_box(*SING2, 0.06)
CROSS = wT('cruzou', 'finish'); walk_steps(SING2[0], CROSS + 0.3, 0.16, 0.05)
OK2 = wT('passou', 'finish'); plim(OK2)
for j, f in enumerate([523, 659, 784, 1047]): put(fx, f32(tone(f, 0.45 if j < 3 else 0.9, 0.06, 3)), CROSS + 0.1 + j * 0.12)
for i in range(6): click(CROSS + 0.15 + i * 0.07, 0.08)   # confetti pops
put(fx, f32(tone(1568, 0.5, 0.05, 5)), wT('tênis', 'lesson'))
for i in range(3): whoosh(T0('cta') + 0.25 + i * 0.12, 0.2, 0.05)
MARKS = {'van_in': round(VAN_IN, 3), 'van_stop': round(VAN_STOP, 3), 'door_o': round(DOOR_O, 3), 'door_c': round(DOOR_C, 3), 'van_out': round(VAN_OUT, 3),
         'away1': round(TURN_AWAY1, 3), 'run1': round(RUN1, 3), 'sing1': [round(x, 3) for x in SING1], 'slip': round(SLIP, 3), 'turn': round(TURN, 3), 'ok': [round(OK1, 3), round(OK2, 3)],
         'away2': round(TURN_AWAY2, 3), 'sing2': [round(x, 3) for x in SING2], 'cross': round(CROSS, 3)}
# ---- mix (narration ducks the bed) ----
duck = np.ones(N, np.float32); env = np.convolve(np.abs(voc), np.ones(4410) / 4410, 'same'); duck -= np.clip(env * 6, 0, 0.5)
mix = voc * 1.0 + fx + mus * duck
mix = mix[:int(TOTAL * SR)]
mix = mix / max(1e-6, np.abs(mix).max()) * 0.9
with wave.open('audio/mix.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(TOTAL, 3), 'fps': 30, 'segs': segs, **MARKS}, open('timeline.json', 'w'), indent=1)
for g in segs: print(f"{g['scene']:8s} start {g['start']:6.2f} dur {g['dur']:5.2f}")
print('total', round(TOTAL, 2))
