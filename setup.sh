#!/usr/bin/env bash
# Prepara uma máquina nova para produzir os vídeos (rode a partir da raiz do repositório: bash setup.sh)
set -e
cd "$(dirname "$0")"
pip install -q numpy scipy piper-tts soundfile 2>/dev/null || pip install numpy scipy piper-tts soundfile
# voz pt-BR local (Piper) — usada só quando não há créditos do ElevenLabs (TTS=piper)
if [ ! -f tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium.onnx ]; then
  mkdir -p tts && curl -sSL -o tts/m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-pt_BR-faber-medium.tar.bz2 \
    && tar xjf tts/m.tar.bz2 -C tts && rm -f tts/m.tar.bz2
fi
# three.js (uma cópia na raiz, ligada em cada episódio)
if [ ! -d node_modules/three ]; then npm install --no-audit --no-fund --prefix . three@0.169.0 >/dev/null; fi
for ep in */; do
  [ -f "$ep/scene.js" ] || continue
  ln -sfn ../node_modules "$ep/node_modules"
  ln -sfn ../tts "$ep/tts"
done
echo "pronto: dependências instaladas e ligadas em cada episódio"
