"""Prepara os trechos de gameplay/trailer que você colocar em clips/.

Como usar:
  1. Para cada linha de MAPA_DE_CLIPES.md, salve o trecho como clips/<id>.mp4 (ou .mov/.mkv/.webm).
     Ex.: clips/a3.mp4 = Lucia na penitenciária. Pode ser maior que o necessário: só os primeiros segundos são usados.
     Para começar mais para a frente no arquivo, mude "inicio" (em segundos) daquele id em clips.json.
  2. python3 prep_clips.py   → extrai os quadros (sem áudio, 1920x1080, 30 fps) e grava clips_ready.json
  3. Renderize o vídeo de novo (veja o README). Slots sem arquivo continuam com a animação original.

Este script também (re)gera MAPA_DE_CLIPES.md com o tempo de cada trecho no vídeo final.
"""
import json, os, glob, subprocess, shutil

FPS = 30
GUIDE = '\n## Diretrizes para evitar problemas de direitos autorais no YouTube\n\nNada disso garante que o vídeo não receba reivindicação, mas reduz muito o risco:\n\n1. **Nunca use o áudio dos trailers.** As músicas dos trailers são licenciadas e o Content ID as reconhece na hora. O `prep_clips.py` já descarta o áudio de todos os trechos.\n2. **GTA 5: grave sua própria gameplay** com o rádio desligado e sem missões com música. Não use vídeos de outros criadores: reupload é o que mais gera strike.\n3. **Trechos curtos e comentados.** Cada trecho tem até 6 s e sempre fica com narração, cartões e legendas por cima (uso transformativo, de comentário). No total os trechos são no máximo cerca de 28% do vídeo; o resto é animação original.\n4. **Só material oficial do GTA 6:** trailers e o Extended Look publicados pela Rockstar. Nada de vazamentos (o item 9 fala do vazamento de 2022, mas sem mostrar as imagens).\n5. **Leia a política da Rockstar** sobre uso do material deles em vídeos (página "Policy on posting copyrighted Rockstar Games material", no suporte da Rockstar) antes de monetizar.\n6. **Dê o crédito.** O vídeo já mostra "imagens: Rockstar Games" durante os trechos; coloque também na descrição: "Imagens de GTA 6 e GTA 5: Rockstar Games. Vídeo de comentário/análise."\n7. **Miniatura com arte própria** (pode usar um quadro das animações deste vídeo).\n8. **Se vier reivindicação do Content ID:** isso não é strike. Você pode contestar dizendo que é uso transformativo de comentário, ou trocar o trecho e renderizar de novo. Strike só acontece com pedido manual de remoção.\n'
SLOTS = json.load(open('clips.json')); TL = json.load(open('timeline.json')); S = {s['id']: s for s in json.load(open('script.json'))}
segs = {g['id']: g for g in TL['segs']}
LEAD = 0.15   # o clipe entra 0,15 s depois do começo da frase

def part_span(seg, part):
    g = segs[seg]; ps = g['parts'] + [g['end']]
    return ps[part], ps[part + 1]

def probe(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return 0.0

def tc(t): m, s = divmod(t, 60); return f'{int(m):02d}:{s:04.1f}'

ready, rows = [], []
for s in SLOTS:
    a, b = part_span(s['seg'], s['part'])
    dur = round(min(s['max'], b - a - LEAD - 0.35), 2)
    rows.append(s | dict(t0=a + LEAD, dur=dur))
    files = [f for e in ('mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v') for f in glob.glob(f'clips/{s["id"]}.{e}')]
    if not files: continue
    f = files[0]; ini = float(s.get('inicio', 0)); dur = round(min(dur, probe(f) - ini), 2)
    if dur < 1.0: print('curto demais, ignorado:', f); continue
    out = f'clips/{s["id"]}'; shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(ini), '-t', str(dur), '-i', f, '-an',
                    '-vf', f'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps={FPS}', '-q:v', '3', f'{out}/f%04d.jpg'], check=True)
    n = len(glob.glob(f'{out}/f*.jpg'))
    ready.append(dict(id=s['id'], seg=s['seg'], part=s['part'], src=s['src'], n=n, lead=LEAD))
    print(f'{s["id"]}: {n} quadros ({n / FPS:.1f} s) de {f}')
json.dump(ready, open('clips_ready.json', 'w'), ensure_ascii=False, indent=1)
print(len(ready), 'de', len(SLOTS), 'trechos prontos')

with open('MAPA_DE_CLIPES.md', 'w') as m:
    m.write('# Mapa de clipes — GTA 6: 10 novidades (versão longa)\n\n')
    m.write('Salve cada trecho como `clips/<id>.mp4` e rode `python3 prep_clips.py`. O tempo é a posição no vídeo final;\n'
            'a duração é o máximo usado (pode mandar o arquivo mais longo). O áudio dos trechos é sempre descartado.\n\n')
    m.write('**Origem:** `GTA 6` = trailers e o Extended Look do canal/site oficial da Rockstar. '
            '`GTA 5` = gameplay gravada por você (rádio do carro e música desligados).\n\n')
    m.write(GUIDE)
    m.write('\n## Trechos\n\n')
    m.write('| id | tempo | duração | origem | o que mostrar | narração nesse momento |\n|---|---|---|---|---|---|\n')
    for r in rows:
        fala = S[r['seg']]['parts'][r['part']]['t'].replace('|', '/')
        m.write(f"| `{r['id']}` | {tc(r['t0'])} | {r['dur']:.1f} s | {'GTA 6' if r['src'] == 'gta6' else 'GTA 5'} | {r['desc']} | {fala[:90]}{'…' if len(fala) > 90 else ''} |\n")
    tot = sum(r['dur'] for r in rows)
    m.write(f'\nTotal: {len(rows)} trechos, {tot:.0f} s de no máximo {TL["total"]:.0f} s de vídeo ({100 * tot / TL["total"]:.0f}%). O resto continua sendo animação e comentário originais.\n')
