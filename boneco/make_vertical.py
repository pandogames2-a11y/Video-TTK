"""Builds the 9:16 (1080x1920) TikTok version: blurred background, video in the middle,
title on top and large captions underneath. Usage: python3 make_vertical.py <video_sem_legenda.mp4> <saida.mp4> [--native]
--native: the input is already vertical (render with VERT=1): it fills the whole screen, no borders."""
import json, sys, subprocess
src, out = sys.argv[1], sys.argv[2]
NATIVE = '--native' in sys.argv
d = json.load(open('timeline.json'))
HL = ['boneco assassino', 'sexta-feira', 'campainha', 'de repente']
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
         'Style: Cap,Inter Display Black,110,&H00FFFFFF,&H00FFFFFF,&H00100A08,&H96000000,0,0,0,0,100,100,2,0,1,11,4,5,70,70,0,1',
         'Style: Head,Inter Display Black,96,&H00FFFFFF,&H00FFFFFF,&H004A2A0A,&H00000000,0,0,0,0,100,100,0,0,1,8,0,8,40,40,0,1',
         'Style: Small,Inter Display Black,38,&H00FFFFFF,&H00FFFFFF,&H004A2A0A,&H00000000,0,0,0,0,100,100,2,0,1,5,0,8,40,40,0,1', '',
         '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
TY = [56, 104, 196] if NATIVE else [200, 262, 375]
W = [w for w in json.load(open('audio/words.json')) if w['seg'] != 'title']   # the title line has the animated hook instead of captions
# captions: ONE word at a time (user's request), white with a thick dark outline, a small pop when it appears
prev_t = -1
for i, w in enumerate(W):
    nxt = W[i + 1]['t0'] if i + 1 < len(W) else T
    s0 = max(w['t0'] - 0.03, prev_t); s1 = min(max(w['t1'] + 0.25, w['t0'] + 0.3), nxt - 0.02)
    if s1 <= s0 + 0.05: s1 = s0 + 0.12
    txt = w['text'].upper()
    lines.append(f"Dialogue: 1,{ts(s0)},{ts(s1)},Cap,,0,0,0,,{{\\pos(540,1520)\\fscx80\\fscy80\\t(0,80,\\fscx112\\fscy112)\\t(80,160,\\fscx100\\fscy100)}}{txt}")
    prev_t = s1
open('audio/tiktok.ass', 'w').write('\n'.join(lines) + '\n')
flt = ('[0:v]split=2[a][b];'
       '[a]scale=-2:1920,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.18:saturation=1.1[bg];'
       '[b]scale=1080:-2[fg];'
       '[bg][fg]overlay=0:(H-h)/2-80,ass=audio/tiktok.ass[v]')
if NATIVE:   # full-screen vertical video, a soft dark band behind the title for legibility
    flt = ('[0:v]scale=1080:1920:flags=lanczos,drawbox=x=0:y=0:w=1080:h=330:color=black@0.28:t=fill,'
           'ass=audio/tiktok.ass[v]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-filter_complex', flt, '-map', '[v]', '-map', '0:a',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], check=True)
print('ok', out)
