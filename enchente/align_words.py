"""Word-level timings for every spoken line (ElevenLabs forced alignment), saved to audio/words.json.
Times are absolute (seconds in the final video)."""
import json, os, wave, subprocess
import numpy as np
S = json.load(open('script.json')); TL = json.load(open('timeline.json'))
os.makedirs('audio/align', exist_ok=True)
words = []
for i, (s, g) in enumerate(zip(S, TL['segs'])):
    if s['voice'] == 'none' or s.get('nocap'): continue
    f = f'audio/v{i:02d}.wav'; cache = f'audio/align/v{i:02d}.json'
    if not os.path.exists(cache):
        r = subprocess.run(['curl', '-sS', '-X', 'POST', 'https://api.elevenlabs.io/v1/forced-alignment', '-H', 'xi-api-key: proxy-injected',
                            '-F', f'file=@{f}', '-F', f"text={s['text']}"], capture_output=True, text=True, check=True)
        json.loads(r.stdout)['words']; open(cache, 'w').write(r.stdout)
    al = json.load(open(cache))
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    nz = np.where(np.abs(x) > 0.01)[0]; trim = max(0, nz[0] - 200) / sr if len(nz) else 0   # same trim as build_audio.py
    for k in al['words']:
        if not k['text'].strip(): continue
        words.append(dict(seg=g['scene'], who=s['voice'], text=k['text'], t0=round(g['vstart'] + k['start'] - trim, 3), t1=round(g['vstart'] + k['end'] - trim, 3)))
json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False)
print(len(words), 'words')
