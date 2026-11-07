# Vídeos TTK — Guia de Sobrevivência

Animações 3D com personagens grãos de café explicando como sobreviver a desastres.

| Episódio | Pasta | Vídeo |
|---|---|---|
| 1 — Tsunami | `tsunami/` | `tsunami/tsunami_episodio1_v4.mp4` (versão atual, 2:19) |

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
