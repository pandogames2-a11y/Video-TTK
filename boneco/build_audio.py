"""EP5 (boneco assassino) audio: narration, sound effects, mix and timeline.
Default voice is the free local Piper voice (preview). Later: TTS=eleven for the final narrator.
Writes audio/mix.wav, timeline.json (scene times) and audio/words.json (time of each spoken word)."""
import json, wave, re, subprocess, os
import numpy as np
from scipy.signal import lfilter, butter

SR = 44100
D = 'tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium'
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
    # a deeper, darker narrator for a horror episode
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
def tone(f, d, amp, decay=3.0):
    k = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * k) + 0.3 * np.sin(4 * np.pi * f * k)) * np.exp(-k * decay) * amp
def dingdong(at, amp=0.3):   # the classic two-note doorbell
    put(fx, tone(784, 1.2, amp, 2.5), at); put(fx, tone(622, 1.6, amp, 2.0), at + 0.55)
def sting(at, amp=0.25):     # horror stab: dissonant strings + low hit
    k = np.arange(int(1.8 * SR)) / SR; env = np.exp(-k * 1.6)
    x = sum(np.sign(np.sin(2 * np.pi * f * k)) * 0.25 for f in (233, 247, 349, 370)) * env * amp
    put(fx, lowp(x, 3000).astype(np.float32), at); put(fx, (np.sin(2 * np.pi * 55 * k) * np.exp(-k * 3) * amp * 2).astype(np.float32), at)
def whoosh(at, d=0.5, amp=0.15):
    n = int(d * SR); k = np.arange(n) / SR; env = np.sin(np.pi * k / d) ** 2
    put(fx, (band(rng.standard_normal(n), 400, 4000) * env * amp).astype(np.float32), at)
def crunch(at, amp=0.08):
    for j in range(5):
        n = int(0.05 * SR); put(fx, (band(rng.standard_normal(n), 1500, 6000) * np.exp(-np.arange(n) / SR * 60) * amp).astype(np.float32), at + j * 0.09)
def popspill(at, amp=0.1):
    for j in range(10):
        n = int(0.04 * SR); put(fx, (band(rng.standard_normal(n), 2000, 7000) * np.exp(-np.arange(n) / SR * 80) * amp).astype(np.float32), at + 0.25 + rng.random() * 0.6)
# night ambience: crickets + soft wind, the whole episode
k = np.arange(N) / SR
# soft crickets: short smooth chirps (3 pulses each) instead of a harsh gated tone, and a quieter, darker wind
crick = np.zeros(N, np.float32)
pulse = np.arange(int(0.035 * SR)) / SR; pw = (np.sin(np.pi * pulse / 0.035) ** 2 * np.sin(2 * np.pi * 3600 * pulse)).astype(np.float32)
for c in np.arange(0.3, N / SR - 1, 0.9):
    for j in range(3): put(crick, pw * 0.006 * (0.7 + 0.3 * rng.random()), c + j * 0.06 + rng.random() * 0.05)
mus += crick + (lowp(rng.standard_normal(N), 180) * 0.012).astype(np.float32)
# suspense pad: a slow low drone that swells
drone = (np.sin(2 * np.pi * 55 * k) + 0.5 * np.sin(2 * np.pi * 82.4 * k + np.sin(2 * np.pi * 0.2 * k))) * 0.035 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.1 * k))
mus += drone.astype(np.float32)
# a music-box tune in the calm part (the doll is coming...)
notes = [659, 587, 523, 494, 523, 587, 659, 0, 659, 587, 523, 440]
c0 = T0('calm')
for j, f in enumerate(notes):
    if f: put(mus, tone(f * 2, 0.6, 0.035, 5), c0 + 0.2 + j * 0.42)
# TV murmur under the calm scene
tv_a, tv_b = T0('calm'), T0('bell') + 1.2
n = int((tv_b - tv_a) * SR); put(fx, (band(rng.standard_normal(n), 250, 900) * 0.006 * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 9))).astype(np.float32), tv_a)   # muffled TV, no hiss
crunch(T0('calm') + 1.0); crunch(T0('calm') + 2.6)
RING = wT('toca', 'bell') + 0.4
dingdong(RING)   # just a normal doorbell (no scare yet)
def step(at, amp=0.07):
    n = int(0.08 * SR); put(fx, (lowp(rng.standard_normal(n), 400) * np.exp(-np.arange(n) / SR * 45) * amp * 4).astype(np.float32), at)
