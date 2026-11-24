# Real stock footage (Mixkit, free license) for the spoken problem: lacing up, walking, running, sore after running.
# Cut to the words, cropped to vertical 1080x1920, exported as frames bg/f00000.jpg (30 fps) that index.html draws behind the tiger.
import json, os, subprocess, shutil
T = json.load(open('timeline.json'))
W = {w['text'].lower().strip('.,?'): w['t0'] for w in T['words']}
t_quando, t_como, t_ja, t_entao = W['quando'] - 0.1, W['como'] - 0.1, W['já'] - 0.1, W['então'] - 0.1
SEG = [  # clip, start in clip, duration, crop centre x (0..1)
    ('14766', 2.0, W['tênis'], 0.55),             # lacing up "aqueles tênis"
    ('16231', 0.4, t_quando - W['tênis'], 0.52),   # "a sola parece um pedaço de papelão"
    ('40881', 2.0, t_como - t_quando, 0.5),        # "qualquer atividade simples"
    ('4893', 0.3, t_ja - t_como, 0.5),             # "como uma caminhada"
    ('723', 5.0, t_entao - t_ja, 0.5),             # "já machuca o seu pé?"
]
os.makedirs('audio', exist_ok=True)
parts = []
for k, (c, ss, d, cx) in enumerate(SEG):
    out = f'clips/seg{k}.mp4'
    w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f'clips/{c}.mp4']).decode().split(',')[:2])
    cw = int(h * 9 / 16) // 2 * 2; x = int(min(max(0, cx * w - cw / 2), w - cw))
    # a slow push-in so every shot feels alive
    vf = f"crop={cw}:{h}:{x}:0,scale=1080:1920:flags=lanczos,fps=30,zoompan=z='1+0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,eq=saturation=1.1:contrast=1.05"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(ss), '-i', f'clips/{c}.mp4', '-t', f'{d:.3f}', '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', out], check=True)
    parts.append(out)
open('clips/list.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in parts))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'clips/list.txt', '-c', 'copy', 'clips/bg_intro.mp4'], check=True)
shutil.rmtree('bg', ignore_errors=True); os.makedirs('bg')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'clips/bg_intro.mp4', '-vf', 'fps=30', '-q:v', '3', '-start_number', '0', 'bg/f%05d.jpg'], check=True)
cuts = [0]; acc = 0
for s in SEG: acc += s[2]; cuts.append(round(acc, 3))
T['T']['bg_cuts'] = cuts; T['T']['bg_end'] = round(acc, 3); T['T']['bg_frames'] = len(os.listdir('bg'))
json.dump(T, open('timeline.json', 'w'), ensure_ascii=False)
print(cuts, len(os.listdir('bg')))
