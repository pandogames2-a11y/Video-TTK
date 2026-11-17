"""EP6 (máscara de hóquei) audio: narration, sound effects, mix and timeline.
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
# night ambience: crickets, wind, the lake, and the campfire crackle near the fire scenes
k = np.arange(N) / SR
crick = np.zeros(N, np.float32)
pulse = np.arange(int(0.035 * SR)) / SR; pw = f32(np.sin(np.pi * pulse / 0.035) ** 2 * np.sin(2 * np.pi * 3600 * pulse))
for c in np.arange(0.3, N / SR - 1, 0.9):
    for j in range(3): put(crick, pw * 0.006 * (0.7 + 0.3 * rng.random()), c + j * 0.06 + rng.random() * 0.05)
mus += crick + f32(lowp(rng.standard_normal(N), 180) * 0.012)
drone = (np.sin(2 * np.pi * 55 * k) + 0.5 * np.sin(2 * np.pi * 82.4 * k + np.sin(2 * np.pi * 0.2 * k))) * 0.03 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.1 * k))
mus += f32(drone)
def crackle(a, b, amp=0.05):
    for at in np.arange(a, b, 0.07):
        if rng.random() < 0.45: n = int(0.02 * SR); put(fx, f32(band(rng.standard_normal(n), 1500, 7000) * np.exp(-np.arange(n) / SR * 200) * amp * rng.random()), at)
    n = int((b - a) * SR); put(fx, f32(lowp(rng.standard_normal(n), 250) * 0.03), a)
crackle(T0('fire'), TE('wood')); crackle(T0('search'), wT('procurar', 'search'), 0.03); crackle(T0('end'), TE('end'))
# a light, ironic campfire tune at the start (ukulele-ish plucks)
for j, f in enumerate([392, 494, 587, 494, 440, 523, 659, 523, 392, 494, 587, 784]):
    put(mus, tone(f, 0.5, 0.03, 5), 0.6 + j * 0.36)
# the car arriving + doors
engine(T0('arrive'), T0('arrive') + 2.6); door_slam(T0('arrive') + 2.9); door_slam(T0('arrive') + 3.2)
for pre, sc in [('acamparam', 'sign'), ('sozinho', 'wood'), ('procurar', 'search'), ('esconde', 'hide')]: buzz(wT(pre, sc) + 0.05)
put(fx, f32(tone(880, 0.3, 0.05, 8)), wT('acamparam', 'sign') - 0.3); whoosh(wT('acamparam', 'sign') - 0.35, 0.4, 0.1)   # the tent pops up
# "todo mundo riu" — little laughs; then the sting for the man behind the fire
RIU = wT('riu', 'fire')
for j in range(7):
    kk = np.arange(int(0.11 * SR)) / SR; f = 300 + 120 * (j % 3) + 200 * np.sin(np.pi * kk / 0.11)
    put(fx, f32(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * kk / 0.11) * 0.03), RIU - 0.1 + j * 0.15)
MENOS = wT('menos', 'fire'); sting(MENOS + 0.2, 0.17)
# Juca walks into the woods, then... the cap flies back
for at in np.arange(wT('então', 'wood'), wT('sozinho', 'wood') + 0.8, 0.34): step(at, 0.05)
BONE = wT('boné', 'wood'); thud(BONE - 0.3, 0.1); whoosh(BONE - 0.25, 0.35, 0.1); thud(BONE + 0.15, 0.05)
for j, f in enumerate([392, 370, 349, 330]): put(fx, f32(tone(f, 0.45 if j < 3 else 0.9, 0.04, 1.5)), TE('wood') - 1.9 + j * 0.35)   # sad trombone (very short)
for at in np.arange(wT('procurar', 'search'), TE('search'), 0.38): step(at, 0.045)
put(fx, f32(tone(1200, 0.15, 0.05, 20)), wT('lanterna', 'search')); put(fx, f32(tone(600, 0.35, 0.05, 6)), wT('bateria', 'search') + 0.2)   # flashlight click, low-battery beep
LA = T0('chase') + 0.2; sting(LA, 0.22)
for at in np.arange(wT('anda', 'chase') - 0.8, TE('chase'), 0.8): step(at, 0.09, False)   # slow heavy steps
TROP = wT('tropeçar', 'chase')
for at in np.arange(wT('aquele', 'chase'), TROP + 0.3, 0.16): step(at, 0.05)
FALL = TROP + 0.35; thud(FALL, 0.35); whoosh(FALL - 0.25, 0.3, 0.08)
NADA2 = wT('nada!', 'chase'); thud(NADA2, 0.2)
for at in np.arange(T0('hide'), wT('esconde', 'hide') + 0.4, 0.15): step(at, 0.05)
door_slam(wT('esconde', 'hide') + 0.5)
breath(wT('respirando', 'hide') - 0.2, 10, 0.1, 0.5)
kk = np.arange(int(1.0 * SR)) / SR; put(fx, f32(lowp(np.sign(np.sin(2 * np.pi * 70 * kk)) * np.sin(np.pi * kk) * 0.12, 500)), wT('búfalo', 'hide') + 0.1)   # buffalo "MUUH"
creak(TE('hide') - 1.2, 0.9, 0.06); sting(TE('hide') - 0.5, 0.2)
for j, f in enumerate([392, 370, 349, 330]): put(fx, f32(tone(f, 0.55 if j < 3 else 1.1, 0.06, 1.5)), wT('lenda', 'end') + j * 0.42)
for j, f in enumerate([523, 659, 784, 659, 523, 659]): put(mus, tone(f, 0.5, 0.03, 4), T0('cta') + 0.3 + j * 0.3)
# ---- mix (narration ducks the bed) ----
duck = np.ones(N, np.float32); env = np.convolve(np.abs(voc), np.ones(4410) / 4410, 'same'); duck -= np.clip(env * 6, 0, 0.5)
mix = voc * 1.0 + fx + mus * duck
fade = int(0.5 * SR); mix[:fade] *= np.linspace(0, 1, fade); mix[int(TOTAL * SR) - fade:int(TOTAL * SR)] *= np.linspace(1, 0, fade); mix = mix[:int(TOTAL * SR)]
mix = mix / max(1e-6, np.abs(mix).max()) * 0.9
with wave.open('audio/mix.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(TOTAL, 3), 'fps': 30, 'segs': segs, 'fall': round(FALL, 3)}, open('timeline.json', 'w'), indent=1)
for g in segs: print(f"{g['scene']:8s} start {g['start']:6.2f} dur {g['dur']:5.2f}")
print('total', round(TOTAL, 2))
