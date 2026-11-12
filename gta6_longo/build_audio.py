"""Narração (Piper pt-BR, voz grave), trilha de suspense sintetizada, efeitos e timeline.
Saída: audio/mix.wav, timeline.json (cenas + palavras com tempos)."""
import json, wave, re, subprocess, os
import numpy as np

SR = 44100
D = 'tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium'
os.makedirs('audio', exist_ok=True)
S = json.load(open('script.json'))
rng = np.random.default_rng(7)

# pronúncia para o TTS (as legendas usam o texto original)
PRON = [(r'\bGTA\b', 'gê tê á'), (r'\bNPCs\b', 'ene pê cês'), ('Vice City', 'Váice Ciri'), 
        ('Grassrivers', 'Grass Ríverss'), ('Port Gellhorn', 'Pórt Guél-horn'), ('Mount Kalaga', 'Maunt Kalága'),
        ('Rockstar', 'Róckstar'), ('San Andreas', 'San Andréas'), ('Jason', 'Djêisson'), ('Lucia', 'Lúcia'),
        ('gameplay', 'gueimplêi'), ('Michael', 'Máicol'), ('Chiliad', 'Tchíliad'), ('Los Santos Customs', 'Los Santos Câstoms'), (r'\bChop\b', 'Tchóp'), ('dancinha', 'dancinha'), ('Trevor', 'Tréver'), ('Duval', 'Duvál'), ('Bonnie e Clyde', 'Bóni e Cláide'),
        ('Red Dead Redemption', 'Réd Déd Redêmpchion'), ('Red Dead', 'Réd Déd'), ('Game Informer', 'Gueim Informer'), ('Extended Look', 'Ekstênded Lúk'),
        ('YouTube', 'Iutúbi'), ('PlayStation', 'Plêistêichon'), ('Xbox Series', 'Ékis bóx Síriz'), ('Lifeinvader', 'Laif-invêider'), ('Bleeter', 'Blíter'),
        ('Blaine County', 'Blêin Cáunti'), ('Rockstar North', 'Róckstar Nórth'), (r'\bCJ\b', 'Ci Djêi'), ('jet ski', 'djét ski'), (r'\bKeys\b', 'Quíz'),
        ('off-road', 'óf-rôud'), (r'\bPC\b', 'pê cê'), ('like', 'láique'), ('Love Is a Long Road', 'Lóv iz a Lóng Rôud'), ('Tom Petty', 'Tóm Péti'), ('Hot Together', 'Hót Tuguéder'), ('Pointer Sisters', 'Póinter Sísters'), ('Netflix', 'Nétflix'), ('Leonida', 'Leonída'), ('Mount Kalaga', 'Maunt Kalága'), ('meme', 'mími'), (r'\b6\b', 'seis'), (r'\b5\b', 'cinco'), ('pra frente', 'pra frênte')]
def pron(t):
    for a, b in PRON: t = re.sub(a, b, t)
    return t

def readwav(f):
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
    assert w.getframerate() == SR; return x

def writewav(f, x):
    x = np.clip(x, -1, 1); w = wave.open(f, 'wb'); w.setnchannels(x.shape[1] if x.ndim > 1 else 1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()

P = 0.88   # voz mais grave: abaixa o tom sem mudar a velocidade
VOICE_AF = (f'asetrate=22050*{P},aresample=44100,atempo={1/P:.4f},highpass=f=55,equalizer=f=110:t=q:w=1:g=5,'
            'equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=0.07:ratio=4:attack=4:release=90,volume=1.5')
def tts(text, out, ls):
    raw = out + '.raw.wav'
    subprocess.run(['python3', '-m', 'piper', '-m', D + '.onnx', '-c', D + '.onnx.json', '-f', raw, '--length-scale', str(ls)],
                   input=pron(text).encode(), check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', VOICE_AF, '-ar', str(SR), '-ac', '1', out], check=True)
    os.remove(raw)
    x = readwav(out); nz = np.where(np.abs(x) > 0.015)[0]
    return x[max(0, nz[0] - 300): nz[-1] + 1500]

def silences(x, min_len=0.09):
    """intervalos de silêncio dentro da frase (s)"""
    hop = 441; e = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, 'same')[::hop])
    quiet = e < 0.02; out = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * hop / SR >= min_len and i > 0 and j < len(quiet): out.append((i * hop / SR, j * hop / SR))
            i = j
        else: i += 1
    return out

