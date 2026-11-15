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
    subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', '1.05', '--sentence-silence', '0.2'],
                   input=text.encode(), check=True, capture_output=True)
    # a deeper, darker narrator for a horror episode
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'asetrate=22050*0.92,aresample=22050,atempo=1.04,highpass=f=60,acompressor=threshold=0.1:ratio=3,volume=1.4',
                    '-ar', '44100', '-ac', '1', out], check=True)

# ---- voices + timeline ----
segs, t = [], 0.0
voice = {}
for i, s in enumerate(S):
    lead, tail = s.get('lead', 0.25), s.get('tail', 0.35)
    if s['voice'] != 'none':
        f = f'audio/v{i:02d}.wav'; tts_piper(s['text'], f)
        x = readwav(f); nz = np.where(np.abs(x) > 0.01)[0]; x = x[max(0, nz[0] - 200): nz[-1] + 2000]; voice[i] = x
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
    g = segs[i]; env = np.convolve(np.abs(x), np.ones(441) / 441, 'same'); on = np.where(env > env.max() * 0.08)[0]
    a, b = on[0] / SR, on[-1] / SR
    toks = S[i]['text'].split(); wts = [len(re.sub(r'\W', '', w)) + 2 + (3 if re.search(r'[,.?!…]$', w) else 0) for w in toks]
    tot = sum(wts); c = a
    for w, k in zip(toks, wts):
        d = (b - a) * k / tot; words.append({'seg': g['scene'], 'who': 'narr', 'text': w, 't0': round(g['vstart'] + c, 3), 't1': round(g['vstart'] + c + d * 0.8, 3)}); c += d
json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False, indent=0)
def T0(n): return next(g['start'] for g in segs if g['scene'] == n)
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
