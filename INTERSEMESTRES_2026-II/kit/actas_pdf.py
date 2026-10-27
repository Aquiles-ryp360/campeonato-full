import sys, json, os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Actas de partido (2 por hoja A4): equipo vs equipo, resultado y firmas de
# capitanes y arbitro. Sin hora: solo el orden de juego.
REPO, PLAN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
pdfmetrics.registerFont(TTFont("LatoB", f"{REPO}/assets/fonts/Lato-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LatoK", f"{REPO}/assets/fonts/Lato-Black.ttf"))
LOGO = f"{REPO}/public/epime-09/logo-carrera.png"
AZUL, AMAR, GRIS, GRIS2, TXT = HexColor("#28398f"), HexColor("#f4e84a"), HexColor("#eef0f7"), HexColor("#9aa1c2"), HexColor("#1b1f33")
W, H = A4
M = 30
plan = json.load(open(PLAN))
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Actas de partido - Intersemestres 2026-II")

STAGE = {"group_stage": "Fase de grupos", "preliminary": "Ronda preliminar", "quarter_finals": "Cuartos de final",
         "semi_finals": "Semifinal", "third_place": "Tercer lugar", "final": "FINAL"}


def box(x, y, s=20):
    c.setStrokeColor(TXT); c.setLineWidth(0.9); c.rect(x, y, s, s)


def line(x1, y, x2, w=0.7):
    c.setStrokeColor(TXT); c.setLineWidth(w); c.line(x1, y, x2, y)


def acta(top, key, m):
    """Dibuja un acta en la mitad de hoja que empieza en y=top."""
    h = H / 2 - 18
    bottom = top - h
    c.setStrokeColor(GRIS2); c.setLineWidth(0.8); c.roundRect(M, bottom, W - 2 * M, h, 6)
    # cabecera
    c.setFillColor(AZUL); c.roundRect(M, top - 42, W - 2 * M, 42, 6, fill=1, stroke=0)
    c.rect(M, top - 42, W - 2 * M, 10, fill=1, stroke=0)
    if os.path.exists(LOGO):
        c.drawImage(LOGO, M + 8, top - 39, 34, 34, mask="auto", preserveAspectRatio=True)
    disciplina = "FUTSAL" if key == "futsal" else "VÓLEY MIXTO"
    c.setFillColor(white); c.setFont("LatoK", 13); c.drawString(M + 50, top - 20, f"ACTA DE PARTIDO · {disciplina}")
    c.setFillColor(AMAR); c.setFont("LatoB", 8.5)
    c.drawString(M + 50, top - 33, "Gran Campeonato Intersemestres 2026-II · Complejo Deportivo Pereyra")
    c.setFillColor(AMAR); c.roundRect(W - M - 92, top - 34, 84, 26, 4, fill=1, stroke=0)
    c.setFillColor(AZUL); c.setFont("LatoK", 15); c.drawCentredString(W - M - 50, top - 27, f"N.° {m['order']}")

    # datos del partido
    y = top - 60
    fase = STAGE[m["stage"]] + (f" · Grupo {m['group']} · Fecha {m['fecha']}" if m["group"] else "")
    c.setFillColor(TXT); c.setFont("LatoB", 9.5)
    c.drawString(M + 12, y, f"{fase}   ·   Código {m['label']}   ·   {m['court']}")
    c.setFont("Helvetica", 8.5); c.drawRightString(W - M - 12, y, "Fecha: 29 / 10 / 2026")

    # equipos
    y -= 34
    colw = (W - 2 * M - 120) / 2
    xl, xr = M + 12, W - M - 12 - colw
    for x, code, lab in ((xl, m["home"], "EQUIPO LOCAL"), (xr, m["away"], "EQUIPO VISITANTE")):
        c.setFillColor(GRIS2); c.setFont("LatoB", 7.5); c.drawString(x, y + 22, lab)
        c.setFillColor(AZUL); c.setFont("LatoB", 8); c.drawString(x, y + 11, code)
        line(x, y - 2, x + colw, 0.9)
    c.setFillColor(AZUL); c.setFont("LatoK", 16); c.drawCentredString(W / 2, y + 2, "VS")

    # resultado
    y -= 44
    c.setFillColor(TXT); c.setFont("LatoB", 9)
    rows = ([("Goles", 22), ("Penales (si hay empate)", 18)] if key == "futsal"
            else [(f"Set {k + 1}" + (" (a 10)" if k == 2 else " (a 20)"), 22)
                  for k in range(3 if m["stage"] == "final" else 1)])
    for k, (lab, size) in enumerate(rows):
        yy = y - k * 30
        c.setFont("LatoB", 9); c.setFillColor(TXT); c.drawCentredString(W / 2, yy + 7, lab)
        box(xl + colw / 2 - size / 2, yy, size); box(xr + colw / 2 - size / 2, yy, size)
    y -= (len(rows) - 1) * 30

    y -= 30
    c.setFont("LatoB", 9); c.setFillColor(TXT); c.drawString(M + 12, y, "Ganador:")
    line(M + 62, y - 2, W / 2 + 40)
    c.drawString(W / 2 + 56, y, "W.O.:")
    box(W / 2 + 86, y - 5, 12); c.setFont("Helvetica", 8); c.drawString(W / 2 + 102, y - 2, "Sí")
    box(W / 2 + 122, y - 5, 12); c.drawString(W / 2 + 138, y - 2, "No")

    y -= 22
    c.setFont("LatoB", 9); c.drawString(M + 12, y, "Tarjetas / observaciones:")
    line(M + 130, y - 2, W - M - 12)
    for k in range(1, 4):
        line(M + 12, y - 2 - k * 18, W - M - 12, 0.5)

    # firmas
    fy = bottom + 30
    sw = (W - 2 * M - 48) / 3
    for i, lab in enumerate(["Capitán equipo local", "Capitán equipo visitante", "Árbitro"]):
        x = M + 12 + i * (sw + 12)
        line(x, fy, x + sw, 0.8)
        c.setFont("LatoB", 8.5); c.setFillColor(TXT); c.drawCentredString(x + sw / 2, fy - 11, lab)
        c.setFont("Helvetica", 7); c.setFillColor(GRIS2); c.drawCentredString(x + sw / 2, fy - 20, "Nombre y DNI: ________________")


def cut_line():
    c.setStrokeColor(GRIS2); c.setDash(4, 3); c.setLineWidth(0.6); c.line(14, H / 2, W - 14, H / 2); c.setDash()
    c.setFont("Helvetica", 6.5); c.setFillColor(GRIS2); c.drawString(16, H / 2 + 3, "✂ cortar")


for key in ("futsal", "voley"):
    matches = plan[key]["matches"]
    for i in range(0, len(matches), 2):
        acta(H - 14, key, matches[i])
        if i + 1 < len(matches):
            cut_line()
            acta(H / 2 - 4, key, matches[i + 1])
        c.showPage()
c.save()
print(OUT)