def word_times(text, x):
    """tempo de cada palavra: divide a frase pelas pausas detectadas e, dentro de cada trecho, pelo tamanho das palavras"""
    dur = len(x) / SR
    clauses = [c.split() for c in re.split(r'(?<=[,:;.?!])\s+', text) if c.strip()]
    sil = silences(x)
    if len(clauses) > 1 and len(sil) >= len(clauses) - 1:
        sil = sorted(sorted(sil, key=lambda s: s[0] - s[1])[:len(clauses) - 1])   # as pausas mais longas
        bounds = [0.0] + [v for s in sil for v in s] + [dur]
        spans = [(bounds[2 * k], bounds[2 * k + 1]) for k in range(len(clauses))]
    else:
        clauses = [[w for c in clauses for w in c]]; spans = [(0.0, dur)]
    out = []
    for ws, (a, b) in zip(clauses, spans):
        wt = [len(pron(re.sub(r'[^\wÀ-ú-]', '', w))) + 1.5 for w in ws]; tot = sum(wt); t = a
        for w, k in zip(ws, wt):
            d = (b - a) * k / tot; out.append((w, t, t + d)); t += d
    return out

# ---------- narração ----------
LS = float(os.environ.get('LS', '0.86'))
segs = []; voice = []; words = []; t = 0.4
for si, s in enumerate(S):
    seg = dict(id=s['id'], scene=s['scene'], start=round(max(0, t - 0.35), 3), parts=[])
    if s.get('num'): t += 0.9   # espaço para o número "bater" na tela antes da fala
    for pi, p in enumerate(s['parts']):
        seg['parts'].append(round(t - 0.12, 3))
        sents = [x.strip() for x in re.findall(r'[^.?!]+[.?!]*', p['t']) if x.strip()]
        for k, sent in enumerate(sents):
            x = tts(sent, 'audio/tmp.wav', LS)
            for w, a, b in word_times(sent, x): words.append(dict(seg=s['id'], part=pi, text=w, t0=round(t + a, 3), t1=round(t + b, 3)))
            voice.append((t, x)); t += len(x) / SR + (0.2 if k < len(sents) - 1 else 0)
        t += 0.7
    t += 1.3
    seg['end'] = round(t - 0.35, 3); segs.append(seg)
    print(s['id'], round(seg['start'], 1), round(seg['end'], 1), flush=True)
os.remove('audio/tmp.wav')
TOTAL = t + 1.2
N = int(TOTAL * SR)
vtrack = np.zeros(N, np.float32)
for t0, x in voice: i = int(t0 * SR); vtrack[i:i + len(x)] += x
print('duração', round(TOTAL, 2), 's')

# ---------- trilha (sintetizada) ----------
BPM = 96; beat = 60 / BPM; tt = np.arange(N) / SR
def env(n, a, d):
    e = np.exp(-np.arange(n) / SR / d); e[:int(a * SR)] *= np.linspace(0, 1, int(a * SR)); return e
def add(buf, i, x, g=1.0):
    i = int(i)
    if i < 0: x = x[-i:]; i = 0
    if i >= len(buf): return
    x = x[:len(buf) - i]; buf[i:i + len(x)] += g * x
# progressão em Lá menor: Am - F - Dm - E
PROGS = [[55.0, 43.65, 36.71, 41.2], [36.71, 43.65, 32.7, 41.2], [41.2, 36.71, 43.65, 55.0]]
roots = PROGS[0]
music = np.zeros(N, np.float32)
bar = 4 * beat
inten = np.zeros(N, np.float32); progi = np.zeros(N, np.int8)
for k, g in enumerate(segs):
    a, b = int(g['start'] * SR), int(g['end'] * SR); n = b - a
    inten[a:b] = np.clip(0.25 + 0.75 * np.arange(n) / max(1, n) * (1.0 if g['id'].startswith('n') else 0.6), 0, 1); progi[a:b] = k % 3
