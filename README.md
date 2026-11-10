# Vídeos TTK — Guia de Sobrevivência

Animações 3D com personagens grãos de café explicando como sobreviver a desastres.

| Episódio | Pasta | Vídeo |
|---|---|---|
| 1 — Tsunami | `tsunami/` | `tsunami/tsunami_episodio1_v8.mp4` (16:9, 3:43) e `tsunami/tsunami_episodio1_tiktok.mp4` (vertical 9:16 para TikTok) |
| 2 — Terremoto | `terremoto/` | `terremoto/terremoto_episodio2.mp4` (16:9, 3:25) e `terremoto/terremoto_episodio2_tiktok.mp4` (vertical 9:16) |
| Extra — GTA 6: 10 novidades | `gta6/` | `gta6/gta6_10_novidades.mp4` (vertical 9:16, 1:29) + `gta6/gta6_10_novidades.srt` |

## Como cada episódio é feito
- `script.json` — roteiro da narração (cena, texto, falas dos personagens)
- `build_audio.py` — gera a narração (voz neural Piper pt-BR), trilha, efeitos, legendas e `timeline.json`
- `scene.js` / `index.html` — cena 3D em Three.js, câmeras e animação
- `render.js` — renderiza os quadros no Chromium headless (Playwright)

## Refazer o vídeo
```bash
cd tsunami
npm install
pip install piper-tts scipy numpy
# voz pt-BR (não versionada, ~67 MB)
mkdir -p tts && cd tts
curl -L -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-pt_BR-faber-medium.tar.bz2
tar xjf m.tar.bz2 && cd ..
python3 build_audio.py
node render.js frames 0 99999 frames/
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest video.mp4
```

## GTA 6 — 10 novidades (vídeo curto vertical)
Motion graphics 2D em canvas (`gta6/scene.js`), arte 100% original — sem logos, personagens ou imagens da Rockstar.
Cada novidade tem um selo: ✅ confirmado pela Rockstar, 🎬 mostrado nos trailers, 👀 visto em prévias, ⚠️ vazamento/não confirmado, e a fonte no rodapé.
Para reeditar com trechos dos trailers oficiais: `audio/narracao.wav`, `audio/trilha_e_efeitos.wav` e `gta6_10_novidades.srt` estão separados.
```bash
cd gta6
pip install piper-tts scipy numpy
mkdir -p tts && cd tts && curl -L -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-pt_BR-faber-medium.tar.bz2 && tar xjf m.tar.bz2 && cd ..
python3 build_audio.py && python3 make_srt.py
node render.js frames 0 99999 frames/
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest gta6_10_novidades.mp4
```