UP, OPEN = wT('levanta', 'open'), wT('abre', 'open')
for at in np.arange(UP + 0.45, OPEN - 0.1, 0.32): step(at)
def click(at, amp=0.12):
    n = int(0.03 * SR); put(fx, (band(rng.standard_normal(n), 2000, 8000) * np.exp(-np.arange(n) / SR * 150) * amp).astype(np.float32), at)
def creak(at, d=0.9, amp=0.05):
    kk = np.arange(int(d * SR)) / SR; f = 180 + 60 * np.sin(2 * np.pi * 2.2 * kk) + 40 * kk
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * kk)) * np.sin(np.pi * kk / d)
    put(fx, (band(x, 300, 2500) * amp).astype(np.float32), at)
click(OPEN + 0.05); creak(OPEN + 0.15)
LOOKBOX = wT('apenas', 'porch')
for j, f in enumerate([1319, 1175, 1047]): put(mus, tone(f, 0.9, 0.03, 4), LOOKBOX + j * 0.35)
PICK = wT('acha', 'porch')
for at in np.arange(PICK + 0.05, PICK + 1.0, 0.3): step(at, 0.05)
# "o que está por vir": the music box slows down and goes out of tune + a soft low swell (a hint, not a jump scare)
VIR = wT('vir', 'porch')
for j, f in enumerate([988, 932, 880, 831]): put(mus, tone(f, 1.2, 0.035, 2.5), VIR - 0.9 + j * 0.45)
kk = np.arange(int(2.4 * SR)) / SR; put(fx, (np.sin(2 * np.pi * 49 * kk) * np.sin(np.pi * kk / 2.4) ** 2 * 0.12).astype(np.float32), VIR - 0.6)

whoosh(T0('calm') - 0.35, 0.6, 0.1)   # dissolve into the house
# ---- the rest of the night ----
def buzz(at, amp=0.08):   # "wrong!" buzzer for each ERRO card
    kk = np.arange(int(0.45 * SR)) / SR; put(fx, (np.sign(np.sin(2 * np.pi * 110 * kk)) * 0.5 + np.sign(np.sin(2 * np.pi * 116 * kk)) * 0.5).astype(np.float32) * amp * np.exp(-kk * 2).astype(np.float32), at)
def thud(at, amp=0.25):
    kk = np.arange(int(0.4 * SR)) / SR; put(fx, (np.sin(2 * np.pi * 60 * kk) * np.exp(-kk * 12) * amp).astype(np.float32), at)
def clang(at, amp=0.18):
    kk = np.arange(int(1.2 * SR)) / SR; x = sum(np.sin(2 * np.pi * f * kk) for f in (523, 1390, 2210, 3170)) * np.exp(-kk * 4) * amp / 3
    put(fx, x.astype(np.float32), at); put(fx, x[:int(0.6 * SR)].astype(np.float32) * 0.5, at + 0.22)
def tick(a, b, amp=0.03):
    for at in np.arange(a, b, 0.5): click(at, amp)
def giggle(at, amp=0.06):   # a tiny toy "hi-hi-hi" made of chirps
    for j in range(3):
        kk = np.arange(int(0.12 * SR)) / SR; f = 900 + 500 * np.sin(np.pi * kk / 0.12)
        put(fx, (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * kk / 0.12) * amp).astype(np.float32), at + j * 0.18)
def rustle(at, d=0.6, amp=0.05):
    n = int(d * SR); put(fx, (band(rng.standard_normal(n), 1500, 6000) * np.sin(np.pi * np.arange(n) / n) * amp).astype(np.float32), at)
