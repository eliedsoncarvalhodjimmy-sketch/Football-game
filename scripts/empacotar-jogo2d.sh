#!/bin/sh
# Empacota a simulação 2D (motor de decisão + steering + bola provisória) num script para o protótipo HTML.
npx esbuild src/engine/jogo2d/prototipo.ts --bundle --format=iife --minify --target=es2020 --outfile=docs/prototipo/jogo2d.js
# Embute o script no protótipo (entre os marcadores do <script id="futceo-jogo2d">).
python3 - <<'PY'
p = 'docs/prototipo/futceo-prototipo.html'; s = open(p).read()
js = open('docs/prototipo/jogo2d.js').read()
a = s.index('/*JOGO2D_INICIO*/') + len('/*JOGO2D_INICIO*/'); b = s.index('/*JOGO2D_FIM*/')
open(p, 'w').write(s[:a] + js + s[b:])
PY