inten = np.maximum(inten, 0) * (0.85 + 0.15 * tt / TOTAL)
def chord_root(tb): return PROGS[int(progi[min(N - 1, int(tb * SR))])][int(tb / bar) % 4]
drone = np.zeros(N, np.float32)
for b in range(int(TOTAL / bar) + 1):
    r = chord_root(b * bar + 0.01); i0 = int(b * bar * SR); n = int(bar * SR) + 2000
    tl = np.arange(n) / SR
    pad = (np.sin(2 * np.pi * r * tl) + 0.5 * np.sin(2 * np.pi * r * 2 * tl + 0.3) + 0.25 * np.sin(2 * np.pi * r * 3.003 * tl)
           + 0.3 * np.sin(2 * np.pi * r * 1.5 * 2 * tl)) * np.minimum(1, tl / 0.3) * np.minimum(1, (n / SR - tl) / 0.3)
    add(drone, i0, pad.astype(np.float32), 0.10)
# pulso de baixo em colcheias
for k in range(int(TOTAL / (beat / 2))):
    tb = k * beat / 2; r = chord_root(tb); n = int(0.2 * SR); tl = np.arange(n) / SR
    x = np.tanh(2 * np.sin(2 * np.pi * r * 2 * tl)) * env(n, 0.003, 0.09)
    add(music, tb * SR, x.astype(np.float32), 0.05 + 0.09 * float(inten[min(N - 1, int(tb * SR))]))
# arpejo misterioso (sino) — notas do acorde
arp = {55.0: [440, 523.25, 659.25], 43.65: [349.2, 440, 523.25], 36.71: [293.7, 349.2, 440], 41.2: [329.6, 415.3, 493.9], 32.7: [261.6, 329.6, 392.0]}
for k in range(int(TOTAL / (beat / 2))):
    tb = k * beat / 2; r = chord_root(tb); f = arp.get(r, arp[55.0]) if r in arp else [p * r / 55.0 for p in arp[55.0]]; f = f[[0, 1, 2, 1][k % 4]]; n = int(0.6 * SR); tl = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * tl) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tl)) * env(n, 0.002, 0.25)
    add(music, tb * SR, x.astype(np.float32), 0.028)
# bateria: kick, caixa (half-time) e hi-hat, entrando aos poucos
def kick():
    n = int(0.35 * SR); tl = np.arange(n) / SR; f = 45 + 110 * np.exp(-tl * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16)).astype(np.float32)
def snare():
    n = int(0.3 * SR); tl = np.arange(n) / SR; nz = rng.standard_normal(n)
    nz = np.convolve(nz, [1, -0.6], 'same')
    return ((0.6 * nz * env(n, 0.001, 0.09) + 0.5 * np.sin(2 * np.pi * 190 * tl) * env(n, 0.001, 0.05))).astype(np.float32)
def hat():
    n = int(0.06 * SR); nz = np.diff(rng.standard_normal(n + 1)); return (nz * env(n, 0.0005, 0.015)).astype(np.float32)
K, Sn, H = kick(), snare(), hat()
drum_start = segs[0]['parts'][1]   # bateria entra no meio do gancho
quiet = [(g['start'], g['start'] + 1.2) for g in segs[1:]]   # respiro na virada de bloco
for k in range(int(TOTAL / (beat / 4))):
    tb = k * beat / 4
    if tb < drum_start or tb > TOTAL - 1.5 or any(a <= tb < b for a, b in quiet): continue
    step = k % 16; it = float(inten[int(tb * SR)])
    if step in (0, 10) or (it > 0.5 and step == 7): add(music, tb * SR, K, 0.55)
    if step == 8: add(music, tb * SR, Sn, 0.22 + 0.12 * it)
    if step % 2 == 0 or (it > 0.6 and rng.random() < 0.5): add(music, tb * SR, H, 0.05 + 0.05 * it)