for pre, sc in [('primeiro', 'erro1'), ('segundo', 'erro2'), ('terceira', 'erro3'), ('quarta', 'erro4'), ('última', 'erro5')]: buzz(wT(pre, sc) + 0.1)
thud(T0('inside') + 0.1, 0.18); rustle(wT('abre', 'inside'), 0.7)
put(fx, (tone(1800, 0.25, 0.05, 20)).astype(np.float32), wT('desliga', 'sleep'))     # TV off "tchum"
for at in np.arange(wT('cama', 'sleep'), TE('sleep') - 0.1, 0.34): step(at, 0.05)
tick(T0('noise'), TE('noise'), 0.025)
for j, at in enumerate([wT('barulhos', 'noise') - 0.4, wT('barulhos', 'noise') + 0.3, wT('barulhos', 'noise') + 0.9]): thud(at, 0.12); click(at + 0.1, 0.08)
for at in np.arange(wT('checar', 'check'), TE('check'), 0.4): step(at, 0.045); creak(at + 0.05, 0.25, 0.02)
for at in np.arange(T0('desce') + 0.2, wT('repara', 'desce'), 0.42): step(at, 0.04)
clang(wT('barulho', 'erro3') - 0.1)
for at in np.arange(wT('vai', 'erro3'), wT('como', 'erro3'), 0.38): step(at, 0.045)
REVEAL = wT('brinquedo', 'reveal')
sting(REVEAL - 0.1, 0.16); giggle(TE('reveal') - 0.9)
# chase: frantic drums + running feet
c0, c1 = T0('chase'), wT('porão', 'chase') + 0.3
for at in np.arange(c0, c1, 0.125): thud(at, 0.06 if int((at - c0) / 0.125) % 2 else 0.1)
for at in np.arange(c0 + 0.05, c1, 0.17): step(at, 0.05)
thud(wT('quarta', 'erro4') - 0.6, 0.35); click(wT('quarta', 'erro4') - 0.3, 0.15)   # door slam + lock
tick(wT('quinze', 'wait') - 0.2, TE('wait'), 0.03)
creak(wT('sai', 'erro5'), 1.0, 0.05)
rustle(wT('dormir', 'bed'), 0.9, 0.05)
for j, f in enumerate([659, 587, 523, 494, 523]): put(mus, tone(f * 2, 0.6, 0.03, 5), wT('dormir', 'bed') + 0.4 + j * 0.4)
SC = T0('scare')
for j, f in enumerate([988, 932, 880]): put(mus, tone(f, 1.0, 0.03, 2.5), SC + 0.1 + j * 0.35)
giggle(SC + 0.9, 0.07)
def scream(at, d=1.3, amp=0.22):   # a cartoon "AAAAH!": a buzzy voice with a rising pitch and two vowel formants
    kk = np.arange(int(d * SR)) / SR; f0 = 380 + 160 * np.minimum(kk / 0.25, 1) + 18 * np.sin(2 * np.pi * 7 * kk)
    src = ((np.cumsum(f0) / SR) % 1.0) * 2 - 1
    x = band(src, 700, 900) * 1.6 + band(src, 1100, 1400) + band(src, 2400, 2900) * 0.5
    put(fx, (x * np.minimum(1, kk / 0.05) * np.minimum(1, (d - kk) / 0.3) * amp).astype(np.float32), at)
SCREAM = SC + 1.6
sting(SCREAM - 0.05, 0.2); scream(SCREAM)
# "vira estampa de camisa": a sad little trombone, then a light tune for the question
CA = wT('estampa', 'camisa')
for j, f in enumerate([392, 370, 349, 330]): put(fx, (tone(f, 0.55 if j < 3 else 1.1, 0.06, 1.5)).astype(np.float32), CA + j * 0.45)
for j, f in enumerate([523, 659, 784, 659, 523, 659]): put(mus, tone(f, 0.5, 0.03, 4), T0('cta') + 0.3 + j * 0.3)
# ---- mix (narration ducks the bed) ----
duck = np.ones(N, np.float32); env = np.convolve(np.abs(voc), np.ones(4410) / 4410, 'same'); duck -= np.clip(env * 6, 0, 0.5)
mix = voc * 1.0 + fx + mus * duck
fade = int(0.6 * SR); mix[:fade] *= np.linspace(0, 1, fade); mix[int(TOTAL * SR) - fade:int(TOTAL * SR)] *= np.linspace(1, 0, fade); mix = mix[:int(TOTAL * SR)]
mix = mix / max(1e-6, np.abs(mix).max()) * 0.9
with wave.open('audio/mix.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(TOTAL, 3), 'fps': 30, 'segs': segs, 'ring': round(RING, 3), 'up': round(UP, 3), 'open': round(OPEN, 3), 'lookbox': round(LOOKBOX, 3), 'pick': round(PICK, 3), 'vir': round(VIR, 3)}, open('timeline.json', 'w'), indent=1)
for g in segs: print(f"{g['scene']:8s} start {g['start']:6.2f} dur {g['dur']:5.2f}")
print('total', round(TOTAL, 2), 'ring', round(RING, 2))
