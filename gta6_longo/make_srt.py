"""Legendas .srt (frases curtas) a partir de timeline.json, para quem quiser reeditar com trechos dos trailers."""
import json, re
TL = json.load(open('timeline.json'))
def ts(t): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}'
out, cur = [], []
for i, w in enumerate(TL['words']):
    cur.append(w); nxt = TL['words'][i + 1] if i + 1 < len(TL['words']) else None
    if re.search(r'[,.?!:]$', w['text']) or len(cur) >= 8 or not nxt or nxt['seg'] != w['seg'] or nxt.get('part') != w.get('part'):
        out.append((cur[0]['t0'], cur[-1]['t1'] + 0.15, ' '.join(c['text'] for c in cur))); cur = []
with open('gta6_10_novidades_longo.srt', 'w') as f:
    for k, (a, b, t) in enumerate(out, 1): f.write(f'{k}\n{ts(a)} --> {ts(b)}\n{t}\n\n')
print(len(out), 'legendas')
