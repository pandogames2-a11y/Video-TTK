"""Builds the 9:16 (1080x1920) TikTok version: blurred background, video in the middle,
title on top and large captions underneath. Usage: python3 make_vertical.py <video_sem_legenda.mp4> <saida.mp4>"""
import json, sys, subprocess
src, out = sys.argv[1], sys.argv[2]
d = json.load(open('timeline.json'))
HL = ['tsunami', 'dez metros', 'correr', 'pra cima', 'longe do mar', 'rota de fuga', 'terceiro andar', 'várias ondas', 'autoridades', 'avião',
      'paredão de água', 'de repente', 'peixe', 'terremoto', 'péssima ideia', 'carros', 'árvores', 'último aviso', 'freia', 'cresce', 'tomando sol',
      'morro', 'prédio alto', 'resistente', 'densa', 'forte', 'elevador', 'escada', 'mesma força', 'fios elétricos', 'trânsito trava', 'ainda não', 'choque']
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'
def highlight(text):
    low = text.lower(); marks = [False] * len(text)
    for k in HL:
        i = low.find(k)
        while i >= 0:
            for j in range(i, i + len(k)): marks[j] = True
            i = low.find(k, i + 1)
    out, cur = '', False
    for ch, m in zip(text, marks):
        if m != cur: out += '{\\c&H3FD2FF&}' if m else '{\\c&HFFFFFF&}'; cur = m
        out += ch
    return out
T = d['total']
lines = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
         '[V4+ Styles]',
         'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
         'Style: Cap,Inter Display Black,76,&H00FFFFFF,&H00FFFFFF,&H00281410,&H00000000,0,0,0,0,100,100,0,0,1,7,0,8,70,70,0,1',
         'Style: Head,Inter Display Black,96,&H00FFFFFF,&H00FFFFFF,&H004A2A0A,&H00000000,0,0,0,0,100,100,0,0,1,8,0,8,40,40,0,1',
         'Style: Small,Inter Display Black,38,&H00FFFFFF,&H00FFFFFF,&H004A2A0A,&H00000000,0,0,0,0,100,100,2,0,1,5,0,8,40,40,0,1', '',
         '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
end_start = [g for g in d['segs'] if g['scene'] == 'end'][0]['start']
lines.append(f'Dialogue: 0,{ts(0.4)},{ts(T)},Small,,0,0,0,,{{\\pos(540,200)}}GUIA DE SOBREVIVÊNCIA • EP. 2')
lines.append(f'Dialogue: 0,{ts(0.4)},{ts(T)},Head,,0,0,0,,{{\\pos(540,262)}}VOCÊ SOBREVIVERIA')
lines.append(f'Dialogue: 0,{ts(0.4)},{ts(T)},Head,,0,0,0,,{{\\pos(540,375)\\fs108\\c&H2A8AFF&}}A UM TERREMOTO?')
lines.append(f'Dialogue: 0,{ts(end_start)},{ts(T)},Small,,0,0,0,,{{\\pos(540,1540)\\c&H2A8AFF&}}SEGUE PRA VER O EP. 3: ENCHENTE')
# karaoke captions: short chunks; the word being spoken turns yellow and pops
W = json.load(open('audio/words.json'))
chunks, cur = [], []
for w in W:
    txt = ' '.join(x['text'] for x in cur)
    if cur and (w['seg'] != cur[-1]['seg'] or len(txt) + len(w['text']) + 1 > 26 or (len(txt) >= 10 and cur[-1]['text'][-1] in '.?!:,') or w['t0'] - cur[-1]['t1'] > 0.6):
        chunks.append(cur); cur = []
    cur.append(w)
if cur: chunks.append(cur)
prev_end = 0
for ci, ch in enumerate(chunks):
    nxt = chunks[ci + 1][0]['t0'] if ci + 1 < len(chunks) else T
    end = min(ch[-1]['t1'] + 0.35, nxt)
    quote = ch[0]['who'] != 'narr'
    end = max(end, ch[0]['t0'] + 0.1)
    for j, w in enumerate(ch):
        s0 = w['t0'] if j else max(ch[0]['t0'] - 0.04, prev_end)
        s1 = ch[j + 1]['t0'] if j + 1 < len(ch) else end
        parts = []
        for k, x in enumerate(ch):
            t_ = x['text']
            if quote and k == 0: t_ = '“' + t_
            if quote and k == len(ch) - 1: t_ = t_ + '”'
            if k == j: parts.append('{\\c&H3FD2FF&\\fscx100\\fscy100\\t(0,90,\\fscx126\\fscy126)\\t(90,210,\\fscx114\\fscy114)}' + t_ + '{\\c&HFFFFFF&\\fscx100\\fscy100}')
            else: parts.append(t_)
        intro = '{\\fscx88\\fscy88\\t(0,90,\\fscx100\\fscy100)}' if j == 0 else ''
        s0 = min(s0, s1 - 0.01); lines.append(f"Dialogue: 1,{ts(s0)},{ts(s1)},Cap,,0,0,0,,{{\\pos(540,1330)}}{intro}{' '.join(parts)}")
    prev_end = end
open('audio/tiktok.ass', 'w').write('\n'.join(lines) + '\n')
flt = ('[0:v]split=2[a][b];'
       '[a]scale=-2:1920,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.18:saturation=1.1[bg];'
       '[b]scale=1080:-2[fg];'
       '[bg][fg]overlay=0:(H-h)/2-80,ass=audio/tiktok.ass[v]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-filter_complex', flt, '-map', '[v]', '-map', '0:a',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], check=True)
print('ok', out)
