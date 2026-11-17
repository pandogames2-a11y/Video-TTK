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
# crédito dos canais de gameplay (aparece no selo do trecho e na descrição)
CRED = {'gta5_freetouse2.mp4': '@NoCopyrightGameplays', 'gta5_trevor.mp4': '@NoCopyrightGameplays', 'gta5_freetouse.mp4': '@NoCopyrightGameplays', 'gta5_nocopyright.mp4': '@onboxgaming4741'}
GUIDE = '\n## Diretrizes para evitar problemas de direitos autorais no YouTube\n\nNada disso garante que o vídeo não receba reivindicação, mas reduz muito o risco:\n\n1. **Nunca use o áudio dos trailers.** As músicas dos trailers são licenciadas e o Content ID as reconhece na hora. O `prep_clips.py` já descarta o áudio de todos os trechos.\n2. **GTA 5: grave sua própria gameplay** com o rádio desligado e sem missões com música. Não use vídeos de outros criadores: reupload é o que mais gera strike.\n3. **Trechos curtos e comentados.** Cada trecho tem até 6 s e sempre fica com narração, cartões e legendas por cima (uso transformativo, de comentário). No total os trechos são no máximo cerca de 28% do vídeo; o resto é animação original.\n4. **Só material oficial do GTA 6:** trailers e o Extended Look publicados pela Rockstar. Nada de vazamentos (o item 9 fala do vazamento de 2022, mas sem mostrar as imagens).\n5. **Leia a política da Rockstar** sobre uso do material deles em vídeos (página "Policy on posting copyrighted Rockstar Games material", no suporte da Rockstar) antes de monetizar.\n6. **Dê o crédito.** O vídeo já mostra "imagens: Rockstar Games" durante os trechos; coloque também na descrição: "Imagens de GTA 6 e GTA 5: Rockstar Games. Vídeo de comentário/análise."\n7. **Miniatura com arte própria** (pode usar um quadro das animações deste vídeo).\n8. **Se vier reivindicação do Content ID:** isso não é strike. Você pode contestar dizendo que é uso transformativo de comentário, ou trocar o trecho e renderizar de novo. Strike só acontece com pedido manual de remoção.\n'
TL = json.load(open('timeline.json')); SCRIPT = json.load(open('script.json')); S = {s['id']: s for s in SCRIPT}
segs = {g['id']: g for g in TL['segs']}
LEAD = 0.0    # o trecho entra exatamente no corte da frase
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
used = {p.get('img') for s in SCRIPT for p in s['parts']}
TAILS = []
TAIL_LOOPS = sorted(glob.glob('clips/fonte/rockstar_videos/loops/*.mp4'))
for sg in SCRIPT:
    for pi, p in enumerate(sg['parts']):
        c = p.get('clip')
        if p.get('img'):   # screenshot oficial: imagem parada com movimento de câmera
            cid = f"{sg['id']}_{pi}"; a, b = part_span(sg['id'], pi); tela = round(b - a - LEAD, 2)   # imagem fica a frase inteira
            out = f'clips/{cid}'; shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p['img'], '-vf', 'scale=2112:1188:force_original_aspect_ratio=increase,crop=2112:1188', '-q:v', '3', f'{out}/img.jpg'], check=True)
            ready.append(dict(id=cid, seg=sg['id'], part=pi, src='gta6', n=int(tela * FPS), lead=LEAD, still=True))
            rows.append(dict(id=cid, t0=a + LEAD, dur=tela, src=0, speed=1, arquivo=p['img'], inicio=0, fala=p['t']))
            print(f'{cid}: imagem {os.path.basename(p["img"])} por {tela:.1f} s'); continue
        if not c: continue
        cid = f"{sg['id']}_{pi}"; a, b = part_span(sg['id'], pi)
        f = c['arquivo']; ini = float(c.get('inicio', 0))
        avail = probe(f) - ini if os.path.exists(f) else 0
        tela = round(b - a - LEAD, 2)                                                      # o trecho cobre a frase inteira
        if c.get('loop'):    # loop oficial: usa o arquivo inteiro e repete até a frase acabar
            src = round(avail, 2); speed = 1.0
        elif 'trailer' in f:   # trailer: só o pedaço escolhido (cortes curtos) — câmera lenta suave até 0,5x
            src = round(min(c.get('dur', 5), avail), 2); speed = max(MIN_SPEED, min(1.0, src / tela))
        else:                # gameplay / B-roll: arquivos longos, velocidade normal pela frase toda
            src = round(min(tela, avail), 2); speed = 1.0
        dur = round(src / speed, 2); tail = (not c.get('loop')) and dur < tela - 0.05   # se não cobrir a frase, entra um loop oficial em movimento
        rows.append(dict(id=cid, t0=a + LEAD, dur=dur, src=src, speed=round(speed, 2), arquivo=f, inicio=ini, fala=p['t']))
        if not os.path.exists(f) or dur < (0.5 if c.get('loop') else 1.0): print('pulado:', cid, f); continue
        out = f'clips/{cid}'; sig = json.dumps([f, ini, src, speed, c.get('crop'), tail, c.get('loop'), 'v2'], sort_keys=True)
        if os.path.exists(f'{out}/sig.json') and open(f'{out}/sig.json').read() == sig:
            n = len(glob.glob(f'{out}/f*.jpg')); tn = len(glob.glob(f'{out}/t*.jpg')); ready.append(dict(id=cid, seg=sg['id'], part=pi, src='gta5' if 'gta5' in f else 'stock' if 'mixkit' in f else 'gta6', n=n, lead=LEAD, tail=tail, tn=tn, loop=bool(c.get('loop')), cred=CRED.get(os.path.basename(f), '')))
            if tail: TAIL_LOOPS.append(TAIL_LOOPS.pop(0))
            print(f'{cid}: igual, reaproveitado'); continue
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        vf = ('crop=iw*0.86:ih*0.86:iw*0.07:0,' if c.get('crop') else '') + 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,'
        vf += (f'fps={FPS},setpts=PTS/{speed:.4f},minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1' if speed < 0.99 else f'fps={FPS}')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(ini), '-t', str(src), '-i', f, '-an', '-vf', vf, '-q:v', '3', f'{out}/f%04d.jpg'], check=True)
        n = len(glob.glob(f'{out}/f*.jpg'))
        tn = 0
        if tail:
            tf = TAIL_LOOPS.pop(0); TAIL_LOOPS.append(tf)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', tf, '-an', '-vf', f'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps={FPS}', '-q:v', '3', f'{out}/t%04d.jpg'], check=True)
            tn = len(glob.glob(f'{out}/t*.jpg'))
        open(f'{out}/sig.json', 'w').write(sig)
        ready.append(dict(id=cid, seg=sg['id'], part=pi, src='gta5' if 'gta5' in f else 'stock' if 'mixkit' in f else 'gta6', n=n, lead=LEAD, tail=tail, tn=tn, loop=bool(c.get('loop')), cred=CRED.get(os.path.basename(f), '')))
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
