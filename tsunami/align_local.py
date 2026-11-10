"""Word timings without any API: finds the pauses in each spoken line and spreads the words
between them (by length). Writes audio/words.json in the same format as align_words.py."""
import json, re, wave
import numpy as np
S = json.load(open('script.json')); TL = json.load(open('timeline.json'))
words = []
for i, (s, g) in enumerate(zip(S, TL['segs'])):
    if s['voice'] == 'none' or s.get('nocap'): continue
    w = wave.open(f'audio/v{i:02d}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    nz = np.where(np.abs(x) > 0.01)[0]; a0 = max(0, nz[0] - 200); x = x[a0: nz[-1] + 2000]   # same trim as build_audio.py
    hop = int(sr * 0.01); env = np.array([np.sqrt(np.mean(x[k:k + hop] ** 2)) for k in range(0, len(x) - hop, hop)])
    on = env > max(0.012, env.max() * 0.06)
    idx = np.where(on)[0]; s0, s1 = idx[0], idx[-1]
    # pauses inside the speech (silence longer than 120 ms)
    pauses, k = [], s0
    while k < s1:
        if not on[k]:
            j = k
            while j < s1 and not on[j]: j += 1
            if j - k >= 12: pauses.append((k, j))
            k = j
        k += 1
    toks = s['text'].split()
    # phrases end at punctuation
    phrases, cur = [], []
    for t_ in toks:
        cur.append(t_)
        if re.search(r'[,.?!:;…]$', t_): phrases.append(cur); cur = []
    if cur: phrases.append(cur)
    need = len(phrases) - 1
    chosen = sorted(sorted(pauses, key=lambda p: -(p[1] - p[0]))[:need]) if need > 0 and len(pauses) >= need else []
    if chosen:
        bounds = [(s0, chosen[0][0])] + [(chosen[k][1], chosen[k + 1][0]) for k in range(len(chosen) - 1)] + [(chosen[-1][1], s1)]
        groups = list(zip(phrases, bounds))
    else:
        groups = [(toks, (s0, s1))]
    for ph, (b0, b1) in groups:
        wts = [len(t_) + 2 for t_ in ph]; tot = sum(wts); acc = b0
        for t_, wt in zip(ph, wts):
            d = (b1 - b0) * wt / tot
            words.append(dict(seg=g['scene'], who=s['voice'], text=t_, t0=round(g['vstart'] + acc / 100, 3), t1=round(g['vstart'] + (acc + d) / 100, 3))); acc += d
json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False)
print(len(words), 'words')
