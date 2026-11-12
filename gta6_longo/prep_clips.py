"""Prepara os trechos de gameplay/trailer que você colocar em clips/.

Como usar:
  1. Coloque o vídeo de origem em clips/fonte/ e, no script.json, adicione à frase desejada
     "clip": {"arquivo": "clips/fonte/x.mp4", "inicio": 12.0, "dur": 3, "crop": false}  (crop corta legenda queimada).
  2. python3 prep_clips.py   → extrai os quadros (sem áudio, 1920x1080, 30 fps) e grava clips_ready.json
  3. Renderize o vídeo de novo (veja o README). Slots sem arquivo continuam com a animação original.

Este script também (re)gera MAPA_DE_CLIPES.md com o tempo de cada trecho no vídeo final.
"""
import json, os, glob, subprocess, shutil

FPS = 30
GUIDE = '\n## Diretrizes para evitar problemas de direitos autorais no YouTube\n\nNada disso garante que o vídeo não receba reivindicação, mas reduz muito o risco:\n\n1. **Nunca use o áudio dos trailers.** As músicas dos trailers são licenciadas e o Content ID as reconhece na hora. O `prep_clips.py` já descarta o áudio de todos os trechos.\n2. **GTA 5: grave sua própria gameplay** com o rádio desligado e sem missões com música. Não use vídeos de outros criadores: reupload é o que mais gera strike.\n3. **Trechos curtos e comentados.** Cada trecho tem até 6 s e sempre fica com narração, cartões e legendas por cima (uso transformativo, de comentário). No total os trechos são no máximo cerca de 28% do vídeo; o resto é animação original.\n4. **Só material oficial do GTA 6:** trailers e o Extended Look publicados pela Rockstar. Nada de vazamentos (o item 9 fala do vazamento de 2022, mas sem mostrar as imagens).\n5. **Leia a política da Rockstar** sobre uso do material deles em vídeos (página "Policy on posting copyrighted Rockstar Games material", no suporte da Rockstar) antes de monetizar.\n6. **Dê o crédito.** O vídeo já mostra "imagens: Rockstar Games" durante os trechos; coloque também na descrição: "Imagens de GTA 6 e GTA 5: Rockstar Games. Vídeo de comentário/análise."\n7. **Miniatura com arte própria** (pode usar um quadro das animações deste vídeo).\n8. **Se vier reivindicação do Content ID:** isso não é strike. Você pode contestar dizendo que é uso transformativo de comentário, ou trocar o trecho e renderizar de novo. Strike só acontece com pedido manual de remoção.\n'
TL = json.load(open('timeline.json')); SCRIPT = json.load(open('script.json')); S = {s['id']: s for s in SCRIPT}
segs = {g['id']: g for g in TL['segs']}
LEAD = 0.15   # o clipe entra 0,15 s depois do começo da frase
TARGET = 5.0  # tempo na tela de cada trecho
MIN_SPEED = 0.5  # câmera lenta máxima (trechos curtos do trailer)

def part_span(seg, part):
    g = segs[seg]; ps = g['parts'] + [g['end']]
    return ps[part], ps[part + 1]

def probe(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return 0.0

def tc(t): m, s = divmod(t, 60); return f'{int(m):02d}:{s:04.1f}'

# cada frase do roteiro pode ter "clip": {"arquivo", "inicio", "dur", "crop"}
ready, rows = [], []
for sg in SCRIPT:
    for pi, p in enumerate(sg['parts']):
        c = p.get('clip')
        if not c: continue
        cid = f"{sg['id']}_{pi}"; a, b = part_span(sg['id'], pi)
        f = c['arquivo']; ini = float(c.get('inicio', 0))
        src = round(min(c.get('dur', 5), probe(f) - ini if os.path.exists(f) else 0), 2)   # segundos tirados do arquivo
        tela = round(min(TARGET, b - a - LEAD - 0.4), 2)                                    # segundos na tela
        speed = max(MIN_SPEED, min(1.0, src / tela)) if tela > 0 else 1.0                  # < 1 = câmera lenta
        src = round(min(src, tela * speed), 2); dur = round(src / speed, 2)
        rows.append(dict(id=cid, t0=a + LEAD, dur=dur, src=src, speed=round(speed, 2), arquivo=f, inicio=ini, fala=p['t']))
        if not os.path.exists(f) or dur < 1.0: print('pulado:', cid, f); continue
        out = f'clips/{cid}'; shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        vf = ('crop=iw*0.86:ih*0.86:iw*0.07:0,' if c.get('crop') else '') + 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,'
        vf += (f'setpts=PTS/{speed:.4f},framerate=fps={FPS}' if speed < 0.99 else f'fps={FPS}')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(ini), '-t', str(src), '-i', f, '-an', '-vf', vf, '-q:v', '3', f'{out}/f%04d.jpg'], check=True)
        n = len(glob.glob(f'{out}/f*.jpg'))
        ready.append(dict(id=cid, seg=sg['id'], part=pi, src='gta5' if 'gta5' in f else 'gta6', n=n, lead=LEAD))
        print(f'{cid}: {n / FPS:.1f} s na tela ({src:.1f} s de {os.path.basename(f)} a partir de {ini}s, velocidade {speed:.2f})')
json.dump(ready, open('clips_ready.json', 'w'), ensure_ascii=False, indent=1)
print(len(ready), 'trechos prontos')

with open('MAPA_DE_CLIPES.md', 'w') as m:
    m.write('# Trechos usados — GTA 6: 10 novidades (versão longa)\n\n')
    m.write('Os trechos ficam definidos no próprio `script.json` (campo `clip` de cada frase). O áudio dos trechos é sempre descartado.\n')
    m.write(GUIDE)
    m.write('\n## Trechos\n\n| frase | tempo no vídeo | na tela | do original | arquivo | a partir de | narração |\n|---|---|---|---|---|---|---|\n')
    for r in rows:
        fala = r['fala'].replace('|', '/')
        m.write(f"| `{r['id']}` | {tc(r['t0'])} | {r['dur']:.1f} s | {r['src']:.1f} s | {os.path.basename(r['arquivo'])} | {r['inicio']} s | {fala[:80]}{'…' if len(fala) > 80 else ''} |\n")
    tot = sum(r['dur'] for r in rows)
    tr = sum(r['src'] for r in rows if 'trailer' in r['arquivo'])
    m.write(f'\nTotal: {len(rows)} trechos, {tot:.0f} s na tela em {TL["total"]:.0f} s de vídeo ({100 * tot / TL["total"]:.0f}%). Do trailer de lançamento são usados só {tr:.0f} s (câmera lenta).\n')
