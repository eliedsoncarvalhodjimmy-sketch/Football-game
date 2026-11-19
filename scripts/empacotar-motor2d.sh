#!/bin/sh
# Empacota o motor 2D táctico (src/engine/match2d) num script e embute-o no ecrã de teste docs/prototipo/motor2d.html
# (entre os marcadores do <script id="futceo-motor2d">).
npx esbuild src/engine/match2d/pagina.ts --bundle --format=iife --minify --target=es2020 --outfile=docs/prototipo/motor2d.js
python3 - <<'PY'
p = 'docs/prototipo/motor2d.html'; s = open(p).read()
js = open('docs/prototipo/motor2d.js').read()
a = s.index('/*MOTOR2D_INICIO*/') + len('/*MOTOR2D_INICIO*/'); b = s.index('/*MOTOR2D_FIM*/')
open(p, 'w').write(s[:a] + js + s[b:])
PY