music += drone

# ---------- efeitos ----------
sfx = np.zeros(N, np.float32)
def whoosh(d=0.45):
    n = int(d * SR); nz = rng.standard_normal(n).astype(np.float32); out = np.zeros(n, np.float32); y = 0
    cs = np.linspace(0.02, 0.5, n) ** 1.5   # filtro passa-baixa que abre
    for i in range(n): y += cs[i] * (nz[i] - y); out[i] = y
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * 1.4
def boom():
    n = int(1.4 * SR); tl = np.arange(n) / SR; f = 38 + 80 * np.exp(-tl * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.5) + 0.25 * rng.standard_normal(n) * env(n, 0.001, 0.05)
    return np.tanh(1.6 * x).astype(np.float32)
def riser(d=2.0):
    n = int(d * SR); tl = np.arange(n) / SR; f = 200 * 2 ** (tl / d * 3)
    return (0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (tl / d) ** 2 + 0.3 * rng.standard_normal(n) * (tl / d) ** 3).astype(np.float32)
def tick():
    n = int(0.04 * SR); tl = np.arange(n) / SR; return (np.sin(2 * np.pi * 2400 * tl) * env(n, 0.0005, 0.008)).astype(np.float32)
W, B, R, T = whoosh(), boom(), riser(), tick()
for s in segs:
    add(sfx, (s['start'] - 0.2) * SR, W, 0.5)
    add(sfx, (s['start'] + 0.05) * SR, B, 0.55 if s['id'].startswith('n') else 0.35)
    for p in s['parts'][1:]: add(sfx, (p - 0.25) * SR, W, 0.22)
# riser antes da virada do meio e do número 10
for sid in ('mid', 'n10', 'outro'):
    s0 = next(s for s in segs if s['id'] == sid)['start']; add(sfx, (s0 - 2.0) * SR, R, 0.35)
add(sfx, 0.0, B, 0.6)
# toque de "notificação" no item 5 e sirene curta no 8
s5p = next(s for s in segs if s['scene'] == 'n5')['parts']
for pt in s5p[2:4]:
    for k in range(2): add(sfx, (pt + 0.3 + k * 0.12) * SR, T, 0.4)
s8 = next(s for s in segs if s['scene'] == 'n8')
n = int(1.6 * SR); tl = np.arange(n) / SR; fs = 700 + 250 * np.sign(np.sin(2 * np.pi * 2.2 * tl))
add(sfx, (s8['parts'][2] - 0.2) * SR, (0.18 * np.sin(2 * np.pi * np.cumsum(fs) / SR) * np.minimum(1, tl / 0.1) * np.minimum(1, (1.6 - tl) / 0.3)).astype(np.float32), 0.5)

# ---------- mix com ducking ----------
ve = np.sqrt(np.convolve(vtrack ** 2, np.ones(4410) / 4410, 'same'))
duck = 1 - 0.55 * np.clip(ve / 0.05, 0, 1)
duck = np.convolve(duck, np.ones(8820) / 8820, 'same')
fade = np.minimum(1, tt / 0.8) * np.clip((TOTAL - tt) / 1.8, 0, 1)
mix = vtrack * 1.0 + (music * duck * 0.9 + sfx * 0.8) * fade
mix /= max(1e-6, np.abs(mix).max() / 0.95)
st = np.stack([mix, mix], 1)
writewav('audio/mix.wav', st)
writewav('audio/narracao.wav', vtrack / max(1e-6, np.abs(vtrack).max() / 0.95))
writewav('audio/trilha_e_efeitos.wav', ((music * 0.9 + sfx * 0.8) * fade) / max(1e-6, np.abs((music * 0.9 + sfx * 0.8) * fade).max() / 0.9))

json.dump(dict(total=round(TOTAL, 3), bpm=BPM, segs=segs, words=words), open('timeline.json', 'w'), ensure_ascii=False)
print(len(words), 'palavras')
