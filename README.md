# Vídeos TTK — Guia de Sobrevivência

Animações 3D com personagens grãos de café explicando como sobreviver a desastres.

| Episódio | Pasta | Vídeo |
|---|---|---|
| 1 — Tsunami | `tsunami/` | `tsunami/tsunami_episodio1_v5.mp4` (versão atual, 2:34, narração ElevenLabs) |

## Como cada episódio é feito
- `script.json` — roteiro da narração (cena, texto, falas dos personagens)
- `build_audio.py` — gera a narração (vozes ElevenLabs: Brian narrador, Will protagonista, Callum turista; cache em `audio/cache/`), trilha, efeitos, legendas e `timeline.json`
- `scene.js` / `index.html` — cena 3D em Three.js, câmeras e animação
- `render.js` — renderiza os quadros no Chromium headless (Playwright)

## Refazer o vídeo
```bash
cd tsunami
npm install
pip install scipy numpy
export ELEVENLABS_API_KEY=...   # chave com permissão Text to Speech
python3 build_audio.py
node render.js frames 0 99999 frames/
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest video.mp4
```
