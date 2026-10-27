# Kit de impresion Intersemestres 2026-II

Genera `kit-impresion-intersemestres-2026-II.pdf`: hojas de sorteo, tablas por grupo,
fase final (orden de juego, sin horas) y fichas de jugadores para Futsal y Voley.

`plan.json` sale del generador del sistema (`src/lib/domain/group-draw.ts` +
`schedule-generator.ts`) con la configuracion de cada disciplina.

```bash
python3 INTERSEMESTRES_2026-II/kit/kit_pdf.py . INTERSEMESTRES_2026-II/kit/plan.json INTERSEMESTRES_2026-II/kit-impresion-intersemestres-2026-II.pdf
```

Requiere `reportlab`. Se ejecuta desde la raiz del repo (usa `assets/fonts` y el logo de `public/epime-09`).
