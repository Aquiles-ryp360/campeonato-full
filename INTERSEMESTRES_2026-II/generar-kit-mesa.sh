#!/usr/bin/env bash
# Arma el kit en papel de la mesa: protocolo + fixture + anexos, grupos/llaves (fondo blanco),
# planillas por partido y bases. Resultado: kit-mesa-intersemestres-2026-II.pdf
# Uso (desde la raiz del repo): bash INTERSEMESTRES_2026-II/generar-kit-mesa.sh
set -euo pipefail
cd "$(dirname "$0")"

node --env-file=../.env.local ../scripts/mesa-fixture-tex.mjs

pdf() { # $1 motor, $2 archivo .tex, $3 nombre de salida (opcional), $4 prefijo tex (opcional)
  local job="${3:-${2%.tex}}"
  for _ in 1 2; do "$1" -interaction=nonstopmode -halt-on-error -jobname="$job" "${4:-}\\input{$2}" >/dev/null; done
  rm -f "$job".{aux,log,out,toc}
}

pdf pdflatex protocolo-mesa-intersemestres-2026-II.tex
pdf pdflatex mesa-planillas.tex
pdf xelatex bases-comision-2026-II.tex
pdf xelatex grupos-llaves-futsal-sorteo-2026-II.tex papel-futsal '\def\papel{1}'
pdf xelatex grupos-llaves-voley-sorteo-2026-II.tex papel-voley '\def\papel{1}'

pdfunite protocolo-mesa-intersemestres-2026-II.pdf papel-futsal.pdf papel-voley.pdf \
  mesa-planillas.pdf bases-comision-2026-II.pdf kit-mesa-intersemestres-2026-II.pdf
rm -f papel-futsal.pdf papel-voley.pdf
echo "Listo: INTERSEMESTRES_2026-II/kit-mesa-intersemestres-2026-II.pdf"
